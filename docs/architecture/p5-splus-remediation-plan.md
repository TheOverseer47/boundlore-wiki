# P5 S+ Remediation Plan

**Gate:** P5-A.1 — S+ Remediation Planning Gate · **P5-A.2 accepted**  
**Status:** Planning accepted — no implementation, no SQL, no deploy, no push  
**HEAD at planning:** `6c2ce45` — Document P5 S+ remediation plan  
**Audit basis:** Pre-Launch Abnahme-, Sicherheits- und Qualitätsaudit (Fable 5, Juli 2026)

---

## 1. Status and Scope

| Dimension | Verdict | Notes |
|-----------|---------|-------|
| **Foundation-Ready** | PASS | P1–P4 accepted locally; read-only/validation foundation intact |
| **Product-Activation-Ready** | FAIL | Contribution/admin productive paths not security-hardened |
| **Public-Launch-Ready** | NO-GO | 4× S+ and 6× S blockers confirmed |
| **P5 scope** | Security / Launch-Blocker remediation | Not productive activation, not content expansion |
| **Deployment freeze** | Active | `boundlore.com` untouched; no push/deploy/launch |
| **P5-A.1** | Docs-only planning gate | No code, SQL, Supabase writes, or live mutation |

**P5 purpose:** Close the four confirmed **S+ absolute launch blockers** from the pre-launch audit before any Product-Activation or Public-Launch retest.

**Out of scope for P5-A.1:**

- Code fixes, SQL migrations, sanitizer implementation, RLS changes, RPC changes
- Release-lock build, notification fix, XSS fix
- Deploy, push, live mutation tests
- Productive activation of P4 modules
- S-blocker remediation (deferred to post–S+ gates, planned separately)

**Retest rule:** No Fable security retest claiming PASS until P5-F combined S+ sweep is complete. No productive activation without retest.

---

## 2. S+ Finding Summary

| ID | Titel | Business Priority | Technical Severity | Status | Betroffene Bereiche | Launch Blocker | Zielzustand |
|----|-------|-------------------|--------------------|--------|---------------------|----------------|-------------|
| **S+-02** | Cross-User-Notification-Injection | S+ | HIGH | **BASELINE ACCEPTED (P5-B.2)** — production not closed; Live-RLS NOT TESTED | `supabase/admin_dashboard_notifications.sql`, `js/notifications.js`, `js/auth-nav.js`, `js/notification-url-safety.js` | **Ja** | INSERT nur eigene `user_id`; `target_url` scheme-safe |
| **S+-04** | RPC Gate Bypass (`bl_register_observation`) | S+ | MEDIUM–HIGH | **BASELINE ACCEPTED (P5-C.2)** — production not closed; Live-RPC NOT TESTED | `supabase/phase_a_observations_foundation.sql`, `js/discovery-core.js` | **Ja** | Tutorial-Ack + Release-Lock in RPC; kein Definer-Write ohne Gate |
| **S+-03** | Stored-XSS / fehlende HTML-Sanitization | S+ | HIGH | VERIFIED FAIL (code) | `js/post-detail.js`, `js/create-post.js`, `js/edit-post.js`, `wiki/admin/index.html`, URL sinks (`avatar-utils.js`, `auth-nav.js`) | **Ja** | Zentrale Sanitization-Policy; URL-Scheme-Whitelist; XSS-Korpus PASS |
| **S+-01** | Kein serverseitiger fail-closed Pre-Release-Content-Lock | S+ | HIGH | VERIFIED FAIL (code + behavior) | `js/patch-mode.js`, `supabase/wiki_patch_mode.sql`, alle Write-Oberflächen, posts INSERT, Storage, RPC Writes | **Ja** | `release_gate` Default LOCKED; RLS/RPC/Storage-Enforcement; Admin Unlock/Re-Lock + Audit |

**Audit counts (context):** 4× S+, 6× S, 7× A+, 9× A — average scores do not override any S+ finding.

**Repo evidence anchors (read-only, P5-A.1):**

| Finding | Primary evidence |
|---------|------------------|
| S+-01 | `js/patch-mode.js` — client-only `enforce()` / `assertCanSubmit()`; fail-open fallback `enabled: false` on DB error; not loaded on `wiki/create-post/` |
| S+-01 | `supabase/wiki_patch_mode.sql` — maintenance flag only; no write-blocking RLS/trigger on `posts` |
| S+-02 | `supabase/admin_dashboard_notifications.sql` — `notifications_insert_authenticated` WITH CHECK = `auth.role() = 'authenticated'` only |
| S+-02 | `js/auth-nav.js` — notification `target_url` rendered without scheme validation |
| S+-03 | `js/post-detail.js` — `#postBody.innerHTML = cleanContent` (BLMETA strip ≠ sanitization) |
| S+-03 | `js/create-post.js` / `js/edit-post.js` — Quill HTML stored and rendered unsanitized |
| S+-04 | `supabase/phase_a_observations_foundation.sql` — `bl_register_observation` SECURITY DEFINER inserts into `posts` (L462–478); `GRANT EXECUTE` to `authenticated` |

---

## 3. Empfohlene Umsetzungsreihenfolge

Reihenfolge ist **verbindlich** für P5-Implementierungsgates. Begründung: kleinste isolierte Fixes zuerst; systemischer Release-Lock zuletzt; RPC-Gate vor Lock-Architektur.

| Phase | Gate-ID | Titel | Begründung |
|-------|---------|-------|------------|
| **P5-B** | P5-B.1 / P5-B.2 | Notification Injection Fix | Kleinster isolierter Security-Fix; RLS-Policy klar abgrenzbar; reduziert unmittelbares Cross-User-Risiko |
| **P5-C** | P5-C.1 / P5-C.2 | Observation RPC Gate Fix | SECURITY DEFINER Write-Pfad muss vor Release-Lock abgesichert werden; verhindert Gate-Bypass |
| **P5-D** | P5-D.1 / P5-D.2 | Sanitization & URL Safety Fix | XSS-Risiko in mehreren Renderpfaden; benötigt zentrale Utility/Policy und Regressionstests |
| **P5-E** | P5-E.1 … P5-E.4 | Server-side Pre-Release Lock | Größter systemischer Fix; hängt von RPC-Gate-Disziplin ab; RLS/RPC/Storage/UI/Admin/Audit zusammen |
| **P5-F** | P5-F.1 / P5-F.2 | Combined S+ Acceptance + Fable Handoff | Alle vier S+ gemeinsam erneut prüfen; danach Fable Security Retest sinnvoll |

**Dependency graph:**

```
P5-A.1 (this plan)
  → P5-A.2 (planning acceptance sweep)
  → P5-B (notifications) — independent
  → P5-C (RPC gate) — must precede P5-E
  → P5-D (sanitization) — independent of B/C; parallelizable after A.2
  → P5-E (release lock) — depends on P5-C gate discipline
  → P5-F (combined S+ retest)
```

---

## 4. Gate-Struktur

### P5-A — Planning (current)

| Gate | Titel | Type | Deliverable |
|------|-------|------|-------------|
| **P5-A.1** | S+ Remediation Planning Gate | Docs-only | This document + gap-notes + e2e-matrix planning entry |
| **P5-A.2** | S+ Remediation Planning Acceptance Sweep | Docs-only | **Accepted** — plan completeness verified; no implementation claims |

### P5-B — Notification Injection

| Gate | Titel | Type | Scope |
|------|-------|------|-------|
| **P5-B.1** | Notification Injection Fix Baseline | Code + SQL | **Complete** — baseline implemented |
| **P5-B.2** | Notification Injection Acceptance Sweep | Test | **Complete** — repo baseline accepted; Live-RLS NOT TESTED |

**Betroffene Dateien (P5-B.1):**

- `supabase/admin_dashboard_notifications.sql` — insert policy `user_id = auth.uid()`; `bl_is_safe_notification_target_url` sketch (file only, not executed)
- `js/notification-url-safety.js` — central `target_url` scheme policy
- `js/notifications.js` — client insert guard; sanitize on create/read
- `js/auth-nav.js` — sanitize before `<a href>` render
- `wiki/post/index.html`, `wiki/admin/index.html` — script load order
- `qa/p5-notification-security-fixtures.html` + `.js` — URL safety corpus (22+ cases)

### P5-C — Observation RPC Gate

| Gate | Titel | Type | Scope |
|------|-------|------|-------|
| **P5-C.1** | Observation RPC Gate Fix Baseline | SQL | **Complete** — baseline implemented |
| **P5-C.2** | Observation RPC Gate Acceptance Sweep | Test | **Complete** — repo baseline accepted; Live-RPC NOT TESTED |

**Betroffene Dateien (P5-C.1):**

- `supabase/phase_a_observations_foundation.sql` — `bl_register_observation` ack gate + P5-E hook (file only, not executed)
- `qa/p5-observation-rpc-security-fixtures.html` + `.js` — static SQL pattern checks (17 cases)

### P5-D — Sanitization & URL Safety

| Gate | Titel | Type | Scope |
|------|-------|------|-------|
| **P5-D.1** | HTML Sanitization & URL Safety Baseline | Code | Central sanitizer module; post render; create/edit preview; admin compose/preview; URL sinks |
| **P5-D.2** | Sanitization Acceptance Sweep | Test | XSS corpus; reflected-search regression; Quill format preservation spot-check |

