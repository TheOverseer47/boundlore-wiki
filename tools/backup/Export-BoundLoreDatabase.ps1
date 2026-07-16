<#
.SYNOPSIS
  Export BoundLore database artefacts (safe defaults: DryRun + Synthetic + NoNetwork).

.DESCRIPTION
  Live pg_dump/pg_dumpall sequence is designed for W5-A1 but refused unless
  AllowProductionRead + network authorization are both present AND a future
  live gate arms network execution. W5-P2 never opens Production/Staging.

  Planned live sequence (not executed here):
  1) Confirm production project identity
  2) Confirm release gate locked (contribution_locked=true)
  3) Read-only schema inventory vs allowlist
  4) Extension + security inventories
  5) pg_dumpall --roles-only --no-role-passwords
  6) pg_dump --format=custom (full required schemas)
  7) pg_restore -l TOC
  8) SHA-256 sidecars
  9) Store only under VeraCrypt workspace (V:)

  Password: SecureString -> PGPASSWORD in child process env only; never argv/URI logs.
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
  [switch]$ConfirmReleaseGateLocked,
  [string]$ProjectRef = "",
  [string]$OutputDirectory = "",
  [string]$BackupId = "",
  [string]$WorkingDirectory = "",
  [string]$PgHost = "",
  [int]$PgPort = 5432,
  [string]$PgDatabase = "",
  [string]$PgUser = ""
  # Password NEVER accepted as plain parameter — SecureString prompt only in armed live gate
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ExpectedProductionRef = "ohkoojpzmptdfyowdgog"
$ForbiddenStagingRef = "jzzgoiwfbuwiiyvwgwri"
# Live network dump remains disarmed in W5-P2.
$GateAllowsLiveNetwork = $false

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

if ($ProjectRef -eq $ForbiddenStagingRef) {
  Stop-Code "STOP_STAGING_TARGET" "Staging ref is forbidden"
}

if ($AllowProductionRead) {
  if (-not $ProjectRef) { Stop-Code "STOP_WRONG_PROJECT" "ProjectRef required" }
  if ($ProjectRef -ne $ExpectedProductionRef) { Stop-Code "STOP_WRONG_PROJECT" "Unexpected project ref" }
  if (-not $ConfirmReleaseGateLocked) { Stop-Code "STOP_RELEASE_GATE_NOT_LOCKED" "contribution_locked must be confirmed" }
  if ($NoNetwork) { Stop-Code "STOP_NETWORK_FORBIDDEN" "Production read requires network authorization" }
  if (-not $GateAllowsLiveNetwork) {
    Stop-Code "STOP_LIVE_NETWORK_RESERVED" "live database export is reserved for W5-A1"
  }
  Stop-Code "STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED" "Live database export not enabled"
}

if (-not $Synthetic -and -not $AllowProductionRead) {
  Stop-Code "STOP_UNSAFE_DEFAULT" "Non-synthetic export requires AllowProductionRead"
}

if (-not $BackupId) {
  $BackupId = "boundlore-backup-" + (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
$pgDumpall = Get-Command pg_dumpall -ErrorAction SilentlyContinue
$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
$pgDumpVersion = if ($pgDump) { (& pg_dump --version) } else { "MISSING" }

$result = [ordered]@{
  dry_run = [bool]$DryRun
  synthetic = [bool]$Synthetic
  no_network = [bool]$NoNetwork
  backup_id = $BackupId
  pg_dump = "$pgDumpVersion"
  planned_live_sequence = @(
    "identity_check",
    "release_gate_locked",
    "schema_inventory",
    "extensions_inventory",
    "security_inventory",
    "pg_dumpall --roles-only --no-role-passwords",
    "pg_dump --format=custom",
    "pg_restore -l TOC",
    "sha256_sidecars",
    "veracrypt_workspace_only"
  )
  planned_components = @("roles", "database.custom", "database-toc", "schema-inventory", "extensions-inventory", "security-inventory", "validation-baseline")
  role_passwords_included = $false
  connection = "none"
  live_network_armed = $false
}

if ($DryRun) {
  $result | ConvertTo-Json -Depth 5
  exit 0
}

# Synthetic placeholders matching production package shape
$root = Join-Path $out $BackupId
$db = Join-Path $root "database"
New-Item -ItemType Directory -Force -Path $db | Out-Null
@(
  @{ Name = "roles.sql"; Content = "-- synthetic roles; role_passwords_included=false`n" },
  @{ Name = "database.custom"; Content = "PGDUMP_CUSTOM_SYNTHETIC" },
  @{ Name = "database-toc.txt"; Content = "TOC synthetic`n" },
  @{ Name = "schema-inventory.json"; Content = "{`"schemas`":[`"public`",`"auth`",`"storage`"]}`n" },
  @{ Name = "extensions-inventory.json"; Content = "{`"extensions`":[]}`n" },
  @{ Name = "security-inventory.json"; Content = "{`"rls`":true}`n" },
  @{ Name = "validation-baseline.json"; Content = "{`"contribution_locked`":true}`n" }
) | ForEach-Object {
  $path = Join-Path $db $_.Name
  if ($_.Name.EndsWith(".sql") -or $_.Name.EndsWith(".txt") -or $_.Name.EndsWith(".json")) {
    Set-Content -Path $path -Value $_.Content -Encoding UTF8
  } else {
    [System.IO.File]::WriteAllBytes($path, [System.Text.Encoding]::ASCII.GetBytes($_.Content))
  }
  Get-FileHash -Algorithm SHA256 -Path $path | ForEach-Object {
    Set-Content -Path ($path + ".sha256") -Value ("{0}  {1}" -f $_.Hash.ToLower(), (Split-Path $path -Leaf)) -Encoding ASCII
  }
}

$result.ok = $true
$result.database_dir = $db
$result | ConvertTo-Json -Depth 5
