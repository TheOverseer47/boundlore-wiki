# P5-STAGING.6 Re-run 2 Base Schema Apply to Staging Report

**Gate:** P5-STAGING.6 Re-run 2 — Base Schema Apply to Staging  
**Date:** 2026-07-13  
**HEAD at gate start:** `afae8c0` — Fix core schema extension dependencies  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`  
**Verdict:** **FAIL** — truncated multi-line `CREATE POLICY` statements  
**Not P5-E.5:** `[x]` — no P5 security SQL applied

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-STAGING.6 Re-run 2 | `[x]` |
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
| Path | `backups/staging/p5-staging6-rerun2-preapply-20260713-200015.sql` |
| Size | **185,427 bytes** |
| Gitignored | `[x]` |
| Staged | `[x]` — not staged |
| Backup verdict | **PASS** |

---

## 4. Static SQL Safety Check (`core_schema_foundation.sql`)

| Check | Result |
|-------|--------|
| Top-level `INSERT INTO` | **No** |
| `COPY public.` / `COPY auth.` | **No** |
| Destructive SQL | **No** |
| Secrets / DB URLs / `service_role` | **No** |
| Required core `CREATE TABLE IF NOT EXISTS` (9 tables) | **Yes** |
| `pg_trgm` before `gin_trgm_ops` | **PASS** (~19 vs ~663) |
| `wiki_relation_types` before `bl_match_entities` | **PASS** |
| Tables before functions/triggers/policies | **PASS** |
| Static safety (no data/secrets/destructive) | **PASS** |

**Apply-time gap (not caught by static safety grep):** Several `CREATE POLICY` statements with multi-line `EXISTS (SELECT 1 FROM profiles …)` bodies were truncated during P5-STAGING.6A reorder. Example at line ~1641: policy body ends at `(EXISTS ( SELECT 1` without continuation; tail fragments orphaned in `-- === Other ===` section (~1914–1927).

---

## 5. SQL Apply

| Item | Value |
|------|-------|
| File applied | `supabase/core_schema_foundation.sql` only |
| Method | `psql -v ON_ERROR_STOP=1 -f ...` via staging session pooler |
| Result | **FAIL** |
| Error | `syntax error at or near "POLICY"` at line **1927** |
| Root cause | Incomplete `CREATE POLICY` for `"Admins can delete any post"` (and similar admin EXISTS policies) — multi-line bodies split during 6A reorder |
| Prior blockers (6A/6B) | **Resolved on apply path** — progressed past `bl_match_entities`, `pg_trgm` GIN index, functions, triggers, RLS enable |
| Transaction | Rolled back — `BEGIN`/`COMMIT` wrapper; staging `public` still empty |
| Other SQL files | **Not applied** |

### Not applied (deferred to P5-E.5)

| File | Status |
|------|--------|
| `admin_dashboard_notifications.sql` | **Deferred** |
| `release_gate_lock.sql` | **Deferred** |
| `phase_a_observations_foundation.sql` | **Deferred** |

---

## 6. Post-Apply Schema Verification

| Table | Present |
|-------|---------|
| `profiles` | **No** |
| `posts` | **No** |
| `post_reactions` | **No** |
| `notifications` | **No** |
| `user_submission_acks` | **No** |
| `wiki_entities` | **No** |
| `wiki_relation_types` | **No** |
| `wiki_entity_relations` | **No** |
| `wiki_observations` | **No** |

**Public table count:** 0 (rollback confirmed)

---

## 7. RLS / Policy / Function Signal

| Signal | Result |
|--------|--------|
| RLS on core tables | **N/A** — rollback |
| Policies on core tables | **N/A** |
| Public functions | **N/A** |
| `bl_match_entities` | **Not present** |

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
| P5 security SQL files | Deferred to P5-E.5 |
| `release_gate` table | **Absent** |
| `bl_is_release_unlocked` | **Absent** |
| `bl_assert_can_create_user_content` | **Absent** |
| Negative RLS/RPC tests | **Not run** |

**P5-E.5 remains required** after base schema apply succeeds.

---

## 10. Optional Local HTTP Smoke

| URL | Result |
|-----|--------|
| `http://localhost:8080/` | **200** |
| `http://localhost:8080/wiki/browse/` | **200** |
| `http://localhost:8080/wiki/search/?q=ogre` | **200** |
| `http://localhost:8080/qa/p5-release-lock-db-security-fixtures.html` | **200** |

---

## 11. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Base Schema Apply Re-run 2 (6)** | **FAIL** |
| **Ready for P5-E.5 Re-run** | **NO** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Remediation

Repair truncated multi-line `CREATE POLICY` statements in `core_schema_foundation.sql` (restore full `EXISTS (SELECT 1 FROM profiles …)` bodies from legacy schema-only dump). Suggested gate: **P5-STAGING.6C**. Then re-run P5-STAGING.6 with explicit approval.

**Not in scope:** Push, deploy, launch, legacy/production touch, P5-E.5 apply.

---

*Document version: P5-STAGING.6 Re-run 2 FAIL. Staging `public` unchanged. No secrets.*
