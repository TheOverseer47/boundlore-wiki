# P5-E.9G.9C-R2 — Account Scope Reverification and S-09 Preview Readiness

## 1. Executive Result

Independent re-verification confirms the R1 remediation closes the account logout
overblock without weakening fail-closed Patch-Mode semantics. Full S-09 local
acceptance criteria are met. Candidate commit for a later non-main preview is
`effe505` (plus this verification documentation commit only).

**Verdict:** `PASS_S09_LOCALLY_CLOSED_READY_FOR_NON_MAIN_PREVIEW`  
**S-09 local decision:** `S09_LOCALLY_CLOSED_PREVIEW_EVIDENCE_PENDING`  
**Preview readiness:** `READY_FOR_NON_MAIN_PATCH_MODE_PREVIEW`

No application code changed in this gate. No push, deploy, or Supabase write.

## 2. Scope and Verification Boundary

Read-only review of `effe505`, local QA/regression execution, isolated DOM
disable-selector modeling on `127.0.0.1`-safe analysis only, one verification
document + local commit. No Production/Staging mutation.

## 3. Git Baseline

| Item | Value |
|---|---|
| Remediation HEAD | `effe505` |
| Prior verification fail | `3cc35cc` (`FAIL_PATCH_MODE_SCOPE_OVERBLOCK`) |
| Authoring | `06ba90e` |
| Review branch | `review/p5-e9g9c-r2-account-scope-reverification` |

## 4. Remediation Commit Review

`effe505` changes exactly four paths:

| File | Class |
|---|---|
| `wiki/account/index.html` | account scope fix |
| `qa/p5-patch-mode-static-check.py` | QA extension |
| `qa/p5-patch-mode-account-scope-check.py` | new QA |
| `docs/architecture/p5-patch-mode-account-logout-remediation.md` | remediation doc |

Diffs empty for: `supabase/**`, `functions/**`, `package.json`,
`js/supabase-config.js`, `js/patch-mode.js`, `sitemap.xml`, `robots.txt`.

## 5. Changed-File Classification

All remediation files are required for the logout-scope fix or its tests/docs.
No unrelated / UNKNOWN files. No `FAIL_REMEDIATION_SCOPE_DRIFT`.

## 6. Root-Cause Reconfirmation

Previous failure: `#logoutBtn2` defaulted to `type=submit` inside broad
`#accountContent` bind host and was disabled by `setControlsDisabled`.

Remediation: narrow `#accountAvatarPatchHost` + explicit `type="button"` on
logout. Root cause no longer present.

## 7. Account DOM Structure

- Read-only profile fields outside patch host  
- Avatar URL + Save (+ status) inside `#accountAvatarPatchHost`  
- My Posts, Security/recovery, Logout outside host  
- No form wrapping logout  

## 8. Logout Button Semantics

`#logoutBtn2` has `type="button"`, is not `type=submit`, has no
`data-bl-patch-control`, and its click handler has no `assertCanSubmit`.
Nav `#logoutBtn` in `auth-nav.js` remains a separate available path.

## 9. Narrow Patch-Mode Host

Binding is:

`WikiPatchMode.bindControls(["#saveAvatarBtn", "#avatarUrlInput"], avatarPatchHost)`

No remaining bind to `#accountContent`. No second account bind call found.

## 10. Logout Availability Matrix

Isolated disable-selector model (mirrors core selector against host membership):

| State | Logout disabled? |
|---|---|
| pending / active / error / offline / supabase missing / API missing | no |
| enabled=false | no |

## 11. Recovery Availability Matrix

Password reset and delete-request remain `type=button`, outside avatar host,
without `assertCanSubmit`. Available in all modeled Patch-Mode states.

## 12. Avatar and Public Profile Blocking

Avatar controls carry `data-bl-patch-control` and `assertCanSubmit` (missing API
blocks). Host binding disables them whenever Patch-Mode is not `allowed`.

## 13. Negative Regression Review

Fail-closed core unchanged (`js/patch-mode.js` not in remediation). Runtime
matrix still PASS for missing/NULL/invalid/network/timeout/offline/pending.
No optional no-op guard pattern on required mutation modules.

## 14. Full Script-Wiring Matrix

| Surface | Expected | Script Order | UI Guard | Write Guard | Overblock | Verdict |
|---|---|---|---|---|---|---|
| Create Post | block | yes | yes | yes | no | PASS |
| Edit Post | block | yes | yes | yes | no | PASS |
| Discovery upload | block | via create-post | yes | yes | no | PASS |
| Comments CRUD | block | yes | yes | yes | no | PASS |
| Reactions | block | yes | yes | yes | no | PASS |
| Observations / `bl_register_observation` | block if UI | no HEAD UI caller | n/a | n/a | n/a | PASS (inactive) |
| Guild Apply | block | yes | yes | yes | no | PASS |
| Tutorial Submit | block | yes | yes | yes | no | PASS |
| Account Avatar | block | yes | yes | yes | no | PASS |
| My Posts delete | block | yes | yes | yes | no | PASS |
| Reports / screenshots | allow | no patch script | no | no | no | PASS |
| Login | allow | no patch | no | no | no | PASS |
| Logout | allow | outside host | no | no | **cleared** | PASS |
| Password recovery | allow | outside host | no | no | no | PASS |
| Admin recovery | allow | no patch | no | no | no | PASS |

## 15. Static QA Quality Review

Static checks cover wiring, fail-open absence, required guards, and exceptions
for support/login/reset/admin/community.

