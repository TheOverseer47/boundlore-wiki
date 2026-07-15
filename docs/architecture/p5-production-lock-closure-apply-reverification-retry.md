# P5-E.9G.8D-R1 — Production Lock Closure Apply Retry and Re-Verification

**Gate:** P5-E.9G.8D-R1  
**Date:** 2026-07-15  
**Target:** `ohkoojpzmptdfyowdgog` (TheOverseer47's Project)

---

## 1. Executive Result

**Final decision:** `STOP_APPLY_SEQUENCE_FAILED`

Supabase MCP connectivity restored. Git/SQL preflight **PASS**. Project identity **CONFIRMED**. Pre-apply catalog state matched expected 0/4 closure baseline.

**Applies executed:** **3 of 4**

| # | Migration | Result |
|---:|---|---|
| 1 | `p5_e9g8d_profile_role_integrity` | **SUCCESS** |
| 2 | `p5_e9g8d_content_policy_closure` | **SUCCESS** |
| 3 | `p5_e9g8d_observation_rpc_hardening` | **SUCCESS** |
| 4 | `p5_e9g8d_discovery_storage_lock` | **FAILED** — `ERROR 42501: must be owner of relation objects` |

Per gate stop rules: no repair, no rollback, no further applies attempted.

**Residual production bypass:** `discovery-uploads` storage INSERT remains release-unlocked (permissive `discovery_upload_authenticated` only).

---

## 2. Retry Reason

Prior gate P5-E.9G.8D (`f240672`) stopped at `STOP_SUPABASE_PROJECT_IDENTITY_UNPROVEN` because Supabase MCP was unavailable. Zero migrations were applied in that attempt.

R1 retry restored MCP access and re-ran the full preflight plus apply sequence against production project `ohkoojpzmptdfyowdgog`.

---

## 3. MCP Project Identity

| Check | Result |
|---|---|
| `list_projects` invoked | **YES** |
| Project ref | `ohkoojpzmptdfyowdgog` |
| Project name | TheOverseer47's Project |
| Staging ref `jzzgoiwfbuwiiyvwgwri` queried | **NO** |
| Identity verdict | **CONFIRMED** |

---

## 4. Git and SQL File Identity

### Git preflight

| Item | Expected | Actual | Result |
|---|---|---|---|
| Branch before gate | `review/p5-e9g8d-production-lock-closure-apply` | `review/p5-e9g8d-production-lock-closure-apply` | **MATCH** |
| HEAD | `f240672` | `f240672c097daeca4c777fc2df1298459da4aea7` | **MATCH** |
| Tracked modifications | none | none | **PASS** |

### Retry branch

| Item | Value |
|---|---|
| Branch created | `review/p5-e9g8d-r1-production-lock-closure-apply` |
| HEAD after switch | `f240672` |
| Push | **NOT PERFORMED** |

### SQL file hashes

| Order | File | Expected hash | Confirmed hash | Result |
|---:|---|---|---|---|
| 1 | `supabase/profile_role_integrity_hardening.sql` | `930af5b0d05c9c3834905be590017ca4bd3b563b` | `930af5b0d05c9c3834905be590017ca4bd3b563b` | **MATCH** |
| 2 | `supabase/release_gate_content_policy_closure.sql` | `4e1090840c703a49cae935b846b2bcf9b415dedd` | `4e1090840c703a49cae935b846b2bcf9b415dedd` | **MATCH** |
| 3 | `supabase/release_gate_observation_rpc_hardening.sql` | `2ebb98be5077b5832bfff8fb90986be0f0e78461` | `2ebb98be5077b5832bfff8fb90986be0f0e78461` | **MATCH** |
| 4 | `supabase/release_gate_storage_policy_deferred.sql` | `e41ab2d0a89944fe63f0d1ec01603fe35862cf4e` | `e41ab2d0a89944fe63f0d1ec01603fe35862cf4e` | **MATCH** |

Additional checks:

- `git diff --exit-code HEAD --` (four SQL files): **exit 0**
- `py -3 qa/p5-production-lock-closure-sql-check.py`: **PASS**

---

## 5. Migration History Preflight

Pre-apply migrations on `ohkoojpzmptdfyowdgog`:

- `p5_e9e5e_legacy_profile_rls_security_hardening`
- `p5_e9e5f_legacy_search_documents_schema`
- `p5_e9e5f_legacy_search_functions_rpc`
- `p5_e9g8b_release_gate_core`

Forbidden 8D names **absent** before apply:

- `p5_e9g8d_profile_role_integrity` — absent
- `p5_e9g8d_content_policy_closure` — absent
- `p5_e9g8d_observation_rpc_hardening` — absent
- `p5_e9g8d_discovery_storage_lock` — absent

**Preflight verdict:** **PASS**

Post-partial-apply migrations (3 recorded, 4th not recorded due to failure):

- `p5_e9g8d_profile_role_integrity` (20260715141118)
- `p5_e9g8d_content_policy_closure` (20260715141139)
- `p5_e9g8d_observation_rpc_hardening` (20260715141202)

---

## 6. Pre-Apply Catalog State

| Check | Expected | Observed | Result |
|---|---|---|---|
| `public.release_gate` present | yes | yes | **PASS** |
| Canonical row `id = 1` | exactly one | one row | **PASS** |
| `contribution_locked` | `true` | `true` | **PASS** |
| Lock helpers present | yes | `bl_can_create_user_content`, `bl_assert_can_create_user_content`, `bl_is_admin_actor` | **PASS** |
| Posts restrictive policies | present | `posts_release_gate_insert_restrictive`, `posts_release_gate_update_restrictive` | **PASS** |
| Reactions restrictive policies | present | `post_reactions_release_gate_insert_restrictive`, `post_reactions_release_gate_update_restrictive` | **PASS** |
| `trg_profiles_prevent_role_self_promotion` | absent | absent | **PASS** |
| `comments_release_gate_insert_restrictive` | absent | absent | **PASS** |
| `wiki_observations_release_gate_insert_restrictive` | absent | absent | **PASS** |
| `bl_register_observation` hardened | no | legacy body (auth only, no tutorial/lock assert) | **PASS** |
| `storage_discovery_uploads_release_gate_insert_restrictive` | absent | absent | **PASS** |

Content baseline counts (pre-apply): posts 26, comments 1, observations 2, profiles 4.

**Pre-apply verdict:** **MATCHES EXPECTED 0/4 STATE**

---

## 7. Apply 1 Result

**Migration:** `p5_e9g8d_profile_role_integrity`  
**Apply:** **SUCCESS**

Post-apply read-only verification:

| Check | Result |
|---|---|
| `bl_profiles_prevent_role_self_promotion()` present | **YES** |
| `trg_profiles_prevent_role_self_promotion` on `public.profiles` | **YES** (BEFORE UPDATE, enabled) |
| Non-admin role change blocked (trigger logic) | **YES** (catalog body match) |
| Non-role profile updates unaffected by trigger condition | **YES** (`role is distinct from old.role` guard) |
| Profile/role data mutated | **NO** (count 4 unchanged) |
| `contribution_locked` | **true** |

---

## 8. Apply 2 Result

**Migration:** `p5_e9g8d_content_policy_closure`  
**Apply:** **SUCCESS**

Post-apply read-only verification:

| Policy | RESTRICTIVE | INSERT | WITH CHECK | RLS |
|---|---|---|---|---|
| `comments_release_gate_insert_restrictive` | yes | yes | `bl_can_create_user_content(auth.uid())` | table RLS on |
| `wiki_observations_release_gate_insert_restrictive` | yes | yes | `bl_can_create_user_content(auth.uid())` | table RLS on |

Existing permissive INSERT policies retained (`comments_insert_auth`, `wiki_observations_insert_own`).

Content counts unchanged. `contribution_locked` remains **true**.

---

## 9. Apply 3 Result

**Migration:** `p5_e9g8d_observation_rpc_hardening`  
**Apply:** **SUCCESS**

Post-apply read-only verification:

| Check | Result |
|---|---|
| 10-parameter signature preserved | **YES** |
| Returns `jsonb` | **YES** |
| `SECURITY DEFINER` | **YES** |
| `search_path` | `public, pg_temp` |
| Auth gate (`auth.uid() is null`) | **YES** |
| Tutorial-ack gate | **YES** |
| Admin bypass via `bl_is_admin_actor` | **YES** |
| `bl_assert_can_create_user_content` before first write | **YES** |
| `authenticated` EXECUTE grant | **YES** |
| `contribution_locked` | **true** |

**Catalog note:** `has_function_privilege('anon', ...)` returns **true** (PostgreSQL default PUBLIC EXECUTE inheritance). Repository SQL grants only `authenticated`; no `REVOKE FROM PUBLIC` present. Function body rejects unauthenticated callers at runtime via `auth.uid() is null`.

`rpc_sync_discovery_submission` definition unchanged (admin path preserved).

---

## 10. Apply 4 Result

**Migration:** `p5_e9g8d_discovery_storage_lock`  
**Apply:** **FAILED**

```
ERROR 42501: must be owner of relation objects
```

No alternative role or manual SQL attempted per gate rules.

Post-failure catalog:

| Check | Result |
|---|---|
| `storage_discovery_uploads_release_gate_insert_restrictive` | **ABSENT** |
| `discovery_upload_authenticated` permissive policy | **PRESENT** (unchanged) |
| `report-screenshots` policies | **UNCHANGED** |
| Bucket metadata | **UNCHANGED** |
| Storage object counts | discovery-uploads 20, report-screenshots 0 (unchanged) |

---

## 11. Post-Apply Release-Gate State

| Check | Result |
|---|---|
| Table present | **YES** |
| Canonical row `id = 1` | **YES** |
| `contribution_locked` | **true** |
| Fail-closed (`bl_is_release_unlocked` missing/NULL/errors → false) | **YES** |
| Normal users can change lock | **NO** (`release_gate_admin_update` admin-only) |
| Parallel bypass on gate table | **NONE** |

---

## 12. Profile Role Integrity

| Check | Result |
|---|---|
| Trigger `trg_profiles_prevent_role_self_promotion` | **PRESENT** |
| Function `bl_profiles_prevent_role_self_promotion` | **PRESENT** |
| Self-promotion DB block | **APPLIED** |
| Normal non-role profile updates | **PRESERVED** |
| Admin path | **PRESERVED** via `bl_is_admin_actor` |
| Repository semantic match | **PRODUCTION_MATCHES_REPOSITORY_SQL** |

---

## 13. Direct Content Policies

| Path | RESTRICTIVE INSERT gate | Fail-closed helper | Parallel bypass |
|---|---|---|---|
| Comments INSERT | **APPLIED** | `bl_can_create_user_content` | **NONE** (restrictive AND with permissive) |
| Wiki observations INSERT | **APPLIED** | `bl_can_create_user_content` | **NONE** |

---

## 14. Observation RPC

| Check | Result |
|---|---|
| Internally locked when `contribution_locked = true` | **YES** (`bl_assert_can_create_user_content`) |
| Tutorial-ack enforced | **YES** |
| SECURITY DEFINER bypass closed | **YES** (gates before writes) |
| Repository semantic match | **PRODUCTION_SEMANTIC_MATCH_WITH_CATALOG_NORMALIZATION** (PUBLIC EXECUTE catalog inheritance) |

---

## 15. Discovery Storage Lock

| Check | Result |
|---|---|
| Restrictive policy applied | **NO** |
| Path scoping (`discovery_upload_authenticated`) | **PRESENT** (UID prefix) |
| Release-lock on discovery-uploads INSERT | **NOT APPLIED** |
| Parallel bypass | **YES** — permissive INSERT without restrictive companion |
| Bucket/object mutation | **NONE** |

**Verdict:** **NOT APPLIED — CORE BYPASS REMAINS**

---

## 16. Parallel Policy Analysis

Applied closure paths show expected restrictive+permissive pairing without bypass:

- Posts, post_reactions, comments, wiki_observations release-gate restrictive policies coexist with legacy permissive policies; restrictive policies require `bl_can_create_user_content`.

Storage `discovery-uploads` remains bypassable:

- Only permissive `discovery_upload_authenticated` governs INSERT.
- Intended restrictive `storage_discovery_uploads_release_gate_insert_restrictive` not created.

---

## 17. Repository / Production Comparison

| Artifact | Comparison result |
|---|---|
| Profile trigger + function | **MATCH** |
| Comments INSERT restrictive policy | **MATCH** |
| Wiki observations INSERT restrictive policy | **MATCH** |
| `bl_register_observation` body/gates | **SEMANTIC MATCH** (catalog whitespace/PUBLIC grant normalization) |
| Storage restrictive policy | **NOT APPLIED** — production diverges from repository intent |

**Overall:** **PRODUCTION_LOCK_CLOSURE_REVERIFY_FAIL** for full closure package (3/4 applied).

---

## 18. Content Integrity

| Dataset | Pre-apply | Post-partial-apply | Mutated |
|---|---|---:|---|
| Posts | 26 | 26 | **NO** |
| Comments | 1 | 1 | **NO** |
| Wiki observations | 2 | 2 | **NO** |
| Profiles | 4 | 4 | **NO** |
| Discovery storage objects | 20 | 20 | **NO** |

**Verdict:** **NO_EXISTING_CONTENT_MUTATION_OBSERVED**

---

## 19. Explicitly Out-of-Scope Paths

Unchanged and intentionally not gated in this sequence:

- Comments UPDATE/DELETE
- Reports and report-screenshots storage
- Runtime denied-write probes
- Lock toggle
- `rpc_sync_discovery_submission` admin pipeline

---

## 20. No-Mutation-Test Limitation

`NO_MUTATION_RUNTIME_PROBE_BY_DESIGN`

Evidence based solely on catalog reads (policies, functions, triggers, grants, constraints, lock state, row counts). No test INSERT/UPDATE/DELETE, RPC invocation, or storage upload performed.

---

## 21. Final Decision

### `STOP_APPLY_SEQUENCE_FAILED`

Apply 4 failed with ownership error on `storage.objects`. Sequence halted per gate rules. Production remains partially hardened (3/4) with discovery-uploads storage INSERT as residual bypass.

---

## 22. Commands and Queries Executed

### Git

```text
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
git remote -v
git branch --list review/p5-e9g8d-r1-production-lock-closure-apply
git switch -c review/p5-e9g8d-r1-production-lock-closure-apply
git hash-object (four SQL files)
git diff --exit-code HEAD -- (four SQL files)
py -3 qa/p5-production-lock-closure-sql-check.py
```

### Supabase MCP (project `ohkoojpzmptdfyowdgog` only)

```text
list_projects
list_migrations (pre/post)
apply_migration p5_e9g8d_profile_role_integrity
apply_migration p5_e9g8d_content_policy_closure
apply_migration p5_e9g8d_observation_rpc_hardening
apply_migration p5_e9g8d_discovery_storage_lock (FAILED)
execute_sql SELECT-only catalog queries (release_gate, policies, triggers, functions, grants, buckets, object counts)
```

---

## 23. Files Changed

| File | Change |
|---|---|
| `docs/architecture/p5-production-lock-closure-apply-reverification-retry.md` | **ADDED** (this document) |

No SQL source files modified.

---

## 24. No-Reset / No-Seed / No-Content-Write / No-Push / No-Deploy Attestation

| Boundary | Status |
|---|---|
| Reset / seed / test data import | **NOT PERFORMED** |
| Product content write probes | **NOT PERFORMED** |
| Lock toggle (`contribution_locked = false`) | **NOT PERFORMED** |
| Ad hoc repair SQL | **NOT PERFORMED** |
| Rollback | **NOT PERFORMED** |
| Git push | **NOT PERFORMED** |
| Deploy / launch / route cutover | **NOT PERFORMED** |
| Staging project access | **NOT PERFORMED** |
