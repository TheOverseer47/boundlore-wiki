#!/usr/bin/env python3
"""P5-E.9F.2 — Python fallback for p5-entity-ssg-seo-technical-check.mjs"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "qa" / "fixtures" / "entity-ssg-fixtures.json"
SITEMAP = ROOT / "qa" / "entity-ssg-sitemap.fixture.xml"
PROD_SITEMAP = ROOT / "sitemap.xml"
NOT_FOUND = ROOT / "wiki" / "post" / "_ssg-not-found" / "index.html"
FORBIDDEN = re.compile(
    r"BLMETA|search_text|search_vector|service_role|SUPABASE_SERVICE_ROLE|password|passwd|secret|token|"
    r"@[a-z0-9.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.I,
)
MARKER = re.compile(r"\b(qa-ssg|p5-e9e|fixture-only|prototype fixture|test fixture)\b", re.I)
SLUG_BLOCK = re.compile(r"^(qa|test|p5|fixture|draft|pending|deleted|contribution)")
pass_count = 0


def fail(msg: str) -> None:
    print(f"[p5-entity-ssg-seo-technical-check] FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    global pass_count
    pass_count += 1
    print(f"[p5-entity-ssg-seo-technical-check] PASS: {msg}")


def check_entity(entity: dict) -> None:
    slug = entity["canonical_slug"]
    html_path = ROOT / "wiki" / "post" / slug / "index.html"
    if not html_path.exists():
        fail(f"Missing output for {slug}")
    html = html_path.read_text(encoding="utf-8")
    checks = [
        ("generator marker", "build-entity-ssg-fixtures.mjs" in html),
        ("title", "<title>" in html and entity["title"] in html),
        ("description", 'meta name="description"' in html),
        ("canonical", 'rel="canonical"' in html),
        ("og:title", 'property="og:title"' in html),
        ("og:description", 'property="og:description"' in html),
        ("og:url", 'property="og:url"' in html),
        ("twitter:title", 'name="twitter:title"' in html),
        ("twitter:description", 'name="twitter:description"' in html),
        ("single h1", len(re.findall(r"<h1\b", html, re.I)) == 1),
        ("excerpt", entity["excerpt"][:40] in html),
        ("no loading", "Loading post" not in html),
        ("no leak", not FORBIDDEN.search(html)),
        ("no markers", not MARKER.search(html)),
        ("CreativeWork", "CreativeWork" in html),
        ("BreadcrumbList", "BreadcrumbList" in html),
        ("noindex", 'meta name="robots" content="noindex, follow"' in html),
    ]
    for name, passed in checks:
        if not passed:
            fail(f"{slug} failed check: {name}")
    ok(f"Validated entity page {slug}")


def main() -> None:
    if not (ROOT / "scripts" / "build-entity-ssg-fixtures.mjs").exists():
        fail("Generator script missing")
    ok("Generator script exists")
    entities = json.loads(FIXTURE.read_text(encoding="utf-8")).get("entities", [])
    if len(entities) < 6:
        fail(f"Expected at least 6 entities, got {len(entities)}")
    ok(f"Fixture count >= 6 ({len(entities)})")
    slugs = set()
    for entity in entities:
        slug = entity["canonical_slug"]
        if slug in slugs:
            fail(f"Duplicate slug {slug}")
        slugs.add(slug)
        if SLUG_BLOCK.match(slug) or not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", slug):
            fail(f"Invalid slug {slug}")
    ok("All slugs unique and SEO-safe")
    sitemap = SITEMAP.read_text(encoding="utf-8")
    for entity in entities:
        if entity["canonical_url"] not in sitemap:
            fail(f"Sitemap missing {entity['canonical_url']}")
    ok("Fixture sitemap includes all entity URLs")
    prod = PROD_SITEMAP.read_text(encoding="utf-8")
    for entity in entities:
        if f"/wiki/post/{entity['canonical_slug']}/" in prod:
            fail(f"Production sitemap must not include {entity['canonical_slug']}")
    ok("Production sitemap.xml unchanged for fixture entities")
    for entity in entities:
        check_entity(entity)
    nf = NOT_FOUND.read_text(encoding="utf-8")
    if 'meta name="robots" content="noindex, nofollow"' not in nf:
        fail("Not-found page must be noindex,nofollow")
    ok("Not-found fail-closed page present")
    print(f"[p5-entity-ssg-seo-technical-check] All checks passed ({pass_count} assertions)")


if __name__ == "__main__":
    main()
