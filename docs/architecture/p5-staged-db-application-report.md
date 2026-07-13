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

### P5-STAGING.4 follow-up

**P5-STAGING.4** test user provisioning documented (HEAD `dcff65d`). Users `p5_e5_user_a@example.com` and `p5_e5_user_b@example.com` in `boundlore-staging` only. No passwords/keys in repo. **P5-E.5 READY FOR USER APPROVAL.**

**Report:** `docs/architecture/p5-staging-test-user-provisioning.md`

### Next steps

- **Do not** apply P5 SQL to `ohkoojpzmptdfyowdgog`.
- **P5-STAGING.5:** Provision BoundLore base schema on `boundlore-staging` before P5-E.5 re-attempt.
- **No push / deploy / launch.**

---

# P5-E.5 Re-run — Staged DB Application & Negative RLS/RPC Tests

**Gate:** P5-E.5 Re-run  
**Date:** 2026-07-13  
**HEAD at gate start:** `b3c64e7` — Document staging test user provisioning  
**User approval:** **YES** — staging `jzzgoiwfbuwiiyvwgwri` only  
**Verdict:** **BLOCKED** — BoundLore base schema not provisioned on staging  
**SQL applied:** **NONE**  
**Negative live tests:** **NOT RUN**

---

## Re-run 1. Scope / Approval

| Item | Status |
|------|--------|
| Explicit user approval for P5-E.5 re-run | `[x]` — staging only |
| Staging ref `jzzgoiwfbuwiiyvwgwri` | `[x]` |
| Legacy `ohkoojpzmptdfyowdgog` excluded | `[x]` |
| Production / boundlore.com | **untouched** |
| Push / Deploy / Launch | **none** |
| `service_role` in client | **not used** |

**Hard stop at Step 5 (Pre-Apply Schema Check).** Pre-apply backup created; no SQL apply; no negative RLS/RPC/storage tests.

---

## Re-run 2. Environment Proof

| Field | Staging | Legacy (forbidden) |
|-------|---------|-------------------|
| Project ref | `jzzgoiwfbuwiiyvwgwri` | `ohkoojpzmptdfyowdgog` |
| API URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` | `https://ohkoojpzmptdfyowdgog.supabase.co` |
| DB host | `db.jzzgoiwfbuwiiyvwgwri.supabase.co` | `db.ohkoojpzmptdfyowdgog.supabase.co` |
| Project name | `boundlore-staging` | TheOverseer47's Project |

| Check | Result |
|-------|--------|
| `.env.staging` local + gitignored | `[x]` |
| `SUPABASE_STAGING_CONFIRM_ISOLATED=true` | `[x]` |
| Anon key `sb_publishable_*` (not secret) | `[x]` |
| No legacy ref in `.env.staging` | `[x]` |
| Connection via session pooler (IPv4) | `[x]` PASS |

**Environment proof: PASS** for isolated staging identity.

### Pre-apply backup (this re-run)

| Item | Value |
|------|-------|
| Created | **Yes** |
| Path | `backups/staging/p5-e5-rerun-preapply-20260713-185457.sql` |
| Size | **169,075 bytes** |
| Gitignored | `[x]` |
| Production | **not used** |

---

## Re-run 3. Pre-Apply Schema Check

**Result: FAIL — BLOCKED**

Query against staging `information_schema.tables`:

| Required | Present |
|----------|---------|
| `public.posts` | **NO** |
| `public.profiles` | **NO** |
| `public.notifications` | **NO** |
| `public.user_submission_acks` | **NO** |
| `public.post_reactions` | **NO** |
| `public.wiki_entities` | **NO** |
| `public.release_gate` | **NO** |
| `storage.objects` | `[x]` |
| `storage.buckets` | `[x]` |
| `auth.users` | `[x]` |

**Public schema table count: 0** (empty fresh Supabase project).

### Test users (read-only)

| Email | Confirmed |
|-------|-----------|
| `p5_e5_user_a@example.com` | `[x]` |
| `p5_e5_user_b@example.com` | `[x]` |

Users exist in `auth.users` but **no `public.profiles`** rows/tables — P5 SQL cannot be safely applied.

**Block statement:** **P5-E.5 Re-run blocked — staging project exists, but BoundLore base schema is not provisioned.**

