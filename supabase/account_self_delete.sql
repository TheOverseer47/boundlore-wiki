-- BoundLore self-service account deletion RPC
-- Run this in Supabase SQL editor to allow users to delete their own account after email confirmation.

begin;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Remove user-owned rows from optional feature tables first to avoid FK conflicts.
  if to_regclass('public.notifications') is not null then
    execute 'delete from public.notifications where user_id = $1' using v_uid;
  end if;

  if to_regclass('public.admin_actions') is not null then
    execute 'delete from public.admin_actions where admin_id = $1' using v_uid;
  end if;

  if to_regclass('public.comments') is not null then
    execute 'delete from public.comments where user_id = $1' using v_uid;
  end if;

  if to_regclass('public.post_reactions') is not null then
    execute 'delete from public.post_reactions where user_id = $1' using v_uid;
  end if;

  if to_regclass('public.reports') is not null then
    execute 'delete from public.reports where reporter_id = $1' using v_uid;
  end if;

  if to_regclass('public.posts') is not null then
    execute 'delete from public.posts where author_id = $1' using v_uid;
  end if;

  -- Delete the auth user record last; linked profile rows should cascade if FK is configured.
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

commit;
