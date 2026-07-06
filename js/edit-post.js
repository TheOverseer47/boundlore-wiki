let editQuill;
let editPost = null;
let editCurrentType = "guide";
let editUserId = null;
let editIsAdmin = false;

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

  const canEdit = editIsAdmin || post.author_id === editUserId;
  if (!canEdit) {
    loading.style.display = "none";
    denied.style.display = "block";
    return;
  }

  document.getElementById("editPostTitle").value = post.title || "";
  editQuill.root.innerHTML = post.content || "";

  const postType = post.post_type === "discovery" || post.is_discovery ? "discovery" : "guide";
  setEditPostType(postType);

  if (postType === "guide") {
    document.getElementById("editGuideSubcategory").value = post.guide_subcategory || "";
  } else {
    document.getElementById("editDiscoveryCategory").value = post.category || "";
  }

  loading.style.display = "none";
  form.style.display = "block";
}

function fillCategorySelectors() {
  const guideSelect = document.getElementById("editGuideSubcategory");
  const discoverySelect = document.getElementById("editDiscoveryCategory");

  if (guideSelect && Array.isArray(window.BOUNDLORE_GUIDE_SUBCATEGORIES)) {
    window.BOUNDLORE_GUIDE_SUBCATEGORIES.forEach(function (cat) {
      const opt = document.createElement("option");
      opt.value = cat.slug;
      opt.textContent = cat.icon + " " + cat.label;
      guideSelect.appendChild(opt);
    });
  }

  if (discoverySelect && Array.isArray(window.BOUNDLORE_CATEGORIES)) {
    window.BOUNDLORE_CATEGORIES
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

  if (editCurrentType === "guide") {
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

  const updates = {
    title: title,
    content: content,
    status: "pending",
  };

  if (editCurrentType === "guide") {
    const subcat = document.getElementById("editGuideSubcategory").value;
    if (!subcat) {
      errEl.textContent = "Please choose a guide type.";
      errEl.style.display = "block";
      return;
    }
    updates.post_type = "guide";
    updates.category = null;
    updates.guide_subcategory = subcat;
    updates.is_discovery = false;
  } else {
    const cat = document.getElementById("editDiscoveryCategory").value;
    if (!cat) {
      errEl.textContent = "Please choose a discovery category.";
      errEl.style.display = "block";
      return;
    }
    updates.post_type = "discovery";
    updates.category = cat;
    updates.guide_subcategory = null;
    updates.is_discovery = true;
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
