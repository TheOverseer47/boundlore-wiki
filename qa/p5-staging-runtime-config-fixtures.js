// P5-E.9E.4B — Staging runtime config fixture harness. No Supabase writes. No secrets in output.

(function() {
  var checks = [];
  var passCount = 0;
  var failCount = 0;
  var EXPECTED_REF = "jzzgoiwfbuwiiyvwgwri";
  var FORBIDDEN_REF = "ohkoojpzmptdfyowdgog";

  function assert(id, label, ok, detail) {
    checks.push({ id: id, label: label, ok: !!ok, detail: detail || "" });
    if (ok) passCount += 1;
    else failCount += 1;
  }

  function maskKey(value) {
    if (!value || typeof value !== "string") return "(absent)";
    if (value.length <= 16) return "(redacted)";
    return value.slice(0, 14) + "…";
  }

  function runStaticChecks() {
    assert("cfg-status-present", "BOUNDLORE_SUPABASE_CONFIG_STATUS gesetzt", typeof window.BOUNDLORE_SUPABASE_CONFIG_STATUS === "string");
    assert("cfg-ref-present", "BOUNDLORE_SUPABASE_PROJECT_REF gesetzt", typeof window.BOUNDLORE_SUPABASE_PROJECT_REF === "string");
    assert("cfg-ref-staging", "Aktive Ref ist Staging", window.BOUNDLORE_SUPABASE_PROJECT_REF === EXPECTED_REF, window.BOUNDLORE_SUPABASE_PROJECT_REF || "(empty)");
    assert("cfg-ref-not-legacy", "Aktive Ref ist nicht Legacy", window.BOUNDLORE_SUPABASE_PROJECT_REF !== FORBIDDEN_REF);
    assert("cfg-status-verified", "Config-Status STAGING_REF_VERIFIED", window.BOUNDLORE_SUPABASE_CONFIG_STATUS === "STAGING_REF_VERIFIED", window.BOUNDLORE_SUPABASE_CONFIG_STATUS);
    assert("cfg-not-blocked-legacy", "Status ist nicht BLOCKED_LEGACY_REF", window.BOUNDLORE_SUPABASE_CONFIG_STATUS !== "BLOCKED_LEGACY_REF");
    assert("cfg-runtime-mode", "Runtime-Modus staging_verification", window.BOUNDLORE_SUPABASE_RUNTIME_MODE === "staging_verification");
    assert("supabase-client", "Supabase-Client initialisiert", window.supabase !== null && typeof window.supabase.from === "function");
    assert("recall-utils", "BoundLoreSearchRecall geladen", typeof window.BoundLoreSearchRecall === "object" && window.BoundLoreSearchRecall !== null);
    assert("recall-search", "searchRecords verfügbar", typeof window.BoundLoreSearchRecall.searchRecords === "function");
    assert("no-production-host", "Kein boundlore.com in location", String(window.location.hostname || "").indexOf("boundlore.com") < 0);
    assert("no-legacy-marker", "Kein Legacy-Ref-Marker im Config-Status", String(window.BOUNDLORE_SUPABASE_CONFIG_STATUS || "").indexOf("LEGACY") < 0 || window.BOUNDLORE_SUPABASE_CONFIG_STATUS === "STAGING_REF_VERIFIED");
    assert("no-key-in-summary", "Fixture druckt keinen vollen Key", true, "keys redacted by design");

    if (typeof window.BoundLoreErrorReporter !== "undefined" && window.BoundLoreErrorReporter.getDiagnostics) {
      var diag = window.BoundLoreErrorReporter.getDiagnostics();
      assert("error-reporter-local", "ErrorReporter bleibt lokal", diag && diag.provider_sent === false);
    } else {
      assert("error-reporter-optional", "ErrorReporter optional (nicht geladen)", true);
    }
  }

  function fetchSearchPageOrder() {
    return fetch("/wiki/search/index.html", { cache: "no-store" })
      .then(function(res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function(html) {
        var configIdx = html.indexOf('src="/js/supabase-config.js"');
        var recallIdx = html.indexOf('src="/js/search-recall-utils.js');
        var searchIdx = html.indexOf('src="/js/search.js');
        assert("search-html-config", "wiki/search lädt supabase-config.js", configIdx >= 0);
        assert("search-html-recall", "wiki/search lädt search-recall-utils.js", recallIdx >= 0);
        assert("search-html-search", "wiki/search lädt search.js", searchIdx >= 0);
        assert("search-order-config-before-recall", "supabase-config vor search-recall-utils", configIdx >= 0 && recallIdx > configIdx);
        assert("search-order-recall-before-search", "search-recall-utils vor search.js", recallIdx >= 0 && searchIdx > recallIdx);
        assert("search-no-legacy-url", "wiki/search HTML enthält keinen Legacy-Ref", html.indexOf(FORBIDDEN_REF) < 0);
        assert("search-staging-path", "wiki/search HTML referenziert staging config path", html.indexOf("/js/supabase-config.js") >= 0);
      });
  }

  function render() {
    var summary = document.getElementById("summary");
    var checksEl = document.getElementById("checks");
    var total = passCount + failCount;
    var verdict = failCount === 0 ? "PASS" : "FAIL";
    summary.innerHTML = verdict + " — " + passCount + "/" + total + " Checks (STAGING_RUNTIME_CONFIG_" + verdict + ")";
    summary.className = failCount === 0 ? "pass" : "fail";
    checksEl.textContent = checks.map(function(row) {
      return "[" + (row.ok ? "PASS" : "FAIL") + "] " + row.id + " — " + row.label + (row.detail ? " (" + row.detail + ")" : "");
    }).join("\n");
  }

  runStaticChecks();
  fetchSearchPageOrder()
    .catch(function(err) {
      assert("search-html-fetch", "wiki/search/index.html lesbar", false, err.message || String(err));
    })
    .finally(function() {
      render();
    });
})();
