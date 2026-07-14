#!/usr/bin/env python3
"""P5-E.9F.6 — Generate real-content entity SSG HTML from sanitized export JSON."""
import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE_IN = ROOT / "qa" / "fixtures" / "real-content-entity-ssg-export.json"
OUTPUT_BASE = ROOT / "wiki" / "post"
SITEMAP_OUT = ROOT / "qa" / "real-content-entity-sitemap.fixture.xml"
NOT_FOUND_OUT = OUTPUT_BASE / "_ssg-not-found" / "index.html"
POST_404_OUT = OUTPUT_BASE / "404.html"
QUARANTINE_DIR = ROOT / "qa" / "fixtures" / "ssg-entity-pages"
CANONICAL_BASE = "https://boundlore.com"
GENERATOR_VERSION = "p5-e9f6"
FIXTURE_SLUGS = {
    "ember-salamander",
    "volcanic-heat-charm",
    "cinder-basalt-flats",
    "ashwind-harbor",
    "ironroot-shard",
    "explorers-league-hall",
    "qa-ssg-biome-prototype",
    "qa-ssg-item-prototype",
    "qa-ssg-creature-prototype",
}
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SLUG_BLOCKLIST = re.compile(r"(qa|test|fixture|seed|p5e9e4|prototype|backbone)", re.I)
FORBIDDEN = re.compile(
    r"BLMETA|search_text|search_vector|service_role|SUPABASE_SERVICE_ROLE|"
    r"@[a-z0-9.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.I,
)


