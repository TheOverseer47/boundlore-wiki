// render-posts.js
// Shared logic to fetch and render published posts for a given category on any category page.
// Usage on a category page: renderCategoryPosts("guides");

async function renderCategoryPosts(categorySlug) {
  const container = document.getElementById("categoryPostsList");
  const emptyMsg = document.getElementById("categoryPostsEmpty");
  if (!container) return;

  if (typeof ensureCategoryExtensionsLoaded === "function") {
    await ensureCategoryExtensionsLoaded();
  }

  enhanceSubcategoryOverview(container, categorySlug);

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
    renderGroupedCategoryFilterControls(container, categorySlug, {
      activeSubcategory: "",
      sortMode: "newest",
      visibleCount: 0,
      totalCount: 0,
    });
    if (emptyMsg) emptyMsg.style.display = "block";
    return { posts: [] };
  }

  const activeSubcategory = getSubcategoryFilterFromUrlRP();
  const sortMode = getSortFilterFromUrlRP();
  const searchQuery = getCategorySearchFromUrlRP();
  const filteredPosts = posts.filter(function(post) {
    if (activeSubcategory && getRenderableSubcategorySlug(post) !== activeSubcategory) {
      return false;
    }
    if (searchQuery && !matchesCategorySearchRP(post, categorySlug, searchQuery)) {
      return false;
    }
    return true;
  });

  renderGroupedCategoryFilterControls(container, categorySlug, {
    activeSubcategory: activeSubcategory,
    sortMode: sortMode,
    searchQuery: searchQuery,
    visibleCount: filteredPosts.length,
    totalCount: posts.length,
  });

  if (!filteredPosts.length) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return { posts: [] };
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  const postsWithScores = await attachReactionStats(filteredPosts);
  const sortedPosts = shouldGroupBySubcategory(categorySlug)
    ? sortGroupedCategoryPosts(postsWithScores, sortMode)
    : sortPostsByCategoryLogic(postsWithScores, categorySlug);

  if (categorySlug === "guilds") {
    sortedPosts.forEach(function(post) {
      container.appendChild(renderGuildCard(post));
    });
    return { posts: sortedPosts };
  }

  if (shouldGroupBySubcategory(categorySlug)) {
    renderGroupedCategoryPosts(container, sortedPosts, categorySlug);
    return { posts: sortedPosts };
  }

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
    const subcategoryLabel = getPostSubcategoryLabel(post);
    const showSubcategoryBadge = shouldShowSubcategoryBadge(post, subcategoryLabel);
    const subcategoryBadge = showSubcategoryBadge
      ? '<span class="bl-tag bl-tag-subcategory">' + escapeHtmlRP(subcategoryLabel) + '</span>'
      : '';
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
      '<div class="bl-guide-card-tags">' + typeBadge + subcategoryBadge + featuredBadge + discoveryBadge + '</div>' +
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

function renderGuildCard(post) {
  const postUrl = post.slug ? ("/wiki/post/?slug=" + encodeURIComponent(post.slug)) : "/wiki/post/";
  const authorName = post.profiles ? post.profiles.username : "Unknown";
  const dateLabel = new Date(post.created_at).toLocaleDateString();
  const plainText = post.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const summary = plainText.slice(0, 180) + (plainText.length > 180 ? "..." : "");

  const discordInvite = extractDiscordInvite(post.content);
  const discordWidgetSrc = extractDiscordWidget(post.content);
  const previewHtml = discordWidgetSrc
    ? '<iframe class="bl-guild-discord-preview" src="' + escapeHtmlRP(discordWidgetSrc) + '" title="Discord Preview" loading="lazy" sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"></iframe>'
    : '<div class="bl-guild-discord-fallback"><p>Discord-first guild</p><strong>' + escapeHtmlRP(post.title) + '</strong></div>';

  const card = document.createElement("div");
  card.className = "bl-guild-card";
  card.innerHTML =
    '<div class="bl-guild-card-head">' +
      '<span class="bl-tag bl-tag-type">Guild Listing</span>' +
      '<span class="bl-tag bl-tag-discovery">Discord Focus</span>' +
    '</div>' +
    '<div class="bl-guild-preview-wrap">' + previewHtml + '</div>' +
    '<h3 class="bl-guild-title"><a href="' + postUrl + '">' + escapeHtmlRP(post.title) + '</a></h3>' +
    '<p class="bl-guild-summary">' + escapeHtmlRP(summary || "Guild details and onboarding information are available in this listing.") + '</p>' +
    '<div class="bl-guild-actions">' +
      (discordInvite ? '<a class="btn-small" style="background:#5865f2;text-decoration:none;display:inline-block;" href="' + escapeHtmlRP(discordInvite) + '" target="_blank" rel="noopener">Join Discord</a>' : '') +
      '<a class="btn-small" style="background:#2a8bdc;text-decoration:none;display:inline-block;" href="' + postUrl + '">Open Guild</a>' +
    '</div>' +
    '<p class="bl-guild-meta">By ' + escapeHtmlRP(authorName) + ' · ' + dateLabel + '</p>';

  return card;
}

