-- post_reactions_policies.sql
-- Fixes 403 errors for reaction read/write in Supabase by defining explicit RLS policies.
-- Run this in your Supabase SQL editor as an owner role.

begin;

alter table if exists public.post_reactions enable row level security;

-- RLS policies are not enough on their own: table privileges must also be granted.
grant select on table public.post_reactions to anon;
grant select, insert, update, delete on table public.post_reactions to authenticated;

-- Allow everyone (anon + authenticated) to read reactions for public counters.
drop policy if exists "post_reactions_select_all" on public.post_reactions;
create policy "post_reactions_select_all"
on public.post_reactions
for select
to anon, authenticated
using (true);

-- Authenticated users can insert their own reactions only.
drop policy if exists "post_reactions_insert_own" on public.post_reactions;
create policy "post_reactions_insert_own"
on public.post_reactions
for insert
to authenticated
with check (auth.uid() = user_id);

-- Authenticated users can update only their own reactions.
drop policy if exists "post_reactions_update_own" on public.post_reactions;
create policy "post_reactions_update_own"
on public.post_reactions
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

-- Authenticated users can delete only their own reactions.
drop policy if exists "post_reactions_delete_own" on public.post_reactions;
create policy "post_reactions_delete_own"
on public.post_reactions
for delete
to authenticated
using (auth.uid() = user_id);

-- Optional safety net: one reaction per user per post.
create unique index if not exists post_reactions_post_user_unique
on public.post_reactions (post_id, user_id);

commit;
