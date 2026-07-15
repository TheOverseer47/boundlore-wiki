# P5-E.9G.8C — Production Lock Closure SQL Authoring

**Gate:** P5-E.9G.8C  
**Date:** 2026-07-15  
**Method:** Read-only production catalog + local SQL authoring + static verification only

---

## 1. Executive Result

**Final decision:** `CONDITIONALLY_READY_FOR_PRODUCTION_LOCK_CLOSURE_APPLY_AUTHORIZATION_GATE`

Four narrowly scoped, idempotent SQL files were authored for the remaining production release-lock bypass paths. Static QA **PASS**. No SQL was applied to production.

Conditional items (documented, non-blocking for apply-package readiness):

- Comments/Observations **UPDATE/DELETE** intentionally unchanged
- `report-screenshots` and `reports` remain outside contribution lock
- No live mutation-denial runtime test in this gate

---

## 2. Scope and No-Apply Boundary

| Action | Performed |
|---|---|
| Production catalog read (SELECT) | Yes |
| SQL file authoring (local) | Yes |
| SQL apply / migration | **No** |
| RPC execution | **No** |
| Content/storage mutation | **No** |

---

## 3. Git Baseline

| Item | Value |
|---|---|
| Branch before gate | `review/p5-e9g8b-production-release-lock-apply` |
| Branch after gate | `review/p5-e9g8c-production-lock-closure-sql` |
| Baseline commit | `90d98a7` — Apply and verify production release lock |
| Authoring commit | (pending) |

---

## 4. Production Project Identity

| Check | Result |
|---|---|
| Project ref | `ohkoojpzmptdfyowdgog` |
| Staging excluded | Yes (`jzzgoiwfbuwiiyvwgwri` not queried for apply) |

---

## 5. Current Production Lock State

| Check | Production evidence |
|---|---|
| `release_gate` present | Yes |
| Canonical row `id = 1` | Yes |
| `contribution_locked` | **true** |
| Fail-closed helpers | `bl_is_release_unlocked`, `bl_can_create_user_content`, `bl_assert_can_create_user_content` |
| Posts/reactions restrictive policies | Present |
| Product content rows | Unchanged by prior apply |

---

## 6. Remaining Bypass Paths (Pre-Authoring)

1. `bl_register_observation` — no tutorial-ack or release-lock assert
2. `comments` INSERT — no restrictive release policy
3. `wiki_observations` INSERT — no restrictive release policy
4. `discovery-uploads` storage INSERT — path-scoped only
5. `profiles.role` — self-promotion not DB-blocked (no triggers)

---

## 7. Production Catalog Evidence Used

**PRODUCTION CATALOG EVIDENCE** from `ohkoojpzmptdfyowdgog`:

- `bl_register_observation` signature: 10 text/jsonb args, returns `jsonb`, SECURITY DEFINER
- Tutorial ack on posts: `user_submission_acks` OR `profiles.role = admin`
- Policies: `comments_insert_auth`, `wiki_observations_insert_own` (no release gate)
- `profiles.role`: text, default `'user'`, UPDATE granted to authenticated
- No triggers on `profiles`
- Storage: `discovery_upload_authenticated` without release-lock restrictive policy

---

## 8. Repository Helpers and Existing Semantics

From `main:supabase/release_gate_lock.sql` (already applied to production):

- `bl_is_admin_actor(uuid)` — fail-closed admin check
- `bl_can_create_user_content(uuid)` — lock + admin bypass
- `bl_assert_can_create_user_content(text)` — raises `42501` when locked
- Restrictive posts/post_reactions policies pattern

Tutorial-ack semantics aligned with production `posts_insert_requires_tutorial_ack` and `main:supabase/phase_a_observations_foundation.sql`.

RPC body aligned with production/`main:supabase/phase_a_fix_discovery_guide_subcategory.sql` (`guide_subcategory = null` for discovery posts).

---

## 9. Observation RPC Hardening Design

**File:** `supabase/release_gate_observation_rpc_hardening.sql`  
**Hash:** `2ebb98be5077b5832bfff8fb90986be0f0e78461`

| Requirement | Implementation |
|---|---|
| Signature preserved | Exact 10-parameter `bl_register_observation` |
| Returns `jsonb` | Unchanged return object |
| SECURITY DEFINER | Retained (cross-table writes) |
| `search_path` | `public, pg_temp` |
| Gate order | Auth → tutorial-ack → `bl_assert_can_create_user_content` → validation → writes |
| Tutorial ack | `user_submission_acks` OR `bl_is_admin_actor` |
| Release lock | `perform bl_assert_can_create_user_content('bl_register_observation')` before first INSERT |
| Grants | `authenticated` only |

---

## 10. Direct Content Policy Closure

