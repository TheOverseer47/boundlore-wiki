# P5-E.10B-W5-P2 — Production Snapshot Runner Finalization

## 1. Executive Result

**Verdict:** `PASS_PRODUCTION_SNAPSHOT_RUNNER_READY_FOR_EXPLICIT_LIVE_AUTHORIZATION`

The production snapshot runner is finalized with fail-closed defaults, VeraCrypt workspace guards, production recipient validation, credential-separation design, full DB/storage export sequences (disarmed), single `.age` packaging, local encrypted archive copy, and upload-only Wasabi scope (no GetObject). Live network execution remains reserved for **W5-A1**. Offline synthetic + negative tests: PASS. External requests: **0**.

## 2. Authorization Boundary

Authorized: local tooling finalization, offline tests, QA, docs, local commit.

Not performed: Supabase/Wasabi network, dumps, uploads, credential prompts, VeraCrypt mount, private key access, push/deploy/launch.

## 3. Git Baseline

| Item | Value |
|---|---|
| Baseline | `4861099` |
| Branch | `review/p5-e10b-w5-p2-production-snapshot-runner` |

## 4. Manual Preparation State

User-confirmed (agent read-only existence checks only): private production Wasabi bucket + principal (no Delete/GetObject/Billing/IAM); production age recipient file present and public-only; VeraCrypt container present (~20 GiB), currently unmounted; host `D:` holds only encrypted durable artefacts by policy.

## 5. Production Identity

Guard expects production ref `ohkoojpzmptdfyowdgog`; staging `jzzgoiwfbuwiiyvwgwri` always blocked; release gate must be locked (`contribution_locked=true`) before live export.

## 6. VeraCrypt Workspace

Live plaintext work requires mounted `V:` under `V:\BoundLoreProductionSnapshot\<backup-id>\`. Runner never mounts VeraCrypt and never requests its password. Host volumes `C:`/`D:` rejected for plaintext workspace.

## 7. Production Recipient Validation

Recipient file: exactly one `age1…` line; reject `AGE-SECRET-KEY`; fingerprint (SHA-256) only in evidence; full recipient never logged or committed.

## 8. Runtime Credential Separation

DB password / storage service-role / Wasabi keys: SecureString → child-process env only → wipe. No credential parameters. Not prompted in W5-P2.

## 9. Database Export Sequence

Designed: identity → release gate → schema inventory → extensions/security inventories → `pg_dumpall --roles-only --no-role-passwords` → `pg_dump -Fc` → TOC → SHA-256 → VeraCrypt-only paths. Live network disarmed (`STOP_LIVE_NETWORK_RESERVED`).

## 10. Supabase-specific Coverage

Schemas allowlist + unknown non-system schema stop; auth/storage metadata included in planned dump coverage; no assumption a single default dump is complete without inventories.

## 11. Storage Export Sequence

Allowlist buckets only; stream + SHA-256; start/end inventory compare; no upload/update/delete; live disarmed.

## 12. Snapshot Consistency Model

Pre/post release-gate, schema, bucket counts/sizes; fail-closed on drift; no freeze/lock mutation.

## 13. Package and Manifest

Production-shaped tree → one final `.age` archive; public summary redacted; full manifest encrypted in live design.

## 14. Encryption Before Upload

age with production recipient only; plaintext upload attempts stop (`STOP_PLAINTEXT_UPLOAD_ATTEMPTED`).

## 15. Local Encrypted Copy

After encrypt: durable `.age` copy under redacted host archive class (`LOCAL_ENCRYPTED_ARCHIVE_LOCATION_REDACTED`); no plaintext on `D:`.

## 16. Wasabi Production Scope

Region `eu-central-2`, endpoint `s3.eu-central-2.wasabisys.com`, prefix `production-snapshots/<backup-id>/`. Trial prefix/principal forbidden. Bucket name runtime-only, redacted in evidence.

## 17. Upload-only Principal Limitation

Snapshot path: put/list only; **no GetObject**; **no Delete**.

## 18. Remote Verification Boundary

May document upload exit 0 + list/size if permitted. Must **not** claim remote decrypt/restore. Evidence: `remote_readback: NOT_YET_PERFORMED`.

## 19. Cleanup Model

After local encrypted copy + successful upload (live): wipe VeraCrypt plaintext workspace; prompt user to manually dismount `V:`. No automatic VeraCrypt control.

## 20. Live Evidence Schema

Defined for later: `qa/evidence/p5-e10b-w5-production-snapshot.json` (redacted fields only). Not written by offline synthetic run into repo as live evidence.

## 21. Production Runner Guards

All live confirmations required including `LiveExecution`, VeraCrypt, recipient file, local encrypted copy. Partial set → `STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED`. Network still reserved.

## 22. Negative Tests

Staging, wrong ref, partial guards, trial prefix, region mismatch, unknown schema/bucket, VeraCrypt/unsafe workspace, missing/private recipient: PASS.

## 23. Synthetic Positive Test

Mock DB + 3 buckets + package + real age + local encrypted copy + local rclone mock upload + redacted summary + cleanup: PASS. External requests 0.

## 24. Static QA

`qa/p5-production-snapshot-runner-static-check.py`

## 25. Runtime QA

`qa/p5-production-snapshot-runner-runtime-check.py` (offline only; W4 runner not executed)

## 26. Secrets and Redaction

No credentials, private keys, full recipient, bucket name, or personal paths in Git.

## 27. Actual Live Authorization Required

Next gate **W5-A1** must explicitly authorize read-only production access + encrypted Wasabi upload.

## 28. Manual Runtime Steps (future)

Mount VeraCrypt `V:` → provide recipient path → SecureString credentials in local terminal → confirm all switches → run → verify local `.age` → upload → cleanup → dismount `V:`.

## 29. Restore Dependency

Remote round-trip decrypt/restore requires separate restore principal + later restore gate.

## 30. Known Limitations

Live network disarmed; upload-only principal cannot prove remote ciphertext fetch; Free-plan Supabase limits unchanged.

## 31. Architecture Preservation

No application/Supabase/Cloudflare/dependency/SQL product changes.

## 32. Changed Files

- `tools/backup/Invoke-BoundLoreProductionSnapshot.ps1`
- `tools/backup/Export-BoundLoreDatabase.ps1`
- `tools/backup/Export-BoundLoreStorage.py`
- `tools/backup/_lib/stop_codes.py`
- `qa/p5-production-snapshot-runner-static-check.py`
- `qa/p5-production-snapshot-runner-runtime-check.py`
- `docs/architecture/p5-production-snapshot-runner-finalization.md`

## 33. Commands Executed

Git preflight/branch; `Test-Path` on container/recipient; recipient format validation (fingerprint only); tool versions; offline runner/QA; diff/secret scan; local commit. No network.

## 34. Safety Attestation

Production DB/storage/Wasabi/credentials/private key/VeraCrypt mount/restore/billing/push/deploy/launch: **NO**.

## 35. Final Decision

**`PASS_PRODUCTION_SNAPSHOT_RUNNER_READY_FOR_EXPLICIT_LIVE_AUTHORIZATION`**

## 36. Next Gate

**P5-E.10B-W5-A1 — Controlled Read-only Production Snapshot and Encrypted Wasabi Upload**
