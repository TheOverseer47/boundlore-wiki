// ============================================
// BoundLore Context Preview Adapter
// P3-C.1 — localhost + query-param opt-in read-only detail preview overlay.
// No writes, no posts, no Supabase, no entry mutation, no admin/create flows.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreContextPreviewAdapter = (function() {
  const PREVIEW_QUERY_PARAM = "p3_context_preview";

  const PREVIEW_MODES = [
    "resource_node",
    "observation_context",
    "creature_encounter",
    "requirement_unlock",
    "versioning",
    "all",
    "negative_source_detail",
    "negative_name_only",
    "empty_unknown",
    "off",
  ];

  const PREVIEW_POLICY = [
    "localhost_only",
    "query_param_only",
    "read_only",
    "no_writes",
    "no_actions",
    "no_post_promotion",
    "no_entry_mutation",
    "no_admin_create_edit_links",
  ];

  const MODE_ALIASES = {
    resource: "resource_node",
    observation: "observation_context",
    creature: "creature_encounter",
    requirement: "requirement_unlock",
    unlock: "requirement_unlock",
    version: "versioning",
    negative: "negative_source_detail",
    negative_name: "negative_name_only",
    empty: "empty_unknown",
  };

  const POSITIVE_FIXTURES = {
    resource_node: {
      node_type: "crystal_node",
      acquisition_sources: [{
        acquisition_method: "mining",
        source_type: "mining",
        source_detail: "local preview node",
      }],
      node_observations: [{ node_type: "crystal_node", biome_context: "cave" }],
    },
    observation_context: {
      observation_context: {
        coordinates: { x: 10, y: 20, z: 0, system: "map" },
        location_ref: "Local Preview Cave",
        biome_context: "cave",
        time_condition: "nighttime",
        weather_condition: "rain",
      },
    },
    creature_encounter: {
      behavior: "hostile",
      encounter_type: "rare_spawn",
      spawn_context: "time_based",
      drop_context: "rare",
      weakness: ["fire"],
      resistance: ["poison"],
    },
    requirement_unlock: {
      required_level: 10,
      profession_level: 5,
      faction_req: "Local Preview Faction",
      unlock_type: "recipe_unlock",
      access_state: "conditional",
    },
    versioning: {
      game_version: "1.0",
      valid_from: "1.0",
      valid_until: "1.2",
      introduced_in: "1.0",
      changed_in: "1.1",
    },
  };

  const NEGATIVE_FIXTURES = {
    negative_source_detail: {
      source_detail: "red crystal nodes",
    },
    negative_name_only: {
      title: "QA Staff of Fire",
      description: "Name-only negative preview fixture",
    },
    empty_unknown: {
      node_type: "",
      required_level: "",
      weather_condition: "",
    },
  };

  const PREVIEW_CONTEXT_FIELDS = [
    "entity_domain", "entity_subtype", "active_model", "lifecycle_state",
    "objectives", "rewards", "event_type", "occurrence_state", "npc_services",
    "trade_offers", "prices", "currency", "availability", "stock_state", "vendor_services",
    "game_version", "valid_from", "valid_until", "introduced_in", "changed_in", "removed_in", "superseded_by",
    "node_type", "acquisition_sources", "node_observations", "source_detail",
    "coordinates", "location_ref", "biome_context", "time_condition", "weather_condition",
    "observation_context", "observation",
    "behavior", "encounter_type", "spawn_context", "drop_context", "combat_affinities", "weakness", "resistance",
    "requirements", "required_level", "profession_level", "faction_req", "unlock_type", "access_state", "unlocks",
  ];

  function stripPreviewContextFields(payload) {
    const src = payload && typeof payload === "object" ? payload : {};
    const clean = Object.assign({}, src);
    PREVIEW_CONTEXT_FIELDS.forEach(function(field) {
      delete clean[field];
    });
    return clean;
  }

  function slugKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isLocalhost() {
    try {
      const host = String(window.location && window.location.hostname || "").toLowerCase();
      return host === "localhost";
    } catch (err) {
      return false;
    }
  }

  function getPreviewQueryParam() {
    return PREVIEW_QUERY_PARAM;
  }

  function readQueryPreviewMode() {
    try {
      const params = new URLSearchParams(window.location.search || "");
      return params.get(PREVIEW_QUERY_PARAM);
    } catch (err) {
      return null;
    }
  }

  function normalizePreviewMode(value) {
    const raw = slugKey(value);
    if (!raw || raw === "off") return "off";
    if (PREVIEW_MODES.includes(raw)) return raw;
    if (MODE_ALIASES[raw]) return MODE_ALIASES[raw];
    return "off";
  }

  function getActivePreviewMode() {
    if (!isPreviewAllowed()) return "off";
    return normalizePreviewMode(readQueryPreviewMode());
  }

  function isPreviewModeEnabled(mode) {
    const normalized = normalizePreviewMode(mode);
    return normalized !== "off" && PREVIEW_MODES.includes(normalized);
  }

  function isPreviewAllowed() {
    if (!isLocalhost()) return false;
    const raw = readQueryPreviewMode();
    if (raw == null || raw === "") return false;
    const mode = normalizePreviewMode(raw);
    return mode !== "off";
  }

  function isPreviewActive() {
    return isPreviewAllowed() && getActivePreviewMode() !== "off";
  }

  function buildAllFixture() {
    const out = {};
    Object.keys(POSITIVE_FIXTURES).forEach(function(key) {
      const fixture = POSITIVE_FIXTURES[key];
      if (fixture && typeof fixture === "object") {
        Object.keys(fixture).forEach(function(field) {
          out[field] = fixture[field];
        });
      }
    });
    return out;
  }

  function getPreviewFixture(mode) {
    const normalized = normalizePreviewMode(mode);
    if (normalized === "off") return null;
    if (normalized === "all") return buildAllFixture();
    if (POSITIVE_FIXTURES[normalized]) {
      return Object.assign({}, POSITIVE_FIXTURES[normalized]);
    }
    if (NEGATIVE_FIXTURES[normalized]) {
      return Object.assign({}, NEGATIVE_FIXTURES[normalized]);
    }
    return null;
  }

  function listPreviewModes() {
    return PREVIEW_MODES.slice();
  }

  function clonePreviewEntry(entry) {
    const e = entry && typeof entry === "object" ? entry : {};
    const meta = e.meta && typeof e.meta === "object" ? Object.assign({}, e.meta) : {};
    const post = e.post && typeof e.post === "object" ? Object.assign({}, e.post) : {};
    const payload = e.discovery_payload && typeof e.discovery_payload === "object"
      ? Object.assign({}, e.discovery_payload)
      : (e.payload && typeof e.payload === "object" ? Object.assign({}, e.payload) : {});
    return {
      meta: meta,
      post: post,
      discovery_payload: payload,
      title: e.title || post.title || "",
    };
  }

  function mergePreviewContext(entry, previewContext) {
    const base = clonePreviewEntry(entry);
    const overlay = previewContext && typeof previewContext === "object" ? previewContext : {};
    Object.keys(overlay).forEach(function(key) {
      if (key === "meta" || key === "post" || key === "discovery_payload") return;
      base.discovery_payload[key] = overlay[key];
    });
    return base;
  }

  function resolvePreviewEntry(entry) {
    if (!isPreviewActive()) return clonePreviewEntry(entry);
    const fixture = getPreviewFixture(getActivePreviewMode());
    if (!fixture) return clonePreviewEntry(entry);
    const base = clonePreviewEntry(entry);
    base.meta = stripPreviewContextFields(base.meta);
    base.discovery_payload = stripPreviewContextFields(base.discovery_payload);
    return mergePreviewContext(base, fixture);
  }

  function getPreviewDiagnostics(entry) {
    const mode = getActivePreviewMode();
    const resolved = resolvePreviewEntry(entry);
    let renderable = false;
    if (typeof BoundLoreContextSectionRenderer !== "undefined" &&
        BoundLoreContextSectionRenderer.shouldRenderAnyContext) {
      try {
        renderable = BoundLoreContextSectionRenderer.shouldRenderAnyContext(resolved);
      } catch (err) {
        renderable = false;
      }
    }
    return {
      active: isPreviewActive(),
      allowed: isPreviewAllowed(),
      localhost: isLocalhost(),
      mode: mode,
      query_param: PREVIEW_QUERY_PARAM,
      renderable: renderable,
      policy: PREVIEW_POLICY.slice(),
    };
  }

  function shouldShowPreviewBanner() {
    return isPreviewActive();
  }

  function renderPreviewBanner(mode, diagnostics) {
    if (!shouldShowPreviewBanner()) return "";
    const normalized = normalizePreviewMode(mode || getActivePreviewMode());
    const diag = diagnostics && typeof diagnostics === "object" ? diagnostics : {};
    let html = '<div class="bl-p3-preview-banner" data-preview-mode="' +
      escapeHtml(normalized) + '">';
    html += '<p class="bl-p3-preview-note"><strong>Local QA Preview</strong> — synthetic read-only context, not saved</p>';
    html += '<p class="bl-p3-preview-note">Mode: ' + escapeHtml(normalized) +
      (diag.renderable ? " · sections renderable" : " · no sections rendered") + "</p>";
    html += "</div>";
    return html;
  }

  function renderPreviewBannerInto(container, mode, diagnostics) {
    if (!container) return false;
    const html = renderPreviewBanner(mode, diagnostics);
    if (!html) return false;
    container.insertAdjacentHTML("beforeend", html);
    return true;
  }

  return {
    PREVIEW_QUERY_PARAM: PREVIEW_QUERY_PARAM,
    PREVIEW_MODES: PREVIEW_MODES,
    PREVIEW_POLICY: PREVIEW_POLICY,
    isLocalhost: isLocalhost,
    getPreviewQueryParam: getPreviewQueryParam,
    normalizePreviewMode: normalizePreviewMode,
    isPreviewModeEnabled: isPreviewModeEnabled,
    isPreviewAllowed: isPreviewAllowed,
    isPreviewActive: isPreviewActive,
    getActivePreviewMode: getActivePreviewMode,
    getPreviewFixture: getPreviewFixture,
    listPreviewModes: listPreviewModes,
    clonePreviewEntry: clonePreviewEntry,
    mergePreviewContext: mergePreviewContext,
    resolvePreviewEntry: resolvePreviewEntry,
    getPreviewDiagnostics: getPreviewDiagnostics,
    shouldShowPreviewBanner: shouldShowPreviewBanner,
    renderPreviewBanner: renderPreviewBanner,
    renderPreviewBannerInto: renderPreviewBannerInto,
  };
})();
