# P5-STAGING.5 Base Schema Provisioning Plan

**Gate:** P5-STAGING.5 — Base Schema Provisioning Plan (inventory + dependency map)  
**Date:** 2026-07-13  
**HEAD at gate start:** `2aa9317` — Document staged DB release gate retest blockers  
**Type:** Planning only — **no SQL**, **no DB mutation**, **no push/deploy/launch**

---

## 1. Scope

| In scope | Out of scope |
|----------|--------------|
| Inventory all `supabase/*.sql` files | SQL apply / migration |
| Classify files (base / patch / danger) | Table creation on staging |
| Dependency map for BoundLore objects | Data import / seed (unless later approved) |
| Proposed apply order (plan only) | P5-E.5 re-run |
| Document open blockers | Staging reset |
| | Touch `ohkoojpzmptdfyowdgog` |

---

## 2. Why P5-E.5 Was Blocked

| Fact | Status |
|------|--------|
| Isolated staging project `boundlore-staging` (`jzzgoiwfbuwiiyvwgwri`) | `[x]` exists |
| `auth.users` + test users `p5_e5_*` confirmed | `[x]` |
| `storage.buckets` / `storage.objects` (Supabase default) | `[x]` |
| BoundLore `public` schema tables | **`0`** at P5-E.5 re-run |
| P5 security SQL (`admin_dashboard_notifications`, `release_gate_lock`, `phase_a_observations_foundation`) | **Requires existing base tables** |

**P5-E.5 Re-run blocked** because incremental security SQL assumes `posts`, `profiles`, and related core tables already exist. Applying P5 files to an empty `public` schema would fail on `ALTER TABLE public.posts` / FK references.

---

## 3. SQL Inventory

**Tracked files:** 21 × `supabase/*.sql` + `PRE_RELEASE_RESET_README.md` (docs only).

| SQL file | Class | Creates / modifies | Depends on | Safe for base provisioning | Notes |
|----------|-------|-------------------|------------|--------------------------|-------|
| `discovery_entity_backbone.sql` | **A** Base (partial) | `wiki_entities`, `wiki_entity_aliases`, `wiki_entity_relations`, `wiki_discovery_evidence`, `wiki_category_extensions` + RLS | **`posts`, `profiles`** | **No** until core exists | FK to `posts(id)`, `profiles(id)` |
| `sprint1_knowledge_graph_foundation.sql` | **A** Base (partial) | `wiki_schema_versions`, `wiki_relation_types`, `wiki_sync_logs`, `wiki_entity_history`, `wiki_entity_merge_history`, `wiki_submission_statuses`; **ALTER** `posts`, `wiki_entity_relations`, `wiki_entities`, `wiki_discovery_evidence` | **`posts`, `profiles`, `wiki_entity_relations`** | **No** until core + backbone | Seeds relation types |
| `sprint1_sync_rpc.sql` | **A/B** | RPCs: `bl_slugify_text`, `bl_build_canonical_key`, `bl_normalize_discovery_relation_code`, `bl_sync_post_to_knowledge_graph`, helpers | sprint1 foundation + backbone | **No** until Phase 1–2 | Writes to `wiki_*`, `posts` |
| `discovery_storage.sql` | **C** Storage | Bucket `discovery-uploads` + storage RLS | `storage.buckets` (exists) | **Yes** (standalone) | Does not need `public.posts` |
| `wiki_patch_mode.sql` | **A** Base (partial) | `wiki_patch_mode` | **`profiles`** | **No** until profiles exist | Maintenance UX table |
| `fix_tutorial_ack_rls.sql` | **A/B** | **`user_submission_acks`** + posts insert policy | **`posts`, `profiles`** | **No** until core exists | Replaces deprecated tutorial file |
| `post_reactions_policies.sql` | **B** Incremental | RLS on **`post_reactions`** | **`post_reactions` table** | **No** — table not in repo | Policies only |
| `archive_visibility_hardening.sql` | **B** Incremental | `posts` SELECT/UPDATE policies | **`posts`** | **No** | Policy patch |
| `admin_dashboard_notifications.sql` | **B** Incremental (P5) | **`notifications`**, **`admin_actions`**; ALTER `posts`, `profiles` | **`posts`, `profiles`** | **No** — P5-E.5 file | S+-02 |
| `release_gate_lock.sql` | **B** Incremental (P5) | **`release_gate`**, **`release_gate_audit`**, `bl_is_release_unlocked`, `bl_assert_can_create_user_content`, posts/reactions policies | **`posts`, `profiles`, `post_reactions`** | **No** — P5-E.5 file | S+-01 |
| `phase_a_observations_foundation.sql` | **B** Incremental (P5) | **`wiki_observations`**, `wiki_observation_entities`, `wiki_entity_claims`; ALTER `posts`; **`bl_register_observation`** | backbone + sprint1 + **`posts`, `profiles`, `user_submission_acks`** | **No** — P5-E.5 file | S+-04 |
| `phase_a_fix_match_entities_union.sql` | **B** Patch | Replaces `bl_match_entities` | phase_a applied | Later only | Not base |
| `phase_a_fix_discovery_guide_subcategory.sql` | **B** Patch | Replaces `bl_register_observation` | phase_a applied | Later only | Not base |
| `fix_tutorial_ack_rls.sql` | (see above) | | | | |
| `require_tutorial_ack_for_posts_insert.sql` | **F** Deprecated | Legacy JWT metadata policy | — | **NEVER** | Use `fix_tutorial_ack_rls.sql` |
| `craft_relation_types_preparation.sql` | **D** Seed | INSERT `wiki_relation_types` | sprint1 foundation | Optional later | Manual launch window |
| `harvested_from_relation_preparation.sql` | **D** Seed | INSERT one relation type | sprint1 foundation | Optional later | Manual only |
| `account_self_delete.sql` | **B** RPC | `bl_delete_own_account` (deletes user data) | many tables | **Not base** | Destructive per-user |
| `repair_contribution_duplicates.sql` | **E** Repair | UPDATE `posts` archive | `posts` | **NEVER** for provisioning | Data mutation |
| `repair_swamp_test_data.sql` | **E** Repair | UPDATE test slugs | `posts`, `wiki_entities` | **NEVER** for provisioning | Test-only repair |
| `pre_release_reset_dry_run.sql` | **E** Danger (read-only) | SELECT counts only | existing data | **Not provisioning** | Dry-run before reset |
| `pre_release_test_data_reset.sql` | **E** Danger | **DELETE** posts, reactions, notifications, observations | full schema | **NEVER** | Guarded destructive reset |

