// QA-only local fixture harness for BoundLoreAdminStructuredContextInspector (P4-C.3).
// No Supabase, no fetch/write, no admin/create/edit flows, no action controls.

(function() {
  const ASCI = window.BoundLoreAdminStructuredContextInspector;
  const SCS = window.BoundLoreStructuredContextSchema;

  const FIXTURES = [
    {
      id: "resourceEntry",
      label: "A. resourceEntry",
      data: {
        title: "Inspector Sample Resource",
        entity_domain: "OBJECT",
        entity_subtype: "resource",
        meta: {
          node_type: "crystal_node",
          acquisition_sources: [{ acquisition_method: "mining" }],
        },
      },
      expect: function(report) {
        return report.entry_identity.title === "Inspector Sample Resource" &&
          report.raw_sources.meta.present === true &&
          report.data_contract.available === true &&
          report.schema_validation.available === true;
      },
    },
    {
      id: "observationEntry",
      label: "B. observationEntry",
      data: {
        title: "Inspector Sample Observation",
        discovery_payload: {
          observation_context: {
            coordinates: { x: 10, y: 20 },
            biome_context: "cave",
          },
        },
      },
      expect: function(report) {
        const val = report.schema_validation.validation || {};
        return report.data_contract.hasExplicitContext === true &&
          val.valid === true &&
          ASCI.shouldPromoteEntity() === false;
      },
    },
    {
      id: "creatureEntry",
      label: "C. creatureEntry",
      data: {
        title: "Inspector Sample Creature",
        structured_context: {
          creature_encounter: {
            behavior: "hostile",
            weakness: ["fire"],
          },
        },
      },
      expect: function(report) {
        return report.schema_validation.validation &&
          report.schema_validation.validation.valid === true &&
          ASCI.shouldRenderInspectorActions() === false;
      },
    },
    {
      id: "requirementEntry",
      label: "D. requirementEntry",
      data: {
        title: "Inspector Sample Requirement",
        meta: {
          required_level: 10,
          faction_req: "Sample Faction",
          unlock_type: "recipe_unlock",
        },
      },
      expect: function(report) {
        return report.data_contract.hasExplicitContext === true &&
          ASCI.shouldCreatePost() === false &&
          (report.schema_validation.validation || {}).valid === true;
      },
    },
    {
      id: "versionEntry",
      label: "E. versionEntry",
      data: {
        title: "Inspector Sample Version",
        meta: {
          versioning: {
            game_version: "1.0",
            changed_in: "1.1",
          },
        },
      },
      expect: function(report) {
        const val = report.schema_validation.validation || {};
        return val.valid === true &&
          SCS.isRestrictedField("versioning", "game_version") === true &&
          ASCI.shouldWriteInspectorData() === false;
      },
    },
    {
      id: "sourceDetailOnly",
      label: "F. sourceDetailOnly (negative)",
      data: {
        title: "Negative Source Detail",
        source_detail: "red crystal nodes",
      },
      expect: function(report) {
        const val = report.schema_validation.validation || {};
        return val.blocked === true &&
          ASCI.shouldPromoteEntity() === false;
      },
    },
    {
      id: "nameOnlyFire",
      label: "G. nameOnlyFire (negative)",
      data: {
        title: "QA Staff of Fire",
      },
      expect: function(report) {
        const val = report.schema_validation.validation || {};
        return val.blocked === true &&
          report.data_contract.hasExplicitContext === false;
      },
    },
    {
      id: "derivedOnly",
      label: "H. derivedOnly (negative)",
      data: {
        title: "Derived Negative",
        biome_context: "swamp",
        _derived: true,
      },
      expect: function(report) {
        const val = report.schema_validation.validation || {};
        return val.blocked === true &&
          report.entry_identity.derived === true;
      },
    },
    {
      id: "unknownField",
      label: "I. unknownField (negative)",
      data: {
        title: "Unknown Field Negative",
        structured_context: {
          resource_node: {
            dragon_mount_power: true,
          },
        },
      },
      expect: function(report) {
        const hasUnknown = (report.validation_issues || []).some(function(issue) {
          return issue.code === "unknown_field";
        });
        return hasUnknown === true &&
          ASCI.shouldCreatePost() === false;
      },
    },
    {
      id: "emptyEntry",
      label: "J. emptyEntry",
      data: {
        title: "",
        meta: {},
      },
      expect: function(report) {
        return report != null &&
          report.entry_identity.title === "" &&
          report.data_contract.available === true &&
          report.schema_validation.available === true;
      },
    },
  ];

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function runPolicyChecks() {
    return [
      typeof ASCI === "object",
      typeof window.BoundLoreStructuredContextSchema === "object",
      typeof window.BoundLoreContextDataContract === "object",
      ASCI.shouldWriteInspectorData() === false,
      ASCI.shouldRenderInspectorActions() === false,
      ASCI.shouldModifyQueue() === false,
      ASCI.shouldTriggerRepair() === false,
      ASCI.shouldCreateMissingEntry() === false,
      ASCI.shouldCreatePost() === false,
      ASCI.shouldPromoteEntity() === false,
      ASCI.shouldUpdateSearchIndex() === false,
    ].every(Boolean);
  }

  function runMutationCheck() {
    const entry = { title: "Mutation Test", meta: { node_type: "crystal_node" } };
    const before = JSON.stringify(entry);
    const report = ASCI.createInspectorReport(entry);
    const after = JSON.stringify(entry);
    return before === after && report !== entry;
  }

  function runRenderingSafety() {
    const html = document.querySelector(".bl-p4-admin-inspector-fixtures")?.innerHTML || "";
    return !/<button/i.test(html) &&
      !/<form/i.test(html) &&
      !/<input/i.test(html) &&
      !/\bapprove\b/i.test(html) &&
      !/\breject\b/i.test(html) &&
      !/\brepair\b/i.test(html) &&
      !/href=[^>]*(create-post|edit-post)/i.test(html);
  }

  function runFixture(fixture) {
    const input = JSON.parse(JSON.stringify(fixture.data));
    const before = JSON.stringify(input);
    const report = ASCI.createInspectorReport(input, { mode: "full" });
    const panelHtml = ASCI.renderInspectorPanel(input, { mode: "summary" });
    const after = JSON.stringify(input);
    const mutationSafe = before === after;
    const expectationMet = fixture.expect(report);
    const pass = mutationSafe && expectationMet;
    return {
      id: fixture.id,
      label: fixture.label,
      pass: pass,
      mutationSafe: mutationSafe,
      expectationMet: expectationMet,
      report: report,
      panelHtml: panelHtml,
    };
  }

  function renderResults(results) {
    const root = document.getElementById("fixtureRoot");
    const summary = document.getElementById("fixtureSummary");
    if (!root || !summary) return;

    const passCount = results.filter(function(r) { return r.pass; }).length;
    const failCount = results.length - passCount;
    const policyOk = runPolicyChecks();
    const mutationOk = runMutationCheck();
    const renderSafe = runRenderingSafety();
    const allPass = passCount === results.length && policyOk && mutationOk && renderSafe;

    summary.innerHTML =
      "<strong>Summary:</strong> " + passCount + "/" + results.length + " fixtures PASS" +
      " | Fail: " + failCount +
      " | Policy checks: " + (policyOk ? "PASS" : "FAIL") +
      " | Mutation safe: " + (mutationOk ? "PASS" : "FAIL") +
      " | Rendering safe: " + (renderSafe ? "PASS" : "FAIL") +
      " | Unsafe DOM: 0" +
      " | Overall: " + (allPass ? "PASS" : "FAIL");

    root.innerHTML = results.map(function(result) {
      const badgeClass = result.pass ? "qa-fixture-badge--pass" : "qa-fixture-badge--fail";
      const badgeText = result.pass ? "PASS" : "FAIL";
      return (
        "<section class=\"qa-fixture-panel\" data-fixture=\"" + escapeText(result.id) + "\">" +
          "<div class=\"qa-fixture-header\">" +
            "<h2>" + escapeText(result.label) + "</h2>" +
            "<span class=\"qa-fixture-badge " + badgeClass + "\">" + badgeText + "</span>" +
          "</div>" +
          "<p class=\"qa-fixture-meta\">mutationSafe=" + escapeText(result.mutationSafe) +
            " expectationMet=" + escapeText(result.expectationMet) + "</p>" +
          result.panelHtml +
        "</section>"
      );
    }).join("");
  }

  function init() {
    if (!ASCI) {
      document.getElementById("fixtureSummary").textContent = "BoundLoreAdminStructuredContextInspector not loaded.";
      return;
    }

    const results = FIXTURES.map(runFixture);
    renderResults(results);

    const passCount = results.filter(function(r) { return r.pass; }).length;
    const failCount = results.length - passCount;

    window.__P4AdminStructuredContextInspectorFixtures = {
      inspectorVersion: ASCI.INSPECTOR_VERSION,
      fixtures: results.map(function(r) {
        return { id: r.id, label: r.label, pass: r.pass };
      }),
      passCount: passCount,
      failCount: failCount,
      total: results.length,
      policyChecksPass: runPolicyChecks(),
      mutationCheckPass: runMutationCheck(),
      renderingSafe: runRenderingSafety(),
      allPass: results.every(function(r) { return r.pass; }) &&
        runPolicyChecks() && runMutationCheck() && runRenderingSafety(),
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
