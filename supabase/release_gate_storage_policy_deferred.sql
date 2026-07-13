-- =============================================================================
-- P5-E.5C — DEFERRED Storage Release Gate Policy (S+-01 storage path)
-- =============================================================================
-- STATUS: DEFERRED — DO NOT APPLY in default P5-E.5 path.
--
-- This file is NOT part of the standard P5-E.5 Re-run apply sequence:
--   1. admin_dashboard_notifications.sql (already on staging)
--   2. release_gate_lock.sql
--   3. phase_a_observations_foundation.sql
--
-- Requires:
--   - storage.objects owner-capable execution path (not pooler postgres)
--   - Separate explicit user approval (staging-only)
--   - bl_can_create_user_content() already provisioned via release_gate_lock.sql
--
-- DO NOT APPLY TO PRODUCTION.
-- No data. No secrets. No URLs. No service_role.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- Storage discovery-uploads restrictive INSERT (bucket-aware)
-- ---------------------------------------------------------------------------

drop policy if exists storage_discovery_uploads_release_gate_insert_restrictive on storage.objects;

create policy storage_discovery_uploads_release_gate_insert_restrictive
  on storage.objects
  as restrictive
  for insert
  to authenticated
  with check (
    bucket_id <> 'discovery-uploads'
    or public.bl_can_create_user_content(auth.uid())
  );

comment on policy storage_discovery_uploads_release_gate_insert_restrictive on storage.objects is
  'P5-E.2 blocks discovery-uploads INSERT when contribution locked. Other buckets unaffected.';

commit;