## 16. Runtime QA Quality Review

Runtime checker validates normalize/assert fail-closed matrix with zero network
I/O and core source contracts.

## 17. Account Scope Test Review

`qa/p5-patch-mode-account-scope-check.py` would FAIL on:

1. missing logout `type=button`  
2. bind to `#accountContent`  
3. logout inside `#accountAvatarPatchHost`  
4. `assertCanSubmit` in logout handler  
8. avatar without assert (handler check)  
9. API-missing path without block in avatar handler  
10. broad accountContent bind (global disable vector)  

States 5–7 (logout disabled at pending/active/error) are enforced structurally
(outside host + type=button + not patch-control) and independently reconfirmed
by this gate’s disable-selector model. Not rated as coverage gap for closure.

## 18. Test Execution Results

| Test | Result | Checks | Network | Production Write | Duration |
|---|---|---:|---:|---:|---:|
| p5-patch-mode-static-check | PASS | 55 | none | none | suite ~1s |
| p5-patch-mode-runtime-check | PASS | 34 | none | none | suite |
| p5-patch-mode-account-scope-check | PASS | 22 | none | none | suite |
| search-recall | PASS | 6 | none | none | suite |
| entity-routes | PASS | 21 | none | none | suite |
| CF routing | PASS | 7 | none | none | suite |
| CF function | PASS | mock | none | none | suite |
| link-migration | PASS | 1 | none | none | suite |
| real-content SSG | PASS | 14 | none | none | suite |
| SEO evidence rerun | PASS | 10 | none | none | suite |

## 19. Local DOM Evidence

Disable-selector model against live markup + core selector:

```
MATRIX pending: avatar_disabled=True logout_disabled=False recovery_disabled=False
MATRIX enabled=true: avatar_disabled=True logout_disabled=False recovery_disabled=False
MATRIX enabled=false: avatar_disabled=False logout_disabled=False recovery_disabled=False
MATRIX error: avatar_disabled=True logout_disabled=False recovery_disabled=False
...
DOM_MODEL_PASS
```

No Production auth/network. Logout click is not captured by avatar host submit
listener (`captureSubmit: false` on bindControls; logout outside host).

## 20. Complete S-09 Acceptance Matrix

| Szenario | User-Content | Logout | Recovery | Reports | Soll | PASS/FAIL |
|---|---|---|---|---|---|---|
| active | block | allow | allow | allow | exact | PASS |
| inactive | allow | allow | allow | allow | exact | PASS |
| pending | block | allow | allow | allow | exact | PASS |
| missing row | block | allow | allow | allow | exact | PASS |
| multiple rows | block | allow | allow | allow | exact | PASS |
| NULL | block | allow | allow | allow | exact | PASS |
| invalid | block | allow | allow | allow | exact | PASS |
| network | block | allow | allow | allow | exact | PASS |
| timeout | block | allow | allow | allow | exact | PASS |
| offline | block | allow | allow | allow | exact | PASS |
| Supabase missing | block | allow | allow | allow | exact | PASS |
| API missing | block | allow | allow | allow | exact | PASS |

Also: Enter blocked when not allowed on bound forms; double-submit in-flight
guards; read-only navigation available; admin unwired; no unknown active write
surface beyond legacy inactive `post-interactions.js`.

## 21. Network Isolation

All executed QA/regressions are local filesystem/mock. No Production/Staging
writes or auth. DOM model used no remote calls.

## 22. Secret Review

Verification doc and remediation delta contain no service-role keys, JWTs,
passwords, connection strings, or `.env` contents. Untracked artefacts not
staged.

## 23. Architecture Preservation

**ARCHITECTURE_PRESERVED** — no table/policy/role/RPC/dependency/SQL/function/
release_gate/RLS/storage/runtime-ref/product-activation changes.

## 24. Preview Readiness

`READY_FOR_NON_MAIN_PATCH_MODE_PREVIEW`

- Candidate basis: `effe505` (+ this verification commit only)  
- Non-main only; noindex required; no custom domain; Production ref unchanged  
- No push performed in this gate  
- No product unlock / Production deploy  

## 25. S-09 Local Closure Decision

`S09_LOCALLY_CLOSED_PREVIEW_EVIDENCE_PENDING`

All listed local closure criteria met. Remote preview evidence still required
before treating S-09 as fully remotely verified.

## 26. Remaining Limitations

- Preview/remote evidence still pending  
- Legacy `post-interactions.js` inactive/unwired  
- Carry-forward release-lock hygiene (comments/storage UPDATE/DELETE,
  `release_gate` TRUNCATE grants) unchanged  
- Formal third Fable-5 audit still required after remediations  

## 27. Rollback Basis

Revert R1 `effe505` restores overblock. This gate adds documentation only.

## 28. Final Decision

`PASS_S09_LOCALLY_CLOSED_READY_FOR_NON_MAIN_PREVIEW`

## 29. Commands Executed

Git preflight/branch; `git show`/`diff` of `effe505`; account/core/QA reads;
full Python QA/regression suite; isolated DOM disable model; documentation
commit.

## 30. Files Changed

| File | Action |
|---|---|
| `docs/architecture/p5-patch-mode-account-scope-reverification.md` | Added |

## 31. No-Write / No-Push / No-Deploy Attestation

- Supabase Mutation: **NONE**  
- Application code change this gate: **NONE**  
- Push: **NONE**  
- Deploy / Preview: **NONE**  
- Product Activation: **FAIL**  
- Public Launch: **NO-GO**