---

## 4. Required Base Objects

| Object | Required for | Found CREATE in repo | Candidate SQL file | Blocker |
|--------|--------------|---------------------|-------------------|---------|
| **`profiles`** | RLS, admin checks, FKs everywhere | **NO** | *None* | **YES** |
| **`posts`** | Core wiki, entities, P5 gates | **NO** | *None* — only `ALTER` / policies | **YES** |
| **`post_reactions`** | S+-01 release lock | **NO** | `post_reactions_policies.sql` (policies only) | **YES** |
| `comments` | support flows (referenced) | **NO** | *None* | **YES** (if full app) |
| `reports` | support flows | **NO** | *None* | **YES** (if full app) |
| `user_submission_acks` | S+-04 tutorial gate | **YES** | `fix_tutorial_ack_rls.sql` | No (after posts/profiles) |
| `notifications` | S+-02 | **YES** | `admin_dashboard_notifications.sql` | No (P5 phase) |
| `admin_actions` | admin audit | **YES** | `admin_dashboard_notifications.sql` | No (P5 phase) |
| `wiki_entities` | observations, graph | **YES** | `discovery_entity_backbone.sql` | No (after posts/profiles) |
| `wiki_entity_relations` | graph | **YES** | `discovery_entity_backbone.sql` | No (after posts/profiles) |
| `wiki_observations` | S+-04 RPC | **YES** | `phase_a_observations_foundation.sql` | No (P5 phase) |
| `release_gate` | S+-01 | **YES** | `release_gate_lock.sql` | No (P5 phase) |
| `release_gate_audit` | S+-01 audit | **YES** | `release_gate_lock.sql` | No (P5 phase) |
| `bl_register_observation` | S+-04 | **YES** | `phase_a_observations_foundation.sql` | No (P5 phase) |
| `bl_is_release_unlocked` | S+-01 | **YES** | `release_gate_lock.sql` | No (P5 phase) |
| `bl_assert_can_create_user_content` | S+-01/S+-04 | **YES** | `release_gate_lock.sql` | No (P5 phase) |
| Storage `discovery-uploads` | S+-01 storage test | **YES** (bucket) | `discovery_storage.sql` | No (standalone) |

### Critical finding

**`CREATE TABLE public.posts` — NOT FOUND in repository.**  
**`CREATE TABLE public.profiles` — NOT FOUND in repository.**  
**`CREATE TABLE public.post_reactions` — NOT FOUND in repository.**

**Base schema not fully reproducible from repo SQL alone.** Core tables likely exist only on the legacy Supabase project (`ohkoojpzmptdfyowdgog`) and were never committed as foundation migrations.

---

## 5. Dependency Map

