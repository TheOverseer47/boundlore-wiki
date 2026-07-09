# Graph Relations Specification

Canonical relation types for BoundLore knowledge graph. Implementation registry: `js/relations-registry.js`.

**Direction notation:** `source → target` (relation stored on source entity pointing to target).

---

## SPATIAL Family

### found_in

| Property | Value |
|----------|-------|
| Family | SPATIAL |
| Direction | Being/Object → Place |
| Allowed source domains | BEING, OBJECT |
| Allowed target domains | PLACE |
| Required properties | — |
| Optional properties | conditions, confidence, evidence_tier, source_post_id, report_count |
| Merge rule | Additive; same target ⇒ increment report_count |
| Conflict rule | None (multiple locations valid) |
| Render widget | Location chip list |
| Example | QA Staff of Fire `found_in` Swamp |

**Legacy compatibility:** Maps to DB `FOUND_IN`. Existing JS types `observed_in`, `found_near`, `located_in` (item context) normalize here for display.

---

### located_in

| Property | Value |
|----------|-------|
| Family | SPATIAL |
| Direction | Place → Place (child in parent) |
| Allowed source domains | PLACE |
| Allowed target domains | PLACE |
| Required properties | — |
| Optional properties | confidence, evidence_tier, source_post_id |
| Merge rule | Additive |
| Conflict rule | None |
| Render widget | Breadcrumb / parent link |
| Example | Sunken Temple `located_in` Swamp |

**Legacy compatibility:** Creature `located_in` inverts to `contains` on biome target in current `knowledge-relations.js`.

---

### spawns_at

| Property | Value |
|----------|-------|
| Family | SPATIAL |
| Direction | Being → Place |
| Allowed source domains | BEING |
| Allowed target domains | PLACE |
| Required properties | — |
| Optional properties | **conditions** (time_of_day, weather), confidence, evidence_tier, source_post_id, report_count |
| Merge rule | Additive; merge conditions JSON if same target |
| Conflict rule | Contradictory conditions coexist with note |
| Render widget | Spawn conditions table |
| Example | Ogre Mage `spawns_at` near Campfire, conditions: `{ time_of_day: "night" }` |

**Legacy compatibility:** Spawn contributions currently use `found_in`/`located_in` — migrate to `spawns_at` in P1.

---

## DROP/YIELD Family

### drops

| Property | Value |
|----------|-------|
| Family | DROP_YIELD |
| Direction | Being → Object |
| Allowed source domains | BEING |
| Allowed target domains | OBJECT |
| Required properties | — |
| Optional properties | quantity, rate, confidence, evidence_tier, source_post_id, report_count |
| Merge rule | Additive; same item ⇒ report_count++ |
| Conflict rule | Quantity conflicts → needs_review if values differ |
| Render widget | Drops table (primary on creature pages) |
| Example | Ogre Mage `drops` QA Staff of Fire |

**Legacy compatibility:** DB `DROPS`. Inverse `dropped_by` on item pages (keep both directions).

---

### harvested_from

| Property | Value |
|----------|-------|
| Family | DROP_YIELD |
| Direction | Object (resource) → Place/Being |
| Allowed source domains | OBJECT |
| Allowed target domains | PLACE, BEING |
| Required properties | — |
| Optional properties | quantity, rate, conditions, confidence, evidence_tier, source_post_id |
| Merge rule | Additive |
| Conflict rule | None |
| Render widget | Source list on resource pages |
| Example | Ember Shard `harvested_from` Volcanic biome |

---

### contains_loot

| Property | Value |
|----------|-------|
| Family | DROP_YIELD |
| Direction | Place → Object |
| Allowed source domains | PLACE |
| Allowed target domains | OBJECT |
| Required properties | — |
| Optional properties | quantity, confidence, evidence_tier, source_post_id |
| Merge rule | Additive |
| Conflict rule | None |
| Render widget | Loot found table on place pages |
| Example | Sunken Temple `contains_loot` Rare Gem |

**Legacy compatibility:** Overlaps with `contains` on biomes — `contains` remains for entity containment; `contains_loot` is loot-specific.

---

## CRAFT Family (P0 priority)

### crafted_from

