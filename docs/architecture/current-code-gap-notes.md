# Current Code Gap Notes

Audit of BoundLore codebase against the content architecture blueprint.  
**Last updated:** 2026-07-10 (Final P0 acceptance sweep)

---

## 1. Resource Quick-Add — Runtime Status (P0-C)

### Entry points

| Route / path | Behavior |
|--------------|----------|
| `/wiki/create-post/?type=resource` | Discovery mode, category locked to `items`, Resource Quick-Add panel |
| `/wiki/resources/` | Resource landing — filters published `items` with resource subtype/payload |
| Items lean form → Item type `resource` | Switches to same Resource Quick-Add panel |

### Form fields (required: Resource Name + Source Type)

Resource Name, Source Type (mining/plant/creature-drop/biome/water/loot/unknown), Biome/Region (optional), Source Detail, Source Entity (optional), Gathering Tool, Rarity (default unknown), Notes, Confidence.

### BLMETA on submit

| Field | Value |
|-------|-------|
| `entity_domain` | `OBJECT` |
| `entity_subtype` | `resource` |
| `discovery_form` | `resource_quick` |
| `discovery_payload.discovery_type` | `resource` |
| `discovery_payload.resource` | Structured block (`source_type`, `biome`, `source_detail`, …) |

### Files

| File | Role |
|------|------|
| `js/resource-quick-add.js` | Form panel, payload builder, synonym warning |
| `js/categories-config.js` | `BOUNDLORE_DISCOVERY_SCHEMA_RESOURCE_QUICK`, route helpers |
| `js/create-post.js` | Route init, submit path, relation skip, meta defaults |
| `js/knowledge-relations.js` | `harvested_from`, resource `appendAutoRelations`, resource serializer |
| `js/wiki-entry-layout.js` | Resource-specific missing-info (no weapon CTAs) |
| `wiki/admin/index.html` | Resource badge + compact preview summary |
| `supabase/sprint1_sync_rpc.sql` | `harvested_from` → `HARVESTED_FROM` |
| `supabase/harvested_from_relation_preparation.sql` | Manual INSERT for existing DBs |

### Auto-relations (resource)

| Condition | Relation |
|-----------|----------|
| Biome/region given | `found_in` → biome; `harvested_from` → biome (mining/plant/biome/water) |
| Explicit source entity + creature-drop/plant/mining | `harvested_from` → entity |
| Generic source detail only | Stored as fact — **no location stub** |

`ingredient_of` not auto-created or persisted — derived at display time from inbound `crafted_from` / merged recipe payloads (P0-E1 Usage widget).

---

## 1b. Resource / Item Usage Widget (P0-E1)

| Behavior | Status |
|----------|--------|
| Data source | Inbound `ingredient_of` derived from published items' `crafted_from` relations + `discovery_payload.recipe` |
| Section title | `Used In` on item/resource detail pages |
| Visibility | Only when at least one usage match exists |
| Display | Target item link, quantity + unit, station, context "Crafting Recipe" |
| Pending contributions | Excluded (`isContributionPost` filter in inbound scan) |
| Pending conflict ×4 | Not shown (conflict contribution never merged into Staff recipe) |
| `ingredient_of` persist | **No** — inverse/derived only |
| Duplicate supplemental | Generic `Ingredient Of` relation group suppressed when Usage section active |

### QA verified

- `qa-ember-shard-511160` → Used In → QA Staff of Fire, 3 piece, Forge
- `qa-staff-of-fire-2b742628` → Crafting Recipe unchanged; no false Used In

### Files

| File | Role |
|------|------|
| `js/knowledge-relations.js` | Recipe craft relations in `collectEntityRelations`; inbound enrichment (qty/unit/station) |
| `js/wiki-entry-layout.js` | `Used In` section rendering |
| `css/style.css` | Usage card styles |
| `wiki/post/index.html` | Script cache bust |

### Still deferred

