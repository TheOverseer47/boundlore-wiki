# P5-E.10B-W5-A1-R4-D4 — Production Session Pooler Release-Gate Diagnosis

## 1. Incident Summary

Direct-host access is blocked by missing local IPv6 default route (D3). D4 authorized
and completed a single read-only Session Pooler diagnosis for `public.release_gate`.

Gate context: P5-E.10B-W5-A1-R4-D4 (post-D3 IPv6 route gap).

## 2. IPv6 Limitation

Production direct host is AAAA-only; this workstation has no IPv6 default route. Direct
TCP:5432 was not reachable (D3). Session Pooler (Shared / Session mode, port 5432) was
used as the explicitly chosen alternative path.

## 3. D4 Authorization

Explicit user authorization for Shared Pooler / Session mode only: port 5432, database
`postgres`, user `postgres.<production-ref>`, one psql attempt, one SELECT.

## 4. Supabase Connect Source

Operator copied Host and User only from Production → Connect → Session pooler /
Shared Pooler Session mode → View parameters. No connection string paste. No settings change.

## 5. Session Pooler Identity Validation

Host must end with `.pooler.supabase.com` (region Shared Pooler hostname), reject direct
host, URLs, embedded ports, staging ref, and foreign domains. Production identity is
enforced via user `postgres.<production-ref>` exactly (not via hostname).

Production Project Ref (identity guard): `ohkoojpzmptdfyowdgog`  
Staging Project Ref (blocked): `jzzgoiwfbuwiiyvwgwri`

## 6. Port and Database Enforcement

Port fixed `5432`. Transaction pooler port `6543` rejected. Database fixed `postgres`.

## 7. Credential Handling

`Read-Host -AsSecureString` → child-only `PGPASSWORD` via ProcessStartInfo → ZeroFreeBSTR
and parent cleanup. No files, args, or logs. No password, connection string, or secret
was written into this document or Git evidence.

## 8. SSL and Read-only Enforcement

`PGSSLMODE=require`, `default_transaction_read_only=on`, statement/lock timeouts.
Live D4 confirmed SSL and read-only session enforcement.

## 9. Single Connection Attempt

Exactly one `Invoke-SessionPoolerGateQuery` / psql process. No retry.

## 10. Release-Gate Result

Live D4 accepted exactly one result row with `id=1` and `contribution_locked=true`
(`1|t` / `1|true` class). Exact success markers from the single local live run:

```
SESSION_POOLER_IDENTITY_PASS
PRODUCTION_DB_CONNECTION_PASS
RELEASE_GATE_LOCKED_PASS
R4_D4_DIAGNOSIS_PASS
```

## 11. Error Classification

Redacted classes only (`SESSION_POOLER_*`, `DB_PASSWORD_REJECTED`, gate result classes…).
Raw stderr, hosts, and usernames are not stored in Git evidence.

## 12. Root Cause

Direct host unreachable locally due to missing IPv6 default route (D3). Official Session
Pooler on port 5432 reaches Production and returns a locked release gate when identity
and credentials are correct.

## 13. Minimal Snapshot-Tooling Repair

Production snapshot runner gains an explicit `-DatabaseConnectionMode` switch:

- Default: `Direct` (unchanged fail-closed direct-host path; no automatic pooler fallback)
- Explicit: `SessionPooler` (host suffix `.pooler.supabase.com`, user
  `postgres.ohkoojpzmptdfyowdgog`, port 5432 only, database `postgres`, staging blocked,
  direct host blocked, `PGSSLMODE=require`, existing read-only `PGOPTIONS`)

Gate failures are separated:

- `STOP_PRODUCTION_DB_CONNECTION_FAILED`
- `STOP_RELEASE_GATE_QUERY_FAILED`
- `STOP_RELEASE_GATE_NOT_LOCKED`

## 14. No Automatic Fallback

No automatic switch from Direct to Pooler. SessionPooler is used only when the caller
selects it explicitly.

## 15. Offline QA

`qa/p5-production-session-pooler-diagnosis-check.py` plus related offline snapshot
runner / release-gate suites. No live diagnosis re-run during post-live finalization.

## 16. Secret Scan

No passwords, full hosts, connection strings, keys, or PGPASSWORD values in Git evidence.

## 17. Safety Preservation

D4 live run and post-live finalization: no dump, no storage access, no Wasabi, no
VeraCrypt mount, no SQL mutation, no Supabase config change, no upload, no restore,
no push, no deploy. Full production snapshot was not started.

## 18. Retry Boundary

Manual diagnosis completed once. A production snapshot still requires a new explicit
authorization for exactly one SessionPooler-mode run. No automatic retry.

## 19. Final Decision

`PASS_SESSION_POOLER_DB_AND_RELEASE_GATE_VERIFIED_RUNNER_REPAIRED` after documentation,
explicit SessionPooler mode, offline QA, secret scan, and local commit.
