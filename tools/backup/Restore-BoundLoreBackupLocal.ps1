<#
.SYNOPSIS
  Local restore helper for BoundLore backup packages (synthetic / mock only in this phase).
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$PackageDirectory,
  [Parameter(Mandatory = $true)][string]$RestoreDirectory,
  [bool]$DryRun = $true,
  [switch]$NoDryRun,
  [bool]$NoNetwork = $true,
  [switch]$AllowNetwork
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
  Stop-Code "STOP_NETWORK_FORBIDDEN" "Restore helper stays offline in this phase"
}

$pkg = (Resolve-Path $PackageDirectory).Path
$dest = [System.IO.Path]::GetFullPath($RestoreDirectory)
if ($dest.StartsWith($RepoRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
  Stop-Code "STOP_OUTPUT_INSIDE_REPOSITORY" "Restore directory must be outside repository"
}

$result = [ordered]@{
  dry_run = [bool]$DryRun
  no_network = [bool]$NoNetwork
  package = $pkg
  restore_directory = $dest
  staging_forbidden = $true
  production_restore_forbidden = $true
}

if ($DryRun) {
  $result.planned = "Copy package locally and verify sha256 sidecars; no pg_restore against live DBs"
  $result | ConvertTo-Json -Depth 5
  exit 0
}

New-Item -ItemType Directory -Force -Path $dest | Out-Null
$leaf = Split-Path $pkg -Leaf
$target = Join-Path $dest $leaf
if (Test-Path $target) { Remove-Item -Recurse -Force $target }
Copy-Item -Recurse -Force $pkg $target

$manifest = Join-Path $target "manifest.json"
if (-not (Test-Path $manifest)) {
  Stop-Code "STOP_MANIFEST_INCOMPLETE" "manifest.json missing after restore copy"
}

Get-ChildItem -Path $target -Recurse -Filter "*.sha256" | ForEach-Object {
  $side = $_.FullName
  $file = $side.Substring(0, $side.Length - 7)
  if (-not (Test-Path $file)) { Stop-Code "STOP_CHECKSUM_FAILED" "missing file for $($_.Name)" }
  $expected = ((Get-Content $side -Raw).Trim() -split "\s+")[0].ToLower()
  $actual = (Get-FileHash -Algorithm SHA256 -Path $file).Hash.ToLower()
  if ($expected -ne $actual) { Stop-Code "STOP_CHECKSUM_FAILED" "hash mismatch for $file" }
}

$result.ok = $true
$result.restored_path = $target
$result | ConvertTo-Json -Depth 5

