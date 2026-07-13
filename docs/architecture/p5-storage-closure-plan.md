# P5-E.8 Storage Closure Plan

**Gate:** P5-E.8 — Storage Closure Plan (planning/review only)  
**Date:** 2026-07-13  
**HEAD:** `653c789` — Align release lock fixture with storage defer  
**Verdict:** **PASS** — planning gate complete; storage remains **DEFERRED** until P5-E.8A

---

## 1. Scope / Approval

| Constraint | Status |
|------------|--------|
| User approval for P5-E.8 | **YES** — planning/review only |
| Planning / documentation only | **YES** |
| No SQL apply | **YES** |
| No DB write / DB access | **YES** |
| No storage policy apply | **YES** |
| No push / deploy / launch | **YES** |
| No secrets / URLs / credentials added | **YES** |

This gate produces a closure plan and updates documentation. It does **not** apply `release_gate_storage_policy_deferred.sql`.

---

## 2. Starting Point

| Item | Status |
|------|--------|
| HEAD | `653c789` |
| P5-E.7B | **PASS** — fixture aligned |
| Release Lock DB Fixture | **CORE_PASS_STORAGE_DEFERRED** — 32/32 core + 2 DEFERRED |
| Direct Posts Release Lock Evidence (staging) | **PASS** |
| Observation RPC Release Lock Evidence (staging) | **PASS** |
| Notification Injection Guard (staging) | **PASS** |
| S+-03 Sanitization Fixture (local) | **PASS** — 45/45 |
| Storage Closure | **DEFERRED** |
| `release_gate_storage_policy_deferred.sql` | **Exists** — **not applied** |
| Staging ref | `jzzgoiwfbuwiiyvwgwri` |
| Legacy ref (forbidden) | `ohkoojpzmptdfyowdgog` |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Why storage is deferred

P5-E.5 Re-run 2 failed with:

```
ERROR: must be owner of relation objects
```

when applying storage policy DDL via session-pooler `postgres`. P5-E.5C split storage into a separate deferred file. Core release gate (`release_gate_lock.sql`) applied successfully on staging without storage DDL.

---

## 3. Deferred Storage SQL Review

**File:** `supabase/release_gate_storage_policy_deferred.sql`

### Static safety assessment

| Check | Result |
|-------|--------|
| Clearly marked DEFERRED | **YES** — header `STATUS: DEFERRED — DO NOT APPLY in default P5-E.5 path` |
| Contains only storage policy DDL | **YES** — single policy + comment; no tables/functions |
| `DROP POLICY IF EXISTS` | **YES** — line 26 |
| `CREATE POLICY storage_discovery_uploads_release_gate_insert_restrictive` | **YES** — lines 28–36 |
| Fail-closed release gate logic | **YES** — `WITH CHECK` uses `public.bl_can_create_user_content(auth.uid())` |
| Indirect `bl_is_release_unlocked` | **YES** — via `bl_can_create_user_content()` (already on staging from `release_gate_lock.sql`) |
| No data (INSERT/COPY/seed) | **YES** |
| No secrets / passwords / keys | **YES** |
| No URLs | **YES** |
| No `service_role` | **YES** — comment only says "No service_role" |
| No TRUNCATE / DROP TABLE / DROP SCHEMA | **YES** |
| No unlock / `contribution_locked = false` | **YES** |
| No production-specific values | **YES** |
| Transaction wrapped (`begin`/`commit`) | **YES** |
| Restrictive policy (`as restrictive`) | **YES** |
| Bucket-aware (`bucket_id <> 'discovery-uploads'`) | **YES** — other buckets unaffected |

### Policy semantics

```sql
with check (
  bucket_id <> 'discovery-uploads'
  or public.bl_can_create_user_content(auth.uid())
);
```

- **discovery-uploads INSERT:** blocked when release gate locked (`bl_can_create_user_content` → false)
- **Other buckets:** unaffected by this policy
- **Admin bypass:** via `bl_can_bypass_release_gate()` inside `bl_can_create_user_content()` (already provisioned)

### Dependency prerequisite

`bl_can_create_user_content()` and `bl_is_release_unlocked()` must already exist on staging — **confirmed applied** via P5-E.5 Re-run 3 + P5-E.7A.2 path.

### Apply status

**Still not applied.** No changes to this file in P5-E.8.

---

## 4. Owner-Capable Execution Path Options

