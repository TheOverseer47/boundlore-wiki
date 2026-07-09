# Current Code Gap Notes

Audit of existing BoundLore codebase against the content architecture blueprint.  
**Date:** 2026-07-09 · **No code changes in this audit.**

---

## 1. Relation Type Constants — Where They Live Today

| Location | What it defines | Notes |
|----------|-----------------|-------|
| `js/knowledge-relations.js` | `RELATION_TYPES` object (lines ~10–99) | **Primary runtime registry today.** Types: observed_in, located_in, found_in, found_near, part_of, contains, drops, dropped_by, requires, related_discovery, evidence_for |
| `js/knowledge-relations.js` | `normalizeRelationType()` | Aliases: found_in/location, loot/drop → drops |
| `js/knowledge-relations.js` | `normalizeRelationTypeForDbSync()` | Maps JS types → DB vocabulary: FOUND_IN, DROPS, PART_OF, REQUIRES, UNLOCKS, VARIANT_OF, RELATED_TO |
| `supabase/sprint1_knowledge_graph_foundation.sql` | `wiki_relation_types` table | DB codes: FOUND_IN, DROPS, PART_OF, REQUIRES, UNLOCKS, VARIANT_OF, RELATED_TO |
| `js/contribution-flow.js` | Hardcoded relation types in `buildRelations()` | drops, dropped_by, found_in, located_in, contains |
| `js/edit-post.js` | `relationConfig` per category group | uses_item, related_creature, found_in, reference_guide |
| `js/wiki-entry-layout.js` | `normalizeRelType()` + section rendering | found_in, observed_in, drops, contains, part_of |
| `js/post-detail.js` | Inline relation display | dropped_by, located_in |
| `js/create-post.js` | BLMETA relation serialization | related_to default fallback |

**New registry:** `js/relations-registry.js` — **not yet integrated** into any of the above. Standalone foundation for P0.

---

## 2. Free-String Relation Usage (migration targets)

These files use relation types as ad-hoc strings without central validation:

| File | Pattern | Risk |
|------|---------|------|
| `js/contribution-flow.js` | `"drops"`, `"dropped_by"`, `"found_in"`, `"located_in"`, `"contains"` | Medium — works but bypasses registry |
| `js/edit-post.js` | `"related_to"`, `"uses_item"`, `"related_creature"`, `"reference_guide"` | Medium — legacy types not in new registry |
| `js/knowledge-relations.js` | `"related_discovery"` as default fallback | Low — internal convention |
| `js/create-post.js` | `rel.relation_type \|\| "related_to"` | Medium — weak fallback overused |
| `js/entity-core.js` | `"related_discovery"` default | Low |

**P0 integration point:** `contribution-flow.js` `buildRelations()` should validate against `BoundLoreRelationsRegistry.isKnownRelationType()` before writing.

---

## 3. Legacy / Compatibility Types (must not break)

| Legacy type | Maps to (registry) | Status | Action |
|-------------|-------------------|--------|--------|
| `observed_in` | found_in (display) | Active in creatures/items | Keep; document in registry LEGACY_ALIASES |
| `found_near` | found_in | Active | Keep |
| `located_in` | found_in / located_in (context-dependent) | Active; inverts to contains on biomes | Keep |
| `dropped_by` | drops (inverse) | Active on item pages | Keep |
| `contains` | part_of (inverse) / contains_loot (loot context) | Active on biomes | Keep; distinguish from contains_loot in P0 |
| `part_of` | part_of | Active | Keep |
| `related_discovery` | related_to (with discovery context) | Active default | Keep until structured relations replace |
| `evidence_for` | — (meta relation) | Active | Keep |
| `uses_item` | requires (edit-post legacy) | Active in edit-post | Map in registry |
| `related_creature` | related_to (edit-post legacy) | Active | Map in registry |
| `reference_guide` | related_to (edit-post legacy) | Active | Map in registry |

---

## 4. Missing Relation Types (P0/P1 targets)

| New type | Family | Exists in code? | Exists in DB? | Priority |
|----------|--------|-----------------|---------------|----------|
| crafted_from | CRAFT | **no** | **no** | **P0** |
| crafted_at | CRAFT | **no** | **no** | **P0** |
| ingredient_of | CRAFT | **no** | **no** | **P0** |
| harvested_from | DROP_YIELD | **no** | **no** | **P0** |
| contains_loot | DROP_YIELD | **no** | **no** | P1 |
| spawns_at | SPATIAL | **no** (spawn uses found_in) | **no** | P1 |
| weak_to | COMBAT | **no** | **no** | P1 |
| resistant_to | COMBAT | **no** | **no** | P1 |
| inflicts | COMBAT | **no** | **no** | P1 |
| grants | COMBAT | **no** | UNLOCKS (partial) | P1 |
| mentions | SOCIAL_LORE | **no** | **no** | P1 |
| variant_of | TAXONOMIC | partial (DB VARIANT_OF) | yes | P1 |
| unlocks | CRAFT | partial (DB UNLOCKS) | yes | P2 |

---

## 5. Entity Domain / Subtype Gaps

