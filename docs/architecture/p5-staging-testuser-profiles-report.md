# P5-E.5B Staging Testuser Profiles Provisioning Report

**Gate:** P5-E.5B — Staging Testuser Profiles Provisioning  
**Date:** 2026-07-13  
**HEAD at gate start:** `fd9a068` — Fix release gate SQL dependency order  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`  
**Verdict:** **PASS**  
**Not P5-E.5:** `[x]` — no security SQL, no negative RLS/RPC tests

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-E.5B | `[x]` |
| Staging only | `[x]` |
| Legacy `ohkoojpzmptdfyowdgog` excluded | `[x]` |
| Production excluded | `[x]` |
| Push / Deploy / Launch | `[x]` — none |
| Max two profiles affected | `[x]` — exactly 2 |

---

## 2. Environment

| Field | Value |
|-------|-------|
| Staging ref | `jzzgoiwfbuwiiyvwgwri` |
| Legacy ref (forbidden) | `ohkoojpzmptdfyowdgog` — **not used** |
| `SUPABASE_STAGING_CONFIRM_ISOLATED` | `true` |
| Client key type | `sb_publishable_*` |
| Connection | Session pooler `aws-0-eu-central-1.pooler.supabase.com:5432` |
| Secrets in this report | **None** |

---

## 3. Pre-Write Backup

| Item | Value |
|------|-------|
| Path | `backups/staging/p5-e5b-profiles-prewrite-20260713-204940.sql` |
| Size | **271,784 bytes** |
| Gitignored | `[x]` |
| Staged | `[x]` — not staged |

---

## 4. Pre-Write State

### Test users (`auth.users`)

| User | Exists | Confirmed |
|------|--------|-----------|
| `p5_e5_user_a@example.com` | **Yes** | **Yes** |
| `p5_e5_user_b@example.com` | **Yes** | **Yes** |

### Profiles before write

| User | Profile exists |
|------|----------------|
| User A | **No** |
| User B | **No** |

### Schema notes (`public.profiles`)

| Column | Required | Notes |
|--------|----------|-------|
| `id` | YES | PK, FK → `auth.users(id)` |
| `username` | YES | UNIQUE |
| `email_verified` | optional | default `false` |
| `role` | optional | default `'user'`, check `user`/`admin` |
| `is_banned` | NOT NULL | default `false` |

No `display_name` column — not used.

---

## 5. Write Performed

Transactional upsert for exactly two test users:

| Field | Value |
|-------|-------|
| Affected profiles | **2** |
| User A username | `p5_e5_user_a` |
| User B username | `p5_e5_user_b` |
| Role | `'user'` (both) |
| `email_verified` | `true` (both) |
| Admin role | **No** |
| Other users modified | **No** |
| Posts created | **No** |
| Notifications created | **No** |

---

## 6. Verification

| User | Profile exists | Username | Role | email_verified |
|------|----------------|----------|------|----------------|
| `p5_e5_user_a@example.com` | **Yes** | `p5_e5_user_a` | `user` | `true` |
| `p5_e5_user_b@example.com` | **Yes** | `p5_e5_user_b` | `user` | `true` |

| Cleanup signal | Result |
|----------------|--------|
| `p5_e5_*` profile count | **2** (A/B only) |
| `p5_e5_*` posts | **0** |
| `p5_e5_*` notifications | **0** |
| `release_gate` table | **Not present** (unchanged) |

---

## 7. Deferred

| Item | Status |
|------|--------|
| `release_gate_lock.sql` | **Not applied** |
| `phase_a_observations_foundation.sql` | **Not applied** |
| `admin_dashboard_notifications.sql` | Already applied (prior P5-E.5) |
| P5-E.5 Re-run | **Required** — new explicit approval |
| Negative RLS/RPC tests | **Not run** |

---

## 8. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Testuser Profiles Provisioning (P5-E.5B)** | **PASS** |
| **Ready for P5-E.5 Re-run** | **YES** — requires new explicit user approval |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

- **P5-E.5 Re-run** may proceed with new explicit approval (profiles blocker resolved).
- Apply order remains: `release_gate_lock.sql` → `phase_a_observations_foundation.sql` (`admin_dashboard_notifications.sql` already on staging).
- **P5-E.5 Re-run 2** blocked on `storage.objects` policy — see rerun2 report.
- **No push, deploy, or launch.**

---

## 9. P5-E.5 Re-run 2 Follow-up (BLOCKED)

**Gate:** P5-E.5 Re-run 2 — storage policy owner error. **BLOCKED**.

**Report:** `docs/architecture/p5-staged-db-security-retest-rerun2-report.md`

---

## 10. P5-E.5C Follow-up (PASS — storage policy deferred)

**Gate:** P5-E.5C — storage policy split. **PASS** (repo only).

**Report:** `docs/architecture/p5-storage-policy-defer-fix-report.md`

---

*Document version: P5-E.5B PASS + Re-run 2 BLOCKED + 5C PASS. No secrets.*
