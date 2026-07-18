#!/usr/bin/env python3
"""Static checks for P5-E.10B-W5-A7/A8 manual Wasabi upload backup launcher."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "tools" / "backup" / "Invoke-BoundLoreProductionSnapshot.ps1"
LIVE = ROOT / "tools" / "backup" / "_lib" / "LiveProductionSnapshot.ps1"
HAND = ROOT / "tools" / "backup" / "_lib" / "ManualUploadHandoff.ps1"
REPO_LIB = ROOT / "tools" / "backup" / "_lib" / "LauncherRepoRoot.ps1"
ORCH = ROOT / "tools" / "backup" / "launcher" / "Invoke-BoundLoreManualUploadBackup.ps1"
BAT = ROOT / "tools" / "backup" / "launcher" / "BoundLore-Create-Encrypted-Backup.bat"
INST = ROOT / "tools" / "backup" / "Install-BoundLoreManualUploadLauncher.ps1"
STOPS = ROOT / "tools" / "backup" / "_lib" / "stop_codes.py"
DOC = ROOT / "docs" / "architecture" / "p5-manual-wasabi-upload-backup-launcher.md"

CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-manual-wasabi-upload-backup-launcher-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-manual-wasabi-upload-backup-launcher-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    runner = RUNNER.read_text(encoding="utf-8")
    live = LIVE.read_text(encoding="utf-8")
    hand = HAND.read_text(encoding="utf-8")
    repo_lib = REPO_LIB.read_text(encoding="utf-8")
    orch = ORCH.read_text(encoding="utf-8")
    bat = BAT.read_text(encoding="utf-8", errors="replace")
    inst = INST.read_text(encoding="utf-8")
    stops = STOPS.read_text(encoding="utf-8")
    doc = DOC.read_text(encoding="utf-8") if DOC.is_file() else ""

    check(RUNNER.is_file() and LIVE.is_file() and HAND.is_file(), "core files present")
    check(ORCH.is_file() and BAT.is_file() and INST.is_file() and REPO_LIB.is_file(), "launcher files present")
    check("ManualWasabiUpload" in runner, "runner switch")
    check("ForManualWasabiUpload" in runner, "manual guard path")
    check("ManualWasabiUpload conflicts with AllowExternalWasabiUpload" in runner, "conflict guard")
    check("-ManualWasabiUpload:$ManualWasabiUpload" in runner, "switch forwarded")
    check("ManualUploadHandoff.ps1" in live, "handoff lib sourced")
    check("MANUAL_UPLOAD_HANDOFF_CREATED_PASS" in live, "handoff marker")
    check("LOCAL_BACKUP_READY_FOR_MANUAL_UPLOAD" in live, "local ready marker")
    check("AUTOMATIC_WASABI_UPLOAD=DEFERRED" in live, "deferred marker")
    check("S-07=OPEN" in live, "s07 open")
    check("New-BoundLoreManualUploadHandoff" in hand, "handoff writer")
    check("STOP_MANUAL_UPLOAD_HANDOFF_ALREADY_EXISTS" in hand and "CreateNew" in hand, "no overwrite")
    check("STOP_MANUAL_UPLOAD_HANDOFF_ALREADY_EXISTS" in stops, "stop code present")
    check("CREATE_LOCAL_ENCRYPTED_BACKUP_ONLY" in orch, "confirm gesture")
    check("STOP_BACKUP_ALREADY_RUNNING_OR_UNACKNOWLEDGED" in orch, "lock stop")
    check("boundlore-backup.lock" in orch, "lock path")
    check("ManualWasabiUpload" in orch, "orch starts manual mode")
    check("BOUNDLORE_MANUAL_UPLOAD_BACKUP_LAUNCHER" in bat, "bat banner")
    check("Invoke-BoundLoreManualUploadBackup.ps1" in bat, "bat starts orch")
    check("Invoke-BoundLoreProductionSnapshot" not in bat, "bat does not start runner directly")
    check(re.search(r"(?i)AKIA|SECRET_ACCESS|PASSWORD\s*=", bat) is None, "bat no secrets")
    check("OfflineTempInstallTest" in inst, "installer temp test")
    check("REPLACE_LAUNCHER_FILES" in inst, "installer replace ack")
    check("INSTALLER_DID_NOT_EXECUTE_BAT" in inst, "installer no bat exec")
    check("repo-root.txt" in inst and "Write-BoundLoreRepoRootConfigFile" in inst, "installer writes repo-root")
    check("Resolve-BoundLoreLauncherRepoRoot" in repo_lib, "resolve helper")
    check("Assert-BoundLoreLauncherRepoRoot" in repo_lib, "assert helper")
    check('Source = "PARAMETER"' in repo_lib, "param source")
    check('Source = "LOCAL_CONFIG"' in repo_lib, "local config source")
    check('Source = "PROCESS_ENV"' in repo_lib, "process env source")
    check("Resolve-BoundLoreLauncherRepoRoot" in orch, "orch uses resolve")
    check("cannot locate repository root; set BOUNDLORE_REPO_ROOT" not in orch, "no hard env requirement message")
    check("SetEnvironmentVariable" not in orch and "SetEnvironmentVariable" not in inst, "no persistent env writer")
    check("repo-root.txt" in doc and "A8-R1" in doc, "docs cover A8 repair")
    check("BOUNDLORE_REPO_ROOT" in doc and "optional" in doc.lower(), "docs env optional")
    # Manual chunk must not invoke rclone
    parts = live.split("if ($ManualWasabiUpload) {", 1)
    check(len(parts) == 2, "manual if present")
    if len(parts) == 2:
        manual = parts[1].split("} else {", 1)[0]
        check("RCLONE_CONFIG_" not in manual, "manual branch no RCLONE_CONFIG")
        check("copyto" not in manual, "manual branch no copyto")
        check("WASABI_PRODUCTION_UPLOAD_PASS" not in manual, "manual branch no upload pass")
        check("REMOTE_SIZE_VERIFICATION_PASS" not in manual, "manual branch no remote verify pass")
        check("New-BoundLoreManualUploadHandoff" in manual, "manual creates handoff")
    check("Get-Command rclone" in live, "rclone still required for automatic path")
    check("if (-not $ManualWasabiUpload)" in live and "Get-Command rclone" in live, "rclone gated")

    print(f"[p5-manual-wasabi-upload-backup-launcher-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        sys.exit(1)
    print("[p5-manual-wasabi-upload-backup-launcher-check] PASS")


if __name__ == "__main__":
    main()
