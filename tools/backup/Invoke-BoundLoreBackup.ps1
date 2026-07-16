<#
.SYNOPSIS
  Orchestrate BoundLore backup steps with safe defaults (DryRun/Synthetic/NoNetwork).
#>
[CmdletBinding()]
param(
  [bool]$DryRun = $true,
  [switch]$NoDryRun,
  [bool]$Synthetic = $true,
  [switch]$NoSynthetic,
  [bool]$NoNetwork = $true,
  [switch]$AllowNetwork,
  [switch]$AllowExternalUpload,
  [switch]$AllowProductionRead,
  [string]$OutputDirectory = "",
  [string]$WorkingDirectory = "",
  [string]$BackupId = "",
  [string]$ProjectRef = ""
)

$ErrorActionPreference = "Stop"
$Here = $PSScriptRoot

if ($NoDryRun) { $DryRun = $false }
if ($NoSynthetic) { $Synthetic = $false }
if ($AllowNetwork) { $NoNetwork = $false }

if ($AllowExternalUpload -or $AllowProductionRead) {
  Write-Error "STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED: live production/Wasabi actions are not authorized in this phase"
  exit 1
}

$flags = @()
if ($DryRun) { $flags += "-DryRun" } else { $flags += "-NoDryRun" }
if ($Synthetic) { $flags += "-Synthetic" } else { $flags += "-NoSynthetic" }
if ($NoNetwork) { $flags += "-NoNetwork" } else { $flags += "-AllowNetwork" }

$common = @{}
if ($OutputDirectory) { $common.OutputDirectory = $OutputDirectory }
if ($WorkingDirectory) { $common.WorkingDirectory = $WorkingDirectory }
if ($BackupId) { $common.BackupId = $BackupId }
if ($ProjectRef) { $common.ProjectRef = $ProjectRef }

Write-Host "BoundLore backup orchestrator (safe defaults)"
Write-Host "DryRun=$DryRun Synthetic=$Synthetic NoNetwork=$NoNetwork"

if (-not $OutputDirectory) {
  Write-Host "Dry-run orchestration only (no OutputDirectory). Pass -OutputDirectory outside the repo for synthetic package creation via Test-BoundLoreBackupPackage.py"
  exit 0
}

& (Join-Path $Here "Export-BoundLoreDatabase.ps1") @common @flags
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

$pyArgs = @(
  (Join-Path $Here "Export-BoundLoreStorage.py"),
  "--output-directory", $OutputDirectory
)
if ($WorkingDirectory) { $pyArgs += @("--working-directory", $WorkingDirectory) }
if ($BackupId) { $pyArgs += @("--backup-id", $BackupId) }
if ($Synthetic) { $pyArgs += "--synthetic" } else { $pyArgs += "--no-synthetic" }
if ($NoNetwork) { $pyArgs += "--no-network" } else { $pyArgs += "--allow-network" }
if ($DryRun) { $pyArgs += "--dry-run" } else { $pyArgs += "--no-dry-run" }
py -3 @pyArgs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "Next: New-BoundLoreBackupManifest.py / Protect-BoundLoreBackup.ps1 / Send-BoundLoreBackup.ps1 (upload still unauthorized)"

