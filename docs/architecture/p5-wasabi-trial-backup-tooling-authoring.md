# P5-E.10B-W2 — Wasabi Trial Backup Tooling Authoring

## 1. Executive Result

**Verdict:** `CONDITIONALLY_READY_MANUAL_TOOL_INSTALLATION_REQUIRED`

Local BoundLore backup tooling is authored with **fail-closed safe defaults** (DryRun / Synthetic / NoNetwork). A full synthetic offline package dry-run **PASS**es (manifest, checksums, mock FS transfer, mock restore, cleanup, zero external requests).

Encryption and real S3 CLIs are **not installed** on this workstation (`age`, `rclone`, `aws`, `gpg`, `7z` missing). Live encryption therefore remains blocked by `STOP_ENCRYPTION_UNAVAILABLE` until the user manually installs a preferred tool (age). No Wasabi/Supabase/Production actions were performed.

## 2. Authorization Boundary

Authorized and performed: local tooling inventur, authoring, synthetic offline tests, QA, documentation, local commit.

Not performed: Wasabi login/API/upload, Supabase dump/read/mutation, Production/Staging SQL, installs, push, deploy, billing, bucket/IAM creation.

## 3. Git Baseline

| Item | Value |
|---|---|
| Baseline branch | `review/p5-e10a-backup-restore-readiness` |
| Baseline commit | `4aff602` |
| Authoring branch | `review/p5-e10b-w2-wasabi-backup-tooling` |

## 4. Wasabi Trial Context

- Account/trial activated **manually by the user** (prior to this gate)
- Target region for later use (document only): Wasabi **eu-central-2** (Frankfurt)
- Agent performed **no** Wasabi account, billing, region, bucket, or credential actions
- Paid continuation: **NOT AUTHORIZED**
- Automatic conversion / agent purchase: **FORBIDDEN**

## 5. No-Paid-Agent-Action Rule

No agent action that can create cost > 0 EUR is permitted. Trial presence does not grant commercial agency. Only the user may choose plans, payment, renewal, or paid storage.

## 6. Local Tool Inventory

| Tool | Installed | Version | Suitable Role | Limitation |
|---|---:|---|---|---|
| git | yes | 2.54.0 | VCS | — |
| py / Python | yes | 3.11.7 | packaging, storage export, QA | store stub `python` launcher unusable |
| PowerShell | yes | 5.1 | orchestration | — |
| pg_dump / pg_restore / psql | yes | 18.4 | DB export/restore design | not connected in this gate |
| Get-FileHash / hashlib | yes | built-in | SHA-256 | — |
| certutil | yes | system | optional hash helper | — |
| supabase CLI | no | — | db dump alt | MANUAL |
| Docker | no | — | local supabase stack later | MANUAL |
| age | no | — | encryption (preferred) | **MANUAL_TOOL_INSTALLATION_REQUIRED** |
| gpg | no | — | encryption fallback | MANUAL |
| 7z | no | — | AES fallback | MANUAL |
| restic | no | — | backup+crypt alt | MANUAL |
| rclone | no | — | S3 transfer | **MANUAL_TOOL_INSTALLATION_REQUIRED** |
| AWS CLI | no | — | S3 transfer alt | MANUAL |
| openssl | no | — | misc crypto | MANUAL |

## 7. Selected Toolchain

| Role | Selection |
|---|---|
| Database | `pg_dump` / `pg_restore` (installed); scripts refuse live connections by default |
| Storage | Python stdlib stream exporter + allowlist (`Export-BoundLoreStorage.py`) |
| Encryption | **age** preferred; adapter fail-closed until installed |
| Checksums | SHA-256 via Python/`Get-FileHash` + `.sha256` sidecars |
| S3 transfer | **rclone** preferred later; this gate uses **filesystem mock only** |
| Restore | Local package copy + checksum verify (`Restore-BoundLoreBackupLocal.ps1`); no live DB restore |

## 8. Missing Tool Decisions

`MANUAL_TOOL_INSTALLATION_REQUIRED` for:

1. **age** (encryption)
2. **rclone** (Wasabi S3-compatible put/get)

Do not install via agent. Next decision gate: `P5-E.10B-W2-M1` if user wants install guidance; otherwise proceed to manual Wasabi bucket prep while tooling stays offline.

## 9. Backup Package Format

```
boundlore-backup-YYYYMMDDTHHMMSSZ/
  manifest.json
  manifest.json.sha256
  database/
  storage/{avatars,discovery-uploads,report-screenshots}/
  configuration/
  evidence/
```

Rules: durable store only after encryption; public manifest has no object paths / user ids / project secrets; outputs must be **outside** the Git repository.

## 10. Manifest Schema

Required keys enforced by `package_lib.validate_manifest`:

`format_version`, `backup_id`, `created_at_utc`, `source_type`, `database_components`, `storage_components`, `file_count`, `encrypted_size`, `checksum_algorithm` (=`sha256`), `encryption_method`, `tool_versions`, `release_gate_expected_locked`, `validation_status`.

## 11. Database Export Design

Planned live order (not executed): roles → pre-data/schema → data → post-data → extensions/policy inventories → release_gate state → checksums.

Guards: staging ref stop; production requires future `-AllowProductionRead` + network authorization (currently hard-blocked); output outside repo; DryRun/Synthetic defaults.

Note: a single default dump may omit some Supabase-managed pieces; inventories capture extensions/policies/SECURITY DEFINER expectations for later verification.

## 12. Storage Export Design

Allowlist-only buckets: `avatars`, `discovery-uploads`, `report-screenshots`. Unknown buckets stop. Synthetic mode writes harmless local files. Live mode blocked. Streaming copy + per-object SHA-256. No delete/upload APIs.

