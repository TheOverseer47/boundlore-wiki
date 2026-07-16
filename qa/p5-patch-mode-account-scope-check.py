#!/usr/bin/env python3
"""P5-E.9G.9C-R1 — Account Patch-Mode scope: logout/recovery free, avatar bound."""
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
        print(f"[p5-patch-mode-account-scope-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-patch-mode-account-scope-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    html = (ROOT / "wiki" / "account" / "index.html").read_text(encoding="utf-8")
    core = (ROOT / "js" / "patch-mode.js").read_text(encoding="utf-8")

    # Structural hosts
    host_match = re.search(
        r'<div id="accountAvatarPatchHost">(.*?)</div>\s*</div>\s*<div class="form-box"',
        html,
        re.S,
    )
    check(host_match is not None, "accountAvatarPatchHost wraps avatar controls before other sections")
    host_inner = host_match.group(1) if host_match else ""
    check("saveAvatarBtn" in host_inner and "avatarUrlInput" in host_inner, "avatar controls inside narrow host")
    check("logoutBtn2" not in host_inner, "logout not inside avatar patch host")
    check("sendResetMailBtn" not in host_inner, "password reset not inside avatar patch host")
    check("requestDeleteBtn" not in host_inner, "delete-request not inside avatar patch host")

    # Logout button semantics
    logout_tag = re.search(r'<button[^>]*id="logoutBtn2"[^>]*>', html)
    check(logout_tag is not None, "logoutBtn2 present")
    check(logout_tag is not None and 'type="button"' in logout_tag.group(0), "logoutBtn2 type=button")
    check(logout_tag is not None and "type=\"submit\"" not in logout_tag.group(0), "logoutBtn2 not type=submit")

    # Binding call must use narrow host variable, not accountContent
    check("accountAvatarPatchHost" in html, "narrow host id present")
    check("getElementById(\"accountAvatarPatchHost\")" in html or "getElementById('accountAvatarPatchHost')" in html,
          "script resolves avatar patch host")
    check("bindControls([\"#saveAvatarBtn\", \"#avatarUrlInput\"], avatarPatchHost)" in html, "bindControls uses avatarPatchHost")
    check("bindControls([\"#saveAvatarBtn\", \"#avatarUrlInput\"], document.getElementById(\"accountContent\")" not in html,
          "no bind to accountContent")

    # Core still disables type=submit inside bound host — so logout must stay outside
    check("button[type='submit']" in core or 'button[type="submit"]' in core or "button[type='submit']" in core.replace('"', "'"),
          "core still selects submit buttons inside bind host")
    # Simulate selector reachability: logout outside host => not disabled by avatar host binding
    check("logoutBtn2" in html and "accountAvatarPatchHost" in html and html.find("accountAvatarPatchHost") < html.find("logoutBtn2"),
          "logout appears after avatar host in markup (outside)")

    # Avatar remains guarded; logout/recovery not
    avatar_handler = html.split("saveAvatarBtn.addEventListener")[1].split("resetBtn.addEventListener")[0]
    check("assertCanSubmit" in avatar_handler, "avatar click asserts patch mode")
    reset_handler = html.split("resetBtn.addEventListener")[1].split("requestDeleteBtn.addEventListener")[0]
    check("assertCanSubmit" not in reset_handler, "reset handler free of assertCanSubmit")
    logout_handler = html.split('getElementById("logoutBtn2")')[1].split("loadAccount")[0]
    check("assertCanSubmit" not in logout_handler, "logout handler free of assertCanSubmit")

    # Fail-closed core not weakened by this remediation
    check("enabled === false" in core and "enabled === true" in core, "strict enabled checks preserved")
    check("FETCH_TIMEOUT_MS = 5000" in core, "timeout preserved")
    check(re.search(r"fallback\s*=\s*\{[^}]*enabled\s*:\s*false", core, re.I | re.S) is None,
          "no fail-open fallback reintroduced")

    # Matrix documentation as static guarantees for pending/blocked/error vs allowed
    # (runtime of disable is covered by bindControls + data-bl-patch-control on avatar only)
    check('data-bl-patch-control", "1"' in html or "data-bl-patch-control=\"1\"" in html,
          "avatar controls marked data-bl-patch-control")
    check("logoutBtn2" in html and "data-bl-patch-control" not in html.split('id="logoutBtn2"')[0][-200:] + html.split('id="logoutBtn2"')[1][:120],
          "logout not marked as patch control")

    print(f"[p5-patch-mode-account-scope-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-patch-mode-account-scope-check] All checks passed")


if __name__ == "__main__":
    main()
