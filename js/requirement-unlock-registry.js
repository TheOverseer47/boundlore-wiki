// ============================================
// BoundLore Requirement & Unlock Registry
// P2-H.1 — requirements, unlocks, progression context baseline.
// Structured fields/qualifiers only — no requirement posts, no unlock UI, no DB.
//
// Compatible with P1-F requirement kinds, P2-F observation conditions, P2-B quest prereqs.
// No inference from item/quest names. See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreRequirementUnlockRegistry = (function() {
  const REQUIREMENT_TYPES = [
    "required_level", "profession", "profession_level", "faction", "reputation",
    "quest", "knowledge", "item", "resource", "tool", "station", "station_tier",
    "biome_context", "time_condition", "weather_condition", "version", "achievement", "unknown",
  ];

  const UNLOCK_TYPES = [
    "quest_unlock", "knowledge_unlock", "recipe_unlock", "area_access", "vendor_access",
    "profession_unlock", "skill_unlock", "title_unlock", "mount_unlock", "event_unlock",
    "faction_unlock", "achievement_unlock", "unknown",
  ];

  const PROGRESSION_CONTEXT_TYPES = [
    "level", "profession_level", "faction_reputation", "quest_progress",
    "achievement_progress", "skill_progress", "knowledge_progress", "story_progress",
    "event_progress", "unknown",
  ];

  const ACCESS_STATES = [
    "unlocked", "locked", "conditional", "unavailable", "deprecated", "unknown",
  ];

  const REQUIREMENT_SCOPE_TYPES = [
    "entry", "recipe", "quest", "event", "vendor_offer", "npc_service", "resource_node",
    "creature_encounter", "profession", "observation", "unknown",
  ];

  const REQUIREMENT_FIELDS = [
    "required_level", "profession", "profession_level", "faction_req", "reputation_req",
    "quest_req", "knowledge_req", "item_req", "resource_req", "tool_req", "station",
    "station_tier", "biome_context", "time_condition", "weather_condition", "game_version",
    "unlock_type", "access_state", "evidence", "confidence", "versioning", "notes",
  ];

  const RENDER_SECTIONS_ENABLED = false;
  const PROMOTE_REQUIREMENT_TO_POST = false;
  const PROMOTE_UNLOCK_TO_POST = false;

  const REQUIREMENT_ALIASES = {
    level: "required_level",
    min_level: "required_level",
    level_req: "required_level",
    profession_req: "profession",
    skill: "profession",
    skill_level: "profession_level",
    faction: "faction",
    faction_req: "faction",
    reputation: "reputation",
    reputation_req: "reputation",
    quest: "quest",
    quest_req: "quest",
    prerequisite: "quest",
    knowledge: "knowledge",
    knowledge_req: "knowledge",
    item: "item",
    item_req: "item",
    resource: "resource",
    resource_req: "resource",
    tool: "tool",
    tool_req: "tool",
    required_tool: "tool",
    station_type: "station",
    required_station: "station",
    tier: "station_tier",
    biome: "biome_context",
    time: "time_condition",
    weather: "weather_condition",
    game_version: "version",
    version: "version",
  };

  const UNLOCK_ALIASES = {
    quest: "quest_unlock",
    knowledge: "knowledge_unlock",
    recipe: "recipe_unlock",
    area: "area_access",
    vendor: "vendor_access",
    profession: "profession_unlock",
    skill: "skill_unlock",
    title: "title_unlock",
    mount: "mount_unlock",
    event: "event_unlock",
    faction: "faction_unlock",
    achievement: "achievement_unlock",
    unlock: "quest_unlock",
  };

  const PROGRESSION_ALIASES = {
    level: "level",
    profession_level: "profession_level",
    faction_reputation: "faction_reputation",
    reputation: "faction_reputation",
    quest_progress: "quest_progress",
    achievement: "achievement_progress",
    skill: "skill_progress",
    knowledge: "knowledge_progress",
    story: "story_progress",
    event: "event_progress",
  };

  const ACCESS_ALIASES = {
    open: "unlocked",
    available: "unlocked",
    closed: "locked",
    gated: "locked",
    conditional: "conditional",
    unavailable: "unavailable",
    deprecated: "deprecated",
  };

  const SCOPE_ALIASES = {
    entry: "entry",
    recipe: "recipe",
    quest: "quest",
    event: "event",
    vendor: "vendor_offer",
    vendor_offer: "vendor_offer",
    npc: "npc_service",
    npc_service: "npc_service",
    resource_node: "resource_node",
    creature: "creature_encounter",
    creature_encounter: "creature_encounter",
    profession: "profession",
    observation: "observation",
  };

  const FIELD_ALIASES = {
    level: "required_level",
    faction: "faction_req",
    reputation: "reputation_req",
    quest: "quest_req",
    knowledge: "knowledge_req",
    item: "item_req",
    resource: "resource_req",
    tool: "tool_req",
    required_tool: "tool_req",
    required_station: "station",
    tier: "station_tier",
    unlock: "unlock_type",
    access: "access_state",
  };

  function slugKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function meaningful(value) {
    const clean = String(value == null ? "" : value).trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    if (["unknown", "unclear", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) {
      return "";
    }
    return clean;
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
      .trim();
  }

  function normalizeFromList(value, allowed, aliases) {
    const slug = slugKey(value);
    if (!slug) return null;
    if (allowed.indexOf(slug) >= 0) return slug;
    if (aliases && aliases[slug]) return aliases[slug];
    return "unknown";
  }

  function readField(source, field) {
    if (!source || !field) return undefined;
    if (Object.prototype.hasOwnProperty.call(source, field)) return source[field];
    const payload = source.discovery_payload && typeof source.discovery_payload === "object"
      ? source.discovery_payload
      : null;
    if (payload && Object.prototype.hasOwnProperty.call(payload, field)) return payload[field];
    const recipe = payload && payload.recipe && typeof payload.recipe === "object"
      ? payload.recipe
      : (source.recipe && typeof source.recipe === "object" ? source.recipe : null);
    if (recipe && Object.prototype.hasOwnProperty.call(recipe, field)) return recipe[field];
    const resource = payload && payload.resource && typeof payload.resource === "object"
      ? payload.resource
      : (source.resource && typeof source.resource === "object" ? source.resource : null);
    if (resource && Object.prototype.hasOwnProperty.call(resource, field)) return resource[field];
    const meta = source.meta && typeof source.meta === "object" ? source.meta : null;
    if (meta && Object.prototype.hasOwnProperty.call(meta, field)) return meta[field];
    if (meta && meta.discovery_payload) {
      const mp = meta.discovery_payload;
      if (mp && Object.prototype.hasOwnProperty.call(mp, field)) return mp[field];
      if (mp && mp.recipe && Object.prototype.hasOwnProperty.call(mp.recipe, field)) return mp.recipe[field];
    }
    if (source.requirements && typeof source.requirements === "object" &&
        Object.prototype.hasOwnProperty.call(source.requirements, field)) {
      return source.requirements[field];
    }
    return undefined;
  }

  function normalizeArrayField(value) {
    if (value == null) return [];
    const list = Array.isArray(value) ? value.slice() : [value];
    return list.map(function(entry) {
      if (entry == null) return null;
      if (typeof entry === "object") return entry;
      const clean = meaningful(entry);
      return clean || null;
    }).filter(Boolean);
  }

  function normalizeRequirementType(value) {
    return normalizeFromList(value, REQUIREMENT_TYPES, REQUIREMENT_ALIASES);
  }

  function normalizeUnlockType(value) {
    return normalizeFromList(value, UNLOCK_TYPES, UNLOCK_ALIASES);
  }

  function normalizeProgressionContextType(value) {
    return normalizeFromList(value, PROGRESSION_CONTEXT_TYPES, PROGRESSION_ALIASES);
  }

  function normalizeAccessState(value) {
    return normalizeFromList(value, ACCESS_STATES, ACCESS_ALIASES);
  }

  function normalizeRequirementScopeType(value) {
    return normalizeFromList(value, REQUIREMENT_SCOPE_TYPES, SCOPE_ALIASES);
  }

  function normalizeRequirementField(value) {
    const slug = slugKey(value);
    if (!slug) return null;
    if (REQUIREMENT_FIELDS.indexOf(slug) >= 0) return slug;
    if (FIELD_ALIASES[slug]) return FIELD_ALIASES[slug];
    return null;
  }

  function normalizeRequirementRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const type = normalizeRequirementType(src.type || src.kind || src.requirement_type);
    const out = {};
    if (type && type !== "unknown") out.type = type;
    const val = src.value != null ? src.value : (src.level != null ? src.level : src.target);
    if (val != null && val !== "") {
      if (typeof val === "number" || !isNaN(Number(val))) out.value = Number(val);
      else {
        const clean = meaningful(val);
        if (clean) out.value = clean;
      }
    }
    const profession = meaningful(src.profession || src.profession_name);
    if (profession) out.profession = profession;
    const target = meaningful(src.target || src.ref || src.name);
    if (target) out.target = target;
    if (!Object.keys(out).length) return null;
    return out;
  }

  function normalizeUnlockRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const unlockType = normalizeUnlockType(src.unlock_type || src.type || src.kind);
    const out = {};
    if (unlockType && unlockType !== "unknown") out.unlock_type = unlockType;
    const target = meaningful(src.target || src.ref || src.name);
    if (target) out.target = target;
    if (!Object.keys(out).length) return null;
    return out;
  }

  function normalizeProgressionContext(record) {
    const src = record && typeof record === "object" ? record : {};
    const progType = normalizeProgressionContextType(
      src.progression_type || src.type || src.kind || src.context_type
    );
    const out = {};
    if (progType && progType !== "unknown") out.progression_type = progType;
    const val = src.value != null ? src.value : (src.level != null ? src.level : src.progress);
    if (val != null && val !== "") {
      if (typeof val === "number" || !isNaN(Number(val))) out.value = Number(val);
      else {
        const clean = meaningful(val);
        if (clean) out.value = clean;
      }
    }
    const profession = meaningful(src.profession);
    if (profession) out.profession = profession;
    if (!Object.keys(out).length) return null;
    return out;
  }

  function normalizeAccessContext(record) {
    const src = record && typeof record === "object" ? record : {};
    const state = normalizeAccessState(src.access_state || src.state || src.status);
    const out = {};
    if (state && state !== "unknown") out.access_state = state;
    const faction = meaningful(src.faction_req || src.faction);
    if (faction) out.faction_req = faction;
    const level = readField(src, "required_level");
    if (level != null && level !== "" && !isNaN(Number(level))) out.required_level = Number(level);
    if (!Object.keys(out).length) return null;
    return out;
  }

  function normalizeRequirementSet(record) {
    const src = record && typeof record === "object" ? record : {};
    const list = normalizeArrayField(src.requirements || src.requirement_set);
    const normalized = list.map(function(entry) {
      return typeof entry === "object" ? normalizeRequirementRecord(entry) : null;
    }).filter(Boolean);
    if (normalized.length) return { requirements: normalized };
    const singles = [];
    const fieldMap = [
      ["required_level", "required_level"], ["profession", "profession"], ["profession_level", "profession_level"],
      ["faction_req", "faction"], ["reputation_req", "reputation"], ["quest_req", "quest"],
      ["knowledge_req", "knowledge"], ["item_req", "item"], ["resource_req", "resource"],
      ["tool_req", "tool"], ["station", "station"], ["station_tier", "station_tier"],
      ["biome_context", "biome_context"], ["time_condition", "time_condition"],
      ["weather_condition", "weather_condition"],
    ];
    fieldMap.forEach(function(pair) {
      const raw = readField(src, pair[0]);
      if (raw == null || raw === "") return;
      singles.push(normalizeRequirementRecord({ type: pair[1], value: raw }));
    });
    const reqs = singles.filter(Boolean);
    if (!reqs.length) return null;
    return { requirements: reqs };
  }

  function pushSignal(bucket, raw, meta) {
    const clean = meaningful(String(raw == null ? "" : raw));
    if (!clean) return;
    const key = (meta.group || "requirement_context") + ":" + slugKey(clean);
    if (bucket._seen.has(key)) return;
    bucket._seen.add(key);
    bucket.list.push({
      raw: clean,
      normalized: slugKey(clean).replace(/_/g, " "),
      group: meta.group || "requirement_context",
      label: meta.label || titleCase(clean),
    });
  }

  function extractRequirementSignals(source) {
    const bucket = { list: [], _seen: new Set() };
    const src = source && typeof source === "object" ? source : {};
    const set = normalizeRequirementSet(src);
    if (set && set.requirements) {
      set.requirements.forEach(function(req) {
        if (!req || !req.type || req.type === "unknown") return;
        const label = getRequirementTypeLabel(req.type);
        const raw = req.value != null ? req.type + " " + req.value : req.type;
        pushSignal(bucket, raw, { group: "requirement_context", label: label });
      });
    }
    return bucket.list;
  }

  function extractUnlockSignals(source) {
    const bucket = { list: [], _seen: new Set() };
    const src = source && typeof source === "object" ? source : {};
    const unlockType = normalizeUnlockType(readField(src, "unlock_type") || src.unlock_type);
    if (unlockType && unlockType !== "unknown") {
      pushSignal(bucket, unlockType, { group: "unlock_context", label: getUnlockTypeLabel(unlockType) });
    }
    normalizeArrayField(readField(src, "unlocks") || src.unlocks).forEach(function(entry) {
      const rec = typeof entry === "object" ? normalizeUnlockRecord(entry) : normalizeUnlockRecord({ unlock_type: entry });
      if (rec && rec.unlock_type && rec.unlock_type !== "unknown") {
        pushSignal(bucket, rec.unlock_type, { group: "unlock_context", label: getUnlockTypeLabel(rec.unlock_type) });
      }
    });
    return bucket.list;
  }

  function extractProgressionSignals(source) {
    const bucket = { list: [], _seen: new Set() };
    const src = source && typeof source === "object" ? source : {};
    const prog = normalizeProgressionContext(src);
    if (prog && prog.progression_type && prog.progression_type !== "unknown") {
      const raw = prog.value != null ? prog.progression_type + " " + prog.value : prog.progression_type;
      pushSignal(bucket, raw, { group: "progression_context", label: getProgressionContextLabel(prog.progression_type) });
    }
    const profLevel = readField(src, "profession_level");
    if (profLevel != null && profLevel !== "") {
      pushSignal(bucket, "profession_level " + profLevel, { group: "progression_context", label: "Profession Level" });
    }
    return bucket.list;
  }

  function extractAccessSignals(source) {
    const bucket = { list: [], _seen: new Set() };
    const src = source && typeof source === "object" ? source : {};
    const access = normalizeAccessContext(src);
    if (access && access.access_state && access.access_state !== "unknown") {
      pushSignal(bucket, access.access_state, { group: "access_context", label: getAccessStateLabel(access.access_state) });
    }
    return bucket.list;
  }

  function mapSignals(list) {
    return (list || []).map(function(s) {
      return { raw: s.raw, group: s.group, label: s.label, normalized: s.normalized };
    });
  }

  function getRequirementSearchSignals(source) {
    return mapSignals(extractRequirementSignals(source));
  }

  function getUnlockSearchSignals(source) {
    return mapSignals(extractUnlockSignals(source));
  }

  function getProgressionSearchSignals(source) {
    return mapSignals(extractProgressionSignals(source));
  }

  function getAccessSearchSignals(source) {
    return mapSignals(extractAccessSignals(source));
  }

  function getRequirementTypeLabel(value) {
    const kind = normalizeRequirementType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind.replace(/_/g, " "));
  }

  function getUnlockTypeLabel(value) {
    const kind = normalizeUnlockType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind.replace(/_/g, " "));
  }

  function getProgressionContextLabel(value) {
    const kind = normalizeProgressionContextType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind.replace(/_/g, " "));
  }

  function getAccessStateLabel(value) {
    const kind = normalizeAccessState(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind);
  }

  function getRequirementScopeLabel(value) {
    const kind = normalizeRequirementScopeType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind.replace(/_/g, " "));
  }

  function hasExplicitRequirements(source) {
    const src = source && typeof source === "object" ? source : {};
    const set = normalizeRequirementSet(src);
    if (set && set.requirements && set.requirements.length) return true;
    const level = readField(src, "required_level");
    return level != null && level !== "" && !isNaN(Number(level));
  }

  function hasExplicitUnlocks(source) {
    const src = source && typeof source === "object" ? source : {};
    const unlockType = normalizeUnlockType(readField(src, "unlock_type") || src.unlock_type);
    if (unlockType && unlockType !== "unknown") return true;
    const unlocks = normalizeArrayField(readField(src, "unlocks") || src.unlocks);
    return unlocks.length > 0;
  }

  function hasProgressionContext(source) {
    const src = source && typeof source === "object" ? source : {};
    const prog = normalizeProgressionContext(src);
    if (prog && prog.progression_type && prog.progression_type !== "unknown") return true;
    const profLevel = readField(src, "profession_level");
    return profLevel != null && profLevel !== "" && !isNaN(Number(profLevel));
  }

  function hasAccessContext(source) {
    const src = source && typeof source === "object" ? source : {};
    const state = normalizeAccessState(readField(src, "access_state") || src.access_state);
    return !!(state && state !== "unknown");
  }

  function shouldRenderRequirementSection(record, section) {
    if (!RENDER_SECTIONS_ENABLED || !section) return false;
    const slug = slugKey(section);
    if (slug === "requirements" || slug === "requirement") return hasExplicitRequirements(record);
    if (slug === "unlocks" || slug === "unlock") return hasExplicitUnlocks(record);
    if (slug === "progression") return hasProgressionContext(record);
    if (slug === "access") return hasAccessContext(record);
    return false;
  }

  function shouldPromoteRequirementToPost(record) {
    void record;
    return PROMOTE_REQUIREMENT_TO_POST;
  }

  function shouldPromoteUnlockToPost(record) {
    void record;
    return PROMOTE_UNLOCK_TO_POST;
  }

  function resolveRequirementUnlockContext(record) {
    const source = record && typeof record === "object" ? record : {};
    const requirementSet = normalizeRequirementSet(source);
    const signals = []
      .concat(extractRequirementSignals(source))
      .concat(extractUnlockSignals(source))
      .concat(extractProgressionSignals(source))
      .concat(extractAccessSignals(source));
    return {
      requirement_set: requirementSet,
      unlock: normalizeUnlockRecord(source),
      progression: normalizeProgressionContext(source),
      access: normalizeAccessContext(source),
      has_requirements: hasExplicitRequirements(source),
      has_unlocks: hasExplicitUnlocks(source),
      has_progression: hasProgressionContext(source),
      has_access: hasAccessContext(source),
      render_sections: RENDER_SECTIONS_ENABLED,
      promote_requirement: shouldPromoteRequirementToPost(source),
      promote_unlock: shouldPromoteUnlockToPost(source),
      signals: mapSignals(signals),
    };
  }

  return {
    REQUIREMENT_TYPES: REQUIREMENT_TYPES.slice(),
    UNLOCK_TYPES: UNLOCK_TYPES.slice(),
    PROGRESSION_CONTEXT_TYPES: PROGRESSION_CONTEXT_TYPES.slice(),
    ACCESS_STATES: ACCESS_STATES.slice(),
    REQUIREMENT_SCOPE_TYPES: REQUIREMENT_SCOPE_TYPES.slice(),
    REQUIREMENT_FIELDS: REQUIREMENT_FIELDS.slice(),
    normalizeRequirementType: normalizeRequirementType,
    normalizeUnlockType: normalizeUnlockType,
    normalizeProgressionContextType: normalizeProgressionContextType,
    normalizeAccessState: normalizeAccessState,
    normalizeRequirementScopeType: normalizeRequirementScopeType,
    normalizeRequirementField: normalizeRequirementField,
    normalizeRequirementRecord: normalizeRequirementRecord,
    normalizeUnlockRecord: normalizeUnlockRecord,
    normalizeProgressionContext: normalizeProgressionContext,
    normalizeAccessContext: normalizeAccessContext,
    normalizeRequirementSet: normalizeRequirementSet,
    extractRequirementSignals: extractRequirementSignals,
    extractUnlockSignals: extractUnlockSignals,
    extractProgressionSignals: extractProgressionSignals,
    extractAccessSignals: extractAccessSignals,
    getRequirementSearchSignals: getRequirementSearchSignals,
    getUnlockSearchSignals: getUnlockSearchSignals,
    getProgressionSearchSignals: getProgressionSearchSignals,
    getAccessSearchSignals: getAccessSearchSignals,
    getRequirementTypeLabel: getRequirementTypeLabel,
    getUnlockTypeLabel: getUnlockTypeLabel,
    getProgressionContextLabel: getProgressionContextLabel,
    getAccessStateLabel: getAccessStateLabel,
    getRequirementScopeLabel: getRequirementScopeLabel,
    hasExplicitRequirements: hasExplicitRequirements,
    hasExplicitUnlocks: hasExplicitUnlocks,
    hasProgressionContext: hasProgressionContext,
    hasAccessContext: hasAccessContext,
    shouldRenderRequirementSection: shouldRenderRequirementSection,
    shouldPromoteRequirementToPost: shouldPromoteRequirementToPost,
    shouldPromoteUnlockToPost: shouldPromoteUnlockToPost,
    resolveRequirementUnlockContext: resolveRequirementUnlockContext,
  };
})();
