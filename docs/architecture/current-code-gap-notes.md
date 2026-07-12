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
| P4-C.1 | Admin Read-only Structured Field Inspector | Later code | Admin sees fields read-only; no edits |
| P4-D.1 | Structured Contribution Draft Flow Planning | Later docs/code | No real approvals yet |

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
