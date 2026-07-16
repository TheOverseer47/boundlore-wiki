# P5-E.9G.9C — S-09 Local Closure Verification

## 1. Executive Result

Independent local verification of authoring commit `06ba90e` confirms the
fail-closed Patch-Mode core, required mutation wiring, and QA suite behave as
designed for user-content paths. However, account-page `bindControls` uses
`#accountContent` as host while `setControlsDisabled` also disables
`button[type='submit']`. The Log Out control (`#logoutBtn2`) has no explicit
`type` attribute, so HTML defaults it to `submit`, and it is disabled whenever
Patch-Mode is not `allowed`.

**Verdict:** `FAIL_PATCH_MODE_SCOPE_OVERBLOCK`  
**S-09 local decision:** `S09_REMAINS_OPEN`  
**Preview readiness:** `NOT_READY_FOR_PREVIEW`

No application code was changed in this gate. No push, deploy, or Supabase write.

## 2. Scope and Verification Boundary

| Allowed | Done |
|---|---|
| Read-only review of `06ba90e` | Yes |
| Local static / runtime / regression tests | Yes |
| Isolated local harness on `127.0.0.1` | Yes |
| One verification doc + local commit | Yes |

| Forbidden | Status |
|---|---|
| App code fix / auto-remediation | Not performed |
| Supabase mutation / SQL / deploy / push | Not performed |

## 3. Git Baseline

| Item | Value |
|---|---|
| Authoring branch | `review/p5-e9g9b-patch-mode-authoring` |
| Authoring HEAD | `06ba90e` |
| Verification branch | `review/p5-e9g9c-patch-mode-verification` |
| Parent readiness | `941552c` |

## 4. Authoring Commit Review

Commit message: `Implement fail-closed patch mode wiring`  
17 files, +1166 / −6. Trailing whitespace warnings only in authoring markdown
(non-blocking for verification).

Scope vs `941552c..06ba90e`:

- `supabase/**` — empty diff  
- `functions/**` — empty diff  
- `package.json` — empty diff  
- `js/supabase-config.js` — empty diff  
- `sitemap.xml` / `robots.txt` — empty diff  

## 5. Changed-File Classification

| File | Class |
|---|---|
| `js/patch-mode.js` | `PATCH_MODE_CORE` |
| `wiki/create-post/index.html` | `REQUIRED_HTML_WIRING` |
| `wiki/edit-post/index.html` | `REQUIRED_HTML_WIRING` |
| `wiki/post/index.html` | `REQUIRED_HTML_WIRING` |
| `wiki/guilds/index.html` | `REQUIRED_HTML_WIRING` |
| `wiki/submit-tutorial/index.html` | `REQUIRED_HTML_WIRING` |
| `wiki/account/index.html` | `REQUIRED_HTML_WIRING` + selective guards |
| `js/create-post.js` | `REQUIRED_MUTATION_GUARD` |
| `js/edit-post.js` | `REQUIRED_MUTATION_GUARD` |
| `js/post-detail.js` | `REQUIRED_MUTATION_GUARD` |
| `js/guilds-apply.js` | `REQUIRED_MUTATION_GUARD` |
| `js/submit-tutorial.js` | `REQUIRED_MUTATION_GUARD` |
| `js/my-posts.js` | `REQUIRED_MUTATION_GUARD` |
| `css/style.css` | `REQUIRED_UI_STYLE` |
| `qa/p5-patch-mode-static-check.py` | `REQUIRED_QA` |
| `qa/p5-patch-mode-runtime-check.py` | `REQUIRED_QA` |
| `docs/architecture/p5-patch-mode-fail-closed-authoring.md` | `REQUIRED_DOCUMENTATION` |

No `UNRELATED` / `UNKNOWN` files. No `FAIL_PATCH_MODE_SCOPE_DRIFT`.

## 6. Patch-Mode Core Semantics

Reviewed `js/patch-mode.js` end-to-end.

| Rule | Evidence |
|---|---|
| Initial `pending` | `modeState = STATE_PENDING` before load |
| Allow only `enabled === false` | strict equality |
| Block only `enabled === true` | strict equality |
| Missing/multiple/NULL/invalid → error | `normalizeConfigResult` throws |
| Catch → error (not allow) | `loadConfiguration` catch sets `STATE_ERROR` |
| No fail-open `enabled:false` fallback object | absent |
| No `!!enabled` / Boolean(null) | absent |
| Shared init promise / no retry / no background refresh | `initPromise` once |
| Timeout 5s → error | `FETCH_TIMEOUT_MS = 5000` |
| Offline / missing client → error | explicit branches |
| Safe user messages | fixed copy; no Supabase internals |

Minor non-blocker: when transitioning to `allowed`, `lastCode = code \|\| lastCode`
can retain a prior loading code in `getState().code` while `state` is correctly
`allowed`. Submission gating uses `modeState`, not `lastCode`.

