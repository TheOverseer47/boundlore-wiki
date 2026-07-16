#!/usr/bin/env python3
"""Offline checks for P5-E.10B-W5-A1-R4 D1/D2 release-gate + DNS diagnosis."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIAG = ROOT / "tools" / "backup" / "Test-BoundLoreProductionReleaseGate.ps1"
LIVE = ROOT / "tools" / "backup" / "_lib" / "LiveProductionSnapshot.ps1"

CHECKS = 0
FAILURES: list[str] = []

PROD = "ohkoojpzmptdfyowdgog"
STAGING = "jzzgoiwfbuwiiyvwgwri"
SQL = "SELECT id, contribution_locked FROM public.release_gate WHERE id = 1;"


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-release-gate-diagnosis-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-release-gate-diagnosis-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    check(DIAG.is_file(), "diagnostic runner present")
    text = DIAG.read_text(encoding="utf-8")
    live = LIVE.read_text(encoding="utf-8") if LIVE.is_file() else ""

    check(f'db.{{0}}.supabase.co' in text or "db.$ExpectedProductionRef.supabase.co" in text or f"-f $ExpectedProductionRef" in text or '("db.{0}.supabase.co"' in text, "production direct host fixed")
    check(PROD in text, "production ref present")
    check(STAGING in text, "staging ref blocked symbol")
    check("DnsOnly" in text, "DnsOnly switch")
    check("DIRECT_HOST_IPV6_ONLY" in text, "AAAA-only class")
    check("Get-DnsAnswerCount" in text or "Resolve-DnsName" in text, "Resolve-DnsName used")
    check("Section" in text and "Answer" in text, "Answer-section filter")
    check("GetHostAddresses" in text, "System.Net.Dns comparison retained")
    check("DNS_RESOLVER_INCONSISTENT" in text, "resolver inconsistency marker")
    check("Read-Host -AsSecureString" in text, "secure password input")
    check("PGPASSWORD" in text, "child PGPASSWORD")
    check("PGSSLMODE" in text and "require" in text, "PGSSLMODE=require")
    check("default_transaction_read_only=on" in text, "read-only session")
    check(SQL in text, "exact allowed SQL")
    check("ZeroFreeBSTR" in text, "SecureString cleanup")
    check("ProcessStartInfo" in text, "ProcessStartInfo child")
    check("copyto" not in text.lower() and "rclone" not in text.lower(), "no Wasabi/rclone transfer")
    check("SUPABASE_SERVICE_ROLE" not in text, "no service role")
    check("pg_dump" not in text, "no pg_dump")
    check("TcpClient" not in text and "Test-NetConnection" not in text, "no TCP probe")
    param_block = text.split("param(")[1].split(")")[0] if "param(" in text else ""
    check("Password" not in param_block and "Secret" not in param_block, "no credential params")
    check("FlushDns" not in text and "Clear-DnsClientCache" not in text, "no DNS cache flush")
    check("Disable-NetAdapterBinding" not in text and "Enable-NetAdapterBinding" not in text, "no adapter mutation")
    check(not re.search(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", text), "no IPv4 literals in runner")
    check("AGE-SECRET-KEY" not in text, "no age secret")

    check("Invoke-PgChild" in live, "live Invoke-PgChild present")
    check("PGSSLMODE" not in live, "live path currently lacks PGSSLMODE (repair candidate)")

    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(DIAG),
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
    check("Enter Production DB password" not in blob, "no password prompt in offline test")

    # DnsOnly must not prompt for password; may use network DNS only
    proc = subprocess.run(
        [
            "powershell",
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-File",
            str(DIAG),
            "-DnsOnly",
        ],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    blob = (proc.stdout or "") + (proc.stderr or "")
    check("Enter Production DB password" not in blob, "DnsOnly no password prompt")
    check("psql" not in blob.lower() or "PSQL_NOT_FOUND" not in blob or "DNS_ONLY_MODE=true" in blob, "DnsOnly path engaged")
    check("DNS_ONLY_MODE=true" in blob, "DnsOnly mode marker")
    check(proc.returncode == 0 and "R4_D2_DNS_DIAGNOSIS_PASS" in blob, "DnsOnly diagnosis pass")
    check("DIRECT_HOST_IPV6_ONLY" in blob or "DIRECT_HOST_DNS_A" in blob, "DnsOnly class emitted")
    check(not re.search(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", blob), "no IPv4 in DnsOnly output")
    check("postgresql://" not in blob.lower(), "no connection string in DnsOnly output")

    print(f"[p5-production-release-gate-diagnosis-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-release-gate-diagnosis-check] All checks passed")


if __name__ == "__main__":
    main()
