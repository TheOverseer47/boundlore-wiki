# BoundLore Masterplan — Discovery V2 & Knowledge Brain

> **Status:** Active · **Version:** 1.0 · **Last updated:** 2026-07-08  
> **Purpose:** Single source of truth for the long-term architecture of BoundLore as a dynamic, player-fed, self-learning wiki.

---

## 1. Vision

BoundLore is **not** a classic wiki where users write articles. It is a **learning knowledge system**:

- Users submit **Discoveries** (structured observations from gameplay).
- The system **recognizes entities**, **creates or updates** them, **links relations**, and **generates readable posts**.
- Multiple reports about the same thing **merge into one canonical entry** — never duplicate posts for the same entity.
- Wrong or outdated knowledge is **deprecated**, not silently overwritten.
- Admins **moderate and override** — they do not manually author content.
- **Guides** remain a simpler, narrative channel with entity linking.
- A future **datamining/import backdoor** feeds the same pipeline as user observations.

**Metaphor:** Discoveries = input signals · Entities = neurons · Relations = synapses · Public posts = readable output layer.

---

## 2. North Star Example (Monster + Sword)

1. Player finds **Shadow Wraith** and loots **Iron Cleaver**.
2. Player opens Discovery wizard → category **Creatures**.
3. Wizard asks progressively: name, location, screenshot, optional loot.
4. Player links **Iron Cleaver** as dropped item with screenshot evidence.
5. System:
   - Matches or creates entity `creature|shadow-wraith|world|region`.
   - Matches or creates entity `item|iron-cleaver|_|_`.
   - Creates relation `DROPS` (creature → item).
   - Stores observation linked to both entities.
   - Generates/updates **one** creature post with loot table entry.
   - Generates/updates **one** item post with "Dropped by" link.
6. Admin sees diff summary → approves.
7. Five more players report same monster with different drops → **same entities updated**, loot table grows, confidence increases. **Zero new duplicate posts.**

---

## 3. Architecture — Four Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — USER INPUT                                       │
│  Discovery Wizard (structured) · Guide Editor (freeform)    │
│  Future: Datamining Import                                  │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 2 — KNOWLEDGE BRAIN (source of truth)                │
│  Observations · Canonical Entities · Relations · Claims     │
│  Confidence · Versions · Aliases · Merge History            │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3 — RENDER LAYER (what users read)                   │
│  Generated Posts · Cross-links · Loot tables · See also     │
└──────────────────────────┬──────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  LAYER 4 — CONTROL LAYER                                    │
│  Admin moderation · Conflict resolution · Hide/archive      │
│  Audit logs · Override · Import governance                  │
└─────────────────────────────────────────────────────────────┘
```

### Core principle

> **Posts are views, not truth.**  
> Truth lives in `wiki_entities`, `wiki_observations`, `wiki_entity_relations`, and aggregated `wiki_entity_claims`.

---

## 4. Data Model

### 4.1 Existing tables (already in repo)

| Table | Role |
|-------|------|
| `posts` | Public-facing content; transitions to **generated view** of entities |
| `wiki_entities` | Canonical things (creatures, items, locations, …) |
| `wiki_entity_aliases` | Alternative names → same entity |
| `wiki_entity_relations` | Semantic links (DROPS, FOUND_IN, …) |
| `wiki_discovery_evidence` | Screenshots/files supporting observations |
| `wiki_relation_types` | Controlled relation vocabulary |
| `wiki_entity_history` | Version snapshots |
| `wiki_entity_merge_history` | Duplicate merge audit |
| `wiki_sync_logs` | Admin approve/resync audit trail |
| `wiki_schema_versions` | Per-category field schema versions |

### 4.2 New tables (Phase A — `phase_a_observations_foundation.sql`)

| Table | Role |
|-------|------|
| `wiki_observations` | Raw user submission before/at merge; links to source post |
| `wiki_observation_entities` | Which entities an observation touches |
| `wiki_entity_claims` | Aggregated facts derived from multiple observations |

### 4.3 New columns on `posts`

| Column | Role |
|--------|------|
| `canonical_entity_id` | When set, post is the public view of that entity |
| `is_entity_view` | `true` = auto-generated canonical post, not hand-written |

### 4.4 Observation lifecycle

```
draft → submitted → validating → approved → indexed → verified
                              ↘ rejected
                              ↘ needs_revision
                              ↘ superseded (replaced by merge)
```

### 4.5 Entity lifecycle

```
draft → active → archived
         ↘ merged (loser entity deprecated, winner kept)
