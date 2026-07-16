<#
.SYNOPSIS
  P5-E.10B-W5-A1-R4-D3 — Production direct-host IPv6 TCP:5432 reachability only.

.DESCRIPTION
  No credentials, no psql, no TLS handshake, no PostgreSQL protocol bytes.
  DNS AAAA Answer records → one TCP connect attempt per address (max 5s), stop on first success.
#>
[CmdletBinding()]
param(
  [switch]$OfflineSelfTest
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ExpectedProductionRef = "ohkoojpzmptdfyowdgog"
$ForbiddenStagingRef = "jzzgoiwfbuwiiyvwgwri"
$ExpectedHost = ("db.{0}.supabase.co" -f $ExpectedProductionRef)
$ExpectedPort = 5432
$ConnectTimeoutMs = 5000

function Write-DiagFail([string]$Class, [int]$AaaaCount, [int]$Attempts) {
  Write-Host "R4_D3_DIAGNOSIS_FAILED"
  Write-Host ("ERROR_CLASS=" + $Class)
  Write-Host ("AAAA_TARGET_COUNT=" + $AaaaCount)
  Write-Host ("TCP_ATTEMPT_COUNT=" + $Attempts)
  Write-Host "TCP_SUCCESS_COUNT=0"
  exit 1
}

function Get-AaaaAnswerAddresses([string]$HostName) {
  $list = New-Object System.Collections.Generic.List[System.Net.IPAddress]
  try {
    $records = @(Resolve-DnsName -Name $HostName -Type AAAA -DnsOnly -ErrorAction Stop)
  } catch {
    return @()
  }
  foreach ($r in $records) {
    $isAnswer = ("$($r.Section)" -eq "Answer")
    $isAaaa = ("$($r.Type)" -eq "AAAA") -or ($r.QueryType -eq 28)
    if (-not ($isAnswer -and $isAaaa)) { continue }
    $ipText = $null
    if ($r.PSObject.Properties.Name -contains "IP6Address" -and $r.IP6Address) {
      $ipText = [string]$r.IP6Address
    } elseif ($r.PSObject.Properties.Name -contains "IPAddress" -and $r.IPAddress) {
      $ipText = [string]$r.IPAddress
    }
    if (-not $ipText) { continue }
    try {
      $ip = [System.Net.IPAddress]::Parse($ipText)
      if ($ip.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetworkV6) { continue }
      if (-not ($list | Where-Object { $_.Equals($ip) })) { [void]$list.Add($ip) }
    } catch { }
  }
  return @($list.ToArray())
}

function Get-AAnswerCount([string]$HostName) {
  try {
    $records = @(Resolve-DnsName -Name $HostName -Type A -DnsOnly -ErrorAction Stop)
  } catch {
    return 0
  }
  $answers = @($records | Where-Object {
      ("$($_.Section)" -eq "Answer") -and (
        ("$($_.Type)" -eq "A") -or ($_.QueryType -eq 1)
      )
    })
  return (@($answers).Count)
}

function Test-LocalIPv6Prereqs {
  $networkAvailable = [System.Net.NetworkInformation.NetworkInterface]::GetIsNetworkAvailable()
  $activeAdapter = $false
  $ipv6Binding = $false
  $ipv6DefaultRoute = $false
  try {
    $up = @(Get-NetIPConfiguration -ErrorAction SilentlyContinue | Where-Object { $_.NetAdapter.Status -eq "Up" })
    if ((@($up).Count) -gt 0) { $activeAdapter = $true }
  } catch { }
  try {
    $binds = @(Get-NetAdapterBinding -ComponentID ms_tcpip6 -ErrorAction SilentlyContinue | Where-Object { $_.Enabled -eq $true })
    if ((@($binds).Count) -gt 0) { $ipv6Binding = $true }
  } catch { }
  try {
    $routes = @(Get-NetRoute -AddressFamily IPv6 -ErrorAction SilentlyContinue | Where-Object {
        $_.DestinationPrefix -eq "::/0" -or $_.DestinationPrefix -eq "0::/0"
      })
    if ((@($routes).Count) -gt 0) { $ipv6DefaultRoute = $true }
  } catch { }
  return [pscustomobject]@{
    NetworkAvailable = [bool]$networkAvailable
    ActiveAdapter = [bool]$activeAdapter
    IPv6Binding = [bool]$ipv6Binding
    IPv6DefaultRoute = [bool]$ipv6DefaultRoute
  }
}

function Test-IPv6TcpConnect {
  param(
    [System.Net.IPAddress]$Address,
    [int]$Port,
    [int]$TimeoutMs
  )
  $socket = $null
  try {
    $socket = New-Object System.Net.Sockets.Socket(
      [System.Net.Sockets.AddressFamily]::InterNetworkV6,
      [System.Net.Sockets.SocketType]::Stream,
      [System.Net.Sockets.ProtocolType]::Tcp
    )
    $endpoint = New-Object System.Net.IPEndPoint($Address, $Port)
    $ar = $socket.BeginConnect($endpoint, $null, $null)
    $signaled = $ar.AsyncWaitHandle.WaitOne($TimeoutMs, $false)
    if (-not $signaled) {
      try { $socket.Close() } catch { }
      return [pscustomobject]@{ Ok = $false; Class = "IPV6_TCP_TIMEOUT" }
    }
    try {
      $socket.EndConnect($ar)
      return [pscustomobject]@{ Ok = $true; Class = "IPV6_TCP_5432_REACHABLE" }
    } catch {
      $sockEx = $_.Exception
      while ($sockEx.InnerException) { $sockEx = $sockEx.InnerException }
      $code = $null
      if ($sockEx -is [System.Net.Sockets.SocketException]) {
        $code = $sockEx.SocketErrorCode
      }
      $class = "IPV6_SOCKET_ERROR"
      if ("$code" -eq "ConnectionRefused" -or "$code" -eq "ConnectionReset") {
        $class = "IPV6_TCP_CONNECTION_REFUSED"
      } elseif ("$code" -eq "NetworkUnreachable" -or "$code" -eq "HostUnreachable" -or "$code" -eq "NoRouteToHost") {
        $class = "IPV6_NETWORK_UNREACHABLE"
      } elseif ("$code" -eq "TimedOut") {
        $class = "IPV6_TCP_TIMEOUT"
      }
      return [pscustomobject]@{ Ok = $false; Class = $class }
    }
  } catch {
    return [pscustomobject]@{ Ok = $false; Class = "IPV6_SOCKET_ERROR" }
  } finally {
    if ($socket) {
      try { if ($socket.Connected) { $socket.Shutdown([System.Net.Sockets.SocketShutdown]::Both) } } catch { }
      try { $socket.Close() } catch { }
      try { $socket.Dispose() } catch { }
    }
  }
}

# --- Offline self-test: no network, no sockets ---
if ($OfflineSelfTest) {
  $checks = @()
  if ($ExpectedHost -match [regex]::Escape($ExpectedProductionRef)) { $checks += "PASS host" } else { $checks += "FAIL host" }
  if ($ExpectedHost -notmatch $ForbiddenStagingRef) { $checks += "PASS staging-absent" } else { $checks += "FAIL staging" }
  if ($ExpectedPort -eq 5432) { $checks += "PASS port" } else { $checks += "FAIL port" }
  if ($ConnectTimeoutMs -le 5000) { $checks += "PASS timeout" } else { $checks += "FAIL timeout" }
  if ($ConnectTimeoutMs -gt 0) { $checks += "PASS timeout-positive" } else { $checks += "FAIL timeout-positive" }
  $failed = @($checks | Where-Object { $_ -like "FAIL*" })
  @{ offline_self_test = $checks; failures = (@($failed).Count) } | ConvertTo-Json -Compress
  if ((@($failed).Count) -gt 0) { exit 1 }
  Write-Host "OFFLINE_SELF_TEST_PASS"
  exit 0
}

# --- Live path (one bounded diagnosis) ---
if ($ExpectedHost -match $ForbiddenStagingRef) {
  Write-DiagFail "UNKNOWN_IPV6_TCP_RESULT" 0 0
}
if ($ExpectedHost -notmatch [regex]::Escape($ExpectedProductionRef)) {
  Write-DiagFail "UNKNOWN_IPV6_TCP_RESULT" 0 0
}

Write-Host "DIAG_HOST_CLASS=production-direct"

$aCount = Get-AAnswerCount -HostName $ExpectedHost
$targets = @(Get-AaaaAnswerAddresses -HostName $ExpectedHost)
$aaaaCount = (@($targets).Count)

if ($aCount -eq 0 -and $aaaaCount -ge 1) {
  Write-Host "DIAG_DNS_CLASS=aaaa-only"
} elseif ($aaaaCount -ge 1) {
  Write-Host "DIAG_DNS_CLASS=aaaa-present"
} else {
  Write-DiagFail "AAAA_RESOLUTION_CHANGED" 0 0
}

$prereq = Test-LocalIPv6Prereqs
if (-not $prereq.IPv6Binding) {
  Write-DiagFail "IPV6_BINDING_DISABLED" $aaaaCount 0
}
Write-Host "IPV6_BINDING_PASS"
if (-not $prereq.IPv6DefaultRoute) {
  Write-DiagFail "IPV6_DEFAULT_ROUTE_MISSING" $aaaaCount 0
}
Write-Host "IPV6_ROUTE_PASS"
if (-not $prereq.NetworkAvailable -or -not $prereq.ActiveAdapter) {
  Write-DiagFail "IPV6_NETWORK_UNREACHABLE" $aaaaCount 0
}

$attempts = 0
$successes = 0
$lastFailClass = "UNKNOWN_IPV6_TCP_RESULT"
foreach ($addr in $targets) {
  $attempts++
  $result = Test-IPv6TcpConnect -Address $addr -Port $ExpectedPort -TimeoutMs $ConnectTimeoutMs
  if ($result.Ok) {
    $successes++
    Write-Host "PRODUCTION_TCP_5432_REACHABLE"
    Write-Host ("AAAA_TARGET_COUNT=" + $aaaaCount)
    Write-Host ("TCP_ATTEMPT_COUNT=" + $attempts)
    Write-Host ("TCP_SUCCESS_COUNT=" + $successes)
    Write-Host "R4_D3_DIAGNOSIS_PASS"
    exit 0
  }
  $lastFailClass = $result.Class
  # continue remaining AAAA targets only if prior failed; no retry of same address
}

Write-DiagFail $lastFailClass $aaaaCount $attempts