**Betroffene Dateien (planned):**

- New: `js/html-sanitize.js` (or equivalent central utility)
- `js/post-detail.js`
- `js/create-post.js`
- `js/edit-post.js`
- `js/avatar-utils.js`
- `wiki/admin/index.html` (compose/preview sinks)
- Cache-bust `?v=` on all touched HTML/JS per `pr-checklist.md`

### P5-E — Server-side Pre-Release Lock

| Gate | Titel | Type | Scope |
|------|-------|------|-------|
| **P5-E.1** | Server-side Release Lock Planning Gate | Docs-only | `release_gate` schema, RLS matrix, RPC matrix, Storage matrix, Admin UX spec |
| **P5-E.2** | Release Gate DB/RLS/RPC Baseline | SQL | `release_gate` table; restrictive policies on posts/comments/reactions/storage; RPC checks |
| **P5-E.3** | Release Gate Frontend/Admin UX Baseline | Code + HTML | `patch-mode.js` alignment or replacement; create-post/edit-post load; pre-release messaging; admin unlock/re-lock UI |
| **P5-E.4** | Release Gate Acceptance Sweep | Test | UI + direct API + Storage + RPC + RLS + race/missing-config/stale-session |

**Betroffene Dateien (planned):**

- New: `supabase/release_gate.sql` (or equivalent)
- `supabase/wiki_patch_mode.sql` (integration or supersession documented)
- `js/patch-mode.js`
- `wiki/create-post/index.html`
- `wiki/edit-post/index.html`
- `wiki/admin/index.html` (unlock/re-lock panel)
- All write surfaces enumerated in §2 S+-01

### P5-F — Combined S+ Retest

| Gate | Titel | Type | Scope |
|------|-------|------|-------|
| **P5-F.1** | Combined S+ Security Retest Gate | Test | All four S+ acceptance criteria re-verified together |
| **P5-F.2** | Fable Retest Handoff Package | Docs | Evidence bundle for independent Fable security retest |

---

## 5. Acceptance Criteria pro S+-Finding

### S+-02 — Notification Injection

| # | Criterion | Verification method |
|---|-----------|---------------------|
| 1 | Authenticated user **cannot** INSERT notification with foreign `user_id` | RLS negative test (direct API) |
| 2 | Own notification INSERT only when calling flow is authorized (self or admin-only server path) | RLS + code review |
| 3 | `target_url` accepts only relative internal paths (`/wiki/...`) or `http:`/`https:` absolute URLs | URL scheme corpus test |
| 4 | `javascript:`, `data:`, `vbscript:`, `file:` schemes **blocked** at write and render | Scheme corpus + browser smoke |
| 5 | Notification rendering escapes and validates `target_url` before `<a href>` | Static review + XSS smoke |
| 6 | RLS test documented in gate report (not assumed) | P5-B.2 artifact |
| 7 | No regression in notification bell UI for legitimate flows | Browser smoke (read-only where possible) |
| 8 | No `service_role` key in client | Grep / config review |

### S+-04 — RPC Gate Bypass

| # | Criterion | Verification method |
|---|-----------|---------------------|
| 1 | `bl_register_observation` checks tutorial-ack explicitly (`user_submission_acks` or equivalent) | SQL review + RPC negative test |
| 2 | `bl_register_observation` checks release-lock explicitly once `release_gate` exists (P5-E) | SQL review + RPC negative test |
| 3 | Without ack: RPC returns error / raises; **no** `posts` row created | RPC negative test |
| 4 | With lock active: RPC returns error / raises; **no** `posts` row created | RPC negative test (post P5-E) |
| 5 | Admin bypass only if explicitly documented and gated inside RPC (not implicit Definer bypass) | SQL review |
| 6 | `search_path` set on SECURITY DEFINER function | SQL review |
| 7 | SECURITY DEFINER retained only if strictly necessary; safer alternative evaluated in P5-C.1 | Design note in gate report |
| 8 | No write bypass via any other granted RPC to `authenticated` without equivalent gate checks | RPC inventory review |

### S+-03 — Stored XSS / Sanitization

| # | Criterion | Verification method |
|---|-----------|---------------------|
| 1 | Central HTML sanitizer or equivalent secure policy exists and is imported by all render sinks | Static review |
| 2 | Post body rendered via sanitizer (not raw `innerHTML` of author HTML) | `post-detail.js` review + XSS corpus |
| 3 | Admin compose/preview sanitizes before render | Admin HTML review + corpus |
| 4 | Create/edit preview paths sanitize before render | JS review + corpus |
| 5 | URL sinks (`avatar_url`, `source_url`, `target_url`, admin asset preview) use central URL validator | Static review + scheme corpus |
| 6 | Allowed URL schemes documented in plan/gate report | Docs artifact |
| 7 | XSS test corpus PASS (stored + reflected spot-check) | Automated/manual corpus |
| 8 | Reflected search XSS remains PASS (`<img onerror=...>` in query param) | Browser smoke (read-only) |
| 9 | Legitimate Quill base formats (bold, lists, links) not unnecessarily destroyed | Spot-check on QA posts |
| 10 | No executable payloads: `<script>`, event handlers, `javascript:` URLs, `svg onload`, `iframe`, `object` | Corpus |

**XSS test corpus (minimum, P5-D.2):**

| Payload class | Example | Expected |
|---------------|---------|----------|
| Script tag | `<script>alert(1)</script>` | Neutralized / not executed |
| Event handler | `<img src=x onerror=alert(1)>` | Neutralized / not executed |
| JavaScript URL | `<a href="javascript:alert(1)">x</a>` | Link stripped or href removed |
| SVG onload | `<svg onload=alert(1)>` | Neutralized |
| Iframe | `<iframe src="evil">` | Stripped |
| Reflected query | `?q=<img src=x onerror=alert(1)>` on `/wiki/search/` | Escaped (regression) |

### S+-01 — Server-side Pre-Release Lock

| # | Criterion | Verification method |
|---|-----------|---------------------|
| 1 | Central `release_gate` (or equivalent) singleton state exists | SQL review |
| 2 | Default state = **LOCKED** on fresh deploy / missing row | SQL + negative test |
| 3 | Missing / corrupt config = **LOCKED** (fail-closed) | Negative test |
| 4 | RLS restrictive policy blocks `posts` INSERT for non-admin when locked | RLS negative test |
| 5 | RLS blocks `comments`, `post_reactions`, `reports` INSERT when locked (if in scope) | RLS matrix test |
| 6 | Storage INSERT blocked when locked (discovery-uploads, report-screenshots) | Storage negative test |
| 7 | All relevant RPCs (`bl_register_observation`, others with writes) check lock | RPC inventory + negative tests |
| 8 | UI shows clear pre-release message; read-only browsing works | Browser smoke |
| 9 | Submit controls disabled or honestly explained (not hidden-only) | Browser smoke on create-post, edit-post, support, guilds |
| 10 | `patch-mode.js` loaded on all submission pages OR superseded by unified guard | Wiring review |
| 11 | Admin unlock: manual only, authorized admin role, reason + timestamp + actor | Admin UI + `admin_actions` audit |
| 12 | Re-lock immediately available | Admin UI test |
| 13 | Race during unlock, stale session, missing config tested | Documented test steps |
| 14 | Existing pending/drafts **not** auto-published on unlock | Explicit negative test |
| 15 | No time-based auto-unlock | SQL/code review |

**Write surface inventory (must be covered by P5-E):**

| Surface | Path | Enforcement layer |
|---------|------|-------------------|
| Post create | `create-post.js` → `posts` INSERT | RLS + client guard |
| Post edit | `edit-post.js` → `posts` UPDATE | RLS (lock may block non-admin updates) |
| Contribution | `create-post.js` contribution mode | RLS |
| Guild application | `guilds-apply.js` → `posts` INSERT | RLS |
| Comments / reactions / reports | `post-detail.js`, `support.js`, `community-hub.js` | RLS |
| Discovery upload | `create-post.js` → Storage | Storage policy |
| Report screenshot | `support.js` → Storage | Storage policy |
| Observation RPC | `discovery-core.js` → `bl_register_observation` | RPC gate |
| Sync RPC | `rpc_sync_discovery_submission` | RPC (admin-only; verify unchanged) |
| Notifications insert | `notifications.js` | RLS (P5-B) |
| Tutorial ack | `tutorial-ack.js` → `user_submission_acks` | May remain allowed (read-only ack, not content publish) |

---

## 6. Teststrategie

### Testarten pro Gate

