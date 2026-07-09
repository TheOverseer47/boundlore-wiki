-- =============================================================================
-- DEPRECATED — replaced by supabase/fix_tutorial_ack_rls.sql
-- =============================================================================
-- Do NOT run this file. It references auth.jwt() user_metadata, which Supabase
-- Security Advisor flags as unsafe (user-editable metadata must not gate RLS).
--
-- Use fix_tutorial_ack_rls.sql instead:
--   - public.user_submission_acks table
--   - posts_insert_requires_tutorial_ack checks ack row or profiles.role = admin
-- =============================================================================

-- require_tutorial_ack_for_posts_insert.sql (LEGACY — DO NOT APPLY)
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
