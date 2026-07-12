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
