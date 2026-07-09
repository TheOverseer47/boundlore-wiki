# BoundLore Content Architecture & Feature Coverage

**Version 1.0 — Master Blueprint (binding for implementation)**

This document is the authoritative architecture plan for scaling BoundLore beyond Creatures / Items / Biomes to all realistically expected Light No Fire content types.

**Related artifacts:** See sibling files in `docs/architecture/` for matrices, schemas, wireframes, and code-gap notes.

---

## 1. Executive Summary

BoundLore has a validated core: Discovery → Entity → Relations, Contribution merge with conflict handling, RLS security, and pre-release reset readiness. E2E flows are proven for Creature, Item, Biome, Drops, Behavior, Spawn, Known Item, Conflict, Cancel, Reject, Restore, and Duplicate.

This blueprint scales the model without overloading discovery forms or over-modeling unconfirmed game systems.

### Core decisions (defaults)

| # | Decision |
|---|----------|
| 1 | **8 Entity Domains** — PLACE, BEING, OBJECT, SYSTEM, KNOWLEDGE, EVENT, COMMUNITY, META. Content areas are subtypes, not separate data models. |
| 2 | **Progressive Disclosure** — First submit = Name + Type + Where + optional observation. Everything else via wizard stages and Add-Info contributions. |
| 3 | **Evidence Tiering** — Every fact carries `evidence_tier`: confirmed, observed, reported, speculative. |
| 4 | **Controlled Relations** — ~20 canonical relation types in 6 families. No ad-hoc types. |
| 5 | **Speculative systems** (Quests, Economy, Talent Trees) get taxonomy slots only — no specialized forms before evidence. |

### P0 sequence (before launch)

```
Registry → CRAFT relations → Resource flow → Recipe intent → Widgets → Landing → Badges
```

---

## 2. Methodology and Assumptions

### Methodology

1. Extend the validated core (posts + BLMETA, wiki_entities, wiki_entity_relations, wiki_observations, contribution intents).
2. Model depth follows evidence tier (Section 3).
3. Derive patterns from reference games only where LNF plausibly has similar systems.
4. Consolidate content areas at domain level; subtype deltas are explicit.

### Key assumptions

| # | Assumption | Confidence | Fallback |
|---|------------|------------|----------|
| A1 | LNF is procedurally generated open fantasy world, survival/crafting/exploration core | High | — |
| A2 | Mounts/flying exist (shown in trailers) | High | Mount subtype remains stub |
| A3 | Crafting/building exists | High | Recipe model stays generic |
| A4 | Class/skill system exists in some form | Medium | Skills as facts on items/creatures |
| A5 | Classic quest/NPC dialogue systems | Low–Medium | Quest stays P2 namespace |
| A6 | Economy/vendors exist | Low | Economy as context facts on settlements |
| A7 | Procedural generation ⇒ many instances per archetype (NMS-like) | High | **Archetype vs. Instance** (below) |

### Archetyp vs. Instanz (critical)

- **Archetype entities** ("Ogre Mage", "Staff of Fire", "Swamp") = canonical wiki pages.
- **Instance observations** ("Ogre Mage at coordinate X") = `wiki_observations`, **not** new pages.
- **Exception:** Named uniques (bosses, landmarks, settlements) get own pages.
- Discovery asks: *"Are you describing the type or a sighting?"* — controls entity vs. observation.
- Existing `classifyPlaceEntry` / `location_hint` pattern generalizes this.

---

## 3. Evidence Coverage Tiers

| Tier | Meaning | Modeling depth | Examples |
|------|---------|----------------|----------|
| **T1 Confirmed** | Official sources | Full specialization | Biomes, Creatures, Items, Travel, Mounts, Building, Oceans, Weather/Time, Maps |
| **T2 Likely** | Genre-typical, strongly expected | Subtype + core fields, generic fact containers | Weapons/Armor/Tools, Resources, Recipes, Stations, Bosses, NPCs, Skills, Status Effects, Settlements, Dungeons, Lore |
| **T3 Speculative** | Possible, unconfirmed | Taxonomy slot + slug namespace + generic KV facts only | Factions, Quests, Talent Trees, Classes, Economy, World Events, Achievements, Player Bases, Patch knowledge |

**Promotion rule:** T3 → T2 → T1 only via documented evidence or explicit admin "Taxonomy Promotion" — never automatic.

---

## 4. Eight Entity Domains

```text
1. PLACE      — spatially locatable
2. BEING      — living/acting
3. OBJECT     — ownable/craftable/usable
4. SYSTEM     — game mechanics (skills, effects, classes, recipes)
5. KNOWLEDGE  — lore, books, inscriptions, history
6. EVENT      — time-bound (world events, patches)
7. COMMUNITY  — player-related (guilds, bases, server meta)
8. META       — wiki-internal (guides, news, contributions) [exists]
```

