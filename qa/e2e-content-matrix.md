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

## P0.5-C — Derived Unresolved Targets + Missing Entry Queue

**Milestone:** P0.5-C (derived/in-memory records; no DB persistence, no stub creation, no promotion actions)

| Test | URL / target | Expected | Result |
|------|--------------|----------|--------|
| Staff recipe + entry needed | `qa-staff-of-fire-2b742628` | Recipe intact; Wood/Forge Entry needed; no new posts | `[x]` |
| Ember detail regression | `qa-ember-shard-511160` | Resource + facet badges + Used In | `[x]` |
| Resources landing regression | `/wiki/resources/` | QA Ember Shard card intact | `[x]` |
| Admin Missing Entry Queue | `/wiki/admin/` | Wood + Forge listed; Ember not listed | `[~]` Access Denied in automation |
| Browse / Items / Homepage | regression URLs | No regressions | `[x]` |

**Not built in P0.5-C:** Persistent unresolved_targets table, Promote to Stub, Merge into Existing, Dismiss, backlink reconciliation, search baseline.

---

## P0.5-D — Station Type Baseline + Safe Promotion Path

**Milestone:** P0.5-D (station_type code baseline + safe create prefill; no auto-promotion, no stubs, no DB persistence)

| Test | URL / target | Expected | Result |
|------|--------------|----------|--------|
| Staff recipe hints | `qa-staff-of-fire-2b742628` | Wood Entry needed + Resource hint/link; Forge Entry needed + Station Type hint/link; Ember linked | `[x]` |
| Create prefill Wood | `/wiki/create-post/?type=resource&name=Wood&source=missing-entry` | Loads; name prefilled; no auto-submit | `[x]` |
| Create prefill Forge | `/wiki/create-post/?type=station_type&name=Forge&source=missing-entry` | Loads; name prefilled; Station Type flow; no auto-submit | `[x]` |
| Ember detail regression | `qa-ember-shard-511160` | Resource + facet badges + Used In | `[x]` |
| Resources landing regression | `/wiki/resources/` | QA Ember Shard card intact | `[x]` |
| Admin Missing Entry Queue | `/wiki/admin/` | Wood (Resource) + Forge (Station Type) with Start Entry links; Promote/Merge/Dismiss disabled | `[~]` Access Denied in automation |
| Browse / Items / Homepage | regression URLs | No regressions | `[x]` |

**Not built in P0.5-D:** Real station_type promotion, Forge/Wood posts, persistent queue, search baseline, backlink reconciliation, auto-stubs.

---

## P0.5-E — Structured Search Signal Baseline

**Milestone:** P0.5-E (client-side structured signals; no DB index, no FTS, no embeddings)

| Test | URL / target | Expected | Result |
|------|--------------|----------|--------|
| Title search | `/wiki/search/?q=QA%20Ember%20Shard` | QA Ember Shard appears | `[x]` |
| Resource type search | `/wiki/search/?q=resource` | QA Ember Shard appears | `[x]` |
| Mining search | `/wiki/search/?q=mining` | QA Ember Shard appears | `[x]` |
| Source detail search | `/wiki/search/?q=red%20crystal%20nodes` | QA Ember Shard appears | `[x]` |
| Wood search | `/wiki/search/?q=wood` | Staff and/or Missing Entry Wood; no Wood post | `[x]` |
| Forge search | `/wiki/search/?q=forge` | Staff and/or Missing Entry Forge; no Forge post | `[x]` |
| Station type search | `/wiki/search/?q=station%20type` | Forge missing suggestion sensible | `[x]` |
| Staff regression | `qa-staff-of-fire-2b742628` | Recipe + Entry needed links intact | `[x]` |
| Ember / Resources / Browse / Items / Homepage | regression URLs | No regressions | `[x]` |
| Admin optional | `/wiki/admin/` | Queue read-only; conflict pending | `[~]` Access Denied in automation |

**Not built in P0.5-E:** Persistent search_documents, Postgres FTS/pg_trgm, compound query parser, semantic search, facet browse filters, Dragon-Mount demo data.

---

## P0.5-F — Versioning Metadata Baseline

**Milestone:** P0.5-F (version metadata helpers + tolerant readers; no DB, no history UI, no backfill)

| Test | URL / target | Expected | Result |
|------|--------------|----------|--------|
| QA Staff no version badge | `qa-staff-of-fire-2b742628` | Recipe ok; Wood/Forge Entry needed; no version badge | `[x]` |
| QA Ember no version badge | `qa-ember-shard-511160` | Resource + facets + Used In; no version badge | `[x]` |
| Search title / mining / wood / forge | `/wiki/search/?q=...` | P0.5-E results unchanged | `[x]` |
| Create prefill Wood / Forge | create-post prefill URLs | Prefill loads; not submitted | `[x]` |
| Resources / Browse / Items / Homepage | regression URLs | No regressions | `[x]` |
| Admin optional | `/wiki/admin/` | Queue read-only; conflict pending | `[~]` Access Denied in automation |

