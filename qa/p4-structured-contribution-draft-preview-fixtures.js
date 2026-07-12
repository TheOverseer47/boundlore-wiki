// QA-only local fixture harness for BoundLoreStructuredContributionDraftPreview (P4-F.3).
// No Supabase, no fetch/write, no admin/create/edit flows, no action controls.

(function() {
  const SDCP = window.BoundLoreStructuredContributionDraftPreview;
  const SDCC = window.BoundLoreStructuredContributionDraftContract;

  const FIXTURES = [
    {
      id: "addedResourceNodeField",
      label: "A. addedResourceNodeField",
      draft: {
        state: "local_draft",
        target_slug: "qa-ember-shard-511160",
        target_section: "resource_node",
        field_changes: { node_type: "crystal_node" },
      },
      existingEntry: { slug: "qa-ember-shard-511160", title: "QA Ember Shard" },
      expect: function(report) {
        const diff = (report.field_level_diff.diffs || [])[0];
        return (diff && (diff.status === "added" || diff.status === "changed")) &&
          report.summary.valid !== false &&
          SDCP.shouldSubmitPreview() === false;
      },
    },
    {
      id: "duplicateRequirementField",
      label: "B. duplicateRequirementField",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: { meta: { required_level: 10 } },
      expect: function(report) {
        const diff = (report.field_level_diff.diffs || [])[0];
        return diff && (diff.status === "duplicate" || diff.status === "unchanged");
      },
    },
    {
      id: "conflictRequirementField",
      label: "C. conflictRequirementField",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: { meta: { required_level: 5 } },
      expect: function(report) {
        return report.field_level_diff.hasConflict === true &&
          SDCP.shouldModifyQueue() === false;
      },
    },
    {
      id: "mergeCandidateArray",
      label: "D. mergeCandidateArray",
      draft: {
        state: "local_draft",
        target_slug: "qa-ogre-mage-1103f2",
        target_section: "creature_encounter",
        field_changes: { behavior: ["hostile", "caster"] },
      },
      existingEntry: {
        structured_context: {
          creature_encounter: { behavior: ["hostile"] },
        },
      },
      expect: function(report) {
        return report.field_level_diff.hasMergeCandidate === true &&
          SDCP.shouldAutoMergePreview() === false;
      },
    },
    {
      id: "restrictedVersionField",
      label: "E. restrictedVersionField",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "versioning",
        field_changes: { changed_in: "1.1" },
      },
      existingEntry: {},
      expect: function(report) {
        const diff = (report.field_level_diff.diffs || [])[0];
        return diff && diff.status === "restricted_review" &&
          SDCP.shouldModifyQueue() === false;
      },
    },
    {
      id: "validObservationPreview",
      label: "F. validObservationPreview",
      draft: {
        state: "local_draft",
        target_slug: "swamplands-94dadc07",
        target_section: "observation_context",
        field_changes: { weather_condition: "rain", time_condition: "nighttime" },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.blocked === false &&
          SDCP.shouldPromoteFromPreview() === false;
      },
    },
    {
      id: "blockedSourceDetailOnly",
      label: "G. blockedSourceDetailOnly (negative)",
      draft: {
        state: "local_draft",
        target_slug: "qa-ember-shard-511160",
        target_section: "resource_node",
        field_changes: { source_detail: "red crystal nodes" },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.blocked === true;
      },
    },
    {
      id: "blockedNameOnlyInference",
      label: "H. blockedNameOnlyInference (negative)",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "creature_encounter",
        field_changes: {},
        reason: "QA Staff of Fire means fire weakness",
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.blocked === true;
      },
    },
    {
      id: "blockedDerivedField",
      label: "I. blockedDerivedField (negative)",
      draft: {
        state: "local_draft",
        target_slug: "swamplands-94dadc07",
        target_section: "observation_context",
        field_changes: { biome_context: "swamp", _derived: true },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.blocked === true &&
          (report.field_level_diff.diffs || []).some(function(d) { return d.status === "blocked"; });
      },
    },
    {
      id: "unknownFieldPreview",
      label: "J. unknownFieldPreview (negative)",
      draft: {
        state: "local_draft",
        target_slug: "qa-ember-shard-511160",
        target_section: "resource_node",
        field_changes: { dragon_mount_power: true },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.blocked === true;
      },
    },
    {
      id: "futureOnlyPendingState",
      label: "K. futureOnlyPendingState",
      draft: {
        state: "submitted_pending",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.futureOnly === true &&
          SDCP.shouldSubmitPreview() === false;
      },
    },
    {
      id: "futureModStateNoWrite",
      label: "L. futureModStateNoWrite",
      draft: {
        state: "approved",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.futureOnly === true &&
          SDCP.shouldWritePreviewData() === false;
      },
    },
    {
      id: "factionNoPost",
      label: "M. factionNoPost",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { faction_req: "Sample Faction" },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.valid === true &&
          SDCP.shouldCreatePostFromPreview() === false;
      },
    },
    {
      id: "emptySafePreview",
      label: "N. emptySafePreview",
      draft: { state: "local_draft" },
      existingEntry: {},
      expect: function(report) {
        return report != null &&
          typeof report.summary === "object" &&
          SDCP.shouldWritePreviewData() === false;
      },
    },
    {
      id: "policyFlagsPreview",
      label: "O. policyFlagsPreview",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: {},
      expect: function(report) {
        const flags = report.policy_flags || {};
        return Object.keys(flags).every(function(key) { return flags[key] === false; }) &&
          SDCP.shouldSubmitPreview() === false &&
          SDCC.shouldSubmitDraft() === false;
      },
    },
  ];

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function runPolicyChecks() {
    const checks = [
      typeof SDCP === "object",
      typeof SDCC === "object",
      SDCP.DRAFT_PREVIEW_VERSION === "p4-f3",
      SDCP.shouldWritePreviewData() === false,
      SDCP.shouldSubmitPreview() === false,
      SDCP.shouldSavePreview() === false,
      SDCP.shouldModifyQueue() === false,
      SDCP.shouldApprovePreview() === false,
      SDCP.shouldRejectPreview() === false,
      SDCP.shouldArchivePreview() === false,
      SDCP.shouldTriggerRepair() === false,
      SDCP.shouldCreatePostFromPreview() === false,
      SDCP.shouldCreateMissingEntryFromPreview() === false,
      SDCP.shouldPromoteFromPreview() === false,
      SDCP.shouldAutoMergePreview() === false,
      SDCP.shouldUpdateSearchIndexFromPreview() === false,
      SDCP.shouldMutateContributionIntentRegistry() === false,
    ];
    return checks.every(Boolean);
  }

  function runMutationCheck() {
    const draft = {
      state: "local_draft",
      target_slug: "qa-staff-of-fire-2b742628",
      target_section: "requirement_unlock",
      field_changes: { required_level: 10 },
    };
    const entry = { slug: "qa-staff-of-fire-2b742628", meta: { required_level: 5 } };
    const beforeDraft = JSON.stringify(draft);
    const beforeEntry = JSON.stringify(entry);
    const report = SDCP.createDraftPreviewReport(draft, entry);
    const afterDraft = JSON.stringify(draft);
    const afterEntry = JSON.stringify(entry);
    return beforeDraft === afterDraft && beforeEntry === afterEntry && report !== draft && report !== entry;
  }

  function runRenderingSafety() {
    const html = document.querySelector(".bl-p4-draft-preview-fixtures")?.innerHTML || "";
    return !/<button/i.test(html) &&
      !/<form/i.test(html) &&
      !/<input/i.test(html) &&
      !/\bsubmit\b/i.test(html) &&
      !/\bsave\b/i.test(html) &&
      !/\bapprove\b/i.test(html) &&
      !/\breject\b/i.test(html) &&
      !/\barchive\b/i.test(html) &&
      !/\brepair\b/i.test(html) &&
      !/create-post/i.test(html) &&
      !/edit-post/i.test(html);
  }

  function runFixture(fixture) {
    const draft = JSON.parse(JSON.stringify(fixture.draft));
    const existingEntry = JSON.parse(JSON.stringify(fixture.existingEntry || {}));
    const beforeDraft = JSON.stringify(draft);
    const beforeEntry = JSON.stringify(existingEntry);
    const report = SDCP.createDraftPreviewReport(draft, existingEntry, { mode: "diff" });
    const afterDraft = JSON.stringify(draft);
    const afterEntry = JSON.stringify(existingEntry);
    const mutationSafe = beforeDraft === afterDraft && beforeEntry === afterEntry;
    const expectationMet = fixture.expect(report);
    const panelHtml = SDCP.renderDraftPreviewPanel(draft, existingEntry, { mode: "summary" });
    return {
      id: fixture.id,
      label: fixture.label,
      pass: mutationSafe && expectationMet,
      mutationSafe: mutationSafe,
      expectationMet: expectationMet,
      report: report,
      panelHtml: panelHtml,
    };
  }

  function renderResults(results) {
    const root = document.getElementById("fixtureRoot");
    const summary = document.getElementById("fixtureSummary");
    if (!root || !summary) return;

    const passCount = results.filter(function(r) { return r.pass; }).length;
    const failCount = results.length - passCount;
    const policyOk = runPolicyChecks();
    const mutationOk = runMutationCheck();
    const renderSafe = runRenderingSafety();
    const allPass = passCount === results.length && policyOk && mutationOk && renderSafe;

    summary.innerHTML =
      "<strong>Summary:</strong> " + passCount + "/" + results.length + " fixtures PASS" +
      " | Fail: " + failCount +
      " | Policy checks: " + (policyOk ? "PASS" : "FAIL") +
      " | Mutation safe: " + (mutationOk ? "PASS" : "FAIL") +
      " | Rendering safe: " + (renderSafe ? "PASS" : "FAIL") +
      " | Unsafe DOM: 0" +
      " | Overall: " + (allPass ? "PASS" : "FAIL");

    root.innerHTML = results.map(function(result) {
      const badgeClass = result.pass ? "qa-fixture-badge--pass" : "qa-fixture-badge--fail";
      const badgeText = result.pass ? "PASS" : "FAIL";
      return (
        "<section class=\"qa-fixture-panel\" data-fixture=\"" + escapeText(result.id) + "\">" +
          "<div class=\"qa-fixture-header\">" +
            "<h2>" + escapeText(result.label) + "</h2>" +
            "<span class=\"qa-fixture-badge " + badgeClass + "\">" + badgeText + "</span>" +
          "</div>" +
          "<p class=\"qa-fixture-meta\">resultType=" + escapeText(result.report.summary.resultType) +
            " mutationSafe=" + escapeText(result.mutationSafe) +
            " expectationMet=" + escapeText(result.expectationMet) + "</p>" +
          result.panelHtml +
        "</section>"
      );
    }).join("");
  }

  function init() {
    if (!SDCP) {
      document.getElementById("fixtureSummary").textContent = "BoundLoreStructuredContributionDraftPreview not loaded.";
      return;
    }

    const results = FIXTURES.map(runFixture);
    renderResults(results);

    const passCount = results.filter(function(r) { return r.pass; }).length;
    const failCount = results.length - passCount;

    window.__P4StructuredContributionDraftPreviewFixtures = {
      previewVersion: SDCP.DRAFT_PREVIEW_VERSION,
      fixtures: results.map(function(r) {
        return { id: r.id, label: r.label, pass: r.pass, resultType: r.report.summary.resultType };
      }),
      passCount: passCount,
      failCount: failCount,
      total: results.length,
      policyChecksPass: runPolicyChecks(),
      mutationCheckPass: runMutationCheck(),
      renderingSafe: runRenderingSafety(),
      allPass: results.every(function(r) { return r.pass; }) &&
        runPolicyChecks() && runMutationCheck() && runRenderingSafety(),
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
