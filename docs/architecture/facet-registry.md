# Facet Registry

**Version 2.0 — binding architecture**

> **Code baseline (P0.5-B):** Runtime registry lives in [`js/facet-registry.js`](../../js/facet-registry.js) as `window.BoundLoreFacetRegistry`. Supports normalization, conservative derivation from existing BLMETA/payload, and minimal facet badges on resource detail + resources landing. Search indexing, filters, and facet editing are **not** implemented yet.

**P2-E.1:** `node_type` facet group added (future-safe). Explicit `resource.node_type` only — **not** inferred from `source_detail` text like "red crystal nodes". See [`js/resource-node-registry.js`](../../js/resource-node-registry.js).

**P2-E.2 acceptance sweep:** P2-E foundation block accepted locally. No node posts, no PLACE promotion, no taxonomy inference from source_detail.

**P2-F.1:** `biome_context`, `time_condition`, `weather_condition` facet groups added (explicit-only, `filter_relevant: false`). Observation location/coordinate fields are not facets by default. No inference from free text or coordinates.

**P2-F.2 acceptance sweep:** P2-F foundation block accepted locally. No PLACE promotion, no observation posts, no SQL, no data migration.

**P2-G.1:** `behavior`, `encounter_type`, `spawn_context`, `drop_context` facet groups added (explicit-only, `filter_relevant: false`). Drop chance/rate are qualifiers/fields, not facets.

**P2-G.2 acceptance sweep:** P2-G foundation block accepted locally. No encounter posts, no loot UI, no SQL, no data migration.

**P2-H.1 requirement/unlock baseline:** Requirements, unlocks, and progression contexts are structured fields/qualifiers — not posts by default. `required_level`, `faction_req`, `unlock_type`, `access_state`, `requirement_type` facet groups added (explicit-only, `filter_relevant: false`). Weather/time/biome requirements compatible with P2-F observation context. No skilltree/progression/unlock UI.

Controlled multi-valued classification layer for BoundLore. Facets complement — never replace — `entity_domain` and `entity_subtype`.

**Related:** [CONTENT_ARCHITECTURE.md](./CONTENT_ARCHITECTURE.md) · [entity-promotion-policy.md](./entity-promotion-policy.md) · [search-architecture.md](./search-architecture.md)

---

## Purpose

A single `entity_subtype` cannot express multi-role concepts (Creature + Mount + Boss + Vendor). Facets provide a controlled vocabulary for:

- **Roles** — what the entity does in game systems
- **Capabilities** — what players can do with it
- **Taxonomy** — hierarchical classification paths
- **Acquisition / processing / combat / availability** — filterable structured facts

**Rule:** Subtype answers *"What is it in essence?"* Facets answer *"What else is true about it?"*

---

## Design Rules

| Rule | Detail |
|------|--------|
| Subtype is exclusive | Exactly one primary `entity_subtype` per entity |
| Facets are multi-valued | Unless a group is marked **single** below |
| No facet replaces a relation | When a fact links two entities, use a relation (e.g. `found_in`), not a habitat string |
| Relation-backed facets | Some facet groups (habitat, profession_affinity) may be **derived** from relations to avoid duplicate truth |
| Evidence per facet value | Capability and role facets carry their own `evidence_tier` when gameplay function is claimed |
| Extension | New **values** via moderator review; new **groups** only via Blueprint / CONTENT_ARCHITECTURE change |

---

## Facet Groups

### taxonomy

| Property | Value |
|----------|-------|
| **Purpose** | Hierarchical class path for browse and search |
| **Initial values** | Controlled paths, e.g. `creature>reptile>dragon`, `material>wood`, `material>wood>oak` |
| **Cardinality** | Multi |
| **Applicable domains** | All |
| **Search relevance** | High |
| **Filter relevance** | High |
| **Evidence requirement** | Low — descriptive classification |
| **Moderation risk** | Low |

---

### role

| Property | Value |
|----------|-------|
| **Purpose** | Game-system role the entity plays |
| **Initial values** | `mount`, `vendor`, `quest_giver`, `boss_encounter`, `loot_source`, `trade_good`, `fuel`, `currency_role`, `companion`, `trainer` |
| **Cardinality** | Multi |
| **Applicable domains** | BEING, OBJECT, PLACE (rare) |
| **Search relevance** | High |
| **Filter relevance** | High |
| **Evidence requirement** | Medium — role claims need source |
| **Moderation risk** | Medium |

**Note:** `mount` is a **role**, not a subtype. Never create a parallel "Mount" entity page for a creature that is already documented.