- Full Recipe browse/index
- Global cross-domain usage beyond CRAFT/recipe-derived paths

---

## 1c. Resources Landing (P0-E2)

| Behavior | Status |
|----------|--------|
| Route | `/wiki/resources/` |
| Data pool | Published `items` posts filtered by `isResourceDiscoveryMeta` |
| Excludes | Contributions, deleted/archived, normal non-resource items |
| Card fields | Name, Resource badge, source type/detail, rarity, found in, derived Used In |
| Usage source | Inbound `ingredient_of` from P0-E1 (recipe / `crafted_from`); not pending conflict |
| Filters | Search, source type, rarity; sort default A–Z by name |
| CTA | `Add Resource` → `/wiki/create-post/?type=resource` |
| Navigation | `Browse Resources` link on `/wiki/items/` (no global nav rework) |
| `ingredient_of` persist | **No** |
| Location stubs | `source_detail` (e.g. red crystal nodes) never linked as location |

### QA verified

- `qa-ember-shard-511160` visible on Resources landing with Mining, red crystal nodes, Unknown rarity, QA Volcanic, Used In → Staff (3 piece, Forge)

### Files

| File | Role |
|------|------|
| `wiki/resources/index.html` | Resources landing page |
| `js/render-posts.js` | `renderResourcesLanding()`, resource cards + filters |
| `wiki/items/index.html` | Browse Resources link |
| `css/style.css` | Resource card styles |

### Still deferred

- Full Recipe browse/index
- Global economy / cross-domain usage index

---

## 1d. Evidence-Tier Badges (P0-E3)

| Behavior | Status |
|----------|--------|
| Tiers displayed | Confirmed, Observed, Reported, Speculative |
| Confidence labels | Single Observation, Corroborated, Verified (+ Repeated Observation, Rumor when present) |
| Data sources | `discovery_payload.resource`, `discovery_payload.recipe`, `confidence_level`, relation props |
| Resource detail hero | Badges when resource subtype + data present |
| Recipe section | Badges in Crafting Recipe block (no raw `2-single-observation`) |
| Resources landing | Badges on resource cards when data present |
| Missing data | No badge forced — null-safe, no `undefined` |

### Files

| File | Role |
|------|------|
| `js/relations-registry.js` | `formatEvidenceTierLabel`, `formatConfidenceLabel`, `renderEvidenceBadgeGroup`, `resolveEvidenceSignals` |
| `js/wiki-entry-layout.js` | Resource hero badges; recipe evidence badges |
| `js/render-posts.js` | Resource landing card badges |
| `css/style.css` | `.bl-evidence-badge`, tier classes |

### QA verified

- `qa-ember-shard-511160` → Reported · Single Observation
- `qa-staff-of-fire-2b742628` → Reported · Single Observation in Crafting Recipe
- `/wiki/resources/` → same badges on Ember card

### Still deferred

- Full reputation/trust system
- Evidence moderation automation
- Global source-review UI

---

## 2. Synonym / Duplicate Warning (P0-C)

| Behavior | Status |
|----------|--------|
| Trigger | On Resource Name blur/input debounce + pre-submit |
| Compare | Normalized names, tokens, light Levenshtein, aliases from BLMETA |
| Pool | Published/pending/approved `items` posts |
| UX | Warn-only banner: Open existing / Continue anyway / Cancel and edit |
| Blocks submit | Only until user acknowledges or no match |

Module: `ResourceQuickAdd.findSimilarResources()`, `namesAreSimilar()`.

Legacy `detectDiscoveryDuplicateCP` **skipped** for resource quick-add (warn-only path).

---

## 3. Add Recipe Intent (P0-D1)