**Not built in P0.5-F:** Version History widget, patch management UI, DB migration, backfill, fake game versions.

---

## P0.5-G — Acceptance Sweep & Pre-Push Readiness

**Milestone:** P0.5-G (full regression of P0.5-A–F; docs alignment; no push/deploy/SQL)

| Test | URL / target | Expected | Result |
|------|--------------|----------|--------|
| Git baseline | `main` @ `014e1cd` | Snapshot untracked; no unexpected changes | `[x]` |
| Homepage | `/` | Renders; hero; recent posts | `[x]` |
| Browse | `/wiki/browse/` | Renders category hubs | `[x]` |
| Resources landing | `/wiki/resources/` | QA Ember Shard card + facets | `[x]` |
| Items landing | `/wiki/items/` | Renders; no Wood/Forge posts | `[x]` |
| QA Staff | `qa-staff-of-fire-2b742628` | Recipe; Ember linked; Wood/Forge Entry needed + prefill links; no version badges | `[x]` |
| QA Ember Shard | `qa-ember-shard-511160` | Resource; Mining/Unknown/Raw facets; Used In; no aggressive inferencing | `[x]` |
| QA Ogre Mage | `qa-ogre-mage-1103f2` | Creature detail renders | `[x]` |
| Swamp | `swamplands-94dadc07` | Biome detail renders | `[x]` |
| Wood prefill | create-post resource prefill URL | Loads; Wood prefilled; no auto-submit | `[x]` |
| Forge prefill | create-post station_type prefill URL | Station Type flow; Forge prefilled; no auto-submit | `[x]` |
| Search title | `?q=qa ember shard` | QA Ember Shard + Staff recipe match | `[x]` |
| Search resource / mining / source detail | `resource`, `mining`, `red crystal nodes` | QA Ember Shard | `[x]` |
| Search wood / forge | `wood`, `forge` | Staff + Missing Entry suggestions; no Wood/Forge posts | `[x]` |
| Global APIs | loaded wiki page console | FacetRegistry, UnresolvedTargets, SearchSignals, Versioning = object; StationTypeQuickAdd on create-post | `[x]` |
| Versioning smoke | `BoundLoreVersioning` helpers | All tolerant checks pass (via `extractVersionMetadata` / `isCurrentStatement`) | `[x]` |
| Admin optional | `/wiki/admin/` | Read-only queue/conflict if authed | `[~]` Login redirect / Access Denied — not visually verified |
| Pending add_recipe conflict | admin queue | Unchanged; not approved/deleted | `[x]` not touched |

**Sweep outcome:** P0.5-A through P0.5-F **green** as connected foundation. Persistent backend (search_documents, unresolved_targets DB, version backfill) remains later scope. **P1 does not start automatically.**

---

## P1-A.1 — Relation Registry 2.0 / Qualifier Baseline

**Milestone:** P1-A.1 (registry + qualifier vocabulary; no SQL, no UI, no migration)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API | loaded wiki page console | `BoundLoreRelationsRegistry` object; crafted_from persisted; ingredient_of derived | `[x]` |
| Reserved types | console | sold_by, gathered_via, crafted_by_profession exist as reserved | `[x]` |
| Unknown type | console | unbekannter Typ crasht nicht | `[x]` |
| QA Staff regression | `qa-staff-of-fire-2b742628` | Recipe + Wood/Forge Entry needed unchanged | `[x]` |
| QA Ember regression | `qa-ember-shard-511160` | Resource + facets unchanged | `[x]` |
| Search mining/wood/forge | `/wiki/search/?q=...` | P0.5-E results unchanged | `[x]` |
| Admin optional | `/wiki/admin/` | Dashboard + queue + pending conflict | `[x]` read-only (session-dependent gate) |

**Not built in P1-A.1:** sold_by/gathered_via/crafted_by_profession UI flows, SQL, relation migration, symmetric dedupe.

---

## P1-A.2 — Relation Qualifier Preservation & Reader Tolerance

**Milestone:** P1-A.2 (reader tolerance; no SQL, no UI, no migration)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry helpers | console | extractRelationQualifiers merges legacy + nested | `[x]` |
| crafted_from persisted | console | isPersistedRelation true | `[x]` |
| ingredient_of derived | console | isDerivedRelation true | `[x]` |
| QA Staff recipe display | `qa-staff-of-fire-2b742628` | Ember ×3 piece, Wood ×1, Station Forge | `[x]` |
| QA Ember regression | `qa-ember-shard-511160` | Resource + facets unchanged | `[x]` |
| Search mining/wood/forge | `/wiki/search/?q=...` | P0.5-E results unchanged | `[x]` |
| Pending conflict preview | admin (read-only) | QA Ember ×4 vs ×3 conflict unchanged | `[x]` not executed (no merge/approve) |
| Admin optional | `/wiki/admin/` | Dashboard + queue; Patch Mode OFF | `[x]` session-dependent |

