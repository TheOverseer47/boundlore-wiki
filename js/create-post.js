// ============================================
// FILE: js/create-post.js
// New create-post logic: Guide vs Discovery post types
// Guides use guide_subcategory, no fixed category
// Discoveries use a fixed category, post_type = 'discovery'
// Fixed wiki categories (post_type = 'wiki') are admin-only, not creatable here
// ============================================

let quillEditor;
let currentPostType = "guide";
const DISCOVERY_STORAGE_BUCKET = "discovery-uploads";
let createCurrentUserId = null;
let createIsAdmin = false;
let currentDiscoveryCategory = "";
let currentWikiCategory = "";
let structuredDiscoveryEnabled = false;
let discoveryFieldState = {};
let discoveryEvidenceState = {
  supports: [],
  note: "",
};
let guideReferenceState = [];
let guideReferenceSuggestions = [];
let guideReferenceCategory = "";
let guideReferenceTimer = null;
let createTutorialConfirmed = false;
let discoveryRelationState = {
  items: [],
  creatures: [],
  locations: [],
  guides: [],
};
let discoverySuggestionState = {
  items: [],
  creatures: [],
  locations: [],
  guides: [],
};
let discoveryWizardStep = 1;
let discoveryDataFieldIndex = 0;
let discoveryRelationsSkipped = false;
const relationInputTimers = {};

function isResourceQuickAddModeCP() {
  return typeof ResourceQuickAdd !== "undefined" && ResourceQuickAdd.isActive();
}

function initResourceQuickAddModeCP() {
  if (typeof ResourceQuickAdd === "undefined") return;
  ResourceQuickAdd.activate();
  discoveryRelationsSkipped = true;
  const discoveryCategorySelect = document.getElementById("discoveryCategory");
  if (discoveryCategorySelect) {
    discoveryCategorySelect.value = "items";
    currentDiscoveryCategory = "items";
    discoveryCategorySelect.disabled = true;
  }
  const modeHint = document.getElementById("discoveryModeHint");
  if (modeHint) {
    modeHint.style.display = "block";
    modeHint.textContent = "Resource Quick-Add — gatherable resources are saved as items with subtype resource.";
  }
  discoveryWizardStep = 1;
  renderDiscoveryStructuredFields();
  renderDiscoveryRelationFields();
  renderDiscoveryWizard();
}
const DISCOVERY_PLACEHOLDER_VALUES = [
  "asdf", "qwerty", "test", "todo", "none", "n/a", "na", "unknown", "idk", "???", "12345"
];
const DISCOVERY_SKIP_VALUES = ["unclear", "no", "not observed", "unknown", "not sure"];

document.addEventListener("DOMContentLoaded", async () => {
  quillEditor = new Quill("#postEditor", {
    theme: "snow",
    modules: {
      toolbar: [
        ["bold", "italic", "underline"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["clean"],
      ],
    },
  });

  document.getElementById("btnTypeGuide").addEventListener("click", () => setPostType("guide"));
  document.getElementById("btnTypeDiscovery").addEventListener("click", () => setPostType("discovery"));
  document.getElementById("btnTypeWiki").addEventListener("click", () => setPostType("wiki"));
  const discoveryCategorySelect = document.getElementById("discoveryCategory");
  const wikiCategorySelect = document.getElementById("wikiCategory");
  if (discoveryCategorySelect) {
    discoveryCategorySelect.addEventListener("change", function() {
      currentDiscoveryCategory = this.value;
      discoveryDataFieldIndex = 0;
      refreshDiscoverySubcategoryOptions();
      renderDiscoveryStructuredFields();
      renderDiscoveryRelationFields();
      renderDiscoveryEvidenceFields();
    });
  }
  if (wikiCategorySelect) {
    wikiCategorySelect.addEventListener("change", function() {
      currentWikiCategory = this.value;
      refreshWikiSubcategoryOptions();
    });
  }

  document.getElementById("createPostForm").addEventListener("submit", handleSubmit);

  await initCreatePermissions();
  await initTutorialGateCP();
  structuredDiscoveryEnabled = typeof isStructuredDiscoveryEnabled === "function"
    ? isStructuredDiscoveryEnabled()
    : false;
  if (typeof ensureCategoryExtensionsLoaded === "function") {
    await ensureCategoryExtensionsLoaded();
  }
  fillDiscoveryCategories();
  fillWikiCategories();
  syncDiscoveryModeHint();
  renderGuideReferenceFields();

  const params = new URLSearchParams(window.location.search);
  const typeParam = (params.get("type") || "").toLowerCase();
  if (typeParam === "discovery") {
    setPostType("discovery");
  } else if (typeParam === "wiki" && createIsAdmin) {
    setPostType("wiki");
  }

  const route = typeof ContributionFlow !== "undefined"
    ? ContributionFlow.parseRouteParams(window.location.search)
    : null;

  if (route && route.mode === "contribution" && route.contributeTo) {
    if (typeof WikiPatchMode !== "undefined") {
      const submitGuard = await WikiPatchMode.assertCanSubmit();
      if (!submitGuard.ok) {
        const errorEl = document.getElementById("formError");
        if (errorEl) {
          errorEl.textContent = submitGuard.message;
          errorEl.style.display = "block";
        }
        return;
      }
    }
    await initContributionModeCP(route);
    return;
  }

  // Legacy URLs with contribute_to but without mode=contribution still must
  // enter contribution mode — never fall through to a normal discovery post.
  if (route && route.contributeTo && !route.mode) {
    route.mode = "contribution";
    await initContributionModeCP(route);
    return;
  }

  const presetCategory = (params.get("category") || params.get("cat") || "").toLowerCase();
  const presetSubcategory = (params.get("subcategory") || params.get("subcat") || "").toLowerCase();

  if (presetCategory && discoveryCategorySelect) {
    discoveryCategorySelect.value = presetCategory;
    currentDiscoveryCategory = presetCategory;
    refreshDiscoverySubcategoryOptions(presetSubcategory);
    renderDiscoveryStructuredFields();
    renderDiscoveryRelationFields();
    renderDiscoveryEvidenceFields();
  }

  if (typeParam === "resource") {
    setPostType("discovery");
    initResourceQuickAddModeCP();
  }
});

async function initCreatePermissions() {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData || !sessionData.session) return;
  createCurrentUserId = sessionData.session.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", createCurrentUserId)
    .single();

  createIsAdmin = !!(profile && profile.role === "admin");
  const wikiBtn = document.getElementById("btnTypeWiki");
  if (wikiBtn) {
    wikiBtn.style.display = createIsAdmin ? "inline-flex" : "none";
  }
}

async function resolveTutorialGateCP(user, isAdmin) {
  if (isAdmin) return { allowed: true };
  if (!user || !user.id) {
    return { allowed: false, message: "You must be logged in to submit." };
  }
  if (typeof TutorialAck === "undefined") {
    return {
      allowed: false,
      message: "Tutorial acknowledgement module is not loaded. Please refresh the page.",
    };
  }
  const ack = await TutorialAck.hasAcknowledgement(supabase, {
    userId: user.id,
    isAdmin: false,
  });
  if (ack.tableMissing) {
    return { allowed: false, tableMissing: true, message: ack.message };
  }
  if (!ack.ok) {
    return {
      allowed: false,
      message: "Could not verify tutorial acknowledgement. Please try again.",
    };
  }
  if (!ack.hasAck) {
    return {
      allowed: false,
      message: "Please read and confirm the submission tutorial once before submitting.",
    };
  }
  return { allowed: true };
}

async function initTutorialGateCP() {
  const gateBox = document.getElementById("tutorialGateBox");
  const gateLink = document.getElementById("tutorialGateLink");
  const submitBtn = document.querySelector("#createPostForm button[type='submit']");
  if (!gateBox || !gateLink) return;

  await supabase.auth.refreshSession();
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData && sessionData.session ? sessionData.session.user : null;
  if (!user) {
    createTutorialConfirmed = false;
    gateBox.style.display = "none";
    return;
  }

  if (createIsAdmin) {
    createTutorialConfirmed = true;
    gateBox.style.display = "none";
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.title = "";
    }
    return;
  }

  const gate = await resolveTutorialGateCP(user, false);
  createTutorialConfirmed = gate.allowed;
  gateLink.href = "/wiki/submit-tutorial/?returnTo=" + encodeURIComponent(window.location.pathname + window.location.search);

  if (gate.tableMissing) {
    gateBox.style.display = "block";
    const hint = gateBox.querySelector(".tutorial-migration-hint");
    if (hint) hint.textContent = gate.message || "Tutorial acknowledgement migration is not applied yet.";
    else {
      const p = document.createElement("p");
      p.className = "tutorial-migration-hint";
      p.style.color = "#e0a83a";
      p.textContent = gate.message || "Tutorial acknowledgement migration is not applied yet.";
      gateBox.appendChild(p);
    }
  } else {
    gateBox.style.display = createTutorialConfirmed ? "none" : "block";
    const hint = gateBox.querySelector(".tutorial-migration-hint");
    if (hint) hint.remove();
  }

  if (submitBtn) {
    submitBtn.disabled = !createTutorialConfirmed;
    submitBtn.title = createTutorialConfirmed
      ? ""
      : "Please read and confirm the tutorial once before submitting.";
  }
}

function fillDiscoveryCategories() {
  const discoverySelect = document.getElementById("discoveryCategory");
  if (!discoverySelect) return;
  discoverySelect.innerHTML = '<option value="">Select a category...</option>';

  const categories = typeof getDiscoveryCategoryOptions === "function"
    ? getDiscoveryCategoryOptions()
    : [];

  categories.forEach(function(cat) {
    const opt = document.createElement("option");
    opt.value = cat.slug;
    opt.textContent = cat.label;
    discoverySelect.appendChild(opt);
  });
}

function fillWikiCategories() {
  const wikiSelect = document.getElementById("wikiCategory");
  const categories = Array.isArray(window.BOUNDLORE_CATEGORIES)
    ? window.BOUNDLORE_CATEGORIES
    : (typeof BOUNDLORE_CATEGORIES !== "undefined" ? BOUNDLORE_CATEGORIES : null);
  if (!wikiSelect || !Array.isArray(categories)) return;

  const allowed = categories.filter(function(cat) {
    return cat.slug !== "guides" && cat.slug !== "guilds" && cat.slug !== "community";
  });

  allowed.forEach(function(cat) {
    const opt = document.createElement("option");
    opt.value = cat.slug;
    opt.textContent = cat.label;
    wikiSelect.appendChild(opt);
  });
}

function syncDiscoveryModeHint() {
  const hint = document.getElementById("discoveryModeHint");
  if (!hint) return;
  hint.style.display = "block";
  hint.textContent = structuredDiscoveryEnabled
    ? "Structured discovery mode is active."
    : "Structured discovery mode is disabled for this session (?enableStructuredDiscovery=0).";
}

function showContributionBannerCP(target, entity, field, intent) {
  const form = document.getElementById("createPostForm");
  if (!form || form.querySelector(".bl-contribution-banner")) return;
  const banner = document.createElement("div");
  banner.className = "bl-contribution-banner";
  const label = entity || target || "this wiki entry";
  const fieldLabel = field ? String(field).replace(/_/g, " ") : "additional details";
  banner.innerHTML = "<p><strong>Contributing to:</strong> " + escapeHtmlCP(label) +
    "</p><p>You are submitting a moderated discovery to improve <em>" + escapeHtmlCP(fieldLabel) +
    "</em>. Your report will be reviewed before it updates the live entry.</p>";
  form.insertBefore(banner, form.firstChild);
}

async function initContributionModeCP(route) {
  if (typeof ContributionFlow === "undefined") return;
  const targetPost = await ContributionFlow.loadTargetPost(supabase, route.contributeTo);
  let meta = {};
  let entityType = route.entityType || "";
  let displayName = route.entityName || route.contributeTo || "Wiki Entry";

  if (targetPost) {
    meta = parsePostMetaCP(targetPost.content || "");
    entityType = entityType || String(targetPost.category || "").toLowerCase();
    displayName = typeof EntityCore !== "undefined"
      ? EntityCore.getDisplayName(meta, targetPost)
      : (route.entityName || targetPost.title);
  } else {
    // Hard requirement: contributions may only ever attach to an existing
    // entry. Without a resolvable target we must not offer the form at all,
    // otherwise a new duplicate entity post could be created.
    const errorEl = document.getElementById("formError");
    if (errorEl) {
      errorEl.textContent = "Could not find the wiki entry you want to contribute to. Please open the entry page and use its Add buttons.";
      errorEl.style.display = "block";
    }
    const form = document.getElementById("createPostForm");
    if (form) form.style.display = "none";
    return;
  }

  const resolvedIntent = ContributionFlow.resolveIntent(route.intent, route.field);
  const knownFacts = targetPost
    ? ContributionFlow.buildKnownFactsSummary(targetPost, meta)
    : [];
  const context = {
    active: true,
    targetId: targetPost ? targetPost.id : null,
    targetSlug: targetPost ? targetPost.slug : (route.contributeTo || null),
    displayName: displayName,
    entityType: entityType || "items",
    intent: route.intent,
    field: route.field,
    resolvedIntent: resolvedIntent,
    relationTarget: route.relationTarget,
    sourcePage: route.sourcePage,
    knownFacts: knownFacts,
  };
  window.__boundloreContributionContext = context;

  setPostType("discovery");
  currentPostType = "discovery";

  const toggle = document.querySelector(".post-type-toggle");
  const standardFields = document.getElementById("standardPostFields");
  const panel = document.getElementById("contributionPanel");
  const heroTitle = document.querySelector(".wiki-hero h1");
  const heroCopy = document.querySelector(".wiki-hero p");
  const submitBtn = document.querySelector("#createPostForm button[type='submit']");

  if (toggle) toggle.style.display = "none";
  if (standardFields) standardFields.style.display = "none";
  if (panel) {
    panel.style.display = "block";
    panel.innerHTML = ContributionFlow.renderPanel(context);
  }
  if (heroTitle) heroTitle.textContent = "Contribute to Wiki Entry";
  if (heroCopy) heroCopy.textContent = "Add focused information to an existing entry. Your submission goes to admin review.";
  if (submitBtn) submitBtn.textContent = "Submit Contribution";

  const discoverySelect = document.getElementById("discoveryCategory");
  if (discoverySelect) discoverySelect.value = entityType;
  currentDiscoveryCategory = entityType;

  const titleInput = document.getElementById("postTitle");
  if (titleInput) {
    titleInput.value = ContributionFlow.buildContributionTitle(context);
    titleInput.removeAttribute("required");
  }
}

