# P5-E.5 Staged DB Application & Negative RLS/RPC Tests

**Gate:** P5-E.5 — Staged DB Application & Negative RLS/RPC Tests  
**Date:** 2026-07-13  
**HEAD at gate start:** `2234ac6` — Document Fable dual-HEAD handoff note  
**Verdict:** **BLOCKED** — isolated staging environment not proven  
**SQL applied:** **NONE**  
**Negative live tests:** **NOT RUN**

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-E.5 | `[x]` — staging only, no production |
| Production apply | `[ ]` — **forbidden and not attempted** |
| Push / Deploy / Launch | `[ ]` — none |
| boundlore.com | **untouched** |
| Fable S+ repo retest | PASS (prior gate; unchanged) |

**Hard stop triggered at Step 2 (Environment Proof).** No backup, no SQL apply, no negative RLS/RPC/storage tests against any remote database.

---

## 2. Environment Proof

### Investigation performed

| Source | Finding |
|--------|---------|
| `git status` / `HEAD` | `2234ac6`; working tree clean except untracked `qa/e2e-baseline-bmeta.snapshot.json` |
| Supabase MCP `list_projects` | **Exactly one project** in account |
| `js/supabase-config.js` | App wired to same project URL as only listed project |
| Repo `.env.staging` / `config.toml` | **Not present** |
| Supabase CLI (`supabase --version`) | **Not installed / not in PATH** |
| Supabase dev branches (`list_branches`) | **Failed** — cannot enumerate isolated branch DB |
| Staging documentation naming separate project ref | **Not found** in repo docs |

### Discovered Supabase project (redacted where noted)

| Field | Value |
|-------|-------|
| Project ref | `ohkoojpzmptdfyowdgog` |
| Project name | TheOverseer47's Project |
| API URL | `https://ohkoojpzmptdfyowdgog.supabase.co` |
| DB host | `db.ohkoojpzmptdfyowdgog.supabase.co` |
| Region | eu-central-1 |
| Status | ACTIVE_HEALTHY |

### Why this is NOT proven isolated staging

1. **No second Supabase project** exists in the linked account — there is no separately named staging/test/preview project.
2. **`js/supabase-config.js` points localhost:8080 at this exact project** — the same backend used for live wiki QA data (QA Ogre/Staff/Ember slugs, admin user TheOverseer47, pending `add_recipe` conflict documented in gap notes).
3. **No repo evidence** that this project is staging-only and distinct from production backend; deployment freeze states boundlore.com is untouched but does not define an alternate staging ref.
4. **Applying P5 SQL here would mutate the only available remote database**, risking real QA content, pending moderation queue state, and any future production linkage via the committed config URL.
5. **Cannot satisfy gate rule:** “wahrscheinlich staging” is not allowed — isolation must be **proven**, not assumed.

### Block statement

**P5-E.5 blocked — isolated staging environment not proven.**

Per hard stop conditions: no SQL execution, no backup against unproven environment, no negative tests touching potentially production-linked data.

---

## 3. SQL Apply Log

| File | Planned order | Applied | Result |
|------|---------------|---------|--------|
| `supabase/admin_dashboard_notifications.sql` | 1 | **NO** | BLOCKED — environment not proven |
| `supabase/release_gate_lock.sql` | 2 | **NO** | BLOCKED |
| `supabase/phase_a_observations_foundation.sql` | 3 | **NO** | BLOCKED |

### Read-only pre-apply review (repo files only)

| Check | Result |
|-------|--------|
| S+-02 policy `user_id = auth.uid()` idempotent DROP+CREATE | `[x]` in file |
| S+-01 `release_gate` default locked, fail-closed helpers | `[x]` in file |
| S+-01 `DO NOT APPLY TO PRODUCTION` header | `[x]` in file |
| S+-04 RPC ack + `bl_assert_can_create_user_content` before posts INSERT | `[x]` in file |
| No auto-publish / auto-approve in SQL | `[x]` |
| Apply order dependencies understood | `[x]` — notifications → release_gate → observation RPC |
| Safe to apply without staging proof | **NO** |

**Staged DB Apply: FAIL / BLOCKED**

---

## 4. S+-02 Test Results (Notification Injection)

| Test | Status | Result |
|------|--------|--------|
| Foreign `user_id` notification insert (RLS negative) | **NOT RUN** | No staging apply |
| Own-user notification insert control | **NOT RUN** | No staging apply |
| `target_url` DB constraint enforcement | **NOT RUN** | Constraint documented NOT VALID / future gate in SQL file |
| Local fixture 24/24 | **PASS** | `http://localhost:8080/qa/p5-notification-security-fixtures.html` |

**S+-02 staging verdict:** **NOT RUN** — production closure remains **NOT CLOSED**

---

## 5. S+-04 Test Results (Observation RPC Gate)

| Test | Status | Result |
|------|--------|--------|
| A) Anon / no auth RPC call | **NOT RUN** | No staging apply |
| B) Auth without tutorial ack | **NOT RUN** | No staging apply |
| C) Auth with ack but release locked | **NOT RUN** | No staging apply |
| D) No pending post created on block | **NOT RUN** | No staging apply |
| Local fixture 17/17 | **PASS** (prior Fable + HTTP 200) | Static SQL pattern checks |

**S+-04 staging verdict:** **NOT RUN** — production closure remains **NOT CLOSED**

---

## 6. S+-01 Test Results (Release Lock)