| Behavior | Status |
|----------|--------|
| CTA on item pages (non-resource) | `Add Recipe` in hero actions |
| Form | Ingredients (dynamic rows), station, output qty, unlock, notes, confidence, optional evidence |
| Submit | Pending contribution only — no merge, no stubs |
| Payload | `discovery_payload.intent: add_recipe`, `discovery_payload.recipe`, CRAFT relations |
| Relations persisted | `crafted_from` (per ingredient), `crafted_at` (station) |
| `ingredient_of` | **Not** persisted (derived/inverse for later widgets) |
| Duplicate guard | Same user + target + matching recipe fingerprint blocks re-submit |
| Admin preview | Compact Add Recipe summary + CRAFT relation lines + merge policy note |
| Admin approve & merge | Recipe block + CRAFT relations merged into target item (P0-D2) |
| Live item display | `Crafting Recipe` section on item pages with payload + relation fallback (P0-D3) |
| Duplicate handling | Same fingerprint → `recipe_confirmed` no-op; relations `report_count` bump (P0-D4) |
| Conflict handling | Qty/ingredient mismatch → `needs_review`; admin approve blocked (P0-D4) |

### Files

| File | Role |
|------|------|
| `js/contribution-flow.js` | `add_recipe` mask, recipe form, payload + relations builder |
| `js/wiki-entry-layout.js` | Item-page `Add Recipe` CTA; `Crafting Recipe` display section |
| `js/create-post.js` | Recipe form init, duplicate params on submit |
| `js/knowledge-relations.js` | `mergeRecipePayloadBlock`, `mergeContributionIntoTarget`, craft relation dedupe |
| `wiki/admin/index.html` | Recipe preview, duplicate/conflict badges, blocked conflict approve |

### Duplicate behavior (P0-D4)

- Submit is **not** blocked against an already-merged target (only same-user pending duplicate).
- Approve runs `recipe_confirmed` — no second recipe block, no duplicate CRAFT rows.

### Conflict behavior (P0-D4)

- `recipe_ingredients` / CRAFT quantity mismatch → conflicts logged, existing recipe kept.
- Admin approve **blocked** when preview detects recipe conflicts.

### Still deferred (post P0-E3)

- Full Recipe browse widget / index (P0-F)

---

## 4. CRAFT Relations (P0-B, unchanged)

`crafted_from`, `crafted_at`, `ingredient_of`, `unlocks` — prepared in merge/serializer/SQL. Add Recipe UI writes payload/relations at submit (P0-D1); merge on approve implemented (P0-D2).

---

## 5. SQL / RPC (prepared, not executed)

| Code | Mapping |
|------|---------|
| `HARVESTED_FROM` | `harvested_from` in sync RPC + foundation seed |
| CRAFT codes | From P0-B |

**Manual SQL later:** `supabase/harvested_from_relation_preparation.sql` + redeploy `bl_normalize_discovery_relation_code` if remote DB predates P0-C.

---

## 6. Final P0 Acceptance Sweep (2026-07-10)

**Environment:** `http://localhost:8080` · HEAD `95e2cdf` · branch `main` 25 commits ahead of `origin/main` · no push/deploy/SQL/reset · `qa/e2e-baseline-bmeta.snapshot.json` untracked.

**Overall:** **Grün / teilgrün** — no P0 blockers found in UI regression. Admin conflict queue not re-verified in automation session (Access Denied; no login attempted per instructions). P0-D4 E2E earlier same day verified pending `add_recipe` conflict with approve blocked.

