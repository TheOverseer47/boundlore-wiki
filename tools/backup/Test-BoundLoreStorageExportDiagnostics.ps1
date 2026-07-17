<#
.SYNOPSIS
  Offline self-test for redacted storage-export child diagnostics (no network).
#>
[CmdletBinding()]
param([switch]$OfflineSelfTest)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "_lib\StorageExportDiagnostics.ps1")

if (-not $OfflineSelfTest) {
  Write-Host "Use -OfflineSelfTest (no live storage access)."
  exit 2
}

$checks = @()

function Assert-True([bool]$Cond, [string]$Name) {
  if ($Cond) { $script:checks += "PASS $Name" } else { $script:checks += "FAIL $Name" }
}

# 1) Credential missing stop forwarded
$d1 = Resolve-StorageChildFailure -Stdout "" -Stderr "STOP_STORAGE_CREDENTIAL_MISSING: service key env missing" -ExitCode 1
Assert-True ($d1.Code -eq "STOP_STORAGE_CREDENTIAL_MISSING") "credential-stop"

# 2) Unknown bucket forwarded
$d2 = Resolve-StorageChildFailure -Stdout "" -Stderr "STOP_UNKNOWN_STORAGE_BUCKET: unexpected_bucket" -ExitCode 1
Assert-True ($d2.Code -eq "STOP_UNKNOWN_STORAGE_BUCKET") "unknown-bucket-stop"

# 3) Redacted HTTP phase message preserved
$d3 = Resolve-StorageChildFailure -Stdout "" -Stderr "STOP_STORAGE_EXPORT_INCOMPLETE: bucket-list HTTP 401" -ExitCode 1
Assert-True ($d3.Code -eq "STOP_STORAGE_EXPORT_INCOMPLETE" -and $d3.Message -match "bucket-list HTTP 401") "http-401-visible"

# 4–5) Secrets and JWT redacted
$dirty = @"
Authorization: Bearer PLACEHOLDER_NOT_A_REAL_SERVICE_ROLE_VALUE_XYZ
apikey=PLACEHOLDER_NOT_A_REAL_SERVICE_ROLE_VALUE_XYZ
eyJhbGciOiTEST.e30.TESTSIGONLY
STOP_STORAGE_EXPORT_INCOMPLETE: bucket-list HTTP 401
"@
$safe = Protect-StorageDiagnosticText $dirty
Assert-True ($safe -notmatch "PLACEHOLDER_NOT_A_REAL_SERVICE_ROLE_VALUE_XYZ") "service-placeholder-redacted"
Assert-True ($safe -match "\[REDACTED_JWT\]" -or $safe -notmatch "eyJhbGciOiTEST") "jwt-redacted"
Assert-True ($safe -match "Authorization=\[REDACTED\]" -or $safe -match "Bearer \[REDACTED\]") "auth-header-redacted"
Assert-True ($safe -match "apikey=\[REDACTED\]") "apikey-redacted"

# 6) Object paths redacted
$pathBlob = "failed GET https://example.supabase.co/storage/v1/object/avatars/secret/folder/file.png HTTP 403"
$pathSafe = Protect-StorageDiagnosticText $pathBlob
Assert-True ($pathSafe -notmatch "secret/folder/file\.png") "object-path-redacted"

# 7) Unclassified fail-closed
$d7 = Resolve-StorageChildFailure -Stdout "weird" -Stderr "no known code" -ExitCode 1
Assert-True ($d7.Code -eq "STOP_STORAGE_EXPORT_INCOMPLETE" -and $d7.Message -eq "unclassified storage child failure") "unclassified"

# 8) Exit 0 unchanged
$d0 = Resolve-StorageChildFailure -Stdout '{"ok":true}' -Stderr "" -ExitCode 0
Assert-True ($d0.Code -eq "NONE") "exit-zero"

$failed = @($checks | Where-Object { $_ -like "FAIL*" })
@{ offline_self_test = $checks; failures = (@($failed).Count) } | ConvertTo-Json -Compress
if ((@($failed).Count) -gt 0) { exit 1 }
Write-Host "OFFLINE_SELF_TEST_PASS"
exit 0