| Test | Status | Result |
|------|--------|--------|
| `release_gate` exists + locked after apply | **NOT RUN** | SQL not applied |
| `bl_is_release_unlocked()` false | **NOT RUN** | |
| Direct `posts` INSERT blocked while locked | **NOT RUN** | |
| Missing `release_gate` row simulation | **NOT RUN** | Would require DB mutation |
| `posts` UPDATE blocked | **NOT RUN** | |
| `post_reactions` INSERT/UPDATE blocked | **NOT RUN** | |
| `discovery-uploads` storage blocked | **NOT RUN** | |
| Admin unlock/relock + audit | **NOT RUN** | No safe staging admin test context |
| Final `contribution_locked = true` | **NOT VERIFIED** on remote | No remote changes made |
| Local DB fixture 34/34 | **PASS** (prior gates) | Static SQL fetch |
| Local UI fixture 30/30 | **PASS** (prior gates) | Fake states only |

**S+-01 staging verdict:** **NOT RUN** — production closure remains **NOT CLOSED**

---

## 7. S+-03 Runtime Results (Sanitization)

| Test | Status | Result |
|------|--------|--------|
| Local sanitization fixture 45/45 | **PASS** (prior Fable retest; HTTP 200 re-check) | No Supabase |
| Staging stored-content XSS runtime | **NOT RUN** | App not safely pointed at isolated staging; no temp post created |
| Server-side sanitizer | **NOT PRESENT** | Out of P5-D scope |
| Historical content migration | **NOT RUN** | |

**S+-03 staging verdict:** **NOT RUN** for stored-content runtime — local baseline remains **PASS**

---

## 8. Fixtures / Regression (local only — allowed while blocked)

All served from `http://localhost:8080`. No Supabase writes.

| Fixture / Route | Expected | Actual | Result |
|-----------------|----------|--------|--------|
| Notification | 24/24 | 24/24 PASS | ✅ |
| Observation RPC | 17/17 | 17/17 PASS (prior session) | ✅ |
| Sanitization | 45/45 | 45/45 PASS (prior session) | ✅ |
| Release Lock DB | 34/34 | 34/34 PASS (prior session) | ✅ |
| Release Lock UI | 30/30 | 30/30 PASS (prior session) | ✅ |
| Standard regression routes (11 URLs) | HTTP 200, no crash | All 200 | ✅ |
| Search XSS probe | escaped | Prior Fable: no script in DOM | ✅ |

---

## 9. Cleanup

| Item | Status |
|------|--------|
| Remote SQL changes | **None** — nothing applied |
| Staging test data (`p5_e5_*`) | **None created** |
| Pending add_recipe conflict | **Untouched** |
| Queue / approve / reject | **None executed** |
| `release_gate` final locked state on remote | **Unchanged** (no apply) |
| Backup/dump created | **NO** — blocked before backup step |

---

## 10. Remaining NOT TESTED

- Live-RLS negative tests (notifications, posts, reactions)
- Live-RPC negative tests (`bl_register_observation`, release assert)
- Storage policy real enforcement (`discovery-uploads`, `report-screenshots`)
- `comments` / `reports` release-gate policies (documented gaps in SQL)
- Staging admin unlock/relock audit trail
- S+-03 stored-content runtime against staging DB
- Production security headers
- Production closure for all S+-01..04
- Backup/restore ops evidence
- Monitoring

---

## 11. Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.5 gate** | **BLOCKED** |
| **Staged DB Apply** | **FAIL / BLOCKED** |
| **Negative RLS/RPC Tests** | **NOT RUN** |
| **S+ Staging Evidence** | **FAIL** (blocked at environment proof) |
| **S+ repo baseline** | **PASS** (unchanged; fixtures green) |
| **Production Closure** | **NOT CLOSED** |
| **Product-Activation-Ready** | **FAIL** |
| **Public-Launch-Ready** | **NO-GO** |

### Required before P5-E.5 can proceed

1. Provision a **dedicated isolated staging Supabase project** (or provable dev branch DB) with explicit naming/documentation.
2. Add staging config **separate from** `js/supabase-config.js` production URL (e.g. `.env.staging`, documented project ref, never the live-only project).
3. Install/configure Supabase CLI or approved staging dump path.
4. Create pre-apply backup on **proven staging only**.
5. Re-run P5-E.5 with environment proof section completed before any `execute_sql` / `psql` / migration apply.

### P5-STAGING.1 follow-up

**P5-STAGING.1** created `docs/architecture/p5-staging-environment-plan.md` and `.env.staging.example`. No SQL, no project creation, no secrets committed. `ohkoojpzmptdfyowdgog` remains forbidden for P5-E.5 apply.

### P5-STAGING.2 follow-up

**P5-STAGING.2** environment proof completed (HEAD `8290920`). Local `.env.staging` confirms isolated staging ref `jzzgoiwfbuwiiyvwgwri` — distinct from legacy `ohkoojpzmptdfyowdgog`. No SQL, no DB mutation, no backup executed. Supabase CLI and `psql` not installed. **Environment Proof: PASS.** **Dry Run Readiness: PARTIAL.** P5-E.5 re-run remains **blocked** until tooling, backup test, testusers, and explicit user approval.

**Authoritative proof:** `docs/architecture/p5-staging-environment-proof.md`

### P5-STAGING.3 follow-up

**P5-STAGING.3** tooling & backup dry run (HEAD `2347d08`). Read-only staging connection PASS (session pooler). Full `pg_dump` to gitignored `backups/staging/`. No SQL apply, no mutation. P5-E.5 re-run **PARTIAL** ready — testusers + explicit approval pending.

**Report:** `docs/architecture/p5-staging-tooling-backup-dry-run.md`

### Next steps

- **Do not** apply P5 SQL to `ohkoojpzmptdfyowdgog`.
- Create staging test users; obtain explicit P5-E.5 re-run approval.
- **No push / deploy / launch.**

---

*Document version: P5-E.5 blocked report. Docs-only gate outcome. No SQL executed. No remote data changes.*
