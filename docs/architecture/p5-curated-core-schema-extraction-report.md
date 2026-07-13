# P5-STAGING.5C Curated Core Schema Extraction Report

**Gate:** P5-STAGING.5C — Curated Core Schema Extraction  
**Date:** 2026-07-13  
**HEAD at gate start:** `348c110` — Document legacy schema-only export rerun  
**Verdict:** **PASS**  
**SQL applied:** **NO**  
**DB access:** **NO**

---

## 1. Scope

| Item | Status |
|------|--------|
| Extraction/curation only | `[x]` |
| No SQL apply | `[x]` |
| No DB access / no psql / no pg_dump | `[x]` |
| No staging mutation | `[x]` |
| Push / Deploy / Launch | `[x]` — none |

---

## 2. Source

| Field | Value |
|-------|-------|
| Raw dump path | `backups/legacy-schema-only/legacy-public-schema-only-20260713-192641.sql` |
| Dump size | 138,895 bytes |
| Schema-only | `[x]` |
| Public-only | `[x]` |
| Gitignored | `[x]` |
| Not committed | `[x]` |

### No-data re-check (read-only)

| Check | Found |
|-------|-------|
| `INSERT INTO` | **No** |
| `COPY public.` | **No** |
| `COPY auth.` | **No** |
| `auth.users` row data | **No** |
| QA content | **No** |

---

## 3. Output

| Item | Value |
|------|-------|
| File | `supabase/core_schema_foundation.sql` |
| Size | ~115 KB (curated) |
| Committed | **YES** (schema DDL only) |
| Purpose | Reproducible BoundLore core `public` foundation for empty staging |

---

## 4. Included Objects

| Object | Included | Source | Notes |
|--------|----------|--------|-------|
| `pgcrypto` extension | Yes | dump | `CREATE EXTENSION IF NOT EXISTS` |
| `public.profiles` | Yes | dump | Core user mirror |
| `public.posts` | Yes | dump | Full legacy columns |
| `public.post_reactions` | Yes | dump | |
| `public.notifications` | Yes | dump | Baseline; P5 hardening separate |
| `public.user_submission_acks` | Yes | dump | Table only; no backfill INSERT |
| `public.comments` | Yes | dump | Supporting |
| `public.ratings` | Yes | dump | Supporting |
| `public.reports` | Yes | dump | Supporting |
| `public.admin_actions` | Yes | dump | Admin audit |
| `public.wiki_entities` | Yes | dump | Includes `canonical_key` |
| `public.wiki_entity_aliases` | Yes | dump | |
| `public.wiki_entity_relations` | Yes | dump | Extended columns |
| `public.wiki_observations` | Yes | dump | |
| `public.wiki_observation_entities` | Yes | dump | |
| `public.wiki_entity_claims` | Yes | dump | |
| `public.wiki_discovery_evidence` | Yes | dump | |
| `public.wiki_category_extensions` | Yes | dump | |
| `public.wiki_schema_versions` | Yes | dump | |
| `public.wiki_relation_types` | Yes | dump | Seed INSERT deferred to sprint1 |
| `public.wiki_submission_statuses` | Yes | dump | Seed INSERT deferred to sprint1 |
| `public.wiki_sync_logs` | Yes | dump | |
| `public.wiki_entity_history` | Yes | dump | |
| `public.wiki_entity_merge_history` | Yes | dump | |
| `public.wiki_patch_mode` | Yes | dump | |
| Core utility functions | Yes | dump | `handle_new_user`, `is_admin`, `set_updated_at`, `bl_*` helpers |
| Baseline RLS + policies | Yes | dump | `DROP POLICY IF EXISTS` added where curated |
| `release_gate` tables | No | — | `release_gate_lock.sql` |
| `bl_register_observation` | No | — | `phase_a_observations_foundation.sql` |
| `rpc_sync_discovery_submission` | No | — | `sprint1_sync_rpc.sql` |

---

## 5. Excluded Objects / Rationale

| Exclusion | Rationale |
|-----------|-----------|
| Row data (`INSERT`/`COPY`) | Hard rule; no user/post/auth data in repo |
| `bl_register_observation` | P5 observation RPC hardening in separate file |
| `rpc_sync_discovery_submission` | Sync RPC in `sprint1_sync_rpc.sql` |
| `release_gate` DDL | P5-E in `release_gate_lock.sql` |
| Notification insert hardening | P5-B in `admin_dashboard_notifications.sql` |
| Tutorial-ack backfill INSERT | `fix_tutorial_ack_rls.sql` (uses `auth.users`) |
| `pre_release_test_data_reset` | Destructive; never in foundation |
| `homepage_stats` view | Legacy status mismatch (`approved` vs `published`) |
| `rls_auto_enable` | Supabase-internal |
| pg_dump boilerplate / `\restrict` | Not reproducible DDL |

### Deduplication vs existing repo SQL

| Repo file | Relationship to foundation |
|-----------|---------------------------|
| `discovery_entity_backbone.sql` | **Redundant** table DDL (IF NOT EXISTS safe); adds no columns missing from foundation |
| `sprint1_knowledge_graph_foundation.sql` | **Partial skip** — seed INSERTs + ALTER columns may still apply |
| `fix_tutorial_ack_rls.sql` | **Required** — ack policies + tutorial gate (no backfill on empty staging) |
| `post_reactions_policies.sql` | **May apply** — explicit grants/policies |
| `admin_dashboard_notifications.sql` | **Required** — P5 notification hardening + profile/post ALTER |
| `release_gate_lock.sql` | **Required** — P5-E |
| `phase_a_observations_foundation.sql` | **Required** — observation RPC |

---

## 6. Safety Checks (`core_schema_foundation.sql`)