| Test type | P5-B | P5-C | P5-D | P5-E | P5-F |
|-----------|------|------|------|------|------|
| Static code review | ✓ | ✓ | ✓ | ✓ | ✓ |
| RLS policy review | ✓ | — | — | ✓ | ✓ |
| SQL dry review (no execution in planning) | ✓ | ✓ | — | ✓ | — |
| RPC negative tests | — | ✓ | — | ✓ | ✓ |
| Browser smoke (read-only preferred) | ✓ | — | ✓ | ✓ | ✓ |
| XSS payload corpus | — | — | ✓ | — | ✓ |
| URL scheme corpus | ✓ | — | ✓ | — | ✓ |
| Direct API negative tests | ✓ | ✓ | — | ✓ | ✓ |
| Storage upload negative tests | — | — | — | ✓ | ✓ |
| Admin unlock/re-lock tests | — | — | — | ✓ | ✓ |
| Regression harnesses (P3/P4 QA) | — | — | ✓ | ✓ | ✓ |
| No data mutation confirmation | ✓ | ✓ | ✓ | ✓ | ✓ |

### Mutation test rules

- **P5-A.1:** No mutating tests. Planning only.
- **P5-B through P5-E:** Mutating tests only in **local/staging** Supabase with explicit operator approval.
- **Never** run `supabase/pre_release_test_data_reset.sql` as part of security gates unless in dedicated reset window per `PRE_RELEASE_RESET_README.md`.
- **Never** approve/reject/modify pending `add_recipe` conflict during security gates.
- **Never** use `127.0.0.1` — use `http://localhost:8080` only.
- Document every test as **VERIFIED PASS / VERIFIED FAIL / NOT TESTED**.

### Regression invariants (must hold after every P5 gate)

Per `qa/e2e-content-matrix.md` cross-gate invariants:

- Wood remains unresolved; no Wood post
- Forge remains unresolved; no Forge post
- Pending `add_recipe` Ember conflict untouched
- Patch Mode workflow unchanged until P5-E intentionally replaces/extends it
- No accidental stub promotion
- P3/P4 QA harnesses remain green (read-only fixtures)

---

## 7. Retest-Strategie mit Fable

### Fable Retest 1 — after P5-F.1 (S+ only)

**Trigger:** P5-B through P5-E all accepted; P5-F.1 combined sweep green.

**Scope:**

- S+-01, S+-02, S+-03, S+-04 only
- Live RLS export for `notifications` (post P5-B)
- RPC negative tests for `bl_register_observation`
- XSS corpus on post detail + admin preview
- Release-lock fail-closed verification (UI + direct API attempt)
- No S-blocker retest yet
- No launch-ready claim

**Handoff package (P5-F.2):** **Complete** — see `docs/architecture/p5-fable-splus-retest-handoff.md`

- Gate reports P5-B.2, P5-C.2, P5-D.2, P5-E.4, P5-F.1
- Copy-paste prompt: `docs/architecture/p5-fable-splus-retest-prompt.md`
- Checklist: `docs/architecture/p5-fable-splus-retest-checklist.md`
- SQL migration files (read-only diff)
- JS diff summary
- Test corpus results
- Known NOT TESTED items explicitly listed

### Fable Retest 2 — after S-blockers closed

**Trigger:** All 6× S findings remediated or proven N/A with evidence.

**Scope:** Product-Activation-Ready reassessment — auth journeys, moderation, backup/restore evidence, monitoring, SEO/search launch gates.

### Fable Final Launch-Ready Audit

**Prerequisites (all required):**

- [ ] All S+ closed with evidence
- [ ] All S closed with evidence or proven N/A
- [ ] S-10 live RLS verified (`profiles`, `posts` INSERT/DELETE, `comments`, `ratings`, `reports`)
- [ ] Backup/restore test documented
- [ ] Monitoring/error-tracking documented
- [ ] SEO/Search launch gates green (CSR/prerender, sitemap, `monster` recall)
- [ ] A+ findings mitigated or formally accepted with owner + deadline + interim mitigation

**Until then:** Public-Launch-Ready remains **NO-GO**.

---

## 8. Stop Conditions

A gate **stops immediately** when:

| Condition | Action |
|-----------|--------|
| Unexpected auth/RLS uncertainty discovered | Halt; document NOT TESTED; no PASS claim |
| Live data mutation required without explicit approval | Halt until operator sign-off |
| Any productive activation attempted outside gate scope | Halt; revert plan |
| SQL execution required during P5-A (planning) | Forbidden — stop |
| Security claim not reproducible | Mark NOT TESTED; do not downgrade S+ |
| Average score / partial fixes suggest "good enough" | **Invalid** — any open S+ = NO-GO |
| `qa/e2e-baseline-bmeta.snapshot.json` accidentally staged | Unstage before any commit |
| Pending `add_recipe` conflict touched | Stop; treat as gate failure |
| Push/deploy/launch attempted | Stop; deployment freeze violation |

---

## 9. Rollback-Prinzipien

For **future implementation gates** (P5-B through P5-E):

| Principle | Rule |
|-----------|------|
| **One finding per commit series** | P5-B commits do not mix with P5-C/D/E |
| **Small reversible gates** | Each P5-X.1 baseline independently revertible |
| **No batch S+ fixes** | Never one PR closing all four S+ |
| **SQL migrations** | Additive migration files; document DOWN/rollback SQL in gate report |
| **UI/JS separate from DB/RLS** | P5-B SQL separate from P5-D JS sanitizer |
| **Acceptance sweep per fix** | P5-X.2 required before next P5-Y.1 starts |
| **Combined sweep** | P5-F.1 only after all P5-B/C/D/E accepted |
| **Cache-bust** | Increment `?v=` on every touched script per `pr-checklist.md` |
| **Deployment** | No deploy until P5-F + Fable Retest 1 PASS |

**Rollback triggers:**

- Any P5-X.2 acceptance FAIL → revert P5-X.1 commits; do not proceed
- Regression on P3/P4 harnesses → revert and investigate
- Invariant breach (Wood/Forge post, conflict touched) → immediate revert + incident note

---

## 10. Nächster Schritt

| Step | Gate | Type | Notes |
|------|------|------|-------|
| **Complete** | P5-A.1 | Docs-only | This plan |
| **Complete** | P5-A.2 | Docs-only acceptance sweep | Plan accepted; see §11 below |
| **Complete** | P5-B.1 | Code + SQL baseline | S+-02 baseline implemented; see §12 |
| **Complete** | P5-B.2 | Test acceptance sweep | Repo baseline accepted; see §13 — Live-RLS NOT TESTED |
| **Complete** | P5-C.1 | SQL baseline | S+-04 RPC gate baseline; see §14 |
| **Complete** | P5-C.2 | Test acceptance sweep | Repo baseline accepted; see §15 — Live-RPC NOT TESTED |
| **Complete** | P5-D.1 | Code baseline | S+-03 sanitization baseline; see §16 |
| **Complete** | P5-D.2 | Test acceptance sweep | S+-03 baseline accepted; see §17 |
| **Complete** | P5-E.1 | Planning gate | Release lock plan; see §18 + `p5-release-lock-plan.md` |
| **Complete** | P5-E.2 | SQL baseline | `release_gate` DB/RLS/RPC baseline; see §19 — not executed |
| **Complete** | P5-E.3 | Frontend/Admin UX | Release lock client + admin panel; see §20 — no DB apply |
| **Complete** | P5-E.4 | Acceptance sweep | Release gate baseline accepted; see §21 — Live-RLS NOT TESTED |
| **Complete** | P5-F.1 | Combined S+ retest | All four S+ fixtures + regression; see §22 — not production-closed |
| **Complete** | P5-F.2 | Fable retest handoff | Evidence bundle + prompt; see §23 |
| **Blocked** | P5-E.5 | Staged DB apply + negative tests | **BLOCKED** — isolated staging not proven; see §24 |
| **Complete** | P5-STAGING.1 | Staging environment plan | Docs + `.env.staging.example`; see staging plan |
| **Complete** | P5-STAGING.4 | Test user provisioning | **PASS** |
| **Blocked** | P5-E.5 re-run | SQL apply + negative tests | **BLOCKED** — base schema missing |
| **Partial** | P5-STAGING.5 | Base schema provisioning plan | **PARTIAL** |
| **Complete** | P5-STAGING.5A | Legacy schema-only export plan | **PASS** — Path A |
| **Next** | P5-STAGING.5B | Legacy export execution | Explicit approval required |
| **Not now** | Push / Deploy / Launch | Forbidden | Deployment freeze active |

---

## 11. P5-A.2 — Planning Acceptance Sweep

**Milestone:** P5-A.2 docs-only acceptance sweep; confirms P5-A.1 plan is complete, measurable, and ready for implementation gates P5-B through P5-F.

**P5-A.2 acceptance sweep completed locally.** The P5 S+ Remediation Plan is accepted as docs-only. All four S+ launch blockers are mapped to dedicated implementation and acceptance gates. The order P5-B through P5-F, per-finding acceptance criteria, test strategy, stop conditions, rollback principles, and Fable retest strategy are accepted. No code, SQL, Supabase, data, UI, RLS, RPC, sanitizer, release-lock, notification, push, deploy, or launch changes were introduced. BoundLore remains Product-Activation-Ready = FAIL and Public-Launch-Ready = NO-GO.

### P5-A.2 sweep checklist

