# Moderation & Conflict Matrix

| Fact Type | Auto-Merge? | Evidence Threshold | Confidence Handling | Conflict Handling | Archive / Restore Concerns |
|---|---|---|---|---|---|
| Free-text observation (behavior, notes) | yes (append) | none | — | coexists | uncritical |
| Numeric stats (damage, hp) | no if deviation > tolerance | 1 report ok as `reported` | corroborated at ≥2 matching | conflict row *(exists)*; show both values | conflict rows preserved on archive |
| Relations: drop / found_in | yes (add + report_count) | none | report_count as proxy | additive, no conflict needed | relation keeps source_post_id; archived source shows "archived source" |
| weak_to + resistant_to same type | **no** — hard contradiction | screenshot for resolution | — | both shown with disputed badge until review | — |
| Recipe ingredients | **never** auto | screenshot recommended | — | parallel variants as `reported` allowed | — |
| Entity creation via contribution (Add NPC) | no — always review | — | — | duplicate check against alias pool | — |
| Rename / canonical slug change | no — admin | — | — | old slug becomes alias | no 404 |
| Evidence tier promotion | no — admin/trusted | official source link | — | — | — |
| Dynamic facts (prices, event times, patch stats) | — | always `reported` + timestamp | "as of {date}" display | never timeless | prepare `observed_in_version` (P2) |
| Source weighting needed | stats, weakness, recipes, boss mechanics | trusted > anonymous; official overrides all | — | — | — |

## Conflict Flow Integration

Existing `contribution_conflicts` table and `needs_review` status remain authoritative. New relation types from `js/relations-registry.js` must declare `mergeBehavior` and `conflictBehavior` before integration.

## P1-C.1 — Evidence Rank & Dispute Baseline (local)

**Scope:** Helper/reader tolerance only — no dispute-resolution UI, no SQL, no data migration.

| Layer | Module | Behavior |
|-------|--------|----------|
| Registry | `js/evidence-rank.js` | Central enums: evidence tier, confidence, statement rank, dispute state, statement status |
| Readers | `readEvidenceSignals`, `normalizeStatementState` | Null-safe; numeric confidence 0–100 separate from enum confidence |
| UI | — | Existing evidence badges unchanged; no new rank/dispute badges on QA data |
| Admin preview | `wiki/admin/index.html` | Future-safe `_evidenceRankContext` on contribution preview; approve block on recipe conflict unchanged |
| Search | `js/search-signals.js` | Optional internal weight hook; QA search rankings unchanged when no explicit rank fields |

Real dispute-resolution workflow and auto-promote remain later P1-C scope.

## P1-C.2 — Evidence State Rendering & Admin Preview Tolerance (local)

**Scope:** Display helpers + read-only preview tolerance — no dispute-resolution UI, no SQL, no migration.

| Layer | Module | Behavior |
|-------|--------|----------|
| Display helpers | `js/evidence-rank.js` | Labels, `shouldDisplay*` gates, `getStatementStateBadges`, `renderStatementStateBadgeGroup` |
| Entry layout | `js/wiki-entry-layout.js` | State badges only for explicit disputed/deprecated/superseded/preferred fields |
| Admin preview | `wiki/admin/index.html` | Optional read-only statement-state info line; recipe conflict preview unchanged |
| Search | `js/search-signals.js` | Deprecated/superseded/disputed penalized; QA search unchanged |

QA data without state fields shows no new badges. Pending `add_recipe` conflict approve block unchanged.

## P1-C.3 — Evidence Rank Acceptance Sweep (local)

**Status:** P1-C.3 acceptance sweep completed; no SQL, no UI workflow, no data migration.

| Check | Result |
|-------|--------|
| EvidenceRank API + display gates | Green |
| QA regressions + search | Unchanged |
| Pending recipe conflict | Not touched; approve block unchanged |
| Dispute-resolution UI / auto-promote | Not built — deferred P1-D+ |

**P1-C foundation block (C.1 + C.2 + C.3) accepted locally.**

## P2-D.1 — Version History & Live-Service Validity Baseline (local)

**Scope:** Read-only version metadata tolerance — no Patch Mode workflow, no version editor, no SQL, no data migration.

| Layer | Behavior |
|-------|----------|
| Version helpers | `js/versioning-model.js` — validity/history gates; badges only when real version fields exist |
| Admin preview | Read-only version badges/history in conflict preview when data present |
| Reserved intent | `add_version_change` remains reserved |
| Reserved relations | `introduced_in`, `changed_in`, `removed_in` remain reserved |

