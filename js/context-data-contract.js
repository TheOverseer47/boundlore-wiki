// ============================================
// BoundLore Context Data Contract
// P3-H.1 — read-only explicit context field normalization for P2 sections.
// No writes, no fetch, no Supabase, no promotion, no inference.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreContextDataContract = (function() {
  const CONTEXT_DATA_SOURCES = ["root", "meta", "discovery_payload", "structured_context", "unknown"];

  const CONTEXT_CONTRACT_SECTIONS = [
    "resource_node", "observation_context", "creature_encounter", "requirement_unlock",
    "versioning", "quest_event", "economy", "model_identity", "unknown",
  ];

  const CONTEXT_CONTRACT_POLICY = [
    "read_only", "explicit_only", "no_writes", "no_mutation", "no_promotion",
    "no_inference", "no_empty_sections", "no_unknown_values", "no_actions",
  ];

  const ALLOWED_CONTEXT_FIELDS = {
    resource_node: ["node_type", "acquisition_sources", "node_observations"],
    observation_context: [
      "observation_context", "coordinates", "location_ref", "biome_context",
      "time_condition", "weather_condition",
    ],
    creature_encounter: [
      "creature_encounter", "behavior", "encounter_type", "spawn_context", "drop_context",
      "combat_affinities", "weakness", "resistance",
    ],
    requirement_unlock: [
      "requirements", "required_level", "profession_level", "faction_req",
      "unlock_type", "access_state",
    ],
    versioning: [
      "versioning", "game_version", "valid_from", "valid_until", "introduced_in",
      "changed_in", "removed_in", "superseded_by",
    ],
    quest_event: [
      "quest_event", "objectives", "rewards", "event_type", "occurrence_state", "npc_services",
    ],
    economy: [
      "economy", "trade_offers", "prices", "currency", "availability", "stock_state",
      "vendor_services",
    ],
    model_identity: ["entity_domain", "entity_subtype", "active_model", "lifecycle_state"],
  };

  const SOURCE_ORDER = ["root", "meta", "discovery_payload", "structured_context"];

  const STRUCTURED_SECTION_KEYS = {
    resource_node: "resource_node",
    observation_context: "observation_context",
    creature_encounter: "creature_encounter",
    requirement_unlock: "requirement_unlock",
    versioning: "versioning",
    quest_event: "quest_event",
    economy: "economy",
    model_identity: "model_identity",
  };

  const ROOT_RESERVED_KEYS = {
    meta: true,
    post: true,
    discovery_payload: true,
    payload: true,
    structured_context: true,
    title: true,
    description: true,
    id: true,
    slug: true,
  };

  const SECTION_EXTRACTORS = {
    resource_node: extractResourceNodeContext,
    observation_context: extractObservationContext,
    creature_encounter: extractCreatureEncounterContext,
    requirement_unlock: extractRequirementUnlockContext,
    versioning: extractVersioningContext,
    quest_event: extractQuestEventContext,
    economy: extractEconomyContext,
  };

  function slugKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function normalizeContractSection(value) {
    const raw = slugKey(value);
    if (!raw) return "unknown";
    if (CONTEXT_CONTRACT_SECTIONS.includes(raw)) return raw;
    const aliases = {
      quest: "quest_event",
      event: "quest_event",
      resource: "resource_node",
      observation: "observation_context",
      creature: "creature_encounter",
      requirement: "requirement_unlock",
      unlock: "requirement_unlock",
    };
    return aliases[raw] || "unknown";
  }

  function normalizeDataSource(value) {
    const raw = slugKey(value);
    if (CONTEXT_DATA_SOURCES.includes(raw)) return raw;
    return "unknown";
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function cloneContractValue(value) {
    if (value == null) return value;
    if (Array.isArray(value)) {
      return value.map(function(item) { return cloneContractValue(item); });
    }
    if (isPlainObject(value)) {
      const out = {};
      Object.keys(value).forEach(function(key) {
        out[key] = cloneContractValue(value[key]);
      });
      return out;
    }
    return value;
  }

  function isEmptyContractValue(value) {
    if (value == null || value === "") return true;
    if (typeof value === "string") {
      const s = value.trim();
      return !s || slugKey(s) === "unknown";
    }
    if (Array.isArray(value)) {
      return value.length === 0 || value.every(isEmptyContractValue);
    }
    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      if (!keys.length) return true;
      return keys.every(function(key) { return isEmptyContractValue(value[key]); });
    }
    return false;
  }

  function cleanContractValue(value) {
    if (value == null || value === "") return undefined;
    if (typeof value === "string") {
      const s = value.trim();
      if (!s || slugKey(s) === "unknown") return undefined;
      return s;
    }
    if (Array.isArray(value)) {
      const cleaned = value
        .map(cleanContractValue)
        .filter(function(item) { return item !== undefined; });
      return cleaned.length ? cleaned : undefined;
    }
    if (isPlainObject(value)) {
      const out = cleanContractObject(value);
      return Object.keys(out).length ? out : undefined;
    }
    return value;
  }

  function cleanContractObject(value) {
    const out = {};
    if (!isPlainObject(value)) return out;
    Object.keys(value).forEach(function(key) {
      if (slugKey(key) === "unknown") return;
      const cleaned = cleanContractValue(value[key]);
      if (cleaned !== undefined) out[key] = cleaned;
    });
    return out;
  }

  function getNestedObject(entry, path) {
    if (!entry || !path) return null;
    const parts = String(path).split(".").filter(Boolean);
    let current = entry;
    for (let i = 0; i < parts.length; i += 1) {
      if (!isPlainObject(current)) return null;
      current = current[parts[i]];
    }
    return isPlainObject(current) ? current : null;
  }

  function getEntryMeta(entry) {
    return isPlainObject(entry && entry.meta) ? entry.meta : {};
  }

  function getEntryDiscoveryPayload(entry) {
    const e = entry && typeof entry === "object" ? entry : {};
    if (isPlainObject(e.discovery_payload)) return e.discovery_payload;
    if (isPlainObject(e.payload)) return e.payload;
    return {};
  }

  function getEntryStructuredContext(entry) {
    return isPlainObject(entry && entry.structured_context) ? entry.structured_context : {};
  }

  function getEntryRootContext(entry) {
    const out = {};
    if (!isPlainObject(entry)) return out;
    Object.keys(entry).forEach(function(key) {
      if (ROOT_RESERVED_KEYS[key]) return;
      out[key] = entry[key];
    });
    return out;
  }

  function getAllowedFieldsForSection(section) {
    const kind = normalizeContractSection(section);
    return (ALLOWED_CONTEXT_FIELDS[kind] || []).slice();
  }

  function hasAllowedField(section, fieldName) {
    const fields = getAllowedFieldsForSection(section);
    return fields.indexOf(String(fieldName || "")) !== -1;
  }

  function pickAllowedFields(source, section) {
    const out = {};
    if (!isPlainObject(source)) return out;
    const allowed = getAllowedFieldsForSection(section);
    allowed.forEach(function(field) {
      if (!Object.prototype.hasOwnProperty.call(source, field)) return;
      const cleaned = cleanContractValue(source[field]);
      if (cleaned !== undefined) out[field] = cleaned;
    });
    return out;
  }

  function mergeSectionObjects() {
    const out = {};
    for (let i = 0; i < arguments.length; i += 1) {
      const part = arguments[i];
      if (!isPlainObject(part)) continue;
      Object.keys(part).forEach(function(key) {
        if (out[key] === undefined) out[key] = cloneContractValue(part[key]);
      });
    }
    return out;
  }

  function getSourceObject(entry, sourceName) {
    const source = normalizeDataSource(sourceName);
    if (source === "root") return getEntryRootContext(entry);
    if (source === "meta") return getEntryMeta(entry);
    if (source === "discovery_payload") return getEntryDiscoveryPayload(entry);
    if (source === "structured_context") return getEntryStructuredContext(entry);
    return {};
  }

  function extractSectionFromSource(sourceObject, section, sourceName) {
    const kind = normalizeContractSection(section);
    const source = isPlainObject(sourceObject) ? sourceObject : {};
    const out = pickAllowedFields(source, kind);

    if (normalizeDataSource(sourceName) === "structured_context") {
      const blockKey = STRUCTURED_SECTION_KEYS[kind];
      if (blockKey && isPlainObject(source[blockKey])) {
        Object.assign(out, pickAllowedFields(source[blockKey], kind));
      }
    }

    if (kind === "observation_context") {
      const block = source.observation_context || source.observation;
      if (isPlainObject(block)) {
        const nested = pickAllowedFields(block, kind);
        delete nested.observation_context;
        Object.keys(nested).forEach(function(key) {
          if (out[key] === undefined) out[key] = nested[key];
        });
      }
    }

    if (kind === "creature_encounter" && isPlainObject(source.creature_encounter)) {
      Object.assign(out, pickAllowedFields(source.creature_encounter, kind));
    }

    if (kind === "requirement_unlock" && isPlainObject(source.requirement_unlock)) {
      Object.assign(out, pickAllowedFields(source.requirement_unlock, kind));
    }

    if (kind === "versioning" && isPlainObject(source.versioning)) {
      Object.assign(out, pickAllowedFields(source.versioning, kind));
    }

    if (kind === "quest_event" && isPlainObject(source.quest_event)) {
      Object.assign(out, pickAllowedFields(source.quest_event, kind));
    }

    if (kind === "economy" && isPlainObject(source.economy)) {
      Object.assign(out, pickAllowedFields(source.economy, kind));
    }

    return cleanContractObject(out);
  }

  function extractSectionContext(entry, section) {
    const kind = normalizeContractSection(section);
    let merged = {};
    SOURCE_ORDER.forEach(function(sourceName) {
      const partial = extractSectionFromSource(getSourceObject(entry, sourceName), kind, sourceName);
      merged = mergeSectionObjects(merged, partial);
    });
    return cleanContractObject(merged);
  }

  function hasResourceNodeTrigger(context) {
    if (!isPlainObject(context)) return false;
    if (!isEmptyContractValue(context.node_type)) return true;
    if (!isEmptyContractValue(context.node_observations)) return true;
    const sources = context.acquisition_sources;
    if (Array.isArray(sources) && sources.length) {
      for (let i = 0; i < sources.length; i += 1) {
        const item = sources[i];
        if (!isPlainObject(item)) continue;
        if (!isEmptyContractValue(item.node_type) || !isEmptyContractValue(item.node_observation)) {
          return true;
        }
        if (!isEmptyContractValue(item.acquisition_method) || !isEmptyContractValue(item.source_type)) {
          return true;
        }
      }
    }
    return false;
  }

  function hasObservationTrigger(context) {
    if (!isPlainObject(context)) return false;
    const block = isPlainObject(context.observation_context)
      ? context.observation_context
      : context;
    const fields = ["coordinates", "location_ref", "biome_context", "time_condition", "weather_condition"];
    for (let i = 0; i < fields.length; i += 1) {
      if (!isEmptyContractValue(block[fields[i]])) return true;
    }
    return false;
  }

  function hasCreatureTrigger(context) {
    if (!isPlainObject(context)) return false;
    const block = isPlainObject(context.creature_encounter)
      ? mergeSectionObjects(context.creature_encounter, context)
      : context;
    const fields = [
      "behavior", "encounter_type", "spawn_context", "drop_context",
      "combat_affinities", "weakness", "resistance",
    ];
    for (let i = 0; i < fields.length; i += 1) {
      if (!isEmptyContractValue(block[fields[i]])) return true;
    }
    return false;
  }

  function hasRequirementTrigger(context) {
    if (!isPlainObject(context)) return false;
    if (!isEmptyContractValue(context.requirements)) return true;
    const scalars = [
      "required_level", "profession_level", "faction_req", "unlock_type", "access_state",
    ];
    for (let i = 0; i < scalars.length; i += 1) {
      if (!isEmptyContractValue(context[scalars[i]])) return true;
    }
    return false;
  }

  function hasVersioningTrigger(context) {
    if (!isPlainObject(context)) return false;
    const block = isPlainObject(context.versioning)
      ? mergeSectionObjects(context.versioning, context)
      : context;
    const fields = getAllowedFieldsForSection("versioning");
    for (let i = 0; i < fields.length; i += 1) {
      if (fields[i] === "versioning") continue;
      if (!isEmptyContractValue(block[fields[i]])) return true;
    }
    return false;
  }

  function hasQuestEventTrigger(context) {
    if (!isPlainObject(context)) return false;
    const block = isPlainObject(context.quest_event)
      ? mergeSectionObjects(context.quest_event, context)
      : context;
    const fields = ["objectives", "rewards", "event_type", "occurrence_state", "npc_services"];
    for (let i = 0; i < fields.length; i += 1) {
      if (!isEmptyContractValue(block[fields[i]])) return true;
    }
    return false;
  }

  function hasEconomyTrigger(context) {
    if (!isPlainObject(context)) return false;
    const block = isPlainObject(context.economy)
      ? mergeSectionObjects(context.economy, context)
      : context;
    const fields = ["trade_offers", "prices", "currency", "availability", "stock_state", "vendor_services"];
    for (let i = 0; i < fields.length; i += 1) {
      if (!isEmptyContractValue(block[fields[i]])) return true;
    }
    return false;
  }

  const SECTION_TRIGGERS = {
    resource_node: hasResourceNodeTrigger,
    observation_context: hasObservationTrigger,
    creature_encounter: hasCreatureTrigger,
    requirement_unlock: hasRequirementTrigger,
    versioning: hasVersioningTrigger,
    quest_event: hasQuestEventTrigger,
    economy: hasEconomyTrigger,
    model_identity: function(context) {
      return !isEmptyContractValue(context && context.lifecycle_state);
    },
  };

  function sectionHasExplicitTrigger(section, context) {
    const kind = normalizeContractSection(section);
    const fn = SECTION_TRIGGERS[kind];
    if (!fn) return Object.keys(cleanContractObject(context)).length > 0;
    return fn(context);
  }

  function extractResourceNodeContext(entry) {
    const context = extractSectionContext(entry, "resource_node");
    return sectionHasExplicitTrigger("resource_node", context) ? context : {};
  }

  function extractObservationContext(entry) {
    const context = extractSectionContext(entry, "observation_context");
    if (!sectionHasExplicitTrigger("observation_context", context)) return {};
    const out = {};
    const block = isPlainObject(context.observation_context)
      ? mergeSectionObjects(context.observation_context, context)
      : context;
    ["coordinates", "location_ref", "biome_context", "time_condition", "weather_condition"].forEach(function(field) {
      if (block[field] !== undefined) out[field] = cloneContractValue(block[field]);
    });
    if (Object.keys(out).length) out.observation_context = cloneContractValue(out);
    return out;
  }

  function extractCreatureEncounterContext(entry) {
    const context = extractSectionContext(entry, "creature_encounter");
    if (!sectionHasExplicitTrigger("creature_encounter", context)) return {};
    const flat = isPlainObject(context.creature_encounter)
      ? mergeSectionObjects(context.creature_encounter, context)
      : context;
    const out = {};
    [
      "behavior", "encounter_type", "spawn_context", "drop_context",
      "combat_affinities", "weakness", "resistance",
    ].forEach(function(field) {
      if (flat[field] !== undefined) out[field] = cloneContractValue(flat[field]);
    });
    if (Object.keys(out).length) out.creature_encounter = cloneContractValue(out);
    return out;
  }

  function extractRequirementUnlockContext(entry) {
    const context = extractSectionContext(entry, "requirement_unlock");
    return sectionHasExplicitTrigger("requirement_unlock", context) ? context : {};
  }

  function extractVersioningContext(entry) {
    const context = extractSectionContext(entry, "versioning");
    if (!sectionHasExplicitTrigger("versioning", context)) return {};
    const flat = isPlainObject(context.versioning)
      ? mergeSectionObjects(context.versioning, context)
      : context;
    const out = {};
    getAllowedFieldsForSection("versioning").forEach(function(field) {
      if (field === "versioning") return;
      if (flat[field] !== undefined) out[field] = cloneContractValue(flat[field]);
    });
    if (Object.keys(out).length) out.versioning = cloneContractValue(out);
    return out;
  }

  function extractQuestEventContext(entry) {
    const context = extractSectionContext(entry, "quest_event");
    if (!sectionHasExplicitTrigger("quest_event", context)) return {};
    const flat = isPlainObject(context.quest_event)
      ? mergeSectionObjects(context.quest_event, context)
      : context;
    const out = {};
    getAllowedFieldsForSection("quest_event").forEach(function(field) {
      if (field === "quest_event") return;
      if (flat[field] !== undefined) out[field] = cloneContractValue(flat[field]);
    });
    if (Object.keys(out).length) out.quest_event = cloneContractValue(out);
    return out;
  }

  function extractEconomyContext(entry) {
    const context = extractSectionContext(entry, "economy");
    if (!sectionHasExplicitTrigger("economy", context)) return {};
    const flat = isPlainObject(context.economy)
      ? mergeSectionObjects(context.economy, context)
      : context;
    const out = {};
    getAllowedFieldsForSection("economy").forEach(function(field) {
      if (field === "economy") return;
      if (flat[field] !== undefined) out[field] = cloneContractValue(flat[field]);
    });
    if (Object.keys(out).length) out.economy = cloneContractValue(out);
    return out;
  }

  function extractAllContractContext(entry) {
    const out = {};
    Object.keys(SECTION_EXTRACTORS).forEach(function(section) {
      const extracted = SECTION_EXTRACTORS[section](entry);
      if (Object.keys(extracted).length) out[section] = extracted;
    });
    return out;
  }

  function collectAllContextFieldNames() {
    const names = {
      observation_context: true,
      creature_encounter: true,
      requirement_unlock: true,
      versioning: true,
      quest_event: true,
      economy: true,
      resource_node: true,
      observation: true,
    };
    Object.keys(ALLOWED_CONTEXT_FIELDS).forEach(function(section) {
      ALLOWED_CONTEXT_FIELDS[section].forEach(function(field) {
        names[field] = true;
      });
    });
    return names;
  }

  const CONTEXT_FIELD_NAMES = collectAllContextFieldNames();

  function stripContextFieldsFromObject(source) {
    if (!isPlainObject(source)) return {};
    const out = cloneContractValue(source);
    Object.keys(CONTEXT_FIELD_NAMES).forEach(function(field) {
      delete out[field];
    });
    return out;
  }

  function createContextRenderShell(entry) {
    const shell = cloneEntry(entry);
    shell.discovery_payload = {};
    shell.meta = stripContextFieldsFromObject(getEntryMeta(entry));
    return shell;
  }

  function cloneEntry(entry) {
    const e = entry && typeof entry === "object" ? entry : {};
    const out = {
      meta: cloneContractValue(getEntryMeta(e)),
      post: isPlainObject(e.post) ? cloneContractValue(e.post) : {},
      discovery_payload: cloneContractValue(getEntryDiscoveryPayload(e)),
    };
    if (isPlainObject(e.structured_context)) {
      out.structured_context = cloneContractValue(e.structured_context);
    }
    Object.keys(getEntryRootContext(e)).forEach(function(key) {
      out[key] = cloneContractValue(e[key]);
    });
    if (e.title != null) out.title = e.title;
    return out;
  }

  function applySectionToPayload(payload, section, context) {
    if (!isPlainObject(payload) || !isPlainObject(context) || !Object.keys(context).length) return;
    const kind = normalizeContractSection(section);

    if (kind === "observation_context") {
      const block = isPlainObject(context.observation_context)
        ? context.observation_context
        : context;
      payload.observation_context = mergeSectionObjects(
        isPlainObject(payload.observation_context) ? payload.observation_context : {},
        block
      );
      return;
    }

    if (kind === "creature_encounter") {
      const block = isPlainObject(context.creature_encounter)
        ? context.creature_encounter
        : context;
      payload.creature_encounter = mergeSectionObjects(
        isPlainObject(payload.creature_encounter) ? payload.creature_encounter : {},
        block
      );
      [
        "behavior", "encounter_type", "spawn_context", "drop_context",
        "combat_affinities", "weakness", "resistance",
      ].forEach(function(field) {
        if (block[field] !== undefined && payload[field] === undefined) {
          payload[field] = cloneContractValue(block[field]);
        }
      });
      return;
    }

    if (kind === "versioning") {
      const block = isPlainObject(context.versioning) ? context.versioning : context;
      payload.versioning = mergeSectionObjects(
        isPlainObject(payload.versioning) ? payload.versioning : {},
        block
      );
      getAllowedFieldsForSection("versioning").forEach(function(field) {
        if (field === "versioning") return;
        if (block[field] !== undefined && payload[field] === undefined) {
          payload[field] = cloneContractValue(block[field]);
        }
      });
      return;
    }

    if (kind === "quest_event") {
      const block = isPlainObject(context.quest_event) ? context.quest_event : context;
      payload.quest_event = mergeSectionObjects(
        isPlainObject(payload.quest_event) ? payload.quest_event : {},
        block
      );
      getAllowedFieldsForSection("quest_event").forEach(function(field) {
        if (field === "quest_event") return;
        if (block[field] !== undefined && payload[field] === undefined) {
          payload[field] = cloneContractValue(block[field]);
        }
      });
      return;
    }

    if (kind === "economy") {
      const block = isPlainObject(context.economy) ? context.economy : context;
      payload.economy = mergeSectionObjects(
        isPlainObject(payload.economy) ? payload.economy : {},
        block
      );
      getAllowedFieldsForSection("economy").forEach(function(field) {
        if (field === "economy") return;
        if (block[field] !== undefined && payload[field] === undefined) {
          payload[field] = cloneContractValue(block[field]);
        }
      });
      return;
    }

    Object.keys(context).forEach(function(field) {
      if (payload[field] === undefined) payload[field] = cloneContractValue(context[field]);
    });
  }

  function mergeContractContext(baseEntry, context) {
    const base = cloneEntry(baseEntry);
    if (isPlainObject(context)) {
      Object.keys(context).forEach(function(section) {
        applySectionToPayload(base.discovery_payload, section, context[section]);
      });
    }
    return base;
  }

  function hasExplicitContractSection(entry, section) {
    const kind = normalizeContractSection(section);
    const extractor = SECTION_EXTRACTORS[kind];
    if (!extractor) return false;
    const extracted = extractor(entry);
    return Object.keys(extracted).length > 0;
  }

  function hasAnyExplicitContractContext(entry) {
    return Object.keys(SECTION_EXTRACTORS).some(function(section) {
      return hasExplicitContractSection(entry, section);
    });
  }

  function resolveContractEntry(entry) {
    const extracted = extractAllContractContext(entry);
    const shell = createContextRenderShell(entry);
    if (!Object.keys(extracted).length) return shell;
    return mergeContractContext(shell, extracted);
  }

  function getContractDiagnostics(entry) {
    const diagnostics = {
      policy: CONTEXT_CONTRACT_POLICY.slice(),
      sources: SOURCE_ORDER.slice(),
      sections: {},
      conflicts: [],
      has_explicit_context: hasAnyExplicitContractContext(entry),
    };
    Object.keys(SECTION_EXTRACTORS).forEach(function(section) {
      const perSource = {};
      SOURCE_ORDER.forEach(function(sourceName) {
        const partial = extractSectionFromSource(
          getSourceObject(entry, sourceName),
          section,
          sourceName
        );
        if (Object.keys(partial).length) perSource[sourceName] = partial;
      });
      diagnostics.sections[section] = {
        explicit: hasExplicitContractSection(entry, section),
        extracted: SECTION_EXTRACTORS[section](entry),
        by_source: perSource,
      };
      const sourceKeys = Object.keys(perSource);
      if (sourceKeys.length > 1) {
        diagnostics.conflicts.push({
          section: section,
          message: "Multiple sources provide explicit fields; first non-empty field wins per key.",
          sources: sourceKeys,
        });
      }
    });
    return diagnostics;
  }

  function shouldWriteContractData() {
    return false;
  }

  function shouldPromoteContractData(section, context) {
    void section;
    void context;
    return false;
  }

  function shouldRenderContractActions(section, context) {
    void section;
    void context;
    return false;
  }

  return {
    CONTEXT_DATA_SOURCES: CONTEXT_DATA_SOURCES,
    CONTEXT_CONTRACT_SECTIONS: CONTEXT_CONTRACT_SECTIONS,
    CONTEXT_CONTRACT_POLICY: CONTEXT_CONTRACT_POLICY,
    ALLOWED_CONTEXT_FIELDS: ALLOWED_CONTEXT_FIELDS,
    SOURCE_ORDER: SOURCE_ORDER,
    normalizeContractSection: normalizeContractSection,
    normalizeDataSource: normalizeDataSource,
    isPlainObject: isPlainObject,
    cloneContractValue: cloneContractValue,
    isEmptyContractValue: isEmptyContractValue,
    cleanContractValue: cleanContractValue,
    cleanContractObject: cleanContractObject,
    getNestedObject: getNestedObject,
    getEntryMeta: getEntryMeta,
    getEntryDiscoveryPayload: getEntryDiscoveryPayload,
    getEntryStructuredContext: getEntryStructuredContext,
    getAllowedFieldsForSection: getAllowedFieldsForSection,
    hasAllowedField: hasAllowedField,
    hasExplicitContractSection: hasExplicitContractSection,
    hasAnyExplicitContractContext: hasAnyExplicitContractContext,
    extractSectionFromSource: extractSectionFromSource,
    extractResourceNodeContext: extractResourceNodeContext,
    extractObservationContext: extractObservationContext,
    extractCreatureEncounterContext: extractCreatureEncounterContext,
    extractRequirementUnlockContext: extractRequirementUnlockContext,
    extractVersioningContext: extractVersioningContext,
    extractQuestEventContext: extractQuestEventContext,
    extractEconomyContext: extractEconomyContext,
    extractAllContractContext: extractAllContractContext,
    mergeContractContext: mergeContractContext,
    resolveContractEntry: resolveContractEntry,
    getContractDiagnostics: getContractDiagnostics,
    shouldWriteContractData: shouldWriteContractData,
    shouldPromoteContractData: shouldPromoteContractData,
    shouldRenderContractActions: shouldRenderContractActions,
  };
})();