**Recommendation:** **P5-STAGING.5 Base Schema Provisioning** — apply foundational migrations (e.g. `discovery_entity_backbone.sql`, `sprint1_knowledge_graph_foundation.sql`, posts/profiles baseline) to staging before P5-E.5 re-attempt.

---

## Re-run 4. SQL Apply Log

| File | Order | Applied | Result |
|------|-------|---------|--------|
| `supabase/admin_dashboard_notifications.sql` | 1 | **NO** | BLOCKED — schema missing |
| `supabase/release_gate_lock.sql` | 2 | **NO** | BLOCKED |
| `supabase/phase_a_observations_foundation.sql` | 3 | **NO** | BLOCKED |

### Static pre-apply review (repo files — unchanged)

| Check | Result |
|-------|--------|
| No production URL / `service_role` | `[x]` |
| S+-02 `user_id = auth.uid()` on notifications insert | `[x]` |
| S+-01 fail-closed release gate default locked | `[x]` |
| S+-04 `bl_assert_can_create_user_content` before posts INSERT in RPC | `[x]` |
| Idempotent DROP POLICY IF EXISTS patterns | `[x]` |

**SQL Apply: BLOCKED**

---

## Re-run 5. S+-02 Test Results

| Test | Result |
|------|--------|
| Foreign `user_id` notification insert | **NOT RUN** |
| Own-user control insert | **NOT RUN** |
| Local fixture | **24/24 PASS** (browser) |

**Verdict: NOT RUN**

---

## Re-run 6. S+-04 Test Results

| Test | Result |
|------|--------|
| Anon / no auth RPC | **NOT RUN** |
| Auth without tutorial ack | **NOT RUN** |
| Auth with ack but locked | **NOT RUN** |
| No post created on block | **NOT RUN** |
| Local fixture | **17/17 PASS** (browser) |

**Verdict: NOT RUN**

---

## Re-run 7. S+-01 Test Results

| Test | Result |
|------|--------|
| `release_gate` locked after apply | **NOT RUN** |
| Direct `posts` INSERT blocked | **NOT RUN** |
| `post_reactions` | **NOT RUN** |
| `discovery-uploads` storage | **NOT RUN** |
| Missing `release_gate` row | **NOT RUN** |
| Admin unlock/relock | **NOT RUN** — no admin test user |
| Final `contribution_locked = true` | **N/A** — no apply |
| Local DB fixture | **34/34 PASS** (browser) |
| Local UI fixture | **30/30 PASS** (browser) |

**Verdict: NOT RUN**

---

## Re-run 8. S+-03 Runtime Results

| Test | Result |
|------|--------|
| Local sanitization fixture | **45/45 PASS** (browser; failCount 0) |
| Staging stored-content XSS runtime | **NOT RUN** — no base schema; app not pointed at staging |

**Verdict: NOT RUN** (staging runtime); local **PASS**

---

## Re-run 9. Fixtures / Regression (local)

Server: `http://localhost:8080` (existing; not restarted). No Supabase writes.

| Fixture / Route | Result |
|-----------------|--------|
| Notification | **24/24 PASS** |
| Observation RPC | **17/17 PASS** |
| Sanitization | **45/45 PASS** |
| Release Lock DB | **34/34 PASS** |
| Release Lock UI | **30/30 PASS** |
| `/`, `/wiki/browse/`, search, create-post, admin | HTTP **200** |

---

## Re-run 10. Cleanup

| Item | Status |
|------|--------|
| SQL applied to staging | **None** |
| `p5_e5_*` test posts/notifications | **None created** |
| `release_gate` on staging | **Unchanged** (table absent) |
| Legacy production project | **Untouched** |
| Backups / `.env.staging` staged | **No** |

---

## Re-run 11. Remaining NOT TESTED

- Live-RLS negative tests (all S+ findings)
- Live-RPC negative tests
- Storage policy real enforcement on staging
- Staging admin unlock/relock audit
- S+-03 stored-content runtime on staging
- Production closure (all)
- Production security headers
- Monitoring / broader backup-restore ops

---

## Re-run 12. Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.5 Re-run gate** | **BLOCKED** |
| **SQL Apply** | **BLOCKED** |
| **Negative RLS/RPC Tests** | **NOT RUN** |
| **S+ Staging Evidence** | **BLOCKED** (base schema missing) |
| **S+ repo baseline** | **PASS** (fixtures green) |
| **Production Closure** | **NOT CLOSED** |
| **Product-Activation-Ready** | **FAIL** |
| **Public-Launch-Ready** | **NO-GO** |

