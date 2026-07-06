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
  if (!wikiSelect || !Array.isArray(window.BOUNDLORE_CATEGORIES)) return;

  const allowed = window.BOUNDLORE_CATEGORIES.filter(function(cat) {
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
  } else if (type === "discovery") {
    guideFields.style.display = "none";
    discoveryFields.style.display = "block";
    wikiFields.style.display = "none";
    guideSelect.removeAttribute("required");
    discoverySelect.setAttribute("required", "required");
    wikiCategory.removeAttribute("required");
    guideSelect.value = "";
    wikiCategory.value = "";
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

  let payload = {
    author_id: userId,
    title: title,
    content: content,
    status: "pending",
  };

  if (submitBtn) submitBtn.disabled = true;

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
    const discoveryImageUrl = (document.getElementById("discoveryImageUrl").value || "").trim();
    const discoveryYoutubeUrl = (document.getElementById("discoveryYoutubeUrl").value || "").trim();
    if (!cat) {
      errorEl.textContent = "Please select a category for your discovery.";
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
    payload.content = buildDiscoveryMediaContent(content, discoveryImageUrl, discoveryYoutubeUrl);

    if (files.length > 0) {
      const uploadResult = await uploadDiscoveryFiles(userId, files);
      if (uploadResult.error) {
        if (submitBtn) submitBtn.disabled = false;
        errorEl.textContent = uploadResult.error;
        errorEl.style.display = "block";
        return;
      }
      payload.content = buildDiscoveryContentWithAttachments(payload.content, uploadResult.files);
    }
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

  window.location.href = "/wiki/account/";
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

function buildDiscoveryContentWithAttachments(baseHtml, files) {
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
    '<h3>Discovery Attachments</h3>' +
    '<ul class="discovery-attachments">' + entries + '</ul>';
}

function buildDiscoveryMediaContent(baseHtml, imageUrl, youtubeUrl) {
  let content = baseHtml;
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
