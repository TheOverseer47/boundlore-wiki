#!/usr/bin/env node
/**
 * P5-E.9F.2 — Node-side check for entity SSG SEO technical implementation.
 * No browser. No network. No DB.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE_PATH = path.join(ROOT, "qa", "fixtures", "entity-ssg-fixtures.json");
const GENERATOR_PATH = path.join(ROOT, "scripts", "build-entity-ssg-fixtures.mjs");
const SITEMAP_PATH = path.join(ROOT, "qa", "entity-ssg-sitemap.fixture.xml");
const PRODUCTION_SITEMAP = path.join(ROOT, "sitemap.xml");
const NOT_FOUND_PATH = path.join(ROOT, "wiki", "post", "_ssg-not-found", "index.html");

const FORBIDDEN_RE =
  /BLMETA|search_text|search_vector|service_role|SUPABASE_SERVICE_ROLE|password|passwd|secret|token|@[a-z0-9.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i;
const MARKER_RE = /\b(qa-ssg|p5-e9e|fixture-only|prototype fixture|test fixture)\b/i;
const SLUG_BLOCKLIST = /^(qa|test|p5|fixture|draft|pending|deleted|contribution)/;

let passCount = 0;

function fail(message) {
  console.error("[p5-entity-ssg-seo-technical-check] FAIL:", message);
  process.exit(1);
}

function ok(message) {
  passCount += 1;
  console.log("[p5-entity-ssg-seo-technical-check] PASS:", message);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assertHtmlEntity(entity) {
  const slug = entity.canonical_slug;
  const htmlPath = path.join(ROOT, "wiki", "post", slug, "index.html");
  if (!fs.existsSync(htmlPath)) fail("Missing output for " + slug);
  const html = read(htmlPath);
  const lower = html.toLowerCase();

  if (!html.includes("build-entity-ssg-fixtures.mjs")) fail(slug + " missing generator marker");
  if (!html.includes("<title>")) fail(slug + " missing title");
  if (!html.includes('meta name="description"')) fail(slug + " missing description meta");
  if (!html.includes('rel="canonical"')) fail(slug + " missing canonical");
  if (!html.includes('property="og:title"')) fail(slug + " missing og:title");
  if (!html.includes('property="og:description"')) fail(slug + " missing og:description");
  if (!html.includes('property="og:url"')) fail(slug + " missing og:url");
  if (!html.includes('name="twitter:title"')) fail(slug + " missing twitter:title");
  if (!html.includes('name="twitter:description"')) fail(slug + " missing twitter:description");
  if ((html.match(/<h1\b/gi) || []).length !== 1) fail(slug + " must have exactly one H1");
  if (!html.includes(entity.title)) fail(slug + " missing entity title in HTML");
  if (!html.includes(entity.excerpt.slice(0, 40))) fail(slug + " missing excerpt in HTML");
  if (html.includes("Loading post")) fail(slug + " must not contain Loading post");
  if (FORBIDDEN_RE.test(html)) fail(slug + " forbidden leak pattern");
  if (MARKER_RE.test(html)) fail(slug + " QA/test/fixture marker in output HTML");
  if (!html.includes("CreativeWork")) fail(slug + " missing CreativeWork JSON-LD");
  if (!html.includes("BreadcrumbList")) fail(slug + " missing BreadcrumbList JSON-LD");
  if (!html.includes('meta name="robots" content="noindex, follow"')) {
    fail(slug + " must use prelaunch noindex,follow");
  }
  ok("Validated entity page " + slug);
}

function main() {
  if (!fs.existsSync(GENERATOR_PATH)) fail("Generator script missing");
  ok("Generator script exists");

  const fixture = JSON.parse(read(FIXTURE_PATH));
  const entities = fixture.entities || [];
  if (entities.length < 6) fail("Expected at least 6 fixture entities, got " + entities.length);
  ok("Fixture count >= 6 (" + entities.length + ")");

  const slugs = new Set();
  entities.forEach(function (entity) {
    if (slugs.has(entity.canonical_slug)) fail("Duplicate slug " + entity.canonical_slug);
    slugs.add(entity.canonical_slug);
    if (SLUG_BLOCKLIST.test(entity.canonical_slug)) {
      fail("Blocked slug " + entity.canonical_slug);
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity.canonical_slug)) {
      fail("Invalid slug " + entity.canonical_slug);
    }
  });
  ok("All slugs unique and SEO-safe");

  if (!fs.existsSync(SITEMAP_PATH)) fail("Fixture sitemap missing");
  const sitemap = read(SITEMAP_PATH);
  entities.forEach(function (entity) {
    if (!sitemap.includes(entity.canonical_url)) {
      fail("Fixture sitemap missing " + entity.canonical_url);
    }
  });
  ok("Fixture sitemap includes all entity URLs");

  const excluded = ["qa/", "test", "draft", "pending", "deleted", "contribution"];
  excluded.forEach(function (token) {
    if (sitemap.toLowerCase().includes("/wiki/post/" + token)) {
      fail("Fixture sitemap contains excluded token: " + token);
    }
  });
  ok("Fixture sitemap excludes private/QA/test patterns");

  const prodSitemap = read(PRODUCTION_SITEMAP);
  entities.forEach(function (entity) {
    if (prodSitemap.includes("/wiki/post/" + entity.canonical_slug + "/")) {
      fail("Production sitemap.xml must not include fixture entity " + entity.canonical_slug);
    }
  });
  ok("Production sitemap.xml unchanged for fixture entities");

  entities.forEach(assertHtmlEntity);

  if (!fs.existsSync(NOT_FOUND_PATH)) fail("Not-found page missing");
  const notFound = read(NOT_FOUND_PATH);
  if (!notFound.includes('meta name="robots" content="noindex, nofollow"')) {
    fail("Not-found page must be noindex,nofollow");
  }
  ok("Not-found fail-closed page present");

  console.log("[p5-entity-ssg-seo-technical-check] All checks passed (" + passCount + " assertions)");
}

main();