### Required before next P5-E.5 attempt

1. **P5-STAGING.5A:** Legacy schema-only export plan — **PASS** (Path A chosen; no export yet).
2. **P5-STAGING.5B:** Execute schema-only `pg_dump` from legacy — **PASS** (re-run; 138,895-byte gitignored dump).
3. **P5-STAGING.5C:** Curate `supabase/core_schema_foundation.sql` — **PASS** (~115 KB; no apply).
4. **P5-STAGING.6:** Apply foundation to staging — **FAIL** (dependency order; staging unchanged).
5. Re-verify tables; P5-E.5 re-attempt with explicit approval.

**Plans:** `p5-staging-base-schema-provisioning-plan.md`, `p5-legacy-schema-only-export-plan.md`

---

### P5-STAGING.5A follow-up

**P5-STAGING.5A** legacy schema-only export plan (HEAD `e6ca97b`). User chose Path A. **No export, no pg_dump, no DB access.** Staging not touched.

**Report:** `docs/architecture/p5-legacy-schema-only-export-plan.md`

---

### P5-STAGING.5B follow-up (first attempt — BLOCKED)

**P5-STAGING.5B** first attempt (HEAD `1f0e53e`). **BLOCKED** — `.env.legacy` not found locally.

**Report:** `docs/architecture/p5-legacy-schema-only-export-report.md`

---

### P5-STAGING.5B Re-run (PASS)

**P5-STAGING.5B** re-run (HEAD `9ddc7f9`). User approval granted. **PASS** — read-only schema-only export from legacy `ohkoojpzmptdfyowdgog`.

| Item | Status |
|------|--------|
| `.env.legacy` | `[x]` present, gitignored |
| `pg_dump --schema-only --schema=public` | `[x]` |
| Dump | `backups/legacy-schema-only/legacy-public-schema-only-20260713-192641.sql` (138,895 bytes) |
| No-data verification | `[x]` PASS |
| Core tables in dump | `[x]` all six required |
| Staging touched | `[x]` — none |
| SQL apply | `[x]` — none |
| Legacy Export (5B) | **PASS** |

**Report:** `docs/architecture/p5-legacy-schema-only-export-report.md`

**Next:** P5-STAGING.6 with explicit approval → P5-E.5 re-attempt.

---

### P5-STAGING.5C follow-up (PASS)

**P5-STAGING.5C** curated core schema extraction (HEAD `348c110`). **PASS** — `supabase/core_schema_foundation.sql` created from gitignored dump. **No SQL apply, no DB access.**

| Item | Status |
|------|--------|
| `core_schema_foundation.sql` | `[x]` |
| Six required core tables | `[x]` |
| No INSERT/COPY/data | `[x]` |
| Curated Extraction (5C) | **PASS** |

**Report:** `docs/architecture/p5-curated-core-schema-extraction-report.md`

---

### P5-STAGING.6 follow-up (FAIL)

**P5-STAGING.6** base schema apply (HEAD `c986af2`). User approval granted. **FAIL** — function `bl_match_entities` references `wiki_relation_types` before tables exist (~line 315). Transaction rolled back; staging `public` empty.

| Item | Status |
|------|--------|
| Pre-apply backup | `[x]` 185,427 bytes |
| `core_schema_foundation.sql` only | `[x]` attempted |
| P5 security SQL | `[x]` not applied |
| Core tables on staging | `[ ]` — none |
| Test users A/B | `[x]` intact, confirmed |
| Base Schema Apply (6) | **FAIL** |

**Report:** `docs/architecture/p5-staging-base-schema-apply-report.md`

**Next:** ~~Add `pg_trgm` extension to foundation~~ → **P5-STAGING.6B PASS** → re-run P5-STAGING.6 with explicit approval.

---

### P5-STAGING.6B follow-up (PASS — local extension fix)

**P5-STAGING.6B** — `pg_trgm` extension before GIN trigram indexes. **PASS** (repo only).

**Report:** `docs/architecture/p5-core-schema-extension-fix-report.md`

---

*Document version: P5-E.5 blocked + 5C PASS + 6 FAIL + 6A PASS + 6 Re-run FAIL + 6B PASS. Staging unchanged.*
