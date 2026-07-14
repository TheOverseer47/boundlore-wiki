#!/usr/bin/env python3
"""P5-E.9F.7 — Real-content entity SEO evidence re-run (local/static only)."""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORT = ROOT / "qa" / "fixtures" / "real-content-entity-ssg-export.json"
SITEMAP = ROOT / "qa" / "real-content-entity-sitemap.fixture.xml"
PROD_SITEMAP = ROOT / "sitemap.xml"
NOT_FOUND = ROOT / "wiki" / "post" / "_ssg-not-found" / "index.html"
POST_DIR = ROOT / "wiki" / "post"
QUARANTINE = ROOT / "qa" / "fixtures" / "ssg-entity-pages"
EXPECTED_SLUGS = [
    "ogre-mage",
    "smought",
    "staff-of-fire-2f316b0d",
    "swamplands-94dadc07",
    "swamplands-near-a-campfire-787bbd19",
]
FIXTURE_SLUGS = {
    "ember-salamander", "volcanic-heat-charm", "cinder-basalt-flats",
    "ashwind-harbor", "ironroot-shard", "explorers-league-hall",
    "qa-ssg-biome-prototype", "qa-ssg-item-prototype", "qa-ssg-creature-prototype",
}
LEAK_PATTERNS = [
    (re.compile(r"BLMETA", re.I), "BLMETA"),
    (re.compile(r"search_text|search_vector", re.I), "search field"),
    (re.compile(r"service_role|SUPABASE_SERVICE_ROLE", re.I), "service role"),
    (re.compile(r"password|passwd|secret|token", re.I), "secret keyword"),
    (re.compile(r"supabase\.co/storage", re.I), "supabase storage url"),
    (re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"), "email"),
    (re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I), "uuid"),
    (re.compile(r"\bon[a-z]+\s*=", re.I), "event handler"),
    (re.compile(r"javascript:", re.I), "javascript url"),
    (re.compile(r"<\s*iframe\b", re.I), "iframe"),
    (re.compile(r"<\s*form\b", re.I), "form"),
    (re.compile(r"<\s*object\b", re.I), "object"),
    (re.compile(r"<\s*embed\b", re.I), "embed"),
]
CSR_SHELL = re.compile(r"Loading post|csr-shell|client-side only", re.I)
pass_count = 0
matrix_rows: list[dict] = []