async function submitContributionCP(errorEl) {
  const context = window.__boundloreContributionContext;
  if (!context || !context.active || typeof ContributionFlow === "undefined") return false;

  const mask = ContributionFlow.getMask(context.resolvedIntent, context.field, context.entityType);
  const collected = ContributionFlow.collectFormValues(mask);
  if (collected.errors.length) {
    errorEl.textContent = collected.errors.join(" ");
    errorEl.style.display = "block";
    return true;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    errorEl.textContent = "You must be logged in to submit a contribution.";
    errorEl.style.display = "block";
    return true;
  }

  await supabase.auth.refreshSession();
  const { data: refreshedSession } = await supabase.auth.getSession();
  const refreshedUser = refreshedSession && refreshedSession.session ? refreshedSession.session.user : null;
  const tutorialGate = await resolveTutorialGateCP(refreshedUser, createIsAdmin);
  createTutorialConfirmed = tutorialGate.allowed;
  if (!tutorialGate.allowed) {
    errorEl.textContent = tutorialGate.message || "Please read and confirm the submission tutorial once before submitting.";
    errorEl.style.display = "block";
    return true;
  }

  const userId = sessionData.session.user.id;

  // Contributions must reference an existing target post. Re-verify it still
  // exists right before saving so we never create an orphaned duplicate.
  if (!context.targetId) {
    errorEl.textContent = "This contribution has no valid target entry. Please reopen it from the entry page.";
    errorEl.style.display = "block";
    return true;
  }
  const { data: targetCheck } = await supabase
    .from("posts")
    .select("id, slug, deleted_at")
    .eq("id", context.targetId)
    .maybeSingle();
  if (!targetCheck || targetCheck.deleted_at) {
    errorEl.textContent = "The target wiki entry no longer exists. Contribution was not saved.";
    errorEl.style.display = "block";
    return true;
  }

  // Same target + same intent already pending from this user → no duplicate.
  if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.findPendingContributionDuplicate) {
    const duplicate = await KnowledgeRelations.findPendingContributionDuplicate(supabase, {
      authorId: userId,
      targetPostId: context.targetId,
      targetPostSlug: context.targetSlug,
      intent: context.resolvedIntent,
    });
    if (duplicate) {
      errorEl.textContent = "You already have a pending contribution of this type for this entry. Please wait for the review instead of submitting again.";
      errorEl.style.display = "block";
      return true;
    }
  }

  const relations = ContributionFlow.buildRelations(context.resolvedIntent, collected.values, context);
  const contributionMeta = ContributionFlow.buildContributionMeta(context, collected.values, relations);
  const title = ContributionFlow.buildContributionTitle(context);
  let content = ContributionFlow.buildContributionContent(context, collected.values);

  const mediaInput = document.getElementById("contribMedia");
  const files = mediaInput && mediaInput.files ? Array.from(mediaInput.files) : [];
  const imageUrl = collected.values.image_url || "";
  if (imageUrl && typeof isValidHttpUrl === "function" && !isValidHttpUrl(imageUrl)) {
    errorEl.textContent = "Please provide a valid image URL (http/https).";
    errorEl.style.display = "block";
    return true;
  }

  if (files.length > 0) {
    const uploadValidationError = validateDiscoveryFilesCP(files, context.entityType);
    if (uploadValidationError) {
      errorEl.textContent = uploadValidationError;
      errorEl.style.display = "block";
      return true;
    }
    const uploadResult = await uploadDiscoveryFiles(userId, files, {
      category: context.entityType,
      title: title,
      meta: contributionMeta,
    });
    if (uploadResult.error) {
      errorEl.textContent = uploadResult.error;
      errorEl.style.display = "block";
      return true;
    }
    const fileEvidence = buildDiscoveryEvidenceMetaCP({
      supports: [context.field || context.resolvedIntent].filter(Boolean),
      note: collected.values.evidence_notes || "",
      hasExternalEvidence: true,
    }, uploadResult.files, imageUrl, "");
    contributionMeta.discovery_evidence = (contributionMeta.discovery_evidence || []).concat(fileEvidence);
    content = buildPostContentWithAttachments(content, uploadResult.files, true);
  } else {
    contributionMeta.discovery_evidence = buildDiscoveryEvidenceMetaCP({
      supports: [context.field || context.resolvedIntent].filter(Boolean),
      note: collected.values.evidence_notes || "",
      hasExternalEvidence: !!imageUrl,
    }, [], imageUrl, "");
  }

  const payload = {
    author_id: userId,
    title: title,
    content: content,
    status: "pending",
    post_type: "discovery",
    category: context.entityType,
    guide_subcategory: null,
    is_discovery: true,
  };

  // Contributions must never create new entity posts or write to other
  // entries before approval. We only resolve relation targets against
  // existing posts; the actual relation merge happens at admin approval.
  if (relations.length && context.resolvedIntent !== "add_image") {
    await resolveContributionRelationTargetsCP(relations);
    contributionMeta.discovery_relations = relations;
  }

  if (typeof EntityCore !== "undefined" && EntityCore.normalizeEntityClassification) {
    contributionMeta = EntityCore.normalizeEntityClassification(contributionMeta, {
      title: title,
      category: context.entityType,
    });
    if (!contributionMeta.entity_domain) contributionMeta.entity_domain = "META";
    if (!contributionMeta.entity_subtype) contributionMeta.entity_subtype = "contribution";
  }

  payload.content = injectPostMetaCP(payload.content, contributionMeta);

  const { data: created, error } = await supabase
    .from("posts")
    .insert(payload)
    .select("id, slug")
    .single();

  if (error) {
    errorEl.textContent = error.message || "Failed to submit contribution.";
    errorEl.style.display = "block";
    return true;
  }

  // All contributions stay pending until admin "Approve & Merge".
  // Optional debug-only auto-merge: ?admin_auto_merge=1 (never default).
  const autoMergeParam = new URLSearchParams(window.location.search).get("admin_auto_merge");
  const allowAdminAutoMerge = createIsAdmin && autoMergeParam === "1";
  if (allowAdminAutoMerge && created && typeof KnowledgeRelations !== "undefined"
    && KnowledgeRelations.mergeContributionIntoTarget) {
    try {
      const contributionPost = {
        id: created.id,
        slug: created.slug,
        author_id: userId,
        content: payload.content,
        created_at: new Date().toISOString(),
        category: payload.category,
        title: payload.title,
      };
      const mergeResult = await KnowledgeRelations.mergeContributionIntoTarget(supabase, contributionPost, {
        meta: contributionMeta,
        actorId: userId,
      });
      if (mergeResult.ok) {
        contributionMeta.contribution.status = "approved";
        contributionMeta.contribution.merged_at = new Date().toISOString();
        contributionMeta.contribution.auto_merged_by_admin = true;
        const approvedContent = injectPostMetaCP(content, contributionMeta);
        await supabase.from("posts").update({
          content: approvedContent,
          deleted_at: new Date().toISOString(),
        }).eq("id", created.id);
        window.location.href = mergeResult.target && mergeResult.target.slug
          ? "/wiki/post/?slug=" + encodeURIComponent(mergeResult.target.slug) + "&merged=contribution"
          : "/wiki/account/";
        return true;
      }
    } catch (mergeErr) {
      console.warn("Admin auto-merge failed, contribution stays pending:", mergeErr);
    }
  }

  window.location.href = context.targetSlug
    ? "/wiki/post/?slug=" + encodeURIComponent(context.targetSlug) + "&submitted=contribution"
    : "/wiki/account/";
  return true;
}

function renderDiscoveryWizard() {
  const nav = document.getElementById("discoveryWizardNav");
  const step1 = document.getElementById("discoveryStep1Basics");
  const step2 = document.getElementById("discoveryStep2Data");
  const step3 = document.getElementById("discoveryStep3Relations");
  const step4 = document.getElementById("discoveryStep4Evidence");
  if (!nav || !step1 || !step2 || !step3 || !step4) return;

  const resourceMode = isResourceQuickAddModeCP();
  const maxStep = resourceMode ? 3 : (structuredDiscoveryEnabled ? 4 : 2);
  if (discoveryWizardStep < 1) discoveryWizardStep = 1;
  if (discoveryWizardStep > maxStep) discoveryWizardStep = maxStep;

  step1.style.display = discoveryWizardStep === 1 ? "block" : "none";
  if (resourceMode) {
    step2.style.display = discoveryWizardStep === 2 ? "block" : "none";
    step3.style.display = "none";
    step4.style.display = discoveryWizardStep === 3 ? "block" : "none";
  } else {
    step2.style.display = structuredDiscoveryEnabled && discoveryWizardStep === 2 ? "block" : "none";
    step3.style.display = structuredDiscoveryEnabled && discoveryWizardStep === 3 ? "block" : "none";
    step4.style.display = discoveryWizardStep === maxStep ? "block" : "none";
  }

  nav.innerHTML = "";
  const stepLabels = resourceMode
    ? ["Basics", "Resource", "Evidence"]
    : (structuredDiscoveryEnabled
      ? ["Basics", "Facts", "Links", "Evidence"]
      : ["Basics", "Notes"]);
  const progress = document.createElement("p");
  progress.className = "field-hint";
  progress.textContent = "Step " + discoveryWizardStep + " of " + maxStep + ": " + stepLabels[discoveryWizardStep - 1] + ".";
  nav.appendChild(progress);

  const controls = document.createElement("div");
  controls.style.display = "flex";
  controls.style.gap = "8px";

  if (discoveryWizardStep > 1) {
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn-secondary";
    prev.textContent = "Back";
    prev.addEventListener("click", function() {
      discoveryWizardStep -= 1;
      renderDiscoveryWizard();
    });
    controls.appendChild(prev);
  }

  if (discoveryWizardStep < maxStep) {
    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn-contribute";
    next.textContent = "Continue";
    next.addEventListener("click", function() {
      if (discoveryWizardStep === 1) {
        const cat = document.getElementById("discoveryCategory")?.value || "";
        const subcat = document.getElementById("discoverySubcategory")?.value || "";
        const needSub = typeof requiresSubcategoryForCategory === "function" ? requiresSubcategoryForCategory(cat) : false;
        if (!cat) {
          showDiscoveryWizardError("Please choose a discovery category before continuing.");
          return;
        }
        if (needSub && !subcat) {
          showDiscoveryWizardError("Please choose a required subcategory before continuing.");
          return;
        }
      }
      if (discoveryWizardStep === 2 && !hasRequiredDiscoveryFieldsFilledCP()) {
        showDiscoveryWizardError("Please complete required discovery data fields (or use skip options) before continuing.");
        return;
      }
      showDiscoveryWizardError("");
      discoveryWizardStep += 1;
      renderDiscoveryWizard();
    });
    controls.appendChild(next);
  } else {
    const done = document.createElement("span");
    done.className = "field-hint";
    done.textContent = "Final step. Review and submit when ready.";
    controls.appendChild(done);
  }

  nav.appendChild(controls);
}

function showDiscoveryWizardError(message) {
  const err = document.getElementById("formError");
  if (!err) return;
  err.textContent = message || "";
  err.style.display = message ? "block" : "none";
}

function hasRequiredDiscoveryFieldsFilledCP() {
  if (isResourceQuickAddModeCP() && typeof ResourceQuickAdd !== "undefined") {
    const collected = ResourceQuickAdd.collectPayload();
    return !collected.error;
  }
  const category = document.getElementById("discoveryCategory")?.value || currentDiscoveryCategory || "";
  const config = getDiscoveryConfig(category);
  const fields = Array.isArray(config.fields) ? config.fields : [];
  return fields.filter(function(field) { return !!field.required; }).every(function(field) {
    const value = String(discoveryFieldState[field.key] == null ? "" : discoveryFieldState[field.key]).trim();
    return value.length > 0;
  });
}

function setPostType(type) {
  currentPostType = type === "wiki" ? "wiki" : (type === "discovery" ? "discovery" : "guide");
  document.getElementById("btnTypeGuide").classList.toggle("active", type === "guide");
  document.getElementById("btnTypeDiscovery").classList.toggle("active", type === "discovery");
  document.getElementById("btnTypeWiki").classList.toggle("active", type === "wiki");

  const guideFields = document.getElementById("guideFields");
  const discoveryFields = document.getElementById("discoveryFields");
  const wikiFields = document.getElementById("wikiFields");
  const guideSelect = document.getElementById("guideSubcategory");
  const discoverySelect = document.getElementById("discoveryCategory");
  const discoverySubWrap = document.getElementById("discoverySubcategoryWrap");
  const wikiSubWrap = document.getElementById("wikiSubcategoryWrap");
  const wikiSubcategory = document.getElementById("wikiSubcategory");
  const wikiCategory = document.getElementById("wikiCategory");
  const contentWrap = document.getElementById("contentEditorWrap");
  const contentLabel = document.getElementById("postContentLabel");
  const structuredWrap = document.getElementById("discoveryStructuredFields");
  const relationWrap = document.getElementById("discoveryRelationFields");
  const guideReferenceWrap = document.getElementById("guideReferenceFields");
  const titleInput = document.getElementById("postTitle");
  const titleLabel = document.querySelector("label[for='postTitle']");

  if (type === "guide") {
    guideFields.style.display = "block";
    discoveryFields.style.display = "none";
    wikiFields.style.display = "none";
    guideSelect.setAttribute("required", "required");
    discoverySelect.removeAttribute("required");
    wikiCategory.removeAttribute("required");
    discoverySelect.value = "";
    wikiCategory.value = "";
    if (wikiSubcategory) wikiSubcategory.value = "";
    currentDiscoveryCategory = "";
    currentWikiCategory = "";
    if (discoverySubWrap) discoverySubWrap.style.display = "none";
    if (wikiSubWrap) wikiSubWrap.style.display = "none";
    if (contentWrap) contentWrap.style.display = "block";
    if (contentLabel) contentLabel.textContent = "Content";
    if (guideReferenceWrap) guideReferenceWrap.style.display = "block";
    if (titleInput) {
      titleInput.setAttribute("required", "required");
      titleInput.placeholder = "";
    }
    if (titleLabel) titleLabel.textContent = "Title";
    renderGuideReferenceFields();
  } else if (type === "discovery") {
    guideFields.style.display = "none";
    discoveryFields.style.display = "block";
    wikiFields.style.display = "none";
    guideSelect.removeAttribute("required");
    discoverySelect.setAttribute("required", "required");
    wikiCategory.removeAttribute("required");
    guideSelect.value = "";
    wikiCategory.value = "";
    if (wikiSubcategory) wikiSubcategory.value = "";
    currentDiscoveryCategory = discoverySelect.value || currentDiscoveryCategory || "";
    currentWikiCategory = "";
    refreshDiscoverySubcategoryOptions();
    renderDiscoveryStructuredFields();
    renderDiscoveryRelationFields();
    renderDiscoveryEvidenceFields();
    if (wikiSubWrap) wikiSubWrap.style.display = "none";
    if (structuredWrap) structuredWrap.style.display = structuredDiscoveryEnabled ? "block" : "none";
    if (relationWrap) relationWrap.style.display = structuredDiscoveryEnabled ? "block" : "none";
    if (contentWrap) contentWrap.style.display = structuredDiscoveryEnabled ? "none" : "block";
    if (contentLabel) contentLabel.textContent = structuredDiscoveryEnabled ? "Content" : "Discovery Notes";
    if (guideReferenceWrap) guideReferenceWrap.style.display = "none";
    if (titleInput) {
      titleInput.removeAttribute("required");
      titleInput.placeholder = "Optional. Will be generated from discovery data if left empty.";
    }
    if (titleLabel) titleLabel.textContent = "Report Title (optional)";
    discoveryWizardStep = 1;
    discoveryDataFieldIndex = 0;
    renderDiscoveryWizard();
  } else {
    guideFields.style.display = "none";
    discoveryFields.style.display = "none";
    wikiFields.style.display = "block";
    guideSelect.removeAttribute("required");
    discoverySelect.removeAttribute("required");
    wikiCategory.setAttribute("required", "required");
    guideSelect.value = "";
    discoverySelect.value = "";
    currentWikiCategory = wikiCategory.value || currentWikiCategory || "";
    if (discoverySubWrap) discoverySubWrap.style.display = "none";
    refreshWikiSubcategoryOptions();
    if (contentWrap) contentWrap.style.display = "block";
    if (contentLabel) contentLabel.textContent = "Content";
    if (structuredWrap) structuredWrap.style.display = "none";
    if (relationWrap) relationWrap.style.display = "none";
    if (guideReferenceWrap) guideReferenceWrap.style.display = "none";
    if (titleInput) {
      titleInput.setAttribute("required", "required");
      titleInput.placeholder = "";
    }
    if (titleLabel) titleLabel.textContent = "Title";
  }
}

