# P5-E Server-side Release Lock Plan

**Version:** P5-E.4 acceptance sweep  
**Status:** **Baseline accepted** at repo level — **not production-closed**, Live-RLS/Live-RPC NOT TESTED  
**Finding:** S+-01 — Kein serverseitiger, fail-closed Pre-Release-Content-Lock  
**HEAD reference:** `49097cc` (pre P5-E.2); post-gate commit pending

---

## 1. Status und Scope

| Dimension | Verdict |
|-----------|---------|
| P5-E.1 gate type | **Docs-only planning** |
| S+-01 status | **Open** — not implemented, not baseline-accepted, not production-closed |
| Code/SQL changes in P5-E.1 | **None** |
| SQL execution / DB migration | **None** |
| Supabase data changes | **None** |
| Push / Deploy / Launch | **Forbidden** |
| Foundation-Ready | PASS |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

**Goal:** Define a verifiable architecture and implementation plan for P5-E.2 (DB/RLS/RPC), P5-E.3 (Frontend/Admin UX), and P5-E.4 (acceptance sweep), plus optional P5-E.5 (staging DB application).

Light No Fire is **not released**. Until an admin performs a deliberate, audited unlock, **all normal user content creation** (posts, edits, uploads, reactions, comments, reports) must be blocked **server-side** with fail-closed semantics.

---

## 2. Problem Statement

### Current state (repo evidence)

| Component | Location | Gap |
|-----------|----------|-----|
| Patch / Maintenance Mode | `supabase/wiki_patch_mode.sql`, `js/patch-mode.js` | **Maintenance UX only** — `enabled` defaults `false`; no write-blocking RLS |
| Client enforcement | `js/patch-mode.js` `enforce()`, `assertCanSubmit()` | **Client-only** — bypassable via direct Supabase API |
| Fail-open behavior | `patch-mode.js` `fetchState()` fallback | On DB error or missing row → `enabled: false` → **submissions allowed** |
| Submit guard coverage | `js/create-post.js` | `WikiPatchMode.assertCanSubmit()` called before submit; **`edit-post.js` has no patch guard** |
| Script loading | `js/supabase-config.js` | Injects `patch-mode.js` on pages loading supabase-config; **not a server gate** |
| Posts INSERT RLS | `supabase/fix_tutorial_ack_rls.sql` | Tutorial-ack or admin only — **no release lock** |
| Observation RPC | `supabase/phase_a_observations_foundation.sql` | P5-C ack gate present; **P5-E hook comment only** (lines 402–405) |
| Discovery storage | `supabase/discovery_storage.sql` | Authenticated upload to `discovery-uploads` — **no lock check** |
| Sync RPC | `supabase/sprint1_sync_rpc.sql` | `rpc_sync_discovery_submission` — **admin-only** (`v_is_admin` check) |
| Reactions | `supabase/post_reactions_policies.sql` | `post_reactions_insert_own` — **no lock** |
| Comments / Reports RLS | Repo | Tables referenced in `account_self_delete.sql`, `pre_release_reset_dry_run.sql` — **no INSERT policies in repo** → NOT TESTED |
| Report screenshots | `js/support.js` | Uploads to `report-screenshots` bucket — **bucket policy not in repo** → NOT TESTED |
| Central release state | — | **No `release_gate` table or equivalent** |

### Why Patch Mode is insufficient

- Designed for **maintenance windows**, not pre-release content lock.
- **Default OFF** (`wiki_patch_mode.enabled default false`).
- **Fail-open** when config unavailable.
- Does not block **direct Data API**, **Storage API**, or **RPC** writes.
- Admin bypass is client-side role check only.
- Does not produce **audit trail** for unlock/re-lock decisions.

### Required target

Until Light No Fire release and explicit admin unlock:

- **Default LOCKED** for user-generated content writes.
- **Missing config = LOCKED**.
- **DB read error = LOCKED**.
- Read-only browsing (published posts, search, browse) remains allowed.
- Existing pending/drafts **unchanged** — no auto-approve, no auto-publish on unlock.

---

## 3. Release Lock Grundprinzipien

