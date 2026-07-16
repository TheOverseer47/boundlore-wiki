#!/usr/bin/env python3
"""Validate redacted live evidence for P5-E.10B-W5-A1 (offline; no network)."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EVIDENCE = ROOT / "qa" / "evidence" / "p5-e10b-w5-production-snapshot.json"

CHECKS = 0
FAILURES: list[str] = []

REQUIRED = (
    "gate_id",
    "created_at_utc",
    "source_environment",
    "production_identity_confirmed",
    "project_ref_redacted_or_hashed",
    "release_gate_locked_start",
    "release_gate_locked_end",
    "schema_count",
    "table_count",
    "function_count",
    "trigger_count",
    "policy_count",
    "extension_count",
    "storage_bucket_allowlist",
    "storage_object_counts",
    "storage_total_sizes",
    "database_dump_format",
    "role_passwords_included",
    "database_dump_validated",
    "storage_export_validated",
    "inventory_consistent",
    "encryption_method",
    "recipient_fingerprint",
    "final_archive_count",
    "encrypted_archive_size",
    "encrypted_archive_sha256",
    "local_encrypted_copy_present",
    "local_hash_match",
    "wasabi_provider",
    "wasabi_region",
    "wasabi_bucket",
    "wasabi_prefix_class",
    "object_name_redacted_or_hashed",
    "upload_invocations",
    "remote_object_count",
    "remote_size_match",
    "remote_readback",
    "restore",
    "plaintext_uploaded",
    "getobject_attempted",
    "delete_attempted",
    "supabase_mutation",
    "credentials_persisted",
    "rclone_config_persisted",
    "local_cleanup",
    "manual_veracrypt_dismount_required",
    "verdict",
)


def check(cond: bool, msg: str) -> None:
    global CHECKS
    CHECKS += 1
    if cond:
        print(f"[p5-production-snapshot-live-evidence-check] PASS: {msg}")
    else:
        FAILURES.append(msg)
        print(f"[p5-production-snapshot-live-evidence-check] FAIL: {msg}", file=sys.stderr)


def main() -> None:
    check(EVIDENCE.is_file(), "evidence file present")
    if not EVIDENCE.is_file():
        print("[p5-production-snapshot-live-evidence-check] evidence missing — live run not yet reported")
        raise SystemExit(1)

    raw = EVIDENCE.read_text(encoding="utf-8")
    data = json.loads(raw)

    for key in REQUIRED:
        check(key in data, f"field {key}")

    check(data.get("gate_id") == "P5-E.10B-W5-A1", "gate_id")
    check(data.get("source_environment") == "production", "production environment")
    check(data.get("production_identity_confirmed") is True, "identity confirmed")
    check(data.get("release_gate_locked_start") is True, "gate locked start")
    check(data.get("release_gate_locked_end") is True, "gate locked end")
    check(data.get("role_passwords_included") is False, "no role passwords")
    check(data.get("database_dump_validated") is True, "dump validated")
    check(data.get("storage_export_validated") is True, "storage validated")
    check(data.get("inventory_consistent") is True, "inventory consistent")
    check(data.get("encryption_method") == "age", "age encryption")
    check(data.get("final_archive_count") == 1, "one final archive")
    check(data.get("local_encrypted_copy_present") is True, "local encrypted copy")
    check(data.get("local_hash_match") is True, "local hash match")
    check(data.get("upload_invocations") == 1, "one upload")
    check(data.get("remote_object_count") == 1, "one remote object")
    check(data.get("remote_size_match") is True, "remote size match")
    check(data.get("remote_readback") == "NOT_PERFORMED", "no readback")
    check(data.get("restore") == "NOT_PERFORMED", "no restore")
    check(data.get("plaintext_uploaded") is False, "no plaintext upload")
    check(data.get("getobject_attempted") is False, "no getobject")
    check(data.get("delete_attempted") is False, "no delete")
    check(data.get("supabase_mutation") is False, "no supabase mutation")
    check(data.get("credentials_persisted") is False, "no credential persistence")
    check(data.get("rclone_config_persisted") is False, "no rclone persistence")
    check(data.get("local_cleanup") == "PASS", "cleanup pass")
    check(data.get("manual_veracrypt_dismount_required") is True, "manual dismount required")
    check(data.get("wasabi_bucket") == "REDACTED", "bucket redacted")
    check(data.get("wasabi_prefix_class") == "production-snapshots/", "prefix class")
    check(data.get("wasabi_region") == "eu-central-2", "wasabi region")
    check(
        data.get("verdict")
        == "PASS_CONTROLLED_READ_ONLY_PRODUCTION_SNAPSHOT_ENCRYPTED_UPLOAD_VERIFIED",
        "pass verdict",
    )

    allow = data.get("storage_bucket_allowlist") or []
    check(set(allow) == {"avatars", "discovery-uploads", "report-screenshots"}, "bucket allowlist")

    # Redaction / secret scan on evidence contents
    check("ohkoojpzmptdfyowdgog" not in raw, "full production ref absent")
    check("jzzgoiwfbuwiiyvwgwri" not in raw, "staging ref absent")
    check("AGE-SECRET-KEY" not in raw, "no private age key")
    check(not re.search(r"age1[a-z0-9]{40,}", raw), "no full age recipient")
    check(not re.search(r"AKIA[0-9A-Z]{16}", raw), "no AKIA")
    check("sb_secret_" not in raw, "no sb_secret")
    check("postgresql://" not in raw.lower(), "no connection string")
    check("BoundLoreBackups" not in raw, "no personal host paths")
    check(not re.search(r"[A-Za-z]:\\\\Users\\\\", raw), "no Windows user paths")
    check("eyJ" not in raw, "no JWT-looking material")
    ref_hash = str(data.get("project_ref_redacted_or_hashed") or "")
    check(len(ref_hash) == 64 and re.fullmatch(r"[0-9a-f]{64}", ref_hash), "project ref hashed")
    fp = str(data.get("recipient_fingerprint") or "")
    check(len(fp) == 64 and re.fullmatch(r"[0-9a-f]{64}", fp), "recipient fingerprint only")
    sha = str(data.get("encrypted_archive_sha256") or "")
    check(len(sha) == 64 and re.fullmatch(r"[0-9a-fA-F]{64}", sha), "archive sha256 present")

    print(f"[p5-production-snapshot-live-evidence-check] checks={CHECKS} failures={len(FAILURES)}")
    if FAILURES:
        for item in FAILURES:
            print(f"  - {item}", file=sys.stderr)
        raise SystemExit(1)
    print("[p5-production-snapshot-live-evidence-check] All checks passed")


if __name__ == "__main__":
    main()
