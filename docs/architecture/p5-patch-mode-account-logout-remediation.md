# P5-E.9G.9C-R1 — Account Logout Patch-Mode Scope Remediation

## 1. Executive Result

The account logout overblock is remediated without changing Patch-Mode core
semantics. Binding is limited to `#accountAvatarPatchHost`, and `#logoutBtn2`
now has explicit `type="button"`. Avatar mutations remain fail-closed; logout
and recovery remain available.

**Verdict:** `PASS_ACCOUNT_LOGOUT_SCOPE_REMEDIATED_READY_FOR_REVERIFICATION`  
**S-09:** remains OPEN until independent re-verification.

## 2. Authorization Boundary

Local account HTML + QA + documentation only. No Supabase write, push, deploy,
or Patch-Mode fail-closed API change.

## 3. Git Baseline

| Item | Value |
|---|---|
| Parent verification HEAD | `3cc35cc` |
| Remediation branch | `review/p5-e9g9c-r1-account-logout-remediation` |

## 4. Verification Failure

P5-E.9G.9C (`FAIL_PATCH_MODE_SCOPE_OVERBLOCK`): `#logoutBtn2` inside
`#accountContent` defaulted to `type=submit` and was disabled by
`bindForm`/`setControlsDisabled`.

## 5. Exact Root Cause

1. `#logoutBtn2` lived under `#accountContent`  
2. No explicit `type` → HTML default `submit`  
3. Not inside a `<form>`, but still matched `button[type='submit']`  
4. `bindControls(..., accountContent)` made the whole account page the host  
5. Avatar controls were the intended target; logout was collateral  
6. Password reset / delete-request already had `type="button"` (not disabled)  
7. Second logout path `#logoutBtn` in `auth-nav.js` was unaffected  

No additional unknown account overblocks found beyond this root cause.

## 6. Account DOM and Form Structure

- Profile read-only fields outside patch host  
- Avatar URL + Save inside `#accountAvatarPatchHost`  
- My Posts / Security / Logout outside that host  
- No enclosing form around logout  

## 7. Previous Broad Bind Host

`WikiPatchMode.bindControls(["#saveAvatarBtn", "#avatarUrlInput"], accountContent)`

## 8. Implemented Minimal Fix

1. Wrap avatar URL input + save button (+ status) in `#accountAvatarPatchHost`  
2. Bind: `bindControls(..., avatarPatchHost)`  
3. Set `#logoutBtn2` to `type="button"`  
4. Leave `js/patch-mode.js` unchanged  

## 9. Logout Availability

Logout is outside the bind host, has `type="button"`, and has no
`assertCanSubmit`. Nav logout remains independent.

## 10. Avatar and Public Profile Blocking

Avatar controls keep `data-bl-patch-control` and `assertCanSubmit` before
`profiles.update`. Bound host still disables them for pending/blocked/error.

## 11. Recovery Availability

Password reset, delete-request, and logout remain outside the avatar host and
unasserted.

## 12. Patch-Mode Core Preservation

`js/patch-mode.js` unchanged. Fail-closed matrix preserved by runtime QA.

## 13. Added Regression Coverage

- Extended `qa/p5-patch-mode-static-check.py` (narrow host, no accountContent bind,
  logout `type=button`, no logout assert)  
- New `qa/p5-patch-mode-account-scope-check.py` (22 checks); fails if broad
  accountContent binding returns  

## 14. Static QA Results

`p5-patch-mode-static-check.py` — PASS (55)  
`p5-patch-mode-account-scope-check.py` — PASS (22)

## 15. Runtime QA Results

`p5-patch-mode-runtime-check.py` — PASS (34), zero network I/O.

## 16. Account DOM Evidence

Markup + selector reachability:

| Control | In avatar host | type | Expected under non-allowed |
|---|---|---|---|
| saveAvatarBtn | yes | button + patch-control | disabled |
| avatarUrlInput | yes | url + patch-control | disabled |
| sendResetMailBtn | no | button | enabled |
| requestDeleteBtn | no | button | enabled |
| logoutBtn2 | no | button | enabled |

## 17. Regression Results

| Test | Result |
|---|---|
| patch-mode static / runtime / account-scope | PASS |
| search-recall | PASS |
| entity-routes | PASS |
| cloudflare routing | PASS |
| cloudflare function | PASS |
| entity-link-migration | PASS |
| real-content SSG | PASS |

## 18. Changed-File Manifest

| File | Purpose | Required | Unrelated |
|---|---|---:|---:|
| `wiki/account/index.html` | narrow host + logout type | yes | no |
| `qa/p5-patch-mode-static-check.py` | logout scope asserts | yes | no |
| `qa/p5-patch-mode-account-scope-check.py` | dedicated scope QA | yes | no |
| `docs/architecture/p5-patch-mode-account-logout-remediation.md` | this doc | yes | no |

## 19. Architecture Preservation

No SQL/functions/supabase-config/runtime-ref/dependency/release-gate/RLS changes.
**ARCHITECTURE_PRESERVED**

## 20. Remaining Limitations

- S-09 still needs independent re-verification + later preview evidence  
- Legacy `post-interactions.js` still inactive/unwired  
- Carry-forward release-lock hygiene items unchanged  

## 21. Rollback

Revert this remediation commit; restores broad host overblock.

## 22. Final Remediation Decision

`PASS_ACCOUNT_LOGOUT_SCOPE_REMEDIATED_READY_FOR_REVERIFICATION`

## 23. Commands Executed

Git preflight/branch; account HTML edit; QA extensions; Python test suite;
diff/secret checks; local commit.

## 24. Files Changed

See §18.

## 25. No-Write / No-Push / No-Deploy Attestation

- Supabase Mutation: **NONE**  
- Push: **NONE**  
- Deploy: **NONE**  
- Product Activation: **FAIL**  
- Public Launch: **NO-GO**
