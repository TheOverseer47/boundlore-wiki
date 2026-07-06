-- BoundLore admin + notifications extension
-- Run this in Supabase SQL editor before using the enhanced admin dashboard features.

begin;

-- =====================================
-- Profile moderation fields
-- =====================================
alter table public.profiles
  add column if not exists timeout_until timestamptz,
  add column if not exists last_known_ip inet,
  add column if not exists deleted_at timestamptz;

-- =====================================
-- Post moderation fields (soft delete/lock)
-- =====================================
alter table public.posts
  add column if not exists admin_locked boolean not null default false,
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid;

-- FK can be added after column exists.
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'posts'
      and constraint_name = 'posts_deleted_by_fkey'
  ) then
    alter table public.posts
      add constraint posts_deleted_by_fkey
      foreign key (deleted_by) references public.profiles(id) on delete set null;
  end if;
end $$;

-- =====================================
-- Notifications table
-- =====================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null default 'system',
  title text not null,
  message text,
  target_url text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read);

alter table public.notifications enable row level security;

-- Users can read/update their own notifications.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_select_own'
  ) then
    create policy notifications_select_own
      on public.notifications
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_update_own'
  ) then
    create policy notifications_update_own
      on public.notifications
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  -- Client-side workflows need insert access for authenticated users/admins.
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'notifications' and policyname = 'notifications_insert_authenticated'
  ) then
    create policy notifications_insert_authenticated
      on public.notifications
      for insert
      with check (auth.role() = 'authenticated');
  end if;
end $$;

grant select, insert, update on public.notifications to authenticated;

-- =====================================
-- Admin action audit log
-- =====================================
create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action_type text not null,
  target_type text,
  target_id text,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_actions_created
  on public.admin_actions (created_at desc);

create index if not exists idx_admin_actions_admin
  on public.admin_actions (admin_id, created_at desc);

alter table public.admin_actions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_actions' and policyname = 'admin_actions_select_admins'
  ) then
    create policy admin_actions_select_admins
      on public.admin_actions
      for select
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'admin_actions' and policyname = 'admin_actions_insert_admins'
  ) then
    create policy admin_actions_insert_admins
      on public.admin_actions
      for insert
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

grant select, insert on public.admin_actions to authenticated;

commit;
