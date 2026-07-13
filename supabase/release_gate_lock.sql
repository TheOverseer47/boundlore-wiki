-- =============================================================================
-- P5-E.2 — Release Gate DB/RLS/RPC Baseline (S+-01)
--   + P5-E.5A dependency order fix (functions before policies)
--   + P5-E.5C storage policy deferred (see release_gate_storage_policy_deferred.sql)
-- =============================================================================
-- DO NOT APPLY TO PRODUCTION WITHOUT EXPLICIT STAGING TEST (P5-E.5).
-- SQL baseline only — not executed in P5-E.2 gate.
--
-- Fail-closed pre-release content lock:
--   - Default LOCKED (contribution_locked = true)
--   - Missing release_gate row = LOCKED
--   - DB read error in helpers = LOCKED
--   - No service_role in client
--   - Tutorial-ack remains separate (fix_tutorial_ack_rls.sql)
--   - Patch Mode (wiki_patch_mode) remains maintenance-only
--
-- Storage discovery-uploads policy: DEFERRED — not in this file.
--   Apply via release_gate_storage_policy_deferred.sql only with separate
--   explicit approval and storage.objects owner-capable execution path.
--
-- Apply order (staging): after profiles + user_submission_acks exist.
-- Rollback: set contribution_locked = true; revert migration commit.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- A) Singleton release gate state
-- ---------------------------------------------------------------------------

create table if not exists public.release_gate (
  id smallint primary key default 1,
  contribution_locked boolean not null default true,
  reason text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  lock_version integer not null default 1,
  enforced_until timestamptz,
  constraint release_gate_singleton check (id = 1)
);

comment on table public.release_gate is
  'P5-E.2 singleton pre-release contribution lock. Missing row or contribution_locked=true blocks user content writes (fail-closed).';

insert into public.release_gate (id, contribution_locked, reason)
values (1, true, 'Pre-release default locked')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- B) Audit trail (unlock / relock / denied)
-- ---------------------------------------------------------------------------

create table if not exists public.release_gate_audit (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  old_locked boolean,
  new_locked boolean,
  reason text,
  created_at timestamptz not null default now(),
  request_context jsonb,
  constraint release_gate_audit_action_check check (
    action in ('unlock', 'relock', 'update_reason', 'read_failure', 'denied_attempt')
  )
);

comment on table public.release_gate_audit is
  'P5-E.2 audit log for release_gate changes. Written by bl_set_release_gate_locked (admin only).';

-- ---------------------------------------------------------------------------
-- C) Helper functions (must exist before policies that reference them)
-- ---------------------------------------------------------------------------

create or replace function public.bl_is_admin_actor(p_actor_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p_actor_id is null then false
    else exists (
      select 1
      from public.profiles p
      where p.id = p_actor_id
        and p.role = 'admin'
    )
  end;
$$;

comment on function public.bl_is_admin_actor(uuid) is
  'P5-E.2 fail-closed admin check. Null actor or DB miss = false. Uses profiles.role = admin.';

create or replace function public.bl_is_release_unlocked()
returns boolean
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_locked boolean;
begin
  begin
    select rg.contribution_locked
    into v_locked
    from public.release_gate rg
    where rg.id = 1;

    if not found then
      return false;
    end if;

    return not coalesce(v_locked, true);
  exception
    when others then
      return false;
  end;
end;
$$;

comment on function public.bl_is_release_unlocked() is
  'P5-E.2 true only when release_gate row exists and contribution_locked = false. Missing row or error = false.';

create or replace function public.bl_can_bypass_release_gate(p_actor_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.bl_is_admin_actor(p_actor_id);
$$;

comment on function public.bl_can_bypass_release_gate(uuid) is
  'P5-E.2 explicit admin bypass for contribution lock. No trusted/moderator implicit bypass.';

create or replace function public.bl_can_create_user_content(p_actor_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p_actor_id is null then false
    when public.bl_can_bypass_release_gate(p_actor_id) then true
    when public.bl_is_release_unlocked() then true
    else false
  end;
$$;

comment on function public.bl_can_create_user_content(uuid) is
  'P5-E.2 contribution write gate. Tutorial-ack is enforced separately. Admin bypass explicit.';

create or replace function public.bl_assert_can_create_user_content(p_context text default 'user_content')
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.bl_can_create_user_content(auth.uid()) then
    raise exception 'User content submissions are locked before release'
      using errcode = '42501';
  end if;
end;
$$;

comment on function public.bl_assert_can_create_user_content(text) is
  'P5-E.2 raises 42501 when contribution lock blocks the current actor.';

-- ---------------------------------------------------------------------------
-- D) Admin RPC — unlock / re-lock (no auto-publish, no pending mutation)
-- ---------------------------------------------------------------------------

create or replace function public.bl_set_release_gate_locked(
  p_locked boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_old_locked boolean;
  v_new_locked boolean := coalesce(p_locked, true);
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
  v_action text;
  v_version integer;
begin
  if v_actor is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if not public.bl_is_admin_actor(v_actor) then
    insert into public.release_gate_audit (
      actor_id, action, old_locked, new_locked, reason, request_context
    ) values (
      v_actor, 'denied_attempt', null, v_new_locked, v_reason,
      jsonb_build_object('context', 'bl_set_release_gate_locked', 'denied', true)
    );
    raise exception 'Admin role required to change release gate'
      using errcode = '42501';
  end if;

  if v_reason is null then
    raise exception 'Reason is required to change release gate state'
      using errcode = '22023';
  end if;

  select rg.contribution_locked, rg.lock_version
  into v_old_locked, v_version
  from public.release_gate rg
  where rg.id = 1;

  if not found then
    insert into public.release_gate (id, contribution_locked, reason, updated_by)
    values (1, v_new_locked, v_reason, v_actor);
    v_old_locked := true;
    v_version := 1;
  else
    update public.release_gate
    set
      contribution_locked = v_new_locked,
      reason = v_reason,
      updated_by = v_actor,
      updated_at = now(),
      lock_version = lock_version + 1
    where id = 1
    returning lock_version into v_version;
  end if;

  v_action := case when v_new_locked then 'relock' else 'unlock' end;

  insert into public.release_gate_audit (
    actor_id, action, old_locked, new_locked, reason, request_context
  ) values (
    v_actor,
    v_action,
    coalesce(v_old_locked, true),
    v_new_locked,
    v_reason,
    jsonb_build_object('context', 'bl_set_release_gate_locked', 'lock_version', v_version)
  );

  return jsonb_build_object(
    'contribution_locked', v_new_locked,
    'lock_version', v_version,
    'action', v_action
  );
end;
$$;

comment on function public.bl_set_release_gate_locked(boolean, text) is
  'P5-E.2 admin-only unlock/relock. Does not approve/publish/mutate pending posts.';

-- ---------------------------------------------------------------------------
-- E) RLS enablement
-- ---------------------------------------------------------------------------

alter table public.release_gate enable row level security;
alter table public.release_gate_audit enable row level security;

-- ---------------------------------------------------------------------------
-- F) release_gate / release_gate_audit policies
-- ---------------------------------------------------------------------------

drop policy if exists release_gate_select_all on public.release_gate;
create policy release_gate_select_all
  on public.release_gate
  for select
  to anon, authenticated
  using (true);

drop policy if exists release_gate_admin_update on public.release_gate;
create policy release_gate_admin_update
  on public.release_gate
  for update
  to authenticated
  using (public.bl_is_admin_actor(auth.uid()))
  with check (public.bl_is_admin_actor(auth.uid()));

drop policy if exists release_gate_audit_admin_select on public.release_gate_audit;
create policy release_gate_audit_admin_select
  on public.release_gate_audit
  for select
  to authenticated
  using (public.bl_is_admin_actor(auth.uid()));

grant select on public.release_gate to anon, authenticated;
grant select on public.release_gate_audit to authenticated;

-- ---------------------------------------------------------------------------
-- G) posts restrictive policies
-- ---------------------------------------------------------------------------

