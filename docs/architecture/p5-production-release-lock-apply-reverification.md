# P5-E.9G.8B — Production Release-Lock Apply and Re-Verification

**Gate:** P5-E.9G.8B  
**Date:** 2026-07-15  
**Target:** `ohkoojpzmptdfyowdgog` (production only)

---

## 1. Executive Result

**Final decision:** `PRODUCTION_RELEASE_LOCK_APPLY_AND_REVERIFY_PARTIAL`

Apply 1 (release-gate core from `main:supabase/release_gate_lock.sql`) **succeeded**. Production now has a canonical locked `release_gate` row (`contribution_locked = true`), fail-closed helpers, posts/post_reactions restrictive policies, and admin-only lock mutation.

Apply 2 (RPC hardening) **not executed** — `STOP_RPC_HARDENING_FILE_NOT_IDENTIFIED`.  
Apply 3 (storage hardening) **not executed** — blocked because Phase 11 did not pass.

**Critical residual bypass:** `bl_register_observation` remains `SECURITY DEFINER` without tutorial-ack or `bl_assert_can_create_user_content` and can still write observations/posts while locked. Comments, direct observation INSERT, and `discovery-uploads` storage are also not release-gated in production policies.

Evidence: catalog/policy/function-definition only — `NO_MUTATION_RUNTIME_PROBE_BY_DESIGN`.

---

## 2. Authorized Scope

| Allowed | Performed |
|---|---|
| Release-gate DDL + helpers + RLS | Apply 1 — yes |
| Posts/post_reactions restrictive policies | Apply 1 — yes |
| RPC `bl_register_observation` hardening | **Blocked** — no eligible dedicated file |
| Storage `discovery-uploads` release policy | **Not run** |
| Profile/role hardening | **Out of scope** — not applied |
| Content data mutation | **None** (only canonical lock config row insert) |

---

## 3. Safety Boundaries

- **Project:** `ohkoojpzmptdfyowdgog` only; staging `jzzgoiwfbuwiiyvwgwri` not touched
- **No** reset, seed, test user, login, lock unlock, storage upload/delete, RPC mutation probe
- **No** ad hoc SQL; **no** repository SQL file edits
- **No** push, deploy, runtime switch, launch

---

## 4. Git Baseline

| Item | Value |
|---|---|
| Branch before gate | `review/p5-e9g8a-production-backend-lock` |
| Branch after gate | `review/p5-e9g8b-production-release-lock-apply` |
| Baseline commit | `b8e80c9` — Verify production backend lock read only |
| Review commit | (pending commit of this document) |
| Tracked changes | This document only |

Untracked local artifacts (not touched): `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json`, plus `.env.legacy`, `.env.staging`, `backups/`, QA export fixtures.

**Note:** Release-lock SQL source files exist on local `main` branch (commits through `5ee454e`) but are **not** tracked on review-branch HEAD `b8e80c9`. Applies used verified blob content from `main:supabase/…`.

---

## 5. Supabase Project Identity

| Check | Result |
|---|---|
| Project ref | `ohkoojpzmptdfyowdgog` |
| Confirmed before apply | Yes |
| Staging excluded | Yes |

---

## 6. P5-E.9G.8A Starting Findings

Pre-apply state matched 8A:

- `public.release_gate` **missing**
- No release-lock policies on posts
- `bl_register_observation` without internal lock assert
- `discovery-uploads` path-scoped but not release-locked
- Fail-closed semantics **not implemented**

---

## 7. SQL File Discovery

`git grep` on review-branch `supabase/` tracked files found only `discovery-uploads` references in `discovery_storage.sql`.

Full inventory on local `main` branch:

| File | Blob hash (`git rev-parse main:…`) | Role |
|---|---|---|
| `supabase/release_gate_lock.sql` | `7cad4fb66b5670eb715ba5ee220897c55da9a2d6` | Release-gate core — **APPROVED Apply 1** |
| `supabase/phase_a_observations_foundation.sql` | `c81c62a2a20612bcde38feda174dc38c98928e51` | Contains hardened `bl_register_observation` — **REJECTED** (`STOP_SQL_SCOPE_AMBIGUITY`: tables, indexes, `alter table posts`, broad foundation) |
| `supabase/phase_a_fix_discovery_guide_subcategory.sql` | `85ca6e9ce11242950480666f692865882875b1de` | Narrow RPC replace only — **REJECTED** (no tutorial-ack, no release-lock assert; would not harden) |
| `supabase/release_gate_storage_policy_deferred.sql` | `13d98103f1fc2b2628fbd624968dfd388a1f0ec0` | Storage restrictive policy — **APPROVED for Apply 3** but not run |

