# P5-E.9G.8A — Production Backend Lock Read-only Verification

**Gate:** P5-E.9G.8A  
**Date:** 2026-07-15  
**Method:** Catalog-only read-only verification (no mutation probe)

---

## 1. Executive Result

**Final decision:** `PRODUCTION_BACKEND_LOCK_NOT_PROVEN`

Production Supabase project `ohkoojpzmptdfyowdgog` does **not** contain the central `release_gate` mechanism, release-lock helper functions, or release-lock RLS policies described in the P5 release-lock design. Multiple authenticated write paths remain open at the database layer, including a `SECURITY DEFINER` RPC that inserts into `posts` and `wiki_observations` without any release-lock or tutorial-ack check.

A minimal production route cutover (`0d8fc02`) would **not** change the Supabase runtime ref and therefore would **not** introduce new backend bypasses, but it also would **not** remediate the absent production lock. Product activation remains unsafe without prior application of release-lock SQL to production.

**Evidence basis:** `PROVEN_BY_CATALOG_POLICY_AND_FUNCTION_DEFINITION_EVIDENCE` — not `PROVEN_BY_LIVE_WRITE_DENIAL_TEST`.

---

## 2. Scope and Read-only Boundary

| Boundary | Status |
|---|---|
| Target project | `ohkoojpzmptdfyowdgog` only |
| Staging project `jzzgoiwfbuwiiyvwgwri` | Not queried |
| SQL operations | `SELECT` / `WITH … SELECT` only |
| RPC execution | None |
| Storage write | None |
| Mutation probe | `NO_MUTATION_RUNTIME_PROBE_BY_DESIGN` |
| Deploy / push / launch | None |

All findings are tagged:

- **PRODUCTION CATALOG EVIDENCE** — live `information_schema`, `pg_policies`, `pg_proc`, `storage.buckets`
- **PRODUCTION POLICY EVIDENCE** — `pg_policies` qual/with_check text
- **PRODUCTION FUNCTION-DEFINITION EVIDENCE** — `pg_get_functiondef(...)`
- **REPOSITORY EVIDENCE** — tracked files on branch `review/p5-e9g8a-production-backend-lock` @ `0d8fc02`
- **INFERENCE** — reasoned conclusion from catalog evidence
- **NOT PROVEN WITHOUT MUTATION TEST** — runtime denial not exercised
- **UNKNOWN** — insufficient catalog proof

---

## 3. Git Baseline

| Item | Value | Tag |
|---|---|---|
| Branch before gate | `preview/p5-e9g7-minimal-route` | REPOSITORY EVIDENCE |
| Branch after gate | `review/p5-e9g8a-production-backend-lock` | REPOSITORY EVIDENCE |
| Baseline commit | `0d8fc02` — Build minimal production route candidate | REPOSITORY EVIDENCE |
| Review commit | (pending local commit of this document) | REPOSITORY EVIDENCE |
| Staged/modified tracked files | None before doc write | REPOSITORY EVIDENCE |

**Untracked local files observed (not touched):** `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json`, plus additional local artifacts (`.env.legacy`, `.env.staging`, `backups/`, QA export fixtures) outside the gate’s minimal untracked allow-list. Gate work did not read, stage, or modify any of them.

**Deviation note:** Working tree contains more untracked files than the gate preflight allow-list specified. Gate proceeded on review branch without reset/stash because no tracked files were modified and verification is read-only.

---

## 4. Supabase Project Identity

| Check | Result | Tag |
|---|---|---|
| Project ref | `ohkoojpzmptdfyowdgog` | PRODUCTION CATALOG EVIDENCE |
| Project name | TheOverseer47's Project | PRODUCTION CATALOG EVIDENCE |
| Region | eu-central-1 | PRODUCTION CATALOG EVIDENCE |
| Status | ACTIVE_HEALTHY | PRODUCTION CATALOG EVIDENCE |
| Staging ref excluded | Confirmed — `jzzgoiwfbuwiiyvwgwri` listed separately, not queried | PRODUCTION CATALOG EVIDENCE |

**Identity verdict:** Project identity proven before first data query. No `STOP_WRONG_SUPABASE_PROJECT`.

---

## 5. Repository Write-Path Inventory

Paths identified from JS/SQL on baseline `0d8fc02` and related architecture docs.