---

### capability

| Property | Value |
|----------|-------|
| **Purpose** | Player-observable or confirmed abilities |
| **Initial values** | `rideable`, `flyable`, `tameable`, `swims`, `dives`, `climbs`, `combat_mount` |
| **Cardinality** | Multi |
| **Applicable domains** | BEING, OBJECT (vehicles) |
| **Search relevance** | High |
| **Filter relevance** | High |
| **Evidence requirement** | **High — each value carries its own evidence_tier** |
| **Moderation risk** | High (visual vs confirmed gameplay) |

---

### locomotion

| Property | Value |
|----------|-------|
| **Purpose** | How the entity moves (self, not player riding) |
| **Initial values** | `walks`, `flies`, `swims`, `burrows`, `sails` |
| **Cardinality** | Multi |
| **Applicable domains** | BEING, OBJECT (vehicle_boat) |
| **Search relevance** | Medium |
| **Filter relevance** | High |
| **Evidence requirement** | Medium |
| **Moderation risk** | Low |

---

### habitat / biome

| Property | Value |
|----------|-------|
| **Purpose** | Where the entity or resource is found |
| **Initial values** | Relation-backed — references PLACE/biome entities via `found_in` / `harvested_from` |
| **Cardinality** | Multi |
| **Applicable domains** | BEING, OBJECT (resource), PLACE |
| **Search relevance** | High |
| **Filter relevance** | High |
| **Evidence requirement** | Medium |
| **Moderation risk** | Low |

**Implementation note:** Prefer deriving habitat facets from spatial relations rather than duplicating biome names in BLMETA.

---

### element / affinity

| Property | Value |
|----------|-------|
| **Purpose** | Thematic or mechanical element association |
| **Initial values** | `fire`, `ice`, `nature`, `shadow`, `lightning`, `poison`, `arcane`, `physical` |
| **Cardinality** | Multi |
| **Applicable domains** | BEING, OBJECT, KNOWLEDGE |
| **Search relevance** | High |
| **Filter relevance** | Medium |
| **Evidence requirement** | Low for descriptive; medium for combat claims |
| **Moderation risk** | Low |

---

### acquisition_method

| Property | Value |
|----------|-------|
| **Purpose** | How an object is obtained |
| **Initial values** | `mining`, `chopping`, `harvesting`, `fishing`, `skinning`, `loot`, `vendor`, `quest_reward`, `salvage`, `event`, `environmental_pickup` |
| **Cardinality** | Multi |
| **Applicable domains** | OBJECT |
| **Search relevance** | High |
| **Filter relevance** | High |
| **Evidence requirement** | Medium |
| **Moderation risk** | Low |

**Synonym mapping (search):** `mineable` → `mining`; `gatherable` → context-dependent.

---

### processing_stage

| Property | Value |
|----------|-------|
| **Purpose** | Material processing state |
| **Initial values** | `raw`, `refined`, `component`, `reagent`, `fuel`, `final_good` |
| **Cardinality** | **Single** |
| **Applicable domains** | OBJECT (resource, material) |
| **Search relevance** | Medium |
| **Filter relevance** | High |
| **Evidence requirement** | Low |
| **Moderation risk** | Low |

---

### rarity / tier / quality

| Property | Value |
|----------|-------|
| **Purpose** | Value and power gradations |
| **Initial values** | Rarity: `unknown`, `common`, `uncommon`, `rare`, `epic`, `legendary`, `unique`. Tier/quality: numeric or named scales (reserved until game evidence) |
| **Cardinality** | Single per axis (rarity, tier, quality are separate sub-keys) |
| **Applicable domains** | OBJECT, BEING |
| **Search relevance** | High |
| **Filter relevance** | High |
| **Evidence requirement** | Medium |
| **Moderation risk** | Medium (community disputes on tier) |

---

### combat_rank

| Property | Value |
|----------|-------|
| **Purpose** | Enemy difficulty class |
| **Initial values** | `normal`, `elite`, `boss`, `world_boss` |
| **Cardinality** | **Single** |
| **Applicable domains** | BEING |
| **Search relevance** | High |
| **Filter relevance** | High |
| **Evidence requirement** | Medium |
| **Moderation risk** | Medium |

**Note:** Boss is a **rank facet**, not a separate creature page, unless the boss is a named unique with its own canonical identity (still one BEING entity with `combat_rank: boss`).

---

### equipment_slot