No automatic outdated marking. No game-version posts. QA baseline entries unchanged.

**P2-D.2 acceptance sweep:** Version history and live-service validity accepted as read-only helper/search/admin-preview baseline only. No patch workflow, no SQL, no data migration. P2-D foundation block accepted locally.

## P2-G.1 — Creature Encounter, Spawn & Drop Context Baseline (local)

**Scope:** Registry/read/search/facet tolerance only — no loot-table UI, no encounter UI, no SQL, no data migration.

| Layer | Behavior |
|-------|----------|
| CreatureEncounterRegistry | `js/creature-encounter-registry.js` — behavior/encounter/spawn/drop/affinity helpers |
| Drop compatibility | `dropped_by` derived inverse unchanged; drop chance/rate are qualifier fields |
| Contribution intents | `report_drop`, `add_behavior`, `add_spawn` unchanged; `report_weakness_resistance` reserved |
| Search | Low-weight creature/spawn/drop/affinity hints; no hard filters |
| QA baseline | QA Ogre / QA Staff drop display unchanged; no new encounter/spawn/weakness sections |

No element taxonomy inference from item names (e.g. "QA Staff of Fire"). Loot-table editor deferred.

## P2-G.2 — Creature Encounter, Spawn & Drop Context Acceptance Sweep (local)

**Status:** P2-G.2 acceptance sweep completed; no SQL, no loot UI, no encounter posts, no data migration.

| Check | Result |
|-------|--------|
| CreatureEncounterRegistry API (QA Ogre/Staff) | Green — 99/99 normalize/extract/signals/guards |
| Search parser hints | creature spawn/drop/weakness/resistance — hint-only, no crash |
| Search regressions | QA Ogre/Staff/mining/wood/forge/coordinates unchanged |
| Drop relations | `dropped_by` derived inverse; `report_drop`/`add_behavior`/`add_spawn` unchanged |
| Reserved | `report_weakness_resistance` reserved |
| QA Staff / QA Ogre / Ember / Swamp | Unchanged; no behavior/spawn/weakness sections |
| Pending `add_recipe` conflict | Not touched |

**P2-G foundation block (G.1 + G.2) accepted locally.**

## P2-H.1 — Requirement, Unlock & Progression Context Baseline (local)

**Status:** P2-H.1 baseline; registry/read/search/facet tolerance only; no SQL, no requirement/unlock posts, no data migration.

| Check | Result |
|-------|--------|
| RequirementUnlockRegistry | `js/requirement-unlock-registry.js` — normalize/extract/signals; no name inference |
| ContentModel integration | optional `requirements`/`unlocks`/`access_state` fields; explicit-only enrichment |
| Facet groups | `required_level`, `faction_req`, `unlock_type`, `access_state`, `requirement_type` — explicit-only |
| Search parser/signals | low-weight requirement/unlock/progression/access hints; no hard filters |
| Wiki entry layout | `requirementUnlockContext` read-only; no new sections without explicit fields |
| Promotion guards | `shouldPromoteRequirementToPost` / `shouldPromoteUnlockToPost` false |
| Reserved relations | `crafted_by_profession`, `gathered_via` unchanged; no new productive requirement relation |
| QA regressions | Staff/Ember/Ogre/Swamp unchanged; Wood/Forge missing-entry only |
| Not built | Requirement/unlock create UI, skilltree, leveling, achievement tracker, SQL |

**Deployment freeze remains active** — no push/deploy.

## P2-H.2 — Requirement, Unlock & Progression Context Acceptance Sweep (local)

**Status:** P2-H.2 acceptance sweep completed; no SQL, no requirement/unlock posts, no data migration.

| Check | Result |
|-------|--------|
| RequirementUnlockRegistry API (QA Staff) | Green — 120/120 normalize/extract/signals/guards |
| Search parser hints | required level/profession/faction/prerequisite/unlock/vendor access — hint-only, 30/30 no crash |
| Search regressions | QA Ogre/Staff/mining/wood/forge/drop unchanged |
| Reserved | `crafted_by_profession`, `gathered_via`, `add_capability_role`, `add_version_change` unchanged |
| Promotion guards | `shouldPromoteRequirementToPost` / `shouldPromoteUnlockToPost` false |
| QA Staff / QA Ember / Ogre / Swamp | Unchanged; no requirement/unlock sections |
| Pending `add_recipe` conflict | Not touched |

**P2-H foundation block (H.1 + H.2) accepted locally.**

## P2-I.1 — P2 Foundation Integration & Blueprint Gap Gate (local)

