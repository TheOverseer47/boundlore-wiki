// QA-only local read-only sample data gate (P3-I.1).
// Full entry objects with explicit contract fields; no Supabase, no writes, no posts.

(function() {
  const SAMPLES = [
    {
      id: "sampleResourceEntry",
      label: "A. Sample Resource Entry",
      expectSections: ["resource_node"],
      data: {
        title: "Sample Crystal Bloom",
        entity_domain: "OBJECT",
        entity_subtype: "resource",
        meta: {
          node_type: "crystal_node",
          acquisition_sources: [{
            acquisition_method: "mining",
            source_type: "mining",
          }],
          node_observations: [{
            node_type: "crystal_node",
            biome_context: "cave",
          }],
        },
      },
    },
    {
      id: "sampleObservationEntry",
      label: "B. Sample Observation Entry",
      expectSections: ["observation_context"],
      data: {
        title: "Sample Cave Landmark",
        entity_domain: "PLACE",
        entity_subtype: "landmark",
        discovery_payload: {
          observation_context: {
            coordinates: { x: 10, y: 20, z: 0, system: "map" },
            location_ref: "Sample Cave",
            biome_context: "cave",
            time_condition: "nighttime",
            weather_condition: "rain",
          },
        },
      },
    },
    {
      id: "sampleCreatureEntry",
      label: "C. Sample Creature Entry",
      expectSections: ["creature_encounter"],
      data: {
        title: "Sample Mire Stalker",
        entity_domain: "BEING",
        entity_subtype: "creature",
        structured_context: {
          creature_encounter: {
            behavior: "hostile",
            encounter_type: "rare_spawn",
            spawn_context: "time_based",
            drop_context: "rare",
            weakness: ["fire"],
            resistance: ["poison"],
          },
        },
      },
    },
    {
      id: "sampleUnlockEntry",
      label: "D. Sample Unlock Entry",
      expectSections: ["requirement_unlock"],
      data: {
        title: "Sample Ember Recipe",
        entity_domain: "KNOWLEDGE",
        entity_subtype: "recipe",
        meta: {
          requirements: [{ type: "required_level", value: 10 }],
          required_level: 10,
          profession_level: 5,
          faction_req: "Sample Faction",
          unlock_type: "recipe_unlock",
          access_state: "conditional",
        },
      },
    },
    {
      id: "sampleVersionedEntry",
      label: "E. Sample Versioned Entry",
      expectSections: ["versioning"],
      data: {
        title: "Sample Versioned Item",
        entity_domain: "OBJECT",
        entity_subtype: "item",
        meta: {
          versioning: {
            game_version: "1.0",
            valid_from: "1.0",
            valid_until: "1.2",
            introduced_in: "1.0",
            changed_in: "1.1",
          },
        },
      },
    },
    {
      id: "sampleAllEntry",
      label: "F. Sample Full Context Entry",
      expectSections: [
        "resource_node",
        "observation_context",
        "creature_encounter",
        "requirement_unlock",
        "versioning",
      ],
      data: {
        title: "Sample Full Context Entry",
        entity_domain: "META",
        entity_subtype: "sample",
        structured_context: {
          resource_node: {
            node_type: "crystal_node",
            acquisition_sources: [{ acquisition_method: "mining" }],
          },
          observation_context: {
            coordinates: { x: 5, y: 15 },
            biome_context: "swamp",
          },
          creature_encounter: {
            behavior: "neutral",
            encounter_type: "ambient",
          },
          requirement_unlock: {
            required_level: 8,
            unlock_type: "access_gate",
          },
          versioning: {
            game_version: "0.9",
            introduced_in: "0.9",
          },
        },
      },
    },
    {
      id: "negativeSourceDetailOnly",
      label: "G. Negative Source Detail Only",
      expectSections: [],
      data: {
        title: "Negative Source Detail Only",
        source_detail: "red crystal nodes",
      },
    },
    {
      id: "negativeNameOnly",
      label: "H. Negative Name Only",
      expectSections: [],
      data: {
        title: "QA Staff of Fire",
        description: "Name-only negative",
      },
    },
    {
      id: "negativeDerivedBiomeOnly",
      label: "I. Negative Derived Biome Only",
      expectSections: [],
      data: {
        title: "Derived Biome Negative",
        biome_context: "swamp",
        _derived: true,
      },
    },
    {
      id: "emptyUnknown",
      label: "J. Empty Unknown",
      expectSections: [],
      data: {
        title: "Empty Unknown",
        meta: {
          node_type: "",
          weather_condition: "",
          unknown: "value",
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

  function sectionsMatch(actual, expected) {
    if (actual.length !== expected.length) return false;
    return expected.every(function(section) {
      return actual.indexOf(section) >= 0;
    });
  }

  function isUnsafeHtml(html) {
    return html.includes("<button") ||
      html.includes("<form") ||
      html.includes("create-post") ||
      html.includes("edit-post") ||
      html.includes("/wiki/admin") ||
      html.includes("admin");
  }

  function renderSamplePanel(sample, CDC, CSR) {
    const before = JSON.stringify(sample.data);
    const resolved = CDC.resolveContractEntry(sample.data);
    const after = JSON.stringify(sample.data);
    const diagnostics = CDC.getContractDiagnostics(sample.data);
    const collected = CSR.collectRenderableContextSections(resolved);
    const html = CSR.renderContextSections(resolved) || "";
    const sectionCount = (html.match(/bl-p3-context-section/g) || []).length;
    const ok = before === after &&
      sectionsMatch(collected, sample.expectSections) &&
      (sample.expectSections.length === 0 ? sectionCount === 0 : sectionCount > 0) &&
      !isUnsafeHtml(html);

    return {
      sample: sample,
      resolved: resolved,
      collected: collected,
      diagnostics: diagnostics,
      html: html,
      sectionCount: sectionCount,
      ok: ok,
    };
  }

  function mountSamples() {
    const CDC = window.BoundLoreContextDataContract;
    const CSR = window.BoundLoreContextSectionRenderer;
    const root = document.getElementById("sampleRoot");
    const summary = document.getElementById("sampleSummary");
    if (!CDC || !CSR || !root) return;

    const results = SAMPLES.map(function(s) {
      return renderSamplePanel(s, CDC, CSR);
    });

    let html = "";
    results.forEach(function(result) {
      const status = result.ok ? "pass" : "fail";
      html += '<article class="qa-fixture-panel" data-sample-id="' +
        escapeText(result.sample.id) + '" data-status="' + status + '">';
      html += '<header class="qa-fixture-header">';
      html += '<h2>' + escapeText(result.sample.label) + "</h2>";
      html += '<span class="qa-fixture-badge qa-fixture-badge--' + status + '">' +
        (result.ok ? "PASS" : "FAIL") + "</span>";
      html += "</header>";
      html += '<p class="qa-fixture-meta"><strong>Title:</strong> ' +
        escapeText(result.sample.data.title || "(none)") + "</p>";
      html += '<p class="qa-fixture-meta"><strong>Collected sections:</strong> ' +
        escapeText(result.collected.join(", ") || "(none)") + "</p>";
      html += '<p class="qa-fixture-meta"><strong>Expected:</strong> ' +
        escapeText(result.sample.expectSections.join(", ") || "(none)") + "</p>";
      html += '<details class="qa-fixture-details"><summary>Contract diagnostics</summary><pre>' +
        escapeText(JSON.stringify(result.diagnostics, null, 2)) + "</pre></details>";
      html += '<div class="qa-fixture-render">';
      if (result.html) {
        html += result.html;
      } else {
        html += '<p class="qa-fixture-empty">No context sections rendered (expected for negative samples).</p>';
      }
      html += "</div></article>";
    });
    root.innerHTML = html;

    const passCount = results.filter(function(r) { return r.ok; }).length;
    const failCount = results.length - passCount;
    const unsafe = [...root.querySelectorAll("button, form, a[href*='admin'], a[href*='create-post'], a[href*='edit-post']")];

    if (summary) {
      summary.innerHTML =
        "<p><strong>Sample entries:</strong> " + passCount + "/" + results.length + " PASS</p>" +
        "<p><strong>Fail count:</strong> " + failCount + "</p>" +
        "<p><strong>Unsafe DOM in sample gate:</strong> " + unsafe.length + "</p>";
    }

    window.__P3ReadOnlySampleDataGate = {
      pass: failCount === 0 && passCount === SAMPLES.length,
      passCount: passCount,
      failCount: failCount,
      total: SAMPLES.length,
      samples: results.map(function(r) {
        return {
          id: r.sample.id,
          ok: r.ok,
          collected: r.collected,
          expected: r.sample.expectSections,
          sectionCount: r.sectionCount,
        };
      }),
      unsafeCount: unsafe.length,
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountSamples);
  } else {
    mountSamples();
  }

  window.BoundLoreP3ReadOnlySampleData = { SAMPLES: SAMPLES };
})();
