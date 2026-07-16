let editQuill;
let editPost = null;
let editCurrentType = "guide";
let editUserId = null;
let editIsAdmin = false;
let currentEditDiscoveryCategory = "";
let currentEditWikiCategory = "";
let structuredDiscoveryEditEnabled = false;
let editDiscoveryFieldState = {};
let editGuideReferenceState = [];
let editGuideReferenceSuggestions = [];
let editGuideReferenceCategory = "";
let editGuideReferenceTimer = null;
let editDiscoveryEvidenceState = {
  supports: [],
  note: "",
};
let editDiscoveryRelationState = {
  items: [],
  creatures: [],
  locations: [],
  guides: [],
};
let editDiscoverySuggestionState = {
  items: [],
  creatures: [],
  locations: [],
  guides: [],
};
const editRelationInputTimers = {};
const EDIT_DISCOVERY_PLACEHOLDER_VALUES = [
  "asdf", "qwerty", "test", "todo", "none", "n/a", "na", "idk", "???", "12345"
];
const EDIT_DISCOVERY_SKIP_VALUES = ["unclear", "no", "not observed", "unknown", "not sure"];
let editSubmitInFlight = false;

function patchModeUserMessageEP(err) {
  if (typeof WikiPatchMode !== "undefined" && WikiPatchMode && typeof WikiPatchMode.getUserMessage === "function") {
    return WikiPatchMode.getUserMessage(err);
  }
  return "This action cannot be used right now for safety reasons.";
}

async function enforcePatchModeBeforeWriteEP(errorEl) {
  try {
    if (typeof WikiPatchMode === "undefined" || typeof WikiPatchMode.assertCanSubmit !== "function") {
      var missing = new Error(patchModeUserMessageEP({ code: "PATCH_MODE_UNAVAILABLE" }));
      missing.code = "PATCH_MODE_UNAVAILABLE";
      throw missing;
    }
    await WikiPatchMode.assertCanSubmit();
    return true;
  } catch (err) {
    if (errorEl) {
      errorEl.textContent = patchModeUserMessageEP(err);
      errorEl.style.display = "block";
    }
    return false;
  }
}

document.addEventListener("DOMContentLoaded", initEditPost);

