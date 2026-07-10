# E2E Content Architecture Test Matrix

Executable checklist for P0/P1 content architecture milestones. Pattern follows existing QA flows (Creature, Item, Biome, Contribution).

**Status legend:** `[ ]` not run · `[~]` partial · `[x]` pass · `[!]` fail

---

## P0.5-A — Browse, Resource Display, Entry Needed Badges

**Milestone:** P0.5-A (consistency fixes; no facet system, Missing Entry Queue, search baseline, or station promotion)

| Test | URL / target | Expected | Result |
|------|--------------|----------|--------|
| Browse visibility | `/wiki/browse/` | Loads visible; no blank/dark screen after 10s | `[x]` |
| Resource detail | `qa-ember-shard-511160` | Type Resource, Source Type Mining, Source Detail, Rarity Unknown, Used In, evidence badges; no Add Recipe; no pending ×4 | `[x]` |
| Staff recipe unresolved | `qa-staff-of-fire-2b742628` | Ember linked; Wood + Forge show Entry needed; single recipe block | `[x]` |
| Resources landing regression | `/wiki/resources/` | QA Ember Shard card; source/usage/badges intact | `[x]` |
| Items regression | `/wiki/items/` | Loads; Browse Resources link; no Wood/Forge/Recipe posts | `[x]` |
| Homepage regression | `/` | Visible; hero video; zoomable infographic | `[x]` |

**Not built in P0.5-A:** Missing Entry Queue, facet system, search baseline, station_type promotion, auto Wood/Forge stubs.

---

## P0.5-B — Facet Registry Baseline

**Milestone:** P0.5-B (registry + derivation + minimal badges; no search/filter/admin UI)

| Test | URL / target | Expected | Result |
|------|--------------|----------|--------|
| Resource detail facets | `qa-ember-shard-511160` | Facet badges Mining, Unknown, Raw; hero facts + evidence badges intact | `[x]` |
| Resources landing facets | `/wiki/resources/` | QA Ember Shard card with facet badges; usage Staff/Forge/3 piece | `[x]` |
| Staff regression | `qa-staff-of-fire-2b742628` | Recipe + Entry needed unchanged; no facet spam | `[x]` |
| Browse regression | `/wiki/browse/` | Visible after load; registry script loaded | `[x]` |
| Items regression | `/wiki/items/` | Browse Resources link; no Wood/Forge/Recipe posts | `[x]` |
| Homepage regression | `/` | Visible; hero + infographic | `[x]` |
| Admin conflict queue | `/wiki/admin/` | 1 pending add_recipe remains | `[~]` Access Denied in automation session |

**Not built in P0.5-B:** Facet editing, facet search, facet filters, Missing Entry Queue, station promotion, search baseline, Dragon-Mount query tests.

---

## T1 — Resource + Usage Chain

**Milestone:** P0  
**Slug idea:** `qa-ember-shard`  
**P0-C status:** Steps 1, 2, 5 implemented (resource quick-add + synonym warning).  
**P0-E1 status:** Step 3 usage display on resource detail (derived from merged Staff recipe / `crafted_from`).  
**P0-E2 status:** Step 4 Resources landing implemented (`/wiki/resources/`).  
**P0-E3 status:** Evidence-tier badges on resource detail, recipe section, resources landing.

| Step | Action | Expected | P0-C |
|------|--------|----------|------|
| 1 | Resource Quick-Add: `QA Ember Shard`, mining, `QA Volcanic`, detail `red crystal nodes` | `entity_subtype: resource`, `discovery_payload.resource` | `[~]` manual |
| 2 | Approve discovery | Published resource page | `[~]` needs admin session |
| 3 | View resource detail page | `Used In` shows Staff link, 3 piece, Forge; Evidence badges if present | `[x]` P0-E1/E3 |
| 4 | View `/wiki/resources/` | QA Ember Shard visible; Mining filter; Used In → Staff; Evidence badges | `[x]` P0-E2/E3 |
| 5 | Second submit `QA EmberShard` | Synonym warning → `QA Ember Shard` | `[~]` manual |
| 6 | Add Usage via contribution (`ingredient_of`) | Not required — usage derived from recipe merge; `ingredient_of` not persisted | `[~]` P0-E1 |