| Option | Feasibility | Risk | Required Guards | Recommendation |
|--------|-------------|------|-----------------|----------------|
| **A) Supabase Dashboard SQL Editor (Staging)** | **High** — Dashboard runs with sufficient privileges on `storage.objects` | Manual copy/paste errors; wrong tab/project | Visual project-ref check (`jzzgoiwfbuwiiyvwgwri`); copy only from deferred file; pre-apply backup; post-apply read-only verify; no other SQL | **PREFERRED** for first closure attempt |
| **B) Supabase CLI linked to staging** | **Low** — CLI not established in repo workflow | Wrong project link; accidental prod apply | Explicit `supabase link --project-ref jzzgoiwfbuwiiyvwgwri`; lockfile/checklist gate; no prod credentials | **Not preferred** without dedicated tooling gate |
| **C) psql Session Pooler (`postgres`)** | **Not feasible** — proven blocked | Entire apply fails; false sense of progress | None — do not use | **REJECTED** — owner error on `storage.objects` |
| **D) MCP / Admin owner-capable tool** | **Conditional** — only if tool addresses staging ref unambiguously | Wrong project; credential leakage in repo | Separate gate; project ref proof; no `service_role` in repo; read-only verify after | **Secondary option** — requires P5-E.8A sub-gate approval |

---

## 5. Recommended Closure Path

### Preferred: Supabase Dashboard SQL Editor on Staging

1. **Open only** Supabase project `jzzgoiwfbuwiiyvwgwri` (staging)
2. **Visually confirm** project ref in Dashboard URL/settings — must match staging, **not** `ohkoojpzmptdfyowdgog`
3. **Do not open** legacy or production projects
4. **Pre-apply backup** — `pg_dump` schema-only or Supabase backup snapshot (separate gate step)
5. **Copy SQL only** from `supabase/release_gate_storage_policy_deferred.sql` — entire file, no edits
6. **Do not apply** any other SQL file in same session
7. **Post-apply** — read-only verification queries only (policy exists, release gate still locked)
8. **Negative test** — separate step; see §7

### Why psql session pooler is insufficient

The pooler `postgres` role connects as database superuser but is **not owner** of `storage.objects` (owned by `supabase_storage_admin` or equivalent internal role). PostgreSQL requires relation owner (or superuser with specific bypass) to `CREATE POLICY` on `storage.objects`. This was demonstrated in P5-E.5 Re-run 2.

Dashboard SQL Editor typically executes as a role with storage schema privileges sufficient to create policies.

---

## 6. Proposed Gate P5-E.8A — Storage Policy Owner-Capable Apply on Staging

**Purpose:** Apply deferred storage release-gate policy on staging only, via owner-capable path, with verification and negative test.

### Preconditions (all required)

| # | Precondition |
|---|--------------|
| 1 | New explicit user approval for P5-E.8A |
| 2 | Staging project `jzzgoiwfbuwiiyvwgwri` visually confirmed in Dashboard |
| 3 | Legacy `ohkoojpzmptdfyowdgog` excluded — not opened |
| 4 | Production excluded — not opened |
| 5 | Pre-apply backup exists and is >0 bytes |
| 6 | `release_gate.contribution_locked = true` (read-only verify) |
| 7 | `bl_is_release_unlocked() = false` (read-only verify) |
| 8 | `release_gate_storage_policy_deferred.sql` statically reviewed (same checks as §3) |
| 9 | `bl_can_create_user_content()` exists on staging (read-only verify) |
| 10 | No other SQL files in apply scope |

### Apply steps

| Step | Action |
|------|--------|
| 1 | Open Supabase Dashboard → project `jzzgoiwfbuwiiyvwgwri` |
| 2 | SQL Editor → paste **only** contents of `release_gate_storage_policy_deferred.sql` |
| 3 | Review pasted SQL matches repo file (policy name, bucket guard, no extra statements) |
| 4 | Execute |
| 5 | Confirm success message — no `must be owner` error |

**Do not apply:**
- `release_gate_lock.sql` (already on staging)
- `phase_a_observations_foundation.sql` (already on staging)
- `pre_release_test_data_reset.sql`
- Any production project

### Post-apply verification (read-only)

| Check | Expected |
|-------|----------|
| Policy exists on `storage.objects` | `storage_discovery_uploads_release_gate_insert_restrictive` |
| Policy type | `RESTRICTIVE`, `INSERT`, `authenticated` |
| Policy references release gate | `bl_can_create_user_content` in `WITH CHECK` |
| `release_gate.contribution_locked` | `true` |
| `bl_is_release_unlocked()` | `false` |
| Storage objects created | **0** new test objects |
| Uploads persisted | **0** |

Example read-only queries (for P5-E.8A gate only):