| Check | Result |
|-------|--------|
| §1 Status and Scope complete | `[x]` |
| §2 S+ Finding Summary — all four findings | `[x]` |
| §3 Umsetzungsreihenfolge P5-B→F with rationale | `[x]` |
| §4 Gate structure P5-B.1 through P5-F.2 | `[x]` |
| §5 Acceptance criteria measurable per finding | `[x]` |
| §6 Teststrategie (12 test types) | `[x]` |
| §7 Fable retest strategy (3 tiers) | `[x]` |
| §8 Stop conditions | `[x]` |
| §9 Rollback principles | `[x]` |
| §10 Nächster Schritt | `[x]` |
| S+-01: release_gate, fail-closed, no auto-publish | `[x]` |
| S+-02: foreign user_id blocked, URL schemes | `[x]` |
| S+-03: central sanitizer, XSS corpus, Quill preserved | `[x]` |
| S+-04: RPC ack+lock checks, SECURITY DEFINER | `[x]` |
| No implementation / no security fix claimed done | `[x]` |
| Pending `add_recipe` conflict untouched | `[x]` |

**Next candidate:** **P5-B.2 Notification Injection Acceptance Sweep**. No push/deploy/launch.

**STOPP — BoundLore remains NOT live-ready. Public-Launch-Ready = NO-GO until P5-F + Fable Retest 1.**

**LAUNCH-0** remains mandatory before any push/deploy/live action (in addition to S+ closure).

---

## 12. P5-B.1 — Notification Injection Fix Baseline

**Milestone:** P5-B.1 code + SQL baseline for S+-02; **ready for P5-B.2 acceptance** — not final accepted.

**P5-B.1 baseline implemented locally.** Insert policy in `supabase/admin_dashboard_notifications.sql` prepared with `WITH CHECK (user_id = auth.uid())` via idempotent `DROP POLICY IF EXISTS` + `CREATE POLICY`. SQL **not executed** — live RLS unchanged until a future DB/staging gate. `bl_is_safe_notification_target_url()` function sketch and documented `NOT VALID` constraint comment added for `target_url`. Cross-user notification delivery (admin ban/timeout, comment-to-author) documented as requiring a separate SECURITY DEFINER RPC — not a broad authenticated INSERT.

**Client guardrails:**

