# Current Code Gap Notes

Audit of BoundLore codebase against the content architecture blueprint.  
**Last updated:** 2026-07-09 (P0-B: CRAFT relation family preparation)

---

## 1. CRAFT Relations — Runtime Status (P0-B)

### Relation types prepared

| Type | Label | Role |
|------|-------|------|
| `crafted_from` | Crafted from | Target item → ingredient/resource |
| `crafted_at` | Crafted at | Target item → crafting station |
| `ingredient_of` | Used in | Inverse of `crafted_from` (derived; not double-persisted in merge) |
| `unlocks` | Unlocks | Prepared; not actively used yet |

### Files that know CRAFT

| File | Role |
|------|------|
| `js/relations-registry.js` | Canonical CRAFT family definitions, labels, merge metadata |
| `js/knowledge-relations.js` (v18) | `RELATION_TYPES`, normalization, merge/preview/dedup, recipe serializer |
| `supabase/sprint1_sync_rpc.sql` | `bl_normalize_discovery_relation_code` → CRAFTED_* codes |
| `supabase/sprint1_knowledge_graph_foundation.sql` | `wiki_relation_types` seed rows |
| `supabase/craft_relation_types_preparation.sql` | Standalone INSERT for existing DBs (manual run) |
| `qa/mock-craft-relation-payload.md` | Mock payload + expected merge behavior |
| `wiki/admin/index.html` | Preview shows CRAFT relation conflicts |

### Normalization / labels

- Registry-known CRAFT types are **not** degraded to `related_discovery`
- `getRelationLabel()` prefers registry labels; `RELATION_TYPES` provides fallback
- `normalizeRelationTypeForDbSync()` passes through `crafted_from`, `crafted_at`, `ingredient_of`, `unlocks`

### Merge / preview / dedup (P0-B)

| Behavior | Implementation |
|----------|----------------|
| Dedupe key | `relationMergeDedupeKey()` = `relation_type` + target entity key |
| Same ingredient + same qty | CONFIRM, `report_count++` |
| Same ingredient + different qty | `relationsConflict` / `contribution_conflicts`, `needs_review` |
| Same station twice | CONFIRM, no duplicate |
| Different station on confirmed target | `recipe_station` conflict |
| Different ingredient sets | `recipe_ingredients` conflict |
| Recipe fact block | `discovery_payload.recipe` preserved (nested object) |
| Relations from recipe | `buildCraftRelationsFromRecipe()`, `resolveContributionRelations()` |
| Future duplicate detection | `compareRecipeContributionDuplicates()` for `add_recipe` |

### Exported helpers (`BoundLoreKnowledgeRelations`)

- `isCraftRelationType`, `craftRelationIdentityKey`, `relationMergeDedupeKey`
- `craftRelationsConflict`, `buildCraftRelationsFromRecipe`, `sanitizeRecipeFactForMeta`
- `compareRecipeContributionDuplicates`, `formatCraftRelationPreviewLabel`

### Properties preserved on relations

`quantity`, `unit`, `station`, `output_quantity`, `unlock_condition`, `evidence_tier`, `confidence`, `source_post_id`, `report_count`, `notes`

---

## 2. Relations Registry — Runtime Status

### Loaded on these pages (before `knowledge-relations.js`)

| Page | Script order |
|------|--------------|
| `wiki/admin/index.html` | relations-registry → knowledge-relations → entity-core |
| `wiki/create-post/index.html` | relations-registry → knowledge-relations → entity-core |
| `wiki/post/index.html` | relations-registry → knowledge-relations → entity-core |
| `wiki/items/index.html` | relations-registry → entity-core → knowledge-relations |
| `wiki/creatures/index.html` | relations-registry → entity-core → knowledge-relations |
| `wiki/biomes/index.html` | relations-registry → entity-core → knowledge-relations |
| `wiki/locations/index.html` | relations-registry → entity-core → knowledge-relations |

**Not yet loaded:** `wiki/edit-post/index.html` (unchanged in P0-B).

---

## 3. Legacy Relation Types — Still Compatible

| Type | Status |
|------|--------|
| `contains` | Active — biome aggregation |
| `observed_in` | Active |
| `dropped_by` | Active — not aliased to `drops` |
| `found_in` / `located_in` / `found_near` | Active |
| `drops` / `part_of` / `related_discovery` / `evidence_for` | Active |

---

## 4. SQL / RPC Mappings (prepared, not executed)

| Mapping | Location |
|---------|----------|
| `crafted_from` → `CRAFTED_FROM` | `sprint1_sync_rpc.sql` |
| `crafted_at` → `CRAFTED_AT` | `sprint1_sync_rpc.sql` |
| `ingredient_of` → `INGREDIENT_OF` | `sprint1_sync_rpc.sql` |
| `unlocks` → `UNLOCKS` | Already present |
| DB seed rows | `sprint1_knowledge_graph_foundation.sql` + `craft_relation_types_preparation.sql` |

**Manual SQL later:** If remote DB was created before P0-B, run `supabase/craft_relation_types_preparation.sql` and redeploy `bl_normalize_discovery_relation_code` from `sprint1_sync_rpc.sql` at launch window.

---

## 5. entity_domain / entity_subtype Baseline (P0-A, unchanged)

Helpers in `js/entity-core.js`; serialized via `serializePostMetaForStorage()`. Existing posts not backfilled.

---

## 6. Still Not Implemented (by design)

| Area | Priority |
|------|----------|
| Add Recipe UI / `intent=add_recipe` form | P0-D |
| Resource Quick-Add + synonym warning | P0-C |
| `/wiki/resources/` landing | P0-E |
| Recipe / Usage widgets | P0-F |
| Evidence-tier UI badges | P0-G |
| E2E T1/T2 recipe flows | After UI |
| `ingredient_of` auto-persist on resource pages | P0-F (derived inverse) |
| Boss wizard / NPC / Settlement flows | P1 |
| Data backfill / repair scripts | Never without explicit approval |

---

## 7. Duplication / Misclassification Risks

| Risk | Mitigation status |
|------|-------------------|
| Resource name duplicates | P0-C synonym warning |
| Recipe duplicate pages | Blueprint: facts on item — merge path ready |
| Recipe quantity conflicts | P0-B conflict logging |
| Procedural POI flood | `classifyPlaceEntry` — works |

---

## 8. Next Step

**P0-C:** Resource Quick-Add + Synonym-Warnung
