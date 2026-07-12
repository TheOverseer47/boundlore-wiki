// QA-only real existing entry contract probe link matrix (P3-K.1).
// No Supabase, no fetch/write, no admin/create/edit flows, no iframes.

(function() {
  const PROBE_PARAM = "p3_contract_probe";
  const PREVIEW_PARAM = "p3_context_preview";
  const BASE_ORIGIN = "http://localhost:8080";

  const ENTRIES = [
    {
      id: "qa-staff",
      label: "QA Staff of Fire",
      slug: "qa-staff-of-fire-2b742628",
    },
    {
      id: "qa-ember",
      label: "QA Ember Shard",
      slug: "qa-ember-shard-511160",
    },
    {
      id: "qa-ogre",
      label: "QA Ogre Mage",
      slug: "qa-ogre-mage-1103f2",
    },
    {
      id: "swamp",
      label: "Swamp",
      slug: "swamplands-94dadc07",
    },
  ];

  const MODES = [
    {
      id: "no_probe",
      label: "no_probe",
      buildQuery: function() { return {}; },
      notes: "No probe query param; no probe panel expected",
    },
    {
      id: "probe_summary",
      label: "probe_summary",
      buildQuery: function() {
        const q = {};
        q[PROBE_PARAM] = "1";
        return q;
      },
      notes: "Summary probe panel; 0 context sections expected for QA entries without explicit contract fields",
    },
    {
      id: "probe_full",
      label: "probe_full",
      buildQuery: function() {
        const q = {};
        q[PROBE_PARAM] = "full";
        return q;
      },
      notes: "Full probe diagnostics table",
    },
    {
      id: "preview_all_plus_probe",
      label: "preview_all_plus_probe",
      buildQuery: function() {
        const q = {};
        q[PREVIEW_PARAM] = "all";
        q[PROBE_PARAM] = "1";
        return q;
      },
      notes: "Preview sections + probe panel; preview is synthetic/ephemeral and separate",
    },
  ];

  function buildUrl(slug, queryObj) {
    const params = new URLSearchParams();
    params.set("slug", slug);
    Object.keys(queryObj || {}).forEach(function(key) {
      params.set(key, queryObj[key]);
    });
    return BASE_ORIGIN + "/wiki/post/?" + params.toString();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMatrix() {
    const root = document.getElementById("realEntryProbeRoot");
    const summary = document.getElementById("realEntryProbeSummary");
    if (!root || !summary) return;

    let linkCount = 0;
    let html = "";

    ENTRIES.forEach(function(entry) {
      html += '<section class="qa-probe-entry" id="probe-entry-' + escapeHtml(entry.id) + '">';
      html += "<h2>" + escapeHtml(entry.label) + "</h2>";
      html += '<p class="qa-probe-meta">Slug: <code>' + escapeHtml(entry.slug) + "</code></p>";
      html += '<ul class="qa-probe-links">';
      MODES.forEach(function(mode) {
        const url = buildUrl(entry.slug, mode.buildQuery());
        linkCount += 1;
        html += "<li>";
        html += '<span class="qa-probe-mode-label">' + escapeHtml(mode.label) + "</span> ";
        html += '<a href="' + escapeHtml(url) + '">' + escapeHtml(url) + "</a>";
        if (mode.notes) {
          html += ' <span class="qa-probe-meta">— ' + escapeHtml(mode.notes) + "</span>";
        }
        html += "</li>";
      });
      html += "</ul></section>";
    });

    root.innerHTML = html;

    summary.innerHTML =
      "<p><strong>Entries:</strong> " + ENTRIES.length +
      " · <strong>Modes per entry:</strong> " + MODES.length +
      " · <strong>Total links:</strong> " + linkCount + "</p>" +
      "<p>All links target <code>http://localhost:8080</code> only. No admin/create/edit links.</p>";

    const unsafe =
      html.includes("/wiki/admin") ||
      html.includes("create-post") ||
      html.includes("edit-post") ||
      html.includes("<button") ||
      html.includes("<form");
    if (unsafe) {
      console.error("[P3-K.1 probe links] unsafe markup detected");
    }

    window.__P3RealEntryContractProbeLinks = {
      entries: ENTRIES.slice(),
      modes: MODES.map(function(m) { return m.id; }),
      linkCount: linkCount,
      baseOrigin: BASE_ORIGIN,
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderMatrix);
  } else {
    renderMatrix();
  }
})();
