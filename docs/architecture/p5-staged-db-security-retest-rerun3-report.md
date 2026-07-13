# P5-E.5 Re-run 3 — Staged DB Security Retest

**Gate:** P5-E.5 Re-run 3 — Release Gate + Observation SQL + Negative RLS/RPC Tests  
**Date:** 2026-07-13  
**HEAD at gate start:** `5ee454e` — Defer storage release gate policy  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`; storage closure deferred  
**Verdict:** **PARTIAL** — SQL apply PASS; live negative tests PARTIAL (posts grant gap)  
**Production closure:** **NOT CLOSED**

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-E.5 Re-run 3 | `[x]` |
| Staging only | `[x]` |
| Legacy `ohkoojpzmptdfyowdgog` excluded | `[x]` |
| Production excluded | `[x]` |
| Push / Deploy / Launch | `[x]` — none |
| Storage policy deferred | `[x]` — `release_gate_storage_policy_deferred.sql` not applied |
| Negative RLS/RPC tests on staging | `[x]` — executed (partial) |

---

## 2. Starting State

| Item | Status |
|------|--------|
| Base schema (9 core tables) | `[x]` PASS |
| `admin_dashboard_notifications.sql` | `[x]` already applied |
| Testuser profiles A/B | `[x]` present, role `user` |
| `release_gate_lock.sql` | `[ ]` not applied (pre-gate) |
| `phase_a_observations_foundation.sql` | `[ ]` not applied (pre-gate) |
| P5-E.5C storage defer | `[x]` — no `storage.objects` in default apply |

---

## 3. Environment Proof

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
| Path | `backups/staging/p5-e5-rerun3-preapply-20260713-211452.sql` |
| Size | **271,992 bytes** |
| Gitignored / not staged | `[x]` |

---

## 4. SQL Apply Log

| File | Action | Result |
|------|--------|--------|
| `admin_dashboard_notifications.sql` | **Not re-applied** — read-only verify | **PASS** |
| `release_gate_lock.sql` | Apply (no storage DDL) | **PASS** — COMMIT |
| `phase_a_observations_foundation.sql` | Apply after release gate | **PASS** — COMMIT |
| `release_gate_storage_policy_deferred.sql` | **NOT applied** — deferred by design | **N/A** |

**Apply order:** notifications (verify only) → release gate → observations. No production.

---

## 5. Release Lock Verification

| Check | Result |
|-------|--------|
| `release_gate` table | **Present** |
| `release_gate_audit` table | **Present** |
| Row `id=1` | **Present** |
| `contribution_locked` | **true** |
| `bl_is_release_unlocked()` | **false** |
| Central helpers | `bl_is_admin_actor`, `bl_is_release_unlocked`, `bl_assert_can_create_user_content`, `bl_register_observation` — **all present** |

**Verdict:** **PASS**

---

## 6. S+-02 Test Results (Cross-User Notification Injection)

| Test | Result |
|------|--------|
| Foreign `user_id` insert as User A | **BLOCKED** — RLS policy violation |
| Own-user control insert as User A | **ALLOWED** (rolled back) |

**Auth context simulation:** `SET LOCAL ROLE authenticated` + JWT claims — **works**.

**Verdict:** **PASS**

---

## 7. S+-04 Test Results (Observation RPC Gate)

| Test | Result |
|------|--------|
| A) Anon / no auth | **BLOCKED** — Authentication required |
| B) Auth, no tutorial ack | **BLOCKED** — Tutorial acknowledgement required |
| C) Auth + ack, release locked | **BLOCKED** — User content submissions are locked before release |
| Posts created | **0** `p5_e5_*` posts |

**Verdict:** **PASS**

---

## 8. S+-01 Public Write Test Results

| Test | Result |
|------|--------|
| `release_gate` locked | **true** |
| A) Direct `posts` INSERT as User A | **BLOCKED** — `permission denied for table posts` (table-level grant gap; not RLS message) |
| B) `post_reactions` | **NOT RUN** — 0 published posts for FK target |
| C) Missing `release_gate` row + insert | **BLOCKED** — same grant-level denial (transaction rolled back; row restored) |
| D) Admin unlock/re-lock | **NOT RUN** — no admin test user |
| Final locked state | **true** / `unlocked = false` |

**Note:** Staging `authenticated` role lacks `INSERT` privilege on `public.posts` (only REFERENCES/TRIGGER/TRUNCATE). Release-lock enforcement on direct posts INSERT is **not independently proven via RLS** on staging; RPC path (S+-04C) **does** prove `bl_assert_can_create_user_content` blocks writes while locked.

**Verdict:** **PARTIAL** — writes blocked; release-gate RLS on direct posts not isolated from grant gap

---

## 9. S+-01 Storage Status

| Item | Status |
|------|--------|
| Storage policy | **DEFERRED** |
| `release_gate_storage_policy_deferred.sql` | **Not applied** |
| Storage upload live test | **NOT RUN** |
| Separate owner-capable closure | **Required** |

---

## 10. S+-03 Runtime Results

| Test | Result |
|------|--------|
| Local sanitization fixture | **PASS** — 45/45, failCount 0 |
| Stored-content staging runtime | **NOT RUN** |

**Verdict:** **PASS** (local helper only)

---

## 11. Fixtures / Regression

### Local P5 fixtures (static repo)

| Fixture | Result |
|---------|--------|
| Notification | **PASS** — 24/24 |
| Observation RPC | **PASS** — 17/17 |
| Sanitization | **PASS** — 45/45 |
| Release Lock DB | **PARTIAL** — 32/34 (2 storage checks fail — expected after P5-E.5C defer) |
| Release Lock UI | **PASS** — 30/30 |

### Standard regression smoke (HTTP)

All 11 routes returned **200**.

---

## 12. Cleanup

| Check | Result |
|-------|--------|
| Final `release_gate` locked | **true** |
| `p5_e5_` test posts | **0** |
| Test notifications | **0** |
| Permanent test acks | **0** (rolled back) |
| Backups staged | **No** |

---

## 13. Remaining NOT TESTED

- Storage closure (deferred)
- Production closure / headers / live RLS
- Direct posts INSERT via release-gate RLS (staging grant gap)
- `post_reactions` live blocked test
- Admin unlock/re-lock
- Report screenshots / comments/reports tables
- Broader backup/restore ops
- Monitoring

---

## 14. Verdict

| Dimension | Verdict |
|-----------|---------|
| **SQL Apply** | **PASS** |
| **Negative RLS/RPC Tests** | **PARTIAL** |
| **S+ Staging Evidence** | **PARTIAL** |
| **Storage Closure** | **DEFERRED** |
| **Production Closure** | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

1. **P5-E.6** — Staging Evidence Acceptance + review staging `GRANT INSERT` on `public.posts` for authenticated (if direct client writes expected).
2. **Storage Closure** — separate gate with owner-capable path for `release_gate_storage_policy_deferred.sql`.
3. **No push, deploy, or launch.**

---

*Document version: P5-E.5 Re-run 3 PARTIAL. SQL apply PASS. Storage deferred. No secrets.*
