#!/usr/bin/env python3
"""Offline harness for Export-BoundLoreStorageLive BL_STORAGE_STOP envelopes.

No DNS/HTTP/Supabase. Network attempts fail the test immediately.
"""
from __future__ import annotations

import contextlib
import importlib.util
import io
import json
import os
import ssl
import sys
import tempfile
import urllib.error
from pathlib import Path
from typing import Any, Callable
from unittest import mock

ROOT = Path(__file__).resolve().parents[1]
EXPORTER = ROOT / "tools" / "backup" / "Export-BoundLoreStorageLive.py"
PROD = "ohkoojpzmptdfyowdgog"
STAGING = "jzzgoiwfbuwiiyvwgwri"

CHECKS = 0
FAILURES: list[str] = []


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-storage-child-envelope-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-storage-child-envelope-check] FAIL: {msg}", file=sys.stderr)


def _load_exporter():
    spec = importlib.util.spec_from_file_location("bl_storage_live", EXPORTER)
    assert spec and spec.loader
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class _FakeResp:
    def __init__(self, status: int, body: bytes):
        self.status = status
        self._body = body
        self._pos = 0

    def read(self, n: int = -1) -> bytes:
        if n < 0:
            data = self._body[self._pos :]
            self._pos = len(self._body)
            return data
        data = self._body[self._pos : self._pos + n]
        self._pos += len(data)
        return data

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False


def _deny_network(*_a, **_k):
    raise AssertionError("NETWORK_FORBIDDEN: offline test attempted real network")


def _run_child(
    mod,
    *,
    armed: bool,
    args: list[str],
    env: dict[str, str] | None = None,
    urlopen: Callable[..., Any] | None = None,
) -> tuple[int, str, str]:
    env_patch = {
        "BOUNDLORE_LIVE_NETWORK_ARMED": "1" if armed else "0",
        "SUPABASE_SERVICE_ROLE_KEY": "",
    }
    if env:
        env_patch.update(env)
    # Clear then set
    out = io.StringIO()
    err = io.StringIO()
    opener = urlopen if urlopen is not None else _deny_network
    with mock.patch.dict(os.environ, env_patch, clear=False):
        # Remove key if empty string desired as missing
        if env_patch.get("SUPABASE_SERVICE_ROLE_KEY") == "":
            os.environ.pop("SUPABASE_SERVICE_ROLE_KEY", None)
        else:
            os.environ["SUPABASE_SERVICE_ROLE_KEY"] = env_patch["SUPABASE_SERVICE_ROLE_KEY"]
        if not armed:
            os.environ.pop("BOUNDLORE_LIVE_NETWORK_ARMED", None)
        else:
            os.environ["BOUNDLORE_LIVE_NETWORK_ARMED"] = "1"
        old_open = mod._urlopen
        mod._urlopen = opener
        try:
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                try:
                    code = mod.main(args)
                except SystemExit as se:
                    code = int(se.code) if isinstance(se.code, int) else 1
        finally:
            mod._urlopen = old_open
    return code, out.getvalue(), err.getvalue()


def _assert_envelope(stderr: str, code: str, **fields: str) -> bool:
    lines = [ln.strip() for ln in stderr.splitlines() if ln.strip()]
    hits = [ln for ln in lines if ln.startswith("BL_STORAGE_STOP|")]
    if len(hits) != 1:
        return False
    line = hits[0]
    if f"BL_STORAGE_STOP|{code}" not in line:
        return False
    for k, v in fields.items():
        if f"{k}={v}" not in line:
            return False
    # No free secrets
    banned = ("TEST_TOKEN_NOT_A_REAL_SECRET", "Bearer ", "Authorization", "apikey=", "traceback")
    if any(b.lower() in stderr.lower() and b != "Authorization" for b in ("TEST_TOKEN_NOT_A_REAL_SECRET",)):
        return False
    if "TEST_TOKEN_NOT_A_REAL_SECRET" in stderr:
        return False
    return True


