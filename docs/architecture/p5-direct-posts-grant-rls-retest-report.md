# P5-E.7A Direct Posts Grant/RLS Re-Test Report

**Gate:** P5-E.7A — Direct Posts Grant/RLS Re-Test  
**Date:** 2026-07-13  
**HEAD at gate start:** `83a397c` — Document staging evidence acceptance review  
**User approval:** **YES** — staging only `jzzgoiwfbuwiiyvwgwri`  
**Verdict:** **PARTIAL** — grant applied; release-lock RLS on direct insert not fully isolated  
**Production closure:** **NOT CLOSED**

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-E.7A | `[x]` |
| Staging only | `[x]` |
| Legacy `ohkoojpzmptdfyowdgog` excluded | `[x]` |
| Production excluded | `[x]` |
| Push / Deploy / Launch | `[x]` — none |
| Storage deferred | `[x]` — `release_gate_storage_policy_deferred.sql` not applied |

---

## 2. Starting Point

| Item | Status |
|------|--------|
| P5-E.6 review | PASS |
| Direct posts grant gap | `authenticated` lacked `INSERT` on `public.posts` |
| `release_gate` | Applied, locked |
| S+-02 / S+-04 | PASS on staging (prior gates) |
| S+-01 direct posts | PARTIAL (grant gap) |

---

## 3. Environment Proof

| Field | Value |
|-------|-------|
| Staging ref | `jzzgoiwfbuwiiyvwgwri` |
| Legacy ref (forbidden) | `ohkoojpzmptdfyowdgog` — **not used** |
| `SUPABASE_STAGING_CONFIRM_ISOLATED` | `true` |
| Connection | Session pooler `aws-0-eu-central-1.pooler.supabase.com:5432` |
| Secrets in this report | **None** |

### Pre-write backup

| Item | Value |
|------|-------|
| Path | `backups/staging/p5-e7a-direct-posts-grant-prewrite-20260713-213845.sql` |
| Size | **290,277 bytes** |
| Gitignored / not staged | `[x]` |

---

## 4. Grant Review

### Static repo evidence (direct insert intended)

| File | Pattern |
|------|---------|
| `js/create-post.js` | `supabase.from("posts").insert(payload)` |
| `js/guilds-apply.js` | `supabase.from("posts").insert(payload)` |
| `js/discovery-core.js` | `supabase.rpc("bl_register_observation", …)` (separate RPC path) |

**Decision confirmed:** Direct client `posts` INSERT is part of the intended model.

### Grant SQL file

| Item | Value |
|------|-------|
| File | `supabase/p5_authenticated_posts_insert_grant.sql` |
| Content | `GRANT INSERT ON TABLE public.posts TO authenticated` only |
| Applied on staging | **Yes** |

### Pre-grant privileges

| Check | Result |
|-------|--------|
| `has_table_privilege('authenticated', 'public.posts', 'INSERT')` | **false** |
| `authenticated` had INSERT in `role_table_grants` | **No** |

### Post-grant privileges

| Check | Result |
|-------|--------|
| `has_table_privilege('authenticated', 'public.posts', 'INSERT')` | **true** |
| `authenticated` has INSERT grant | **Yes** |
| `anon` has INSERT grant | **No** |
| Unexpected UPDATE/DELETE grants | **None** |

**Grant Apply verdict:** **PASS**

### Release-lock policy present (pre-apply)

| Policy | WITH CHECK |
|--------|------------|
| `posts_release_gate_insert_restrictive` | `bl_can_create_user_content(auth.uid())` |

---

## 5. Release Lock/RLS Test (Direct Posts INSERT)

### Test context

- User A: `p5_e5_user_a@example.com` (`6937c8ae-4160-420f-a679-2123ecb31279`)
- `SET LOCAL ROLE authenticated` + JWT claims
- All tests in `BEGIN` / `ROLLBACK`

### Locked insert (raw)

| Result | Detail |
|--------|--------|
| **BLOCKED** | `permission denied for table profiles` |
| Grant-denied on `posts`? | **No** — posts INSERT privilege present |

### Locked insert (with transactional ack + `email_verified` set as postgres)

| Result | Detail |
|--------|--------|
| **BLOCKED** | `permission denied for table profiles` |
| Grant-denied on `posts`? | **No** |

### Analysis

After posts INSERT grant, INSERT policy evaluation reaches subqueries on `public.profiles` (`posts_insert_verified`, etc.). Staging `authenticated` role also lacks **SELECT** on `public.profiles` (and `user_submission_acks`), causing policy evaluation to fail at table privilege on `profiles` before release-gate restrictive policy can be observed in isolation.

| Privilege | Pre/post grant |
|-----------|----------------|
| `public.posts` INSERT | false → **true** |
| `public.profiles` SELECT | **false** (unchanged) |
| `public.user_submission_acks` SELECT | **false** (unchanged) |

**Not grant-denied on posts anymore:** **Yes**  
**Release-lock RLS message observed:** **No** — blocked at `profiles` privilege layer  
**Verdict:** **PARTIAL**

---

## 6. Optional Controls

| Test | Result |
|------|--------|
| Transactional unlock control | **BLOCKED** — `permission denied for table profiles` (ROLLBACK) |
| Missing `release_gate` row + insert | **BLOCKED** — `permission denied for table profiles` (ROLLBACK) |
| `post_reactions` | **NOT RUN** — no transient post created |

Unlock control did not reach insert success; cannot confirm positive path via direct INSERT in this gate.

---

## 7. Cleanup

| Check | Result |
|-------|--------|
| Final `release_gate` locked | **true** |
| `bl_is_release_unlocked()` | **false** |
| `p5_e7a` posts | **0** |
| `p5_e7a` notifications | **0** |
| Permanent test acks / profile changes | **0** (rolled back) |

---

## 8. Fixture Status (local, unchanged)

| Fixture | Result |
|---------|--------|
| Release Lock DB | 32/34 — storage defer expected |
| Release Lock UI | 30/30 PASS |
| Notification | 24/24 PASS |
| Observation RPC | 17/17 PASS |
| Sanitization | 45/45 PASS |

No fixture code changes in this gate.

---

## 9. Remaining Gaps

| Gap | Status |
|-----|--------|
| Direct posts release-lock RLS isolation | **PARTIAL** — secondary `profiles`/`acks` SELECT grant gap on staging |
| Storage closure | **DEFERRED** |
| S+-03 runtime/production | **NOT CLOSED** |
| Production closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Recommended follow-up

**P5-E.7A.2** (or extend 7A with explicit approval): minimal `GRANT SELECT` on `public.profiles` and `public.user_submission_acks` to `authenticated` on staging only, then re-run locked direct posts INSERT test to observe `row-level security policy` / release-lock block.

---

## 10. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Grant Apply** | **PASS** |
| **Direct Posts Release Lock Evidence** | **PARTIAL** |
| **S+-01 Public Writes (direct path)** | **PARTIAL** — improved; not fully closed |
| **Storage Closure** | **DEFERRED** |
| **P5-E.7A (overall)** | **PARTIAL** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

P5-E.7A **closed the primary posts INSERT grant gap** on staging. Direct insert attempts **no longer fail with `permission denied for table posts`**. Release-lock RLS on the direct client path remains **not fully proven** because INSERT policies reference `profiles`/`acks` tables where `authenticated` lacks SELECT privilege on staging. RPC-based release lock (S+-04) remains the strongest live evidence for S+-01 write blocking.

---

*Document version: P5-E.7A PARTIAL. No secrets.*
