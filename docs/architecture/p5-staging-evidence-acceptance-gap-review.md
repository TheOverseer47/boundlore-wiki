# P5-E.6 Staging Evidence Acceptance + Gap Review

**Gate:** P5-E.6 — Staging Evidence Acceptance + Gap Review  
**Date:** 2026-07-13  
**HEAD at gate start:** `971e48e` — Document staged DB security retest rerun 3  
**User approval:** **YES** — review/documentation only  
**Verdict:** **PASS** (review gate) — S+ staging evidence **PARTIAL**  
**Production closure:** **NOT CLOSED**

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-E.6 | `[x]` |
| Documentation / review only | `[x]` |
| No SQL apply | `[x]` |
| No DB access / write | `[x]` |
| No psql / pg_dump | `[x]` |
| Push / Deploy / Launch | `[x]` — none |
| Staging ref (prior evidence) | `jzzgoiwfbuwiiyvwgwri` |
| Legacy ref excluded | `ohkoojpzmptdfyowdgog` — not used in this gate |

---

## 2. Starting Point

| Item | Status |
|------|--------|
| HEAD | `971e48e` |
| P5-E.5 Re-run 3 | **PARTIAL** |
| SQL Apply on staging | **PASS** |
| Negative live tests | **PARTIAL** |
| Storage closure | **DEFERRED** |
| Production closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

**Applied on staging (from P5-E.5 Re-run 3 evidence):**

- `admin_dashboard_notifications.sql` — previously applied
- `release_gate_lock.sql` — applied
- `phase_a_observations_foundation.sql` — applied
- `release_gate_storage_policy_deferred.sql` — **not applied**

**Final release gate state (from P5-E.5 Re-run 3):** `contribution_locked = true`, `bl_is_release_unlocked() = false`

---

## 3. Evidence Summary Table

| Finding | Repo Evidence | Staging SQL Apply | Staging Live Test | Remaining Gap | Verdict |
|---------|---------------|-------------------|-------------------|---------------|---------|
| **S+-01** Release Lock | `release_gate_lock.sql`, restrictive policies, helpers | PASS | PARTIAL | Direct posts RLS not isolated (grant gap); storage DEFERRED; production not tested | **PARTIAL** |
| **S+-02** Notification Injection | `admin_dashboard_notifications.sql`, WITH CHECK | Previously applied | PASS — foreign insert blocked | Production closure | **PASS** (staging) |
| **S+-03** Sanitization | `BoundLoreContentSafety`, fixture 45/45 | N/A | Local fixture PASS; stored-content runtime NOT RUN | Production / stored-content runtime | **PARTIAL** |
| **S+-04** Observation RPC Gate | `bl_register_observation` ack + release assert | PASS | PASS — anon/no-ack/locked blocked | Production closure | **PASS** (staging) |

---

## 4. Accepted Staging Evidence

The following may be **accepted as staging-proven** (not production-closed):

| Evidence | Source | Status |
|----------|--------|--------|
| S+-02 foreign notification insert blocked | P5-E.5 Re-run 3 live RLS simulation | **ACCEPTED** |
| S+-04 anon / no-ack / locked RPC blocked | P5-E.5 Re-run 3 live RPC tests | **ACCEPTED** |
| `release_gate` + audit tables provisioned | P5-E.5 Re-run 3 SQL apply | **ACCEPTED** |
| Default locked state (`contribution_locked = true`) | P5-E.5 Re-run 3 post-apply verify | **ACCEPTED** |
| `bl_is_release_unlocked() = false` while locked | P5-E.5 Re-run 3 post-apply verify | **ACCEPTED** |
| Release lock via RPC (`bl_assert_can_create_user_content`) | S+-04C blocked while locked | **ACCEPTED** |
| S+-03 local sanitization fixture 45/45 | P5-E.5 Re-run 3 local fixtures | **ACCEPTED** (repo baseline) |

---

## 5. Partial / Deferred Evidence

| Item | Status | Reason |
|------|--------|--------|
| S+-01 direct `posts` INSERT RLS | **PARTIAL** | `authenticated` lacks `INSERT` grant on `public.posts` on staging — test hit table privilege, not RLS policy message |
| S+-01 storage upload lock | **DEFERRED** | `release_gate_storage_policy_deferred.sql` not applied; owner-capable path required |
| S+-01 `post_reactions` live block | **NOT RUN** | No published post FK target on staging |
| S+-01 admin unlock/re-lock | **NOT RUN** | No admin test user on staging |
| S+-03 stored-content staging runtime | **NOT RUN** | App not safely pointed at staging for runtime XSS proof |
| Production closure (all S+) | **NOT CLOSED** | Staging evidence ≠ production evidence |

---

## 6. Direct Posts Grant-Gap Review

### Static repo search (no DB)

