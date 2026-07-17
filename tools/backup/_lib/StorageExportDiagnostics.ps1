# Shared redacted storage-export child diagnostics (dot-sourced by live sequence / offline tests).
# Prefer BL_STORAGE_STOP envelopes. Never return raw child text, secrets, paths, or bodies.

$script:StorageStopAllowlist = @(
  "STOP_LIVE_NETWORK_RESERVED",
  "STOP_STORAGE_CREDENTIAL_MISSING",
  "STOP_WRONG_PROJECT",
  "STOP_STAGING_TARGET",
  "STOP_UNKNOWN_STORAGE_BUCKET",
  "STOP_INVENTORY_CHANGED_DURING_EXPORT",
  "STOP_STORAGE_EXPORT_INCOMPLETE"
)
$script:StoragePhaseAllowlist = @(
  "startup",
  "bucket-list",
  "object-list",
  "object-download",
  "inventory-compare",
  "inventory-write",
  "child-exception"
)
$script:StorageKindAllowlist = @(
  "HTTPError",
  "URLError",
  "TimeoutError",
  "SSLError",
  "JSONDecodeError",
  "UnicodeDecodeError",
  "OSError",
  "ValueError",
  "TypeError",
  "RuntimeError"
)
$script:StorageBucketAllowlist = @("avatars", "discovery-uploads", "report-screenshots")