```

### 4.6 Relation lifecycle

```
active → deprecated (soft; never hard-delete by default)
```

---

## 5. Identity Rules — When Is Something "The Same"?

### 5.1 Canonical key (primary identity)

Already implemented as `bl_build_canonical_key(entity_type, entity_name, world_name, region_name)`:

```
creature|shadow-wraith|aetheria|northern-marsh
item|iron-cleaver|_|_
```

- `_` = unknown/null world or region (allowed for items without location binding).
- Keys are **deterministic** — same inputs always produce same key.
- Upsert on `canonical_key` — never duplicate entities with same key.

### 5.2 Alias matching (secondary)

Before creating a new entity, search:

1. Exact `canonical_key` match → **same entity**
2. Normalized name match on `wiki_entity_aliases` → **same entity**
3. Trigram/fuzzy match on `canonical_name` within same `entity_type` + `category_slug` → **candidate match** (user confirms)
4. No match → **new entity** (first discovery)

### 5.3 Normalization rules

- Lowercase, trim, collapse whitespace
- Strip punctuation except hyphens
- German umlauts → ae/oe/ue
- Common prefixes ignored: "the", "a", "an"
- Player-supplied aliases stored in `wiki_entity_aliases`

### 5.4 First-discovery IDs

When no match exists:

1. Generate `canonical_key` immediately at observation submit (client preview + server confirm).
2. Entity created with `status = 'draft'` until admin approves first observation.
3. First approved observation promotes entity to `active`.
4. `wiki_entities.metadata.first_observation_id` tracks origin.

---

## 6. Merge Rules — When to Add, Update, or Conflict

### 6.1 Same entity, new observation

| Scenario | Action |
|----------|--------|
| Same fact, new reporter | Increase claim confidence, add evidence |
| New fact (e.g. new drop) | Add relation or extend claim; regenerate post |
| Contradicting fact | Flag conflict; lower confidence; admin review if threshold crossed |
| Same fact, better evidence | Upgrade evidence rank; keep claim |

### 6.2 Confidence scoring (initial model)

Base confidence per observation from user's `confidence_level` field (1–6).

Aggregated claim confidence:

```
claim_confidence = min(100, sum(observation_weights) + corroboration_bonus)
```

| Observations supporting claim | Bonus |
|------------------------------|-------|
| 1 | +0 |
| 2–3 | +10 |
| 4–10 | +20 |
| 11+ | +30 |

Admin verification: sets claim to 100, marks `verified = true`.

### 6.3 Conflict detection

Conflict when:

- Two active claims on same entity + same claim_key with incompatible values
- New observation contradicts claim with confidence ≥ 60

Conflict states: `open` → `resolved` | `deferred` | `suppressed`

Admin resolves → winning claim kept, loser deprecated with reason.

### 6.4 "Forgetting wrong knowledge"

Never hard-delete canonical data. Instead:

1. Deprecate observation (`status = rejected`)
2. Recalculate affected claims
3. Deprecate relations no longer supported
4. Regenerate post from remaining active claims
5. Log in `wiki_entity_history`

---

## 7. Relation Types (controlled vocabulary)

| Code | Direction | Example |
|------|-----------|---------|
| `DROPS` | creature → item | Shadow Wraith drops Iron Cleaver |
| `FOUND_IN` | entity → location | Shadow Wraith found in Northern Marsh |
| `REQUIRES` | entity → entity | Quest requires item |
| `UNLOCKS` | entity → entity | Defeating boss unlocks area |
| `PART_OF` | entity → entity | Dungeon is part of region |
| `VARIANT_OF` | entity → entity | Elite variant of base creature |
| `RELATED_TO` | any → any | Generic fallback |
| `CHANGED_BY_PATCH` | entity → patch | Behavior changed in v1.4 |

Inverse relations auto-created where defined in `wiki_relation_types`.

---

## 8. Discovery Wizard UX (Phase B target)

### 8.1 Progressive disclosure — 4 steps

| Step | Required | Content |
|------|----------|---------|
| 1 — What | Yes | Category, subcategory, entity name, 1 screenshot |
| 2 — Where | Yes | World, region, coordinates (optional) |
| 3 — Connections | Conditional | Loot, linked creatures/items/locations, evidence per link |
| 4 — Details | No | Behavior, stats, notes, patch version, confidence |

### 8.2 Smart defaults

- Typing entity name → live search existing entities → "Is this X? (12 reports)"
- Known entity → pre-fill fields from canonical state; user only adds **new** info
- Category-specific fields from `BOUNDLORE_DISCOVERY_SCHEMAS` in `categories-config.js`

### 8.3 Validation tiers

| Tier | Blocks submit |
|------|---------------|
| Hard | Missing name, category, required location, placeholder spam, no evidence when required |
| Soft | Low confidence, no relations, vague text → warn but allow |
| Quality | Min word count on textareas, duplicate observation detection |

### 8.4 Output on submit

1. Create `wiki_observations` row
2. Create pending `posts` row (discovery type, links to observation)
3. Run entity matching → link observation to entities
4. **Do not** create duplicate entity posts — queue merge for admin approval
5. Show user: "Discovery submitted — linked to Shadow Wraith (existing) + new item Iron Cleaver"

---

## 9. Generated Posts — Render Rules

### 9.1 One canonical post per entity

- `posts.canonical_entity_id` unique among active published entity views
- Post content generated from entity metadata + active claims + relations
- BLMETA block embedded for backward compatibility during transition
- Regenerated on: observation approved, claim updated, relation changed, admin override

### 9.2 Post sections (creature example)

```
# Shadow Wraith
[Infobox: type, region, confidence, last updated]

