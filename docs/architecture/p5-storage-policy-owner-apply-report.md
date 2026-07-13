# P5-E.8A Storage Policy Owner-Capable Apply Report

**Gate:** P5-E.8A — Storage Policy Owner-Capable Apply on Staging  
**Date:** 2026-07-13  
**HEAD (start):** `ff20edd` — Document storage policy owner apply blockers  
**Verdict:** **FAIL** — Dashboard apply attempted; owner error on `storage.objects`

---

## 1. Scope / Approval

| Constraint | Status |
|------------|--------|
| User approval for P5-E.8A | **YES** — staging only |
| Staging ref | `jzzgoiwfbuwiiyvwgwri` |
| Apply method required | Supabase Dashboard SQL Editor only |
| Legacy excluded | **YES** — `ohkoojpzmptdfyowdgog` not opened |
| Production excluded | **YES** — no legacy/production project |
| No MCP apply / no psql apply | **YES** |
| No push / deploy / launch | **YES** |
| No secrets in report | **YES** |

---

## 2. Environment Proof

| Check | Result |
|-------|--------|
| `SUPABASE_STAGING_PROJECT_REF` | `jzzgoiwfbuwiiyvwgwri` |
| `SUPABASE_STAGING_CONFIRM_ISOLATED` | `true` |
| Legacy ref excluded | **YES** |
| Supabase MCP `get_project` | **PASS** — `boundlore-staging`, `ACTIVE_HEALTHY` |

### Dashboard visual confirmation (resume)

| Check | Result |
|-------|--------|
| User login confirmed | **YES** (user + automation session) |
| Project name visible | **boundlore-staging** |
| Project ref in URL | **jzzgoiwfbuwiiyvwgwri** |
| SQL Editor reachable | **YES** |
| Legacy `ohkoojpzmptdfyowdgog` | **Not opened** |

**Note:** Supabase UI shows branch badge `main PRODUCTION` — this is the **default database branch label inside the staging project**, not the forbidden legacy/production BoundLore project. Project URL and name confirm **boundlore-staging** / `jzzgoiwfbuwiiyvwgwri`.

### Backup (from initial P5-E.8A attempt)

| Item | Value |
|------|-------|
| Path | `backups/staging/p5-e8a-storage-policy-preapply-20260713-231730.sql` |
| Size | **290,277 bytes** |
| Gitignored | **YES** |

---

## 3. Pre-Apply State

| Check | Result |
|-------|--------|
| `release_gate` id=1 | **Present** |
| `contribution_locked` | **true** |
| `bl_is_release_unlocked()` | **false** |
| Policy pre-existence | **Not present** |
| Deferred SQL static safety | **PASS** |

---

## 4. Apply Log

| Item | Value |
|------|-------|
| File applied | `supabase/release_gate_storage_policy_deferred.sql` (DDL portion: `begin` … `commit`) |
| Method | **Supabase Dashboard SQL Editor** |
| Dashboard URL | `/dashboard/project/jzzgoiwfbuwiiyvwgwri/sql/...` |
| Role selected | `postgres` |
| Other SQL files | **None** |
| MCP apply | **Not used** |
| psql apply | **Not used** |

### Apply attempts

| Attempt | Result |
|---------|--------|
| 1 | **FAIL** — editor sync issue; query ran as literal `undefined` (syntax error) |
| 2 | SQL loaded via Monaco `setValue`; destructive-op confirm accepted; **FAIL** |

### Apply error (attempt 2)

```
ERROR: 42501: must be owner of relation objects
```

Same root cause as P5-E.5 Re-run 2: Dashboard SQL Editor `postgres` role is **not owner** of `storage.objects`. Transaction rolled back; no policy created.

Per gate rules: **STOP** — no second SQL variant attempted.

### Apply result: **FAIL**

---

## 5. Policy Metadata Verification

| Check | Result |
|-------|--------|
| Policy exists | **NO** |
| Policy name | N/A |
| Schema/table | N/A |
| cmd/roles | N/A |
| Bucket guard in `with_check` | N/A |
| `bl_can_create_user_content` signal | N/A |

