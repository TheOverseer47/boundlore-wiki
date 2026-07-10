# Current Code Gap Notes

Audit of BoundLore codebase against the content architecture blueprint.  
**Last updated:** 2026-07-10 (P0-D1: Add Recipe Intent UI + Payload)

---

## 1. Resource Quick-Add — Runtime Status (P0-C)

### Entry points

| Route / path | Behavior |
|--------------|----------|
| `/wiki/create-post/?type=resource` | Discovery mode, category locked to `items`, Resource Quick-Add panel |
| Items lean form → Item type `resource` | Switches to same Resource Quick-Add panel |

### Form fields (required: Resource Name + Source Type)

Resource Name, Source Type (mining/plant/creature-drop/biome/water/loot/unknown), Biome/Region (optional), Source Detail, Source Entity (optional), Gathering Tool, Rarity (default unknown), Notes, Confidence.

### BLMETA on submit

| Field | Value |
|-------|-------|
| `entity_domain` | `OBJECT` |
| `entity_subtype` | `resource` |
| `discovery_form` | `resource_quick` |
| `discovery_payload.discovery_type` | `resource` |
| `discovery_payload.resource` | Structured block (`source_type`, `biome`, `source_detail`, …) |

### Files

| File | Role |
|------|------|
| `js/resource-quick-add.js` | Form panel, payload builder, synonym warning |
| `js/categories-config.js` | `BOUNDLORE_DISCOVERY_SCHEMA_RESOURCE_QUICK`, route helpers |
| `js/create-post.js` | Route init, submit path, relation skip, meta defaults |
| `js/knowledge-relations.js` | `harvested_from`, resource `appendAutoRelations`, resource serializer |
| `js/wiki-entry-layout.js` | Resource-specific missing-info (no weapon CTAs) |
| `wiki/admin/index.html` | Resource badge + compact preview summary |
| `supabase/sprint1_sync_rpc.sql` | `harvested_from` → `HARVESTED_FROM` |
| `supabase/harvested_from_relation_preparation.sql` | Manual INSERT for existing DBs |

### Auto-relations (resource)

| Condition | Relation |
|-----------|----------|
| Biome/region given | `found_in` → biome; `harvested_from` → biome (mining/plant/biome/water) |
| Explicit source entity + creature-drop/plant/mining | `harvested_from` → entity |
| Generic source detail only | Stored as fact — **no location stub** |

`ingredient_of` not auto-created (P0-F Usage widget).

---

## 2. Synonym / Duplicate Warning (P0-C)

| Behavior | Status |
|----------|--------|
| Trigger | On Resource Name blur/input debounce + pre-submit |
| Compare | Normalized names, tokens, light Levenshtein, aliases from BLMETA |
| Pool | Published/pending/approved `items` posts |
| UX | Warn-only banner: Open existing / Continue anyway / Cancel and edit |
| Blocks submit | Only until user acknowledges or no match |

Module: `ResourceQuickAdd.findSimilarResources()`, `namesAreSimilar()`.

Legacy `detectDiscoveryDuplicateCP` **skipped** for resource quick-add (warn-only path).

---

## 3. Add Recipe Intent (P0-D1)

| Behavior | Status |
|----------|--------|
| CTA on item pages (non-resource) | `Add Recipe` in hero actions |
| Form | Ingredients (dynamic rows), station, output qty, unlock, notes, confidence, optional evidence |
| Submit | Pending contribution only — no merge, no stubs |
| Payload | `discovery_payload.intent: add_recipe`, `discovery_payload.recipe`, CRAFT relations |
| Relations persisted | `crafted_from` (per ingredient), `crafted_at` (station) |
| `ingredient_of` | **Not** persisted (derived/inverse for later widgets) |
| Duplicate guard | Same user + target + matching recipe fingerprint blocks re-submit |
| Admin preview | Compact Add Recipe summary + CRAFT relation lines |

### Files

| File | Role |
|------|------|
| `js/contribution-flow.js` | `add_recipe` mask, recipe form, payload + relations builder |
| `js/wiki-entry-layout.js` | Item-page `Add Recipe` CTA |
| `js/create-post.js` | Recipe form init, duplicate params on submit |
| `js/knowledge-relations.js` | `buildCraftRelationsFromRecipe`, `compareRecipeContributionDuplicates` (existing) |
| `wiki/admin/index.html` | `renderRecipeContributionSummaryA` |

### Still deferred (P0-D2+)

- Approve & merge recipe into target item
- Recipe live widget on item pages
- Usage widget on resource pages
- Recipe conflict / duplicate E2E beyond pending fingerprint
- `/wiki/resources/` landing

---

## 4. CRAFT Relations (P0-B, unchanged)

`crafted_from`, `crafted_at`, `ingredient_of`, `unlocks` — prepared in merge/serializer/SQL. Add Recipe UI writes payload/relations at submit (P0-D1); merge on approve is P0-D2.

---

## 5. SQL / RPC (prepared, not executed)

| Code | Mapping |
|------|---------|
| `HARVESTED_FROM` | `harvested_from` in sync RPC + foundation seed |
| CRAFT codes | From P0-B |

**Manual SQL later:** `supabase/harvested_from_relation_preparation.sql` + redeploy `bl_normalize_discovery_relation_code` if remote DB predates P0-C.

---

## 6. Still Not Implemented (by design)

| Area | Priority |
|------|----------|
| `/wiki/resources/` landing | P0-E |
| Usage / Recipe widgets (live) | P0-F |
| Recipe approve/merge | P0-D2 |
| Evidence-tier badge UI | P0-G |
| `ingredient_of` auto-persist on resource pages | P0-F |
| E2E T1 full chain (usage step) | After P0-D2/F |

---

## 7. Next Step

**P0-D2:** Admin Preview/Merge for Add Recipe
