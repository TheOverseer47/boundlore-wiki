# Shared redacted storage-export child diagnostics (dot-sourced by live sequence / offline tests).
# Never log service-role keys, Authorization/apikey headers, JWTs, or storage object paths.

function Protect-StorageDiagnosticText {
  param([AllowNull()][string]$Text)
  if ([string]::IsNullOrEmpty($Text)) { return "" }
  $t = [string]$Text
  $t = [regex]::Replace($t, '(?i)Bearer\s+\S+', 'Bearer [REDACTED]')
  $t = [regex]::Replace($t, '(?i)Authorization\s*[:=]\s*\S+', 'Authorization=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)\bapikey\s*[:=]\s*\S+', 'apikey=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*\S+', 'SUPABASE_SERVICE_ROLE_KEY=[REDACTED]')
  $t = [regex]::Replace($t, 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[REDACTED_JWT]')
  # Strip storage object URL path segments after bucket (keep phase/status elsewhere).
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
  # Drop obvious absolute paths that embed object-like segments under /storage/
  $t = [regex]::Replace($t, '(?i)[A-Za-z]:\\[^\r\n]*\\storage\\[^\r\n]+', '[REDACTED_STORAGE_FS_PATH]')
  return $t.Trim()
}

function Resolve-StorageChildFailure {
  param(
    [AllowNull()][string]$Stdout,
    [AllowNull()][string]$Stderr,
    [int]$ExitCode
  )
  if ($ExitCode -eq 0) {
    return [pscustomobject]@{ Code = "NONE"; Message = "ok" }
  }
  $blob = Protect-StorageDiagnosticText ((($Stdout | Out-String) + "`n" + ($Stderr | Out-String)).Trim())
  $known = @(
    "STOP_STORAGE_CREDENTIAL_MISSING",
    "STOP_WRONG_PROJECT",
    "STOP_STAGING_TARGET",
    "STOP_UNKNOWN_STORAGE_BUCKET",
    "STOP_INVENTORY_CHANGED_DURING_EXPORT",
    "STOP_STORAGE_EXPORT_INCOMPLETE",
    "STOP_LIVE_NETWORK_RESERVED"
  )
  foreach ($code in $known) {
    if ($blob -match [regex]::Escape($code)) {
      $line = @($blob -split "`r?`n" | Where-Object { $_ -match [regex]::Escape($code) } | Select-Object -First 1)
      if ((@($line).Count) -lt 1 -or [string]::IsNullOrWhiteSpace($line[0])) {
        return [pscustomobject]@{ Code = $code; Message = ("storage child reported " + $code) }
      }
      $safe = Protect-StorageDiagnosticText $line[0]
      if ($safe -match ("^" + [regex]::Escape($code) + ":\s*(.+)$")) {
        return [pscustomobject]@{ Code = $code; Message = $Matches[1].Trim() }
      }
      if ($safe -match [regex]::Escape($code)) {
        return [pscustomobject]@{ Code = $code; Message = ("storage child reported " + $code) }
      }
    }
  }
  return [pscustomobject]@{
    Code = "STOP_STORAGE_EXPORT_INCOMPLETE"
    Message = "unclassified storage child failure"
  }
}
