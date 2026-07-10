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

## 8. Next Step

1. **Optional:** Re-run admin panel check with active TheOverseer47 session to close the ⚠️ on Admin safety.
2. **P0-F / P1:** Full Recipe browse widget/index when prioritized.
3. **When ready:** Push + deploy (not part of this sweep).
