"""Shared stop codes and path guards for BoundLore backup tooling."""
from __future__ import annotations

from pathlib import Path

STOP_WRONG_PROJECT = "STOP_WRONG_PROJECT"
STOP_STAGING_TARGET = "STOP_STAGING_TARGET"
STOP_OUTPUT_INSIDE_REPOSITORY = "STOP_OUTPUT_INSIDE_REPOSITORY"
STOP_CREDENTIALS_MISSING = "STOP_CREDENTIALS_MISSING"
STOP_ENCRYPTION_UNAVAILABLE = "STOP_ENCRYPTION_UNAVAILABLE"
STOP_ENCRYPTION_FAILED = "STOP_ENCRYPTION_FAILED"
STOP_CHECKSUM_FAILED = "STOP_CHECKSUM_FAILED"
STOP_MANIFEST_INCOMPLETE = "STOP_MANIFEST_INCOMPLETE"
STOP_STORAGE_INVENTORY_MISMATCH = "STOP_STORAGE_INVENTORY_MISMATCH"
STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED = "STOP_EXTERNAL_UPLOAD_NOT_AUTHORIZED"
STOP_NETWORK_FORBIDDEN = "STOP_NETWORK_FORBIDDEN"
STOP_CLEANUP_FAILED = "STOP_CLEANUP_FAILED"
STOP_UNKNOWN_BUCKET = "STOP_UNKNOWN_BUCKET"
STOP_UNSAFE_DEFAULT = "STOP_UNSAFE_DEFAULT"

# Known refs for guard messaging only — never used as live defaults.
KNOWN_PRODUCTION_REF = "ohkoojpzmptdfyowdgog"
KNOWN_STAGING_REF = "jzzgoiwfbuwiiyvwgwri"

BUCKET_ALLOWLIST = ("avatars", "discovery-uploads", "report-screenshots")

MANIFEST_REQUIRED_KEYS = (
    "format_version",
    "backup_id",
    "created_at_utc",
    "source_type",
    "database_components",
    "storage_components",
    "file_count",
    "encrypted_size",
    "checksum_algorithm",
    "encryption_method",
    "tool_versions",
    "release_gate_expected_locked",
    "validation_status",
)


def repo_root() -> Path:
    return Path(__file__).resolve().parents[2]


def assert_output_outside_repo(output_dir: Path) -> None:
    root = repo_root().resolve()
    out = output_dir.resolve()
    try:
        out.relative_to(root)
    except ValueError:
        return
    raise SystemExit(f"{STOP_OUTPUT_INSIDE_REPOSITORY}: output must be outside repository ({out})")


def assert_project_ref(project_ref: str | None, *, allow_production_read: bool) -> None:
    if not project_ref:
        if allow_production_read:
            raise SystemExit(f"{STOP_WRONG_PROJECT}: project ref required")
        return
    if project_ref == KNOWN_STAGING_REF:
        raise SystemExit(f"{STOP_STAGING_TARGET}: staging ref is forbidden")
    if allow_production_read and project_ref != KNOWN_PRODUCTION_REF:
        raise SystemExit(f"{STOP_WRONG_PROJECT}: unexpected project ref")
    if (not allow_production_read) and project_ref == KNOWN_PRODUCTION_REF:
        raise SystemExit(
            f"{STOP_WRONG_PROJECT}: production ref supplied without -AllowProductionRead"
        )


def assert_no_network(no_network: bool, attempting_external: bool) -> None:
    if no_network and attempting_external:
        raise SystemExit(f"{STOP_NETWORK_FORBIDDEN}: external network blocked")