- `js/notification-url-safety.js` — `BoundLoreNotificationUrlSafety` (`p5-b1`); blocks `javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, `ftp:`, protocol-relative, backslash obfuscation, control characters
- `js/notifications.js` — cross-user insert blocked client-side; `target_url` sanitized on create and fetch
- `js/auth-nav.js` — `target_url` sanitized before `<a href>`; external http(s) get `rel="noopener noreferrer"`
- Script load order: `notification-url-safety.js` before `notifications.js` on `wiki/post/` and `wiki/admin/`; dynamic load in `auth-nav.js`

**QA:** `qa/p5-notification-security-fixtures.html` — 22 URL corpus cases + meta checks; no Supabase writes.

| Check | Result |
|-------|--------|
| SQL file changed, not executed | `[x]` |
| Insert policy scoped to `user_id = auth.uid()` | `[x]` — file prepared |
| `target_url` safety helper | `[x]` |
| Unsafe schemes blocked at write/render | `[x]` — client baseline |
| QA fixture corpus | `[x]` |
| Live RLS applied / tested | `[ ]` — NOT TESTED; deferred to explicit DB/staging gate |
| S+-02 repo baseline accepted | `[x]` — P5-B.2 |
| S+-02 production-closed | `[ ]` — requires DB application + negative RLS test |
| Push / deploy / Supabase writes | `[x]` — none |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Next candidate:** **P5-D.1 HTML Sanitization & URL Safety Baseline**. No push/deploy/launch.

---

## 13. P5-B.2 — Notification Injection Acceptance Sweep

**Milestone:** P5-B.2 docs-only acceptance sweep; confirms P5-B.1 repository baseline is correct and accepted at repo level — **not production-closed**.

**P5-B.2 acceptance sweep completed locally.** The Notification Injection guardrail baseline is accepted at repository level. The SQL policy in `supabase/admin_dashboard_notifications.sql` scopes authenticated notification inserts to `user_id = auth.uid()` via idempotent `DROP POLICY IF EXISTS` + `CREATE POLICY`, but the SQL has **not been executed** and **Live-RLS remains NOT TESTED**. `BoundLoreNotificationUrlSafety` (`p5-b1`) is accepted; unsafe `target_url` schemes are blocked before rendering or client-side insert. The QA fixture passes locally (24/24). Standard regression smoke (homepage, browse, search, post, admin) shows no regressions from URL-safety integration. No Supabase writes, no notification inserts, no data changes.

**S+-02 status:** Baseline-accepted at repo level. **Not production-closed** until DB application and negative RLS testing occur in an explicit staging/live gate.

| Check | Result |
|-------|--------|
| SQL baseline: `user_id = auth.uid()` in repo file | `[x]` |
| SQL not executed | `[x]` |
| Live-RLS NOT TESTED (by design) | `[x]` documented |
| `BoundLoreNotificationUrlSafety` p5-b1 accepted | `[x]` |
| Unsafe schemes blocked (write + render) | `[x]` |
| `auth-nav.js` / `notifications.js` accepted | `[x]` |
| QA fixture 24/24 PASS | `[x]` |
| Standard regression smoke | `[x]` |
| Cross-user notifications remain blocked until RPC | `[x]` documented |
| Supabase writes / deploy / push | `[x]` — none |
| S+-02 production-closed | `[ ]` |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Next candidate:** **P5-D.1 HTML Sanitization & URL Safety Baseline**. No push/deploy/launch.

---

## 14. P5-C.1 — Observation RPC Gate Fix Baseline

**Milestone:** P5-C.1 SQL baseline for S+-04; **ready for P5-C.2 acceptance** — not production-closed.

**P5-C.1 baseline implemented locally.** `bl_register_observation` in `supabase/phase_a_observations_foundation.sql` now enforces `auth.uid()` (with `42501` on null), checks `public.user_submission_acks` for the current actor (admin bypass mirrors `posts_insert_requires_tutorial_ack`), and documents the P5-E release-lock hook before any write. `SECURITY DEFINER` retained with `SET search_path = public` and documented rationale. SQL **not executed** — Live-RPC remains NOT TESTED. `release_gate` not implemented in this gate.

| Check | Result |
|-------|--------|
| Ack schema identified (`user_submission_acks.user_id`) | `[x]` |
| `auth.uid()` gate in RPC | `[x]` |
| Tutorial-ack before posts INSERT | `[x]` |
| P5-E release-lock hook documented | `[x]` |
| `SECURITY DEFINER` + `search_path` | `[x]` |
| `release_gate` built | `[ ]` — P5-E only |
| SQL file changed, not executed | `[x]` |
| QA static fixture | `[x]` — 17/17 |
| Live-RPC / negative RPC test | `[ ]` — NOT TESTED; deferred to explicit DB/staging gate |
| S+-04 repo baseline accepted | `[x]` — P5-C.2 |
| S+-04 production-closed | `[ ]` — requires DB application + negative RPC test |
| Push / deploy / Supabase writes | `[x]` — none |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Next candidate:** **P5-D.1 HTML Sanitization & URL Safety Baseline**. No push/deploy/launch.

---

## 15. P5-C.2 — Observation RPC Gate Acceptance Sweep

**Milestone:** P5-C.2 docs-only acceptance sweep; confirms P5-C.1 repository baseline is accepted at repo level — **not production-closed**.

**P5-C.2 acceptance sweep completed locally.** The Observation RPC gate baseline is accepted at repository level. `bl_register_observation` now checks `auth.uid()` and requires a `user_submission_acks` row for the actor (or admin bypass) before any writes in the repo SQL file. `SECURITY DEFINER` remains guarded with `SET search_path = public`, and a P5-E `release_gate` hook is documented before writes. The SQL has **not been executed**; **Live-RPC/RLS remains NOT TESTED**. The `release_gate` itself is not implemented in P5-C and remains in scope for P5-E. QA static fixture passes locally (17/17). Notification fixture remains 24/24 PASS. Standard regression smoke shows no regressions. No Supabase writes, no RPC calls, no data changes.

**S+-04 status:** Baseline-accepted at repo level. **Not production-closed** until DB application and negative RPC testing occur in an explicit staging/live gate. Release-lock enforcement remains open until P5-E.

| Check | Result |
|-------|--------|
| Ack schema (`user_submission_acks.user_id`) accepted | `[x]` |
| `auth.uid()` gate accepted | `[x]` |
| Tutorial-ack before posts INSERT accepted | `[x]` |
| P5-E release-lock hook documented | `[x]` |
| `SECURITY DEFINER` + `search_path` accepted | `[x]` |
| `release_gate` not built | `[x]` |
| SQL not executed | `[x]` |
| QA fixture 17/17 PASS | `[x]` |
| Notification fixture 24/24 PASS | `[x]` |
| Standard regression smoke | `[x]` |
| Live-RPC negative test | `[ ]` — DB/staging gate |
| S+-04 production-closed | `[ ]` |
| Supabase writes / deploy / push | `[x]` — none |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Next candidate:** **P5-D.2 HTML Sanitization Acceptance Sweep**. No push/deploy/launch.

---

## 16. P5-D.1 — HTML Sanitization & URL Safety Baseline

**Milestone:** P5-D.1 code baseline for S+-03 stored/reflected XSS risk; **ready for P5-D.2 acceptance** — not production-closed.

**P5-D.1 baseline implemented locally.** Central `js/content-safety.js` introduces `BoundLoreContentSafety` (`p5-d1`) with DOMParser strict allowlist sanitization (no DOMPurify dependency) and URL scheme whitelist (`http`, `https`, safe internal `/` paths). Rich-text allowlist preserves Quill basics (`p`, lists, headings, `strong`/`em`, `blockquote`, `pre`/`code`, `a`, `img`). Unsafe tags (`script`, `iframe`, `svg`, `form`, etc.), `on*` attributes, `style`, and dangerous URL schemes (`javascript:`, `data:`, `vbscript:`, `file:`, `blob:`, `ftp:`, protocol-relative) are blocked fail-closed.

**Client guardrails:**

- `js/post-detail.js` — post body sanitized after BLMETA strip; `source_url` href via ContentSafety; discovery media URLs filtered; image viewer src guarded
- `js/create-post.js` — Quill HTML sanitized before submit; outgoing payload body sanitized before meta injection; `source_url` validated via ContentSafety
- `js/edit-post.js` — Quill HTML sanitized before save; discovery body re-sanitized before meta injection; `source_url` validated
- `js/avatar-utils.js` — `avatar_url` via `sanitizeImageSrc`; unsafe URLs fall back to initials
- `wiki/admin/index.html` — compose load/publish sanitized; discovery attachment extraction and preview sinks sanitized; asset preview URLs gated
- Script load order: `content-safety.js` before dependent scripts on post/create/edit/admin pages

**QA:** `qa/p5-sanitization-security-fixtures.html` — 45 static checks (safe rich text, unsafe HTML/URL corpus, meta policy). No Supabase writes.

| Check | Result |
|-------|--------|
| Central ContentSafety utility | `[x]` |
| DOMParser allowlist (no DOMPurify) | `[x]` |
| post-detail render sinks guarded | `[x]` |
| create/edit outgoing HTML guarded | `[x]` |
| avatar_url src guarded | `[x]` |
| admin compose/preview sinks guarded | `[x]` |
| Notification fixture unchanged | `[x]` — P5-B scope preserved |
| Observation fixture unchanged | `[x]` — P5-C scope preserved |
| Server-side / DB sanitizer | `[ ]` — not in P5-D.1 |
| Existing stored content migrated | `[ ]` — not claimed |
| S+-03 production-closed | `[ ]` — P5-D.2 + staging required |
| Supabase writes / deploy / push | `[x]` — none |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**S+-03 status:** Baseline implemented at repo level. **Not production-closed** until P5-D.2 acceptance sweep, reflected-search regression, and staging verification of create/edit/admin paths.

**Next candidate:** **P5-E.1 Server-side Release Lock Planning Gate**. No push/deploy/launch.

---

## 17. P5-D.2 — HTML Sanitization & URL Safety Acceptance Sweep

**Milestone:** P5-D.2 acceptance sweep; confirms P5-D.1 repository baseline is **baseline-accepted** — **not production-closed**.

**P5-D.2 acceptance sweep completed locally.** The HTML Sanitization & URL Safety baseline is accepted at repository level. `BoundLoreContentSafety` (`p5-d1`) provides DOMParser strict-allowlist rich-text sanitization and URL-scheme validation. `post-detail`, `create-post`, `edit-post`, `avatar-utils`, and relevant admin compose/preview sinks are accepted as guarded for the P5-D baseline. During acceptance, a minimal serializer bug in `sanitizeRichTextHtml` (empty output from detached fragment) was found and fixed — `return outRoot.innerHTML` instead of empty `outDoc.body.innerHTML`.

**Acceptance checks:**

| Check | Result |
|-------|--------|
| ContentSafety API + fail-closed policy | `[x]` |
| Strict allowlist blocks unsafe HTML/URLs | `[x]` |
| Safe Quill basics preserved | `[x]` |
| post-detail / create / edit / avatar / admin sinks accepted | `[x]` |
| WikiEntryLayout upstream sanitization verified | `[x]` — layout output not re-sanitized; `cleanContent` sanitized before `buildModel` |
| Structured discovery builders use `escapeHtml` | `[x]` — `buildStructuredDiscoveryContent` / `buildSourceDiscoveryHtml` |
| Reflected search XSS probe escaped | `[x]` — `?q=<img onerror=...>` no script execution |
| Sanitization fixture 45/45 PASS | `[x]` |
| Observation fixture 17/17 PASS | `[x]` |
| Notification fixture 24/24 PASS | `[x]` |
| Standard regression smoke | `[x]` |
| Server-side sanitizer | `[ ]` — not implemented |
| Stored content migration | `[ ]` — not performed |
| S+-03 production-closed | `[ ]` |
| Supabase writes / deploy / push | `[x]` — none |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**S+-03 status:** **Baseline-accepted** at repo level. **Not production-closed** until server-side sanitization, stored-content handling, and staging verification of create/edit/admin write paths.

**Next candidate:** **P5-E.2 Release Gate DB/RLS/RPC Baseline**. No push/deploy/launch.

---

## 18. P5-E.1 — Server-side Release Lock Planning Gate

**Milestone:** P5-E.1 docs-only planning for S+-01; **ready for P5-E.2 implementation** — not implemented, not accepted, not production-closed.

**P5-E.1 planning completed locally.** `docs/architecture/p5-release-lock-plan.md` documents the target `release_gate` architecture, fail-closed helper design, enforcement matrix (posts/RPC/storage/comments/reactions/reports), roles matrix, UI/admin plan, test strategy, gate split P5-E.2/E.3/E.4, acceptance criteria, stop conditions, rollback, and open questions. Repo analysis confirms: `wiki_patch_mode` + `patch-mode.js` are client-only maintenance UX (default OFF, fail-open); `posts_insert_requires_tutorial_ack` has no release lock; `bl_register_observation` has P5-E hook comment only; `discovery_storage` has no lock; `edit-post.js` lacks patch guard.

| Check | Result |
|-------|--------|
| `p5-release-lock-plan.md` created | `[x]` |
| S+-01 architecture planned | `[x]` |
| Enforcement matrix documented | `[x]` |
| Roles matrix documented | `[x]` |
| UI/Admin plan documented | `[x]` |
| P5-E.2/E.3/E.4 gates defined | `[x]` |
| `release_gate` implemented | `[ ]` — P5-E.2 |
| RLS/RPC/Storage enforcement | `[ ]` — P5-E.2 |
| UI guardrails | `[ ]` — P5-E.3 |
| S+-01 baseline accepted | `[ ]` — after P5-E.4 |
| S+-01 production-closed | `[ ]` |
| Code/SQL/data changes in P5-E.1 | `[x]` — docs only |
| Supabase writes / deploy / push | `[x]` — none |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**S+-01 status:** Planning completed. **Not implemented.** **Not baseline-accepted.** **Not production-closed.**

**Next candidate:** **P5-E.2 Release Gate DB/RLS/RPC Baseline**. No push/deploy/launch.

---

## 19. P5-E.2 — Release Gate DB/RLS/RPC Baseline

**Milestone:** P5-E.2 SQL baseline for S+-01 in repo — **not executed**, **not applied**, **not baseline-accepted** (P5-E.4), **not production-closed**.

**P5-E.2 baseline implemented locally.** `supabase/release_gate_lock.sql` defines singleton `release_gate` (default locked), `release_gate_audit`, fail-closed helpers (`bl_is_release_unlocked`, `bl_can_create_user_content`, `bl_assert_can_create_user_content`), admin RPC `bl_set_release_gate_locked`, restrictive RLS on posts/reactions/storage, and documents NOT TESTED gaps (comments, reports, report-screenshots). `phase_a_observations_foundation.sql` calls `bl_assert_can_create_user_content` before posts INSERT. QA static fixture 34/34 PASS. No Supabase writes, no SQL execution, no deploy, no push.

| Check | Result |
|-------|--------|
| `release_gate_lock.sql` created | `[x]` |
| Default locked / missing config = locked | `[x]` |
| `release_gate_audit` planned in SQL | `[x]` |
| Fail-closed helpers | `[x]` |
| `bl_is_admin_actor` via `profiles.role = 'admin'` | `[x]` |
| Posts INSERT restrictive policy | `[x]` |
| Posts UPDATE restrictive policy | `[x]` — admin bypass via helper |
| `bl_register_observation` release assert | `[x]` |
| Discovery storage restrictive (bucket-aware) | `[x]` |
| Comments/reports/report-screenshots | `[ ]` — NOT TESTED; live-RLS export required |
| `rpc_sync_discovery_submission` | `[x]` — admin-only; documented |
| SQL executed / DB migration | `[x]` — none |
| Frontend/Admin release lock UX | `[ ]` — P5-E.3 |
| QA fixture PASS | `[x]` — 34 checks |
| S+-01 baseline accepted | `[ ]` — P5-E.4 |
| S+-01 production-closed | `[ ]` |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**S+-01 status:** **DB/RLS/RPC baseline implemented** in repo. **Not baseline-accepted.** **Not production-closed.**

**Next candidate:** **P5-E.3 Release Gate Frontend/Admin UX Baseline**. No push/deploy/launch.

---

## 20. P5-E.3 — Release Gate Frontend/Admin UX Baseline

**Milestone:** P5-E.3 client UX for S+-01 — **fail-closed**, **not baseline-accepted** (P5-E.4), **not production-closed**.

**P5-E.3 baseline implemented locally.** `js/release-gate-client.js` provides fail-closed read/UX (`missing_config`/`read_error`/`no_client` → locked). Create-post, edit-post, and support submit guards wired. Admin Release Gate panel with status view and unlock/re-lock UI (reason + confirm; no auto-run). QA UI fixture 30/30 PASS. No unlock/relock executed in tests. No SQL changes. No deploy. No push.

| Check | Result |
|-------|--------|
| `release-gate-client.js` created | `[x]` |
| Fail-closed client read model | `[x]` |
| `shouldAllowClientBypass` always false | `[x]` |
| create-post submit guard | `[x]` |
| edit-post save guard | `[x]` |
| support/report upload guard | `[x]` |
| Admin lock status panel | `[x]` |
| Unlock/relock UI prepared only | `[x]` — no action in gate tests |
| No auto-publish / queue linkage | `[x]` |
| SQL files changed | `[x]` — none |
| QA UI fixture PASS | `[x]` — 30 checks |
| S+-01 baseline accepted | `[ ]` — P5-E.4 |
| S+-01 production-closed | `[ ]` |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**S+-01 status:** **Frontend/Admin UX baseline implemented**. **Not baseline-accepted.** **Not production-closed.**

**Next candidate:** **P5-E.4 Release Gate Acceptance Sweep**. No push/deploy/launch.

---

## 21. P5-E.4 — Release Gate Acceptance Sweep

**Milestone:** P5-E.4 local acceptance for S+-01 — **baseline accepted**, **not production-closed**, Live-RLS/Live-RPC **NOT TESTED**.

**P5-E.4 acceptance sweep completed locally.** P5-E.2 DB/RLS/RPC SQL baseline and P5-E.3 frontend/admin UX baseline accepted at repository level. All P5 fixtures green (Release Lock UI 30/30, DB 34/34, Sanitization 45/45, Observation 17/17, Notification 24/24). Standard regression smoke PASS. No SQL execution, no Supabase writes, no unlock/relock executed. SQL not applied to any environment.

| Check | Result |
|-------|--------|
| P5-E.2 SQL baseline accepted (repo) | `[x]` |
| `release_gate` default locked accepted | `[x]` |
| missing config = locked accepted | `[x]` |
| Fail-closed helpers accepted | `[x]` |
| Posts/storage restrictive policies accepted | `[x]` |
| `bl_register_observation` release assert accepted | `[x]` |
| P5-E.3 ReleaseGateClient accepted | `[x]` |
| create/edit/support guards accepted | `[x]` |
| Admin panel accepted (unlock not executed) | `[x]` |
| All P5 fixtures PASS | `[x]` |
| Standard regression PASS | `[x]` |
| SQL executed / DB migration | `[x]` — none |
| Live-RLS / Live-RPC tested | `[x]` — NOT TESTED |
| S+-01 baseline accepted | `[x]` |
| S+-01 production-closed | `[ ]` |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**S+-01 status:** **Baseline accepted** at repository level. **Not production-closed.** Staged DB apply remains P5-E.5+ with explicit approval.

**Next candidate (historical):** **P5-F.1 Combined S+ Security Retest Gate** — **complete**. See §22.

---

## 22. P5-F.1 — Combined S+ Security Retest Gate

**Milestone:** P5-F.1 local combined retest — all four S+ baselines re-verified together; **combined baseline retested** at repo level; **not production-closed**.

**P5-F.1 combined S+ security retest completed locally.** All P5-B through P5-E acceptance baselines re-run together. Five P5 fixtures green (Notification 24/24, Observation 17/17, Sanitization 45/45, Release Lock DB 34/34, Release Lock UI 30/30). Standard regression smoke PASS. Static S+ grep checks PASS or explicitly NOT TESTED where out of scope. No SQL execution, no Supabase writes, no data changes, no unlock/relock, no push, no deploy, no launch.

| Check | Result |
|-------|--------|
| S+-02 combined baseline retested | `[x]` |
| S+-04 combined baseline retested | `[x]` |
| S+-03 combined baseline retested | `[x]` |
| S+-01 combined baseline retested | `[x]` |
| All five P5 fixtures PASS | `[x]` |
| Standard regression PASS | `[x]` |
| Static S+ checks PASS / NOT TESTED documented | `[x]` |
| SQL executed / DB migration | `[x]` — none |
| Live-RLS / Live-RPC tested | `[x]` — NOT TESTED |
| S+-01..04 production-closed | `[ ]` |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**S+-01..04 status:** **Combined baseline retested** at repository level. **Not production-closed.** Live-RLS/Live-RPC/storage real enforcement remain NOT TESTED. Staged DB apply remains P5-E.5+ with explicit approval.

**Authoritative report:** `docs/architecture/p5-splus-combined-retest.md`

**Next candidate (historical):** **P5-F.2 Fable Retest Handoff Package** — **complete**. See §23.

---

## 23. P5-F.2 — Fable Retest Handoff Package

**Milestone:** P5-F.2 docs-only handoff — evidence bundle for independent Fable S+ Security Retest; **no Fable retest executed in this gate**.

**P5-F.2 Fable retest handoff package created.** Handoff document, copy-paste prompt, and checklist prepared. S+ combined baseline retest (P5-F.1) handed off for independent verification. No code, SQL, Supabase, data, fixture, push, deploy, or launch changes.

| Check | Result |
|-------|--------|
| `p5-fable-splus-retest-handoff.md` created | `[x]` |
| `p5-fable-splus-retest-prompt.md` created | `[x]` |
| `p5-fable-splus-retest-checklist.md` created | `[x]` |
| S+ status matrix in handoff | `[x]` |
| Evidence file map in handoff | `[x]` |
| Fixture map in handoff | `[x]` |
| Fable test procedure in handoff | `[x]` |
| Required verdict format in handoff | `[x]` |
| Explicit non-claims in handoff | `[x]` |
| SQL executed / Supabase writes | `[x]` — none |
| Fable retest executed | `[x]` — none (handoff only) |
| S+-01..04 production-closed | `[ ]` |
| Live-RLS / Live-RPC | `[x]` — NOT TESTED |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Next candidate:** **Fable Retest 1** (S+ only) using `docs/architecture/p5-fable-splus-retest-prompt.md`. No push/deploy/launch.

---

## 24. P5-E.5 — Staged DB Application & Negative RLS/RPC Tests (BLOCKED)

**Milestone:** P5-E.5 staging apply + negative tests — **BLOCKED** at environment proof; **no SQL applied**.

**P5-E.5 blocked — isolated staging environment not proven.** User approval received for staging-only work, but investigation found exactly one Supabase project (`ohkoojpzmptdfyowdgog`) wired in `js/supabase-config.js` with no separate staging project, no `.env.staging`, no Supabase CLI, and no documented isolated staging ref. Applying P5 SQL would risk the only available remote database (QA content, pending moderation state). No backup, no SQL apply, no negative RLS/RPC/storage tests executed. Local fixtures remain green.

| Check | Result |
|-------|--------|
| User approval staging-only | `[x]` |
| Isolated staging proven | `[ ]` — **BLOCKED** |
| Staging backup/dump | `[ ]` — not attempted |
| SQL files applied | `[ ]` — none |
| S+-02 negative foreign notification insert | `[ ]` — NOT RUN |
| S+-04 negative RPC tests | `[ ]` — NOT RUN |
| S+-01 negative RLS/storage tests | `[ ]` — NOT RUN |
| S+-03 staging stored-content runtime | `[ ]` — NOT RUN |
| Local fixtures still PASS | `[x]` |
| Production closure | `[ ]` — NOT CLOSED |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Authoritative report:** `docs/architecture/p5-staged-db-application-report.md`

**Next:** Provision dedicated staging Supabase project; re-run P5-E.5 with environment proof before SQL. No push/deploy/launch.

---

## 25. P5-STAGING.1 — Dedicated Supabase Staging Provisioning Gate

**Milestone:** P5-STAGING.1 docs-only — staging requirements documented; **no SQL**, **no project creation**, **no secrets committed**.

**P5-STAGING.1 staging environment plan created.** Documents why P5-E.5 was blocked, forbidden project `ohkoojpzmptdfyowdgog`, manual setup checklist, config rules, P5-E.5 re-entry criteria, and stop conditions. Added `.env.staging.example` and gitignored `.env.staging`. No changes to `js/supabase-config.js`, no Supabase writes, no push/deploy/launch.

| Check | Result |
|-------|--------|
| `p5-staging-environment-plan.md` created | `[x]` |
| `.env.staging.example` created (no secrets) | `[x]` |
| `.env.staging` gitignored | `[x]` |
| `ohkoojpzmptdfyowdgog` marked forbidden for P5-E.5 | `[x]` |
| P5-E.5 re-entry criteria documented | `[x]` |
| SQL / DB changes | `[x]` — none |
| Supabase project auto-created | `[x]` — none (manual operator step) |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Authoritative plan:** `docs/architecture/p5-staging-environment-plan.md`

**Next:** Install CLI/psql or approve dashboard SQL; test backup; create test users; explicit P5-E.5 approval. No push/deploy/launch.

---

## 26. P5-STAGING.2 — Environment Proof & Dry Run

**Milestone:** P5-STAGING.2 — local environment proof + dry-run plan; **no SQL**, **no DB mutation**, **no backup/dump**.

**Staging identity proven.** Local `.env.staging` (gitignored) confirms ref `jzzgoiwfbuwiiyvwgwri`, URL `https://jzzgoiwfbuwiiyvwgwri.supabase.co`, DB host `db.jzzgoiwfbuwiiyvwgwri.supabase.co`, `CONFIRM_ISOLATED=true`. No overlap with forbidden `ohkoojpzmptdfyowdgog`. Anon key is `sb_publishable_*` (not `service_role` / `sb_secret_`). No secrets committed.

