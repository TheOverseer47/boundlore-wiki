// ============================================
// FILE: js/post-detail.js
// Post detail page: author/date display, upvote/downvote system,
// comment edit/delete + admin delete
// ============================================

let currentPost = null;
let currentUserId = null;
let isAdmin = false;
let postImageViewer = null;

function getContentSafetyPD() {
  return window.BoundLoreContentSafety || null;
}

function sanitizePostHtmlPD(value) {
  var cs = getContentSafetyPD();
  if (cs && typeof cs.sanitizeRichTextHtml === "function") {
    return cs.sanitizeRichTextHtml(value);
  }
  return "";
}

function sanitizeContentUrlPD(value, options) {
  var cs = getContentSafetyPD();
  if (cs && typeof cs.sanitizeContentUrl === "function") {
    return cs.sanitizeContentUrl(value, options || {});
  }
  return "";
}

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

  const resolved = await resolvePostRequestPD(slug, postId, { publicOnly: !isAdmin });
  const post = resolved.post;
  if (!post) return showNotFound();

  if (resolved.canonicalSlug && slug && resolved.canonicalSlug !== slug && post.slug === resolved.canonicalSlug) {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("slug", resolved.canonicalSlug);
    window.history.replaceState(null, "", nextUrl.pathname + nextUrl.search);
  }
  if (post.deleted_at && !isAdmin) return showNotFound();

  currentPost = post;
  await renderPost(post);
  loadReactions(post.id);
  loadComments(post.id);
  wireCommentForm(post.id);
}

async function resolvePostRequestPD(slug, postId, options) {
  const opts = options || {};
  const publicOnly = !!opts.publicOnly;
  const select = "*, profiles:author_id(*)";

  if (postId) {
    let byIdQuery = supabase.from("posts").select(select).eq("id", postId);
    if (publicOnly) byIdQuery = byIdQuery.is("deleted_at", null);
    const { data, error } = await byIdQuery.maybeSingle();
    return { post: error ? null : data, canonicalSlug: data && data.slug ? data.slug : null };
  }

  if (!slug) return { post: null, canonicalSlug: null };

  let directQuery = supabase.from("posts").select(select).eq("slug", slug);
  if (publicOnly) directQuery = directQuery.is("deleted_at", null);
  const { data: direct, error: directError } = await directQuery.maybeSingle();
  if (!directError && direct) {
    const meta = parsePostMetaPD(direct.content || "");
    const canonical = getCanonicalPostSlugPD(direct, meta);
    return {
      post: direct,
      canonicalSlug: canonical,
      requestedSlug: slug,
    };
  }

  const { data: pool, error: poolError } = await supabase
    .from("posts")
    .select(select)
    .eq("status", "published")
    .is("deleted_at", null)
    .in("category", ["creatures", "items", "biomes", "locations"])
    .order("created_at", { ascending: false })
    .limit(250);

  if (!poolError && Array.isArray(pool)) {
    for (let i = 0; i < pool.length; i += 1) {
      const candidate = pool[i];
      const meta = parsePostMetaPD(candidate.content || "");
      if (typeof EntityCore !== "undefined" && EntityCore.postMatchesSlugAlias(candidate, meta, slug)) {
        return {
          post: candidate,
          canonicalSlug: getCanonicalPostSlugPD(candidate, meta),
          requestedSlug: slug,
        };
      }
    }
  }

  return { post: null, canonicalSlug: null };
}