function mapRelationGroupToPlaceholderCategoryCP(groupKey, relation) {
  if (groupKey === "items") return "items";
  if (groupKey === "creatures") return "creatures";
  if (groupKey === "locations") {
    const targetType = String(relation && relation.target_entity_type || "").toLowerCase();
    return targetType === "biome" ? "biomes" : "locations";
  }
  return "";
}

function buildKnowledgeSourceContextCP(payload, title, category) {
  return {
    payload: payload || {},
    sourceTitle: getMeaningfulDiscoveryValueCP((payload && payload.entity_name) || title),
    sourceCategory: category || "",
    sourcePostId: null,
    sourcePostSlug: null,
    sourceDate: new Date().toISOString(),
  };
}

async function updateKnowledgeStubSourcesCP(createdPost, relations) {
  if (!createdPost || !createdPost.id) return;
  const rels = Array.isArray(relations) ? relations : [];
  for (const rel of rels) {
    if (!rel || !rel.id) continue;
    const { data: targetPost } = await supabase.from("posts").select("id, content").eq("id", rel.id).maybeSingle();
    if (!targetPost) continue;
    const meta = parsePostMetaCP(targetPost.content || "");
    let changed = false;

    if (meta.knowledge_entry) {
      meta.knowledge_entry.source_post_id = createdPost.id;
      meta.knowledge_entry.source_post_slug = createdPost.slug || null;
      meta.knowledge_entry.source_post_title = createdPost.title || meta.knowledge_entry.source_post_title || null;
      changed = true;
    }

    if (meta.knowledge_graph && Array.isArray(meta.knowledge_graph.relations)) {
      meta.knowledge_graph.relations = meta.knowledge_graph.relations.map(function(item) {
        return Object.assign({}, item, {
          source_post_id: createdPost.id,
          source_post_slug: createdPost.slug || null,
          source_post_title: createdPost.title || item.source_post_title || null,
        });
      });
      changed = true;
    }

    if (!changed) continue;
    const updated = injectPostMetaCP(stripPostMetaCP(targetPost.content || ""), meta);
    await supabase.from("posts").update({ content: updated }).eq("id", rel.id);
  }
}

// Read-only variant for contributions: enrich relations with canonical
// names/keys and link existing posts, but never create stubs or inverse
// relations before the contribution is approved.
async function resolveContributionRelationTargetsCP(relations) {
  const KR = window.KnowledgeRelations;
  const EC = window.EntityCore;
  const items = Array.isArray(relations) ? relations : [];
  for (const rel of items) {
    if (!rel || !rel.title) continue;
    const groupKey = String(rel.group || "").toLowerCase();
    const category = KR ? KR.mapGroupToCategory(groupKey, rel) : (rel.category || groupKey);
    if (category && !rel.category) rel.category = category;
    const canonicalTitle = EC
      ? (EC.extractCanonicalIdentity(String(rel.title).trim(), category).canonical_name || String(rel.title).trim())
      : String(rel.title).trim();
    if (EC) {
      rel.canonical_target_name = canonicalTitle;
      rel.target_entity_key = EC.buildEntityKey(category, canonicalTitle);
    }
    if (KR && typeof KR.findExistingKnowledgePost === "function") {
      const existing = await KR.findExistingKnowledgePost(supabase, canonicalTitle, category);
      if (existing) {
        rel.id = existing.id;
        rel.slug = existing.slug || null;
        rel.category = existing.category || category;
        rel.post_type = existing.post_type || "wiki";
        rel.resolved = true;
      }
    }
  }
}

async function ensureKnowledgeRelationTargetsCP(relations, userId, sourceContext) {
  const KR = window.KnowledgeRelations;
  const items = Array.isArray(relations) ? relations : [];
  const seen = new Set();
  const ctx = sourceContext || {};

  for (const rel of items) {
    if (!rel || !rel.title) continue;
    if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.shouldCreateKnowledgeStub
      && !KnowledgeRelations.shouldCreateKnowledgeStub(rel)) {
      continue;
    }
    const groupKey = String(rel.group || "").toLowerCase();
    const category = KR
      ? KR.mapGroupToCategory(groupKey, rel)
      : mapRelationGroupToPlaceholderCategoryCP(groupKey, rel);
    if (!category) continue;

    const normalizedTitle = String(rel.title).trim();
    const EC = window.EntityCore;
    const canonicalTitle = EC
      ? (EC.extractCanonicalIdentity(normalizedTitle, category).canonical_name || normalizedTitle)
      : normalizedTitle;
    const entityKey = EC ? EC.buildEntityKey(category, canonicalTitle) : null;
    const dedupeKey = entityKey || (category + "|" + canonicalTitle.toLowerCase());
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    if (!rel.category) rel.category = category;
    if (EC) {
      rel.canonical_target_name = canonicalTitle;
      rel.target_entity_key = entityKey;
    }
    if (!rel.target_entity_type && KR) {
      rel.target_entity_type = KR.inferTargetEntityType(groupKey, rel.relation_type);
    }

    let existing = null;
    if (KR && typeof KR.findExistingKnowledgePost === "function") {
      existing = await KR.findExistingKnowledgePost(supabase, canonicalTitle, category);
    } else {
      const { data: fallbackExisting } = await supabase
        .from("posts")
        .select("id, slug, title, category, post_type, content")
        .ilike("title", normalizedTitle)
        .eq("category", category)
        .limit(1)
        .maybeSingle();
      existing = fallbackExisting || null;
    }

    if (existing) {
      rel.id = existing.id;
      rel.slug = existing.slug || null;
      rel.category = existing.category || category;
      rel.post_type = existing.post_type || "wiki";
      rel.resolved = true;
      if (KR) {
        const inverse = KR.createInverseRelation(rel, {
          id: ctx.sourcePostId,
          slug: ctx.sourcePostSlug,
          title: ctx.sourceTitle,
          category: ctx.sourceCategory,
          post_type: "discovery",
        });
        if (inverse) await KR.appendInboundRelationToPost(supabase, existing.id, inverse);
      }
      continue;
    }

    if (rel.slug || rel.id) continue;

    const stubMeta = KR ? KR.buildStubPostMeta(rel, ctx) : null;
    const bodyHtml = KR
      ? KR.buildStubPostContent(canonicalTitle, rel, ctx)
      : ("<p>Knowledge node: " + escapeHtmlCP(canonicalTitle) + "</p>");
    const content = stubMeta ? injectPostMetaCP(bodyHtml, stubMeta) : bodyHtml;

    const placeholderPayload = {
      author_id: userId,
      title: canonicalTitle,
      content: content,
      status: "pending",
      post_type: "wiki",
      category: category,
      guide_subcategory: null,
      is_discovery: false,
    };

    const { data: created, error } = await supabase
      .from("posts")
      .insert(placeholderPayload)
      .select("id, slug, title, category, post_type")
      .single();

    if (error) {
      console.warn("Failed to create related knowledge entry:", error);
      continue;
    }

    rel.id = created.id;
    rel.slug = created.slug || null;
    rel.category = created.category || category;
    rel.post_type = created.post_type || "wiki";
    rel.resolved = true;
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("formError");
  errorEl.style.display = "none";
  const submitBtn = document.querySelector("#createPostForm button[type='submit']");

  if (typeof WikiPatchMode !== "undefined") {
    const submitGuard = await WikiPatchMode.assertCanSubmit();
    if (!submitGuard.ok) {
      errorEl.textContent = submitGuard.message;
      errorEl.style.display = "block";
      return;
    }
  } else if (window.__boundlorePatchMode && window.__boundlorePatchMode.blocked) {
    errorEl.textContent = "The wiki is currently being updated. Submissions are temporarily disabled.";
    errorEl.style.display = "block";
    return;
  }

  if (window.__boundloreContributionContext && window.__boundloreContributionContext.active) {
    const handled = await submitContributionCP(errorEl);
    if (handled) return;
  }

  // Hard block: URLs with contribute_to must never create a standalone entity.
  const routeGuard = typeof ContributionFlow !== "undefined"
    ? ContributionFlow.parseRouteParams(window.location.search)
    : null;
  if (routeGuard && routeGuard.contributeTo) {
    errorEl.textContent = "Contribution mode failed to initialize. Please reopen the link from the wiki entry page.";
    errorEl.style.display = "block";
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    errorEl.textContent = "You must be logged in to submit a post.";
    errorEl.style.display = "block";
    return;
  }

  await supabase.auth.refreshSession();
  const { data: refreshedSession } = await supabase.auth.getSession();
  const refreshedUser = refreshedSession && refreshedSession.session ? refreshedSession.session.user : null;
  const tutorialGate = await resolveTutorialGateCP(refreshedUser, createIsAdmin);
  createTutorialConfirmed = tutorialGate.allowed;
  if (!tutorialGate.allowed) {
    errorEl.textContent = tutorialGate.message || "Please read and confirm the submission tutorial once before submitting posts.";
    errorEl.style.display = "block";
    return;
  }
  const userId = sessionData.session.user.id;

  const title = document.getElementById("postTitle").value.trim();
  const content = quillEditor.root.innerHTML.trim();
  let postMeta = collectPostMetaCP();
  const mediaInput = document.getElementById("postMedia");
  const files = mediaInput && mediaInput.files ? Array.from(mediaInput.files) : [];

  if (!title && currentPostType !== "discovery") {
    errorEl.textContent = "Please enter a title.";
    errorEl.style.display = "block";
    return;
  }
  if (currentPostType !== "discovery" && (!content || content === "<p><br></p>")) {
    errorEl.textContent = "Please write some content.";
    errorEl.style.display = "block";
    return;
  }

  if (postMeta && postMeta._error) {
    errorEl.textContent = postMeta._error;
    errorEl.style.display = "block";
    return;
  }

  let payload = {
    author_id: userId,
    title: title,
    content: content,
    status: "pending",
  };

  if (currentPostType === "guide") {
    const subcat = document.getElementById("guideSubcategory").value;
    if (!subcat) {
      errorEl.textContent = "Please select a guide category.";
      errorEl.style.display = "block";
      return;
    }
    const guideReferenceError = validateGuideReferencesCP();
    if (guideReferenceError) {
      errorEl.textContent = guideReferenceError;
      errorEl.style.display = "block";
      return;
    }
    payload.post_type = "guide";
    payload.category = null;
    payload.guide_subcategory = subcat;
    payload.is_discovery = false;
    if (guideReferenceState.length) {
      postMeta.guide_references = guideReferenceState.map(function(item) {
        return {
          id: item.id || null,
          slug: item.slug || null,
          title: item.title || "",
          category: item.category || null,
          post_type: item.post_type || null,
        };
      });
    }
  } else if (currentPostType === "discovery") {
    const cat = document.getElementById("discoveryCategory").value;
    const discoverySubcat = document.getElementById("discoverySubcategory")?.value || "";
    const discoveryImageUrl = (document.getElementById("discoveryImageUrl").value || "").trim();
    const discoveryYoutubeUrl = (document.getElementById("discoveryYoutubeUrl").value || "").trim();
    const needsSubcategory = typeof requiresSubcategoryForCategory === "function"
      ? requiresSubcategoryForCategory(cat)
      : false;
    if (!cat) {
      errorEl.textContent = "Please select a category for your discovery.";
      errorEl.style.display = "block";
      return;
    }
    if (needsSubcategory && !discoverySubcat) {
      errorEl.textContent = "Please select a subcategory for this category.";
      errorEl.style.display = "block";
      return;
    }
    if (discoveryYoutubeUrl && !isValidYoutubeUrl(discoveryYoutubeUrl)) {
      errorEl.textContent = "Please provide a valid YouTube URL (youtube.com or youtu.be).";
      errorEl.style.display = "block";
      return;
    }
    if (discoveryImageUrl && !isValidHttpUrl(discoveryImageUrl)) {
      errorEl.textContent = "Please provide a valid image URL (http/https).";
      errorEl.style.display = "block";
      return;
    }

    payload.post_type = "discovery";
    payload.category = cat;
    payload.guide_subcategory = null;
    payload.is_discovery = true;
    if (structuredDiscoveryEnabled) {
      if (isResourceQuickAddModeCP() && typeof ResourceQuickAdd !== "undefined") {
        const synonym = await ResourceQuickAdd.checkSynonymBeforeSubmit(supabase);
        if (!synonym.ok) {
          errorEl.textContent = synonym.message;
          errorEl.style.display = "block";
          discoveryWizardStep = 2;
          renderDiscoveryWizard();
          return;
        }
      }

      const structuredResult = collectStructuredDiscoveryInput();
      if (structuredResult.error) {
        errorEl.textContent = structuredResult.error;
        errorEl.style.display = "block";
        return;
      }

      const v2ActiveRelations = typeof DiscoveryWizard !== "undefined" && DiscoveryWizard.isActive();
      const relPayload = structuredResult.payload || {};
      const hasLootHint = !!(relPayload.dropped_items || relPayload.dropped_by || relPayload.resources_or_rewards);
      const hasRelProof = files.length > 0 || hasLootHint;
      const relCount = Array.isArray(structuredResult.relations) ? structuredResult.relations.length : 0;

      const resourceMode = isResourceQuickAddModeCP();
      if (!resourceMode && relCount === 0 && discoveryRelationsSkipped !== true) {
        if (!v2ActiveRelations) {
          errorEl.textContent = "Please link at least one dependency/reference or enable 'Skip auto-relations' before submitting.";
          errorEl.style.display = "block";
          return;
        }
        if (!hasRelProof) {
          errorEl.textContent = "Add a screenshot, loot/item name, or link a related entry.";
          errorEl.style.display = "block";
          return;
        }
      }

      const dedupeTitle = title
        || String(structuredResult.payload && structuredResult.payload.entity_name ? structuredResult.payload.entity_name : "").trim()
        || buildDiscoveryAutoTitle(structuredResult.payload, cat);

      const knowledgeGraphSubmitActive = typeof DiscoveryWizard !== "undefined" && DiscoveryWizard.isActive();
      if (!knowledgeGraphSubmitActive && !window.__boundloreContributionContext && !isResourceQuickAddModeCP()) {
        const duplicateError = await detectDiscoveryDuplicateCP({
          title: dedupeTitle,
          category: cat,
          subcategory: needsSubcategory ? discoverySubcat : "",
          payload: structuredResult.payload,
        });
        if (duplicateError) {
          errorEl.textContent = duplicateError;
          errorEl.style.display = "block";
          return;
        }
      }

      postMeta.discovery_payload = structuredResult.payload;
      postMeta.discovery_relations = (structuredResult.relations || []).map(function(rel) {
        return typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.sanitizeRelationForMeta
          ? KnowledgeRelations.sanitizeRelationForMeta(rel)
          : rel;
      });
      postMeta.discovery_relations_skipped = discoveryRelationsSkipped === true;
      postMeta.discovery_record_id = postMeta.discovery_record_id || generateDiscoveryRecordIdCP();
      postMeta.discovery_record_status = "unverified";
      postMeta.discovery_submitted_at = new Date().toISOString();
      // Persist canonical entity identity so pages never depend on
      // re-deriving it from rendered HTML later.
      if (typeof EntityCore !== "undefined") {
        const entityTitle = dedupeTitle || title;
        const pseudoPost = { title: entityTitle, category: cat };
        postMeta.entity_profile = EntityCore.buildEntityProfile(pseudoPost, postMeta);
        if (postMeta.entity_profile && postMeta.entity_profile.taxonomy) {
          postMeta.entity_taxonomy = postMeta.entity_profile.taxonomy;
        }
      }
      if (typeof DiscoveryCore !== "undefined" && DiscoveryCore.isKnowledgeGraphDiscoveryEnabled()) {
        postMeta.discovery_form = "lean";
      }
      if (typeof BoundLoreTestData !== "undefined" && BoundLoreTestData.shouldMarkAsTestData()) {
        postMeta.content_origin = BoundLoreTestData.ORIGIN_TEST;
      }
      if (typeof EntityCore !== "undefined" && EntityCore.normalizeEntityClassification) {
        postMeta = EntityCore.normalizeEntityClassification(postMeta, { title: dedupeTitle || title, category: cat });
      }
      if (isResourceQuickAddModeCP() && typeof ResourceQuickAdd !== "undefined") {
        postMeta = ResourceQuickAdd.applyMetaDefaults(postMeta);
      }
      if (window.__boundloreContributionContext) {
        postMeta.contribution_target = window.__boundloreContributionContext.target || null;
        postMeta.contribution_field = window.__boundloreContributionContext.field || null;
        postMeta.contribution_intent = window.__boundloreContributionContext.intent || null;
      }
      const evidenceInput = collectDiscoveryEvidenceInputCP({
        hasExternalEvidence: !!discoveryImageUrl || !!discoveryYoutubeUrl || files.length > 0,
      });
      if (evidenceInput.error) {
        errorEl.textContent = evidenceInput.error;
        errorEl.style.display = "block";
        return;
      }
      postMeta.discovery_evidence = buildDiscoveryEvidenceMetaCP(evidenceInput, [], discoveryImageUrl, discoveryYoutubeUrl);
      const knowledgeSourceContext = buildKnowledgeSourceContextCP(
        structuredResult.payload,
        title,
        cat
      );
      await ensureKnowledgeRelationTargetsCP(structuredResult.relations, userId, knowledgeSourceContext);
      payload.content = buildStructuredDiscoveryContent(
        title,
        cat,
        structuredResult.payload,
        structuredResult.relations,
        discoveryImageUrl,
        discoveryYoutubeUrl
      );
      if (!title) {
        payload.title = buildDiscoveryAutoTitle(structuredResult.payload, cat);
      }
    } else {
      if (!content || content === "<p><br></p>") {
        errorEl.textContent = "Please write discovery notes while the structured flow is disabled.";
        errorEl.style.display = "block";
        return;
      }

      const duplicateError = await detectDiscoveryDuplicateCP({
        title: title,
        category: cat,
        subcategory: needsSubcategory ? discoverySubcat : "",
        payload: null,
      });
      if (duplicateError) {
        errorEl.textContent = duplicateError;
        errorEl.style.display = "block";
        return;
      }

      payload.content = buildDiscoveryMediaContent(title, content, discoveryImageUrl, discoveryYoutubeUrl);
      if (!title) {
        payload.title = buildDiscoveryAutoTitle(null, cat);
      }
    }
    if (needsSubcategory) {
      postMeta.subcategory = discoverySubcat;
    }
  } else {
    if (!createIsAdmin) {
      errorEl.textContent = "Only admins can create wiki category posts.";
      errorEl.style.display = "block";
      return;
    }

    const wikiCategory = document.getElementById("wikiCategory").value;
    const wikiSubcategory = document.getElementById("wikiSubcategory")?.value || "";
    const publishNow = document.getElementById("wikiPublishNow").checked;
    const needsSubcategory = typeof requiresSubcategoryForCategory === "function"
      ? requiresSubcategoryForCategory(wikiCategory)
      : false;
    if (!wikiCategory) {
      errorEl.textContent = "Please choose a wiki category.";
      errorEl.style.display = "block";
      return;
    }
    if (needsSubcategory && !wikiSubcategory) {
      errorEl.textContent = "Please choose a wiki subcategory for this category.";
      errorEl.style.display = "block";
      return;
    }

    payload.post_type = "wiki";
    payload.category = wikiCategory;
    payload.guide_subcategory = null;
    payload.is_discovery = false;
    payload.status = publishNow ? "published" : "pending";
    if (needsSubcategory) {
      postMeta.subcategory = wikiSubcategory;
    }
  }

  if (files.length > 0) {
    const uploadValidationError = validateDiscoveryFilesCP(files, currentPostType === "discovery" ? payload.category : "");
    if (uploadValidationError) {
      errorEl.textContent = uploadValidationError;
      errorEl.style.display = "block";
      return;
    }
    const uploadResult = await uploadDiscoveryFiles(userId, files, {
      category: currentPostType === "discovery" ? (payload.category || currentDiscoveryCategory || "") : "",
      title: payload.title || title,
      meta: postMeta,
    });
    if (uploadResult.error) {
      errorEl.textContent = uploadResult.error;
      errorEl.style.display = "block";
      return;
    }
    if (currentPostType === "discovery" && structuredDiscoveryEnabled) {
      const existingEvidence = Array.isArray(postMeta.discovery_evidence) ? postMeta.discovery_evidence : [];
      const fileEvidence = buildDiscoveryEvidenceMetaCP({
        supports: discoveryEvidenceState.supports || [],
        note: discoveryEvidenceState.note || "",
      }, uploadResult.files, "", "");
      postMeta.discovery_evidence = existingEvidence.concat(fileEvidence);
    }
    payload.content = buildPostContentWithAttachments(payload.content, uploadResult.files, currentPostType === "discovery");
  }

  if (typeof EntityCore !== "undefined" && EntityCore.normalizeEntityClassification) {
    postMeta = EntityCore.normalizeEntityClassification(postMeta, {
      title: payload.title || title,
      category: payload.category || currentDiscoveryCategory || "",
    });
  }

  payload.content = injectPostMetaCP(payload.content, postMeta);

  if (
    currentPostType === "discovery"
    && typeof DiscoveryWizard !== "undefined"
    && DiscoveryWizard.isActive()
    && structuredDiscoveryEnabled
    && postMeta.discovery_payload
  ) {
    if (submitBtn) submitBtn.disabled = true;
    try {
      const relatedEntities = (Array.isArray(postMeta.discovery_relations) ? postMeta.discovery_relations : []).map(function(rel) {
        return {
          name: rel.title || "",
          role: rel.group === "items" && payload.category === "creatures"
            ? "loot"
            : (rel.group === "locations" ? "location" : "related"),
          entity_type: rel.target_entity_type || (
            rel.group === "items" ? "item" :
            rel.group === "creatures" ? "creature" :
            rel.group === "locations" ? "location" :
            rel.group === "guides" ? "guide" :
            "entity"
          ),
          entity_id: rel.id || null,
          canonical_key: rel.canonical_key || null,
          match_type: rel.id ? "exact" : "new",
          match_score: rel.id ? 100 : 0,
        };
      });
      const obsResult = await DiscoveryWizard.submitDiscovery({
        payload: postMeta.discovery_payload,
        title: payload.title,
        contentHtml: payload.content,
        excerpt: String(payload.title || "").slice(0, 200),
        relatedEntities: relatedEntities,
      });
      if (obsResult && obsResult.post_slug) {
        window.location.href = "/wiki/post/?slug=" + encodeURIComponent(obsResult.post_slug);
        return;
      }
      if (obsResult && obsResult.post_id) {
        window.location.href = "/wiki/post/?id=" + encodeURIComponent(obsResult.post_id);
        return;
      }
    } catch (v2Err) {
      console.error("Knowledge graph discovery submit failed:", v2Err);
      if (submitBtn) submitBtn.disabled = false;
      errorEl.textContent = "Failed to submit discovery: " + v2Err.message;
      errorEl.style.display = "block";
      return;
    }
  }

  if (submitBtn) submitBtn.disabled = true;

  const { data, error } = await supabase.from("posts").insert(payload).select().single();

  if (submitBtn) submitBtn.disabled = false;

  if (error) {
    console.error("Post submission failed:", error);
    errorEl.textContent = "Failed to submit post: " + error.message;
    errorEl.style.display = "block";
    return;
  }

  if (currentPostType === "discovery" && structuredDiscoveryEnabled) {
    await updateKnowledgeStubSourcesCP(data, postMeta.discovery_relations || []);
  }

  if (currentPostType === "discovery" && structuredDiscoveryEnabled && typeof KnowledgeRelations !== "undefined") {
    const followUpTargets = KnowledgeRelations.collectFollowUpTargets(
      postMeta.discovery_relations || [],
      buildKnowledgeSourceContextCP(postMeta.discovery_payload, payload.title, payload.category)
    );
    if (followUpTargets.length) {
      const completed = await showKnowledgeFollowUpModalCP(followUpTargets, data);
      if (completed) {
        redirectToCreatedPostCP(data);
        return;
      }
    }
  }

  redirectToCreatedPostCP(data);
}