def fail(msg: str) -> None:
    print(f"[build-real-entity-ssg] ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def truncate(text: str, max_len: int) -> str:
    s = (text or "").strip()
    if len(s) <= max_len:
        return s
    return s[: max_len - 1].rstrip() + "…"


def quarantine_fixtures() -> None:
    QUARANTINE_DIR.mkdir(parents=True, exist_ok=True)
    moved = 0
    for slug in sorted(FIXTURE_SLUGS):
        src = OUTPUT_BASE / slug
        if not src.exists():
            continue
        dest = QUARANTINE_DIR / slug
        if dest.exists():
            shutil.rmtree(dest)
        shutil.move(str(src), str(dest))
        print(f"[build-real-entity-ssg] Quarantined {src.relative_to(ROOT)} -> {dest.relative_to(ROOT)}")
        moved += 1
    if moved:
        print(f"[build-real-entity-ssg] Quarantined {moved} fixture page(s)")


def validate_entity(entity: dict, index: int) -> None:
    required = [
        "canonical_slug", "title", "category", "entity_domain", "entity_subtype",
        "excerpt", "body_html_sanitized", "updated_at", "published_at",
        "content_origin", "status", "canonical_url", "breadcrumbs",
    ]
    label = f"entities[{index}]"
    for field in required:
        if not entity.get(field):
            fail(f"{label} missing required field: {field}")
    if entity["status"] != "published":
        fail(f"{label} status must be published")
    if entity["content_origin"] != "real_content_export":
        fail(f"{label} content_origin must be real_content_export")
    slug = entity["canonical_slug"]
    if not SLUG_RE.match(slug) or SLUG_BLOCKLIST.search(slug):
        fail(f"{label} invalid or blocked slug")
    if slug in FIXTURE_SLUGS:
        fail(f"{label} fixture slug must not be in real export")
    expected = f"{CANONICAL_BASE}/wiki/post/{slug}/"
    if entity["canonical_url"] != expected:
        fail(f"{label} canonical_url mismatch")
    body = entity["body_html_sanitized"]
    if FORBIDDEN.search(body) or "<script" in body.lower():
        fail(f"{label} unsafe body")
    if FORBIDDEN.search(entity["excerpt"]) or FORBIDDEN.search(entity["title"]):
        fail(f"{label} leak in title/excerpt")


def render_page(entity: dict) -> str:
    slug = entity["canonical_slug"]
    title = entity["title"]
    meta_desc = html.escape(entity["excerpt"], quote=True)
    og_desc = html.escape(truncate(entity["excerpt"], 120), quote=True)
    tw_desc = html.escape(truncate(entity["excerpt"], 100), quote=True)
    canonical = html.escape(entity["canonical_url"], quote=True)
    page_title = html.escape(f"{title} – BoundLore Wiki")
    og_title = html.escape(f"{title} – BoundLore Wiki", quote=True)
    image = html.escape(entity.get("image_url") or f"{CANONICAL_BASE}/public/images/social-preview.png", quote=True)
    breadcrumb_html = " &rsaquo; ".join(
        html.escape(c["name"]) if i == len(entity["breadcrumbs"]) - 1
        else f'<a href="{html.escape(c["url"], quote=True)}">{html.escape(c["name"])}</a>'
        for i, c in enumerate(entity["breadcrumbs"])
    )
    badges = "\n".join([
        f'        <span class="bl-ssg-badge">{html.escape("Category: " + entity["category"])}</span>',
        f'        <span class="bl-ssg-badge">{html.escape("Domain: " + entity["entity_domain"])}</span>',
        f'        <span class="bl-ssg-badge">{html.escape("Subtype: " + entity["entity_subtype"])}</span>',
    ])
    cw = json.dumps({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": title,
        "description": truncate(entity["excerpt"], 160),
        "url": entity["canonical_url"],
        "datePublished": entity["published_at"],
        "dateModified": entity["updated_at"],
        "image": entity.get("image_url") or f"{CANONICAL_BASE}/public/images/social-preview.png",
        "keywords": f"{entity['category']}, {entity['entity_domain']}, {entity['entity_subtype']}",
        "isPartOf": {"@type": "WebSite", "name": "BoundLore", "url": f"{CANONICAL_BASE}/"},
    }, indent=2)
    bc = json.dumps({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": c["name"], "item": c["url"]}
            for i, c in enumerate(entity["breadcrumbs"])
        ],
    }, indent=2)
    return f"""<!-- generated by scripts/build-real-entity-ssg.py {GENERATOR_VERSION} -->
<!DOCTYPE html>
<html lang="en" data-bl-ssg="1" data-bl-canonical-slug="{html.escape(slug, quote=True)}" data-bl-ssg-source="real-content-generator">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="{meta_desc}" />
  <meta name="robots" content="noindex, follow" />
  <link rel="canonical" href="{canonical}" />
  <meta property="og:title" content="{og_title}" />
  <meta property="og:description" content="{og_desc}" />
  <meta property="og:type" content="article" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{image}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{og_title}" />
  <meta name="twitter:description" content="{tw_desc}" />
  <meta name="twitter:image" content="{image}" />
  <title>{page_title}</title>
  <link rel="icon" type="image/jpeg" href="/public/images/icon.jpg" />
  <link rel="stylesheet" href="../../../css/style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
  <script src="/js/error-reporter.js?v=p5-e9c2"></script>
  <script type="application/ld+json">
{cw}
  </script>
  <script type="application/ld+json">
{bc}
  </script>
  <style>
    .bl-ssg-badges {{ display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 16px; }}
    .bl-ssg-badge {{ padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }}
    .bl-ssg-excerpt {{ font-size: 1.05rem; color: #dde1ef; margin-bottom: 20px; line-height: 1.55; }}
    .bl-ssg-body {{ line-height: 1.6; color: #e8ebf5; }}
    .bl-ssg-hydrate-slot {{ margin-top: 28px; padding: 16px; border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; color: #9aa8bc; font-size: 0.85rem; }}
  </style>
</head>
<body>
  <nav class="navbar" id="navbar">
    <div class="nav-container">
      <a href="/" class="nav-logo">
        <img src="/public/images/icon.jpg" alt="BoundLore" class="nav-icon" />
        <span class="logo-text">Bound<span class="accent">Lore</span></span>
      </a>
      <ul class="nav-links" id="navLinks">
        <li><a href="/">Home</a></li>
        <li><a href="/wiki/creatures/">Creatures</a></li>
        <li><a href="/wiki/biomes/">Biomes</a></li>
        <li><a href="/wiki/items/">Items</a></li>
        <li><a href="/wiki/browse/">Browse</a></li>
      </ul>
    </div>
  </nav>

  <div class="article-layout bl-post-layout" id="blSsgHydrateRoot" data-bl-ssg-hydrate="1" data-bl-ssg-source="real-content-generator" data-bl-canonical-slug="{html.escape(slug, quote=True)}">
    <article class="article-content bl-post-main">
      <p class="breadcrumb">{breadcrumb_html}</p>

      <h1>{html.escape(title)}</h1>

      <div class="bl-ssg-badges">
{badges}
      </div>

      <p class="bl-ssg-excerpt">{html.escape(entity["excerpt"])}</p>

      <div class="bl-ssg-body">
{entity["body_html_sanitized"]}
      </div>

      <div class="bl-ssg-hydrate-slot" id="blSsgHydrateRelated" aria-label="CSR hydration placeholder">
        Comments and reactions may load here after hydration. SEO core content is fully static above.
      </div>
    </article>
  </div>

  <footer class="footer"><div class="footer-bottom"><p>&copy; 2026 BoundLore Community &middot; <a href="/wiki/imprint/">Imprint</a> &middot; <a href="/wiki/privacy/">Privacy Policy</a></p></div></footer>
</body>
</html>
"""


