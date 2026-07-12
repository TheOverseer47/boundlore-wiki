# Entity Promotion Policy

**Version 2.0 — binding architecture**

Defines when a mentioned name becomes an entity, when it stays unresolved, and how stubs are created without spam.

**Related:** [CONTENT_ARCHITECTURE.md](./CONTENT_ARCHITECTURE.md) · [facet-registry.md](./facet-registry.md) · [graph-relations-spec.md](./graph-relations-spec.md)

---

## Core Principle

**No blind auto-stubs.** Contributions and recipe merges must not silently create empty entity pages for every unresolved ingredient, station, or relation target. Instead, the system tracks **unresolved targets** and surfaces them via the **Missing Entry Queue** for moderator or contributor action.

Existing P0 behavior (Wood and Forge as plain text in merged Staff recipe) is **correct for P0** and becomes the first Missing Entry Queue entries in P0.5.

---

## Lifecycle States

```text
mentioned → unresolved → candidate → stub → provisional → canonical
                              ↓
                    merged_alias / deprecated → historical
```

| State | Meaning | Has page? | Visible to users? |
|-------|---------|-----------|-------------------|
| **mentioned** | Name appears in free text or notes | No | No |
| **unresolved** | Structured reference (recipe ingredient, relation target) without entity | No | Yes — badge/link hint on parent page |
| **candidate** | Meets promotion score threshold; in Missing Entry Queue | No | Admin/contributor queue only |
| **stub** | Minimal entity page created by approved promotion | Yes (stub) | Yes — stub banner |
| **provisional** | Page with minimum fields + ≥1 relation + evidence | Yes | Yes |
| **canonical** | Reviewed, stable identity | Yes | Yes |
| **merged_alias** | Former entity; slug redirects to winner | Redirect only | Via redirect |
| **deprecated** | Removed from game or disproven | Yes (archived) | Yes with deprecated badge |
| **historical** | Permanent archive state | Yes | Via version/history UI (P2) |

---

## Promotion Score

Automatic scoring feeds the Missing Entry Queue. Moderators always approve promotion to stub.

| Signal | Weight |
|--------|--------|
| Independent mention count | +1 per distinct source post |
| Highest evidence tier of mentions | confirmed +5, observed +3, reported +1 |
| Official name confirmed | immediate candidate |
| Inbound relation types (distinct) | +2 per type |
| Search queries with no result for name | +3 (when search baseline exists) |
| Duplicate risk (synonym collision) | −3 |
| Instance vs archetype (procedural one-off) | −5 (blocks promotion) |

**Threshold:** Score ≥ 5 → **candidate** in Missing Entry Queue.

---

## Wood Promotion Rule

| Question | Rule |
|----------|------|
| When own resource page? | ≥2 independent recipe/source mentions OR official name |
| Official name required first? | No for stub; yes for `canonical` |
| Multiple wood types? | Start as **variant block** on parent Wood page (Oak Wood, Pine Wood); separate pages only when distinct sources, biomes, or recipe chains justify it |
| Current state (P0) | `Wood` in QA Staff recipe = **unresolved** (1 mention) |
| P0.5-D action | Suggested as OBJECT/resource; safe create-prefill link opens Resource Quick-Add (no auto-save) |
| P1+ action | Manual submit + moderator approve when promotion threshold met |

---

## Forge Promotion Rule

| Question | Rule |
|----------|------|
| What is Forge? | **SYSTEM / station_type** — archetype crafting station, not a place |
| When own page? | ≥1 merged recipe references station by name (already satisfied for Forge) |
| Generic type vs instance? | **Station type** = canonical entity. **Concrete forge in settlement** = `located_at` observation on station page, not a separate PLACE page |
| Portable forge item? | OBJECT/tool with `functions_as` → station_type:forge (P1 relation) |
| Current state (P0) | `Forge` in QA Staff recipe = **unresolved**; should be **candidate** immediately |
| P0.5-D action | Suggested as SYSTEM/station_type; safe create-prefill link opens Station Type Quick-Add (no auto-save) |
| P1+ action | Manual submit + moderator approve; backlink all `crafted_at` references |

---

## Source Node / Red Crystal Nodes Rule

| Question | Rule |
|----------|------|
| What is "red crystal nodes"? | **Observation property** on resource (`source_detail`), not a location |
| When archetype entity? | When ≥2 resources share the same node type name — then registry concept `node_type` (P2) |
| Location page? | **Never** for procedural gather nodes |
| Current state (P0) | QA Ember Shard `source_detail: red crystal nodes` — correct; no location stub |

