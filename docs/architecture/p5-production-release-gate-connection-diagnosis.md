# P5-E.10B-W5-A1-R4-D1 — Production Release-Gate Connection Diagnosis

## 1. Incident Summary

A prior W5-A1 live attempt stopped with `STOP_RELEASE_GATE_NOT_LOCKED: gate query failed`.
That stop does not prove the gate is unlocked; it only proves the runner could not
successfully execute or interpret the release-gate query.

## 2. Previous Stop Code

`STOP_RELEASE_GATE_NOT_LOCKED` with message `gate query failed` (psql exit code ≠ 0 path).

## 3. Diagnostic Authorization

Explicit user authorization for R4-D1: one read-only production DB diagnosis only.
No dump, storage, Wasabi, VeraCrypt mount, upload, restore, push, or deploy.

## 4. Production Identity

- Expected ref: production project (hashed/redacted in public evidence)
- Expected direct host class: `db.<production-ref>.supabase.co`
- Port/database/user: `5432` / `postgres` / `postgres`
- Staging ref: fail-closed blocked

## 5. Existing Runner Analysis

`Invoke-PgChild` in `LiveProductionSnapshot.ps1`:

- Sets child `PGPASSWORD` and `PGOPTIONS` (read-only + timeouts)
- Does **not** set `PGSSLMODE=require` (likely Supabase connection failure class)
- Does **not** set `PGCONNECT_TIMEOUT`
- Maps any non-zero psql exit to `STOP_RELEASE_GATE_NOT_LOCKED` / `gate query failed`
  (loses connection vs unlocked distinction)
- Uses `-v ON_ERROR_STOP=1 -t -A` without `-X --no-psqlrc`

## 6. Dedicated Diagnostic Design

`tools/backup/Test-BoundLoreProductionReleaseGate.ps1`:

- Fixed production direct host (no interactive host override)
- Single allowed SELECT on `public.release_gate`
- Redacted error classification
- Offline self-test switch

## 7. Credential Handling

`Read-Host -AsSecureString` → brief plaintext for child `ProcessStartInfo` only →
`ZeroFreeBSTR` / clear managed reference / no parent `PGPASSWORD`.

## 8. Read-only Enforcement

Child env: `PGSSLMODE=require`, `PGCONNECT_TIMEOUT=10`,
`PGOPTIONS=-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=5000`.
psql: `-X --no-psqlrc --set ON_ERROR_STOP=1 --tuples-only --no-align`.

## 9. DNS/TCP Classification

Optional DNS resolve before connect. Failures classified without dumping raw stderr.

## 10. psql Invocation

ProcessStartInfo, redirected stdout/stderr, CreateNoWindow, UseShellExecute=false.

## 11. Release-Gate Result

Manual diagnostic markers (operator-reported):

```
R4_D1_DIAGNOSIS_FAILED
ERROR_CLASS=DNS_RESOLUTION_FAILED
PSQL_EXIT_CODE=-1
```

`PSQL_EXIT_CODE=-1` is the diagnostic sentinel for a pre-psql failure: DNS resolution of the
fixed production direct host failed before any database session or release-gate SELECT.

Release-gate lock state is therefore **not proven** by this run (neither locked nor unlocked).

## 12. Root Cause

Confirmed for this attempt: **DNS resolution failure** for the fixed production direct host
class (`db.<production-ref>.supabase.co`), prior to SSL/auth/query.

Not confirmed by this run:

- database password validity
- SSL negotiation
- `contribution_locked` value
- live `Invoke-PgChild` SSL gap as the sole prior-stop cause (still a static candidate, but
  unreachable until DNS succeeds)

Prior live stop `STOP_RELEASE_GATE_NOT_LOCKED: gate query failed` remains consistent with
connection-class failures being mislabeled, but this diagnosis did not reach psql.

## 13. Minimal Repair

**Not applied.** No runner repair is justified until DNS to the direct host succeeds and a
release-gate row is proven. No pooler fallback. No second diagnostic run.

## 14. Offline QA

`qa/p5-production-release-gate-diagnosis-check.py` passed before the manual run.

## 15. Secret Scan

No password, connection string, or credential material entered into Git or Cursor.

## 16. Safety Preservation

No full backup, dump, storage, Wasabi, SQL write, VeraCrypt automation, upload, restore,
push, or deploy.

## 17. Retry Boundary

No automatic retry. Further diagnosis or snapshot attempts require new explicit user
authorization after DNS/network conditions are addressed by the operator.

## 18. Final Decision

`STOP_DNS_OR_IPV6_CONNECTIVITY`
