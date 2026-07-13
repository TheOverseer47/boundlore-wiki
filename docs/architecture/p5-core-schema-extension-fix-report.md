# P5-STAGING.6B Core Schema Extension Dependency Fix Report

**Gate:** P5-STAGING.6B — Core Schema Extension Dependency Fix (local repo only)  
**HEAD before gate:** `e7de094` — Document staging base schema apply rerun blockers  
**Date:** 2026-07-13

---

## 1. Scope

| Constraint | Status |
|------------|--------|
| Local repo fix only | `[x]` |
| No SQL apply | `[x]` |
| No DB access | `[x]` |
| No psql / pg_dump | `[x]` |
| No staging or legacy touch | `[x]` |
| No push / deploy / launch | `[x]` |
| No data / INSERT / COPY | `[x]` |
| No secrets / keys / DB URLs | `[x]` |

---

## 2. Failure Being Addressed

**P5-STAGING.6 Re-run** (HEAD `e7de094`) failed during staging apply of `supabase/core_schema_foundation.sql`.

| Item | Detail |
|------|--------|
| Error | `operator class "public.gin_trgm_ops" does not exist for access method "gin"` |
| Location | Line **660** in pre-fix file (index `idx_wiki_observations_entity_name_trgm`) |
| Root cause | GIN trigram index references `public.gin_trgm_ops` but `CREATE EXTENSION pg_trgm` was missing |
| Prior fix (6A) | **Validated on apply** — dependency reorder passed; apply progressed past `bl_match_entities` |
| Outcome | Transaction rolled back; staging `public` schema remained **empty** |

Legacy schema-only dump also omitted `pg_trgm` (extension lives outside `public` schema-only export).

---

## 3. Changes Made

Added to extensions block in `supabase/core_schema_foundation.sql`:

```sql
create extension if not exists pg_trgm with schema public;
```

| Property | Status |
|----------|--------|
| `pg_trgm` before all `gin_trgm_ops` indexes | `[x]` (line ~19 vs ~663) |
| Schema matches index operator class (`public.gin_trgm_ops`) | `[x]` |
| `pgcrypto` retained for `gen_random_uuid()` | `[x]` — already present |
| Additional extensions added | **None** — no `uuid-ossp`, `unaccent`, or other deps found |
| Tables / functions / policies unchanged in order | `[x]` |
| No tables removed | `[x]` |
| No DROP / TRUNCATE | `[x]` |
| No INSERT / COPY / row data | `[x]` |

---

## 4. Safety Checks

Static scan of `supabase/core_schema_foundation.sql`:

| Check | Result |
|-------|--------|
| `INSERT INTO` | **Absent** |
| `COPY public.` / `COPY auth.` | **Absent** |
| `TRUNCATE` | **Absent** |
| `DROP SCHEMA` / `DROP TABLE public.posts` | **Absent** |
| `pre_release_test_data_reset` | **Absent** |
| `service_role` | **Absent** |
| Full DB URL / API keys / passwords | **Absent** |
| QA fixture usernames | **Absent** |

---

## 5. Required Object Signal

| Object | `CREATE TABLE IF NOT EXISTS` present |
|--------|--------------------------------------|
| `profiles` | **Yes** (line ~23) |
| `posts` | **Yes** (line ~79) |
| `post_reactions` | **Yes** (line ~112) |
| `notifications` | **Yes** (line ~122) |
| `user_submission_acks` | **Yes** (line ~182) |
| `wiki_entities` | **Yes** (line ~189) |
| `wiki_relation_types` | **Yes** (line ~48) |
| `wiki_entity_relations` | **Yes** (line ~217) |
| `wiki_observations` | **Yes** (line ~256) |

---

## 6. Dependency Signal

| Signal | Result |
|--------|--------|
| `pg_trgm` extension before `gin_trgm_ops` index | **PASS** (~19 vs ~663) |
| `wiki_relation_types` CREATE before `bl_match_entities` | **PASS** (~48 vs ~1031) |
| Tables section before Functions section | **PASS** (~21 vs ~944) |
| Functions before Triggers | **PASS** (~944 vs ~1354) |
| RLS enable before Policies | **PASS** (~1376 vs ~1634) |
| No new data/seed logic | **PASS** |

### Extension dependency audit

| Dependency | Extension | Action |
|------------|-----------|--------|
| `public.gin_trgm_ops` | `pg_trgm` | **Added** |
| `gen_random_uuid()` | `pgcrypto` | Already present |
| `uuid_generate_v4()` | `uuid-ossp` | Not used — no change |
| `unaccent()` | `unaccent` | Not used — no change |

---

## 7. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Core Schema Extension Fix (6B)** | **PASS** |
| **Ready for P5-STAGING.6 Re-run** | **YES** → **Re-run 2 attempted (FAIL)** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

- **P5-STAGING.6 Re-run 2** attempted; **FAIL** (truncated policies). Fix via P5-STAGING.6C suggested.
- Staging `public` is still empty until apply succeeds.
- **No push, deploy, or launch** until full gate sequence passes.

---

## 8. P5-STAGING.6 Re-run 2 Follow-up (FAIL)

**Gate:** P5-STAGING.6 Re-run 2 — apply attempted after 6B. **FAIL** — incomplete `CREATE POLICY` bodies from 6A reorder.

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun2-report.md`

---

*Document version: P5-STAGING.6B PASS + Re-run 2 FAIL. No secrets.*
