// ============================================
// BoundLore Admin Structured Context Inspector
// P4-C.3 — read-only structured field inspector baseline.
// No writes, no fetch, no Supabase, no queue/repair/promotion/post actions.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreAdminStructuredContextInspector = (function() {
  const INSPECTOR_VERSION = "p4-c3";

  const INSPECTOR_MODES = ["summary", "full", "diagnostics"];

  const INSPECTOR_SECTIONS = [
    "entry_identity",
    "raw_sources",
    "data_contract",
    "schema_validation",
    "validation_issues",
    "field_status",
    "policy_flags",
    "evidence_confidence",
    "warnings",
  ];

  const INSPECTOR_POLICY = {
    read_only: true,
    diagnostics_only: true,
    no_writes: true,
    no_mutation: true,
    no_actions: true,
    no_queue_actions: true,
    no_repair_actions: true,
    no_post_creation: true,
    no_promotion: true,
    no_search_index: true,
    no_admin_write_flows: true,
  };

  const RAW_SOURCE_KEYS = ["root", "meta", "discovery_payload", "structured_context"];

  function isPlainObject(value) {
    return !!value && typeof value === "object" && !Array.isArray(value);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function cloneInspectorValue(value) {
    try {
      return JSON.parse(JSON.stringify(value));
    } catch (err) {
      if (Array.isArray(value)) return value.slice();
      if (isPlainObject(value)) return Object.assign({}, value);
      return value;
    }
  }

  function normalizeInspectorMode(value) {
    const raw = String(value == null ? "" : value).trim().toLowerCase();
    if (INSPECTOR_MODES.includes(raw)) return raw;
    return "summary";
  }

  function createInspectorIssue(severity, code, message, details) {
    return {
      severity: String(severity || "info"),
      code: String(code || "inspector_issue"),
      message: String(message || ""),
      details: details ? cloneInspectorValue(details) : null,
    };
  }

  function getDataContractApi() {
    const api = window.BoundLoreContextDataContract;
    return api && typeof api === "object" ? api : null;
  }

  function getSchemaApi() {
    const api = window.BoundLoreStructuredContextSchema;
    return api && typeof api === "object" ? api : null;
  }

  function getEntryIdentity(entry) {
    const e = isPlainObject(entry) ? entry : {};
    return {
      title: e.title != null ? String(e.title) : "",
      slug: e.slug != null ? String(e.slug) : "",
      id: e.id != null ? e.id : null,
      entity_domain: e.entity_domain != null ? String(e.entity_domain) : "",
      entity_subtype: e.entity_subtype != null ? String(e.entity_subtype) : "",
      derived: e._derived === true || e.__derived === true,
    };
  }

  function countObjectKeys(obj) {
    return isPlainObject(obj) ? Object.keys(obj).length : 0;
  }

  function getRawSourceSummary(entry) {
    const e = isPlainObject(entry) ? entry : {};
    const meta = isPlainObject(e.meta) ? e.meta : {};
    const discovery = isPlainObject(e.discovery_payload) ? e.discovery_payload : {};
    const structured = isPlainObject(e.structured_context) ? e.structured_context : {};
    const rootFields = {};
    Object.keys(e).forEach(function(key) {
      if (key === "meta" || key === "discovery_payload" || key === "structured_context") return;
      rootFields[key] = e[key];
    });
    return {
      root: { present: countObjectKeys(rootFields) > 0, fieldCount: countObjectKeys(rootFields), keys: Object.keys(rootFields) },
      meta: { present: countObjectKeys(meta) > 0, fieldCount: countObjectKeys(meta), keys: Object.keys(meta) },
      discovery_payload: {
        present: countObjectKeys(discovery) > 0,
        fieldCount: countObjectKeys(discovery),
        keys: Object.keys(discovery),
      },
      structured_context: {
        present: countObjectKeys(structured) > 0,
        fieldCount: countObjectKeys(structured),
        keys: Object.keys(structured),
      },
    };
  }

  function createContractSummary(entry, options) {
    void options;
    const issues = [];
    const CDC = getDataContractApi();
    if (!CDC) {
      issues.push(createInspectorIssue("warning", "contract_api_missing", "BoundLoreContextDataContract is not available.", null));
      return { available: false, resolved: null, diagnostics: null, issues: issues };
    }
    const clone = cloneInspectorValue(entry);
    let resolved = null;
    let diagnostics = null;
    try {
      resolved = CDC.resolveContractEntry(clone);
      diagnostics = CDC.getContractDiagnostics(clone);
    } catch (err) {
      issues.push(createInspectorIssue("error", "contract_error", "Contract resolution failed.", {
        message: String(err && err.message ? err.message : err),
      }));
    }
    return {
      available: true,
      resolved: cloneInspectorValue(resolved),
      diagnostics: cloneInspectorValue(diagnostics),
      hasExplicitContext: diagnostics ? !!diagnostics.has_explicit_context : false,
      issues: issues,
    };
  }

  function buildSchemaValidationInput(entry, contractSummary) {
    void contractSummary;
    const input = cloneInspectorValue(entry);
    const structured = isPlainObject(input.structured_context)
      ? cloneInspectorValue(input.structured_context)
      : {};
    const CDC = getDataContractApi();
    if (CDC && typeof CDC.extractAllContractContext === "function") {
      const extracted = CDC.extractAllContractContext(entry) || {};
      Object.keys(extracted).forEach(function(section) {
        if (isPlainObject(extracted[section]) && Object.keys(extracted[section]).length) {
          structured[section] = extracted[section];
        }
      });
    }
    if (Object.keys(structured).length) input.structured_context = structured;
    return input;
  }

  function createValidationSummary(contractEntry, options) {
    void options;
    const issues = [];
    const SCS = getSchemaApi();
    if (!SCS) {
      issues.push(createInspectorIssue("warning", "schema_api_missing", "BoundLoreStructuredContextSchema is not available.", null));
      return { available: false, report: null, issues: issues };
    }
    let report = null;
    try {
      report = SCS.createValidationReport(contractEntry || {});
    } catch (err) {
      issues.push(createInspectorIssue("error", "schema_error", "Schema validation failed.", {
        message: String(err && err.message ? err.message : err),
      }));
    }
    return {
      available: true,
      report: cloneInspectorValue(report),
      validation: report && report.validation ? cloneInspectorValue(report.validation) : null,
      issues: issues,
    };
  }

  function createFieldStatusSummary(validationReport, options) {
    void options;
    const SCS = getSchemaApi();
    const summary = { sections: {}, totals: { authorable: 0, restricted: 0, planned: 0, forbidden: 0, unknown: 0 } };
    if (!SCS || !validationReport || !validationReport.validation) return summary;

    const sections = validationReport.validation.sections || {};
    Object.keys(sections).forEach(function(sectionKey) {
      const sectionReport = sections[sectionKey];
      const fields = {};
      (sectionReport.fieldResults || []).forEach(function(result) {
        const fieldName = result.field;
        let status = "unknown";
        if (SCS.isAuthorableField(sectionKey, fieldName)) status = "authorable";
        else if (SCS.isRestrictedField(sectionKey, fieldName)) status = "restricted";
        else if (SCS.isPlannedField(sectionKey, fieldName)) status = "planned";
        else if (SCS.isForbiddenField(sectionKey, fieldName)) status = "forbidden";
        else if (!SCS.isKnownField(sectionKey, fieldName)) status = "unknown";
        fields[fieldName] = {
          status: status,
          resultType: result.resultType,
          valid: result.valid,
        };
        if (summary.totals[status] != null) summary.totals[status] += 1;
        else summary.totals.unknown += 1;
      });
      summary.sections[sectionKey] = fields;
    });
    return summary;
  }

  function collectValidationIssues(validationSummary, contractSummary) {
    const issues = [];
    if (contractSummary && Array.isArray(contractSummary.issues)) {
      issues.push.apply(issues, contractSummary.issues);
    }
    if (validationSummary && Array.isArray(validationSummary.issues)) {
      issues.push.apply(issues, validationSummary.issues);
    }
    const validation = validationSummary && validationSummary.validation;
    if (validation && Array.isArray(validation.issues)) {
      validation.issues.forEach(function(issue) {
        issues.push(createInspectorIssue(issue.severity, issue.code, issue.message, issue.details));
      });
    }
    return issues;
  }

  function getEvidenceConfidence(entry) {
    const e = isPlainObject(entry) ? entry : {};
    const meta = isPlainObject(e.meta) ? e.meta : {};
    const out = {
      evidence_tier: meta.evidence_tier != null ? meta.evidence_tier : (e.evidence_tier != null ? e.evidence_tier : null),
      confidence: meta.confidence != null ? meta.confidence : (e.confidence != null ? e.confidence : null),
      present: false,
    };
    out.present = out.evidence_tier != null || out.confidence != null;
    return out;
  }

  function createPolicySummary() {
    return {
      inspector: cloneInspectorValue(INSPECTOR_POLICY),
      flags: {
        write: shouldWriteInspectorData(),
        actions: shouldRenderInspectorActions(),
        queue: shouldModifyQueue(),
        danger_tools: shouldTriggerRepair(),
        missing_entry: shouldCreateMissingEntry(),
        post: shouldCreatePost(),
        promotion: shouldPromoteEntity(),
        search_index: shouldUpdateSearchIndex(),
      },
    };
  }

  function createInspectorReport(entry, options) {
    const opts = options || {};
    const mode = normalizeInspectorMode(opts.mode);
    const clone = cloneInspectorValue(entry);
    const warnings = [];

    const contractSummary = createContractSummary(clone, opts);
    const schemaInput = buildSchemaValidationInput(clone, contractSummary);
    const validationSummary = createValidationSummary(schemaInput, opts);
    const fieldStatus = createFieldStatusSummary(validationSummary.report, opts);
    const validationIssues = collectValidationIssues(validationSummary, contractSummary);
    const evidence = getEvidenceConfidence(clone);

    if (!contractSummary.available) warnings.push("Context data contract API unavailable.");
    if (!validationSummary.available) warnings.push("Structured context schema API unavailable.");

    return {
      inspector_version: INSPECTOR_VERSION,
      mode: mode,
      policy: cloneInspectorValue(INSPECTOR_POLICY),
      entry_identity: getEntryIdentity(clone),
      raw_sources: getRawSourceSummary(clone),
      data_contract: contractSummary,
      schema_validation: validationSummary,
      validation_issues: validationIssues,
      field_status: fieldStatus,
      policy_flags: createPolicySummary(),
      evidence_confidence: evidence,
      warnings: warnings,
      input: cloneInspectorValue(entry),
    };
  }

  function renderInspectorValue(value) {
    if (value == null) return '<span class="bl-p4-inspector-empty">—</span>';
    if (typeof value === "boolean") return value ? "true" : "false";
    if (typeof value === "string" || typeof value === "number") return escapeHtml(value);
    return "<pre class=\"bl-p4-inspector-pre\">" + escapeHtml(JSON.stringify(value, null, 2)) + "</pre>";
  }

  function renderInspectorTable(rows, options) {
    const opts = options || {};
    const headers = opts.headers || [];
    let html = '<table class="bl-p4-inspector-table"><thead><tr>';
    headers.forEach(function(h) { html += "<th>" + escapeHtml(h) + "</th>"; });
    html += "</tr></thead><tbody>";
    (rows || []).forEach(function(row) {
      html += "<tr>";
      row.forEach(function(cell) { html += "<td>" + cell + "</td>"; });
      html += "</tr>";
    });
    html += "</tbody></table>";
    return html;
  }

  function renderSectionBlock(title, bodyHtml) {
    return (
      '<section class="bl-p4-inspector-section">' +
        '<h3 class="bl-p4-inspector-heading">' + escapeHtml(title) + "</h3>" +
        '<div class="bl-p4-inspector-body">' + bodyHtml + "</div>" +
      "</section>"
    );
  }

  function renderInspectorReport(report, options) {
    const opts = options || {};
    const mode = normalizeInspectorMode(opts.mode || (report && report.mode));
    if (!report) return '<div class="bl-p4-inspector-empty">No inspector report.</div>';

    let html = '<div class="bl-p4-inspector-report" data-mode="' + escapeHtml(mode) + '">';
    html += '<p class="bl-p4-inspector-meta">Inspector v' + escapeHtml(report.inspector_version) +
      " · mode=" + escapeHtml(mode) + " · read-only diagnostics</p>";

    const identity = report.entry_identity || {};
    html += renderSectionBlock("Entry Identity", renderInspectorTable([
      ["Title", escapeHtml(identity.title || "(empty)")],
      ["Slug", escapeHtml(identity.slug || "(none)")],
      ["Domain", escapeHtml(identity.entity_domain || "(none)")],
      ["Subtype", escapeHtml(identity.entity_subtype || "(none)")],
      ["Derived", identity.derived ? "yes" : "no"],
    ], { headers: ["Field", "Value"] }));

    const raw = report.raw_sources || {};
    html += renderSectionBlock("Raw Sources", renderInspectorTable(
      RAW_SOURCE_KEYS.map(function(key) {
        const src = raw[key] || {};
        return [key, src.present ? "yes" : "no", String(src.fieldCount || 0), escapeHtml((src.keys || []).join(", ") || "—")];
      }),
      { headers: ["Source", "Present", "Fields", "Keys"] }
    ));

    const contract = report.data_contract || {};
    html += renderSectionBlock("Data Contract", (
      "<p>Available: " + (contract.available ? "yes" : "no") +
      " · Explicit context: " + (contract.hasExplicitContext ? "yes" : "no") + "</p>" +
      (mode !== "summary" ? renderInspectorValue(contract.diagnostics) : "")
    ));

    const validation = report.schema_validation || {};
    const val = validation.validation || {};
    html += renderSectionBlock("Schema Validation", (
      "<p>Available: " + (validation.available ? "yes" : "no") +
      " · Valid: " + (val.valid != null ? String(val.valid) : "n/a") +
      " · Blocked: " + (val.blocked != null ? String(val.blocked) : "n/a") + "</p>" +
      (mode === "full" || mode === "diagnostics" ? renderInspectorValue(validation.report) : "")
    ));

    const issues = report.validation_issues || [];
    const issueRows = issues.slice(0, mode === "summary" ? 8 : 50).map(function(issue) {
      return [
        escapeHtml(issue.severity),
        escapeHtml(issue.code),
        escapeHtml(issue.message),
      ];
    });
    html += renderSectionBlock("Validation Issues", issueRows.length
      ? renderInspectorTable(issueRows, { headers: ["Severity", "Code", "Message"] })
      : '<p class="bl-p4-inspector-empty">No issues.</p>');

    if (mode !== "summary") {
      html += renderSectionBlock("Field Status", renderInspectorValue(report.field_status));
    }

    const flags = (report.policy_flags && report.policy_flags.flags) || {};
    html += renderSectionBlock("Policy Flags", renderInspectorTable([
      ["write", String(flags.write)],
      ["actions", String(flags.actions)],
      ["queue", String(flags.queue)],
      ["danger_tools", String(flags.danger_tools)],
      ["missing_entry", String(flags.missing_entry)],
      ["post", String(flags.post)],
      ["promotion", String(flags.promotion)],
      ["search_index", String(flags.search_index)],
    ], { headers: ["Flag", "Enabled"] }));

    const evidence = report.evidence_confidence || {};
    if (evidence.present || mode !== "summary") {
      html += renderSectionBlock("Evidence / Confidence", renderInspectorTable([
        ["evidence_tier", escapeHtml(evidence.evidence_tier != null ? evidence.evidence_tier : "—")],
        ["confidence", escapeHtml(evidence.confidence != null ? evidence.confidence : "—")],
      ], { headers: ["Field", "Value"] }));
    }

    if ((report.warnings || []).length) {
      html += renderSectionBlock("Warnings", "<ul class=\"bl-p4-inspector-list\">" +
        report.warnings.map(function(w) { return "<li>" + escapeHtml(w) + "</li>"; }).join("") +
        "</ul>");
    }

    if (mode === "diagnostics") {
      html += renderSectionBlock("Diagnostics JSON", renderInspectorValue({
        inspector_version: report.inspector_version,
        mode: report.mode,
        sections: INSPECTOR_SECTIONS,
      }));
    }

    html += "</div>";
    return html;
  }

  function renderInspectorPanel(entry, options) {
    const report = createInspectorReport(entry, options);
    return (
      '<div class="bl-p4-inspector-panel">' +
        renderInspectorReport(report, options) +
      "</div>"
    );
  }

  function renderInspectorPanelInto(container, entry, options) {
    if (!container) return null;
    const report = createInspectorReport(entry, options);
    container.innerHTML = renderInspectorPanel(entry, options);
    return report;
  }

  function getInspectorDiagnostics() {
    return {
      inspector_version: INSPECTOR_VERSION,
      modes: INSPECTOR_MODES.slice(),
      sections: INSPECTOR_SECTIONS.slice(),
      policy: cloneInspectorValue(INSPECTOR_POLICY),
      apis: {
        dataContract: !!getDataContractApi(),
        schema: !!getSchemaApi(),
      },
    };
  }

  function shouldWriteInspectorData() { return false; }
  function shouldRenderInspectorActions() { return false; }
  function shouldModifyQueue() { return false; }
  function shouldTriggerRepair() { return false; }
  function shouldCreateMissingEntry() { return false; }
  function shouldCreatePost() { return false; }
  function shouldPromoteEntity() { return false; }
  function shouldUpdateSearchIndex() { return false; }

  return {
    INSPECTOR_VERSION: INSPECTOR_VERSION,
    INSPECTOR_MODES: INSPECTOR_MODES,
    INSPECTOR_SECTIONS: INSPECTOR_SECTIONS,
    INSPECTOR_POLICY: INSPECTOR_POLICY,
    isPlainObject: isPlainObject,
    escapeHtml: escapeHtml,
    cloneInspectorValue: cloneInspectorValue,
    normalizeInspectorMode: normalizeInspectorMode,
    getEntryIdentity: getEntryIdentity,
    getRawSourceSummary: getRawSourceSummary,
    getDataContractApi: getDataContractApi,
    getSchemaApi: getSchemaApi,
    createContractSummary: createContractSummary,
    createValidationSummary: createValidationSummary,
    createFieldStatusSummary: createFieldStatusSummary,
    createPolicySummary: createPolicySummary,
    createInspectorIssue: createInspectorIssue,
    createInspectorReport: createInspectorReport,
    renderInspectorValue: renderInspectorValue,
    renderInspectorTable: renderInspectorTable,
    renderInspectorReport: renderInspectorReport,
    renderInspectorPanel: renderInspectorPanel,
    renderInspectorPanelInto: renderInspectorPanelInto,
    getInspectorDiagnostics: getInspectorDiagnostics,
    shouldWriteInspectorData: shouldWriteInspectorData,
    shouldRenderInspectorActions: shouldRenderInspectorActions,
    shouldModifyQueue: shouldModifyQueue,
    shouldTriggerRepair: shouldTriggerRepair,
    shouldCreateMissingEntry: shouldCreateMissingEntry,
    shouldCreatePost: shouldCreatePost,
    shouldPromoteEntity: shouldPromoteEntity,
    shouldUpdateSearchIndex: shouldUpdateSearchIndex,
  };
})();
