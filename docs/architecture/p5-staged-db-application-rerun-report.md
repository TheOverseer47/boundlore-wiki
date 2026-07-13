# P5-E.5 Re-run — Staged DB Application & Negative RLS/RPC Tests

**Gate:** P5-E.5 Re-run — Staged DB Application & Negative RLS/RPC Tests  
**Date:** 2026-07-13  
**HEAD at gate start:** `1ac4e21` — Document staging base schema apply rerun 3  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`  
**Verdict:** **BLOCKED** — SQL apply failed at `release_gate_lock.sql`  
**Production closure:** **NOT CLOSED**

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-E.5 Re-run | `[x]` |
| Staging only | `[x]` |
| Legacy `ohkoojpzmptdfyowdgog` excluded | `[x]` |
| Production excluded | `[x]` |
| Push / Deploy / Launch | `[x]` — none |
| Negative RLS/RPC tests on staging | `[ ]` — **NOT RUN** (apply blocked) |

---

## 2. Environment Proof

| Field | Value |
|-------|-------|
| Staging ref | `jzzgoiwfbuwiiyvwgwri` |
| Legacy ref (forbidden) | `ohkoojpzmptdfyowdgog` — **not used** |
| `SUPABASE_STAGING_CONFIRM_ISOLATED` | `true` |
| Client key type | `sb_publishable_*` |
| Connection | Session pooler `aws-0-eu-central-1.pooler.supabase.com:5432` |
| Secrets in this report | **None** |

### Pre-apply backup

| Item | Value |
|------|-------|
| Path | `backups/staging/p5-e5-rerun-preapply-20260713-203520.sql` |
| Size | **270,836 bytes** |
| Gitignored / not staged | `[x]` |

### Base schema present (pre-apply)

| Check | Result |
|-------|--------|
| 9 core tables | **PASS** — all present |
| RLS on core tables | **PASS** — `rowsecurity = true` |
| Test users A/B | **PASS** — exist, confirmed |
| Test user `profiles` rows | **FAIL** — **0 profiles** for A/B |

---

## 3. SQL Apply Log

| # | File | Result | Notes |
|---|------|--------|-------|
| 1 | `supabase/admin_dashboard_notifications.sql` | **PASS** | `COMMIT`; notifications insert policy now `user_id = auth.uid()` |
| 2 | `supabase/release_gate_lock.sql` | **FAIL** | Rolled back in transaction |
| 3 | `supabase/phase_a_observations_foundation.sql` | **NOT RUN** | Blocked by step 2 failure |

### Apply 2 failure detail

```
ERROR: function public.bl_is_admin_actor(uuid) does not exist
at release_gate_lock.sql line ~85 (release_gate_admin_update policy)
```

**Root cause:** `release_gate_lock.sql` creates RLS policies referencing `bl_is_admin_actor()` **before** the function is defined (policies ~lines 79–92; function ~line 101).

**Post-fail staging state:**

| Object | Present |
|--------|---------|
| `release_gate` table | **No** |
| `release_gate_audit` | **No** |
| `bl_is_release_unlocked` | **No** |
| `bl_is_admin_actor` | **No** |
| `bl_register_observation` (P5-C) | **No** (apply 3 not run) |
| Updated `notifications_insert_authenticated` | **Yes** — `(user_id = auth.uid())` |

**SQL Apply verdict:** **FAIL / BLOCKED**

---

## 4. Release Lock Verification

| Check | Result |
|-------|--------|
| `release_gate` row `id=1` | **Not present** |
| `contribution_locked = true` | **N/A** |
| `bl_is_release_unlocked() = false` | **N/A** — function missing |
| `release_gate_audit` table | **Not present** |

**Verdict:** **NOT VERIFIED** — apply blocked before release gate provisioned.

---

## 5. S+-02 Test Results (Cross-User Notification Injection)

| Test | Result |
|------|--------|
| Foreign `user_id` insert as User A | **NOT RUN** |
| Own-user control insert | **NOT RUN** |

**Reason:** Gate stopped after SQL apply failure. Additional prerequisite: test users lack `profiles` rows (FK for `notifications.user_id`).

**Partial repo evidence:** Apply 1 updated policy to `user_id = auth.uid()`.

**Verdict:** **NOT RUN**

---

## 6. S+-04 Test Results (Observation RPC Gate)

| Test | Result |
|------|--------|
| Anon / no auth blocked | **NOT RUN** |
| Auth without tutorial ack blocked | **NOT RUN** |
| Auth with ack but release locked blocked | **NOT RUN** |
| No post created | **NOT RUN** |

**Reason:** `bl_register_observation` not applied; release gate helpers missing.

**Verdict:** **NOT RUN**

---

## 7. S+-01 Test Results (Release Lock Direct Writes)

| Test | Result |
|------|--------|
| `release_gate` locked state | **NOT RUN** |
| Direct `posts` INSERT blocked | **NOT RUN** |
| `post_reactions` blocked | **NOT RUN** |
| Storage `discovery-uploads` blocked | **NOT RUN** |
| Missing `release_gate` row fail-closed | **NOT RUN** |
| Admin unlock/re-lock | **NOT RUN** — no admin test user |
| Final locked state | **N/A** |

**Verdict:** **NOT RUN**

---

## 8. S+-03 Runtime Results (Sanitization)

| Test | Result |
|------|--------|
| Local fixture `p5-sanitization-security-fixtures.html` | **PASS** — 45/45, `failCount 0` |
| Stored-content staging runtime | **NOT RUN** — app not pointed at staging |

**Verdict:** **PASS** (local static/runtime helper only; not production-closed)

---

## 9. Fixtures / Regression

### Local P5 fixtures (static repo checks — not live RLS)

| Fixture | Result |
|---------|--------|
| Notification | **PASS** — 24/24 |
| Observation RPC | **PASS** — 17/17 |
| Sanitization | **PASS** — 45/45 |
| Release Lock DB | **PASS** — 34/34 |
| Release Lock UI | **PASS** — 30/30 |

### Standard regression smoke (HTTP)

All routes returned **200** (home, browse, search including XSS probe, QA slugs, create-post, admin).

**Limitation:** Local fixtures validate repo SQL/JS patterns; they do **not** prove live staging RLS/RPC after failed apply.

---

## 10. Cleanup

| Check | Result |
|-------|--------|
| Final `release_gate` locked | **N/A** — not provisioned |
| `p5_e5_` test posts persistiert | **N/A** — no tests run |
| Test notifications persistiert | **N/A** |
| Queue/pending changes | **None** |
| Backups staged | **No** |
| `.env.staging` staged | **No** |

---

## 11. Remaining NOT TESTED

- Production closure
- Production headers / live RLS on production
- Live staging negative RLS/RPC (blocked)
- Report screenshots
- Comments/reports tables absent from core schema
- Broader backup/restore ops
- Monitoring
- Admin unlock/re-lock on staging

---

## 12. Verdict

| Dimension | Verdict |
|-----------|---------|
| **SQL Apply** | **FAIL / BLOCKED** |
| **Negative RLS/RPC Tests** | **BLOCKED** — not run |
| **S+ Staging Evidence** | **FAIL / BLOCKED** |
| **Production Closure** | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

1. ~~**P5-E.5A (repo fix):** Reorder `release_gate_lock.sql`~~ → **P5-E.5A PASS** (local reorder).
2. ~~**P5-E.5B:** Ensure `profiles` rows exist~~ → **P5-E.5B PASS**
3. **Re-run P5-E.5** only with new explicit user approval.
4. **No push, deploy, or launch.**

---

## 14. P5-E.5B Follow-up (PASS — testuser profiles)

**Gate:** P5-E.5B — `profiles` for A/B provisioned on staging. **PASS**.

**Report:** `docs/architecture/p5-staging-testuser-profiles-report.md`

**Next:** P5-E.5C storage policy split → P5-E.5 Re-run (explicit approval).

---

## 15. P5-E.5 Re-run 2 Follow-up (BLOCKED — storage policy owner)

**Gate:** P5-E.5 Re-run 2 — `release_gate_lock.sql` failed on `storage.objects` policy. **BLOCKED**.

**Report:** `docs/architecture/p5-staged-db-security-retest-rerun2-report.md`

---

## 16. P5-E.5C Follow-up (PASS — storage policy deferred)

**Gate:** P5-E.5C — `storage.objects` policy split from `release_gate_lock.sql`. **PASS** (repo only).

| Item | Result |
|------|--------|
| Storage DDL removed from default apply path | `[x]` |
| `release_gate_storage_policy_deferred.sql` created | `[x]` |
| Ready for P5-E.5 Re-run 3 | **YES** (explicit approval) |

**Report:** `docs/architecture/p5-storage-policy-defer-fix-report.md`

---

## 17. P5-E.5 Re-run 3 Follow-up (PARTIAL)

**Gate:** P5-E.5 Re-run 3 — SQL apply PASS; live tests PARTIAL. **PARTIAL**.

**Report:** `docs/architecture/p5-staged-db-security-retest-rerun3-report.md`

---

*Document version: P5-E.5 Re-run BLOCKED + 5A/5B PASS + Re-run 2 BLOCKED + 5C PASS + Re-run 3 PARTIAL. No secrets.*
