#!/usr/bin/env python3
"""Seed manifest + assemble raw export from content files (P5-E.9F.6)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORT_DIR = ROOT / "qa" / "fixtures" / "real-content-export"
RAW_OUT = ROOT / "qa" / "fixtures" / ".real-content-export-raw.json"

MANIFEST = [
    {
        "slug": "ogre-mage",
        "canonical_name": "Ogre Mage",
        "entity_type": "monster",
        "category_slug": "creatures",
        "updated_at": "2026-07-09 11:47:37.819467+00",
        "post_title": "Ogre Mage",
        "excerpt": "Ogre Mage in Swamplands near a Campfire",
        "post_slug": "ogre-mage-9651e6",
        "match_rank": 1,
        "content_file": "ogre-mage.raw.html",
    },
    {
        "slug": "smought",
        "canonical_name": "Smought",
        "entity_type": "creature",
        "category_slug": "creatures",
        "updated_at": "2026-07-09 11:47:37.727702+00",
        "post_title": "Smought",
        "excerpt": "Community DiscoveryDiscoverySmought was reported in unclear, confidence is marked as single observation.",
        "post_slug": "smought-835df97a",
        "match_rank": 1,
        "content_file": "smought.raw.html",
    },
    {
        "slug": "staff-of-fire-2f316b0d",
        "canonical_name": "Staff of Fire",
        "entity_type": "item",
        "category_slug": "items",
        "updated_at": "2026-07-09 02:28:25.681749+00",
        "post_title": "Staff of Fire",
        "excerpt": "Knowledge NodeStaff of FireThis related entry was prepared automatically from a discovery relation.Relation type: drops",
        "post_slug": "staff-of-fire-2f316b0d",
        "match_rank": 2,
        "content_file": "staff-of-fire-2f316b0d.raw.html",
    },
    {
        "slug": "swamplands-94dadc07",
        "canonical_name": "Swamplands",
        "entity_type": "location",
        "category_slug": "locations",
        "updated_at": "2026-07-09 13:43:58.232432+00",
        "post_title": "Swamp",
        "excerpt": "Knowledge NodeSwamplandsThis related entry was prepared automatically from a discovery relation.Relation type: found in",
        "post_slug": "swamplands-94dadc07",
        "match_rank": 2,
        "content_file": "swamplands-94dadc07.raw.html",
    },
    {
        "slug": "swamplands-near-a-campfire-787bbd19",
        "canonical_name": "Swamplands near a Campfire",
        "entity_type": "location",
        "category_slug": "locations",
        "updated_at": "2026-07-09 11:47:37.880631+00",
        "post_title": "near a Campfire",
        "excerpt": "Knowledge NodeSwamplands near a CampfireThis related entry was prepared automatically from a discovery relation.Relation type: found in",
        "post_slug": "near-a-campfire-787bbd19",
        "match_rank": 2,
        "content_file": "swamplands-near-a-campfire-787bbd19.raw.html",
    },
]


def main() -> None:
    EXPORT_DIR.mkdir(parents=True, exist_ok=True)
    (EXPORT_DIR / "manifest.json").write_text(
        json.dumps(MANIFEST, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    rows = []
    for item in MANIFEST:
        content_path = EXPORT_DIR / item["content_file"]
        if not content_path.exists():
            raise SystemExit(f"Missing {content_path} — run MCP export content seed first")
        row = {k: v for k, v in item.items() if k != "content_file"}
        row["content"] = content_path.read_text(encoding="utf-8")
        rows.append(row)
    RAW_OUT.write_text(json.dumps(rows, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[seed_9f6_export_manifest] Wrote manifest + {len(rows)} rows to raw export")


if __name__ == "__main__":
    main()
