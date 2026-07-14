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

---

## 11. P1-A.3 — Relation Registry 2.0 Acceptance Sweep

**Status:** Complete (read-only sweep; no code/data changes beyond docs).

| Check | Result |
|-------|--------|
| Registry API (`BoundLoreRelationsRegistry`) | Green — persistence, reserved types, qualifier helpers |
| `crafted_from` / `crafted_at` | `persisted_forward` |
| `ingredient_of` | `derived_inverse` (not double-persisted) |
| Reserved types (`sold_by`, `gathered_via`, `crafted_by_profession`) | Registry-only; skipped in search; no UI flows |
| QA Staff / QA Ember regressions | Unchanged recipe/resource display |
| Search (mining, wood, forge, resource, red crystal nodes, qa ember shard) | Unchanged |
| Wood/Forge | Missing Entry Suggestions only; no posts |
| Pending `add_recipe` conflict | Not touched |
| Admin | Session-dependent (automation browser: login redirect) |

**P1-A foundation block (A.1 + A.2 + A.3) accepted locally.** P1-B not started. Deployment freeze remains active.

---

## 12. P1-B.1 — Contribution Intent Registry Baseline

**Status:** Complete (registry + defensive reader hooks; no SQL, no UI, no migration).

| Item | Implementation | Result |
|------|----------------|--------|
| Registry module | `js/contribution-intent-registry.js` | `BoundLoreContributionIntentRegistry` with intent defs + helpers |
| Active intents | add_recipe, add_stats, add_effect, add_behavior, add_spawn, add_known_item, … | Match existing `ContributionFlow.MASKS` codes |
| Reserved P1 | add_capability_role, correct_classification, add_alias, resolve_unresolved_target, … | status `reserved`; no buttons/merge flows |
| Integration | `contribution-flow.js`, `getContributionInfo` | Intent normalize only; add_recipe flow unchanged |
| Script load | post, admin, create-post, edit-post | `contribution-intent-registry.js?v=1` |
| Not built | new contribution buttons, merge/approve changes, SQL | Deferred P1-B+ |

**Deployment freeze remains active** — no push/deploy.

---

## 13. P1-B.2 — Contribution Payload & Admin Preview Tolerance

**Status:** Complete (payload normalizers + admin preview hardening; no SQL, no UI, no migration).

| Item | Implementation | Result |
|------|----------------|--------|
| Payload helpers | `normalizeContributionRecord`, `getContributionPreviewSafety`, … | Legacy + future-safe fields preserved |
| getContributionInfo | Enriched with `intent_label`, `preview_safety`, normalized payload | Null-safe |
| Admin preview | Reserved/unknown intents show safe banner; approve disabled | add_recipe conflict logic unchanged |
| approveContributionA | Early guard for non-actionable intents | No merge for reserved/unknown |
| Cache bust | `contribution-intent-registry.js?v=2` | post/admin/create/edit |
| Not built | new contribution buttons, merge/approve on pending conflict | Deferred |

**Deployment freeze remains active** — no push/deploy.

---

## 14. P1-B.3 — Contribution Intent Registry Acceptance Sweep

**Status:** Complete (read-only sweep; no code/data changes beyond docs).

| Check | Result |
|-------|--------|
| Registry API (`BoundLoreContributionIntentRegistry`) | Green — 11 active, 12 reserved intents |
| `add_recipe` | active; recipe conflict blocks approve separately |
| Reserved intents | Not in wiki UI; `approveAllowed: false` |
| Unknown intents | Safe fallback; no crash |
| QA Staff / Search regressions | Unchanged |
| Pending `add_recipe` conflict | Not touched |
| Admin | Session-dependent |

**P1-B foundation block (B.1 + B.2 + B.3) accepted locally.** P1-C.1 started. Deployment freeze remains active.

---

## 15. P1-C.1 — Evidence Rank & Dispute Baseline

**Status:** Complete (local baseline; no SQL, no UI, no migration).

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Evidence rank registry | `js/evidence-rank.js` | `window.BoundLoreEvidenceRank` — tiers, confidence, statement rank, dispute state, status |
| Normalizers | `normalizeEvidenceTier`, `normalizeConfidence`, `normalizeStatementRank`, `normalizeDisputeState`, `normalizeStatementStatus` | Null-safe; aliases for legacy tokens; numeric 0–100 confidence kept separate from enum |
| Readers | `readEvidenceSignals`, `normalizeEvidenceSignals`, `hasEvidenceSignals`, `normalizeStatementState` | Tolerates payload/meta/qualifiers/version fields; no writes |
| Weights / compare | `getEvidenceWeight`, `getRankWeight`, `compareEvidenceRank` | Internal ranking prep only |
| Entry layout hook | `js/wiki-entry-layout.js` | `_rankContext` attached; existing evidence badges unchanged |
| Search hook | `js/search-signals.js` | `evidence_context` on search documents; max +2 score bump when explicit evidence present |
| Admin hook | `wiki/admin/index.html` | `_evidenceRankContext` on preview info; no new actions or badges |
| Script wiring | post, admin, search, resources, items | `evidence-rank.js?v=1` after `versioning-model.js` when present |

| Not built | real dispute-resolution UI, auto-ranking, auto-promote, merge/approve changes, SQL | Deferred P1-C+ |
| Unchanged | existing evidence badges, conflict preview, pending `add_recipe` approve block | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 16. P1-C.2 — Evidence State Rendering & Admin Preview Tolerance

**Status:** Complete (local; no SQL, no data migration, no moderation actions).

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Display helpers | `js/evidence-rank.js` | `getEvidenceLabel`, `getStatementStateBadges`, `shouldDisplayDisputeBadge`, `renderStatementStateBadgeGroup`, etc. |
| Entry layout | `js/wiki-entry-layout.js` | State badges appended only when explicit disputed/deprecated/superseded fields exist |
| Admin preview | `wiki/admin/index.html` | `renderContributionEvidenceStateHtmlA` — read-only info line when state fields present |
| Search | `js/search-signals.js` | `getSearchStatementStateAdjustment` — deprecated/superseded/disputed penalized; QA rankings unchanged |

| Unchanged | existing evidence badges (Reported/Single Observation), recipe conflict preview, pending approve block | Verified locally |
| Not built | dispute-resolution UI, auto-ranking, merge/approve changes, SQL | Deferred P1-C+ |

**P1-C foundation block (C.1 + C.2) accepted locally.** Deployment freeze remains active.

---

## 17. P1-C.3 — Evidence Rank Acceptance Sweep

**Status:** Complete (read-only sweep; no code/data changes beyond docs).

| Check | Result |
|-------|--------|
| `BoundLoreEvidenceRank` API (normalizers, weights, display gates) | Green |
| QA Staff / QA Ember regressions | Unchanged — Reported / Single Observation; no `.bl-state-badges` |
| Search (qa ember shard, resource, mining, red crystal nodes, wood, forge) | Unchanged |
| Pending `add_recipe` conflict | Not touched |
| Admin | Session-dependent (login redirect) |
| SQL / DB / data migration | None |

**P1-C foundation block (C.1 + C.2 + C.3) accepted locally.** Ready for P1-D planning. Deployment freeze remains active.

---

## 18. P1-D.1 — Facet Browse Filter Baseline

**Status:** Complete (local; client-side only; no SQL, no search index, no query parser).

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Facet browse module | `js/facet-browse.js` | `window.BoundLoreFacetBrowse` — URL parse, normalize, match, filter |
| URL params | `?facet=group:value`, `?acquisition_method=`, `?processing_stage=`, `?rarity=`, etc. | Comma/multi-`facet` tolerant |
| Resources landing | `js/render-posts.js` + `wiki/resources/index.html` | Facet filter + summary + quick links; unchanged without filters |
| Browse page | `wiki/browse/index.html` | Active filter summary + link to matching resources |
| QA Ember Shard | acquisition_method mining, processing_stage raw, rarity unknown | Filterable when facets present |

| Not built | Postgres search index, pg_trgm, embeddings, query parser, SQL | Deferred P1-D+ |
| Unchanged | `/wiki/search/`, `/wiki/items/`, existing resource cards | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 19. P1-D.2 — Facet Browse Filter Acceptance Sweep

**Status:** Complete (read-only sweep; no code/data changes beyond docs).

| Check | Result |
|-------|--------|
| `BoundLoreFacetBrowse` API (parse, normalize, match) | Green |
| QA Ember Shard via mining/raw/unknown filters | Visible on Resources |
| Non-match (`?acquisition_method=fishing`) | Empty/filter message, no crash |
| Browse active-filter hint + Resources link | Green |
| Search (qa ember shard, resource, mining, red crystal nodes, wood, forge) | Unchanged |
| Pending `add_recipe` conflict | Not touched |
| Admin | Session-dependent (automation Access Denied) |
| SQL / search index / query parser | None |

**P1-D foundation block (D.1 + D.2) accepted locally.** Ready for P1-E planning. Deployment freeze remains active.

---

## 20. P1-E.1 — Structured Search Query Parser Baseline

**Status:** Complete (local; client-side only; no SQL, no search index, no embeddings).

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Query parser | `js/search-query-parser.js` | `window.BoundLoreSearchQueryParser` — facet/usage/crafting/relation hints |
| Search integration | `js/search-signals.js`, `js/search.js` | Optional ranking boosts; signals remain source-of-truth |
| Search UI | `wiki/search/index.html` | Small “Interpreted as: …” intent line when hints present |
| Patterns | usage, crafting, mining/resource, wood/forge missing entry | Hints only — no hard filters |

| Not built | Postgres FTS, pg_trgm, embeddings, search_documents table, SQL | Deferred P1-E+ |
| Unchanged | mining/wood/forge baseline queries, missing entry suggestions | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 21. P1-E.2 — Structured Search Query Parser Acceptance Sweep

**Status:** Complete (local read-only sweep; client-side hints only; no SQL, no search index, no embeddings).

| Check | Result |
|-------|--------|
| `BoundLoreSearchQueryParser` API | Green — normalize, tokenize, parse, summary, applyParsedQueryToSignals |
| Parser patterns | usage (`items using Ember Shard`), crafting (`crafted at forge`), acquisition/resource (`mining resource`, `mineable resource`, `resource mining`), rarity (`unknown rarity resource`), missing entry (`wood`, `forge`) |
| Ranking model | Hints/boosts only via `applyParsedQueryToSignals`; existing search signals remain source-of-truth; no hard filters |
| Intent UI | Small “Interpreted as: …” line; no debug dumps |
| Search regressions | mining/wood/forge/qa ember/resource/red crystal unchanged or better |
| Facet browse | Resources `?acquisition_method=mining` unchanged (independent of parser) |
| Evidence penalties (P1-C) | Preserved in `search-signals.js` |
| Reserved relations (P1-A) | Not productively activated |
| Admin | Session-dependent — automation Access Denied; no queue/conflict actions |
| Pending `add_recipe` conflict | Not touched |

**P1-E.2 acceptance sweep completed; client-side query parser hints only; no SQL/backend search/search index.** P1-E foundation block (E.1 + E.2) accepted locally. Ready for P1-F planning. Deployment freeze remains active.

---

## 22. P1-F.1 — Profession & Capability Model Baseline

**Status:** Complete (local; registry-only; no SQL, no UI, no data migration).

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Profession/capability registry | `js/profession-capability-registry.js` | `window.BoundLoreProfessionCapabilityRegistry` |
| Entity model | `PROFESSION_ENTITY_MODEL` | SYSTEM/profession_type — **no** new top-level domain |
| Mount model | role/capability on BEING | No mount subtype page |
| Search integration | `js/search-signals.js` | Low-weight `profession_capability` signals only |
| Reserved relations | `js/relations-registry.js` | `crafted_by_profession`, `gathered_via`, `tamed_via`, `mountable_by` stay reserved |

| Not built | Profession UI, skilltree, leveling, crafting/gathering flows, mount/taming UI, SQL | Deferred P1-F+ |
| Unchanged | mining/wood/forge search, QA Staff/Ember, facet browse, missing entry suggestions | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 23. P1-F.2 — Profession & Capability Model Acceptance Sweep

**Status:** Complete (local read-only sweep; registry-only; no SQL, no UI, no data migration).

| Check | Result |
|-------|--------|
| `BoundLoreProfessionCapabilityRegistry` API | Green — normalizers, extractors, has* checks, display labels |
| Entity model | `PROFESSION_ENTITY_MODEL` → SYSTEM/profession_type; **no** new top-level domain |
| Mount model | role/capability on BEING; no mount subtype page |
| Reserved relations | `crafted_by_profession`, `gathered_via`, `tamed_via`, `mountable_by` — reserved, not persisted_forward |
| Search integration | Low-weight `profession_capability` signals; no hard filters |
| Search regressions | mining/wood/forge/qa ember/resource/red crystal/parser queries unchanged |
| rideable/flyable mount | No crash (Smought via facet match OK) |
| QA Staff / QA Ember | Unchanged; no new UI sections |
| Wood/Forge | Missing-entry suggestions only; no posts |
| Facet browse | Resources `?acquisition_method=mining` unchanged |
| Admin | Session-dependent — automation Access Denied; no queue/conflict actions |
| Pending `add_recipe` conflict | Not touched |

**P1-F.2 acceptance sweep completed; model registry only; no profession UI, no SQL, no data migration.** P1-F foundation block (F.1 + F.2) accepted locally. Ready for P1-G planning. Deployment freeze remains active.

---

## 24. P1-G.1 — Symmetric Relation Dedupe & Derived Mirror Baseline

**Status:** Complete (local; registry + defensive reader/search dedupe; no SQL, no data migration).

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Mirror/symmetry metadata | `js/relations-registry.js` | `directionality`, `mirror_behavior`, `canonical_pair_order` |
| Dedupe helpers | `getRelationDedupeKey`, `dedupeRelationRecords`, `deriveMirrorRelation`, etc. | Null-safe; qualifiers preserved |
| Reader dedupe | `js/knowledge-relations.js` | `dedupeRelationsForDisplay` delegates to registry when loaded |
| Search dedupe | `js/search-signals.js` | Relation signals deduped before scoring |
| Symmetric types | `hostile_to`, `allied_to`, `related_to` | `symmetric_dedupe`; not productively activated in UI |
| Directed unchanged | `crafted_from`, `crafted_at`, `found_in` | Preserve endpoint order |
| Derived inverse | `ingredient_of`, `dropped_by` | Remain derived; search skips duplicate forward/inverse |

| Not built | SQL migration, repair script, auto-merge existing data, symmetric UI | Deferred P1-G+ |
| Unchanged | QA Staff recipe, QA Ember, mining/wood/forge search | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 25. P1-G.2 — Symmetric Relation Dedupe Acceptance Sweep

**Status:** Complete (local read-only sweep; reader/search dedupe only; no SQL, no repair, no data migration).

| Check | Result |
|-------|--------|
| Mirror/dedupe API | Green — directionality, mirror_behavior, canonical pair, dedupe keys |
| Directed | `crafted_from`, `crafted_at`, `found_in` — endpoint order preserved; staff→ember ≠ ember→staff |
| Derived inverse | `ingredient_of`, `dropped_by` — derived_inverse; not primary truth |
| Symmetric | `hostile_to`, `allied_to`, `related_to` — symmetric_dedupe; a↔b → 1 record |
| Reserved | P1-F quartet reserved; `shouldPersistRelationDirection` false |
| Reader/search dedupe | Defensive only; no data migration or repair |
| Search regressions | mining/wood/forge/qa ember/parser queries unchanged |
| QA Staff / QA Ember | Recipe, Used In, badges unchanged |
| Wood/Forge | Missing-entry suggestions; no posts |
| Admin | Session-dependent — automation Access Denied; no queue actions |
| Pending `add_recipe` conflict | Not touched |

**P1-G.2 acceptance sweep completed; reader/search dedupe only; no SQL, no repair, no data migration.** P1-G foundation block (G.1 + G.2) accepted locally. Ready for next P1 milestone. Deployment freeze remains active.

---

## 26. P1-H.1 — P1 Foundation Final Acceptance & P2 Readiness Gate

**Status:** Complete (local integration gate; client-side foundation only; no SQL, no deploy, no data migration).

| P1 block | Registry / module | Gate result |
|----------|-------------------|-------------|
| P1-A | `BoundLoreRelationsRegistry` | Green — qualifiers, reserved relations, symmetric dedupe |
| P1-B | `BoundLoreContributionIntentRegistry` | Green — active/reserved intents, preview safety |
| P1-C | `BoundLoreEvidenceRank` | Green — weights, dispute display gates |
| P1-D | `BoundLoreFacetBrowse` | Green — URL facet filters (resources/browse) |
| P1-E | `BoundLoreSearchQueryParser` | Green — hint-only parser (search page) |
| P1-F | `BoundLoreProfessionCapabilityRegistry` | Green — SYSTEM/profession_type, no UI |
| P1-G | Relation mirror/dedupe helpers | Green — reader/search defensive dedupe |

| Regression | Result |
|------------|--------|
| QA Staff / QA Ember / Ogre / Swamp | Unchanged |
| Resources mining/raw/unknown | QA Ember visible |
| Resources fishing | Empty state OK |
| Search mining/wood/forge/parser queries | Unchanged or better |
| Wood/Forge | Missing-entry only; no posts |
| Reserved UI flows | Not visible |
| Admin | Session-dependent — automation Access Denied |
| Pending `add_recipe` conflict | Not touched |

**P1-H.1 final foundation gate completed locally. P1 registries and reader/search tolerances are accepted as client-side foundation. No SQL, no backend search, no data migration, no deploy. P2 may start from this baseline.** Deployment freeze remains active.

---

## 27. P2-A.1 — NPC / Quest / Event Model Activation Baseline

**Status:** Complete (local; model registry + defensive reader/search tolerance; no SQL, no UI, no data migration).

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Content model registry | `js/content-model-registry.js` | `window.BoundLoreContentModelRegistry` |
| NPC model | BEING / `npc` | `active_model`; `create_ui: false`; `admin_flow: false` |
| Quest model | KNOWLEDGE / `quest` | Not a top-level domain |
| Event model | EVENT / `event` | Uses existing EVENT domain |
| Reserved models | quest_chain, community_event, occurrence | `reserved_model`; no UI |
| Search signals | `js/search-signals.js` | Low-weight `content_model` group; no hard filters |
| Query parser hints | `js/search-query-parser.js` | `npc`, `quest`, `event` type hints |
| Reader context | `js/wiki-entry-layout.js` | `contentModelContext` only; no new sections |
| Subtype labels | `js/entity-core.js` | npc / quest / event display labels |

| Not built | NPC/Quest/Event create UI, quest tracker, event calendar, vendor/economy, occurrence system, SQL, data migration | Deferred P2+ |
| Unchanged | QA Staff, QA Ember, Ogre, Swamp, mining/wood/forge search, Wood/Forge missing-entry only | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 28. P2-A.2 — NPC / Quest / Event Model Acceptance Sweep

**Status:** Complete (local acceptance sweep; registry/read/search baseline only; no SQL, no UI, no data migration).

| Acceptance | Result |
|------------|--------|
| ContentModelRegistry API (post page) | Green — active models, create_ui/admin_flow false |
| Reserved models (quest_chain, community_event, occurrence) | Green — reserved_model; no UI |
| Search parser hints (npc/quest/event + compound queries) | Green — hint-only; no crash |
| Search regressions (mining/wood/forge/parser) | Unchanged |
| QA Staff / QA Ember / Ogre / Swamp | Unchanged; no new NPC/Quest/Event sections |
| Resources mining | QA Ember visible |
| Wood/Forge | Missing-entry only; no posts |
| Admin | Session-dependent — automation not verified |
| Pending `add_recipe` conflict | Not touched |

**P2-A.2 acceptance sweep completed; NPC/Quest/Event models accepted as registry/read/search baseline only. No create UI, no admin flow, no SQL, no data migration.** P2-A foundation block (A.1 + A.2) accepted locally. Ready for P2-B. Deployment freeze remains active.

---

## 29. P2-B.1 — Quest Objective, Reward & Event Occurrence Baseline

**Status:** Complete (local; quest/event substructure registry; no SQL, no UI, no data migration).

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Quest/Event registry | `js/quest-event-registry.js` | `window.BoundLoreQuestEventRegistry` |
| Quest objectives | structured fields on KNOWLEDGE/quest | kill/collect/gather/… — not posts |
| Quest rewards | structured facts | item/resource/reputation/… — link only if post exists |
| Event occurrences | EVENT/event substructures | scheduled/active/… — no create flow |
| NPC services | BEING/npc roles | quest_giver/vendor/trainer/… — no top-level type |
| Reserved relations | reward_of, occurs_during, sold_by | remain reserved in relations-registry |
| Search signals | `js/search-signals.js` | low-weight `quest_event` group |
| Query parser hints | `js/search-query-parser.js` | quest reward/objective, npc vendor/trainer, event schedule |
| Reader context | `js/wiki-entry-layout.js` | `questEventContext` only; no new sections |
| Content model schema | `js/content-model-registry.js` | optional schema enrichment |

| Not built | Quest tracker, event calendar, vendor/economy, reward claim, occurrence editor, SQL | Deferred P2-B+ |
| Unchanged | QA Staff/Ember/Ogre/Swamp, mining/wood/forge search, create_ui/admin_flow false | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 30. P2-B.2 — Quest / Event / NPC Service Acceptance Sweep

**Status:** Complete (local acceptance sweep; registry/read/search baseline only; no SQL, no UI, no data migration).

| Acceptance | Result |
|------------|--------|
| QuestEventRegistry API (post page) | Green — objective/reward/event/service normalize + signals |
| ContentModelRegistry integration | Green — active models, create_ui/admin_flow false, supported fields |
| Reserved relations | reward_of, occurs_during, sold_by — persistence `reserved` |
| Search parser hints | quest reward/objective/giver, npc vendor/trainer, event schedule, world/seasonal event |
| Search regressions | mining/wood/forge/parser/npc/quest/event unchanged |
| QA Staff / QA Ember / Ogre / Swamp | Unchanged; no Quest/Event/NPC-Service sections |
| Resources mining | QA Ember visible |
| Wood/Forge | Missing-entry only; no posts |
| Admin | Session-dependent — automation not verified |
| Pending `add_recipe` conflict | Not touched |

**P2-B.2 acceptance sweep completed; Quest objectives, rewards, event occurrences, and NPC services accepted as registry/read/search baseline only. No create UI, no admin flow, no SQL, no data migration.** P2-B foundation block (B.1 + B.2) accepted locally. Ready for P2-C. Deployment freeze remains active.

---

## 31. P2-C.1 — Vendor / Economy / Trade Offer Baseline

**Status:** Complete (local; economy registry + defensive reader/search tolerance; no SQL, no shop UI, no data migration).

| Deliverable | Location | Notes |
|-------------|----------|-------|
| Economy registry | `js/economy-registry.js` | `window.BoundLoreEconomyRegistry` |
| Trade offers | structured fields | sell/buy/barter/… — not posts |
| Price/currency | structured values | gold/reputation/event_currency — not posts |
| Availability/stock | structured states | available/seasonal/limited/… |
| Vendor context | BEING/npc service | vendor_inventory + economy_context |
| Reserved relation | `sold_by` | remains reserved; not persisted_forward |
| Search signals | `js/search-signals.js` | low-weight `economy` group |
| Query parser hints | merchant, sold by, price, gold, event currency, … | hint-only |
| Reader context | `js/wiki-entry-layout.js` | `economyContext` only; no new sections |

| Not built | Shop UI, marketplace, buy/sell, currency posts, price history, SQL | Deferred P2-C+ |
| Unchanged | QA Staff/Ember/Ogre/Swamp, mining/wood/forge search, create_ui/admin_flow false | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 32. P2-C.2 — Vendor / Economy / Trade Offer Acceptance Sweep

**Status:** Complete (local acceptance sweep; registry/read/search baseline only; no SQL, no shop UI, no data migration).

| Acceptance | Result |
|------------|--------|
| EconomyRegistry API (post page) | Green — offer/currency/price/availability normalize + signals |
| ContentModelRegistry / QuestEventRegistry | Green — economy_context, vendor_inventory; create_ui/admin false |
| Reserved relations | sold_by, reward_of, occurs_during — persistence `reserved` |
| Search parser hints | vendor/merchant/sold by/price/gold/event currency/seasonal vendor | Green |
| Search regressions | mining/wood/forge/parser/npc vendor/quest reward unchanged |
| QA Staff / QA Ember / Ogre / Swamp | Unchanged; no vendor/price/offer sections |
| Resources mining | QA Ember visible |
| Wood/Forge | Missing-entry only; no posts |
| Admin | Session-dependent — automation not verified |
| Pending `add_recipe` conflict | Not touched |

**P2-C.2 acceptance sweep completed; Vendor/economy/trade offers accepted as registry/read/search baseline only. No shop UI, no admin flow, no SQL, no data migration.** P2-C foundation block (C.1 + C.2) accepted locally. Ready for P2-D. Deployment freeze remains active.

---

## 33. P2-D.1 — Version History & Live-Service Validity Baseline

**Status:** Complete (local; registry/read/search baseline only; no SQL, no Patch Mode workflow, no data migration).

| Layer | Module | Behavior |
|-------|--------|----------|
| Version helpers | `js/versioning-model.js` → `window.BoundLoreVersioning` | normalize/read/validity/history gates; nullable `game_version` |
| Supported fields | game_version, valid_from, valid_until, superseded_by, introduced_in, changed_in, removed_in | Structured metadata only — not posts |
| Display gates | `shouldDisplayVersionBadge`, `shouldDisplayVersionHistory`, `shouldDisplayOutdatedBadge` | false when empty/unknown; no QA badges forced |
| Reader context | `js/wiki-entry-layout.js` | `versionContext`; history UI only with real version data |
| Admin preview | `wiki/admin/index.html` | read-only version badges/history when data exists |
| Search parser hints | version, patch, outdated, changed/removed/introduced in, superseded, historical | hint-only; low-weight |
| Search signals | `js/search-signals.js` | existing `version` group stays weak weight |
| Reserved intent | `add_version_change` | remains reserved |
| Reserved relations | `introduced_in`, `changed_in`, `removed_in` | persistence `reserved` |

| Not built | Patch Mode workflow, version editor, game-version posts, auto-outdated marking, data backfill, SQL | Deferred P2-D+ |
| Unchanged | QA Staff/Ember/Ogre/Swamp, mining/wood/forge/vendor search, evidence/state badges | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 34. P2-D.2 — Version History & Live-Service Validity Acceptance Sweep

**Status:** Complete (local acceptance sweep; read-only helper/search/admin-preview baseline only; no SQL, no Patch Mode workflow, no data migration).

| Acceptance | Result |
|------------|--------|
| BoundLoreVersioning API (QA Staff post) | Green — normalize/read/validity/history gates |
| Empty version fields | No badges; shouldDisplay* false |
| Reserved intent/relations | add_version_change; introduced/changed/removed_in — persistence `reserved` |
| Search parser hints | version/patch/outdated/changed/removed/introduced/superseded/historical — hint-only |
| Search regressions | mining/wood/forge/vendor/economy/parser unchanged |
| QA Staff / QA Ember / Ogre / Swamp | Unchanged; 0 version badges/sections |
| Resources mining | QA Ember visible |
| Wood/Forge | Missing-entry only; no posts |
| Admin | Session-dependent — automation not verified |
| Pending `add_recipe` conflict | Not touched |

**P2-D.2 acceptance sweep completed; Version history and live-service validity accepted as read-only helper/search/admin-preview baseline only. No patch workflow, no SQL, no data migration.** P2-D foundation block (D.1 + D.2) accepted locally. Ready for P2-E. Deployment freeze remains active.

---

## 35. P2-E.1 — Resource Node Type & Acquisition Source Baseline

**Status:** Complete (local; registry/read/search baseline only; no SQL, no node posts, no data migration).

