# P5-STAGING.6 Re-run Base Schema Apply to Staging Report

**Gate:** P5-STAGING.6 Re-run — Base Schema Apply to Staging  
**Date:** 2026-07-13  
**HEAD at gate start:** `91aae1c` — Fix core schema dependency order  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`  
**Verdict:** **FAIL** — apply aborted at `pg_trgm` GIN index  
**Not P5-E.5:** `[x]` — no P5 security SQL applied

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-STAGING.6 Re-run | `[x]` |
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
| Direct host `db.jzzgoiwfbuwiiyvwgwri.supabase.co` | **FAIL** on this network (DNS/IPv6) — pooler used |
| Secrets in this report | **None** |

---

## 3. Pre-Apply Backup

| Item | Value |
|------|-------|
| Path | `backups/staging/p5-staging6-rerun-preapply-20260713-195028.sql` |
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
| Destructive SQL (`TRUNCATE`, `DROP SCHEMA`, `DROP TABLE posts`) | **No** |
| Secrets / DB URLs / `service_role` | **No** |
| `pre_release_test_data_reset` | **No** |
| Required core `CREATE TABLE IF NOT EXISTS` (9 tables) | **Yes** |
| Dependency order (`wiki_relation_types` before `bl_match_entities`) | **PASS** |
| Tables before functions/triggers/policies | **PASS** |
| Static safety verdict | **PASS** |

**Apply-time gap (not static-safety):** `idx_wiki_observations_entity_name_trgm` requires `pg_trgm` extension; extension not present in file or on staging (`pg_extension` count 0).

---

## 5. SQL Apply

| Item | Value |
|------|-------|
| File applied | `supabase/core_schema_foundation.sql` only |
| Method | `psql -v ON_ERROR_STOP=1 -f ...` via staging session pooler |
| Result | **FAIL** |
| Error | `operator class "public.gin_trgm_ops" does not exist for access method "gin"` at line **660** |
| Root cause | GIN trigram index on `wiki_observations.entity_name` without `CREATE EXTENSION pg_trgm` |
| Prior blocker (6A) | **Resolved** — apply progressed past `bl_match_entities` |
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
| RLS on core tables | **N/A** — tables not created |
| Policies on core tables | **N/A** |
| Public functions | **N/A** — apply aborted before completion |
| `bl_match_entities` | **Not present** (rollback) |

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
| `admin_dashboard_notifications.sql` | Deferred to P5-E.5 |
| `release_gate_lock.sql` | Deferred to P5-E.5 |
| `phase_a_observations_foundation.sql` | Deferred to P5-E.5 |
| `release_gate` table | **Absent** (count 0) |
| `bl_is_release_unlocked` | **Absent** (count 0) |
| `bl_assert_can_create_user_content` | **Absent** (count 0) |
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

No local writes. Not staging-connected.

---

## 11. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Base Schema Apply Re-run (6)** | **FAIL** |
| **Ready for P5-E.5 Re-run** | **NO** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Remediation

~~Add `CREATE EXTENSION IF NOT EXISTS pg_trgm`~~ → **done in P5-STAGING.6B** → re-run P5-STAGING.6 with explicit approval.

**Not in scope:** Push, deploy, launch, legacy/production touch, P5-E.5 apply.

---

## 12. P5-STAGING.6B Follow-up (PASS — local extension fix)

**Gate:** P5-STAGING.6B — `pg_trgm` extension added before GIN trigram indexes. **PASS** (repo only).

| Item | Status |
|------|--------|
| SQL apply / DB access | `[x]` — none |
| `pg_trgm` before `gin_trgm_ops` | `[x]` |
| Staging `public` | `[x]` still empty |
| Ready for P5-STAGING.6 Re-run | **YES** — explicit approval required |

**Report:** `docs/architecture/p5-core-schema-extension-fix-report.md`

---

## 13. P5-STAGING.6 Re-run 2 Follow-up (FAIL)

**Gate:** P5-STAGING.6 Re-run 2 — user approval granted. **FAIL** — truncated multi-line `CREATE POLICY` statements.

| Item | Status |
|------|--------|
| Pre-apply backup | `[x]` 185,427 bytes |
| 6A/6B blockers on apply path | `[x]` PASS |
| Apply error | syntax error near `POLICY` (~line 1927) |
| Staging `public` | `[x]` empty (rollback) |
| Base Schema Apply Re-run 2 | **FAIL** |

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun2-report.md`

---

## 14. P5-STAGING.6C Follow-up (PASS — local policy reconstruction)

**Gate:** P5-STAGING.6C — 84 policies reconstructed. **PASS** (repo only).

**Report:** `docs/architecture/p5-core-schema-policy-reconstruction-fix-report.md`

---

*Document version: P5-STAGING.6 Re-run FAIL + 6B PASS + Re-run 2 FAIL + 6C PASS. Staging unchanged. No secrets.*
