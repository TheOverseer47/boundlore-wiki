# P5-STAGING.5B Legacy Schema-Only Export Report

**Gate:** P5-STAGING.5B — Legacy Schema-Only Export (Re-run)  
**Date:** 2026-07-13  
**HEAD at gate start:** `9ddc7f9` — Document legacy schema-only export blockers  
**User approval:** **YES** — legacy read-only, schema-only, no data, no staging apply  
**Verdict:** **PASS** — schema-only public export completed  
**Export performed:** **YES**  
**pg_dump executed:** **YES**

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-STAGING.5B | `[x]` |
| Legacy ref `ohkoojpzmptdfyowdgog` only | `[x]` |
| Staging `jzzgoiwfbuwiiyvwgwri` excluded | `[x]` |
| `--schema-only` + `--schema=public` | `[x]` |
| No data / no auth data export | `[x]` |
| No SQL apply / no staging mutation | `[x]` |
| Push / Deploy / Launch | `[x]` — none |

**First attempt (HEAD `9ddc7f9` prior):** BLOCKED — `.env.legacy` missing.  
**Re-run:** `.env.legacy` present locally; validation passed; export completed.

---

## 2. Environment

| Field | Value |
|-------|-------|
| Legacy project ref | `ohkoojpzmptdfyowdgog` |
| Staging ref (forbidden) | `jzzgoiwfbuwiiyvwgwri` — **not used** |
| `.env.legacy` local | `[x]` present, gitignored |
| `SUPABASE_LEGACY_CONFIRM_IS_LEGACY` | `true` |
| Connection | Legacy session pooler (`postgres.ohkoojpzmptdfyowdgog` user) |
| `service_role` | **Not used** |
| Secrets in this report | **None** |

---

## 3. Export Command Properties

| Property | Value |
|----------|-------|
| Tool | `pg_dump` PostgreSQL 18.4 |
| Path | `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` |
| `--schema-only` | `[x]` |
| `--schema=public` | `[x]` |
| `--no-owner` | `[x]` |
| `--no-privileges` | `[x]` |
| Full / data dump | **No** |
| Legacy mutation | **No** |

---

## 4. Output

| Item | Value |
|------|-------|
| Dump created | **YES** |
| Path | `backups/legacy-schema-only/legacy-public-schema-only-20260713-192641.sql` |
| File size | **138,895 bytes** |
| Gitignored | `[x]` — via `backups/` in `.gitignore` |
| Staged | `[x]` — not staged |

---

## 5. No-Data Verification

| Check | Found |
|-------|-------|
| `INSERT INTO` | **No** |
| `COPY public.` | **No** |
| `COPY auth.` | **No** |
| `auth.users` row data | **No** — only schema references (FK constraints, function body) |
| QA content (`qa-ogre`, `qa-staff`, `qa-ember`, `p5_e5_user`, etc.) | **No** |
| **No-data verdict** | **PASS** |

---

## 6. Required Object Signal

| Object | `CREATE TABLE` in dump |
|--------|------------------------|
| `public.posts` | **Yes** |
| `public.profiles` | **Yes** |
| `public.post_reactions` | **Yes** |
| `public.notifications` | **Yes** |
| `public.user_submission_acks` | **Yes** |
| `public.wiki_entities` | **Yes** |

Additional public tables in dump (for 5C curation): `comments`, `ratings`, `reports`, `admin_actions`, wiki subsystem tables, RPC functions, RLS policies.

---

## 7. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Legacy Schema-Only Export (5B)** | **PASS** |
| **Ready for P5-STAGING.5C** | **YES** |
| **P5-E.5 Re-run** | **BLOCKED** (unchanged — core schema not yet curated/applied to staging) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

P5-STAGING.5B re-run completed successfully. Read-only `pg_dump --schema-only --schema=public` from legacy `ohkoojpzmptdfyowdgog` produced a gitignored local dump with no row data. All six required core tables present as `CREATE TABLE` statements.

**Next:** **P5-STAGING.5C** — Curated Core Schema Extraction → `supabase/core_schema_foundation.sql` → then **P5-STAGING.6** apply to staging.

**Not in scope:** Push, deploy, launch, dump commit, staging apply.

---

## Related Documents

| Document | Role |
|----------|------|
| `p5-legacy-schema-only-export-plan.md` | P5-STAGING.5A/5B plan |
| `p5-staging-base-schema-provisioning-plan.md` | Phase 0 context |

---

*Document version: P5-STAGING.5B PASS (re-run). Export local/gitignored. No secrets.*
