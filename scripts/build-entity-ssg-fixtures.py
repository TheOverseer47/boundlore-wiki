#!/usr/bin/env python3
"""P5-E.9F.2 — Python fallback runner for entity SSG generator (same contract as .mjs)."""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "qa" / "fixtures" / "entity-ssg-fixtures.json"
OUTPUT_BASE = ROOT / "wiki" / "post"
SITEMAP_OUT = ROOT / "qa" / "entity-ssg-sitemap.fixture.xml"
NOT_FOUND_OUT = OUTPUT_BASE / "_ssg-not-found" / "index.html"
CANONICAL_BASE = "https://boundlore.com"
GENERATOR_VERSION = "p5-e9f2"
SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
SLUG_BLOCKLIST = re.compile(r"^(qa|test|p5|fixture|draft|pending|deleted|contribution)")
FORBIDDEN = re.compile(
    r"BLMETA|search_text|search_vector|service_role|SUPABASE_SERVICE_ROLE|"
    r"@[a-z0-9.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b",
    re.I,
)
HUB_MAP = {
    "creatures": "/wiki/creatures/",
    "items": "/wiki/items/",
    "biomes": "/wiki/biomes/",
    "locations": "/wiki/locations/",
    "resources": "/wiki/resources/",
    "guides": "/wiki/guides/",
    "guilds": "/wiki/guilds/",
    "lore": "/wiki/lore/",
}


def fail(msg: str) -> None:
    print(f"[build-entity-ssg-fixtures] ERROR: {msg}", file=sys.stderr)
    sys.exit(1)


def truncate(text: str, max_len: int) -> str:
    s = (text or "").strip()
    if len(s) <= max_len:
        return s
    return s[: max_len - 1].rstrip() + "…"


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
    if entity["content_origin"] not in {"ssg_fixture", "prototype_fixture"}:
        fail(f"{label} content_origin not allowed")
    slug = entity["canonical_slug"]
    if not SLUG_RE.match(slug) or SLUG_BLOCKLIST.match(slug):
        fail(f"{label} invalid or blocked slug")
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
    related = ""
    if entity.get("relations_summary"):
        links = "\n".join(
            f'          <li><a href="/wiki/post/{html.escape(r.split(":", 1)[-1])}/">{html.escape(r.split(":", 1)[-1].replace("-", " "))}</a></li>'
            for r in entity["relations_summary"]
        )
        related = f"""      <section class="bl-ssg-related" aria-label="Related entries">
        <h2>Related</h2>
        <ul>
{links}
        </ul>
      </section>
"""
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
    return f"""<!-- generated by scripts/build-entity-ssg-fixtures.mjs {GENERATOR_VERSION} -->
<!DOCTYPE html>
<html lang="en" data-bl-ssg="1" data-bl-canonical-slug="{html.escape(slug, quote=True)}" data-bl-ssg-source="fixture-generator">
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
    .bl-ssg-related {{ margin-top: 28px; }}
    .bl-ssg-related h2 {{ font-size: 1.1rem; margin-bottom: 10px; }}
    .bl-ssg-related ul {{ padding-left: 1.2rem; }}
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

  <div class="article-layout bl-post-layout" id="blSsgHydrateRoot" data-bl-ssg-hydrate="1" data-bl-ssg-source="fixture-generator" data-bl-canonical-slug="{html.escape(slug, quote=True)}">
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

{related}
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
    return f"""<!-- generated by scripts/build-entity-ssg-fixtures.mjs {GENERATOR_VERSION} -->
<!DOCTYPE html>
<html lang="en" data-bl-ssg="1" data-bl-ssg-not-found="1">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="The requested wiki entry was not found." />
  <meta name="robots" content="noindex, nofollow" />
  <link rel="canonical" href="{canonical}" />
  <title>Entry Not Found – BoundLore Wiki</title>
  <link rel="stylesheet" href="../../../css/style.css" />
</head>
<body>
  <main class="article-content" style="max-width:720px;margin:80px auto;padding:24px;">
    <h1>Entry Not Found</h1>
    <p>The requested wiki entry is not available as static SSG output.</p>
    <p><a href="/wiki/browse/">Return to Browse</a></p>
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
        "<!-- P5-E.9F.2 fixture entity sitemap — evidence only, not production sitemap.xml -->\n"
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join(urls)
        + "\n</urlset>\n"
    )


def main() -> None:
    data = json.loads(FIXTURE.read_text(encoding="utf-8"))
    entities = data.get("entities") or []
    if len(entities) < 1:
        fail("No entities")
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
        print(f"[build-entity-ssg-fixtures] Wrote {out_file.relative_to(ROOT)}")
    NOT_FOUND_OUT.parent.mkdir(parents=True, exist_ok=True)
    NOT_FOUND_OUT.write_text(render_not_found(), encoding="utf-8")
    print(f"[build-entity-ssg-fixtures] Wrote {NOT_FOUND_OUT.relative_to(ROOT)}")
    SITEMAP_OUT.write_text(build_sitemap(entities), encoding="utf-8")
    print(f"[build-entity-ssg-fixtures] Wrote {SITEMAP_OUT.relative_to(ROOT)}")
    print(f"[build-entity-ssg-fixtures] Done — generated {len(entities)} entity pages + not-found + sitemap")


if __name__ == "__main__":
    main()