| P0 area | Status | Notes |
|---------|--------|-------|
| Registry / entity subtype baseline | ✅ | Resource subtype on QA Ember Shard; items/resources filters respect subtype |
| CRAFT relations | ✅ | Staff recipe: `crafted_from` ×2, `crafted_at` Forge; no duplicate relation sections |
| Resource Quick-Add + synonym warning | ✅ | Implemented P0-C; not re-run end-to-end this sweep |
| Recipe intent / merge / display | ✅ | Staff: 1 Crafting Recipe block; Ember ×3, Wood ×1, Forge; merged notes visible |
| Duplicate / conflict handling | ✅ | No ×4 on Ember/Staff/Resources; conflict contribution stays pending (P0-D4 prior E2E) |
| Usage widget | ✅ | Ember `Used In` → Staff, 3 piece, Forge; Staff has no false Used In |
| Resources landing | ✅ | `/wiki/resources/` cards, filters (ember search, mining, unknown rarity, nonsense empty) |
| Evidence-tier badges | ✅ | Reported · Single Observation on Ember, Staff recipe, resources card |
| T3 slug protection | ✅ | `quest-anything` → Post not found; no auto quest page |
| Empty states | ✅ | Locations “No location entries”; resources filter empty state |
| Homepage / patch-mode visibility | ✅ | Hero + infographic + lightbox close; no patch guard hang |
| Admin safety | ⚠️ | Automation: Access Denied. Prior session: TheOverseer47, 1 pending add_recipe conflict, approve blocked |
| No false stubs / no contributions in normal lists | ✅ | Items: Staff ×2 + Ember only; no Wood/Forge/Recipe posts; locations: no red crystal nodes |

### Known non-blocking notes

- `/wiki/locations/` shows “No location entries documented yet” (expected current state; Swamp lives under biomes).
- One `add_recipe` conflict (Ember ×4) remains **pending by design** — do not approve/delete.
- Full Recipe browse/index **not** built — deferred P0-F / P1.
- Resources nonsense-filter empty state shows both “No resources match…” and generic “No resources documented yet” (cosmetic).

### Data integrity (UI-only, no SQL)

| Check | Result |
|-------|--------|
| Active Wood posts in browse lists | **0** (not on `/wiki/items/`) |
| Active Forge posts | **0** |
| Active Recipe posts | **0** |
| QA EmberShard duplicate posts | **0** (single QA Ember Shard) |
| `red crystal nodes` as location stub | **0** on `/wiki/locations/` |
| Contributions in normal item/resource lists | **0** |
| Pending `add_recipe` conflict | **1** expected (not re-counted in admin this sweep) |

---

## 7. Still Not Implemented (post-P0)

| Area | Priority |
|------|----------|
| Full Recipe browse/index | P0-F / P1 |
| Boss, NPC, Lore, Mounts, Economy, Events, Player Bases, Talent/Class domains | P1/P2 |

---

## 8. Next Step (pre-Blueprint 2.0)

1. **Optional:** Re-run admin panel check with active TheOverseer47 session to close the ⚠️ on Admin safety.
2. **P0-F / P1:** Full Recipe browse widget/index when prioritized.
3. **When ready:** Push + deploy (not part of this sweep).

---

## 9. Post-P0 Blueprint 2.0 Findings

**Source:** BoundLore Master Architecture Blueprint 2.0 audit (Fable research output, 2026-07-10).  
**Docs materialized:** commit after P0 acceptance (`635eb68`).  
**Status:** Documentation only — no implementation in this phase.

### Fundamental blind spots (priority)

