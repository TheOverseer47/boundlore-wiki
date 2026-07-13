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

## P2-G.2 — Creature Encounter, Spawn & Drop Context Acceptance Sweep

**Milestone:** P2-G foundation block (G.1 + G.2); registry/read/search/facet baseline only; no SQL, no encounter posts, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| CreatureEncounterRegistry API sweep | QA Ogre console | all normalize/extract/signals/guards green | `[x]` |
| No encounter/spawn/drop posts | registry helpers | shouldPromote* false | `[x]` |
| dropped_by / intents | relations/contribution | derived_inverse; report_drop/add_behavior/add_spawn active; report_wr reserved | `[x]` |
| Observation/ContentModel/Facet | BEING:creature/npc; behavior/spawn/drop facets | explicit-only; create_ui false | `[x]` |
| Search parser hints | creature spawn/drop/weakness/resistance | hint-only; no crash | `[x]` |
| Search regressions | qa ogre/qa staff/mining/wood/forge/coordinates | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no behavior/spawn/weakness sections | `[x]` |
| Wood/Forge | search/admin | missing-entry only; no posts | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-G.2 acceptance sweep completed; Creature encounters, spawn contexts, drop contexts, behavior, and combat affinity accepted as registry/read/search/facet baseline only. No encounter posts, no loot UI, no SQL, no data migration.** P2-G accepted as local foundation.

---

## P2-H.1 — Requirement, Unlock & Progression Context Baseline

**Milestone:** P2-H requirement/unlock/progression registry; client-side only; no SQL, no requirement/unlock posts, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API | console on `/wiki/search/` or QA Staff | `BoundLoreRequirementUnlockRegistry` object; normalizers green | `[x]` |
| Requirement types | console | required_level/profession/faction/tool/station_tier normalize | `[x]` |
| Unlock/progression | console | quest_unlock/recipe_unlock/level/profession_level/locked normalize | `[x]` |
| Record normalizers | console | requirement/unlock/progression/access/set — no crash | `[x]` |
| Signal extractors | console | extract/get*SearchSignals — no crash | `[x]` |
| Guards | console | hasExplicit*/shouldPromote*/shouldRender* safe | `[x]` |
| Reserved relations/intents | console | crafted_by_profession/gathered_via/add_capability_role reserved | `[x]` |
| Search parser hints | required level/quest prerequisite/recipe unlock/vendor access | hint-only, no crash | `[x]` |
| Search regressions | qa ogre/qa staff/mining/wood/forge/drop/coordinates | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no requirement/unlock sections | `[x]` |
| Wood/Forge | search/admin | missing-entry only; no posts | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-H.1:** Requirement/unlock/progression baseline only. No requirement/unlock posts, no progression UI, no SQL, no deploy.

---

## P2-H.2 — Requirement, Unlock & Progression Context Acceptance Sweep

**Milestone:** P2-H foundation block (H.1 + H.2); registry/read/search/facet baseline only; no SQL, no requirement/unlock posts, no data migration.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API sweep | console on QA Staff | 120/120 normalize/extract/signals/guards/labels green | `[x]` |
| Integration registries | console | PC/QE/EC/OC/CE/C/F present; no UI activation | `[x]` |
| Reserved relations/intents | console | crafted_by_profession/gathered_via/add_capability_role/add_version_change | `[x]` |
| Relation persistence | console | crafted_from/crafted_at persisted; dropped_by derived_inverse | `[x]` |
| Search parser sweep | 30 queries incl. requirement/unlock/regression | hint-only, no crash | `[x]` |
| Search regressions | qa ogre/qa staff/mining/wood/forge/drop/coordinates | unchanged | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no requirement/unlock sections | `[x]` |
| Wood/Forge | search/admin | missing-entry only; no posts | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-H.2 acceptance sweep completed; Requirements, unlocks, progression contexts, and access states accepted as registry/read/search/facet baseline only. No unlock UI, no progression posts, no SQL, no data migration.** P2-H accepted as local foundation.

---

## P2-I.1 — P2 Foundation Integration & Blueprint Gap Gate

**Milestone:** P2 full foundation integration gate; read-only sweep; no SQL, no data migration, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Registry API matrix | QA Staff console | 12/12 P2+P1 APIs object | `[x]` |
| Active models | console | npc/quest/event/resource/creature active_model; create_ui/admin_flow false | `[x]` |
| Promotion/render guards | console | all shouldPromote*/shouldRender* false across P2 registries | `[x]` |
| Relation/intent safety | console | persisted/derived + reserved relations/intents unchanged | `[x]` |
| Search parser sweep | 30 baseline + P2 queries | hint-only, no crash | `[x]` |
| Resource facets | mining/raw/unknown/crystal_node filters | QA Ember on mining/raw/unknown; no false node_type match | `[x]` |
| QA Staff / QA Ember / Ogre / Swamp | post slugs | unchanged; no P2 sections without explicit fields | `[x]` |
| Search regressions | qa ember/staff/ogre/mining/wood/forge/drop | unchanged | `[x]` |
| Wood/Forge | search/admin | missing-entry only; no posts | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |

**P2-I.1 integration gate completed locally. P2-A through P2-H are accepted as registry/read/search/facet foundations only. No productive UI flows, no admin actions, no SQL, no data migration, no deploy. Remaining work is UI activation, backend/search/index work, moderation workflows, data migration, and launch readiness.**

---

## P2-I.2 — P2 Final Acceptance & P3 Readiness Gate

**Milestone:** P2 foundation officially closed locally; P3 readiness documented; no SQL, no data migration, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| P2 inventory | docs | P2-A … P2-I.1 documented and accepted | `[x]` |
| Final browser smoke | 22 URLs + QA pages | HTTP 200; QA baseline unchanged | `[x]` |
| Final console smoke | QA Staff | 12/12 APIs; 38/38 guards | `[x]` |
| Search parser final | 28 queries | hint-only, no crash | `[x]` |
| No UI/backend/SQL | code/docs | no productive activation | `[x]` |
| Wood/Forge | search/admin | missing-entry only; no posts | `[x]` |
| Pending `add_recipe` conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` automation not verified |
| P3 readiness note | docs | done vs. open documented | `[x]` |

**P2-I.2 final acceptance completed locally. P2-A through P2-I.1 are accepted as registry/read/search/facet foundations only. No productive UI flows, no admin actions, no SQL, no data migration, no deploy. P2 Foundation is ready to be used as the base for P3 UI activation. Remaining work: P3 UI activation, admin/moderation workflow activation, backend/search-index work, data migration strategy, production QA, deployment readiness, and launch decision.**

**P2 Foundation lokal abgeschlossen — nicht deployed. boundlore.com unangetastet. Deployment Freeze aktiv.**

---

## P3-A.1 — Read-only P2 Context Renderer Baseline

**Milestone:** P3-A first UI brick; detail-page read-only context renderer; explicit-only; no SQL, no data migration, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ContextSectionRenderer API | console on QA Staff | normalize/shouldRender/hasExplicit green | `[x]` |
| Explicit-only guards | console | source_detail no node section; title no requirement section | `[x]` |
| Promotion/actions | console | shouldPromoteContextToPost/shouldRenderContextActions false | `[x]` |
| DOM on QA pages | post slugs | `.bl-p3-context-section` count 0 | `[x]` |
| QA Staff / Ember / Ogre / Swamp | post slugs | visually unchanged | `[x]` |
| Search regressions | qa staff/ember/ogre/mining/wood/forge | unchanged | `[x]` |
| Wood/Forge | search/admin | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-A.1:** Read-only P2 context renderer baseline. No admin/create/edit flows. P3-B can enable section tests with explicit data.

---

## P3-A.2 — Read-only P2 Context Renderer Acceptance Sweep

**Milestone:** P3-A acceptance sweep; read-only verification; no code/data changes; no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ContextSectionRenderer API | console on QA Staff | 46/46 normalize/policy/explicit/render/security green | `[x]` |
| Explicit-only guards | console | source_detail no node; title no fire/weakness/requirement | `[x]` |
| Promotion/actions | console | shouldPromote*/shouldRenderContextActions false | `[x]` |
| Cross-registry guards | console | RN/OC/CE/RU promotion guards false | `[x]` |
| DOM on QA pages | Staff/Ember/Ogre/Swamp | `.bl-p3-context-section` count 0 | `[x]` |
| DOM safety | QA pages | no buttons/forms/admin/create/edit links in `.bl-p3-context` | `[x]` |
| QA Staff / Ember / Ogre / Swamp | post slugs | visually unchanged | `[x]` |
| Search/resources regressions | 23 URLs | HTTP 200; baseline unchanged | `[x]` |
| Resources filters | mining/raw/unknown/node_type | QA Ember visible; no false node hits | `[x]` |
| Wood/Forge | search/admin | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` Access Denied |

**P3-A.2 acceptance sweep completed locally.** The read-only P2 context renderer is accepted as an explicit-only detail-page renderer. It creates no actions, buttons, forms, admin/create/edit links, posts, data changes, automatic promotion, or taxonomy inference. QA baseline pages remain visually unchanged without explicit P2 context fields. P3-B can later test individual context sections with real explicit data.

---

## P3-B.1 — Synthetic Explicit Context Section Fixture Baseline

**Milestone:** P3-B first brick; QA-only synthetic fixture harness; no posts, no DB writes, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Fixture page | `/qa/p3-context-renderer-fixtures.html` | HTTP 200; QA-only banner; 8 fixtures | `[x]` |
| Positive fixtures A–E | fixture page | resource/observation/creature/requirement/versioning sections visible | `[x]` |
| Negative fixtures F–H | fixture page | no `.bl-p3-context-section` | `[x]` |
| Console assertions | fixture page | 12/12 explicit-only checks green | `[x]` |
| DOM safety | fixture page | no buttons/forms/admin/create/edit in `.bl-p3-context` | `[x]` |
| Visible sections | fixture page | 5 positive sections (A–E) | `[x]` |
| QA Staff / Ember / Ogre / Swamp | post slugs | 0 `.bl-p3-context-section`; visually unchanged | `[x]` |
| Production regressions | browse/resources/items/search/admin | HTTP 200; baseline unchanged | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-B.1:** QA-only synthetic fixture harness validates explicit-only context rendering. No posts, no data changes, no admin/create/edit flows. Negative fixtures confirm source_detail/name-only/empty do not render.

---

## P3-B.2 — Synthetic Context Renderer Fixture Acceptance Sweep

