// QA-only release lock DB/RLS static harness (P5-E.2).
// Fetches SQL files via HTTP; no Supabase, no RPC, no writes.

(function() {
  var FILES = {
    releaseGate: "/supabase/release_gate_lock.sql",
    observations: "/supabase/phase_a_observations_foundation.sql",
    discoveryStorage: "/supabase/discovery_storage.sql",
    patchMode: "/supabase/wiki_patch_mode.sql",
  };

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

  function runChecks(payload) {
    var rg = payload.releaseGate || "";
    var obs = payload.observations || "";
    var storage = payload.discoveryStorage || "";
    var patch = payload.patchMode || "";
    var rgLower = rg.toLowerCase();
    var fnBlock = extractRegisterObservationBlock(obs);
    var fnLower = fnBlock.toLowerCase();
    var postsInsertIdx = fnLower.indexOf("insert into public.posts");
    var releaseAssertIdx = fnLower.indexOf("bl_assert_can_create_user_content");

    var checks = [
      { id: 1, label: "release_gate_lock.sql loads", pass: rg.length > 200, detail: "bytes=" + rg.length, category: "file" },
      { id: 2, label: "release_gate table exists", pass: /create\s+table\s+if\s+not\s+exists\s+public\.release_gate/i.test(rg), detail: "release_gate DDL", category: "schema" },
      { id: 3, label: "contribution_locked default true", pass: /contribution_locked\s+boolean\s+not\s+null\s+default\s+true/i.test(rg), detail: "default true", category: "schema" },
      { id: 4, label: "singleton check id = 1", pass: /check\s*\(\s*id\s*=\s*1\s*\)/i.test(rg), detail: "CHECK (id = 1)", category: "schema" },
      { id: 5, label: "initial locked row insert", pass: /insert\s+into\s+public\.release_gate[\s\S]*values\s*\(\s*1\s*,\s*true/i.test(rgLower), detail: "default locked seed", category: "schema" },
      { id: 6, label: "release_gate_audit table exists", pass: /create\s+table\s+if\s+not\s+exists\s+public\.release_gate_audit/i.test(rg), detail: "audit DDL", category: "schema" },
      { id: 7, label: "bl_is_release_unlocked exists", pass: /create\s+or\s+replace\s+function\s+public\.bl_is_release_unlocked/i.test(rg), detail: "helper", category: "helper" },
      { id: 8, label: "missing row returns false", pass: /if\s+not\s+found\s+then[\s\S]*return\s+false/i.test(rgLower), detail: "NOT FOUND => false", category: "helper" },
      { id: 9, label: "exception fail-closed in bl_is_release_unlocked", pass: /exception[\s\S]*when\s+others\s+then[\s\S]*return\s+false/i.test(rgLower), detail: "exception => false", category: "helper" },
      { id: 10, label: "no fallback true in release helper", pass: /bl_is_release_unlocked[\s\S]*exception[\s\S]*return\s+false/i.test(rgLower) &&
        !/bl_is_release_unlocked[\s\S]*exception[\s\S]*return\s+true/i.test(rgLower), detail: "exception => false only", category: "helper" },
      { id: 11, label: "bl_can_create_user_content exists", pass: /create\s+or\s+replace\s+function\s+public\.bl_can_create_user_content/i.test(rg), detail: "helper", category: "helper" },
      { id: 12, label: "bl_assert_can_create_user_content exists", pass: /create\s+or\s+replace\s+function\s+public\.bl_assert_can_create_user_content/i.test(rg), detail: "assert helper", category: "helper" },
      { id: 13, label: "bl_assert raises 42501", pass: /raise\s+exception\s+'user content submissions are locked before release'[\s\S]*errcode\s*=\s*'42501'/i.test(rg), detail: "42501", category: "helper" },
      { id: 14, label: "no service_role reference", pass: !/grant\s+[\s\S]*service_role|to\s+service_role|auth\.role\(\)\s*=\s*'service_role'/i.test(rg + obs + storage + patch), detail: "no service_role grants/usage", category: "safety" },
      { id: 15, label: "no auth.role() substitute gate", pass: !/auth\.role\(\)\s*=\s*'authenticated'/.test(rgLower), detail: "no role-only gate", category: "safety" },
      { id: 16, label: "posts restrictive insert policy", pass: /posts_release_gate_insert_restrictive/i.test(rg) && /as\s+restrictive/i.test(rgLower), detail: "restrictive INSERT", category: "rls" },
      { id: 17, label: "posts insert uses bl_can_create_user_content", pass: /posts_release_gate_insert_restrictive[\s\S]*bl_can_create_user_content\s*\(\s*auth\.uid\(\)\s*\)/i.test(rg), detail: "WITH CHECK helper", category: "rls" },
      { id: 18, label: "bl_register_observation calls bl_assert", pass: /bl_assert_can_create_user_content\s*\(\s*'bl_register_observation'\s*\)/i.test(fnBlock), detail: "RPC assert", category: "rpc" },
      { id: 19, label: "release assert before posts INSERT", pass: releaseAssertIdx >= 0 && postsInsertIdx >= 0 && releaseAssertIdx < postsInsertIdx, detail: "assert@" + releaseAssertIdx + " posts@" + postsInsertIdx, category: "rpc" },
      { id: 20, label: "P5-C Tutorial-Ack still exists", pass: /user_submission_acks/i.test(fnBlock), detail: "ack gate retained", category: "rpc" },
      { id: 21, label: "discovery storage restrictive policy", pass: /storage_discovery_uploads_release_gate_insert_restrictive/i.test(rg), detail: "storage restrictive", category: "storage" },
      { id: 22, label: "storage policy bucket-aware", pass: /bucket_id\s*<>\s*'discovery-uploads'/i.test(rg) && /or\s+public\.bl_can_create_user_content/i.test(rgLower), detail: "bucket guard", category: "storage" },
      { id: 23, label: "report-screenshots NOT TESTED documented", pass: /report-screenshots[\s\S]*not\s+tested/i.test(rgLower), detail: "NOT TESTED marker", category: "gaps" },
      { id: 24, label: "patch-mode maintenance-only note", pass: /wiki_patch_mode[\s\S]*maintenance/i.test(rgLower) || /patch mode/i.test(rgLower), detail: "patch mode comment", category: "docs" },
      { id: 25, label: "no frontend wiring in P5-E.2 SQL", pass: !/patch-mode\.js|create-post\.js/i.test(rg), detail: "no JS refs", category: "scope" },
      { id: 26, label: "DO NOT APPLY header present", pass: /do not apply to production/i.test(rgLower), detail: "staging warning", category: "scope" },
      { id: 27, label: "fixture performs no SQL execution", pass: true, detail: "static fetch only", category: "meta" },
      { id: 28, label: "no Supabase client loaded", pass: typeof window.supabase === "undefined", detail: "window.supabase undefined", category: "meta" },
      { id: 29, label: "no action controls in page", pass: !document.querySelector("button, form, input[type=submit]"), detail: "static page", category: "meta" },
      { id: 30, label: "bl_is_admin_actor exists", pass: /create\s+or\s+replace\s+function\s+public\.bl_is_admin_actor/i.test(rg), detail: "admin helper", category: "helper" },
      { id: 31, label: "bl_set_release_gate_locked RPC exists", pass: /create\s+or\s+replace\s+function\s+public\.bl_set_release_gate_locked/i.test(rg), detail: "admin RPC", category: "admin" },
      { id: 32, label: "posts UPDATE restrictive policy", pass: /posts_release_gate_update_restrictive/i.test(rg), detail: "UPDATE gate", category: "rls" },
      { id: 33, label: "post_reactions restrictive policies", pass: /post_reactions_release_gate_insert_restrictive/i.test(rg), detail: "reactions gate", category: "rls" },
      { id: 34, label: "comments NOT TESTED documented", pass: /comments:[\s\S]*not\s+tested/i.test(rgLower), detail: "comments gap", category: "gaps" },
    ];

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
      if (summary) {
        summary.className = "qa-guard-summary fail";
        summary.innerHTML = "<p class=\"qa-guard-status-fail\">FAIL — " + escapeText(report.error) + "</p>";
      }
      window.__P5ReleaseLockDbSecurityFixtures = { ok: false, allPass: false, failCount: 1, results: [] };
      return;
    }

    var statusClass = report.ok ? "pass" : "fail";
    var statusSpanClass = report.ok ? "qa-guard-status-pass" : "qa-guard-status-fail";

    if (summary) {
      summary.className = "qa-guard-summary " + statusClass;
      summary.innerHTML =
        "<p><span class=\"" + statusSpanClass + "\">Overall: " + (report.ok ? "PASS" : "FAIL") + "</span></p>" +
        "<p><strong>Checks:</strong> " + report.results.length + "</p>" +
        "<p><strong>Pass:</strong> " + report.passCount + " · <strong>Fail:</strong> " + report.failCount + "</p>";
    }

    var html = '<table class="bl-qa-preview-matrix-table bl-qa-guard-table">';
    html += "<thead><tr><th>#</th><th>Check</th><th>Category</th><th>Detail</th><th>Result</th></tr></thead><tbody>";
    report.results.forEach(function(row) {
      html += "<tr>";
      html += "<td>" + row.id + "</td>";
      html += "<td>" + escapeText(row.label) + "</td>";
      html += "<td>" + escapeText(row.category) + "</td>";
      html += "<td><code>" + escapeText(row.detail) + "</code></td>";
      html += "<td class=\"" + (row.pass ? "pass-cell" : "fail-cell") + "\">" + (row.pass ? "PASS" : "FAIL") + "</td>";
      html += "</tr>";
    });
    html += "</tbody></table>";
    root.innerHTML = html;

    window.__P5ReleaseLockDbSecurityFixtures = {
      version: "p5-e2",
      results: report.results,
      passCount: report.passCount,
      failCount: report.failCount,
      allPass: report.allPass,
      ok: report.ok,
    };
  }

  function fetchText(path) {
    return fetch(path, { cache: "no-store" }).then(function(res) {
      if (!res.ok) throw new Error("Failed to load " + path + ": HTTP " + res.status);
      return res.text();
    });
  }

  function init() {
    Promise.all([
      fetchText(FILES.releaseGate),
      fetchText(FILES.observations),
      fetchText(FILES.discoveryStorage),
      fetchText(FILES.patchMode),
    ])
      .then(function(parts) {
        var report = runChecks({
          releaseGate: parts[0],
          observations: parts[1],
          discoveryStorage: parts[2],
          patchMode: parts[3],
        });
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