| # | Blind spot | Current code | Target state | Priority |
|---|------------|--------------|--------------|----------|
| 1 | **No Facet Layer** | `js/facet-registry.js` baseline + derived resource badges (P0.5-B) | Full BLMETA `facets` editing, search index, filters | **P0.5** (partial: registry + display) |
| 2 | **No Unresolved Target Lifecycle** | Derived records + read-only Missing Entry Queue (P0.5-C); Entry needed badges on recipes | mentioned → unresolved → candidate → stub via promotion actions | **P0.5** (partial: derived view only) |
| 3 | **Search title/excerpt only** | Client-side structured search signals + ranking (P0.5-E) | Postgres `search_documents` + FTS/pg_trgm | **P0.5** (partial: client baseline) |
| 4 | **No station_type** | `station_type` registered in entity-core + safe create prefill (P0.5-D); Forge still unresolved text | SYSTEM/station_type entity via manual submit; no auto-promotion | **P0.5** (partial: baseline + prefill) |
| 5 | **Resource Classification Display** | ~~Detail shows Category/Subcategory/Type as generic Item~~ | P0.5-A: resource detail shows Type/Source/Rarity; sidebar Type Resource | **Done (P0.5-A)** |
| 6 | **No versioned statements** | Version metadata helpers + tolerant readers (P0.5-F) | valid_from/until/superseded_by; history widget | **P0.5** (partial: metadata baseline) |
| 7 | **No variant/instance model** | variant_of exists but no formal policy | Variant blocks + promotion rules | **P1** |
| 8 | **Browse patch-mode visibility** | ~~`/wiki/browse/` hidden/blank like prior homepage issue~~ | P0.5-A: sync patch-mode script order fix | **Done (P0.5-A)** |
| 9 | **No relation qualifiers spec in code** | quantity/unit ad hoc in recipe payload | Typed qualifiers object on all relations | **P1** |
| 10 | **Symmetric relation double-write** | hostile_to/allied_to may store both directions | Single-write + derived mirror | **P1** |
| 11 | **Mount = subtype assumption** | Docs v1 listed mount as BEING subtype | creature + role/capability facets | **P1** |
| 12 | **No Missing Entry Queue UI** | Read-only admin Missing Entry Queue from published content (P0.5-C) | Admin queue + promote/merge/dismiss actions | **P0.5** (partial: read-only queue) |
| 13 | **No compound search queries** | Cannot answer "items using X" | Query parser + inbound index | **P1** |
| 14 | **Discovery auto-stub path** | `buildStubPostMeta` on discovery submit | Align with promotion policy (no blind stubs) | **P0.5** investigate |

### P0 decisions confirmed by Blueprint 2.0

- Recipes embedded on items — retain
- `ingredient_of` derived — retain
- No Wood/Forge auto-stubs in QA Staff recipe — correct; becomes Missing Entry Queue case
- red crystal nodes as source_detail — retain (not location)
- Pending add_recipe conflict — retain pending

### Documentation added (Blueprint 2.0 materialization)

| File | Purpose |
|------|---------|
| `CONTENT_ARCHITECTURE.md` v2.0 | Master blueprint |
| `facet-registry.md` | Facet groups and Dragon Mount example |
| `entity-promotion-policy.md` | Lifecycle, Wood/Forge rules |
| `search-architecture.md` | Index signals, ranking, recovery |
| `versioning-model.md` | Versioned statements |
| `graph-relations-spec.md` v2 | Qualifiers, proposed types |
| `roadmap.md` | P0 accepted, P0.5 sequence |

### Next implementation step (when authorized)

P0.5-A through P0.5-F are **complete** (see [roadmap.md](./roadmap.md) and P0.5-G acceptance sweep). Next authorized work is **push/deploy decision** or **P1** — not automatic.

---

## 2. P0.5-A — Browse Visibility, Resource Classification, Entry Needed Badges

**Status:** Complete (display/resolver fixes only; no DB, SQL, or stub creation).

| Item | Fix | Result |
|------|-----|--------|
| `/wiki/browse/` visibility | Sync `patch-mode.js` after `supabase-config.js` with `data-bl-patch-mode="1"` (same as homepage/post) | Page loads visible; no blank/dark overlay |
| Resource classification display | `EntityCore.isResourceEntry()`, resource branch in `resolveItemFacts()`, wiki hero facts + sidebar Type/Subcategory | QA Ember Shard shows Type Resource, Source Type Mining, Source Detail, Rarity Unknown; no Add Recipe CTA |
| Unresolved recipe targets | `renderRecipeIngredientName()` adds `Entry needed` badge when target has no resolvable slug/id | QA Staff recipe: Ember Shard linked; Wood ×1 and Forge marked Entry needed |
| Missing Entry Queue | **Not in P0.5-A** | Added in P0.5-C (derived read-only queue) |
| Facet system / search baseline / station_type | **Not in P0.5-A** | Added in P0.5-B/D/E/F |

