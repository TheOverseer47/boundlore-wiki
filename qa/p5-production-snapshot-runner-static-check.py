#!/usr/bin/env python3
"""Static checks for P5-E.10B-W5-P2 production snapshot runner finalization."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "tools" / "backup" / "Invoke-BoundLoreProductionSnapshot.ps1"
DB = ROOT / "tools" / "backup" / "Export-BoundLoreDatabase.ps1"
STOR = ROOT / "tools" / "backup" / "Export-BoundLoreStorage.py"
STOPS = ROOT / "tools" / "backup" / "_lib" / "stop_codes.py"

CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-snapshot-runner-static-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-snapshot-runner-static-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    text = RUNNER.read_text(encoding="utf-8")
    db = DB.read_text(encoding="utf-8")
    stor = STOR.read_text(encoding="utf-8")
    stops = STOPS.read_text(encoding="utf-8")

    check(RUNNER.is_file(), "runner present")
    check("$PreflightOnly = $true" in text, "PreflightOnly default")
    check("$Synthetic = $true" in text, "Synthetic default")
    check("$NoNetwork = $true" in text, "NoNetwork default")
    check("LiveExecution" in text, "LiveExecution required")
    check("ConfirmVeraCryptWorkspaceMounted" in text, "VeraCrypt confirmation")
    check("ConfirmLocalEncryptedArchiveCopy" in text, "local encrypted archive confirmation")
    check("STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED" in text, "veracrypt stop")
    check("STOP_PLAINTEXT_WORKSPACE_UNSAFE" in text, "plaintext workspace stop")
    check("Test-ProductionRecipientFile" in text, "recipient validation")
    check("FAIL_PRIVATE_KEY_PRESENT_IN_PUBLIC_RECIPIENT_FILE" in text, "private key in recipient rejected")
    check("GateAllowsLiveNetwork = $false" in text, "live network disarmed")
    check("STOP_LIVE_NETWORK_RESERVED" in text, "live reserved stop")
    check("GetObjectInSnapshotPath = $false" in text, "no GetObject")
    check("DeleteImplemented = $false" in text, "no delete")
    check("trial-integration/" in text, "trial prefix forbidden")
    check("production-snapshots/" in text, "production prefix")
    check("s3.eu-central-2.wasabisys.com" in text, "endpoint guard")
    check("eu-central-2" in text, "region guard")
    check("ohkoojpzmptdfyowdgog" in text, "production ref guard")
    check("jzzgoiwfbuwiiyvwgwri" in text, "staging block")
    check("ZeroFreeBSTR" in text or "SecureString" in text, "secure string handling present")
    check("rclone-empty.conf" in text or "RCLONE_CONFIG" in text, "ephemeral rclone config")
    check("NOT_YET_PERFORMED" in text, "remote readback boundary")
    check("LOCAL_ENCRYPTED_ARCHIVE_LOCATION_REDACTED" in text, "archive path redacted")
    check("finally" in text, "cleanup finally")

    param = text.split("param(")[1].split(")")[0]
    for needle in ("Password", "Secret", "AccessKey", "ServiceRole", "ConnectionString"):
        check(needle not in param, f"no credential param {needle}")

    check("pg_dumpall --roles-only --no-role-passwords" in db, "roles without passwords planned")
    check("pg_dump --format=custom" in db, "custom dump planned")
    check("GateAllowsLiveNetwork = $false" in db, "db live disarmed")
    check("STOP_RELEASE_GATE_NOT_LOCKED" in db, "db release gate")
    check("role_passwords_included = $false" in db, "no password hashes")

    check('GATE_ALLOWS_LIVE_NETWORK = False' in stor, "storage live disarmed")
    check('"upload": False' in stor, "no upload capability")
    check('"delete": False' in stor, "no delete capability")
    check("STOP_INVENTORY_CHANGED_DURING_EXPORT" in stor, "inventory drift stop")
    check("add_argument(\"--service" not in stor and "add_argument('--service" not in stor, "no service-role CLI flag")
    check("BoundLoreBackups" not in text, "no personal backup host path in runner")

    for code in (
        "STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED",
        "STOP_PLAINTEXT_WORKSPACE_UNSAFE",
        "STOP_LIVE_NETWORK_RESERVED",
        "STOP_GETOBJECT_NOT_AUTHORIZED",
    ):
        check(code in stops, f"stop code {code}")

    check(not re.search(r"AKIA[0-9A-Z]{16}", text + db + stor), "no AKIA")
    check("boundlore-trial-backup-a7k4m9" not in text, "no trial bucket name")
    check(not re.search(r"age1[a-z0-9]{50,}", text), "no embedded age recipient value")

    print(f"[p5-production-snapshot-runner-static-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-snapshot-runner-static-check] All checks passed")


if __name__ == "__main__":
    main()
