// ============================================
// BoundLore Relations Registry
// Single source of truth for canonical relation types,
// families, controlled vocabularies, and merge/conflict rules.
//
// NOT YET INTEGRATED into discovery/contribution flows.
// See docs/architecture/current-code-gap-notes.md for integration plan.
// ============================================

window.BoundLoreRelationsRegistry = (function() {
  // -------------------------------------------------------------------------
  // Entity Domains
  // -------------------------------------------------------------------------
  const ENTITY_DOMAINS = {
    PLACE: "PLACE",
    BEING: "BEING",
    OBJECT: "OBJECT",
    SYSTEM: "SYSTEM",
    KNOWLEDGE: "KNOWLEDGE",
    EVENT: "EVENT",
    COMMUNITY: "COMMUNITY",
    META: "META",
  };

  // -------------------------------------------------------------------------
  // Relation Families
  // -------------------------------------------------------------------------
  const RELATION_FAMILIES = {
    SPATIAL: "SPATIAL",
    DROP_YIELD: "DROP_YIELD",
    CRAFT: "CRAFT",
    COMBAT_SYSTEM: "COMBAT_SYSTEM",
    SOCIAL_LORE: "SOCIAL_LORE",
    TAXONOMIC: "TAXONOMIC",
  };

  // -------------------------------------------------------------------------
  // Standard relation property schema hints
  // -------------------------------------------------------------------------
  const RELATION_PROPERTY_SCHEMA = {
    confidence: { type: "enum", values: ["single_observation", "corroborated", "verified"] },
    evidence_tier: { type: "enum", values: ["confirmed", "observed", "reported", "speculative"] },
    conditions: { type: "object", description: "JSON: time_of_day, weather, biome_context" },
    quantity: { type: "number", description: "Count or amount" },
    rate: { type: "string", description: "drop rate or guaranteed" },
    source_post_id: { type: "string" },
    report_count: { type: "number", default: 1 },
    note: { type: "string", description: "Required for related_to fallback" },
  };

  // -------------------------------------------------------------------------
  // Controlled Vocabularies
  // -------------------------------------------------------------------------
  const CONTROLLED_VOCABULARIES = {
    evidence_tier: ["confirmed", "observed", "reported", "speculative"],
    confidence: ["single_observation", "corroborated", "verified"],
    rarity: ["common", "uncommon", "rare", "epic", "legendary", "unique", "unknown"],
    hostility: ["passive", "neutral", "defensive", "aggressive", "unknown"],
    damage_type: ["physical", "fire", "frost", "lightning", "poison", "arcane", "unknown"],
    time_of_day: ["day", "night", "dawn", "dusk", "any"],
    climate_facet: ["temperate", "tropical", "arid", "arctic", "swamp", "volcanic", "underwater", "underground", "sky"],
    size_class: ["tiny", "small", "medium", "large", "huge", "colossal"],
    completeness: ["stub", "needs_details", "solid", "comprehensive"],
  };

  // -------------------------------------------------------------------------
  // Legacy type aliases (existing code → canonical registry key)
  // Do NOT remove legacy types from knowledge-relations.js until migrated.
  // -------------------------------------------------------------------------
  const LEGACY_ALIASES = {
    observed_in: "found_in",
    observed_at: "found_in",
    found_near: "found_in",
    encounter_context: "found_in",
    location_hint: "found_in",
    location: "found_in",
    loot: "drops",
    drop: "drops",
    dropped_by: "drops",
    uses_item: "requires",
    related_creature: "related_to",
    reference_guide: "related_to",
    related_discovery: "related_to",
  };

  // -------------------------------------------------------------------------
  // Canonical Relation Type Definitions
  // -------------------------------------------------------------------------
  const RELATION_DEFINITIONS = {
    // --- SPATIAL ---
    found_in: {
      key: "found_in",
      label: "Found in",
      family: RELATION_FAMILIES.SPATIAL,
      direction: "source → target (Being/Object found in Place)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.PLACE],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "location_chip_list",
      dbCode: "FOUND_IN",
      priority: "P0",
      properties: ["confidence", "evidence_tier", "conditions", "source_post_id", "report_count"],
    },
    located_in: {
      key: "located_in",
      label: "Located in",
      family: RELATION_FAMILIES.SPATIAL,
      direction: "source → target (Place within Place)",
      allowedSourceDomains: [ENTITY_DOMAINS.PLACE],
      allowedTargetDomains: [ENTITY_DOMAINS.PLACE],
      inverse: "contains",
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "breadcrumb_parent",
      dbCode: "FOUND_IN",
      priority: "P0",
      properties: ["confidence", "evidence_tier", "source_post_id"],
    },
    spawns_at: {
      key: "spawns_at",
      label: "Spawns at",
      family: RELATION_FAMILIES.SPATIAL,
      direction: "source → target (Being spawns at Place)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING],
      allowedTargetDomains: [ENTITY_DOMAINS.PLACE],
      inverse: null,
      mergeBehavior: "additive_merge_conditions",
      conflictBehavior: "coexist_with_note",
      renderHint: "spawn_conditions_table",
      dbCode: null,
      priority: "P1",
      properties: ["confidence", "evidence_tier", "conditions", "source_post_id", "report_count"],
    },

    // --- DROP/YIELD ---
    drops: {
      key: "drops",
      label: "Drops",
      family: RELATION_FAMILIES.DROP_YIELD,
      direction: "source → target (Being drops Object)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING],
      allowedTargetDomains: [ENTITY_DOMAINS.OBJECT],
      inverse: "dropped_by",
      mergeBehavior: "additive_increment_report_count",
      conflictBehavior: "quantity_needs_review",
      renderHint: "drops_table",
      dbCode: "DROPS",
      priority: "P0",
      properties: ["quantity", "rate", "confidence", "evidence_tier", "source_post_id", "report_count"],
    },
    harvested_from: {
      key: "harvested_from",
      label: "Harvested from",
      family: RELATION_FAMILIES.DROP_YIELD,
      direction: "source → target (Resource obtained from Place/Being)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.PLACE, ENTITY_DOMAINS.BEING],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "source_list",
      dbCode: null,
      priority: "P0",
      properties: ["quantity", "rate", "conditions", "confidence", "evidence_tier", "source_post_id"],
    },
    contains_loot: {
      key: "contains_loot",
      label: "Contains loot",
      family: RELATION_FAMILIES.DROP_YIELD,
      direction: "source → target (Place contains Object as loot)",
      allowedSourceDomains: [ENTITY_DOMAINS.PLACE],
      allowedTargetDomains: [ENTITY_DOMAINS.OBJECT],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "loot_found_table",
      dbCode: null,
      priority: "P1",
      properties: ["quantity", "confidence", "evidence_tier", "source_post_id"],
    },

    // --- CRAFT ---
    crafted_from: {
      key: "crafted_from",
      label: "Crafted from",
      family: RELATION_FAMILIES.CRAFT,
      direction: "source → target (Result item crafted from ingredient)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.OBJECT],
      inverse: "ingredient_of",
      mergeBehavior: "review_required",
      conflictBehavior: "coexist_as_reported",
      renderHint: "recipe_ingredient_list",
      dbCode: null,
      priority: "P0",
      properties: ["quantity", "confidence", "evidence_tier", "source_post_id"],
    },
    crafted_at: {
      key: "crafted_at",
      label: "Crafted at",
      family: RELATION_FAMILIES.CRAFT,
      direction: "source → target (Item crafted at station)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "review_required",
      conflictBehavior: "coexist_as_reported",
      renderHint: "crafting_station_link",
      dbCode: null,
      priority: "P0",
      properties: ["confidence", "evidence_tier", "source_post_id"],
    },
    ingredient_of: {
      key: "ingredient_of",
      label: "Ingredient of",
      family: RELATION_FAMILIES.CRAFT,
      direction: "source → target (Ingredient used in result item)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.OBJECT],
      inverse: "crafted_from",
      mergeBehavior: "auto_derived_from_crafted_from",
      conflictBehavior: "none",
      renderHint: "usage_table",
      dbCode: null,
      priority: "P0",
      properties: ["quantity", "confidence", "evidence_tier", "source_post_id"],
    },
    unlocks: {
      key: "unlocks",
      label: "Unlocks",
      family: RELATION_FAMILIES.CRAFT,
      direction: "source → target (X unlocks recipe/skill)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT, ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.SYSTEM],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "unlock_requirements",
      dbCode: "UNLOCKS",
      priority: "P2",
      properties: ["conditions", "evidence_tier", "source_post_id"],
    },

    // --- COMBAT/SYSTEM ---
    weak_to: {
      key: "weak_to",
      label: "Weak to",
      family: RELATION_FAMILIES.COMBAT_SYSTEM,
      direction: "source → target (Being weak to damage type)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "contradicts_resistant_to",
      renderHint: "weakness_list",
      dbCode: null,
      priority: "P1",
      properties: ["confidence", "evidence_tier", "source_post_id"],
    },
    resistant_to: {
      key: "resistant_to",
      label: "Resistant to",
      family: RELATION_FAMILIES.COMBAT_SYSTEM,
      direction: "source → target (Being resistant to damage type)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "contradicts_weak_to",
      renderHint: "resistance_list",
      dbCode: null,
      priority: "P1",
      properties: ["confidence", "evidence_tier", "source_post_id"],
    },
    inflicts: {
      key: "inflicts",
      label: "Inflicts",
      family: RELATION_FAMILIES.COMBAT_SYSTEM,
      direction: "source → target (Being/Object inflicts status effect)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "status_effect_list",
      dbCode: null,
      priority: "P1",
      properties: ["confidence", "evidence_tier", "source_post_id"],
    },
    requires: {
      key: "requires",
      label: "Requires",
      family: RELATION_FAMILIES.COMBAT_SYSTEM,
      direction: "source → target (X requires skill/class/item)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.OBJECT, ENTITY_DOMAINS.SYSTEM],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM, ENTITY_DOMAINS.OBJECT],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "requirements_list",
      dbCode: "REQUIRES",
      priority: "P1",
      properties: ["conditions", "evidence_tier", "source_post_id"],
    },
    grants: {
      key: "grants",
      label: "Grants",
      family: RELATION_FAMILIES.COMBAT_SYSTEM,
      direction: "source → target (Object grants skill/ability)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "granted_abilities",
      dbCode: null,
      priority: "P1",
      properties: ["evidence_tier", "source_post_id"],
    },

    // --- SOCIAL/LORE ---
    member_of: {
      key: "member_of",
      label: "Member of",
      family: RELATION_FAMILIES.SOCIAL_LORE,
      direction: "source → target (Being member of Faction/Community)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING],
      allowedTargetDomains: [ENTITY_DOMAINS.COMMUNITY, ENTITY_DOMAINS.BEING],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "faction_chip",
      dbCode: null,
      priority: "P2",
      properties: ["evidence_tier", "source_post_id"],
    },
    hostile_to: {
      key: "hostile_to",
      label: "Hostile to",
      family: RELATION_FAMILIES.SOCIAL_LORE,
      direction: "source → target (symmetric: store both directions)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.COMMUNITY],
      allowedTargetDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.COMMUNITY],
      inverse: "hostile_to",
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "hostility_list",
      dbCode: null,
      priority: "P2",
      properties: ["evidence_tier", "source_post_id", "note"],
    },
    allied_to: {
      key: "allied_to",
      label: "Allied to",
      family: RELATION_FAMILIES.SOCIAL_LORE,
      direction: "source → target (symmetric: store both directions)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.COMMUNITY],
      allowedTargetDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.COMMUNITY],
      inverse: "allied_to",
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "alliance_list",
      dbCode: null,
      priority: "P2",
      properties: ["evidence_tier", "source_post_id", "note"],
    },
    mentions: {
      key: "mentions",
      label: "Mentions",
      family: RELATION_FAMILIES.SOCIAL_LORE,
      direction: "source → target (Knowledge mentions entity)",
      allowedSourceDomains: [ENTITY_DOMAINS.KNOWLEDGE],
      allowedTargetDomains: [ENTITY_DOMAINS.PLACE, ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.OBJECT, ENTITY_DOMAINS.SYSTEM, ENTITY_DOMAINS.KNOWLEDGE],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "mentioned_in_chips",
      dbCode: null,
      priority: "P1",
      properties: ["evidence_tier", "source_post_id", "note"],
    },
    gives_quest: {
      key: "gives_quest",
      label: "Gives quest",
      family: RELATION_FAMILIES.SOCIAL_LORE,
      direction: "source → target (NPC gives quest)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM, ENTITY_DOMAINS.EVENT],
      inverse: null,
      mergeBehavior: "review_required",
      conflictBehavior: "none",
      renderHint: "quest_list",
      dbCode: null,
      priority: "P2",
      properties: ["evidence_tier", "source_post_id", "note"],
    },

    // --- TAXONOMIC ---
    variant_of: {
      key: "variant_of",
      label: "Variant of",
      family: RELATION_FAMILIES.TAXONOMIC,
      direction: "source → target (Variant is variant of archetype)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.OBJECT, ENTITY_DOMAINS.PLACE],
      allowedTargetDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.OBJECT, ENTITY_DOMAINS.PLACE],
      inverse: null,
      mergeBehavior: "review_required",
      conflictBehavior: "none",
      renderHint: "variant_tree",
      dbCode: "VARIANT_OF",
      priority: "P1",
      properties: ["evidence_tier", "source_post_id", "note"],
    },
    part_of: {
      key: "part_of",
      label: "Part of",
      family: RELATION_FAMILIES.TAXONOMIC,
      direction: "source → target (Entity is part of larger entity)",
      allowedSourceDomains: [ENTITY_DOMAINS.PLACE, ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.PLACE, ENTITY_DOMAINS.OBJECT, ENTITY_DOMAINS.SYSTEM],
      inverse: "contains",
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "parent_link",
      dbCode: "PART_OF",
      priority: "P0",
      properties: ["evidence_tier", "source_post_id"],
    },
    related_to: {
      key: "related_to",
      label: "Related to",
      family: RELATION_FAMILIES.TAXONOMIC,
      direction: "source → target (weak association — fallback only)",
      allowedSourceDomains: Object.values(ENTITY_DOMAINS),
      allowedTargetDomains: Object.values(ENTITY_DOMAINS),
      inverse: "related_to",
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "related_links",
      dbCode: "RELATED_TO",
      priority: "P0",
      properties: ["note", "evidence_tier", "source_post_id"],
      constraints: {
        noteRequired: true,
        notDefaultForNewSystems: true,
      },
    },

    // --- Legacy types kept for compatibility (not in canonical families for new data) ---
    contains: {
      key: "contains",
      label: "Contains",
      family: RELATION_FAMILIES.TAXONOMIC,
      direction: "source → target (Place contains entity — legacy biome list)",
      allowedSourceDomains: [ENTITY_DOMAINS.PLACE],
      allowedTargetDomains: [ENTITY_DOMAINS.PLACE, ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.OBJECT],
      inverse: "part_of",
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "contained_entities_list",
      dbCode: "PART_OF",
      priority: "legacy",
      legacy: true,
      properties: ["source_post_id", "report_count"],
    },
    dropped_by: {
      key: "dropped_by",
      label: "Dropped by",
      family: RELATION_FAMILIES.DROP_YIELD,
      direction: "source → target (Item dropped by Being — inverse of drops)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.BEING],
      inverse: "drops",
      mergeBehavior: "additive_increment_report_count",
      conflictBehavior: "none",
      renderHint: "dropped_by_list",
      dbCode: "DROPS",
      priority: "legacy",
      legacy: true,
      properties: ["quantity", "rate", "source_post_id", "report_count"],
    },
    evidence_for: {
      key: "evidence_for",
      label: "Evidence for",
      family: RELATION_FAMILIES.SOCIAL_LORE,
      direction: "source → target (Discovery evidences entity)",
      allowedSourceDomains: [ENTITY_DOMAINS.META],
      allowedTargetDomains: Object.values(ENTITY_DOMAINS),
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "evidence_links",
      dbCode: null,
      priority: "legacy",
      legacy: true,
      properties: ["source_post_id"],
    },
  };

  // -------------------------------------------------------------------------
  // Category → Domain mapping (for BLMETA entity_domain assignment)
  // -------------------------------------------------------------------------
  const CATEGORY_DOMAIN_MAP = {
    creatures: ENTITY_DOMAINS.BEING,
    items: ENTITY_DOMAINS.OBJECT,
    biomes: ENTITY_DOMAINS.PLACE,
    locations: ENTITY_DOMAINS.PLACE,
    dungeons: ENTITY_DOMAINS.PLACE,
    lore: ENTITY_DOMAINS.KNOWLEDGE,
    crafting: ENTITY_DOMAINS.SYSTEM,
    classes: ENTITY_DOMAINS.SYSTEM,
    guides: ENTITY_DOMAINS.META,
    guilds: ENTITY_DOMAINS.COMMUNITY,
    community: ENTITY_DOMAINS.COMMUNITY,
    news: ENTITY_DOMAINS.META,
  };

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function normalizeKey(raw) {
    const key = String(raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (RELATION_DEFINITIONS[key]) return key;
    if (LEGACY_ALIASES[key]) return LEGACY_ALIASES[key];
    return key;
  }

  function getRelationDefinition(key) {
    const normalized = normalizeKey(key);
    return RELATION_DEFINITIONS[normalized] || null;
  }

  function isKnownRelationType(key) {
    const normalized = normalizeKey(key);
    return !!RELATION_DEFINITIONS[normalized];
  }

  function isLegacyRelationType(key) {
    const def = getRelationDefinition(key);
    return !!(def && def.legacy);
  }

  function getRelationsByFamily(family) {
    return Object.values(RELATION_DEFINITIONS).filter(function(def) {
      return def.family === family;
    });
  }

  function getAllowedRelationTypesForDomains(sourceDomain, targetDomain) {
    const src = String(sourceDomain || "").toUpperCase();
    const tgt = String(targetDomain || "").toUpperCase();
    return Object.values(RELATION_DEFINITIONS).filter(function(def) {
      if (def.legacy && def.priority === "legacy") return false;
      const srcOk = !def.allowedSourceDomains.length || def.allowedSourceDomains.indexOf(src) >= 0;
      const tgtOk = !def.allowedTargetDomains.length || def.allowedTargetDomains.indexOf(tgt) >= 0;
      return srcOk && tgtOk;
    });
  }

  function normalizeEvidenceTier(value) {
    const v = String(value || "").trim().toLowerCase();
    return CONTROLLED_VOCABULARIES.evidence_tier.indexOf(v) >= 0 ? v : "reported";
  }

  function normalizeConfidence(value) {
    const v = String(value || "").trim().toLowerCase();
    return CONTROLLED_VOCABULARIES.confidence.indexOf(v) >= 0 ? v : "single_observation";
  }

  function getDomainForCategory(categorySlug) {
    return CATEGORY_DOMAIN_MAP[String(categorySlug || "").toLowerCase()] || null;
  }

  function resolveCanonicalKey(raw) {
    return normalizeKey(raw);
  }

  return {
    ENTITY_DOMAINS: ENTITY_DOMAINS,
    RELATION_FAMILIES: RELATION_FAMILIES,
    RELATION_DEFINITIONS: RELATION_DEFINITIONS,
    RELATION_PROPERTY_SCHEMA: RELATION_PROPERTY_SCHEMA,
    CONTROLLED_VOCABULARIES: CONTROLLED_VOCABULARIES,
    LEGACY_ALIASES: LEGACY_ALIASES,
    CATEGORY_DOMAIN_MAP: CATEGORY_DOMAIN_MAP,
    getRelationDefinition: getRelationDefinition,
    isKnownRelationType: isKnownRelationType,
    isLegacyRelationType: isLegacyRelationType,
    getRelationsByFamily: getRelationsByFamily,
    getAllowedRelationTypesForDomains: getAllowedRelationTypesForDomains,
    normalizeEvidenceTier: normalizeEvidenceTier,
    normalizeConfidence: normalizeConfidence,
    getDomainForCategory: getDomainForCategory,
    resolveCanonicalKey: resolveCanonicalKey,
    normalizeKey: normalizeKey,
  };
})();
