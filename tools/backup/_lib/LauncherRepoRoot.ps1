# BoundLore launcher repository-root resolution (local only; no network).
# Dot-sourced by installer, orchestrator, and offline tests.

function Test-BoundLoreLocalAbsoluteDirectoryPath {
  param([Parameter(Mandatory = $true)][string]$PathCandidate)

  if ([string]::IsNullOrWhiteSpace($PathCandidate)) { return $false }
  if ($PathCandidate.Contains('"') -or $PathCandidate.Contains("'")) { return $false }
  if ($PathCandidate -match '[\*\?]') { return $false }
  if ($PathCandidate -match '%[A-Za-z0-9_]+%') { return $false }
  if ($PathCandidate.StartsWith('\\') -or $PathCandidate.StartsWith('//')) { return $false }
  if (-not [IO.Path]::IsPathRooted($PathCandidate)) { return $false }
  # Drive-letter absolute only (reject rooted-but-relative forms like \Windows).
  if ($PathCandidate -notmatch '^[A-Za-z]:[\\/]') { return $false }
  return $true
}

function Read-BoundLoreRepoRootConfigFile {
  param([Parameter(Mandatory = $true)][string]$ConfigPath)

  if (-not (Test-Path -LiteralPath $ConfigPath)) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-config-missing"
  }
  $raw = [IO.File]::ReadAllText($ConfigPath)
  if ($null -eq $raw) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }
  # UTF-8 BOM optional; exactly one content line; optional single trailing newline.
  $normalized = $raw -replace "^\uFEFF", ""
  if ($normalized.EndsWith("`r`n")) {
    $normalized = $normalized.Substring(0, $normalized.Length - 2)
  } elseif ($normalized.EndsWith("`n")) {
    $normalized = $normalized.Substring(0, $normalized.Length - 1)
  }
  if ($normalized -match "[\r\n]") {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }
  if ([string]::IsNullOrEmpty($normalized)) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }
  if ($normalized -ne $normalized.Trim()) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }
  if (-not (Test-BoundLoreLocalAbsoluteDirectoryPath $normalized)) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }
  return $normalized
}

function Resolve-BoundLoreLauncherRepoRoot {
  param(
    [string]$RepoRoot = "",
    [string]$LauncherDirectory = "",
    [string]$ProcessEnvValue = ""
  )

  if (-not $LauncherDirectory) { $LauncherDirectory = $PSScriptRoot }

  if ($RepoRoot -and $RepoRoot.Trim()) {
    $candidate = $RepoRoot.Trim()
    if ($candidate -ne $RepoRoot) {
      throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
    }
    if (-not (Test-BoundLoreLocalAbsoluteDirectoryPath $candidate)) {
      throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
    }
    return @{ Path = $candidate; Source = "PARAMETER" }
  }

  $configPath = Join-Path $LauncherDirectory "repo-root.txt"
  if (Test-Path -LiteralPath $configPath) {
    $fromFile = Read-BoundLoreRepoRootConfigFile -ConfigPath $configPath
    return @{ Path = $fromFile; Source = "LOCAL_CONFIG" }
  }

  if ($ProcessEnvValue -and $ProcessEnvValue.Trim()) {
    $envPath = $ProcessEnvValue.Trim()
    if ($envPath -ne $ProcessEnvValue) {
      throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
    }
    if (-not (Test-BoundLoreLocalAbsoluteDirectoryPath $envPath)) {
      throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
    }
    return @{ Path = $envPath; Source = "PROCESS_ENV" }
  }

  throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-config-missing"
}

function Assert-BoundLoreLauncherRepoRoot {
  param(
    [Parameter(Mandatory = $true)][string]$RepoRoot,
    [string[]]$RequiredRelativePaths = @(
      "tools\backup\Invoke-BoundLoreProductionSnapshot.ps1",
      "tools\backup\launcher\Invoke-BoundLoreManualUploadBackup.ps1",
      "tools\backup\launcher\BoundLore-Create-Encrypted-Backup.bat",
      "tools\backup\launcher\expected-git-baseline.txt"
    )
  )

  if (-not (Test-BoundLoreLocalAbsoluteDirectoryPath $RepoRoot)) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }
  if (-not (Test-Path -LiteralPath $RepoRoot)) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }
  $item = Get-Item -LiteralPath $RepoRoot -Force
  if (-not $item.PSIsContainer) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }
  if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }

  $gitDir = Join-Path $RepoRoot ".git"
  if (-not (Test-Path -LiteralPath $gitDir)) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }

  foreach ($rel in $RequiredRelativePaths) {
    $p = Join-Path $RepoRoot $rel
    if (-not (Test-Path -LiteralPath $p)) {
      throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
    }
  }

  $prevEap = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  $topOut = & git -C $RepoRoot rev-parse --show-toplevel 2>$null
  $topEc = $LASTEXITCODE
  $ErrorActionPreference = $prevEap
  $top = if ($null -eq $topOut) { "" } else { ($topOut | Out-String).Trim() }
  if ($topEc -ne 0 -or -not $top) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=git-root-mismatch"
  }
  $rootFull = [IO.Path]::GetFullPath($RepoRoot).TrimEnd('\', '/')
  $topFull = [IO.Path]::GetFullPath(($top -replace '/', '\')).TrimEnd('\', '/')
  if (-not [string]::Equals($rootFull, $topFull, [StringComparison]::OrdinalIgnoreCase)) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=git-root-mismatch"
  }

  return $rootFull
}

function Write-BoundLoreRepoRootConfigFile {
  param(
    [Parameter(Mandatory = $true)][string]$ConfigPath,
    [Parameter(Mandatory = $true)][string]$RepoRoot
  )

  $validated = Assert-BoundLoreLauncherRepoRoot -RepoRoot $RepoRoot
  $dir = Split-Path -Parent $ConfigPath
  if (-not (Test-Path -LiteralPath $dir)) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
  }
  $utf8 = New-Object Text.UTF8Encoding $false
  [IO.File]::WriteAllText($ConfigPath, ($validated + [Environment]::NewLine), $utf8)
  $readBack = Read-BoundLoreRepoRootConfigFile -ConfigPath $ConfigPath
  if (-not [string]::Equals($readBack, $validated, [StringComparison]::OrdinalIgnoreCase)) {
    throw "STOP_LAUNCHER_BASELINE_MISMATCH: reason=repo-path-invalid"
  }
  return $validated
}
