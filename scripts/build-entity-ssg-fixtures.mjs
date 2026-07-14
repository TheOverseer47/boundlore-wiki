#!/usr/bin/env node
/**
 * P5-E.9F.2 — Fixture-based Entity SSG generator.
 * Input: qa/fixtures/entity-ssg-fixtures.json (default)
 *        qa/fixtures/p5-entity-ssg-fixtures.json (--legacy)
 * Output: wiki/post/<canonical_slug>/index.html
 *         qa/entity-ssg-sitemap.fixture.xml
 *         wiki/post/_ssg-not-found/index.html
 * No network. No DB. No .env.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_FIXTURE = path.join(ROOT, "qa", "fixtures", "entity-ssg-fixtures.json");
const LEGACY_FIXTURE = path.join(ROOT, "qa", "fixtures", "p5-entity-ssg-fixtures.json");
const OUTPUT_BASE = path.join(ROOT, "wiki", "post");
const SITEMAP_OUT = path.join(ROOT, "qa", "entity-ssg-sitemap.fixture.xml");
const NOT_FOUND_OUT = path.join(OUTPUT_BASE, "_ssg-not-found", "index.html");
const CANONICAL_BASE = "https://boundlore.com";

const REQUIRED_FIELDS = [
  "canonical_slug",
  "title",
  "category",
  "entity_domain",
  "entity_subtype",
  "excerpt",
  "body_html_sanitized",
  "updated_at",
  "published_at",
  "content_origin",
  "status",
  "canonical_url",
  "breadcrumbs",
];

const ALLOWED_CONTENT_ORIGINS = new Set(["ssg_fixture", "prototype_fixture"]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SLUG_BLOCKLIST_RE = /^(qa|test|p5|fixture|draft|pending|deleted|contribution)/;
const FORBIDDEN_HTML_RE =
  /BLMETA|search_text|search_vector|service_role|SUPABASE_SERVICE_ROLE|@[a-z0-9.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const DEFAULT_IMAGE = CANONICAL_BASE + "/public/images/social-preview.png";
const GENERATOR_VERSION = "p5-e9f2";

function fail(message) {
  console.error("[build-entity-ssg-fixtures] ERROR:", message);
  process.exit(1);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function truncate(text, max) {
  const s = String(text || "").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1).trimEnd() + "…";
}

function validateSlug(slug) {
  if (!slug || typeof slug !== "string") return "canonical_slug missing";
  if (slug.includes("..") || slug.includes("/") || slug.includes("\\")) return "unsafe slug path";
  if (slug !== slug.toLowerCase()) return "slug must be lowercase";
  if (!SLUG_RE.test(slug)) return "slug must match [a-z0-9-]";
  if (SLUG_BLOCKLIST_RE.test(slug)) return "slug blocked (qa/test/fixture/draft/pending/deleted)";
  if (slug.startsWith("_")) return "slug must not start with underscore except reserved _ssg-not-found";
  return null;
}

function validateNoLeak(text, label) {
  const s = String(text || "");
  if (FORBIDDEN_HTML_RE.test(s)) return label + " contains forbidden leak pattern";
  if (/\b(draft|pending|deleted)\b/i.test(s) && /\bstatus\b/i.test(s)) {
    return label + " contains draft/pending/deleted status hint";
  }
  return null;
}

function validateBodyHtml(html) {
  const body = String(html || "");
  if (!body.trim()) return "body_html_sanitized empty";
  if (/<script\b/i.test(body)) return "script tag in body";
  if (/\bon\w+\s*=/i.test(body)) return "inline event handler in body";
  if (/javascript:/i.test(body)) return "javascript: URL in body";
  if (/<!--\s*blmeta/i.test(body)) return "BLMETA in body";
  return validateNoLeak(body, "body_html_sanitized");
}

function validateEntity(entity, index) {
  const label = "entities[" + index + "]";

  for (const field of REQUIRED_FIELDS) {
    if (entity[field] === undefined || entity[field] === null || entity[field] === "") {
      return label + " missing required field: " + field;
    }
  }

  if (entity.status !== "published") {
    return label + " status must be published";
  }

  if (!ALLOWED_CONTENT_ORIGINS.has(entity.content_origin)) {
    return label + " content_origin not allowed";
  }

  const slugErr = validateSlug(entity.canonical_slug);
  if (slugErr) return label + " " + slugErr;

  const expectedCanonical = CANONICAL_BASE + "/wiki/post/" + entity.canonical_slug + "/";
  if (entity.canonical_url !== expectedCanonical) {
    return label + " canonical_url mismatch";
  }

  if (!Array.isArray(entity.breadcrumbs) || entity.breadcrumbs.length < 2) {
    return label + " breadcrumbs invalid";
  }

  const bodyErr = validateBodyHtml(entity.body_html_sanitized);
  if (bodyErr) return label + " " + bodyErr;

  const excerptErr = validateNoLeak(entity.excerpt, "excerpt");
  if (excerptErr) return label + " " + excerptErr;

  const titleErr = validateNoLeak(entity.title, "title");
  if (titleErr) return label + " " + titleErr;

  return null;
}

function hubPathForCategory(category) {
  const map = {
    creatures: "/wiki/creatures/",
    items: "/wiki/items/",
    biomes: "/wiki/biomes/",
    locations: "/wiki/locations/",
    resources: "/wiki/resources/",
    guides: "/wiki/guides/",
    guilds: "/wiki/guilds/",
    lore: "/wiki/lore/",
  };
  return map[String(category || "").toLowerCase()] || "/wiki/browse/";
}

function buildBreadcrumbHtml(breadcrumbs) {
  const items = breadcrumbs.map(function (crumb, idx) {
    const name = escapeHtml(crumb.name);
    const isLast = idx === breadcrumbs.length - 1;
    if (isLast) return name;
    const href = escapeAttr(crumb.url || "#");
    return '<a href="' + href + '">' + name + "</a>";
  });
  return items.join(" &rsaquo; ");
}

function buildBadges(entity) {
  const badges = [
    "Category: " + entity.category,
    "Domain: " + entity.entity_domain,
    "Subtype: " + entity.entity_subtype,
  ];
  if (entity.evidence_tier) badges.push("Evidence: " + entity.evidence_tier);
  if (entity.completeness) badges.push("Completeness: " + entity.completeness);
  return badges
    .map(function (text) {
      return '        <span class="bl-ssg-badge">' + escapeHtml(text) + "</span>";
    })
    .join("\n");
}

function buildRelatedHtml(entity) {
  const related = Array.isArray(entity.relations_summary) ? entity.relations_summary : [];
  if (related.length === 0) return "";
  const links = related
    .map(function (rel) {
      const parts = String(rel).split(":");
      const slug = parts.length > 1 ? parts.slice(1).join(":") : parts[0];
      const label = escapeHtml(slug.replace(/-/g, " "));
      const href = "/wiki/post/" + encodeURIComponent(slug) + "/";
      return '          <li><a href="' + href + '">' + label + "</a></li>";
    })
    .join("\n");
  return (
    '      <section class="bl-ssg-related" aria-label="Related entries">\n' +
    "        <h2>Related</h2>\n" +
    "        <ul>\n" +
    links +
    "\n        </ul>\n" +
    "      </section>\n"
  );
}

function buildCreativeWorkJson(entity) {
  const image = entity.image_url || DEFAULT_IMAGE;
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: entity.title,
    description: truncate(entity.excerpt, 160),
    url: entity.canonical_url,
    datePublished: entity.published_at,
    dateModified: entity.updated_at,
    image: image,
    keywords: [entity.category, entity.entity_domain, entity.entity_subtype].join(", "),
    isPartOf: { "@type": "WebSite", name: "BoundLore", url: CANONICAL_BASE + "/" },
  };
}

function buildBreadcrumbJson(entity) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entity.breadcrumbs.map(function (crumb, idx) {
      return {
        "@type": "ListItem",
        position: idx + 1,
        name: crumb.name,
        item: crumb.url,
      };
    }),
  };
}

function renderPage(entity) {
  const slug = entity.canonical_slug;
  const title = entity.title;
  const metaDesc = escapeAttr(entity.excerpt);
  const ogDesc = escapeAttr(truncate(entity.excerpt, 120));
  const twDesc = escapeAttr(truncate(entity.excerpt, 100));
  const canonical = escapeAttr(entity.canonical_url);
  const pageTitle = escapeHtml(title + " – BoundLore Wiki");
  const ogTitle = escapeAttr(title + " – BoundLore Wiki");
  const image = escapeAttr(entity.image_url || DEFAULT_IMAGE);
  const hubPath = hubPathForCategory(entity.category);
  const breadcrumbHtml = buildBreadcrumbHtml(entity.breadcrumbs);
  const badgesHtml = buildBadges(entity);
  const relatedHtml = buildRelatedHtml(entity);
  const creativeWork = JSON.stringify(buildCreativeWorkJson(entity), null, 2);
  const breadcrumbLd = JSON.stringify(buildBreadcrumbJson(entity), null, 2);

  return (
    "<!-- generated by scripts/build-entity-ssg-fixtures.mjs " +
    GENERATOR_VERSION +
    " -->\n" +
    '<!DOCTYPE html>\n' +
    '<html lang="en" data-bl-ssg="1" data-bl-canonical-slug="' +
    escapeAttr(slug) +
    '" data-bl-ssg-source="fixture-generator">\n' +
    "<head>\n" +
    '  <meta charset="UTF-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
    '  <meta name="description" content="' +
    metaDesc +
    '" />\n' +
    '  <meta name="robots" content="noindex, follow" />\n' +
    '  <link rel="canonical" href="' +
    canonical +
    '" />\n' +
    '  <meta property="og:title" content="' +
    ogTitle +
    '" />\n' +
    '  <meta property="og:description" content="' +
    ogDesc +
    '" />\n' +
    '  <meta property="og:type" content="article" />\n' +
    '  <meta property="og:url" content="' +
    canonical +
    '" />\n' +
    '  <meta property="og:image" content="' +
    image +
    '" />\n' +
    '  <meta name="twitter:card" content="summary_large_image" />\n' +
    '  <meta name="twitter:title" content="' +
    ogTitle +
    '" />\n' +
    '  <meta name="twitter:description" content="' +
    twDesc +
    '" />\n' +
    '  <meta name="twitter:image" content="' +
    image +
    '" />\n' +
    "  <title>" +
    pageTitle +
    "</title>\n" +
    '  <link rel="icon" type="image/jpeg" href="/public/images/icon.jpg" />\n' +
    '  <link rel="stylesheet" href="../../../css/style.css" />\n' +
    '  <link rel="preconnect" href="https://fonts.googleapis.com" />\n' +
    '  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />\n' +
    '  <script src="/js/error-reporter.js?v=p5-e9c2"></script>\n' +
    '  <script type="application/ld+json">\n' +
    creativeWork +
    "\n  </script>\n" +
    '  <script type="application/ld+json">\n' +
    breadcrumbLd +
    "\n  </script>\n" +
    "  <style>\n" +
    "    .bl-ssg-badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 16px; }\n" +
    "    .bl-ssg-badge { padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }\n" +
    "    .bl-ssg-excerpt { font-size: 1.05rem; color: #dde1ef; margin-bottom: 20px; line-height: 1.55; }\n" +
    "    .bl-ssg-body { line-height: 1.6; color: #e8ebf5; }\n" +
    "    .bl-ssg-related { margin-top: 28px; }\n" +
    "    .bl-ssg-related h2 { font-size: 1.1rem; margin-bottom: 10px; }\n" +
    "    .bl-ssg-related ul { padding-left: 1.2rem; }\n" +
    "    .bl-ssg-hydrate-slot { margin-top: 28px; padding: 16px; border: 1px dashed rgba(255,255,255,0.15); border-radius: 8px; color: #9aa8bc; font-size: 0.85rem; }\n" +
    "  </style>\n" +
    "</head>\n" +
    "<body>\n" +
    '  <nav class="navbar" id="navbar">\n' +
    '    <div class="nav-container">\n' +
    '      <a href="/" class="nav-logo">\n' +
    '        <img src="/public/images/icon.jpg" alt="BoundLore" class="nav-icon" />\n' +
    '        <span class="logo-text">Bound<span class="accent">Lore</span></span>\n' +
    "      </a>\n" +
    '      <ul class="nav-links" id="navLinks">\n' +
    '        <li><a href="/">Home</a></li>\n' +
    '        <li><a href="/wiki/creatures/">Creatures</a></li>\n' +
    '        <li><a href="/wiki/biomes/">Biomes</a></li>\n' +
    '        <li><a href="/wiki/items/">Items</a></li>\n' +
    '        <li><a href="/wiki/browse/">Browse</a></li>\n' +
    "      </ul>\n" +
    "    </div>\n" +
    "  </nav>\n" +
    "\n" +
    '  <div class="article-layout bl-post-layout" id="blSsgHydrateRoot" data-bl-ssg-hydrate="1" data-bl-ssg-source="fixture-generator" data-bl-canonical-slug="' +
    escapeAttr(slug) +
    '">\n' +
    '    <article class="article-content bl-post-main">\n' +
    '      <p class="breadcrumb">' +
    breadcrumbHtml +
    "</p>\n" +
    "\n" +
    "      <h1>" +
    escapeHtml(title) +
    "</h1>\n" +
    "\n" +
    '      <div class="bl-ssg-badges">\n' +
    badgesHtml +
    "\n" +
    "      </div>\n" +
    "\n" +
    '      <p class="bl-ssg-excerpt">' +
    escapeHtml(entity.excerpt) +
    "</p>\n" +
    "\n" +
    '      <div class="bl-ssg-body">\n' +
    entity.body_html_sanitized +
    "\n" +
    "      </div>\n" +
    "\n" +
    relatedHtml +
    "\n" +
    '      <div class="bl-ssg-hydrate-slot" id="blSsgHydrateRelated" aria-label="CSR hydration placeholder">\n' +
    "        Comments and reactions may load here after hydration. SEO core content is fully static above.\n" +
    "      </div>\n" +
    "    </article>\n" +
    "  </div>\n" +
    "\n" +
    '  <footer class="footer"><div class="footer-bottom"><p>&copy; 2026 BoundLore Community &middot; <a href="/wiki/imprint/">Imprint</a> &middot; <a href="/wiki/privacy/">Privacy Policy</a></p></div></footer>\n' +
    "</body>\n" +
    "</html>\n"
  );
}

function renderNotFoundPage() {
  const canonical = CANONICAL_BASE + "/wiki/post/_ssg-not-found/";
  return (
    "<!-- generated by scripts/build-entity-ssg-fixtures.mjs " +
    GENERATOR_VERSION +
    " -->\n" +
    '<!DOCTYPE html>\n' +
    '<html lang="en" data-bl-ssg="1" data-bl-ssg-not-found="1">\n' +
    "<head>\n" +
    '  <meta charset="UTF-8" />\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n' +
    '  <meta name="description" content="The requested wiki entry was not found." />\n' +
    '  <meta name="robots" content="noindex, nofollow" />\n' +
    '  <link rel="canonical" href="' +
    canonical +
    '" />\n' +
    "  <title>Entry Not Found – BoundLore Wiki</title>\n" +
    '  <link rel="stylesheet" href="../../../css/style.css" />\n' +
    "</head>\n" +
    "<body>\n" +
    '  <main class="article-content" style="max-width:720px;margin:80px auto;padding:24px;">\n' +
    "    <h1>Entry Not Found</h1>\n" +
    "    <p>The requested wiki entry is not available as static SSG output.</p>\n" +
    '    <p><a href="/wiki/browse/">Return to Browse</a></p>\n' +
    "  </main>\n" +
    "</body>\n" +
    "</html>\n"
  );
}

function buildSitemapXml(entities) {
  const sorted = entities.slice().sort(function (a, b) {
    return a.canonical_slug.localeCompare(b.canonical_slug);
  });
  const urls = sorted
    .map(function (entity) {
      const loc = escapeHtml(entity.canonical_url);
      const lastmod = String(entity.updated_at || "").slice(0, 10);
      return (
        "  <url>\n" +
        "    <loc>" +
        loc +
        "</loc>\n" +
        (lastmod ? "    <lastmod>" + lastmod + "</lastmod>\n" : "") +
        "    <changefreq>weekly</changefreq>\n" +
        "    <priority>0.7</priority>\n" +
        "  </url>"
      );
    })
    .join("\n");

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<!-- P5-E.9F.2 fixture entity sitemap — evidence only, not production sitemap.xml -->\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls +
    "\n</urlset>\n"
  );
}

function resolveFixturePath() {
  const useLegacy = process.argv.includes("--legacy");
  const fixturePath = useLegacy ? LEGACY_FIXTURE : DEFAULT_FIXTURE;
  if (!fs.existsSync(fixturePath)) {
    fail("Fixture file not found: " + fixturePath);
  }
  return fixturePath;
}

function main() {
  const fixturePath = resolveFixturePath();
  const raw = fs.readFileSync(fixturePath, "utf8");
  const data = JSON.parse(raw);
  const entities = data && Array.isArray(data.entities) ? data.entities : null;
  if (!entities || entities.length === 0) {
    fail("No entities in fixture JSON");
  }

  console.log("[build-entity-ssg-fixtures] Reading", entities.length, "entities from", path.relative(ROOT, fixturePath));

  const slugSet = new Set();
  const outputs = [];

  for (let i = 0; i < entities.length; i += 1) {
    const err = validateEntity(entities[i], i);
    if (err) fail(err);
    if (slugSet.has(entities[i].canonical_slug)) {
      fail("duplicate slug: " + entities[i].canonical_slug);
    }
    slugSet.add(entities[i].canonical_slug);

    const slug = entities[i].canonical_slug;
    const outDir = path.join(OUTPUT_BASE, slug);
    const outFile = path.join(outDir, "index.html");
    const html = renderPage(entities[i]);

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, html, "utf8");
    outputs.push(outFile);
    console.log("[build-entity-ssg-fixtures] Wrote", path.relative(ROOT, outFile));
  }

  fs.mkdirSync(path.dirname(NOT_FOUND_OUT), { recursive: true });
  fs.writeFileSync(NOT_FOUND_OUT, renderNotFoundPage(), "utf8");
  console.log("[build-entity-ssg-fixtures] Wrote", path.relative(ROOT, NOT_FOUND_OUT));

  fs.writeFileSync(SITEMAP_OUT, buildSitemapXml(entities), "utf8");
  console.log("[build-entity-ssg-fixtures] Wrote", path.relative(ROOT, SITEMAP_OUT));

  console.log("[build-entity-ssg-fixtures] Done — generated", outputs.length, "entity pages + not-found + sitemap");
}

main();
