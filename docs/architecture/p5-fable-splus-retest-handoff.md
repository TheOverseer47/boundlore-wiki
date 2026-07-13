# P5-F.2 Fable S+ Security Retest Handoff Package

**Gate:** P5-F.2 — Fable Retest Handoff Package  
**Date:** 2026-07-13  
**Current repo HEAD:** `f4e9fa4` — Correct Fable retest HEAD reference  
**S+ baseline commit:** `5907174` — Document Fable S+ retest handoff  
**Branch:** `main`  
**Type:** Docs-only handoff — **no Fable retest executed in this gate**

> **HEAD note for Fable:** `f4e9fa4` is a docs-only correction commit that updates HEAD references in this handoff package only. It contains **no** JS/HTML/CSS/SQL/Supabase/fixture/data changes. Accept `f4e9fa4` as the legitimate working tree; verify the S+ security baseline through `5907174` inclusive; treat `f4e9fa4` as handoff metadata correction only.

---

## 1. Purpose

This document hands off the P5 S+ baseline state to **Fable** for an **independent S+ Security Retest**.

| Principle | Status |
|-----------|--------|
| Scope | S+ Security Retest only — **not** a full launch audit |
| No push / deploy / launch | `[x]` required |
| No DB application | `[x]` required |
| No production claims | `[x]` required |
| Goal | Independent verification that the four S+ baselines in the repo are coherent, fail-closed, and supported by evidence |

**Authoritative prior gate:** `docs/architecture/p5-splus-combined-retest.md` (P5-F.1)

**Companion prompt:** `docs/architecture/p5-fable-splus-retest-prompt.md`  
**Optional checklist:** `docs/architecture/p5-fable-splus-retest-checklist.md`

---

## 2. Current Repo State

| Item | Value |
|------|-------|
| Current repo HEAD | `f4e9fa4` — Correct Fable retest HEAD reference (docs-only) |
| S+ baseline commit | `5907174` — Document Fable S+ retest handoff |
| `f4e9fa4` scope | HEAD-reference correction in handoff docs only — no security-relevant file changes |
| Branch | `main` |
| Working Tree expectation | Clean except `qa/e2e-baseline-bmeta.snapshot.json` untracked (do not commit) |
| Deployment freeze | **active** |
| boundlore.com | **untouched** |
| Foundation-Ready | **PASS** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| S+ local/repo baseline retest (P5-F.1) | **PASS** |
| S+ production closure | **NOT TESTED / NOT CLOSED** |

**Prior acceptance gates (repo level):**

| Gate | Finding | Status |
|------|---------|--------|
| P5-B.2 | S+-02 Notification Injection | baseline accepted |
| P5-C.2 | S+-04 Observation RPC Gate | baseline accepted |
| P5-D.2 | S+-03 HTML Sanitization | baseline accepted |
| P5-E.4 | S+-01 Release Lock | baseline accepted |
| P5-F.1 | All four S+ combined | combined baseline retested |

---

## 3. Strict Retest Scope

### Fable MUST verify

| Finding | ID |
|---------|-----|
| Server-side Release Lock | S+-01 |
| Notification Injection | S+-02 |
| HTML Sanitization / Stored-XSS | S+-03 |
| Observation RPC Gate Bypass | S+-04 |

### Fable MUST NOT

| Forbidden action | Reason |
|------------------|--------|
| Execute SQL / apply migrations | Staged DB apply is P5-E.5+ with explicit approval |
| Deploy Supabase / push / launch | Deployment freeze |
| Write data (posts, notifications, queue actions) | Read-only retest |
| Execute unlock / re-lock | Admin RPC not in scope for repo retest |
| Approve / reject / delete / repair | Moderation actions forbidden |
| Fix S- or A+-findings | Out of S+ scope |
| Claim Product Activation readiness | Requires additional gates |
| Claim Public Launch readiness | Requires P5-F + Fable Retest 1 + S-blockers |

**URL base for local tests:** `http://localhost:8080` only (not `127.0.0.1`).

---

## 4. S+ Status Matrix

