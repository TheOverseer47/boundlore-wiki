# P5-E.10B-W5-A7 — Manual Wasabi Upload Backup Launcher

## 1. Project decision

Automatic Wasabi upload remains **DEFERRED** after the PutObject-403 / request-shape investigation. BoundLore continues with:

1. Local encrypted production snapshot automation
2. Redacted manual-upload handoff
3. Operator uploads the `.age` file in the Wasabi dashboard
4. Read-back / restore / S-07 remain separate later gates

## 2. Operating model boundaries

| Capability | Status |
|---|---|
| Local DB + storage export + age + D: `.age` copy | Implemented (manual mode) |
| Manual Wasabi browser upload | Per run, by operator |
| Automatic Wasabi / rclone upload | **DEFERRED** |
| Read-back / restore | **OPEN** |
| S-07 | **OPEN** |
| Product activation | Not granted by this gate alone |

## 3. BAT launcher

Source: `tools/backup/launcher/BoundLore-Create-Encrypted-Backup.bat`
Install: `D:\BoundLoreBackups\Launcher\BoundLore-Create-Encrypted-Backup.bat`

Thin wrapper only:

- Prints `BOUNDLORE_MANUAL_UPLOAD_BACKUP_LAUNCHER`
- Starts sibling `Invoke-BoundLoreManualUploadBackup.ps1` with `-NoProfile`
- Propagates exit code
- Holds the window with `pause`
- No secrets, no network, no backup logic

## 4. PowerShell orchestrator

Source: `tools/backup/launcher/Invoke-BoundLoreManualUploadBackup.ps1`

Checks (live path):

1. `V:` mounted; workspace identity under `V:\BoundLoreProductionSnapshot` (same VeraCrypt rule as runner)
2. Free space on `V:` / `D:`
3. Toolchain: `age`, `psql`, `pg_dump`, `pg_dumpall`, `pg_restore`, `tar` (**not** rclone)
4. Git branch + pinned HEAD from `expected-git-baseline.txt`
5. Worktree allowlist for known protected untracked artefacts
6. Exclusive lock `boundlore-backup.lock`
7. Confirmation gesture `CREATE_LOCAL_ENCRYPTED_BACKUP_ONLY`
8. Starts runner with `-ManualWasabiUpload` (never `-AllowExternalWasabiUpload`)

VeraCrypt mount/dismount remains **manual**.

## 5. Manual Wasabi upload switch

Runner: `-ManualWasabiUpload` on `Invoke-BoundLoreProductionSnapshot.ps1`, forwarded to `Invoke-LiveProductionSnapshotSequence`.

Conflicts with `-AllowExternalWasabiUpload` (fail-closed).

## 6. Markers (manual success)

After local encrypted copy:

- `REMOTE_UPLOAD_MODE=MANUAL`
- `MANUAL_WASABI_UPLOAD_REQUIRED`
- `MANUAL_UPLOAD_HANDOFF_CREATED_PASS`
- `LOCAL_BACKUP_READY_FOR_MANUAL_UPLOAD`
- `AUTOMATIC_WASABI_UPLOAD=DEFERRED`
- `READBACK_RESTORE_VALIDATION=OPEN`
- `S-07=OPEN`

Never emitted in manual mode:

- `WASABI_PRODUCTION_UPLOAD_PASS`
- `REMOTE_SIZE_VERIFICATION_PASS`
- `PRODUCTION_BACKUP_FULLY_COMPLETE`
- `S-07=CLOSED`

Exit code **0** means the **local** authorized job completed; remote upload remains operator work.

## 7. Handoff file

Path: `D:\BoundLoreBackups\ManualUploadHandoffs\<backup-id>.txt`
Atomic create (`CreateNew`); existing file → `STOP_MANUAL_UPLOAD_HANDOFF_ALREADY_EXISTS`.

Fields: `BACKUP_ID`, `ARCHIVE_FILE`, `ARCHIVE_BYTES`, `ARCHIVE_SHA256`, `LOCAL_ARCHIVE_PATH`, `REMOTE_RELATIVE_PATH`, `UPLOAD_MODE=MANUAL_BROWSER`, `UPLOAD_STATUS=AWAITING_MANUAL_WASABI_UPLOAD`, `CREATED_UTC`, plus short manual instructions.

No bucket name, keys, ARNs, connection strings, or plaintext.

## 8. Log model

`D:\BoundLoreBackups\Logs\manual-backup-<timestamp>.log` — UTC phase/PASS/FAIL/stop/exit/branch/commit only. No secrets or raw stderr dumps.

## 9. Secret protection

No secrets in BAT, orchestrator, installer, baseline, or handoff. Runner still uses interactive SecureString for DB + storage only in manual mode (no Wasabi keys).

## 10. Lock model

`D:\BoundLoreBackups\Launcher\boundlore-backup.lock` via `FileMode.CreateNew`. Second process → `STOP_BACKUP_ALREADY_RUNNING_OR_UNACKNOWLEDGED`. Success and documented failure paths remove the lock. No auto-retry.

## 11. V: mount

Operator mounts VeraCrypt as `V:` before launch and dismounts after. Launcher never mounts/dismounts.

## 12. No scheduler / autostart / watcher / auto-retry

Not implemented and not authorized.

## 13. No rclone in manual mode

Manual branch never builds Wasabi endpoints, never sets `RCLONE_CONFIG_BOUNDLOREPROD_*`, never starts `copyto` / `lsl`.

## 14. No bucket / Wasabi credential prompts

Gated behind `if (-not $ManualWasabiUpload)`.

## 15. Install paths

`tools/backup/Install-BoundLoreManualUploadLauncher.ps1` copies BAT, orchestrator, and `expected-git-baseline.txt` to `D:\BoundLoreBackups\Launcher\` after hash verify. Existing files require `-ConfirmInstallAck REPLACE_LAUNCHER_FILES`. Installer never runs the BAT.

Set `BOUNDLORE_REPO_ROOT` when launching from the installed copy so the orchestrator can find the repository.

## 16. Cleanup

Same VeraCrypt plaintext wipe after local hash-confirmed copy as the automatic path. D: `.age` retained. Manual dismount still required.

## 17. Offline test matrix

Covered by `Test-BoundLoreManualUploadBackup.ps1`, orchestrator `-OfflineSelfTest`, installer `-OfflineTempInstallTest`, and `qa/p5-manual-wasabi-upload-backup-launcher-check.py`, plus existing runner/upload/storage offline suites.

## 18. Status lines

```
CHECKABLE_SCOPE=LOCAL_BACKUP_AUTOMATION_AND_MANUAL_WASABI_HANDOFF_IMPLEMENTED
AUTOMATIC_WASABI_UPLOAD=DEFERRED
READBACK_RESTORE_VALIDATION=OPEN
S-07=OPEN
```

## 19. Next operational step

1. Mount `V:`
2. Run installed BAT (after baseline HEAD pin matches repo)
3. Complete SecureString prompts for DB + storage only
4. Upload the new `.age` manually using the handoff relative path
5. Compare filename + bytes in the dashboard
6. Plan a separate read-back / restore gate later
