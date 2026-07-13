# P5-E.7B Release Lock Fixture Alignment Report

**Gate:** P5-E.7B — Release Lock Fixture Alignment + Local Evidence Clarification  
**Date:** 2026-07-13  
**HEAD (start):** `ab123f0` — Document policy dependency SELECT grants retest  
**Scope:** QA fixture + documentation only

---

## 1. Scope / Approval

| Constraint | Status |
|------------|--------|
| User approval for P5-E.7B | **YES** |
| Fixture/docs changes only | **YES** |
| No DB write | **YES** |
| No SQL apply | **YES** |
| No push / deploy / launch | **YES** |
| No secrets / URLs / credentials added | **YES** |

---

## 2. Starting Point

| Item | Status |
|------|--------|
| P5-E.7A.2 | **PASS** — direct posts release-lock RLS proven on staging |
| Direct Posts Release Lock Evidence | **PASS** |
| Storage Closure | **DEFERRED** — `release_gate_storage_policy_deferred.sql` not applied |
| Release Lock DB Fixture (prior) | **32/34** — checks 21–22 failed because storage policy moved out of `release_gate_lock.sql` (P5-E.5C) |
| Local fixtures in P5-E.7A.2 | **NOT RUN** — port 8080 unreachable (multiple conflicting listeners) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

---

## 3. Fixture Change

### Files changed

| File | Change |
|------|--------|
| `qa/p5-release-lock-db-security-fixtures.js` | Added `deferred` status; checks 21–22 reclassified; summary shows core vs deferred |
| `qa/p5-release-lock-db-security-fixtures.html` | Deferred styling, storage defer banner, script cache `?v=3` |

### Storage checks (21–22)

Previously these checks searched `release_gate_lock.sql` for `storage_discovery_uploads_release_gate_insert_restrictive` and bucket-aware policy — causing **FAIL** after P5-E.5C removed storage DDL from the default apply path.

**After alignment:**

| Check | Label | Status | Detail |
|-------|-------|--------|--------|
| 21 | discovery storage restrictive policy | **DEFERRED** | Policy documented in `release_gate_storage_policy_deferred.sql`; not in default apply file |
| 22 | storage policy bucket-aware | **DEFERRED** | Bucket guard present in deferred file only |

Storage is **not** marked PASS. Deferred checks are excluded from required fail count.

### Core checks

All **32 required** checks (1–20, 23–34) remain enforced. Check 14 (`no service_role reference`) continues to scan only `release_gate_lock.sql` + related non-deferred SQL files — avoiding false positives from deferred-file comment text.

### Unchanged

- No product code changed
- No SQL files changed
- `release_gate_storage_policy_deferred.sql` not applied

---

## 4. Local Evidence Results

### Server availability

| Port | Result |
|------|--------|
| `localhost:8080` | **NOT REACHABLE** — connection reset; multiple stale listeners on 8080 |
| `localhost:8081` | **STARTED** — fresh no-cache Python `ThreadingHTTPServer` for this gate |

Evidence captured on **8081** (same repo root, no-cache headers). Port 8080 conflict documented; not forced.

### Fixture results (Ctrl+F5 equivalent, cache-busted)

| Fixture | Result | Notes |
|---------|--------|-------|
| Release Lock DB | **CORE_PASS_STORAGE_DEFERRED** | Required core **32/32 PASS**; storage **2 DEFERRED**; `failCount: 0` |
| Release Lock UI | **30/30 PASS** | `allPass: true` |
| Notification | **24/24 PASS** | `failCount: 0` |
| Observation RPC | **17/17 PASS** | `allPass: true` |
| Sanitization | **45/45 PASS** | `allPass: true` |
| Console errors | **None observed** | Static fixture pages only |

### Regression smoke (11 routes, HTTP 200)

| Route | Status |
|-------|--------|
| `/` | 200 |
| `/wiki/browse/` | 200 |
| `/wiki/search/?q=monster` | 200 (S-06 recall gap unchanged) |
| `/wiki/search/?q=ogre` | 200 |
| `/wiki/search/?q=%3Cimg%20src=x%20onerror=alert(1)%3E` | 200 — no raw `<img onerror` in body |
| `/wiki/post/?slug=qa-ogre-mage-1103f2` | 200 |
| `/wiki/post/?slug=qa-staff-of-fire-2b742628` | 200 |
| `/wiki/post/?slug=qa-ember-shard-511160` | 200 |
| `/wiki/post/?slug=does-not-exist-99999` | 200 |
| `/wiki/create-post/` | 200 — locked UX page loads |
| `/wiki/admin/` | 200 — anon access denied UX loads |

No crash. No production connection. No push/deploy.

---

## 5. Remaining Gaps

| Gap | Status |
|-----|--------|
| Storage Closure | **DEFERRED** — P5-E.8A |
| S+-03 stored-content runtime / production | **NOT CLOSED** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

---

## 6. Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.7B (overall)** | **PASS** |
| Release Lock Core Fixture | **PASS** — 32/32 required |
| Storage Fixture Status | **DEFERRED** — 2 checks |
| S+ Staging Evidence | **PARTIAL** — until storage + S+-03 runtime closure |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

P5-E.7B aligned the Release Lock DB fixture with the P5-E.5C storage defer design. Core release-lock checks pass independently; storage policy checks are visibly **DEFERRED**, not FAIL or PASS. Local evidence re-run confirms all P5 fixtures green with explicit storage defer semantics. No database access occurred.

**Recommended next:** **P5-E.8A** Storage Policy Apply (explicit approval) or S+-03 runtime closure plan. Continue **no push / deploy / launch** without explicit approval.

---

## 7. P5-E.8 Follow-up (PASS — storage closure plan)

**Gate:** P5-E.8 — Storage Closure Plan (planning only). **PASS**.

| Item | Result |
|------|--------|
| Storage closure plan | **Created** — `p5-storage-closure-plan.md` |
| SQL apply / DB access | **None** |
| Storage still DEFERRED | **YES** |
| Recommended path | Dashboard SQL Editor on staging `jzzgoiwfbuwiiyvwgwri` |
| P5-E.8 | **PASS** |

**Report:** `docs/architecture/p5-storage-closure-plan.md`

---

## 8. P5-E.8A Follow-up (BLOCKED — Dashboard sign-in)

**Gate:** P5-E.8A — Storage policy apply attempted. **BLOCKED**.

| Item | Result |
|------|--------|
| Apply executed | **NO** — Dashboard sign-in required |
| Fixture status | **CORE_PASS_STORAGE_DEFERRED** (unchanged) |
| P5-E.8B | Still pending |
| P5-E.8A | **BLOCKED** |

**Report:** `docs/architecture/p5-storage-policy-owner-apply-report.md`

---

*Document version: P5-E.7B PASS + P5-E.8 PASS + P5-E.8A BLOCKED. No secrets.*
