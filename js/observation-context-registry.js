// ============================================
// BoundLore Observation Context Registry
// P2-F.1 — location, coordinates, biome, time, weather observation context.
// Structured fields only — no PLACE posts, no map UI, no DB.
//
// Coordinates are observation fields, not location pages.
// Free-text location_ref stays text/search signal only.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreObservationContextRegistry = (function() {
  const OBSERVATION_CONTEXT_TYPES = [
    "location", "coordinate", "biome", "spawn", "resource_node", "event_occurrence",
    "quest_step", "npc_service", "encounter", "unknown",
  ];

  const LOCATION_REFERENCE_TYPES = [
    "place_ref", "biome_ref", "region_ref", "zone_ref", "landmark_ref", "free_text", "unknown",
  ];

  const COORDINATE_SYSTEM_TYPES = [
    "world", "map", "zone", "local", "normalized", "unknown",
  ];

  const TIME_CONDITION_TYPES = [
    "daytime", "nighttime", "dawn", "dusk", "morning", "afternoon", "evening",
    "specific_time", "interval", "always", "unknown",
  ];

  const WEATHER_CONDITION_TYPES = [
    "clear", "rain", "storm", "fog", "snow", "wind", "heat", "cold", "any", "unknown",
  ];

  const BIOME_CONTEXT_TYPES = [
    "swamp", "forest", "desert", "mountain", "cave", "coast", "plains", "ruins", "dungeon", "city", "unknown",
  ];

  const OBSERVATION_FIELDS = [
    "location_ref", "location_type", "coordinates", "coordinate_system", "biome_context",
    "time_condition", "weather_condition", "observed_at", "source_detail", "evidence",
    "confidence", "versioning", "notes",
  ];

  const RENDER_SECTIONS_ENABLED = false;
  const PROMOTE_OBSERVATION_TO_POST = false;
  const PROMOTE_COORDINATES_TO_PLACE = false;

  const CONTEXT_ALIASES = {
    location: "location", place: "location", loc: "location",
    coordinate: "coordinate", coordinates: "coordinate", coords: "coordinate",
    biome: "biome", spawn: "spawn", resource_node: "resource_node",
    event_occurrence: "event_occurrence", event: "event_occurrence",
    quest_step: "quest_step", quest: "quest_step",
    npc_service: "npc_service", encounter: "encounter",
  };

  const LOCATION_REF_ALIASES = {
    place_ref: "place_ref", place: "place_ref", location: "place_ref",
    biome_ref: "biome_ref", biome: "biome_ref",
    region_ref: "region_ref", region: "region_ref", zone_ref: "zone_ref", zone: "zone_ref",
    landmark_ref: "landmark_ref", landmark: "landmark_ref",
    free_text: "free_text", text: "free_text", free: "free_text",
  };

  const COORD_SYSTEM_ALIASES = {
    world: "world", map: "map", zone: "zone", local: "local",
    normalized: "normalized", norm: "normalized",
  };

  const TIME_ALIASES = {
    daytime: "daytime", day: "daytime", day_time: "daytime",
    nighttime: "nighttime", night: "nighttime", night_time: "nighttime",
    dawn: "dawn", dusk: "dusk", morning: "morning", afternoon: "afternoon",
    evening: "evening", specific_time: "specific_time", interval: "interval",
    always: "always", any_time: "always",
  };

  const WEATHER_ALIASES = {
    clear: "clear", sunny: "clear",
    rain: "rain", rainy: "rain", raining: "rain",
    storm: "storm", stormy: "storm", thunder: "storm",
    fog: "fog", foggy: "fog", mist: "fog",
    snow: "snow", snowy: "snow",
    wind: "wind", windy: "wind",
    heat: "heat", hot: "heat",
    cold: "cold", chilly: "cold",
    any: "any", any_weather: "any",
  };

  const BIOME_ALIASES = {
    swamp: "swamp", swamplands: "swamp", marsh: "swamp",
    forest: "forest", woods: "forest", woodland: "forest",
    desert: "desert", mountain: "mountain", mountains: "mountain",
    cave: "cave", cavern: "cave", coast: "coast", coastal: "coast",
    plains: "plains", plain: "plains", field: "plains",
    ruins: "ruins", ruin: "ruins", dungeon: "dungeon", city: "city", town: "city",
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
    const resource = payload && payload.resource && typeof payload.resource === "object"
      ? payload.resource
      : (source.resource && typeof source.resource === "object" ? source.resource : null);
    if (resource && Object.prototype.hasOwnProperty.call(resource, field)) return resource[field];
    const meta = source.meta && typeof source.meta === "object" ? source.meta : null;
    if (meta && Object.prototype.hasOwnProperty.call(meta, field)) return meta[field];
    if (meta && meta.discovery_payload) {
      const mp = meta.discovery_payload;
      if (mp && Object.prototype.hasOwnProperty.call(mp, field)) return mp[field];
      if (mp && mp.resource && Object.prototype.hasOwnProperty.call(mp.resource, field)) return mp.resource[field];
    }
    if (source.observation_context && typeof source.observation_context === "object" &&
        Object.prototype.hasOwnProperty.call(source.observation_context, field)) {
      return source.observation_context[field];
    }
    return undefined;
  }

  function normalizeObservationContextType(value) {
    return normalizeFromList(value, OBSERVATION_CONTEXT_TYPES, CONTEXT_ALIASES);
  }

  function normalizeLocationReferenceType(value) {
    return normalizeFromList(value, LOCATION_REFERENCE_TYPES, LOCATION_REF_ALIASES);
  }

  function normalizeCoordinateSystemType(value) {
    return normalizeFromList(value, COORDINATE_SYSTEM_TYPES, COORD_SYSTEM_ALIASES);
  }

  function normalizeTimeConditionType(value) {
    return normalizeFromList(value, TIME_CONDITION_TYPES, TIME_ALIASES);
  }

  function normalizeWeatherConditionType(value) {
    return normalizeFromList(value, WEATHER_CONDITION_TYPES, WEATHER_ALIASES);
  }

  function normalizeBiomeContextType(value) {
    return normalizeFromList(value, BIOME_CONTEXT_TYPES, BIOME_ALIASES);
  }

  function normalizeObservationField(value) {
    const slug = slugKey(value);
    if (!slug) return null;
    if (OBSERVATION_FIELDS.indexOf(slug) >= 0) return slug;
    return null;
  }

  function normalizeCoordinates(value) {
    if (value == null) return null;
    if (typeof value === "string" || typeof value === "number") {
      const clean = meaningful(value);
      if (!clean) return null;
      const parts = clean.split(/[,\s]+/).map(function(p) { return p.trim(); }).filter(Boolean);
      if (parts.length >= 2 && parts.every(function(p) { return !isNaN(Number(p)); })) {
        const out = { x: Number(parts[0]), y: Number(parts[1]) };
        if (parts.length >= 3 && !isNaN(Number(parts[2]))) out.z = Number(parts[2]);
        out.raw = clean;
        return out;
      }
      return { raw: clean.slice(0, 120) };
    }
    if (typeof value === "object" && !Array.isArray(value)) {
      const src = value;
      const x = src.x != null && !isNaN(Number(src.x)) ? Number(src.x) : null;
      const y = src.y != null && !isNaN(Number(src.y)) ? Number(src.y) : null;
      const z = src.z != null && !isNaN(Number(src.z)) ? Number(src.z) : null;
      const out = {};
      if (x != null) out.x = x;
      if (y != null) out.y = y;
      if (z != null) out.z = z;
      const system = normalizeCoordinateSystemType(src.system || src.coordinate_system);
      if (system && system !== "unknown") out.system = system;
      const mapName = meaningful(src.map);
      if (mapName) out.map = mapName.slice(0, 80);
      const raw = meaningful(src.raw);
      if (raw) out.raw = raw.slice(0, 120);
      if (!Object.keys(out).length) return null;
      return out;
    }
    return null;
  }

  function normalizeLocationReference(record) {
    const src = record && typeof record === "object" ? record : {};
    const type = normalizeLocationReferenceType(
      src.type || src.location_type || readField(src, "location_type")
    );
    const target = meaningful(
      src.target || src.ref || src.location_ref || readField(src, "location_ref") ||
      src.label || src.name || src.title
    );
    if (!target && (!type || type === "unknown")) return null;
    const out = {};
    if (type && type !== "unknown") out.type = type;
    if (target) out.target = target.slice(0, 160);
    return Object.keys(out).length ? out : null;
  }

  function normalizeConditionContext(record) {
    const src = record && typeof record === "object" ? record : {};
    const time = normalizeTimeConditionType(readField(src, "time_condition") || src.time_condition);
    const weather = normalizeWeatherConditionType(readField(src, "weather_condition") || src.weather_condition);
    const biome = normalizeBiomeContextType(readField(src, "biome_context") || src.biome_context);
    const out = {};
    if (time && time !== "unknown") out.time_condition = time;
    if (weather && weather !== "unknown") out.weather_condition = weather;
    if (biome && biome !== "unknown") out.biome_context = biome;
    return Object.keys(out).length ? out : null;
  }

  function normalizeObservationContext(record) {
    const src = record && typeof record === "object" ? record : {};
    const location = normalizeLocationReference(src);
    const coordinates = normalizeCoordinates(readField(src, "coordinates") || src.coordinates);
    const conditions = normalizeConditionContext(src);
    const contextType = normalizeObservationContextType(src.context_type || src.type);
    const observedAt = meaningful(readField(src, "observed_at") || src.observed_at);
    const notes = meaningful(readField(src, "notes") || src.notes);
    const out = {};
    if (contextType && contextType !== "unknown") out.context_type = contextType;
    if (location) out.location_ref = location;
    if (coordinates) out.coordinates = coordinates;
    if (conditions) Object.assign(out, conditions);
    if (observedAt) out.observed_at = observedAt.slice(0, 80);
    if (notes) out.notes = notes.slice(0, 240);
    return Object.keys(out).length ? out : null;
  }

  function normalizeObservationRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const out = {};
    OBSERVATION_FIELDS.forEach(function(field) {
      const raw = readField(src, field);
      if (raw == null || raw === "") return;
      if (field === "coordinates") {
        const normalized = normalizeCoordinates(raw);
        if (normalized) out[field] = normalized;
        return;
      }
      if (field === "location_ref") {
        const loc = normalizeLocationReference(typeof raw === "object" ? raw : { target: raw });
        if (loc) out[field] = loc;
        else {
          const text = meaningful(raw);
          if (text) out[field] = { type: "free_text", target: text.slice(0, 160) };
        }
        return;
      }
      if (field === "location_type") {
        const t = normalizeLocationReferenceType(raw);
        if (t && t !== "unknown") out[field] = t;
        return;
      }
      if (field === "coordinate_system") {
        const t = normalizeCoordinateSystemType(raw);
        if (t && t !== "unknown") out[field] = t;
        return;
      }
      if (field === "time_condition") {
        const t = normalizeTimeConditionType(raw);
        if (t && t !== "unknown") out[field] = t;
        return;
      }
      if (field === "weather_condition") {
        const t = normalizeWeatherConditionType(raw);
        if (t && t !== "unknown") out[field] = t;
        return;
      }
      if (field === "biome_context") {
        const t = normalizeBiomeContextType(raw);
        if (t && t !== "unknown") out[field] = t;
        return;
      }
      const clean = typeof raw === "object" ? raw : meaningful(raw);
      if (clean) out[field] = clean;
    });
    return Object.keys(out).length ? out : null;
  }

  function readExplicitCoordinates(source) {
    return normalizeCoordinates(readField(source, "coordinates"));
  }

  function readExplicitLocationRef(source) {
    const raw = readField(source, "location_ref");
    if (raw == null || raw === "") return null;
    if (typeof raw === "object") return normalizeLocationReference(raw);
    const text = meaningful(raw);
    return text ? { type: "free_text", target: text } : null;
  }

  function hasExplicitCoordinates(source) {
    const coords = readExplicitCoordinates(source);
    if (!coords) return false;
    if (coords.x != null && coords.y != null) return true;
    return !!meaningful(coords.raw);
  }

  function hasExplicitLocationRef(source) {
    return !!readExplicitLocationRef(source);
  }

  function hasConditionContext(source) {
    const ctx = normalizeConditionContext(source || {});
    return !!(ctx && Object.keys(ctx).length);
  }

  function toSignal(entry, group, label) {
    if (!entry || !entry.raw) return null;
    return {
      raw: entry.raw,
      normalized: slugKey(entry.raw).replace(/_/g, " "),
      kind: entry.kind || group,
      label: label || entry.label || entry.raw,
      group: group,
      weight: 2,
      displayable: entry.displayable === true,
      source: "observation_context_registry",
    };
  }

  function extractLocationSignals(source) {
    const signals = [];
    const loc = readExplicitLocationRef(source);
    if (loc && loc.target) {
      signals.push({
        kind: "location_ref",
        raw: loc.target,
        label: getLocationReferenceLabel(loc.type),
        displayable: false,
      });
    }
    const region = meaningful(readField(source, "region_name") || readField(source, "found_in"));
    if (region) {
      signals.push({ kind: "location_ref", raw: region, label: "Region", displayable: false });
    }
    return signals;
  }

  function extractCoordinateSignals(source) {
    const signals = [];
    const coords = readExplicitCoordinates(source);
    if (!coords) return signals;
    if (coords.x != null && coords.y != null) {
      const label = coords.z != null
        ? coords.x + "," + coords.y + "," + coords.z
        : coords.x + "," + coords.y;
      signals.push({ kind: "coordinates", raw: label, label: "Coordinates", displayable: false });
    } else if (coords.raw) {
      signals.push({ kind: "coordinates", raw: coords.raw, label: "Coordinates", displayable: false });
    }
    return signals;
  }

  function extractConditionSignals(source) {
    const signals = [];
    const ctx = normalizeConditionContext(source || {});
    if (!ctx) return signals;
    if (ctx.time_condition) {
      signals.push({
        kind: "time_condition",
        raw: ctx.time_condition,
        label: getTimeConditionLabel(ctx.time_condition),
        displayable: false,
      });
    }
    if (ctx.weather_condition) {
      signals.push({
        kind: "weather_condition",
        raw: ctx.weather_condition,
        label: getWeatherConditionLabel(ctx.weather_condition),
        displayable: false,
      });
    }
    if (ctx.biome_context) {
      signals.push({
        kind: "biome_context",
        raw: ctx.biome_context,
        label: getBiomeContextLabel(ctx.biome_context),
        displayable: false,
      });
    }
    return signals;
  }

  function extractObservationSignals(source) {
    try {
      return extractLocationSignals(source)
        .concat(extractCoordinateSignals(source))
        .concat(extractConditionSignals(source));
    } catch (err) {
      return [];
    }
  }

  function getLocationSearchSignals(source) {
    return extractLocationSignals(source)
      .map(function(entry) { return toSignal(entry, "location_context", entry.label); })
      .filter(Boolean);
  }

  function getConditionSearchSignals(source) {
    return extractConditionSignals(source)
      .map(function(entry) { return toSignal(entry, "condition_context", entry.label); })
      .filter(Boolean);
  }

  function getObservationSearchSignals(source) {
    return extractObservationSignals(source)
      .map(function(entry) {
        const group = entry.kind === "coordinates" || entry.kind === "location_ref"
          ? "observation_context"
          : "condition_context";
        return toSignal(entry, group, entry.label);
      })
      .filter(Boolean);
  }

  function getObservationContextLabel(value) {
    const kind = normalizeObservationContextType(value);
    if (!kind || kind === "unknown") return "Observation";
    return titleCase(kind);
  }

  function getLocationReferenceLabel(value) {
    const kind = normalizeLocationReferenceType(value);
    if (!kind || kind === "unknown") return "Location";
    return titleCase(kind.replace(/_/g, " "));
  }

  function getCoordinateSystemLabel(value) {
    const kind = normalizeCoordinateSystemType(value);
    if (!kind || kind === "unknown") return "Coordinate System";
    return titleCase(kind);
  }

  function getTimeConditionLabel(value) {
    const kind = normalizeTimeConditionType(value);
    if (!kind || kind === "unknown") return "Time";
    return titleCase(kind.replace(/_/g, " "));
  }

  function getWeatherConditionLabel(value) {
    const kind = normalizeWeatherConditionType(value);
    if (!kind || kind === "unknown") return "Weather";
    return titleCase(kind);
  }

  function getBiomeContextLabel(value) {
    const kind = normalizeBiomeContextType(value);
    if (!kind || kind === "unknown") return "Biome";
    return titleCase(kind);
  }

  function shouldRenderObservationSection(record, section) {
    if (!RENDER_SECTIONS_ENABLED) return false;
    if (!section) return false;
    const value = readField(record, section);
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) return false;
    return true;
  }

  function shouldPromoteObservationToPost(record) {
    void record;
    return PROMOTE_OBSERVATION_TO_POST;
  }

  function shouldPromoteCoordinatesToPlace(record) {
    void record;
    return PROMOTE_COORDINATES_TO_PLACE;
  }

  function resolveObservationContext(record) {
    const source = record && typeof record === "object" ? record : {};
    const normalized = normalizeObservationContext(source);
    const observationRecord = normalizeObservationRecord(source);
    return {
      observation_context: normalized,
      observation_record: observationRecord,
      has_coordinates: hasExplicitCoordinates(source),
      has_location_ref: hasExplicitLocationRef(source),
      has_condition_context: hasConditionContext(source),
      render_sections: RENDER_SECTIONS_ENABLED,
      promote_to_post: shouldPromoteObservationToPost(source),
      promote_coordinates_to_place: shouldPromoteCoordinatesToPlace(source),
      signals: getObservationSearchSignals(source),
    };
  }

  return {
    OBSERVATION_CONTEXT_TYPES: OBSERVATION_CONTEXT_TYPES.slice(),
    LOCATION_REFERENCE_TYPES: LOCATION_REFERENCE_TYPES.slice(),
    COORDINATE_SYSTEM_TYPES: COORDINATE_SYSTEM_TYPES.slice(),
    TIME_CONDITION_TYPES: TIME_CONDITION_TYPES.slice(),
    WEATHER_CONDITION_TYPES: WEATHER_CONDITION_TYPES.slice(),
    BIOME_CONTEXT_TYPES: BIOME_CONTEXT_TYPES.slice(),
    OBSERVATION_FIELDS: OBSERVATION_FIELDS.slice(),
    normalizeObservationContextType: normalizeObservationContextType,
    normalizeLocationReferenceType: normalizeLocationReferenceType,
    normalizeCoordinateSystemType: normalizeCoordinateSystemType,
    normalizeTimeConditionType: normalizeTimeConditionType,
    normalizeWeatherConditionType: normalizeWeatherConditionType,
    normalizeBiomeContextType: normalizeBiomeContextType,
    normalizeObservationField: normalizeObservationField,
    normalizeCoordinates: normalizeCoordinates,
    normalizeLocationReference: normalizeLocationReference,
    normalizeConditionContext: normalizeConditionContext,
    normalizeObservationContext: normalizeObservationContext,
    normalizeObservationRecord: normalizeObservationRecord,
    extractLocationSignals: extractLocationSignals,
    extractCoordinateSignals: extractCoordinateSignals,
    extractConditionSignals: extractConditionSignals,
    extractObservationSignals: extractObservationSignals,
    getLocationSearchSignals: getLocationSearchSignals,
    getConditionSearchSignals: getConditionSearchSignals,
    getObservationSearchSignals: getObservationSearchSignals,
    getObservationContextLabel: getObservationContextLabel,
    getLocationReferenceLabel: getLocationReferenceLabel,
    getCoordinateSystemLabel: getCoordinateSystemLabel,
    getTimeConditionLabel: getTimeConditionLabel,
    getWeatherConditionLabel: getWeatherConditionLabel,
    getBiomeContextLabel: getBiomeContextLabel,
    hasExplicitCoordinates: hasExplicitCoordinates,
    hasExplicitLocationRef: hasExplicitLocationRef,
    hasConditionContext: hasConditionContext,
    shouldRenderObservationSection: shouldRenderObservationSection,
    shouldPromoteObservationToPost: shouldPromoteObservationToPost,
    shouldPromoteCoordinatesToPlace: shouldPromoteCoordinatesToPlace,
    resolveObservationContext: resolveObservationContext,
  };
})();
