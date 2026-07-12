// QA-only local fixture harness for BoundLoreContextSectionRenderer (P3-B.1).
// No Supabase, no fetch/write, no admin/create/edit flows.

(function() {
  const FIXTURES = [
    {
      id: "resourceNodeExplicitFixture",
      label: "A. Synthetic Resource Node Context Fixture",
      expectSections: ["resource_node"],
      data: {
        title: "Synthetic Resource Node Context Fixture",
        entity_domain: "OBJECT",
        entity_subtype: "resource",
        node_type: "crystal_node",
        acquisition_sources: [{
          acquisition_method: "mining",
          source_type: "mining",
          source_detail: "explicit synthetic node",
        }],
        node_observations: [{ node_type: "crystal_node", biome_context: "cave" }],
      },
    },
    {
      id: "observationExplicitFixture",
      label: "B. Synthetic Observation Context Fixture",
      expectSections: ["observation_context"],
      data: {
        title: "Synthetic Observation Context Fixture",
        observation_context: {
          coordinates: { x: 10, y: 20, z: 0, system: "map" },
          location_ref: "Synthetic Cave",
          biome_context: "cave",
          time_condition: "nighttime",
          weather_condition: "rain",
        },
      },
    },
    {
      id: "creatureEncounterExplicitFixture",
      label: "C. Synthetic Creature Encounter Context Fixture",
      expectSections: ["creature_encounter"],
      data: {
        title: "Synthetic Creature Encounter Context Fixture",
        behavior: "hostile",
        encounter_type: "rare_spawn",
        spawn_context: "time_based",
        drop_context: "rare",
        weakness: ["fire"],
        resistance: ["poison"],
      },
    },
    {
      id: "requirementUnlockExplicitFixture",
      label: "D. Synthetic Requirement Unlock Context Fixture",
      expectSections: ["requirement_unlock"],
      data: {
        title: "Synthetic Requirement Unlock Context Fixture",
        required_level: 10,
        profession_level: 5,
        faction_req: "Synthetic Faction",
        unlock_type: "recipe_unlock",
        access_state: "conditional",
      },
    },
    {
      id: "versioningExplicitFixture",
      label: "E. Synthetic Versioning Context Fixture",
      expectSections: ["versioning"],
      data: {
        title: "Synthetic Versioning Context Fixture",
        game_version: "1.0",
        valid_from: "1.0",
        valid_until: "1.2",
        introduced_in: "1.0",
        changed_in: "1.1",
      },
    },
    {
      id: "negativeSourceDetailOnlyFixture",
      label: "F. Negative Source Detail Fixture",
      expectSections: [],
      data: {
        title: "Negative Source Detail Fixture",
        source_detail: "red crystal nodes",
      },
    },
    {
      id: "negativeNameOnlyFixture",
      label: "G. Negative Name Only Fixture",
      expectSections: [],
      data: {
        title: "QA Staff of Fire",
        description: "Name-only negative fixture",
      },
    },
    {
      id: "emptyUnknownFixture",
      label: "H. Empty Unknown Fixture",
      expectSections: [],
      data: {
        title: "Empty Unknown Fixture",
        node_type: "",
        required_level: "",
        weather_condition: "",
      },
    },
  ];

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function runAssertions(CSR) {
    const checks = [
      ["typeof CSR", typeof CSR === "object"],
      ["source_detail false", CSR.hasExplicitResourceNodeContext({ source_detail: "red crystal nodes" }) === false],
      ["node_type true", CSR.hasExplicitResourceNodeContext({ node_type: "crystal_node" }) === true],
      ["coords true", CSR.hasExplicitObservationContext({ coordinates: { x: 10, y: 20 } }) === true],
      ["drop_context true", CSR.hasExplicitCreatureEncounterContext({ drop_context: "rare" }) === true],
      ["title creature false", CSR.hasExplicitCreatureEncounterContext({ title: "QA Staff of Fire" }) === false],
      ["required_level true", CSR.hasExplicitRequirementUnlockContext({ required_level: 10 }) === true],
      ["title requirement false", CSR.hasExplicitRequirementUnlockContext({ title: "QA Staff of Fire" }) === false],
      ["render source empty", !CSR.renderContextSections({ source_detail: "red crystal nodes" })],
      ["render title empty", !CSR.renderContextSections({ title: "QA Staff of Fire" })],
      ["no actions", CSR.shouldRenderContextActions("resource_node", { node_type: "crystal_node" }) === false],
      ["no promote", CSR.shouldPromoteContextToPost("resource_node", { node_type: "crystal_node" }) === false],
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

  function renderFixturePanel(fixture, CSR) {
    const collected = CSR.collectRenderableContextSections(fixture.data);
    const html = CSR.renderContextSections(fixture.data);
    const diagnostics = CSR.getContextRenderDiagnostics(fixture.data);
    const sectionCount = (html.match(/bl-p3-context-section/g) || []).length;
    const ok = sectionsMatch(collected, fixture.expectSections) &&
      (fixture.expectSections.length === 0 ? sectionCount === 0 : sectionCount > 0) &&
      !html.includes("<button") &&
      !html.includes("<form") &&
      !html.includes("create-post") &&
      !html.includes("edit-post") &&
      !html.includes("/wiki/admin");

    return {
      fixture: fixture,
      collected: collected,
      diagnostics: diagnostics,
      html: html,
      sectionCount: sectionCount,
      ok: ok,
    };
  }

  function mountFixtures() {
    const CSR = window.BoundLoreContextSectionRenderer;
    const root = document.getElementById("fixtureRoot");
    const summary = document.getElementById("fixtureSummary");
    if (!CSR || !root) return;

    const assertionResults = runAssertions(CSR);
    const fixtureResults = FIXTURES.map(function(f) {
      return renderFixturePanel(f, CSR);
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
      html += '<details class="qa-fixture-details"><summary>Diagnostics</summary><pre>' +
        escapeText(JSON.stringify(result.diagnostics, null, 2)) + "</pre></details>";
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
        "<p><strong>Console assertions:</strong> " + assertionPass + "/" + assertionResults.length + "</p>" +
        "<p><strong>Fixture panels:</strong> " + fixturePass + "/" + fixtureResults.length + "</p>" +
        "<p><strong>Visible context sections:</strong> " + totalSections + "</p>" +
        "<p><strong>Unsafe DOM in context:</strong> " + unsafe.length + "</p>";
    }

    window.__P3ContextFixtureResults = {
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

  window.BoundLoreP3ContextFixtures = { FIXTURES: FIXTURES };
})();
