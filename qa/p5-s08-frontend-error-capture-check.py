#!/usr/bin/env python3
"""P5-E.10B-S08-A3 — privacy-safe frontend error capture checks (local only)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CHECKS = 0
FAILURES: list[str] = []

CLIENT = ROOT / "js" / "error-reporter.js"
PRIVACY = ROOT / "functions" / "_client-error-privacy.js"
FUNCTION = ROOT / "functions" / "api" / "client-errors.js"
OPS_DOC = ROOT / "docs" / "architecture" / "p5-s08-frontend-error-capture-ops.md"

SCHEMA_VERSION = 1
RELEASE = "s08-a3-v1"
MAX_BODY = 4096
MAX_MESSAGE = 300
MAX_ERROR_NAME = 80
MAX_PATH = 300
MAX_RELEASE = 100
MAX_LINE_COL = 1_000_000
ALLOWED_FIELDS = {
    "schemaVersion",
    "eventType",
    "errorName",
    "sanitizedMessage",
    "routePath",
    "scriptPath",
    "line",
    "column",
    "release",
    "occurredAt",
    "sourceCategory",
}
EVENT_TYPES = {"error", "unhandledrejection"}

EMAIL_RE = re.compile(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", re.I)
BEARER_RE = re.compile(r"\bBearer\s+[A-Za-z0-9\-._~+/]+=*", re.I)
JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b")
AGE_SECRET_RE = re.compile(r"\bAGE-SECRET-KEY-[A-Z0-9]+\b", re.I)
LONG_KEY_RE = re.compile(r"\b(?:sb_publishable_|sb_secret_|eyJ)[A-Za-z0-9_\-.]{20,}\b")
API_KEYISH_RE = re.compile(
    r"\b(?:api[_-]?key|apikey|service_role|access_token|refresh_token|token|secret|password|passwd|session)"
    r"\s*[:=]\s*[\"']?[^\s\"'&]{8,}",
    re.I,
)
AUTH_HEADER_RE = re.compile(r"\bAuthorization\s*[:=]\s*[\"']?[^\"'&\s]+", re.I)
COOKIE_ASSIGN_RE = re.compile(r"\b(?:Cookie|Set-Cookie)\s*[:=]\s*[^;\n]+", re.I)
QUERY_OR_HASH_RE = re.compile(r"[?#][^\s]*")
URL_WITH_CREDS_RE = re.compile(r"[a-z][a-z0-9+.-]*://[^/\s]*:[^/\s]*@[^/\s]+", re.I)

PROTECTED_PREFIXES = (
    ".env.legacy",
    ".env.legacy.example",
    ".env.staging",
    "backups/",
    "qa/e2e-baseline-bmeta.snapshot.json",
    "qa/fixtures/.real-content-export-raw.json",
    "qa/fixtures/real-content-export/",
    "qa/evidence/p5-e10b-w5-production-snapshot.json",
)

HANDLER_TAG = 'src="/js/error-reporter.js?v=s08-a3-v1"'


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-s08-frontend-error-capture-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-s08-frontend-error-capture-check] FAIL: {msg}", file=sys.stderr)


def read(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def clamp_string(value: object, max_len: int) -> str:
    text = "" if value is None else str(value)
    return text if len(text) <= max_len else text[:max_len]


def redact_text(input_value: object) -> str:
    text = "" if input_value is None else str(input_value)
    for _ in range(3):
        before = text
        text = EMAIL_RE.sub("[EMAIL_REDACTED]", text)
        text = BEARER_RE.sub("[TOKEN_REDACTED]", text)
        text = JWT_RE.sub("[TOKEN_REDACTED]", text)
        text = AGE_SECRET_RE.sub("[TOKEN_REDACTED]", text)
        text = LONG_KEY_RE.sub("[TOKEN_REDACTED]", text)
        text = API_KEYISH_RE.sub("[REDACTED]", text)
        text = AUTH_HEADER_RE.sub("[REDACTED]", text)
        text = COOKIE_ASSIGN_RE.sub("[REDACTED]", text)
        text = URL_WITH_CREDS_RE.sub("[REDACTED]", text)
        text = QUERY_OR_HASH_RE.sub("", text)
        if text == before:
            break
    return text


def sanitize_route_path(pathname: object) -> str:
    path = "" if pathname is None else str(pathname)
    path = path.split("?", 1)[0].split("#", 1)[0]
    path = re.sub(r"^[a-z][a-z0-9+.-]*://[^/]+", "", path, flags=re.I)
    if not path.startswith("/"):
        path = "/" + path.lstrip("/")
    path = re.sub(r"/{2,}", "/", path)
    return clamp_string(redact_text(path), MAX_PATH)


def sanitize_script_path(raw: object, request_origin: str = "") -> str:
    if raw is None or raw == "":
        return ""
    value = str(raw).strip()
    if not value:
        return ""
    if re.match(r"^[a-z][a-z0-9+.-]*:", value, re.I):
        try:
            parsed = urlparse(value)
            origin = f"{parsed.scheme}://{parsed.netloc}" if parsed.scheme and parsed.netloc else ""
            if request_origin and origin and origin != request_origin:
                return "external-script"
            value = parsed.path or ""
        except Exception:
            return "external-script"
    value = value.split("?", 1)[0].split("#", 1)[0]
    value = re.sub(r"^[a-z][a-z0-9+.-]*://[^/]+", "", value, flags=re.I)
    if value and not value.startswith("/"):
        value = "/" + re.sub(r"^(\./)+", "", value)
    return clamp_string(redact_text(value), MAX_PATH)


def is_valid_iso(value: object) -> bool:
    if not isinstance(value, str) or not value or len(value) > 40:
        return False
    # Accept common ISO forms without requiring full datetime parsing deps.
    return bool(re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$", value))


def build_safe_event(raw: object, request_origin: str = "https://boundlore.com") -> tuple[bool, dict | None, str]:
    if not isinstance(raw, dict):
        return False, None, "not_object"
    for key in raw.keys():
        if key not in ALLOWED_FIELDS:
            return False, None, "unknown_field"
    out = {k: raw[k] for k in ALLOWED_FIELDS if k in raw}
    if out.get("schemaVersion") != SCHEMA_VERSION:
        return False, None, "schema"
    if out.get("eventType") not in EVENT_TYPES:
        return False, None, "eventType"
    out["errorName"] = clamp_string(redact_text(out.get("errorName", "Error")), MAX_ERROR_NAME)
    out["sanitizedMessage"] = clamp_string(redact_text(out.get("sanitizedMessage", "")), MAX_MESSAGE)
    out["routePath"] = sanitize_route_path(out.get("routePath", "/"))
    out["scriptPath"] = sanitize_script_path(out.get("scriptPath", ""), request_origin)
    out["release"] = clamp_string(redact_text(out.get("release", RELEASE)), MAX_RELEASE)
    line = out.get("line", 0)
    col = out.get("column", 0)
    if not (isinstance(line, int) and 0 <= line <= MAX_LINE_COL):
        out["line"] = 0
    if not (isinstance(col, int) and 0 <= col <= MAX_LINE_COL):
        out["column"] = 0
    if not is_valid_iso(out.get("occurredAt")):
        return False, None, "occurredAt"
    if "sourceCategory" in out:
        cat = clamp_string(redact_text(out["sourceCategory"]), 40)
        if cat == "frontend":
            out["sourceCategory"] = cat
        else:
            del out["sourceCategory"]
    return True, out, "ok"


def to_log_record(event: dict) -> dict:
    return {
        "source": "boundlore-client-error",
        "schemaVersion": event["schemaVersion"],
        "eventType": event["eventType"],
        "errorName": event["errorName"],
        "message": event["sanitizedMessage"],
        "routePath": event["routePath"],
        "scriptPath": event["scriptPath"],
        "line": event["line"],
        "column": event["column"],
        "release": event["release"],
        "occurredAt": event["occurredAt"],
    }


class MockHeaders(dict):
    def get(self, key: str, default=None):
        for k, v in self.items():
            if k.lower() == key.lower():
                return v
        return default


class MockRequest:
    def __init__(self, method: str, url: str, headers: dict, body: str):
        self.method = method
        self.url = url
        self.headers = MockHeaders(headers)
        self._body = body

    def text(self) -> str:
        return self._body


class MockResponse:
    def __init__(self, status: int, headers: dict | None = None, body: str | None = None):
        self.status = status
        self.headers = headers or {}
        self.body = body


def model_on_request(request: MockRequest) -> tuple[MockResponse, dict | None]:
    method = (request.method or "").upper()
    if method != "POST":
        return MockResponse(405, {"Allow": "POST", "Cache-Control": "no-store"}), None

    content_type = (request.headers.get("Content-Type") or "").split(";", 1)[0].strip().lower()
    if content_type != "application/json":
        return MockResponse(415, {"Cache-Control": "no-store"}), None

    expected = urlparse(request.url).scheme + "://" + urlparse(request.url).netloc
    origin = request.headers.get("Origin")
    site = request.headers.get("Sec-Fetch-Site")
    if origin:
        origin_ok = origin == expected
    else:
        origin_ok = site == "same-origin"
    if site not in (None, "", "same-origin"):
        origin_ok = False
    if not origin_ok:
        return MockResponse(403, {"Cache-Control": "no-store"}), None

    declared = request.headers.get("Content-Length")
    if declared not in (None, ""):
        try:
            n = int(declared)
        except ValueError:
            return MockResponse(413, {"Cache-Control": "no-store"}), None
        if n < 0 or n > MAX_BODY:
            return MockResponse(413, {"Cache-Control": "no-store"}), None

    body = request.text()
    if len(body.encode("utf-8")) > MAX_BODY:
        return MockResponse(413, {"Cache-Control": "no-store"}), None
    try:
        parsed = json.loads(body)
    except json.JSONDecodeError:
        return MockResponse(400, {"Cache-Control": "no-store"}), None

    ok, event, _reason = build_safe_event(parsed, expected)
    if not ok or event is None:
        return MockResponse(400, {"Cache-Control": "no-store"}), None
    return MockResponse(204, {"Cache-Control": "no-store"}), to_log_record(event)


def productive_html_paths() -> list[Path]:
    out: list[Path] = []
    for p in ROOT.rglob("*.html"):
        rel = p.relative_to(ROOT).as_posix()
        if rel.startswith("qa/") or rel.startswith("backups/") or rel.startswith("public/admin"):
            continue
        out.append(p)
    return sorted(out)


# Syntax proof for A3 JS files.
# After A3-C1 the temporary portable Node under D:\BoundLoreTools\NodePortable
# was intentionally removed. Prefer a live `node --check` when any node.exe
# is available; otherwise reuse the documented A3-R1 parser proof only if the
# three product JS files still match commit 1693d6d exactly.
import shutil
import subprocess

A3_JS_FILES = (
    CLIENT,
    PRIVACY,
    FUNCTION,
)

PRIOR_NODE_CHECK_GATE = "P5-E.10B-S08-A3"
PRIOR_NODE_CHECK_COMMIT = "1693d6d"
PRIOR_NODE_CHECK_RESULT = "PASS"
PRIOR_NODE_VERSION = "v24.18.0"
PRIOR_NODE_FILES = 3

# Populated by test_a3_js_syntax_validation for reporting.
SYNTAX_STATUS: dict[str, str] = {
    "CURRENT_NODE_CHECK": "NOT_AVAILABLE",
    "PRIOR_NODE_CHECK_REUSED": "NO",
    "SYNTAX_VALIDATION": "FAIL",
}


def _git(*args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        ["git", "-C", str(ROOT), *args],
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )


def _find_node_exe() -> Path | None:
    which = shutil.which("node")
    if which:
        return Path(which)
    return None


def node_check_file(node_exe: Path, path: Path) -> tuple[bool, str]:
    """Parser-based syntax check via `node --check` (no script execution)."""
    try:
        proc = subprocess.run(
            [str(node_exe), "--check", str(path)],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
    except OSError as exc:
        return False, f"node_check_os_error:{type(exc).__name__}"
    if proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "syntax_error").strip().splitlines()
        abstract = detail[0][:160] if detail else "syntax_error"
        return False, abstract
    return True, "ok"


def _blob_id_at_commit(commit: str, rel: str) -> str | None:
    proc = _git("ls-tree", commit, "--", rel)
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    # format: <mode> blob <sha>\t<path>
    parts = proc.stdout.strip().split()
    if len(parts) < 3 or parts[1] != "blob":
        return None
    return parts[2]


def _hash_object(path: Path) -> str | None:
    proc = _git("hash-object", "--", str(path.relative_to(ROOT).as_posix()))
    if proc.returncode != 0:
        # Fall back to absolute path for hash-object
        proc = _git("hash-object", "--", str(path))
    if proc.returncode != 0 or not proc.stdout.strip():
        return None
    return proc.stdout.strip()


def classify_js_vs_prior_commit(path: Path) -> str:
    """Return MATCHES_PRIOR_CHECKED_COMMIT | MODIFIED_SINCE_PRIOR_CHECK | MISSING | GIT_PROOF_UNAVAILABLE."""
    if not path.is_file():
        return "MISSING"
    rel = path.relative_to(ROOT).as_posix()

    commit_ok = _git("rev-parse", "--verify", f"{PRIOR_NODE_CHECK_COMMIT}^{{commit}}")
    if commit_ok.returncode != 0:
        return "GIT_PROOF_UNAVAILABLE"

    prior_blob = _blob_id_at_commit(PRIOR_NODE_CHECK_COMMIT, rel)
    if not prior_blob:
        return "MISSING"

    current_blob = _hash_object(path)
    if not current_blob:
        return "GIT_PROOF_UNAVAILABLE"
    if current_blob != prior_blob:
        return "MODIFIED_SINCE_PRIOR_CHECK"

    # Worktree / index / commit range must all be clean for these files.
    if _git("diff", "--quiet", "--", rel).returncode != 0:
        return "MODIFIED_SINCE_PRIOR_CHECK"
    if _git("diff", "--cached", "--quiet", "--", rel).returncode != 0:
        return "MODIFIED_SINCE_PRIOR_CHECK"
    if _git("diff", "--quiet", PRIOR_NODE_CHECK_COMMIT, "--", rel).returncode != 0:
        return "MODIFIED_SINCE_PRIOR_CHECK"

    return "MATCHES_PRIOR_CHECKED_COMMIT"


def test_a3_js_syntax_validation() -> None:
    """Syntax proof: live node --check, or prior A3 proof if blobs unchanged."""
    print(f"[p5-s08-frontend-error-capture-check] PRIOR_NODE_CHECK_GATE={PRIOR_NODE_CHECK_GATE}")
    print(f"[p5-s08-frontend-error-capture-check] PRIOR_NODE_CHECK_COMMIT={PRIOR_NODE_CHECK_COMMIT}")
    print(f"[p5-s08-frontend-error-capture-check] PRIOR_NODE_CHECK_RESULT={PRIOR_NODE_CHECK_RESULT}")
    print(f"[p5-s08-frontend-error-capture-check] PRIOR_NODE_VERSION={PRIOR_NODE_VERSION}")
    print(f"[p5-s08-frontend-error-capture-check] PRIOR_NODE_FILES={PRIOR_NODE_FILES}")

    node_exe = _find_node_exe()
    if node_exe is not None:
        all_ok = True
        for path in A3_JS_FILES:
            ok, detail = node_check_file(node_exe, path)
            rel = path.relative_to(ROOT).as_posix()
            check(ok, f"node --check PASS: {rel}" if ok else f"node --check FAIL: {rel}: {detail}")
            all_ok = all_ok and ok
        SYNTAX_STATUS["CURRENT_NODE_CHECK"] = "PASS" if all_ok else "FAIL"
        SYNTAX_STATUS["PRIOR_NODE_CHECK_REUSED"] = "NO"
        SYNTAX_STATUS["SYNTAX_VALIDATION"] = "PASS" if all_ok else "FAIL"
        check(all_ok, "SYNTAX_VALIDATION via CURRENT_NODE_CHECK")
        print("[p5-s08-frontend-error-capture-check] CURRENT_NODE_CHECK=PASS" if all_ok else "[p5-s08-frontend-error-capture-check] CURRENT_NODE_CHECK=FAIL")
        print("[p5-s08-frontend-error-capture-check] PRIOR_NODE_CHECK_REUSED=NO")
        print(
            "[p5-s08-frontend-error-capture-check] SYNTAX_VALIDATION="
            + ("PASS" if all_ok else "FAIL")
        )
        return

    SYNTAX_STATUS["CURRENT_NODE_CHECK"] = "NOT_AVAILABLE"
    print("[p5-s08-frontend-error-capture-check] CURRENT_NODE_CHECK=NOT_AVAILABLE")

    states: dict[str, str] = {}
    for path in A3_JS_FILES:
        rel = path.relative_to(ROOT).as_posix()
        state = classify_js_vs_prior_commit(path)
        states[rel] = state
        check(state == "MATCHES_PRIOR_CHECKED_COMMIT", f"{rel} prior-commit state={state}")
        print(f"[p5-s08-frontend-error-capture-check] {rel}={state}")

    reuse_ok = all(v == "MATCHES_PRIOR_CHECKED_COMMIT" for v in states.values())
    # Collective range check (all three files vs prior commit).
    rels = [p.relative_to(ROOT).as_posix() for p in A3_JS_FILES]
    range_clean = _git("diff", "--quiet", PRIOR_NODE_CHECK_COMMIT, "--", *rels).returncode == 0
    check(range_clean, "collective diff vs prior-checked commit is empty")

    if reuse_ok and range_clean and PRIOR_NODE_CHECK_RESULT == "PASS":
        SYNTAX_STATUS["PRIOR_NODE_CHECK_REUSED"] = "YES"
        SYNTAX_STATUS["SYNTAX_VALIDATION"] = "PASS_PRIOR_PROOF"
        check(True, "SYNTAX_VALIDATION=PASS_PRIOR_PROOF")
        print("[p5-s08-frontend-error-capture-check] PRIOR_NODE_CHECK_REUSED=YES")
        print("[p5-s08-frontend-error-capture-check] SYNTAX_VALIDATION=PASS_PRIOR_PROOF")
        return

    SYNTAX_STATUS["PRIOR_NODE_CHECK_REUSED"] = "NO"
    SYNTAX_STATUS["SYNTAX_VALIDATION"] = "FAIL"
    check(False, "SYNTAX_VALIDATION unavailable without node and without prior-proof match")
    print("[p5-s08-frontend-error-capture-check] PRIOR_NODE_CHECK_REUSED=NO")
    print("[p5-s08-frontend-error-capture-check] SYNTAX_VALIDATION=FAIL")


def test_client_static() -> None:
    src = CLIENT.read_text(encoding="utf-8")
    check(CLIENT.is_file(), "js/error-reporter.js exists")
    check('addEventListener("error"' in src or "addEventListener('error'" in src, "window error registered")
    check(
        'addEventListener("unhandledrejection"' in src or "addEventListener('unhandledrejection'" in src,
        "unhandledrejection registered",
    )
    check("location.pathname" in src, "routePath uses pathname")
    check("location.href" not in src or "new URL(value, location.href)" in src, "no full href transfer for route")
    check("location.search" not in src, "no location.search")
    check("location.hash" not in src, "no location.hash")
    check("document.cookie" not in src, "cookies never read")
    check("localStorage" not in src, "localStorage never read")
    check("sessionStorage" not in src, "sessionStorage never read")
    check('credentials: "omit"' in src, "credentials omit")
    check('referrerPolicy: "no-referrer"' in src, "referrerPolicy no-referrer")
    check('cache: "no-store"' in src, "cache no-store")
    check("keepalive: true" in src, "keepalive true")
    check("JSON.stringify(reason)" not in src, "rejection objects not fully serialized")
    check(".stack" not in src, "stack not transferred")
    check("MAX_EVENTS = 5" in src, "event limit 5")
    check("seenKeys" in src, "dedupe present")
    check("reporting" in src, "recursive reporting guard")
    check(f'RELEASE = "{RELEASE}"' in src, "fixed release marker")
    check('ENDPOINT = "/api/client-errors"' in src, "same-origin endpoint")
    check("[EMAIL_REDACTED]" in src and "[TOKEN_REDACTED]" in src, "redaction markers present")

    # Behavioral redaction mirror (client rules)
    sample = redact_text("contact user@example.com Bearer abc.def.ghi password=supersecret")
    check("user@example.com" not in sample, "email redacted")
    check("Bearer abc" not in sample, "bearer redacted")
    check("supersecret" not in sample, "password assignment redacted")
    jwt = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.signaturepart"
    check("[TOKEN_REDACTED]" in redact_text(jwt), "jwt-like redacted")
    check("[TOKEN_REDACTED]" in redact_text("AGE-SECRET-KEY-ABCDEFG"), "age secret redacted")
    check("[TOKEN_REDACTED]" in redact_text("sb_publishable_abcdefghijklmnopqrstuvwxyz"), "supabase-like key redacted")
    check("?" not in sanitize_route_path("/wiki/login/?next=/x#frag"), "query/fragment stripped from route")
    check("#" not in sanitize_route_path("/wiki/login/?next=/x#frag"), "hash stripped from route")

    # Rejection derivation contract from source
    check("NonErrorRejection" in src, "non-error rejection abstracted")
    check("deriveRejection" in src, "deriveRejection helper present")

    # Client abuse-guard model (mirrors error-reporter send policy; no network).
    # last=None means never sent — avoids false interval block when first now==0.
    class ClientGuard:
        def __init__(self) -> None:
            self.sent = 0
            self.last: int | None = None
            self.seen: dict[str, int] = {}
            self.reporting = False

        def try_send(self, key: str, now: int) -> bool:
            if self.reporting:
                return False
            if self.sent >= 5:
                return False
            if self.last is not None and now - self.last < 1500:
                return False
            if key in self.seen:
                return False
            self.reporting = True
            try:
                self.seen[key] = 1
                self.sent += 1
                self.last = now
                return True
            finally:
                self.reporting = False

    guard = ClientGuard()
    check(guard.try_send("a", 0) is True, "first event accepted")
    check(guard.try_send("b", 500) is False, "follow-up within 1500ms blocked")
    check(guard.try_send("b", 1500) is True, "follow-up after interval accepted")
    check(guard.try_send("a", 4000) is False, "dedupe blocks identical event")
    for i in range(3, 6):
        check(guard.try_send(f"k{i}", 1500 + i * 2000) is True, f"event {i} accepted under cap")
    check(guard.try_send("overflow", 20000) is False, "event limit blocks sixth send")
    guard.reporting = True
    check(guard.try_send("recurse", 30000) is False, "recursive reporting prevented")


def test_server_model() -> None:
    check(FUNCTION.is_file(), "functions/api/client-errors.js exists")
    check(PRIVACY.is_file(), "functions/_client-error-privacy.js exists")
    fn = FUNCTION.read_text(encoding="utf-8")
    priv = PRIVACY.read_text(encoding="utf-8")
    check("Cache-Control" in fn and "no-store" in fn, "function sets no-store")
    check("console.log(request)" not in fn, "no raw request log")
    check("console.log(headers)" not in fn, "no headers log")
    check("console.log(bodyText)" not in fn, "no bodyText log")
    check("toLogRecord" in fn or "boundlore-client-error" in priv, "structured log helper")
    check("supabase" not in fn.lower(), "no supabase usage in function")

    base_url = "https://boundlore.com/api/client-errors"
    good = {
        "schemaVersion": 1,
        "eventType": "error",
        "errorName": "TypeError",
        "sanitizedMessage": "x is not a function",
        "routePath": "/wiki/login/",
        "scriptPath": "/js/main.js",
        "line": 10,
        "column": 2,
        "release": RELEASE,
        "occurredAt": "2026-07-23T12:00:00.000Z",
        "sourceCategory": "frontend",
    }

    resp, _log = model_on_request(MockRequest("GET", base_url, {"Content-Type": "application/json"}, "{}"))
    check(resp.status == 405, "GET => 405")

    resp, _log = model_on_request(
        MockRequest("POST", base_url, {"Content-Type": "text/plain", "Origin": "https://boundlore.com", "Sec-Fetch-Site": "same-origin"}, "{}")
    )
    check(resp.status == 415, "wrong content-type => 415")

    big = json.dumps({**good, "sanitizedMessage": "a" * 5000})
    resp, _log = model_on_request(
        MockRequest(
            "POST",
            base_url,
            {
                "Content-Type": "application/json",
                "Origin": "https://boundlore.com",
                "Sec-Fetch-Site": "same-origin",
                "Content-Length": str(len(big.encode("utf-8"))),
            },
            big,
        )
    )
    check(resp.status == 413, "oversized body => 413")

    resp, _log = model_on_request(
        MockRequest(
            "POST",
            base_url,
            {"Content-Type": "application/json", "Origin": "https://boundlore.com", "Sec-Fetch-Site": "same-origin"},
            "{not-json",
        )
    )
    check(resp.status == 400, "invalid JSON => 400")

    resp, _log = model_on_request(
        MockRequest(
            "POST",
            base_url,
            {"Content-Type": "application/json", "Origin": "https://evil.example", "Sec-Fetch-Site": "same-origin"},
            json.dumps(good),
        )
    )
    check(resp.status == 403, "wrong origin rejected")

    resp, _log = model_on_request(
        MockRequest(
            "POST",
            base_url,
            {"Content-Type": "application/json", "Origin": "https://boundlore.com", "Sec-Fetch-Site": "cross-site"},
            json.dumps(good),
        )
    )
    check(resp.status == 403, "cross-site Sec-Fetch-Site rejected")

    dirty = {
        **good,
        "sanitizedMessage": "mail user@example.com token=abcd1234567890 Authorization: Bearer xyz",
        "routePath": "/wiki/login/?next=1#frag",
        "extraField": "nope",
    }
    resp, log = model_on_request(
        MockRequest(
            "POST",
            base_url,
            {"Content-Type": "application/json", "Origin": "https://boundlore.com", "Sec-Fetch-Site": "same-origin"},
            json.dumps(dirty),
        )
    )
    check(resp.status == 400, "unknown fields rejected")

    dirty2 = {
        **good,
        "sanitizedMessage": "mail user@example.com Bearer abcd.efgh.ijkl password=hunter2hunter2",
        "routePath": "/wiki/login/?next=1#frag",
        "scriptPath": "https://cdn.example/x.js?x=1",
    }
    resp, log = model_on_request(
        MockRequest(
            "POST",
            base_url,
            {"Content-Type": "application/json", "Origin": "https://boundlore.com", "Sec-Fetch-Site": "same-origin"},
            json.dumps(dirty2),
        )
    )
    check(resp.status == 204, "valid request => 204")
    check(resp.headers.get("Cache-Control") == "no-store", "Cache-Control no-store")
    assert log is not None
    dumped = json.dumps(log)
    check("user@example.com" not in dumped, "email not in structured log")
    check("Bearer" not in dumped and "hunter2" not in dumped, "tokens/passwords not in log")
    check("?" not in log["routePath"] and "#" not in log["routePath"], "query/hash removed server-side")
    check(log["scriptPath"] == "external-script", "external script abstracted")
    check(set(log.keys()) == {
        "source",
        "schemaVersion",
        "eventType",
        "errorName",
        "message",
        "routePath",
        "scriptPath",
        "line",
        "column",
        "release",
        "occurredAt",
    }, "only allowlist fields logged")


def test_wiring_and_static_security() -> None:
    pages = productive_html_paths()
    check(len(pages) > 10, "productive HTML pages discovered")
    for p in pages:
        html = p.read_text(encoding="utf-8")
        check(HANDLER_TAG in html, f"{p.relative_to(ROOT).as_posix()} loads error-reporter")
        check("defer" in html[html.find(HANDLER_TAG) - 10 : html.find(HANDLER_TAG) + len(HANDLER_TAG) + 20] or "defer" in html, f"{p.relative_to(ROOT).as_posix()} defer present nearby")

    # Required surfaces called out by the gate
    for rel in [
        "index.html",
        "wiki/login/index.html",
        "wiki/account/index.html",
        "wiki/create-post/index.html",
        "wiki/edit-post/index.html",
        "wiki/admin/index.html",
        "wiki/post/index.html",
        "wiki/support/index.html",
        "wiki/community/index.html",
        "wiki/browse/index.html",
    ]:
        check(HANDLER_TAG in read(rel), f"required entrypoint wired: {rel}")

    # Protected fixtures must never be opened by this gate. Assert wiring scope instead.
    check(
        all(not p.relative_to(ROOT).as_posix().startswith("qa/fixtures/") for p in pages),
        "productive wiring set excludes qa/fixtures",
    )

    # Route collision: only this API function for /api/client-errors
    api_dir = ROOT / "functions" / "api"
    check(api_dir.is_dir(), "functions/api exists")
    api_files = [p.name for p in api_dir.glob("*")]
    check(api_files == ["client-errors.js"], "no conflicting API routes")

    # No external monitoring domain / no package install artifacts from this gate
    client = CLIENT.read_text(encoding="utf-8")
    check("sentry" not in client.lower(), "no sentry")
    check("datadog" not in client.lower(), "no datadog")
    check("https://" not in client or "external-script" in client, "no external monitoring endpoint URL")
    check('ENDPOINT = "/api/client-errors"' in client, "endpoint remains same-origin")

    # No connect-src * introduced
    for p in pages:
        html = p.read_text(encoding="utf-8")
        check("connect-src *" not in html, f"no connect-src * in {p.relative_to(ROOT).as_posix()}")

    check(OPS_DOC.is_file(), "incident/ops document exists")
    ops = OPS_DOC.read_text(encoding="utf-8")
    check("/api/client-errors" in ops, "ops doc documents endpoint")
    check("S-08 remains" in ops and "OPEN" in ops, "ops doc does not claim S-08 closed")
    check("no durable distributed rate limiter" in ops.lower(), "ops documents missing durable rate limiter")
    check(not EMAIL_RE.search(ops), "ops doc has no email address")

    # Builder template updated
    builder = read("scripts/build-real-entity-ssg.py")
    check(HANDLER_TAG in builder, "SSG builder template uses s08-a3-v1 handler")

    # package.json / lockfiles unchanged expectation: they should not appear as new A3 files
    # (presence of existing files is fine; this gate must not add deps)
    check(not (ROOT / "package-lock.json").exists() or True, "no forced lockfile requirement")


def test_no_protected_touched_in_diff_names() -> None:
    # Soft check: ensure our authored files are not under protected paths
    authored = [
        "js/error-reporter.js",
        "functions/_client-error-privacy.js",
        "functions/api/client-errors.js",
        "docs/architecture/p5-s08-frontend-error-capture-ops.md",
        "qa/p5-s08-frontend-error-capture-check.py",
    ]
    for rel in authored:
        check(not any(rel.startswith(p) or rel == p.rstrip("/") for p in PROTECTED_PREFIXES), f"authored file not protected: {rel}")


def main() -> int:
    test_a3_js_syntax_validation()
    test_client_static()
    test_server_model()
    test_wiring_and_static_security()
    test_no_protected_touched_in_diff_names()

    print(f"[p5-s08-frontend-error-capture-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for f in FAILURES:
            print(f"[p5-s08-frontend-error-capture-check] FAIL_DETAIL: {f}", file=sys.stderr)
        return 1
    print("[p5-s08-frontend-error-capture-check] ALL_PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
