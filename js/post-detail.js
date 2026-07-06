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
  const postTitle = document.getElementById("postTitle");
  const postAuthor = document.getElementById("postAuthor");
  const postDate = document.getElementById("postDate");
  const breadcrumbTitle = document.getElementById("breadcrumbTitle");
  if (postTitle) postTitle.textContent = "Post not found";
  if (postAuthor) postAuthor.textContent = "-";
  if (postDate) postDate.textContent = "-";
  if (breadcrumbTitle) breadcrumbTitle.textContent = "Not found";
}

function renderPost(post) {
  document.getElementById("postLoading").style.display = "none";
  document.getElementById("postContent").style.display = "block";

  const postMeta = parsePostMetaPD(post.content || "");
  const cleanContent = stripPostMetaPD(post.content || "");

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

  document.getElementById("postBody").innerHTML = cleanContent;

  const label = typeof getPostCategoryLabel === "function"
    ? getPostCategoryLabel(post)
    : (post.category || "Post");
  document.getElementById("breadcrumbCategory").textContent = label;
  const breadcrumbTitle = document.getElementById("breadcrumbTitle");
  if (breadcrumbTitle) breadcrumbTitle.textContent = post.title;
  document.title = post.title + " - BoundLore";

  const postTypeLabel = post.post_type === "guide"
    ? "Guide"
    : (post.post_type === "discovery" ? "Discovery" : "Post");

  const readTime = estimateReadTimeMinutes(cleanContent);

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

  const postCategoryChip = document.getElementById("postCategoryChip");
  if (postCategoryChip) {
    postCategoryChip.textContent = label;
  }

  const sideType = document.getElementById("sideType");
  if (sideType) {
    sideType.textContent = postTypeLabel;
  }

  const updatePhaseLabel = formatUpdatePhasePD(postMeta.update_phase);
  const sideUpdatePhase = document.getElementById("sideUpdatePhase");
  if (sideUpdatePhase) {
    sideUpdatePhase.textContent = updatePhaseLabel || "-";
  }

  const sidePatchTag = document.getElementById("sidePatchTag");
  if (sidePatchTag) {
    sidePatchTag.textContent = postMeta.patch_tag || "-";
  }

  const sideSource = document.getElementById("sideSource");
  if (sideSource) {
    if (postMeta.source_url) {
      const safeUrl = escapeHtml(postMeta.source_url);
      sideSource.innerHTML = '<a href="' + safeUrl + '" target="_blank" rel="noopener">Source Link</a>';
    } else {
      sideSource.textContent = "-";
    }
  }

  const updatePhaseChip = document.getElementById("postUpdatePhaseChip");
  const updatePhaseValue = document.getElementById("postUpdatePhaseValue");
  if (updatePhaseChip && updatePhaseValue) {
    if (updatePhaseLabel) {
      updatePhaseChip.style.display = "inline-flex";
      updatePhaseValue.textContent = updatePhaseLabel;
    } else {
      updatePhaseChip.style.display = "none";
    }
  }

  const patchTagChip = document.getElementById("postPatchTagChip");
  const patchTagValue = document.getElementById("postPatchTagValue");
  if (patchTagChip && patchTagValue) {
    if (postMeta.patch_tag) {
      patchTagChip.style.display = "inline-flex";
      patchTagValue.textContent = postMeta.patch_tag;
    } else {
      patchTagChip.style.display = "none";
    }
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

    const headings = extractHeadings(cleanContent).slice(0, 5);
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

  loadRelatedPosts(post);
}

async function loadRelatedPosts(post) {
  const wrap = document.getElementById("relatedPostsSection");
  const list = document.getElementById("relatedPostsList");
  const title = document.getElementById("relatedPostsTitle");
  if (!wrap || !list || !title) return;

  let query = supabase
    .from("posts")
    .select("id, slug, title, category, post_type, guide_subcategory, created_at")
    .eq("status", "published")
    .neq("id", post.id)
    .limit(4)
    .order("created_at", { ascending: false });

  if (post.post_type === "guide" && post.guide_subcategory) {
    title.textContent = "Similar Guides";
    query = query.eq("post_type", "guide").eq("guide_subcategory", post.guide_subcategory);
  } else if (post.category) {
    title.textContent = "Similar in " + getPostLabelSafe(post);
    query = query.eq("category", post.category);
  } else {
    title.textContent = "Related Posts";
  }

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    wrap.style.display = "none";
    return;
  }

  wrap.style.display = "block";
  list.innerHTML = "";

  data.forEach(function(item) {
    const link = document.createElement("a");
    link.className = "bl-related-item";
    link.href = item.slug ? ("/wiki/post/?slug=" + encodeURIComponent(item.slug)) : ("/wiki/post/?id=" + encodeURIComponent(item.id));
    link.innerHTML =
      escapeHtml(item.title || "Untitled") +
      '<span>' + escapeHtml(getPostLabelSafe(item)) + ' • ' + new Date(item.created_at).toLocaleDateString() + '</span>';
    list.appendChild(link);
  });
}

function getPostLabelSafe(post) {
  if (typeof getPostCategoryLabel === "function") {
    return getPostCategoryLabel(post);
  }
  if (post.post_type === "guide") return "Guide";
  return post.category || "Post";
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

    if (window.BLNotify && currentPost && currentPost.author_id && currentPost.author_id !== currentUserId) {
      await window.BLNotify.createNotification({
        user_id: currentPost.author_id,
        type: "comment",
        title: "New comment on your post",
        message: "Someone commented on \"" + currentPost.title + "\".",
        target_url: currentPost.slug
          ? ("/wiki/post/?slug=" + encodeURIComponent(currentPost.slug))
          : ("/wiki/post/?id=" + encodeURIComponent(currentPost.id)),
      });
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

function stripPostMetaPD(html) {
  return String(html || "").replace(/<!--BLMETA\s+[\s\S]*?-->/gi, "").trim();
}

function parsePostMetaPD(html) {
  const match = String(html || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}

function formatUpdatePhasePD(value) {
  if (!value) return "";
  if (value === "pre-update") return "Pre-Update";
  if (value === "post-update") return "Post-Update";
  if (value === "evergreen") return "Evergreen";
  return value;
}