## 13. Encryption Design

`Protect-BoundLoreBackup.ps1` detects age/gpg/7z. Dry-run reports missing tools. Non-dry-run without tool → `STOP_ENCRYPTION_UNAVAILABLE`. No custom crypto. No silent unencrypted continue for upload paths.

Synthetic package test may create **opaque `.enc` placeholders** only to exercise mock transfer when age is absent (explicitly marked `synthetic-opaque-placeholder`, not a production encryption claim).

## 14. Credential Design

- No credentials in Git / docs / examples / logs / chat
- Wasabi backup principal later: put/list on one bucket/prefix; no billing/IAM/delete preferred
- Wasabi restore principal later: read-only, separate
- Supabase credentials only in future authorized runs via interactive/secure store; service role never committed
- Windows options later: process-scoped env, Credential Manager, DPAPI outside repo

## 15. Wasabi Transfer Design

`Send-BoundLoreBackup.ps1`: DryRun+NoNetwork defaults; `AllowExternalUpload` currently always stops with `STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED`. Capabilities disabled: bucket create, lifecycle, object lock, versioning, delete. Offline path: filesystem mock destination outside repo.

## 16. Production Guards

Stop codes in `_lib/stop_codes.py` and PowerShell wrappers include wrong project, staging target, repo output, missing credentials, encryption unavailable/failed, checksum/manifest failures, storage mismatch, upload not authorized, network forbidden, cleanup failed, unknown bucket.

## 17. Synthetic Dry-Run

`Test-BoundLoreBackupPackage.py` (temp dir outside repo):

- synthetic sources → package dirs → DB placeholders → manifest+sha256 → opaque enc placeholders (age missing) → mock upload/download → hash compare → secret scan → network-forbid probe → cleanup
- external/wasabi/supabase requests: **0**

## 18. Static QA

`qa/p5-backup-tooling-static-check.py` — PASS (safe defaults, capability denials, stop codes, no secret literals).

## 19. Runtime QA

`qa/p5-backup-tooling-runtime-check.py` — PASS (synthetic dry-run, live export blocked, repo output blocked, protect dry-run, upload blocked).

## 20. Local Restore Simulation

Package round-trip via filesystem mock + `Restore-BoundLoreBackupLocal.ps1` design (checksum sidecar verification). No `pg_restore` against any live database.

## 21. Manual Wasabi Preparation Checklist

Each step: **MANUAL_USER_ACTION_REQUIRED** (agent must not execute):

1. Secure Wasabi account with MFA.
2. Verify trial status and expiry date.
3. Confirm no automatic paid conversion is active.
4. Confirm Frankfurt / eu-central-2 intent (observe only).
5. Create one private BoundLore backup bucket.
6. Ensure no public read.
7. Leave Versioning off for first integration.
8. Leave Object Lock off for first integration.
9. No Lifecycle rule for first integration.
10. Create restricted backup IAM user.
11. Scope policy to bucket/prefix.
12. No billing/IAM/account rights on that user.
13. Prefer no DeleteObject on first backup principal.
14. Create separate read-only restore principal later.
15. Capture access key once into a secure local store (not chat/Git).
16. Never paste secrets into Cursor/docs/repo.
17. Record endpoint/region/bucket/prefix redacted offline.
18. Calendar trial end.
19. Before trial end: manually continue paid **or** download needed artefacts and wind down.

## 22. Trial Expiration Safety Plan

Trial is integration-only, not durable S-07 closure. No agent renewal/purchase. Before expiry, user decides paid continuation or controlled local retention + Wasabi cleanup. Agent must not touch billing.

## 23. Complete Changed-File Manifest

See §30. Application/runtime/SQL/Cloudflare untouched.

## 24. Architecture Preservation

No application HTML/JS/CSS changes; no Supabase/Cloudflare/runtime-ref changes; no dependency installs; no Production data access.

## 25. Known Limitations

- age/rclone not installed → live encryption/Wasabi transfer blocked
- Synthetic `.enc` placeholders are not real encryption
- Live DB/storage exporters intentionally non-functional without future authorization
- Free Supabase plan backup limitations from P5-E.10A unchanged
- Storage binaries still require separate real export later

## 26. Next Controlled Integration Test

After user manual Wasabi bucket/IAM prep (**P5-E.10B-W3**) and optional tool install (**W2-M1**): still no Production dump until a separately authorized gate; first network test should use synthetic ciphertext only if possible.

## 27. Rollback

Delete authoring branch / revert authoring commit. No remote effects.

## 28. Final Decision

**`CONDITIONALLY_READY_MANUAL_TOOL_INSTALLATION_REQUIRED`**

## 29. Commands Executed

- Git preflight + `git switch -c review/p5-e10b-w2-wasabi-backup-tooling`
- Local `--version` / `Get-Command` inventur (no installs)
- `py -3 tools/backup/Test-BoundLoreBackupPackage.py`
- `py -3 qa/p5-backup-tooling-static-check.py`
- `py -3 qa/p5-backup-tooling-runtime-check.py`

## 30. Files Changed

- `tools/backup/**` (tooling)
- `qa/p5-backup-tooling-static-check.py`
- `qa/p5-backup-tooling-runtime-check.py`
- `docs/architecture/p5-wasabi-trial-backup-tooling-authoring.md`
- `.gitignore` (`__pycache__` entries)

## 31. No-Wasabi / No-Supabase / No-Production / No-Push Attestation

- Wasabi requests: **0**
- Supabase SQL/storage/auth reads for backup: **0**
- Production dump/upload/restore: **NONE**
- Installs: **NONE**
- Push: **NONE**
- Product Activation: **FAIL**
- Public Launch: **NO-GO**