| Check | Result |
|-------|--------|
| `.env.staging` exists locally | `[x]` |
| `.env.staging` gitignored | `[x]` |
| Staging ref ≠ `ohkoojpzmptdfyowdgog` | `[x]` |
| `CONFIRM_ISOLATED=true` | `[x]` |
| `.env.staging.example` safe | `[x]` |
| Supabase CLI | `[ ]` — not installed |
| `psql` | `[ ]` — not installed |
| Backup/dump tested | `[ ]` — deferred |
| Test users in staging | `[ ]` — not created |
| SQL / RPC / data changes | `[x]` — none |
| Environment Proof | **PASS** |
| Dry Run Readiness | **PARTIAL** |
| P5-E.5 re-run | **BLOCKED** (tooling + prerequisites) |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Authoritative proof:** `docs/architecture/p5-staging-environment-proof.md`

**Next:** Create staging test users → explicit P5-E.5 approval. No push/deploy/launch.

---

## 27. P5-STAGING.3 — Tooling & Backup Dry Run

**Milestone:** P5-STAGING.3 — read-only connection + local `pg_dump`; **no SQL apply**, **no DB mutation**.

| Check | Result |
|-------|--------|
| `psql` / `pg_dump` 18.4 | `[x]` — full path |
| Read-only connection | `[x]` PASS (pooler) |
| Full pre-apply dump | `[x]` — gitignored |
| `backups/` gitignored | `[x]` |
| Legacy ref excluded | `[x]` |
| SQL apply / mutation | `[x]` — none |
| Tooling Readiness | **PASS** |
| Backup Readiness | **PASS** |
| P5-E.5 re-run | **PARTIAL** |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Authoritative report:** `docs/architecture/p5-staging-tooling-backup-dry-run.md`

