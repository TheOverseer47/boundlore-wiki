# BoundLore Content Architecture & Feature Coverage

**Version 2.0 — Master Blueprint (binding for implementation)**

This document is the authoritative architecture plan for scaling BoundLore to MMO-scale content ontology, search semantics, entity promotion, and live-service versioning.

**Supersedes:** Version 1.0 sections on roadmap scope and search; P0 decisions remain valid.

**Related artifacts:** See sibling files in `docs/architecture/` for registries, policies, matrices, schemas, and code-gap notes.

---

## Source of Truth Hierarchy

1. **This file** — domain model, core decisions, roadmap summary
2. **[facet-registry.md](./facet-registry.md)** — controlled facet vocabulary
3. **[entity-promotion-policy.md](./entity-promotion-policy.md)** — unresolved target lifecycle
4. **[search-architecture.md](./search-architecture.md)** — search and discoverability (replaces search-filter-matrix for new work)
5. **[versioning-model.md](./versioning-model.md)** — versioned statements
6. **[graph-relations-spec.md](./graph-relations-spec.md)** — relation types and qualifiers
7. **Implementation registry:** `js/relations-registry.js` (must match docs; code lag = bug)

---

## 1. Executive Summary

BoundLore has completed **P0 local acceptance** (commit `635eb68` — Complete P0 acceptance sweep). The validated core remains:

- Discovery → Entity → Relations
- Contribution merge with conflict handling
- Resource Quick-Add, Recipe intent, Used In widget, Resources landing
- Evidence-tier badges, T3 slug protection
- No blind stubs for Wood/Forge in QA Staff recipe (correct P0 behavior)

**Blueprint 2.0** extends P0 with foundational corrections (**P0.5**) and evidence-driven expansion (**P1/P2/P3**). It does **not** invalidate P0 work.

### What changes in 2.0

| Area | P0 (done) | Blueprint 2.0 addition |
|------|-----------|------------------------|
| Domain/Subtype | 8 domains, single subtype | **Unchanged** — remains identity base |
| Multi-role (Mount, Boss, Vendor) | Subtype overload risk | **Facet layer:** roles, capabilities, taxonomy |
| Unresolved targets (Wood, Forge) | Plain text in recipes | **Promotion lifecycle** + Missing Entry Queue |
| Search | title + excerpt only | **Structured index:** facets, aliases, relations |
| Stations | crafted_at string | **station_type** entity (SYSTEM subtype) |
| Versioning | overwrite on merge | **Versioned statements** with superseded history |
| Top-level domains | 8 | **No new domains** — scale via subtypes, facets, relations |

### Core decisions (retained + extended)

| # | Decision |
|---|----------|
| 1 | **8 Entity Domains** — PLACE, BEING, OBJECT, SYSTEM, KNOWLEDGE, EVENT, COMMUNITY, META. No ninth domain. |
| 2 | **Single primary Subtype** — exclusive; multi-role via **Facets** and **Relations** |
| 3 | **Progressive Disclosure** — Quick-Add → Wizard → Add-Info contributions |
| 4 | **Evidence Tiering** — confirmed, observed, reported, speculative on facts, relations, and capability facets |
| 5 | **Controlled Relations** — canonical types in registry; **forward persisted, inverses derived** |
| 6 | **Recipes** — embedded on target item, not own pages; `ingredient_of` derived |
| 7 | **No blind auto-stubs** — unresolved targets tracked; promotion via Missing Entry Queue |
| 8 | **Speculative systems** — taxonomy slots + reserved relation types; no specialized forms before evidence |

---

## 2. Methodology and Assumptions

### Methodology

1. Extend the validated post + BLMETA core toward normalized graph tables (`wiki_entities`, `wiki_entity_relations`) via dual-write.
2. Model depth follows evidence tier (Section 3).
3. Derive patterns from reference wikis (GW2, OSRS, Minecraft, NMS, Wikidata) — structure, not copy.
4. Every architecturally considered concept has: modeling location, identity rule, page-worthiness rule, relation/facet rule, search path, contribution path, moderation path, evidence rule, versioning rule, acceptance test.

### Light No Fire scope tiers

