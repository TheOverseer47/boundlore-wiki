-- Wiki Patch / Maintenance Mode
-- Run in Supabase SQL editor before using admin patch controls.

begin;

create table if not exists public.wiki_patch_mode (
  id smallint primary key default 1 check (id = 1),
  enabled boolean not null default false,
  public_message text,
  reason text,
  expected_until timestamptz,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

insert into public.wiki_patch_mode (id, enabled)
values (1, false)
on conflict (id) do nothing;

alter table public.wiki_patch_mode enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_patch_mode' and policyname = 'wiki_patch_mode_select_all'
  ) then
    create policy wiki_patch_mode_select_all
      on public.wiki_patch_mode
      for select
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_patch_mode' and policyname = 'wiki_patch_mode_admin_update'
  ) then
    create policy wiki_patch_mode_admin_update
      on public.wiki_patch_mode
      for update
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

grant select on public.wiki_patch_mode to anon, authenticated;
grant update on public.wiki_patch_mode to authenticated;

commit;