| # | Principle | Rule |
|---|-----------|------|
| 1 | Default LOCKED | Fresh deploy and missing `release_gate` row → contributions blocked |
| 2 | Missing config = LOCKED | No row, corrupt row, or unreadable state → treat as locked |
| 3 | DB error = LOCKED | Helper functions must not fail-open |
| 4 | Unknown role = LOCKED | Unauthenticated or unrecognized role → no content writes |
| 5 | Stale session = LOCKED | JWT/session alone does not bypass; server re-validates on each write |
| 6 | Client is advisory | UI may explain lock; **RLS/RPC/Storage is enforcement** |
| 7 | Admin unlock manual only | Requires authenticated admin, reason, confirm step, audit row |
| 8 | Re-lock anytime | Admin can re-lock immediately; takes effect on next write attempt |
| 9 | Pending unchanged | Unlock does **not** approve, publish, or mutate existing `pending` posts |
| 10 | No auto-publish | No cron, no time-based unlock, no `enforced_until` auto-flip without explicit job (defer auto-expiry to later if needed) |
| 11 | Read-only browsing | SELECT on published content remains for anon/authenticated |
| 12 | Admin moderation separate | Admin repair/danger-zone/queue actions are **not** unlocked by user contribution unlock |
| 13 | No hidden bypass | No URL flags, no `localStorage` bypass, no `?unlock=1` |
| 14 | No client service_role | `service_role` never in browser bundles |
| 15 | Patch Mode coexists | `wiki_patch_mode` remains maintenance overlay; release lock is orthogonal and stricter for writes |

---

## 4. Vorgeschlagene Datenstruktur (plan only — do not implement in P5-E.1)

### `public.release_gate` (singleton)

```sql
-- PLANNED — NOT TO BE CREATED IN P5-E.1
-- id smallint primary key default 1 check (id = 1)
-- contribution_locked boolean not null default true
-- reason text
-- updated_by uuid references auth.users(id)
-- updated_at timestamptz not null default now()
-- created_at timestamptz not null default now()
-- lock_version integer not null default 1
-- enforced_until timestamptz nullable  -- optional; manual clear only in v1
```

**Semantics:**

| State | `contribution_locked` | Row exists | Effective |
|-------|----------------------|------------|-----------|
| Pre-release default | `true` | yes | LOCKED |
| Admin unlock | `false` | yes | UNLOCKED (user writes allowed per role matrix) |
| Missing row | — | no | **LOCKED** (fail-closed) |
| Read error | — | error | **LOCKED** (fail-closed) |

### Optional: `public.release_gate_audit`

| Field | Purpose |
|-------|---------|
| `id uuid` | PK |
| `actor_id uuid` | Admin who changed lock |
| `action text` | `unlock` / `relock` / `update_reason` / `read_failure` |
| `old_locked boolean` | Previous state |
| `new_locked boolean` | New state |
| `reason text` | Required on unlock |
| `created_at timestamptz` | Audit timestamp |
| `request_context jsonb` | Optional IP/user-agent hash (no PII dump) |

**P5-E.1:** No migration file, no SQL execution.

---

## 5. Helper- / Policy-Architektur (plan only)

### `public.bl_is_admin()` 

- **Repo status:** Not found as standalone function; admin checks are inline (`profiles.role = 'admin'`) in policies and RPCs.
- **P5-E.2 plan:** Introduce `bl_is_admin()` as `STABLE SECURITY DEFINER` with `SET search_path = public`, or document reuse pattern from existing RPCs.
- Must return `false` on null `auth.uid()`, missing profile, or DB error.

### `public.bl_is_release_unlocked_for_actor()`

Returns `boolean`. **Fail-closed:**

```text
false if:
  - release_gate row missing
  - contribution_locked = true
  - SELECT raises exception
  - auth.uid() is null (for actor-scoped checks)
true only if:
  - row exists AND contribution_locked = false
```

Admin **contribution** unlock affects normal users. Admin **moderation** paths may use separate `bl_is_admin()` without requiring unlock — document per write path.

### `public.bl_can_create_user_content()`

Returns `true` only when **all** hold:

1. `auth.uid()` not null  
2. `bl_is_release_unlocked_for_actor()` = true  
3. Tutorial ack present (`user_submission_acks`) **or** path exempt (e.g. ack insert itself)  
4. Not banned (future)  
5. Role permitted per matrix below  

### `public.bl_assert_can_create_user_content()`

Raises SQLSTATE `42501` with clear message when locked, unauthenticated, or missing ack.

**Constraints for P5-E.2:**

- No fail-open `COALESCE(..., true)`
- `SECURITY DEFINER` only where unavoidable; always `SET search_path = public`
- No dynamic SQL
- No client-supplied lock override parameters

---

## 6. Enforcement-Matrix

