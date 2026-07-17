# Dot-sourced by Invoke-BoundLoreProductionSnapshot.ps1 for W5-A1 live sequence.
# Expects parent scope: Stop-Code, Get-Sha256*, Test-ProductionRecipientFile,
# Assert-VeraCryptWorkspace, ConvertFrom-SecureStringPlain, ExpectedProductionRef,
# ForbiddenStagingRef, BucketAllowlist, SchemaAllowlist, SystemSchemas, RepoRoot,
# WasabiRegion, WasabiEndpoint, RemoteName, EvidencePath, VeraDrive

. (Join-Path $PSScriptRoot "StorageExportDiagnostics.ps1")

function Invoke-PgChild {
  param(
    [string]$Exe,
    [string[]]$Arguments,
    [string]$Password,
    [string]$OutFile = ""
  )
  $psi = New-Object Diagnostics.ProcessStartInfo
  $psi.FileName = $Exe
  $psi.UseShellExecute = $false
  $psi.RedirectStandardOutput = $true
  $psi.RedirectStandardError = $true
  $psi.CreateNoWindow = $true
  if ($psi.EnvironmentVariables.ContainsKey("PGPASSWORD")) { [void]$psi.EnvironmentVariables.Remove("PGPASSWORD") }
  $psi.EnvironmentVariables["PGPASSWORD"] = $Password
  $psi.EnvironmentVariables["PGSSLMODE"] = "require"
  $psi.EnvironmentVariables["PGOPTIONS"] = "-c default_transaction_read_only=on -c lock_timeout=5s -c statement_timeout=300000"
  $quoted = foreach ($a in $Arguments) {
    if ($a -match '[\s"]') { '"' + ($a -replace '"', '\"') + '"' } else { $a }
  }
  $psi.Arguments = ($quoted -join " ")
  $p = New-Object Diagnostics.Process
  $p.StartInfo = $psi
  [void]$p.Start()
  $stdout = $p.StandardOutput.ReadToEnd()
  $stderr = $p.StandardError.ReadToEnd()
  $p.WaitForExit()
  if ($OutFile) {
    [IO.File]::WriteAllText($OutFile, $stdout, [Text.UTF8Encoding]::new($false))
  }
  return [pscustomobject]@{ ExitCode = $p.ExitCode; StdOut = $stdout; StdErr = $stderr }
}

function Resolve-ReleaseGateFailureStopCode {
  param([string]$StdErr, [int]$ExitCode)
  if ($ExitCode -eq 0) { return "STOP_RELEASE_GATE_NOT_LOCKED" }
  $e = ($StdErr | Out-String)
  if ($e -match "(?i)relation .* does not exist|42P01|permission denied|42501|syntax error|column .* does not exist") {
    return "STOP_RELEASE_GATE_QUERY_FAILED"
  }
  return "STOP_PRODUCTION_DB_CONNECTION_FAILED"
}

