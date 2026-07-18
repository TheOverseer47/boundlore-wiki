<#
.SYNOPSIS
  Install BoundLore manual-upload launcher files to D:\BoundLoreBackups\Launcher.

.DESCRIPTION
  Copies BAT + orchestrator + baseline + repo-root resolution helper from the
  repository, writes repo-root.txt with the validated git toplevel, and never
  executes the BAT or starts a snapshot. Requires explicit
  -ConfirmInstallAck REPLACE_LAUNCHER_FILES when destination files already exist.
#>
[CmdletBinding()]
param(
  [string]$DestinationRoot = "D:\BoundLoreBackups\Launcher",
  [string]$ConfirmInstallAck = "",
  [switch]$OfflineTempInstallTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoBackupDir = $PSScriptRoot
$RepoLauncher = Join-Path $RepoBackupDir "launcher"
$RepoRootLibSrc = Join-Path $RepoBackupDir "_lib\LauncherRepoRoot.ps1"
. $RepoRootLibSrc

$copyFiles = @(
  @{ Src = (Join-Path $RepoLauncher "BoundLore-Create-Encrypted-Backup.bat"); Name = "BoundLore-Create-Encrypted-Backup.bat" },
  @{ Src = (Join-Path $RepoLauncher "Invoke-BoundLoreManualUploadBackup.ps1"); Name = "Invoke-BoundLoreManualUploadBackup.ps1" },
  @{ Src = (Join-Path $RepoLauncher "expected-git-baseline.txt"); Name = "expected-git-baseline.txt" },
  @{ Src = $RepoRootLibSrc; Name = "LauncherRepoRoot.ps1" }
)

function Get-Sha256File([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

if ($OfflineTempInstallTest) {
  $DestinationRoot = Join-Path $env:TEMP ("bl-a8-install-" + [Guid]::NewGuid().ToString("N") + " With Spaces")
}

if (-not (Test-Path -LiteralPath $RepoLauncher)) {
  throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
}

# Installer must run from a validated repository checkout.
$installerProbe = [IO.Path]::GetFullPath((Join-Path $RepoBackupDir "..\.."))
$repoRoot = Assert-BoundLoreLauncherRepoRoot -RepoRoot $installerProbe

$destExists = $false
foreach ($f in $copyFiles) {
  if (Test-Path -LiteralPath (Join-Path $DestinationRoot $f.Name)) { $destExists = $true; break }
}
if ((Test-Path -LiteralPath (Join-Path $DestinationRoot "repo-root.txt"))) { $destExists = $true }
if ($destExists -and $ConfirmInstallAck -ne "REPLACE_LAUNCHER_FILES" -and -not $OfflineTempInstallTest) {
  throw "STOP_LOCAL_BACKUP_NOT_CONFIRMED: destination exists; pass -ConfirmInstallAck REPLACE_LAUNCHER_FILES"
}

# Preserve sibling Handoffs/Logs; only ensure Launcher destination.
New-Item -ItemType Directory -Force -Path $DestinationRoot | Out-Null

$pairs = @()
foreach ($f in $copyFiles) {
  if (-not (Test-Path -LiteralPath $f.Src)) { throw ("missing source " + $f.Name) }
  $dst = Join-Path $DestinationRoot $f.Name
  Copy-Item -LiteralPath $f.Src -Destination $dst -Force
  $hs = Get-Sha256File $f.Src
  $hd = Get-Sha256File $dst
  if ($hs -ne $hd) { throw ("STOP_CHECKSUM_FAILED: hash mismatch for " + $f.Name) }
  $pairs += [pscustomobject]@{ File = $f.Name; Sha256 = $hs; Match = $true }
}

$configPath = Join-Path $DestinationRoot "repo-root.txt"
[void](Write-BoundLoreRepoRootConfigFile -ConfigPath $configPath -RepoRoot $repoRoot)
$cfgText = (Get-Content -LiteralPath $configPath -Raw).TrimEnd("`r", "`n")
if (-not [string]::Equals($cfgText, $repoRoot, [StringComparison]::OrdinalIgnoreCase)) {
  throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
}

Write-Host "LAUNCHER_INSTALL_PASS"
Write-Host ("DESTINATION=" + $DestinationRoot)
Write-Host "REPO_ROOT_CONFIG_WRITTEN=repo-root.txt"
Write-Host "REPO_ROOT_SOURCE=INSTALL_TIME_GIT_TOPLEVEL"
$pairs | ForEach-Object { Write-Host ("HASH_MATCH=" + $_.File) }
Write-Host "INSTALLER_DID_NOT_EXECUTE_BAT"
Write-Host "INSTALLER_DID_NOT_START_SNAPSHOT"
Write-Host "INSTALLER_DID_NOT_TOUCH_HANDOFFS_OR_PRODUCTION_ARCHIVES"

if ($OfflineTempInstallTest) {
  # Confirm repo-root.txt readable and resolves.
  $resolved = Resolve-BoundLoreLauncherRepoRoot -RepoRoot "" -LauncherDirectory $DestinationRoot -ProcessEnvValue ""
  if ($resolved.Source -ne "LOCAL_CONFIG") { throw "offline install resolve source" }
  [void](Assert-BoundLoreLauncherRepoRoot -RepoRoot $resolved.Path)
  Write-Host "OFFLINE_TEMP_INSTALL_PASS"
  Remove-Item -Recurse -Force $DestinationRoot -EA SilentlyContinue
}

exit 0