**Next:** Testusers + explicit P5-E.5 approval. No push/deploy/launch.

---

## 28. P5-STAGING.4 — Staging Test User Provisioning

**Milestone:** P5-STAGING.4 — document staging test users; **no SQL**, **no further user creation**.

| Check | Result |
|-------|--------|
| User A `p5_e5_user_a@example.com` | `[x]` — boundlore-staging |
| User B `p5_e5_user_b@example.com` | `[x]` — boundlore-staging |
| Auto-confirmed | `[x]` |
| Passwords/keys in repo | `[x]` — none |
| `service_role` | `[x]` — not used |
| SQL / data changes in gate | `[x]` — none |
| Test User Provisioning | **PASS** |
| P5-E.5 re-run | **READY FOR USER APPROVAL** |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Authoritative report:** `docs/architecture/p5-staging-test-user-provisioning.md`

**Next:** P5-STAGING.5 base schema on staging → P5-E.5 re-attempt. No push/deploy/launch.

---

## 29. P5-E.5 Re-run — Staged DB Application (BLOCKED)

**Milestone:** P5-E.5 Re-run with explicit user approval — **BLOCKED** at pre-apply schema check.

**P5-E.5 Re-run blocked — BoundLore base schema not provisioned on staging.** Environment proof PASS; pre-apply backup created (`p5-e5-rerun-preapply-20260713-185457.sql`, 169,075 bytes). Staging `public` schema empty (0 tables). Test users confirmed in `auth.users`. No P5 SQL applied. Local fixtures 24/24, 17/17, 45/45, 34/34, 30/30 PASS.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Staging ref only | `[x]` |
| Legacy excluded | `[x]` |
| Pre-apply backup | `[x]` |
| Required base tables | `[ ]` — **missing** |
| SQL apply | `[x]` — none |
| Negative live tests | `[x]` — NOT RUN |
| P5-E.5 Re-run | **BLOCKED** |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Report:** `docs/architecture/p5-staged-db-application-report.md` (Re-run section)

**Next:** Fix foundation ordering → re-run P5-STAGING.6. No push/deploy/launch.

---

## 35. P5-STAGING.6 — Base Schema Apply to Staging (FAIL)

**Milestone:** P5-STAGING.6 — staging apply; **FAIL**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Staging ref only | `[x]` |
| Pre-apply backup | `[x]` 185,427 bytes |
| `core_schema_foundation.sql` apply | `[ ]` **FAIL** |
| Staging `public` unchanged | `[x]` rollback |
| P5 security SQL not applied | `[x]` |
| Test users intact | `[x]` |
| Base Schema Apply (6) | **FAIL** |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staging-base-schema-apply-report.md`

---

## 36. P5-STAGING.6A — Core Schema Reorder Fix (PASS)

**Milestone:** P5-STAGING.6A — local dependency reorder; **PASS**.

| Check | Result |
|-------|--------|
| SQL apply / DB access | `[x]` — none |
| `core_schema_foundation.sql` reordered | `[x]` |
| `wiki_relation_types` before `bl_match_entities` | `[x]` |
| Tables before functions/triggers/policies | `[x]` |
| No INSERT/COPY/secrets/destructive SQL | `[x]` |
| Staging unchanged | `[x]` |
| Core Schema Reorder Fix (6A) | **PASS** |
| Ready for P5-STAGING.6 Re-run | **YES** — explicit approval |
| P5-E.5 re-run | **BLOCKED** until 6 Re-run succeeds |

**Report:** `docs/architecture/p5-core-schema-reorder-fix-report.md`

**Next:** P5-E.5C storage policy fix → Re-run. No push/deploy/launch.

---

## 45. P5-E.5 Re-run 2 — Staged DB Security Retest (BLOCKED)

**Milestone:** P5-E.5 Re-run 2 — storage policy owner error; **BLOCKED**.

| Check | Result |
|-------|--------|
| Pre-apply backup | `[x]` 271,992 bytes |
| Profiles A/B | `[x]` |
| release_gate apply | `[ ]` FAIL |
| Negative tests | `[x]` NOT RUN |
| P5-E.5 Re-run 2 | **BLOCKED** |

**Report:** `docs/architecture/p5-staged-db-security-retest-rerun2-report.md`

---

## 44. P5-E.5B — Staging Testuser Profiles Provisioning (PASS)

**Milestone:** P5-E.5B — two `profiles` on staging; **PASS**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-write backup | `[x]` 271,784 bytes |
| Profiles A/B | `[x]` role `user` |
| P5-E.5 Re-run | **READY** — explicit approval |

**Report:** `docs/architecture/p5-staging-testuser-profiles-report.md`

---

## 43. P5-E.5A — Release Gate SQL Dependency Order Fix (PASS)

**Milestone:** P5-E.5A — local `release_gate_lock.sql` reorder; **PASS**.

| Check | Result |
|-------|--------|
| SQL apply / DB access | `[x]` — none |
| `bl_is_admin_actor` before policies | `[x]` |
| Release Gate SQL Order Fix (5A) | **PASS** |
| Ready for P5-E.5B | **YES** |

**Report:** `docs/architecture/p5-release-gate-sql-order-fix-report.md`

---

## 42. P5-E.5 Re-run — Staged DB Application (BLOCKED)

**Milestone:** P5-E.5 Re-run — SQL apply failed; **BLOCKED**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-apply backup | `[x]` 270,836 bytes |
| Apply 1 notifications | `[x]` PASS |
| Apply 2 release_gate | `[ ]` FAIL |
| Negative RLS/RPC tests | `[x]` NOT RUN |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staged-db-application-rerun-report.md`

---

## 41. P5-STAGING.6 Re-run 3 — Base Schema Apply (PASS)

