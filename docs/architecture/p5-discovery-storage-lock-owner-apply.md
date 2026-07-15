# P5-E.9G.8D-R2 — Discovery Storage Lock Owner-Level Apply

**Gate:** P5-E.9G.8D-R2  
**Date:** 2026-07-15  
**Target:** `ohkoojpzmptdfyowdgog` (TheOverseer47's Project)

---

## 1. Executive Result

**Final decision:** `STOP_OWNER_LEVEL_PATH_UNAVAILABLE`

Git and SQL file identity preflight **PASS**. Production project identity **CONFIRMED** via MCP `list_projects`. Read-only owner preflight executed against `ohkoojpzmptdfyowdgog`.

**Owner preflight failed:** `current_user_is_table_owner = false` (`postgres` ≠ `supabase_storage_admin`).

Per gate rules: **no SQL file executed**, no repair attempted, no second apply.

**Discovery storage lock remains NOT APPLIED** on production.

---

## 2. Authorization

Authorized scope:

- Apply exactly once: `supabase/release_gate_storage_policy_deferred.sql`
- Via owner-capable Supabase Dashboard SQL Editor session on production only
- Read-only pre/post catalog verification only

Not authorized and not performed:

- SQL file edits, ad hoc SQL, role/owner changes, test uploads, lock toggle, push, deploy

---

## 3. Git Baseline

| Item | Expected | Actual | Result |
|---|---|---|---|
| Branch before gate | `review/p5-e9g8d-r1-production-lock-closure-apply` | `review/p5-e9g8d-r1-production-lock-closure-apply` | **MATCH** |
| HEAD | `441bd20` | `441bd20777ddaf3dabf7efcc51d04bd1e92571c8` | **MATCH** |
| Tracked modifications | none | none | **PASS** |

Review branch created:

- `review/p5-e9g8d-r2-discovery-storage-lock` (from `441bd20`)
- Push: **NOT PERFORMED**

---

## 4. SQL File Identity

| Check | Expected | Actual | Result |
|---|---|---|---|
| `git hash-object supabase/release_gate_storage_policy_deferred.sql` | `e41ab2d0a89944fe63f0d1ec01603fe35862cf4e` | `e41ab2d0a89944fe63f0d1ec01603fe35862cf4e` | **MATCH** |
| `git diff --exit-code HEAD --` (file) | exit 0 | exit 0 | **MATCH** |

SQL file not modified. Not executed due to owner stop.

---

## 5. Supabase Project Identity

| Check | Result |
|---|---|
| Intended project ref | `ohkoojpzmptdfyowdgog` |
| Intended project name | TheOverseer47's Project |
| `list_projects` match | **YES** |
| Staging `jzzgoiwfbuwiiyvwgwri` accessed | **NO** |

---

## 6. Dashboard Execution Path

Gate design requires manual Supabase Dashboard SQL Editor execution with visual project confirmation (`ohkoojpzmptdfyowdgog`).

Agent executed equivalent read-only preflight queries via MCP `execute_sql` on the target project to determine GO/STOP before any apply.

**Result:** STOP before dashboard/manual apply — owner path unavailable in observed session.

---

## 7. Current User and Table Owner

Preflight Query A result:

| Field | Value |
|---|---|
| `database_name` | `postgres` |
| `current_user` | `postgres` |
| `session_user` | `postgres` |
| `schema_name` | `storage` |
| `relation_name` | `objects` |
| `table_owner` | `supabase_storage_admin` |
| `current_user_is_table_owner` | **false** |
| `rls_enabled` | **true** |
| `target_policy_exists` | **false** |

**Preflight verdict:** `STOP_OWNER_LEVEL_PATH_UNAVAILABLE`

---

## 8. Pre-Apply Policy State

| Policy | Present |
|---|---|
| `storage_discovery_uploads_release_gate_insert_restrictive` | **NO** |
| `discovery_upload_authenticated` (permissive INSERT) | **YES** (from prior catalog; unchanged this gate) |

Target policy correctly absent before apply.

---

## 9. Pre-Apply Release-Gate State

Preflight Query B:

| Field | Value |
|---|---|
| `total_rows` | 1 |
| `canonical_rows` | 1 |
| `canonical_contribution_locked` | **true** |

Matches expected production state.

---

## 10. Pre-Apply Bucket Metadata

Preflight Query C:

| id | public | file_size_limit | allowed_mime_types |
|---|---|---:|---|
| `discovery-uploads` | true | 20971520 | jpeg, png, webp, pdf, zip, plain |
| `report-screenshots` | true | null | null |

---

## 11. Exact SQL Apply

**NOT EXECUTED**

Reason: owner preflight failed (`current_user_is_table_owner = false`).

Authorized file (unapplied):

- `supabase/release_gate_storage_policy_deferred.sql`
- Hash: `e41ab2d0a89944fe63f0d1ec01603fe35862cf4e`

---

## 12. Apply Result

| Item | Value |
|---|---|
| Executions | **0** |
| Apply result | **NOT RUN** |
| Error | N/A (stopped before apply) |
| Prior R1 failure context | MCP `apply_migration` also failed with `42501: must be owner of relation objects` |

---

## 13. Post-Apply Policy Evidence

**NOT CAPTURED** — apply not executed.

Expected post-apply checks (Queries A–E) not run.

---

## 14. Parallel Policy Analysis

Pre-apply storage INSERT policies (from R1 catalog, still valid):

- `discovery_upload_authenticated` — permissive, UID path scoping for `discovery-uploads`
- No restrictive companion policy

**Residual bypass:** discovery-uploads INSERT remains release-unlocked.

---

## 15. Release-Gate Preservation

No mutation performed. `contribution_locked` expected unchanged at **true**.

---

## 16. Bucket and Object Integrity

Preflight Query D object counts:

| bucket_id | object_count |
|---|---:|
| `discovery-uploads` | 20 |
| `report-screenshots` | 0 (no rows in grouped result) |

No storage mutations in this gate.

---

## 17. No-Mutation-Test Limitation

`NO_MUTATION_RUNTIME_PROBE_BY_DESIGN`

No test upload, storage INSERT/DELETE, RPC call, or lock toggle performed.

---

## 18. Final Decision

### `STOP_OWNER_LEVEL_PATH_UNAVAILABLE`

Observed SQL session user `postgres` is not owner of `storage.objects` (`supabase_storage_admin`). Gate requires `current_user_is_table_owner = true` before executing authorized SQL. Apply halted.

**Remediation path (out of scope for this gate):** Execute authorized file in a Dashboard SQL Editor session that runs as `supabase_storage_admin` (or equivalent table owner), then re-run post-apply read-only verification gate.

---

## 19. Commands and Queries Executed

### Git

```text
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
git hash-object supabase/release_gate_storage_policy_deferred.sql
git diff --exit-code HEAD -- supabase/release_gate_storage_policy_deferred.sql
git branch --list review/p5-e9g8d-r2-discovery-storage-lock
git switch -c review/p5-e9g8d-r2-discovery-storage-lock
```

### Supabase MCP (project `ohkoojpzmptdfyowdgog` only)

```text
list_projects
execute_sql — Preflight Query A (session/owner/policy)
execute_sql — Preflight Query B (release_gate)
execute_sql — Preflight Query C (bucket metadata)
execute_sql — Preflight Query D (object counts)
```

No DDL apply. No post-apply queries.

---

## 20. No-Owner-Change / No-Role-Change / No-Push / No-Deploy Attestation

| Boundary | Status |
|---|---|
| Owner change | **NOT PERFORMED** |
| Role change / SET ROLE | **NOT PERFORMED** |
| Authorized SQL apply | **NOT PERFORMED** (owner stop) |
| Ad hoc SQL / repair | **NOT PERFORMED** |
| Storage object mutation | **NOT PERFORMED** |
| Lock toggle | **NOT PERFORMED** |
| Git push | **NOT PERFORMED** |
| Deploy / launch / route cutover | **NOT PERFORMED** |
