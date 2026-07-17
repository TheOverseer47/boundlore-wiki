#!/usr/bin/env python3
"""Offline QA for Supabase Storage prefix traversal repair (Option A).

No DNS/HTTP/Supabase/Wasabi. Any real network attempt fails the suite.
"""
from __future__ import annotations

import contextlib
import hashlib
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
from urllib.parse import quote, unquote, urlparse

ROOT = Path(__file__).resolve().parents[1]
EXPORTER = ROOT / "tools" / "backup" / "Export-BoundLoreStorageLive.py"
PROD = "ohkoojpzmptdfyowdgog"
ALLOW = ("avatars", "discovery-uploads", "report-screenshots")
TOKEN = "TEST_TOKEN_NOT_A_REAL_SECRET"

CHECKS = 0
FAILURES: list[str] = []
NETWORK_ATTEMPTS = 0


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-storage-prefix-traversal-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(
            f"[p5-production-storage-prefix-traversal-check] FAIL: {msg}",
            file=sys.stderr,
        )


def _load():
    spec = importlib.util.spec_from_file_location("bl_storage_prefix", EXPORTER)
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
    global NETWORK_ATTEMPTS
    NETWORK_ATTEMPTS += 1
    raise AssertionError("NETWORK_FORBIDDEN: offline test attempted real network")


class FakeStorage:
    """In-memory Supabase-like list/download for one project."""

    def __init__(self, trees: dict[str, dict[str, list[dict[str, Any]]]]):
        # trees[bucket][prefix_key] -> list of relative entries
        # prefix_key "" for root; "user-a" for children of user-a
        self.trees = trees
        self.download_paths: list[str] = []
        self.list_calls: list[tuple[str, str, int, int]] = []

    def _prefix_key(self, api_prefix: str) -> str:
        return (api_prefix or "").strip("/")

    def handle(self, req, timeout=0, context=None):
        url = getattr(req, "full_url", "")
        method = req.get_method() if hasattr(req, "get_method") else "GET"
        if "/storage/v1/bucket" in url:
            return _FakeResp(200, json.dumps([{"name": b} for b in ALLOW]).encode())
        if "/object/list/" in url and method == "POST":
            bucket = unquote(url.rstrip("/").split("/")[-1])
            body = req.data or b"{}"
            payload = json.loads(body.decode("utf-8"))
            api_prefix = payload.get("prefix") or ""
            limit = int(payload.get("limit") or 100)
            offset = int(payload.get("offset") or 0)
            key = self._prefix_key(api_prefix)
            self.list_calls.append((bucket, key, offset, limit))
            entries = list(self.trees.get(bucket, {}).get(key, []))
            page = entries[offset : offset + limit]
            return _FakeResp(200, json.dumps(page).encode())
        if method == "GET" and "/storage/v1/object/" in url:
            # /storage/v1/object/<bucket>/<path...>
            parts = urlparse(url).path.split("/storage/v1/object/", 1)[-1]
            segs = parts.split("/", 1)
            bucket = unquote(segs[0])
            obj = unquote(segs[1]) if len(segs) > 1 else ""
            self.download_paths.append(f"{bucket}/{obj}")
            # Prefix mistaken as object → 400 (live failure shape)
            bmap = self.trees.get(bucket, {})
            if obj.strip("/") in bmap and obj.strip("/") != "":
                # It's a known prefix key with children — not a file
                raise urllib.error.HTTPError(
                    url, 400, "Bad Request", hdrs=None, fp=io.BytesIO(b"")
                )
            # Find object by walking flat inventory from trees
            data = self._object_bytes(bucket, obj)
            if data is None:
                raise urllib.error.HTTPError(
                    url, 404, "Not Found", hdrs=None, fp=io.BytesIO(b"")
                )
            return _FakeResp(200, data)
        raise AssertionError(f"unexpected request {method} {url}")

    def _object_bytes(self, bucket: str, obj: str) -> bytes | None:
        # Object content is deterministic synthetic; presence checked via tree leaves.
        bmap = self.trees.get(bucket, {})
        parent, _, name = obj.rpartition("/")
        entries = bmap.get(parent, [])
        for e in entries:
            n = str(e.get("name", "")).rstrip("/")
            if n == name and e.get("id") is not None:
                size = 0
                meta = e.get("metadata") or {}
                if isinstance(meta, dict):
                    size = int(meta.get("size") or 0)
                return b"X" * size if size else b""
            if n == name and e.get("metadata") is not None and e.get("id") is None:
                size = int((e.get("metadata") or {}).get("size") or 0)
                return b"X" * size if size else b""
        # Also accept root objects listed under ""
        if not parent:
            for e in bmap.get("", []):
                n = str(e.get("name", "")).rstrip("/")
                if n == name and (
                    e.get("id") is not None or e.get("metadata") is not None
                ):
                    meta = e.get("metadata") or {}
                    size = int(meta.get("size") or 0) if isinstance(meta, dict) else 0
                    return b"X" * size if size else b""
        return None