function getCanonicalPostSlugPD(post, meta) {
  const profile = meta && meta.entity_profile ? meta.entity_profile : {};
  if (profile.canonical_slug) return profile.canonical_slug;
  if (post && post.slug) return post.slug;
  return null;
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

async function renderPost(post) {
  document.getElementById("postLoading").style.display = "none";
  document.getElementById("postContent").style.display = "block";

  let postMeta = parsePostMetaPD(post.content || "");
  const rawDiscoveryPayloadForContext = Object.assign({}, postMeta.discovery_payload || {});
  const useWikiLayout = typeof WikiEntryLayout !== "undefined" && WikiEntryLayout.isWikiLayoutPost(post);
  if (typeof EntityCore !== "undefined" && useWikiLayout) {
    const repaired = EntityCore.normalizeEntityMeta(post, postMeta, { repairPayload: true });
    postMeta = repaired.meta;
  }
  const cleanContent = sanitizePostHtmlPD(stripPostMetaPD(post.content || ""));
  const displayTitle = typeof EntityCore !== "undefined" && useWikiLayout
    ? EntityCore.getDisplayName(postMeta, post)
    : getPostDisplayTitlePD(post, postMeta);

  document.getElementById("postTitle").textContent = displayTitle;
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

  const isStructuredDiscovery = post.post_type === "discovery" && postMeta && typeof postMeta.discovery_payload === "object";
  let wikiLayoutRendered = false;

  if (useWikiLayout && typeof KnowledgeRelations !== "undefined") {
    try {
      const effectiveCategory = typeof EntityCore !== "undefined"
        ? EntityCore.getEffectiveCategory(post, postMeta)
        : String(post.category || "").toLowerCase();
      const viewPost = effectiveCategory && effectiveCategory !== "location_hint" && effectiveCategory !== post.category
        ? Object.assign({}, post, { category: effectiveCategory })
        : post;
      let wikiRelations = KnowledgeRelations.collectEntityRelations(viewPost, postMeta);
      wikiRelations = KnowledgeRelations.dedupeRelationsForDisplay(wikiRelations);
      if (typeof KnowledgeRelations.fetchInboundRelations === "function") {
        const inbound = await KnowledgeRelations.fetchInboundRelations(supabase, viewPost, postMeta);
        wikiRelations = KnowledgeRelations.mergeRelations(wikiRelations, inbound);
      }
      wikiRelations = await resolveKnowledgeRelationsPD(wikiRelations);
      wikiRelations = await enrichTransitiveItemRelationsPD(viewPost, postMeta, wikiRelations);
      wikiRelations = await resolveKnowledgeRelationsPD(wikiRelations);
      if (postMeta.discovery_payload && typeof WikiEntryLayout.enrichPayloadFromRelations === "function") {
        postMeta.discovery_payload = WikiEntryLayout.enrichPayloadFromRelations(
          postMeta.discovery_payload || {},
          wikiRelations,
          postMeta.knowledge_entry
        );
      } else if (typeof WikiEntryLayout.enrichPayloadFromRelations === "function") {
        postMeta.discovery_payload = WikiEntryLayout.enrichPayloadFromRelations(
          {},
          wikiRelations,
          postMeta.knowledge_entry
        );
      }
      const wikiModel = WikiEntryLayout.buildModel(viewPost, postMeta, wikiRelations, cleanContent);
      wikiModel.rawDiscoveryPayload = rawDiscoveryPayloadForContext;
      document.getElementById("postBody").innerHTML = WikiEntryLayout.render(wikiModel);
      wikiLayoutRendered = true;
      document.getElementById("postContent").classList.add("bl-wiki-page");
      const postTypeBadge = document.getElementById("postTypeBadge");
      if (postTypeBadge) postTypeBadge.textContent = getPostLabelSafe(post);
    } catch (wikiErr) {
      console.warn("Wiki entry layout failed:", wikiErr);
    }
  }

  if (!wikiLayoutRendered && isStructuredDiscovery) {
    try {
      const relationSource = typeof KnowledgeRelations !== "undefined"
        ? KnowledgeRelations.relationsFromDiscoveryPost(post, postMeta)
        : (postMeta.discovery_relations || []);
      postMeta.discovery_relations = await resolveDiscoveryRelationsPD(relationSource);
    } catch (relErr) {
      console.warn("Related entry resolution failed:", relErr);
      postMeta.discovery_relations = Array.isArray(postMeta.discovery_relations) ? postMeta.discovery_relations : [];
    }
  }
  if (!wikiLayoutRendered) {
  try {
    document.getElementById("postBody").innerHTML = isStructuredDiscovery
      ? renderDiscoveryArticlePD(post, postMeta, cleanContent)
      : cleanContent;
  } catch (renderErr) {
    console.warn("Post body render failed:", renderErr);
    document.getElementById("postBody").innerHTML = cleanContent || "<p>Content could not be rendered.</p>";
  }
  }
  enhancePostImagesPD();

  const label = typeof getPostCategoryLabel === "function"
    ? getPostCategoryLabel(post)
    : (post.category || "Post");
  const effectiveCategory = typeof EntityCore !== "undefined"
    ? EntityCore.getEffectiveCategory(post, postMeta)
    : String(post.category || "");
  const displayCategoryLabel = effectiveCategory === "biomes"
    ? "Biomes"
    : (effectiveCategory === "location_hint" ? "Encounter Context" : label);
    const subcategoryLabel = getPostSubcategoryLabelPD(post, postMeta);
  document.getElementById("breadcrumbCategory").textContent = displayCategoryLabel;
  const breadcrumbTitle = document.getElementById("breadcrumbTitle");
  if (breadcrumbTitle) breadcrumbTitle.textContent = displayTitle;
  document.title = displayTitle + " - BoundLore";

  const postTypeLabel = getPostTypeLabelPD(post, postMeta, useWikiLayout);

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
    sideCategory.textContent = displayCategoryLabel;
  }

  const sideSubcategory = document.getElementById("sideSubcategory");
  if (sideSubcategory) {
    sideSubcategory.textContent = subcategoryLabel || "-";
  }

  const postCategoryChip = document.getElementById("postCategoryChip");
  if (postCategoryChip) {
    postCategoryChip.textContent = displayCategoryLabel;
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
    const safeSourceUrl = sanitizeContentUrlPD(postMeta.source_url, { allowRelative: false });
    if (safeSourceUrl) {
      sideSource.textContent = "";
      const sourceLink = document.createElement("a");
      sourceLink.textContent = "Source Link";
      const cs = getContentSafetyPD();
      if (cs && typeof cs.applySafeLinkAttributes === "function") {
        cs.applySafeLinkAttributes(sourceLink, safeSourceUrl, { targetBlank: true });
      } else {
        sourceLink.href = safeSourceUrl;
        sourceLink.target = "_blank";
        sourceLink.rel = "noopener noreferrer ugc";
      }
      sideSource.appendChild(sourceLink);
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

    // Build nav from what is actually rendered, not from the raw content
    // (legacy discovery HTML may contain headings that are no longer shown).
    const nodes = document.querySelectorAll("#postBody h1, #postBody h2, #postBody h3");
    Array.prototype.slice.call(nodes, 0, 5).forEach(function(node, index) {
      const heading = String(node.textContent || "").trim();
      if (!heading) return;
      const headingId = "post-heading-" + index;
      node.id = headingId;
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
  try {
    if (!wikiLayoutRendered) {
      await loadKnowledgeGraphPD(post, postMeta);
    }
  } catch (kgErr) {
    console.warn("Knowledge graph render failed:", kgErr);
  }
  try {
    renderStructuredDiscoveryPD(post, postMeta);
    renderGuideReferencesPD(post, postMeta);
  } catch (auxErr) {
    console.warn("Auxiliary discovery sections failed:", auxErr);
  }
  renderTestDataBadgePD(postMeta);
}

function renderTestDataBadgePD(postMeta) {
  if (!postMeta || postMeta.content_origin !== "test") return;
  const header = document.querySelector(".bl-post-header-card");
  if (!header || header.querySelector(".bl-test-data-badge")) return;
  const badge = document.createElement("p");
  badge.className = "bl-test-data-badge";
  badge.textContent = "Test data — pre-release development content";
  header.appendChild(badge);
}

function renderDiscoveryArticlePD(post, postMeta, cleanContent) {
  const payload = postMeta.discovery_payload || {};
  const resolvedRelations = Array.isArray(postMeta.discovery_relations) ? postMeta.discovery_relations : [];
  const relations = resolvedRelations.length
    ? resolvedRelations
    : buildDiscoveryDisplayRelationsPD(post, postMeta, payload);
  const displayRelations = typeof KnowledgeRelations !== "undefined"
    ? KnowledgeRelations.dedupeRelationsForDisplay(relations)
    : relations;
  const evidence = Array.isArray(postMeta.discovery_evidence) ? postMeta.discovery_evidence : [];
  const media = extractDiscoveryMediaPD(evidence, cleanContent);
  const hero = media.find(function(item) { return item.type === "image"; });
  const title = escapeHtml(getPostDisplayTitlePD(post, postMeta));
  const summary = escapeHtml(buildDiscoverySummaryPD(payload));
  const locationLine = formatDiscoveryLocationPD(payload);
  const confidence = formatDiscoveryValuePD(payload.confidence_level || "");
  const rarity = formatDiscoveryValuePD(payload.rarity || "");
  const foundName = escapeHtml(payload.entity_name || post.title || "This discovery");
  const sections = buildDiscoveryArticleSectionsPD(payload);

  let html = '<article class="bl-discovery-article">';
  html += '<section class="bl-discovery-hero-card">';
  if (hero) {
    const heroUrl = sanitizeContentUrlPD(hero.url, { allowRelative: true });
    if (heroUrl) {
      html += '<figure class="bl-discovery-hero-media"><img src="' + escapeHtml(heroUrl) + '" alt="' + title + ' evidence" /><figcaption>' + escapeHtml(hero.label || "Discovery evidence") + '</figcaption></figure>';
    }
  }
  html += '<div class="bl-discovery-hero-copy">' +
    '<p class="bl-discovery-kicker">Community Discovery</p>' +
    '<h2>' + title + '</h2>' +
    '<p>' + summary + '</p>' +
    '<div class="bl-discovery-quickfacts">' +
      renderDiscoveryQuickFactPD("Type", formatDiscoveryValuePD(payload.discovery_type || "Discovery")) +
      renderDiscoveryQuickFactPD("Location", locationLine || "Unknown") +
      renderDiscoveryQuickFactPD("Confidence", confidence || "Unknown") +
      renderDiscoveryQuickFactPD("Rarity", rarity || "Unknown") +
    '</div>' +
    '</div></section>';

  html += '<section class="bl-discovery-story-section"><h3>What Was Found</h3><p>' +
    foundName + ' was submitted as a community discovery' +
    (locationLine ? ' from ' + escapeHtml(locationLine) : '') +
    '. The report highlights the observed behavior first, then keeps the supporting details in focused sections below.</p></section>';

  sections.forEach(function(section) {
    if (!section.body) return;
    html += '<section class="bl-discovery-story-section"><h3>' + escapeHtml(section.title) + '</h3><p>' + escapeHtml(section.body) + '</p></section>';
  });

  if (media.length) {
    html += '<section class="bl-discovery-story-section"><h3>Evidence</h3><div class="bl-discovery-gallery">';
    media.forEach(function(item) {
      const itemUrl = sanitizeContentUrlPD(item.url, { allowRelative: true });
      if (!itemUrl) return;
      if (item.type === "image") {
        html += '<a class="bl-discovery-gallery-item" href="' + escapeHtml(itemUrl) + '" target="_blank" rel="noopener noreferrer ugc"><img src="' + escapeHtml(itemUrl) + '" alt="' + escapeHtml(item.label || "Discovery evidence") + '" /><span>' + escapeHtml(item.label || "Evidence image") + '</span></a>';
      } else {
        html += '<a class="bl-discovery-file-item" href="' + escapeHtml(itemUrl) + '" target="_blank" rel="noopener noreferrer ugc">' + escapeHtml(item.label || "Evidence file") + '</a>';
      }
    });
    html += '</div></section>';
  }

  if (displayRelations.length) {
    const viewerCategory = typeof KnowledgeRelations !== "undefined"
      ? KnowledgeRelations.resolveViewerCategory(post, postMeta)
      : "discoveries";
    const sections = typeof KnowledgeRelations !== "undefined"
      ? KnowledgeRelations.groupRelationsForDisplay(displayRelations, viewerCategory, { context: "discovery_post" })
      : [];
    html += '<section class="bl-discovery-story-section"><h3>Related Entries</h3>';
    if (sections.length && typeof KnowledgeRelations !== "undefined") {
      html += KnowledgeRelations.renderKnowledgeGraphHtml(sections);
    } else {
      html += '<div class="bl-discovery-relation-table-wrap"><table class="bl-discovery-relation-table"><thead><tr><th>Relation</th><th>Type</th><th>Entry</th></tr></thead><tbody>';
      displayRelations.forEach(function(rel) {
        const label = escapeHtml(typeof KnowledgeRelations !== "undefined"
          ? KnowledgeRelations.getRelationLabel(rel.relation_type || rel.group)
          : formatDiscoveryValuePD(rel.relation_type || rel.group || "related"));
        const relTitle = escapeHtml(typeof EntityCore !== "undefined"
          ? EntityCore.getRelationDisplayName(rel)
          : (rel.canonical_target_name || rel.title || "Entry"));
        const relType = escapeHtml(formatDiscoveryValuePD(rel.target_entity_type || inferRelationTargetTypePD(rel)));
        const href = buildDiscoveryRelationHrefPD(rel);
        html += '<tr><td>' + label + '</td><td>' + relType + '</td><td>' +
          (href ? '<a href="' + escapeHtml(href) + '">' + relTitle + '</a>' : relTitle) +
          '</td></tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</section>';
    html += '<section class="bl-discovery-story-section"><p>If you know more about one of these linked entries, open it and submit a follow-up discovery to expand the knowledge network.</p></section>';
  }

  html += '<details class="bl-discovery-details"><summary>Full Submitted Data</summary><div class="bl-discovery-fact-grid">';
  buildDiscoveryFactGroupsPD(payload).forEach(function(group) {
    if (!group.items.length) return;
    html += '<div class="bl-discovery-fact-card"><h4>' + escapeHtml(group.title) + '</h4><dl>';
    group.items.forEach(function(item) {
      html += '<div><dt>' + escapeHtml(item.label) + '</dt><dd>' + escapeHtml(String(item.value)) + '</dd></div>';
    });
    html += '</dl></div>';
  });
  html += '</div></details>';
  html += '</article>';
  return html;
}

function renderDiscoveryQuickFactPD(label, value) {
  return '<span><strong>' + escapeHtml(label) + '</strong>' + escapeHtml(value || "-") + '</span>';
}

function buildDiscoveryArticleSectionsPD(payload) {
  const location = formatDiscoveryLocationPD(payload);
  const encounterParts = [
    payload.time_of_day ? "Time of day: " + formatDiscoveryValuePD(payload.time_of_day) : "",
    payload.weather_condition ? "Weather: " + formatDiscoveryValuePD(payload.weather_condition) : "",
    payload.biome_context ? "Environment: " + formatDiscoveryValuePD(payload.biome_context) : "",
    payload.spawn_conditions ? "Spawn conditions: " + payload.spawn_conditions : "",
    payload.trigger_conditions ? "Trigger: " + payload.trigger_conditions : "",
    payload.requirements ? "Requirements: " + payload.requirements : "",
    payload.group_size ? "Observed group size: " + formatDiscoveryValuePD(payload.group_size) : "",
    payload.taming_method ? "Taming method: " + payload.taming_method : "",
    payload.key_item_used ? "Key item: " + payload.key_item_used : "",
    payload.combat_outcome ? "After defeat: " + formatDiscoveryValuePD(payload.combat_outcome) : "",
  ].filter(Boolean);
  const lootParts = [
    payload.dropped_items ? "Reported drops: " + payload.dropped_items : "",
    payload.loot_or_rewards ? "Rewards: " + payload.loot_or_rewards : "",
    payload.resources_or_rewards ? "Resources: " + payload.resources_or_rewards : "",
    payload.drop_rate_observation ? "Drop rate observation: " + formatDiscoveryValuePD(payload.drop_rate_observation) : "",
    payload.loot_conditions ? "Loot conditions: " + payload.loot_conditions : "",
  ].filter(Boolean);

  return [
    {
      title: "Location",
      body: location ? "Players should start around " + location + ". Coordinates or route details are included when the submitter observed them." : "",
    },
    {
      title: "Encounter Notes",
      body: encounterParts.join(" "),
    },
    {
      title: "Loot & Rewards",
      body: lootParts.length ? lootParts.join(" ") : "No confirmed loot or reward data was submitted yet.",
    },
    {
      title: "Verification",
      body: [
        payload.how_to_reproduce ? "How to reproduce: " + payload.how_to_reproduce : "",
        payload.observed_result ? "Observed result: " + payload.observed_result : "",
        payload.expected_result ? "Expected result: " + payload.expected_result : "",
      ].filter(Boolean).join(" "),
    },
  ];
}

function extractDiscoveryMediaPD(evidence, cleanContent) {
  const media = [];
  (Array.isArray(evidence) ? evidence : []).forEach(function(item) {
    if (!item || !item.url) return;
    const safeUrl = sanitizeContentUrlPD(item.url, { allowRelative: true });
    if (!safeUrl) return;
    const type = String(item.kind || item.file_type || "").toLowerCase().includes("image") ? "image" : "file";
    media.push({ type: type, url: safeUrl, label: item.label || "Evidence" });
  });

  const wrapper = document.createElement("div");
  wrapper.innerHTML = sanitizePostHtmlPD(cleanContent || "");
  Array.from(wrapper.querySelectorAll("img[src]")).forEach(function(img) {
    const url = sanitizeContentUrlPD(img.getAttribute("src") || "", { allowRelative: true });
    if (!url || media.some(function(item) { return item.url === url; })) return;
    media.push({ type: "image", url: url, label: img.getAttribute("alt") || "Discovery screenshot" });
  });
  return media;
}

function formatDiscoveryLocationPD(payload) {
  const primary = getDiscoveryPrimaryPlacePD(payload);
  const seen = new Set();
  return [primary, payload.region_name, payload.coordinates]
    .map(getMeaningfulDiscoveryValuePD)
    .filter(function(value) {
      if (!value) return false;
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(" / ");
}

function getPostDisplayTitlePD(post, postMeta) {
  const useWikiLayout = typeof WikiEntryLayout !== "undefined" && WikiEntryLayout.isWikiLayoutPost(post);
  if (typeof EntityCore !== "undefined" && useWikiLayout) {
    return EntityCore.getDisplayName(postMeta, post) || (post && post.title) || "BoundLore Post";
  }
  const payload = postMeta && typeof postMeta.discovery_payload === "object" ? postMeta.discovery_payload : null;
  if (post && post.post_type === "discovery" && payload) {
    const entityName = getMeaningfulDiscoveryValuePD(payload.entity_name);
    if (entityName) return entityName;
  }
  return (post && post.title) || "BoundLore Post";
}

function getPostTypeLabelPD(post, postMeta, useWikiLayout) {
  if (post.post_type === "guide") return "Guide";
  const category = typeof EntityCore !== "undefined"
    ? EntityCore.getEffectiveCategory(post, postMeta)
    : String(post.category || "").toLowerCase();
  if (category === "items" &&
      typeof EntityCore !== "undefined" &&
      EntityCore.isResourceEntry(postMeta, post)) {
    return "Resource";
  }
  if (typeof EntityCore !== "undefined" && EntityCore.isStationTypeEntry(postMeta, post)) {
    return "Station Type";
  }
  if (useWikiLayout) {
    if (category === "creatures") return "Creature Entry";
    if (category === "items") return "Item Entry";
    if (category === "crafting") return "Crafting Entry";
    if (category === "biomes") return "Biome Entry";
    if (category === "locations") return "Location Entry";
    return "Wiki Entry";
  }
  if (post.post_type === "discovery") return "Discovery";
  return "Post";
}

function getDiscoveryPrimaryPlacePD(payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  const foundIn = getMeaningfulDiscoveryValuePD(data.found_in);
  if (foundIn && !isGenericDiscoveryAreaPD(foundIn)) return foundIn;
  const region = getMeaningfulDiscoveryValuePD(data.region_name);
  if (region && !isGenericDiscoveryAreaPD(region)) return formatDiscoveryValuePD(region);
  const biome = getMeaningfulDiscoveryValuePD(data.biome_context);
  if (biome && !isGenericDiscoveryAreaPD(biome)) return formatDiscoveryValuePD(biome);
  const inferred = inferPlaceFromDiscoveryTextPD([
    data.how_to_reproduce,
    data.spawn_conditions,
    data.taming_method,
    data.observed_result,
  ]);
  if (inferred) return inferred;
  const world = getMeaningfulDiscoveryValuePD(data.world_name);
  if (world && !isGenericDiscoveryAreaPD(world)) return world;
  return "";
}

function isGenericDiscoveryAreaPD(value) {
  const lower = String(value || "").trim().toLowerCase();
  return ["central", "center", "north", "northern", "south", "southern", "east", "eastern", "west", "western", "middle", "upper", "lower", "inner", "outer"].includes(lower);
}

function inferPlaceFromDiscoveryTextPD(values) {
  const text = (values || []).map(function(value) { return String(value || ""); }).join(" ");
  const match = text.match(/\b(?:in|inside|within|around|near)\s+(?:the\s+)?([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,3})\b/);
  if (!match) return "";
  const place = getMeaningfulDiscoveryValuePD(match[1]);
  return place && !isGenericDiscoveryAreaPD(place) ? place : "";
}

function getMeaningfulDiscoveryValuePD(value) {
  const clean = String(value || "").trim();
  const lower = clean.toLowerCase();
  if (!clean) return "";
  if (["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) return "";
  return clean;
}

function buildDiscoveryDisplayRelationsPD(post, postMeta, payload) {
  if (typeof KnowledgeRelations !== "undefined") {
    return KnowledgeRelations.relationsFromDiscoveryPost(post, postMeta);
  }
  const relations = Array.isArray(postMeta && postMeta.discovery_relations) ? postMeta.discovery_relations.slice() : [];
  const existing = new Set(relations.map(function(rel) {
    return String(rel.group || "") + "|" + String(rel.title || "").toLowerCase();
  }));

  function add(group, relationType, title, opts) {
    const cleanTitle = getMeaningfulDiscoveryValuePD(title);
    if (!cleanTitle) return;
    const key = group + "|" + cleanTitle.toLowerCase();
    if (existing.has(key)) return;
    existing.add(key);
    relations.push(Object.assign({
      group: group,
      relation_type: relationType,
      title: cleanTitle,
      target_entity_type: inferRelationTargetTypePD({ group: group }),
      auto_inferred: true,
    }, opts || {}));
  }

  const primaryPlace = getDiscoveryPrimaryPlacePD(payload);
  add("locations", "found_in", primaryPlace, { target_entity_type: "location" });
  add("items", "requires", payload && payload.key_item_used, { target_entity_type: "item" });
  extractLikelyItemNamesPD([
    payload && payload.taming_method,
    payload && payload.requirements,
    payload && payload.loot_conditions,
    payload && payload.how_to_reproduce,
  ]).forEach(function(itemName) {
    add("items", "requires", itemName, { target_entity_type: "item" });
  });
  extractListLikeValuesPD(payload && (payload.dropped_items || payload.loot_or_rewards || payload.resources_or_rewards)).forEach(function(itemName) {
    add("items", "drops", itemName, { target_entity_type: "item" });
  });

  return relations;
}

async function resolveDiscoveryRelationsPD(sourceRelations) {
  const source = Array.isArray(sourceRelations) ? sourceRelations : [];
  const resolved = [];
  const seen = new Set();

  for (const rel of source) {
    if (!rel || !rel.title) continue;
    const dedupeKey = typeof KnowledgeRelations !== "undefined"
      ? KnowledgeRelations.dedupeKeyForRelation(rel)
      : String(rel.group || "") + "|" + String(rel.relation_type || "") + "|" + String(rel.title || "").trim().toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const next = Object.assign({}, rel);
    if (!next.slug && !next.id) {
      const match = await findKnowledgeTargetPostPD(next);
      if (match) {
        next.id = match.id;
        next.slug = match.slug || null;
        next.category = next.category || match.category || null;
        next.post_type = next.post_type || match.post_type || null;
        next.resolved = true;
      }
    }
    if (typeof EntityCore !== "undefined") {
      Object.assign(next, EntityCore.enrichRelation(next));
    }
    resolved.push(next);
  }

  return resolved;
}

async function findKnowledgeTargetPostPD(rel) {
  const category = rel.category || mapRelationToCategoryPD(rel);
  const title = String(rel && rel.canonical_target_name || rel && rel.title || "").trim();
  if (!category || !title) return null;

  let canonical = title;
  let entityKey = null;
  let aliases = [];
  if (typeof EntityCore !== "undefined") {
    const identity = EntityCore.extractCanonicalIdentity(title, category);
    canonical = identity.canonical_name || title;
    entityKey = EntityCore.buildEntityKey(category, canonical);
    aliases = EntityCore.getBiomeAliases(canonical);
  }

  if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.findExistingKnowledgePost) {
    const existing = await KnowledgeRelations.findExistingKnowledgePost(supabase, canonical, category);
    if (existing) return existing;
    if (aliases.length) {
      for (let i = 0; i < aliases.length; i += 1) {
        const aliasMatch = await KnowledgeRelations.findExistingKnowledgePost(supabase, aliases[i], category);
        if (aliasMatch) return aliasMatch;
      }
    }
  }

  let query = supabase
    .from("posts")
    .select("id, slug, title, category, post_type, content")
    .eq("category", category)
    .limit(40);

  if (category === "guides") {
    query = supabase
      .from("posts")
      .select("id, slug, title, category, post_type, content")
      .eq("post_type", "guide")
      .limit(40);
  }

  const { data, error } = await query;
  if (error || !Array.isArray(data)) return null;
  return data.find(function(row) {
    if (typeof EntityCore !== "undefined" && EntityCore.titlesMatchEntity(row, canonical, entityKey)) {
      return true;
    }
    return String(row.title || "").trim().toLowerCase() === title.toLowerCase();
  }) || null;
}

function mapRelationToCategoryPD(rel) {
  const group = String(rel && rel.group || "").toLowerCase();
  if (group === "items") return "items";
  if (group === "creatures") return "creatures";
  if (group === "guides") return "guides";
  if (group === "locations") {
    const targetType = String(rel && rel.target_entity_type || "").toLowerCase();
    return targetType === "biome" ? "biomes" : "locations";
  }
  return "";
}

function inferRelationTargetTypePD(rel) {
  const group = String(rel && rel.group || "").toLowerCase();
  if (group === "items") return "item";
  if (group === "locations") return "location";
  if (group === "creatures") return "creature";
  if (group === "guides") return "guide";
  return "entry";
}

function buildDiscoveryRelationHrefPD(rel) {
  if (!rel) return "";
  if (rel.slug) return "/wiki/post/?slug=" + encodeURIComponent(rel.slug);
  if (rel.id) return "/wiki/post/?id=" + encodeURIComponent(rel.id);
  const group = String(rel.group || "").toLowerCase();
  const title = String(rel.title || "").trim();
  if (!title) return "";
  return "";
}

function extractLikelyItemNamesPD(values) {
  const out = [];
  (values || []).forEach(function(value) {
    const text = String(value || "");
    const quoted = text.match(/"([^"]{3,80})"/g) || [];
    quoted.forEach(function(match) {
      out.push(match.replace(/^"|"$/g, ""));
    });
    const itemNames = text.match(/\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){1,5}\s+(?:Medallion|Amulet|Key|Charm|Heart|Stone|Token|Relic|Compass|Crystal|Orb))\b/g) || [];
    itemNames.forEach(function(match) { out.push(match); });
  });
  return Array.from(new Set(out.map(function(item) { return item.trim(); }).filter(Boolean)));
}

function extractListLikeValuesPD(value) {
  return String(value || "")
    .split(/[,;\n]+/)
    .map(function(item) { return item.trim().replace(/^\d+x?\s*/i, ""); })
    .filter(function(item) {
      const lower = item.toLowerCase();
      return item.length >= 3 && !["unknown", "unclear", "none", "not observed"].includes(lower);
    })
    .slice(0, 8);
}

function formatDiscoveryValuePD(value) {
  return String(value || "")
    .replace(/^\d-/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
    .trim();
}

function renderStructuredDiscoveryPD(post, postMeta) {
  const section = document.getElementById("postDiscoveryData");
  if (!section) return;
  section.style.display = "none";
  section.innerHTML = "";

  if (!post || post.post_type !== "discovery") return;
  const payload = postMeta && typeof postMeta.discovery_payload === "object" ? postMeta.discovery_payload : null;
  const relations = Array.isArray(postMeta && postMeta.discovery_relations) ? postMeta.discovery_relations : [];
  const evidence = Array.isArray(postMeta && postMeta.discovery_evidence) ? postMeta.discovery_evidence : [];
  if (payload) return;
  if (!payload && relations.length === 0 && evidence.length === 0) return;

  section.style.display = "block";
  let html = '<h3 class="bl-related-title">Discovery Data Network</h3>';

  if (payload && Object.keys(payload).length) {
    const summary = buildDiscoverySummaryPD(payload);
    if (summary) {
      html += '<p class="bl-discovery-summary">' + escapeHtml(summary) + '</p>';
    }
    html += '<div class="bl-discovery-fact-grid">';
    buildDiscoveryFactGroupsPD(payload).forEach(function(group) {
      if (!group.items.length) return;
      html += '<div class="bl-discovery-fact-card"><h4>' + escapeHtml(group.title) + '</h4><dl>';
      group.items.forEach(function(item) {
        html += '<div><dt>' + escapeHtml(item.label) + '</dt><dd>' + escapeHtml(String(item.value)) + '</dd></div>';
      });
      html += '</dl></div>';
    });
    html += '</div>';
  }

  if (relations.length) {
    html += '<div class="bl-related-group"><h4 class="bl-related-group-title">Auto-Linked Dependencies</h4><ul class="source-list">';
    relations.forEach(function(rel) {
      const relLabel = escapeHtml(String(rel.relation_type || rel.group || "related_to").replace(/_/g, " "));
      const title = escapeHtml(typeof EntityCore !== "undefined"
        ? EntityCore.getRelationDisplayName(rel)
        : (rel.canonical_target_name || rel.title || "Entry"));
      const href = buildDiscoveryRelationHrefPD(rel);
      if (href) {
        html += '<li><strong>' + relLabel + ':</strong> <a href="' + escapeHtml(href) + '">' + title + '</a></li>';
      } else {
        html += '<li><strong>' + relLabel + ':</strong> ' + title + '</li>';
      }
    });
    html += '</ul></div>';
  }

  if (evidence.length) {
    html += '<div class="bl-related-group"><h4 class="bl-related-group-title">Evidence Mapping</h4><ul class="source-list">';
    evidence.forEach(function(item) {
      const supports = Array.isArray(item.supports) && item.supports.length
        ? item.supports.map(function(key) { return escapeHtml(String(key).replace(/_/g, " ")); }).join(', ')
        : 'general evidence';
      const label = escapeHtml(item.label || 'Evidence');
      const note = item.note ? ('<div style="color:var(--text-muted);font-size:0.84rem;">' + escapeHtml(item.note) + '</div>') : '';
      if (item.url) {
        html += '<li><strong>Supports:</strong> ' + supports + '<br><a href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' + label + '</a>' + note + '</li>';
      } else {
        html += '<li><strong>Supports:</strong> ' + supports + '<br>' + label + note + '</li>';
      }
    });
    html += '</ul></div>';
  }

  section.innerHTML = html;
}

function buildDiscoverySummaryPD(payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  const name = String(data.entity_name || "This discovery").trim();
  const place = getDiscoveryPrimaryPlacePD(data);
  const confidence = String(data.confidence_level || "").replace(/^\d-/, "").replace(/-/g, " ");
  const loot = String(data.dropped_items || data.loot_or_rewards || data.resources_or_rewards || "").trim();
  const parts = [];

  parts.push(name + (place ? " was reported in " + place : " was reported by the community"));
  if (loot) parts.push("loot or reward observations are included");
  if (confidence) parts.push("confidence is marked as " + confidence);
  return parts.join(", ") + ".";
}

function buildDiscoveryFactGroupsPD(payload) {
  const data = payload && typeof payload === "object" ? payload : {};
  const used = new Set();
  const groups = [
    { title: "Identity", keys: ["discovery_type", "entity_name", "alt_names", "rarity", "confidence_level", "impact_area"], items: [] },
    { title: "Location", keys: ["world_name", "region_name", "found_in", "coordinates", "climate"], items: [] },
    { title: "Encounter", keys: ["time_of_day", "weather_condition", "biome_context", "spawn_conditions", "trigger_conditions", "requirements", "group_size", "combat_outcome", "mountable", "health_points", "taming_method", "key_item_used"], items: [] },
    { title: "Loot & Rewards", keys: ["dropped_items", "loot_or_rewards", "resources_or_rewards", "dropped_by", "source_type", "drop_rate_observation", "drop_conditions", "loot_conditions"], items: [] },
    { title: "Verification", keys: ["how_to_reproduce", "observed_result", "expected_result", "first_seen_version", "last_confirmed_version", "automation_tags", "notes"], items: [] },
  ];

  groups.forEach(function(group) {
    group.keys.forEach(function(key) {
      const value = data[key];
      if (value == null || value === "") return;
      used.add(key);
      group.items.push({ label: humanizeDiscoveryKeyPD(key), value: value });
    });
  });

  Object.keys(data).forEach(function(key) {
    if (used.has(key) || data[key] == null || data[key] === "") return;
    groups[groups.length - 1].items.push({ label: humanizeDiscoveryKeyPD(key), value: data[key] });
  });

  return groups;
}

function humanizeDiscoveryKeyPD(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
    .trim();
}

function renderGuideReferencesPD(post, postMeta) {
  const section = document.getElementById("postDiscoveryData");
  if (!section || !post || post.post_type !== "guide") return;
  const refs = Array.isArray(postMeta && postMeta.guide_references) ? postMeta.guide_references : [];
  if (!refs.length) return;

  section.style.display = "block";
  section.innerHTML = '<h3 class="bl-related-title">Guide Reference Network</h3>' +
    '<div class="bl-related-group"><h4 class="bl-related-group-title">Referenced Entries</h4><ul class="source-list">' +
    refs.map(function(ref) {
      const label = escapeHtml(ref.title || "Entry");
      const type = escapeHtml(ref.post_type === "guide" ? "Guide" : (ref.category || "Entry"));
      if (ref.slug) {
        return '<li><a href="/wiki/post/?slug=' + encodeURIComponent(ref.slug) + '">' + label + '</a> <span style="color:var(--text-muted);">(' + type + ')</span></li>';
      }
      return '<li>' + label + ' <span style="color:var(--text-muted);">(' + type + ')</span></li>';
    }).join('') +
    '</ul></div>';
}

async function loadKnowledgeGraphPD(post, postMeta) {
  const section = document.getElementById("postDiscoveryData");
  if (!section || typeof KnowledgeRelations === "undefined") return;
  if (post && post.post_type === "discovery" && postMeta && postMeta.discovery_payload) return;

  let relations = [];
  try {
    relations = KnowledgeRelations.collectEntityRelations(post, postMeta || {});
    relations = KnowledgeRelations.dedupeRelationsForDisplay(relations);
    relations = await resolveKnowledgeRelationsPD(relations);
  } catch (err) {
    console.warn("Could not collect entity relations:", err);
    return;
  }

  const viewerCategory = KnowledgeRelations.resolveViewerCategory(post, postMeta || {});
  const sections = KnowledgeRelations.groupRelationsForDisplay(relations, viewerCategory);
  if (!sections.length) return;

  const stubMeta = postMeta && postMeta.knowledge_entry;
  const stubBadge = stubMeta && (stubMeta.status === "needs_details" || stubMeta.completeness === "stub")
    ? "Stub entry — some details still missing"
    : "";

  section.style.display = "block";
  section.innerHTML = '<h3 class="bl-related-title">Knowledge Connections</h3>' +
    KnowledgeRelations.renderKnowledgeGraphHtml(sections, { stubBadge: stubBadge });
}

async function enrichTransitiveItemRelationsPD(post, postMeta, relations) {
  const cat = String(post && post.category || "").toLowerCase();
  if (cat !== "items" || typeof EntityCore === "undefined") return relations;
  const hasBiome = (Array.isArray(relations) ? relations : []).some(function(rel) {
    const type = KnowledgeRelations.normalizeRelationType(rel.relation_type);
    return (type === "located_in" || type === "part_of")
      && (String(rel.category || "").toLowerCase() === "biomes" || rel.target_entity_type === "biome");
  });
  if (hasBiome) return relations;

  const droppedRel = (Array.isArray(relations) ? relations : []).find(function(rel) {
    return KnowledgeRelations.normalizeRelationType(rel.relation_type) === "dropped_by";
  });
  if (!droppedRel || !droppedRel.title) return relations;

  const creature = await findKnowledgeTargetPostPD(Object.assign({}, droppedRel, {
    group: "creatures",
    category: "creatures",
    target_entity_type: "creature",
  }));
  if (!creature) return relations;

  const creatureMeta = parsePostMetaPD(creature.content || "");
  const repairedMeta = typeof EntityCore !== "undefined"
    ? EntityCore.normalizeEntityMeta(creature, creatureMeta, { repairPayload: true }).meta
    : creatureMeta;
  let creatureRels = KnowledgeRelations.collectEntityRelations(creature, repairedMeta);
  if (!creatureRels.some(function(rel) {
    const type = KnowledgeRelations.normalizeRelationType(rel.relation_type);
    return (type === "located_in" || type === "part_of")
      && (String(rel.category || "").toLowerCase() === "biomes" || rel.target_entity_type === "biome" || EntityCore.isKnownBiomeName(rel.title));
  })) {
    const inferred = [];
    KnowledgeRelations.appendAutoRelations(
      inferred,
      repairedMeta.discovery_payload || {},
      creature.category,
      { sourceTitle: creature.title, sourceCategory: creature.category }
    );
    creatureRels = KnowledgeRelations.mergeRelations(creatureRels, inferred);
  }
  const biomeRel = creatureRels.find(function(rel) {
    const type = KnowledgeRelations.normalizeRelationType(rel.relation_type);
    return (type === "located_in" || type === "part_of")
      && (String(rel.category || "").toLowerCase() === "biomes" || rel.target_entity_type === "biome" || EntityCore.isKnownBiomeName(rel.title));
  });
  if (!biomeRel) return relations;

  return KnowledgeRelations.mergeRelations(relations, [Object.assign({}, biomeRel, {
    relation_type: "located_in",
    auto_inferred: true,
    direction: "outbound",
    confidence: Math.max(70, Number(biomeRel.confidence) || 75),
  })]);
}

async function resolveKnowledgeRelationsPD(relations) {
  const resolved = [];
  const seen = new Set();

  for (const rel of relations) {
    if (!rel || !rel.title) continue;
    const dedupeKey = typeof KnowledgeRelations !== "undefined"
      ? KnowledgeRelations.dedupeKeyForRelation(rel)
      : String(rel.group || "") + "|" + String(rel.title || "").toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const next = Object.assign({}, rel);
    if (!next.slug && !next.id) {
      const match = await findKnowledgeTargetPostPD(next);
      if (match) {
        next.id = match.id;
        next.slug = match.slug || null;
        next.category = next.category || match.category || null;
        next.post_type = next.post_type || match.post_type || null;
        next.resolved = true;
      }
    }
    if (typeof EntityCore !== "undefined") {
      Object.assign(next, EntityCore.enrichRelation(next));
    }
    resolved.push(next);
  }
  return resolved;
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
    .is("deleted_at", null)
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
  }).filter(function(item) {
    return !isPrimaryRelationTargetPD(post, postMeta, item);
  }).filter(function(item) {
    return !isContextualSeeAlsoDuplicatePD(post, postMeta, item);
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
  const postMeta = parsePostMetaPD(post.content || "");
  const useWikiLayout = typeof WikiEntryLayout !== "undefined" && WikiEntryLayout.isWikiLayoutPost(post);
  const typeLabel = getPostTypeLabelPD(post, postMeta, useWikiLayout);
  const categoryLabel = getPostLabelSafe(post);
  const subcategoryLabel = getPostSubcategoryLabelPD(post, postMeta);
  return subcategoryLabel
    ? (typeLabel + " · " + categoryLabel + " · " + subcategoryLabel)
    : (typeLabel + " · " + categoryLabel);
}

function getPostSubcategoryLabelPD(post, postMeta) {
  if (String(post.category || "").toLowerCase() === "items" &&
      typeof EntityCore !== "undefined" &&
      EntityCore.isResourceEntry(postMeta, post)) {
    return "Resource";
  }
  if (typeof EntityCore !== "undefined" && EntityCore.isStationTypeEntry(postMeta, post)) {
    return "Station Type";
  }
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

function collectPrimaryRelationTargetsPD(postMeta) {
  const keys = new Set();
  const rels = postMeta && Array.isArray(postMeta.discovery_relations) ? postMeta.discovery_relations : [];
  rels.forEach(function(rel) {
    if (!rel) return;
    if (rel.id) keys.add(String(rel.id));
    if (rel.slug) keys.add(String(rel.slug).toLowerCase());
  });
  return keys;
}

function isPrimaryRelationTargetPD(post, postMeta, candidate) {
  const keys = collectPrimaryRelationTargetsPD(postMeta);
  if (candidate.id && keys.has(String(candidate.id))) return true;
  if (candidate.slug && keys.has(String(candidate.slug).toLowerCase())) return true;
  return false;
}

function isContextualSeeAlsoDuplicatePD(currentPost, currentMeta, candidate) {
  const candidateMeta = parsePostMetaPD(candidate.content || "");
  const currentName = typeof EntityCore !== "undefined"
    ? String(EntityCore.getDisplayName(currentMeta, currentPost) || "").toLowerCase()
    : String(currentPost.title || "").toLowerCase();
  const candidateName = typeof EntityCore !== "undefined"
    ? String(EntityCore.getDisplayName(candidateMeta, candidate) || "").toLowerCase()
    : String(candidate.title || "").toLowerCase();
  if (currentName && candidateName && currentName === candidateName) return true;
  if (typeof EntityCore !== "undefined" && EntityCore.slugLooksContextual(candidate.slug, candidateName)) return true;
  const title = String(candidate.title || "");
  if (title && /\s+in\s+/i.test(title) && candidate.category === currentPost.category) {
    const baseTitle = title.replace(/\s+in\s+.+$/i, "").trim().toLowerCase();
    if (baseTitle && baseTitle === currentName) return true;
  }
  return false;
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

  const candidateDisplayName = typeof EntityCore !== "undefined"
    ? EntityCore.getDisplayName(candidateMeta, candidate)
    : (candidate.title || "");
  if (typeof EntityCore !== "undefined" && EntityCore.slugLooksContextual(candidate.slug, candidateDisplayName)) {
    score -= 6;
  }

  const currentSlugTokens = tokenizeRelatedTermsPD(currentPost.slug || currentPost.title || "");
  const candidateSlugTokens = tokenizeRelatedTermsPD(candidate.slug || candidateDisplayName || "");
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
  const label = (typeof EntityCore !== "undefined" && item.content)
    ? EntityCore.getDisplayName(parsePostMetaPD(item.content || ""), item)
    : (item.label || item.title || "Untitled");
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
  if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.safeParseMeta) {
    return KnowledgeRelations.safeParseMeta(html);
  }
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
      const cs = getContentSafetyPD();
      const safeSrc = cs && typeof cs.sanitizeImageSrc === "function"
        ? cs.sanitizeImageSrc(node.getAttribute("src") || "")
        : "";
      if (!safeSrc) return;
      viewer.img.setAttribute("src", safeSrc);
      viewer.img.setAttribute("alt", node.getAttribute("alt") || "Post image");
      viewer.img.classList.remove("zoomed");
      viewer.overlay.classList.add("open");
    });
  });
}
