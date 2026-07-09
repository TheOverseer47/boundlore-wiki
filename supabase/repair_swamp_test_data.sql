-- Swamp biome test data repair (idempotent)
-- Run in Supabase SQL editor after wiki_patch_mode.sql if needed.
-- Does NOT delete posts. Only normalizes known test slugs.
-- For BLMETA / entity_profile repair, also run Admin → "Repair Swamp test data".

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
