#!/usr/bin/env python3
"""Validate redacted P5-E.10B-W4 evidence after manual runner execution."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "qa" / "evidence" / "p5-e10b-w4-wasabi-synthetic-roundtrip.json"
RUNNER = ROOT / "tools" / "backup" / "Invoke-BoundLoreWasabiSyntheticTest.ps1"

CHECKS = 0
FAILURES: list[str] = []

FORBIDDEN_BUCKET = "boundlore-trial-backup-a7k4m9"
SECRET_PATTERNS = [
    re.compile(r"AGE-SECRET-KEY-"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"AWS_SECRET_ACCESS_KEY\s*=\s*\S+"),
    re.compile(r"RCLONE_CONFIG_\w+_SECRET_ACCESS_KEY\s*=\s*\S+"),
    re.compile(r"eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\."),
    re.compile(r"BEGIN (OPENSSH |RSA |EC )?PRIVATE KEY"),
    re.compile(re.escape(FORBIDDEN_BUCKET)),
]


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-wasabi-synthetic-integration-evidence-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-wasabi-synthetic-integration-evidence-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    if not EVIDENCE.is_file():
        print(
            "[p5-wasabi-synthetic-integration-evidence-check] "
            "STOP_CREDENTIAL_INPUT_REQUIRED: evidence missing — run "
            "Invoke-BoundLoreWasabiSyntheticTest.ps1 -ConfirmAuthorizedSyntheticUpload "
            "in a local PowerShell terminal (SecureString prompts; never paste secrets into Cursor).",
            file=sys.stderr,
        )
        raise SystemExit(2)

    raw = EVIDENCE.read_text(encoding="utf-8-sig")
    for pat in SECRET_PATTERNS:
        check(not pat.search(raw), f"secret/bucket pattern absent ({pat.pattern[:40]})")

    data = json.loads(raw)
    check(data.get("gate_id") == "P5-E.10B-W4", "gate id")
    check(data.get("synthetic") is True, "synthetic true")
    check(data.get("encrypted_before_upload") is True, "encrypted before upload")
    check(data.get("bucket") == "REDACTED", "bucket redacted")
    check(data.get("prefix") == "trial-integration/", "prefix")
    check(data.get("region") == "eu-central-2", "region")
    check(data.get("upload_count") == 1, "upload count 1")
    check(data.get("download_count") == 1, "download count 1")
    check(data.get("local_source_sha256") == data.get("readback_sha256"), "hash match")
    check(data.get("byte_comparison") == "PASS", "byte comparison")
    check(data.get("decryption") == "PASS", "decryption")
    check(data.get("manifest_validation") == "PASS", "manifest")
    check(data.get("package_validation") == "PASS", "package")
    check(data.get("local_cleanup") == "PASS", "cleanup")
    check(data.get("remote_object_retained") is True, "remote retained")
    check(data.get("credential_persistence") is False, "no credential persistence")
    check(data.get("rclone_config_persisted") is False, "no rclone config persist")
    check(data.get("production_data") is False, "no production data")
    check(data.get("supabase_access") is False, "no supabase")
    check(data.get("delete_attempted") is False, "no delete")
    check(
        data.get("verdict") == "PASS_ENCRYPTED_SYNTHETIC_WASABI_ROUNDTRIP_VERIFIED",
        "verdict pass",
    )
    check("Users\\" not in raw and "/Users/" not in raw, "no personal paths")
    check(RUNNER.is_file(), "runner still present")

    print(f"[p5-wasabi-synthetic-integration-evidence-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-wasabi-synthetic-integration-evidence-check] All checks passed")


if __name__ == "__main__":
    main()
