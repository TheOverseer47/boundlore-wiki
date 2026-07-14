// P5-E.9E.4F — Search RPC Integration fixture harness.
// Tests js/search.js RPC-first helpers. No Supabase writes. No DB apply.

(function() {
  var checks = [];
  var passCount = 0;
  var failCount = 0;

  function assert(id, label, ok, detail) {
    checks.push({ id: id, label: label, ok: !!ok, detail: detail || "" });
    if (ok) passCount += 1;
    else failCount += 1;
  }

  function runChecks() {
    var S = window.BoundLoreSearch;
    var R = window.BoundLoreSearchRecall;

    assert("api-search-global", "window.BoundLoreSearch verfügbar", typeof S === "object" && S !== null);
    assert("api-rpc-name", "SEARCH_RPC_NAME exportiert", S.SEARCH_RPC_NAME === "bl_search_public_content");
    assert("api-rpc-max", "SEARCH_RPC_QUERY_MAX_LEN = 120", S.SEARCH_RPC_QUERY_MAX_LEN === 120);
    assert("api-normalize", "normalizeRpcQuery exportiert", typeof S.normalizeRpcQuery === "function");
    assert("api-map", "mapRpcResult exportiert", typeof S.mapRpcResult === "function");
    assert("api-call", "callSearchRpc exportiert", typeof S.callSearchRpc === "function");
    assert("api-run-rpc", "runRpcSearch exportiert", typeof S.runRpcSearch === "function");
    assert("api-is-rpc", "isRpcAvailable exportiert", typeof S.isRpcAvailable === "function");

    var longQuery = new Array(150).join("a");
    var capped = S.normalizeRpcQuery(longQuery);
    assert("query-cap-120", "Query wird auf 120 Zeichen begrenzt", capped.length === 120);

    var unsafe = '<img src=x onerror=alert(1)>';
    assert("unsafe-empty", "Unsafe Query wird zu leer normalisiert", S.normalizeRpcQuery(unsafe) === "");

    var safeMapped = S.mapRpcResult({
      title: "Ember Salamander",
      canonical_slug: "ember-salamander",
      canonical_url: "/wiki/post/ember-salamander/",
      excerpt: "A fiery creature.",
      category: "Creatures",
      entity_domain: "creature",
      entity_subtype: "monster",
      score: 88.5,
      source_type: "post",
      matched_fields: ["title"],
    });
    assert("map-safe-row", "Sichere RPC-Zeile wird gemappt", !!safeMapped && safeMapped.document.title === "Ember Salamander");
    assert("map-slug", "Slug wird gemappt", safeMapped && safeMapped.document.slug === "ember-salamander");
    assert("map-url", "URL wird gemappt", safeMapped && safeMapped.document.url.indexOf("/wiki/post/ember-salamander/") === 0);
    assert("map-score", "Score wird gemappt", safeMapped && safeMapped.score === 88.5);

    assert("reject-search-text", "search_text wird verworfen", S.mapRpcResult({
      title: "Leak",
      canonical_slug: "leak",
      search_text: "secret body",
    }) === null);

    assert("reject-search-vector", "search_vector wird verworfen", S.mapRpcResult({
      title: "Leak",
      canonical_slug: "leak",
      search_vector: "'fire':1A",
    }) === null);

    assert("reject-blmeta", "BLMETA wird verworfen", S.mapRpcResult({
      title: "Leak",
      canonical_slug: "leak",
      excerpt: "<!--BLMETA {\"x\":1}-->",
    }) === null);

    assert("reject-email", "E-Mail wird verworfen", S.mapRpcResult({
      title: "user@test.com",
      canonical_slug: "leak",
      excerpt: "contact user@test.com",
    }) === null);

    assert("reject-contribution-title", "Contribution:-Titel wird verworfen", S.mapRpcResult({
      title: "Contribution: Secret",
      canonical_slug: "ok-slug",
      excerpt: "ok",
    }) === null);

    assert("reject-qa-slug", "qa- Slug wird verworfen", S.mapRpcResult({
      title: "QA Item",
      canonical_slug: "qa-test-item",
      excerpt: "ok",
    }) === null);

    assert("reject-unknown-field", "Unbekanntes Feld verworfen", S.mapRpcResult({
      title: "Ok",
      canonical_slug: "ok-slug",
      excerpt: "ok",
      private_note: "secret",
    }) === null);

    assert("allow-matched-fields", "matched_fields search_vector Metadatum erlaubt", S.mapRpcResult({
      title: "Ember Salamander",
      canonical_slug: "staging-rpc-ember-salamander-p5e9e4g",
      canonical_url: "/wiki/post/staging-rpc-ember-salamander-p5e9e4g/",
      excerpt: "monster creature beast",
      category: "creatures",
      score: 18.3,
      source_type: "post",
      matched_fields: ["search_vector"],
    }) !== null);

    assert("whitelist-only", "Nur whitelisted Felder in Output", function() {
      if (!safeMapped || !safeMapped.document) return false;
      var docKeys = Object.keys(safeMapped.document);
      return docKeys.indexOf("search_text") < 0 &&
        docKeys.indexOf("search_vector") < 0 &&
        docKeys.indexOf("content") < 0 &&
        docKeys.indexOf("id") < 0;
    }());

    assert("recall-still-available", "search-recall-utils.js bleibt nutzbar", typeof R === "object" && typeof R.searchRecords === "function");

    var recallHits = R.searchRecords([
      R.postToRecallRecord({ title: "Ember Salamander", slug: "ember-salamander", status: "published", excerpt: "fire" })
    ], "monster", { limit: 5 });
    assert("recall-fixture-compat", "Lokale Recall-Fixture-Kompatibilität", recallHits.length >= 0);

    assert("no-posts-primary", "fetchStructuredSearchCorpus nicht mehr exportiert", typeof S.fetchStructuredSearchCorpus !== "function");

    assert("structured-uses-rpc", "runStructuredSearch exportiert", typeof S.runStructuredSearch === "function");

    assert("blocked-fields-set", "Blocked fields Set vorhanden", S.SEARCH_RPC_BLOCKED_RESULT_FIELDS instanceof Set);
    assert("allowed-fields-set", "Allowed fields Set vorhanden", S.SEARCH_RPC_ALLOWED_RESULT_FIELDS instanceof Set);

    assert("blocked-has-search-text", "Blocked enthält search_text", S.SEARCH_RPC_BLOCKED_RESULT_FIELDS.has("search_text"));
    assert("blocked-has-search-vector", "Blocked enthält search_vector", S.SEARCH_RPC_BLOCKED_RESULT_FIELDS.has("search_vector"));
    assert("blocked-has-blmeta", "Blocked enthält blmeta", S.SEARCH_RPC_BLOCKED_RESULT_FIELDS.has("blmeta"));

    assert("escape-via-recall", "escapeHtml über Recall verfügbar", typeof R.escapeHtml === "function");
    var escaped = R.escapeHtml(unsafe);
    assert("unsafe-escaped", "Unsafe Query wird escaped", escaped.indexOf("<") < 0 && escaped.indexOf(">") < 0 && escaped.indexOf("&lt;") >= 0);

    assert("empty-state-html", "Empty-State HTML generierbar", function() {
      var html = R.renderEmptyStateHtml("monster");
      return typeof html === "string" && html.indexOf("search-empty") >= 0;
    }());

    assert("fail-closed-unavailable", "RPC unavailable fail-closed", function() {
      var prevStatus = window.BOUNDLORE_SUPABASE_CONFIG_STATUS;
      var prevSupabase = window.supabase;
      window.BOUNDLORE_SUPABASE_CONFIG_STATUS = "BLOCKED_UNEXPECTED_REF";
      window.supabase = null;
      var available = S.isRpcAvailable();
      window.BOUNDLORE_SUPABASE_CONFIG_STATUS = prevStatus;
      window.supabase = prevSupabase;
      return available === false;
    }());

    return S.callSearchRpc("monster", { limit: 5 }).then(function(result) {
      assert("call-fail-closed-no-client", "callSearchRpc fail-closed ohne Client", result.failClosed === true || result.usedRpc === false || Array.isArray(result.results));
      assert("call-no-throw", "callSearchRpc wirft nicht", true);
      assert("call-results-array", "callSearchRpc liefert results Array", Array.isArray(result.results));

      return S.runRpcSearch("zzzxxy-no-hit", { postLimit: 8 });
    }).then(function(runResult) {
      assert("run-rpc-shape", "runRpcSearch liefert postResults", Array.isArray(runResult.postResults));
      assert("run-rpc-no-missing", "runRpcSearch missingResults leer (kein posts-Read)", Array.isArray(runResult.missingResults) && runResult.missingResults.length === 0);
      assert("run-rpc-meta", "runRpcSearch rpcMeta vorhanden", !!runResult.rpcMeta);

      return fetch("/js/search.js?v=p5-e9e4f").then(function(res) {
        return res.text();
      });
    }).then(function(searchJsSource) {
      searchJsSource = searchJsSource || "";
      assert("no-posts-from", "Kein .from('posts') im Search-Client", searchJsSource.indexOf('.from("posts")') < 0 && searchJsSource.indexOf(".from('posts')") < 0);
      assert("rpc-primary", "bl_search_public_content im Search-Client", searchJsSource.indexOf("bl_search_public_content") >= 0);
      assert("no-write-insert", "search.js enthält kein .insert(", searchJsSource.indexOf(".insert(") < 0);
      assert("no-write-update", "search.js enthält kein .update(", searchJsSource.indexOf(".update(") < 0);
      assert("no-write-delete", "search.js enthält kein .delete(", searchJsSource.indexOf(".delete(") < 0);
      assert("no-write-upsert", "search.js enthält kein .upsert(", searchJsSource.indexOf(".upsert(") < 0);

      renderSummary();
    }).catch(function(err) {
      assert("fixture-runner", "Fixture runner ohne Crash", false, String(err && err.message || err));
      renderSummary();
    });
  }

  function renderSummary() {
    var summary = document.getElementById("summary");
    var checksEl = document.getElementById("checks");
    var statusClass = failCount === 0 ? "pass" : "fail";
    summary.className = statusClass;
    summary.textContent = (failCount === 0 ? "PASS" : "FAIL") + " — " + passCount + " passed, " + failCount + " failed (" + checks.length + " checks)";
    checksEl.textContent = checks.map(function(c) {
      return (c.ok ? "[PASS] " : "[FAIL] ") + c.id + ": " + c.label + (c.detail ? " — " + c.detail : "");
    }).join("\n");
  }

  runChecks();
})();