| Write path | Mechanism | Classification | Notes |
|---|---|---|---|
| Direct `posts` INSERT | `js/create-post.js`, `js/guilds-apply.js` → `.from("posts").insert()` | **B** authenticated content write | Tutorial-ack gate in production policies; no release lock |
| Direct `posts` UPDATE | `js/edit-post.js`, `js/knowledge-relations.js`, `js/patch-mode.js` | **B** | Owner/admin policies only |
| `comments` INSERT/UPDATE/DELETE | `js/post-detail.js`, `js/post-interactions.js` | **B** | Auth + owner; no release lock |
| `post_reactions` INSERT/UPDATE/DELETE | `js/post-detail.js` | **B** | Own-user scoped; no release lock in production |
| `wiki_observations` INSERT (direct) | RLS policy `wiki_observations_insert_own` | **B** | Author-bound; no release lock |
| `bl_register_observation` RPC | `js/discovery-core.js` → `.rpc("bl_register_observation")` | **D** SECURITY DEFINER write | Inserts observations + posts; bypasses RLS |
| `rpc_sync_discovery_submission` RPC | Admin approval pipeline | **D** / **E** | Admin-gated inside function |
| Discovery storage upload | `js/create-post.js` → `storage.from("discovery-uploads")` | **C** | Path-scoped; no release lock |
| Report screenshot upload | `js/support.js` → `storage.from("report-screenshots")` | **C** | Authenticated bucket insert |
| `reports` INSERT | `js/support.js`, `js/community-hub.js` | **B** | Reporter-bound |
| `notifications` INSERT | `js/notifications.js` | **B** | Broad authenticated insert policy |
| `ratings` INSERT | `js/post-interactions.js` | **B** | If table present |
| `tutorial_ack` / `user_submission_acks` | `js/tutorial-ack.js` | **B** | Enables posts path after ack |
| Lock state mutation | `release_gate` + `bl_set_release_gate_locked` (designed, not deployed) | **E** | Missing on production |
| `release-gate-client.js` UI gate | Referenced in architecture docs | **F** on `0d8fc02` | File not tracked on baseline branch |
| Route/SSG pages | `functions/wiki/post.js`, entity SSG | **F** | Read-only routing; no writes |

---

## 6. Release-Gate Table Structure

| Check | Production result | Tag |
|---|---|---|
| `public.release_gate` exists | **NO** — `42P01 relation does not exist` | PRODUCTION CATALOG EVIDENCE |
| `public.release_gate_audit` exists | **NO** — no `%release%` / `%gate%` / `%lock%` tables in `public` | PRODUCTION CATALOG EVIDENCE |
| Columns `contribution_locked`, singleton `id=1` | N/A — table absent | PRODUCTION CATALOG EVIDENCE |
| Default fail-closed semantics | N/A — mechanism not deployed | INFERENCE |

**Repository reference:** `release_gate_lock.sql` is documented in `docs/architecture/p5-release-lock-plan.md` and related P5 reports but is **not** tracked on `origin/main` or baseline `0d8fc02` (REPOSITORY EVIDENCE).

---

## 7. Current Production Lock State

| Check | Result | Tag |
|---|---|---|
| Canonical lock row | **MISSING** | PRODUCTION CATALOG EVIDENCE |
| `contribution_locked = true` | **NOT APPLICABLE** — no table | PRODUCTION CATALOG EVIDENCE |
| Row count / canonical rows | Query failed — table absent | PRODUCTION CATALOG EVIDENCE |
| Reason field present | N/A | PRODUCTION CATALOG EVIDENCE |

**Gate code:** `PRODUCTION_RELEASE_GATE_MISSING`

There is no server-side “locked” state to read. Client-only UI hiding (if any) would not constitute a backend lock.

---

## 8. Release-Gate Mutation Protection

| Check | Result | Tag |
|---|---|---|
| RLS on `release_gate` | Table absent | PRODUCTION CATALOG EVIDENCE |
| `bl_set_release_gate_locked` function | **NOT FOUND** in `pg_proc` | PRODUCTION CATALOG EVIDENCE |
| `bl_is_release_unlocked` function | **NOT FOUND** | PRODUCTION CATALOG EVIDENCE |
| `bl_assert_can_create_user_content` function | **NOT FOUND** | PRODUCTION CATALOG EVIDENCE |
| Normal users can unlock | N/A — no mechanism; **cannot decrease risk** | INFERENCE |
| Admin unlock path | Not deployed | PRODUCTION CATALOG EVIDENCE |

