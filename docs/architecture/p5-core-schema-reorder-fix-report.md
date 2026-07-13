# P5-STAGING.6A Core Schema Reorder Fix Report

**Gate:** P5-STAGING.6A — Core Schema Reorder Fix (local repo only)  
**HEAD before gate:** `4341f30` — Document staging base schema apply blockers  
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

**P5-STAGING.6** (HEAD `4341f30`) failed during staging apply of `supabase/core_schema_foundation.sql`.

| Item | Detail |
|------|--------|
| Error | `relation "public.wiki_relation_types" does not exist` |
| Location | ~line 315 in pre-fix file |
| Root cause | `CREATE OR REPLACE FUNCTION public.bl_match_entities` was ordered **before** `CREATE TABLE public.wiki_relation_types` |
| Outcome | Transaction rolled back; staging `public` schema remained **empty** |
| P5 security SQL | Not applied (as intended) |
| Test users A/B | Intact |

---

## 3. Changes Made

Reordered `supabase/core_schema_foundation.sql` to a dependency-safe apply sequence:

1. Header / safety comments (updated for 6A)
2. Extensions (`pgcrypto`)
3. Tables (profiles and wiki lookup tables first, then posts, reactions, notifications, wiki subsystem)
4. Primary / unique constraints
5. Indexes
6. Foreign keys
7. Functions (including `bl_match_entities` **after** `wiki_relation_types`)
8. Triggers
9. Row level security enablement
10. Policies

| Property | Status |
|----------|--------|
| Tables before functions | `[x]` |
| Functions before triggers/policies | `[x]` |
| No tables removed | `[x]` |
| No DROP TABLE / TRUNCATE | `[x]` |
| No INSERT / COPY / row data | `[x]` |
| Idempotency preserved (`IF NOT EXISTS`, `OR REPLACE`, `DROP POLICY IF EXISTS`) | `[x]` |
| P5 security files not merged in | `[x]` |
| File size | ~75 KB (down from ~115 KB; pg_dump TOC noise removed) |

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
| QA fixture usernames (`qa-ogre`, `qa-staff`, `qa-ember`, `p5_e5_user`) | **Absent** |

Note: `auth.users` appears only as FK references and inside function bodies (schema dependency, not row data).

---

## 5. Required Object Signal

| Object | `CREATE TABLE IF NOT EXISTS` present |
|--------|--------------------------------------|
| `profiles` | **Yes** (line ~20) |
| `posts` | **Yes** (line ~76) |
| `post_reactions` | **Yes** (line ~109) |
| `notifications` | **Yes** (line ~119) |
| `user_submission_acks` | **Yes** (line ~179) |
| `wiki_entities` | **Yes** (line ~186) |
| `wiki_relation_types` | **Yes** (line ~45) |
| `wiki_entity_relations` | **Yes** (line ~214) |
| `wiki_observations` | **Yes** (line ~253) |

---

## 6. Dependency Order Signal

| Signal | Result |
|--------|--------|
| `wiki_relation_types` CREATE before `bl_match_entities` | **PASS** (table ~45, function ~1028) |
| `wiki_entities` CREATE before functions referencing it | **PASS** |
| `posts` CREATE before policies/triggers/FKs on posts | **PASS** |
| `profiles` CREATE before FKs/triggers on profiles | **PASS** |
| `user_submission_acks` CREATE before policies on it | **PASS** |
| Tables section before Functions section | **PASS** (~18 vs ~941) |
| Functions before Triggers | **PASS** (~941 vs ~1351) |
| RLS enable before Policies | **PASS** (~1373 vs ~1631) |

---

## 7. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Core Schema Reorder Fix (6A)** | **PASS** |
| **Ready for P5-STAGING.6 Re-run** | **YES** (requires new explicit user approval) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

- **P5-STAGING.6 Re-run** may proceed only with **new explicit user approval** — not automatic.
- Staging `public` is still empty until 6 Re-run succeeds.
- **No push, deploy, or launch** until full gate sequence passes.

---

*Document version: P5-STAGING.6A PASS. Local reorder only. No secrets.*
