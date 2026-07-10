# Graph Relations Specification

**Version 2.0** — extends P0 relation families with qualifiers, forward-only persistence rules, and proposed/reserved types.

Canonical relation types for BoundLore knowledge graph. Implementation registry: `js/relations-registry.js`.

**Direction notation:** `source → target` (relation stored on source entity pointing to target).

**Related:** [CONTENT_ARCHITECTURE.md](./CONTENT_ARCHITECTURE.md) · [versioning-model.md](./versioning-model.md) · [entity-promotion-policy.md](./entity-promotion-policy.md)

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

**Legacy compatibility:** DB `DROPS`. Inverse `dropped_by` on item pages — **derived in 2.0** (do not persist both directions for new merges).

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

---

## Relation Registry 2.0 — Binding Rules

### Forward persistence / derived inverses

| Rule | Detail |
|------|--------|
| Persist | Forward direction only (source → target as defined per type) |
| Derive | All inverses at render and search index time |
| `ingredient_of` | **Derived** from `crafted_from` — never persist (P0 decision retained) |
| `dropped_by` | Derived from `drops` |
| `sold_by` (proposed) | Derived from `sold_by` forward on vendor → item (widget: "Sold by") |
| `reward_of` (proposed) | Derived inverse of `reward_of` forward on quest/event → item |
| `station_for` | Derived from `crafted_at` |
| Symmetric types | `hostile_to`, `allied_to`, `related_to` — store once; derive mirror for display (P1 migration from double-write) |

### Relation Qualifiers (typed object on each relation)

Qualifiers extend the relation without creating new entities:

| Qualifier | Type | Used by |
|-----------|------|---------|
| `quantity` | number | crafted_from, drops, reward_of |
| `unit` | string | crafted_from |
| `station` | entity ref or unresolved name | crafted_from (when station differs from crafted_at target) |
| `condition` | object (time, weather, event) | spawns_at, drops, gathered_via |
| `tool` | entity ref or name | gathered_via, harvested_from |
| `drop_chance` | number 0–1 | drops |
| `price` | number | sold_by |
| `currency` | string / entity ref | sold_by |
| `required_level` | number | crafted_by_profession, unlocks |
| `game_version` | string, nullable | all versioned types |
| `valid_from` | string, nullable | versioning |
| `valid_until` | string, nullable | versioning |
| `alternative_group` | string | crafted_from (mutually exclusive recipe branches) |
| `unlock_type` | enum | unlocks (quest, trainer, discovery) |

**Storage shape (proposed):**

```json
{
  "type": "crafted_from",
  "target": "items|qa-ember-shard",
  "qualifiers": {
    "quantity": 3,
    "unit": "piece",
    "game_version": null
  },
  "evidence_tier": "reported",
  "confidence": "single_observation"
}
```

Standard relation properties retained: `confidence`, `evidence_tier`, `source_post_id`, `report_count`.

---

## Proposed / Reserved Relation Types (Blueprint 2.0)

Status key: **proposed** = spec ready, not in `js/relations-registry.js` yet · **reserved** = namespace only

### DROP_YIELD / GATHERING

#### gathered_via — proposed

| Property | Value |
|----------|-------|
| Family | DROP_YIELD / GATHERING |
| Direction | Object (resource) → SYSTEM (gathering_method) or tool |
| Persist | Forward |
| Inverse | derived |
| Qualifiers | tool, skill_requirement, node_type, condition |
| Search expansion | acquisition_method facet |
| Example | Ember Shard `gathered_via` mining |

### CRAFT

#### crafted_by_profession — proposed

| Property | Value |
|----------|-------|
| Family | CRAFT |
| Direction | Object (result) → SYSTEM (profession) |
| Persist | Forward |
| Inverse | `profession_crafts` derived |
| Qualifiers | required_level, game_version |
| Widget | Profession requirement on item page |

### ECONOMY — proposed

#### sold_by

| Property | Value |
|----------|-------|
| Direction | OBJECT → BEING (vendor) |
| Persist | Forward (vendor sells item — or item sold_by vendor; **choose vendor → item forward** for inventory authoring) |
| Inverse | `sells` derived for vendor page widget |
| Qualifiers | price, currency, availability, faction_requirement, game_version |
| Widget | "Sold by" on item (derived inbound) |

#### reward_of

| Property | Value |
|----------|-------|
| Direction | OBJECT → KNOWLEDGE/EVENT (quest or event) |
| Inverse | `rewards` derived |
| Qualifiers | quantity, choice_group |

### MOUNT / TAME — proposed

#### mountable_by / tamed_via

| Property | Value |
|----------|-------|
| Direction | BEING (creature) → OBJECT (item/method) or SYSTEM |
| Persist | Forward |
| Facet sync | May derive capability:tameable / role:mount when evidence confirmed |
| Evidence | High — review_required |

### EVENT — proposed

#### occurs_during

| Property | Value |
|----------|-------|
| Direction | BEING/OBJECT → EVENT |
| Qualifiers | schedule, region, game_version |
| Facet sync | event_availability |

### VERSION — proposed

#### introduced_in / changed_in / removed_in

| Property | Value |
|----------|-------|
| Direction | Entity → META/game_version |
| Persist | Forward as version statements (see [versioning-model.md](./versioning-model.md)) |
| Qualifiers | change_note, superseded_by |

### OBSERVATION — proposed

#### observed_as

| Property | Value |
|----------|-------|
| Type | Observation record, not standard graph edge |
| Purpose | Player sighting without new entity |
| Qualifiers | reporter, observed_at, location, game_version, seed |

---

## Inbound Widget Derivation Map

| Widget on page | Derived from inbound relation |
|----------------|------------------------------|
| Used In | `crafted_from` (ingredient_of inverse) |
| Dropped By | `drops` inverse |
| Sold By | `sold_by` inverse (P1) |
| Rewards | `reward_of` inverse (P2) |
| Crafts Here | `crafted_at` inverse |
| Known Locations | `located_at` / `found_in` inverse |

Widgets read derived inverses only — never maintain duplicate persisted inverse rows.

---

## Dedupe Keys (2.0)

| Relation | Dedupe key fields |
|----------|-------------------|
| crafted_from | source, target, alternative_group, game_version bucket |
| crafted_at | source, target station |
| drops | source, target, condition hash, game_version bucket |
| sold_by | vendor, item, game_version bucket |
| weak_to | source, damage_type target |

Same dedupe key + same value → corroboration (report_count++). Same key + different value → conflict (needs_review).

---

## Implementation Phases

| Phase | Relation work |
|-------|---------------|
| P0 | crafted_from, crafted_at, ingredient_of derived ✅ |
| P0.5 | Qualifier schema in docs + BLMETA examples; station_type targets + safe create prefill (P0.5-D) |
| P1 | gathered_via, crafted_by_profession, sold_by, qualifier merge engine |
| P2 | reward_of, occurs_during, version relations, mountable_by |