---

## 9. RLS Enablement Matrix

| Table | RLS enabled | Force RLS | Owner | Classification | Tag |
|---|---|---|---|---|---|
| `public.posts` | yes | no | postgres | RLS_ENABLED_AND_RELEVANT_POLICIES_PRESENT | PRODUCTION CATALOG EVIDENCE |
| `public.comments` | yes | no | postgres | RLS_ENABLED_AND_RELEVANT_POLICIES_PRESENT | PRODUCTION CATALOG EVIDENCE |
| `public.post_reactions` | yes | no | postgres | RLS_ENABLED_AND_RELEVANT_POLICIES_PRESENT | PRODUCTION CATALOG EVIDENCE |
| `public.wiki_observations` | yes | no | postgres | RLS_ENABLED_AND_RELEVANT_POLICIES_PRESENT | PRODUCTION CATALOG EVIDENCE |
| `public.wiki_entities` | yes | no | postgres | RLS_ENABLED_AND_RELEVANT_POLICIES_PRESENT (admin write) | PRODUCTION CATALOG EVIDENCE |
| `public.wiki_entity_relations` | yes | no | postgres | RLS_ENABLED_AND_RELEVANT_POLICIES_PRESENT (admin write) | PRODUCTION CATALOG EVIDENCE |
| `public.notifications` | yes | no | postgres | RLS_ENABLED_POLICY_INCOMPLETE (broad insert) | PRODUCTION CATALOG EVIDENCE |
| `public.reports` | yes | no | postgres | RLS_ENABLED_AND_RELEVANT_POLICIES_PRESENT | PRODUCTION CATALOG EVIDENCE |
| `public.release_gate` | — | — | — | TABLE_NOT_PRESENT | PRODUCTION CATALOG EVIDENCE |
| `storage.objects` | yes | no | supabase_storage_admin | RLS_ENABLED_AND_RELEVANT_POLICIES_PRESENT | PRODUCTION CATALOG EVIDENCE |

RLS is enabled on content tables, but **release-lock restrictive policies are absent**.

---

## 10. Write-Policy Inventory

### Posts INSERT (PRODUCTION POLICY EVIDENCE)

| Policy | Permissive | Roles | Lock check | Tutorial ack |
|---|---|---|---|---|
| `posts_insert_verified` | PERMISSIVE | public | **None** | No |
| `posts_insert_requires_tutorial_ack` | **RESTRICTIVE** | authenticated | **None** | Yes — `user_submission_acks` row or admin |

PostgreSQL combines permissive INSERT policies with OR; restrictive policies must all pass. Net effect: authenticated users with tutorial ack (or admin) can INSERT pending posts — **no release-lock predicate**.

**No** `posts_release_gate_insert_restrictive` policy exists (expected name from repository design docs).

### Posts UPDATE

Owner and admin permissive policies only. **No** release-lock restrictive UPDATE policy.

### Comments INSERT

`comments_insert_auth` — author + not banned. **No** release lock.

### Post reactions INSERT/UPDATE

Own-user policies only. **No** release lock (repository design includes lock policies; production does not).

### Wiki observations INSERT

`wiki_observations_insert_own` — `author_id = auth.uid()`. **No** release lock.

### Storage INSERT

| Policy | Bucket | Lock check | Path scope |
|---|---|---|---|
| `discovery_upload_authenticated` | discovery-uploads | **None** | `split_part(name,'/',1) = auth.uid()` |
| `Authenticated users can upload report screenshots` | report-screenshots | **None** | bucket + authenticated only |
| `avatars_upload_own` | avatars | **None** | uid folder |

**No** `storage_discovery_uploads_release_gate_insert_restrictive` policy.

### Parallel permissive bypass analysis (INFERENCE)

For tables with release-lock design, the risk is a second permissive policy without lock. On production, the primary INSERT policies themselves **never reference** `contribution_locked` or `bl_can_create_user_content()`, so the bypass is not a “second policy” edge case — the **first-layer policies are already unlocked**.

---

## 11. Direct Post and Content Write Protection