drop policy if exists posts_release_gate_insert_restrictive on public.posts;

create policy posts_release_gate_insert_restrictive
  on public.posts
  as restrictive
  for insert
  to authenticated
  with check (
    public.bl_can_create_user_content(auth.uid())
  );

comment on policy posts_release_gate_insert_restrictive on public.posts is
  'P5-E.2 additive restrictive gate. Works with posts_insert_requires_tutorial_ack.';

drop policy if exists posts_release_gate_update_restrictive on public.posts;

create policy posts_release_gate_update_restrictive
  on public.posts
  as restrictive
  for update
  to authenticated
  using (
    public.bl_can_create_user_content(auth.uid())
  )
  with check (
    public.bl_can_create_user_content(auth.uid())
  );

comment on policy posts_release_gate_update_restrictive on public.posts is
  'P5-E.2 blocks author edits when locked; admin bypass via bl_can_create_user_content.';

-- ---------------------------------------------------------------------------
-- H) post_reactions restrictive policies
-- ---------------------------------------------------------------------------

drop policy if exists post_reactions_release_gate_insert_restrictive on public.post_reactions;

create policy post_reactions_release_gate_insert_restrictive
  on public.post_reactions
  as restrictive
  for insert
  to authenticated
  with check (
    public.bl_can_create_user_content(auth.uid())
  );

drop policy if exists post_reactions_release_gate_update_restrictive on public.post_reactions;

create policy post_reactions_release_gate_update_restrictive
  on public.post_reactions
  as restrictive
  for update
  to authenticated
  using (
    public.bl_can_create_user_content(auth.uid())
  )
  with check (
    public.bl_can_create_user_content(auth.uid())
  );

-- ---------------------------------------------------------------------------
-- I) NOT TESTED / DEFERRED — Live-RLS export required before production closure
-- ---------------------------------------------------------------------------
-- storage discovery-uploads: deferred to release_gate_storage_policy_deferred.sql
--   (requires storage.objects owner-capable execution path — not default P5-E.5)
-- comments: no INSERT policy in repo — NOT TESTED; add restrictive policy after live export
-- reports: no INSERT policy in repo — NOT TESTED; add restrictive policy after live export
-- report-screenshots bucket: no storage policy in repo — NOT TESTED
-- ratings: table not found in repo SQL — NOT TESTED

-- ---------------------------------------------------------------------------
-- J) Grants
-- ---------------------------------------------------------------------------

grant execute on function public.bl_is_admin_actor(uuid) to authenticated;
grant execute on function public.bl_is_release_unlocked() to anon, authenticated;
grant execute on function public.bl_can_bypass_release_gate(uuid) to authenticated;
grant execute on function public.bl_can_create_user_content(uuid) to authenticated;
grant execute on function public.bl_assert_can_create_user_content(text) to authenticated;
grant execute on function public.bl_set_release_gate_locked(boolean, text) to authenticated;

commit;