| Object | Created by (repo) | Required by | Risk | Note |
|--------|-------------------|-------------|------|------|
| `profiles` | **— missing —** | All RLS, `bl_is_admin_actor`, FKs | **CRITICAL** | Must come from export or new migration |
| `posts` | **— missing —** | backbone, sprint1, phase_a, P5 | **CRITICAL** | Must come from export or new migration |
| `post_reactions` | **— missing —** | `release_gate_lock`, policies file | **HIGH** | Table DDL absent |
| `wiki_entities` | `discovery_entity_backbone.sql` | phase_a, sprint1 | MEDIUM | After posts/profiles |
| `wiki_entity_relations` | `discovery_entity_backbone.sql` | sprint1 ALTER | MEDIUM | After entities |
| `wiki_relation_types` | `sprint1_knowledge_graph_foundation.sql` | sprint1_sync_rpc | LOW | After backbone |
| `user_submission_acks` | `fix_tutorial_ack_rls.sql` | phase_a RPC, posts policy | MEDIUM | After posts/profiles |
| `notifications` | `admin_dashboard_notifications.sql` | S+-02 tests | LOW | P5 phase |
| `release_gate` | `release_gate_lock.sql` | S+-01 tests | LOW | P5 phase |
| `bl_register_observation` | `phase_a_observations_foundation.sql` | S+-04 tests | MEDIUM | After acks + release gate hooks |
| `discovery-uploads` bucket | `discovery_storage.sql` | S+-01 storage | LOW | Can run early |

---

## 6. Proposed Apply Order (plan only — NOT executed)

### Phase 0 — Core DDL blocker (must resolve first)

| Step | Action | Status |
|------|--------|--------|
| 0a | Obtain **`profiles` + `posts` + `post_reactions`** DDL (+ baseline RLS if needed) | **BLOCKED** — not in repo |
| 0b | Options: (1) schema-only export from legacy DB **to staging only** with operator approval, or (2) author new `supabase/core_schema_foundation.sql` in repo | Planning only |
| 0c | Ensure `profiles` row creation on signup (trigger) if required by app | Unknown in repo |
| 0d | Create `profiles` rows for `p5_e5_user_a/b` after DDL | P5-STAGING.6+ |

**Do not proceed to Phase 1 until Phase 0 PASS.**

### Phase 1 — Entity / graph foundation (after Phase 0)

1. `discovery_entity_backbone.sql`
2. `sprint1_knowledge_graph_foundation.sql`
3. `sprint1_sync_rpc.sql`

### Phase 2 — Storage baseline

4. `discovery_storage.sql` *(may run in parallel with Phase 1 if no conflict)*

### Phase 3 — Tutorial ack / reactions / visibility

5. `fix_tutorial_ack_rls.sql`
6. `post_reactions_policies.sql`
7. `archive_visibility_hardening.sql` *(optional but recommended before P5)*

### Phase 4 — Optional maintenance table

8. `wiki_patch_mode.sql`

### Phase 5 — P5 security baseline (P5-E.5 target — after Phases 0–3)

9. `admin_dashboard_notifications.sql`
10. `release_gate_lock.sql`
11. `phase_a_observations_foundation.sql`

### Phase 6 — Optional seeds (explicit approval only)

- `craft_relation_types_preparation.sql`
- `harvested_from_relation_preparation.sql`

### Phase 7 — Patches (only if earlier version already applied)

- `phase_a_fix_match_entities_union.sql`
- `phase_a_fix_discovery_guide_subcategory.sql`

### Never in provisioning order

- `pre_release_test_data_reset.sql`
- `pre_release_reset_dry_run.sql` *(dry-run tool only, not schema build)*
- `repair_contribution_duplicates.sql`
- `repair_swamp_test_data.sql`
- `require_tutorial_ack_for_posts_insert.sql`

---

## 7. Excluded / Dangerous SQL

| File | Reason | Staging rule |
|------|--------|--------------|
| `pre_release_test_data_reset.sql` | DELETE posts, reactions, notifications, observations | **NEVER apply** |
| `pre_release_reset_dry_run.sql` | Read-only counts before reset | Not provisioning; OK for pre-reset audit only |
| `repair_contribution_duplicates.sql` | UPDATE archives posts | **NEVER** without separate repair approval |
| `repair_swamp_test_data.sql` | Test slug normalization | **NEVER** for provisioning |
| `account_self_delete.sql` | Deletes user-owned rows | Not base provisioning |
| `require_tutorial_ack_for_posts_insert.sql` | Deprecated JWT metadata gate | **DO NOT APPLY** |

**Destructive patterns found:** `DELETE FROM public.posts`, `DELETE FROM public.comments`, `TRUNCATE` (documented as forbidden in dry-run README only).

---

## 8. Staging Schema Gaps (from P5-E.5)

| Layer | Present on staging | Missing |
|-------|-------------------|---------|
| Auth | `auth.users` (incl. `p5_e5_*`) | `public.profiles` mirror rows |
| Storage | `buckets`, `objects` | `discovery-uploads` bucket (until `discovery_storage.sql`) |
| Public | **empty** | All BoundLore tables |