```sql
-- Policy metadata (read-only)
SELECT polname, polcmd, polpermissive
FROM pg_policy p
JOIN pg_class c ON p.polrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'storage' AND c.relname = 'objects'
  AND polname = 'storage_discovery_uploads_release_gate_insert_restrictive';

-- Release gate state (read-only)
SELECT contribution_locked FROM public.release_gate WHERE id = 1;
SELECT public.bl_is_release_unlocked();
```

### Negative upload test (Stage 2)

| Step | Action |
|------|--------|
| 1 | Authenticate as test user A (`p5_e5_user_a@example.com`) on staging |
| 2 | Attempt upload to `discovery-uploads` bucket while release gate locked |
| 3 | **Expected:** upload blocked (RLS/policy denial) |
| 4 | Verify no file persisted in `storage.objects` for test path |
| 5 | Cleanup — delete any accidental test object if created |

**If direct Storage API test is not safely automatable:** document manual Dashboard/API procedure; mark negative test as **NOT RUN** — overall P5-E.8A verdict **PARTIAL**, not PASS.

### Cleanup

| Item | Action |
|------|--------|
| Test upload objects | Delete if any created |
| `release_gate` state | Must remain **locked** |
| Test user data | No permanent ack/profile changes |

### Hard stops (immediate abort)

| Condition | Action |
|-----------|--------|
| Wrong project ref visible | **STOP** — do not execute |
| `must be owner of relation objects` | **STOP** — report; try different owner-capable path |
| `release_gate` becomes unlocked | **CRITICAL** — stop; investigate before any further tests |
| Any unexpected DDL beyond deferred file | **STOP** — rollback assessment |
| Production project opened | **STOP** |

### Rollback / failure

| Scenario | Response |
|----------|----------|
| Apply fails | Write report; no quick-fix SQL improvisations |
| Wrong project detected | Stop immediately; document what was visible |
| Policy created but wrong definition | `DROP POLICY` via owner-capable path only — separate approval |
| Release gate accidentally unlocked | Critical blocker — separate remediation gate |

---

## 7. Storage Test Strategy

### Stage 1 — Metadata / Policy Verification

| Check | Purpose |
|-------|---------|
| Policy exists on `storage.objects` | Confirms apply succeeded |
| Policy is `INSERT` + `RESTRICTIVE` | Correct enforcement type |
| Role scope `authenticated` | Matches client upload path |
| `WITH CHECK` includes bucket guard + `bl_can_create_user_content` | Release gate wired |
| No upload performed | Zero side effects |

**Verdict contribution:** **PARTIAL** — policy provisioned but upload block not proven

### Stage 2 — Negative Upload Test

| Check | Purpose |
|-------|---------|
| Authenticated user A uploads to `discovery-uploads` | Real client path |
| Release gate locked | Enforcement precondition |
| Upload blocked | Live S+-01 storage evidence |
| No file persisted | No data pollution |

**Verdict contribution:** Required for **PASS** Storage Closure on staging

### Verdict matrix

| Stage 1 | Stage 2 | Storage Closure (staging) |
|---------|---------|---------------------------|
| PASS | NOT RUN | **PARTIAL** |
| PASS | PASS | **PASS** (staging only) |
| PASS | FAIL | **FAIL** |
| FAIL | — | **FAIL** |

**Production Closure** remains **NOT CLOSED** regardless of staging PASS.

---

## 8. Fixture Impact

### Current state (P5-E.7B)

| Segment | Status |
|---------|--------|
| Required core checks (1–20, 23–34) | **32/32 PASS** |
| Storage checks (21–22) | **2 DEFERRED** |
| Overall | **CORE_PASS_STORAGE_DEFERRED** |

### After successful P5-E.8A + Stage 2 PASS

| Segment | Expected |
|---------|----------|
| Storage checks (21–22) | **PASS** — policy live on staging + repo file aligned |
| Overall | **34/34 PASS** (no DEFERRED) |

### Future gate: P5-E.8B — Storage Fixture Re-Enablement

**Purpose:** Update `qa/p5-release-lock-db-security-fixtures.js` to verify storage policy as **required PASS** once live on staging.

| Step | Action |
|------|--------|
| 1 | Confirm P5-E.8A PASS with Stage 2 negative test |
| 2 | Change checks 21–22 from `deferred` to `pass` (verify policy in deferred file **and** document live apply evidence) |
| 3 | Update summary from `CORE_PASS_STORAGE_DEFERRED` to `PASS` |
| 4 | Re-run local fixtures |

**No fixture changes in P5-E.8** — documentation only.

---

## 9. S+ Status After Planned Storage Closure

### If P5-E.8A + Stage 2 PASS

