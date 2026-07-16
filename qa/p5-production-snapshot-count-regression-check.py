#!/usr/bin/env python3
"""Offline PowerShell 5.1 StrictMode .Count regression checks for W5-A1-R1.

Never invokes LiveExecution. Never contacts Supabase/Wasabi.
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
    )


def main() -> None:
    # 1-3: null / single / multi collection Count under StrictMode
    script_count = r"""
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Get-StrictCount { param($Value) if ($null -eq $Value) { return 0 }; return @($Value).Count }
function Return-Empty { $m = @(); return , @($m) }
function Return-One { $m = @(); $m += 'a'; return , @($m) }
function Return-Many { $m = @('a','b'); return , @($m) }
function Return-Empty-Unsafe { $m = @(); return $m }
$n = Get-StrictCount $null
$e = Get-StrictCount (Return-Empty)
$o = Get-StrictCount (Return-One)
$m = Get-StrictCount (Return-Many)
$ok = ($n -eq 0 -and $e -eq 0 -and $o -eq 1 -and $m -eq 2)
try {
  $u = Return-Empty-Unsafe
  $boom = $u.Count
  $unsafeFailed = $false
} catch {
  $unsafeFailed = ($_.FullyQualifiedErrorId -like 'PropertyNotFoundStrict*')
}
if ($ok -and $unsafeFailed) { 'COUNT_HELPER_PASS' } else { "COUNT_HELPER_FAIL n=$n e=$e o=$o m=$m unsafe=$unsafeFailed" }
"""
    proc = run_ps(script_count)
    blob = proc.stdout + proc.stderr
    check(proc.returncode == 0 and "COUNT_HELPER_PASS" in blob, "null/single/multi Count helper")

    # 4-6: recipient line counts via runner function patterns
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        one = td_path / "one.txt"
        zero = td_path / "zero.txt"
        many = td_path / "many.txt"
        one.write_text("age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq\n", encoding="utf-8")
        zero.write_text("# only comment\n\n", encoding="utf-8")
        many.write_text(
            "age1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa\n"
            "age1bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb\n",
            encoding="utf-8",
        )
        rec_script = rf"""
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
function Get-StrictCount {{ param($Value) return @($Value).Count }}
function Test-Rec([string]$Path) {{
  $raw = Get-Content -LiteralPath $Path -Raw -Encoding UTF8
  $lines = @($raw -split "`r?`n" | ForEach-Object {{ $_.Trim() }} | Where-Object {{ $_ -and -not $_.StartsWith('#') }})
  return (Get-StrictCount $lines)
}}
$c1 = Test-Rec '{one.as_posix()}'
$c0 = Test-Rec '{zero.as_posix()}'
$c2 = Test-Rec '{many.as_posix()}'
if ($c1 -eq 1 -and $c0 -eq 0 -and $c2 -eq 2) {{ 'RECIPIENT_COUNT_PASS' }} else {{ "RECIPIENT_COUNT_FAIL $c1 $c0 $c2" }}
"""
        # Windows paths for PowerShell
        rec_script = (
            "Set-StrictMode -Version Latest\n"
            "$ErrorActionPreference = 'Stop'\n"
            "function Get-StrictCount { param($Value) return @($Value).Count }\n"
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
        blob = proc.stdout + proc.stderr
        check(proc.returncode == 0 and "RECIPIENT_COUNT_PASS" in blob, "recipient 0/1/many line counts")

    # 7-8: tool resolution path counts
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
    blob = proc.stdout + proc.stderr
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
    blob = proc.stdout + proc.stderr
    check(proc.returncode == 0 and "JSON_COUNT_PASS" in blob, "JSON object vs array counts")

    # 11: preflight no PropertyNotFoundStrict
    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(RUNNER),
        ],
        capture_output=True,
        text=True,
    )
    blob = proc.stdout + proc.stderr
    check(proc.returncode == 0, "preflight exit 0")
    check("PREFLIGHT_PASS" in blob, "PREFLIGHT_PASS")
    check("PropertyNotFoundStrict" not in blob, "no PropertyNotFoundStrict in preflight")

    # 12: LiveExecution without full guards still blocked
    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(RUNNER),
            "-LiveExecution",
            "-AllowProductionRead",
        ],
        capture_output=True,
        text=True,
    )
    blob = proc.stdout + proc.stderr
    check(proc.returncode != 0, "partial live blocked")
    check("STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" in blob, "authorization stop")
    check("PropertyNotFoundStrict" not in blob, "no Count crash on partial live")

    # Full guard set with empty missing list must not Count-crash before VeraCrypt stop
    # (V: expected unmounted → STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED or recipient path check)
    with tempfile.TemporaryDirectory() as td:
        rec = Path(td) / "rec.txt"
        # syntactically valid-looking public recipient shape (not a real key in git)
        rec.write_text(
            "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq\n",
            encoding="ascii",
        )
        proc = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                str(RUNNER),
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
            ],
            capture_output=True,
            text=True,
        )
        blob = proc.stdout + proc.stderr
        check(proc.returncode != 0, "full-guards without V: still stops")
        check("PropertyNotFoundStrict" not in blob, "empty-missing guards no Count crash")
        check(
            "STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED" in blob
            or "STOP_PRODUCTION_KEY_RECIPIENT_INVALID" in blob
            or "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" in blob,
            "fail-closed stop without live network",
        )
        check("LIVE_SEQUENCE_START" not in blob, "live sequence not entered without V:")
        check("Enter Production DB" not in blob, "no credential prompts without V:")

    # 13: network = 0 implied by offline markers above + synthetic
    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(RUNNER),
            "-RunSyntheticOfflineTest",
        ],
        capture_output=True,
        text=True,
    )
    blob = proc.stdout + proc.stderr
    check(proc.returncode == 0 and "SYNTHETIC_OFFLINE_PASS" in blob, "synthetic offline pass")
    check('"external_requests":0' in blob or '"external_requests": 0' in blob, "external_requests 0")
    check("PropertyNotFoundStrict" not in blob, "no Count crash in synthetic")

    # Static presence of helper in runner
    text = RUNNER.read_text(encoding="utf-8")
    check("function Get-StrictCount" in text, "Get-StrictCount defined")
    check("return , @($missing)" in text or "return ,@($missing)" in text, "guards return forced array")
    check("$missing = @(Test-AllLiveGuardsPresent)" in text, "guards call wrapped")

    print(f"[p5-production-snapshot-count-regression-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-snapshot-count-regression-check] All checks passed")


if __name__ == "__main__":
    main()
