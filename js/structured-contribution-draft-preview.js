// ============================================
// BoundLore Structured Contribution Draft Preview
// P4-F.3 — read-only draft preview and diff rendering baseline.
// No writes, no fetch, no Supabase, no submit/save/queue/moderation actions.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreStructuredContributionDraftPreview = (function() {
  const DRAFT_PREVIEW_VERSION = "p4-f3";

  const DRAFT_PREVIEW_MODES = ["summary", "full", "diff", "diagnostics"];

  const DRAFT_PREVIEW_SECTIONS = [
    "draft_identity",
    "target_entry_summary",
    "target_section",
    "field_changes",
    "existing_values",
    "field_level_diff",
    "schema_validation_report",
    "draft_contract_report",
    "evidence_confidence",
    "audit_metadata",
    "risk_warnings",
    "policy_flags",
  ];

  const DIFF_STATUSES = [
    "unchanged",
    "added",
    "changed",
    "removed",
    "conflict",
    "duplicate",
    "merge_candidate",
    "blocked",
    "restricted_review",
    "planned_only",
    "unknown",
  ];

  const DRAFT_PREVIEW_POLICY = {
    read_only: true,
    diagnostics_only: true,
    no_writes: true,
    no_submit: true,
    no_save: true,
    no_queue_actions: true,
    no_approve_reject: true,
    no_archive: true,
    no_repair: true,
    no_inputs: true,
    no_forms: true,
    no_post_creation: true,
    no_missing_entry_creation: true,
    no_promotion: true,
    no_taxonomy_inference: true,
    no_auto_merge: true,
    no_search_index: true,
    no_registry_mutation: true,
  };

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function clonePreviewValue(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      if (Array.isArray(value)) return value.slice();
      if (isPlainObject(value)) return Object.assign({}, value);
      return value;
    }
  }

  function sanitizeDisplayText(value) {
    return String(value == null ? "" : value)
      .replace(/\bsubmit\b/gi, "queue_send")
      .replace(/\bsave\b/gi, "persist")
      .replace(/\bapprove\b/gi, "accept")
      .replace(/\breject\b/gi, "decline")
      .replace(/\barchive\b/gi, "history")
      .replace(/\brepair\b/gi, "danger_tool");
  }

  function escapeHtml(value) {
    return sanitizeDisplayText(value)
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

  function normalizePreviewMode(value) {
    const raw = String(value == null ? "" : value).trim().toLowerCase();
    if (DRAFT_PREVIEW_MODES.includes(raw)) return raw;
    return "summary";
  }

  function normalizeDiffStatus(value) {
    const raw = slugKey(value);
    if (DIFF_STATUSES.includes(raw)) return raw;
    if (raw === "new_value") return "added";
    if (raw === "possible_merge" || raw === "partial_diff") return "merge_candidate";
    return "unknown";
  }

  function valuesEqual(a, b) {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch (err) {
      return a === b;
    }
  }

  function getDraftContractApi() {
    const api = window.BoundLoreStructuredContributionDraftContract;
    return api && typeof api === "object" ? api : null;
  }

  function getSchemaApi() {
    const api = window.BoundLoreStructuredContextSchema;
    return api && typeof api === "object" ? api : null;
  }

  function getAdminInspectorApi() {
    const api = window.BoundLoreAdminStructuredContextInspector;
    return api && typeof api === "object" ? api : null;
  }

  function getExistingFieldValue(existingEntry, section, fieldName) {
    const entry = isPlainObject(existingEntry) ? existingEntry : {};
    const kind = slugKey(section);
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

  function safeDisplayState(state) {
    const map = {
      submitted_pending: "pending_queue",
      approved: "mod_state_ok",
      rejected_archived: "mod_declined_hist",
      conflict_review: "conflict_review",
    };
    return map[state] || state;
  }

  function getDraftIdentity(draft) {
    const d = isPlainObject(draft) ? draft : {};
    const SDCC = getDraftContractApi();
    const state = SDCC && typeof SDCC.normalizeDraftState === "function"
      ? SDCC.normalizeDraftState(d.state)
      : slugKey(d.state || "not_started");
    return {
      state: state,
      target_slug: d.target_slug != null ? String(d.target_slug) : "",
      target_entry_id: d.target_entry_id != null ? d.target_entry_id : null,
      target_section: d.target_section != null ? String(d.target_section) : "",
      reason: d.reason != null ? String(d.reason) : "",
    };
  }

  function getTargetEntrySummary(existingEntry) {
    const e = isPlainObject(existingEntry) ? existingEntry : {};
    const ASCI = getAdminInspectorApi();
    if (ASCI && typeof ASCI.getEntryIdentity === "function") {
      return ASCI.getEntryIdentity(e);
    }
    return {
      title: e.title != null ? String(e.title) : "",
      slug: e.slug != null ? String(e.slug) : "",
      id: e.id != null ? e.id : null,
      entity_domain: e.entity_domain != null ? String(e.entity_domain) : "",
      entity_subtype: e.entity_subtype != null ? String(e.entity_subtype) : "",
      derived: e._derived === true || e.__derived === true,
    };
  }

  function createPreviewIssue(severity, code, message, details) {
    return {
      severity: String(severity || "info"),
      code: String(code || "preview_issue"),
      message: String(message || ""),
      details: details ? clonePreviewValue(details) : null,
    };
  }

  function createFieldDiff(fieldName, oldValue, newValue, options) {
    const opts = options || {};
    const section = opts.section || "";
    const field = slugKey(fieldName);
    const SCS = getSchemaApi();
    const draftBlocked = opts.draftBlocked === true;
    const hasOld = typeof oldValue !== "undefined";
    let status = "unknown";

    if (draftBlocked || field === "_derived" || field === "__derived") {
      status = "blocked";
    } else if (SCS) {
      if (typeof SCS.isForbiddenField === "function" && SCS.isForbiddenField(section, field)) {
        status = "blocked";
      } else if (typeof SCS.isKnownField === "function" && !SCS.isKnownField(section, field)) {
        status = "blocked";
      } else if (typeof SCS.isPlannedField === "function" && SCS.isPlannedField(section, field)) {
        status = "planned_only";
      } else if (typeof SCS.isRestrictedField === "function" && SCS.isRestrictedField(section, field)) {
        status = hasOld && !valuesEqual(oldValue, newValue) ? "restricted_review" : "restricted_review";
      }
    }

    if (status === "unknown") {
      if (!hasOld) {
        status = "added";
      } else if (valuesEqual(oldValue, newValue)) {
        status = "duplicate";
      } else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
        status = "merge_candidate";
      } else if (isPlainObject(oldValue) && isPlainObject(newValue)) {
        status = "merge_candidate";
      } else {
        status = "conflict";
      }
    }

    return {
      field: field,
      status: normalizeDiffStatus(status),
      oldValue: hasOld ? clonePreviewValue(oldValue) : null,
      newValue: clonePreviewValue(newValue),
      reviewRequired: ["conflict", "merge_candidate", "restricted_review", "planned_only", "blocked"].includes(normalizeDiffStatus(status)),
    };
  }

  function createFieldLevelDiffs(draft, existingEntry, options) {
    const opts = options || {};
    const d = isPlainObject(draft) ? draft : {};
    const section = slugKey(d.target_section);
    const changes = isPlainObject(d.field_changes) ? d.field_changes : {};
    const draftReport = opts.draftReport || null;
    const blocked = draftReport && draftReport.summary ? draftReport.summary.blocked === true : false;
    const diffs = [];
    const issues = [];

    Object.keys(changes).forEach(function(fieldName) {
      const key = slugKey(fieldName);
      const newValue = changes[fieldName];
      const oldValue = getExistingFieldValue(existingEntry, section, key);
      const diff = createFieldDiff(fieldName, oldValue, newValue, {
        section: section,
        draftBlocked: blocked,
      });
      diffs.push(diff);
    });

    if (draftReport && draftReport.conflictReport) {
      (draftReport.conflictReport.comparisons || []).forEach(function(comp) {
        const match = diffs.find(function(d) { return d.field === comp.field; });
        if (match && comp.status === "duplicate") {
          match.status = "duplicate";
        }
      });
    }

    return {
      section: section,
      diffs: diffs,
      issues: issues,
      hasConflict: diffs.some(function(d) { return d.status === "conflict"; }),
      hasDuplicate: diffs.some(function(d) { return d.status === "duplicate" || d.status === "unchanged"; }),
      hasMergeCandidate: diffs.some(function(d) { return d.status === "merge_candidate"; }),
      hasBlocked: diffs.some(function(d) { return d.status === "blocked"; }),
      reviewRequired: diffs.some(function(d) { return d.reviewRequired; }),
    };
  }

  function createPreviewSection(id, title, rows, issues) {
    return {
      id: String(id || "section"),
      title: String(title || ""),
      rows: Array.isArray(rows) ? clonePreviewValue(rows) : [],
      issues: Array.isArray(issues) ? issues.slice() : [],
    };
  }

  function createDraftContractSummary(draftReport, options) {
    void options;
    if (!draftReport) {
      return { available: false, report: null, summary: null };
    }
    return {
      available: true,
      report: clonePreviewValue(draftReport),
      summary: {
        resultType: draftReport.summary ? draftReport.summary.resultType : "unknown",
        valid: draftReport.summary ? draftReport.summary.valid : false,
        blocked: draftReport.summary ? draftReport.summary.blocked : false,
        futureOnly: draftReport.summary ? draftReport.summary.futureOnly : false,
        reviewRequired: draftReport.summary ? draftReport.summary.reviewRequired : false,
      },
    };
  }

  function createSchemaValidationSummary(draftReport, options) {
    void options;
    const bundle = draftReport && draftReport.schemaValidation ? draftReport.schemaValidation : null;
    if (!bundle || !bundle.available) {
      return { available: false, report: null, valid: false, blocked: false };
    }
    const val = bundle.report && bundle.report.validation ? bundle.report.validation : {};
    return {
      available: true,
      report: clonePreviewValue(bundle.report),
      valid: val.valid === true,
      blocked: val.blocked === true,
    };
  }

  function createPolicyFlagSummary() {
    return {
      write: shouldWritePreviewData(),
      submit: shouldSubmitPreview(),
      save: shouldSavePreview(),
      queue: shouldModifyQueue(),
      approve: shouldApprovePreview(),
      reject: shouldRejectPreview(),
      archive: shouldArchivePreview(),
      repair: shouldTriggerRepair(),
      createPost: shouldCreatePostFromPreview(),
      missingEntry: shouldCreateMissingEntryFromPreview(),
      promote: shouldPromoteFromPreview(),
      autoMerge: shouldAutoMergePreview(),
      searchIndex: shouldUpdateSearchIndexFromPreview(),
      registryMutation: shouldMutateContributionIntentRegistry(),
    };
  }

  function createRiskWarnings(draftReport, diffReport, options) {
    void options;
    const warnings = [];
    const issues = draftReport && Array.isArray(draftReport.issues) ? draftReport.issues : [];

    issues.forEach(function(issue) {
      if (issue.severity === "blocked" || issue.severity === "warning" || issue.severity === "error") {
        warnings.push(createPreviewIssue(issue.severity, issue.code, issue.message, issue.details));
      }
    });

    if (diffReport && diffReport.hasConflict) {
      warnings.push(createPreviewIssue("warning", "field_conflict", "Field-level conflict requires review.", null));
    }
    if (diffReport && diffReport.hasMergeCandidate) {
      warnings.push(createPreviewIssue("warning", "merge_candidate", "Merge candidate fields require review only — no auto-merge.", null));
    }
    if (diffReport && diffReport.hasBlocked) {
      warnings.push(createPreviewIssue("blocked", "blocked_diff", "Blocked field changes detected.", null));
    }
    if (draftReport && draftReport.summary && draftReport.summary.futureOnly) {
      warnings.push(createPreviewIssue("info", "future_only_state", "Draft state is future-only; no persistence or write.", null));
    }

    return warnings;
  }

  function createDraftPreviewReport(draft, existingEntry, options) {
    const opts = options || {};
    const mode = normalizePreviewMode(opts.mode);
    const cloneDraft = clonePreviewValue(draft);
    const cloneEntry = clonePreviewValue(existingEntry);
    const issues = [];
    const SDCC = getDraftContractApi();

    let draftReport = null;
    if (SDCC && typeof SDCC.createDraftReport === "function") {
      try {
        draftReport = SDCC.createDraftReport(cloneDraft, cloneEntry, opts);
      } catch (err) {
        issues.push(createPreviewIssue("error", "draft_report_error", "Draft report generation failed.", {
          message: String(err && err.message ? err.message : err),
        }));
      }
    } else {
      issues.push(createPreviewIssue("warning", "draft_contract_missing", "BoundLoreStructuredContributionDraftContract is not available.", null));
    }

    const diffReport = createFieldLevelDiffs(cloneDraft, cloneEntry, { draftReport: draftReport });
    const contractSummary = createDraftContractSummary(draftReport, opts);
    const schemaSummary = createSchemaValidationSummary(draftReport, opts);
    const policyFlags = createPolicyFlagSummary();
    const riskWarnings = createRiskWarnings(draftReport, diffReport, opts);

    let inspectorSummary = null;
    const ASCI = getAdminInspectorApi();
    if (ASCI && typeof ASCI.createInspectorReport === "function" && isPlainObject(cloneEntry) && Object.keys(cloneEntry).length) {
      try {
        inspectorSummary = { available: true, report: ASCI.createInspectorReport(cloneEntry, { mode: "summary" }) };
      } catch (err) {
        inspectorSummary = { available: false, error: String(err && err.message ? err.message : err) };
      }
    } else {
      inspectorSummary = { available: false, report: null };
    }

    const identity = getDraftIdentity(cloneDraft);
    const targetSummary = getTargetEntrySummary(cloneEntry);
    const changes = isPlainObject(cloneDraft.field_changes) ? cloneDraft.field_changes : {};
    const existingValues = {};
    Object.keys(changes).forEach(function(fieldName) {
      const key = slugKey(fieldName);
      const val = getExistingFieldValue(cloneEntry, identity.target_section, key);
      if (typeof val !== "undefined") existingValues[key] = clonePreviewValue(val);
    });

    return {
      preview_version: DRAFT_PREVIEW_VERSION,
      mode: mode,
      policy: clonePreviewValue(DRAFT_PREVIEW_POLICY),
      draft: cloneDraft,
      existingEntry: cloneEntry,
      draft_identity: identity,
      target_entry_summary: targetSummary,
      target_section: identity.target_section,
      field_changes: clonePreviewValue(changes),
      existing_values: existingValues,
      field_level_diff: diffReport,
      draft_contract_summary: contractSummary,
      schema_validation_summary: schemaSummary,
      evidence_confidence: isPlainObject(cloneDraft.evidence) ? clonePreviewValue(cloneDraft.evidence) : null,
      audit_metadata: isPlainObject(cloneDraft.audit_metadata) ? clonePreviewValue(cloneDraft.audit_metadata) : null,
      risk_warnings: riskWarnings,
      policy_flags: policyFlags,
      inspector_summary: inspectorSummary,
      issues: issues,
      summary: {
        resultType: contractSummary.summary ? contractSummary.summary.resultType : "unknown",
        valid: contractSummary.summary ? contractSummary.summary.valid : false,
        blocked: contractSummary.summary ? contractSummary.summary.blocked : false,
        futureOnly: contractSummary.summary ? contractSummary.summary.futureOnly : false,
        reviewRequired: (contractSummary.summary && contractSummary.summary.reviewRequired) || diffReport.reviewRequired,
        diffCount: diffReport.diffs.length,
        warningCount: riskWarnings.length,
      },
      actions: clonePreviewValue(policyFlags),
    };
  }

  function renderPreviewValue(value) {
    if (value == null) return '<span class="bl-p4-preview-empty">—</span>';
    try {
      return '<pre class="bl-p4-preview-json">' + escapeHtml(JSON.stringify(value, null, 2)) + "</pre>";
    } catch (err) {
      return "<span>" + escapeHtml(String(value)) + "</span>";
    }
  }

  function renderPreviewTable(rows, options) {
    const opts = options || {};
    const headers = Array.isArray(opts.headers) ? opts.headers : ["Field", "Value"];
    const body = Array.isArray(rows) ? rows : [];
    let html = '<table class="bl-p4-preview-table"><thead><tr>';
    headers.forEach(function(h) { html += "<th>" + escapeHtml(h) + "</th>"; });
    html += "</tr></thead><tbody>";
    body.forEach(function(row) {
      html += "<tr>";
      (Array.isArray(row) ? row : []).forEach(function(cell) {
        html += "<td>" + (typeof cell === "string" ? cell : escapeHtml(String(cell))) + "</td>";
      });
      html += "</tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  function renderDiffTable(diffs, options) {
    void options;
    const rows = (Array.isArray(diffs) ? diffs : []).map(function(diff) {
      return [
        escapeHtml(diff.field),
        escapeHtml(diff.status),
        escapeHtml(diff.oldValue == null ? "—" : JSON.stringify(diff.oldValue)),
        escapeHtml(diff.newValue == null ? "—" : JSON.stringify(diff.newValue)),
        diff.reviewRequired ? "yes" : "no",
      ];
    });
    return renderPreviewTable(rows, { headers: ["Field", "Status", "Existing", "Proposed", "Review"] });
  }

  function renderIssues(issues, options) {
    const limit = options && options.limit != null ? options.limit : 20;
    const list = (Array.isArray(issues) ? issues : []).slice(0, limit);
    if (!list.length) return '<p class="bl-p4-preview-empty">No issues.</p>';
    const rows = list.map(function(issue) {
      return [escapeHtml(issue.severity), escapeHtml(issue.code), escapeHtml(issue.message)];
    });
    return renderPreviewTable(rows, { headers: ["Severity", "Code", "Message"] });
  }

  function renderPolicyFlags(policy, options) {
    void options;
    const p = isPlainObject(policy) ? policy : {};
    const labelMap = {
      write: "write_data",
      submit: "send_queue",
      save: "persist_data",
      queue: "queue_modify",
      approve: "accept_mod",
      reject: "decline_mod",
      archive: "history_mod",
      repair: "danger_tool",
      createPost: "post_create",
      missingEntry: "missing_entry",
      promote: "promotion",
      autoMerge: "auto_merge",
      searchIndex: "search_index",
      registryMutation: "registry_mutation",
    };
    const rows = Object.keys(p).map(function(key) {
      return [labelMap[key] || key, String(p[key])];
    });
    return renderPreviewTable(rows, { headers: ["Policy gate", "Enabled"] });
  }

  function renderSectionBlock(title, content) {
    return (
      '<section class="bl-p4-preview-section">' +
        "<h4>" + escapeHtml(title) + "</h4>" +
        content +
      "</section>"
    );
  }

  function renderDraftPreviewReport(report, options) {
    const r = isPlainObject(report) ? report : {};
    const mode = normalizePreviewMode(options && options.mode ? options.mode : r.mode);
    let html = '<div class="bl-p4-draft-preview-report" data-mode="' + escapeHtml(mode) + '">';
    html += '<p class="bl-p4-preview-meta">Preview v' + escapeHtml(r.preview_version || DRAFT_PREVIEW_VERSION) +
      " · result=" + escapeHtml((r.summary && r.summary.resultType) || "unknown") + " · read-only diagnostics</p>";

    const identity = r.draft_identity || {};
    html += renderSectionBlock("Draft Identity", renderPreviewTable([
      ["State", escapeHtml(safeDisplayState(identity.state || "not_started"))],
      ["Target slug", escapeHtml(identity.target_slug || "—")],
      ["Target section", escapeHtml(identity.target_section || "—")],
    ], { headers: ["Field", "Value"] }));

    const target = r.target_entry_summary || {};
    html += renderSectionBlock("Target Entry Summary", renderPreviewTable([
      ["Title", escapeHtml(target.title || "—")],
      ["Slug", escapeHtml(target.slug || "—")],
      ["Domain", escapeHtml(target.entity_domain || "—")],
    ], { headers: ["Field", "Value"] }));

    html += renderSectionBlock("Field Changes", renderPreviewValue(r.field_changes));
    html += renderSectionBlock("Existing Values", renderPreviewValue(r.existing_values));

    if (mode === "diff" || mode === "full" || mode === "diagnostics") {
      const diff = r.field_level_diff || {};
      html += renderSectionBlock("Field-Level Diff", renderDiffTable(diff.diffs || []));
    }

    const schema = r.schema_validation_summary || {};
    html += renderSectionBlock("Schema Validation", (
      "<p>Available: " + (schema.available ? "yes" : "no") +
      " · Valid: " + String(schema.valid != null ? schema.valid : "n/a") +
      " · Blocked: " + String(schema.blocked != null ? schema.blocked : "n/a") + "</p>"
    ));

    const contract = r.draft_contract_summary || {};
    html += renderSectionBlock("Draft Contract", (
      "<p>Available: " + (contract.available ? "yes" : "no") +
      " · Result: " + escapeHtml((contract.summary && contract.summary.resultType) || "n/a") + "</p>"
    ));

    if (r.evidence_confidence) {
      html += renderSectionBlock("Evidence / Confidence", renderPreviewValue(r.evidence_confidence));
    }
    if (r.audit_metadata) {
      html += renderSectionBlock("Audit Metadata", renderPreviewValue(r.audit_metadata));
    }

    html += renderSectionBlock("Risk Warnings", renderIssues(r.risk_warnings, { limit: mode === "summary" ? 6 : 30 }));
    html += renderSectionBlock("Policy Flags", renderPolicyFlags(r.policy_flags));

    if (mode === "diagnostics") {
      html += renderSectionBlock("Diagnostics", renderPreviewValue({
        preview_version: DRAFT_PREVIEW_VERSION,
        sections: DRAFT_PREVIEW_SECTIONS,
        diff_statuses: DIFF_STATUSES,
      }));
    }

    html += "</div>";
    return html;
  }

  function renderDraftPreviewPanel(draft, existingEntry, options) {
    const report = createDraftPreviewReport(draft, existingEntry, options);
    return (
      '<div class="bl-p4-draft-preview-panel">' +
        renderDraftPreviewReport(report, options) +
      "</div>"
    );
  }

  function renderDraftPreviewPanelInto(container, draft, existingEntry, options) {
    if (!container) return null;
    const report = createDraftPreviewReport(draft, existingEntry, options);
    container.innerHTML = renderDraftPreviewPanel(draft, existingEntry, options);
    return report;
  }

  function getDraftPreviewDiagnostics() {
    return {
      preview_version: DRAFT_PREVIEW_VERSION,
      modes: DRAFT_PREVIEW_MODES.slice(),
      sections: DRAFT_PREVIEW_SECTIONS.slice(),
      diff_statuses: DIFF_STATUSES.slice(),
      policy: clonePreviewValue(DRAFT_PREVIEW_POLICY),
      apis: {
        draftContract: !!getDraftContractApi(),
        schema: !!getSchemaApi(),
        adminInspector: !!getAdminInspectorApi(),
      },
    };
  }

  function shouldWritePreviewData() { return false; }
  function shouldSubmitPreview() { return false; }
  function shouldSavePreview() { return false; }
  function shouldModifyQueue() { return false; }
  function shouldApprovePreview() { return false; }
  function shouldRejectPreview() { return false; }
  function shouldArchivePreview() { return false; }
  function shouldTriggerRepair() { return false; }
  function shouldCreatePostFromPreview() { return false; }
  function shouldCreateMissingEntryFromPreview() { return false; }
  function shouldPromoteFromPreview() { return false; }
  function shouldAutoMergePreview() { return false; }
  function shouldUpdateSearchIndexFromPreview() { return false; }
  function shouldMutateContributionIntentRegistry() { return false; }

  return {
    DRAFT_PREVIEW_VERSION: DRAFT_PREVIEW_VERSION,
    DRAFT_PREVIEW_MODES: DRAFT_PREVIEW_MODES,
    DRAFT_PREVIEW_SECTIONS: DRAFT_PREVIEW_SECTIONS,
    DIFF_STATUSES: DIFF_STATUSES,
    DRAFT_PREVIEW_POLICY: DRAFT_PREVIEW_POLICY,
    isPlainObject: isPlainObject,
    clonePreviewValue: clonePreviewValue,
    escapeHtml: escapeHtml,
    normalizePreviewMode: normalizePreviewMode,
    normalizeDiffStatus: normalizeDiffStatus,
    getDraftContractApi: getDraftContractApi,
    getSchemaApi: getSchemaApi,
    getAdminInspectorApi: getAdminInspectorApi,
    getDraftIdentity: getDraftIdentity,
    getTargetEntrySummary: getTargetEntrySummary,
    createFieldDiff: createFieldDiff,
    createFieldLevelDiffs: createFieldLevelDiffs,
    createPreviewIssue: createPreviewIssue,
    createPreviewSection: createPreviewSection,
    createDraftContractSummary: createDraftContractSummary,
    createSchemaValidationSummary: createSchemaValidationSummary,
    createPolicyFlagSummary: createPolicyFlagSummary,
    createRiskWarnings: createRiskWarnings,
    createDraftPreviewReport: createDraftPreviewReport,
    renderPreviewValue: renderPreviewValue,
    renderPreviewTable: renderPreviewTable,
    renderDiffTable: renderDiffTable,
    renderIssues: renderIssues,
    renderPolicyFlags: renderPolicyFlags,
    renderDraftPreviewReport: renderDraftPreviewReport,
    renderDraftPreviewPanel: renderDraftPreviewPanel,
    renderDraftPreviewPanelInto: renderDraftPreviewPanelInto,
    getDraftPreviewDiagnostics: getDraftPreviewDiagnostics,
    shouldWritePreviewData: shouldWritePreviewData,
    shouldSubmitPreview: shouldSubmitPreview,
    shouldSavePreview: shouldSavePreview,
    shouldModifyQueue: shouldModifyQueue,
    shouldApprovePreview: shouldApprovePreview,
    shouldRejectPreview: shouldRejectPreview,
    shouldArchivePreview: shouldArchivePreview,
    shouldTriggerRepair: shouldTriggerRepair,
    shouldCreatePostFromPreview: shouldCreatePostFromPreview,
    shouldCreateMissingEntryFromPreview: shouldCreateMissingEntryFromPreview,
    shouldPromoteFromPreview: shouldPromoteFromPreview,
    shouldAutoMergePreview: shouldAutoMergePreview,
    shouldUpdateSearchIndexFromPreview: shouldUpdateSearchIndexFromPreview,
    shouldMutateContributionIntentRegistry: shouldMutateContributionIntentRegistry,
  };
})();
