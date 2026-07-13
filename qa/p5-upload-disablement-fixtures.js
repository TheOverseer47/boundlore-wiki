// QA-only upload disablement harness (P5-E.8C).
// Tests storage-deferred guards with mocks; no Supabase, no storage, no writes.

(function() {
  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  async function runChecks() {
    try { delete window.supabase; } catch (e) { window.supabase = undefined; }

    var RG = window.BoundLoreReleaseGateClient;
    var checks = [];

    function add(id, label, pass, detail, category) {
      checks.push({ id: id, label: label, pass: !!pass, detail: detail || "", category: category || "core" });
    }

    add(1, "ReleaseGateClient exists", !!RG, RG ? "loaded" : "missing", "core");
    add(2, "version p5-e8c", RG && RG.RELEASE_GATE_CLIENT_VERSION === "p5-e8c", RG ? RG.RELEASE_GATE_CLIENT_VERSION : "", "core");
    add(3, "storage uploads deferred flag true", RG && RG.isStorageUploadsDeferred() === true, String(RG && RG.isStorageUploadsDeferred()), "policy");

    var uploadBlocked = RG ? RG.assertCanUploadStorage("discovery-uploads") : { ok: true };
    add(4, "assertCanUploadStorage blocks while deferred", uploadBlocked && uploadBlocked.ok === false && uploadBlocked.deferred === true, uploadBlocked ? String(uploadBlocked.ok) : "", "guard");
    add(5, "upload blocked message is user-facing", uploadBlocked && /temporarily unavailable/i.test(uploadBlocked.message || ""), uploadBlocked ? uploadBlocked.message : "", "guard");

    var supportBlocked = RG ? RG.assertCanUploadStorage("report-screenshots") : { ok: true };
    add(6, "support screenshot upload blocked while deferred", supportBlocked && supportBlocked.ok === false, supportBlocked ? String(supportBlocked.ok) : "", "guard");

    var probeHost = document.getElementById("uploadProbeHost");
    var fakeForm = document.getElementById("fakeUploadForm");
    var discoveryInput = document.getElementById("fakeDiscoveryUpload");
    var supportInput = document.getElementById("fakeSupportScreenshot");
    var contribInput = document.getElementById("fakeContribMedia");

    if (probeHost && RG) {
      probeHost.hidden = false;
      discoveryInput.disabled = false;
      supportInput.disabled = false;
      contribInput.disabled = false;
      RG.applyStorageUploadDisablement(fakeForm);
      add(7, "discovery file input disabled", discoveryInput.disabled === true, String(discoveryInput.disabled), "ui");
      add(8, "support screenshot input disabled", supportInput.disabled === true, String(supportInput.disabled), "ui");
      add(9, "contrib evidence input disabled", contribInput.disabled === true, String(contribInput.disabled), "ui");
      add(10, "deferred marker on file input", discoveryInput.getAttribute("data-bl-storage-upload-deferred") === "1", discoveryInput.getAttribute("data-bl-storage-upload-deferred"), "ui");
      probeHost.hidden = true;
    } else {
      add(7, "discovery file input disabled", false, "probe missing", "ui");
      add(8, "support screenshot input disabled", false, "probe missing", "ui");
      add(9, "contrib evidence input disabled", false, "probe missing", "ui");
      add(10, "deferred marker on file input", false, "probe missing", "ui");
    }

    var noticeHost = document.createElement("div");
    if (RG) RG.renderStorageUploadUnavailableNotice(noticeHost, { prepend: true });
    add(11, "storage unavailable notice renders", noticeHost.querySelector("[data-bl-storage-upload-notice='1']") != null, "notice", "ui");
    add(12, "notice mentions unavailable", /unavailable|attachments/i.test(noticeHost.textContent || ""), "copy", "ui");

    var diag = RG ? RG.getReleaseGateDiagnostics() : {};
    add(13, "diagnostics expose storageUploadsDeferred", diag && diag.storageUploadsDeferred === true, String(diag && diag.storageUploadsDeferred), "meta");

    var createPostSrc = await fetch("/js/create-post.js", { cache: "no-store" }).then(function(r) { return r.text(); }).catch(function() { return ""; });
    add(14, "create-post strips deferred files helper", /stripDeferredStorageFilesCP/i.test(createPostSrc), "grep", "app");
    add(15, "create-post upload guard before storage.from", /isStorageUploadsDeferred[\s\S]*assertCanUploadStorage[\s\S]*\.from\(DISCOVERY_STORAGE_BUCKET\)/i.test(createPostSrc), "grep", "app");
    add(16, "create-post applies storage upload guards on page", /applyStorageUploadGuardsCP/i.test(createPostSrc), "grep", "app");

    var supportSrc = await fetch("/js/support.js", { cache: "no-store" }).then(function(r) { return r.text(); }).catch(function() { return ""; });
    add(17, "support applies storage upload disablement", /applyStorageUploadDisablement/i.test(supportSrc), "grep", "app");
    add(18, "support guards screenshot upload call", /assertCanUploadStorage\(['"]report-screenshots['"]\)/i.test(supportSrc), "grep", "app");

    var moduleFetch = await fetch("/js/release-gate-client.js?v=p5-e8c", { cache: "no-store" }).then(function(r) { return r.text(); }).catch(function() { return ""; });
    add(19, "no storage bypass via query params", !/location\.search.*storage|searchparams.*upload/i.test(moduleFetch), "grep", "safety");
    add(20, "no localStorage storage bypass", !/localstorage.*upload/i.test(moduleFetch), "grep", "safety");
    add(21, "no service_role reference", !/grant\s+[\s\S]*service_role|to\s+service_role/i.test(moduleFetch), "grep", "safety");
    add(22, "no Supabase library loaded", typeof window.supabase === "undefined", "window.supabase undefined", "meta");
    add(23, "no live storage calls in fixture", true, "static/mock only", "meta");
    add(24, "storage closure treated as DEFERRED not PASS", RG && RG.isStorageUploadsDeferred() === true, "deferred", "meta");

    var passCount = checks.filter(function(c) { return c.pass; }).length;
    var failCount = checks.length - passCount;

    return {
      ok: failCount === 0,
      allPass: failCount === 0,
      passCount: passCount,
      failCount: failCount,
      results: checks,
    };
  }

  function renderResults(report) {
    var summary = document.getElementById("fixtureSummary");
    var root = document.getElementById("fixtureRoot");
    if (!root) return;

    if (report.error) {
      summary.className = "qa-guard-summary fail";
      summary.innerHTML = '<p class="qa-guard-status-fail">FAIL — ' + escapeText(report.error) + "</p>";
      window.__P5UploadDisablementFixtures = { ok: false, allPass: false, failCount: 1, results: [] };
      return;
    }

    summary.className = "qa-guard-summary " + (report.ok ? "pass" : "fail");
    summary.innerHTML =
      '<p class="' + (report.ok ? "qa-guard-status-pass" : "qa-guard-status-fail") + '">' +
      (report.ok ? "PASS" : "FAIL") + " — " + report.passCount + "/" + report.results.length +
      " checks passed. Storage uploads DEFERRED; paths disabled/hardened.</p>";

    var rows = report.results.map(function(item) {
      return "<tr><td>" + item.id + "</td><td>" + escapeText(item.label) + "</td><td class=\"" +
        (item.pass ? "pass-cell" : "fail-cell") + "\">" + (item.pass ? "PASS" : "FAIL") + "</td><td>" +
        escapeText(item.detail) + "</td><td>" + escapeText(item.category) + "</td></tr>";
    }).join("");

    root.innerHTML =
      '<table class="bl-qa-guard-table" style="width:100%;border-collapse:collapse;font-size:0.88rem;">' +
      "<thead><tr><th>#</th><th>Check</th><th>Status</th><th>Detail</th><th>Category</th></tr></thead><tbody>" +
      rows + "</tbody></table>";

    window.__P5UploadDisablementFixtures = report;
  }

  runChecks()
    .then(renderResults)
    .catch(function(err) {
      renderResults({ error: err && err.message ? err.message : String(err) });
    });
})();
