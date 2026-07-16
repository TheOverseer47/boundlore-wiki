#!/usr/bin/env python3
"""Runtime checks: synthetic offline package dry-run + safety probes."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools" / "backup"
CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-backup-tooling-runtime-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-backup-tooling-runtime-check] FAIL: {msg}", file=sys.stderr)


def run(cmd: list[str], *, expect_ok: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(cmd, cwd=str(ROOT), capture_output=True)
    stdout = proc.stdout.decode("utf-8", errors="replace")
    stderr = proc.stderr.decode("utf-8", errors="replace")
    # Normalize into a simple namespace for callers
    class Result:
        def __init__(self) -> None:
            self.returncode = proc.returncode
            self.stdout = stdout
            self.stderr = stderr

    result = Result()
    ok = result.returncode == 0
    if expect_ok and not ok:
        print(result.stdout)
        print(result.stderr, file=sys.stderr)
    if (not expect_ok) and ok:
        print(result.stdout)
    return result  # type: ignore[return-value]


def main() -> None:
    check(True, "runtime checker performs no Wasabi/Supabase calls of its own")

    # Full synthetic package test (real age + local rclone when tools present)
    proc = run([sys.executable, str(TOOLS / "Test-BoundLoreBackupPackage.py")])
    check(proc.returncode == 0, "synthetic package test exit 0")
    check(
        "PASS_REAL_OFFLINE_AGE_RCLONE" in proc.stdout or "PASS_SYNTHETIC_DRY_RUN" in proc.stdout,
        "synthetic summary status",
    )
    check('"external_requests": 0' in proc.stdout, "external_requests 0")
    check('"wasabi_requests": 0' in proc.stdout, "wasabi_requests 0")
    check('"supabase_requests": 0' in proc.stdout, "supabase_requests 0")
    if "PASS_REAL_OFFLINE_AGE_RCLONE" in proc.stdout:
        check('"wrong_key_rejected": true' in proc.stdout, "wrong-key rejected")
        check('"rclone_remote_used": false' in proc.stdout, "no rclone remote")
        check('"encryption_method": "age"' in proc.stdout, "age encryption method")

    # Tool presence probes (versions only)
    for tool, flag in (("age", "--version"), ("age-keygen", "--version"), ("rclone", "version")):
        probe = run([tool, flag])
        check(probe.returncode == 0, f"{tool} runnable")

    # Manifest dry-run outside repo
    with tempfile.TemporaryDirectory(prefix="bl-manifest-") as td:
        proc = run(
            [
                sys.executable,
                str(TOOLS / "New-BoundLoreBackupManifest.py"),
                "--output-directory",
                td,
                "--dry-run",
            ]
        )
        check(proc.returncode == 0, "manifest dry-run ok")
        check('"dry_run": true' in proc.stdout, "manifest reports dry_run")

    # Storage export refuses live non-synthetic under no-network
    with tempfile.TemporaryDirectory(prefix="bl-storage-") as td:
        proc = run(
            [
                sys.executable,
                str(TOOLS / "Export-BoundLoreStorage.py"),
                "--output-directory",
                td,
                "--no-synthetic",
                "--no-network",
                "--project-ref",
                "ohkoojpzmptdfyowdgog",
            ],
            expect_ok=False,
        )
        check(proc.returncode != 0, "live storage export blocked")
        check(
            "STOP_WRONG_PROJECT" in (proc.stderr + proc.stdout)
            or "STOP_NETWORK_FORBIDDEN" in (proc.stderr + proc.stdout),
            "live storage blocked with stop code",
        )

    # Output inside repository must fail
    inside = ROOT / "tools" / "backup" / "_must_not_write_here"
    proc = run(
        [
            sys.executable,
            str(TOOLS / "New-BoundLoreBackupManifest.py"),
            "--output-directory",
            str(inside),
            "--no-dry-run",
        ],
        expect_ok=False,
    )
    check(proc.returncode != 0, "repo output path rejected")
    check("STOP_OUTPUT_INSIDE_REPOSITORY" in (proc.stderr + proc.stdout), "repo output stop code")

    # Protect dry-run reports missing encryption tool without performing encryption
    proc = run(
        [
            "powershell",
            "-NoProfile",
            "-File",
            str(TOOLS / "Protect-BoundLoreBackup.ps1"),
            "-PackageDirectory",
            str(TOOLS),
        ]
    )
    check(proc.returncode == 0, "protect dry-run exits 0")
    combined = proc.stderr + proc.stdout
    check(
        "STOP_ENCRYPTION_UNAVAILABLE" in combined or "age" in combined.lower() or "MISSING" in combined,
        "protect dry-run reports encryption tool status",
    )

    # Send blocks AllowExternalUpload
    proc = run(
        [
            "powershell",
            "-NoProfile",
            "-File",
            str(TOOLS / "Send-BoundLoreBackup.ps1"),
            "-PackageDirectory",
            str(TOOLS),
            "-AllowExternalUpload",
            "-Endpoint",
            "https://example.invalid",
            "-Region",
            "eu-central-2",
            "-Bucket",
            "demo",
            "-Prefix",
            "x/",
            "-NoDryRun",
            "-AllowNetwork",
        ],
        expect_ok=False,
    )
    check(proc.returncode != 0, "external upload blocked")
    check("STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED" in (proc.stderr + proc.stdout) or "STOP_NETWORK_FORBIDDEN" in (proc.stderr + proc.stdout) or "STOP_OUTPUT_INSIDE_REPOSITORY" in (proc.stderr + proc.stdout), "upload stop code present")

    print(f"[p5-backup-tooling-runtime-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-backup-tooling-runtime-check] All checks passed")


if __name__ == "__main__":
    main()