| Field | Exists? | Where | Gap |
|-------|---------|-------|-----|
| `entity_domain` | **no** | — | Not in BLMETA; only implied by `category` |
| `entity_subtype` | **no** | — | Subcategories exist in `categories-config.js` nav only, not in BLMETA |
| `evidence_tier` | **no** | — | `confidence_level` in contributions, not on entities |
| `content_origin` | yes | `test-data.js`, BLMETA | Works for test marking only |
| `completeness` | yes | `knowledge_entry.completeness` in BLMETA | Partial |
| `canonical_slug` | yes | `entity_profile.canonical_slug` | Works |
| `slug_aliases` | yes | `entity_profile.slug_aliases` | Works |

**P0 target:** Add `entity_domain` + `entity_subtype` to BLMETA serialization in `create-post.js` / `knowledge-relations.js`.

---

## 6. Discovery Categories — Current vs. Blueprint

| Category (categories-config.js) | Blueprint domain | Subtype support | Form specificity |
|--------------------------------|------------------|-----------------|------------------|
| creatures | BEING | subcategories (mounts, monsters, races, npcs) — nav only | Creature wizard exists |
| items | OBJECT | subcategories (weapons, armor, items) — nav only | Item wizard exists |
| biomes | PLACE | climate subcategories — nav only | Place classifier exists |
| locations | PLACE | none | Generic + location_hint |
| dungeons | PLACE | none | **no dedicated form** |
| lore | KNOWLEDGE | none | **no dedicated form** |
| crafting | SYSTEM | none | **no dedicated form** |
| classes | SYSTEM (T3) | subcategories — nav only | **no form** |
| guides | META | — | exists |
| guilds | COMMUNITY | — | exists |
| community | COMMUNITY | — | generic |
| news | META | — | exists |

**Gap:** No `resources` category/page. Dungeons/lore/crafting categories exist in nav but share generic discovery flow.

---

## 7. Contribution Intents — Current vs. Blueprint

| Intent (contribution-flow.js) | Blueprint status | Notes |
|-------------------------------|------------------|-------|
| add_info | exists | Generic |
| add_stats | exists | Creature + item |
| add_effect | exists | Item |
| add_image | exists | Generic |
| report_drop | exists | Creature → item |
| add_behavior | exists | Creature |
| confirm_location | exists | Location context |
| add_spawn | exists | Creature (uses found_in, not spawns_at) |
| report_known_item | exists | Item known drop |
| **add_recipe** | **missing** | P0 |
| **add_usage** | **missing** | P0 (resource ingredient_of) |
| **add_weakness** | **missing** | P1 |
| **mark_rideable** | **missing** | P1 |
| **add_transcript** | **missing** | P1 |

---

## 8. Layout / Widget Gaps

| Widget | File | Status |
|--------|------|--------|
| Drops table | wiki-entry-layout.js | exists |
| Found-in chips | wiki-entry-layout.js | exists |
| Spawn section | wiki-entry-layout.js | partial (via found_in) |
| **Recipe widget** | — | **missing (P0)** |
| **Sources widget** | partial (dropped_by) | needs generalization (P0) |
| **Usage widget** | — | **missing (P0)** |
| Evidence tier badge | — | **missing (P0)** |
| Observations log (collapsed) | wiki_observations exist in DB | **not rendered on pages** |
| Disputed fact badge | contribution_conflicts exist | partial in admin, not on public pages |

---

## 9. Where to Integrate `relations-registry.js` (P0 order)

| Step | File | Integration |
|------|------|-------------|
| 1 | `js/knowledge-relations.js` | Import registry; extend `RELATION_TYPES` from registry canonical types; keep legacy aliases |
| 2 | `js/contribution-flow.js` | Validate `buildRelations()` output against registry |
| 3 | `js/wiki-entry-layout.js` | Use registry `renderHint` for section widgets |
| 4 | `js/create-post.js` | Set `entity_domain`/`entity_subtype` from registry domain map |
| 5 | `supabase/sprint1_sync_rpc.sql` | Add CRAFT DB codes when relations go live (separate SQL task) |

**Current status:** Registry file created, **not loaded by any HTML page yet.** Safe — no runtime impact.

---

## 10. Duplicate / Misclassification Risks in Current Code

| Risk | Current mitigation | Blueprint addition |
|------|-------------------|-------------------|
| Creature name variants | canonical_slug + aliases | Keep |
| Procedural location flood | classifyPlaceEntry + location_hint | Archetype/instance question in forms |
| Contribution duplicates | repair_contribution_duplicates (danger zone) | Keep |
| Item stat conflicts | contribution_conflicts + needs_review | Keep + evidence_tier |
| Resource name duplicates | **none** | Synonym warning (P0) |
| Recipe overwrite | **N/A (no recipes yet)** | Always review (P0) |

---

## 11. Overengineering Traps to Avoid

- Do NOT create `wiki_facts` table before query need is proven
- Do NOT migrate BLMETA out of HTML before P2 evaluation
- Do NOT build quest/economy/talent forms before T3→T2 promotion
- Do NOT add recipe as post category — use relations on items
- Do NOT integrate registry into all files in one PR — staged per roadmap
