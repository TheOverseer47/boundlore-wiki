#!/usr/bin/env python3
"""Static safety checks for P5-E.9G.8E.2 policy authoring."""

from pathlib import Path
import re
import sys


ROOT = Path(__file__).resolve().parents[1]
TRANSFORM = ROOT / "supabase" / "release_gate_existing_discovery_policy_transform.sql"
SOURCE = ROOT / "supabase" / "discovery_storage.sql"

POLICY = "discovery_upload_authenticated"
BUCKET = "discovery-uploads"
UID_SCOPE = "split_part(name, '/', 1) = auth.uid()::text"
LOCK = "public.bl_can_create_user_content(auth.uid())"


def normalized(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"--[^\n]*", "", text)
    return re.sub(r"\s+", " ", text.strip()).lower()


def fail(message: str) -> None:
    print(f"FAIL: {message}")
    raise SystemExit(1)


transform = normalized(TRANSFORM)
source = normalized(SOURCE)

for forbidden in (
    "set role",
    "alter table",
    "alter owner",
    " owner to ",
    "grant ",
    "revoke ",
    "create policy",
    "drop policy",
    "insert into storage.objects",
    "update storage.objects",
    "delete from storage.objects",
    "contribution_locked = false",
):
    if forbidden in transform:
        fail(f"transformation contains forbidden token: {forbidden.strip()}")

if transform.count("alter policy") != 1:
    fail("transformation must contain exactly one ALTER POLICY")

if f'alter policy "{POLICY}" on storage.objects to authenticated' not in transform:
    fail("policy name, table, or authenticated role changed")

for required in (f"bucket_id = '{BUCKET}'", UID_SCOPE, LOCK):
    if required not in transform:
        fail(f"transformation missing invariant: {required}")

if " or " in transform:
    fail("transformation must not broaden WITH CHECK using OR")

if transform.count(" and ") != 2:
    fail("transformation must combine exactly bucket, UID path, and release lock")

if transform.count("begin;") != 1 or transform.count("commit;") != 1:
    fail("transformation must be a single explicit transaction")

source_policy = re.search(
    rf'create policy "{POLICY}".*?with check \((.*?)\);',
    source,
)
if not source_policy:
    fail("discovery_storage.sql policy block not found")

source_check = source_policy.group(1)
for required in (f"bucket_id = '{BUCKET}'", UID_SCOPE, LOCK):
    if required not in source_check:
        fail(f"source-of-truth policy missing invariant: {required}")

if " or " in source_check:
    fail("source-of-truth policy must not broaden WITH CHECK using OR")

print("PASS: existing discovery policy transform is narrow and fail-closed")
sys.exit(0)
