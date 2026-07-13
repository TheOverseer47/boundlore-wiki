# P5-F.1 Combined S+ Security Retest

**Gate:** P5-F.1 — Combined S+ Security Retest Gate  
**Date:** 2026-07-13  
**HEAD (start):** `c03ddfd` — Document release gate acceptance  
**Branch:** `main`  
**Scope:** Repository / local retest only — **no production**

---

## 1. Status and Scope

This gate re-verifies all four S+ launch blockers together after individual P5-B through P5-E acceptance sweeps.

| Constraint | Status |
|------------|--------|
| Repo / local retest only | `[x]` |
| No production / boundlore.com changes | `[x]` |
| No SQL apply / DB migration | `[x]` |
| No Supabase writes | `[x]` |
| No RPC calls | `[x]` |
| No notification / post / queue writes | `[x]` |
| No unlock / re-lock execution | `[x]` |
| No push / deploy / launch | `[x]` |
| Deployment freeze | **active** |
| URL base | `http://localhost:8080` only (not `127.0.0.1`) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

S+ findings may be marked **combined baseline retested** at repo level. They must **not** be marked **production-closed**. Live-RLS, Live-RPC, and storage real enforcement remain **NOT TESTED** until an explicit DB/staging gate.

**Next gate:** P5-F.2 Fable Retest Handoff Package.

---

## 2. S+ Finding Matrix

| Finding | Baseline Gate | Acceptance Gate | Repo Status | Production Status | Remaining Evidence |
|---------|---------------|-----------------|-------------|-------------------|-------------------|
| S+-02 Notification Injection | P5-B.1 | P5-B.2 | baseline accepted; **combined baseline retested** | **NOT CLOSED** | DB application + negative RLS test |
| S+-04 Observation RPC Gate | P5-C.1 | P5-C.2 | baseline accepted; **combined baseline retested** | **NOT CLOSED** | DB application + negative RPC test + `release_gate` active |
| S+-03 HTML Sanitization | P5-D.1 | P5-D.2 | baseline accepted; **combined baseline retested** | **NOT CLOSED** | stored-content runtime retest / no server-side sanitizer / no content migration |
| S+-01 Server-side Release Lock | P5-E.2 / P5-E.3 | P5-E.4 | baseline accepted; **combined baseline retested** | **NOT CLOSED** | staged DB apply + negative RLS/RPC/storage tests |

---

## 3. Fixture Results

All fixtures served from `http://localhost:8080`. Static / helper tests only — no Supabase client, no auth, no writes.

| Fixture | URL | Expected PASS | Actual PASS | Result | Notes |
|---------|-----|---------------|-------------|--------|-------|
| P5 Notification Fixture | `/qa/p5-notification-security-fixtures.html` | 24 | 24 | **PASS** | `allPass` true, `failCount` 0, version `p5-b1` |
| P5 Observation RPC Fixture | `/qa/p5-observation-rpc-security-fixtures.html` | 17 | 17 | **PASS** | `allPass` true, `failCount` 0; static SQL pattern checks |
| P5 Sanitization Fixture | `/qa/p5-sanitization-security-fixtures.html` | 45 | 45 | **PASS** | `allPass` true, `failCount` 0; `BoundLoreContentSafety` helper tests |
| P5 Release Lock DB Fixture | `/qa/p5-release-lock-db-security-fixtures.html` | 34 | 34 | **PASS** | `allPass` true, `failCount` 0; static SQL fetch only |
| P5 Release Lock UI Fixture | `/qa/p5-release-lock-ui-fixtures.html` | 30 | 30 | **PASS** | `allPass` true, `failCount` 0; fake states only, no unlock executed |

No console errors from P5 security baselines observed during fixture load. No optional combined overview fixture created — results documented here.

---

## 4. Static Retest Results

### Notification RLS / URL Safety (S+-02)

