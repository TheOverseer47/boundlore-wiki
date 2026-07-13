// QA-only BoundLoreErrorReporter harness (P5-E.9C.2).
// No Supabase, no external network reports, no provider keys.

(function() {
  var networkCalls = 0;
  var originalFetch = window.fetch;

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function record(label, pass, detail) {
    return { label: label, pass: !!pass, detail: detail || "" };
  }

  function installNetworkTrap() {
    window.fetch = function() {
      networkCalls += 1;
      return Promise.reject(new Error("network blocked in fixture"));
    };
    if (window.XMLHttpRequest) {
      var Orig = window.XMLHttpRequest;
      window.XMLHttpRequest = function() {
        networkCalls += 1;
        throw new Error("xhr blocked in fixture");
      };
      window.XMLHttpRequest.prototype = Orig.prototype;
    }
  }

  function restoreNetwork() {
    window.fetch = originalFetch;
  }

  function wait(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  async function runFixtureTests() {
    installNetworkTrap();
    var results = [];
    var R = window.BoundLoreErrorReporter;
    var T = R && R._test ? R._test : null;

    results.push(record(
      "Reporter global available",
      !!R && typeof R.captureError === "function",
      R ? "BoundLoreErrorReporter present" : "missing"
    ));

    if (!R) {
      renderResults(results);
      restoreNetwork();
      return;
    }

    R.clearBufferedEvents();
    R.setEnabled(true);

    var errEvent = R.captureError(new Error("fixture captureError"), { feature: "fixture", error_class: "E-01" });
    results.push(record(
      "captureError buffers event",
      !!errEvent && R.getBufferedEvents().length === 1,
      "buffer=" + R.getBufferedEvents().length
    ));

    R.clearBufferedEvents();
    var msgEvent = R.captureMessage("fixture message", { feature: "fixture", code: "E-00", level: "info" });
    results.push(record(
      "captureMessage buffers event",
      !!msgEvent && R.getBufferedEvents().length === 1 && msgEvent.level === "info",
      msgEvent ? msgEvent.message : "none"
    ));

    R.clearBufferedEvents();
    var secEvent = R.captureSecurityEvent("E-07", { reason_code: "sanitizer_blocked", blocked: true });
    results.push(record(
      "captureSecurityEvent buffers event",
      !!secEvent && secEvent.level === "security" && secEvent.code === "E-07",
      secEvent ? secEvent.category : "none"
    ));

    R.clearBufferedEvents();
    var gateEvent = R.captureReleaseGateEvent("E-03", { source_type: "read_error", blocked: true });
    results.push(record(
      "captureReleaseGateEvent buffers event",
      !!gateEvent && gateEvent.category === "release_gate",
      gateEvent ? gateEvent.code : "none"
    ));

    R.clearBufferedEvents();
    window.dispatchEvent(new ErrorEvent("error", {
      message: "fixture synthetic window error",
      filename: "fixture.js",
      lineno: 42,
      colno: 7,
      error: new Error("fixture synthetic window error")
    }));
    await wait(20);
    results.push(record(
      "window error captured",
      R.getBufferedEvents().some(function(ev) { return ev.category === "runtime"; }),
      "events=" + R.getBufferedEvents().length
    ));

    R.clearBufferedEvents();
    window.dispatchEvent(new PromiseRejectionEvent("unhandledrejection", {
      promise: Promise.reject(new Error("fixture promise rejection")),
      reason: new Error("fixture promise rejection")
    }));
    await wait(20);
    results.push(record(
      "unhandledrejection captured",
      R.getBufferedEvents().some(function(ev) { return ev.category === "promise"; }),
      "events=" + R.getBufferedEvents().length
    ));

    var emailSan = T ? T.redactEmails("contact user@example.com now") : "";
    results.push(record(
      "email redacted",
      emailSan.indexOf("user@example.com") === -1 && emailSan.indexOf("[redacted-email]") !== -1,
      emailSan
    ));

    var tokenSan = T ? T.redactTokens("Bearer abcdefghijklmnopqrstuvwxyz123456") : "";
    results.push(record(
      "token/bearer redacted",
      tokenSan.indexOf("Bearer abc") === -1 && tokenSan.indexOf("[redacted-token]") !== -1,
      tokenSan
    ));

    var apiKeySan = T ? T.redactTokens("api_key=supersecretkeyvalue123456789") : "";
    results.push(record(
      "api key pattern redacted",
      apiKeySan.indexOf("supersecretkey") === -1 && apiKeySan.indexOf("[redacted-token]") !== -1,
      apiKeySan
    ));

    var qsSan = T ? T.stripQueryString("/wiki/post/?slug=secret&token=abc") : "";
    results.push(record(
      "querystring masked",
      qsSan.indexOf("secret") === -1 && qsSan.indexOf("[redacted-query]") !== -1,
      qsSan
    ));

    R.clearBufferedEvents();
    R.captureError(new Error("body leak"), {
      feature: "fixture",
      post_body: "<script>alert(1)</script>should-not-appear",
      comment_text: "private comment"
    });
    var leaked = R.getBufferedEvents()[0];
    var ctxKeys = leaked && leaked.context ? Object.keys(leaked.context) : [];
    results.push(record(
      "context allowlist blocks post body",
      ctxKeys.indexOf("post_body") === -1 && ctxKeys.indexOf("comment_text") === -1,
      "keys=" + ctxKeys.join(",")
    ));

    var htmlMsg = T ? T.sanitizeMessage("<p>Hello</p> user@secret.com") : "";
    results.push(record(
      "html stripped from message",
      htmlMsg.indexOf("<p>") === -1 && htmlMsg.indexOf("[redacted-email]") !== -1,
      htmlMsg
    ));

    R.clearBufferedEvents();
    R.setEnabled(true);
    for (var i = 0; i < T.MAX_BUFFER + 5; i += 1) {
      R.captureMessage("fill-" + i, { feature: "fixture" });
    }
    results.push(record(
      "buffer limit enforced",
      R.getBufferedEvents().length === T.MAX_BUFFER,
      "len=" + R.getBufferedEvents().length + " max=" + T.MAX_BUFFER
    ));

    R.clearBufferedEvents();
    results.push(record(
      "clearBufferedEvents works",
      R.getBufferedEvents().length === 0,
      "len=" + R.getBufferedEvents().length
    ));

    R.setEnabled(false);
    R.captureMessage("disabled capture", { feature: "fixture" });
    results.push(record(
      "setEnabled(false) blocks new events",
      R.getBufferedEvents().length === 0,
      "len=" + R.getBufferedEvents().length
    ));
    R.setEnabled(true);

    results.push(record(
      "no double handler registration flag",
      !!window.__blErrorReporterHandlersRegistered,
      String(window.__blErrorReporterHandlersRegistered)
    ));

    var beforeNet = networkCalls;
    R.captureError(new Error("network probe"), { feature: "fixture" });
    R.captureSecurityEvent("E-07", { blocked: true });
    await wait(10);
    results.push(record(
      "no network requests from reporter",
      networkCalls === beforeNet,
      "calls=" + networkCalls
    ));

    results.push(record(
      "no supabase dependency",
      typeof window.supabase === "undefined",
      typeof window.supabase
    ));

    results.push(record(
      "provider_sent always false",
      R.getBufferedEvents().every(function(ev) { return ev.provider_sent === false; }) || R.getBufferedEvents().length === 0,
      "checked buffered events"
    ));

    var diag = R.getDiagnostics();
    results.push(record(
      "diagnostics report local stub",
      diag && diag.version === "p5-e9c2" && diag.providerSent === false,
      diag ? JSON.stringify(diag) : "none"
    ));

    renderResults(results);
    restoreNetwork();
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
        "<td style=\"padding:8px;border-top:1px solid #2a3544;\">" + escapeText(row.label) + "</td>" +
        "<td class=\"" + (row.pass ? "pass-cell" : "fail-cell") + "\" style=\"padding:8px;border-top:1px solid #2a3544;\">" +
        (row.pass ? "PASS" : "FAIL") + "</td>" +
        "<td style=\"padding:8px;border-top:1px solid #2a3544;font-size:0.85rem;color:#b8c5d4;\">" +
        escapeText(row.detail) + "</td></tr>";
    });

    html += "</tbody></table>";
    root.innerHTML = html;
  }

  runFixtureTests().catch(function(err) {
    var summary = document.getElementById("fixtureSummary");
    if (summary) {
      summary.className = "qa-guard-summary fail";
      summary.textContent = "Fixture runner failed: " + String(err && err.message ? err.message : err);
    }
  });
})();