| Layer | Module | Behavior |
|-------|--------|----------|
| Resource node registry | `js/resource-node-registry.js` → `window.BoundLoreResourceNodeRegistry` | node_type, acquisition sources, observation context |
| node_type | structured field / facet / observation | **not** a post by default; **not** a PLACE page |
| source_detail | text signal (e.g. red crystal nodes) | preserved as search signal; **no** crystal taxonomy inference |
| Content model | `OBJECT:resource` fields | node_type, source_type, source_detail, acquisition_sources, node_observations |
| Facet group | `node_type` future-safe | explicit field only; not derived from source_detail |
| Search parser hints | resource node, mining node, ore vein, red crystal nodes, fishing spot, … | hint-only; low-weight |
| Search signals | `resource_node` group | weak weight; source_detail stays in `resource` group |
| Reader context | `js/wiki-entry-layout.js` | `resourceNodeContext` only; no node-type sections on QA data |

| Not built | Node create UI, node posts, location/map/coordinates UI, spawn tracker, SQL | Deferred P2-E+ |
| Unchanged | QA Ember (Mining/Raw/Unknown/red crystal nodes), QA Staff/Ogre/Swamp, mining/wood/forge search | Verified locally |

**Deployment freeze remains active** — no push/deploy.

---

## 36. P2-E.2 — Resource Node Type & Acquisition Source Acceptance Sweep

**Status:** Complete (local acceptance sweep; registry/read/search/facet baseline only; no SQL, no node posts, no data migration).

| Acceptance | Result |
|------------|--------|
| ResourceNodeRegistry API (QA Ember post) | Green — normalize/extract/signals; no taxonomy inference |
| ContentModel/Facet integration | OBJECT:resource fields; node_type facet explicit-only |
| red crystal nodes | source_detail/search signal only; `hasExplicitNodeType` false |
| Search parser hints | resource node/mining node/red crystal nodes/ore vein/fishing spot — hint-only |
| Search regressions | mining/wood/forge/red crystal/vendor/version unchanged |
| Resources facets | mining/raw/unknown show QA Ember; node_type=crystal_node no false Ember match |
| QA Staff / QA Ember / Ogre / Swamp | Unchanged; 0 node-type badges/sections |
| Wood/Forge | Missing-entry only; no posts |
| Admin | Session-dependent — automation not verified |
| Pending `add_recipe` conflict | Not touched |

**P2-E.2 acceptance sweep completed; Resource node types and acquisition sources accepted as registry/read/search/facet baseline only. No node posts, no PLACE promotion, no SQL, no data migration.** P2-E foundation block (E.1 + E.2) accepted locally. Ready for P2-F. Deployment freeze remains active.

---

## 37. P2-F.1 — Observation Location & Condition Context Baseline

**Status:** Complete (local baseline; registry/read/search/facet tolerance only; no SQL, no posts, no data migration).

| Area | Result |
|------|--------|
| ObservationContextRegistry | `js/observation-context-registry.js` — normalize/extract/signals; coordinates as structured fields |
| ContentModel integration | observation fields on resource/event/quest/npc models; explicit-only enrichment |
| Facet groups | `biome_context`, `time_condition`, `weather_condition` — explicit-only, no filter |
| Search parser/signals | low-weight observation/location/condition hints; no hard filters |
| Wiki entry layout | `observationContext` read-only; no new sections/badges without explicit fields |
| PLACE promotion | `shouldPromoteCoordinatesToPlace` / `shouldPromoteObservationToPost` false |
| Relations | `found_in` unchanged; `add_observation_location` reserved |
| QA regressions | Staff/Ember/Ogre/Swamp unchanged; Wood/Forge missing-entry only |
| Not built | Map, coordinate editor, location create UI, spawn tracker, weather/time systems, SQL |

**Deployment freeze remains active** — no push/deploy.

---

## 38. P2-F.2 — Observation Location & Condition Context Acceptance Sweep

**Status:** Complete (local acceptance sweep; registry/read/search/facet baseline only; no SQL, no observation posts, no data migration).

| Acceptance | Result |
|------------|--------|
| ObservationContextRegistry API (QA Ember/Staff) | Green — all normalize/extract/signals; empty/unknown safe (null, no UI) |
| ResourceNodeRegistry integration | Green — red crystal nodes source_detail only; no node_type promotion |
| ContentModel/Facet integration | OBJECT:resource + npc/quest/event models; biome/time/weather facets explicit-only |
| Search parser hints | coordinates/location/found near/biome/weather/time/spawn location — hint-only, no crash |
| Search regressions | mining/wood/forge/red crystal/resource node/vendor/version unchanged |
| QA Staff / QA Ember / Ogre / Swamp | Unchanged; no observation/coordinate/weather/time badges or sections |
| Wood/Forge | Missing-entry only; no posts |
| Relations | `found_in` persisted_forward; `add_observation_location` reserved; `confirm_location` active |
| Admin | Session-dependent — automation not verified |
| Pending `add_recipe` conflict | Not touched |

**P2-F.2 acceptance sweep completed; Observation locations, coordinates, biome/time/weather conditions accepted as registry/read/search/facet baseline only. No PLACE promotion, no observation posts, no SQL, no data migration.** P2-F foundation block (F.1 + F.2) accepted locally. Deployment freeze remains active.

---

## 39. P2-G.1 — Creature Encounter, Spawn & Drop Context Baseline

**Status:** Complete (local baseline; registry/read/search/facet tolerance only; no SQL, no encounter posts, no data migration).

| Area | Result |
|------|--------|
| CreatureEncounterRegistry | `js/creature-encounter-registry.js` — normalize/extract/signals; no name-based taxonomy |
| ContentModel integration | BEING:creature model; npc/creature encounter fields; explicit-only enrichment |
| Facet groups | `behavior`, `encounter_type`, `spawn_context`, `drop_context` — explicit-only |
| Search parser/signals | low-weight creature/spawn/drop/affinity hints; no hard filters |
| Wiki entry layout | `creatureEncounterContext` read-only; no new sections without explicit fields |
| Drop relations | `dropped_by` derived inverse; `report_drop`/`add_behavior`/`add_spawn` unchanged |
| Reserved | `report_weakness_resistance` reserved; no new productive encounter/spawn relation |
| QA regressions | Ogre/Staff/Ember/Swamp unchanged; Wood/Forge missing-entry only |
| Not built | Loot-table editor, spawn tracker, encounter UI, combat simulator, SQL |

**Deployment freeze remains active** — no push/deploy.

---

## 40. P2-G.2 — Creature Encounter, Spawn & Drop Context Acceptance Sweep

**Status:** Complete (local acceptance sweep; registry/read/search/facet baseline only; no SQL, no encounter posts, no data migration).

| Acceptance | Result |
|------------|--------|
| CreatureEncounterRegistry API (QA Ogre/Staff) | Green — all normalize/extract/search-signals/guards; empty/unknown safe |
| Observation/ContentModel/Facet integration | BEING:creature + npc fields; behavior/spawn/drop facets explicit-only |
| Search parser hints | creature spawn/drop/weakness/fire weakness/poison resistance — hint-only |
| Search regressions | QA Ogre/Staff/mining/wood/forge/red crystal/coordinates/vendor/version unchanged |
| Drop relations | `dropped_by` derived_inverse; `found_in`/`crafted_from` unchanged |
| Contribution intents | `report_drop`/`add_behavior`/`add_spawn` active; `report_weakness_resistance` reserved |
| QA Staff / QA Ember / Ogre / Swamp | Unchanged; no behavior/spawn/weakness badges/sections |
| Wood/Forge | Missing-entry only; no posts |
| Admin | Session-dependent — automation not verified |
| Pending `add_recipe` conflict | Not touched |

**P2-G.2 acceptance sweep completed; Creature encounters, spawn contexts, drop contexts, behavior, and combat affinity accepted as registry/read/search/facet baseline only. No encounter posts, no loot UI, no SQL, no data migration.** P2-G foundation block (G.1 + G.2) accepted locally. Deployment freeze remains active.

---

## 41. P2-H.1 — Requirement, Unlock & Progression Context Baseline

**Status:** Complete (local baseline; registry/read/search/facet tolerance only; no SQL, no requirement/unlock posts, no data migration).

| Area | Result |
|------|--------|
| RequirementUnlockRegistry | `js/requirement-unlock-registry.js` — normalize/extract/signals; no name inference |
| ContentModel integration | optional requirement/unlock fields on quest/event/npc/vendor/resource/creature/profession models |
| Facet groups | `required_level`, `faction_req`, `unlock_type`, `access_state`, `requirement_type` — explicit-only |
| Search parser/signals | low-weight requirement/unlock/progression/access hints; no hard filters |
| Wiki entry layout | `requirementUnlockContext` read-only; `RENDER_SECTIONS_ENABLED` false |
| Promotion guards | `shouldPromoteRequirementToPost` / `shouldPromoteUnlockToPost` false |
| Reserved | `crafted_by_profession`, `gathered_via`, `add_capability_role`, `add_version_change` unchanged |
| QA regressions | Staff/Ember/Ogre/Swamp unchanged; Wood/Forge missing-entry only |
| Not built | Requirement/unlock create UI, skilltree, leveling, achievement system, quest tracker, SQL |

**Deployment freeze remains active** — no push/deploy.

---

## 42. P2-H.2 — Requirement, Unlock & Progression Context Acceptance Sweep

**Status:** Complete (local acceptance sweep; registry/read/search/facet baseline only; no SQL, no requirement/unlock posts, no data migration).

| Acceptance | Result |
|------------|--------|
| RequirementUnlockRegistry API (QA Staff) | Green — 120/120 normalize/extract/signals/guards/labels |
| Integration | Profession/Quest/Economy/Observation/Creature/ContentModel/Facet registries present; no UI activation |
| Search parser hints | required level/profession/faction/prerequisite/unlock/vendor access/station tier/weather — hint-only, 30/30 no crash |
| Search regressions | QA Ogre/Staff/mining/wood/forge/drop unchanged; requirement queries safe (0 results OK) |
| Reserved relations/intents | `crafted_by_profession`, `gathered_via`, `add_capability_role`, `add_version_change` unchanged |
| Promotion guards | `shouldPromoteRequirementToPost` / `shouldPromoteUnlockToPost` false; `RENDER_SECTIONS_ENABLED` false |
| QA Staff / QA Ember / Ogre / Swamp | Unchanged; no requirement/unlock/progression sections |
| Wood/Forge | Missing-entry only; no posts |
| Admin | Session-dependent — automation not verified |
| Pending `add_recipe` conflict | Not touched |

**P2-H.2 acceptance sweep completed; Requirements, unlocks, progression contexts, and access states accepted as registry/read/search/facet baseline only. No unlock UI, no progression posts, no SQL, no data migration.** P2-H foundation block (H.1 + H.2) accepted locally. Deployment freeze remains active.

---

## 43. P2-I.1 — P2 Foundation Integration & Blueprint Gap Gate

**Status:** Complete (local integration gate; read-only sweep; no SQL, no data migration, no deploy).

| Gate | Result |
|------|--------|
| P2 Registry APIs (QA Staff) | All 12 APIs present: ContentModel, QuestEvent, Economy, Versioning, ResourceNode, Observation, CreatureEncounter, RequirementUnlock, Relations, Intents, Evidence, Professions |
| Active models | BEING:npc, KNOWLEDGE:quest, EVENT:event, OBJECT:resource, BEING:creature — `status: active_model`; create_ui/admin_flow false |
| Promotion/render guards | All P2 registries: shouldPromote* false, shouldRender* false (RENDER_SECTIONS_ENABLED false) |
| Relation/intent safety | crafted_from/crafted_at/found_in persisted; ingredient_of/dropped_by derived; P1/P2 reserved relations/intents unchanged |
| Search parser | 30/30 baseline + P2 queries — hint-only, no crash |
| QA regressions | Staff/Ember/Ogre/Swamp unchanged; Wood/Forge missing-entry only |
| No auto-inference | No crystal/fire taxonomy from names; no PLACE from coordinates; no requirement/faction posts |
| Pending `add_recipe` conflict | Not touched |

**P2-I.1 integration gate completed locally. P2-A through P2-H are accepted as registry/read/search/facet foundations only. No productive UI flows, no admin actions, no SQL, no data migration, no deploy. Remaining work is UI activation, backend/search/index work, moderation workflows, data migration, and launch readiness.** Deployment freeze remains active; boundlore.com untouched.

---

## 44. P2-I.2 — P2 Final Acceptance & P3 Readiness Gate

**Status:** Complete (local final acceptance; docs-only gate; no SQL, no data migration, no deploy).

| Final acceptance | Result |
|------------------|--------|
| P2-A through P2-H | All blocks documented and locally accepted as registry/read/search/facet baselines |
| P2-I.1 integration | Verified — 12/12 APIs, promotion guards false, relation/intent safety green |
| Final browser smoke | 22/22 URLs HTTP 200; QA Staff/Ember/Ogre/Swamp unchanged |
| Final console smoke | 38/38 QA Staff guards; 28/28 search parser queries |
| No productive activation | No create/admin/moderation UI, no backend search/index, no SQL, no data migration |
| Pending `add_recipe` conflict | Not touched |
| Deployment | P2 locally complete; **not deployed**; boundlore.com untouched |

**P2-I.2 final acceptance completed locally. P2-A through P2-I.1 are accepted as registry/read/search/facet foundations only. No productive UI flows, no admin actions, no SQL, no data migration, no deploy. P2 Foundation is ready to be used as the base for P3 UI activation.**

### P3 Readiness (what is done vs. open)

| Done (P0.5 + P1 + P2) | Still open (P3+) |
|------------------------|------------------|
| Entity domain/subtype, facets, relations, evidence | Productive create/admin/moderation UI activation |
| Content models (npc/quest/event/resource/creature) | Backend search + search index |
| Quest/event/economy/version/node/observation/encounter/requirement registries | Data migration strategy + execution |
| Search parser + low-weight signals | Production QA + launch decision |
| Reader/layout tolerance; promotion guards false | Patch Mode / version editor / queue workflows |
| Missing Entry Queue (Wood/Forge) | Deployment readiness gate before any push |

**P3 must activate UI in small controlled steps only.** Before any push/deploy: separate Launch/Data-Safety Gate required. Do not deploy directly from P2 acceptance.

---

## 45. P3-A.1 — Read-only P2 Context Renderer Baseline

**Status:** Complete (local baseline; first P3 UI brick; read-only/explicit-only; no SQL, no data migration, no deploy).

| Area | Result |
|------|--------|
| ContextSectionRenderer | `js/context-section-renderer.js` — explicit-only P2 context sections on detail pages |
| Integration | `wiki-entry-layout.js` hook; renders only when `shouldRenderAnyContext` true |
| Policy | read_only; no buttons/forms/admin/create links; `shouldPromoteContextToPost` false |
| Explicit-only | `source_detail` alone does not render resource_node; no name inference |
| QA regressions | Staff/Ember/Ogre/Swamp unchanged (no explicit P2 section fields) |
| Not built | Admin/create/edit/moderation UI, backend search, data migration |

**P3-A.1:** First controlled P3 UI activation — detail-page read-only context renderer only. P3-B can test individual sections with real explicit data.

---

## 46. P3-A.2 — Read-only P2 Context Renderer Acceptance Sweep

**Status:** Complete (local acceptance sweep; read-only verification; no code/data changes; no deploy).

| Area | Result |
|------|--------|
| ContextSectionRenderer API | 46/46 console acceptance checks green on QA Staff |
| Policy | read-only; explicit-only; `shouldRenderContextActions`/`shouldPromoteContextToPost` false |
| Explicit-only guards | `source_detail` alone no resource_node; title no fire/weakness/requirement inference |
| Cross-registry guards | Resource/observation/creature/requirement promotion guards false |
| DOM safety | `.bl-p3-context-section` count 0 on QA Staff/Ember/Ogre/Swamp |
| QA regressions | Staff/Ember/Ogre/Swamp visually unchanged; Drop/Recipe/Relation UI unchanged |
| Search/resources | 23/23 URLs HTTP 200; mining/raw/unknown show QA Ember; node_type filter unchanged |
| Admin | read-only; Access Denied without session (not repaired) |
| Not activated | Admin/create/edit/moderation UI, backend search, data migration, P3-B test posts |

**P3-A.2 acceptance sweep completed locally.** The read-only P2 context renderer is accepted as an explicit-only detail-page renderer. It creates no actions, buttons, forms, admin/create/edit links, posts, data changes, automatic promotion, or taxonomy inference. QA baseline pages remain visually unchanged without explicit P2 context fields. P3-B can later test individual context sections with real explicit data.

---

## 47. P3-B.1 — Synthetic Explicit Context Section Fixture Baseline

**Status:** Complete (local QA-only fixture harness; synthetic objects; no posts, no DB writes, no deploy).

| Area | Result |
|------|--------|
| Fixture page | `qa/p3-context-renderer-fixtures.html` — not linked from wiki navigation |
| Fixture harness | `qa/p3-context-renderer-fixtures.js` — 8 synthetic fixtures, assertion helpers |
| Positive fixtures A–E | resource_node, observation_context, creature_encounter, requirement_unlock, versioning render |
| Negative fixtures F–H | source_detail-only, name-only, empty/unknown render nothing |
| Renderer hardening | Root-level observation condition fields (`biome_context`, `time_condition`, `weather_condition`) for explicit-only fixture coverage |
| QA regressions | Staff/Ember/Ogre/Swamp unchanged (0 `.bl-p3-context-section`) |
| Not built | Real wiki posts, Supabase writes, admin/create/edit/moderation UI, productive navigation links |

**P3-B.1:** QA-only synthetic fixture harness validates read-only explicit-only context rendering without creating posts or data changes.

---

## 48. P3-B.2 — Synthetic Context Renderer Fixture Acceptance Sweep

**Status:** Complete (local acceptance sweep; read-only verification; no code/data changes; no deploy).

| Area | Result |
|------|--------|
| Fixture page | `/qa/p3-context-renderer-fixtures.html` — QA-only; not in production navigation |
| Fixture acceptance | 8/8 fixtures PASS; 12/12 built-in assertions PASS; 32/32 sweep checks PASS |
| Positive fixtures A–E | resource_node, observation_context, creature_encounter, requirement_unlock, versioning render (5 sections) |
| Negative fixtures F–H | source_detail-only, name-only, empty/unknown render nothing |
| DOM safety | 0 unsafe elements in `.bl-p3-context`; no admin/create/edit links |
| Cross-registry guards | RN/OC/CE/RU promotion guards false |
| QA regressions | Staff/Ember/Ogre/Swamp unchanged (0 `.bl-p3-context-section`); 25/25 URLs HTTP 200 |
| Admin | read-only; Access Denied without session (not repaired) |
| Not activated | Production navigation, real posts, Supabase writes, admin/create/edit/moderation UI |

**P3-B.2 acceptance sweep completed locally.** The QA-only synthetic context renderer fixture harness is accepted. Explicit synthetic fields render the expected read-only sections; source_detail-only, name-only, and empty/unknown fixtures render no sections. No production navigation, posts, data writes, admin/create/edit flows, automatic promotion, or taxonomy inference were introduced. P3-C can later plan real local read-only detail-page data/preview strategy.

---

## 49. P3-C.1 — Local Read-only Detail Context Preview Adapter Baseline

**Status:** Complete (local localhost + query-param preview; ephemeral overlay; no posts, no DB writes, no deploy).

| Area | Result |
|------|--------|
| PreviewAdapter | `js/context-preview-adapter.js` — `?p3_context_preview=<mode>` on localhost only |
| Integration | `wiki-entry-layout.js` resolves preview entry without mutating original |
| Preview modes | resource_node, observation_context, creature_encounter, requirement_unlock, versioning, all, negative_*, off |
| Positive preview | Renders read-only context sections + local QA banner on detail pages |
| Negative preview | Banner only; no sections for source_detail/name-only/empty fixtures |
| Without query | QA Staff/Ember/Ogre/Swamp unchanged (0 `.bl-p3-context-section`) |
| Policy | read_only; no writes; no admin/create/edit links; localhost_only |
| Not built | Production navigation links, Supabase writes, real post creation, deploy preview |

**P3-C.1:** Local read-only detail context preview via `?p3_context_preview=` on localhost post pages only. Before deploy, preview must remain localhost-gated or pass separate launch gate.

---

## 50. P3-C.2 — Local Context Preview Adapter Acceptance Sweep

**Status:** Complete (local acceptance sweep; read-only verification; no code/data changes; no deploy).

| Area | Result |
|------|--------|
| PreviewAdapter API | 57/59 console checks green on QA Staff + `?p3_context_preview=all` |
| Localhost + query gate | `isPreviewActive()` false without query; true only with `p3_context_preview` |
| Positive preview modes | resource/observation/creature/requirement/versioning/all render expected sections + banner |
| Negative preview modes | negative_source_detail/name_only/empty_unknown/off → 0 sections |
| Entry mutation | `before === after` on original entry; preview clone is separate object |
| Without preview | QA Staff/Ember/Ogre/Swamp: 0 `.bl-p3-context-section`, 0 `.bl-p3-preview-banner` |
| Fixture regression | `/qa/p3-context-renderer-fixtures.html` — 8/8 fixtures, 12/12 assertions |
| Cross-registry guards | RN/OC/CE/RU promotion guards false |
| Production regressions | 16/16 URLs HTTP 200; baseline unchanged |
| Admin | read-only; session-dependent (not repaired) |
| Not activated | Production preview, Supabase writes, posts, admin/create/edit flows |

**P3-C.2 acceptance sweep completed locally.** The local detail-page context preview adapter is accepted as localhost-only, query-param-only, ephemeral, read-only preview. Positive preview modes render expected sections; negative modes and no-query pages remain empty. No production navigation, data writes, posts, Supabase writes, admin/create/edit flows, automatic promotion, or taxonomy inference were introduced. boundlore.com untouched.

---

## 51. P3-D.1 — Detail Preview Matrix QA Harness

**Status:** Complete (local QA-only preview matrix; link catalog; no posts, no DB writes, no deploy).

| Area | Result |
|------|--------|
| Preview matrix | `qa/p3-detail-preview-matrix.html` + `qa/p3-detail-preview-matrix.js` |
| Coverage | 4 entries × 11 modes = 44 localhost preview URLs |
| Entries | QA Staff, QA Ember, QA Ogre, Swamp |
| Modes | no_preview, resource/observation/creature/requirement/versioning/all, negative_*, off |
| Expected behavior | Documented per mode (sections/banner counts) |
| Policy | QA-only; not in navigation; no iframes; manual link open only |
| QA regressions | Without preview: 0 sections/banners on QA pages |
| Not built | Production navigation, Supabase writes, auto-preview, deploy |

**P3-D.1:** QA-only preview matrix catalogs all localhost detail-page preview URLs with expected behavior. P3-C preview remains localhost-gated.

---

## 52. P3-D.2 — Detail Preview Matrix Acceptance Sweep

**Status:** Complete (local acceptance sweep; read-only verification; docs-only commit; no code/data changes; no deploy).

| Area | Result |
|------|--------|
| Matrix page | `/qa/p3-detail-preview-matrix.html` — HTTP 200; QA-only banner; 44 links |
| Link safety | 0 admin/create/edit links; 0 buttons/forms; only `p3-detail-preview-matrix.js` loaded |
| Entry/mode coverage | 4 entries × 11 modes via `__P3DetailPreviewMatrix` globals |
| Sample positive preview | Staff/Ember/Ogre/Swamp — banner + expected section counts (1 or 5 for `all`) |
| Sample negative preview | negative_source_detail/name_only/empty_unknown → 0 sections + banner |
| Without preview | QA Staff/Ember/Ogre/Swamp: 0 `.bl-p3-context-section`, 0 `.bl-p3-preview-banner` |
| PreviewAdapter safety | localhost gate; no entry mutation; rendered HTML has no button/form/admin/create/edit |
| Fixture regression | `/qa/p3-context-renderer-fixtures.html` — 8/8 fixtures, 12/12 assertions |
| Production regressions | 20/20 URLs HTTP 200; baseline unchanged |
| Admin | HTTP 200; in-browser read-only dashboard not re-run (session-dependent) |
| Not activated | Production navigation links, Supabase writes, posts, admin/create/edit flows, deploy |

**P3-D.2 acceptance sweep completed locally.** The QA-only detail preview matrix is accepted. It covers QA Staff, QA Ember, QA Ogre, and Swamp across all preview modes with local detail-page links only. Positive preview modes render expected sections; negative/off/no-preview states remain empty. No production navigation, data writes, posts, Supabase writes, admin/create/edit flows, automatic promotion, or taxonomy inference were introduced. P3-C preview remains localhost-gated; separate launch gate required before deploy.

---

## 53. P3-E.1 — Preview Production Guard Safety Baseline

**Status:** Complete (local production guard helpers + QA-only guard test page; no posts, no DB writes, no deploy).

| Area | Result |
|------|--------|
| Guard helpers | `getAllowedPreviewHostname`, `isAllowedPreviewHostname`, `getPreviewModeFromSearch`, `isPreviewActiveForLocation`, `getPreviewGuardDiagnostics` |
| Allowed host | Exact `localhost` only |
| Blocked hosts | `127.0.0.1`, `boundlore.com`, `www.boundlore.com`, `preview.boundlore.com`, external/empty |
| Guard test page | `qa/p3-preview-guard-safety.html` + `qa/p3-preview-guard-safety.js` — 12/12 cases PASS |
| Local preview | Existing `?p3_context_preview=` behavior unchanged on localhost |
| Policy | QA-only guard page; not in navigation; no iframes; no data writes |
| Not activated | Production preview on boundlore.com or any non-localhost host |

**P3-E.1:** Preview production guard safety baseline enforces exact localhost + valid query mode. Separate launch gate still required before deploy.

---

## 54. P3-E.2 — Preview Production Guard Acceptance Sweep

**Status:** Complete (local acceptance sweep; read-only verification; docs-only commit; no code/data changes; no deploy).

| Area | Result |
|------|--------|
| Guard page | `/qa/p3-preview-guard-safety.html` — 12/12 cases PASS |
| Hostname API | `localhost` allowed; `127.0.0.1`, `0.0.0.0`, boundlore hosts, external blocked |
| Location API | Active only for localhost + valid mode; off/unknown/malicious/no-query inactive |
| Preview regression | QA Staff all/resource/negative/off/no-preview unchanged |
| Matrix regression | 44 links; 4 entries × 11 modes |
| Fixture regression | 8/8 fixtures; 12/12 assertions |
| Production regressions | 22/22 URLs HTTP 200; QA pages 0 sections/banners without preview |
| Admin | HTTP 200; in-browser read-only not re-run (session-dependent) |
| Not activated | Production preview, Supabase writes, posts, admin/create/edit flows, deploy |

**P3-E.2 acceptance sweep completed locally.** The preview production guard is accepted. Preview remains active only for exact localhost plus a valid p3_context_preview query mode. 127.0.0.1, boundlore.com, www.boundlore.com, preview.boundlore.com, unknown/off/no-query, and malicious query values remain inactive. No production navigation, data writes, posts, Supabase writes, admin/create/edit flows, automatic promotion, or taxonomy inference were introduced.

---

## 55. P3-F.1 — Preview Layer Final Integration & Readiness Gate

**Status:** Complete (local integration gate; read-only verification; docs-only commit; no code/data changes; no deploy).

| Layer | Component | Result |
|-------|-----------|--------|
| P3-A | `js/context-section-renderer.js` — read-only explicit-only sections | Integrated on post detail |
| P3-B | `qa/p3-context-renderer-fixtures.html` — synthetic fixture harness | 8/8 fixtures; 12/12 assertions |
| P3-C | `js/context-preview-adapter.js` — localhost query-param overlay | Synthetic/ephemeral; no entry mutation |
| P3-D | `qa/p3-detail-preview-matrix.html` — preview URL matrix | 4 entries × 11 modes; 44 links; QA-only |
| P3-E | `qa/p3-preview-guard-safety.html` — production guard | 12/12 cases; exact localhost only |
| Integration smoke | Staff/Ember/Ogre/Swamp + preview modes | Positive modes render; negative/off/no-preview empty |
| Console acceptance | CSR + CPA + promotion/inference guards | All guards false; no unsafe HTML |
| Production regressions | 29/29 URLs HTTP 200; QA pages 0 sections/banners without preview |
| Not built | Real P2 data binding, production preview, admin/create/edit flows, deploy |

