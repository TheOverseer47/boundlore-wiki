#!/usr/bin/env python3
"""P5-E.9F.6 — QA checks for real-content entity SSG export."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "qa" / "fixtures" / "real-content-entity-ssg-export.json"
SITEMAP = ROOT / "qa" / "real-content-entity-sitemap.fixture.xml"
PROD_SITEMAP = ROOT / "sitemap.xml"
NOT_FOUND = ROOT / "wiki" / "post" / "_ssg-not-found" / "index.html"
POST_DIR = ROOT / "wiki" / "post"
QUARANTINE = ROOT / "qa" / "fixtures" / "ssg-entity-pages"
FIXTURE_SLUGS = {
    "ember-salamander", "volcanic-heat-charm", "cinder-basalt-flats",
    "ashwind-harbor", "ironroot-shard", "explorers-league-hall",
    "qa-ssg-biome-prototype", "qa-ssg-item-prototype", "qa-ssg-creature-prototype",
}
FORBIDDEN = re.compile(
    r"BLMETA|search_text|search_vector|service_role|SUPABASE_SERVICE_ROLE|password|passwd|secret|token|"
    r"@[a-z0-9.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.I,
)
MARKER = re.compile(
    r"\b(qa-ssg|p5-e9e|fixture-only|prototype fixture|test fixture|content_origin.?test)\b",
    re.I,
)
EVENT = re.compile(r"\s+on[a-z]+\s*=", re.I)
pass_count = 0


def fail(msg: str) -> None:
    print(f"[p5-real-content-entity-ssg-check] FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    global pass_count
    pass_count += 1
    print(f"[p5-real-content-entity-ssg-check] PASS: {msg}")


def check_entity(entity: dict) -> None:
    slug = entity["canonical_slug"]
    html_path = POST_DIR / slug / "index.html"
    if not html_path.exists():
        fail(f"Missing output for {slug}")
    page = html_path.read_text(encoding="utf-8")
    expected_canonical = f"https://boundlore.com/wiki/post/{slug}/"
    checks = [
        ("generator marker", "build-real-entity-ssg.py" in page),
        ("real-content source", 'data-bl-ssg-source="real-content-generator"' in page),
        ("title", "<title>" in page and entity["title"] in page),
        ("description", 'meta name="description"' in page),
        ("canonical", expected_canonical in page),
        ("canonical uses entity slug", f"/wiki/post/{slug}/" in page),
        ("og:title", 'property="og:title"' in page),
        ("og:description", 'property="og:description"' in page),
        ("og:url", 'property="og:url"' in page),
        ("twitter:title", 'name="twitter:title"' in page),
        ("twitter:description", 'name="twitter:description"' in page),
        ("single h1", len(re.findall(r"<h1\b", page, re.I)) == 1),
        ("static body", "bl-ssg-body" in page),
        ("no loading", "Loading post" not in page),
        ("no leak", not FORBIDDEN.search(page)),
        ("no markers", not MARKER.search(page)),
        ("no event handlers", not EVENT.search(page)),
        ("no javascript urls", "javascript:" not in page.lower()),
        ("CreativeWork", "CreativeWork" in page),
        ("BreadcrumbList", "BreadcrumbList" in page),
        ("noindex follow", 'meta name="robots" content="noindex, follow"' in page),
    ]
    for name, passed in checks:
        if not passed:
            fail(f"{slug} failed check: {name}")
    ok(f"Validated entity page {slug}")


def main() -> None:
    if not (ROOT / "scripts" / "build-real-entity-ssg.py").exists():
        fail("Generator script missing")
    ok("Generator script exists")
    if not EXPORT.exists():
        fail("Sanitized export JSON missing")
    ok("Sanitized export JSON exists")
    data = json.loads(EXPORT.read_text(encoding="utf-8"))
    entities = data.get("entities") or []
    if len(entities) < 1:
        fail("Expected at least 1 real entity")
    if len(entities) < 5:
        print(f"[p5-real-content-entity-ssg-check] WARN: expected ~5 entities, got {len(entities)}")
    ok(f"Real-content entity count >= 1 ({len(entities)})")
    slugs = set()
    for entity in entities:
        slug = entity["canonical_slug"]
        if slug in slugs:
            fail(f"Duplicate slug {slug}")
        slugs.add(slug)
        if not re.match(r"^[a-z0-9]+(?:-[a-z0-9]+)*$", slug):
            fail(f"Invalid slug {slug}")
        if entity["content_origin"] != "real_content_export":
            fail(f"{slug} wrong content_origin")
    ok("All slugs unique and SEO-safe")
    for slug in FIXTURE_SLUGS:
        if (POST_DIR / slug).exists():
            fail(f"Fixture slug still in wiki/post/: {slug}")
    ok("No fixture pages in production-like wiki/post/")
    if QUARANTINE.exists():
        quarantined = sum(1 for s in FIXTURE_SLUGS if (QUARANTINE / s).exists())
        if quarantined > 0:
            ok(f"Fixture pages quarantined ({quarantined})")
    if not SITEMAP.exists():
        fail("Real-content sitemap missing")
    sitemap = SITEMAP.read_text(encoding="utf-8")
    for entity in entities:
        if entity["canonical_url"] not in sitemap:
            fail(f"Sitemap missing {entity['canonical_url']}")
    ok("Sitemap includes all real entity URLs")
    for slug in FIXTURE_SLUGS:
        if slug in sitemap:
            fail(f"Sitemap must not include fixture slug {slug}")
    ok("Sitemap excludes fixture URLs")
    if PROD_SITEMAP.exists():
        prod = PROD_SITEMAP.read_text(encoding="utf-8")
        for entity in entities:
            if f"/wiki/post/{entity['canonical_slug']}/" in prod:
                fail(f"Production sitemap must not include real entity {entity['canonical_slug']}")
        ok("Root sitemap.xml unchanged for real entities")
    for entity in entities:
        check_entity(entity)
    if not NOT_FOUND.exists():
        fail("Not-found page missing")
    nf = NOT_FOUND.read_text(encoding="utf-8")
    if 'meta name="robots" content="noindex, nofollow"' not in nf:
        fail("Not-found page must be noindex,nofollow")
    ok("Not-found fail-closed page present")
    print(f"[p5-real-content-entity-ssg-check] All checks passed ({pass_count} assertions)")


if __name__ == "__main__":
    main()