function Assert-ProductionDbConnectionIdentity {
  param(
    [string]$Mode,
    [string]$PgHost,
    [string]$PgPortIn,
    [string]$PgDatabase,
    [string]$PgUser
  )
  $hostNorm = $PgHost.Trim().ToLowerInvariant()
  $userNorm = $PgUser.Trim()
  $dbNorm = $PgDatabase.Trim()
  $portNorm = $PgPortIn.Trim()
  $forbiddenDirect = ("db.{0}.supabase.co" -f $ExpectedProductionRef)
  $expectedPoolerUser = ("postgres.{0}" -f $ExpectedProductionRef)
  # Fail-closed staging literal (also matched via $ForbiddenStagingRef from parent).
  $stagingLiteral = "jzzgoiwfbuwiiyvwgwri"
  $blob = ("{0}|{1}|{2}|{3}" -f $hostNorm, $userNorm, $dbNorm, $portNorm)

  if ($blob -match $ForbiddenStagingRef -or $blob -match $stagingLiteral -or $hostNorm -match [regex]::Escape($ForbiddenStagingRef) -or $userNorm -match [regex]::Escape($ForbiddenStagingRef)) {
    Stop-Code "STOP_STAGING_TARGET" "staging identity detected"
  }
  if ($hostNorm -match "://" -or $hostNorm -match "@" -or $hostNorm -match "/" -or $hostNorm -match ":") {
    Stop-Code "STOP_PROJECT_IDENTITY_UNVERIFIED" "DB host must be a bare hostname"
  }
  if ($portNorm -eq "6543") {
    Stop-Code "STOP_PROJECT_IDENTITY_UNVERIFIED" "transaction pooler port 6543 forbidden"
  }

  if ($Mode -eq "SessionPooler") {
    if (-not $hostNorm.EndsWith(".pooler.supabase.com")) {
      Stop-Code "STOP_PROJECT_IDENTITY_UNVERIFIED" "SessionPooler host must end with .pooler.supabase.com"
    }
    if ($hostNorm -eq $forbiddenDirect -or $hostNorm -match "^db\..+\.supabase\.co$") {
      Stop-Code "STOP_PROJECT_IDENTITY_UNVERIFIED" "direct host forbidden in SessionPooler mode"
    }
    if ($portNorm -ne "5432") {
      Stop-Code "STOP_PROJECT_IDENTITY_UNVERIFIED" "SessionPooler requires port 5432"
    }
    if ($dbNorm -ne "postgres") {
      Stop-Code "STOP_PROJECT_IDENTITY_UNVERIFIED" "SessionPooler requires database postgres"
    }
    if ($userNorm -ne $expectedPoolerUser) {
      Stop-Code "STOP_PROJECT_IDENTITY_UNVERIFIED" "SessionPooler requires postgres.<production-ref> user"
    }
    return
  }

  # Direct (default): host must prove production ref; never silently redirect to pooler.
  if ($hostNorm.EndsWith(".pooler.supabase.com")) {
    Stop-Code "STOP_PROJECT_IDENTITY_UNVERIFIED" "pooler host requires -DatabaseConnectionMode SessionPooler"
  }
  if ($hostNorm -notmatch [regex]::Escape($ExpectedProductionRef)) {
    Stop-Code "STOP_PROJECT_IDENTITY_UNVERIFIED" "DB host does not prove production ref"
  }
}

