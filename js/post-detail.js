// ============================================
// FILE: js/post-detail.js
// Post detail page: author/date display, upvote/downvote system,
// comment edit/delete + admin delete
// ============================================

let currentPost = null;
let currentUserId = null;
let isAdmin = false;

document.addEventListener("DOMContentLoaded", init);

async function init() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");
  const postId = params.get("id");
  if (!slug && !postId) return showNotFound();

  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData && sessionData.session) {
    currentUserId = sessionData.session.user.id;
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUserId)
      .single();
    isAdmin = profile && profile.role === "admin";
  }

  let postQuery = supabase
    .from("posts")
    .select("*, profiles:author_id(*)");

  if (slug) {
    postQuery = postQuery.eq("slug", slug);
  } else {
    postQuery = postQuery.eq("id", postId);
  }

  const { data: post, error } = await postQuery.single();

  if (error || !post) return showNotFound();

  currentPost = post;
  renderPost(post);
  loadReactions(post.id);
  loadComments(post.id);
  wireCommentForm(post.id);
}

function showNotFound() {
  document.getElementById("postLoading").style.display = "none";
  document.getElementById("postNotFound").style.display = "block";
  document.getElementById("postTitle").textContent = "Post not found";
  document.getElementById("postAuthor").textContent = "-";
  document.getElementById("postDate").textContent = "-";
}

function renderPost(post) {
  document.getElementById("postLoading").style.display = "none";
  document.getElementById("postContent").style.display = "block";

  document.getElementById("postTitle").textContent = post.title;
  document.getElementById("postAuthor").textContent = post.profiles?.username || "Unknown";

  const authorHost = document.getElementById("postAuthorAvatar");
  if (authorHost) {
    if (typeof renderAvatar === "function") {
      authorHost.innerHTML = renderAvatar(post.profiles, "bl-avatar-md");
    } else {
      authorHost.innerHTML = "";
    }
  }

  const created = new Date(post.created_at);
  document.getElementById("postDate").textContent = created.toLocaleDateString(undefined, {
    year: "numeric", month: "long", day: "numeric"
  });

  if (post.updated_at && post.updated_at !== post.created_at) {
    document.getElementById("postEditedTag").style.display = "inline";
  }

  document.getElementById("postBody").innerHTML = post.content;

  const label = typeof getPostCategoryLabel === "function"
    ? getPostCategoryLabel(post)
    : (post.category || "Post");
  document.getElementById("breadcrumbCategory").textContent = label;
  document.title = post.title + " - BoundLore";

  const postTypeLabel = post.post_type === "guide"
    ? "Guide"
    : (post.post_type === "discovery" ? "Discovery" : "Post");

  const summaryText = summarizePostContent(post.content);
  const readTime = estimateReadTimeMinutes(post.content);

  const postSummary = document.getElementById("postSummary");
  if (postSummary) {
    postSummary.textContent = summaryText;
  }

  const postReadTime = document.getElementById("postReadTime");
  if (postReadTime) {
    postReadTime.textContent = readTime + " min read";
  }

  const typeBadge = document.getElementById("postTypeBadge");
  if (typeBadge) {
    typeBadge.textContent = postTypeLabel;
  }

  const sideCategory = document.getElementById("sideCategory");
  if (sideCategory) {
    sideCategory.textContent = label;
  }

  const sideType = document.getElementById("sideType");
  if (sideType) {
    sideType.textContent = postTypeLabel;
  }

  const sidePublished = document.getElementById("sidePublished");
  if (sidePublished) {
    sidePublished.textContent = created.toLocaleDateString();
  }

  const sideUpdated = document.getElementById("sideUpdated");
  if (sideUpdated) {
    const updatedDate = post.updated_at ? new Date(post.updated_at) : null;
    sideUpdated.textContent = updatedDate ? updatedDate.toLocaleDateString() : "-";
  }

  const quickNav = document.getElementById("postQuickNav");
  if (quickNav) {
    quickNav.innerHTML =
      '<li><a href="#postBody">Go to content</a></li>' +
      '<li><a href="#commentsList">Jump to comments</a></li>';

    const headings = extractHeadings(post.content).slice(0, 5);
    headings.forEach(function(heading, index) {
      const headingId = "post-heading-" + index;
      const match = document.querySelector("#postBody h1, #postBody h2, #postBody h3");
      if (!match) return;
      const nodes = document.querySelectorAll("#postBody h1, #postBody h2, #postBody h3");
      if (!nodes[index]) return;
      nodes[index].id = headingId;
      const li = document.createElement("li");
      li.innerHTML = '<a href="#' + headingId + '">' + escapeHtml(heading) + '</a>';
      quickNav.appendChild(li);
    });
  }

  if (currentUserId && post.author_id === currentUserId) {
    const editBtn = document.getElementById("btnEditPost");
    editBtn.style.display = "inline-block";
    editBtn.href = post.slug
      ? `/wiki/edit-post/?slug=${encodeURIComponent(post.slug)}`
      : `/wiki/edit-post/?id=${post.id}`;
  }
}

