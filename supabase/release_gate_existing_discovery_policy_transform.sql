-- P5-E.9G.8E.2 - Existing discovery upload policy release-lock transform.
-- AUTHORING ONLY: do not apply without a separate production authorization.
-- Target: existing storage.objects INSERT policy discovery_upload_authenticated.
-- Preconditions: release_gate_lock.sql applied and current policy matches the
-- catalog-exported bucket/UID predicate documented by P5-E.9G.8E.1.

begin;

alter policy "discovery_upload_authenticated"
on storage.objects
to authenticated
with check (
  bucket_id = 'discovery-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
  and public.bl_can_create_user_content(auth.uid())
);

commit;