| Finding | Staging verdict (expected) |
|---------|--------------------------|
| S+-01 Direct posts | **PASS** (already proven P5-E.7A.2) |
| S+-01 Observation RPC | **PASS** (P5-E.5 Re-run 3) |
| S+-01 Storage upload lock | **PASS** (new) |
| S+-01 Missing `release_gate` fail-closed | **PASS** (direct posts) |
| **S+-01 overall (staging)** | **PASS** |
| S+-02 Notification injection | **PASS** (unchanged) |
| S+-03 Sanitization | **PARTIAL** — runtime/production not closed |
| S+-04 Observation RPC | **PASS** (unchanged) |
| **S+ Staging Evidence** | **Stronger** — S+-01 fully closed on staging |

### Unchanged blockers

| Blocker | Status |
|---------|--------|
| S+-03 runtime/production sanitization | **NOT CLOSED** |
| Production Closure | **NOT CLOSED** |
| S-level blockers (SEO CSR, S-06 recall, backup/restore, monitoring) | **Open** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

---

## 10. Remaining Risks

| Risk | Mitigation |
|------|------------|
| Wrong project (legacy/prod) | Visual ref check before any SQL; hard stop list |
| Manual copy/paste error | Paste-only from repo file; diff review before execute |
| Owner-capable path unavailable in Dashboard | Report PARTIAL; evaluate MCP/admin path as separate sub-gate |
| Storage test object pollution | No upload unless negative test; cleanup verify after |
| False PASS without Stage 2 | Stage 1 alone = PARTIAL only |
| Production not tested | Staging PASS does not imply production closure |
| Existing `discovery_upload_authenticated` policy interaction | Verify restrictive policy composes correctly with base discovery policies (read-only policy catalog review in P5-E.8A) |

---

## 11. Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.8 (this planning gate)** | **PASS** |
| Storage Closure | **DEFERRED** — until owner-capable path found |
| Recommended apply path | **OPEN** — Dashboard SQL Editor **disproven** (P5-E.8A resume) |
| psql session pooler | **Not suitable** — owner error proven |
| S+ Staging Evidence | **PARTIAL** (unchanged) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

P5-E.8 documents a safe, staged path to close the deferred storage release-gate policy. The deferred SQL file is statically sound. **P5-E.8A resume disproved Dashboard SQL Editor** as owner-capable for `storage.objects`. Session-pooler `psql` also unsuitable. Owner path remains **OPEN** (Support/tooling investigation). Fixture re-enablement deferred to **P5-E.8B** after live verification.

**Recommended next:** See `p5-storage-owner-path-bucket-scope-review.md` — P5-E.8C + P5-E.8A.4.

---

## 13. P5-E.8A Follow-up (FAIL — owner error on storage.objects)

**Gate:** P5-E.8A resume — Dashboard apply attempted. **FAIL**.

| Item | Result |
|------|--------|
| Dashboard project | **boundlore-staging** / `jzzgoiwfbuwiiyvwgwri` confirmed |
| Apply method | Dashboard SQL Editor |
| Apply error | `42501: must be owner of relation objects` |
| Policy applied | **NO** |
| Storage closure | **DEFERRED** |
| P5-E.8A | **FAIL** |

**Report:** `docs/architecture/p5-storage-policy-owner-apply-report.md`

---

## 14. P5-E.8A.2 Follow-up (PASS — review only)

**Gate:** P5-E.8A.2 — Storage Owner Path + Bucket Scope Review. **PASS**.

| Item | Result |
|------|--------|
| Static storage usage review | `[x]` — create-post + support only |
| Core wiki read path needs storage? | **No** |
| `discovery-uploads` bucket | **Missing** — separate provisioning gate |
| Owner-capable path | **OPEN** — Dashboard rejected |
| Decision tree | Option 3 Hybrid recommended |
| SQL apply / DB access | **None** |
| P5-E.8A.2 | **PASS** |

**Report:** `docs/architecture/p5-storage-owner-path-bucket-scope-review.md`

---

## 15. P5-E.8C Follow-up (PASS — upload disablement)

**Gate:** P5-E.8C — Frontend upload disablement while storage deferred. **PASS**.

| Item | Result |
|------|--------|
| Upload UI/JS hardened | `[x]` |
| Storage DB closure | **DEFERRED** |
| Owner path | **OPEN** |
| SQL apply / DB access | **None** |
| P5-E.8C | **PASS** |

**Report:** `docs/architecture/p5-upload-path-disablement-review.md`

---

*Document version: P5-E.8 PASS + P5-E.8A FAIL + P5-E.8A.2 PASS + P5-E.8C PASS. No secrets.*
