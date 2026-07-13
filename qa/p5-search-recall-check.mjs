#!/usr/bin/env node
/**
 * P5-E.9E.1 — Node-side search recall fixture validation.
 * No browser. No Supabase. No DB.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CORPUS_PATH = path.join(ROOT, "qa", "fixtures", "p5-search-recall-corpus.json");
const QUERIES_PATH = path.join(ROOT, "qa", "fixtures", "p5-search-recall-queries.json");

const SYNONYM_MAP = {
  monster: ["creature"],
  beast: ["creature"],
  artifact: ["item", "trinket"],
  tool: ["item"],
  region: ["biome"],
  zone: ["biome"],
};

const PUBLIC_EXCLUDE_ORIGINS = new Set(["qa_test", "prototype_fixture", "internal_test"]);

function normalizeQuery(query) {
  return String(query || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  const norm = normalizeQuery(value);
  return norm ? norm.split(/\s+/).filter(Boolean) : [];
}

function singularizeToken(token) {
  if (!token || token.length < 4) return token;
  if (token.endsWith("ies") && token.length > 4) return token.slice(0, -3) + "y";
  if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
  if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

function expandSynonyms(tokens) {
  const out = [];
  const seen = new Set();
  tokens.forEach((token) => {
    const base = singularizeToken(token);
    [token, base].forEach((t) => {
      if (!t || seen.has(t)) return;
      seen.add(t);
      out.push(t);
      const syns = SYNONYM_MAP[t];
      if (syns) syns.forEach((s) => { if (!seen.has(s)) { seen.add(s); out.push(s); } });
    });
  });
  return out;
}

function isPublicSearchable(record) {
  if (!record) return false;
  if (String(record.status || "").toLowerCase() !== "published") return false;
  if (PUBLIC_EXCLUDE_ORIGINS.has(String(record.content_origin || "").toLowerCase())) return false;
  if (/^qa-/.test(String(record.canonical_slug || ""))) return false;
  const tags = Array.isArray(record.tags) ? record.tags : [];
  if (tags.includes("exclude_public")) return false;
  return true;
}

function facetsToText(facets) {
  if (!facets || typeof facets !== "object") return "";
  return Object.keys(facets).map((k) => `${k} ${facets[k]}`).join(" ");
}

function scoreRecord(record, queryTokens) {
  if (!isPublicSearchable(record)) return 0;
  let score = 0;
  const titleNorm = normalizeQuery(record.title);
  const slugNorm = normalizeQuery(record.canonical_slug);
  const excerptNorm = normalizeQuery(record.excerpt);
  const bodyNorm = normalizeQuery(record.body_text);
  const aliasNorms = (record.aliases || []).map(normalizeQuery);
  const facetNorm = normalizeQuery(facetsToText(record.facets));
  const tagsNorm = normalizeQuery((record.tags || []).join(" "));
  const catNorm = normalizeQuery([record.category, record.entity_domain, record.entity_subtype].join(" "));

  queryTokens.forEach((token) => {
    if (!token) return;
    if (titleNorm === token || titleNorm.indexOf(token) === 0) score += 80;
    aliasNorms.forEach((alias) => { if (alias.indexOf(token) >= 0) score += 70; });
    if (slugNorm === token || slugNorm.indexOf(token) >= 0) score += 65;
    if (catNorm.indexOf(token) >= 0) score += 55;
    if (excerptNorm.indexOf(token) >= 0) score += 40;
    if (facetNorm.indexOf(token) >= 0 || tagsNorm.indexOf(token) >= 0) score += 35;
    if (bodyNorm.indexOf(token) >= 0) score += 25;
  });
  return score;
}

function isUnsafeQuery(query) {
  const raw = String(query || "");
  if (/[<>]/.test(raw)) return true;
  if (/javascript:/i.test(raw)) return true;
  if (/\bon\w+\s*=/i.test(raw)) return true;
  return false;
}

function searchFixtureCorpus(query, corpus) {
  if (isUnsafeQuery(query)) return [];
  const queryTokens = expandSynonyms(tokenize(query));
  if (!queryTokens.length) return [];
  return (corpus.records || [])
    .map((record) => ({ record, score: scoreRecord(record, queryTokens) }))
    .filter((row) => row.score > 0 && isPublicSearchable(row.record))
    .sort((a, b) => b.score - a.score);
}

function fail(msg) {
  console.error("[p5-search-recall-check] FAIL:", msg);
  process.exit(1);
}

function pass(msg) {
  console.log("[p5-search-recall-check] PASS:", msg);
}

const corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8"));
const queries = JSON.parse(fs.readFileSync(QUERIES_PATH, "utf8"));

if (!Array.isArray(corpus.records) || corpus.records.length < 8) {
  fail("Corpus must have at least 8 records");
}
pass(`Corpus has ${corpus.records.length} records`);

const requiredFields = [
  "id", "title", "canonical_slug", "url", "status", "category",
  "entity_domain", "entity_subtype", "excerpt", "body_text",
  "aliases", "facets", "tags", "relations_summary", "content_origin",
];

corpus.records.forEach((rec, i) => {
  requiredFields.forEach((field) => {
    if (!(field in rec)) fail(`Record ${i} missing field ${field}`);
  });
});
pass("All records have required fields");

if (!corpus.records.some((r) => r.status === "draft")) fail("Missing draft record");
if (!corpus.records.some((r) => r.status === "pending")) fail("Missing pending record");
if (!corpus.records.some((r) => r.content_origin === "qa_test")) fail("Missing qa_test record");
pass("Draft, pending, qa_test records present");

const monsterHits = searchFixtureCorpus("monster", corpus).map((h) => h.record.canonical_slug);
if (!monsterHits.includes("ember-salamander")) fail("monster must return ember-salamander");
pass("monster returns creature via synonym");

if (searchFixtureCorpus("zzzxxy-no-hit", corpus).length !== 0) fail("Garbage query must return 0");
if (searchFixtureCorpus('<img src=x onerror=alert(1)>', corpus).length !== 0) fail("Unsafe HTML query must return 0");
pass("No-result and unsafe query OK");

queries.expect_hits.forEach((expect) => {
  const slugs = searchFixtureCorpus(expect.query, corpus).map((h) => h.record.canonical_slug);
  (expect.must_include_slugs || []).forEach((slug) => {
    if (!slugs.includes(slug)) fail(`Query "${expect.query}" must include ${slug}`);
  });
});
pass(`All ${queries.expect_hits.length} expect_hits queries validated`);

console.log("[p5-search-recall-check] All checks passed");