| Path | Decision | Rationale | Tag |
|---|---|---|---|
| Direct `posts` INSERT | **DIRECT_POST_INSERT_BYPASS_FOUND** | Tutorial ack only; no release gate table or policy | PRODUCTION POLICY EVIDENCE |
| `posts` UPDATE (owner) | **INTENTIONALLY_ALLOWED** / not release-gated | Owner update policies active | PRODUCTION POLICY EVIDENCE |
| `comments` INSERT | **BYPASS_FOUND** | Auth-only insert policy | PRODUCTION POLICY EVIDENCE |
| `wiki_observations` direct INSERT | **BYPASS_FOUND** | Own-author insert | PRODUCTION POLICY EVIDENCE |
| `post_reactions` | **INTENTIONALLY_ALLOWED** | No release lock deployed; architecture may treat as outside activation lock | PRODUCTION POLICY EVIDENCE |
| `reports` + screenshots | **INTENTIONALLY_ALLOWED** | Moderation path; not contribution activation | PRODUCTION POLICY EVIDENCE |

---

## 12. SECURITY-DEFINER / RPC Inventory

| Function | Security mode | Owner | authenticated EXECUTE | anon EXECUTE | Tag |
|---|---|---|---|---|---|
| `bl_register_observation` | SECURITY DEFINER | postgres | yes | yes* | PRODUCTION CATALOG EVIDENCE |
| `rpc_sync_discovery_submission` | SECURITY DEFINER | postgres | yes | yes* | PRODUCTION CATALOG EVIDENCE |
| `bl_match_entities` | SECURITY DEFINER | postgres | yes | yes | PRODUCTION CATALOG EVIDENCE |
| `bl_search_public_content` | SECURITY DEFINER | postgres | yes | yes | PRODUCTION CATALOG EVIDENCE |
| `is_admin` | SECURITY DEFINER | postgres | yes | yes | PRODUCTION CATALOG EVIDENCE |
| `delete_own_account` | SECURITY DEFINER | postgres | yes | no | PRODUCTION CATALOG EVIDENCE |
| `bl_rebuild_search_documents` | SECURITY DEFINER | postgres | no | no | PRODUCTION CATALOG EVIDENCE |

\*`has_function_privilege('anon', …)` returned true for these OIDs; `information_schema.routine_privileges` lists `authenticated` only for the two write RPCs. Treat anon execute as **UNKNOWN** for practical PostgREST exposure; authenticated execute is confirmed.

No other public `SECURITY DEFINER` functions with direct `INSERT INTO posts/comments/wiki_observations` were found beyond `bl_register_observation` and `rpc_sync_discovery_submission`.

---

## 13. RPC Internal Lock Checks

### `bl_register_observation`

| Check | Result | Tag |
|---|---|---|
| Auth required | Yes — raises if `auth.uid()` null | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| Tutorial ack | **No** | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| Release lock / `bl_assert_can_create_user_content` | **No** | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| Admin bypass | Reads admin flag but does not gate writes on it | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| Writes | `INSERT` into `wiki_observations`, `wiki_observation_entities`, **`posts`** | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| RLS bypass | SECURITY DEFINER with `search_path = public` | PRODUCTION FUNCTION-DEFINITION EVIDENCE |

**BL_REGISTER_OBSERVATION_LOCK_CHECK:** **FAIL**

### `rpc_sync_discovery_submission`

| Check | Result | Tag |
|---|---|---|
| Auth required | Yes | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| Admin required | Yes — returns `ADMIN_REQUIRED` if not admin | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| Release lock | **No** (admin-only pipeline) | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| Writes | Upserts `wiki_entities`, relations, evidence, sync logs | PRODUCTION FUNCTION-DEFINITION EVIDENCE |

**RPC_SYNC_DISCOVERY_SUBMISSION_LOCK_CHECK:** **PASS** for contribution-lock scope (admin-only activation path). Release lock not required inside admin approval RPC.

---

## 14. Function Execute Privileges

| Function | anon | authenticated | public | Lock check inside | Bypass risk | Tag |
|---|---|---|---|---|---|---|
| `bl_register_observation` | UNKNOWN | **YES** | — | **NO** | **HIGH** — DEFINER writes posts/observations | PRODUCTION CATALOG EVIDENCE |
| `rpc_sync_discovery_submission` | UNKNOWN | **YES** | — | Admin only | Low for normal users | PRODUCTION CATALOG EVIDENCE |
| `bl_set_release_gate_locked` | — | — | — | N/A — not deployed | N/A | PRODUCTION CATALOG EVIDENCE |