**File:** `supabase/release_gate_content_policy_closure.sql`  
**Hash:** `4e1090840c703a49cae935b846b2bcf9b415dedd`

| Table | Operation | Policy | Semantics |
|---|---|---|---|
| `comments` | INSERT | `comments_release_gate_insert_restrictive` | RESTRICTIVE, `bl_can_create_user_content(auth.uid())` |
| `wiki_observations` | INSERT | `wiki_observations_release_gate_insert_restrictive` | RESTRICTIVE, same helper |

**Intentionally not authored:** comments/observations UPDATE/DELETE restrictive policies — product intent for edit/delete during lock not proven; new-user-content INSERT is the activation risk.

---

## 11. Profile Role Integrity Design

**File:** `supabase/profile_role_integrity_hardening.sql`  
**Hash:** `930af5b0d05c9c3834905be590017ca4bd3b563b`

| Element | Design |
|---|---|
| Mechanism | `BEFORE UPDATE` trigger `trg_profiles_prevent_role_self_promotion` |
| Function | `bl_profiles_prevent_role_self_promotion()` SECURITY DEFINER |
| Normal users | Cannot change `role` column (raises `42501`) |
| Admin path | `bl_is_admin_actor(auth.uid())` may change `role` |
| Other profile fields | Unrestricted by this file |
| Recursion risk | Trigger uses `bl_is_admin_actor` (SECURITY DEFINER), not RLS subquery on self-update |

---

## 12. Storage Policy Review

**File:** `supabase/release_gate_storage_policy_deferred.sql`  
**Hash:** `e41ab2d0a89944fe63f0d1ec01603fe35862cf4e`

**Verdict:** `STORAGE_HARDENING_FILE_READY`

- Target: `storage.objects` INSERT only
- Bucket guard: `bucket_id <> 'discovery-uploads' OR bl_can_create_user_content(...)`
- Preserves existing `discovery_upload_authenticated` UID-prefix permissive policy
- No bucket/object/metadata mutation
- No `report-screenshots` policy changes

---

## 13. Exact Future Apply Manifest

| Order | File | Hash | Objects | Static review |
|---:|---|---|---|---|
| 1 | `profile_role_integrity_hardening.sql` | `930af5b0…` | trigger + trigger function on `profiles` | PASS |
| 2 | `release_gate_content_policy_closure.sql` | `4e109084…` | 2 restrictive INSERT policies | PASS |
| 3 | `release_gate_observation_rpc_hardening.sql` | `2ebb98be…` | `bl_register_observation` replace + grant | PASS |
| 4 | `release_gate_storage_policy_deferred.sql` | `e41ab2d0…` | storage restrictive INSERT policy | PASS |

**Precondition for all:** `release_gate_lock.sql` already applied (`p5_e9g8b_release_gate_core`).

---

## 14. Apply Order

1. Profile role trigger first — secures admin-bypass integrity before other paths rely on `profiles.role`
2. Content restrictive policies — closes direct INSERT bypasses
3. Observation RPC — closes DEFINER bypass (depends on helpers + tutorial table)
4. Storage deferred policy — requires `bl_can_create_user_content` and storage owner-capable path

---

## 15. Idempotency Assessment

| File | Method |
|---|---|
| Profile | `CREATE OR REPLACE FUNCTION` + `DROP TRIGGER IF EXISTS` |
| Content | `DROP POLICY IF EXISTS` (owned names) + `CREATE POLICY` |
| RPC | `CREATE OR REPLACE FUNCTION` + `GRANT` |
| Storage | `DROP POLICY IF EXISTS` + `CREATE POLICY` |

Re-apply safe: no duplicate policies/triggers; no product data writes.

---

## 16. Static Safety Assessment

| Check | Result |
|---|---|
| Product data INSERT/UPDATE/DELETE (DDL files) | **None** (RPC function body writes only inside replaced function) |
| `contribution_locked = false` | **Absent** |
| Foundation DDL | **Absent** in new files |
| Broad grants | **Absent** |
| Staging ref | **Absent** |
| Secrets/UUIDs | **Absent** |

`qa/p5-production-lock-closure-sql-check.py`: **PASS**

---

## 17. Expected Post-Apply Catalog State

| Object | Expected |
|---|---|
| `trg_profiles_prevent_role_self_promotion` | Present on `profiles` |
| `comments_release_gate_insert_restrictive` | RESTRICTIVE INSERT on `comments` |
| `wiki_observations_release_gate_insert_restrictive` | RESTRICTIVE INSERT on `wiki_observations` |
| `bl_register_observation` | Contains tutorial-ack + `bl_assert_can_create_user_content` before writes |
| `storage_discovery_uploads_release_gate_insert_restrictive` | RESTRICTIVE INSERT on `storage.objects` |

---

## 18. Expected Lock Coverage Matrix