async function initEditPost() {
  const loading = document.getElementById("editLoadingBox");
  const denied = document.getElementById("editDeniedBox");
  const form = document.getElementById("editPostForm");
  if (form && typeof WikiPatchMode !== "undefined" && WikiPatchMode.bindForm) {
    WikiPatchMode.bindForm(form);
  } else if (form) {
    const submitBtn = form.querySelector("button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.setAttribute("aria-disabled", "true");
    }
  }

  editQuill = new Quill("#editPostEditor", {
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

  structuredDiscoveryEditEnabled = typeof isStructuredDiscoveryEnabled === "function"
    ? isStructuredDiscoveryEnabled()
    : false;
  if (typeof ensureCategoryExtensionsLoaded === "function") {
    await ensureCategoryExtensionsLoaded();
  }
  fillCategorySelectors();
  syncEditDiscoveryModeHint();

  document.getElementById("btnEditTypeGuide").addEventListener("click", function () {
    setEditPostType("guide");
  });
  document.getElementById("btnEditTypeDiscovery").addEventListener("click", function () {
    setEditPostType("discovery");
  });
  document.getElementById("btnEditTypeWiki").addEventListener("click", function () {
    setEditPostType("wiki");
  });
  const editDiscoveryCategorySelect = document.getElementById("editDiscoveryCategory");
  const editWikiCategorySelect = document.getElementById("editWikiCategory");
  if (editDiscoveryCategorySelect) {
    editDiscoveryCategorySelect.addEventListener("change", function() {
      currentEditDiscoveryCategory = this.value;
      refreshEditDiscoverySubcategoryOptions();
      renderEditDiscoveryStructuredFields();
      renderEditDiscoveryRelationFields();
    });
  }
  if (editWikiCategorySelect) {
    editWikiCategorySelect.addEventListener("change", function() {
      currentEditWikiCategory = this.value;
      refreshEditWikiSubcategoryOptions();
    });
  }
  form.addEventListener("submit", handleEditSubmit);

  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const id = params.get("id");

  if (!slug && !id) {
    loading.style.display = "none";
    denied.style.display = "block";
    denied.querySelector("p").textContent = "Missing post identifier.";
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData || !sessionData.session) {
    window.location.href = "/wiki/login/";
    return;
  }

  editUserId = sessionData.session.user.id;

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", editUserId)
    .single();

  editIsAdmin = !!(myProfile && myProfile.role === "admin");
  const wikiBtn = document.getElementById("btnEditTypeWiki");
  if (wikiBtn) {
    wikiBtn.style.display = editIsAdmin ? "inline-flex" : "none";
  }

  let query = supabase.from("posts").select("*");
  if (slug) {
    query = query.eq("slug", slug);
  } else {
    query = query.eq("id", id);
  }

  const { data: post, error } = await query.single();
  if (error || !post) {
    loading.style.display = "none";
    denied.style.display = "block";
    denied.querySelector("p").textContent = "Post not found.";
    return;
  }

  editPost = post;

  const existingMeta = parsePostMetaEP(post.content || "");
  document.getElementById("editPostUpdatePhase").value = existingMeta.update_phase || "";
  document.getElementById("editPostPatchTag").value = existingMeta.patch_tag || "";
  document.getElementById("editPostSourceUrl").value = existingMeta.source_url || "";

  const canEdit = editIsAdmin || post.author_id === editUserId;
  if (!canEdit) {
    loading.style.display = "none";
    denied.style.display = "block";
    return;
  }

  document.getElementById("editPostTitle").value = post.title || "";
  const cleanHtml = stripPostMetaEP(post.content || "") || "";
  editQuill.setText("");
  if (cleanHtml && cleanHtml !== "<p><br></p>") {
    editQuill.clipboard.dangerouslyPasteHTML(cleanHtml);
  }

  const postType = post.post_type === "wiki"
    ? "wiki"
    : (post.post_type === "discovery" || post.is_discovery ? "discovery" : "guide");
  setEditPostType(postType);

  if (postType === "guide") {
    document.getElementById("editGuideSubcategory").value = post.guide_subcategory || "";
    editGuideReferenceState = Array.isArray(existingMeta.guide_references) ? existingMeta.guide_references.slice() : [];
    renderEditGuideReferenceFields();
  } else if (postType === "discovery") {
    document.getElementById("editDiscoveryCategory").value = post.category || "";
    currentEditDiscoveryCategory = post.category || "";
    refreshEditDiscoverySubcategoryOptions(existingMeta.subcategory || post.guide_subcategory || "");
    editDiscoveryFieldState = existingMeta.discovery_payload && typeof existingMeta.discovery_payload === "object"
      ? Object.assign({}, existingMeta.discovery_payload)
      : {};
    editDiscoveryEvidenceState = hydrateEditDiscoveryEvidenceState(existingMeta.discovery_evidence);
    editDiscoveryRelationState = {
      items: [], creatures: [], locations: [], guides: [],
    };
    if (Array.isArray(existingMeta.discovery_relations)) {
      const relationConfig = getEditDiscoveryRelationConfig();
      existingMeta.discovery_relations.forEach(function(rel) {
        const key = String(rel.group || "").toLowerCase();
        if (!editDiscoveryRelationState[key]) return;
        editDiscoveryRelationState[key].push({
          id: rel.id || null,
          slug: rel.slug || null,
          title: rel.title || "",
          category: rel.category || null,
          post_type: rel.post_type || null,
          relation_type: rel.relation_type || relationConfig[key].relationType,
          resolved: !!rel.resolved,
        });
      });
    }
    renderEditDiscoveryStructuredFields();
    renderEditDiscoveryRelationFields();
    renderEditDiscoveryEvidenceFields();
  } else {
    document.getElementById("editWikiCategory").value = post.category || "";
    currentEditWikiCategory = post.category || "";
    refreshEditWikiSubcategoryOptions(existingMeta.subcategory || "");
  }

  loading.style.display = "none";
  form.style.display = "block";
}

function fillCategorySelectors() {
  const guideSelect = document.getElementById("editGuideSubcategory");
  const discoverySelect = document.getElementById("editDiscoveryCategory");
  const wikiSelect = document.getElementById("editWikiCategory");
  const guideSubcategories = Array.isArray(window.BOUNDLORE_GUIDE_SUBCATEGORIES)
    ? window.BOUNDLORE_GUIDE_SUBCATEGORIES
    : (typeof BOUNDLORE_GUIDE_SUBCATEGORIES !== "undefined" ? BOUNDLORE_GUIDE_SUBCATEGORIES : []);
  const categories = Array.isArray(window.BOUNDLORE_CATEGORIES)
    ? window.BOUNDLORE_CATEGORIES
    : (typeof BOUNDLORE_CATEGORIES !== "undefined" ? BOUNDLORE_CATEGORIES : []);

  if (guideSelect) {
    guideSelect.innerHTML = '<option value="">Choose guide type...</option>';
  }
  if (discoverySelect) {
    discoverySelect.innerHTML = '<option value="">Choose category...</option>';
  }
  if (wikiSelect) {
    wikiSelect.innerHTML = '<option value="">Choose wiki category...</option>';
  }

  if (guideSelect && Array.isArray(guideSubcategories)) {
    guideSubcategories.forEach(function (cat) {
      const opt = document.createElement("option");
      opt.value = cat.slug;
      opt.textContent = cat.label;
      guideSelect.appendChild(opt);
    });
  }

  if (discoverySelect) {
    const discoveryCategories = typeof getDiscoveryCategoryOptions === "function"
      ? getDiscoveryCategoryOptions()
      : categories.filter(function(cat) { return cat.slug !== "guides"; });
    discoveryCategories.forEach(function(cat) {
      const opt = document.createElement("option");
      opt.value = cat.slug;
      opt.textContent = (cat.icon ? (cat.icon + " ") : "") + cat.label;
      discoverySelect.appendChild(opt);
    });
  }

  if (wikiSelect && Array.isArray(categories)) {
    categories
      .filter(function (cat) {
        return cat.slug !== "guides" && cat.slug !== "guilds" && cat.slug !== "community";
      })
      .forEach(function (cat) {
        const opt = document.createElement("option");
        opt.value = cat.slug;
        opt.textContent = cat.icon + " " + cat.label;
        wikiSelect.appendChild(opt);
      });
  }
}

function syncEditDiscoveryModeHint() {
  const hint = document.getElementById("editDiscoveryModeHint");
  if (!hint) return;
  hint.style.display = "block";
  hint.textContent = structuredDiscoveryEditEnabled
    ? "Structured discovery mode is active for this local session."
    : "Structured discovery mode is currently disabled. Add ?enableStructuredDiscovery=1 to test the structured edit flow locally.";
}

function setEditPostType(type) {
  editCurrentType = type === "discovery" ? "discovery" : (type === "wiki" ? "wiki" : "guide");

  document.getElementById("btnEditTypeGuide").classList.toggle("active", editCurrentType === "guide");
  document.getElementById("btnEditTypeDiscovery").classList.toggle("active", editCurrentType === "discovery");
  document.getElementById("btnEditTypeWiki").classList.toggle("active", editCurrentType === "wiki");

  const guideFields = document.getElementById("editGuideFields");
  const discoveryFields = document.getElementById("editDiscoveryFields");
  const wikiFields = document.getElementById("editWikiFields");
  const guideSelect = document.getElementById("editGuideSubcategory");
  const discoverySelect = document.getElementById("editDiscoveryCategory");
  const wikiSelect = document.getElementById("editWikiCategory");
  const discoverySubWrap = document.getElementById("editDiscoverySubcategoryWrap");
  const wikiSubWrap = document.getElementById("editWikiSubcategoryWrap");
  const contentWrap = document.getElementById("editContentEditorWrap");
  const structuredWrap = document.getElementById("editDiscoveryStructuredFields");
  const relationWrap = document.getElementById("editDiscoveryRelationFields");
  const evidenceWrap = document.getElementById("editDiscoveryEvidenceFields");
  const guideReferenceWrap = document.getElementById("editGuideReferenceFields");

  if (editCurrentType === "guide") {
    guideFields.style.display = "block";
    discoveryFields.style.display = "none";
    wikiFields.style.display = "none";
    guideSelect.removeAttribute("required");
    discoverySelect.removeAttribute("required");
    wikiSelect.removeAttribute("required");
    if (discoverySubWrap) discoverySubWrap.style.display = "none";
    if (wikiSubWrap) wikiSubWrap.style.display = "none";
    if (contentWrap) contentWrap.style.display = "block";
    if (guideReferenceWrap) guideReferenceWrap.style.display = "block";
    renderEditGuideReferenceFields();
  } else if (editCurrentType === "discovery") {
    guideFields.style.display = "none";
    discoveryFields.style.display = "block";
    wikiFields.style.display = "none";
    guideSelect.removeAttribute("required");
    discoverySelect.removeAttribute("required");
    wikiSelect.removeAttribute("required");
    refreshEditDiscoverySubcategoryOptions();
    renderEditDiscoveryStructuredFields();
    renderEditDiscoveryRelationFields();
    renderEditDiscoveryEvidenceFields();
    if (wikiSubWrap) wikiSubWrap.style.display = "none";
    if (structuredWrap) structuredWrap.style.display = structuredDiscoveryEditEnabled ? "block" : "none";
    if (relationWrap) relationWrap.style.display = structuredDiscoveryEditEnabled ? "block" : "none";
    if (evidenceWrap) evidenceWrap.style.display = structuredDiscoveryEditEnabled ? "block" : "none";
    if (contentWrap) contentWrap.style.display = structuredDiscoveryEditEnabled ? "none" : "block";
    if (guideReferenceWrap) guideReferenceWrap.style.display = "none";
  } else {
    guideFields.style.display = "none";
    discoveryFields.style.display = "none";
    wikiFields.style.display = "block";
    guideSelect.removeAttribute("required");
    discoverySelect.removeAttribute("required");
    wikiSelect.setAttribute("required", "required");
    if (discoverySubWrap) discoverySubWrap.style.display = "none";
    refreshEditWikiSubcategoryOptions();
    if (contentWrap) contentWrap.style.display = "block";
    if (structuredWrap) structuredWrap.style.display = "none";
    if (relationWrap) relationWrap.style.display = "none";
    if (evidenceWrap) evidenceWrap.style.display = "none";
    if (guideReferenceWrap) guideReferenceWrap.style.display = "none";
  }
}

async function handleEditSubmit(e) {
  e.preventDefault();
  if (editSubmitInFlight) return;

  const errEl = document.getElementById("editFormError");
  const okEl = document.getElementById("editFormOk");
  errEl.style.display = "none";
  okEl.style.display = "none";

  if (!(await enforcePatchModeBeforeWriteEP(errEl))) return;

  if (!editPost) {
    errEl.textContent = "Post context missing.";
    errEl.style.display = "block";
    return;
  }

  const title = document.getElementById("editPostTitle").value.trim();
  const content = (editQuill.root.innerHTML || "").trim();
  const meta = collectPostMetaEP();

  if (!title) {
    errEl.textContent = "Please enter a title.";
    errEl.style.display = "block";
    return;
  }

  if (editCurrentType !== "discovery" && (!content || content === "<p><br></p>")) {
    errEl.textContent = "Please write some content.";
    errEl.style.display = "block";
    return;
  }

  if (meta && meta._error) {
    errEl.textContent = meta._error;
    errEl.style.display = "block";
    return;
  }

  const updates = {
    title: title,
    status: "pending",
  };

  if (editCurrentType === "guide") {
    const subcat = document.getElementById("editGuideSubcategory").value;

    const wasGuide = editPost.post_type === "guide" || (!editPost.post_type && !editPost.is_discovery);
    const effectiveSubcat = subcat || editPost.guide_subcategory || null;

    if (!effectiveSubcat && !wasGuide) {
      errEl.textContent = "Please choose a guide type when switching to Guide.";
      errEl.style.display = "block";
      return;
    }
    const guideReferenceError = validateEditGuideReferencesEP();
    if (guideReferenceError) {
      errEl.textContent = guideReferenceError;
      errEl.style.display = "block";
      return;
    }

    updates.post_type = "guide";
    updates.category = wasGuide ? (editPost.category || null) : null;
    updates.guide_subcategory = effectiveSubcat;
    updates.is_discovery = false;
    if (editGuideReferenceState.length) {
      meta.guide_references = editGuideReferenceState.map(function(item) {
        return {
          id: item.id || null,
          slug: item.slug || null,
          title: item.title || "",
          category: item.category || null,
          post_type: item.post_type || null,
        };
      });
    } else {
      delete meta.guide_references;
    }
  } else if (editCurrentType === "discovery") {
    const cat = document.getElementById("editDiscoveryCategory").value;
    const subcat = document.getElementById("editDiscoverySubcategory")?.value || "";

    const wasDiscovery = editPost.post_type === "discovery" || editPost.is_discovery;
    const effectiveCategory = cat || editPost.category || null;
    const existingMeta = parsePostMetaEP(editPost.content || "");
    const effectiveSubcategory = subcat || existingMeta.subcategory || editPost.guide_subcategory || null;
    const needsSubcategory = typeof requiresSubcategoryForCategory === "function"
      ? requiresSubcategoryForCategory(effectiveCategory)
      : false;

    if (!effectiveCategory && !wasDiscovery) {
      errEl.textContent = "Please choose a discovery category when switching to Discovery.";
      errEl.style.display = "block";
      return;
    }
    if (needsSubcategory && !effectiveSubcategory) {
      errEl.textContent = "Please choose a subcategory for this category.";
      errEl.style.display = "block";
      return;
    }

    updates.post_type = "discovery";
    updates.category = effectiveCategory;
    updates.guide_subcategory = null;
    updates.is_discovery = true;
    if (structuredDiscoveryEditEnabled) {
      const structuredResult = collectEditStructuredDiscoveryInput();
      if (structuredResult.error) {
        errEl.textContent = structuredResult.error;
        errEl.style.display = "block";
        return;
      }
      const duplicateError = await detectDiscoveryDuplicateEP({
        excludeId: editPost.id,
        title: title,
        category: effectiveCategory,
        subcategory: needsSubcategory ? effectiveSubcategory : "",
        payload: structuredResult.payload,
      });
      if (duplicateError) {
        errEl.textContent = duplicateError;
        errEl.style.display = "block";
        return;
      }
      const evidenceInput = collectEditDiscoveryEvidenceInputEP(existingMeta.discovery_evidence);
      if (evidenceInput.error) {
        errEl.textContent = evidenceInput.error;
        errEl.style.display = "block";
        return;
      }
      meta.discovery_payload = structuredResult.payload;
      meta.discovery_relations = structuredResult.relations;
      meta.discovery_relations_skipped = !structuredResult.relations || structuredResult.relations.length === 0;
      meta.discovery_evidence = evidenceInput.items;
      updates.content = buildEditStructuredDiscoveryContent(title, effectiveCategory, structuredResult.payload, structuredResult.relations);
    } else {
      if (!content || content === "<p><br></p>") {
        errEl.textContent = "Please write discovery notes while the structured flow is disabled.";
        errEl.style.display = "block";
        return;
      }
      const duplicateError = await detectDiscoveryDuplicateEP({
        excludeId: editPost.id,
        title: title,
        category: effectiveCategory,
        subcategory: needsSubcategory ? effectiveSubcategory : "",
        payload: null,
      });
      if (duplicateError) {
        errEl.textContent = duplicateError;
        errEl.style.display = "block";
        return;
      }
      delete meta.discovery_payload;
      delete meta.discovery_relations;
      delete meta.discovery_relations_skipped;
      delete meta.discovery_evidence;
      updates.content = content;
    }
    if (needsSubcategory) {
      meta.subcategory = effectiveSubcategory;
    } else {
      delete meta.subcategory;
    }
  } else {
    if (!editIsAdmin) {
      errEl.textContent = "Only admins can save wiki posts.";
      errEl.style.display = "block";
      return;
    }

    const wikiCategory = document.getElementById("editWikiCategory").value;
    const wikiSubcategory = document.getElementById("editWikiSubcategory")?.value || "";
    const existingMeta = parsePostMetaEP(editPost.content || "");
    const effectiveCategory = wikiCategory || editPost.category || null;
    const effectiveSubcategory = wikiSubcategory || existingMeta.subcategory || null;
    const needsSubcategory = typeof requiresSubcategoryForCategory === "function"
      ? requiresSubcategoryForCategory(effectiveCategory)
      : false;

    if (!effectiveCategory) {
      errEl.textContent = "Please choose a wiki category.";
      errEl.style.display = "block";
      return;
    }
    if (needsSubcategory && !effectiveSubcategory) {
      errEl.textContent = "Please choose a wiki subcategory for this category.";
      errEl.style.display = "block";
      return;
    }

    updates.post_type = "wiki";
    updates.category = effectiveCategory;
    updates.guide_subcategory = null;
    updates.is_discovery = false;
    if (needsSubcategory) {
      meta.subcategory = effectiveSubcategory;
    } else {
      delete meta.subcategory;
    }
  }

  if (editCurrentType !== "discovery") {
    updates.content = injectPostMetaEP(content, meta);
  } else {
    updates.content = injectPostMetaEP(updates.content, meta);
  }

  if (!(await enforcePatchModeBeforeWriteEP(errEl))) return;

  editSubmitInFlight = true;
  const submitBtn = document.querySelector("#editPostForm button[type='submit']");
  if (submitBtn) submitBtn.disabled = true;

  let updateQuery = supabase.from("posts").update(updates);
  if (editIsAdmin) {
    updateQuery = updateQuery.eq("id", editPost.id);
  } else {
    updateQuery = updateQuery.eq("id", editPost.id).eq("author_id", editUserId);
  }

  const { error } = await updateQuery;

  editSubmitInFlight = false;
  if (submitBtn) submitBtn.disabled = false;

  if (error) {
    errEl.textContent = "Failed to save changes: " + error.message;
    errEl.style.display = "block";
    return;
  }

  okEl.textContent = "Changes saved. Your post has been set to pending review.";
  okEl.style.display = "block";

  const redirectSlug = editPost.slug;
  if (redirectSlug) {
    setTimeout(function () {
      window.location.href = BoundLoreEntityRoutes.buildEntityPostHref({ slug: redirectSlug });
    }, 900);
    return;
  }

  setTimeout(function () {
    window.location.href = "/wiki/post/?id=" + encodeURIComponent(editPost.id);
  }, 900);
}

function collectPostMetaEP() {
  const phase = (document.getElementById("editPostUpdatePhase")?.value || "").trim();
  const patchTag = (document.getElementById("editPostPatchTag")?.value || "").trim();
  const sourceUrl = (document.getElementById("editPostSourceUrl")?.value || "").trim();

  if (sourceUrl && !isValidHttpUrlEP(sourceUrl)) {
    return { _error: "Please provide a valid source URL (http/https)." };
  }

  return {
    update_phase: phase || null,
    patch_tag: patchTag || null,
    source_url: sourceUrl || null,
  };
}

function validateEditGuideReferencesEP() {
  if (editGuideReferenceState.length > 12) {
    return "Please limit guide references to 12 entries.";
  }
  return "";
}

function normalizePostMetaEP(meta) {
  if (!meta || typeof meta !== "object") return null;
  const out = {};
  if (meta.update_phase) out.update_phase = String(meta.update_phase).slice(0, 32);
  if (meta.patch_tag) out.patch_tag = String(meta.patch_tag).slice(0, 40);
  if (meta.source_url) out.source_url = String(meta.source_url).slice(0, 500);
  if (meta.subcategory) out.subcategory = String(meta.subcategory).slice(0, 60);
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
        resolved: !!rel.resolved,
      };
    }).filter(function(rel) {
      return !!rel.title;
    });
  }
  if (typeof meta.discovery_relations_skipped === "boolean") {
    out.discovery_relations_skipped = meta.discovery_relations_skipped;
  }
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

