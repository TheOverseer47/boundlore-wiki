"""BoundLore backup package helpers (stdlib only)."""
from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

from stop_codes import (
    BUCKET_ALLOWLIST,
    MANIFEST_REQUIRED_KEYS,
    STOP_CHECKSUM_FAILED,
    STOP_MANIFEST_INCOMPLETE,
    STOP_UNKNOWN_BUCKET,
    assert_output_outside_repo,
)

FORMAT_VERSION = "1.0.0"
CHECKSUM_ALG = "sha256"
SECRET_PATTERNS = [
    re.compile(r"service_role", re.I),
    re.compile(r"sb_secret_", re.I),
    re.compile(r"eyJ[A-Za-z0-9_-]{20,}\."),
    re.compile(r"postgres(ql)?://", re.I),
    re.compile(r"BEGIN (OPENSSH |RSA |EC )?PRIVATE KEY"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
]


def utc_now_stamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def new_backup_id(stamp: str | None = None) -> str:
    stamp = stamp or utc_now_stamp()
    return f"boundlore-backup-{stamp}"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        while True:
            chunk = fh.read(1024 * 1024)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def package_root(output_dir: Path, backup_id: str) -> Path:
    return output_dir / backup_id


def ensure_package_dirs(root: Path) -> None:
    for rel in (
        "database",
        "storage/avatars",
        "storage/discovery-uploads",
        "storage/report-screenshots",
        "configuration",
        "evidence",
    ):
        (root / rel).mkdir(parents=True, exist_ok=True)


def validate_bucket(name: str) -> None:
    if name not in BUCKET_ALLOWLIST:
        raise SystemExit(f"{STOP_UNKNOWN_BUCKET}: {name}")


def build_manifest(
    *,
    backup_id: str,
    source_type: str,
    database_components: list[str],
    storage_components: list[dict[str, Any]],
    file_count: int,
    encrypted_size: int,
    encryption_method: str,
    tool_versions: dict[str, str],
    validation_status: str,
    public_safe: bool = True,
) -> dict[str, Any]:
    manifest = {
        "format_version": FORMAT_VERSION,
        "backup_id": backup_id,
        "created_at_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "source_type": source_type,
        "database_components": database_components,
        "storage_components": storage_components,
        "file_count": file_count,
        "encrypted_size": encrypted_size,
        "checksum_algorithm": CHECKSUM_ALG,
        "encryption_method": encryption_method,
        "tool_versions": tool_versions,
        "release_gate_expected_locked": True,
        "validation_status": validation_status,
    }
    if public_safe:
        # Public manifests must not embed project refs or object paths.
        for sc in storage_components:
            sc.pop("object_paths", None)
            sc.pop("object_names", None)
    validate_manifest(manifest)
    return manifest


def validate_manifest(manifest: dict[str, Any]) -> None:
    missing = [k for k in MANIFEST_REQUIRED_KEYS if k not in manifest]
    if missing:
        raise SystemExit(f"{STOP_MANIFEST_INCOMPLETE}: missing {missing}")
    if manifest.get("checksum_algorithm") != CHECKSUM_ALG:
        raise SystemExit(f"{STOP_MANIFEST_INCOMPLETE}: unsupported checksum algorithm")
    if not isinstance(manifest.get("storage_components"), list):
        raise SystemExit(f"{STOP_MANIFEST_INCOMPLETE}: storage_components")
    for sc in manifest["storage_components"]:
        validate_bucket(str(sc.get("bucket", "")))


def write_checksum_sidecar(target: Path) -> Path:
    digest = sha256_file(target)
    side = Path(str(target) + ".sha256")
    side.write_text(f"{digest}  {target.name}\n", encoding="utf-8")
    return side


def verify_checksum_sidecar(target: Path) -> None:
    side = Path(str(target) + ".sha256")
    if not side.is_file():
        raise SystemExit(f"{STOP_CHECKSUM_FAILED}: missing {side.name}")
    line = side.read_text(encoding="utf-8").strip().split()
    if not line:
        raise SystemExit(f"{STOP_CHECKSUM_FAILED}: empty sidecar")
    expected = line[0]
    actual = sha256_file(target)
    if expected != actual:
        raise SystemExit(f"{STOP_CHECKSUM_FAILED}: mismatch for {target.name}")


def scan_text_for_secrets(text: str) -> list[str]:
    hits = []
    for pat in SECRET_PATTERNS:
        if pat.search(text):
            hits.append(pat.pattern)
    return hits


def scan_tree_for_secrets(root: Path) -> list[str]:
    findings: list[str] = []
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bin", ".enc"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        for hit in scan_text_for_secrets(text):
            findings.append(f"{path.name}:{hit}")
    return findings


def copy_tree(src: Path, dst: Path) -> int:
    count = 0
    for path in src.rglob("*"):
        if path.is_file():
            rel = path.relative_to(src)
            target = dst / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target)
            count += 1
    return count


def total_size(paths: Iterable[Path]) -> int:
    return sum(p.stat().st_size for p in paths if p.is_file())


def env_flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def prepare_output_dir(path: Path) -> Path:
    path = path.expanduser().resolve()
    assert_output_outside_repo(path)
    path.mkdir(parents=True, exist_ok=True)
    return path
