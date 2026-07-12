// ============================================
// BoundLore Facet Registry — P0.5-B baseline
// Controlled facet groups, normalization, derivation,
// and minimal badge rendering (no search/filter UI yet).
//
// Future example (not seeded in QA data):
//   facets.role = ["mount"]
//   facets.capability = ["rideable", "flyable"]
//   facets.taxonomy = ["creature>reptile>dragon"]
// ============================================

window.BoundLoreFacetRegistry = (function() {
  const ENTITY_DOMAINS = ["PLACE", "BEING", "OBJECT", "SYSTEM", "KNOWLEDGE", "EVENT", "COMMUNITY", "META"];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_>]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function slugKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  }

  function meaningful(value) {
    const clean = String(value || "").trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    if (["unclear", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) return "";
    return clean;
  }

  function defineGroup(config) {
    return Object.assign({
      multi: true,
      applicable_domains: ENTITY_DOMAINS,
      applicable_subtypes: null,
      search_relevant: true,
      filter_relevant: true,
      evidence_required: "optional",
      moderation_risk: "low",
      values: [],
    }, config || {});
  }

  const FACET_GROUPS = {
    taxonomy: defineGroup({
      key: "taxonomy",
      label: "Taxonomy",
      description: "Hierarchical classification path for browse and search.",
      multi: true,
      search_relevant: true,
      filter_relevant: true,
      evidence_required: "none",
      values: [
        "creature",
        "creature>reptile",
        "creature>reptile>dragon",
        "material",
        "material>wood",
        "material>crystal",
        "item>weapon",
        "item>tool",
      ],
    }),
    role: defineGroup({
      key: "role",
      label: "Role",
      description: "Game-system role the entity plays.",
      evidence_required: "recommended",
      moderation_risk: "medium",
      values: [
        "mount", "vendor", "quest_giver", "trainer", "boss_encounter",
        "loot_source", "trade_good", "fuel", "companion",
      ],
    }),
    capability: defineGroup({
      key: "capability",
      label: "Capability",
      description: "Player-observable or confirmed abilities.",
      evidence_required: "required",
      moderation_risk: "high",
      values: [
        "rideable", "flyable", "tameable", "swims", "dives", "climbs", "combat_mount",
      ],
    }),
    locomotion: defineGroup({
      key: "locomotion",
      label: "Locomotion",
      description: "How the entity moves on its own.",
      search_relevant: true,
      filter_relevant: true,
      values: ["walks", "flies", "swims", "burrows", "sails"],
    }),
    habitat: defineGroup({
      key: "habitat",
      label: "Habitat",
      description: "Where the entity or resource is found (often relation-backed).",
      values: [],
    }),
    element_affinity: defineGroup({
      key: "element_affinity",
      label: "Element",
      description: "Thematic or mechanical element association.",
      values: [
        "fire", "frost", "lightning", "poison", "nature", "arcane", "shadow", "unknown",
      ],
    }),
    acquisition_method: defineGroup({
      key: "acquisition_method",
      label: "Acquisition",
      description: "How an object is obtained.",
      applicable_domains: ["OBJECT"],
      applicable_subtypes: ["resource", "material", "consumable", "weapon", "tool", "item"],
      values: [
        "mining", "chopping", "harvesting", "fishing", "skinning", "loot", "vendor",
        "quest_reward", "salvage", "event", "environmental_pickup",
      ],
    }),
    node_type: defineGroup({
      key: "node_type",
      label: "Node Type",
      description: "Structured resource acquisition node classification (explicit field only; not inferred from source_detail).",
      applicable_domains: ["OBJECT"],
      applicable_subtypes: ["resource", "material"],
      search_relevant: true,
      filter_relevant: false,
      evidence_required: "recommended",
      values: [
        "resource_node", "mineral_node", "ore_vein", "crystal_node", "deposit",
        "plant_node", "herb_patch", "tree", "lumber_node", "fishing_spot",
        "creature_source", "container", "salvage_point",
      ],
    }),
    biome_context: defineGroup({
      key: "biome_context",
      label: "Biome Context",
      description: "Explicit biome observation context (not inferred from free-text location).",
      applicable_domains: ["OBJECT", "BEING", "EVENT", "KNOWLEDGE", "PLACE"],
      search_relevant: true,
      filter_relevant: false,
      evidence_required: "recommended",
      values: [
        "swamp", "forest", "desert", "mountain", "cave", "coast", "plains", "ruins", "dungeon", "city",
      ],
    }),
    time_condition: defineGroup({
      key: "time_condition",
      label: "Time Condition",
      description: "Observation time-of-day context (explicit field only).",
      applicable_domains: ENTITY_DOMAINS,
      search_relevant: true,
      filter_relevant: false,
      values: [
        "daytime", "nighttime", "dawn", "dusk", "morning", "afternoon", "evening", "always",
      ],
    }),
    weather_condition: defineGroup({
      key: "weather_condition",
      label: "Weather Condition",
      description: "Observation weather context (explicit field only).",
      applicable_domains: ENTITY_DOMAINS,
      search_relevant: true,
      filter_relevant: false,
      values: ["clear", "rain", "storm", "fog", "snow", "wind", "heat", "cold"],
    }),
    processing_stage: defineGroup({
      key: "processing_stage",
      label: "Processing Stage",
      description: "Material processing state.",
      multi: false,
      applicable_domains: ["OBJECT"],
      applicable_subtypes: ["resource", "material", "consumable", "component"],
      values: ["raw", "refined", "component", "reagent", "fuel", "final_good"],
    }),
    rarity: defineGroup({
      key: "rarity",
      label: "Rarity",
      description: "Value and drop-frequency gradation.",
      multi: false,
      applicable_domains: ["OBJECT", "BEING"],
      values: ["unknown", "common", "uncommon", "rare", "epic", "legendary", "unique"],
    }),
    quality: defineGroup({
      key: "quality",
      label: "Quality",
      description: "Craft or item quality tier (reserved until game evidence).",
      multi: false,
      applicable_domains: ["OBJECT"],
      search_relevant: false,
      filter_relevant: false,
      values: [],
    }),
    tier: defineGroup({
      key: "tier",
      label: "Tier",
      description: "Power or progression tier (reserved until game evidence).",
      multi: false,
      applicable_domains: ["OBJECT", "BEING"],
      search_relevant: false,
      filter_relevant: false,
      values: [],
    }),
    combat_rank: defineGroup({
      key: "combat_rank",
      label: "Combat Rank",
      description: "Enemy difficulty class.",
      multi: false,
      applicable_domains: ["BEING"],
      evidence_required: "recommended",
      moderation_risk: "medium",
      values: ["normal", "elite", "boss", "world_boss"],
    }),
    equipment_slot: defineGroup({
      key: "equipment_slot",
      label: "Equipment Slot",
      description: "Where gear is equipped (reserved until game evidence).",
      multi: false,
      applicable_domains: ["OBJECT"],
      search_relevant: false,
      filter_relevant: false,
      values: [],
    }),
    profession_affinity: defineGroup({
      key: "profession_affinity",
      label: "Profession",
      description: "Profession that crafts or uses this entity (often relation-backed).",
      applicable_domains: ["OBJECT", "SYSTEM"],
      values: [],
    }),
    event_availability: defineGroup({
      key: "event_availability",
      label: "Availability",
      description: "Temporal availability of the entity.",
      multi: false,
      values: ["permanent", "event_only", "seasonal", "removed"],
    }),
    temperament: defineGroup({
      key: "temperament",
      label: "Temperament",
      description: "Default hostility or behavior disposition.",
      multi: false,
      applicable_domains: ["BEING"],
      values: ["passive", "neutral", "defensive", "aggressive", "territorial"],
    }),
  };

  const GROUP_ALIASES = {
    element: "element_affinity",
    affinity: "element_affinity",
    acquisition: "acquisition_method",
    processing: "processing_stage",
    combat: "combat_rank",
    availability: "event_availability",
  };

  const SOURCE_TYPE_TO_ACQUISITION = {
    mining: "mining",
    plant: "harvesting",
    "creature-drop": "loot",
    creature_drop: "loot",
    biome: "environmental_pickup",
    water: "fishing",
    loot: "loot",
    chopping: "chopping",
    harvesting: "harvesting",
    fishing: "fishing",
    skinning: "skinning",
    vendor: "vendor",
    quest_reward: "quest_reward",
    salvage: "salvage",
    event: "event",
    environmental_pickup: "environmental_pickup",
  };

  const DISPLAY_PRIORITY = [
    "acquisition_method",
    "rarity",
    "processing_stage",
    "taxonomy",
    "role",
    "capability",
    "locomotion",
    "element_affinity",
    "combat_rank",
    "temperament",
    "event_availability",
    "habitat",
    "quality",
    "tier",
    "equipment_slot",
    "profession_affinity",
  ];

  function getFacetGroup(key) {
    const normalized = normalizeFacetGroupKey(key);
    return normalized ? FACET_GROUPS[normalized] || null : null;
  }

  function normalizeFacetGroupKey(value) {
    const raw = slugKey(value).replace(/>/g, "_");
    if (!raw) return "";
    if (FACET_GROUPS[raw]) return raw;
    if (GROUP_ALIASES[raw]) return GROUP_ALIASES[raw];
    return "";
  }

  function normalizeFacetValue(groupKey, value) {
    const group = getFacetGroup(groupKey);
    if (!group || value == null) return "";
    const raw = String(value).trim();
    if (!raw) return "";

    if (groupKey === "taxonomy") {
      const path = raw.toLowerCase().replace(/\s*>\s*/g, ">").replace(/\s+/g, "_");
      if (group.values.includes(path)) return path;
      const segments = path.split(">");
      for (let i = segments.length; i > 0; i -= 1) {
        const candidate = segments.slice(0, i).join(">");
        if (group.values.includes(candidate)) return candidate;
      }
      return path;
    }

    const key = slugKey(raw);
    if (group.values.includes(key)) return key;
    return key;
  }

  function getFacetValue(groupKey, valueKey) {
    const group = getFacetGroup(groupKey);
    const normalized = normalizeFacetValue(groupKey, valueKey);
    if (!group || !normalized) return null;
    return {
      groupKey: group.key,
      value: normalized,
      label: formatFacetValueLabel(group.key, normalized),
      known: !group.values.length || group.values.includes(normalized),
    };
  }

  function formatFacetGroupLabel(groupKey) {
    const group = getFacetGroup(groupKey);
    return group ? group.label : titleCase(groupKey);
  }

  function formatFacetValueLabel(groupKey, value) {
    const normalized = normalizeFacetValue(groupKey, value);
    if (!normalized) return "";
    if (groupKey === "taxonomy") {
      const parts = normalized.split(">");
      return titleCase(parts[parts.length - 1] || normalized);
    }
    return titleCase(normalized);
  }

  function isKnownFacetValue(groupKey, value) {
    const group = getFacetGroup(groupKey);
    const normalized = normalizeFacetValue(groupKey, value);
    if (!group || !normalized) return false;
    if (!group.values.length) return true;
    return group.values.includes(normalized);
  }

  function resolveEntityDomain(meta, post) {
    const explicit = meta && meta.entity_domain ? String(meta.entity_domain).toUpperCase() : "";
    if (ENTITY_DOMAINS.includes(explicit)) return explicit;
    const category = String(post && post.category || "").toLowerCase();
    if (category === "creatures") return "BEING";
    if (category === "items" || category === "crafting") return "OBJECT";
    if (category === "biomes" || category === "locations" || category === "dungeons") return "PLACE";
    if (category === "classes") return "SYSTEM";
    return "OBJECT";
  }

  function resolveEntitySubtype(meta, post) {
    if (typeof EntityCore !== "undefined" && EntityCore.resolveEntitySubtype) {
      return EntityCore.resolveEntitySubtype(meta, post) || "";
    }
    return meta && meta.entity_subtype ? String(meta.entity_subtype) : "";
  }

  function isResourceLike(meta, post) {
    if (typeof EntityCore !== "undefined" && EntityCore.isResourceEntry) {
      return EntityCore.isResourceEntry(meta, post);
    }
    return resolveEntitySubtype(meta, post) === "resource";
  }

  function getApplicableFacetGroups(domain, subtype) {
    const dom = String(domain || "").toUpperCase();
    const sub = slugKey(subtype);
    return Object.keys(FACET_GROUPS).filter(function(key) {
      const group = FACET_GROUPS[key];
      if (dom && group.applicable_domains && group.applicable_domains.length) {
        if (!group.applicable_domains.includes(dom)) return false;
      }
      if (sub && Array.isArray(group.applicable_subtypes) && group.applicable_subtypes.length) {
        return group.applicable_subtypes.includes(sub);
      }
      return true;
    });
  }

  function normalizeFacetEntry(groupKey, rawEntry, source) {
    const normalizedGroup = normalizeFacetGroupKey(groupKey);
    if (!normalizedGroup) return null;

    let value = "";
    let entrySource = source || "explicit";
    let derived = entrySource === "derived";

    if (typeof rawEntry === "string" || typeof rawEntry === "number") {
      value = normalizeFacetValue(normalizedGroup, rawEntry);
    } else if (rawEntry && typeof rawEntry === "object") {
      value = normalizeFacetValue(normalizedGroup, rawEntry.value || rawEntry.key || rawEntry.id);
      if (rawEntry.source) entrySource = String(rawEntry.source);
      if (typeof rawEntry.derived === "boolean") derived = rawEntry.derived;
      else derived = entrySource === "derived";
    }

    if (!value) return null;

    const entry = {
      groupKey: normalizedGroup,
      value: value,
      source: entrySource,
      derived: derived,
      label: formatFacetValueLabel(normalizedGroup, value),
      groupLabel: formatFacetGroupLabel(normalizedGroup),
    };
    if (typeof BoundLoreVersioning !== "undefined") {
      const version = BoundLoreVersioning.extractVersionMetadata(rawEntry);
      if (version) entry.version = version;
    } else if (rawEntry && rawEntry.version) {
      entry.version = rawEntry.version;
    }
    return entry;
  }

  function normalizeFacets(input) {
    const out = [];
    if (!input || typeof input !== "object") return out;

    if (Array.isArray(input)) {
      input.forEach(function(entry) {
        if (!entry) return;
        const normalized = normalizeFacetEntry(
          entry.groupKey || entry.group || entry.key,
          entry.value != null ? entry : entry.value,
          entry.source
        );
        if (normalized) out.push(normalized);
      });
      return dedupeFacetEntries(out);
    }

    Object.keys(input).forEach(function(groupKey) {
      const raw = input[groupKey];
      if (raw == null) return;
      const list = Array.isArray(raw) ? raw : [raw];
      list.forEach(function(item) {
        const normalized = normalizeFacetEntry(groupKey, item, "explicit");
        if (normalized) out.push(normalized);
      });
    });

    return dedupeFacetEntries(out);
  }

  function dedupeFacetEntries(entries) {
    const seen = new Set();
    const out = [];
    (entries || []).forEach(function(entry) {
      if (!entry || !entry.groupKey || !entry.value) return;
      const key = entry.groupKey + ":" + entry.value;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(entry);
    });
    return out;
  }

  function mergeFacetEntries(explicit, derived) {
    const merged = dedupeFacetEntries((explicit || []).concat(derived || []));
    const explicitKeys = new Set((explicit || []).map(function(e) { return e.groupKey + ":" + e.value; }));
    return merged.filter(function(entry) {
      if (!entry.derived) return true;
      return !explicitKeys.has(entry.groupKey + ":" + entry.value);
    });
  }

  function mapSourceTypeToAcquisition(sourceType) {
    const key = slugKey(sourceType);
    if (!key || key === "unknown") return "";
    if (SOURCE_TYPE_TO_ACQUISITION[key]) return SOURCE_TYPE_TO_ACQUISITION[key];
    if (isKnownFacetValue("acquisition_method", key)) return key;
    return "";
  }

  function deriveFacetsFromMeta(meta, post) {
    const derived = [];
    if (!meta || typeof meta !== "object") return derived;

    const payload = meta.discovery_payload && typeof meta.discovery_payload === "object"
      ? meta.discovery_payload
      : {};
    const resource = payload.resource && typeof payload.resource === "object" ? payload.resource : payload;
    const domain = resolveEntityDomain(meta, post);
    const subtype = resolveEntitySubtype(meta, post);

    if (domain === "OBJECT" && isResourceLike(meta, post)) {
      const sourceType = meaningful(resource.source_type) || meaningful(payload.source_type);
      const acquisition = mapSourceTypeToAcquisition(sourceType);
      if (acquisition) {
        derived.push(normalizeFacetEntry("acquisition_method", acquisition, "derived"));
      }

      const rarityRaw = meaningful(resource.rarity) || meaningful(payload.rarity) || "unknown";
      const rarity = normalizeFacetValue("rarity", rarityRaw) || "unknown";
      if (rarity) {
        derived.push(normalizeFacetEntry("rarity", rarity, "derived"));
      }

      const explicitStage = normalizeFacetValue(
        "processing_stage",
        (meta.facets && meta.facets.processing_stage) ||
          resource.processing_stage ||
          payload.processing_stage
      );
      const refinedHints = [
        resource.processing_stage,
        payload.processing_stage,
        payload.component_type,
        resource.component_type,
      ].some(function(v) {
        const key = slugKey(v);
        return key && ["refined", "component", "reagent", "final_good", "fuel"].includes(key);
      });

      if (!explicitStage && !refinedHints) {
        derived.push(normalizeFacetEntry("processing_stage", "raw", "derived"));
      } else if (explicitStage) {
        derived.push(normalizeFacetEntry("processing_stage", explicitStage, "derived"));
      }

      const explicitNodeType = normalizeFacetValue(
        "node_type",
        resource.node_type || payload.node_type
      );
      if (explicitNodeType) {
        derived.push(normalizeFacetEntry("node_type", explicitNodeType, "explicit"));
      }

      const explicitBiome = normalizeFacetValue(
        "biome_context",
        resource.biome_context || payload.biome_context
      );
      if (explicitBiome) {
        derived.push(normalizeFacetEntry("biome_context", explicitBiome, "explicit"));
      }
    }

    return derived.filter(Boolean);
  }

  function collectFacetSignals(meta, post) {
    const safeMeta = meta && typeof meta === "object" ? meta : {};
    const explicit = normalizeFacets(safeMeta.facets || {});
    const derived = deriveFacetsFromMeta(safeMeta, post);
    return mergeFacetEntries(explicit, derived);
  }

  function sortFacetEntries(entries, priority) {
    const order = priority || DISPLAY_PRIORITY;
    return (entries || []).slice().sort(function(a, b) {
      const ai = order.indexOf(a.groupKey);
      const bi = order.indexOf(b.groupKey);
      const aRank = ai === -1 ? 999 : ai;
      const bRank = bi === -1 ? 999 : bi;
      if (aRank !== bRank) return aRank - bRank;
      return String(a.label || a.value).localeCompare(String(b.label || b.value));
    });
  }

  function renderFacetBadge(groupKey, value, options) {
    const opts = options || {};
    const entry = normalizeFacetEntry(groupKey, value, opts.source || "explicit");
    if (!entry) return "";

    const title = entry.groupLabel + ": " + entry.label;
    let html = '<span class="bl-facet-badge bl-facet-badge--' + escapeHtml(entry.groupKey) + '"';
    if (entry.derived) html += ' data-facet-derived="1"';
    html += ' title="' + escapeHtml(title) + '">';
    html += escapeHtml(entry.label);
    html += "</span>";
    return html;
  }

  function renderFacetBadgeGroup(facets, options) {
    const opts = Object.assign({ maxBadges: 5, groupClassName: "" }, options || {});
    let entries = [];

    if (Array.isArray(facets)) {
      entries = facets.filter(function(entry) { return entry && entry.groupKey && entry.value; });
    } else if (facets && typeof facets === "object") {
      entries = normalizeFacets(facets);
    }

    entries = sortFacetEntries(entries, opts.priority);
    if (opts.maxBadges > 0) entries = entries.slice(0, opts.maxBadges);
    if (!entries.length) return "";

    const parts = entries.map(function(entry) {
      return renderFacetBadge(entry.groupKey, entry, { source: entry.source });
    }).filter(Boolean);

    if (!parts.length) return "";

    let cls = "bl-facet-badges";
    if (opts.groupClassName) cls += " " + opts.groupClassName;
    return '<div class="' + escapeHtml(cls) + '">' + parts.join("") + "</div>";
  }

  function renderFacetSignalsFromMeta(meta, post, options) {
    try {
      const signals = collectFacetSignals(meta, post);
      return renderFacetBadgeGroup(signals, options);
    } catch (err) {
      return "";
    }
  }

  return {
    FACET_GROUPS: FACET_GROUPS,
    getFacetGroup: getFacetGroup,
    getFacetValue: getFacetValue,
    normalizeFacetGroupKey: normalizeFacetGroupKey,
    normalizeFacetValue: normalizeFacetValue,
    formatFacetGroupLabel: formatFacetGroupLabel,
    formatFacetValueLabel: formatFacetValueLabel,
    isKnownFacetValue: isKnownFacetValue,
    getApplicableFacetGroups: getApplicableFacetGroups,
    normalizeFacets: normalizeFacets,
    collectFacetSignals: collectFacetSignals,
    deriveFacetsFromMeta: deriveFacetsFromMeta,
    renderFacetBadge: renderFacetBadge,
    renderFacetBadgeGroup: renderFacetBadgeGroup,
    renderFacetSignalsFromMeta: renderFacetSignalsFromMeta,
  };
})();
