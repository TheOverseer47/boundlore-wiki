# P5-STAGING.6 Re-run 3 Base Schema Apply to Staging Report

**Gate:** P5-STAGING.6 Re-run 3 — Base Schema Apply to Staging  
**Date:** 2026-07-13  
**HEAD at gate start:** `2493bc3` — Fix core schema policy reconstruction  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`  
**Verdict:** **PASS** — base schema applied successfully  
**Not P5-E.5:** `[x]` — no P5 security SQL applied

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-STAGING.6 Re-run 3 | `[x]` |
| Staging only | `[x]` |
| Legacy `ohkoojpzmptdfyowdgog` excluded | `[x]` |
| Production excluded | `[x]` |
| Push / Deploy / Launch | `[x]` — none |
| P5-E.5 security files applied | `[x]` — **none** |

---

## 2. Environment

| Field | Value |
|-------|-------|
| Staging ref | `jzzgoiwfbuwiiyvwgwri` |
| Staging URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` |
| Legacy ref (forbidden) | `ohkoojpzmptdfyowdgog` — **not used** |
| `SUPABASE_STAGING_CONFIRM_ISOLATED` | `true` |
| Client key type | `sb_publishable_*` (not `service_role` / `sb_secret`) |
| Connection path | Session pooler `aws-0-eu-central-1.pooler.supabase.com:5432`, user `postgres.jzzgoiwfbuwiiyvwgwri` |
| Direct host | **FAIL** on this network — pooler used |
| Secrets in this report | **None** |

---

## 3. Pre-Apply Backup

| Item | Value |
|------|-------|
| Path | `backups/staging/p5-staging6-rerun3-preapply-20260713-202145.sql` |
| Size | **185,427 bytes** |
| Gitignored | `[x]` |
| Staged | `[x]` — not staged |
| Backup verdict | **PASS** |

---

## 4. Static SQL Safety Check

**File:** `supabase/core_schema_foundation.sql`

| Check | Result |
|-------|--------|
| `INSERT INTO` / `COPY` / data | **Absent** |
| Secrets / DB URLs / `service_role` | **Absent** |
| Destructive SQL | **Absent** |
| Required 9 core tables | **PASS** |
| `pg_trgm` before `gin_trgm_ops` | **PASS** |
| `wiki_relation_types` before `bl_match_entities` | **PASS** |
| Tables → functions → triggers → RLS → policies | **PASS** |
| 84 `CREATE POLICY` complete (6C) | **PASS** |
| Static safety verdict | **PASS** |

---

## 5. SQL Apply

| Item | Value |
|------|-------|
| File applied | `supabase/core_schema_foundation.sql` |
| Target | Staging `jzzgoiwfbuwiiyvwgwri` only |
| Transaction | `BEGIN` … `COMMIT` |
| Exit code | **0** |
| Apply verdict | **PASS** |

**Not applied (deferred to P5-E.5):**

- `supabase/admin_dashboard_notifications.sql`
- `supabase/release_gate_lock.sql`
- `supabase/phase_a_observations_foundation.sql`

---

## 6. Post-Apply Schema Verification

| Table | Present |
|-------|---------|
| `profiles` | **Yes** |
| `posts` | **Yes** |
| `post_reactions` | **Yes** |
| `notifications` | **Yes** |
| `user_submission_acks` | **Yes** |
| `wiki_entities` | **Yes** |
| `wiki_relation_types` | **Yes** |
| `wiki_entity_relations` | **Yes** |
| `wiki_observations` | **Yes** |

**Pre-apply:** `public` had **0** tables.  
**Post-apply:** `public` has **24** tables total.

---

## 7. RLS / Policy / Function Signal

### RLS (`rowsecurity`)

All 9 core tables: **`true`**

### Policies (core tables)

| Table | Policy count |
|-------|--------------|
| `profiles` | 7 |
| `posts` | 11 |
| `post_reactions` | 8 |
| `notifications` | 3 |
| `user_submission_acks` | 3 |
| `wiki_entities` | 2 |
| `wiki_relation_types` | 2 |
| `wiki_entity_relations` | 2 |
| `wiki_observations` | 2 |

**Total `public` policies:** **84**

### Functions

| Signal | Result |
|--------|--------|
| `bl_match_entities` | **Present** |
| `rls_auto_enable` | **Present** |
| Total `public` functions | **49** |

**Limitation:** Negative RLS/RPC tests not run (P5-E.5 scope).

---

## 8. Testuser Integrity

| User | Exists | Confirmed |
|------|--------|-----------|
| `p5_e5_user_a@example.com` | **Yes** | **Yes** |
| `p5_e5_user_b@example.com` | **Yes** | **Yes** |

No passwords or user IDs documented.

---

## 9. Not Applied / Deferred

| Item | Status |
|------|--------|
| `admin_dashboard_notifications.sql` | **Deferred** → P5-E.5 |
| `release_gate_lock.sql` | **Deferred** → P5-E.5 |
| `phase_a_observations_foundation.sql` | **Deferred** → P5-E.5 |
| `release_gate` table | **Not present** |
| `bl_is_release_unlocked` | **Not present** |
| `bl_assert_can_create_user_content` | **Not present** |
| Negative RLS/RPC tests | **Not run** |

**P5-E.5 remains required** before product activation.

---

## 10. Optional Local HTTP Smoke

| URL | Status |
|-----|--------|
| `http://localhost:8080/` | **200** |
| `http://localhost:8080/wiki/browse/` | **200** |
| `http://localhost:8080/wiki/search/?q=ogre` | **200** |
| `http://localhost:8080/qa/p5-release-lock-db-security-fixtures.html` | **200** |

---

## 11. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Base Schema Apply Re-run 3** | **PASS** |
| **Ready for P5-E.5 Re-run** | **YES** — requires new explicit user approval |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

- **P5-E.5 Re-run** may be prepared next — only with **new explicit user approval**.
- Apply P5 security SQL files on staging after E.5 approval.
- **No push, deploy, or launch** until full gate sequence passes.

---

## 12. P5-E.5 Re-run Follow-up (BLOCKED)

**Gate:** P5-E.5 Re-run — SQL apply failed at `release_gate_lock.sql`. **BLOCKED**.

**Report:** `docs/architecture/p5-staged-db-application-rerun-report.md`

---

*Document version: P5-STAGING.6 Re-run 3 PASS + P5-E.5 Re-run BLOCKED. No secrets.*
