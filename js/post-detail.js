// ============================================
// FILE: js/post-detail.js
// Post detail page: author/date display, upvote/downvote system,
// comment edit/delete + admin delete
// ============================================

let currentPost = null;
let currentUserId = null;
let isAdmin = false;
let postImageViewer = null;

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
  enhancePostImagesPD();

  const label = typeof getPostCategoryLabel === "function"
    ? getPostCategoryLabel(post)
    : (post.category || "Post");
    const subcategoryLabel = getPostSubcategoryLabelPD(post, postMeta);
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

  const sideSubcategory = document.getElementById("sideSubcategory");
  if (sideSubcategory) {
    sideSubcategory.textContent = subcategoryLabel || "-";
  }

  const postCategoryChip = document.getElementById("postCategoryChip");
  if (postCategoryChip) {
    postCategoryChip.textContent = label;
  }

    const subcategoryChip = document.getElementById("postSubcategoryChip");
    const subcategoryValue = document.getElementById("postSubcategoryValue");
    if (subcategoryChip && subcategoryValue) {
      if (subcategoryLabel) {
        subcategoryChip.style.display = "inline-flex";
        subcategoryValue.textContent = subcategoryLabel;
      } else {
        subcategoryChip.style.display = "none";
      }
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
      '<li><a href="#commentsList">Jump to comments</a></li>' +
      '<li><a href="#relatedPostsSection">See also</a></li>';

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

  loadRelatedPosts(post, postMeta);
}

async function loadRelatedPosts(post, postMeta) {
  const wrap = document.getElementById("relatedPostsSection");
  const list = document.getElementById("relatedPostsList");
  const title = document.getElementById("relatedPostsTitle");
  if (!wrap || !list || !title) return;

  let query = supabase
    .from("posts")
    .select("id, slug, title, category, post_type, guide_subcategory, content, created_at")
    .eq("status", "published")
    .neq("id", post.id)
    .order("created_at", { ascending: false });

  title.textContent = "See also";
  query = query.limit(18);

  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    renderRelatedFallbackPD(wrap, list, title, post);
    return;
  }

  const scored = data.map(function(item) {
    return Object.assign({}, item, {
      relatedScore: computeRelatedScorePD(post, postMeta, item),
    });
  }).filter(function(item) {
    return item.relatedScore > 0;
  }).sort(function(a, b) {
    if (b.relatedScore !== a.relatedScore) return b.relatedScore - a.relatedScore;
    return new Date(b.created_at) - new Date(a.created_at);
  });

  if (scored.length === 0) {
    renderRelatedFallbackPD(wrap, list, title, post);
    return;
  }

  wrap.style.display = "block";
  list.innerHTML = "";

  const usedIds = new Set();
  const bestMatches = scored.filter(function(item) {
    return item.relatedScore >= 8;
  }).slice(0, 4);
  const topicalMatches = scored.filter(function(item) {
    return isRelatedByTopicPD(post, item);
  }).filter(function(item) {
    return !bestMatches.some(function(best) { return best.id === item.id; });
  }).slice(0, 4);
  const metaMatches = scored.filter(function(item) {
    return isRelatedByMetaPD(post, postMeta, item);
  }).filter(function(item) {
    return !bestMatches.some(function(best) { return best.id === item.id; }) &&
      !topicalMatches.some(function(topic) { return topic.id === item.id; });
  }).slice(0, 4);

  appendRelatedGroupPD(list, "Best matches", bestMatches, usedIds);

  const topicLabel = getRelatedTopicLabelPD(post);
  if (topicalMatches.length > 0) {
    appendRelatedGroupPD(list, topicLabel, topicalMatches, usedIds);
  }

  if (metaMatches.length > 0) {
    const metaLabel = getRelatedMetaLabelPD(postMeta);
    if (metaLabel) {
      appendRelatedGroupPD(list, metaLabel, metaMatches, usedIds);
    }
  }

  if (usedIds.size === 0) {
    renderRelatedFallbackPD(wrap, list, title, post);
  }
}

function getPostLabelSafe(post) {
  if (typeof getPostCategoryLabel === "function") {
    return getPostCategoryLabel(post);
  }
  if (post.post_type === "guide") return "Guide";
  return post.category || "Post";
}

function getSeeAlsoLabelPD(post) {
  const typeLabel = post.post_type === "guide"
    ? "Guide"
    : (post.post_type === "discovery" ? "Discovery" : "Post");
  const categoryLabel = getPostLabelSafe(post);
  const postMeta = parsePostMetaPD(post.content || "");
  const subcategoryLabel = getPostSubcategoryLabelPD(post, postMeta);
  return subcategoryLabel
    ? (typeLabel + " · " + categoryLabel + " · " + subcategoryLabel)
    : (typeLabel + " · " + categoryLabel);
}