**Relations expected:** `harvested_from` → Volcanic biome stub

---

## T2 — Recipe Relation-First

**Milestone:** P0  
**Target:** existing `qa-staff-of-fire-*`  
**P0-D1 status:** Steps 1–2 implemented (Add Recipe intent + pending payload).  
**P0-D2 status:** Step 3 merge implemented (admin approve merges recipe + CRAFT relations into target).  
**P0-D3 status:** Item detail shows `Crafting Recipe` section from merged payload (QA Staff verified).  
**P0-D4 status:** Duplicate recipe → no-op merge (`recipe_confirmed`); conflict recipe (Ember ×4) → blocked approve, stays pending.  
**P0-E1 status:** Ember Shard `Used In` widget from merged Staff recipe (not pending conflict). Recipe browse still deferred.

| Step | Action | Expected | Status |
|------|--------|----------|--------|
| 1 | On Staff page, click "Add Recipe" intent | Form: ingredients, quantities, station | `[x]` P0-D1 |
| 2 | Submit: Ember Shard ×3, Wood ×1, Station "Forge" | Goes to review queue, NOT auto-published | `[x]` P0-D1 |
| 3 | Admin approves | Recipe block + relations merged into Staff BLMETA | `[x]` P0-D2 |
| 3b | View Staff item page | Crafting Recipe section visible (ingredients, station, notes) | `[x]` P0-D3 |
| 3c | View Staff recipe evidence | Evidence/Confidence badges in recipe block | `[x]` P0-E3 |
| 6 | Submit duplicate recipe (same ingredients) | No second recipe block; no-op merge / confirm only | `[x]` P0-D4 |
| 6b | Submit conflicting recipe (Ember ×4) | Conflict detected; existing recipe not overwritten | `[x]` P0-D4 |
| 4 | View Ember Shard page | `Used In` → Staff, 3 piece, Forge; no ×4 conflict | `[x]` P0-E1 |
| 5 | Recipes browse (virtual list) | Staff recipe visible | `[ ]` P1 |
| 6 | Submit conflicting second recipe | Coexists as `reported`, not overwritten; approve blocked | `[x]` P0-D4 |

**Relations expected on submit:** `crafted_from` ×2, `crafted_at` → Forge (no stubs pre-approval)

---

## T3 — Boss with Mandatory Evidence

**Milestone:** P1  
**Slug idea:** `qa-boss-marsh-tyrant`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Creature wizard, set Boss flag, arena "Sunken Temple" | Wizard shows screenshot requirement |
| 2 | Submit WITHOUT screenshot | Blocked with clear message |
| 3 | Submit WITH screenshot | Goes to review queue |
| 4 | Approve | Boss badge above fold; tactics section hidden if empty |
| 5 | Creatures list, Boss filter | Entry appears |

**Relations expected:** `located_in` → Sunken Temple stub, `drops` → guaranteed loot

---

## T4 — Dungeon Archetype/Instance

**Milestone:** P1  
**Slug idea:** `qa-sunken-temple`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Landmark flow: named, type temple, biome Swamp | Entity created |
| 2 | Approve | Location page with contains_loot CTA |
| 3 | `/wiki/locations/` filter temple | Entry visible |
| 4 | Second report: generic unnamed temple in Swamp | Creates **observation only**, NOT new entity |

**Relations expected:** `located_in` → Swamp

---

## T5 — Mount Promotion

**Milestone:** P1  
**Target:** existing creature page

| Step | Action | Expected |
|------|--------|----------|
| 1 | "Mark as Rideable" intent without screenshot | Blocked |
| 2 | Submit with screenshot | Review queue |
| 3 | Approve | rideable badge; taming section visible |
| 4 | Creatures filter "rideable" | Entry appears |

**Relations expected:** `requires` → saddle/taming item stub

---

## T6 — NPC + Settlement

**Milestone:** P1  
**Slug idea:** `qa-npc-old-ferryman`

