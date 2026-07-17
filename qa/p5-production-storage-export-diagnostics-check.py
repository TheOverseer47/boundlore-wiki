#!/usr/bin/env python3
"""Offline checks for storage export diagnostics + BL_STORAGE_STOP envelopes."""
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
CHILD = ROOT / "qa" / "p5-production-storage-child-envelope-check.py"
PREFIX = ROOT / "qa" / "p5-production-storage-prefix-traversal-check.py"

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
    check(all(p.is_file() for p in (LIVE, DIAG, EXPORTER, TEST, CHILD, PREFIX)), "files present")
    live = LIVE.read_text(encoding="utf-8")
    diag = DIAG.read_text(encoding="utf-8")
    exp = EXPORTER.read_text(encoding="utf-8")

    check("BL_STORAGE_STOP" in exp and "BL_STORAGE_STOP" in diag, "envelope marker")
    check("emit_parent_stop" in exp, "child emit_parent_stop")
    check("is_prefix_entry" in exp and "join_storage_path" in exp, "prefix traversal helpers")
    check("MAX_PREFIX_DEPTH" in exp, "prefix depth guard")
    check("ConvertFrom-StorageStopEnvelopeLine" in diag, "parent envelope parser")
    check("Normalize-StorageChildStreams" in diag, "stream normalize")
    check("no diagnostic output" in diag, "empty-stream class")
    check("redacted unclassified storage child failure" in diag, "unclassified class")
    check("$stOut = $pSt.StandardOutput.ReadToEnd()" in live, "stdout captured")
    check("$stErr = $pSt.StandardError.ReadToEnd()" in live, "stderr captured")
    check("$null = $pSt.StandardError.ReadToEnd()" not in live, "stderr not discarded")
    check("Resolve-StorageChildFailure" in live, "parent resolve call")
    check('"upload": False' in exp, "upload false")
    check("method=\"PUT\"" not in exp and "method=\"DELETE\"" not in exp, "no put/delete")
    check(not re.search(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}", diag + live + exp), "no jwt literals")

    proc = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(TEST), "-OfflineSelfTest"],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0, "parent offline self-test exit 0")
    check("OFFLINE_SELF_TEST_PASS" in blob, "OFFLINE_SELF_TEST_PASS")
    check("TEST_TOKEN_NOT_A_REAL_SECRET" not in blob or "PASS token-redacted" in blob, "token not leaked")

    child = subprocess.run(
        [sys.executable, str(CHILD)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    cblob = (child.stdout or "") + (child.stderr or "")
    check(child.returncode == 0, "child envelope harness exit 0")
    check("All checks passed" in cblob, "child harness passed")
    check("NETWORK_FORBIDDEN" not in cblob or "FAIL" not in cblob, "no network forbidden trips")

    prefix = subprocess.run(
        [sys.executable, str(PREFIX)],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    pblob = (prefix.stdout or "") + (prefix.stderr or "")
    check(prefix.returncode == 0, "prefix traversal harness exit 0")
    check("All checks passed" in pblob, "prefix harness passed")
    check("NO_REAL_NETWORK_INVOKED_PASS" in pblob, "prefix NO_REAL_NETWORK_INVOKED_PASS")

    print(f"[p5-production-storage-export-diagnostics-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-storage-export-diagnostics-check] All checks passed")


if __name__ == "__main__":
    main()
