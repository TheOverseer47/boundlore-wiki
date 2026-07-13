# P5-E.8C Upload Path Disablement Review

**Gate:** P5-E.8C — Upload Path Disablement Review + Frontend Hardening  
**Date:** 2026-07-13  
**HEAD (start):** `9657b0b` — Document storage owner path and bucket scope review  
**Verdict:** **PASS**

---

## 1. Scope / Approval

| Constraint | Status |
|------------|--------|
| User approval for P5-E.8C | **YES** |
| Frontend / QA / docs only | **YES** |
| No SQL apply / DB write / storage apply | **YES** |
| No push / deploy / launch | **YES** |
| No secrets in report | **YES** |

---

## 2. Starting Point

| Item | Status |
|------|--------|
| P5-E.8A.2 | **PASS** — Hybrid option selected |
| Storage Closure | **DEFERRED** |
| Bucket Provisioning | **OPEN** |
| Owner-capable path | **OPEN** |
| Core Release Lock (posts + RPC) | **PASS** on staging |
| Release Lock DB Fixture | **CORE_PASS_STORAGE_DEFERRED** |

---

## 3. Static Upload Path Inventory

| File | Function / UI | Bucket | Feature | Launch required? | Guard before P5-E.8C | Action |
|------|---------------|--------|---------|------------------|----------------------|--------|
| `js/create-post.js` | `#postMedia`, `#contribMedia` | `discovery-uploads` | Discovery/evidence attachments | **No** | Partial (release gate only when locked) | **Hardened** — UI disable + JS guard |
| `js/support.js` | `#reportScreenshot` | `report-screenshots` | Optional bug-report screenshot | **No** | Partial (release gate when locked) | **Hardened** — UI disable + skip upload |
| `js/contribution-flow.js` | `#contribMedia` (dynamic HTML) | `discovery-uploads` | Optional contribution evidence | **No** | None | **Hardened** via create-post panel guard |
| `js/discovery-core.js` | — | — | No storage | **No** | N/A | None |
| `js/guilds-apply.js` | — | — | No storage | **No** | N/A | None |
| `js/main.js` | `#contributeForm` FormData | — | Homepage contact (non-Supabase) | **No** | N/A | Out of scope |
| `wiki/create-post/index.html` | `#postMedia` | `discovery-uploads` | File input | **No** | Release gate disabled file when locked | Disabled while deferred |
| `wiki/support/index.html` | `#reportScreenshot` | `report-screenshots` | File input | **No** | Release gate when locked | Disabled while deferred |

### Findings

- **Only two Supabase Storage upload paths** exist: `discovery-uploads` (create-post) and `report-screenshots` (support).
- Release gate already disabled file inputs when **locked**, but did **not** block uploads when gate unlocked while storage still deferred.
- `initCreatePermissions()` wrapper was missing in `create-post.js` (regression from P5-E.3) — **restored** so page init and guards run.

---

## 4. Disablement / Hardening Changes

### Files changed

| File | Change |
|------|--------|
| `js/release-gate-client.js` | Storage defer helpers (`p5-e8c`): `isStorageUploadsDeferred`, `assertCanUploadStorage`, `applyStorageUploadDisablement`, `renderStorageUploadUnavailableNotice` |
| `js/create-post.js` | `applyStorageUploadGuardsCP`, `stripDeferredStorageFilesCP`, guard in `uploadDiscoveryFiles`, restore `initCreatePermissions` |
| `js/support.js` | Storage disablement on init; skip screenshot upload when deferred (report continues) |
| `wiki/create-post/index.html` | Cache-bust `release-gate-client.js?v=p5-e8c` |
| `wiki/support/index.html` | Cache-bust `release-gate-client.js?v=p5-e8c` |
| `wiki/admin/index.html` | Cache-bust `release-gate-client.js?v=p5-e8c` |
| `wiki/edit-post/index.html` | Cache-bust `release-gate-client.js?v=p5-e8c` |
| `qa/p5-upload-disablement-fixtures.html` | New fixture |
| `qa/p5-upload-disablement-fixtures.js` | New fixture (24 checks) |
| `qa/p5-release-lock-ui-fixtures.js` | Version check updated to `p5-e8c` |
| `qa/p5-release-lock-ui-fixtures.html` | Cache-bust update |