function getPostSubcategoryLabelPD(post, postMeta) {
  const subcategory = (postMeta && postMeta.subcategory) || post.guide_subcategory || "";
  if (!subcategory) return "";
  if (typeof getAnySubcategoryLabel === "function") {
    return getAnySubcategoryLabel(post.category, subcategory) || subcategory;
  }
  if (typeof getGuideSubcategoryLabel === "function") {
    return getGuideSubcategoryLabel(subcategory);
  }
  return subcategory;
}

function computeRelatedScorePD(currentPost, currentMeta, candidate) {
  const candidateMeta = parsePostMetaPD(candidate.content || "");
  const currentSubcategory = (currentMeta && currentMeta.subcategory) || currentPost.guide_subcategory || "";
  const candidateSubcategory = candidate.guide_subcategory || candidateMeta.subcategory || "";
  const sameType = Boolean(currentPost.post_type && candidate.post_type === currentPost.post_type);
  const sameCategory = Boolean(currentPost.category && candidate.category === currentPost.category);
  const sameSubcategory = Boolean(currentSubcategory && candidateSubcategory && currentSubcategory === candidateSubcategory);
  const sameSource = Boolean(currentMeta && currentMeta.source_url && candidateMeta.source_url && currentMeta.source_url === candidateMeta.source_url);

  if (currentPost.post_type === "guide") {
    if (!sameType) return 0;
  } else if (!sameCategory) {
    return 0;
  }

  let score = 0;

  if (sameType) score += 3;
  if (sameCategory) score += 6;
  if (sameSubcategory) score += 10;
  if (sameSource) score += 4;
  if (currentMeta && candidate.content) {
    if (currentMeta.update_phase && candidateMeta.update_phase && currentMeta.update_phase === candidateMeta.update_phase) score += 2;
    if (currentMeta.patch_tag && candidateMeta.patch_tag && currentMeta.patch_tag === candidateMeta.patch_tag) score += 2;
  }

  const currentLabel = getPostLabelSafe(currentPost).toLowerCase();
  const candidateLabel = getPostLabelSafe(candidate).toLowerCase();
  if (currentLabel && candidateLabel && currentLabel === candidateLabel) score += 1;

  const currentLabelTokens = tokenizeRelatedTermsPD(currentLabel);
  const candidateLabelTokens = tokenizeRelatedTermsPD(candidateLabel);
  if (sameCategory || sameSubcategory || sameType) {
    score += Math.min(countSharedTermsPD(currentLabelTokens, candidateLabelTokens), 1);
  }

  const currentSlugTokens = tokenizeRelatedTermsPD(currentPost.slug || currentPost.title || "");
  const candidateSlugTokens = tokenizeRelatedTermsPD(candidate.slug || candidate.title || "");
  if (sameSubcategory || sameSource) {
    score += Math.min(countSharedTermsPD(currentSlugTokens, candidateSlugTokens), 1);
  }

  const currentTitleWords = tokenizeRelatedTermsPD(currentPost.title);
  const candidateTitleWords = tokenizeRelatedTermsPD(candidate.title);
  if (sameSubcategory || sameSource) {
    score += Math.min(countSharedTermsPD(currentTitleWords, candidateTitleWords), 2);
  }

  return score;
}

function countSharedTermsPD(a, b) {
  return a.filter(function(word) {
    return b.includes(word);
  }).length;
}

function tokenizeRelatedTermsPD(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map(function(word) { return word.trim(); })
    .filter(function(word) {
      return word.length >= 4 && !["with", "from", "this", "that", "your", "about", "there", "what"].includes(word);
    });
}

function renderRelatedFallbackPD(wrap, list, title, post) {
  const sectionTitle = post && post.post_type === "guide"
    ? "See also"
    : "Explore more";

  title.textContent = sectionTitle;
  wrap.style.display = "block";
  list.innerHTML = "";

  appendRelatedGroupPD(list, "Browse the wiki", [
    { label: "Browse guides", href: "/wiki/guides/", meta: "Guides hub" },
    { label: "Browse creatures", href: "/wiki/creatures/", meta: "Creatures hub" },
    { label: "Browse biomes", href: "/wiki/biomes/", meta: "Biomes hub" },
    { label: "Browse items", href: "/wiki/items/", meta: "Items hub" },
  ].map(function(item, index) {
    return Object.assign({ id: "fallback-browse-" + index }, item);
  }), new Set());

  appendRelatedGroupPD(list, "Community actions", [
    { label: "Community posts", href: "/wiki/community/", meta: "Discussion and updates" },
    { label: "Submit a post", href: "/wiki/create-post/", meta: "Add something new" },
  ].map(function(item, index) {
    return Object.assign({ id: "fallback-community-" + index }, item);
  }), new Set());
}

function appendRelatedGroupPD(container, heading, items, usedIds) {
  if (!items || items.length === 0) return;

  const group = document.createElement("div");
  group.className = "bl-related-group";

  const title = document.createElement("h4");
  title.className = "bl-related-group-title";
  title.textContent = heading;
  group.appendChild(title);

  const grid = document.createElement("div");
  grid.className = "bl-related-group-grid";

  items.forEach(function(item) {
    if (usedIds && usedIds.has(item.id)) return;
    if (usedIds) usedIds.add(item.id);
    grid.appendChild(renderRelatedItemPD(item));
  });

  if (!grid.children.length) return;
  group.appendChild(grid);
  container.appendChild(group);
}

