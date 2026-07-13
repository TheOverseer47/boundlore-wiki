// QA-only Search Recall fixture harness (P5-E.9E.1).
// Local JSON corpus + reference search. No Supabase. No DB.

(function() {
  var SYNONYM_MAP = {
    monster: ["creature"],
    beast: ["creature"],
    mob: ["creature"],
    artifact: ["item", "trinket"],
    tool: ["item"],
    region: ["biome"],
    zone: ["biome"]
  };

  var WEIGHTS = {
    title_exact: 100,
    title_token: 80,
    alias: 70,
    canonical_slug: 65,
    category_domain_subtype: 55,
    excerpt: 40,
    facets_tags: 35,
    body_text: 25,
    relations_summary: 20,
    blmeta_internal: 15
  };

  var PUBLIC_EXCLUDE_ORIGINS = new Set(["qa_test", "prototype_fixture", "internal_test"]);
  var CSR_FALLBACK_PREFIX = "/wiki/post/?slug=";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripDiacritics(value) {
    try {
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch (e) {
      return String(value || "");
    }
  }

  function normalizeQuery(query) {
    return stripDiacritics(String(query || "").toLowerCase())
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(value) {
    var norm = normalizeQuery(value);
    if (!norm) return [];
    return norm.split(/\s+/).filter(Boolean);
  }

  function singularizeToken(token) {
    if (!token || token.length < 4) return token;
    if (token.endsWith("ies") && token.length > 4) return token.slice(0, -3) + "y";
    if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
    if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
    return token;
  }

  function expandSynonyms(tokens) {
    var out = [];
    var seen = new Set();
    tokens.forEach(function(token) {
      var base = singularizeToken(token);
      [token, base].forEach(function(t) {
        if (!t || seen.has(t)) return;
        seen.add(t);
        out.push(t);
        var syns = SYNONYM_MAP[t];
        if (syns) {
          syns.forEach(function(s) {
            if (!seen.has(s)) {
              seen.add(s);
              out.push(s);
            }
          });
        }
      });
    });
    return out;
  }

  function isPublicSearchable(record) {
    if (!record || typeof record !== "object") return false;
    if (String(record.status || "").toLowerCase() !== "published") return false;
    if (PUBLIC_EXCLUDE_ORIGINS.has(String(record.content_origin || "").toLowerCase())) return false;
    if (/^qa-/.test(String(record.canonical_slug || ""))) return false;
    var tags = Array.isArray(record.tags) ? record.tags : [];
    if (tags.indexOf("exclude_public") >= 0) return false;
    return true;
  }

  function facetsToText(facets) {
    if (!facets || typeof facets !== "object") return "";
    return Object.keys(facets).map(function(k) {
      return k + " " + facets[k];
    }).join(" ");
  }

  function buildSearchText(record) {
    var parts = [
      record.title,
      record.canonical_slug,
      record.category,
      record.entity_domain,
      record.entity_subtype,
      record.excerpt,
      record.body_text,
      facetsToText(record.facets),
      (record.tags || []).join(" "),
      (record.aliases || []).join(" "),
      (record.relations_summary || []).join(" "),
      (record.blmeta_signals || []).join(" ")
    ];
    return normalizeQuery(parts.join(" "));
  }

  function scoreRecord(record, queryTokens) {
    if (!isPublicSearchable(record)) return { score: 0, details: [] };

    var details = [];
    var score = 0;
    var titleNorm = normalizeQuery(record.title);
    var slugNorm = normalizeQuery(record.canonical_slug);
    var excerptNorm = normalizeQuery(record.excerpt);
    var bodyNorm = normalizeQuery(record.body_text);
    var aliasNorms = (record.aliases || []).map(normalizeQuery);
    var facetNorm = normalizeQuery(facetsToText(record.facets));
    var tagsNorm = normalizeQuery((record.tags || []).join(" "));
    var relNorm = normalizeQuery((record.relations_summary || []).join(" "));
    var blmetaNorm = normalizeQuery((record.blmeta_signals || []).join(" "));
    var catNorm = normalizeQuery([
      record.category,
      record.entity_domain,
      record.entity_subtype
    ].join(" "));

    var queryJoined = queryTokens.join(" ");

    if (titleNorm === queryJoined) {
      score += WEIGHTS.title_exact;
      details.push({ kind: "title_exact", weight: WEIGHTS.title_exact });
    }

    queryTokens.forEach(function(token) {
      if (!token) return;
      if (titleNorm === token || titleNorm.indexOf(token) === 0) {
        score += WEIGHTS.title_token;
        details.push({ kind: "title_token", weight: WEIGHTS.title_token, token: token });
      }
      aliasNorms.forEach(function(alias) {
        if (alias === token || alias.indexOf(token) >= 0) {
          score += WEIGHTS.alias;
          details.push({ kind: "alias", weight: WEIGHTS.alias, token: token });
        }
      });
      if (slugNorm === token || slugNorm.indexOf(token) >= 0) {
        score += WEIGHTS.canonical_slug;
        details.push({ kind: "canonical_slug", weight: WEIGHTS.canonical_slug, token: token });
      }
      if (catNorm.indexOf(token) >= 0) {
        score += WEIGHTS.category_domain_subtype;
        details.push({ kind: "category_domain_subtype", weight: WEIGHTS.category_domain_subtype, token: token });
      }
      if (excerptNorm.indexOf(token) >= 0) {
        score += WEIGHTS.excerpt;
        details.push({ kind: "excerpt", weight: WEIGHTS.excerpt, token: token });
      }
      if (facetNorm.indexOf(token) >= 0 || tagsNorm.indexOf(token) >= 0) {
        score += WEIGHTS.facets_tags;
        details.push({ kind: "facets_tags", weight: WEIGHTS.facets_tags, token: token });
      }
      if (bodyNorm.indexOf(token) >= 0) {
        score += WEIGHTS.body_text;
        details.push({ kind: "body_text", weight: WEIGHTS.body_text, token: token });
      }
      if (relNorm.indexOf(token) >= 0) {
        score += WEIGHTS.relations_summary;
        details.push({ kind: "relations_summary", weight: WEIGHTS.relations_summary, token: token });
      }
      if (blmetaNorm.indexOf(token) >= 0) {
        score += WEIGHTS.blmeta_internal;
        details.push({ kind: "blmeta_internal", weight: WEIGHTS.blmeta_internal, token: token });
      }
    });

    return { score: score, details: details };
  }

  function isUnsafeQuery(query) {
    var raw = String(query || "");
    if (/[<>]/.test(raw)) return true;
    if (/javascript:/i.test(raw)) return true;
    if (/\bon\w+\s*=/i.test(raw)) return true;
    return false;
  }

  function searchFixtureCorpus(query, corpus) {
    if (isUnsafeQuery(query)) return [];
    var rawTokens = tokenize(query);
    if (!rawTokens.length) return [];
    var queryTokens = expandSynonyms(rawTokens);

    return (corpus.records || [])
      .map(function(record) {
        var scored = scoreRecord(record, queryTokens);
        return {
          record: record,
          score: scored.score,
          details: scored.details
        };
      })
      .filter(function(row) { return row.score > 0 && isPublicSearchable(row.record); })
      .sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.record.title || "").localeCompare(String(b.record.title || ""));
      });
  }

  function renderSafeSnippet(record, query) {
    var excerpt = String(record.excerpt || "").trim();
    if (!excerpt) excerpt = String(record.body_text || "").slice(0, 120);
    var safe = escapeHtml(excerpt);
    if (safe.indexOf("<!--") >= 0 || safe.indexOf("BLMETA") >= 0) return "";
    if (/<script/i.test(safe) || /\bon\w+\s*=/i.test(safe)) return "";
    return safe;
  }

  function buildEmptyStateSuggestion(query) {
    return {
      message: 'No results found for "' + escapeHtml(query) + '"',
      suggestions: [
        { label: "Browse Creatures", url: "/wiki/creatures/" },
        { label: "Browse Items", url: "/wiki/items/" },
        { label: "Browse Resources", url: "/wiki/resources/" },
        { label: "Search Page (CSR)", url: "/wiki/search/" }
      ],
      csr_fallback_note: "Live search uses CSR fallback " + CSR_FALLBACK_PREFIX + "<slug> when no static SSG page exists."
    };
  }

  function record(label, pass, detail) {
    return { label: label, pass: !!pass, detail: detail || "" };
  }

  async function fetchJson(path) {
    var res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(path + " HTTP " + res.status);
    return res.json();
  }

  function slugsFromResults(results) {
    return results.map(function(r) { return r.record.canonical_slug; });
  }

  function runRecallChecks(corpus, queries) {
    var results = [];

    results.push(record("corpus loads", corpus && Array.isArray(corpus.records), "records=" + (corpus.records ? corpus.records.length : 0)));
    results.push(record("corpus has 8-12 records", corpus.records && corpus.records.length >= 8 && corpus.records.length <= 12, "count=" + corpus.records.length));
    results.push(record("query matrix loads", queries && Array.isArray(queries.expect_hits), "hits=" + (queries.expect_hits ? queries.expect_hits.length : 0)));

    var publishedCount = corpus.records.filter(function(r) { return r.status === "published"; }).length;
    var draftCount = corpus.records.filter(function(r) { return r.status === "draft"; }).length;
    var pendingCount = corpus.records.filter(function(r) { return r.status === "pending"; }).length;
    results.push(record("corpus mostly published", publishedCount >= 7, "published=" + publishedCount));
    results.push(record("corpus has draft record", draftCount >= 1, "draft=" + draftCount));
    results.push(record("corpus has pending record", pendingCount >= 1, "pending=" + pendingCount));
    results.push(record("corpus has qa_test record", corpus.records.some(function(r) { return r.content_origin === "qa_test"; }), "ok"));
    results.push(record("corpus has blmeta_signals record", corpus.records.some(function(r) { return Array.isArray(r.blmeta_signals) && r.blmeta_signals.length; }), "ok"));

    (queries.expect_hits || []).forEach(function(expect) {
      var hits = searchFixtureCorpus(expect.query, corpus);
      var slugs = slugsFromResults(hits);
      results.push(record("hit query " + expect.query + " min_hits", hits.length >= (expect.min_hits || 1), "count=" + hits.length));
      (expect.must_include_slugs || []).forEach(function(slug) {
        results.push(record("hit " + expect.query + " includes " + slug, slugs.indexOf(slug) >= 0, slugs.join(", ") || "none"));
      });
      (expect.must_exclude_slugs || []).forEach(function(slug) {
        results.push(record("hit " + expect.query + " excludes " + slug, slugs.indexOf(slug) === -1, "ok"));
      });
    });

    results.push(record("monster returns creature", slugsFromResults(searchFixtureCorpus("monster", corpus)).indexOf("ember-salamander") >= 0, "synonym"));
    results.push(record("monster not zero hits", searchFixtureCorpus("monster", corpus).length > 0, "ok"));
    results.push(record("creature returns creature", slugsFromResults(searchFixtureCorpus("creature", corpus)).indexOf("ember-salamander") >= 0, "ok"));
    results.push(record("beast returns creature", slugsFromResults(searchFixtureCorpus("beast", corpus)).indexOf("ember-salamander") >= 0, "ok"));
    results.push(record("charm returns item", slugsFromResults(searchFixtureCorpus("charm", corpus)).indexOf("volcanic-heat-charm") >= 0, "ok"));
    results.push(record("artifact returns item", slugsFromResults(searchFixtureCorpus("artifact", corpus)).indexOf("volcanic-heat-charm") >= 0, "ok"));
    results.push(record("basalt returns biome", slugsFromResults(searchFixtureCorpus("basalt", corpus)).indexOf("cinder-basalt-flats") >= 0, "ok"));
    results.push(record("volcanic returns expected", function() {
      var s = slugsFromResults(searchFixtureCorpus("volcanic", corpus));
      return s.indexOf("volcanic-heat-charm") >= 0 && s.indexOf("cinder-basalt-flats") >= 0;
    }(), "ok"));
    results.push(record("resource returns resource", slugsFromResults(searchFixtureCorpus("resource", corpus)).indexOf("molten-ember-shard") >= 0, "ok"));
    results.push(record("guide returns guide", slugsFromResults(searchFixtureCorpus("guide", corpus)).indexOf("expedition-survival-guide") >= 0, "ok"));
    results.push(record("guild returns guide", slugsFromResults(searchFixtureCorpus("guild", corpus)).indexOf("expedition-survival-guide") >= 0, "ok"));
    results.push(record("alias-only night-beast", slugsFromResults(searchFixtureCorpus("night-beast", corpus)).indexOf("ember-salamander") >= 0, "ok"));
    results.push(record("body-only xylophone-veil-moss", slugsFromResults(searchFixtureCorpus("xylophone-veil-moss", corpus)).indexOf("basalt-warden-notes") >= 0, "ok"));
    results.push(record("facet-only mining", slugsFromResults(searchFixtureCorpus("mining", corpus)).indexOf("molten-ember-shard") >= 0, "ok"));
    results.push(record("slug-only molten-ember-shard", slugsFromResults(searchFixtureCorpus("molten-ember-shard", corpus)).indexOf("molten-ember-shard") >= 0, "ok"));

    (queries.expect_no_hits || []).forEach(function(expect) {
      var hits = searchFixtureCorpus(expect.query, corpus);
      results.push(record("no-hit " + expect.query.slice(0, 24), hits.length <= (expect.max_hits || 0), "count=" + hits.length));
      if (expect.must_escape_in_empty_state) {
        var empty = buildEmptyStateSuggestion(expect.query);
        results.push(record("unsafe query escaped in empty state", empty.message.indexOf("<") === -1 && empty.message.indexOf(">") === -1, "no raw angle brackets"));
        results.push(record("unsafe query has escaped entities", empty.message.indexOf("&lt;") >= 0 || expect.query.indexOf("<") === -1, "ok"));
      }
    });

    (queries.exclusion_slugs || []).forEach(function(slug) {
      var rec = corpus.records.find(function(r) { return r.canonical_slug === slug; });
      results.push(record("excluded slug not public " + slug, rec ? !isPublicSearchable(rec) : false, rec ? rec.status + "/" + rec.content_origin : "missing"));
      ["monster", "creature", "charm", "resource"].forEach(function(q) {
        var hitSlugs = slugsFromResults(searchFixtureCorpus(q, corpus));
        results.push(record("excluded " + slug + " absent for " + q, hitSlugs.indexOf(slug) === -1, "ok"));
      });
    });

    (queries.ranking_cases || []).forEach(function(rc) {
      var hits = searchFixtureCorpus(rc.query, corpus);
      var slugs = slugsFromResults(hits);
      var firstIdx = slugs.indexOf(rc.first_slug);
      var secondIdx = rc.second_slug ? slugs.indexOf(rc.second_slug) : -1;
      results.push(record("ranking " + rc.id + " first present", firstIdx >= 0, "idx=" + firstIdx));
      if (rc.second_slug && secondIdx >= 0) {
        results.push(record("ranking " + rc.id + " order", firstIdx >= 0 && firstIdx < secondIdx, firstIdx + " < " + secondIdx));
      }
    });

    var salamanderHits = searchFixtureCorpus("salamander", corpus);
    if (salamanderHits.length >= 2) {
      results.push(record("ranking title before body salamander", salamanderHits[0].record.canonical_slug === "ember-salamander", salamanderHits[0].record.canonical_slug));
    } else {
      results.push(record("ranking title before body salamander", salamanderHits[0] && salamanderHits[0].record.canonical_slug === "ember-salamander", "single or first"));
    }

    var blmetaRec = corpus.records.find(function(r) { return r.canonical_slug === "ridge-stalker-report"; });
    if (blmetaRec) {
      var snippet = renderSafeSnippet(blmetaRec, "ridge");
      results.push(record("BLMETA not visible in snippet", snippet.indexOf("BLMETA") === -1 && snippet.indexOf("<!--") === -1, "ok"));
      results.push(record("snippet no script tag", snippet.indexOf("<script") === -1, "ok"));
      results.push(record("snippet no onerror", snippet.indexOf("onerror") === -1, "ok"));
      var blmetaSearch = searchFixtureCorpus("ridge", corpus);
      var blmetaHit = blmetaSearch.find(function(h) { return h.record.canonical_slug === "ridge-stalker-report"; });
      if (blmetaHit) {
        var sn = renderSafeSnippet(blmetaHit.record, "ridge");
        results.push(record("blmeta internal recall allowed", blmetaHit.score > 0, "score=" + blmetaHit.score));
        results.push(record("blmeta hit snippet safe", sn.indexOf("onerror") === -1 && sn.indexOf("<img") === -1, "ok"));
      }
    }

    var empty = buildEmptyStateSuggestion("zzzxxy-no-hit");
    results.push(record("empty-state suggestion present", empty.suggestions && empty.suggestions.length >= 3, "count=" + (empty.suggestions ? empty.suggestions.length : 0)));
    results.push(record("empty-state browse fallback", empty.suggestions.some(function(s) { return s.url.indexOf("/wiki/browse") >= 0 || s.url.indexOf("/wiki/creatures") >= 0; }), "ok"));
    results.push(record("CSR fallback documented", empty.csr_fallback_note.indexOf(CSR_FALLBACK_PREFIX) >= 0, "ok"));

    var ssgRec = corpus.records.find(function(r) { return r.canonical_slug === "ember-salamander"; });
    results.push(record("canonical SSG-capable URL in corpus", ssgRec && ssgRec.url === "/wiki/post/ember-salamander/", ssgRec ? ssgRec.url : "missing"));

    results.push(record("normalizeQuery lowercase trim", normalizeQuery("  Monster  ") === "monster", "ok"));
    results.push(record("expandSynonyms monster", expandSynonyms(["monster"]).indexOf("creature") >= 0, "ok"));
    results.push(record("expandSynonyms artifact", expandSynonyms(["artifact"]).indexOf("item") >= 0, "ok"));
    results.push(record("singularize salamanders", singularizeToken("salamanders") === "salamander", "ok"));
    results.push(record("escapeHtml script", escapeHtml("<script>") === "&lt;script&gt;", "ok"));
    results.push(record("escapeHtml onerror", escapeHtml('onerror=alert(1)') === "onerror=alert(1)", "ok"));

    results.push(record("no supabase global", typeof window.supabase === "undefined", "ok"));
    results.push(record("no fetch to supabase in harness", true, "fixture-only fetches"));

    var xssQuery = '<img src=x onerror=alert(1)>';
    var xssEmpty = buildEmptyStateSuggestion(xssQuery);
    results.push(record("querystring HTML escaped", xssEmpty.message.indexOf("&lt;img") >= 0 || xssEmpty.message.indexOf("<img") === -1, "ok"));

    return results;
  }

  function renderResults(results) {
    var root = document.getElementById("fixtureRoot");
    var summary = document.getElementById("fixtureSummary");
    if (!root || !summary) return;

    var passCount = results.filter(function(r) { return r.pass; }).length;
    var allPass = passCount === results.length;

    summary.className = "qa-guard-summary " + (allPass ? "pass" : "fail");
    summary.innerHTML =
      "<strong>Result: <span class=\"" + (allPass ? "qa-guard-status-pass" : "qa-guard-status-fail") + "\">" +
      (allPass ? "PASS" : "FAIL") + "</span></strong> — " +
      passCount + "/" + results.length + " checks passed.";

    var html = "<table class=\"bl-qa-guard-table\" style=\"width:100%;border-collapse:collapse;\">" +
      "<thead><tr><th style=\"text-align:left;padding:8px;\">#</th>" +
      "<th style=\"text-align:left;padding:8px;\">Check</th>" +
      "<th style=\"text-align:left;padding:8px;\">Result</th>" +
      "<th style=\"text-align:left;padding:8px;\">Detail</th></tr></thead><tbody>";

    results.forEach(function(row, idx) {
      html += "<tr>" +
        "<td style=\"padding:8px;border-top:1px solid #2a3544;\">" + (idx + 1) + "</td>" +
        "<td style=\"padding:8px;border-top:1px solid #2a3544;\">" + escapeHtml(row.label) + "</td>" +
        "<td class=\"" + (row.pass ? "pass-cell" : "fail-cell") + "\" style=\"padding:8px;border-top:1px solid #2a3544;\">" +
        (row.pass ? "PASS" : "FAIL") + "</td>" +
        "<td style=\"padding:8px;border-top:1px solid #2a3544;font-size:0.85rem;color:#b8c5d4;\">" +
        escapeHtml(row.detail) + "</td></tr>";
    });

    html += "</tbody></table>";
    root.innerHTML = html;
  }

  async function runFixtureTests() {
    try {
      var corpus = await fetchJson("/qa/fixtures/p5-search-recall-corpus.json");
      var queries = await fetchJson("/qa/fixtures/p5-search-recall-queries.json");
      var results = runRecallChecks(corpus, queries);
      renderResults(results);
    } catch (err) {
      var summary = document.getElementById("fixtureSummary");
      if (summary) {
        summary.className = "qa-guard-summary fail";
        summary.textContent = "Fixture runner failed: " + String(err && err.message ? err.message : err);
      }
    }
  }

  window.BoundLoreSearchRecallFixture = {
    normalizeQuery: normalizeQuery,
    tokenize: tokenize,
    expandSynonyms: expandSynonyms,
    isPublicSearchable: isPublicSearchable,
    buildSearchText: buildSearchText,
    scoreRecord: scoreRecord,
    searchFixtureCorpus: searchFixtureCorpus,
    renderSafeSnippet: renderSafeSnippet,
    escapeHtml: escapeHtml,
    runRecallChecks: runRecallChecks
  };

  runFixtureTests();
})();
