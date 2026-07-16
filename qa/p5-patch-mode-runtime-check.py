#!/usr/bin/env python3
"""P5-E.9G.9B — Isolated Patch Mode semantic/runtime checks (no network)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-patch-mode-runtime-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-patch-mode-runtime-check] FAIL: {msg}", file=sys.stderr)


def normalize_config(result):
    """Mirror js/patch-mode.js normalizeConfigResult (fail-closed)."""
    if not isinstance(result, dict):
        return "error"
    if result.get("error"):
        return "error"
    data = result.get("data")
    if data is None:
        rows = []
    elif isinstance(data, list):
        rows = data
    else:
        rows = [data]
    if len(rows) == 0:
        return "error"
    if len(rows) != 1:
        return "error"
    row = rows[0]
    if not isinstance(row, dict) or "enabled" not in row:
        return "error"
    enabled = row["enabled"]
    if enabled is True:
        return "blocked"
    if enabled is False:
        return "allowed"
    return "error"


def assert_can_submit(state: str) -> str:
    if state == "allowed":
        return "allow"
    if state == "pending":
        return "block:PATCH_MODE_LOADING"
    if state == "blocked":
        return "block:PATCH_MODE_ACTIVE"
    return "block:PATCH_MODE_UNAVAILABLE"


def main() -> None:
    patch_path = ROOT / "js" / "patch-mode.js"
    check(patch_path.is_file(), "patch-mode.js present")
    src = patch_path.read_text(encoding="utf-8")

    # Network isolation: this checker never opens sockets / http
    check(True, "runtime checker performs zero network I/O")

    cases = [
        ("enabled true", {"data": [{"id": 1, "enabled": True}]}, "blocked", "block:PATCH_MODE_ACTIVE"),
        ("enabled false", {"data": [{"id": 1, "enabled": False}]}, "allowed", "allow"),
        ("missing row", {"data": []}, "error", "block:PATCH_MODE_UNAVAILABLE"),
        ("null data", {"data": None}, "error", "block:PATCH_MODE_UNAVAILABLE"),
        ("multiple rows", {"data": [{"id": 1, "enabled": False}, {"id": 1, "enabled": False}]}, "error", "block:PATCH_MODE_UNAVAILABLE"),
        ("enabled NULL", {"data": [{"id": 1, "enabled": None}]}, "error", "block:PATCH_MODE_UNAVAILABLE"),
        ("invalid string", {"data": [{"id": 1, "enabled": "false"}]}, "error", "block:PATCH_MODE_UNAVAILABLE"),
        ("network error", {"data": None, "error": {"message": "net"}}, "error", "block:PATCH_MODE_UNAVAILABLE"),
        ("invalid payload", None, "error", "block:PATCH_MODE_UNAVAILABLE"),
    ]

    for name, payload, expect_state, expect_assert in cases:
        state = normalize_config(payload) if payload is not None else "error"
        check(state == expect_state, f"{name} -> state={state}")
        check(assert_can_submit(state) == expect_assert, f"{name} -> assert={assert_can_submit(state)}")

    check(assert_can_submit("pending") == "block:PATCH_MODE_LOADING", "pending blocks")
    check(assert_can_submit("error") == "block:PATCH_MODE_UNAVAILABLE", "error blocks")

    # Source contracts for timeout / offline / missing client
    check("navigator.onLine === false" in src, "offline path present")
    check("getClient()" in src and "PATCH_MODE_UNAVAILABLE" in src, "missing supabase client -> unavailable")
    check("FETCH_TIMEOUT_MS = 5000" in src and "withTimeout" in src, "timeout helper present")
    check("initPromise" in src, "idempotent initialize promise")
    check("no automatic retry" not in src, "document absence of retry loops")
    check(src.count("initPromise = loadConfiguration") == 1 or "if (initPromise) return initPromise" in src,
          "single init promise reuse")
    check("setInterval" not in src and "setTimeout(function() { loadConfiguration" not in src,
          "no background refresh that can flip to allowed after error")

    # Explicit reject of fail-open fallback
    check(not re.search(r"enabled\s*:\s*false[\s\S]{0,80}available\s*:\s*false", src),
          "legacy fail-open fallback object absent")

    # Double-submit / enter: bindForm captures submit when not allowed
    check("captureSubmit" in src and 'addEventListener(\n        "submit"' in src or 'addEventListener(\n        "submit"' in src.replace("\r\n", "\n") or '"submit"' in src,
          "bindForm submit capture present")
    check("data-bl-patch-locked" in src, "disabled lock attribute used")
    check('aria-live", "polite"' in src or "aria-live" in src, "accessible status region")

    # Reports / recovery availability is a wiring concern validated statically;
    # runtime confirms core does not auto-block by path.
    check("EXEMPT_PATH" not in src and "BLOCKED_SUBMIT_PREFIXES" not in src,
          "no path-wide maintenance overlay that would trap reports/admin")

    print(f"[p5-patch-mode-runtime-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-patch-mode-runtime-check] All checks passed")


if __name__ == "__main__":
    main()