function redirectToCreatedPostCP(data) {
  if (data && data.slug) {
    window.location.href = "/wiki/post/?slug=" + encodeURIComponent(data.slug);
    return;
  }
  if (data && data.id) {
    window.location.href = "/wiki/post/?id=" + encodeURIComponent(data.id);
  }
}

async function showKnowledgeFollowUpModalCP(targets, createdPost) {
  return new Promise(function(resolve) {
    const overlay = document.createElement("div");
    overlay.className = "bl-kg-followup-overlay";
    const sourceSlug = createdPost && createdPost.slug ? createdPost.slug : "";
    let html = '<div class="bl-kg-followup-modal"><h3>Help complete linked entries</h3>';
    html += '<p class="bl-kg-followup-intro">Your discovery created or updated related wiki entries. Optional answers improve the knowledge graph and can count toward future rewards.</p>';

    targets.forEach(function(target, targetIndex) {
      html += '<div class="bl-kg-followup-target" data-target-index="' + targetIndex + '">';
      html += '<h4>' + escapeHtmlCP(target.title) + ' <span>(' + escapeHtmlCP(target.category || "entry") + ")</span></h4>";
      target.questions.forEach(function(question) {
        html += '<label class="bl-kg-followup-field">';
        html += '<span>' + escapeHtmlCP(question.label) + (question.optional ? ' <em>(optional)</em>' : "") + "</span>";
        if (question.reason) html += '<small>' + escapeHtmlCP(question.reason) + "</small>";
        html += '<input type="text" data-target-index="' + targetIndex + '" data-question-key="' + escapeHtmlCP(question.key) + '" placeholder="Your answer..." />';
        html += "</label>";
      });
      html += "</div>";
    });

    html += '<div class="bl-kg-followup-actions">';
    html += '<button type="button" class="btn-secondary" data-action="skip-followup">Skip for now</button>';
    html += '<button type="button" class="btn-contribute" data-action="save-followup">Save answers</button>';
    html += "</div></div>";
    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    overlay.querySelector('[data-action="skip-followup"]').addEventListener("click", function() {
      overlay.remove();
      resolve(false);
    });

    overlay.querySelector('[data-action="save-followup"]').addEventListener("click", async function() {
      const btn = this;
      btn.disabled = true;
      try {
        for (let i = 0; i < targets.length; i++) {
          const target = targets[i];
          if (!target.id) continue;
          const answers = {};
          overlay.querySelectorAll('input[data-target-index="' + i + '"]').forEach(function(input) {
            const key = input.getAttribute("data-question-key");
            const value = String(input.value || "").trim();
            if (key && value) answers[key] = value;
          });
          if (!Object.keys(answers).length) continue;

          const { data: targetPost } = await supabase.from("posts").select("id, content").eq("id", target.id).maybeSingle();
          if (!targetPost) continue;
          const meta = parsePostMetaCP(targetPost.content || "");
          meta.discovery_payload = KnowledgeRelations.applyFollowUpAnswersToPayload(meta.discovery_payload || {}, answers);
          meta.knowledge_entry = meta.knowledge_entry || {};
          meta.knowledge_entry.followup_answers = answers;
          meta.knowledge_entry.followup_source_slug = sourceSlug || null;
          meta.knowledge_entry.status = "partial";
          meta.knowledge_entry.completeness = "partial";
          const updated = injectPostMetaCP(stripPostMetaCP(targetPost.content || ""), meta);
          await supabase.from("posts").update({ content: updated }).eq("id", target.id);
        }
      } catch (err) {
        console.warn("Follow-up save failed:", err);
      }
      overlay.remove();
      resolve(true);
    });
  });
}


function refreshDiscoverySubcategoryOptions(presetValue) {
  const wrap = document.getElementById("discoverySubcategoryWrap");
  const select = document.getElementById("discoverySubcategory");
  const category = document.getElementById("discoveryCategory")?.value || currentDiscoveryCategory || "";
  if (!wrap || !select) return;

  const options = typeof getCategorySubcategories === "function" ? getCategorySubcategories(category) : [];
  if (!options.length) {
    wrap.style.display = "none";
    select.innerHTML = '<option value="">Select a subcategory...</option>';
    select.removeAttribute("required");
    return;
  }

  wrap.style.display = "block";
  select.innerHTML = '<option value="">Select a subcategory...</option>';
  options.forEach(function(optData) {
    const opt = document.createElement("option");
    opt.value = optData.slug;
    opt.textContent = optData.label;
    select.appendChild(opt);
  });
  select.setAttribute("required", "required");
  if (presetValue) select.value = presetValue;
}

function refreshWikiSubcategoryOptions(presetValue) {
  const wrap = document.getElementById("wikiSubcategoryWrap");
  const select = document.getElementById("wikiSubcategory");
  const category = document.getElementById("wikiCategory")?.value || currentWikiCategory || "";
  if (!wrap || !select) return;

  const options = typeof getCategorySubcategories === "function" ? getCategorySubcategories(category) : [];
  if (!options.length) {
    wrap.style.display = "none";
    select.innerHTML = '<option value="">Select a subcategory...</option>';
    select.removeAttribute("required");
    return;
  }

  wrap.style.display = "block";
  select.innerHTML = '<option value="">Select a subcategory...</option>';
  options.forEach(function(optData) {
    const opt = document.createElement("option");
    opt.value = optData.slug;
    opt.textContent = optData.label;
    select.appendChild(opt);
  });
  select.setAttribute("required", "required");
  if (presetValue) select.value = presetValue;
}

