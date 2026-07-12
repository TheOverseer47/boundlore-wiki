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
| **S+-02** | Cross-User-Notification-Injection | S+ | HIGH | **BASELINE IMPLEMENTED (P5-B.1)** — acceptance pending P5-B.2 | `supabase/admin_dashboard_notifications.sql`, `js/notifications.js`, `js/auth-nav.js`, `js/notification-url-safety.js` | **Ja** | INSERT nur eigene `user_id`; `target_url` scheme-safe |
| **S+-04** | RPC Gate Bypass (`bl_register_observation`) | S+ | MEDIUM–HIGH | VERIFIED FAIL (code) | `supabase/phase_a_observations_foundation.sql`, `js/discovery-core.js` | **Ja** | Tutorial-Ack + Release-Lock in RPC; kein Definer-Write ohne Gate |
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
| **P5-B.1** | Notification Injection Fix Baseline | Code + SQL | **Baseline implemented** — RLS policy file prepared; client insert guard; `target_url` validation in `notifications.js` + `auth-nav.js` + `notification-url-safety.js` |
| **P5-B.2** | Notification Injection Acceptance Sweep | Test | RLS negative test; UI regression; scheme corpus — **next** |

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
| **P5-C.1** | Observation RPC Gate Fix Baseline | SQL + optional JS | `bl_register_observation`: explicit tutorial-ack check; release-lock placeholder/hook; `search_path` verified |
| **P5-C.2** | Observation RPC Gate Acceptance Sweep | Test | RPC negative tests without ack; with lock (after P5-E) |

**Betroffene Dateien (planned):**

- `supabase/phase_a_observations_foundation.sql` (or additive fix migration)
- `js/discovery-core.js` (client error handling only if needed)

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

**Handoff package (P5-F.2):**

- Gate reports P5-B.2, P5-C.2, P5-D.2, P5-E.4, P5-F.1
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
| **Complete** | P5-B.1 | Code + SQL baseline | S+-02 baseline implemented; see §12 — **not accepted until P5-B.2** |
| **Next** | P5-B.2 | Test acceptance sweep | RLS negative test; UI regression; scheme corpus |
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
| Live RLS applied / tested | `[ ]` — deferred to P5-B.2 |
| S+-02 final accepted | `[ ]` — P5-B.2 only |
| Push / deploy / Supabase writes | `[x]` — none |
| Product-Activation-Ready | FAIL |
| Public-Launch-Ready | **NO-GO** |

**Next candidate:** **P5-B.2 Notification Injection Acceptance Sweep**. No push/deploy/launch.

---

## Appendix A — Related architecture docs

| Document | Relevance |
|----------|-----------|
| `docs/architecture/current-code-gap-notes.md` §85–§87 | P5-A.1 / P5-A.2 / P5-B.1 gate records |
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