function renderRelatedItemPD(item) {
  const link = document.createElement("a");
  link.className = "bl-related-item";
  link.href = item.href || (item.slug ? ("/wiki/post/?slug=" + encodeURIComponent(item.slug)) : ("/wiki/post/?id=" + encodeURIComponent(item.id)));
  const label = item.label || item.title || "Untitled";
  const meta = item.meta || getSeeAlsoLabelPD(item);
  const datePart = item.created_at ? (' • ' + new Date(item.created_at).toLocaleDateString()) : "";
  link.innerHTML =
    escapeHtml(label) +
    '<span>' + escapeHtml(meta) + datePart + '</span>';
  return link;
}

function isRelatedByTopicPD(post, candidate) {
  const currentMeta = parsePostMetaPD(post.content || "");
  const currentSubcategory = post.guide_subcategory || currentMeta.subcategory || "";
  const candidateMeta = parsePostMetaPD(candidate.content || "");
  const candidateSubcategory = candidate.guide_subcategory || candidateMeta.subcategory || "";
  if (currentSubcategory && candidateSubcategory && candidateSubcategory === currentSubcategory) return true;
  if (post.post_type === "guide") return post.post_type && candidate.post_type === post.post_type;
  return post.category && candidate.category === post.category;
}

function isRelatedByMetaPD(post, postMeta, candidate) {
  if (!postMeta || !candidate) return false;
  const currentSubcategory = post.guide_subcategory || postMeta.subcategory || "";
  const candidateMeta = parsePostMetaPD(candidate.content || "");
  const candidateSubcategory = candidate.guide_subcategory || candidateMeta.subcategory || "";
  if (currentSubcategory && candidateSubcategory && currentSubcategory !== candidateSubcategory) {
    return false;
  }
  return Boolean(
    (postMeta.source_url && candidateMeta.source_url && postMeta.source_url === candidateMeta.source_url) ||
    (postMeta.update_phase && candidateMeta.update_phase && postMeta.update_phase === candidateMeta.update_phase) ||
    (postMeta.patch_tag && candidateMeta.patch_tag && postMeta.patch_tag === candidateMeta.patch_tag)
  );
}

function getRelatedTopicLabelPD(post) {
  const postMeta = parsePostMetaPD(post.content || "");
  const subcategory = post.guide_subcategory || postMeta.subcategory || "";
  if (subcategory) {
    return "More in " + formatTopicLabelPD(subcategory);
  }
  if (post.category) {
    return "More in " + getPostLabelSafe(post);
  }
  if (post.post_type === "discovery") {
    return "More discoveries";
  }
  return "More from this wiki";
}

function getRelatedMetaLabelPD(postMeta) {
  if (!postMeta) return "";
  if (postMeta.update_phase && postMeta.patch_tag) {
    return "Same update phase and patch";
  }
  if (postMeta.update_phase) {
    return "Same update phase";
  }
  if (postMeta.patch_tag) {
    return "Same patch tag";
  }
  return "";
}

function formatTopicLabelPD(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, function(char) { return char.toUpperCase(); });
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

function ensureImageViewerPD() {
  if (postImageViewer) return postImageViewer;

  const overlay = document.createElement("div");
  overlay.className = "bl-image-lightbox";
  overlay.innerHTML =
    '<button type="button" class="bl-image-lightbox-close" aria-label="Close image preview">Close</button>' +
    '<img alt="Post image preview" />';

  const closeBtn = overlay.querySelector(".bl-image-lightbox-close");
  const img = overlay.querySelector("img");

  function closeViewer() {
    overlay.classList.remove("open");
    img.classList.remove("zoomed");
    img.removeAttribute("src");
  }

  closeBtn.addEventListener("click", closeViewer);
  overlay.addEventListener("click", function(e) {
    if (e.target === overlay) closeViewer();
  });
  img.addEventListener("click", function() {
    img.classList.toggle("zoomed");
  });
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && overlay.classList.contains("open")) {
      closeViewer();
    }
  });

  document.body.appendChild(overlay);
  postImageViewer = { overlay: overlay, img: img, close: closeViewer };
  return postImageViewer;
}

function enhancePostImagesPD() {
  const body = document.getElementById("postBody");
  if (!body) return;

  const viewer = ensureImageViewerPD();
  const imgs = body.querySelectorAll("img[src]");
  imgs.forEach(function(node) {
    node.classList.add("bl-post-clickable-image");
    if (node.dataset.enhancedImageViewer === "1") return;
    node.dataset.enhancedImageViewer = "1";
    node.addEventListener("click", function() {
      viewer.img.setAttribute("src", node.getAttribute("src") || "");
      viewer.img.setAttribute("alt", node.getAttribute("alt") || "Post image");
      viewer.img.classList.remove("zoomed");
      viewer.overlay.classList.add("open");
    });
  });
}