| Check | Result | Evidence |
|-------|--------|----------|
| `notifications_insert_authenticated` policy | **PASS** | `supabase/admin_dashboard_notifications.sql` — `WITH CHECK (user_id = auth.uid())` |
| `BoundLoreNotificationUrlSafety` module | **PASS** | `js/notification-url-safety.js`; used in `js/notifications.js`, `js/auth-nav.js` |
| `shouldAllowUnsafeNotificationUrl()` fail-closed | **PASS** | Always `false` in fixture + module |
| `javascript:` in notification URL safety | **PASS** | Blocked in scheme policy; no unsafe allow in `notification-url-safety.js` |

### Observation RPC Ack + Release Assert (S+-04)

| Check | Result | Evidence |
|-------|--------|----------|
| `bl_register_observation` exists | **PASS** | `supabase/phase_a_observations_foundation.sql` |
| `user_submission_acks` tutorial-ack gate | **PASS** | Ack query before posts INSERT |
| `bl_assert_can_create_user_content` before INSERT | **PASS** | `perform public.bl_assert_can_create_user_content('bl_register_observation');` before posts write |
| Direct `INSERT INTO public.posts` bypass | **PASS** | No ungated insert path in observation RPC file |

### HTML Sanitization / URL Safety (S+-03)

| Check | Result | Evidence |
|-------|--------|----------|
| `BoundLoreContentSafety` central module | **PASS** | `js/content-safety.js` (`p5-d1`) |
| `sanitizeRichTextHtml` in sinks | **PASS** | `post-detail.js`, `create-post.js`, `edit-post.js`, `wiki/admin/index.html` |
| `sanitizeImageSrc` for avatars/media | **PASS** | `avatar-utils.js`, admin compose |
| Legacy `postBody.innerHTML = cleanContent` raw sink | **PASS** | **Not present** — `post-detail.js` uses sanitized path |
| Server-side sanitizer | **NOT TESTED** | Out of P5-D scope; remains open |

### Release Gate DB/RLS/RPC (S+-01)

| Check | Result | Evidence |
|-------|--------|----------|
| `release_gate` table + default locked | **PASS** | `supabase/release_gate_lock.sql` — `contribution_locked boolean not null default true` |
| `bl_is_release_unlocked` fail-closed | **PASS** | Missing row / exception → `false` |
| `posts_release_gate_insert_restrictive` | **PASS** | Restrictive INSERT uses `bl_can_create_user_content` |
| `storage_discovery_uploads_release_gate_insert_restrictive` | **PASS** | Bucket-aware storage gate |
| Observation RPC release assert | **PASS** | P5-E.2 hook in `phase_a_observations_foundation.sql` |
| comments / reports / report-screenshots | **NOT TESTED** | Documented gaps in SQL + fixtures |

### Release Gate Frontend/Admin UX (S+-01)

| Check | Result | Evidence |
|-------|--------|----------|
| `BoundLoreReleaseGateClient` (`p5-e3`) | **PASS** | `js/release-gate-client.js` |
| create / edit / support guards | **PASS** | Assert + notice on locked state |
| Admin status + unlock/relock UI | **PASS** | Prepared; **not executed** in this gate |
| `shouldAllowClientBypass()` | **PASS** | Always `false` |

### No service_role in Client

| Check | Result | Evidence |
|-------|--------|----------|
| `service_role` in `js/` | **PASS** | No matches |
| `service_role` in `wiki/` | **PASS** | No matches |
| `service_role` in SQL | **PASS** | Comments/docs only (`release_gate_lock.sql`, `admin_dashboard_notifications.sql`) |

### No bypass logic

| Check | Result | Evidence |
|-------|--------|----------|
| `localStorage.*release` bypass | **PASS** | No client bypass; fixture grep check only in QA |
| `localhost.*release` bypass | **PASS** | No matches in app code |
| `location.search.*release` bypass | **PASS** | No matches in app code |
| `shouldAllowClientBypass` | **PASS** | Hard-coded `false` |

### No auto-publish / auto-approve

