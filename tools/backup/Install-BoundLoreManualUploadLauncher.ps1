<#
.SYNOPSIS
  Install BoundLore manual-upload launcher files to D:\BoundLoreBackups\Launcher.

.DESCRIPTION
  Copies BAT + orchestrator (+ baseline) from the repository. Never executes the BAT,
  never starts a snapshot, never reads secrets. Requires explicit -ConfirmInstallAck REPLACE_LAUNCHER_FILES
  when destination files already exist.
#>
[CmdletBinding()]
param(
  [string]$DestinationRoot = "D:\BoundLoreBackups\Launcher",
  [string]$ConfirmInstallAck = "",
  [switch]$OfflineTempInstallTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoLauncher = Join-Path $PSScriptRoot "launcher"
$files = @(
  "BoundLore-Create-Encrypted-Backup.bat",
  "Invoke-BoundLoreManualUploadBackup.ps1",
  "expected-git-baseline.txt"
)

function Get-Sha256File([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

if ($OfflineTempInstallTest) {
  $DestinationRoot = Join-Path $env:TEMP ("bl-a7-install-" + [Guid]::NewGuid().ToString("N"))
}

if (-not (Test-Path -LiteralPath $RepoLauncher)) {
  throw "STOP_LAUNCHER_BASELINE_MISMATCH: repo launcher folder missing"
}

$destExists = $false
foreach ($f in $files) {
  if (Test-Path -LiteralPath (Join-Path $DestinationRoot $f)) { $destExists = $true; break }
}
if ($destExists -and $ConfirmInstallAck -ne "REPLACE_LAUNCHER_FILES" -and -not $OfflineTempInstallTest) {
  throw "STOP_LOCAL_BACKUP_NOT_CONFIRMED: destination exists; pass -ConfirmInstallAck REPLACE_LAUNCHER_FILES"
}

New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null

$pairs = @()
foreach ($f in $files) {
  $src = Join-Path $RepoLauncher $f
  if (-not (Test-Path -LiteralPath $src)) { throw ("missing source " + $f) }
  $dst = Join-Path $DestinationRoot $f
  Copy-Item -LiteralPath $src -Destination $dst -Force
  $hs = Get-Sha256File $src
  $hd = Get-Sha256File $dst
  if ($hs -ne $hd) { throw ("STOP_CHECKSUM_FAILED: hash mismatch for " + $f) }
  $pairs += [pscustomobject]@{ File = $f; Sha256 = $hs; Match = $true }
}

Write-Host "LAUNCHER_INSTALL_PASS"
Write-Host ("DESTINATION=" + $DestinationRoot)
$pairs | ForEach-Object { Write-Host ("HASH_MATCH=" + $_.File) }
Write-Host "INSTALLER_DID_NOT_EXECUTE_BAT"
Write-Host "INSTALLER_DID_NOT_START_SNAPSHOT"

if ($OfflineTempInstallTest) {
  # verify BAT not executed: no log side effects expected
  Write-Host "OFFLINE_TEMP_INSTALL_PASS"
  Remove-Item -Recurse -Force $DestinationRoot -EA SilentlyContinue
}

exit 0
