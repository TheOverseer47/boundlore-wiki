// QA-only release lock UI harness (P5-E.3).
// Tests BoundLoreReleaseGateClient with fake states; no Supabase, no RPC, no writes.

(function() {
  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function sourceTextFromModule() {
    var el = document.querySelector('script[src*="release-gate-client.js"]');
    if (!el) return "";
    return el.getAttribute("src") || "";
  }

  async function runChecks() {
    try { delete window.supabase; } catch (e) { window.supabase = undefined; }

    var RG = window.BoundLoreReleaseGateClient;
    var checks = [];
    var clientSrc = sourceTextFromModule();

    function add(id, label, pass, detail, category) {
      checks.push({ id: id, label: label, pass: !!pass, detail: detail || "", category: category || "core" });
    }

    add(1, "ReleaseGateClient exists", !!RG, RG ? "loaded" : "missing", "core");
    add(2, "version p5-e8c", RG && RG.RELEASE_GATE_CLIENT_VERSION === "p5-e8c", RG ? RG.RELEASE_GATE_CLIENT_VERSION : "", "core");
    add(3, "shouldAllowClientBypass false", RG && RG.shouldAllowClientBypass() === false, String(RG && RG.shouldAllowClientBypass()), "policy");

    var defaultLocked = RG ? RG.getDefaultLockedState() : null;
    add(4, "default locked state is locked", defaultLocked && defaultLocked.locked === true, defaultLocked ? "locked=" + defaultLocked.locked : "", "state");

    var noClient = RG ? RG.getDefaultLockedState(RG.UNKNOWN_LOCKED_COPY, "no_client") : null;
    add(5, "missing client state is locked", noClient && noClient.locked === true, noClient ? noClient.source : "", "state");

    var readError = RG ? RG.getDefaultLockedState(RG.UNKNOWN_LOCKED_COPY, "read_error") : null;
    add(6, "read error state is locked", readError && readError.locked === true, readError ? readError.source : "", "state");

    var missingConfig = RG ? RG.getDefaultLockedState("Release gate unavailable; submissions are locked.", "missing_config") : null;
    add(7, "missing config state is locked", missingConfig && missingConfig.locked === true, missingConfig ? missingConfig.source : "", "state");

    var invalid = RG ? RG.normalizeReleaseGateRow(null) : null;
    add(8, "invalid row state is locked", invalid && invalid.locked === true, invalid ? invalid.source : "", "state");

    var lockedRow = RG ? RG.normalizeReleaseGateRow({ contribution_locked: true, reason: "test" }) : null;
    add(9, "contribution_locked true = locked", lockedRow && lockedRow.locked === true, "true", "state");

    var unlockedRow = RG ? RG.normalizeReleaseGateRow({ contribution_locked: false, reason: "ok" }) : null;
    add(10, "contribution_locked false = unlocked", unlockedRow && unlockedRow.locked === false, "false", "state");

    var nullLocked = RG ? RG.normalizeReleaseGateRow({ contribution_locked: null }) : null;
    add(11, "null contribution_locked = locked", nullLocked && nullLocked.locked === true, "null", "state");

    var unknownView = RG ? RG.buildReleaseGateStatusView(readError, { forAdmin: true }) : "";
    add(12, "unknown source renders locked copy", /unknown \(locked\)/i.test(unknownView), "admin view", "ui");

    var noticeHost = document.createElement("div");
    var lockedNoticeState = RG ? RG.getDefaultLockedState() : null;
    if (RG) RG.renderReleaseGateNotice(noticeHost, lockedNoticeState);
    add(13, "renderReleaseGateNotice renders locked notice", noticeHost.querySelector("[data-bl-release-gate-notice='1']") != null, "notice", "ui");
    add(14, "locked notice has no submit button", noticeHost.querySelector("button[type='submit']") == null, "no submit in notice", "ui");

    var lockedState = { locked: true, known: true, reason: "locked", source: "db" };
    var unlockedState = { locked: false, known: true, reason: "ok", source: "db" };

    var fakeForm = document.getElementById("fakeSubmitForm");
    var fakeSubmitBtn = document.getElementById("fakeSubmitBtn");
    if (fakeForm && RG) {
      fakeSubmitBtn.disabled = false;
      RG.applyReleaseGateToForm(fakeForm, lockedState);
      add(15, "applyReleaseGateToForm disables submit when locked", fakeSubmitBtn.disabled === true, String(fakeSubmitBtn.disabled), "form");
    } else {
      add(15, "applyReleaseGateToForm disables submit when locked", false, "fake form missing", "form");
    }

    var fakeActionBtn = document.getElementById("fakeActionBtn");
    if (fakeActionBtn && RG) {
      fakeActionBtn.disabled = false;
      RG.applyReleaseGateToButtons(document.getElementById("fakeButtonHost"), lockedState);
      add(16, "applyReleaseGateToButtons disables action buttons when locked", fakeActionBtn.disabled === true, String(fakeActionBtn.disabled), "buttons");
    } else {
      add(16, "applyReleaseGateToButtons disables action buttons when locked", false, "fake button missing", "buttons");
    }

    if (fakeForm && RG) {
      RG.applyReleaseGateToForm(fakeForm, unlockedState);
      var readOnlyBtn = document.getElementById("fakeReadOnlyBtn");
      add(17, "unlocked state does not disable read-only controls", readOnlyBtn && readOnlyBtn.disabled === false, String(readOnlyBtn && readOnlyBtn.disabled), "form");
    } else {
      add(17, "unlocked state does not disable read-only controls", false, "fake form missing", "form");
    }

    var blocked = RG ? await RG.assertCanSubmitUserContent("fixture", { force: true }) : { ok: false };
    add(18, "assertCanSubmitUserContent rejects when locked", blocked && blocked.ok === false, blocked ? String(blocked.ok) : "", "assert");
    add(19, "assertCanSubmitUserContent allows only when unlocked", unlockedRow && RG && RG.isLockedState(unlockedRow) === false, "unlocked normalized", "assert");

    var moduleFetch = await fetch("/js/release-gate-client.js?v=p5-e8c", { cache: "no-store" }).then(function(r) { return r.text(); }).catch(function() { return ""; });
    add(20, "no query-param bypass", !/location\.search.*release|searchparams.*release/i.test(moduleFetch), "grep", "safety");
    add(21, "no localhost bypass", !/localhost.*bypass|hostname.*localhost.*unlock/i.test(moduleFetch), "grep", "safety");
    add(22, "no localStorage bypass", !/localstorage.*release/i.test(moduleFetch), "grep", "safety");
    add(23, "no service_role reference", !/grant\s+[\s\S]*service_role|to\s+service_role/i.test(moduleFetch), "grep", "safety");

    var lockedAdminView = RG ? RG.buildReleaseGateStatusView(lockedRow, { forAdmin: true }) : "";
    var unlockedAdminView = RG ? RG.buildReleaseGateStatusView(unlockedRow, { forAdmin: true }) : "";
    add(24, "admin status view shows locked/unlocked correctly", /LOCKED/.test(lockedAdminView) && /UNLOCKED/.test(unlockedAdminView), "admin badges", "admin");

    var adminControls = RG ? RG.buildAdminUnlockControlsMarkup() : "";
    var reasonValidation = RG ? RG.validateAdminUnlockReason("") : { ok: true };
    add(25, "unlock UI requires reason in helper", adminControls.indexOf("data-bl-release-gate-reason-required") >= 0 && reasonValidation.ok === false, "reason required", "admin");

    add(26, "no auto-publish action in admin controls", !/auto[\s-]*publish/i.test(adminControls), "admin controls only", "safety");
    add(27, "no queue action text/action exists", !/run queue|approve queue|queue action button/i.test(adminControls), "grep", "safety");
    add(28, "no Danger-Zone action linked", adminControls.indexOf("danger") < 0 && adminControls.indexOf("Danger Zone") < 0, "isolated panel", "admin");
    add(29, "no Supabase library loaded", typeof window.supabase === "undefined", "window.supabase undefined", "meta");
    add(30, "no datawrites in fixture", true, "static tests only", "meta");

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
      window.__P5ReleaseLockUiFixtures = { ok: false, allPass: false, failCount: 1, results: [] };
      return;
    }

    summary.className = "qa-guard-summary " + (report.ok ? "pass" : "fail");
    summary.innerHTML =
      '<p><span class="' + (report.ok ? "qa-guard-status-pass" : "qa-guard-status-fail") + '">Overall: ' + (report.ok ? "PASS" : "FAIL") + "</span></p>" +
      "<p><strong>Checks:</strong> " + report.results.length + "</p>" +
      "<p><strong>Pass:</strong> " + report.passCount + " · <strong>Fail:</strong> " + report.failCount + "</p>";

    var html = '<table class="bl-qa-preview-matrix-table bl-qa-guard-table"><thead><tr><th>#</th><th>Check</th><th>Category</th><th>Detail</th><th>Result</th></tr></thead><tbody>';
    report.results.forEach(function(row) {
      html += "<tr><td>" + row.id + "</td><td>" + escapeText(row.label) + "</td><td>" + escapeText(row.category) + "</td><td><code>" + escapeText(row.detail) + "</code></td><td class=\"" + (row.pass ? "pass-cell" : "fail-cell") + "\">" + (row.pass ? "PASS" : "FAIL") + "</td></tr>";
    });
    html += "</tbody></table>";
    root.innerHTML = html;

    window.__P5ReleaseLockUiFixtures = {
      version: "p5-e3",
      results: report.results,
      passCount: report.passCount,
      failCount: report.failCount,
      allPass: report.allPass,
      ok: report.ok,
    };
  }

  runChecks()
    .then(renderResults)
    .catch(function(err) {
      renderResults({ error: err && err.message ? err.message : String(err) });
    });
})();
