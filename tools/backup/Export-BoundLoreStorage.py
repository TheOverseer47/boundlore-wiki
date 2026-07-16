#!/usr/bin/env python3
"""Export BoundLore storage objects (synthetic / offline by default)."""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "_lib"))

from package_lib import (  # noqa: E402
    ensure_package_dirs,
    new_backup_id,
    prepare_output_dir,
    sha256_file,
    write_json,
)
from stop_codes import (  # noqa: E402
    BUCKET_ALLOWLIST,
    STOP_NETWORK_FORBIDDEN,
    STOP_STORAGE_INVENTORY_MISMATCH,
    STOP_UNKNOWN_BUCKET,
    assert_no_network,
    assert_project_ref,
)


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Export BoundLore storage (safe defaults)")
    p.add_argument("--output-directory", required=True)
    p.add_argument("--working-directory", default="")
    p.add_argument("--backup-id", default="")
    p.add_argument("--synthetic", action="store_true", default=True)
    p.add_argument("--no-synthetic", action="store_true")
    p.add_argument("--no-network", action="store_true", default=True)
    p.add_argument("--allow-network", action="store_true")
    p.add_argument("--dry-run", action="store_true", default=True)
    p.add_argument("--no-dry-run", action="store_true")
    p.add_argument("--project-ref", default="")
    p.add_argument("--allow-production-read", action="store_true")
    p.add_argument("--source-root", default="", help="Synthetic source tree")
    return p.parse_args()


def write_synthetic_sources(src_root: Path) -> dict[str, int]:
    counts = {}
    for bucket in BUCKET_ALLOWLIST:
        bdir = src_root / bucket
        bdir.mkdir(parents=True, exist_ok=True)
        # Harmless fake objects — no real names/UUIDs/content.
        for i, name in enumerate(("sample-a.bin", "sample-b.txt"), start=1):
            path = bdir / name
            if name.endswith(".txt"):
                path.write_text(f"synthetic-{bucket}-{i}\n", encoding="utf-8")
            else:
                path.write_bytes(bytes([i, i + 1, i + 2, 0xAB, 0xCD]))
        counts[bucket] = 2
    return counts


def export_tree(src_root: Path, dest_storage: Path) -> list[dict]:
    components = []
    for bucket in BUCKET_ALLOWLIST:
        src = src_root / bucket
        if not src.is_dir():
            raise SystemExit(f"{STOP_STORAGE_INVENTORY_MISMATCH}: missing {bucket}")
        dst = dest_storage / bucket
        dst.mkdir(parents=True, exist_ok=True)
        objects = []
        for path in sorted(src.rglob("*")):
            if not path.is_file():
                continue
            rel = path.relative_to(src)
            target = dst / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            # Stream copy
            h = hashlib.sha256()
            with path.open("rb") as rf, target.open("wb") as wf:
                while True:
                    chunk = rf.read(1024 * 64)
                    if not chunk:
                        break
                    wf.write(chunk)
                    h.update(chunk)
            objects.append(
                {
                    "relpath_redacted": True,
                    "size": target.stat().st_size,
                    "sha256": h.hexdigest(),
                    "mime_guess": "application/octet-stream"
                    if target.suffix == ".bin"
                    else "text/plain",
                }
            )
        components.append({"bucket": bucket, "object_count": len(objects), "objects": objects})
    return components


def main() -> int:
    args = parse_args()
    synthetic = not args.no_synthetic
    no_network = not args.allow_network
    dry_run = not args.no_dry_run

    assert_no_network(no_network, attempting_external=False)
    if not synthetic:
        # Live export is designed but not authorized in this gate.
        assert_project_ref(args.project_ref or None, allow_production_read=args.allow_production_read)
        if no_network:
            raise SystemExit(f"{STOP_NETWORK_FORBIDDEN}: live storage export requires network authorization")
        raise SystemExit("STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED: live storage export not enabled in this phase")

    out = prepare_output_dir(Path(args.output_directory))
    backup_id = args.backup_id or new_backup_id()
    root = out / backup_id
    if dry_run:
        print(json.dumps({"dry_run": True, "backup_id": backup_id, "buckets": list(BUCKET_ALLOWLIST)}, indent=2))
        return 0

    ensure_package_dirs(root)
    work = Path(args.working_directory) if args.working_directory else (out / f"{backup_id}-work")
    work = prepare_output_dir(work)
    src_root = Path(args.source_root) if args.source_root else (work / "synthetic-storage-src")
    if not args.source_root:
        write_synthetic_sources(src_root)

    # Reject unknown buckets under source root.
    for child in src_root.iterdir() if src_root.exists() else []:
        if child.is_dir() and child.name not in BUCKET_ALLOWLIST:
            raise SystemExit(f"{STOP_UNKNOWN_BUCKET}: {child.name}")

    components = export_tree(src_root, root / "storage")
    inventory = {
        "database_components": [],
        "storage_components": [
            {"bucket": c["bucket"], "object_count": c["object_count"]} for c in components
        ],
        "file_count": sum(c["object_count"] for c in components),
        "encrypted_size": 0,
        "tool_versions": {"storage_export": "1.0.0", "python_hashlib": "stdlib"},
        "storage_detail_redacted": True,
    }
    inv_path = root / "evidence" / "storage-inventory.json"
    write_json(inv_path, inventory)
    # Per-object digests kept in evidence only (no object names).
    write_json(
        root / "evidence" / "storage-object-digests.json",
        {"algorithm": "sha256", "buckets": {c["bucket"]: c["objects"] for c in components}},
    )
    print(json.dumps({"ok": True, "backup_id": backup_id, "inventory": str(inv_path)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
