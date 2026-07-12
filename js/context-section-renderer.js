// ============================================
// BoundLore Context Section Renderer
// P3-A.1 — read-only P2 context sections for detail pages (explicit fields only).
// No buttons, no forms, no admin/create flows, no data writes, no inference.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreContextSectionRenderer = (function() {
  const CONTEXT_SECTION_TYPES = [
    "model_identity", "quest_event", "economy", "versioning", "resource_node",
    "observation_context", "creature_encounter", "requirement_unlock", "unknown",
  ];

  const CONTEXT_RENDER_MODES = ["read_only", "preview", "hidden"];

  const CONTEXT_RENDER_POLICY = [
    "explicit_only", "no_unknown", "no_actions", "no_post_promotion",
    "no_empty_sections", "no_inference",
  ];

  const CONTEXT_RENDER_FIELDS = {
    model_identity: ["entity_domain", "entity_subtype", "active_model", "lifecycle_state"],
    quest_event: ["objectives", "rewards", "event_type", "occurrence_state", "npc_services"],
    economy: ["trade_offers", "prices", "currency", "availability", "stock_state", "vendor_services"],
    versioning: [
      "game_version", "valid_from", "valid_until", "introduced_in", "changed_in",
      "removed_in", "superseded_by",
    ],
    resource_node: ["node_type", "acquisition_sources", "node_observations"],
    observation_context: [
      "coordinates", "location_ref", "biome_context", "time_condition", "weather_condition",
    ],
    creature_encounter: [
      "behavior", "encounter_type", "spawn_context", "drop_context", "combat_affinities",
      "weakness", "resistance",
    ],
    requirement_unlock: [
      "requirements", "required_level", "profession_level", "faction_req",
      "unlock_type", "access_state",
    ],
  };

  const SECTION_ALIASES = {
    quest: "quest_event",
    event: "quest_event",
    npc: "quest_event",
    resource: "resource_node",
    observation: "observation_context",
    creature: "creature_encounter",
    requirement: "requirement_unlock",
    unlock: "requirement_unlock",
  };

  const SECTION_LABELS = {
    model_identity: "Model Identity",
    quest_event: "Quest & Event",
    economy: "Economy",
    versioning: "Version History",
    resource_node: "Resource Node",
    observation_context: "Observation Context",
    creature_encounter: "Creature Encounter",
    requirement_unlock: "Requirements & Unlocks",
    unknown: "Context",
  };

  const SECTION_DESCRIPTIONS = {
    model_identity: "Structured content model identity (explicit fields only).",
    quest_event: "Quest objectives, rewards, events, and NPC services.",
    economy: "Trade offers, pricing, and vendor context.",
    versioning: "Game version validity and lifecycle metadata.",
    resource_node: "Explicit node type and acquisition observations.",
    observation_context: "Location, coordinates, and environmental conditions.",
    creature_encounter: "Encounter, spawn, drop, and combat affinity context.",
    requirement_unlock: "Requirements, unlocks, and access state.",
    unknown: "Structured context.",
  };

  const DEFAULT_OPTIONS = {
    mode: "read_only",
    policy: "explicit_only",
  };

  function slugKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function meaningful(value) {
    if (value == null) return "";
    const s = String(value).trim();
    return s;
  }

  function normalizeArrayField(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.filter(function(v) { return v != null && v !== ""; });
    return [value];
  }

  function getExplicitPayload(entry) {
    const e = entry && typeof entry === "object" ? entry : {};
    const meta = e.meta && typeof e.meta === "object" ? e.meta : {};
    const payload = e.discovery_payload && typeof e.discovery_payload === "object"
      ? e.discovery_payload
      : (e.payload && typeof e.payload === "object"
        ? e.payload
        : (meta.discovery_payload && typeof meta.discovery_payload === "object"
          ? meta.discovery_payload
          : (Object.keys(meta).length ? {} : e)));
    const post = e.post && typeof e.post === "object" ? e.post : {};
    return { meta: meta, payload: payload, post: post };
  }

  function readExplicitField(entry, field) {
    const parts = getExplicitPayload(entry);
    if (parts.payload[field] != null && parts.payload[field] !== "") return parts.payload[field];
    if (parts.meta[field] != null && parts.meta[field] !== "") return parts.meta[field];
    return null;
  }

  function normalizeEntry(entry) {
    const parts = getExplicitPayload(entry);
    return {
      meta: parts.meta,
      post: parts.post,
      discovery_payload: parts.payload,
      title: parts.post.title || entry.title || "",
    };
  }

  function normalizeContextSectionType(value) {
    const raw = slugKey(value);
    if (!raw) return "unknown";
    if (CONTEXT_SECTION_TYPES.includes(raw)) return raw;
    if (SECTION_ALIASES[raw]) return SECTION_ALIASES[raw];
    return "unknown";
  }

  function normalizeContextRenderMode(value) {
    const raw = slugKey(value);
    if (CONTEXT_RENDER_MODES.includes(raw)) return raw;
    return "read_only";
  }

  function normalizeContextRenderPolicy(value) {
    const raw = slugKey(value);
    if (CONTEXT_RENDER_POLICY.includes(raw)) return raw;
    return "explicit_only";
  }

  function escapeContextHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function(ch) { return ch.toUpperCase(); });
  }

  function getContextSectionLabel(sectionType) {
    const kind = normalizeContextSectionType(sectionType);
    return SECTION_LABELS[kind] || "";
  }

  function getContextSectionDescription(sectionType) {
    const kind = normalizeContextSectionType(sectionType);
    return SECTION_DESCRIPTIONS[kind] || "";
  }

  function formatDisplayValue(value) {
    if (value == null || value === "") return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      const s = String(value).trim();
      if (!s || s === "unknown") return "";
      return s;
    }
    if (Array.isArray(value)) {
      const parts = value.map(formatDisplayValue).filter(Boolean);
      return parts.join(", ");
    }
    if (typeof value === "object") {
      if (value.x != null && value.y != null) {
        return String(value.x) + ", " + String(value.y);
      }
      if (value.target != null && meaningful(value.target)) {
        return String(value.target).trim();
      }
      if (value.value != null && meaningful(value.value)) {
        return String(value.value).trim();
      }
      const parts = [];
      Object.keys(value).forEach(function(key) {
        if (key === "meta" || key === "post" || key === "discovery_payload") return;
        const formatted = formatDisplayValue(value[key]);
        if (formatted) parts.push(titleCase(key) + ": " + formatted);
      });
      return parts.join(" · ");
    }
    return "";
  }

  function hasExplicitModelIdentityContext(entry) {
    return !!meaningful(readExplicitField(entry, "lifecycle_state"));
  }

  function hasStructuredArray(field, entry) {
    const list = normalizeArrayField(readExplicitField(entry, field));
    return list.length > 0;
  }

  function hasExplicitQuestEventContext(entry) {
    const fields = ["objectives", "rewards", "npc_services", "services", "prerequisites"];
    for (let i = 0; i < fields.length; i += 1) {
      if (hasStructuredArray(fields[i], entry)) return true;
    }
    const eventType = meaningful(readExplicitField(entry, "event_type"));
    if (eventType && slugKey(eventType) !== "unknown") return true;
    const occurrence = meaningful(readExplicitField(entry, "occurrence_state"));
    if (occurrence && slugKey(occurrence) !== "unknown") return true;
    return false;
  }

  function hasExplicitEconomyContext(entry) {
    const fields = [
      "trade_offers", "prices", "currency", "availability", "stock_state",
      "vendor_services", "vendor_inventory",
    ];
    for (let i = 0; i < fields.length; i += 1) {
      if (hasStructuredArray(fields[i], entry)) return true;
      const scalar = readExplicitField(entry, fields[i]);
      if (scalar != null && scalar !== "" && typeof scalar !== "object") {
        const s = meaningful(scalar);
        if (s && slugKey(s) !== "unknown") return true;
      }
    }
    return false;
  }

  function hasExplicitVersioningContext(entry) {
    const parts = getExplicitPayload(entry);
    if (typeof BoundLoreVersioning !== "undefined" && BoundLoreVersioning.hasVersionSignals) {
      if (BoundLoreVersioning.hasVersionSignals(parts.payload)) return true;
      if (BoundLoreVersioning.hasVersionSignals(parts.meta)) return true;
    }
    const fields = CONTEXT_RENDER_FIELDS.versioning;
    for (let i = 0; i < fields.length; i += 1) {
      const val = readExplicitField(entry, fields[i]);
      if (val != null && val !== "" && meaningful(String(val))) return true;
    }
    return false;
  }

  function hasExplicitResourceNodeContext(entry) {
    const parts = getExplicitPayload(entry);
    const explicitSource = { meta: parts.meta, discovery_payload: parts.payload };
    if (typeof BoundLoreResourceNodeRegistry !== "undefined" &&
        BoundLoreResourceNodeRegistry.hasExplicitNodeType) {
      if (BoundLoreResourceNodeRegistry.hasExplicitNodeType(explicitSource)) return true;
    }
    if (hasStructuredArray("node_observations", entry)) return true;
    const sources = normalizeArrayField(readExplicitField(entry, "acquisition_sources"));
    for (let i = 0; i < sources.length; i += 1) {
      const item = sources[i];
      if (!item || typeof item !== "object") continue;
      if (item.node_type || item.node_observation) return true;
    }
    return false;
  }

  function readObservationBlock(entry) {
    const parts = getExplicitPayload(entry);
    const block = parts.payload.observation_context || parts.payload.observation ||
      parts.meta.observation_context || parts.meta.observation;
    return block && typeof block === "object" ? block : null;
  }

  function hasExplicitObservationContext(entry) {
    const block = readObservationBlock(entry);
    if (block) {
      const conditionFields = ["coordinates", "location_ref", "biome_context", "time_condition", "weather_condition"];
      for (let i = 0; i < conditionFields.length; i += 1) {
        const val = block[conditionFields[i]];
        if (val == null || val === "") continue;
        if (conditionFields[i] === "coordinates") {
          if (typeof BoundLoreObservationContextRegistry !== "undefined" &&
              BoundLoreObservationContextRegistry.hasExplicitCoordinates({ coordinates: val })) {
            return true;
          }
          continue;
        }
        if (meaningful(String(val)) && slugKey(String(val)) !== "unknown") return true;
      }
    }
    const parts = getExplicitPayload(entry);
    const explicitSource = { meta: parts.meta, discovery_payload: parts.payload };
    if (typeof BoundLoreObservationContextRegistry !== "undefined") {
      const OC = BoundLoreObservationContextRegistry;
      if (OC.hasExplicitCoordinates && OC.hasExplicitCoordinates(explicitSource)) return true;
      if (OC.hasExplicitLocationRef && OC.hasExplicitLocationRef(explicitSource)) return true;
    }
    return false;
  }

  function hasExplicitCreatureEncounterContext(entry) {
    const parts = getExplicitPayload(entry);
    const explicitSource = { meta: parts.meta, discovery_payload: parts.payload };
    if (typeof BoundLoreCreatureEncounterRegistry !== "undefined") {
      const CE = BoundLoreCreatureEncounterRegistry;
      if (CE.hasExplicitCreatureBehavior && CE.hasExplicitCreatureBehavior(explicitSource)) return true;
      if (CE.hasExplicitSpawnContext && CE.hasExplicitSpawnContext(explicitSource)) return true;
      if (CE.hasExplicitDropContext && CE.hasExplicitDropContext(explicitSource)) return true;
      if (CE.hasExplicitCombatAffinity && CE.hasExplicitCombatAffinity(explicitSource)) return true;
    }
    const encounterType = readExplicitField(entry, "encounter_type");
    if (encounterType != null && encounterType !== "" && slugKey(String(encounterType)) !== "unknown") {
      return true;
    }
    return false;
  }

  function hasExplicitRequirementUnlockContext(entry) {
    if (hasStructuredArray("requirements", entry)) return true;
    if (hasStructuredArray("unlocks", entry)) return true;
    const scalarFields = [
      "required_level", "profession_level", "faction_req", "unlock_type", "access_state",
    ];
    for (let i = 0; i < scalarFields.length; i += 1) {
      const val = readExplicitField(entry, scalarFields[i]);
      if (val == null || val === "") continue;
      if (scalarFields[i] === "required_level" || scalarFields[i] === "profession_level") {
        if (!isNaN(Number(val))) return true;
        continue;
      }
      if (meaningful(String(val)) && slugKey(String(val)) !== "unknown") return true;
    }
    return false;
  }

  const EXPLICIT_CHECKERS = {
    model_identity: hasExplicitModelIdentityContext,
    quest_event: hasExplicitQuestEventContext,
    economy: hasExplicitEconomyContext,
    versioning: hasExplicitVersioningContext,
    resource_node: hasExplicitResourceNodeContext,
    observation_context: hasExplicitObservationContext,
    creature_encounter: hasExplicitCreatureEncounterContext,
    requirement_unlock: hasExplicitRequirementUnlockContext,
  };

  function shouldRenderContextActions(sectionType, entry, options) {
    void sectionType;
    void entry;
    void options;
    return false;
  }

  function shouldPromoteContextToPost(sectionType, entry, options) {
    void sectionType;
    void entry;
    void options;
    return false;
  }

  function shouldRenderContextSection(sectionType, entry, options) {
    const kind = normalizeContextSectionType(sectionType);
    if (!kind || kind === "unknown") return false;
    const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    if (opts.mode === "hidden") return false;
    const checker = EXPLICIT_CHECKERS[kind];
    if (!checker) return false;
    try {
      return checker(entry);
    } catch (err) {
      return false;
    }
  }

  function hasRenderableP2Context(entry, options) {
    return shouldRenderAnyContext(entry, options);
  }

  function shouldRenderAnyContext(entry, options) {
    return collectRenderableContextSections(entry, options).length > 0;
  }

  function collectRenderableContextSections(entry, options) {
    const out = [];
    CONTEXT_SECTION_TYPES.forEach(function(sectionType) {
      if (sectionType === "unknown") return;
      if (shouldRenderContextSection(sectionType, entry, options)) {
        out.push(sectionType);
      }
    });
    return out;
  }

  function getContextRenderDiagnostics(entry) {
    const normalized = normalizeEntry(entry);
    const sections = collectRenderableContextSections(entry);
    return {
      sections: sections,
      renderable: sections.length > 0,
      explicit_checks: CONTEXT_SECTION_TYPES.filter(function(t) {
        return t !== "unknown";
      }).reduce(function(acc, type) {
        const checker = EXPLICIT_CHECKERS[type];
        acc[type] = checker ? !!checker(entry) : false;
        return acc;
      }, {}),
      has_source_detail_only: !!(
        meaningful(readExplicitField(normalized, "source_detail")) &&
        !hasExplicitResourceNodeContext(normalized)
      ),
      title: normalized.title || "",
    };
  }

  function renderContextValue(label, value, options) {
    void options;
    const display = formatDisplayValue(value);
    if (!display) return "";
    return '<div class="bl-p3-context-row">' +
      '<dt class="bl-p3-context-label">' + escapeContextHtml(label) + "</dt>" +
      '<dd class="bl-p3-context-value">' + escapeContextHtml(display) + "</dd>" +
      "</div>";
  }

  function collectSectionRows(sectionType, entry) {
    const kind = normalizeContextSectionType(sectionType);
    const fields = CONTEXT_RENDER_FIELDS[kind] || [];
    const rows = [];

    if (kind !== "observation_context") {
      fields.forEach(function(field) {
        const raw = readExplicitField(entry, field);
        if (raw == null || raw === "") return;
        if (field === "source_detail") return;
        const display = formatDisplayValue(raw);
        if (!display) return;
        rows.push({ label: titleCase(field.replace(/_/g, " ")), value: raw, html: display });
      });
    }

    if (kind === "observation_context") {
      const block = readObservationBlock(entry);
      const rootFields = ["coordinates", "location_ref"];
      rootFields.forEach(function(field) {
        const raw = readExplicitField(entry, field);
        if (raw == null || raw === "") return;
        const display = formatDisplayValue(raw);
        if (display) rows.push({ label: titleCase(field.replace(/_/g, " ")), value: raw, html: display });
      });
      if (block) {
        ["biome_context", "time_condition", "weather_condition", "coordinates", "location_ref"].forEach(function(field) {
          const raw = block[field];
          if (raw == null || raw === "") return;
          const display = formatDisplayValue(raw);
          if (display) rows.push({ label: titleCase(field.replace(/_/g, " ")), value: raw, html: display });
        });
      }
    }

    if (kind === "requirement_unlock") {
      const reqs = normalizeArrayField(readExplicitField(entry, "requirements"));
      reqs.forEach(function(req, index) {
        const formatted = formatDisplayValue(req);
        if (formatted) {
          rows.push({ label: "Requirement " + (index + 1), value: req, html: formatted });
        }
      });
    }

    if (kind === "versioning" && typeof BoundLoreVersioning !== "undefined" &&
        BoundLoreVersioning.resolveVersionContext) {
      const parts = getExplicitPayload(entry);
      const ctx = BoundLoreVersioning.resolveVersionContext({
        meta: parts.meta,
        discovery_payload: parts.payload,
      });
      if (ctx && ctx.summary && !rows.length) {
        rows.push({ label: "Version Summary", value: ctx.summary, html: ctx.summary });
      }
    }

    return rows.filter(function(row) {
      return row && row.html;
    });
  }

  function renderContextSection(sectionType, entry, options) {
    if (!shouldRenderContextSection(sectionType, entry, options)) return "";
    const kind = normalizeContextSectionType(sectionType);
    const rows = collectSectionRows(kind, entry);
    if (!rows.length) return "";

    let html = '<section class="bl-p3-context-section" data-context-section="' +
      escapeContextHtml(kind) + '">';
    html += '<h3 class="bl-p3-context-title">' + escapeContextHtml(getContextSectionLabel(kind)) + "</h3>";
    const desc = getContextSectionDescription(kind);
    if (desc) {
      html += '<p class="bl-p3-context-desc">' + escapeContextHtml(desc) + "</p>";
    }
    html += '<dl class="bl-p3-context">';
    rows.forEach(function(row) {
      html += renderContextValue(row.label, row.value, options);
    });
    html += "</dl></section>";
    return html;
  }

  function renderContextSections(entry, options) {
    const opts = Object.assign({}, DEFAULT_OPTIONS, options || {});
    if (opts.mode === "hidden") return "";
    const sections = collectRenderableContextSections(entry, opts);
    if (!sections.length) return "";

    let html = '<div class="bl-p3-context bl-p3-context-readonly">';
    sections.forEach(function(sectionType) {
      html += renderContextSection(sectionType, entry, opts);
    });
    html += "</div>";
    return html;
  }

  function renderContextSectionsInto(container, entry, options) {
    if (!container) return false;
    const html = renderContextSections(entry, options);
    if (!html) return false;
    container.insertAdjacentHTML("beforeend", html);
    return true;
  }

  return {
    CONTEXT_SECTION_TYPES: CONTEXT_SECTION_TYPES,
    CONTEXT_RENDER_MODES: CONTEXT_RENDER_MODES,
    CONTEXT_RENDER_POLICY: CONTEXT_RENDER_POLICY,
    CONTEXT_RENDER_FIELDS: CONTEXT_RENDER_FIELDS,
    normalizeContextSectionType: normalizeContextSectionType,
    normalizeContextRenderMode: normalizeContextRenderMode,
    normalizeContextRenderPolicy: normalizeContextRenderPolicy,
    escapeContextHtml: escapeContextHtml,
    getContextSectionLabel: getContextSectionLabel,
    getContextSectionDescription: getContextSectionDescription,
    hasExplicitModelIdentityContext: hasExplicitModelIdentityContext,
    hasExplicitQuestEventContext: hasExplicitQuestEventContext,
    hasExplicitEconomyContext: hasExplicitEconomyContext,
    hasExplicitVersioningContext: hasExplicitVersioningContext,
    hasExplicitResourceNodeContext: hasExplicitResourceNodeContext,
    hasExplicitObservationContext: hasExplicitObservationContext,
    hasExplicitCreatureEncounterContext: hasExplicitCreatureEncounterContext,
    hasExplicitRequirementUnlockContext: hasExplicitRequirementUnlockContext,
    hasRenderableP2Context: hasRenderableP2Context,
    collectRenderableContextSections: collectRenderableContextSections,
    getContextRenderDiagnostics: getContextRenderDiagnostics,
    renderContextValue: renderContextValue,
    renderContextSection: renderContextSection,
    renderContextSections: renderContextSections,
    renderContextSectionsInto: renderContextSectionsInto,
    shouldRenderContextSection: shouldRenderContextSection,
    shouldRenderAnyContext: shouldRenderAnyContext,
    shouldRenderContextActions: shouldRenderContextActions,
    shouldPromoteContextToPost: shouldPromoteContextToPost,
  };
})();