async function uploadDiscoveryFiles(userId, files, context) {
  const uploaded = [];
  const uploadContext = context || {};
  const discoveryPayload = uploadContext.meta && uploadContext.meta.discovery_payload
    ? uploadContext.meta.discovery_payload
    : {};
  const entityName = discoveryPayload.entity_name || uploadContext.title || "discovery";
  const category = uploadContext.category || "post";
  const baseName = slugifyUploadNameCP(category + "-" + entityName);

  for (let idx = 0; idx < files.length; idx += 1) {
    const file = files[idx];
    const extMatch = String(file.name || "").match(/\.([a-z0-9]{2,8})$/i);
    const ext = extMatch ? ("." + extMatch[1].toLowerCase()) : "";
    const path = userId + "/" + baseName + "/" + Date.now() + "-" + String(idx + 1).padStart(2, "0") + "-" + Math.random().toString(36).slice(2, 8) + ext;

    const { error } = await supabase.storage
      .from(DISCOVERY_STORAGE_BUCKET)
      .upload(path, file, { upsert: false });

    if (error) {
      console.error("Discovery upload failed:", error);
      if (error.message && error.message.toLowerCase().includes("bucket")) {
        return { error: 'Upload bucket missing. Please create a public Supabase Storage bucket named "discovery-uploads".' };
      }
      return { error: "Attachment upload failed: " + error.message };
    }

    const { data } = supabase.storage.from(DISCOVERY_STORAGE_BUCKET).getPublicUrl(path);
    uploaded.push({
      name: buildDisplayUploadNameCP(entityName, file.name, idx, ext),
      original_name: file.name,
      path,
      type: file.type || "application/octet-stream",
      size: file.size,
      url: data && data.publicUrl ? data.publicUrl : "",
    });
  }

  return { files: uploaded };
}

function slugifyUploadNameCP(value) {
  return String(value || "discovery")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "discovery";
}

function buildDisplayUploadNameCP(entityName, originalName, index, ext) {
  const fallbackExt = ((String(originalName || "").match(/\.([a-z0-9]{2,8})$/i) || [])[0] || "");
  const cleanEntity = slugifyUploadNameCP(entityName).replace(/-/g, " ");
  return cleanEntity + " evidence " + String(index + 1).padStart(2, "0") + (ext || fallbackExt);
}

function validateDiscoveryFilesCP(files, category) {
  if (!files || !files.length) return "";
  const rules = typeof getDiscoveryUploadRulesForCategory === "function"
    ? getDiscoveryUploadRulesForCategory(category)
    : { maxFiles: 8, maxFileSizeMb: 8, minImages: 0, allowedExtensions: [".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf", ".zip", ".txt"] };

  if (rules.maxFiles && files.length > rules.maxFiles) {
    return "Too many attachments. Maximum allowed: " + rules.maxFiles + ".";
  }

  const allowedExtensions = Array.isArray(rules.allowedExtensions) ? rules.allowedExtensions.map(function(ext) { return ext.toLowerCase(); }) : [];
  const maxBytes = (rules.maxFileSizeMb || 8) * 1024 * 1024;
  let imageCount = 0;

  for (const file of files) {
    const lowerName = String(file.name || "").toLowerCase();
    const extension = lowerName.includes(".") ? lowerName.slice(lowerName.lastIndexOf(".")) : "";
    if (allowedExtensions.length && !allowedExtensions.includes(extension)) {
      return "Unsupported attachment type for " + file.name + ".";
    }
    if (file.size > maxBytes) {
      return file.name + " exceeds the size limit of " + (rules.maxFileSizeMb || 8) + " MB.";
    }
    if ((file.type || "").startsWith("image/")) imageCount += 1;
  }

  if (rules.minImages && imageCount < rules.minImages) {
    return "This discovery type requires at least " + rules.minImages + " image attachment(s).";
  }

  return "";
}

async function detectDiscoveryDuplicateCP(input) {
  const category = input && input.category ? input.category : "";
  const title = input && input.title ? input.title : "";
  if (!category || !title) return "";

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, category, guide_subcategory, content, status")
    .eq("is_discovery", true)
    .eq("category", category)
    .is("deleted_at", null)
    .in("status", ["pending", "published", "approved"])
    .limit(40);

  if (error || !Array.isArray(data)) return "";

  const bestMatch = data.map(function(candidate) {
    return {
      candidate: candidate,
      score: computeDiscoveryDuplicateScoreCP(input, candidate),
    };
  }).sort(function(a, b) {
    return b.score - a.score;
  })[0];

  if (bestMatch && bestMatch.score >= 7) {
    return 'Potential duplicate detected: "' + bestMatch.candidate.title + '" already looks very similar. Please refine the entry or use the existing discovery context.';
  }

  return "";
}

function computeDiscoveryDuplicateScoreCP(input, candidate) {
  let score = 0;
  const inputTitle = normalizeDiscoveryCompareCP(input.title);
  const candidateTitle = normalizeDiscoveryCompareCP(candidate.title);
  if (inputTitle && candidateTitle && inputTitle === candidateTitle) score += 5;

  const candidateMeta = parsePostMetaCP(candidate.content || "");
  const candidatePayload = candidateMeta.discovery_payload && typeof candidateMeta.discovery_payload === "object" ? candidateMeta.discovery_payload : null;
  const inputEntity = normalizeDiscoveryCompareCP(input.payload && input.payload.entity_name ? input.payload.entity_name : "");
  const candidateEntity = normalizeDiscoveryCompareCP(candidatePayload && candidatePayload.entity_name ? candidatePayload.entity_name : candidate.title);
  if (inputEntity && candidateEntity && inputEntity === candidateEntity) score += 7;

  const inputSub = normalizeDiscoveryCompareCP(input.subcategory || "");
  const candidateSub = normalizeDiscoveryCompareCP(candidateMeta.subcategory || candidate.guide_subcategory || "");
  if (inputSub && candidateSub && inputSub === candidateSub) score += 1;

  const inputPlace = normalizeDiscoveryCompareCP(getDiscoveryPrimaryPlaceCP(input.payload || {}));
  const candidatePlace = normalizeDiscoveryCompareCP(getDiscoveryPrimaryPlaceCP(candidatePayload || {}));
  if (inputPlace && candidatePlace && inputPlace === candidatePlace) score += 3;

  score += Math.min(countSharedDiscoveryTermsCP(inputTitle, candidateTitle), 2);
  return score;
}

function normalizeDiscoveryCompareCP(value) {
  if (typeof normalizeDiscoveryLookupTerm === "function") {
    return normalizeDiscoveryLookupTerm(value);
  }
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countSharedDiscoveryTermsCP(a, b) {
  const termsA = typeof tokenizeDiscoveryLookupTerms === "function"
    ? tokenizeDiscoveryLookupTerms(a)
    : a.split(/\s+/).filter(function(term) { return term.length >= 4; });
  const termsB = new Set(typeof tokenizeDiscoveryLookupTerms === "function"
    ? tokenizeDiscoveryLookupTerms(b)
    : b.split(/\s+/).filter(function(term) { return term.length >= 4; }));
  return termsA.filter(function(term) { return termsB.has(term); }).length;
}

function buildPostContentWithAttachments(baseHtml, files, isDiscovery) {
  if (!files || files.length === 0) return baseHtml;

  const entries = files.map(function(file) {
    const sizeKb = Math.max(1, Math.round((file.size || 0) / 1024));
    const escapedName = escapeHtmlCP(file.name);
    const escapedUrl = escapeAttrCP(file.url);
    if ((file.type || "").startsWith("image/")) {
      return '<li><a href="' + escapedUrl + '" target="_blank" rel="noopener" download>' + escapedName + '</a> (' + sizeKb + ' KB)<br><img src="' + escapedUrl + '" alt="' + escapedName + '" style="max-width:280px;border-radius:8px;margin-top:6px;" /></li>';
    }
    return '<li><a href="' + escapedUrl + '" target="_blank" rel="noopener" download>' + escapedName + '</a> (' + sizeKb + ' KB)</li>';
  }).join("");

  return baseHtml +
    '<hr />' +
    '<h3>' + (isDiscovery ? "Discovery Attachments" : "Attachments") + '</h3>' +
    '<ul class="discovery-attachments">' + entries + '</ul>';
}

function buildDiscoveryMediaContent(title, baseHtml, imageUrl, youtubeUrl) {
  let content =
    '<section class="discovery-entry-head" style="padding:14px 16px;border:1px solid rgba(255,215,0,0.35);border-radius:10px;background:linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,255,255,0.04));margin-bottom:12px;">' +
      '<p style="margin:0 0 6px;font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:#d8b65d;">Community Discovery</p>' +
      '<h2 style="margin:0;font-size:1.2rem;line-height:1.35;">' + escapeHtmlCP(title || "Discovery") + '</h2>' +
    '</section>' +
    baseHtml;
  if (imageUrl) {
    const safeImage = escapeAttrCP(imageUrl);
    content += '<hr /><h3>Discovery Image</h3><p><a href="' + safeImage + '" target="_blank" rel="noopener">Open image</a></p><p><img src="' + safeImage + '" alt="Discovery image" style="max-width:360px;border-radius:8px;" /></p>';
  }
  if (youtubeUrl) {
    const safeVideo = escapeAttrCP(youtubeUrl);
    content += '<h3>Discovery Video</h3><p><a href="' + safeVideo + '" target="_blank" rel="noopener">Watch on YouTube</a></p>';
  }
  return content;
}

function getDiscoveryConfig(category) {
  if (isResourceQuickAddModeCP() && typeof getResourceQuickAddSchema === "function") {
    return getResourceQuickAddSchema();
  }
  if (typeof getDiscoverySchemaForCategory === "function") {
    return getDiscoverySchemaForCategory(category);
  }
  return {
    fields: [
      { key: "found_in", label: "Where found", type: "text", required: true, max: 120 },
      { key: "how_to_reproduce", label: "How to reproduce", type: "textarea", required: true, max: 1200 },
      { key: "observed_result", label: "Observed result", type: "textarea", required: true, max: 600 },
    ],
    relations: ["items", "creatures", "locations", "guides"],
  };
}

function getDiscoveryRelationConfig() {
  if (typeof getDiscoveryRelationGroups === "function") {
    return getDiscoveryRelationGroups();
  }
  return {
    items: { label: "Used Items", relationType: "uses_item" },
    creatures: { label: "Related Creatures", relationType: "related_creature" },
    locations: { label: "Related Locations/Biomes", relationType: "found_in" },
    guides: { label: "Related Guides", relationType: "reference_guide" },
  };
}

function renderDiscoveryStructuredFields() {
  const wrap = document.getElementById("discoveryStructuredFields");
  if (!wrap) return;
  if (!structuredDiscoveryEnabled) {
    wrap.innerHTML = "";
    wrap.style.display = "none";
    return;
  }

  const category = document.getElementById("discoveryCategory")?.value || currentDiscoveryCategory || "";
  if (category === "items" && discoveryFieldState.discovery_type === "resource" && !isResourceQuickAddModeCP()) {
    initResourceQuickAddModeCP();
    return;
  }

  if (isResourceQuickAddModeCP() && typeof ResourceQuickAdd !== "undefined") {
    wrap.style.display = "block";
    ResourceQuickAdd.renderPanel(wrap, typeof supabase !== "undefined" ? supabase : null);
    return;
  }

  if (!category) {
    wrap.style.display = "block";
    wrap.innerHTML = "<h3 style='margin:0 0 8px;'>Discovery Data</h3><p class='field-hint'>Choose a discovery category first to load the specialized questions for that discovery type.</p>";
    return;
  }
  const config = getDiscoveryConfig(category);
  const fields = (Array.isArray(config.fields) ? config.fields : []).filter(function(item) {
    return item.key !== "world_name";
  });
  if (!fields.length) {
    wrap.innerHTML = "";
    return;
  }

  if (discoveryDataFieldIndex < 0) discoveryDataFieldIndex = 0;
  if (discoveryDataFieldIndex > fields.length - 1) discoveryDataFieldIndex = fields.length - 1;

  const field = fields[discoveryDataFieldIndex];

  wrap.className = "form-group bl-discovery-question-shell";
  wrap.innerHTML = "";

  const head = document.createElement("div");
  head.className = "bl-discovery-question-head";
  head.innerHTML =
    '<div><p class="bl-discovery-kicker">Discovery Data</p>' +
    '<h3>Question ' + (discoveryDataFieldIndex + 1) + ' of ' + fields.length + '</h3></div>' +
    '<span>' + Math.round(((discoveryDataFieldIndex + 1) / fields.length) * 100) + '%</span>';
  wrap.appendChild(head);

  const rail = document.createElement("div");
  rail.className = "bl-discovery-question-rail";
  fields.forEach(function(item, idx) {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "bl-discovery-question-dot" +
      (idx === discoveryDataFieldIndex ? " active" : "") +
      (String(discoveryFieldState[item.key] || "").trim() ? " complete" : "");
    dot.title = item.label;
    dot.addEventListener("click", function() {
      if (idx <= discoveryDataFieldIndex || canLeaveDiscoveryFieldCP(field, input, message)) {
        discoveryDataFieldIndex = idx;
        renderDiscoveryStructuredFields();
      }
    });
    rail.appendChild(dot);
  });
  wrap.appendChild(rail);

  const group = document.createElement("div");
  group.className = "form-group bl-discovery-question-card";

  const label = document.createElement("label");
  label.setAttribute("for", "discField_" + field.key);
  label.textContent = field.label + (field.required ? " *" : "");
  group.appendChild(label);

  let input;
  const current = discoveryFieldState[field.key] != null ? discoveryFieldState[field.key] : "";
  if (field.type === "textarea") {
    input = document.createElement("textarea");
    input.rows = 4;
    input.maxLength = field.max || 1200;
    input.className = "form-input";
    input.placeholder = field.placeholder || "Add concrete details.";
    input.value = current;
  } else if (field.type === "select") {
    input = document.createElement("select");
    input.className = "form-input bl-discovery-hidden-select";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "Select...";
    input.appendChild(empty);
    (field.options || []).forEach(function(opt) {
      const option = document.createElement("option");
      option.value = opt;
      option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
      input.appendChild(option);
    });
    input.value = current;
  } else {
    input = document.createElement("input");
    input.type = field.type === "number" ? "number" : "text";
    input.className = "form-input";
    input.maxLength = field.max || 240;
    if (field.type === "number" && typeof field.min === "number") input.min = String(field.min);
    if (field.type !== "number") {
      input.placeholder = field.placeholder || "Add your finding...";
    }
    input.value = current;
  }

  input.id = "discField_" + field.key;
  input.dataset.discoveryField = field.key;
  if (field.required) input.setAttribute("data-required", "1");

  input.addEventListener("input", function() {
    discoveryFieldState[field.key] = input.value;
    toggleFieldSuggestionHint(hint, input);
    message.style.display = "none";
  });

  input.addEventListener("focus", function() {
    toggleFieldSuggestionHint(hint, input);
  });

  input.addEventListener("blur", function() {
    toggleFieldSuggestionHint(hint, input);
  });

  group.appendChild(input);

  if (field.key === "entity_name" && typeof DiscoveryWizard !== "undefined") {
    DiscoveryWizard.attachEntityNameField(input);
  }

  if (field.type === "select") {
    const optionGrid = document.createElement("div");
    optionGrid.className = "bl-discovery-option-grid";
    (field.options || []).forEach(function(opt) {
      const optionBtn = document.createElement("button");
      optionBtn.type = "button";
      optionBtn.className = "bl-discovery-option-card" + (String(current) === String(opt) ? " selected" : "");
      optionBtn.textContent = humanizeDiscoveryValueCP(opt);
      optionBtn.addEventListener("click", function() {
        input.value = opt;
        discoveryFieldState[field.key] = opt;
        message.style.display = "none";
        renderDiscoveryStructuredFields();
      });
      optionGrid.appendChild(optionBtn);
    });
    group.appendChild(optionGrid);
  }

  const hint = document.createElement("p");
  hint.className = "field-hint";
  hint.textContent = field.placeholder || "Tip: keep this factual and reproducible.";
  group.appendChild(hint);
  toggleFieldSuggestionHint(hint, input);

  const message = document.createElement("p");
  message.className = "field-hint";
  message.style.color = "#ffb4b4";
  message.style.display = "none";
  group.appendChild(message);

  if (!field.required && (field.type === "text" || field.type === "textarea")) {
    const quickHelp = document.createElement("p");
    quickHelp.className = "field-hint";
    quickHelp.textContent = "Optional helper values. Required questions cannot be skipped.";
    group.appendChild(quickHelp);

    const quickRow = document.createElement("div");
    quickRow.style.display = "flex";
    quickRow.style.flexWrap = "wrap";
    quickRow.style.gap = "6px";
    ["Unclear", "No", "Not observed"].forEach(function(labelText) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn-secondary";
      btn.textContent = labelText;
      btn.addEventListener("click", function() {
        input.value = labelText.toLowerCase();
        discoveryFieldState[field.key] = input.value;
        toggleFieldSuggestionHint(hint, input);
        message.style.display = "none";
      });
      quickRow.appendChild(btn);
    });
    group.appendChild(quickRow);
  }

  const nav = document.createElement("div");
  nav.style.display = "flex";
  nav.style.gap = "8px";
  nav.style.marginTop = "8px";

  if (discoveryDataFieldIndex > 0) {
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "btn-secondary";
    prev.textContent = "Previous question";
    prev.addEventListener("click", function() {
      discoveryDataFieldIndex -= 1;
      renderDiscoveryStructuredFields();
    });
    nav.appendChild(prev);
  }

  if (discoveryDataFieldIndex < fields.length - 1) {
    const next = document.createElement("button");
    next.type = "button";
    next.className = "btn-contribute";
    next.textContent = "Next question";
    next.addEventListener("click", function() {
      if (!canLeaveDiscoveryFieldCP(field, input, message)) return;
      discoveryDataFieldIndex += 1;
      renderDiscoveryStructuredFields();
    });
    nav.appendChild(next);
  } else {
    const done = document.createElement("span");
    done.className = "field-hint";
    done.textContent = "All structured questions reviewed. Continue to relations/evidence.";
    nav.appendChild(done);
  }

  group.appendChild(nav);
  wrap.appendChild(group);
}