**P3-F.1 integration gate completed locally.** The P3 preview layer from renderer through fixtures, detail preview adapter, preview matrix, and production guard is integrated and ready for final acceptance. The layer remains read-only, explicit-only, synthetic/ephemeral, localhost-only, query-param-only, production-guarded, and disconnected from admin/create/edit/moderation flows. Separate launch/data-safety gate required before deploy. Next: P3-F.2 final acceptance sweep or controlled planning for real read-only data binding (still no write flows).

---

## 56. P3-F.2 — Preview Layer Final Acceptance Sweep

**Status:** Complete (local final acceptance; read-only verification; docs-only commit; no code/data changes; no deploy). **P3 preview layer locally accepted end-to-end.**

| Area | Result |
|------|--------|
| P3-A Renderer | Read-only explicit-only; integrated on post detail |
| P3-B Fixtures | 8/8 fixtures; 12/12 assertions; QA-only |
| P3-C Preview Adapter | Synthetic/ephemeral; no entry mutation |
| P3-D Preview Matrix | 44 links; 4×11 modes; not in navigation |
| P3-E Production Guard | 12/12 cases; exact localhost only |
| P3-F.1 Integration | End-to-end smoke + console acceptance green |
| Without preview | QA Staff/Ember/Ogre/Swamp: 0 sections/banners |
| Production regressions | 37/37 URLs HTTP 200 |
| Not activated | Production preview, real P2 data, admin/create/edit, deploy |

**P3-F.2 final acceptance sweep completed locally.** The P3 preview layer is accepted end-to-end. Renderer, fixture harness, local detail preview adapter, preview matrix, production guard, and integration gate are all green. The layer remains read-only, explicit-only, synthetic/ephemeral, localhost-only, query-param-only, production-guarded, QA-only harnessed, and disconnected from admin/create/edit/moderation flows. No production navigation, data writes, posts, Supabase writes, automatic promotion, or taxonomy inference were introduced. boundlore.com remains untouched. Separate launch/data-safety gate required before deploy.

---

## 57. P3-G.1 — Blueprint Gap & Read-only Data Binding Plan Gate

**Status:** Complete (docs-only planning gate; no code/data/UI changes; no deploy).

### P3 Preview Layer — final accepted locally

| Component | Status |
|-----------|--------|
| P3-A Renderer | Read-only, explicit-only; `js/context-section-renderer.js` on post detail |
| P3-B Fixture Harness | QA-only; 8/8 fixtures; 12/12 assertions |
| P3-C Preview Adapter | Synthetic/ephemeral; localhost + `?p3_context_preview=` only |
| P3-D Preview Matrix | QA-only; 44 localhost links; not in navigation |
| P3-E Production Guard | Exact `localhost` + valid query mode; boundlore hosts blocked |
| P3-F Integration + Final Acceptance | End-to-end green; QA pages without preview unchanged |
| Safety | No data writes, no posts, no Supabase writes, no admin/create/edit/moderation |
| Production | boundlore.com untouched; preview not production-activated |

### Blueprint / production gap matrix

#### A. Finished / accepted locally

| Area | Scope |
|------|--------|
| P1 Foundation | Registry, relations, intent, evidence, facets, search parser, browse filters |
| P2 Foundation | Content/quest/event/economy/version/resource-node/observation/creature/requirement baselines |
| P3 Preview Layer | Read-only renderer + synthetic preview + QA harnesses + production guard |

#### B. Open / not implemented

| Gap | Notes |
|-----|--------|
| Real read-only data binding for P2 context sections | Next candidate: P3-H.1 data contract only |
| Data contract for structured context fields from real entries | Normalize explicit fields only; no inference |
| Migration/backfill strategy for existing entries | Separate data gate; no SQL in P3-H.1 |
| Admin/Create/Edit UI for structured P2 fields | Future; separate moderation/contribution gate |
| Moderation/contribution workflows for context fields | Future; see moderation-conflict-matrix |
| Backend/search index for P2 fields | Future; separate search gate |
| Production QA on boundlore.com | Blocked until launch gate |
| Launch/data-safety gate | Mandatory before deploy |
| Push/deploy decision | Deployment freeze active |

#### C. Explicitly still forbidden

| Rule | Rationale |
|------|-----------|
| Automatic entity promotion | Moderator-only per entity-promotion-policy |
| `source_detail` → node/taxonomy promotion | e.g. "red crystal nodes" stays text on resource |
| `coordinates` → PLACE promotion | Observation only until explicit PLACE entity |
| Name/free text → element/weakness/taxonomy inference | e.g. "QA Staff of Fire" ≠ fire weakness |
| Requirements/unlocks → posts | Requirement context ≠ new entity |
| Synthetic preview → real persisted data | Preview overlay is ephemeral |
| QA-only pages → production navigation | Fixtures/matrix/guard stay under `/qa/` |
| Admin/create/edit without separate gate | No workflow activation in P3-H |

### Read-only data binding plan (P3-H candidate)

**Recommended next implementation step:** **P3-H.1 — Read-only Context Data Contract Baseline**

P3-H.1 may only:

- Read real entry data from existing in-memory entry objects (`meta`, `discovery_payload`, documented safe fields)
- Normalize explicit structured fields for the renderer
- Leave pages without explicit fields unchanged (QA Staff/Ember/Ogre/Swamp baseline)
- Use fixtures/preview/QA pages for validation
- Avoid writes, posts, DB migration, admin/create/edit, search index, auto-promotion, inference

P3-H.2 (later): acceptance sweep confirming real fields render only when explicit; negatives stay empty.

**Not now:** real testdata backfill, admin/create/edit UI, search index, deploy — each requires its own gate.

### Planned data contract — allowed read-only fields per section

| Context section | Allowed future read-only fields | Not allowed alone |
|-----------------|--------------------------------|-------------------|
| **Resource Node** | `meta.node_type`, `meta.acquisition_sources`, `meta.node_observations`, `discovery_payload.node_type`, `discovery_payload.acquisition_sources`, `discovery_payload.node_observations` | `source_detail` only |
| **Observation Context** | `meta.observation_context`, `meta.coordinates`, `meta.location_ref`, `meta.biome_context`, `meta.time_condition`, `meta.weather_condition`, `discovery_payload.observation_context` | Free location text → PLACE |
| **Creature Encounter** | `meta.creature_encounter`, `meta.behavior`, `meta.encounter_type`, `meta.spawn_context`, `meta.drop_context`, `meta.weakness`, `meta.resistance`, `discovery_payload.creature_encounter` | Title "of Fire" → fire/weakness |
| **Requirements & Unlocks** | `meta.requirements`, `meta.required_level`, `meta.profession_level`, `meta.faction_req`, `meta.unlock_type`, `meta.access_state`, `discovery_payload.requirements` | Requirement → post |
| **Version History** | `meta.game_version`, `meta.valid_from`, `meta.valid_until`, `meta.introduced_in`, `meta.changed_in`, `meta.removed_in`, `discovery_payload.versioning` | Patch workflow / admin action |
| **Quest / Event / Economy** | Planned read-only only | No active UI without separate gate |

### Required gates before later phases

| Gate | Before |
|------|--------|
| P3-H.1 data contract baseline | Any real field binding in renderer |
| P3-H.2 acceptance sweep | Treating data contract as accepted | `[x]` P3-H.2 |
| Data/fixture backfill gate | Populating real structured fields on entries |
| Moderation/contribution gate | Admin/create/edit for context fields |
| Search/index gate | Backend or index for P2 context fields |
| Launch/data-safety gate | Deploy, production preview, boundlore.com activation |

**P3-G.1 planning gate completed locally.** P3 preview layer is final accepted. Next safe step: **P3-H.1 Read-only Context Data Contract Baseline**. No deploy without separate launch/data-safety gate.

---

## 58. P3-H.1 — Read-only Context Data Contract Baseline

**Milestone:** P3-H.1 code baseline; read-only explicit field normalization for P2 context sections.

### Module

`js/context-data-contract.js` — `window.BoundLoreContextDataContract`

### Policy

| Rule | Status |
|------|--------|
| Read-only | `[x]` — `shouldWriteContractData()` always false |
| Explicit-only | `[x]` — allowed fields from root/meta/discovery_payload/structured_context only |
| No writes / mutation | `[x]` — input entry never mutated; deep clone for resolved output |
| No promotion / inference | `[x]` — `shouldPromoteContractData()` false; no source_detail/name/coordinates promotion |
| No actions | `[x]` — `shouldRenderContractActions()` false |
| No empty sections | `[x]` — empty/unknown values stripped before merge |

### Source order (stable, first non-empty field wins per key)

1. root explicit safe fields
2. meta
3. discovery_payload
4. structured_context section blocks

Conflicts are diagnostic-only; no aggressive merge resolution.

### Supported sections

`resource_node`, `observation_context`, `creature_encounter`, `requirement_unlock`, `versioning`, `quest_event`, `economy` (read-only planned fields when explicit).

### Explicit prohibitions (unchanged from P3-G.1)

- `source_detail` alone does **not** trigger resource_node
- Names/titles/descriptions do **not** trigger taxonomy or encounter sections
- coordinates/location_ref do **not** promote PLACE
- requirements/unlocks do **not** promote posts or entities

### Integration

`wiki/post/index.html` loads contract after P2 registries, before context renderer.

`wiki-entry-layout.js` pipeline:

1. Build context entry from model
2. `BoundLoreContextDataContract.resolveContractEntry(entry)`
3. `BoundLoreContextPreviewAdapter.resolvePreviewEntry(contractEntry)` when preview active
4. `BoundLoreContextSectionRenderer` when `shouldRenderAnyContext()` true

Without explicit contract fields, QA Staff/Ember/Ogre/Swamp remain at 0 context sections (no preview).

### QA harness

`qa/p3-context-data-contract-fixtures.html` — 9 fixtures (A–I); positive A–E + I; negative F/G/H empty.

### Not built

- No SQL, DB migration, backfill, or real P2 dataset
- No admin/create/edit/moderation UI
- No search index activation
- No deploy or production preview activation

**Next:** P3-H.2 acceptance sweep confirming contract + regression baseline.

---

## 59. P3-H.2 — Read-only Context Data Contract Acceptance Sweep

**Milestone:** P3-H.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

### Acceptance statement

**P3-H.2 acceptance sweep completed locally.** The read-only context data contract is accepted. It normalizes only explicit safe fields from root, meta, discovery_payload, and structured_context; preserves source_detail/name-only/empty negatives; mutates no entries; writes no data; creates no posts; activates no admin/create/edit/moderation flows; and does not enable search indexing, automatic promotion, or taxonomy inference.

### Verified locally

| Check | Result |
|-------|--------|
| `BoundLoreContextDataContract` API stable | `[x]` — 23/23 console checks on contract fixture page |
| Data contract fixtures | `[x]` — 9/9 fixtures, 17/17 assertions |
| Read-only / explicit-only guards | `[x]` — writes/promotion/actions false |
| Entry immutability | `[x]` — `before === after` on resolve |
| Source order | `[x]` — root → meta → discovery_payload → structured_context |
| Derived/enriched `biome_context` | `[x]` — no false observation section on QA Staff |
| Renderer / matrix / guard regression | `[x]` — 8/8, 12/12; 44 links; 12/12 guard |
| Preview layer | `[x]` — localhost-gated; all/resource_node/negative modes OK |
| QA Staff/Ember/Ogre/Swamp without preview | `[x]` — 0 `.bl-p3-context-section`, 0 banner |
| Standard URL regression | `[x]` — 24+ URLs HTTP 200 |
| Wood/Forge | `[x]` — missing-entry only |
| Pending conflict | `[x]` — not touched |
| Deploy / push / SQL | `[x]` — forbidden |

### Next candidate

**P3-I Planning Gate** or a controlled local read-only sample data gate — not production deploy without separate launch/data-safety gate.

---

## 60. P3-I.1 — Local Read-only Sample Data Gate

**Milestone:** P3-I.1 QA-only sample data harness; local entry objects with explicit contract fields; no SQL, no DB writes, no deploy.

### Harness

`qa/p3-readonly-sample-data.html` + `qa/p3-readonly-sample-data.js` — not linked from wiki navigation.

Pipeline per sample entry:

1. `BoundLoreContextDataContract.resolveContractEntry(sampleEntry)`
2. Contract diagnostics (read-only)
3. `BoundLoreContextSectionRenderer.renderContextSections(resolvedEntry)`

### Sample entries (10)

| ID | Type | Expected sections |
|----|------|-------------------|
| A sampleResourceEntry | meta resource_node fields | resource_node |
| B sampleObservationEntry | discovery_payload observation_context | observation_context |
| C sampleCreatureEntry | structured_context creature_encounter | creature_encounter |
| D sampleUnlockEntry | meta requirement/unlock fields | requirement_unlock |
| E sampleVersionedEntry | meta versioning | versioning |
| F sampleAllEntry | structured_context all five blocks | 5 sections |
| G negativeSourceDetailOnly | source_detail only | none |
| H negativeNameOnly | title only | none |
| I negativeDerivedBiomeOnly | root biome + `_derived: true` | none |
| J emptyUnknown | empty/unknown meta | none |

### Contract hardening (minimal)

- Entries with `_derived` / `__derived` skip root-source contract extraction (derived/enriched fields do not render).

### Policy (unchanged)

Read-only, explicit-only, no writes, no posts, no Supabase, no admin/create/edit/moderation, no search index, no promotion/inference.

**Next:** P3-I.2 acceptance sweep.

---

## 61. P3-I.2 — Local Read-only Sample Data Acceptance Sweep

**Milestone:** P3-I.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

### Acceptance statement

**P3-I.2 acceptance sweep completed locally.** The QA-only local read-only sample data gate is accepted. Positive local sample entries render expected context sections through the real DataContract → ContextSectionRenderer pipeline, while source_detail-only, name-only, derived-only, and empty/unknown samples render no sections. No production navigation, data writes, posts, Supabase writes, admin/create/edit/moderation flows, search indexing, automatic promotion, or taxonomy inference were introduced.

### Verified locally

| Check | Result |
|-------|--------|
| Sample data gate | `[x]` — 10/10 PASS; 21/21 console checks |
| Positive A–F | `[x]` — expected sections |
| Negative G–J | `[x]` — 0 sections |
| `_derived` / `__derived` | `[x]` — root extraction blocked |
| Contract fixtures | `[x]` — 9/9, 17/17 |
| Renderer / matrix / guard | `[x]` — 8/8, 12/12; 44 links; 12/12 guard |
| Preview layer | `[x]` — localhost-gated |
| QA Staff/Ember/Ogre/Swamp without preview | `[x]` — 0 sections/banner |
| Standard URL regression | `[x]` — 17+ URLs HTTP 200 |
| Wood/Forge / pending conflict | `[x]` — untouched |

### Next candidate

**P3-J Planning Gate** for real data strategy, or a separately controlled Real-Data Read-only Gate — not production deploy without launch/data-safety gate.

---

## 62. P3-J.1 — Real-Data Readiness & Safety Planning Gate

**Milestone:** P3-J.1 docs-only planning/safety gate; no code, SQL, data migration, or deploy.

### Currently accepted locally

| Layer | Status |
|-------|--------|
| P3 Preview Layer | Final accepted (P3-F.2); localhost + query-param only; production-guarded |
| P3 Data Contract | Accepted (P3-H.2); read-only, explicit-only, no-writes |
| P3 Local Sample Data Gate | Accepted (P3-I.2); 10/10 QA samples via real pipeline |
| QA harnesses | Green (contract, renderer, matrix, guard, sample data) |
| boundlore.com | Untouched; deployment freeze active |

**Confirmed:** No real posts created. No Supabase writes. No admin/create/edit/moderation flows for P3 context fields. No search-index activation. No automatic promotion or taxonomy inference.

### Real-Data Readiness Matrix

| Bereich | Status | Nächster erlaubter Schritt | Verboten bis separates Gate |
|---------|--------|----------------------------|-----------------------------|
| A. Detail Context Rendering | Renderer + DataContract lokal accepted | Echte vorhandene Entry-Felder read-only erkennen/normalisieren | Write/Edit/Create/Admin-Flows |
| B. Echte Entry-Daten | Noch nicht produktiv angebunden | Read-only inspection/normalization only (`meta`, `discovery_payload`, `structured_context`) | Migration, Backfill, Inserts, Updates |
| C. QA Staff / Ember / Ogre / Swamp | Baseline unverändert (0 sections ohne Preview) | Weiterhin Regression Anchor | Automatische Context-Sections ohne explizite Felder |
| D. Wood / Forge | Missing Entries only; keine Posts | Keine automatische Post-Erzeugung | Stub/Post-Erzeugung ohne separates Gate |
| E. Pending add_recipe Conflict | Unangetastet | Weiter als Moderation-Baseline behalten | Approve/Reject/Delete |
| F. Search | Hint-only; kein P3 Index | Später separates Search-Index-Gate | Backend/Search-Index-Aktivierung jetzt |
| G. Admin/Create/Edit/Moderation | Nicht aktiviert für P3-Felder | Später separates Moderation-/Contribution-Gate | Formulare, Buttons, Queue-Aktionen |
| H. Deploy/Live | Blockiert | Separater Launch-/Data-Safety-Gate (LAUNCH-0) | Push/Deploy/Live Preview |

### Allowed real-data sources (read-only probe only)

When **P3-K.1** runs, only these BLMETA paths may be read:

| Source | Allowed explicit fields |
|--------|-------------------------|
| `meta.*` | Contract-allowed section fields only |
| `discovery_payload.*` | Contract-allowed section fields only |
| `structured_context.*` | Contract-allowed section blocks only |
| Root safe fields | Only when not `_derived` / `__derived` |

### Tabu (remain forbidden)

- `source_detail` alone → no resource_node section
- Names/titles/descriptions → no taxonomy or encounter inference
- Enriched/derived fields (`biome_context` from normalize/enrich) → no section unless explicit in raw BLMETA
- coordinates/location_ref → no PLACE promotion
- requirements/unlocks → no post/entity promotion
- Wood/Forge text mentions → no automatic stubs or posts
- Pending conflict → no queue action

### Next technical candidate: P3-K.1

**P3-K.1 — Real Existing Entry Read-only Contract Probe**

May only:

- Inspect existing loaded entry objects read-only
- Read `meta`, `discovery_payload`, `structured_context` from real posts
- Normalize via `BoundLoreContextDataContract.resolveContractEntry()`
- Render via `ContextSectionRenderer` only when explicit contract fields exist
- Leave QA baseline unchanged when no explicit fields present

May NOT:

- Change Supabase data
- Backfill new fields
- Create posts (including Wood/Forge)
- Touch pending conflict
- Build search index
- Activate admin/create/edit/moderation
- Prepare or execute deploy

### Not live-ready

**Noch NICHT live-ready.** P3-J.1 is planning only; no push/deploy decision.

Before any Live/Push/Deploy, a separate gate is mandatory:

**LAUNCH-0 — Local Final Data Safety & Production Readiness Gate**

LAUNCH-0 must verify (when executed later):

- Working tree clean; intended files only staged
- All QA harnesses green (contract, sample, renderer, matrix, guard)
- Real-data read-only binding accepted (post P3-K.x)
- No open SQL/migration/backfill
- No QA data accidentally production-visible
- Supabase project/environment unambiguous
- Admin/moderation state safe and intentional
- Pending conflict consciously decided or consciously unchanged
- Cache-busting final on touched assets
- boundlore.com impact understood
- Rollback plan documented
- Only then: conscious push/deploy decision

**LAUNCH-0 is NOT executed in P3-J.1.** No push. No deploy.

**P3-J.1 planning gate completed locally.** Recommended next step: **P3-J.2 acceptance sweep**, then **P3-K.1 Real Existing Entry Read-only Contract Probe**.

---

## 63. P3-J.2 — Real-Data Readiness & Safety Acceptance Sweep

**Milestone:** P3-J.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

### Acceptance statement

**P3-J.2 acceptance sweep completed locally.** The real-data readiness and safety plan is accepted as docs-only. P3-K.1 is the next technical candidate for a read-only real existing entry contract probe. The project is still not live-ready. LAUNCH-0 remains mandatory before any push/deploy/live action. No code, data, SQL, Supabase, admin/create/edit/moderation, search-index, posts, push, or deploy changes were introduced.

### Verified locally

| Check | Result |
|-------|--------|
| §62 P3-J.1 planning gate present | `[x]` — accepted stack, matrix A–H, tabu list, P3-K.1, LAUNCH-0 |
| Real-Data Readiness Matrix A–H | `[x]` — complete; read-only next steps; forbidden items explicit |
| P3-K.1 probe candidate | `[x]` — may/may-not list documented |
| LAUNCH-0 gate | `[x]` — documented; not executed |
| Not live-ready | `[x]` — explicit in §62 and supporting docs |
| boundlore.com | `[x]` — untouched; deployment freeze active |
| Core files unchanged | `[x]` — contract, renderer, preview, layout, post-detail |
| QA harnesses under `qa/` only | `[x]` — no Supabase/admin/write flows in harnesses |
| Sample data gate | `[x]` — 10/10 PASS |
| Data contract fixtures | `[x]` — 9/9, 17/17 |
| Preview guard | `[x]` — 12/12 PASS |
| QA Staff/Ember without preview | `[x]` — 0 sections, 0 banner |
| Standard URL smoke | `[x]` — 7/7 HTTP 200 |
| Code / data / deploy changes | `[x]` — none |

### Next candidate

**P3-K.1 — Real Existing Entry Read-only Contract Probe** — not production deploy without **LAUNCH-0**.

---

## 64. P3-K.1 — Real Existing Entry Read-only Contract Probe

**Milestone:** P3-K.1 localhost + query-param read-only real entry contract probe; no SQL, data migration, or deploy.

### Module

`js/context-real-entry-probe.js` — `window.BoundLoreContextRealEntryProbe`

- Query param: `p3_contract_probe` (`1`, `true`, `summary`, `full`)
- Active only on exact `localhost` with probe query present
- Blocked on `127.0.0.1`, `boundlore.com`, `www.boundlore.com`, `preview.boundlore.com`
- Read-only diagnostics panel on real detail pages; no writes, posts, Supabase, admin/create/edit, search index, promotion, or inference

### Integration

`wiki/post/index.html` loads probe after preview adapter; `wiki-entry-layout.js` runs probe after contract resolution and context render when probe query active. Original entry and contract entry are cloned; probe does not mutate pipeline results.

### QA harness

`qa/p3-real-entry-contract-probe.html` + `.js` — not linked from wiki navigation. Static localhost links for QA Staff, QA Ember, QA Ogre, Swamp across no_probe / probe_summary / probe_full / preview_all_plus_probe modes.

### Verified behavior

| Check | Result |
|-------|--------|
| Probe active only with `p3_contract_probe` on localhost | `[x]` |
| Without probe query: 0 probe panel | `[x]` |
| QA Staff/Ember/Ogre/Swamp without explicit contract fields | `[x]` — 0 context sections; probe panel documents diagnostics |
| Preview + probe combined | `[x]` — preview banner/sections + probe notes preview is separate |
| Existing QA harnesses regression | `[x]` — sample 10/10, contract 9/9, guard 12/12 |
| Writes / posts / deploy | `[x]` — none |

### Not live-ready

**Noch NICHT live-ready.** LAUNCH-0 remains mandatory before push/deploy.

**Next:** P3-K.2 acceptance sweep.

---

## 65. P3-K.2 — Real Existing Entry Read-only Contract Probe Acceptance Sweep

**Milestone:** P3-K.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

### Acceptance statement

**P3-K.2 acceptance sweep completed locally.** The real existing entry read-only contract probe is accepted. It is localhost-only, query-param-only, read-only, diagnostics-only, and creates no data writes, posts, Supabase writes, admin/create/edit/moderation flows, search indexing, automatic promotion, or taxonomy inference. Existing QA entries without explicit contract fields remain at zero context sections. The project remains not live-ready; LAUNCH-0 is still mandatory before push/deploy.

### Verified locally

| Check | Result |
|-------|--------|
| `BoundLoreContextRealEntryProbe` API stable | `[x]` — console acceptance on QA Staff probe page |
| Gating (localhost only; query param `p3_contract_probe`) | `[x]` — 127.0.0.1/boundlore.com/www/preview blocked |
| Policy guards (write/promote/actions) | `[x]` — all false |
| Probe panel with query; none without | `[x]` |
| QA Staff/Ember/Ogre/Swamp without explicit contract | `[x]` — 0 context sections without preview |
| Preview + probe combined | `[x]` — banner + preview sections + probe panel; preview noted separate |
| Probe link page | `[x]` — 4 entries × 4 modes = 16 localhost links |
| Sample / contract / renderer / guard harnesses | `[x]` — 10/10; 9/9 17/17; 8/8 12/12; 12/12 |
| Standard URL regression | `[x]` — 21/21 HTTP 200 |
| Code / data / deploy changes | `[x]` — none |

### Next candidate

**P3-L Planning Gate** or Real-Data Probe Final Integration Gate — not production deploy without **LAUNCH-0**.

---

## 66. P3-L.1 — P3 Read-only Context Layer Final Integration Gate

**Milestone:** P3-L.1 docs-only final integration gate; no code, SQL, data migration, or deploy.

### P3 Layer Integration Matrix

| Layer | Status | Zweck | Aktivierung | Produktionsstatus |
|-------|--------|-------|-------------|-------------------|
| P3-A Context Renderer | Accepted | Read-only explicit context sections rendern | Echte Detailseite, nur bei expliziten Context-Feldern | Keine Actions, keine Writes |
| P3-B Renderer Fixtures | Accepted | Synthetische QA-only Renderer-Verifikation | `qa/` harness only | Nicht produktiv verlinkt |
| P3-C Preview Adapter | Accepted | Synthetische Preview-Daten lokal testen | `localhost` + `p3_context_preview` | Production guarded |
| P3-D Preview Matrix | Accepted | 4×11 Preview-Matrix | `qa/` harness only | Nicht produktiv verlinkt |
| P3-E Production Guard | Accepted | Blockiert Preview außerhalb localhost | Guard API auf Detailseite | boundlore-Hosts blockiert |
| P3-F Preview Final Acceptance | Accepted | Preview Layer final geschlossen | Docs/acceptance | Kein Deploy |
| P3-G Blueprint Gap/Data Binding Plan | Accepted | Real-Data-Plan ohne Code | Docs-only | Nicht live-ready |
| P3-H Data Contract | Accepted | `root`/`meta`/`discovery_payload`/`structured_context` read-only normalisieren | Echte Entry-Pipeline | No writes, no promotion, explicit-only |
| P3-I Local Sample Data Gate | Accepted | Lokale vollständige Sample Entries durch echte Pipeline | `qa/` harness only | Nicht produktiv verlinkt |
| P3-J Real-Data Safety Plan | Accepted | Real-Data/Launch-Safety planen | Docs-only | LAUNCH-0 weiterhin Pflicht |
| P3-K Real Entry Probe | Accepted | Echte bestehende Entries diagnostics-only inspizieren | `localhost` + `p3_contract_probe` | boundlore-Hosts blockiert, no writes |

### Accepted / Not Activated Matrix

| Bereich | Accepted | Produktiv aktiviert? | Begründung |
|---------|----------|----------------------|------------|
| Read-only Context Renderer | Ja | Defensiv ja, explicit-only | Ohne explizite Felder keine Sections |
| Synthetic Preview | Ja | Nein | localhost + query-param + guard only |
| Data Contract | Ja | Defensiv ja | Normalisiert nur vorhandene safe fields; no writes |
| Sample Data Harnesses | Ja | Nein | qa-only, nicht verlinkt |
| Real Entry Probe | Ja | Nein | localhost + query-param only |
| Admin/Create/Edit/Moderation für P3 Fields | Nein | Nein | Separater P4/P5 Gate nötig |
| Search Index für P3 Fields | Nein | Nein | Separates Search-Gate nötig |
| Migration/Backfill | Nein | Nein | Separates Data-Safety-/Migration-Gate nötig |
| Deploy/Live | Nein | Nein | LAUNCH-0 zwingend vorher |