| Write-Pfad | Aktueller Typ | Risiko | Geplantes Enforcement | Gate | Test |
|------------|---------------|--------|----------------------|------|------|
| **A) posts INSERT** — create-post UI | Client + RLS (`posts_insert_requires_tutorial_ack`) | HIGH — direct API bypasses UI | Restrictive RLS `WITH CHECK (bl_can_create_user_content())` | P5-E.2 | RLS negative: locked blocks insert |
| **A) posts INSERT** — contribution mode | Same | HIGH | Same RLS | P5-E.2 | Contribution submit blocked when locked |
| **A) posts INSERT** — guild apply (`guilds-apply.js`) | RLS | HIGH | Same RLS | P5-E.2 | Guild post insert blocked |
| **A) posts INSERT** — placeholder/quick-add stubs | `create-post.js` insert | MEDIUM | Same RLS | P5-E.2 | Stub insert blocked |
| **B) posts UPDATE** — edit-post | RLS (`posts_update_own_or_admin`) | HIGH | Add restrictive policy: non-admin updates require unlock; admin updates allowed for moderation | P5-E.2 | User edit blocked when locked; admin edit allowed |
| **C) bl_register_observation** | SECURITY DEFINER RPC | HIGH — bypasses posts RLS | `bl_assert_can_create_user_content()` before any INSERT (after P5-C ack gate) | P5-E.2 | RPC raises 42501 when locked |
| **D) rpc_sync_discovery_submission** | SECURITY DEFINER, admin-only | LOW for normal users | Keep admin-only; **no user unlock path**; document that admin sync does not auto-publish pending without explicit approve action | P5-E.2 review | Non-admin RPC call rejected (existing) |
| **E) Storage discovery-uploads** | `discovery_storage.sql` INSERT policy | HIGH | Extend policy: `bl_can_create_user_content()` on INSERT | P5-E.2 | Upload blocked when locked |
| **F) Storage report-screenshots** | `js/support.js` — bucket not in repo | UNKNOWN | Plan policy draft in P5-E.2; mark NOT TESTED until bucket export | P5-E.2 / P5-E.5 | Upload blocked when locked |
| **G) comments INSERT** | `post-detail.js` → `comments` | HIGH — no RLS in repo | Restrictive RLS when table exists; block when locked | P5-E.2 | Comment insert blocked — NOT TESTED until policy export |
| **H) post_reactions INSERT/UPDATE** | `post-detail.js`, `post_reactions_policies.sql` | MEDIUM | Restrictive policy referencing lock helper | P5-E.2 | Reaction blocked when locked |
| **I) reports INSERT** | `support.js` | MEDIUM | **Default: block** until release (user-generated content); revisit in open questions | P5-E.2 | Report blocked when locked |
| **J) notifications INSERT** | P5-B `notifications_insert_authenticated` | LOW for release lock | **Out of scope** for contribution lock — P5-B injection guard separate; cross-user admin notifications via future RPC | — | No regression on P5-B fixture |
| **K) user_submission_acks INSERT** | `tutorial-ack.js` | LOW | **Allow** when locked — ack is prerequisite, not published content | P5-E.2 | Ack insert allowed while locked |
| **L) admin unlock/re-lock** | New admin UI + RPC or direct update | CRITICAL | Admin-only UPDATE on `release_gate`; audit row required | P5-E.2 + P5-E.3 | Unlock/relock audited |
| **M) admin_actions log** | `wiki/admin/index.html` | — | Extend for unlock/relock events | P5-E.3 | Audit visible |
| **N) support/contact uploads** | `support.js` storage + reports | MEDIUM | Block uploads + report insert when locked (aligned with I) | P5-E.2 + P5-E.3 | Support form shows locked state |
| **O) wiki_observations INSERT** | Via `bl_register_observation` only | HIGH | Covered by RPC gate (C) | P5-E.2 | Same as C |

---

## 7. Rollenmatrix (pre-release default = LOCKED)

| Rolle | Read browsing | Create post | Upload evidence | Comment | React/rate | Report | Admin unlock | Moderation (queue/repair) |
|-------|---------------|-------------|-----------------|---------|------------|--------|--------------|---------------------------|
| **anon** | ✓ published | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **authenticated user** | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **trusted user** (reserved) | ✓ | ✗ (unless explicitly granted post-unlock) | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| **moderator** (reserved) | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | TBD — default ✗ until role defined |
| **admin** | ✓ | ✗ until unlock* | ✗ until unlock* | ✗ until unlock* | ✗ until unlock* | ✗ until unlock* | ✓ unlock/relock | ✓ queue/repair (separate from user unlock) |
| **service_role** | server only | server only | server only | — | — | — | — | never in client |

\* **Admin as content author:** Admins follow same contribution lock for **user-submission** paths unless a separate documented moderation exception is required. Admin **moderation** (approve, repair, danger-zone) remains available without opening public submissions.

**After admin unlock (`contribution_locked = false`):**

