# BoundLore Backup Tooling (local / offline-first)

Safe-by-default helpers for a future Wasabi-backed offline backup workflow.

## Defaults (mandatory)

| Flag | Default | Meaning |
|---|---|---|
| DryRun | **on** | Plan only unless explicitly overridden |
| Synthetic | **on** for packaged tests | Fake data only |
| NoNetwork | **on** | Any external call must fail |
| Upload | **off** | Requires later explicit authorization |
| Delete | **never** | Not implemented |

Production / Wasabi / Supabase live actions are **not authorized** in this phase.

## Layout

```
tools/backup/
  README.md
  config.example.json
  _lib/                  shared Python helpers
  Invoke-BoundLoreBackup.ps1
  Export-BoundLoreDatabase.ps1
  Export-BoundLoreStorage.py
  New-BoundLoreBackupManifest.py
  Protect-BoundLoreBackup.ps1
  Send-BoundLoreBackup.ps1
  Restore-BoundLoreBackupLocal.ps1
  Test-BoundLoreBackupPackage.py
```

## Selected toolchain (this workstation inventory)

| Role | Tool | Status |
|---|---|---|
| DB dump/restore | `pg_dump` / `pg_restore` / `psql` 18.x | installed |
| Storage export | Python stdlib stream + SHA-256 | authored (synthetic) |
| Checksums | Python `hashlib` / `Get-FileHash` | installed |
| Encryption | `age` (preferred) | **not installed** — MANUAL |
| S3 transfer | `rclone` / AWS CLI | **not installed** — mock FS only |
| Orchestration | PowerShell 5.1 | installed |

## Synthetic dry-run

```powershell
py -3 tools/backup/Test-BoundLoreBackupPackage.py
py -3 qa/p5-backup-tooling-static-check.py
py -3 qa/p5-backup-tooling-runtime-check.py
```

All of the above must keep network isolated.

## Manual tool installs (user only)

Do **not** let the agent install these. Candidate installs for a later decision gate:

- `age` (encryption)
- `rclone` (Wasabi S3-compatible transfer)

## Credential rules

- Never store Wasabi or Supabase secrets in this repository
- Never put credentials in `config.example.json`
- Never pass secrets on the command line when avoidable
- Private decryption keys never upload to object storage
