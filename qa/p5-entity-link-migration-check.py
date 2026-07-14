#!/usr/bin/env python3
"""P5-E.9G.2 — Ensure public entity link generators use canonical paths."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
JS_DIR = ROOT / "js"

ALLOWLIST_FILES = {
    "entity-routes.js": "central legacy builder",
    "search-recall-utils.js": "CSR fallback compatibility API",
    "support.js": "support form placeholder example",
}

ALLOWLIST_LINE_PATTERNS = [
    re.compile(r"buildLegacyEntityPath"),
    re.compile(r"LEGACY_QUERY_PREFIX"),
    re.compile(r"CSR_FALLBACK_PREFIX"),
    re.compile(r"getCsrFallbackUrl"),
    re.compile(r"csr_fallback_note"),
    re.compile(r"/wiki/edit-post/\?slug="),
]

PUBLIC_PATTERNS = [
    re.compile(r'href\s*=\s*["\']/wiki/post/\?slug='),
    re.compile(r'["\']/wiki/post/\?slug=\s*\+\s*encodeURIComponent'),
    re.compile(r'["\']/wiki/post/\?slug=\s*\+\s*encodeURI'),
    re.compile(r'location\.href\s*=\s*["\']/wiki/post/\?slug='),
    re.compile(r"return\s+['\"]/wiki/post/\?slug="),
    re.compile(r'\?\s*\(["\']/wiki/post/\?slug='),
    re.compile(r'target_url:\s*["\']/wiki/post/\?slug='),
]


def scan_js_file(path: Path) -> list[str]:
    rel = f"js/{path.name}"
    if path.name in ALLOWLIST_FILES:
        return []
    errors: list[str] = []
    for idx, line in enumerate(path.read_text(encoding="utf-8").splitlines(), start=1):
        if "/wiki/post/?slug=" not in line:
            continue
        if any(pat.search(line) for pat in ALLOWLIST_LINE_PATTERNS):
            continue
        if any(pat.search(line) for pat in PUBLIC_PATTERNS):
            errors.append(f"{rel}:{idx}: {line.strip()}")
    return errors


def scan_admin_html() -> list[str]:
    admin = ROOT / "wiki" / "admin" / "index.html"
    if not admin.is_file():
        return []
    errors: list[str] = []
    for idx, line in enumerate(admin.read_text(encoding="utf-8").splitlines(), start=1):
        if "/wiki/post/?slug=" not in line:
            continue
        if "buildPostUrl" in line or "BoundLoreEntityRoutes" in line:
            continue
        if "placeholder" in line.lower():
            continue
        if "encodeURIComponent(post.slug)" in line:
            errors.append(f"wiki/admin/index.html:{idx}: {line.strip()}")
    return errors


def main() -> None:
    errors: list[str] = []
    for js in sorted(JS_DIR.glob("*.js")):
        errors.extend(scan_js_file(js))
    errors.extend(scan_admin_html())

    if errors:
        for err in errors:
            print(f"[p5-entity-link-migration-check] FAIL: {err}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-entity-link-migration-check] PASS: no unclassified public ?slug= entity links in js/")


if __name__ == "__main__":
    main()