| Finding | Original Risk | Implemented Baseline | Local Acceptance | Production Closure | Remaining Evidence |
|---------|---------------|---------------------|------------------|-------------------|-------------------|
| **S+-02** Notification Injection | Authenticated users could insert notifications for foreign `user_id`; unsafe `target_url` rendering risk | SQL insert policy `user_id = auth.uid()` in `admin_dashboard_notifications.sql`; `BoundLoreNotificationUrlSafety` helper (`p5-b1`); `auth-nav.js` / `notifications.js` sanitize URLs before render/insert | P5-B.2 accepted; P5-F.1 retested; Notification fixture **24/24 PASS** | **NOT CLOSED** | Apply SQL in staging; negative foreign `user_id` insert test; `target_url` runtime tests with authenticated users |
| **S+-04** Observation RPC Gate | `SECURITY DEFINER` `bl_register_observation` could bypass Tutorial Ack and future Release Lock | `auth.uid()` required; `user_submission_acks` gate before writes; `bl_assert_can_create_user_content` release assertion before posts INSERT; `SECURITY DEFINER` with `search_path = public` | P5-C.2 accepted; P5-F.1 retested; Observation fixture **17/17 PASS** | **NOT CLOSED** | Apply SQL in staging; negative RPC test without ack; negative RPC test while release locked; confirm RPC cannot bypass direct RLS |
| **S+-03** HTML Sanitization | Stored post body/content rendered through unsafe `innerHTML`; no central sanitizer | `BoundLoreContentSafety` (`p5-d1`); strict DOMParser allowlist; unsafe tags/events/URLs blocked; `post-detail` / `create-post` / `edit-post` / `avatar-utils` / admin sinks guarded | P5-D.2 accepted; P5-F.1 retested; Sanitization fixture **45/45 PASS** | **NOT CLOSED** | Runtime stored-content XSS retest in staging; no server-side sanitizer yet; no migration of previously stored content; authenticated create/edit journey retest |
| **S+-01** Release Lock | No server-side fail-closed pre-release content lock; Patch Mode was client-only / fail-open | `release_gate_lock.sql` baseline; default locked; missing config locked; fail-closed helpers; restrictive posts/storage policies; `bl_register_observation` release assertion; `BoundLoreReleaseGateClient` (`p5-e3`); create/edit/support guards; admin status/unlock/relock UI prepared (not executed) | P5-E.4 accepted; P5-F.1 retested; Release Lock DB fixture **34/34 PASS**; Release Lock UI fixture **30/30 PASS** | **NOT CLOSED** | Apply SQL in isolated staging; negative direct API posts insert while locked; negative RPC while locked; negative storage upload while locked; missing `release_gate` row test; admin unlock/relock test with audit; no auto-publish test |

---

## 5. Evidence File Map

| Area | Files Fable must inspect | Why |
|------|--------------------------|-----|
| Notification SQL | `supabase/admin_dashboard_notifications.sql` | RLS insert policy `user_id = auth.uid()`; `target_url` safety sketch |
| Notification URL Safety | `js/notification-url-safety.js`, `js/notifications.js`, `js/auth-nav.js` | Scheme policy; render/insert guards |
| Observation RPC SQL | `supabase/phase_a_observations_foundation.sql` | `bl_register_observation`; ack gate; release assert before posts INSERT |
| Content Safety Utility | `js/content-safety.js` | Central `BoundLoreContentSafety` (`p5-d1`); allowlist + URL policy |
| Post Detail Rendering | `js/post-detail.js` | Sanitized body render; no raw `postBody.innerHTML = cleanContent` |
| Create/Edit Sanitization | `js/create-post.js`, `js/edit-post.js` | Quill outgoing sanitization |
| Avatar Safety | `js/avatar-utils.js` | `sanitizeImageSrc` for avatar URLs |
| Admin Sanitization | `wiki/admin/index.html` | Compose/preview sinks use `sanitizeRichTextHtml` |
| Release Gate SQL | `supabase/release_gate_lock.sql` | `release_gate`, helpers, restrictive RLS, admin RPC |
| ReleaseGateClient | `js/release-gate-client.js` | Fail-closed client; `shouldAllowClientBypass() === false` |
| Create/Edit/Support Lock Guards | `js/create-post.js`, `js/edit-post.js`, `js/support.js`, `wiki/create-post/index.html`, `wiki/edit-post/index.html`, `wiki/support/index.html` | Pre-release UX guards |
| Admin Release Gate Panel | `wiki/admin/index.html` | Status panel + unlock/relock UI (do not execute) |
| QA Fixtures | `qa/p5-*-security-fixtures.html` + `.js` (5 pairs) | Static/helper verification harnesses |
| Retest Docs | `docs/architecture/p5-splus-combined-retest.md`, `docs/architecture/p5-splus-remediation-plan.md`, `docs/architecture/p5-release-lock-plan.md`, `docs/architecture/current-code-gap-notes.md`, `qa/e2e-content-matrix.md` | Gate history, acceptance criteria, NOT TESTED items |

