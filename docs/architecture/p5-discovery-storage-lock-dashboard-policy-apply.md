# P5-E.9G.8D-R3 — Discovery Storage Lock Dashboard Policy Apply

**Gate:** P5-E.9G.8D-R3  
**Date:** 2026-07-15  
**Target:** `ohkoojpzmptdfyowdgog` (TheOverseer47's Project)

---

## 1. Executive Result

**Final decision:** `STOP_UI_RESTRICTIVE_POLICY_UNSUPPORTED`

Git and SQL file identity preflight **PASS**. Production read-only preflight **PASS**. Dashboard policy worksheet prepared for manual UI creation.

**Manual dashboard step stopped:** Supabase Dashboard SQL preview generated `AS PERMISSIVE` instead of required `AS RESTRICTIVE`. Policy **not saved** per gate stop rule.

Post-stop read-only verification confirms target policy **still absent** and no production drift observed.

**Discovery storage lock remains NOT APPLIED.**

---

## 2. Authorization

Authorized scope:

- Prepare exact dashboard policy worksheet from `supabase/release_gate_storage_policy_deferred.sql`
- Manual creation of exactly one RESTRICTIVE INSERT policy via Supabase Dashboard UI
- Read-only pre/post catalog verification only

Not authorized and not performed:

- SQL Editor apply, MCP DDL, `apply_migration`, owner/role changes, policy edits/deletes, test uploads, lock toggle, push, deploy

---

## 3. Git and SQL File Identity

| Item | Expected | Actual | Result |
|---|---|---|---|
| Branch | `review/p5-e9g8d-r3-discovery-storage-policy-ui` | `review/p5-e9g8d-r3-discovery-storage-policy-ui` | **MATCH** |
| Baseline HEAD | `d8e6af9` | `d8e6af9` | **MATCH** |
| SQL file hash | `e41ab2d0a89944fe63f0d1ec01603fe35862cf4e` | `e41ab2d0a89944fe63f0d1ec01603fe35862cf4e` | **MATCH** |
| SQL file modified | no | no | **PASS** |

---

## 4. Supabase Project Identity

| Check | Result |
|---|---|
| Project ref | `ohkoojpzmptdfyowdgog` |
| Project name | TheOverseer47's Project |
| Staging accessed | **NO** |

---

## 5. Pre-Apply State

| Check | Result |
|---|---|
| Target policy absent | **YES** |
| `contribution_locked` | **true** (1 canonical row) |
| `storage.objects` RLS | enabled |
| `discovery_upload_authenticated` | present (UID path-scoped) |
| `discovery-uploads` bucket | present |
| Discovery object count | 20 |
| Report object count | 0 |

**Preflight verdict:** **PASS**

---

## 6. Extracted Policy Worksheet

| Field | Value |
|---|---|
| Table | `storage.objects` |
| Policy name | `storage_discovery_uploads_release_gate_insert_restrictive` |
| Operation | `INSERT` |
| Policy behavior | **RESTRICTIVE** (required) |
| Target roles | `authenticated` |
| USING | *(none)* |
| WITH CHECK | `bucket_id <> 'discovery-uploads' or public.bl_can_create_user_content(auth.uid())` |
| Release-lock helper | `public.bl_can_create_user_content(auth.uid())` |
| Bucket scope | Non-`discovery-uploads` buckets pass; `discovery-uploads` gated by lock helper |

**Expected SQL preview:**

```sql
CREATE POLICY storage_discovery_uploads_release_gate_insert_restrictive
ON storage.objects
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id <> 'discovery-uploads'
  or public.bl_can_create_user_content(auth.uid())
);
```

Dashboard UI must not include `BEGIN`/`COMMIT`, `DROP POLICY`, or `COMMENT ON POLICY` from source file.

---

## 7. Dashboard Path

Intended path:

1. TheOverseer47's Project (`ohkoojpzmptdfyowdgog`)
2. Storage → Policies → OBJECTS
3. New custom INSERT policy with RESTRICTIVE behavior

---

## 8. Restrictive-Behavior Proof

**User-reported dashboard preview:**

- Generated: `AS PERMISSIVE`
- Required: `AS RESTRICTIVE`
- RESTRICTIVE option / SQL preview confirmation: **NOT ACHIEVED**

Per gate rule `STOP_UI_RESTRICTIVE_POLICY_UNSUPPORTED`: policy **not saved**.

---

## 9. Manual Creation Result

| Item | Value |
|---|---|
| Save actions | **0** |
| Policy saved | **NO** |
| Error | UI preview `AS PERMISSIVE` — RESTRICTIVE unsupported/unconfirmable |
| Existing policies modified | **NO** (user attestation + catalog verify) |
| Buckets modified | **NO** |
| Storage objects modified | **NO** |

---

## 10. Post-Apply Policy Evidence

Post-stop read-only catalog (MCP `execute_sql`):

**Target policy query:** zero rows — `storage_discovery_uploads_release_gate_insert_restrictive` **ABSENT**.

**All INSERT policies on `storage.objects` (unchanged set):**

| policyname | permissive | roles | with_check (summary) |
|---|---|---|---|
| `Authenticated users can upload report screenshots` | PERMISSIVE | public | report-screenshots + authenticated role |
| `avatars_upload_own` | PERMISSIVE | public | avatars + UID folder match |
| `discovery_upload_authenticated` | PERMISSIVE | authenticated | discovery-uploads + UID path prefix |

No new policy. No restrictive companion on `discovery-uploads`.

---

## 11. Parallel Policy Analysis

**Residual bypass remains:**

- `discovery_upload_authenticated` permissive INSERT still allows path-scoped uploads to `discovery-uploads` without release-lock gate.
- Intended restrictive AND companion policy not created.

---

## 12. Release-Gate Preservation

| Check | Result |
|---|---|
| `contribution_locked` | **true** (unchanged) |
| Canonical release_gate rows | 1 |

No mutation in this gate.

---

## 13. Bucket and Object Integrity

| Bucket | Metadata changed | Object count |
|---|---|---:|
| `discovery-uploads` | **NO** | 20 (unchanged) |
| `report-screenshots` | **NO** | 0 (unchanged) |

---

## 14. No-Mutation-Test Limitation

`NO_MUTATION_RUNTIME_PROBE_BY_DESIGN`

No test upload, storage INSERT/DELETE, RPC call, or lock toggle performed.

---

## 15. Final Decision

### `STOP_UI_RESTRICTIVE_POLICY_UNSUPPORTED`

Supabase Dashboard policy editor SQL preview produced `AS PERMISSIVE` instead of required `AS RESTRICTIVE`. Policy not saved. Read-only post-stop verification confirms unchanged production state and absent target policy.

**Prior blocked paths (context):**

- R1 MCP `apply_migration`: `42501 must be owner of relation objects`
- R2 owner preflight: `current_user_is_table_owner = false`
- R3 dashboard UI: RESTRICTIVE behavior not supported in preview

---

## 16. No-Push / No-Deploy Attestation

| Boundary | Status |
|---|---|
| Dashboard policy save | **NOT PERFORMED** (UI stop) |
| SQL Editor / MCP DDL | **NOT PERFORMED** |
| Existing policy/bucket/object changes | **NOT PERFORMED** |
| Git push | **NOT PERFORMED** |
| Deploy / launch / route cutover | **NOT PERFORMED** |
