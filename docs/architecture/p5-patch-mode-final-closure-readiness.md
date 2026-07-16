# P5-E.9G.9A — S-09 Patch-Mode Final Closure Readiness

## 1. Executive Result

S-09 is **not** closed. On this review lineage (`ae5fec7`), `js/patch-mode.js` and `js/release-gate-client.js` are **absent**, so required user-content submit surfaces have **no** Patch-Mode guard (`NO_GUARD`).

A fail-open Patch-Mode implementation exists on local `main` (first seen `4372fba`): on DB/network/missing-row errors it sets `enabled: false` / `available: false`, and `assertCanSubmit()` treats that as allow. Create-post guards are optional (`typeof WikiPatchMode !== "undefined"`). Create-post does not statically load the Patch-Mode script; loading is deferred via `supabase-config.js`, enabling race / no-op paths.

Production already has table `public.wiki_patch_mode` (singleton row, currently `enabled = false`). No Production schema change is required for a frontend fail-closed fix. Server `release_gate` remains the security boundary and must not be treated as S-09 PASS.

**Readiness verdict:** `CONDITIONALLY_SAFE_PATCH_MODE_SCOPE_DECISION_REQUIRED`  
(Open product decisions: Reports and Account/Profile during Patch-Mode. Technical minimal fix path is otherwise clear.)

Application code change, Supabase mutation, push, deploy, product activation: **NOT AUTHORIZED** in this gate.

## 2. Scope and Read-only Boundary

| Allowed | Performed |
|---|---|
| Git read-only / new local review branch | Yes |
| Tracked file read / static analysis | Yes |
| Local isolated harness outside repo | Yes (`%TEMP%\boundlore-e9g9a-patch-tests`) |
| Production read-only catalog SELECT | Yes (`ohkoojpzmptdfyowdgog` only) |
| Exactly one audit doc + local commit | Yes |

| Forbidden | Status |
|---|---|
| App JS/HTML/CSS/SQL/Function edits | Not performed |
| SQL apply / migrations / writes | Not performed |
| Push / PR / merge / deploy / unlock | Not performed |
| Opening `.env*`, backups, dumps, real fixtures | Not performed |

## 3. Git Baseline

| Item | Value |
|---|---|
| Expected baseline branch | `review/p5-e9g8e6-final-release-lock-audit` |
| Expected HEAD | `ae5fec7` |
| Observed HEAD (full) | `ae5fec7ecd1b31f4ac7d6503b13329e49a128112` |
| Review branch created | `review/p5-e9g9a-patch-mode-readiness` |
| Preflight tracked dirt | None (known untracked artefacts left untouched) |
| Push | None |

## 4. Fable-5 S-09 Requirement

| Requirement | Meaning |
|---|---|
| Fail-closed | Missing/null/error/timeout/offline/no-client → block submit |
| Wired | All required user-content submit pages load Patch-Mode before mutation |
| Guard mandatory | No optional / no-op `assertCanSubmit` |
| UX layer only | Server release-lock remains authoritative |
| Not a substitute | Closed S+-01 / S-10 must not excuse fail-open Patch-Mode |

## 5. Current Patch-Mode Architecture

### Lineage A — this review HEAD (`ae5fec7`)

| Asset | Present |
|---|---|
| `js/patch-mode.js` | **No** |
| `js/release-gate-client.js` | **No** |
| `supabase/wiki_patch_mode.sql` | **No** |
| Create-post Patch / release-gate script tags | **No** |
| `WikiPatchMode` / `assertCanSubmit` in `js/create-post.js` | **No** |

Documented previously in discovery forensics: create-post loads `create-post.js` only; no Patch-Mode / release-gate client guard.

### Lineage B — local `main` (ahead of `origin/main`; blob via `4372fba`)

| Asset | Role |
|---|---|
| `js/patch-mode.js` | `window.WikiPatchMode` IIFE: fetch `wiki_patch_mode`, maintenance overlay, `assertCanSubmit`, admin `updatePatchMode` |
| `js/supabase-config.js` | Dynamic deferred inject of `/js/patch-mode.js?v=1` if marker missing |
| Static script tags | `index`, `wiki/browse`, `wiki/post`, `wiki/search` |
| `js/release-gate-client.js` | Separate fail-closed UX for `release_gate` (not Patch-Mode) |
| `supabase/wiki_patch_mode.sql` | Creates singleton table + SELECT-all / admin UPDATE policies |

