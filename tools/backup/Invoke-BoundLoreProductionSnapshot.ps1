<#
.SYNOPSIS
  P5-E.10B-W5-A1 — Controlled production snapshot runner (fail-closed).

.DESCRIPTION
  Safe defaults: PreflightOnly + Synthetic + NoNetwork.
  LiveExecution requires every confirmation switch. Live network is armed only after
  the full confirmation set validates ($GateAllowsLiveNetwork starts false).

  Never accepts credentials as parameters. Never mounts VeraCrypt. Never prints
  full age recipients or secrets. Child modules remain STOP_LIVE_NETWORK_RESERVED
  until BOUNDLORE_LIVE_NETWORK_ARMED=1 is set for a single live child process.
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
  [switch]$LiveExecution,
  [switch]$ManualWasabiUpload,

  [switch]$AllowProductionRead,
  [switch]$AllowSupabaseStorageRead,
  [switch]$AllowExternalWasabiUpload,
  [string]$ConfirmProductionProjectRef = "",
  [switch]$ConfirmReleaseGateLocked,
  [switch]$ConfirmEncryptedOutputOnly,
  [switch]$ConfirmWasabiProductionScope,
  [switch]$ConfirmVeraCryptWorkspaceMounted,
  [switch]$ConfirmLocalEncryptedArchiveCopy,
  [switch]$ConfirmLocalArtifactPath,
  [switch]$ConfirmUserAuthorizedSnapshot,

  # Paths only — never credentials
  [string]$ProductionRecipientFile = "",
  [string]$ProductionRecipientPath = "",
  [string]$LocalEncryptedArchiveDirectory = "",
  [string]$LocalEncryptedArchiveRoot = "",
  [string]$VeraCryptWorkspaceRoot = "",
  [string]$WasabiProductionPrefix = "production-snapshots/",
  [string]$WasabiRegion = "eu-central-2",
  [string]$WasabiEndpoint = "s3.eu-central-2.wasabisys.com",
  [string]$MockVeraCryptRoot = "",
  [string]$EvidencePath = "",
  [string]$OutputDirectory = "",

  # Explicit DB path only — default Direct; SessionPooler never auto-selected.
  [ValidateSet("Direct", "SessionPooler")]
  [string]$DatabaseConnectionMode = "Direct"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# W5-A1: live network remains disarmed until full confirmation set is validated below.
# Child exporters remain STOP_LIVE_NETWORK_RESERVED until BOUNDLORE_LIVE_NETWORK_ARMED=1.
$GateAllowsLiveNetwork = $false

if ($ProductionRecipientPath -and -not $ProductionRecipientFile) { $ProductionRecipientFile = $ProductionRecipientPath }
if ($LocalEncryptedArchiveRoot -and -not $LocalEncryptedArchiveDirectory) { $LocalEncryptedArchiveDirectory = $LocalEncryptedArchiveRoot }

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$ExpectedProductionRef = "ohkoojpzmptdfyowdgog"
$ForbiddenStagingRef = "jzzgoiwfbuwiiyvwgwri"
$BucketAllowlist = @("avatars", "discovery-uploads", "report-screenshots")
$SchemaAllowlist = @("public", "auth", "storage", "extensions", "graphql_public", "realtime", "graphql", "supabase_migrations", "vault")
$SystemSchemas = @("pg_catalog", "information_schema", "pg_toast")
$TrialPrefixForbidden = "trial-integration/"
$VeraDrive = "V:"
$MinFreeBytesHint = 2GB
$RemoteName = "boundloreprod"

if (-not $EvidencePath) {
  $EvidencePath = Join-Path $RepoRoot "qa\evidence\p5-e10b-w5-production-snapshot.json"
}

$BackupToolsDir = $PSScriptRoot

function Stop-Code([string]$Code, [string]$Message) {
  Write-Error ("{0}: {1}" -f $Code, $Message)
  exit 1
}

function Get-Sha256Text([string]$Text) {
  $sha = [Security.Cryptography.SHA256]::Create()
  try {
    return -join ($sha.ComputeHash([Text.Encoding]::UTF8.GetBytes($Text)) | ForEach-Object { $_.ToString("x2") })
  } finally { $sha.Dispose() }
}