| Write path | Expected after full apply |
|---|---|
| Posts INSERT/UPDATE | BLOCKED_WHEN_LOCKED (already) |
| Reactions | BLOCKED_WHEN_LOCKED (already) |
| Comments INSERT | BLOCKED_WHEN_LOCKED |
| Direct observations INSERT | BLOCKED_WHEN_LOCKED |
| `bl_register_observation` | BLOCKED_WHEN_LOCKED |
| Discovery upload | BLOCKED_WHEN_LOCKED |
| Admin self-promotion | BLOCKED (non-admin) |
| Report screenshots | INTENTIONALLY_ALLOWED |
| Reports | INTENTIONALLY_ALLOWED |
| Comments UPDATE/DELETE | INTENTIONALLY_ALLOWED (own content) |

---

## 19. Explicitly Out-of-Scope Paths

- `report-screenshots` uploads
- `reports` INSERT
- `rpc_sync_discovery_submission` (admin-only)
- Comments/observations UPDATE/DELETE during lock
- Product activation / public launch authorization

---

## 20. Rollback Basis

Revert via migration rollback or:

1. Drop authored policies by exact name
2. `CREATE OR REPLACE` prior `bl_register_observation` from pre-apply catalog snapshot
3. Drop trigger `trg_profiles_prevent_role_self_promotion` and function

`release_gate` core remains locked; rollback of closure files does not unlock contribution by itself.

---

## 21. Static QA Results

| Check | Result |
|---|---|
| `p5-production-lock-closure-sql-check.py` | **PASS** |
| `p5-cloudflare-pages-function-check.py` | **PASS** |
| `p5-cloudflare-pages-routing-static-check.py` | **PASS** |
| `p5-entity-routes-check.py` | **PASS** |
| `p5-entity-link-migration-check.py` | **PASS** |
| `local-ssg-route-preview.py --test` | **PASS** |
| `p5-search-recall-static-check.py` | **PASS** |
| Runtime config unchanged | **PASS** (no diff on `js/supabase-config.js`, `functions/`, routing) |

---

## 22. Residual Risks

- No live mutation-denial test (`NO_MUTATION_RUNTIME_PROBE_BY_DESIGN`)
- Comments/observation UPDATE/DELETE not release-gated
- Storage apply may require storage.objects owner-capable execution path (historical P5-E.5C note)
- Service-role direct SQL paths not evaluated in this gate

---

## 23. Final Decision

### `CONDITIONALLY_READY_FOR_PRODUCTION_LOCK_CLOSURE_APPLY_AUTHORIZATION_GATE`

SQL apply package is complete, narrowly scoped, idempotent, and statically verified. Conditional qualifiers:

- UPDATE/DELETE semantics for comments/observations intentionally deferred
- Moderation paths (`report-screenshots`, `reports`) remain outside contribution lock
- Runtime write-denial proof deferred to post-apply verification gate

---

## 24. Commands and Read-only Queries Executed

### Git

```text
git status --short
git branch --show-current
git rev-parse HEAD
git switch -c review/p5-e9g8c-production-lock-closure-sql
git hash-object supabase/*.sql
```

### Supabase MCP (SELECT only, project `ohkoojpzmptdfyowdgog`)

- Function metadata for `bl_register_observation`, lock helpers
- `pg_policies` for comments, wiki_observations, profiles, storage.objects
- `information_schema.columns` for profiles.role
- Profile triggers (none pre-apply)
- Column privileges on profiles.role
- `posts_insert_requires_tutorial_ack` with_check text

### Static QA

```text
py -3 qa/p5-production-lock-closure-sql-check.py
py -3 qa/p5-cloudflare-pages-function-check.py
py -3 qa/p5-cloudflare-pages-routing-static-check.py
py -3 qa/p5-entity-routes-check.py
py -3 qa/p5-entity-link-migration-check.py
py -3 qa/local-ssg-route-preview.py --test
py -3 qa/p5-search-recall-static-check.py
```

---

## 25. Files Changed

| File | Action |
|---|---|
| `supabase/profile_role_integrity_hardening.sql` | Created |
| `supabase/release_gate_content_policy_closure.sql` | Created |
| `supabase/release_gate_observation_rpc_hardening.sql` | Created |
| `supabase/release_gate_storage_policy_deferred.sql` | Created |
| `qa/p5-production-lock-closure-sql-check.py` | Created |
| `docs/architecture/p5-production-lock-closure-sql-authoring.md` | Created |

---

## 26. No-Apply / No-Write / No-Push / No-Deploy Attestation

| Action | Performed |
|---|---|
| SQL apply to production | **No** |
| RPC/storage/content mutation | **No** |
| Git push | **No** |
| Deploy / launch | **No** |

---

*Gate P5-E.9G.8C — SQL authoring complete, apply not authorized.*
