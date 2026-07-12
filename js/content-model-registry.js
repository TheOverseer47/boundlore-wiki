// ============================================
// BoundLore Content Model Registry
// P2-A.1 — NPC / Quest / Event model activation baseline.
// Future-safe typing only — no create UI, no admin flows, no DB.
//
// NPC  = BEING / npc
// Quest = KNOWLEDGE / quest
// Event = EVENT / event
// No new top-level domains. See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreContentModelRegistry = (function() {
  const MODEL_STATUS = {
    ACTIVE: "active_model",
    RESERVED: "reserved_model",
  };

  const NPC_FIELDS = [
    "faction", "roles", "capabilities", "location_refs", "dialogue_refs",
    "vendor_inventory", "trainer_for", "quest_refs", "schedule", "evidence", "versioning",
  ];

  const QUEST_FIELDS = [
    "quest_giver", "objectives", "prerequisites", "rewards", "required_level",
    "faction_req", "starts_from", "ends_at", "related_events", "evidence", "versioning",
  ];

  const EVENT_FIELDS = [
    "event_type", "starts_at", "ends_at", "recurrence", "location_refs",
    "participants", "rewards", "related_quests", "versioning", "evidence",
  ];

  const MODEL_DEFINITIONS = {
    "BEING:npc": {
      key: "BEING:npc",
      domain: "BEING",
      subtype: "npc",
      label: "NPC",
      status: MODEL_STATUS.ACTIVE,
      create_ui: false,
      admin_flow: false,
      fields: NPC_FIELDS.slice(),
      search_weight: 2,
      notes: "Non-player characters remain BEING/npc — not a top-level domain.",
    },
    "KNOWLEDGE:quest": {
      key: "KNOWLEDGE:quest",
      domain: "KNOWLEDGE",
      subtype: "quest",
      label: "Quest",
      status: MODEL_STATUS.ACTIVE,
      create_ui: false,
      admin_flow: false,
      fields: QUEST_FIELDS.slice(),
      search_weight: 2,
      notes: "Quest entries use KNOWLEDGE/quest — not a top-level browse area.",
    },
    "EVENT:event": {
      key: "EVENT:event",
      domain: "EVENT",
      subtype: "event",
      label: "Event",
      status: MODEL_STATUS.ACTIVE,
      create_ui: false,
      admin_flow: false,
      fields: EVENT_FIELDS.slice(),
      search_weight: 2,
      notes: "World/community events use existing EVENT domain.",
    },
    "KNOWLEDGE:quest_chain": {
      key: "KNOWLEDGE:quest_chain",
      domain: "KNOWLEDGE",
      subtype: "quest_chain",
      label: "Quest Chain",
      status: MODEL_STATUS.RESERVED,
      create_ui: false,
      admin_flow: false,
      fields: QUEST_FIELDS.concat(["chain_order", "chain_id"]),
      search_weight: 1,
      notes: "Reserved — quest chain grouping deferred.",
    },
    "EVENT:community_event": {
      key: "EVENT:community_event",
      domain: "EVENT",
      subtype: "community_event",
      label: "Community Event",
      status: MODEL_STATUS.RESERVED,
      create_ui: false,
      admin_flow: false,
      fields: EVENT_FIELDS.slice(),
      search_weight: 1,
      notes: "Reserved — community event subtype deferred.",
    },
    "EVENT:occurrence": {
      key: "EVENT:occurrence",
      domain: "EVENT",
      subtype: "occurrence",
      label: "Event Occurrence",
      status: MODEL_STATUS.RESERVED,
      create_ui: false,
      admin_flow: false,
      fields: EVENT_FIELDS.concat(["parent_event_ref"]),
      search_weight: 1,
      notes: "Reserved — occurrence scheduling deferred.",
    },
  };

  const SUBTYPE_ALIASES = {
    npc: "npc",
    npcs: "npc",
    character: "npc",
    non_player_character: "npc",
    quest: "quest",
    quests: "quest",
    event: "event",
    events: "event",
    world_event: "event",
    quest_chain: "quest_chain",
    community_event: "community_event",
    occurrence: "occurrence",
  };

  const DOMAIN_ALIASES = {
    being: "BEING",
    knowledge: "KNOWLEDGE",
    event: "EVENT",
  };

  function meaningful(value) {
    const clean = String(value || "").trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    if (["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) {
      return "";
    }
    return clean;
  }

  function slugKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
      .trim();
  }

  function normalizeDomain(domain) {
    const raw = String(domain || "").trim();
    if (!raw) return "";
    const upper = raw.toUpperCase();
    if (MODEL_DEFINITIONS && Object.keys(MODEL_DEFINITIONS).some(function(key) {
      return key.indexOf(upper + ":") === 0;
    })) {
      return upper;
    }
    return DOMAIN_ALIASES[raw.toLowerCase()] || upper;
  }

  function normalizeSubtype(subtype) {
    const slug = slugKey(subtype);
    if (!slug) return "";
    return SUBTYPE_ALIASES[slug] || slug;
  }

  function normalizeContentModelKey(domain, subtype) {
    const d = normalizeDomain(domain);
    const s = normalizeSubtype(subtype);
    if (!d || !s) return "";
    return d + ":" + s;
  }

  function getContentModelDefinition(domain, subtype) {
    const key = normalizeContentModelKey(domain, subtype);
    if (!key || !MODEL_DEFINITIONS[key]) return null;
    return Object.assign({}, MODEL_DEFINITIONS[key]);
  }

  function getContentModelDefinitionByKey(key) {
    const raw = String(key || "").trim();
    if (!raw) return null;
    const normalizedKey = normalizeContentModelKey.apply(null, raw.split(":").length >= 2
      ? raw.split(":")
      : [raw, ""]);
    if (normalizedKey && MODEL_DEFINITIONS[normalizedKey]) {
      return Object.assign({}, MODEL_DEFINITIONS[normalizedKey]);
    }
    const parts = raw.split(":");
    if (parts.length >= 2) return getContentModelDefinition(parts[0], parts[1]);
    return null;
  }

  function listContentModels(options) {
    const opts = options || {};
    return Object.keys(MODEL_DEFINITIONS)
      .map(function(key) { return Object.assign({}, MODEL_DEFINITIONS[key]); })
      .filter(function(model) {
        if (opts.status && model.status !== opts.status) return false;
        if (opts.domain && normalizeDomain(opts.domain) !== model.domain) return false;
        if (opts.activeOnly && model.status !== MODEL_STATUS.ACTIVE) return false;
        return true;
      });
  }

  function listActiveP2Models() {
    return listContentModels({ status: MODEL_STATUS.ACTIVE });
  }

  function isP2ModelActive(domain, subtype) {
    const def = getContentModelDefinition(domain, subtype);
    return !!(def && def.status === MODEL_STATUS.ACTIVE);
  }

  function isCreateUiEnabled(domain, subtype) {
    const def = getContentModelDefinition(domain, subtype);
    return !!(def && def.create_ui === true);
  }

  function isAdminFlowEnabled(domain, subtype) {
    const def = getContentModelDefinition(domain, subtype);
    return !!(def && def.admin_flow === true);
  }

  function readField(source, field) {
    if (!source || !field) return undefined;
    if (Object.prototype.hasOwnProperty.call(source, field)) return source[field];
    const payload = source.discovery_payload && typeof source.discovery_payload === "object"
      ? source.discovery_payload
      : null;
    if (payload && Object.prototype.hasOwnProperty.call(payload, field)) return payload[field];
    const meta = source.meta && typeof source.meta === "object" ? source.meta : null;
    if (meta && Object.prototype.hasOwnProperty.call(meta, field)) return meta[field];
    if (meta && meta.discovery_payload && Object.prototype.hasOwnProperty.call(meta.discovery_payload, field)) {
      return meta.discovery_payload[field];
    }
    return undefined;
  }

  function normalizeArrayField(value) {
    if (value == null) return [];
    if (Array.isArray(value)) {
      return value.slice().map(function(entry) {
        if (entry == null) return null;
        if (typeof entry === "object") return Object.assign({}, entry);
        return meaningful(entry);
      }).filter(function(entry) {
        return entry != null && entry !== "";
      });
    }
    const single = meaningful(value);
    return single ? [single] : [];
  }

  function normalizeScalarField(value) {
    if (value == null) return null;
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.assign({}, value);
    }
    const clean = meaningful(value);
    return clean || null;
  }

  function normalizeFieldValue(field, value) {
    const arrayFields = [
      "roles", "capabilities", "location_refs", "dialogue_refs", "vendor_inventory",
      "trainer_for", "quest_refs", "objectives", "prerequisites", "rewards",
      "related_events", "participants", "related_quests",
    ];
    if (arrayFields.indexOf(field) >= 0) return normalizeArrayField(value);
    return normalizeScalarField(value);
  }

  function normalizeContentModelRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    const domain = normalizeDomain(source.entity_domain || source.domain);
    const subtype = normalizeSubtype(source.entity_subtype || source.subtype);
    const def = getContentModelDefinition(domain, subtype);
    const out = {
      entity_domain: domain || null,
      entity_subtype: subtype || null,
      model_key: normalizeContentModelKey(domain, subtype) || null,
      model_status: def ? def.status : null,
      model_label: def ? def.label : null,
      active_model: !!(def && def.status === MODEL_STATUS.ACTIVE),
      create_ui: def ? !!def.create_ui : false,
      admin_flow: def ? !!def.admin_flow : false,
      fields: {},
    };

    const fieldList = def && Array.isArray(def.fields) ? def.fields : [];
    fieldList.forEach(function(field) {
      const raw = readField(source, field);
      if (raw == null || raw === "") return;
      out.fields[field] = normalizeFieldValue(field, raw);
    });

    if (typeof BoundLoreQuestEventRegistry !== "undefined" && def && out.active_model) {
      try {
        if (def.key === "KNOWLEDGE:quest") {
          out.schema = BoundLoreQuestEventRegistry.normalizeQuestModelRecord(source);
        } else if (def.key === "EVENT:event" || def.key === "EVENT:occurrence") {
          out.schema = BoundLoreQuestEventRegistry.normalizeEventModelRecord(source);
        } else if (def.key === "BEING:npc") {
          out.schema = BoundLoreQuestEventRegistry.normalizeNpcModelRecord(source);
        }
      } catch (err) {
        /* schema enrichment optional */
      }
    }

    return out;
  }

  function getSupportedModelFields(domain, subtype) {
    const def = getContentModelDefinition(domain, subtype);
    if (!def || !Array.isArray(def.fields)) return [];
    return def.fields.slice();
  }

  function extractModelSignals(record) {
    const normalized = normalizeContentModelRecord(record);
    if (!normalized.active_model && !normalized.model_status) return [];
    const signals = [];
    if (normalized.model_label) {
      signals.push({
        kind: "model",
        field: "model_label",
        raw: normalized.model_label,
        label: normalized.model_label,
        displayable: normalized.active_model,
      });
    }
    Object.keys(normalized.fields || {}).forEach(function(field) {
      const value = normalized.fields[field];
      if (value == null) return;
      if (Array.isArray(value)) {
        value.forEach(function(entry, index) {
          if (entry == null || entry === "") return;
          const raw = typeof entry === "object"
            ? meaningful(entry.name || entry.title || entry.label || entry.ref || JSON.stringify(entry))
            : meaningful(entry);
          if (!raw) return;
          signals.push({
            kind: "model_field",
            field: field,
            raw: raw,
            label: titleCase(field),
            displayable: normalized.active_model,
            index: index,
          });
        });
        return;
      }
      const raw = typeof value === "object"
        ? meaningful(value.name || value.title || value.label || value.type || JSON.stringify(value))
        : meaningful(value);
      if (!raw) return;
      signals.push({
        kind: "model_field",
        field: field,
        raw: raw,
        label: titleCase(field),
        displayable: normalized.active_model,
      });
    });
    return signals;
  }

  function toSearchSignal(entry, model) {
    if (!entry || !entry.raw) return null;
    const weight = model && model.search_weight != null ? model.search_weight : 2;
    return {
      raw: entry.raw,
      normalized: slugKey(entry.raw).replace(/_/g, " "),
      kind: entry.field || entry.kind || "model",
      label: entry.label || entry.raw,
      group: "content_model",
      weight: weight,
      source: "content_model_registry",
    };
  }

  function getModelSearchSignals(record) {
    const domain = normalizeDomain(readField(record, "entity_domain"));
    const subtype = normalizeSubtype(readField(record, "entity_subtype"));
    const def = getContentModelDefinition(domain, subtype);
    if (!def || def.status !== MODEL_STATUS.ACTIVE) return [];
    try {
      return extractModelSignals(record)
        .filter(function(entry) { return entry.displayable; })
        .map(function(entry) { return toSearchSignal(entry, def); })
        .filter(Boolean);
    } catch (err) {
      return [];
    }
  }

  function getModelDisplayPolicy(domain, subtype) {
    const def = getContentModelDefinition(domain, subtype);
    if (!def) {
      return {
        renderSections: false,
        showBadges: false,
        showCreateActions: false,
        showAdminActions: false,
      };
    }
    return {
      renderSections: false,
      showBadges: false,
      showCreateActions: !!def.create_ui,
      showAdminActions: !!def.admin_flow,
      modelStatus: def.status,
      modelLabel: def.label,
    };
  }

  function shouldRenderModelSection(record, section) {
    if (!section) return false;
    const domain = normalizeDomain(readField(record, "entity_domain"));
    const subtype = normalizeSubtype(readField(record, "entity_subtype"));
    const policy = getModelDisplayPolicy(domain, subtype);
    if (!policy.renderSections) return false;
    if (!isP2ModelActive(domain, subtype)) return false;
    const fields = getSupportedModelFields(domain, subtype);
    if (fields.indexOf(section) < 0) return false;
    const value = readField(record, section);
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) return false;
    return true;
  }

  function getModelLabel(domain, subtype) {
    const def = getContentModelDefinition(domain, subtype);
    if (def && def.label) return def.label;
    const s = normalizeSubtype(subtype);
    return s ? titleCase(s) : "";
  }

  function resolveDomainSubtypeFromRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    let domain = normalizeDomain(source.entity_domain || source.domain);
    let subtype = normalizeSubtype(source.entity_subtype || source.subtype);
    if ((!domain || !subtype) && typeof EntityCore !== "undefined") {
      const meta = source.meta && typeof source.meta === "object" ? source.meta : source;
      const post = source.post && typeof source.post === "object" ? source.post : null;
      if (!domain && EntityCore.resolveEntityDomain) domain = normalizeDomain(EntityCore.resolveEntityDomain(meta, post));
      if (!subtype && EntityCore.resolveEntitySubtype) subtype = normalizeSubtype(EntityCore.resolveEntitySubtype(meta, post));
    }
    return { domain: domain, subtype: subtype };
  }

  function resolveContentModelContext(record) {
    const parts = resolveDomainSubtypeFromRecord(record || {});
    const def = getContentModelDefinition(parts.domain, parts.subtype);
    const normalized = normalizeContentModelRecord(Object.assign({}, record || {}, {
      entity_domain: parts.domain,
      entity_subtype: parts.subtype,
    }));
    return {
      domain: parts.domain,
      subtype: parts.subtype,
      model_key: normalized.model_key,
      model_label: getModelLabel(parts.domain, parts.subtype),
      active_model: normalized.active_model,
      model_status: normalized.model_status,
      create_ui: normalized.create_ui,
      admin_flow: normalized.admin_flow,
      display_policy: getModelDisplayPolicy(parts.domain, parts.subtype),
      fields: normalized.fields,
      signals: extractModelSignals(Object.assign({}, record || {}, {
        entity_domain: parts.domain,
        entity_subtype: parts.subtype,
      })),
    };
  }

  return {
    MODEL_STATUS: Object.assign({}, MODEL_STATUS),
    MODEL_DEFINITIONS: Object.keys(MODEL_DEFINITIONS).reduce(function(acc, key) {
      acc[key] = Object.assign({}, MODEL_DEFINITIONS[key], { fields: MODEL_DEFINITIONS[key].fields.slice() });
      return acc;
    }, {}),
    getContentModelDefinition: getContentModelDefinition,
    getContentModelDefinitionByKey: getContentModelDefinitionByKey,
    listContentModels: listContentModels,
    listActiveP2Models: listActiveP2Models,
    isP2ModelActive: isP2ModelActive,
    isCreateUiEnabled: isCreateUiEnabled,
    isAdminFlowEnabled: isAdminFlowEnabled,
    normalizeContentModelKey: normalizeContentModelKey,
    normalizeContentModelRecord: normalizeContentModelRecord,
    getSupportedModelFields: getSupportedModelFields,
    extractModelSignals: extractModelSignals,
    getModelSearchSignals: getModelSearchSignals,
    getModelDisplayPolicy: getModelDisplayPolicy,
    shouldRenderModelSection: shouldRenderModelSection,
    getModelLabel: getModelLabel,
    resolveContentModelContext: resolveContentModelContext,
  };
})();
