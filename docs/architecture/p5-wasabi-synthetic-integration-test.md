# P5-E.10B-W4 — Encrypted Synthetic Wasabi Integration Test

## 1. Executive Result

**Verdict:** `PASS_ENCRYPTED_SYNTHETIC_WASABI_ROUNDTRIP_VERIFIED`

One fully synthetic local package was age-encrypted, uploaded once to the authorized Wasabi trial prefix, downloaded once, decrypted, and fully validated. Closure gate F1 evaluated redacted evidence only — **no second network run**.

## 2. Authorization

User authorized P5-E.10B-W4 for exactly one synthetic encrypted upload and one read-back under `trial-integration/`. Production backup, delete, billing, and dashboard actions remained forbidden.

## 3. Manual Execution Result

Manual SecureString runner reported:

- `PREUPLOAD_VALIDATION_PASS`
- `W4_ROUNDTRIP_PASS`
- `EVIDENCE_WRITTEN=qa/evidence/p5-e10b-w4-wasabi-synthetic-roundtrip.json`

Evidence `verdict` matches: `PASS_ENCRYPTED_SYNTHETIC_WASABI_ROUNDTRIP_VERIFIED`.

## 4. Commercial Boundary

Wasabi trial activated by the user. Agent did not open billing, select plans, renew, purchase, enable versioning/object-lock/lifecycle, or create buckets/users/keys. Paid continuation: **NOT AUTHORIZED**.

## 5. Git Baseline

| Item | Value |
|---|---|
| Baseline commit | `e4f9909` |
| Branch | `review/p5-e10b-w4-wasabi-synthetic-integration` |
| Prior offline verdict | `PASS_REAL_OFFLINE_BACKUP_TOOLCHAIN_VERIFIED` |

## 6. Restricted Wasabi Target

| Field | Value |
|---|---|
| Provider | Wasabi |
| Region | `eu-central-2` |
| Endpoint class | `s3.eu-central-2.wasabisys.com` |
| Bucket | REDACTED |
| Prefix | `trial-integration/` |
| Object | REDACTED (evidence stores `object_name_sha256` only) |
| Public access | private (user-confirmed prep) |
| Versioning / Object Lock / Lifecycle | off/suspended (user-confirmed prep) |

## 7. Credential Handling

Interactive `Read-Host -AsSecureString` only → in-memory BSTR → rclone child `ProcessStartInfo` env → wipe. No parameters, no rclone.conf, no files, no chat, no logs of secrets. Evidence: `credential_persistence: false`, `rclone_config_persisted: false`.

## 8. Synthetic Package

Synthetic-only placeholders (database/storage/configuration), manifest + SHA-256. Evidence: `synthetic: true`, `production_data: false`. Encrypted size: 2777 bytes (≤ 2 MiB).

## 9. Encryption Before Upload

Ephemeral age keypair in temp; archive then age to single `.age`. Evidence: `encrypted_before_upload: true`, `age_encryption: PASS`. Plaintext never uploaded.

## 10. Upload Result

Exactly **one** upload (`upload_count: 1`, `upload_attempts: 1`).

## 11. Read-back Result

Exactly **one** download of the same object (`download_count: 1`, `download_attempts: 1`).

## 12. SHA-256 Verification

`local_source_sha256` == `readback_sha256`
(`66481a1f019598d48295bbc5bf766ee85e2cf2ed35f22023bcea92d4bc8bff38`)

## 13. Byte Comparison

Evidence: `byte_comparison: PASS`.

## 14. Decryption

Evidence: `decryption: PASS` (local ephemeral test key only; key destroyed in cleanup).

## 15. Manifest and Package Validation

Evidence: `manifest_validation: PASS`, `package_validation: PASS`.

## 16. Remote Object Retained

**YES** — `remote_object_retained: true`. No DeleteObject / purge / sync-delete. Delete attempted: **false**.

## 17. Local Cleanup

Evidence: `local_cleanup: PASS` (ephemeral keys, plaintext, downloads, empty rclone config, process credential material).

## 18. QA Results

- `qa/p5-wasabi-synthetic-integration-static-check.py` — PASS
- `qa/p5-wasabi-synthetic-integration-evidence-check.py` — PASS
- `qa/p5-backup-tooling-static-check.py` — PASS
- `qa/p5-backup-tooling-runtime-check.py` — PASS
- `tools/backup/Test-BoundLoreBackupPackage.py` — PASS (offline only; no Wasabi runner)

## 19. Secret Scan

Tracked/changed/evidence scope only. No Access Key, Secret, age private key, JWT, Supabase key, or full bucket name in evidence/docs. Sensitive untracked `.env*` / dumps not opened.

## 20. Evidence Validation

File: `qa/evidence/p5-e10b-w4-wasabi-synthetic-roundtrip.json`
Gate `P5-E.10B-W4`; bucket `REDACTED`; object hashed; credentials absent; personal paths absent; verdict PASS.

## 21. Changed Files

- `tools/backup/Invoke-BoundLoreWasabiSyntheticTest.ps1`
- `qa/p5-wasabi-synthetic-integration-static-check.py`
- `qa/p5-wasabi-synthetic-integration-evidence-check.py`
- `qa/evidence/p5-e10b-w4-wasabi-synthetic-roundtrip.json`
- `docs/architecture/p5-wasabi-synthetic-integration-test.md`

## 22. Architecture Preservation

No application, Supabase, Cloudflare, dependency, SQL, or runtime product changes.

## 23. Known Limitations

- Trial object retained until user cleanup
- Not a Production backup or restore proof
- Free-plan Supabase backup limits from P5-E.10A unchanged

## 24. Trial Expiration Risk

Integration-only. Before expiry the user must decide paid continuation or wind-down. Agent must not renew or purchase.

## 25. Next Gate

**P5-E.10B-W5-P1 — Production Backup Snapshot and Key-Custody Preflight** (preflight only; no production dump/upload/restore).

## 26. Commands Executed

- Git preflight on `review/p5-e10b-w4-wasabi-synthetic-integration`
- Evidence JSON validation (local read only)
- W4 static + evidence QA; existing offline backup QA
- Secret/artefact/diff control
- Local commit only (no push)
- **No** re-run of `Invoke-BoundLoreWasabiSyntheticTest.ps1`
- **No** rclone/Wasabi/API/dashboard during F1

## 27. Safety Attestation

- Exactly one historical upload + one historical download (manual W4 run)
- No second network access during closure
- No Supabase access; no production data
- No delete; remote synthetic object retained
- No credentials persisted; no rclone.conf persisted
- Paid continuation not authorized
- No push / deploy / launch

## 28. Final Decision

**`PASS_ENCRYPTED_SYNTHETIC_WASABI_ROUNDTRIP_VERIFIED`**