| Step | Action | Expected |
|------|--------|----------|
| 1 | NPC Quick-Add: "Old Ferryman", new settlement "Reedholm" | NPC + settlement stub created |
| 2 | Approve NPC | NPC page with role badge |
| 3 | Settlement stub in admin queue | Admin confirms or merges |
| 4 | Reedholm page | Lists Old Ferryman |

**Relations expected:** `located_in` → Reedholm

---

## T7 — Weakness Contradiction

**Milestone:** P1  
**Target:** `qa-ogre-mage-*`

| Step | Action | Expected |
|------|--------|----------|
| 1 | User A: weak_to Frost | Relation added |
| 2 | User B: resistant_to Frost | Both relations exist |
| 3 | Detail page | disputed badge on Combat section |
| 4 | Conflict row created | Admin can resolve |
| 5 | Admin resolves | Loser archived, not deleted |

---

## T8 — Lore with Transcript

**Milestone:** P1  
**Slug idea:** `qa-lore-tablet-of-tides`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Lore Quick-Add without photo/transcript | Blocked |
| 2 | Submit with photo + transcript, mentions "Marsh Tyrant" | Review queue |
| 3 | Approve | Transcript verbatim; interpretation separate |
| 4 | Marsh Tyrant page | "Mentioned in" section |
| 5 | Edit transcript via contribution | Review required |

**Relations expected:** `mentions` → Marsh Tyrant (boss)

---

## T9 — Status Effect Registry

**Milestone:** P1  
**Slug idea:** `effect-poison` (admin-created)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Admin creates registry entry | Page exists, curated badge |
| 2 | User tries to create new effect via discovery | No form available |
| 3 | User adds inflicts poison on creature | Relation links to registry |
| 4 | Registry page | Lists causing creatures |

---

## T10 — Empty-State New Lists

**Milestone:** P0  
**URL:** `/wiki/resources/` (before data)

| Step | Action | Expected |
|------|--------|----------|
| 1 | Visit empty resources page | Clean empty state, no spinner hang |
| 2 | CTA visible | "Add Resource" links to `/wiki/create-post/?type=resource` |
| 3 | No console errors | — |
| 4 | With QA data | QA Ember Shard card visible with source + usage | `[x]` P0-E2 |

---

## T11 — T3 Namespace Protection

**Milestone:** P0  
**Slug idea:** `quest-anything`

| Step | Action | Expected |
|------|--------|----------|
| 1 | Visit `/wiki/post/?slug=quest-anything` | Clean "Post not found" | `[x]` sweep |
| 2 | No crash, no spinner hang | — | `[x]` sweep |
| 3 | Slug not in any browse list | — | `[x]` sweep |
| 4 | Namespace reserved in taxonomy | Documented in registry | `[x]` |

---

## Final P0 Acceptance Sweep (2026-07-10)

**HEAD:** `95e2cdf` · **URL base:** `http://localhost:8080` only · **Commit scope:** docs only · **No** push/deploy/SQL/reset.

**Overall:** `[~]` **grün / teilgrün** — all UI regression areas pass; admin queue not re-verified in automation (Access Denied).

| Area | URL / check | Result |
|------|-------------|--------|
| Git / env | `main`, 25 ahead, snapshot untracked | `[x]` |
| Homepage + patch mode | `/` | `[x]` hero, infographic, lightbox close |
| Admin safety | `/wiki/admin/` | `[~]` Access Denied in automation; P0-D4 prior E2E covered conflict |
| Resource detail | `qa-ember-shard-511160` | `[x]` subtype, Used In, badges, no Add Recipe, no ×4 |
| Resources landing | `/wiki/resources/` | `[x]` CTA, card, filters, badges |
| Staff recipe | `qa-staff-of-fire-2b742628` | `[x]` 1 recipe, ×3/×1, Forge, notes, badges |
| Ogre Mage regression | `qa-ogre-mage-1103f2` | `[x]` Behavior, Spawn, Drop Staff |
| Swamp regression | `swamplands-94dadc07` | `[x]` Known Creatures 2, Known Items 2 |
| Items list | `/wiki/items/` | `[x]` 3 entries, Browse Resources, no Wood/Forge/Recipe |
| Locations empty | `/wiki/locations/` | `[x]` no entries, no red crystal stub |
| T3 protection | `quest-anything` | `[x]` Post not found |

