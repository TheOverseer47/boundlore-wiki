# P5-STAGING.6 Base Schema Apply to Staging Report

**Gate:** P5-STAGING.6 — Base Schema Apply to Staging  
**Date:** 2026-07-13  
**HEAD at gate start:** `c986af2` — Add curated core schema foundation  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`  
**Verdict:** **FAIL** — `core_schema_foundation.sql` apply aborted (dependency order)  
**Not P5-E.5:** `[x]` — no P5 security SQL applied

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-STAGING.6 | `[x]` |
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
| Path | `backups/staging/p5-staging6-preapply-20260713-193900.sql` |
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
| Required core `CREATE TABLE IF NOT EXISTS` | **Yes** — all six |
| Static safety verdict | **PASS** |

---

## 5. SQL Apply

| Item | Value |
|------|-------|
| File applied | `supabase/core_schema_foundation.sql` only |
| Method | `psql -v ON_ERROR_STOP=1 -f ...` via staging pooler |
| Result | **FAIL** |
| Error | `relation "public.wiki_relation_types" does not exist` at ~line 315 |
| Root cause | Function `bl_match_entities` created **before** tables; body references `wiki_relation_types` |
| Transaction | Rolled back — `BEGIN`/`COMMIT` wrapper; no partial commit |
| Other SQL files | **Not applied** |

### Not applied (deferred to P5-E.5)

| File | Status |
|------|--------|
| `admin_dashboard_notifications.sql` | **Not applied** |
| `release_gate_lock.sql` | **Not applied** |
| `phase_a_observations_foundation.sql` | **Not applied** |

---

## 6. Pre-Apply / Post-Fail Schema State

| Phase | `public` tables |
|-------|-----------------|
| Pre-apply | **0** (empty) |
| Post-fail | **0** (empty — rollback) |

### Required tables post-apply

| Table | Present |
|-------|---------|
| `profiles` | **No** |
| `posts` | **No** |
| `post_reactions` | **No** |
| `notifications` | **No** |
| `user_submission_acks` | **No** |
| `wiki_entities` | **No** |
| `wiki_entity_relations` | **No** |
| `wiki_observations` | **No** |

---

## 7. RLS / Policy / Function Signal

| Signal | Post-fail |
|--------|-----------|
| RLS on core tables | **N/A** — tables not created |
| Policies | **N/A** |
| Core functions | **N/A** — rolled back |

---

## 8. Testuser Integrity

| User | Exists | Confirmed |
|------|--------|-----------|
| `p5_e5_user_a@example.com` | **Yes** | **Yes** |
| `p5_e5_user_b@example.com` | **Yes** | **Yes** |

No passwords or user IDs documented.

---

## 9. P5-Security Not Applied (verified)

| Check | Result |
|-------|--------|
| `release_gate` table | **Absent** (count 0) |
| P5 notification hardening | **Not applied** |
| P5 observation RPC hardening | **Not applied** |
| P5-E.5 still required | **Yes** |

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
| **Base Schema Apply (6)** | **FAIL** |
| **Ready for P5-E.5 Re-run** | **NO** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Remediation

Re-order `core_schema_foundation.sql`: **tables → constraints → indexes → functions → triggers → policies** (or split apply phases). Re-run P5-STAGING.6 with explicit approval after fix.

**Not in scope:** Push, deploy, launch, legacy/production touch, P5-E.5 apply.

---

## 12. P5-STAGING.6A Follow-up (PASS — local reorder)

**Gate:** P5-STAGING.6A — Core Schema Reorder Fix. **PASS** (local repo only).

| Item | Status |
|------|--------|
| SQL apply / DB access | `[x]` — none |
| `core_schema_foundation.sql` reordered | `[x]` |
| `wiki_relation_types` before `bl_match_entities` | `[x]` |
| Tables before functions/triggers/policies | `[x]` |
| No INSERT/COPY/data/secrets | `[x]` |
| Staging `public` | `[x]` still empty (6 not re-run) |
| Core Schema Reorder Fix (6A) | **PASS** |
| Ready for P5-STAGING.6 Re-run | **YES** — new explicit approval required |

**Report:** `docs/architecture/p5-core-schema-reorder-fix-report.md`

---

## 13. P5-STAGING.6 Re-run Follow-up (FAIL)

**Gate:** P5-STAGING.6 Re-run — user approval granted. **FAIL** — `pg_trgm` GIN index at line 660.

| Item | Status |
|------|--------|
| Pre-apply backup | `[x]` 185,427 bytes |
| 6A dependency order on apply | `[x]` PASS |
| Apply error | `gin_trgm_ops` operator class missing |
| Staging `public` post-fail | `[x]` empty (rollback) |
| Base Schema Apply Re-run | **FAIL** |

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun-report.md`

---

## 14. P5-STAGING.6B Follow-up (PASS — local extension fix)

**Gate:** P5-STAGING.6B — `pg_trgm` extension dependency fix. **PASS** (repo only).

| Item | Status |
|------|--------|
| `pg_trgm` before `gin_trgm_ops` indexes | `[x]` |
| No SQL apply / no DB access | `[x]` |
| Staging `public` still empty | `[x]` |
| Ready for P5-STAGING.6 Re-run | **YES** — explicit approval required |

**Report:** `docs/architecture/p5-core-schema-extension-fix-report.md`

---

## 15. P5-STAGING.6 Re-run 2 Follow-up (FAIL)

**Gate:** P5-STAGING.6 Re-run 2 — **FAIL** (truncated multi-line policies). 6A/6B validated on apply path.

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun2-report.md`

---

## 16. P5-STAGING.6C Follow-up (PASS — local policy reconstruction)

**Gate:** P5-STAGING.6C — policy reconstruction. **PASS** (repo only).

**Report:** `docs/architecture/p5-core-schema-policy-reconstruction-fix-report.md`

---

*Document version: P5-STAGING.6 FAIL + 6A PASS + 6 Re-run FAIL + 6B PASS + Re-run 2 FAIL + 6C PASS. Staging unchanged. No secrets.*