---

## 6. Local Fixture Map

Serve repo root with no-cache HTTP on `http://localhost:8080`. Hard refresh (Ctrl+F5) before reading results.

| Fixture | URL | Expected | Purpose |
|---------|-----|----------|---------|
| Notification | `/qa/p5-notification-security-fixtures.html` | **24/24 PASS** | `BoundLoreNotificationUrlSafety` scheme corpus |
| Observation RPC | `/qa/p5-observation-rpc-security-fixtures.html` | **17/17 PASS** | Static SQL pattern checks for RPC gate |
| Sanitization | `/qa/p5-sanitization-security-fixtures.html` | **45/45 PASS** | `BoundLoreContentSafety` helper tests |
| Release Lock DB | `/qa/p5-release-lock-db-security-fixtures.html` | **34/34 PASS** | Static SQL fetch for release gate baseline |
| Release Lock UI | `/qa/p5-release-lock-ui-fixtures.html` | **30/30 PASS** | `BoundLoreReleaseGateClient` fake-state tests |

**Expected fixture metadata:** `allPass` true, `failCount` 0, no Supabase client loaded, no console errors from P5 baselines.

**Sample no-cache server (PowerShell):**

```powershell
cd C:\Users\Julius\Documents\GitHub\boundlore-wiki
$code = @'
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

class H(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

print("Serving no-cache on http://localhost:8080")
ThreadingHTTPServer(("localhost", 8080), H).serve_forever()
'@
$code | py -
```

---

## 7. Recommended Fable Test Procedure

### A) Read-only repo verification

1. `git status` — clean except untracked `qa/e2e-baseline-bmeta.snapshot.json`
2. `git rev-parse --short HEAD` — expect `f4e9fa4` on `main` (docs-only HEAD-reference fix)
3. `git log --oneline -n 5` — confirm `5907174` is the S+ handoff baseline; `f4e9fa4` only corrects HEAD strings
4. `git log --oneline -n 20` — confirm P5-B through P5-F.1 gate commits present
5. Inspect all files in §5 Evidence File Map
6. Verify no staged changes; no push/deploy commands run

### B) Run local no-cache server

- Bind to `localhost:8080` only
- Hard refresh all fixture URLs

### C) Fixture verification

- All five fixtures PASS at expected counts (§6)
- No console errors
- Confirm no data writes (fixtures are static/helper-only)

### D) Static security checks

| Check | Finding |
|-------|---------|
| `notifications_insert_authenticated` → `user_id = auth.uid()` | S+-02 |
| No unsafe `target_url` href (`javascript:`, `data:`, etc.) | S+-02 |
| `user_submission_acks` gate before posts write in RPC | S+-04 |
| `bl_assert_can_create_user_content` before posts INSERT | S+-04 |
| `sanitizeRichTextHtml` before body `innerHTML` render | S+-03 |
| No legacy `postBody.innerHTML = cleanContent` raw sink | S+-03 |
| `release_gate` default locked; missing config locked | S+-01 |
| `shouldAllowClientBypass()` always false | S+-01 |
| No `service_role` in `js/` or `wiki/` client code | Global |
| No auto-publish / auto-approve runtime actions | S+-01 |

### E) Standard regression (route smoke)

