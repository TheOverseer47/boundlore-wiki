// QA-only local fixture harness for BoundLoreContextDataContract (P3-H.1).
// No Supabase, no fetch/write, no admin/create/edit flows.

(function() {
  const FIXTURES = [
    {
      id: "rootResourceNode",
      label: "A. Root Resource Node Fixture",
      expectSections: ["resource_node"],
      data: {
        title: "Root Resource Node Fixture",
        node_type: "crystal_node",
        acquisition_sources: [{ acquisition_method: "mining" }],
      },
    },
    {
      id: "metaObservation",
      label: "B. Meta Observation Context Fixture",
      expectSections: ["observation_context"],
      data: {
        title: "Meta Observation Context Fixture",
        meta: {
          observation_context: {
            coordinates: { x: 10, y: 20 },
            biome_context: "cave",
          },
        },
      },
    },
    {
      id: "discoveryCreature",
      label: "C. Discovery Creature Encounter Fixture",
      expectSections: ["creature_encounter"],
      data: {
        title: "Discovery Creature Encounter Fixture",
        discovery_payload: {
          creature_encounter: {
            behavior: "hostile",
            weakness: ["fire"],
          },
        },
      },
    },
    {
      id: "structuredRequirement",
      label: "D. Structured Requirement Unlock Fixture",
      expectSections: ["requirement_unlock"],
      data: {
        title: "Structured Requirement Unlock Fixture",
        structured_context: {
          requirement_unlock: {
            required_level: 10,
            unlock_type: "recipe_unlock",
          },
        },
      },
    },
    {
      id: "metaVersioning",
      label: "E. Meta Versioning Fixture",
      expectSections: ["versioning"],
      data: {
        title: "Meta Versioning Fixture",
        meta: {
          versioning: {
            game_version: "1.0",
            changed_in: "1.1",
          },
        },
      },
    },
    {
      id: "negativeSourceDetailOnly",
      label: "F. Negative Source Detail Only Fixture",
      expectSections: [],
      data: {
        title: "Negative Source Detail Only Fixture",
        source_detail: "red crystal nodes",
      },
    },
    {
      id: "negativeNameOnly",
      label: "G. Negative Name Only Fixture",
      expectSections: [],
      data: {
        title: "QA Staff of Fire",
      },
    },
    {
      id: "emptyUnknown",
      label: "H. Empty Unknown Fixture",
      expectSections: [],
      data: {
        title: "Empty Unknown Fixture",
        meta: {
          node_type: "",
          weather_condition: "",
          unknown: "value",
        },
      },
    },
    {
      id: "mixedAll",
      label: "I. Mixed Structured Context Fixture",
      expectSections: [
        "resource_node",
        "observation_context",
        "creature_encounter",
        "requirement_unlock",
        "versioning",
      ],
      data: {
        title: "Mixed Structured Context Fixture",
        structured_context: {
          resource_node: {
            node_type: "crystal_node",
            acquisition_sources: [{ acquisition_method: "mining" }],
          },
          observation_context: {
            coordinates: { x: 1, y: 2 },
            biome_context: "swamp",
          },
          creature_encounter: {
            behavior: "neutral",
            encounter_type: "ambient",
          },
          requirement_unlock: {
            required_level: 5,
            unlock_type: "access_gate",
          },
          versioning: {
            game_version: "0.9",
            introduced_in: "0.9",
          },
        },
      },
    },
  ];

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function runContractAssertions(CDC, CSR) {
    const base = { title: "Base", meta: { versioning: { game_version: "1.0" } } };
    const before = JSON.stringify(base);
    const resolved = CDC.resolveContractEntry(base);
    const after = JSON.stringify(base);
    const renderHtml = CSR.renderContextSections(resolved);

    const checks = [
      ["typeof CDC", typeof CDC === "object"],
      ["typeof CSR", typeof CSR === "object"],
      ["shouldWriteContractData false", CDC.shouldWriteContractData() === false],
      ["shouldPromoteContractData false", CDC.shouldPromoteContractData("resource_node", { node_type: "crystal_node" }) === false],
      ["shouldRenderContractActions false", CDC.shouldRenderContractActions("resource_node", { node_type: "crystal_node" }) === false],
      ["source_detail resource false", CDC.hasExplicitContractSection({ source_detail: "red crystal nodes" }, "resource_node") === false],
      ["node_type resource true", CDC.hasExplicitContractSection({ node_type: "crystal_node" }, "resource_node") === true],
      ["title creature false", CDC.hasExplicitContractSection({ title: "QA Staff of Fire" }, "creature_encounter") === false],
      ["source_detail any false", CDC.hasAnyExplicitContractContext({ source_detail: "red crystal nodes" }) === false],
      ["structured requirement true", CDC.hasAnyExplicitContractContext({
        structured_context: { requirement_unlock: { required_level: 10 } },
      }) === true],
      ["entry not mutated", before === after],
      ["resolved is clone", resolved !== base],
      ["render no button", !renderHtml.includes("<button")],
      ["render no form", !renderHtml.includes("<form")],
      ["render no create-post", !renderHtml.includes("create-post")],
      ["render no edit-post", !renderHtml.includes("edit-post")],
      ["render no admin", !renderHtml.includes("admin")],
    ];
    return checks.map(function(pair) {
      return { name: pair[0], ok: !!pair[1] };
    });
  }

  function sectionsMatch(actual, expected) {
    if (actual.length !== expected.length) return false;
    return expected.every(function(section) {
      return actual.indexOf(section) >= 0;
    });
  }

  function renderFixturePanel(fixture, CDC, CSR) {
    const before = JSON.stringify(fixture.data);
    const resolved = CDC.resolveContractEntry(fixture.data);
    const after = JSON.stringify(fixture.data);
    const collected = CSR.collectRenderableContextSections(resolved);
    const html = CSR.renderContextSections(resolved);
    const contractDiagnostics = CDC.getContractDiagnostics(fixture.data);
    const renderDiagnostics = CSR.getContextRenderDiagnostics(resolved);
    const sectionCount = (html.match(/bl-p3-context-section/g) || []).length;
    const ok = before === after &&
      sectionsMatch(collected, fixture.expectSections) &&
      (fixture.expectSections.length === 0 ? sectionCount === 0 : sectionCount > 0) &&
      !html.includes("<button") &&
      !html.includes("<form") &&
      !html.includes("create-post") &&
      !html.includes("edit-post") &&
      !html.includes("/wiki/admin");

    return {
      fixture: fixture,
      resolved: resolved,
      collected: collected,
      contractDiagnostics: contractDiagnostics,
      renderDiagnostics: renderDiagnostics,
      html: html,
      sectionCount: sectionCount,
      ok: ok,
    };
  }

  function mountFixtures() {
    const CDC = window.BoundLoreContextDataContract;
    const CSR = window.BoundLoreContextSectionRenderer;
    const root = document.getElementById("fixtureRoot");
    const summary = document.getElementById("fixtureSummary");
    if (!CDC || !CSR || !root) return;

    const assertionResults = runContractAssertions(CDC, CSR);
    const fixtureResults = FIXTURES.map(function(f) {
      return renderFixturePanel(f, CDC, CSR);
    });

    let html = "";
    fixtureResults.forEach(function(result) {
      const status = result.ok ? "pass" : "fail";
      html += '<article class="qa-fixture-panel" data-fixture-id="' +
        escapeText(result.fixture.id) + '" data-status="' + status + '">';
      html += '<header class="qa-fixture-header">';
      html += '<h2>' + escapeText(result.fixture.label) + "</h2>";
      html += '<span class="qa-fixture-badge qa-fixture-badge--' + status + '">' +
        (result.ok ? "PASS" : "FAIL") + "</span>";
      html += "</header>";
      html += '<p class="qa-fixture-meta"><strong>Collected sections:</strong> ' +
        escapeText(result.collected.join(", ") || "(none)") + "</p>";
      html += '<p class="qa-fixture-meta"><strong>Expected:</strong> ' +
        escapeText(result.fixture.expectSections.join(", ") || "(none)") + "</p>";
      html += '<details class="qa-fixture-details"><summary>Contract diagnostics</summary><pre>' +
        escapeText(JSON.stringify(result.contractDiagnostics, null, 2)) + "</pre></details>";
      html += '<div class="qa-fixture-render">';
      if (result.html) {
        html += result.html;
      } else {
        html += '<p class="qa-fixture-empty">No context sections rendered (expected for negative fixtures).</p>';
      }
      html += "</div></article>";
    });
    root.innerHTML = html;

    const assertionPass = assertionResults.filter(function(r) { return r.ok; }).length;
    const fixturePass = fixtureResults.filter(function(r) { return r.ok; }).length;
    const totalSections = document.querySelectorAll(".bl-p3-context-section").length;
    const unsafe = [...document.querySelectorAll(".bl-p3-context button, .bl-p3-context form, .bl-p3-context a")];

    if (summary) {
      summary.innerHTML =
        "<p><strong>Contract assertions:</strong> " + assertionPass + "/" + assertionResults.length + "</p>" +
        "<p><strong>Fixture panels:</strong> " + fixturePass + "/" + FIXTURES.length + "</p>" +
        "<p><strong>Visible context sections:</strong> " + totalSections + "</p>" +
        "<p><strong>Unsafe DOM in context:</strong> " + unsafe.length + "</p>";
    }

    window.__P3ContextDataContractFixtures = {
      pass: fixturePass === FIXTURES.length && assertionPass === assertionResults.length,
      assertions: assertionResults,
      fixtures: fixtureResults.map(function(r) {
        return {
          id: r.fixture.id,
          ok: r.ok,
          collected: r.collected,
          expected: r.fixture.expectSections,
          sectionCount: r.sectionCount,
        };
      }),
      totalSections: totalSections,
      unsafeCount: unsafe.length,
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountFixtures);
  } else {
    mountFixtures();
  }

  window.BoundLoreP3ContextDataContractFixtures = { FIXTURES: FIXTURES };
})();
