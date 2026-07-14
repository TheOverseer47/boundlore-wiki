#!/usr/bin/env python3
"""P5-E.9G.3 — Python mock model for functions/wiki/post.js (Node unavailable)."""
from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

ROOT = Path(__file__).resolve().parents[1]
FUNCTION = ROOT / "functions" / "wiki" / "post.js"
POLICY = ROOT / "functions" / "_entity-slug-policy.js"
ENTITY_ROUTES = ROOT / "js" / "entity-routes.js"

ENTITY_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
KNOWN_SLUGS = {
    "ogre-mage",
    "smought",
    "staff-of-fire-2f316b0d",
    "swamplands-94dadc07",
    "swamplands-near-a-campfire-787bbd19",
}


def normalize_entity_slug(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if "/" in trimmed or "\\" in trimmed:
        return None
    if trimmed in (".", ".."):
        return None
    if "?" in trimmed or "#" in trimmed:
        return None
    if re.search(r"[\u0000-\u001f\u007f]", trimmed):
        return None
    if re.match(r"^\s*[a-z][a-z0-9+.-]*:", trimmed, re.I):
        return None
    if trimmed != trimmed.lower():
        return None
    return trimmed


def is_valid_entity_slug(value: object) -> bool:
    norm = normalize_entity_slug(value)
    return norm is not None and bool(ENTITY_SLUG_RE.fullmatch(norm))


def build_canonical_entity_path(slug: object) -> str | None:
    norm = normalize_entity_slug(slug)
    if not norm or not ENTITY_SLUG_RE.fullmatch(norm):
        return None
    from urllib.parse import quote

    return f"/wiki/post/{quote(norm, safe='')}/"


class MockAssets:
    def __init__(self, existing: set[str], fail: bool = False):
        self.existing = existing
        self.fail = fail

    def fetch(self, url: str, method: str = "GET") -> "MockResponse":
        if self.fail:
            raise RuntimeError("asset layer unavailable")
        path = urlparse(url).path
        if path in self.existing:
            return MockResponse(200, "<html>not found</html>" if path.endswith("404.html") else "<html>ok</html>")
        return MockResponse(404, "")


class MockResponse:
    def __init__(self, status: int, body: str):
        self.status = status
        self.ok = 200 <= status < 300
        self._body = body

    async def text(self) -> str:
        return self._body


class MockContext:
    def __init__(self, url: str, method: str = "GET", assets: MockAssets | None = None):
        self.request = type("Req", (), {"url": url, "method": method})()
        self.env = type("Env", (), {"ASSETS": assets})()
        self.next_called = False

    def next(self):
        self.next_called = True
        return MockResponse(200, "csr-shell")


def is_legacy_post_base_path(pathname: str) -> bool:
    path_norm = re.sub(r"/index\.html$", "", pathname, flags=re.I).rstrip("/") or "/"
    return path_norm == "/wiki/post"


async def model_on_request(context: MockContext) -> MockResponse:
    method = context.request.method
    if method not in {"GET", "HEAD"}:
        return MockResponse(405, "")

    url = urlparse(context.request.url)
    if not is_legacy_post_base_path(url.path):
        return context.next()

    params = parse_qs(url.query, keep_blank_values=True)
    keys = list(params.keys())
    slug_values = params.get("slug", [])

    if not keys:
        return context.next()

    if len(keys) != 1 or keys[0] != "slug" or len(slug_values) != 1:
        return await not_found(context, method, 404)

    raw_slug = slug_values[0]
    if not is_valid_entity_slug(raw_slug):
        return await not_found(context, method, 400)

    canonical = build_canonical_entity_path(raw_slug)
    if not canonical:
        return await not_found(context, method, 400)

    assets = context.env.ASSETS
    if not assets:
        return MockResponse(503, "")

    try:
        asset_path = canonical.rstrip("/") + "/index.html"
        probe = assets.fetch(f"https://boundlore.invalid{asset_path}", method="HEAD")
        if not probe.ok:
            return await not_found(context, method, 404)
    except RuntimeError:
        return MockResponse(503, "")

    resp = MockResponse(307, "")
    resp.headers = {
        "Location": canonical,
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
    }
    return resp


async def not_found(context: MockContext, method: str, code: int) -> MockResponse:
    assets = context.env.ASSETS
    if not assets:
        return MockResponse(503, "")
    try:
        loaded = assets.fetch("https://boundlore.invalid/wiki/post/404.html")
        if not loaded.ok:
            return MockResponse(503, "")
        body = None if method == "HEAD" else await loaded.text()
        resp = MockResponse(code, body or "")
        resp.headers = {
            "Cache-Control": "no-store",
            "X-Robots-Tag": "noindex, nofollow",
        }
        return resp
    except RuntimeError:
        return MockResponse(503, "")


async def run_matrix() -> int:
    failures = 0
    assets = MockAssets(
        existing={
            "/wiki/post/ogre-mage/index.html",
            "/wiki/post/404.html",
        }
    )

    async def check(label: str, url: str, method: str, expect: int, predicate=None, assets_override=None):
        nonlocal failures
        ctx = MockContext(url, method, assets_override or assets)
        resp = await model_on_request(ctx)
        status = resp.status
        ok = status == expect and (predicate(resp, ctx) if predicate else True)
        if ok:
            print(f"[p5-cloudflare-pages-function-check] PASS: {label} ({status})")
        else:
            failures += 1
            print(f"[p5-cloudflare-pages-function-check] FAIL: {label} expected {expect} got {status}", file=sys.stderr)

    await check("no query pass-through", "https://x/wiki/post/", "GET", 200, lambda _r, c: c.next_called)
    await check("known slug redirect", "https://x/wiki/post/?slug=ogre-mage", "GET", 307, lambda r, _c: r.headers.get("Location") == "/wiki/post/ogre-mage/")
    await check("redirect path-only", "https://x/wiki/post/?slug=ogre-mage", "GET", 307, lambda r, _c: not str(r.headers.get("Location", "")).startswith("http"))
    await check("unknown slug", "https://x/wiki/post/?slug=does-not-exist-99999", "GET", 404)
    await check("invalid uppercase", "https://x/wiki/post/?slug=OGRE-MAGE", "GET", 400)
    await check("extra param", "https://x/wiki/post/?slug=ogre-mage&utm=1", "GET", 404)
    await check("double slug", "https://x/wiki/post/?slug=a&slug=b", "GET", 404)
    await check("open redirect attempt", "https://x/wiki/post/?slug=javascript:alert(1)", "GET", 400)
    await check("POST blocked", "https://x/wiki/post/?slug=ogre-mage", "POST", 405)
    await check("HEAD redirect", "https://x/wiki/post/?slug=ogre-mage", "HEAD", 307)
    await check("HEAD no body on 404", "https://x/wiki/post/?slug=nope-999", "HEAD", 404, lambda r, _c: r._body in ("", None))
    await check(
        "asset probe failure",
        "https://x/wiki/post/?slug=ogre-mage",
        "GET",
        503,
        assets_override=MockAssets(set(), fail=True),
    )

    loc = (await model_on_request(MockContext("https://x/wiki/post/?slug=ogre-mage", assets=assets))).headers.get("Location", "")
    if "?" in loc or "#" in loc or loc.startswith("//"):
        failures += 1
        print("[p5-cloudflare-pages-function-check] FAIL: Location contains query/fragment", file=sys.stderr)
    else:
        print("[p5-cloudflare-pages-function-check] PASS: Location is safe path-only")

    return failures


def static_checks() -> int:
    failures = 0
    for path in (FUNCTION, POLICY, ROOT / "functions" / "wiki" / "post" / "index.js"):
        if not path.is_file():
            failures += 1
            print(f"[p5-cloudflare-pages-function-check] FAIL: missing {path}", file=sys.stderr)
    text = FUNCTION.read_text(encoding="utf-8")
    for needle in (
        "context.next()",
        "context.env.ASSETS",
        "307",
        "no-store",
        "noindex",
        "405",
        "503",
    ):
        if needle not in text:
            failures += 1
            print(f"[p5-cloudflare-pages-function-check] FAIL: function missing {needle}", file=sys.stderr)
    if "supabase" in text.lower() or "fetch(" in text.replace("assets.fetch", ""):
        if re.search(r"\bfetch\s*\(", text) and "assets.fetch" not in text:
            failures += 1
            print("[p5-cloudflare-pages-function-check] FAIL: external fetch detected", file=sys.stderr)
    policy_re = re.search(r"ENTITY_SLUG_RE = /(\^.*?)\$/", POLICY.read_text(encoding="utf-8"))
    routes_re = re.search(r"ENTITY_SLUG_RE = /(\^.*?)\$/", ENTITY_ROUTES.read_text(encoding="utf-8"))
    if not policy_re or not routes_re or policy_re.group(1) != routes_re.group(1):
        failures += 1
        print("[p5-cloudflare-pages-function-check] FAIL: slug regex parity", file=sys.stderr)
    else:
        print("[p5-cloudflare-pages-function-check] PASS: slug regex parity with js/entity-routes.js")
    if failures == 0:
        print("[p5-cloudflare-pages-function-check] PASS: static function structure")
    return failures


async def main_async() -> int:
    failures = static_checks()
    failures += await run_matrix()
    return failures


def main() -> None:
    import asyncio

    failures = asyncio.run(main_async())
    if failures:
        raise SystemExit(1)
    print("[p5-cloudflare-pages-function-check] All mock tests passed (Python model; Node unavailable)")


if __name__ == "__main__":
    main()
