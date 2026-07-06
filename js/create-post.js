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
  if (discoveryCategorySelect) {
    discoveryCategorySelect.addEventListener("change", function() {
      currentDiscoveryCategory = this.value;
      refreshDiscoverySubcategoryOptions();
    });
  }

  document.getElementById("createPostForm").addEventListener("submit", handleSubmit);

  await initCreatePermissions();
  fillWikiCategories();

  const params = new URLSearchParams(window.location.search);
  const typeParam = (params.get("type") || "").toLowerCase();
  if (typeParam === "discovery") {
    setPostType("discovery");
  } else if (typeParam === "wiki" && createIsAdmin) {
    setPostType("wiki");
  }

  const presetCategory = (params.get("category") || params.get("cat") || "").toLowerCase();
  const presetSubcategory = (params.get("subcategory") || params.get("subcat") || "").toLowerCase();
  if (presetCategory && discoveryCategorySelect) {
    discoveryCategorySelect.value = presetCategory;
    currentDiscoveryCategory = presetCategory;
    refreshDiscoverySubcategoryOptions(presetSubcategory);
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
  const wikiCategory = document.getElementById("wikiCategory");

  if (type === "guide") {
    guideFields.style.display = "block";
    discoveryFields.style.display = "none";
    wikiFields.style.display = "none";
    guideSelect.setAttribute("required", "required");
    discoverySelect.removeAttribute("required");
    wikiCategory.removeAttribute("required");
    discoverySelect.value = "";
    wikiCategory.value = "";
    currentDiscoveryCategory = "";
    if (discoverySubWrap) discoverySubWrap.style.display = "none";
  } else if (type === "discovery") {
    guideFields.style.display = "none";
    discoveryFields.style.display = "block";
    wikiFields.style.display = "none";
    guideSelect.removeAttribute("required");
    discoverySelect.setAttribute("required", "required");
    wikiCategory.removeAttribute("required");
    guideSelect.value = "";
    wikiCategory.value = "";
    currentDiscoveryCategory = discoverySelect.value || currentDiscoveryCategory || "";
    refreshDiscoverySubcategoryOptions();
  } else {
    guideFields.style.display = "none";
    discoveryFields.style.display = "none";
    wikiFields.style.display = "block";
    guideSelect.removeAttribute("required");
    discoverySelect.removeAttribute("required");
    wikiCategory.setAttribute("required", "required");
    guideSelect.value = "";
    discoverySelect.value = "";
  }
}

async function handleSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("formError");
  errorEl.style.display = "none";
  const submitBtn = document.querySelector("#createPostForm button[type='submit']");

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    errorEl.textContent = "You must be logged in to submit a post.";
    errorEl.style.display = "block";
    return;
  }
  const userId = sessionData.session.user.id;

  const title = document.getElementById("postTitle").value.trim();
  const content = quillEditor.root.innerHTML.trim();
  const postMeta = collectPostMetaCP();
  const mediaInput = document.getElementById("postMedia");
  const files = mediaInput && mediaInput.files ? Array.from(mediaInput.files) : [];

  if (!title) {
    errorEl.textContent = "Please enter a title.";
    errorEl.style.display = "block";
    return;
  }
  if (!content || content === "<p><br></p>") {
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
    payload.post_type = "guide";
    payload.category = null;
    payload.guide_subcategory = subcat;
    payload.is_discovery = false;
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
    payload.guide_subcategory = needsSubcategory ? discoverySubcat : null;
    payload.is_discovery = true;
    payload.content = buildDiscoveryMediaContent(title, content, discoveryImageUrl, discoveryYoutubeUrl);
  } else {
    if (!createIsAdmin) {
      errorEl.textContent = "Only admins can create wiki category posts.";
      errorEl.style.display = "block";
      return;
    }

    const wikiCategory = document.getElementById("wikiCategory").value;
    const publishNow = document.getElementById("wikiPublishNow").checked;
    if (!wikiCategory) {
      errorEl.textContent = "Please choose a wiki category.";
      errorEl.style.display = "block";
      return;
    }

    payload.post_type = "wiki";
    payload.category = wikiCategory;
    payload.guide_subcategory = null;
    payload.is_discovery = false;
    payload.status = publishNow ? "published" : "pending";
  }

  if (files.length > 0) {
    const uploadResult = await uploadDiscoveryFiles(userId, files);
    if (uploadResult.error) {
      errorEl.textContent = uploadResult.error;
      errorEl.style.display = "block";
      return;
    }
    payload.content = buildPostContentWithAttachments(payload.content, uploadResult.files, currentPostType === "discovery");
  }

  payload.content = injectPostMetaCP(payload.content, postMeta);

  if (submitBtn) submitBtn.disabled = true;

  const { data, error } = await supabase.from("posts").insert(payload).select().single();

  if (submitBtn) submitBtn.disabled = false;

  if (error) {
    console.error("Post submission failed:", error);
    errorEl.textContent = "Failed to submit post: " + error.message;
    errorEl.style.display = "block";
    return;
  }

  if (data && data.slug) {
    window.location.href = `/wiki/post/?slug=${data.slug}`;
    return;
  }

  if (data && data.id) {
    window.location.href = `/wiki/post/?id=${data.id}`;
    return;
  }

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

async function uploadDiscoveryFiles(userId, files) {
  const uploaded = [];

  for (const file of files) {
    const cleanedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = userId + "/" + Date.now() + "-" + Math.random().toString(36).slice(2, 8) + "-" + cleanedName;

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
      name: file.name,
      path,
      type: file.type || "application/octet-stream",
      size: file.size,
      url: data && data.publicUrl ? data.publicUrl : "",
    });
  }

  return { files: uploaded };
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

function normalizePostMetaCP(meta) {
  if (!meta || typeof meta !== "object") return null;
  const out = {};
  if (meta.update_phase) out.update_phase = String(meta.update_phase).slice(0, 32);
  if (meta.patch_tag) out.patch_tag = String(meta.patch_tag).slice(0, 40);
  if (meta.source_url) out.source_url = String(meta.source_url).slice(0, 500);
  return Object.keys(out).length ? out : null;
}

function stripPostMetaCP(html) {
  return String(html || "").replace(/<!--BLMETA\s+[\s\S]*?-->/gi, "").trim();
}

function injectPostMetaCP(html, meta) {
  const cleaned = stripPostMetaCP(html);
  const normalized = normalizePostMetaCP(meta);
  if (!normalized) return cleaned;
  const json = JSON.stringify(normalized).replace(/-->/g, "--\\>");
  return cleaned + "\n<!--BLMETA " + json + " -->";
}
