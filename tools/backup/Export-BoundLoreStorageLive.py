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


def list_bucket(base: str, bucket: str, headers: dict[str, str]) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    offset = 0
    limit = 100
    while True:
        payload = json.dumps({"prefix": "", "limit": limit, "offset": offset}).encode("utf-8")
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
        if not page:
            break
        for item in page:
            if not isinstance(item, dict):
                continue
            name = item.get("name")
            if not name or str(name).endswith("/"):
                if name and str(name).endswith("/"):
                    objects.extend(_list_prefix(base, bucket, headers, str(name)))
                continue
            meta = item.get("metadata") or {}
            try:
                size = (
                    int(meta.get("size") or 0)
                    if isinstance(meta, dict)
                    else 0
                )
            except (TypeError, ValueError):
                emit_parent_stop(
                    STOP_STORAGE_EXPORT_INCOMPLETE,
                    phase="object-list",
                    bucket=_safe_bucket(bucket),
                    kind="ValueError",
                )
            objects.append(
                {
                    "name": str(name),
                    "id": item.get("id"),
                    "updated_at": item.get("updated_at"),
                    "created_at": item.get("created_at"),
                    "size": size,
                    "mimetype": (meta.get("mimetype") if isinstance(meta, dict) else None)
                    or "application/octet-stream",
                }
            )
        if len(page) < limit:
            break
        offset += limit
        if offset > 100000:
            emit_parent_stop(
                STOP_STORAGE_EXPORT_INCOMPLETE,
                phase="object-list",
                bucket=_safe_bucket(bucket),
                kind="RuntimeError",
            )
    return objects


def _list_prefix(
    base: str, bucket: str, headers: dict[str, str], prefix: str
) -> list[dict[str, Any]]:
    objects: list[dict[str, Any]] = []
    offset = 0
    limit = 100
    while True:
        payload = json.dumps({"prefix": prefix, "limit": limit, "offset": offset}).encode("utf-8")
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
        if not isinstance(page, list) or not page:
            break
        for item in page:
            if not isinstance(item, dict):
                continue
            name = item.get("name")
            if not name:
                continue
            full = prefix + str(name) if not str(name).startswith(prefix) else str(name)
            if full.endswith("/"):
                objects.extend(_list_prefix(base, bucket, headers, full))
                continue
            meta = item.get("metadata") or {}
            try:
                size = int(meta.get("size") or 0) if isinstance(meta, dict) else 0
            except (TypeError, ValueError):
                emit_parent_stop(
                    STOP_STORAGE_EXPORT_INCOMPLETE,
                    phase="object-list",
                    bucket=_safe_bucket(bucket),
                    kind="ValueError",
                )
            objects.append(
                {
                    "name": full,
                    "updated_at": item.get("updated_at"),
                    "created_at": item.get("created_at"),
                    "size": size,
                    "mimetype": (meta.get("mimetype") if isinstance(meta, dict) else None)
                    or "application/octet-stream",
                }
            )
        if len(page) < limit:
            break
        offset += limit
    return objects


def download_object(
    base: str, bucket: str, object_name: str, headers: dict[str, str], dest: Path
) -> dict[str, Any]:
    normalized = object_name.replace("\\", "/")
    if ".." in normalized.split("/") or object_name.startswith(("/", "\\")):
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-download",
            bucket=_safe_bucket(bucket),
            kind="ValueError",
        )
    if ":" in Path(object_name).name:
        emit_parent_stop(
            STOP_STORAGE_EXPORT_INCOMPLETE,
            phase="object-download",
            bucket=_safe_bucket(bucket),
            kind="ValueError",
        )
    url = f"{base}/storage/v1/object/{quote(bucket)}/{quote(object_name, safe='/')}"
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
        "encoded_name_sha256": hashlib.sha256(object_name.encode("utf-8")).hexdigest(),
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
            meta = download_object(base, bucket, o["name"], headers, bdir / local_name)
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