**Milestone:** P3-B acceptance sweep; read-only verification; no code/data changes; no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Fixture page | `/qa/p3-context-renderer-fixtures.html` | HTTP 200; QA-only banner; not in navigation | `[x]` |
| Fixture panels | fixture page | 8/8 PASS | `[x]` |
| Console assertions | fixture page | 12/12 + 32/32 sweep checks green | `[x]` |
| Positive fixtures A–E | fixture page | 5 visible context sections | `[x]` |
| Negative fixtures F–H | fixture page | no sections rendered | `[x]` |
| DOM safety | fixture page | 0 unsafe elements in `.bl-p3-context` | `[x]` |
| Cross-registry guards | fixture page | RN/OC/CE/RU promotion guards false | `[x]` |
| QA Staff / Ember / Ogre / Swamp | post slugs | 0 `.bl-p3-context-section`; visually unchanged | `[x]` |
| Production regressions | 25 URLs | HTTP 200; baseline unchanged | `[x]` |
| Resources filters | mining/raw/unknown/node_type | QA Ember visible; no false node hits | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` Access Denied |

**P3-B.2 acceptance sweep completed locally.** The QA-only synthetic context renderer fixture harness is accepted. Explicit synthetic fields render the expected read-only sections; source_detail-only, name-only, and empty/unknown fixtures render no sections. No production navigation, posts, data writes, admin/create/edit flows, automatic promotion, or taxonomy inference were introduced.

---

## P3-C.1 — Local Read-only Detail Context Preview Adapter Baseline

**Milestone:** P3-C first brick; localhost query-param preview on real detail pages; no posts, no DB writes, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Preview adapter API | console on QA Staff + `?p3_context_preview=all` | 26/26 checks green | `[x]` |
| Positive preview modes | QA Staff + resource/observation/creature/requirement/versioning/all | banner + matching sections | `[x]` |
| Negative preview modes | QA Staff + negative_source_detail/name_only/empty_unknown/off | banner or none; 0 sections | `[x]` |
| Without preview query | QA Staff/Ember/Ogre/Swamp | 0 `.bl-p3-context-section`; visually unchanged | `[x]` |
| DOM safety | preview pages | no buttons/forms/admin/create/edit in preview context | `[x]` |
| Production regressions | browse/resources/items/search/admin | HTTP 200; baseline unchanged | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-C.1:** Local read-only detail context preview via `?p3_context_preview=` on localhost post pages only. Ephemeral synthetic overlay; no data writes, no posts, no production navigation.

---

## P3-C.2 — Local Context Preview Adapter Acceptance Sweep

**Milestone:** P3-C acceptance sweep; read-only verification; no code/data changes; no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Preview adapter API | QA Staff + `?p3_context_preview=all` | 57/59 console checks green | `[x]` |
| Positive preview modes | resource/observation/creature/requirement/versioning/all | banner + matching section(s) | `[x]` |
| Negative preview modes | negative_source_detail/name_only/empty_unknown/off | 0 sections | `[x]` |
| Entry mutation | console | original entry unchanged (`before===after`) | `[x]` |
| Without preview query | QA Staff/Ember/Ogre/Swamp | 0 sections, 0 banner | `[x]` |
| DOM safety | preview pages | no buttons/forms/admin/create/edit in context | `[x]` |
| Fixture regression | `/qa/p3-context-renderer-fixtures.html` | 8/8 fixtures, 12/12 assertions | `[x]` |
| Cross-registry guards | console | RN/OC/CE/RU promotion guards false | `[x]` |
| Production regressions | 16+ URLs | HTTP 200; baseline unchanged | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-C.2 acceptance sweep completed locally.** The local detail-page context preview adapter is accepted as localhost-only, query-param-only, ephemeral, read-only preview. Positive preview modes render expected sections; negative modes and no-query pages remain empty. No production navigation, data writes, posts, Supabase writes, admin/create/edit flows, automatic promotion, or taxonomy inference were introduced.

---

## P3-D.1 — Detail Preview Matrix QA Harness

**Milestone:** P3-D first brick; QA-only preview URL matrix for P3-C; no posts, no DB writes, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Matrix page | `/qa/p3-detail-preview-matrix.html` | HTTP 200; QA-only banner | `[x]` |
| Entries | matrix page | 4 entries (Staff/Ember/Ogre/Swamp) | `[x]` |
| Modes | matrix page | 11 modes per entry, 44 links | `[x]` |
| Link safety | matrix page | no admin/create/edit links; no buttons/forms | `[x]` |
| Expected docs | matrix page | sections/banner counts per mode | `[x]` |
| Sample positive preview | Staff/Ember/Ogre/Swamp + modes | banner + expected sections | `[x]` |
| Sample negative preview | negative_source_detail/name_only/empty | 0 sections | `[x]` |
| Without preview | QA Staff/Ember/Ogre/Swamp | 0 sections, 0 banner | `[x]` |
| Production regressions | browse/resources/items/search/admin | HTTP 200; baseline unchanged | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-D.1:** QA-only preview matrix catalogs localhost detail-page preview URLs with expected behavior. Not linked from production navigation. P3-C preview remains localhost-gated.

---

## P3-D.2 — Detail Preview Matrix Acceptance Sweep

**Milestone:** P3-D foundation block (D.1 + D.2); QA-only preview matrix acceptance; no code, no SQL, no data migration, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Matrix page | `/qa/p3-detail-preview-matrix.html` | HTTP 200; QA-only banner; 44 links | `[x]` |
| Link safety | matrix page | no admin/create/edit; no buttons/forms | `[x]` |
| Entry/mode coverage | `__P3DetailPreviewMatrix` | 4 entries; 11 modes each | `[x]` |
| Sample positive preview | Staff/Ember/Ogre/Swamp + modes | banner + expected sections | `[x]` |
| Sample negative preview | negative_source_detail/name_only/empty | 0 sections | `[x]` |
| Without preview | QA Staff/Ember/Ogre/Swamp | 0 sections, 0 banner | `[x]` |
| PreviewAdapter safety | Staff + `?p3_context_preview=all` | no mutation; no unsafe HTML | `[x]` |
| Fixture regression | `/qa/p3-context-renderer-fixtures.html` | 8/8 fixtures; 12/12 assertions | `[x]` |
| Production regressions | browse/resources/items/search/admin + QA posts | HTTP 200; baseline unchanged | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-D.2 acceptance sweep completed locally.** The QA-only detail preview matrix is accepted. It covers QA Staff, QA Ember, QA Ogre, and Swamp across all preview modes with local detail-page links only. Positive preview modes render expected sections; negative/off/no-preview states remain empty. No production navigation, data writes, posts, Supabase writes, admin/create/edit flows, automatic promotion, or taxonomy inference were introduced. P3-C preview remains localhost-gated.

---

## P3-E.1 — Preview Production Guard Safety Baseline

**Milestone:** P3-E first brick; production guard helpers + QA-only guard test page; no posts, no DB writes, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Guard page | `/qa/p3-preview-guard-safety.html` | HTTP 200; QA-only banner | `[x]` |
| Guard cases | guard page | 12/12 PASS; only A/B active | `[x]` |
| Hostname API | console | localhost allowed; 127.0.0.1/boundlore blocked | `[x]` |
| Location API | console | localhost+all active; boundlore+all off | `[x]` |
| Malicious query | case L | inactive; mode off | `[x]` |
| Link safety | guard page | no admin/create/edit; no buttons/forms | `[x]` |
| Preview regression | QA Staff + modes | all/resource/negative/no-preview unchanged | `[x]` |
| Matrix regression | `/qa/p3-detail-preview-matrix.html` | 44 links; 4×11 modes | `[x]` |
| Fixture regression | `/qa/p3-context-renderer-fixtures.html` | 8/8 fixtures; 12/12 assertions | `[x]` |
| Production regressions | browse/resources/items/search/admin + QA posts | HTTP 200; baseline unchanged | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-E.1:** Preview production guard safety baseline. Exact `localhost` + valid query mode only. boundlore.com / www / preview subdomain blocked. Not linked from production navigation.

---

## P3-E.2 — Preview Production Guard Acceptance Sweep

**Milestone:** P3-E foundation block (E.1 + E.2); production guard acceptance; no code, no SQL, no data migration, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Guard page | `/qa/p3-preview-guard-safety.html` | HTTP 200; 12/12 PASS | `[x]` |
| Hostname API | console | localhost only; 127.0.0.1/boundlore blocked | `[x]` |
| Location API | console | localhost+valid active; off/unknown/malicious inactive | `[x]` |
| Link safety | guard page | no admin/create/edit; no buttons/forms | `[x]` |
| Preview regression | QA Staff + modes | all/resource/negative/off/no-preview | `[x]` |
| Matrix regression | `/qa/p3-detail-preview-matrix.html` | 44 links; 4×11 modes | `[x]` |
| Fixture regression | `/qa/p3-context-renderer-fixtures.html` | 8/8 fixtures; 12/12 assertions | `[x]` |
| Production regressions | browse/resources/items/search/admin + QA posts | HTTP 200; baseline unchanged | `[x]` |
| Without preview | QA Staff/Ember/Ogre/Swamp | 0 sections, 0 banner | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-E.2 acceptance sweep completed locally.** The preview production guard is accepted. Preview remains active only for exact localhost plus a valid p3_context_preview query mode. 127.0.0.1, boundlore.com, www.boundlore.com, preview.boundlore.com, unknown/off/no-query, and malicious query values remain inactive. No production navigation, data writes, posts, Supabase writes, admin/create/edit flows, automatic promotion, or taxonomy inference were introduced.

---

## P3-F.1 — Preview Layer Final Integration & Readiness Gate

**Milestone:** P3 preview layer integration gate (A–E); read-only verification; no code, no SQL, no data migration, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Fixture harness | `/qa/p3-context-renderer-fixtures.html` | 8/8 fixtures; 12/12 assertions | `[x]` |
| Preview matrix | `/qa/p3-detail-preview-matrix.html` | 44 links; 4×11 modes; QA-only | `[x]` |
| Production guard | `/qa/p3-preview-guard-safety.html` | 12/12 PASS; localhost only | `[x]` |
| Integration smoke | Staff/Ember/Ogre/Swamp + modes | positive/negative/off/no-preview | `[x]` |
| Console acceptance | Staff + `?p3_context_preview=all` | CSR+CPA; guards false; no mutation | `[x]` |
| Without preview | QA Staff/Ember/Ogre/Swamp | 0 sections, 0 banner | `[x]` |
| Production regressions | browse/resources/items/search/admin + QA posts | 29/29 HTTP 200 | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-F.1 integration gate completed locally.** The P3 preview layer from renderer through fixtures, detail preview adapter, preview matrix, and production guard is integrated and ready for final acceptance. The layer remains read-only, explicit-only, synthetic/ephemeral, localhost-only, query-param-only, production-guarded, and disconnected from admin/create/edit/moderation flows. Separate launch/data-safety gate required before deploy.

---

## P3-F.2 — Preview Layer Final Acceptance Sweep

**Milestone:** P3 preview layer final acceptance (A–F); read-only verification; no code, no SQL, no data migration, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Fixture harness | `/qa/p3-context-renderer-fixtures.html` | 8/8 fixtures; 12/12 assertions | `[x]` |
| Preview matrix | `/qa/p3-detail-preview-matrix.html` | 44 links; 4×11 modes; QA-only | `[x]` |
| Production guard | `/qa/p3-preview-guard-safety.html` | 12/12 PASS; localhost only | `[x]` |
| Preview smoke | Staff/Ember/Ogre/Swamp + modes | positive/negative/off/no-preview | `[x]` |
| Console acceptance | Staff + `?p3_context_preview=all` | CSR+CPA; guards false; no mutation | `[x]` |
| Without preview | QA Staff/Ember/Ogre/Swamp | 0 sections, 0 banner; baseline content | `[x]` |
| Production regressions | browse/resources/items/search/admin + QA posts | 37/37 HTTP 200 | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |

**P3-F.2 final acceptance sweep completed locally.** The P3 preview layer is accepted end-to-end. Renderer, fixture harness, local detail preview adapter, preview matrix, production guard, and integration gate are all green. The layer remains read-only, explicit-only, synthetic/ephemeral, localhost-only, query-param-only, production-guarded, QA-only harnessed, and disconnected from admin/create/edit/moderation flows. No production navigation, data writes, posts, Supabase writes, automatic promotion, or taxonomy inference were introduced. boundlore.com remains untouched.

---

## P3-G.1 — Blueprint Gap & Read-only Data Binding Plan Gate

**Milestone:** P3 planning/gap gate; docs-only; no code, no SQL, no data migration, no deploy.

| Check | Result |
|-------|--------|
| P3-F.2 final accepted | `[x]` |
| P3-G.1 gap matrix documented | `[x]` |
| Read-only data binding plan | `[x]` — P3-H.1 recommended next |
| Code changes | none |
| Data changes | none |
| UI activation | none |
| Deploy | forbidden without launch/data-safety gate |

**Next candidate:** P3-H.1 Read-only Context Data Contract Baseline. Then P3-H.2 acceptance sweep. Deploy remains blocked.

---

## P3-H.1 — Read-only Context Data Contract Baseline

**Milestone:** P3-H.1 code baseline; read-only explicit field normalization; no SQL, no data migration, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Data contract module | `js/context-data-contract.js` | `BoundLoreContextDataContract` API; no writes | `[x]` |
| Contract fixture page | `/qa/p3-context-data-contract-fixtures.html` | HTTP 200; QA-only banner; 9 fixtures A–I | `[x]` |
| Positive fixtures | A–E, I | Expected sections render | `[x]` |
| Negative fixtures | F, G, H | 0 sections | `[x]` |
| Contract assertions | console | 17/17 checks (writes/promotion/actions false) | `[x]` |
| Entry immutability | console | `before === after` on resolve | `[x]` |
| Renderer regression | `/qa/p3-context-renderer-fixtures.html` | 8/8 fixtures; 12/12 assertions | `[x]` |
| Preview matrix | `/qa/p3-detail-preview-matrix.html` | 4×11; 44 links | `[x]` |
| Guard safety | `/qa/p3-preview-guard-safety.html` | 12/12 PASS | `[x]` |
| Preview QA Staff | `?p3_context_preview=all/resource_node/negative_source_detail/off` | Banner/sections per mode | `[x]` |
| QA Staff/Ember/Ogre/Swamp | post slugs without preview | 0 `.bl-p3-context-section`; 0 banner | `[x]` |
| Standard regression | homepage/browse/resources/items/search/admin | HTTP 200; unchanged | `[x]` |
| Wood/Forge | search | missing-entry only; no posts | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` |
| Deploy / push / SQL | — | forbidden | `[x]` |

