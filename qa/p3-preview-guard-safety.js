// QA-only preview production guard safety harness (P3-E.1).
// No Supabase, no fetch/write, no admin/create/edit flows, no iframes.

(function() {
  const CASES = [
    {
      id: "A",
      label: "localhost positive all",
      location: { hostname: "localhost", search: "?p3_context_preview=all" },
      expectedActive: true,
      expectedMode: "all",
    },
    {
      id: "B",
      label: "localhost single mode",
      location: { hostname: "localhost", search: "?p3_context_preview=resource_node" },
      expectedActive: true,
      expectedMode: "resource_node",
    },
    {
      id: "C",
      label: "localhost no query",
      location: { hostname: "localhost", search: "" },
      expectedActive: false,
      expectedMode: "off",
    },
    {
      id: "D",
      label: "localhost off",
      location: { hostname: "localhost", search: "?p3_context_preview=off" },
      expectedActive: false,
      expectedMode: "off",
    },
    {
      id: "E",
      label: "localhost unknown",
      location: { hostname: "localhost", search: "?p3_context_preview=unknown_mode" },
      expectedActive: false,
      expectedMode: "off",
    },
    {
      id: "F",
      label: "127.0.0.1 blocked",
      location: { hostname: "127.0.0.1", search: "?p3_context_preview=all" },
      expectedActive: false,
      expectedMode: "off",
    },
    {
      id: "G",
      label: "boundlore.com blocked",
      location: { hostname: "boundlore.com", search: "?p3_context_preview=all" },
      expectedActive: false,
      expectedMode: "off",
    },
    {
      id: "H",
      label: "www.boundlore.com blocked",
      location: { hostname: "www.boundlore.com", search: "?p3_context_preview=all" },
      expectedActive: false,
      expectedMode: "off",
    },
    {
      id: "I",
      label: "preview.boundlore.com blocked",
      location: { hostname: "preview.boundlore.com", search: "?p3_context_preview=all" },
      expectedActive: false,
      expectedMode: "off",
    },
    {
      id: "J",
      label: "example.com blocked",
      location: { hostname: "example.com", search: "?p3_context_preview=all" },
      expectedActive: false,
      expectedMode: "off",
    },
    {
      id: "K",
      label: "empty host blocked",
      location: { hostname: "", search: "?p3_context_preview=all" },
      expectedActive: false,
      expectedMode: "off",
    },
    {
      id: "L",
      label: "malicious query value blocked",
      location: {
        hostname: "localhost",
        search: "?p3_context_preview=<script>alert(1)</script>",
      },
      expectedActive: false,
      expectedMode: "off",
    },
  ];

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function runGuardTests() {
    const CPA = window.BoundLoreContextPreviewAdapter;
    if (!CPA) {
      return { ok: false, error: "BoundLoreContextPreviewAdapter missing", results: [] };
    }

    const results = CASES.map(function(testCase) {
      const loc = testCase.location;
      const actualActive = CPA.isPreviewActiveForLocation(loc);
      const actualMode = CPA.getActivePreviewModeForLocation(loc);
      const diagnostics = CPA.getPreviewGuardDiagnostics(loc);
      const pass = actualActive === testCase.expectedActive &&
        actualMode === testCase.expectedMode;
      return {
        id: testCase.id,
        label: testCase.label,
        hostname: loc.hostname,
        search: loc.search,
        expectedActive: testCase.expectedActive,
        actualActive: actualActive,
        expectedMode: testCase.expectedMode,
        actualMode: actualMode,
        reason: diagnostics.reason,
        pass: pass,
      };
    });

    const passCount = results.filter(function(r) { return r.pass; }).length;
    const failCount = results.length - passCount;
    return {
      ok: failCount === 0,
      passCount: passCount,
      failCount: failCount,
      results: results,
    };
  }

  function renderResults(report) {
    const summary = document.getElementById("guardSummary");
    const root = document.getElementById("guardRoot");
    if (!root) return;

    if (report.error) {
      if (summary) {
        summary.className = "qa-guard-summary fail";
        summary.innerHTML = "<p class=\"qa-guard-status-fail\">FAIL — " +
          escapeText(report.error) + "</p>";
      }
      return;
    }

    const statusClass = report.ok ? "pass" : "fail";
    const statusLabel = report.ok ? "PASS" : "FAIL";
    const statusSpanClass = report.ok ? "qa-guard-status-pass" : "qa-guard-status-fail";

    if (summary) {
      summary.className = "qa-guard-summary " + statusClass;
      summary.innerHTML =
        "<p><span class=\"" + statusSpanClass + "\">Overall: " + statusLabel + "</span></p>" +
        "<p><strong>Cases:</strong> " + report.results.length + "</p>" +
        "<p><strong>Pass:</strong> " + report.passCount + " · <strong>Fail:</strong> " +
        report.failCount + "</p>" +
        "<p><strong>Allowed hostname:</strong> <code>" +
        escapeText(window.BoundLoreContextPreviewAdapter.getAllowedPreviewHostname()) +
        "</code> only</p>";
    }

    let html = '<table class="bl-qa-preview-matrix-table bl-qa-guard-table">';
    html += "<thead><tr>";
    html += "<th>Case</th><th>Hostname</th><th>Search</th>";
    html += "<th>Expected Active</th><th>Actual Active</th>";
    html += "<th>Expected Mode</th><th>Actual Mode</th><th>Reason</th><th>Result</th>";
    html += "</tr></thead><tbody>";

    report.results.forEach(function(row) {
      html += "<tr>";
      html += "<td><code>" + escapeText(row.id) + "</code> " + escapeText(row.label) + "</td>";
      html += "<td><code>" + escapeText(row.hostname || "(empty)") + "</code></td>";
      html += "<td><code>" + escapeText(row.search || "(empty)") + "</code></td>";
      html += "<td>" + escapeText(String(row.expectedActive)) + "</td>";
      html += "<td>" + escapeText(String(row.actualActive)) + "</td>";
      html += "<td><code>" + escapeText(row.expectedMode) + "</code></td>";
      html += "<td><code>" + escapeText(row.actualMode) + "</code></td>";
      html += "<td><code>" + escapeText(row.reason) + "</code></td>";
      html += "<td class=\"" + (row.pass ? "pass-cell" : "fail-cell") + "\">" +
        (row.pass ? "PASS" : "FAIL") + "</td>";
      html += "</tr>";
    });

    html += "</tbody></table>";
    root.innerHTML = html;

    window.__P3PreviewGuardSafety = {
      cases: CASES,
      results: report.results,
      passCount: report.passCount,
      failCount: report.failCount,
      ok: report.ok,
    };
  }

  function init() {
    const report = runGuardTests();
    renderResults(report);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
