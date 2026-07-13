// QA-only release lock DB/RLS static harness (P5-E.2 + P5-E.7B storage defer alignment).
// Fetches SQL files via HTTP; no Supabase, no RPC, no writes.

(function() {
  var FILES = {
    releaseGate: "/supabase/release_gate_lock.sql",
    deferredStorage: "/supabase/release_gate_storage_policy_deferred.sql",
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

  function makeCheck(id, label, category, detail, status) {
    return {
      id: id,
      label: label,
      category: category,
      detail: detail,
      status: status,
      pass: status === "pass",
      deferred: status === "deferred",
    };
  }

  function runChecks(payload) {
    var rg = payload.releaseGate || "";
    var deferredStorage = payload.deferredStorage || "";
    var obs = payload.observations || "";
    var storage = payload.discoveryStorage || "";
    var patch = payload.patchMode || "";
    var rgLower = rg.toLowerCase();
    var deferredLower = deferredStorage.toLowerCase();
    var fnBlock = extractRegisterObservationBlock(obs);
    var fnLower = fnBlock.toLowerCase();
    var postsInsertIdx = fnLower.indexOf("insert into public.posts");
    var releaseAssertIdx = fnLower.indexOf("bl_assert_can_create_user_content");

    var storageRemovedFromDefaultApply = !/storage_discovery_uploads_release_gate_insert_restrictive/i.test(rg) &&
      !/create\s+policy[\s\S]*on\s+storage\.objects/i.test(rgLower);
    var deferredFileDocumentsDefer = /status:\s*deferred/i.test(deferredStorage) &&
      /do not apply in default p5-e\.5 path/i.test(deferredLower);
    var deferredPolicyPresent = /storage_discovery_uploads_release_gate_insert_restrictive/i.test(deferredStorage) &&
      /on\s+storage\.objects/i.test(deferredLower);
    var deferredBucketAware = /bucket_id\s*<>\s*'discovery-uploads'/i.test(deferredStorage) &&
      /public\.bl_can_create_user_content/i.test(deferredStorage);

    var checks = [
      makeCheck(1, "release_gate_lock.sql loads", "file", "bytes=" + rg.length, rg.length > 200 ? "pass" : "fail"),
      makeCheck(2, "release_gate table exists", "schema", "release_gate DDL", /create\s+table\s+if\s+not\s+exists\s+public\.release_gate/i.test(rg) ? "pass" : "fail"),
      makeCheck(3, "contribution_locked default true", "schema", "default true", /contribution_locked\s+boolean\s+not\s+null\s+default\s+true/i.test(rg) ? "pass" : "fail"),
      makeCheck(4, "singleton check id = 1", "schema", "CHECK (id = 1)", /check\s*\(\s*id\s*=\s*1\s*\)/i.test(rg) ? "pass" : "fail"),
      makeCheck(5, "initial locked row insert", "schema", "default locked seed", /insert\s+into\s+public\.release_gate[\s\S]*values\s*\(\s*1\s*,\s*true/i.test(rgLower) ? "pass" : "fail"),
      makeCheck(6, "release_gate_audit table exists", "schema", "audit DDL", /create\s+table\s+if\s+not\s+exists\s+public\.release_gate_audit/i.test(rg) ? "pass" : "fail"),
      makeCheck(7, "bl_is_release_unlocked exists", "helper", "helper", /create\s+or\s+replace\s+function\s+public\.bl_is_release_unlocked/i.test(rg) ? "pass" : "fail"),
      makeCheck(8, "missing row returns false", "helper", "NOT FOUND => false", /if\s+not\s+found\s+then[\s\S]*return\s+false/i.test(rgLower) ? "pass" : "fail"),
      makeCheck(9, "exception fail-closed in bl_is_release_unlocked", "helper", "exception => false", /exception[\s\S]*when\s+others\s+then[\s\S]*return\s+false/i.test(rgLower) ? "pass" : "fail"),
      makeCheck(10, "no fallback true in release helper", "helper", "exception => false only",
        /bl_is_release_unlocked[\s\S]*exception[\s\S]*return\s+false/i.test(rgLower) &&
        !/bl_is_release_unlocked[\s\S]*exception[\s\S]*return\s+true/i.test(rgLower) ? "pass" : "fail"),
      makeCheck(11, "bl_can_create_user_content exists", "helper", "helper", /create\s+or\s+replace\s+function\s+public\.bl_can_create_user_content/i.test(rg) ? "pass" : "fail"),
      makeCheck(12, "bl_assert_can_create_user_content exists", "helper", "assert helper", /create\s+or\s+replace\s+function\s+public\.bl_assert_can_create_user_content/i.test(rg) ? "pass" : "fail"),
      makeCheck(13, "bl_assert raises 42501", "helper", "42501", /raise\s+exception\s+'user content submissions are locked before release'[\s\S]*errcode\s*=\s*'42501'/i.test(rg) ? "pass" : "fail"),
      makeCheck(14, "no service_role reference", "safety", "no service_role grants/usage",
        !/grant\s+[\s\S]*service_role|to\s+service_role|auth\.role\(\)\s*=\s*'service_role'/i.test(rg + obs + storage + patch) ? "pass" : "fail"),
      makeCheck(15, "no auth.role() substitute gate", "safety", "no role-only gate", !/auth\.role\(\)\s*=\s*'authenticated'/.test(rgLower) ? "pass" : "fail"),
      makeCheck(16, "posts restrictive insert policy", "rls", "restrictive INSERT", /posts_release_gate_insert_restrictive/i.test(rg) && /as\s+restrictive/i.test(rgLower) ? "pass" : "fail"),
      makeCheck(17, "posts insert uses bl_can_create_user_content", "rls", "WITH CHECK helper", /posts_release_gate_insert_restrictive[\s\S]*bl_can_create_user_content\s*\(\s*auth\.uid\(\)\s*\)/i.test(rg) ? "pass" : "fail"),
      makeCheck(18, "bl_register_observation calls bl_assert", "rpc", "RPC assert", /bl_assert_can_create_user_content\s*\(\s*'bl_register_observation'\s*\)/i.test(fnBlock) ? "pass" : "fail"),
      makeCheck(19, "release assert before posts INSERT", "rpc", "assert@" + releaseAssertIdx + " posts@" + postsInsertIdx,
        releaseAssertIdx >= 0 && postsInsertIdx >= 0 && releaseAssertIdx < postsInsertIdx ? "pass" : "fail"),
      makeCheck(20, "P5-C Tutorial-Ack still exists", "rpc", "ack gate retained", /user_submission_acks/i.test(fnBlock) ? "pass" : "fail"),
      makeCheck(21, "discovery storage restrictive policy", "storage", "DEFERRED — policy in release_gate_storage_policy_deferred.sql",
        deferredPolicyPresent && storageRemovedFromDefaultApply ? "deferred" : "fail"),
      makeCheck(22, "storage policy bucket-aware", "storage", "DEFERRED — bucket guard in deferred file",
        deferredBucketAware && storageRemovedFromDefaultApply ? "deferred" : "fail"),
      makeCheck(23, "report-screenshots NOT TESTED documented", "gaps", "NOT TESTED marker", /report-screenshots[\s\S]*not\s+tested/i.test(rgLower) ? "pass" : "fail"),
      makeCheck(24, "patch-mode maintenance-only note", "docs", "patch mode comment", /wiki_patch_mode[\s\S]*maintenance/i.test(rgLower) || /patch mode/i.test(rgLower) ? "pass" : "fail"),
      makeCheck(25, "no frontend wiring in P5-E.2 SQL", "scope", "no JS refs", !/patch-mode\.js|create-post\.js/i.test(rg) ? "pass" : "fail"),
      makeCheck(26, "DO NOT APPLY header present", "scope", "staging warning", /do not apply to production/i.test(rgLower) ? "pass" : "fail"),
      makeCheck(27, "fixture performs no SQL execution", "meta", "static fetch only", "pass"),
      makeCheck(28, "no Supabase client loaded", "meta", "window.supabase undefined", typeof window.supabase === "undefined" ? "pass" : "fail"),
      makeCheck(29, "no action controls in page", "meta", "static page", !document.querySelector("button, form, input[type=submit]") ? "pass" : "fail"),
      makeCheck(30, "bl_is_admin_actor exists", "helper", "admin helper", /create\s+or\s+replace\s+function\s+public\.bl_is_admin_actor/i.test(rg) ? "pass" : "fail"),
      makeCheck(31, "bl_set_release_gate_locked RPC exists", "admin", "admin RPC", /create\s+or\s+replace\s+function\s+public\.bl_set_release_gate_locked/i.test(rg) ? "pass" : "fail"),
      makeCheck(32, "posts UPDATE restrictive policy", "rls", "UPDATE gate", /posts_release_gate_update_restrictive/i.test(rg) ? "pass" : "fail"),
      makeCheck(33, "post_reactions restrictive policies", "rls", "reactions gate", /post_reactions_release_gate_insert_restrictive/i.test(rg) ? "pass" : "fail"),
      makeCheck(34, "comments NOT TESTED documented", "gaps", "comments gap", /comments:[\s\S]*not\s+tested/i.test(rgLower) ? "pass" : "fail"),
    ];

    var requiredChecks = checks.filter(function(c) { return !c.deferred; });
    var deferredChecks = checks.filter(function(c) { return c.deferred; });
    var passCount = checks.filter(function(c) { return c.status === "pass"; }).length;
    var requiredPassCount = requiredChecks.filter(function(c) { return c.status === "pass"; }).length;
    var deferredCount = deferredChecks.length;
    var failCount = requiredChecks.filter(function(c) { return c.status === "fail"; }).length;
    var coreOk = failCount === 0;

    return {
      ok: coreOk,
      allPass: coreOk,
      corePass: coreOk,
      storageDeferred: deferredCount > 0 && deferredChecks.every(function(c) { return c.status === "deferred"; }),
      passCount: passCount,
      requiredPassCount: requiredPassCount,
      requiredTotal: requiredChecks.length,
      deferredCount: deferredCount,
      failCount: failCount,
      results: checks,
    };
  }

  function statusLabel(row) {
    if (row.status === "deferred") return "DEFERRED";
    return row.status === "pass" ? "PASS" : "FAIL";
  }

  function statusCellClass(row) {
    if (row.status === "deferred") return "deferred-cell";
    return row.status === "pass" ? "pass-cell" : "fail-cell";
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

    var overallClass = report.corePass ? (report.storageDeferred ? "pass-with-deferred" : "pass") : "fail";
    var overallLabel = report.corePass
      ? (report.storageDeferred ? "CORE_PASS_STORAGE_DEFERRED" : "PASS")
      : "FAIL";

    if (summary) {
      summary.className = "qa-guard-summary " + overallClass;
      summary.innerHTML =
        "<p><span class=\"qa-guard-status-" + (report.corePass ? "pass" : "fail") + "\">Overall: " + overallLabel + "</span></p>" +
        "<p><strong>Required core checks:</strong> " + report.requiredPassCount + "/" + report.requiredTotal + " PASS</p>" +
        "<p><strong>Deferred storage checks:</strong> " + report.deferredCount + " DEFERRED</p>" +
        "<p><strong>Total pass:</strong> " + report.passCount + " · <strong>Required fail:</strong> " + report.failCount + "</p>" +
        "<p class=\"qa-guard-defer-note\"><strong>Storage Release Gate Policy:</strong> DEFERRED — " +
        "<code>storage.objects</code> policy requires owner-capable execution path. " +
        "Deferred file: <code>supabase/release_gate_storage_policy_deferred.sql</code>. " +
        "Not part of default P5-E.5 apply. Storage closure remains P5-E.8.</p>";
    }

    var html = '<table class="bl-qa-preview-matrix-table bl-qa-guard-table">';
    html += "<thead><tr><th>#</th><th>Check</th><th>Category</th><th>Detail</th><th>Result</th></tr></thead><tbody>";
    report.results.forEach(function(row) {
      html += "<tr>";
      html += "<td>" + row.id + "</td>";
      html += "<td>" + escapeText(row.label) + "</td>";
      html += "<td>" + escapeText(row.category) + "</td>";
      html += "<td><code>" + escapeText(row.detail) + "</code></td>";
      html += "<td class=\"" + statusCellClass(row) + "\">" + statusLabel(row) + "</td>";
      html += "</tr>";
    });
    html += "</tbody></table>";
    root.innerHTML = html;

    window.__P5ReleaseLockDbSecurityFixtures = {
      version: "p5-e7b",
      results: report.results,
      passCount: report.passCount,
      requiredPassCount: report.requiredPassCount,
      requiredTotal: report.requiredTotal,
      deferredCount: report.deferredCount,
      failCount: report.failCount,
      allPass: report.allPass,
      corePass: report.corePass,
      storageDeferred: report.storageDeferred,
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
      fetchText(FILES.deferredStorage),
      fetchText(FILES.observations),
      fetchText(FILES.discoveryStorage),
      fetchText(FILES.patchMode),
    ])
      .then(function(parts) {
        var report = runChecks({
          releaseGate: parts[0],
          deferredStorage: parts[1],
          observations: parts[2],
          discoveryStorage: parts[3],
          patchMode: parts[4],
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