### Integrated local stack (P3-A through P3-K)

End-to-end detail pipeline (read-only):

1. **Raw entry** captured before enrich (`post-detail.js`)
2. **Data Contract** normalizes explicit fields only (`BoundLoreContextDataContract`)
3. **Preview Adapter** optional synthetic overlay (`localhost` + `p3_context_preview`; production guarded)
4. **Context Renderer** renders explicit sections only (`BoundLoreContextSectionRenderer`)
5. **Real Entry Probe** optional diagnostics panel (`localhost` + `p3_contract_probe`; no writes)

**Regression baseline unchanged:** QA Staff / Ember / Ogre / Swamp without preview/probe → 0 context sections, 0 banner, 0 probe panel.

### Next major development area (post P3-L)

| Option | Ziel | Vorteil | Risiko |
|--------|------|---------|--------|
| **A — P4 Admin/Create/Edit Planning** | P2/P3-Felder später sicher erfassbar machen | Content-Erstellung wird möglich | Write-Flows, Moderation, Datenintegrität |
| **B — P4 Search/Index Planning** | P2/P3 Context-Felder durchsuchbar/filterbar | Browse/Search-Nutzen steigt | Indexing, Cache, Performance, falsche Inferenz |
| **C — P4 Real Data Authoring Strategy** | Entscheiden, wie Contract-Felder in Entries kommen | Grundlage für Admin/Create/Edit/Search | Migration/Backfill/Moderation |

**Empfehlung:** **P4-A.1 — Structured Context Authoring & Moderation Planning Gate**

- Search ergibt erst Sinn, wenn Daten verlässlich erfasst werden.
- Real Data braucht sichere Authoring-/Moderation-Regeln.
- Write-Flows müssen vor jeder echten Content-Produktion sauber geplant werden.
- Weiterhin kein Deploy ohne **LAUNCH-0**.

### STOPP — Not live-ready

**Wir sind nach P3-L noch NICHT live-ready.**

Vor Push/Deploy/Live ist zwingend erforderlich:

- P4/P5 Entscheidung für Authoring/Moderation oder bewusster Verzicht
- Search/Index-Entscheidung oder bewusster Verzicht
- Data Safety Review
- Production QA
- Supabase Environment Check
- Admin State Check
- Cache/Rollback Plan
- **LAUNCH-0 Gate**
- Bewusste manuelle Push-/Deploy-Freigabe

**P3-L.1 integration gate completed locally.** Recommended next: **P3-L.2 acceptance sweep**, then **P4-A.1 Structured Context Authoring & Moderation Planning Gate**.

---

## 67. P3-L.2 — P3 Read-only Context Layer Final Acceptance Sweep

**Milestone:** P3-L.2 docs-only final acceptance sweep; no code, SQL, data migration, or deploy.

### Acceptance statement

**P3-L.2 acceptance sweep completed locally.** The P3 read-only context layer is accepted as an integrated local stack from renderer through preview, data contract, sample data gate, real-data safety planning, and real entry probe. No code, data, SQL, Supabase, admin/create/edit/moderation, search-index, migration/backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action. Next recommended area: **P4-A.1 Structured Context Authoring & Moderation Planning Gate**.

### Verified locally

| Check | Result |
|-------|--------|
| §66 P3-L.1 integration gate present | `[x]` — layer matrix A–K, accepted/not-activated matrix, pipeline, P4-A.1, STOPP/LAUNCH-0 |
| P3-A through P3-K stack accepted | `[x]` — cohesive read-only context layer |
| Preview/Contract/Sample/Probe integration | `[x]` — end-to-end pipeline unchanged |
| QA Staff/Ember/Ogre/Swamp baseline | `[x]` — 0 sections/banner/probe without preview/probe |
| Preview mini-smoke (Staff `p3_context_preview=all`) | `[x]` — 1 banner, 5 sections, 0 probe |
| Probe mini-smoke (Staff `p3_contract_probe=1`) | `[x]` — 1 probe, 0 sections, 0 banner |
| Preview + probe combined | `[x]` — 1 banner, 5 sections, 1 probe |
| Sample / contract / renderer / guard / probe links | `[x]` — 10/10; 9/9 17/17; 8/8 12/12; 12/12; 16 links |
| Standard URL smoke | `[x]` — 14/14 HTTP 200 |
| Not activated: admin/moderation, search index, migration, deploy | `[x]` — documented in §66 |
| Code / data / deploy changes | `[x]` — none |

### P3 layer — final accepted status

**P3 Read-only Context Layer: FINAL ACCEPTED locally.** Production activation remains blocked for preview/probe on non-localhost hosts, admin/create/edit/moderation, search index, migration/backfill, and deploy until separate P4/P5 gates and **LAUNCH-0**.

### Next candidate

**P4-A.1 — Structured Context Authoring & Moderation Planning Gate** — not production deploy without **LAUNCH-0**.

---

## 68. P4-A.1 — Structured Context Authoring & Moderation Planning Gate

**Milestone:** P4-A.1 docs-only authoring/moderation planning gate; no code, SQL, data migration, or deploy.

### Context

- **P3 Read-only Context Layer: FINAL ACCEPTED locally** (P3-L.2)
- **P4 begins with planning, not writes.** Goal: safe future capture of structured P2/P3 context fields
- **Not activated in P4-A.1:** admin/create/edit/moderation flows, data changes, search index, deploy
- **Still not live-ready.** LAUNCH-0 mandatory before push/deploy

### Authorable Field Matrix

| Context Section | Authorable später? | Erfassungsweg | Moderation nötig? | Verbotene Ableitungen |
|-----------------|-------------------|---------------|-------------------|------------------------|
| Resource Node | Ja, nur explicit fields | Admin/Create/Edit structured fields oder Contribution Intent | Ja | `source_detail` allein; „red crystal nodes“ → `crystal_node` |
| Observation Context | Ja | Structured observation block | Ja | coordinates/location text → PLACE promotion |
| Creature Encounter | Ja | Encounter/drop/behavior contribution | Ja | Item name „of Fire“ → fire weakness inference |
| Requirement Unlock | Ja | Requirement/unlock block | Ja | requirement → post/entity promotion |
| Versioning | Ja, restricted | Version change contribution / admin review | Ja | patch workflow auto-action |
| Quest/Event | Planned | Future quest/event model | Ja | quest text → entity/post |
| Economy | Planned | Vendor/offer/price contribution | Ja | shop/vendor post auto-creation |

Contract-allowed explicit fields align with `BoundLoreContextDataContract` section extractors (`meta`, `discovery_payload`, `structured_context`); enriched/derived fields remain excluded.

### Flow Matrix

| Flow | Zweck | Status jetzt | Vor Implementierung nötig |
|------|-------|--------------|---------------------------|
| Admin Structured Edit | Trusted Admin setzt strukturierte Felder | Nicht aktiviert | Schema contract, validation, audit, rollback |
| Create Structured Fields | Neue Entries mit Context-Feldern erstellen | Nicht aktiviert | Form schema, validation, moderation rules |
| User Contribution | Nutzer melden Context-Feld-Ergänzungen | Nicht aktiviert | Contribution intents, conflict detection, evidence rank |
| Moderation Queue | Pending structured changes reviewen | Nicht aktiviert | Diff preview, approve/reject/archive rules |
| Conflict Preview | Bestehende vs. vorgeschlagene Werte | Nur bestehender `add_recipe` baseline | Field-level conflict policy |
| Versioned Changes | `valid_from`/`valid_until`/`changed_in` verwalten | Read-only model only | Version workflow; no auto patch action |

### Safety rules for future P4/P5 writes

When write flows are implemented (not in P4-A.1):

1. Jeder Write braucht explizites User/Admin-Intent
2. Jeder strukturierte Field-Write braucht Validation gegen schema contract
3. Jeder Contribution-Write braucht Moderation oder klaren Trusted-Admin-Bypass
4. Jede Änderung braucht Evidence/Confidence oder Audit-Metadaten
5. Keine automatische Entity/Post-Erzeugung aus structured fields
6. Keine Promotion aus Freitext
7. Keine Taxonomie-Inferenz aus Namen
8. Keine inversen Persistierungen, wenn Relation derived ist
9. Keine Search-Index-Aktivierung im selben Gate wie neue Writes
10. Kein Backfill im selben Gate wie UI-Write-Flows
11. Kein Deploy im selben Gate wie neue Write-Flows
12. **LAUNCH-0** bleibt separater Gate vor Push/Deploy

### Recommended P4 sequence

| Phase | Task | Type | Notes |
|-------|------|------|-------|
| P4-A.1 | Structured Context Authoring & Moderation Planning Gate | **Current — docs-only** | No writes |
| P4-A.2 | Acceptance Sweep | docs-only | Confirms authoring/moderation plan |
| P4-B.1 | Structured Context Schema & Validation Baseline | Later code possible | Validators/schemas only; no writes |
| P4-B.2 | Acceptance Sweep | docs-only | |
| P4-C.1 | Admin Read-only Structured Field Inspector Planning Gate | **Accepted — docs-only** | Inspector scope/pipeline planned; no code |
| P4-D.1 | Structured Contribution Draft Flow Planning Gate | **Accepted — docs-only** | Draft lifecycle, payload, intents, conflicts; no submit |
| P4-D.2 | Acceptance Sweep | **Accepted — docs-only** | Confirms draft plan |
| P4-E.1 | Structured Contribution Draft Contract Baseline | **Accepted — read-only code** | Draft contract module + QA fixture; no submit |
| P4-E.2 | Acceptance Sweep | **Accepted — docs-only** | Confirms draft contract baseline |
| P4-F.1 | Structured Contribution Draft Inspector / Preview Planning Gate | **Accepted — docs-only** | Draft preview scope, pipeline, diff policy; no UI |
| P4-F.2 | Acceptance Sweep | **Accepted — docs-only** | Confirms preview plan |
| P4-F.3 | Structured Contribution Draft Preview Baseline | Later read-only code | Draft preview module + QA fixture; no prod wiring |

**Write flows** (admin edit, create with fields, contribution approve) come only after: schema, validation, conflict policy, evidence/audit policy, and separate data-safety gate.

### Not live-ready

**P4-A.1 activates nothing.** No admin UI, no create/edit UI, no moderation UI, no backend writes, no search index, no backfill, no deploy.

**Next:** P4-A.2 acceptance sweep.

---

## 69. P4-A.2 — Structured Context Authoring & Moderation Acceptance Sweep

**Milestone:** P4-A.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

### Acceptance statement

**P4-A.2 acceptance sweep completed locally.** The structured context authoring and moderation plan is accepted as docs-only. The Authorable Field Matrix, Flow Matrix, Safety Rules, and recommended P4 sequence are accepted. No code, data, SQL, Supabase, admin/create/edit/moderation, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action. Next recommended step: **P4-B.1 Structured Context Schema & Validation Baseline**.

### Verified locally

| Check | Result |
|-------|--------|
| §68 P4-A.1 planning gate present | `[x]` — matrices, safety rules, P4 sequence, not live-ready |
| Authorable Field Matrix (7 sections) | `[x]` — explicit paths, moderation, forbidden derivations |
| Flow Matrix (6 flows) | `[x]` — all not activated; prerequisites documented |
| Safety Rules (12 rules) | `[x]` — intent, validation, moderation, no auto-promotion, LAUNCH-0 |
| P4 sequence A.1 → D.1 | `[x]` — writes deferred until schema/validation/conflict/evidence |
| Supporting docs (promotion/search/moderation) | `[x]` — P4-A.1 hints aligned |
| No write/admin/moderation/search/backfill activated | `[x]` |
| P3 regression baseline (Staff/Ember) | `[x]` — 0 sections/banner/probe without preview/probe |
| Harness smoke (sample/probe links) | `[x]` — HTTP 200 |
| Code / data / deploy changes | `[x]` — none |

### Next candidate

**P4-B.1 — Structured Context Schema & Validation Baseline** — validators/schemas only; no writes; not production deploy without **LAUNCH-0**.

---

## 70. P4-B.1 — Structured Context Schema & Validation Baseline

**Milestone:** P4-B.1 read-only schema and validation baseline; no writes, SQL, data migration, admin/create/edit/moderation, search index, backfill, posts, push, or deploy.

### Module

- **`js/structured-context-schema.js`** — `window.BoundLoreStructuredContextSchema`
- **Schema version:** `p4-b1`
- **Write policy:** `read_only`, `validates_only`, `no_writes`, `no_mutation`, `no_promotion`, `no_post_creation`, `no_search_index`, `no_admin_actions`

### Seven structured context sections

| Section | Field status mix | Notes |
|---------|------------------|-------|
| `resource_node` | authorable + forbidden | `source_detail` forbidden; no crystal inference from text |
| `observation_context` | authorable + forbidden | no PLACE promotion from coordinates/location_ref |
| `creature_encounter` | authorable + forbidden | no weakness/fire inference from title |
| `requirement_unlock` | authorable + forbidden | no auto post creation from requirements |
| `versioning` | restricted + forbidden | no patch/admin auto-action |
| `quest_event` | planned + forbidden | validation only; no auto posts |
| `economy` | planned + forbidden | validation only; no vendor shop auto posts |

### Field authoring status

- **authorable** — explicit structured fields (e.g. `node_type`, `biome_context`, `behavior`)
- **restricted** — version metadata (`game_version`, `changed_in`, …); validate only
- **planned** — quest/event/economy fields; validate only, no actions
- **forbidden** — pseudo-fields and negative rules (`source_detail_only`, `place_promotion`, …)
- **system_only** — unknown/unrecognized status fallback

### Validation API (read-only)

Normalization, field/section schema lookup, `validateFieldValue`, `validateSectionContext`, `validateStructuredContext`, `validateEntryContractFields`, `createValidationReport`, `getSchemaDiagnostics`.

**Policy functions (all return `false`):** `shouldWriteValidatedData`, `shouldCreatePostFromField`, `shouldPromoteFromValidatedData`, `shouldRenderValidationActions`.

### Negative rules (explicit block/invalid)

- `source_detail` only → blocked; no `resource_node` promotion
- `"red crystal nodes"` text → no `node_type=crystal_node` inference
- title `"QA Staff of Fire"` → no creature weakness/taxonomy inference
- coordinates/location_ref → no PLACE promotion suggestion
- requirements → no post creation suggestion
- versioning → no patch/admin auto-action
- quest/event/economy → no auto posts
- unknown fields → warning/error; not silently authorable
- `_derived` / `__derived` → blocked; not authorable

### QA fixture (local only)

- **`qa/p4-structured-context-schema-fixtures.html`** + **`.js`**
- Fixtures A–M (positive A–G, negative H–M)
- Exposes `window.__P4StructuredContextSchemaFixtures`
- No Supabase, auth, admin, create, edit, buttons, forms, or data writes
- **Not linked from wiki navigation**

### P3 layer unchanged

P3 read-only contract, renderer, preview adapter, probe, and wiki-entry-layout pipeline are **not modified** by P4-B.1. Schema module is loaded only via QA fixture until a separate integration gate.

### Not live-ready

**P4-B.1 activates nothing.** No admin UI, no create/edit UI, no moderation UI, no backend writes, no search index, no backfill, no deploy, no prod script wiring.

**Next:** P4-B.2 acceptance sweep.

---

## 71. P4-B.2 — Structured Context Schema & Validation Acceptance Sweep

**Milestone:** P4-B.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

### Acceptance statement

**P4-B.2 acceptance sweep completed locally.** The structured context schema and validation baseline is accepted. `BoundLoreStructuredContextSchema` covers seven sections, validates authorable/restricted/planned fields, blocks negative/inferred/derived/unknown/empty cases as expected, keeps all write/promotion/post/action policy functions false, and remains QA-fixture-only with no production integration. No code, data, SQL, Supabase, admin/create/edit/moderation, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

### Verified locally

| Check | Result |
|-------|--------|
| §70 P4-B.1 schema baseline present | `[x]` — module, 7 sections, field status, negative rules, QA fixture |
| Schema API (`p4-b1`) | `[x]` — policy functions all false; mutation safe |
| QA fixture A–M | `[x]` — 13/13 PASS; `__P4StructuredContextSchemaFixtures.allPass === true` |
| Negative rules H–M | `[x]` — blocked/invalid/unknown as expected; no post/promotion actions |
| Prod script wiring | `[x]` — schema loaded only on QA fixture page |
| P3 regression harnesses | `[x]` — sample 10/10; contract 9/9 + 17/17; renderer 8/8 + 12/12; guard 12/12; probe 16 links |
| P3 layer unchanged | `[x]` — contract, renderer, probe, wiki-entry-layout not modified |
| Prod pages (Staff/Ember) | `[x]` — 0 sections/banner/probe without preview/probe |
| Code / data / deploy changes | `[x]` — docs-only sweep |

### Next candidate

**P4-C.1 — Admin Read-only Structured Field Inspector Planning or Baseline** — read-only inspection only; not production deploy without **LAUNCH-0**.

---

## 72. P4-C.1 — Admin Read-only Structured Field Inspector Planning Gate

**Milestone:** P4-C.1 docs-only planning gate; no code, SQL, data migration, admin integration, or deploy.

### Context

- **P4-B** schema and validation baseline is **accepted** (`BoundLoreStructuredContextSchema`, schema version `p4-b1`, QA-fixture-only).
- **P4-C.1 plans only** — no Admin Inspector code, no admin HTML/JS changes, no prod schema wiring.
- **Goal (future):** let an authenticated admin **see** structured context fields, contract extraction, and validation diagnostics **read-only**.
- **Not in scope:** edit, save, approve, reject, repair, queue mutation, promotion, search index, deploy.
- **Still not live-ready** — LAUNCH-0 mandatory before any push/deploy/live action.

### Inspector scope matrix

| Inspector area | May display later? | Source | May trigger action? |
|----------------|-------------------|--------|---------------------|
| Entry Identity | Yes | Entry root fields (`title`, `slug`, `entity_domain`, `entity_subtype`, ids) | No |
| Structured Context Raw | Yes | `root` / `meta` / `discovery_payload` / `structured_context` (read-only clone) | No |
| Data Contract Output | Yes | `BoundLoreContextDataContract.resolveContractEntry(clone)` | No |
| Schema Validation Report | Yes | `BoundLoreStructuredContextSchema.createValidationReport(contractContext)` | No |
| Validation Issues | Yes | Schema report (`issues`, severities, codes) | No |
| Field Status | Yes | `authorable` / `restricted` / `planned` / `forbidden` / `system_only` | No |
| Evidence/Confidence Summary | Yes, if present | Existing metadata only (evidence tier, confidence badges source data) | No |
| Diff / Conflict Preview | Planned later | Future moderation flow; not P4-C | No in Inspector |
| Write Controls | **No** | None | **Forbidden** |
| Repair/Danger Tools | **No** | None | **Forbidden** |

### Forbidden inspector functions

The future Admin Read-only Structured Field Inspector must **NOT**:

- Show Save buttons or editable inputs
- Trigger Approve / Reject / Repair / Danger Zone actions
- Mutate queue items, pending posts, or missing-entry records
- Create Wood/Forge posts or any new wiki posts
- Execute Supabase inserts/updates/deletes or SQL
- Update search index or start backfill
- Suggest or execute automatic entity promotion
- Suggest or execute automatic taxonomy inference (fire from title, crystal from source_detail, PLACE from coordinates)
- Convert free text into structured authorable fields without explicit future write gate
- Trigger version/patch/admin auto-actions from versioning fields

Inspector policy helpers (future baseline) must mirror schema policy: all `shouldWrite*`, `shouldCreatePost*`, `shouldPromote*`, `shouldRenderValidationActions` return **`false`**.

### Planned inspector data pipeline (future P4-C.3 baseline)

1. Admin loads an **existing entry read-only** (same source as post detail / admin preview).
2. Inspector receives a **deep clone** of the entry object — original never mutated.
3. `BoundLoreContextDataContract.resolveContractEntry(clone)` → explicit contract context only.
4. `BoundLoreStructuredContextSchema.createValidationReport(contractContext)` → validation report.
5. Inspector renders read-only panels:
   - Raw sources summary (which buckets contributed fields)
   - Extracted context summary (seven sections, field-level status)
   - Validation report (valid/blocked, issue list)
   - Policy flags (write/promotion/post/search all false)
6. **No action controls** — no buttons, forms, links to create-post/edit-post, or queue actions.
7. Original entry and database remain **unchanged** — no Supabase writes.

### Safe admin integration (future)

When integrated (not in P4-C.1):

- Behind **existing admin session gate** only (`admin-auth.js` / admin route).
- **Separate panel or tab** — must not reuse Pending/Discovery approve UI or Danger Zone containers.
- **Localhost QA fixture first** before any admin HTML script tag.
- Inspector reads the same entry object admin already loaded for preview — no new fetch/write endpoints required for read-only baseline.
- Must not auto-open on all admin pages; explicit entry context required (e.g. pending post preview, entry slug param).

### Recommended sequence

| Phase | Task | Type | Notes |
|-------|------|------|-------|
| **P4-C.1** | Admin Read-only Structured Field Inspector Planning Gate | **Accepted — docs-only** | Inspector scope/pipeline planned |
| **P4-C.2** | Planning Acceptance Sweep | docs-only | Confirms P4-C.1 plan |
| P4-C.3 | Admin Read-only Structured Field Inspector Baseline | **Accepted — read-only code** | Render helpers + QA fixture; no admin HTML |
| P4-D.1 | Structured Contribution Draft Flow Planning | docs-only | No real approvals yet |

**P4-C.3 baseline (when code allowed)** may add:

- `js/admin-structured-context-inspector.js` — pure render helpers, no fetch/write
- `qa/p4-admin-structured-context-inspector-fixtures.html` — QA-only harness
- Optional admin integration: read-only panel behind session, no buttons/forms

**P4-C.3 baseline must NOT add:** edit UI, save UI, approval UI, DB writes, SQL, search index, backfill, deploy.

### Not live-ready

**P4-C.1 activates nothing.** No admin inspector code, no schema prod wiring, no moderation workflow, no search index, no deploy.

**Next:** P4-C.2 acceptance sweep.

---

## 73. P4-C.2 — Admin Read-only Structured Field Inspector Planning Acceptance Sweep

**Milestone:** P4-C.2 docs-only acceptance sweep; no code, SQL, data migration, admin integration, or deploy.

### Acceptance statement

**P4-C.2 acceptance sweep completed locally.** The Admin Read-only Structured Field Inspector plan is accepted as docs-only. The Inspector Scope Matrix, forbidden inspector functions, read-only inspector data pipeline, and future module structure (P4-C.3 baseline) are accepted. No code, data, SQL, Supabase, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

### Verified locally

| Check | Result |
|-------|--------|
| §72 P4-C.1 planning gate present | `[x]` — scope matrix, forbidden functions, pipeline, module plan |
| Inspector scope matrix (10 areas) | `[x]` — read-only display allowed; write/repair forbidden |
| Forbidden inspector functions | `[x]` — save/edit/approve/repair/queue/promotion/inference blocked |
| Inspector data pipeline | `[x]` — clone → contract → schema report → render; no writes |
| Future P4-C.3 module structure | `[x]` — render helpers + QA fixture; optional admin read-only |
| Supporting docs aligned | `[x]` — moderation, promotion, search hints present |
| No admin inspector code | `[x]` — no `admin-structured-context-inspector.js` in repo |
| Schema still QA-fixture-only | `[x]` — no prod script wiring |
| P3 / prod regression smoke | `[x]` — HTTP 200; Staff/Ember 0 sections without preview/probe |
| Code / data / deploy changes | `[x]` — docs-only sweep |

### Next candidate

**P4-C.3 — Admin Read-only Structured Field Inspector Baseline** — read-only render helpers + QA fixture; optional admin panel behind session; not production deploy without **LAUNCH-0**.

---

## 74. P4-C.3 — Admin Read-only Structured Field Inspector Baseline

**Milestone:** P4-C.3 read-only inspector baseline; no admin HTML integration, SQL, data migration, queue/repair writes, search index, backfill, posts, push, or deploy.

### Module

- **`js/admin-structured-context-inspector.js`** — `window.BoundLoreAdminStructuredContextInspector`
- **Inspector version:** `p4-c3`
- **Policy:** `read_only`, `diagnostics_only`, `no_writes`, `no_mutation`, `no_actions`, `no_queue_actions`, `no_repair_actions`, `no_post_creation`, `no_promotion`, `no_search_index`, `no_admin_write_flows`

### Pipeline (read-only)

1. Clone entry (no mutation)
2. `BoundLoreContextDataContract.extractAllContractContext` + contract diagnostics
3. Build schema input from extracted `structured_context` sections
4. `BoundLoreStructuredContextSchema.createValidationReport`
5. Render read-only inspector panels (identity, raw sources, contract, validation, issues, field status, policy flags)

**Policy functions (all return `false`):** `shouldWriteInspectorData`, `shouldRenderInspectorActions`, `shouldModifyQueue`, `shouldTriggerRepair`, `shouldCreateMissingEntry`, `shouldCreatePost`, `shouldPromoteEntity`, `shouldUpdateSearchIndex`.

### QA fixture (local only)

- **`qa/p4-admin-structured-context-inspector-fixtures.html`** + **`.js`**
- Fixtures A–J (positive A–E, negative F–I, empty J)
- Exposes `window.__P4AdminStructuredContextInspectorFixtures`
- Loads DataContract + StructuredContextSchema + Inspector only
- **Not linked from wiki navigation**; **not loaded on `/wiki/admin/`**

### No prod admin integration

P4-C.3 does **not** modify `wiki/admin/index.html`, `admin-dashboard.js`, or other admin write surfaces. Admin integration remains a separate future gate behind existing session.

### Not live-ready

**P4-C.3 activates nothing on production paths.** No admin dashboard wiring, no schema prod wiring, no moderation workflow, no search index, no deploy.

**Next:** P4-C.4 acceptance sweep.

---

## 75. P4-C.4 — Admin Read-only Structured Field Inspector Acceptance Sweep

**Milestone:** P4-C.4 docs-only acceptance sweep; no code, SQL, data migration, admin integration, or deploy.

### Acceptance statement

**P4-C.4 acceptance sweep completed locally.** The Admin Read-only Structured Field Inspector baseline is accepted. `BoundLoreAdminStructuredContextInspector` is read-only and diagnostics-only, combines DataContract output with StructuredContextSchema validation reports, renders safe inspection HTML, mutates no entries, and keeps all write/queue/repair/post/promotion/search policy functions false. It remains QA-fixture-only with no production admin integration. No code, data, SQL, Supabase, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

### Verified locally

| Check | Result |
|-------|--------|
| §74 P4-C.3 inspector baseline present | `[x]` — module, pipeline, QA fixture, no admin HTML |
| Inspector API (`p4-c3`) | `[x]` — policy functions all false; mutation safe |
| QA fixture A–J | `[x]` — 10/10 PASS; `__P4AdminStructuredContextInspectorFixtures.allPass === true` |
| Rendering safety | `[x]` — no button/form/input/approve/reject/repair/create-post/edit-post |
| DataContract + Schema integration | `[x]` — both APIs used in fixture harness |
| Prod script wiring | `[x]` — inspector loaded only on QA fixture; `/wiki/admin/` has no inspector script |
| P3/P4 regression harnesses | `[x]` — schema 13/13; sample 10/10; contract 9/9 + 17/17; renderer 8/8 + 12/12; guard 12/12; probe 16 links |
| Prod pages (Staff/Ember) | `[x]` — 0 sections/banner/probe without preview/probe |
| Admin read-only | `[~]` — session-dependent; no inspector UI; no actions executed |
| Code / data / deploy changes | `[x]` — docs-only sweep |

### Next candidate

**P4-D.1 — Structured Contribution Draft Flow Planning Gate** — docs-only planning; not production deploy without **LAUNCH-0**.

---

## 76. P4-D.1 — Structured Contribution Draft Flow Planning Gate