function shouldGroupBySubcategory(categorySlug) {
  if (categorySlug === "guides") return false;
  return getCategorySubcategoriesRP(categorySlug).length > 0;
}

function renderGroupedCategoryPosts(container, posts, categorySlug) {
  const groups = getCategorySubcategoriesRP(categorySlug);
  const groupedMap = {};

  posts.forEach(function(post) {
    const key = getRenderableSubcategorySlug(post) || 'general';
    if (!groupedMap[key]) groupedMap[key] = [];
    groupedMap[key].push(post);
  });

  const orderedKeys = groups.map(function(group) { return group.slug; });
  if (groupedMap.general) orderedKeys.unshift('general');

  orderedKeys.forEach(function(key) {
    const items = groupedMap[key];
    if (!items || items.length === 0) return;

    const groupWrap = document.createElement('section');
    groupWrap.className = 'bl-category-group';

    const groupTitle = document.createElement('h3');
    groupTitle.className = 'bl-category-group-title';
    const label = key === 'general'
      ? 'General'
      : getCategorySubcategoryLabelRP(categorySlug, key);
    const icon = key === 'general' ? '' : getCategorySubcategoryIconRP(categorySlug, key);
    groupTitle.innerHTML = (icon ? '<span class="bl-subcategory-icon" aria-hidden="true">' + escapeHtmlRP(icon) + '</span>' : '') + '<span>' + escapeHtmlRP(label) + '</span>';

    const groupGrid = document.createElement('div');
    groupGrid.className = 'bl-category-group-grid';

    items.forEach(function(post) {
      const card = renderCategoryCard(post, categorySlug);
      groupGrid.appendChild(card);
    });

    groupWrap.appendChild(groupTitle);
    groupWrap.appendChild(groupGrid);
    container.appendChild(groupWrap);
  });
}

function renderCategoryCard(post, categorySlug) {
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
  const subcategoryLabel = getPostSubcategoryLabel(post);
  const showSubcategoryBadge = shouldShowSubcategoryBadge(post, subcategoryLabel);
  const subcategoryBadge = showSubcategoryBadge
    ? '<span class="bl-tag bl-tag-subcategory">' + buildSubcategoryDisplayRP(post.category, getRenderableSubcategorySlug(post), subcategoryLabel) + '</span>'
    : "";
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
    '<div class="bl-guide-card-tags">' + typeBadge + subcategoryBadge + featuredBadge + discoveryBadge + '</div>' +
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
  return card;
}

function getPostSubcategoryLabel(post) {
  if (!post) return "";
  const subcategory = getRenderableSubcategorySlug(post);
  if (!subcategory) return "";
  if (post.post_type === "guide") {
    return getGuideSubcategoryLabel(subcategory);
  }
  return getAnySubcategoryLabelRP(post.category, subcategory);
}

function shouldShowSubcategoryBadge(post, subcategoryLabel) {
  if (!subcategoryLabel) return false;
  // Guide cards already use their guide subcategory as the primary type badge.
  return post.post_type !== "guide";
}

function getSubcategoryFilterFromUrlRP() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return (params.get("subcategory") || params.get("subcat") || "").toLowerCase().trim();
  } catch (err) {
    return "";
  }
}

function getCategorySearchFromUrlRP() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    return (params.get("q") || "").trim().toLowerCase();
  } catch (err) {
    return "";
  }
}

function getSortFilterFromUrlRP() {
  try {
    const params = new URLSearchParams(window.location.search || "");
    const sort = (params.get("sort") || "newest").toLowerCase().trim();
    if (["newest", "oldest", "top"].includes(sort)) return sort;
    return "newest";
  } catch (err) {
    return "newest";
  }
}