### Guard semantics

| Layer | Behavior |
|-------|----------|
| **UI** | All `input[type=file]` disabled while `STORAGE_UPLOADS_DEFERRED=true` |
| **Notice** | *"Uploads are temporarily unavailable before release. You can continue without attachments."* |
| **JS (create-post)** | `stripDeferredStorageFilesCP()` strips files before submit; `uploadDiscoveryFiles()` fail-closed before `storage.from()` |
| **JS (support)** | Screenshot upload skipped when deferred; report submits without attachment |
| **Fail-closed** | Unknown/deferred → no Supabase Storage calls |

### No SQL / DB / storage changes

---

## 5. QA Fixture Evidence

**Server:** `http://localhost:8081` (8080 unreachable)

| Fixture | Result |
|---------|--------|
| Upload Disablement (`p5-upload-disablement-fixtures`) | **24/24 PASS** |
| Release Lock DB | **CORE_PASS_STORAGE_DEFERRED** — 32/32 core, 2 DEFERRED |
| Release Lock UI | **30/30 PASS** |
| Notification | **24/24 PASS** |
| Observation RPC | **17/17 PASS** |
| Sanitization | **45/45 PASS** |

### Regression smoke (8081)

| Route | Result |
|-------|--------|
| `/` | Loads |
| `/wiki/browse/` | Loads |
| `/wiki/search/?q=monster` | Loads (S-06 recall gap unchanged) |
| `/wiki/post/?slug=does-not-exist-99999` | Loads |
| `/wiki/create-post/` | Loads; `#postMedia` disabled; storage notice visible |
| `/wiki/admin/` | Loads |
| `/wiki/support/` | Loads |

No console errors observed on fixture pages. No production connection. No push/deploy.

---

## 6. Remaining Storage Gaps

| Gap | Status |
|-----|--------|
| `release_gate_storage_policy_deferred.sql` | **Not applied** |
| `discovery-uploads` bucket on staging | **Missing** |
| `report-screenshots` SQL/policies | **Unresolved** (NOT TESTED) |
| Owner-capable path for `storage.objects` | **OPEN** |
| Storage Closure | **DEFERRED** |

Upload paths are **disabled/hardened** in frontend; DB-layer storage policy remains future work (P5-E.8A.4 / P5-E.8A.3).

---

## 7. Impact on S+ Status

| Finding | Status |
|---------|--------|
| S+-01 Core public writes (posts + RPC) | **PASS** |
| S+-01 Storage upload lock (DB policy) | **DEFERRED** |
| S+-01 Storage upload paths (frontend) | **Disabled** while deferred |
| S+ Staging Evidence | **PARTIAL** — storage DB closure open; upload paths no longer reachable via UI/JS |
| Production Closure | **NOT CLOSED** |

---

## 8. Impact on Product Activation

**Product-Activation-Ready: FAIL** (unchanged)

| Blocker | Status |
|---------|--------|
| S+-03 runtime/production | Open |
| Production closure | Open |
| S-level blockers (SEO, S-06, backup, monitoring) | Open |
| Storage DB closure | Open — but **no longer MVP-blocking for locked-state** if upload disablement accepted |

Storage may be treatable as **non-MVP** while release gate locked and upload paths disabled — requires explicit Product-Activation decision.

---

## 9. Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.8C** | **PASS** |
| Upload Path Disablement | **PASS** |
| Storage Closure (DB) | **DEFERRED** |
| Bucket Provisioning | **OPEN** |
| Owner-Capable Path | **OPEN** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommended next gate

**P5-E.8A.4** — Owner-Capable Support/Tooling Investigation (for future storage closure before unlock), or **S+-03 Runtime Closure Plan** / **Product-Activation Gap Review** on other blockers.

Continue **no push / deploy / launch**.

---

*Document version: P5-E.8C PASS. No secrets. No DB access.*