**Milestone:** P4-D.1 docs-only contribution draft planning gate; no code, SQL, data migration, contribution UI, submit flows, or deploy.

### Context

- **P4-C** Admin Read-only Structured Field Inspector is **accepted** (`BoundLoreAdminStructuredContextInspector`, QA-fixture-only).
- **P4-B** schema/validation baseline is **accepted** (`BoundLoreStructuredContextSchema`, `BoundLoreContextDataContract`).
- **P4-D begins with draft/contribution planning only** — no Contribution UI, no Draft Submit, no Save, no Approve/Reject, no queue actions.
- **Goal (future):** safe structured field suggestions as reviewable drafts before any entry mutation.
- **Still not live-ready** — LAUNCH-0 mandatory before any push/deploy/live action.

### Draft lifecycle matrix

| Draft state | Purpose | Data status | Allowed action later | Activated now? |
|-------------|---------|-------------|----------------------|----------------|
| `not_started` | No draft exists | No draft data | Start draft | **No** |
| `local_draft` | User/admin fills structured fields locally | Browser/UI state only | Validate / discard | **No** |
| `validated_draft` | Draft passes schema validation | Not persisted | Submit for review | **No** |
| `blocked_draft` | Forbidden/unknown/derived/unsafe fields | Not persistable | Correct / discard | **No** |
| `submitted_pending` | Draft stored as pending contribution | DB pending state | Moderator review | **No** |
| `conflict_review` | Draft conflicts with existing field value | Pending + conflict metadata | Moderator field-level review | **No** |
| `approved` | Moderator accepts change | Would mutate entry | Separate write gate only | **No** |
| `rejected_archived` | Moderator rejects draft | Pending archived | Separate moderation gate only | **No** |

### Draft payload contract (planned)

| Payload field | Purpose | Required? | Validation | May auto-create post? |
|---------------|---------|-----------|------------|------------------------|
| `target_entry_id` / `target_slug` | Target entry | Yes | Must reference existing entry | **No** |
| `target_section` | Structured section key | Yes | Known section from `BoundLoreStructuredContextSchema` | **No** |
| `field_changes` | Proposed structured fields | Yes | Known authorable/planned fields only; not forbidden/system_only | **No** |
| `source_snapshot` | Read-only snapshot of current values | Recommended | Clone only; no mutation | **No** |
| `evidence` | Source/proof/confidence | Recommended or required per field | EvidenceRank / confidence policy | **No** |
| `reason` | Short rationale | Optional | Safe text; no inference | **No** |
| `validation_report` | `BoundLoreStructuredContextSchema` output | Required before submit | Must not contain blocked issues | **No** |
| `conflict_report` | Old vs new comparison | When conflict detected | Field-level conflict policy | **No** |
| `audit_metadata` | Who/when/context | Required later | Auth/session dependent | **No** |

### Contribution intent mapping (planned — not activated)

| Context section | Future intent (reserved) | Status now | Special conflict notes |
|-----------------|--------------------------|------------|-------------------------|
| Resource Node | `suggest_resource_node_context` | planned/reserved | `node_type`, acquisition source conflicts |
| Observation Context | `suggest_observation_context` | planned/reserved | coordinates/location/weather/time conflicts; no PLACE promotion |
| Creature Encounter | `suggest_creature_encounter_context` | planned/reserved | behavior/drop/weakness/resistance conflicts |
| Requirement Unlock | `suggest_requirement_unlock_context` | planned/reserved | level/faction/unlock conflicts; no post creation |
| Versioning | `suggest_version_context` | planned/reserved/restricted | valid_from/valid_until/changed_in conflicts; no patch auto-action |
| Quest/Event | `suggest_quest_event_context` | planned/reserved | objective/reward/occurrence conflicts |
| Economy | `suggest_economy_context` | planned/reserved | price/vendor/stock/availability conflicts; no shop post |

**Important:** No new intents activated in P4-D.1. `ContributionIntentRegistry` unchanged. Existing `add_recipe` pending conflict remains baseline only.

### Field-level conflict policy (planned)

- Same field, same value → duplicate / no-op
- Same field, different value → conflict (requires review)
- Array field additive overlap → possible merge candidate, review only
- Object field partial change → field-level diff required
- Restricted fields → always require review
- Planned fields → no production submit without separate gate
- Unknown fields → block
- Forbidden fields → block
- Derived fields (`_derived` / `__derived`) → block
- `source_detail`-only → block
- Name-only inference (e.g. “QA Staff of Fire” → fire weakness) → block
- coordinates/location_ref → PLACE promotion → block
- requirement fields → post/entity creation → block
- economy/vendor fields → shop post creation → block
- versioning fields → patch/admin auto-action → block

### Moderation review requirements (planned)

A future moderator view would need read-only access to:

- Target entry identity
- Affected section and field status (authorable/restricted/planned/forbidden)
- Old values vs proposed values
- Validation report from `BoundLoreStructuredContextSchema`
- Evidence/confidence summary
- Conflict report (field-level)
- Risk hints (promotion, inference, relation impact, search/index impact, migration/backfill need)

**P4-D.1 provides no review UI**, no buttons, no queue actions, no Approve/Reject, no data changes.

### Planned draft pipeline (future baseline — not P4-D.1)

1. Load target entry read-only + `source_snapshot`
2. User fills `field_changes` in local draft UI (future)
3. `BoundLoreStructuredContextSchema.createValidationReport` → `validated_draft` or `blocked_draft`
4. Optional `BoundLoreAdminStructuredContextInspector.createInspectorReport` for preview (read-only)
5. On submit (future gate): persist as `submitted_pending` with evidence + audit metadata
6. Conflict detector compares snapshot vs proposal → `conflict_review` if needed
7. Moderator approve/reject (future separate gate) — never auto-approve from validation pass alone

### Recommended sequence

| Phase | Task | Type | Notes |
|-------|------|------|-------|
| **P4-D.1** | Structured Contribution Draft Flow Planning Gate | **Accepted — docs-only** | Draft plan documented |
| **P4-D.2** | Acceptance Sweep | **Accepted — docs-only** | Confirms draft plan |
| **P4-E.1** | Structured Contribution Draft Contract Baseline | **Accepted — read-only code** | Draft contract module + QA fixture |
| **P4-E.2** | Acceptance Sweep | **Accepted — docs-only** | Confirms draft contract baseline |
| P4-F.1 | Structured Contribution Draft Inspector / Preview Planning Gate | **Accepted — docs-only** | Draft preview scope, pipeline, diff policy; no UI |
| P4-F.2 | Acceptance Sweep | **Accepted — docs-only** | Confirms preview plan |
| P4-F.3 | Structured Contribution Draft Preview Baseline | Later read-only code | Draft preview module + QA fixture; no prod wiring |

### Not live-ready

**P4-D.1 activates nothing.** No contribution UI, no draft submit, no save, no approve/reject, no queue mutation, no search index, no deploy.

**Next:** P4-F.1 Structured Contribution Draft Inspector / Preview Planning Gate.

---

## 77. P4-D.2 — Structured Contribution Draft Flow Acceptance Sweep

**Milestone:** P4-D.2 docs-only acceptance sweep; no code, SQL, data migration, contribution UI, submit flows, or deploy.

### Acceptance statement

**P4-D.2 acceptance sweep completed locally.** The Structured Contribution Draft Flow plan is accepted as docs-only. The Draft Lifecycle Matrix, Draft Payload Contract, Contribution Intent Mapping, Field-Level Conflict Policy, and Moderation Review Requirements are accepted. No code, data, SQL, Supabase, contribution UI, draft submit/save flows, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action. Next recommended step: **P4-E.1 Structured Contribution Draft Contract Baseline**.

### Verified locally

| Check | Result |
|-------|--------|
| §76 P4-D.1 draft planning present | `[x]` — lifecycle, payload, intents, conflicts, moderation requirements |
| P4-C inspector baseline accepted | `[x]` — referenced in §76 context |
| Draft lifecycle matrix (8 states) | `[x]` — all states; activated now = **No** for each |
| Draft payload contract (9 fields) | `[x]` — auto-create post = **No** for all fields |
| Contribution intent mapping (7 reserved) | `[x]` — planned/reserved only; no registry activation |
| `ContributionIntentRegistry` unchanged | `[x]` — no `suggest_*_context` intents added |
| `add_recipe` pending conflict baseline | `[x]` — untouched; no new approval flows |
| Field-level conflict policy | `[x]` — duplicate/conflict/merge/restricted/planned/blocks documented |
| Moderation review requirements | `[x]` — future read-only view; no review UI in P4-D |
| Supporting docs consistent | `[x]` — moderation-conflict, entity-promotion, search, graph-relations |
| No contribution UI / draft submit / save | `[x]` |
| No admin/create/edit/moderation write-flows | `[x]` |
| No queue actions / search index / backfill | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code / data / deploy changes | `[x]` — docs-only sweep |

### Next candidate

**P4-E.1 — Structured Contribution Draft Contract Baseline** — read-only draft contract module; not production deploy without **LAUNCH-0**.

---

## 78. P4-E.1 — Structured Contribution Draft Contract Baseline

**Milestone:** P4-E.1 read-only draft contract validation baseline; no contribution UI, submit/save flows, queue actions, data writes, or deploy.

### Context

- **P4-D** Structured Contribution Draft Flow plan is **accepted** (§76–§77).
- **P4-B** schema baseline (`BoundLoreStructuredContextSchema`) and **P4-C** inspector baseline remain QA-fixture-only on prod paths.
- **P4-E.1 adds** `BoundLoreStructuredContributionDraftContract` — validates local draft payloads, normalizes draft states, maps planned intents read-only, and produces field-level conflict reports without persisting data.
- **`ContributionIntentRegistry` unchanged** — seven `suggest_*_context` intents remain planned/reserved only; `add_recipe` pending conflict baseline untouched.
- **Still not live-ready** — LAUNCH-0 mandatory before any push/deploy/live action.

### Module

| Artifact | Path | Notes |
|----------|------|-------|
| Draft contract | `js/structured-contribution-draft-contract.js` | `DRAFT_CONTRACT_VERSION`: `p4-e1` |
| QA fixture | `qa/p4-structured-contribution-draft-contract-fixtures.html/js` | 15 cases A–O; not linked from wiki |

### Draft states

| State | P4-E.1 active? |
|-------|----------------|
| `local_draft`, `validated_draft`, `blocked_draft` | Yes — local validation only |
| `submitted_pending`, `conflict_review`, `approved`, `rejected_archived` | **No** — `future_only` |

### Planned intent map (read-only)

Seven section → `suggest_*_context` mappings; all planned/reserved; registry not mutated.

### API highlights

- `createDraftReport(draft, existingEntry, options)` — target/section/field/evidence/state validation + schema + conflict report
- `createFieldLevelConflictReport(draft, existingEntry, options)` — duplicate/no-op, conflict, merge-candidate
- `renderDraftReport(report, options)` — safe HTML diagnostics only
- All `should*` policy functions return **`false`**

### QA fixture results (local)

| Check | Result |
|-------|--------|
| Fixtures A–O | `[x]` — 15/15 PASS |
| Policy / mutation / rendering safe | `[x]` |
| Prod script wiring | `[x]` — QA fixture page only |
| P3/P4 regression harnesses | `[x]` — unchanged green |

### Not live-ready

**P4-E.1 activates nothing on prod paths.** No contribution UI, no draft submit, no save, no approve/reject, no queue mutation, no search index, no deploy.

**Next:** P4-F.1 Structured Contribution Draft Inspector / Preview Planning Gate.

---

## 79. P4-E.2 — Structured Contribution Draft Contract Acceptance Sweep

**Milestone:** P4-E.2 docs-only acceptance sweep; no code, SQL, data migration, contribution UI, submit flows, or deploy.

### Acceptance statement

**P4-E.2 acceptance sweep completed locally.** The Structured Contribution Draft Contract baseline is accepted. `BoundLoreStructuredContributionDraftContract` is read-only and validates-only, normalizes draft states, validates payloads, uses planned intent mapping read-only without mutating `ContributionIntentRegistry`, produces field-level conflict reports, mutates no inputs, and keeps all submit/save/queue/approve/reject/archive/post/missing-entry/promotion/search policy functions false. It remains QA-fixture-only with no production contribution integration. No code, data, SQL, Supabase, contribution UI, draft submit/save flows, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

### Verified locally

| Check | Result |
|-------|--------|
| §78 P4-E.1 draft contract baseline present | `[x]` — module, 15 fixtures, policy false |
| Draft contract API (`p4-e1`) | `[x]` — no fetch/write/Supabase; mutation safe |
| QA fixture A–O | `[x]` — 15/15 PASS; `__P4StructuredContributionDraftContractFixtures.allPass === true` |
| Policy functions | `[x]` — all 12 `should*` functions false |
| Rendering safety | `[x]` — no button/form/input/submit/save/approve/reject/archive/repair/create-post/edit-post |
| Planned intent map | `[x]` — read-only; registry unchanged; no active `suggest_*_context` |
| `add_recipe` pending conflict baseline | `[x]` — untouched |
| Prod script wiring | `[x]` — draft contract loaded only on QA fixture page |
| P3/P4 regression harnesses | `[x]` — schema 13/13; inspector 10/10; P3 harnesses HTTP 200 |
| Prod pages (Staff/Ember) | `[x]` — no draft contract script on `/wiki/post/` or `/wiki/admin/` |
| Code / data / deploy changes | `[x]` — docs-only sweep |

### Next candidate

**P4-F.1 — Structured Contribution Draft Inspector / Preview Planning Gate** — docs-only draft preview planning; not production deploy without **LAUNCH-0**.

---

## 80. P4-F.1 — Structured Contribution Draft Inspector / Preview Planning Gate

**Milestone:** P4-F.1 docs-only draft inspector/preview planning gate; no code, SQL, data migration, draft preview UI, submit flows, or deploy.

### Context

- **P4-E** Structured Contribution Draft Contract is **accepted** (`BoundLoreStructuredContributionDraftContract`, `p4-e1`, QA-fixture-only).
- **P4-C** Admin Read-only Structured Field Inspector is **accepted** (`BoundLoreAdminStructuredContextInspector`, QA-fixture-only).
- **P4-B** schema baseline (`BoundLoreStructuredContextSchema`) remains read-only validation only.
- **P4-F begins with draft inspector/preview planning only** — no Draft Preview UI, no Submit, no Save, no Approve/Reject/Archive, no queue actions.
- **Goal (future):** read-only visibility into draft payloads, field-level diffs, conflict reports, validation issues, evidence/confidence, and policy flags before any write or moderation gate.
- **Still not live-ready** — LAUNCH-0 mandatory before any push/deploy/live action.

### Draft preview scope matrix

| Preview area | May display later? | Source | May trigger action? |
|--------------|-------------------|--------|---------------------|
| Draft identity | Yes | Draft Contract report | **No** |
| Target entry summary | Yes | Read-only existing entry snapshot | **No** |
| Target section | Yes | `draft.target_section` | **No** |
| Field changes | Yes | `draft.field_changes` | **No** |
| Existing values | Yes | `source_snapshot` / existingEntry clone | **No** |
| Field-level diff | Yes | Draft Contract conflict report | **No** |
| Schema validation report | Yes | `BoundLoreStructuredContextSchema` | **No** |
| Draft contract report | Yes | `BoundLoreStructuredContributionDraftContract` | **No** |
| Evidence / confidence | Yes, when present | `draft.evidence` | **No** |
| Audit metadata | Yes, when present | `draft.audit_metadata` | **No** |
| Risk warnings | Yes | Validation / conflict / policy reports | **No** |
| Policy flags | Yes | `should*` policy functions (all false in baseline) | **No** |
| Submit / save controls | **No** | None | **Forbidden** |
| Approve / reject / archive controls | **No** | None | **Forbidden** |
| Repair / danger tools | **No** | None | **Forbidden** |

### Planned draft preview pipeline (future baseline — not P4-F.1)

1. Draft loaded locally/read-only or provided as QA fixture object
2. Existing entry snapshot provided as clone (no fetch/write required for baseline)
3. `BoundLoreStructuredContributionDraftContract.createDraftReport(draft, existingEntry)`
4. `BoundLoreStructuredContextSchema.createValidationReport` on `field_changes` / `target_section`
5. Field-level conflict report read from Draft Contract output
6. Preview renders read-only: target entry, section, proposed changes, existing values, validation issues, conflict report, evidence/confidence, policy flags, risk warnings
7. Preview shows **no actions**
8. Original draft and entry remain unmutated
9. No Supabase writes
10. No queue actions

### Visual diff policy (planned)

| Diff status | Meaning | Preview may show? | May trigger merge/write? |
|-------------|---------|-------------------|---------------------------|
| `unchanged` | Old and new value identical | Yes | **No** |
| `added` | Field new in draft | Yes | **No** |
| `changed` | Existing field would get different value | Yes | **No** |
| `removed` | Field removal (future; not in baseline) | Planned later | **No** |
| `conflict` | Same field key, different value | Yes | **No** |
| `duplicate` | Same field key, same value | Yes | **No** |
| `merge_candidate` | Array/object overlap — review only | Yes | **No** |
| `blocked` | unknown/forbidden/derived/source_detail/name-only/etc. | Yes | **No** |
| `restricted_review` | Restricted field requires review | Yes | **No** |
| `planned_only` | Planned section/field — no production submit without gate | Yes | **No** |

**Important:** Diff display must not trigger merge actions, auto-correction, or write buttons.

### Forbidden draft preview functions

The future Draft Inspector / Preview must **NOT**:

- Show Submit, Save, Approve, Reject, Archive, or Repair buttons
- Show inputs or forms
- Mutate queue items or pending posts
- Create missing entries or Wood/Forge posts
- Execute Supabase inserts/updates/deletes or SQL
- Update search index or start backfill
- Suggest or trigger entity promotion or taxonomy inference
- Convert free text into structured fields
- Auto-merge diffs or auto-save drafts to pending
- Trigger version/patch admin actions

### Module integration (planned)

| Layer | Module | Role in preview |
|-------|--------|-----------------|
| Draft validation | `BoundLoreStructuredContributionDraftContract` | Draft report, conflict report, policy flags |
| Schema validation | `BoundLoreStructuredContextSchema` | Field/section validation issues |
| Admin inspector (optional) | `BoundLoreAdminStructuredContextInspector` | Existing entry structured context diagnostics |
| P3 context (optional) | `BoundLoreContextDataContract` | Read-only entry context extraction for snapshot |

### Recommended sequence

| Phase | Task | Type | Notes |
|-------|------|------|-------|
| **P4-F.1** | Structured Contribution Draft Inspector / Preview Planning Gate | **Accepted — docs-only** | Preview plan documented |
| **P4-F.2** | Acceptance Sweep | **Accepted — docs-only** | This gate |
| P4-F.3 | Structured Contribution Draft Preview Baseline | Later read-only code | Draft preview module + QA fixture |

**P4-F.3 baseline (when code allowed) may add:**

- `js/structured-contribution-draft-preview.js` — pure read-only render helpers, no fetch/write
- `qa/p4-structured-contribution-draft-preview-fixtures.html` — QA-only harness
- Uses Draft Contract + Schema (+ optional Admin Inspector) APIs

**P4-F.3 baseline must NOT add:** submit UI, save UI, approval UI, DB writes, SQL, search index, backfill, deploy, prod admin/contribution integration.

### Not live-ready

**P4-F.1 activates nothing.** No draft preview UI, no draft preview module, no submit/save, no approve/reject/archive, no queue mutation, no search index, no deploy.

**Next:** P4-F.3 Structured Contribution Draft Preview Baseline or P4 Final Integration Gate.

---

## 81. P4-F.2 — Structured Contribution Draft Preview Planning Acceptance Sweep

**Milestone:** P4-F.2 docs-only acceptance sweep; no code, SQL, data migration, draft preview UI, submit flows, or deploy.

### Acceptance statement

**P4-F.2 acceptance sweep completed locally.** The Structured Contribution Draft Inspector / Preview plan is accepted as docs-only. The Draft Preview Scope Matrix, read-only preview pipeline, Visual Diff Policy, forbidden preview functions, and future P4-F.3 module structure are accepted. No code, data, SQL, Supabase, Draft Preview UI, contribution UI, submit/save/approve/reject/archive flows, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action. Next recommended step: **P4-F.3 Structured Contribution Draft Preview Baseline** or **P4 Final Integration Gate**.

### Verified locally

| Check | Result |
|-------|--------|
| §80 P4-F.1 preview planning present | `[x]` — scope matrix, pipeline, diff policy, forbidden functions, P4-F.3 outline |
| P4-E draft contract accepted | `[x]` — referenced in §80 context |
| Draft preview scope matrix (15 areas) | `[x]` — read-only areas yes; submit/save/approve/repair forbidden |
| Draft preview pipeline (10 steps) | `[x]` — read-only, clone/no-mutation, no writes/queue |
| Visual diff policy (10 statuses) | `[x]` — no merge/auto-correct/write buttons |
| Forbidden preview functions | `[x]` — submit/save/approve/reject/archive/repair/forms/queue/SQL/index blocked |
| P4-F.3 module structure planned | `[x]` — `structured-contribution-draft-preview.js` + QA fixture only |
| Supporting docs consistent | `[x]` — moderation-conflict, entity-promotion, search, graph-relations |
| No draft preview UI / submit / save | `[x]` |
| No admin/create/edit/moderation write-flows | `[x]` |
| No queue actions / search index / backfill | `[x]` |
| `add_recipe` pending conflict baseline | `[x]` — untouched |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code / data / deploy changes | `[x]` — docs-only sweep |

### Next candidate

**P4-F.3 — Structured Contribution Draft Preview Baseline** — read-only preview render module only; not production deploy without **LAUNCH-0**.

---

## 82. P4-F.3 — Structured Contribution Draft Preview Baseline

**Milestone:** P4-F.3 read-only QA baseline; draft preview module + QA fixture; no prod wiring, no submit/save/queue/moderation writes, no deploy.

### Delivered locally

| Artifact | Purpose |
|----------|---------|
| `js/structured-contribution-draft-preview.js` | `window.BoundLoreStructuredContributionDraftPreview` — read-only preview reports, field-level diffs, safe HTML render |
| `qa/p4-structured-contribution-draft-preview-fixtures.html` | QA-only harness (localhost-gated; not linked from wiki nav) |
| `qa/p4-structured-contribution-draft-preview-fixtures.js` | 15 fixture cases A–O with pass/fail registry |

**Version:** `DRAFT_PREVIEW_VERSION = "p4-f3"`.

**Modes:** `summary`, `full`, `diff`, `diagnostics`.

**Diff statuses:** `unchanged`, `added`, `changed`, `removed`, `conflict`, `duplicate`, `merge_candidate`, `blocked`, `restricted_review`, `planned_only`, `unknown`.

**Uses (read-only):** `BoundLoreStructuredContributionDraftContract`, `BoundLoreStructuredContextSchema`, optional `BoundLoreAdminStructuredContextInspector`.

**Policy:** All `shouldWritePreviewData`, `shouldSubmitPreview`, `shouldSavePreview`, `shouldModifyQueue`, `shouldApprovePreview`, `shouldRejectPreview`, `shouldArchivePreview`, `shouldTriggerRepair`, `shouldCreatePostFromPreview`, `shouldCreateMissingEntryFromPreview`, `shouldPromoteFromPreview`, `shouldAutoMergePreview`, `shouldUpdateSearchIndexFromPreview`, `shouldMutateContributionIntentRegistry` return **false**.

### Verified locally

| Check | Result |
|-------|--------|
| QA fixture 15/15 PASS | `[x]` |
| Policy checks all false | `[x]` |
| Mutation safe (clone in / clone out) | `[x]` |
| Rendering safe (no buttons/forms/inputs/action links) | `[x]` |
| Field-level diff (added/changed/conflict/duplicate/merge_candidate/blocked/restricted) | `[x]` |
| No prod draft preview script on wiki/admin paths | `[x]` |
| No submit/save/approve/reject/archive/repair UI | `[x]` |
| No queue actions / search index / backfill | `[x]` |
| No SQL / Supabase writes / posts created | `[x]` |
| Existing P3/P4 harness regressions | `[x]` |
| `add_recipe` pending conflict baseline | `[x]` — untouched |
| Not live-ready | `[x]` |

### Not live-ready

**P4-F.3 activates nothing in production.** No draft preview UI on wiki/admin/create/edit pages. No contribution UI. No submit/save/approve/reject/archive flows. No admin/create/edit/moderation write-paths. Preview remains strictly localhost + QA fixture gated.

**Next:** **P4-F.4 Acceptance Sweep** or **P4 Final Integration Gate**. **LAUNCH-0** mandatory before any push/deploy/live action.

---

## 83. P4-F.4 — Structured Contribution Draft Preview Acceptance Sweep

**Milestone:** P4-F.4 docs-only acceptance sweep; confirms P4-F.3 baseline; no code, SQL, data migration, draft preview UI, submit flows, or deploy.

### Acceptance statement

**P4-F.4 acceptance sweep completed locally.** The Structured Contribution Draft Preview baseline is accepted. `BoundLoreStructuredContributionDraftPreview` is read-only and diagnostics-only, uses `BoundLoreStructuredContributionDraftContract` and `BoundLoreStructuredContextSchema`, renders field-level diffs, validation issues, policy flags, risk warnings, and evidence/confidence without mutating inputs. All write/submit/save/queue/approve/reject/archive/repair/post/missing-entry/promotion/auto-merge/search/registry policy functions remain false. It remains QA-fixture-only with no production Draft Preview integration. No code, data, SQL, Supabase, Draft Preview UI, contribution UI, submit/save/approve/reject/archive flows, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

### Verified locally

| Check | Result |
|-------|--------|
| §82 P4-F.3 preview baseline present | `[x]` — module + 15-case QA fixture |
| Preview module API (`p4-f3`) | `[x]` — `BoundLoreStructuredContributionDraftPreview` stable |
| Draft contract + schema integration | `[x]` — read-only report pipeline |
| Field-level diff statuses | `[x]` — unchanged/added/changed/removed/conflict/duplicate/merge_candidate/blocked/restricted_review/planned_only |
| QA fixture 15/15 PASS | `[x]` — policy/mutation/rendering safe |
| No prod draft preview script load | `[x]` — wiki/admin/post paths clean |
| P3/P4 harness regression | `[x]` — contract 15/15, inspector 10/10, schema 13/13, sample 10/10, contract 9/9+17/17, renderer 8/8+12/12, guard 12/12, probe 16 links |
| No submit/save/approve/reject/archive/repair UI | `[x]` |
| No admin/create/edit/moderation write-flows | `[x]` |
| No queue actions / search index / backfill | `[x]` |
| `add_recipe` pending conflict baseline | `[x]` — untouched |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code / data / deploy changes | `[x]` — docs-only sweep |

### Next candidate

**P4 Final Integration Gate** — not production deploy without **LAUNCH-0**.

---

## 84. P4-G.1 — P4 Final Integration Gate

**Milestone:** P4-G.1 docs-only final integration gate; confirms P4-A through P4-F as accepted read-only foundation; no code, SQL, data migration, productive activation, or deploy.

### P4 sequence accepted

| Gate | Milestone | Status |
|------|-----------|--------|
| P4-A.1 | Structured Context Authoring & Moderation Planning | **Accepted — docs-only** |
| P4-A.2 | Authoring & Moderation Acceptance Sweep | **Accepted — docs-only** |
| P4-B.1 | Structured Context Schema & Validation Baseline | **Accepted — read-only code** |
| P4-B.2 | Schema & Validation Acceptance Sweep | **Accepted — docs-only** |
| P4-C.1 | Admin Read-only Structured Field Inspector Planning | **Accepted — docs-only** |
| P4-C.2 | Inspector Planning Acceptance Sweep | **Accepted — docs-only** |
| P4-C.3 | Admin Read-only Structured Context Inspector Baseline | **Accepted — read-only code** |
| P4-C.4 | Inspector Acceptance Sweep | **Accepted — docs-only** |
| P4-D.1 | Structured Contribution Draft Flow Planning | **Accepted — docs-only** |
| P4-D.2 | Draft Flow Acceptance Sweep | **Accepted — docs-only** |
| P4-E.1 | Structured Contribution Draft Contract Baseline | **Accepted — read-only code** |
| P4-E.2 | Draft Contract Acceptance Sweep | **Accepted — docs-only** |
| P4-F.1 | Structured Contribution Draft Preview Planning | **Accepted — docs-only** |
| P4-F.2 | Draft Preview Planning Acceptance Sweep | **Accepted — docs-only** |
| P4-F.3 | Structured Contribution Draft Preview Baseline | **Accepted — read-only code** |
| P4-F.4 | Draft Preview Acceptance Sweep | **Accepted — docs-only** |
| **P4-G.1** | **P4 Final Integration Gate** | **Current — docs-only** |