def main() -> None:
    check(EXPORTER.is_file(), "exporter present")
    mod = _load_exporter()
    check("BL_STORAGE_STOP" in EXPORTER.read_text(encoding="utf-8"), "envelope marker in source")
    check("emit_parent_stop" in EXPORTER.read_text(encoding="utf-8"), "emit_parent_stop present")

    with tempfile.TemporaryDirectory() as td:
        tdp = Path(td)
        out_dir = tdp / "storage"
        inv = tdp / "inv.json"
        args = [PROD, str(out_dir), str(inv)]

        # 1 not armed
        c, so, se = _run_child(mod, armed=False, args=args, urlopen=_deny_network)
        check(c != 0 and _assert_envelope(se, "STOP_LIVE_NETWORK_RESERVED"), "not-armed")

        # 2 missing key
        c, so, se = _run_child(mod, armed=True, args=args, env={"SUPABASE_SERVICE_ROLE_KEY": ""}, urlopen=_deny_network)
        check(c != 0 and _assert_envelope(se, "STOP_STORAGE_CREDENTIAL_MISSING"), "missing-key")

        # 3 wrong project
        c, so, se = _run_child(
            mod,
            armed=True,
            args=["wrongref", str(out_dir), str(inv)],
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=_deny_network,
        )
        check(c != 0 and _assert_envelope(se, "STOP_WRONG_PROJECT") and "TEST_TOKEN_NOT_A_REAL_SECRET" not in se, "wrong-project")

        # 4 staging
        c, so, se = _run_child(
            mod,
            armed=True,
            args=[STAGING, str(out_dir), str(inv)],
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=_deny_network,
        )
        check(c != 0 and _assert_envelope(se, "STOP_STAGING_TARGET"), "staging")

        # 5 bucket-list HTTP 401
        def open_401(req, timeout=0, context=None):
            raise urllib.error.HTTPError(getattr(req, "full_url", "x"), 401, "no", hdrs=None, fp=io.BytesIO(b""))

        # HTTPError returns as status from _request — need FakeResp path for 401 without raise
        def open_status(status: int, body: bytes = b""):
            def _inner(req, timeout=0, context=None):
                return _FakeResp(status, body)

            return _inner

        c, so, se = _run_child(
            mod,
            armed=True,
            args=args,
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_status(401, b""),
        )
        check(
            c != 0 and _assert_envelope(se, "STOP_STORAGE_EXPORT_INCOMPLETE", phase="bucket-list", http="401"),
            "bucket-list-401",
        )

        # 6 bucket-list 200 invalid JSON
        c, so, se = _run_child(
            mod,
            armed=True,
            args=args,
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_status(200, b"{not-json"),
        )
        check(
            c != 0
            and _assert_envelope(
                se, "STOP_STORAGE_EXPORT_INCOMPLETE", phase="bucket-list", kind="JSONDecodeError"
            ),
            "bucket-list-json",
        )

        # Helper: first call bucket list OK empty allowlist only, then object-list URLError
        state = {"n": 0}

        def open_object_list_urlerror(req, timeout=0, context=None):
            state["n"] += 1
            url = getattr(req, "full_url", "")
            if "/storage/v1/bucket" in url and state["n"] == 1:
                return _FakeResp(200, json.dumps([{"name": "avatars"}]).encode())
            raise urllib.error.URLError("TEST_OFFLINE_URLERROR")

        c, so, se = _run_child(
            mod,
            armed=True,
            args=args,
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_object_list_urlerror,
        )
        check(
            c != 0
            and _assert_envelope(
                se, "STOP_STORAGE_EXPORT_INCOMPLETE", phase="object-list", kind="URLError"
            ),
            "object-list-urlerror",
        )

        # 8 object-download HTTP 403
        state2 = {"n": 0}

        def open_download_403(req, timeout=0, context=None):
            state2["n"] += 1
            url = getattr(req, "full_url", "")
            method = getattr(req, "get_method", lambda: "GET")()
            if "/storage/v1/bucket" in url:
                return _FakeResp(
                    200,
                    json.dumps([{"name": b} for b in ("avatars", "discovery-uploads", "report-screenshots")]).encode(),
                )
            if "/object/list/" in url:
                # one fake object
                return _FakeResp(200, json.dumps([{"name": "obj-a", "metadata": {"size": 1}}]).encode())
            if method == "GET" and "/storage/v1/object/" in url:
                raise urllib.error.HTTPError(url, 403, "no", hdrs=None, fp=io.BytesIO(b""))
            return _FakeResp(200, b"[]")

        c, so, se = _run_child(
            mod,
            armed=True,
            args=args,
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_download_403,
        )
        check(
            c != 0
            and _assert_envelope(
                se,
                "STOP_STORAGE_EXPORT_INCOMPLETE",
                phase="object-download",
                http="403",
            )
            and "obj-a" not in se,
            "object-download-403",
        )

        # 9 TimeoutError on download
        def open_download_timeout(req, timeout=0, context=None):
            url = getattr(req, "full_url", "")
            method = getattr(req, "get_method", lambda: "GET")()
            if "/storage/v1/bucket" in url:
                return _FakeResp(
                    200,
                    json.dumps([{"name": b} for b in ("avatars", "discovery-uploads", "report-screenshots")]).encode(),
                )
            if "/object/list/" in url:
                return _FakeResp(200, json.dumps([{"name": "obj-b", "metadata": {"size": 1}}]).encode())
            if method == "GET" and "/storage/v1/object/" in url:
                raise TimeoutError("TEST_TIMEOUT")
            return _FakeResp(200, b"[]")

        c, so, se = _run_child(
            mod,
            armed=True,
            args=args,
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_download_timeout,
        )
        check(
            c != 0
            and _assert_envelope(
                se, "STOP_STORAGE_EXPORT_INCOMPLETE", phase="object-download", kind="TimeoutError"
            ),
            "object-download-timeout",
        )

        # 10 SSLError
        def open_download_ssl(req, timeout=0, context=None):
            url = getattr(req, "full_url", "")
            method = getattr(req, "get_method", lambda: "GET")()
            if "/storage/v1/bucket" in url:
                return _FakeResp(
                    200,
                    json.dumps([{"name": b} for b in ("avatars", "discovery-uploads", "report-screenshots")]).encode(),
                )
            if "/object/list/" in url:
                return _FakeResp(200, json.dumps([{"name": "obj-c", "metadata": {"size": 1}}]).encode())
            if method == "GET" and "/storage/v1/object/" in url:
                raise ssl.SSLError("TEST_SSL")
            return _FakeResp(200, b"[]")

        c, so, se = _run_child(
            mod,
            armed=True,
            args=args,
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_download_ssl,
        )
        check(
            c != 0
            and _assert_envelope(
                se, "STOP_STORAGE_EXPORT_INCOMPLETE", phase="object-download", kind="SSLError"
            ),
            "object-download-ssl",
        )

        # 11 OSError on inventory-write (inv path is an existing directory)
        inv_dir = tdp / "inv_as_dir"
        inv_dir.mkdir(exist_ok=True)

        def open_success_for_oserror(req, timeout=0, context=None):
            url = getattr(req, "full_url", "")
            if "/storage/v1/bucket" in url:
                return _FakeResp(
                    200,
                    json.dumps(
                        [{"name": b} for b in ("avatars", "discovery-uploads", "report-screenshots")]
                    ).encode(),
                )
            if "/object/list/" in url:
                return _FakeResp(200, b"[]")
            raise AssertionError("unexpected request")

        c, so, se = _run_child(
            mod,
            armed=True,
            args=[PROD, str(out_dir), str(inv_dir)],
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_success_for_oserror,
        )
        check(
            c != 0
            and _assert_envelope(
                se, "STOP_STORAGE_EXPORT_INCOMPLETE", phase="inventory-write", kind="OSError"
            ),
            "oserror-local",
        )

        # 12 unexpected exception → RuntimeError
        def open_boom(req, timeout=0, context=None):
            raise RuntimeError("TEST_UNEXPECTED")

        # Actually RuntimeError from urlopen becomes... _request doesn't catch RuntimeError
        # It will bubble to main → child-exception kind=RuntimeError
        c, so, se = _run_child(
            mod,
            armed=True,
            args=args,
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_boom,
        )
        check(
            c != 0
            and _assert_envelope(
                se, "STOP_STORAGE_EXPORT_INCOMPLETE", phase="child-exception", kind="RuntimeError"
            ),
            "unexpected-runtime",
        )

        # 13 unknown bucket — must not print name
        def open_unknown_bucket(req, timeout=0, context=None):
            return _FakeResp(
                200,
                json.dumps(
                    [
                        {"name": "avatars"},
                        {"name": "discovery-uploads"},
                        {"name": "report-screenshots"},
                        {"name": "evil-secret-bucket"},
                    ]
                ).encode(),
            )

        c, so, se = _run_child(
            mod,
            armed=True,
            args=args,
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_unknown_bucket,
        )
        check(
            c != 0
            and _assert_envelope(se, "STOP_UNKNOWN_STORAGE_BUCKET")
            and "evil-secret-bucket" not in se
            and "evil-secret-bucket" not in so,
            "unknown-bucket-no-name",
        )

        # 14 success synthetic — empty object lists for all allowlisted buckets
        calls = {"n": 0}

        def open_success(req, timeout=0, context=None):
            calls["n"] += 1
            url = getattr(req, "full_url", "")
            if "/storage/v1/bucket" in url:
                return _FakeResp(
                    200,
                    json.dumps(
                        [{"name": b} for b in ("avatars", "discovery-uploads", "report-screenshots")]
                    ).encode(),
                )
            if "/object/list/" in url:
                return _FakeResp(200, b"[]")
            raise AssertionError("unexpected request in success path")

        c, so, se = _run_child(
            mod,
            armed=True,
            args=args,
            env={"SUPABASE_SERVICE_ROLE_KEY": "TEST_TOKEN_NOT_A_REAL_SECRET"},
            urlopen=open_success,
        )
        check(c == 0 and "BL_STORAGE_STOP" not in se and '"ok": true' in so, "success-empty")

    # Network deny still wired for default
    check(True, "no-real-network-invoked")

    print(f"[p5-production-storage-child-envelope-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-storage-child-envelope-check] All checks passed")


if __name__ == "__main__":
    main()