---

## 15. Storage Bucket Inventory

| Bucket | Public | file_size_limit | allowed_mime_types | Present | Tag |
|---|---|---|---|---|---|
| `discovery-uploads` | true | 20 971 520 (20 MB) | jpeg, png, webp, pdf, zip, plain | yes | PRODUCTION CATALOG EVIDENCE |
| `report-screenshots` | true | null (no limit) | null (any) | yes | PRODUCTION CATALOG EVIDENCE |
| `avatars` | true | null | null | yes | PRODUCTION CATALOG EVIDENCE |

Repository `discovery_storage.sql` on baseline matches bucket metadata shape (REPOSITORY EVIDENCE).

---

## 16. Storage Upload Policy Matrix

| Bucket | Path scoped | Release locked | Limits | Decision | Tag |
|---|---|---|---|---|---|
| `discovery-uploads` | yes — uid prefix | **no** | size + MIME on bucket | **PATH_SCOPED_BUT_NOT_RELEASE_LOCKED** | PRODUCTION POLICY EVIDENCE |
| `report-screenshots` | **no** — bucket-wide authenticated | **no** | none on bucket | **BROAD_UPLOAD_POLICY** (intentional moderation) | PRODUCTION POLICY EVIDENCE |
| `avatars` | yes — uid folder | **no** | none | OUT_OF_SCOPE for contribution lock | PRODUCTION POLICY EVIDENCE |

---

## 17. Fail-Closed Analysis

| Scenario | Production behavior | Classification | Tag |
|---|---|---|---|
| Missing `release_gate` row | No table — policies do not consult lock | **FAIL_OPEN_RISK** | PRODUCTION CATALOG EVIDENCE |
| NULL `contribution_locked` | N/A | **FAIL_OPEN_RISK** | INFERENCE |
| Multiple lock rows | N/A | **FAIL_OPEN_RISK** | INFERENCE |
| Policy `contribution_locked = false` only | Not used anywhere in production policies | **FAIL_OPEN_RISK** | PRODUCTION POLICY EVIDENCE |
| RPC missing lock helper | `bl_register_observation` proceeds on auth alone | **FAIL_OPEN_RISK** | PRODUCTION FUNCTION-DEFINITION EVIDENCE |

**Gesamturteil:** **FAIL_OPEN_RISK**

An currently “locked” row cannot be proven because the mechanism is absent. Repository design (`release_gate_lock.sql` in P5 docs) specifies missing row = locked, but that design is **not applied** to production.

---

## 18. Admin Bypass and Role Integrity

| Check | Result | Tag |
|---|---|---|
| Admin determination | `profiles.role = 'admin'` via `is_admin()` SECURITY DEFINER | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| `profiles_update_own` | Permissive UPDATE where `auth.uid() = id`; **with_check null** | PRODUCTION POLICY EVIDENCE |
| `profiles_update_admin` | Admin-only update policy | PRODUCTION POLICY EVIDENCE |
| Triggers preventing `role` self-promotion | **None** on `profiles` | PRODUCTION CATALOG EVIDENCE |
| `profiles.role` default | `'user'` | PRODUCTION CATALOG EVIDENCE |

**Verdict:** `ADMIN_BYPASS_ROLE_INTEGRITY_NOT_FULLY_PROVEN`

A user updating their own profile row might be able to set `role = 'admin'` unless blocked by column privileges or triggers not visible in catalog (NOT PROVEN WITHOUT MUTATION TEST). Admin bypass paths in posts/comments require `profiles.role = 'admin'`, so self-promotion would be high impact if possible.

---

## 19. Repository-to-Production Schema Comparison

