-- CRAFT relation types preparation (P0-B)
-- MANUAL RUN ONLY — do not execute during development dry-runs.
-- Run in Supabase SQL Editor at launch window if wiki_relation_types
-- was created before CRAFT codes were added to sprint1_knowledge_graph_foundation.sql.
--
-- Also redeploy bl_normalize_discovery_relation_code from sprint1_sync_rpc.sql
-- if the RPC function on the remote DB predates CRAFT mappings.

insert into public.wiki_relation_types (relation_code, label, description)
values
  ('CRAFTED_FROM', 'Crafted From', 'Crafted item requires ingredient/resource.'),
  ('CRAFTED_AT', 'Crafted At', 'Crafted item is made at a station.'),
  ('INGREDIENT_OF', 'Ingredient Of', 'Resource/ingredient is used in another crafted item.')
on conflict (relation_code) do nothing;

-- UNLOCKS already seeded in sprint1_knowledge_graph_foundation.sql
