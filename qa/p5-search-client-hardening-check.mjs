// P5-E.9E.2 — Static Node check for search recall hardening (no browser, no Supabase).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function assert(ok, label) {
  if (!ok) {
    console.error("FAIL:", label);
    process.exitCode = 1;
    return false;
  }
  console.log("PASS:", label);
  return true;
}

const utilsPath = "js/search-recall-utils.js";
const fixtureJs = "qa/p5-search-client-hardening-fixtures.js";
const fixtureHtml = "qa/p5-search-client-hardening-fixtures.html";
const corpusPath = "qa/fixtures/p5-search-recall-corpus.json";
const queriesPath = "qa/fixtures/p5-search-recall-queries.json";
const searchJs = "js/search.js";

assert(fs.existsSync(path.join(root, utilsPath)), utilsPath + " exists");
assert(fs.existsSync(path.join(root, fixtureJs)), fixtureJs + " exists");
assert(fs.existsSync(path.join(root, fixtureHtml)), fixtureHtml + " exists");

const utils = read(utilsPath);
assert(utils.includes("window.BoundLoreSearchRecall"), "BoundLoreSearchRecall global export");
assert(utils.includes("normalizeQuery"), "normalizeQuery present");
assert(utils.includes("expandSynonyms"), "expandSynonyms present");
assert(utils.includes("scoreRecord"), "scoreRecord present");
assert(utils.includes("renderSafeSnippet"), "renderSafeSnippet present");
assert(utils.includes("getCanonicalResultUrl"), "getCanonicalResultUrl present");
assert(utils.includes("monster") && utils.includes("creature"), "monster->creature synonym map");
assert(utils.includes("artifact") && utils.includes("item"), "artifact->item synonym map");
assert(!/supabase\.from|createClient|\.rpc\(|insert\(|update\(|delete\(/.test(utils), "no Supabase/DB writes in utils");

const search = read(searchJs);
assert(search.includes("BoundLoreSearchRecall") || search.includes("hasRecallUtils"), "search.js integrates recall utils");

const corpus = JSON.parse(read(corpusPath));
const queries = JSON.parse(read(queriesPath));
assert(corpus.schema === "SearchRecallCorpus", "corpus schema");
assert(Array.isArray(corpus.records) && corpus.records.length >= 8, "corpus records");
assert(queries.schema === "SearchRecallQueryMatrix", "queries schema");
assert(Array.isArray(queries.expect_hits) && queries.expect_hits.length >= 10, "expect_hits");

const fixture = read(fixtureJs);
assert(fixture.includes("BoundLoreSearchRecall"), "fixture uses productive utility");
assert(!/supabase\.from|createClient\s*\(/.test(fixture), "fixture has no Supabase runtime calls");

if (process.exitCode) {
  console.error("\nNode static check: FAIL");
  process.exit(1);
}
console.log("\nNode static check: PASS");