**Verdict:** **FAIL** — policy not provisioned.

---

## 6. Negative Storage Test

| Prerequisite | Result |
|--------------|--------|
| Policy applied | **NO** |
| `discovery-uploads` bucket | **NOT PRESENT** on staging |

| Test | Result |
|------|--------|
| Metadata verification (post-apply) | **FAIL** (no policy) |
| Transactional `storage.objects` INSERT | **NOT RUN** |
| Real upload test | **NOT RUN** |
| `p5_e8a` objects persisted | **NO** (0) |

**Verdict:** **NOT RUN**

---

## 7. Cleanup / Final State

| Check | Result |
|-------|--------|
| `release_gate.contribution_locked` | **true** (unchanged) |
| `bl_is_release_unlocked()` | **false** (unchanged) |
| `p5_e8a` storage objects | **0** |
| Production / legacy touched | **NO** |
| Push / deploy / launch | **NO** |

---

## 8. Fixture Impact

| Fixture | Status |
|---------|--------|
| Release Lock DB | **CORE_PASS_STORAGE_DEFERRED** (unchanged) |
| P5-E.8B re-enable | **Still pending** |

---

## 9. Remaining Gaps

| Gap | Status |
|-----|--------|
| Storage policy apply | **FAIL** — owner-capable path not achieved via Dashboard `postgres` role |
| `discovery-uploads` bucket | **Not provisioned** on staging |
| S+-03 runtime/production | **NOT CLOSED** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

---

## 10. Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.8A (overall)** | **FAIL** |
| Storage Policy Apply | **FAIL** |
| Storage Closure Evidence | **FAIL** |
| S+-01 Storage (staging) | **DEFERRED** |
| S+ Staging Evidence | **PARTIAL** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

P5-E.8A resume confirmed **boundlore-staging** / `jzzgoiwfbuwiiyvwgwri` in Dashboard. Apply was executed via SQL Editor with only the deferred storage policy DDL. **Failed** with `must be owner of relation objects` — Dashboard `postgres` role insufficient, matching P5-E.5 Re-run 2. Release gate remains locked. Storage closure **still DEFERRED**.

### Recommended next steps

1. **P5-E.8A.2** — Storage Owner Path + Bucket Scope Review (analysis only) — **PASS**
2. **P5-E.8C** — Upload Path Disablement Review (if MVP defer accepted)
3. **P5-E.8A.4** — Owner-Capable Support/Tooling Investigation
4. **P5-E.8A.3** — `discovery-uploads` bucket provisioning plan (`discovery_storage.sql` — separate gate)
5. **P5-E.8B** — Fixture re-enable after successful apply + negative test

Continue **no push / deploy / launch**.

---

## 11. P5-E.8A.2 Follow-up (PASS — review only)

**Gate:** P5-E.8A.2 — Storage Owner Path + Bucket Scope Review. **PASS**.

| Item | Result |
|------|--------|
| SQL apply / DB access | **None** |
| Dashboard owner path | **REJECTED** — same `42501` as pooler |
| `discovery-uploads` bucket | **Still missing** on staging |
| Storage policy | **Still not applied** |
| Storage Launch-MVP critical? | **No** (while locked + bucket absent) |
| Storage required before unlock? | **Yes** |
| Recommended next | **P5-E.8C** (upload disablement) + **P5-E.8A.4** (owner investigation) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

**Report:** `docs/architecture/p5-storage-owner-path-bucket-scope-review.md`

---

## 12. P5-E.8C Follow-up (PASS — upload disablement)

**Gate:** P5-E.8C — Upload paths disabled/hardened while storage deferred. **PASS**.

| Item | Result |
|------|--------|
| Frontend guards | `[x]` release-gate-client `p5-e8c` |
| Storage policy apply | **Still NO** |
| Upload paths reachable? | **No** (UI + JS fail-closed) |
| SQL apply / DB access | **None** |
| P5-E.8C | **PASS** |

**Report:** `docs/architecture/p5-upload-path-disablement-review.md`

---

*Document version: P5-E.8A initial BLOCKED + resume FAIL + P5-E.8A.2 PASS + P5-E.8C PASS. No secrets.*
