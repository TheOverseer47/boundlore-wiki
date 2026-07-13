-- =============================================================================
-- P5-E.7A.2 — Policy Dependency SELECT Grants
-- =============================================================================
-- Staging-tested minimal grants for direct posts INSERT policy evaluation.
--
-- These grants do NOT bypass RLS.
-- They allow authenticated users to evaluate RLS policies that depend on:
--   - public.profiles
--   - public.user_submission_acks
--
-- Apply only with explicit approval on isolated staging.
-- No anon grants. No storage grants. No DML. No unlock.
-- DO NOT APPLY TO PRODUCTION.
-- =============================================================================

grant select on table public.profiles to authenticated;
grant select on table public.user_submission_acks to authenticated;
