<#
.SYNOPSIS
  P5-E.10B-W4 — Encrypted synthetic Wasabi integration (fail-closed).

.DESCRIPTION
  Builds a fully synthetic local package, age-encrypts it, then (only with
  -ConfirmAuthorizedSyntheticUpload) uploads exactly one .age object to the
  authorized Wasabi trial scope and reads it back once.

  Credentials: interactive SecureString only. Never accepted as parameters.
  rclone: ephemeral child-process env + empty temp config. No rclone config.
  No delete, no bucket create, no production/supabase, no multipart needed.

.NOTES
  Gate-only bucket constant — not a production default for other tools.
#>
[CmdletBinding()]
param(
  [switch]$ConfirmAuthorizedSyntheticUpload,
  [switch]$LocalPreflightOnly,
  [string]$EvidencePath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- W4 gate constants (authorized scope only; not production defaults) ---
$AllowedEndpoint = "s3.eu-central-2.wasabisys.com"
$AllowedRegion = "eu-central-2"
$AllowedBucket = "boundlore-trial-backup-a7k4m9"
$AllowedPrefix = "trial-integration/"
$RemoteName = "boundloretrial"
$MaxPlainBytes = 1MB
$MaxEncryptedBytes = 2MB
$MaxUploadCount = 1
$MaxDownloadCount = 1

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
if (-not $EvidencePath) {
  $EvidencePath = Join-Path $RepoRoot "qa\evidence\p5-e10b-w4-wasabi-synthetic-roundtrip.json"
}

function Stop-Code([string]$Code, [string]$Message) {
  Write-Error ("{0}: {1}" -f $Code, $Message)
  exit 1
}

function Test-Tool([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) { Stop-Code "STOP_REQUIRED_TOOL_NOT_FOUND" $Name }
  $path = $cmd.Source
  if ($path.StartsWith($RepoRoot, [StringComparison]::OrdinalIgnoreCase)) {
    Stop-Code "STOP_AMBIGUOUS_TOOL_RESOLUTION" "$Name resolves inside repository"
  }
  return $path
}

function Get-Sha256Hex([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

function Assert-ObjectKey([string]$Key) {
  if (-not $Key.StartsWith($AllowedPrefix, [StringComparison]::Ordinal)) {
    Stop-Code "STOP_EXTERNAL_TARGET_MISMATCH" "object key prefix mismatch"
  }
  if ($Key.Contains("..") -or $Key.Contains("\") -or $Key.Contains("//")) {
    Stop-Code "STOP_EXTERNAL_TARGET_MISMATCH" "object key path unsafe"
  }
  if (-not $Key.EndsWith(".age", [StringComparison]::OrdinalIgnoreCase)) {
    Stop-Code "STOP_EXTERNAL_TARGET_MISMATCH" "object must end with .age"
  }
}

function ConvertFrom-SecureStringPlain([System.Security.SecureString]$Secure) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }
}

function Clear-String([ref]$Value) {
  if ($null -eq $Value.Value) { return }
  # Best-effort overwrite of managed string reference (immutable; clear ref).
  $Value.Value = $null
}

function New-EmptyRcloneConfig([string]$Dir) {
  $cfg = Join-Path $Dir "rclone-empty.conf"
  # Explicitly empty — never copy user rclone.conf
  Set-Content -Path $cfg -Value "" -Encoding ASCII -NoNewline
  return $cfg
}

function Invoke-RcloneChild {
  param(
    [string]$RclonePath,
    [string]$ConfigPath,
    [string[]]$ArgumentList,
    [hashtable]$SecretEnv
  )
  $psi = New-Object System.Diagnostics.ProcessStartInfo
  $psi.FileName = $RclonePath
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.WorkingDirectory = $env:TEMP

  # Do not Clear() (can throw on .NET Framework). Override config + scrub ambient secrets.
  $psi.EnvironmentVariables["RCLONE_CONFIG"] = $ConfigPath
  foreach ($drop in @(
      "AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
      "RCLONE_S3_ACCESS_KEY_ID", "RCLONE_S3_SECRET_ACCESS_KEY"
    )) {
    if ($psi.EnvironmentVariables.ContainsKey($drop)) {
      $psi.EnvironmentVariables.Remove($drop)
    }
  }
  foreach ($k in $SecretEnv.Keys) {
    $psi.EnvironmentVariables[$k] = [string]$SecretEnv[$k]
  }

  # Quote args for ProcessStartInfo.Arguments
  $quoted = @()
  foreach ($a in $ArgumentList) {
    if ($a -match '[\s"]') {
      $quoted += '"' + ($a -replace '"', '\"') + '"'
    } else {
      $quoted += $a
    }
  }
  $psi.Arguments = ($quoted -join " ")

  $proc = New-Object System.Diagnostics.Process
  $proc.StartInfo = $psi
  [void]$proc.Start()
  $stdout = $proc.StandardOutput.ReadToEnd()
  $stderr = $proc.StandardError.ReadToEnd()
  $proc.WaitForExit()
  return [pscustomobject]@{
    ExitCode = $proc.ExitCode
    StdOut   = $stdout
    StdErr   = $stderr
  }
}

function Write-RedactedEvidence([hashtable]$Data) {
  $dir = Split-Path -Parent $EvidencePath
  if (-not (Test-Path $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  # Never write secrets; bucket always REDACTED in evidence.
  $Data["bucket"] = "REDACTED"
  $json = ($Data | ConvertTo-Json -Depth 8)
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($EvidencePath, $json + [Environment]::NewLine, $utf8NoBom)
}

# --- Mode guards ---
if (-not $ConfirmAuthorizedSyntheticUpload -and -not $LocalPreflightOnly) {
  Stop-Code "STOP_CREDENTIAL_INPUT_REQUIRED" "Pass -LocalPreflightOnly or -ConfirmAuthorizedSyntheticUpload"
}
if ($ConfirmAuthorizedSyntheticUpload -and $LocalPreflightOnly) {
  Stop-Code "STOP_NEEDS_USER_REVIEW" "Use only one of -LocalPreflightOnly / -ConfirmAuthorizedSyntheticUpload"
}

# Capability denials (never implemented)
$DeleteImplemented = $false
$BucketCreateImplemented = $false
$RcloneConfigPersisted = $false

if ($DeleteImplemented -or $BucketCreateImplemented) {
  Stop-Code "STOP_UNAUTHORIZED_NETWORK_ACTIVITY" "forbidden capability enabled"
}

$agePath = Test-Tool "age"
$keygenPath = Test-Tool "age-keygen"
$rclonePath = Test-Tool "rclone"

$ageVer = (& $agePath --version 2>&1 | Out-String).Trim()
$keygenVer = (& $keygenPath --version 2>&1 | Out-String).Trim()
$rcloneVer = ((& $rclonePath version 2>&1 | Select-Object -First 1) | Out-String).Trim()

$tmpRoot = $null
$identityPath = $null
$accessPlain = $null
$secretPlain = $null
$uploadAttempts = 0
$uploadSuccess = 0
$downloadAttempts = 0
$downloadSuccess = 0
$networkUsed = $false
$verdict = "STOP_NEEDS_USER_REVIEW"
$utcStamp = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
$objectKey = ("{0}p5-e10b-w4-{1}-synthetic.age" -f $AllowedPrefix, $utcStamp)
Assert-ObjectKey $objectKey
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
  $objectKeyHash = -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($objectKey)) | ForEach-Object { $_.ToString("x2") })
} finally {
  $sha.Dispose()
}

try {
  $tmpRoot = Join-Path $env:TEMP ("boundlore-w4-" + [Guid]::NewGuid().ToString("N"))
  if ($tmpRoot.StartsWith($RepoRoot, [StringComparison]::OrdinalIgnoreCase)) {
    Stop-Code "STOP_OUTPUT_INSIDE_REPOSITORY" "temp root inside repo"
  }
  New-Item -ItemType Directory -Force -Path $tmpRoot | Out-Null
  $keys = Join-Path $tmpRoot "keys"
  $source = Join-Path $tmpRoot "synthetic-source"
  $archiveDir = Join-Path $tmpRoot "archive"
  $encryptedDir = Join-Path $tmpRoot "encrypted"
  $downloadDir = Join-Path $tmpRoot "download"
  $restoredDir = Join-Path $tmpRoot "restored"
  $rcloneCfgDir = Join-Path $tmpRoot "rclone-cfg"
  foreach ($d in @($keys, $source, $archiveDir, $encryptedDir, $downloadDir, $restoredDir, $rcloneCfgDir)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
  }

  # --- Synthetic package (no real IDs / secrets / project refs) ---
  $db = Join-Path $source "database"
  $stA = Join-Path $source "storage\avatars"
  $stD = Join-Path $source "storage\discovery-uploads"
  $stR = Join-Path $source "storage\report-screenshots"
  $cfg = Join-Path $source "configuration"
  foreach ($d in @($db, $stA, $stD, $stR, $cfg)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
  }

  Set-Content -Path (Join-Path $db "roles.sql") -Value "-- synthetic roles placeholder`n" -Encoding UTF8
  Set-Content -Path (Join-Path $db "schema.sql") -Value "-- synthetic schema placeholder`n" -Encoding UTF8
  Set-Content -Path (Join-Path $db "data.sql") -Value "-- synthetic data placeholder`n" -Encoding UTF8
  [IO.File]::WriteAllBytes((Join-Path $stA "synthetic-avatar.bin"), [Text.Encoding]::ASCII.GetBytes("SYNTH_AVATAR"))
  Set-Content -Path (Join-Path $stD "synthetic-discovery.txt") -Value "synthetic discovery blob`n" -Encoding UTF8
  [IO.File]::WriteAllBytes((Join-Path $stR "synthetic-report.bin"), [Text.Encoding]::ASCII.GetBytes("SYNTH_REPORT"))
  Set-Content -Path (Join-Path $cfg "synthetic-supabase.json") -Encoding UTF8 -Value @'
{
  "source_type": "synthetic",
  "note": "offline-only placeholder; no live project"
}
'@
  Set-Content -Path (Join-Path $cfg "synthetic-cloudflare.json") -Encoding UTF8 -Value @'
{
  "source_type": "synthetic",
  "note": "offline-only placeholder; no live zone"
}
'@

  $files = Get-ChildItem -Path $source -Recurse -File
  $fileChecksums = [ordered]@{}
  foreach ($f in $files) {
    $rel = $f.FullName.Substring($source.Length).TrimStart("\").Replace("\", "/")
    $fileChecksums[$rel] = Get-Sha256Hex $f.FullName
  }
  $plainSize = ($files | Measure-Object -Property Length -Sum).Sum
  if ($plainSize -gt $MaxPlainBytes) {
    Stop-Code "STOP_PREUPLOAD_VALIDATION_FAILED" "plain package exceeds 1 MiB"
  }

  $backupId = "boundlore-synthetic-w4-$utcStamp"
  $manifest = [ordered]@{
    format_version           = "1.0.0"
    synthetic                = $true
    backup_id                = $backupId
    created_at_utc           = ([DateTime]::UtcNow.ToString("o"))
    components               = @("database", "storage", "configuration")
    file_count               = $files.Count
    package_size_bytes       = [int64]$plainSize
    checksum_algorithm       = "SHA-256"
    encryption_method        = "age"
    source_classification    = "synthetic-only"
    production_data          = $false
    validation_status        = "pre_encryption"
    file_checksums_sha256    = $fileChecksums
  }
  $manifestPath = Join-Path $source "manifest.json"
  ($manifest | ConvertTo-Json -Depth 8) | Set-Content -Path $manifestPath -Encoding UTF8
  $manifestHash = Get-Sha256Hex $manifestPath
  Set-Content -Path (Join-Path $source "manifest.sha256") -Value ("{0}  manifest.json" -f $manifestHash) -Encoding ASCII

  # Recompute file list including manifest
  $files = Get-ChildItem -Path $source -Recurse -File
  $plainSize = ($files | Measure-Object -Property Length -Sum).Sum
  if ($plainSize -gt $MaxPlainBytes) {
    Stop-Code "STOP_PREUPLOAD_VALIDATION_FAILED" "plain package exceeds 1 MiB after manifest"
  }

  # Archive (zip) then encrypt single archive — one upload object
  $zipPath = Join-Path $archiveDir "synthetic-package.zip"
  Compress-Archive -Path "$source\*" -DestinationPath $zipPath -Force
  if (-not (Test-Path $zipPath)) {
    Stop-Code "STOP_PREUPLOAD_VALIDATION_FAILED" "archive missing"
  }

  # Ephemeral age keypair
  $identityPath = Join-Path $keys "ephemeral.identity"
  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $null = & $keygenPath -o $identityPath 2>&1
  $keygenExit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($keygenExit -ne 0 -or -not (Test-Path $identityPath)) {
    Stop-Code "STOP_PREUPLOAD_VALIDATION_FAILED" "age-keygen failed"
  }
  # Do not print keygen output (may include public key line)
  $ErrorActionPreference = "Continue"
  $recipient = ((& $keygenPath -y $identityPath 2>$null) | Out-String).Trim()
  $ErrorActionPreference = $prevEap
  if (-not $recipient.StartsWith("age1")) {
    Stop-Code "FAIL_SECRET_OR_KEY_LEAK" "recipient extraction failed"
  }
  if ($recipient -match "AGE-SECRET-KEY") {
    Stop-Code "FAIL_SECRET_OR_KEY_LEAK" "secret in recipient"
  }

  $encPath = Join-Path $encryptedDir ("p5-e10b-w4-{0}-synthetic.age" -f $utcStamp)
  $ErrorActionPreference = "Continue"
  $null = & $agePath -r $recipient -o $encPath -- $zipPath 2>&1
  $ageExit = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  if ($ageExit -ne 0 -or -not (Test-Path $encPath)) {
    Stop-Code "STOP_PREUPLOAD_VALIDATION_FAILED" "age encryption failed"
  }
  $encSize = (Get-Item $encPath).Length
  if ($encSize -gt $MaxEncryptedBytes) {
    Stop-Code "STOP_PREUPLOAD_VALIDATION_FAILED" "encrypted object exceeds 2 MiB"
  }
  if (-not $encPath.EndsWith(".age", [StringComparison]::OrdinalIgnoreCase)) {
    Stop-Code "STOP_PREUPLOAD_VALIDATION_FAILED" "upload source must be .age"
  }
  $encHash = Get-Sha256Hex $encPath

  # Clear recipient from memory as soon as encryption is done
  $recipient = $null

  Write-Host "PREUPLOAD_VALIDATION_PASS encrypted_sha256=$encHash size=$encSize"

  if ($LocalPreflightOnly) {
    $verdict = "STOP_CREDENTIAL_INPUT_REQUIRED"
    Write-Host "LOCAL_PREFLIGHT_PASS"
    Write-Host "MANUAL_USER_ACTION_REQUIRED: run with -ConfirmAuthorizedSyntheticUpload in a local PowerShell terminal (credentials via SecureString prompts only)."
    exit 0
  }

  # --- Interactive credentials (never as parameters / never echoed) ---
  Write-Host "Enter Wasabi Access Key ID (input hidden):"
  $accessSecure = Read-Host -AsSecureString
  Write-Host "Enter Wasabi Secret Access Key (input hidden):"
  $secretSecure = Read-Host -AsSecureString
  if ($null -eq $accessSecure -or $null -eq $secretSecure) {
    Stop-Code "STOP_CREDENTIAL_INPUT_REQUIRED" "credentials required"
  }
  $accessPlain = ConvertFrom-SecureStringPlain $accessSecure
  $secretPlain = ConvertFrom-SecureStringPlain $secretSecure
  $accessSecure.Dispose()
  $secretSecure.Dispose()
  if ([string]::IsNullOrWhiteSpace($accessPlain) -or [string]::IsNullOrWhiteSpace($secretPlain)) {
    Stop-Code "STOP_CREDENTIAL_INPUT_REQUIRED" "empty credential"
  }

  $rcloneCfg = New-EmptyRcloneConfig $rcloneCfgDir
  $secretEnv = @{
    ("RCLONE_CONFIG_{0}_TYPE" -f $RemoteName.ToUpperInvariant())              = "s3"
    ("RCLONE_CONFIG_{0}_PROVIDER" -f $RemoteName.ToUpperInvariant())          = "Wasabi"
    ("RCLONE_CONFIG_{0}_ACCESS_KEY_ID" -f $RemoteName.ToUpperInvariant())     = $accessPlain
    ("RCLONE_CONFIG_{0}_SECRET_ACCESS_KEY" -f $RemoteName.ToUpperInvariant()) = $secretPlain
    ("RCLONE_CONFIG_{0}_REGION" -f $RemoteName.ToUpperInvariant())            = $AllowedRegion
    ("RCLONE_CONFIG_{0}_ENDPOINT" -f $RemoteName.ToUpperInvariant())          = $AllowedEndpoint
    ("RCLONE_CONFIG_{0}_NO_CHECK_BUCKET" -f $RemoteName.ToUpperInvariant())   = "true"
    ("RCLONE_CONFIG_{0}_FORCE_PATH_STYLE" -f $RemoteName.ToUpperInvariant())  = "true"
  }
  # ACL omitted: empty/default is private per rclone S3 backend; avoids unsupported ACL quirks.

  # Clear plaintext from parent ASAP after copying into hashtable for child only
  Clear-String ([ref]$accessPlain)
  Clear-String ([ref]$secretPlain)

  $remoteTarget = "{0}:{1}/{2}" -f $RemoteName, $AllowedBucket, $objectKey
  # Validate constructed target pieces
  if ($remoteTarget -notmatch [regex]::Escape($AllowedEndpoint) -and $true) {
    # endpoint is via env, not path; validate bucket/prefix pieces
  }
  if ($objectKey -notlike ($AllowedPrefix + "*")) {
    Stop-Code "STOP_EXTERNAL_TARGET_MISMATCH" "prefix"
  }

  $commonArgs = @(
    "--config", $rcloneCfg,
    "--retries", "1",
    "--low-level-retries", "1",
    "--retries-sleep", "0",
    "--timeout", "60s",
    "--contimeout", "30s",
    "--transfers", "1",
    "--checkers", "1",
    "--s3-upload-cutoff", "100Mi",
    "--immutable"
  )

  # Exactly one upload
  $uploadAttempts = 1
  $networkUsed = $true
  $up = Invoke-RcloneChild -RclonePath $rclonePath -ConfigPath $rcloneCfg -ArgumentList (
    @("copyto", $encPath, $remoteTarget) + $commonArgs
  ) -SecretEnv $secretEnv
  if ($up.ExitCode -ne 0) {
    Stop-Code "STOP_UNAUTHORIZED_NETWORK_ACTIVITY" ("upload failed exit={0}" -f $up.ExitCode)
  }
  $uploadSuccess = 1
  if ($uploadAttempts -ne 1 -or $uploadSuccess -ne 1) {
    Stop-Code "STOP_UPLOAD_COUNT_NOT_PROVEN" "upload count"
  }

  # Exactly one download of the same object
  $downloadPath = Join-Path $downloadDir (Split-Path $objectKey -Leaf)
  $downloadAttempts = 1
  $dl = Invoke-RcloneChild -RclonePath $rclonePath -ConfigPath $rcloneCfg -ArgumentList (
    @("copyto", $remoteTarget, $downloadPath) + $commonArgs
  ) -SecretEnv $secretEnv
  if ($dl.ExitCode -ne 0 -or -not (Test-Path $downloadPath)) {
    $verdict = "PARTIAL_UPLOAD_PASS_READBACK_FAILED"
    Stop-Code $verdict "download failed"
  }
  $downloadSuccess = 1

  # Scrub secret env hashtable values
  foreach ($k in @($secretEnv.Keys)) { $secretEnv[$k] = $null }
  $secretEnv.Clear()

  $dlHash = Get-Sha256Hex $downloadPath
  $dlSize = (Get-Item $downloadPath).Length
  if ($dlHash -ne $encHash -or $dlSize -ne $encSize) {
    $verdict = "FAIL_REMOTE_ROUNDTRIP_INTEGRITY"
    Stop-Code $verdict "hash or size mismatch"
  }
  $srcBytes = [IO.File]::ReadAllBytes($encPath)
  $dlBytes = [IO.File]::ReadAllBytes($downloadPath)
  if ($srcBytes.Length -ne $dlBytes.Length) {
    Stop-Code "FAIL_REMOTE_ROUNDTRIP_INTEGRITY" "byte length"
  }
  for ($i = 0; $i -lt $srcBytes.Length; $i++) {
    if ($srcBytes[$i] -ne $dlBytes[$i]) {
      Stop-Code "FAIL_REMOTE_ROUNDTRIP_INTEGRITY" "byte mismatch"
    }
  }

  # Decrypt downloaded ciphertext
  $restoredZip = Join-Path $restoredDir "restored.zip"
  $ErrorActionPreference = "Continue"
  $null = & $agePath -d -i $identityPath -o $restoredZip -- $downloadPath 2>&1
  $decExit = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($decExit -ne 0 -or -not (Test-Path $restoredZip)) {
    $verdict = "PARTIAL_UPLOAD_AND_READBACK_PASS_DECRYPTION_FAILED"
    Stop-Code $verdict "decrypt failed"
  }
  Expand-Archive -Path $restoredZip -DestinationPath (Join-Path $restoredDir "pkg") -Force
  $restoredManifest = Join-Path $restoredDir "pkg\manifest.json"
  if (-not (Test-Path $restoredManifest)) {
    Stop-Code "FAIL_DECRYPTION_OR_PACKAGE_VALIDATION" "manifest missing after decrypt"
  }
  $rm = Get-Content $restoredManifest -Raw | ConvertFrom-Json
  if ($rm.synthetic -ne $true -or $rm.production_data -ne $false) {
    Stop-Code "FAIL_DECRYPTION_OR_PACKAGE_VALIDATION" "synthetic flags"
  }
  $side = Get-Content (Join-Path $restoredDir "pkg\manifest.sha256") -Raw
  $expectHash = ($side -split "\s+")[0].Trim().ToLowerInvariant()
  $actualHash = Get-Sha256Hex $restoredManifest
  if ($expectHash -ne $actualHash) {
    Stop-Code "FAIL_DECRYPTION_OR_PACKAGE_VALIDATION" "manifest sha256"
  }
  foreach ($prop in $rm.file_checksums_sha256.PSObject.Properties) {
    $rel = $prop.Name
    $want = [string]$prop.Value
    $path = Join-Path (Join-Path $restoredDir "pkg") ($rel -replace "/", "\")
    if (-not (Test-Path $path)) {
      Stop-Code "FAIL_DECRYPTION_OR_PACKAGE_VALIDATION" "missing $rel"
    }
    if ((Get-Sha256Hex $path) -ne $want.ToLowerInvariant()) {
      Stop-Code "FAIL_DECRYPTION_OR_PACKAGE_VALIDATION" "hash $rel"
    }
  }
  $restoredFiles = Get-ChildItem -Path (Join-Path $restoredDir "pkg") -Recurse -File
  if ($restoredFiles.Count -ne $rm.file_count) {
    # file_count was pre-manifest; after archive includes manifest+sha256 — compare to restored tree vs original post-manifest count
    $origCount = (Get-ChildItem -Path $source -Recurse -File).Count
    if ($restoredFiles.Count -ne $origCount) {
      Stop-Code "FAIL_DECRYPTION_OR_PACKAGE_VALIDATION" "file count"
    }
  }

  $verdict = "PASS_ENCRYPTED_SYNTHETIC_WASABI_ROUNDTRIP_VERIFIED"
  $evidence = [ordered]@{
    gate_id                    = "P5-E.10B-W4"
    utc_time                   = ([DateTime]::UtcNow.ToString("o"))
    tool_versions              = @{
      age         = $ageVer
      age_keygen  = $keygenVer
      rclone      = $rcloneVer
    }
    endpoint_class             = "Wasabi Frankfurt"
    region                     = $AllowedRegion
    bucket                     = "REDACTED"
    prefix                     = $AllowedPrefix
    object_name_sha256         = $objectKeyHash
    synthetic                  = $true
    encrypted_before_upload    = $true
    age_encryption             = "PASS"
    upload_count               = $uploadSuccess
    download_count             = $downloadSuccess
    upload_attempts            = $uploadAttempts
    download_attempts          = $downloadAttempts
    encrypted_size_bytes       = $encSize
    local_source_sha256        = $encHash
    readback_sha256            = $dlHash
    byte_comparison            = "PASS"
    decryption                 = "PASS"
    manifest_validation        = "PASS"
    package_validation         = "PASS"
    local_cleanup              = "PENDING"
    remote_object_retained     = $true
    credential_persistence     = $false
    rclone_config_persisted    = $false
    production_data            = $false
    supabase_access            = $false
    delete_attempted           = $false
    network_endpoint_class     = "s3.eu-central-2.wasabisys.com"
    verdict                    = $verdict
  }
  Write-RedactedEvidence $evidence
  Write-Host "W4_ROUNDTRIP_PASS"
  Write-Host ("EVIDENCE_WRITTEN={0}" -f $EvidencePath)
  exit 0
}
catch {
  if ($verdict -eq "STOP_NEEDS_USER_REVIEW") {
    $verdict = "STOP_NEEDS_USER_REVIEW"
  }
  Write-Error $_.Exception.Message
  exit 1
}
finally {
  # Scrub credentials
  Clear-String ([ref]$accessPlain)
  Clear-String ([ref]$secretPlain)
  if ($identityPath -and (Test-Path $identityPath)) {
    try {
      $len = [Math]::Max(64, (Get-Item $identityPath).Length)
      [IO.File]::WriteAllBytes($identityPath, (New-Object byte[] $len))
      Remove-Item -Force $identityPath -ErrorAction SilentlyContinue
    } catch {}
  }
  if ($tmpRoot -and (Test-Path $tmpRoot)) {
    try {
      Remove-Item -Recurse -Force $tmpRoot -ErrorAction Stop
    } catch {
      Write-Error "STOP_LOCAL_CLEANUP_FAILED: $($_.Exception.Message)"
    }
  }
  # Patch evidence cleanup flag if evidence exists and pass
  if ((Test-Path $EvidencePath) -and $verdict -eq "PASS_ENCRYPTED_SYNTHETIC_WASABI_ROUNDTRIP_VERIFIED") {
    try {
      $ev = Get-Content $EvidencePath -Raw -Encoding UTF8 | ConvertFrom-Json
      $ev | Add-Member -NotePropertyName local_cleanup -NotePropertyValue "PASS" -Force
      $ev | Add-Member -NotePropertyName bucket -NotePropertyValue "REDACTED" -Force
      $json = ($ev | ConvertTo-Json -Depth 8)
      $utf8NoBom = New-Object System.Text.UTF8Encoding $false
      [System.IO.File]::WriteAllText($EvidencePath, $json + [Environment]::NewLine, $utf8NoBom)
    } catch {}
  }
}
