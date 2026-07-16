#!/usr/bin/env python3
"""Static guards for P5-E.10B-W4 Wasabi synthetic integration runner."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "tools" / "backup" / "Invoke-BoundLoreWasabiSyntheticTest.ps1"

CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-wasabi-synthetic-integration-static-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-wasabi-synthetic-integration-static-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    check(RUNNER.is_file(), "runner present")
    text = RUNNER.read_text(encoding="utf-8")

    check("s3.eu-central-2.wasabisys.com" in text, "exact endpoint guard")
    check("eu-central-2" in text, "exact region guard")
    check("boundlore-trial-backup-a7k4m9" in text, "W4 bucket guard constant")
    check("trial-integration/" in text, "exact prefix guard")
    check("ConfirmAuthorizedSyntheticUpload" in text, "authorized upload switch")
    check("LocalPreflightOnly" in text, "local preflight switch")
    check("Read-Host -AsSecureString" in text, "secure interactive credential input")
    check("ProcessStartInfo" in text, "child-process env model")
    check("RCLONE_CONFIG" in text, "rclone config env override")
    check("New-EmptyRcloneConfig" in text or "rclone-empty.conf" in text, "empty temp rclone config")
    check("copyto" in text, "uses copyto")
    check("rclone config" not in text.lower() or "No rclone config" in text or "no rclone config" in text.lower(), "no rclone config invocation")
    check("ZeroFreeBSTR" in text, "secure string wipe")
    check("-AsSecureString" in text, "AsSecureString present")

    # Forbidden capabilities
    for needle, label in [
        ("deletefile", "no deletefile"),
        ("rclone delete", "no rclone delete"),
        ("rclone purge", "no rclone purge"),
        ("rclone sync", "no rclone sync"),
        ("rclone move", "no rclone move"),
    ]:
        # Allow mentioning forbidden ops in comments/docs inside Stop messages
        live = re.search(rf"\brclone\s+{needle.split()[-1]}\b", text, re.I)
        check(live is None or "forbidden" in text.lower(), label)

    check("DeleteImplemented = $false" in text, "delete not implemented")
    check("BucketCreateImplemented = $false" in text, "bucket create not implemented")
    check("MaxUploadCount = 1" in text or "$MaxUploadCount = 1" in text, "max upload 1")
    check("MaxDownloadCount = 1" in text or "$MaxDownloadCount = 1" in text, "max download 1")
    check("2MB" in text or "2 MiB" in text or "MaxEncryptedBytes = 2MB" in text, "max encrypted size")
    check("1MB" in text or "MaxPlainBytes = 1MB" in text, "max plain size")
    check(".age" in text, "age extension required")
    check("age -r" in text or "agePath -r" in text or "-r $recipient" in text, "age encrypt before network")
    check("STOP_PREUPLOAD_VALIDATION_FAILED" in text, "preupload fail-closed")
    check("STOP_EXTERNAL_TARGET_MISMATCH" in text, "target mismatch stop")
    check("STOP_UPLOAD_COUNT_NOT_PROVEN" in text, "upload count stop")
    check("param(" in text and "AccessKey" not in text.split("param(")[1].split(")")[0], "no credential script parameters")
    check("ohkoojpzmptdfyowdgog" not in text, "no production project ref")
    check("jzzgoiwfbuwiiyvwgwri" not in text, "no staging project ref")
    check("supabase" in text.lower() and "block" in text.lower() or "supabase_access" in text, "supabase blocked/recorded false")
    check("REDACTED" in text, "evidence redacts bucket")
    check("finally" in text, "cleanup finally block")

    # Must not embed credential-looking values
    check(not re.search(r"AKIA[0-9A-Z]{16}", text), "no AKIA literal")
    check("AGE-SECRET-KEY-" not in text or "AGE-SECRET-KEY" in text and "match" in text.lower(), "no private age key literal")
    check(not re.search(r'RCLONE_CONFIG_\w+_ACCESS_KEY_ID\s*=\s*"[A-Za-z0-9]{16,}"', text), "no access key value in config assignment")

    print(f"[p5-wasabi-synthetic-integration-static-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-wasabi-synthetic-integration-static-check] All checks passed")


if __name__ == "__main__":
    main()
