# P5-E.9G.9B — Patch-Mode Fail-Closed Authoring

## 1. Executive Result

Minimal fail-closed Patch-Mode was authored on this review lineage and wired to
all confirmed required user-content surfaces. Reports, login/reset, and admin
remain intentionally unwired. Static and isolated runtime QA PASS. No Supabase
mutation, push, or deploy.

**Authoring verdict:** `PASS_MINIMAL_PATCH_MODE_AUTHORING_READY_FOR_VERIFICATION`  
**S-09 formal status:** remains **OPEN** until verification gate.

## 2. Authorization Boundary

| Action | Status |
|---|---|
| Local application authoring | Performed |
| Local QA | Performed |
| Local documentation + commit | Performed |
| Supabase writes / SQL apply | **NOT AUTHORIZED / none** |
| Push / PR / deploy / unlock | **NOT AUTHORIZED / none** |

## 3. Git Baseline

| Item | Value |
|---|---|
| Parent readiness commit | `941552c` |
| Authoring branch | `review/p5-e9g9b-patch-mode-authoring` |
| Baseline HEAD at branch create | `941552c` |

## 4. Confirmed Scope Decision

**Block during Patch-Mode:** create/edit posts, discovery uploads, comments,
reactions, guild applications, tutorial submit metadata, public profile/avatar
mutations, own-post delete.

**Keep available:** read-only navigation/search, reports + report screenshots,
login/logout, password reset, account deletion confirmation flow, admin /
moderation / recovery.

## 5. Previous Failure Mode

- HEAD lacked `js/patch-mode.js` → `NO_GUARD`
- local `main` / `4372fba` used fail-open `enabled: false` fallback and optional
  `typeof WikiPatchMode` guards

## 6. Local Main Reference Assessment

| Reused conceptually | Discarded |
|---|---|
| `WikiPatchMode` global name | fail-open fallback object |
| idea of assert-before-submit | `!!enabled` coercion |
| admin UX bypass only after confirmed role | deferred dynamic script loader |
| | full-page path overlay trapping reports/admin |
| | unrelated main contribution stack |

Implementation on this branch is newly written fail-closed code, not a merge or
cherry-pick of `4372fba`.

## 7. Implemented Patch-Mode State Model

States: `pending` → `allowed` | `blocked` | `error`

| State | Submit |
|---|---|
| pending | block |
| allowed | allow (to server gate) |
| blocked | block (admin bypass only if role confirmed) |
| error | block |

## 8. Configuration Loading

- Source: `public.wiki_patch_mode` singleton `id = 1`
- One `initialize()` promise per page life-cycle
- Timeout: 5000 ms → `error`
- No automatic retry / no background refresh after error
- Offline / missing client → `error`

## 9. Fail-Closed Semantics

Allow only when fetch succeeds, exactly one row, and `enabled === false`.  
NULL, invalid types, missing/multiple rows, network/timeout/offline → `error`.

## 10. Timeout and Error Handling

`withTimeout` races the Supabase query. Catch paths set `error` and never
`allowed`. User messages omit internal Supabase details.

## 11. Public API

`WikiPatchMode.initialize`, `getState`, `isReady`, `isSubmissionAllowed`,
`assertCanSubmit` (throws `PATCH_MODE_LOADING` / `ACTIVE` / `UNAVAILABLE`),
`bindForm`, `bindControls`, `getUserMessage`.

## 12. Deterministic Script Wiring

Required pages load, in order:

1. Supabase CDN client  
2. `js/supabase-config.js`  
3. `js/patch-mode.js?v=p5-e9g9b`  
4. mutation module  

No `async` on patch-mode. No dynamic optional injector in `supabase-config.js`
(file unchanged).

## 13. Required User-Content Surfaces

| Surface | Wiring |
|---|---|
| Create post + discovery upload | HTML + `create-post.js` bind + dual guards |
| Edit post | HTML + `edit-post.js` |
| Comments / reactions | HTML + `post-detail.js` |
| Guild apply | HTML + `guilds-apply.js` |
| Tutorial submit | HTML + `submit-tutorial.js` |
| Avatar / public profile field | `account/index.html` selective bind |
| Own post delete | `my-posts.js` |

No HEAD JS caller for `bl_register_observation`; if reintroduced later it must
reuse the same assert API.

## 14. Explicitly Available Report and Recovery Surfaces

Unwired (no patch-mode script / no assert): support reports, community hub
reports, login, reset-password, admin.

## 15. Public Profile versus Account-Recovery Separation

On account page: avatar input/save are patch-bound. Password reset mail and
delete-request OTP flows are not. Logout remains available.