Admin bypass only after `profiles.role === "admin"` from session-backed read;
failures return `false` (fail-closed). Client-only UX; server release-gate remains
authoritative.

## 7. Public API Review

| API | Result |
|---|---|
| `initialize` | idempotent shared promise |
| `getState` / `isReady` / `isSubmissionAllowed` | present |
| `assertCanSubmit` | allows only `allowed`; throws loading/active/unavailable |
| `bindForm` / `bindControls` | present; immediate disable + submit capture |
| optional/no-op guard | callers treat missing API as block |

**API completeness:** PASS for contract. Host-selection behavior in account wiring
is the overblock root cause (see §11).

## 8. Script Dependency and Ordering

| Seite | Config | Patch | Mutation | Reihenfolge | Optional Guard | Verdict |
|---|---:|---:|---:|---:|---:|---|
| create-post | yes | yes | create-post.js | yes | no (missing→block) | PASS |
| edit-post | yes | yes | edit-post.js | yes | no | PASS |
| post | yes | yes | post-detail.js | yes | no | PASS |
| guilds | yes | yes | guilds-apply.js | yes | no | PASS |
| submit-tutorial | yes | yes | submit-tutorial.js | yes | no | PASS |
| account | yes | yes | inline + my-posts | yes | no | PASS order / FAIL scope host |

No second Patch-Mode implementation. No dynamic optional loader in
`supabase-config.js`.

## 9. Complete Required Mutation Inventory

Active user-content mutations with guards:

| Mutation | Module | Guard |
|---|---|---|
| posts.insert | create-post / guilds | yes |
| discovery upload | create-post | yes (function + pre-call) |
| posts.update | edit-post | yes |
| comments insert/update/delete | post-detail | yes |
| reactions insert/update/delete | post-detail | yes |
| auth.updateUser (tutorial) | submit-tutorial | yes |
| profiles.update (avatar) | account | yes |
| posts.delete (own) | my-posts | yes |

Intentionally free:

| Mutation | Module | Patch assert |
|---|---|---|
| reports insert + screenshot upload | support / community-hub | none |
| password reset / delete OTP / logout handlers | account | no assert (but logout UI overblocked) |
| admin-seed-local | admin | none |
| notifications mark-read | notifications | none |

Legacy / inactive:

| Module | Notes |
|---|---|
| `js/post-interactions.js` | not referenced by any HTML; not active surface |
| `bl_register_observation` | no HEAD JS `.rpc` caller |

Edit-post has no storage upload path on this lineage.

## 10. Immediate Guard Verification

Create/edit/post/guilds/tutorial/avatar/delete-own: assert/enforce immediately
before mutating calls; in-flight flags where applicable; missing API blocks.

No `FAIL_REQUIRED_MUTATION_UNGUARDED` for active required surfaces.

## 11. Reports and Recovery Exemption Verification

| Surface | Expected | Actual | Verdict |
|---|---|---|---|
| Support / community reports | available | no patch script / no assert | PASS |
| Login / reset-password pages | available | no patch script | PASS |
| Admin | available | no patch script | PASS |
| Password reset button | available | `type=button`, no assert | PASS |
| Delete-request button | available | `type=button`, no assert | PASS |
| Logout button | available | **disabled by host-wide `button[type=submit]` selection** | **FAIL** |

Root cause (account):

1. `WikiPatchMode.bindControls(..., accountContent)`  
2. `bindForm` → `setControlsDisabled` selects `button[type='submit']` inside host  
3. `#logoutBtn2` lacks `type="button"` → HTML default `type=submit`  
4. While state ≠ `allowed`, logout is disabled  

This is unintentional overblock of a required-available recovery control.

## 12. Public Profile Separation

Avatar URL save is assert-guarded and control-bound. Reset/delete-request handlers
are not assert-guarded. Separation intent is correct; logout UI binding is not.

## 13. UX and Accessibility Verification

Core UX for bound forms: `disabled`, `aria-disabled`, `role=status`,
`aria-live=polite`, distinct maintenance vs unavailable copy. Enter captured on
bound forms. No full-page overlay trapping reports/admin.

Account logout disable is an a11y/ops regression under patch/error states.

## 14. Static QA Review

`qa/p5-patch-mode-static-check.py` — PASS (50). Validates core contracts, order,
required guards, and that support/login/reset/admin/community omit patch script.

Gap: does not assert logout remains enabled on account under non-allowed states.
That gap allowed authoring to pass while overblock exists.

## 15. Runtime QA Review

`qa/p5-patch-mode-runtime-check.py` — PASS (34), zero network I/O. Mirrors
`normalizeConfigResult` / assert matrix in-process and checks source contracts
(timeout/offline/no fail-open/no path overlay).

Does not execute live browser DOM for account logout. Semantic matrix for
enabled/missing/NULL/invalid/network remains valid.

Secondary note: one tautological string check (`"no automatic retry" not in src`)
is weak but does not create a false PASS on the overblock issue.