| Tier | Meaning | Wiki treatment |
|------|---------|----------------|
| **A — Confirmed** | Official Steam/press/trailer statements | Full modeling allowed |
| **B — Observed** | Visible in trailers/screenshots | observed tier minimum |
| **C — Likely** | Genre-plausible, not confirmed | reported/speculative; reserved slots |
| **D — Speculative** | No evidence | Registry reserved only; no UI promotion |

Never present Tier C/D as confirmed game facts.

### Archetype vs. Instance (retained)

- **Archetype entities** — canonical wiki pages (species, resources, station types, biomes)
- **Instance observations** — coordinates, one-off spawns, procedural nodes → observations, not pages
- **Exception:** Named uniques, player bases (opt-in), settlements with community identity

---

## 3. Evidence Coverage Tiers

| Tier | Meaning | Modeling depth |
|------|---------|----------------|
| **T1 Confirmed** | Official sources | Full specialization + capability facets |
| **T2 Likely** | Genre-typical, strongly expected | Subtype + facets + core relations |
| **T3 Speculative** | Possible, unconfirmed | Taxonomy slot + slug namespace + generic facts only |

**Promotion rule:** T3 → T2 → T1 only via documented evidence or admin Taxonomy Promotion — never automatic.

Capability facets (rideable, tameable) require explicit evidence tier per value. See [facet-registry.md](./facet-registry.md).

---

## 4. Eight Entity Domains (unchanged)

```text
1. PLACE      — spatially locatable
2. BEING      — living/acting
3. OBJECT     — ownable/craftable/usable
4. SYSTEM     — game mechanics (skills, stations, recipes-as-facts)
5. KNOWLEDGE  — lore, books, quests (T3 until evidence)
6. EVENT      — time-bound occurrences
7. COMMUNITY  — player organizations, bases
8. META       — wiki-internal
```

### Subtypes (canonical `entity_subtype` values)

P0 subtypes remain valid. **2.0 additions** marked ★:

| Domain | Subtypes | Tier |
|--------|----------|------|
| PLACE | biome, region, landmark, location_hint, dungeon, ruin, cave, temple, settlement, waterbody, ★structure, ★player_base | T1/T2 |
| BEING | creature, boss, elite, npc, mount, wildlife, ★species | T1/T2 |
| OBJECT | item_generic, weapon, armor, tool, resource, consumable, building_part, vehicle_boat, artifact, ★material_refined, ★component | T1/T2 |
| SYSTEM | recipe, crafting_station, skill, ability, status_effect, damage_type, class_archetype, talent_node, ★station_type, ★profession, ★gathering_method | T2/T3 |
| KNOWLEDGE | lore_book, inscription, history_entry, legend, ★rumor | T2 |
| EVENT | world_event, seasonal_event, patch_note, ★event_archetype | T3 |
| COMMUNITY | guild, player_base, server_meta | T3 |
| META | guide, news, contribution, discovery_report, ★game_version, ★source_record | exists |

**Mount subtype note (2.0 change):** `mount` as BEING subtype is **deprecated for new entries**. Use `creature` + role/capability facets. Existing mount subtype entries migrate at P1.

Full entity-relation modeling: [entity-relation-matrix.md](./entity-relation-matrix.md).

---

## 5. Facet Layer (new in 2.0)

Facets are the **scaling layer** for multi-valued classification without subtype explosion.

| Layer | Cardinality | Purpose |
|-------|-------------|---------|
| `entity_domain` | 1 | Top-level bucket |
| `entity_subtype` | 1 | Primary kind |
| `taxonomy` | multi | Hierarchical class path |
| `facets.*` | multi (per group) | Roles, capabilities, acquisition, etc. |
| `relations` | multi | Entity-to-entity typed edges |

Full registry: [facet-registry.md](./facet-registry.md).

**Dragon Mount rule:** One BEING/creature page; taxonomy `dragon`; role `mount`; capabilities `rideable`, `flyable`. No second Mount page.

---

## 6. Relationship Families

Six families in P0; extended in 2.0. Registry: `js/relations-registry.js`. Full spec: [graph-relations-spec.md](./graph-relations-spec.md).

