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
