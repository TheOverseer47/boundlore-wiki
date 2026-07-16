#!/usr/bin/env python3
"""Runtime offline checks for P5-E.10B-W5-P1 (no Wasabi / no Supabase)."""
from __future__ import annotations

import json
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
        print(f"[p5-production-snapshot-preflight-runtime-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-snapshot-preflight-runtime-check] FAIL: {msg}", file=sys.stderr)


def run(args: list[str], expect_ok: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(RUNNER), *args],
        capture_output=True,
        text=True,
    )
    ok = proc.returncode == 0
    if expect_ok and not ok:
        print((proc.stderr or proc.stdout)[-500:], file=sys.stderr)
    if (not expect_ok) and ok:
        print("expected failure but got success", file=sys.stderr)
    return proc


def main() -> None:
    check(RUNNER.is_file(), "runner present")

    # Default preflight
    proc = run([])
    check(proc.returncode == 0, "default preflight exit 0")
    combined = proc.stdout + proc.stderr
    check("PREFLIGHT_PASS" in combined, "PREFLIGHT_PASS marker")
    check('"preflight_only": true' in combined or '"preflight_only":  true' in combined, "preflight_only true")
    check('"no_network": true' in combined or '"no_network":  true' in combined, "no_network true")
    check('"live_dump_authorized": false' in combined or '"live_dump_authorized":  false' in combined, "live dump false")

    # Negative suite
    proc = run(["-RunNegativeTests"])
    check(proc.returncode == 0, "negative tests exit 0")
    check("NEGATIVE_TESTS_PASS" in (proc.stdout + proc.stderr), "NEGATIVE_TESTS_PASS")
    check('"external_requests": 0' in (proc.stdout + proc.stderr) or '"external_requests":  0' in (proc.stdout + proc.stderr), "neg external 0")

    # Synthetic offline
    proc = run(["-RunSyntheticOfflineTest"])
    check(proc.returncode == 0, "synthetic offline exit 0")
    blob = proc.stdout + proc.stderr
    check("SYNTHETIC_OFFLINE_PASS" in blob, "SYNTHETIC_OFFLINE_PASS")
    check("PASS_SYNTHETIC_OFFLINE_PRODUCTION_SHAPE" in blob, "validation status")
    check('"external_requests":0' in blob or '"external_requests": 0' in blob or '"external_requests":  0' in blob, "synth external 0")
    check('"wasabi_requests":0' in blob or '"wasabi_requests": 0' in blob or '"wasabi_requests":  0' in blob, "wasabi 0")
    check('"supabase_requests":0' in blob or '"supabase_requests": 0' in blob or '"supabase_requests":  0' in blob, "supabase 0")
    check('"production_data":false' in blob or '"production_data": false' in blob or '"production_data":  false' in blob, "no production data")

    # Live intent without full guards
    proc = run(["-AllowProductionRead"], expect_ok=False)
    check(proc.returncode != 0, "AllowProductionRead alone blocked")
    check(
        "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" in (proc.stdout + proc.stderr),
        "authorization stop on partial guards",
    )

    # Staging ref
    proc = run(
        ["-NoPreflightOnly", "-ConfirmProductionProjectRef", "jzzgoiwfbuwiiyvwgwri"],
        expect_ok=False,
    )
    check(proc.returncode != 0, "staging blocked")
    check("STOP_STAGING_TARGET" in (proc.stdout + proc.stderr), "staging stop code")

    print(f"[p5-production-snapshot-preflight-runtime-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-snapshot-preflight-runtime-check] All checks passed")


if __name__ == "__main__":
    main()