| Family | P0 types | 2.0 proposed (reserved) |
|--------|----------|-------------------------|
| **SPATIAL** | found_in, located_in, spawns_at | — |
| **DROP/YIELD** | drops, harvested_from, contains_loot | gathered_via |
| **CRAFT** | crafted_from, crafted_at, ingredient_of, unlocks | crafted_by_profession |
| **COMBAT/SYSTEM** | weak_to, resistant_to, inflicts, requires, grants | — |
| **SOCIAL/LORE** | member_of, hostile_to, allied_to, mentions, gives_quest | — |
| **TAXONOMIC** | variant_of, part_of, related_to | — |
| **ECONOMY** | — | sold_by, reward_of |
| **MOUNT/TAME** | — | mountable_by, tamed_via |
| **EVENT** | — | occurs_during |
| **VERSION** | — | introduced_in, changed_in, removed_in |
| **OBSERVATION** | — | observed_as |

**Binding rule:** Persist forward relations only. Inverses (`ingredient_of`, `dropped_by`, `sold_by`, `station_for`) are **derived** at render/index time.

---

## 7. Entity Promotion (new in 2.0)

Lifecycle: `mentioned → unresolved → candidate → stub → provisional → canonical → merged_alias / deprecated / historical`

Policy: [entity-promotion-policy.md](./entity-promotion-policy.md).

**P0 exemplars:**

- **Wood** — unresolved (1 recipe mention); Missing Entry Queue candidate at P0.5
- **Forge** — unresolved; should promote to SYSTEM/station_type stub at P0.5
- **red crystal nodes** — source_detail on resource; never a location page

---

## 8. Search and Discoverability (new in 2.0)

Search must index title, aliases, synonyms, domain, subtype, taxonomy, facets, relations, inbound context, structured facts, and unresolved mentions.

Full plan: [search-architecture.md](./search-architecture.md).

P0 gap: `js/search.js` uses title/excerpt only — **P0.5 Search Baseline** required before P1 content expansion.

---

## 9. Versioning (new in 2.0)

Facts, relations, and recipes must support `valid_from`, `valid_until`, `superseded_by`, nullable `game_version`.

Full plan: [versioning-model.md](./versioning-model.md).

Pre-release: fields nullable; no overwrite of historical values once versioning merge behavior ships (P2).

---

## 10. Controlled Vocabularies

| Vocabulary | Values |
|------------|--------|
| evidence_tier | confirmed, observed, reported, speculative |
| confidence | single_observation, corroborated, verified |
| rarity | common, uncommon, rare, epic, legendary, unique, unknown |
| record_status | mentioned, unresolved, stub, provisional, canonical, merged_alias, deprecated, historical |
| completeness | stub, needs_details, solid, comprehensive |

Facet vocabularies: [facet-registry.md](./facet-registry.md).

---

## 11. Key Non-Entity Decisions (updated)

| Topic | Decision | Notes |
|-------|----------|-------|
| Recipes | Facts on target item | Retained |
| ingredient_of | Derived inverse | Retained |
| Weather/Time | Conditions/qualifiers | Retained |
| Mounts | creature + role/capability facets | **Changed** from mount subtype default |
| Coordinates | Observation property | Retained |
| Station (Forge) | SYSTEM/station_type entity | **New** |
| Source nodes | Observation property on resource | Retained |
| Status effects / damage types | Admin registry, seitenlos until needed | Retained |

---

## 12. Progressive Disclosure Model (retained)

| Stage | What | When |
|-------|------|------|
| **Quick-Add** | Name, domain/subtype, where, optional screenshot | Always first |
| **Wizard** | Subtype-specific core fields | After Quick-Add |
| **Add-Info Contributions** | Field-specific additions | Anytime |

New intents (P1): Add Capability/Role, Correct Classification, Resolve Unresolved Target, Add Version Change. See [contribution-intent-matrix.md](./contribution-intent-matrix.md).

---

## 13. Matrices

| Matrix | File |
|--------|------|
| Entity–Relation | [entity-relation-matrix.md](./entity-relation-matrix.md) |
| Facets | [facet-registry.md](./facet-registry.md) |
| Promotion | [entity-promotion-policy.md](./entity-promotion-policy.md) |
| Search | [search-architecture.md](./search-architecture.md) |
| Versioning | [versioning-model.md](./versioning-model.md) |
| Discovery forms | [discovery-form-matrix.md](./discovery-form-matrix.md) |
| Contribution intents | [contribution-intent-matrix.md](./contribution-intent-matrix.md) |
| Detail pages | [detail-page-matrix.md](./detail-page-matrix.md) |
| Search/filter (legacy) | [search-filter-matrix.md](./search-filter-matrix.md) |
| Moderation / conflict | [moderation-conflict-matrix.md](./moderation-conflict-matrix.md) |
| E2E tests | [../../qa/e2e-content-matrix.md](../../qa/e2e-content-matrix.md) |
| Code gaps | [current-code-gap-notes.md](./current-code-gap-notes.md) |