async function loadReactions(postId) {
  const { data: reactions, error } = await supabase
    .from("post_reactions")
    .select("reaction, user_id")
    .eq("post_id", postId);

  if (error) {
    console.warn("Failed to load reactions:", error);
  }

  const upvotes = reactions ? reactions.filter(r => r.reaction === "up").length : 0;
  const downvotes = reactions ? reactions.filter(r => r.reaction === "down").length : 0;

  document.getElementById("upvoteCount").textContent = upvotes;
  document.getElementById("downvoteCount").textContent = downvotes;

  const sideScore = document.getElementById("sideScore");
  if (sideScore) {
    const total = upvotes + downvotes;
    if (total === 0) {
      sideScore.textContent = "No votes";
    } else {
      const ratio = Math.round((upvotes / total) * 100);
      sideScore.textContent = upvotes + " / " + downvotes + " (" + ratio + "%)";
    }
  }

  const myReaction = currentUserId && reactions
    ? reactions.find(r => r.user_id === currentUserId)
    : null;

  const btnUp = document.getElementById("btnUpvote");
  const btnDown = document.getElementById("btnDownvote");
  btnUp.classList.toggle("active", myReaction?.reaction === "up");
  btnDown.classList.toggle("active", myReaction?.reaction === "down");

  btnUp.onclick = () => handleReaction(postId, "up");
  btnDown.onclick = () => handleReaction(postId, "down");
}

async function handleReaction(postId, reaction) {
  if (!currentUserId) {
    alert("Please log in to rate posts.");
    return;
  }

  const { data: existing, error: existingErr } = await supabase
    .from("post_reactions")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", currentUserId)
    .maybeSingle();

  if (existingErr) {
    alert("Could not load your current reaction. Please try again.");
    console.error("Reaction lookup error:", existingErr);
    return;
  }

  let writeError = null;

  if (existing && existing.reaction === reaction) {
    const { error } = await supabase.from("post_reactions").delete().eq("id", existing.id);
    writeError = error;
  } else if (existing) {
    const { error } = await supabase.from("post_reactions").update({ reaction }).eq("id", existing.id);
    writeError = error;
  } else {
    const { error } = await supabase.from("post_reactions").insert({ post_id: postId, user_id: currentUserId, reaction });
    writeError = error;
  }

  if (writeError) {
    if (writeError.code === "42501") {
      alert("Reaction blocked by database policy (RLS). Please ask an admin to update post_reactions policies.");
    } else {
      alert("Failed to save reaction: " + writeError.message);
    }
    console.error("Reaction write error:", writeError);
    return;
  }

  loadReactions(postId);
}

