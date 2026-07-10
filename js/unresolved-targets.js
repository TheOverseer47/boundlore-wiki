// ============================================
// BoundLore Unresolved Targets — P0.5-C baseline
// Derived/in-memory missing entry records from approved
// published content. No DB writes, no stub creation.
// ============================================

window.BoundLoreUnresolvedTargets = (function() {
  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function meaningful(value) {
    const clean = String(value || "").trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    if (["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) {
      return "";
    }
    return clean;
  }

  function parsePostMeta(content) {
    const match = String(content || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
    if (!match) return {};
    try {
      const parsed = JSON.parse(match[1]);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function isContributionPost(post, meta) {
    if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.isContributionPost) {
      return KnowledgeRelations.isContributionPost(post, meta);
    }
    const m = meta || parsePostMeta(post && post.content || "");
    if (m.contribution && typeof m.contribution === "object") return true;
    if (m.discovery_record_status === "contribution") return true;
    if (m.contribution_intent) return true;
    if (m.discovery_payload && m.discovery_payload.contribution_intent) return true;
    if (post && /^contribution-/i.test(String(post.slug || ""))) return true;
    return false;
  }

  function isPublishedSourcePost(post) {
    if (!post) return false;
    if (String(post.status || "").toLowerCase() !== "published") return false;
    if (post.deleted_at) return false;
    return true;
  }

  function normalizeUnresolvedTargetName(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function buildUnresolvedTargetKey(name, context) {
    void context;
    const normalized = normalizeUnresolvedTargetName(name).toLowerCase();
    return normalized || "";
  }

  function titleCaseLabel(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
      .trim();
  }

  function inferSuggestedDomainAndSubtype(target, context) {
    const ctx = context || {};
    const kind = String(ctx.kind || ctx.target_kind || "").toLowerCase();

    if (kind === "station" || kind === "crafted_at" || ctx.relation_type === "crafted_at") {
      return {
        suggested_domain: "SYSTEM",
        suggested_subtype: "station_type",
        suggested_reason: "Used as crafting station",
      };
    }

    if (kind === "ingredient" || kind === "crafted_from" || ctx.relation_type === "crafted_from") {
      return {
        suggested_domain: "OBJECT",
        suggested_subtype: "resource",
        suggested_reason: "Used as recipe ingredient",
      };
    }

    return {
      suggested_domain: "OBJECT",
      suggested_subtype: "item",
      suggested_reason: "Referenced in approved content",
    };
  }

  function getPostDisplayName(post, meta) {
    if (typeof EntityCore !== "undefined" && EntityCore.getDisplayName) {
      return EntityCore.getDisplayName(meta, post) || post.title || "";
    }
    return post && post.title ? post.title : "";
  }

  function buildResolvedEntityIndex(posts) {
    const index = {};
    (Array.isArray(posts) ? posts : []).forEach(function(post) {
      if (!isPublishedSourcePost(post)) return;
      const meta = parsePostMeta(post.content || "");
      if (isContributionPost(post, meta)) return;

      const names = new Set();
      if (post.title) names.add(normalizeUnresolvedTargetName(post.title));
      const display = getPostDisplayName(post, meta);
      if (display) names.add(normalizeUnresolvedTargetName(display));

      if (typeof EntityCore !== "undefined" && EntityCore.extractCanonicalIdentity) {
        const payload = meta.discovery_payload || {};
        const identity = EntityCore.extractCanonicalIdentity(post.title, post.category, { payload: payload });
        if (identity && identity.canonical_name) {
          names.add(normalizeUnresolvedTargetName(identity.canonical_name));
        }
      }

      names.forEach(function(name) {
        const key = buildUnresolvedTargetKey(name);
        if (!key) return;
        if (!index[key]) {
          index[key] = {
            slug: post.slug || null,
            id: post.id || null,
            title: name,
          };
        }
      });
    });
    return index;
  }

  function buildRelationTitleIndex(relations) {
    const index = {};
    (Array.isArray(relations) ? relations : []).forEach(function(rel) {
      if (!rel || !rel.title) return;
      const key = String(rel.title).trim().toLowerCase();
      if (!key) return;
      const href = typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.buildRelationHref
        ? KnowledgeRelations.buildRelationHref(rel)
        : (rel.slug ? "/wiki/post/?slug=" + encodeURIComponent(rel.slug) : (rel.id ? "/wiki/post/?id=" + encodeURIComponent(rel.id) : ""));
      if (!index[key] || href) index[key] = Object.assign({}, rel, { _href: href });
    });
    return index;
  }

  function isTargetResolved(name, relIndex, resolvedIndex) {
    const key = buildUnresolvedTargetKey(name);
    if (!key) return true;

    if (resolvedIndex && resolvedIndex[key]) return true;

    const rel = relIndex && relIndex[key] ? relIndex[key] : null;
    if (!rel) return false;

    if (rel.slug || rel.id) return true;
    if (rel._href) return true;
    if (resolvedIndex && rel.title && resolvedIndex[buildUnresolvedTargetKey(rel.title)]) return true;

    return false;
  }

  function createContextEntry(sourcePost, meta, label, extra) {
    const display = getPostDisplayName(sourcePost, meta) || sourcePost.title || "Entry";
    const slug = sourcePost.slug || "";
    const url = slug ? "/wiki/post/?slug=" + encodeURIComponent(slug) : "";
    return Object.assign({
      source_title: display,
      source_slug: slug,
      source_url: url,
      label: label || "Reference",
      seen_at: sourcePost.updated_at || sourcePost.created_at || null,
    }, extra || {});
  }

  function createRecordSeed(name, context, sourcePost, meta) {
    const displayName = normalizeUnresolvedTargetName(name);
    const key = buildUnresolvedTargetKey(displayName, context);
    if (!key) return null;

    const suggestion = inferSuggestedDomainAndSubtype(displayName, context);
    const ctx = createContextEntry(sourcePost, meta, context.label || context.kind || "Reference", {
      kind: context.kind || context.target_kind || "",
      relation_type: context.relation_type || "",
    });

    return {
      key: key,
      display_name: displayName,
      normalized_name: key,
      mention_count: 1,
      distinct_sources: sourcePost && sourcePost.slug ? [sourcePost.slug] : (sourcePost && sourcePost.id ? [sourcePost.id] : []),
      inbound_relation_types: context.relation_type ? [context.relation_type] : [],
      contexts: [ctx],
      suggested_domain: suggestion.suggested_domain,
      suggested_subtype: suggestion.suggested_subtype,
      suggested_reason: suggestion.suggested_reason,
      first_seen: sourcePost && (sourcePost.created_at || sourcePost.updated_at) || null,
      last_seen: sourcePost && (sourcePost.updated_at || sourcePost.created_at) || null,
      status: "unresolved",
    };
  }

  function collectUnresolvedTargetsFromRecipe(post, meta, resolvedIndex) {
    const records = [];
    if (!isPublishedSourcePost(post) || isContributionPost(post, meta)) return records;

    const payload = meta && meta.discovery_payload && typeof meta.discovery_payload === "object"
      ? meta.discovery_payload
      : {};
    const relations = Array.isArray(meta.discovery_relations) ? meta.discovery_relations : [];
    const relIndex = buildRelationTitleIndex(relations);
    const recipe = payload.recipe && typeof payload.recipe === "object" ? payload.recipe : null;
    const seenKeys = new Set();

    function addTarget(name, context) {
      const clean = meaningful(name);
      if (!clean) return;
      if (isTargetResolved(clean, relIndex, resolvedIndex)) return;
      const key = buildUnresolvedTargetKey(clean, context);
      if (!key || seenKeys.has(key)) return;
      seenKeys.add(key);
      const seed = createRecordSeed(clean, context, post, meta);
      if (seed) records.push(seed);
    }

    if (recipe) {
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      ingredients.forEach(function(row) {
        addTarget(row && (row.name || row.title || row.target_name), {
          kind: "ingredient",
          relation_type: "crafted_from",
          label: "Recipe Ingredient",
          target_kind: "ingredient",
        });
      });

      addTarget(recipe.station || recipe.crafting_station, {
        kind: "station",
        relation_type: "crafted_at",
        label: "Crafting Station",
        target_kind: "station",
      });
    }

    relations.forEach(function(rel) {
      if (!rel) return;
      const type = String(rel.relation_type || "").toLowerCase();
      if (type === "crafted_from") {
        addTarget(rel.title, {
          kind: "ingredient",
          relation_type: "crafted_from",
          label: "Recipe Ingredient",
          target_kind: "ingredient",
        });
      } else if (type === "crafted_at") {
        addTarget(rel.title, {
          kind: "station",
          relation_type: "crafted_at",
          label: "Crafting Station",
          target_kind: "station",
        });
      }
    });

    return records;
  }

  function collectUnresolvedTargetsFromRelations(post, meta, resolvedIndex) {
    const records = [];
    if (!isPublishedSourcePost(post) || isContributionPost(post, meta)) return records;

    const relations = Array.isArray(meta && meta.discovery_relations) ? meta.discovery_relations : [];
    const relIndex = buildRelationTitleIndex(relations);
    const craftTypes = ["crafted_from", "crafted_at", "ingredient_of"];

    relations.forEach(function(rel) {
      if (!rel) return;
      const type = String(rel.relation_type || "").toLowerCase();
      if (!craftTypes.includes(type)) return;
      const name = meaningful(rel.title);
      if (!name || isTargetResolved(name, relIndex, resolvedIndex)) return;

      const kind = type === "crafted_at" ? "station" : "ingredient";
      const seed = createRecordSeed(name, {
        kind: kind,
        relation_type: type,
        label: type === "crafted_at" ? "Crafting Station" : "Recipe Ingredient",
        target_kind: kind,
      }, post, meta);
      if (seed) records.push(seed);
    });

    return records;
  }

  function collectUnresolvedTargetsFromPost(post, resolvedIndex) {
    if (!post) return [];
    const meta = parsePostMeta(post.content || "");
    if (!isPublishedSourcePost(post) || isContributionPost(post, meta)) return [];

    const index = resolvedIndex || buildResolvedEntityIndex([post]);
    const fromRecipe = collectUnresolvedTargetsFromRecipe(post, meta, index);
    return mergeUnresolvedTargetRecords(fromRecipe);
  }

  function collectUnresolvedTargetsFromPosts(posts) {
    const list = Array.isArray(posts) ? posts : [];
    const published = list.filter(function(post) {
      const meta = parsePostMeta(post.content || "");
      return isPublishedSourcePost(post) && !isContributionPost(post, meta);
    });
    const resolvedIndex = buildResolvedEntityIndex(published);
    let records = [];

    published.forEach(function(post) {
      const meta = parsePostMeta(post.content || "");
      records = records.concat(collectUnresolvedTargetsFromRecipe(post, meta, resolvedIndex));
    });

    return sortUnresolvedTargetRecords(mergeUnresolvedTargetRecords(records));
  }

  function mergeUnresolvedTargetRecords(records) {
    const map = {};
    (Array.isArray(records) ? records : []).forEach(function(record) {
      if (!record || !record.key) return;
      const existing = map[record.key];
      if (!existing) {
        map[record.key] = Object.assign({}, record, {
          distinct_sources: (record.distinct_sources || []).slice(),
          inbound_relation_types: (record.inbound_relation_types || []).slice(),
          contexts: (record.contexts || []).slice(),
        });
        return;
      }

      existing.mention_count = (existing.mention_count || 0) + (record.mention_count || 1);

      (record.distinct_sources || []).forEach(function(source) {
        if (source && existing.distinct_sources.indexOf(source) === -1) {
          existing.distinct_sources.push(source);
        }
      });

      (record.inbound_relation_types || []).forEach(function(type) {
        if (type && existing.inbound_relation_types.indexOf(type) === -1) {
          existing.inbound_relation_types.push(type);
        }
      });

      (record.contexts || []).forEach(function(ctx) {
        const dup = existing.contexts.some(function(existingCtx) {
          return existingCtx.source_slug === ctx.source_slug
            && existingCtx.label === ctx.label
            && existingCtx.kind === ctx.kind;
        });
        if (!dup) existing.contexts.push(ctx);
      });

      if (record.last_seen && (!existing.last_seen || record.last_seen > existing.last_seen)) {
        existing.last_seen = record.last_seen;
      }
      if (record.first_seen && (!existing.first_seen || record.first_seen < existing.first_seen)) {
        existing.first_seen = record.first_seen;
      }
    });

    return Object.keys(map).map(function(key) { return map[key]; });
  }

  function sortUnresolvedTargetRecords(records) {
    return (Array.isArray(records) ? records : []).slice().sort(function(a, b) {
      const countDiff = (b.mention_count || 0) - (a.mention_count || 0);
      if (countDiff !== 0) return countDiff;
      return String(a.display_name || "").localeCompare(String(b.display_name || ""));
    });
  }

  function renderUnresolvedTargetBadge(record, options) {
    const opts = options || {};
    if (!record || !record.display_name) return "";
    const title = opts.title || "Tracked as unresolved target";
    return '<span class="bl-unresolved-target-badge" title="' + escapeHtml(title) + '">' +
      escapeHtml(record.display_name) + "</span>";
  }

  function formatSuggestedType(record) {
    if (!record) return "-";
    if (record.suggested_subtype === "station_type") return "SYSTEM / Station Type";
    if (record.suggested_subtype === "resource") return "OBJECT / Resource";
    const domain = record.suggested_domain || "OBJECT";
    const subtype = record.suggested_subtype || "item";
    return domain + " / " + subtype;
  }

  function buildStartEntryUrl(record) {
    if (!record || !record.display_name) return "";
    const name = encodeURIComponent(record.display_name);
    const source = "source=missing-entry";
    if (record.suggested_subtype === "station_type" || record.suggested_domain === "SYSTEM") {
      return "/wiki/create-post/?type=station_type&name=" + name + "&" + source;
    }
    if (record.suggested_subtype === "resource") {
      return "/wiki/create-post/?type=resource&name=" + name + "&" + source;
    }
    return "/wiki/create-post/?type=discovery&name=" + name + "&" + source;
  }

  function getStartEntryLinkLabel(record) {
    if (!record) return "Start Entry";
    if (record.suggested_subtype === "station_type") return "Start Station Entry";
    if (record.suggested_subtype === "resource") return "Start Resource Entry";
    return "Start Entry";
  }

  function buildRecipeTargetPrefillUrl(name, kind) {
    const clean = normalizeUnresolvedTargetName(name);
    if (!clean) return "";
    const encoded = encodeURIComponent(clean);
    if (kind === "station") {
      return "/wiki/create-post/?type=station_type&name=" + encoded + "&source=missing-entry";
    }
    return "/wiki/create-post/?type=resource&name=" + encoded + "&source=missing-entry";
  }

  function renderContextList(record) {
    const contexts = Array.isArray(record && record.contexts) ? record.contexts : [];
    if (!contexts.length) return '<span class="bl-missing-entry-empty">-</span>';

    return contexts.map(function(ctx) {
      const source = ctx.source_title || "Unknown source";
      const label = ctx.label || "Reference";
      if (ctx.source_url) {
        return '<div class="bl-missing-entry-context"><a href="' + escapeHtml(ctx.source_url) + '">' +
          escapeHtml(source) + "</a> · " + escapeHtml(label) + "</div>";
      }
      return '<div class="bl-missing-entry-context">' + escapeHtml(source) + " · " + escapeHtml(label) + "</div>";
    }).join("");
  }

  function renderMissingEntryQueue(records, options) {
    const opts = Object.assign({ showActions: true }, options || {});
    const list = sortUnresolvedTargetRecords(records);

    let html = '<div class="bl-missing-entry-queue">';
    html += '<div class="bl-missing-entry-queue-head">';
    html += "<h3>Missing Entry Queue</h3>";
    html += '<p class="bl-missing-entry-queue-copy">Unresolved game-world terms found in approved content. These are not posts yet.</p>';
    html += "</div>";

    if (!list.length) {
      html += '<p class="bl-missing-entry-empty">No unresolved targets found in published content.</p>';
      html += "</div>";
      return html;
    }

    html += '<table class="admin-table bl-missing-entry-table">';
    html += "<thead><tr>";
    html += "<th>Display Name</th><th>Suggested Type</th><th>Mentions</th><th>Sources / Contexts</th><th>Reason</th><th>Status</th>";
    if (opts.showActions) html += "<th>Actions</th>";
    html += "</tr></thead><tbody>";

    list.forEach(function(record) {
      html += "<tr>";
      html += "<td><strong>" + escapeHtml(record.display_name) + "</strong></td>";
      html += "<td>" + escapeHtml(formatSuggestedType(record)) + "</td>";
      html += "<td>" + escapeHtml(String(record.mention_count || 0)) + "</td>";
      html += "<td>" + renderContextList(record) + "</td>";
      html += "<td>" + escapeHtml(record.suggested_reason || "-") + "</td>";
      html += '<td><span class="badge bl-missing-entry-status">Unresolved</span></td>';
      if (opts.showActions) {
        const startUrl = buildStartEntryUrl(record);
        html += '<td class="bl-missing-entry-actions">';
        if (startUrl) {
          html += '<a class="btn-small bl-missing-entry-start" style="background:#2a8bdc;text-decoration:none;display:inline-block;" href="' +
            escapeHtml(startUrl) + '">' + escapeHtml(getStartEntryLinkLabel(record)) + "</a> ";
        }
        html += '<button type="button" class="btn-small" disabled title="Planned">Promote to Stub</button> ' +
          '<button type="button" class="btn-small" disabled title="Planned">Merge into Existing</button> ' +
          '<button type="button" class="btn-small" disabled title="Planned">Dismiss</button>' +
          "</td>";
      }
      html += "</tr>";
    });

    html += "</tbody></table></div>";
    return html;
  }

  return {
    normalizeUnresolvedTargetName: normalizeUnresolvedTargetName,
    buildUnresolvedTargetKey: buildUnresolvedTargetKey,
    inferSuggestedDomainAndSubtype: inferSuggestedDomainAndSubtype,
    collectUnresolvedTargetsFromRecipe: collectUnresolvedTargetsFromRecipe,
    collectUnresolvedTargetsFromRelations: collectUnresolvedTargetsFromRelations,
    collectUnresolvedTargetsFromPost: collectUnresolvedTargetsFromPost,
    collectUnresolvedTargetsFromPosts: collectUnresolvedTargetsFromPosts,
    mergeUnresolvedTargetRecords: mergeUnresolvedTargetRecords,
    sortUnresolvedTargetRecords: sortUnresolvedTargetRecords,
    renderUnresolvedTargetBadge: renderUnresolvedTargetBadge,
    renderMissingEntryQueue: renderMissingEntryQueue,
    buildResolvedEntityIndex: buildResolvedEntityIndex,
    isTargetResolved: isTargetResolved,
    parsePostMeta: parsePostMeta,
    isContributionPost: isContributionPost,
    buildStartEntryUrl: buildStartEntryUrl,
    buildRecipeTargetPrefillUrl: buildRecipeTargetPrefillUrl,
    getStartEntryLinkLabel: getStartEntryLinkLabel,
    formatSuggestedType: formatSuggestedType,
    isPublishedSourcePost: isPublishedSourcePost,
  };
})();
