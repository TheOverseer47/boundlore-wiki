<#
.SYNOPSIS
  Offline self-test for BL_STORAGE_STOP envelopes and redacted parent diagnostics.
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

# Envelope recognition
$e1 = Resolve-StorageChildFailure -Stdout "" -Stderr "BL_STORAGE_STOP|STOP_STORAGE_CREDENTIAL_MISSING" -ExitCode 1
Assert-True ($e1.Code -eq "STOP_STORAGE_CREDENTIAL_MISSING" -and $e1.SentinelDetected) "envelope-credential"

$e2 = Resolve-StorageChildFailure -Stdout "noise`nBL_STORAGE_STOP|STOP_STORAGE_EXPORT_INCOMPLETE|phase=bucket-list|http=401`nmore" -Stderr "" -ExitCode 1
Assert-True ($e2.Code -eq "STOP_STORAGE_EXPORT_INCOMPLETE" -and $e2.Message -eq "phase=bucket-list http=401") "envelope-http-order"

$e3 = Resolve-StorageChildFailure -Stdout "" -Stderr "BL_STORAGE_STOP|STOP_STORAGE_EXPORT_INCOMPLETE|kind=JSONDecodeError|phase=bucket-list" -ExitCode 1
Assert-True ($e3.Message -eq "phase=bucket-list kind=JSONDecodeError") "envelope-field-order-normalized"

# Reject unknown stop / phase / kind / bucket
$badStop = ConvertFrom-StorageStopEnvelopeLine "BL_STORAGE_STOP|STOP_TOTALLY_FAKE"
Assert-True ($null -eq $badStop) "reject-unknown-stop"
$badPhase = ConvertFrom-StorageStopEnvelopeLine "BL_STORAGE_STOP|STOP_STORAGE_EXPORT_INCOMPLETE|phase=evil-phase"
Assert-True ($null -eq $badPhase) "reject-unknown-phase"
$badKind = ConvertFrom-StorageStopEnvelopeLine "BL_STORAGE_STOP|STOP_STORAGE_EXPORT_INCOMPLETE|kind=EvilKind"
Assert-True ($null -eq $badKind) "reject-unknown-kind"
$badBucket = ConvertFrom-StorageStopEnvelopeLine "BL_STORAGE_STOP|STOP_STORAGE_EXPORT_INCOMPLETE|bucket=not-allowlisted"
Assert-True ($null -eq $badBucket) "reject-unknown-bucket"

# Legacy still works
$leg = Resolve-StorageChildFailure -Stdout "" -Stderr "STOP_UNKNOWN_STORAGE_BUCKET: something" -ExitCode 1
Assert-True ($leg.Code -eq "STOP_UNKNOWN_STORAGE_BUCKET" -and $leg.Message -notmatch "something") "legacy-unknown-bucket-no-name"

# Empty vs unclassified
$empty = Resolve-StorageChildFailure -Stdout "" -Stderr "" -ExitCode 1
Assert-True ($empty.Message -match "no diagnostic output" -and $empty.Message -match "sentinel-detected=false") "empty-streams"

$unc = Resolve-StorageChildFailure -Stdout "traceback nonsense" -Stderr "Authorization: Bearer TEST_TOKEN_NOT_A_REAL_SECRET" -ExitCode 1
Assert-True ($unc.Message -match "redacted unclassified" -and $unc.Message -notmatch "TEST_TOKEN_NOT_A_REAL_SECRET" -and $unc.Message -notmatch "traceback") "unclassified-no-raw"

# NUL / BOM / CRLF normalization around envelope
$bom = [char]0xFEFF + "BL_STORAGE_STOP|STOP_WRONG_PROJECT`r`n"
$nul = ("BL_STORAGE_STOP|STOP_STAGING_TARGET" -replace '', '') + "`0extra"
# Build string with embedded NUL
$withNul = "prefix`0`nBL_STORAGE_STOP|STOP_STAGING_TARGET`n"
$n1 = Resolve-StorageChildFailure -Stdout $bom -Stderr "" -ExitCode 1
Assert-True ($n1.Code -eq "STOP_WRONG_PROJECT") "bom-normalized"
$n2 = Resolve-StorageChildFailure -Stdout $withNul -Stderr "" -ExitCode 1
Assert-True ($n2.Code -eq "STOP_STAGING_TARGET") "nul-normalized"

# Redaction helpers
$dirty = @"
Authorization: Bearer TEST_TOKEN_NOT_A_REAL_SECRET
apikey=TEST_TOKEN_NOT_A_REAL_SECRET
SUPABASE_SERVICE_ROLE_KEY=TEST_TOKEN_NOT_A_REAL_SECRET
eyJhbGciOiTEST.e30.TESTSIGONLY
https://example.invalid/storage/v1/object/avatars/secret/folder/file.bin
D:\BoundLoreBackups\EncryptedArchives\storage\leak\path.bin
"@
$safe = Protect-StorageDiagnosticText $dirty
Assert-True ($safe -notmatch "TEST_TOKEN_NOT_A_REAL_SECRET") "token-redacted"
Assert-True ($safe -match "\[REDACTED_JWT\]" -or $safe -notmatch "eyJhbGciOiTEST") "jwt-redacted"
Assert-True ($safe -notmatch "secret/folder/file") "object-url-redacted"
Assert-True ($safe -notmatch "leak\\path" -and $safe -notmatch "leak/path") "fs-path-redacted"

# Exit 0
$ok = Resolve-StorageChildFailure -Stdout '{"ok":true}' -Stderr "" -ExitCode 0
Assert-True ($ok.Code -eq "NONE") "exit-zero"

# Allowlisted bucket in envelope
$eb = Resolve-StorageChildFailure -Stdout "" -Stderr "BL_STORAGE_STOP|STOP_STORAGE_EXPORT_INCOMPLETE|phase=object-download|http=403|bucket=avatars|kind=HTTPError" -ExitCode 1
Assert-True ($eb.Message -eq "phase=object-download http=403 bucket=avatars kind=HTTPError") "envelope-all-fields"

$failed = @($checks | Where-Object { $_ -like "FAIL*" })
@{ offline_self_test = $checks; failures = (@($failed).Count) } | ConvertTo-Json -Compress
if ((@($failed).Count) -gt 0) { exit 1 }
Write-Host "OFFLINE_SELF_TEST_PASS"
exit 0
