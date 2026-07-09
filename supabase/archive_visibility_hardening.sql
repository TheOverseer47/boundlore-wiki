-- BoundLore archive visibility hardening
-- Public readers should not receive archived posts.
-- Admins keep full visibility through the admin SELECT policy.
-- Archived/admin-locked posts should not be editable by regular authors.

begin;

drop policy if exists "Anyone can view published posts" on public.posts;
create policy "Anyone can view published posts"
on public.posts
for select
using (
  status = 'published'
  and deleted_at is null
);

drop policy if exists "Authors can view their own pending posts" on public.posts;
create policy "Authors can view their own pending posts"
on public.posts
for select
using (
  auth.uid() = author_id
);

drop policy if exists "Users can update own posts" on public.posts;
create policy "Users can update own posts"
on public.posts
for update
using (
  auth.uid() = author_id
  and deleted_at is null
  and coalesce(admin_locked, false) = false
)
with check (
  auth.uid() = author_id
  and deleted_at is null
  and coalesce(admin_locked, false) = false
);

drop policy if exists posts_select_approved on public.posts;
create policy posts_select_approved
on public.posts
for select
using (
  (
    status = 'published'
    and deleted_at is null
  )
  or author_id = auth.uid()
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

drop policy if exists posts_update_own_or_admin on public.posts;
create policy posts_update_own_or_admin
on public.posts
for update
using (
  (
    author_id = auth.uid()
    and deleted_at is null
    and coalesce(admin_locked, false) = false
  )
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
)
with check (
  (
    author_id = auth.uid()
    and deleted_at is null
    and coalesce(admin_locked, false) = false
  )
  or exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
  )
);

commit;
