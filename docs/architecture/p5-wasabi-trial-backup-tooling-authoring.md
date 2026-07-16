# P5-E.10B-W2 — Wasabi Trial Backup Tooling Authoring

## 1. Executive Result

**Verdict (W2 authoring):** `CONDITIONALLY_READY_MANUAL_TOOL_INSTALLATION_REQUIRED`
**Verdict (W2-M1 verification):** `PASS_REAL_OFFLINE_BACKUP_TOOLCHAIN_VERIFIED`

Local BoundLore backup tooling is authored with **fail-closed safe defaults** (DryRun / Synthetic / NoNetwork). W2-M1 verified manually installed **age v1.3.1** / **age-keygen v1.3.1** / **rclone v1.74.4** with a fully synthetic offline package: real age encrypt/decrypt, wrong-key rejection, local rclone copyto (no remotes), byte-identical hashes, ephemeral key cleanup. No Wasabi/Supabase/Production/network actions were performed.

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
| age | yes (user-installed) | v1.3.1 | encryption (preferred) | path redacted; outside repo |
| age-keygen | yes (user-installed) | v1.3.1 | ephemeral recipient generation | path redacted; outside repo |
| gpg | no | — | encryption fallback | MANUAL |
| 7z | no | — | AES fallback | MANUAL |
| restic | no | — | backup+crypt alt | MANUAL |
| rclone | yes (user-installed) | v1.74.4 | local transfer verified; S3 later | path redacted; no remote used in M1 |
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

W2-M1 closed age/rclone installation verification (user-installed; agent did not install). Remaining optional CLIs (`gpg`, `7z`, AWS CLI, supabase CLI, Docker) stay MANUAL if needed later. Next gate: **P5-E.10B-W3** (manual Wasabi bucket / restricted credentials — user only).

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

`Protect-BoundLoreBackup.ps1` detects age/gpg/7z. Dry-run reports tool status. Live local encryption requires `-PerformLocalEncryption -NoDryRun` plus an age recipient public key; private keys must not be passed as recipients. age is invoked as an external process. Fail-closed on missing tool / encryption failure. Uploads remain unauthorized. No custom crypto. No silent unencrypted continue for upload paths.

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

## 17. Synthetic Dry-Run / Real Offline Round-Trip

`Test-BoundLoreBackupPackage.py` (temp dir outside repo):

- synthetic sources → package dirs → DB placeholders → manifest+sha256
- ephemeral age keypair (temp only; never logged; wiped on exit)
- real age encryption via Protect → wrong-key decrypt FAIL → correct decrypt byte match
- local `rclone copyto` (filesystem→filesystem only; no remote names) → hash match → decrypt transferred copy
- secret scan → network-forbid probe → cleanup
- validation_status: `PASS_REAL_OFFLINE_AGE_RCLONE`
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

- Real Wasabi upload/download still unauthorized (Send remains fail-closed)
- Live DB/storage exporters intentionally non-functional without future authorization
- Free Supabase plan backup limitations from P5-E.10A unchanged
- Storage binaries still require separate real export later
- Existing rclone user config (if any) is **not inspected**; M1 used no remotes

## 26. Next Controlled Integration Test

**P5-E.10B-W3 — Manual Wasabi Bucket and Restricted Credential Preparation** (user-only). Still no Production dump, no agent Wasabi API, no push/deploy until separately authorized.

## 27. Rollback

Delete authoring branch / revert authoring commit. No remote effects.

## 28. Final Decision

W2 authoring: **`CONDITIONALLY_READY_MANUAL_TOOL_INSTALLATION_REQUIRED`**
W2-M1 verification: **`PASS_REAL_OFFLINE_BACKUP_TOOLCHAIN_VERIFIED`**

## 29. Commands Executed (W2 + W2-M1)

- Git preflight (`status` / `branch` / `rev-parse` / `log` / `remote`)
- `where.exe` / `Get-Command` / `--version` for age, age-keygen, rclone (no PATH changes, no installs)
- `py tools/backup/Test-BoundLoreBackupPackage.py`
- `py qa/p5-backup-tooling-static-check.py`
- `py qa/p5-backup-tooling-runtime-check.py`
- Diff/secret control + local commit only

## 30. Files Changed

- `tools/backup/Protect-BoundLoreBackup.ps1`
- `tools/backup/Test-BoundLoreBackupPackage.py`
- `qa/p5-backup-tooling-static-check.py`
- `qa/p5-backup-tooling-runtime-check.py`
- `docs/architecture/p5-wasabi-trial-backup-tooling-authoring.md`

## 31. No-Wasabi / No-Supabase / No-Production / No-Push Attestation

- Wasabi requests: **0**
- Supabase SQL/storage/auth reads for backup: **0**
- Production dump/upload/restore: **NONE**
- Agent installs/downloads: **NONE**
- Push: **NONE**
- Product Activation: **FAIL**
- Public Launch: **NO-GO**

---

# P5-E.10B-W2-M1 — Manual Installation Verification Addendum

## M1-1. Manual Installation Verification

User-installed tools verified locally only. Agent performed no install, download, winget/choco/scoop, or PATH mutation.

## M1-2. age Version

`v1.3.1` (age and age-keygen)

## M1-3. rclone Version

`v1.74.4`

## M1-4. Tool Paths Redacted

Resolved as Application executables under a non-repository tools directory. Absolute user paths intentionally omitted from evidence. No aliases/wrappers; unambiguous PATH resolution; not under temp download folders.

## M1-5. Real Synthetic age Encryption

`Protect-BoundLoreBackup.ps1 -PerformLocalEncryption -NoDryRun` encrypted synthetic `database/*` and `configuration/*.json` to `.age` + `.sha256` via external `age -r <public>`.

## M1-6. Real Synthetic age Decryption

`age -d -i <identity-file>` restored plaintext; SHA-256 and byte comparison matched originals.

## M1-7. Wrong-Key Negative Test

Second ephemeral identity failed to decrypt (non-zero exit); expected FAIL confirmed.

## M1-8. Local rclone Transfer

`rclone copyto` between two local filesystem paths only. Source retained. Destination hash matched. No remote name with colon backend, no S3/Wasabi/HTTP.

## M1-9. No-Network Evidence

`external_requests` / `wasabi_requests` / `supabase_requests` = 0. Protect remains NoNetwork. Send still blocks `AllowExternalUpload`.

## M1-10. Temporary-Key Cleanup

Ephemeral identity files overwritten then deleted; temp tree removed. No private key material in repository or printed summary JSON.

## M1-11. Updated Toolchain Verdict

`PASS_REAL_OFFLINE_BACKUP_TOOLCHAIN_VERIFIED`

## M1-12. Remaining Manual Wasabi Setup

Bucket, IAM principals, and restricted credentials remain **user-only** (checklist §21). Agent must not create buckets, keys, or remotes.

## M1-13. Next Gate

**P5-E.10B-W3 — Manual Wasabi Bucket and Restricted Credential Preparation**

## M1-14. Commands Executed

See §29.

## M1-15. Files Changed

See §30.

## M1-16. Safety Attestation

DryRun / Synthetic / NoNetwork defaults retained. External upload default blocked. No Wasabi remote default. No Production project default. No delete/bucket-create/lifecycle/versioning/object-lock capabilities enabled. No credentials or keys in configs. rclone configuration (if present on the machine) was **not inspected** (`EXISTING_RCLONE_CONFIGURATION_NOT_INSPECTED` / `NO_RCLONE_CONF_DETECTED` as applicable).
