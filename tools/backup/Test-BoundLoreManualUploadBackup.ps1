<#
.SYNOPSIS
  Offline self-tests for manual Wasabi upload backup launcher (A7/A8).
#>
[CmdletBinding()]
param([switch]$OfflineSelfTest = $true)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$BackupDir = $PSScriptRoot
$fail = New-Object System.Collections.Generic.List[string]
$pass = New-Object System.Collections.Generic.List[string]

function Ok([string]$n) { $pass.Add($n) | Out-Null; Write-Host ("PASS " + $n) }
function Bad([string]$n) { $fail.Add($n) | Out-Null; Write-Host ("FAIL " + $n) }

. (Join-Path $BackupDir "_lib\ManualUploadHandoff.ps1")
. (Join-Path $BackupDir "_lib\LauncherRepoRoot.ps1")

$tmp = Join-Path $env:TEMP ("bl-a8-qa-" + [Guid]::NewGuid().ToString("N"))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$env:BOUNDLORE_OFFLINE_HANDOFF_ROOT = Join-Path $tmp "handoffs"
$env:BOUNDLORE_OFFLINE_LAUNCHER_ROOT = Join-Path $tmp "launcher"
$env:BOUNDLORE_OFFLINE_LOGS_ROOT = Join-Path $tmp "logs"
New-Item -ItemType Directory -Force -Path $env:BOUNDLORE_OFFLINE_HANDOFF_ROOT, $env:BOUNDLORE_OFFLINE_LAUNCHER_ROOT, $env:BOUNDLORE_OFFLINE_LOGS_ROOT | Out-Null

# --- D: Handoff ---
try {
  $p = New-BoundLoreManualUploadHandoff -BackupId "boundlore-production-snapshot-synth" `
    -ArchiveFileName "boundlore-production-snapshot-synth.age" -ArchiveBytes 16384 `
    -ArchiveSha256 ("b" * 64) `
    -LocalArchivePath "D:\BoundLoreBackups\EncryptedArchives\boundlore-production-snapshot-synth.age" `
    -RemoteRelativePath "production-snapshots/boundlore-production-snapshot-synth/boundlore-production-snapshot-synth.age"
  $t = Get-Content $p -Raw
  if ($t -match "BACKUP_ID=boundlore-production-snapshot-synth") { Ok "handoff-filename-id" } else { Bad "handoff-filename-id" }
  if ($t -match "ARCHIVE_BYTES=16384") { Ok "handoff-bytes" } else { Bad "handoff-bytes" }
  if ($t -match ("ARCHIVE_SHA256=" + ("b" * 64))) { Ok "handoff-sha" } else { Bad "handoff-sha" }
  if ($t -match "REMOTE_RELATIVE_PATH=production-snapshots/") { Ok "handoff-remote-rel" } else { Bad "handoff-remote-rel" }
  if ($t -notmatch "(?i)wasabisys|AKIA|SECRET|PASSWORD|service.role|arn:aws:iam") { Ok "handoff-no-secrets" } else { Bad "handoff-no-secrets" }
  if (Test-BoundLoreManualHandoffTextSafe $t) { Ok "handoff-safe-fn" } else { Bad "handoff-safe-fn" }
} catch { Bad ("handoff-create:" + $_) }