**Milestone:** P5-STAGING.6 Re-run 3 — staging apply; **PASS**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-apply backup | `[x]` 185,427 bytes |
| 6A/6B/6C validated | `[x]` |
| SQL apply | `[x]` PASS |
| Core 9 tables | `[x]` |
| 84 policies | `[x]` |
| P5 security deferred | `[x]` |
| P5-E.5 re-run | **READY** — explicit approval |

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun3-report.md`

---

## 40. P5-STAGING.6C — Core Schema Policy Reconstruction (PASS)

**Milestone:** P5-STAGING.6C — local policy reconstruction; **PASS**.

| Check | Result |
|-------|--------|
| SQL apply / DB access | `[x]` — none |
| 84 policies reconstructed | `[x]` |
| No truncated EXISTS/USING bodies | `[x]` |
| Core Schema Policy Fix (6C) | **PASS** |
| Ready for P5-STAGING.6 Re-run | **YES** — explicit approval |
| P5-E.5 re-run | **BLOCKED** until apply succeeds |

**Report:** `docs/architecture/p5-core-schema-policy-reconstruction-fix-report.md`

---

## 39. P5-STAGING.6 Re-run 2 — Base Schema Apply (FAIL)

**Milestone:** P5-STAGING.6 Re-run 2 — staging apply; **FAIL**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-apply backup | `[x]` 185,427 bytes |
| 6A/6B on apply path | `[x]` PASS |
| Apply error | truncated `CREATE POLICY` (~line 1641+) |
| Staging unchanged | `[x]` |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun2-report.md`

---

## 38. P5-STAGING.6B — Core Schema Extension Fix (PASS)

**Milestone:** P5-STAGING.6B — local `pg_trgm` extension fix; **PASS**.

| Check | Result |
|-------|--------|
| SQL apply / DB access | `[x]` — none |
| `pg_trgm` before `gin_trgm_ops` indexes | `[x]` |
| No data / secrets / destructive SQL | `[x]` |
| Core Schema Extension Fix (6B) | **PASS** |
| Ready for P5-STAGING.6 Re-run | **YES** — explicit approval |
| P5-E.5 re-run | **BLOCKED** until apply succeeds |

**Report:** `docs/architecture/p5-core-schema-extension-fix-report.md`

---

## 37. P5-STAGING.6 Re-run — Base Schema Apply (FAIL)

**Milestone:** P5-STAGING.6 Re-run — staging apply; **FAIL**.

| Check | Result |
|-------|--------|
| User approval | `[x]` |
| Pre-apply backup | `[x]` 185,427 bytes |
| 6A dependency order on apply | `[x]` PASS |
| Apply error | `pg_trgm` / `gin_trgm_ops` line 660 |
| Staging unchanged | `[x]` |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staging-base-schema-apply-rerun-report.md`

---

## 34. P5-STAGING.5C — Curated Core Schema Extraction (PASS)

**Milestone:** P5-STAGING.5C — extraction only; **PASS**.

| Check | Result |
|-------|--------|
| Raw dump read-only | `[x]` |
| `core_schema_foundation.sql` | `[x]` ~115 KB |
| No data / no DB access | `[x]` |
| Six core tables | `[x]` |
| SQL apply | `[x]` — none |
| Curated Extraction (5C) | **PASS** |
| Ready for P5-STAGING.6 | **YES** |

**Report:** `docs/architecture/p5-curated-core-schema-extraction-report.md`

---

## 33. P5-STAGING.5B Re-run — Legacy Schema-Only Export (PASS)

**Milestone:** P5-STAGING.5B re-run — read-only schema-only export; **PASS**.

| Check | Result |
|-------|--------|
| `.env.legacy` local | `[x]` |
| Legacy ref `ohkoojpzmptdfyowdgog` | `[x]` |
| Staging `jzzgoiwfbuwiiyvwgwri` excluded | `[x]` |
| `pg_dump --schema-only --schema=public` | `[x]` |
| Dump size | 138,895 bytes |
| No-data verification | `[x]` PASS |
| Core tables in dump | `[x]` all six |
| SQL apply / staging mutation | `[x]` — none |
| Legacy Export (5B) | **PASS** |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-legacy-schema-only-export-report.md`

**Next:** P5-STAGING.5C. No push/deploy/launch.

---

## 32. P5-STAGING.5B — Legacy Schema-Only Export (BLOCKED — first attempt)

**Milestone:** P5-STAGING.5B — user approval granted; **BLOCKED** at `.env.legacy` check.

| Check | Result |
|-------|--------|
| User approval for 5B | `[x]` |
| `.env.legacy` local | `[ ]` — **missing** |
| `.env.legacy` gitignored | `[x]` |
| `.env.legacy.example` | `[x]` |
| Legacy ref `ohkoojpzmptdfyowdgog` | Intended — not connected |
| Staging `jzzgoiwfbuwiiyvwgwri` excluded | `[x]` |
| `pg_dump --schema-only --schema=public` | `[x]` — **not run** |
| Dump under `backups/legacy-schema-only/` | N/A |
| SQL apply / data export | `[x]` — none |
| Legacy Export (5B) | **BLOCKED** |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-legacy-schema-only-export-report.md`

**Next:** Create `.env.legacy` locally → re-run P5-STAGING.5B → 5C → P5-STAGING.6. No push/deploy/launch.

---

## 31. P5-STAGING.5A — Legacy Schema-Only Export Plan

**Milestone:** P5-STAGING.5A — Path A export plan; **no export**, **no DB access**.

| Check | Result |
|-------|--------|
| User chose schema-only export path | `[x]` |
| Legacy source `ohkoojpzmptdfyowdgog` documented | `[x]` |
| Staging `jzzgoiwfbuwiiyvwgwri` not touched | `[x]` |
| `--schema-only` required | `[x]` |
| Hard stops documented | `[x]` |
| Curated target `core_schema_foundation.sql` planned | `[x]` |
| Export/pg_dump executed | `[x]` — none |
| Legacy Export Plan | **PASS** |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-legacy-schema-only-export-plan.md`

**Next:** Explicit approval → P5-STAGING.5B. No push/deploy/launch.

---

## 30. P5-STAGING.5 — Base Schema Provisioning Plan

**Milestone:** P5-STAGING.5 — SQL inventory + dependency map; **no SQL**.

| Check | Result |
|-------|--------|
| 21 SQL files inventoried | `[x]` |
| `CREATE TABLE public.posts` | `[ ]` — **not in repo** |
| `CREATE TABLE public.profiles` | `[ ]` — **not in repo** |
| `CREATE TABLE notifications` | `[x]` |
| `CREATE TABLE user_submission_acks` | `[x]` |
| `CREATE TABLE wiki_entities` | `[x]` |
| Destructive SQL excluded | `[x]` |
| Base Schema Plan | **PARTIAL** |
| P5-E.5 re-run | **BLOCKED** |

**Report:** `docs/architecture/p5-staging-base-schema-provisioning-plan.md`

---

## Appendix A — Related architecture docs

| Document | Relevance |
|----------|-----------|
| `docs/architecture/p5-staging-base-schema-apply-report.md` | P5-STAGING.6 apply report (FAIL) |
| `docs/architecture/p5-legacy-schema-only-export-plan.md` | P5-STAGING.5A legacy export plan |
| `docs/architecture/p5-staging-base-schema-provisioning-plan.md` | P5-STAGING.5 base schema plan |
| `docs/architecture/p5-staging-test-user-provisioning.md` | P5-STAGING.4 test users |
| `docs/architecture/p5-staging-tooling-backup-dry-run.md` | P5-STAGING.3 tooling & backup |
| `docs/architecture/p5-staging-environment-proof.md` | P5-STAGING.2 environment proof |
| `docs/architecture/p5-staging-environment-plan.md` | P5-STAGING.1 dedicated staging plan |
| `docs/architecture/p5-staged-db-application-report.md` | P5-E.5 staged DB apply report (BLOCKED) |
| `docs/architecture/p5-fable-splus-retest-handoff.md` | P5-F.2 Fable S+ retest handoff (authoritative for F.2) |
| `docs/architecture/p5-fable-splus-retest-prompt.md` | Copy-paste prompt for Fable Retest 1 |
| `docs/architecture/p5-fable-splus-retest-checklist.md` | Short Fable execution checklist |
| `docs/architecture/p5-splus-combined-retest.md` | P5-F.1 combined S+ retest report (authoritative for F.1) |
| `docs/architecture/p5-release-lock-plan.md` | P5-E.1 release lock architecture (authoritative for E.2+) |
| `docs/architecture/current-code-gap-notes.md` §85–§93 | P5-A through P5-E.1 gate records |
| `docs/architecture/moderation-conflict-matrix.md` | Conflict handling must remain untouched during P5 |
| `docs/architecture/entity-promotion-policy.md` | No auto-promotion during security fixes |
| `docs/architecture/graph-relations-spec.md` | Relation registry unchanged in P5 |
| `qa/e2e-content-matrix.md` | P5-A.1 planning entry + future acceptance rows |
| `supabase/PRE_RELEASE_RESET_README.md` | Reset window separate from P5 security gates |
| `docs/architecture/pr-checklist.md` | Cache-bust, no QA snapshot commit, regression flows |

## Appendix B — S-blocker backlog (post–S+, not P5-A scope)

For planning continuity — remediated after P5-F, before Product-Activation retest:

| ID | Title | Priority |
|----|-------|----------|
| S-05 | CSR entity pages / SEO shells | S |
| S-06 | Search recall (`monster` → 0) | S |
| S-07 | Backup/restore not evidenced | S |
| S-08 | Monitoring/error-tracking missing | S |
| S-09 | Patch-mode fail-open + create-post not loaded | S (partially addressed by P5-E) |
| S-10 | Base RLS not in repo — live verification required | S |

---

*Document version: P5-A.2 planning acceptance sweep accepted. No implementation. No SQL executed.*