function canLeaveDiscoveryFieldCP(field, input, message) {
  const value = String(input && input.value || "").trim();
  if (field.required && !value) {
    message.textContent = "This is required. Choose an option or add a concrete answer before continuing.";
    message.style.display = "block";
    return false;
  }
  return true;
}

function humanizeDiscoveryValueCP(value) {
  return String(value || "")
    .replace(/^\d-/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
    .trim();
}

function toggleFieldSuggestionHint(hintEl, inputEl) {
  if (!hintEl || !inputEl) return;
  const hasValue = String(inputEl.value || "").trim().length > 0;
  const focused = document.activeElement === inputEl;
  hintEl.style.display = hasValue || focused ? "none" : "block";
}

function renderDiscoveryRelationFields() {
  const wrap = document.getElementById("discoveryRelationFields");
  if (!wrap) return;
  if (!structuredDiscoveryEnabled) {
    wrap.innerHTML = "";
    wrap.style.display = "none";
    return;
  }

  const category = document.getElementById("discoveryCategory")?.value || currentDiscoveryCategory || "";
  if (!category) {
    wrap.style.display = "none";
    wrap.innerHTML = "";
    return;
  }
  const config = getDiscoveryConfig(category);
  const groups = Array.isArray(config.relations) ? config.relations : [];

  wrap.innerHTML = "";
  if (isResourceQuickAddModeCP()) {
    wrap.style.display = "block";
    const note = document.createElement("p");
    note.className = "field-hint";
    note.textContent = "Resource relations (found_in / harvested_from) are inferred automatically from biome and optional source entity. Generic source details stay as facts only.";
    wrap.appendChild(note);
    return;
  }
  if (!groups.length) return;

  const title = document.createElement("h3");
  title.textContent = "Auto Relations";
  title.style.margin = "4px 0 8px";
  wrap.appendChild(title);

  const help = document.createElement("p");
  help.className = "field-hint";
  help.textContent = "Optional: start typing to find existing entries. Click a suggestion to create a direct relation.";
  wrap.appendChild(help);

  const skipWrap = document.createElement("label");
  skipWrap.style.display = "flex";
  skipWrap.style.alignItems = "center";
  skipWrap.style.gap = "8px";
  skipWrap.style.margin = "4px 0 6px";
  const skipInput = document.createElement("input");
  skipInput.type = "checkbox";
  skipInput.checked = discoveryRelationsSkipped === true;
  skipInput.addEventListener("change", function() {
    discoveryRelationsSkipped = skipInput.checked;
    renderDiscoveryRelationFields();
  });
  skipWrap.appendChild(skipInput);
  const skipText = document.createElement("span");
  skipText.textContent = "Skip auto-relations for this report (unclear / not available).";
  skipWrap.appendChild(skipText);
  wrap.appendChild(skipWrap);

  if (discoveryRelationsSkipped) {
    const skipped = document.createElement("p");
    skipped.className = "field-hint";
    skipped.textContent = "Auto-relations skipped. You can still submit without linked entries.";
    wrap.appendChild(skipped);
    return;
  }

  groups.forEach(function(groupKey) {
    const relationConfig = getDiscoveryRelationConfig();
    const cfg = relationConfig[groupKey];
    if (!cfg) return;

    const box = document.createElement("div");
    box.className = "form-group";
    box.style.marginTop = "8px";

    const label = document.createElement("label");
    label.setAttribute("for", "relationInput_" + groupKey);
    label.textContent = cfg.label;
    box.appendChild(label);

    const input = document.createElement("input");
    input.id = "relationInput_" + groupKey;
    input.className = "form-input";
    input.placeholder = "Type at least 2 letters...";
    box.appendChild(input);

    const suggestions = document.createElement("div");
    suggestions.id = "relationSuggestions_" + groupKey;
    suggestions.style.marginTop = "6px";
    box.appendChild(suggestions);

    const selected = document.createElement("div");
    selected.id = "relationSelected_" + groupKey;
    selected.style.marginTop = "8px";
    box.appendChild(selected);

    input.addEventListener("input", function() {
      const value = (input.value || "").trim();
      if (relationInputTimers[groupKey]) {
        clearTimeout(relationInputTimers[groupKey]);
      }
      relationInputTimers[groupKey] = setTimeout(function() {
        fetchRelationSuggestions(groupKey, value);
      }, 220);
    });

    input.addEventListener("keydown", function(evt) {
      if (evt.key === "Enter") {
        evt.preventDefault();
        const value = (input.value || "").trim();
        if (!value) return;
        addDiscoveryRelation(groupKey, {
          title: value,
          slug: null,
          id: null,
          category: null,
          post_type: null,
          relation_type: cfg.relationType,
          resolved: false,
        });
        input.value = "";
        renderRelationSuggestions(groupKey);
      }
    });

    wrap.appendChild(box);
    renderRelationSuggestions(groupKey);
    renderSelectedRelations(groupKey);
  });
}

function renderDiscoveryEvidenceFields() {
  const wrap = document.getElementById("discoveryEvidenceFields");
  if (!wrap) return;
  if (!structuredDiscoveryEnabled) {
    wrap.innerHTML = "";
    wrap.style.display = "none";
    return;
  }

  const category = document.getElementById("discoveryCategory")?.value || currentDiscoveryCategory || "";
  if (!category) {
    wrap.style.display = "none";
    wrap.innerHTML = "";
    return;
  }
  const config = getDiscoveryConfig(category);
  const fields = Array.isArray(config.fields) ? config.fields : [];
  wrap.style.display = "block";
  wrap.className = "form-group bl-discovery-panel";
    wrap.innerHTML = "<h3 class='bl-discovery-panel-title'>Evidence Mapping</h3>";

  const help = document.createElement("p");
  help.className = "field-hint";
  help.textContent = "Select which structured facts your screenshots, uploads, or video evidence support.";
  wrap.appendChild(help);

  const supportsBox = document.createElement("div");
    supportsBox.className = "bl-evidence-grid";

  fields.forEach(function(field) {
    const label = document.createElement("label");
      label.className = "bl-evidence-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = field.key;
    checkbox.checked = discoveryEvidenceState.supports.includes(field.key);
    checkbox.addEventListener("change", function() {
      if (checkbox.checked) {
        if (!discoveryEvidenceState.supports.includes(field.key)) discoveryEvidenceState.supports.push(field.key);
      } else {
        discoveryEvidenceState.supports = discoveryEvidenceState.supports.filter(function(item) { return item !== field.key; });
      }
    });
    label.appendChild(checkbox);
    const text = document.createElement("span");
    text.textContent = field.label;
    label.appendChild(text);
    supportsBox.appendChild(label);
  });
  wrap.appendChild(supportsBox);

  const noteLabel = document.createElement("label");
  noteLabel.setAttribute("for", "discoveryEvidenceNote");
  noteLabel.textContent = "Evidence note (optional)";
  wrap.appendChild(noteLabel);

  const note = document.createElement("textarea");
  note.id = "discoveryEvidenceNote";
  note.className = "form-input";
  note.rows = 3;
  note.maxLength = 400;
  note.placeholder = "Example: first screenshot shows the spawn location; second image confirms the taming item.";
  note.value = discoveryEvidenceState.note || "";
  note.addEventListener("input", function() {
    discoveryEvidenceState.note = note.value;
  });
  wrap.appendChild(note);
}

function renderGuideReferenceFields() {
  const wrap = document.getElementById("guideReferenceFields");
  if (!wrap) return;
  wrap.innerHTML = "<h3 class='bl-discovery-panel-title'>Guide References</h3>";

  const help = document.createElement("p");
  help.className = "field-hint";
  help.textContent = "Optionally link the entries this guide explains, uses, or recommends.";
  wrap.appendChild(help);

  const row = document.createElement("div");
  row.className = "form-group";

  const categoryLabel = document.createElement("label");
  categoryLabel.setAttribute("for", "guideReferenceCategory");
  categoryLabel.textContent = "Reference category";
  row.appendChild(categoryLabel);

  const categorySelect = document.createElement("select");
  categorySelect.id = "guideReferenceCategory";
  categorySelect.className = "form-input";
  categorySelect.innerHTML = '<option value="">Choose category...</option>';
  const referenceCategories = getGuideReferenceCategoryOptionsCP();
  referenceCategories.forEach(function(cat) {
    const opt = document.createElement("option");
    opt.value = cat.slug;
    opt.textContent = cat.label;
    categorySelect.appendChild(opt);
  });
  categorySelect.value = guideReferenceCategory || "";
  categorySelect.addEventListener("change", function() {
    guideReferenceCategory = categorySelect.value;
    guideReferenceSuggestions = [];
    renderGuideReferenceFields();
  });
  row.appendChild(categorySelect);

  const inputLabel = document.createElement("label");
  inputLabel.setAttribute("for", "guideReferenceSearch");
  inputLabel.style.marginTop = "12px";
  inputLabel.textContent = "Find existing entry";
  row.appendChild(inputLabel);

  const input = document.createElement("input");
  input.id = "guideReferenceSearch";
  input.className = "form-input";
  input.placeholder = guideReferenceCategory ? "Type to search existing entries..." : "Choose a category first...";
  input.disabled = !guideReferenceCategory;
  input.addEventListener("input", function() {
    const value = (input.value || "").trim();
    if (guideReferenceTimer) clearTimeout(guideReferenceTimer);
    guideReferenceTimer = setTimeout(function() {
      fetchGuideReferenceSuggestionsCP(value);
    }, 220);
  });
  row.appendChild(input);

  const suggestions = document.createElement("div");
  suggestions.id = "guideReferenceSuggestions";
  suggestions.style.marginTop = "8px";
  row.appendChild(suggestions);

  const selected = document.createElement("div");
  selected.id = "guideReferenceSelected";
  selected.style.marginTop = "10px";
  row.appendChild(selected);

  wrap.appendChild(row);
  renderGuideReferenceSuggestions();
  renderGuideReferenceSelected();
}

function getGuideReferenceCategoryOptionsCP() {
  const categories = Array.isArray(window.BOUNDLORE_CATEGORIES)
    ? window.BOUNDLORE_CATEGORIES
    : [];
  return categories.filter(function(cat) {
    return cat.slug !== "community" && cat.slug !== "news";
  }).concat([{ slug: "guides", label: "Guides" }]).filter(function(item, index, arr) {
    return arr.findIndex(function(other) { return other.slug === item.slug; }) === index;
  });
}

async function fetchGuideReferenceSuggestionsCP(term) {
  const cleanTerm = String(term || "").trim();
  if (!guideReferenceCategory || cleanTerm.length < 2) {
    guideReferenceSuggestions = [];
    renderGuideReferenceSuggestions();
    return;
  }

  let query = supabase
    .from("posts")
    .select("id, slug, title, category, post_type, status")
    .eq("status", "published")
    .is("deleted_at", null)
    .ilike("title", "%" + cleanTerm + "%")
    .limit(10);

  if (guideReferenceCategory === "guides") {
    query = query.eq("post_type", "guide");
  } else {
    query = query.eq("category", guideReferenceCategory);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    guideReferenceSuggestions = [];
    renderGuideReferenceSuggestions();
    return;
  }

  guideReferenceSuggestions = data.map(function(item) {
    return {
      id: item.id,
      slug: item.slug || null,
      title: item.title,
      category: item.category || guideReferenceCategory,
      post_type: item.post_type || null,
      score: typeof scoreDiscoveryLookupMatch === "function"
        ? scoreDiscoveryLookupMatch(cleanTerm, item.title || "")
        : 1,
    };
  }).filter(function(item) {
    return item.score > 0;
  }).sort(function(a, b) {
    if (b.score !== a.score) return b.score - a.score;
    return String(a.title || "").localeCompare(String(b.title || ""));
  }).slice(0, 6);

  renderGuideReferenceSuggestions();
}

function renderGuideReferenceSuggestions() {
  const wrap = document.getElementById("guideReferenceSuggestions");
  if (!wrap) return;
  wrap.innerHTML = "";
  guideReferenceSuggestions.forEach(function(item) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.style.margin = "4px 6px 0 0";
    btn.textContent = item.title + " (" + (item.post_type === "guide" ? "Guide" : (item.category || "Entry")) + ")";
    btn.addEventListener("click", function() {
      addGuideReferenceCP(item);
      guideReferenceSuggestions = [];
      renderGuideReferenceFields();
    });
    wrap.appendChild(btn);
  });
}

