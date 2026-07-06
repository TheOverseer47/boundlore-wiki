let editQuill;
let editPost = null;
let editCurrentType = "guide";
let editUserId = null;
let editIsAdmin = false;
let currentEditDiscoveryCategory = "";

document.addEventListener("DOMContentLoaded", initEditPost);

async function initEditPost() {
  const loading = document.getElementById("editLoadingBox");
  const denied = document.getElementById("editDeniedBox");
  const form = document.getElementById("editPostForm");

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

  fillCategorySelectors();

  document.getElementById("btnEditTypeGuide").addEventListener("click", function () {
    setEditPostType("guide");
  });
  document.getElementById("btnEditTypeDiscovery").addEventListener("click", function () {
    setEditPostType("discovery");
  });
  const editDiscoveryCategorySelect = document.getElementById("editDiscoveryCategory");
  if (editDiscoveryCategorySelect) {
    editDiscoveryCategorySelect.addEventListener("change", function() {
      currentEditDiscoveryCategory = this.value;
      refreshEditDiscoverySubcategoryOptions();
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
  editQuill.root.innerHTML = stripPostMetaEP(post.content || "") || "";

  const postType = post.post_type === "discovery" || post.is_discovery ? "discovery" : "guide";
  setEditPostType(postType);

  if (postType === "guide") {
    document.getElementById("editGuideSubcategory").value = post.guide_subcategory || "";
  } else {
    document.getElementById("editDiscoveryCategory").value = post.category || "";
    currentEditDiscoveryCategory = post.category || "";
    refreshEditDiscoverySubcategoryOptions(post.guide_subcategory || "");
  }

  loading.style.display = "none";
  form.style.display = "block";
}

function fillCategorySelectors() {
  const guideSelect = document.getElementById("editGuideSubcategory");
  const discoverySelect = document.getElementById("editDiscoveryCategory");
  const guideSubcategories = Array.isArray(window.BOUNDLORE_GUIDE_SUBCATEGORIES)
    ? window.BOUNDLORE_GUIDE_SUBCATEGORIES
    : (typeof BOUNDLORE_GUIDE_SUBCATEGORIES !== "undefined" ? BOUNDLORE_GUIDE_SUBCATEGORIES : []);
  const categories = Array.isArray(window.BOUNDLORE_CATEGORIES)
    ? window.BOUNDLORE_CATEGORIES
    : (typeof BOUNDLORE_CATEGORIES !== "undefined" ? BOUNDLORE_CATEGORIES : []);

  if (guideSelect && Array.isArray(guideSubcategories)) {
    guideSubcategories.forEach(function (cat) {
      const opt = document.createElement("option");
      opt.value = cat.slug;
      opt.textContent = cat.label;
      guideSelect.appendChild(opt);
    });
  }

  if (discoverySelect && Array.isArray(categories)) {
    categories
      .filter(function (cat) {
        return cat.slug !== "guides";
      })
      .forEach(function (cat) {
        const opt = document.createElement("option");
        opt.value = cat.slug;
        opt.textContent = cat.icon + " " + cat.label;
        discoverySelect.appendChild(opt);
      });
  }
}

function setEditPostType(type) {
  editCurrentType = type === "discovery" ? "discovery" : "guide";

  document.getElementById("btnEditTypeGuide").classList.toggle("active", editCurrentType === "guide");
  document.getElementById("btnEditTypeDiscovery").classList.toggle("active", editCurrentType === "discovery");

  const guideFields = document.getElementById("editGuideFields");
  const discoveryFields = document.getElementById("editDiscoveryFields");
  const guideSelect = document.getElementById("editGuideSubcategory");
  const discoverySelect = document.getElementById("editDiscoveryCategory");
  const discoverySubWrap = document.getElementById("editDiscoverySubcategoryWrap");

  if (editCurrentType === "guide") {
    guideFields.style.display = "block";
    discoveryFields.style.display = "none";
    guideSelect.removeAttribute("required");
    discoverySelect.removeAttribute("required");
    if (discoverySubWrap) discoverySubWrap.style.display = "none";
  } else {
    guideFields.style.display = "none";
    discoveryFields.style.display = "block";
    guideSelect.removeAttribute("required");
    discoverySelect.removeAttribute("required");
    refreshEditDiscoverySubcategoryOptions();
  }
}

async function handleEditSubmit(e) {
  e.preventDefault();

  const errEl = document.getElementById("editFormError");
  const okEl = document.getElementById("editFormOk");
  errEl.style.display = "none";
  okEl.style.display = "none";

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

  if (!content || content === "<p><br></p>") {
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
    content: injectPostMetaEP(content, meta),
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

    updates.post_type = "guide";
    updates.category = wasGuide ? (editPost.category || null) : null;
    updates.guide_subcategory = effectiveSubcat;
    updates.is_discovery = false;
  } else {
    const cat = document.getElementById("editDiscoveryCategory").value;
    const subcat = document.getElementById("editDiscoverySubcategory")?.value || "";

    const wasDiscovery = editPost.post_type === "discovery" || editPost.is_discovery;
    const effectiveCategory = cat || editPost.category || null;
    const effectiveSubcategory = subcat || editPost.guide_subcategory || null;
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
    if (needsSubcategory) {
      meta.subcategory = effectiveSubcategory;
    }
  }

  let updateQuery = supabase.from("posts").update(updates);
  if (editIsAdmin) {
    updateQuery = updateQuery.eq("id", editPost.id);
  } else {
    updateQuery = updateQuery.eq("id", editPost.id).eq("author_id", editUserId);
  }

  const { error } = await updateQuery;

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
      window.location.href = "/wiki/post/?slug=" + encodeURIComponent(redirectSlug);
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

function normalizePostMetaEP(meta) {
  if (!meta || typeof meta !== "object") return null;
  const out = {};
  if (meta.update_phase) out.update_phase = String(meta.update_phase).slice(0, 32);
  if (meta.patch_tag) out.patch_tag = String(meta.patch_tag).slice(0, 40);
  if (meta.source_url) out.source_url = String(meta.source_url).slice(0, 500);
  if (meta.subcategory) out.subcategory = String(meta.subcategory).slice(0, 60);
  return Object.keys(out).length ? out : null;
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
