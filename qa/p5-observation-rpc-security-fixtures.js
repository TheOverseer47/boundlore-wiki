// QA-only observation RPC gate static harness (P5-C.1).
// Fetches SQL file via HTTP; no Supabase, no RPC calls, no writes.

(function() {
  var SQL_PATH = "/supabase/phase_a_observations_foundation.sql";

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function extractRegisterObservationBlock(sql) {
    var marker = "create or replace function public.bl_register_observation";
    var start = sql.toLowerCase().indexOf(marker);
    if (start < 0) return "";
    var slice = sql.slice(start);
    var endIdx = slice.search(/\r?\n\$\$;\s*(?:\r?\n|$)/);
    if (endIdx < 0) return slice;
    return slice.slice(0, endIdx);
  }

  function runChecks(sqlText) {
    var fnBlock = extractRegisterObservationBlock(sqlText);
    var fnLower = fnBlock.toLowerCase();
    var sqlLower = sqlText.toLowerCase();

    var postsInsertIdx = fnLower.indexOf("insert into public.posts");
    var ackIdx = fnLower.indexOf("user_submission_acks");
    var authNullBlock = /if\s+v_user_id\s+is\s+null\s+then[\s\S]*?raise\s+exception/i.test(fnBlock);
    var hasRoleOnlyGate = /auth\.role\(\)\s*=\s*'authenticated'/.test(fnLower) &&
      ackIdx < 0;

    var checks = [
      {
        id: 1,
        label: "SQL file loads",
        pass: typeof sqlText === "string" && sqlText.length > 100,
        detail: "bytes=" + (sqlText ? sqlText.length : 0),
      },
      {
        id: 2,
        label: "bl_register_observation exists",
        pass: fnBlock.length > 0,
        detail: fnBlock ? "function block found" : "missing",
      },
      {
        id: 3,
        label: "SECURITY DEFINER retained with documented rationale",
        pass: /security\s+definer/i.test(fnBlock) &&
          /security definer retained/i.test(sqlText),
        detail: "definer + rationale comment",
      },
      {
        id: 4,
        label: "SET search_path on SECURITY DEFINER function",
        pass: /set\s+search_path\s*=\s*public/i.test(fnBlock),
        detail: "search_path=public",
      },
      {
        id: 5,
        label: "auth.uid() assigned and used in function",
        pass: /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i.test(fnBlock),
        detail: "v_user_id := auth.uid()",
      },
      {
        id: 6,
        label: "null auth.uid() path blocked",
        pass: authNullBlock,
        detail: "IF v_user_id IS NULL THEN RAISE EXCEPTION",
      },
      {
        id: 7,
        label: "user_submission_acks referenced in function",
        pass: ackIdx >= 0,
        detail: "user_submission_acks",
      },
      {
        id: 8,
        label: "tutorial-ack gate before INSERT INTO public.posts",
        pass: ackIdx >= 0 && postsInsertIdx >= 0 && ackIdx < postsInsertIdx,
        detail: "ack@" + ackIdx + " posts@" + postsInsertIdx,
      },
      {
        id: 9,
        label: "no auth.role()=authenticated-only gate substitute",
        pass: !hasRoleOnlyGate,
        detail: hasRoleOnlyGate ? "role-only gate detected" : "ok",
      },
      {
        id: 10,
        label: "RAISE EXCEPTION when tutorial ack missing",
        pass: /tutorial acknowledgement required before registering observation/i.test(fnBlock) &&
          /raise\s+exception/i.test(fnBlock),
        detail: "explicit ack exception",
      },
      {
        id: 11,
        label: "posts INSERT remains after gates",
        pass: postsInsertIdx >= 0,
        detail: "insert into public.posts present",
      },
      {
        id: 12,
        label: "P5-E release gate hook comment present",
        pass: /p5-e release gate hook/i.test(fnBlock),
        detail: "P5-E RELEASE GATE HOOK",
      },
      {
        id: 13,
        label: "no release_gate table build in P5-C file",
        pass: !/create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?release_gate/i.test(sqlLower),
        detail: "no release_gate CREATE TABLE",
      },
      {
        id: 14,
        label: "GRANT EXECUTE to authenticated with gate comment",
        pass: /grant execute on function public\.bl_register_observation/i.test(sqlText) &&
          /p5-c\.1:\s*grant to authenticated is safe only because/i.test(sqlLower),
        detail: "GRANT + P5-C.1 comment",
      },
      {
        id: 15,
        label: "no service_role reference in SQL file",
        pass: !/service_role/i.test(sqlText),
        detail: "service_role absent",
      },
      {
        id: 16,
        label: "fixture performs no SQL execution",
        pass: true,
        detail: "static fetch + pattern checks only",
      },
      {
        id: 17,
        label: "no Supabase client library loaded",
        pass: typeof window.supabase === "undefined",
        detail: "window.supabase undefined",
      },
    ];

    var passCount = checks.filter(function(c) { return c.pass; }).length;
    var failCount = checks.length - passCount;

    return {
      ok: failCount === 0,
      allPass: failCount === 0,
      passCount: passCount,
      failCount: failCount,
      results: checks,
      functionBlockLength: fnBlock.length,
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
      window.__P5ObservationRpcSecurityFixtures = {
        ok: false,
        allPass: false,
        passCount: 0,
        failCount: 1,
        results: [],
        error: report.error,
      };
      return;
    }

    var statusClass = report.ok ? "pass" : "fail";
    var statusLabel = report.ok ? "PASS" : "FAIL";
    var statusSpanClass = report.ok ? "qa-guard-status-pass" : "qa-guard-status-fail";

    if (summary) {
      summary.className = "qa-guard-summary " + statusClass;
      summary.innerHTML =
        "<p><span class=\"" + statusSpanClass + "\">Overall: " + statusLabel + "</span></p>" +
        "<p><strong>Checks:</strong> " + report.results.length + "</p>" +
        "<p><strong>Pass:</strong> " + report.passCount + " · <strong>Fail:</strong> " +
        report.failCount + "</p>" +
        "<p><strong>Source:</strong> <code>" + escapeText(SQL_PATH) + "</code></p>";
    }

    var html = '<table class="bl-qa-preview-matrix-table bl-qa-guard-table">';
    html += "<thead><tr><th>Case</th><th>Check</th><th>Detail</th><th>Result</th></tr></thead><tbody>";

    report.results.forEach(function(row) {
      html += "<tr>";
      html += "<td><code>" + escapeText(String(row.id)) + "</code></td>";
      html += "<td>" + escapeText(row.label) + "</td>";
      html += "<td><code>" + escapeText(row.detail) + "</code></td>";
      html += "<td class=\"" + (row.pass ? "pass-cell" : "fail-cell") + "\">" +
        (row.pass ? "PASS" : "FAIL") + "</td>";
      html += "</tr>";
    });

    html += "</tbody></table>";
    root.innerHTML = html;

    window.__P5ObservationRpcSecurityFixtures = {
      sqlPath: SQL_PATH,
      results: report.results,
      passCount: report.passCount,
      failCount: report.failCount,
      allPass: report.allPass,
      ok: report.ok,
      functionBlockLength: report.functionBlockLength,
    };
  }

  function init() {
    fetch(SQL_PATH, { cache: "no-store" })
      .then(function(res) {
        if (!res.ok) {
          throw new Error("Failed to load SQL file: HTTP " + res.status);
        }
        return res.text();
      })
      .then(function(sqlText) {
        var report = runChecks(sqlText);
        renderResults(report);
      })
      .catch(function(err) {
        renderResults({ error: err && err.message ? err.message : String(err) });
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
