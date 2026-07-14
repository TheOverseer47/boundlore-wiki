#!/usr/bin/env python3
"""P5-E.9F.6 — Sanitize raw legacy export into real-content SSG input JSON."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from bl_ssg_sanitize import (  # noqa: E402
    assert_public_safe,
    sanitize_excerpt,
    sanitize_html_body,
)

RAW_IN = ROOT / "qa" / "fixtures" / ".real-content-export-raw.json"
EXPORT_DIR = ROOT / "qa" / "fixtures" / "real-content-export"
MANIFEST = EXPORT_DIR / "manifest.json"
OUT = ROOT / "qa" / "fixtures" / "real-content-entity-ssg-export.json"
CANONICAL_BASE = "https://boundlore.com"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SLUG_BLOCK = re.compile(r"(qa|test|fixture|seed|p5e9e4|prototype|backbone)", re.I)
HUB_MAP = {
    "creatures": "/wiki/creatures/",
    "items": "/wiki/items/",
    "locations": "/wiki/locations/",
    "biomes": "/wiki/biomes/",
    "resources": "/wiki/resources/",
    "guides": "/wiki/guides/",
    "guilds": "/wiki/guilds/",
}


def normalize_type(entity_type: str, category_slug: str) -> str:
    t = (entity_type or "").strip().lower()
    if t.endswith("s") and t not in {"locations", "resources"}:
        t = t.rstrip("s")
    if t in {"monster", "mount", "creature"}:
        return "creature"
    if t == "item":
        return "item"
    if t in {"location", "biome"}:
        return t
    if t == "guide":
        return "guide"
    cat = (category_slug or "creatures").rstrip("s")
    return cat if cat in {"creature", "item", "location", "biome", "resource", "guide"} else "creature"


def load_rows() -> list:
    if RAW_IN.exists():
        return json.loads(RAW_IN.read_text(encoding="utf-8"))
    if not MANIFEST.exists():
        raise SystemExit(f"Missing {RAW_IN} or {MANIFEST}")
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    rows = []
    for item in manifest:
        content_path = EXPORT_DIR / item["content_file"]
        if not content_path.exists():
            raise SystemExit(f"Missing content file {content_path}")
        row = dict(item)
        row["content"] = content_path.read_text(encoding="utf-8")
        row.pop("content_file", None)
        rows.append(row)
    return rows


def transform(row: dict) -> dict:
    slug = row["slug"]
    if not SLUG_RE.match(slug) or SLUG_BLOCK.search(slug):
        raise ValueError(f"blocked slug {slug}")
    title = row["canonical_name"] or row.get("post_title") or slug
    body = sanitize_html_body(row.get("content") or "")
    excerpt = sanitize_excerpt(row.get("excerpt") or "", body)
    assert_public_safe(body, f"{slug} body")
    assert_public_safe(excerpt, f"{slug} excerpt")
    assert_public_safe(title, f"{slug} title")
    category = (row.get("category_slug") or "creatures").rstrip("/")
    entity_subtype = normalize_type(row.get("entity_type") or "", category)
    hub = HUB_MAP.get(category if category.endswith("s") else category + "s", "/wiki/browse/")
    if category.endswith("s"):
        hub = HUB_MAP.get(category, "/wiki/browse/")
    updated = str(row.get("updated_at") or "2026-07-09T00:00:00Z")[:19] + "Z"
    canonical_url = f"{CANONICAL_BASE}/wiki/post/{slug}/"
    return {
        "canonical_slug": slug,
        "title": title,
        "category": category if category.endswith("s") else category + "s",
        "entity_domain": category.rstrip("s"),
        "entity_subtype": entity_subtype,
        "excerpt": excerpt,
        "body_html_sanitized": body,
        "updated_at": updated,
        "published_at": updated,
        "content_origin": "real_content_export",
        "status": "published",
        "canonical_url": canonical_url,
        "image_url": f"{CANONICAL_BASE}/public/images/social-preview.png",
        "breadcrumbs": [
            {"name": "Home", "url": f"{CANONICAL_BASE}/"},
            {"name": "Browse", "url": f"{CANONICAL_BASE}/wiki/browse/"},
            {"name": category.replace("-", " ").title(), "url": f"{CANONICAL_BASE}{hub}"},
            {"name": title, "url": canonical_url},
        ],
    }


def main() -> None:
    rows = load_rows()
    entities = []
    seen = set()
    for row in sorted(rows, key=lambda r: r["slug"]):
        slug = row["slug"]
        if slug in seen:
            continue
        seen.add(slug)
        entities.append(transform(row))
    payload = {
        "schema": "RealContentEntitySsgRecord",
        "version": "p5-e9f6",
        "description": "P5-E.9F.6 sanitized real-content entity SSG export from legacy ohkoojpzmptdfyowdgog",
        "entities": entities,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[export-real-content-entity-ssg] Wrote {len(entities)} entities to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
