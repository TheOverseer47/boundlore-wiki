# P5-STAGING.5A Legacy Schema-Only Export Plan

**Gate:** P5-STAGING.5A — Legacy Schema-Only Export Plan  
**Date:** 2026-07-13  
**HEAD at gate start:** `e6ca97b` — Document staging base schema provisioning blockers  
**User decision:** **Path A** — schema-only export from legacy DB (read-only, no data)  
**Type:** Planning only — **no export**, **no pg_dump**, **no DB access**, **no push/deploy/launch**

---

## 1. Scope

| In scope | Out of scope |
|----------|--------------|
| Plan legacy schema-only export workflow | Actual `pg_dump` / `psql` execution |
| Document command template (NOT RUN) | SQL apply on staging or legacy |
| Hard stops + review checklist | Data export / import |
| Curated output target: `supabase/core_schema_foundation.sql` | P5-E.5 re-run |
| Update staging gate docs | Production closure / Fable retest |

---

## 2. Why Legacy Schema-Only Export Is Needed

| Fact | Status |
|------|--------|
| P5-STAGING.5 verdict | **PARTIAL** — repo inventory complete |
| Staging `jzzgoiwfbuwiiyvwgwri` has `auth` + `storage` | `[x]` |
| Staging `public` BoundLore tables | **`0`** at P5-E.5 re-run |
| `CREATE TABLE public.posts` in repo | **NOT FOUND** |
| `CREATE TABLE public.profiles` in repo | **NOT FOUND** |
| `CREATE TABLE public.post_reactions` in repo | **NOT FOUND** |
| P5-E.5 re-run | **BLOCKED** |

**Base schema not fully reproducible from repo SQL alone.** User chose **Path A**: derive reproducible core DDL from a **schema-only** export of the legacy Supabase project, then curate into a committed foundation file for staging apply (later gates).

---

## 3. Source and Target

| Role | Value |
|------|-------|
| **Source (legacy only)** | Project ref `ohkoojpzmptdfyowdgog` |
| **Forbidden source** | Staging `jzzgoiwfbuwiiyvwgwri` |
| **Raw dump path (local, gitignored)** | `backups/legacy-schema-only/legacy-schema-only-YYYYMMDD-HHMMSS.sql` |
| **Curated repo output (future)** | `supabase/core_schema_foundation.sql` |
| **Legacy credentials** | Local env only (e.g. `SUPABASE_LEGACY_DB_URL`) — **never committed** |

### Flow (future gates — not executed in 5A)

```
ohkoojpzmptdfyowdgog (legacy, read-only pg_dump --schema-only)
    → backups/legacy-schema-only/*.sql (gitignored raw)
    → review + curation (P5-STAGING.5C)
    → supabase/core_schema_foundation.sql (committed, no data)
    → apply to jzzgoiwfbuwiiyvwgwri only (P5-STAGING.6+)
```

**No mutation** on legacy or staging in this planning gate.

---

## 4. Export Rules

| Rule | Requirement |
|------|-------------|
| Export type | **`--schema-only` only** |
| Data | **None** — no `--data-only`, no full dump |
| Auth user rows | **Excluded** — schema metadata only |
| Posts / content | **Excluded** — no INSERT/COPY data |
| Staging | **Not touched** |
| Legacy mutation | **None** — read-only `pg_dump` only |
| Secrets in repo/docs | **None** — mask URLs/keys in reports |
| `service_role` | **Not used** |
| Raw dump commit | **Forbidden** — `backups/` gitignored |
| `pre_release_test_data_reset.sql` | **NEVER execute** |

---

## 5. Command Template (NOT RUN)

**Status:** Template only. **Do not execute** until P5-STAGING.5B with explicit user approval.

### Prerequisites (5B)

- `SUPABASE_LEGACY_DB_URL` set locally (legacy ref only; not staging)
- `backups/legacy-schema-only/` directory exists
- `backups/` confirmed in `.gitignore`
- PostgreSQL 18 `pg_dump` available (full path if not in PATH)

### PowerShell template

