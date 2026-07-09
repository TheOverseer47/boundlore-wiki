-- HARVESTED_FROM relation type preparation (P0-C)
-- MANUAL RUN ONLY at launch window if wiki_relation_types predates this row.

insert into public.wiki_relation_types (relation_code, label, description)
values
  ('HARVESTED_FROM', 'Harvested From', 'Resource obtained from a place, biome, or source entity.')
on conflict (relation_code) do nothing;

-- Redeploy bl_normalize_discovery_relation_code from sprint1_sync_rpc.sql when applying.
