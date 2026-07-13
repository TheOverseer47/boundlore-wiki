-- =============================================================================
-- P5-E.7A — Direct Posts Grant/RLS Re-Test
-- =============================================================================
-- Staging-tested grant for intended direct client posts insert path.
--
-- This file grants ONLY INSERT on public.posts to authenticated.
-- It does not unlock the release gate.
-- It does not bypass RLS.
-- It does not grant UPDATE/DELETE.
-- It does not touch storage.objects.
--
-- Apply only with explicit approval on isolated staging.
-- DO NOT APPLY TO PRODUCTION.
-- =============================================================================

grant insert on table public.posts to authenticated;