**Not built in P1-A.2:** qualifier UI, version badges, SQL, data migration.

---

## P1-A.3 — Relation Registry 2.0 Acceptance Sweep

**Milestone:** P1-A foundation block complete (A.1 + A.2 + A.3); no SQL, no UI, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API sweep | console on wiki page | All P1-A.1/A.2 API checks green | `[x]` |
| QA Staff regression | `qa-staff-of-fire-2b742628` | Recipe + Wood/Forge Entry needed | `[x]` |
| QA Ember regression | `qa-ember-shard-511160` | Resource + facets | `[x]` |
| Search qa ember shard | `/wiki/search/?q=qa%20ember%20shard` | QA Ember + QA Staff recipe match | `[x]` |
| Search resource | `/wiki/search/?q=resource` | QA Ember type resource + Wood missing | `[x]` |
| Search mining | `/wiki/search/?q=mining` | QA Ember facet mining | `[x]` |
| Search red crystal nodes | `/wiki/search/?q=red%20crystal%20nodes` | QA Ember resource match | `[x]` |
| Search wood/forge | `/wiki/search/?q=wood` / `forge` | Missing suggestions + QA Staff | `[x]` |
| Reserved relations | code + console | sold_by/gathered_via/crafted_by_profession reserved only | `[x]` |
| Admin read-only | `/wiki/admin/` | Queue + pending conflict when session present | `[~]` login redirect in automation browser |
| Pending conflict | admin | Unchanged; approve blocked | `[x]` not executed |

**P1-A accepted as local foundation.** P1-B foundation block (B.1–B.3) accepted locally. P1-C.1 baseline in progress.

---

## P1-B.1 — Contribution Intent Registry Baseline

**Milestone:** P1-B.1 (intent registry; no SQL, no UI, no migration)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API | console | `BoundLoreContributionIntentRegistry` loaded | `[x]` |
| add_recipe active | console | isActiveIntent true; merge_behavior recipe_block_merge | `[x]` |
| Reserved intents | console | add_capability_role, correct_classification, resolve_unresolved_target reserved | `[x]` |
| QA Staff regression | `qa-staff-of-fire-2b742628` | Recipe unchanged | `[x]` |
| Search wood/forge/mining | `/wiki/search/?q=...` | unchanged | `[x]` |
| No new buttons | QA Staff page | no reserved intent buttons | `[x]` |
| Pending conflict | admin read-only | unchanged; approve blocked | `[x]` not executed |
| Admin optional | `/wiki/admin/` | session-dependent (login redirect in automation) | `[~]` |

**Not built:** Add Capability/Correct Classification/Add Alias UI, SQL, contribution migration.

---

## P1-B.2 — Contribution Payload & Admin Preview Tolerance

**Milestone:** P1-B.2 (payload + admin preview tolerance; no SQL, no UI, no migration)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Payload helpers | console | normalizeContributionRecord active/reserved/unknown safe | `[x]` |
| add_recipe active | console | isActiveIntent; preview_safety.approveAllowed | `[x]` |
| QA Staff regression | `qa-staff-of-fire-2b742628` | Recipe Ember ×3, Wood ×1, Forge | `[x]` |
| Search wood/forge/mining | `/wiki/search/?q=...` | unchanged | `[x]` |
| No new buttons | QA Staff | no reserved intent buttons | `[x]` |
| Pending conflict | admin read-only | Preview + approve blocked; not clicked | `[x]` not executed |
| Admin optional | `/wiki/admin/` | session-dependent (login redirect) | `[~]` |

**Not built:** reserved intent UI flows, pending conflict merge/approve, SQL.

---

## P1-B.3 — Contribution Intent Registry Acceptance Sweep

