#!/usr/bin/env python3
"""Runtime offline checks for P5-E.10B-W5-P2 (no Supabase / no Wasabi network)."""
from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "tools" / "backup" / "Invoke-BoundLoreProductionSnapshot.ps1"

CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-snapshot-runner-runtime-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-snapshot-runner-runtime-check] FAIL: {msg}", file=sys.stderr)


def run(args: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(RUNNER), *args],
        capture_output=True,
        text=True,
    )


def main() -> None:
    check(RUNNER.is_file(), "runner present")

    proc = run([])
    blob = proc.stdout + proc.stderr
    check(proc.returncode == 0, "default preflight exit 0")
    check("PREFLIGHT_PASS" in blob, "PREFLIGHT_PASS")
    check("live_network_armed" in blob and "false" in blob.lower(), "live network disarmed in preflight")

    proc = run(["-RunNegativeTests"])
    blob = proc.stdout + proc.stderr
    check(proc.returncode == 0, "negative tests exit 0")
    check("NEGATIVE_TESTS_PASS" in blob, "NEGATIVE_TESTS_PASS")
    check("PASS STOP_STAGING_TARGET" in blob, "staging negative")
    check("PASS FAIL_PRIVATE_KEY_PRESENT_IN_PUBLIC_RECIPIENT_FILE" in blob, "private recipient negative")
    check("PASS STOP_VERACRYPT_OR_UNSAFE" in blob or "PASS STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED" in blob, "veracrypt negative")

    proc = run(["-RunSyntheticOfflineTest"])
    blob = proc.stdout + proc.stderr
    check(proc.returncode == 0, "synthetic offline exit 0")
    check("SYNTHETIC_OFFLINE_PASS" in blob, "SYNTHETIC_OFFLINE_PASS")
    check("PASS_SYNTHETIC_OFFLINE_PRODUCTION_SNAPSHOT_RUNNER" in blob, "validation status")
    check('"external_requests":0' in blob or '"external_requests": 0' in blob, "external 0")
    check('"wasabi_requests":0' in blob or '"wasabi_requests": 0' in blob, "wasabi 0")
    check('"supabase_requests":0' in blob or '"supabase_requests": 0' in blob, "supabase 0")
    check('"plaintext_uploaded":false' in blob or '"plaintext_uploaded": false' in blob, "no plaintext upload")
    check("NOT_YET_PERFORMED" in blob, "no getobject readback claim")
    check('"production_data":false' in blob or '"production_data": false' in blob, "no production data")

    proc = run(["-LiveExecution", "-AllowProductionRead"])
    blob = proc.stdout + proc.stderr
    check(proc.returncode != 0, "partial live guards blocked")
    check("STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" in blob, "authorization stop")

    print(f"[p5-production-snapshot-runner-runtime-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-snapshot-runner-runtime-check] All checks passed")


if __name__ == "__main__":
    main()
