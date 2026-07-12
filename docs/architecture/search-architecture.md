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
