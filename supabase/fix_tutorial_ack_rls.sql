-- fix_tutorial_ack_rls.sql
--
-- Replaces user_metadata-based tutorial gate with server-side acknowledgement rows.
-- Idempotent — safe to run multiple times in Supabase SQL Editor.
--
-- Replaces: supabase/require_tutorial_ack_for_posts_insert.sql (DEPRECATED)

begin;

-- ---------------------------------------------------------------------------
-- 1. Acknowledgement table (source of truth for tutorial gate)
-- ---------------------------------------------------------------------------

create table if not exists public.user_submission_acks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tutorial_version text not null default 'v1',
  accepted_at timestamptz not null default now()
);

alter table public.user_submission_acks enable row level security;

-- User: read own row only
drop policy if exists user_submission_acks_select_own on public.user_submission_acks;
create policy user_submission_acks_select_own
  on public.user_submission_acks
  for select
  to authenticated
  using (auth.uid() = user_id);

-- User: insert own row only (no update/delete for regular users)
drop policy if exists user_submission_acks_insert_own on public.user_submission_acks;
create policy user_submission_acks_insert_own
  on public.user_submission_acks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Admin: read all rows (moderation / support)
drop policy if exists user_submission_acks_select_admin on public.user_submission_acks;
create policy user_submission_acks_select_admin
  on public.user_submission_acks
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'admin'
    )
  );

-- Table grants: authenticated may read/insert own ack only (RLS enforces row scope).
-- No update/delete for regular users — re-ack uses insert with on conflict do nothing.
grant select, insert on public.user_submission_acks to authenticated;
revoke update, delete on public.user_submission_acks from authenticated;

-- ---------------------------------------------------------------------------
-- 2. Backfill from legacy user_metadata (one-time migration aid)
--    Uses auth.users — not referenced by any active RLS policy.
-- ---------------------------------------------------------------------------

insert into public.user_submission_acks (user_id, tutorial_version, accepted_at)
select
  u.id,
  'v1',
  coalesce(
    nullif(u.raw_user_meta_data ->> 'submission_tutorial_v1_accepted_at', '')::timestamptz,
    u.created_at,
    now()
  )
from auth.users u
where coalesce(
  (u.raw_user_meta_data ->> 'submission_tutorial_v1_accepted')::boolean,
  false
) = true
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Replace posts insert policy — no user_metadata / auth.jwt() references
-- ---------------------------------------------------------------------------

drop policy if exists posts_insert_requires_tutorial_ack on public.posts;

create policy posts_insert_requires_tutorial_ack
  on public.posts
  as restrictive
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.user_submission_acks a
      where a.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

commit;