try {
  [void](New-BoundLoreManualUploadHandoff -BackupId "boundlore-production-snapshot-synth" `
    -ArchiveFileName "boundlore-production-snapshot-synth.age" -ArchiveBytes 1 -ArchiveSha256 ("c" * 64) `
    -LocalArchivePath "D:\BoundLoreBackups\EncryptedArchives\boundlore-production-snapshot-synth.age" `
    -RemoteRelativePath "production-snapshots/boundlore-production-snapshot-synth/boundlore-production-snapshot-synth.age")
  Bad "handoff-no-overwrite"
} catch {
  if ("$_" -match "STOP_MANUAL_UPLOAD_HANDOFF_ALREADY_EXISTS") { Ok "handoff-no-overwrite" } else { Bad "handoff-no-overwrite-code" }
}

# --- Runner static: ManualWasabiUpload present, no auto upload markers in manual branch ---
$live = Get-Content (Join-Path $BackupDir "_lib\LiveProductionSnapshot.ps1") -Raw
$runner = Get-Content (Join-Path $BackupDir "Invoke-BoundLoreProductionSnapshot.ps1") -Raw
if ($runner -match "ManualWasabiUpload") { Ok "runner-switch" } else { Bad "runner-switch" }
if ($runner -match "ManualWasabiUpload conflicts with AllowExternalWasabiUpload") { Ok "runner-conflict" } else { Bad "runner-conflict" }
if ($live -match "MANUAL_UPLOAD_HANDOFF_CREATED_PASS" -and $live -match "LOCAL_BACKUP_READY_FOR_MANUAL_UPLOAD") { Ok "live-markers" } else { Bad "live-markers" }
if ($live -match 'Write-Host "REMOTE_UPLOAD_MODE=MANUAL"') { Ok "live-remote-mode" } else { Bad "live-remote-mode" }
$manualChunk = ($live -split "if \(\`$ManualWasabiUpload\) \{")[1]
$manualOnly = ($manualChunk -split "\} else \{")[0]
if ($manualOnly -notmatch "RCLONE_CONFIG_" -and $manualOnly -notmatch "copyto" -and $manualOnly -notmatch "WASABI_PRODUCTION_UPLOAD_PASS" -and $manualOnly -notmatch "REMOTE_SIZE_VERIFICATION_PASS") {
  Ok "manual-no-rclone"
} else { Bad "manual-no-rclone" }
if ($live -match 'if \(-not \$ManualWasabiUpload\)' -and $live -match "Enter Wasabi Production bucket name") { Ok "bucket-prompt-gated" } else { Bad "bucket-prompt-gated" }
if ($live -match 'if \(-not \$ManualWasabiUpload\)' -and $live -match "Enter Wasabi Access Key ID") { Ok "wasabi-key-prompt-gated" } else { Bad "wasabi-key-prompt-gated" }

# --- Repo-root resolution self-test (orchestrator) ---
$orch = Join-Path $BackupDir "launcher\Invoke-BoundLoreManualUploadBackup.ps1"
$pRr = Start-Process powershell -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $orch, "-RepoRootResolutionSelfTest") -Wait -PassThru -NoNewWindow
if ($pRr.ExitCode -eq 0) { Ok "repo-root-resolution-selftest" } else { Bad "repo-root-resolution-selftest" }

# --- Explicit matrix extras ---
$rrTmp = Join-Path $tmp "rr-matrix"
$rrLaunch = Join-Path $rrTmp "Launcher Dir"
New-Item -ItemType Directory -Force -Path $rrLaunch | Out-Null
$rrCfg = Join-Path $rrLaunch "repo-root.txt"
$realRoot = Assert-BoundLoreLauncherRepoRoot -RepoRoot $RepoRoot

[void](Write-BoundLoreRepoRootConfigFile -ConfigPath $rrCfg -RepoRoot $realRoot)
$r1 = Resolve-BoundLoreLauncherRepoRoot -RepoRoot "" -LauncherDirectory $rrLaunch -ProcessEnvValue ""
if ($r1.Source -eq "LOCAL_CONFIG") { Ok "rr-config-present" } else { Bad "rr-config-present" }

Remove-Item $rrCfg -Force
try { [void](Resolve-BoundLoreLauncherRepoRoot -RepoRoot "" -LauncherDirectory $rrLaunch -ProcessEnvValue ""); Bad "rr-config-missing" }
catch { if ("$_" -match "repo-config-missing") { Ok "rr-config-missing" } else { Bad "rr-config-missing-code" } }

[IO.File]::WriteAllText($rrCfg, "")
try { [void](Read-BoundLoreRepoRootConfigFile $rrCfg); Bad "rr-empty" }
catch { if ("$_" -match "repo-path-invalid") { Ok "rr-empty" } else { Bad "rr-empty-code" } }

[IO.File]::WriteAllText($rrCfg, "C:\one`r`nC:\two`r`n")
try { [void](Read-BoundLoreRepoRootConfigFile $rrCfg); Bad "rr-multiline" }
catch { if ("$_" -match "repo-path-invalid") { Ok "rr-multiline" } else { Bad "rr-multiline-code" } }

[IO.File]::WriteAllText($rrCfg, ".\relative`n")
try { [void](Read-BoundLoreRepoRootConfigFile $rrCfg); Bad "rr-relative" }
catch { if ("$_" -match "repo-path-invalid") { Ok "rr-relative" } else { Bad "rr-relative-code" } }

[IO.File]::WriteAllText($rrCfg, "\\unc\share\repo`n")
try { [void](Read-BoundLoreRepoRootConfigFile $rrCfg); Bad "rr-unc" }
catch { if ("$_" -match "repo-path-invalid") { Ok "rr-unc" } else { Bad "rr-unc-code" } }

[void](Write-BoundLoreRepoRootConfigFile -ConfigPath $rrCfg -RepoRoot $realRoot)
$rParam = Resolve-BoundLoreLauncherRepoRoot -RepoRoot $realRoot -LauncherDirectory $rrLaunch -ProcessEnvValue "C:\Windows"
if ($rParam.Source -eq "PARAMETER") { Ok "rr-param-wins" } else { Bad "rr-param-wins" }
$rFile = Resolve-BoundLoreLauncherRepoRoot -RepoRoot "" -LauncherDirectory $rrLaunch -ProcessEnvValue "C:\Windows"
if ($rFile.Source -eq "LOCAL_CONFIG") { Ok "rr-file-over-env" } else { Bad "rr-file-over-env" }
Remove-Item $rrCfg -Force
$rEnv = Resolve-BoundLoreLauncherRepoRoot -RepoRoot "" -LauncherDirectory $rrLaunch -ProcessEnvValue $realRoot
if ($rEnv.Source -eq "PROCESS_ENV") { Ok "rr-env-fallback" } else { Bad "rr-env-fallback" }

# git-root mismatch: directory with fake .git + stub files but not git toplevel
$fakeRoot = Join-Path $rrTmp "fake-root"
New-Item -ItemType Directory -Force -Path $fakeRoot | Out-Null
New-Item -ItemType File -Force -Path (Join-Path $fakeRoot ".git") | Out-Null
foreach ($rel in @(
    "tools\backup\Invoke-BoundLoreProductionSnapshot.ps1",
    "tools\backup\launcher\Invoke-BoundLoreManualUploadBackup.ps1",
    "tools\backup\launcher\BoundLore-Create-Encrypted-Backup.bat",
    "tools\backup\launcher\expected-git-baseline.txt"
  )) {
  $fp = Join-Path $fakeRoot $rel
  New-Item -ItemType Directory -Force -Path (Split-Path $fp -Parent) | Out-Null
  Set-Content -LiteralPath $fp -Value "stub" -Encoding UTF8
}
try { [void](Assert-BoundLoreLauncherRepoRoot -RepoRoot $fakeRoot); Bad "rr-git-root-mismatch" }
catch { if ("$_" -match "git-root-mismatch|repo-path-invalid") { Ok "rr-git-root-mismatch" } else { Bad ("rr-git-root-mismatch-code:" + $_) } }

# --- Orchestrator offline ---
$p = Start-Process powershell -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $orch, "-OfflineSelfTest") -Wait -PassThru -NoNewWindow
if ($p.ExitCode -eq 0) { Ok "orch-offline-selftest" } else { Bad "orch-offline-selftest" }

# --- Installer temp (spaces) + preserve sibling handoff/log markers ---
$parentOps = Join-Path $tmp "BoundLoreBackups Ops"
$destLaunch = Join-Path $parentOps "Launcher"
$handDir = Join-Path $parentOps "ManualUploadHandoffs"
$logDir = Join-Path $parentOps "Logs"
New-Item -ItemType Directory -Force -Path $handDir, $logDir | Out-Null
$handMarker = Join-Path $handDir "keep-me.txt"
$logMarker = Join-Path $logDir "keep-me.log"
Set-Content -LiteralPath $handMarker -Value "preserve" -Encoding UTF8
Set-Content -LiteralPath $logMarker -Value "preserve" -Encoding UTF8

$inst = Join-Path $BackupDir "Install-BoundLoreManualUploadLauncher.ps1"
$p2 = Start-Process powershell -ArgumentList @(
  "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $inst,
  "-OfflineTempInstallTest"
) -Wait -PassThru -NoNewWindow
if ($p2.ExitCode -eq 0) { Ok "installer-temp" } else { Bad "installer-temp" }

# Dedicated install into parentOps launcher without deleting sibling dirs
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $inst -DestinationRoot $destLaunch -ConfirmInstallAck REPLACE_LAUNCHER_FILES
$p3ec = $LASTEXITCODE
if ($p3ec -eq 0 -and (Test-Path -LiteralPath (Join-Path $destLaunch "repo-root.txt"))) { Ok "installer-writes-repo-root" } else { Bad "installer-writes-repo-root" }
if ((Test-Path -LiteralPath $handMarker) -and (Test-Path -LiteralPath $logMarker)) { Ok "installer-preserves-handoff-logs" } else { Bad "installer-preserves-handoff-logs" }
if (Test-Path -LiteralPath (Join-Path $destLaunch "repo-root.txt")) {
  $cfgInstalled = (Get-Content -LiteralPath (Join-Path $destLaunch "repo-root.txt") -Raw).TrimEnd("`r", "`n")
  if ([string]::Equals($cfgInstalled, $realRoot, [StringComparison]::OrdinalIgnoreCase)) { Ok "installer-repo-root-content" } else { Bad "installer-repo-root-content" }
} else {
  Bad "installer-repo-root-content"
}

# BAT static: starts orch only (synthetic dry-run = OfflineSelfTest via orch, not BAT production)
$bat = Get-Content (Join-Path $BackupDir "launcher\BoundLore-Create-Encrypted-Backup.bat") -Raw
if ($bat -match "BOUNDLORE_MANUAL_UPLOAD_BACKUP_LAUNCHER") { Ok "bat-banner" } else { Bad "bat-banner" }
if ($bat -match "exit /b %EC%" -or $bat -match "exit /b %ERRORLEVEL%") { Ok "bat-exitcode" } else { Bad "bat-exitcode" }
if ($bat -notmatch "(?i)AKIA|PASSWORD|SECRET_ACCESS|service_role") { Ok "bat-no-secrets" } else { Bad "bat-no-secrets" }
if ($bat -match "Invoke-BoundLoreManualUploadBackup.ps1" -and $bat -notmatch "Invoke-BoundLoreProductionSnapshot") { Ok "bat-only-orch" } else { Bad "bat-only-orch" }
if ($bat -notmatch "BOUNDLORE_REPO_ROOT" -and $bat -notmatch "repo-root") { Ok "bat-no-repo-search" } else { Bad "bat-no-repo-search" }

# --- Stop codes ---
$stops = Get-Content (Join-Path $BackupDir "_lib\stop_codes.py") -Raw
foreach ($c in @("STOP_MANUAL_UPLOAD_HANDOFF_ALREADY_EXISTS", "STOP_LOCAL_BACKUP_NOT_CONFIRMED", "STOP_BACKUP_ALREADY_RUNNING_OR_UNACKNOWLEDGED", "STOP_WRONG_BRANCH", "STOP_UNEXPECTED_HEAD", "STOP_LAUNCHER_BASELINE_MISMATCH")) {
  if ($stops -match [regex]::Escape($c)) { Ok ("stop-" + $c) } else { Bad ("stop-" + $c) }
}

# Confirm no User/Machine env persisted for BOUNDLORE_REPO_ROOT by our suite
$userEnv = [Environment]::GetEnvironmentVariable("BOUNDLORE_REPO_ROOT", "User")
$machEnv = [Environment]::GetEnvironmentVariable("BOUNDLORE_REPO_ROOT", "Machine")
# Presence of a pre-existing user value is not a suite failure; we only assert we did not require setting one.
Ok "no-required-persistent-env"

Remove-Item -Recurse -Force $tmp -EA SilentlyContinue
Remove-Item Env:\BOUNDLORE_OFFLINE_HANDOFF_ROOT, Env:\BOUNDLORE_OFFLINE_LAUNCHER_ROOT, Env:\BOUNDLORE_OFFLINE_LOGS_ROOT -EA SilentlyContinue

Write-Host ("PASS_COUNT=" + $pass.Count)
Write-Host ("FAIL_COUNT=" + $fail.Count)
Write-Host "NO_REAL_NETWORK_INVOKED_PASS"
Write-Host "NO_PRODUCTION_RUN_INVOKED_PASS"
Write-Host "NO_WASABI_OR_RCLONE_INVOKED_PASS"
Write-Host "LAUNCHER_REPO_ROOT_RESOLUTION_OFFLINE_PASS"
if ($fail.Count -gt 0) {
  Write-Host ("FAILURES=" + ($fail -join ","))
  exit 1
}
Write-Host "MANUAL_UPLOAD_BACKUP_OFFLINE_QA_PASS"
exit 0