| Property | Value |
|----------|-------|
| Family | CRAFT |
| Direction | Object (result) → Object (ingredient) |
| Allowed source domains | OBJECT |
| Allowed target domains | OBJECT |
| Required properties | quantity (recommended) |
| Optional properties | quantity, unit, confidence, evidence_tier, source_post_id, report_count, notes |
| Merge rule | Same target + type + ingredient ⇒ CONFIRM (`report_count++`); new ingredient ⇒ ADD |
| Conflict rule | Same ingredient, different quantity ⇒ `needs_review` conflict (never silent overwrite) |
| Render widget | Recipe ingredient list on item page |
| Example | Staff of Fire `crafted_from` Ember Shard ×3 |

---

### crafted_at

| Property | Value |
|----------|-------|
| Family | CRAFT |
| Direction | Object (result) → SYSTEM (station) |
| Allowed source domains | OBJECT |
| Allowed target domains | SYSTEM |
| Required properties | — |
| Optional properties | confidence, evidence_tier, source_post_id |
| Merge rule | Same station ⇒ CONFIRM; new station on empty target ⇒ ADD |
| Conflict rule | Different station on confirmed target ⇒ `recipe_station` conflict (`needs_review`) |
| Render widget | "Crafted at: Forge" link |
| Example | Staff of Fire `crafted_at` Forge |

---

### ingredient_of

| Property | Value |
|----------|-------|
| Family | CRAFT |
| Direction | Object (ingredient) → Object (result) |
| Allowed source domains | OBJECT |
| Allowed target domains | OBJECT |
| Required properties | quantity |
| Optional properties | confidence, evidence_tier, source_post_id |
| Merge rule | Additive (inverse of crafted_from, auto-derived) |
| Conflict rule | None |
| Render widget | Usage table on resource page (**primary P0 widget**) |
| Example | Ember Shard `ingredient_of` Staff of Fire ×3 |

**Note:** `ingredient_of` may be auto-generated from `crafted_from` inverse to avoid duplicate entry.

---

### unlocks

| Property | Value |
|----------|-------|
| Family | CRAFT |
| Direction | Object/Being/SYSTEM → Recipe/Skill |
| Allowed source domains | OBJECT, BEING, SYSTEM |
| Allowed target domains | SYSTEM |
| Required properties | — |
| Optional properties | conditions, evidence_tier |
| Merge rule | Additive |
| Conflict rule | None |
| Render widget | Unlock requirements list |
| Example | Rare Tome `unlocks` Fireball skill |

---

## COMBAT/SYSTEM Family (P1)

### weak_to / resistant_to / inflicts / requires / grants

See `js/relations-registry.js` for full property schemas. Summary:

| Type | Direction | Merge | Conflict |
|------|-----------|-------|----------|
| weak_to | Being → damage_type | Additive | Contradicts resistant_to same type |
| resistant_to | Being → damage_type | Additive | Contradicts weak_to same type |
| inflicts | Being/Object → status_effect | Additive | None |
| requires | X → skill/class/item | Additive | None |
| grants | Object → skill/ability | Additive | None |

---

## SOCIAL/LORE Family (P1/P2)

### mentions

| Property | Value |
|----------|-------|
| Family | SOCIAL_LORE |
| Direction | KNOWLEDGE → any |
| Merge | Additive |
| Render | Mentioned-in chips on target pages |

### member_of / hostile_to / allied_to / gives_quest

T3-ready. No forms before evidence. Documented for namespace reservation.

---

## TAXONOMIC Family

### variant_of / part_of / related_to

| Type | Use | Constraint |
|------|-----|------------|
| variant_of | Archetype hierarchy (Frost Ogre → Ogre Mage) | Review for entity creation |
| part_of | Structural containment | Prefer over generic `contains` for non-loot |
| related_to | **Weak fallback only** | Requires `note` property; never default for new systems |

**Legacy:** `contains` ↔ `part_of` inverse pair exists in `knowledge-relations.js`. Keep until migration.

---

## SQL CTE Sketch — Ingredient Reverse Lookup (documentation only)

```sql
-- SKIZZE — do not execute without review
-- Find all craftable items that use resource X as ingredient
WITH resource_entity AS (
  SELECT id FROM wiki_entities WHERE canonical_slug = :resource_slug
),
usage AS (
  SELECT r.source_entity_id
  FROM wiki_entity_relations r
  WHERE r.relation_type IN ('crafted_from', 'ingredient_of')
    AND r.target_entity_id = (SELECT id FROM resource_entity)
)
SELECT p.slug, p.title, p.category
FROM posts p
JOIN wiki_entities e ON e.source_post_id = p.id
JOIN usage u ON u.source_entity_id = e.id
WHERE p.deleted_at IS NULL AND p.status = 'published';
```
