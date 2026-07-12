// ============================================
// BoundLore Structured Context Schema
// P4-B.1 — read-only schema and validation baseline for structured context fields.
// No writes, no fetch, no Supabase, no promotion, no post creation, no search index.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreStructuredContextSchema = (function() {
  const SCHEMA_VERSION = "p4-b1";

  const STRUCTURED_CONTEXT_SECTIONS = [
    "resource_node",
    "observation_context",
    "creature_encounter",
    "requirement_unlock",
    "versioning",
    "quest_event",
    "economy",
  ];

  const VALIDATION_SEVERITIES = ["info", "warning", "error", "blocked"];

  const VALIDATION_RESULT_TYPES = [
    "valid",
    "invalid",
    "blocked",
    "empty",
    "unknown_field",
    "unknown_section",
  ];

  const AUTHORING_FIELD_STATUS = [
    "authorable",
    "restricted",
    "planned",
    "system_only",
    "forbidden",
  ];

  const STRUCTURED_CONTEXT_WRITE_POLICY = {
    read_only: true,
    validates_only: true,
    no_writes: true,
    no_mutation: true,
    no_promotion: true,
    no_post_creation: true,
    no_search_index: true,
    no_admin_actions: true,
  };

  const FIELD_SCHEMAS = {
    resource_node: {
      node_type: { type: "string", status: "authorable" },
      acquisition_sources: { type: "array", status: "authorable" },
      node_observations: { type: "array", status: "authorable" },
      source_detail: { type: "string", status: "forbidden", forbiddenRule: "source_detail_only" },
    },
    observation_context: {
      observation_context: { type: "object", status: "authorable" },
      coordinates: { type: "object", status: "authorable" },
      location_ref: { type: "string", status: "authorable" },
      biome_context: { type: "string", status: "authorable" },
      time_condition: { type: "string", status: "authorable" },
      weather_condition: { type: "string", status: "authorable" },
      place_promotion: { type: "string", status: "forbidden", forbiddenRule: "place_promotion" },
    },
    creature_encounter: {
      creature_encounter: { type: "object", status: "authorable" },
      behavior: { type: "string", status: "authorable" },
      encounter_type: { type: "string", status: "authorable" },
      spawn_context: { type: "string", status: "authorable" },
      drop_context: { type: "string", status: "authorable" },
      combat_affinities: { type: "object", status: "authorable" },
      weakness: { type: "array", status: "authorable" },
      resistance: { type: "array", status: "authorable" },
      name_inferred_weakness: { type: "string", status: "forbidden", forbiddenRule: "name_inferred_weakness" },
    },
    requirement_unlock: {
      requirements: { type: "array", status: "authorable" },
      required_level: { type: "number", status: "authorable" },
      profession_level: { type: "number", status: "authorable" },
      faction_req: { type: "string", status: "authorable" },
      unlock_type: { type: "string", status: "authorable" },
      access_state: { type: "string", status: "authorable" },
      requirement_post_creation: { type: "string", status: "forbidden", forbiddenRule: "requirement_post_creation" },
    },
    versioning: {
      versioning: { type: "object", status: "restricted" },
      game_version: { type: "string", status: "restricted" },
      valid_from: { type: "string", status: "restricted" },
      valid_until: { type: "string", status: "restricted" },
      introduced_in: { type: "string", status: "restricted" },
      changed_in: { type: "string", status: "restricted" },
      removed_in: { type: "string", status: "restricted" },
      superseded_by: { type: "string", status: "restricted" },
      patch_auto_action: { type: "string", status: "forbidden", forbiddenRule: "patch_auto_action" },
    },
    quest_event: {
      quest_event: { type: "object", status: "planned" },
      objectives: { type: "array", status: "planned" },
      rewards: { type: "array", status: "planned" },
      event_type: { type: "string", status: "planned" },
      occurrence_state: { type: "string", status: "planned" },
      npc_services: { type: "array", status: "planned" },
      quest_auto_post: { type: "string", status: "forbidden", forbiddenRule: "quest_auto_post" },
    },
    economy: {
      economy: { type: "object", status: "planned" },
      trade_offers: { type: "array", status: "planned" },
      prices: { type: "array", status: "planned" },
      currency: { type: "string", status: "planned" },
      availability: { type: "string", status: "planned" },
      stock_state: { type: "string", status: "planned" },
      vendor_services: { type: "array", status: "planned" },
      vendor_shop_auto_post: { type: "string", status: "forbidden", forbiddenRule: "vendor_shop_auto_post" },
    },
  };

  const SECTION_FORBIDDEN_RULES = {
    resource_node: ["source_detail_only"],
    observation_context: ["place_promotion"],
    creature_encounter: ["name_inferred_weakness"],
    requirement_unlock: ["requirement_post_creation"],
    versioning: ["patch_auto_action"],
    quest_event: ["quest_auto_post"],
    economy: ["vendor_shop_auto_post"],
  };

  const ROOT_META_KEYS = ["title", "description", "source_detail", "_derived", "__derived"];

  function slugKey(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function normalizeSection(value) {
    const raw = slugKey(value);
    if (STRUCTURED_CONTEXT_SECTIONS.includes(raw)) return raw;
    const aliases = {
      resource: "resource_node",
      observation: "observation_context",
      creature: "creature_encounter",
      requirement: "requirement_unlock",
      unlock: "requirement_unlock",
      quest: "quest_event",
      event: "quest_event",
    };
    return aliases[raw] || "unknown";
  }

  function normalizeFieldName(value) {
    return slugKey(value);
  }

  function normalizeFieldStatus(value) {
    const raw = slugKey(value);
    if (AUTHORING_FIELD_STATUS.includes(raw)) return raw;
    return "system_only";
  }

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function cloneValidationValue(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      if (Array.isArray(value)) return value.slice();
      if (isPlainObject(value)) return Object.assign({}, value);
      return value;
    }
  }

  function isEmptyValidationValue(value) {
    if (value == null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (isPlainObject(value)) return Object.keys(value).length === 0;
    return false;
  }

  function getSectionSchema(section) {
    const kind = normalizeSection(section);
    if (kind === "unknown") return null;
    return FIELD_SCHEMAS[kind] || null;
  }

  function getFieldSchema(section, fieldName) {
    const schema = getSectionSchema(section);
    if (!schema) return null;
    const key = normalizeFieldName(fieldName);
    return schema[key] || null;
  }

  function getFieldsForSection(section) {
    const schema = getSectionSchema(section);
    if (!schema) return [];
    return Object.keys(schema);
  }

  function isKnownSection(section) {
    return STRUCTURED_CONTEXT_SECTIONS.includes(normalizeSection(section));
  }

  function isKnownField(section, fieldName) {
    return !!getFieldSchema(section, fieldName);
  }

  function isAuthorableField(section, fieldName) {
    const field = getFieldSchema(section, fieldName);
    return !!(field && field.status === "authorable");
  }

  function isRestrictedField(section, fieldName) {
    const field = getFieldSchema(section, fieldName);
    return !!(field && field.status === "restricted");
  }

  function isPlannedField(section, fieldName) {
    const field = getFieldSchema(section, fieldName);
    return !!(field && field.status === "planned");
  }

  function isForbiddenField(section, fieldName) {
    const field = getFieldSchema(section, fieldName);
    return !!(field && field.status === "forbidden");
  }

  function createValidationIssue(severity, code, message, details) {
    return {
      severity: VALIDATION_SEVERITIES.includes(severity) ? severity : "error",
      code: String(code || "validation_issue"),
      message: String(message || ""),
      details: details ? cloneValidationValue(details) : null,
    };
  }

  function createValidationResult(section, fieldName, value, issues) {
    const issueList = Array.isArray(issues) ? issues.slice() : [];
    const blocked = issueList.some(function(issue) {
      return issue.severity === "blocked" || issue.code === "blocked";
    });
    const hasError = issueList.some(function(issue) {
      return issue.severity === "error" || issue.severity === "blocked";
    });
    const empty = isEmptyValidationValue(value);
    const unknown = issueList.some(function(issue) {
      return issue.code === "unknown_field" || issue.code === "unknown_section";
    });
    let resultType = "valid";
    if (blocked) resultType = "blocked";
    else if (unknown) resultType = "unknown_field";
    else if (empty) resultType = "empty";
    else if (hasError) resultType = "invalid";

    return {
      section: normalizeSection(section),
      field: normalizeFieldName(fieldName),
      value: cloneValidationValue(value),
      resultType: resultType,
      issues: issueList,
      valid: resultType === "valid",
    };
  }

  function validatePrimitiveType(value, expectedType) {
    if (value == null) return expectedType === "string" || expectedType === "number";
    if (expectedType === "string") {
      return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
    }
    if (expectedType === "number") {
      return typeof value === "number" || (typeof value === "string" && value.trim() !== "" && !isNaN(Number(value)));
    }
    if (expectedType === "array") return Array.isArray(value);
    if (expectedType === "object") return isPlainObject(value);
    return true;
  }

  function validateFieldValue(section, fieldName, value, options) {
    void options;
    const kind = normalizeSection(section);
    const key = normalizeFieldName(fieldName);
    const issues = [];
    const fieldSchema = getFieldSchema(kind, key);

    if (!fieldSchema) {
      issues.push(createValidationIssue("warning", "unknown_field", "Unknown field for section.", {
        section: kind,
        field: key,
      }));
      return createValidationResult(kind, key, value, issues);
    }

    if (fieldSchema.status === "forbidden") {
      issues.push(createValidationIssue("blocked", "forbidden_field", "Field is forbidden for authoring.", {
        section: kind,
        field: key,
        rule: fieldSchema.forbiddenRule || null,
      }));
      return createValidationResult(kind, key, value, issues);
    }

    if (isEmptyValidationValue(value)) {
      issues.push(createValidationIssue("error", "empty_value", "Field value is empty.", {
        section: kind,
        field: key,
      }));
      return createValidationResult(kind, key, value, issues);
    }

    if (!validatePrimitiveType(value, fieldSchema.type)) {
      issues.push(createValidationIssue("error", "invalid_type", "Field value type mismatch.", {
        section: kind,
        field: key,
        expectedType: fieldSchema.type,
        actualType: Array.isArray(value) ? "array" : typeof value,
      }));
      return createValidationResult(kind, key, value, issues);
    }

    if (fieldSchema.status === "planned") {
      issues.push(createValidationIssue("info", "planned_field", "Field is planned; validation only, no actions.", {
        section: kind,
        field: key,
      }));
    } else if (fieldSchema.status === "restricted") {
      issues.push(createValidationIssue("info", "restricted_field", "Field is restricted; validation only, no actions.", {
        section: kind,
        field: key,
      }));
    }

    return createValidationResult(kind, key, value, issues);
  }

  function hasMeaningfulField(context, fieldName) {
    if (!isPlainObject(context)) return false;
    return !isEmptyValidationValue(context[fieldName]);
  }

  function applyNegativeRules(section, context, rootMeta, issues) {
    const kind = normalizeSection(section);
    const ctx = isPlainObject(context) ? context : {};
    const meta = isPlainObject(rootMeta) ? rootMeta : {};

    if (meta._derived === true || meta.__derived === true || ctx._derived === true || ctx.__derived === true) {
      issues.push(createValidationIssue("blocked", "derived_blocked", "Derived entries are not authorable.", {
        section: kind,
      }));
    }

    if (kind === "resource_node") {
      const hasExplicit = hasMeaningfulField(ctx, "node_type") ||
        hasMeaningfulField(ctx, "acquisition_sources") ||
        hasMeaningfulField(ctx, "node_observations");
      const sourceDetail = meta.source_detail != null ? meta.source_detail : ctx.source_detail;
      if (!hasExplicit && !isEmptyValidationValue(sourceDetail)) {
        issues.push(createValidationIssue("blocked", "source_detail_only", "source_detail alone cannot author resource_node.", {
          source_detail: sourceDetail,
        }));
      }
      const detailText = String(sourceDetail || "").toLowerCase();
      if (detailText.includes("red crystal") && !hasMeaningfulField(ctx, "node_type")) {
        issues.push(createValidationIssue("blocked", "crystal_node_inference", "Cannot infer node_type from source_detail text.", {
          source_detail: sourceDetail,
        }));
      }
    }

    if (kind === "observation_context") {
      const hasCoords = hasMeaningfulField(ctx, "coordinates") || hasMeaningfulField(ctx, "location_ref");
      if (hasCoords && !hasMeaningfulField(ctx, "observation_context") &&
          !hasMeaningfulField(ctx, "biome_context") && !hasMeaningfulField(ctx, "time_condition")) {
        issues.push(createValidationIssue("warning", "place_promotion", "coordinates/location_ref must not imply PLACE promotion.", {
          coordinates: ctx.coordinates,
          location_ref: ctx.location_ref,
        }));
      }
    }

    if (kind === "creature_encounter") {
      const title = String(meta.title || ctx.title || "").toLowerCase();
      const hasWeakness = hasMeaningfulField(ctx, "weakness");
      if (title.includes("of fire") && hasWeakness && !hasMeaningfulField(ctx, "behavior")) {
        issues.push(createValidationIssue("blocked", "name_inferred_weakness", "Cannot infer weakness from title text.", {
          title: meta.title || ctx.title,
        }));
      }
    }

    if (kind === "requirement_unlock") {
      issues.push(createValidationIssue("info", "requirement_post_creation", "Requirements must not auto-create posts.", {
        section: kind,
      }));
    }

    if (kind === "versioning") {
      issues.push(createValidationIssue("info", "patch_auto_action", "Versioning must not trigger patch/admin auto-action.", {
        section: kind,
      }));
    }

    if (kind === "quest_event" || kind === "economy") {
      issues.push(createValidationIssue("info", kind === "quest_event" ? "quest_auto_post" : "vendor_shop_auto_post",
        "Planned section must not auto-create posts.", { section: kind }));
    }

    return issues;
  }

  function validateSectionContext(section, context, options) {
    const opts = options || {};
    const kind = normalizeSection(section);
    const ctx = isPlainObject(context) ? cloneValidationValue(context) : {};
    const rootMeta = isPlainObject(opts.rootMeta) ? opts.rootMeta : {};
    const issues = [];
    const fieldResults = [];

    if (!isKnownSection(kind)) {
      issues.push(createValidationIssue("error", "unknown_section", "Unknown structured context section.", {
        section: section,
      }));
      return {
        section: kind,
        valid: false,
        blocked: false,
        fieldResults: fieldResults,
        issues: issues,
      };
    }

    const schema = getSectionSchema(kind);
    Object.keys(schema).forEach(function(fieldName) {
      if (schema[fieldName].status === "forbidden") return;
      if (Object.prototype.hasOwnProperty.call(ctx, fieldName)) {
        fieldResults.push(validateFieldValue(kind, fieldName, ctx[fieldName], opts));
      }
    });

    Object.keys(ctx).forEach(function(key) {
      if (key === "_derived" || key === "__derived") return;
      if (!isKnownField(kind, key)) {
        issues.push(createValidationIssue("warning", "unknown_field", "Unknown field in section context.", {
          section: kind,
          field: key,
        }));
        fieldResults.push(createValidationResult(kind, key, ctx[key], [
          createValidationIssue("warning", "unknown_field", "Unknown field.", { field: key }),
        ]));
      }
    });

    applyNegativeRules(kind, ctx, rootMeta, issues);

    const blocked = issues.some(function(issue) { return issue.severity === "blocked"; }) ||
      fieldResults.some(function(result) { return result.resultType === "blocked"; });
    const hasInvalid = fieldResults.some(function(result) {
      return result.resultType === "invalid" || result.resultType === "empty";
    });
    const hasValidField = fieldResults.some(function(result) { return result.valid; });
    const valid = !blocked && !hasInvalid && hasValidField;

    return {
      section: kind,
      valid: valid && fieldResults.length > 0,
      blocked: blocked,
      fieldResults: fieldResults,
      issues: issues,
    };
  }

  function normalizeValidationInput(input) {
    const src = isPlainObject(input) ? input : {};
    const rootMeta = {};
    ROOT_META_KEYS.forEach(function(key) {
      if (Object.prototype.hasOwnProperty.call(src, key)) rootMeta[key] = src[key];
    });

    const sections = {};
    STRUCTURED_CONTEXT_SECTIONS.forEach(function(section) {
      if (isPlainObject(src[section])) {
        sections[section] = cloneValidationValue(src[section]);
        return;
      }
    });

    if (Object.keys(sections).length === 0) {
      STRUCTURED_CONTEXT_SECTIONS.forEach(function(section) {
        const schema = getSectionSchema(section);
        const bucket = {};
        let found = false;
        Object.keys(schema).forEach(function(field) {
          if (schema[field].status === "forbidden") return;
          if (Object.prototype.hasOwnProperty.call(src, field)) {
            bucket[field] = src[field];
            found = true;
          }
        });
        if (found) sections[section] = bucket;
      });
    }

    if (isPlainObject(src.structured_context)) {
      STRUCTURED_CONTEXT_SECTIONS.forEach(function(section) {
        if (isPlainObject(src.structured_context[section])) {
          sections[section] = cloneValidationValue(src.structured_context[section]);
        }
      });
    }

    return { rootMeta: rootMeta, sections: sections };
  }

  function validateStructuredContext(context, options) {
    const normalized = normalizeValidationInput(context);
    const sectionReports = {};
    const allIssues = [];

    Object.keys(normalized.sections).forEach(function(section) {
      const report = validateSectionContext(section, normalized.sections[section], {
        rootMeta: normalized.rootMeta,
        options: options,
      });
      sectionReports[section] = report;
      allIssues.push.apply(allIssues, report.issues);
      report.fieldResults.forEach(function(result) {
        allIssues.push.apply(allIssues, result.issues);
      });
    });

    if (!Object.keys(normalized.sections).length) {
      if (!isEmptyValidationValue(normalized.rootMeta.source_detail)) {
        allIssues.push.apply(allIssues, applyNegativeRules("resource_node", {}, normalized.rootMeta, []));
      }
      if (!isEmptyValidationValue(normalized.rootMeta.title)) {
        const title = String(normalized.rootMeta.title).toLowerCase();
        if (/\bfire\b|\bstaff\b|\bember\b/.test(title)) {
          allIssues.push(createValidationIssue("blocked", "name_inferred_weakness",
            "Title text cannot infer creature encounter or taxonomy fields.", {
              title: normalized.rootMeta.title,
            }));
        }
      }
      if (normalized.rootMeta._derived === true || normalized.rootMeta.__derived === true) {
        allIssues.push(createValidationIssue("blocked", "derived_blocked", "Derived entries are not authorable.", {}));
      }
    }

    const blocked = allIssues.some(function(issue) { return issue.severity === "blocked"; });
    const valid = !blocked && Object.keys(sectionReports).length > 0 &&
      Object.keys(sectionReports).every(function(key) { return sectionReports[key].valid; });

    return {
      schema_version: SCHEMA_VERSION,
      sections: sectionReports,
      issues: allIssues,
      valid: valid,
      blocked: blocked,
      rootMeta: cloneValidationValue(normalized.rootMeta),
    };
  }

  function validateEntryContractFields(entry, options) {
    return validateStructuredContext(entry, options);
  }

  function createValidationReport(input, options) {
    const report = validateStructuredContext(input, options);
    return {
      schema_version: SCHEMA_VERSION,
      policy: cloneValidationValue(STRUCTURED_CONTEXT_WRITE_POLICY),
      input: cloneValidationValue(input),
      validation: report,
      summary: {
        valid: report.valid,
        blocked: report.blocked,
        sectionCount: Object.keys(report.sections || {}).length,
        issueCount: (report.issues || []).length,
      },
      actions: {
        write: shouldWriteValidatedData(),
        createPost: shouldCreatePostFromField("requirement_unlock", "faction_req", "Sample Faction"),
        promote: shouldPromoteFromValidatedData("resource_node", "node_type", "crystal_node"),
        renderActions: shouldRenderValidationActions(),
      },
    };
  }

  function getSchemaDiagnostics() {
    return {
      schema_version: SCHEMA_VERSION,
      sections: STRUCTURED_CONTEXT_SECTIONS.slice(),
      severities: VALIDATION_SEVERITIES.slice(),
      resultTypes: VALIDATION_RESULT_TYPES.slice(),
      fieldStatuses: AUTHORING_FIELD_STATUS.slice(),
      policy: cloneValidationValue(STRUCTURED_CONTEXT_WRITE_POLICY),
      fieldSchemas: cloneValidationValue(FIELD_SCHEMAS),
    };
  }

  function shouldWriteValidatedData() {
    return false;
  }

  function shouldCreatePostFromField(section, fieldName, value) {
    void section;
    void fieldName;
    void value;
    return false;
  }

  function shouldPromoteFromValidatedData(section, fieldName, value) {
    void section;
    void fieldName;
    void value;
    return false;
  }

  function shouldRenderValidationActions() {
    return false;
  }

  return {
    SCHEMA_VERSION: SCHEMA_VERSION,
    STRUCTURED_CONTEXT_SECTIONS: STRUCTURED_CONTEXT_SECTIONS,
    VALIDATION_SEVERITIES: VALIDATION_SEVERITIES,
    VALIDATION_RESULT_TYPES: VALIDATION_RESULT_TYPES,
    AUTHORING_FIELD_STATUS: AUTHORING_FIELD_STATUS,
    STRUCTURED_CONTEXT_WRITE_POLICY: STRUCTURED_CONTEXT_WRITE_POLICY,
    FIELD_SCHEMAS: FIELD_SCHEMAS,
    normalizeSection: normalizeSection,
    normalizeFieldName: normalizeFieldName,
    normalizeFieldStatus: normalizeFieldStatus,
    isPlainObject: isPlainObject,
    cloneValidationValue: cloneValidationValue,
    isEmptyValidationValue: isEmptyValidationValue,
    getSectionSchema: getSectionSchema,
    getFieldSchema: getFieldSchema,
    getFieldsForSection: getFieldsForSection,
    isKnownSection: isKnownSection,
    isKnownField: isKnownField,
    isAuthorableField: isAuthorableField,
    isRestrictedField: isRestrictedField,
    isPlannedField: isPlannedField,
    isForbiddenField: isForbiddenField,
    validatePrimitiveType: validatePrimitiveType,
    validateFieldValue: validateFieldValue,
    validateSectionContext: validateSectionContext,
    validateStructuredContext: validateStructuredContext,
    validateEntryContractFields: validateEntryContractFields,
    createValidationIssue: createValidationIssue,
    createValidationResult: createValidationResult,
    createValidationReport: createValidationReport,
    getSchemaDiagnostics: getSchemaDiagnostics,
    shouldWriteValidatedData: shouldWriteValidatedData,
    shouldCreatePostFromField: shouldCreatePostFromField,
    shouldPromoteFromValidatedData: shouldPromoteFromValidatedData,
    shouldRenderValidationActions: shouldRenderValidationActions,
  };
})();
