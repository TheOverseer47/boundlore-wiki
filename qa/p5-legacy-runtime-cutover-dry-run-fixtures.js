// P5-E.9E.5I — Legacy runtime cutover dry-run harness.
// Requires temporary local supabase-config.js pointing at Legacy dry-run mode.
// No API keys in this file. No DB writes.

(function() {
  var LEGACY_REF = "ohkoojpzmptdfyowdgog";
  var STAGING_REF = "jzzgoiwfbuwiiyvwgwri";
  var checks = [];
  var matrix = [];
  var passCount = 0;
  var failCount = 0;

  var CORE_QUERIES = [
    { q: "ogre", expect: "ogre-mage-9651e6" },
    { q: "mage", expect: "ogre-mage-9651e6" },
    { q: "campfire", expect: "near-a-campfire-787bbd19" },
    { q: "near campfire", expect: "near-a-campfire-787bbd19" },
    { q: "swamp", expect: "swamplands-94dadc07" },
    { q: "swamplands", expect: "swamplands-94dadc07" },
    { q: "boundlore", expect: "why-boundlore-is-the-best-wiki-there-is-d16ea72a" },
    { q: "best wiki", expect: "why-boundlore-is-the-best-wiki-there-is-d16ea72a" },
    { q: "staff", expect: "staff-of-fire-2f316b0d" },
    { q: "fire", expect: "staff-of-fire-2f316b0d" },
    { q: "staff fire", expect: "staff-of-fire-2f316b0d" },
    { q: "smought", expect: "smought-835df97a" }
  ];

  var SAFETY_QUERIES = [
    "zzzxxy-no-hit",
    "<script>alert(1)</script>",
    new Array(160).join("a"),
    "Contribution",
    "qa-test",
    "fixture",
    "seed",
    "P5E9E4I",
    "deleted",
    "pending"
  ];

  function assert(id, label, ok, detail) {
    checks.push({ id: id, label: label, ok: !!ok, detail: detail || "" });
    if (ok) passCount += 1;
    else failCount += 1;
  }

  function pageText() {
    return (document.body && document.body.innerText) || "";
  }

  function hasLeakMarkers(text) {
    if (!text) return false;
    if (/<!--\s*BLMETA/i.test(text)) return true;
    if (/\bBLMETA\b/i.test(text)) return true;
    if (/\"search_text\"|\"search_vector\"|'search_text'|'search_vector'/i.test(text)) return true;
    if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return true;
    if (/Contribution:/i.test(text)) return true;
    if (/\b(qa-|test-|fixture-|contribution-|seed-)[a-z0-9-]+/i.test(text)) return true;
    return false;
  }

  function runConfigChecks() {
    assert("cfg-ref-legacy", "Aktive Ref ist Legacy Dry Run", window.BOUNDLORE_SUPABASE_PROJECT_REF === LEGACY_REF, window.BOUNDLORE_SUPABASE_PROJECT_REF || "(empty)");
    assert("cfg-not-staging", "Aktive Ref ist nicht Staging", window.BOUNDLORE_SUPABASE_PROJECT_REF !== STAGING_REF);
    assert("cfg-dry-run-mode", "Runtime-Modus legacy_dry_run_verification", window.BOUNDLORE_SUPABASE_RUNTIME_MODE === "legacy_dry_run_verification", window.BOUNDLORE_SUPABASE_RUNTIME_MODE);
    assert("cfg-dry-run-status", "Config-Status LEGACY_DRY_RUN_VERIFIED", window.BOUNDLORE_SUPABASE_CONFIG_STATUS === "LEGACY_DRY_RUN_VERIFIED", window.BOUNDLORE_SUPABASE_CONFIG_STATUS);
    assert("cfg-not-production", "Kein Production/Launch Marker", String(window.BOUNDLORE_SUPABASE_RUNTIME_MODE || "").indexOf("production") < 0);
    assert("supabase-client", "Supabase-Client initialisiert", window.supabase !== null && typeof window.supabase.rpc === "function");
    assert("search-api", "BoundLoreSearch verfügbar", typeof window.BoundLoreSearch === "object" && typeof window.BoundLoreSearch.callSearchRpc === "function");
    assert("rpc-name", "RPC-first bl_search_public_content", window.BoundLoreSearch && window.BoundLoreSearch.SEARCH_RPC_NAME === "bl_search_public_content");
    assert("no-boundlore-com", "Kein boundlore.com Host", String(window.location.hostname || "").indexOf("boundlore.com") < 0);
    assert("localhost-only", "localhost Dry Run", window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  }

  function inspectResults(query, resp) {
    var hits = (resp && resp.results) ? resp.results.length : 0;
    var topSlug = hits > 0 && resp.results[0].document ? resp.results[0].document.slug : "";
    var topTitle = hits > 0 && resp.results[0].document ? resp.results[0].document.title : "";
    var serialized = JSON.stringify(resp || {});
    var leak = hasLeakMarkers(serialized) || hasLeakMarkers(pageText());
    var rpcErr = !!(resp && resp.error);
    var usedRpc = !!(resp && resp.usedRpc);
    return { hits: hits, topSlug: topSlug, topTitle: topTitle, leak: leak, rpcErr: rpcErr, usedRpc: usedRpc };
  }

  function runQueryMatrix() {
    var S = window.BoundLoreSearch;
    var chain = Promise.resolve();

    CORE_QUERIES.forEach(function(item) {
      chain = chain.then(function() {
        return S.callSearchRpc(item.q, { limit: 10 }).then(function(resp) {
          var info = inspectResults(item.q, resp);
          var topOk = info.topSlug === item.expect || (info.hits > 0 && resp.results.some(function(r) {
            return r.document && r.document.slug === item.expect;
          }));
          matrix.push({
            query: item.q,
            hits: info.hits,
            topSlug: info.topSlug,
            topTitle: info.topTitle,
            expected: item.expect,
            expectedOk: topOk,
            rpcErr: info.rpcErr,
            leak: info.leak,
            usedRpc: info.usedRpc
          });
          assert("core-" + item.q.replace(/\s+/g, "-"), "Core Query: " + item.q, info.usedRpc && !info.rpcErr && !info.leak && topOk, "hits=" + info.hits + " top=" + info.topSlug);
        });
      });
    });

    SAFETY_QUERIES.forEach(function(q) {
      chain = chain.then(function() {
        return S.callSearchRpc(q, { limit: 10 }).then(function(resp) {
          var info = inspectResults(q, resp);
          var ok = info.usedRpc && !info.rpcErr && !info.leak && info.hits === 0;
          matrix.push({
            query: q.length > 40 ? q.slice(0, 40) + "…" : q,
            hits: info.hits,
            topSlug: info.topSlug,
            expected: "0",
            expectedOk: ok,
            rpcErr: info.rpcErr,
            leak: info.leak,
            usedRpc: info.usedRpc,
            safety: true
          });
          var id = "safe-" + String(q).slice(0, 12).replace(/[^a-z0-9]+/gi, "-");
          assert(id, "Safety Query: " + (q.length > 30 ? q.slice(0, 30) + "…" : q), ok, "hits=" + info.hits);
        });
      });
    });

    return chain;
  }

  function render() {
    var summary = document.getElementById("summary");
    var checksEl = document.getElementById("checks");
    var matrixEl = document.getElementById("matrix");
    var total = passCount + failCount;
    var verdict = failCount === 0 ? "PASS" : "FAIL";
    summary.innerHTML = verdict + " — " + passCount + "/" + total + " checks (LEGACY_RUNTIME_CUTOVER_DRY_RUN_" + verdict + ")";
    summary.className = failCount === 0 ? "pass" : "fail";
    checksEl.textContent = checks.map(function(row) {
      return "[" + (row.ok ? "PASS" : "FAIL") + "] " + row.id + " — " + row.label + (row.detail ? " (" + row.detail + ")" : "");
    }).join("\n");
    matrixEl.textContent = matrix.map(function(row) {
      return row.query + " | hits=" + row.hits + " | top=" + (row.topSlug || "-") + " | expect=" + row.expected + " | ok=" + row.expectedOk + " | rpcErr=" + row.rpcErr + " | leak=" + row.leak;
    }).join("\n");
    window.__BOUNDLORE_LEGACY_DRY_RUN_MATRIX__ = matrix;
    window.__BOUNDLORE_LEGACY_DRY_RUN_CHECKS__ = { pass: passCount, fail: failCount, total: total, verdict: verdict };
  }

  runConfigChecks();
  runQueryMatrix()
    .catch(function(err) {
      assert("matrix-exception", "Query Matrix ohne Exception", false, err && (err.message || String(err)));
    })
    .finally(function() {
      render();
    });
})();
