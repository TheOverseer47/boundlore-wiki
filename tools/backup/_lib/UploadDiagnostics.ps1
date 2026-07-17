# Shared redacted Wasabi/rclone upload diagnostics (dot-sourced by live sequence / offline tests).
# Prefer BL_UPLOAD_STOP envelopes. Never return raw child text, secrets, paths, buckets, or bodies.

$script:UploadStopAllowlist = @(
  "STOP_UPLOAD_CREDENTIAL_MISSING",
  "STOP_UPLOAD_CREDENTIAL_REJECTED",
  "STOP_UPLOAD_CONFIG_INVALID",
  "STOP_UPLOAD_ENDPOINT_MISMATCH",
  "STOP_UPLOAD_REGION_MISMATCH",
  "STOP_UPLOAD_BUCKET_MISMATCH",
  "STOP_UPLOAD_SCOPE_MISMATCH",
  "STOP_UPLOAD_SOURCE_INVALID",
  "STOP_UPLOAD_SOURCE_NOT_ENCRYPTED",
  "STOP_UPLOAD_PERMISSION_DENIED",
  "STOP_UPLOAD_BUCKET_CHECK_DENIED",
  "STOP_UPLOAD_MULTIPART_DENIED",
  "STOP_UPLOAD_TRANSFER_FAILED",
  "STOP_UPLOAD_REMOTE_VERIFY_DENIED",
  "STOP_UPLOAD_REMOTE_VERIFY_FAILED",
  "STOP_UPLOAD_NETWORK_FAILED",
  "STOP_UPLOAD_TLS_FAILED",
  "STOP_UPLOAD_TIMEOUT",
  "STOP_UPLOAD_PROCESS_FAILED",
  "STOP_UPLOAD_DIAGNOSTIC_UNCLASSIFIED",
  "STOP_UPLOAD_CONFIG_CLEANUP_FAILED"
)

$script:UploadPhaseAllowlist = @(
  "preflight",
  "credential-read",
  "credential-bind",
  "config-create",
  "config-validate",
  "source-select",
  "source-validate",
  "target-build",
  "scope-validate",
  "bucket-location",
  "bucket-check",
  "object-upload",
  "multipart-init",
  "multipart-part",
  "multipart-complete",
  "multipart-abort",
  "remote-size-verify",
  "remote-list-verify",
  "config-cleanup",
  "process-cleanup",
  "child-exception"
)

$script:UploadKindAllowlist = @(
  "AccessDenied",
  "InvalidCredential",
  "SignatureMismatch",
  "NoSuchBucket",
  "NoSuchKey",
  "EndpointMismatch",
  "RegionMismatch",
  "Redirect",
  "ClockSkew",
  "RateLimited",
  "Timeout",
  "TLS",
  "DNS",
  "ConfigError",
  "SourceError",
  "ScopeError",
  "MultipartDenied",
  "VerificationDenied",
  "ProcessError",
  "EmptyDiagnostic",
  "Unknown"
)

$script:UploadRemoteStateAllowlist = @(
  "NOT_UPLOADED",
  "POSSIBLY_UPLOADED",
  "UPLOADED_UNVERIFIED",
  "UNKNOWN"
)

# Legacy alias retained for static QA / mock offline path only — never use as primary live classification.
$script:UploadLegacyStopAlias = "STOP_REMOTE_UPLOAD_NOT_AUTHORIZED"

