#!/usr/bin/env python3
"""Live read-only Supabase Storage export (armed only via BOUNDLORE_LIVE_NETWORK_ARMED=1).

Uses stdlib only. Allowed: list + download. Forbidden: upload/update/delete.

On failure emits exactly one machine-readable stderr line:

  BL_STORAGE_STOP|<STOPCODE>|phase=<PHASE>|http=<STATUS>|bucket=<ALLOWLISTED>|kind=<KIND>

Only present allowlisted fields are appended. Never prints secrets, headers,
object paths, URLs, response bodies, or free-form exception text.
"""
from __future__ import annotations

import hashlib
import json
import os
import ssl
import sys
import urllib.error
import urllib.request
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "_lib"))

from stop_codes import (  # noqa: E402
    BUCKET_ALLOWLIST,
    KNOWN_PRODUCTION_REF,
    KNOWN_STAGING_REF,
    STOP_INVENTORY_CHANGED_DURING_EXPORT,
    STOP_LIVE_NETWORK_RESERVED,
    STOP_STORAGE_CREDENTIAL_MISSING,
    STOP_STORAGE_EXPORT_INCOMPLETE,
    STOP_STAGING_TARGET,
    STOP_UNKNOWN_STORAGE_BUCKET,
    STOP_WRONG_PROJECT,
)

ALLOWED_STOPS = frozenset(
    {
        STOP_LIVE_NETWORK_RESERVED,
        STOP_STORAGE_CREDENTIAL_MISSING,
        STOP_WRONG_PROJECT,
        STOP_STAGING_TARGET,
        STOP_UNKNOWN_STORAGE_BUCKET,
        STOP_INVENTORY_CHANGED_DURING_EXPORT,
        STOP_STORAGE_EXPORT_INCOMPLETE,
    }
)
ALLOWED_PHASES = frozenset(
    {
        "startup",
        "bucket-list",
        "object-list",
        "object-download",
        "inventory-compare",
        "inventory-write",
        "child-exception",
    }
)
ALLOWED_KINDS = frozenset(
    {
        "HTTPError",
        "URLError",
        "TimeoutError",
        "SSLError",
        "JSONDecodeError",
        "UnicodeDecodeError",
        "OSError",
        "ValueError",
        "TypeError",
        "RuntimeError",
    }
)

# Injectable for offline tests — real runtime uses urllib.request.urlopen.
_urlopen: Callable[..., Any] = urllib.request.urlopen

# Recursion / pagination guards (tested offline; never emit prefix/object names).
MAX_PREFIX_DEPTH = 64
LIST_PAGE_LIMIT = 100
LIST_OFFSET_HARD_CAP = 100000


class StorageStop(Exception):
    """Internal typed stop — converted to a single BL_STORAGE_STOP envelope."""

    def __init__(
        self,
        code: str,
        *,
        phase: str | None = None,
        http: int | None = None,
        bucket: str | None = None,
        kind: str | None = None,
    ) -> None:
        self.code = code
        self.phase = phase
        self.http = http
        self.bucket = bucket
        self.kind = kind
        super().__init__(code)


def _safe_bucket(bucket: str | None) -> str | None:
    if bucket and bucket in BUCKET_ALLOWLIST:
        return bucket
    return None


def join_storage_path(prefix: str, name: str) -> str:
    """Join Supabase object path segments with '/' only (never os.path / backslash).

    Raises ValueError for empty name, NUL, '.', '..', or empty segments after join.
    Does not print paths — callers convert ValueError into a redacted envelope.
    """
    if name is None or not isinstance(name, str):
        raise ValueError("invalid_name")
    raw_name = name.replace("\\", "/")
    raw_prefix = (prefix or "").replace("\\", "/")
    if "\x00" in raw_name or "\x00" in raw_prefix:
        raise ValueError("nul")
    # Strip one leading/trailing slash from each side before join.
    left = raw_prefix.strip("/")
    right = raw_name.strip("/")
    if not right:
        raise ValueError("empty_name")
    joined = right if not left else f"{left}/{right}"
    # Collapse accidental double slashes without changing segment meaning.
    while "//" in joined:
        joined = joined.replace("//", "/")
    segments = joined.split("/")
    if any(seg in ("", ".", "..") for seg in segments):
        raise ValueError("bad_segment")
    return joined


