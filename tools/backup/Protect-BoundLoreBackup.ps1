<#
.SYNOPSIS
  Encrypt BoundLore backup artefacts using an installed established tool (age preferred).

.DESCRIPTION
  Fail-closed when encryption tooling is unavailable for non-dry runs.
  Never continues unencrypted for upload paths.
  Only invokes established tools (age / gpg / 7z); never invents cryptography.

  -PerformLocalEncryption enables offline age encryption of package files.
  It does NOT authorize uploads, Wasabi, or Production reads.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$PackageDirectory,
  [string]$RecipientPublicKey = "",
  [bool]$DryRun = $true,
  [switch]$NoDryRun,
  [bool]$NoNetwork = $true,
  [switch]$AllowNetwork,
  [switch]$PerformLocalEncryption
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path

function Stop-Code([string]$Code, [string]$Message) {
  Write-Error ("{0}: {1}" -f $Code, $Message)
  exit 1
}

if ($NoDryRun) { $DryRun = $false }
if ($AllowNetwork) { $NoNetwork = $false }
if (-not $NoNetwork) {
  Stop-Code "STOP_NETWORK_FORBIDDEN" "Protect stays offline; network not authorized"
}

$age = Get-Command age -ErrorAction SilentlyContinue
$gpg = Get-Command gpg -ErrorAction SilentlyContinue
$sevenZip = Get-Command 7z -ErrorAction SilentlyContinue

$tool = $null
if ($age) { $tool = "age" }
elseif ($gpg) { $tool = "gpg" }
elseif ($sevenZip) { $tool = "7z" }

$pkg = (Resolve-Path $PackageDirectory).Path

$result = [ordered]@{
  dry_run = [bool]$DryRun
  no_network = [bool]$NoNetwork
  package = $pkg
  encryption_tool = $(if ($tool) { $tool } else { "MISSING" })
  upload_authorized = $false
  perform_local_encryption = [bool]$PerformLocalEncryption
  manual_tool_installation_required = (-not $tool)
}

if ($DryRun) {
  if (-not $tool) {
    $result.planned = "STOP_ENCRYPTION_UNAVAILABLE on live run. Install age (preferred), or gpg/7z."
    $result.stop_code_if_live = "STOP_ENCRYPTION_UNAVAILABLE"
  } else {
    $result.planned = "Would encrypt database/* and configuration/*.json with $tool when -PerformLocalEncryption -NoDryRun"
  }
  $result | ConvertTo-Json -Depth 5
  exit 0
}

if ($pkg.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  Stop-Code "STOP_OUTPUT_INSIDE_REPOSITORY" "PackageDirectory must be outside the repository"
}

if (-not $tool) {
  Stop-Code "STOP_ENCRYPTION_UNAVAILABLE" "Install age (preferred) before live encryption. Candidates: age, gpg, 7z."
}

if (-not $PerformLocalEncryption) {
  Stop-Code "STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED" "Local encryption requires -PerformLocalEncryption (uploads still unauthorized)"
}

if ($tool -ne "age") {
  Stop-Code "STOP_ENCRYPTION_UNAVAILABLE" "This phase requires age for local encryption"
}

if (-not $RecipientPublicKey) {
  Stop-Code "STOP_CREDENTIALS_MISSING" "age recipient public key required (not a private key)"
}

if ($RecipientPublicKey -match "AGE-SECRET-KEY") {
  Stop-Code "STOP_CREDENTIALS_MISSING" "private key must not be passed as recipient"
}

$targets = @()
$targets += Get-ChildItem -Path (Join-Path $pkg "database") -File -ErrorAction SilentlyContinue |
  Where-Object { $_.Extension -in @(".sql", ".dump") -and $_.Name -notlike "*.age" -and $_.Name -notlike "*.sha256" }
$targets += Get-ChildItem -Path (Join-Path $pkg "configuration") -Filter "*.json" -File -ErrorAction SilentlyContinue

if (-not $targets -or $targets.Count -eq 0) {
  Stop-Code "STOP_MANIFEST_INCOMPLETE" "No encryptable database/configuration files found"
}

$encrypted = @()
foreach ($file in $targets) {
  $outAge = $file.FullName + ".age"
  & age -r $RecipientPublicKey -o $outAge -- $file.FullName
  if ($LASTEXITCODE -ne 0) {
    Stop-Code "STOP_ENCRYPTION_FAILED" ("age failed for {0}" -f $file.Name)
  }
  if (-not (Test-Path $outAge)) {
    Stop-Code "STOP_ENCRYPTION_FAILED" ("missing output {0}" -f $outAge)
  }
  $hash = (Get-FileHash -Algorithm SHA256 -Path $outAge).Hash.ToLower()
  Set-Content -Path ($outAge + ".sha256") -Value ("{0}  {1}" -f $hash, (Split-Path $outAge -Leaf)) -Encoding ASCII
  $encrypted += (Split-Path $outAge -Leaf)
}

$result.ok = $true
$result.encrypted_files = $encrypted
$result.encryption_method = "age"
$result | ConvertTo-Json -Depth 6
