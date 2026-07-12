// QA-only notification URL safety harness (P5-B.1).
// No Supabase, no fetch/write, no admin/create/edit flows.

(function() {
  var CASES = [
    { id: 1, label: "null", input: null, expectSafe: true, category: "safe" },
    { id: 2, label: "empty string", input: "", expectSafe: true, category: "safe" },
    { id: 3, label: "root path", input: "/", expectSafe: true, category: "safe" },
    { id: 4, label: "internal post slug", input: "/wiki/post/?slug=qa-ogre-mage-1103f2", expectSafe: true, category: "safe" },
    { id: 5, label: "internal search", input: "/wiki/search/?q=monster", expectSafe: true, category: "safe" },
    { id: 6, label: "https absolute", input: "https://example.com/path", expectSafe: true, category: "safe" },
    { id: 7, label: "http absolute", input: "http://example.com/path", expectSafe: true, category: "safe" },
    { id: 8, label: "javascript scheme", input: "javascript:alert(1)", expectSafe: false, category: "unsafe" },
    { id: 9, label: "mixed-case javascript", input: "JaVaScRiPt:alert(1)", expectSafe: false, category: "unsafe" },
    { id: 10, label: "leading-space data", input: " data:text/html,<script>alert(1)</script>", expectSafe: false, category: "unsafe" },
    { id: 11, label: "vbscript scheme", input: "vbscript:msgbox(1)", expectSafe: false, category: "unsafe" },
    { id: 12, label: "file scheme", input: "file:///etc/passwd", expectSafe: false, category: "unsafe" },
    { id: 13, label: "blob scheme", input: "blob:https://evil.example/id", expectSafe: false, category: "unsafe" },
    { id: 14, label: "ftp scheme", input: "ftp://evil.example/file", expectSafe: false, category: "unsafe" },
    { id: 15, label: "protocol-relative", input: "//evil.example/path", expectSafe: false, category: "unsafe" },
    { id: 16, label: "backslash obfuscation", input: "/\\evil.example/path", expectSafe: false, category: "unsafe" },
    { id: 17, label: "newline in https path", input: "https://example.com/\nSet-Cookie:", expectSafe: false, category: "unsafe" },
    { id: 18, label: "null byte prefix", input: "\u0000/wiki/post/", expectSafe: false, category: "unsafe" },
    { id: 19, label: "padded javascript", input: "   javascript:alert(1)", expectSafe: false, category: "unsafe" },
    { id: 20, label: "newline-split javascript", input: "java\nscript:alert(1)", expectSafe: false, category: "unsafe" },
    { id: 21, label: "percent-encoded data", input: "data%3Atext/html", expectSafe: false, category: "unsafe" },
    { id: 22, label: "http backslash host", input: "http:\\evil.example", expectSafe: false, category: "unsafe" },
  ];

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function renderProbeHref(rawUrl) {
    var NS = window.BoundLoreNotificationUrlSafety;
    var safeHref = NS.sanitizeNotificationTargetUrl(rawUrl, { fallback: "#" });
    var probe = document.getElementById("renderProbe");
    if (!probe) return safeHref;

    probe.textContent = "";
    var anchor = document.createElement("a");
    anchor.setAttribute("href", safeHref);
    probe.appendChild(anchor);
    return anchor.getAttribute("href") || "";
  }

  function isUnsafeRenderedHref(href) {
    if (!href || href === "#") return false;
    return /^\s*(javascript|data|vbscript|file|blob|ftp):/i.test(href) ||
      /^\s*\/\//.test(href) ||
      /[\u0000-\u001f\u007f]/.test(href);
  }

  function runFixtureTests() {
    var NS = window.BoundLoreNotificationUrlSafety;
    if (!NS) {
      return { ok: false, error: "BoundLoreNotificationUrlSafety missing", results: [] };
    }

    var metaChecks = [];
    metaChecks.push({
      id: "meta-version",
      label: "version p5-b1",
      pass: NS.NOTIFICATION_URL_SAFETY_VERSION === "p5-b1",
      detail: NS.NOTIFICATION_URL_SAFETY_VERSION,
    });
    metaChecks.push({
      id: "meta-allow-unsafe",
      label: "shouldAllowUnsafeNotificationUrl false",
      pass: NS.shouldAllowUnsafeNotificationUrl() === false,
      detail: String(NS.shouldAllowUnsafeNotificationUrl()),
    });

    var results = CASES.map(function(testCase) {
      var actualSafe = NS.isSafeNotificationTargetUrl(testCase.input);
      var sanitized = NS.sanitizeNotificationTargetUrl(testCase.input, { fallback: "#" });
      var renderedHref = renderProbeHref(testCase.input);
      var classification = NS.classifyNotificationTargetUrl(testCase.input);
      var pass = actualSafe === testCase.expectSafe;

      if (testCase.category === "unsafe") {
        pass = pass &&
          sanitized !== testCase.input &&
          !isUnsafeRenderedHref(renderedHref);
      } else if (testCase.input) {
        pass = pass && sanitized === NS.normalizeNotificationTargetUrl(testCase.input);
      }

      return {
        id: testCase.id,
        label: testCase.label,
        input: testCase.input,
        expectSafe: testCase.expectSafe,
        actualSafe: actualSafe,
        sanitized: sanitized,
        renderedHref: renderedHref,
        classification: classification,
        pass: pass,
      };
    });

    metaChecks.forEach(function(meta) {
      results.push({
        id: meta.id,
        label: meta.label,
        input: meta.detail,
        expectSafe: true,
        actualSafe: meta.pass,
        sanitized: meta.detail,
        renderedHref: meta.detail,
        classification: { kind: "meta", safe: meta.pass, reason: meta.label },
        pass: meta.pass,
      });
    });

    var passCount = results.filter(function(r) { return r.pass; }).length;
    var failCount = results.length - passCount;
    return {
      ok: failCount === 0,
      allPass: failCount === 0,
      passCount: passCount,
      failCount: failCount,
      results: results,
    };
  }

  function renderResults(report) {
    var summary = document.getElementById("fixtureSummary");
    var root = document.getElementById("fixtureRoot");
    if (!root) return;

    if (report.error) {
      if (summary) {
        summary.className = "qa-guard-summary fail";
        summary.innerHTML = "<p class=\"qa-guard-status-fail\">FAIL — " +
          escapeText(report.error) + "</p>";
      }
      return;
    }

    var statusClass = report.ok ? "pass" : "fail";
    var statusLabel = report.ok ? "PASS" : "FAIL";
    var statusSpanClass = report.ok ? "qa-guard-status-pass" : "qa-guard-status-fail";

    if (summary) {
      summary.className = "qa-guard-summary " + statusClass;
      summary.innerHTML =
        "<p><span class=\"" + statusSpanClass + "\">Overall: " + statusLabel + "</span></p>" +
        "<p><strong>Cases:</strong> " + report.results.length + "</p>" +
        "<p><strong>Pass:</strong> " + report.passCount + " · <strong>Fail:</strong> " +
        report.failCount + "</p>" +
        "<p><strong>Version:</strong> <code>p5-b1</code></p>";
    }

    var html = '<table class="bl-qa-preview-matrix-table bl-qa-guard-table">';
    html += "<thead><tr>";
    html += "<th>Case</th><th>Input</th><th>Expected Safe</th><th>Actual Safe</th>";
    html += "<th>Sanitized</th><th>Rendered href</th><th>Result</th>";
    html += "</tr></thead><tbody>";

    report.results.forEach(function(row) {
      html += "<tr>";
      html += "<td><code>" + escapeText(String(row.id)) + "</code> " + escapeText(row.label) + "</td>";
      html += "<td><code>" + escapeText(row.input == null ? "null" : String(row.input)) + "</code></td>";
      html += "<td>" + escapeText(String(row.expectSafe)) + "</td>";
      html += "<td>" + escapeText(String(row.actualSafe)) + "</td>";
      html += "<td><code>" + escapeText(row.sanitized) + "</code></td>";
      html += "<td><code>" + escapeText(row.renderedHref) + "</code></td>";
      html += "<td class=\"" + (row.pass ? "pass-cell" : "fail-cell") + "\">" +
        (row.pass ? "PASS" : "FAIL") + "</td>";
      html += "</tr>";
    });

    html += "</tbody></table>";
    root.innerHTML = html;

    window.__P5NotificationSecurityFixtures = {
      cases: CASES,
      results: report.results,
      passCount: report.passCount,
      failCount: report.failCount,
      allPass: report.allPass,
      ok: report.ok,
    };
  }

  function init() {
    var report = runFixtureTests();
    renderResults(report);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