**Status:** P2-I.1 integration gate completed; no SQL, no data migration, no deploy.

| Check | Result |
|-------|--------|
| P2 Registry matrix | 12/12 APIs on QA Staff; all promotion/render guards false |
| Relation/intent safety | Persisted/derived + reserved unchanged across P1/P2 |
| Search parser | 30/30 baseline + P2 queries — hint-only |
| QA regressions | Staff/Ember/Ogre/Swamp unchanged; Wood/Forge missing-entry only |
| Pending `add_recipe` conflict | Not touched |

**P2-A through P2-H accepted as registry/read/search/facet foundations only. Remaining work: UI activation, backend/search/index, moderation workflows, data migration, launch readiness.**

## P2-I.2 — P2 Final Acceptance & P3 Readiness Gate (local)

**Status:** P2-I.2 final acceptance completed; P2 Foundation locally closed; not deployed.

| Check | Result |
|-------|--------|
| P2 blocks P2-A … P2-I.1 | All accepted as baselines only |
| Final smoke | 22 URLs + 38 console + 28 parser — green |
| QA baseline | Staff/Ember/Ogre/Swamp unchanged; Wood/Forge missing-entry |
| Pending `add_recipe` conflict | Not touched |
| P3 readiness | Documented in current-code-gap-notes §44 |

**P2 Foundation ready for P3 UI activation. No push/deploy without separate Launch/Data-Safety Gate.**

## P3-G.1 — Context Field Moderation & Contribution (planned)

**Status:** Future work only; docs-only planning gate; no admin/create/edit activation.

| Area | P3-G decision |
|------|----------------|
| Context field contributions | Not implemented; separate moderation/contribution gate required |
| Admin create/edit for P2 structured fields | Not implemented; separate UI gate required |
| Conflict preview for context fields | Existing recipe conflict flow unchanged; pending `add_recipe` untouched |
| Auto-promotion from context text | Forbidden per entity-promotion-policy |

**P3-G.1:** Admin/create/edit/moderation for P2 context fields remains future work. P3-H.1 data contract is read-only normalization only.

**P3-H.2:** Data contract accepted locally. No moderation/contribution workflow activation. Pending `add_recipe` conflict remains untouched.

**P3-I.1:** Sample data gate is QA-only/local; no moderation workflow, no queue actions, no conflict changes.

**P3-I.2:** Sample data gate accepted locally. Pending `add_recipe` conflict remains untouched.

**P3-J.1:** P3 context fields remain without admin/create/edit/moderation until separate moderation/contribution gate. Real-data probe (P3-K.1) is read-only inspection only.

**P3-K.1:** Probe panel has no admin/create/edit/moderation controls; query-param gated on localhost only.

**P3-L.1:** P3 read-only context layer integration confirms P3 fields have no admin/create/edit/moderation flows until separate P4/P5 gate.

**P4-A.1 planning gate:** Structured context fields require field-level conflict policy before write flows. Existing `add_recipe` conflict remains baseline only. No new approval flows activated. Pending `add_recipe` untouched. Approve-blocked behavior unchanged.

**P4-B.1 validation baseline:** `BoundLoreStructuredContextSchema` validates structured fields read-only only. No moderation workflow, queue actions, conflict resolution, or write-path activation. Pending `add_recipe` untouched.

**P4-B.2 acceptance sweep:** Schema validation baseline accepted locally. No moderation workflow, queue actions, or write-path activation. Pending `add_recipe` untouched.

**P4-C.1 planning gate:** Admin Read-only Structured Field Inspector is read-only planning only. Field-level conflict preview remains future work (post-inspector, post-write-flow). Existing `add_recipe` recipe conflict remains baseline only. No new approval flows activated. Pending `add_recipe` untouched.

**P4-C.2 acceptance sweep:** Admin Inspector planning accepted locally. No moderation workflow, queue actions, or write-path activation. Pending `add_recipe` untouched.

**P4-C.3 inspector baseline:** `BoundLoreAdminStructuredContextInspector` is read-only diagnostics only. No queue mutation, no repair triggers, no write-path activation. Pending `add_recipe` untouched.

**P4-C.4 acceptance sweep:** Admin Inspector baseline accepted locally. No moderation workflow, queue actions, or write-path activation. Pending `add_recipe` untouched.

**P4-D.1 draft flow planning:** Structured contribution drafts are planning-only. Field-level structured conflicts are planned; existing `add_recipe` recipe conflict remains baseline only. No new approval flows activated. Pending `add_recipe` untouched.

---

---