def is_prefix_entry(entry: Any) -> bool | None:
    """Classify a Storage list entry.

    Returns:
      True  — virtual folder / prefix (do not download)
      False — downloadable object
      None  — structurally ambiguous / invalid (caller must fail-closed)

    Canonical prefix rule (Supabase):
      dict with non-empty name AND id is None AND metadata is None.

    Compatibility: a trailing '/' on name is also accepted as a prefix signal
    when id and metadata are both None. A trailing '/' with a non-null id or
    non-null metadata is ambiguous → None (fail-closed).

    Empty objects (size=0) with a real id remain objects.
    """
    if not isinstance(entry, dict):
        return None
    name = entry.get("name")
    if not isinstance(name, str) or not name.strip() or "\x00" in name:
        return None
    # Backslash, drive letter, or UNC shapes are invalid remote names.
    if "\\" in name or name.startswith("//") or (len(name) >= 2 and name[1] == ":"):
        return None

    eid = entry.get("id", None)
    meta = entry.get("metadata", None)
    name_is_slash_folder = name.endswith("/")

    if eid is None and meta is None:
        return True
    if name_is_slash_folder:
        # Slash with object identity is ambiguous — do not guess.
        return None
    if eid is not None:
        if meta is not None and not isinstance(meta, dict):
            return None
        return False
    if meta is not None:
        if not isinstance(meta, dict):
            return None
        return False
    return None


def _legacy_slash_only_would_treat_as_object(entry: dict[str, Any]) -> bool:
    """Document RED behaviour of the pre-repair classifier (slash-only).

    Used only by offline red/green proof — not used in production paths.
    """
    name = entry.get("name")
    if not name:
        return False
    return not str(name).endswith("/")


def _normalize_prefix_key(prefix: str) -> str:
    return (prefix or "").replace("\\", "/").strip("/")


def _list_api_prefix(prefix: str) -> str:
    """Prefix string sent to Storage list API (non-empty prefixes end with '/')."""
    key = _normalize_prefix_key(prefix)
    if not key:
        return ""
    return key + "/"


def emit_parent_stop(
    code: str,
    *,
    phase: str | None = None,
    http: int | None = None,
    bucket: str | None = None,
    kind: str | None = None,
) -> None:
    """Write exactly one allowlisted envelope line to stderr and exit nonzero."""
    if code not in ALLOWED_STOPS:
        code = STOP_STORAGE_EXPORT_INCOMPLETE
        phase = phase if phase in ALLOWED_PHASES else "child-exception"
        kind = "RuntimeError"
    parts = [f"BL_STORAGE_STOP|{code}"]
    if phase and phase in ALLOWED_PHASES:
        parts.append(f"phase={phase}")
    if http is not None and isinstance(http, int) and 100 <= http <= 599:
        parts.append(f"http={http}")
    safe_bucket = _safe_bucket(bucket)
    if safe_bucket:
        parts.append(f"bucket={safe_bucket}")
    if kind and kind in ALLOWED_KINDS:
        parts.append(f"kind={kind}")
    line = "|".join(parts)
    print(line, file=sys.stderr, flush=True)
    raise SystemExit(1)


def _classify_exception(exc: BaseException) -> tuple[str, int | None]:
    # HTTPError is a subclass of URLError — check first.
    if isinstance(exc, urllib.error.HTTPError):
        code = getattr(exc, "code", None)
        return "HTTPError", int(code) if isinstance(code, int) else None
    if isinstance(exc, urllib.error.URLError):
        return "URLError", None
    if isinstance(exc, TimeoutError):
        return "TimeoutError", None
    if isinstance(exc, ssl.SSLError):
        return "SSLError", None
    if isinstance(exc, json.JSONDecodeError):
        return "JSONDecodeError", None
    if isinstance(exc, UnicodeDecodeError):
        return "UnicodeDecodeError", None
    if isinstance(exc, OSError):
        return "OSError", None
    if isinstance(exc, ValueError):
        return "ValueError", None
    if isinstance(exc, TypeError):
        return "TypeError", None
    return "RuntimeError", None