## Overview
[Generated from claims]

## Loot / Drops
[Table from DROPS relations, sorted by confidence]

## Locations
[Table from FOUND_IN relations]

## Community Reports
[Count, link to observation history — admin only or collapsed]

## See Also
[Auto-linked related entities]
```

### 9.3 Guides (simpler path)

- Freeform Quill editor
- `@` or search autocomplete to link entities
- Background: extract mentioned entity names → suggest relations
- Guide post is **narrative**; does not override canonical entity claims
- Internal links resolve to canonical entity posts

---

## 10. Admin Workflow

### 10.1 Moderation queue item shows

- Observation summary (structured fields)
- Entity match results (new vs existing)
- Diff preview: what will change on canonical entity/post
- Relations to be created/updated
- Conflicts flagged
- Evidence thumbnails

### 10.2 Admin actions

| Action | Effect |
|--------|--------|
| Approve | Merge observation → entities/claims/relations → regenerate posts |
| Reject | Observation rejected; no entity changes |
| Request revision | User notified; observation stays editable |
| Override entity match | Admin picks correct entity link |
| Merge entities | Combine duplicates; audit in merge history |
| Hide post | Post unpublished; entity can remain for internal use |
| Lock entity | `admin_locked`; no auto-regeneration until unlocked |

### 10.3 Admin is NOT

- Writing wiki articles from scratch
- Manually creating loot tables
- Copy-pasting user submissions into posts

---

## 11. Datamining / Import Backdoor (Phase D)

Separate import channel into same observation layer:

```
import_batch → wiki_observations (source = 'datamine')
             → same merge engine
             → lower default confidence (e.g. 30)
             → admin bulk-review or auto-index with flag
```

Fields: `observation_source` enum: `user` | `datamine` | `admin` | `migration`

---

## 12. Implementation Phases

### Phase A — Foundation (CURRENT)

**Goal:** Entity-first data layer; observations separate from posts.

| # | Deliverable | File(s) | Status |
|---|-------------|---------|--------|
| A1 | Masterplan document | `docs/masterplan-discovery-v2.md` | ✅ |
| A2 | Observations + claims tables | `supabase/phase_a_observations_foundation.sql` | 🔄 |
| A3 | Entity matching RPC | `bl_match_entities()` in same SQL | 🔄 |
| A4 | Observation submit RPC | `bl_register_observation()` in same SQL | 🔄 |
| A5 | Client core module | `js/discovery-core.js` | 🔄 |
| A6 | Posts entity-view columns | same SQL migration | 🔄 |
| A7 | Run migration in Supabase | Manual — **USER ACTION** | ✅ |

### Phase B — Discovery Wizard V2

| # | Deliverable |
|---|-------------|
| B1 | New modular wizard UI (replace monolithic create-post discovery section) |
| B2 | Live entity search/autocomplete |
| B3 | Multi-entity per submission (primary + linked loot/items/locations) |
| B4 | Progressive 4-step flow |
| B5 | Submit via `bl_register_observation()` |
| B6 | User feedback: match results + linked entities preview |

### Phase C — Merge Engine & Auto-Posts

| # | Deliverable |
|---|-------------|
| C1 | `bl_merge_observation()` — full merge on admin approve |
| C2 | Claim aggregation from observations |
| C3 | Post generator from entity state |
| C4 | Conflict detection + admin conflict UI |
| C5 | Regenerate posts on entity change |
| C6 | Admin diff-review dashboard |

### Phase D — Scale & Intelligence

| # | Deliverable |
|---|-------------|
| D1 | Datamining import pipeline |
| D2 | Full-text search over entities + claims |
| D3 | Patch-version deprecation workflow |
| D4 | Reputation/trust scoring for reporters |
| D5 | Entity merge UI for admins |
| D6 | Min build tooling (Vite) for maintainability |

---

## 13. Migration from Current System

### What stays

- Supabase auth, profiles, moderation, notifications, reports
- `categories-config.js` discovery schemas
- BLMETA format (transition period — generated into posts)
- Existing published posts (grandfathered; linked to entities on first sync)
- Admin dashboard shell

### What changes

| Current | Target |
|---------|--------|
| Discovery → post directly | Discovery → observation → merge → generated post |
| Duplicate check at submit only | Continuous entity matching + claim merge |
| Sync RPC on admin approve only | Full merge engine with claim layer |
| Post is source of truth | Entity is source of truth |
| 2250-line create-post.js | Modular discovery-core + wizard components |

### Transition strategy

1. Phase A runs parallel — old flow still works
2. Phase B adds new wizard behind feature flag `?discoveryV2=1`
3. Phase C switches admin approve to merge engine
4. Old observations backfilled from existing discovery posts via migration script
5. Feature flag removed when QA passes

---

## 14. File Map (target end state)

```
docs/
  masterplan-discovery-v2.md          ← this file
  discovery-v2-qa.md                  ← QA checklist (Phase B)