### P4 module pipeline (read-only foundation)

1. **`BoundLoreContextDataContract`** (P3, existing)
   - Extracts structured context data read-only from entry root/meta/discovery_payload/structured_context
   - Powers P3 detail renderer and probe; no writes

2. **`BoundLoreStructuredContextSchema`** (P4-B.1, `p4-b1`)
   - Validates sections/fields against authorable/restricted/planned rules
   - Blocks forbidden/system_only/unknown/derived/unsafe cases
   - Writes nothing; QA-fixture-only on prod paths

3. **`BoundLoreAdminStructuredContextInspector`** (P4-C.3, `p4-c3`)
   - Renders admin-near diagnostics read-only (DataContract + Schema reports)
   - QA-fixture-only; no admin dashboard integration

4. **`BoundLoreStructuredContributionDraftContract`** (P4-E.1, `p4-e1`)
   - Validates local draft payloads; normalizes draft states
   - Produces conflict/validation reports; writes nothing; QA-fixture-only

5. **`BoundLoreStructuredContributionDraftPreview`** (P4-F.3, `p4-f3`)
   - Renders draft reports, field-level diffs, issues, policy flags read-only
   - Uses Draft Contract + Schema (+ optional Inspector); QA-fixture-only; no prod integration

**Pipeline flow:** Entry/Draft → DataContract resolve → Schema validate → (Inspector diagnostics) → Draft Contract report → Draft Preview render. All stages clone inputs, return reports, and keep all `should*` policy functions **false**.

### P4 Final Safety Matrix

| P4 component | Status | Produktiv geladen? | Writes möglich? | Accepted? |
|--------------|--------|--------------------|-----------------|-----------|
| ContextDataContract | Existing P3 read-only contract | Ja — P3 detail pipeline only (read-only) | Nein | Ja |
| StructuredContextSchema | QA-only validation baseline (`p4-b1`) | Nein | Nein | Ja |
| AdminStructuredContextInspector | QA-only read-only inspector (`p4-c3`) | Nein | Nein | Ja |
| StructuredContributionDraftContract | QA-only draft contract (`p4-e1`) | Nein | Nein | Ja |
| StructuredContributionDraftPreview | QA-only draft preview (`p4-f3`) | Nein | Nein | Ja |
| ContributionIntentRegistry | Existing registry unchanged | Wie vor P4 | Keine neuen active suggest_* | Unverändert |
| Admin Dashboard | Existing admin only | Ja — pre-P4 surfaces | Keine neuen P4-Writes | Unchanged |
| Search Index | Unchanged | Wie vor P4 | Nein | Unchanged |

### P4 Non-Activation Matrix

**Nicht aktiviert in P4:**

- Produktiver Admin Inspector
- Produktive Draft Preview
- Contribution UI / Draft UI
- Submit / Save / Approve / Reject / Archive Flows
- Queue Flow / Repair Flow (via P4 modules)
- Create/Edit Structured Field UI
- Search Index für strukturierte Context Fields
- Backfill / DB Migration / SQL / Supabase Writes
- Entity Promotion / Missing Entry Creation
- Wood/Forge Post Creation
- Taxonomy Inference / Derived inverse relation persistence
- Deploy / Push / Launch

### Verified locally (P4-G.1 sweep)

| Check | Result |
|-------|--------|
| P4-A through P4-F documented and accepted | `[x]` |
| P4 module pipeline consistent | `[x]` |
| All P4 modules read-only/diagnostics/validates-only | `[x]` |
| QA harness: Draft Preview 15/15 | `[x]` |
| QA harness: Draft Contract 15/15 | `[x]` |
| QA harness: Admin Inspector 10/10 | `[x]` |
| QA harness: Schema 13/13 | `[x]` |
| P3 regression: Sample 10/10, Contract 9/9+17/17, Renderer 8/8+12/12, Guard 12/12, Probe 16 links | `[x]` |
| Prod paths: no P4 schema/inspector/draft/preview scripts | `[x]` |
| QA Staff/Ember/Ogre/Swamp ohne Probe: 0 Sections/Banner/Probe | `[x]` |
| All P4 `should*` policy functions false | `[x]` |
| No fetch/write/Supabase in P4 modules | `[x]` |
| `add_recipe` pending conflict baseline | `[x]` — untouched |
| Not live-ready | `[x]` |
| Code / data / deploy changes | `[x]` — docs-only gate |

### P4 Foundation accepted

**P4 Foundation is accepted locally.** P4 is **not Launch**, **not productive activation**, and **not live-ready**. P4 is a read-only / validation / preview / draft-contract foundation layer. Productive activation requires a separate **P5 Product Activation Gate**. Push/deploy requires **LAUNCH-0**.

**Current safe status:**

- Local only
- No writes (via P4 modules)
- No deploy / no live
- No search index / no backfill
- No admin write flow (via P4)
- No contribution submit flow (via P4)

### STOPP — before Push/Deploy/Live

**STOPP — ab hier wäre der nächste Schritt potenziell Live/Push/Deploy. Jetzt erst bewusst entscheiden.**

**Next candidates (planning only, not auto-started):**

- **P5-B.1 Notification Injection Fix Baseline**
- **LAUNCH-0 Preflight Planning Gate**

**LAUNCH-0** mandatory before any push/deploy/live action.

---

## 85. P5-A.1 — S+ Remediation Planning Gate

**Milestone:** P5-A.1 docs-only planning gate; structures remediation for four confirmed S+ launch blockers from pre-launch audit; no code, SQL, data migration, productive activation, or deploy.

### Audit verdict accepted

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| Deployment freeze | Active |

### Four S+ findings (launch blockers)

| ID | Title | Primary surfaces |
|----|-------|------------------|
| S+-01 | No server-side fail-closed pre-release content lock | `patch-mode.js`, `wiki_patch_mode.sql`, all write surfaces |
| S+-02 | Cross-user notification injection | `admin_dashboard_notifications.sql`, `notifications.js`, `auth-nav.js` |
| S+-03 | Stored XSS / missing HTML sanitization | `post-detail.js`, `create-post.js`, `edit-post.js`, admin compose, URL sinks |
| S+-04 | `bl_register_observation` RPC gate bypass | `phase_a_observations_foundation.sql`, `discovery-core.js` |

### P5 remediation sequence (binding)

| Phase | Gate | Focus |
|-------|------|-------|
| P5-B | Notification Injection Fix | Smallest isolated RLS fix |
| P5-C | Observation RPC Gate Fix | SECURITY DEFINER write path before release lock |
| P5-D | Sanitization & URL Safety Fix | Central sanitizer + XSS corpus |
| P5-E | Server-side Pre-Release Lock | `release_gate` RLS/RPC/Storage/UI/Audit |
| P5-F | Combined S+ Acceptance + Fable Handoff | All four S+ re-verified together |

**Central plan:** `docs/architecture/p5-splus-remediation-plan.md`

### P5-A.1 scope confirmation

| Check | Result |
|-------|--------|
| Audit NO-GO accepted | `[x]` |
| P5 starts with S+ remediation (not productive activation) | `[x]` |
| No implementation in P5-A.1 | `[x]` |
| Four S+ findings documented with acceptance criteria | `[x]` |
| Sequence P5-B through P5-F documented | `[x]` |
| Test strategy, stop conditions, rollback principles documented | `[x]` |
| Fable retest strategy documented | `[x]` |
| Project remains not live-ready | `[x]` |
| Code / SQL / Supabase / data changes | `[x]` — none |

### Next candidate

**P5-B.1 Notification Injection Fix Baseline** — no push/deploy/launch.

---

## 86. P5-A.2 — S+ Remediation Planning Acceptance Sweep

**Milestone:** P5-A.2 docs-only acceptance sweep; confirms `p5-splus-remediation-plan.md` is complete and ready for P5-B implementation gates.

### P5-A.2 acceptance sweep

| Check | Result |
|-------|--------|
| Plan §1–§10 all sections present | `[x]` |
| Four S+ findings fully mapped (S+-01…04) | `[x]` |
| Sequence P5-B → P5-C → P5-D → P5-E → P5-F accepted | `[x]` |
| Gate structure P5-B.1 through P5-F.2 accepted | `[x]` |
| Per-finding acceptance criteria measurable | `[x]` |
| Test strategy, stop conditions, rollback accepted | `[x]` |
| Fable retest strategy (Retest 1/2/Final) accepted | `[x]` |
| No implementation in P5-A.2 | `[x]` |
| No security fix marked done | `[x]` |
| Product-Activation-Ready = FAIL | `[x]` |
| Public-Launch-Ready = NO-GO | `[x]` |
| Code / SQL / Supabase / data changes | `[x]` — none |

**P5-A.2 acceptance sweep completed locally.** The P5 S+ Remediation Plan is accepted as docs-only. All four S+ launch blockers are mapped to dedicated implementation and acceptance gates. The order P5-B through P5-F, per-finding acceptance criteria, test strategy, stop conditions, rollback principles, and Fable retest strategy are accepted. No code, SQL, Supabase, data, UI, RLS, RPC, sanitizer, release-lock, notification, push, deploy, or launch changes were introduced. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

### Next candidate

**P5-D.1 HTML Sanitization & URL Safety Baseline**. No push/deploy/launch.

---

## 88. P5-B.2 — Notification Injection Acceptance Sweep

**Milestone:** P5-B.2 docs-only acceptance sweep; confirms P5-B.1 repository baseline is accepted at repo level — **not production-closed**.

### P5-B.2 acceptance sweep

| Check | Result |
|-------|--------|
| SQL baseline `user_id = auth.uid()` in repo file | `[x]` |
| SQL not executed | `[x]` |
| Live-RLS NOT TESTED | `[x]` — by design; deferred to DB/staging gate |
| `BoundLoreNotificationUrlSafety` p5-b1 accepted | `[x]` |
| Unsafe schemes blocked at write/render | `[x]` |
| `auth-nav.js` / `notifications.js` accepted | `[x]` |
| Script load order (post/admin + dynamic auth-nav) | `[x]` |
| QA fixture 24/24 PASS | `[x]` |
| Standard regression smoke | `[x]` |
| No Supabase writes / no notification inserts | `[x]` |
| S+-02 production-closed | `[ ]` |
| Code / SQL / data changes in P5-B.2 | `[x]` — docs only |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-02 | **Baseline accepted** — not production-closed |

**P5-B.2 acceptance sweep completed locally.** The Notification Injection guardrail baseline is accepted at repository level. SQL policy scopes authenticated inserts to `user_id = auth.uid()` in the repo migration file, but SQL has not been executed and Live-RLS remains NOT TESTED. `BoundLoreNotificationUrlSafety` p5-b1 accepted; unsafe `target_url` schemes blocked before rendering or client-side insert. QA fixture passes locally. No Supabase writes, no deploy, no push. BoundLore remains NOT live-ready.

### Next candidate

**P5-C.1 Observation RPC Gate Fix Baseline**. No push/deploy/launch.

---

## 93. P5-E.1 — Server-side Release Lock Planning Gate

**Milestone:** P5-E.1 docs-only planning for S+-01; ready for P5-E.2 — **not implemented**.

### S+-01 planning (repo only)

| Item | Status |
|------|--------|
| `docs/architecture/p5-release-lock-plan.md` | Created |
| `release_gate` table | **Planned** — not created |
| Fail-closed helpers | **Planned** — not created |
| RLS/RPC/Storage enforcement | **Planned** — P5-E.2 |
| UI/Admin guardrails | **Planned** — P5-E.3 |
| Patch Mode (`wiki_patch_mode` / `patch-mode.js`) | Client-only; fail-open; insufficient |
| `bl_register_observation` lock hook | Comment only (P5-C) |
| S+-01 implemented | **No** |
| S+-01 baseline accepted | **No** |
| S+-01 production-closed | **No** |
| Code/SQL/data changes | **No** — docs only |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-01 | **Planning completed** — not implemented |

**P5-E.1 planning completed locally.** Release lock implementation plan documented. No SQL, no code, no data changes, no deploy, no push. BoundLore remains NOT live-ready.

### Next candidate

**P5-E.2 Release Gate DB/RLS/RPC Baseline**. No push/deploy/launch.

---

## 94. P5-E.2 — Release Gate DB/RLS/RPC Baseline

**Milestone:** P5-E.2 SQL baseline for S+-01 — **implemented in repo**, **not applied to DB**, **not baseline-accepted** (P5-E.4).

### S+-01 DB/RLS/RPC baseline (repo only)

| Item | Status |
|------|--------|
| `supabase/release_gate_lock.sql` | **Created** |
| `release_gate` singleton table | **Planned in SQL** — default `contribution_locked = true` |
| `release_gate_audit` | **Planned in SQL** |
| Fail-closed helpers | **In SQL** — missing row / error → locked |
| `bl_is_admin_actor` | **In SQL** — `profiles.role = 'admin'` |
| Posts INSERT/UPDATE restrictive RLS | **In SQL** |
| Post reactions restrictive RLS | **In SQL** |
| Discovery storage restrictive RLS | **In SQL** — bucket-aware |
| `bl_register_observation` assert | **In SQL** — `bl_assert_can_create_user_content` |
| Comments / reports INSERT RLS | **NOT TESTED** — not in repo |
| Report-screenshots storage | **NOT TESTED** — not in repo |
| `discovery_storage.sql` | Unchanged |
| Patch Mode | Client-only maintenance — not release lock |
| Frontend/Admin UX | **Not in P5-E.2** — P5-E.3 |
| SQL execution / Supabase deploy | **None** |
| QA fixture | `p5-release-lock-db-security-fixtures` — 34 PASS |
| S+-01 implemented | **DB/RLS/RPC baseline** — not accepted |
| S+-01 production-closed | **No** |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-01 | **DB/RLS/RPC baseline implemented** — not accepted, not production-closed |

**P5-E.2 baseline implemented locally.** SQL files changed but not executed. No data changes, no deploy, no push. BoundLore remains NOT live-ready.

### Next candidate

**P5-E.3 Release Gate Frontend/Admin UX Baseline**. No push/deploy/launch.

---

## 95. P5-E.3 — Release Gate Frontend/Admin UX Baseline

**Milestone:** P5-E.3 client UX for S+-01 — **implemented in repo**, **not applied to DB**, **not baseline-accepted** (P5-E.4).

### S+-01 Frontend/Admin UX (repo only)

| Item | Status |
|------|--------|
| `js/release-gate-client.js` | **Created** — v `p5-e3` |
| Fail-closed when table missing | **Yes** — client treats as locked |
| create-post guard | **Wired** |
| edit-post guard | **Wired** — fail-closed for all saves on client |
| support/report guard | **Wired** |
| Admin status panel | **Wired** in `wiki/admin/index.html` |
| Unlock/relock UI | **Prepared** — reason + confirm; not executed in gate |
| SQL / Supabase files changed | **No** |
| QA UI fixture | 30/30 PASS |
| S+-01 | **Frontend/Admin UX baseline** — not accepted |
| S+-01 production-closed | **No** |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-01 | **Frontend/Admin UX baseline implemented** — not accepted, not production-closed |

**P5-E.3 baseline implemented locally.** Client guardrails and admin panel prepared. No unlock executed. No SQL changes. No deploy. No push.

### Next candidate

**P5-E.4 Release Gate Acceptance Sweep**. No push/deploy/launch.

---

## 110. P5-STAGING.6 — Base Schema Apply to Staging (FAIL)

**Milestone:** P5-STAGING.6 — staging apply attempted; **FAIL**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-apply backup | `[x]` |
| SQL apply | `[ ]` FAIL — dependency order |
| Staging unchanged | `[x]` |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staging-base-schema-apply-report.md`

---

## 111. P5-STAGING.6A — Core Schema Reorder Fix (PASS)

**Milestone:** P5-STAGING.6A — local repo reorder; **PASS**.

| Check | Result |
|-------|--------|
| SQL apply / DB access | `[x]` — none |
| `core_schema_foundation.sql` dependency order fixed | `[x]` |
| `wiki_relation_types` before `bl_match_entities` | `[x]` |
| No data / secrets / destructive SQL | `[x]` |
| Core Schema Reorder Fix (6A) | **PASS** |
| Ready for P5-STAGING.6 Re-run | **YES** — explicit approval |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-core-schema-reorder-fix-report.md`

**Next:** P5-E.9A.2 (STOPP) or P5-E.9B.3. No push/deploy/launch/restore.

---

## 139. P5-E.9B.2 — Staging Backup Evidence (PASS)

**Milestone:** P5-E.9B.2 — Staging Backup Evidence. **PASS**.

| Check | Result |
|-------|--------|
| Evidence Report | `p5-staging-backup-evidence-report.md` |
| Staging Ref | `jzzgoiwfbuwiiyvwgwri` — verifiziert |
| Dump | 382,985 bytes; SHA256 dokumentiert |
| Archive-Listing | 13/14 PRESENT; `storage.objects` NOT_VERIFIED |
| Restore | **Nein** |
| Dump committed | **Nein** |
| Backup Evidence (Staging) | **PASS** |
| Restore Evidence | **OPEN** |
| P5-E.9A.2 | **Vorbereitet** — separate Freigabe |
| P5-E.9B.2 | **PASS** |

**Report:** `docs/architecture/p5-staging-backup-evidence-report.md`

**Next:** P5-E.9A.2 or P5-E.9B.3. No push/deploy/launch/restore.

---

## 138. P5-E.9C — Monitoring/Error Tracking Plan (PASS)

**Milestone:** P5-E.9C — Monitoring/Error Tracking Plan (planning only). **PASS**.

| Check | Result |
|-------|--------|
| Monitoring Plan | `p5-monitoring-error-tracking-plan.md` |
| Scope Matrix | `[x]` 18 Signale |
| Error Classes | `[x]` E-01…E-12 |
| Minimal Pre-Launch + Full Launch | `[x]` |
| Folge-Gates | 9C.1 Provider, 9C.2 Stub, 9C.3 Staging (**STOPP**), 9C.4 Prod (**STOPP**) |
| Provider aktiviert | **Nein** |
| S-08 | **OPEN_BLOCKING** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9C | **PASS** |

**Report:** `docs/architecture/p5-monitoring-error-tracking-plan.md`

**Next:** P5-E.9D.3 entity prerender decision. No push/deploy/launch.

---

## 144. P5-E.9D.3 — Entity Prerender/SSG Decision (PASS)

**Milestone:** P5-E.9D.3 — Entity Prerender/SSG Decision (planning only). **PASS**.

| Check | Result |
|-------|--------|
| Decision Document | `p5-entity-prerender-ssg-decision.md` |
| CSR Detail Risk | `[x]` dokumentiert |
| Option Matrix A–F | `[x]` |
| Pre-Launch + Full Launch Strategy | `[x]` Hybrid SSG |
| URL/Canonical Empfehlung | `[x]` `/wiki/post/<canonical_slug>/` |
| Folge-Gates 9D.3A–9D.5 | `[x]` |
| Implementation | **Nein** |
| Deploy / Search Console | **Nein** |
| Entity Detail SEO | **OPEN_BLOCKING** |
| Sitemap Entity URLs | **Excluded** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Structured Data | **PARTIAL** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9D.3 | **PASS** |

**Report:** `docs/architecture/p5-entity-prerender-ssg-decision.md`

**Next:** P5-E.9E.1 local search recall fixture or P5-E.9D.3D entity sitemap integration. No push/deploy/launch.

---

## 148. P5-E.9E — Search Recall Plan (PASS)

**Milestone:** P5-E.9E — Search Recall Plan (planning only). **PASS**.

| Check | Result |
|-------|--------|
| Search Recall Plan | `docs/architecture/p5-search-recall-plan.md` |
| Search Surface Inventory | Navbar, Search Page, Category Hub, Facet Browse |
| Searchable Fields Matrix | title, BLMETA signals, excerpt; body **nicht** indexiert |
| Recall Risk Matrix | `monster`→0, Body-Gap, kein FTS dokumentiert |
| Required Recall Corpus | Definiert für 9E.1 |
| Minimal Pre-Launch Strategy | Client Synonym/Normalizer ohne DB |
| Full Launch Strategy | FTS/search_documents für später |
| Future Gates | 9E.1–9E.5 definiert |
| DB / Deploy / Search Console | **Nein** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** (separat) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9E | **PASS** |

**Report:** `docs/architecture/p5-search-recall-plan.md`

**Next:** P5-E.9E.2 search client recall hardening. No push/deploy/launch.

---

## 151. P5-E.9E.3 — Search DB Strategy (PASS)

**Milestone:** P5-E.9E.3 — Search DB Strategy (planning only). **PASS**.

| Check | Result |
|-------|--------|
| Strategy Document | `p5-search-db-strategy.md` |
| Architecture Comparison | A–F documented |
| MVP Recommendation | `search_documents` + `bl_search_public_content` + FTS |
| Data Contract + Ranking | documented |
| RLS/Release-Gate Constraints | documented |
| Migration Risks | 12 risks assessed |
| DB Search Strategy | **DOCUMENTED** |
| SQL executed | **Nein** |
| S-06 | **OPEN_BLOCKING** |
| P5-E.9E.3 | **PASS** |

**Report:** `docs/architecture/p5-search-db-strategy.md`

**Next:** P5-E.9E.3A SQL draft. No push/deploy/launch.

---

## 152. P5-E.9E.3A — Search SQL Draft (PASS)

**Milestone:** P5-E.9E.3A — Search SQL Draft (DRAFT ONLY). **PASS**.

| Check | Result |
|-------|--------|
| SQL Draft Document | `p5-search-sql-draft.md` |
| DRAFT ONLY / DO NOT APPLY | Markiert |
| Not in `supabase/migrations/` | Bestätigt |
| `search_documents` + RPC draft | Enthalten |
| SQL executed | **Nein** |
| SQL Draft Status | **DRAFT_ONLY_CREATED** |
| P5-E.9E.3A | **PASS** |

**Report:** `docs/architecture/p5-search-sql-draft.md`

**Next:** P5-E.9E.4 Staging Search Verification. No push/deploy/launch.

---

## 153. P5-E.9E.3B — Search SQL Static Review (PASS)

**Milestone:** P5-E.9E.3B — Search SQL Static Review (read-only). **PASS**.

| Check | Result |
|-------|--------|
| Static Review Document | `p5-search-sql-static-review.md` |
| SQL Draft Status | **DRAFT_ONLY_REVIEWED** |
| SECURITY DEFINER | **REVIEW_REQUIRED** |
| SQL executed / DB access | **Nein** |
| S-06 | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |
| P5-E.9E.3B | **PASS** |

**Report:** `docs/architecture/p5-search-sql-static-review.md`

**Next:** P5-E.9E.4 Re-run Query Matrix. No push/deploy/launch.

---

## 155. P5-E.9E.4B — Staging Runtime Config (PASS)

**Milestone:** P5-E.9E.4B — Staging Runtime Config. **PASS**.

| Check | Result |
|-------|--------|
| `js/supabase-config.js` → Staging | `jzzgoiwfbuwiiyvwgwri` |
| Config Status | `STAGING_REF_VERIFIED` |
| Fixture | 21/21 PASS |
| P5-E.9E.4 Re-run | **READY** |
| P5-E.9E.4B | **PASS** |

**Report:** `docs/architecture/p5-staging-runtime-config-report.md`

**Next:** Client RPC Integration. No push/deploy/launch.

---

## 172. P5-E.9E.5D — Legacy Fresh Backup Evidence (PASS)

**Milestone:** P5-E.9E.5D (Backup-Export only). **PASS**.

| Check | Result |
|-------|--------|
| Target ref `ohkoojpzmptdfyowdgog` verified | **PASS** |
| Staging ref not used | **PASS** |
| Backup artifact created | **PASS** — 433,643 bytes |
| SHA256 documented | **PASS** |
| TOC checked | **PASS** — 701 entries |
| Backup gitignored | **PASS** |
| Restore / SQL Apply / DB-Write | **Nein** |
| Legacy Fresh Backup Evidence | **COMPLETE** |
| S-06 Final Status | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |
| P5-E.9E.5D | **PASS** |

**Report:** `docs/architecture/p5-legacy-fresh-backup-evidence-report.md`

**Next:** P5-E.9E.5E Legacy Profile/RLS Security Hardening. No push/deploy/launch.

---

## 171. P5-E.9E.5C — Final Target Decision (PASS)

**Milestone:** P5-E.9E.5C (Plan-only). **PASS**.

| Check | Result |
|-------|--------|
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| SQL Apply / Write | **Nein** |
| S-06 Final Status | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |
| P5-E.9E.5C | **PASS** |

**Report:** `docs/architecture/p5-final-target-decision.md`

**Next:** P5-E.9E.5E Legacy Profile/RLS Security Hardening. No push/deploy/launch.

---

## 170. P5-E.9E.5B — Production / Legacy Read-only Inventory (PASS)

**Milestone:** P5-E.9E.5B (Read-only). **PASS**.

| Check | Result |
|-------|--------|
| Target ref `ohkoojpzmptdfyowdgog` verified | **PASS** |
| Inventory Status | **COMPLETE** |
| Final Target Suitability | **NEEDS_MIGRATION_DECISION** |
| SQL Apply / Write | **Nein** |
| S-06 Final Status | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |
| P5-E.9E.5B | **PASS** |

**Report:** `docs/architecture/p5-production-legacy-readonly-inventory-report.md`

**Next:** P5-E.9E.5C Final Target Decision. No push/deploy/launch.

---

## 169. P5-E.9E.5A — Production / Legacy Target & Cutover Plan (PASS)

**Milestone:** P5-E.9E.5A (Plan-only). **PASS**.

| Check | Result |
|-------|--------|
| Cutover plan document exists | **PASS** |
| Production / Legacy Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| Legacy `ohkoojpzmptdfyowdgog` angefasst | **Nein** |
| DB-Zugriff / SQL / Write | **Nein** |
| S-06 Final Status | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| P5-E.9E.5A | **PASS** |

**Report:** `docs/architecture/p5-production-legacy-target-cutover-plan.md`

**Next:** P5-E.9E.5C Final Target Decision. No push/deploy/launch.

---

## 168. P5-E.9E.4M — S-06 Staging Search Evidence Closure Dossier (PASS)

**Milestone:** P5-E.9E.4M (Dossier-only). **PASS**.

| Check | Result |
|-------|--------|
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| P5-E.9E.4M | **PASS** |

**Report:** `docs/architecture/p5-s06-staging-search-evidence-closure-dossier.md`

---

## 167. P5-E.9E.4L — Staging Marker Deindex Fix (PASS)

**Milestone:** P5-E.9E.4L. **PASS**.

| Check | Result |
|-------|--------|
| MARKER_DEINDEX_STAGING_PASS | **PASS** |
| MARKER_SEARCHABLE_RISK | **CLOSED_STAGING** |
| P5-E.9E.4L | **PASS** |

**Report:** `docs/architecture/p5-staging-marker-deindex-fix-report.md`

---

## 166. P5-E.9E.4K — Marker Searchability Mitigation Plan (PASS)

**Milestone:** P5-E.9E.4K (Plan-only). **PASS**.

| Check | Result |
|-------|--------|
| Mitigation Plan | **DOCUMENTED** |
| MARKER_SEARCHABLE_RISK | **OPEN** |
| Empfohlener Fix-Gate | **P5-E.9E.4L** |
| P5-E.9E.4K | **PASS** |

**Report:** `docs/architecture/p5-marker-searchability-mitigation-plan.md`

