# P5-E.10B-W5-A1-R1 — PowerShell Count Failure Repair

## 1. Incident Summary

The first manual W5-A1 live start failed immediately under Windows PowerShell 5.1 StrictMode with `PropertyNotFoundStrict` on `.Count`, before any credential prompts or external access.

## 2. Original Error

- Message: property `Count` was not found for this object
- FullyQualifiedErrorId: `PropertyNotFoundStrict,Invoke-BoundLoreProductionSnapshot.ps1`
- Timing: immediately after start; no identity/export/upload markers

## 3. Exact Failing File and Line

- File: `tools/backup/Invoke-BoundLoreProductionSnapshot.ps1`
- Site: live-intent block after `Test-AllLiveGuardsPresent`
- Expression (pre-repair): `$missing.Count`
- Trigger: full live confirmation set present → empty `$missing` collection

## 4. Root Cause

`Test-AllLiveGuardsPresent` built `$missing = @()` and `return $missing`. In Windows PowerShell 5.1, returning an empty array unwraps to `$null`. Returning a single-element array unwraps to a scalar string. Under `Set-StrictMode -Version Latest`, `$null.Count` and scalar `.Count` throw `PropertyNotFoundStrict`.

Offline negative tests with multiple missing guards returned a real multi-element array, so `.Count` worked and pre-live QA did not catch the empty/single-element path.

## 5. Windows PowerShell 5.1 Behavior

Function returns of `@()` become `$null`. Function returns of a one-element array become the scalar element. Callers must re-wrap with `@(...)` and/or force array returns with the unary comma operator.

## 6. StrictMode Behavior

StrictMode Latest forbids reading non-existent properties. Scalars and `$null` do not expose `.Count` the way `Object[]` does.

## 7. Repair

- Added `Get-StrictCount` → `@($Value).Count`
- `Test-AllLiveGuardsPresent` now `return , @($missing)`
- Call site uses `$missing = @(Test-AllLiveGuardsPresent)` and `Get-StrictCount`
- Recipient line counting uses `Get-StrictCount`
- Negative-test failure counting uses `Get-StrictCount`
- Live list-line counting uses `@($lsLines).Count`
- Narrow preventive fixes in `Protect-BoundLoreBackup.ps1` and Wasabi synthetic helper Count sites

Safe defaults, full live confirmation set, staging/VeraCrypt/recipient guards, credential model, and one-upload rule are unchanged. No LiveExecution was performed during repair.

## 8. Similar Count Sites Reviewed

| Location | Finding | Action |
|---|---|---|
| `Invoke-BoundLoreProductionSnapshot.ps1` | Empty/single unwrap on guards | Fixed |
| `LiveProductionSnapshot.ps1` | List lines already `@()`-wrapped; still hardened | Hardened |
| `Protect-BoundLoreBackup.ps1` | Possible single FileInfo scalar | Fixed |
| `Invoke-BoundLoreWasabiSyntheticTest.ps1` | Get-ChildItem scalar risk | Fixed |
| `Send-BoundLoreBackup.ps1` | No `.Count` | None |
| `Export-BoundLoreDatabase.ps1` | No `.Count` | None |

## 9. Regression Tests

`qa/p5-production-snapshot-count-regression-check.py` covers null/single/multi, recipient 0/1/many, tool 0/1+, JSON object/array, preflight without PropertyNotFoundStrict, partial live still blocked, full guards with V: absent fail-closed without entering live prompts, and synthetic `external_requests: 0`.

## 10. Evidence of No External Access

Failed start occurred before prompts. Repair validation used offline QA only. No LiveExecution, no Supabase/Wasabi commands.

- external access proven: NO
- Production read proven: NO
- Wasabi mutation proven: NO

## 11. Local Artifact Check

- W5-A1 evidence file: absent
- Local encrypted `.age` for this attempt: not observed
- Repository rclone config: absent
- `V:` at investigation time: not mounted

local backup artifact created: NO

## 12. Secret Scan

Scoped to changed/tracked repair files. No real credentials, private keys, full recipients, or bucket names introduced.

## 13. Changed Files

Backup tooling Count/live-path files, offline QA (including count regression), and this document. No application/SQL/Cloudflare/dependency changes.

## 14. Safety Preservation

Defaults remain PreflightOnly/Synthetic/NoNetwork. Live network arms only after the full confirmation set. Staging remains blocked. Credentials remain non-parameter SecureString/child-env only.

## 15. Retry Authorization Boundary

A new explicit user authorization is required before any second W5-A1 live attempt. This repair gate does not authorize or start a live run.

## 16. Final Decision

`PASS_LOCAL_COUNT_FAILURE_REPAIRED_READY_FOR_REAUTHORIZATION` when offline QA and regression checks pass and the local repair commit exists without push.
