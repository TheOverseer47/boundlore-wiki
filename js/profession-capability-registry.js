// ============================================
// BoundLore Profession & Capability Registry
// P1-F.1 — future-safe typing for professions, roles,
// capabilities, and requirements. No UI, no DB, no migration.
//
// Blueprint: no new top-level domain. Professions map to
// SYSTEM/profession_type; mounts stay BEING + role/capability.
// See docs/architecture/graph-relations-spec.md
// ============================================

window.BoundLoreProfessionCapabilityRegistry = (function() {
  const PROFESSION_KINDS = [
    "crafting", "gathering", "combat", "exploration", "social",
    "service", "lore", "unknown",
  ];

  const CAPABILITY_KINDS = [
    "rideable", "flyable", "tameable", "gatherable", "mineable",
    "harvestable", "craftable", "tradable", "usable", "equipable",
    "unlockable", "unknown",
  ];

  const ROLE_KINDS = [
    "mount", "companion", "vendor", "trainer", "crafter", "gatherer",
    "enemy", "boss", "resource_node", "station", "unknown",
  ];

  const REQUIREMENT_KINDS = [
    "required_level", "profession", "profession_level", "tool", "station",
    "station_tier", "faction_req", "quest_unlock", "knowledge_unlock",
    "biome_context", "time_condition", "weather_condition", "unknown",
  ];

  const PROFESSION_ENTITY_MODEL = {
    domain: "SYSTEM",
    subtype: "profession_type",
    notes: "Future profession pages use SYSTEM/profession_type — not a top-level domain.",
  };

  const PROFESSION_ALIASES = {
    craft: "crafting",
    crafter: "crafting",
    smithing: "crafting",
    blacksmith: "crafting",
    forging: "crafting",
    forge: "crafting",
    mining: "gathering",
    miner: "gathering",
    gather: "gathering",
    gatherer: "gathering",
    harvesting: "gathering",
    lumberjack: "gathering",
    woodcutting: "gathering",
    fishing: "gathering",
    combatant: "combat",
    fighter: "combat",
    warrior: "combat",
    explorer: "exploration",
    scouting: "exploration",
    merchant: "social",
    vendor: "social",
    trader: "social",
    service: "service",
    scholar: "lore",
    historian: "lore",
  };

  const CAPABILITY_ALIASES = {
    riding: "rideable",
    ridden: "rideable",
    mountable: "rideable",
    flying: "flyable",
    flight: "flyable",
    taming: "tameable",
    tame: "tameable",
    gather: "gatherable",
    gathering: "gatherable",
    mine: "mineable",
    mining: "mineable",
    mineable: "mineable",
    harvest: "harvestable",
    harvesting: "harvestable",
    craft: "craftable",
    crafting: "craftable",
    trade: "tradable",
    trading: "tradable",
    use: "usable",
    equip: "equipable",
    unlock: "unlockable",
    swims: "usable",
    dives: "usable",
    climbs: "usable",
    combat_mount: "rideable",
  };

  const ROLE_ALIASES = {
    quest_giver: "vendor",
    loot_source: "resource_node",
    trade_good: "vendor",
    boss_encounter: "boss",
    crafting_station: "station",
    mount_role: "mount",
  };

  const REQUIREMENT_ALIASES = {
    level: "required_level",
    min_level: "required_level",
    level_req: "required_level",
    profession_req: "profession",
    skill: "profession",
    skill_level: "profession_level",
    crafting_station: "station",
    station_type: "station",
    tier: "station_tier",
    faction: "faction_req",
    unlock: "quest_unlock",
    unlock_type: "quest_unlock",
    unlock_condition: "quest_unlock",
    knowledge: "knowledge_unlock",
    biome: "biome_context",
    time: "time_condition",
    weather: "weather_condition",
    method: "tool",
    node_type: "tool",
  };

  const PROFESSION_LABELS = {
    crafting: "Crafting",
    gathering: "Gathering",
    combat: "Combat",
    exploration: "Exploration",
    social: "Social",
    service: "Service",
    lore: "Lore",
  };

  const CAPABILITY_LABELS = {
    rideable: "Rideable",
    flyable: "Flyable",
    tameable: "Tameable",
    gatherable: "Gatherable",
    mineable: "Mineable",
    harvestable: "Harvestable",
    craftable: "Craftable",
    tradable: "Tradable",
    usable: "Usable",
    equipable: "Equipable",
    unlockable: "Unlockable",
  };

  const ROLE_LABELS = {
    mount: "Mount",
    companion: "Companion",
    vendor: "Vendor",
    trainer: "Trainer",
    crafter: "Crafter",
    gatherer: "Gatherer",
    enemy: "Enemy",
    boss: "Boss",
    resource_node: "Resource Node",
    station: "Station",
  };

  const REQUIREMENT_LABELS = {
    required_level: "Required Level",
    profession: "Profession",
    profession_level: "Profession Level",
    tool: "Tool",
    station: "Station",
    station_tier: "Station Tier",
    faction_req: "Faction Requirement",
    quest_unlock: "Quest Unlock",
    knowledge_unlock: "Knowledge Unlock",
    biome_context: "Biome Context",
    time_condition: "Time Condition",
    weather_condition: "Weather Condition",
  };

  const P1_F_RESERVED_RELATIONS = [
    "crafted_by_profession",
    "gathered_via",
    "tamed_via",
    "mountable_by",
  ];

  function slugKey(value) {
    return String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_>]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function meaningful(value) {
    const clean = String(value == null ? "" : value).trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    if (["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) {
      return "";
    }
    return clean;
  }

  function normalizeToKind(value, kinds, aliases, fallback) {
    const raw = slugKey(value);
    if (!raw) return fallback || "unknown";
    if (aliases && aliases[raw]) return normalizeToKind(aliases[raw], kinds, null, fallback);
    if (kinds.indexOf(raw) >= 0) return raw;
    return fallback || "unknown";
  }

  function isDisplayableKind(kind) {
    return !!kind && kind !== "unknown";
  }

  function normalizeProfessionKind(value) {
    return normalizeToKind(value, PROFESSION_KINDS, PROFESSION_ALIASES, "unknown");
  }

  function normalizeCapabilityKind(value) {
    return normalizeToKind(value, CAPABILITY_KINDS, CAPABILITY_ALIASES, "unknown");
  }

  function normalizeRoleKind(value) {
    return normalizeToKind(value, ROLE_KINDS, ROLE_ALIASES, "unknown");
  }

  function normalizeRequirementKind(value) {
    return normalizeToKind(value, REQUIREMENT_KINDS, REQUIREMENT_ALIASES, "unknown");
  }

  function getProfessionDisplayLabel(value) {
    const kind = normalizeProfessionKind(value);
    if (!isDisplayableKind(kind)) return "";
    return PROFESSION_LABELS[kind] || titleCase(kind);
  }

  function getCapabilityDisplayLabel(value) {
    const kind = normalizeCapabilityKind(value);
    if (!isDisplayableKind(kind)) return "";
    return CAPABILITY_LABELS[kind] || titleCase(kind);
  }

  function getRoleDisplayLabel(value) {
    const kind = normalizeRoleKind(value);
    if (!isDisplayableKind(kind)) return "";
    return ROLE_LABELS[kind] || titleCase(kind);
  }

  function getRequirementDisplayLabel(value) {
    const kind = normalizeRequirementKind(value);
    if (!isDisplayableKind(kind)) return "";
    return REQUIREMENT_LABELS[kind] || titleCase(kind);
  }

  function unwrapSource(source) {
    if (!source || typeof source !== "object") return {};
    if (source.meta && typeof source.meta === "object") {
      return Object.assign({}, source.meta, {
        facets: source.facets || source.meta.facets,
        post: source.post || source.meta.post,
      });
    }
    return source;
  }

  function collectStringValues(value, out) {
    const bucket = out || [];
    if (value == null) return bucket;
    if (Array.isArray(value)) {
      value.forEach(function(item) { collectStringValues(item, bucket); });
      return bucket;
    }
    if (typeof value === "object") {
      if (value.kind != null) collectStringValues(value.kind, bucket);
      if (value.value != null) collectStringValues(value.value, bucket);
      if (value.name != null) collectStringValues(value.name, bucket);
      if (value.capability != null) collectStringValues(value.capability, bucket);
      if (value.role != null) collectStringValues(value.role, bucket);
      return bucket;
    }
    const clean = meaningful(value);
    if (clean) bucket.push(clean);
    return bucket;
  }

  function readFacetValues(facets, groupKey) {
    const values = [];
    if (!facets || typeof facets !== "object") return values;
    const raw = facets[groupKey];
    collectStringValues(raw, values);
    return values;
  }

  function buildRecord(kind, rawValue, normalizer, labelFn, source) {
    const raw = meaningful(rawValue);
    if (!raw) return null;
    const normalized = normalizer(raw);
    const label = labelFn(raw) || labelFn(normalized);
    return {
      kind: normalized,
      raw: raw,
      value: raw,
      label: label,
      source: source || "explicit",
      displayable: isDisplayableKind(normalized),
    };
  }

  function normalizeProfessionRecord(record) {
    if (record == null) return null;
    if (typeof record === "string") {
      return buildRecord("profession", record, normalizeProfessionKind, getProfessionDisplayLabel, "string");
    }
    if (typeof record !== "object") return null;
    const kindRaw = record.kind || record.profession || record.profession_kind || record.value || record.name;
    const built = buildRecord("profession", kindRaw, normalizeProfessionKind, getProfessionDisplayLabel, record.source || "object");
    if (!built) return null;
    return Object.assign({}, built, {
      level: record.level != null ? record.level : record.profession_level,
      domain: PROFESSION_ENTITY_MODEL.domain,
      subtype: PROFESSION_ENTITY_MODEL.subtype,
    });
  }

  function normalizeCapabilityRecord(record) {
    if (record == null) return null;
    if (typeof record === "string") {
      return buildRecord("capability", record, normalizeCapabilityKind, getCapabilityDisplayLabel, "string");
    }
    if (typeof record !== "object") return null;
    const kindRaw = record.capability || record.kind || record.value || record.name;
    return buildRecord("capability", kindRaw, normalizeCapabilityKind, getCapabilityDisplayLabel, record.source || "object");
  }

  function normalizeRoleRecord(record) {
    if (record == null) return null;
    if (typeof record === "string") {
      return buildRecord("role", record, normalizeRoleKind, getRoleDisplayLabel, "string");
    }
    if (typeof record !== "object") return null;
    const kindRaw = record.role || record.kind || record.value || record.name;
    return buildRecord("role", kindRaw, normalizeRoleKind, getRoleDisplayLabel, record.source || "object");
  }

  function normalizeRequirementRecord(record) {
    if (record == null) return null;
    if (typeof record === "string") {
      const kind = normalizeRequirementKind(record);
      if (!isDisplayableKind(kind)) return null;
      return {
        kind: kind,
        raw: record,
        value: record,
        label: getRequirementDisplayLabel(kind),
        source: "string",
        displayable: true,
      };
    }
    if (typeof record !== "object") return null;
    const kindRaw = record.kind || record.requirement || record.type;
    const kind = normalizeRequirementKind(kindRaw);
    const value = record.value != null ? record.value : (record.target || record.name || record.station || record.tool);
    if (!isDisplayableKind(kind) && value == null) return null;
    return {
      kind: isDisplayableKind(kind) ? kind : "unknown",
      raw: value != null ? String(value) : String(kindRaw || ""),
      value: value,
      label: getRequirementDisplayLabel(kind) || titleCase(kindRaw),
      source: record.source || "object",
      displayable: isDisplayableKind(kind),
    };
  }

  function dedupeRecords(records, keyFn) {
    const seen = new Set();
    const out = [];
    (records || []).forEach(function(record) {
      if (!record) return;
      const key = keyFn(record);
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(record);
    });
    return out;
  }

  function extractCapabilitySignals(source) {
    const root = unwrapSource(source);
    const records = [];
    collectStringValues(root.capabilities, []).forEach(function(raw) {
      const rec = normalizeCapabilityRecord(raw);
      if (rec) records.push(rec);
    });
    readFacetValues(root.facets, "capability").forEach(function(raw) {
      const rec = normalizeCapabilityRecord(raw);
      if (rec) {
        rec.source = "facet";
        records.push(rec);
      }
    });
    if (root.capability) {
      const rec = normalizeCapabilityRecord(root.capability);
      if (rec) records.push(rec);
    }
    const payload = root.discovery_payload && typeof root.discovery_payload === "object"
      ? root.discovery_payload
      : {};
    if (payload.capabilities) {
      collectStringValues(payload.capabilities, []).forEach(function(raw) {
        const rec = normalizeCapabilityRecord(raw);
        if (rec) {
          rec.source = "payload";
          records.push(rec);
        }
      });
    }
    return dedupeRecords(records, function(r) { return r.kind + ":" + r.raw; });
  }

  function extractRoleSignals(source) {
    const root = unwrapSource(source);
    const records = [];
    collectStringValues(root.roles, []).forEach(function(raw) {
      const rec = normalizeRoleRecord(raw);
      if (rec) records.push(rec);
    });
    readFacetValues(root.facets, "role").forEach(function(raw) {
      const rec = normalizeRoleRecord(raw);
      if (rec) {
        rec.source = "facet";
        records.push(rec);
      }
    });
    if (root.role) {
      const rec = normalizeRoleRecord(root.role);
      if (rec) records.push(rec);
    }
    return dedupeRecords(records, function(r) { return r.kind + ":" + r.raw; });
  }

  function extractProfessionSignals(source) {
    const root = unwrapSource(source);
    const records = [];
    collectStringValues(root.professions, []).forEach(function(raw) {
      const rec = normalizeProfessionRecord(raw);
      if (rec) records.push(rec);
    });
    if (root.profession) {
      const rec = normalizeProfessionRecord(root.profession);
      if (rec) records.push(rec);
    }
    readFacetValues(root.facets, "profession_affinity").forEach(function(raw) {
      const rec = normalizeProfessionRecord(raw);
      if (rec) {
        rec.source = "facet";
        records.push(rec);
      }
    });
    const payload = root.discovery_payload && typeof root.discovery_payload === "object"
      ? root.discovery_payload
      : {};
    const recipe = payload.recipe && typeof payload.recipe === "object" ? payload.recipe : null;
    if (recipe && recipe.profession) {
      const rec = normalizeProfessionRecord(recipe.profession);
      if (rec) {
        rec.source = "recipe";
        records.push(rec);
      }
    }
    return dedupeRecords(records, function(r) { return r.kind + ":" + r.raw; });
  }

  function extractRequirementSignals(source) {
    const root = unwrapSource(source);
    const records = [];
    const pushReq = function(record, src) {
      const rec = normalizeRequirementRecord(record);
      if (!rec) return;
      rec.source = src || rec.source;
      records.push(rec);
    };

    collectStringValues(root.requirements, []).forEach(function(raw) {
      pushReq(typeof raw === "string" ? { kind: raw } : raw, "requirements");
    });
    if (Array.isArray(root.requirements)) {
      root.requirements.forEach(function(item) { pushReq(item, "requirements"); });
    }

    const qualifierKeys = [
      "required_level", "tool", "station", "station_tier", "faction_req",
      "unlock_type", "method", "role", "capability",
    ];
    qualifierKeys.forEach(function(key) {
      if (root[key] != null && root[key] !== "") {
        pushReq({ kind: key, value: root[key] }, "qualifier");
      }
    });

    const payload = root.discovery_payload && typeof root.discovery_payload === "object"
      ? root.discovery_payload
      : {};
    const recipe = payload.recipe && typeof payload.recipe === "object" ? payload.recipe : null;
    if (recipe) {
      if (recipe.required_level != null) pushReq({ kind: "required_level", value: recipe.required_level }, "recipe");
      if (recipe.station) pushReq({ kind: "station", value: recipe.station }, "recipe");
      if (recipe.station_tier) pushReq({ kind: "station_tier", value: recipe.station_tier }, "recipe");
      if (recipe.unlock_condition) pushReq({ kind: "quest_unlock", value: recipe.unlock_condition }, "recipe");
    }

    const relations = Array.isArray(root.discovery_relations) ? root.discovery_relations : [];
    relations.forEach(function(rel) {
      if (!rel || typeof rel !== "object") return;
      const type = slugKey(rel.relation_type || rel.type);
      if (P1_F_RESERVED_RELATIONS.indexOf(type) >= 0) return;
      qualifierKeys.forEach(function(key) {
        const val = rel[key] != null ? rel[key] : (rel.qualifiers && rel.qualifiers[key]);
        if (val != null && val !== "") pushReq({ kind: key, value: val }, "relation");
      });
    });

    return dedupeRecords(records, function(r) {
      return r.kind + ":" + String(r.raw || "") + ":" + String(r.value || "");
    });
  }

  function hasCapability(source, capability) {
    const target = normalizeCapabilityKind(capability);
    if (!isDisplayableKind(target)) return false;
    return extractCapabilitySignals(source).some(function(entry) {
      return entry.kind === target;
    });
  }

  function hasRole(source, role) {
    const target = normalizeRoleKind(role);
    if (!isDisplayableKind(target)) return false;
    return extractRoleSignals(source).some(function(entry) {
      return entry.kind === target;
    });
  }

  function hasRequirement(source, requirementKind) {
    const target = normalizeRequirementKind(requirementKind);
    if (!isDisplayableKind(target)) return false;
    return extractRequirementSignals(source).some(function(entry) {
      return entry.kind === target;
    });
  }

  function toSearchSignal(record, group) {
    if (!record || !record.displayable) return null;
    const label = record.label || titleCase(record.kind);
    const raw = meaningful(record.raw) || label;
    if (!raw) return null;
    return {
      raw: raw,
      normalized: slugKey(raw).replace(/_/g, " "),
      kind: record.kind,
      label: label,
      group: group,
      weight: 2,
      source: record.source || "registry",
    };
  }

  function getProfessionSearchSignals(source) {
    return extractProfessionSignals(source)
      .map(function(record) { return toSearchSignal(record, "profession"); })
      .filter(Boolean);
  }

  function getCapabilitySearchSignals(source) {
    return extractCapabilitySignals(source)
      .map(function(record) { return toSearchSignal(record, "capability"); })
      .filter(Boolean);
  }

  function getRoleSearchSignals(source) {
    return extractRoleSignals(source)
      .map(function(record) { return toSearchSignal(record, "role"); })
      .filter(Boolean);
  }

  function getRequirementSearchSignals(source) {
    return extractRequirementSignals(source)
      .filter(function(record) { return record.displayable; })
      .map(function(record) { return toSearchSignal(record, "requirement"); })
      .filter(Boolean);
  }

  return {
    PROFESSION_KINDS: PROFESSION_KINDS.slice(),
    CAPABILITY_KINDS: CAPABILITY_KINDS.slice(),
    ROLE_KINDS: ROLE_KINDS.slice(),
    REQUIREMENT_KINDS: REQUIREMENT_KINDS.slice(),
    PROFESSION_ENTITY_MODEL: Object.assign({}, PROFESSION_ENTITY_MODEL),
    P1_F_RESERVED_RELATIONS: P1_F_RESERVED_RELATIONS.slice(),
    normalizeProfessionKind: normalizeProfessionKind,
    normalizeCapabilityKind: normalizeCapabilityKind,
    normalizeRoleKind: normalizeRoleKind,
    normalizeRequirementKind: normalizeRequirementKind,
    normalizeProfessionRecord: normalizeProfessionRecord,
    normalizeCapabilityRecord: normalizeCapabilityRecord,
    normalizeRoleRecord: normalizeRoleRecord,
    normalizeRequirementRecord: normalizeRequirementRecord,
    extractCapabilitySignals: extractCapabilitySignals,
    extractRoleSignals: extractRoleSignals,
    extractRequirementSignals: extractRequirementSignals,
    extractProfessionSignals: extractProfessionSignals,
    hasCapability: hasCapability,
    hasRole: hasRole,
    hasRequirement: hasRequirement,
    getProfessionDisplayLabel: getProfessionDisplayLabel,
    getCapabilityDisplayLabel: getCapabilityDisplayLabel,
    getRoleDisplayLabel: getRoleDisplayLabel,
    getRequirementDisplayLabel: getRequirementDisplayLabel,
    getProfessionSearchSignals: getProfessionSearchSignals,
    getCapabilitySearchSignals: getCapabilitySearchSignals,
    getRoleSearchSignals: getRoleSearchSignals,
    getRequirementSearchSignals: getRequirementSearchSignals,
    isDisplayableKind: isDisplayableKind,
  };
})();
