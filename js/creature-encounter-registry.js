// ============================================
// BoundLore Creature Encounter Registry
// P2-G.1 — encounter, spawn, behavior, drop context baseline.
// Structured fields/observations only — no encounter posts, no loot UI, no DB.
//
// Drop facts stay compatible with drops / dropped_by relations.
// No element taxonomy inference from item names (e.g. "QA Staff of Fire").
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreCreatureEncounterRegistry = (function() {
  const CREATURE_BEHAVIOR_TYPES = [
    "aggressive", "hostile", "passive", "neutral", "defensive", "territorial",
    "fleeing", "patrol", "ambush", "caster", "ranged", "melee", "support",
    "boss", "elite", "unknown",
  ];

  const ENCOUNTER_TYPES = [
    "overworld", "dungeon", "boss", "rare_spawn", "event_spawn", "quest_encounter",
    "patrol", "ambush", "camp", "lair", "unknown",
  ];

  const SPAWN_CONTEXT_TYPES = [
    "fixed", "random", "conditional", "event_based", "quest_based", "time_based",
    "weather_based", "biome_based", "proximity_based", "unknown",
  ];

  const DROP_CONTEXT_TYPES = [
    "guaranteed", "common", "uncommon", "rare", "very_rare", "conditional",
    "quest_only", "event_only", "unknown",
  ];

  const COMBAT_AFFINITY_TYPES = [
    "weakness", "resistance", "immunity", "vulnerability", "neutral", "unknown",
  ];

  const DAMAGE_CONTEXT_TYPES = [
    "physical", "fire", "ice", "lightning", "poison", "arcane", "holy", "shadow",
    "blunt", "slash", "pierce", "unknown",
  ];

  const CREATURE_OBSERVATION_FIELDS = [
    "behavior", "encounter_type", "spawn_context", "drop_context", "drop_chance",
    "drop_rate", "loot", "weakness", "resistance", "biome_context", "location_ref",
    "coordinates", "time_condition", "weather_condition", "evidence", "confidence",
    "versioning", "notes", "creature_observations", "combat_affinities",
  ];

  const RENDER_SECTIONS_ENABLED = false;
  const PROMOTE_ENCOUNTER_TO_POST = false;
  const PROMOTE_SPAWN_TO_POST = false;
  const PROMOTE_DROP_TO_POST = false;

  const BEHAVIOR_ALIASES = {
    aggressive: "aggressive", aggro: "aggressive",
    hostile: "hostile", enemy: "hostile",
    passive: "passive", friendly: "passive",
    neutral: "neutral",
    defensive: "defensive", defend: "defensive",
    territorial: "territorial", territory: "territorial",
    fleeing: "fleeing", flee: "fleeing",
    patrol: "patrol", patrolling: "patrol",
    ambush: "ambush",
    caster: "caster", magic: "caster", spellcaster: "caster",
    ranged: "ranged", range: "ranged",
    melee: "melee", close: "melee",
    support: "support", healer: "support",
    boss: "boss",
    elite: "elite",
  };

  const ENCOUNTER_ALIASES = {
    overworld: "overworld", open_world: "overworld",
    dungeon: "dungeon",
    boss: "boss", boss_fight: "boss",
    rare_spawn: "rare_spawn", rare: "rare_spawn",
    event_spawn: "event_spawn", event: "event_spawn",
    quest_encounter: "quest_encounter", quest: "quest_encounter",
    patrol: "patrol",
    ambush: "ambush",
    camp: "camp",
    lair: "lair",
  };

  const SPAWN_ALIASES = {
    fixed: "fixed", static: "fixed",
    random: "random",
    conditional: "conditional", condition: "conditional",
    event_based: "event_based",
    quest_based: "quest_based",
    time_based: "time_based", time: "time_based",
    weather_based: "weather_based", weather: "weather_based",
    biome_based: "biome_based", biome: "biome_based",
    proximity_based: "proximity_based", proximity: "proximity_based",
  };

  const DROP_ALIASES = {
    guaranteed: "guaranteed", always: "guaranteed",
    common: "common",
    uncommon: "uncommon",
    rare: "rare",
    very_rare: "very_rare", veryrare: "very_rare",
    conditional: "conditional",
    quest_only: "quest_only",
    event_only: "event_only",
  };

  const AFFINITY_ALIASES = {
    weakness: "weakness", weak: "weakness", weak_to: "weakness",
    resistance: "resistance", resistant: "resistance", resistant_to: "resistance",
    immunity: "immunity", immune: "immunity",
    vulnerability: "vulnerability", vulnerable: "vulnerability",
    neutral: "neutral",
  };

  const DAMAGE_ALIASES = {
    physical: "physical", phys: "physical",
    fire: "fire", flame: "fire",
    ice: "ice", frost: "ice", cold: "ice",
    lightning: "lightning", shock: "lightning", electric: "lightning",
    poison: "poison", toxic: "poison",
    arcane: "arcane", magic: "arcane",
    holy: "holy", light: "holy",
    shadow: "shadow", dark: "shadow",
    blunt: "blunt", crush: "blunt",
    slash: "slash", slashing: "slash",
    pierce: "pierce", piercing: "pierce",
  };

  const FIELD_ALIASES = {
    behaviour: "behavior",
    encounter: "encounter_type",
    spawn: "spawn_context",
    drop: "drop_context",
    drop_chance: "drop_chance",
    drop_rate: "drop_rate",
    loot_table: "loot",
    weaknesses: "weakness",
    resistances: "resistance",
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
    const creature = payload && payload.creature && typeof payload.creature === "object"
      ? payload.creature
      : (source.creature && typeof source.creature === "object" ? source.creature : null);
    if (creature && Object.prototype.hasOwnProperty.call(creature, field)) return creature[field];
    const meta = source.meta && typeof source.meta === "object" ? source.meta : null;
    if (meta && Object.prototype.hasOwnProperty.call(meta, field)) return meta[field];
    if (meta && meta.discovery_payload) {
      const mp = meta.discovery_payload;
      if (mp && Object.prototype.hasOwnProperty.call(mp, field)) return mp[field];
      if (mp && mp.creature && Object.prototype.hasOwnProperty.call(mp.creature, field)) return mp.creature[field];
    }
    if (source.creature_observations && typeof source.creature_observations === "object" &&
        Object.prototype.hasOwnProperty.call(source.creature_observations, field)) {
      return source.creature_observations[field];
    }
    if (source.creature_encounter && typeof source.creature_encounter === "object" &&
        Object.prototype.hasOwnProperty.call(source.creature_encounter, field)) {
      return source.creature_encounter[field];
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

  function normalizeCreatureBehaviorType(value) {
    return normalizeFromList(value, CREATURE_BEHAVIOR_TYPES, BEHAVIOR_ALIASES);
  }

  function normalizeEncounterType(value) {
    return normalizeFromList(value, ENCOUNTER_TYPES, ENCOUNTER_ALIASES);
  }

  function normalizeSpawnContextType(value) {
    return normalizeFromList(value, SPAWN_CONTEXT_TYPES, SPAWN_ALIASES);
  }

  function normalizeDropContextType(value) {
    return normalizeFromList(value, DROP_CONTEXT_TYPES, DROP_ALIASES);
  }

  function normalizeCombatAffinityType(value) {
    return normalizeFromList(value, COMBAT_AFFINITY_TYPES, AFFINITY_ALIASES);
  }

  function normalizeDamageContextType(value) {
    return normalizeFromList(value, DAMAGE_CONTEXT_TYPES, DAMAGE_ALIASES);
  }

  function normalizeCreatureObservationField(value) {
    const slug = slugKey(value);
    if (!slug) return null;
    if (CREATURE_OBSERVATION_FIELDS.indexOf(slug) >= 0) return slug;
    if (FIELD_ALIASES[slug]) return FIELD_ALIASES[slug];
    return null;
  }

  function normalizeCreatureBehaviorRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const behavior = normalizeCreatureBehaviorType(readField(src, "behavior") || src.behavior);
    if (!behavior || behavior === "unknown") return null;
    return { behavior: behavior };
  }

  function normalizeEncounterRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const encounterType = normalizeEncounterType(readField(src, "encounter_type") || src.encounter_type);
    if (!encounterType || encounterType === "unknown") return null;
    return { encounter_type: encounterType };
  }

  function normalizeSpawnContextRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const spawnContext = normalizeSpawnContextType(readField(src, "spawn_context") || src.spawn_context);
    const out = {};
    if (spawnContext && spawnContext !== "unknown") out.spawn_context = spawnContext;
    const time = readField(src, "time_condition") || src.time_condition;
    const weather = readField(src, "weather_condition") || src.weather_condition;
    const biome = readField(src, "biome_context") || src.biome_context;
    const loc = readField(src, "location_ref") || src.location_ref;
    if (meaningful(time)) out.time_condition = meaningful(time);
    if (meaningful(weather)) out.weather_condition = meaningful(weather);
    if (meaningful(biome)) out.biome_context = meaningful(biome);
    if (meaningful(loc)) out.location_ref = meaningful(loc);
    if (!Object.keys(out).length) return null;
    return out;
  }

  function normalizeDropContextRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const dropContext = normalizeDropContextType(readField(src, "drop_context") || src.drop_context);
    const out = {};
    if (dropContext && dropContext !== "unknown") out.drop_context = dropContext;
    const chance = readField(src, "drop_chance") ?? src.drop_chance;
    const rate = readField(src, "drop_rate") ?? src.drop_rate;
    if (chance != null && chance !== "" && !isNaN(Number(chance))) out.drop_chance = Number(chance);
    if (rate != null && rate !== "" && meaningful(String(rate))) out.drop_rate = meaningful(String(rate));
    const loot = normalizeArrayField(readField(src, "loot") || src.loot);
    if (loot.length) out.loot = loot;
    if (!Object.keys(out).length) return null;
    return out;
  }

  function normalizeCombatAffinityRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const type = normalizeCombatAffinityType(src.type || src.affinity_type || src.affinity);
    const damage = normalizeDamageContextType(src.damage_type || src.damage || src.element);
    const out = {};
    if (type && type !== "unknown") out.type = type;
    if (damage && damage !== "unknown") out.damage_type = damage;
    const target = meaningful(src.target || src.value);
    if (target) out.target = target;
    if (!Object.keys(out).length) return null;
    return out;
  }

  function normalizeExplicitAffinityList(fieldName, value) {
    const items = normalizeArrayField(value);
    const out = [];
    items.forEach(function(entry) {
      if (typeof entry === "object" && entry) {
        const rec = normalizeCombatAffinityRecord(Object.assign({}, entry, {
          type: entry.type || fieldName.replace(/s$/, ""),
        }));
        if (rec) out.push(rec);
        return;
      }
      const damage = normalizeDamageContextType(entry);
      if (damage && damage !== "unknown") {
        out.push({
          type: fieldName === "weakness" ? "weakness" : "resistance",
          damage_type: damage,
        });
      }
    });
    return out;
  }

  function normalizeCreatureObservationRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const out = {};
    const behavior = normalizeCreatureBehaviorRecord(src);
    if (behavior) Object.assign(out, behavior);
    const encounter = normalizeEncounterRecord(src);
    if (encounter) Object.assign(out, encounter);
    const spawn = normalizeSpawnContextRecord(src);
    if (spawn) Object.assign(out, spawn);
    const drop = normalizeDropContextRecord(src);
    if (drop) Object.assign(out, drop);
    const weaknesses = normalizeExplicitAffinityList("weakness", readField(src, "weakness") || src.weakness);
    const resistances = normalizeExplicitAffinityList("resistance", readField(src, "resistance") || src.resistance);
    if (weaknesses.length) out.weakness = weaknesses;
    if (resistances.length) out.resistance = resistances;
    const affinities = normalizeArrayField(readField(src, "combat_affinities") || src.combat_affinities);
    if (affinities.length) {
      out.combat_affinities = affinities.map(function(a) {
        return normalizeCombatAffinityRecord(a);
      }).filter(Boolean);
    }
    const notes = meaningful(readField(src, "notes") || src.notes);
    if (notes) out.notes = notes.slice(0, 500);
    return Object.keys(out).length ? out : null;
  }

  function pushSignal(bucket, raw, meta) {
    const clean = meaningful(raw);
    if (!clean) return;
    const key = (meta.group || "creature_encounter") + ":" + slugKey(clean);
    if (bucket._seen.has(key)) return;
    bucket._seen.add(key);
    bucket.list.push({
      raw: clean,
      normalized: slugKey(clean).replace(/_/g, " "),
      group: meta.group || "creature_encounter",
      label: meta.label || titleCase(clean),
    });
  }

  function extractCreatureBehaviorSignals(source) {
    const bucket = { list: [], _seen: new Set() };
    const src = source && typeof source === "object" ? source : {};
    const behavior = normalizeCreatureBehaviorType(readField(src, "behavior") || src.behavior);
    if (behavior && behavior !== "unknown") {
      pushSignal(bucket, behavior, { group: "creature_encounter", label: getCreatureBehaviorLabel(behavior) });
    }
    return bucket.list;
  }

  function extractEncounterSignals(source) {
    const bucket = { list: [], _seen: new Set() };
    const src = source && typeof source === "object" ? source : {};
    const encounter = normalizeEncounterType(readField(src, "encounter_type") || src.encounter_type);
    if (encounter && encounter !== "unknown") {
      pushSignal(bucket, encounter, { group: "creature_encounter", label: getEncounterTypeLabel(encounter) });
    }
    return bucket.list;
  }

  function extractSpawnSignals(source) {
    const bucket = { list: [], _seen: new Set() };
    const src = source && typeof source === "object" ? source : {};
    const spawn = normalizeSpawnContextType(readField(src, "spawn_context") || src.spawn_context);
    if (spawn && spawn !== "unknown") {
      pushSignal(bucket, spawn, { group: "spawn_context", label: getSpawnContextLabel(spawn) });
    }
    return bucket.list;
  }

  function extractDropSignals(source) {
    const bucket = { list: [], _seen: new Set() };
    const src = source && typeof source === "object" ? source : {};
    const dropContext = normalizeDropContextType(readField(src, "drop_context") || src.drop_context);
    if (dropContext && dropContext !== "unknown") {
      pushSignal(bucket, dropContext, { group: "drop_context", label: getDropContextLabel(dropContext) });
    }
    const rate = meaningful(String(readField(src, "drop_rate") || src.drop_rate || ""));
    const chance = readField(src, "drop_chance") ?? src.drop_chance;
    if (rate) pushSignal(bucket, rate, { group: "drop_context", label: "Drop rate" });
    if (chance != null && chance !== "" && !isNaN(Number(chance))) {
      pushSignal(bucket, String(chance), { group: "drop_context", label: "Drop chance" });
    }
    normalizeArrayField(readField(src, "loot") || src.loot).forEach(function(item) {
      const name = typeof item === "object"
        ? meaningful(item.name || item.title || item.label)
        : meaningful(item);
      if (name) pushSignal(bucket, name, { group: "drop_context", label: "Loot" });
    });
    return bucket.list;
  }

  function extractCombatAffinitySignals(source) {
    const bucket = { list: [], _seen: new Set() };
    const src = source && typeof source === "object" ? source : {};
    normalizeExplicitAffinityList("weakness", readField(src, "weakness") || src.weakness).forEach(function(entry) {
      if (entry.damage_type && entry.damage_type !== "unknown") {
        pushSignal(bucket, entry.damage_type + " weakness", {
          group: "combat_affinity",
          label: getCombatAffinityLabel("weakness"),
        });
      }
    });
    normalizeExplicitAffinityList("resistance", readField(src, "resistance") || src.resistance).forEach(function(entry) {
      if (entry.damage_type && entry.damage_type !== "unknown") {
        pushSignal(bucket, entry.damage_type + " resistance", {
          group: "combat_affinity",
          label: getCombatAffinityLabel("resistance"),
        });
      }
    });
    normalizeArrayField(readField(src, "combat_affinities") || src.combat_affinities).forEach(function(entry) {
      const rec = normalizeCombatAffinityRecord(entry);
      if (!rec || !rec.damage_type || rec.damage_type === "unknown") return;
      if (!rec.type || rec.type === "unknown") return;
      pushSignal(bucket, rec.damage_type + " " + rec.type, {
        group: "combat_affinity",
        label: getCombatAffinityLabel(rec.type),
      });
    });
    return bucket.list;
  }

  function extractCreatureObservationSignals(source) {
    const bucket = { list: [], _seen: new Set() };
    [
      extractCreatureBehaviorSignals(source),
      extractEncounterSignals(source),
      extractSpawnSignals(source),
      extractDropSignals(source),
      extractCombatAffinitySignals(source),
    ].forEach(function(list) {
      list.forEach(function(entry) {
        pushSignal(bucket, entry.raw, { group: entry.group, label: entry.label });
      });
    });
    return bucket.list.map(function(entry) {
      return { raw: entry.raw, group: entry.group, label: entry.label, normalized: entry.normalized };
    });
  }

  function getCreatureBehaviorSearchSignals(source) {
    return extractCreatureBehaviorSignals(source).map(function(s) {
      return { raw: s.raw, group: s.group, label: s.label, normalized: s.normalized };
    });
  }

  function getEncounterSearchSignals(source) {
    return extractEncounterSignals(source).map(function(s) {
      return { raw: s.raw, group: s.group, label: s.label, normalized: s.normalized };
    });
  }

  function getSpawnSearchSignals(source) {
    return extractSpawnSignals(source).map(function(s) {
      return { raw: s.raw, group: s.group, label: s.label, normalized: s.normalized };
    });
  }

  function getDropSearchSignals(source) {
    return extractDropSignals(source).map(function(s) {
      return { raw: s.raw, group: s.group, label: s.label, normalized: s.normalized };
    });
  }

  function getCombatAffinitySearchSignals(source) {
    return extractCombatAffinitySignals(source).map(function(s) {
      return { raw: s.raw, group: s.group, label: s.label, normalized: s.normalized };
    });
  }

  function getCreatureBehaviorLabel(value) {
    const kind = normalizeCreatureBehaviorType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind);
  }

  function getEncounterTypeLabel(value) {
    const kind = normalizeEncounterType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind.replace(/_/g, " "));
  }

  function getSpawnContextLabel(value) {
    const kind = normalizeSpawnContextType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind.replace(/_/g, " "));
  }

  function getDropContextLabel(value) {
    const kind = normalizeDropContextType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind.replace(/_/g, " "));
  }

  function getCombatAffinityLabel(value) {
    const kind = normalizeCombatAffinityType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind);
  }

  function getDamageContextLabel(value) {
    const kind = normalizeDamageContextType(value);
    if (!kind || kind === "unknown") return "";
    return titleCase(kind);
  }

  function hasExplicitCreatureBehavior(source) {
    const kind = normalizeCreatureBehaviorType(readField(source, "behavior"));
    return !!(kind && kind !== "unknown");
  }

  function hasExplicitSpawnContext(source) {
    const kind = normalizeSpawnContextType(readField(source, "spawn_context"));
    return !!(kind && kind !== "unknown");
  }

  function hasExplicitDropContext(source) {
    const src = source && typeof source === "object" ? source : {};
    const kind = normalizeDropContextType(readField(src, "drop_context"));
    if (kind && kind !== "unknown") return true;
    const loot = normalizeArrayField(readField(src, "loot"));
    if (loot.length) return true;
    const rate = meaningful(String(readField(src, "drop_rate") || ""));
    if (rate) return true;
    const chance = readField(src, "drop_chance");
    return chance != null && chance !== "" && !isNaN(Number(chance));
  }

  function hasExplicitCombatAffinity(source) {
    const src = source && typeof source === "object" ? source : {};
    const w = normalizeExplicitAffinityList("weakness", readField(src, "weakness"));
    const r = normalizeExplicitAffinityList("resistance", readField(src, "resistance"));
    if (w.length || r.length) return true;
    const aff = normalizeArrayField(readField(src, "combat_affinities"));
    return aff.some(function(entry) {
      const rec = normalizeCombatAffinityRecord(entry);
      return !!(rec && rec.damage_type && rec.damage_type !== "unknown");
    });
  }

  function shouldRenderCreatureEncounterSection(record, section) {
    if (!RENDER_SECTIONS_ENABLED || !section) return false;
    const slug = slugKey(section);
    if (!slug) return false;
    const src = record && typeof record === "object" ? record : {};
    if (slug === "behavior") return hasExplicitCreatureBehavior(src);
    if (slug === "spawn_context" || slug === "spawn") return hasExplicitSpawnContext(src);
    if (slug === "drop_context" || slug === "drop") return hasExplicitDropContext(src);
    if (slug === "combat_affinity" || slug === "weakness" || slug === "resistance") {
      return hasExplicitCombatAffinity(src);
    }
    const field = normalizeCreatureObservationField(section);
    if (!field) return false;
    const val = readField(src, field);
    if (val == null || val === "") return false;
    if (Array.isArray(val) && !val.length) return false;
    return true;
  }

  function shouldPromoteEncounterToPost(record) {
    void record;
    return PROMOTE_ENCOUNTER_TO_POST;
  }

  function shouldPromoteSpawnToPost(record) {
    void record;
    return PROMOTE_SPAWN_TO_POST;
  }

  function shouldPromoteDropToPost(record) {
    void record;
    return PROMOTE_DROP_TO_POST;
  }

  function resolveCreatureEncounterContext(record) {
    const source = record && typeof record === "object" ? record : {};
    const observation = normalizeCreatureObservationRecord(source);
    const signals = extractCreatureObservationSignals(source);
    return {
      creature_observation: observation,
      behavior: normalizeCreatureBehaviorType(readField(source, "behavior")),
      encounter_type: normalizeEncounterType(readField(source, "encounter_type")),
      spawn_context: normalizeSpawnContextType(readField(source, "spawn_context")),
      drop_context: normalizeDropContextType(readField(source, "drop_context")),
      has_behavior: hasExplicitCreatureBehavior(source),
      has_spawn_context: hasExplicitSpawnContext(source),
      has_drop_context: hasExplicitDropContext(source),
      has_combat_affinity: hasExplicitCombatAffinity(source),
      render_sections: RENDER_SECTIONS_ENABLED,
      promote_encounter: shouldPromoteEncounterToPost(source),
      promote_spawn: shouldPromoteSpawnToPost(source),
      promote_drop: shouldPromoteDropToPost(source),
      signals: signals,
    };
  }

  return {
    CREATURE_BEHAVIOR_TYPES: CREATURE_BEHAVIOR_TYPES.slice(),
    ENCOUNTER_TYPES: ENCOUNTER_TYPES.slice(),
    SPAWN_CONTEXT_TYPES: SPAWN_CONTEXT_TYPES.slice(),
    DROP_CONTEXT_TYPES: DROP_CONTEXT_TYPES.slice(),
    COMBAT_AFFINITY_TYPES: COMBAT_AFFINITY_TYPES.slice(),
    DAMAGE_CONTEXT_TYPES: DAMAGE_CONTEXT_TYPES.slice(),
    CREATURE_OBSERVATION_FIELDS: CREATURE_OBSERVATION_FIELDS.slice(),
    normalizeCreatureBehaviorType: normalizeCreatureBehaviorType,
    normalizeEncounterType: normalizeEncounterType,
    normalizeSpawnContextType: normalizeSpawnContextType,
    normalizeDropContextType: normalizeDropContextType,
    normalizeCombatAffinityType: normalizeCombatAffinityType,
    normalizeDamageContextType: normalizeDamageContextType,
    normalizeCreatureObservationField: normalizeCreatureObservationField,
    normalizeCreatureBehaviorRecord: normalizeCreatureBehaviorRecord,
    normalizeEncounterRecord: normalizeEncounterRecord,
    normalizeSpawnContextRecord: normalizeSpawnContextRecord,
    normalizeDropContextRecord: normalizeDropContextRecord,
    normalizeCombatAffinityRecord: normalizeCombatAffinityRecord,
    normalizeCreatureObservationRecord: normalizeCreatureObservationRecord,
    extractCreatureBehaviorSignals: extractCreatureBehaviorSignals,
    extractEncounterSignals: extractEncounterSignals,
    extractSpawnSignals: extractSpawnSignals,
    extractDropSignals: extractDropSignals,
    extractCombatAffinitySignals: extractCombatAffinitySignals,
    extractCreatureObservationSignals: extractCreatureObservationSignals,
    getCreatureBehaviorSearchSignals: getCreatureBehaviorSearchSignals,
    getEncounterSearchSignals: getEncounterSearchSignals,
    getSpawnSearchSignals: getSpawnSearchSignals,
    getDropSearchSignals: getDropSearchSignals,
    getCombatAffinitySearchSignals: getCombatAffinitySearchSignals,
    getCreatureBehaviorLabel: getCreatureBehaviorLabel,
    getEncounterTypeLabel: getEncounterTypeLabel,
    getSpawnContextLabel: getSpawnContextLabel,
    getDropContextLabel: getDropContextLabel,
    getCombatAffinityLabel: getCombatAffinityLabel,
    getDamageContextLabel: getDamageContextLabel,
    hasExplicitCreatureBehavior: hasExplicitCreatureBehavior,
    hasExplicitSpawnContext: hasExplicitSpawnContext,
    hasExplicitDropContext: hasExplicitDropContext,
    hasExplicitCombatAffinity: hasExplicitCombatAffinity,
    shouldRenderCreatureEncounterSection: shouldRenderCreatureEncounterSection,
    shouldPromoteEncounterToPost: shouldPromoteEncounterToPost,
    shouldPromoteSpawnToPost: shouldPromoteSpawnToPost,
    shouldPromoteDropToPost: shouldPromoteDropToPost,
    resolveCreatureEncounterContext: resolveCreatureEncounterContext,
  };
})();