function addGuideReferenceCP(item) {
  const duplicate = guideReferenceState.some(function(existing) {
    if (item.id && existing.id) return existing.id === item.id;
    return String(existing.title || "").toLowerCase() === String(item.title || "").toLowerCase();
  });
  if (duplicate) return;
  guideReferenceState.push(item);
  renderGuideReferenceSelected();
}

function renderGuideReferenceSelected() {
  const wrap = document.getElementById("guideReferenceSelected");
  if (!wrap) return;
  if (!guideReferenceState.length) {
    wrap.innerHTML = "<span class='field-hint'>No guide references selected yet.</span>";
    return;
  }
  wrap.innerHTML = "";
  guideReferenceState.forEach(function(item, idx) {
    const chip = document.createElement("span");
    chip.className = "bl-post-context-chip";
    chip.style.display = "inline-flex";
    chip.style.marginRight = "6px";
    chip.style.marginTop = "6px";
    chip.textContent = item.title;
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "x";
    removeBtn.style.marginLeft = "8px";
    removeBtn.style.background = "transparent";
    removeBtn.style.border = "none";
    removeBtn.style.color = "inherit";
    removeBtn.style.cursor = "pointer";
    removeBtn.addEventListener("click", function() {
      guideReferenceState.splice(idx, 1);
      renderGuideReferenceSelected();
    });
    chip.appendChild(removeBtn);
    wrap.appendChild(chip);
  });
}

async function fetchRelationSuggestions(groupKey, term) {
  const cleanTerm = String(term || "").trim();
  if (cleanTerm.length < 2) {
    discoverySuggestionState[groupKey] = [];
    renderRelationSuggestions(groupKey);
    return;
  }

  let query = supabase
    .from("posts")
    .select("id, slug, title, category, post_type, status")
    .in("status", ["published", "approved"])
    .ilike("title", "%" + cleanTerm + "%")
    .limit(10);

  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    discoverySuggestionState[groupKey] = [];
    renderRelationSuggestions(groupKey);
    return;
  }

  const relationConfig = getDiscoveryRelationConfig();

  discoverySuggestionState[groupKey] = data.filter(function(item) {
    return relationCandidateMatchesGroup(groupKey, item);
  }).map(function(item) {
    return {
      id: item.id,
      slug: item.slug || null,
      title: item.title,
      category: item.category || null,
      post_type: item.post_type || null,
      relation_type: relationConfig[groupKey].relationType,
      resolved: true,
      suggestionScore: computeRelationSuggestionScoreCP(cleanTerm, item.title || ""),
    };
  }).filter(function(item) {
    return item.suggestionScore > 0;
  }).sort(function(a, b) {
    if (b.suggestionScore !== a.suggestionScore) return b.suggestionScore - a.suggestionScore;
    return String(a.title || "").localeCompare(String(b.title || ""));
  }).slice(0, 6);

  renderRelationSuggestions(groupKey);
}

function computeRelationSuggestionScoreCP(input, candidateTitle) {
  if (typeof scoreDiscoveryLookupMatch === "function") {
    return scoreDiscoveryLookupMatch(input, candidateTitle);
  }
  const query = normalizeDiscoveryCompareCP(input);
  const title = normalizeDiscoveryCompareCP(candidateTitle);
  if (!query || !title) return 0;
  if (title === query) return 100;
  if (title.startsWith(query)) return 70;
  if (title.includes(query)) return 50;

  const queryTerms = query.split(/\s+/).filter(Boolean);
  const titleTerms = new Set(title.split(/\s+/).filter(Boolean));
  let score = 0;
  queryTerms.forEach(function(term) {
    if (titleTerms.has(term)) score += 15;
  });
  return score;
}

function relationCandidateMatchesGroup(groupKey, item) {
  if (groupKey === "guides") return item.post_type === "guide";
  if (groupKey === "items") return item.category === "items";
  if (groupKey === "creatures") return item.category === "creatures";
  if (groupKey === "locations") return item.category === "locations" || item.category === "biomes";
  return true;
}

function renderRelationSuggestions(groupKey) {
  const wrap = document.getElementById("relationSuggestions_" + groupKey);
  if (!wrap) return;
  const suggestions = discoverySuggestionState[groupKey] || [];
  if (!suggestions.length) {
    wrap.innerHTML = "";
    return;
  }

  wrap.innerHTML = "";
  suggestions.forEach(function(suggestion) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.style.margin = "4px 6px 0 0";
    const label = suggestion.post_type === "guide"
      ? "Guide"
      : (suggestion.category || "Entry");
    btn.textContent = suggestion.title + " (" + label + ")";
    btn.addEventListener("click", function() {
      addDiscoveryRelation(groupKey, suggestion);
      const input = document.getElementById("relationInput_" + groupKey);
      if (input) input.value = "";
      discoverySuggestionState[groupKey] = [];
      renderRelationSuggestions(groupKey);
    });
    wrap.appendChild(btn);
  });
}

function addDiscoveryRelation(groupKey, relation) {
  const list = discoveryRelationState[groupKey] || [];
  const duplicate = list.some(function(item) {
    if (relation.id && item.id) return item.id === relation.id;
    return String(item.title || "").toLowerCase() === String(relation.title || "").toLowerCase();
  });
  if (duplicate) return;
  list.push(relation);
  discoveryRelationState[groupKey] = list;
  renderSelectedRelations(groupKey);
}

function removeDiscoveryRelation(groupKey, idx) {
  const list = discoveryRelationState[groupKey] || [];
  if (idx < 0 || idx >= list.length) return;
  list.splice(idx, 1);
  renderSelectedRelations(groupKey);
}

function renderSelectedRelations(groupKey) {
  const wrap = document.getElementById("relationSelected_" + groupKey);
  if (!wrap) return;

  const list = discoveryRelationState[groupKey] || [];
  if (!list.length) {
    wrap.innerHTML = "<span class='field-hint'>No linked entries selected yet.</span>";
    return;
  }

  wrap.innerHTML = "";
  list.forEach(function(item, idx) {
    const chip = document.createElement("span");
    chip.className = "bl-post-context-chip";
    chip.style.marginRight = "6px";
    chip.style.marginTop = "6px";
    chip.style.display = "inline-flex";
    chip.textContent = item.title + (item.resolved ? "" : " (new)");

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "x";
    removeBtn.style.marginLeft = "8px";
    removeBtn.style.background = "transparent";
    removeBtn.style.color = "inherit";
    removeBtn.style.border = "none";
    removeBtn.style.cursor = "pointer";
    removeBtn.addEventListener("click", function() {
      removeDiscoveryRelation(groupKey, idx);
    });
    chip.appendChild(removeBtn);
    wrap.appendChild(chip);
  });
}

function collectStructuredDiscoveryInput() {
  const category = document.getElementById("discoveryCategory")?.value || currentDiscoveryCategory || "";

  if (isResourceQuickAddModeCP() && typeof ResourceQuickAdd !== "undefined") {
    const collected = ResourceQuickAdd.collectPayload();
    if (collected.error) return collected;
    const relations = [];
    if (typeof KnowledgeRelations !== "undefined") {
      KnowledgeRelations.appendAutoRelations(relations, collected.payload, category, {
        sourceTitle: collected.payload.entity_name,
        sourceCategory: category,
        entitySubtype: "resource",
        discoveryForm: "resource_quick",
      });
    }
    return { payload: collected.payload, relations: relations };
  }

  const config = getDiscoveryConfig(category);
  const payload = {};

  for (const field of config.fields || []) {
    const value = (discoveryFieldState[field.key] == null ? "" : String(discoveryFieldState[field.key])).trim();
    if (field.required && !value) {
      return { error: "Please fill the required field: " + field.label };
    }

    if (value && (field.type === "text" || field.type === "textarea")) {
      const qualityError = validateDiscoveryTextQuality(field, value);
      if (qualityError) {
        return { error: qualityError };
      }
    }

    if (field.type === "number" && value) {
      const numeric = Number(value);
      if (!Number.isFinite(numeric) || numeric < 0) {
        return { error: "Please provide a valid number for " + field.label + "." };
      }
      payload[field.key] = numeric;
    } else if (value) {
      payload[field.key] = value;
    }
  }

  const reproValue = String(payload.how_to_reproduce || "").trim().toLowerCase();
  const v2Schema = typeof DiscoveryCore !== "undefined" && DiscoveryCore.isKnowledgeGraphDiscoveryEnabled();
  if (!v2Schema && reproValue && !DISCOVERY_SKIP_VALUES.includes(reproValue) && String(payload.how_to_reproduce || "").length < 20) {
    return { error: "Please provide clearer reproduction steps (at least 20 characters)." };
  }

  if (v2Schema) {
    if (!payload.confidence_level) payload.confidence_level = "2-single-observation";
    if (!payload.impact_area) payload.impact_area = "gameplay";
  }

  const relations = [];
  const relationConfig = getDiscoveryRelationConfig();
  Object.keys(relationConfig).forEach(function(groupKey) {
    const groupItems = discoveryRelationState[groupKey] || [];
    groupItems.forEach(function(item) {
      relations.push({
        group: groupKey,
        relation_type: item.relation_type || relationConfig[groupKey].relationType,
        id: item.id || null,
        slug: item.slug || null,
        title: item.title,
        category: item.category || null,
        post_type: item.post_type || null,
        resolved: !!item.resolved,
      });
    });
  });

  if (typeof KnowledgeRelations !== "undefined") {
    KnowledgeRelations.appendAutoRelations(relations, payload, category, {
      sourceTitle: getMeaningfulDiscoveryValueCP(payload.entity_name),
      sourceCategory: category,
    });
  } else {
    appendAutoDiscoveryRelationsCP(relations, payload, category);
  }

  return { payload: payload, relations: relations };
}

function appendAutoDiscoveryRelationsCP(relations, payload, category) {
  if (typeof KnowledgeRelations !== "undefined") {
    return KnowledgeRelations.appendAutoRelations(relations, payload, category, { sourceCategory: category });
  }
  return relations;
}

function extractLikelyItemNamesCP(values) {
  const out = [];
  (values || []).forEach(function(value) {
    const text = String(value || "");
    const quoted = text.match(/"([^"]{3,80})"/g) || [];
    quoted.forEach(function(match) {
      out.push(match.replace(/^"|"$/g, ""));
    });
    const medallion = text.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,5}\s+(?:Medallion|Amulet|Key|Charm|Heart|Stone|Token|Relic|Compass|Crystal|Orb))\b/g) || [];
    medallion.forEach(function(match) { out.push(match); });
  });
  return Array.from(new Set(out.map(function(item) { return item.trim(); }).filter(Boolean)));
}

function extractListLikeValuesCP(value) {
  return String(value || "")
    .split(/[,;\n]+/)
    .map(function(item) { return item.trim().replace(/^\d+x?\s*/i, ""); })
    .filter(function(item) {
      const lower = item.toLowerCase();
      return item.length >= 3 && !["unknown", "unclear", "none", "not observed"].includes(lower);
    })
    .slice(0, 8);
}

function validateDiscoveryTextQuality(field, value) {
  const clean = String(value || "").trim();
  const lower = clean.toLowerCase();

  if (DISCOVERY_SKIP_VALUES.includes(lower)) {
    return "";
  }

  if (DISCOVERY_PLACEHOLDER_VALUES.includes(lower)) {
    return field.label + ": please provide real discovery details, not placeholders.";
  }

  if (/(.)\1{5,}/.test(clean)) {
    return field.label + ": repeated characters detected. Please provide readable information.";
  }

  const noSpace = clean.replace(/\s+/g, "");
  const uniqueChars = new Set(noSpace.toLowerCase().split("")).size;
  if (noSpace.length >= 8 && uniqueChars <= 2) {
    return field.label + ": content looks too repetitive. Please provide specific details.";
  }

  const words = clean.split(/\s+/).filter(Boolean);
  const v2Schema = typeof DiscoveryCore !== "undefined" && DiscoveryCore.isKnowledgeGraphDiscoveryEnabled();
  if (!v2Schema && field.required && field.type === "textarea" && words.length < 4) {
    return field.label + ": please add at least 4 meaningful words.";
  }

  const looksLikeRandom = /^[a-z0-9\s]+$/i.test(clean) && /^(?:[a-z]{1,3}\s*){3,}$/i.test(clean) && words.length >= 4;
  if (looksLikeRandom && words.every(function(w) { return w.length <= 3; })) {
    return field.label + ": input is too unspecific. Please add concrete in-game details.";
  }

  if (field.key !== "coordinates") {
    const hasLetter = /[a-z]/i.test(clean);
    if (!hasLetter) {
      return field.label + ": please include descriptive text, not only symbols or numbers.";
    }
  }

  return "";
}

function collectDiscoveryEvidenceInputCP(context) {
  const supports = Array.isArray(discoveryEvidenceState.supports)
    ? discoveryEvidenceState.supports.filter(Boolean)
    : [];
  const note = String(discoveryEvidenceState.note || "").trim();
  if (context && context.hasExternalEvidence && supports.length === 0) {
    const v2Schema = typeof DiscoveryCore !== "undefined" && DiscoveryCore.isKnowledgeGraphDiscoveryEnabled();
    if (v2Schema) {
      return { supports: ["entity_name"], note: note };
    }
    return { error: "Please map your evidence to at least one structured discovery field." };
  }
  if (note && note.split(/\s+/).filter(Boolean).length < 3) {
    return { error: "Evidence note is too short. Add a clearer explanation or leave it empty." };
  }
  return { supports: supports, note: note };
}

function buildDiscoveryEvidenceMetaCP(evidenceInput, uploadedFiles, imageUrl, youtubeUrl) {
  const supports = Array.isArray(evidenceInput && evidenceInput.supports) ? evidenceInput.supports : [];
  const note = evidenceInput && evidenceInput.note ? evidenceInput.note : "";
  const entries = [];

  if (imageUrl) {
    entries.push({
      kind: "image_url",
      label: "External image",
      url: imageUrl,
      supports: supports.slice(0, 12),
      note: note,
    });
  }
  if (youtubeUrl) {
    entries.push({
      kind: "video_url",
      label: "YouTube video",
      url: youtubeUrl,
      supports: supports.slice(0, 12),
      note: note,
    });
  }
  (uploadedFiles || []).forEach(function(file) {
    entries.push({
      kind: (file.type || "").startsWith("image/") ? "upload_image" : "upload_file",
      label: file.name,
      url: file.url || "",
      file_type: file.type || "application/octet-stream",
      supports: supports.slice(0, 12),
      note: note,
    });
  });
  return entries;
}