`origin/main` does **not** contain `js/patch-mode.js` (local `main` is far ahead). Authoring for S-09 must target the frontend lineage that will actually ship.

## 6. Configuration Source

| Question | Answer |
|---|---|
| Truth source | `public.wiki_patch_mode` singleton `id = 1`, column `enabled` |
| Client read | `supabase.from("wiki_patch_mode").select(...).eq("id", 1).maybeSingle()` |
| Project ref used for catalog | Production `ohkoojpzmptdfyowdgog` only |
| Staging used | No |
| Table exists in Production | **Yes** (`to_regclass` → `wiki_patch_mode`) |
| Columns | `id`, `enabled` (NOT NULL), `public_message`, `reason`, `expected_until`, `updated_at`, `updated_by` |
| Row aggregate | `row_count=1`, `enabled_true_count=0`, `enabled_false_count=1` |
| Policies | `wiki_patch_mode_select_all` (SELECT), `wiki_patch_mode_admin_update` (UPDATE) |
| Cache | 15s shared timestamp for state + access (`CACHE_MS = 15000`) |
| Client manipulable | Yes (client UX only); server release-gate / RLS remain authoritative |
| Changes `release_gate` | **No** (separate table/API) |

No full Production row contents documented beyond aggregates.

## 7. Default and Loading State

| Phase | Lineage A (HEAD) | Lineage B (`main` patch-mode) | Required S-09 |
|---|---|---|---|
| Before script load | No guard | `bl-patch-check-pending` class only | Block submits |
| Script missing | Silent allow | Optional create-post guard skipped | Block / no active surface |
| Loading | n/a | Pending class; enforce async | Block until known |
| Success, enabled=true | n/a | Maintenance overlay / assert deny | Block |
| Success, enabled=false | n/a | Allow | Allow to server gate |

## 8. Error / Offline / Timeout Behavior

From `main:js/patch-mode.js` `fetchState` fallback:

```text
fallback = { enabled: false, available: false, ... }
```

Used when `error`, missing row, or thrown exception. `assertCanSubmit` then:

```text
if (!state.enabled) return { ok: true };  // FAIL_OPEN
```

`enforce().catch` removes `bl-patch-check-pending` without forcing a maintenance/deny UX.

| Scenario | Current (`main`) | Required |
|---|---|---|
| Missing row | FAIL_OPEN | SAFE_DENY |
| NULL / invalid enabled | coerced / allow paths | SAFE_DENY |
| Network / DB error | FAIL_OPEN | SAFE_DENY |
| Timeout (as fetch error) | FAIL_OPEN | SAFE_DENY |
| Offline | FAIL_OPEN | SAFE_DENY |
| Supabase missing | catch → FAIL_OPEN | SAFE_DENY |
| enforce exception | pending cleared, no block | SAFE_DENY |

Contrast: `main:js/release-gate-client.js` defaults **locked** on missing/error (`getDefaultLockedState`) — correct fail-closed pattern to mirror for Patch-Mode.

## 9. Patch-Mode Function Inventory

| Datei | Funktion/Klasse | Konfigurationsquelle | Default | Fehlerfallback | Bereitschaftssignal | Submit-Guard | Cache | Risiko |
|---|---|---|---|---|---|---|---|---|
| `main:js/patch-mode.js` | `WikiPatchMode.fetchState` | Supabase `wiki_patch_mode` | enabled false / available false | **allow** | `window.__boundlorePatchMode` after enforce | async `assertCanSubmit` | 15s | **High — fail-open** |
| `main:js/patch-mode.js` | `WikiPatchMode.assertCanSubmit` | via fetchState(force) | allow if !enabled | **allow** | none dedicated | async | 15s | **High** |
| `main:js/patch-mode.js` | `WikiPatchMode.enforce` | same | n/a | catch clears pending | DOM class / overlay | page-level | 15s | Medium |
| `main:js/patch-mode.js` | `updatePatchMode` | admin UPDATE | n/a | throw | cache invalidate | n/a | n/a | Admin-only write API in client |
| `main:js/supabase-config.js` | `loadWikiPatchModeGuard` | static URL inject | deferred script | none | marker attr | none | n/a | Race vs page modules |
| `main:js/create-post.js` | optional WikiPatchMode calls | global | skip if undefined | no-op | none | optional | n/a | **High — NO_GUARD** |
| `main:js/release-gate-client.js` | Release gate UX | `release_gate` | locked | deny | notices/forms | fail-closed assert | 15s | Separate layer (good pattern) |
| HEAD `js/create-post.js` | `handleSubmit` | none | allow to server | n/a | none | **none** | n/a | **High — NO_GUARD** |
| Production `wiki_patch_mode` | table | DB singleton | enabled false DDL | n/a | n/a | n/a | n/a | Config OK; needs fail-closed client |