```powershell
# NOT RUN — P5-STAGING.5A template only
# Requires explicit P5-STAGING.5B approval

$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$outDir = 'backups\legacy-schema-only'
$outFile = "$outDir\legacy-schema-only-$ts.sql"

# Validate legacy URL contains ohkoojpzmptdfyowdgog and NOT jzzgoiwfbuwiiyvwgwri
# Load from local env — never echo full URL or password

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

& 'C:\Program Files\PostgreSQL\18\bin\pg_dump.exe' `
  $env:SUPABASE_LEGACY_DB_URL `
  --schema-only `
  --no-owner `
  --no-privileges `
  --file $outFile `
  --verbose

# Verify file size > 0; do not commit; do not paste dump contents into chat/docs
```

### Required flags

| Flag | Purpose |
|------|---------|
| `--schema-only` | **Mandatory** — DDL only, no data |
| `--no-owner` | Avoid owner mismatch on staging apply |
| `--no-privileges` | Avoid privilege drift; RLS reapplied by repo SQL |

### Forbidden flags / modes

- No `--data-only`
- No full dump without `--schema-only`
- No `psql` queries against legacy except future read-only verification if separately approved
- No `supabase db dump` without schema-only equivalent

---

## 6. Hard Stops

Stop immediately (do not run export) if:

| Condition | Action |
|-----------|--------|
| User has not granted **explicit P5-STAGING.5B approval** | STOP |
| `SUPABASE_LEGACY_DB_URL` missing or unclear | STOP |
| URL contains `jzzgoiwfbuwiiyvwgwri` (staging) | STOP |
| URL does not unambiguously target legacy `ohkoojpzmptdfyowdgog` | STOP |
| `--schema-only` omitted | STOP |
| Export would be full or data dump | STOP |
| `backups/` not gitignored | STOP — fix `.gitignore` first |
| Output path outside `backups/legacy-schema-only/` | STOP |
| Dump would be committed to git | STOP |
| Any step requires SQL mutation on legacy | STOP |
| `service_role` used as client key | STOP |
| Secrets/passwords/ full DB URL would appear in docs or commit | STOP |

---

## 7. Raw Dump Review Checklist (P5-STAGING.5C prep)

After a future 5B export, **do not apply raw dump to staging**. Review locally:

| Check | Pass criterion |
|-------|----------------|
| `INSERT INTO` | **Absent** (or reject file) |
| `COPY public.` / `COPY auth.` | **Absent** for data rows |
| `auth.users` data | **No user rows** — schema refs OK |
| Real post slugs / QA content | **Absent** |
| Passwords / API keys in dump | **Absent** |
| `DROP DATABASE` / `TRUNCATE` / destructive blocks | **Flagged — exclude from curated file** |
| `OWNER TO` / `GRANT` noise | Review — prefer `--no-owner` / `--no-privileges` output |
| Extensions (`pgcrypto`, `uuid-ossp`, etc.) | Document — may need `CREATE EXTENSION` in curated file |
| Supabase internal schemas (`auth`, `storage`, `realtime`) | **Do not copy wholesale** — extract `public` core only |
| File stays under `backups/legacy-schema-only/` | `[x]` gitignored |

---

## 8. Curated Core Schema Target

### Output file (future commit)

**`supabase/core_schema_foundation.sql`** — idempotent where possible; **DDL only**; no data.

### Must include (minimum)

| Object | Why |
|--------|-----|
| `public.profiles` | Admin checks, FKs, signup mirror |
| `public.posts` | Core wiki + all downstream SQL |
| `public.post_reactions` | S+-01 policies |
| Related **types**, **extensions**, **functions**, **triggers** | FK and RLS dependencies |
| **Foreign keys** and **indexes** for above | Apply safety |
| Baseline **RLS ENABLE** + core **policies** | Required before incremental repo SQL |

### Should support later gates

- `notifications`, `user_submission_acks` (repo SQL creates/alters)
- `wiki_entities` / graph (`discovery_entity_backbone.sql`)
- `wiki_observations` / `bl_register_observation` (phase_a)
- `release_gate` (P5-E.5)

### Must NOT include

- `INSERT` / seed data / QA posts
- Real users / auth user rows
- Storage object metadata
- `pre_release_test_data_reset.sql` content
- Repair / danger SQL
- Production-specific secrets
- Full legacy schema dump unfiltered