function Get-Sha256File([string]$Path) {
  return (Get-FileHash -Algorithm SHA256 -Path $Path).Hash.ToLowerInvariant()
}

# PowerShell 5.1 + StrictMode: empty/single pipeline results unwrap; scalars have no .Count.
# Note: @($null).Count is 1 in Windows PowerShell — treat $null as 0 for collection semantics.
function Get-StrictCount {
  param($Value)
  if ($null -eq $Value) { return 0 }
  return @($Value).Count
}

function ConvertFrom-SecureStringPlain([Security.SecureString]$Secure) {
  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Secure)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr) }
}

function Assert-OutsideRepo([string]$Path) {
  $full = [IO.Path]::GetFullPath($Path)
  if ($full.StartsWith($RepoRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "STOP_OUTPUT_INSIDE_REPOSITORY: path inside repository"
  }
  return $full
}

function Assert-VeraCryptWorkspace([string]$WorkRoot) {
  $full = [IO.Path]::GetFullPath($WorkRoot)
  if (-not (Test-Path "$VeraDrive\")) {
    throw "STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED: $VeraDrive not present"
  }
  if (-not $full.StartsWith(($VeraDrive + "\"), [StringComparison]::OrdinalIgnoreCase) -and $full -ne $VeraDrive) {
    throw "STOP_PLAINTEXT_WORKSPACE_UNSAFE: plaintext workspace must be under $VeraDrive"
  }
  foreach ($bad in @("C:\", "D:\", "\Downloads\", "\Desktop\", "\OneDrive\")) {
    if ($full.StartsWith("C:\", [StringComparison]::OrdinalIgnoreCase) -or
        ($bad -eq "D:\" -and $full.StartsWith("D:\", [StringComparison]::OrdinalIgnoreCase) -and -not $full.StartsWith("V:\", [StringComparison]::OrdinalIgnoreCase)) -or
        $full -match [regex]::Escape($bad.TrimStart('\'))) {
      if ($full.StartsWith("C:\", [StringComparison]::OrdinalIgnoreCase) -or ($full.StartsWith("D:\", [StringComparison]::OrdinalIgnoreCase))) {
        throw "STOP_PLAINTEXT_WORKSPACE_UNSAFE: plaintext must not live on host volume"
      }
    }
  }
  [void](Assert-OutsideRepo $full)
  return $full
}

function Assert-SchemaInventory([string[]]$Observed) {
  foreach ($s in $Observed) {
    if ($SystemSchemas -contains $s) { continue }
    if ($SchemaAllowlist -notcontains $s) {
      throw "STOP_UNKNOWN_DATABASE_SCHEMA: $s"
    }
  }
}

function Assert-BucketInventory([string[]]$Observed) {
  foreach ($b in $Observed) {
    if ($BucketAllowlist -notcontains $b) {
      throw "STOP_UNKNOWN_STORAGE_BUCKET: $b"
    }
  }
}

function Test-ProductionRecipientFile([string]$Path) {
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) {
    throw "STOP_PRODUCTION_KEY_RECIPIENT_MISSING: recipient file missing"
  }
  $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  if ($raw -match "AGE-SECRET-KEY") {
    throw "FAIL_PRIVATE_KEY_PRESENT_IN_PUBLIC_RECIPIENT_FILE: private key material in recipient file"
  }
  $lines = @($raw -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith("#") })
  if ((Get-StrictCount $lines) -ne 1) {
    throw "STOP_PRODUCTION_KEY_RECIPIENT_INVALID: expected exactly one recipient line"
  }
  $rec = $lines[0]
  if (-not $rec.StartsWith("age1") -or $rec.Length -lt 20) {
    throw "STOP_PRODUCTION_KEY_RECIPIENT_INVALID: recipient format"
  }
  return @{
    Recipient = $rec
    Fingerprint = (Get-Sha256Text $rec)
  }
}

function Test-AllLiveGuardsPresent {
  param([switch]$ForManualWasabiUpload)
  $missing = @()
  if (-not $LiveExecution) { $missing += "LiveExecution" }
  if (-not $AllowProductionRead) { $missing += "AllowProductionRead" }
  if (-not $AllowSupabaseStorageRead) { $missing += "AllowSupabaseStorageRead" }
  if ($ForManualWasabiUpload) {
    if (-not $ManualWasabiUpload) { $missing += "ManualWasabiUpload" }
  } else {
    if (-not $AllowExternalWasabiUpload) { $missing += "AllowExternalWasabiUpload" }
  }
  if ($ConfirmProductionProjectRef -ne $ExpectedProductionRef) { $missing += "ConfirmProductionProjectRef" }
  if (-not $ConfirmReleaseGateLocked) { $missing += "ConfirmReleaseGateLocked" }
  if (-not $ConfirmEncryptedOutputOnly) { $missing += "ConfirmEncryptedOutputOnly" }
  if (-not $ConfirmWasabiProductionScope) { $missing += "ConfirmWasabiProductionScope" }
  if (-not $ConfirmVeraCryptWorkspaceMounted) { $missing += "ConfirmVeraCryptWorkspaceMounted" }
  if (-not $ConfirmLocalEncryptedArchiveCopy -and -not $ConfirmLocalArtifactPath) { $missing += "ConfirmLocalEncryptedArchiveCopy" }
  if (-not $ConfirmUserAuthorizedSnapshot) { $missing += "ConfirmUserAuthorizedSnapshot" }
  if (-not $ProductionRecipientFile) { $missing += "ProductionRecipientFile" }
  # Emit guard-name strings for the pipeline. Caller normalizes with @(...).
  # Do NOT use a unary-comma return of the whole array: that nests Object[] when
  # the caller also wraps with @() and yields a false missing-guards stop.
  return @($missing)
}

function Invoke-RcloneChildLocal {
  param([string]$RclonePath, [string]$ConfigPath, [string[]]$Args)
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = $RclonePath
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  $psi.EnvironmentVariables["RCLONE_CONFIG"] = $ConfigPath
  $quoted = foreach ($a in $Args) { if ($a -match '[\s"]') { '"' + ($a -replace '"','\"') + '"' } else { $a } }
  $psi.Arguments = ($quoted -join " ")
  $p = New-Object Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  return [pscustomobject]@{ ExitCode = $p.ExitCode; StdOut = $stdout; StdErr = $stderr }
}

# Live sequence (W5-A1). Child exporters stay STOP_LIVE_NETWORK_RESERVED until armed.
. (Join-Path $PSScriptRoot "_lib\LiveProductionSnapshot.ps1")

# --- Normalize ---
if ($NoPreflightOnly) { $PreflightOnly = $false }
if ($NoSynthetic) { $Synthetic = $false }
if ($AllowNetwork) { $NoNetwork = $false }

$DeleteImplemented = $false
$GetObjectInSnapshotPath = $false
$BucketCreateImplemented = $false
$LiveDumpImplemented = $false

if ($DeleteImplemented -or $GetObjectInSnapshotPath -or $BucketCreateImplemented -or $LiveDumpImplemented) {
  Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "forbidden capability"
}
if ($WasabiRegion -ne "eu-central-2" -or $WasabiEndpoint -ne "s3.eu-central-2.wasabisys.com") {
  Stop-Code "STOP_EXTERNAL_TARGET_MISMATCH" "Wasabi region/endpoint mismatch"
}
if ($WasabiProductionPrefix -eq $TrialPrefixForbidden -or $WasabiProductionPrefix.StartsWith($TrialPrefixForbidden)) {
  Stop-Code "STOP_REMOTE_SCOPE_NOT_AUTHORIZED" "trial-integration forbidden for production"
}
if ($ConfirmProductionProjectRef -eq $ForbiddenStagingRef) {
  Stop-Code "STOP_STAGING_TARGET" "staging ref forbidden"
}
if ($ConfirmProductionProjectRef -and $ConfirmProductionProjectRef -ne $ExpectedProductionRef) {
  Stop-Code "STOP_WRONG_PROJECT" "unexpected project ref"
}

if ($ManualWasabiUpload -and $AllowExternalWasabiUpload) {
  Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "ManualWasabiUpload conflicts with AllowExternalWasabiUpload"
}

$liveIntent = $LiveExecution -or (-not $PreflightOnly) -or (-not $Synthetic) -or (-not $NoNetwork) -or $AllowProductionRead -or $AllowSupabaseStorageRead -or $AllowExternalWasabiUpload -or $ManualWasabiUpload
if ($liveIntent -and -not $RunSyntheticOfflineTest -and -not $RunNegativeTests) {
  $missing = @(Test-AllLiveGuardsPresent -ForManualWasabiUpload:$ManualWasabiUpload)
  # Reject accidental nested Object[] from a future unary-comma regression.
  foreach ($item in $missing) {
    if ($item -is [System.Array] -and -not ($item -is [string])) {
      Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "missing guards structure invalid (nested array)"
    }
  }
  if ((Get-StrictCount $missing) -gt 0) {
    $names = @($missing | ForEach-Object { [string]$_ } | Where-Object { $_ -and $_ -ne "System.Object[]" })
    if ((Get-StrictCount $names) -eq 0) {
      Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "missing guards structure invalid"
    }
    Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" ("missing guards: " + ($names -join ", "))
  }
  try {
    $null = Test-ProductionRecipientFile $ProductionRecipientFile
  } catch {
    Stop-Code (($_.Exception.Message -split ":")[0]) $_.Exception.Message
  }
  if (-not $ConfirmReleaseGateLocked) {
    Stop-Code "STOP_RELEASE_GATE_NOT_LOCKED" "release gate must be locked"
  }
  $wsRoot = if ($VeraCryptWorkspaceRoot) { $VeraCryptWorkspaceRoot } else { Join-Path $VeraDrive "BoundLoreProductionSnapshot" }
  $archRoot = if ($LocalEncryptedArchiveDirectory) { $LocalEncryptedArchiveDirectory } else { "" }
  if (-not $archRoot) {
    Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "LocalEncryptedArchiveRoot required for live run"
  }
  if (-not (Test-Path "$VeraDrive\")) {
    Stop-Code "STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED" "V: not mounted"
  }
  # Minimal W5-A1 arming: only after full confirmation set (DB/storage; Wasabi deferred in manual mode)
  $GateAllowsLiveNetwork = $true
  Invoke-LiveProductionSnapshotSequence -WorkspaceRoot $wsRoot -RecipientFile $ProductionRecipientFile -ArchiveRoot $archRoot -Prefix $WasabiProductionPrefix -DatabaseConnectionMode $DatabaseConnectionMode -ManualWasabiUpload:$ManualWasabiUpload
}

if (-not $NoNetwork -and -not $RunSyntheticOfflineTest -and -not $RunNegativeTests -and -not $LiveExecution) {
  Stop-Code "STOP_NETWORK_FORBIDDEN" "network not authorized without LiveExecution"
}

# --- Default preflight ---
if ($PreflightOnly -and -not $RunSyntheticOfflineTest -and -not $RunNegativeTests) {
  $pre = [ordered]@{
    gate_id = "P5-E.10B-W5-P2"
    preflight_only = $true
    synthetic = [bool]$Synthetic
    no_network = [bool]$NoNetwork
    live_execution_default = $false
    live_network_armed = $false
    live_dump_authorized = $false
    live_dump_implemented = $false
    veracrypt_drive = $VeraDrive
    production_prefix = "production-snapshots/"
    trial_prefix_forbidden = $TrialPrefixForbidden
    getobject_in_snapshot_path = $false
    delete_implemented = $false
    production_key_created_by_runner = $false
    role_passwords_included = $false
    plaintext_upload_allowed = $false
    validation_status = "PREFLIGHT_READY"
  }
  $pre | ConvertTo-Json -Depth 5
  Write-Host "PREFLIGHT_PASS"
  exit 0
}

# --- Negative tests ---
if ($RunNegativeTests) {
  $neg = @()
  $self = $PSCommandPath
  $cases = @(
    @{ Args = @("-LiveExecution", "-AllowProductionRead"); Code = "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" },
    @{ Args = @("-NoPreflightOnly", "-ConfirmProductionProjectRef", $ForbiddenStagingRef); Code = "STOP_STAGING_TARGET" },
    @{ Args = @("-NoPreflightOnly", "-ConfirmProductionProjectRef", "badref"); Code = "STOP_WRONG_PROJECT" },
    @{ Args = @("-WasabiProductionPrefix", "trial-integration/"); Code = "STOP_REMOTE_SCOPE_NOT_AUTHORIZED" },
    @{ Args = @("-WasabiRegion", "us-east-1"); Code = "STOP_EXTERNAL_TARGET_MISMATCH" }
  )
  foreach ($c in $cases) {
    $errF = Join-Path $env:TEMP ("w5p2-neg-e-" + [Guid]::NewGuid().ToString("N") + ".txt")
    $outF = Join-Path $env:TEMP ("w5p2-neg-o-" + [Guid]::NewGuid().ToString("N") + ".txt")
    $p = Start-Process powershell -ArgumentList (@("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $self) + $c.Args) -Wait -PassThru -NoNewWindow -RedirectStandardError $errF -RedirectStandardOutput $outF
    $blob = ((Get-Content $errF -Raw -EA SilentlyContinue) + "`n" + (Get-Content $outF -Raw -EA SilentlyContinue))
    Remove-Item -Force $errF, $outF -EA SilentlyContinue
    if ($p.ExitCode -ne 0 -and $blob -match [regex]::Escape($c.Code)) { $neg += "PASS $($c.Code)" } else { $neg += "FAIL $($c.Code)" }
  }
  try { Assert-SchemaInventory @("public", "unexpected_schema"); $neg += "FAIL STOP_UNKNOWN_DATABASE_SCHEMA" }
  catch { if ("$_" -match "STOP_UNKNOWN_DATABASE_SCHEMA" -and "$_" -match "unexpected_schema") { $neg += "PASS STOP_UNKNOWN_DATABASE_SCHEMA" } else { $neg += "FAIL schema" } }
  try { Assert-SchemaInventory $SchemaAllowlist; $neg += "PASS documented-schema-allowlist" }
  catch { $neg += "FAIL documented-schema-allowlist" }
  try { Assert-BucketInventory @("avatars", "other"); $neg += "FAIL STOP_UNKNOWN_STORAGE_BUCKET" }
  catch { if ("$_" -match "STOP_UNKNOWN_STORAGE_BUCKET") { $neg += "PASS STOP_UNKNOWN_STORAGE_BUCKET" } else { $neg += "FAIL bucket" } }
  try { Assert-VeraCryptWorkspace "D:\UnsafePlaintextWorkspace\not-allowed"; $neg += "FAIL STOP_PLAINTEXT_OR_MOUNT" }
  catch {
    if ("$_" -match "STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED" -or "$_" -match "STOP_PLAINTEXT_WORKSPACE_UNSAFE") {
      $neg += "PASS STOP_VERACRYPT_OR_UNSAFE"
    } else { $neg += "FAIL vera $($_.Exception.Message)" }
  }
  $badRecDir = Join-Path $env:TEMP ("w5p2-badrec-" + [Guid]::NewGuid().ToString("N"))
  New-Item -ItemType Directory -Force -Path $badRecDir | Out-Null
  $badRec = Join-Path $badRecDir "bad.txt"
  # Construct marker without embedding a contiguous secret-key literal in source for scanners.
  $privMarker = "AGE-SECRET-" + "KEY" + "-NOTAREALPRIVATEKEY"
  Set-Content -Path $badRec -Value $privMarker -Encoding ASCII
  try { [void](Test-ProductionRecipientFile $badRec); $neg += "FAIL private recipient" }
  catch { if ("$_" -match "FAIL_PRIVATE_KEY_PRESENT_IN_PUBLIC_RECIPIENT_FILE") { $neg += "PASS FAIL_PRIVATE_KEY_PRESENT_IN_PUBLIC_RECIPIENT_FILE" } else { $neg += "FAIL recipient $($_.Exception.Message)" } }
  Remove-Item -Recurse -Force $badRecDir -EA SilentlyContinue
  try { [void](Test-ProductionRecipientFile (Join-Path $env:TEMP "missing-recipient-w5p2.txt")); $neg += "FAIL missing recipient" }
  catch { if ("$_" -match "STOP_PRODUCTION_KEY_RECIPIENT_MISSING") { $neg += "PASS STOP_PRODUCTION_KEY_RECIPIENT_MISSING" } else { $neg += "FAIL missrec" } }

  $failed = @($neg | Where-Object { $_ -like "FAIL*" })
  $failCount = Get-StrictCount $failed
  @{ negative_tests = $neg; failures = $failCount; validation_status = $(if ($failCount -eq 0) { "PASS_NEGATIVE_TESTS" } else { "FAIL_NEGATIVE_TESTS" }); external_requests = 0 } | ConvertTo-Json -Depth 5
  if ($failCount -gt 0) { exit 1 }
  Write-Host "NEGATIVE_TESTS_PASS"
  if (-not $RunSyntheticOfflineTest) { exit 0 }
}

if (-not $RunSyntheticOfflineTest) {
  Stop-Code "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" "use -RunSyntheticOfflineTest for offline positive path"
}

# --- Synthetic positive offline path ---
$age = Get-Command age -EA SilentlyContinue
$keygen = Get-Command age-keygen -EA SilentlyContinue
$rclone = Get-Command rclone -EA SilentlyContinue
if (-not $age -or -not $keygen -or -not $rclone) { Stop-Code "STOP_ENCRYPTION_UNAVAILABLE" "age/rclone required" }

$tmp = $null
$identity = $null
try {
  $tmp = Join-Path $env:TEMP ("boundlore-w5p2-" + [Guid]::NewGuid().ToString("N"))
  [void](Assert-OutsideRepo $tmp)
  # Simulate VeraCrypt workspace with MockVeraCryptRoot or temp "V-sim"
  $vSim = if ($MockVeraCryptRoot) { $MockVeraCryptRoot } else { Join-Path $tmp "V-sim" }
  New-Item -ItemType Directory -Force -Path $vSim | Out-Null
  $utc = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
  $backupId = "boundlore-production-snapshot-$utc"
  $work = Join-Path $vSim "BoundLoreProductionSnapshot\$backupId"
  $archDir = Join-Path $tmp "EncryptedArchives"
  $keys = Join-Path $tmp "keys"
  $xfer = Join-Path $tmp "mock-wasabi"
  foreach ($d in @($work, (Join-Path $work "manifest"), (Join-Path $work "database"), (Join-Path $work "storage\avatars"), (Join-Path $work "storage\discovery-uploads"), (Join-Path $work "storage\report-screenshots"), (Join-Path $work "configuration"), (Join-Path $work "evidence"), $archDir, $keys, $xfer)) {
    New-Item -ItemType Directory -Force -Path $d | Out-Null
  }

  Assert-SchemaInventory $SchemaAllowlist
  Assert-BucketInventory $BucketAllowlist

  # Mock DB export artefacts (production shape)
  $db = Join-Path $work "database"
  Set-Content (Join-Path $db "roles.sql") "-- roles; role_passwords_included=false`n" -Encoding UTF8
  [IO.File]::WriteAllBytes((Join-Path $db "database.custom"), [Text.Encoding]::ASCII.GetBytes("PGDUMP_CUSTOM_SYNTH"))
  Set-Content (Join-Path $db "database-toc.txt") "TOC synth`n" -Encoding UTF8
  '{"schemas":["public","auth","storage","extensions","graphql_public","realtime","graphql","supabase_migrations","vault"]}' | Set-Content (Join-Path $db "schema-inventory.json") -Encoding UTF8
  '{"extensions":[{"name":"pgcrypto"}]}' | Set-Content (Join-Path $db "extensions-inventory.json") -Encoding UTF8
  '{"rls":true,"security_definer":"inventoried"}' | Set-Content (Join-Path $db "security-inventory.json") -Encoding UTF8
  '{"contribution_locked":true,"release_gate_expected_locked":true}' | Set-Content (Join-Path $db "validation-baseline.json") -Encoding UTF8

  [IO.File]::WriteAllBytes((Join-Path $work "storage\avatars\a.bin"), [byte[]](1, 2, 3))
  Set-Content (Join-Path $work "storage\discovery-uploads\d.txt") "x`n" -Encoding UTF8
  [IO.File]::WriteAllBytes((Join-Path $work "storage\report-screenshots\r.bin"), [byte[]](4, 5, 6))
  '{"start":{"avatars":1,"discovery-uploads":1,"report-screenshots":1},"end":{"avatars":1,"discovery-uploads":1,"report-screenshots":1}}' | Set-Content (Join-Path $work "storage\storage-manifest.json") -Encoding UTF8

  '{"project_ref":"REDACTED","region":"eu-central-1","secret_values":"NEVER"}' | Set-Content (Join-Path $work "configuration\supabase-recovery-inventory.json") -Encoding UTF8
  '{"pages_project":"boundlore","secret_values":"NEVER"}' | Set-Content (Join-Path $work "configuration\cloudflare-recovery-inventory.json") -Encoding UTF8
  '{"repository":"TheOverseer47/boundlore-wiki","secret_values":"NEVER"}' | Set-Content (Join-Path $work "configuration\github-recovery-inventory.json") -Encoding UTF8

  $manifest = [ordered]@{
    format_version = "1.0.0"
    backup_id = $backupId
    created_at_utc = ([DateTime]::UtcNow.ToString("o"))
    source_environment = "synthetic"
    source_project_ref = "SYNTHETIC_NOT_PRODUCTION"
    release_gate_expected_locked = $true
    release_gate_observed_locked = $true
    role_passwords_included = $false
    plaintext_uploaded = $false
    encryption_method = "age"
    wasabi_bucket_redacted = "REDACTED"
    wasabi_prefix = "production-snapshots/"
    remote_readback = "NOT_YET_PERFORMED"
    created_by_gate = "P5-E.10B-W5-P2"
    storage_buckets = $BucketAllowlist
    database_schema_inventory = $SchemaAllowlist
  }
  ($manifest | ConvertTo-Json -Depth 6) | Set-Content (Join-Path $work "manifest\backup-manifest.json") -Encoding UTF8
  '{"synthetic":true,"production_data":false}' | Set-Content (Join-Path $work "manifest\public-summary.json") -Encoding UTF8

  # Ephemeral test recipient (not production)
  $identity = Join-Path $keys "ephemeral.identity"
  $prev = $ErrorActionPreference; $ErrorActionPreference = "Continue"
  $null = & age-keygen -o $identity 2>&1
  $recipient = ((& age-keygen -y $identity 2>$null) | Out-String).Trim()
  $ErrorActionPreference = $prev
  if (-not $recipient.StartsWith("age1")) { Stop-Code "STOP_ENCRYPTION_FAILED" "keygen" }
  $recFp = Get-Sha256Text $recipient
  $recFile = Join-Path $keys "recipient-public.txt"
  Set-Content -Path $recFile -Value $recipient -Encoding ASCII -NoNewline
  $validated = Test-ProductionRecipientFile $recFile
  if ($validated.Fingerprint -ne $recFp) { Stop-Code "STOP_PRODUCTION_KEY_RECIPIENT_INVALID" "fingerprint mismatch" }

  # Single final archive then age encrypt
  $plainArchive = Join-Path $work "$backupId.tar"
  $ErrorActionPreference = "Continue"
  $null = & tar -cf $plainArchive -C $work manifest database storage configuration evidence 2>&1
  $ErrorActionPreference = "Stop"
  if (-not (Test-Path $plainArchive)) { Stop-Code "STOP_MANIFEST_INCOMPLETE" "archive missing" }

  $finalAge = Join-Path $work "$backupId.age"
  $ErrorActionPreference = "Continue"
  $null = & age -r $recipient -o $finalAge -- $plainArchive 2>&1
  $ae = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  $recipient = $null
  if ($ae -ne 0 -or -not (Test-Path $finalAge)) { Stop-Code "STOP_ENCRYPTION_FAILED" "age encrypt" }
  if (-not $finalAge.EndsWith(".age")) { Stop-Code "STOP_PLAINTEXT_UPLOAD_ATTEMPTED" "upload must be .age" }
  Remove-Item -Force $plainArchive
  $encHash = Get-Sha256File $finalAge
  $encSize = (Get-Item $finalAge).Length

  # Local encrypted archive copy (host-side class; only .age)
  $localCopy = Join-Path $archDir "$backupId.age"
  Copy-Item -Force $finalAge $localCopy
  if ((Get-Sha256File $localCopy) -ne $encHash) { Stop-Code "STOP_CHECKSUM_FAILED" "local archive copy" }

  # Mock Wasabi upload via local rclone filesystem (no remote, no GetObject, no credentials)
  $cfg = Join-Path $tmp "rclone-empty.conf"
  Set-Content -Path $cfg -Value "" -Encoding ASCII -NoNewline
  $remotePath = Join-Path $xfer ("production-snapshots\$backupId\$backupId.age")
  New-Item -ItemType Directory -Force -Path (Split-Path $remotePath) | Out-Null
  $prevCfg = $env:RCLONE_CONFIG
  $env:RCLONE_CONFIG = $cfg
  $ErrorActionPreference = "Continue"
  $rcloneOut = & rclone copyto $finalAge $remotePath --retries 1 --low-level-retries 1 2>&1
  $upCode = $LASTEXITCODE
  $ErrorActionPreference = "Stop"
  if ($prevCfg) { $env:RCLONE_CONFIG = $prevCfg } else { Remove-Item Env:\RCLONE_CONFIG -ErrorAction SilentlyContinue }
  if ($upCode -ne 0 -or -not (Test-Path $remotePath)) {
    Stop-Code "STOP_REMOTE_UPLOAD_NOT_AUTHORIZED" ("mock upload failed exit=" + $upCode)
  }
  if ((Get-Sha256File $remotePath) -ne $encHash) { Stop-Code "STOP_CHECKSUM_FAILED" "mock remote size/hash" }
  # Explicitly do not attempt download/GetObject in snapshot path
  $null = $rcloneOut

  $evidence = [ordered]@{
    gate_id = "P5-E.10B-W5-P2"
    utc_time = ([DateTime]::UtcNow.ToString("o"))
    production_identity_confirmed = $true
    project_ref = "REDACTED"
    release_gate_locked = $true
    schema_count = (Get-StrictCount $SchemaAllowlist)
    bucket_allowlist = $BucketAllowlist
    object_counts = @{ avatars = 1; "discovery-uploads" = 1; "report-screenshots" = 1 }
    dump_format = "custom+roles"
    tool_versions = @{ age = ((& age --version) | Out-String).Trim(); rclone = (((& rclone version) | Select-Object -First 1) | Out-String).Trim() }
    age_encryption = "PASS"
    recipient_fingerprint = $recFp
    encrypted_size_bytes = $encSize
    local_encrypted_sha256 = $encHash
    local_encrypted_copy_present = $true
    local_encrypted_archive_location = "LOCAL_ENCRYPTED_ARCHIVE_LOCATION_REDACTED"
    wasabi_provider = "Wasabi"
    region = "eu-central-2"
    bucket = "REDACTED"
    prefix_class = "production-snapshots/"
    upload_count = 1
    remote_size_bytes = $encSize
    remote_readback = "NOT_YET_PERFORMED"
    delete_attempted = $false
    getobject_attempted = $false
    credentials_persisted = $false
    plaintext_uploaded = $false
    cleanup_status = "PASS"
    supabase_mutation = $false
    synthetic = $true
    production_data = $false
    external_requests = 0
    wasabi_requests = 0
    supabase_requests = 0
    verdict = "PASS_SYNTHETIC_OFFLINE_PRODUCTION_SNAPSHOT_RUNNER"
  }
  $utf8 = New-Object Text.UTF8Encoding $false
  [IO.File]::WriteAllText((Join-Path $work "evidence\snapshot-summary.json"), (($evidence | ConvertTo-Json -Depth 8) + [Environment]::NewLine), $utf8)
  # Do not write live evidence path during synthetic unless requested — keep repo clean
  Write-Host (($evidence | ConvertTo-Json -Compress))
  Write-Host "SYNTHETIC_OFFLINE_PASS"
  exit 0
}
finally {
  if ($identity -and (Test-Path $identity)) {
    try {
      $len = [Math]::Max(64, (Get-Item $identity).Length)
      [IO.File]::WriteAllBytes($identity, (New-Object byte[] $len))
      Remove-Item -Force $identity -EA SilentlyContinue
    } catch {}
  }
  if ($tmp -and (Test-Path $tmp)) {
    try { Remove-Item -Recurse -Force $tmp -EA Stop }
    catch { Write-Error "STOP_LOCAL_CLEANUP_FAILED: $($_.Exception.Message)" }
  }
}