**Milestone:** P1-B foundation block complete (B.1 + B.2 + B.3); no SQL, no UI, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API sweep | console on wiki page | All P1-B.1/B.2 checks green | `[x]` |
| Active intents | console | 11 active; add_recipe merge_behavior recipe_block_merge | `[x]` |
| Reserved intents | console | 12 reserved; approveAllowed false | `[x]` |
| Unknown intent | console | safe fallback, no crash | `[x]` |
| QA Staff regression | `qa-staff-of-fire-2b742628` | Recipe + no reserved buttons | `[x]` |
| Search wood/forge/mining/qa ember/resource/red crystal | `/wiki/search/?q=...` | unchanged | `[x]` |
| Pending conflict | admin read-only | unchanged; not executed | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` login redirect |

**P1-D.1 accepted as local baseline.** Search index/query parser deferred.

---

## P1-D.2 — Facet Browse Filter Acceptance Sweep

**Milestone:** P1-D foundation block complete (D.1 + D.2); client-side facet filters only; no SQL, no search index, no query parser.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| FacetBrowse API sweep | console on resources | parse/normalize/match green; synthetic sample green | `[x]` |
| Resources unfiltered | `/wiki/resources/` | unchanged + quicklinks only | `[x]` |
| Resources mining/raw/unknown | filtered URLs | QA Ember Shard visible | `[x]` |
| Resources fishing | `?acquisition_method=fishing` | empty/filter message, no crash | `[x]` |
| Browse filtered | `?facet=acquisition_method:mining` | active filter + resources link | `[x]` |
| Search regressions | mining/wood/forge/qa ember/resource/red crystal | unchanged | `[x]` |
| QA Staff / QA Ember detail | post slugs | unchanged | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation Access Denied |

**P1-D accepted as local foundation.** P1-E.1 query parser baseline documented.

---

## P1-E.1 — Structured Search Query Parser Baseline

**Milestone:** P1-E.1 (client-side query parser hints; no SQL, no search index, no embeddings)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Parser API | console on `/wiki/search/` | `BoundLoreSearchQueryParser` green | `[x]` |
| mining resource | parse + search | resource + mining hints | `[x]` |
| items using Ember Shard | search | QA Staff and/or QA Ember | `[x]` |
| crafted at forge | search | QA Staff and/or Forge missing entry | `[x]` |
| mineable resource | search | QA Ember Shard | `[x]` |
| Baseline queries | mining/wood/forge/qa ember/resource/red crystal | unchanged or better | `[x]` |
| QA Staff / QA Ember detail | post slugs | unchanged | `[x]` |
| Admin read-only | `/wiki/admin/` | not touched | `[x]` |

**P1-E.1 accepted as local baseline.** Full semantic search deferred.

---

## P1-E.2 — Structured Search Query Parser Acceptance Sweep

**Milestone:** P1-E foundation block (E.1 + E.2); client-side query parser hints only; no SQL, no search index, no embeddings.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Parser API sweep | console on `/wiki/search/` | normalize/tokenize/parse/summary/apply green | `[x]` |
| items using Ember Shard | search | QA Staff and/or QA Ember; intent line | `[x]` |
| crafted at forge | search | QA Staff + Forge missing entry | `[x]` |
| mineable resource / resource mining | search | QA Ember Shard | `[x]` |
| unknown rarity resource | search | QA Ember or sensible interpretation | `[x]` |
| Baseline queries | mining/wood/forge/qa ember/resource/red crystal | unchanged or better | `[x]` |
| Intent hint line | search page | user-friendly; no debug dump | `[x]` |
| Resources facet filter | `?acquisition_method=mining` | QA Ember visible | `[x]` |
| QA Staff / QA Ember detail | post slugs | unchanged | `[x]` |
| Wood/Forge | search | missing-entry suggestions; no posts | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation Access Denied |

**P1-E.2 acceptance sweep completed; client-side query parser hints only; no SQL/backend search/search index.** P1-E accepted as local foundation. Ready for P1-F.

---

## P1-F.1 — Profession & Capability Model Baseline

**Milestone:** P1-F.1 (registry-only; no SQL, no UI, no profession pages, no data migration)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API | console on `/wiki/search/` or `/wiki/post/` | `BoundLoreProfessionCapabilityRegistry` green | `[x]` |
| Normalizers | console | crafting/rideable/mount/required_level | `[x]` |
| Reserved relations | console | `isReservedRelation` for P1-F quartet | `[x]` |
| Search regressions | mining/wood/forge/qa ember/resource/red crystal/parser queries | unchanged | `[x]` |
| rideable/flyable mount | search | no crash; 0 results OK | `[x]` |
| QA Staff / QA Ember | post slugs | unchanged; no new UI sections | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Resources facet | `?acquisition_method=mining` | QA Ember visible | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**Not built:** profession UI, skilltree, SQL, profession/station posts, reserved relation activation.

---

## P1-G.1 — Symmetric Relation Dedupe & Derived Mirror Baseline

**Milestone:** P1-G.1 (registry + defensive dedupe; no SQL, no data migration, no repair)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry mirror API | console on QA Staff post | directionality/mirror/dedupe helpers green | `[x]` |
| crafted_from directed | console | staff→ember ≠ ember→staff dedupe keys | `[x]` |
| ingredient_of derived | console | derived_inverse mirror behavior | `[x]` |
| hostile_to symmetric | console | a↔b dedupe to one record | `[x]` |
| Reserved relations | console | not persistable | `[x]` |
| Search regressions | mining/wood/forge/qa ember/parser queries | unchanged | `[x]` |
| QA Staff / QA Ember | post slugs | recipe/Used In unchanged | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**Not built:** SQL dedupe, repair script, symmetric UI, data migration.

---

## P1-G.2 — Symmetric Relation Dedupe Acceptance Sweep

**Milestone:** P1-G foundation block (G.1 + G.2); reader/search dedupe only; no SQL, no repair, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Mirror/dedupe API sweep | console on QA Staff post | all P1-G.1 checks green | `[x]` |
| Directed keys | console | crafted_from staff→ember ≠ ember→staff | `[x]` |
| Symmetric dedupe | console | hostile_to a↔b → 1 record | `[x]` |
| Derived inverse | console | ingredient_of derived_inverse | `[x]` |
| Reserved relations | console | not persistable | `[x]` |
| Search regressions | mining/wood/forge/qa ember/parser queries | unchanged | `[x]` |
| QA Staff / QA Ember | post slugs | recipe/Used In/badges unchanged | `[x]` |
| No mirror UI | pages | no hostile/allied/symmetric buttons | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation Access Denied |

**P1-G.2 acceptance sweep completed; reader/search dedupe only; no SQL, no repair, no data migration.** P1-G accepted as local foundation.

---

## P1-H.1 — P1 Foundation Final Acceptance & P2 Readiness Gate

**Milestone:** Final P1 integration gate; client-side foundation only; no SQL, no deploy, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| RelationsRegistry API | QA Staff post | persistence, reserved, symmetric dedupe | `[x]` |
| ContributionIntentRegistry API | QA Staff post | active/reserved, preview safety | `[x]` |
| EvidenceRank API | QA Staff post | weights, dispute badge gates | `[x]` |
| ProfessionCapabilityRegistry API | QA Staff post | SYSTEM/profession_type, normalize kinds | `[x]` |
| FacetBrowse API | `/wiki/resources/` | URL facet parse + active filters | `[x]` |
| SearchQueryParser API | `/wiki/search/` | usage/crafting/mining hints; empty OK | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged | `[x]` |
| Resources mining/raw/unknown | facet URLs | QA Ember visible | `[x]` |
| Resources fishing | facet URL | empty state | `[x]` |
| Search regressions | mining/wood/forge/parser/mount queries | unchanged or better | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Reserved UI flows | pages | not visible | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation Access Denied |

**P1-H.1 final foundation gate completed locally. P1 registries and reader/search tolerances are accepted as client-side foundation. No SQL, no backend search, no data migration, no deploy. P2 may start from this baseline.**

---

## P2-A.1 — NPC / Quest / Event Model Activation Baseline

**Milestone:** P2 content model registry; client-side foundation only; no SQL, no UI, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ContentModelRegistry API | post or search page | typeof object; active models | `[x]` |
| NPC model | `BEING/npc` | active; create_ui false | `[x]` |
| Quest model | `KNOWLEDGE/quest` | active; admin_flow false | `[x]` |
| Event model | `EVENT/event` | active; create_ui false | `[x]` |
| Search parser hints | `?q=npc`, `?q=quest`, `?q=event` | no crash; hints only | `[x]` |
| Search regressions | mining/wood/forge/parser queries | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no new sections | `[x]` |
| Resources mining | facet URL | QA Ember visible | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Reserved UI flows | pages | no NPC/Quest/Event buttons | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[ ]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P2-A.1:** Model registry baseline only. No create UI, no SQL, no deploy.

---

## P2-A.2 — NPC / Quest / Event Model Acceptance Sweep

**Milestone:** P2-A foundation block (A.1 + A.2); registry/read/search baseline only; no SQL, no UI, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ContentModelRegistry API sweep | QA Staff post | all active/reserved checks green | `[x]` |
| create_ui / admin_flow | console | false for NPC/Quest/Event | `[x]` |
| Reserved models | quest_chain, community_event, occurrence | reserved; no UI | `[x]` |
| Search parser hints | npc/quest/event + compound queries | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/parser queries | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no new sections | `[x]` |
| Resources mining | facet URL | QA Ember visible | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Reserved UI flows | pages | no NPC/Quest/Event buttons | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-A.2 acceptance sweep completed; NPC/Quest/Event models accepted as registry/read/search baseline only. No create UI, no admin flow, no SQL, no data migration.** P2-A accepted as local foundation.

---

## P2-B.1 — Quest Objective, Reward & Event Occurrence Baseline

**Milestone:** P2-B quest/event substructure registry; client-side only; no SQL, no UI, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| QuestEventRegistry API | post or search page | normalize/extract/signals green | `[x]` |
| Objective/reward types | console | collect/kill/item/reputation etc. | `[x]` |
| Event/occurrence types | console | world/scheduled etc. | `[x]` |
| NPC service types | console | vendor/quest_giver/trainer | `[x]` |
| create_ui/admin_flow | ContentModelRegistry | false | `[x]` |
| Search parser hints | quest reward/objective, npc vendor, event schedule | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/parser/npc/quest/event | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no new sections | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[ ]` |

