// ============================================
// BoundLore Resource Node Registry
// P2-E.1 — node types, acquisition sources, observation context.
// Structured fields only — no node posts, no PLACE pages, no DB.
//
// source_detail (e.g. "red crystal nodes") stays text/search signal only.
// No taxonomy inference from source_detail text.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreResourceNodeRegistry = (function() {
  const RESOURCE_NODE_TYPES = [
    "resource_node", "mineral_node", "ore_vein", "crystal_node", "deposit",
    "plant_node", "herb_patch", "tree", "lumber_node", "fishing_spot",
    "creature_source", "container", "salvage_point", "unknown",
  ];

  const ACQUISITION_SOURCE_TYPES = [
    "mining", "gathering", "harvesting", "logging", "fishing", "looting", "drop",
    "vendor", "quest_reward", "event_reward", "crafting", "salvaging", "unknown",
  ];

  const NODE_SCOPE_TYPES = [
    "generic_type", "observation", "concrete_instance", "source_detail", "unknown",
  ];

  const NODE_OBSERVATION_FIELDS = [
    "node_type", "source_type", "source_detail", "acquisition_method", "biome_context",
    "location_ref", "coordinates", "required_tool", "required_level", "station",
    "station_tier", "respawn_time", "availability", "rarity", "evidence", "versioning",
  ];

  const RENDER_SECTIONS_ENABLED = false;
  const PROMOTE_NODE_TO_POST = false;

  const NODE_TYPE_ALIASES = {
    resource_node: "resource_node", node: "resource_node", resource: "resource_node",
    mineral_node: "mineral_node", mineral: "mineral_node", mining_node: "mineral_node",
    ore_vein: "ore_vein", ore: "ore_vein", vein: "ore_vein",
    crystal_node: "crystal_node",
    deposit: "deposit", ore_deposit: "deposit",
    plant_node: "plant_node", plant: "plant_node",
    herb_patch: "herb_patch", herb: "herb_patch", herbs: "herb_patch",
    tree: "tree", tree_node: "tree",
    lumber_node: "lumber_node", lumber: "lumber_node", logging_node: "lumber_node",
    fishing_spot: "fishing_spot", fishing: "fishing_spot", fish_spot: "fishing_spot",
    creature_source: "creature_source", creature: "creature_source",
    container: "container", chest: "container",
    salvage_point: "salvage_point", salvage: "salvage_point",
  };

  const ACQUISITION_ALIASES = {
    mining: "mining", mine: "mining", mined: "mining", mineable: "mining",
    gathering: "gathering", gather: "gathering", gathered: "gathering",
    harvesting: "harvesting", harvest: "harvesting", harvested: "harvesting",
    logging: "logging", log: "logging", chop: "logging", chopping: "logging",
    fishing: "fishing", fish: "fishing", angling: "fishing",
    looting: "looting", loot: "looting",
    drop: "drop", drops: "drop", dropped: "drop",
    vendor: "vendor", shop: "vendor", merchant: "vendor",
    quest_reward: "quest_reward", quest: "quest_reward",
    event_reward: "event_reward", event: "event_reward",
    crafting: "crafting", craft: "crafting", crafted: "crafting",
    salvaging: "salvaging", salvage: "salvaging",
  };

  const SCOPE_ALIASES = {
    generic_type: "generic_type", generic: "generic_type", type: "generic_type",
    observation: "observation", observed: "observation",
    concrete_instance: "concrete_instance", instance: "concrete_instance", concrete: "concrete_instance",
    source_detail: "source_detail", detail: "source_detail",
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
      const metaPayload = meta.discovery_payload;
      if (metaPayload && Object.prototype.hasOwnProperty.call(metaPayload, field)) return metaPayload[field];
      if (metaPayload && metaPayload.resource && Object.prototype.hasOwnProperty.call(metaPayload.resource, field)) {
        return metaPayload.resource[field];
      }
    }
    return undefined;
  }

  function normalizeFromList(value, allowed, aliases) {
    const slug = slugKey(value);
    if (!slug) return null;
    if (allowed.indexOf(slug) >= 0) return slug;
    if (aliases && aliases[slug]) return aliases[slug];
    return "unknown";
  }

  function normalizeResourceNodeType(value) {
    const result = normalizeFromList(value, RESOURCE_NODE_TYPES, NODE_TYPE_ALIASES);
    return result || null;
  }

  function normalizeAcquisitionSourceType(value) {
    const result = normalizeFromList(value, ACQUISITION_SOURCE_TYPES, ACQUISITION_ALIASES);
    return result || null;
  }

  function normalizeNodeScopeType(value) {
    const result = normalizeFromList(value, NODE_SCOPE_TYPES, SCOPE_ALIASES);
    return result || null;
  }

  function normalizeNodeObservationField(value) {
    const slug = slugKey(value);
    if (!slug) return null;
    if (NODE_OBSERVATION_FIELDS.indexOf(slug) >= 0) return slug;
    return null;
  }

  function normalizeResourceSourceDetail(valueOrRecord) {
    if (valueOrRecord == null) return null;
    if (typeof valueOrRecord === "string" || typeof valueOrRecord === "number") {
      const clean = meaningful(valueOrRecord);
      return clean ? clean.slice(0, 240) : null;
    }
    if (typeof valueOrRecord === "object") {
      const direct = meaningful(
        valueOrRecord.source_detail ||
        (valueOrRecord.resource && valueOrRecord.resource.source_detail) ||
        (valueOrRecord.discovery_payload && valueOrRecord.discovery_payload.source_detail) ||
        (valueOrRecord.discovery_payload && valueOrRecord.discovery_payload.resource &&
          valueOrRecord.discovery_payload.resource.source_detail)
      );
      if (direct) return direct.slice(0, 240);
    }
    return null;
  }

  function normalizeResourceNodeRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const nodeType = normalizeResourceNodeType(readField(src, "node_type") || src.node_type);
    const sourceType = normalizeAcquisitionSourceType(readField(src, "source_type") || src.source_type);
    const sourceDetail = normalizeResourceSourceDetail(src);
    const scope = normalizeNodeScopeType(readField(src, "scope") || src.scope);
    const out = {};
    if (nodeType && nodeType !== "unknown") out.node_type = nodeType;
    if (sourceType && sourceType !== "unknown") out.source_type = sourceType;
    if (sourceDetail) out.source_detail = sourceDetail;
    if (scope && scope !== "unknown") out.scope = scope;
    return Object.keys(out).length ? out : null;
  }

  function normalizeAcquisitionSourceRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const acquisition = normalizeAcquisitionSourceType(
      readField(src, "acquisition_method") ||
      readField(src, "source_type") ||
      src.acquisition_method ||
      src.source_type
    );
    const sourceDetail = normalizeResourceSourceDetail(src);
    if (!acquisition && !sourceDetail) return null;
    const out = {};
    if (acquisition && acquisition !== "unknown") out.acquisition_method = acquisition;
    if (sourceDetail) out.source_detail = sourceDetail;
    const sourceType = normalizeAcquisitionSourceType(readField(src, "source_type") || src.source_type);
    if (sourceType && sourceType !== "unknown") out.source_type = sourceType;
    return Object.keys(out).length ? out : null;
  }

  function normalizeNodeObservationRecord(record) {
    const src = record && typeof record === "object" ? record : {};
    const out = {};
    NODE_OBSERVATION_FIELDS.forEach(function(field) {
      const raw = readField(src, field);
      if (raw == null || raw === "") return;
      if (field === "node_type") {
        const normalized = normalizeResourceNodeType(raw);
        if (normalized && normalized !== "unknown") out[field] = normalized;
        return;
      }
      if (field === "source_type" || field === "acquisition_method") {
        const normalized = normalizeAcquisitionSourceType(raw);
        if (normalized && normalized !== "unknown") out[field] = normalized;
        return;
      }
      if (field === "source_detail") {
        const normalized = normalizeResourceSourceDetail(raw);
        if (normalized) out[field] = normalized;
        return;
      }
      const clean = typeof raw === "object" ? raw : meaningful(raw);
      if (clean) out[field] = clean;
    });
    return Object.keys(out).length ? out : null;
  }

  function readExplicitNodeType(source) {
    const direct = readField(source, "node_type");
    if (direct != null && String(direct).trim()) {
      return normalizeResourceNodeType(direct);
    }
    const observations = readField(source, "node_observations");
    if (Array.isArray(observations)) {
      for (let i = 0; i < observations.length; i += 1) {
        const entry = observations[i];
        if (!entry || typeof entry !== "object") continue;
        const normalized = normalizeResourceNodeType(entry.node_type);
        if (normalized && normalized !== "unknown") return normalized;
      }
    }
    return null;
  }

  function readSourceDetail(source) {
    return normalizeResourceSourceDetail({
      source_detail: readField(source, "source_detail"),
      discovery_payload: source && source.discovery_payload,
      resource: readField(source, "resource") || (source && source.resource),
    }) || normalizeResourceSourceDetail(source);
  }

  function hasExplicitNodeType(source) {
    const nodeType = readExplicitNodeType(source);
    return !!(nodeType && nodeType !== "unknown");
  }

  function hasSourceDetail(source) {
    return !!readSourceDetail(source);
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
      source: "resource_node_registry",
    };
  }

  function extractResourceNodeSignals(source) {
    const signals = [];
    const nodeType = readExplicitNodeType(source);
    if (nodeType && nodeType !== "unknown") {
      signals.push({
        kind: "node_type",
        raw: nodeType,
        label: getResourceNodeTypeLabel(nodeType),
        displayable: true,
      });
      signals.push({
        kind: "node_type",
        raw: nodeType.replace(/_/g, " "),
        label: getResourceNodeTypeLabel(nodeType),
        displayable: false,
      });
    }
    return signals;
  }

  function extractAcquisitionSourceSignals(source) {
    const signals = [];
    const acquisition = normalizeAcquisitionSourceType(
      readField(source, "acquisition_method") || readField(source, "source_type")
    );
    if (acquisition && acquisition !== "unknown") {
      signals.push({
        kind: "acquisition_method",
        raw: acquisition,
        label: getAcquisitionSourceLabel(acquisition),
        displayable: false,
      });
      signals.push({
        kind: "acquisition_method",
        raw: acquisition.replace(/_/g, " "),
        label: getAcquisitionSourceLabel(acquisition),
        displayable: false,
      });
    }
    return signals;
  }

  function extractSourceDetailSignals(source) {
    const detail = readSourceDetail(source);
    if (!detail) return [];
    return [{
      kind: "source_detail",
      raw: detail,
      label: "Source detail",
      displayable: false,
    }];
  }

  function extractNodeObservationSignals(source) {
    try {
      return extractResourceNodeSignals(source)
        .concat(extractAcquisitionSourceSignals(source))
        .concat(extractSourceDetailSignals(source));
    } catch (err) {
      return [];
    }
  }

  function getResourceNodeSearchSignals(source) {
    return extractResourceNodeSignals(source)
      .map(function(entry) { return toSignal(entry, "resource_node", entry.label); })
      .filter(Boolean);
  }

  function getAcquisitionSourceSearchSignals(source) {
    return extractAcquisitionSourceSignals(source)
      .map(function(entry) { return toSignal(entry, "acquisition_source", entry.label); })
      .filter(Boolean);
  }

  function getNodeObservationSearchSignals(source) {
    return extractNodeObservationSignals(source)
      .map(function(entry) {
        const group = entry.kind === "source_detail" ? "resource" : "resource_node";
        return toSignal(entry, group, entry.label);
      })
      .filter(Boolean);
  }

  function getResourceNodeTypeLabel(value) {
    const kind = normalizeResourceNodeType(value);
    if (!kind || kind === "unknown") return "Resource Node";
    return titleCase(kind);
  }

  function getAcquisitionSourceLabel(value) {
    const kind = normalizeAcquisitionSourceType(value);
    if (!kind || kind === "unknown") return "Acquisition";
    return titleCase(kind);
  }

  function getNodeScopeLabel(value) {
    const kind = normalizeNodeScopeType(value);
    if (!kind || kind === "unknown") return "Node Scope";
    return titleCase(kind.replace(/_/g, " "));
  }

  function isResourceNodeRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    return hasExplicitNodeType(source) ||
      !!normalizeResourceNodeRecord(source) ||
      !!normalizeNodeObservationRecord(source);
  }

  function shouldRenderResourceNodeSection(record, section) {
    if (!RENDER_SECTIONS_ENABLED) return false;
    if (!section) return false;
    if (!hasExplicitNodeType(record)) return false;
    const value = readField(record, section);
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) return false;
    return true;
  }

  function shouldPromoteNodeTypeToPost(record) {
    void record;
    return PROMOTE_NODE_TO_POST;
  }

  function resolveResourceNodeContext(record) {
    const source = record && typeof record === "object" ? record : {};
    const nodeRecord = normalizeResourceNodeRecord(source);
    const acquisitionRecord = normalizeAcquisitionSourceRecord(source);
    const observationRecord = normalizeNodeObservationRecord(source);
    return {
      node_record: nodeRecord,
      acquisition_record: acquisitionRecord,
      observation_record: observationRecord,
      has_explicit_node_type: hasExplicitNodeType(source),
      has_source_detail: hasSourceDetail(source),
      source_detail: readSourceDetail(source),
      render_sections: RENDER_SECTIONS_ENABLED,
      promote_to_post: shouldPromoteNodeTypeToPost(source),
      signals: getNodeObservationSearchSignals(source),
      is_resource_node: isResourceNodeRecord(source),
    };
  }

  return {
    RESOURCE_NODE_TYPES: RESOURCE_NODE_TYPES.slice(),
    ACQUISITION_SOURCE_TYPES: ACQUISITION_SOURCE_TYPES.slice(),
    NODE_SCOPE_TYPES: NODE_SCOPE_TYPES.slice(),
    NODE_OBSERVATION_FIELDS: NODE_OBSERVATION_FIELDS.slice(),
    normalizeResourceNodeType: normalizeResourceNodeType,
    normalizeAcquisitionSourceType: normalizeAcquisitionSourceType,
    normalizeNodeScopeType: normalizeNodeScopeType,
    normalizeNodeObservationField: normalizeNodeObservationField,
    normalizeResourceNodeRecord: normalizeResourceNodeRecord,
    normalizeAcquisitionSourceRecord: normalizeAcquisitionSourceRecord,
    normalizeNodeObservationRecord: normalizeNodeObservationRecord,
    normalizeResourceSourceDetail: normalizeResourceSourceDetail,
    extractResourceNodeSignals: extractResourceNodeSignals,
    extractAcquisitionSourceSignals: extractAcquisitionSourceSignals,
    extractSourceDetailSignals: extractSourceDetailSignals,
    extractNodeObservationSignals: extractNodeObservationSignals,
    getResourceNodeSearchSignals: getResourceNodeSearchSignals,
    getAcquisitionSourceSearchSignals: getAcquisitionSourceSearchSignals,
    getNodeObservationSearchSignals: getNodeObservationSearchSignals,
    getResourceNodeTypeLabel: getResourceNodeTypeLabel,
    getAcquisitionSourceLabel: getAcquisitionSourceLabel,
    getNodeScopeLabel: getNodeScopeLabel,
    isResourceNodeRecord: isResourceNodeRecord,
    hasExplicitNodeType: hasExplicitNodeType,
    hasSourceDetail: hasSourceDetail,
    shouldRenderResourceNodeSection: shouldRenderResourceNodeSection,
    shouldPromoteNodeTypeToPost: shouldPromoteNodeTypeToPost,
    resolveResourceNodeContext: resolveResourceNodeContext,
  };
})();
