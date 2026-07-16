#!/usr/bin/env python3
"""Validate / exercise BoundLore backup packaging offline with synthetic data."""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
sys.path.insert(0, str(ROOT / "_lib"))

from package_lib import (  # noqa: E402
    build_manifest,
    copy_tree,
    ensure_package_dirs,
    new_backup_id,
    prepare_output_dir,
    scan_tree_for_secrets,
    sha256_file,
    total_size,
    validate_manifest,
    verify_checksum_sidecar,
    write_checksum_sidecar,
    write_json,
)
from stop_codes import (  # noqa: E402
    BUCKET_ALLOWLIST,
    STOP_ENCRYPTION_UNAVAILABLE,
    STOP_NETWORK_FORBIDDEN,
    assert_no_network,
)


def run_py(script: str, args: list[str]) -> None:
    cmd = [sys.executable, str(ROOT / script), *args]
    subprocess.check_call(cmd)


def detect_age() -> str | None:
    from shutil import which

    return which("age")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-temp", action="store_true")
    args = parser.parse_args()

    assert_no_network(True, attempting_external=False)
    tmp = Path(tempfile.mkdtemp(prefix="boundlore-backup-synth-"))
    try:
        prepare_output_dir(tmp)
        backup_id = new_backup_id()
        out = tmp / "out"
        work = tmp / "work"
        out.mkdir()
        work.mkdir()

        # 1-2 synthetic storage export (writes package)
        run_py(
            "Export-BoundLoreStorage.py",
            [
                "--output-directory",
                str(out),
                "--working-directory",
                str(work),
                "--backup-id",
                backup_id,
                "--synthetic",
                "--no-network",
                "--no-dry-run",
            ],
        )
        root = out / backup_id
        assert root.is_dir()

        # Synthetic database placeholders (no live pg_dump)
        db = root / "database"
        (db / "roles.sql").write_text("-- synthetic roles placeholder\n", encoding="utf-8")
        (db / "schema.dump").write_bytes(b"SYNTHETIC_SCHEMA")
        (db / "data.dump").write_bytes(b"SYNTHETIC_DATA")
        for name in ("roles.sql", "schema.dump", "data.dump"):
            write_checksum_sidecar(db / name)

        # Configuration inventories (redacted / fake)
        cfg = root / "configuration"
        write_json(
            cfg / "supabase-inventory.json",
            {
                "source_type": "synthetic",
                "note": "no project ref in public package path; encrypted later",
                "extensions": ["placeholder"],
            },
        )
        write_json(cfg / "cloudflare-inventory.json", {"project": "placeholder", "branch": "main"})
        write_json(cfg / "github-inventory.json", {"repo": "placeholder/local-only"})

        storage_components = [{"bucket": b, "object_count": 2} for b in BUCKET_ALLOWLIST]
        files = [p for p in root.rglob("*") if p.is_file()]
        inv = {
            "database_components": ["roles", "schema", "data"],
            "storage_components": storage_components,
            "file_count": len(files),
            "encrypted_size": 0,
            "tool_versions": {
                "test_harness": "1.0.0",
                "python": f"{sys.version_info.major}.{sys.version_info.minor}",
            },
        }
        inv_path = root / "evidence" / "package-inventory.json"
        write_json(inv_path, inv)

        # Manifest
        run_py(
            "New-BoundLoreBackupManifest.py",
            [
                "--output-directory",
                str(out),
                "--backup-id",
                backup_id,
                "--source-type",
                "synthetic",
                "--encryption-method",
                "none-pending-tool",
                "--validation-status",
                "synthetic_packaged",
                "--inventory-json",
                str(inv_path),
                "--no-dry-run",
            ],
        )
        manifest_path = root / "manifest.json"
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        validate_manifest(manifest)
        verify_checksum_sidecar(manifest_path)

        # Encryption: real age if present; otherwise mark unavailable (fail-closed for live)
        age = detect_age()
        enc_method = "none-pending-tool"
        if age:
            # Would encrypt selected files with recipient; not exercised without keys here.
            enc_method = "age-detected-but-no-recipient-in-synthetic"
        else:
            # Create opaque .enc placeholders for transfer simulation only.
            for rel in ("database/roles.sql", "database/schema.dump", "database/data.dump"):
                src = root / rel
                enc = Path(str(src) + ".enc")
                enc.write_bytes(sha256_file(src).encode("ascii") + b"|" + src.read_bytes())
                write_checksum_sidecar(enc)
            enc_method = "synthetic-opaque-placeholder"
            print(f"[warn] {STOP_ENCRYPTION_UNAVAILABLE}: age not installed; using opaque placeholders for mock only")

        # Mock upload/download via filesystem (no network)
        remote = tmp / "mock-wasabi" / "prefix" / backup_id
        remote.parent.mkdir(parents=True, exist_ok=True)
        copied = copy_tree(root, remote)
        assert copied > 0
        restored = tmp / "restore" / backup_id
        restored.parent.mkdir(parents=True, exist_ok=True)
        copy_tree(remote, restored)
        # Hash check sample
        for sample in ("manifest.json", "database/data.dump"):
            a = sha256_file(root / sample)
            b = sha256_file(restored / sample)
            if a != b:
                raise SystemExit("STOP_CHECKSUM_FAILED: mock roundtrip mismatch")

        secrets = scan_tree_for_secrets(root)
        if secrets:
            raise SystemExit(f"secrets detected in synthetic package: {secrets}")

        # Network forbidden probe: attempting external must fail helper
        try:
            assert_no_network(True, attempting_external=True)
            raise SystemExit("expected network forbid failure")
        except SystemExit as exc:
            if STOP_NETWORK_FORBIDDEN not in str(exc):
                raise

        summary = {
            "backup_id": backup_id,
            "file_count": len(files),
            "bytes": total_size(files),
            "encryption_method": enc_method,
            "mock_upload_files": copied,
            "external_requests": 0,
            "wasabi_requests": 0,
            "supabase_requests": 0,
            "validation_status": "PASS_SYNTHETIC_DRY_RUN",
        }
        write_json(root / "evidence" / "backup-summary.json", summary)
        print(json.dumps(summary, indent=2))
        return 0
    finally:
        if not args.keep_temp:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