### Subtypes (canonical `entity_subtype` values)

| Domain | Subtypes | Tier |
|--------|----------|------|
| PLACE | biome, region, landmark, location_hint, dungeon, ruin, cave, temple, settlement, waterbody | T1/T2 |
| BEING | creature, boss, elite, npc, mount, wildlife | T1/T2 |
| OBJECT | item_generic, weapon, armor, tool, resource, consumable, building_part, vehicle_boat, artifact | T1/T2 |
| SYSTEM | recipe, crafting_station, skill, ability, status_effect, damage_type, class_archetype, talent_node | T2/T3 |
| KNOWLEDGE | lore_book, inscription, history_entry, legend | T2 |
| EVENT | world_event, seasonal_event, patch_note | T3 |
| COMMUNITY | guild, player_base, server_meta | T3 |
| META | guide, news, contribution, discovery_report | exists |

Full entity-relation modeling: see [entity-relation-matrix.md](./entity-relation-matrix.md).

---

## 5. Relationship Families

Six families, ~20 canonical types. Registry: `js/relations-registry.js`.

| Family | Types (source → target) |
|--------|-------------------------|
| **SPATIAL** | found_in, located_in, spawns_at |
| **DROP/YIELD** | drops, harvested_from, contains_loot |
| **CRAFT** | crafted_from, crafted_at, ingredient_of, unlocks |
| **COMBAT/SYSTEM** | weak_to, resistant_to, inflicts, requires, grants |
| **SOCIAL/LORE** | member_of, hostile_to, allied_to, mentions, gives_quest |
| **TAXONOMIC** | variant_of, part_of, related_to |

Standard relation properties: `confidence`, `evidence_tier`, `conditions`, `quantity`, `rate`, `source_post_id`, `report_count`.

Full spec: [graph-relations-spec.md](./graph-relations-spec.md).

---

## 6. Controlled Vocabularies

| Vocabulary | Values |
|------------|--------|
| evidence_tier | confirmed, observed, reported, speculative |
| confidence | single_observation, corroborated, verified |
| rarity | common, uncommon, rare, epic, legendary, unique, unknown |
| hostility | passive, neutral, defensive, aggressive, unknown |
| damage_type | physical, fire, frost, lightning, poison, arcane, unknown |
| time_of_day | day, night, dawn, dusk, any |
| climate_facet | temperate, tropical, arid, arctic, swamp, volcanic, underwater, underground, sky |
| size_class | tiny, small, medium, large, huge, colossal |
| completeness | stub, needs_details, solid, comprehensive |

---

## 7. Key Non-Entity Decisions

| Topic | Default | Alternative (documented) |
|-------|---------|--------------------------|
| Recipes | Facts/relations on target item, not own pages | Own recipe entities if multi-output crafting confirmed |
| Weather/Time | Conditions on relations, not entities | Weather registry pages if complex mechanics |
| Mounts | Creature subtype with `rideable` fact | Separate mount entity — **not recommended** (duplicates) |
| Coordinates | Observation property, not pages | Map pins on region pages (P2 UI) |
| Status effects / damage types | Admin-curated registry pages | Community-created — **not recommended** |

---

## 8. Progressive Disclosure Model

| Stage | What | When |
|-------|------|------|
| **Quick-Add** | Name, domain/subtype, where (biome/region/unknown), optional screenshot, optional one-line observation | Always first |
| **Wizard** | Subtype-specific core fields, skippable after Quick-Add | Offered immediately after submit |
| **Add-Info Contributions** | Field-specific additions to existing entries | Anytime on published pages |

Max 4 primary contribution buttons visible; rest behind "More ways to contribute".

---

## 9. Matrices (detailed)

| Matrix | File |
|--------|------|
| Entity–Relation | [entity-relation-matrix.md](./entity-relation-matrix.md) |
| Discovery forms | [discovery-form-matrix.md](./discovery-form-matrix.md) |
| Contribution intents | [contribution-intent-matrix.md](./contribution-intent-matrix.md) |
| Detail pages | [detail-page-matrix.md](./detail-page-matrix.md) |
| Search / filter | [search-filter-matrix.md](./search-filter-matrix.md) |
| Moderation / conflict | [moderation-conflict-matrix.md](./moderation-conflict-matrix.md) |
| E2E tests | [../../qa/e2e-content-matrix.md](../../qa/e2e-content-matrix.md) |

---

## 10. Gap Analysis (current state)

