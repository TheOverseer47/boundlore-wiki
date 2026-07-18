# P5-E.10B-W5-A7 / A8-R1 — Manual Wasabi Upload Backup Launcher

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

## 2b. A8-R1 — first BAT stop (repository root)

The first controlled BAT launch stopped immediately with:

`STOP_LAUNCHER_BASELINE_MISMATCH: cannot locate repository root; set BOUNDLORE_REPO_ROOT`

That stop occurred **before** production identity, SessionPooler, DB/storage export, snapshot, age, or Wasabi handoff. No production run started.

The one-time A8 live authorization was nonetheless **consumed** by that BAT start. A new real BAT/production run requires a **fresh explicit authorization**.

**Root cause:** the installed orchestrator under `D:\BoundLoreBackups\Launcher\` tried to find the repo by walking `..\..\..` from `tools/backup/launcher` layout. That relative layout does not exist at the install path, so it required `BOUNDLORE_REPO_ROOT`. The installer never wrote a local repo-root config.

**Repair:** installer writes `repo-root.txt` at install time; orchestrator resolves fail-closed without requiring a manual env var for normal operation.

## 3. BAT launcher

Source: `tools/backup/launcher/BoundLore-Create-Encrypted-Backup.bat`
Install: `D:\BoundLoreBackups\Launcher\BoundLore-Create-Encrypted-Backup.bat`

Thin wrapper only:

- Prints `BOUNDLORE_MANUAL_UPLOAD_BACKUP_LAUNCHER`
- Starts sibling `Invoke-BoundLoreManualUploadBackup.ps1` with `-NoProfile`
- Propagates exit code
- Holds the window with `pause`
- No credentials, no network, no backup logic, no repository search

## 4. PowerShell orchestrator

Source: `tools/backup/launcher/Invoke-BoundLoreManualUploadBackup.ps1`

Checks (live path):

1. Resolve and validate repository root (see §4b) — before any further phases
2. `V:` mounted; workspace identity under `V:\BoundLoreProductionSnapshot` (same VeraCrypt rule as runner)
3. Free space on `V:` / `D:`
4. Toolchain: `age`, `psql`, `pg_dump`, `pg_dumpall`, `pg_restore`, `tar` (**not** rclone)
5. Git branch + pinned HEAD from `expected-git-baseline.txt` (pinned commit **or descendant** on the review branch)
6. Worktree allowlist for known protected untracked artefacts
7. Exclusive lock `boundlore-backup.lock`
8. Confirmation gesture `CREATE_LOCAL_ENCRYPTED_BACKUP_ONLY`
9. Starts runner with `-ManualWasabiUpload` (never `-AllowExternalWasabiUpload`)

VeraCrypt mount/dismount remains **manual**.

### 4b. Repository root resolution

Installed config: `D:\BoundLoreBackups\Launcher\repo-root.txt`

Format: exactly one line, absolute local Windows path, UTF-8 no BOM, no quotes, no env expansion, no UNC/relative/wildcards.

Priority:

1. `-RepoRoot` (tests / controlled calls only) → `REPO_ROOT_SOURCE=PARAMETER`
2. Local `repo-root.txt` beside the orchestrator → `REPO_ROOT_SOURCE=LOCAL_CONFIG`
3. Optional process env `BOUNDLORE_REPO_ROOT` → `REPO_ROOT_SOURCE=PROCESS_ENV`

Normal operation uses the local config. Operators do **not** set `BOUNDLORE_REPO_ROOT` for routine runs. The process env is an optional fallback only; the launcher never writes User/Machine environment variables.

Validation before later phases: path exists as a local directory, not a reparse point, `.git` present, required runner/launcher sources present, `git rev-parse --show-toplevel` matches exactly, then branch/HEAD/worktree checks. Failures use `STOP_LAUNCHER_BASELINE_MISMATCH` with non-sensitive `reason=` subclasses (`repo-config-missing`, `repo-path-invalid`, `git-root-mismatch`, `branch-mismatch`, `head-not-allowed`, `worktree-unexpected`). Full user paths are not written into stop codes.

No parent-directory or drive-wide search.

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

`D:\BoundLoreBackups\Logs\manual-backup-<timestamp>.log` — UTC phase/PASS/FAIL/stop/exit/branch/commit and `REPO_ROOT_SOURCE=*` only. No secrets, no full repo path dump, no raw stderr dumps.

## 9. Secret protection

No secrets in BAT, orchestrator, installer, baseline, `repo-root.txt`, or handoff. Runner still uses interactive SecureString for DB + storage only in manual mode (no Wasabi keys).

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

`tools/backup/Install-BoundLoreManualUploadLauncher.ps1`:

- Validates installer git toplevel
- Copies BAT, orchestrator, baseline, and `LauncherRepoRoot.ps1` to `D:\BoundLoreBackups\Launcher\`
- Writes `repo-root.txt` with that validated absolute repo path
- Hash-verifies copies
- Never runs the BAT, never needs `V:`, never touches Production handoffs/archives or Logs content

Existing files require `-ConfirmInstallAck REPLACE_LAUNCHER_FILES`.

## 16. Cleanup

Same VeraCrypt plaintext wipe after local hash-confirmed copy as the automatic path. D: `.age` retained. Manual dismount still required.

## 17. Offline test matrix

Covered by `Test-BoundLoreManualUploadBackup.ps1`, orchestrator `-OfflineSelfTest` / `-RepoRootResolutionSelfTest`, installer `-OfflineTempInstallTest`, and `qa/p5-manual-wasabi-upload-backup-launcher-check.py`, plus existing runner/upload/storage offline suites.

Repo-root markers: `LAUNCHER_REPO_ROOT_RESOLUTION_OFFLINE_PASS`, `NO_REAL_NETWORK_INVOKED_PASS`, `NO_PRODUCTION_RUN_INVOKED_PASS`.

## 18. Status lines

```
CHECKABLE_SCOPE=LOCAL_BACKUP_AUTOMATION_AND_MANUAL_WASABI_HANDOFF_IMPLEMENTED
AUTOMATIC_WASABI_UPLOAD=DEFERRED
READBACK_RESTORE_VALIDATION=OPEN
S-07=OPEN
```

## 19. Next operational step

Requires a **new explicit live authorization** (A8 live auth already consumed):

1. Mount `V:`
2. Run installed BAT (repo-root.txt present; no manual `BOUNDLORE_REPO_ROOT` needed)
3. Complete SecureString prompts for DB + storage only
4. Upload the new `.age` manually using the handoff relative path
5. Compare filename + bytes in the dashboard
6. Plan a separate read-back / restore gate later
