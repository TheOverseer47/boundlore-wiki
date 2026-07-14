#!/usr/bin/env python3
"""P5-E.9G.2 — Local SSG route preview harness (localhost only, no external I/O)."""
from __future__ import annotations

import argparse
import json
import re
import sys
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
POST_ROOT = ROOT / "wiki" / "post"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
RESERVED = {"index.html", "_ssg-not-found"}


def discover_known_slugs() -> set[str]:
    slugs: set[str] = set()
    if not POST_ROOT.is_dir():
        return slugs
    for child in POST_ROOT.iterdir():
        if not child.is_dir():
            continue
        name = child.name
        if name.startswith("_") or name in RESERVED:
            continue
        if (child / "index.html").is_file() and SLUG_RE.match(name):
            slugs.add(name)
    return slugs


def load_not_found_body() -> bytes:
    path = POST_ROOT / "_ssg-not-found" / "index.html"
    if path.is_file():
        return path.read_bytes()
    return b"<html><body><h1>Entry Not Found</h1></body></html>"


class SSGRoutePreviewHandler(SimpleHTTPRequestHandler):
    known_slugs: set[str] = set()
    not_found_body: bytes = b""

    def log_message(self, fmt: str, *args) -> None:
        return

    def _send(self, code: int, body: bytes, headers: dict[str, str] | None = None) -> None:
        self.send_response(code)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        for key, value in (headers or {}).items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _redirect(self, location: str) -> None:
        self.send_response(307)
        self.send_header("Location", location)
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _fail_not_found(self) -> None:
        self._send(404, self.not_found_body, {"Cache-Control": "no-store"})

    def _is_traversal(self, path: str) -> bool:
        decoded = urllib.parse.unquote(path)
        if ".." in decoded or "\\" in decoded:
            return True
        if "\x00" in decoded:
            return True
        if re.search(r"%2e|%2f|%5c", path, re.I) and (".." in decoded or "/" in decoded.strip("/wiki/post")):
            return True
        return False

    def _handle_legacy_query(self, parsed) -> bool:
        path = parsed.path.rstrip("/") or "/"
        if path not in ("/wiki/post", "/wiki/post/index.html"):
            return False
        values = parsed.query and urllib.parse.parse_qs(parsed.query, keep_blank_values=True).get("slug") or []
        if len(values) != 1:
            self._fail_not_found()
            return True
        raw = values[0]
        if not raw or not SLUG_RE.match(raw):
            self._fail_not_found()
            return True
        if raw in self.known_slugs:
            self._redirect(f"/wiki/post/{raw}/")
            return True
        self._fail_not_found()
        return True

    def _handle_canonical(self, parsed) -> bool:
        match = re.fullmatch(
            r"/wiki/post/((?:_ssg-not-found|[a-z0-9]+(?:-[a-z0-9]+)*))/?",
            parsed.path,
        )
        if not match:
            return False
        slug = match.group(1)
        if parsed.path.endswith("/"):
            if slug == "_ssg-not-found":
                file_path = POST_ROOT / "_ssg-not-found" / "index.html"
                if file_path.is_file():
                    self._send(200, file_path.read_bytes(), {"Cache-Control": "no-store"})
                    return True
            if slug in self.known_slugs:
                file_path = POST_ROOT / slug / "index.html"
                if file_path.is_file():
                    self._send(200, file_path.read_bytes(), {"Cache-Control": "no-store"})
                    return True
            self._fail_not_found()
            return True
        if slug in self.known_slugs or slug == "_ssg-not-found":
            self._redirect(f"/wiki/post/{slug}/")
            return True
        self._fail_not_found()
        return True

    def do_GET(self) -> None:
        try:
            parsed = urllib.parse.urlparse(self.path)
            if self._is_traversal(parsed.path):
                self._fail_not_found()
                return
            if self._handle_legacy_query(parsed):
                return
            if self._handle_canonical(parsed):
                return
            super().do_GET()
        except Exception:
            self._fail_not_found()


