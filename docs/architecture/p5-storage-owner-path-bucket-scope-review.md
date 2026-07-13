# P5-E.8A.2 Storage Owner Path + Bucket Scope Review

**Gate:** P5-E.8A.2 — Storage Owner Path + Bucket Scope Review (analysis/documentation only)  
**Date:** 2026-07-13  
**HEAD:** `affeaa0` — Document storage policy owner apply resume blockers  
**Verdict:** **PASS** — review gate complete; storage remains **DEFERRED**

---

## 1. Scope / Approval

| Constraint | Status |
|------------|--------|
| User approval for P5-E.8A.2 | **YES** — review/documentation only |
| No SQL apply | **YES** |
| No DB write / DB access | **YES** |
| No Dashboard / MCP / psql apply | **YES** |
| No push / deploy / launch | **YES** |
| No secrets in report | **YES** |

---

## 2. Starting Point

| Item | Status |
|------|--------|
| HEAD | `affeaa0` |
| P5-E.8A initial | **BLOCKED** — Dashboard sign-in |
| P5-E.8A resume | **FAIL** — `42501: must be owner of relation objects` |
| Dashboard project | **boundlore-staging** / `jzzgoiwfbuwiiyvwgwri` (confirmed) |
| `release_gate_storage_policy_deferred.sql` | **Not applied** |
| Storage policy on staging | **Does not exist** |
| `discovery-uploads` bucket on staging | **Missing** |
| `release_gate` after attempts | **Still locked** (`contribution_locked=true`) |
| `bl_is_release_unlocked()` | **false** |

### What the P5-E.8A error means

PostgreSQL error `42501: must be owner of relation objects` indicates the executing role (`postgres` in Dashboard SQL Editor) lacks **ownership** of `storage.objects`. On Supabase managed projects, `storage.objects` is typically owned by an internal storage admin role (e.g. `supabase_storage_admin`), not the session `postgres` role used in SQL Editor or pooler connections.

**Implication:** Both previously assumed "owner-capable" paths failed:

| Path | Result |
|------|--------|
| psql session pooler `postgres` | **FAIL** (P5-E.5 Re-run 2) |
| Dashboard SQL Editor `postgres` | **FAIL** (P5-E.8A resume) |

P5-E.8 planning assumption that Dashboard SQL Editor would suffice is **disproven** for this staging project.

---

## 3. Storage Usage Static Review

### Files searched

| Area | Files / patterns |
|------|------------------|
| SQL | `discovery_storage.sql`, `release_gate_storage_policy_deferred.sql`, `release_gate_lock.sql` |
| JS | `create-post.js`, `support.js`, `discovery-core.js`, `guilds-apply.js` |
| Repo grep | `discovery-uploads`, `storage.from`, `upload(`, `report-screenshots`, `getPublicUrl` |

### App paths using Supabase Storage

| File | Bucket | Purpose | Launch-critical? |
|------|--------|---------|------------------|
| `js/create-post.js` | `discovery-uploads` | Discovery/evidence file attachments on create-post | **No** — optional per post type; discovery type may require images |
| `js/support.js` | `report-screenshots` | Optional screenshot on bug/support reports | **No** — support flow only |

### Files with no Storage usage

| File | Finding |
|------|---------|
| `js/discovery-core.js` | No `storage.from`, no upload |
| `js/guilds-apply.js` | No storage references |

### Create-post upload flow

1. `applyReleaseGateOnPageCP()` — disables form when release gate locked (client UX)
2. `assertReleaseGateCanSubmitCP()` — blocks submit before upload when locked
3. `uploadDiscoveryFiles()` — uploads to `discovery-uploads` only after gate checks pass
4. If bucket missing → returns error: *"Upload bucket missing. Please create a public Supabase Storage bucket named discovery-uploads."*

### Core wiki without Storage

| Function | Requires Storage? |
|----------|-------------------|
| Homepage / browse / search | **No** |
| Post detail (read) | **No** — reads `posts` content; may display existing image URLs |
| Create-post (locked) | **No effective upload** — release gate blocks submit client-side |
| Observation RPC | **No** — posts INSERT only |
| Direct posts RLS | **No** — table `posts`, not storage |
| Admin read | **No** |

### Findings

| Question | Answer |
|----------|--------|
| Is Storage required for normal read/browse/search? | **No** |
| Is Storage required for release-lock core (posts/RPC)? | **No** — proven on staging |
| Is Storage used only for Discovery attachments + support screenshots? | **Yes** |
| Can uploads be deferred for Launch MVP? | **Yes**, while release gate keeps create-post locked **and** bucket is absent |
| Does missing `discovery-uploads` block core wiki read paths? | **No** |
| Does missing bucket block create-post today? | Upload step fails gracefully; form already locked by release gate |

