<#
.SYNOPSIS
  P5-E.10B-W5-A1-R4-D4 — Production Session Pooler release_gate diagnosis only.

.DESCRIPTION
  Official Shared Pooler / Session mode on port 5432. No direct host, no transaction
  pooler (6543), no dump/storage/object-store. Password via SecureString → child-only PGPASSWORD.
#>
[CmdletBinding()]
param(
  [switch]$OfflineSelfTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedProductionRef = "ohkoojpzmptdfyowdgog"
$ForbiddenStagingRef = "jzzgoiwfbuwiiyvwgwri"
$ExpectedUser = ("postgres.{0}" -f $ExpectedProductionRef)
$ExpectedPort = "5432"
$ForbiddenPort = "6543"
$ExpectedDatabase = "postgres"
$ForbiddenDirectHost = ("db.{0}.supabase.co" -f $ExpectedProductionRef)
$PoolerSuffix = ".pooler.supabase.com"
$AllowedSql = "SELECT id, contribution_locked FROM public.release_gate WHERE id = 1;"

function Write-DiagFail([string]$Class, [int]$ExitCode) {
  Write-Host "R4_D4_DIAGNOSIS_FAILED"
  Write-Host ("ERROR_CLASS=" + $Class)
  Write-Host ("PSQL_EXIT_CODE=" + $ExitCode)
  exit 1
}

function ConvertFrom-SecureStringPlain([Security.SecureString]$Secure) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Test-SessionPoolerHost([string]$HostRaw) {
  if ([string]::IsNullOrWhiteSpace($HostRaw)) { return "SESSION_POOLER_HOST_INVALID" }
  if ($HostRaw -match "`r|`n") { return "SESSION_POOLER_HOST_INVALID" }
  $h = $HostRaw.Trim().ToLowerInvariant()
  if ($h -match "://" -or $h -match "@" -or $h -match "/" -or $h -match "\\") { return "SESSION_POOLER_HOST_INVALID" }
  if ($h -match "postgres(ql)?://") { return "SESSION_POOLER_HOST_INVALID" }
  if ($h -match ":") { return "SESSION_POOLER_HOST_INVALID" } # port in host rejected
  if ($h -eq $ForbiddenDirectHost) { return "SESSION_POOLER_HOST_INVALID" }
  if ($h -match [regex]::Escape($ForbiddenStagingRef)) { return "SESSION_POOLER_HOST_INVALID" }
  # Shared Session Pooler host is region-based (*.pooler.supabase.com); project identity is in the user.
  if (-not $h.EndsWith($PoolerSuffix)) { return "SESSION_POOLER_HOST_INVALID" }
  if ($h -eq $PoolerSuffix.TrimStart(".") -or $h.Length -le $PoolerSuffix.Length) { return "SESSION_POOLER_HOST_INVALID" }
  if ($h -match "\s") { return "SESSION_POOLER_HOST_INVALID" }
  return "OK"
}

function Test-SessionPoolerUser([string]$UserRaw) {
  if ([string]::IsNullOrWhiteSpace($UserRaw)) { return "SESSION_POOLER_USER_INVALID" }
  if ($UserRaw -match "`r|`n") { return "SESSION_POOLER_USER_INVALID" }
  $u = $UserRaw.Trim()
  if ($u -ne $ExpectedUser) { return "SESSION_POOLER_USER_INVALID" }
  if ($u -eq "postgres") { return "SESSION_POOLER_USER_INVALID" }
  if ($u -match [regex]::Escape($ForbiddenStagingRef)) { return "SESSION_POOLER_USER_INVALID" }
  return "OK"
}

function Test-ReleaseGateOutput([string]$StdOut) {
  $lines = @($StdOut -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ((@($lines).Count) -ne 1) { return $false }
  $line = $lines[0]
  return ($line -match '^1\|t$' -or $line -match '^1\|true$' -or $line -match '^1,t$' -or $line -match '^1,true$')
}

function Classify-PsqlError([string]$StdErr, [int]$ExitCode) {
  $e = ($StdErr | Out-String)
  if ($ExitCode -eq 0) { return "NONE" }
  if ($e -match "(?i)password authentication failed|fe_sendauth|28P01") { return "DB_PASSWORD_REJECTED" }
  if ($e -match "(?i)could not translate host name|getaddrinfo|name or service not known|No such host|unbekannt") { return "SESSION_POOLER_DNS_FAILED" }
  if ($e -match "(?i)timeout expired|Connection timed out|timed out") { return "SESSION_POOLER_CONNECTION_TIMEOUT" }
  if ($e -match "(?i)Connection refused") { return "SESSION_POOLER_CONNECTION_REFUSED" }
  if ($e -match "(?i)SSL|certificate|tls") { return "SESSION_POOLER_SSL_FAILED" }
  if ($e -match "(?i)Tenant or user not found|Tenant not found|Project not found") { return "SESSION_POOLER_ROUTE_OR_TENANT_NOT_FOUND" }
  if ($e -match "(?i)MaxClients|too many clients|queue|pool") { return "SESSION_POOLER_CAPACITY_OR_QUEUE_TIMEOUT" }
  if ($e -match "(?i)database .* does not exist|3D000") { return "DATABASE_NOT_FOUND" }
  if ($e -match "(?i)role .* does not exist|28000") { return "DATABASE_USER_REJECTED" }
  if ($e -match "(?i)relation .* does not exist|42P01") { return "RELEASE_GATE_RELATION_NOT_FOUND" }
  if ($e -match "(?i)permission denied|42501") { return "RELEASE_GATE_PERMISSION_DENIED" }
  if ($e -match "(?i)syntax error|invalid command|unrecognized") { return "PSQL_ARGUMENT_OR_QUOTING_ERROR" }
  return "UNKNOWN_SESSION_POOLER_ERROR"
}

function Invoke-SessionPoolerGateQuery {
  param(
    [string]$PsqlPath,
    [string]$HostName,
    [string]$UserName,
    [string]$Password
  )
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = $PsqlPath
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  if ($psi.EnvironmentVariables.ContainsKey("PGPASSWORD")) { [void]$psi.EnvironmentVariables.Remove("PGPASSWORD") }
  $psi.EnvironmentVariables["PGPASSWORD"] = $Password
  $psi.EnvironmentVariables["PGSSLMODE"] = "require"
  $psi.EnvironmentVariables["PGCONNECT_TIMEOUT"] = "15"
  $psi.EnvironmentVariables["PGOPTIONS"] = "-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=5000"
  $psi.EnvironmentVariables["PGGSSENCMODE"] = "disable"

  $argList = @(
    "-X",
    "--no-psqlrc",
    "-h", $HostName,
    "-p", $ExpectedPort,
    "-U", $UserName,
    "-d", $ExpectedDatabase,
    "--set", "ON_ERROR_STOP=1",
    "--tuples-only",
    "--no-align",
    "-c", $AllowedSql
  )
  $quoted = foreach ($a in $argList) {
    if ($a -match '[\s"]') { '"' + ($a -replace '"', '\"') + '"' } else { $a }
  }
  $psi.Arguments = ($quoted -join " ")

  $p = New-Object Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  return [pscustomobject]@{ ExitCode = $p.ExitCode; StdOut = $stdout; StdErr = $stderr }
}

# --- Offline self-test ---
if ($OfflineSelfTest) {
  $checks = @()
  $regionHost = ("aws-0-eu-central-1" + $PoolerSuffix)
  if ((Test-SessionPoolerHost $regionHost) -eq "OK") { $checks += "PASS region-pooler-host" } else { $checks += "FAIL region-pooler-host" }
  if ((Test-SessionPoolerHost $ForbiddenDirectHost) -eq "SESSION_POOLER_HOST_INVALID") { $checks += "PASS block-direct" } else { $checks += "FAIL block-direct" }
  if ((Test-SessionPoolerHost "postgres://evil.example") -eq "SESSION_POOLER_HOST_INVALID") { $checks += "PASS block-uri" } else { $checks += "FAIL block-uri" }
  if ((Test-SessionPoolerHost "https://evil.example") -eq "SESSION_POOLER_HOST_INVALID") { $checks += "PASS block-https" } else { $checks += "FAIL block-https" }
  if ((Test-SessionPoolerHost ("aws-0-eu-central-1.pooler.supabase.com:6543")) -eq "SESSION_POOLER_HOST_INVALID") { $checks += "PASS block-port-in-host" } else { $checks += "FAIL block-port-in-host" }
  if ((Test-SessionPoolerHost ("x." + $ForbiddenStagingRef + $PoolerSuffix)) -eq "SESSION_POOLER_HOST_INVALID") { $checks += "PASS block-staging-host" } else { $checks += "FAIL block-staging-host" }
  if ((Test-SessionPoolerHost "evil.example.com") -eq "SESSION_POOLER_HOST_INVALID") { $checks += "PASS block-foreign-domain" } else { $checks += "FAIL block-foreign-domain" }
  if ((Test-SessionPoolerUser $ExpectedUser) -eq "OK") { $checks += "PASS user" } else { $checks += "FAIL user" }
  if ((Test-SessionPoolerUser "postgres") -eq "SESSION_POOLER_USER_INVALID") { $checks += "PASS block-plain-postgres" } else { $checks += "FAIL block-plain-postgres" }
  if ((Test-SessionPoolerUser ("postgres." + $ForbiddenStagingRef)) -eq "SESSION_POOLER_USER_INVALID") { $checks += "PASS block-staging-user" } else { $checks += "FAIL block-staging-user" }
  if ($ExpectedPort -eq "5432" -and $ForbiddenPort -eq "6543") { $checks += "PASS ports" } else { $checks += "FAIL ports" }
  if (Test-ReleaseGateOutput "1|t`n") { $checks += "PASS 1|t" } else { $checks += "FAIL 1|t" }
  if (Test-ReleaseGateOutput "1|true`n") { $checks += "PASS 1|true" } else { $checks += "FAIL 1|true" }
  if (-not (Test-ReleaseGateOutput "1|f`n")) { $checks += "PASS reject-f" } else { $checks += "FAIL reject-f" }
  if (-not (Test-ReleaseGateOutput "")) { $checks += "PASS reject-empty" } else { $checks += "FAIL reject-empty" }
  if (-not (Test-ReleaseGateOutput "1|t`n1|t`n")) { $checks += "PASS reject-multi" } else { $checks += "FAIL reject-multi" }
  if ((Classify-PsqlError "password authentication failed" 2) -eq "DB_PASSWORD_REJECTED") { $checks += "PASS class-pw" } else { $checks += "FAIL class-pw" }
  $failed = @($checks | Where-Object { $_ -like "FAIL*" })
  @{ offline_self_test = $checks; failures = (@($failed).Count) } | ConvertTo-Json -Compress
  if ((@($failed).Count) -gt 0) { exit 1 }
  Write-Host "OFFLINE_SELF_TEST_PASS"
  exit 0
}

# --- Live diagnosis (manual) ---
$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) { Write-DiagFail "PSQL_NOT_FOUND" -1 }
$psql = $psqlCmd.Source

Write-Host "Enter Production Session Pooler host (hostname only, no URL/password):"
$hostIn = Read-Host
$hostCheck = Test-SessionPoolerHost $hostIn
if ($hostCheck -ne "OK") { Write-DiagFail $hostCheck -1 }
$poolerHost = $hostIn.Trim().ToLowerInvariant()

Write-Host "Enter Production Session Pooler user (exact postgres.<project-ref>):"
$userIn = Read-Host
$userCheck = Test-SessionPoolerUser $userIn
if ($userCheck -ne "OK") { Write-DiagFail $userCheck -1 }
$poolerUser = $userIn.Trim()

Write-Host "SESSION_POOLER_IDENTITY_PASS"

Write-Host "Enter Production DB password (hidden; not stored):"
$sec = Read-Host -AsSecureString
$plain = $null
$result = $null
try {
  $plain = ConvertFrom-SecureStringPlain $sec
  $result = Invoke-SessionPoolerGateQuery -PsqlPath $psql -HostName $poolerHost -UserName $poolerUser -Password $plain
} finally {
  $plain = $null
  if ($sec) { $sec.Dispose() }
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

if ($null -eq $result) { Write-DiagFail "UNKNOWN_SESSION_POOLER_ERROR" -1 }

if ($result.ExitCode -ne 0) {
  Write-DiagFail (Classify-PsqlError $result.StdErr $result.ExitCode) $result.ExitCode
}

if (-not (Test-ReleaseGateOutput $result.StdOut)) {
  Write-DiagFail "RELEASE_GATE_RESULT_INVALID" $result.ExitCode
}

Write-Host "PRODUCTION_DB_CONNECTION_PASS"
Write-Host "RELEASE_GATE_LOCKED_PASS"
Write-Host "R4_D4_DIAGNOSIS_PASS"
exit 0