function getEditDiscoveryConfig(category) {
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

function getEditDiscoveryRelationConfig() {
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

function renderEditDiscoveryStructuredFields() {
  const wrap = document.getElementById("editDiscoveryStructuredFields");
  if (!wrap) return;
  if (!structuredDiscoveryEditEnabled) {
    wrap.innerHTML = "";
    wrap.style.display = "none";
    return;
  }
  const category = document.getElementById("editDiscoveryCategory")?.value || currentEditDiscoveryCategory || "";
  if (!category) {
    wrap.style.display = "block";
    wrap.innerHTML = "<h3 style='margin:0 0 8px;'>Discovery Data</h3><p class='field-hint'>Choose a discovery category first to load the specialized questions for that discovery type.</p>";
    return;
  }
  const config = getEditDiscoveryConfig(category);
  const fields = Array.isArray(config.fields) ? config.fields : [];

  wrap.innerHTML = "<h3 style='margin:0 0 8px;'>Discovery Data</h3>";
  fields.forEach(function(field) {
    const group = document.createElement("div");
    group.className = "form-group";
    group.style.marginTop = "10px";

    const label = document.createElement("label");
    label.setAttribute("for", "editDiscField_" + field.key);
    label.textContent = field.label + (field.required ? " *" : "");
    group.appendChild(label);

    let input;
    const current = editDiscoveryFieldState[field.key] != null ? editDiscoveryFieldState[field.key] : "";
    if (field.type === "textarea") {
      input = document.createElement("textarea");
      input.rows = 4;
      input.maxLength = field.max || 1200;
      input.className = "form-input";
      input.value = current;
    } else if (field.type === "select") {
      input = document.createElement("select");
      input.className = "form-input";
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
      input.value = current;
    }

    input.id = "editDiscField_" + field.key;
    input.addEventListener("input", function() {
      editDiscoveryFieldState[field.key] = input.value;
    });

    group.appendChild(input);
    wrap.appendChild(group);
  });
}

function renderEditDiscoveryRelationFields() {
  const wrap = document.getElementById("editDiscoveryRelationFields");
  if (!wrap) return;
  if (!structuredDiscoveryEditEnabled) {
    wrap.innerHTML = "";
    wrap.style.display = "none";
    return;
  }
  const category = document.getElementById("editDiscoveryCategory")?.value || currentEditDiscoveryCategory || "";
  if (!category) {
    wrap.style.display = "none";
    wrap.innerHTML = "";
    return;
  }
  const config = getEditDiscoveryConfig(category);
  const groups = Array.isArray(config.relations) ? config.relations : [];

  wrap.innerHTML = "";
  if (!groups.length) return;

  const title = document.createElement("h3");
  title.textContent = "Auto Relations";
  title.style.margin = "4px 0 8px";
  wrap.appendChild(title);

  groups.forEach(function(groupKey) {
    const cfg = getEditDiscoveryRelationConfig()[groupKey];
    if (!cfg) return;

    const box = document.createElement("div");
    box.className = "form-group";
    box.style.marginTop = "8px";

    const label = document.createElement("label");
    label.setAttribute("for", "editRelationInput_" + groupKey);
    label.textContent = cfg.label;
    box.appendChild(label);

    const input = document.createElement("input");
    input.id = "editRelationInput_" + groupKey;
    input.className = "form-input";
    input.placeholder = "Type at least 2 letters...";
    box.appendChild(input);

    const suggestions = document.createElement("div");
    suggestions.id = "editRelationSuggestions_" + groupKey;
    suggestions.style.marginTop = "6px";
    box.appendChild(suggestions);

    const selected = document.createElement("div");
    selected.id = "editRelationSelected_" + groupKey;
    selected.style.marginTop = "8px";
    box.appendChild(selected);

    input.addEventListener("input", function() {
      const value = (input.value || "").trim();
      if (editRelationInputTimers[groupKey]) {
        clearTimeout(editRelationInputTimers[groupKey]);
      }
      editRelationInputTimers[groupKey] = setTimeout(function() {
        fetchEditRelationSuggestions(groupKey, value);
      }, 220);
    });

    input.addEventListener("keydown", function(evt) {
      if (evt.key === "Enter") {
        evt.preventDefault();
        const value = (input.value || "").trim();
        if (!value) return;
        addEditDiscoveryRelation(groupKey, {
          title: value,
          slug: null,
          id: null,
          category: null,
          post_type: null,
          relation_type: cfg.relationType,
          resolved: false,
        });
        input.value = "";
        renderEditRelationSuggestions(groupKey);
      }
    });

    wrap.appendChild(box);
    renderEditRelationSuggestions(groupKey);
    renderEditSelectedRelations(groupKey);
  });
}

function renderEditDiscoveryEvidenceFields() {
  const wrap = document.getElementById("editDiscoveryEvidenceFields");
  if (!wrap) return;
  if (!structuredDiscoveryEditEnabled) {
    wrap.innerHTML = "";
    wrap.style.display = "none";
    return;
  }

  const category = document.getElementById("editDiscoveryCategory")?.value || currentEditDiscoveryCategory || "";
  if (!category) {
    wrap.style.display = "none";
    wrap.innerHTML = "";
    return;
  }
  const config = getEditDiscoveryConfig(category);
  const fields = Array.isArray(config.fields) ? config.fields : [];
  wrap.style.display = "block";
  wrap.className = "form-group bl-discovery-panel";
  wrap.innerHTML = "<h3 class='bl-discovery-panel-title'>Evidence Mapping</h3>";

  const help = document.createElement("p");
  help.className = "field-hint";
  help.textContent = "Review which structured facts the existing discovery evidence supports.";
  wrap.appendChild(help);

  const supportsBox = document.createElement("div");
  supportsBox.className = "bl-evidence-grid";

  fields.forEach(function(field) {
    const label = document.createElement("label");
    label.className = "bl-evidence-option";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = field.key;
    checkbox.checked = editDiscoveryEvidenceState.supports.includes(field.key);
    checkbox.addEventListener("change", function() {
      if (checkbox.checked) {
        if (!editDiscoveryEvidenceState.supports.includes(field.key)) editDiscoveryEvidenceState.supports.push(field.key);
      } else {
        editDiscoveryEvidenceState.supports = editDiscoveryEvidenceState.supports.filter(function(item) { return item !== field.key; });
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
  noteLabel.setAttribute("for", "editDiscoveryEvidenceNote");
  noteLabel.textContent = "Evidence note (optional)";
  wrap.appendChild(noteLabel);

  const note = document.createElement("textarea");
  note.id = "editDiscoveryEvidenceNote";
  note.className = "form-input";
  note.rows = 3;
  note.maxLength = 400;
  note.placeholder = "Explain what the current evidence proves.";
  note.value = editDiscoveryEvidenceState.note || "";
  note.addEventListener("input", function() {
    editDiscoveryEvidenceState.note = note.value;
  });
  wrap.appendChild(note);
}

function renderEditGuideReferenceFields() {
  const wrap = document.getElementById("editGuideReferenceFields");
  if (!wrap) return;
  wrap.innerHTML = "<h3 class='bl-discovery-panel-title'>Guide References</h3>";

  const help = document.createElement("p");
  help.className = "field-hint";
  help.textContent = "Optionally link the entries this guide explains, uses, or recommends.";
  wrap.appendChild(help);

  const categoryLabel = document.createElement("label");
  categoryLabel.setAttribute("for", "editGuideReferenceCategory");
  categoryLabel.textContent = "Reference category";
  wrap.appendChild(categoryLabel);

  const categorySelect = document.createElement("select");
  categorySelect.id = "editGuideReferenceCategory";
  categorySelect.className = "form-input";
  categorySelect.innerHTML = '<option value="">Choose category...</option>';
  getGuideReferenceCategoryOptionsEP().forEach(function(cat) {
    const opt = document.createElement("option");
    opt.value = cat.slug;
    opt.textContent = cat.label;
    categorySelect.appendChild(opt);
  });
  categorySelect.value = editGuideReferenceCategory || "";
  categorySelect.addEventListener("change", function() {
    editGuideReferenceCategory = categorySelect.value;
    editGuideReferenceSuggestions = [];
    renderEditGuideReferenceFields();
  });
  wrap.appendChild(categorySelect);

  const inputLabel = document.createElement("label");
  inputLabel.setAttribute("for", "editGuideReferenceSearch");
  inputLabel.style.marginTop = "12px";
  inputLabel.textContent = "Find existing entry";
  wrap.appendChild(inputLabel);

  const input = document.createElement("input");
  input.id = "editGuideReferenceSearch";
  input.className = "form-input";
  input.placeholder = editGuideReferenceCategory ? "Type to search existing entries..." : "Choose a category first...";
  input.disabled = !editGuideReferenceCategory;
  input.addEventListener("input", function() {
    const value = (input.value || "").trim();
    if (editGuideReferenceTimer) clearTimeout(editGuideReferenceTimer);
    editGuideReferenceTimer = setTimeout(function() {
      fetchEditGuideReferenceSuggestionsEP(value);
    }, 220);
  });
  wrap.appendChild(input);

  const suggestions = document.createElement("div");
  suggestions.id = "editGuideReferenceSuggestions";
  suggestions.style.marginTop = "8px";
  wrap.appendChild(suggestions);

  const selected = document.createElement("div");
  selected.id = "editGuideReferenceSelected";
  selected.style.marginTop = "10px";
  wrap.appendChild(selected);

  renderEditGuideReferenceSuggestions();
  renderEditGuideReferenceSelected();
}

function getGuideReferenceCategoryOptionsEP() {
  const categories = Array.isArray(window.BOUNDLORE_CATEGORIES) ? window.BOUNDLORE_CATEGORIES : [];
  return categories.filter(function(cat) {
    return cat.slug !== "community" && cat.slug !== "news";
  }).concat([{ slug: "guides", label: "Guides" }]).filter(function(item, index, arr) {
    return arr.findIndex(function(other) { return other.slug === item.slug; }) === index;
  });
}

async function fetchEditGuideReferenceSuggestionsEP(term) {
  const cleanTerm = String(term || "").trim();
  if (!editGuideReferenceCategory || cleanTerm.length < 2) {
    editGuideReferenceSuggestions = [];
    renderEditGuideReferenceSuggestions();
    return;
  }

  let query = supabase
    .from("posts")
    .select("id, slug, title, category, post_type, status")
    .in("status", ["published", "approved"])
    .ilike("title", "%" + cleanTerm + "%")
    .limit(10);

  if (editGuideReferenceCategory === "guides") {
    query = query.eq("post_type", "guide");
  } else {
    query = query.eq("category", editGuideReferenceCategory);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) {
    editGuideReferenceSuggestions = [];
    renderEditGuideReferenceSuggestions();
    return;
  }

  editGuideReferenceSuggestions = data.map(function(item) {
    return {
      id: item.id,
      slug: item.slug || null,
      title: item.title,
      category: item.category || editGuideReferenceCategory,
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

  renderEditGuideReferenceSuggestions();
}

function renderEditGuideReferenceSuggestions() {
  const wrap = document.getElementById("editGuideReferenceSuggestions");
  if (!wrap) return;
  wrap.innerHTML = "";
  editGuideReferenceSuggestions.forEach(function(item) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-secondary";
    btn.style.margin = "4px 6px 0 0";
    btn.textContent = item.title + " (" + (item.post_type === "guide" ? "Guide" : (item.category || "Entry")) + ")";
    btn.addEventListener("click", function() {
      addEditGuideReferenceEP(item);
      editGuideReferenceSuggestions = [];
      renderEditGuideReferenceFields();
    });
    wrap.appendChild(btn);
  });
}

function addEditGuideReferenceEP(item) {
  const duplicate = editGuideReferenceState.some(function(existing) {
    if (item.id && existing.id) return existing.id === item.id;
    return String(existing.title || "").toLowerCase() === String(item.title || "").toLowerCase();
  });
  if (duplicate) return;
  editGuideReferenceState.push(item);
  renderEditGuideReferenceSelected();
}

function renderEditGuideReferenceSelected() {
  const wrap = document.getElementById("editGuideReferenceSelected");
  if (!wrap) return;
  if (!editGuideReferenceState.length) {
    wrap.innerHTML = "<span class='field-hint'>No guide references selected yet.</span>";
    return;
  }
  wrap.innerHTML = "";
  editGuideReferenceState.forEach(function(item, idx) {
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
      editGuideReferenceState.splice(idx, 1);
      renderEditGuideReferenceSelected();
    });
    chip.appendChild(removeBtn);
    wrap.appendChild(chip);
  });
}

async function fetchEditRelationSuggestions(groupKey, term) {
  const cleanTerm = String(term || "").trim();
  if (cleanTerm.length < 2) {
    editDiscoverySuggestionState[groupKey] = [];
    renderEditRelationSuggestions(groupKey);
    return;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, category, post_type, status")
    .in("status", ["published", "approved"])
    .ilike("title", "%" + cleanTerm + "%")
    .limit(10);

  if (error || !Array.isArray(data)) {
    editDiscoverySuggestionState[groupKey] = [];
    renderEditRelationSuggestions(groupKey);
    return;
  }

  editDiscoverySuggestionState[groupKey] = data.filter(function(item) {
    if (groupKey === "guides") return item.post_type === "guide";
    if (groupKey === "items") return item.category === "items";
    if (groupKey === "creatures") return item.category === "creatures";
    if (groupKey === "locations") return item.category === "locations" || item.category === "biomes";
    return true;
  }).map(function(item) {
    const relationConfig = getEditDiscoveryRelationConfig();
    return {
      id: item.id,
      slug: item.slug || null,
      title: item.title,
      category: item.category || null,
      post_type: item.post_type || null,
      relation_type: relationConfig[groupKey].relationType,
      resolved: true,
      suggestionScore: computeRelationSuggestionScoreEP(cleanTerm, item.title || ""),
    };
  }).filter(function(item) {
    return item.suggestionScore > 0;
  }).sort(function(a, b) {
    if (b.suggestionScore !== a.suggestionScore) return b.suggestionScore - a.suggestionScore;
    return String(a.title || "").localeCompare(String(b.title || ""));
  }).slice(0, 6);
  renderEditRelationSuggestions(groupKey);
}

function computeRelationSuggestionScoreEP(input, candidateTitle) {
  if (typeof scoreDiscoveryLookupMatch === "function") {
    return scoreDiscoveryLookupMatch(input, candidateTitle);
  }
  const query = normalizeDiscoveryCompareEP(input);
  const title = normalizeDiscoveryCompareEP(candidateTitle);
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

function renderEditRelationSuggestions(groupKey) {
  const wrap = document.getElementById("editRelationSuggestions_" + groupKey);
  if (!wrap) return;
  const suggestions = editDiscoverySuggestionState[groupKey] || [];
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
    const label = suggestion.post_type === "guide" ? "Guide" : (suggestion.category || "Entry");
    btn.textContent = suggestion.title + " (" + label + ")";
    btn.addEventListener("click", function() {
      addEditDiscoveryRelation(groupKey, suggestion);
      const input = document.getElementById("editRelationInput_" + groupKey);
      if (input) input.value = "";
      editDiscoverySuggestionState[groupKey] = [];
      renderEditRelationSuggestions(groupKey);
    });
    wrap.appendChild(btn);
  });
}

function addEditDiscoveryRelation(groupKey, relation) {
  const list = editDiscoveryRelationState[groupKey] || [];
  const duplicate = list.some(function(item) {
    if (relation.id && item.id) return item.id === relation.id;
    return String(item.title || "").toLowerCase() === String(relation.title || "").toLowerCase();
  });
  if (duplicate) return;
  list.push(relation);
  editDiscoveryRelationState[groupKey] = list;
  renderEditSelectedRelations(groupKey);
}

function renderEditSelectedRelations(groupKey) {
  const wrap = document.getElementById("editRelationSelected_" + groupKey);
  if (!wrap) return;
  const list = editDiscoveryRelationState[groupKey] || [];
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
      const entries = editDiscoveryRelationState[groupKey] || [];
      entries.splice(idx, 1);
      renderEditSelectedRelations(groupKey);
    });
    chip.appendChild(removeBtn);
    wrap.appendChild(chip);
  });
}

function collectEditStructuredDiscoveryInput() {
  const category = document.getElementById("editDiscoveryCategory")?.value || currentEditDiscoveryCategory || "";
  const config = getEditDiscoveryConfig(category);
  const payload = {};

  for (const field of config.fields || []) {
    const value = (editDiscoveryFieldState[field.key] == null ? "" : String(editDiscoveryFieldState[field.key])).trim();
    if (field.required && !value) {
      return { error: "Please fill the required field: " + field.label };
    }

    if (value && (field.type === "text" || field.type === "textarea")) {
      const qualityError = validateEditDiscoveryTextQuality(field, value);
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
  if (reproValue && !EDIT_DISCOVERY_SKIP_VALUES.includes(reproValue) && String(payload.how_to_reproduce || "").length < 20) {
    return { error: "Please provide clearer reproduction steps (at least 20 characters)." };
  }

  const relations = [];
  const relationConfig = getEditDiscoveryRelationConfig();
  Object.keys(relationConfig).forEach(function(groupKey) {
    const entries = editDiscoveryRelationState[groupKey] || [];
    entries.forEach(function(item) {
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

  return { payload: payload, relations: relations };
}

function validateEditDiscoveryTextQuality(field, value) {
  const clean = String(value || "").trim();
  const lower = clean.toLowerCase();

  if (EDIT_DISCOVERY_SKIP_VALUES.includes(lower)) {
    return "";
  }

  if (EDIT_DISCOVERY_PLACEHOLDER_VALUES.includes(lower)) {
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
  if (field.required && field.type === "textarea" && words.length < 4) {
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

function hydrateEditDiscoveryEvidenceState(evidenceItems) {
  const items = Array.isArray(evidenceItems) ? evidenceItems : [];
  const supports = [];
  let note = "";
  items.forEach(function(item) {
    (Array.isArray(item.supports) ? item.supports : []).forEach(function(key) {
      if (key && !supports.includes(key)) supports.push(key);
    });
    if (!note && item.note) note = String(item.note);
  });
  return { supports: supports, note: note };
}

function collectEditDiscoveryEvidenceInputEP(existingEvidence) {
  const supports = Array.isArray(editDiscoveryEvidenceState.supports)
    ? editDiscoveryEvidenceState.supports.filter(Boolean)
    : [];
  const note = String(editDiscoveryEvidenceState.note || "").trim();
  const items = (Array.isArray(existingEvidence) ? existingEvidence : []).map(function(item) {
    return {
      kind: item.kind || "evidence",
      label: item.label || "Evidence",
      url: item.url || "",
      file_type: item.file_type || null,
      supports: supports.slice(0, 12),
      note: note,
    };
  }).filter(function(item) {
    return !!item.url || !!item.label;
  });
  if (items.length > 0 && supports.length === 0) {
    return { error: "Please map existing discovery evidence to at least one structured field." };
  }
  if (note && note.split(/\s+/).filter(Boolean).length < 3) {
    return { error: "Evidence note is too short. Add a clearer explanation or leave it empty." };
  }
  return { items: items };
}

async function detectDiscoveryDuplicateEP(input) {
  const category = input && input.category ? input.category : "";
  const title = input && input.title ? input.title : "";
  if (!category || !title) return "";

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, category, guide_subcategory, content, status")
    .eq("is_discovery", true)
    .eq("category", category)
    .in("status", ["pending", "published", "approved"])
    .limit(40);

  if (error || !Array.isArray(data)) return "";

  const filtered = data.filter(function(candidate) {
    return candidate.id !== input.excludeId;
  });
  const bestMatch = filtered.map(function(candidate) {
    return {
      candidate: candidate,
      score: computeDiscoveryDuplicateScoreEP(input, candidate),
    };
  }).sort(function(a, b) {
    return b.score - a.score;
  })[0];

  if (bestMatch && bestMatch.score >= 7) {
    return 'Potential duplicate detected: "' + bestMatch.candidate.title + '" already looks very similar. Please refine the entry or update the existing discovery.';
  }

  return "";
}

function computeDiscoveryDuplicateScoreEP(input, candidate) {
  let score = 0;
  const inputTitle = normalizeDiscoveryCompareEP(input.title);
  const candidateTitle = normalizeDiscoveryCompareEP(candidate.title);
  if (inputTitle && candidateTitle && inputTitle === candidateTitle) score += 5;

  const candidateMeta = parsePostMetaEP(candidate.content || "");
  const inputSub = normalizeDiscoveryCompareEP(input.subcategory || "");
  const candidateSub = normalizeDiscoveryCompareEP(candidateMeta.subcategory || candidate.guide_subcategory || "");
  if (inputSub && candidateSub && inputSub === candidateSub) score += 1;

  const inputFoundIn = normalizeDiscoveryCompareEP(input.payload && input.payload.found_in ? input.payload.found_in : "");
  const candidatePayload = candidateMeta.discovery_payload && typeof candidateMeta.discovery_payload === "object" ? candidateMeta.discovery_payload : null;
  const candidateFoundIn = normalizeDiscoveryCompareEP(candidatePayload && candidatePayload.found_in ? candidatePayload.found_in : "");
  if (inputFoundIn && candidateFoundIn && inputFoundIn === candidateFoundIn) score += 3;

  score += Math.min(countSharedDiscoveryTermsEP(inputTitle, candidateTitle), 2);
  return score;
}

function normalizeDiscoveryCompareEP(value) {
  if (typeof normalizeDiscoveryLookupTerm === "function") {
    return normalizeDiscoveryLookupTerm(value);
  }
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countSharedDiscoveryTermsEP(a, b) {
  const termsA = typeof tokenizeDiscoveryLookupTerms === "function"
    ? tokenizeDiscoveryLookupTerms(a)
    : a.split(/\s+/).filter(function(term) { return term.length >= 4; });
  const termsB = new Set(typeof tokenizeDiscoveryLookupTerms === "function"
    ? tokenizeDiscoveryLookupTerms(b)
    : b.split(/\s+/).filter(function(term) { return term.length >= 4; }));
  return termsA.filter(function(term) { return termsB.has(term); }).length;
}

function buildEditStructuredDiscoveryContent(title, category, payload, relations) {
  const config = getEditDiscoveryConfig(category);
  const fieldLookup = {};
  (config.fields || []).forEach(function(field) {
    fieldLookup[field.key] = field;
  });

  let html =
    '<section class="discovery-entry-head" style="padding:14px 16px;border:1px solid rgba(255,215,0,0.35);border-radius:10px;background:linear-gradient(135deg,rgba(255,215,0,0.12),rgba(255,255,255,0.04));margin-bottom:12px;">' +
      '<p style="margin:0 0 6px;font-size:0.72rem;letter-spacing:0.08em;text-transform:uppercase;color:#d8b65d;">Community Discovery</p>' +
      '<h2 style="margin:0;font-size:1.2rem;line-height:1.35;">' + escapeHtmlEP(title || "Discovery") + '</h2>' +
    '</section>';

  html += '<h3>Structured Findings</h3><ul>';
  Object.keys(payload || {}).forEach(function(key) {
    const value = payload[key];
    if (value == null || value === "") return;
    const label = fieldLookup[key]?.label || key;
    html += '<li><strong>' + escapeHtmlEP(label) + ':</strong> ' + escapeHtmlEP(String(value)) + '</li>';
  });
  html += '</ul>';

  if (Array.isArray(relations) && relations.length) {
    html += '<h3>Related Entries</h3><ul>';
    relations.forEach(function(rel) {
      const relLabel = escapeHtmlEP(rel.relation_type || "related_to");
      if (rel.slug) {
        html += '<li><strong>' + relLabel + ':</strong> <a href="' + BoundLoreEntityRoutes.buildEntityPostHref({ slug: rel.slug }) + '">' + escapeHtmlEP(rel.title || "Entry") + '</a></li>';
      } else {
        html += '<li><strong>' + relLabel + ':</strong> ' + escapeHtmlEP(rel.title || "Entry") + '</li>';
      }
    });
    html += '</ul>';
  }

  return html;
}

function escapeHtmlEP(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function stripPostMetaEP(html) {
  return String(html || "").replace(/<!--BLMETA\s+[\s\S]*?-->/gi, "").trim();
}

function parsePostMetaEP(html) {
  const match = String(html || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}

function injectPostMetaEP(html, meta) {
  const cleaned = stripPostMetaEP(html);
  const normalized = normalizePostMetaEP(meta);
  if (!normalized) return cleaned;
  const json = JSON.stringify(normalized).replace(/-->/g, "--\\>");
  return cleaned + "\n<!--BLMETA " + json + " -->";
}

function isValidHttpUrlEP(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (err) {
    return false;
  }
}

function refreshEditDiscoverySubcategoryOptions(presetValue) {
  const wrap = document.getElementById("editDiscoverySubcategoryWrap");
  const select = document.getElementById("editDiscoverySubcategory");
  const category = document.getElementById("editDiscoveryCategory")?.value || currentEditDiscoveryCategory || "";
  if (!wrap || !select) return;

  const options = typeof getCategorySubcategories === "function" ? getCategorySubcategories(category) : [];
  if (!options.length) {
    wrap.style.display = "none";
    select.innerHTML = '<option value="">Choose a subcategory...</option>';
    select.removeAttribute("required");
    return;
  }

  wrap.style.display = "block";
  select.innerHTML = '<option value="">Choose a subcategory...</option>';
  options.forEach(function(optData) {
    const opt = document.createElement("option");
    opt.value = optData.slug;
    opt.textContent = optData.label;
    select.appendChild(opt);
  });
  select.setAttribute("required", "required");
  if (presetValue) select.value = presetValue;
}

function refreshEditWikiSubcategoryOptions(presetValue) {
  const wrap = document.getElementById("editWikiSubcategoryWrap");
  const select = document.getElementById("editWikiSubcategory");
  const category = document.getElementById("editWikiCategory")?.value || currentEditWikiCategory || "";
  if (!wrap || !select) return;

  const options = typeof getCategorySubcategories === "function" ? getCategorySubcategories(category) : [];
  if (!options.length) {
    wrap.style.display = "none";
    select.innerHTML = '<option value="">Choose a subcategory...</option>';
    select.removeAttribute("required");
    return;
  }

  wrap.style.display = "block";
  select.innerHTML = '<option value="">Choose a subcategory...</option>';
  options.forEach(function(optData) {
    const opt = document.createElement("option");
    opt.value = optData.slug;
    opt.textContent = optData.label;
    select.appendChild(opt);
  });
  select.setAttribute("required", "required");
  if (presetValue) select.value = presetValue;
}
