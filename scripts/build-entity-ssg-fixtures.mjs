#!/usr/bin/env node
/**
 * P5-E.9D.3C — Fixture-based Entity SSG generator.
 * Input: qa/fixtures/p5-entity-ssg-fixtures.json
 * Output: wiki/post/<canonical_slug>/index.html
 * No network. No DB. No sitemap changes.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE_PATH = path.join(ROOT, "qa", "fixtures", "p5-entity-ssg-fixtures.json");
const OUTPUT_BASE = path.join(ROOT, "wiki", "post");

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

const ALLOWED_CONTENT_ORIGINS = new Set(["prototype_fixture"]);
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DEFAULT_IMAGE = "https://boundlore.com/public/images/social-preview.png";
const GENERATOR_VERSION = "p5-e9d3c";

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
  return null;
}

function validateBodyHtml(html) {
  const body = String(html || "");
  if (!body.trim()) return "body_html_sanitized empty";
  if (/<script\b/i.test(body)) return "script tag in body";
  if (/\bon\w+\s*=/i.test(body)) return "inline event handler in body";
  if (/javascript:/i.test(body)) return "javascript: URL in body";
  if (/<!--\s*blmeta/i.test(body)) return "BLMETA in body";
  return null;
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
    return label + " content_origin must be prototype_fixture";
  }

  const slugErr = validateSlug(entity.canonical_slug);
  if (slugErr) return label + " " + slugErr;

  const expectedCanonical = "https://boundlore.com/wiki/post/" + entity.canonical_slug + "/";
  if (entity.canonical_url !== expectedCanonical) {
    return label + " canonical_url mismatch";
  }

  if (!Array.isArray(entity.breadcrumbs) || entity.breadcrumbs.length < 2) {
    return label + " breadcrumbs invalid";
  }

  const bodyErr = validateBodyHtml(entity.body_html_sanitized);
  if (bodyErr) return label + " " + bodyErr;

  if (String(entity.excerpt).toLowerCase().indexOf("qa ssg") === -1) {
    return label + " excerpt must identify QA SSG fixture";
  }

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
  };
  return map[String(category || "").toLowerCase()] || "/wiki/browse/";
}

function buildBreadcrumbHtml(breadcrumbs) {
  const items = breadcrumbs.map(function(crumb, idx) {
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
    .map(function(text) {
      return '        <span class="bl-ssg-badge">' + escapeHtml(text) + "</span>";
    })
    .join("\n");
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
    isPartOf: { "@type": "WebSite", name: "BoundLore", url: "https://boundlore.com/" },
  };
}

function buildBreadcrumbJson(entity) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entity.breadcrumbs.map(function(crumb, idx) {
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
    '  <meta name="robots" content="index, follow" />\n' +
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
    "    .bl-ssg-prototype-banner { background: rgba(224,168,58,0.12); border: 1px solid rgba(224,168,58,0.35); border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; font-size: 0.85rem; color: #f4ce75; }\n" +
    "    .bl-ssg-badges { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 16px; }\n" +
    "    .bl-ssg-badge { padding: 4px 10px; border-radius: 999px; font-size: 0.75rem; border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.06); }\n" +
    "    .bl-ssg-excerpt { font-size: 1.05rem; color: #dde1ef; margin-bottom: 20px; line-height: 1.55; }\n" +
    "    .bl-ssg-body { line-height: 1.6; color: #e8ebf5; }\n" +
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
    '      <p class="bl-ssg-prototype-banner">P5-E.9D.3C fixture-generator output — not in sitemap, not deployed, fixture data only.</p>\n' +
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
    '      <div class="bl-ssg-hydrate-slot" id="blSsgHydrateRelated" aria-label="CSR hydration placeholder">\n' +
    "        Related entries, comments, and reactions load here after hydration (P5-E.9D.3C+). CSR-only on this prototype page.\n" +
    "      </div>\n" +
    "    </article>\n" +
    "  </div>\n" +
    "\n" +
    '  <footer class="footer"><div class="footer-bottom"><p>&copy; 2026 BoundLore Community &middot; <a href="/wiki/imprint/">Imprint</a> &middot; <a href="/wiki/privacy/">Privacy Policy</a></p></div></footer>\n' +
    "</body>\n" +
    "</html>\n"
  );
}

function main() {
  if (!fs.existsSync(FIXTURE_PATH)) {
    fail("Fixture file not found: " + FIXTURE_PATH);
  }

  const raw = fs.readFileSync(FIXTURE_PATH, "utf8");
  const data = JSON.parse(raw);
  const entities = data && Array.isArray(data.entities) ? data.entities : null;
  if (!entities || entities.length === 0) {
    fail("No entities in fixture JSON");
  }

  console.log("[build-entity-ssg-fixtures] Reading", entities.length, "entities from fixture");

  const outputs = [];

  for (let i = 0; i < entities.length; i += 1) {
    const err = validateEntity(entities[i], i);
    if (err) fail(err);

    const slug = entities[i].canonical_slug;
    const outDir = path.join(OUTPUT_BASE, slug);
    const outFile = path.join(outDir, "index.html");
    const html = renderPage(entities[i]);

    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outFile, html, "utf8");
    outputs.push(outFile);
    console.log("[build-entity-ssg-fixtures] Wrote", path.relative(ROOT, outFile));
  }

  console.log("[build-entity-ssg-fixtures] Done — generated", outputs.length, "pages");
}

main();