No second conflicting Patch-Mode implementation found beyond Lineage A absence vs Lineage B fail-open.

## 10. Complete Active Write-Surface Inventory

Surfaces found on **this HEAD** via tracked JS mutation search:

| Surface | Module | Mutation | Target | Role | Patch loaded (HEAD) | Server release-gate | Classification |
|---|---|---|---|---|---|---|---|
| Create Post | `js/create-post.js` | insert + storage upload | `posts`, `discovery-uploads` | user | **No** | Yes (S+-01/S-10) | `PATCH_MODE_REQUIRED_USER_CONTENT` |
| Discovery upload (within create) | same | `.upload` | `discovery-uploads` | user | **No** | Yes (runtime denial proven) | `PATCH_MODE_REQUIRED_USER_CONTENT` |
| Edit Post | `js/edit-post.js` | update | `posts` | owner/user | **No** | Yes (restrictive UPDATE) | `PATCH_MODE_REQUIRED_USER_CONTENT` |
| Comments | `js/post-detail.js` | insert/update/delete | `comments` | user | **No** | INSERT yes; UPDATE/DELETE carry-forward risk | `PATCH_MODE_REQUIRED_USER_CONTENT` |
| Reactions | `js/post-detail.js` | insert/update/delete | `post_reactions` | user | **No** | Yes for create paths | `PATCH_MODE_REQUIRED_USER_CONTENT` |
| Ratings (legacy module) | `js/post-interactions.js` | ratings/comments/reports | various | user | Not wired on post page (post uses post-detail) | varies | `LEGACY_UNUSED` / verify if any HTML still loads |
| Guild apply | `js/guilds-apply.js` | insert | `posts` | user | **No** | Yes | `PATCH_MODE_REQUIRED_USER_CONTENT` |
| Support report | `js/support.js` | insert + upload | `reports`, `report-screenshots` | user | **No** | Not discovery lock | **Scope decision** |
| Community hub report | `js/community-hub.js` | insert | `reports` | user | depends page wiring | n/a | **Scope decision** |
| Account avatar | `wiki/account/index.html` | profiles update | `profiles` | user | **No** | profile integrity separate | **Scope decision** |
| Password reset mail / delete request | account HTML | auth APIs | Auth | user | **No** | n/a | `PROFILE_OR_ACCOUNT_MAINTENANCE` / keep available |
| Submit tutorial ack | `js/submit-tutorial.js` | `auth.updateUser` metadata | Auth metadata | user | **No** | prerequisite for posts | `PATCH_MODE_REQUIRED_USER_CONTENT` (gate to submit) |
| My posts delete | `js/my-posts.js` | delete | `posts` | owner | **No** | server policies | `PATCH_MODE_REQUIRED_USER_CONTENT` |
| Notifications | `js/notifications.js` | update/insert | `notifications` | user/system | **No** | n/a | `SHOULD_REMAIN_AVAILABLE_DURING_PATCH` (read markers) |
| Admin moderation / seed-local | admin HTML / `admin-seed-local.js` | profiles/posts | admin | admin | Admin must stay reachable | admin bypass helpers | `ADMIN_ONLY` |
| Contribute Formspree | `js/main.js` | external POST | Formspree | public | n/a | external | `UNKNOWN_REQUIRES_DECISION` / not Supabase UGC |
| `bl_register_observation` | SQL hardened; no HEAD JS `.rpc` caller found | RPC | observations | user | n/a on HEAD UI | Yes | If UI reintroduced from `main`, mark required |

