-- discovery_storage.sql
-- Creates storage bucket + RLS policies for discovery file uploads.
-- Run in Supabase SQL Editor as an owner role.
-- Requires public.bl_can_create_user_content(uuid) from release_gate_lock.sql.

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'discovery-uploads',
  'discovery-uploads',
  true,
  20971520,
  array['image/jpeg','image/png','image/webp','application/pdf','application/zip','text/plain']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users can upload into their own user folder prefix: <uid>/...
drop policy if exists "discovery_upload_authenticated" on storage.objects;
create policy "discovery_upload_authenticated"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'discovery-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
  and public.bl_can_create_user_content(auth.uid())
);

-- Public read for all discovery files.
drop policy if exists "discovery_read_public" on storage.objects;
create policy "discovery_read_public"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'discovery-uploads');

-- Users can update/delete only their own uploads.
drop policy if exists "discovery_update_own" on storage.objects;
create policy "discovery_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'discovery-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'discovery-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "discovery_delete_own" on storage.objects;
create policy "discovery_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'discovery-uploads'
  and split_part(name, '/', 1) = auth.uid()::text
);

commit;