| Rolle | Create post | Upload | Comment | React | Report |
|-------|-------------|--------|---------|-------|--------|
| authenticated + ack | ✓ | ✓ | ✓ | ✓ | ✓ (if policies exist) |
| anon | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 8. UI- / UX-Plan für P5-E.3

### Affected files (planned)

| File | Change |
|------|--------|
| `js/patch-mode.js` | Align with release lock or split: maintenance vs contribution lock; **remove fail-open** for contribution checks |
| `js/create-post.js` | Pre-release banner; disable submit; call server-side check before insert; handle 42501 |
| `js/edit-post.js` | Add lock guard (currently **missing**); disable save when locked |
| `js/support.js` | Disable report submit + upload when locked |
| `js/post-detail.js` | Disable comment/reaction forms when locked |
| `js/discovery-core.js` | Surface RPC lock errors from `bl_register_observation` |
| `wiki/create-post/index.html` | Pre-release messaging; no misleading CTAs |
| `wiki/edit-post/index.html` | Locked-state messaging |
| `wiki/admin/index.html` | Lock status panel; unlock/re-lock with reason + confirm |
| `js/auth-nav.js` / nav CTAs | Optional: dim "+ New Post" when locked |
| `js/supabase-config.js` | Load unified guard module after P5-E.3 design |

### UX requirements

- Clear message: *"BoundLore is in pre-release. User submissions are closed until Light No Fire launches and an admin unlocks contributions."*
- Submit buttons **disabled** with explanation (not merely hidden).
- Admin sees: current lock state, `reason`, `updated_at`, `updated_by`, lock version.
- Unlock requires: reason (min length), confirm dialog, audit log entry.
- Re-lock: one-click with confirm (reason optional for re-lock or use fixed "Re-locked for pre-release").
- Existing pending posts: show unchanged status; no "auto-approved" messaging.
- No localhost/QA bypass flags in production bundle.
- Read-only pages load without maintenance overlay when only contribution lock is active (distinction from `wiki_patch_mode` full maintenance).

---

## 9. Teststrategie

### P5-E.2 — Static SQL / repo tests

| Test | Expected |
|------|----------|
| `release_gate` table defined in SQL file | Present, default `contribution_locked = true` |
| Singleton CHECK `id = 1` | Present |
| `bl_is_release_unlocked_for_actor()` fail-closed | Missing row → false |
| `bl_can_create_user_content()` | Combines auth + ack + unlock |
| `posts` restrictive INSERT policy | References lock helper |
| `posts` UPDATE policy for non-admin | References lock helper |
| `bl_register_observation` | Lock check before writes |
| `discovery_upload_authenticated` | Lock check on INSERT |
| `post_reactions` INSERT | Lock check |
| No `service_role` in `js/` | Grep clean |
| QA static fixture | `qa/p5-release-lock-security-fixtures.html` (new in P5-E.2) |

### P5-E.3 — UI tests

| Test | Expected |
|------|----------|
| create-post locked message | Submit disabled |
| edit-post locked message | Save disabled |
| support locked | No upload/submit |
| post-detail | Comment/reaction disabled |
| admin lock panel | Status visible to admin |
| admin unlock | Reason required; audit logged |
| re-lock | Immediate effect |
| no auto-publish pending | Pending count unchanged after unlock |

### P5-E.4 — Acceptance sweep (local baseline)

- P5-B notification fixture 24/24 PASS  
- P5-C observation fixture 17/17 PASS  
- P5-D sanitization fixture 45/45 PASS  
- Standard regression: homepage, browse, search, post detail, admin anon  
- Direct API negative tests: **documented**; live execution only P5-E.5 with approval  

### P5-E.5 — Staging (optional, explicit approval)

- Apply SQL to isolated/staging project  
- Negative: anon insert, auth insert locked, missing row, RPC locked, storage locked  
- Positive: admin unlock → acked user can insert  
- Re-lock → inserts blocked again  
- Rollback script tested  

---

## 10. Gate-Aufteilung

| Gate | Type | Deliverables |
|------|------|--------------|
| **P5-E.1** | Docs-only | This plan; docs updates; **current gate** |
| **P5-E.2** | SQL baseline (not executed) | `supabase/release_gate.sql`; helpers; RLS/storage/RPC patches; static QA fixture |
| **P5-E.3** | Code baseline | UI guards; admin lock panel; patch-mode alignment |
| **P5-E.4** | Acceptance sweep | Local baseline acceptance; fixtures green; no production closure |
| **P5-E.5** | Staging (optional) | SQL apply + negative RLS/RPC/storage tests; operator approval required |
| **P5-F.1** | Combined S+ retest | After P5-E.4; B/C/D/E fixtures + regression |
| **P5-F.2** | Fable handoff | External retest package |