def _headers(service_key: str) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {service_key}",
        "apikey": service_key,
        "Content-Type": "application/json",
    }


def _request(
    method: str,
    url: str,
    headers: dict[str, str],
    body: bytes | None = None,
    *,
    timeout: int = 120,
    phase: str,
    bucket: str | None = None,
) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    ctx = ssl.create_default_context()
    try:
        with _urlopen(req, timeout=timeout, context=ctx) as resp:
            return int(getattr(resp, "status", 200) or 200), resp.read()
    except urllib.error.HTTPError as exc:
        try:
            _ = exc.read() if hasattr(exc, "read") else b""
        except Exception:
            pass
        status = int(exc.code) if getattr(exc, "code", None) else 0
        return status, b""
    except (urllib.error.URLError, TimeoutError, ssl.SSLError) as exc:
        kind, http = _classify_exception(exc)
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase=phase,
            http=http,
            bucket=_safe_bucket(bucket),
            kind=kind,
        )
        raise  # pragma: no cover — emit always exits
    return 0, b""


def _decode_json(data: bytes, *, phase: str, bucket: str | None = None) -> Any:
    try:
        text = data.decode("utf-8") if data else "[]"
    except UnicodeDecodeError:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase=phase,
            bucket=_safe_bucket(bucket),
            kind="UnicodeDecodeError",
        )
    try:
        return json.loads(text or "[]")
    except json.JSONDecodeError:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase=phase,
            bucket=_safe_bucket(bucket),
            kind="JSONDecodeError",
        )


def _object_from_entry(
    entry: dict[str, Any], *, full_path: str, bucket: str
) -> dict[str, Any]:
    meta = entry.get("metadata")
    if meta is None:
        meta = {}
    if not isinstance(meta, dict):
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-list",
            bucket=_safe_bucket(bucket),
            kind="RuntimeError",
        )
    try:
        size = int(meta.get("size") or 0)
    except (TypeError, ValueError):
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-list",
            bucket=_safe_bucket(bucket),
            kind="ValueError",
        )
    return {
        "name": full_path,
        "id": entry.get("id"),
        "updated_at": entry.get("updated_at"),
        "created_at": entry.get("created_at"),
        "size": size,
        "mimetype": meta.get("mimetype") or "application/octet-stream",
    }


def _list_prefix_page(
    base: str,
    bucket: str,
    headers: dict[str, str],
    *,
    prefix: str,
    offset: int,
    limit: int,
) -> list[Any]:
    api_prefix = _list_api_prefix(prefix)
    payload = json.dumps(
        {"prefix": api_prefix, "limit": limit, "offset": offset}
    ).encode("utf-8")
    url = f"{base}/storage/v1/object/list/{quote(bucket)}"
    status, data = _request(
        "POST", url, headers, payload, phase="object-list", bucket=bucket
    )
    if status != 200:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-list",
            http=status,
            bucket=_safe_bucket(bucket),
            kind="HTTPError",
        )
    page = _decode_json(data, phase="object-list", bucket=bucket)
    if not isinstance(page, list):
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-list",
            bucket=_safe_bucket(bucket),
            kind="ValueError",
        )
    return page


