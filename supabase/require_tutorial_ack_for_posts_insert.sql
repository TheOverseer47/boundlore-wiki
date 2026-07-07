-- require_tutorial_ack_for_posts_insert.sql
--
-- Enforce one-time tutorial acknowledgement at database level.
-- This prevents bypassing the client-side gate via direct API calls.
--
-- Run in Supabase SQL editor before launch.

begin;

drop policy if exists posts_insert_requires_tutorial_ack on public.posts;

create policy posts_insert_requires_tutorial_ack
  on public.posts
  as restrictive
  for insert
  to authenticated
  with check (
    coalesce(
      (auth.jwt() -> 'user_metadata' ->> 'submission_tutorial_v1_accepted')::boolean,
      false
    ) = true
  );

commit;