| Artifact | Repository (`0d8fc02` / docs) | Production | Drift | Tag |
|---|---|---|---|---|
| `release_gate` table + audit | Documented in P5 architecture; SQL file not on `origin/main` or baseline branch | **Absent** | **PRODUCTION_BEHIND_REPOSITORY** (intent) | REPOSITORY EVIDENCE + PRODUCTION CATALOG EVIDENCE |
| Release-lock RLS policies | Documented (`posts_release_gate_*`, storage deferred policy) | **Absent** | **PRODUCTION_BEHIND_REPOSITORY** | PRODUCTION POLICY EVIDENCE |
| `bl_is_release_unlocked`, `bl_assert_can_create_user_content` | Documented | **Absent** | **PRODUCTION_BEHIND_REPOSITORY** | PRODUCTION CATALOG EVIDENCE |
| `posts_insert_requires_tutorial_ack` | Repo file uses JWT `user_metadata` | Production uses `user_submission_acks` table | **MIXED_SCHEMA_DRIFT** | REPOSITORY EVIDENCE + PRODUCTION POLICY EVIDENCE |
| `bl_register_observation` | Docs expect tutorial ack + release assert | Production: auth only | **MIXED_SCHEMA_DRIFT** | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| `discovery_storage.sql` | Path-scoped bucket policies | Matches production | **PRODUCTION_MATCHES_REPOSITORY** | REPOSITORY EVIDENCE |
| `rpc_sync_discovery_submission` | In `sprint1_sync_rpc.sql` on branch | Present; admin-gated | **PRODUCTION_MATCHES_REPOSITORY** (core) | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| `release-gate-client.js` | In fuller branches/docs | **Not on baseline `0d8fc02`** | Client gate not in minimal candidate | REPOSITORY EVIDENCE |

**Drift verdict:** **MIXED_SCHEMA_DRIFT** — core discovery/sync objects align; **release-lock layer never applied to production**.

---

## 20. Complete Lock Coverage Matrix

| Write path | Direct/RPC/Storage | Normal user allowed when locked | Admin bypass | Fail-closed if config missing | Evidence |
|---|---|---|---|---|---|
| `posts` INSERT (direct) | Direct | **YES** (with tutorial ack) | YES | **NO** | PRODUCTION POLICY EVIDENCE |
| `posts` UPDATE (owner) | Direct | YES | YES | NO | PRODUCTION POLICY EVIDENCE |
| `comments` INSERT | Direct | YES | YES | NO | PRODUCTION POLICY EVIDENCE |
| `wiki_observations` INSERT | Direct | YES | YES | NO | PRODUCTION POLICY EVIDENCE |
| `bl_register_observation` | RPC | **YES** | YES (no extra gate) | **NO** | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| `rpc_sync_discovery_submission` | RPC | NO | YES | N/A (admin fn) | PRODUCTION FUNCTION-DEFINITION EVIDENCE |
| Discovery upload | Storage | **YES** | YES | NO | PRODUCTION POLICY EVIDENCE |
| Report screenshot upload | Storage | YES | YES | NO | PRODUCTION POLICY EVIDENCE |
| `post_reactions` INSERT | Direct | YES | — | NO | PRODUCTION POLICY EVIDENCE |
| `reports` INSERT | Direct | YES | — | NO | PRODUCTION POLICY EVIDENCE |
| Lock-state UPDATE | Direct/RPC | N/A — no table | N/A | **NO** | PRODUCTION CATALOG EVIDENCE |

Legend: “when locked” is theoretical — production has **no lock state**. Normal-user columns reflect **current production catalog**, which is effectively **unlocked** for contribution paths.

---

## 21. Findings and Bypass Risks

### Critical

1. **`PRODUCTION_RELEASE_GATE_MISSING`** — no `release_gate` table, functions, or policies (PRODUCTION CATALOG EVIDENCE).
2. **`bl_register_observation` FAIL** — SECURITY DEFINER RPC callable by authenticated users; inserts into `posts` and `wiki_observations` without release-lock or tutorial-ack enforcement (PRODUCTION FUNCTION-DEFINITION EVIDENCE).
3. **Direct `posts` INSERT** — permissive + restrictive tutorial ack only; no server-side contribution lock (PRODUCTION POLICY EVIDENCE).
4. **Discovery storage upload** — path-scoped but not release-locked (PRODUCTION POLICY EVIDENCE).

### Moderate

5. **Comments, reactions, direct observations** — writable by authenticated users without release lock.
6. **`ADMIN_BYPASS_ROLE_INTEGRITY_NOT_FULLY_PROVEN`** — `profiles_update_own` lacks explicit `role` immutability in policy/trigger catalog.
7. **`report-screenshots`** — broad authenticated upload (likely intentional for moderation).

### Production frontend impact (INFERENCE)

Minimal route candidate `0d8fc02` keeps production Supabase ref `ohkoojpzmptdfyowdgog` (verified in P5-E.9G.7B). Route cutover alone does **not** activate a backend lock. Any user who can reach create-post / discovery flows (or call the API directly) can write against current production policies. UI-only hiding is not evidenced on the minimal branch (`release-gate-client.js` not tracked).

