# P5-E.7A.2 Policy Dependency SELECT Grants + Direct Posts RLS Re-Test Report

**Gate:** P5-E.7A.2 — Policy Dependency SELECT Grants + Direct Posts RLS Re-Test  
**Date:** 2026-07-13  
**HEAD at gate start:** `992aae1` — Document direct posts grant RLS retest  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`  
**Verdict:** **PASS** — release-lock RLS proven on direct posts INSERT path  
**Production closure:** **NOT CLOSED**

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-E.7A.2 | `[x]` |
| Staging only | `[x]` |
| Legacy `ohkoojpzmptdfyowdgog` excluded | `[x]` |
| Production excluded | `[x]` |
| Push / Deploy / Launch | `[x]` — none |
| Storage deferred | `[x]` |

---

## 2. Starting Point

| Item | Status |
|------|--------|
| P5-E.7A | **PARTIAL** — posts INSERT grant applied |
| Blocker after 7A | `permission denied for table profiles` |
| `release_gate` | Applied, locked |
| `authenticated` posts INSERT | **true** (from 7A) |

---

## 3. Environment Proof

| Field | Value |
|-------|-------|
| Staging ref | `jzzgoiwfbuwiiyvwgwri` |
| Legacy ref (forbidden) | `ohkoojpzmptdfyowdgog` — **not used** |
| `SUPABASE_STAGING_CONFIRM_ISOLATED` | `true` |
| Secrets in this report | **None** |

### Pre-write backup

| Item | Value |
|------|-------|
| Path | `backups/staging/p5-e7a2-policy-select-grants-prewrite-20260713-223648.sql` |
| Size | **290,277 bytes** |
| Gitignored / not staged | `[x]` |

---

## 4. RLS / Policy Safety Review

| Table | RLS active | SELECT policies | Assessment |
|-------|------------|-----------------|------------|
| `public.profiles` | **true** | `Users can view own profile`, `profiles_select_all` (true), admin | **PARTIAL** — `profiles_select_all` is broad in base schema; staging has only 2 profile rows |
| `public.user_submission_acks` | **true** | `user_submission_acks_select_own` (`auth.uid() = user_id`), admin | **PASS** — row-scoped |

**Note:** `profiles_select_all` predates P5-E.7A.2 (base schema). Visibility smoke as User A showed **2** profiles (staging test users only), **0** acks. Grants do not bypass RLS.

**Safety verdict:** **PASS** for gate proceed — RLS active; acks row-scoped; profiles broad policy is pre-existing base-schema behavior.

---

## 5. Grant Review

| Item | Pre-grant | Post-grant |
|------|-----------|------------|
| `authenticated` SELECT on `profiles` | **false** | **true** |
| `authenticated` SELECT on `user_submission_acks` | **false** | **true** |
| `anon` SELECT on profiles/acks | **false** | **false** (unchanged) |
| Unexpected INSERT/UPDATE/DELETE on profiles/acks | — | **None** |

| Item | Value |
|------|-------|
| SQL file | `supabase/p5_policy_dependency_select_grants.sql` |
| Applied on staging | **Yes** |

**SELECT Grant Apply verdict:** **PASS**

---

## 6. Profile/Ack Visibility Smoke (User A, ROLLBACK)

| Metric | Result |
|--------|--------|
| `visible_profiles` | **2** |
| `visible_acks` | **0** |

**Verdict:** **PASS** — bounded on staging (2 test profiles); no ack enumeration.

---

## 7. Release Lock/RLS Test (Direct Posts INSERT)

### Without tutorial ack (raw locked test)

| Result | Detail |
|--------|--------|
| **BLOCKED** | RLS policy `posts_insert_requires_tutorial_ack` |
| Grant-denied on posts/profiles/acks? | **No** |

### With ack + `email_verified` (locked, release gate intact)

| Result | Detail |
|--------|--------|
| **BLOCKED** | RLS policy `posts_release_gate_insert_restrictive` |
| Grant-denied? | **No** |
| Release-lock policy hit? | **Yes** |

**This is the primary PASS evidence** for direct client posts path release-lock enforcement.

### Missing `release_gate` row (with ack prerequisites)

| Result | Detail |
|--------|--------|
| **BLOCKED** | `posts_release_gate_insert_restrictive` (fail-closed) |

### Transactional unlock control (optional)

| Result | Detail |
|--------|--------|
| **INSERT_ALLOWED** | With temporary unlock + ack + email_verified (ROLLBACK) |

Strong positive control that locked-state block was release gate, not grant gap.

**Direct Posts Release Lock Evidence verdict:** **PASS**

---

## 8. Optional Controls

| Test | Result |
|------|--------|
| Transactional unlock control | **PASS** — INSERT allowed when unlocked (ROLLBACK) |
| Missing release_gate row + ack | **PASS** — blocked by release gate policy (ROLLBACK) |
| `post_reactions` | **NOT RUN** |

---

## 9. Cleanup

| Check | Result |
|-------|--------|
| Final `release_gate` locked | **true** |
| `bl_is_release_unlocked()` | **false** |
| `p5_e7a2` posts | **0** |
| `p5_e7a2` notifications | **0** |
| Permanent test acks/profile changes | **0** (rolled back) |

---

## 10. Fixture Status

Local server returned HTTP errors during this gate (server not reachable). Prior gate evidence unchanged:

| Fixture | Expected |
|---------|----------|
| Release Lock DB | 32/34 (storage defer) |
| Release Lock UI | 30/30 |
| Notification | 24/24 |
| Observation | 17/17 |
| Sanitization | 45/45 |

**Fixture check this gate:** **NOT RUN** (server unavailable)

---

## 11. Remaining Gaps

| Gap | Status |
|-----|--------|
| Storage closure | **DEFERRED** |
| S+-03 runtime/production | **NOT CLOSED** |
| `profiles_select_all` hardening | Optional future gate |
| Production closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

---

## 12. Verdict

| Dimension | Verdict |
|-----------|---------|
| **SELECT Grant Apply** | **PASS** |
| **Direct Posts Release Lock Evidence** | **PASS** |
| **S+-01 Public Writes (direct path)** | **PARTIAL** — direct path proven; storage deferred |
| **Storage Closure** | **DEFERRED** |
| **P5-E.7A.2 (overall)** | **PASS** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

P5-E.7A.2 closed the **profiles/acks SELECT grant gap** on staging. Direct posts INSERT with tutorial ack and email verification prerequisites is now blocked by **`posts_release_gate_insert_restrictive`** while release gate is locked — not by table privilege denial. Transactional unlock control confirms the enforcement layer is release gate RLS.

**Recommended next:** P5-E.7B Fixture Alignment or P5-E.8 Storage Closure Plan.

---

*Document version: P5-E.7A.2 PASS. No secrets.*