function buildStructuredDiscoveryContent(title, category, payload, relations, imageUrl, youtubeUrl) {
  const config = getDiscoveryConfig(category);
  const fieldLookup = {};
  (config.fields || []).forEach(function(field) {
    fieldLookup[field.key] = field;
  });
  const summary = buildDiscoverySummaryCP(payload, category);

  let html =
    '<section class="bl-discovery-entry-head">' +
      '<p class="bl-discovery-kicker">Community Discovery</p>' +
      '<h2>' + escapeHtmlCP(title || "Discovery") + '</h2>' +
      (summary ? '<p class="bl-discovery-summary">' + escapeHtmlCP(summary) + '</p>' : '') +
    '</section>';

  const groups = buildDiscoveryFactGroupsCP(payload, fieldLookup);
  html += '<section class="bl-discovery-fact-grid">';
  groups.forEach(function(group) {
    if (!group.items.length) return;
    html += '<div class="bl-discovery-fact-card"><h3>' + escapeHtmlCP(group.title) + '</h3><dl>';
    group.items.forEach(function(item) {
      html += '<div><dt>' + escapeHtmlCP(item.label) + '</dt><dd>' + escapeHtmlCP(String(item.value)) + '</dd></div>';
    });
    html += '</dl></div>';
  });
  html += '</section>';

  if (Array.isArray(relations) && relations.length > 0) {
    html += '<section class="bl-discovery-links"><h3>Related Entries</h3><ul>';
    relations.forEach(function(rel) {
      const relLabel = escapeHtmlCP(humanizeDiscoveryKeyCP(rel.relation_type || "related_to"));
      const href = rel.slug
        ? ("/wiki/post/?slug=" + encodeURIComponent(rel.slug))
        : (rel.id ? ("/wiki/post/?id=" + encodeURIComponent(rel.id)) : "");
      if (href) {
        html += '<li><strong>' + relLabel + ':</strong> <a href="' + href + '">' + escapeHtmlCP(rel.title || "Entry") + '</a></li>';
      } else {
        html += '<li><strong>' + relLabel + ':</strong> ' + escapeHtmlCP(rel.title || "Entry") + '</li>';
      }
    });
    html += '</ul></section>';
  }

  if (imageUrl) {
    const safeImage = escapeAttrCP(imageUrl);
    html += '<section class="bl-discovery-media"><h3>Discovery Image</h3><p><a href="' + safeImage + '" target="_blank" rel="noopener">Open image</a></p><p><img src="' + safeImage + '" alt="Discovery image" /></p></section>';
  }
  if (youtubeUrl) {
    const safeVideo = escapeAttrCP(youtubeUrl);
    html += '<section class="bl-discovery-media"><h3>Discovery Video</h3><p><a href="' + safeVideo + '" target="_blank" rel="noopener">Watch on YouTube</a></p></section>';
  }
  return html;
}

function buildDiscoverySummaryCP(payload, category) {
  const data = payload && typeof payload === "object" ? payload : {};
  const name = String(data.entity_name || "This discovery").trim();
  const place = getDiscoveryPrimaryPlaceCP(data);
  const confidence = String(data.confidence_level || "").replace(/^\d-/, "").replace(/-/g, " ");
  const loot = String(data.dropped_items || data.loot_or_rewards || data.resources_or_rewards || "").trim();
  const parts = [];

  parts.push(name + (place ? " was reported in " + place : " was reported by the community"));
  if (loot) parts.push("The report includes loot or reward observations");
  if (confidence) parts.push("confidence is marked as " + confidence);
  return parts.join(", ") + ".";
}

function buildDiscoveryFactGroupsCP(payload, fieldLookup) {
  const data = payload && typeof payload === "object" ? payload : {};
  const used = new Set();
  const groups = [
    { title: "Identity", keys: ["discovery_type", "entity_name", "alt_names", "rarity", "confidence_level", "impact_area"], items: [] },
    { title: "Location", keys: ["world_name", "region_name", "found_in", "coordinates", "climate"], items: [] },
    { title: "Encounter", keys: ["time_of_day", "weather_condition", "biome_context", "spawn_conditions", "trigger_conditions", "requirements", "group_size", "combat_outcome", "mountable", "health_points", "taming_method", "key_item_used"], items: [] },
    { title: "Loot & Rewards", keys: ["dropped_items", "loot_or_rewards", "resources_or_rewards", "dropped_by", "source_type", "drop_rate_observation", "drop_conditions", "loot_conditions"], items: [] },
    { title: "Verification", keys: ["how_to_reproduce", "observed_result", "expected_result", "first_seen_version", "last_confirmed_version", "automation_tags", "notes"], items: [] },
  ];

  groups.forEach(function(group) {
    group.keys.forEach(function(key) {
      const value = data[key];
      if (value == null || value === "") return;
      used.add(key);
      group.items.push({
        label: fieldLookup[key]?.label || humanizeDiscoveryKeyCP(key),
        value: value,
      });
    });
  });

  Object.keys(data).forEach(function(key) {
    if (used.has(key) || data[key] == null || data[key] === "") return;
    groups[groups.length - 1].items.push({
      label: fieldLookup[key]?.label || humanizeDiscoveryKeyCP(key),
      value: data[key],
    });
  });

  return groups;
}

function humanizeDiscoveryKeyCP(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
    .trim();
}

function buildDiscoveryAutoTitle(payload, category) {
  const safePayload = payload && typeof payload === "object" ? payload : {};
  const entityName = String(safePayload.entity_name || "").trim();
  const primaryPlace = getDiscoveryPrimaryPlaceCP(safePayload);
  const categoryLabel = category ? String(category).charAt(0).toUpperCase() + String(category).slice(1) : "Discovery";

  if (entityName && primaryPlace) {
    if (/^(?:near|at|around|by|close to|inside|within)\b/i.test(primaryPlace)) {
      return entityName + " " + primaryPlace;
    }
    return entityName + " in " + primaryPlace;
  }
  if (entityName) {
    return entityName;
  }
  if (primaryPlace) {
    return categoryLabel + " in " + primaryPlace;
  }
  return categoryLabel + " Report " + new Date().toISOString().slice(0, 10);
}

function getDiscoveryPrimaryPlaceCP(payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  const encounter = getMeaningfulDiscoveryValueCP(data.encounter_context)
    || getMeaningfulDiscoveryValueCP(data.location_hint);
  if (encounter) return encounter;
  const foundIn = getMeaningfulDiscoveryValueCP(data.found_in);
  if (foundIn && !isGenericDiscoveryAreaCP(foundIn)) return foundIn;
  const region = getMeaningfulDiscoveryValueCP(data.region_name);
  if (region && !isGenericDiscoveryAreaCP(region)) return region;
  const biome = getMeaningfulDiscoveryValueCP(data.biome_context);
  if (biome && !isGenericDiscoveryAreaCP(biome)) return humanizeDiscoveryKeyCP(biome);
  const inferred = inferPlaceFromDiscoveryTextCP([
    data.how_to_reproduce,
    data.spawn_conditions,
    data.taming_method,
    data.observed_result,
  ]);
  if (inferred) return inferred;
  const world = getMeaningfulDiscoveryValueCP(data.world_name);
  if (world && !isGenericDiscoveryAreaCP(world)) return world;
  return "";
}

function isGenericDiscoveryAreaCP(value) {
  const lower = String(value || "").trim().toLowerCase();
  return ["central", "center", "north", "northern", "south", "southern", "east", "eastern", "west", "western", "middle", "upper", "lower", "inner", "outer"].includes(lower);
}

function inferPlaceFromDiscoveryTextCP(values) {
  const text = (values || []).map(function(value) { return String(value || ""); }).join(" ");
  const match = text.match(/\b(?:in|inside|within|around|near)\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/);
  if (!match) return "";
  const place = getMeaningfulDiscoveryValueCP(match[1]);
  return place && !isGenericDiscoveryAreaCP(place) ? place : "";
}

function getMeaningfulDiscoveryValueCP(value) {
  const clean = String(value || "").trim();
  const lower = clean.toLowerCase();
  if (!clean) return "";
  if (["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) return "";
  return clean;
}

function generateDiscoveryRecordIdCP() {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return "DISC-" + Date.now() + "-" + rand;
}

function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (err) {
    return false;
  }
}

function isValidYoutubeUrl(value) {
  if (!isValidHttpUrl(value)) return false;
  try {
    const url = new URL(value);
    const host = (url.hostname || "").toLowerCase();
    return host.includes("youtube.com") || host.includes("youtu.be");
  } catch (err) {
    return false;
  }
}

function escapeHtmlCP(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function escapeAttrCP(value) {
  return String(value == null ? "" : value).replace(/"/g, "&quot;");
}

function collectPostMetaCP() {
  const phase = (document.getElementById("postUpdatePhase")?.value || "").trim();
  const patchTag = (document.getElementById("postPatchTag")?.value || "").trim();
  const sourceUrl = (document.getElementById("postSourceUrl")?.value || "").trim();

  if (sourceUrl && !isValidHttpUrl(sourceUrl)) {
    return { _error: "Please provide a valid source URL (http/https)." };
  }

  return {
    update_phase: phase || null,
    patch_tag: patchTag || null,
    source_url: sourceUrl || null,
  };
}

function validateGuideReferencesCP() {
  if (guideReferenceState.length > 12) {
    return "Please limit guide references to 12 entries.";
  }
  return "";
}

function parsePostMetaCP(html) {
  const match = String(html || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}

function normalizePostMetaCP(meta) {
  if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.serializePostMetaForStorage) {
    return KnowledgeRelations.serializePostMetaForStorage(meta);
  }
  if (!meta || typeof meta !== "object") return null;
  const out = {};
  if (meta.update_phase) out.update_phase = String(meta.update_phase).slice(0, 32);
  if (meta.patch_tag) out.patch_tag = String(meta.patch_tag).slice(0, 40);
  if (meta.source_url) out.source_url = String(meta.source_url).slice(0, 500);
  if (meta.subcategory) out.subcategory = String(meta.subcategory).slice(0, 60);
  if (meta.discovery_form) out.discovery_form = String(meta.discovery_form).slice(0, 16);
  if (meta.content_origin) out.content_origin = String(meta.content_origin).slice(0, 16);
  if (meta.discovery_payload && typeof meta.discovery_payload === "object") {
    const payload = {};
    Object.keys(meta.discovery_payload).forEach(function(key) {
      const value = meta.discovery_payload[key];
      if (value == null || value === "") return;
      payload[String(key).slice(0, 60)] = String(value).slice(0, 1400);
    });
    if (Object.keys(payload).length) out.discovery_payload = payload;
  }
  if (Array.isArray(meta.discovery_relations)) {
    out.discovery_relations = meta.discovery_relations.slice(0, 40).map(function(rel) {
      return {
        group: String(rel.group || "").slice(0, 40),
        relation_type: String(rel.relation_type || "related_to").slice(0, 40),
        id: rel.id || null,
        slug: rel.slug ? String(rel.slug).slice(0, 160) : null,
        title: String(rel.title || "").slice(0, 140),
        category: rel.category ? String(rel.category).slice(0, 60) : null,
        post_type: rel.post_type ? String(rel.post_type).slice(0, 40) : null,
        target_entity_type: rel.target_entity_type ? String(rel.target_entity_type).slice(0, 40) : null,
        confidence: Number.isFinite(Number(rel.confidence)) ? Math.max(0, Math.min(100, Number(rel.confidence))) : null,
        auto_inferred: !!rel.auto_inferred,
        resolved: !!rel.resolved,
        visibility: rel.visibility ? String(rel.visibility).slice(0, 20) : null,
        source_post_id: rel.source_post_id || null,
        source_post_slug: rel.source_post_slug ? String(rel.source_post_slug).slice(0, 160) : null,
        source_post_title: rel.source_post_title ? String(rel.source_post_title).slice(0, 140) : null,
        source_date: rel.source_date ? String(rel.source_date).slice(0, 40) : null,
        report_count: Number.isFinite(Number(rel.report_count)) ? Math.max(1, Number(rel.report_count)) : null,
        direction: rel.direction ? String(rel.direction).slice(0, 20) : null,
      };
    }).filter(function(rel) {
      return !!rel.title;
    });
  }
  if (typeof meta.discovery_relations_skipped === "boolean") {
    out.discovery_relations_skipped = meta.discovery_relations_skipped;
  }
  if (meta.discovery_record_id) out.discovery_record_id = String(meta.discovery_record_id).slice(0, 64);
  if (meta.discovery_record_status) out.discovery_record_status = String(meta.discovery_record_status).slice(0, 40);
  if (meta.discovery_form) out.discovery_form = String(meta.discovery_form).slice(0, 16);
  if (meta.content_origin) out.content_origin = String(meta.content_origin).slice(0, 16);
  if (meta.discovery_submitted_at) out.discovery_submitted_at = String(meta.discovery_submitted_at).slice(0, 40);
  if (Array.isArray(meta.discovery_evidence)) {
    out.discovery_evidence = meta.discovery_evidence.slice(0, 20).map(function(item) {
      return {
        kind: String(item.kind || "evidence").slice(0, 40),
        label: String(item.label || "Evidence").slice(0, 140),
        url: item.url ? String(item.url).slice(0, 600) : "",
        file_type: item.file_type ? String(item.file_type).slice(0, 80) : null,
        supports: Array.isArray(item.supports) ? item.supports.slice(0, 12).map(function(key) { return String(key).slice(0, 60); }) : [],
        note: item.note ? String(item.note).slice(0, 400) : "",
      };
    }).filter(function(item) {
      return !!item.url || !!item.label;
    });
  }
  if (typeof KnowledgeRelations !== "undefined") {
    const knowledgeMeta = KnowledgeRelations.normalizeKnowledgeMeta(meta);
    if (knowledgeMeta) {
      if (knowledgeMeta.knowledge_entry) out.knowledge_entry = knowledgeMeta.knowledge_entry;
      if (knowledgeMeta.knowledge_graph) out.knowledge_graph = knowledgeMeta.knowledge_graph;
    }
  }
  if (Array.isArray(meta.guide_references)) {
    out.guide_references = meta.guide_references.slice(0, 12).map(function(ref) {
      return {
        id: ref.id || null,
        slug: ref.slug ? String(ref.slug).slice(0, 160) : null,
        title: String(ref.title || "").slice(0, 140),
        category: ref.category ? String(ref.category).slice(0, 60) : null,
        post_type: ref.post_type ? String(ref.post_type).slice(0, 40) : null,
      };
    }).filter(function(ref) {
      return !!ref.title;
    });
  }
  return Object.keys(out).length ? out : null;
}

function stripPostMetaCP(html) {
  return String(html || "").replace(/<!--BLMETA\s+[\s\S]*?-->/gi, "").trim();
}

function injectPostMetaCP(html, meta) {
  const cleaned = stripPostMetaCP(html);
  let sourceMeta = meta && typeof meta === "object" ? meta : {};
  if (typeof BoundLoreTestData !== "undefined") {
    sourceMeta = BoundLoreTestData.markMeta(sourceMeta);
  }
  const normalized = normalizePostMetaCP(sourceMeta);
  if (!normalized) return cleaned;
  const json = JSON.stringify(normalized).replace(/-->/g, "--\\>");
  return cleaned + "\n<!--BLMETA " + json + " -->";
}