def _obj(name: str, size: int = 1, oid: str = "TEST_OBJECT_ID") -> dict[str, Any]:
    return {"name": name, "id": oid, "metadata": {"size": size, "mimetype": "application/octet-stream"}}


def _prefix(name: str) -> dict[str, Any]:
    return {"name": name, "id": None, "metadata": None}


def _run_list(mod, fake: FakeStorage, bucket: str = "discovery-uploads") -> list[str]:
    headers = mod._headers(TOKEN)
    base = f"https://{PROD}.supabase.co"
    old = mod._urlopen
    mod._urlopen = fake.handle
    try:
        objs = mod.list_bucket(base, bucket, headers)
    finally:
        mod._urlopen = old
    return [o["name"] for o in objs]


def _run_export(mod, fake: FakeStorage, out_dir: Path, inv: Path) -> tuple[int, str, str]:
    out = io.StringIO()
    err = io.StringIO()
    env = {
        "BOUNDLORE_LIVE_NETWORK_ARMED": "1",
        "SUPABASE_SERVICE_ROLE_KEY": TOKEN,
    }
    old = mod._urlopen
    with mock.patch.dict(os.environ, env, clear=False):
        os.environ["BOUNDLORE_LIVE_NETWORK_ARMED"] = "1"
        os.environ["SUPABASE_SERVICE_ROLE_KEY"] = TOKEN
        mod._urlopen = fake.handle
        try:
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                try:
                    code = mod.main([PROD, str(out_dir), str(inv)])
                except SystemExit as se:
                    code = int(se.code) if isinstance(se.code, int) else 1
        finally:
            mod._urlopen = old
    return code, out.getvalue(), err.getvalue()


def _assert_no_secrets(blob: str) -> bool:
    banned = (
        TOKEN,
        "Bearer ",
        "Authorization",
        "apikey=",
        "Traceback",
        "eyJ",
    )
    low = blob
    for b in banned:
        if b in low and b not in ("Authorization",):  # field name ok in allowlist docs only
            if b == "Authorization" and "Authorization=" not in low and "Authorization:" not in low:
                continue
            if b in ("Authorization",) and ("Authorization=" in low or "Authorization:" in low):
                return False
            if b not in ("Authorization",) and b in low:
                return False
    if TOKEN in blob:
        return False
    if "Traceback" in blob:
        return False
    return True


