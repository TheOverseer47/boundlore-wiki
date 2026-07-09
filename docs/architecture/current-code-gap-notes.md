# Current Code Gap Notes

Audit of BoundLore codebase against the content architecture blueprint.  
**Last updated:** 2026-07-09 (P0-A: registry integration + entity classification baseline)

---

## 1. Relations Registry — Runtime Status

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

**Not yet loaded:** `wiki/edit-post/index.html` (no change in P0-A).

### Registry API (`window.BoundLoreRelationsRegistry`)

- `getRelationDefinition(key)`
- `isKnownRelationType(key)`
- `getRelationsByFamily(family)`
- `getAllowedRelationTypesForDomains(sourceDomain, targetDomain)`
- `normalizeEvidenceTier(value)` / `normalizeConfidence(value)`
- `normalizeRelationType(key)` — canonical alias map; preserves `contains`, `dropped_by` as own keys
- `isReservedT3Slug(slug)` — `quest-`, `class-`, `talent-`, `event-`, `faction-`
- `getDomainForCategory(categorySlug)`

### Optional bridge in `knowledge-relations.js`

- `getRelationsRegistry()` — returns registry or null
- `normalizeRelationType()` — if registry knows type (e.g. future `crafted_from`), keeps it instead of falling back to `related_discovery`
- `getRelationLabel()` — uses registry label when available
- **No hard rejection** of legacy types; existing `RELATION_TYPES` still authoritative for runtime

---

## 2. Legacy Relation Types — Still Compatible

| Type | Status | Notes |
|------|--------|-------|
| `contains` | Active | Biome aggregation, location lists; registry `legacy: true` |
| `observed_in` | Active | Creature location; in `RELATION_TYPES` + registry alias to `found_in` for canonical lookup only |
| `dropped_by` | Active | Item pages inverse of drops; **not** aliased to `drops` in registry |
| `found_in` / `located_in` / `found_near` | Active | Unchanged |
| `drops` | Active | Unchanged |
| `part_of` | Active | Unchanged |
| `related_discovery` | Active | Default fallback for unknown types |
| `evidence_for` | Active | Discovery evidence links |

---

## 3. Relation Type Constants — Dual Registry (transitional)

| Location | Role |
|----------|------|
| `js/relations-registry.js` | **Canonical blueprint registry** — all families, merge/conflict metadata, P0+ types |
| `js/knowledge-relations.js` | **Runtime registry** — `RELATION_TYPES` for rendering, merge, DB sync |
| `js/contribution-flow.js` | Hardcoded strings in `buildRelations()` — not yet validated via registry |
| `js/edit-post.js` | `relationConfig` — legacy types: uses_item, related_creature, reference_guide |
| `js/wiki-entry-layout.js` | `normalizeRelType()` — independent of registry |
| DB `wiki_relation_types` | FOUND_IN, DROPS, PART_OF, REQUIRES, UNLOCKS, VARIANT_OF, RELATED_TO |

**Next integration step (P0-B):** Wire `contribution-flow.js` validation + CRAFT DB codes.

---

## 4. entity_domain / entity_subtype Baseline

### Helpers in `js/entity-core.js`

| Helper | Purpose |
|--------|---------|
| `inferEntityDomainFromCategory(category)` | Maps category → PLACE/BEING/OBJECT/… |
| `inferEntitySubtypeFromCategoryAndPayload(category, payload, meta, post)` | Conservative subtype inference |
| `resolveEntityDomain(metaOrPost, maybePost)` | Stored value or inferred |
| `resolveEntitySubtype(metaOrPost, maybePost)` | Stored value or inferred |
| `normalizeEntityClassification(meta, post)` | Adds domain/subtype to meta if missing |
| `isReservedT3Slug(slug)` | T3 namespace guard (documentary; no auto-entity) |

### Where new posts get classification

| Path | When |
|------|------|
| `create-post.js` discovery submit | After test marker, before evidence |
| `create-post.js` all post submit | Before `injectPostMetaCP` |
| `create-post.js` contribution submit | META/contribution defaults |
| `entity-core.js` `normalizeEntityMeta()` | On repair/normalize (additive) |

### Serialization

- `knowledge-relations.js` `serializePostMetaForStorage()` persists `entity_domain`, `entity_subtype`

### Existing posts

- **Not backfilled** — domain/subtype inferred at read time via `resolveEntityDomain` / `resolveEntitySubtype`
- **No UI changes** in P0-A
- **No required validation** — old posts without fields continue to work

### Mapping summary

| category | domain | default subtype |
|----------|--------|-----------------|
| biomes | PLACE | biome |
| locations/dungeons | PLACE | landmark / location_hint / dungeon (from payload) |
| creatures | BEING | creature / boss / mount / npc |
| items | OBJECT | item_generic / weapon / armor / resource / tool |
| lore | KNOWLEDGE | lore_book |
| guides/news | META | guide / news |
| guilds/community | COMMUNITY | guild / community |
| contributions | META | contribution |

---

## 5. T3 Namespace Guard

Reserved slug prefixes (no forms, no pages, no DB rows):

- `quest-`, `class-`, `talent-`, `event-`, `faction-`

`quest-anything` → standard post 404 (no auto-entity).  
Utilities: `BoundLoreRelationsRegistry.isReservedT3Slug()` + `EntityCore.isReservedT3Slug()`.

---

## 6. Still Not Implemented (by design)

| Area | Priority |
|------|----------|
| CRAFT relations in contribution/merge flows | P0-B |
| Resource Quick-Add | P0-C |
| Recipe Intent | P0-D |
| `/wiki/resources/` landing | P0-E |
| Recipe / Usage widgets | P0-F |
| Evidence-tier UI badges | P0-G |
| Boss wizard branch | P1 |
| NPC / Settlement / Lore flows | P1 |
| Status/damage type registry UI | P1 |
| SQL migrations for CRAFT DB codes | P0-B |
| Data backfill / repair scripts | Never without explicit approval |

---

## 7. Duplication / Misclassification Risks (unchanged)

| Risk | Mitigation status |
|------|-------------------|
| Resource name duplicates | Not yet — P0-C synonym warning |
| Procedural POI flood | `classifyPlaceEntry` + location_hint — works |
| Recipe duplicate pages | Blueprint: facts on item — enforced in docs only |
| Boss vs large creature | Subtype inference partial; boss wizard P1 |

---

## 8. Next P0 Step

**P0-B: CRAFT relations family** — enable `crafted_from`, `crafted_at`, `ingredient_of` in contribution validation, DB sync mapping, and merge prep (no UI yet).