**P2-E.1:** `js/resource-node-registry.js` — `node_type` is structured field/observation context, not a post. Concrete nodes are future Observations, not automatic PLACE pages. `shouldPromoteNodeTypeToPost` remains false. No inference from source_detail to crystal taxonomy.

**P2-E.2 acceptance sweep:** Resource node types and acquisition sources accepted as registry/read/search/facet baseline only. No node posts, no PLACE promotion, no SQL, no data migration.

**P2-F.1:** `js/observation-context-registry.js` — coordinates, location refs, biome/time/weather conditions are structured observation fields, not posts. `shouldPromoteCoordinatesToPlace` and `shouldPromoteObservationToPost` remain false. Free-text locations stay text signals; no PLACE promotion from coordinates or location text. Map/route/spawn UI deferred.

**P2-F.2 acceptance sweep:** Observation locations, coordinates, biome/time/weather conditions accepted as registry/read/search/facet baseline only. No PLACE promotion, no observation posts, no SQL, no data migration.

**P2-G.1:** `js/creature-encounter-registry.js` — encounter/spawn/behavior/drop contexts are structured fields, not posts. `shouldPromoteEncounterToPost`, `shouldPromoteSpawnToPost`, and `shouldPromoteDropToPost` remain false. No element taxonomy inference from item names. Loot-table/encounter UI deferred.

**P2-G.2 acceptance sweep:** Creature encounters, spawn contexts, drop contexts, behavior, and combat affinity accepted as registry/read/search/facet baseline only. No encounter posts, no loot UI, no SQL, no data migration.

---

## Missing Entry Queue

> **P0.5-C code baseline:** Derived/in-memory queue in [`js/unresolved-targets.js`](../../js/unresolved-targets.js) (`window.BoundLoreUnresolvedTargets`). Admin Overview shows a **read-only** table from published recipe/ relation data. Wood and Forge from QA Staff appear when admin session is available. No persistent table, no Promote/Merge/Dismiss actions yet.

> **P0.5-D safe start links:** Wood → `/wiki/create-post/?type=resource&name=Wood&source=missing-entry`; Forge → `/wiki/create-post/?type=station_type&name=Forge&source=missing-entry`. Links only open the create form prefilled — **no post is created on click**, no stub, no DB write. Promote/Merge/Dismiss remain disabled/planned.

Admin panel list (P0.5) showing unresolved targets sorted by promotion score.

| Column | Source |
|--------|--------|
| Display name | Normalized from mentions |
| Suggested domain/subtype | Inference rules |
| Mention count | Aggregated from recipes, relations, text |
| Inbound contexts | e.g. "ingredient in QA Staff of Fire" |
| Evidence max | Highest tier across mentions |
| Actions | Promote to stub · Merge into existing · Dismiss |

**Dismiss:** Suppresses re-surfacing for N days unless new independent mention arrives.

---

## Backlink Reconciliation

When an unresolved target is promoted or merged:

1. All recipe ingredients with matching normalized key → link to new entity
2. All relations with matching `target_entity_key` → rewrite to canonical key
3. Audit log entry: `{ action, old_key, new_key, affected_post_ids[] }`
4. No orphaned plain-text references after merge

Runs on admin approve of promotion or alias merge.

---

## Alias / Merge Rules

| Scenario | Rule |
|----------|------|
| Community name + official name | Official wins canonical title; community name → alias redirect |
| Two stubs same concept | Merge to higher evidence / more inbound relations |
| Alias collision | Moderator review; disambiguation page only if ≥3 distinct topics (OSRS pattern) |
| Promotion creates duplicate | Synonym warning at Quick-Add; queue suggests merge instead |

---

## Moderator Review

Required for:

- Promotion unresolved → stub (always)
- Capability/role facet with `confirmed` tier
- Classification changes (domain/subtype)
- Alias promotion to controlled synonym vocabulary
- Dismiss of high-score candidates (score ≥ 8)

Auto-allowed (P1):

- Corroboration bump on duplicate relation (same dedupe key, same value)

---

## No Blind Auto-Stubs (binding)

| Path | Auto-stub? |
|------|------------|
| Discovery wizard (non-contribution) | May create stubs today — **P0.5: align with promotion policy** |
| Contribution submit | **Never** |
| Recipe merge approve | **Never** |
| Relation enrich on render | **Never** |

Unresolved targets render as:

- Plain text with **Entry Needed** badge when score ≥ candidate threshold
- Plain text without badge when score < threshold (single mention)

---

## Acceptance References

See `qa/e2e-content-matrix.md`: T-PROMOTION-01, T-PROMOTION-02, T-CRAFT-01, T-NODE-01, T-DUPLICATE-01.
