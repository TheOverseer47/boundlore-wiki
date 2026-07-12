// QA-only local fixture harness for BoundLoreStructuredContextSchema (P4-B.1).
// No Supabase, no fetch/write, no admin/create/edit flows, no action controls.

(function() {
  const SCS = window.BoundLoreStructuredContextSchema;

  const FIXTURES = [
    {
      id: "validResourceNode",
      label: "A. validResourceNode",
      data: {
        resource_node: {
          node_type: "crystal_node",
          acquisition_sources: [{ acquisition_method: "mining" }],
        },
      },
      expect: function(report) {
        return report.validation.valid === true &&
          report.validation.blocked === false &&
          SCS.isAuthorableField("resource_node", "node_type") === true &&
          report.actions.write === false;
      },
    },
    {
      id: "validObservation",
      label: "B. validObservation",
      data: {
        observation_context: {
          coordinates: { x: 10, y: 20 },
          biome_context: "cave",
          time_condition: "night",
          weather_condition: "clear",
        },
      },
      expect: function(report) {
        return report.validation.valid === true &&
          report.validation.blocked === false &&
          SCS.isAuthorableField("observation_context", "biome_context") === true;
      },
    },
    {
      id: "validCreatureEncounter",
      label: "C. validCreatureEncounter",
      data: {
        creature_encounter: {
          behavior: "hostile",
          weakness: ["fire"],
          resistance: ["poison"],
        },
      },
      expect: function(report) {
        return report.validation.valid === true &&
          report.validation.blocked === false;
      },
    },
    {
      id: "validRequirementUnlock",
      label: "D. validRequirementUnlock",
      data: {
        requirement_unlock: {
          required_level: 10,
          unlock_type: "recipe_unlock",
        },
      },
      expect: function(report) {
        return report.validation.valid === true &&
          report.validation.blocked === false &&
          SCS.isAuthorableField("requirement_unlock", "required_level") === true;
      },
    },
    {
      id: "validVersioning",
      label: "E. validVersioning",
      data: {
        versioning: {
          game_version: "1.0",
          changed_in: "1.1",
        },
      },
      expect: function(report) {
        return report.validation.valid === true &&
          report.validation.blocked === false &&
          SCS.isRestrictedField("versioning", "game_version") === true &&
          report.actions.renderActions === false;
      },
    },
    {
      id: "plannedQuestEvent",
      label: "F. plannedQuestEvent",
      data: {
        quest_event: {
          objectives: [{ id: "obj1", text: "Collect shards" }],
          rewards: [{ type: "item", id: "shard" }],
          event_type: "side_quest",
        },
      },
      expect: function(report) {
        return report.validation.valid === true &&
          SCS.isPlannedField("quest_event", "objectives") === true &&
          report.actions.createPost === false;
      },
    },
    {
      id: "plannedEconomy",
      label: "G. plannedEconomy",
      data: {
        economy: {
          trade_offers: [{ item: "ember_shard", price: 50 }],
          prices: [{ currency: "gold", amount: 50 }],
          currency: "gold",
        },
      },
      expect: function(report) {
        return report.validation.valid === true &&
          SCS.isPlannedField("economy", "trade_offers") === true &&
          report.actions.createPost === false;
      },
    },
    {
      id: "sourceDetailOnly",
      label: "H. sourceDetailOnly (negative)",
      data: {
        source_detail: "red crystal nodes",
      },
      expect: function(report) {
        return report.validation.blocked === true &&
          SCS.shouldPromoteFromValidatedData("resource_node", "node_type", "crystal_node") === false;
      },
    },
    {
      id: "nameOnlyFire",
      label: "I. nameOnlyFire (negative)",
      data: {
        title: "QA Staff of Fire",
      },
      expect: function(report) {
        return report.validation.blocked === true &&
          SCS.isAuthorableField("creature_encounter", "weakness") === true &&
          SCS.shouldCreatePostFromField("creature_encounter", "weakness", "fire") === false;
      },
    },
    {
      id: "derivedOnly",
      label: "J. derivedOnly (negative)",
      data: {
        biome_context: "swamp",
        _derived: true,
      },
      expect: function(report) {
        return report.validation.blocked === true;
      },
    },
    {
      id: "unknownField",
      label: "K. unknownField (negative)",
      data: {
        resource_node: {
          dragon_mount_power: true,
          node_type: "crystal_node",
        },
      },
      expect: function(report) {
        const hasUnknown = (report.validation.issues || []).some(function(issue) {
          return issue.code === "unknown_field";
        });
        return hasUnknown === true &&
          SCS.isKnownField("resource_node", "dragon_mount_power") === false &&
          report.validation.sections.resource_node.valid === true;
      },
    },
    {
      id: "emptyValues",
      label: "L. emptyValues (negative)",
      data: {
        requirement_unlock: {
          required_level: "",
        },
        resource_node: {
          node_type: "",
        },
      },
      expect: function(report) {
        return report.validation.valid === false &&
          report.validation.sections.requirement_unlock.valid === false &&
          report.validation.sections.resource_node.valid === false;
      },
    },
    {
      id: "postCreationForbidden",
      label: "M. postCreationForbidden",
      data: {
        requirement_unlock: {
          faction_req: "Sample Faction",
          required_level: 10,
          unlock_type: "recipe_unlock",
        },
      },
      expect: function(report) {
        return report.validation.valid === true &&
          SCS.shouldCreatePostFromField("requirement_unlock", "faction_req", "Sample Faction") === false &&
          report.actions.createPost === false;
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
    const checks = [
      typeof SCS === "object",
      SCS.shouldWriteValidatedData() === false,
      SCS.shouldCreatePostFromField("requirement_unlock", "faction_req", "Sample Faction") === false,
      SCS.shouldPromoteFromValidatedData("resource_node", "node_type", "crystal_node") === false,
      SCS.shouldRenderValidationActions() === false,
      SCS.isAuthorableField("resource_node", "node_type") === true,
      SCS.isAuthorableField("resource_node", "source_detail") === false,
      SCS.isKnownField("resource_node", "dragon_mount_power") === false,
      SCS.isRestrictedField("versioning", "game_version") === true,
      SCS.isPlannedField("economy", "trade_offers") === true,
    ];
    return checks.every(Boolean);
  }

  function runMutationCheck() {
    const input = { resource_node: { node_type: "crystal_node" } };
    const before = JSON.stringify(input);
    const report = SCS.createValidationReport(input);
    const after = JSON.stringify(input);
    return before === after && report !== input;
  }

  function runRenderingSafety() {
    const html = document.querySelector(".bl-p4-schema-fixtures")?.innerHTML || "";
    return !/<button/i.test(html) &&
      !/<form/i.test(html) &&
      !/href=[^>]*(admin|create-post|edit-post)/i.test(html);
  }

  function runFixture(fixture) {
    const input = JSON.parse(JSON.stringify(fixture.data));
    const before = JSON.stringify(input);
    const report = SCS.createValidationReport(input);
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
    };
  }

  function renderResults(results) {
    const root = document.getElementById("fixtureRoot");
    const summary = document.getElementById("fixtureSummary");
    if (!root || !summary) return;

    const passCount = results.filter(function(r) { return r.pass; }).length;
    const total = results.length;
    const policyOk = runPolicyChecks();
    const mutationOk = runMutationCheck();
    const renderSafe = runRenderingSafety();
    const allPass = passCount === total && policyOk && mutationOk && renderSafe;

    summary.innerHTML =
      "<strong>Summary:</strong> " + passCount + "/" + total + " fixtures PASS" +
      " | Policy checks: " + (policyOk ? "PASS" : "FAIL") +
      " | Mutation safe: " + (mutationOk ? "PASS" : "FAIL") +
      " | Rendering safe: " + (renderSafe ? "PASS" : "FAIL") +
      " | Overall: " + (allPass ? "PASS" : "FAIL");

    root.innerHTML = results.map(function(result) {
      const badgeClass = result.pass ? "qa-fixture-badge--pass" : "qa-fixture-badge--fail";
      const badgeText = result.pass ? "PASS" : "FAIL";
      const summaryLine = result.report.summary || {};
      return (
        "<section class=\"qa-fixture-panel\" data-fixture=\"" + escapeText(result.id) + "\">" +
          "<div class=\"qa-fixture-header\">" +
            "<h2>" + escapeText(result.label) + "</h2>" +
            "<span class=\"qa-fixture-badge " + badgeClass + "\">" + badgeText + "</span>" +
          "</div>" +
          "<p class=\"qa-fixture-meta\">valid=" + escapeText(summaryLine.valid) +
            " blocked=" + escapeText(summaryLine.blocked) +
            " mutationSafe=" + escapeText(result.mutationSafe) +
            " expectationMet=" + escapeText(result.expectationMet) + "</p>" +
          "<div class=\"qa-fixture-details\"><pre>" +
            escapeText(JSON.stringify(result.report, null, 2)) +
          "</pre></div>" +
        "</section>"
      );
    }).join("");
  }

  function init() {
    if (!SCS) {
      document.getElementById("fixtureSummary").textContent = "BoundLoreStructuredContextSchema not loaded.";
      return;
    }

    const results = FIXTURES.map(runFixture);
    renderResults(results);

    window.__P4StructuredContextSchemaFixtures = {
      schemaVersion: SCS.SCHEMA_VERSION,
      fixtures: results.map(function(r) {
        return { id: r.id, label: r.label, pass: r.pass };
      }),
      passCount: results.filter(function(r) { return r.pass; }).length,
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