**Files touched:** `wiki/browse/index.html`, `js/entity-core.js`, `js/post-detail.js`, `js/wiki-entry-layout.js`, `css/style.css`, `wiki/post/index.html` (cache bust).

**Follow-ups (post-P0.5):** Persistent queue, real promotion, Postgres search index, version history UI — see P1/P2 roadmap.

---

## 3. P0.5-B — Facet Registry Baseline

**Status:** Complete (code registry + derivation + minimal badges; no DB migration, search, filters, or admin UI).

| Item | Implementation | Result |
|------|----------------|--------|
| Central registry | `js/facet-registry.js` → `window.BoundLoreFacetRegistry` | 16 facet groups with controlled values, labels, domain/subtype applicability |
| Helpers | normalize, format, collect, derive, render badge/group | Null-safe; old posts without `facets` return empty arrays |
| Resource derivation | `deriveFacetsFromMeta()` from structured payload | QA Ember Shard → acquisition_method mining, rarity unknown, processing_stage raw |
| Detail display | `wiki-entry-layout.js` resource hero | Facet badges separate from evidence badges (max 4) |
| Resources landing | `render-posts.js` resource cards | Facet badges on card tags row |
| Not built | Facet editing, search index, filters, Missing Entry Queue, station promotion | Deferred |

**Derivation rules (conservative):** Only structured fields (`source_type`, `rarity`); no speculative element/taxonomy from names; `processing_stage: raw` only for resource entries without refined/component hints.

**Files touched:** `js/facet-registry.js` (new), `js/wiki-entry-layout.js`, `js/render-posts.js`, `css/style.css`, `wiki/post/index.html`, `wiki/resources/index.html`, `wiki/items/index.html`, `wiki/browse/index.html`.

---

## 4. P0.5-C — Derived Unresolved Target Records + Missing Entry Queue

**Status:** Complete (in-memory derivation + read-only admin queue; no DB table, no stub creation, no promote/merge/dismiss actions).

| Item | Implementation | Result |
|------|----------------|--------|
| Unresolved module | `js/unresolved-targets.js` → `window.BoundLoreUnresolvedTargets` | Normalize, collect from published recipes/relations, merge, sort, render queue |
| Recipe targets | `collectUnresolvedTargetsFromRecipe()` | Unresolved ingredients (Wood) + stations (Forge) from merged published BLMETA only |
| Exclusions | Published-only; skip contributions/pending | QA Ember Shard resolved; pending add_recipe ×4 not counted |
| Admin queue | `wiki/admin/index.html` Overview panel | Read-only table: name, suggested type, mentions, contexts, reason, status |
| Entry-needed UX | `wiki-entry-layout.js` tooltip | `title="Tracked as unresolved target"` on Entry needed badge |
| Not built | Persistent `unresolved_targets` table, Promote/Merge/Dismiss, backlink reconciliation, station promotion, search | Deferred |

**QA expectation:** Wood (OBJECT/resource, recipe ingredient) and Forge (SYSTEM/station_type, crafting station) from QA Staff merged recipe.

**Files touched:** `js/unresolved-targets.js` (new), `wiki/admin/index.html`, `js/wiki-entry-layout.js`, `css/style.css`, `wiki/post/index.html` (cache bust).

---

## 5. P0.5-D — Station Type Baseline + Safe Promotion Path

**Status:** Complete (code baseline + safe create prefill; no DB, no auto-promotion, no stub creation, no real Promote/Merge/Dismiss).

