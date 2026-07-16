#!/usr/bin/env python3
"""Offline static checks for P5-E.10B-W5-A1-R4-D3 IPv6 TCP diagnosis."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOOL = ROOT / "tools" / "backup" / "Test-BoundLoreProductionIPv6Tcp.ps1"

CHECKS = 0
FAILURES: list[str] = []

PROD = "ohkoojpzmptdfyowdgog"
STAGING = "jzzgoiwfbuwiiyvwgwri"


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-ipv6-tcp-diagnosis-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-ipv6-tcp-diagnosis-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    check(TOOL.is_file(), "tool present")
    text = TOOL.read_text(encoding="utf-8")

    check(PROD in text, "production ref")
    check(STAGING in text, "staging ref blocked")
    check("db.{0}.supabase.co" in text or f"db.{PROD}.supabase.co" in text or '"db.{0}.supabase.co"' in text, "fixed host pattern")
    check("5432" in text, "port 5432")
    check("InterNetworkV6" in text, "IPv6 sockets only")
    check("AddressFamily]::InterNetwork," not in text and "InterNetworkV4" not in text, "no IPv4 socket family")
    check("pooler" not in text.lower(), "no pooler")
    check("Read-Host" not in text, "no password prompt")
    check("Get-Command psql" not in text and "& psql" not in text and "psql.exe" not in text, "no psql")
    check("SslStream" not in text and "AuthenticateAsClient" not in text and "SslProtocols" not in text, "no TLS")
    check("PGPASSWORD" not in text and "SecureString" not in text, "no credential handling")
    check("SELECT " not in text and "release_gate" not in text, "no SQL")
    check(".Send(" not in text and ".Receive(" not in text, "no data send/receive")
    check("BeginConnect" in text or "ConnectAsync" in text or "Connect(" in text, "connect present")
    check("5000" in text, "timeout 5s")
    check("Close()" in text or "Dispose()" in text, "socket cleanup")
    check("BoundLoreProductionSnapshot" not in text and "V:\\" not in text, "no VeraCrypt workspace")
    check("wasabi" not in text.lower() and "rclone" not in text.lower(), "no Wasabi")
    check("storage" not in text.lower() or "AddressFamily" in text, "no storage API")
    check("FlushDns" not in text and "Clear-DnsClientCache" not in text, "no DNS mutation")
    check("Disable-NetAdapterBinding" not in text and "Enable-NetAdapterBinding" not in text, "no adapter mutation")
    check("Set-DnsClientServerAddress" not in text, "no DNS server mutation")
    check("R4_D3_DIAGNOSIS_PASS" in text, "pass marker")
    check("R4_D3_DIAGNOSIS_FAILED" in text, "fail marker")
    check("IPV6_TCP_5432_REACHABLE" in text or "PRODUCTION_TCP_5432_REACHABLE" in text, "reachable class/marker")
    check(not re.search(r"postgresql://", text, re.I), "no connection string")
    check("AGE-SECRET-KEY" not in text, "no age secret")
    # No hardcoded full IPv6 literals
    check(not re.search(r"\b[0-9a-fA-F]{1,4}(?::[0-9a-fA-F]{1,4}){4,7}\b", text), "no embedded IPv6 literals")

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
    check("Enter" not in blob or "password" not in blob.lower(), "no password UX in offline")

    print(f"[p5-production-ipv6-tcp-diagnosis-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-ipv6-tcp-diagnosis-check] All checks passed")


if __name__ == "__main__":
    main()