async function loadComments(postId) {
  const { data: comments } = await supabase
    .from("comments")
    .select("*, profiles:author_id(*)")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  const list = document.getElementById("commentsList");
  document.getElementById("commentCount").textContent = comments ? comments.length : 0;

  if (!comments || comments.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted);">No comments yet. Be the first to share your thoughts!</p>`;
    return;
  }

  list.innerHTML = comments.map(c => renderComment(c)).join("");

  comments.forEach(c => {
    if (currentUserId === c.author_id || isAdmin) {
      const delBtn = document.getElementById(`del-${c.id}`);
      if (delBtn) delBtn.onclick = () => deleteComment(c.id, postId);
    }
    if (currentUserId === c.author_id) {
      const editBtn = document.getElementById(`edit-${c.id}`);
      if (editBtn) editBtn.onclick = () => enableCommentEdit(c, postId);
    }
  });

  const loginPrompt = document.getElementById("commentLoginPrompt");
  const formBox = document.getElementById("commentFormBox");
  if (!currentUserId) {
    formBox.style.display = "none";
    loginPrompt.style.display = "block";
  }
}

function renderComment(c) {
  const date = new Date(c.created_at).toLocaleDateString();
  const editedTag = c.updated_at && c.updated_at !== c.created_at ? " (edited)" : "";
  const canEdit = currentUserId === c.author_id;
  const canDelete = currentUserId === c.author_id || isAdmin;

  return `
    <div class="comment-item" id="comment-${c.id}" style="border-bottom:1px solid #222;padding:12px 0;">
      <div class="comment-meta" style="color:var(--text-muted);font-size:0.9em;display:flex;align-items:center;gap:8px;">
        ${typeof renderAvatar === "function" ? renderAvatar(c.profiles, "bl-avatar-xs") : ""}
        <strong>${escapeHtml(c.profiles?.username || "Unknown")}</strong> &middot; ${date}${editedTag}
      </div>
      <div class="comment-text" id="text-${c.id}">${escapeHtml(c.content)}</div>
      <div class="comment-actions" style="margin-top:4px;">
        ${canEdit ? `<button id="edit-${c.id}" class="link-btn">Edit</button>` : ""}
        ${canDelete ? `<button id="del-${c.id}" class="link-btn">Delete</button>` : ""}
      </div>
    </div>
  `;
}

function enableCommentEdit(comment, postId) {
  const textEl = document.getElementById(`text-${comment.id}`);
  textEl.innerHTML = `
    <textarea id="editArea-${comment.id}" class="form-input" rows="2">${escapeHtml(comment.content)}</textarea>
    <button id="saveEdit-${comment.id}" class="btn-contribute" style="margin-top:6px;">Save</button>
  `;
  document.getElementById(`saveEdit-${comment.id}`).onclick = async () => {
    const newText = document.getElementById(`editArea-${comment.id}`).value.trim();
    if (!newText) return;
    await supabase.from("comments").update({ content: newText }).eq("id", comment.id);
    loadComments(postId);
  };
}

async function deleteComment(commentId, postId) {
  if (!confirm("Delete this comment?")) return;
  await supabase.from("comments").delete().eq("id", commentId);
  loadComments(postId);
}

function wireCommentForm(postId) {
  const btn = document.getElementById("btnSubmitComment");
  btn.onclick = async () => {
    if (!currentUserId) {
      alert("Please log in to comment.");
      return;
    }
    const text = document.getElementById("newCommentText").value.trim();
    if (!text) return;

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      author_id: currentUserId,
      content: text,
    });

    if (error) {
      alert("Failed to post comment: " + error.message);
      return;
    }

    document.getElementById("newCommentText").value = "";
    loadComments(postId);
  };
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function summarizePostContent(contentHtml) {
  const plain = (contentHtml || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return "No summary available.";
  return plain.length > 180 ? plain.slice(0, 180) + "..." : plain;
}

function estimateReadTimeMinutes(contentHtml) {
  const plain = (contentHtml || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const words = plain ? plain.split(" ").length : 0;
  if (words === 0) return 1;
  return Math.max(1, Math.ceil(words / 220));
}

function extractHeadings(contentHtml) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = contentHtml || "";
  const nodes = wrapper.querySelectorAll("h1, h2, h3");
  return Array.from(nodes).map(function(node) {
    return (node.textContent || "Section").trim();
  }).filter(Boolean);
}