def run_server(host: str, port: int) -> ThreadingHTTPServer:
    SSGRoutePreviewHandler.known_slugs = discover_known_slugs()
    SSGRoutePreviewHandler.not_found_body = load_not_found_body()
    SSGRoutePreviewHandler.directory = str(ROOT)
    httpd = ThreadingHTTPServer((host, port), SSGRoutePreviewHandler)
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    return httpd


def fetch(base: str, route: str) -> tuple[int, str, dict[str, str]]:
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            raise urllib.error.HTTPError(req.full_url, code, msg, headers, fp)

    opener = urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(base + route, method="GET")
    try:
        with opener.open(req, timeout=5) as resp:
            headers = {k.lower(): v for k, v in resp.headers.items()}
            return resp.status, resp.read(4096).decode("utf-8", "replace"), headers
    except urllib.error.HTTPError as err:
        headers = {k.lower(): v for k, v in err.headers.items()}
        body = err.read(4096).decode("utf-8", "replace") if err.fp else ""
        return err.code, body, headers


def run_matrix(host: str, port: int) -> int:
    base = f"http://{host}:{port}"
    known = sorted(discover_known_slugs())
    failures = 0

    def check(label: str, route: str, expect_status: int, predicate=None) -> None:
        nonlocal failures
        status, body, headers = fetch(base, route)
        ok = status == expect_status and (predicate(body, headers) if predicate else True)
        if ok:
            print(f"[local-ssg-route-preview] PASS: {label} ({status})")
        else:
            failures += 1
            print(
                f"[local-ssg-route-preview] FAIL: {label} expected {expect_status} got {status}",
                file=sys.stderr,
            )

    for slug in known:
        check(
            f"canonical {slug}",
            f"/wiki/post/{slug}/",
            200,
            lambda b, _h, s=slug: "bl-ssg-body" in b or s in b,
        )

    if known:
        slug = known[0]
        check(
            f"canonical no slash {slug}",
            f"/wiki/post/{slug}",
            307,
            lambda _b, h: h.get("location", "").endswith(f"/wiki/post/{slug}/"),
        )
        check(
            f"legacy known {slug}",
            f"/wiki/post/?slug={slug}",
            307,
            lambda _b, h: h.get("location", "").endswith(f"/wiki/post/{slug}/"),
        )

    check("legacy unknown", "/wiki/post/?slug=does-not-exist-99999", 404, lambda b, _h: "Entry Not Found" in b)
    check("legacy invalid slug", "/wiki/post/?slug=OGRE-MAGE", 404)
    check("legacy traversal", "/wiki/post/?slug=..%2F..%2Fcss", 404)
    check("legacy empty slug", "/wiki/post/?slug=", 404)
    check("legacy multi slug", "/wiki/post/?slug=a&slug=b", 404)
    check("legacy js scheme", "/wiki/post/?slug=javascript:alert(1)", 404)
    check("unknown canonical", "/wiki/post/does-not-exist-99999/", 404, lambda b, _h: "Entry Not Found" in b)
    check("_ssg-not-found direct", "/wiki/post/_ssg-not-found/", 200, lambda b, _h: "noindex, nofollow" in b)
    check("traversal path", "/wiki/post/..%2F..%2Fcss%2Fstyle.css/", 404)
    check("asset css", "/css/style.css", 200)
    check("asset icon", "/public/images/icon.jpg", 200)

    return failures


def main() -> int:
    parser = argparse.ArgumentParser(description="Local SSG route preview harness")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8099)
    parser.add_argument("--test", action="store_true", help="Run routing matrix and exit")
    args = parser.parse_args()

    port = 0 if args.test else args.port
    httpd = run_server(args.host, port)
    actual_port = httpd.server_address[1]
    time.sleep(0.3)
    try:
        if args.test:
            code = run_matrix(args.host, actual_port)
            return 1 if code else 0
        print(f"[local-ssg-route-preview] serving {args.host}:{actual_port} (Ctrl+C to stop)")
        httpd.serve_forever()
    except KeyboardInterrupt:
        return 0
    finally:
        httpd.shutdown()
        httpd.server_close()


if __name__ == "__main__":
    sys.exit(main())