## 16. Immediate Pre-Mutation Guards

Each required mutation path calls `assertCanSubmit` (via enforce helpers)
immediately before `.insert` / `.update` / `.delete` / `.upload`. Missing API
blocks.

## 17. Submit and Double-Request Protection

`createSubmitInFlight`, `editSubmitInFlight`, `guildSubmitInFlight`,
`postMutationInFlight`; bindForm captures native submit while not `allowed`.

## 18. UX and Accessibility

Status node with `role="status"` + `aria-live="polite"`. Controls use `disabled`
+ `aria-disabled` via `data-bl-patch-locked`. Distinct copy for maintenance vs
unavailable. Minimal `.bl-patch-mode-status` style only.

## 19. Static QA

`qa/p5-patch-mode-static-check.py` — **PASS** (50 checks).

## 20. Runtime QA

`qa/p5-patch-mode-runtime-check.py` — **PASS** (34 checks), zero network I/O.

## 21. Regression Test Results

| Test | Result |
|---|---|
| `qa/p5-search-recall-static-check.py` | PASS |
| `qa/p5-entity-routes-check.py` | PASS |
| `qa/p5-cloudflare-pages-routing-static-check.py` | PASS |
| `qa/p5-cloudflare-pages-function-check.py` | PASS |
| `qa/p5-entity-link-migration-check.py` | PASS |

## 22. Network Isolation Evidence

Runtime checker uses only local filesystem reads and in-process semantics. No
Supabase URL/key usage in tests. Application tests stub decisions without live
clients.

## 23. Complete Changed-File Manifest

| Datei | Surface | Änderung | S-09 erforderlich | Unrelated |
|---|---|---|---:|---:|
| `js/patch-mode.js` | core | new fail-closed module | yes | no |
| `js/create-post.js` | create/upload | bind + guards | yes | no |
| `js/edit-post.js` | edit | bind + guards | yes | no |
| `js/post-detail.js` | comments/reactions | bind + guards | yes | no |
| `js/guilds-apply.js` | guilds | bind + guards | yes | no |
| `js/submit-tutorial.js` | tutorial | bind + guards | yes | no |
| `js/my-posts.js` | own delete | guards | yes | no |
| `wiki/create-post/index.html` | wiring | script tag | yes | no |
| `wiki/edit-post/index.html` | wiring | script tag | yes | no |
| `wiki/post/index.html` | wiring | script tag | yes | no |
| `wiki/guilds/index.html` | wiring | script tag | yes | no |
| `wiki/submit-tutorial/index.html` | wiring | script tag | yes | no |
| `wiki/account/index.html` | avatar only | script + selective guard | yes | no |
| `css/style.css` | status style | minimal class | yes | no |
| `qa/p5-patch-mode-static-check.py` | QA | new | yes | no |
| `qa/p5-patch-mode-runtime-check.py` | QA | new | yes | no |
| `docs/architecture/p5-patch-mode-fail-closed-authoring.md` | docs | this file | yes | no |

Unchanged: `js/supabase-config.js`, `supabase/**`, `functions/**`,
`package.json`, `sitemap.xml`, `robots.txt`.

## 24. Architecture Preservation

**ARCHITECTURE_PRESERVED** — no new table/policy/role/RPC/dependency; no
release_gate/RLS/storage policy change; no runtime project ref change; no
product-activation coupling.

## 25. Known Limitations

- Admin bypass is client UX only; server release-gate still authoritative.
- `post-interactions.js` remains legacy/unwired on live post page (post-detail
  is the active path).
- Formal S-09 closure requires verification gate / preview evidence.

## 26. Rollback

Revert the authoring commit on this branch. No Production config toggle required.

## 27. Acceptance Matrix

Fail-closed matrix covered by runtime QA; wiring/order/guards/exceptions covered
by static QA. Full formal S-09 closure deferred to verification.

## 28. Final Authoring Decision

`PASS_MINIMAL_PATCH_MODE_AUTHORING_READY_FOR_VERIFICATION`

## 29. Commands Executed

Git preflight/branch create; read-only `git show 4372fba:js/patch-mode.js`;
local authoring; `py qa/p5-patch-mode-*.py` and listed regression checks; diff /
commit commands.

## 30. Files Changed

See §23.

## 31. No-Supabase-Write / No-Push / No-Deploy Attestation

- Supabase Mutation: **NONE**  
- Push: **NONE**  
- Deploy / Preview: **NONE**  
- Product Activation: **FAIL**  
- Public Launch: **NO-GO**
