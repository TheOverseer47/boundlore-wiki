// ============================================
// BoundLore Contribution Intent Registry
// Code-only baseline for intent metadata, merge/review policies,
// and future P1-B flows. No UI, no DB, no migration.
// See docs/architecture/contribution-intent-matrix.md
// ============================================

window.BoundLoreContributionIntentRegistry = (function() {
  const DEFAULT_INTENT = {
    status: "active",
    target_domains: [],
    target_subtypes: [],
    payload_kind: "field_merge",
    required_fields: [],
    optional_fields: [],
    evidence_policy: "optional",
    review_mode: "standard",
    merge_behavior: "field_merge",
    conflict_behavior: "record_conflict",
    duplicate_key: ["target_entity_key", "intent"],
    relation_types: [],
    facet_groups: [],
    version_support: false,
    admin_preview: true,
    user_facing: true,
    notes: "",
  };

  const PRESERVE_PAYLOAD_KEYS = [
    "qualifiers", "version", "game_version", "valid_from", "valid_until",
    "superseded_by", "change_note", "evidence_tier", "confidence",
    "confidence_level", "evidence_notes", "source_post_id", "recipe",
    "ingredients", "station", "output_quantity", "unlock_condition",
    "entity_name", "contribution_intent", "intent",
  ];

  const INTENT_DEFINITIONS = {
    add_info: {
      code: "add_info",
      label: "Add information",
      description: "General notes or missing details on an entry.",
      payload_kind: "notes",
      required_fields: ["notes"],
      optional_fields: ["confidence_level", "evidence_notes"],
      merge_behavior: "field_merge",
      conflict_behavior: "append_notes_or_conflict",
      duplicate_key: ["target_entity_key", "intent", "notes"],
    },
    add_stats: {
      code: "add_stats",
      label: "Add stats",
      description: "Combat or item stats such as damage, scaling, durability.",
      target_domains: ["OBJECT", "BEING"],
      payload_kind: "facts",
      required_fields: [],
      optional_fields: ["damage", "scaling", "scaling_power", "durability", "stat_conditions", "confidence_level", "evidence_notes"],
      evidence_policy: "optional",
      review_mode: "conflict_sensitive",
      merge_behavior: "field_merge",
      conflict_behavior: "record_conflict",
      duplicate_key: ["target_entity_key", "intent", "damage", "scaling_power"],
    },
    add_effect: {
      code: "add_effect",
      label: "Add effect / use",
      description: "Item effect, use case, or how-tested notes.",
      target_domains: ["OBJECT"],
      payload_kind: "facts",
      required_fields: ["item_effect"],
      optional_fields: ["how_tested", "confidence_level", "evidence_notes"],
      merge_behavior: "field_merge",
      conflict_behavior: "record_conflict",
    },
    add_image: {
      code: "add_image",
      label: "Add image / evidence",
      description: "Screenshot or visual evidence with caption/context.",
      payload_kind: "evidence",
      required_fields: [],
      optional_fields: ["image_caption", "image_context", "image_url", "confidence_level", "evidence_notes"],
      evidence_policy: "recommended",
      merge_behavior: "evidence_attach",
      conflict_behavior: "coexist",
    },
    report_drop: {
      code: "report_drop",
      label: "Confirm drop source",
      description: "Link item ↔ creature drop relations (drops / dropped_by).",
      target_domains: ["OBJECT", "BEING"],
      payload_kind: "relations",
      required_fields: [],
      optional_fields: ["dropped_by", "dropped_item", "dropped_items", "relation_notes", "confidence_level", "evidence_notes"],
      relation_types: ["drops", "dropped_by"],
      merge_behavior: "relation_additive",
      conflict_behavior: "coexist_as_reported",
      duplicate_key: ["target_entity_key", "intent", "dropped_by", "dropped_items"],
      notes: "Creature-side variant uses dropped_item field; same intent code.",
    },
    confirm_location: {
      code: "confirm_location",
      label: "Confirm location",
      description: "Place or biome where an entity was found.",
      target_domains: ["OBJECT", "BEING", "PLACE"],
      payload_kind: "relations",
      required_fields: [],
      optional_fields: ["found_in", "region_name", "relation_notes", "confidence_level", "evidence_notes"],
      relation_types: ["found_in", "located_in"],
      merge_behavior: "relation_additive",
      conflict_behavior: "record_conflict",
    },
    add_behavior: {
      code: "add_behavior",
      label: "Add behavior",
      description: "Creature behavior and conditions.",
      target_domains: ["BEING"],
      payload_kind: "facts",
      required_fields: ["behavior"],
      optional_fields: ["behavior_conditions", "time_weather", "confidence_level", "evidence_notes"],
      merge_behavior: "field_merge",
      conflict_behavior: "append_or_conflict",
    },
    add_spawn: {
      code: "add_spawn",
      label: "Add spawn conditions",
      description: "When and where a creature spawns.",
      target_domains: ["BEING"],
      payload_kind: "facts",
      required_fields: ["spawn_conditions"],
      optional_fields: ["time_weather", "confidence_level", "evidence_notes"],
      relation_types: ["spawns_at"],
      merge_behavior: "field_and_relation",
      conflict_behavior: "record_conflict",
    },
    add_known_creature: {
      code: "add_known_creature",
      label: "Add known creature",
      description: "Link a biome/location to a known creature sighting.",
      target_domains: ["PLACE"],
      payload_kind: "relations",
      required_fields: ["entity_name"],
      optional_fields: ["relation_notes", "confidence_level", "evidence_notes"],
      relation_types: ["contains"],
      merge_behavior: "relation_additive",
      conflict_behavior: "coexist_as_reported",
    },
    add_known_item: {
      code: "add_known_item",
      label: "Add known item",
      description: "Link a biome/location to a known item or reward.",
      target_domains: ["PLACE"],
      payload_kind: "relations",
      required_fields: ["entity_name"],
      optional_fields: ["relation_notes", "confidence_level", "evidence_notes"],
      relation_types: ["contains", "related_discovery"],
      merge_behavior: "relation_additive",
      conflict_behavior: "coexist_as_reported",
    },
    add_recipe: {
      code: "add_recipe",
      label: "Add recipe",
      description: "Crafting recipe with ingredients and station.",
      target_domains: ["OBJECT"],
      target_subtypes: ["item", "weapon", "tool"],
      payload_kind: "recipe",
      required_fields: ["ingredients", "station"],
      optional_fields: ["output_quantity", "unlock_condition", "notes", "confidence_level", "evidence_notes", "qualifiers"],
      evidence_policy: "recommended",
      review_mode: "always_review",
      merge_behavior: "recipe_block_merge",
      conflict_behavior: "quantity_conflict_blocks_approve",
      duplicate_key: ["target_entity_key", "intent", "recipe_fingerprint"],
      relation_types: ["crafted_from", "crafted_at"],
      version_support: true,
      admin_preview: true,
      user_facing: true,
      notes: "Primary forward craft relations persisted; ingredient_of remains derived at read time.",
    },

    // --- P1 reserved (registry only — no UI, no merge flows) ---
    add_capability_role: {
      code: "add_capability_role",
      label: "Add capability role",
      description: "Mount/tame/craft capability roles (future).",
      status: "reserved",
      payload_kind: "reserved",
      merge_behavior: "none",
      conflict_behavior: "none",
      user_facing: false,
      admin_preview: false,
      notes: "P1 reserved — no production flow.",
    },
    correct_classification: {
      code: "correct_classification",
      label: "Correct classification",
      description: "Entity subtype or taxonomy correction (future).",
      status: "reserved",
      payload_kind: "reserved",
      merge_behavior: "none",
      conflict_behavior: "none",
      user_facing: false,
      admin_preview: false,
    },
    add_alias: {
      code: "add_alias",
      label: "Add alias",
      description: "Alternate name or search alias (future).",
      status: "reserved",
      payload_kind: "reserved",
      merge_behavior: "none",
      conflict_behavior: "none",
      user_facing: false,
      admin_preview: false,
    },
    resolve_unresolved_target: {
      code: "resolve_unresolved_target",
      label: "Resolve unresolved target",
      description: "Promote missing-entry suggestion to linked entity (future).",
      status: "reserved",
      payload_kind: "reserved",
      merge_behavior: "none",
      conflict_behavior: "none",
      user_facing: false,
      admin_preview: false,
    },
    add_version_change: {
      code: "add_version_change",
      label: "Add version change",
      description: "Patch/version validity change note (future).",
      status: "reserved",
      payload_kind: "versioned_statement",
      merge_behavior: "none",
      conflict_behavior: "none",
      version_support: true,
      user_facing: false,
      admin_preview: false,
    },
    add_source: {
      code: "add_source",
      label: "Add source",
      description: "Item/resource obtain source relations (future).",
      status: "reserved",
      payload_kind: "relations",
      relation_types: ["drops", "found_in", "harvested_from", "sold_by", "gathered_via"],
      merge_behavior: "none",
      conflict_behavior: "none",
      user_facing: false,
      admin_preview: false,
    },
    add_usage: {
      code: "add_usage",
      label: "Add usage",
      description: "Resource used-in / ingredient_of usage links (future).",
      status: "reserved",
      payload_kind: "relations",
      relation_types: ["ingredient_of"],
      merge_behavior: "none",
      conflict_behavior: "none",
      user_facing: false,
      admin_preview: false,
    },
    report_weakness_resistance: {
      code: "report_weakness_resistance",
      label: "Report weakness / resistance",
      description: "Combat weakness or resistance relations (future).",
      status: "reserved",
      payload_kind: "relations",
      relation_types: ["weak_to", "resistant_to"],
      merge_behavior: "none",
      conflict_behavior: "none",
      user_facing: false,
      admin_preview: false,
    },
    add_observation_location: {
      code: "add_observation_location",
      label: "Add observation location",
      description: "Structured observation-at-place contribution (future).",
      status: "reserved",
      payload_kind: "relations",
      relation_types: ["observed_in", "found_in"],
      merge_behavior: "none",
      conflict_behavior: "none",
      user_facing: false,
      admin_preview: false,
    },
    report_incorrect_info: {
      code: "report_incorrect_info",
      label: "Report incorrect info",
      description: "Moderation flag without direct merge (future).",
      status: "reserved",
      payload_kind: "moderation",
      merge_behavior: "none",
      conflict_behavior: "none",
      review_mode: "moderation_only",
      user_facing: false,
      admin_preview: true,
      notes: "Matrix intent — not yet a production contribution mask.",
    },
    suggest_rename: {
      code: "suggest_rename",
      label: "Suggest rename",
      description: "Admin-queue rename suggestion (future).",
      status: "reserved",
      payload_kind: "moderation",
      merge_behavior: "none",
      conflict_behavior: "none",
      review_mode: "admin_only",
      user_facing: false,
      admin_preview: true,
    },
    suggest_duplicate_merge: {
      code: "suggest_duplicate_merge",
      label: "Suggest duplicate merge",
      description: "Admin-queue duplicate merge suggestion (future).",
      status: "reserved",
      payload_kind: "moderation",
      merge_behavior: "none",
      conflict_behavior: "none",
      review_mode: "admin_only",
      user_facing: false,
      admin_preview: true,
    },
  };

  function normalizeIntentCode(raw) {
    return String(raw || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  }

  function isEmptyValue(value) {
    if (value === null || value === undefined) return true;
    if (typeof value === "string" && !value.trim()) return true;
    if (Array.isArray(value) && !value.length) return true;
    return false;
  }

  function stripEmptyStrings(obj) {
    const input = obj && typeof obj === "object" ? obj : {};
    const out = {};
    Object.keys(input).forEach(function(key) {
      const value = input[key];
      if (!isEmptyValue(value)) out[key] = value;
    });
    return out;
  }

  function normalizeIntentDefinition(def) {
    if (!def || typeof def !== "object") return null;
    const code = normalizeIntentCode(def.code || def.key || "");
    const merged = Object.assign({}, DEFAULT_INTENT, def, { code: code || def.code });
    merged.required_fields = Array.isArray(merged.required_fields) ? merged.required_fields.slice() : [];
    merged.optional_fields = Array.isArray(merged.optional_fields) ? merged.optional_fields.slice() : [];
    merged.relation_types = Array.isArray(merged.relation_types) ? merged.relation_types.slice() : [];
    merged.duplicate_key = Array.isArray(merged.duplicate_key) ? merged.duplicate_key.slice() : [];
    return merged;
  }

  function getIntentDefinition(code) {
    const normalized = normalizeIntentCode(code);
    const base = INTENT_DEFINITIONS[normalized];
    if (!base) {
      return normalizeIntentDefinition({
        code: normalized || "unknown",
        label: normalized ? normalized.replace(/_/g, " ") : "Unknown",
        description: "Unknown contribution intent — tolerated at read time.",
        status: "unknown",
        merge_behavior: "none",
        conflict_behavior: "none",
        user_facing: false,
        admin_preview: true,
        notes: "Fallback for unrecognized intent codes.",
      });
    }
    return normalizeIntentDefinition(base);
  }

  function listContributionIntents(options) {
    const opts = options || {};
    return Object.keys(INTENT_DEFINITIONS).map(function(key) {
      return getIntentDefinition(key);
    }).filter(function(def) {
      if (opts.status && def.status !== opts.status) return false;
      if (opts.userFacing === true && !def.user_facing) return false;
      if (opts.userFacing === false && def.user_facing) return false;
      return true;
    });
  }

  function listActiveIntents() {
    return listContributionIntents({ status: "active" });
  }

  function listReservedIntents() {
    return listContributionIntents({ status: "reserved" });
  }

  function isActiveIntent(code) {
    const def = getIntentDefinition(code);
    return !!(def && def.status === "active");
  }

  function isReservedIntent(code) {
    const def = getIntentDefinition(code);
    return !!(def && def.status === "reserved");
  }

  function getIntentRequiredFields(code) {
    const def = getIntentDefinition(code);
    return def && Array.isArray(def.required_fields) ? def.required_fields.slice() : [];
  }

  function getIntentOptionalFields(code) {
    const def = getIntentDefinition(code);
    return def && Array.isArray(def.optional_fields) ? def.optional_fields.slice() : [];
  }

  function getIntentEvidencePolicy(code) {
    const def = getIntentDefinition(code);
    return def && def.evidence_policy ? def.evidence_policy : "optional";
  }

  function getIntentReviewMode(code) {
    const def = getIntentDefinition(code);
    return def && def.review_mode ? def.review_mode : "standard";
  }

  function getIntentMergeBehavior(code) {
    const def = getIntentDefinition(code);
    return def && def.merge_behavior ? def.merge_behavior : "none";
  }

  function getIntentConflictBehavior(code) {
    const def = getIntentDefinition(code);
    return def && def.conflict_behavior ? def.conflict_behavior : "none";
  }

  function normalizeContributionIntent(codeOrPayload) {
    if (codeOrPayload && typeof codeOrPayload === "object") {
      const nested = codeOrPayload.intent || codeOrPayload.contribution_intent || codeOrPayload.code || "";
      return normalizeContributionIntent(nested);
    }
    const code = normalizeIntentCode(codeOrPayload);
    if (!code) return "add_info";
    const def = getIntentDefinition(code);
    return def && def.code ? def.code : code;
  }

  function normalizeContributionPayload(intentCode, payload) {
    const code = normalizeContributionIntent(intentCode);
    const def = getIntentDefinition(code);
    if (!payload || typeof payload !== "object") return {};
    const out = stripEmptyStrings(Object.assign({}, payload));
    if (def.status === "reserved" || def.status === "unknown") {
      return out;
    }
    if (typeof BoundLoreVersioning !== "undefined" && def.version_support && BoundLoreVersioning.preserveVersionFieldsOnRecord) {
      return BoundLoreVersioning.preserveVersionFieldsOnRecord(out, payload);
    }
    PRESERVE_PAYLOAD_KEYS.forEach(function(key) {
      if (payload[key] != null && out[key] == null) out[key] = payload[key];
    });
    return out;
  }

  function recipeFingerprint(payload) {
    if (!payload || typeof payload !== "object") return "";
    const recipe = payload.recipe && typeof payload.recipe === "object" ? payload.recipe : payload;
    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    return ingredients.map(function(row) {
      const name = String((row && (row.name || row.title)) || "").trim().toLowerCase();
      const qty = row && row.quantity != null ? String(row.quantity) : "";
      const unit = row && row.unit ? String(row.unit) : "";
      return name + ":" + qty + ":" + unit;
    }).sort().join("|");
  }

  function getIntentDuplicateKey(intentCode, payload) {
    const def = getIntentDefinition(intentCode);
    const keys = def && Array.isArray(def.duplicate_key) ? def.duplicate_key.slice() : ["target_entity_key", "intent"];
    const input = payload && typeof payload === "object" ? payload : {};
    const parts = keys.map(function(key) {
      if (key === "recipe_fingerprint") return recipeFingerprint(input);
      if (input[key] != null) return String(input[key]);
      if (input.recipe && input.recipe[key] != null) return String(input.recipe[key]);
      return "";
    });
    return { keys: keys, fingerprint: parts.join("|") };
  }

  return {
    INTENT_DEFINITIONS: INTENT_DEFINITIONS,
    DEFAULT_INTENT: DEFAULT_INTENT,
    normalizeIntentDefinition: normalizeIntentDefinition,
    getIntentDefinition: getIntentDefinition,
    listContributionIntents: listContributionIntents,
    listActiveIntents: listActiveIntents,
    listReservedIntents: listReservedIntents,
    isActiveIntent: isActiveIntent,
    isReservedIntent: isReservedIntent,
    getIntentRequiredFields: getIntentRequiredFields,
    getIntentOptionalFields: getIntentOptionalFields,
    getIntentEvidencePolicy: getIntentEvidencePolicy,
    getIntentReviewMode: getIntentReviewMode,
    getIntentMergeBehavior: getIntentMergeBehavior,
    getIntentConflictBehavior: getIntentConflictBehavior,
    normalizeContributionIntent: normalizeContributionIntent,
    normalizeContributionPayload: normalizeContributionPayload,
    getIntentDuplicateKey: getIntentDuplicateKey,
    normalizeIntentCode: normalizeIntentCode,
  };
})();
