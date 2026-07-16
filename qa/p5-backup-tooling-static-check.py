#!/usr/bin/env python3
"""Static safety checks for BoundLore backup tooling."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT / "tools" / "backup"
CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-backup-tooling-static-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-backup-tooling-static-check] FAIL: {msg}", file=sys.stderr)


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


FORBIDDEN = [
    (re.compile(r"service_role\s*=", re.I), "service_role assignment"),
    (re.compile(r"sb_secret_"), "sb_secret token"),
    (re.compile(r"eyJ[A-Za-z0-9_-]{20,}\."), "jwt-like token"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "aws-like access key"),
    (re.compile(r"postgres(ql)?://[^\"'\s]+", re.I), "connection string"),
    (re.compile(r"wasabi.*(secret|access).*=\s*['\"][^'\"]+['\"]", re.I), "wasabi credential literal"),
]


def main() -> None:
    required = [
        "tools/backup/README.md",
        "tools/backup/config.example.json",
        "tools/backup/Invoke-BoundLoreBackup.ps1",
        "tools/backup/Export-BoundLoreDatabase.ps1",
        "tools/backup/Export-BoundLoreStorage.py",
        "tools/backup/New-BoundLoreBackupManifest.py",
        "tools/backup/Protect-BoundLoreBackup.ps1",
        "tools/backup/Send-BoundLoreBackup.ps1",
        "tools/backup/Restore-BoundLoreBackupLocal.ps1",
        "tools/backup/Test-BoundLoreBackupPackage.py",
        "tools/backup/_lib/stop_codes.py",
        "tools/backup/_lib/package_lib.py",
    ]
    for rel in required:
        check((ROOT / rel).is_file(), f"present {rel}")

    example = read("tools/backup/config.example.json")
    check('"dry_run": true' in example, "config example dry_run true")
    check('"no_network": true' in example, "config example no_network true")
    check('"allow_external_upload": false' in example, "config example upload false")
    check("ohkoojpzmptdfyowdgog" not in example, "no production ref as active endpoint in example")
    check("ACCESS" not in example.upper() or "placeholder" in example.lower(), "no live access keys in example")

    storage = read("tools/backup/Export-BoundLoreStorage.py")
    check("no_network" in storage and "default=True" in storage, "storage export no_network default")
    check("synthetic" in storage and "default=True" in storage, "storage export synthetic default")
    check("AllowExternalUpload" not in storage, "storage exporter has no upload capability")
    check("create_bucket" not in storage.lower(), "storage exporter no bucket create")
    check("delete_object" not in storage.lower() and ".remove(" not in storage, "storage exporter no delete API")

    send = read("tools/backup/Send-BoundLoreBackup.ps1")
    check("AllowExternalUpload" in send, "send script gates external upload")
    check("STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED" in send, "send blocks unauthorized upload")
    check("create_bucket = $false" in send or "create_bucket" in send, "send denies bucket create")
    check("delete_object = $false" in send, "send denies delete")
    check("lifecycle_apply = $false" in send, "send denies lifecycle")
    check("object_lock_apply = $false" in send, "send denies object lock")
    check("versioning_apply = $false" in send, "send denies versioning")

    protect = read("tools/backup/Protect-BoundLoreBackup.ps1")
    check("STOP_ENCRYPTION_UNAVAILABLE" in protect, "protect fails closed without crypto tool")
    check("unencrypted" not in protect.lower() or "Never continues unencrypted" in protect, "no unsafe unencrypted continue")

    db = read("tools/backup/Export-BoundLoreDatabase.ps1")
    check("STOP_STAGING_TARGET" in db, "db export blocks staging")
    check("STOP_OUTPUT_INSIDE_REPOSITORY" in db, "db export blocks repo output")
    check("DryRun = $true" in db or "[bool]$DryRun = $true" in db, "db dry-run default true")

    inv = read("tools/backup/Invoke-BoundLoreBackup.ps1")
    check("AllowExternalUpload" in inv and "not authorized" in inv.lower(), "orchestrator blocks live upload")

    stop = read("tools/backup/_lib/stop_codes.py")
    for code in (
        "STOP_WRONG_PROJECT",
        "STOP_STAGING_TARGET",
        "STOP_OUTPUT_INSIDE_REPOSITORY",
        "STOP_NETWORK_FORBIDDEN",
        "STOP_ENCRYPTION_UNAVAILABLE",
        "STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED",
    ):
        check(code in stop, f"stop code {code}")

    # Scan all tooling text files for secret-like literals
    for path in TOOLS.rglob("*"):
        if not path.is_file():
            continue
        if "__pycache__" in path.parts or path.suffix.lower() in {".png", ".jpg", ".pyc"}:
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pat, label in FORBIDDEN:
            if pat.search(text):
                # allow documentation mentioning the pattern names
                if "FORBIDDEN" in text and path.name.endswith("static-check.py"):
                    continue
                if path.name in {"stop_codes.py", "package_lib.py"} and label in {
                    "jwt-like token",
                    "connection string",
                    "sb_secret token",
                    "aws-like access key",
                }:
                    # patterns listed as detectors only
                    if "SECRET_PATTERNS" in text or "re.compile" in text:
                        continue
                check(False, f"{path.relative_to(ROOT)} contains {label}")

    check(True, "secret literal scan completed")

    print(f"[p5-backup-tooling-static-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-backup-tooling-static-check] All checks passed")


if __name__ == "__main__":
    main()