def render_not_found() -> str:
    canonical = f"{CANONICAL_BASE}/wiki/post/_ssg-not-found/"
    return f"""<!-- generated by scripts/build-real-entity-ssg.py {GENERATOR_VERSION} -->
<!DOCTYPE html>
<html lang="en" data-bl-ssg="1" data-bl-ssg-not-found="1" data-bl-ssg-source="real-content-generator">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="The requested wiki entry was not found." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="{html.escape(canonical)}" />
  <title>Entry Not Found – BoundLore Wiki</title>
  <link rel="stylesheet" href="../../../css/style.css" />
</head>
<body>
  <main class="article-content" style="max-width:720px;margin:80px auto;padding:24px;">
    <h1>Entry Not Found</h1>
    <p>The requested wiki entry is not available as static SSG output.</p>
    <p><a href="/">Return to Home</a> · <a href="/wiki/browse/">Browse</a> · <a href="/wiki/search/">Search</a></p>
  </main>
</body>
</html>
"""


def render_post_404() -> str:
    return f"""<!-- generated by scripts/build-real-entity-ssg.py {GENERATOR_VERSION} -->
<!DOCTYPE html>
<html lang="en" data-bl-ssg="1" data-bl-ssg-not-found="1" data-bl-cloudflare-404="1">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="The requested wiki entry was not found." />
  <meta name="robots" content="noindex, nofollow" />
  <title>Entry Not Found – BoundLore Wiki</title>
  <link rel="stylesheet" href="/css/style.css" />
</head>
<body>
  <main class="article-content" style="max-width:720px;margin:80px auto;padding:24px;">
    <h1>Entry Not Found</h1>
    <p>The requested wiki entry is not available.</p>
    <p><a href="/">Return to Home</a> · <a href="/wiki/browse/">Browse</a> · <a href="/wiki/search/">Search</a></p>
  </main>
</body>
</html>
"""


def build_sitemap(entities: list) -> str:
    urls = []
    for entity in sorted(entities, key=lambda e: e["canonical_slug"]):
        lastmod = entity["updated_at"][:10]
        urls.append(
            f"  <url>\n    <loc>{html.escape(entity['canonical_url'])}</loc>\n"
            f"    <lastmod>{lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n"
            f"    <priority>0.7</priority>\n  </url>"
        )
    return (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        "<!-- P5-E.9F.6 real-content entity sitemap — evidence only, not production sitemap.xml -->\n"
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )


def assert_no_fixture_slugs_in_output() -> None:
    for slug in FIXTURE_SLUGS:
        if (OUTPUT_BASE / slug).exists():
            fail(f"Fixture slug still in production-like path: {slug}")


def main() -> None:
    if not FIXTURE_IN.exists():
        fail(f"Missing sanitized export: {FIXTURE_IN}")
    data = json.loads(FIXTURE_IN.read_text(encoding="utf-8"))
    entities = data.get("entities") or []
    if len(entities) < 1:
        fail("No entities in export")
    quarantine_fixtures()
    slugs = set()
    for i, entity in enumerate(entities):
        validate_entity(entity, i)
        if entity["canonical_slug"] in slugs:
            fail("duplicate slug")
        slugs.add(entity["canonical_slug"])
        out_dir = OUTPUT_BASE / entity["canonical_slug"]
        out_dir.mkdir(parents=True, exist_ok=True)
        out_file = out_dir / "index.html"
        out_file.write_text(render_page(entity), encoding="utf-8")
        print(f"[build-real-entity-ssg] Wrote {out_file.relative_to(ROOT)}")
    NOT_FOUND_OUT.parent.mkdir(parents=True, exist_ok=True)
    NOT_FOUND_OUT.write_text(render_not_found(), encoding="utf-8")
    print(f"[build-real-entity-ssg] Wrote {NOT_FOUND_OUT.relative_to(ROOT)}")
    POST_404_OUT.write_text(render_post_404(), encoding="utf-8")
    print(f"[build-real-entity-ssg] Wrote {POST_404_OUT.relative_to(ROOT)}")
    SITEMAP_OUT.write_text(build_sitemap(entities), encoding="utf-8")
    print(f"[build-real-entity-ssg] Wrote {SITEMAP_OUT.relative_to(ROOT)}")
    assert_no_fixture_slugs_in_output()
    print(f"[build-real-entity-ssg] Done — generated {len(entities)} real entity pages + not-found + sitemap")


if __name__ == "__main__":
    main()
