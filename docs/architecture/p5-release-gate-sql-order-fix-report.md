# P5-E.5A Release Gate SQL Dependency Order Fix Report

**Gate:** P5-E.5A — Release Gate SQL Dependency Order Fix (local repo only)  
**HEAD before gate:** `6ff7915` — Document staged DB security retest blockers  
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

---

## 2. Failure Being Addressed

**P5-E.5 Re-run** blocked during staging apply.

| Item | Detail |
|------|--------|
| Failed file | `supabase/release_gate_lock.sql` |
| Error | `function public.bl_is_admin_actor(uuid) does not exist` |
| Root cause | RLS policies at lines ~79–92 referenced `bl_is_admin_actor()` before function definition at ~line 101 |
| Prior apply | `admin_dashboard_notifications.sql` **PASS** (committed on staging) |
| Not applied | `phase_a_observations_foundation.sql` |

---

## 3. Changes Made

Reordered `supabase/release_gate_lock.sql` to dependency-safe apply order:

| Section | Content |
|---------|---------|
| A | `release_gate` table + idempotent locked default row |
| B | `release_gate_audit` table |
| C | Helper functions: `bl_is_admin_actor` → `bl_is_release_unlocked` → `bl_can_bypass_release_gate` → `bl_can_create_user_content` → `bl_assert_can_create_user_content` |
| D | Admin RPC: `bl_set_release_gate_locked` |
| E | RLS enablement |
| F–I | All `DROP POLICY IF EXISTS` + `CREATE POLICY` blocks |
| J | NOT TESTED comments (unchanged) |
| K | Grants |

| Change | Detail |
|--------|--------|
| Functions moved | Section C/D now precede all policies |
| Policies consolidated | All policy blocks after RLS enablement |
| Logic unchanged | Same tables, functions, policies, grants |
| Idempotency preserved | `CREATE TABLE IF NOT EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS`, `INSERT ... ON CONFLICT DO NOTHING` |
| Header | Added P5-E.5A dependency order fix note |

**No data/seeds added** beyond existing idempotent locked-default row.

---

## 4. Dependency Signals

| Signal | Result |
|--------|--------|
| `bl_is_admin_actor` before first `CREATE POLICY` | **PASS** (char offset 3052 < 9096) |
| `bl_is_release_unlocked` before `bl_assert_can_create_user_content` | **PASS** |
| `release_gate` table before functions reading it | **PASS** |
| `release_gate_audit` table before `bl_set_release_gate_locked` audit writes | **PASS** |
| RLS enablement before policies | **PASS** |
| Policies at end (before grants) | **PASS** |

---

## 5. Safety Checks

| Check | Result |
|-------|--------|
| TRUNCATE / DROP TABLE / DROP SCHEMA | **Absent** |
| `pre_release_test_data_reset` | **Absent** |
| Secrets / DB URLs / `service_role` keys | **Absent** |
| Auto-publish / auto-approve | **Absent** |
| Default unlock | **Absent** — locked default preserved |

---

## 6. Partial Staging State Note

From P5-E.5 Re-run report (no DB access in this gate):

| Item | Staging state |
|------|---------------|
| `admin_dashboard_notifications.sql` | **Already applied** — notifications insert policy `user_id = auth.uid()` |
| `release_gate_lock.sql` | **Not applied** — rolled back on failure |
| `phase_a_observations_foundation.sql` | **Not applied** |
| Test user `profiles` rows | **Missing** for A/B |

**Next P5-E.5 Re-run** must be idempotent-aware: `admin_dashboard_notifications.sql` uses `IF NOT EXISTS` / `DROP POLICY IF EXISTS` patterns and should re-run safely.

---

## 7. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Release Gate SQL Order Fix (P5-E.5A)** | **PASS** |
| **Ready for next gate** | **YES** — P5-E.5B testuser profiles provisioning |
| **P5-E.5 Re-run** | Requires profiles + **new explicit user approval** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommendation

1. **P5-E.5B** — provision `profiles` rows for `p5_e5_user_a@example.com` / `p5_e5_user_b@example.com` on staging.
2. **P5-E.5 Re-run** — only with new explicit user approval after 5B.
3. **No push, deploy, or launch.**

---

*Document version: P5-E.5A PASS. Local dependency reorder only. No secrets.*