| Route | Notes |
|-------|-------|
| `/` | Homepage loads |
| `/wiki/browse/` | Browse loads |
| `/wiki/search/?q=monster` | Known S-06 recall gap (0 hits); no crash |
| `/wiki/search/?q=ogre` | Finds hits |
| `/wiki/search/?q=%3Cimg%20src=x%20onerror=alert(1)%3E` | Escaped; no script |
| `/wiki/post/?slug=qa-ogre-mage-1103f2` | QA Ogre loads |
| `/wiki/post/?slug=qa-staff-of-fire-2b742628` | QA Staff loads |
| `/wiki/post/?slug=qa-ember-shard-511160` | QA Ember loads |
| `/wiki/post/?slug=does-not-exist-99999` | Graceful not found |
| `/wiki/create-post/` | Pre-release lock UX or fail-closed submit |
| `/wiki/admin/` | Access Denied / login (anon smoke) |

---

## 8. Required Fable Verdict Format

Fable must report using this structure:

### Overall

- **S+ repo baseline retest:** PASS / PARTIAL / FAIL
- **S+ production closure:** NOT TESTED (unless staged DB apply explicitly performed with user approval)

### Per finding

| Finding | Repo baseline verdict | Production closure |
|---------|----------------------|-------------------|
| S+-01 | PASS / PARTIAL / FAIL | NOT TESTED / NOT CLOSED |
| S+-02 | PASS / PARTIAL / FAIL | NOT TESTED / NOT CLOSED |
| S+-03 | PASS / PARTIAL / FAIL | NOT TESTED / NOT CLOSED |
| S+-04 | PASS / PARTIAL / FAIL | NOT TESTED / NOT CLOSED |

### Evidence section

- Files inspected (list)
- Fixtures run (URL + pass count)
- Static checks (pass/fail per check)
- Regression routes (pass/fail)
- Console errors observed (if any)

### Remaining blockers (must list even on PASS)

- Live-RLS
- Live-RPC
- Storage enforcement (live)
- Server-side sanitizer absence
- Stored historical content migration
- Production security headers
- Backup/restore evidence
- Monitoring/error-tracking
- Auth/admin authenticated journeys

### Final verdict discipline

| Dimension | Expected unless new staged evidence |
|-----------|--------------------------------------|
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

Distinguish clearly:

- **repo baseline accepted** — file/fixture/static evidence in git
- **staged accepted** — requires P5-E.5+ with explicit approval
- **production closed** — requires live negative tests + applied SQL
- **launch ready** — requires all S+ closed + S-blockers + Fable Final Audit

---

## 9. Explicit Non-Claims

The BoundLore team **does not claim**:

| Non-claim | Status |
|-----------|--------|
| Production closure of S+-01..04 | **Not claimed** |
| SQL has been applied to any environment | **Not claimed** |
| Live-RLS works | **Not claimed** |
| Live-RPC enforcement works | **Not claimed** |
| Storage enforcement works live | **Not claimed** |
| Server-side HTML sanitization exists | **Not claimed** |
| Stored historical content was migrated | **Not claimed** |
| Product Activation readiness | **Not claimed** |
| Launch readiness | **Not claimed** |
| Fable retest already passed | **Not claimed** — this package is handoff only |

---

## 10. Next Gate Options After Fable

### Option A — Fable PASSes repo S+ retest

- Proceed to **P5-E.5 Staged DB Application & Negative RLS/RPC Tests**
- **Only with explicit user approval**
- Still no production deploy
- Live-RLS/Live-RPC/storage tests become in-scope in staging only

### Option B — Fable finds repo issues (PARTIAL / FAIL)

Return to the exact failing P5 subgate:

| Finding | Subgate |
|---------|---------|
| S+-02 | P5-B |
| S+-04 | P5-C |
| S+-03 | P5-D |
| S+-01 | P5-E |

Fix, re-accept, re-run P5-F.1 combined retest, then re-handoff.

### Option C — User wants no DB work yet

- Pause after P5-F.2
- **NO-GO** preserved
- Repo baselines remain accepted but not production-closed

---

## Related Documents

| Document | Role |
|----------|------|
| `p5-fable-splus-retest-prompt.md` | Copy-paste prompt for Fable |
| `p5-fable-splus-retest-checklist.md` | Short checkbox list |
| `p5-splus-combined-retest.md` | P5-F.1 authoritative combined retest |
| `p5-splus-remediation-plan.md` | Full P5 gate plan + acceptance criteria |
| `p5-release-lock-plan.md` | S+-01 architecture detail |

---

*Document version: P5-F.2 handoff package. Docs-only gate. No app/SQL/data changes.*
