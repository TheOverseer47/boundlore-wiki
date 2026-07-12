// ============================================
// BoundLore Relations Registry
// Single source of truth for canonical relation types,
// families, controlled vocabularies, and merge/conflict rules.
//
// Integrated at runtime on discovery/detail/admin pages (see wiki/*/index.html).
// Optional bridge in knowledge-relations.js — flows work without this file loaded.
// See docs/architecture/current-code-gap-notes.md
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
  // Qualifier vocabulary baseline (Registry 2.0 — code only, no forms/DB)
  // -------------------------------------------------------------------------
  const QUALIFIER_REGISTRY = {
    quantity: { key: "quantity", label: "Quantity", type: "number", notes: "Count or amount" },
    unit: { key: "unit", label: "Unit", type: "string", notes: "e.g. piece, stack, kg" },
    condition: { key: "condition", label: "Condition", type: "object", notes: "Structured spawn/gather conditions" },
    time_of_day: { key: "time_of_day", label: "Time of day", type: "enum", allowed_values: ["day", "night", "dawn", "dusk", "any"] },
    weather: { key: "weather", label: "Weather", type: "string" },
    biome_context: { key: "biome_context", label: "Biome context", type: "string" },
    station: { key: "station", label: "Station", type: "entity_ref", notes: "Crafting station reference or label" },
    station_tier: { key: "station_tier", label: "Station tier", type: "string" },
    tool: { key: "tool", label: "Tool", type: "entity_ref" },
    method: { key: "method", label: "Method", type: "string", notes: "Gather/craft method label" },
    node_type: { key: "node_type", label: "Node type", type: "string" },
    drop_chance: { key: "drop_chance", label: "Drop chance", type: "string", notes: "Rate or guaranteed" },
    price: { key: "price", label: "Price", type: "number" },
    currency: { key: "currency", label: "Currency", type: "string" },
    availability: { key: "availability", label: "Availability", type: "string" },
    faction_req: { key: "faction_req", label: "Faction requirement", type: "entity_ref" },
    required_level: { key: "required_level", label: "Required level", type: "number" },
    unlock_type: { key: "unlock_type", label: "Unlock type", type: "string" },
    alternative_group: { key: "alternative_group", label: "Alternative group", type: "string", notes: "Recipe ingredient swap group" },
    game_version: { key: "game_version", label: "Game version", type: "string" },
    valid_from: { key: "valid_from", label: "Valid from", type: "date" },
    valid_until: { key: "valid_until", label: "Valid until", type: "date" },
    superseded_by: { key: "superseded_by", label: "Superseded by", type: "string" },
    change_note: { key: "change_note", label: "Change note", type: "string" },
    evidence_tier: { key: "evidence_tier", label: "Evidence tier", type: "enum", allowed_values: ["confirmed", "observed", "reported", "speculative"] },
    confidence: { key: "confidence", label: "Confidence", type: "enum", allowed_values: ["single_observation", "corroborated", "verified"] },
    source_post_id: { key: "source_post_id", label: "Source post", type: "string" },
    report_count: { key: "report_count", label: "Report count", type: "number" },
    rate: { key: "rate", label: "Rate", type: "string", notes: "Legacy alias for drop_chance" },
    conditions: { key: "conditions", label: "Conditions", type: "object" },
    note: { key: "note", label: "Note", type: "string" },
  };

  const VERSION_QUALIFIER_KEYS = ["game_version", "valid_from", "valid_until", "superseded_by", "change_note"];

  const QUALIFIER_LEGACY_TOP_LEVEL_KEYS = [
    "quantity", "unit", "condition", "conditions", "time_of_day", "weather", "biome_context",
    "station", "station_tier", "tool", "method", "node_type", "drop_chance", "rate",
    "price", "currency", "availability", "faction_req", "required_level", "unlock_type",
    "alternative_group", "game_version", "valid_from", "valid_until", "superseded_by",
    "change_note", "evidence_tier", "confidence", "source_post_id", "report_count", "note",
  ];

  const QUALIFIER_SEARCH_SKIP_KEYS = {
    game_version: true,
    valid_from: true,
    valid_until: true,
    superseded_by: true,
    change_note: true,
    _unknown: true,
    confidence: true,
    evidence_tier: true,
    source_post_id: true,
    report_count: true,
  };

  const DEFAULT_REGISTRY_2 = {
    cardinality: "many_to_many",
    persistence: "persisted_forward",
    directionality: "directed",
    mirror_behavior: "none",
    canonical_pair_order: "preserve",
    dedupe_key: ["source_entity_key", "target_entity_key", "relation_type"],
    search_expansion: { include_target: true, include_label: true, weight: 1 },
    promotion_weight: 1,
    version_support: true,
    status: "active",
    notes: "",
  };

  const RELATION_DIRECTIONALITY = {
    DIRECTED: "directed",
    DERIVED_INVERSE: "derived_inverse",
    SYMMETRIC: "symmetric",
  };

  const RELATION_MIRROR_BEHAVIOR = {
    NONE: "none",
    DERIVED_INVERSE: "derived_inverse",
    SYMMETRIC_DEDUPE: "symmetric_dedupe",
    RESERVED: "reserved",
  };

  const CANONICAL_PAIR_ORDER = {
    PRESERVE: "preserve",
    SORT_ENDPOINTS: "sort_endpoints",
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
      dbCode: "HARVESTED_FROM",
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
      // Target subtype: station_type (generic crafting station archetype, e.g. Forge — not a PLACE)
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

    // --- P1 prepared / reserved (registry only — no UI or persistence flows yet) ---
    gathered_via: {
      key: "gathered_via",
      label: "Gathered via",
      family: RELATION_FAMILIES.DROP_YIELD,
      direction: "source → target (Resource gathered via method/node/tool)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.PLACE, ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "gather_method_link",
      dbCode: null,
      priority: "P1",
      properties: ["method", "tool", "node_type", "conditions", "evidence_tier", "confidence", "source_post_id"],
      status: "reserved",
      persistence: "reserved",
      notes: "P1 reserved — gather method/node expansion; no production flow yet. P1-F registry interprets method/tool qualifiers future-safe.",
    },
    crafted_by_profession: {
      key: "crafted_by_profession",
      label: "Crafted by profession",
      family: RELATION_FAMILIES.CRAFT,
      direction: "source → target (Item crafted by profession/skill)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "review_required",
      conflictBehavior: "coexist_as_reported",
      renderHint: "profession_link",
      dbCode: null,
      priority: "P1",
      properties: ["required_level", "unlock_type", "evidence_tier", "source_post_id"],
      status: "reserved",
      persistence: "reserved",
      notes: "P1 reserved — profession model not implemented. P1-F registry maps to SYSTEM/profession_type future-safe.",
    },
    sold_by: {
      key: "sold_by",
      label: "Sold by",
      family: RELATION_FAMILIES.DROP_YIELD,
      direction: "source → target (Object sold by vendor/NPC/system)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.BEING, ENTITY_DOMAINS.SYSTEM, ENTITY_DOMAINS.PLACE],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "vendor_link",
      dbCode: null,
      priority: "P1",
      properties: ["price", "currency", "availability", "evidence_tier", "source_post_id"],
      status: "reserved",
      persistence: "reserved",
      notes: "P1 reserved — economy/vendor flows not implemented.",
    },
    reward_of: {
      key: "reward_of",
      label: "Reward of",
      family: RELATION_FAMILIES.SOCIAL_LORE,
      direction: "source → target (Object reward of quest/event)",
      allowedSourceDomains: [ENTITY_DOMAINS.OBJECT],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM, ENTITY_DOMAINS.EVENT],
      inverse: null,
      mergeBehavior: "review_required",
      conflictBehavior: "none",
      renderHint: "reward_link",
      dbCode: null,
      priority: "P1",
      properties: ["evidence_tier", "source_post_id", "note"],
      status: "reserved",
      persistence: "reserved",
    },
    mountable_by: {
      key: "mountable_by",
      label: "Mountable by",
      family: RELATION_FAMILIES.COMBAT_SYSTEM,
      direction: "source → target (Mount capability for entity/class)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING],
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM, ENTITY_DOMAINS.BEING],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "mount_capability",
      dbCode: null,
      priority: "P1",
      properties: ["required_level", "evidence_tier", "source_post_id"],
      status: "reserved",
      persistence: "reserved",
      notes: "P1 reserved — mount stays BEING + role/capability. P1-F registry future-safe.",
    },
    tamed_via: {
      key: "tamed_via",
      label: "Tamed via",
      family: RELATION_FAMILIES.COMBAT_SYSTEM,
      direction: "source → target (Being tamed via method/item)",
      allowedSourceDomains: [ENTITY_DOMAINS.BEING],
      allowedTargetDomains: [ENTITY_DOMAINS.OBJECT, ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "review_required",
      conflictBehavior: "none",
      renderHint: "taming_method",
      dbCode: null,
      priority: "P1",
      properties: ["method", "tool", "evidence_tier", "source_post_id"],
      status: "reserved",
      persistence: "reserved",
      notes: "P1 reserved — taming flow not implemented. P1-F registry interprets method/tool qualifiers future-safe.",
    },
    occurs_during: {
      key: "occurs_during",
      label: "Occurs during",
      family: RELATION_FAMILIES.SOCIAL_LORE,
      direction: "source → target (Event occurs during another event/window)",
      allowedSourceDomains: [ENTITY_DOMAINS.EVENT],
      allowedTargetDomains: [ENTITY_DOMAINS.EVENT, ENTITY_DOMAINS.SYSTEM],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "event_window",
      dbCode: null,
      priority: "P2",
      properties: ["valid_from", "valid_until", "evidence_tier", "source_post_id"],
      status: "reserved",
      persistence: "reserved",
    },
    introduced_in: {
      key: "introduced_in",
      label: "Introduced in",
      family: RELATION_FAMILIES.TAXONOMIC,
      direction: "source → target (Entity introduced in game version)",
      allowedSourceDomains: Object.values(ENTITY_DOMAINS),
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM, ENTITY_DOMAINS.META],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "version_intro",
      dbCode: null,
      priority: "P2",
      properties: VERSION_QUALIFIER_KEYS.concat(["evidence_tier", "source_post_id"]),
      status: "reserved",
      persistence: "reserved",
    },
    changed_in: {
      key: "changed_in",
      label: "Changed in",
      family: RELATION_FAMILIES.TAXONOMIC,
      direction: "source → target (Entity changed in game version)",
      allowedSourceDomains: Object.values(ENTITY_DOMAINS),
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM, ENTITY_DOMAINS.META],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "version_change",
      dbCode: null,
      priority: "P2",
      properties: VERSION_QUALIFIER_KEYS.concat(["change_note", "evidence_tier", "source_post_id"]),
      status: "reserved",
      persistence: "reserved",
    },
    removed_in: {
      key: "removed_in",
      label: "Removed in",
      family: RELATION_FAMILIES.TAXONOMIC,
      direction: "source → target (Entity removed in game version)",
      allowedSourceDomains: Object.values(ENTITY_DOMAINS),
      allowedTargetDomains: [ENTITY_DOMAINS.SYSTEM, ENTITY_DOMAINS.META],
      inverse: null,
      mergeBehavior: "additive",
      conflictBehavior: "none",
      renderHint: "version_removal",
      dbCode: null,
      priority: "P2",
      properties: VERSION_QUALIFIER_KEYS.concat(["change_note", "evidence_tier", "source_post_id"]),
      status: "reserved",
      persistence: "reserved",
    },
  };

  // Registry 2.0 profile overrides (merged onto canonical definitions at read time)
  const REGISTRY_2_OVERRIDES = {
    found_in: {
      qualifiers_allowed: ["condition", "time_of_day", "weather", "biome_context", "confidence", "evidence_tier", "source_post_id", "report_count"].concat(VERSION_QUALIFIER_KEYS),
      cardinality: "many_to_many",
      persistence: "persisted_forward",
      dedupe_key: ["source_entity_key", "target_entity_key", "relation_type"],
      search_expansion: { include_target: true, include_label: true, weight: 1 },
      promotion_weight: 1,
      version_support: true,
      status: "active",
    },
    located_in: {
      qualifiers_allowed: ["confidence", "evidence_tier", "source_post_id"].concat(VERSION_QUALIFIER_KEYS),
      cardinality: "many_to_one",
      persistence: "persisted_forward",
      promotion_weight: 1,
      version_support: true,
      status: "active",
    },
    spawns_at: {
      qualifiers_allowed: ["condition", "time_of_day", "weather", "biome_context", "confidence", "evidence_tier", "source_post_id", "report_count"],
      cardinality: "many_to_many",
      persistence: "persisted_forward",
      status: "active",
    },
    drops: {
      qualifiers_allowed: ["quantity", "unit", "drop_chance", "rate", "confidence", "evidence_tier", "source_post_id", "report_count"],
      cardinality: "many_to_many",
      persistence: "persisted_forward",
      dedupe_key: ["source_entity_key", "target_entity_key", "relation_type"],
      status: "active",
    },
    harvested_from: {
      qualifiers_allowed: ["quantity", "unit", "method", "tool", "node_type", "condition", "rate", "confidence", "evidence_tier", "source_post_id"],
      cardinality: "many_to_many",
      persistence: "persisted_forward",
      status: "active",
    },
    crafted_from: {
      qualifiers_allowed: ["quantity", "unit", "alternative_group", "confidence", "evidence_tier", "source_post_id", "report_count"].concat(VERSION_QUALIFIER_KEYS),
      cardinality: "many_to_many",
      persistence: "persisted_forward",
      directionality: "directed",
      mirror_behavior: "none",
      canonical_pair_order: "preserve",
      dedupe_key: ["source_entity_key", "target_entity_key", "relation_type", "alternative_group", "quantity", "unit"],
      search_expansion: { include_target: true, include_label: true, weight: 1.1 },
      promotion_weight: 1.2,
      version_support: true,
      status: "active",
      notes: "Forward craft ingredient edge; do not persist ingredient_of separately.",
    },
    crafted_at: {
      qualifiers_allowed: ["station", "station_tier", "confidence", "evidence_tier", "source_post_id"].concat(VERSION_QUALIFIER_KEYS),
      cardinality: "many_to_one",
      persistence: "persisted_forward",
      directionality: "directed",
      mirror_behavior: "none",
      canonical_pair_order: "preserve",
      search_expansion: { include_target: true, include_label: true, weight: 1 },
      promotion_weight: 1.1,
      version_support: true,
      status: "active",
    },
    ingredient_of: {
      qualifiers_allowed: ["quantity", "unit", "alternative_group", "confidence", "evidence_tier", "source_post_id"],
      cardinality: "many_to_many",
      persistence: "derived_inverse",
      directionality: "derived_inverse",
      mirror_behavior: "derived_inverse",
      canonical_pair_order: "preserve",
      dedupe_key: ["source_entity_key", "target_entity_key", "relation_type", "alternative_group", "quantity", "unit"],
      search_expansion: { include_target: true, include_label: true, weight: 0.6 },
      promotion_weight: 0.5,
      version_support: true,
      status: "active",
      notes: "Derived inverse of crafted_from — never double-persist.",
    },
    unlocks: {
      qualifiers_allowed: ["condition", "unlock_type", "required_level", "evidence_tier", "source_post_id"].concat(VERSION_QUALIFIER_KEYS),
      persistence: "persisted_forward",
      status: "active",
    },
    weak_to: { persistence: "persisted_forward", status: "active" },
    resistant_to: { persistence: "persisted_forward", status: "active" },
    inflicts: { persistence: "persisted_forward", status: "active" },
    member_of: { persistence: "persisted_forward", status: "active" },
    hostile_to: {
      persistence: "persisted_forward",
      status: "active",
      directionality: "symmetric",
      mirror_behavior: "symmetric_dedupe",
      canonical_pair_order: "sort_endpoints",
    },
    allied_to: {
      persistence: "persisted_forward",
      status: "active",
      directionality: "symmetric",
      mirror_behavior: "symmetric_dedupe",
      canonical_pair_order: "sort_endpoints",
    },
    gives_quest: { persistence: "persisted_forward", status: "active" },
    variant_of: { persistence: "persisted_forward", status: "active" },
    part_of: { persistence: "persisted_forward", status: "active" },
    related_to: {
      persistence: "persisted_forward",
      promotion_weight: 0.4,
      status: "active",
      directionality: "symmetric",
      mirror_behavior: "symmetric_dedupe",
      canonical_pair_order: "sort_endpoints",
      notes: "Fallback weak link — note required for new systems.",
    },
    dropped_by: {
      persistence: "derived_inverse",
      directionality: "derived_inverse",
      mirror_behavior: "derived_inverse",
      canonical_pair_order: "preserve",
      promotion_weight: 0.5,
      status: "active",
      notes: "Legacy inverse of drops — prefer single-write drops in P1.",
    },
    contains: { persistence: "persisted_forward", status: "active", notes: "Legacy biome list edge." },
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

  // T3 namespace slug prefixes — reserved, no auto-entity creation (docs only for now).
  const T3_RESERVED_SLUG_PREFIXES = ["quest-", "class-", "talent-", "event-", "faction-"];

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  function uniqueStrings(list) {
    const out = [];
    (list || []).forEach(function(item) {
      const value = String(item || "").trim();
      if (!value || out.indexOf(value) >= 0) return;
      out.push(value);
    });
    return out;
  }

  function isEmptyQualifierValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === "string" && !value.trim()) return true;
    if (Array.isArray(value) && !value.length) return true;
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) return true;
    return false;
  }

  function stripEmptyQualifiers(qualifiers) {
    const input = qualifiers && typeof qualifiers === "object" ? qualifiers : {};
    const out = {};
    Object.keys(input).forEach(function(key) {
      const value = input[key];
      if (!isEmptyQualifierValue(value)) out[key] = value;
    });
    return out;
  }

  function mapPropertiesToQualifiers(properties) {
    return Array.isArray(properties) ? properties.slice() : [];
  }

  function normalizeRelationDefinition(def) {
    if (!def || typeof def !== "object") return null;
    const key = String(def.key || "").trim();
    const override = key ? (REGISTRY_2_OVERRIDES[key] || {}) : {};
    const fromProperties = mapPropertiesToQualifiers(def.properties);
    const mergedQualifiers = uniqueStrings([].concat(override.qualifiers_allowed || []).concat(fromProperties));
    const merged = Object.assign({}, DEFAULT_REGISTRY_2, def, override, {
      qualifiers_allowed: mergedQualifiers.length ? mergedQualifiers : fromProperties,
    });

    if (merged.mergeBehavior === "auto_derived_from_crafted_from" && !override.persistence) {
      merged.persistence = "derived_inverse";
    }
    if (merged.key === "ingredient_of" && !override.persistence) {
      merged.persistence = "derived_inverse";
    }
    if (merged.key === "dropped_by" && !override.persistence) {
      merged.persistence = "derived_inverse";
    }
    if (merged.status === "reserved" && !def.persistence && !override.persistence) {
      merged.persistence = "reserved";
    }
    if (!merged.directionality) {
      if (merged.persistence === "derived_inverse") {
        merged.directionality = RELATION_DIRECTIONALITY.DERIVED_INVERSE;
      } else if (merged.inverse && merged.inverse === merged.key) {
        merged.directionality = RELATION_DIRECTIONALITY.SYMMETRIC;
      } else {
        merged.directionality = RELATION_DIRECTIONALITY.DIRECTED;
      }
    }
    if (!merged.mirror_behavior) {
      if (merged.persistence === "reserved" || merged.status === "reserved") {
        merged.mirror_behavior = RELATION_MIRROR_BEHAVIOR.RESERVED;
      } else if (merged.directionality === RELATION_DIRECTIONALITY.DERIVED_INVERSE) {
        merged.mirror_behavior = RELATION_MIRROR_BEHAVIOR.DERIVED_INVERSE;
      } else if (merged.directionality === RELATION_DIRECTIONALITY.SYMMETRIC) {
        merged.mirror_behavior = RELATION_MIRROR_BEHAVIOR.SYMMETRIC_DEDUPE;
      } else {
        merged.mirror_behavior = RELATION_MIRROR_BEHAVIOR.NONE;
      }
    }
    if (!merged.canonical_pair_order) {
      merged.canonical_pair_order = merged.directionality === RELATION_DIRECTIONALITY.SYMMETRIC
        ? CANONICAL_PAIR_ORDER.SORT_ENDPOINTS
        : CANONICAL_PAIR_ORDER.PRESERVE;
    }

    return merged;
  }

  function isEnumConfidenceValue(value) {
    if (value == null || value === "") return false;
    if (typeof value === "number" || Number.isFinite(Number(value))) return false;
    const v = String(value).trim().toLowerCase();
    return CONTROLLED_VOCABULARIES.confidence.indexOf(v) >= 0;
  }

  function extractRelationQualifiers(type, relationOrPayload) {
    const out = {};
    if (!relationOrPayload || typeof relationOrPayload !== "object") return out;

    const nested = relationOrPayload.qualifiers && typeof relationOrPayload.qualifiers === "object"
      ? relationOrPayload.qualifiers
      : {};
    Object.keys(nested).forEach(function(key) {
      const value = nested[key];
      if (key === "_unknown" && value && typeof value === "object") {
        out._unknown = Object.assign({}, value);
        return;
      }
      if (!isEmptyQualifierValue(value)) out[key] = value;
    });

    QUALIFIER_LEGACY_TOP_LEVEL_KEYS.forEach(function(key) {
      const value = relationOrPayload[key];
      if (key === "confidence") {
        if (isEnumConfidenceValue(value)) out.confidence = String(value).trim().toLowerCase();
        return;
      }
      if (!isEmptyQualifierValue(value)) out[key] = value;
    });

    return stripEmptyQualifiers(out);
  }

  function mergeRelationQualifiers(type, baseQualifiers, relationOrPayload) {
    const base = baseQualifiers && typeof baseQualifiers === "object" ? Object.assign({}, baseQualifiers) : {};
    const extracted = extractRelationQualifiers(type, relationOrPayload);
    const merged = Object.assign({}, base, extracted);
    if (base._unknown || extracted._unknown) {
      merged._unknown = Object.assign({}, base._unknown || {}, extracted._unknown || {});
    }
    return normalizeRelationQualifiers(type, merged);
  }

  function preserveRelationQualifiers(type, relationOrPayload) {
    return normalizeRelationQualifiers(type, extractRelationQualifiers(type, relationOrPayload));
  }

  function normalizeRelationRecord(type, relationOrPayload) {
    if (!relationOrPayload || typeof relationOrPayload !== "object") return null;
    const relType = normalizeRelationType(type || relationOrPayload.relation_type || "");
    const out = Object.assign({}, relationOrPayload);
    const qualifiers = preserveRelationQualifiers(relType, relationOrPayload);

    if (Object.keys(qualifiers).length) {
      out.qualifiers = qualifiers;
    } else if (out.qualifiers) {
      delete out.qualifiers;
    }

    QUALIFIER_LEGACY_TOP_LEVEL_KEYS.forEach(function(key) {
      if (key === "confidence" && out.confidence != null && !isEnumConfidenceValue(out.confidence)) {
        if (qualifiers.confidence != null) out.confidence = qualifiers.confidence;
        return;
      }
      if (qualifiers[key] != null && !isEmptyQualifierValue(qualifiers[key])) {
        out[key] = qualifiers[key];
      }
    });

    return out;
  }

  function collectQualifierSearchSignals(type, relationOrPayload) {
    const signals = [];
    const qualifiers = extractRelationQualifiers(type, relationOrPayload);
    Object.keys(qualifiers).forEach(function(key) {
      if (QUALIFIER_SEARCH_SKIP_KEYS[key]) return;
      const value = qualifiers[key];
      if (value == null || typeof value === "object") return;
      const text = String(value).trim();
      if (!text) return;
      signals.push(text);
    });
    return signals;
  }

  function normalizeRelationQualifiers(type, qualifiers) {
    const input = qualifiers && typeof qualifiers === "object" ? Object.assign({}, qualifiers) : {};
    const stripped = stripEmptyQualifiers(input);
    const allowed = getAllowedQualifiers(type);
    const out = {};

    Object.keys(stripped).forEach(function(key) {
      const value = stripped[key];
      if (allowed.indexOf(key) >= 0 || QUALIFIER_REGISTRY[key]) {
        out[key] = value;
        return;
      }
      if (!out._unknown) out._unknown = {};
      out._unknown[key] = value;
    });

    if (typeof BoundLoreVersioning !== "undefined" && relationSupportsVersioning(type)) {
      const versionMeta = BoundLoreVersioning.extractVersionMetadata
        ? BoundLoreVersioning.extractVersionMetadata(out)
        : null;
      if (!versionMeta) {
        VERSION_QUALIFIER_KEYS.forEach(function(vKey) {
          if (isEmptyQualifierValue(out[vKey])) delete out[vKey];
        });
      }
    }

    return out;
  }

  function getAllowedQualifiers(type) {
    const def = getRelationDefinition(type);
    return def && Array.isArray(def.qualifiers_allowed) ? def.qualifiers_allowed.slice() : [];
  }

  function relationSupportsVersioning(type) {
    const def = getRelationDefinition(type);
    return !!(def && def.version_support);
  }

  function getRelationSearchExpansion(type) {
    const def = getRelationDefinition(type);
    if (!def || isReservedRelation(type)) return null;
    return def.search_expansion || null;
  }

  function getRelationPersistence(type) {
    const def = getRelationDefinition(type);
    return def && def.persistence ? def.persistence : "persisted_forward";
  }

  function isDerivedRelation(type) {
    const persistence = getRelationPersistence(type);
    return persistence === "derived_inverse" || persistence === "embedded";
  }

  function isPersistedRelation(type) {
    return getRelationPersistence(type) === "persisted_forward";
  }

  function isReservedRelation(type) {
    const def = getRelationDefinition(type);
    return !!(def && (def.status === "reserved" || def.persistence === "reserved"));
  }

  function normalizeKey(raw) {
    const key = String(raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (RELATION_DEFINITIONS[key]) return key;
    if (LEGACY_ALIASES[key]) return LEGACY_ALIASES[key];
    return key;
  }

  function normalizeRelationType(type) {
    const raw = String(type || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
    if (!raw) return "";
    // Preserve legacy/inverse types that have their own definitions.
    if (RELATION_DEFINITIONS[raw]) return raw;
    if (LEGACY_ALIASES[raw]) return LEGACY_ALIASES[raw];
    return raw;
  }

  function isReservedT3Slug(slug) {
    const s = String(slug || "").trim().toLowerCase();
    if (!s) return false;
    for (let i = 0; i < T3_RESERVED_SLUG_PREFIXES.length; i += 1) {
      if (s.indexOf(T3_RESERVED_SLUG_PREFIXES[i]) === 0) return true;
    }
    return false;
  }

  function getRelationDefinition(key) {
    const normalized = normalizeKey(key);
    const base = RELATION_DEFINITIONS[normalized];
    if (!base) {
      return normalizeRelationDefinition({
        key: normalized,
        label: normalized.replace(/_/g, " "),
        family: null,
        status: "unknown",
        persistence: "persisted_forward",
        properties: [],
        notes: "Unknown relation type — tolerated at read time.",
      });
    }
    return normalizeRelationDefinition(base);
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

  function escapeRegistryHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseEvidenceTierValue(value) {
    if (value == null || value === "") return null;
    const v = String(value).trim().toLowerCase();
    if (!v) return null;
    return CONTROLLED_VOCABULARIES.evidence_tier.indexOf(v) >= 0 ? v : null;
  }

  function coerceConfidenceKey(value) {
    if (value == null || value === "") return null;
    let raw = String(value).trim().toLowerCase();
    if (!raw) return null;
    raw = raw.replace(/^\d+-/, "");
    const underscored = raw.replace(/-/g, "_");
    if (CONTROLLED_VOCABULARIES.confidence.indexOf(underscored) >= 0) return underscored;
    const aliases = {
      rumor: "rumor",
      repeated_observation: "repeated_observation",
      confirmed: "verified",
    };
    if (aliases[underscored]) return aliases[underscored];
    if (underscored === "rumor" || underscored === "repeated_observation") return underscored;
    return null;
  }

  const EVIDENCE_TIER_LABELS = {
    confirmed: "Confirmed",
    observed: "Observed",
    reported: "Reported",
    speculative: "Speculative",
  };

  const CONFIDENCE_LABELS = {
    single_observation: "Single Observation",
    corroborated: "Corroborated",
    verified: "Verified",
    repeated_observation: "Repeated Observation",
    rumor: "Rumor",
  };

  function formatEvidenceTierLabel(value) {
    const key = parseEvidenceTierValue(value);
    if (!key) return null;
    return EVIDENCE_TIER_LABELS[key] || null;
  }

  function formatConfidenceLabel(value) {
    const key = coerceConfidenceKey(value);
    if (!key) return null;
    return CONFIDENCE_LABELS[key] || null;
  }

  function resolveEvidenceSignals(sources) {
    const src = sources && typeof sources === "object" ? sources : {};
    const meta = src.meta && typeof src.meta === "object" ? src.meta : {};
    const payload = src.payload && typeof src.payload === "object" ? src.payload : {};
    const resource = payload.resource && typeof payload.resource === "object" ? payload.resource : null;
    const recipe = payload.recipe && typeof payload.recipe === "object" ? payload.recipe : null;
    let evidenceTier = src.evidence_tier || src.evidenceTier || null;
    let confidence = src.confidence || src.confidence_level || null;
    if (resource) {
      evidenceTier = evidenceTier || resource.evidence_tier || payload.evidence_tier || null;
      confidence = confidence || resource.confidence || payload.confidence_level || payload.confidence || null;
    } else if (recipe) {
      evidenceTier = evidenceTier || recipe.evidence_tier || null;
      confidence = confidence || recipe.confidence || null;
    } else {
      evidenceTier = evidenceTier || payload.evidence_tier || meta.evidence_tier || null;
      confidence = confidence || payload.confidence_level || payload.confidence || meta.confidence_level || null;
    }
    return {
      evidenceTier: evidenceTier,
      confidence: confidence,
      tierLabel: formatEvidenceTierLabel(evidenceTier),
      confidenceLabel: formatConfidenceLabel(confidence),
    };
  }

  function renderEvidenceBadge(evidenceTier, options) {
    const opts = options || {};
    const key = parseEvidenceTierValue(evidenceTier);
    const label = formatEvidenceTierLabel(evidenceTier);
    if (!key || !label) return "";
    return '<span class="bl-evidence-badge evidence-' + escapeRegistryHtml(key) + (opts.className ? " " + escapeRegistryHtml(opts.className) : "") + '">' +
      escapeRegistryHtml(label) + "</span>";
  }

  function renderConfidenceBadge(confidence, options) {
    const opts = options || {};
    const key = coerceConfidenceKey(confidence);
    const label = formatConfidenceLabel(confidence);
    if (!key || !label) return "";
    return '<span class="bl-evidence-badge bl-confidence-badge confidence-' + escapeRegistryHtml(key.replace(/_/g, "-")) +
      (opts.className ? " " + escapeRegistryHtml(opts.className) : "") + '">' +
      escapeRegistryHtml(label) + "</span>";
  }

  function renderEvidenceBadgeGroup(evidenceTier, confidence, options) {
    const opts = options || {};
    const tierHtml = renderEvidenceBadge(evidenceTier, opts);
    const confidenceHtml = renderConfidenceBadge(confidence, opts);
    if (!tierHtml && !confidenceHtml) return "";
    return '<div class="bl-evidence-badges' + (opts.groupClassName ? " " + escapeRegistryHtml(opts.groupClassName) : "") + '">' +
      tierHtml + confidenceHtml + "</div>";
  }

  function getDomainForCategory(categorySlug) {
    return CATEGORY_DOMAIN_MAP[String(categorySlug || "").toLowerCase()] || null;
  }

  function getRelationDirectionality(type) {
    const def = getRelationDefinition(type);
    if (!def) return RELATION_DIRECTIONALITY.DIRECTED;
    return def.directionality || RELATION_DIRECTIONALITY.DIRECTED;
  }

  function getRelationMirrorBehavior(type) {
    const def = getRelationDefinition(type);
    if (!def) return RELATION_MIRROR_BEHAVIOR.NONE;
    if (isReservedRelation(type)) return RELATION_MIRROR_BEHAVIOR.RESERVED;
    return def.mirror_behavior || RELATION_MIRROR_BEHAVIOR.NONE;
  }

  function isSymmetricRelation(type) {
    return getRelationDirectionality(type) === RELATION_DIRECTIONALITY.SYMMETRIC;
  }

  function relationUsesCanonicalPair(type) {
    const def = getRelationDefinition(type);
    if (!def) return false;
    return def.canonical_pair_order === CANONICAL_PAIR_ORDER.SORT_ENDPOINTS;
  }

  function normalizeRelationEndpoint(value) {
    const raw = String(value == null ? "" : value).trim().toLowerCase();
    if (!raw) return "";
    return raw.replace(/\s+/g, " ").replace(/-/g, "_");
  }

  function getCanonicalRelationPair(type, source, target) {
    const src = normalizeRelationEndpoint(source);
    const tgt = normalizeRelationEndpoint(target);
    if (!src && !tgt) return { source: "", target: "" };
    if (relationUsesCanonicalPair(type)) {
      if (src <= tgt) return { source: src, target: tgt };
      return { source: tgt, target: src };
    }
    return { source: src, target: tgt };
  }

  function extractRelationEndpoints(record) {
    const rel = record && typeof record === "object" ? record : {};
    const source = rel.source_post_id || rel.source_post_slug || rel.source_entity_key ||
      rel.source_title || rel.source_post_title || rel.source_name || "";
    const target = rel.target_post_id || rel.target_post_slug || rel.target_entity_key ||
      rel.title || rel.target_name || rel.target_title || rel.target_post_title || "";
    return {
      source: normalizeRelationEndpoint(source),
      target: normalizeRelationEndpoint(target),
    };
  }

  function qualifierValuesForDedupeKey(type, record) {
    const rel = record && typeof record === "object" ? record : {};
    const qualifiers = extractRelationQualifiers(type, rel);
    const def = getRelationDefinition(type);
    const keys = def && Array.isArray(def.dedupe_key) ? def.dedupe_key.slice() : [];
    const parts = [];
    keys.forEach(function(key) {
      if (key === "source_entity_key" || key === "target_entity_key" || key === "relation_type") return;
      let value = qualifiers[key];
      if (value == null && rel[key] != null) value = rel[key];
      if (value == null || typeof value === "object") return;
      const text = String(value).trim();
      if (text) parts.push(key + "=" + normalizeRelationEndpoint(text));
    });
    return parts;
  }

  function getRelationDedupeKey(type, relationOrSource, maybeTarget) {
    let record = relationOrSource;
    let relType = type;
    if (relationOrSource && typeof relationOrSource === "object" && maybeTarget === undefined) {
      relType = normalizeRelationType(relType || relationOrSource.relation_type || relationOrSource.type || "");
      record = relationOrSource;
    } else {
      relType = normalizeRelationType(relType || "");
      record = {
        relation_type: relType,
        source_post_id: relationOrSource,
        target_post_id: maybeTarget,
      };
    }
    if (!relType) return "";

    const endpoints = extractRelationEndpoints(record);
    const pair = getCanonicalRelationPair(relType, endpoints.source, endpoints.target);
    const qualifierPart = qualifierValuesForDedupeKey(relType, record).join("|");
    const base = [
      relType,
      pair.source || "_",
      pair.target || "_",
    ].join("|");
    return qualifierPart ? base + "|" + qualifierPart : base;
  }

  function areRelationRecordsEquivalent(a, b) {
    if (!a || !b) return false;
    const typeA = normalizeRelationType(a.relation_type || a.type || "");
    const typeB = normalizeRelationType(b.relation_type || b.type || "");
    if (!typeA || typeA !== typeB) return false;
    return getRelationDedupeKey(typeA, a) === getRelationDedupeKey(typeB, b);
  }

  function swapRelationEndpointFields(record) {
    const out = Object.assign({}, record);
    const swapPairs = [
      ["source_post_id", "target_post_id"],
      ["source_post_slug", "target_post_slug"],
      ["source_entity_key", "target_entity_key"],
      ["source_title", "title"],
      ["source_post_title", "target_post_title"],
      ["source_name", "target_name"],
    ];
    swapPairs.forEach(function(pair) {
      const left = out[pair[0]];
      const right = out[pair[1]];
      if (left !== undefined || right !== undefined) {
        out[pair[0]] = right;
        out[pair[1]] = left;
      }
    });
    return out;
  }

  function deriveMirrorRelation(record, options) {
    const opts = options || {};
    if (!record || typeof record !== "object") return null;
    const type = normalizeRelationType(record.relation_type || record.type || "");
    if (!type || isReservedRelation(type)) return null;

    const behavior = getRelationMirrorBehavior(type);
    if (behavior === RELATION_MIRROR_BEHAVIOR.NONE || behavior === RELATION_MIRROR_BEHAVIOR.RESERVED) {
      return null;
    }

    const endpoints = extractRelationEndpoints(record);
    if (behavior === RELATION_MIRROR_BEHAVIOR.SYMMETRIC_DEDUPE) {
      const pair = getCanonicalRelationPair(type, endpoints.source, endpoints.target);
      return Object.assign({}, record, {
        relation_type: type,
        _mirror_kind: "symmetric_canonical",
        _canonical_source: pair.source,
        _canonical_target: pair.target,
      });
    }

    if (behavior === RELATION_MIRROR_BEHAVIOR.DERIVED_INVERSE) {
      const def = getRelationDefinition(type);
      const inverseType = def && def.inverse ? normalizeRelationType(def.inverse) : "";
      if (!inverseType || inverseType === type) return null;
      const mirrored = swapRelationEndpointFields(Object.assign({}, record, {
        relation_type: inverseType,
        _mirror_kind: "derived_inverse",
        _derived_from_type: type,
      }));
      return mirrored;
    }

    return null;
  }

  function shouldPersistRelationDirection(type, source, target) {
    const relType = normalizeRelationType(type);
    if (!relType || isReservedRelation(relType)) return false;
    if (isDerivedRelation(relType)) return false;

    const directionality = getRelationDirectionality(relType);
    if (directionality === RELATION_DIRECTIONALITY.SYMMETRIC) {
      const pair = getCanonicalRelationPair(relType, source, target);
      if (!pair.source || !pair.target) return true;
      return pair.source <= pair.target;
    }
    return directionality === RELATION_DIRECTIONALITY.DIRECTED;
  }

  function dedupeRelationRecords(records, options) {
    const opts = Object.assign({ skipDerivedInverseDuplicates: true }, options || {});
    const list = Array.isArray(records) ? records : [];
    const out = [];
    const seen = new Set();
    const forwardKeys = new Set();

    list.forEach(function(record) {
      if (!record || typeof record !== "object") return;
      const type = normalizeRelationType(record.relation_type || record.type || "");
      if (!type) return;
      if (isReservedRelation(type)) return;

      const normalized = normalizeRelationRecord(type, record) || record;
      const key = getRelationDedupeKey(type, normalized);
      if (!key || seen.has(key)) return;

      if (opts.skipDerivedInverseDuplicates && getRelationMirrorBehavior(type) === RELATION_MIRROR_BEHAVIOR.DERIVED_INVERSE) {
        const def = getRelationDefinition(type);
        const forwardType = def && def.inverse ? normalizeRelationType(def.inverse) : "";
        if (forwardType && forwardType !== type) {
          const mirror = deriveMirrorRelation(normalized);
          const forwardKey = mirror ? getRelationDedupeKey(forwardType, mirror) : "";
          if (forwardKey && forwardKeys.has(forwardKey)) return;
        }
      }

      seen.add(key);
      if (getRelationMirrorBehavior(type) === RELATION_MIRROR_BEHAVIOR.NONE ||
          getRelationDirectionality(type) === RELATION_DIRECTIONALITY.DIRECTED) {
        forwardKeys.add(key);
      }
      out.push(normalized);
    });

    return out;
  }

  function resolveCanonicalKey(raw) {
    return normalizeKey(raw);
  }

  return {
    ENTITY_DOMAINS: ENTITY_DOMAINS,
    RELATION_FAMILIES: RELATION_FAMILIES,
    RELATION_DEFINITIONS: RELATION_DEFINITIONS,
    RELATION_PROPERTY_SCHEMA: RELATION_PROPERTY_SCHEMA,
    QUALIFIER_REGISTRY: QUALIFIER_REGISTRY,
    QUALIFIER_LEGACY_TOP_LEVEL_KEYS: QUALIFIER_LEGACY_TOP_LEVEL_KEYS,
    REGISTRY_2_OVERRIDES: REGISTRY_2_OVERRIDES,
    RELATION_DIRECTIONALITY: RELATION_DIRECTIONALITY,
    RELATION_MIRROR_BEHAVIOR: RELATION_MIRROR_BEHAVIOR,
    CANONICAL_PAIR_ORDER: CANONICAL_PAIR_ORDER,
    CONTROLLED_VOCABULARIES: CONTROLLED_VOCABULARIES,
    LEGACY_ALIASES: LEGACY_ALIASES,
    CATEGORY_DOMAIN_MAP: CATEGORY_DOMAIN_MAP,
    T3_RESERVED_SLUG_PREFIXES: T3_RESERVED_SLUG_PREFIXES,
    normalizeRelationDefinition: normalizeRelationDefinition,
    getRelationDefinition: getRelationDefinition,
    extractRelationQualifiers: extractRelationQualifiers,
    mergeRelationQualifiers: mergeRelationQualifiers,
    preserveRelationQualifiers: preserveRelationQualifiers,
    normalizeRelationRecord: normalizeRelationRecord,
    collectQualifierSearchSignals: collectQualifierSearchSignals,
    getAllowedQualifiers: getAllowedQualifiers,
    normalizeRelationQualifiers: normalizeRelationQualifiers,
    stripEmptyQualifiers: stripEmptyQualifiers,
    relationSupportsVersioning: relationSupportsVersioning,
    getRelationSearchExpansion: getRelationSearchExpansion,
    getRelationPersistence: getRelationPersistence,
    isDerivedRelation: isDerivedRelation,
    isPersistedRelation: isPersistedRelation,
    isReservedRelation: isReservedRelation,
    getRelationDirectionality: getRelationDirectionality,
    getRelationMirrorBehavior: getRelationMirrorBehavior,
    isSymmetricRelation: isSymmetricRelation,
    relationUsesCanonicalPair: relationUsesCanonicalPair,
    normalizeRelationEndpoint: normalizeRelationEndpoint,
    getCanonicalRelationPair: getCanonicalRelationPair,
    getRelationDedupeKey: getRelationDedupeKey,
    areRelationRecordsEquivalent: areRelationRecordsEquivalent,
    dedupeRelationRecords: dedupeRelationRecords,
    deriveMirrorRelation: deriveMirrorRelation,
    shouldPersistRelationDirection: shouldPersistRelationDirection,
    isKnownRelationType: isKnownRelationType,
    isLegacyRelationType: isLegacyRelationType,
    getRelationsByFamily: getRelationsByFamily,
    getAllowedRelationTypesForDomains: getAllowedRelationTypesForDomains,
    normalizeEvidenceTier: normalizeEvidenceTier,
    normalizeConfidence: normalizeConfidence,
    parseEvidenceTierValue: parseEvidenceTierValue,
    coerceConfidenceKey: coerceConfidenceKey,
    formatEvidenceTierLabel: formatEvidenceTierLabel,
    formatConfidenceLabel: formatConfidenceLabel,
    resolveEvidenceSignals: resolveEvidenceSignals,
    renderEvidenceBadge: renderEvidenceBadge,
    renderConfidenceBadge: renderConfidenceBadge,
    renderEvidenceBadgeGroup: renderEvidenceBadgeGroup,
    getDomainForCategory: getDomainForCategory,
    resolveCanonicalKey: resolveCanonicalKey,
    normalizeKey: normalizeKey,
    normalizeRelationType: normalizeRelationType,
    isReservedT3Slug: isReservedT3Slug,
  };
})();