| Check | Result |
|-------|--------|
| Top-level `INSERT INTO` | **No** |
| `COPY public.` / `COPY auth.` | **No** |
| `TRUNCATE` / `DROP TABLE` / `DROP SCHEMA` | **No** |
| `pre_release_test_data_reset` | **No** |
| `service_role` | **No** |
| DB URLs / passwords / API keys | **No** |
| QA content strings | **No** |
| `auth.users` references | Schema only (FK + function bodies) — **allowed** |

---

## 7. Idempotency Notes

| Technique | Applied |
|-----------|---------|
| `CREATE TABLE IF NOT EXISTS` | Yes |
| `CREATE INDEX IF NOT EXISTS` | Yes |
| `CREATE OR REPLACE FUNCTION` | Yes |
| `DROP TRIGGER IF EXISTS` before triggers | Yes |
| `DROP POLICY IF EXISTS` before quoted policies | Partial — some single-line policies lack drop prefix |
| `ALTER TABLE ADD CONSTRAINT` | **Not idempotent** — first apply only on empty DB |
| Auth triggers (`handle_new_user` on `auth.users`) | **Not in file** — requires Supabase dashboard/CLI trigger wiring |

**Known limitation:** Re-applying raw `ALTER TABLE ONLY ... ADD CONSTRAINT` blocks on non-empty DB may fail. P5-STAGING.6 targets **empty** staging `public` schema.

---

## 8. Proposed P5-STAGING.6 Apply Order

**Not executed in 5C.** Requires explicit user approval.

| # | File | Notes |
|---|------|-------|
| 1 | `supabase/core_schema_foundation.sql` | **New** — core DDL |
| 2 | `supabase/discovery_entity_backbone.sql` | **Skip candidate** — largely redundant IF NOT EXISTS |
| 3 | `supabase/sprint1_knowledge_graph_foundation.sql` | Seed rows + column patches |
| 4 | `supabase/discovery_storage.sql` | Storage buckets |
| 5 | `supabase/fix_tutorial_ack_rls.sql` | Tutorial gate policies (skip backfill on empty DB) |
| 6 | `supabase/post_reactions_policies.sql` | Grants/policies |
| 7 | `supabase/admin_dashboard_notifications.sql` | P5 notification hardening |
| 8 | `supabase/release_gate_lock.sql` | P5-E release gate |
| 9 | `supabase/phase_a_observations_foundation.sql` | P5 observation RPC |

**Hard stops:** No `pre_release_test_data_reset.sql`. Staging ref `jzzgoiwfbuwiiyvwgwri` only. Pre-apply backup required.

---

## 9. Required Object Signal (`core_schema_foundation.sql`)

| Object | `CREATE TABLE IF NOT EXISTS` |
|--------|-------------------------------|
| `public.profiles` | **Yes** |
| `public.posts` | **Yes** |
| `public.post_reactions` | **Yes** |
| `public.notifications` | **Yes** |
| `public.user_submission_acks` | **Yes** |
| `public.wiki_entities` | **Yes** |

---

## 10. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Curated Core Schema Extraction (5C)** | **PASS** |
| **Ready for P5-STAGING.6** | **YES** → **attempted (6 FAIL)** |
| **P5-E.5 Re-run** | **BLOCKED** — staging apply failed (dependency order) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

**Next:** ~~Fix `core_schema_foundation.sql` ordering~~ → **done in P5-STAGING.6A** → re-run P5-STAGING.6 with explicit approval.

---

## 11. P5-STAGING.6 Follow-up (FAIL)

**Gate:** P5-STAGING.6 — apply attempted. **FAIL** — function-before-table dependency (`bl_match_entities` → `wiki_relation_types`). Staging `public` unchanged (transaction rollback).

**Report:** `docs/architecture/p5-staging-base-schema-apply-report.md`

---

## 12. P5-STAGING.6A Follow-up (PASS — local reorder)

**Gate:** P5-STAGING.6A — dependency reorder in repo. **PASS**. No SQL apply, no DB access.

| Item | Status |
|------|--------|
| Foundation file reordered | `[x]` ~75 KB |
| Apply order: tables → PK → indexes → FKs → functions → triggers → RLS → policies | `[x]` |
| `wiki_relation_types` before `bl_match_entities` | `[x]` |
| Nine required core/wiki tables present | `[x]` |
| Ready for P5-STAGING.6 Re-run | **YES** — explicit approval required |

**Report:** `docs/architecture/p5-core-schema-reorder-fix-report.md`

---

## 13. P5-STAGING.6 Re-run Follow-up (FAIL)

**Gate:** P5-STAGING.6 Re-run — **FAIL** (`pg_trgm` at line 660). 6A order validated on apply; staging `public` unchanged.

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun-report.md`

---

## 14. P5-STAGING.6B Follow-up (PASS — local extension fix)

**Gate:** P5-STAGING.6B — `pg_trgm` extension dependency fix. **PASS**.

**Report:** `docs/architecture/p5-core-schema-extension-fix-report.md`

---

## 15. P5-STAGING.6 Re-run 2 Follow-up (FAIL)

**Gate:** P5-STAGING.6 Re-run 2 — **FAIL** (truncated `CREATE POLICY` bodies).

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun2-report.md`

---

## 16. P5-STAGING.6C Follow-up (PASS — local policy reconstruction)

**Gate:** P5-STAGING.6C — policy reconstruction. **PASS**.

**Report:** `docs/architecture/p5-core-schema-policy-reconstruction-fix-report.md`

---

*Document version: P5-STAGING.5C PASS + 6 FAIL + 6A PASS + 6 Re-run FAIL + 6B PASS + Re-run 2 FAIL + 6C PASS. No secrets.*
