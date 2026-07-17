#!/usr/bin/env python3
"""Offline Fake-rclone for BoundLore upload diagnostics tests.

No network. Records argv and env *keys* (never secret values) to a state file.
Behaviour controlled by FAKE_RCLONE_FIXTURE JSON path.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path


def main() -> int:
    # Hard fail if anything tries to use this as a real network client via unexpected args.
    banned = ("http://", "https://", "wasabisys.com", "amazonaws.com")
    joined = " ".join(sys.argv[1:]).lower()
    for b in banned:
        if b in joined:
            print("NETWORK_FORBIDDEN", file=sys.stderr)
            return 99

    fixture_path = os.environ.get("FAKE_RCLONE_FIXTURE", "")
    state_path = os.environ.get("FAKE_RCLONE_STATE", "")
    if not fixture_path or not Path(fixture_path).is_file():
        print("FAKE_RCLONE_FIXTURE missing", file=sys.stderr)
        return 2

    fixture = json.loads(Path(fixture_path).read_text(encoding="utf-8"))
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""

    # Record call metadata without secret values.
    env_keys = sorted(
        k
        for k in os.environ
        if k.startswith("AWS_")
        or k.startswith("RCLONE_")
        or k in ("FAKE_RCLONE_FIXTURE", "FAKE_RCLONE_STATE")
    )
    record = {
        "argv": sys.argv[1:],
        "command": cmd,
        "env_keys": env_keys,
        "has_aws_access_key": "AWS_ACCESS_KEY_ID" in os.environ,
        "has_aws_secret": "AWS_SECRET_ACCESS_KEY" in os.environ,
        "has_aws_profile": "AWS_PROFILE" in os.environ,
        "has_rclone_s3_access": "RCLONE_S3_ACCESS_KEY_ID" in os.environ,
        "boundlore_access_present": any(
            k.endswith("_ACCESS_KEY_ID") and k.startswith("RCLONE_CONFIG_BOUNDLOREPROD")
            for k in os.environ
        ),
    }
    if state_path:
        sp = Path(state_path)
        prev = []
        if sp.is_file():
            try:
                prev = json.loads(sp.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                prev = []
        if not isinstance(prev, list):
            prev = []
        prev.append(record)
        sp.write_text(json.dumps(prev, indent=2) + "\n", encoding="utf-8")

    # Version/help passthrough shapes for accidental real calls in tests.
    if cmd in ("version", "help"):
        print("rclone (fake) v0.0.0-offline")
        return 0

    responses = fixture.get("commands", {})
    resp = responses.get(cmd) or responses.get("*") or {
        "exit": 0,
        "stdout": "",
        "stderr": "",
    }
    stdout = resp.get("stdout", "")
    stderr = resp.get("stderr", "")
    if stdout:
        sys.stdout.write(stdout if stdout.endswith("\n") else stdout + "\n")
    if stderr:
        sys.stderr.write(stderr if stderr.endswith("\n") else stderr + "\n")
    return int(resp.get("exit", 0))


if __name__ == "__main__":
    raise SystemExit(main())