supabase/
  discovery_entity_backbone.sql       ← existing
  sprint1_knowledge_graph_foundation.sql
  sprint1_sync_rpc.sql
  phase_a_observations_foundation.sql ← Phase A
  phase_b_merge_engine.sql            ← Phase C
  phase_c_post_generator.sql          ← Phase C

js/
  categories-config.js                ← schema SSOT (keep)
  discovery-core.js                 ← API: match, submit, preview
  discovery-wizard.js               ← Phase B UI
  discovery-render.js                 ← entity → HTML post generator (client preview)
  entity-linker.js                    ← guide @-mention linking
  create-post.js                      ← slimmed: delegates discovery to wizard
```

---

## 15. QA Gates (must pass before each phase goes live)

### Phase A gate

- [ ] Migration runs without error in Supabase
- [ ] `bl_match_entities('shadow wraith', 'creature', 'creatures')` returns results
- [ ] `bl_register_observation(...)` creates observation + pending post
- [ ] RLS: users see own observations; admins see all

### Phase B gate

- [ ] Wizard submits end-to-end
- [ ] Entity autocomplete shows existing matches
- [ ] Monster + item submission creates observation with 2 entity links
- [ ] No duplicate posts for known entities
- [ ] Guide flow unchanged

### Phase C gate

- [ ] Admin approve triggers merge + post generation
- [ ] 5 observations same entity → 1 post, growing loot table
- [ ] Conflicting observation flags conflict, not silent overwrite
- [ ] Deprecated claims disappear from generated post

---

## 16. Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-08 | Entity-first architecture | Posts as views prevents duplicate content |
| 2026-07-08 | Observations as separate table | Enables merge, confidence, multi-report |
| 2026-07-08 | Keep BLMETA during transition | Backward compat with existing sync RPC |
| 2026-07-08 | Canonical key identity | Deterministic, already partially implemented |
| 2026-07-08 | Soft deprecate only | Audit trail + "forgetting" without data loss |
| 2026-07-08 | Feature flag for V2 wizard | Safe rollout without breaking current flow |

---

## 17. User Actions Required

| When | Action |
|------|--------|
| After Phase A SQL committed | Run `supabase/phase_a_observations_foundation.sql` in Supabase SQL Editor |
| After each future migration | Run new SQL file in Supabase SQL Editor |
| Phase B | Test discovery wizard at `/wiki/create-post/?discoveryV2=1` |
| Never | Do not delete existing Supabase tables manually |

---

## 18. Success Criteria

BoundLore Discovery V2 is complete when:

1. A player can submit a monster + loot discovery in under 3 minutes.
2. The system creates/updates entities and relations without duplicate posts.
3. Five similar reports merge into one growing canonical entry.
4. Generated posts include auto-linked loot tables and cross-references.
5. Admins review diffs, not raw submissions.
6. Wrong data can be deprecated with full audit trail.
7. Guides link to entities with minimal friction.
8. Datamining import path exists (even if unused).

---

*This document is the authoritative reference for BoundLore's knowledge brain architecture. Update it when architectural decisions change.*
