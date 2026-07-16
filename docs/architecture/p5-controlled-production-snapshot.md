# P5-E.10B-W5-A1 — Controlled Read-only Production Snapshot

## 1. Executive Result

This gate prepares and (after manual operator execution) records exactly one controlled, read-only production snapshot: PostgreSQL dump + roles without password hashes, allowlisted storage binaries, redacted recovery inventories, internal SHA-256 manifests, one age-encrypted archive, one local encrypted copy, and one Wasabi production-scope upload. Restore and remote read-back remain out of scope.

## 2. Explicit User Authorization

The user explicitly authorized P5-E.10B-W5-A1 for: production read-only database and storage access, release-gate verification, encrypted local archive retention, and a single Wasabi upload under the prepared production backup scope. Restore, GetObject read-back, delete, push, deploy, launch, and paid commercial actions are not authorized.

## 3. Commercial Boundary

Wasabi production backup scope uses the manually prepared production principal and bucket. Trial scope and trial principal are forbidden. Billing, subscription, upgrade, and paid continuation actions are not authorized for the agent.

## 4. Git Baseline

- Expected baseline: `8c5ed40` on `review/p5-e10b-w5-p2-production-snapshot-runner`
- Working branch: `review/p5-e10b-w5-a1-controlled-production-snapshot`
- No push in this gate

## 5. Production Identity

Expected production project ref is confirmed by runner guards and interactive DB host identity containing the production ref. Staging ref is fail-closed blocked. Storage base URL must be exactly `https://<production-ref>.supabase.co`. Full project ref is hashed in public evidence.

## 6. Release Gate Verification

Read-only SQL checks `public.release_gate` id=1 with `contribution_locked = true` before and after export. Unlock or drift stops the run with no upload.

## 7. VeraCrypt Workspace

Plaintext work occurs only under the manually mounted `V:` workspace root. The runner never mounts or dismounts VeraCrypt. After cleanup it emits `MANUAL_VERACRYPT_DISMOUNT_REQUIRED`.

## 8. Credential Handling

Non-secret connection values are prompted interactively. Secrets use `Read-Host -AsSecureString`, exist only in memory, are passed only to child-process environments (`PGPASSWORD`, storage exporter env, rclone env), and are cleared in `finally`. No credential parameters, files, persistent rclone config, or history-safe logging of secrets.

## 9. Database Export

`pg_dump` custom format (`-Fc`) covers the authorized database including auth and storage metadata schemas. TOC is generated via `pg_restore --list` and must be non-empty.

## 10. Role Export

`pg_dumpall --roles-only --no-role-passwords`. Presence of `PASSWORD '...'` fails closed.

## 11. Schema and Security Coverage

Non-system schemas are compared to a fixed allowlist. Unknown schemas stop the run. Inventories capture aggregated counts for tables, routines, triggers, policies, and extensions without publishing confidential full lists in Git evidence.

## 12. Storage Export

Exactly three buckets: `avatars`, `discovery-uploads`, `report-screenshots`. Live exporter supports paginated list and streamed download only. Upload/update/delete are forbidden. Object paths are hashed for local filenames and public evidence.

## 13. Start/End Consistency

Start and end baselines for release gate, schema/count inventories, and storage object sets must match. Drift stops before encryption/upload as applicable.

## 14. Recovery Inventories

Redacted Supabase, Cloudflare, and GitHub recovery inventories are packaged inside the encrypted archive. No secret values.

## 15. Manifest and Checksums

Internal VeraCrypt-side manifest includes dump hashes, inventory aggregates, encryption method, recipient fingerprint, upload boundary flags, and validation status.

## 16. age Encryption

Encryption uses only the public production recipient file. Private identity is never requested by the runner. Exactly one `.age` output is produced.

## 17. Local Encrypted Copy

Exactly one local encrypted copy is retained under the local encrypted-archives class. Source/target SHA-256 and size must match. Plaintext is forbidden in that directory.

## 18. Wasabi Production Scope

Provider Wasabi, region `eu-central-2`, endpoint `s3.eu-central-2.wasabisys.com`, prefix class `production-snapshots/`. Bucket name is interactive and redacted. Trial prefix is forbidden.

## 19. Upload-only Principal

Upload uses ephemeral empty rclone config and child-only credentials. Allowed high-level operation: single `copyto`. GetObject and DeleteObject are not used.

## 20. Upload Result

Exactly one high-level upload invocation and exactly one expected remote object under the backup-id prefix.

## 21. Remote Size Verification

List-only verification confirms object presence and size match. Remote content hash and decryptability are not claimed.

## 22. No Read-back Boundary

Remote read-back, download, decryption, and restore are explicitly `NOT_PERFORMED` and reserved for later gates.

## 23. Local Cleanup

After successful encryption, local copy, upload, and size verification, plaintext under `V:` is removed. The local `.age` copy is retained.

## 24. Manual VeraCrypt Dismount

Operator dismounts `V:` manually after success markers.

## 25. Evidence

Redacted evidence path: `qa/evidence/p5-e10b-w5-production-snapshot.json`.

## 26. QA

Offline static/runtime preflight and runner checks must pass before live authorization. Live evidence check validates redacted evidence after the operator reports success markers. W4 Wasabi runner is not re-executed.

## 27. Secret Scan

Tracked/changed evidence and tooling are scanned for real credentials, private keys, full recipients, bucket names, and personal paths.

## 28. Architecture Preservation

No application, Supabase mutation, Cloudflare, dependency, or runtime web changes are in scope for this gate.

## 29. Known Limitations

Upload-only principal cannot prove remote byte identity beyond listed size. Encryption integrity of the remote object is not proven without a later GetObject-capable restore principal.

## 30. Restore Still Required

Isolated restore remains required before RPO/RTO can be operational.

## 31. RPO/RTO Status

RPO ≤ 24h and RTO ≤ 8h remain not yet operational/measured until restore evidence exists.

## 32. Changed Files

Backup tooling, W5-A1 QA, redacted evidence, and this document only.

## 33. Commands Executed

Git preflight, tool version checks, offline QA scripts, and (operator-run) a single live PowerShell invocation without credential arguments. No push.

## 34. Safety Attestation

Production read may occur during the authorized live run. Production write, staging access, plaintext upload, private age identity use, GetObject, DeleteObject, restore, billing, push, deploy, and launch do not occur in this gate.

## 35. Final Decision

Recorded in evidence `verdict` after the manual live run and offline evidence QA. Until then the gate is prepared for `MANUAL_USER_ACTION_REQUIRED`.

## 36. Next Gate

On full PASS: `P5-E.10B-W6-P1` — Read-only Restore Principal and Isolated Restore Preflight (planning only; no download/decrypt/restore yet).