## 11. Required Patch-Mode Surface Classification

| Classification | Surfaces |
|---|---|
| `PATCH_MODE_REQUIRED_USER_CONTENT` | create-post (+ discovery upload), edit-post, comments, reactions, guild apply, my-posts delete, submit-tutorial (as submit gate) |
| `ADMIN_ONLY` | admin unlock/re-lock, moderation, seed-local — **must remain reachable** |
| `SHOULD_REMAIN_AVAILABLE_DURING_PATCH` | login, reset-password, notifications mark-read (recommended) |
| `PROFILE_OR_ACCOUNT_MAINTENANCE` | avatar update, password reset email — **decision required** |
| Report paths | support + hub reports + screenshots — **decision required** |
| `LEGACY_UNUSED` | confirm `post-interactions.js` not loaded by live pages before ignoring |

**Recommended defaults (awaiting user confirmation):**

- Reports + screenshots: **remain available** during Patch-Mode (incident path); still subject to RLS; do not rely on Patch-Mode as security.
- Profile avatar: remain available; content UGC still blocked.
- Account security (reset/delete request): remain available.
- Admin recovery / release-gate controls: remain available (exempt paths).

## 12. Script Wiring Matrix

| Seite | Mutationsmodul | Patch-Script geladen | Reihenfolge sicher | Guard vorhanden | Fail-closed | Verdict |
|---|---|---:|---:|---:|---:|---|
| HEAD `wiki/create-post/` | `create-post.js` | No | n/a | No | No | **FAIL** |
| HEAD `wiki/edit-post/` | `edit-post.js` | No | n/a | No | No | **FAIL** |
| HEAD `wiki/post/` | `post-detail.js` | No | n/a | No | No | **FAIL** |
| HEAD `wiki/support/` | `support.js` | No | n/a | No | n/a (scope) | Scope |
| HEAD `wiki/guilds/` | `guilds-apply.js` | No | n/a | No | No | **FAIL** |
| HEAD `wiki/submit-tutorial/` | `submit-tutorial.js` | No | n/a | No | No | **FAIL** |
| HEAD `wiki/account/` | inline | No | n/a | No | n/a (scope) | Scope |
| HEAD `wiki/admin/` | inline | No (and no patch panel on HEAD) | n/a | Admin recovery via other means | n/a | Keep recovery |
| `main` create-post | `create-post.js` | Dynamic deferred only | **No** | Optional typeof | **No** | **FAIL** |
| `main` post/browse/search/index | overlay enforce | Static tag yes | Better for browse | Overlay when enabled | Error path fail-open | **FAIL** on errors |
| `main` edit-post | release-gate client only | Patch via dynamic config | Weak | Release-gate optional if missing | Release-gate fail-closed; Patch optional | Partial |

## 13. Submit Guard Matrix

| Path | Guard style | If global missing | Enter/submit | Double-click | Immediate pre-mutation recheck |
|---|---|---|---|---|---|
| HEAD create-post | none | allow | form submit proceeds | button disable only after start | no Patch check |
| `main` create-post | optional `assertCanSubmit` | allow (else-if blocked flag only if enforce ran) | same | partial | force refresh inside assert when present |
| `main` assertCanSubmit | async | n/a | n/a | n/a | force fetch; still fail-open on errors |
| `main` release-gate assert | fail-closed | optional skip if client undefined | form-level when applied | form disable helpers | yes when client present |

## 14. Current Local Runtime Evidence

| Evidence | Result |
|---|---|
| Static read of `main:js/patch-mode.js` exported to TEMP | Fail-open fallback confirmed |
| PowerShell semantic matrix mirroring fetch/assert | See §15 |
| Isolated harness HTML served `http://127.0.0.1:8769/` | HTTP 200; no Production calls |
| Browser DOM against live create-post | Not required for absence proof; HEAD has no script to load |
| Production writes | None |