**RPC hardening verdict:** `STOP_RPC_HARDENING_FILE_NOT_IDENTIFIED` — no repository file is both narrowly scoped **and** contains tutorial-ack + `bl_assert_can_create_user_content` in `bl_register_observation`.

---

## 8. Exact Apply Manifest

| Order | Repository file | Git blob | Objects | Apply result |
|---:|---|---|---|---|
| 1 | `main:supabase/release_gate_lock.sql` | `7cad4fb6…` | `release_gate`, `release_gate_audit`, `bl_is_admin_actor`, `bl_is_release_unlocked`, `bl_can_*`, `bl_assert_can_create_user_content`, `bl_set_release_gate_locked`, posts/post_reactions restrictive policies, grants | **PASS** (migration `p5_e9g8b_release_gate_core`) |
| 2 | RPC hardening | — | `bl_register_observation` | **NOT RUN** — `STOP_RPC_HARDENING_FILE_NOT_IDENTIFIED` |
| 3 | `main:supabase/release_gate_storage_policy_deferred.sql` | `13d98103…` | `storage_discovery_uploads_release_gate_insert_restrictive` | **NOT RUN** — Phase 11 prerequisite failed |

**Apply 1 drift note:** Applied migration matches structural DDL/grants/policies from repo file; `COMMENT ON` statements from the repo file were omitted in the MCP migration payload (cosmetic only).

---

## 9. SQL Static Safety Review

### `release_gate_lock.sql` (Apply 1)

| Check | Result |
|---|---|
| `contribution_locked = true` seed | Yes — allowed canonical locked config |
| `contribution_locked = false` | **Absent** |
| Content DELETE/UPDATE/TRUNCATE | **None** |
| Profile role changes | **None** |
| Fail-closed missing row | Yes — `bl_is_release_unlocked` returns false |
| Idempotent | Yes — `IF NOT EXISTS`, `CREATE OR REPLACE`, `ON CONFLICT DO NOTHING` |
| Storage objects mutation | **None** (deferred in file) |

### `phase_a_observations_foundation.sql` (rejected)

- Contains `create table`, `alter table posts`, indexes, triggers — **STOP_SQL_SCOPE_AMBIGUITY**

### `phase_a_fix_discovery_guide_subcategory.sql` (rejected for hardening)

- Only `CREATE OR REPLACE bl_register_observation` + grant
- **Missing** tutorial-ack and `bl_assert_can_create_user_content` — insufficient for gate objective

### `release_gate_storage_policy_deferred.sql` (approved, not run)

- Single restrictive INSERT policy on `storage.objects` for `discovery-uploads`
- No object/path mutation

---

## 10. Pre-Apply Catalog State

| Check | Before apply |
|---|---|
| `release_gate` exists | **false** |
| `contribution_locked` | N/A |
| Posts release-lock policies | **Absent** |
| `bl_assert_can_create_user_content` | **Absent** |
| `bl_register_observation` lock assert | **Absent** |
| Storage release-lock policy | **Absent** |

Consistent with P5-E.9G.8A — no `STOP_PRODUCTION_STATE_CHANGED_SINCE_REVIEW`.

---

## 11. Release-Gate Core Apply

**Migration:** `p5_e9g8b_release_gate_core` on `ohkoojpzmptdfyowdgog` — **success**

Post-apply immediate checks:

| Check | Result |
|---|---|
| `release_gate` table | **Present** |
| Canonical rows | **1** (`id = 1`) |
| `contribution_locked` | **true** |
| `lock_version` | **1** |
| `release_gate` RLS | **Enabled** |
| `release_gate_admin_update` | Admin-only (`bl_is_admin_actor`) |
| `posts_release_gate_insert_restrictive` | **Present** (RESTRICTIVE) |
| `posts_release_gate_update_restrictive` | **Present** (RESTRICTIVE) |
| `post_reactions_release_gate_*` | **Present** |

**Phase 10 verdict:** **PASS**

---

## 12. RPC Hardening Apply

**Status:** **NOT RUN**

**Stop reason:** `STOP_RPC_HARDENING_FILE_NOT_IDENTIFIED`

| Candidate | Why rejected |
|---|---|
| `phase_a_fix_discovery_guide_subcategory.sql` | Narrow scope but **no** tutorial-ack / release-lock assert |
| `phase_a_observations_foundation.sql` | Has correct RPC body but **STOP_SQL_SCOPE_AMBIGUITY** (foundation DDL beyond RPC) |

Applying `phase_a_fix` would **not** remediate the bypass; applying full foundation exceeds authorized scope.

---

## 13. Storage Hardening Apply

**Status:** **NOT RUN** (Phase 11 did not pass)

`release_gate_storage_policy_deferred.sql` remains approved in manifest but unapplied. `discovery-uploads` still has only `discovery_upload_authenticated` (path-scoped, no release lock).

