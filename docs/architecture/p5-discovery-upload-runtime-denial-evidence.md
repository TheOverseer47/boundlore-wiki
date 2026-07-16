# P5-E.9G.8E.5B — Discovery Upload Runtime Denial Evidence

**Gate:** P5-E.9G.8E.5B  
**Date:** 2026-07-16  
**Target:** `ohkoojpzmptdfyowdgog` (TheOverseer47's Project)  
**Branch:** `review/p5-e9g8e5b-runtime-denial-test`

---

## 1. Executive Result

**Final decision:** `PASS_SINGLE_PRODUCTION_LOCKED_RUNTIME_DENIAL_CONFIRMED`

Exactly one authenticated ordinary QA Storage upload to `discovery-uploads` was
attempted while `contribution_locked = true`. Production returned HTTP **403**
with a row-level security policy violation. No object was created. Discovery
object count remained **20**. Lock and policy remained unchanged.

---

## 2. Authorization Boundary

| Action | Status |
|---|---|
| Single password sign-in | **PERFORMED (once)** |
| Single Storage `.upload` upsert=false | **PERFORMED (once)** |
| Additional upload / retry | **NOT PERFORMED** |
| Policy / SQL / lock mutation | **NOT PERFORMED** |
| Object cleanup | **NOT PERFORMED** (not needed) |
| Push / deploy / launch | **NOT PERFORMED** |
| Full BoundLore website workflow | **NOT USED** |

Execution surface: temporary localhost UI at `127.0.0.1:8765` outside the
repository (not the Create-Post form).

---

## 3. Git Baseline

| Item | Value |
|---|---|
| Branch | `review/p5-e9g8e5b-runtime-denial-test` |
| Baseline HEAD | `332d704` |
| Tracked pre-test changes | none |

---

## 4. Supabase Production Identity

| Check | Result |
|---|---|
| Project name | TheOverseer47's Project |
| Project ref | `ohkoojpzmptdfyowdgog` |
| Staging used | **NO** |

---

## 5. QA Identity Verification

| Check | Result |
|---|---|
| Auth user present / not deleted | **YES** |
| Auth not banned / not anonymous | **YES** |
| Email identity present / confirmed | **YES** (values not recorded) |
| Profile present / not deleted / not banned | **YES** |
| Role | `user` |
| Admin / release-gate bypass | **NO** |
| Account ID matched at session | **YES** (ID not written here) |
| Session JWT role | `authenticated` |

No email, password, UUID, or token documented.

---

## 6. Credential Safety Confirmation

| Rule | Result |
|---|---|
| Credentials entered in browser only | **YES** |
| Password field type=password | **YES** |
| Previously exposed password excluded (checkbox + prior YES) | **YES** |
| Credentials in Cursor chat / Git / logs | **NO** |
| Tokens persisted / printed | **NO** (`persistSession: false`) |

---

## 7. Release-Gate Pre-State

| Field | Value |
|---|---|
| total_rows | 1 |
| canonical_rows | 1 |
| contribution_locked | **true** |

---

## 8. Policy Pre-State

`discovery_upload_authenticated` exactly once:

- PERMISSIVE / INSERT / `{authenticated}`
- WITH CHECK AND of:
  - `bucket_id = 'discovery-uploads'`
  - UID path `split_part(name,'/',1) = auth.uid()::text`
  - `bl_can_create_user_content(auth.uid())`
- No parallel discovery INSERT bypass

---

## 9. Storage Baseline

| Metric | Value |
|---|---:|
| PRE_TEST_DISCOVERY_COUNT | 20 |
| Target path pre-exists | 0 |

---

## 10. Test Artifact

| Field | Value |
|---|---|
| Type | 1×1 PNG in browser memory |
| MIME | `image/png` |
| Approximate size | 70 bytes |
| Upsert | false |

---

## 11. Redacted Target Path

`<QA_UID>/qa/release-lock-denial/p5-e9g8e5-20260716T000855Z.png`

---

## 12. Authentication Result

| Field | Value |
|---|---|
| Auth attempts | **1** |
| Result | success |
| Ordinary QA identity confirmed | **yes** |

---

## 13. Upload Request Count

**1** (server one-shot claim + single client `.upload`)

Local one-shot state after run:

- `auth_claimed = true`
- `upload_claimed = true`
- `completed = true`

---

## 14. Upload Response Classification

| Field | Value |
|---|---|
| HTTP/SDK status | **403** |
| Redacted error class | `new row violates row-level security policy` |
| Upload successful | **false** |
| Classification | RLS denial |

---

## 15. RLS Denial Evidence

| Evidence | Value |
|---|---|
| Status 403 | **YES** |
| RLS / policy violation wording | **YES** |
| `rls_denial_confirmed` | **true** |
| Service Role used | **NO** |
| Retry performed | **NO** |

---

## 16. Exact Object Existence Result

`target_object_count` after attempt: **0**

---

## 17. Storage Count Before and After

| Metric | Before | After |
|---|---:|---:|
| Discovery object count | 20 | 20 |

---

## 18. Release-Gate Post-State

| Field | Value |
|---|---|
| total_rows | 1 |
| canonical_rows | 1 |
| contribution_locked | **true** |

---

## 19. Policy Post-State

Exactly one `discovery_upload_authenticated` row; WITH CHECK unchanged (bucket +
UID path + `bl_can_create_user_content` AND-joined).

---

## 20. Side-Effect Assessment

| Side effect | Occurred |
|---|---|
| Storage object created | **NO** |
| Policy changed | **NO** |
| Lock changed | **NO** |
| User changed | **NO** |
| Other DB mutation from this test | **NO** |
| Cleanup performed | **NO** (unnecessary) |
| Retry performed | **NO** |

---

## 21. Unexpected-Success Handling

Not applicable.

---

## 22. Final Decision

### `PASS_SINGLE_PRODUCTION_LOCKED_RUNTIME_DENIAL_CONFIRMED`

All PASS criteria met: ordinary authenticated QA session, exactly one denied
upload, RLS evidence, no object created, counts and lock/policy preserved.

---

## 23. Commands and Queries Executed

### Git

```text
git status / branch / rev-parse (preflight and closeout)
```

### Supabase MCP (`ohkoojpzmptdfyowdgog` only)

```text
list_projects
SELECT release_gate aggregates (pre/post)
SELECT discovery_upload_authenticated (pre/post)
SELECT storage INSERT policy inventory (pre)
SELECT discovery object counts (pre/post)
SELECT exact target path count (pre/post)
SELECT QA ordinary-user boolean checks (pre)
```

### Local (outside repository)

```text
127.0.0.1:8765 one-shot UI (auth claim + upload claim + result)
```

Terminal one-shot Python client from earlier prep was **not executed**.

---

## 24. Files Changed

| File | Change |
|---|---|
| `docs/architecture/p5-discovery-upload-runtime-denial-evidence.md` | **ADDED** |

No SQL / JS / config repository files modified.

---

## 25. No-Retry / No-Cleanup / No-Push / No-Deploy Attestation

| Boundary | Status |
|---|---|
| Second auth / upload | **NOT PERFORMED** |
| Object cleanup | **NOT PERFORMED** |
| Lock unlock | **NOT PERFORMED** |
| Policy / SQL apply | **NOT PERFORMED** |
| Push / deploy / launch | **NOT PERFORMED** |
| Secrets in this document | **NONE** |
