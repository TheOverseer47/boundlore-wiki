<#
.SYNOPSIS
  Export BoundLore database artefacts (safe defaults: DryRun + Synthetic + NoNetwork).

.DESCRIPTION
  Live pg_dump is designed but refused unless multiple explicit overrides are provided.
  This gate never opens Production/Staging connections.
#>
[CmdletBinding()]
param(
  [bool]$DryRun = $true,
  [switch]$NoDryRun,
  [bool]$Synthetic = $true,
  [switch]$NoSynthetic,
  [bool]$NoNetwork = $true,
  [switch]$AllowNetwork,
  [switch]$AllowProductionRead,
  [string]$ProjectRef = "",
  [string]$OutputDirectory = "",
  [string]$BackupId = "",
  [string]$WorkingDirectory = ""
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Stop-Code([string]$Code, [string]$Message) {
  Write-Error ("{0}: {1}" -f $Code, $Message)
  exit 1
}

if ($NoDryRun) { $DryRun = $false }
if ($NoSynthetic) { $Synthetic = $false }
if ($AllowNetwork) { $NoNetwork = $false }

if (-not $OutputDirectory) {
  Stop-Code "STOP_OUTPUT_INSIDE_REPOSITORY" "OutputDirectory is required and must be outside the repository"
}

$out = [System.IO.Path]::GetFullPath($OutputDirectory)
if ($out.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  Stop-Code "STOP_OUTPUT_INSIDE_REPOSITORY" "Refusing output inside repository: $out"
}

if ($ProjectRef -eq "jzzgoiwfbuwiiyvwgwri") {
  Stop-Code "STOP_STAGING_TARGET" "Staging ref is forbidden"
}

if ($AllowProductionRead) {
  if (-not $ProjectRef) { Stop-Code "STOP_WRONG_PROJECT" "ProjectRef required" }
  if ($ProjectRef -ne "ohkoojpzmptdfyowdgog") { Stop-Code "STOP_WRONG_PROJECT" "Unexpected project ref" }
  if ($NoNetwork) { Stop-Code "STOP_NETWORK_FORBIDDEN" "Production read requires network authorization" }
  Stop-Code "STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED" "Live database export is not authorized in this phase"
}

if (-not $Synthetic -and -not $AllowProductionRead) {
  Stop-Code "STOP_UNSAFE_DEFAULT" "Non-synthetic export requires AllowProductionRead (not authorized here)"
}

if (-not $BackupId) {
  $BackupId = "boundlore-backup-" + (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$pgDumpVersion = if ($pgDump) { (& pg_dump --version) } else { "MISSING" }

$result = [ordered]@{
  dry_run = [bool]$DryRun
  synthetic = [bool]$Synthetic
  no_network = [bool]$NoNetwork
  backup_id = $BackupId
  pg_dump = "$pgDumpVersion"
  planned_components = @("roles", "pre-data", "data", "post-data", "extensions_inventory", "policy_inventory", "release_gate_state")
  connection = "none"
}

if ($DryRun) {
  $result | ConvertTo-Json -Depth 5
  exit 0
}

# Synthetic placeholders only
$root = Join-Path $out $BackupId
$db = Join-Path $root "database"
New-Item -ItemType Directory -Force -Path $db | Out-Null
@(
  @{ Name = "roles.sql"; Content = "-- synthetic roles`n" },
  @{ Name = "schema.dump"; Content = "SYNTHETIC_SCHEMA" },
  @{ Name = "data.dump"; Content = "SYNTHETIC_DATA" }
) | ForEach-Object {
  $path = Join-Path $db $_.Name
  if ($_.Name.EndsWith(".sql")) {
    Set-Content -Path $path -Value $_.Content -Encoding UTF8
  } else {
    [System.IO.File]::WriteAllBytes($path, [System.Text.Encoding]::ASCII.GetBytes($_.Content))
  }
  Get-FileHash -Algorithm SHA256 -Path $path | ForEach-Object {
    Set-Content -Path ($path + ".sha256") -Value ("{0}  {1}" -f $_.Hash.ToLower(), $_.Name) -Encoding ASCII
  }
}

$result.ok = $true
$result.database_dir = $db
$result | ConvertTo-Json -Depth 5

