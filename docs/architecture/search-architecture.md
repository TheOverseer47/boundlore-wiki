# Search Architecture

**Version 2.0 — binding architecture**

BoundLore search must discover entities by meaning, not only by title match. This document supersedes [search-filter-matrix.md](./search-filter-matrix.md) as the authoritative search plan.

**Current code (P0):** `js/search.js` queried `posts.title` and `posts.excerpt` only via Supabase `ilike`.

**P0.5-E code baseline:** `js/search-signals.js` builds in-memory search documents from published post BLMETA (title, aliases, domain/subtype, facets, resource/recipe payload, relations) plus derived missing-entry suggestions (Wood, Forge). `js/search.js` ranks client-side over fetched published posts; `/wiki/search/?q=` provides full results page. **No** Postgres `search_documents` table, **no** FTS/pg_trgm, **no** embeddings, **no** compound-intent parser yet.

**P0.5-F addition:** When version metadata exists on facts/relations/recipes/facets, low-weight version signals (`game_version`, validity range, superseded/historical) are indexed client-side. No ranking change when version fields are absent.

**P1-D.1 code baseline:** `js/facet-browse.js` — client-side facet URL filters for Resources/Browse landing pages (`?acquisition_method=mining`, `?facet=group:value`, etc.). Uses `BoundLoreFacetRegistry` signals; **no** Postgres search index, **no** FTS/pg_trgm, **no** query parser, **no** SQL migration.

**P1-D.2 acceptance sweep:** P1-D.2 acceptance sweep completed; client-side facet filters only; no SQL, query parser, or search index. P1-D foundation block accepted locally.

**P1-E.1 code baseline:** `js/search-query-parser.js` — structured query hints (facets, usage/crafting/relation intents) for client-side search ranking boosts. **No** Postgres search index, **no** FTS/pg_trgm, **no** embeddings, **no** SQL. Parser produces hints only; existing search signals remain source-of-truth.

**P1-E.2 acceptance sweep:** P1-E.2 acceptance sweep completed; client-side query parser hints only; no SQL/backend search/search index. P1-E foundation block (E.1 + E.2) accepted locally.

**P1-F.1 code baseline:** `js/profession-capability-registry.js` — future-safe profession/role/capability/requirement typing and low-weight defensive search signals. **No** profession UI, **no** new top-level domain, **no** SQL. Mounts remain BEING + role/capability; professions map to SYSTEM/profession_type when implemented.

**P1-F.2 acceptance sweep:** P1-F.2 acceptance sweep completed; model registry only; no profession UI, no SQL, no data migration. P1-F foundation block (F.1 + F.2) accepted locally.

**P1-H.1 final foundation gate:** P1 registries and reader/search tolerances accepted as client-side foundation. No SQL, no backend search, no data migration, no deploy. P2 may start from this baseline.

**P2-A.1 code baseline:** `js/content-model-registry.js` — NPC (BEING/npc), Quest (KNOWLEDGE/quest), Event (EVENT/event) model definitions with future-safe field normalization and low-weight search signals. **No** create UI, **no** admin flows, **no** Postgres search index, **no** SQL migration.

**P2-A.2 acceptance sweep:** P2-A.2 acceptance sweep completed; NPC/Quest/Event models accepted as registry/read/search baseline only. No create UI, no admin flow, no SQL, no data migration. P2-A foundation block accepted locally.

**P2-B.1 code baseline:** `js/quest-event-registry.js` — quest objectives/rewards, event occurrences/schedules, NPC service roles. Structured fields only; **no** posts by default, **no** create UI, **no** SQL. Low-weight search/parser hints only.

**P2-B.2 acceptance sweep:** P2-B.2 acceptance sweep completed; Quest objectives, rewards, event occurrences, and NPC services accepted as registry/read/search baseline only. No create UI, no admin flow, no SQL, no data migration. P2-B foundation block accepted locally.

**P2-C.1 code baseline:** `js/economy-registry.js` — trade offers, price/currency/availability/stock normalization, vendor inventory context. Structured fields only; **no** shop UI, **no** posts by default, **no** SQL. `sold_by` remains reserved.

