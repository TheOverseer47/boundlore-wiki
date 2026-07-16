#!/usr/bin/env python3
"""Static guards for P5-E.10B-W5-P1 production snapshot preflight."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "tools" / "backup" / "Invoke-BoundLoreProductionSnapshot.ps1"
STOPS = ROOT / "tools" / "backup" / "_lib" / "stop_codes.py"

CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-snapshot-preflight-static-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-snapshot-preflight-static-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    check(RUNNER.is_file(), "production snapshot runner present")
    check(STOPS.is_file(), "stop_codes present")
    text = RUNNER.read_text(encoding="utf-8")
    stops = STOPS.read_text(encoding="utf-8")

    check("PreflightOnly" in text, "PreflightOnly present")
    check("$PreflightOnly = $true" in text or "PreflightOnly = $true" in text, "PreflightOnly default true")
    check("$Synthetic = $true" in text, "Synthetic default true")
    check("$NoNetwork = $true" in text, "NoNetwork default true")
    check("AllowProductionRead" in text, "AllowProductionRead guard")
    check("AllowSupabaseStorageRead" in text, "AllowSupabaseStorageRead guard")
    check("AllowExternalWasabiUpload" in text, "AllowExternalWasabiUpload guard")
    check("ConfirmProductionProjectRef" in text, "ConfirmProductionProjectRef")
    check("ConfirmReleaseGateLocked" in text, "ConfirmReleaseGateLocked")
    check("ConfirmEncryptedOutputOnly" in text, "ConfirmEncryptedOutputOnly")
    check("ConfirmWasabiProductionScope" in text, "ConfirmWasabiProductionScope")
    check("ConfirmLocalArtifactPath" in text, "ConfirmLocalArtifactPath")
    check("ConfirmUserAuthorizedSnapshot" in text, "ConfirmUserAuthorizedSnapshot")
    check("STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED" in text, "authorization stop")
    check("ohkoojpzmptdfyowdgog" in text, "production ref as guard only")
    check("jzzgoiwfbuwiiyvwgwri" in text, "staging ref blocked")
    check("STOP_STAGING_TARGET" in text, "staging stop")
    check("STOP_UNKNOWN_DATABASE_SCHEMA" in text, "unknown schema stop")
    check("STOP_UNKNOWN_STORAGE_BUCKET" in text, "unknown bucket stop")
    check("avatars" in text and "discovery-uploads" in text and "report-screenshots" in text, "bucket allowlist")
    check("trial-integration/" in text and "STOP_REMOTE_SCOPE_NOT_AUTHORIZED" in text, "trial prefix forbidden for production")
    check("role_passwords_included" in text and "false" in text, "no role password hashes")
    check("STOP_PLAINTEXT_UPLOAD_ATTEMPTED" in text, "plaintext upload blocked")
    check("DeleteImplemented = $false" in text, "delete not implemented")
    check("LiveDumpImplemented = $false" in text, "live dump not implemented")
    check("RunSyntheticOfflineTest" in text, "synthetic offline test switch")
    check("RunNegativeTests" in text, "negative tests switch")
    check("finally" in text, "cleanup finally")
    check("age-keygen" in text and "age -r" in text or "-r $recipient" in text, "age encryption")
    check("rclone copyto" in text, "local rclone copyto")
    check("production_key_created_by_runner" in text, "runner does not create production key")

    # No credential parameters
    param_block = text.split("param(")[1].split(")")[0] if "param(" in text else ""
    for needle in ("Password", "Secret", "AccessKey", "ServiceRole", "ConnectionString", "AGE-SECRET"):
        check(needle not in param_block, f"no credential param {needle}")

    required_stops = [
        "STOP_PRODUCTION_SNAPSHOT_NOT_AUTHORIZED",
        "STOP_RELEASE_GATE_NOT_LOCKED",
        "STOP_UNKNOWN_DATABASE_SCHEMA",
        "STOP_UNKNOWN_STORAGE_BUCKET",
        "STOP_PLAINTEXT_UPLOAD_ATTEMPTED",
        "STOP_REMOTE_SCOPE_NOT_AUTHORIZED",
        "STOP_LOCAL_CLEANUP_FAILED",
        "SCHEMA_ALLOWLIST",
    ]
    for code in required_stops:
        check(code in stops or code in text, f"stop/schema symbol {code}")

    check(not re.search(r"AKIA[0-9A-Z]{16}", text), "no AKIA literal")
    check("AGE-SECRET-KEY-" not in text, "no age secret literal")
    check("boundlore-trial-backup-a7k4m9" not in text, "no trial bucket name in runner")
    check(not re.search(r"postgres(ql)?://\S+:\S+@", text, re.I), "no connection string")

    print(f"[p5-production-snapshot-preflight-static-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-snapshot-preflight-static-check] All checks passed")


if __name__ == "__main__":
    main()