| Area | Status |
|------|--------|
| **Works well** | Discovery→Entity core; canonical_slug + aliases; contribution merge + conflict; report_count; place archetype/instance; danger zone; empty states; evidence upload |
| **Too generic** | `category` lacks `entity_subtype`; no controlled vocabulary for rarity/hostility; relation types not centralized |
| **Missing forms** | Resource (P0), Recipe intent (P0), Boss branch (P1), NPC/Settlement (P1), Lore (P1) |
| **Missing relations** | crafted_from/crafted_at/ingredient_of (P0); weak_to/resistant_to/inflicts (P1); mentions (P1) |
| **Missing layout** | Recipe widget, Sources widget (P0); Usage on resources (P0); Registry page type (P1) |
| **Duplication risk** | Resources (synonyms), procedural POIs, Boss vs. Elite |
| **Overengineering risk** | Weather/coordinate/talent/vendor entities; T3 specialized forms; stat-precision filters |
| **Prepared but not UX-ready** | wiki_entity_relations without canonical type list; evidence_tier not visible; observations log not on pages |

Details: [current-code-gap-notes.md](./current-code-gap-notes.md).

---

## 11. Roadmap

See [roadmap.md](./roadmap.md) for P0/P1/P2 scope, acceptance criteria, E2E cases, and risks.

### Summary

- **P0 (pre-launch):** Registry, CRAFT relations, Resource quick-add, Recipe intent, widgets, `/wiki/resources/`, evidence badges, T3 namespace reservation.
- **P1 (post-launch, evidence-driven):** Boss branch, COMBAT relations, NPC/Settlement, Lore, mentions/variant_of, Mount promotion, browse pages, disputed badges.
- **P2 (on demand):** Quests, economy, events, player bases, talent facts, map pins, patch versioning, comparison widgets, stat filters.

---

## 12. Reference Game Patterns

| Pattern | Source | Value for BoundLore |
|---------|--------|---------------------|
| Weakness matrices | Monster Hunter | COMBAT family — **valuable** |
| Crafting reverse lookup | Valheim, Terraria | ingredient_of pivot — **valuable** |
| Archetype vs. instance | No Man's Sky | Core principle — **valuable** |
| Minimal first capture | Breath of the Wild compendium | Quick-Add — **valuable** |
| Boss tactic sections | Dark Souls | P1 layout — **optional** |
| Lore transcripts | Skyrim | P1 lore flow — **optional** |
| Affix databases | Diablo | **unsuitable** (precision unreachable) |
| Coordinate catalogs | NMS wikis | **unsuitable** (misleading in procedural world) |
| Stat filters pre-density | WoWhead | **unsuitable** before P2 |

---

## 13. Deliverables for Implementation Team

| Artifact | Location | Format |
|----------|----------|--------|
| Master plan | This file | Markdown |
| Matrices | `docs/architecture/*.md` | Markdown tables |
| Schemas | `docs/architecture/schemas/*.json` | JSON examples |
| Relations registry | `js/relations-registry.js` | JS module |
| Graph spec | `graph-relations-spec.md` | Markdown |
| Wireframes | `form-wireframes.md` | Markdown |
| E2E matrix | `qa/e2e-content-matrix.md` | Checklist |
| PR checklist | `pr-checklist.md` | Checklist |

**Workflow:** Each roadmap item = one implementation task referencing (a) this doc, (b) relevant matrix, (c) PR checklist, ending with E2E cases from `qa/e2e-content-matrix.md`.

---

## 14. Risks and Open Questions

| # | Risk / Question | Mitigation / Default |
|---|-----------------|---------------------|
| R1 | LNF content differs from assumptions | Tier system + Taxonomy Promotion |
| R2 | BLMETA-in-HTML scales poorly | Keep for now; `wiki_facts` table P2 only if query need real |
| R3 | Registry as JS vs. DB table | **Default: JS** (PR-reviewable). DB only if runtime admin editing needed |
| R4 | Resource synonym detection sharpness | Levenshtein + alias pool, warn only — **open: trusted-user merge?** |
| R5 | Screenshot requirements raise barrier | Only Boss, Mount, Lore transcript |
| R6 | Recipe review queue bottleneck | Manual default; auto-approve at ≥2 corroborating reports (P1 decision) |
| R7 | Trusted-user role | Recommended P1 — **open** |
| R8 | Resource slugs without hash | Default yes; collision risk accepted with synonym warning |

---

## 15. UX and Knowledge Graph Standards

- **Progressive Disclosure:** Never require fields a player cannot know on first sighting.
- **Staged Wizards:** 3 short steps max; always skippable.
- **Property graph modeling:** Entities = nodes, Relations = typed directed edges with properties, Observations = provenance events.
- **Provenance:** Every fact traceable to `source_post_id` and `evidence_tier`.
- **Empty states:** Hide empty sections; max 3 missing-info CTAs; stub pages get single "Help complete" banner.
