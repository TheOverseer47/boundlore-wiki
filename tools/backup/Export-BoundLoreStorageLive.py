#!/usr/bin/env python3
"""Live read-only Supabase Storage export (armed only via BOUNDLORE_LIVE_NETWORK_ARMED=1).

Uses stdlib only. Allowed: list + download. Forbidden: upload/update/delete.
Errors are redacted: phase + HTTP status + allowlisted bucket only — never object paths,
Authorization/apikey headers, JWTs, or response bodies.
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
from typing import Any
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "_lib"))

from stop_codes import (  # noqa: E402
    BUCKET_ALLOWLIST,
    KNOWN_PRODUCTION_REF,
    KNOWN_STAGING_REF,
    STOP_INVENTORY_CHANGED_DURING_EXPORT,
    STOP_STORAGE_EXPORT_INCOMPLETE,
    STOP_UNKNOWN_STORAGE_BUCKET,
)


def _require_armed() -> None:
    if os.environ.get("BOUNDLORE_LIVE_NETWORK_ARMED") != "1":
        raise SystemExit("STOP_LIVE_NETWORK_RESERVED: storage live export not armed")


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
) -> tuple[int, bytes]:
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return resp.status, resp.read()
    except urllib.error.HTTPError as exc:
        # Discard response body — never surface payloads in diagnostics.
        try:
            _ = exc.read() if hasattr(exc, "read") else b""
        except Exception:
            pass
        return exc.code, b""


def list_bucket(base: str, bucket: str, headers: dict[str, str]) -> list[dict[str, Any]]:
    """Paginated list via storage object/list (POST body is list-only: prefix/limit/offset)."""
    objects: list[dict[str, Any]] = []
    offset = 0
    limit = 100
    while True:
        payload = json.dumps({"prefix": "", "limit": limit, "offset": offset}).encode("utf-8")
        url = f"{base}/storage/v1/object/list/{quote(bucket)}"
        status, data = _request("POST", url, headers, payload)
        if status != 200:
            raise SystemExit(
                f"{STOP_STORAGE_EXPORT_INCOMPLETE}: object-list HTTP {status} bucket={bucket}"
            )
        page = json.loads(data.decode("utf-8") or "[]")
        if not isinstance(page, list):
            raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: unexpected list payload")
        if not page:
            break
        for item in page:
            name = item.get("name")
            if not name or str(name).endswith("/"):
                # Skip folder placeholders; recurse via prefix if needed.
                if name and str(name).endswith("/"):
                    # Flatten: list with prefix
                    sub = _list_prefix(base, bucket, headers, str(name))
                    objects.extend(sub)
                continue
            meta = item.get("metadata") or {}
            objects.append(
                {
                    "name": str(name),
                    "id": item.get("id"),
                    "updated_at": item.get("updated_at"),
                    "created_at": item.get("created_at"),
                    "size": int(meta.get("size") or item.get("metadata", {}).get("size") or 0)
                    if isinstance(meta, dict)
                    else 0,
                    "mimetype": (meta.get("mimetype") if isinstance(meta, dict) else None)
                    or "application/octet-stream",
                }
            )
        if len(page) < limit:
            break
        offset += limit
        if offset > 100000:
            raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: list pagination overflow")
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
        status, data = _request("POST", url, headers, payload)
        if status != 200:
            raise SystemExit(
                f"{STOP_STORAGE_EXPORT_INCOMPLETE}: object-list HTTP {status} bucket={bucket}"
            )
        page = json.loads(data.decode("utf-8") or "[]")
        if not page:
            break
        for item in page:
            name = item.get("name")
            if not name:
                continue
            full = prefix + str(name) if not str(name).startswith(prefix) else str(name)
            if full.endswith("/"):
                objects.extend(_list_prefix(base, bucket, headers, full))
                continue
            meta = item.get("metadata") or {}
            objects.append(
                {
                    "name": full,
                    "updated_at": item.get("updated_at"),
                    "created_at": item.get("created_at"),
                    "size": int(meta.get("size") or 0) if isinstance(meta, dict) else 0,
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
    # Path safety
    normalized = object_name.replace("\\", "/")
    if ".." in normalized.split("/") or object_name.startswith(("/", "\\")):
        raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: unsafe object path")
    if ":" in Path(object_name).name:
        raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: alternate stream rejected")
    url = f"{base}/storage/v1/object/{quote(bucket)}/{quote(object_name, safe='/')}"
    dl_headers = {
        "Authorization": headers["Authorization"],
        "apikey": headers["apikey"],
    }
    req = urllib.request.Request(url, headers=dl_headers, method="GET")
    ctx = ssl.create_default_context()
    dest.parent.mkdir(parents=True, exist_ok=True)
    h = hashlib.sha256()
    size = 0
    try:
        with urllib.request.urlopen(req, timeout=300, context=ctx) as resp:
            if getattr(resp, "status", 200) != 200:
                raise SystemExit(
                    f"{STOP_STORAGE_EXPORT_INCOMPLETE}: object-download HTTP {resp.status} bucket={bucket}"
                )
            with dest.open("wb") as wf:
                while True:
                    chunk = resp.read(64 * 1024)
                    if not chunk:
                        break
                    wf.write(chunk)
                    h.update(chunk)
                    size += len(chunk)
    except urllib.error.HTTPError as exc:
        raise SystemExit(
            f"{STOP_STORAGE_EXPORT_INCOMPLETE}: object-download HTTP {exc.code} bucket={bucket}"
        ) from None
    return {
        "relpath_redacted": True,
        "encoded_name_sha256": hashlib.sha256(object_name.encode("utf-8")).hexdigest(),
        "size": size,
        "sha256": h.hexdigest(),
        "mime_guess": "application/octet-stream",
    }


def _run_export(project_ref: str, out_dir: Path, inv_out: Path) -> int:
    if project_ref == KNOWN_STAGING_REF:
        raise SystemExit("STOP_STAGING_TARGET: staging ref forbidden")
    if project_ref != KNOWN_PRODUCTION_REF:
        raise SystemExit("STOP_WRONG_PROJECT: unexpected project ref")

    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not service_key:
        raise SystemExit("STOP_STORAGE_CREDENTIAL_MISSING: service key env missing")

    base = f"https://{project_ref}.supabase.co"
    if KNOWN_STAGING_REF in base:
        raise SystemExit("STOP_STAGING_TARGET: staging in storage URL")

    headers = _headers(service_key)
    # List buckets (GET)
    status, data = _request("GET", f"{base}/storage/v1/bucket", headers)
    if status != 200:
        raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: bucket-list HTTP {status}")
    buckets = json.loads(data.decode("utf-8"))
    names = [b.get("name") for b in buckets if isinstance(b, dict)]
    for n in names:
        if n and n not in BUCKET_ALLOWLIST:
            # Ignore known supabase internal if any; stop on unexpected app buckets
            if n not in ("avatars", "discovery-uploads", "report-screenshots"):
                # Only allowlist may be exported; extra buckets stop
                raise SystemExit(f"{STOP_UNKNOWN_STORAGE_BUCKET}: {n}")

    start: dict[str, Any] = {}
    end: dict[str, Any] = {}
    components = []
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
        bdir.mkdir(parents=True, exist_ok=True)
        for o in objs:
            # Encoded local path from hash to avoid leaking object paths on disk logs
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
            raise SystemExit(f"{STOP_INVENTORY_CHANGED_DURING_EXPORT}: count drift {bucket}")
        components.append(
            {"bucket": bucket, "object_count": len(exported), "objects": exported}
        )

    # Re-list end inventory
    for bucket in BUCKET_ALLOWLIST:
        objs2 = list_bucket(base, bucket, headers)
        end_names = [hashlib.sha256(o["name"].encode()).hexdigest() for o in objs2]
        if end_names != start[bucket]["names_sha256"]:
            raise SystemExit(f"{STOP_INVENTORY_CHANGED_DURING_EXPORT}: name set drift {bucket}")
        if len(objs2) != start[bucket]["object_count"]:
            raise SystemExit(f"{STOP_INVENTORY_CHANGED_DURING_EXPORT}: recount {bucket}")

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
    inv_out.parent.mkdir(parents=True, exist_ok=True)
    inv_out.write_text(json.dumps(inv, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": True, "buckets": list(BUCKET_ALLOWLIST), "inventory": str(inv_out)}))
    return 0


def main() -> int:
    _require_armed()
    if len(sys.argv) < 4:
        raise SystemExit(
            "usage: Export-BoundLoreStorageLive.py <project-ref> <output-storage-dir> <inventory-json-out>"
        )
    project_ref = sys.argv[1]
    out_dir = Path(sys.argv[2])
    inv_out = Path(sys.argv[3])
    try:
        return _run_export(project_ref, out_dir, inv_out)
    except SystemExit:
        raise
    except urllib.error.URLError:
        raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: network URLError") from None
    except TimeoutError:
        raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: network timeout") from None
    except ssl.SSLError:
        raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: SSL failure") from None
    except json.JSONDecodeError:
        raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: invalid JSON response") from None
    except OSError:
        raise SystemExit(f"{STOP_STORAGE_EXPORT_INCOMPLETE}: local filesystem error") from None
    except Exception:
        raise SystemExit(
            f"{STOP_STORAGE_EXPORT_INCOMPLETE}: unclassified storage child failure"
        ) from None


if __name__ == "__main__":
    raise SystemExit(main())
