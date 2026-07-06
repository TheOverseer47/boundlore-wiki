// render-posts.js
// Shared logic to fetch and render published posts for a given category on any category page.
// Usage on a category page: renderCategoryPosts("guides");

async function renderCategoryPosts(categorySlug) {
  const container = document.getElementById("categoryPostsList");
  const emptyMsg = document.getElementById("categoryPostsEmpty");
  if (!container) return;

  // Build query with special handling for the 'guides' pseudo-category
  let query = supabase
    .from("posts")
    .select("id, slug, title, category, guide_subcategory, content, is_discovery, post_type, created_at, profiles:author_id(*)")
    .eq("status", "published");

  if (categorySlug === "guides") {
    // Guides are stored as post_type = 'guide' (category is null)
    query = query.eq("post_type", "guide");
  } else {
    query = query.eq("category", categorySlug);
  }

  const { data: posts, error } = await query.order("created_at", { ascending: false });

  container.innerHTML = "";

  if (error || !posts || posts.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return { posts: [] };
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  const postsWithScores = await attachReactionStats(posts);
  const sortedPosts = sortPostsByCategoryLogic(postsWithScores, categorySlug);

  sortedPosts.forEach(function(post) {
    const authorName = post.profiles ? post.profiles.username : "Unknown";
    const plainText = post.content.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
    const discoveryBadge = post.is_discovery
      ? '<span class="bl-tag bl-tag-discovery">\u2728 Discovery</span>'
      : "";
    const featuredBadge = post.is_featured_guide
      ? '<span class="bl-tag bl-tag-featured">Featured</span>'
      : "";
    const typeLabel = getReadableType(post);
    const typeBadge = '<span class="bl-tag bl-tag-type">' + escapeHtmlRP(typeLabel) + '</span>';
    const avatarHtml = typeof renderAvatar === "function"
      ? renderAvatar(post.profiles, "bl-avatar-sm")
      : "";
    const statBarHtml = renderRatingSummary(post);
    const postUrl = post.slug ? ("/wiki/post/?slug=" + encodeURIComponent(post.slug)) : "/wiki/post/";
    const dateLabel = new Date(post.created_at).toLocaleDateString();
    const openLabel = getOpenLabelForPost(post, categorySlug);

    const card = document.createElement("div");
    card.className = "bl-guide-card";
    card.innerHTML =
      '<a class="bl-guide-card-link" href="' + postUrl + '">' +
      '<div class="bl-guide-card-top">' +
      '<div class="bl-guide-card-title-wrap">' +
      '<h3 class="bl-guide-card-title">' + escapeHtmlRP(post.title) + '</h3>' +
      '<div class="bl-guide-card-tags">' + typeBadge + featuredBadge + discoveryBadge + '</div>' +
      '</div>' +
      '<div class="bl-guide-card-meta">' +
      avatarHtml +
      '<span>By ' + escapeHtmlRP(authorName) + ' &middot; ' + dateLabel + '</span>' +
      '</div>' +
      '</div>' +
      '<p class="bl-guide-card-summary">' + escapeHtmlRP(plainText) + (plainText.length >= 200 ? '...' : '') + '</p>' +
      '<div class="bl-guide-card-bottom">' +
      '<div class="post-rating-summary" data-post-id="' + post.id + '">' + statBarHtml + '</div>' +
      '<span class="bl-guide-card-open">' + escapeHtmlRP(openLabel) + ' &rarr;</span>' +
      '</div>' +
      '</a>';

    container.appendChild(card);
  });

  return { posts: sortedPosts };
}

async function attachReactionStats(posts) {
  if (!posts || posts.length === 0) return [];

  const ids = posts.map(function(post) { return post.id; });
  const { data: reactions } = await supabase
    .from("post_reactions")
    .select("post_id, reaction")
    .in("post_id", ids);

  const map = {};
  (reactions || []).forEach(function(r) {
    if (!map[r.post_id]) {
      map[r.post_id] = { up: 0, down: 0 };
    }
    if (r.reaction === "up") map[r.post_id].up += 1;
    if (r.reaction === "down") map[r.post_id].down += 1;
  });

  return posts.map(function(post) {
    const stats = map[post.id] || { up: 0, down: 0 };
    const totalVotes = stats.up + stats.down;
    const approvalRate = totalVotes > 0 ? stats.up / totalVotes : 0;
    const wilsonScore = computeWilsonLowerBound(stats.up, totalVotes);
    const isFeaturedGuide = post.post_type === "guide" && totalVotes >= 10 && approvalRate >= 0.85;

    return Object.assign({}, post, {
      reaction_upvotes: stats.up,
      reaction_downvotes: stats.down,
      reaction_total: totalVotes,
      reaction_approval_rate: approvalRate,
      wilson_score: wilsonScore,
      is_featured_guide: isFeaturedGuide,
    });
  });
}

function sortPostsByCategoryLogic(posts, categorySlug) {
  const copy = posts.slice();
  if (categorySlug !== "guides") {
    return copy.sort(function(a, b) {
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }

  return copy.sort(function(a, b) {
    if (a.is_featured_guide !== b.is_featured_guide) {
      return a.is_featured_guide ? -1 : 1;
    }
    if (a.wilson_score !== b.wilson_score) {
      return b.wilson_score - a.wilson_score;
    }
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function computeWilsonLowerBound(positiveVotes, totalVotes) {
  if (!totalVotes) return 0;
  const z = 1.96;
  const phat = positiveVotes / totalVotes;
  const z2 = z * z;
  const numerator = phat + z2 / (2 * totalVotes) - z * Math.sqrt((phat * (1 - phat) + z2 / (4 * totalVotes)) / totalVotes);
  const denominator = 1 + z2 / totalVotes;
  return numerator / denominator;
}

function renderRatingSummary(post) {
  const up = post.reaction_upvotes || 0;
  const down = post.reaction_downvotes || 0;
  const total = post.reaction_total || 0;
  if (total === 0) {
    return '<span class="bl-rating-empty">No ratings yet</span>';
  }

  const positivePercent = Math.round((up / total) * 100);
  return '<span class="bl-rating-line">👍 ' + up + ' &middot; 👎 ' + down + ' &middot; ' + positivePercent + '% positive</span>';
}

function getReadableType(post) {
  if (typeof getPostCategoryLabel === "function") {
    return getPostCategoryLabel(post);
  }
  if (post.post_type === "guide") return "Guide";
  if (post.post_type === "discovery") return "Discovery";
  return post.category || "Post";
}

function getOpenLabelForPost(post, categorySlug) {
  if (categorySlug === "guilds" || post.category === "guilds") {
    return "Open Guild";
  }
  if (post.post_type === "guide") {
    return "Open Guide";
  }
  if (post.post_type === "discovery" || post.is_discovery) {
    return "Open Discovery";
  }
  return "Open Post";
}

function escapeHtmlRP(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
