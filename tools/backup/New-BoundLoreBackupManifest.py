#!/usr/bin/env python3
"""Create a BoundLore backup manifest (public-safe fields only)."""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "_lib"))

from package_lib import (  # noqa: E402
    build_manifest,
    new_backup_id,
    prepare_output_dir,
    write_checksum_sidecar,
    write_json,
)
from stop_codes import STOP_MANIFEST_INCOMPLETE  # noqa: E402


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Create BoundLore backup manifest")
    p.add_argument("--output-directory", required=True)
    p.add_argument("--backup-id", default="")
    p.add_argument("--source-type", default="synthetic")
    p.add_argument("--encryption-method", default="none-pending-tool")
    p.add_argument("--validation-status", default="manifest_created")
    p.add_argument("--dry-run", action="store_true", default=True)
    p.add_argument("--no-dry-run", action="store_true")
    p.add_argument("--inventory-json", default="", help="Optional inventory JSON path")
    return p.parse_args()


def main() -> int:
    args = parse_args()
    dry_run = not args.no_dry_run
    out = prepare_output_dir(Path(args.output_directory))
    backup_id = args.backup_id or new_backup_id()
    inventory = {
        "database_components": ["roles", "schema", "data"],
        "storage_components": [
            {"bucket": "avatars", "object_count": 0},
            {"bucket": "discovery-uploads", "object_count": 0},
            {"bucket": "report-screenshots", "object_count": 0},
        ],
        "file_count": 0,
        "encrypted_size": 0,
        "tool_versions": {"manifest": "1.0.0"},
    }
    if args.inventory_json:
        inv_path = Path(args.inventory_json)
        if not inv_path.is_file():
            raise SystemExit(f"{STOP_MANIFEST_INCOMPLETE}: inventory missing")
        inventory.update(json.loads(inv_path.read_text(encoding="utf-8")))

    manifest = build_manifest(
        backup_id=backup_id,
        source_type=args.source_type,
        database_components=list(inventory["database_components"]),
        storage_components=list(inventory["storage_components"]),
        file_count=int(inventory.get("file_count", 0)),
        encrypted_size=int(inventory.get("encrypted_size", 0)),
        encryption_method=args.encryption_method,
        tool_versions=dict(inventory.get("tool_versions", {})),
        validation_status=args.validation_status,
    )

    if dry_run:
        print(json.dumps({"dry_run": True, "backup_id": backup_id, "manifest": manifest}, indent=2))
        return 0

    target = out / backup_id / "manifest.json"
    target.parent.mkdir(parents=True, exist_ok=True)
    write_json(target, manifest)
    write_checksum_sidecar(target)
    print(json.dumps({"ok": True, "manifest": str(target)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
