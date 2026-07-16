# P5-E.9G.8E.6 — Final Production Release-Lock and Live-RLS Audit

**Gate:** P5-E.9G.8E.6  
**Date:** 2026-07-16  
**Target:** `ohkoojpzmptdfyowdgog` (TheOverseer47's Project)  
**Branch:** `review/p5-e9g8e6-final-release-lock-audit`

---

## 1. Executive Result

**Final decision:** `PASS_SPLUS01_AND_S10_FORMALLY_CLOSED`

Read-only catalog and prior E.5B runtime evidence confirm a fail-closed contribution
lock covering ordinary-user create paths for posts, reactions, comments INSERT,
wiki observations INSERT, hardened `bl_register_observation`, profile role
integrity, and discovery-uploads INSERT (structurally and practically).

Transparent residuals remain (documented below) and do not reopen create-path
lock bypass for ordinary users.

---

## 2. Scope and Read-only Boundary

| Action | Status |
|---|---|
| SELECT / catalog / policy / function defs | **PERFORMED** |
| INSERT / UPDATE / DELETE / RPC mutate | **NOT PERFORMED** |
| Auth login / storage upload | **NOT PERFORMED** |
| SQL apply / policy mutate / lock toggle | **NOT PERFORMED** |
| Push / deploy / launch | **NOT PERFORMED** |

---

## 3. Git Baseline

| Item | Value |
|---|---|
| Parent branch | `review/p5-e9g8e5b-runtime-denial-test` |
| Baseline HEAD | `c7f7f11` |
| Review branch | `review/p5-e9g8e6-final-release-lock-audit` |
| Tracked pre-audit changes | none |

---

## 4. Supabase Production Identity

| Check | Result |
|---|---|
| Project name | TheOverseer47's Project |
| Project ref | `ohkoojpzmptdfyowdgog` |
| Staging used | **NO** |
| Verdict | **CONFIRMED** |

---

## 5. Release-Gate Core

| Field | Value |
|---|---|
| total_rows | 1 |
| canonical_rows | 1 |
| noncanonical_rows | 0 |
| canonical_contribution_locked | **true** |

---

## 6. Release-Gate Singleton and Constraints

Columns include `id smallint NOT NULL DEFAULT 1`,
`contribution_locked boolean NOT NULL DEFAULT true`, plus audit metadata.

Constraints:

- PRIMARY KEY (`id`)
- CHECK `release_gate_singleton`: `id = 1`
- FK `updated_by` → `auth.users`

Singleton structurally protected; default lock is fail-closed (`true`).

---

## 7. Release-Gate Helper Semantics

| Function | Args | SECURITY DEFINER | search_path | Semantics |
|---|---|---|---|---|
| `bl_is_release_unlocked` | none | yes | `public, pg_temp` | missing/NULL/error → false; unlocked only when locked is false |
| `bl_can_create_user_content` | uuid | yes | `public, pg_temp` | null → false; admin bypass; else requires unlocked |
| `bl_assert_can_create_user_content` | text | yes | `public, pg_temp` | raises 42501 when helper false |
| `bl_can_bypass_release_gate` | uuid | yes | `public, pg_temp` | equals `bl_is_admin_actor` |
| `bl_is_admin_actor` | uuid | yes | `public, pg_temp` | profiles.role = admin |

Helpers not executed in this gate. Fail-closed for ordinary users while locked.

---

## 8. Release-Gate Mutation Rights

| Control | Evidence |
|---|---|
| RLS | enabled |
| SELECT policy | `release_gate_select_all` for anon/authenticated |
| UPDATE policy | `release_gate_admin_update` requires `bl_is_admin_actor` |
| INSERT/DELETE policies | none for client roles |
| Table UPDATE/INSERT/DELETE privileges (authenticated) | **false** (has_table_privilege) |
| Intended toggle RPC | `bl_set_release_gate_locked` — auth required + admin check; non-admin denied with audit |

Residual hygiene: `TRUNCATE` privilege appears granted to anon/authenticated at DB
level. PostgREST does not expose TRUNCATE; even if truncated, missing row fails
closed to locked via `bl_is_release_unlocked`. Documented under Remaining Known
Risks (privilege hygiene), not an unlock bypass.

Ordinary users cannot unlock via UPDATE/INSERT/DELETE or the toggle RPC.

---

## 9. Profile Role Integrity

| Item | Result |
|---|---|
| Trigger | `trg_profiles_prevent_role_self_promotion` BEFORE UPDATE (enabled) |
| Function | `bl_profiles_prevent_role_self_promotion` SECURITY DEFINER |
| Self-promotion | blocked unless `bl_is_admin_actor` |
| Alternate bypass | admin update policies only |
| Ordinary profile UPDATE | allowed for non-role columns via `profiles_update_own` |

---

## 10. Posts RLS and Write Paths

RLS enabled.

Create path:

- permissive INSERT `posts_insert_verified` (author/pending/verified)
- restrictive INSERT tutorial-ack
- restrictive INSERT `posts_release_gate_insert_restrictive` → `bl_can_create_user_content`

Update path:

- restrictive `posts_release_gate_update_restrictive` → same helper
- permissive own/admin update policies remain AND-gated by restrictive lock

Delete: own/admin — **out of create-lock product-activation scope** (documented).

No broad authenticated INSERT `WITH CHECK (true)`.

---

## 11. Reactions RLS and Write Paths

Table: `public.post_reactions` (RLS enabled).

- permissive own INSERT/UPDATE
- restrictive INSERT/UPDATE release-gate policies using `bl_can_create_user_content`
- DELETE own — out of create-lock scope (transparent)

---

## 12. Comments RLS and Write Paths

- permissive INSERT `comments_insert_auth`
- restrictive INSERT `comments_release_gate_insert_restrictive`
- UPDATE/DELETE own/admin remain possible while locked — **explicit out-of-scope**
  for product-activation create path (prior P5 gates)

---

## 13. Wiki Observations RLS and Write Paths

- permissive INSERT own
- restrictive INSERT release-gate
- SELECT own/admin
- No UPDATE/DELETE policies observed for ordinary writes

---

## 14. bl_register_observation Audit

| Item | Result |
|---|---|
| Overloads | single 10-parameter signature |
| Returns | jsonb |
| SECURITY DEFINER | yes |
| search_path | `public, pg_temp` |
| Auth | `auth.uid()` null → 42501 |
| Tutorial-ack | required for non-admin |
| Release lock | `bl_assert_can_create_user_content` **before** first INSERT |
| Grants | EXECUTE to authenticated (+ PUBLIC inheritance) |
| Body | rejects unauthenticated callers |

---

## 15. Discovery Storage Policy Audit

`discovery_upload_authenticated` exactly once:

- PERMISSIVE INSERT to authenticated
- WITH CHECK AND of bucket + UID path + `bl_can_create_user_content(auth.uid())`
- No second discovery INSERT policy
- Avatar/report INSERT policies bucket-scoped only

Residual: `discovery_update_own` / `discovery_delete_own` are UID-scoped but
**not** release-locked. Scope note: create-path lock proven; UPDATE/DELETE of
existing objects treated as residual known risk (not product create).

---

## 16. Storage Bucket and Count Evidence

| Bucket | Public | Limit | MIME | Count |
|---|---|---:|---|---:|
| avatars | true | null | null | 0 |
| discovery-uploads | true | 20971520 | jpeg/png/webp/pdf/zip/plain | **20** |
| report-screenshots | true | null | null | 0 |

`storage.objects` owner: `supabase_storage_admin`; RLS enabled.

---

## 17. Runtime Denial Evidence Validation

Source commit `c7f7f11` evidence document:

| Criterion | Observed |
|---|---|
| Ordinary authenticated QA | yes |
| Non-admin / no bypass | yes |
| Auth attempts | 1 |
| Upload requests | 1 |
| Bucket | discovery-uploads |
| UID-scoped path | yes (redacted) |
| MIME / size | image/png ~70B |
| Upsert | false |
| HTTP | 403 |
| Error | row-level security policy violation |
| Retry | no |
| Object created | no (0→0) |
| Count | 20→20 |
| Lock | true→true |
| Policy | unchanged |

**Verdict:** `RUNTIME_DENIAL_EVIDENCE_VALID`

---

## 18. SECURITY DEFINER Inventory

| Function | Classification | Lock Required | Lock Present | Grants Safe | Verdict |
|---|---|---:|---:|---:|---|
| `bl_can_create_user_content` | READ_ONLY helper | n/a | n/a | yes | OK |
| `bl_assert_can_create_user_content` | READ_ONLY helper | n/a | n/a | yes | OK |
| `bl_is_release_unlocked` | READ_ONLY helper | n/a | n/a | yes | OK |
| `bl_is_admin_actor` / `bl_can_bypass_release_gate` | ADMIN_ONLY helper | n/a | n/a | yes | OK |
| `bl_set_release_gate_locked` | ADMIN_ONLY | yes (admin gate) | yes | EXECUTE broad; body denies non-admin | OK |
| `bl_register_observation` | USER_CONTENT_WRITE_PROTECTED | yes | yes | authenticated | OK |
| `bl_profiles_prevent_role_self_promotion` | USER_CONTENT_WRITE_PROTECTED | n/a (role integrity) | trigger | OK | OK |
| `rpc_sync_discovery_submission` | ADMIN_ONLY | admin check | admin-only | EXECUTE broad; body ADMIN_REQUIRED | OK |
| `bl_search_public_content` / `bl_match_entities` | READ_ONLY | no | n/a | OK | OK |
| `bl_rebuild_search_documents` | ADMIN/ops | ops | n/a | treat as ADMIN_ONLY | OK |
| `delete_own_account` | OUT_OF_SCOPE_MODERATION | account delete | auth.uid scoped | OK | OK |
| `handle_new_user` / `sync_email_verified` | AUTH lifecycle | n/a | n/a | OK | OK |
| `is_admin` / `is_banned_user` | READ_ONLY | n/a | n/a | OK | OK |
| `rls_auto_enable` | LEGACY_UNUSED/ops | n/a | n/a | OK | OK |

No UNKNOWN_RISK create-path bypass identified.

---

## 19. Grants and RPC Reachability

- Client roles lack INSERT/UPDATE/DELETE on `release_gate`.
- Content tables rely on RLS + restrictive release policies for create paths.
- Broad EXECUTE on several SECURITY DEFINER functions is mitigated by in-function
  auth/admin checks (standard Supabase pattern).

---

## 20. Parallel Policy Bypass Analysis

For create paths under lock:

| Surface | Parallel bypass? |
|---|---|
| Posts INSERT/UPDATE | **NO** (restrictive AND) |
| Reactions INSERT/UPDATE | **NO** |
| Comments INSERT | **NO** |
| Observations INSERT | **NO** |
| Discovery INSERT | **NO** |
| Observation RPC | **NO** (assert before write) |

---

## 21. Aggregate Production Drift Assessment

| Dataset | Point-in-time count | Note |
|---|---:|---|
| posts | 26 | stable vs prior audits |
| post_reactions | 3 | baseline |
| comments | 1 | stable |
| wiki_observations | 2 | stable |
| profiles | 5 | was 4 earlier; +1 consistent with dedicated QA provisioning |
| discovery-uploads objects | 20 | unchanged through E.5B |

No unexplained mutation from E.5B runtime denial test.

---

## 22. S+-01 Closure Criteria

All required criteria met:

1–3 gate core / locked / ordinary cannot unlock  
4–10 protected create paths including discovery + RPC + profile integrity  
11–12 no parallel / SECURITY DEFINER create bypass  
13 runtime denial valid  
14 no unexplained drift  
15 no UNKNOWN_RISK create bypass  

---

## 23. S+-01 Decision

**`SPLUS01_CLOSED`**

---

## 24. S-10 Closure Criteria

Live RLS inventories, grants+policy evaluation, RPC/SECURITY DEFINER review,
storage INSERT lock + runtime proof, and project identity all complete.

---

## 25. S-10 Decision

**`S10_CLOSED`**

---

## 26. Remaining Known Risks

1. Comments UPDATE/DELETE remain possible while locked (prior explicit out-of-scope).
2. Discovery Storage UPDATE/DELETE UID-scoped without release-lock (create path closed).
3. Report-screenshots uploads remain out of discovery lock scope.
4. `TRUNCATE` privilege hygiene on `release_gate` for client roles (cannot unlock;
   fail-closed if row missing).
5. Broad EXECUTE grants on admin RPCs rely on in-function admin checks.

None of the above reopens ordinary-user create-path contribution while locked.

---

## 27. Final Verdict

### `PASS_SPLUS01_AND_S10_FORMALLY_CLOSED`

---

## 28. Commands and Queries Executed

```text
git status / branch / rev-parse / log / remote
git switch -c review/p5-e9g8e6-final-release-lock-audit
list_projects
SELECT release_gate aggregates, columns, constraints
SELECT helper + lock-toggle + observation RPC definitions
SELECT RLS flags + pg_policies for core tables + storage.objects
SELECT storage buckets/counts/owner
SELECT aggregate content counts
SELECT SECURITY DEFINER inventory + key grants + has_table_privilege checks
```

No mutating SQL. No auth. No uploads.

---

## 29. Files Changed

| File | Change |
|---|---|
| `docs/architecture/p5-final-production-release-lock-live-rls-audit.md` | **ADDED** |

---

## 30. No-Write / No-Apply / No-Push / No-Deploy Attestation

| Boundary | Status |
|---|---|
| Production writes | **NONE** |
| SQL/policy apply | **NONE** |
| Lock toggle | **NONE** |
| Push / deploy / launch | **NONE** |
| Secrets / UUIDs / emails in doc | **NONE** |