function sortGroupedCategoryPosts(posts, sortMode) {
  const copy = posts.slice();
  if (sortMode === "oldest") {
    return copy.sort(function(a, b) {
      return new Date(a.created_at) - new Date(b.created_at);
    });
  }
  if (sortMode === "top") {
    return copy.sort(function(a, b) {
      if ((b.reaction_upvotes || 0) !== (a.reaction_upvotes || 0)) {
        return (b.reaction_upvotes || 0) - (a.reaction_upvotes || 0);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }
  return copy.sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

function renderGroupedCategoryFilterControls(container, categorySlug, state) {
  const host = container.parentElement;
  if (!host) return;

  const controlsId = "categoryFilterControls";
  let controls = host.querySelector("#" + controlsId);
  if (!shouldGroupBySubcategory(categorySlug)) {
    if (controls) controls.remove();
    return;
  }

  if (!controls) {
    controls = document.createElement("div");
    controls.id = controlsId;
    controls.className = "bl-category-filters";
    controls.innerHTML =
      '<div class="bl-category-filters-row">' +
        '<div class="bl-category-filter-item bl-category-filter-search">' +
          '<label for="blCategorySearchFilter">Search</label>' +
          '<input id="blCategorySearchFilter" class="form-input" type="search" placeholder="Search this category..." />' +
        '</div>' +
        '<div class="bl-category-filter-item">' +
          '<label for="blCategorySubFilter">Subcategory</label>' +
          '<select id="blCategorySubFilter" class="form-input"></select>' +
        '</div>' +
        '<div class="bl-category-filter-item">' +
          '<label for="blCategorySortFilter">Sort</label>' +
          '<select id="blCategorySortFilter" class="form-input">' +
            '<option value="newest">Newest</option>' +
            '<option value="oldest">Oldest</option>' +
            '<option value="top">Top Rated</option>' +
          '</select>' +
        '</div>' +
        '<button type="button" id="blCategoryFilterReset" class="btn-small" style="background:#666;align-self:flex-end;">Reset</button>' +
      '</div>' +
      '<p id="blCategoryFilterSummary" class="bl-category-filter-summary"></p>';
    host.insertBefore(controls, container);
  }

  const subFilter = controls.querySelector("#blCategorySubFilter");
  const sortFilter = controls.querySelector("#blCategorySortFilter");
  const searchFilter = controls.querySelector("#blCategorySearchFilter");
  const resetBtn = controls.querySelector("#blCategoryFilterReset");
  const summary = controls.querySelector("#blCategoryFilterSummary");

  if (!subFilter || !sortFilter || !searchFilter || !resetBtn || !summary) return;

  const subcategories = getCategorySubcategoriesRP(categorySlug);
  subFilter.innerHTML = '<option value="">All Subcategories</option>';
  subcategories.forEach(function(item) {
    const opt = document.createElement("option");
    opt.value = item.slug;
    opt.textContent = (item.icon ? (item.icon + " ") : "") + item.label;
    subFilter.appendChild(opt);
  });
  subFilter.value = state.activeSubcategory || "";
  sortFilter.value = state.sortMode || "newest";
  searchFilter.value = state.searchQuery || "";

  const activeSubLabel = state.activeSubcategory
    ? getCategorySubcategoryLabelRP(categorySlug, state.activeSubcategory)
    : "All subcategories";
  const searchLabel = state.searchQuery ? (' - Search: "' + state.searchQuery + '"') : "";
  summary.textContent = "Showing " + state.visibleCount + " of " + state.totalCount + " entries - " + activeSubLabel + searchLabel;

  if (!subFilter.dataset.bound) {
    subFilter.addEventListener("change", function() {
      setCategoryFilterUrlParam("subcategory", subFilter.value);
      renderCategoryPosts(categorySlug);
    });
    subFilter.dataset.bound = "1";
  }

  if (!sortFilter.dataset.bound) {
    sortFilter.addEventListener("change", function() {
      setCategoryFilterUrlParam("sort", sortFilter.value === "newest" ? "" : sortFilter.value);
      renderCategoryPosts(categorySlug);
    });
    sortFilter.dataset.bound = "1";
  }

  if (!searchFilter.dataset.bound) {
    let searchTimer = null;
    searchFilter.addEventListener("input", function() {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(function() {
        setCategoryFilterUrlParam("q", searchFilter.value.trim());
        renderCategoryPosts(categorySlug);
      }, 180);
    });
    searchFilter.dataset.bound = "1";
  }

  if (!resetBtn.dataset.bound) {
    resetBtn.addEventListener("click", function() {
      setCategoryFilterUrlParam("subcategory", "");
      setCategoryFilterUrlParam("sort", "");
      setCategoryFilterUrlParam("q", "");
      renderCategoryPosts(categorySlug);
    });
    resetBtn.dataset.bound = "1";
  }
}

function setCategoryFilterUrlParam(key, value) {
  const url = new URL(window.location.href);
  if (!value) {
    url.searchParams.delete(key);
    if (key === "subcategory") url.searchParams.delete("subcat");
  } else {
    url.searchParams.set(key, value);
    if (key === "subcategory") url.searchParams.delete("subcat");
  }
  window.history.replaceState({}, "", url.toString());
}

function getRenderableSubcategorySlug(post) {
  if (!post) return "";
  if (post.guide_subcategory) return post.guide_subcategory;
  const meta = parsePostMetaRP(post.content || "");
  return meta && meta.subcategory ? meta.subcategory : "";
}

function getCategorySubcategoriesRP(categorySlug) {
  if (typeof getCategorySubcategories === "function") {
    return getCategorySubcategories(categorySlug);
  }
  return [];
}

function getCategorySubcategoryLabelRP(categorySlug, subcategorySlug) {
  if (typeof getCategorySubcategoryLabel === "function") {
    return getCategorySubcategoryLabel(categorySlug, subcategorySlug);
  }
  return subcategorySlug || "";
}

function getCategorySubcategoryIconRP(categorySlug, subcategorySlug) {
  if (typeof getCategorySubcategoryIcon === "function") {
    return getCategorySubcategoryIcon(categorySlug, subcategorySlug);
  }
  return "";
}

function buildSubcategoryDisplayRP(categorySlug, subcategorySlug, fallbackLabel) {
  const label = fallbackLabel || getCategorySubcategoryLabelRP(categorySlug, subcategorySlug);
  const icon = getCategorySubcategoryIconRP(categorySlug, subcategorySlug);
  if (!icon) return escapeHtmlRP(label);
  return '<span class="bl-subcategory-icon" aria-hidden="true">' + escapeHtmlRP(icon) + '</span>' + escapeHtmlRP(label);
}

function enhanceSubcategoryOverview(container, categorySlug) {
  const shell = container && typeof container.closest === 'function'
    ? container.closest('.bl-guides-shell, .contribute-layout, main, body')
    : null;
  if (!shell) return;
  const overview = shell.querySelector('.bl-subcategory-overview');
  if (!overview) return;
  const subcategories = getCategorySubcategoriesRP(categorySlug);
  if (!subcategories.length) return;

  overview.innerHTML = '';
  subcategories.forEach(function(item) {
    const pill = document.createElement('span');
    pill.className = 'bl-subcategory-pill';
    pill.innerHTML = buildSubcategoryDisplayRP(categorySlug, item.slug, item.label);
    overview.appendChild(pill);
  });
}

function matchesCategorySearchRP(post, categorySlug, query) {
  const haystack = [
    post.title || '',
    post.category || '',
    post.post_type || '',
    getPostSubcategoryLabel(post) || '',
    getCategorySubcategoryLabelRP(categorySlug, getRenderableSubcategorySlug(post)) || '',
    String(post.content || '').replace(/<[^>]*>/g, ' '),
  ].join(' ').toLowerCase();

  return query.split(/\s+/).filter(Boolean).every(function(term) {
    return haystack.includes(term);
  });
}

function getAnySubcategoryLabelRP(categorySlug, subcategorySlug) {
  if (typeof getAnySubcategoryLabel === "function") {
    return getAnySubcategoryLabel(categorySlug, subcategorySlug);
  }
  return subcategorySlug || "";
}

function parsePostMetaRP(html) {
  const match = String(html || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}

function extractDiscordInvite(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html || "";
  const link = Array.from(wrapper.querySelectorAll("a[href]")).find(function(a) {
    const href = (a.getAttribute("href") || "").toLowerCase();
    return href.includes("discord.gg/") || href.includes("discord.com/invite/");
  });
  return link ? link.getAttribute("href") : "";
}

function extractDiscordWidget(html) {
  const wrapper = document.createElement("div");
  wrapper.innerHTML = html || "";
  const iframe = wrapper.querySelector("iframe[src*='discord.com/widget']");
  return iframe ? iframe.getAttribute("src") : "";
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
