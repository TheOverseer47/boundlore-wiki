#!/usr/bin/env node
/**
 * P5-E.9D.3C — Node-side check for fixture SSG generator output.
 * No browser. No network. No dependencies.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const FIXTURE_PATH = path.join(ROOT, "qa", "fixtures", "p5-entity-ssg-fixtures.json");
const GENERATOR_PATH = path.join(ROOT, "scripts", "build-entity-ssg-fixtures.mjs");
const SITEMAP_PATH = path.join(ROOT, "sitemap.xml");

function fail(message) {
  console.error("[p5-entity-ssg-generator-check] FAIL:", message);
  process.exit(1);
}

function ok(message) {
  console.log("[p5-entity-ssg-generator-check] PASS:", message);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function main() {
  if (!fs.existsSync(GENERATOR_PATH)) fail("Generator script missing");
  ok("Generator script exists");

  const fixture = JSON.parse(read(FIXTURE_PATH));
  const entities = fixture.entities || [];
  if (entities.length !== 3) fail("Expected 3 fixture entities (use --legacy on generator for p5 fixture)");

  const sitemap = read(SITEMAP_PATH);

  entities.forEach(function(entity) {
    const slug = entity.canonical_slug;
    const htmlPath = path.join(ROOT, "wiki", "post", slug, "index.html");
    if (!fs.existsSync(htmlPath)) fail("Missing output for " + slug);
    const html = read(htmlPath);
    const lower = html.toLowerCase();

    if (!html.includes("build-entity-ssg-fixtures.mjs")) fail(slug + " missing generator marker");
    if (!html.includes('data-bl-ssg-source="fixture-generator"')) fail(slug + " missing data-bl-ssg-source");
    if ((html.match(/<h1\b/gi) || []).length !== 1) fail(slug + " must have exactly one H1");
    if (!html.includes(entity.title)) fail(slug + " missing title");
    if (!html.includes("CreativeWork")) fail(slug + " missing CreativeWork JSON-LD");
    if (!html.includes("BreadcrumbList")) fail(slug + " missing BreadcrumbList JSON-LD");
    if (html.includes("Loading post")) fail(slug + " must not contain Loading post");
    if (lower.includes("<!--blmeta")) fail(slug + " must not contain BLMETA");
    if (sitemap.includes("/wiki/post/" + slug + "/")) fail("Sitemap must not include " + slug);
    ok("Validated " + slug);
  });

  console.log("[p5-entity-ssg-generator-check] All checks passed (" + entities.length + " pages)");
}

main();