**Next:** P3-H.2 acceptance sweep after local verification.

---

## P3-H.2 — Read-only Context Data Contract Acceptance Sweep

**Milestone:** P3-H.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| P3-H.1 baseline accepted | HEAD `1fc890f` | contract module integrated | `[x]` |
| Contract fixture page | `/qa/p3-context-data-contract-fixtures.html` | 9/9 fixtures; 17/17 assertions | `[x]` |
| Console API sweep | contract fixture page | 23/23 checks (writes/promotion/actions/sources/explicit-only) | `[x]` |
| Entry immutability | console | `before === after`; resolved clone | `[x]` |
| Derived biome_context | QA Staff without preview | 0 sections (no false observation) | `[x]` |
| Renderer regression | `/qa/p3-context-renderer-fixtures.html` | 8/8 fixtures; 12/12 assertions | `[x]` |
| Preview matrix | `/qa/p3-detail-preview-matrix.html` | 4×11; 44 localhost links | `[x]` |
| Guard safety | `/qa/p3-preview-guard-safety.html` | 12/12 PASS | `[x]` |
| Preview QA Staff | all/resource_node/negative_source_detail/off/none | per-mode banner/sections | `[x]` |
| QA Staff/Ember/Ogre/Swamp | post slugs without preview | 0 `.bl-p3-context-section`; 0 banner | `[x]` |
| Standard regression | 24+ URLs incl. search/admin | HTTP 200; unchanged | `[x]` |
| Wood/Forge | search | missing-entry only | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` HTTP 200 only |
| Deploy / push / SQL | — | forbidden | `[x]` |

**P3-H.2 acceptance sweep completed locally.** The read-only context data contract is accepted. It normalizes only explicit safe fields from root, meta, discovery_payload, and structured_context, preserves source_detail/name-only negatives, mutates no entries, writes no data, creates no posts, activates no admin/create/edit/moderation flows, and does not enable search indexing, automatic promotion, or taxonomy inference.

**Next candidate:** P3-I Planning Gate or controlled local read-only sample data gate. Deploy remains blocked without launch/data-safety gate.

---

## P3-I.1 — Local Read-only Sample Data Gate

**Milestone:** P3-I.1 QA-only sample data harness; explicit contract fields on local entry objects; no SQL, no DB writes, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Sample data gate page | `/qa/p3-readonly-sample-data.html` | HTTP 200; QA-only banner; 10 samples | `[x]` |
| Positive samples A–F | sample gate | expected sections render | `[x]` |
| Negative samples G–J | sample gate | 0 sections | `[x]` |
| Derived biome block | sample I (`_derived: true`) | 0 sections | `[x]` |
| Pipeline | DataContract → Renderer | no writes; entry not mutated | `[x]` |
| Contract fixture regression | `/qa/p3-context-data-contract-fixtures.html` | 9/9; 17/17 | `[x]` |
| Renderer/matrix/guard regression | P3 harness pages | unchanged green | `[x]` |
| QA Staff/Ember/Ogre/Swamp | without preview | 0 sections/banner | `[x]` |
| Deploy / push / SQL | — | forbidden | `[x]` |

**Next:** P3-I.2 acceptance sweep.

---

## P3-I.2 — Local Read-only Sample Data Acceptance Sweep

**Milestone:** P3-I.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| P3-I.1 baseline accepted | HEAD `de834b8` | sample gate integrated | `[x]` |
| Sample data gate | `/qa/p3-readonly-sample-data.html` | 10/10 PASS; failCount 0 | `[x]` |
| Console API sweep | sample gate | 21/21 checks incl. derived block | `[x]` |
| Positive A–F | sample gate | expected sections | `[x]` |
| Negative G–J | sample gate | 0 sections | `[x]` |
| Contract fixture regression | `/qa/p3-context-data-contract-fixtures.html` | 9/9; 17/17 | `[x]` |
| Renderer/matrix/guard | P3 harness pages | 8/8; 12/12; 44 links; 12/12 | `[x]` |
| Preview QA Staff | all/resource_node/negative/off/none | per-mode banner/sections | `[x]` |
| QA Staff/Ember/Ogre/Swamp | without preview | 0 sections/banner | `[x]` |
| Standard regression | 17+ URLs | HTTP 200 | `[x]` |
| Wood/Forge / pending conflict | search/admin read-only | untouched | `[x]` |
| Admin optional | `/wiki/admin/` | session-dependent | `[~]` HTTP 200 only |
| Deploy / push / SQL | — | forbidden | `[x]` |

**P3-I.2 acceptance sweep completed locally.** The QA-only local read-only sample data gate is accepted. Positive local sample entries render expected context sections through the real DataContract → ContextSectionRenderer pipeline, while source_detail-only, name-only, derived-only, and empty/unknown samples render no sections. No production navigation, data writes, posts, Supabase writes, admin/create/edit/moderation flows, search indexing, automatic promotion, or taxonomy inference were introduced.

**Next candidate:** P3-J Planning Gate or controlled Real-Data Read-only Gate. Deploy remains blocked.

---

## P3-J.1 — Real-Data Readiness & Safety Planning Gate

**Milestone:** P3-J.1 docs-only planning gate; no code, SQL, data migration, or deploy.

| Check | Result |
|-------|--------|
| P3-I.2 sample data gate accepted | `[x]` |
| Real-Data Readiness Matrix documented | `[x]` |
| P3-K.1 probe candidate defined | `[x]` |
| LAUNCH-0 gate documented (not executed) | `[x]` |
| Not live-ready documented | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**Next candidate:** P3-K.1 Real Existing Entry Read-only Contract Probe. **LAUNCH-0** required before any push/deploy.

---

## P3-J.2 — Real-Data Readiness & Safety Acceptance Sweep

**Milestone:** P3-J.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

| Check | Result |
|-------|--------|
| P3-J.1 planning gate accepted | `[x]` |
| Real-Data Readiness Matrix A–H accepted | `[x]` |
| P3-K.1 next technical candidate confirmed | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Not live-ready documented | `[x]` |
| Browser smoke (7 URLs, harnesses, QA Staff/Ember) | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P3-J.2 acceptance sweep completed locally.** The real-data readiness and safety plan is accepted as docs-only. P3-K.1 is the next technical candidate for a read-only real existing entry contract probe. The project is still not live-ready. LAUNCH-0 remains mandatory before any push/deploy/live action. No code, data, SQL, Supabase, admin/create/edit/moderation, search-index, posts, push, or deploy changes were introduced.

**Next candidate:** P3-K.1 Real Existing Entry Read-only Contract Probe. **LAUNCH-0** required before any push/deploy.

---

## P3-K.1 — Real Existing Entry Read-only Contract Probe

**Milestone:** P3-K.1 localhost + query-param read-only real entry contract probe; no SQL, data migration, or deploy.

| Check | Result |
|-------|--------|
| `BoundLoreContextRealEntryProbe` module | `[x]` |
| localhost + `p3_contract_probe` only | `[x]` |
| QA probe link page (`qa/p3-real-entry-contract-probe.html`) | `[x]` — 4 entries × 4 modes |
| Real detail pages probed (Staff/Ember/Ogre/Swamp) | `[x]` |
| Without probe query: 0 probe panel | `[x]` |
| QA entries without explicit contract: 0 context sections | `[x]` |
| Preview + probe combined | `[x]` |
| No writes / posts / admin / search index | `[x]` |
| Not live-ready | `[x]` |

**Next candidate:** P3-K.2 acceptance sweep. **LAUNCH-0** required before any push/deploy.

---

## P3-K.2 — Real Existing Entry Read-only Contract Probe Acceptance Sweep

**Milestone:** P3-K.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

| Check | Result |
|-------|--------|
| P3-K.1 real entry probe accepted | `[x]` |
| localhost + query-param only | `[x]` |
| read-only / diagnostics-only | `[x]` |
| Probe panel only with `p3_contract_probe` | `[x]` |
| QA entries without explicit contract: 0 sections | `[x]` |
| Preview + probe combined | `[x]` |
| Harness regression green | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |
| Not live-ready | `[x]` |

**P3-K.2 acceptance sweep completed locally.** The real existing entry read-only contract probe is accepted. It is localhost-only, query-param-only, read-only, diagnostics-only, and creates no data writes, posts, Supabase writes, admin/create/edit/moderation flows, search indexing, automatic promotion, or taxonomy inference. Existing QA entries without explicit contract fields remain at zero context sections. The project remains not live-ready; LAUNCH-0 is still mandatory before push/deploy.

**Next candidate:** P3-L Planning Gate or Real-Data Probe Final Integration Gate. **LAUNCH-0** required before any push/deploy.

---

## P3-L.1 — P3 Read-only Context Layer Final Integration Gate

**Milestone:** P3-L.1 docs-only final integration gate; no code, SQL, data migration, or deploy.

| Check | Result |
|-------|--------|
| P3-A through P3-K stack documented as accepted | `[x]` |
| P3 Layer Integration Matrix (A–K) | `[x]` |
| Accepted / Not Activated Matrix | `[x]` |
| Preview + Contract + Sample + Probe integration documented | `[x]` |
| QA Staff/Ember baseline without preview/probe | `[x]` — 0 sections/banner/probe |
| Harness regression (sample/contract/guard/probe links) | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Next recommended area: P4-A.1 Authoring & Moderation Planning | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P3-L.1 integration gate completed locally.** P3-A through P3-K accepted as a cohesive read-only context layer. Preview, data contract, sample data gate, and real entry probe integrate without writes. Still not live-ready; LAUNCH-0 required before push/deploy.

**Next candidate:** P3-L.2 acceptance sweep, then **P4-A.1 Structured Context Authoring & Moderation Planning Gate**. **LAUNCH-0** required before any push/deploy.

---

## P3-L.2 — P3 Read-only Context Layer Final Acceptance Sweep

**Milestone:** P3-L.2 docs-only final acceptance sweep; no code, SQL, data migration, or deploy.

| Check | Result |
|-------|--------|
| P3-L.1 integration gate accepted | `[x]` |
| P3-A through P3-K final stack accepted | `[x]` |
| Preview/Contract/Sample/Probe layer complete | `[x]` |
| Preview/Probe mini-smoke | `[x]` |
| Harness regression green | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P3-L.2 acceptance sweep completed locally.** The P3 read-only context layer is accepted as an integrated local stack from renderer through preview, data contract, sample data gate, real-data safety planning, and real entry probe. No code, data, SQL, Supabase, admin/create/edit/moderation, search-index, migration/backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action. Next recommended area: **P4-A.1 Structured Context Authoring & Moderation Planning Gate**.

**Next candidate:** **P4-A.1 Structured Context Authoring & Moderation Planning Gate**. **LAUNCH-0** required before any push/deploy.

---

## P4-A.1 — Structured Context Authoring & Moderation Planning Gate

**Milestone:** P4-A.1 docs-only authoring/moderation planning gate; no code, SQL, data migration, or deploy.

| Check | Result |
|-------|--------|
| P3 Read-only Context Layer final accepted | `[x]` |
| Authorable Field Matrix documented | `[x]` |
| Flow Matrix documented | `[x]` |
| Safety rules for future writes documented | `[x]` |
| Recommended P4 sequence documented | `[x]` |
| No admin/create/edit/moderation activated | `[x]` |
| No data changes / no deploy | `[x]` |
| Not live-ready | `[x]` |
| Code changes | none |
| Deploy / push | forbidden |

**P4-A.1 planning gate completed locally.** P4 begins with authoring/moderation planning only. No write flows, UI, search index, backfill, or deploy activated.

**Next candidate:** P4-A.2 Acceptance Sweep. **LAUNCH-0** required before any push/deploy.

---

## P4-A.2 — Structured Context Authoring & Moderation Acceptance Sweep

**Milestone:** P4-A.2 docs-only acceptance sweep; no code, SQL, data migration, or deploy.

| Check | Result |
|-------|--------|
| P4-A.1 planning gate accepted | `[x]` |
| Authorable Field Matrix accepted | `[x]` |
| Flow Matrix accepted | `[x]` |
| Safety Rules accepted | `[x]` |
| P4 sequence accepted | `[x]` |
| No write/admin/moderation/search activated | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-A.2 acceptance sweep completed locally.** The structured context authoring and moderation plan is accepted as docs-only. The Authorable Field Matrix, Flow Matrix, Safety Rules, and recommended P4 sequence are accepted. No code, data, SQL, Supabase, admin/create/edit/moderation, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action. Next recommended step: **P4-B.1 Structured Context Schema & Validation Baseline**.

**Next candidate:** **P4-B.1 Structured Context Schema & Validation Baseline**. **LAUNCH-0** required before any push/deploy.

---

## P4-B.1 — Structured Context Schema & Validation Baseline

**Milestone:** P4-B.1 read-only schema and validation baseline; no SQL, data migration, admin/create/edit/moderation, search index, backfill, posts, push, or deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Schema module loaded | `qa/p4-structured-context-schema-fixtures.html` | `BoundLoreStructuredContextSchema` object | `[x]` |
| Policy functions | console on fixture page | all `should*` return `false` | `[x]` |
| Seven sections | schema diagnostics | resource_node … economy | `[x]` |
| Field status | console | authorable/restricted/planned/forbidden | `[x]` |
| Positive fixtures A–G | fixture harness | valid; restricted/planned no actions | `[x]` |
| Negative fixtures H–M | fixture harness | blocked/invalid/unknown as expected | `[x]` |
| Mutation safety | console | input unchanged after `createValidationReport` | `[x]` |
| Rendering safety | fixture DOM | no button/form/admin/create-post/edit-post links | `[x]` |
| P3 regression harnesses | p3 sample/contract/guard/probe | unchanged PASS counts | `[x]` |
| Prod pages | Staff/Ember without preview/probe | 0 sections/banner/probe | `[x]` |
| No prod script wiring | wiki pages | schema not loaded on prod paths | `[x]` |
| Not live-ready documented | gap notes §70 | yes | `[x]` |
| Code / data / deploy changes | git | schema + QA + docs only | `[x]` |

**P4-B.1 validation baseline:** `js/structured-context-schema.js` defines field schemas and read-only validators for seven structured context sections. QA fixture `qa/p4-structured-context-schema-fixtures.html` runs fixtures A–M locally. No writes, no admin/create/edit/moderation, no search index, no backfill, no posts. P3 read-only layer unchanged. Project remains not live-ready; LAUNCH-0 mandatory before push/deploy.

**Next candidate:** P4-B.2 Acceptance Sweep. **LAUNCH-0** required before any push/deploy.

---

## P4-B.2 — Structured Context Schema & Validation Acceptance Sweep

**Milestone:** P4-B.2 docs-only acceptance sweep; no code, SQL, data migration, admin/create/edit/moderation, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| P4-B.1 schema baseline accepted | `[x]` |
| Seven sections accepted | `[x]` |
| Field status authorable/restricted/planned/forbidden accepted | `[x]` |
| Policy functions all false | `[x]` |
| Negative rules accepted | `[x]` |
| QA fixture 13/13 PASS | `[x]` |
| P3 harness regression unchanged | `[x]` |
| Schema not prod-integrated | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-B.2 acceptance sweep completed locally.** The structured context schema and validation baseline is accepted. `BoundLoreStructuredContextSchema` covers seven sections, validates authorable/restricted/planned fields, blocks negative/inferred/derived/unknown/empty cases as expected, keeps all write/promotion/post/action policy functions false, and remains QA-fixture-only with no production integration. No code, data, SQL, Supabase, admin/create/edit/moderation, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

**Next candidate:** **P4-C.1 Admin Read-only Structured Field Inspector Planning or Baseline**. **LAUNCH-0** required before any push/deploy.

---

## P4-C.1 — Admin Read-only Structured Field Inspector Planning Gate

**Milestone:** P4-C.1 docs-only planning gate; no code, SQL, data migration, admin integration, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| P4-B schema/validation accepted | `[x]` |
| Inspector scope matrix documented | `[x]` |
| Forbidden inspector functions documented | `[x]` |
| Inspector data pipeline planned | `[x]` |
| P4-C.2 baseline module structure planned | `[x]` |
| No admin inspector code integration | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-C.1 planning gate completed locally.** Admin Read-only Structured Field Inspector is planned as read-only diagnostics only: entry identity, raw structured sources, contract output, schema validation report, issues, and field status — no save, edit, approve, reject, repair, queue mutation, promotion, search index, or deploy. Inspector remains unimplemented; schema module stays QA-fixture-only. Project remains not live-ready; LAUNCH-0 mandatory before push/deploy.

**Next candidate:** P4-C.2 Acceptance Sweep or Admin Read-only Structured Field Inspector Baseline. **LAUNCH-0** required before any push/deploy.

---

## P4-C.2 — Admin Read-only Structured Field Inspector Planning Acceptance Sweep

**Milestone:** P4-C.2 docs-only acceptance sweep; no code, SQL, data migration, admin integration, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| P4-C.1 planning gate accepted | `[x]` |
| Inspector scope matrix accepted | `[x]` |
| Forbidden inspector functions accepted | `[x]` |
| Inspector data pipeline accepted | `[x]` |
| Future P4-C.3 module structure accepted | `[x]` |
| No admin inspector code integration | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-C.2 acceptance sweep completed locally.** The Admin Read-only Structured Field Inspector plan is accepted as docs-only. The Inspector Scope Matrix, forbidden inspector functions, read-only inspector data pipeline, and future module structure are accepted. No code, data, SQL, Supabase, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

**Next candidate:** **P4-C.3 Admin Read-only Structured Field Inspector Baseline**. **LAUNCH-0** required before any push/deploy.

---

## P4-C.3 — Admin Read-only Structured Field Inspector Baseline

**Milestone:** P4-C.3 read-only inspector baseline; no admin HTML integration, SQL, data migration, queue/repair writes, search index, backfill, posts, push, or deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Inspector module loaded | `qa/p4-admin-structured-context-inspector-fixtures.html` | `BoundLoreAdminStructuredContextInspector` object | `[x]` |
| Uses DataContract + Schema | fixture harness | both APIs present | `[x]` |
| Policy functions | console on fixture page | all `should*` return `false` | `[x]` |
| Positive fixtures A–E | fixture harness | identity/contract/validation visible | `[x]` |
| Negative fixtures F–I | fixture harness | blocked/warning as expected | `[x]` |
| Empty fixture J | fixture harness | safe report, no crash | `[x]` |
| 10/10 PASS | fixture harness | `allPass === true` | `[x]` |
| Mutation safe | console | entry unchanged after report | `[x]` |
| Rendering safe | fixture DOM | no button/form/input/action links | `[x]` |
| No prod admin wiring | `/wiki/admin/` | inspector script not loaded | `[x]` |
| P3/P4 regression | existing harnesses | unchanged PASS | `[x]` |
| Not live-ready documented | gap notes §74 | yes | `[x]` |

**P4-C.3 inspector baseline:** `js/admin-structured-context-inspector.js` merges DataContract extraction and StructuredContextSchema validation into read-only inspector reports. QA fixture runs A–J locally. No admin dashboard integration, no writes, no queue/repair actions, no search index. Project remains not live-ready; LAUNCH-0 mandatory before push/deploy.

**Next candidate:** P4-C.4 Acceptance Sweep. **LAUNCH-0** required before any push/deploy.

---

## P4-C.4 — Admin Read-only Structured Field Inspector Acceptance Sweep

**Milestone:** P4-C.4 docs-only acceptance sweep; no code, SQL, data migration, admin integration, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| P4-C.3 inspector baseline accepted | `[x]` |
| Inspector read-only / diagnostics-only | `[x]` |
| DataContract + Schema integration | `[x]` |
| QA fixture 10/10 PASS | `[x]` |
| Policy functions all false | `[x]` |
| Mutation safe | `[x]` |
| Rendering safe | `[x]` |
| No prod admin wiring | `[x]` |
| P3/P4 harness regression unchanged | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-C.4 acceptance sweep completed locally.** The Admin Read-only Structured Field Inspector baseline is accepted. `BoundLoreAdminStructuredContextInspector` is read-only and diagnostics-only, combines DataContract output with StructuredContextSchema validation reports, renders safe inspection HTML, mutates no entries, and keeps all write/queue/repair/post/promotion/search policy functions false. It remains QA-fixture-only with no production admin integration. No code, data, SQL, Supabase, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

**Next candidate:** **P4-D.1 Structured Contribution Draft Flow Planning Gate**. **LAUNCH-0** required before any push/deploy.

---

## P4-D.1 — Structured Contribution Draft Flow Planning Gate

**Milestone:** P4-D.1 docs-only contribution draft planning gate; no code, SQL, data migration, contribution UI, submit flows, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| P4-C inspector baseline accepted | `[x]` |
| Draft lifecycle matrix documented | `[x]` |
| Draft payload contract planned | `[x]` |
| Contribution intent mapping planned | `[x]` |
| Field-level conflict policy planned | `[x]` |
| Moderation review requirements planned | `[x]` |
| No contribution UI activated | `[x]` |
| No draft submit/save flows activated | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-D.1 planning gate completed locally.** Structured contribution draft flow is planned as docs-only: draft lifecycle, payload contract, reserved intent mapping, field-level conflict policy, and moderation review requirements. No contribution UI, no draft submit, no save/approve/reject, no queue actions, no search index. Existing `add_recipe` pending conflict remains baseline. Project remains not live-ready; LAUNCH-0 mandatory before push/deploy.

**Next candidate:** P4-D.2 Acceptance Sweep. **LAUNCH-0** required before any push/deploy.

---

## P4-D.2 — Structured Contribution Draft Flow Acceptance Sweep

**Milestone:** P4-D.2 docs-only acceptance sweep; no code, SQL, data migration, contribution UI, submit flows, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| §76 P4-D.1 draft planning present | `[x]` |
| Draft lifecycle matrix (8 states) accepted | `[x]` |
| Draft payload contract (9 fields) accepted | `[x]` |
| Contribution intent mapping (7 reserved) accepted | `[x]` |
| Field-level conflict policy accepted | `[x]` |
| Moderation review requirements accepted | `[x]` |
| Supporting docs consistent | `[x]` |
| `ContributionIntentRegistry` unchanged | `[x]` |
| `add_recipe` pending conflict baseline | `[x]` |
| No contribution UI activated | `[x]` |
| No draft submit/save flows activated | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-D.2 acceptance sweep completed locally.** The Structured Contribution Draft Flow plan is accepted as docs-only. The Draft Lifecycle Matrix, Draft Payload Contract, Contribution Intent Mapping, Field-Level Conflict Policy, and Moderation Review Requirements are accepted. No code, data, SQL, Supabase, contribution UI, draft submit/save flows, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

**Next candidate:** **P4-E.1 Structured Contribution Draft Contract Baseline**. **LAUNCH-0** required before any push/deploy.

---

## P4-E.1 — Structured Contribution Draft Contract Baseline

**Milestone:** P4-E.1 read-only draft contract validation baseline; no contribution UI, submit/save flows, queue actions, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| `BoundLoreStructuredContributionDraftContract` module | `[x]` |
| Draft states + future-only states | `[x]` |
| Draft payload validation | `[x]` |
| Planned intent map read-only | `[x]` |
| Field-level conflict report | `[x]` |
| QA fixture A–O | `[x]` — 15/15 PASS |
| Policy functions all false | `[x]` |
| Mutation safe | `[x]` |
| Rendering safe | `[x]` |
| `ContributionIntentRegistry` unchanged | `[x]` |
| No contribution UI / draft submit / save | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| Prod paths — draft contract not loaded | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Data changes | none |
| Deploy / push | forbidden |

**P4-E.1 draft contract baseline completed locally.** `BoundLoreStructuredContributionDraftContract` validates draft payloads read-only, normalizes draft states, maps planned intents without registry mutation, and produces field-level conflict reports. QA fixture 15/15 PASS. No contribution UI, no draft submit/save, no queue actions, no search index, no data writes. Project remains not live-ready; LAUNCH-0 mandatory before push/deploy.

**Next candidate:** P4-E.2 Acceptance Sweep. **LAUNCH-0** required before any push/deploy.

---

## P4-E.2 — Structured Contribution Draft Contract Acceptance Sweep

**Milestone:** P4-E.2 docs-only acceptance sweep; no code, SQL, data migration, contribution UI, submit flows, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| §78 P4-E.1 draft contract baseline present | `[x]` |
| QA fixture A–O accepted | `[x]` — 15/15 PASS |
| Policy functions all false | `[x]` |
| Mutation safe | `[x]` |
| Rendering safe | `[x]` |
| Planned intent map read-only | `[x]` |
| `ContributionIntentRegistry` unchanged | `[x]` |
| Field-level conflict report accepted | `[x]` |
| Prod paths — draft contract not loaded | `[x]` |
| P3/P4 regression harnesses green | `[x]` |
| No contribution UI / draft submit / save | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-E.2 acceptance sweep completed locally.** The Structured Contribution Draft Contract baseline is accepted. `BoundLoreStructuredContributionDraftContract` is read-only and validates-only, normalizes draft states, validates payloads, uses planned intent mapping read-only without mutating `ContributionIntentRegistry`, produces field-level conflict reports, mutates no inputs, and keeps all submit/save/queue/approve/reject/archive/post/missing-entry/promotion/search policy functions false. It remains QA-fixture-only with no production contribution integration. No code, data, SQL, Supabase, contribution UI, draft submit/save flows, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

**Next candidate:** **P4-F.1 Structured Contribution Draft Inspector / Preview Planning Gate**. **LAUNCH-0** required before any push/deploy.

---

## P4-F.1 — Structured Contribution Draft Inspector / Preview Planning Gate

**Milestone:** P4-F.1 docs-only draft inspector/preview planning gate; no code, SQL, data migration, draft preview UI, submit flows, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| P4-E draft contract baseline accepted | `[x]` |
| Draft preview scope matrix documented | `[x]` |
| Draft preview pipeline planned | `[x]` |
| Visual diff policy planned | `[x]` |
| Forbidden preview functions documented | `[x]` |
| P4-F.3 baseline module structure planned | `[x]` |
| No draft preview UI activated | `[x]` |
| No submit/save/approve/reject/archive flows activated | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-F.1 planning gate completed locally.** Structured contribution draft inspector/preview is planned as docs-only: preview scope matrix, planned pipeline, visual diff policy, forbidden preview functions, and P4-F.3 baseline module outline. No draft preview UI, no submit/save, no approve/reject/archive, no queue actions, no search index. Existing `add_recipe` pending conflict remains baseline. Project remains not live-ready; LAUNCH-0 mandatory before push/deploy.

**Next candidate:** P4-F.2 Acceptance Sweep. **LAUNCH-0** required before any push/deploy.

---

## P4-F.2 — Structured Contribution Draft Preview Planning Acceptance Sweep

**Milestone:** P4-F.2 docs-only acceptance sweep; no code, SQL, data migration, draft preview UI, submit flows, search index, backfill, posts, push, or deploy.

| Check | Result |
|-------|--------|
| §80 P4-F.1 preview planning present | `[x]` |
| Draft preview scope matrix (15 areas) accepted | `[x]` |
| Draft preview pipeline accepted | `[x]` |
| Visual diff policy accepted | `[x]` |
| Forbidden preview functions accepted | `[x]` |
| P4-F.3 module structure accepted | `[x]` |
| Supporting docs consistent | `[x]` |
| No draft preview UI activated | `[x]` |
| No submit/save/approve/reject/archive flows activated | `[x]` |
| No write/admin/moderation/search/backfill activated | `[x]` |
| `add_recipe` pending conflict baseline | `[x]` |
| Not live-ready documented | `[x]` |
| LAUNCH-0 mandatory before push/deploy | `[x]` |
| Code changes | none |
| Data changes | none |
| Deploy / push | forbidden |

**P4-F.2 acceptance sweep completed locally.** The Structured Contribution Draft Inspector / Preview plan is accepted as docs-only. The Draft Preview Scope Matrix, read-only preview pipeline, Visual Diff Policy, forbidden preview functions, and future P4-F.3 module structure are accepted. No code, data, SQL, Supabase, Draft Preview UI, contribution UI, submit/save/approve/reject/archive flows, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; LAUNCH-0 is mandatory before any push/deploy/live action.

**Next candidate:** **P4-F.3 Structured Contribution Draft Preview Baseline** or **P4 Final Integration Gate**. **LAUNCH-0** required before any push/deploy.

---

## P4-F.3 — Structured Contribution Draft Preview Baseline

**Milestone:** P4-F.3 read-only QA baseline; draft preview module + 15-case fixture; no prod wiring, no submit/save/queue/moderation writes, no deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Preview module API | `/qa/p4-structured-contribution-draft-preview-fixtures.html` | `BoundLoreStructuredContributionDraftPreview` object; version `p4-f3` | `[x]` |
| Draft contract integration | same | uses `BoundLoreStructuredContributionDraftContract` | `[x]` |
| Schema integration | same | uses `BoundLoreStructuredContextSchema` | `[x]` |
| Fixture cases A–O | same | 15/15 PASS | `[x]` |
| Policy gates | console | all `should*` false | `[x]` |
| Mutation safety | console | draft/entry unchanged after report | `[x]` |
| Rendering safety | DOM | no button/form/input/action links | `[x]` |
| Field-level diff | fixtures | added/changed/conflict/duplicate/merge_candidate/blocked/restricted | `[x]` |
| No prod script load | wiki/admin/post paths | preview script absent | `[x]` |
| P3/P4 harness regression | existing QA pages | prior pass counts unchanged | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Not live-ready | docs | documented | `[x]` |
| Code / data / deploy | — | no push/deploy/SQL/writes/posts | `[x]` |

**P4-F.3 baseline completed locally.** `BoundLoreStructuredContributionDraftPreview` provides read-only draft preview reports, field-level diffs, validation/contract summaries, policy flags, and risk warnings for QA fixtures only. No production draft preview UI, no contribution UI, no submit/save/approve/reject/archive flows, no admin/create/edit/moderation write-paths, no queue actions, no search index, no backfill, no posts, no push, no deploy. Project remains not live-ready; **LAUNCH-0** mandatory before any push/deploy/live action.

**Next candidate:** **P4-F.4 Acceptance Sweep** or **P4 Final Integration Gate**. **LAUNCH-0** required before any push/deploy.

---

## P4-F.4 — Structured Contribution Draft Preview Acceptance Sweep

**Milestone:** P4-F.4 docs-only acceptance sweep; confirms P4-F.3 baseline; no code, SQL, data migration, draft preview UI, submit flows, search index, backfill, posts, push, or deploy.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| P4-F.3 baseline accepted | docs + QA | module + fixture documented | `[x]` |
| Preview module stable | `/qa/p4-structured-contribution-draft-preview-fixtures.html` | 15/15 PASS; all policy false | `[x]` |
| Mutation + rendering safe | console + DOM | no input mutation; no action controls | `[x]` |
| No prod integration | wiki/admin/post | preview script not loaded | `[x]` |
| P3/P4 harness regression | existing QA pages | prior pass counts unchanged | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Not live-ready | docs | documented | `[x]` |
| Code changes | — | none | `[x]` |
| Data changes | — | none | `[x]` |
| Deploy / push | — | forbidden | `[x]` |

**P4-F.4 acceptance sweep completed locally.** The Structured Contribution Draft Preview baseline is accepted. `BoundLoreStructuredContributionDraftPreview` is read-only and diagnostics-only, uses `BoundLoreStructuredContributionDraftContract` and `BoundLoreStructuredContextSchema`, renders field-level diffs, validation issues, policy flags, risk warnings, and evidence/confidence without mutating inputs. All write/submit/save/queue/approve/reject/archive/repair/post/missing-entry/promotion/auto-merge/search/registry policy functions remain false. It remains QA-fixture-only with no production Draft Preview integration. No code, data, SQL, Supabase, Draft Preview UI, contribution UI, submit/save/approve/reject/archive flows, admin/create/edit/moderation write-flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. The project remains not live-ready; **LAUNCH-0** is mandatory before any push/deploy/live action.

**Next candidate:** **P4 Final Integration Gate**. **LAUNCH-0** required before any push/deploy.

---

## P4-G.1 — P4 Final Integration Gate

**Milestone:** P4-G.1 docs-only final integration gate; confirms P4-A through P4-F accepted; no productive activation, writes, SQL, deploy, or push.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| P4 sequence A–F accepted | docs | all gates documented | `[x]` |
| P4 module pipeline | docs §84 | DataContract → Schema → Inspector → Draft Contract → Preview | `[x]` |
| P4 Final Safety Matrix | docs | all P4 components QA-only or unchanged | `[x]` |
| P4 Non-Activation Matrix | docs | no prod UI/flows activated | `[x]` |
| Draft Preview harness | QA fixture | 15/15 PASS | `[x]` |
| Draft Contract harness | QA fixture | 15/15 PASS | `[x]` |
| Admin Inspector harness | QA fixture | 10/10 PASS | `[x]` |
| Schema harness | QA fixture | 13/13 PASS | `[x]` |
| P3 regression | QA harnesses | sample 10/10, contract 9/9+17/17, renderer 8/8+12/12, guard 12/12, probe 16 links | `[x]` |
| Prod paths | wiki/post/admin | no P4 draft/inspector/schema scripts | `[x]` |
| Policy functions | P4 modules | all `should*` false | `[x]` |
| No writes / no posts / no search index | — | unchanged | `[x]` |
| Pending conflict | admin read-only | not touched | `[x]` |
| Not live-ready | docs | documented | `[x]` |
| Code / data / deploy | — | docs-only gate | `[x]` |

**P4-G.1 final integration gate completed locally.** P4 Foundation is accepted. P4-A through P4-F are fully documented and accepted. All P4 modules remain read-only/diagnostics-only/validates-only and QA-fixture-only with no productive admin/contribution/draft-preview integration. No code, data, SQL, Supabase, UI activation, submit/save/approve/reject/archive flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. Project remains **not live-ready**; **LAUNCH-0** mandatory before any push/deploy/live action.

**STOPP — ab hier wäre der nächste Schritt potenziell Live/Push/Deploy. Jetzt erst bewusst entscheiden.**

**Next candidates:** **P5-A.2 S+ Remediation Planning Acceptance Sweep** or **LAUNCH-0 Preflight Planning Gate**. **LAUNCH-0** required before any push/deploy.

---

## P5-A.1 — S+ Remediation Planning Gate

**Milestone:** P5-A.1 docs-only planning gate; structures remediation for four confirmed S+ launch blockers from pre-launch audit; no code, SQL, data, deploy, or push.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Audit NO-GO accepted | docs | Foundation PASS, Product Activation FAIL, Public Launch NO-GO | `[x]` |
| Four S+ findings listed | `p5-splus-remediation-plan.md` §2 | S+-01, S+-02, S+-03, S+-04 | `[x]` |
| Remediation sequence | plan §3 | P5-B → P5-C → P5-D → P5-E → P5-F | `[x]` |
| Gate structure | plan §4 | P5-B.1/B.2 through P5-F.1/F.2 defined | `[x]` |
| Acceptance criteria per S+ | plan §5 | all four findings have measurable criteria | `[x]` |
| Test strategy | plan §6 | static, RLS, RPC, XSS, API, storage tests documented | `[x]` |
| Fable retest strategy | plan §7 | Retest 1 after P5-F; Retest 2 after S-blockers | `[x]` |
| Stop conditions | plan §8 | documented | `[x]` |
| Rollback principles | plan §9 | documented | `[x]` |
| No implementation | — | no code/SQL/Supabase/data changes | `[x]` |
| Not live-ready | docs | NO-GO documented | `[x]` |
| Pending conflict | — | not touched | `[x]` |

**P5-A.1 planning gate completed locally.** Pre-launch audit NO-GO accepted. P5 remediation plan documents four S+ launch blockers (notification injection, RPC gate bypass, stored XSS, missing server-side release lock) with binding sequence P5-B through P5-F, per-finding acceptance criteria, test strategy, stop conditions, rollback principles, and Fable retest handoff. No code, data, SQL, Supabase, UI activation, submit/save/approve/reject/archive flows, queue actions, search-index, backfill, posts, push, or deploy changes were introduced. Project remains **not live-ready**; **LAUNCH-0** mandatory before any push/deploy/live action.

**STOPP — ab hier wäre der nächste Schritt potenziell Live/Push/Deploy. Jetzt erst bewusst entscheiden.**

**Next candidate:** **P5-B.1 Notification Injection Fix Baseline**. **LAUNCH-0** required before any push/deploy.

---

## P5-A.2 — S+ Remediation Planning Acceptance Sweep

**Milestone:** P5-A.2 docs-only acceptance sweep; confirms P5-A.1 plan completeness; no code, SQL, data, deploy, or push.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Plan §1 Status and Scope | `p5-splus-remediation-plan.md` | complete | `[x]` |
| Plan §2 S+ Finding Summary | plan | S+-01, S+-02, S+-03, S+-04 | `[x]` |
| Plan §3 Reihenfolge | plan | P5-B → P5-C → P5-D → P5-E → P5-F with rationale | `[x]` |
| Plan §4 Gate-Struktur | plan | P5-B.1/B.2 through P5-F.1/F.2 | `[x]` |
| Plan §5 Acceptance Criteria | plan | measurable per finding | `[x]` |
| Plan §6 Teststrategie | plan | 12 test types documented | `[x]` |
| Plan §7 Fable Retest | plan | Retest 1/2/Final prerequisites | `[x]` |
| Plan §8 Stop Conditions | plan | documented | `[x]` |
| Plan §9 Rollback | plan | documented | `[x]` |
| Plan §10 Nächster Schritt | plan | P5-B.1 next | `[x]` |
| S+-01 coverage | plan §5 | release_gate, fail-closed, no auto-publish | `[x]` |
| S+-02 coverage | plan §5 | foreign user_id, URL schemes | `[x]` |
| S+-03 coverage | plan §5 | sanitizer, XSS corpus, Quill preserved | `[x]` |
| S+-04 coverage | plan §5 | RPC ack+lock, SECURITY DEFINER | `[x]` |
| No implementation | — | no code/SQL/Supabase/data changes | `[x]` |
| No security fix done | — | planning only | `[x]` |
| Product Activation FAIL | docs | documented | `[x]` |
| Public Launch NO-GO | docs | documented | `[x]` |
| Pending conflict | — | not touched | `[x]` |

**P5-A.2 acceptance sweep completed locally.** The P5 S+ Remediation Plan is accepted as docs-only. All four S+ launch blockers are mapped to dedicated implementation and acceptance gates. The order P5-B through P5-F, per-finding acceptance criteria, test strategy, stop conditions, rollback principles, and Fable retest strategy are accepted. No code, SQL, Supabase, data, UI, RLS, RPC, sanitizer, release-lock, notification, push, deploy, or launch changes were introduced. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**STOPP — ab hier wäre der nächste Schritt potenziell Live/Push/Deploy. Jetzt erst bewusst entscheiden.**

**Next candidate:** **P5-B.2 Notification Injection Acceptance Sweep**. **LAUNCH-0** required before any push/deploy.

---

## P5-B.1 — Notification Injection Fix Baseline

**Milestone:** P5-B.1 code + SQL baseline for S+-02; ready for P5-B.2 acceptance — not final accepted.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| SQL insert policy | `admin_dashboard_notifications.sql` | `WITH CHECK (user_id = auth.uid())` | `[x]` file only |
| SQL not executed | — | no live RLS change | `[x]` |
| URL safety helper | `js/notification-url-safety.js` | version `p5-b1`; blocks unsafe schemes | `[x]` |
| Insert guard | `js/notifications.js` | cross-user + unsafe URL blocked client-side | `[x]` |
| Render guard | `js/auth-nav.js` | sanitize before href | `[x]` |
| Script order | `wiki/post/`, `wiki/admin/` | safety helper before notifications | `[x]` |
| QA fixture | `/qa/p5-notification-security-fixtures.html` | 22+ cases PASS; `allPass === true` | `[x]` |
| Live RLS negative test | Supabase | foreign user_id INSERT denied | `[ ]` P5-B.2 |
| S+-02 accepted | docs | not until P5-B.2 | `[ ]` |
| Supabase writes / deploy / push | — | none | `[x]` |
| Product Activation FAIL | docs | documented | `[x]` |
| Public Launch NO-GO | docs | documented | `[x]` |
| Pending conflict | — | not touched | `[x]` |

**P5-B.1 baseline implemented locally.** Insert policy and `target_url` safety prepared in repo; client URL helper and notification guards added. SQL not executed; live RLS unchanged. Accepted at repo level by P5-B.2 (see below). BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate (historical):** P5-B.2 — **complete**.

---

## P5-B.2 — Notification Injection Acceptance Sweep

**Milestone:** P5-B.2 docs-only acceptance sweep; confirms P5-B.1 repo baseline — not production-closed.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| SQL baseline | `admin_dashboard_notifications.sql` | `WITH CHECK (user_id = auth.uid())` | `[x]` repo file |
| SQL not executed | — | no live RLS change | `[x]` |
| Live-RLS NOT TESTED | docs | explicitly documented | `[x]` |
| URL safety helper | `notification-url-safety.js` | p5-b1; blocks unsafe schemes | `[x]` accepted |
| Insert guard | `notifications.js` | cross-user + unsafe URL blocked | `[x]` accepted |
| Render guard | `auth-nav.js` | sanitize before href | `[x]` accepted |
| Script load order | post/admin + auth-nav dynamic | safety before notifications | `[x]` |
| QA fixture | `/qa/p5-notification-security-fixtures.html` | 24/24 PASS; `allPass === true` | `[x]` |
| Regression smoke | homepage/browse/search/post/admin | no crash; no URL-safety errors | `[x]` |
| S+-02 production-closed | docs | not until DB apply + RLS test | `[ ]` |
| Supabase writes / deploy / push | — | none | `[x]` |
| Product Activation FAIL | docs | documented | `[x]` |
| Public Launch NO-GO | docs | documented | `[x]` |
| Pending conflict | — | not touched | `[x]` |

**P5-B.2 acceptance sweep completed locally.** The Notification Injection guardrail baseline is accepted at repository level. SQL policy scopes authenticated inserts to `user_id = auth.uid()` in repo file; SQL not executed; Live-RLS NOT TESTED. `BoundLoreNotificationUrlSafety` p5-b1 accepted; unsafe schemes blocked. QA fixture 24/24 PASS. No Supabase writes, no deploy, no push. S+-02 baseline-accepted but not production-closed. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**STOPP — ab hier wäre der nächste Schritt potenziell Live/Push/Deploy. Jetzt erst bewusst entscheiden.**

**Next candidate:** **P5-C.2 Observation RPC Gate Acceptance Sweep**. **LAUNCH-0** required before any push/deploy.

---

## P5-C.1 — Observation RPC Gate Fix Baseline

**Milestone:** P5-C.1 SQL baseline for S+-04; ready for P5-C.2 acceptance — not production-closed.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Ack schema | `fix_tutorial_ack_rls.sql` | `user_submission_acks.user_id` | `[x]` |
| RPC auth.uid() gate | `phase_a_observations_foundation.sql` | null actor blocked (`42501`) | `[x]` file only |
| Tutorial-ack gate | RPC body | before `INSERT INTO public.posts` | `[x]` file only |
| P5-E release hook | RPC comment | documented; no `release_gate` DDL | `[x]` |
| SECURITY DEFINER | RPC | retained + `search_path = public` | `[x]` |
| SQL not executed | — | no live RPC change | `[x]` |
| QA fixture | `/qa/p5-observation-rpc-security-fixtures.html` | 17/17 PASS; `allPass === true` | `[x]` |
| Live-RPC negative test | Supabase | no ack → no post row | `[ ]` P5-C.2 + DB gate |
| S+-04 production-closed | docs | not until DB apply + RPC test | `[ ]` |
| Supabase writes / deploy / push | — | none | `[x]` |
| Product Activation FAIL | docs | documented | `[x]` |
| Public Launch NO-GO | docs | documented | `[x]` |
| Pending conflict | — | not touched | `[x]` |

**P5-C.1 baseline implemented locally.** `bl_register_observation` now gates on `auth.uid()` and `user_submission_acks` in repo SQL; P5-E release-lock hook documented. SQL not executed; Live-RPC NOT TESTED. QA static fixture 17/17 PASS. Accepted at repo level by P5-C.2 (see below). BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate (historical):** P5-C.2 — **complete**.

---

## P5-C.2 — Observation RPC Gate Acceptance Sweep

**Milestone:** P5-C.2 docs-only acceptance sweep; confirms P5-C.1 repo baseline — not production-closed.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Ack schema accepted | `fix_tutorial_ack_rls.sql` | `user_submission_acks.user_id` | `[x]` |
| RPC auth.uid() gate | `phase_a_observations_foundation.sql` | null actor blocked (`42501`) | `[x]` accepted |
| Tutorial-ack gate | RPC body | before `INSERT INTO public.posts` | `[x]` accepted |
| P5-E release hook | RPC comment | documented; no `release_gate` DDL | `[x]` |
| SECURITY DEFINER | RPC | retained + `search_path = public` | `[x]` accepted |
| SQL not executed | — | no live RPC change | `[x]` |
| QA fixture | `/qa/p5-observation-rpc-security-fixtures.html` | 17/17 PASS; `allPass === true` | `[x]` |
| Notification fixture | `/qa/p5-notification-security-fixtures.html` | 24/24 PASS; no regression | `[x]` |
| Regression smoke | homepage/browse/search/post/admin | no crash | `[x]` |
| Live-RPC negative test | Supabase | no ack → no post row | `[ ]` DB gate |
| S+-04 production-closed | docs | not until DB apply + RPC test | `[ ]` |
| Release-lock enforcement | docs | remains P5-E scope | `[x]` |
| Supabase writes / deploy / push | — | none | `[x]` |
| Product Activation FAIL | docs | documented | `[x]` |
| Public Launch NO-GO | docs | documented | `[x]` |
| Pending conflict | — | not touched | `[x]` |

**P5-C.2 acceptance sweep completed locally.** The Observation RPC gate baseline is accepted at repository level. `bl_register_observation` checks `auth.uid()` and requires `user_submission_acks` for the actor before writes in repo SQL. SECURITY DEFINER guarded with search_path; P5-E release_gate hook documented. SQL not executed; Live-RPC NOT TESTED. QA fixture 17/17 PASS; notification fixture 24/24 PASS. No Supabase writes, no deploy, no push. S+-04 baseline-accepted but not production-closed. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**STOPP — ab hier wäre der nächste Schritt potenziell Live/Push/Deploy. Jetzt erst bewusst entscheiden.**

**Next candidate:** **P5-D.2 HTML Sanitization Acceptance Sweep**. **LAUNCH-0** required before any push/deploy.

---

## P5-D.1 — HTML Sanitization & URL Safety Baseline

**Milestone:** P5-D.1 code baseline for S+-03; ready for P5-D.2 acceptance — not production-closed.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ContentSafety module | `js/content-safety.js` | `BoundLoreContentSafety` `p5-d1` | `[x]` |
| Sanitizer engine | module | DOMParser allowlist; no DOMPurify | `[x]` |
| Unsafe HTML blocked | fixture | no `script`/`on*`/`iframe`/`svg` | `[x]` |
| Unsafe URL schemes | fixture | no `javascript:`/`data:`/`blob:`/`ftp:` | `[x]` |
| Safe Quill basics | fixture | lists/headings/bold/links preserved | `[x]` |
| Post render guard | `js/post-detail.js` | body sanitized after BLMETA strip | `[x]` |
| Create/edit guard | `create-post.js` / `edit-post.js` | outgoing HTML + source_url | `[x]` |
| Avatar guard | `avatar-utils.js` | unsafe `avatar_url` → initials | `[x]` |
| Admin compose/preview | `wiki/admin/index.html` | sanitized load/publish/preview | `[x]` |
| Sanitization fixture | `qa/p5-sanitization-security-fixtures.html` | 45/45 PASS | `[x]` |
| Observation fixture regression | `qa/p5-observation-rpc-security-fixtures.html` | 17/17 PASS | `[x]` |
| Notification fixture regression | `qa/p5-notification-security-fixtures.html` | 24/24 PASS | `[x]` |
| Stored content migration | DB | not claimed | `[ ]` |
| Server-side sanitizer | DB/RPC | not in P5-D.1 | `[ ]` |
| S+-03 production-closed | acceptance | P5-D.2 required | `[ ]` |
| Supabase writes / deploy / push | ops | none | `[x]` |

**P5-D.1 baseline implemented locally.** Central ContentSafety utility with rich HTML allowlist and URL scheme whitelist. Post render, create/edit outgoing paths, avatars, and admin compose/preview sinks guarded. QA sanitization fixture 45/45 PASS; observation 17/17 and notification 24/24 remain PASS. No Supabase writes, no deploy, no push. S+-03 baseline-implemented but not production-closed. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate:** **P5-E.1 Server-side Release Lock Planning Gate**. **LAUNCH-0** required before any push/deploy.

---

## P5-D.2 — HTML Sanitization & URL Safety Acceptance Sweep

**Milestone:** P5-D.2 acceptance sweep; confirms P5-D.1 repo baseline — **baseline-accepted**, not production-closed.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ContentSafety accepted | `js/content-safety.js` | p5-d1; fail-closed | `[x]` |
| Strict allowlist | fixture + code | unsafe blocked; Quill preserved | `[x]` |
| Sink guards accepted | post/create/edit/avatar/admin | guarded paths | `[x]` |
| WikiEntryLayout upstream | `post-detail.js` + layout | `cleanContent` sanitized before `buildModel` | `[x]` |
| Structured builders | `buildStructuredDiscoveryContent` | escaped fields | `[x]` |
| Reflected search XSS | `?q=<img onerror=...>` | escaped; no execution | `[x]` |
| Sanitization fixture | `qa/p5-sanitization-security-fixtures.html` | 45/45 PASS | `[x]` |
| Observation fixture | `qa/p5-observation-rpc-security-fixtures.html` | 17/17 PASS | `[x]` |
| Notification fixture | `qa/p5-notification-security-fixtures.html` | 24/24 PASS | `[x]` |
| Standard regression | browse/search/posts/admin | no crash | `[x]` |
| Serializer fix | `sanitizeRichTextHtml` | non-empty safe HTML output | `[x]` — found in sweep |
| Server-side sanitizer | DB/RPC | not implemented | `[ ]` |
| Stored content migration | DB | not performed | `[ ]` |
| S+-03 production-closed | acceptance | not claimed | `[ ]` |
| Supabase writes / deploy / push | ops | none | `[x]` |

**P5-D.2 acceptance sweep completed locally.** HTML sanitization baseline accepted at repository level. Sanitization fixture 45/45 PASS after minimal serializer fix; observation 17/17 and notification 24/24 remain PASS. Reflected search XSS probe clean. No Supabase writes, no deploy, no push. S+-03 baseline-accepted but not production-closed. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate:** **P5-E.2 Release Gate DB/RLS/RPC Baseline**. **LAUNCH-0** required before any push/deploy.

---

## P5-E.1 — Server-side Release Lock Planning Gate

**Milestone:** P5-E.1 docs-only planning for S+-01; ready for P5-E.2 — not implemented.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Plan document | `docs/architecture/p5-release-lock-plan.md` | all §1–§15 sections | `[x]` |
| Problem statement | patch-mode / wiki_patch_mode | client-only, fail-open documented | `[x]` |
| `release_gate` architecture | plan §4 | planned, not implemented | `[x]` planned |
| Helper architecture | plan §5 | fail-closed helpers planned | `[x]` planned |
| Enforcement matrix | plan §6 | posts/RPC/storage/comments/reactions | `[x]` |
| Roles matrix | plan §7 | pre-release default locked | `[x]` |
| UI/Admin plan | plan §8 | P5-E.3 scope defined | `[x]` |
| Test strategy | plan §9 | P5-E.2/E.3/E.4/E.5 | `[x]` |
| Gate split | plan §10 | E.2/E.3/E.4 defined | `[x]` |
| S+-01 acceptance criteria | plan §11 | repo/staging/prod tiers | `[x]` |
| Stop conditions | plan §12 | documented | `[x]` |
| Rollback plan | plan §13 | documented | `[x]` |
| Open questions | plan §14 | documented | `[x]` |
| `release_gate` implemented | SQL | not in P5-E.1 | `[ ]` |
| S+-01 baseline accepted | acceptance | P5-E.4 | `[ ]` |
| S+-01 production-closed | acceptance | staging + Fable | `[ ]` |
| Code/SQL/data changes | ops | docs only | `[x]` |
| Supabase writes / deploy / push | ops | none | `[x]` |

**P5-E.1 planning completed locally.** Release Lock implementation plan accepted for planning purposes. `p5-release-lock-plan.md` documents fail-closed `release_gate` target architecture, enforcement/roles matrices, UI plan, and P5-E.2/E.3/E.4 gate split. No SQL, no code, no data changes, no deploy, no push. S+-01 remains open — not implemented, not baseline-accepted. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate:** **P5-E.2 Release Gate DB/RLS/RPC Baseline**. **LAUNCH-0** required before any push/deploy.

---

## P5-E.2 — Release Gate DB/RLS/RPC Baseline

**Milestone:** P5-E.2 SQL baseline for S+-01 — **not executed**, **not applied**, **not baseline-accepted** (P5-E.4).

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| `release_gate_lock.sql` | `supabase/` | singleton table, default locked, audit, helpers | `[x]` |
| Missing config = locked | `bl_is_release_unlocked` | no row / exception → false | `[x]` |
| Fail-closed helpers | SQL | no fail-open, no service_role client | `[x]` |
| Admin helper | `bl_is_admin_actor` | `profiles.role = 'admin'` | `[x]` |
| Posts INSERT restrictive | `posts_release_gate_insert_restrictive` | `bl_can_create_user_content` | `[x]` |
| Posts UPDATE restrictive | `posts_release_gate_update_restrictive` | user edits blocked; admin bypass | `[x]` |
| `bl_register_observation` | `phase_a_observations_foundation.sql` | assert before posts INSERT | `[x]` |
| P5-C Tutorial-Ack | observation RPC | still present | `[x]` |
| Discovery storage | `storage_discovery_uploads_release_gate_insert_restrictive` | bucket-aware | `[x]` |
| Comments / reports | repo | NOT TESTED — no policies in repo | `[x]` documented |
| Report-screenshots | repo | NOT TESTED — no bucket policy | `[x]` documented |
| Patch Mode | `wiki_patch_mode.sql` | maintenance-only, not release lock | `[x]` |
| Frontend release lock | app JS/HTML | not wired in P5-E.2 | `[x]` |
| QA fixture | `p5-release-lock-db-security-fixtures` | 34/34 PASS | `[x]` |
| Sanitization regression | `p5-sanitization-security-fixtures` | PASS | `[x]` |
| Observation regression | `p5-observation-rpc-security-fixtures` | PASS | `[x]` |
| Notification regression | `p5-notification-security-fixtures` | PASS | `[x]` |
| SQL executed / DB migration | ops | none | `[x]` |
| Supabase writes / deploy / push | ops | none | `[x]` |
| S+-01 baseline accepted | acceptance | P5-E.4 | `[ ]` |
| S+-01 production-closed | acceptance | staging + Fable | `[ ]` |

**P5-E.2 baseline implemented locally.** `release_gate_lock.sql` and related SQL prepared; `bl_register_observation` release assert added. QA static fixture 34/34 PASS. No SQL execution, no data changes, no deploy, no push. S+-01 **DB/RLS/RPC baseline implemented** — not baseline-accepted, not production-closed. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate:** **P5-E.3 Release Gate Frontend/Admin UX Baseline**. **LAUNCH-0** required before any push/deploy.

---

## P5-E.3 — Release Gate Frontend/Admin UX Baseline

**Milestone:** P5-E.3 client UX for S+-01 — **not applied to DB**, **not baseline-accepted** (P5-E.4).

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| ReleaseGateClient | `js/release-gate-client.js` | v p5-e3, fail-closed API | `[x]` |
| Missing table = locked | client read | locked without DB apply | `[x]` |
| shouldAllowClientBypass | client | always false | `[x]` |
| create-post guard | `js/create-post.js` | assert + notice on load | `[x]` |
| edit-post guard | `js/edit-post.js` | save blocked when locked | `[x]` |
| support guard | `js/support.js` | report/upload blocked | `[x]` |
| Admin status panel | `wiki/admin/index.html` | locked/unlocked/unknown view | `[x]` |
| Unlock/relock UI | admin panel | reason + confirm; no auto-run | `[x]` |
| No SQL changes | ops | supabase/*.sql untouched | `[x]` |
| QA UI fixture | `p5-release-lock-ui-fixtures` | 30/30 PASS | `[x]` |
| DB fixture regression | `p5-release-lock-db-security-fixtures` | PASS | `[x]` |
| Sanitization regression | `p5-sanitization-security-fixtures` | PASS | `[x]` |
| Observation regression | `p5-observation-rpc-security-fixtures` | PASS | `[x]` |
| Notification regression | `p5-notification-security-fixtures` | PASS | `[x]` |
| Create post page | `/wiki/create-post/` | pre-release notice / blocked submit | `[x]` |
| Supabase writes / deploy / push | ops | none | `[x]` |
| S+-01 baseline accepted | acceptance | P5-E.4 | `[ ]` |
| S+-01 production-closed | acceptance | staging + Fable | `[ ]` |

**P5-E.3 baseline implemented locally.** ReleaseGateClient and submit guards wired; admin panel prepared. No unlock executed. No SQL changes. S+-01 **Frontend/Admin UX baseline implemented** — not baseline-accepted, not production-closed. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate:** **P5-E.4 Release Gate Acceptance Sweep**. **LAUNCH-0** required before any push/deploy.

---

## P5-E.4 — Release Gate Acceptance Sweep

**Milestone:** P5-E.4 local acceptance for S+-01 — **baseline accepted**, **not production-closed**, Live-RLS/Live-RPC **NOT TESTED**.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| P5-E.2 SQL baseline | `release_gate_lock.sql` | fail-closed, default locked, helpers, policies | `[x]` accepted |
| `release_gate_audit` | SQL | planned in baseline | `[x]` accepted |
| `bl_register_observation` assert | `phase_a_observations_foundation.sql` | before posts INSERT | `[x]` accepted |
| NOT TESTED gaps | comments/reports/report-screenshots | documented | `[x]` accepted |
| P5-E.3 ReleaseGateClient | `js/release-gate-client.js` | fail-closed, no bypass | `[x]` accepted |
| create-post guard | `js/create-post.js` | assert + notice | `[x]` accepted |
| edit-post guard | `js/edit-post.js` | save blocked when locked | `[x]` accepted |
| support guard | `js/support.js` | report/upload blocked | `[x]` accepted |
| Admin panel | `wiki/admin/index.html` | status + unlock UI, not executed | `[x]` accepted |
| Release Lock UI fixture | `p5-release-lock-ui-fixtures` | 30/30 PASS | `[x]` |
| Release Lock DB fixture | `p5-release-lock-db-security-fixtures` | 34/34 PASS | `[x]` |
| Sanitization regression | `p5-sanitization-security-fixtures` | 45/45 PASS | `[x]` |
| Observation regression | `p5-observation-rpc-security-fixtures` | 17/17 PASS | `[x]` |
| Notification regression | `p5-notification-security-fixtures` | 24/24 PASS | `[x]` |
| Standard regression | browse/search/posts/create/admin | no crash | `[x]` |
| SQL executed / DB migration | ops | none | `[x]` |
| Unlock/relock executed | ops | none | `[x]` |
| Supabase writes / deploy / push | ops | none | `[x]` |
| S+-01 baseline accepted | acceptance | P5-E.4 | `[x]` |
| S+-01 production-closed | acceptance | staging + Fable | `[ ]` |
| Live-RLS / Live-RPC | ops | NOT TESTED | `[x]` documented |

**P5-E.4 acceptance sweep completed locally.** The server-side Release Gate baseline is accepted at repository level. P5-E.2 prepared fail-closed DB/RLS/RPC SQL baseline; P5-E.3 prepared fail-closed frontend/admin UX guardrails. SQL was not applied; Live-RLS/Live-RPC remain NOT TESTED. S+-01 is **baseline-accepted** but **not production-closed**. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate:** **P5-F.1 Combined S+ Security Retest Gate**. **LAUNCH-0** required before any push/deploy.

---

## P5-F.1 — Combined S+ Security Retest Gate

**Milestone:** P5-F.1 local combined retest — all four S+ baselines **combined baseline retested**; **not production-closed**; Live-RLS/Live-RPC **NOT TESTED**.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| S+-02 retest | notification baseline | combined baseline retested | `[x]` |
| S+-04 retest | observation RPC baseline | combined baseline retested | `[x]` |
| S+-03 retest | sanitization baseline | combined baseline retested | `[x]` |
| S+-01 retest | release lock baseline | combined baseline retested | `[x]` |
| Notification fixture | `p5-notification-security-fixtures` | 24/24 PASS | `[x]` |
| Observation fixture | `p5-observation-rpc-security-fixtures` | 17/17 PASS | `[x]` |
| Sanitization fixture | `p5-sanitization-security-fixtures` | 45/45 PASS | `[x]` |
| Release Lock DB fixture | `p5-release-lock-db-security-fixtures` | 34/34 PASS | `[x]` |
| Release Lock UI fixture | `p5-release-lock-ui-fixtures` | 30/30 PASS | `[x]` |
| Standard regression | browse/search/posts/create/admin | no crash | `[x]` |
| Static S+ grep checks | repo patterns | PASS or NOT TESTED | `[x]` |
| SQL executed / DB migration | ops | none | `[x]` |
| Supabase writes / RPC / unlock | ops | none | `[x]` |
| Live-RLS / Live-RPC | ops | NOT TESTED | `[x]` documented |
| S+-01..04 production-closed | acceptance | staging + Fable | `[ ]` |
| Combined retest report | `p5-splus-combined-retest.md` | created | `[x]` |

**P5-F.1 combined S+ security retest completed locally.** All four S+ baselines re-verified together at repository level. All five P5 fixtures green. Standard regression green. No SQL execution, no Supabase writes, no data changes, no push, no deploy. S+ local/repo baseline retest **PASS**; S+ production closure remains **NOT TESTED / FAIL**. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate:** **P5-F.2 Fable Retest Handoff Package**. **LAUNCH-0** required before any push/deploy.

---

## P5-F.2 — Fable Retest Handoff Package

**Milestone:** P5-F.2 docs-only handoff — evidence bundle for independent Fable S+ Security Retest; **no Fable retest executed**.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| Handoff document | `p5-fable-splus-retest-handoff.md` | full package | `[x]` |
| Fable prompt | `p5-fable-splus-retest-prompt.md` | copy-paste ready (DE) | `[x]` |
| Fable checklist | `p5-fable-splus-retest-checklist.md` | short checkbox list | `[x]` |
| S+ status matrix | handoff §4 | four findings | `[x]` |
| Evidence file map | handoff §5 | all S+ files | `[x]` |
| Fixture map | handoff §6 | 5 fixtures | `[x]` |
| Fable test procedure | handoff §7 | A–E steps | `[x]` |
| Verdict format | handoff §8 | PASS/PARTIAL/FAIL discipline | `[x]` |
| Explicit non-claims | handoff §9 | no production claims | `[x]` |
| Next gate options | handoff §10 | A/B/C documented | `[x]` |
| S+ combined baseline handed off | P5-F.1 | retest evidence referenced | `[x]` |
| Code / SQL / fixture changes | ops | none | `[x]` |
| SQL executed / Supabase writes | ops | none | `[x]` |
| Fable retest executed | ops | none | `[x]` |
| S+-01..04 production-closed | acceptance | staging + Fable | `[ ]` |
| Live-RLS / Live-RPC | ops | NOT TESTED | `[x]` documented |

**P5-F.2 Fable retest handoff package created.** Handoff, prompt, and checklist prepared. S+ combined baseline retest handed off for independent Fable verification. No code, SQL, data, push, or deploy changes. S+ production closure remains NOT TESTED. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next candidate:** **Fable Retest 1** (S+ only) using `docs/architecture/p5-fable-splus-retest-prompt.md`. **LAUNCH-0** required before any push/deploy.

---

## P5-E.5 — Staged DB Application & Negative RLS/RPC Tests (BLOCKED)

**Milestone:** P5-E.5 staging apply + negative tests — **BLOCKED** at environment proof; no SQL applied.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| User approval staging-only | gate | explicit approval | `[x]` |
| Isolated staging proven | Supabase project list + config | separate staging ref | `[ ]` **BLOCKED** |
| Staging backup | pre-apply dump | created before SQL | `[ ]` — not attempted |
| SQL apply notifications | `admin_dashboard_notifications.sql` | staging only | `[ ]` — NOT RUN |
| SQL apply release gate | `release_gate_lock.sql` | staging only | `[ ]` — NOT RUN |
| SQL apply observation RPC | `phase_a_observations_foundation.sql` | staging only | `[ ]` — NOT RUN |
| S+-02 foreign notification insert | staging RLS negative | blocked | `[ ]` — NOT RUN |
| S+-04 RPC without ack / locked | staging RPC negative | blocked | `[ ]` — NOT RUN |
| S+-01 posts/storage while locked | staging RLS negative | blocked | `[ ]` — NOT RUN |
| S+-03 stored-content runtime | staging + local | sanitized | `[ ]` — NOT RUN (staging) |
| Local fixtures (5) | localhost:8080 | all PASS | `[x]` |
| Production closure | acceptance | NOT CLOSED | `[ ]` |
| Report | `p5-staged-db-application-report.md` | created | `[x]` |

**P5-E.5 blocked — isolated staging environment not proven.** No SQL execution, no Supabase writes to remote DB, no push/deploy. S+ repo baseline remains PASS; staging evidence FAIL. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

**Next:** Provision dedicated staging Supabase project; re-run P5-E.5. **LAUNCH-0** required before any push/deploy.

---

## P5-STAGING.3 — Tooling & Backup Dry Run

**Milestone:** P5-STAGING.3 — read-only connection + local `pg_dump`; no SQL apply.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| `psql` / `pg_dump` | PostgreSQL 18 bin | available | `[x]` |
| Read-only connection | staging pooler | PASS, no mutation | `[x]` |
| Pre-apply dump | `backups/staging/` | full dump, gitignored | `[x]` |
| Dump size | local file | > 0 bytes | `[x]` — 183,946 |
| Legacy ref excluded | credentials | no `ohkoojpzmptdfyowdgog` | `[x]` |
| SQL apply / mutation | ops | none | `[x]` |
| Fixture HTTP smoke | localhost:8080 | 200 or NOT RUN | `[x]` — 200 all five |
| Fixture pass counts | browser | NOT RUN | `[x]` |
| Tooling Readiness | gate | PASS | `[x]` |
| Backup Readiness | gate | PASS | `[x]` |
| P5-E.5 re-run | gate | PARTIAL | `[x]` |

**P5-STAGING.3 PASS.** Tooling + backup ready. P5-E.5 PARTIAL — testusers + explicit approval. No push/deploy.

**Next:** Testusers → P5-E.5 approval. **LAUNCH-0** required before any push/deploy.

---

## P5-STAGING.2 — Environment Proof & Dry Run

**Milestone:** P5-STAGING.2 — local proof + dry-run plan; no SQL, no DB mutation, no backup.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| `.env.staging` local | gitignored file | exists, not committed | `[x]` |
| Staging ref | `jzzgoiwfbuwiiyvwgwri` | ≠ `ohkoojpzmptdfyowdgog` | `[x]` |
| Staging URL/host | staging project | distinct from legacy | `[x]` |
| `CONFIRM_ISOLATED` | `.env.staging` | `true` | `[x]` |
| Anon key type | client key | `sb_publishable_*`; not secret | `[x]` |
| `.env.staging.example` | template | no real secrets | `[x]` |
| Supabase CLI | PATH | version or documented absent | `[x]` — not installed |
| `psql` | PATH | version or documented absent | `[x]` — not installed |
| Backup/dump | ops | not executed | `[x]` |
| SQL / RPC / data | ops | none | `[x]` |
| Environment Proof | gate | PASS | `[x]` |
| Dry Run Readiness | gate | PARTIAL (tooling) | `[x]` |
| P5-E.5 re-run | gate | blocked | `[x]` |

**P5-STAGING.2 environment proof PASS; dry-run readiness PARTIAL.** Staging identity isolated from `ohkoojpzmptdfyowdgog`. CLI/psql missing; backup untested. P5-E.5 remains blocked. No SQL, no data changes, no push/deploy. Product-Activation-Ready = FAIL; Public-Launch-Ready = NO-GO.

**Next:** Install CLI/psql → test backup → testusers → explicit P5-E.5 approval. **LAUNCH-0** required before any push/deploy.

---

## P5-STAGING.1 — Dedicated Supabase Staging Provisioning Gate

**Milestone:** P5-STAGING.1 docs-only — staging requirements plan; no SQL, no project creation, no secrets.

| Test | Target | Expected | Result |
|------|--------|----------|--------|
| P5-E.5 blocked documented | prior gate | isolated staging not proven | `[x]` |
| Staging plan | `p5-staging-environment-plan.md` | full checklist + re-entry criteria | `[x]` |
| Config example | `.env.staging.example` | empty placeholders only | `[x]` |
| `.env.staging` gitignored | `.gitignore` | not committed | `[x]` |
| Forbidden ref documented | `ohkoojpzmptdfyowdgog` | no P5-E.5 apply | `[x]` |
| SQL / DB / project creation | ops | none | `[x]` |
| Secrets committed | ops | none | `[x]` |

**P5-STAGING.1 staging environment plan created.** P5-E.5 remains BLOCKED until user provisions dedicated staging and P5-STAGING.2 passes. No SQL, no data changes, no push/deploy. Product-Activation-Ready = FAIL; Public-Launch-Ready = NO-GO.

**Next:** User creates Supabase staging project → **P5-STAGING.2 Environment Proof & Dry Run**. **LAUNCH-0** required before any push/deploy.

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
