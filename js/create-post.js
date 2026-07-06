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

document.addEventListener("DOMContentLoaded", () => {
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

  document.getElementById("createPostForm").addEventListener("submit", handleSubmit);

  const params = new URLSearchParams(window.location.search);
  const typeParam = (params.get("type") || "").toLowerCase();
  if (typeParam === "discovery") {
    setPostType("discovery");
  }
});

function setPostType(type) {
  currentPostType = type;
  document.getElementById("btnTypeGuide").classList.toggle("active", type === "guide");
  document.getElementById("btnTypeDiscovery").classList.toggle("active", type === "discovery");

  const guideFields = document.getElementById("guideFields");
  const discoveryFields = document.getElementById("discoveryFields");
  const guideSelect = document.getElementById("guideSubcategory");
  const discoverySelect = document.getElementById("discoveryCategory");

  if (type === "guide") {
    guideFields.style.display = "block";
    discoveryFields.style.display = "none";
    guideSelect.setAttribute("required", "required");
    discoverySelect.removeAttribute("required");
    discoverySelect.value = "";
  } else {
    guideFields.style.display = "none";
    discoveryFields.style.display = "block";
    guideSelect.removeAttribute("required");
    discoverySelect.setAttribute("required", "required");
    guideSelect.value = "";
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
  } else {
    const cat = document.getElementById("discoveryCategory").value;
    if (!cat) {
      errorEl.textContent = "Please select a category for your discovery.";
      errorEl.style.display = "block";
      return;
    }
    payload.post_type = "discovery";
    payload.category = cat;
    payload.guide_subcategory = null;
    payload.is_discovery = true;

    if (files.length > 0) {
      const uploadResult = await uploadDiscoveryFiles(userId, files);
      if (uploadResult.error) {
        if (submitBtn) submitBtn.disabled = false;
        errorEl.textContent = uploadResult.error;
        errorEl.style.display = "block";
        return;
      }
      payload.content = buildDiscoveryContentWithAttachments(content, uploadResult.files);
    }
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

function escapeHtmlCP(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

function escapeAttrCP(value) {
  return String(value == null ? "" : value).replace(/"/g, "&quot;");
}