| Check | Result | Evidence |
|-------|--------|----------|
| Auto-publish as runtime action | **PASS** | Only prohibited text in docs/fixtures/admin confirm copy |
| Auto-approve as runtime action | **PASS** | Only policy/docs references; no automated approve path |
| `bl_set_release_gate_locked` | **PASS** | SQL comment: no auto-publish, no pending mutation |

---

## 5. Standard Regression Results

HTTP smoke + browser verification on `http://localhost:8080` (cache-bust reload). All pages returned HTTP 200.

| Area | URL / check | Result | Notes |
|------|-------------|--------|-------|
| Homepage | `/` | **PASS** | Loads |
| Browse | `/wiki/browse/` | **PASS** | Loads |
| Search `monster` | `/wiki/search/?q=monster` | **PASS** | Known S-06 recall gap (0 hits); no crash |
| Search `ogre` | `/wiki/search/?q=ogre` | **PASS** | Finds hits |
| Search XSS probe | `/wiki/search/?q=%3Cimg%20src=x%20onerror=alert(1)%3E` | **PASS** | Escaped / no script execution |
| QA Ogre | `/wiki/post/?slug=qa-ogre-mage-1103f2` | **PASS** | Loads |
| QA Staff | `/wiki/post/?slug=qa-staff-of-fire-2b742628` | **PASS** | Loads |
| QA Ember | `/wiki/post/?slug=qa-ember-shard-511160` | **PASS** | Loads |
| Invalid slug | `/wiki/post/?slug=does-not-exist-99999` | **PASS** | Graceful not found |
| Create Post locked UX | `/wiki/create-post/` | **PASS** | Pre-release / read-only lock or fail-closed submit |
| Admin anon | `/wiki/admin/` | **PASS** | Access Denied / login or session-dependent block |

No Supabase writes, no data changes, no RPC calls, no notifications created, no unlock/re-lock executed.

---

## 6. Remaining NOT TESTED Items

| Item | Status |
|------|--------|
| Live-RLS for posts / profiles / comments / reports / ratings | **NOT TESTED** |
| Live-RPC negative tests (`bl_register_observation`, release gate RPC) | **NOT TESTED** |
| SQL migration apply (`release_gate_lock.sql`, notification policy, observation RPC) | **NOT TESTED** |
| Storage policy real enforcement | **NOT TESTED** |
| `report-screenshots` bucket gate | **NOT TESTED** |
| Production security headers | **NOT TESTED** |
| Auth / admin authenticated journeys | **NOT TESTED** (anon smoke only) |
| Monitoring / backup / restore | **NOT TESTED** |
| Fable independent security retest | **NOT TESTED** — handoff follows in P5-F.2 |
| Server-side HTML sanitizer + stored-content migration | **NOT TESTED** |
| Staged DB apply (P5-E.5+) | **NOT TESTED** — requires explicit approval |

---

## 7. Verdict

| Dimension | Verdict |
|-----------|---------|
| S+ local/repo baseline retest | **PASS** |
| S+ production closure | **FAIL / NOT TESTED** |
| S+-01 combined baseline retested | **PASS** — not production-closed |
| S+-02 combined baseline retested | **PASS** — not production-closed |
| S+-03 combined baseline retested | **PASS** — not production-closed |
| S+-04 combined baseline retested | **PASS** — not production-closed |
| Foundation-Ready | **PASS** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

**P5-F.1 combined S+ security retest completed locally.** All four S+ baselines re-verified together. All five P5 fixtures green. Standard regression green. Static S+ checks green or explicitly NOT TESTED where out of scope. No SQL execution, no Supabase writes, no data changes, no push, no deploy, no launch.

**Next:** **P5-F.2 Fable Retest Handoff Package** → then Fable S+ Security Retest. No push / deploy / launch without explicit approval and **LAUNCH-0**.

---

*Document version: P5-F.1 combined retest. Docs-only gate. No app/SQL changes.*