---

## 165. P5-E.9E.4J — Persistent Staging Search Re-run (PASS)

**Milestone:** P5-E.9E.4J (read-only). **PASS**.

| Check | Result |
|-------|--------|
| Persistent Staging Search Re-run | **PARTIAL** (MARKER_SEARCHABLE_RISK) |
| Search DB/FTS Runtime Evidence | **STAGING_PASS** |
| Query-Matrix | **27/27 PASS** |
| P5-E.9E.4J | **PASS** |

**Report:** `docs/architecture/p5-persistent-staging-search-rerun-report.md`

---

## 164. P5-E.9E.4I — Staging Persistent Canonical Corpus Seed (PASS)

**Milestone:** P5-E.9E.4I. **PASS**.

| Check | Result |
|-------|--------|
| Persistent Canonical Corpus | **PERSISTENT_CANONICAL_SEED_PASS** |
| Search DB/FTS Evidence | **PASS** (12 search_documents) |
| Search DB/FTS Runtime Evidence | **PASS** |
| Query-Matrix | **21/21 PASS** |
| P5-E.9E.4I | **PASS** |

**Report:** `docs/architecture/p5-staging-persistent-canonical-corpus-seed-report.md`

---

## 163. P5-E.9E.4H — Search Production Content Migration Plan (PASS)

**Milestone:** P5-E.9E.4H (Plan-only). **PASS**.

| Check | Result |
|-------|--------|
| Migration Plan | **DOCUMENTED** |
| Empfohlener Write-Gate | **P5-E.9E.4I** |
| P5-E.9E.4H | **PASS** |

**Report:** `docs/architecture/p5-search-production-content-migration-plan.md`

---

## 162. P5-E.9E.4G — Staging RPC Corpus Verification (PASS)

**Milestone:** P5-E.9E.4G. **PASS**.

| Check | Result |
|-------|--------|
| RPC Corpus Verification | **RPC_CORPUS_VERIFIED_CLEANED** |
| Search DB/FTS Runtime Evidence | **PASS** |
| P5-E.9E.4G | **PASS** |

**Report:** `docs/architecture/p5-staging-rpc-corpus-verification-report.md`

---

## 161. P5-E.9E.4F — Client RPC Integration (PASS)

**Milestone:** P5-E.9E.4F. **PASS**.

| Check | Result |
|-------|--------|
| Client RPC Integration | **RPC_CLIENT_INTEGRATED** |
| Search DB/FTS UI Integration | **RPC_CLIENT_INTEGRATED** |
| P5-E.9E.4F | **PASS** |

**Report:** `docs/architecture/p5-search-client-rpc-integration-report.md`

---

## 160. P5-E.9E.4A — Staging Search DB/FTS Apply (PASS)

**Milestone:** P5-E.9E.4A. **PASS**.

| Check | Result |
|-------|--------|
| Search DB/FTS | **APPLIED_STAGING_PASS** |
| DB/FTS Evidence | **PARTIAL_EMPTY_CORPUS** |
| P5-E.9E.4A | **PASS** |

**Report:** `docs/architecture/p5-search-db-fts-staging-apply-report.md`

---

## 159. P5-E.9E.4E — Staging Search Corpus Populate (PASS)

**Milestone:** P5-E.9E.4E. **PASS**.

| Check | Result |
|-------|--------|
| Corpus Populate | **POPULATED_VERIFIED_CLEANED** |
| Search Runtime Evidence | **PASS** |
| P5-E.9E.4E | **PASS** |

**Report:** `docs/architecture/p5-staging-search-corpus-populate-report.md`

---

## 158. P5-E.9E.4D — Posts RLS Policy Dependency Fix (PASS)

**Milestone:** P5-E.9E.4D. **PASS**.

| Check | Result |
|-------|--------|
| Backup vor Apply | Ja |
| RLS Fix applied | **APPLIED_STAGING_PASS** |
| 42501 behoben | Ja |
| Search Runtime Evidence | **PARTIAL** |
| P5-E.9E.4D | **PASS** |

**Report:** `docs/architecture/p5-posts-rls-policy-dependency-fix-report.md`

---

## 157. P5-E.9E.4C — Staging Search Read Path Fix Draft (PASS)

**Milestone:** P5-E.9E.4C. **PASS**.

| Check | Result |
|-------|--------|
| Read Path Fix Draft | `p5-staging-search-read-path-fix-draft.md` |
| Root Cause | **CONFIRMED_STATIC** — RLS `posts` → `profiles` |
| Code-only Fix | **Nicht ausreichend** |
| Search Runtime Evidence | **PARTIAL** / **BLOCKED_UNTIL_FIX** |
| P5-E.9E.4C | **PASS** |

**Next:** P5-E.9E.4D Posts RLS Policy Fix. No push/deploy/launch.

---

## 156. P5-E.9E.4 Re-run — Staging Search Query Matrix (PASS)

**Milestone:** P5-E.9E.4 Re-run. **PASS**.

| Check | Result |
|-------|--------|
| Query Matrix | 14 Queries |
| Search Runtime Evidence | **PARTIAL** |
| Corpus blocker | `42501 profiles` |
| P5-E.9E.4 Re-run | **PASS** |

**Report:** `docs/architecture/p5-staging-search-verification-report.md`

---

## 154. P5-E.9E.4 — Staging Search Verification (BLOCKED)

**Milestone:** P5-E.9E.4 — Staging Search Verification (read-only). **BLOCKED**.

| Check | Result |
|-------|--------|
| Verification Report | `p5-staging-search-verification-report.md` |
| Staging Ref dokumentiert | `jzzgoiwfbuwiiyvwgwri` |
| Staging Ref in Runtime | **NEIN** — Legacy in `supabase-config.js` |
| Lokale Fixtures | 92/92 + 98/98 PASS |
| Wiki Query Matrix | **NOT RUN** |
| Search Runtime Evidence | **FAIL** |
| P5-E.9E.4 | **BLOCKED** |

**Report:** `docs/architecture/p5-staging-search-verification-report.md`

**Next:** P5-E.9E.4B Staging Runtime Config. No push/deploy/launch.

---

## 150. P5-E.9E.2 — Search Client Recall Hardening (PASS)

**Milestone:** P5-E.9E.2 — Search Client Recall Hardening. **PASS**.

| Check | Result |
|-------|--------|
| `js/search-recall-utils.js` | `BoundLoreSearchRecall` — Synonyme, Scoring, Snippets, Public-Filter |
| `js/search.js` Integration | Recall-Ranking nach Corpus-Load; Canonical-URLs; Empty-State |
| Hardening Fixture | **92/92 PASS** |
| Recall Fixture Regression | **98/98 PASS** |
| Node Check | `p5-search-client-hardening-check.mjs` PASS |
| CLIENT_RECALL_HARDENED | **PASS** |
| Search Runtime Evidence | **OPEN** |
| S-06 | **OPEN_BLOCKING** |
| P5-E.9E.2 | **PASS** |

**Report:** `qa/p5-search-client-hardening-fixtures.html`, `js/search-recall-utils.js`

**Next:** P5-E.9E.3 DB strategy or P5-E.9E.4 staging verification. No push/deploy/launch.

---

## 149. P5-E.9E.1 — Local Search Recall Fixture (PASS)

**Milestone:** P5-E.9E.1 — Local Search Recall Fixture. **PASS**.

| Check | Result |
|-------|--------|
| Corpus + Query Matrix | 11 records + 15 hit queries |
| Browser Fixture | **98/98 PASS** |
| Node Check | PASS |
| LOCAL_RECALL_FIXTURE_PASS | **PASS** |
| S-06 | **OPEN_BLOCKING** |
| P5-E.9E.1 | **PASS** |

**Report:** `qa/p5-search-recall-fixtures.html`

**Next:** P5-E.9E.2 search client recall hardening. No push/deploy/launch.

---

## 147. P5-E.9D.3C — Entity SSG Generator Implementation (PASS)

**Milestone:** P5-E.9D.3C — Entity SSG Generator Implementation. **PASS**.

| Check | Result |
|-------|--------|
| Generator Script | `scripts/build-entity-ssg-fixtures.mjs` — Node-Core only |
| Fixture JSON Input | `qa/fixtures/p5-entity-ssg-fixtures.json` — 3 entities |
| Generated Pages | `wiki/post/qa-ssg-*-prototype/index.html` × 3 |
| Node QA | `qa/p5-entity-ssg-generator-check.mjs` — PASS |
| Browser Fixture | `p5-entity-ssg-prototype-fixtures.*` — PASS |
| Generator Marker | `data-bl-ssg-source="fixture-generator"` |
| Hydration Hook | `data-bl-ssg-hydrate="1"` |
| Sitemap | Prototype URLs **excluded** |
| CSR Fallback | `/wiki/post/` unverändert |
| DB / Supabase / Deploy | **Nein** |
| Entity SSG Fixture Generator | **FIXTURE_GENERATOR_PASS** |
| Entity Detail SEO | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9D.3C | **PASS** |

**Report:** `scripts/build-entity-ssg-fixtures.mjs`, `qa/p5-entity-ssg-generator-check.mjs`

**Next:** P5-E.9D.3D entity sitemap integration or P5-E.9E search recall. No push/deploy/launch.

---

## 146. P5-E.9D.3B — Static Entity HTML Prototype (PASS)

**Milestone:** P5-E.9D.3B — Static Entity HTML Prototype. **PASS**.

| Check | Result |
|-------|--------|
| Fixture JSON | `qa/fixtures/p5-entity-ssg-fixtures.json` — 3 entities |
| Prototype Pages | `wiki/post/qa-ssg-creature-prototype/`, `qa-ssg-item-prototype/`, `qa-ssg-biome-prototype/` |
| QA Fixture | `p5-entity-ssg-prototype-fixtures.*` — **84/84 PASS** |
| Sitemap | Prototype URLs **excluded** |
| CSR Fallback | `/wiki/post/` unverändert |
| Generator / DB / Deploy | **Nein** |
| Entity SSG Implementation | **NOT IMPLEMENTED** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9D.3B | **PASS** |

**Report:** `qa/p5-entity-ssg-prototype-fixtures.html`, `wiki/post/qa-ssg-creature-prototype/index.html`

**Next:** P5-E.9D.3C entity SSG generator or P5-E.9E search recall. No push/deploy/launch.

---

## 145. P5-E.9D.3A — Entity SSG Prototype Plan (PASS)

**Milestone:** P5-E.9D.3A — Entity SSG Prototype Plan (planning only). **PASS**.

| Check | Result |
|-------|--------|
| Prototype Plan | `p5-entity-ssg-prototype-plan.md` |
| Entity Data Contract | `[x]` JSON-Schema |
| Template Requirements | `[x]` Head/Body/JS |
| Output Path | `[x]` `wiki/post/<canonical_slug>/index.html` |
| Metadata + JSON-LD Strategy | `[x]` |
| Hydration Compatibility | `[x]` dokumentiert |
| Fixture-first Data Source | `[x]` 9D.3B → 9D.3C |
| Generator / DB / Deploy | **Nein** |
| Entity Sitemap URLs | **Excluded** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9D.3A | **PASS** |

**Report:** `docs/architecture/p5-entity-ssg-prototype-plan.md`

**Next:** P5-E.9D.3B static entity HTML prototype or P5-E.9E search recall. No push/deploy/launch.

---

## 143. P5-E.9D.2 — Static Hub Metadata Cleanup (PASS)

**Milestone:** P5-E.9D.2 — Static Hub Metadata Cleanup. **PASS**.

| Check | Result |
|-------|--------|
| Hub HTML metadata | canonical + description + OG/Twitter auf indexierbaren Hubs |
| Sitemap | 14 statische Routen (`sitemap.xml`) |
| QA Fixture | `p5-seo-hub-metadata-fixtures.*` — **100/100 PASS** |
| Homepage JSON-LD | `[x]` WebSite schema erhalten |
| post detail CSR shell | **OPEN** — S-05 OPEN_BLOCKING |
| search noindex | `[x]` von 9D.1 unverändert |
| Deploy / Search Console | **Nein** |
| Static Hub Metadata | **STATIC_HUB_METADATA_HARDENED** |
| Sitemap (statische Hubs) | **STATIC_SITEMAP_HUBS_UPDATED** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Structured Data | **PARTIAL** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9D.2 | **PASS** |

**Report:** `sitemap.xml`, `qa/p5-seo-hub-metadata-fixtures.html`

**Next:** P5-E.9D.3 entity prerender decision or P5-E.9E search recall. No push/deploy/launch.

---

## 142. P5-E.9D.1 — robots/noindex Static Hardening (PASS)

**Milestone:** P5-E.9D.1 — robots/noindex Static Hardening. **PASS**.

| Check | Result |
|-------|--------|
| robots.txt | Disallow Admin/Auth/QA/Create/Edit/Search |
| HTML noindex | admin, auth, create/edit, search, public/admin |
| QA Fixture | `p5-seo-static-hardening-fixtures.*` — **33/33 PASS** |
| Indexierbare Hubs geschützt | `/`, browse, privacy, imprint nicht noindex |
| post detail | Kein erzwungenes noindex (9D.3 deferred) |
| Deploy / Search Console | **Nein** |
| robots/noindex | **STATIC_HARDENED** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Sitemap / Structured Data | **PARTIAL** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9D.1 | **PASS** |

**Report:** `robots.txt`, `qa/p5-seo-static-hardening-fixtures.html`

**Next:** P5-E.9D.2 hub metadata. No push/deploy/launch.

---

## 141. P5-E.9D — SEO/CSR Closure Plan (PASS)

**Milestone:** P5-E.9D — SEO/CSR Closure Plan (planning only). **PASS**.

| Check | Result |
|-------|--------|
| SEO/CSR Plan | `p5-seo-csr-closure-plan.md` |
| Indexing Policy Matrix | `[x]` |
| CSR Shell Risk Matrix | `[x]` |
| Sitemap/robots Gap Matrix | `[x]` |
| Minimal Pre-Launch + Full Launch SEO | `[x]` |
| Folge-Gates 9D.1–9D.5 | `[x]` |
| Deploy / Search Console | **Nein** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| S-06 Search Recall | **OPEN_BLOCKING** (P5-E.9E) |
| Sitemap / robots / Structured Data | **PARTIAL** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9D | **PASS** |

**Report:** `docs/architecture/p5-seo-csr-closure-plan.md`

**Next:** P5-E.9D.1 robots/noindex hardening. No push/deploy/launch.

---

## 140. P5-E.9C.2 — Local Error Capture Stub (PASS)

**Milestone:** P5-E.9C.2 — Local Error Capture Stub. **PASS**.

| Check | Result |
|-------|--------|
| Error Reporter | `js/error-reporter.js` |
| QA Fixture | `qa/p5-error-reporter-fixtures.*` — **21/21 PASS** |
| HTML Integration | index, browse, search, post, create-post, support, admin |
| Guard Hooks | release-gate-client, content-safety, notifications |
| Provider / SDK / Keys | **Nein** |
| Network reports | **Kein** |
| Monitoring Local Stub | **PASS** |
| Monitoring Evidence | **LOCAL_STUB_PASS** |
| Error Tracking / Alerting | **OPEN** |
| P5-E.9C.3 | **STOPP** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9C.2 | **PASS** |

**Report:** `js/error-reporter.js`, `qa/p5-error-reporter-fixtures.html`

**Next:** P5-E.9C.3 (STOPP) or P5-E.9A.2. No push/deploy/launch/provider-keys.

---

## 139. P5-E.9C.1 — Monitoring Provider Decision (PASS)

**Milestone:** P5-E.9C.1 — Monitoring Provider Decision (planning only). **PASS**.

| Check | Result |
|-------|--------|
| Provider Decision | `p5-monitoring-provider-decision.md` |
| Provider Comparison Matrix | `[x]` Sentry, OTel, Supabase, Uptime, Manuell |
| Minimal Pre-Launch + Full Launch Stack | `[x]` |
| Privacy / GDPR Guardrails | `[x]` |
| Later Gates 9C.2–9C.4 | `[x]` |
| Provider aktiviert / SDK / Keys | **Nein** |
| Monitoring Provider Decision | **DECISION DOCUMENTED** |
| Monitoring Evidence | **OPEN** |
| Error Tracking / Alerting | **OPEN** |
| Restore Evidence | **OPEN** |
| P5-E.9A.2 | **Separate Freigabe** |
| S-08 | **OPEN_BLOCKING** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9C.1 | **PASS** |

**Report:** `docs/architecture/p5-monitoring-provider-decision.md`

**Next:** P5-E.9C.2 Local Error Capture Stub. No push/deploy/launch/provider-keys.

---

## 137. P5-E.9B.1 — Staging Backup Inventory (PASS)

**Milestone:** P5-E.9B.1 — Staging Backup Inventory (read-only). **PASS**.

| Check | Result |
|-------|--------|
| Inventory Report | `p5-staging-backup-inventory.md` |
| Backup-/Restore-Hinweise katalogisiert | P5-STAGING.3, Reset-Skripte, 15+ Doc-Refs |
| Tooling-Hinweise | `pg_dump` 18.4 (historisch); keine Repo-Automation |
| Automatisierte Backup-Skripte | **0** gefunden |
| Frischer Backup-Nachweis | **OFFEN** |
| Restore Evidence | **OPEN** |
| P5-E.9A.2 | **BLOCKED** — B.1 ≠ Backup Evidence |
| Dump / SQL / Restore ausgeführt | **Nein** |
| Legacy-Ref verboten | `[x]` dokumentiert |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9B.1 | **PASS** |

**Report:** `docs/architecture/p5-staging-backup-inventory.md`

**Next:** P5-E.9B.2 (STOPP). No push/deploy/launch/restore/dumps.

---

## 136. P5-E.9B — Backup/Restore Evidence Plan (PASS)

**Milestone:** P5-E.9B — Backup/Restore Evidence Plan (planning only). **PASS**.

| Check | Result |
|-------|--------|
| Evidence Plan | `p5-backup-restore-evidence-plan.md` |
| Backup Scope Matrix | `[x]` posts, wiki_*, notifications, profiles, comments, release_gate, storage buckets, auth boundary |
| Restore Scope Matrix | `[x]` Staging isoliert / Production STOPP |
| Cleanup-Strategie 9A.2 | `[x]` `qa-splus03-xss-*` — Plan only |
| Folge-Gates | 9B.1 Inventory **PASS**, 9B.2 Backup (**STOPP**), 9B.3 Restore (**STOPP**), 9B.4 Cleanup (**STOPP**) |
| Warum nicht geschlossen | Kein Restore-Drill; kein Prod-Schedule; kein Snapshot-Nachweis nach Plan |
| P5-E.9A.2 | **BLOCKED** — gespeicherte Payloads weiterhin STOPP |
| SQL apply / DB / Restore | **None** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9B | **PASS** |

**Report:** `docs/architecture/p5-backup-restore-evidence-plan.md`

**Next:** P5-E.9B.2. No push/deploy/launch/restore/dumps.

---

## 135. P5-E.9A.1 — S+-03 Local/Mocked Runtime XSS Evidence (PASS)

**Milestone:** P5-E.9A.1 — S+-03 Runtime XSS Local/Mocked Evidence. **PASS**.

| Check | Result |
|-------|--------|
| Fixture | `qa/p5-splus03-runtime-xss-fixtures.html` + `.js` |
| Checks | **25/25 PASS** (localhost:8081) |
| Runtime flag | `__boundloreXssRuntimeHit` = `false` |
| Mocked surfaces | post body, BLMETA, source_url, avatar, notification URL, search escape, card excerpt |
| Nicht exportierte Helfer | `post-detail.js`/`render-posts.js`/`search.js` — Pipeline inline repliziert |
| Gespeicherte Payloads | **Keine** |
| Supabase / DB / Storage | **Keine** |
| S+-03 Local/Mocked Runtime | **PASS** |
| S+-03 Runtime (gesamt) | **PARTIAL** |
| S+-03 Staging Runtime | **OPEN** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9A.1 | **PASS** |

**Report:** `docs/architecture/p5-splus03-runtime-xss-evidence-plan.md`

**Next:** P5-E.9A.2 (STOPP). No push/deploy/launch.

---

## 134. P5-E.9A — S+-03 Runtime XSS Evidence Plan (PASS)

**Milestone:** P5-E.9A — S+-03 Runtime XSS Evidence Plan (planning only). **PASS**.

| Check | Result |
|-------|--------|
| Evidence Plan | `p5-splus03-runtime-xss-evidence-plan.md` |
| XSS-Surface-Matrix | `[x]` 18+ Surfaces dokumentiert |
| S+-03 Repo/Fixture | **CLOSED** (45/45) |
| S+-03 Runtime | **PARTIAL** — Fixture ≠ Runtime |
| Fehlende Runtime-Beweise | post-detail stored render, roundtrip, legacy content |
| P5-E.9A.1 empfohlen | Local/mocked fixture — kein DB |
| P5-E.9A.2 | Staging stored payload — **STOPP** bis Freigabe |
| Warum nicht vollständig CLOSED | Kriterien 4–8 in Evidence Plan offen |
| SQL apply / DB access | **None** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.9A | **PASS** |

**Report:** `docs/architecture/p5-splus03-runtime-xss-evidence-plan.md`

**Next:** P5-E.9A.1. No push/deploy/launch.

---

## 133. P5-E.9 — Production Closure Plan (PASS)

**Milestone:** P5-E.9 — Production Closure Plan (planning/acceptance only). **PASS**.

| Check | Result |
|-------|--------|
| Production Closure Plan | `p5-production-closure-plan.md` |
| Closure Ledger | `[x]` 22 Findings klassifiziert |
| Gate sequence P5-E.9A…9F + P5-E.8A.4 | `[x]` dokumentiert |
| SQL apply / DB / Production touch | **None** |
| Production Closure | **NOT CLOSED** (Plan only) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| Storage Closure (DB) | **DEFERRED_ACCEPTED** (locked MVP) |
| Upload Path Disablement | **CLOSED** (P5-E.8C) |
| P5-E.9 | **PASS** |

### Was P5-E.9 geklärt hat

- Vollständiger **Production Closure Ledger** mit CLOSED / CLOSED_FOR_LOCKED_MVP / DEFERRED_ACCEPTED / PARTIAL / OPEN_BLOCKING / NOT_TESTED
- Sichere **Gate-Reihenfolge** ab aktuellem Stand (9A → 9B → 9C → 9F → 9D → 9E → 8A.4 → P5-E.10+)
- **Stop Conditions** und explizit verbotene Aktionen bis Freigabe
- Keine Wiedereröffnung geschlossener Staging-Findings (P5-E.7A.2, P5-E.8C)

### Product Activation Blocker

| Blocker | Klasse |
|---------|--------|
| Production Closure (S+-01…04 auf Prod) | OPEN_BLOCKING |
| S+-03 Runtime XSS | PARTIAL (9A.1 local mock PASS; Staging offen) |
| S-07 Backup/Restore | PARTIAL (Staging backup PASS; Restore offen) |
| S-08 Monitoring | OPEN_BLOCKING (P5-E.9C + 9C.1 + 9C.2 Stub; keine Provider-Integration) |
| Incident Response | OPEN_BLOCKING |

### Public Launch Blocker (zusätzlich)

| Blocker | Klasse |
|---------|--------|
| Alle Product-Activation-Blocker | — |
| S-05 SEO/CSR | OPEN_BLOCKING (P5-E.9D Plan; CSR-Shells, kein Prerender) |
| S-06 Search Recall | OPEN_BLOCKING |
| S-10 Production RLS verification | NOT_TESTED |
| Storage DB vor Unlock | DEFERRED_ACCEPTED → OPEN vor Unlock |

### Empfohlene nächste Gates

1. **P5-E.9A** — S+-03 Runtime XSS Evidence Plan
2. **P5-E.9B** — Backup/Restore Evidence Plan
3. **P5-E.9C** — Monitoring/Error Tracking Plan

**Report:** `docs/architecture/p5-production-closure-plan.md`

**Next:** P5-E.9A. No push/deploy/launch.

---

## 132. P5-E.8D — Runtime / Product-Activation Gap Review (PASS)

**Milestone:** P5-E.8D — docs/analysis only. **PASS**.

| Check | Result |
|-------|--------|
| Product-Activation Gap Review | `p5-product-activation-gap-review.md` |
| Runtime Closure Plan | `p5-runtime-closure-plan.md` |
| SQL apply / DB access | **None** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.8D | **PASS** |

**Next:** P5-E.9 Production Closure Plan. No push/deploy/launch.

---

## 131. P5-E.8C — Upload Path Disablement Review (PASS)

**Milestone:** P5-E.8C — frontend upload hardening. **PASS**.

| Check | Result |
|-------|--------|
| `release-gate-client.js` | **p5-e8c** storage defer helpers |
| `create-post.js` / `support.js` | **Hardened** |
| `initCreatePermissions` | **Restored** |
| Upload fixture | **24/24 PASS** |
| Local server | **8081** |
| SQL apply / DB access | **None** |
| Storage Closure (DB) | **DEFERRED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.8C | **PASS** |

**Report:** `docs/architecture/p5-upload-path-disablement-review.md`

**Next:** P5-E.8A.4 Owner-Capable Investigation. No push/deploy/launch.

---

## 130. P5-E.8A.2 — Storage Owner Path + Bucket Scope Review (PASS)

**Milestone:** P5-E.8A.2 — analysis/documentation only. **PASS**.

| Check | Result |
|-------|--------|
| Storage in app | `create-post.js` (`discovery-uploads`), `support.js` (`report-screenshots`) |
| Core read/browse/search | **No storage dependency** |
| Dashboard owner path | **REJECTED** |
| `discovery-uploads` bucket | **Missing** on staging |
| Storage policy | **Not applied** |
| Storage defer viable for locked MVP? | **Yes** — with P5-E.8C upload path review |
| SQL apply / DB access | **None** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| P5-E.8A.2 | **PASS** |

**Report:** `docs/architecture/p5-storage-owner-path-bucket-scope-review.md`

**Next:** P5-E.8C Upload Path Disablement Review. No push/deploy/launch.

---

## 129. P5-E.8A Resume — Storage Policy Apply (FAIL)

**Milestone:** P5-E.8A resume — Dashboard apply. **FAIL**.

| Check | Result |
|-------|--------|
| Dashboard project confirmed | `[x]` boundlore-staging / `jzzgoiwfbuwiiyvwgwri` |
| Apply via SQL Editor | `[x]` attempted |
| Apply error | `42501 must be owner of relation objects` |
| Policy applied | **NO** |
| release_gate locked after | `[x]` true |
| P5-E.8A | **FAIL** |

**Report:** `docs/architecture/p5-storage-policy-owner-apply-report.md`

---

## 128. P5-E.8A — Storage Policy Owner-Capable Apply (BLOCKED)

**Milestone:** P5-E.8A — Dashboard apply on staging. **BLOCKED**.

| Check | Result |
|-------|--------|
| Backup | `[x]` 290,277 bytes |
| Dashboard apply | **BLOCKED** — sign-in |
| Policy applied | **NO** |
| Storage closure | **DEFERRED** |
| P5-E.8A | **BLOCKED** |

**Report:** `docs/architecture/p5-storage-policy-owner-apply-report.md`

---

## 127. P5-E.8 — Storage Closure Plan (PASS)

**Milestone:** P5-E.8 — Storage Closure Plan (planning/review only). **PASS**.

| Check | Result |
|-------|--------|
| Deferred SQL static review | `[x]` PASS |
| Owner-capable paths evaluated | `[x]` |
| Preferred apply path | Dashboard SQL Editor (staging) |
| psql pooler | **Rejected** |
| P5-E.8A apply gate designed | `[x]` |
| SQL apply / DB access | **None** |
| Storage closure | **DEFERRED** |
| Product-Activation-Ready | **FAIL** (unchanged) |
| Public-Launch-Ready | **NO-GO** (unchanged) |
| P5-E.8 | **PASS** |

**Report:** `docs/architecture/p5-storage-closure-plan.md`

---

## 126. P5-E.7B — Release Lock Fixture Alignment (PASS)

