#!/usr/bin/env python3
"""Static checks for P5-E.10B-W5-A1 production snapshot runner (live path gated)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "tools" / "backup" / "Invoke-BoundLoreProductionSnapshot.ps1"
LIVE = ROOT / "tools" / "backup" / "_lib" / "LiveProductionSnapshot.ps1"
DB = ROOT / "tools" / "backup" / "Export-BoundLoreDatabase.ps1"
STOR = ROOT / "tools" / "backup" / "Export-BoundLoreStorage.py"
STOR_LIVE = ROOT / "tools" / "backup" / "Export-BoundLoreStorageLive.py"
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
    live = LIVE.read_text(encoding="utf-8")
    db = DB.read_text(encoding="utf-8")
    stor = STOR.read_text(encoding="utf-8")
    stor_live = STOR_LIVE.read_text(encoding="utf-8")
    stops = STOPS.read_text(encoding="utf-8")

    check(RUNNER.is_file(), "runner present")
    check(LIVE.is_file(), "live sequence module present")
    check(STOR_LIVE.is_file(), "live storage exporter present")
    check("$PreflightOnly = $true" in text, "PreflightOnly default")
    check("$Synthetic = $true" in text, "Synthetic default")
    check("$NoNetwork = $true" in text, "NoNetwork default")
    check("LiveExecution" in text, "LiveExecution required")
    check("ConfirmVeraCryptWorkspaceMounted" in text, "VeraCrypt confirmation")
    check("ConfirmLocalEncryptedArchiveCopy" in text, "local encrypted archive confirmation")
    check("ConfirmUserAuthorizedSnapshot" in text, "user authorization confirmation")
    check("ProductionRecipientPath" in text, "ProductionRecipientPath alias")
    check("VeraCryptWorkspaceRoot" in text, "VeraCryptWorkspaceRoot")
    check("LocalEncryptedArchiveRoot" in text, "LocalEncryptedArchiveRoot")
    check("STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED" in text, "veracrypt stop")
    check("STOP_PLAINTEXT_WORKSPACE_UNSAFE" in text, "plaintext workspace stop")
    check("Test-ProductionRecipientFile" in text, "recipient validation")
    check("FAIL_PRIVATE_KEY_PRESENT_IN_PUBLIC_RECIPIENT_FILE" in text, "private key in recipient rejected")
    check("GateAllowsLiveNetwork = $false" in text, "live network starts disarmed")
    check("GateAllowsLiveNetwork = $true" in text, "live network arm path present")
    check("function Get-StrictCount" in text, "StrictMode Count helper")
    check("return @($missing)" in text, "guards return enumerable for caller @()")
    check("return , @($missing)" not in text and "return ,@($missing)" not in text, "no unary-comma nested array")
    check("$missing = @(Test-AllLiveGuardsPresent)" in text, "guards result wrapped")
    check("Test-AllLiveGuardsPresent" in text, "full guard set required before arm")
    check("STOP_LIVE_NETWORK_RESERVED" in text, "reserved stop referenced in runner docs/path")
    check("STOP_LIVE_NETWORK_RESERVED" in stor, "offline storage remains reserved")
    check("STOP_LIVE_NETWORK_RESERVED" in db, "offline db remains reserved")
    check("STOP_LIVE_NETWORK_RESERVED" in stor_live, "live storage requires arming")
    check("BOUNDLORE_LIVE_NETWORK_ARMED" in stor_live, "live storage arm env")
    check("BOUNDLORE_LIVE_NETWORK_ARMED" in live, "live sequence arms child only")
    check("GetObjectInSnapshotPath = $false" in text, "no GetObject")
    check("DeleteImplemented = $false" in text, "no delete")
    check("trial-integration/" in text, "trial prefix forbidden")
    check("production-snapshots/" in text, "production prefix")
    check("s3.eu-central-2.wasabisys.com" in text, "endpoint guard")
    check("eu-central-2" in text, "region guard")
    check("ohkoojpzmptdfyowdgog" in text, "production ref guard")
    check("jzzgoiwfbuwiiyvwgwri" in text, "staging block")
    check("ZeroFreeBSTR" in text or "SecureString" in text, "secure string handling present")
    check("Read-Host -AsSecureString" in live, "interactive secure secrets")
    check("PGPASSWORD" in live, "db password child env")
    check("copyto" in live, "wasabi copyto only")
    check("GetObject" not in live or "getobject_attempted = $false" in live, "no getobject claim")
    check("rclone-empty.conf" in text or "RCLONE_CONFIG" in text, "ephemeral rclone config")
    check("NOT_PERFORMED" in live or "NOT_YET_PERFORMED" in text, "remote readback boundary")
    check("LOCAL_ENCRYPTED_ARCHIVE_LOCATION_REDACTED" in text, "archive path redacted")
    check("finally" in text and "finally" in live, "cleanup finally")
    check("high_level" not in live.lower() or "upload" in live.lower(), "upload path present")
    check("Invoke-LiveProductionSnapshotSequence" in text, "live sequence invoked from runner")

    param = text.split("param(")[1].split(")")[0]
    for needle in ("Password", "Secret", "AccessKey", "ServiceRole", "ConnectionString"):
        check(needle not in param, f"no credential param {needle}")

    check("pg_dumpall --roles-only --no-role-passwords" in db or "--no-role-passwords" in live, "roles without passwords")
    check("pg_dump --format=custom" in db or '"-Fc"' in live or "-Fc" in live, "custom dump")
    check("GateAllowsLiveNetwork = $false" in db, "db live disarmed by default")
    check("STOP_RELEASE_GATE_NOT_LOCKED" in db or "STOP_RELEASE_GATE_NOT_LOCKED" in live, "release gate")
    check("role_passwords_included = $false" in db or "role_passwords_included = $false" in live, "no password hashes")

    check('GATE_ALLOWS_LIVE_NETWORK = False' in stor, "storage live disarmed")
    check('"upload": False' in stor, "no upload capability")
    check('"delete": False' in stor, "no delete capability")
    check("STOP_INVENTORY_CHANGED_DURING_EXPORT" in stor or "STOP_INVENTORY_CHANGED_DURING_EXPORT" in stor_live, "inventory drift stop")
    check("add_argument(\"--service" not in stor and "add_argument('--service" not in stor, "no service-role CLI flag")
    check("BoundLoreBackups" not in text and "BoundLoreBackups" not in live, "no personal backup host path in tooling")

    for code in (
        "STOP_VERACRYPT_WORKSPACE_NOT_MOUNTED",
        "STOP_PLAINTEXT_WORKSPACE_UNSAFE",
        "STOP_LIVE_NETWORK_RESERVED",
        "STOP_GETOBJECT_NOT_AUTHORIZED",
        "STOP_LOCAL_ENCRYPTED_COPY_FAILED",
        "STOP_UPLOAD_COUNT_NOT_PROVEN",
        "FAIL_ROLE_PASSWORD_DATA_PRESENT",
    ):
        check(code in stops, f"stop code {code}")

    check(not re.search(r"AKIA[0-9A-Z]{16}", text + db + stor + live + stor_live), "no AKIA")
    check("boundlore-trial-backup-a7k4m9" not in text, "no trial bucket name")
    check(not re.search(r"age1[a-z0-9]{50,}", text + live), "no embedded age recipient value")
    check("AGE-SECRET-KEY" not in live or ('"AGE-SECRET-" + "KEY"' in text), "no private age key literal in live module")

    print(f"[p5-production-snapshot-runner-static-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-snapshot-runner-static-check] All checks passed")


if __name__ == "__main__":
    main()
