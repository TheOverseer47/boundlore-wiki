<#
.SYNOPSIS
  P5-E.10B-W5-A1-R4 — Production release_gate diagnosis (D1) and DNS classification (D2).

.DESCRIPTION
  Fixed production direct host. DNS: A or AAAA Answer records = success; AAAA-only is
  DIRECT_HOST_IPV6_ONLY (not DNS failure). -DnsOnly skips password/psql.
  D1: single SELECT against public.release_gate with SecureString child-only PGPASSWORD.
#>
[CmdletBinding()]
param(
  [switch]$OfflineSelfTest,
  [switch]$DnsOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedProductionRef = "ohkoojpzmptdfyowdgog"
$ForbiddenStagingRef = "jzzgoiwfbuwiiyvwgwri"
$ExpectedHost = ("db.{0}.supabase.co" -f $ExpectedProductionRef)
$ExpectedPort = "5432"
$ExpectedDatabase = "postgres"
$ExpectedUser = "postgres"
$AllowedSql = "SELECT id, contribution_locked FROM public.release_gate WHERE id = 1;"

function Write-DiagFail([string]$Class, [int]$ExitCode) {
  Write-Host "R4_D1_DIAGNOSIS_FAILED"
  Write-Host ("ERROR_CLASS=" + $Class)
  Write-Host ("PSQL_EXIT_CODE=" + $ExitCode)
  exit 1
}

function ConvertFrom-SecureStringPlain([Security.SecureString]$Secure) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Normalize-DnsHost([string]$HostName) {
  if ([string]::IsNullOrWhiteSpace($HostName)) {
    throw "DNS_HOST_EMPTY"
  }
  return $HostName.Trim().TrimEnd(".")
}

function Get-DnsAnswerCount {
  param(
    [string]$HostName,
    [ValidateSet("A", "AAAA")]
    [string]$Type
  )
  try {
    $records = @(Resolve-DnsName -Name $HostName -Type $Type -DnsOnly -ErrorAction Stop)
  } catch {
    return 0
  }
  $answers = @($records | Where-Object {
      ("$($_.Section)" -eq "Answer") -and (
        ("$($_.Type)" -eq $Type) -or
        ($Type -eq "A" -and $_.QueryType -eq 1) -or
        ($Type -eq "AAAA" -and $_.QueryType -eq 28)
      )
    })
  return (@($answers).Count)
}

function Test-ProductionDirectHostDns {
  param([string]$HostName)
  $normalized = Normalize-DnsHost $HostName
  if ($normalized -match $ForbiddenStagingRef) {
    return [pscustomobject]@{
      Status = "BLOCKED_STAGING"
      Class = "STOP_STAGING_TARGET"
      ACount = 0
      AaaaCount = 0
      SystemNetDnsOk = $false
    }
  }
  if ($normalized -notmatch [regex]::Escape($ExpectedProductionRef)) {
    return [pscustomobject]@{
      Status = "BLOCKED_REF"
      Class = "STOP_WRONG_PROJECT"
      ACount = 0
      AaaaCount = 0
      SystemNetDnsOk = $false
    }
  }

  $aCount = Get-DnsAnswerCount -HostName $normalized -Type A
  $aaaaCount = Get-DnsAnswerCount -HostName $normalized -Type AAAA

  $sysOk = $false
  try {
    $addrs = @([System.Net.Dns]::GetHostAddresses($normalized))
    if ((@($addrs).Count) -gt 0) { $sysOk = $true }
  } catch {
    $sysOk = $false
  }

  if ($aCount -gt 0 -and $aaaaCount -gt 0) {
    $class = "DIRECT_HOST_DNS_A_AND_AAAA"
    $status = "PASS"
  } elseif ($aCount -gt 0) {
    $class = "DIRECT_HOST_DNS_A_ONLY"
    $status = "PASS"
  } elseif ($aaaaCount -gt 0) {
    $class = "DIRECT_HOST_IPV6_ONLY"
    $status = "PASS"
  } else {
    $class = "DNS_RESOLUTION_FAILED"
    $status = "FAIL"
  }

  return [pscustomobject]@{
    Status = $status
    Class = $class
    ACount = $aCount
    AaaaCount = $aaaaCount
    SystemNetDnsOk = $sysOk
    Host = $normalized
  }
}

function Classify-PsqlError([string]$StdErr, [int]$ExitCode) {
  $e = ($StdErr | Out-String)
  if ($ExitCode -eq 0) { return "NONE" }
  if ($e -match "(?i)password authentication failed|fe_sendauth|28P01") { return "DB_PASSWORD_REJECTED" }
  if ($e -match "(?i)could not translate host name|getaddrinfo|name or service not known|No such host|unbekannt") { return "DNS_RESOLUTION_FAILED" }
  if ($e -match "(?i)Network is unreachable|No route to host") { return "IPV6_CONNECTIVITY_UNAVAILABLE" }
  if ($e -match "(?i)timeout expired|Connection timed out|timed out") { return "TCP_CONNECTION_TIMEOUT" }
  if ($e -match "(?i)Connection refused|could not connect to server|server closed the connection") { return "DIRECT_HOST_UNREACHABLE" }
  if ($e -match "(?i)SSL|certificate|tls") { return "SSL_CONNECTION_FAILED" }
  if ($e -match "(?i)database .* does not exist|3D000") { return "DATABASE_NOT_FOUND" }
  if ($e -match "(?i)role .* does not exist|28000") { return "DATABASE_USER_REJECTED" }
  if ($e -match "(?i)relation .* does not exist|42P01") { return "RELEASE_GATE_RELATION_NOT_FOUND" }
  if ($e -match "(?i)permission denied|42501") { return "RELEASE_GATE_PERMISSION_DENIED" }
  if ($e -match "(?i)syntax error|invalid command|unrecognized") { return "PSQL_ARGUMENT_OR_QUOTING_ERROR" }
  return "UNKNOWN_DATABASE_CONNECTION_ERROR"
}

function Test-ReleaseGateOutput([string]$StdOut) {
  $lines = @($StdOut -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  if ((@($lines).Count) -ne 1) { return $false }
  $line = $lines[0]
  if ($line -match '^1\|t$' -or $line -match '^1\|true$' -or $line -match '^1,t$' -or $line -match '^1,true$') {
    return $true
  }
  return $false
}

function Invoke-ReadOnlyGateQuery {
  param(
    [string]$PsqlPath,
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
  $psi.EnvironmentVariables["PGCONNECT_TIMEOUT"] = "10"
  $psi.EnvironmentVariables["PGOPTIONS"] = "-c default_transaction_read_only=on -c statement_timeout=15000 -c lock_timeout=5000"

  $argList = @(
    "-X",
    "--no-psqlrc",
    "-h", $ExpectedHost,
    "-p", $ExpectedPort,
    "-U", $ExpectedUser,
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

function Get-DnsClassFromCounts([int]$ACount, [int]$AaaaCount) {
  if ($ACount -gt 0 -and $AaaaCount -gt 0) { return "DIRECT_HOST_DNS_A_AND_AAAA" }
  if ($ACount -gt 0) { return "DIRECT_HOST_DNS_A_ONLY" }
  if ($AaaaCount -gt 0) { return "DIRECT_HOST_IPV6_ONLY" }
  return "DNS_RESOLUTION_FAILED"
}

# --- Offline self-test (no network, no password) ---
if ($OfflineSelfTest) {
  $checks = @()
  if ($ExpectedHost -match [regex]::Escape($ExpectedProductionRef)) { $checks += "PASS host" } else { $checks += "FAIL host" }
  if ($ExpectedHost -notmatch $ForbiddenStagingRef) { $checks += "PASS staging-absent" } else { $checks += "FAIL staging" }
  if ((Normalize-DnsHost "  x.example.com. ") -eq "x.example.com") { $checks += "PASS normalize" } else { $checks += "FAIL normalize" }
  try { [void](Normalize-DnsHost "   "); $checks += "FAIL empty-host" } catch { $checks += "PASS empty-host" }
  if ((Get-DnsClassFromCounts 1 0) -eq "DIRECT_HOST_DNS_A_ONLY") { $checks += "PASS a-only" } else { $checks += "FAIL a-only" }
  if ((Get-DnsClassFromCounts 0 1) -eq "DIRECT_HOST_IPV6_ONLY") { $checks += "PASS aaaa-only" } else { $checks += "FAIL aaaa-only" }
  if ((Get-DnsClassFromCounts 1 1) -eq "DIRECT_HOST_DNS_A_AND_AAAA") { $checks += "PASS both" } else { $checks += "FAIL both" }
  if ((Get-DnsClassFromCounts 0 0) -eq "DNS_RESOLUTION_FAILED") { $checks += "PASS neither" } else { $checks += "FAIL neither" }
  if (Test-ReleaseGateOutput "1|t`n") { $checks += "PASS 1|t" } else { $checks += "FAIL 1|t" }
  if (Test-ReleaseGateOutput "1|true`n") { $checks += "PASS 1|true" } else { $checks += "FAIL 1|true" }
  if (-not (Test-ReleaseGateOutput "1|f`n")) { $checks += "PASS reject-f" } else { $checks += "FAIL reject-f" }
  if (-not (Test-ReleaseGateOutput "")) { $checks += "PASS reject-empty" } else { $checks += "FAIL reject-empty" }
  if (-not (Test-ReleaseGateOutput "1|t`n1|t`n")) { $checks += "PASS reject-multi" } else { $checks += "FAIL reject-multi" }
  if ((Classify-PsqlError "password authentication failed for user" 2) -eq "DB_PASSWORD_REJECTED") { $checks += "PASS class-pw" } else { $checks += "FAIL class-pw" }
  if ((Classify-PsqlError "could not translate host name" 2) -eq "DNS_RESOLUTION_FAILED") { $checks += "PASS class-dns" } else { $checks += "FAIL class-dns" }
  $failed = @($checks | Where-Object { $_ -like "FAIL*" })
  @{ offline_self_test = $checks; failures = (@($failed).Count); validation_status = $(if ((@($failed).Count) -eq 0) { "PASS" } else { "FAIL" }) } | ConvertTo-Json -Compress
  if ((@($failed).Count) -gt 0) { exit 1 }
  Write-Host "OFFLINE_SELF_TEST_PASS"
  exit 0
}

# --- DNS-only path (R4-D2; no password, no psql) ---
if ($DnsOnly) {
  Write-Host "DIAG_HOST_CLASS=production-direct"
  Write-Host "DIAG_REF_CONFIRMED=true"
  Write-Host "DNS_ONLY_MODE=true"
  $dns = Test-ProductionDirectHostDns -HostName $ExpectedHost
  Write-Host ("DNS_A_ANSWER_COUNT=" + $dns.ACount)
  Write-Host ("DNS_AAAA_ANSWER_COUNT=" + $dns.AaaaCount)
  Write-Host ("SYSTEM_NET_DNS_OK=" + $dns.SystemNetDnsOk)
  Write-Host ("DNS_CLASS=" + $dns.Class)
  if ($dns.Status -ne "PASS") {
    Write-Host "R4_D2_DNS_DIAGNOSIS_FAILED"
    exit 1
  }
  Write-Host "DNS_RESOLUTION_PASS"
  if ($dns.Class -eq "DIRECT_HOST_IPV6_ONLY") {
    Write-Host "DIRECT_HOST_IPV6_ONLY"
  }
  if (-not $dns.SystemNetDnsOk) {
    Write-Host "DNS_RESOLVER_INCONSISTENT=true"
  }
  Write-Host "R4_D2_DNS_DIAGNOSIS_PASS"
  exit 0
}

# --- Live diagnosis path (D1) ---
if ($ExpectedHost -match $ForbiddenStagingRef) {
  Write-DiagFail "UNKNOWN_DATABASE_CONNECTION_ERROR" -1
}
Write-Host ("DIAG_HOST_CLASS=production-direct")
Write-Host ("DIAG_REF_CONFIRMED=true")

$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
  Write-DiagFail "PSQL_NOT_FOUND" -1
}
$psql = $psqlCmd.Source

# DNS: A or AAAA Answer records = success. Do not treat System.Net.Dns-only failure as DNS failure when Resolve-DnsName has answers.
$dns = Test-ProductionDirectHostDns -HostName $ExpectedHost
Write-Host ("DNS_CLASS=" + $dns.Class)
if ($dns.Status -ne "PASS") {
  Write-DiagFail "DNS_RESOLUTION_FAILED" -1
}
Write-Host "DNS_RESOLUTION_PASS"
if ($dns.Class -eq "DIRECT_HOST_IPV6_ONLY") {
  Write-Host "DIRECT_HOST_IPV6_ONLY"
}
if (-not $dns.SystemNetDnsOk) {
  Write-Host "DNS_RESOLVER_INCONSISTENT=true"
}

Write-Host "Enter Production DB password (hidden; not stored):"
$sec = Read-Host -AsSecureString
$plain = $null
$result = $null
try {
  $plain = ConvertFrom-SecureStringPlain $sec
  $result = Invoke-ReadOnlyGateQuery -PsqlPath $psql -Password $plain
} finally {
  $plain = $null
  if ($sec) { $sec.Dispose() }
  Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

if ($null -eq $result) {
  Write-DiagFail "UNKNOWN_DATABASE_CONNECTION_ERROR" -1
}

if ($result.ExitCode -ne 0) {
  $cls = Classify-PsqlError $result.StdErr $result.ExitCode
  Write-DiagFail $cls $result.ExitCode
}

if (-not (Test-ReleaseGateOutput $result.StdOut)) {
  Write-DiagFail "RELEASE_GATE_RESULT_INVALID" $result.ExitCode
}

Write-Host "PRODUCTION_DB_CONNECTION_PASS"
Write-Host "RELEASE_GATE_LOCKED_PASS"
Write-Host "R4_D1_DIAGNOSIS_PASS"
exit 0
