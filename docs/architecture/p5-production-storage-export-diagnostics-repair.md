# P5-E.10B-W5-A1 — Storage Export Diagnostics Repair

## 1. Incident Summary

The second separately authorized W5-A1 Production snapshot attempt stopped after a
successful database export with:

`STOP_STORAGE_EXPORT_INCOMPLETE: storage export exit=1`

Prior markers included `RELEASE_GATE_LOCKED_PASS`, `PRODUCTION_IDENTITY_PASS`, and
`DATABASE_EXPORT_PASS`. Storage wrote **0** files. Manifest, age encryption, local
`.age` copy, Wasabi upload, read-back, and restore did not start.

## 2. Diagnostic Gap (first fix)

`LiveProductionSnapshot.ps1` discarded storage-child stdout/stderr (`$null = …ReadToEnd()`),
so only the numeric exit code reached the operator.

**Repaired on `fb4d0d2`:** streams captured into `$stOut`/`$stErr` and passed through
`Resolve-StorageChildFailure`.

## 3. Follow-up Gap (envelope)

A later authorized run still yielded:

`STOP_STORAGE_EXPORT_INCOMPLETE: unclassified storage child failure`

Cause: child exit ≠ 0 without a parent-recognized structured line. See
`docs/architecture/p5-production-storage-child-envelope-repair.md` for the
`BL_STORAGE_STOP|…` envelope repair.

## 4. Redaction Rules

Removed from diagnostics:

- Service-role / bearer tokens
- `Authorization` and `apikey` header values
- JWT-shaped tokens
- Storage object URL path segments and object filesystem paths
- HTTP response bodies (never forwarded)

Allowed:

- Stopcode names
- Envelope phase / http / allowlisted bucket / kind
- Harmless metadata: exit-code, stdout-bytes, stderr-bytes, sentinel-detected

## 5. Safety Boundary

No new Production access, snapshot retry, dump, storage call, Wasabi, VeraCrypt mount,
or artifact inspection/mutation during diagnostic repairs.

A further Production snapshot still requires a new explicit user authorization.

## 6. Final Decision

See envelope repair doc for current verdict after structured child envelopes land.