| Item | Implementation | Result |
|------|----------------|--------|
| `station_type` subtype | `EntityCore.isStationTypeEntry()`, display labels, crafting category inference | SYSTEM / station_type recognized; labels Station Type / Crafting Station |
| `crafted_at` semantics | `relations-registry.js` documents SYSTEM/station_type target | Compatible; inverse remains derived |
| Missing Entry Queue links | `buildStartEntryUrl()` + Start Resource/Station Entry buttons | Opens create-post prefill only; no DB write |
| Recipe Entry needed UX | `renderUnresolvedRecipeTarget()` ingredient vs station context | Wood → Resource hint/link; Forge → Station Type hint/link |
| Create prefill Wood | `/wiki/create-post/?type=resource&name=Wood&source=missing-entry` | Resource Quick-Add prefilled; manual submit required |
| Create prefill Forge | `/wiki/create-post/?type=station_type&name=Forge&source=missing-entry` | Station Type Quick-Add prefilled; manual submit required |
| Station detail support | `wiki-entry-layout.js` + `post-detail.js` defensive branch | No false item display; kicker Type Station Type when entry exists |
| Not built | Real promotion, persistent queue, search baseline, Forge/Wood posts, backlink reconciliation | Deferred |

**Files touched:** `js/entity-core.js`, `js/station-type-quick-add.js` (new), `js/unresolved-targets.js`, `js/wiki-entry-layout.js`, `js/post-detail.js`, `js/create-post.js`, `js/resource-quick-add.js`, `js/relations-registry.js`, `css/style.css`, `wiki/create-post/index.html`, `wiki/post/index.html` (cache bust).

---

## 6. P0.5-E — Structured Search Signal Baseline

**Status:** Complete (client-side signal collection + ranking; no DB index, no FTS, no embeddings).

| Item | Implementation | Result |
|------|----------------|--------|
| Search signals module | `js/search-signals.js` → `window.BoundLoreSearchSignals` | buildSearchDocument, scoreSearchDocument, searchDocuments, findMissingEntrySuggestions |
| Signal sources | title, aliases, domain/subtype, facets, resource payload, recipe payload, relations, unresolved targets | QA Ember Shard findable via mining / red crystal nodes / resource; Staff via wood/forge recipe signals |
| Search UI | `js/search.js` extended + new `wiki/search/index.html` | Backward-compatible; missing-entry suggestions visually separated |
| Not built | Persistent `search_documents` table, Postgres FTS/pg_trgm, compound query parser, semantic search, facet browse filters | Deferred |

**Files touched:** `js/search-signals.js` (new), `js/search.js`, `wiki/search/index.html` (new), `css/style.css`, `index.html`, `wiki/post/index.html`, `wiki/browse/index.html`, `wiki/resources/index.html`, `wiki/items/index.html`.

---

## 7. P0.5-F — Versioning Metadata Baseline

**Status:** Complete (code helpers + tolerant readers; no DB schema, no history UI, no backfill).

| Item | Implementation | Result |
|------|----------------|--------|
| Versioning module | `js/versioning-model.js` → `window.BoundLoreVersioning` | normalize/extract/attach, current/historical/superseded checks, optional badges |
| Facts / relations / recipes / facets | Readers preserve `version` + relation `qualifiers`; sanitize no longer strips version fields | Old posts without version data unchanged |
| Recipe merge | `sanitizeRecipeFactForMeta` + merge preserve incoming `version` when present | QA Staff recipe untouched; no approve run |
| Search signals | Low-weight version signals when metadata present | No change when version absent |
| Display | Optional version badges on recipe/admin preview only when data exists | QA Staff / Ember show no version badges |
| Not built | Version History widget, patch UI, DB migration, backfill, fake game versions | Deferred P2 |

**Files touched:** `js/versioning-model.js` (new), `js/knowledge-relations.js`, `js/entity-core.js`, `js/facet-registry.js`, `js/wiki-entry-layout.js`, `js/search-signals.js`, `css/style.css`, `wiki/post/index.html`, `wiki/search/index.html`, `wiki/admin/index.html`, `wiki/resources/index.html`.

---

## 8. P0.5-G — Acceptance Sweep & Pre-Push Readiness

**Status:** Complete (regression + docs alignment; no push, deploy, SQL, or feature work).