function Protect-StorageDiagnosticText {
  param([AllowNull()][string]$Text)
  if ([string]::IsNullOrEmpty($Text)) { return "" }
  $t = [string]$Text
  $t = [regex]::Replace($t, '(?i)Bearer\s+\S+', 'Bearer [REDACTED]')
  $t = [regex]::Replace($t, '(?i)Authorization\s*[:=]\s*\S+', 'Authorization=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)\bapikey\s*[:=]\s*\S+', 'apikey=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*\S+', 'SUPABASE_SERVICE_ROLE_KEY=[REDACTED]')
  $t = [regex]::Replace($t, 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[REDACTED_JWT]')
  $t = [regex]::Replace(
    $t,
    '(?i)https?://[^\s''"]+/storage/v1/object/(?:list/)?[A-Za-z0-9_-]+/[^\s''"]+',
    '[REDACTED_STORAGE_OBJECT_URL]'
  )
  $t = [regex]::Replace(
    $t,
    '(?i)/storage/v1/object/(?:list/)?[A-Za-z0-9_-]+/[^\s''"]+',
    '/storage/v1/object/[BUCKET]/[OBJECT_PATH_REDACTED]'
  )
  $t = [regex]::Replace($t, '(?i)[A-Za-z]:\\[^\r\n]*\\storage\\[^\r\n]+', '[REDACTED_STORAGE_FS_PATH]')
  return $t.Trim()
}

function Normalize-StorageChildStreams {
  param(
    [AllowNull()][string]$Stdout,
    [AllowNull()][string]$Stderr
  )
  $combined = (($Stdout | Out-String) + "`n" + ($Stderr | Out-String))
  if ($null -eq $combined) { $combined = "" }
  $combined = $combined -replace "`0", ""
  if ($combined.Length -gt 0 -and [int][char]$combined[0] -eq 0xFEFF) {
    $combined = $combined.Substring(1)
  }
  $combined = $combined -replace "`r`n", "`n" -replace "`r", "`n"
  return $combined
}

function ConvertFrom-StorageStopEnvelopeLine {
  param([string]$Line)
  if ([string]::IsNullOrWhiteSpace($Line)) { return $null }
  $trim = $Line.Trim()
  if (-not $trim.StartsWith("BL_STORAGE_STOP|")) { return $null }
  $parts = @($trim -split '\|')
  if ((@($parts).Count) -lt 2) { return $null }
  $code = $parts[1]
  if ($script:StorageStopAllowlist -notcontains $code) { return $null }

  $phase = $null
  $http = $null
  $bucket = $null
  $kind = $null
  for ($i = 2; $i -lt (@($parts).Count); $i++) {
    $seg = $parts[$i]
    if ($seg -match '^phase=([A-Za-z0-9\-]+)$') {
      $cand = $Matches[1]
      if ($script:StoragePhaseAllowlist -contains $cand) { $phase = $cand } else { return $null }
    } elseif ($seg -match '^http=(\d{3})$') {
      $n = [int]$Matches[1]
      if ($n -ge 100 -and $n -le 599) { $http = $n } else { return $null }
    } elseif ($seg -match '^bucket=([A-Za-z0-9\-]+)$') {
      $cand = $Matches[1]
      if ($script:StorageBucketAllowlist -contains $cand) { $bucket = $cand } else { return $null }
    } elseif ($seg -match '^kind=([A-Za-z0-9]+)$') {
      $cand = $Matches[1]
      if ($script:StorageKindAllowlist -contains $cand) { $kind = $cand } else { return $null }
    } else {
      return $null
    }
  }

  $msgParts = @()
  if ($phase) { $msgParts += ("phase=" + $phase) }
  if ($null -ne $http) { $msgParts += ("http=" + $http) }
  if ($bucket) { $msgParts += ("bucket=" + $bucket) }
  if ($kind) { $msgParts += ("kind=" + $kind) }
  $message = if ((@($msgParts).Count) -gt 0) { ($msgParts -join " ") } else { "storage child reported $code" }
  return [pscustomobject]@{ Code = $code; Message = $message; SentinelDetected = $true }
}

function Resolve-StorageChildFailure {
  param(
    [AllowNull()][string]$Stdout,
    [AllowNull()][string]$Stderr,
    [int]$ExitCode
  )
  if ($ExitCode -eq 0) {
    return [pscustomobject]@{ Code = "NONE"; Message = "ok"; SentinelDetected = $false }
  }

  $raw = Normalize-StorageChildStreams -Stdout $Stdout -Stderr $Stderr
  $stdoutBytes = if ($null -eq $Stdout) { 0 } else { [Text.Encoding]::UTF8.GetByteCount([string]$Stdout) }
  $stderrBytes = if ($null -eq $Stderr) { 0 } else { [Text.Encoding]::UTF8.GetByteCount([string]$Stderr) }
  $empty = [string]::IsNullOrWhiteSpace($raw)

  if ($empty) {
    return [pscustomobject]@{
      Code = "STOP_STORAGE_EXPORT_INCOMPLETE"
      Message = ("storage child exited with no diagnostic output exit-code=" + $ExitCode + " stdout-bytes=" + $stdoutBytes + " stderr-bytes=" + $stderrBytes + " sentinel-detected=false")
      SentinelDetected = $false
    }
  }

  $lines = @($raw -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
  foreach ($line in $lines) {
    $env = ConvertFrom-StorageStopEnvelopeLine -Line $line
    if ($null -ne $env) {
      return $env
    }
  }

  # Legacy stopcodes (allowlisted only) — never return free raw text.
  $redacted = Protect-StorageDiagnosticText $raw
  foreach ($code in $script:StorageStopAllowlist) {
    if ($redacted -match [regex]::Escape($code)) {
      $legacyMsg = "storage child reported $code"
      if ($code -eq "STOP_STORAGE_EXPORT_INCOMPLETE") {
        if ($redacted -match 'bucket-list\s+HTTP\s+(\d{3})') {
          $legacyMsg = ("phase=bucket-list http=" + $Matches[1])
        } elseif ($redacted -match 'object-list\s+HTTP\s+(\d{3})') {
          $legacyMsg = ("phase=object-list http=" + $Matches[1])
        } elseif ($redacted -match 'object-download\s+HTTP\s+(\d{3})') {
          $legacyMsg = ("phase=object-download http=" + $Matches[1])
        }
      }
      return [pscustomobject]@{ Code = $code; Message = $legacyMsg; SentinelDetected = $false }
    }
  }

  return [pscustomobject]@{
    Code = "STOP_STORAGE_EXPORT_INCOMPLETE"
    Message = ("redacted unclassified storage child failure exit-code=" + $ExitCode + " stdout-bytes=" + $stdoutBytes + " stderr-bytes=" + $stderrBytes + " sentinel-detected=false")
    SentinelDetected = $false
  }
}