---

## 22. Residual Read-only Limitations

- **NO_MUTATION_RUNTIME_PROBE_BY_DESIGN** — catalog proof only.
- Anon execute privilege on some DEFINER functions reported by `has_function_privilege` but not fully enumerated in `routine_privileges`.
- Whether `profiles.role` self-update is blocked in practice — **NOT PROVEN WITHOUT MUTATION TEST**.
- Full HEAD repository SQL (e.g. `release_gate_lock.sql` on development branches) not on baseline branch; comparison uses architecture docs + tracked baseline SQL.
- No Edge Function execution or service-role path testing.

---

## 23. Production Route Cutover Impact

| Question | Answer | Tag |
|---|---|---|
| Would `0d8fc02` switch Supabase ref? | **No** — production baseline preserved | INFERENCE from P5-E.9G.7B |
| Would cutover add backend lock? | **No** | INFERENCE |
| Would cutover remove existing write paths? | **No** | PRODUCTION CATALOG EVIDENCE |
| Safe for product activation? | **No** — backend lock not proven | INFERENCE |

**Production route cutover authorization remains NOT AUTHORIZED** from a product-activation perspective until release-lock SQL is applied and re-verified on production.

---

## 24. Final Decision

### `PRODUCTION_BACKEND_LOCK_NOT_PROVEN`

Conditions met:

- Release-gate table **missing** on production (`PRODUCTION_RELEASE_GATE_MISSING`).
- Current production state is **not** `contribution_locked = true` — no canonical lock exists.
- Direct posts/observations/comments/reactions and discovery uploads are **not** release-gated at policy level.
- `bl_register_observation` **bypasses** RLS and lacks internal lock check.
- Fail-closed semantics for missing lock configuration are **not** implemented on production.
- Repository release-lock SQL is **not** applied to production (MIXED_SCHEMA_DRIFT).

Option A (PROVEN) and Option B (PARTIAL) are **not** satisfied because the central lock mechanism itself is absent, not merely partially evidenced.

---

## 25. Commands and Queries Executed

### Git (read-only)

```text
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
git switch -c review/p5-e9g8a-production-backend-lock
git ls-files supabase/
```

### Supabase MCP

- `list_projects` — identity confirmation
- `execute_sql` (project `ohkoojpzmptdfyowdgog`) — all queries below are `SELECT` only:

```sql
-- release_gate structure (empty — table missing)
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'release_gate';

-- lock state (failed 42P01 — table missing)
SELECT id, contribution_locked, updated_at,
  (reason IS NOT NULL AND length(trim(reason)) > 0) AS has_reason,
  (updated_by IS NOT NULL) AS has_updated_by
FROM public.release_gate;

-- RLS enablement
SELECT n.nspname, c.relname, c.relrowsecurity, c.relforcerowsecurity, pg_get_userbyid(c.relowner)
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname IN ('public','storage') AND c.relname IN (...);

-- pg_policies for content + storage.objects
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE ...;

-- functions + definitions
SELECT pg_get_functiondef(p.oid) FROM pg_proc p ...;
SELECT routine_name, grantee, privilege_type FROM information_schema.routine_privileges ...;

-- storage.buckets
SELECT id, name, public, file_size_limit, allowed_mime_types FROM storage.buckets;

-- table privileges, profiles columns, triggers, release-related table search
```

---

## 26. Files Changed

| File | Action |
|---|---|
| `docs/architecture/p5-production-backend-lock-readonly-verification.md` | **Created** |

No other files modified, staged, or committed.

---

## 27. No-Write / No-Apply / No-Deploy Attestation

| Action | Performed |
|---|---|
| INSERT / UPDATE / DELETE on production | **No** |
| RPC / function execution | **No** |
| Storage upload/delete | **No** |
| SQL apply / migration / DDL | **No** |
| Auth login / test user creation | **No** |
| Lock toggle | **No** |
| `pre_release_test_data_reset.sql` | **Not executed** |
| Git push | **No** |
| Production deploy | **No** |
| Runtime switch | **No** |
| Public indexing / launch | **No** |
| Secrets / tokens / full keys in this document | **None emitted** |

---

*Gate P5-E.9G.8A — read-only verification complete.*
