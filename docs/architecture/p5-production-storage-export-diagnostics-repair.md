# P5-E.10B-W5-A1 — Storage Export Diagnostics Repair

## 1. Incident Summary

The second separately authorized W5-A1 Production snapshot attempt stopped after a
successful database export with:

`STOP_STORAGE_EXPORT_INCOMPLETE: storage export exit=1`

Prior markers included `RELEASE_GATE_LOCKED_PASS`, `PRODUCTION_IDENTITY_PASS`, and
`DATABASE_EXPORT_PASS`. Storage wrote **0** files. Manifest, age encryption, local
`.age` copy, Wasabi upload, read-back, and restore did not start.

## 2. Diagnostic Gap

`LiveProductionSnapshot.ps1` discarded storage-child stdout/stderr (`$null = …ReadToEnd()`),
so only the numeric exit code reached the operator. The Python exporter already emitted
redacted stopcodes that were never shown.

## 3. Repair

- Capture child stdout/stderr into locals.
- Redact via `Protect-StorageDiagnosticText` before any operator-facing message.
- Map known child stopcodes through `Resolve-StorageChildFailure`.
- Preserve HTTP phase labels: `bucket-list`, `object-list`, `object-download` + status
  (+ allowlisted bucket name when needed).
- Unclassified child failures remain fail-closed:
  `STOP_STORAGE_EXPORT_INCOMPLETE: unclassified storage child failure`.

## 4. Redaction Rules

Removed from diagnostics:

- Service-role / bearer tokens
- `Authorization` and `apikey` header values
- JWT-shaped tokens
- Storage object URL path segments and object filesystem paths
- HTTP response bodies (never forwarded)

Allowed:

- Stopcode names
- Phase labels and HTTP status codes
- Allowlisted bucket names

## 5. Safety Boundary

No new Production access, snapshot retry, dump, storage call, Wasabi, VeraCrypt mount,
or artifact inspection/mutation. Existing Production export artefacts on V: left untouched
(V: was not mounted during this repair).

A further Production snapshot still requires a new explicit user authorization.

## 6. Final Decision

`PASS_STORAGE_EXPORT_DIAGNOSTICS_REPAIRED_OFFLINE` after offline QA and local commit.
