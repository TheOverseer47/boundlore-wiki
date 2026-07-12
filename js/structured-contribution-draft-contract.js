// ============================================
// BoundLore Structured Contribution Draft Contract
// P4-E.1 — read-only draft payload validation and conflict reporting baseline.
// No writes, no fetch, no Supabase, no submit/save/queue/moderation actions.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreStructuredContributionDraftContract = (function() {
  const DRAFT_CONTRACT_VERSION = "p4-e1";

  const DRAFT_STATES = [
    "not_started",
    "local_draft",
    "validated_draft",
    "blocked_draft",
    "submitted_pending",
    "conflict_review",
    "approved",
    "rejected_archived",
  ];

  const DRAFT_ALLOWED_ACTIVE_STATES = [
    "local_draft",
    "validated_draft",
    "blocked_draft",
  ];

  const DRAFT_FUTURE_ONLY_STATES = [
    "submitted_pending",
    "conflict_review",
    "approved",
    "rejected_archived",
  ];

  const DRAFT_RESULT_TYPES = [
    "valid",
    "invalid",
    "blocked",
    "conflict",
    "duplicate",
    "no_op",
    "future_only",
    "unknown",
  ];

  const DRAFT_SEVERITIES = ["info", "warning", "error", "blocked"];

  const DRAFT_POLICY = {
    read_only: true,
    validates_only: true,
    no_writes: true,
    no_submit: true,
    no_save: true,
    no_queue_actions: true,
    no_approve_reject: true,
    no_archive: true,
    no_post_creation: true,
    no_missing_entry_creation: true,
    no_promotion: true,
    no_taxonomy_inference: true,
    no_search_index: true,
    no_registry_mutation: true,
  };

  const DRAFT_PAYLOAD_FIELDS = [
    "target_entry_id",
    "target_slug",
    "target_section",
    "field_changes",
    "source_snapshot",
    "evidence",
    "reason",
    "validation_report",
    "conflict_report",
    "audit_metadata",
  ];

  const PLANNED_INTENT_MAP = {
    resource_node: "suggest_resource_node_context",
    observation_context: "suggest_observation_context",
    creature_encounter: "suggest_creature_encounter_context",
    requirement_unlock: "suggest_requirement_unlock_context",
    versioning: "suggest_version_context",
    quest_event: "suggest_quest_event_context",
    economy: "suggest_economy_context",
  };

  const INFERENCE_PATTERNS = [
    /\bmeans\b/i,
    /\bimplies\b/i,
    /\binfer/i,
    /\bof fire\b/i,
    /\bfire weakness\b/i,
    /\bred crystal\b/i,
    /\bstaff of fire\b/i,
  ];

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function cloneDraftValue(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      if (Array.isArray(value)) return value.slice();
      if (isPlainObject(value)) return Object.assign({}, value);
      return value;
    }
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function slugKey(value) {
    return String(value == null ? "" : value)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  function normalizeDraftState(value) {
    const raw = slugKey(value);
    if (DRAFT_STATES.includes(raw)) return raw;
    return "not_started";
  }

  function normalizeDraftSection(value) {
    const SCS = getSchemaApi();
    if (SCS && typeof SCS.normalizeSection === "function") {
      return SCS.normalizeSection(value);
    }
    const raw = slugKey(value);
    return Object.prototype.hasOwnProperty.call(PLANNED_INTENT_MAP, raw) ? raw : "unknown";
  }

  function normalizeDraftIntent(value) {
    return slugKey(value);
  }

  function getDraftPayloadFields() {
    return DRAFT_PAYLOAD_FIELDS.slice();
  }

  function getPlannedIntentForSection(section) {
    const kind = normalizeDraftSection(section);
    return PLANNED_INTENT_MAP[kind] || null;
  }

  function getContributionIntentRegistry() {
    const api = window.BoundLoreContributionIntentRegistry;
    return api && typeof api === "object" ? api : null;
  }

  function getSchemaApi() {
    const api = window.BoundLoreStructuredContextSchema;
    return api && typeof api === "object" ? api : null;
  }

  function isIntentActive(intentName) {
    const registry = getContributionIntentRegistry();
    const code = normalizeDraftIntent(intentName);
    if (!code) return false;
    if (registry && typeof registry.isActiveIntent === "function") {
      return registry.isActiveIntent(code) === true;
    }
    return false;
  }

  function isIntentPlannedOnly(intentName) {
    const code = normalizeDraftIntent(intentName);
    if (!code) return false;
    const plannedValues = Object.keys(PLANNED_INTENT_MAP).map(function(key) {
      return PLANNED_INTENT_MAP[key];
    });
    if (!plannedValues.includes(code)) return false;
    return !isIntentActive(code);
  }

  function createDraftIssue(severity, code, message, details) {
    return {
      severity: DRAFT_SEVERITIES.includes(severity) ? severity : "error",
      code: String(code || "draft_issue"),
      message: String(message || ""),
      details: details ? cloneDraftValue(details) : null,
    };
  }

  function createDraftResult(type, issues, details) {
    const issueList = Array.isArray(issues) ? issues.slice() : [];
    const resultType = DRAFT_RESULT_TYPES.includes(type) ? type : "unknown";
    const blocked = issueList.some(function(issue) {
      return issue.severity === "blocked";
    });
    const hasError = issueList.some(function(issue) {
      return issue.severity === "error" || issue.severity === "blocked";
    });
    return {
      resultType: resultType,
      issues: issueList,
      details: details ? cloneDraftValue(details) : null,
      valid: resultType === "valid" || resultType === "duplicate" || resultType === "no_op",
      blocked: blocked || resultType === "blocked",
      hasError: hasError,
    };
  }

  function isEmptyValue(value) {
    if (value == null) return true;
    if (typeof value === "string") return value.trim() === "";
    if (Array.isArray(value)) return value.length === 0;
    if (isPlainObject(value)) return Object.keys(value).length === 0;
    return false;
  }

  function hasInferenceText(text) {
    const raw = String(text == null ? "" : text);
    if (!raw.trim()) return false;
    return INFERENCE_PATTERNS.some(function(pattern) {
      return pattern.test(raw);
    });
  }

  function getExistingFieldValue(existingEntry, section, fieldName) {
    const entry = isPlainObject(existingEntry) ? existingEntry : {};
    const kind = normalizeDraftSection(section);
    const field = slugKey(fieldName);
    const meta = isPlainObject(entry.meta) ? entry.meta : {};
    const structured = isPlainObject(entry.structured_context) ? entry.structured_context : {};
    const sectionBucket = isPlainObject(structured[kind]) ? structured[kind] : {};
    const discovery = isPlainObject(entry.discovery_payload) ? entry.discovery_payload : {};
    const discoverySection = isPlainObject(discovery[kind]) ? discovery[kind] : {};

    if (Object.prototype.hasOwnProperty.call(meta, field)) return meta[field];
    if (Object.prototype.hasOwnProperty.call(sectionBucket, field)) return sectionBucket[field];
    if (Object.prototype.hasOwnProperty.call(discoverySection, field)) return discoverySection[field];
    if (Object.prototype.hasOwnProperty.call(entry, field)) return entry[field];
    return undefined;
  }

  function valuesEqual(a, b) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (err) {
      return a === b;
    }
  }

  function validateDraftTarget(draft, options) {
    void options;
    const d = isPlainObject(draft) ? draft : {};
    const issues = [];
    const hasId = !isEmptyValue(d.target_entry_id);
    const hasSlug = !isEmptyValue(d.target_slug);

    if (!hasId && !hasSlug) {
      issues.push(createDraftIssue("error", "missing_target", "Draft must include target_entry_id or target_slug.", null));
    }

    issues.push(createDraftIssue("info", "no_missing_entry_creation", "Draft must not create missing entries.", null));
    issues.push(createDraftIssue("info", "no_wood_forge_auto_create", "Wood/Forge must not be auto-created from draft target.", null));

    const blocked = issues.some(function(issue) { return issue.severity === "blocked"; });
    const hasError = issues.some(function(issue) {
      return issue.severity === "error" || issue.severity === "blocked";
    });
    return createDraftResult(hasError ? "invalid" : "valid", issues, {
      target_entry_id: hasId ? d.target_entry_id : null,
      target_slug: hasSlug ? String(d.target_slug) : "",
    });
  }

  function validateDraftSection(draft, options) {
    void options;
    const d = isPlainObject(draft) ? draft : {};
    const issues = [];
    const section = normalizeDraftSection(d.target_section);
    const SCS = getSchemaApi();

    if (section === "unknown") {
      issues.push(createDraftIssue("error", "unknown_section", "Unknown structured context section.", {
        target_section: d.target_section,
      }));
      return createDraftResult("invalid", issues, { section: section });
    }

    if (SCS && typeof SCS.isKnownSection === "function" && !SCS.isKnownSection(section)) {
      issues.push(createDraftIssue("error", "unknown_section", "Section is not known to StructuredContextSchema.", {
        section: section,
      }));
    }

    const intent = getPlannedIntentForSection(section);
    if (intent) {
      issues.push(createDraftIssue("info", "planned_intent_mapped", "Section maps to planned intent only.", {
        section: section,
        intent: intent,
        plannedOnly: isIntentPlannedOnly(intent),
        active: isIntentActive(intent),
      }));
    }

    if (SCS && typeof SCS.isPlannedField === "function") {
      const fields = typeof SCS.getFieldsForSection === "function" ? SCS.getFieldsForSection(section) : [];
      const allPlanned = fields.length > 0 && fields.every(function(field) {
        return SCS.isPlannedField(section, field);
      });
      if (allPlanned) {
        issues.push(createDraftIssue("warning", "planned_section", "Planned section may validate but must not submit without separate gate.", {
          section: section,
        }));
      }
    }

    const blocked = issues.some(function(issue) { return issue.severity === "blocked"; });
    const hasError = issues.some(function(issue) {
      return issue.severity === "error" || issue.severity === "blocked";
    });
    return createDraftResult(hasError ? "invalid" : "valid", issues, { section: section, intent: intent });
  }

  function validateDraftFieldChanges(draft, options) {
    void options;
    const d = isPlainObject(draft) ? draft : {};
    const section = normalizeDraftSection(d.target_section);
    const changes = isPlainObject(d.field_changes) ? d.field_changes : null;
    const issues = [];
    const SCS = getSchemaApi();

    if (!changes) {
      issues.push(createDraftIssue("error", "invalid_field_changes", "field_changes must be a plain object.", null));
      return createDraftResult("invalid", issues, null);
    }

    const keys = Object.keys(changes);
    if (!keys.length) {
      issues.push(createDraftIssue("error", "empty_field_changes", "field_changes must include at least one proposed field.", null));
    }

    keys.forEach(function(fieldName) {
      const key = slugKey(fieldName);
      const value = changes[fieldName];

      if (key === "_derived" || key === "__derived" || value === true && (fieldName === "_derived" || fieldName === "__derived")) {
        issues.push(createDraftIssue("blocked", "derived_blocked", "Derived fields are not authorable in drafts.", {
          field: fieldName,
        }));
        return;
      }

      if (SCS) {
        if (typeof SCS.isForbiddenField === "function" && SCS.isForbiddenField(section, key)) {
          issues.push(createDraftIssue("blocked", "forbidden_field", "Forbidden field cannot appear in field_changes.", {
            section: section,
            field: key,
          }));
          return;
        }
        if (typeof SCS.isKnownField === "function" && !SCS.isKnownField(section, key)) {
          issues.push(createDraftIssue("blocked", "unknown_field", "Unknown field cannot be proposed.", {
            section: section,
            field: key,
          }));
          return;
        }
        if (typeof SCS.isEmptyValidationValue === "function" ? SCS.isEmptyValidationValue(value) : isEmptyValue(value)) {
          issues.push(createDraftIssue("error", "empty_value", "Field value is empty.", {
            section: section,
            field: key,
          }));
          return;
        }
        if (typeof SCS.validateFieldValue === "function") {
          const fieldResult = SCS.validateFieldValue(section, key, value, options);
          (fieldResult.issues || []).forEach(function(issue) {
            issues.push(createDraftIssue(issue.severity, issue.code, issue.message, issue.details));
          });
        }
        if (typeof SCS.isRestrictedField === "function" && SCS.isRestrictedField(section, key)) {
          issues.push(createDraftIssue("info", "restricted_field_review", "Restricted field requires moderator review.", {
            section: section,
            field: key,
          }));
        }
      } else {
        if (isEmptyValue(value)) {
          issues.push(createDraftIssue("error", "empty_value", "Field value is empty.", { field: key }));
        }
      }

      if (key === "source_detail" && section === "resource_node") {
        issues.push(createDraftIssue("blocked", "source_detail_only", "source_detail-only proposals are blocked.", {
          field: key,
        }));
      }
      if ((key === "coordinates" || key === "location_ref") && section === "observation_context") {
        const hasContext = keys.some(function(k) {
          const nk = slugKey(k);
          return nk === "observation_context" || nk === "biome_context" || nk === "time_condition" || nk === "weather_condition";
        });
        if (!hasContext) {
          issues.push(createDraftIssue("blocked", "place_promotion", "coordinates/location_ref must not imply PLACE promotion.", {
            field: key,
          }));
        }
      }
      if (section === "requirement_unlock" && (key === "requirement_post_creation" || key === "unlock_type" && String(value).toLowerCase().includes("create_post"))) {
        issues.push(createDraftIssue("blocked", "requirement_post_creation", "Requirement drafts must not create posts.", {
          field: key,
        }));
      }
      if (section === "economy" && (key === "vendor_shop_auto_post" || key === "vendor_services")) {
        issues.push(createDraftIssue("info", "economy_review", "Economy/vendor fields require review; no shop post creation.", {
          field: key,
        }));
      }
      if (section === "versioning") {
        issues.push(createDraftIssue("info", "versioning_review", "Versioning fields require review; no patch auto-action.", {
          field: key,
        }));
      }
    });

    if (changes._derived === true || changes.__derived === true) {
      issues.push(createDraftIssue("blocked", "derived_blocked", "Derived marker in field_changes is blocked.", null));
    }

    const blocked = issues.some(function(issue) { return issue.severity === "blocked"; });
    const hasError = issues.some(function(issue) {
      return issue.severity === "error" || issue.severity === "blocked";
    });
    return createDraftResult(blocked ? "blocked" : (hasError ? "invalid" : "valid"), issues, {
      section: section,
      fieldCount: keys.length,
    });
  }

  function validateDraftEvidence(draft, options) {
    void options;
    const d = isPlainObject(draft) ? draft : {};
    const issues = [];
    const evidence = d.evidence;

    if (isEmptyValue(evidence)) {
      issues.push(createDraftIssue("warning", "evidence_missing", "Evidence is recommended for future submit.", null));
    } else if (isPlainObject(evidence)) {
      if (hasInferenceText(evidence.note || evidence.source || evidence.description)) {
        issues.push(createDraftIssue("blocked", "evidence_inference", "Evidence text must not trigger inference.", {
          evidence: cloneDraftValue(evidence),
        }));
      }
    } else if (typeof evidence === "string" && hasInferenceText(evidence)) {
      issues.push(createDraftIssue("blocked", "evidence_inference", "Evidence text must not trigger inference.", null));
    }

    const blocked = issues.some(function(issue) { return issue.severity === "blocked"; });
    return createDraftResult(blocked ? "blocked" : "valid", issues, {
      present: !isEmptyValue(evidence),
    });
  }

  function validateDraftAuditMetadata(draft, options) {
    void options;
    const d = isPlainObject(draft) ? draft : {};
    const issues = [];
    const audit = d.audit_metadata;

    if (isEmptyValue(audit)) {
      issues.push(createDraftIssue("info", "audit_optional", "Audit metadata optional in P4-E.1; required later at submit.", null));
    } else {
      issues.push(createDraftIssue("info", "audit_future_required", "Audit metadata will be auth/session dependent at submit.", {
        keys: isPlainObject(audit) ? Object.keys(audit) : [],
      }));
    }

    return createDraftResult("valid", issues, { present: !isEmptyValue(audit) });
  }

  function validateDraftState(draft, options) {
    void options;
    const d = isPlainObject(draft) ? draft : {};
    const state = normalizeDraftState(d.state);
    const issues = [];

    if (DRAFT_FUTURE_ONLY_STATES.includes(state)) {
      issues.push(createDraftIssue("warning", "future_only_state", "Draft state is future-only and not active in P4-E.1.", {
        state: state,
      }));
      return createDraftResult("future_only", issues, { state: state, active: false });
    }

    if (!DRAFT_ALLOWED_ACTIVE_STATES.includes(state) && state !== "not_started") {
      issues.push(createDraftIssue("warning", "inactive_state", "Draft state is not active for local validation.", {
        state: state,
      }));
    }

    return createDraftResult("valid", issues, { state: state, active: DRAFT_ALLOWED_ACTIVE_STATES.includes(state) });
  }

  function validateDraftReason(draft) {
    const d = isPlainObject(draft) ? draft : {};
    const issues = [];
    const reason = d.reason;

    if (!isEmptyValue(reason) && hasInferenceText(reason)) {
      issues.push(createDraftIssue("blocked", "name_only_inference", "Reason text must not infer taxonomy or field values.", {
        reason: String(reason),
      }));
      return createDraftResult("blocked", issues, null);
    }

    return createDraftResult("valid", issues, { present: !isEmptyValue(reason) });
  }

  function createSchemaValidationReport(draft, options) {
    const SCS = getSchemaApi();
    const d = isPlainObject(draft) ? draft : {};
    const section = normalizeDraftSection(d.target_section);
    const changes = isPlainObject(d.field_changes) ? cloneDraftValue(d.field_changes) : {};

    if (!SCS || typeof SCS.createValidationReport !== "function") {
      return {
        available: false,
        report: null,
        issues: [createDraftIssue("warning", "schema_api_missing", "BoundLoreStructuredContextSchema is not available.", null)],
      };
    }

    const input = {};
    input[section] = changes;
    if (!isEmptyValue(d.reason)) input.title = String(d.reason);
    const report = SCS.createValidationReport(input, options);
    return {
      available: true,
      report: report,
      issues: [],
    };
  }

  function createFieldLevelConflictReport(draft, existingEntry, options) {
    void options;
    const d = isPlainObject(draft) ? draft : {};
    const section = normalizeDraftSection(d.target_section);
    const changes = isPlainObject(d.field_changes) ? d.field_changes : {};
    const fields = Object.keys(changes);
    const comparisons = [];
    const issues = [];
    let hasConflict = false;
    let hasDuplicate = false;
    let hasMergeCandidate = false;

    fields.forEach(function(fieldName) {
      const key = slugKey(fieldName);
      const proposed = changes[fieldName];
      const existing = getExistingFieldValue(existingEntry, section, key);
      const hasExisting = typeof existing !== "undefined";

      let status = "new_value";
      if (hasExisting) {
        if (valuesEqual(existing, proposed)) {
          status = "duplicate";
          hasDuplicate = true;
          issues.push(createDraftIssue("info", "duplicate_no_op", "Same field, same value — duplicate/no-op.", {
            field: key,
            value: cloneDraftValue(proposed),
          }));
        } else if (Array.isArray(existing) && Array.isArray(proposed)) {
          status = "possible_merge";
          hasMergeCandidate = true;
          issues.push(createDraftIssue("warning", "array_merge_review", "Array field additive overlap — possible merge, review required.", {
            field: key,
            existing: cloneDraftValue(existing),
            proposed: cloneDraftValue(proposed),
          }));
        } else if (isPlainObject(existing) && isPlainObject(proposed)) {
          status = "partial_diff";
          hasConflict = true;
          issues.push(createDraftIssue("warning", "object_partial_diff", "Object field partial change — field-level diff required.", {
            field: key,
          }));
        } else {
          status = "conflict";
          hasConflict = true;
          issues.push(createDraftIssue("warning", "field_conflict", "Same field, different value — conflict requires review.", {
            field: key,
            existing: cloneDraftValue(existing),
            proposed: cloneDraftValue(proposed),
          }));
        }
      }

      comparisons.push({
        field: key,
        status: status,
        existing: hasExisting ? cloneDraftValue(existing) : null,
        proposed: cloneDraftValue(proposed),
      });
    });

    let resultType = "valid";
    if (hasConflict) resultType = "conflict";
    else if (hasDuplicate && !hasMergeCandidate && fields.length === 1) resultType = "duplicate";
    else if (hasDuplicate) resultType = "no_op";

    return {
      resultType: resultType,
      comparisons: comparisons,
      issues: issues,
      hasConflict: hasConflict,
      hasDuplicate: hasDuplicate,
      hasMergeCandidate: hasMergeCandidate,
      reviewRequired: hasConflict || hasMergeCandidate,
    };
  }

  function validateDraftPayload(draft, options) {
    const results = {
      target: validateDraftTarget(draft, options),
      section: validateDraftSection(draft, options),
      fieldChanges: validateDraftFieldChanges(draft, options),
      evidence: validateDraftEvidence(draft, options),
      auditMetadata: validateDraftAuditMetadata(draft, options),
      reason: validateDraftReason(draft),
    };

    const allIssues = [];
    Object.keys(results).forEach(function(key) {
      (results[key].issues || []).forEach(function(issue) {
        allIssues.push(issue);
      });
    });

    const blocked = allIssues.some(function(issue) { return issue.severity === "blocked"; });
    const hasError = allIssues.some(function(issue) {
      return issue.severity === "error" || issue.severity === "blocked";
    });

    let resultType = "valid";
    if (blocked) resultType = "blocked";
    else if (hasError) resultType = "invalid";

    return {
      results: results,
      issues: allIssues,
      valid: resultType === "valid",
      blocked: blocked,
      resultType: resultType,
    };
  }

  function createDraftReport(draft, existingEntry, options) {
    const cloneDraft = cloneDraftValue(draft);
    const stateResult = validateDraftState(cloneDraft, options);
    const payloadValidation = validateDraftPayload(cloneDraft, options);
    const schemaBundle = createSchemaValidationReport(cloneDraft, options);
    const conflictReport = createFieldLevelConflictReport(cloneDraft, existingEntry, options);
    const section = normalizeDraftSection(cloneDraft.target_section);
    const plannedIntent = getPlannedIntentForSection(section);

    const allIssues = []
      .concat(stateResult.issues || [])
      .concat(payloadValidation.issues || [])
      .concat(schemaBundle.issues || [])
      .concat(conflictReport.issues || []);

    if (schemaBundle.available && schemaBundle.report && schemaBundle.report.validation) {
      (schemaBundle.report.validation.issues || []).forEach(function(issue) {
        allIssues.push(createDraftIssue(issue.severity, issue.code, issue.message, issue.details));
      });
      if (schemaBundle.report.validation.blocked) {
        allIssues.push(createDraftIssue("blocked", "schema_blocked", "Schema validation blocked draft.", null));
      }
    }

    const futureOnly = stateResult.resultType === "future_only";
    const blocked = allIssues.some(function(issue) { return issue.severity === "blocked"; }) ||
      payloadValidation.blocked === true ||
      (schemaBundle.report && schemaBundle.report.validation && schemaBundle.report.validation.blocked);
    const hasError = allIssues.some(function(issue) {
      return issue.severity === "error" || issue.severity === "blocked";
    });

    let resultType = payloadValidation.resultType;
    if (futureOnly) resultType = "future_only";
    else if (blocked) resultType = "blocked";
    else if (conflictReport.resultType === "conflict") resultType = "conflict";
    else if (conflictReport.resultType === "duplicate") resultType = "duplicate";
    else if (conflictReport.resultType === "no_op") resultType = "no_op";
    else if (hasError) resultType = "invalid";

    const normalizedState = normalizeDraftState(cloneDraft.state);
    let effectiveState = normalizedState;
    if (futureOnly) effectiveState = normalizedState;
    else if (blocked) effectiveState = "blocked_draft";
    else if (resultType === "valid" && DRAFT_ALLOWED_ACTIVE_STATES.includes(normalizedState)) {
      effectiveState = normalizedState === "local_draft" ? "validated_draft" : normalizedState;
    }

    return {
      contract_version: DRAFT_CONTRACT_VERSION,
      policy: cloneDraftValue(DRAFT_POLICY),
      draft: cloneDraft,
      target: {
        entry_id: cloneDraft.target_entry_id != null ? cloneDraft.target_entry_id : null,
        slug: cloneDraft.target_slug != null ? String(cloneDraft.target_slug) : "",
        section: section,
      },
      state: {
        requested: normalizedState,
        effective: effectiveState,
        futureOnly: futureOnly,
        active: DRAFT_ALLOWED_ACTIVE_STATES.includes(normalizedState) && !futureOnly,
      },
      intent: {
        planned: plannedIntent,
        plannedOnly: plannedIntent ? isIntentPlannedOnly(plannedIntent) : null,
        active: plannedIntent ? isIntentActive(plannedIntent) : false,
      },
      payloadValidation: payloadValidation,
      schemaValidation: schemaBundle,
      conflictReport: conflictReport,
      issues: allIssues,
      summary: {
        resultType: resultType,
        valid: resultType === "valid" || resultType === "duplicate" || resultType === "conflict" || resultType === "no_op",
        blocked: blocked,
        futureOnly: futureOnly,
        issueCount: allIssues.length,
        reviewRequired: conflictReport.reviewRequired || allIssues.some(function(issue) {
          return issue.code === "restricted_field_review";
        }),
      },
      actions: {
        write: shouldWriteDraftData(),
        submit: shouldSubmitDraft(),
        save: shouldSaveDraft(),
        modifyQueue: shouldModifyQueue(),
        approve: shouldApproveDraft(),
        reject: shouldRejectDraft(),
        archive: shouldArchiveDraft(),
        createPost: shouldCreatePostFromDraft(),
        createMissingEntry: shouldCreateMissingEntryFromDraft(),
        promote: shouldPromoteFromDraft(),
        searchIndex: shouldUpdateSearchIndexFromDraft(),
        mutateRegistry: shouldMutateContributionIntentRegistry(),
      },
    };
  }

  function renderDraftReport(report, options) {
    const mode = String(options && options.mode ? options.mode : "summary");
    const r = isPlainObject(report) ? report : {};
    const summary = isPlainObject(r.summary) ? r.summary : {};
    const target = isPlainObject(r.target) ? r.target : {};
    const state = isPlainObject(r.state) ? r.state : {};
    const intent = isPlainObject(r.intent) ? r.intent : {};

    let html = "<div class=\"bl-draft-contract-report\" data-mode=\"" + escapeHtml(mode) + "\">";
    html += "<h3 class=\"bl-draft-contract-title\">Structured Contribution Draft Report</h3>";
    html += "<p class=\"bl-draft-contract-meta\">version=" + escapeHtml(r.contract_version || DRAFT_CONTRACT_VERSION) +
      " result=" + escapeHtml(summary.resultType || "unknown") + "</p>";
    html += "<dl class=\"bl-draft-contract-dl\">";
    html += "<dt>Target slug</dt><dd>" + escapeHtml(target.slug || "—") + "</dd>";
    html += "<dt>Section</dt><dd>" + escapeHtml(target.section || "—") + "</dd>";
    html += "<dt>State</dt><dd>" + escapeHtml(state.requested || "not_started") +
      " → " + escapeHtml(state.effective || "not_started") + "</dd>";
    html += "<dt>Planned intent</dt><dd>" + escapeHtml(intent.planned || "—") + "</dd>";
    html += "<dt>Review required</dt><dd>" + escapeHtml(summary.reviewRequired === true) + "</dd>";
    html += "<dt>Issue count</dt><dd>" + escapeHtml(summary.issueCount || 0) + "</dd>";
    html += "</dl>";

    if (mode === "full" || mode === "diagnostics") {
      html += "<pre class=\"bl-draft-contract-json\">" + escapeHtml(JSON.stringify(r, null, 2)) + "</pre>";
    }

    html += "</div>";
    return html;
  }

  function renderDraftReportInto(container, report, options) {
    if (!container) return "";
    const html = renderDraftReport(report, options);
    container.innerHTML = html;
    return html;
  }

  function getDraftContractDiagnostics() {
    return {
      contract_version: DRAFT_CONTRACT_VERSION,
      states: DRAFT_STATES.slice(),
      allowedActiveStates: DRAFT_ALLOWED_ACTIVE_STATES.slice(),
      futureOnlyStates: DRAFT_FUTURE_ONLY_STATES.slice(),
      resultTypes: DRAFT_RESULT_TYPES.slice(),
      severities: DRAFT_SEVERITIES.slice(),
      payloadFields: DRAFT_PAYLOAD_FIELDS.slice(),
      plannedIntentMap: cloneDraftValue(PLANNED_INTENT_MAP),
      policy: cloneDraftValue(DRAFT_POLICY),
      schemaAvailable: !!getSchemaApi(),
      registryAvailable: !!getContributionIntentRegistry(),
    };
  }

  function shouldWriteDraftData() { return false; }
  function shouldSubmitDraft() { return false; }
  function shouldSaveDraft() { return false; }
  function shouldModifyQueue() { return false; }
  function shouldApproveDraft() { return false; }
  function shouldRejectDraft() { return false; }
  function shouldArchiveDraft() { return false; }
  function shouldCreatePostFromDraft() { return false; }
  function shouldCreateMissingEntryFromDraft() { return false; }
  function shouldPromoteFromDraft() { return false; }
  function shouldUpdateSearchIndexFromDraft() { return false; }
  function shouldMutateContributionIntentRegistry() { return false; }

  return {
    DRAFT_CONTRACT_VERSION: DRAFT_CONTRACT_VERSION,
    DRAFT_STATES: DRAFT_STATES,
    DRAFT_ALLOWED_ACTIVE_STATES: DRAFT_ALLOWED_ACTIVE_STATES,
    DRAFT_FUTURE_ONLY_STATES: DRAFT_FUTURE_ONLY_STATES,
    DRAFT_RESULT_TYPES: DRAFT_RESULT_TYPES,
    DRAFT_SEVERITIES: DRAFT_SEVERITIES,
    DRAFT_POLICY: DRAFT_POLICY,
    DRAFT_PAYLOAD_FIELDS: DRAFT_PAYLOAD_FIELDS,
    PLANNED_INTENT_MAP: PLANNED_INTENT_MAP,
    isPlainObject: isPlainObject,
    cloneDraftValue: cloneDraftValue,
    escapeHtml: escapeHtml,
    normalizeDraftState: normalizeDraftState,
    normalizeDraftSection: normalizeDraftSection,
    normalizeDraftIntent: normalizeDraftIntent,
    getDraftPayloadFields: getDraftPayloadFields,
    getPlannedIntentForSection: getPlannedIntentForSection,
    getContributionIntentRegistry: getContributionIntentRegistry,
    isIntentActive: isIntentActive,
    isIntentPlannedOnly: isIntentPlannedOnly,
    createDraftIssue: createDraftIssue,
    createDraftResult: createDraftResult,
    validateDraftTarget: validateDraftTarget,
    validateDraftSection: validateDraftSection,
    validateDraftFieldChanges: validateDraftFieldChanges,
    validateDraftEvidence: validateDraftEvidence,
    validateDraftAuditMetadata: validateDraftAuditMetadata,
    validateDraftPayload: validateDraftPayload,
    validateDraftState: validateDraftState,
    createSchemaValidationReport: createSchemaValidationReport,
    createFieldLevelConflictReport: createFieldLevelConflictReport,
    createDraftReport: createDraftReport,
    renderDraftReport: renderDraftReport,
    renderDraftReportInto: renderDraftReportInto,
    getDraftContractDiagnostics: getDraftContractDiagnostics,
    shouldWriteDraftData: shouldWriteDraftData,
    shouldSubmitDraft: shouldSubmitDraft,
    shouldSaveDraft: shouldSaveDraft,
    shouldModifyQueue: shouldModifyQueue,
    shouldApproveDraft: shouldApproveDraft,
    shouldRejectDraft: shouldRejectDraft,
    shouldArchiveDraft: shouldArchiveDraft,
    shouldCreatePostFromDraft: shouldCreatePostFromDraft,
    shouldCreateMissingEntryFromDraft: shouldCreateMissingEntryFromDraft,
    shouldPromoteFromDraft: shouldPromoteFromDraft,
    shouldUpdateSearchIndexFromDraft: shouldUpdateSearchIndexFromDraft,
    shouldMutateContributionIntentRegistry: shouldMutateContributionIntentRegistry,
  };
})();
