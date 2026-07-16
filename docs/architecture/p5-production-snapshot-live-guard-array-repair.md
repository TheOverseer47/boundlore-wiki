# P5-E.10B-W5-A1-R2-F1 — Live Guard Nested-Array Repair

## 1. Incident Summary

An authorized W5-A1-R2 start failed immediately with
`STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED: missing guards: System.Object[]`
before credential prompts or external access.

## 2. R2 Runtime Output

```
STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED:
missing guards: System.Object[]
```

## 3. Exact Failing File and Line

- File: `tools/backup/Invoke-BoundLoreProductionSnapshot.ps1`
- Approx line: 248 (live-intent missing-guards stop)
- Caller: `$missing = @(Test-AllLiveGuardsPresent)` then `Get-StrictCount` / `-join`

## 4. Root Cause

Confirmed: R1 used `return , @($missing)` (unary comma) to prevent empty/single unwrap.
The caller also wrapped with `@(...)`. That combination nests a single `Object[]` inside
another array.

## 5. Nested Array Explanation

Structure at failure:

1. Function returns one pipeline object: an `Object[]` (possibly empty).
2. Caller `@(...)` wraps that object → `Object[]{ Object[] }`.
3. `Get-StrictCount` → `1` even when no guard names are missing.
4. `$missing -join ","` stringifies the inner array as `System.Object[]`.

Offline repro under Windows PowerShell 5.1 StrictMode:

- unary comma + `@()` → `count=1 join=System.Object[]`
- `return @($missing)` + `@()` → `count=0` when empty; concrete names when missing

## 6. PowerShell 5.1 Pipeline Unwrapping

Empty and single-element arrays unwrap on function return unless forced.
Unary comma forces a single array object; that is correct only when the caller does
**not** re-wrap. With caller `@()`, unary comma is harmful.

## 7. Previous R1 Repair Interaction

R1 correctly fixed `PropertyNotFoundStrict` on `.Count` for `$null`/scalars, but the
unary-comma return conflicted with the caller `@()` normalization boundary, creating
this R2 false-positive authorization stop when all guards were present.

## 8. Final Repair

Exactly one normalization boundary:

- Function: `return @($missing)` (enumerable guard-name strings)
- Caller: `$missing = @(Test-AllLiveGuardsPresent)`
- Message formatting joins concrete string names; nested `Object[]` is rejected

## 9. Null / Single / Multiple Behavior

| Case | Count | Message |
|---|---:|---|
| All guards present | 0 | no authorization stop |
| One missing | 1 | `missing guards: <Name>` |
| Many missing | N | comma-separated concrete names |
| `$null` via `Get-StrictCount` | 0 | — |

## 10. Missing-Guard Message Validation

Must never emit `System.Object[]`. Offline tests assert concrete names for 1/many cases.

## 11. Full Guard-Set Validation

Required set unchanged: LiveExecution, AllowProductionRead, AllowSupabaseStorageRead,
AllowExternalWasabiUpload, ConfirmProductionProjectRef (exact production ref),
ConfirmReleaseGateLocked, ConfirmEncryptedOutputOnly, ConfirmWasabiProductionScope,
ConfirmVeraCryptWorkspaceMounted, ConfirmLocalEncryptedArchiveCopy,
ConfirmUserAuthorizedSnapshot, ProductionRecipientFile. Staging remains blocked.

## 12. Offline Regression Tests

`qa/p5-production-snapshot-count-regression-check.py` covers nested anti-pattern,
flat 0/1/many guards, StrictMode, staging/wrong-project stops, full-guard fail-closed
without V:, and synthetic `external_requests: 0`. No live network execution.

## 13. Evidence of No External Access

R2 failed at guard formatting before prompts. Repair used offline QA only.

- external access proven: NO
- Production read proven: NO
- Wasabi mutation proven: NO

## 14. Artifact Check

- evidence file absent
- no repository rclone config
- V: not mounted at investigation
- no observed new encrypted archive for this attempt

local backup artifact created: NO

## 15. Secret Scan

Scoped to changed tracked files. Rejection markers only; no real secrets.

## 16. Safety Preservation

Safe defaults, full confirmation set, staging/VeraCrypt/recipient guards, credential
isolation, and one-upload rule unchanged. No LiveExecution against external targets
during repair.

## 17. Retry Authorization Boundary

A new explicit user authorization is required before any further W5-A1 attempt.
This gate does not start a live run.

## 18. Final Decision

`PASS_LIVE_GUARD_ARRAY_REPAIRED_READY_FOR_NEW_AUTHORIZATION` when offline QA passes
and the local repair commit exists without push.
