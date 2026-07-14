#!/usr/bin/env python3
"""P5-E.9G.3 — Static Cloudflare Pages routing preparation checks."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

FORBIDDEN_PATTERNS = [
    (r"git push origin main", "dangerous push example"),
    (r"wrangler pages deploy", "deploy command"),
    (r"CLOUDFLARE_API_TOKEN", "api token"),
    (r"SUPABASE_SERVICE_ROLE", "service role"),
]

RISKY_REDIRECT = re.compile(r"/wiki/post/\?slug=", re.I)


def fail(msg: str) -> None:
    print(f"[p5-cloudflare-pages-routing-static-check] FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def ok(msg: str) -> None:
    print(f"[p5-cloudflare-pages-routing-static-check] PASS: {msg}")


def main() -> None:
    fn = ROOT / "functions" / "wiki" / "post.js"
    policy = ROOT / "functions" / "_entity-slug-policy.js"
    fn_index = ROOT / "functions" / "wiki" / "post" / "index.js"
    root_404 = ROOT / "404.html"
    post_404 = ROOT / "wiki" / "post" / "404.html"
    ssg_nf = ROOT / "wiki" / "post" / "_ssg-not-found" / "index.html"

    for path in (fn, policy, fn_index, root_404, post_404, ssg_nf):
        if not path.is_file():
            fail(f"missing required file: {path.relative_to(ROOT)}")

    ok("Pages Function files present")

    fn_text = fn.read_text(encoding="utf-8")
    if "[[path]]" in fn_text or "onRequestPost" in fn_text:
        fail("function appears too broad or handles writes")
    if re.search(r"context\.env\.(DB|KV|R2|D1|SUPABASE)", fn_text):
        fail("forbidden binding in function")
    if "password" in fn_text.lower() or "secret" in fn_text.lower():
        fail("possible secret in function")
    ok("Function scope limited to legacy /wiki/post")

    redirects = ROOT / "_redirects"
    if redirects.is_file() and RISKY_REDIRECT.search(redirects.read_text(encoding="utf-8")):
        fail("_redirects contains invalid query slug rule")
    ok("No invalid _redirects query slug rule")

    for name in ("wrangler.toml", "wrangler.json", "wrangler.jsonc", "_worker.js", "_routes.json"):
        if (ROOT / name).exists():
            fail(f"unexpected Cloudflare config file: {name}")
    ok("No wrangler/_worker/_routes.json introduced")

    headers = ROOT / "_headers"
    if headers.is_file():
        ht = headers.read_text(encoding="utf-8")
        if re.search(r"index\s*,\s*follow", ht, re.I):
            fail("_headers enables indexing")
    ok("No global index,follow headers file")

    for label, path in (("root 404", root_404), ("post 404", post_404), ("ssg not-found", ssg_nf)):
        html = path.read_text(encoding="utf-8")
        if "noindex, nofollow" not in html:
            fail(f"{label} missing noindex,nofollow")
        if "Loading post" in html:
            fail(f"{label} contains CSR loading shell")
        if re.search(r"BLMETA|[0-9a-f]{8}-[0-9a-f]{4}-", html, re.I):
            fail(f"{label} possible leak marker")
        if 'href="/"' not in html and "Return to Home" not in html:
            fail(f"{label} missing safe home link")
    ok("404 artifacts are static, noindex, no-leak")

    scan_files = [
        ROOT / "functions" / "wiki" / "post.js",
        ROOT / "functions" / "_entity-slug-policy.js",
        ROOT / "functions" / "wiki" / "post" / "index.js",
        ROOT / "qa" / "p5-cloudflare-pages-function-check.py",
        ROOT / "qa" / "p5-cloudflare-pages-routing-static-check.py",
    ]
    report = ROOT / "docs" / "architecture" / "p5-cloudflare-pages-routing-preparation-report.md"
    if report.exists():
        scan_files.append(report)

    for path in scan_files:
        if not path.is_file():
            continue
        text = path.read_text(encoding="utf-8", errors="ignore")
        for pattern, label in FORBIDDEN_PATTERNS:
            if re.search(pattern, text, re.I):
                if "DO NOT EXECUTE" in text or "DO NOT APPLY" in text:
                    continue
                fail(f"{path.relative_to(ROOT)} contains risky pattern: {label}")

    ok("No undeclared deploy/push/token patterns in new gate files")

    print("[p5-cloudflare-pages-routing-static-check] All checks passed")


if __name__ == "__main__":
    main()