**P2-C.2 acceptance sweep:** P2-C.2 acceptance sweep completed; Vendor/economy/trade offers accepted as registry/read/search baseline only. No shop UI, no admin flow, no SQL, no data migration. P2-C foundation block accepted locally.

**P2-D.1 version baseline:** `js/versioning-model.js` extended with validity/history gates. Parser hints: version, patch, outdated, changed/removed/introduced in, superseded, historical — hint-only, low-weight. No hard filters. Outdated/superseded not ranked above current. No version UI when fields absent.

**P2-D.2 acceptance sweep:** P2-D foundation block accepted locally. Read-only helper/search/admin-preview baseline only; no patch workflow, no SQL, no data migration.

**P2-E.1 resource node baseline:** `js/resource-node-registry.js` — node_type/acquisition helpers. Parser hints for resource node/mining node/red crystal nodes (source_detail). No crystal taxonomy inference. Low-weight signals only.

**P2-E.2 acceptance sweep:** P2-E foundation block accepted locally. No node posts, no PLACE promotion, no SQL, no data migration.

**P2-F.1 observation context baseline:** `js/observation-context-registry.js` — low-weight `observation_context`, `location_context`, `condition_context` signals. Parser hints for coordinates/location/found near/biome/weather/time/spawn location (hint-only, no hard filters). Existing mining/wood/forge/red crystal/resource node queries unchanged.

**P2-F.2 acceptance sweep:** P2-F foundation block accepted locally. No PLACE promotion, no observation posts, no SQL, no data migration.

**P2-G.1 creature encounter baseline:** `js/creature-encounter-registry.js` — low-weight `creature_encounter`, `spawn_context`, `drop_context`, `combat_affinity` signals. Parser hints for spawn/drop/encounter/behavior/weakness/resistance (hint-only). No fire taxonomy from item names. Existing QA Ogre/Staff/mining/wood/forge queries unchanged.

**P2-G.2 acceptance sweep:** P2-G foundation block accepted locally. No encounter posts, no loot UI, no SQL, no data migration.

**P2-H.1 requirement/unlock baseline:** `js/requirement-unlock-registry.js` — low-weight `requirement_context`, `unlock_context`, `progression_context`, `access_context` signals. Parser hints for required level/profession/faction/reputation/prerequisite/unlock/vendor access/station tier/weather-time (hint-only). No hard filters. No inference from item/quest names. Existing QA Ogre/Staff/mining/wood/forge queries unchanged.

**P2-H.2 acceptance sweep:** P2-H foundation block accepted locally. No requirement/unlock posts, no progression UI, no SQL, no data migration.

**P2-I.1 integration gate:** P2-A through P2-H accepted as registry/read/search/facet foundations only. No productive UI, backend search/index, SQL, or deploy. See `current-code-gap-notes.md` §43.

**P2-I.2 final acceptance:** P2 Foundation locally complete (P2-A … P2-I.1). Ready as base for P3 UI activation. Not deployed; boundlore.com untouched. See `current-code-gap-notes.md` §44.

**P3-A.1 context renderer:** `js/context-section-renderer.js` — read-only explicit-only P2 sections on detail pages. No search/admin/create changes.

**P3-A.2 acceptance sweep:** Context renderer accepted locally. Search baseline unchanged; no backend search/index activation.

**P3-B.1 fixture harness:** QA-only synthetic fixtures; not linked from search/navigation; no index changes.

**P3-B.2 acceptance sweep:** Fixture harness accepted locally. Search baseline unchanged; no backend search/index activation.

**P3-C.1 preview adapter:** Localhost query-param preview only; no search/index changes.

**P3-C.2 acceptance sweep:** Preview adapter accepted locally. Search baseline unchanged; preview not indexed.

**P3-D.1 preview matrix:** QA-only localhost preview URL catalog; no search/index changes.

**P3-D.2 acceptance sweep:** Preview matrix accepted locally. Search baseline unchanged; preview not indexed.