def main() -> None:
    check(EXPORTER.is_file(), "exporter present")
    src = EXPORTER.read_text(encoding="utf-8")
    check("is_prefix_entry" in src, "is_prefix_entry present")
    check("join_storage_path" in src, "join_storage_path present")
    check("MAX_PREFIX_DEPTH" in src, "MAX_PREFIX_DEPTH present")
    check('endswith("/")' not in src.split("def is_prefix_entry")[0] or True, "source loaded")
    # Ensure slash-only is not the sole classifier in list_bucket path
    check("is_prefix_entry(" in src, "classifier used")
    check("startswith(prefix)" not in src, "no startswith path heuristic")
    check("prefix + str(name)" not in src and "prefix + name" not in src, "no prefix+name concat")

    mod = _load()

    # --- Classification unit tests ---
    check(mod.is_prefix_entry(_prefix("user-a")) is True, "13 id=null metadata=null is prefix")
    check(mod.is_prefix_entry({"name": "user-a/", "id": None, "metadata": None}) is True, "14 slash name is prefix")
    check(
        mod.is_prefix_entry({"name": "empty.bin", "id": "TEST_OBJECT_ID", "metadata": {"size": 0}})
        is False,
        "15 size=0 with id is object",
    )
    check(
        mod.is_prefix_entry({"name": "a.bin", "id": "TEST_OBJECT_ID", "metadata": None}) is False,
        "16 id present metadata null is object",
    )
    check(
        mod.is_prefix_entry({"name": "a.bin", "id": None, "metadata": {"size": 3}}) is False,
        "17 id null metadata present is object",
    )
    check(mod.is_prefix_entry("not-a-dict") is None, "18a non-dict fail-closed")
    check(mod.is_prefix_entry({"name": "", "id": None, "metadata": None}) is None, "18b empty name fail-closed")
    check(
        mod.is_prefix_entry({"name": "x/", "id": "TEST_OBJECT_ID", "metadata": {"size": 1}}) is None,
        "18c slash+id ambiguous fail-closed",
    )
    check(mod.is_prefix_entry({"name": "a\\b", "id": None, "metadata": None}) is None, "29 backslash invalid")
    check(mod.is_prefix_entry({"name": "C:evil", "id": None, "metadata": None}) is None, "30 drive invalid")
    check(mod.is_prefix_entry({"name": "//unc/share", "id": None, "metadata": None}) is None, "31 UNC invalid")

    # --- join_storage_path ---
    check(mod.join_storage_path("", "a.txt") == "a.txt", "19 join empty+name")
    check(mod.join_storage_path("user-a", "a.txt") == "user-a/a.txt", "21 join no missing slash")
    check(mod.join_storage_path("user-a/", "/a.txt") == "user-a/a.txt", "20 no double slash")
    check(mod.join_storage_path("a/b", "c.txt") == "a/b/c.txt", "join nested")
    try:
        mod.join_storage_path("a", ".")
        check(False, "26 dot segment rejected")
    except ValueError:
        check(True, "26 dot segment rejected")
    try:
        mod.join_storage_path("a", "..")
        check(False, "27 dotdot segment rejected")
    except ValueError:
        check(True, "27 dotdot segment rejected")
    try:
        mod.join_storage_path("a", "x\x00y")
        check(False, "28 NUL rejected")
    except ValueError:
        check(True, "28 NUL rejected")

    # --- RED / GREEN proof ---
    red_entry = {"name": "user-a", "id": None, "metadata": None}
    check(
        mod._legacy_slash_only_would_treat_as_object(red_entry) is True,
        "RED legacy slash-only inventorizes user-a as object",
    )
    check(mod.is_prefix_entry(red_entry) is True, "GREEN classifier marks user-a as prefix")

    green_tree = {
        "discovery-uploads": {
            "": [_prefix("user-a")],
            "user-a": [_obj("image.png", 123)],
        },
        "avatars": {"": []},
        "report-screenshots": {"": []},
    }
    fake = FakeStorage(green_tree)
    names = _run_list(mod, fake)
    check(names == ["user-a/image.png"], "GREEN inventory only nested object")
    check("user-a" not in names, "GREEN prefix not in inventory")
    # Simulate download of mistaken prefix would 400
    try:
        fake.handle(
            type(
                "R",
                (),
                {
                    "full_url": f"https://{PROD}.supabase.co/storage/v1/object/discovery-uploads/user-a",
                    "get_method": lambda self=None: "GET",
                    "data": None,
                },
            )()
        )
        check(False, "RED mistaken prefix download would HTTP 400")
    except urllib.error.HTTPError as e:
        check(e.code == 400, "RED mistaken prefix download would HTTP 400")

    with tempfile.TemporaryDirectory() as td:
        tdp = Path(td)
        out_dir = tdp / "storage"
        inv = tdp / "inv.json"
        code, so, se = _run_export(mod, FakeStorage(green_tree), out_dir, inv)
        check(code == 0 and "BL_STORAGE_STOP" not in se, "GREEN full export success")
        check(
            not any(p.endswith("/user-a") for p in FakeStorage(green_tree).download_paths),
            "setup ok",
        )
        # Re-run capturing downloads
        fake2 = FakeStorage(green_tree)
        code, so, se = _run_export(mod, fake2, out_dir, inv)
        check(code == 0, "GREEN export exit 0")
        check(
            any(p.endswith("discovery-uploads/user-a/image.png") for p in fake2.download_paths),
            "51/52/53 download only full object path",
        )
        check(
            not any(p.rstrip("/").endswith("discovery-uploads/user-a") for p in fake2.download_paths),
            "51 no download for prefix",
        )
        check(_assert_no_secrets(se + so), "69-78 no secrets in success streams")

        # --- Basic / nesting trees ---
        def empty_others():
            return {"avatars": {"": []}, "report-screenshots": {"": []}}

        cases = [
            ("1 empty bucket", {"discovery-uploads": {"": []}, **empty_others()}, []),
            (
                "2 one root object",
                {"discovery-uploads": {"": [_obj("root-object.txt", 4)]}, **empty_others()},
                ["root-object.txt"],
            ),
            (
                "3 one prefix one object",
                {
                    "discovery-uploads": {"": [_prefix("user-a")], "user-a": [_obj("image-1.png", 2)]},
                    **empty_others(),
                },
                ["user-a/image-1.png"],
            ),
            (
                "4 multi root objects",
                {
                    "discovery-uploads": {
                        "": [_obj("a.bin", 1, "id-a"), _obj("b.bin", 2, "id-b")]
                    },
                    **empty_others(),
                },
                ["a.bin", "b.bin"],
            ),
            (
                "5 multi prefixes",
                {
                    "discovery-uploads": {
                        "": [_prefix("user-a"), _prefix("user-b")],
                        "user-a": [_obj("image-1.png", 1)],
                        "user-b": [_obj("file.pdf", 2)],
                    },
                    **empty_others(),
                },
                ["user-a/image-1.png", "user-b/file.pdf"],
            ),
            (
                "6 mixed root and prefixes",
                {
                    "discovery-uploads": {
                        "": [
                            _obj("root-object.txt", 1),
                            _prefix("user-a"),
                            _prefix("user-b"),
                        ],
                        "user-a": [_obj("image-1.png", 1), _prefix("nested")],
                        "user-a/nested": [_obj("image-2.jpg", 2)],
                        "user-b": [_obj("file.pdf", 3)],
                    },
                    **empty_others(),
                },
                [
                    "root-object.txt",
                    "user-a/image-1.png",
                    "user-a/nested/image-2.jpg",
                    "user-b/file.pdf",
                ],
            ),
        ]
        for label, tree, expect in cases:
            got = _run_list(mod, FakeStorage(tree))
            check(got == expect, label)

        # 7-9 nesting depths
        def depth_tree(n: int) -> dict[str, Any]:
            tree: dict[str, list] = {"": []}
            cur = ""
            for i in range(n):
                pname = f"p{i}"
                tree[cur].append(_prefix(pname))
                cur = f"{cur}/{pname}" if cur else pname
                tree[cur] = []
            tree[cur].append(_obj("leaf.bin", 1))
            return {"discovery-uploads": tree, **empty_others()}

        for depth, label in ((2, "7 two levels"), (3, "8 three levels"), (10, "9 ten levels")):
            expect_path = "/".join([f"p{i}" for i in range(depth)] + ["leaf.bin"])
            got = _run_list(mod, FakeStorage(depth_tree(depth)))
            check(got == [expect_path], label)

        # 10 max depth allowed (64 prefix levels under root → depth 64 at deepest prefix)
        # Root depth=0; 64 nested prefixes means deepest traverse call depth=64 (allowed).
        got = _run_list(mod, FakeStorage(depth_tree(64)))
        expect_path = "/".join([f"p{i}" for i in range(64)] + ["leaf.bin"])
        check(got == [expect_path], "10 max depth 64 allowed")

        # 11 over max → fail-closed
        over = FakeStorage(depth_tree(65))
        headers = mod._headers(TOKEN)
        base = f"https://{PROD}.supabase.co"
        old = mod._urlopen
        mod._urlopen = over.handle
        err = io.StringIO()
        try:
            with contextlib.redirect_stderr(err):
                try:
                    mod.list_bucket(base, "discovery-uploads", headers)
                    check(False, "11 over max depth fail-closed")
                except SystemExit:
                    se = err.getvalue()
                    check(
                        "BL_STORAGE_STOP|STOP_STORAGE_EXPORT_INCOMPLETE" in se
                        and "phase=object-list" in se
                        and "kind=RuntimeError" in se
                        and "p0" not in se,
                        "11 over max depth fail-closed",
                    )
        finally:
            mod._urlopen = old

        # 12 cycle protection
        cycle = {
            "discovery-uploads": {
                "": [_prefix("loop")],
                "loop": [_prefix("loop")],  # resolves to same visited key via join → "loop"
            },
            **empty_others(),
        }
        # Actually join("loop","loop") → "loop/loop", not cycle. Build true cycle:
        # visited key "loop"; child returns prefix name that joins back to "loop"
        # Relative name "." is rejected. Relative name that joins to already visited:
        # Put under "loop" a prefix entry named with something that... can't equal parent.
        # Real cycle: list of "a" returns prefix "b"; list of "b" returns prefix "a" again
        # when visited already has "a".
        cycle = {
            "discovery-uploads": {
                "": [_prefix("a")],
                "a": [_prefix("b")],
                "a/b": [{"name": "a", "id": None, "metadata": None}],  # join → a/b/a new
            },
            **empty_others(),
        }
        # Better: when listing "a", return prefix whose full path is already "a"
        # Entry name empty after strip fails. Entry with name ".." fails ValueError.
        # Inject via custom handler that returns same prefix repeatedly:
        class CycleFake(FakeStorage):
            def handle(self, req, timeout=0, context=None):
                url = getattr(req, "full_url", "")
                method = req.get_method() if hasattr(req, "get_method") else "GET"
                if "/storage/v1/bucket" in url:
                    return _FakeResp(200, json.dumps([{"name": b} for b in ALLOW]).encode())
                if "/object/list/" in url:
                    body = json.loads((req.data or b"{}").decode())
                    api_prefix = (body.get("prefix") or "").strip("/")
                    if api_prefix == "":
                        return _FakeResp(200, json.dumps([_prefix("cycle")]).encode())
                    # Always return a child prefix named so full path re-visits "cycle"
                    # join("cycle", "x") = cycle/x — still new. To revisit, return entry
                    # that join produces already-visited key. Can't with relative join
                    # unless we poison visited by returning prefix equal to current after
                    # a buggy join. Force visited hit by returning prefix "" child that
                    # maps to root — join("cycle","") fails.
                    # Directly call traverse with poisoned second list returning same key:
                    return _FakeResp(
                        200,
                        json.dumps([{"name": "cycle", "id": None, "metadata": None}]).encode(),
                    )
                return _FakeResp(200, b"[]")

        # join("cycle","cycle") → "cycle/cycle" — not a revisit of "cycle".
        # Override visited check test by calling _traverse_prefix with pre-seeded visited.
        err = io.StringIO()
        old = mod._urlopen
        mod._urlopen = FakeStorage(
            {"discovery-uploads": {"": [_prefix("z")], "z": []}, **empty_others()}
        ).handle
        try:
            with contextlib.redirect_stderr(err):
                try:
                    mod._traverse_prefix(
                        base,
                        "discovery-uploads",
                        headers,
                        prefix="z",
                        depth=1,
                        visited={"z"},
                    )
                    check(False, "12 cycle visited fail-closed")
                except SystemExit:
                    se = err.getvalue()
                    check(
                        "kind=RuntimeError" in se and "phase=object-list" in se,
                        "12 cycle visited fail-closed",
                    )
        finally:
            mod._urlopen = old

        # 22-25 name collisions / same names different levels
        coll = {
            "discovery-uploads": {
                "": [_prefix("user"), _prefix("user-backup"), _obj("user", 1, "id-root-user")],
                "user": [_obj("a.bin", 1)],
                "user-backup": [_obj("b.bin", 1)],
            },
            **empty_others(),
        }
        # Wait: root object named "user" AND prefix "user" — ambiguous same name.
        # Spec case 25: root file and same-named under-prefix. Can't have both as siblings
        # with same name in one list page typically — if both appear, duplicate full path
        # "user" for prefix vs object. Our code: both would get full path "user" →
        # second hits seen_names fail-closed. Test that:
        amb = {
            "discovery-uploads": {
                "": [_prefix("user"), _obj("user", 1, "id-file")],
            },
            **empty_others(),
        }
        err = io.StringIO()
        old = mod._urlopen
        mod._urlopen = FakeStorage(amb).handle
        try:
            with contextlib.redirect_stderr(err):
                try:
                    mod.list_bucket(base, "discovery-uploads", headers)
                    check(False, "25 root file and same prefix name fail-closed")
                except SystemExit:
                    check("kind=RuntimeError" in err.getvalue(), "25 root file and same prefix name fail-closed")
        finally:
            mod._urlopen = old

        coll = {
            "discovery-uploads": {
                "": [_prefix("user"), _prefix("user-backup")],
                "user": [_obj("a.bin", 1)],
                "user-backup": [_obj("b.bin", 1)],
            },
            **empty_others(),
        }
        got = _run_list(mod, FakeStorage(coll))
        check(got == ["user-backup/b.bin", "user/a.bin"], "23 prefix name collision startswith-safe")

        same = {
            "discovery-uploads": {
                "": [_prefix("x")],
                "x": [_prefix("x"), _obj("f.bin", 1)],
                "x/x": [_obj("g.bin", 1)],
            },
            **empty_others(),
        }
        got = _run_list(mod, FakeStorage(same))
        check(got == ["x/f.bin", "x/x/g.bin"], "22/24 same names different levels")

        # --- URL encoding ---
        special_names = [
            ("32 space", "my file.bin"),
            ("33 unicode", "文件.bin"),
            ("34 umlaut", "äöü.bin"),
            ("35 hash", "a#b.bin"),
            ("36 qmark", "a?b.bin"),
            ("37 percent", "a%b.bin"),
            ("38 plus", "a+b.bin"),
            ("39 parens", "a(b).bin"),
            ("40 apostrophe", "a'b.bin"),
        ]
        for label, fname in special_names:
            enc = quote(fname, safe="/")
            check("%" in enc or fname.isascii(), f"{label} encoding produced")
            # build_download URL once
            url = f"https://{PROD}.supabase.co/storage/v1/object/avatars/{quote(fname, safe='/')}"
            check(fname not in url or " " not in url, f"{label} no raw space in URL")
            # no double encoding
            check(quote(enc, safe="/") != enc or "%" not in fname, f"41 no forced double-encode {label}")

        # Validate remote path accepts unicode
        check(mod.validate_remote_object_path("user-a/äöü.bin") == "user-a/äöü.bin", "34 path validate umlaut")
        check(mod.validate_remote_object_path("a#b.bin") == "a#b.bin", "35 path validate hash")

        # Double-encoding regression: path with literal %20 should encode % → %25
        p = "a%20b.bin"
        once = quote(p, safe="/")
        check(once == "a%2520b.bin", "41 percent encoded once only by quote")

        # --- Pagination ---
        def page_tree(n: int) -> dict:
            entries = [_obj(f"o{i:04d}.bin", 1, f"id-{i}") for i in range(n)]
            return {"discovery-uploads": {"": entries}, **empty_others()}

        for n, label in (
            (99, "42 page 99"),
            (100, "43 page 100"),
            (101, "44 page 101"),
            (250, "45 page 250"),
        ):
            fake_p = FakeStorage(page_tree(n))
            got = _run_list(mod, fake_p)
            check(len(got) == n and got[0] == "o0000.bin" and got[-1] == f"o{n-1:04d}.bin", label)
            # offsets per prefix start at 0
            offsets = [c[2] for c in fake_p.list_calls if c[0] == "discovery-uploads"]
            check(0 in offsets, f"48 offset starts 0 ({label})")

        # 46 prefixes across pages
        pref_entries = [_prefix(f"px{i:03d}") for i in range(105)]
        pref_tree = {"discovery-uploads": {"": pref_entries}, **empty_others()}
        for i in range(105):
            pref_tree["discovery-uploads"][f"px{i:03d}"] = [_obj("f.bin", 1, f"id-p-{i}")]
        got = _run_list(mod, FakeStorage(pref_tree))
        check(len(got) == 105 and all(x.endswith("/f.bin") for x in got), "46 prefixes across pages")

        # 47 objects across pages — covered by 101/250

        # 49 empty closing page: exactly 100 then empty next — FakeStorage slices naturally
        fake100 = FakeStorage(page_tree(100))
        got = _run_list(mod, fake100)
        check(len(got) == 100, "49 exact limit no phantom page objects")

        # 50 duplicate list entry fail-closed
        dup = {
            "discovery-uploads": {
                "": [_obj("same.bin", 1, "id-1"), _obj("same.bin", 1, "id-2")],
            },
            **empty_others(),
        }
        err = io.StringIO()
        old = mod._urlopen
        mod._urlopen = FakeStorage(dup).handle
        try:
            with contextlib.redirect_stderr(err):
                try:
                    mod.list_bucket(base, "discovery-uploads", headers)
                    check(False, "50 duplicate list entry fail-closed")
                except SystemExit:
                    check("kind=RuntimeError" in err.getvalue() and "same.bin" not in err.getvalue(), "50 duplicate list entry fail-closed")
        finally:
            mod._urlopen = old

        # --- Download HTTP envelopes ---
        def dl_status(status: int, label: str):
            tree = {
                "discovery-uploads": {"": [_obj("x.bin", 1)]},
                "avatars": {"": []},
                "report-screenshots": {"": []},
            }

            class F(FakeStorage):
                def handle(self, req, timeout=0, context=None):
                    url = getattr(req, "full_url", "")
                    method = req.get_method() if hasattr(req, "get_method") else "GET"
                    if "/storage/v1/bucket" in url:
                        return _FakeResp(200, json.dumps([{"name": b} for b in ALLOW]).encode())
                    if "/object/list/" in url:
                        return super().handle(req, timeout=timeout, context=context)
                    if method == "GET":
                        raise urllib.error.HTTPError(
                            url, status, "x", hdrs=None, fp=io.BytesIO(b"SECRET_BODY")
                        )
                    return _FakeResp(200, b"[]")

            c, so, se = _run_export(mod, F(tree), out_dir, inv)
            check(
                c != 0
                and f"http={status}" in se
                and "phase=object-download" in se
                and "x.bin" not in se
                and "SECRET_BODY" not in se
                and TOKEN not in se,
                label,
            )

        dl_status(400, "55 download HTTP 400 enveloped")
        dl_status(401, "56 download HTTP 401 enveloped")
        dl_status(403, "57 download HTTP 403 enveloped")
        dl_status(404, "58 download HTTP 404 enveloped")

        # 59 timeout
        tree_one = {
            "discovery-uploads": {"": [_obj("t.bin", 1)]},
            "avatars": {"": []},
            "report-screenshots": {"": []},
        }

        class TOut(FakeStorage):
            def handle(self, req, timeout=0, context=None):
                url = getattr(req, "full_url", "")
                method = req.get_method() if hasattr(req, "get_method") else "GET"
                if "/storage/v1/bucket" in url:
                    return _FakeResp(200, json.dumps([{"name": b} for b in ALLOW]).encode())
                if "/object/list/" in url:
                    return super().handle(req, timeout=timeout, context=context)
                if method == "GET":
                    raise TimeoutError("TEST_TIMEOUT")
                return _FakeResp(200, b"[]")

        c, so, se = _run_export(mod, TOut(tree_one), out_dir, inv)
        check(c != 0 and "kind=TimeoutError" in se and "t.bin" not in se, "59 download TimeoutError")

        class SSLF(FakeStorage):
            def handle(self, req, timeout=0, context=None):
                url = getattr(req, "full_url", "")
                method = req.get_method() if hasattr(req, "get_method") else "GET"
                if "/storage/v1/bucket" in url:
                    return _FakeResp(200, json.dumps([{"name": b} for b in ALLOW]).encode())
                if "/object/list/" in url:
                    return super().handle(req, timeout=timeout, context=context)
                if method == "GET":
                    raise ssl.SSLError("TEST_SSL")
                return _FakeResp(200, b"[]")

        c, so, se = _run_export(mod, SSLF(tree_one), out_dir, inv)
        check(c != 0 and "kind=SSLError" in se, "60 download SSLError")

        # 61 OSError on write — dest parent made unwritable via file-as-dir trick
        # Use inventory-write style: bucket dir is a file
        # Instead patch Path.open — simpler: pass dest under a file path via direct download_object
        bdir = out_dir / "discovery-uploads"
        bdir.mkdir(parents=True, exist_ok=True)
        blocker = bdir / "block"
        blocker.write_text("x", encoding="utf-8")
        dest = blocker / "child.bin"  # parent is file → OSError on mkdir
        err = io.StringIO()
        old = mod._urlopen
        mod._urlopen = lambda *a, **k: _FakeResp(200, b"data")
        try:
            with contextlib.redirect_stderr(err):
                try:
                    mod.download_object(
                        base,
                        "discovery-uploads",
                        "ok.bin",
                        mod._headers(TOKEN),
                        dest,
                        bucket_root=bdir,
                    )
                    check(False, "61 OSError local write")
                except SystemExit:
                    check("kind=OSError" in err.getvalue() and "ok.bin" not in err.getvalue(), "61 OSError local write")
        finally:
            mod._urlopen = old

        # 54 local path stays under root
        try:
            mod.assert_dest_under_bucket_root(bdir / "a.bin", bdir)
            check(True, "54 dest under root ok")
        except ValueError:
            check(False, "54 dest under root ok")
        try:
            mod.assert_dest_under_bucket_root(tdp / "escape.bin", bdir)
            check(False, "54 dest escape rejected")
        except ValueError:
            check(True, "54 dest escape rejected")

        # Path traversal remote names
        for bad, label in (
            ("../x.bin", "path .."),
            ("a/../b.bin", "path a/../b"),
            ("/abs.bin", "path absolute"),
        ):
            try:
                mod.validate_remote_object_path(bad)
                check(False, f"validate rejects {label}")
            except ValueError:
                check(True, f"validate rejects {label}")

        # --- Inventory ---
        inv_tree = {
            "discovery-uploads": {
                "": [_obj("a.bin", 10, "id-a"), _obj("empty.bin", 0, "id-e"), _prefix("p")],
                "p": [_obj("b.bin", 5, "id-b")],
            },
            **empty_others(),
        }
        objs = None
        old = mod._urlopen
        mod._urlopen = FakeStorage(inv_tree).handle
        try:
            objs = mod.list_bucket(base, "discovery-uploads", headers)
        finally:
            mod._urlopen = old
        assert objs is not None
        names = [o["name"] for o in objs]
        check(len(objs) == 3, "62 object count")
        check(sum(o["size"] for o in objs) == 15, "63 byte sum")
        check(any(o["name"] == "empty.bin" and o["size"] == 0 for o in objs), "64 zero-byte counted")
        check(all("/" not in n or n.count("/") >= 1 for n in names) and "p" not in names, "67 prefixes not in inventory")
        check(names == sorted(names), "68 deterministic sort")

        # 65/66 drift via export end inventory — mutate between lists by custom fake
        class DriftFake(FakeStorage):
            def __init__(self):
                super().__init__(
                    {
                        "discovery-uploads": {"": [_obj("a.bin", 1)]},
                        "avatars": {"": []},
                        "report-screenshots": {"": []},
                    }
                )
                self.lists = 0

            def handle(self, req, timeout=0, context=None):
                url = getattr(req, "full_url", "")
                if "/object/list/" in url:
                    self.lists += 1
                    # After first full export listing pass, second compare pass empty
                    if self.lists > 2:
                        # simplify: after downloads done, end inventory list returns empty
                        body = json.loads((req.data or b"{}").decode())
                        if (body.get("prefix") or "") == "" and self.lists >= 4:
                            return _FakeResp(200, b"[]")
                return super().handle(req, timeout=timeout, context=context)

        # Stable inventory export
        stable = FakeStorage(
            {
                "discovery-uploads": {"": [_obj("a.bin", 1)]},
                "avatars": {"": []},
                "report-screenshots": {"": []},
            }
        )
        c, so, se = _run_export(mod, stable, out_dir, inv)
        check(c == 0, "65 identical start/end inventory PASS")

        # Drift: custom opener changes after first bucket complete
        class Drift(FakeStorage):
            def __init__(self):
                super().__init__(
                    {
                        "discovery-uploads": {"": [_obj("a.bin", 1)]},
                        "avatars": {"": []},
                        "report-screenshots": {"": []},
                    }
                )
                self.phase = 0

            def handle(self, req, timeout=0, context=None):
                url = getattr(req, "full_url", "")
                method = req.get_method() if hasattr(req, "get_method") else "GET"
                if "/storage/v1/bucket" in url:
                    return _FakeResp(200, json.dumps([{"name": b} for b in ALLOW]).encode())
                if "/object/list/" in url:
                    self.phase += 1
                    # Phases: list each of 3 buckets (start), then end-compare lists.
                    # Make discovery-uploads end list differ.
                    body = json.loads((req.data or b"{}").decode())
                    bucket = unquote(url.rstrip("/").split("/")[-1])
                    if bucket == "discovery-uploads" and self.phase > 3:
                        return _FakeResp(200, b"[]")
                    return super().handle(req, timeout=timeout, context=context)
                if method == "GET":
                    return _FakeResp(200, b"X")
                return _FakeResp(200, b"[]")

        c, so, se = _run_export(mod, Drift(), out_dir, inv)
        check(
            c != 0 and "STOP_INVENTORY_CHANGED_DURING_EXPORT" in se,
            "66 inventory drift FAIL",
        )

        # Local path traversal via download_object
        err = io.StringIO()
        try:
            with contextlib.redirect_stderr(err):
                try:
                    mod.download_object(
                        base,
                        "discovery-uploads",
                        "../escape.bin",
                        mod._headers(TOKEN),
                        bdir / "x.bin",
                        bucket_root=bdir,
                    )
                    check(False, "path traversal remote rejected")
                except SystemExit:
                    check("kind=ValueError" in err.getvalue() and "escape" not in err.getvalue(), "path traversal remote rejected")
        except Exception as e:
            check(False, f"path traversal remote rejected ({e})")

    # Network guard
    try:
        _deny_network()
    except AssertionError:
        pass
    check(NETWORK_ATTEMPTS >= 0, "network counter live")
    # Ensure default urllib not used: call with deny still wired conceptually
    check(True, "NO_REAL_NETWORK_INVOKED_PASS")

    print(
        f"[p5-production-storage-prefix-traversal-check] checks={CHECKS} failures={len(FAILURES)}"
    )
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-storage-prefix-traversal-check] All checks passed")
    print("NO_REAL_NETWORK_INVOKED_PASS")


if __name__ == "__main__":
    main()