| Check | Result |
|-------|--------|
| Git @ `014e1cd`; `qa/e2e-baseline-bmeta.snapshot.json` untracked | Confirmed |
| Core modules exist: facet-registry, unresolved-targets, station-type-quick-add, search-signals, versioning-model | Confirmed |
| Global APIs on wiki pages: `BoundLoreFacetRegistry`, `BoundLoreUnresolvedTargets`, `BoundLoreSearchSignals`, `BoundLoreVersioning` | Confirmed |
| Station type prefill API | `window.StationTypeQuickAdd` on create-post (not `BoundLoreStationTypeQuickAdd`) |
| Versioning smoke | Equivalent checks pass via `extractVersionMetadata` / `isCurrentStatement` / `isHistoricalStatement` |
| Regression URLs (home, browse, resources, items, staff, ember, ogre, swamp, search, prefill) | Green on `http://localhost:8080` |
| Wood / Forge posts | None — missing-entry suggestions only |
| Pending add_recipe conflict | Untouched |
| Admin UI | Login redirect — not visually verified; no auth/repair actions |
| Docs | `roadmap.md`, `current-code-gap-notes.md`, `e2e-content-matrix.md` updated for P0.5 completion |

**Outcome:** P0.5-A–F accepted as pre-push foundation. P1 awaits explicit authorization.

---

## 9. P1-A.1 — Relation Registry 2.0 / Qualifier Baseline

**Status:** Complete (registry + qualifier vocabulary + tolerant helpers; no SQL, no UI, no data migration).

| Item | Implementation | Result |
|------|----------------|--------|
| Qualifier registry | `QUALIFIER_REGISTRY` in `js/relations-registry.js` | quantity, unit, station, versioning fields, evidence/confidence, etc. |
| Registry 2.0 fields | `REGISTRY_2_OVERRIDES` merged at read time | persistence, cardinality, dedupe_key, search_expansion, promotion_weight, version_support, status |
| Active relations | found_in, crafted_from, crafted_at, ingredient_of, drops, … | `crafted_from` persisted_forward; `ingredient_of` derived_inverse |
| Reserved P1 types | gathered_via, crafted_by_profession, sold_by, reward_of, … | status `reserved`; no production flows |
| Helpers | normalizeRelationQualifiers, getRelationPersistence, isDerivedRelation, … | Null-safe; unknown types tolerated |
| Search | `js/search-signals.js` | Reserved relation types skipped in relation search signals |
| Not built | sold_by/gathered_via/crafted_by_profession UI, SQL, migration | Deferred P1+ |

**Deployment freeze remains active** — no push/deploy.

---

## 10. P1-A.2 — Relation Qualifier Preservation & Reader Tolerance

**Status:** Complete (reader/normalizer tolerance; no SQL, no UI, no migration).

| Item | Implementation | Result |
|------|----------------|--------|
| Qualifier extraction | `extractRelationQualifiers`, `mergeRelationQualifiers`, `preserveRelationQualifiers`, `normalizeRelationRecord` | Merges `qualifiers` + legacy top-level fields; null-safe |
| Recipe sanitize | `sanitizeRecipeFactForMeta`, `buildCraftRelationsFromRecipe` | Ingredient `qualifiers` preserved; legacy quantity/unit unchanged for display |
| Relation sanitize | `sanitizeRelationForMeta` | Qualifiers preserved alongside legacy fields |
| Recipe display | `wiki-entry-layout.js` | Reads quantity/unit from qualifiers as fallback only; visual output unchanged |
| Contribution | `buildRecipePayload` | Future-safe `qualifiers` pass-through when present |
| Search | `collectQualifierSearchSignals` | Optional non-version qualifier signals; reserved relations still skipped |
| Not built | sold_by/gathered_via UI, SQL, migration | Deferred P1+ |

**Deployment freeze remains active** — no push/deploy.