`report-screenshots` intentionally untouched (moderation path; no repo release-lock policy).

---

## 14. Post-Apply Release-Gate State

| Check | After apply |
|---|---|
| Table present | **YES** |
| Canonical row | **YES** (`id = 1`) |
| Currently locked | **YES** (`contribution_locked = true`) |
| Default locked | **YES** (column default `true`) |
| Missing row fail-closed | **YES** (helpers return locked) |
| Normal users can mutate lock | **NO** (admin UPDATE policy only; no user INSERT policy) |

---

## 15. Post-Apply RLS and Policy Evidence

| Write path | Release-lock policy | Result |
|---|---|---|
| `posts` INSERT | `posts_release_gate_insert_restrictive` | **BLOCKED_WHEN_LOCKED** |
| `posts` UPDATE | `posts_release_gate_update_restrictive` | **BLOCKED_WHEN_LOCKED** (non-admin) |
| `post_reactions` INSERT/UPDATE | restrictive policies | **BLOCKED_WHEN_LOCKED** |
| `comments` INSERT | **None** | **BYPASS_FOUND** |
| `wiki_observations` INSERT | **None** | **BYPASS_FOUND** |
| `reports` INSERT | **None** | **INTENTIONALLY_ALLOWED** (moderation) |

No second permissive posts INSERT policy bypasses restrictive gate (permissive tutorial/verified policies still require restrictive lock to pass).

---

## 16. RPC Function-Definition Evidence

### `bl_register_observation`

| Check | After apply |
|---|---|
| Security mode | SECURITY DEFINER |
| Auth check | Yes |
| Tutorial-ack check | **NO** |
| `bl_assert_can_create_user_content` | **NO** |
| Writes while locked | **YES** — inserts `wiki_observations`, `posts` via DEFINER |
| Execute (authenticated) | **YES** |

**Result:** **FAIL** — lock bypass remains

### `rpc_sync_discovery_submission`

| Check | After apply |
|---|---|
| Admin required | Yes (unchanged) |
| Release-lock assert | N/A (admin pipeline) |

**Result:** **PASS** for contribution-lock scope

---

## 17. Storage Policy Evidence

| Bucket | Path scoped | Release locked | Result |
|---|---|---|---|
| `discovery-uploads` | Yes (uid prefix) | **NO** | **PATH_SCOPED_BUT_NOT_RELEASE_LOCKED** |
| `report-screenshots` | No (bucket-wide auth) | **NO** | **INTENTIONALLY_ALLOWED** (moderation) |

Deferred policy `storage_discovery_uploads_release_gate_insert_restrictive` **not applied**.

---

## 18. Fail-Closed Assessment

| Scenario | After apply |
|---|---|
| Missing `release_gate` row | Helpers return locked — **FAIL_CLOSED_PROVEN** |
| NULL `contribution_locked` | Treated as locked via `coalesce(v_locked, true)` — **FAIL_CLOSED_PROVEN** |
| DB error in helper | Exception path returns false — **FAIL_CLOSED_PROVEN** |
| Policy layer (posts) | Restrictive `bl_can_create_user_content` — **FAIL_CLOSED_PROVEN** |
| RPC `bl_register_observation` | No lock consult — **FAIL_OPEN_RISK** |
| Comments / direct observations | No lock policies — **FAIL_OPEN_RISK** |
| Storage discovery | No restrictive policy — **FAIL_OPEN_RISK** |

**Gesamturteil:** **FAIL_CLOSED_PARTIAL**

---

## 19. Admin Role Integrity

| Check | Result |
|---|---|
| Admin via `profiles.role` | Yes — `bl_is_admin_actor` |
| `profiles_update_own` | Present — no explicit `role` immutability in policy catalog |
| Triggers on `profiles` | **None** |
| Self-promotion risk | **NOT PROVEN WITHOUT MUTATION TEST** |

**Verdict:** `ADMIN_ROLE_INTEGRITY_PARTIAL`

Admin bypass for lock mutation is policy-bound; self-promotion risk from 8A **remains unresolved** (out of scope for this gate).

---

## 20. Lock Coverage Matrix

| Write path | Lock enforcement | Fail-closed | Parallel bypass | Result |
|---|---|---|---|---|
| posts INSERT | RLS restrictive | Yes | No | **BLOCKED_WHEN_LOCKED** |
| posts UPDATE | RLS restrictive | Yes | No | **BLOCKED_WHEN_LOCKED** |
| comments INSERT | None | No | N/A | **BYPASS_FOUND** |
| wiki_observations INSERT | None | No | N/A | **BYPASS_FOUND** |
| `bl_register_observation` | None internal | No | DEFINER bypasses RLS | **BYPASS_FOUND** |
| `rpc_sync_discovery_submission` | Admin-only | N/A | N/A | **ADMIN_ONLY** |
| discovery upload | None | No | N/A | **BYPASS_FOUND** |
| report screenshot upload | None | N/A | N/A | **INTENTIONALLY_ALLOWED** |
| post_reactions | RLS restrictive | Yes | No | **BLOCKED_WHEN_LOCKED** |
| reports INSERT | None | N/A | N/A | **INTENTIONALLY_ALLOWED** |
| lock-state mutation | Admin UPDATE + RPC | Yes | No | **ADMIN_ONLY** |

