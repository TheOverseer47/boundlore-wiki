<#
.SYNOPSIS
  Transfer BoundLore backup packages (filesystem mock by default; Wasabi later).

.DESCRIPTION
  Defaults: DryRun + NoNetwork. External upload requires explicit AllowExternalUpload later.
  No bucket create, lifecycle, versioning, object-lock, or delete capabilities.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$PackageDirectory,
  [string]$MockDestination = "",
  [string]$Endpoint = "",
  [string]$Region = "",
  [string]$Bucket = "",
  [string]$Prefix = "",
  [bool]$DryRun = $true,
  [switch]$NoDryRun,
  [bool]$NoNetwork = $true,
  [switch]$AllowNetwork,
  [switch]$AllowExternalUpload
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Stop-Code([string]$Code, [string]$Message) {
  Write-Error ("{0}: {1}" -f $Code, $Message)
  exit 1
}

if ($NoDryRun) { $DryRun = $false }
if ($AllowNetwork) { $NoNetwork = $false }

# Hard capability denials
$capabilities = @{
  create_bucket = $false
  lifecycle_apply = $false
  object_lock_apply = $false
  versioning_apply = $false
  delete_object = $false
}

if ($AllowExternalUpload) {
  if ($NoNetwork) { Stop-Code "STOP_NETWORK_FORBIDDEN" "External upload blocked by NoNetwork" }
  if (-not $Endpoint -or -not $Region -or -not $Bucket -or -not $Prefix) {
    Stop-Code "STOP_CREDENTIALS_MISSING" "Endpoint/Region/Bucket/Prefix required for external upload"
  }
  Stop-Code "STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED" "Wasabi upload is not authorized in this phase"
}

$pkg = (Resolve-Path $PackageDirectory).Path
if ($pkg.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  # Package may live outside repo; if inside, refuse as final store.
  Stop-Code "STOP_OUTPUT_INSIDE_REPOSITORY" "Package path inside repository is not a valid transfer source for durable store"
}

$result = [ordered]@{
  dry_run = [bool]$DryRun
  no_network = [bool]$NoNetwork
  allow_external_upload = [bool]$AllowExternalUpload
  capabilities = $capabilities
  package = $pkg
}

if ($DryRun) {
  $result.planned = "Mock filesystem copy or future Wasabi put-only upload after encryption"
  $result | ConvertTo-Json -Depth 6
  exit 0
}

if (-not $MockDestination) {
  Stop-Code "STOP_CREDENTIALS_MISSING" "MockDestination required for offline transfer"
}
$destRoot = [System.IO.Path]::GetFullPath($MockDestination)
if ($destRoot.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  Stop-Code "STOP_OUTPUT_INSIDE_REPOSITORY" "Mock destination must be outside repository"
}

New-Item -ItemType Directory -Force -Path $destRoot | Out-Null
$leaf = Split-Path $pkg -Leaf
$dest = Join-Path $destRoot $leaf
if (Test-Path $dest) { Remove-Item -Recurse -Force $dest }
Copy-Item -Recurse -Force $pkg $dest
$result.ok = $true
$result.mock_destination = $dest
$result | ConvertTo-Json -Depth 6