### P0 green checklist

- [x] Registry / subtype
- [x] CRAFT
- [x] Resource Quick-Add (implemented; manual E2E not re-run)
- [x] Recipe intent / merge / display
- [x] Duplicate / conflict (UI + prior P0-D4)
- [x] Usage widget
- [x] Resources landing
- [x] Evidence badges
- [x] T3 slug protection
- [x] Empty states
- [~] Admin safety (session-dependent)
- [x] No false stubs / no contributions in normal lists

### Non-blocking / post-P0

- `/wiki/locations/` — “No location entries” (known)
- Pending `add_recipe` Ember ×4 conflict — stays pending
- Full Recipe browse/index — not P0-finalized
- P1/P2: Boss, NPC, Lore, Mounts, Economy, Events, Player Bases, Talent/Class, etc.

---

## Regression Suite (run after every P0/P1 change)

- [ ] Creature discovery → approve → detail page
- [ ] Item discovery → approve → detail page
- [ ] Biome discovery → approve → list
- [ ] Drop contribution on creature
- [ ] Behavior contribution
- [ ] Spawn contribution
- [ ] Known item contribution
- [ ] Conflict: two different damage values
- [ ] Cancel contribution preview
- [ ] Reject & archive contribution
- [ ] Restore archived contribution
- [ ] Duplicate submit blocked/warned

---

## Blueprint 2.0 Archetype Tests (planned — not passed)

Architecture validation tests from Master Blueprint 2.0. Status: **planned** until P0.5/P1/P2 implementation.

**Legend:** `[ ]` planned · `[~]` in progress · `[x]` pass · `[!]` fail

| ID | Name | Milestone | Status |
|----|------|-----------|--------|
| T-RESOURCE-01 | Resource with mining, biome, rarity, recipe usage | P0.5/P1 | `[ ]` planned |
| T-RESOURCE-02 | Same resource from mining + loot + vendor | P1 | `[ ]` planned |
| T-STATION-01 | Generic Forge as station_type without location | P0.5 | `[ ]` planned |
| T-STATION-02 | Concrete Forge as located_at observation only | P0.5 | `[ ]` planned |
| T-CRAFT-01 | Recipe with unresolved ingredient + station | P0.5 | `[x]` P0.5-A — Wood/Forge Entry needed badges; no stubs |
| T-CRAFT-02 | Multiple alternative recipes for same item | P1 | `[ ]` planned |
| T-CRAFT-03 | Recipe changes between two versions | P2 | `[ ]` planned |
| T-MOUNT-01 | Creature is Dragon + Flying + Rideable Mount (one page) | P0.5 | `[ ]` planned |
| T-MOUNT-02 | Visually ridden but mount unconfirmed (observed tier) | P1 | `[ ]` planned |
| T-SEARCH-01 | "dragon mount" finds correct creature | P0.5 | `[ ]` planned |
| T-SEARCH-02 | "mineable fire resource" finds Ember Shard | P0.5 | `[ ]` planned |
| T-SEARCH-03 | "items using Ember Shard" finds QA Staff of Fire | P1 | `[ ]` planned |
| T-PROMOTION-01 | Wood promoted from unresolved mentions to resource stub | P0.5 | `[ ]` planned |
| T-PROMOTION-02 | Forge promoted to station_type stub | P0.5 | `[ ]` planned |
| T-NODE-01 | Procedural node does not create location page | P0.5/P2 | `[ ]` planned |
| T-NPC-01 | NPC is vendor + quest giver on one page | P2 | `[ ]` planned |
| T-BOSS-01 | Creature is boss in event without duplicate entity | P2 | `[ ]` planned |
| T-VERSION-01 | Old recipe value remains historically findable | P2 | `[ ]` planned |
| T-EVIDENCE-01 | Reported mount capability ranks below confirmed | P1 | `[ ]` planned |
| T-DUPLICATE-01 | Alias + official name merge to one entity | P1 | `[ ]` planned |
| T-UNKNOWN-01 | Unknown future system without new top-level domain | P3 | `[ ]` planned |