Harness path (untracked, outside repo): `%TEMP%\boundlore-e9g9a-patch-tests\`.

## 15. Fail-Closed Test Matrix

| Scenario | Current Result | Required Result | PASS/FAIL |
|---|---|---|---|
| Mode active | SAFE_DENY (when script present) | block | PASS (logic only) |
| Mode inactive + loaded | VERIFIED_ALLOW | allow to server gate | PASS |
| Loading | pending UX only / HEAD none | block | FAIL |
| Missing config | FAIL_OPEN | block | FAIL |
| NULL enabled | VERIFIED_ALLOW / coerce | block | FAIL |
| Network error | FAIL_OPEN | block | FAIL |
| Timeout | FAIL_OPEN | block | FAIL |
| Offline | FAIL_OPEN | block | FAIL |
| Supabase missing | FAIL_OPEN | block | FAIL |
| Script missing (HEAD / optional) | NO_GUARD | block / no active surface | FAIL |
| Enter submit | unguarded when script missing | block when unavailable | FAIL |
| Double submit | weak / local disable only | one request max under deny | FAIL / UNKNOWN |
| Stale 15s cache “off” | possible allow while mode flipped on | revalidate or deny unknown | FAIL |
| Pageshow before load complete | race | block | FAIL |

## 16. UX and Accessibility Assessment

| Topic | HEAD | `main` Patch-Mode | Gap vs S-09 |
|---|---|---|---|
| Submit disabled before config ready | No | Pending class only; submits may still run if guard optional | Need hard disable + ready flag |
| Clear Patch-Mode message | n/a | Maintenance overlay when enabled+known | Keep; add config-error copy distinct from maintenance |
| Config error message | n/a | console warn only | Required |
| Keyboard submit | form native | overlay hides UI when enforced | Must block before overlay if loading/error |
| Upload selection vs final submit | create-post uploads during submit | n/a on HEAD guard | Block both under deny |
| `aria-disabled` / status | not Patch-aware | overlay not fully a11y-specified | Add in 9B |
| Crash without Supabase | create-post will error on use | patch catch fail-open | Fail-closed without crash |
| Read-only navigation | yes | overlay blocks non-exempt when enabled | Preserve browse when policy is submissions-only if chosen |

## 17. Release-Gate Interaction

| Layer | Role |
|---|---|
| Patch-Mode | Operations / UX maintenance layer |
| `public.release_gate` + RLS/RPC/Storage | Authoritative security boundary |

| Patch Mode | Contribution Lock | UI (required) | Server |
|---|---|---|---|
| active | true | block | deny |
| active | false | block | allow (UI prevents) |
| inactive | true | normal / read-only UX | deny |
| inactive | false | allow | allow |
| unknown/error | any | **block** | release-gate additionally |

| Check | Result |
|---|---|
| Patch-Mode is security boundary | **NO** |
| Server release-gate remains authoritative | **YES** (S+-01 / S-10 closed) |
| Patch-Mode mutates release_gate | **NO** |
| Unlock coupling / product activation | **None observed** |
| Production config change required for S-09 | **No** (table exists; frontend fix sufficient) |

## 18. Admin Recovery Availability

| Need | Assessment |
|---|---|
| Admin must re-lock / unlock release gate | Must remain available; Patch-Mode must not block `/wiki/admin/` |
| `main` EXEMPT_PATH_PREFIXES includes `/wiki/admin/`, `/wiki/login/`, `/wiki/reset-password/` | Correct pattern — preserve |
| HEAD admin page | No `wiki_patch_mode` panel found; release-gate admin UX also absent on this minimal lineage — recovery still via DB/admin tooling; do not couple Patch-Mode to hide admin |
| Admin bypass role in `main` patch-mode | `BYPASS_ROLES = ["admin"]` — keep for Patch UX only; server still enforces admin checks |

## 19. Report / Account / Profile Scope Assessment

| Topic | Recommendation | Rationale |
|---|---|---|
| Reports during patch | **Allow** (product decision) | Incident reporting during maintenance |
| Report screenshots | **Allow** with reports | Evidence for incidents; not discovery UGC |
| Profile avatar update | **Allow** | Account maintenance, not lore UGC |
| Password reset / login | **Allow** | Already exempt on `main`; required for recovery |
| Account delete request | **Allow** | Safety / GDPR-style path |
| Blocking all of `/wiki/support` via full-page overlay | Avoid if reports allowed | Prefer path exempt or submissions-only mode |

**This gate does not implement these decisions.** They gate the exact 9B wiring list.

## 20. Architecture Preservation Assessment

| Question | Answer |
|---|---|
| New table required | **No** (`wiki_patch_mode` exists) |
| New policy required | **No** for S-09 frontend closure |
| New role required | **No** |
| New dependency / CDN | **No** |
| Runtime switch / product activation | **No** |
| Change release-gate model | **No** |
| Prefer central API rename | Optional conceptual wrappers only; **small fix preferred** over new framework |
| Keep existing Patch-Mode shape | **Yes** — fix defaults, ready-state, mandatory guards, wiring |

Preferred minimal approach: port/adapt `WikiPatchMode` from local `main`, change fallback to deny, add explicit ready/known flags, make guards mandatory on required pages, disable forms while unknown, add local QA fixtures. Do not invent a second system.

## 21. Minimal Required Change List

### A. Mandatory for S-09

| Datei | Problem | minimale Änderung | Test | Rollback |
|---|---|---|---|---|
| `js/patch-mode.js` (add or port) | Absent on HEAD; fail-open on `main` | Fail-closed fallback; `known`/`ready`; deny assert on !known; safe enforce catch | semantic + UI fixtures | delete/revert file |
| `js/supabase-config.js` | No loader on HEAD; deferred race on `main` | Deterministic load order or explicit page tags; no fail-open | wiring fixtures | revert loader |
| `wiki/create-post/index.html` | No patch script | Load patch (and ensure before create-post) | static order check | revert tag |
| `js/create-post.js` | No / optional guard | Mandatory assert + disable submit until ready | submit/enter/dblclick fixtures | revert guards |
| `wiki/edit-post/index.html` + `js/edit-post.js` | Unguarded | Same mandatory pattern | edit fixtures | revert |
| `wiki/post/index.html` + `js/post-detail.js` | Comments/reactions unguarded | Load patch; guard mutation paths or submissions-only enforce | comment/reaction fixtures | revert |
| `js/guilds-apply.js` (+ page) | posts insert | Mandatory guard | guild fixture | revert |
| `wiki/submit-tutorial/` wiring | Submit gate path | Block while patch unknown/active per policy | tutorial fixture | revert |
| `qa/*patch-mode*` fixtures (new tracked in 9B) | Missing | Local fail-closed matrix | QA PASS | delete fixtures |
| short architecture note update in 9B | S-09 status | Document closure evidence | review | revert doc |

### B. Sensible, non-blocking

| Item | Note |
|---|---|
| Distinct maintenance vs config-error copy | UX clarity |
| `aria-disabled` / live region | a11y |
| Separate cache timestamps for state vs access | reduce stale races |
| Align notices with release-gate client patterns | consistency |

### C. Out of scope

| Item |
|---|
| New tables / policies / roles |
| Product activation / public launch |
| S-07 backup / S-08 monitoring |
| Large UI redesign / framework migration |
| Changing Production `contribution_locked` |
| Fixing Comments UPDATE/DELETE under lock (carry-forward risk, not S-09) |
| Discovery Storage UPDATE/DELETE hygiene (carry-forward) |

## 22. Required QA Fixtures

| Fixture theme | Coverage |
|---|---|
| Semantic fail-closed matrix | missing/null/error/timeout/offline/no-client/loading/active/inactive |
| Wiring order | required HTML pages include script before mutation module |
| Mandatory guard | missing global → deny (not skip) |
| Enter key + double submit | no mutation when blocked |
| Stale cache | force revalidate on assert |
| No Production network | stub supabase |
| Admin exempt | admin path not trapped |
| Reports/account | match decided classification |

## 23. Required Regression Tests

| Area | Check |
|---|---|
| Routing / SSG / entity links | existing P5 route/SSG checks still PASS |
| Auth shells | login/reset still load |
| Search / browse read paths | remain usable when patch inactive or submissions-only |
| Release-gate client (if present on target lineage) | still fail-closed; no unlock side effects |
| Create-post tutorial gate | still required independently |
| Console | no new uncaught exceptions on guarded pages without supabase |

## 24. Required Preview Evidence

| Item | Requirement |
|---|---|
| Non-main preview | PASS after frontend fix ships |
| Preview noindex | retained |
| No push to main | enforced |
| No Production deploy | enforced |
| No Product Activation | FAIL remains until later gates |

## 25. Acceptance Criteria

S-09 may close only when all hold:

1. Patch active → required UGC submits blocked  
2. Missing config → blocked  
3. NULL/invalid → blocked  
4. Network error → blocked  
5. Timeout → blocked  
6. Offline → blocked  
7. Supabase missing → blocked  
8. Loading/unknown → blocked  
9. Script order safe on all required pages  
10. No optional/no-op guard  
11. Enter submit blocked when unavailable  
12. Double-click does not create second mutation under deny  
13. Read-only browsing remains available per policy  
14. Admin recovery / re-lock reachable  
15. Reports/account follow **explicit** classification decision  
16. Release-gate unchanged by Patch-Mode  
17. No Production mutation for closure  
18. No routing/search/SSG/auth-shell regression  
19. Local fixtures PASS  
20. Non-main preview PASS if Production frontend affected  
21. Preview noindex  
22. No push to main  
23. No Production deploy  
24. No new security console exceptions  

## 26. Rollback Design

| Step | Action |
|---|---|
| Code | Revert 9B commit(s) on review branch |
| Config | No Production toggle required for rollback of fail-closed client |
| DB | Leave `wiki_patch_mode` row untouched |
| Feature flag | Not required if change is pure client semantics |
| Verification | Re-run fixtures; confirm no deploy occurred |

## 27. Risks and Stop Conditions

| Stop condition | Observed? |
|---|---|
| Unknown second Patch-Mode implementation | No (absence vs one fail-open) |
| Multiple conflicting config sources | No — single table |
| Patch-Mode changes release-lock server-side | No |
| Uninventoriable active submit page | No for HEAD; Formspree contribute noted |
| Service-role in frontend | Not indicated for Patch-Mode |
| Secrets committed by this gate | No |
| Fix needs new Production table/policy | No |
| Product activation coupling | No |
| Patch coupled to block admin recovery | Avoid in 9B |
| Production/staging ref mix | Avoided (prod catalog only) |
| Unexpected tracked changes this gate | Doc only |
| Local tests would write Production | Avoided |

Carry-forward (not S-09 blockers): Comments UPDATE/DELETE under lock; Discovery Storage UPDATE/DELETE; `release_gate` TRUNCATE grant hygiene; open A+ items; S-07; S-08.

## 28. Final Readiness Decision

**`CONDITIONALLY_SAFE_PATCH_MODE_SCOPE_DECISION_REQUIRED`**

Technical path to minimal fail-closed Patch-Mode + submit wiring is understood and architecture-preserving. Authoring must wait for explicit classification of:

1. Reports (+ screenshots) during Patch-Mode  
2. Profile / account maintenance during Patch-Mode  

Also confirm target frontend lineage for 9B (this review chain vs local `main` contribution stack), then proceed to:

**P5-E.9G.9B — Minimal Patch-Mode Fail-Closed and Submit-Wiring Authoring**

## 29. Commands Executed

Representative set (read-only / branch create / local harness / prod SELECT):

- `git status --short`; `git branch --show-current`; `git rev-parse HEAD`; `git log --oneline --decorate -10`; `git remote -v`
- `git branch --list review/p5-e9g9a-patch-mode-readiness`; `git switch -c review/p5-e9g9a-patch-mode-readiness`
- `git grep` / `git show main:js/patch-mode.js` / wiring greps / write-surface greps
- Supabase MCP `list_projects`; `execute_sql` catalog/aggregates on `ohkoojpzmptdfyowdgog` only
- TEMP harness semantic matrix; `HttpListener` on `127.0.0.1:8769`
- Diff/secret checks; `git add` doc; `git commit`

## 30. Files Changed

| File | Action |
|---|---|
| `docs/architecture/p5-patch-mode-final-closure-readiness.md` | **Added** |

No other tracked files changed.

## 31. No-Code-Change / No-Write / No-Push / No-Deploy Attestation

- Application code change: **NOT AUTHORIZED / not performed**  
- Supabase mutation: **NOT AUTHORIZED / not performed**  
- Push: **NOT AUTHORIZED / not performed**  
- Deploy: **NOT AUTHORIZED / not performed**  
- Product Activation: **FAIL**  
- Public Launch: **NO-GO**  
- Third Fable-5 Audit: **REQUIRED AFTER ALL REMEDIATIONS**
