# P5-E.9G.8E.5A — Discovery Upload Runtime Denial Test Readiness

**Gate:** P5-E.9G.8E.5A  
**Date:** 2026-07-16  
**Target:** `ohkoojpzmptdfyowdgog` (TheOverseer47's Project)  
**Branch:** `review/p5-e9g8e5a-runtime-denial-readiness`

---

## 1. Executive Result

**Final decision:** `CONDITIONALLY_READY_MANUAL_QA_IDENTITY_REQUIRED`

Production structural lock for `discovery_upload_authenticated` remains intact and
safe for a single later locked-denial probe. Git baseline, project identity,
release-gate lock, policy AND-binding, helper fail-closed semantics, bucket MIME
limits, frontend UID path model, and zero-side-effect test design are ready.

**Blocking condition:** no dedicated ordinary `authenticated` QA identity is
documented as already provisioned in tracked project docs. Manual QA identity
selection/provisioning is required before P5-E.9G.8E.5B.

**Not performed in this gate:** login, upload, user create/update, SQL apply,
policy mutation, lock toggle, push, deploy.

---

## 2. Scope and Zero-Write Boundary

| Action | Status |
|---|---|
| Supabase SELECT / catalog reads | **PERFORMED** |
| `list_projects` | **PERFORMED** |
| Frontend/docs static analysis | **PERFORMED** |
| Upload / INSERT / DELETE | **NOT PERFORMED** |
| Auth user create/update/login | **NOT PERFORMED** |
| RPC execution of helpers | **NOT PERFORMED** |
| Policy / lock mutation | **NOT PERFORMED** |
| Bundle / `.env` / backups access | **NOT PERFORMED** |

---

## 3. Git Baseline

| Item | Expected | Actual | Result |
|---|---|---|---|
| Parent branch | `review/p5-e9g8e1-discovery-policy-forensics` | match | **PASS** |
| HEAD at branch create | `859ee9e6b50fb14f10717f2c718d6d68c64d6597` | match | **PASS** |
| Tracked modifications | none | none | **PASS** |
| Review branch | `review/p5-e9g8e5a-runtime-denial-readiness` | created | **PASS** |

Untracked protected artifacts left untouched (`.env*`, `backups/`, QA fixtures).

---

## 4. Bundle/Commit History Verification

| Commit | Message | Present |
|---|---|---|
| `8bacee9` | Assess existing discovery upload policy | **YES** |
| `6d888d5` | Author existing discovery policy transformation | **YES** |
| `b69934b` | Record existing discovery policy review evidence | **YES** |
| `859ee9e` | Verify existing discovery policy release lock | **YES** |

Bundle file not inside repository working tree.

Downloads copy observed (not opened beyond hash): SHA-256
`66efaf0a442bf9ba5f3e65093aeee9e72d70dc6f53fed13d36d33d9377b820aa` — **MATCH**.

**Verdict:** `BUNDLE_HISTORY_PRESENT_FILE_NOT_REQUIRED` (history local; in-repo
file not required).

---

## 5. Supabase Production Identity

| Check | Result |
|---|---|
| Project name | TheOverseer47's Project |
| Project ref | `ohkoojpzmptdfyowdgog` |
| Staging `jzzgoiwfbuwiiyvwgwri` used | **NO** |
| Identity verdict | **CONFIRMED** |

---

## 6. Release-Gate State

| Field | Value |
|---|---|
| total_rows | 1 |
| canonical_rows | 1 |
| canonical_contribution_locked | **true** |

**Verdict:** **PASS**

---

## 7. Existing Discovery Upload Policy Re-Verification

Single row for `discovery_upload_authenticated`:

| Field | Observed |
|---|---|
| schemaname / tablename | `storage` / `objects` |
| permissive | **PERMISSIVE** |
| cmd | **INSERT** |
| roles | `{authenticated}` |
| qual | null |
| with_check | `((bucket_id = 'discovery-uploads'::text) AND (split_part(name, '/'::text, 1) = (auth.uid())::text) AND bl_can_create_user_content(auth.uid()))` |

Condition checklist:

| Condition | Present exactly once | Join |
|---|---|---|
| `bucket_id = 'discovery-uploads'` | **YES** | AND |
| `split_part(name, '/', 1) = auth.uid()::text` | **YES** | AND |
| `bl_can_create_user_content(auth.uid())` | **YES** | AND |

No unexpected extra conjunct. No missing condition. Catalog omits optional
`public.` schema qualifier on the helper call; semantic identity preserved.

**Verdict:** **PASS — NO DRIFT vs E.4 structural close**

---

## 8. Complete Storage INSERT Policy Inventory

| policyname | permissive | roles | bucket scope | Discovery bypass? |
|---|---|---|---|---|
| `Authenticated users can upload report screenshots` | PERMISSIVE | public | `report-screenshots` only | **NO** |
| `avatars_upload_own` | PERMISSIVE | public | `avatars` only | **NO** |
| `discovery_upload_authenticated` | PERMISSIVE | authenticated | `discovery-uploads` + UID + release lock | intentional target |

No fourth INSERT policy. No `WITH CHECK (true)`. No second discovery-admitting policy.

**Verdict:** **NO PARALLEL DISCOVERY BYPASS**

---

## 9. Release-Gate Helper Semantics

| Function | Args | SECURITY DEFINER | Semantics |
|---|---|---|---|
| `bl_can_create_user_content` | `p_actor_id uuid` | yes | null → false; admin bypass via `bl_can_bypass_release_gate`; else requires `bl_is_release_unlocked()` |
| `bl_assert_can_create_user_content` | `p_context text` | yes | raises 42501 when helper false |
| `bl_is_release_unlocked` | none | yes | missing row / null lock / exception → false; unlocked only when `contribution_locked` is false |
| `bl_can_bypass_release_gate` | `p_actor_id uuid` | yes | equals `bl_is_admin_actor(p_actor_id)` |

Assessment:

- Locked (`contribution_locked = true`) → ordinary users **DENY**
- Missing/NULL/error → **fail-closed**
- Client cannot force-unlock via parameters
- Admin bypass is deliberate; planned QA user must be non-admin

Helpers were **definition-only** inspected; not invoked.

**Verdict:** **SAFE FOR RUNTIME DENIAL DESIGN**

---

## 10. Bucket Metadata

| Bucket | Public | File limit | Allowed MIME types |
|---|---|---:|---|
| `avatars` | true | null | null |
| `discovery-uploads` | true | 20971520 | `image/jpeg`, `image/png`, `image/webp`, `application/pdf`, `application/zip`, `text/plain` |
| `report-screenshots` | true | null | null |

---

## 11. Aggregate Object Baseline

| Bucket | Object count |
|---|---:|
| `discovery-uploads` | **20** |
| `avatars` | **0** (absent from GROUP BY) |
| `report-screenshots` | **0** (absent from GROUP BY) |

Matches expected 0 / 20 / 0. No individual object names or paths read.

**Verdict:** **BASELINE STABLE**

---

## 12. Frontend Discovery Upload Path Inventory

| File/Module | Bucket | Path Model | Actor | Assessment |
|---|---|---|---|---|
| `js/create-post.js` → `uploadDiscoveryFiles(userId, files)` | `discovery-uploads` | `{userId}/{timestamp}-{rand}-{cleanedName}` via `.upload(..., { upsert: false })` | Normal authenticated session user id | **EXPECTED_AUTHENTICATED_UID_SCOPED_UPLOAD** |
| `wiki/create-post/index.html` `#postMedia` | same via create-post.js | UI exposes input; accept `image/*,.pdf,.zip,.txt,.webp` | Normal user | **EXPECTED_AUTHENTICATED_UID_SCOPED_UPLOAD** |
| Client release-gate guard | none in create-post.js / create-post page | n/a | n/a | UI does **not** pre-block Storage request |
| `js/support.js` | `report-screenshots` | `{userId}/{timestamp}.{ext}` | Authenticated | **OTHER_BUCKET** |
| Service-role / Edge upload | not found for discovery | — | — | none |

Classification notes:

- Exactly one discovery upload implementation.
- Path first segment is session `user.id` (= `auth.uid()` for policy).
- No service-role discovery upload path.
- UI lock absence means UI could still hit RLS, but multi-step form submit
  muddies “exactly one request” evidence.

**Verdict:** **PATH MODEL SAFE** (`EXPECTED_AUTHENTICATED_UID_SCOPED_UPLOAD`)

---

## 13. QA Identity Availability Assessment

Tracked-doc search for dedicated QA/runtime denial identity:

- E.4 verification doc **requires** a dedicated test user for E.5 conceptually
- No provisioned QA credentials or named ready account in tracked docs
- No auth inventory performed (forbidden)

| Criterion | Result |
|---|---|
| Dedizierter QA-Nutzer dokumentiert as ready | **NO** (concept only) |
| Ordinary authenticated role required | **YES** (design) |
| Admin / service role excluded | **YES** (must exclude) |
| Manual action required | **YES** — select/provision dedicated non-admin QA identity |

**Verdict:** `MANUAL_QA_IDENTITY_SELECTION_REQUIRED`

No emails, UUIDs, or passwords recorded.

---

## 14. Allowed MIME and Size Assessment

Discovery bucket allows `image/png` and caps size at 20 971 520 bytes.

Frontend guide rules typically use ~8 MB max and png/jpeg/webp/pdf/zip/txt;
PNG is both client- and bucket-allowed.

Prefer tiny valid PNG over `text/plain` to avoid MIME-denial ambiguity with
release-lock denial (gate guidance).

---

## 15. Proposed Test Artifact

| Field | Plan |
|---|---|
| Dateityp | 1×1 PNG |
| MIME | `image/png` |
| Geplante Größe | ~68–100 bytes (minimal valid PNG) |
| Inhalt | Deterministic solid 1×1 PNG, no PII |
| Naming uniqueness | UTC timestamp in object path |
| Upsert | **false** / omitted |
| Binary created this gate | **NO** |

Why MIME false-positive excluded: `image/png` is explicitly in
`allowed_mime_types`; size << limit.

---

## 16. Proposed Object Path Pattern

Redacted pattern only:

`<QA_UID>/qa/release-lock-denial/p5-e9g8e5-<UTC_TIMESTAMP>.png`

Rules:

- First segment must equal authenticated QA session `auth.uid()`
- Unique timestamped filename under `qa/release-lock-denial/`
- No overwrite of existing objects
- Neutral cacheControl; no PII metadata

---

## 17. Selected Runtime Test Method

**METHODE B — Lokaler minimaler Supabase-JS-Testclient**

Not Method A (UI): form flow may upload then attempt post INSERT and other
writes; harder to prove exactly one Storage request.

Not Method C (raw REST): higher risk of logging headers/tokens; Method B wraps
the same Storage API with clearer SDK error classes.

---

## 18. Why the Method Exercises RLS

1. Frontend anon client + ordinary authenticated QA JWT (no service role).
2. Exactly one `storage.from('discovery-uploads').upload(path, file, { upsert: false })`.
3. Path UID-scoped so path predicate passes and release-lock predicate is the
   decisive false conjunct while locked.
4. Denied INSERT leaves no object row under that exact path.

---

## 19. Credential and Token Protection

| Rule | Requirement |
|---|---|
| Public URL + anon key | Only from normal frontend config |
| Service role | **FORBIDDEN** |
| QA password / JWT | Never printed, never committed, never pasted into docs |
| Logs | Capture status / redacted error class only |
| Session | Manual auth only in later gate; none now |

---

## 20. Expected Request

| Field | Value |
|---|---|
| Project | `ohkoojpzmptdfyowdgog` |
| Bucket | `discovery-uploads` |
| Method | single `.upload` |
| Upsert | false |
| MIME | `image/png` |
| Path | `<QA_UID>/qa/release-lock-denial/p5-e9g8e5-<UTC_TIMESTAMP>.png` |
| Retries | none |

---

## 21. Expected Denial Evidence

Safe to record later:

- UTC time
- project ref
- bucket
- redacted path pattern
- MIME + byte size
- HTTP/SDK denial class + redacted message (no token/UUID)
- discovery object count before/after
- exact-path existence BOOLEAN/COUNT = 0
- `contribution_locked` before/after = true
- policy catalog unchanged

---

## 22. Before/After Read-only Verification Plan

Before attempt:

1. Reconfirm project ref
2. `contribution_locked = true`
3. Policy with_check unchanged
4. INSERT inventory unchanged
5. Aggregate discovery count
6. Exact planned path COUNT = 0

After denial (or failure):

1. Exact path COUNT = 0
2. Aggregate count unchanged
3. Lock still true
4. Policy still identical
5. No second request fired

---

## 23. False-Positive Exclusions

| Cause | Exclusion handling |
|---|---|
| MIME | Use allowed `image/png` |
| Size | Tiny PNG ≪ 20 MB and client 8 MB rule |
| Session missing / expired | Treat as **INCONCLUSIVE**, not PASS |
| Network / CORS | **INCONCLUSIVE** |
| UI-only block | Avoided by Method B |
| Wrong path / foreign UID | STOP before request |
| Upsert | Forced `false` |
| Admin bypass | Non-admin QA only |

---

## 24. Stop Conditions

Stop immediately on:

- wrong project
- lock not true
- policy drift / extra discovery bypass
- admin or service-role session
- unclear QA identity
- disallowed MIME / non-UID path
- more than one planned write
- tools that would log tokens
- upsert enabled
- preexisting target path
- auth failure before Storage RLS
- network failure without policy signal

---

## 25. Unexpected-Success Procedure

If upload unexpectedly succeeds:

1. Stop immediately; no retry
2. Do not unlock, do not mutate policy, do not auto-delete
3. Capture safe read-only state (counts, lock, policy, exact-path exists)
4. Mark object as unexpected QA artifact
5. Require separate explicit cleanup authorization
6. Leave S+-01 open

---

## 26. Cleanup Authorization Boundary

Cleanup of any accidental object is **NOT AUTHORIZED** in E.5A or automatically
in E.5B. Requires a dedicated later gate with explicit user approval.

---

## 27. Final Readiness Decision

### `CONDITIONALLY_READY_MANUAL_QA_IDENTITY_REQUIRED`

Technical path is ready. Dedicated ordinary authenticated QA identity must be
manually selected/provisioned before E.5B. No login or upload in this gate.

---

## 28. Manual Prerequisites

1. Provide or designate a dedicated non-admin QA account (concept already stated
   in E.4 docs; not yet ready as an operational identity in tracked docs).
2. Confirm account has ordinary `authenticated` role and no admin/bypass flags.
3. Keep production `contribution_locked = true` throughout E.5B.
4. Authorize E.5B explicitly before any upload attempt.

---

## 29. Commands and Queries Executed

### Git

```text
git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline --decorate -8
git remote -v
git cat-file -e <four E.1–E.4 commits>
git branch --list review/p5-e9g8e5a-runtime-denial-readiness
git switch -c review/p5-e9g8e5a-runtime-denial-readiness
git grep (discovery upload / MIME / QA identity terms; tracked only)
```

### Supabase MCP (`ohkoojpzmptdfyowdgog` only)

```text
list_projects
SELECT release_gate aggregate lock state
SELECT discovery_upload_authenticated from pg_policies
SELECT all storage.objects INSERT policies
SELECT helper definitions (bl_can_create_user_content, bl_assert_..., bl_is_release_unlocked, bl_can_bypass_release_gate)
SELECT buckets metadata
SELECT aggregate object counts (no object names)
```

No DDL. No helper execution. No Storage write. No Auth write.

---

## 30. Files Changed

| File | Change |
|---|---|
| `docs/architecture/p5-discovery-upload-runtime-denial-readiness.md` | **ADDED** |

No SQL/JS/config changes.

---

## 31. No-Login / No-Upload / No-Write / No-Push / No-Deploy Attestation

| Boundary | Status |
|---|---|
| Login | **NOT PERFORMED** |
| Upload | **NOT PERFORMED** |
| SQL apply / policy mutation | **NOT PERFORMED** |
| Lock toggle | **NOT PERFORMED** |
| User create/update | **NOT PERFORMED** |
| Push / deploy / launch | **NOT PERFORMED** |
| Secrets / UUIDs / emails documented | **NONE** |