**Conclusion:** Storage is an **optional/deferred feature path**, not a core read-path dependency. It becomes **mandatory before unlocking user content submission with working discovery uploads**, but not for locked-state Launch MVP.

---

## 4. Bucket Scope Review

### Expected bucket: `discovery-uploads`

**Source:** `supabase/discovery_storage.sql`

| Item | Detail |
|------|--------|
| Bucket ID / name | `discovery-uploads` |
| Public | `true` |
| File size limit | 20 MB |
| Allowed MIME | jpeg, png, webp, pdf, zip, plain text |
| Insert policy | `discovery_upload_authenticated` — authenticated, path prefix `<uid>/...` |
| Read policy | `discovery_read_public` — anon + authenticated |
| Update/delete | Own-folder only |

### Relationship to release gate policy

| File | Role |
|------|------|
| `discovery_storage.sql` | Creates bucket + base RLS policies |
| `release_gate_storage_policy_deferred.sql` | Adds **restrictive** INSERT policy `storage_discovery_uploads_release_gate_insert_restrictive` — blocks `discovery-uploads` INSERT when `bl_can_create_user_content()` is false |

**Order of operations (when eventually applied):**

1. `discovery_storage.sql` — bucket + base policies (separate gate)
2. `release_gate_storage_policy_deferred.sql` — release-gate restrictive policy (owner-capable gate)

### Staging state

| Item | Status |
|------|--------|
| `discovery-uploads` bucket | **Missing** on staging |
| Base policies from `discovery_storage.sql` | **Not present** |
| Release-gate restrictive policy | **Not present** |

### `discovery_storage.sql` safety assessment (static)

| Check | Result |
|-------|--------|
| Idempotent bucket insert | **YES** — `ON CONFLICT DO UPDATE` |
| Creates `storage.objects` policies | **YES** — same owner requirement risk |
| Data writes beyond bucket config | **No test data** |
| TRUNCATE / destructive | **Absent** |
| Separate review gate recommended | **YES** — P5-E.8A.3 Bucket Provisioning Plan before any apply |

**Note:** `discovery_storage.sql` header says "Run in Supabase SQL Editor as an owner role" — likely **same owner error** on `storage.objects` and possibly `storage.buckets` without elevated role.

### Second bucket: `report-screenshots`

| Item | Status |
|------|--------|
| Used by | `js/support.js` |
| SQL in repo | **None** — documented NOT TESTED in `release_gate_lock.sql` |
| Release gate policy | **Not planned** in deferred file |

---

## 5. Owner-Capable Path Review

| Path | Evidence | Feasibility | Risk | Verdict |
|------|----------|-------------|------|---------|
| **A) psql Session Pooler** | P5-E.5 Re-run 2: `must be owner of relation objects` | **Not feasible** | False progress | **REJECTED** |
| **B) Supabase Dashboard SQL Editor (`postgres`)** | P5-E.8A resume: same owner error | **Not feasible** (proven) | Assumed safe path was wrong | **REJECTED** |
| **C) Supabase CLI linked to staging** | Not established in repo; no owner proof | **Unknown** | Wrong project link | **DEFERRED** — needs P5-E.8A.4 tooling investigation |
| **D) Supabase Support / official owner route** | No documented successful apply yet | **Possible** | External dependency, timeline | **OPEN** — investigate which role owns `storage.objects` and official policy DDL path |
| **E) Defer uploads + disable/harden UI** | Release gate already blocks create-post; bucket missing fails upload | **Feasible now** | Must verify no bypass when unlocked later | **VIABLE** for MVP — needs P5-E.8C review |

### Key learning

**Dashboard SQL Editor is not owner-capable for `storage.objects` on staging `jzzgoiwfbuwiiyvwgwri`.** P5-E.8 closure plan §5 recommendation must be revised.

---

## 6. Decision Tree

### Option 1 — Storage must close before Product Activation

**When to choose:** Product requires discovery uploads at activation/unlock time.

| Required gates | |
|----------------|--|
| P5-E.8A.4 | Owner-capable path investigation (Support / storage admin role / official docs) |
| P5-E.8A.3 | Bucket provisioning plan + apply (`discovery_storage.sql`) |
| P5-E.8A.5 | Storage policy apply retry (deferred SQL) via proven owner path |
| P5-E.8A.6 | Negative upload test |
| P5-E.8B | Fixture re-enablement |

**Product-Activation:** Remains **FAIL** until all above PASS.

---

### Option 2 — Storage uploads not Launch MVP

**When to choose:** Launch is read-only / locked-state wiki; no user uploads until post-launch.

