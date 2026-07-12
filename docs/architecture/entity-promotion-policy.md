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

**P2-H.1:** `js/requirement-unlock-registry.js` — requirements/unlocks/progression are structured fields/qualifiers, not posts. `shouldPromoteRequirementToPost` and `shouldPromoteUnlockToPost` remain false. Faction remains string/ref (no new top-level domain). Level/profession-level are values, not entities. Skilltree/progression/unlock UI deferred.

**P2-H.2 acceptance sweep:** Requirements, unlocks, progression contexts, and access states accepted as registry/read/search/facet baseline only. No unlock UI, no progression posts, no SQL, no data migration.

**P2-I.2 final acceptance:** P2 Foundation locally complete (P2-A … P2-I.1). All promotion guards remain false. P3 UI activation requires separate launch gate before deploy.

**P3-A.1 context renderer:** Read-only detail-page sections; explicit fields only; `shouldPromoteContextToPost` false; no automatic promotion.

**P3-A.2 acceptance sweep:** Context renderer accepted locally as read-only/explicit-only detail-page baseline. No promotion, no inference, no admin/create/edit links. QA pages unchanged without explicit P2 fields.

**P3-B.1 fixture harness:** `qa/p3-context-renderer-fixtures.html` — synthetic explicit-only objects; not in navigation; no posts or data writes.

**P3-B.2 acceptance sweep:** Fixture harness accepted locally. No promotion, no inference, no production navigation links. QA baseline pages unchanged.

**P3-C.1 preview adapter:** `?p3_context_preview=` on localhost post pages only; ephemeral read-only overlay; no post promotion or data writes.

**P3-C.2 acceptance sweep:** Preview adapter accepted locally. localhost + query-param only; no promotion, no inference, no production activation.

**P3-D.1 preview matrix:** `qa/p3-detail-preview-matrix.html` — QA-only link catalog for all preview modes × QA detail pages; not in navigation.

**P3-D.2 acceptance sweep:** Preview matrix accepted locally. QA-only; local detail-page links only; no promotion, no inference, no production activation.

**P3-E.1 production guard:** Preview allowed only on exact `localhost` + valid `p3_context_preview` mode. `127.0.0.1` and boundlore.com hosts blocked. QA guard page under `/qa/`.

**P3-E.2 acceptance sweep:** Production guard accepted locally. Preview remains localhost + query-param only; no promotion, no inference, no production activation.

**P3-F.1 integration gate:** P3-A through P3-E integrated locally. Preview layer read-only, explicit-only, synthetic, localhost-gated, production-guarded. Launch gate required before deploy.

**P3-F.2 final acceptance:** P3 preview layer accepted end-to-end locally. No promotion, no inference, no production activation. boundlore.com untouched.

**P3-G.1 planning gate:** Real read-only data binding remains future work (P3-H.1). Explicit fields only; no promotion from source_detail, coordinates, names, or requirements. Launch gate required before deploy.

**P3-H.1 data contract baseline:** `js/context-data-contract.js` normalizes explicit root/meta/discovery_payload/structured_context fields read-only into detail-page context entry shape. No writes, no posts, no promotion, no inference. Preview layer remains localhost-gated. P3-H.2 acceptance sweep follows.

**P3-H.2 acceptance sweep:** Read-only context data contract accepted locally. Explicit fields only from root/meta/discovery_payload/structured_context; source_detail/name-only negatives stay empty; no entry mutation, no writes, no posts, no promotion/inference. Next: P3-I planning gate or controlled local read-only sample data gate.

**P3-I.1 sample data gate:** `qa/p3-readonly-sample-data.html` — QA-only local sample entries prove explicit contract fields render via DataContract → Renderer pipeline. No posts, no writes, no promotion. `_derived` entries skip root extraction. P3-I.2 acceptance sweep follows.

**P3-I.2 acceptance sweep:** Local read-only sample data gate accepted. Positive samples render via real pipeline; negatives and derived-only stay empty. Next: P3-J planning gate or controlled real-data read-only gate.

**P3-J.1 planning gate:** Real-data binding must not trigger promotion, inference, or entity creation. Explicit contract fields only; enriched/derived fields excluded. LAUNCH-0 required before any push/deploy.

**P3-K.1:** Real entry contract probe is read-only inspection only; no promotion or inference from loaded entries.

**P3-L.1:** P3 read-only context layer integration confirms no P3 component may trigger promotion, inference, or entity creation.

**P4-A.1 planning gate:** Authoring structured fields must not trigger automatic promotion. Resource Node, Observation, Requirement, Economy, and Quest fields must not auto-create posts. Promotion remains a separate explicit lifecycle/moderation step.

**P4-B.1 validation baseline:** `shouldPromoteFromValidatedData` and `shouldCreatePostFromField` always return `false`. Negative rules block source_detail-only, title-inferred weakness, and coordinate-based PLACE promotion.

**P4-B.2 acceptance sweep:** Schema validation baseline accepted locally. All promotion/post policy functions remain false; no production integration.

**P4-C.1 planning gate:** Admin Inspector must not trigger or suggest promotion. Inspector may make structured fields visible for diagnosis only; no entity lifecycle transition, no stub creation, no PLACE/resource/creature inference from displayed validation output.

**P4-C.2 acceptance sweep:** Admin Inspector planning accepted locally. No promotion paths activated.

**P4-C.3 inspector baseline:** Inspector renders validation only; `shouldPromoteEntity` and `shouldCreatePost` always false. No promotion from inspector output.

**P4-C.4 acceptance sweep:** Admin Inspector baseline accepted locally. All promotion/post policy functions remain false; no production admin integration.

**P4-D.1 draft flow planning:** Structured contribution drafts must not trigger promotion or auto-create missing entries. Wood/Forge remain missing-entry queue items until a separate promotion gate. Drafts may propose explicit structured fields only; no entity lifecycle transition from draft validation alone.

**P4-E.1 draft contract baseline:** `shouldPromoteFromDraft` and `shouldCreateMissingEntryFromDraft` always false. Draft validation does not promote entities or create Wood/Forge posts.

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
