// QA-only local preview matrix for P3-C detail-page preview modes (P3-D.1).
// No Supabase, no fetch/write, no admin/create/edit flows, no iframes.

(function() {
  const PREVIEW_PARAM = "p3_context_preview";
  const BASE_ORIGIN = "http://localhost:8080";

  const ENTRIES = [
    {
      id: "qa-staff",
      label: "QA Staff of Fire",
      slug: "qa-staff-of-fire-2b742628",
      path: "/wiki/post/?slug=qa-staff-of-fire-2b742628",
    },
    {
      id: "qa-ember",
      label: "QA Ember Shard",
      slug: "qa-ember-shard-511160",
      path: "/wiki/post/?slug=qa-ember-shard-511160",
    },
    {
      id: "qa-ogre",
      label: "QA Ogre Mage",
      slug: "qa-ogre-mage-1103f2",
      path: "/wiki/post/?slug=qa-ogre-mage-1103f2",
    },
    {
      id: "swamp",
      label: "Swamp",
      slug: "swamplands-94dadc07",
      path: "/wiki/post/?slug=swamplands-94dadc07",
    },
  ];

  const MODES = [
    {
      id: "no_preview",
      label: "no_preview",
      queryValue: null,
      expectedSections: 0,
      expectedBanner: 0,
      expectedSectionNames: [],
      notes: "No preview query param",
    },
    {
      id: "resource_node",
      label: "resource_node",
      queryValue: "resource_node",
      expectedSections: 1,
      expectedBanner: 1,
      expectedSectionNames: ["Resource Node"],
      notes: "Synthetic resource node section",
    },
    {
      id: "observation_context",
      label: "observation_context",
      queryValue: "observation_context",
      expectedSections: 1,
      expectedBanner: 1,
      expectedSectionNames: ["Observation Context"],
      notes: "Synthetic observation section",
    },
    {
      id: "creature_encounter",
      label: "creature_encounter",
      queryValue: "creature_encounter",
      expectedSections: 1,
      expectedBanner: 1,
      expectedSectionNames: ["Creature Encounter"],
      notes: "Synthetic creature encounter section",
    },
    {
      id: "requirement_unlock",
      label: "requirement_unlock",
      queryValue: "requirement_unlock",
      expectedSections: 1,
      expectedBanner: 1,
      expectedSectionNames: ["Requirements & Unlocks"],
      notes: "Synthetic requirement/unlock section",
    },
    {
      id: "versioning",
      label: "versioning",
      queryValue: "versioning",
      expectedSections: 1,
      expectedBanner: 1,
      expectedSectionNames: ["Version History"],
      notes: "Synthetic versioning section",
    },
    {
      id: "all",
      label: "all",
      queryValue: "all",
      expectedSections: 5,
      expectedBanner: 1,
      expectedSectionNames: [
        "Resource Node",
        "Observation Context",
        "Creature Encounter",
        "Requirements & Unlocks",
        "Version History",
      ],
      notes: "All positive synthetic sections",
    },
    {
      id: "negative_source_detail",
      label: "negative_source_detail",
      queryValue: "negative_source_detail",
      expectedSections: 0,
      expectedBanner: 1,
      expectedSectionNames: [],
      notes: "No resource node section (source_detail only)",
    },
    {
      id: "negative_name_only",
      label: "negative_name_only",
      queryValue: "negative_name_only",
      expectedSections: 0,
      expectedBanner: 1,
      expectedSectionNames: [],
      notes: "No fire/weakness/creature section (name only)",
    },
    {
      id: "empty_unknown",
      label: "empty_unknown",
      queryValue: "empty_unknown",
      expectedSections: 0,
      expectedBanner: 1,
      expectedSectionNames: [],
      notes: "Empty/unknown fields render nothing",
    },
    {
      id: "off",
      label: "off",
      queryValue: "off",
      expectedSections: 0,
      expectedBanner: 0,
      expectedSectionNames: [],
      notes: "Explicit off mode — no preview active",
    },
  ];

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function buildPreviewUrl(entry, mode) {
    const base = BASE_ORIGIN + entry.path;
    if (!mode || mode.queryValue == null) return base;
    const sep = entry.path.indexOf("?") >= 0 ? "&" : "?";
    return base + sep + PREVIEW_PARAM + "=" + encodeURIComponent(mode.queryValue);
  }

  function formatExpected(mode) {
    const parts = [
      "sections: " + mode.expectedSections,
      "banner: " + mode.expectedBanner,
    ];
    if (mode.expectedSectionNames.length) {
      parts.push("sections: " + mode.expectedSectionNames.join(", "));
    }
    return parts.join(" · ");
  }

  function renderMatrix() {
    const root = document.getElementById("previewMatrixRoot");
    const summary = document.getElementById("previewMatrixSummary");
    if (!root) return;

    let html = "";
    ENTRIES.forEach(function(entry) {
      html += '<section class="bl-qa-preview-matrix-entry" data-entry-id="' +
        escapeText(entry.id) + '">';
      html += '<h2 class="bl-qa-preview-matrix-entry-title">' + escapeText(entry.label) + "</h2>";
      html += '<p class="bl-qa-preview-matrix-entry-meta"><code>' + escapeText(entry.path) +
        "</code></p>";
      html += '<table class="bl-qa-preview-matrix-table">';
      html += "<thead><tr>";
      html += "<th>Mode</th><th>Preview URL</th><th>Expected</th><th>Notes</th>";
      html += "</tr></thead><tbody>";

      MODES.forEach(function(mode) {
        const url = buildPreviewUrl(entry, mode);
        html += '<tr class="bl-qa-preview-mode" data-mode="' + escapeText(mode.id) + '">';
        html += "<td><span class=\"bl-qa-preview-mode-label\">" + escapeText(mode.label) +
          "</span></td>";
        html += '<td><a class="bl-qa-preview-link" href="' + escapeText(url) + '">' +
          escapeText(url) + "</a></td>";
        html += '<td><span class="bl-qa-preview-expected">' + escapeText(formatExpected(mode)) +
          "</span></td>";
        html += "<td>" + escapeText(mode.notes) + "</td>";
        html += "</tr>";
      });

      html += "</tbody></table></section>";
    });

    root.innerHTML = html;

    if (summary) {
      const linkCount = root.querySelectorAll("a.bl-qa-preview-link").length;
      summary.innerHTML =
        "<p><strong>Entries:</strong> " + ENTRIES.length + "</p>" +
        "<p><strong>Modes per entry:</strong> " + MODES.length + "</p>" +
        "<p><strong>Preview links:</strong> " + linkCount + "</p>" +
        "<p><strong>Query param:</strong> <code>" + PREVIEW_PARAM + "</code></p>" +
        "<p><strong>Origin:</strong> <code>" + BASE_ORIGIN + "</code> (localhost only)</p>";
    }

    window.__P3DetailPreviewMatrix = {
      entries: ENTRIES,
      modes: MODES,
      buildPreviewUrl: buildPreviewUrl,
      linkCount: root.querySelectorAll("a.bl-qa-preview-link").length,
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderMatrix);
  } else {
    renderMatrix();
  }
})();