---

## 11. Acceptance Criteria für S+-01

### Repo baseline accepted (after P5-E.2 + P5-E.3 + P5-E.4)

- [ ] `release_gate` architecture implemented in repo SQL  
- [ ] Fail-closed helpers exist (`bl_is_release_unlocked_for_actor`, `bl_can_create_user_content`)  
- [ ] All matrix write paths have planned enforcement **implemented in files**  
- [ ] UI guardrails on create/edit/support/post-detail  
- [ ] Admin unlock/re-lock with audit  
- [ ] QA fixtures pass locally  
- [ ] P5-B/C/D fixtures remain green  
- [ ] No known user write path lacks enforcement in repo SQL or documented NOT TESTED with stop condition  

### Staging accepted (P5-E.5)

- [ ] Locked config blocks normal user writes (API + UI)  
- [ ] Missing `release_gate` row blocks writes  
- [ ] Direct Supabase client cannot bypass  
- [ ] RPC `bl_register_observation` blocked when locked  
- [ ] Storage upload blocked when locked  
- [ ] Admin unlock works with audit trail  
- [ ] Re-lock works  
- [ ] No auto-publish of existing pending  
- [ ] Rollback documented and tested  

### Production-closed (explicit gate — not P5-E.4)

- [ ] Staging negative tests documented and passed  
- [ ] Live policy application consciously approved (LAUNCH-0)  
- [x] P5-F.1 combined retest complete  
- [ ] Fable Retest 1 confirms  

**P5-E.1:** None of the above checkboxes are satisfied — planning only.

---

## 12. Stop Conditions

Stop and escalate if:

1. Base RLS for `comments` / `reports` cannot be confirmed — remain **NOT TESTED** until live export  
2. A write path cannot be identified in inventory — block P5-E.2 until mapped  
3. Proposed helper would fail-open on NULL/missing row  
4. Missing config cannot be treated as LOCKED  
5. Admin bypass is broad (any admin write skips all checks without audit)  
6. UI-only lock without server backing is proposed as "done"  
7. SQL application requested during P5-E.1 — **refuse**  
8. Production deploy requested during P5-E — **refuse**  
9. `service_role` key appears in client code  
10. Unlock would auto-approve pending queue items  
11. Pending `add_recipe` conflict touched as part of release-lock work  

---

## 13. Rollback / Recovery Plan

| Scenario | Action |
|----------|--------|
| P5-E.2 SQL bad | Revert SQL commit; do not apply to live DB |
| P5-E.3 UI regression | Revert JS/HTML commit independently |
| Emergency re-lock | `UPDATE release_gate SET contribution_locked = true` (staging/prod) |
| Failed unlock experiment | Re-lock + audit `relock` row |
| Data safety | No DELETE of posts/comments; pending unchanged |
| Migration down notes | Include in `release_gate.sql` header (P5-E.2) |
| Audit preservation | Never truncate `release_gate_audit` in rollback |

**Primary recovery:** Re-lock immediately. Revert code/SQL commits per gate.

---

## 14. Known Open Questions

| # | Question | Default / notes |
|---|----------|-----------------|
| 1 | Are `comments` / `reports` RLS policies only in live DB? | Repo has table references but no INSERT policies — **NOT TESTED** |
| 2 | `report-screenshots` bucket policies absent from repo? | `support.js` uploads; policy export needed |
| 3 | Does support/contact upload count as pre-release content? | **Plan: yes — block** until unlock |
| 4 | Should trusted/moderator roles have pre-release write? | **Default: no** until roles defined in `profiles` |
| 5 | Admin unlock MFA / re-auth? | **v1: role check only**; MFA deferred |
| 6 | Which environment gets first DB application? | Staging/isolated project; not production in P5-E.2 |
| 7 | PITR/backup before DB gate? | Required before P5-E.5; verify per `PRE_RELEASE_RESET_README.md` |
| 8 | Patch Mode after release lock? | Keep for maintenance; contribution lock is separate column/state |
| 9 | Should `user_submission_acks` INSERT stay allowed while locked? | **Yes** — users can complete tutorial before launch |
| 10 | Admin compose-from-discovery in `wiki/admin/index.html`? | Moderation path — allowed without public unlock; must not auto-publish pending discoveries without explicit approve |
| 11 | `guilds-apply.js` post insert? | Covered by posts INSERT RLS |
| 12 | Time-based `enforced_until` auto-unlock? | **Defer** — manual unlock only in v1 |