**P3-E.1 production guard:** Preview hostname guard helpers; no search/index changes; preview not indexed.

**P3-E.2 acceptance sweep:** Production guard accepted locally. Search baseline unchanged; preview not indexed.

**P3-F.1 integration gate:** P3 preview layer integrated locally. No search/index changes; preview not indexed.

**P3-F.2 final acceptance:** P3 preview layer accepted end-to-end locally. Search baseline unchanged; preview not indexed.

**P3-G.1 planning gate:** P3-H data-contract plan does not activate search/index. Backend P2 field search remains future work.

**P3-H.1 data contract baseline:** `js/context-data-contract.js` read-only normalizes explicit context fields on detail pages only. No search index, no backend field search, no query parser changes. Preview remains localhost-gated and not indexed.

**P3-H.2 acceptance sweep:** Data contract accepted locally. Search baseline unchanged; no index activation; preview not indexed.

**P3-I.1 sample data gate:** Local QA-only sample entries; no search/index changes; sample entries not indexed.

**P3-I.2 acceptance sweep:** Sample data gate accepted locally. Search baseline unchanged; no index activation.

**P3-J.1 planning gate:** Real-data read-only probe (P3-K.1) is not a search-index gate. No backend field search or index activation until separate search gate.

**P3-K.1:** Real entry contract probe renders diagnostics only; not a search index or backend search activation.

**P3-L.1:** P3 read-only context layer integration confirms P3 is not a search-index gate; backend/index activation remains blocked.

**P4-A.1 planning gate:** Structured field authoring is not search indexing. Search/facet activation for P3/P4 fields requires a separate gate. No index backfills together with write-flow start.

**P4-B.1 validation baseline:** Schema validation is not search indexing. `no_search_index` policy enforced; no backend field search or index activation.

**P4-B.2 acceptance sweep:** Schema validation baseline accepted locally. Search/index activation remains blocked.

**P4-C.1 planning gate:** Admin Inspector is not a search index. Validation and inspection reports are display-only and must not be indexed. Search/facet activation for structured fields remains a separate gate.

**P4-C.2 acceptance sweep:** Admin Inspector planning accepted locally. Search/index activation remains blocked.

**P4-C.3 inspector baseline:** Inspector reports are display-only; `shouldUpdateSearchIndex` always false. No index activation.

---

## Goals

1. Find entities by aliases, taxonomy, facets, roles, and capabilities
2. Answer relation-shaped queries ("items using Ember Shard", "crafted at forge")
3. Rank by evidence tier without hiding reported results
4. Recover gracefully when no entity exists but unresolved mentions do

---

## Index Signals

Each published entity (and optionally unresolved targets) materializes a **search document**:

| Signal | Source | Index weight |
|--------|--------|--------------|
| `title` | Post title | Highest (exact match boost) |
| `aliases` | `entity_profile.slug_aliases`, alias table | High |
| `synonyms` | Controlled vocabulary expansion | Medium (query-side) |
| `domain` | `entity_domain` | Filter + facet |
| `subtype` | `entity_subtype` | Filter + facet |
| `taxonomy` | Facet group `taxonomy` | High |
| `facets` | All facet groups | High |
| `roles` | Facet group `role` | High |
| `capabilities` | Facet group `capability` | High |
| `relations` | Outbound relation targets (names, types) | Medium |
| `inbound context` | Derived inverse labels ("used in crafting") | Medium |
| `structured facts` | `discovery_payload`, source_detail, rarity | Medium |
| `evidence tier (max)` | Highest tier on entity/facets | Ranking multiplier |
| `status` | stub / provisional / canonical / deprecated | Ranking + filter |
| `unresolved mentions` | Missing Entry Queue entries | Recovery suggestions only |

**Storage (proposed P0.5):** Postgres table `search_documents` or RPC-built view; `tsvector` + `pg_trgm` for fuzzy. Rebuild-from-posts fallback if index drifts.

---

## Query Processing

### 1. Normalization

