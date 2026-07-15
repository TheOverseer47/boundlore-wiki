-- =============================================================================
-- P5-E.9G.8C — Profile role self-promotion prevention
-- =============================================================================
-- Scope: BEFORE UPDATE trigger on public.profiles.role column only.
-- Preconditions: bl_is_admin_actor() from release_gate_lock.sql
-- Postconditions:
--   - Non-admin users cannot change profiles.role on self-update
--   - Admin users retain role change path via profiles_update_admin / is_admin()
-- Idempotent: CREATE OR REPLACE trigger function + DROP/CREATE trigger
-- No existing profile rows modified.
-- =============================================================================

begin;

create or replace function public.bl_profiles_prevent_role_self_promotion()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      if not public.bl_is_admin_actor(auth.uid()) then
        raise exception 'Profile role cannot be modified by non-admin users'
          using errcode = '42501';
      end if;
    end if;
  end if;

  return new;
end;
$$;

comment on function public.bl_profiles_prevent_role_self_promotion() is
  'P5-E.9G.8C: Blocks non-admin self-promotion via profiles.role UPDATE. Admins may change roles.';

drop trigger if exists trg_profiles_prevent_role_self_promotion on public.profiles;

create trigger trg_profiles_prevent_role_self_promotion
  before update on public.profiles
  for each row
  execute function public.bl_profiles_prevent_role_self_promotion();

commit;