---

## 15. Repo Write-Path Inventory (P5-E.1 analysis)

### Frontend submit surfaces

| Surface | File | Server target | Client guard today |
|---------|------|---------------|-------------------|
| Post create | `js/create-post.js` | `posts` INSERT/UPDATE | `WikiPatchMode.assertCanSubmit()` (patch only) |
| Post edit | `js/edit-post.js` | `posts` UPDATE | **None** |
| Comments | `js/post-detail.js` | `comments` INSERT | **None** |
| Reactions | `js/post-detail.js` | `post_reactions` INSERT/UPDATE | **None** |
| Reports | `js/support.js` | `reports` INSERT + storage | **None** |
| Observation | `js/discovery-core.js` | `bl_register_observation` RPC | P5-C ack (RPC); no release lock |
| Tutorial ack | `js/tutorial-ack.js` | `user_submission_acks` INSERT | N/A — should stay allowed |
| Notifications | `js/notifications.js` | `notifications` INSERT | P5-B own-user only |
| Admin sync | `wiki/admin/index.html` | `rpc_sync_discovery_submission` | Admin session |
| Admin compose | `wiki/admin/index.html` | `posts` INSERT (publish) | Admin session |

### SQL / RPC (repo files)

| Asset | Write enforcement today |
|-------|------------------------|
| `fix_tutorial_ack_rls.sql` | Tutorial ack or admin for posts INSERT |
| `phase_a_observations_foundation.sql` | auth.uid + ack; P5-E hook comment |
| `discovery_storage.sql` | Authenticated path prefix only |
| `post_reactions_policies.sql` | Own user only |
| `admin_dashboard_notifications.sql` | P5-B insert scope |
| `sprint1_sync_rpc.sql` | Admin-only sync |
| `wiki_patch_mode.sql` | No write blocking |

---

## Appendix — Related docs

| Document | Relevance |
|----------|-----------|
| `docs/architecture/p5-splus-remediation-plan.md` | S+-01 summary; gate sequence |
| `docs/architecture/current-code-gap-notes.md` | Gate records §92+ |
| `qa/e2e-content-matrix.md` | P5-E test rows |
| `docs/architecture/moderation-conflict-matrix.md` | Pending conflict untouched |
| `docs/architecture/entity-promotion-policy.md` | No auto-promotion on unlock |
| `supabase/PRE_RELEASE_RESET_README.md` | Reset vs security gate separation |

---

**P5-E.1 verdict:** Release Lock implementation plan **accepted for planning purposes**. S+-01 remains **open**. Next: **P5-E.2 Release Gate DB/RLS/RPC Baseline**. No push/deploy/launch.

---

## 16. P5-E.2 — Release Gate DB/RLS/RPC Baseline (implemented in repo)

**Milestone:** SQL baseline in repo — **not executed**, **not applied to production/staging**, **not baseline-accepted** (P5-E.4).

| Item | Status |
|------|--------|
| `supabase/release_gate_lock.sql` | **Created** — singleton `release_gate`, `release_gate_audit`, RLS, helpers, admin RPC |
| Default locked | `contribution_locked boolean not null default true`; seed row `Pre-release default locked` |
| Missing config = locked | `bl_is_release_unlocked()` — no row / exception → `false` |
| Fail-closed helpers | `bl_is_admin_actor`, `bl_is_release_unlocked`, `bl_can_bypass_release_gate`, `bl_can_create_user_content`, `bl_assert_can_create_user_content` |
| Admin helper | `bl_is_admin_actor` via `profiles.role = 'admin'` (canonical in repo) |
| Admin RPC | `bl_set_release_gate_locked(p_locked, p_reason)` — audit + `lock_version` increment |
| Posts INSERT restrictive | `posts_release_gate_insert_restrictive` — uses `bl_can_create_user_content` |
| Posts UPDATE restrictive | `posts_release_gate_update_restrictive` — user edits blocked; admin bypass via helper |
| `bl_register_observation` | `bl_assert_can_create_user_content('bl_register_observation')` before writes |
| Discovery storage | `storage_discovery_uploads_release_gate_insert_restrictive` — bucket-aware in `release_gate_lock.sql` |
| Post reactions | Restrictive INSERT/UPDATE policies in `release_gate_lock.sql` |
| Comments / reports | **NOT TESTED** — no INSERT policies in repo; live-RLS export required |
| Report-screenshots bucket | **NOT TESTED** — no storage policy in repo |
| `rpc_sync_discovery_submission` | Admin-only (`v_is_admin`); no change; admin bypass documented |
| `discovery_storage.sql` | Unchanged; restrictive policy lives in `release_gate_lock.sql` |
| Patch Mode | Remains maintenance-only client UX — not release lock |
| Frontend/Admin UX lock | **Not in P5-E.2** — P5-E.3 |
| SQL execution / DB migration | **None** |
| QA fixture | `qa/p5-release-lock-db-security-fixtures.html/js` — 34 static checks |
| S+-01 | **DB/RLS/RPC baseline implemented** — not accepted, not production-closed |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