**P2-B.1:** Substructure registry only. No posts, no create UI, no SQL, no deploy.

---

## P2-B.2 — Quest / Event / NPC Service Acceptance Sweep

**Milestone:** P2-B foundation block (B.1 + B.2); registry/read/search baseline only; no SQL, no UI, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| QuestEventRegistry API sweep | QA Staff post | all normalize/extract/signals green | `[x]` |
| ContentModelRegistry integration | console | active models; create_ui/admin false | `[x]` |
| Reserved relations | reward_of, occurs_during, sold_by | reserved; persistence reserved | `[x]` |
| Search parser hints | quest reward/objective/giver, npc vendor/trainer, event schedule, world/seasonal | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/parser/npc/quest/event | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no new sections | `[x]` |
| Resources mining | facet URL | QA Ember visible | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Reserved UI flows | pages | no Quest/Event/NPC-Service buttons | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-B.2 acceptance sweep completed; Quest objectives, rewards, event occurrences, and NPC services accepted as registry/read/search baseline only. No create UI, no admin flow, no SQL, no data migration.** P2-B accepted as local foundation.

---

## P2-C.1 — Vendor / Economy / Trade Offer Baseline

**Milestone:** P2-C economy registry; client-side only; no SQL, no shop UI, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| EconomyRegistry API | post or search page | normalize/extract/signals green | `[x]` |
| Offer/currency/availability types | console | sell/gold/seasonal/limited etc. | `[x]` |
| sold_by reserved | RelationsRegistry | reserved; not persisted_forward | `[x]` |
| Search parser hints | merchant/sold by/price/gold/event currency | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/npc vendor/quest reward | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no vendor/price sections | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[ ]` |

**P2-C.1:** Economy registry only. No shop UI, no posts, no SQL, no deploy.

---

## P2-C.2 — Vendor / Economy / Trade Offer Acceptance Sweep

**Milestone:** P2-C foundation block (C.1 + C.2); registry/read/search baseline only; no SQL, no shop UI, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| EconomyRegistry API sweep | QA Staff post | all normalize/extract/signals green | `[x]` |
| ContentModel/QuestEvent integration | console | economy_context; create_ui/admin false | `[x]` |
| Reserved relations | sold_by, reward_of, occurs_during | reserved; persistence reserved | `[x]` |
| Search parser hints | vendor/merchant/sold by/price/gold/event currency/seasonal vendor | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/parser/npc vendor/quest reward | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no vendor/price sections | `[x]` |
| Resources mining | facet URL | QA Ember visible | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Reserved UI flows | pages | no Vendor/Offer/Currency/Price buttons | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-C.2 acceptance sweep completed; Vendor/economy/trade offers accepted as registry/read/search baseline only. No shop UI, no admin flow, no SQL, no data migration.** P2-C accepted as local foundation.

---

## P2-D.1 — Version History & Live-Service Validity Baseline

**Milestone:** P2-D version history/validity registry; client-side only; no SQL, no Patch Mode workflow, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Versioning API | QA Staff post | normalize/read/validity/history gates green | `[x]` |
| Empty version fields | console `{}` | no badges; shouldDisplay* false | `[x]` |
| Version parser hints | version/patch/outdated/changed/removed/introduced | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/vendor/economy/parser | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no version badges/sections | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Reserved intent/relations | add_version_change; introduced/changed/removed_in | reserved | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |

**P2-D.1:** Version history/validity registry only. No Patch Mode, no version editor, no posts, no SQL, no deploy.

---

## P2-D.2 — Version History & Live-Service Validity Acceptance Sweep

**Milestone:** P2-D foundation block (D.1 + D.2); read-only helper/search/admin-preview baseline only; no SQL, no Patch Mode workflow, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Versioning API sweep | QA Staff post | all normalize/read/validity/history gates green | `[x]` |
| Empty version fields | console `{}` | no badges; shouldDisplay* false | `[x]` |
| Reserved intent/relations | add_version_change; introduced/changed/removed_in | reserved; persistence reserved | `[x]` |
| Search parser hints | version/patch/outdated/changed/removed/introduced/superseded/historical | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/vendor/economy/parser | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no version badges/sections | `[x]` |
| Resources mining | facet URL | QA Ember visible | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Reserved UI flows | pages | no Version/Patch/Outdated buttons | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-D.2 acceptance sweep completed; Version history and live-service validity accepted as read-only helper/search/admin-preview baseline only. No patch workflow, no SQL, no data migration.** P2-D accepted as local foundation.

---

## P2-E.1 — Resource Node Type & Acquisition Source Baseline

**Milestone:** P2-E resource node/acquisition registry; client-side only; no SQL, no node posts, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ResourceNodeRegistry API | QA Ember or search | normalize/extract/signals green | `[x]` |
| red crystal nodes | source_detail only | no crystal taxonomy inference | `[x]` |
| hasExplicitNodeType | source_detail vs node_type | false / true respectively | `[x]` |
| Search parser hints | resource node/mining node/red crystal nodes/ore vein | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/red crystal/qa ember/vendor/version | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no node-type badges | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |

**P2-E.1:** Resource node registry only. No node posts, no location pages, no SQL, no deploy.

---

## P2-E.2 — Resource Node Type & Acquisition Source Acceptance Sweep

**Milestone:** P2-E foundation block (E.1 + E.2); registry/read/search/facet baseline only; no SQL, no node posts, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ResourceNodeRegistry API sweep | QA Ember post | all normalize/extract/signals green | `[x]` |
| red crystal nodes inference | source_detail only | no node_type/crystal taxonomy forced | `[x]` |
| ContentModel/Facet integration | OBJECT:resource; node_type facet | explicit-only; create_ui/admin false | `[x]` |
| Search parser hints | resource node/mineral/crystal/red crystal/fishing spot | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/red crystal/vendor/version | unchanged | `[x]` |
| Resources facets | mining/raw/unknown; node_type=crystal_node | QA Ember on facets; no false crystal match | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no node-type badges/sections | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Reserved UI/relations | pages | no node/relation buttons; gathered_via unchanged | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-E.2 acceptance sweep completed; Resource node types and acquisition sources accepted as registry/read/search/facet baseline only. No node posts, no PLACE promotion, no SQL, no data migration.** P2-E accepted as local foundation.

---

## P2-F.1 — Observation Location & Condition Context Baseline

**Milestone:** P2-F observation location/condition registry; client-side only; no SQL, no posts, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ObservationContextRegistry API | console smoke | normalize/extract/signals; no crash | `[x]` |
| Coordinates not PLACE | registry helpers | `shouldPromoteCoordinatesToPlace` false | `[x]` |
| Free-text location | location_ref | no post promotion | `[x]` |
| ContentModel/Facet integration | explicit fields only | biome/time/weather facets explicit-only | `[x]` |
| Search parser hints | coordinates/location/weather/nighttime/spawn location | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/red crystal/resource node/vendor/version | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no observation badges/sections | `[x]` |
| Wood/Forge | search/admin | missing-entry only; no posts | `[x]` |
| Relations safety | found_in / add_observation_location | unchanged / reserved | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[ ]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-F.1:** Observation location/condition baseline only. Coordinates are not PLACE pages. No SQL, no deploy.

---

## P2-F.2 — Observation Location & Condition Context Acceptance Sweep

**Milestone:** P2-F foundation block (F.1 + F.2); registry/read/search/facet baseline only; no SQL, no observation posts, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ObservationContextRegistry API sweep | QA Ember/Staff console | all normalize/extract/signals green; empty/unknown safe | `[x]` |
| ResourceNodeRegistry integration | red crystal nodes | source_detail only; no node_type promotion | `[x]` |
| ContentModel/Facet integration | OBJECT:resource; npc/quest/event; condition facets | explicit-only; create_ui false | `[x]` |
| Search parser hints | coordinates/location/weather/nighttime/spawn location | hint-only; no crash | `[x]` |
| Search regressions | mining/wood/forge/red crystal/resource node/vendor/version | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no observation badges/sections | `[x]` |
| Wood/Forge | search/admin | missing-entry only; no posts | `[x]` |
| Relations safety | found_in / add_observation_location / confirm_location | unchanged / reserved / active | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-F.2 acceptance sweep completed; Observation locations, coordinates, biome/time/weather conditions accepted as registry/read/search/facet baseline only. No PLACE promotion, no observation posts, no SQL, no data migration.** P2-F accepted as local foundation.

---

## P2-G.1 — Creature Encounter, Spawn & Drop Context Baseline

**Milestone:** P2-G creature encounter/spawn/drop registry; client-side only; no SQL, no encounter posts, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| CreatureEncounterRegistry API | console smoke | normalize/extract/signals; no crash | `[x]` |
| No encounter/spawn/drop posts | registry helpers | shouldPromote* false | `[x]` |
| dropped_by compatibility | relations registry | derived_inverse unchanged | `[x]` |
| ContentModel/Facet integration | BEING:creature; behavior/spawn/drop facets | explicit-only; create_ui false | `[x]` |
| Search parser hints | creature spawn/drop/weakness/resistance | hint-only; no crash | `[x]` |
| Search regressions | qa ogre/qa staff/mining/wood/forge/coordinates | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no behavior/spawn/weakness sections | `[x]` |
| Wood/Forge | search/admin | missing-entry only; no posts | `[x]` |
| Relations/intents | report_drop/add_behavior/add_spawn/report_weakness_resistance | unchanged / reserved | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[ ]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-G.1:** Creature encounter/spawn/drop baseline only. No encounter posts, no loot UI, no SQL, no deploy.

---

## P1-F.2 — Profession & Capability Model Acceptance Sweep

**Milestone:** P1-F foundation block (F.1 + F.2); registry-only; no SQL, no UI, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API sweep | console on `/wiki/search/` | normalize/extract/has*/labels green | `[x]` |
| Entity model | console | SYSTEM/profession_type; no new domain | `[x]` |
| Reserved relations | console | P1-F quartet reserved; persistence reserved | `[x]` |
| Search regressions | mining/wood/forge/qa ember/resource/red crystal/parser queries | unchanged | `[x]` |
| rideable/flyable mount | search | no crash; 0 results OK | `[x]` |
| No profession UI | pages | no new buttons/sections | `[x]` |
| QA Staff / QA Ember | post slugs | unchanged | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Resources facet | `?acquisition_method=mining` | QA Ember visible | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation Access Denied |

**P1-F.2 acceptance sweep completed; model registry only; no profession UI, no SQL, no data migration.** P1-F accepted as local foundation. Ready for P1-G.

---

## P1-C.1 — Evidence Rank & Dispute Baseline

**Milestone:** P1-C.1 (evidence rank registry + reader tolerance; no SQL, no UI, no migration)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API | console on wiki page | `BoundLoreEvidenceRank` object; normalizers green | `[x]` |
| Empty tier | console | `normalizeEvidenceTier("")` null-safe, no crash | `[x]` |
| Weight compare | console | confirmed > reported | `[x]` |
| QA Staff regression | `qa-staff-of-fire-2b742628` | Evidence badges unchanged; no rank/dispute badges | `[x]` |
| QA Ember regression | `qa-ember-shard-511160` | Resource hero unchanged | `[x]` |
| Search wood/forge/mining/qa ember/resource | `/wiki/search/?q=...` | rankings unchanged | `[x]` |
| Pending conflict | admin read-only | preview unchanged; approve blocked; not executed | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**Not built:** dispute-resolution UI, auto-ranking, auto-promote, SQL, new visible badges on QA data.

---

## P1-C.2 — Evidence State Rendering & Admin Preview Tolerance

**Milestone:** P1-C.2 (display helpers + preview tolerance; no SQL, no UI workflow, no migration)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Display API | console on wiki page | `getStatementStateBadges`, `shouldDisplayDisputeBadge` green | `[x]` |
| Empty state | console | `{}` → no dispute/deprecated/superseded badges | `[x]` |
| Future fields | console | disputed/deprecated/superseded gates true only with real fields | `[x]` |
| QA Staff regression | `qa-staff-of-fire-2b742628` | Evidence badges unchanged; no state badges | `[x]` |
| QA Ember regression | `qa-ember-shard-511160` | Resource hero unchanged | `[x]` |
| Search wood/forge/mining/qa ember/resource/red crystal | `/wiki/search/?q=...` | unchanged | `[x]` |
| Pending conflict | admin read-only | preview unchanged; approve blocked; not executed | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P1-C foundation block (C.1 + C.2) accepted locally.** Dispute-resolution UI deferred.

---

## P1-C.3 — Evidence Rank Acceptance Sweep

**Milestone:** P1-C foundation block complete (C.1 + C.2 + C.3); no SQL, no UI workflow, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| EvidenceRank API sweep | console on wiki page | All P1-C.1/C.2 checks green | `[x]` |
| Display gates | console | empty `{}` → no state badges; real fields → gates true | `[x]` |
| Weight compare | console | confirmed > reported | `[x]` |
| QA Staff regression | `qa-staff-of-fire-2b742628` | Reported / Single Observation; no `.bl-state-badges` | `[x]` |
| QA Ember regression | `qa-ember-shard-511160` | unchanged | `[x]` |
| Search qa ember/resource/mining/red crystal/wood/forge | `/wiki/search/?q=...` | unchanged | `[x]` |
| Pending conflict | admin read-only | not touched; not executed | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` login redirect |