---

### T-RESOURCE-01 — Resource with Mining Source, Biome, Rarity, Recipe Usage

**Milestone:** P0.5/P1

| Aspect | Expected |
|--------|----------|
| Setup | QA Ember Shard (or equivalent) with mining source, biome relation, rarity facet, Staff recipe usage |
| Model | OBJECT/resource; acquisition_method:mining; found_in biome; rarity facet; inbound crafted_from |
| Search | "Ember Shard", "fire resource", "mineable fire resource" |
| Detail | Used In widget; classification shows Resource; evidence badges |
| Contribution | Add source observation without new location stub |
| Moderation | Standard approve path |
| Versioning | Nullable game_version |
| **Failure** | Rarity only in free text; Used In empty despite recipe; generic Item classification |

---

### T-RESOURCE-02 — Multi-Source Resource

**Milestone:** P1

| Aspect | Expected |
|--------|----------|
| Setup | One resource with mining + drop relation + sold_by (when implemented) |
| Model | Single OBJECT/resource page; three acquisition paths |
| Search | Filter by acquisition_method returns same entity once |
| Detail | Acquisition section lists all three paths |
| **Failure** | Second page created per source; one path overwrites another |

---

### T-STATION-01 — Generic Forge as Station Type

**Milestone:** P0.5

| Aspect | Expected |
|--------|----------|
| Setup | Promote Forge from Missing Entry Queue |
| Model | SYSTEM/station_type; no PLACE page |
| Search | "forge", "crafted at forge" finds station + inbound items |
| Detail | "Crafts here" derived inbound from crafted_at |
| **Failure** | Forge becomes PLACE or remains unresolved string forever |

---

### T-STATION-02 — Concrete Forge in Settlement

**Milestone:** P0.5

| Aspect | Expected |
|--------|----------|
| Setup | Observation: Forge located in settlement X |
| Model | located_at observation on station_type page; no second entity |
| Detail | Known Locations widget on Forge page |
| **Failure** | Auto-created location page for forge instance |

---

### T-CRAFT-01 — Unresolved Ingredient and Station

**Milestone:** P0.5

| Aspect | Expected |
|--------|----------|
| Setup | QA Staff recipe with Wood + Forge (current P0 state) |
| Model | Wood/Forge = unresolved targets; Entry Needed badges |
| Queue | Both appear in Missing Entry Queue |
| Contribution | Resolve intent prefills Quick-Add |
| **Failure** | Auto-stubs created; silent plain text with no gap signal |

---

### T-CRAFT-02 — Alternative Recipes

**Milestone:** P1

| Aspect | Expected |
|--------|----------|
| Setup | Two recipes for same output item (different station or profession) |
| Model | alternative_group qualifier; both coexist |
| Detail | Recipe widget lists both |
| **Failure** | Second recipe overwrites first |

---

### T-CRAFT-03 — Versioned Recipe Change

**Milestone:** P2

| Aspect | Expected |
|--------|----------|
| Setup | Recipe ingredient qty changes between version A and B |
| Model | Old statement superseded; new preferred |
| Detail | Current shows B; Version History shows A |
| Search | Current ranks above historical unless toggle |
| **Failure** | Old value deleted |

---

### T-MOUNT-01 — Dragon Mount Single Page

**Milestone:** P0.5

| Aspect | Expected |
|--------|----------|
| Setup | Creature with taxonomy dragon, role mount, capabilities rideable + flyable |
| Model | BEING/creature only — no mount subtype page |
| Search | T-SEARCH-01 passes |
| Detail | Mount Capabilities widget with per-capability evidence |
| **Failure** | Requires second "Dragon Mount" page |

---

### T-MOUNT-02 — Observed but Unconfirmed Mount

**Milestone:** P1

| Aspect | Expected |
|--------|----------|
| Setup | Screenshot shows riding; no official confirmation |
| Model | capability:rideable evidence_tier = observed |
| Search | Appears with badge; ranks below confirmed mounts |
| **Failure** | Treated as confirmed; or capability silently dropped |