function Normalize-UploadDiagnosticText {
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

function Protect-UploadDiagnosticText {
  param(
    [AllowNull()][string]$Text,
    [AllowNull()][string[]]$ExtraSecrets
  )
  if ([string]::IsNullOrEmpty($Text)) { return "" }
  $t = [string]$Text
  if ($ExtraSecrets) {
    foreach ($s in $ExtraSecrets) {
      if (-not [string]::IsNullOrEmpty($s) -and $s.Length -ge 4) {
        $t = $t.Replace($s, "[REDACTED_SECRET]")
      }
    }
  }
  $t = [regex]::Replace($t, '(?i)Bearer\s+\S+', 'Bearer [REDACTED]')
  $t = [regex]::Replace($t, '(?i)Authorization\s*[:=]\s*\S+', 'Authorization=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)\bapikey\s*[:=]\s*\S+', 'apikey=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*\S+', 'SUPABASE_SERVICE_ROLE_KEY=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)AWS_SECRET_ACCESS_KEY\s*[:=]\s*\S+', 'AWS_SECRET_ACCESS_KEY=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)AWS_ACCESS_KEY_ID\s*[:=]\s*\S+', 'AWS_ACCESS_KEY_ID=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)AWS_SESSION_TOKEN\s*[:=]\s*\S+', 'AWS_SESSION_TOKEN=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)RCLONE_CONFIG_[A-Z0-9_]*SECRET_ACCESS_KEY\s*[:=]\s*\S+', 'RCLONE_SECRET=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)RCLONE_CONFIG_[A-Z0-9_]*ACCESS_KEY_ID\s*[:=]\s*\S+', 'RCLONE_ACCESS_KEY=[REDACTED]')
  $t = [regex]::Replace($t, 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+', '[REDACTED_JWT]')
  $t = [regex]::Replace($t, '\b(?:AKIA|ASIA)[A-Z0-9]{16}\b', '[REDACTED_ACCESS_KEY]')
  $t = [regex]::Replace($t, '(?i)https?://[^\s''"]+', '[REDACTED_URL]')
  $t = [regex]::Replace($t, '(?i)\bs3\.[a-z0-9.-]+\.wasabisys\.com\b', '[REDACTED_ENDPOINT]')
  $t = [regex]::Replace($t, '(?i)\bRequestId[=:]\s*\S+', 'RequestId=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)\bHostId[=:]\s*\S+', 'HostId=[REDACTED]')
  $t = [regex]::Replace($t, '(?i)<(Code|Message|RequestId|HostId|BucketName|Key|Endpoint)>[^<]*</\1>', '<$1>[REDACTED]</$1>')
  $t = [regex]::Replace($t, '(?i)"(accessKey|secret|token|bucket|key|endpoint|error)"\s*:\s*"[^"]*"', '"$1":"[REDACTED]"')
  $t = [regex]::Replace($t, '(?i)[A-Za-z]:\\[^\r\n]+', '[REDACTED_FS_PATH]')
  $t = [regex]::Replace($t, '(?i)\\\\[^\r\n\\]+\\[^\r\n]+', '[REDACTED_UNC_PATH]')
  $t = [regex]::Replace($t, '(?i)\bboundloreprod:[^\s]+', '[REDACTED_REMOTE_TARGET]')
  $t = [regex]::Replace($t, '(?i)\bproduction-snapshots/[^\s]+', '[REDACTED_OBJECT_KEY]')
  return $t.Trim()
}

function Format-UploadStopEnvelope {
  param(
    [Parameter(Mandatory = $true)][string]$Code,
    [Parameter(Mandatory = $true)][string]$Phase,
    [AllowNull()][Nullable[int]]$ExitCode,
    [AllowNull()][Nullable[int]]$Http,
    [Parameter(Mandatory = $true)][string]$Kind,
    [Parameter(Mandatory = $true)][bool]$Retryable,
    [Parameter(Mandatory = $true)][string]$RemoteState
  )
  if ($script:UploadStopAllowlist -notcontains $Code) {
    $Code = "STOP_UPLOAD_DIAGNOSTIC_UNCLASSIFIED"
    $Kind = "Unknown"
  }
  if ($script:UploadPhaseAllowlist -notcontains $Phase) {
    $Phase = "child-exception"
  }
  if ($script:UploadKindAllowlist -notcontains $Kind) {
    $Kind = "Unknown"
  }
  if ($script:UploadRemoteStateAllowlist -notcontains $RemoteState) {
    $RemoteState = "UNKNOWN"
  }
  $parts = @(
    ("BL_UPLOAD_STOP|" + $Code),
    ("phase=" + $Phase)
  )
  if ($null -ne $ExitCode) {
    $parts += ("exit=" + [int]$ExitCode)
  }
  if ($null -ne $Http -and [int]$Http -ge 100 -and [int]$Http -le 599) {
    $parts += ("http=" + [int]$Http)
  }
  $parts += ("kind=" + $Kind)
  $parts += ("retryable=" + ($(if ($Retryable) { "true" } else { "false" })))
  $parts += ("remote_state=" + $RemoteState)
  return ($parts -join "|")
}

function Assert-UploadEnvelopeSafe {
  param([string]$Envelope)
  if ([string]::IsNullOrWhiteSpace($Envelope)) { return $false }
  if (-not $Envelope.StartsWith("BL_UPLOAD_STOP|")) { return $false }
  $banned = @(
    "TEST_TOKEN_NOT_A_REAL_SECRET",
    "TEST_ACCESS_KEY_NOT_REAL",
    "TEST_SECRET_KEY_NOT_REAL",
    "Bearer ",
    "Authorization=",
    "eyJ",
    "AKIA",
    "ASIA",
    "wasabisys.com",
    "production-snapshots/",
    "Traceback",
    "C:\Users",
    "D:\BoundLore"
  )
  foreach ($b in $banned) {
    if ($Envelope -like ("*" + $b + "*")) { return $false }
  }
  return $true
}

function Resolve-UploadFailure {
  param(
    [AllowNull()][string]$Stdout,
    [AllowNull()][string]$Stderr,
    [int]$ExitCode,
    [string]$Phase = "object-upload",
    [string]$CommandKind = "copyto",
    [AllowNull()][string[]]$ExtraSecrets,
    [bool]$UploadAlreadyMarkedPass = $false
  )

  if ($ExitCode -eq 0) {
    return [pscustomobject]@{
      Code = "NONE"
      Message = "ok"
      Envelope = ""
      Kind = "Unknown"
      Phase = $Phase
      RemoteState = "NOT_UPLOADED"
      Retryable = $false
      Http = $null
      SentinelDetected = $false
    }
  }

  if ($script:UploadPhaseAllowlist -notcontains $Phase) {
    $Phase = "child-exception"
  }

  $raw = Normalize-UploadDiagnosticText -Stdout $Stdout -Stderr $Stderr
  $stdoutBytes = if ($null -eq $Stdout) { 0 } else { [Text.Encoding]::UTF8.GetByteCount([string]$Stdout) }
  $stderrBytes = if ($null -eq $Stderr) { 0 } else { [Text.Encoding]::UTF8.GetByteCount([string]$Stderr) }
  $empty = [string]::IsNullOrWhiteSpace($raw)

  $code = "STOP_UPLOAD_DIAGNOSTIC_UNCLASSIFIED"
  $kind = "Unknown"
  $http = $null
  $retryable = $false
  $remoteState = "UNKNOWN"

  if ($Phase -eq "remote-size-verify" -or $Phase -eq "remote-list-verify") {
    $remoteState = if ($UploadAlreadyMarkedPass) { "UPLOADED_UNVERIFIED" } else { "UNKNOWN" }
  } elseif ($Phase -eq "object-upload" -or $Phase -like "multipart-*") {
    $remoteState = "POSSIBLY_UPLOADED"
  } elseif ($Phase -eq "config-cleanup") {
    $remoteState = if ($UploadAlreadyMarkedPass) { "UPLOADED_UNVERIFIED" } else { "UNKNOWN" }
  } elseif ($Phase -in @("source-validate", "source-select", "credential-bind", "credential-read", "config-create", "target-build", "scope-validate", "preflight")) {
    $remoteState = "NOT_UPLOADED"
  }

  if ($empty) {
    $kind = "EmptyDiagnostic"
    $code = "STOP_UPLOAD_DIAGNOSTIC_UNCLASSIFIED"
    $remoteState = if ($Phase -in @("remote-size-verify", "remote-list-verify") -and $UploadAlreadyMarkedPass) {
      "UPLOADED_UNVERIFIED"
    } elseif ($Phase -eq "object-upload") {
      "UNKNOWN"
    } else {
      $remoteState
    }
    $envLine = Format-UploadStopEnvelope -Code $code -Phase $Phase -ExitCode $ExitCode -Http $null -Kind $kind -Retryable $false -RemoteState $remoteState
    return [pscustomobject]@{
      Code = $code
      Message = ($envLine + " exit-code=" + $ExitCode + " stdout-bytes=" + $stdoutBytes + " stderr-bytes=" + $stderrBytes)
      Envelope = $envLine
      Kind = $kind
      Phase = $Phase
      RemoteState = $remoteState
      Retryable = $false
      Http = $null
      SentinelDetected = $false
    }
  }

  $redacted = Protect-UploadDiagnosticText -Text $raw -ExtraSecrets $ExtraSecrets
  $low = $redacted.ToLowerInvariant()

  if ($redacted -match '(?i)\bHTTP[/\s]*(\d{3})\b' -or $redacted -match '(?i)\bstatus[=:\s]+(\d{3})\b') {
    $http = [int]$Matches[1]
  }

  $isHeadDenial = ($low -match 'headobject' -or $low -match '\bhead\b.*\b(denied|forbidden|403)\b' -or $low -match 'checking.*exist' -or $low -match 'object verification' -or $low -match 'failed to head')
  $isListDenial = ($low -match 'listbucket' -or ($CommandKind -eq "lsl" -and ($low -match 'accessdenied' -or $low -match 'forbidden')))
  $isMultipart = ($low -match 'multipart' -or $low -match 'uploadpart' -or $low -match 'create multipart' -or $Phase -like "multipart-*")

  if ($low -match 'invalidaccesskeyid' -or $low -match 'invalidtoken' -or $low -match 'expiredtoken' -or $low -match 'invalid.?security.?token') {
    $code = "STOP_UPLOAD_CREDENTIAL_REJECTED"; $kind = "InvalidCredential"; $retryable = $false; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'signaturedoesnotmatch') {
    $code = "STOP_UPLOAD_CREDENTIAL_REJECTED"; $kind = "SignatureMismatch"; $retryable = $false; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'requesttimetooskewed') {
    $code = "STOP_UPLOAD_CREDENTIAL_REJECTED"; $kind = "ClockSkew"; $retryable = $true; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'authorizationheadermalformed' -or $low -match 'permanentredirect' -or $low -match 'temporaryredirect') {
    $code = "STOP_UPLOAD_ENDPOINT_MISMATCH"; $kind = $(if ($low -match 'redirect') { "Redirect" } else { "EndpointMismatch" }); $retryable = $false; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'nosuchbucket') {
    $code = "STOP_UPLOAD_BUCKET_MISMATCH"; $kind = "NoSuchBucket"; $retryable = $false; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'nosuchkey') {
    $code = "STOP_UPLOAD_REMOTE_VERIFY_FAILED"; $kind = "NoSuchKey"; $retryable = $false
    if ($UploadAlreadyMarkedPass -or $Phase -like "remote-*") { $remoteState = "UPLOADED_UNVERIFIED" }
  } elseif ($isHeadDenial -and ($Phase -eq "object-upload" -or $Phase -like "multipart-*")) {
    # Post/pre HEAD denial must not be labelled as PutObject denial.
    $code = "STOP_UPLOAD_REMOTE_VERIFY_DENIED"; $kind = "VerificationDenied"; $retryable = $false
    $remoteState = "POSSIBLY_UPLOADED"
  } elseif ($isListDenial -or ($Phase -like "remote-*" -and ($low -match 'accessdenied' -or $low -match 'forbidden'))) {
    $code = "STOP_UPLOAD_REMOTE_VERIFY_DENIED"; $kind = "VerificationDenied"; $retryable = $false
    $remoteState = if ($UploadAlreadyMarkedPass) { "UPLOADED_UNVERIFIED" } else { "UNKNOWN" }
  } elseif ($isMultipart -and ($low -match 'accessdenied' -or $low -match 'forbidden' -or $low -match 'denied')) {
    $code = "STOP_UPLOAD_MULTIPART_DENIED"; $kind = "MultipartDenied"; $retryable = $false; $remoteState = "POSSIBLY_UPLOADED"
  } elseif ($low -match 'accessdenied' -or $low -match '\bforbidden\b' -or $http -eq 403) {
    if ($Phase -like "remote-*") {
      $code = "STOP_UPLOAD_REMOTE_VERIFY_DENIED"; $kind = "VerificationDenied"; $retryable = $false
      $remoteState = if ($UploadAlreadyMarkedPass) { "UPLOADED_UNVERIFIED" } else { "UNKNOWN" }
    } elseif ($low -match 'bucket' -and $low -match 'check') {
      $code = "STOP_UPLOAD_BUCKET_CHECK_DENIED"; $kind = "AccessDenied"; $retryable = $false; $remoteState = "NOT_UPLOADED"
    } else {
      $code = "STOP_UPLOAD_PERMISSION_DENIED"; $kind = "AccessDenied"; $retryable = $false; $remoteState = "UNKNOWN"
    }
  } elseif ($low -match 'no such host' -or $low -match 'name resolution' -or $low -match 'getaddrinfo' -or $low -match 'dns ') {
    $code = "STOP_UPLOAD_NETWORK_FAILED"; $kind = "DNS"; $retryable = $true; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'tls handshake' -or $low -match 'certificate' -or $low -match 'x509' -or $low -match 'ssl') {
    $code = "STOP_UPLOAD_TLS_FAILED"; $kind = "TLS"; $retryable = $true; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'timed out' -or $low -match 'timeout' -or $low -match 'deadline exceeded' -or $http -eq 408 -or $http -eq 504) {
    $code = "STOP_UPLOAD_TIMEOUT"; $kind = "Timeout"; $retryable = $true; $remoteState = "POSSIBLY_UPLOADED"
  } elseif ($low -match 'connection refused' -or $low -match 'connection reset') {
    $code = "STOP_UPLOAD_NETWORK_FAILED"; $kind = "Unknown"; $retryable = $true; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'slowdown' -or $low -match 'too many requests' -or $http -eq 429) {
    $code = "STOP_UPLOAD_TRANSFER_FAILED"; $kind = "RateLimited"; $retryable = $true; $remoteState = "POSSIBLY_UPLOADED"
  } elseif ($http -in @(500, 502, 503)) {
    $code = "STOP_UPLOAD_TRANSFER_FAILED"; $kind = "Unknown"; $retryable = $true; $remoteState = "POSSIBLY_UPLOADED"
  } elseif ($low -match 'unknown flag' -or ($low -match 'config' -and $low -match 'parse') -or $low -match 'failed to load config') {
    $code = "STOP_UPLOAD_CONFIG_INVALID"; $kind = "ConfigError"; $retryable = $false; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'source' -and ($low -match 'not found' -or $low -match 'no such file' -or $low -match 'does not exist')) {
    $code = "STOP_UPLOAD_SOURCE_INVALID"; $kind = "SourceError"; $retryable = $false; $remoteState = "NOT_UPLOADED"
  } elseif ($low -match 'permission denied' -and $low -match '(file|open|read|write|path)') {
    $code = "STOP_UPLOAD_SOURCE_INVALID"; $kind = "SourceError"; $retryable = $false; $remoteState = "NOT_UPLOADED"
  } elseif ($Phase -eq "config-cleanup") {
    $code = "STOP_UPLOAD_CONFIG_CLEANUP_FAILED"; $kind = "ProcessError"; $retryable = $false
  } elseif ($Phase -like "remote-*") {
    $code = "STOP_UPLOAD_REMOTE_VERIFY_FAILED"; $kind = "Unknown"; $retryable = $false
    $remoteState = if ($UploadAlreadyMarkedPass) { "UPLOADED_UNVERIFIED" } else { "UNKNOWN" }
  } else {
    $code = "STOP_UPLOAD_DIAGNOSTIC_UNCLASSIFIED"; $kind = "Unknown"; $retryable = $false
  }

  # Size / count mismatches from parent (no rclone pattern) stay verify-failed.
  if ($Phase -like "remote-*" -and ($low -match 'expected 1 remote' -or $low -match 'remote size mismatch' -or $low -match 'count')) {
    $code = "STOP_UPLOAD_REMOTE_VERIFY_FAILED"
    $kind = "Unknown"
    $remoteState = "UPLOADED_UNVERIFIED"
  }

  $envLine = Format-UploadStopEnvelope -Code $code -Phase $Phase -ExitCode $ExitCode -Http $http -Kind $kind -Retryable $retryable -RemoteState $remoteState
  if (-not (Assert-UploadEnvelopeSafe $envLine)) {
    $code = "STOP_UPLOAD_DIAGNOSTIC_UNCLASSIFIED"
    $kind = "Unknown"
    $envLine = Format-UploadStopEnvelope -Code $code -Phase $Phase -ExitCode $ExitCode -Http $null -Kind $kind -Retryable $false -RemoteState "UNKNOWN"
  }

  return [pscustomobject]@{
    Code = $code
    Message = $envLine
    Envelope = $envLine
    Kind = $kind
    Phase = $Phase
    RemoteState = $remoteState
    Retryable = $retryable
    Http = $http
    SentinelDetected = $true
  }
}

function Test-UploadCredentialOuterWhitespace {
  param([AllowNull()][string]$Value)
  if ([string]::IsNullOrEmpty($Value)) {
    return [pscustomobject]@{ Ok = $false; Code = "STOP_UPLOAD_CREDENTIAL_MISSING"; Normalized = "" }
  }
  if ($Value -match "[\r\n]") {
    return [pscustomobject]@{ Ok = $false; Code = "STOP_UPLOAD_CREDENTIAL_REJECTED"; Normalized = "" }
  }
  if ($Value -ne $Value.Trim(' ')) {
    # Outer spaces: fail-closed (do not silently trim secrets).
    return [pscustomobject]@{ Ok = $false; Code = "STOP_UPLOAD_CREDENTIAL_REJECTED"; Normalized = "" }
  }
  return [pscustomobject]@{ Ok = $true; Code = "NONE"; Normalized = $Value }
}

function Invoke-UploadDiagnosticsOfflineSelfTest {
  $results = New-Object System.Collections.Generic.List[string]
  $script:UploadDiagSelfTestFails = 0
  function _assert([bool]$cond, [string]$name) {
    if ($cond) {
      [void]$results.Add("PASS $name")
    } else {
      $script:UploadDiagSelfTestFails++
      [void]$results.Add("FAIL $name")
    }
  }

  $e1 = Resolve-UploadFailure -Stdout "" -Stderr "" -ExitCode 1 -Phase "object-upload"
  _assert ($e1.Code -eq "STOP_UPLOAD_DIAGNOSTIC_UNCLASSIFIED" -and $e1.Kind -eq "EmptyDiagnostic") "empty-streams"

  $e2 = Resolve-UploadFailure -Stdout "" -Stderr "InvalidAccessKeyId" -ExitCode 1 -Phase "object-upload"
  _assert ($e2.Code -eq "STOP_UPLOAD_CREDENTIAL_REJECTED" -and $e2.Kind -eq "InvalidCredential") "invalid-access-key"

  $e3 = Resolve-UploadFailure -Stdout "" -Stderr "SignatureDoesNotMatch" -ExitCode 1 -Phase "object-upload"
  _assert ($e3.Code -eq "STOP_UPLOAD_CREDENTIAL_REJECTED" -and $e3.Kind -eq "SignatureMismatch") "signature-mismatch"

  $e4 = Resolve-UploadFailure -Stdout "" -Stderr "AccessDenied when calling HeadObject" -ExitCode 1 -Phase "object-upload"
  _assert ($e4.Code -eq "STOP_UPLOAD_REMOTE_VERIFY_DENIED" -and $e4.RemoteState -eq "POSSIBLY_UPLOADED" -and $e4.Kind -eq "VerificationDenied") "post-head-denied"

  $e5 = Resolve-UploadFailure -Stdout "" -Stderr "AccessDenied PutObject" -ExitCode 1 -Phase "object-upload"
  _assert ($e5.Code -eq "STOP_UPLOAD_PERMISSION_DENIED" -and $e5.Kind -eq "AccessDenied") "put-access-denied"

  $e6 = Resolve-UploadFailure -Stdout "" -Stderr "AccessDenied ListBucket" -ExitCode 1 -Phase "remote-size-verify" -CommandKind "lsl" -UploadAlreadyMarkedPass $true
  _assert ($e6.Code -eq "STOP_UPLOAD_REMOTE_VERIFY_DENIED" -and $e6.RemoteState -eq "UPLOADED_UNVERIFIED") "lsl-denied-after-upload"

  $e7 = Resolve-UploadFailure -Stdout "" -Stderr "NoSuchBucket" -ExitCode 1 -Phase "object-upload"
  _assert ($e7.Code -eq "STOP_UPLOAD_BUCKET_MISMATCH") "no-such-bucket"

  $e8 = Resolve-UploadFailure -Stdout "" -Stderr "no such host" -ExitCode 1 -Phase "object-upload"
  _assert ($e8.Code -eq "STOP_UPLOAD_NETWORK_FAILED" -and $e8.Kind -eq "DNS") "dns"

  $e9 = Resolve-UploadFailure -Stdout "" -Stderr "TLS handshake failed" -ExitCode 1 -Phase "object-upload"
  _assert ($e9.Code -eq "STOP_UPLOAD_TLS_FAILED") "tls"

  $e10 = Resolve-UploadFailure -Stdout "" -Stderr "context deadline exceeded" -ExitCode 1 -Phase "object-upload"
  _assert ($e10.Code -eq "STOP_UPLOAD_TIMEOUT") "timeout"

  $secretBlob = "Authorization: Bearer TEST_TOKEN_NOT_A_REAL_SECRET bucket=evil-bucket key=production-snapshots/x.age https://s3.eu-central-2.wasabisys.com/x AKIA1234567890ABCD12"
  $prot = Protect-UploadDiagnosticText $secretBlob
  _assert ($prot -notmatch "TEST_TOKEN_NOT_A_REAL_SECRET" -and $prot -notmatch "wasabisys" -and $prot -notmatch "AKIA1234567890ABCD12" -and $prot -notmatch "production-snapshots/") "redaction"

  $envOk = Format-UploadStopEnvelope -Code "STOP_UPLOAD_PERMISSION_DENIED" -Phase "object-upload" -ExitCode 1 -Http 403 -Kind "AccessDenied" -Retryable $false -RemoteState "UNKNOWN"
  _assert (Assert-UploadEnvelopeSafe $envOk) "envelope-safe"
  _assert ($envOk -eq "BL_UPLOAD_STOP|STOP_UPLOAD_PERMISSION_DENIED|phase=object-upload|exit=1|http=403|kind=AccessDenied|retryable=false|remote_state=UNKNOWN") "envelope-order"

  $ws = Test-UploadCredentialOuterWhitespace " ABC "
  _assert (-not $ws.Ok) "outer-whitespace-fail-closed"

  _assert ($e1.Code -ne $script:UploadLegacyStopAlias -and $e5.Code -ne $script:UploadLegacyStopAlias) "no-legacy-primary-stop"

  $bom = Resolve-UploadFailure -Stdout ([char]0xFEFF + "AccessDenied") -Stderr "" -ExitCode 1 -Phase "object-upload"
  _assert ($bom.Code -eq "STOP_UPLOAD_PERMISSION_DENIED") "bom-normalized"

  $nul = Resolve-UploadFailure -Stdout "" -Stderr ("Access" + [char]0 + "Denied") -ExitCode 1 -Phase "object-upload"
  _assert ($nul.Code -eq "STOP_UPLOAD_PERMISSION_DENIED") "nul-normalized"

  return [pscustomobject]@{
    Failures = $script:UploadDiagSelfTestFails
    OfflineSelfTest = @($results)
    Pass = ($script:UploadDiagSelfTestFails -eq 0)
  }
}