| Property | Value |
|----------|-------|
| **Purpose** | Where gear is equipped |
| **Initial values** | Reserved — populate when game confirms slot names |
| **Cardinality** | Single |
| **Applicable domains** | OBJECT (weapon, armor, accessory) |
| **Search relevance** | Medium (P2) |
| **Filter relevance** | High (P2) |
| **Evidence requirement** | Medium |
| **Moderation risk** | Low |

**Status:** `reserved` until T2 evidence.

---

### profession_affinity

| Property | Value |
|----------|-------|
| **Purpose** | Which profession crafts or uses this entity |
| **Initial values** | Relation-backed via `crafted_by_profession` (proposed P1) |
| **Cardinality** | Multi |
| **Applicable domains** | OBJECT, SYSTEM |
| **Search relevance** | High |
| **Filter relevance** | High |
| **Evidence requirement** | Medium |
| **Moderation risk** | Low |

---

### event_availability

| Property | Value |
|----------|-------|
| **Purpose** | Temporal availability |
| **Initial values** | `permanent`, `event_only`, `seasonal`, `removed` |
| **Cardinality** | **Single** |
| **Applicable domains** | All content domains |
| **Search relevance** | Medium |
| **Filter relevance** | High |
| **Evidence requirement** | Medium |
| **Moderation risk** | Medium |

---

### version_validity

| Property | Value |
|----------|-------|
| **Purpose** | Marks facts valid only for certain game versions |
| **Initial values** | Not a facet value list — implemented as qualifiers on facts/relations (`valid_from`, `valid_until`, `game_version`). See [versioning-model.md](./versioning-model.md) |
| **Cardinality** | N/A (qualifier) |
| **Applicable domains** | All |
| **Search relevance** | Ranking (current > historical) |
| **Filter relevance** | Optional "include historical" toggle (P2) |
| **Evidence requirement** | High |
| **Moderation risk** | High |

---

### temperament

| Property | Value |
|----------|-------|
| **Purpose** | Default behavior toward players |
| **Initial values** | `passive`, `neutral`, `defensive`, `aggressive`, `territorial`, `unknown` |
| **Cardinality** | **Single** |
| **Applicable domains** | BEING |
| **Search relevance** | Medium |
| **Filter relevance** | High |
| **Evidence requirement** | Medium |
| **Moderation risk** | Low |

---

## BLMETA Storage Shape (proposed)

```json
{
  "facets": {
    "taxonomy": ["creature>reptile>dragon"],
    "role": [
      { "value": "mount", "evidence_tier": "observed", "source": "announcement_trailer" }
    ],
    "capability": [
      { "value": "rideable", "evidence_tier": "confirmed", "source": "steam_page" },
      { "value": "flyable", "evidence_tier": "confirmed", "source": "steam_page" },
      { "value": "tameable", "evidence_tier": "speculative" }
    ],
    "locomotion": ["flies", "walks"],
    "element": [{ "value": "fire", "evidence_tier": "observed" }]
  }
}
```

Plain-string values are allowed for low-risk groups (taxonomy, locomotion) when evidence is implicit from the entity itself.

---

## Reference Example: Dragon Mount

**Problem:** Search for "dragon mount" must find a creature entry without creating a second Mount page.

| Field | Value |
|-------|-------|
| Canonical entity | `creatures\|emberwing` (example) |
| `entity_domain` | BEING |
| `entity_subtype` | creature |
| `taxonomy` | `creature>reptile>dragon` |
| `role` | `mount` (evidence: observed) |
| `capability` | `rideable`, `flyable` (evidence: confirmed per official sources) |
| `capability` | `tameable` (evidence: speculative — shown separately with badge) |
| Second page? | **No** — one creature page with Mount Capabilities widget |

**Search path:** Query `dragon mount` → taxonomy match `dragon` + synonym expansion `mount` → `role:mount` OR `capability:rideable` → single result.

**Detail widgets:** Classification shows Domain/Subtype/Taxonomy; Mount Capabilities section renders only when capability/role facets exist; Evidence badges per capability value.

---

## P0.5 Implementation Scope

Documentation and schema preparation in Blueprint 2.0. **P0.5-B code baseline shipped** in `js/facet-registry.js`. Remaining gates:

1. ~~Facet group registry in code~~ — **done (P0.5-B)** via `js/facet-registry.js`
2. BLMETA `facets` field (additive, backward compatible) — explicit authoring not yet in forms
3. ~~Display badges in `wiki-entry-layout.js`~~ — **partial (P0.5-B)** resource hero + resource cards
4. Index facets in search baseline (see [search-architecture.md](./search-architecture.md)) — **not started**
