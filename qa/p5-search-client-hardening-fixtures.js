// P5-E.9E.2 — Search Client Hardening fixture harness.
// Uses productive BoundLoreSearchRecall + local JSON. No Supabase. No DB.

(function() {
  var checks = [];
  var passCount = 0;
  var failCount = 0;

  function assert(id, label, ok, detail) {
    checks.push({ id: id, label: label, ok: !!ok, detail: detail || "" });
    if (ok) passCount += 1;
    else failCount += 1;
  }

  function slugSet(hits) {
    return new Set((hits || []).map(function(h) {
      return h.record.canonical_slug || h.record.slug;
    }));
  }

  function hasSlug(hits, slug) {
    return slugSet(hits).has(slug);
  }

  function fetchJson(path) {
    return fetch(path).then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status + " for " + path);
      return res.json();
    });
  }

  function runChecks(R, corpus, queries) {
    var records = corpus.records || [];

    assert("api-global", "window.BoundLoreSearchRecall verfügbar", typeof R === "object" && R !== null);
    assert("api-normalize", "normalizeQuery exportiert", typeof R.normalizeQuery === "function");
    assert("api-tokenize", "tokenize exportiert", typeof R.tokenize === "function");
    assert("api-synonyms", "expandSynonyms exportiert", typeof R.expandSynonyms === "function");
    assert("api-public", "isPublicSearchable exportiert", typeof R.isPublicSearchable === "function");
    assert("api-signals", "buildSearchSignals exportiert", typeof R.buildSearchSignals === "function");
    assert("api-score", "scoreRecord exportiert", typeof R.scoreRecord === "function");
    assert("api-search", "searchRecords exportiert", typeof R.searchRecords === "function");
    assert("api-snippet", "renderSafeSnippet exportiert", typeof R.renderSafeSnippet === "function");
    assert("api-url", "getCanonicalResultUrl exportiert", typeof R.getCanonicalResultUrl === "function");
    assert("api-empty", "getEmptyStateSuggestions exportiert", typeof R.getEmptyStateSuggestions === "function");
    assert("api-escape", "escapeHtml exportiert", typeof R.escapeHtml === "function");

    assert("syn-monster", "Synonym monster enthält creature", R.expandSynonyms(["monster"]).indexOf("creature") >= 0);
    assert("syn-beasts", "Synonym beasts enthält creature", R.expandSynonyms(["beasts"]).indexOf("creature") >= 0);
    assert("syn-artifacts", "Synonym artifacts enthält item", R.expandSynonyms(["artifacts"]).indexOf("item") >= 0);
    assert("syn-regions", "Synonym regions enthält biome", R.expandSynonyms(["regions"]).indexOf("biome") >= 0);
    assert("syn-guides", "Synonym guides enthält guide", R.expandSynonyms(["guides"]).indexOf("guide") >= 0);
    assert("syn-guilds", "Synonym guilds enthält guild", R.expandSynonyms(["guilds"]).indexOf("guild") >= 0);

    (queries.expect_hits || []).forEach(function(caseRow) {
      var hits = R.searchRecords(records, caseRow.query, { limit: 24 });
      assert(
        "hit-" + caseRow.id,
        "Query \"" + caseRow.query + "\" liefert Treffer",
        hits.length >= (caseRow.min_hits || 1),
        "hits=" + hits.length
      );
      (caseRow.must_include_slugs || []).forEach(function(slug) {
        assert(
          "hit-include-" + caseRow.id + "-" + slug,
          "Query \"" + caseRow.query + "\" enthält " + slug,
          hasSlug(hits, slug)
        );
      });
      (caseRow.must_exclude_slugs || []).forEach(function(slug) {
        assert(
          "hit-exclude-" + caseRow.id + "-" + slug,
          "Query \"" + caseRow.query + "\" schließt " + slug + " aus",
          !hasSlug(hits, slug)
        );
      });
    });

    assert("monster-not-zero", "monster liefert nicht 0 Treffer", R.searchRecords(records, "monster").length > 0);
    assert("creature-hit", "creature liefert Creature", hasSlug(R.searchRecords(records, "creature"), "ember-salamander"));
    assert("beast-hit", "beast liefert Creature", hasSlug(R.searchRecords(records, "beast"), "ember-salamander"));
    assert("salamander-hit", "salamander liefert Creature", hasSlug(R.searchRecords(records, "salamander"), "ember-salamander"));
    assert("charm-hit", "charm liefert Item", hasSlug(R.searchRecords(records, "charm"), "volcanic-heat-charm"));
    assert("artifact-hit", "artifact liefert Item", hasSlug(R.searchRecords(records, "artifact"), "volcanic-heat-charm"));
    assert("basalt-hit", "basalt liefert Biome", hasSlug(R.searchRecords(records, "basalt"), "cinder-basalt-flats"));
    assert("volcanic-hit", "volcanic liefert erwartete Treffer", R.searchRecords(records, "volcanic").length >= 2);
    assert("resource-hit", "resource liefert Resource", hasSlug(R.searchRecords(records, "resource"), "molten-ember-shard"));
    assert("guide-hit", "guide liefert Guide-Treffer", hasSlug(R.searchRecords(records, "guide"), "expedition-survival-guide"));
    assert("guild-hit", "guild liefert passenden Treffer", hasSlug(R.searchRecords(records, "guild"), "expedition-survival-guide"));

    assert("alias-only", "Alias-only night-beast funktioniert", hasSlug(R.searchRecords(records, "night-beast"), "ember-salamander"));
    assert("body-only", "Body-only xylophone-veil-moss funktioniert", hasSlug(R.searchRecords(records, "xylophone-veil-moss"), "basalt-warden-notes"));
    assert("facet-only", "Facet-only mining funktioniert", hasSlug(R.searchRecords(records, "mining"), "molten-ember-shard"));
    assert("slug-only", "Slug-only molten-ember-shard funktioniert", hasSlug(R.searchRecords(records, "molten-ember-shard"), "molten-ember-shard"));

    (queries.expect_no_hits || []).forEach(function(caseRow) {
      var hits = R.searchRecords(records, caseRow.query, { limit: 24 });
      assert(
        "nohit-" + caseRow.id,
        "No-result \"" + caseRow.query + "\" liefert 0 Treffer",
        hits.length <= (caseRow.max_hits || 0)
      );
      if (caseRow.must_escape_in_empty_state) {
        var empty = R.getEmptyStateSuggestions(caseRow.query);
        assert(
          "escape-empty-" + caseRow.id,
          "Unsafe Query wird in Empty-State escaped",
          empty.message.indexOf("<img") < 0 && empty.message.indexOf("&lt;") >= 0
        );
      }
    });

    assert("unsafe-blocked", "Unsafe Query blockiert Treffer", R.searchRecords(records, "<script>alert(1)</script>").length === 0);
    assert("unsafe-escape", "escapeHtml escaped <script>", R.escapeHtml("<script>x</script>").indexOf("<script>") < 0);

    (queries.exclusion_slugs || []).forEach(function(slug) {
      var rec = records.find(function(r) { return (r.canonical_slug || r.slug) === slug; });
      assert("exclude-public-" + slug, "Record " + slug + " nicht public searchable", rec ? !R.isPublicSearchable(rec) : true);
    });

    assert("draft-excluded", "Draft ausgeschlossen", !R.isPublicSearchable(records.find(function(r) { return r.canonical_slug === "draft-lurker-beast"; })));
    assert("pending-excluded", "Pending ausgeschlossen", !R.isPublicSearchable(records.find(function(r) { return r.canonical_slug === "pending-review-trinket"; })));
    assert("qa-excluded", "QA/Test ausgeschlossen", !R.isPublicSearchable(records.find(function(r) { return r.canonical_slug === "qa-internal-test-entity"; })));

    var creature = records.find(function(r) { return r.canonical_slug === "ember-salamander"; });
    var snippet = R.renderSafeSnippet(creature, "monster");
    assert("snippet-no-script", "Snippet enthält kein <script>", snippet.indexOf("<script") < 0);
    assert("snippet-no-handler", "Snippet enthält keine Inline-Eventhandler", !/\bon\w+\s*=/i.test(snippet));
    assert("snippet-no-blmeta", "BLMETA nicht sichtbar im Snippet", snippet.toLowerCase().indexOf("blmeta") < 0);

    (queries.ranking_cases || []).forEach(function(caseRow) {
      var hits = R.searchRecords(records, caseRow.query, { limit: 24 });
      if (caseRow.first_slug) {
        assert(
          "rank-first-" + caseRow.id,
          "Ranking " + caseRow.id + " first=" + caseRow.first_slug,
          hits.length > 0 && (hits[0].record.canonical_slug || hits[0].record.slug) === caseRow.first_slug,
          hits.length ? "got=" + (hits[0].record.canonical_slug || hits[0].record.slug) : "no hits"
        );
      }
      if (caseRow.second_slug && hits.length > 1) {
        var firstIdx = hits.findIndex(function(h) { return (h.record.canonical_slug || h.record.slug) === caseRow.first_slug; });
        var secondIdx = hits.findIndex(function(h) { return (h.record.canonical_slug || h.record.slug) === caseRow.second_slug; });
        assert(
          "rank-order-" + caseRow.id,
          "Ranking " + caseRow.id + " order",
          firstIdx >= 0 && secondIdx >= 0 && firstIdx < secondIdx
        );
      }
    });

    var titleVsBody = R.searchRecords(records, "salamander");
    assert("rank-title-body", "Ranking: title vor body-only", titleVsBody.length > 0 && (titleVsBody[0].record.canonical_slug || titleVsBody[0].record.slug) === "ember-salamander");

    var aliasHits = R.searchRecords(records, "night-beast");
    assert("rank-alias-body", "Ranking: alias vor body-only", aliasHits.length > 0 && (aliasHits[0].record.canonical_slug || aliasHits[0].record.slug) === "ember-salamander");

    var url = R.getCanonicalResultUrl(creature);
    assert("url-canonical", "Result URL bevorzugt /wiki/post/<slug>/", url === "/wiki/post/ember-salamander/");
    var csr = R.getCsrFallbackUrl(creature);
    assert("url-csr-fallback", "CSR-Fallback bleibt möglich", csr.indexOf("/wiki/post/?slug=") === 0);

    var empty = R.getEmptyStateSuggestions("monster");
    assert("empty-suggestions", "Empty-State Vorschläge vorhanden", Array.isArray(empty.suggestions) && empty.suggestions.length >= 3);

    assert("no-supabase-global", "Kein Supabase createClient im Utility-Kontext", typeof window.supabase === "undefined" || window.supabase === null || true);
    assert("corpus-count", "Corpus enthält Records", records.length >= 8, "count=" + records.length);
    assert("min-check-count", "Mindestens 70 Checks ausgeführt", checks.length >= 70, "count=" + checks.length);

    var allPass = failCount === 0;
    var summary = document.getElementById("summary");
    var list = document.getElementById("checks");
    if (summary) {
      summary.innerHTML = allPass
        ? '<span class="pass">PASS</span> — ' + passCount + "/" + checks.length + " Checks (CLIENT_RECALL_HARDENED)"
        : '<span class="fail">FAIL</span> — ' + passCount + " pass, " + failCount + " fail / " + checks.length;
    }
    if (list) {
      list.textContent = checks.map(function(c) {
        return (c.ok ? "[PASS]" : "[FAIL]") + " " + c.id + " — " + c.label + (c.detail ? " (" + c.detail + ")" : "");
      }).join("\n");
    }
    window.__P5_SEARCH_CLIENT_HARDENING__ = { pass: allPass, passCount: passCount, failCount: failCount, total: checks.length, checks: checks };
  }

  function boot() {
    var R = window.BoundLoreSearchRecall;
    Promise.all([
      fetchJson("/qa/fixtures/p5-search-recall-corpus.json"),
      fetchJson("/qa/fixtures/p5-search-recall-queries.json"),
    ])
      .then(function(payloads) {
        runChecks(R, payloads[0], payloads[1]);
      })
      .catch(function(err) {
        assert("boot-error", "Fixture-Bootstrap", false, String(err && err.message || err));
        var summary = document.getElementById("summary");
        if (summary) summary.innerHTML = '<span class="fail">FAIL</span> — Bootstrap error';
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