| Path | Pattern | Finding |
|------|---------|---------|
| `js/create-post.js` | `supabase.from("posts").insert(payload)` | **Direct client INSERT** for wiki/guide/discovery submit |
| `js/guilds-apply.js` | `supabase.from("posts").insert(payload)` | **Direct client INSERT** for guild applications |
| `js/discovery-core.js` | `supabase.rpc("bl_register_observation", …)` | **RPC path** for knowledge-graph discovery (v2) |
| `js/create-post.js` | `DiscoveryWizard.submitDiscovery` → RPC | Discovery v2 routes through RPC before fallback direct insert |
| `supabase/core_schema_foundation.sql` | `GRANT` on `posts` | **No explicit GRANT statements** in extracted schema |

### Architecture finding

The client **does** use direct `posts` INSERT for normal post creation and guild applications. The knowledge-graph discovery v2 path uses `bl_register_observation` RPC, but create-post still falls back to direct insert when RPC path does not return.

**Decision:** **B — Grant + RLS test needed**

Direct client inserts into `public.posts` are **intended** in the current app model. The staging grant gap is therefore:

1. A **staging provisioning gap** (missing `GRANT INSERT` for `authenticated` on `posts`), not evidence that direct insert is undesired.
2. A **test isolation gap** — release-gate restrictive policy on `posts` was not independently proven via live direct INSERT on staging.

**Not** decision A (“no direct client insert by design”) — repo contradicts that.

### Recommended next gate

**P5-E.7A** — Direct Posts Grant/RLS Architecture Decision + Staging Grant Fix (explicit approval, staging-only DB touch) to:

- Add/document required `GRANT INSERT, SELECT, UPDATE` for `authenticated` on `public.posts` (and related tables as needed)
- Re-run S+-01 direct posts INSERT negative test with RLS-isolated proof
- No production apply without separate gate

---

## 7. Storage Closure Review

| Item | Status |
|------|--------|
| Deferred file | `supabase/release_gate_storage_policy_deferred.sql` exists |
| Applied on staging | **No** |
| Reason deferred | `storage.objects` requires relation owner; pooler `postgres` lacks ownership |
| Default P5-E.5 apply | **Excluded** by P5-E.5C design |
| Live S+-01 storage test | **NOT RUN** |
| Release Lock DB fixture | **CORE_PASS_STORAGE_DEFERRED** (P5-E.7B) — 32/32 core + 2 DEFERRED |

### Closure path options (future gate only)

1. Owner-capable execution (Supabase Dashboard SQL Editor with storage owner role, or MCP with appropriate privileges)
2. Separate explicit user approval gate (**P5-E.8**)
3. Not part of default staging security apply sequence

**Status:** **DEFERRED** — no action in P5-E.6

---

## 8. Fixture Review

| Fixture | Count | Status | Notes |
|---------|-------|--------|-------|
| Notification | 24/24 | PASS | Repo static helper |
| Observation RPC | 17/17 | PASS | Repo SQL pattern |
| Sanitization | 45/45 | PASS | Repo static helper |
| Release Lock DB | **CORE_PASS_STORAGE_DEFERRED** | 32/32 core PASS; checks 21–22 **DEFERRED** (P5-E.7B) |
| Release Lock UI | 30/30 | PASS | Client fail-closed model |
| Regression smoke | 11/11 HTTP 200 | PASS | No crash |

### Fixture recommendation

**P5-E.7B** — **COMPLETE (PASS).** Release Lock DB fixture now shows storage checks as **DEFERRED** with core 32/32 PASS separately. Storage closure remains **P5-E.8**.

---

## 9. Product-Activation Gap Review

**Product-Activation-Ready: FAIL** (unchanged)

| Blocker category | Status |
|------------------|--------|
| S+-01 release lock not fully closed on staging | PARTIAL — RPC proven; direct posts RLS not isolated |
| S+-03 runtime / production sanitization | NOT CLOSED |
| Storage closure deferred | DEFERRED |
| Production closure | NOT CLOSED |
| SEO CSR shells | Open (S-level) |
| Search monster recall gap (S-06) | Open |
| Backup/Restore unproven | Open |
| Monitoring missing | Open |
| Patch-mode submit path gap | Open |
| Base RLS audit depth | Open |

P5-E.6 does **not** revise Product-Activation to PASS.

---

## 10. Public Launch Review

**Public-Launch-Ready: NO-GO** (unchanged)

| Reason | Status |
|--------|--------|
| Production closure not done | `[x]` |
| Product-Activation still FAIL | `[x]` |
| Storage closure deferred | `[x]` |
| Monitoring / backup not proven | `[x]` |
| No deploy decision | `[x]` |

---

## 11. Recommended Next Gates

| Order | Gate | Purpose | DB touch |
|-------|------|---------|----------|
| A | **P5-E.7A** — Direct Posts Grant/RLS Decision | Confirm grants; re-test S+-01 direct posts RLS on staging | Staging only, explicit approval |
| B | **P5-E.7B** — Release Lock Fixture Alignment | Fix 32/34 expected state for storage defer | Docs/fixture only |
| C | **P5-E.8A** — Storage Policy Owner-Capable Apply | Apply deferred storage policy on staging | Staging only, explicit approval |
| D | **P5-E.8B** — Storage Fixture Re-Enablement | Restore storage checks from DEFERRED to PASS | Fixture only, after P5-E.8A |
| D | **P5-E.9** — Production Closure Plan | Plan only — no apply | None |
| E | Product-Activation Gap Remediation | After S+ closure milestones | Per sub-gate |

