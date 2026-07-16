<#
.SYNOPSIS
  P5-E.10B-W5-P1 — Production backup snapshot orchestrator (fail-closed preflight).

.DESCRIPTION
  Safe defaults: -PreflightOnly, -Synthetic, -NoNetwork.
  Never dumps Production/Staging, never contacts Wasabi, never requests credentials.
  Live production snapshot requires every confirmation switch AND remains blocked
  in this preflight gate with STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED.

  Synthetic offline mode builds a mock production-shaped package, encrypts with an
  ephemeral test age key, transfers via local rclone filesystem copy, verifies
  restore locally, and cleans up.
#>
[CmdletBinding()]
param(
  [switch]$PreflightOnly = $true,
  [switch]$NoPreflightOnly,
  [bool]$Synthetic = $true,
  [switch]$NoSynthetic,
  [bool]$NoNetwork = $true,
  [switch]$AllowNetwork,
  [switch]$RunSyntheticOfflineTest,
  [switch]$RunNegativeTests,

  # Live authorizations — ALL required for a future real run; none enable live work here.
  [switch]$AllowProductionRead,
  [switch]$AllowSupabaseStorageRead,
  [switch]$AllowExternalWasabiUpload,
  [string]$ConfirmProductionProjectRef = "",
  [switch]$ConfirmReleaseGateLocked,
  [switch]$ConfirmEncryptedOutputOnly,
  [switch]$ConfirmWasabiProductionScope,
  [switch]$ConfirmLocalArtifactPath,
  [switch]$ConfirmUserAuthorizedSnapshot,

  # Paths (never credentials)
  [string]$OutputDirectory = "",
  [string]$LocalArtifactConfigPath = "",
  [string]$ProductionRecipientPublicKey = "",
  [string]$WasabiProductionPrefix = "production-snapshots/"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ExpectedProductionRef = "ohkoojpzmptdfyowdgog"
$ForbiddenStagingRef = "jzzgoiwfbuwiiyvwgwri"
$BucketAllowlist = @("avatars", "discovery-uploads", "report-screenshots")
$SchemaAllowlist = @("public", "auth", "storage", "extensions", "graphql_public", "realtime")
$TrialPrefixForbidden = "trial-integration/"
$MinFreeBytesHint = 2GB

function Stop-Code([string]$Code, [string]$Message) {
  Write-Error ("{0}: {1}" -f $Code, $Message)
  exit 1
}

function Test-OutsideRepo([string]$Path) {
  $full = [IO.Path]::GetFullPath($Path)
  if ($full.StartsWith($RepoRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "STOP_OUTPUT_INSIDE_REPOSITORY: path inside repository"
  }
  $unsafeParents = @("Downloads", "Desktop", "OneDrive", "Dropbox", "Google Drive")
  foreach ($u in $unsafeParents) {
    if ($full -match [regex]::Escape("\$u\") -or $full -match [regex]::Escape("/$u/")) {
      throw "STOP_OUTPUT_PATH_UNSAFE: path under $u is not allowed for production artefacts"
    }
  }
  return $full
}

function Get-Sha256Hex([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

function Assert-SchemaAllowlist([string[]]$Observed) {
  foreach ($s in $Observed) {
    if ($SchemaAllowlist -notcontains $s) {
      throw "STOP_UNKNOWN_DATABASE_SCHEMA: schema not allowlisted: $s"
    }
  }
}

function Assert-BucketAllowlist([string[]]$Observed) {
  foreach ($b in $Observed) {
    if ($BucketAllowlist -notcontains $b) {
      throw "STOP_UNKNOWN_STORAGE_BUCKET: bucket not allowlisted: $b"
    }
  }
}

function Test-AllLiveGuardsPresent {
  $missing = @()
  if (-not $AllowProductionRead) { $missing += "AllowProductionRead" }
  if (-not $AllowSupabaseStorageRead) { $missing += "AllowSupabaseStorageRead" }
  if (-not $AllowExternalWasabiUpload) { $missing += "AllowExternalWasabiUpload" }
  if ($ConfirmProductionProjectRef -ne $ExpectedProductionRef) { $missing += "ConfirmProductionProjectRef" }
  if (-not $ConfirmReleaseGateLocked) { $missing += "ConfirmReleaseGateLocked" }
  if (-not $ConfirmEncryptedOutputOnly) { $missing += "ConfirmEncryptedOutputOnly" }
  if (-not $ConfirmWasabiProductionScope) { $missing += "ConfirmWasabiProductionScope" }
  if (-not $ConfirmLocalArtifactPath) { $missing += "ConfirmLocalArtifactPath" }
  if (-not $ConfirmUserAuthorizedSnapshot) { $missing += "ConfirmUserAuthorizedSnapshot" }
  return $missing
}

# --- Normalize switches ---
if ($NoPreflightOnly) { $PreflightOnly = $false }
if ($NoSynthetic) { $Synthetic = $false }
if ($AllowNetwork) { $NoNetwork = $false }

# Capability denials (never implemented in this gate)
$DeleteImplemented = $false
$BucketCreateImplemented = $false
$LifecycleImplemented = $false
$VersioningImplemented = $false
$ObjectLockImplemented = $false
$LiveDumpImplemented = $false

if ($DeleteImplemented -or $BucketCreateImplemented -or $LifecycleImplemented -or $VersioningImplemented -or $ObjectLockImplemented -or $LiveDumpImplemented) {
  Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "forbidden capability enabled"
}

# Staging / wrong project early
if ($ConfirmProductionProjectRef -eq $ForbiddenStagingRef) {
  Stop-Code "STOP_STAGING_TARGET" "staging ref forbidden"
}
if ($ConfirmProductionProjectRef -and $ConfirmProductionProjectRef -ne $ExpectedProductionRef -and $ConfirmProductionProjectRef -ne "") {
  Stop-Code "STOP_WRONG_PROJECT" "unexpected project ref"
}

# Wasabi production prefix must never equal trial prefix
if ($WasabiProductionPrefix -eq $TrialPrefixForbidden -or $WasabiProductionPrefix.StartsWith($TrialPrefixForbidden)) {
  Stop-Code "STOP_REMOTE_SCOPE_NOT_AUTHORIZED" "trial-integration prefix is not a production scope"
}

# Any attempt at live/non-synthetic/network without full guards → hard stop
$liveIntent = (-not $PreflightOnly) -or (-not $Synthetic) -or (-not $NoNetwork) -or $AllowProductionRead -or $AllowSupabaseStorageRead -or $AllowExternalWasabiUpload
if ($liveIntent) {
  $missing = Test-AllLiveGuardsPresent
  if ($missing.Count -gt 0) {
    Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" ("missing guards: " + ($missing -join ","))
  }
  # Even with all guards, this preflight gate never executes live dump/upload.
  Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "live Production snapshot is not authorized in W5-P1 preflight"
}

if (-not $NoNetwork) {
  Stop-Code "STOP_NETWORK_FORBIDDEN" "network not authorized in W5-P1"
}

# Preflight summary (default path)
$preflight = [ordered]@{
  gate_id                              = "P5-E.10B-W5-P1"
  preflight_only                       = [bool]$PreflightOnly
  synthetic                            = [bool]$Synthetic
  no_network                           = [bool]$NoNetwork
  production_read_default              = $false
  wasabi_upload_default                = $false
  delete_implemented                   = $false
  bucket_create_implemented            = $false
  expected_production_ref_guard        = $ExpectedProductionRef
  staging_ref_blocked                  = $ForbiddenStagingRef
  schema_allowlist                     = $SchemaAllowlist
  bucket_allowlist                     = $BucketAllowlist
  recommended_wasabi_prefix            = "production-snapshots/<backup-id>/"
  trial_prefix_forbidden_for_production = $TrialPrefixForbidden
  role_passwords_included              = $false
  plaintext_upload_allowed             = $false
  production_key_created_by_runner     = $false
  credentials_as_parameters             = $false
  live_dump_authorized                 = $false
  planned_db_format                    = "pg_dump custom (-Fc) + pg_dumpall --roles-only --no-role-passwords"
  planned_encryption                   = "age"
  validation_status                    = "PREFLIGHT_READY"
}

if ($PreflightOnly -and -not $RunSyntheticOfflineTest -and -not $RunNegativeTests) {
  $preflight | ConvertTo-Json -Depth 6
  Write-Host "PREFLIGHT_PASS"
  exit 0
}

# --- Negative tests (offline) ---
if ($RunNegativeTests) {
  $neg = @()
  function Expect-Stop([scriptblock]$Block, [string]$Code) {
    try {
      & $Block
      $script:neg += "FAIL expected $Code"
    } catch {
      if ("$($_.Exception.Message)" -match [regex]::Escape($Code) -or "$($_)" -match [regex]::Escape($Code)) {
        $script:neg += "PASS $Code"
      } else {
        $script:neg += "FAIL $Code got $($_.Exception.Message)"
      }
    }
  }

  # Invoke self with bad args via nested powershell for isolation
  $self = $PSCommandPath
  $cases = @(
    @{ Args = @("-NoPreflightOnly", "-ConfirmProductionProjectRef", $ForbiddenStagingRef); Code = "STOP_STAGING_TARGET" },
    @{ Args = @("-NoPreflightOnly", "-ConfirmProductionProjectRef", "not-a-real-ref"); Code = "STOP_WRONG_PROJECT" },
    @{ Args = @("-NoPreflightOnly", "-AllowProductionRead"); Code = "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" },
    @{ Args = @("-AllowNetwork"); Code = "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" },
    @{ Args = @("-WasabiProductionPrefix", "trial-integration/"); Code = "STOP_REMOTE_SCOPE_NOT_AUTHORIZED" }
  )
  foreach ($c in $cases) {
    $errFile = Join-Path $env:TEMP ("bl-w5-neg-err-" + [Guid]::NewGuid().ToString("N") + ".txt")
    $outFile = Join-Path $env:TEMP ("bl-w5-neg-out-" + [Guid]::NewGuid().ToString("N") + ".txt")
    $p = Start-Process -FilePath "powershell" -ArgumentList (
      @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $self) + $c.Args
    ) -Wait -PassThru -NoNewWindow -RedirectStandardError $errFile -RedirectStandardOutput $outFile
    $err = Get-Content $errFile -Raw -ErrorAction SilentlyContinue
    $out = Get-Content $outFile -Raw -ErrorAction SilentlyContinue
    $blob = "$err`n$out"
    Remove-Item -Force $errFile, $outFile -ErrorAction SilentlyContinue
    if ($p.ExitCode -ne 0 -and $blob -match [regex]::Escape($c.Code)) {
      $neg += "PASS $($c.Code)"
    } else {
      $neg += "FAIL $($c.Code) exit=$($p.ExitCode)"
    }
  }

  # In-process allowlist negatives
  try { Assert-SchemaAllowlist @("public", "evil_schema"); $neg += "FAIL STOP_UNKNOWN_DATABASE_SCHEMA" }
  catch { if ("$_" -match "STOP_UNKNOWN_DATABASE_SCHEMA") { $neg += "PASS STOP_UNKNOWN_DATABASE_SCHEMA" } else { $neg += "FAIL schema $($_.Exception.Message)" } }
  try { Assert-BucketAllowlist @("avatars", "secret-bucket"); $neg += "FAIL STOP_UNKNOWN_STORAGE_BUCKET" }
  catch { if ("$_" -match "STOP_UNKNOWN_STORAGE_BUCKET") { $neg += "PASS STOP_UNKNOWN_STORAGE_BUCKET" } else { $neg += "FAIL bucket $($_.Exception.Message)" } }
  try { [void](Test-OutsideRepo (Join-Path $RepoRoot "tools\backup\_must_not")); $neg += "FAIL STOP_OUTPUT_INSIDE_REPOSITORY" }
  catch { if ("$_" -match "STOP_OUTPUT_INSIDE_REPOSITORY") { $neg += "PASS STOP_OUTPUT_INSIDE_REPOSITORY" } else { $neg += "FAIL repo $($_.Exception.Message)" } }

  $failed = @($neg | Where-Object { $_ -like "FAIL*" })
  $result = [ordered]@{
    negative_tests = $neg
    failures       = $failed.Count
    validation_status = $(if ($failed.Count -eq 0) { "PASS_NEGATIVE_TESTS" } else { "FAIL_NEGATIVE_TESTS" })
    external_requests = 0
  }
  $result | ConvertTo-Json -Depth 6
  if ($failed.Count -gt 0) { exit 1 }
  Write-Host "NEGATIVE_TESTS_PASS"
  if (-not $RunSyntheticOfflineTest) { exit 0 }
}

# --- Synthetic offline package test ---
if (-not $RunSyntheticOfflineTest) {
  Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "pass -RunSyntheticOfflineTest for offline synthetic package"
}

$age = Get-Command age -ErrorAction SilentlyContinue
$keygen = Get-Command age-keygen -ErrorAction SilentlyContinue
$rclone = Get-Command rclone -ErrorAction SilentlyContinue
if (-not $age -or -not $keygen) { Stop-Code "STOP_ENCRYPTION_UNAVAILABLE" "age/age-keygen required" }
if (-not $rclone) { Stop-Code "STOP_ENCRYPTION_UNAVAILABLE" "rclone required for local transfer simulation" }

$tmp = $null
$identity = $null
try {
  $tmp = Join-Path $env:TEMP ("boundlore-w5p1-" + [Guid]::NewGuid().ToString("N"))
  try {
    [void](Test-OutsideRepo $tmp)
  } catch {
    Stop-Code "STOP_OUTPUT_INSIDE_REPOSITORY" $_.Exception.Message
  }
  $pkgRoot = Join-Path $tmp "boundlore-production-backup-SYNTH"
  $keys = Join-Path $tmp "keys"
  $xfer = Join-Path $tmp "local-transfer"
  $restored = Join-Path $tmp "restored"
  foreach ($d in @(
      $pkgRoot,
      (Join-Path $pkgRoot "manifest"),
      (Join-Path $pkgRoot "database"),
      (Join-Path $pkgRoot "storage\avatars"),
      (Join-Path $pkgRoot "storage\discovery-uploads"),
      (Join-Path $pkgRoot "storage\report-screenshots"),
      (Join-Path $pkgRoot "configuration"),
      (Join-Path $pkgRoot "evidence"),
      $keys, $xfer, $restored
    )) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
  }

  Assert-SchemaAllowlist $SchemaAllowlist
  Assert-BucketAllowlist $BucketAllowlist

  # Mock database artefacts (never live)
  $db = Join-Path $pkgRoot "database"
  Set-Content -Path (Join-Path $db "roles.sql") -Value "-- synthetic roles; role_passwords_included=false`n" -Encoding UTF8
  [IO.File]::WriteAllBytes((Join-Path $db "database.custom"), [Text.Encoding]::ASCII.GetBytes("PGDUMP_CUSTOM_SYNTHETIC"))
  Set-Content -Path (Join-Path $db "database-toc.txt") -Value "TOC synthetic`n" -Encoding UTF8
  @'
{"schemas":["public","auth","storage","extensions","graphql_public","realtime"],"source":"synthetic"}
'@ | Set-Content -Path (Join-Path $db "schema-inventory.json") -Encoding UTF8
  @'
{"extensions":[{"name":"pgcrypto","version":"synthetic"}],"source":"synthetic"}
'@ | Set-Content -Path (Join-Path $db "extensions-inventory.json") -Encoding UTF8
  @'
{"rls_expected":true,"security_definer_inventory":"synthetic","source":"synthetic"}
'@ | Set-Content -Path (Join-Path $db "security-inventory.json") -Encoding UTF8
  @'
{"release_gate_expected_locked":true,"contribution_locked":true,"source":"synthetic"}
'@ | Set-Content -Path (Join-Path $db "validation-baseline.json") -Encoding UTF8

  # Three mock buckets
  [IO.File]::WriteAllBytes((Join-Path $pkgRoot "storage\avatars\synthetic-a.bin"), [byte[]](1, 2, 3))
  Set-Content -Path (Join-Path $pkgRoot "storage\discovery-uploads\synthetic-d.txt") -Value "synth`n" -Encoding UTF8
  [IO.File]::WriteAllBytes((Join-Path $pkgRoot "storage\report-screenshots\synthetic-r.bin"), [byte[]](9, 8, 7))
  @'
{"buckets":["avatars","discovery-uploads","report-screenshots"],"synthetic":true}
'@ | Set-Content -Path (Join-Path $pkgRoot "storage\storage-manifest.json") -Encoding UTF8

  # Redacted configuration inventories (names only)
  @'
{"project_ref":"REDACTED_UNTIL_ENCRYPTED","region":"eu-central-1","auth_providers":["email"],"secret_values":"NEVER"}
'@ | Set-Content -Path (Join-Path $pkgRoot "configuration\supabase-recovery-inventory.json") -Encoding UTF8
  @'
{"pages_project":"boundlore","custom_domain_procedure":"documented-offline","secret_values":"NEVER"}
'@ | Set-Content -Path (Join-Path $pkgRoot "configuration\cloudflare-recovery-inventory.json") -Encoding UTF8
  @'
{"repository":"TheOverseer47/boundlore-wiki","secret_values":"NEVER"}
'@ | Set-Content -Path (Join-Path $pkgRoot "configuration\github-recovery-inventory.json") -Encoding UTF8

  $utc = [DateTime]::UtcNow.ToString("o")
  $backupId = "boundlore-production-backup-SYNTH-" + [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
  $fullManifest = [ordered]@{
    format_version                   = "1.0.0"
    backup_id                        = $backupId
    created_at_utc                   = $utc
    source_environment               = "synthetic"
    source_project_ref               = "SYNTHETIC_NOT_PRODUCTION"
    source_region                    = "eu-central-1"
    git_commit                       = "local-preflight"
    release_gate_expected_locked     = $true
    release_gate_observed_locked     = $true
    database_components              = @("roles", "custom-dump", "inventories")
    database_schema_inventory        = $SchemaAllowlist
    role_dump_present                = $true
    role_passwords_included          = $false
    storage_buckets                  = $BucketAllowlist
    storage_object_counts            = @{ avatars = 1; "discovery-uploads" = 1; "report-screenshots" = 1 }
    storage_hash_algorithm           = "SHA-256"
    encryption_method                = "age"
    encryption_recipient_fingerprint = "ephemeral-test-only"
    plaintext_uploaded               = $false
    wasabi_region                    = "eu-central-2"
    wasabi_bucket_redacted           = "REDACTED"
    wasabi_prefix                    = "production-snapshots/"
    local_copy_present               = $true
    offsite_copy_present             = $false
    validation_status                = "synthetic_packaged"
    cleanup_status                   = "pending"
    restore_test_status              = "pending"
    created_by_gate                  = "P5-E.10B-W5-P1"
    tool_versions                    = @{
      age    = ((& age --version) | Out-String).Trim()
      rclone = (((& rclone version) | Select-Object -First 1) | Out-String).Trim()
    }
  }
  ($fullManifest | ConvertTo-Json -Depth 8) | Set-Content -Path (Join-Path $pkgRoot "manifest\backup-manifest.json") -Encoding UTF8

  $publicSummary = [ordered]@{
    gate_id            = "P5-E.10B-W5-P1"
    backup_id          = $backupId
    synthetic          = $true
    production_data    = $false
    encryption_method  = "age"
    plaintext_uploaded = $false
    validation_status  = "synthetic_packaged"
  }
  ($publicSummary | ConvertTo-Json -Depth 4) | Set-Content -Path (Join-Path $pkgRoot "manifest\public-summary.json") -Encoding UTF8

  # Ephemeral age key (test only — never production)
  $identity = Join-Path $keys "ephemeral.identity"
  $prev = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $null = & age-keygen -o $identity 2>&1
  $kg = $LASTEXITCODE
  $recipient = ((& age-keygen -y $identity 2>$null) | Out-String).Trim()
  $ErrorActionPreference = $prev
  if ($kg -ne 0 -or -not (Test-Path $identity) -or -not $recipient.StartsWith("age1")) {
    Stop-Code "STOP_ENCRYPTION_FAILED" "ephemeral keygen failed"
  }

  # Encrypt sensitive files to .age (simulate production package shape)
  $toEncrypt = @(
    "manifest\backup-manifest.json",
    "database\roles.sql",
    "database\database.custom",
    "database\database-toc.txt",
    "database\schema-inventory.json",
    "database\extensions-inventory.json",
    "database\security-inventory.json",
    "database\validation-baseline.json",
    "storage\storage-manifest.json",
    "configuration\supabase-recovery-inventory.json",
    "configuration\cloudflare-recovery-inventory.json",
    "configuration\github-recovery-inventory.json"
  )
  foreach ($rel in $toEncrypt) {
    $src = Join-Path $pkgRoot $rel
    $dst = "$src.age"
    $ErrorActionPreference = "Continue"
    $null = & age -r $recipient -o $dst -- $src 2>&1
    $ae = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    if ($ae -ne 0 -or -not (Test-Path $dst)) {
      Stop-Code "STOP_ENCRYPTION_FAILED" "encrypt $rel"
    }
    $hash = Get-Sha256Hex $dst
    Set-Content -Path ($dst + ".sha256") -Value ("{0}  {1}" -f $hash, (Split-Path $dst -Leaf)) -Encoding ASCII
    Remove-Item -Force $src
  }
  $recipient = $null

  # Refuse plaintext upload sources
  $encSample = Join-Path $pkgRoot "manifest\backup-manifest.json.age"
  if (-not $encSample.EndsWith(".age")) {
    Stop-Code "STOP_PLAINTEXT_UPLOAD_ATTEMPTED" "upload source must be .age"
  }

  # Local rclone filesystem copy (no remote)
  $localDest = Join-Path $xfer "backup-manifest.json.age"
  $ErrorActionPreference = "Continue"
  $null = & rclone copyto $encSample $localDest --retries 1 --low-level-retries 1 2>&1
  $rc = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($rc -ne 0 -or -not (Test-Path $localDest)) {
    Stop-Code "STOP_CHECKSUM_FAILED" "local rclone copy failed"
  }
  if ((Get-Sha256Hex $encSample) -ne (Get-Sha256Hex $localDest)) {
    Stop-Code "STOP_CHECKSUM_FAILED" "transfer hash mismatch"
  }

  # Local decrypt verify
  $plainOut = Join-Path $restored "backup-manifest.json"
  $ErrorActionPreference = "Continue"
  $null = & age -d -i $identity -o $plainOut -- $localDest 2>&1
  $de = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($de -ne 0 -or -not (Test-Path $plainOut)) {
    Stop-Code "STOP_ENCRYPTION_FAILED" "decrypt failed"
  }
  $restoredManifest = Get-Content $plainOut -Raw | ConvertFrom-Json
  if ($restoredManifest.role_passwords_included -ne $false) {
    Stop-Code "STOP_MANIFEST_INCOMPLETE" "role passwords must be false"
  }
  if ($restoredManifest.plaintext_uploaded -ne $false) {
    Stop-Code "STOP_PLAINTEXT_UPLOAD_ATTEMPTED" "manifest claims plaintext upload"
  }
  if ($restoredManifest.source_environment -ne "synthetic") {
    Stop-Code "STOP_MANIFEST_INCOMPLETE" "expected synthetic source"
  }

  $summary = [ordered]@{
    gate_id             = "P5-E.10B-W5-P1"
    synthetic           = $true
    production_data     = $false
    encryption          = "PASS"
    local_transfer      = "PASS"
    decrypt_verify      = "PASS"
    external_requests   = 0
    wasabi_requests     = 0
    supabase_requests   = 0
    validation_status   = "PASS_SYNTHETIC_OFFLINE_PRODUCTION_SHAPE"
  }
  ($summary | ConvertTo-Json -Depth 5) | Set-Content -Path (Join-Path $pkgRoot "evidence\snapshot-summary.json") -Encoding UTF8
  Write-Host ($summary | ConvertTo-Json -Compress)
  Write-Host "SYNTHETIC_OFFLINE_PASS"
  exit 0
}
finally {
  if ($identity -and (Test-Path $identity)) {
    try {
      $len = [Math]::Max(64, (Get-Item $identity).Length)
      [IO.File]::WriteAllBytes($identity, (New-Object byte[] $len))
      Remove-Item -Force $identity -ErrorAction SilentlyContinue
    } catch {}
  }
  if ($tmp -and (Test-Path $tmp)) {
    try {
      Remove-Item -Recurse -Force $tmp -ErrorAction Stop
    } catch {
      Write-Error "STOP_LOCAL_CLEANUP_FAILED: $($_.Exception.Message)"
    }
  }
}
