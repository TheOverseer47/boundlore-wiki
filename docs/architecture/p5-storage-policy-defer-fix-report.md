# P5-E.5C Storage Policy Defer Fix Report

**Gate:** P5-E.5C — Split/Defer Storage Release-Gate Policy  
**Date:** 2026-07-13  
**HEAD at gate start:** `cca15f2` — Document staged DB security retest rerun blockers  
**Verdict:** **PASS** — storage policy deferred; public-schema path preserved  
**Production closure:** **NOT CLOSED**

---

## 1. Scope

| Item | Status |
|------|--------|
| Local repo fix only | `[x]` |
| No SQL apply | `[x]` |
| No DB access / psql / pg_dump | `[x]` |
| No staging apply | `[x]` |
| No legacy / production | `[x]` |
| Push / Deploy / Launch | `[x]` — none |

---

## 2. Failure Being Addressed

**P5-E.5 Re-run 2** blocked when applying `release_gate_lock.sql` on staging `jzzgoiwfbuwiiyvwgwri`:

```
ERROR: must be owner of relation objects
```

**Root cause:** Section I of `release_gate_lock.sql` created policy `storage_discovery_uploads_release_gate_insert_restrictive` on `storage.objects`. The session-pooler `postgres` role is not owner of `storage.objects` and cannot create policies on it. The entire transaction rolled back — no release gate objects provisioned.

---

## 3. Changes Made

| Change | Detail |
|--------|--------|
| `supabase/release_gate_lock.sql` | Section I (storage policy DDL) **removed** |
| `supabase/release_gate_storage_policy_deferred.sql` | **Created** — deferred storage policy only |
| Public-schema path | **Preserved** — `release_gate`, `release_gate_audit`, helpers, posts/post_reactions policies, grants |
| Default locked | **Preserved** — `contribution_locked = true` on insert |
| Data / destructive SQL | **None** added |
| Secrets / URLs / keys | **None** |

---

## 4. Deferred Storage Closure

| Item | Value |
|------|-------|
| File | `supabase/release_gate_storage_policy_deferred.sql` |
| Default P5-E.5 apply | **NOT included** |
| P5-E.5 Re-run 3 apply | **NOT included** |
| Requires | Separate explicit approval + owner-capable execution path |
| S+-01 storage live test | **DEFERRED** until separate storage apply gate |

Policy deferred:

- `storage_discovery_uploads_release_gate_insert_restrictive` on `storage.objects`
- Bucket-aware: blocks `discovery-uploads` INSERT when `bl_can_create_user_content()` is false

---

## 5. Dependency Signals (`release_gate_lock.sql`)

| Signal | Status |
|--------|--------|
| `release_gate` table before helpers | `[x]` |
| `release_gate_audit` table before audit RPC | `[x]` |
| `bl_is_admin_actor` before policies | `[x]` |
| `bl_is_release_unlocked` before `bl_assert_can_create_user_content` | `[x]` |
| RLS enablement before policies | `[x]` |
| Policies after functions | `[x]` |
| **No `storage.objects` DDL** | `[x]` |

---

## 6. Safety Checks

| Check | `release_gate_lock.sql` | `release_gate_storage_policy_deferred.sql` |
|-------|-------------------------|---------------------------------------------|
| Full reset / TRUNCATE | `[x]` absent | `[x]` absent |
| DROP TABLE / DROP SCHEMA | `[x]` absent | `[x]` absent |
| `pre_release_test_data_reset` | `[x]` absent | `[x]` absent |
| Production / staging / legacy URLs | `[x]` absent | `[x]` absent |
| `service_role` / `sb_secret` / API keys | `[x]` absent | `[x]` absent |
| Passwords / real wiki data | `[x]` absent | `[x]` absent |
| Auto-publish / auto-approve | `[x]` absent | `[x]` absent |
| `storage.objects` DDL | `[x]` **none** | `[x]` present (deferred only) |

---

## 7. Partial Staging State Note

Staging `jzzgoiwfbuwiiyvwgwri` remains in partial state from P5-E.5 Re-run 2:

| Item | Staging state |
|------|---------------|
| `admin_dashboard_notifications.sql` | **Already applied** — read-only verified |
| `release_gate_lock.sql` | **Not applied** (rolled back) |
| `phase_a_observations_foundation.sql` | **Not applied** |
| Testuser profiles A/B | **Present** |

**P5-E.5 Re-run 3** must be idempotent-aware:

1. `admin_dashboard_notifications.sql` — verify only, do not re-apply unless drift detected
2. `release_gate_lock.sql` — apply (now without storage DDL)
3. `phase_a_observations_foundation.sql` — apply after release gate PASS
4. `release_gate_storage_policy_deferred.sql` — **do not apply** in Re-run 3

---

## 8. P5-E.5 Re-run 3 Plan

| Test path | Re-run 3 |
|-----------|----------|
| S+-02 foreign notification insert | **Can test** (notifications SQL already on staging) |
| S+-04 anon / no-ack / locked RPC | **Can test** (after observation SQL applied) |
| S+-01 posts / post_reactions direct writes | **Can test** (after release gate applied) |
| S+-01 storage `discovery-uploads` | **NOT RUN / DEFERRED** |
| S+-01 admin unlock/re-lock | **NOT RUN** (no admin test user) |

Requires **new explicit user approval** before any DB-touching step.

---

## 9. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Storage Policy Defer Fix (P5-E.5C)** | **PASS** |
| **Ready for P5-E.5 Re-run 3** | **YES** (with explicit approval) |
| **Storage Closure** | **DEFERRED** |
| **Production Closure** | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

1. **P5-E.5 Re-run 3** — completed PARTIAL; see rerun3 report.
2. **Storage policy** — separate gate later with owner-capable path.
3. **No push, deploy, or launch.**

---

## 10. P5-E.5 Re-run 3 Follow-up (PARTIAL)

**Gate:** P5-E.5 Re-run 3 — SQL apply PASS; staging evidence PARTIAL. **PARTIAL**.

| Item | Result |
|------|--------|
| release_gate apply | `[x]` PASS |
| observations apply | `[x]` PASS |
| Live negative tests | `[x]` PARTIAL |
| Ready for P5-E.6 | **YES** (review grant gap) |

**Report:** `docs/architecture/p5-staged-db-security-retest-rerun3-report.md`

---

## 11. P5-E.6 Follow-up (PASS — evidence acceptance review)

**Gate:** P5-E.6 — S+ staging evidence acceptance. **PASS** (review only).

**Report:** `docs/architecture/p5-staging-evidence-acceptance-gap-review.md`

---

## 12. P5-E.7A Follow-up (PARTIAL)

**Gate:** P5-E.7A — posts grant gap closed on staging; RLS isolation PARTIAL.

**Report:** `docs/architecture/p5-direct-posts-grant-rls-retest-report.md`

---

## 13. P5-E.7A.2 Follow-up (PASS)

**Gate:** P5-E.7A.2 — direct release-lock RLS on posts INSERT. **PASS**.

**Report:** `docs/architecture/p5-policy-dependency-select-grants-retest-report.md`

---

*Document version: P5-E.5C PASS + Re-run 3 PARTIAL + P5-E.6 PASS + P5-E.7A PARTIAL + P5-E.7A.2 PASS. No secrets.*
