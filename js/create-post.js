// ============================================
// FILE: js/create-post.js
// New create-post logic: Guide vs Discovery post types
// Guides use guide_subcategory, no fixed category
// Discoveries use a fixed category, post_type = 'discovery'
// Fixed wiki categories (post_type = 'wiki') are admin-only, not creatable here
// ============================================

let quillEditor;
let currentPostType = "guide";

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
});

function setPostType(type) {
  currentPostType = type;
  document.getElementById("btnTypeGuide").classList.toggle("active", type === "guide");
  document.getElementById("btnTypeDiscovery").classList.toggle("active", type === "discovery");
  document.getElementById("guideFields").style.display = type === "guide" ? "block" : "none";
  document.getElementById("discoveryFields").style.display = type === "discovery" ? "block" : "none";
}

async function handleSubmit(e) {
  e.preventDefault();
  const errorEl = document.getElementById("formError");
  errorEl.style.display = "none";

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    errorEl.textContent = "You must be logged in to submit a post.";
    errorEl.style.display = "block";
    return;
  }
  const userId = sessionData.session.user.id;

  const title = document.getElementById("postTitle").value.trim();
  const content = quillEditor.root.innerHTML.trim();

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
  }

  const { data, error } = await supabase.from("posts").insert(payload).select().single();

  if (error) {
    console.error("Post submission failed:", error);
    errorEl.textContent = "Failed to submit post: " + error.message;
    errorEl.style.display = "block";
    return;
  }

  window.location.href = `/wiki/post/?slug=${data.slug}`;
}