def _traverse_prefix(
    base: str,
    bucket: str,
    headers: dict[str, str],
    *,
    prefix: str,
    depth: int,
    visited: set[str],
) -> list[dict[str, Any]]:
    """Recursively inventory objects under one prefix. Never downloads prefixes."""
    if depth > MAX_PREFIX_DEPTH:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-list",
            bucket=_safe_bucket(bucket),
            kind="RuntimeError",
        )
    key = _normalize_prefix_key(prefix)
    if key in visited:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-list",
            bucket=_safe_bucket(bucket),
            kind="RuntimeError",
        )
    visited.add(key)

    objects: list[dict[str, Any]] = []
    child_prefixes: list[str] = []
    seen_names: set[str] = set()
    offset = 0
    limit = LIST_PAGE_LIMIT

    while True:
        page = _list_prefix_page(
            base, bucket, headers, prefix=prefix, offset=offset, limit=limit
        )
        if not page:
            break
        for item in page:
            kind = is_prefix_entry(item)
            if kind is None:
                emit_parent_stop(
                    STOP_STORAGE_EXPORT_INCOMPLETE,
                    phase="object-list",
                    bucket=_safe_bucket(bucket),
                    kind="RuntimeError",
                )
            assert isinstance(item, dict)
            raw_name = str(item["name"]).rstrip("/")
            try:
                full = join_storage_path(prefix, raw_name)
            except ValueError:
                emit_parent_stop(
                    STOP_STORAGE_EXPORT_INCOMPLETE,
                    phase="object-list",
                    bucket=_safe_bucket(bucket),
                    kind="ValueError",
                )
            if full in seen_names:
                emit_parent_stop(
                    STOP_STORAGE_EXPORT_INCOMPLETE,
                    phase="object-list",
                    bucket=_safe_bucket(bucket),
                    kind="RuntimeError",
                )
            seen_names.add(full)
            if kind is True:
                child_prefixes.append(full)
            else:
                objects.append(
                    _object_from_entry(item, full_path=full, bucket=bucket)
                )
        if len(page) < limit:
            break
        offset += limit
        if offset > LIST_OFFSET_HARD_CAP:
            emit_parent_stop(
                STOP_STORAGE_EXPORT_INCOMPLETE,
                phase="object-list",
                bucket=_safe_bucket(bucket),
                kind="RuntimeError",
            )

    # Deterministic recursion order (never emit names on failure).
    for child in sorted(child_prefixes):
        objects.extend(
            _traverse_prefix(
                base,
                bucket,
                headers,
                prefix=child,
                depth=depth + 1,
                visited=visited,
            )
        )
    return objects


def list_bucket(base: str, bucket: str, headers: dict[str, str]) -> list[dict[str, Any]]:
    """Inventory all downloadable objects in a bucket (flat remote paths)."""
    if bucket not in BUCKET_ALLOWLIST:
        emit_parent_stop(STOP_UNKNOWN_STORAGE_BUCKET, phase="object-list")
    objs = _traverse_prefix(
        base,
        bucket,
        headers,
        prefix="",
        depth=0,
        visited=set(),
    )
    # Deterministic inventory order for drift compare.
    objs.sort(key=lambda o: o["name"])
    return objs


def validate_remote_object_path(object_name: str) -> str:
    """Validate a fully-qualified remote object path. Raises ValueError on abuse."""
    if not isinstance(object_name, str) or not object_name:
        raise ValueError("empty")
    if "\x00" in object_name:
        raise ValueError("nul")
    if "\\" in object_name:
        raise ValueError("backslash")
    if object_name.startswith(("/", "\\")) or object_name.startswith("//"):
        raise ValueError("absolute")
    if len(object_name) >= 2 and object_name[1] == ":":
        raise ValueError("drive")
    normalized = object_name.replace("\\", "/")
    segments = normalized.split("/")
    if any(seg in ("", ".", "..") for seg in segments):
        raise ValueError("segment")
    if normalized.endswith("/"):
        raise ValueError("prefix_path")
    return normalized


def assert_dest_under_bucket_root(dest: Path, bucket_root: Path) -> None:
    """Ensure local write target stays under the bucket output directory."""
    try:
        dest_res = dest.resolve()
        root_res = bucket_root.resolve()
        dest_res.relative_to(root_res)
    except (OSError, ValueError):
        raise ValueError("path_escape")