| Required gates | |
|----------------|--|
| P5-E.8C | Upload Path Disablement Review — verify create-post/support upload UI unreachable or fails closed when locked |
| Docs | Accept S+-01 Storage as **explicitly out-of-scope** for activation |
| Future | Storage closure gate after unlock decision |

**Product-Activation:** May progress on other axes but only if upload paths provably unreachable — **not automatic PASS**.

---

### Option 3 — Hybrid (recommended)

**When to choose:** Keep storage technically deferred; accept locked-state MVP; plan closure before unlock.

| Now | Before unlock | Before full S+-01 PASS |
|-----|---------------|------------------------|
| Storage DEFERRED documented | P5-E.8C upload path review | P5-E.8A.4 owner path + P5-E.8A.3 bucket + policy apply |

| Acceptance | |
|------------|--|
| S+-01 Core (posts + RPC) | **PASS** on staging |
| S+-01 Storage | **DEFERRED** — accepted for locked MVP |
| S+ Staging Evidence | **PARTIAL** with documented defer |
| Upload UI | Must not be bypassable when locked (P5-E.8C verifies) |

---

### Recommendation

**Option 3 (Hybrid)** with next gates:

1. **P5-E.8C** — Upload Path Disablement Review (highest priority, no DB apply)
2. **P5-E.8A.4** — Owner-Capable Support/Tooling Investigation (parallel, for future unlock)
3. **P5-E.8A.3** — Bucket Provisioning Plan (only after owner path known)

**Rationale:**

- P5-E.8A proved Dashboard is not owner-capable; further blind apply attempts are wasteful
- Core release-lock evidence (direct posts, RPC) already **PASS** without storage
- Staging lacks bucket anyway — uploads cannot succeed regardless of policy
- Create-post is **client-locked** by release gate; storage is not on read-path critical chain
- Full S+-01 storage closure remains required **before unlocking user submissions with discovery uploads**, not before locked-state documentation/activation review

---

## 7. Recommended Next Gate

| Priority | Gate | Purpose |
|----------|------|---------|
| **1** | **P5-E.8C** — Upload Path Disablement Review | Verify no upload bypass while locked; document MVP defer acceptance |
| **2** | **P5-E.8A.4** — Owner-Capable Support/Tooling Investigation | Find official Supabase path for `storage.objects` policy DDL |
| **3** | **P5-E.8A.3** — Bucket Provisioning Plan | Plan `discovery_storage.sql` apply (separate from policy) |

Continue **no push / deploy / launch**.

---

## 8. Impact on S+ Status

| Finding | Staging status |
|---------|----------------|
| S+-01 Direct posts release lock | **PASS** |
| S+-01 Observation RPC release lock | **PASS** |
| S+-01 Storage upload lock | **DEFERRED** |
| S+-01 Core (without storage) | **PASS** with storage explicitly deferred |
| S+-02 Notification | **PASS** |
| S+-03 Sanitization runtime | **PARTIAL** |
| S+-04 Observation RPC | **PASS** |
| **S+ Staging Evidence** | **PARTIAL** — unless Option 2/3 defer formally accepted |
| Production Closure | **NOT CLOSED** |

---

## 9. Impact on Product Activation

**Product-Activation-Ready: FAIL** (unchanged)

| Blocker | Status |
|---------|--------|
| Storage unresolved / defer not yet accepted via P5-E.8C | Open |
| S+-03 runtime/production | Open |
| Production closure | Open |
| S-level blockers (SEO CSR, S-06, backup, monitoring) | Open |

Storage defer alone does not unblock Product Activation; it allows **locked MVP** positioning while other gates proceed.

---

## 10. Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.8A.2 (this review)** | **PASS** |
| Storage Closure | **DEFERRED** |
| Bucket Provisioning | **OPEN** |
| Owner-Capable Path | **OPEN** (Dashboard disproven) |
| Storage Launch-MVP critical? | **No** (while locked + bucket absent) |
| Storage required before unlock? | **Yes** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

**Next:** P5-E.8A.4 Owner-Capable Investigation. No push/deploy/launch.

---

## 11. P5-E.8C Follow-up (PASS — upload disablement)

**Gate:** P5-E.8C — Upload Path Disablement Review + Frontend Hardening. **PASS**.

| Item | Result |
|------|--------|
| Upload paths hardened | `[x]` create-post + support |
| Storage calls while deferred | **Blocked** (UI + JS) |
| `initCreatePermissions` restored | `[x]` create-post init fix |
| Upload fixture | **24/24 PASS** |
| SQL apply / DB access | **None** |
| Storage Closure (DB) | **DEFERRED** |
| P5-E.8C | **PASS** |

**Report:** `docs/architecture/p5-upload-path-disablement-review.md`

---

*Document version: P5-E.8A.2 PASS + P5-E.8C PASS. No secrets. No DB access.*
