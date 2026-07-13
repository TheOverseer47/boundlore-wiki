# P5-E.5 Re-run 2 — Staged DB Security Retest

**Gate:** P5-E.5 Re-run 2 — Release Gate + Observation SQL + Negative RLS/RPC Tests  
**Date:** 2026-07-13  
**HEAD at gate start:** `241e451` — Document staging testuser profiles provisioning  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`  
**Verdict:** **BLOCKED** — `release_gate_lock.sql` failed on `storage.objects` policy  
**Production closure:** **NOT CLOSED**

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-E.5 Re-run 2 | `[x]` |
| Staging only | `[x]` |
| Legacy `ohkoojpzmptdfyowdgog` excluded | `[x]` |
| Production excluded | `[x]` |
| Push / Deploy / Launch | `[x]` — none |
| Negative RLS/RPC tests on staging | `[ ]` — **NOT RUN** (apply blocked) |

---

## 2. Starting State

| Item | Status |
|------|--------|
| Base schema (9 core tables) | `[x]` PASS |
| `admin_dashboard_notifications.sql` | `[x]` already applied |
| Testuser profiles A/B | `[x]` present, role `user` |
| `release_gate_lock.sql` | `[ ]` not applied |
| `phase_a_observations_foundation.sql` | `[ ]` not applied |

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
| Path | `backups/staging/p5-e5-rerun2-preapply-20260713-205844.sql` |
| Size | **271,992 bytes** |
| Gitignored / not staged | `[x]` |

---

## 4. SQL Apply Log

| File | Action | Result |
|------|--------|--------|
| `admin_dashboard_notifications.sql` | **Not re-applied** — read-only verify | **PASS** — `notifications_insert_authenticated` WITH CHECK `(user_id = auth.uid())` |
| `release_gate_lock.sql` | Apply attempted | **FAIL** — transaction rolled back |
| `phase_a_observations_foundation.sql` | **NOT RUN** — blocked by release gate failure |

### Apply failure detail (`release_gate_lock.sql`)

```
ERROR: must be owner of relation objects
at release_gate_lock.sql line ~375 (storage_discovery_uploads_release_gate_insert_restrictive on storage.objects)
```

**Root cause:** Supabase `storage.objects` is not owned by the `postgres` session role used via pooler. Creating RLS policy on `storage.objects` requires relation owner privileges.

**Post-fail staging state (rolled back):**

| Object | Present |
|--------|---------|
| `release_gate` | **No** |
| `release_gate_audit` | **No** |
| `bl_is_release_unlocked` | **No** |
| `bl_assert_can_create_user_content` | **No** |
| `bl_register_observation` | **No** |

**SQL Apply verdict:** **FAIL / BLOCKED**

---

## 5. Release Lock Verification

| Check | Result |
|-------|--------|
| `release_gate` row `id=1` | **Not present** |
| `contribution_locked = true` | **N/A** |
| `bl_is_release_unlocked() = false` | **N/A** |
| `release_gate_audit` | **Not present** |

**Verdict:** **NOT VERIFIED** — apply blocked before provisioned.

---

## 6. S+-02 Test Results (Cross-User Notification Injection)

| Test | Result |
|------|--------|
| Foreign `user_id` insert as User A | **NOT RUN** |
| Own-user control insert | **NOT RUN** |

**Reason:** Release gate not applied; live RLS negative tests deferred. Repo policy verified read-only.

**Verdict:** **NOT RUN**

---

## 7. S+-04 Test Results (Observation RPC Gate)

| Test | Result |
|------|--------|
| Anon blocked | **NOT RUN** |
| No tutorial ack blocked | **NOT RUN** |
| Ack but locked blocked | **NOT RUN** |
| No post created | **NOT RUN** |

**Verdict:** **NOT RUN**

---

## 8. S+-01 Test Results (Release Lock Direct Writes)

| Test | Result |
|------|--------|
| `release_gate` locked state | **NOT RUN** |
| Direct `posts` INSERT blocked | **NOT RUN** |
| `post_reactions` blocked | **NOT RUN** |
| Storage `discovery-uploads` blocked | **NOT RUN** (apply blocker) |
| Missing `release_gate` row fail-closed | **NOT RUN** |
| Admin unlock/re-lock | **NOT RUN** — no admin test user |
| Final locked state | **N/A** |

**Verdict:** **NOT RUN**

---

## 9. S+-03 Runtime Results (Sanitization)

| Test | Result |
|------|--------|
| Local fixture `p5-sanitization-security-fixtures.html` | **PASS** — 45/45 (prior browser verify) |
| Stored-content staging runtime | **NOT RUN** |

**Verdict:** **PASS** (local helper only; not production-closed)

---

## 10. Fixtures / Regression

### Local P5 fixtures (static repo — not live staging RLS)

| Fixture | Result |
|---------|--------|
| Notification | **PASS** — 24/24 |
| Observation RPC | **PASS** — 17/17 (prior session) |
| Sanitization | **PASS** — 45/45 |
| Release Lock DB | **PASS** — 34/34 (prior session) |
| Release Lock UI | **PASS** — 30/30 (prior session) |

### Standard regression smoke (HTTP)

All 11 routes returned **200**.

---

## 11. Cleanup

| Check | Result |
|-------|--------|
| Final `release_gate` locked | **N/A** |
| `p5_e5_` test posts | **0** (no tests run) |
| Test notifications | **0** |
| Backups staged | **No** |

---

## 12. Remaining NOT TESTED

- Production closure
- Live staging negative RLS/RPC (blocked)
- Storage policy on staging via SQL apply
- Admin unlock/re-lock
- Report screenshots / comments/reports tables
- Broader backup/restore ops
- Monitoring

---

## 13. Verdict

| Dimension | Verdict |
|-----------|---------|
| **SQL Apply** | **FAIL / BLOCKED** |
| **Negative RLS/RPC Tests** | **BLOCKED** — not run |
| **S+ Staging Evidence** | **FAIL / BLOCKED** |
| **Production Closure** | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

1. **P5-E.5C (repo fix):** Split or defer `storage.objects` policy in `release_gate_lock.sql` — apply public schema + functions in transaction; storage policy via separate gated file or Supabase dashboard/MCP with storage owner role.
2. **Re-run P5-E.5** only with new explicit user approval after storage policy path resolved.
3. **No push, deploy, or launch.**

---

## 14. P5-E.5C Follow-up (PASS — storage policy deferred)

**Gate:** P5-E.5C — storage policy removed from `release_gate_lock.sql`; deferred to `release_gate_storage_policy_deferred.sql`. **PASS** (repo only).

| Item | Result |
|------|--------|
| `storage.objects` removed from `release_gate_lock.sql` | `[x]` |
| Deferred file created | `[x]` |
| Public-schema path preserved | `[x]` |
| SQL apply / DB access | `[x]` — none |
| Ready for P5-E.5 Re-run 3 | **YES** (explicit approval) |
| Storage closure | **DEFERRED** |

**Report:** `docs/architecture/p5-storage-policy-defer-fix-report.md`

---

*Document version: P5-E.5 Re-run 2 BLOCKED + P5-E.5C PASS. No secrets.*
