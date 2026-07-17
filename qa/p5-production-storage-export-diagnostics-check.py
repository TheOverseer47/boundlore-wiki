#!/usr/bin/env python3
"""Offline checks for redacted storage-export diagnostics (no network)."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LIVE = ROOT / "tools" / "backup" / "_lib" / "LiveProductionSnapshot.ps1"
DIAG = ROOT / "tools" / "backup" / "_lib" / "StorageExportDiagnostics.ps1"
EXPORTER = ROOT / "tools" / "backup" / "Export-BoundLoreStorageLive.py"
TEST = ROOT / "tools" / "backup" / "Test-BoundLoreStorageExportDiagnostics.ps1"

CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-storage-export-diagnostics-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-storage-export-diagnostics-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    check(LIVE.is_file() and DIAG.is_file() and EXPORTER.is_file() and TEST.is_file(), "files present")
    live = LIVE.read_text(encoding="utf-8")
    diag = DIAG.read_text(encoding="utf-8")
    exp = EXPORTER.read_text(encoding="utf-8")

    check("StorageExportDiagnostics.ps1" in live, "live dotsources diagnostics lib")
    check("Resolve-StorageChildFailure" in live, "parent resolves child failure")
    check("$null = $pSt.StandardOutput.ReadToEnd()" not in live, "stdout no longer discarded")
    check("$null = $pSt.StandardError.ReadToEnd()" not in live, "stderr no longer discarded")
    check("$stOut = $pSt.StandardOutput.ReadToEnd()" in live, "stdout captured")
    check("$stErr = $pSt.StandardError.ReadToEnd()" in live, "stderr captured")
    check("Protect-StorageDiagnosticText" in diag, "redaction function")
    check("STOP_STORAGE_CREDENTIAL_MISSING" in diag, "credential stop known")
    check("STOP_UNKNOWN_STORAGE_BUCKET" in diag, "unknown bucket stop known")
    check("unclassified storage child failure" in diag, "unclassified fail-closed")
    check("bucket-list" in exp and "object-list" in exp and "object-download" in exp, "HTTP phases")
    check("urllib.error.URLError" in exp, "URLError handled")
    check("TimeoutError" in exp, "TimeoutError handled")
    check("ssl.SSLError" in exp, "SSLError handled")
    check("json.JSONDecodeError" in exp, "JSONDecodeError handled")
    check("OSError" in exp, "OSError handled")
    check("unclassified storage child failure" in exp, "python unclassified")
    check("upload" in exp and '"upload": False' in exp, "upload capability false")
    check(".upload(" not in exp and "method=\"PUT\"" not in exp and "method='PUT'" not in exp, "no upload method")
    check("method=\"DELETE\"" not in exp and "method='DELETE'" not in exp, "no delete method")
    check(not re.search(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", diag + live + exp), "no real JWT literals")

    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(TEST),
            "-OfflineSelfTest",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0, "offline self-test exit 0")
    check("OFFLINE_SELF_TEST_PASS" in blob, "OFFLINE_SELF_TEST_PASS")
    check("PLACEHOLDER_NOT_A_REAL_SERVICE_ROLE_VALUE_XYZ" not in blob or "PASS service-placeholder" in blob, "placeholder not leaked as live secret")
    check("secret/folder/file.png" not in blob, "object path not in offline output")

    print(f"[p5-production-storage-export-diagnostics-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
            if "offline" in item.lower():
                print(blob[-800:], file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-storage-export-diagnostics-check] All checks passed")


if __name__ == "__main__":
    main()