**P5-E.2 verdict:** Release Gate DB/RLS/RPC baseline **implemented in repo SQL**. Ready for P5-E.3 frontend/admin UX baseline and later staged DB application (P5-E.5). S+-01 **not** production-closed. No push/deploy/launch.

---

## 17. P5-E.3 — Release Gate Frontend/Admin UX Baseline (implemented in repo)

**Milestone:** Client UX baseline — **fail-closed when DB table missing**, **not baseline-accepted** (P5-E.4).

| Item | Status |
|------|--------|
| `js/release-gate-client.js` | **Created** — `BoundLoreReleaseGateClient` v `p5-e3` |
| Fail-closed read model | missing client / table / error / invalid row → locked |
| `shouldAllowClientBypass()` | Always `false` — no query/localStorage/localhost bypass |
| `create-post.js` guard | `assertCanSubmitUserContent` + lock notice on load |
| `edit-post.js` guard | Save blocked when locked (all users — client fail-closed) |
| `support.js` guard | Report submit + screenshot upload blocked when locked |
| Admin status panel | `wiki/admin/index.html` — Release Gate panel with status/reason/version |
| Unlock/Re-lock UI | Prepared with reason + confirm; calls `bl_set_release_gate_locked` on explicit click only |
| No auto-publish / queue | Confirm copy documents no pending auto-publish |
| Patch Mode | Remains separate maintenance UX |
| SQL / DB apply | **None** |
| QA UI fixture | `qa/p5-release-lock-ui-fixtures.html/js` — 30 checks |
| S+-01 | **Frontend/Admin UX baseline implemented** — not accepted, not production-closed |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

**P5-E.3 verdict:** Release Gate Frontend/Admin UX baseline **implemented**. Client fail-closed even when `release_gate` table not yet applied. Ready for P5-E.4 acceptance sweep. No push/deploy/launch.

---

## 18. P5-E.4 — Release Gate Acceptance Sweep (baseline accepted)

**Milestone:** P5-E.4 local acceptance sweep — **baseline accepted at repo level**, **not production-closed**, Live-RLS/Live-RPC **NOT TESTED**.

**P5-E.4 acceptance sweep completed locally.** The server-side Release Gate baseline is accepted at repository level. P5-E.2 prepared fail-closed DB/RLS/RPC SQL baseline with `release_gate`, `release_gate_audit`, restrictive posts/storage policies, and `bl_register_observation` release assertion. P5-E.3 prepared fail-closed frontend/admin UX guardrails with `BoundLoreReleaseGateClient`, create/edit/support guards, and admin status/unlock/relock UI that was not executed. SQL was not applied; Live-RLS/Live-RPC remain NOT TESTED. S+-01 is **baseline-accepted** but **not production-closed**. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

| Item | Accepted |
|------|----------|
| P5-E.2 DB/RLS/RPC SQL baseline | `[x]` — repo level; not executed |
| `release_gate` default locked / missing config = locked | `[x]` |
| Fail-closed helpers + restrictive policies | `[x]` |
| `bl_register_observation` release assert before posts INSERT | `[x]` |
| Discovery storage bucket-aware gate | `[x]` |
| comments/reports/report-screenshots NOT TESTED | `[x]` documented |
| P5-E.3 ReleaseGateClient fail-closed UX | `[x]` |
| create-post / edit-post / support guards | `[x]` |
| Admin status panel + unlock/relock UI (not executed) | `[x]` |
| Release Lock UI fixture 30/30 PASS | `[x]` |
| Release Lock DB fixture 34/34 PASS | `[x]` |
| Sanitization 45/45, Observation 17/17, Notification 24/24 | `[x]` |
| Standard regression smoke | `[x]` |
| SQL executed / DB migration | `[x]` — none |
| Unlock/relock executed | `[x]` — none |
| S+-01 baseline accepted | `[x]` |
| S+-01 production-closed | `[ ]` |
| Staged DB apply | `[ ]` — P5-E.5+ with explicit approval |

**P5-E.4 verdict:** S+-01 **baseline accepted** at repository level. **Not production-closed.** Next: **P5-F.1 Combined S+ Security Retest Gate**. No push/deploy/launch.

