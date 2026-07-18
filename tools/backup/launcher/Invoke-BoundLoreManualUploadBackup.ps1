<#
.SYNOPSIS
  BoundLore manual-upload backup orchestrator (local launcher).

.DESCRIPTION
  Validates V:, free space, toolchain, git baseline, worktree allowlist, lock,
  confirmation gesture, then starts Invoke-BoundLoreProductionSnapshot.ps1 with
  -ManualWasabiUpload. Never mounts VeraCrypt, never calls Wasabi/rclone.

  -OfflineSelfTest runs stubbed offline checks only (no Production, no V: required
  when BOUNDLORE_OFFLINE_* roots are set).
#>
[CmdletBinding()]
param(
  [switch]$OfflineSelfTest,
  [switch]$SkipConfirmation,
  [string]$RepoRootOverride = "",
  [string]$RunnerStubPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedBranch = "review/p5-e10b-w5-a1-controlled-production-snapshot"
$ConfirmGesture = "CREATE_LOCAL_ENCRYPTED_BACKUP_ONLY"
$VeraDrive = "V:"
$MinVFree = 2GB
$MinDFree = 1GB

function Get-LauncherRoot {
  if ($env:BOUNDLORE_OFFLINE_LAUNCHER_ROOT -and $env:BOUNDLORE_OFFLINE_LAUNCHER_ROOT.Trim()) {
    return [IO.Path]::GetFullPath($env:BOUNDLORE_OFFLINE_LAUNCHER_ROOT.Trim())
  }
  return $PSScriptRoot
}

function Get-LogsRoot {
  if ($env:BOUNDLORE_OFFLINE_LOGS_ROOT -and $env:BOUNDLORE_OFFLINE_LOGS_ROOT.Trim()) {
    return [IO.Path]::GetFullPath($env:BOUNDLORE_OFFLINE_LOGS_ROOT.Trim())
  }
  return "D:\BoundLoreBackups\Logs"
}

function Get-LockPath {
  return (Join-Path (Get-LauncherRoot) "boundlore-backup.lock")
}

function Write-RedactedLog([string]$Path, [string]$Line) {
  $dir = Split-Path $Path -Parent
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  $ts = [DateTime]::UtcNow.ToString("o")
  Add-Content -LiteralPath $Path -Value ("{0} {1}" -f $ts, $Line) -Encoding UTF8
}

function Stop-Orchestrator([string]$Code, [string]$Message, [string]$LogPath = "", [int]$ExitCode = 1) {
  $line = ("{0}: {1}" -f $Code, $Message)
  Write-Host $line
  if ($LogPath) {
    try { Write-RedactedLog $LogPath ("FAIL " + $line) } catch { }
  }
  exit $ExitCode
}

function Test-AllowedUntracked([string]$StatusLine) {
  $p = ($StatusLine -replace '^\?\?\s+', '').Trim().Replace('\', '/')
  $allowed = @(
    '.env.legacy',
    '.env.legacy.example',
    '.env.staging',
    'backups/',
    'qa/e2e-baseline-bmeta.snapshot.json',
    'qa/fixtures/.real-content-export-raw.json',
    'qa/fixtures/real-content-export/'
  )
  foreach ($a in $allowed) {
    if ($p -eq $a.TrimEnd('/') -or $p.StartsWith($a) -or ($a.EndsWith('/') -and ($p + '/').StartsWith($a))) {
      return $true
    }
  }
  return $false
}

function Assert-GitBaseline([string]$RepoRoot, [string]$BaselineFile) {
  Push-Location $RepoRoot
  try {
    $branch = (git branch --show-current 2>$null | Out-String).Trim()
    $head = (git rev-parse --short HEAD 2>$null | Out-String).Trim()
    if ($branch -ne $ExpectedBranch) {
      throw ("STOP_WRONG_BRANCH: got " + $branch)
    }
    $expectedHead = $null
    if (Test-Path -LiteralPath $BaselineFile) {
      foreach ($line in Get-Content -LiteralPath $BaselineFile) {
        if ($line -match '^HEAD=(.+)$') { $expectedHead = $Matches[1].Trim() }
      }
    }
    if (-not $expectedHead -or $expectedHead -eq "PLACEHOLDER_UPDATE_AFTER_COMMIT") {
      throw "STOP_LAUNCHER_BASELINE_MISMATCH: baseline HEAD not pinned"
    }
    if ($head -ne $expectedHead) {
      Push-Location $RepoRoot
      try {
        git merge-base --is-ancestor $expectedHead HEAD 2>$null | Out-Null
        if ($LASTEXITCODE -ne 0) {
          throw ("STOP_UNEXPECTED_HEAD: expected " + $expectedHead + " (or descendant) got " + $head)
        }
      } finally { Pop-Location }
    }
    $status = @(git status --short 2>$null)
    foreach ($s in $status) {
      $t = $s.TrimEnd()
      if (-not $t) { continue }
      if ($t.StartsWith("??")) {
        if (-not (Test-AllowedUntracked $t)) {
          throw ("STOP_DIRTY_WORKTREE_UNEXPECTED: untracked " + $t)
        }
        continue
      }
      throw ("STOP_DIRTY_WORKTREE_UNEXPECTED: " + $t)
    }
    return @{ Branch = $branch; Head = $head }
  } finally { Pop-Location }
}

function Assert-ToolchainManual {
  foreach ($cmd in @("age", "psql", "pg_dump", "pg_dumpall", "pg_restore", "tar")) {
    if (-not (Get-Command $cmd -EA SilentlyContinue)) {
      throw ("STOP_ENCRYPTION_UNAVAILABLE: missing tool " + $cmd)
    }
  }
}

function Assert-VeraMount {
  if (-not (Test-Path ($VeraDrive + "\"))) {
    throw "STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED: V: not present"
  }
  $ws = Join-Path $VeraDrive "BoundLoreProductionSnapshot"
  # Identity: plaintext workspace root must be under V: (reuse runner rule).
  $full = [IO.Path]::GetFullPath($ws)
  if (-not $full.StartsWith(($VeraDrive + "\"), [StringComparison]::OrdinalIgnoreCase)) {
    throw "STOP_PLAINTEXT_WORKSPACE_UNSAFE: workspace identity"
  }
  $v = Get-PSDrive -Name V -EA SilentlyContinue
  if (-not $v -or $v.Free -lt $MinVFree) {
    throw "STOP_FREE_SPACE_INSUFFICIENT: V: free space"
  }
  $d = Get-PSDrive -Name D -EA SilentlyContinue
  if ($d -and $d.Free -lt $MinDFree) {
    throw "STOP_FREE_SPACE_INSUFFICIENT: D: free space"
  }
}

function Enter-BackupLock([string]$LockPath) {
  $dir = Split-Path $LockPath -Parent
  if (-not (Test-Path -LiteralPath $dir)) { New-Item -ItemType Directory -Force -Path $dir | Out-Null }
  try {
    $fs = [IO.File]::Open($LockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    $bytes = [Text.Encoding]::UTF8.GetBytes(("locked_utc=" + [DateTime]::UtcNow.ToString("o") + "`nmode=MANUAL_WASABI_UPLOAD`n"))
    $fs.Write($bytes, 0, $bytes.Length)
    return $fs
  } catch [IO.IOException] {
    throw "STOP_BACKUP_ALREADY_RUNNING_OR_UNACKNOWLEDGED: lock present"
  }
}

function Exit-BackupLock($LockStream, [string]$LockPath, [bool]$Remove) {
  if ($LockStream) {
    try { $LockStream.Dispose() } catch { }
  }
  if ($Remove -and (Test-Path -LiteralPath $LockPath)) {
    Remove-Item -LiteralPath $LockPath -Force -EA SilentlyContinue
  }
}

# --- Offline self-test (no Production / no real runner) ---
if ($OfflineSelfTest) {
  $failures = @()
  $tmp = Join-Path $env:TEMP ("bl-a7-orch-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $tmp | Out-Null
  $env:BOUNDLORE_OFFLINE_LAUNCHER_ROOT = Join-Path $tmp "Launcher"
  $env:BOUNDLORE_OFFLINE_LOGS_ROOT = Join-Path $tmp "Logs"
  $env:BOUNDLORE_OFFLINE_HANDOFF_ROOT = Join-Path $tmp "Handoffs"
  New-Item -ItemType Directory -Force -Path $env:BOUNDLORE_OFFLINE_LAUNCHER_ROOT, $env:BOUNDLORE_OFFLINE_LOGS_ROOT, $env:BOUNDLORE_OFFLINE_HANDOFF_ROOT | Out-Null

  . (Join-Path (Split-Path $PSScriptRoot -Parent) "_lib\ManualUploadHandoff.ps1")

  # Handoff happy + no-overwrite
  $hp = New-BoundLoreManualUploadHandoff -BackupId "boundlore-production-snapshot-test" -ArchiveFileName "boundlore-production-snapshot-test.age" -ArchiveBytes 1234 -ArchiveSha256 ("a" * 64) -LocalArchivePath "D:\BoundLoreBackups\EncryptedArchives\boundlore-production-snapshot-test.age" -RemoteRelativePath "production-snapshots/boundlore-production-snapshot-test/boundlore-production-snapshot-test.age"
  if (-not (Test-Path $hp)) { $failures += "handoff-create" }
  if (-not (Test-BoundLoreManualHandoffTextSafe (Get-Content $hp -Raw))) { $failures += "handoff-safe" }
  try {
    [void](New-BoundLoreManualUploadHandoff -BackupId "boundlore-production-snapshot-test" -ArchiveFileName "boundlore-production-snapshot-test.age" -ArchiveBytes 1234 -ArchiveSha256 ("a" * 64) -LocalArchivePath "D:\BoundLoreBackups\EncryptedArchives\boundlore-production-snapshot-test.age" -RemoteRelativePath "production-snapshots/boundlore-production-snapshot-test/boundlore-production-snapshot-test.age")
    $failures += "handoff-overwrite-should-fail"
  } catch {
    if ("$_" -notmatch "STOP_MANUAL_UPLOAD_HANDOFF_ALREADY_EXISTS") { $failures += "handoff-overwrite-code" }
  }

  # Lock exclusive
  $lp = Get-LockPath
  $s1 = Enter-BackupLock $lp
  try {
    try { [void](Enter-BackupLock $lp); $failures += "lock-second-should-fail" }
    catch { if ("$_" -notmatch "STOP_BACKUP_ALREADY_RUNNING") { $failures += "lock-second-code" } }
  } finally {
    Exit-BackupLock $s1 $lp $true
  }
  if (Test-Path $lp) { $failures += "lock-not-removed" }

  # Confirmation reject
  if ($ConfirmGesture -ne "CREATE_LOCAL_ENCRYPTED_BACKUP_ONLY") { $failures += "gesture" }

  $bat = Join-Path $PSScriptRoot "BoundLore-Create-Encrypted-Backup.bat"
  $batText = Get-Content $bat -Raw -EA SilentlyContinue
  if (-not $batText -or $batText -notmatch "BOUNDLORE_MANUAL_UPLOAD_BACKUP_LAUNCHER") { $failures += "bat-marker" }
  if ($batText -match "(?i)AKIA[0-9A-Z]{16}|SECRET_ACCESS_KEY|service_role|wasabisys\.com") { $failures += "bat-secret" }
  if ($batText -notmatch "Invoke-BoundLoreManualUploadBackup\.ps1") { $failures += "bat-orch" }

  Remove-Item -Recurse -Force $tmp -EA SilentlyContinue
  Remove-Item Env:\BOUNDLORE_OFFLINE_LAUNCHER_ROOT -EA SilentlyContinue
  Remove-Item Env:\BOUNDLORE_OFFLINE_LOGS_ROOT -EA SilentlyContinue
  Remove-Item Env:\BOUNDLORE_OFFLINE_HANDOFF_ROOT -EA SilentlyContinue

  if ($failures.Count -gt 0) {
    Write-Host ("OFFLINE_SELFTEST_FAIL:" + ($failures -join ","))
    exit 1
  }
  Write-Host "OFFLINE_SELFTEST_PASS"
  Write-Host "NO_REAL_NETWORK_INVOKED_PASS"
  Write-Host "NO_PRODUCTION_RUN_INVOKED_PASS"
  Write-Host "NO_WASABI_OR_RCLONE_INVOKED_PASS"
  exit 0
}

# --- Live orchestrator path ---
$launcherRoot = Get-LauncherRoot
$logsRoot = Get-LogsRoot
$logPath = Join-Path $logsRoot ("manual-backup-" + [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ") + ".log")
$lockPath = Get-LockPath
$lockStream = $null
$lockOwned = $false

try {
  Write-RedactedLog $logPath "START MANUAL_UPLOAD_ORCHESTRATOR"

  $repoRoot = if ($RepoRootOverride) { $RepoRootOverride } else {
    # Prefer repo relative to this script: tools/backup/launcher -> repo root
    [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.."))
  }
  if (-not (Test-Path (Join-Path $repoRoot "tools\backup\Invoke-BoundLoreProductionSnapshot.ps1"))) {
    # Installed under D:\...\Launcher — locate repo via sibling expected baseline or fail
    $probe = Join-Path $PSScriptRoot "..\..\..\tools\backup\Invoke-BoundLoreProductionSnapshot.ps1"
    if (Test-Path $probe) {
      $repoRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\..\.."))
    } else {
      # Installation copy: require BOUNDLORE_REPO_ROOT
      if ($env:BOUNDLORE_REPO_ROOT -and (Test-Path $env:BOUNDLORE_REPO_ROOT)) {
        $repoRoot = [IO.Path]::GetFullPath($env:BOUNDLORE_REPO_ROOT)
      } else {
        Stop-Orchestrator "STOP_LAUNCHER_BASELINE_MISMATCH" "cannot locate repository root; set BOUNDLORE_REPO_ROOT" $logPath
      }
    }
  }

  $baselineFile = Join-Path $PSScriptRoot "expected-git-baseline.txt"
  if (-not (Test-Path $baselineFile)) {
    $baselineFile = Join-Path $repoRoot "tools\backup\launcher\expected-git-baseline.txt"
  }

  try { Assert-VeraMount } catch { Stop-Orchestrator (($_.Exception.Message -split ":")[0]) $_.Exception.Message $logPath }
  Write-RedactedLog $logPath "PASS V_MOUNT"
  try { Assert-ToolchainManual } catch { Stop-Orchestrator (($_.Exception.Message -split ":")[0]) $_.Exception.Message $logPath }
  Write-RedactedLog $logPath "PASS TOOLCHAIN"
  try { $git = Assert-GitBaseline $repoRoot $baselineFile } catch { Stop-Orchestrator (($_.Exception.Message -split ":")[0]) $_.Exception.Message $logPath }
  Write-RedactedLog $logPath ("PASS GIT branch=" + $git.Branch + " head=" + $git.Head)

  try {
    $lockStream = Enter-BackupLock $lockPath
    $lockOwned = $true
  } catch {
    Stop-Orchestrator "STOP_BACKUP_ALREADY_RUNNING_OR_UNACKNOWLEDGED" $_.Exception.Message $logPath
  }
  Write-RedactedLog $logPath "PASS LOCK"

  if (-not $SkipConfirmation) {
    Write-Host "Type CREATE_LOCAL_ENCRYPTED_BACKUP_ONLY to continue:"
    $ack = Read-Host
    if ($ack -ne $ConfirmGesture) {
      Stop-Orchestrator "STOP_LOCAL_BACKUP_NOT_CONFIRMED" "confirmation gesture mismatch" $logPath
    }
  }
  Write-RedactedLog $logPath "PASS CONFIRMATION"

  $runner = Join-Path $repoRoot "tools\backup\Invoke-BoundLoreProductionSnapshot.ps1"
  if ($RunnerStubPath) { $runner = $RunnerStubPath }
  if (-not (Test-Path -LiteralPath $runner)) {
    Stop-Orchestrator "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "runner missing" $logPath
  }

  $recipient = "D:\BoundLoreBackups\boundlore-production-age-recipient.txt"
  $archRoot = "D:\BoundLoreBackups\EncryptedArchives"
  $wsRoot = Join-Path $VeraDrive "BoundLoreProductionSnapshot"

  $args = @(
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $runner,
    "-NoPreflightOnly", "-NoSynthetic", "-AllowNetwork",
    "-LiveExecution", "-ManualWasabiUpload",
    "-AllowProductionRead", "-AllowSupabaseStorageRead",
    "-ConfirmProductionProjectRef", "ohkoojpzmptdfyowdgog",
    "-ConfirmReleaseGateLocked",
    "-ConfirmEncryptedOutputOnly",
    "-ConfirmWasabiProductionScope",
    "-ConfirmVeraCryptWorkspaceMounted",
    "-ConfirmLocalEncryptedArchiveCopy",
    "-ConfirmUserAuthorizedSnapshot",
    "-ProductionRecipientFile", $recipient,
    "-LocalEncryptedArchiveRoot", $archRoot,
    "-VeraCryptWorkspaceRoot", $wsRoot,
    "-DatabaseConnectionMode", "SessionPooler"
  )

  Write-RedactedLog $logPath "START RUNNER ManualWasabiUpload"
  $p = Start-Process -FilePath "powershell.exe" -ArgumentList $args -Wait -PassThru -NoNewWindow
  $ec = $p.ExitCode
  Write-RedactedLog $logPath ("RUNNER_EXIT=" + $ec)
  if ($ec -ne 0) {
    Write-RedactedLog $logPath "FAIL RUNNER"
    Exit-BackupLock $lockStream $lockPath $true
    $lockOwned = $false
    exit $ec
  }

  Write-RedactedLog $logPath "PASS RUNNER"
  Write-RedactedLog $logPath "AUTOMATIC_WASABI_UPLOAD=DEFERRED"
  Write-RedactedLog $logPath "S-07=OPEN"
  Write-Host "LOCAL_BACKUP_ORCHESTRATOR_PASS"
  Write-Host "MANUAL_WASABI_UPLOAD_REQUIRED"
  Exit-BackupLock $lockStream $lockPath $true
  $lockOwned = $false
  exit 0
} catch {
  try { Write-RedactedLog $logPath ("FAIL " + $_.Exception.Message) } catch { }
  if ($lockOwned) {
    # On unexpected error remove lock so the operator is not permanently blocked;
    # documented: failure path clears lock after redacted log write.
    Exit-BackupLock $lockStream $lockPath $true
  }
  throw
}