### Review requirements before commit

1. Second operator review of curated file vs raw dump
2. Grep curated file: no `INSERT`, no `COPY`, no passwords
3. Static check: `CREATE TABLE public.posts`, `profiles`, `post_reactions` present
4. Cross-reference `p5-staging-base-schema-provisioning-plan.md` Phase 0

---

## 9. Re-entry Criteria for P5-STAGING.5B

P5-STAGING.5B (Legacy Schema-Only Export execution) may start only when:

| # | Criterion |
|---|-----------|
| 1 | This plan (5A) **PASS** |
| 2 | **Explicit user approval** for P5-STAGING.5B |
| 3 | `SUPABASE_LEGACY_DB_URL` available locally (legacy only) |
| 4 | URL validation: legacy ref yes, staging ref no |
| 5 | `backups/` gitignored (already `[x]` in repo) |
| 6 | Command uses **`pg_dump --schema-only`** only |
| 7 | Output path `backups/legacy-schema-only/` |
| 8 | No push / deploy / launch |
| 9 | No SQL apply in 5B — export only |

**After 5B:** P5-STAGING.5C — Curated Core Schema Extraction → then P5-STAGING.6 apply to staging.

---

## 10. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Legacy Schema-Only Export Plan (5A)** | **PASS** |
| **Legacy Schema-Only Export (5B)** | **PASS** — re-run 2026-07-13 |
| **P5-E.5 Re-run** | **BLOCKED** — until curated core schema applied to staging |
| **P5-STAGING.5 overall** | **PARTIAL** — Phase 0 export done; 5C curation next |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

User chose **Path A**. Schema-only export from legacy `ohkoojpzmptdfyowdgog` completed in **P5-STAGING.5B re-run** (138,895-byte gitignored dump). Staging `jzzgoiwfbuwiiyvwgwri` not touched.

**Next:** **P5-STAGING.5C** Curated Core Schema Extraction → **P5-STAGING.6** apply to staging.

**Not in scope:** Push, deploy, launch, data export, P5-E.5.

---

## 11. P5-STAGING.5B Follow-up (first attempt — BLOCKED)

**Gate:** P5-STAGING.5B — first attempt (HEAD `1f0e53e`). **BLOCKED** — `.env.legacy` not found locally.

| Item | Status |
|------|--------|
| User approval for 5B | `[x]` |
| `.env.legacy` local | `[ ]` — **missing** |
| `pg_dump` executed | `[x]` — **none** |
| Legacy Export (5B) | **BLOCKED** |

---

## 12. P5-STAGING.5B Re-run (PASS)

**Gate:** P5-STAGING.5B re-run (HEAD `9ddc7f9`). User approval granted. **PASS.**

| Item | Status |
|------|--------|
| `.env.legacy` local | `[x]` present, gitignored |
| `SUPABASE_LEGACY_CONFIRM_IS_LEGACY` | `[x]` `true` |
| Legacy ref `ohkoojpzmptdfyowdgog` | `[x]` |
| Staging `jzzgoiwfbuwiiyvwgwri` excluded | `[x]` |
| `pg_dump --schema-only --schema=public` | `[x]` |
| Dump path | `backups/legacy-schema-only/legacy-public-schema-only-20260713-192641.sql` |
| Dump size | 138,895 bytes |
| No-data verification | `[x]` PASS |
| Required core tables in dump | `[x]` all six |
| SQL apply / staging mutation | `[x]` — none |
| Legacy Export (5B) | **PASS** |

**Report:** `docs/architecture/p5-legacy-schema-only-export-report.md`

**Next:** P5-STAGING.5C → P5-STAGING.6. No push/deploy/launch.

---

## Related Documents

| Document | Role |
|----------|------|
| `p5-legacy-schema-only-export-report.md` | P5-STAGING.5B export report (PASS) |
| `p5-staging-base-schema-provisioning-plan.md` | P5-STAGING.5 inventory + Phase 0 |
| `p5-staged-db-application-report.md` | P5-E.5 re-run blocked |
| `p5-staging-environment-plan.md` | Staging gate sequence |

---

*Document version: P5-STAGING.5A + 5B PASS (re-run). Export local/gitignored. No secrets.*