def download_object(
    base: str,
    bucket: str,
    object_name: str,
    headers: dict[str, str],
    dest: Path,
    *,
    bucket_root: Path | None = None,
) -> dict[str, Any]:
    if bucket not in BUCKET_ALLOWLIST:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-download",
            kind="ValueError",
        )
    try:
        safe_name = validate_remote_object_path(object_name)
    except ValueError:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-download",
            bucket=_safe_bucket(bucket),
            kind="ValueError",
        )
    if bucket_root is not None:
        try:
            assert_dest_under_bucket_root(dest, bucket_root)
        except ValueError:
            emit_parent_stop(
                STOP_STORAGE_EXPORT_INCOMPLETE,
                phase="object-download",
                bucket=_safe_bucket(bucket),
                kind="ValueError",
            )
    # Encode once; keep path separators as '/'.
    url = f"{base}/storage/v1/object/{quote(bucket)}/{quote(safe_name, safe='/')}"
    dl_headers = {
        "Authorization": headers["Authorization"],
        "apikey": headers["apikey"],
    }
    req = urllib.request.Request(url, headers=dl_headers, method="GET")
    ctx = ssl.create_default_context()
    try:
        dest.parent.mkdir(parents=True, exist_ok=True)
    except OSError:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-download",
            bucket=_safe_bucket(bucket),
            kind="OSError",
        )
    h = hashlib.sha256()
    size = 0
    try:
        with _urlopen(req, timeout=300, context=ctx) as resp:
            status = int(getattr(resp, "status", 200) or 200)
            if status != 200:
                emit_parent_stop(
                    STOP_STORAGE_EXPORT_INCOMPLETE,
                    phase="object-download",
                    http=status,
                    bucket=_safe_bucket(bucket),
                    kind="HTTPError",
                )
            try:
                with dest.open("wb") as wf:
                    while True:
                        chunk = resp.read(64 * 1024)
                        if not chunk:
                            break
                        wf.write(chunk)
                        h.update(chunk)
                        size += len(chunk)
            except OSError:
                emit_parent_stop(
                    STOP_STORAGE_EXPORT_INCOMPLETE,
                    phase="object-download",
                    bucket=_safe_bucket(bucket),
                    kind="OSError",
                )
    except urllib.error.HTTPError as exc:
        try:
            _ = exc.read() if hasattr(exc, "read") else b""
        except Exception:
            pass
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-download",
            http=int(exc.code) if getattr(exc, "code", None) else None,
            bucket=_safe_bucket(bucket),
            kind="HTTPError",
        )
    except (urllib.error.URLError, TimeoutError, ssl.SSLError) as exc:
        kind, http = _classify_exception(exc)
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-download",
            http=http,
            bucket=_safe_bucket(bucket),
            kind=kind,
        )
    return {
        "relpath_redacted": True,
        "encoded_name_sha256": hashlib.sha256(safe_name.encode("utf-8")).hexdigest(),
        "size": size,
        "sha256": h.hexdigest(),
        "mime_guess": "application/octet-stream",
    }


