#!/usr/bin/env python3
"""Offline PowerShell 5.1 StrictMode Count/guard regression checks for W5-A1-R1/R2-F1.

Never arms live network against Supabase/Wasabi. LiveExecution may be used only to
exercise authorization stops with V: absent / incomplete guards.
"""
from __future__ import annotations

import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "tools" / "backup" / "Invoke-BoundLoreProductionSnapshot.ps1"

CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-snapshot-count-regression-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-snapshot-count-regression-check] FAIL: {msg}", file=sys.stderr)


def run_ps(script: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def run_runner(args: list[str] | None = None) -> subprocess.CompletedProcess[str]:
    cmd = ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(RUNNER)]
    if args:
        cmd.extend(args)
    return subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )


def main() -> None:
    # 1-3 + nested-array anti-pattern: caller always uses @(); function must NOT unary-comma
    script_count = r"""
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Get-StrictCount { param($Value) if ($null -eq $Value) { return 0 }; return @($Value).Count }
# Correct model: emit strings; caller wraps with @()
function Return-Empty { $m = @(); return @($m) }
function Return-One { $m = @(); $m += 'a'; return @($m) }
function Return-Many { $m = @('a','b'); return @($m) }
# R1 anti-pattern: unary comma + caller @() nests Object[]
function Return-Empty-Nested { $m = @(); return , @($m) }
function Return-Empty-Unsafe { $m = @(); return $m }
$n = Get-StrictCount $null
$e = Get-StrictCount (@(Return-Empty))
$o = Get-StrictCount (@(Return-One))
$m = Get-StrictCount (@(Return-Many))
$nested = @(Return-Empty-Nested)
$nestedCount = Get-StrictCount $nested
$nestedJoin = ($nested -join ',')
$ok = ($n -eq 0 -and $e -eq 0 -and $o -eq 1 -and $m -eq 2)
$nestedBad = ($nestedCount -eq 1 -and $nestedJoin -eq 'System.Object[]')
try {
  $u = Return-Empty-Unsafe
  $boom = $u.Count
  $unsafeFailed = $false
} catch {
  $unsafeFailed = ($_.FullyQualifiedErrorId -like 'PropertyNotFoundStrict*')
}
if ($ok -and $nestedBad -and $unsafeFailed) { 'COUNT_HELPER_PASS' } else { "COUNT_HELPER_FAIL n=$n e=$e o=$o m=$m nestedCount=$nestedCount nestedJoin=$nestedJoin unsafe=$unsafeFailed" }
"""
    proc = run_ps(script_count)
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0 and "COUNT_HELPER_PASS" in blob, "null/single/multi + nested anti-pattern")

    # Guard-name emission: 0 / 1 / many / all-missing with flat strings (no System.Object[])
    guard_script = r"""
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Get-StrictCount { param($Value) if ($null -eq $Value) { return 0 }; return @($Value).Count }
function Test-Guards {
  param(
    [bool]$LiveExecution=$false,
    [bool]$AllowProductionRead=$false,
    [bool]$AllowSupabaseStorageRead=$false,
    [bool]$AllowExternalWasabiUpload=$false,
    [string]$ConfirmProductionProjectRef='',
    [bool]$ConfirmReleaseGateLocked=$false,
    [bool]$ConfirmEncryptedOutputOnly=$false,
    [bool]$ConfirmWasabiProductionScope=$false,
    [bool]$ConfirmVeraCryptWorkspaceMounted=$false,
    [bool]$ConfirmLocalEncryptedArchiveCopy=$false,
    [bool]$ConfirmUserAuthorizedSnapshot=$false,
    [string]$ProductionRecipientFile='',
    [string]$ExpectedProductionRef='ohkoojpzmptdfyowdgog'
  )
  $missing = @()
  if (-not $LiveExecution) { $missing += 'LiveExecution' }
  if (-not $AllowProductionRead) { $missing += 'AllowProductionRead' }
  if (-not $AllowSupabaseStorageRead) { $missing += 'AllowSupabaseStorageRead' }
  if (-not $AllowExternalWasabiUpload) { $missing += 'AllowExternalWasabiUpload' }
  if ($ConfirmProductionProjectRef -ne $ExpectedProductionRef) { $missing += 'ConfirmProductionProjectRef' }
  if (-not $ConfirmReleaseGateLocked) { $missing += 'ConfirmReleaseGateLocked' }
  if (-not $ConfirmEncryptedOutputOnly) { $missing += 'ConfirmEncryptedOutputOnly' }
  if (-not $ConfirmWasabiProductionScope) { $missing += 'ConfirmWasabiProductionScope' }
  if (-not $ConfirmVeraCryptWorkspaceMounted) { $missing += 'ConfirmVeraCryptWorkspaceMounted' }
  if (-not $ConfirmLocalEncryptedArchiveCopy) { $missing += 'ConfirmLocalEncryptedArchiveCopy' }
  if (-not $ConfirmUserAuthorizedSnapshot) { $missing += 'ConfirmUserAuthorizedSnapshot' }
  if (-not $ProductionRecipientFile) { $missing += 'ProductionRecipientFile' }
  return @($missing)
}
$all = @{
  LiveExecution=$true; AllowProductionRead=$true; AllowSupabaseStorageRead=$true; AllowExternalWasabiUpload=$true
  ConfirmProductionProjectRef='ohkoojpzmptdfyowdgog'; ConfirmReleaseGateLocked=$true; ConfirmEncryptedOutputOnly=$true
  ConfirmWasabiProductionScope=$true; ConfirmVeraCryptWorkspaceMounted=$true; ConfirmLocalEncryptedArchiveCopy=$true
  ConfirmUserAuthorizedSnapshot=$true; ProductionRecipientFile='X'
}
$full = @(Test-Guards @all)
$oneHash = $all.Clone(); $oneHash['AllowProductionRead'] = $false
$one = @(Test-Guards @oneHash)
$manyHash = $all.Clone(); $manyHash['AllowProductionRead'] = $false; $manyHash['ConfirmReleaseGateLocked'] = $false
$many = @(Test-Guards @manyHash)
$none = @(Test-Guards)
$msgOne = 'missing guards: ' + ($one -join ', ')
$msgMany = 'missing guards: ' + ($many -join ', ')
$ok = (
  (Get-StrictCount $full) -eq 0 -and
  (Get-StrictCount $one) -eq 1 -and $one[0] -eq 'AllowProductionRead' -and $msgOne -eq 'missing guards: AllowProductionRead' -and
  (Get-StrictCount $many) -eq 2 -and $msgMany -eq 'missing guards: AllowProductionRead, ConfirmReleaseGateLocked' -and
  (Get-StrictCount $none) -eq 12 -and
  ($msgOne -notmatch 'System\.Object\[\]') -and ($msgMany -notmatch 'System\.Object\[\]')
)
if ($ok) { 'GUARD_FLAT_PASS' } else { "GUARD_FLAT_FAIL full=$(Get-StrictCount $full) one=$msgOne many=$msgMany none=$(Get-StrictCount $none)" }
"""
    proc = run_ps(guard_script)
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0 and "GUARD_FLAT_PASS" in blob, "guard 0/1/many flat names")
    if "GUARD_FLAT_PASS" not in blob:
        print(blob[-800:], file=sys.stderr)

    # 4-6: recipient line counts
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        one = td_path / "one.txt"
        zero = td_path / "zero.txt"
        many = td_path / "many.txt"
        one.write_text(
            "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq\n",
            encoding="utf-8",
        )
        zero.write_text("# only comment\n\n", encoding="utf-8")
        many.write_text(
            "age1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
            "age1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n",
            encoding="utf-8",
        )
        rec_script = (
            "Set-StrictMode -Version Latest\n"
            "$ErrorActionPreference = 'Stop'\n"
            "function Get-StrictCount { param($Value) if ($null -eq $Value) { return 0 }; return @($Value).Count }\n"
            "function Test-Rec([string]$Path) {\n"
            "  $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8\n"
            "  $lines = @($raw -split \"`r?`n\" | ForEach-Object { $_.Trim() } | Where-Object { $_ -and -not $_.StartsWith('#') })\n"
            "  return (Get-StrictCount $lines)\n"
            "}\n"
            f"$c1 = Test-Rec '{str(one)}'\n"
            f"$c0 = Test-Rec '{str(zero)}'\n"
            f"$c2 = Test-Rec '{str(many)}'\n"
            "if ($c1 -eq 1 -and $c0 -eq 0 -and $c2 -eq 2) { 'RECIPIENT_COUNT_PASS' } else { \"RECIPIENT_COUNT_FAIL $c1 $c0 $c2\" }\n"
        )
        proc = run_ps(rec_script)
        blob = (proc.stdout or "") + (proc.stderr or "")
        check(proc.returncode == 0 and "RECIPIENT_COUNT_PASS" in blob, "recipient 0/1/many line counts")

    # 7-8: tool resolution
    tool_script = r"""
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$age = @(Get-Command age -ErrorAction SilentlyContinue)
$missing = @(Get-Command boundlore-tool-does-not-exist-xyz -ErrorAction SilentlyContinue)
$a = @($age).Count
$m = @($missing).Count
if ($a -ge 1 -and $m -eq 0) { 'TOOL_COUNT_PASS' } else { "TOOL_COUNT_FAIL a=$a m=$m" }
"""
    proc = run_ps(tool_script)
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0 and "TOOL_COUNT_PASS" in blob, "tool resolution 0/1+ counts")

    # 9-10: JSON object vs array
    json_script = r"""
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$one = '{"a":1}' | ConvertFrom-Json
$arr = '[{"a":1},{"a":2}]' | ConvertFrom-Json
$c1 = @($one).Count
$c2 = @($arr).Count
if ($c1 -eq 1 -and $c2 -eq 2) { 'JSON_COUNT_PASS' } else { "JSON_COUNT_FAIL $c1 $c2" }
"""
    proc = run_ps(json_script)
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0 and "JSON_COUNT_PASS" in blob, "JSON object vs array counts")

    # 11: preflight
    proc = run_runner()
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0, "preflight exit 0")
    check("PREFLIGHT_PASS" in blob, "PREFLIGHT_PASS")
    check("PropertyNotFoundStrict" not in blob, "no PropertyNotFoundStrict in preflight")
    check("System.Object[]" not in blob, "no System.Object[] in preflight")

    # 12: partial live guards — concrete names
    proc = run_runner(["-LiveExecution", "-AllowProductionRead"])
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode != 0, "partial live blocked")
    check("STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" in blob, "authorization stop")
    check("PropertyNotFoundStrict" not in blob, "no Count crash on partial live")
    check("System.Object[]" not in blob, "no System.Object[] in missing-guards message")
    check(
        "AllowSupabaseStorageRead" in blob or "ConfirmReleaseGateLocked" in blob,
        "concrete missing guard name",
    )

    # Full guard set without V: — must not false-stop with System.Object[]
    with tempfile.TemporaryDirectory() as td:
        rec = Path(td) / "rec.txt"
        rec.write_text(
            "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq\n",
            encoding="ascii",
        )
        proc = run_runner(
            [
                "-LiveExecution",
                "-AllowProductionRead",
                "-AllowSupabaseStorageRead",
                "-AllowExternalWasabiUpload",
                "-ConfirmProductionProjectRef",
                "ohkoojpzmptdfyowdgog",
                "-ConfirmReleaseGateLocked",
                "-ConfirmEncryptedOutputOnly",
                "-ConfirmWasabiProductionScope",
                "-ConfirmVeraCryptWorkspaceMounted",
                "-ConfirmLocalEncryptedArchiveCopy",
                "-ConfirmUserAuthorizedSnapshot",
                "-ProductionRecipientPath",
                str(rec),
                "-LocalEncryptedArchiveRoot",
                str(Path(td) / "archives"),
            ]
        )
        blob = (proc.stdout or "") + (proc.stderr or "")
        check(proc.returncode != 0, "full-guards without V: still stops")
        check("PropertyNotFoundStrict" not in blob, "empty-missing guards no Count crash")
        check("System.Object[]" not in blob, "full guards no System.Object[]")
        check("missing guards: System.Object[]" not in blob, "no nested-array authorization stop")
        check(
            proc.returncode != 0
            and "missing guards: System.Object[]" not in blob
            and "LIVE_SEQUENCE_START" not in blob
            and "Enter Production DB" not in blob,
            "fail-closed after guards without live network",
        )
        check("LIVE_SEQUENCE_START" not in blob, "live sequence not entered without V:")
        check("Enter Production DB" not in blob, "no credential prompts without V:")

    # Staging / wrong project
    proc = run_runner(
        ["-NoPreflightOnly", "-ConfirmProductionProjectRef", "jzzgoiwfbuwiiyvwgwri"]
    )
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode != 0 and "STOP_STAGING_TARGET" in blob, "staging ref blocked")

    proc = run_runner(["-NoPreflightOnly", "-ConfirmProductionProjectRef", "badref"])
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode != 0 and "STOP_WRONG_PROJECT" in blob, "wrong project blocked")

    # 13: synthetic offline
    proc = run_runner(["-RunSyntheticOfflineTest"])
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0 and "SYNTHETIC_OFFLINE_PASS" in blob, "synthetic offline pass")
    check('"external_requests":0' in blob or '"external_requests": 0' in blob, "external_requests 0")
    check("PropertyNotFoundStrict" not in blob, "no Count crash in synthetic")

    text = RUNNER.read_text(encoding="utf-8")
    check("function Get-StrictCount" in text, "Get-StrictCount defined")
    check("return @($missing)" in text, "guards return enumerable array")
    check(
        "return , @($missing)" not in text and "return ,@($missing)" not in text,
        "no unary-comma nest",
    )
    check("$missing = @(Test-AllLiveGuardsPresent)" in text, "guards call wrapped")
    check("System.Object[]" in text, "nested-array message rejection present")

    print(f"[p5-production-snapshot-count-regression-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-snapshot-count-regression-check] All checks passed")


if __name__ == "__main__":
    main()
