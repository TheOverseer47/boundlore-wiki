-- =============================================================================
-- Swamp biome test data repair — PRE-RELEASE / TEST-ONLY
-- =============================================================================
-- NOT exposed in Admin UI (removed before deploy).
-- For local Swamp/Swamplands QA normalization only.
-- Does NOT delete posts. Only normalizes known test slugs.
-- Idempotent. Run manually in Supabase SQL Editor if needed during dev.
-- See: supabase/PRE_RELEASE_RESET_README.md
-- =============================================================================

begin;

-- 1) Swamp biome stub (was filed under locations / Swamplands)
update public.posts
set
  category = 'biomes',
  title = 'Swamp'
where slug = 'swamplands-94dadc07'
  and deleted_at is null
  and (
    category is distinct from 'biomes'
    or title is distinct from 'Swamp'
  );

-- 2) Campfire encounter context (location hint, not a full landmark)
update public.posts
set
  title = 'near a Campfire'
where slug = 'swamplands-near-a-campfire-787bbd19'
  and deleted_at is null
  and title is distinct from 'near a Campfire';

-- 3) Ogre Mage creature stub (canonical name, not discovery context title)
update public.posts
set
  category = 'creatures',
  title = 'Ogre Mage'
where slug = 'ogre-mage-in-swamplands-near-a-campfire-9651e6'
  and deleted_at is null
  and title is distinct from 'Ogre Mage';

commit;
