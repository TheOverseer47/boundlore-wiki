-- Contribution duplicate repair (idempotent)
-- Run in Supabase SQL editor or via Admin → "Repair contribution duplicates".
-- Archives published contribution posts that leaked as standalone entities.
-- Does NOT hard-delete. Evidence must be merged via Admin repair JS first.

begin;

-- Mark published contribution slugs as archived (JS repair merges evidence first).
-- This SQL is a safety net when only archiving is needed after manual merge.
update public.posts
set
  deleted_at = coalesce(deleted_at, now()),
  status = 'pending'
where deleted_at is null
  and status = 'published'
  and (
    slug ilike 'contribution-%'
    or title ilike 'Contribution:%'
  )
  and content ilike '%discovery_record_status%contribution%';

commit;
