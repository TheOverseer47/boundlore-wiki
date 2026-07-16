#!/usr/bin/env python3
"""Offline checks for P5-E.10B-W5-A1-R4-D4 session pooler release-gate diagnosis."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "tools" / "backup" / "Test-BoundLoreProductionSessionPoolerReleaseGate.ps1"
RUNNER = ROOT / "tools" / "backup" / "Invoke-BoundLoreProductionSnapshot.ps1"
LIVE = ROOT / "tools" / "backup" / "_lib" / "LiveProductionSnapshot.ps1"
STOPS = ROOT / "tools" / "backup" / "_lib" / "stop_codes.py"

CHECKS = 0
FAILURES: list[str] = []

PROD = "ohkoojpzmptdfyowdgog"
STAGING = "jzzgoiwfbuwiiyvwgwri"
SQL = "SELECT id, contribution_locked FROM public.release_gate WHERE id = 1;"
DIRECT = f"db.{PROD}.supabase.co"


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-session-pooler-diagnosis-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-session-pooler-diagnosis-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    check(TOOL.is_file(), "tool present")
    text = TOOL.read_text(encoding="utf-8")

    check(".pooler.supabase.com" in text, "session pooler suffix required")
    check(DIRECT in text or f"db.{{0}}.supabase.co" in text or "ForbiddenDirectHost" in text, "direct host blocked symbol")
    check(STAGING in text, "staging blocked")
    check(f"postgres.{PROD}" in text or 'postgres.{0}"' in text or "ExpectedUser" in text, "production user format")
    check('"5432"' in text or "5432" in text, "port 5432")
    check("6543" in text, "port 6543 blocked symbol")
    check("postgres" in text and "ExpectedDatabase" in text, "database postgres")
    check("Read-Host -AsSecureString" in text, "secure password")
    check("PGPASSWORD" in text, "child PGPASSWORD")
    check("PGSSLMODE" in text and "require" in text, "PGSSLMODE=require")
    check("default_transaction_read_only=on" in text, "read-only")
    check(SQL in text, "exact SQL")
    check(text.count("Invoke-SessionPoolerGateQuery") >= 1, "single query invoker")
    check("pg_dump" not in text and "pg_dumpall" not in text, "no dump")
    check("rclone" not in text.lower() and "copyto" not in text.lower(), "no Wasabi/rclone transfer")
    check("BoundLoreProductionSnapshot" not in text, "no VeraCrypt workspace")
    check("SUPABASE_SERVICE_ROLE" not in text, "no service role")
    check("ZeroFreeBSTR" in text, "credential cleanup")
    check("ProcessStartInfo" in text, "ProcessStartInfo")
    check("R4_D4_DIAGNOSIS_FAILED" in text, "fail marker")
    check("R4_D4_DIAGNOSIS_PASS" in text, "pass marker")
    check("SESSION_POOLER_HOST_INVALID" in text, "host invalid class")
    check("SESSION_POOLER_USER_INVALID" in text, "user invalid class")
    check("DB_PASSWORD_REJECTED" in text, "password class")
    check("Write-Host $result.StdErr" not in text, "no raw stderr dump")
    # Reject live connection-string usage; allow short rejection fixtures without user/pass/host path.
    check(not re.search(r"postgres(ql)?://[^\"'\s]+@[^\"'\s]+", text), "no credentialed connection string")
    check("://evil.example" in text or "block-uri" in text, "URI host rejection covered")
    check("for (" not in text.lower() and "while (" not in text.lower(), "no retry loops")
    # ensure only one live Invoke call path
    check(text.count("$result = Invoke-SessionPoolerGateQuery") == 1, "exactly one live psql invocation")
    check("1|t" in text and "1|true" in text, "accepts 1|t and 1|true")
    check("1|f" in text, "rejects 1|f in self-test")

    param_block = text.split("param(")[1].split(")")[0] if "param(" in text else ""
    check("Password" not in param_block and "Secret" not in param_block, "no credential params")

    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(TOOL),
            "-OfflineSelfTest",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    blob = (proc.stdout or "") + (proc.stderr or "")
    check(proc.returncode == 0, "offline self-test exit 0")
    check("OFFLINE_SELF_TEST_PASS" in blob, "OFFLINE_SELF_TEST_PASS")
    check("Enter Production DB password" not in blob, "no password prompt offline")

    # Post-live runner SessionPooler mode (static; no live connection)
    runner = RUNNER.read_text(encoding="utf-8") if RUNNER.is_file() else ""
    live = LIVE.read_text(encoding="utf-8") if LIVE.is_file() else ""
    stops = STOPS.read_text(encoding="utf-8") if STOPS.is_file() else ""
    check(RUNNER.is_file() and LIVE.is_file(), "runner + live module present")
    check('DatabaseConnectionMode = "Direct"' in runner, "Direct remains default")
    check("SessionPooler" in runner and "SessionPooler" in live, "SessionPooler explicit mode")
    check("-DatabaseConnectionMode $DatabaseConnectionMode" in runner, "mode must be passed explicitly")
    check("Assert-ProductionDbConnectionIdentity" in live, "identity assert for modes")
    check(".pooler.supabase.com" in live, "pooler host class required")
    check("direct host forbidden in SessionPooler mode" in live or "direct host forbidden" in live, "direct host blocked in SessionPooler")
    check("6543" in live and "transaction pooler port 6543 forbidden" in live, "port 6543 blocked")
    check("SessionPooler requires port 5432" in live, "port 5432 required for SessionPooler")
    check(f"postgres.{{0}}" in live or f"postgres.{PROD}" in live, "pooler user format enforced")
    check(STAGING in live, "staging blocked in live identity")
    check("PGSSLMODE" in live and '"require"' in live, "live PGSSLMODE=require")
    check("default_transaction_read_only=on" in live, "live read-only PGOPTIONS retained")
    check("STOP_PRODUCTION_DB_CONNECTION_FAILED" in live and "STOP_PRODUCTION_DB_CONNECTION_FAILED" in stops, "connection stop code")
    check("STOP_RELEASE_GATE_QUERY_FAILED" in live and "STOP_RELEASE_GATE_QUERY_FAILED" in stops, "query stop code")
    check("STOP_RELEASE_GATE_NOT_LOCKED" in live, "unlocked gate stop code")
    check("Resolve-ReleaseGateFailureStopCode" in live, "separated failure classifier")
    gate_pos = live.find("Release gate start")
    if gate_pos < 0:
        gate_pos = live.find("release gate pre-export")
    dump_pos = live.find("database.custom")
    check(gate_pos >= 0 and dump_pos > gate_pos, "release gate before export")
    check("automatic fallback" not in live.lower() and "auto fallback" not in live.lower(), "no automatic fallback")
    check("PGPASSWORD" in live and "-Password" in live, "password via child env helper")
    check("Write-Host $pgPass" not in live and "Write-Host $Password" not in live, "password not logged")

    print(f"[p5-production-session-pooler-diagnosis-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
            if "offline" in item.lower():
                print(blob[-600:], file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-session-pooler-diagnosis-check] All checks passed")


if __name__ == "__main__":
    main()