def fail(msg: str) -> None:
    print(f"[p5-real-content-entity-seo-evidence-rerun] FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def ok(msg: str) -> None:
    global pass_count
    pass_count += 1
    print(f"[p5-real-content-entity-seo-evidence-rerun] PASS: {msg}")


def scan_leaks(text: str, label: str) -> None:
    for pat, name in LEAK_PATTERNS:
        if pat.search(text):
            fail(f"{label}: {name} leak detected")


def check_export_json() -> list:
    if not EXPORT.exists():
        fail(f"Missing {EXPORT}")
    raw = EXPORT.read_text(encoding="utf-8")
    scan_leaks(raw, "export json")
    data = json.loads(raw)
    entities = data.get("entities") or []
    slugs = [e["canonical_slug"] for e in entities]
    for slug in EXPECTED_SLUGS:
        if slug not in slugs:
            fail(f"Export JSON missing slug {slug}")
    if len(slugs) != 5:
        fail(f"Expected exactly 5 entities, got {len(slugs)}")
    for entity in entities:
        if entity.get("content_origin") != "real_content_export":
            fail(f"{entity['canonical_slug']} wrong content_origin")
        for field in ("canonical_slug", "title", "excerpt", "body_html_sanitized", "canonical_url"):
            if not entity.get(field):
                fail(f"{entity['canonical_slug']} missing {field}")
        scan_leaks(json.dumps(entity, ensure_ascii=False), f"export entity {entity['canonical_slug']}")
    ok("Export JSON safety — 5 slugs, no leaks")
    return entities


def check_page(slug: str, title: str) -> dict:
    path = POST_DIR / slug / "index.html"
    if not path.exists():
        fail(f"Missing page {path}")
    html = path.read_text(encoding="utf-8")
    scan_leaks(html, f"html {slug}")
    if CSR_SHELL.search(html):
        fail(f"{slug}: CSR-only shell indicator")
    canonical = f"https://boundlore.com/wiki/post/{slug}/"
    checks = {
        "title": "<title>" in html and title in html,
        "description": 'meta name="description"' in html,
        "canonical": canonical in html,
        "og:title": 'property="og:title"' in html,
        "og:description": 'property="og:description"' in html,
        "og:url": 'property="og:url"' in html,
        "twitter:title": 'name="twitter:title"' in html,
        "twitter:description": 'name="twitter:description"' in html,
        "robots": 'meta name="robots" content="noindex, follow"' in html,
        "h1": len(re.findall(r"<h1\b", html, re.I)) == 1,
        "static_body": "bl-ssg-body" in html and len(re.findall(r"bl-ssg-body[\s\S]*?</div>", html, re.I)[0]) > 40,
        "entity_type": "bl-ssg-badge" in html or "entity_subtype" in html or "Subtype:" in html,
        "json_ld": "CreativeWork" in html and "BreadcrumbList" in html,
        "real_content_source": 'data-bl-ssg-source="real-content-generator"' in html,
        "no_loading": "Loading post" not in html,
    }
    for name, passed in checks.items():
        if not passed:
            fail(f"{slug} failed SEO check: {name}")
    ok(f"Deep SEO check {slug}")
    return {
        "slug": slug,
        "http": "pending",
        "title": "PASS",
        "description": "PASS",
        "canonical": "PASS",
        "og_twitter": "PASS",
        "h1": "PASS",
        "static_body": "PASS",
        "no_leak": "PASS",
        "csr_free": "PASS",
    }


def check_sitemap() -> None:
    if not SITEMAP.exists():
        fail("Missing real-content sitemap")
    text = SITEMAP.read_text(encoding="utf-8")
    scan_leaks(text, "sitemap")
    locs = re.findall(r"<loc>([^<]+)</loc>", text)
    if len(locs) != 5:
        fail(f"Sitemap must have 5 URLs, got {len(locs)}")
    expected = [f"https://boundlore.com/wiki/post/{s}/" for s in sorted(EXPECTED_SLUGS)]
    if locs != expected:
        fail(f"Sitemap URLs not sorted/complete: {locs}")
    for slug in FIXTURE_SLUGS:
        if slug in text:
            fail(f"Fixture slug in sitemap: {slug}")
    if PROD_SITEMAP.exists():
        prod = PROD_SITEMAP.read_text(encoding="utf-8")
        for slug in EXPECTED_SLUGS:
            if f"/wiki/post/{slug}/" in prod:
                fail(f"Production sitemap includes real entity {slug}")
    ok("Sitemap evidence — 5 real URLs, sorted, no fixtures")


def check_quarantine() -> None:
    for slug in FIXTURE_SLUGS:
        if (POST_DIR / slug).exists():
            fail(f"Fixture slug still in wiki/post/: {slug}")
    quarantined = sum(1 for s in FIXTURE_SLUGS if (QUARANTINE / s).exists())
    ok(f"Fixture quarantine — none in wiki/post/, {quarantined} in qa/fixtures/ssg-entity-pages/")


def check_not_found() -> None:
    if not NOT_FOUND.exists():
        fail("Missing _ssg-not-found page")
    nf = NOT_FOUND.read_text(encoding="utf-8")
    if 'meta name="robots" content="noindex, nofollow"' not in nf:
        fail("_ssg-not-found must be noindex,nofollow")
    scan_leaks(nf, "not-found page")
    ok("Not-found robots noindex,nofollow")


def run_base_qa() -> None:
    script = ROOT / "qa" / "p5-real-content-entity-ssg-check.py"
    result = subprocess.run([sys.executable, str(script)], capture_output=True, text=True)
    print(result.stdout, end="")
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        fail("Base p5-real-content-entity-ssg-check did not pass")


def print_matrix() -> None:
    print("\n[p5-real-content-entity-seo-evidence-rerun] Entity Slug Matrix:")
    print("| Slug | Title | Description | Canonical | OG/Twitter | H1 | Static Body | No-Leak | CSR-Free Core |")
    print("|------|-------|-------------|-----------|------------|----|-------------|---------|---------------|")
    for row in matrix_rows:
        print(
            f"| {row['slug']} | {row['title']} | {row['description']} | {row['canonical']} | "
            f"{row['og_twitter']} | {row['h1']} | {row['static_body']} | {row['no_leak']} | {row['csr_free']} |"
        )


def main() -> None:
    global matrix_rows
    run_base_qa()
    ok("Static QA re-run (p5-real-content-entity-ssg-check) PASS")
    entities = check_export_json()
    title_map = {e["canonical_slug"]: e["title"] for e in entities}
    for slug in EXPECTED_SLUGS:
        matrix_rows.append(check_page(slug, title_map[slug]))
    check_sitemap()
    check_quarantine()
    check_not_found()
    print_matrix()
    print(f"\n[p5-real-content-entity-seo-evidence-rerun] All checks passed ({pass_count} assertions)")


if __name__ == "__main__":
    main()