---

## 19. P5-F.1 — Combined S+ Security Retest (S+-01 re-verified)

**Milestone:** P5-F.1 combined local retest — S+-01 **combined baseline retested** with S+-02/03/04; **not production-closed**.

**P5-F.1 combined retest completed locally.** Release Lock DB fixture 34/34 PASS; Release Lock UI fixture 30/30 PASS. Static grep confirms `release_gate`, fail-closed helpers, restrictive policies, and `shouldAllowClientBypass() === false`. Standard regression smoke PASS. No SQL apply, no unlock/relock executed, no Supabase writes, no push, no deploy.

| Item | Result |
|------|--------|
| S+-01 combined baseline retested | `[x]` |
| Release Lock DB fixture 34/34 | `[x]` |
| Release Lock UI fixture 30/30 | `[x]` |
| All other P5 fixtures green | `[x]` |
| Live-RLS / Live-RPC | `[x]` — NOT TESTED |
| S+-01 production-closed | `[ ]` |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Authoritative combined report:** `docs/architecture/p5-splus-combined-retest.md`

**Next:** **P5-F.2 Fable Retest Handoff Package**. No push/deploy/launch.

---

## 20. P5-E.5 — Staged DB Application (BLOCKED)

**Milestone:** P5-E.5 staging apply + negative RLS/RPC tests — **BLOCKED** (original: no isolated staging; re-run: base schema missing).

| Item | Result |
|------|--------|
| Isolated staging proven | `[x]` — P5-STAGING.2+ |
| BoundLore base schema on staging | `[ ]` — **BLOCKED** (re-run 2026-07-13) |
| SQL apply | `[ ]` — none |
| Negative RLS/RPC/storage tests | `[ ]` — NOT RUN |
| Local fixtures regression | `[x]` — 24/24, 17/17, 45/45, 34/34, 30/30 |
| S+-01 production-closed | `[ ]` |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Report:** `docs/architecture/p5-staged-db-application-report.md` (original + Re-run section)

**Next:** P5-STAGING.5 base schema provisioning → P5-E.5 re-attempt. No push/deploy/launch.

---

## 21. P5-E.5 Re-run Follow-up (BLOCKED)

**Date:** 2026-07-13 · **HEAD:** `b3c64e7` · User approval: **YES** (staging only)

Re-run stopped at pre-apply schema check: staging `public` schema empty. Pre-apply backup `p5-e5-rerun-preapply-20260713-185457.sql` (169,075 bytes). Test users confirmed. No SQL applied.

---

## 22. P5-E.5 Re-run 2 Follow-up (BLOCKED — apply ordering)

**Date:** 2026-07-13 · **HEAD:** `1ac4e21` · User approval: **YES**

After P5-STAGING.6 Re-run 3 PASS, apply failed at `release_gate_lock.sql`: policies reference `bl_is_admin_actor()` before function definition. Apply 1 (notifications) committed; release gate not provisioned. Negative tests NOT RUN.

**Report:** `docs/architecture/p5-staged-db-application-rerun-report.md`

---

## 23. P5-E.5A Follow-up (PASS — local dependency reorder)

**Gate:** P5-E.5A — `bl_is_admin_actor` before policies in `release_gate_lock.sql`. **PASS** (repo only).

**Report:** `docs/architecture/p5-release-gate-sql-order-fix-report.md`

---

## 24. P5-E.5 Re-run 2 Follow-up (BLOCKED — storage policy owner)

**Gate:** P5-E.5 Re-run 2 — `storage.objects` policy owner error. **BLOCKED**.

| Item | Result |
|------|--------|
| Pre-apply backup | `[x]` 271,992 bytes |
| Profiles A/B | `[x]` |
| release_gate apply | `[ ]` FAIL |
| Negative tests | `[ ]` NOT RUN |
| P5-E.5 Re-run 2 | **BLOCKED** |

**Report:** `docs/architecture/p5-staged-db-security-retest-rerun2-report.md`

---

## 25. P5-E.5C Follow-up (PASS — storage policy deferred)

**Gate:** P5-E.5C — `storage.objects` policy deferred; `release_gate_lock.sql` can retry without storage owner. **PASS** (repo only).

| Item | Result |
|------|--------|
| Storage DDL removed from default apply | `[x]` |
| Deferred file | `release_gate_storage_policy_deferred.sql` |
| Ready for P5-E.5 Re-run 3 | **YES** (explicit approval) |
| Storage closure | **DEFERRED** |

**Report:** `docs/architecture/p5-storage-policy-defer-fix-report.md`