def _run_export(project_ref: str, out_dir: Path, inv_out: Path) -> int:
    if project_ref == KNOWN_STAGING_REF:
        emit_parent_stop(STOP_STAGING_TARGET, phase="startup")
    if project_ref != KNOWN_PRODUCTION_REF:
        emit_parent_stop(STOP_WRONG_PROJECT, phase="startup")

    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not service_key:
        emit_parent_stop(STOP_STORAGE_CREDENTIAL_MISSING, phase="startup")

    base = f"https://{project_ref}.supabase.co"
    if KNOWN_STAGING_REF in base:
        emit_parent_stop(STOP_STAGING_TARGET, phase="startup")

    headers = _headers(service_key)
    status, data = _request(
        "GET", f"{base}/storage/v1/bucket", headers, phase="bucket-list"
    )
    if status != 200:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="bucket-list",
            http=status,
            kind="HTTPError",
        )
    buckets = _decode_json(data, phase="bucket-list")
    if not isinstance(buckets, list):
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="bucket-list",
            kind="ValueError",
        )
    names = [b.get("name") for b in buckets if isinstance(b, dict)]
    for n in names:
        if n and n not in BUCKET_ALLOWLIST:
            # Do not emit the unknown bucket name.
            emit_parent_stop(STOP_UNKNOWN_STORAGE_BUCKET, phase="bucket-list")

    start: dict[str, Any] = {}
    end: dict[str, Any] = {}
    components: list[dict[str, Any]] = []
    for bucket in BUCKET_ALLOWLIST:
        objs = list_bucket(base, bucket, headers)
        start[bucket] = {
            "object_count": len(objs),
            "total_bytes": sum(int(o.get("size") or 0) for o in objs),
            "names_sha256": [
                hashlib.sha256(o["name"].encode()).hexdigest() for o in objs
            ],
        }
        exported = []
        bdir = out_dir / bucket
        try:
            bdir.mkdir(parents=True, exist_ok=True)
        except OSError:
            emit_parent_stop(
                STOP_STORAGE_EXPORT_INCOMPLETE,
                phase="object-download",
                bucket=_safe_bucket(bucket),
                kind="OSError",
            )
        for o in objs:
            local_name = hashlib.sha256(o["name"].encode()).hexdigest() + ".bin"
            dest = bdir / local_name
            meta = download_object(
                base, bucket, o["name"], headers, dest, bucket_root=bdir
            )
            meta["source_name_sha256"] = hashlib.sha256(o["name"].encode()).hexdigest()
            meta["mimetype"] = o.get("mimetype")
            exported.append(meta)
        end[bucket] = {
            "object_count": len(exported),
            "total_bytes": sum(e["size"] for e in exported),
            "names_sha256": start[bucket]["names_sha256"],
        }
        if start[bucket]["object_count"] != end[bucket]["object_count"]:
            emit_parent_stop(
                STOP_INVENTORY_CHANGED_DURING_EXPORT,
                phase="inventory-compare",
                bucket=_safe_bucket(bucket),
            )
        components.append(
            {"bucket": bucket, "object_count": len(exported), "objects": exported}
        )

    for bucket in BUCKET_ALLOWLIST:
        objs2 = list_bucket(base, bucket, headers)
        end_names = [hashlib.sha256(o["name"].encode()).hexdigest() for o in objs2]
        if end_names != start[bucket]["names_sha256"]:
            emit_parent_stop(
                STOP_INVENTORY_CHANGED_DURING_EXPORT,
                phase="inventory-compare",
                bucket=_safe_bucket(bucket),
            )
        if len(objs2) != start[bucket]["object_count"]:
            emit_parent_stop(
                STOP_INVENTORY_CHANGED_DURING_EXPORT,
                phase="inventory-compare",
                bucket=_safe_bucket(bucket),
            )

    inv = {
        "start_inventory": {
            k: {"object_count": v["object_count"], "total_bytes": v["total_bytes"]}
            for k, v in start.items()
        },
        "end_inventory": {
            k: {"object_count": v["object_count"], "total_bytes": v["total_bytes"]}
            for k, v in end.items()
        },
        "storage_components": [
            {"bucket": c["bucket"], "object_count": c["object_count"]} for c in components
        ],
        "object_digests": {c["bucket"]: c["objects"] for c in components},
        "capabilities": {"list": True, "download": True, "upload": False, "delete": False},
    }
    try:
        inv_out.parent.mkdir(parents=True, exist_ok=True)
        inv_out.write_text(json.dumps(inv, indent=2) + "\n", encoding="utf-8")
    except OSError:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="inventory-write",
            kind="OSError",
        )
    print(json.dumps({"ok": True, "buckets": list(BUCKET_ALLOWLIST)}))
    return 0


def main(argv: list[str] | None = None) -> int:
    """CLI entry. argv defaults to sys.argv[1:] (project-ref, out-dir, inv-out)."""
    args = list(sys.argv[1:] if argv is None else argv)
    try:
        if os.environ.get("BOUNDLORE_LIVE_NETWORK_ARMED") != "1":
            emit_parent_stop(STOP_LIVE_NETWORK_RESERVED, phase="startup")
        if len(args) < 3:
            emit_parent_stop(
                STOP_STORAGE_EXPORT_INCOMPLETE,
                phase="startup",
                kind="ValueError",
            )
        project_ref = args[0]
        out_dir = Path(args[1])
        inv_out = Path(args[2])
        return _run_export(project_ref, out_dir, inv_out)
    except SystemExit:
        raise
    except StorageStop as stop:
        emit_parent_stop(
            stop.code,
            phase=stop.phase,
            http=stop.http,
            bucket=stop.bucket,
            kind=stop.kind,
        )
    except Exception as exc:
        kind, http = _classify_exception(exc)
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="child-exception",
            http=http,
            kind=kind,
        )
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