**P1-C accepted as local foundation.** Ready for P1-D. Dispute-resolution UI deferred.

---

## P1-D.1 — Facet Browse Filter Baseline

**Milestone:** P1-D.1 (client-side facet URL filters; no SQL, no search index, no query parser)

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| FacetBrowse API | console on resources/browse | `BoundLoreFacetBrowse` object; parse/normalize green | `[x]` |
| Resources unfiltered | `/wiki/resources/` | unchanged layout/list | `[x]` |
| Resources mining | `/wiki/resources/?acquisition_method=mining` | QA Ember Shard visible | `[x]` |
| Resources raw/unknown | `?processing_stage=raw`, `?rarity=unknown` | QA Ember visible or no regression | `[x]` |
| Resources no match | `?acquisition_method=fishing` | empty/filter message, no crash | `[x]` |
| Browse unfiltered | `/wiki/browse/` | unchanged category cards | `[x]` |
| Browse filtered | `?entity_subtype=resource`, `?facet=acquisition_method:mining` | active filter summary | `[x]` |
| QA Staff / QA Ember detail | post slugs | unchanged | `[x]` |
| Search mining/wood/forge | `/wiki/search/?q=...` | unchanged | `[x]` |
| Admin read-only | `/wiki/admin/` | session-dependent | `[~]` automation Access Denied |

**Not built:** search index, query parser, SQL, new domains/categories.

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
| T-CRAFT-01 | Recipe with unresolved ingredient + station | P0.5 | `[x]` P0.5-A badges + P0.5-C admin queue derivation |
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
