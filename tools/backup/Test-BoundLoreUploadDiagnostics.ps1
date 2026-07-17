# Offline self-test for UploadDiagnostics.ps1 (no network, no Wasabi, no rclone remote).
[CmdletBinding()]
param(
  [switch]$OfflineSelfTest
)

$ErrorActionPreference = "Stop"
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
. (Join-Path $here "_lib\UploadDiagnostics.ps1")

if (-not $OfflineSelfTest) {
  Write-Host "Pass -OfflineSelfTest to run the offline suite."
  exit 2
}

$result = Invoke-UploadDiagnosticsOfflineSelfTest
$payload = [ordered]@{
  failures = [int]$result.Failures
  offline_self_test = @($result.OfflineSelfTest)
}
$payload | ConvertTo-Json -Compress
if ($result.Pass) {
  Write-Host "OFFLINE_SELF_TEST_PASS"
  exit 0
}
Write-Host "OFFLINE_SELF_TEST_FAIL"
exit 1
