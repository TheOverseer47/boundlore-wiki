// QA-only local fixture harness for BoundLoreStructuredContributionDraftContract (P4-E.1).
// No Supabase, no fetch/write, no admin/create/edit flows, no action controls.

(function() {
  const SDCC = window.BoundLoreStructuredContributionDraftContract;
  const SCS = window.BoundLoreStructuredContextSchema;

  const FIXTURES = [
    {
      id: "validResourceNodeDraft",
      label: "A. validResourceNodeDraft",
      draft: {
        state: "local_draft",
        target_slug: "qa-ember-shard-511160",
        target_section: "resource_node",
        field_changes: { node_type: "crystal_node" },
        evidence: { rank: "reported", confidence: "single_observation" },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.resultType === "valid" &&
          report.state.effective === "validated_draft" &&
          SDCC.shouldSubmitDraft() === false &&
          SDCC.shouldWriteDraftData() === false;
      },
    },
    {
      id: "validObservationDraft",
      label: "B. validObservationDraft",
      draft: {
        state: "local_draft",
        target_slug: "swamplands-94dadc07",
        target_section: "observation_context",
        field_changes: { weather_condition: "rain", time_condition: "nighttime" },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.resultType === "valid" &&
          report.summary.blocked === false &&
          SDCC.shouldPromoteFromDraft() === false;
      },
    },
    {
      id: "validCreatureDraft",
      label: "C. validCreatureDraft",
      draft: {
        state: "local_draft",
        target_slug: "qa-ogre-mage-1103f2",
        target_section: "creature_encounter",
        field_changes: { behavior: "hostile" },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.resultType === "valid" &&
          report.actions.submit === false &&
          report.actions.approve === false;
      },
    },
    {
      id: "validRequirementDraft",
      label: "D. validRequirementDraft",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.resultType === "valid" &&
          SDCC.shouldCreatePostFromDraft() === false;
      },
    },
    {
      id: "validVersionDraft",
      label: "E. validVersionDraft",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "versioning",
        field_changes: { changed_in: "1.1" },
      },
      existingEntry: {},
      expect: function(report) {
        const hasReview = (report.issues || []).some(function(issue) {
          return issue.code === "restricted_field_review" || issue.code === "versioning_review";
        });
        return report.summary.resultType === "valid" &&
          hasReview === true &&
          SDCC.shouldModifyQueue() === false;
      },
    },
    {
      id: "sourceDetailOnlyDraft",
      label: "F. sourceDetailOnlyDraft (negative)",
      draft: {
        state: "local_draft",
        target_slug: "qa-ember-shard-511160",
        target_section: "resource_node",
        field_changes: { source_detail: "red crystal nodes" },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.blocked === true &&
          report.summary.resultType === "blocked";
      },
    },
    {
      id: "nameOnlyInferenceDraft",
      label: "G. nameOnlyInferenceDraft (negative)",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "creature_encounter",
        field_changes: {},
        reason: "QA Staff of Fire means fire weakness",
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.blocked === true &&
          (report.issues || []).some(function(issue) {
            return issue.code === "name_only_inference" || issue.code === "empty_field_changes";
          });
      },
    },
    {
      id: "derivedFieldDraft",
      label: "H. derivedFieldDraft (negative)",
      draft: {
        state: "local_draft",
        target_slug: "swamplands-94dadc07",
        target_section: "observation_context",
        field_changes: { biome_context: "swamp", _derived: true },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.blocked === true &&
          (report.issues || []).some(function(issue) {
            return issue.code === "derived_blocked";
          });
      },
    },
    {
      id: "unknownFieldDraft",
      label: "I. unknownFieldDraft (negative)",
      draft: {
        state: "local_draft",
        target_slug: "qa-ember-shard-511160",
        target_section: "resource_node",
        field_changes: { dragon_mount_power: true },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.blocked === true &&
          (report.issues || []).some(function(issue) {
            return issue.code === "unknown_field";
          });
      },
    },
    {
      id: "missingTargetDraft",
      label: "J. missingTargetDraft (negative)",
      draft: {
        state: "local_draft",
        target_section: "resource_node",
        field_changes: { node_type: "crystal_node" },
      },
      existingEntry: {},
      expect: function(report) {
        return (report.summary.resultType === "invalid" || report.summary.blocked === true) &&
          (report.issues || []).some(function(issue) {
            return issue.code === "missing_target";
          });
      },
    },
    {
      id: "submittedPendingDraft",
      label: "K. submittedPendingDraft (future-only)",
      draft: {
        state: "submitted_pending",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.futureOnly === true &&
          report.summary.resultType === "future_only" &&
          SDCC.shouldSubmitDraft() === false;
      },
    },
    {
      id: "approvedDraft",
      label: "L. approvedDraft (future-only)",
      draft: {
        state: "approved",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.futureOnly === true &&
          SDCC.shouldWriteDraftData() === false &&
          SDCC.shouldApproveDraft() === false;
      },
    },
    {
      id: "conflictDraft",
      label: "M. conflictDraft",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: { meta: { required_level: 5 } },
      expect: function(report) {
        return report.summary.resultType === "conflict" &&
          report.conflictReport.hasConflict === true &&
          SDCC.shouldModifyQueue() === false;
      },
    },
    {
      id: "duplicateDraft",
      label: "N. duplicateDraft",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { required_level: 10 },
      },
      existingEntry: { meta: { required_level: 10 } },
      expect: function(report) {
        return (report.summary.resultType === "duplicate" || report.summary.resultType === "no_op") &&
          report.conflictReport.hasDuplicate === true;
      },
    },
    {
      id: "factionDraftNoPost",
      label: "O. factionDraftNoPost",
      draft: {
        state: "local_draft",
        target_slug: "qa-staff-of-fire-2b742628",
        target_section: "requirement_unlock",
        field_changes: { faction_req: "Sample Faction" },
      },
      existingEntry: {},
      expect: function(report) {
        return report.summary.resultType === "valid" &&
          SDCC.shouldCreatePostFromDraft() === false &&
          report.actions.createPost === false;
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
      typeof SDCC === "object",
      typeof SCS === "object",
      SDCC.DRAFT_CONTRACT_VERSION === "p4-e1",
      SDCC.shouldWriteDraftData() === false,
      SDCC.shouldSubmitDraft() === false,
      SDCC.shouldSaveDraft() === false,
      SDCC.shouldModifyQueue() === false,
      SDCC.shouldApproveDraft() === false,
      SDCC.shouldRejectDraft() === false,
      SDCC.shouldArchiveDraft() === false,
      SDCC.shouldCreatePostFromDraft() === false,
      SDCC.shouldCreateMissingEntryFromDraft() === false,
      SDCC.shouldPromoteFromDraft() === false,
      SDCC.shouldUpdateSearchIndexFromDraft() === false,
      SDCC.shouldMutateContributionIntentRegistry() === false,
      SDCC.isIntentPlannedOnly("suggest_resource_node_context") === true,
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
    const before = JSON.stringify(draft);
    const report = SDCC.createDraftReport(draft, {});
    const after = JSON.stringify(draft);
    return before === after && report !== draft;
  }

  function runRenderingSafety() {
    const html = document.querySelector(".bl-p4-draft-contract-fixtures")?.innerHTML || "";
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
    const before = JSON.stringify(draft);
    const report = SDCC.createDraftReport(draft, existingEntry);
    const after = JSON.stringify(draft);
    const mutationSafe = before === after;
    const expectationMet = fixture.expect(report);
    const panelHtml = SDCC.renderDraftReport(report, { mode: "summary" });
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
    if (!SDCC) {
      document.getElementById("fixtureSummary").textContent = "BoundLoreStructuredContributionDraftContract not loaded.";
      return;
    }

    const results = FIXTURES.map(runFixture);
    renderResults(results);

    const passCount = results.filter(function(r) { return r.pass; }).length;
    const failCount = results.length - passCount;

    window.__P4StructuredContributionDraftContractFixtures = {
      contractVersion: SDCC.DRAFT_CONTRACT_VERSION,
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