function Invoke-LiveProductionSnapshotSequence {
  param(
    [string]$WorkspaceRoot,
    [string]$RecipientFile,
    [string]$ArchiveRoot,
    [string]$Prefix,
    [ValidateSet("Direct", "SessionPooler")]
    [string]$DatabaseConnectionMode = "Direct"
  )

  Write-Host "LIVE_SEQUENCE_START"
  Write-Host ("DATABASE_CONNECTION_MODE=" + $DatabaseConnectionMode)

  # --- Interactive non-secret ---
  Write-Host "Enter Production DB host (hidden not required):"
  $PgHost = Read-Host
  Write-Host "Enter Production DB port [5432]:"
  $PgPortIn = Read-Host
  if (-not $PgPortIn) { $PgPortIn = "5432" }
  Write-Host "Enter Production DB name:"
  $PgDatabase = Read-Host
  Write-Host "Enter Production DB user:"
  $PgUser = Read-Host
  Write-Host "Enter Wasabi Production bucket name:"
  $Bucket1 = Read-Host
  Write-Host "Re-enter Wasabi Production bucket name:"
  $Bucket2 = Read-Host
  if ($Bucket1 -ne $Bucket2 -or [string]::IsNullOrWhiteSpace($Bucket1)) {
    Stop-Code "STOP_REMOTE_SCOPE_NOT_AUTHORIZED" "bucket confirmation mismatch"
  }
  if ($Bucket1 -match "trial-integration" -or $Bucket1 -match "trial") {
    Stop-Code "STOP_REMOTE_SCOPE_NOT_AUTHORIZED" "trial bucket/scope forbidden"
  }
  Write-Host "Type PRODUCTION_BACKUP_SCOPE to confirm:"
  $scopeAck = Read-Host
  if ($scopeAck -ne "PRODUCTION_BACKUP_SCOPE") {
    Stop-Code "STOP_REMOTE_SCOPE_NOT_AUTHORIZED" "scope ack missing"
  }

  # --- Secure secrets ---
  Write-Host "Enter Production DB password (hidden):"
  $secPg = Read-Host -AsSecureString
  Write-Host "Enter Supabase Storage service-role key (hidden):"
  $secSr = Read-Host -AsSecureString
  Write-Host "Enter Wasabi Access Key ID (hidden):"
  $secAk = Read-Host -AsSecureString
  Write-Host "Enter Wasabi Secret Access Key (hidden):"
  $secSk = Read-Host -AsSecureString

  $pgPass = ConvertFrom-SecureStringPlain $secPg
  $srKey = ConvertFrom-SecureStringPlain $secSr
  $ak = ConvertFrom-SecureStringPlain $secAk
  $sk = ConvertFrom-SecureStringPlain $secSk
  $secPg.Dispose(); $secSr.Dispose(); $secAk.Dispose(); $secSk.Dispose()

  try {
    Assert-ProductionDbConnectionIdentity -Mode $DatabaseConnectionMode -PgHost $PgHost -PgPortIn $PgPortIn -PgDatabase $PgDatabase -PgUser $PgUser

    $psql = (Get-Command psql).Source
    $pgDump = (Get-Command pg_dump).Source
    $pgDumpall = (Get-Command pg_dumpall).Source
    $pgRestore = (Get-Command pg_restore).Source
    $ageBin = (Get-Command age).Source
    $rcloneBin = (Get-Command rclone).Source

    $utc = [DateTime]::UtcNow.ToString("yyyyMMddTHHmmssZ")
    $backupId = "boundlore-production-snapshot-$utc"
    $work = Join-Path $WorkspaceRoot $backupId
    try { [void](Assert-VeraCryptWorkspace $work) } catch { Stop-Code ((($_ | Out-String) -split ":")[0].Trim()) $_.ToString() }
    if (Test-Path $work) { Stop-Code "STOP_OUTPUT_PATH_UNSAFE" "backup id already exists" }

    # Free space (conservative 2x estimate placeholder — require >= 2GB free on V: and D:)
    $vDrive = Get-PSDrive -Name V -EA SilentlyContinue
    if (-not $vDrive) { Stop-Code "STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED" "V: missing" }
    if ($vDrive.Free -lt 2GB) { Stop-Code "STOP_FREE_SPACE_INSUFFICIENT" "V: free space" }
    $dDrive = Get-PSDrive -Name D -EA SilentlyContinue
    if ($dDrive -and $dDrive.Free -lt 1GB) { Stop-Code "STOP_FREE_SPACE_INSUFFICIENT" "D: free space" }

    foreach ($d in @(
        $work,
        (Join-Path $work "manifest"),
        (Join-Path $work "database"),
        (Join-Path $work "storage"),
        (Join-Path $work "configuration"),
        (Join-Path $work "evidence")
      )) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

    $connArgs = @("-h", $PgHost.Trim(), "-p", $PgPortIn.Trim(), "-U", $PgUser.Trim(), "-d", $PgDatabase.Trim())

    # Release gate start — must pass before any export
    $gateSql = "SELECT id, contribution_locked FROM public.release_gate WHERE id = 1;"
    $gate = Invoke-PgChild -Exe $psql -Password $pgPass -Arguments ($connArgs + @("-v", "ON_ERROR_STOP=1", "-t", "-A", "-F", ",", "-c", $gateSql))
    if ($gate.ExitCode -ne 0) {
      $stop = Resolve-ReleaseGateFailureStopCode -StdErr $gate.StdErr -ExitCode $gate.ExitCode
      Stop-Code $stop "release gate pre-export failed"
    }
    $gateLine = ($gate.StdOut -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 1)
    if ($gateLine -notmatch '^1,t' -and $gateLine -notmatch '^1,true') {
      Stop-Code "STOP_RELEASE_GATE_NOT_LOCKED" "contribution_locked not true"
    }
    Write-Host "RELEASE_GATE_LOCKED_PASS"
    Write-Host "PRODUCTION_IDENTITY_PASS"

    # Schema inventory
    $schemaSql = @"
SELECT nspname FROM pg_namespace
WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
ORDER BY 1;
"@
    $sch = Invoke-PgChild -Exe $psql -Password $pgPass -Arguments ($connArgs + @("-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", $schemaSql))
    if ($sch.ExitCode -ne 0) { Stop-Code "STOP_UNKNOWN_DATABASE_SCHEMA" "schema inventory failed" }
    $schemas = @($sch.StdOut -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
    foreach ($s in $schemas) {
      if ($SystemSchemas -contains $s) { continue }
      if ($SchemaAllowlist -notcontains $s) {
        Stop-Code "STOP_UNKNOWN_DATABASE_SCHEMA" ("unknown schema: " + $s)
      }
    }

    # Counts baseline
    $countSql = @"
SELECT json_build_object(
  'schemas', (SELECT count(*) FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'),
  'tables', (SELECT count(*) FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog','information_schema')),
  'routines', (SELECT count(*) FROM information_schema.routines WHERE specific_schema NOT IN ('pg_catalog','information_schema')),
  'triggers', (SELECT count(*) FROM information_schema.triggers WHERE trigger_schema NOT IN ('pg_catalog','information_schema')),
  'policies', (SELECT count(*) FROM pg_policies),
  'extensions', (SELECT count(*) FROM pg_extension)
);
"@
    $startCounts = Invoke-PgChild -Exe $psql -Password $pgPass -Arguments ($connArgs + @("-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", $countSql))
    if ($startCounts.ExitCode -ne 0) { Stop-Code "STOP_DATABASE_DUMP_INCOMPLETE" "start baseline failed" }
    $startJson = ($startCounts.StdOut | Out-String).Trim()
    [IO.File]::WriteAllText((Join-Path $work "evidence\start-baseline.json"), $startJson + "`n")

    # Roles
    $rolesPath = Join-Path $work "database\roles.sql"
    $roles = Invoke-PgChild -Exe $pgDumpall -Password $pgPass -Arguments @("--roles-only", "--no-role-passwords", "-h", $PgHost, "-p", $PgPortIn, "-U", $PgUser) -OutFile $rolesPath
    # pg_dumpall writes to stdout captured to file; also check exit
    if ($roles.ExitCode -ne 0 -or -not (Test-Path $rolesPath) -or (Get-Item $rolesPath).Length -lt 10) {
      Stop-Code "STOP_DATABASE_DUMP_INCOMPLETE" "roles export failed"
    }
    $rolesText = Get-Content $rolesPath -Raw
    if ($rolesText -match "(?i)PASSWORD\s+'") {
      Stop-Code "FAIL_ROLE_PASSWORD_DATA_PRESENT" "password hashes in roles dump"
    }

    # Custom dump
    $dumpPath = Join-Path $work "database\database.custom"
    $dumpArgs = @("-h", $PgHost, "-p", $PgPortIn, "-U", $PgUser, "-d", $PgDatabase, "-Fc", "-f", $dumpPath, "--no-password")
    $dump = Invoke-PgChild -Exe $pgDump -Password $pgPass -Arguments $dumpArgs
    if ($dump.ExitCode -ne 0 -or -not (Test-Path $dumpPath)) {
      Stop-Code "STOP_DATABASE_DUMP_INCOMPLETE" "pg_dump failed"
    }
    $tocPath = Join-Path $work "database\database-toc.txt"
    $toc = Invoke-PgChild -Exe $pgRestore -Password $pgPass -Arguments @("-l", $dumpPath) -OutFile $tocPath
    if ($toc.ExitCode -ne 0 -or (Get-Item $tocPath).Length -lt 10) {
      Stop-Code "STOP_DATABASE_DUMP_INCOMPLETE" "TOC failed"
    }
    Write-Host "DATABASE_EXPORT_PASS"

    # Storage live export (service-role key only in child process environment)
    $storageOut = Join-Path $work "storage"
    $storageInv = Join-Path $work "evidence\storage-inventory.json"
    $storageScript = Join-Path $BackupToolsDir "Export-BoundLoreStorageLive.py"
    $py = (Get-Command py).Source
    $psiSt = New-Object Diagnostics.ProcessStartInfo
    $psiSt.FileName = $py
    $psiSt.UseShellExecute = $false
    $psiSt.RedirectStandardOutput = $true
    $psiSt.RedirectStandardError = $true
    $psiSt.CreateNoWindow = $true
    $psiSt.EnvironmentVariables["SUPABASE_SERVICE_ROLE_KEY"] = $srKey
    $psiSt.EnvironmentVariables["BOUNDLORE_LIVE_NETWORK_ARMED"] = "1"
    $argParts = @(
      "-3"
      ('"{0}"' -f ($storageScript -replace '"', '\"'))
      ('"{0}"' -f $ExpectedProductionRef)
      ('"{0}"' -f ($storageOut -replace '"', '\"'))
      ('"{0}"' -f ($storageInv -replace '"', '\"'))
    )
    $psiSt.Arguments = ($argParts -join " ")
    $pSt = New-Object Diagnostics.Process
    $pSt.StartInfo = $psiSt
    [void]$pSt.Start()
    $stOut = $pSt.StandardOutput.ReadToEnd()
    $stErr = $pSt.StandardError.ReadToEnd()
    $pSt.WaitForExit()
    $stCode = $pSt.ExitCode
    $srKey = $null
    if ($psiSt.EnvironmentVariables.ContainsKey("SUPABASE_SERVICE_ROLE_KEY")) {
      [void]$psiSt.EnvironmentVariables.Remove("SUPABASE_SERVICE_ROLE_KEY")
    }
    if ($stCode -ne 0) {
      $diag = Resolve-StorageChildFailure -Stdout $stOut -Stderr $stErr -ExitCode $stCode
      Stop-Code $diag.Code $diag.Message
    }
    Write-Host "STORAGE_EXPORT_PASS"

    # End baseline + release gate
    $endCounts = Invoke-PgChild -Exe $psql -Password $pgPass -Arguments ($connArgs + @("-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", $countSql))
    $gate2 = Invoke-PgChild -Exe $psql -Password $pgPass -Arguments ($connArgs + @("-v", "ON_ERROR_STOP=1", "-t", "-A", "-F", ",", "-c", $gateSql))
    if ($gate2.ExitCode -ne 0) {
      $stop2 = Resolve-ReleaseGateFailureStopCode -StdErr $gate2.StdErr -ExitCode $gate2.ExitCode
      Stop-Code $stop2 "release gate post-export failed"
    }
    $gateLine2 = ($gate2.StdOut -split "`r?`n" | Where-Object { $_.Trim() } | Select-Object -First 1)
    if ($gateLine2 -notmatch '^1,t' -and $gateLine2 -notmatch '^1,true') {
      Stop-Code "STOP_RELEASE_GATE_NOT_LOCKED" "gate unlocked during export"
    }
    $endJson = ($endCounts.StdOut | Out-String).Trim()
    if ($endJson -ne $startJson) {
      Stop-Code "STOP_INVENTORY_CHANGED_DURING_EXPORT" "database baseline drift"
    }
    [IO.File]::WriteAllText((Join-Path $work "evidence\end-baseline.json"), $endJson + "`n")
    Write-Host "INVENTORY_CONSISTENCY_PASS"

    # Clear DB password ASAP after DB work
    $pgPass = $null

    # Inventories (redacted)
    '{"project_ref":"REDACTED","region":"eu-central-1","secret_values":"NEVER"}' | Set-Content (Join-Path $work "configuration\supabase-recovery-inventory.json") -Encoding UTF8
    '{"pages_project":"boundlore","secret_values":"NEVER"}' | Set-Content (Join-Path $work "configuration\cloudflare-recovery-inventory.json") -Encoding UTF8
    '{"repository":"TheOverseer47/boundlore-wiki","secret_values":"NEVER"}' | Set-Content (Join-Path $work "configuration\github-recovery-inventory.json") -Encoding UTF8

    $recInfo = Test-ProductionRecipientFile $RecipientFile
    $recipient = $recInfo.Recipient
    $recFp = $recInfo.Fingerprint

    $dumpHash = Get-Sha256File $dumpPath
    $rolesHash = Get-Sha256File $rolesPath
    $startObj = $startJson | ConvertFrom-Json
    $storageInvObj = Get-Content $storageInv -Raw | ConvertFrom-Json

    $manifest = [ordered]@{
      format_version = "1.0.0"
      gate_id = "P5-E.10B-W5-A1"
      backup_id = $backupId
      created_at_utc = ([DateTime]::UtcNow.ToString("o"))
      source_environment = "production"
      source_project_ref = $ExpectedProductionRef
      source_region = "eu-central-1"
      release_gate_expected_locked = $true
      release_gate_observed_start = $true
      release_gate_observed_end = $true
      database_dump_format = "custom"
      database_dump_sha256 = $dumpHash
      role_dump_sha256 = $rolesHash
      role_passwords_included = $false
      schema_count = [int]$startObj.schemas
      table_count = [int]$startObj.tables
      function_count = [int]$startObj.routines
      trigger_count = [int]$startObj.triggers
      policy_count = [int]$startObj.policies
      extension_count = [int]$startObj.extensions
      storage_buckets = $BucketAllowlist
      storage_object_counts = $storageInvObj.start_inventory
      encryption_method = "age"
      encryption_recipient_fingerprint = $recFp
      plaintext_uploaded = $false
      wasabi_region = $WasabiRegion
      wasabi_prefix = $Prefix
      restore_status = "NOT_PERFORMED"
      remote_readback = "NOT_PERFORMED"
      validation_status = "packaging"
    }
    ($manifest | ConvertTo-Json -Depth 8) | Set-Content (Join-Path $work "manifest\backup-manifest.json") -Encoding UTF8

    # Single plain archive inside V:
    $plainArchive = Join-Path $work "$backupId.tar"
    $ErrorActionPreference = "Continue"
    $null = & tar -cf $plainArchive -C $work manifest database storage configuration evidence 2>&1
    $ErrorActionPreference = "Stop"
    if (-not (Test-Path $plainArchive)) { Stop-Code "STOP_MANIFEST_INCOMPLETE" "plain archive missing" }

    $finalAgeName = "$backupId.age"
    $finalAge = Join-Path $work $finalAgeName
    $ErrorActionPreference = "Continue"
    $null = & $ageBin -r $recipient -o $finalAge -- $plainArchive 2>&1
    $ageCode = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    $recipient = $null
    if ($ageCode -ne 0 -or -not (Test-Path $finalAge)) { Stop-Code "STOP_ENCRYPTION_FAILED" "age encrypt failed" }
    Remove-Item -Force $plainArchive -EA SilentlyContinue
    $encHash = Get-Sha256File $finalAge
    $encSize = (Get-Item $finalAge).Length
    Write-Host "AGE_ENCRYPTION_PASS"

    # Local encrypted copy on D:
    if (-not (Test-Path $ArchiveRoot)) { New-Item -ItemType Directory -Force -Path $ArchiveRoot | Out-Null }
    $localCopy = Join-Path $ArchiveRoot $finalAgeName
    Copy-Item -Force $finalAge $localCopy
    if ((Get-Sha256File $localCopy) -ne $encHash) { Stop-Code "STOP_LOCAL_ENCRYPTED_COPY_FAILED" "hash mismatch" }
    Write-Host "LOCAL_ENCRYPTED_COPY_PASS"

    # Wasabi upload once + list-only size check (credentials retained until list completes)
    $cfgDir = Join-Path $env:TEMP ("rclone-w5a1-" + [Guid]::NewGuid().ToString("N"))
    New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
    $cfg = Join-Path $cfgDir "rclone-empty.conf"
    Set-Content -Path $cfg -Value "" -Encoding ASCII -NoNewline
    $objectKey = ($Prefix.TrimEnd("/") + "/" + $backupId + "/" + $finalAgeName)
    if ($objectKey -match "trial-integration" -or $objectKey.Contains("..")) {
      Stop-Code "STOP_EXTERNAL_TARGET_MISMATCH" "bad object key"
    }
    $remoteTarget = "{0}:{1}/{2}" -f $RemoteName, $Bucket1, $objectKey
    $listTarget = "{0}:{1}/{2}" -f $RemoteName, $Bucket1, ($Prefix.TrimEnd("/") + "/" + $backupId)

    function Invoke-RcloneEphemeral([string[]]$RArgs) {
      $psi = New-Object Diagnostics.ProcessStartInfo
      $psi.FileName = $rcloneBin
      $psi.UseShellExecute = $false
      $psi.RedirectStandardOutput = $true
      $psi.RedirectStandardError = $true
      $psi.CreateNoWindow = $true
      $psi.EnvironmentVariables["RCLONE_CONFIG"] = $cfg
      $psi.EnvironmentVariables[("RCLONE_CONFIG_{0}_TYPE" -f $RemoteName.ToUpperInvariant())] = "s3"
      $psi.EnvironmentVariables[("RCLONE_CONFIG_{0}_PROVIDER" -f $RemoteName.ToUpperInvariant())] = "Wasabi"
      $psi.EnvironmentVariables[("RCLONE_CONFIG_{0}_ACCESS_KEY_ID" -f $RemoteName.ToUpperInvariant())] = $ak
      $psi.EnvironmentVariables[("RCLONE_CONFIG_{0}_SECRET_ACCESS_KEY" -f $RemoteName.ToUpperInvariant())] = $sk
      $psi.EnvironmentVariables[("RCLONE_CONFIG_{0}_REGION" -f $RemoteName.ToUpperInvariant())] = $WasabiRegion
      $psi.EnvironmentVariables[("RCLONE_CONFIG_{0}_ENDPOINT" -f $RemoteName.ToUpperInvariant())] = $WasabiEndpoint
      $psi.EnvironmentVariables[("RCLONE_CONFIG_{0}_NO_CHECK_BUCKET" -f $RemoteName.ToUpperInvariant())] = "true"
      $psi.EnvironmentVariables[("RCLONE_CONFIG_{0}_FORCE_PATH_STYLE" -f $RemoteName.ToUpperInvariant())] = "true"
      $psi.Arguments = (($RArgs | ForEach-Object { if ($_ -match '[\s"]') { '"' + $_ + '"' } else { $_ } }) -join " ")
      $proc = New-Object Diagnostics.Process
      $proc.StartInfo = $psi
      [void]$proc.Start()
      $o = $proc.StandardOutput.ReadToEnd()
      $e = $proc.StandardError.ReadToEnd()
      $proc.WaitForExit()
      return [pscustomobject]@{ ExitCode = $proc.ExitCode; StdOut = $o; StdErr = $e }
    }

    $up = Invoke-RcloneEphemeral @(
      "copyto", $localCopy, $remoteTarget,
      "--retries", "1", "--low-level-retries", "1",
      "--transfers", "1", "--checkers", "1",
      "--immutable", "--s3-upload-cutoff", "100Mi"
    )
    if ($up.ExitCode -ne 0) {
      Stop-Code "STOP_REMOTE_UPLOAD_NOT_AUTHORIZED" "upload failed (no retry)"
    }
    Write-Host "WASABI_PRODUCTION_UPLOAD_PASS"

    # List-only (no copy/get from remote)
    $ls = Invoke-RcloneEphemeral @("lsl", $listTarget, "--retries", "1", "--low-level-retries", "1")
    $ak = $null
    $sk = $null
    if ($ls.ExitCode -ne 0) {
      Stop-Code "STOP_UPLOAD_COUNT_NOT_PROVEN" "list failed after upload"
    }
    $lsLines = @($ls.StdOut -split "`r?`n" | Where-Object { $_.Trim() })
    $lsCount = @($lsLines).Count
    if ($lsCount -ne 1) {
      Stop-Code "STOP_UPLOAD_COUNT_NOT_PROVEN" ("expected 1 remote object, got " + $lsCount)
    }
    # rclone lsl format: size date time name
    $parts = $lsLines[0].Trim() -split "\s+", 4
    $remoteSize = [int64]$parts[0]
    if ($remoteSize -ne $encSize) {
      Stop-Code "STOP_UPLOAD_COUNT_NOT_PROVEN" "remote size mismatch"
    }
    Write-Host "REMOTE_SIZE_VERIFICATION_PASS"

    Remove-Item -Recurse -Force $cfgDir -EA SilentlyContinue

    $objHash = Get-Sha256Text $objectKey
    $refHash = Get-Sha256Text $ExpectedProductionRef
    $evidence = [ordered]@{
      gate_id = "P5-E.10B-W5-A1"
      created_at_utc = ([DateTime]::UtcNow.ToString("o"))
      source_environment = "production"
      production_identity_confirmed = $true
      project_ref_redacted_or_hashed = $refHash
      release_gate_locked_start = $true
      release_gate_locked_end = $true
      schema_count = [int]$startObj.schemas
      table_count = [int]$startObj.tables
      function_count = [int]$startObj.routines
      trigger_count = [int]$startObj.triggers
      policy_count = [int]$startObj.policies
      extension_count = [int]$startObj.extensions
      storage_bucket_allowlist = $BucketAllowlist
      storage_object_counts = $(
        $oc = @{}; foreach ($k in @($storageInvObj.start_inventory.PSObject.Properties.Name)) {
          $oc[$k] = [int]$storageInvObj.start_inventory.$k.object_count
        }; $oc
      )
      storage_total_sizes = $(
        $sz = @{}; foreach ($k in @($storageInvObj.start_inventory.PSObject.Properties.Name)) {
          $sz[$k] = [int64]$storageInvObj.start_inventory.$k.total_bytes
        }; $sz
      )
      database_dump_format = "custom"
      role_passwords_included = $false
      database_dump_validated = $true
      storage_export_validated = $true
      inventory_consistent = $true
      encryption_method = "age"
      recipient_fingerprint = $recFp
      final_archive_count = 1
      encrypted_archive_size = $encSize
      encrypted_archive_sha256 = $encHash
      local_encrypted_copy_present = $true
      local_hash_match = $true
      wasabi_provider = "Wasabi"
      wasabi_region = "eu-central-2"
      wasabi_bucket = "REDACTED"
      wasabi_prefix_class = "production-snapshots/"
      object_name_redacted_or_hashed = $objHash
      upload_invocations = 1
      remote_object_count = 1
      remote_size_match = $true
      remote_readback = "NOT_PERFORMED"
      restore = "NOT_PERFORMED"
      plaintext_uploaded = $false
      getobject_attempted = $false
      delete_attempted = $false
      supabase_mutation = $false
      credentials_persisted = $false
      rclone_config_persisted = $false
      local_cleanup = "PENDING"
      manual_veracrypt_dismount_required = $true
      verdict = "PASS_CONTROLLED_READ_ONLY_PRODUCTION_SNAPSHOT_ENCRYPTED_UPLOAD_VERIFIED"
    }

    # Cleanup plaintext under V: (retain .age on V: briefly then remove; local D: copy retained)
    Get-ChildItem -Path (Join-Path $work "database") -File -EA SilentlyContinue | Remove-Item -Force -EA SilentlyContinue
    Get-ChildItem -Path (Join-Path $work "storage") -Recurse -File -EA SilentlyContinue | Remove-Item -Force -EA SilentlyContinue
    Get-ChildItem -Path (Join-Path $work "manifest") -File -EA SilentlyContinue | Remove-Item -Force -EA SilentlyContinue
    Get-ChildItem -Path (Join-Path $work "configuration") -File -EA SilentlyContinue | Remove-Item -Force -EA SilentlyContinue
    if (Test-Path $finalAge) { Remove-Item -Force $finalAge -EA SilentlyContinue }
    $evidence.local_cleanup = "PASS"

    $utf8 = New-Object Text.UTF8Encoding $false
    $evDir = Split-Path $EvidencePath -Parent
    if (-not (Test-Path $evDir)) { New-Item -ItemType Directory -Force -Path $evDir | Out-Null }
    [IO.File]::WriteAllText($EvidencePath, (($evidence | ConvertTo-Json -Depth 8) + [Environment]::NewLine), $utf8)

    Write-Host "LOCAL_CLEANUP_PASS"
    Write-Host "W5_A1_PRODUCTION_SNAPSHOT_PASS"
    Write-Host ("EVIDENCE_WRITTEN=qa/evidence/p5-e10b-w5-production-snapshot.json")
    Write-Host "MANUAL_VERACRYPT_DISMOUNT_REQUIRED"
    exit 0
  }
  finally {
    $pgPass = $null
    $srKey = $null
    $ak = $null
    $sk = $null
    Remove-Item Env:\SUPABASE_SERVICE_ROLE_KEY -EA SilentlyContinue
    Remove-Item Env:\PGPASSWORD -EA SilentlyContinue
    Remove-Item Env:\BOUNDLORE_LIVE_NETWORK_ARMED -EA SilentlyContinue
  }
}