**No push, deploy, or launch** at any step above without explicit future approval.

---

## 12. Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.6 (this review gate)** | **PASS** |
| **S+ Staging Evidence (overall)** | **PARTIAL** |
| S+-01 Release Lock (staging) | **PARTIAL** |
| S+-02 Notification Injection (staging) | **PASS** |
| S+-03 Sanitization (staging) | **PARTIAL** |
| S+-04 Observation RPC (staging) | **PASS** |
| **Storage Closure** | **DEFERRED** |
| **Production Closure** | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

P5-E.5 Re-run 3 delivered **credible staging evidence** for notification injection (S+-02), observation RPC gates (S+-04), and release-gate core provisioning. Release lock enforcement is **proven on the RPC path** but **not fully proven on direct `posts` INSERT** due to a staging grant gap that conflicts with the app's direct-insert client model. Storage closure remains **deferred by design**. Production closure and product activation remain **blocked**.

---

## 13. P5-E.7A Follow-up (PARTIAL — posts grant applied)

**Gate:** P5-E.7A — direct posts INSERT grant on staging. **PARTIAL**.

| Item | Result |
|------|--------|
| Posts INSERT grant | `[x]` PASS |
| No longer posts grant-denied | `[x]` |
| Release-lock RLS isolated on direct insert | `[ ]` PARTIAL — profiles SELECT gap |
| P5-E.7A | **PARTIAL** |

**Report:** `docs/architecture/p5-direct-posts-grant-rls-retest-report.md`

---

## 14. P5-E.7A.2 Follow-up (PASS — SELECT grants + release-lock RLS)

**Gate:** P5-E.7A.2 — profiles/acks SELECT grants; direct posts release-lock RLS proven. **PASS**.

| Item | Result |
|------|--------|
| SELECT grants applied | `[x]` |
| Release-lock RLS on direct insert | `[x]` PASS |
| P5-E.7A.2 | **PASS** |

**Report:** `docs/architecture/p5-policy-dependency-select-grants-retest-report.md`

---

## 15. P5-E.7B Follow-up (PASS — fixture alignment)

**Gate:** P5-E.7B — Release Lock DB fixture storage defer alignment. **PASS**.

| Item | Result |
|------|--------|
| Fixture overall | **CORE_PASS_STORAGE_DEFERRED** |
| Core checks | **32/32 PASS** |
| Storage checks | **2 DEFERRED** |
| P5-E.7B | **PASS** |

**Report:** `docs/architecture/p5-release-lock-fixture-alignment-report.md`

---

## 16. P5-E.8 Follow-up (PASS — storage closure plan)

**Gate:** P5-E.8 — Storage Closure Plan (planning only). **PASS**.

| Item | Result |
|------|--------|
| P5-E.8A apply gate designed | `[x]` |
| Storage closure | **DEFERRED** until P5-E.8A |
| P5-E.8B fixture re-enable planned | `[x]` |
| P5-E.8 | **PASS** |

**Report:** `docs/architecture/p5-storage-closure-plan.md`

---

## 18. P5-E.8A Resume Follow-up (FAIL)

**Gate:** P5-E.8A resume — Dashboard apply owner error. **FAIL**.

| Item | Result |
|------|--------|
| Apply | **FAIL** — `must be owner of relation objects` |
| `discovery-uploads` bucket | **Still missing** |
| Storage closure | **DEFERRED** |
| P5-E.8A | **FAIL** |

**Report:** `docs/architecture/p5-storage-policy-owner-apply-report.md`

---

## 19. P5-E.8A.2 Follow-up (PASS — review only)

**Gate:** P5-E.8A.2 — Storage Owner Path + Bucket Scope Review. **PASS**.

| Item | Result |
|------|--------|
| S+-01 Core (posts + RPC) | **PASS** on staging |
| S+-01 Storage | **DEFERRED** |
| S+ Staging Evidence | **PARTIAL** — storage defer not yet formally accepted |
| Storage MVP-critical? | **No** (locked state) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |
| SQL apply / DB access | **None** |
| P5-E.8A.2 | **PASS** |

**Report:** `docs/architecture/p5-storage-owner-path-bucket-scope-review.md`

---

## 20. P5-E.8C Follow-up (PASS — upload disablement)

**Gate:** P5-E.8C — Upload paths disabled; S+ storage DB still deferred. **PASS**.

| Item | Result |
|------|--------|
| Upload paths (frontend) | **Disabled/hardened** |
| S+-01 Storage (DB) | **DEFERRED** |
| S+ Staging Evidence | **PARTIAL** |
| P5-E.8C | **PASS** |

**Report:** `docs/architecture/p5-upload-path-disablement-review.md`

---

*Document version: P5-E.6 PASS + ... + P5-E.8A FAIL + P5-E.8A.2 PASS + P5-E.8C PASS. No secrets. No DB access.*
