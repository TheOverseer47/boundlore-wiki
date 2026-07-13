# P5-STAGING.6C Core Schema Policy Reconstruction Fix Report

**Gate:** P5-STAGING.6C — Core Schema Policy Reconstruction Fix (local repo only)  
**HEAD before gate:** `70d50f1` — Document staging base schema apply rerun 2 blockers  
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
| Raw dump read-only, not committed | `[x]` |

---

## 2. Failure Being Addressed

**P5-STAGING.6 Re-run 2** failed during staging apply.

| Item | Detail |
|------|--------|
| Error | `syntax error at or near "POLICY"` |
| Root cause | Multi-line `CREATE POLICY` bodies truncated during P5-STAGING.6A reorder |
| Example | `"Admins can delete any post"` ended at `(EXISTS ( SELECT 1` without `FROM public.profiles …);` |
| Orphans | Tail fragments in `-- === Other ===` section (~1914–1927) |
| Duplicates | Overlapping policy blocks in RLS + Policies sections |

---

## 3. Source

| Item | Value |
|------|-------|
| Path | `backups/legacy-schema-only/legacy-public-schema-only-20260713-192641.sql` |
| Use | Read-only local reconstruction |
| Committed | **No** (gitignored under `backups/`) |
| Data copied | **No** — policy DDL only |

---

## 4. Changes Made

Replaced foundation tail from `-- === Row level security ===` through `commit;` with reconstructed content from legacy dump.

| Change | Detail |
|--------|--------|
| Quoted policies | 24 policies with `DROP POLICY IF EXISTS` + full `CREATE POLICY` |
| Per-table RLS block | 24 `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + 60 snake_case policies |
| Total policies | **84** (matches legacy dump count) |
| Removed | Truncated policy bodies, duplicate blocks, `-- === Other ===` orphans |
| Idempotency | `DROP POLICY IF EXISTS` before every `CREATE POLICY` |
| File size | ~1780 lines (down from ~1930) |

### Affected table areas (all policies reconstructed)

| Area | Tables |
|------|--------|
| Core social | `profiles`, `posts`, `post_reactions`, `notifications`, `comments`, `ratings`, `reports` |
| Wiki core | `wiki_entities`, `wiki_entity_relations`, `wiki_observations`, `wiki_relation_types` |
| Wiki subsystem | `wiki_observation_entities`, `wiki_entity_aliases`, `wiki_entity_claims`, `wiki_entity_history`, `wiki_entity_merge_history`, `wiki_category_extensions`, `wiki_discovery_evidence`, `wiki_schema_versions`, `wiki_submission_statuses`, `wiki_sync_logs`, `wiki_patch_mode` |
| Admin | `admin_actions`, `user_submission_acks` |

---

## 5. Policy Syntax Signals

| Signal | Result |
|--------|--------|
| `CREATE POLICY` count | **84** |
| `DROP POLICY IF EXISTS` count | **84** |
| Each policy ends with `;` | **PASS** |
| Parenthesis balance per policy | **PASS** |
| No line ends with truncated `EXISTS ( SELECT 1` | **PASS** |
| No `CREATE POLICY` followed immediately by `DROP POLICY` | **PASS** |
| `-- === Other ===` orphan section | **Removed** |

---

## 6. Dependency Signals Preserved

| Signal | Result |
|--------|--------|
| `pg_trgm` before `gin_trgm_ops` | **PASS** |
| `wiki_relation_types` before `bl_match_entities` | **PASS** |
| Tables before functions | **PASS** |
| Functions before triggers | **PASS** |
| RLS section before quoted policies block | **PASS** |

---

## 7. Safety Checks

| Check | Result |
|-------|--------|
| `INSERT INTO` | **Absent** |
| `COPY public.` / `COPY auth.` | **Absent** |
| Destructive SQL | **Absent** |
| Secrets / DB URLs / `service_role` | **Absent** |
| `release_gate` policies | **Not added** (deferred to P5-E.5) |

---

## 8. Required Object Signal

| Object | Present |
|--------|---------|
| `profiles` | **Yes** |
| `posts` | **Yes** |
| `post_reactions` | **Yes** |
| `notifications` | **Yes** |
| `user_submission_acks` | **Yes** |
| `wiki_entities` | **Yes** |
| `wiki_relation_types` | **Yes** |
| `wiki_entity_relations` | **Yes** |
| `wiki_observations` | **Yes** |

---

## 9. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Core Schema Policy Reconstruction Fix (6C)** | **PASS** |
| **Ready for P5-STAGING.6 Re-run** | **YES** — completed in Re-run 3 (**PASS**) |
| **Ready for P5-E.5 Re-run** | **YES** — requires new explicit user approval |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

- **P5-STAGING.6 Re-run 3** completed — base schema applied to staging.
- **P5-E.5 Re-run** may proceed only with **new explicit user approval**.
- **No push, deploy, or launch** until full gate sequence passes.

---

## 10. P5-STAGING.6 Re-run 3 Follow-up (PASS)

**Gate:** P5-STAGING.6 Re-run 3 — base schema apply. **PASS**.

| Item | Status |
|------|--------|
| SQL apply to staging | `[x]` PASS |
| Core 9 tables present | `[x]` |
| 84 policies | `[x]` |
| P5 security deferred | `[x]` |

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun3-report.md`

---

*Document version: P5-STAGING.6C PASS + Re-run 3 PASS. Staging base schema provisioned. No secrets.*
