// ============================================
// BoundLore Context Preview Adapter
// P3-C.1 — localhost + query-param opt-in read-only detail preview overlay.
// P3-E.1 — production guard safety helpers (exact localhost + query only).
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

  function getAllowedPreviewHostname() {
    return "localhost";
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

  function isAllowedPreviewHostname(hostname) {
    return normalizeHostname(hostname) === getAllowedPreviewHostname();
  }

  function parseLocationLike(locationLike) {
    const loc = locationLike && typeof locationLike === "object" ? locationLike : {};
    return {
      hostname: normalizeHostname(loc.hostname != null ? loc.hostname : ""),
      search: loc.search != null ? String(loc.search) : "",
    };
  }

  function readPreviewParamFromSearch(search) {
    try {
      const s = String(search || "");
      const query = s.charAt(0) === "?" ? s.slice(1) : s;
      if (!query) return null;
      return new URLSearchParams(query).get(PREVIEW_QUERY_PARAM);
    } catch (err) {
      return null;
    }
  }

  function isQueryParamPresentForSearch(search) {
    const raw = readPreviewParamFromSearch(search);
    return raw != null && raw !== "";
  }

  function getPreviewModeFromSearch(search) {
    const raw = readPreviewParamFromSearch(search);
    if (raw == null || raw === "") return "off";
    return normalizePreviewMode(raw);
  }

  function getPreviewGuardReason(parsed, mode, rawParam) {
    if (!isAllowedPreviewHostname(parsed.hostname)) {
      return "blocked_hostname";
    }
    if (!isQueryParamPresentForSearch(parsed.search)) {
      return "missing_query_param";
    }
    if (rawParam != null && rawParam !== "" && mode === "off") {
      const normalizedRaw = slugKey(rawParam);
      if (normalizedRaw === "off") return "mode_off";
      return "unknown_mode";
    }
    if (mode === "off") return "mode_off";
    return "allowed";
  }

  function isPreviewAllowedForLocation(locationLike) {
    const parsed = parseLocationLike(locationLike);
    if (!isAllowedPreviewHostname(parsed.hostname)) return false;
    const rawParam = readPreviewParamFromSearch(parsed.search);
    if (rawParam == null || rawParam === "") return false;
    return normalizePreviewMode(rawParam) !== "off";
  }

  function isPreviewActiveForLocation(locationLike) {
    return isPreviewAllowedForLocation(locationLike);
  }

  function getActivePreviewModeForLocation(locationLike) {
    if (!isPreviewAllowedForLocation(locationLike)) return "off";
    return getPreviewModeFromSearch(parseLocationLike(locationLike).search);
  }

  function getPreviewGuardDiagnostics(locationLike) {
    const parsed = parseLocationLike(locationLike);
    const rawParam = readPreviewParamFromSearch(parsed.search);
    const mode = getActivePreviewModeForLocation(locationLike);
    return {
      hostname: parsed.hostname,
      search: parsed.search,
      mode: mode,
      isAllowedHostname: isAllowedPreviewHostname(parsed.hostname),
      isQueryParamPresent: isQueryParamPresentForSearch(parsed.search),
      isPreviewAllowed: isPreviewAllowedForLocation(locationLike),
      isPreviewActive: isPreviewActiveForLocation(locationLike),
      reason: getPreviewGuardReason(parsed, mode, rawParam),
    };
  }

  function isLocalhost() {
    try {
      return isAllowedPreviewHostname(window.location && window.location.hostname);
    } catch (err) {
      return false;
    }
  }

  function getPreviewQueryParam() {
    return PREVIEW_QUERY_PARAM;
  }

  function readQueryPreviewMode() {
    try {
      return readPreviewParamFromSearch(window.location.search || "");
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
    try {
      return getActivePreviewModeForLocation(window.location);
    } catch (err) {
      return "off";
    }
  }

  function isPreviewModeEnabled(mode) {
    const normalized = normalizePreviewMode(mode);
    return normalized !== "off" && PREVIEW_MODES.includes(normalized);
  }

  function isPreviewAllowed() {
    try {
      return isPreviewAllowedForLocation(window.location);
    } catch (err) {
      return false;
    }
  }

  function isPreviewActive() {
    try {
      return isPreviewActiveForLocation(window.location);
    } catch (err) {
      return false;
    }
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
    const guard = getPreviewGuardDiagnostics(
      typeof window !== "undefined" ? window.location : {}
    );
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
      active: guard.isPreviewActive,
      allowed: guard.isPreviewAllowed,
      localhost: guard.isAllowedHostname,
      mode: guard.mode,
      query_param: PREVIEW_QUERY_PARAM,
      renderable: renderable,
      policy: PREVIEW_POLICY.slice(),
      guard: guard,
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
    getAllowedPreviewHostname: getAllowedPreviewHostname,
    normalizeHostname: normalizeHostname,
    isAllowedPreviewHostname: isAllowedPreviewHostname,
    getPreviewModeFromSearch: getPreviewModeFromSearch,
    isPreviewAllowedForLocation: isPreviewAllowedForLocation,
    isPreviewActiveForLocation: isPreviewActiveForLocation,
    getActivePreviewModeForLocation: getActivePreviewModeForLocation,
    getPreviewGuardDiagnostics: getPreviewGuardDiagnostics,
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
