// ============================================
// BoundLore Context Real Entry Probe
// P3-K.1 — localhost + query-param read-only real entry contract diagnostics.
// No writes, no posts, no Supabase, no entry mutation, no admin/create flows.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreContextRealEntryProbe = (function() {
  const PROBE_QUERY_PARAM = "p3_contract_probe";

  const PROBE_ENABLED_VALUES = ["1", "true", "summary", "full"];

  const PROBE_MODES = ["summary", "full", "off"];

  const PROBE_POLICY = [
    "localhost_only",
    "query_param_only",
    "read_only",
    "no_writes",
    "no_actions",
    "no_post_promotion",
    "no_entry_mutation",
    "no_admin_create_edit_links",
    "no_search_index",
    "no_supabase_writes",
  ];

  const PROBED_ENTRY_SLUGS = [
    "qa-staff-of-fire-2b742628",
    "qa-ember-shard-511160",
    "qa-ogre-mage-1103f2",
    "swamplands-94dadc07",
  ];

  let lastProbeResult = null;

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeHostname(value) {
    let raw = String(value == null ? "" : value).trim().toLowerCase();
    if (!raw) return "";
    const colonIdx = raw.lastIndexOf(":");
    if (colonIdx > 0 && raw.indexOf(":") === colonIdx) {
      const maybePort = raw.slice(colonIdx + 1);
      if (/^\d+$/.test(maybePort)) {
        raw = raw.slice(0, colonIdx);
      }
    }
    return raw;
  }

  function getAllowedProbeHostname() {
    return "localhost";
  }

  function isAllowedProbeHostname(hostname) {
    return normalizeHostname(hostname) === getAllowedProbeHostname();
  }

  function parseLocationLike(locationLike) {
    const loc = locationLike && typeof locationLike === "object" ? locationLike : {};
    return {
      hostname: normalizeHostname(loc.hostname != null ? loc.hostname : ""),
      search: loc.search != null ? String(loc.search) : "",
    };
  }

  function readProbeParamFromSearch(search) {
    try {
      const s = String(search || "");
      const query = s.charAt(0) === "?" ? s.slice(1) : s;
      if (!query) return null;
      return new URLSearchParams(query).get(PROBE_QUERY_PARAM);
    } catch (err) {
      return null;
    }
  }

  function normalizeProbeMode(value) {
    const raw = String(value == null ? "" : value).trim().toLowerCase();
    if (!raw) return "off";
    if (raw === "1" || raw === "true" || raw === "summary") return "summary";
    if (raw === "full") return "full";
    return "off";
  }

  function isProbeAllowedForLocation(locationLike) {
    const parsed = parseLocationLike(locationLike);
    if (!isAllowedProbeHostname(parsed.hostname)) return false;
    const rawParam = readProbeParamFromSearch(parsed.search);
    if (rawParam == null || rawParam === "") return false;
    return normalizeProbeMode(rawParam) !== "off";
  }

  function isProbeActiveForLocation(locationLike) {
    return isProbeAllowedForLocation(locationLike);
  }

  function getActiveProbeModeForLocation(locationLike) {
    if (!isProbeAllowedForLocation(locationLike)) return "off";
    const parsed = parseLocationLike(locationLike);
    return normalizeProbeMode(readProbeParamFromSearch(parsed.search));
  }

  function isProbeActive() {
    if (typeof window === "undefined" || !window.location) return false;
    return isProbeActiveForLocation(window.location);
  }

  function getActiveProbeMode() {
    if (typeof window === "undefined" || !window.location) return "off";
    return getActiveProbeModeForLocation(window.location);
  }

  function shouldWriteProbeData() {
    return false;
  }

  function shouldPromoteProbeData() {
    return false;
  }

  function shouldRenderProbeActions() {
    return false;
  }

  function cloneProbeEntry(entry) {
    if (typeof BoundLoreContextDataContract !== "undefined" &&
        BoundLoreContextDataContract.cloneContractValue) {
      return BoundLoreContextDataContract.cloneContractValue(entry);
    }
    try {
      return JSON.parse(JSON.stringify(entry == null ? {} : entry));
    } catch (err) {
      return Object.assign({}, entry || {});
    }
  }

  function getEntrySlug(entry) {
    const post = entry && entry.post ? entry.post : {};
    return String(post.slug || entry.slug || "").trim();
  }

  function getEntryTitle(entry) {
    const post = entry && entry.post ? entry.post : {};
    return String(post.title || entry.title || "Untitled").trim();
  }

  function collectProbeSections(contractEntry) {
    const sections = [];
    const CDC = typeof BoundLoreContextDataContract !== "undefined"
      ? BoundLoreContextDataContract
      : null;
    if (!CDC || !CDC.hasExplicitContractSection) return sections;
    const names = CDC.CONTEXT_CONTRACT_SECTIONS || [
      "resource_node",
      "observation_context",
      "creature_encounter",
      "requirement_unlock",
      "versioning",
    ];
    names.forEach(function(section) {
      if (CDC.hasExplicitContractSection(contractEntry, section)) {
        sections.push(section);
      }
    });
    return sections;
  }

  function countContextSectionsInHtml(html) {
    const text = String(html || "");
    if (!text) return 0;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = text;
    return wrapper.querySelectorAll(".bl-p3-context-section").length;
  }

  function createProbeDiagnostics(originalEntry, contractEntry, options) {
    const opts = options || {};
    const CDC = typeof BoundLoreContextDataContract !== "undefined"
      ? BoundLoreContextDataContract
      : null;
    const contractDiagnostics = CDC && CDC.getContractDiagnostics
      ? CDC.getContractDiagnostics(originalEntry)
      : { has_explicit_context: false, sections: {} };
    const sections = collectProbeSections(contractEntry);
    const previewAdapter = typeof BoundLoreContextPreviewAdapter !== "undefined"
      ? BoundLoreContextPreviewAdapter
      : null;
    const previewActive = !!(previewAdapter && previewAdapter.isPreviewActive && previewAdapter.isPreviewActive());
    const previewMode = previewActive && previewAdapter.getActivePreviewMode
      ? previewAdapter.getActivePreviewMode()
      : "off";

    return {
      policy: PROBE_POLICY.slice(),
      probe_mode: opts.mode || getActiveProbeMode(),
      slug: getEntrySlug(originalEntry),
      title: getEntryTitle(originalEntry),
      probed_slugs: PROBED_ENTRY_SLUGS.slice(),
      contract: contractDiagnostics,
      explicit_sections: sections,
      has_explicit_context: sections.length > 0 || !!contractDiagnostics.has_explicit_context,
      context_section_count: opts.contextSectionCount != null
        ? opts.contextSectionCount
        : countContextSectionsInHtml(opts.renderHtml),
      preview_active: previewActive,
      preview_mode: previewMode,
      preview_separate: previewActive,
      preview_note: previewActive
        ? "P3 context preview is synthetic/ephemeral and separate from real contract fields."
        : "No preview query active; context sections reflect real contract fields only.",
      writes: false,
      promotion: false,
      actions: false,
      search_index: false,
    };
  }

  function createProbeResult(originalEntry, contractEntry, renderHtml, options) {
    const opts = options || {};
    const mode = opts.mode || getActiveProbeMode();
    const diagnostics = createProbeDiagnostics(originalEntry, contractEntry, Object.assign({}, opts, {
      mode: mode,
      renderHtml: renderHtml,
    }));
    return {
      timestamp: new Date().toISOString(),
      mode: mode,
      slug: diagnostics.slug,
      title: diagnostics.title,
      originalEntry: cloneProbeEntry(originalEntry),
      contractEntry: cloneProbeEntry(contractEntry),
      renderHtml: String(renderHtml || ""),
      diagnostics: diagnostics,
      sections: diagnostics.explicit_sections,
      contextSectionCount: diagnostics.context_section_count,
      previewActive: diagnostics.preview_active,
      previewMode: diagnostics.preview_mode,
      policy: PROBE_POLICY.slice(),
    };
  }

  function recordProbeResult(result) {
    lastProbeResult = result ? cloneProbeEntry(result) : null;
    return lastProbeResult;
  }

  function getLastProbeResult() {
    return lastProbeResult ? cloneProbeEntry(lastProbeResult) : null;
  }

  function renderDiagnosticsTable(diagnostics, mode) {
    if (!diagnostics || mode === "summary") return "";
    const contract = diagnostics.contract || {};
    const sections = contract.sections || {};
    let html = '<table class="bl-p3-real-entry-probe-table">';
    html += "<thead><tr><th>Section</th><th>Explicit</th><th>Sources</th></tr></thead><tbody>";
    Object.keys(sections).forEach(function(section) {
      const row = sections[section] || {};
      const sourceKeys = row.by_source ? Object.keys(row.by_source) : [];
      html += "<tr>";
      html += "<td>" + escapeHtml(section) + "</td>";
      html += "<td>" + escapeHtml(row.explicit ? "yes" : "no") + "</td>";
      html += "<td>" + escapeHtml(sourceKeys.join(", ") || "—") + "</td>";
      html += "</tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  function renderProbePanel(result, options) {
    void options;
    if (!result || !isProbeActive()) return "";
    const mode = result.mode || getActiveProbeMode();
    const diag = result.diagnostics || {};
    let html = '<aside class="bl-p3-real-entry-probe" data-probe-mode="' + escapeHtml(mode) + '">';
    html += '<p class="bl-p3-real-entry-probe-note"><strong>Local QA Real Entry Contract Probe</strong> — read-only, not saved</p>';
    html += '<p class="bl-p3-real-entry-probe-note">Mode: ' + escapeHtml(mode) +
      " · Entry: " + escapeHtml(result.title || diag.title || "Unknown") + "</p>";
    html += '<dl class="bl-p3-real-entry-probe-status">';
    html += "<div><dt>Slug</dt><dd>" + escapeHtml(result.slug || diag.slug || "—") + "</dd></div>";
    html += "<div><dt>Explicit contract sections</dt><dd>" +
      escapeHtml((result.sections || []).join(", ") || "(none)") + "</dd></div>";
    html += "<div><dt>Rendered context sections</dt><dd>" +
      escapeHtml(String(result.contextSectionCount != null ? result.contextSectionCount : 0)) + "</dd></div>";
    html += "<div><dt>Preview active</dt><dd>" +
      escapeHtml(diag.preview_active ? ("yes (" + (diag.preview_mode || "unknown") + ")") : "no") + "</dd></div>";
    html += "</dl>";
    if (diag.preview_note) {
      html += '<p class="bl-p3-real-entry-probe-note">' + escapeHtml(diag.preview_note) + "</p>";
    }
    html += renderDiagnosticsTable(diag, mode);
    html += "</aside>";
    return html;
  }

  function renderProbePanelInto(container, result, options) {
    if (!container) return false;
    const html = renderProbePanel(result, options);
    if (!html) return false;
    container.insertAdjacentHTML("beforeend", html);
    return true;
  }

  return {
    PROBE_QUERY_PARAM: PROBE_QUERY_PARAM,
    PROBE_ENABLED_VALUES: PROBE_ENABLED_VALUES,
    PROBE_MODES: PROBE_MODES,
    PROBE_POLICY: PROBE_POLICY,
    PROBED_ENTRY_SLUGS: PROBED_ENTRY_SLUGS,
    getProbeQueryParam: function() { return PROBE_QUERY_PARAM; },
    normalizeProbeMode: normalizeProbeMode,
    isAllowedProbeHostname: isAllowedProbeHostname,
    isProbeAllowedForLocation: isProbeAllowedForLocation,
    isProbeActiveForLocation: isProbeActiveForLocation,
    isProbeActive: isProbeActive,
    getActiveProbeMode: getActiveProbeMode,
    shouldWriteProbeData: shouldWriteProbeData,
    shouldPromoteProbeData: shouldPromoteProbeData,
    shouldRenderProbeActions: shouldRenderProbeActions,
    cloneProbeEntry: cloneProbeEntry,
    createProbeDiagnostics: createProbeDiagnostics,
    collectProbeSections: collectProbeSections,
    createProbeResult: createProbeResult,
    recordProbeResult: recordProbeResult,
    getLastProbeResult: getLastProbeResult,
    renderProbePanel: renderProbePanel,
    renderProbePanelInto: renderProbePanelInto,
  };
})();
