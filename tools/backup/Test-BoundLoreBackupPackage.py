#!/usr/bin/env python3
"""Offline synthetic backup package test with real age + local rclone when available."""
from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
sys.path.insert(0, str(ROOT / "_lib"))

from package_lib import (  # noqa: E402
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
    STOP_CHECKSUM_FAILED,
    STOP_ENCRYPTION_FAILED,
    STOP_ENCRYPTION_UNAVAILABLE,
    STOP_NETWORK_FORBIDDEN,
    assert_no_network,
)


def run_py(script: str, args: list[str]) -> None:
    subprocess.check_call([sys.executable, str(ROOT / script), *args])


def which(name: str) -> str | None:
    return shutil.which(name)


def redact_path(path: Path) -> str:
    # Do not document user home/tool absolute paths in evidence printed by default.
    return path.name


def assert_tool_outside_repo(exe: str | None, label: str) -> str:
    if not exe:
        raise SystemExit(f"STOP_REQUIRED_TOOL_NOT_FOUND: {label}")
    p = Path(exe).resolve()
    try:
        p.relative_to(REPO.resolve())
        raise SystemExit(f"STOP_AMBIGUOUS_TOOL_RESOLUTION: {label} resolves inside repository")
    except ValueError:
        pass
    return str(p)


def age_keygen_pair(keys_dir: Path, label: str) -> tuple[Path, str]:
    """Create ephemeral identity file; return (identity_path, recipient_public). Never print private key."""
    identity = keys_dir / f"{label}.identity"
    # age-keygen writes private material only to -o file; public via -y later.
    # Do not print stdout/stderr: some builds echo the public key; never echo secrets.
    proc = subprocess.run(
        ["age-keygen", "-o", str(identity)],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0 or not identity.is_file():
        raise SystemExit(f"{STOP_ENCRYPTION_FAILED}: age-keygen failed")
    pub = subprocess.run(
        ["age-keygen", "-y", str(identity)],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    if not pub.startswith("age1"):
        raise SystemExit(f"{STOP_ENCRYPTION_FAILED}: recipient extraction failed")
    if "AGE-SECRET-KEY-" in pub:
        raise SystemExit("FAIL_EPHEMERAL_KEY_SAFETY: public extraction contained secret")
    return identity, pub


def encrypt_with_protect(package: Path, recipient: str) -> None:
    cmd = [
        "powershell",
        "-NoProfile",
        "-File",
        str(ROOT / "Protect-BoundLoreBackup.ps1"),
        "-PackageDirectory",
        str(package),
        "-RecipientPublicKey",
        recipient,
        "-NoDryRun",
        "-PerformLocalEncryption",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "")[-400:]
        raise SystemExit(
            f"{STOP_ENCRYPTION_FAILED}: Protect failed (exit {proc.returncode}): {err}"
        )


def age_decrypt(identity: Path, src_age: Path, dest: Path) -> int:
    # Private key only via -i file path, never argv secret material.
    return subprocess.run(
        ["age", "-d", "-i", str(identity), "-o", str(dest), str(src_age)],
        capture_output=True,
    ).returncode


def local_rclone_copyto(src: Path, dst: Path) -> None:
    rclone = which("rclone")
    if not rclone:
        raise SystemExit("STOP_REQUIRED_TOOL_NOT_FOUND: rclone")
    assert_tool_outside_repo(rclone, "rclone")
    dst.parent.mkdir(parents=True, exist_ok=True)
    # Use forward-slash absolute paths; rclone copyto between local files only.
    src_s = src.resolve().as_posix()
    dst_s = dst.resolve().as_posix()
    # Guard: reject remote-style "name:path" that is not a Windows drive letter.
    for candidate in (src_s, dst_s):
        if re.match(r"^[A-Za-z0-9_-]+:(?![/\\])", candidate):
            raise SystemExit("STOP_LOCAL_TEST_ATTEMPTED_EXTERNAL_NETWORK: remote-like path")
    proc = subprocess.run(
        [rclone, "copyto", src_s, dst_s, "--retries", "1", "--low-level-retries", "1"],
        capture_output=True,
        text=True,
    )
    if proc.returncode != 0:
        raise SystemExit(f"rclone copyto failed: {proc.stderr[:200]}")
    # Refuse evidence of remote backends in command output
    blob = (proc.stdout + proc.stderr).lower()
    for needle in ("wasabi", "s3://", "http://", "https://", "webdav", "ftp://"):
        if needle in blob:
            raise SystemExit("STOP_LOCAL_TEST_ATTEMPTED_EXTERNAL_NETWORK")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--keep-temp", action="store_true")
    args = parser.parse_args()

    assert_no_network(True, attempting_external=False)

    age_bin = assert_tool_outside_repo(which("age"), "age")
    keygen_bin = assert_tool_outside_repo(which("age-keygen"), "age-keygen")
    rclone_bin = assert_tool_outside_repo(which("rclone"), "rclone")

    age_ver = subprocess.check_output([age_bin, "--version"], text=True).strip()
    keygen_ver = subprocess.check_output([keygen_bin, "--version"], text=True).strip()
    rclone_ver_line = (
        subprocess.check_output([rclone_bin, "version"], text=True).splitlines()[0].strip()
    )

    tmp = Path(tempfile.mkdtemp(prefix="boundlore-backup-m1-"))
    identity = None
    wrong_identity = None
    try:
        prepare_output_dir(tmp)
        keys = tmp / "keys"
        keys.mkdir()
        source = tmp / "source"
        package_out = tmp / "package"
        encrypted_dir = tmp / "encrypted"
        transfer_target = tmp / "transfer-target"
        restored = tmp / "restored"
        for d in (source, package_out, encrypted_dir, transfer_target, restored):
            d.mkdir()

        backup_id = new_backup_id()
        work = tmp / "work"
        work.mkdir()

        # Synthetic storage export into package
        run_py(
            "Export-BoundLoreStorage.py",
            [
                "--output-directory",
                str(package_out),
                "--working-directory",
                str(work),
                "--backup-id",
                backup_id,
                "--synthetic",
                "--no-network",
                "--no-dry-run",
            ],
        )
        root = package_out / backup_id
        ensure_package_dirs(root)

        db = root / "database"
        (db / "roles.sql").write_text("-- synthetic roles placeholder\n", encoding="utf-8")
        (db / "schema.dump").write_bytes(b"SYNTHETIC_SCHEMA_BYTES")
        (db / "data.dump").write_bytes(b"SYNTHETIC_DATA_BYTES_42")
        for name in ("roles.sql", "schema.dump", "data.dump"):
            write_checksum_sidecar(db / name)

        cfg = root / "configuration"
        write_json(cfg / "synthetic-config.json", {"source_type": "synthetic", "note": "offline-only"})
        write_checksum_sidecar(cfg / "synthetic-config.json")

        inv = {
            "database_components": ["roles", "schema", "data"],
            "storage_components": [{"bucket": b, "object_count": 2} for b in BUCKET_ALLOWLIST],
            "file_count": len([p for p in root.rglob("*") if p.is_file()]),
            "encrypted_size": 0,
            "tool_versions": {
                "age": age_ver,
                "rclone": rclone_ver_line,
                "test_harness": "m1-1.0.0",
            },
        }
        inv_path = root / "evidence" / "package-inventory.json"
        write_json(inv_path, inv)

        run_py(
            "New-BoundLoreBackupManifest.py",
            [
                "--output-directory",
                str(package_out),
                "--backup-id",
                backup_id,
                "--source-type",
                "synthetic",
                "--encryption-method",
                "age",
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

        identity, recipient = age_keygen_pair(keys, "correct")
        wrong_identity, _wrong_pub = age_keygen_pair(keys, "wrong")

        # Real age encryption via Protect
        plaintext = db / "data.dump"
        plain_hash = sha256_file(plaintext)
        encrypt_with_protect(root, recipient)
        age_file = Path(str(plaintext) + ".age")
        if not age_file.is_file():
            raise SystemExit(f"{STOP_ENCRYPTION_FAILED}: missing {age_file.name}")
        verify_checksum_sidecar(age_file)
        enc_hash = sha256_file(age_file)

        # Wrong-key negative test
        wrong_out = restored / "wrong-decrypt.bin"
        rc_wrong = age_decrypt(wrong_identity, age_file, wrong_out)
        if rc_wrong == 0:
            raise SystemExit("FAIL: wrong key unexpectedly decrypted")
        if wrong_out.exists():
            wrong_out.unlink()

        # Correct decrypt
        good_out = restored / "data.dump.restored"
        rc_good = age_decrypt(identity, age_file, good_out)
        if rc_good != 0:
            raise SystemExit(f"{STOP_ENCRYPTION_FAILED}: decrypt failed")
        if sha256_file(good_out) != plain_hash or good_out.read_bytes() != plaintext.read_bytes():
            raise SystemExit(f"{STOP_CHECKSUM_FAILED}: decrypt byte mismatch")

        # Local rclone transfer of encrypted file only
        transfer_dest = transfer_target / age_file.name
        local_rclone_copyto(age_file, transfer_dest)
        if not age_file.is_file():
            raise SystemExit("FAIL: source removed after rclone copy")
        if sha256_file(transfer_dest) != enc_hash:
            raise SystemExit(f"{STOP_CHECKSUM_FAILED}: rclone destination hash mismatch")
        if transfer_dest.read_bytes() != age_file.read_bytes():
            raise SystemExit(f"{STOP_CHECKSUM_FAILED}: rclone byte mismatch")

        # Decrypt from transferred copy
        from_xfer = restored / "from-transfer.dump"
        if age_decrypt(identity, transfer_dest, from_xfer) != 0:
            raise SystemExit(f"{STOP_ENCRYPTION_FAILED}: decrypt transferred copy failed")
        if from_xfer.read_bytes() != plaintext.read_bytes():
            raise SystemExit(f"{STOP_CHECKSUM_FAILED}: transferred decrypt mismatch")

        secrets = scan_tree_for_secrets(root)
        # identity files are outside package root; ensure package has no secrets
        if secrets:
            raise SystemExit(f"secrets detected in package: {secrets}")

        # Network forbid helper
        try:
            assert_no_network(True, attempting_external=True)
            raise SystemExit("expected network forbid")
        except SystemExit as exc:
            if STOP_NETWORK_FORBIDDEN not in str(exc):
                raise

        # Note rclone config existence without reading
        rclone_conf = Path(os.environ.get("APPDATA", "")) / "rclone" / "rclone.conf"
        rclone_conf_state = (
            "EXISTING_RCLONE_CONFIGURATION_NOT_INSPECTED"
            if rclone_conf.is_file()
            else "NO_RCLONE_CONF_DETECTED"
        )

        summary = {
            "backup_id": backup_id,
            "age_version": age_ver,
            "rclone_version": rclone_ver_line,
            "tools_outside_repo": True,
            "encryption_method": "age",
            "wrong_key_rejected": True,
            "byte_compare_pass": True,
            "rclone_transfer": "local-copyto",
            "rclone_remote_used": False,
            "rclone_config": rclone_conf_state,
            "external_requests": 0,
            "wasabi_requests": 0,
            "supabase_requests": 0,
            "file_count": len([p for p in root.rglob("*") if p.is_file()]),
            "bytes": total_size([p for p in root.rglob("*") if p.is_file()]),
            "validation_status": "PASS_REAL_OFFLINE_AGE_RCLONE",
        }
        write_json(root / "evidence" / "backup-summary.json", summary)
        # Print summary only (no keys, no absolute sensitive paths)
        print(json.dumps(summary, indent=2))
        return 0
    finally:
        # Secure-ish cleanup of ephemeral keys and temp tree
        try:
            if identity and identity.exists():
                identity.write_bytes(b"\x00" * max(64, identity.stat().st_size))
                identity.unlink()
            if wrong_identity and Path(wrong_identity).exists():
                p = Path(wrong_identity)
                p.write_bytes(b"\x00" * max(64, p.stat().st_size))
                p.unlink()
        except OSError:
            pass
        if not args.keep_temp:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    raise SystemExit(main())