---

### T-SEARCH-01 — dragon mount

**Milestone:** P0.5

| Aspect | Expected |
|--------|----------|
| Query | "dragon mount" |
| Result | Creature with dragon taxonomy + mount/rideable facets |
| Ranking | Facet combination match beats title-only partial |
| **Failure** | No result when title lacks "mount" |

---

### T-SEARCH-02 — mineable fire resource

**Milestone:** P0.5

| Aspect | Expected |
|--------|----------|
| Query | "mineable fire resource" |
| Result | QA Ember Shard |
| Signals | acquisition_method:mining + element:fire + subtype:resource |
| **Failure** | Title-only miss |

---

### T-SEARCH-03 — items using Ember Shard

**Milestone:** P1

| Aspect | Expected |
|--------|----------|
| Query | "items using Ember Shard" |
| Result | QA Staff of Fire |
| Signals | Inbound crafted_from / ingredient_of index |
| **Failure** | No result or wrong item |

---

### T-PROMOTION-01 — Wood Promotion

**Milestone:** P0.5

| Aspect | Expected |
|--------|----------|
| Setup | ≥2 recipe mentions of Wood |
| Flow | unresolved → candidate → moderator stub → provisional |
| Backlinks | All Staff (and other) recipes link to Wood entity |
| **Failure** | Mentions stay dead text after promotion |

---

### T-PROMOTION-02 — Forge Promotion

**Milestone:** P0.5

| Aspect | Expected |
|--------|----------|
| Setup | Forge in merged Staff recipe |
| Flow | Promote to SYSTEM/station_type stub |
| Relations | crafted_at targets resolve to Forge entity |
| **Failure** | Forge remains string; or wrong domain (PLACE) |

---

### T-NODE-01 — Procedural Resource Node

**Milestone:** P0.5/P2

| Aspect | Expected |
|--------|----------|
| Setup | source_detail "red crystal nodes" on Ember Shard |
| Model | Property on resource; no locations/ post |
| Search | Query finds resource via fact text |
| **Failure** | Location stub or archetype page for procedural node |

---

### T-NPC-01 — Multi-Role NPC

**Milestone:** P2

| Aspect | Expected |
|--------|----------|
| Setup | NPC sells items and gives quest |
| Model | BEING/npc; role vendor + quest_giver facets |
| Widgets | Vendor + Quest sections on one page |
| **Failure** | Two NPC pages |

---

### T-BOSS-01 — Boss in Event

**Milestone:** P2

| Aspect | Expected |
|--------|----------|
| Setup | Creature is boss only during event |
| Model | combat_rank:boss + occurs_during event relation |
| **Failure** | Separate boss entity duplicate |

---

### T-VERSION-01 — Historical Recipe

**Milestone:** P2

| Aspect | Expected |
|--------|----------|
| Setup | Recipe changed in patch |
| Model | Superseded statement retained |
| UI | Version History accessible |
| **Failure** | Only current value exists in BLMETA |

---

### T-EVIDENCE-01 — Evidence-Aware Ranking

**Milestone:** P1

| Aspect | Expected |
|--------|----------|
| Setup | Two rideable creatures: one confirmed, one reported |
| Query | "rideable mount" |
| Result | Confirmed ranks above reported; both visible |
| **Failure** | Equal rank or reported hidden |

---

### T-DUPLICATE-01 — Alias Merge

**Milestone:** P1

| Aspect | Expected |
|--------|----------|
| Setup | Community name + official name for same entity |
| Flow | Merge → alias redirect + backlink reconciliation |
| Search | Both names find canonical entity |
| **Failure** | Two pages; orphaned relations |

---

### T-UNKNOWN-01 — Unknown Future System

**Milestone:** P3

| Aspect | Expected |
|--------|----------|
| Setup | Hypothetical new system (e.g. "star cartography") |
| Model | New SYSTEM subtype + facet group + 2 relation types via registry only |
| **Failure** | Requires 9th top-level domain or bespoke code path |