---

## 14. Gap Analysis (post-P0 / Blueprint 2.0)

| Area | P0 status | 2.0 gap | Priority |
|------|-----------|---------|----------|
| Registry / CRAFT / Resources / Recipe | ✅ | — | — |
| Facet layer | ❌ | Multi-role unmodelled | P0.5 |
| Unresolved lifecycle | ❌ | Wood/Forge invisible gaps | P0.5 |
| Search | ⚠️ title only | Structured discovery | P0.5 baseline |
| station_type | ❌ | Forge unresolved | P0.5 |
| Classification display | ⚠️ | Resource shows generic Item labels | P0.5 |
| Versioning | ❌ | Overwrite risk at launch | P0.5 schema / P2 UX |
| Browse patch-mode | ⚠️ | Hidden content | P0.5 |
| NPC/Quest/Event/Economy | ❌ | Reserved | P2 |

Details: [current-code-gap-notes.md](./current-code-gap-notes.md) § Post-P0 Blueprint 2.0 Findings.

---

## 15. Roadmap Summary

See [roadmap.md](./roadmap.md).

- **P0:** ✅ Locally accepted (`635eb68`)
- **P0.5:** Foundational corrections before push/deploy or P1
- **P1:** Relation Registry 2.0 implementation, contribution intents, facet filters, query parser
- **P2:** NPC/Quest/Event/Economy/Combat/Lore/Player Bases, versioning UX
- **P3:** Semantic search, moderation automation, large-scale tooling

---

## 16. Reference Patterns (benchmark-derived)

| Pattern | Source | BoundLore use |
|---------|--------|---------------|
| Acquisition / Used In sections | GW2 Wiki | Derived inbound widgets |
| Granularity + switch infobox | OSRS Wiki | Variants on one page |
| History section for old values | Minecraft Wiki | Version History widget |
| Discoverer + last_surveyed | NMS Wiki | Observation provenance |
| Statement ranks + qualifiers | Wikidata | Versioned facts, conflict coexistence |
| Related tabs + patch-stamped comments | Wowhead | Relation-aware browse (adapted) |

---

## 17. Deliverables for Implementation Team

| Artifact | Location |
|----------|----------|
| Master plan | This file (v2.0) |
| Facet registry | facet-registry.md |
| Promotion policy | entity-promotion-policy.md |
| Search architecture | search-architecture.md |
| Versioning model | versioning-model.md |
| Graph spec v2 | graph-relations-spec.md |
| Relations registry | js/relations-registry.js |
| E2E matrix | qa/e2e-content-matrix.md |
| Roadmap | roadmap.md |

**Workflow:** Each roadmap item = one implementation task referencing this doc + relevant matrix + E2E archetype tests. **Docs-only commits** (like Blueprint 2.0 materialization) do not require E2E pass until implementation begins.

---

## 18. Risks and Open Questions

| # | Risk / Question | Mitigation |
|---|-----------------|------------|
| R1 | LNF differs from assumptions | Tier system + reserved registries |
| R2 | BLMETA-in-HTML scale | Dual-write to wiki_entities; index table for search |
| R3 | Facet registry sprawl | Max 15 groups before design review |
| R4 | Missing Entry Queue spam | Score thresholds + dismiss |
| R5 | Search index drift | Rebuild-from-posts fallback |
| R6 | Pre-release version noise | game_version nullable until launch |
| R7 | Player species (rabbit/fox) — playable or NPC? | taxonomy only until confirmed |

---

## 19. UX and Knowledge Graph Standards (retained)

- **Progressive Disclosure:** Never require unknown fields on first sighting
- **Property graph:** Entities = nodes; Relations = typed edges with qualifiers; Observations = provenance events
- **Provenance:** Every fact traceable to source_post_id and evidence_tier
- **Empty states:** Hide empty widgets; single Missing Information CTA block
- **Unresolved visibility:** Entry Needed badges when promotion score met