---

## 21. Repository / Production Drift

| Area | Verdict |
|---|---|
| Release-gate core DDL | **PRODUCTION_PARTIAL_MATCH** (comments omitted) |
| Helper functions | **PRODUCTION_MATCHES_APPLIED_REPOSITORY_SQL** |
| Posts/post_reactions policies | **PRODUCTION_MATCHES_APPLIED_REPOSITORY_SQL** |
| RPC `bl_register_observation` | **MIXED_SCHEMA_DRIFT_REMAINS** (repo hardened version not applied) |
| Storage deferred policy | **MIXED_SCHEMA_DRIFT_REMAINS** (not applied) |

---

## 22. Content Integrity

Static review of applied SQL: **no** posts/comments/observations/profiles/storage-object UPDATE/DELETE/TRUNCATE.

Only data write: canonical `INSERT INTO release_gate (id, contribution_locked, reason) VALUES (1, true, …) ON CONFLICT DO NOTHING`.

Aggregate counts after apply (supporting, not proof): posts **26**, comments **1**, observations **2** — no evidence of mass mutation from DDL.

**Verdict:** `NO_CONTENT_MUTATION_BY_APPLIED_SQL_PROVEN_STATICALLY`

---

## 23. Residual Risks

1. **`bl_register_observation` bypass** — primary discovery activation path while locked
2. **Comments / direct observations** — no release-lock restrictive policies in repo core file
3. **Discovery storage uploads** — deferred policy not applied
4. **Admin self-promotion** — not hardened (8A carry-over)
5. **No runtime mutation denial test**

---

## 24. Production Route Cutover Impact

Minimal route candidate `0d8fc02` still uses production ref `ohkoojpzmptdfyowdgog`. Apply 1 improves direct-post lock but **does not** close RPC/storage/comments bypasses.

**Production route cutover authorization:** **NOT AUTHORIZED**  
**Product activation:** **FAIL**

---

## 25. Final Decision

### `PRODUCTION_RELEASE_LOCK_APPLY_AND_REVERIFY_PARTIAL`

**Satisfied:**

- Correct project; Apply 1 from vetted repo SQL
- Release gate present and **locked**
- Fail-closed helpers and posts/post_reactions policies
- No content mutation by applied SQL

**Not satisfied (open):**

- `STOP_RPC_HARDENING_FILE_NOT_IDENTIFIED` — Apply 2 not run
- Apply 3 storage not run
- `bl_register_observation`, comments, observations, discovery uploads still bypass
- `ADMIN_ROLE_INTEGRITY_PARTIAL`
- `NO_MUTATION_RUNTIME_PROBE_BY_DESIGN`

---

## 26. Commands and Queries Executed

### Git

```text
git status --short
git branch --show-current
git rev-parse HEAD
git switch -c review/p5-e9g8b-production-release-lock-apply
git rev-parse main:supabase/release_gate_lock.sql
git rev-parse main:supabase/phase_a_fix_discovery_guide_subcategory.sql
git rev-parse main:supabase/phase_a_observations_foundation.sql
git rev-parse main:supabase/release_gate_storage_policy_deferred.sql
```

### Supabase MCP

- `list_projects` — identity
- `apply_migration` — `p5_e9g8b_release_gate_core` on `ohkoojpzmptdfyowdgog`
- `execute_sql` — pre/post SELECT catalog queries (`release_gate`, `pg_policies`, `pg_get_functiondef`, aggregate counts)

---

## 27. Files Changed

| File | Action |
|---|---|
| `docs/architecture/p5-production-release-lock-apply-reverification.md` | Created |

---

## 28. No-Reset / No-Seed / No-Content-Write / No-Deploy Attestation

| Action | Performed |
|---|---|
| Reset / seed | **No** |
| Content INSERT/UPDATE/DELETE (product tables) | **No** |
| RPC mutation probe | **No** |
| Storage upload/delete | **No** |
| Lock unlock (`contribution_locked = false`) | **No** |
| Staging apply | **No** |
| Ad hoc SQL | **No** |
| Git push / deploy / launch | **No** |

Authorized DDL apply: **release-gate core only** (migration `p5_e9g8b_release_gate_core`).

---

*Gate P5-E.9G.8B complete.*
