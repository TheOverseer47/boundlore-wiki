# BoundLore Content Architecture Roadmap

Binding sequence from master blueprint v2.0. Each milestone ends with E2E cases from `qa/e2e-content-matrix.md`.

**P0 status:** ✅ Locally accepted — commit `635eb68` (Complete P0 acceptance sweep). Not pushed to origin.

---

## P0 — Before Launch (ACCEPTED)

### Scope (completed)

1. `entity_subtype` field in BLMETA + browse facets
2. Canonical relation types registry (`js/relations-registry.js`) integrated into merge/render paths
3. CRAFT relation family: `crafted_from`, `crafted_at`, `ingredient_of` (derived)
4. Resource Quick-Add with synonym duplicate warning
5. "Add Recipe" contribution intent (always review)
6. Recipe / Sources / Usage widgets on item and resource pages
7. `/wiki/resources/` landing page
8. Evidence-tier badge (reported vs confirmed minimum)
9. T3 slug namespaces reserved

### Acceptance

- T1, T2, T10, T11 from e2e-content-matrix pass (local sweep)
- No regression of Creature/Item/Biome/Contribution flows
- Wood/Forge correctly **not** auto-stubbed in QA Staff recipe
- Pending `add_recipe` conflict (Ember ×4) remains pending by design

### Known non-blocking items at P0 close

- `/wiki/browse/` patch-mode visibility issue (deferred to P0.5)
- Resource classification display shows generic Item labels (deferred to P0.5)
- Search: title/excerpt only (deferred to P0.5)
- Full Recipe browse/index (deferred to P1)

---

## P0.5 — Foundational Corrections (before push/deploy or P1)

**Goal:** Close structural gaps identified in Blueprint 2.0 audit. Small, reversible commits.

**Status (P0.5-G acceptance sweep):** **P0.5-A through P0.5-F complete** as a connected client-side foundation. Persistent backend structures (search index, unresolved_targets table, version backfill) remain **separate later scope**. **P1 does not start automatically.**

**Not in scope:** NPC/Quest/Event models, full versioning UX, semantic search, persistent search_documents, pg_trgm, embeddings.

### Sequence (binding order)

| # | Item | Type | Status |
|---|------|------|--------|
| 1 | Browse Patch-Mode Visibility Fix (P0.5-A) | UI fix | **Done** — `/wiki/browse/` renders |
| 2 | Resource Classification Display Fix (P0.5-A) | UI fix | **Done** — QA Ember Shard shows Resource |
| 3 | Unresolved Recipe Targets as Entry Needed (P0.5-A) | UI + data | **Done** — Wood/Forge Entry needed on Staff |
| 4 | Facet Baseline (P0.5-B) | Registry + display | **Done** — `js/facet-registry.js`; derived badges |
| 5 | Derived Missing Entry Queue (P0.5-C) | Admin read-only | **Done** — in-memory; Wood/Forge; no auto-stubs |
| 6 | station_type + Safe Promotion Path (P0.5-D) | Model + prefill | **Done** — safe create prefill only; no auto-promotion |
| 7 | Structured Search Signal Baseline (P0.5-E) | Client search | **Done** — client-side signals + missing-entry suggestions |
| 8 | Versioning Metadata Baseline (P0.5-F) | Code helpers | **Done** — tolerant/read-only; no history UI |
| 9 | Blueprint 2.0 Docs materialized | Docs | **Done** |
| 10 | P0.5-G Acceptance Sweep | QA + docs | **Done** — regression green on localhost:8080 |

### E2E archetypes (client baseline covered; full archetypes deferred to P1+)

T-SEARCH-01, T-SEARCH-02 covered by P0.5-E/G client search checks. T-MOUNT-01, T-PROMOTION-01, T-PROMOTION-02, T-STATION-01, T-CRAFT-01 remain **P1+** when promotion/persistence exists.

### Stop conditions

- Search index trigger breaks merge pipeline → switch to batch rebuild
- Facet registry exceeds 15 groups → design review before continuing

### Rollback

Each P0.5 item is an independent revertible commit.

---

## P1 — Content Expansion on Stable Base

**Goal:** Implement Blueprint 2.0 relation and contribution extensions.

### Scope

1. Relation Registry 2.0 implementation (qualifiers, proposed types)
2. Contribution intents: capability/role, alias, classification correction, version change, resolve unresolved
3. Facet filters on browse/landing pages
4. Query parser (compound intent: "items using X", "crafted at forge")
5. Profession model (SYSTEM/profession + crafted_by_profession)
6. Symmetric relation dedupe migration (hostile_to/allied_to single-write)
7. Mount modeling via facets (deprecate mount subtype for new entries)
8. Full Recipe browse/index

### E2E archetypes

T-RESOURCE-02, T-CRAFT-02, T-SEARCH-03, T-MOUNT-02, T-EVIDENCE-01, T-DUPLICATE-01, T-NPC-01

### Acceptance Criteria

- No new top-level domains
- Forward-only relation persistence enforced in merge engine
- Reported capability facets rank below confirmed in search

---

## P2 — Live-Service Depth

**Goal:** Broad content systems when game evidence exists.

### Scope

- NPC, Quest, Event, Economy, Combat depth, Lore workflows
- Player Bases (PLACE/player_base + COMMUNITY ownership)
- Versioning UX (Version History widget, historical search toggle)
- node_type registry for shared gather nodes
- Occurrence records for events
- Vendor inventory snapshots
- Platform/region/seed qualifiers (if game requires)

### E2E archetypes

T-CRAFT-03, T-VERSION-01, T-BOSS-01, T-NODE-01 (full), T3–T9 legacy P1 cases

### Trigger

Documented game evidence + community demand per feature.

---

## P3 — Long-Term

- Semantic / embedding search
- Large moderation tooling (dispute workflows, bulk reconcile)
- Automation (corroboration pipelines, index maintenance)
- API export for third-party tools

### E2E

T-UNKNOWN-01 (unknown system without new domain)

---

## Regression Suite (run after every P0.5/P1 change)

- [ ] Creature discovery → approve → detail page
- [ ] Item discovery → approve → detail page
- [ ] Biome discovery → approve → list
- [ ] Resource Quick-Add + Used In chain (T1)
- [ ] Recipe merge + conflict block (T2 / P0-D4)
- [ ] Drop / Behavior / Spawn contributions
- [ ] T3 slug protection (T11)
- [ ] No false stubs (Wood/Forge/Recipe posts)
- [ ] Pending add_recipe conflict stays pending (do not approve in regression)

---

## Commit Boundary Guidance

| Phase | Suggested commit granularity |
|-------|-------------------------------|
| P0.5 | One commit per roadmap item #1–8; docs commit separate (this materialization) |
| P1 | One relation family or one contribution intent per commit |
| P2 | One content domain (e.g. NPC) per PR |
