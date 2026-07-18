# Manual Wasabi upload handoff helpers (local only; no network).
# Dot-source from LiveProductionSnapshot or offline tests.

function Get-BoundLoreManualHandoffRoot {
  if ($env:BOUNDLORE_OFFLINE_HANDOFF_ROOT -and $env:BOUNDLORE_OFFLINE_HANDOFF_ROOT.Trim()) {
    return [IO.Path]::GetFullPath($env:BOUNDLORE_OFFLINE_HANDOFF_ROOT.Trim())
  }
  return "D:\BoundLoreBackups\ManualUploadHandoffs"
}

function New-BoundLoreManualUploadHandoff {
  param(
    [Parameter(Mandatory = $true)][string]$BackupId,
    [Parameter(Mandatory = $true)][string]$ArchiveFileName,
    [Parameter(Mandatory = $true)][int64]$ArchiveBytes,
    [Parameter(Mandatory = $true)][string]$ArchiveSha256,
    [Parameter(Mandatory = $true)][string]$LocalArchivePath,
    [Parameter(Mandatory = $true)][string]$RemoteRelativePath,
    [string]$HandoffRoot = ""
  )

  if (-not $HandoffRoot) { $HandoffRoot = Get-BoundLoreManualHandoffRoot }
  if (-not (Test-Path -LiteralPath $HandoffRoot)) {
    New-Item -ItemType Directory -Force -Path $HandoffRoot | Out-Null
  }

  $handPath = Join-Path $HandoffRoot ($BackupId + ".txt")
  if (Test-Path -LiteralPath $handPath) {
    throw ("STOP_MANUAL_UPLOAD_HANDOFF_ALREADY_EXISTS: handoff already exists")
  }

  if ($RemoteRelativePath -match "(?i)trial-integration" -or $RemoteRelativePath.Contains("..")) {
    throw "STOP_EXTERNAL_TARGET_MISMATCH: bad remote relative path"
  }
  if ($ArchiveFileName -notmatch '\.age$' -or $LocalArchivePath -notmatch '\.age$') {
    throw "STOP_UPLOAD_SOURCE_NOT_ENCRYPTED: handoff requires .age"
  }
  if ($ArchiveSha256 -notmatch '^[a-f0-9]{64}$') {
    throw "STOP_CHECKSUM_FAILED: invalid sha256 for handoff"
  }

  $created = [DateTime]::UtcNow.ToString("o")
  $lines = @(
    ("BACKUP_ID={0}" -f $BackupId),
    ("ARCHIVE_FILE={0}" -f $ArchiveFileName),
    ("ARCHIVE_BYTES={0}" -f $ArchiveBytes),
    ("ARCHIVE_SHA256={0}" -f $ArchiveSha256.ToLowerInvariant()),
    ("LOCAL_ARCHIVE_PATH={0}" -f $LocalArchivePath),
    ("REMOTE_RELATIVE_PATH={0}" -f $RemoteRelativePath),
    "UPLOAD_MODE=MANUAL_BROWSER",
    "UPLOAD_STATUS=AWAITING_MANUAL_WASABI_UPLOAD",
    ("CREATED_UTC={0}" -f $created),
    "",
    "MANUAL_UPLOAD_INSTRUCTIONS:",
    "1. Open the Production bucket in the Wasabi dashboard.",
    "2. Use the relative target path above (create folders as needed).",
    "3. Upload only the .age archive file.",
    "4. Compare filename and byte size with this handoff.",
    "5. On mismatch: do not delete remote objects and do not start a second upload.",
    "",
    "AUTOMATIC_WASABI_UPLOAD=DEFERRED",
    "READBACK_RESTORE_VALIDATION=OPEN",
    "S-07=OPEN"
  )

  # Atomic create: fail if exists (CreateNew).
  $utf8 = New-Object Text.UTF8Encoding $false
  $fs = $null
  try {
    $fs = [IO.File]::Open($handPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    $bytes = $utf8.GetBytes(($lines -join [Environment]::NewLine) + [Environment]::NewLine)
    $fs.Write($bytes, 0, $bytes.Length)
  } catch [IO.IOException] {
    throw ("STOP_MANUAL_UPLOAD_HANDOFF_ALREADY_EXISTS: handoff already exists")
  } catch {
    throw ("STOP_MANUAL_UPLOAD_HANDOFF_FAILED: " + $_.Exception.Message)
  } finally {
    if ($fs) { $fs.Dispose() }
  }

  return $handPath
}

function Test-BoundLoreManualHandoffTextSafe {
  param([string]$Text)
  if ([string]::IsNullOrEmpty($Text)) { return $false }
  $bad = @(
    '(?i)AGE-SECRET-KEY',
    '(?i)AKIA[0-9A-Z]{16}',
    '(?i)service[_-]?role',
    '(?i)wasabisys\.com',
    '(?i)s3\.[a-z0-9-]+\.wasabisys',
    '(?i)eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}',
    '(?i)postgres(ql)?://',
    '(?i)PASSWORD\s*=',
    '(?i)SECRET_ACCESS_KEY',
    '(?i)arn:aws:iam::'
  )
  foreach ($p in $bad) {
    if ($Text -match $p) { return $false }
  }
  return $true
}
