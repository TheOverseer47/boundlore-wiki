#!/usr/bin/env python3
"""P5-E.9G.9B — Static wiring and fail-closed assertions for Patch Mode."""
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
        print(f"[p5-patch-mode-static-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-patch-mode-static-check] FAIL: {msg}", file=sys.stderr)


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def script_order_ok(html: str, mutation_script_marker: str) -> bool:
    cfg = html.find('src="/js/supabase-config.js"')
    patch = html.find('src="/js/patch-mode.js')
    mut = html.find(mutation_script_marker)
    if cfg < 0 or patch < 0 or mut < 0:
        return False
    if not (cfg < patch < mut):
        return False
    tag_start = html.rfind("<script", 0, patch)
    tag_end = html.find(">", patch)
    if tag_start < 0 or tag_end < 0:
        return False
    tag = html[tag_start : tag_end + 1]
    if re.search(r"\basync\b", tag):
        return False
    return True


def guard_before(js: str, mutation_snippet: str) -> bool:
    mut = js.find(mutation_snippet)
    if mut < 0:
        return False
    return js.rfind("assertCanSubmit", 0, mut) >= 0 or js.rfind("enforcePatchModeBeforeWrite", 0, mut) >= 0


def main() -> None:
    check((ROOT / "js" / "patch-mode.js").is_file(), "js/patch-mode.js exists")
    patch = read("js/patch-mode.js")
    check("window.WikiPatchMode" in patch, "exports WikiPatchMode")
    check('var STATE_PENDING = "pending"' in patch, "pending state")
    check('var STATE_ALLOWED = "allowed"' in patch, "allowed state")
    check('var STATE_BLOCKED = "blocked"' in patch, "blocked state")
    check('var STATE_ERROR = "error"' in patch, "error state")
    check("initialize:" in patch, "initialize API")
    check("assertCanSubmit:" in patch, "assertCanSubmit API")
    check("bindForm:" in patch, "bindForm API")
    check("FETCH_TIMEOUT_MS = 5000" in patch, "5s timeout")
    check("enabled === false" in patch, "strict enabled===false allow path")
    check("enabled === true" in patch, "strict enabled===true block path")
    check(re.search(r"fallback\s*=\s*\{[^}]*enabled\s*:\s*false", patch, re.I | re.S) is None,
          "no fail-open enabled:false error fallback object")
    check("!!data.enabled" not in patch, "no !!enabled coercion")

    required = [
        ("wiki/create-post/index.html", 'src="/js/create-post.js'),
        ("wiki/edit-post/index.html", 'src="/js/edit-post.js'),
        ("wiki/post/index.html", 'src="/js/post-detail.js'),
        ("wiki/guilds/index.html", 'src="/js/guilds-apply.js'),
        ("wiki/submit-tutorial/index.html", 'src="/js/submit-tutorial.js'),
        ("wiki/account/index.html", 'src="/js/my-posts.js'),
    ]
    for page, marker in required:
        html = read(page)
        check('src="/js/patch-mode.js' in html, f"{page} loads patch-mode.js")
        check(script_order_ok(html, marker), f"{page} script order safe")

    for page in [
        "wiki/support/index.html",
        "wiki/login/index.html",
        "wiki/reset-password/index.html",
        "wiki/admin/index.html",
        "wiki/community/index.html",
    ]:
        html = read(page)
        check("patch-mode.js" not in html, f"{page} remains available (no patch-mode script)")

    create_js = read("js/create-post.js")
    edit_js = read("js/edit-post.js")
    post_js = read("js/post-detail.js")
    guild_js = read("js/guilds-apply.js")
    tutorial_js = read("js/submit-tutorial.js")
    my_posts = read("js/my-posts.js")
    support_js = read("js/support.js")
    account_html = read("wiki/account/index.html")
    cfg = read("js/supabase-config.js")

    check("enforcePatchModeBeforeWriteCP" in create_js, "create-post enforce helper")
    check(guard_before(create_js, '.from("posts").insert'), "create-post guard before posts.insert")
    upload_fn = create_js.split("async function uploadDiscoveryFiles", 1)[1][:1200]
    check("enforcePatchModeBeforeWriteCP" in upload_fn, "create-post guard inside uploadDiscoveryFiles")
    check("createSubmitInFlight" in create_js, "create-post in-flight guard")
    check(guard_before(edit_js, '.from("posts").update'), "edit-post guard before posts.update")
    check(guard_before(post_js, '.from("comments").insert'), "post-detail guard before comments.insert")
    check("enforcePatchModeBeforeWritePD" in post_js, "post-detail enforce helper")
    check(guard_before(guild_js, '.from("posts").insert'), "guilds guard before posts.insert")
    check("assertCanSubmit" in tutorial_js, "tutorial assertCanSubmit")
    check("assertCanSubmit" in my_posts, "my-posts delete assertCanSubmit")
    check("assertCanSubmit" in account_html and "saveAvatarBtn" in account_html, "account avatar guarded")
    reset_chunk = account_html.split("sendResetMailBtn")[1].split("requestDeleteBtn")[0]
    check("assertCanSubmit" not in reset_chunk, "password reset not patch-blocked")
    delete_chunk = account_html.split("requestDeleteBtn")[1].split("renderMyPosts")[0]
    check("assertCanSubmit" not in delete_chunk, "account delete-request recovery not patch-blocked")
    check("assertCanSubmit" not in support_js, "support reports not patch-blocked")
    check("service_role" not in cfg.lower(), "no service_role in supabase-config")
    check("loadWikiPatchModeGuard" not in cfg, "no dynamic optional patch-mode loader")
    check("patch-mode.js" not in cfg, "supabase-config does not inject patch-mode")

    # Optional no-op pattern must not remain on required mutation modules
    optional = re.compile(r"if\s*\(\s*typeof\s+WikiPatchMode\s*!==\s*[\"']undefined[\"']\s*\)\s*\{[^}]*assertCanSubmit", re.S)
    check(optional.search(create_js) is None, "create-post no optional assert no-op")
    check(optional.search(edit_js) is None, "edit-post no optional assert no-op")

    print(f"[p5-patch-mode-static-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-patch-mode-static-check] All checks passed")


if __name__ == "__main__":
    main()
