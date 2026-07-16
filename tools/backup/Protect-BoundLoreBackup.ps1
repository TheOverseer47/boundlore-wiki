<#
.SYNOPSIS
  Encrypt BoundLore backup artefacts using an installed established tool (age preferred).

.DESCRIPTION
  Fail-closed when encryption tooling is unavailable for non-dry runs.
  Never continues unencrypted for upload paths.
  Only invokes established tools (age / gpg / 7z); never invents cryptography.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$PackageDirectory,
  [string]$RecipientPublicKey = "",
  [bool]$DryRun = $true,
  [switch]$NoDryRun,
  [bool]$NoNetwork = $true
)

$ErrorActionPreference = "Stop"

function Stop-Code([string]$Code, [string]$Message) {
  Write-Error ("{0}: {1}" -f $Code, $Message)
  exit 1
}

if ($NoDryRun) { $DryRun = $false }

$age = Get-Command age -ErrorAction SilentlyContinue
$gpg = Get-Command gpg -ErrorAction SilentlyContinue
$sevenZip = Get-Command 7z -ErrorAction SilentlyContinue

$tool = $null
if ($age) { $tool = "age" }
elseif ($gpg) { $tool = "gpg" }
elseif ($sevenZip) { $tool = "7z" }

$pkg = Resolve-Path $PackageDirectory
$result = [ordered]@{
  dry_run = [bool]$DryRun
  no_network = [bool]$NoNetwork
  package = "$pkg"
  encryption_tool = $(if ($tool) { $tool } else { "MISSING" })
  upload_authorized = $false
  manual_tool_installation_required = (-not $tool)
}

if ($DryRun) {
  if (-not $tool) {
    $result.planned = "STOP_ENCRYPTION_UNAVAILABLE on live run. Install age (preferred), or gpg/7z."
    $result.stop_code_if_live = "STOP_ENCRYPTION_UNAVAILABLE"
  } else {
    $result.planned = "Would encrypt database/*.sql|*.dump and configuration/*.json with $tool"
  }
  $result | ConvertTo-Json -Depth 5
  exit 0
}

if (-not $tool) {
  Stop-Code "STOP_ENCRYPTION_UNAVAILABLE" "Install age (preferred) before live encryption. Candidates: age, gpg, 7z."
}

if ($tool -eq "age" -and -not $RecipientPublicKey) {
  Stop-Code "STOP_CREDENTIALS_MISSING" "age recipient public key required (not a private key)"
}

# Live encryption path reserved for a later authorized gate.
Stop-Code "STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED" "Live encryption of real packages is reserved for a later authorized gate"