## 16. Regression Test Results

| Test | Result | Checks | Network | Production Write | Dauer |
|---|---|---:|---:|---:|---:|
| p5-patch-mode-static-check | PASS | 50 | none | none | bundled ~0.7s suite |
| p5-patch-mode-runtime-check | PASS | 34 | none | none | bundled |
| p5-search-recall-static-check | PASS | 6 | none | none | bundled |
| p5-entity-routes-check | PASS | 21 | none | none | bundled |
| p5-cloudflare-pages-routing-static-check | PASS | 7 | none | none | bundled |
| p5-cloudflare-pages-function-check | PASS | mock suite | none | none | bundled |
| p5-entity-link-migration-check | PASS | 1 | none | none | bundled |
| p5-real-content-entity-ssg-check | PASS | 14 | none | none | ~few s |
| p5-real-content-entity-seo-evidence-rerun | PASS | 10 | none | none | ~few s |

## 17. Local Browser Evidence

Isolated harness served on `http://127.0.0.1:8771/` (TEMP only; copied
`patch-mode.js`; stubbed `supabase`; no Production credentials used).

Deterministic HTML/DOM facts from live account markup + core selector:

- `#logoutBtn2` has no `type` attribute → default `submit`  
- Account wiring binds with host `#accountContent`  
- Core disables all `button[type='submit']` inside bound host when not allowed  
- Therefore logout is disabled under pending/blocked/error  

Harness also confirmed patch script and stubbed active config path are loadable
locally without Production contact.

## 18. Fail-Closed Acceptance Matrix

| Szenario | Ist | Soll | PASS/FAIL |
|---|---|---|---|
| active | block | block | PASS |
| inactive | allow | allow | PASS |
| pending | block | block | PASS |
| missing row | block | block | PASS |
| multiple rows | block | block | PASS |
| NULL | block | block | PASS |
| invalid | block | block | PASS |
| network error | block | block | PASS |
| timeout | block | block | PASS |
| offline | block | block | PASS |
| Supabase missing | block | block | PASS |
| config missing | block | block | PASS |
| API missing | block | block | PASS |
| Promise reject | block | block | PASS |
| Enter submit | captured when bound | block | PASS |
| double submit | in-flight flags | max one | PASS |
| reports | available | available | PASS |
| report screenshot | available | available | PASS |
| login page | available | available | PASS |
| password reset button | available | available | PASS |
| email/delete recovery handlers | available | available | PASS |
| admin recovery | available | available | PASS |
| public profile/avatar | block | block | PASS |
| **logout** | **disabled when not allowed** | **available** | **FAIL** |
| read-only navigation | available | available | PASS |

## 19. Network Isolation

QA scripts: filesystem only. Harness: localhost stub client; no Production/Staging
auth or writes. Verification gate performed no Supabase MCP mutations.

## 20. Secret and Credential Review

Authoring delta and this verification doc: no service-role keys, JWTs, passwords,
connection strings, or `.env` contents staged. Untracked env/backup artefacts
untouched.

## 21. Architecture Preservation

**ARCHITECTURE_PRESERVED** — no new table/policy/role/RPC/dependency; no
release_gate/RLS/storage/function/runtime-ref changes; no product-activation
coupling.

## 22. Preview Readiness

`NOT_READY_FOR_PREVIEW` — local S-09 cannot close while logout is overblocked;
preview would ship a recovery UX defect.

## 23. S-09 Local Closure Decision

`S09_REMAINS_OPEN`

Blocker: account logout overblock via host-wide submit-button disable.

## 24. Remaining Limitations

- Account `#logoutBtn2` default `type=submit` + host `#accountContent` binding  
- Static QA gap for logout availability  
- Legacy `post-interactions.js` still unwired (inactive)  
- Cosmetic `lastCode` retention on allowed  
- Carry-forward release-lock hygiene items unchanged  

## 25. Rollback Basis

Authoring remains on `06ba90e`. This gate adds documentation only. Remediation
requires a follow-up authoring fix (not performed here), e.g. mark logout
`type="button"` and/or bind only avatar controls without host-wide
`button[type=submit]` selection.

## 26. Final Decision

`FAIL_PATCH_MODE_SCOPE_OVERBLOCK`

## 27. Commands Executed

Git preflight/branch create; `git show` / `git diff 941552c..06ba90e`; full
`patch-mode.js` review; mutation/guard greps; QA + regression Python suite;
isolated `127.0.0.1` harness; documentation commit commands.

## 28. Files Changed

| File | Action |
|---|---|
| `docs/architecture/p5-patch-mode-local-closure-verification.md` | Added |

## 29. No-Write / No-Push / No-Deploy Attestation

- Supabase Mutation: **NONE**  
- Application code change this gate: **NONE**  
- Push: **NONE**  
- Deploy / Preview: **NONE**  
- Product Activation: **FAIL**  
- Public Launch: **NO-GO**
