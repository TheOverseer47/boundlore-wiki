-- =============================================================================
-- P5-E.5C / P5-E.9G.8C — Deferred Storage Release Gate Policy (discovery-uploads)
-- =============================================================================
-- Scope: single restrictive INSERT policy on storage.objects for discovery-uploads.
-- Preconditions: bl_can_create_user_content() from release_gate_lock.sql
-- Postconditions: discovery-uploads INSERT blocked when contribution locked
-- Idempotent: DROP POLICY IF EXISTS + CREATE POLICY (owned name only)
--
-- Preserves existing UID-prefix permissive policy discovery_upload_authenticated.
-- Does not modify buckets, objects, MIME limits, or report-screenshots.
-- =============================================================================

begin;

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
  'P5-E.2 / P5-E.9G.8C: blocks discovery-uploads INSERT when contribution locked. Other buckets unaffected.';

commit;