**Schema export from legacy DB:** User chose **Path A** (P5-STAGING.5A). Schema-only export from legacy `ohkoojpzmptdfyowdgog` → gitignored `backups/legacy-schema-only/` → curated `supabase/core_schema_foundation.sql`. **No export in 5A.** Apply curated file to staging only in P5-STAGING.6+.

---

## 11. P5-STAGING.5A Follow-up

**Gate:** P5-STAGING.5A — Legacy Schema-Only Export Plan (HEAD `e6ca97b`). User chose Path A. **No export, no DB access.**

| Item | Status |
|------|--------|
| Export plan documented | `[x]` |
| `--schema-only` required | `[x]` |
| Raw path `backups/legacy-schema-only/` | `[x]` gitignored via `backups/` |
| Curated target `core_schema_foundation.sql` | Planned (5C) |
| P5-STAGING.5B approval | `[x]` granted |
| P5-STAGING.5B export | `[x]` **PASS** — re-run 2026-07-13 |

**Report:** `docs/architecture/p5-legacy-schema-only-export-plan.md`, `docs/architecture/p5-legacy-schema-only-export-report.md`

**Next:** P5-STAGING.5C curation → P5-STAGING.6.

---

## 12. P5-STAGING.5B Follow-up (first attempt — BLOCKED)

**Gate:** P5-STAGING.5B first attempt. **BLOCKED** — `.env.legacy` missing.

---

## 13. P5-STAGING.5B Re-run (PASS)

**Gate:** P5-STAGING.5B re-run (HEAD `9ddc7f9`). **PASS.**

| Item | Status |
|------|--------|
| `.env.legacy` | `[x]` present |
| `pg_dump --schema-only --schema=public` | `[x]` |
| Dump | `backups/legacy-schema-only/legacy-public-schema-only-20260713-192641.sql` (138,895 bytes) |
| No-data check | `[x]` PASS |
| Core tables in dump | `[x]` posts, profiles, post_reactions, notifications, user_submission_acks, wiki_entities |
| Staging touched | `[x]` — none |
| Legacy Export (5B) | **PASS** |

**Report:** `docs/architecture/p5-legacy-schema-only-export-report.md`

**Next:** P5-STAGING.5C → P5-STAGING.6.

---

## 9. Re-entry Criteria for P5-STAGING.6

P5-STAGING.6 (Base Schema Apply to Staging) may start only when:

| # | Criterion |
|---|-----------|
| 1 | Phase 0 resolved — `supabase/core_schema_foundation.sql` | `[x]` **5C PASS** |
| 2 | Safe apply order documented (this plan §6) with no destructive scripts |
| 3 | Pre-apply backup exists or new backup planned (`backups/staging/`) |
| 4 | Connection path documented (session pooler per P5-STAGING.3) |
| 5 | **Explicit user approval** for P5-STAGING.6 |
| 6 | Staging ref `jzzgoiwfbuwiiyvwgwri` only — **never** `ohkoojpzmptdfyowdgog` |
| 7 | Post-apply verification checklist: required tables exist before P5-E.5 re-attempt |

---

## 10. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Base Schema Provisioning Plan** | **PASS** (repo foundation file; staging not applied) |
| **Repo contains full base schema** | **YES** — `supabase/core_schema_foundation.sql` |
| **Safe incremental order definable** | **YES** — after Phase 0 |
| **P5-E.5 Re-run** | **BLOCKED** — until base schema on staging |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

P5-STAGING.5C created `supabase/core_schema_foundation.sql` from gitignored legacy dump. Core DDL now versioned in repo. **Staging apply not performed.**

**Next:** P5-STAGING.6 with explicit approval. No push/deploy/launch.

---

## 14. P5-STAGING.5C Follow-up (PASS)

**Gate:** P5-STAGING.5C — Curated Core Schema Extraction. **PASS.**

| Item | Status |
|------|--------|
| `core_schema_foundation.sql` | `[x]` ~115 KB |
| Required core tables | `[x]` all six |
| No data / no DB access | `[x]` |
| Apply order documented | `[x]` |
| Curated Extraction (5C) | **PASS** |

**Report:** `docs/architecture/p5-curated-core-schema-extraction-report.md`

---

## Related Documents

| Document | Role |
|----------|------|
| `p5-curated-core-schema-extraction-report.md` | P5-STAGING.5C extraction report |
| `p5-legacy-schema-only-export-plan.md` | P5-STAGING.5A legacy export plan |
| `p5-legacy-schema-only-export-report.md` | P5-STAGING.5B export report (PASS) |
| `p5-staged-db-application-report.md` | P5-E.5 re-run blocked report |
| `p5-staging-environment-plan.md` | Staging gate sequence |
| `PRE_RELEASE_RESET_README.md` | Reset danger documentation |

---

*Document version: P5-STAGING.5 + 5A + 5B + 5C PASS. Foundation SQL in repo. No staging apply.*