- Lowercase, trim, collapse whitespace
- Singular/plural via FTS stemming
- Spelling tolerance via trigram (threshold configurable)

### 2. Alias resolution

- Exact alias match → canonical entity boost
- Community alias (moderated) → same as alias

### 3. Controlled synonyms

| User term | Expands to |
|-----------|------------|
| mount | role:mount, capability:rideable |
| rideable | capability:rideable |
| flying mount | capability:flyable + role:mount |
| mineable | acquisition_method:mining |
| gatherable | context-dependent acquisition methods |

Synonym registry lives alongside facet registry (moderator-curated).

### 4. Compound-intent parsing (P1)

| Pattern | Interpretation |
|---------|----------------|
| `<X> mount` | taxonomy or title contains X + mount expansion |
| `items using <X>` | inbound `ingredient_of` / `crafted_from` on X |
| `crafted at <X>` | inbound `crafted_at` on station X |
| `resources in <Biome>` | `found_in` or habitat facet → biome |
| `<creature> dropping <item>` | `drops` relation filter |

P0.5 baseline: title + alias + subtype + facet term match without full parser.

---

## Mandatory Query Scenarios

| Query | Expected result | Required signals |
|-------|-----------------|------------------|
| dragon mount | Creature with taxonomy dragon + mount/rideable | taxonomy, role, capability, synonyms |
| flying mount | Entities with flyable + mount/rideable | capability, role |
| mineable fire resource | Resource with mining + fire element | acquisition_method, element, subtype |
| Ember Shard | Exact title/alias | title |
| red crystal node | Ember Shard (via source_detail) | structured facts |
| items using Ember Shard | QA Staff of Fire | inbound ingredient_of |
| item crafted at forge | Items with crafted_at → Forge | inbound crafted_at |
| resources in Swamp | Resources with found_in Swamp | relation or habitat |

---

## Ranking Principles

Applied in order (each step may re-rank):

1. **Exact canonical title match** — boost ×3
2. **Exact alias match** — boost ×2.5
3. **Prefix title/alias** — boost ×1.5
4. **Facet combination** — all parsed facet hints match → boost ×2
5. **Taxonomy path match** — boost ×1.5
6. **Relation signal match** — boost ×1.3
7. **Full-text on description/facts** — baseline ×1
8. **Evidence-aware multiplier** — confirmed 1.0, observed 0.9, reported 0.7, speculative 0.4
9. **Status multiplier** — canonical 1.0, provisional 0.95, stub 0.85; deprecated/historical excluded unless toggle

Reported results **remain visible** with evidence badge — never hidden.

---

## No-Result Recovery

When zero entity matches:

1. **Fuzzy suggestions** — trigram close matches on title/alias
2. **Unresolved target suggestions** — "Wood is mentioned in 3 recipes but has no entry yet"
3. **Missing entry CTA** — link to Resolve Unresolved / Quick-Add with prefilled name
4. **Facet browse fallback** — "Browse rideable creatures" saved query link

---

## Search Result Explanations

Each result may show a short reason (P1 UI):

- "Matched alias: Ember Shard"
- "Matched capability: rideable"
- "Used as ingredient in QA Staff of Fire"

---

## Browse Integration

Saved facet queries power browse pages without new categories:

- `/wiki/creatures/?capability=rideable`
- `/wiki/resources/?acquisition_method=mining&element=fire`

See [search-filter-matrix.md](./search-filter-matrix.md) for legacy category filter notes (deprecated for new work).

---

## P0.5 Scope

1. `search_documents` table/RPC (title, aliases, domain, subtype, facets when present)
2. Replace direct `posts.title ilike` in `js/search.js` with index query
3. Controlled synonym file for mount/mining terms
4. Unresolved target suggestions from Missing Entry Queue

**Not in P0.5:** Full compound-intent parser, relation-target facet joins, semantic/embedding search (P3).

---

## Acceptance References

`qa/e2e-content-matrix.md`: T-SEARCH-01, T-SEARCH-02, T-SEARCH-03.