**Milestone:** P5-E.7B — Release Lock DB fixture aligned for storage defer. **PASS** (fixture/docs only).

| Check | Result |
|-------|--------|
| Storage checks 21–22 | **DEFERRED** (not FAIL) |
| Required core checks | **32/32 PASS** |
| Fixture overall | **CORE_PASS_STORAGE_DEFERRED** |
| SQL / DB access | **None** |
| Product-Activation-Ready | **FAIL** (unchanged) |
| Public-Launch-Ready | **NO-GO** (unchanged) |
| P5-E.7B | **PASS** |

**Report:** `docs/architecture/p5-release-lock-fixture-alignment-report.md`

---

## 125. P5-E.7A.2 — Policy Dependency SELECT Grants (PASS)

**Milestone:** P5-E.7A.2 — direct posts release-lock RLS proven. **PASS**.

| Check | Result |
|-------|--------|
| SELECT grants | `[x]` PASS |
| Release-lock RLS | `[x]` PASS |
| P5-E.7A.2 | **PASS** |

**Report:** `docs/architecture/p5-policy-dependency-select-grants-retest-report.md`

---

## 124. P5-E.7A — Direct Posts Grant/RLS Re-Test (PARTIAL)

**Milestone:** P5-E.7A — posts grant applied; RLS isolation PARTIAL. **PARTIAL**.

| Check | Result |
|-------|--------|
| Grant apply | `[x]` PASS |
| Direct posts RLS | `[x]` PARTIAL |
| P5-E.7A | **PARTIAL** |

**Report:** `docs/architecture/p5-direct-posts-grant-rls-retest-report.md`

---

## 123. P5-E.6 — Staging Evidence Acceptance + Gap Review (PASS)

**Milestone:** P5-E.6 — evidence acceptance review. **PASS** (docs only).

| Check | Result |
|-------|--------|
| S+-02 accepted | `[x]` |
| S+-04 accepted | `[x]` |
| S+-01 PARTIAL | `[x]` |
| P5-E.6 | **PASS** |

**Report:** `docs/architecture/p5-staging-evidence-acceptance-gap-review.md`

---

## 122. P5-E.5 Re-run 3 — Staged DB Security Retest (PARTIAL)

**Milestone:** P5-E.5 Re-run 3 — SQL apply PASS on staging. **PARTIAL**.

| Check | Result |
|-------|--------|
| release_gate apply | `[x]` PASS |
| observations apply | `[x]` PASS |
| Negative RLS/RPC | `[x]` PARTIAL |
| P5-E.5 Re-run 3 | **PARTIAL** |

**Report:** `docs/architecture/p5-staged-db-security-retest-rerun3-report.md`

---

## 121. P5-E.5C — Storage Policy Defer Fix (PASS)

**Milestone:** P5-E.5C — storage policy deferred; release gate apply path unblocked in repo. **PASS** (repo only).

| Check | Result |
|-------|--------|
| Storage DDL removed from default apply | `[x]` |
| Deferred file created | `[x]` |
| Ready for P5-E.5 Re-run 3 | **YES** (explicit approval) |
| P5-E.5C | **PASS** |

**Report:** `docs/architecture/p5-storage-policy-defer-fix-report.md`

---

## 120. P5-E.5 Re-run 2 — Staged DB Security Retest (BLOCKED)

**Milestone:** P5-E.5 Re-run 2 — storage policy owner error; **BLOCKED**.

| Check | Result |
|-------|--------|
| release_gate apply | `[ ]` FAIL |
| Negative RLS/RPC | `[x]` NOT RUN |
| P5-E.5 Re-run 2 | **BLOCKED** |

**Report:** `docs/architecture/p5-staged-db-security-retest-rerun2-report.md`

---

## 119. P5-E.5B — Staging Testuser Profiles Provisioning (PASS)

**Milestone:** P5-E.5B — profiles for A/B on staging; **PASS**.

| Check | Result |
|-------|--------|
| Pre-write backup | `[x]` 271,784 bytes |
| Profiles A/B | `[x]` role `user` |
| P5-E.5 Re-run | **READY** — explicit approval |

**Report:** `docs/architecture/p5-staging-testuser-profiles-report.md`

---

## 118. P5-E.5A — Release Gate SQL Dependency Order Fix (PASS)

**Milestone:** P5-E.5A — local dependency reorder; **PASS**.

| Check | Result |
|-------|--------|
| SQL apply / DB access | `[x]` — none |
| `bl_is_admin_actor` before policies | `[x]` |
| Release Gate SQL Order Fix (5A) | **PASS** |
| Ready for P5-E.5B | **YES** |
| P5-E.5 Re-run | **BLOCKED** until profiles + approval |

**Report:** `docs/architecture/p5-release-gate-sql-order-fix-report.md`

---

## 117. P5-E.5 Re-run — Staged DB Application (BLOCKED)

**Milestone:** P5-E.5 Re-run — SQL apply failed; **BLOCKED**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-apply backup | `[x]` 270,836 bytes |
| Apply 1 notifications | `[x]` PASS |
| Apply 2 release_gate | `[ ]` FAIL — `bl_is_admin_actor` before policies |
| Negative RLS/RPC tests | `[x]` NOT RUN |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staged-db-application-rerun-report.md`

---

## 116. P5-STAGING.6 Re-run 3 — Base Schema Apply (PASS)

**Milestone:** P5-STAGING.6 Re-run 3 — staging apply; **PASS**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-apply backup | `[x]` 185,427 bytes |
| 6A/6B/6C validated | `[x]` |
| SQL apply | `[x]` PASS |
| Core 9 tables in `public` | `[x]` |
| 84 policies | `[x]` |
| Test users A/B confirmed | `[x]` |
| P5 security deferred | `[x]` |
| P5-E.5 re-run | **READY** — explicit approval |

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun3-report.md`

---

## 115. P5-STAGING.6C — Core Schema Policy Reconstruction (PASS)

**Milestone:** P5-STAGING.6C — local policy reconstruction; **PASS**.

| Check | Result |
|-------|--------|
| SQL apply / DB access | `[x]` — none |
| 84 policies reconstructed | `[x]` |
| Core Schema Policy Fix (6C) | **PASS** |
| Ready for P5-STAGING.6 Re-run | **YES** — explicit approval |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-core-schema-policy-reconstruction-fix-report.md`

---

## 114. P5-STAGING.6 Re-run 2 — Base Schema Apply (FAIL)

**Milestone:** P5-STAGING.6 Re-run 2 — staging apply; **FAIL**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-apply backup | `[x]` 185,427 bytes |
| 6A/6B validated | `[x]` |
| SQL apply | `[ ]` FAIL — truncated policies |
| Staging unchanged | `[x]` |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun2-report.md`

---

## 113. P5-STAGING.6B — Core Schema Extension Fix (PASS)

**Milestone:** P5-STAGING.6B — local `pg_trgm` extension fix; **PASS**.

| Check | Result |
|-------|--------|
| SQL apply / DB access | `[x]` — none |
| `pg_trgm` before `gin_trgm_ops` | `[x]` |
| Core Schema Extension Fix (6B) | **PASS** |
| Ready for P5-STAGING.6 Re-run | **YES** — explicit approval |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-core-schema-extension-fix-report.md`

---

## 112. P5-STAGING.6 Re-run — Base Schema Apply (FAIL)

**Milestone:** P5-STAGING.6 Re-run — staging apply; **FAIL**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-apply backup | `[x]` 185,427 bytes |
| 6A order validated on apply | `[x]` |
| SQL apply | `[ ]` FAIL — `pg_trgm` line 660 |
| Staging unchanged | `[x]` |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun-report.md`

---

## 109. P5-STAGING.5C — Curated Core Schema Extraction (PASS)

**Milestone:** P5-STAGING.5C — extraction only; **PASS**.

| Check | Result |
|-------|--------|
| `core_schema_foundation.sql` | `[x]` |
| Six core tables in file | `[x]` |
| No INSERT/COPY/data | `[x]` |
| No DB access | `[x]` |
| Curated Extraction (5C) | **PASS** |
| P5-STAGING.6 ready | **YES** |

**Report:** `docs/architecture/p5-curated-core-schema-extraction-report.md`

**Next:** P5-STAGING.6 explicit approval. No push/deploy/launch.

---

## 108. P5-STAGING.5B Re-run — Legacy Schema-Only Export (PASS)

**Milestone:** P5-STAGING.5B re-run — read-only export; **PASS**.

| Check | Result |
|-------|--------|
| `.env.legacy` local | `[x]` |
| Legacy ref `ohkoojpzmptdfyowdgog` | `[x]` |
| Staging excluded | `[x]` |
| `pg_dump --schema-only --schema=public` | `[x]` |
| Dump | 138,895 bytes, gitignored |
| No-data check | `[x]` PASS |
| Core tables | `[x]` all six |
| SQL apply | `[x]` — none |
| Legacy Export (5B) | **PASS** |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-legacy-schema-only-export-report.md`

**Next:** P5-STAGING.5C. No push/deploy/launch.

---

## 107. P5-STAGING.5B — Legacy Schema-Only Export (BLOCKED — first attempt)

**Milestone:** P5-STAGING.5B — user approval granted; **BLOCKED** at `.env.legacy` check.

| Check | Result |
|-------|--------|
| User approval for 5B | `[x]` |
| `.env.legacy` local | `[ ]` — **missing** |
| `.env.legacy` gitignored | `[x]` |
| Legacy ref intended | `ohkoojpzmptdfyowdgog` — not connected |
| Staging excluded | `jzzgoiwfbuwiiyvwgwri` |
| `pg_dump` executed | `[x]` — none |
| Dump gitignored | `[x]` — N/A (no dump) |
| SQL apply / data export | `[x]` — none |
| Legacy Export (5B) | **BLOCKED** |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-legacy-schema-only-export-report.md`

**Next:** Create `.env.legacy` locally → re-run P5-STAGING.5B → 5C → P5-STAGING.6. No push/deploy/launch.

---

## 106. P5-STAGING.5A — Legacy Schema-Only Export Plan

**Milestone:** P5-STAGING.5A — Path A planning only; **no export**.

| Check | Result |
|-------|--------|
| Legacy export plan | `[x]` |
| No pg_dump / no DB access | `[x]` |
| Schema-only rules | `[x]` |
| Hard stops | `[x]` |
| Legacy Export Plan | **PASS** |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-legacy-schema-only-export-plan.md`

---

## 105. P5-STAGING.5 — Base Schema Provisioning Plan

**Milestone:** P5-STAGING.5 — planning/inventory only; **no SQL**.

| Check | Result |
|-------|--------|
| SQL files inventoried | `[x]` — 21 files |
| `posts`/`profiles` CREATE in repo | `[ ]` — **blocker** |
| Apply order proposed | `[x]` |
| Dangerous SQL excluded | `[x]` |
| Base Schema Plan | **PARTIAL** |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staging-base-schema-provisioning-plan.md`

---

## 104. P5-E.5 Re-run — Staged DB Application (BLOCKED)

**Milestone:** P5-E.5 Re-run — explicit approval; **BLOCKED** at base schema check.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Staging only | `[x]` |
| Pre-apply backup | `[x]` |
| Base tables (posts, profiles, …) | `[ ]` — missing |
| SQL apply | `[x]` — none |
| Negative live tests | `[x]` — NOT RUN |
| Local fixtures | `[x]` — all PASS |
| P5-E.5 Re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staged-db-application-report.md`

**Next:** P5-STAGING.5. No push/deploy/launch.

---

## 103. P5-STAGING.4 — Staging Test User Provisioning

**Milestone:** P5-STAGING.4 — docs-only test user record; **no SQL**.

| Check | Result |
|-------|--------|
| `p5_e5_user_a@example.com` in staging | `[x]` |
| `p5_e5_user_b@example.com` in staging | `[x]` |
| No passwords/keys in repo | `[x]` |
| `service_role` not used | `[x]` |
| Test User Provisioning | **PASS** |
| P5-E.5 re-run | **READY FOR USER APPROVAL** |

**P5-STAGING.4 complete.** No push/deploy/launch.

**Report:** `docs/architecture/p5-staging-test-user-provisioning.md`

---

## 102. P5-STAGING.3 — Tooling & Backup Dry Run

**Milestone:** P5-STAGING.3 — read-only connection + local dump; **no SQL apply**.

| Check | Result |
|-------|--------|
| `psql` / `pg_dump` 18.4 | `[x]` |
| Read-only connection | `[x]` PASS |
| Full pre-apply dump | `[x]` — gitignored |
| Legacy ref excluded | `[x]` |
| Tooling Readiness | **PASS** |
| Backup Readiness | **PASS** |
| P5-E.5 re-run | **PARTIAL** |

**P5-STAGING.3 complete.** Backup path proven. P5-E.5 needs testusers + explicit approval. No push/deploy/launch.

**Report:** `docs/architecture/p5-staging-tooling-backup-dry-run.md`

---

## 101. P5-STAGING.2 — Environment Proof & Dry Run

**Milestone:** P5-STAGING.2 — environment proof + dry-run plan; **no SQL**, **no DB changes**.

| Check | Result |
|-------|--------|
| `.env.staging` local + gitignored | `[x]` |
| Staging ref `jzzgoiwfbuwiiyvwgwri` | `[x]` |
| Legacy ref `ohkoojpzmptdfyowdgog` excluded | `[x]` |
| `CONFIRM_ISOLATED=true` | `[x]` |
| No `service_role` / `sb_secret` client key | `[x]` |
| Supabase CLI / psql | `[ ]` — not installed |
| Backup/dump tested | `[ ]` |
| Environment Proof | **PASS** |
| Dry Run Readiness | **PARTIAL** |
| P5-E.5 re-run | **BLOCKED** |

**P5-STAGING.2 complete.** Isolated staging identity proven locally. P5-E.5 blocked on tooling, backup, testusers, user approval. No push/deploy/launch.

**Report:** `docs/architecture/p5-staging-environment-proof.md`

---

## 100. P5-STAGING.1 — Dedicated Supabase Staging Provisioning Gate

**Milestone:** P5-STAGING.1 docs-only — staging plan + config example; **no SQL**, **no DB changes**.

| Check | Result |
|-------|--------|
| P5-E.5 blocked reason documented | `[x]` — isolated staging not proven |
| `p5-staging-environment-plan.md` | `[x]` |
| `.env.staging.example` (no secrets) | `[x]` |
| `.env.staging` gitignored | `[x]` |
| `ohkoojpzmptdfyowdgog` forbidden for P5-E.5 | `[x]` |
| P5-E.5 re-entry criteria | `[x]` |
| SQL / Supabase project created | `[x]` — none |

**P5-STAGING.1 complete.** User must create dedicated Supabase staging project manually. Next: P5-STAGING.2. No push/deploy/launch.

---

## 99. P5-E.5 — Staged DB Application & Negative RLS/RPC Tests (BLOCKED)

**Milestone:** P5-E.5 — **BLOCKED** at environment proof; no SQL applied.

| Check | Result |
|-------|--------|
| User approval staging-only | `[x]` |
| Isolated staging environment proven | `[ ]` — **BLOCKED** |
| Staging backup | `[ ]` — not created |
| SQL applied | `[ ]` — none |
| Negative RLS/RPC tests | `[ ]` — NOT RUN |
| Local fixtures PASS | `[x]` |
| S+-01..04 production-closed | `[ ]` |
| boundlore.com / production touched | `[x]` — none |

**P5-E.5 blocked.** Only one Supabase project available; same ref as `js/supabase-config.js`. Cannot prove isolated staging. No remote data changes.

**Report:** `docs/architecture/p5-staged-db-application-report.md`

**Next:** Provision dedicated staging; re-run P5-E.5. No push/deploy/launch.

---

## 98. P5-F.2 — Fable Retest Handoff Package

**Milestone:** P5-F.2 docs-only handoff — Fable S+ Security Retest evidence bundle; **no Fable retest executed**.

### P5-F.2 handoff package

| Check | Result |
|-------|--------|
| Handoff document created | `[x]` — `p5-fable-splus-retest-handoff.md` |
| Fable prompt created | `[x]` — `p5-fable-splus-retest-prompt.md` |
| Fable checklist created | `[x]` — `p5-fable-splus-retest-checklist.md` |
| S+ status matrix | `[x]` |
| Evidence file map | `[x]` |
| Fixture map | `[x]` |
| Recommended Fable procedure | `[x]` |
| Required verdict format | `[x]` |
| Explicit non-claims | `[x]` |
| S+ combined baseline handed off | `[x]` — P5-F.1 |
| Code / SQL / data changes | `[x]` — none |
| SQL executed / Supabase writes | `[x]` — none |
| Fable retest executed | `[x]` — none |
| S+-01..04 production-closed | `[ ]` |
| Live-RLS / Live-RPC | `[x]` — NOT TESTED |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-01..04 | Combined baseline retested — **not production-closed** |

**P5-F.2 Fable retest handoff package created.** No code, SQL, or data changes. No push, no deploy.

### Next candidate

**Fable Retest 1** (S+ only) with `docs/architecture/p5-fable-splus-retest-prompt.md`. No push/deploy/launch.

---

## 97. P5-F.1 — Combined S+ Security Retest Gate

**Milestone:** P5-F.1 local combined retest — all four S+ baselines **combined baseline retested**; **not production-closed**.

### P5-F.1 combined retest

| Check | Result |
|-------|--------|
| S+-02 combined baseline retested | `[x]` |
| S+-04 combined baseline retested | `[x]` |
| S+-03 combined baseline retested | `[x]` |
| S+-01 combined baseline retested | `[x]` |
| Notification fixture 24/24 PASS | `[x]` |
| Observation fixture 17/17 PASS | `[x]` |
| Sanitization fixture 45/45 PASS | `[x]` |
| Release Lock DB fixture 34/34 PASS | `[x]` |
| Release Lock UI fixture 30/30 PASS | `[x]` |
| Standard regression smoke | `[x]` |
| Static S+ grep checks | `[x]` PASS or NOT TESTED documented |
| SQL executed / Supabase writes | `[x]` — none |
| Live-RLS / Live-RPC | `[x]` — NOT TESTED |
| S+-01..04 production-closed | `[ ]` |
| Optional combined QA fixture | `[x]` — not created; retest doc sufficient |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-01..04 | **Combined baseline retested** — not production-closed |

**P5-F.1 combined S+ security retest completed locally.** All four S+ baselines re-verified together. No SQL, no data changes, no deploy, no push. Authoritative report: `docs/architecture/p5-splus-combined-retest.md`.

### Next candidate

**P5-F.2 Fable Retest Handoff Package**. No push/deploy/launch.

---

## 96. P5-E.4 — Release Gate Acceptance Sweep

**Milestone:** P5-E.4 local acceptance for S+-01 — **baseline accepted**, **not production-closed**.

### P5-E.4 acceptance sweep

| Check | Result |
|-------|--------|
| P5-E.2 DB/RLS/RPC baseline accepted (repo) | `[x]` |
| P5-E.3 Frontend/Admin UX baseline accepted | `[x]` |
| `release_gate` default locked / missing config = locked | `[x]` |
| Fail-closed helpers + restrictive policies | `[x]` |
| `bl_register_observation` release assert | `[x]` |
| ReleaseGateClient + create/edit/support guards | `[x]` |
| Admin unlock/relock UI prepared, not executed | `[x]` |
| Release Lock UI fixture 30/30 PASS | `[x]` |
| Release Lock DB fixture 34/34 PASS | `[x]` |
| Sanitization/Observation/Notification fixtures PASS | `[x]` |
| Standard regression smoke | `[x]` |
| SQL executed / Supabase writes | `[x]` — none |
| Live-RLS / Live-RPC | `[x]` — NOT TESTED |
| S+-01 baseline accepted | `[x]` |
| S+-01 production-closed | `[ ]` |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-01 | **Baseline accepted** — not production-closed |

**P5-E.4 acceptance sweep completed locally.** Release gate baseline accepted at repository level. SQL not applied. No data changes. No deploy. No push.

### Next candidate

**P5-F.1 Combined S+ Security Retest Gate**. No push/deploy/launch.

---

## 92. P5-D.2 — HTML Sanitization & URL Safety Acceptance Sweep

**Milestone:** P5-D.2 acceptance sweep; confirms P5-D.1 repo baseline is **baseline-accepted** — **not production-closed**.

### P5-D.2 acceptance sweep

| Check | Result |
|-------|--------|
| `BoundLoreContentSafety` p5-d1 accepted | `[x]` |
| Strict allowlist + URL scheme policy accepted | `[x]` |
| Sink guards (post/create/edit/avatar/admin) accepted | `[x]` |
| WikiEntryLayout upstream sanitization verified | `[x]` |
| Structured discovery builders escaped | `[x]` |
| Reflected search XSS probe clean | `[x]` |
| Sanitization fixture 45/45 PASS | `[x]` |
| Observation fixture 17/17 PASS | `[x]` |
| Notification fixture 24/24 PASS | `[x]` |
| Serializer bug fixed during sweep | `[x]` — `sanitizeRichTextHtml` returned empty output |
| Server-side sanitizer | `[ ]` |
| Stored content migration | `[ ]` |
| S+-03 production-closed | `[ ]` |
| Code changes beyond minimal fix + docs | `[x]` — one-line serializer fix only |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-03 | **Baseline accepted (P5-D.2)** — not production-closed |

**P5-D.2 acceptance sweep completed locally.** HTML sanitization baseline accepted at repository level. Minimal `sanitizeRichTextHtml` serializer fix applied during sweep. No server-side sanitizer, no stored-content migration, no Supabase writes, no deploy, no push. BoundLore remains NOT live-ready.

### Next candidate

**P5-E.1 Server-side Release Lock Planning Gate**. No push/deploy/launch.

---

## 91. P5-D.1 — HTML Sanitization & URL Safety Baseline

**Milestone:** P5-D.1 code baseline for S+-03 stored XSS / missing HTML sanitization; ready for P5-D.2 acceptance — **not production-closed**.

### S+-03 baseline (repo only)

| Item | Status |
|------|--------|
| `js/content-safety.js` — `BoundLoreContentSafety` (`p5-d1`) | Implemented |
| Sanitizer engine | DOMParser strict allowlist (no DOMPurify) |
| URL scheme whitelist | `http`/`https`/safe internal `/`; blocks `javascript:`, `data:`, etc. |
| `js/post-detail.js` post body + source_url + media | Guarded |
| `js/create-post.js` / `js/edit-post.js` Quill + meta URLs | Guarded |
| `js/avatar-utils.js` avatar_url | Guarded |
| `wiki/admin/index.html` compose/preview sinks | Guarded |
| QA `qa/p5-sanitization-security-fixtures.*` | 45 static checks |
| Server-side sanitizer / stored-content migration | **No** — out of scope |
| S+-03 production-closed | **No** — P5-D.2 required |
| Supabase writes / deploy / push | **No** |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-03 | **Baseline implemented (P5-D.1)** — not production-closed |

**P5-D.1 baseline implemented locally.** HTML sanitization and URL safety guardrails added for post render, create/edit outgoing content, avatars, and admin compose/preview paths. Notification (P5-B) and Observation (P5-C) fixtures remain green. No live database mutation, no deploy, no push. BoundLore remains NOT live-ready.

### Next candidate

**P5-E.1 Server-side Release Lock Planning Gate**. No push/deploy/launch.

---

## 90. P5-C.2 — Observation RPC Gate Acceptance Sweep

**Milestone:** P5-C.2 docs-only acceptance sweep; confirms P5-C.1 repository baseline is accepted at repo level — **not production-closed**.

### P5-C.2 acceptance sweep

| Check | Result |
|-------|--------|
| Ack schema accepted | `[x]` — `user_submission_acks.user_id` |
| `auth.uid()` gate accepted | `[x]` |
| Tutorial-ack before posts INSERT accepted | `[x]` |
| P5-E release-lock hook documented | `[x]` |
| `SECURITY DEFINER` + `search_path` accepted | `[x]` |
| `release_gate` not built | `[x]` |
| SQL not executed | `[x]` |
| QA fixture 17/17 PASS | `[x]` |
| Notification fixture 24/24 PASS | `[x]` |
| Standard regression smoke | `[x]` |
| Live-RPC NOT TESTED | `[x]` documented |
| S+-04 production-closed | `[ ]` |
| Code / SQL / data changes in P5-C.2 | `[x]` — docs only |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-04 | **Baseline accepted** — not production-closed |

**P5-C.2 acceptance sweep completed locally.** Observation RPC gate baseline accepted at repository level. SQL not executed; Live-RPC NOT TESTED. Release-lock remains P5-E scope. No Supabase writes, no deploy, no push. BoundLore remains NOT live-ready.

### Next candidate

**P5-D.2 HTML Sanitization Acceptance Sweep**. No push/deploy/launch.

---

## 89. P5-C.1 — Observation RPC Gate Fix Baseline

**Milestone:** P5-C.1 SQL baseline for S+-04 RPC gate bypass; ready for P5-C.2 acceptance — **not production-closed**.

### S+-04 baseline (file/repo only)

| Item | Status |
|------|--------|
| Ack schema | `user_submission_acks` (`user_id` PK) — from `fix_tutorial_ack_rls.sql` |
| `bl_register_observation` checks `auth.uid()` | Prepared in SQL file |
| Tutorial-ack gate before writes | `user_submission_acks` + admin bypass |
| P5-E release-lock hook | Documented in RPC; not implemented |
| `SECURITY DEFINER` + `search_path = public` | Retained with rationale |
| `release_gate` table | **Not built** — P5-E |
| QA fixture `qa/p5-observation-rpc-security-fixtures.*` | 17 static SQL checks |
| SQL executed / Live-RPC tested | **No** — Live-RPC NOT TESTED |
| S+-04 repo baseline accepted | **Yes** — P5-C.2 |
| S+-04 production-closed | **No** — DB gate required |
| Supabase writes / deploy / push | **No** |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-04 | **Baseline accepted (P5-C.2)** — not production-closed |

**P5-C.1 baseline implemented locally.** `bl_register_observation` tutorial-ack gate and P5-E hook prepared in repo SQL only. Accepted at repo level by P5-C.2 sweep. No live database mutation, no RPC calls, no deploy, no push. BoundLore remains NOT live-ready.

### Next candidate (historical)

**P5-C.2 Observation RPC Gate Acceptance Sweep** — **complete**. See §90.

---

## 87. P5-B.1 — Notification Injection Fix Baseline

**Milestone:** P5-B.1 code + SQL baseline for S+-02 Cross-User-Notification-Injection; **accepted at repo level via P5-B.2** — not production-closed.

### S+-02 baseline (file/repo only)

| Item | Status |
|------|--------|
| `notifications_insert_authenticated` → `user_id = auth.uid()` | Prepared in SQL file; **not applied to live DB** |
| `bl_is_safe_notification_target_url()` + constraint sketch | Documented in SQL file; apply in future DB gate |
| `js/notification-url-safety.js` | Implemented (`p5-b1`) |
| `js/notifications.js` insert guard + URL sanitize | Implemented |
| `js/auth-nav.js` render-time URL sanitize | Implemented |
| Cross-user admin/comment notifications | **Blocked** until SECURITY DEFINER RPC (future gate) |
| QA fixture `qa/p5-notification-security-fixtures.*` | 22+ URL corpus cases |
| SQL executed / live RLS tested | **No** — Live-RLS NOT TESTED |
| S+-02 repo baseline accepted | **Yes** — P5-B.2 |
| S+-02 production-closed | **No** — DB gate required |
| Supabase writes / deploy / push | **No** |

### Verdict unchanged

| Dimension | Verdict |
|-----------|---------|
| Foundation-Ready | PASS |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |
| S+-02 | **Baseline accepted (P5-B.2)** — not production-closed |

**P5-B.1 baseline implemented locally.** RLS insert policy and `target_url` constraint prepared in repo SQL only. Client-side URL safety helper and notification rendering/insert guards added. Accepted at repo level by P5-B.2 sweep. No live database mutation, no Supabase deploy, no push. BoundLore remains NOT live-ready.

### Next candidate (historical)

**P5-B.2 Notification Injection Acceptance Sweep** — **complete**. See §88.

---
