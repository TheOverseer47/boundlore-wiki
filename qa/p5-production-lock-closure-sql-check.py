#!/usr/bin/env python3
"""P5-E.9G.8C — Static verification for production lock closure SQL package."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

REQUIRED_FILES = [
    ROOT / "supabase" / "profile_role_integrity_hardening.sql",
    ROOT / "supabase" / "release_gate_content_policy_closure.sql",
    ROOT / "supabase" / "release_gate_observation_rpc_hardening.sql",
    ROOT / "supabase" / "release_gate_storage_policy_deferred.sql",
]

STAGING_REF = "jzzgoiwfbuwiiyvwgwri"

FORBIDDEN_PATTERNS = [
    (r"\bcontribution_locked\s*=\s*false\b", "contribution_locked = false"),
    (r"\bTRUNCATE\b", "TRUNCATE"),
    (r"\bDROP\s+TABLE\b", "DROP TABLE"),
    (r"\bDROP\s+SCHEMA\b", "DROP SCHEMA"),
    (r"\bDELETE\s+FROM\s+public\.(posts|comments|wiki_observations|profiles)\b", "product DELETE"),
    (r"\bUPDATE\s+public\.(posts|comments|wiki_observations|profiles)\b", "product UPDATE outside RPC"),
    (r"\bINSERT\s+INTO\s+public\.(posts|comments|wiki_observations)\b", "product content INSERT"),
    (r"\bpre_release_test_data_reset\b", "reset script reference"),
    (r"jzzgoiwfbuwiiyvwgwri", "staging ref"),
    (r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "uuid literal"),
    (r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", "jwt-like token"),
    (r"service[_-]?role", "service role reference"),
    (r"GRANT\s+EXECUTE\s+.*\bTO\s+public\b", "broad EXECUTE TO public"),
]

FOUNDATION_MARKERS = [
    r"\bcreate\s+table\b",
    r"\balter\s+table\s+public\.posts\b",
    r"\bcreate\s+extension\b",
]

RPC_FILE = ROOT / "supabase" / "release_gate_observation_rpc_hardening.sql"
CONTENT_FILE = ROOT / "supabase" / "release_gate_content_policy_closure.sql"
PROFILE_FILE = ROOT / "supabase" / "profile_role_integrity_hardening.sql"
STORAGE_FILE = ROOT / "supabase" / "release_gate_storage_policy_deferred.sql"

RPC_SIGNATURE = (
    "bl_register_observation(text, text, text, text, text, jsonb, text, text, text, jsonb)"
)


def fail(msg: str) -> None:
    print(f"FAIL: {msg}")
    sys.exit(1)


def read(path: Path) -> str:
    if not path.is_file():
        fail(f"missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def scan_forbidden(text: str, label: str, *, rpc_function_body: bool = False) -> None:
    lower = text.lower()
    for pattern, name in FORBIDDEN_PATTERNS:
        if rpc_function_body and name in {
            "product DELETE",
            "product UPDATE outside RPC",
            "product content INSERT",
        }:
            continue
        if re.search(pattern, text, re.I):
            fail(f"{label}: forbidden pattern {name}")


def main() -> None:
    print("P5-E.9G.8C production lock closure SQL static check")
    print("=" * 56)

    contents = {p: read(p) for p in REQUIRED_FILES}

    for path, text in contents.items():
        rel = path.relative_to(ROOT)
        print(f"OK  file present: {rel}")
        scan_forbidden(text, str(rel), rpc_function_body=(path == RPC_FILE))

        if path != STORAGE_FILE:
            for marker in FOUNDATION_MARKERS:
                if re.search(marker, text, re.I):
                    fail(f"{rel}: foundation DDL marker {marker}")

    rpc = contents[RPC_FILE]
    if RPC_SIGNATURE not in rpc.replace(" ", ""):
        # allow whitespace differences in signature listing inside file
        if "bl_register_observation(" not in rpc:
            fail("RPC file missing bl_register_observation definition")
    if "returns jsonb" not in rpc.lower():
        fail("RPC file must return jsonb")
    if "security definer" not in rpc.lower():
        fail("RPC file must remain SECURITY DEFINER")
    if "set search_path" not in rpc.lower():
        fail("RPC file missing explicit search_path")
    if "bl_assert_can_create_user_content" not in rpc:
        fail("RPC file missing release-lock assert helper")
    if "user_submission_acks" not in rpc:
        fail("RPC file missing tutorial-ack check")
    if "perform public.bl_assert_can_create_user_content" not in rpc.replace("\n", " "):
        fail("RPC file must perform release-lock assert")
    rpc_lower = rpc.lower()
    assert_pos = rpc_lower.find("perform public.bl_assert_can_create_user_content")
    write_positions = [
        rpc_lower.find("insert into public.wiki_observations"),
        rpc_lower.find("insert into public.posts"),
    ]
    write_positions = [p for p in write_positions if p >= 0]
    if write_positions and (assert_pos < 0 or assert_pos > min(write_positions)):
        fail("RPC assert must occur before first write")
    if "grant execute" in rpc.lower() and "to authenticated" not in rpc.lower():
        fail("RPC grant must target authenticated only")
    if "to public" in rpc.lower() and "comment on" not in rpc.lower():
        pass
    print("OK  RPC hardening scope and gates")

    content = contents[CONTENT_FILE]
    if "comments_release_gate_insert_restrictive" not in content:
        fail("content policy file missing comments restrictive policy")
    if "wiki_observations_release_gate_insert_restrictive" not in content:
        fail("content policy file missing wiki_observations restrictive policy")
    if "as restrictive" not in content.lower():
        fail("content policies must be restrictive")
    if "bl_can_create_user_content" not in content:
        fail("content policies must use bl_can_create_user_content")
    print("OK  direct content INSERT policies")

    profile = contents[PROFILE_FILE]
    if "bl_profiles_prevent_role_self_promotion" not in profile:
        fail("profile file missing guard trigger function")
    if "before update on public.profiles" not in profile.lower():
        fail("profile file missing BEFORE UPDATE trigger")
    if "new.role is distinct from old.role" not in profile.lower():
        fail("profile file must guard role column changes")
    if "bl_is_admin_actor" not in profile:
        fail("profile file must use bl_is_admin_actor for admin path")
    print("OK  profile role integrity")

    storage = contents[STORAGE_FILE]
    if "discovery-uploads" not in storage:
        fail("storage file must target discovery-uploads")
    if "report-screenshots" in storage and re.search(r"bucket_id\s*=\s*'report-screenshots'", storage, re.I):
        fail("storage file must not target report-screenshots bucket")
    if "storage_discovery_uploads_release_gate_insert_restrictive" not in storage:
        fail("storage file missing restrictive policy name")
    if "bl_can_create_user_content" not in storage:
        fail("storage file missing release-lock helper")
    if "split_part" in storage:
        fail("storage file must not alter UID path scoping (no split_part override)")
    print("OK  storage deferred policy scope")

    print("=" * 56)
    print("PASS")


if __name__ == "__main__":
    main()
