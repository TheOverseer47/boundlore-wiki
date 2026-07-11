// ============================================
// BoundLore Search Signals — P0.5-E baseline
// Client-side structured search document builder,
// conservative ranking, and missing-entry suggestions.
// No DB index, no FTS, no embeddings.
// ============================================

window.BoundLoreSearchSignals = (function() {
  const GENERIC_TERMS = new Set([
    "item", "items", "entry", "entries", "wiki", "post", "posts", "guide", "guides",
    "discovery", "discoveries", "page", "boundlore", "lore",
  ]);
  const WEAK_TERMS = new Set(["unknown", "unclear", "not", "observed"]);

  const WEIGHTS = {
    title_exact: 100,
    title_prefix: 80,
    alias_exact: 75,
    canonical_exact: 70,
    slug_exact: 65,
    identity: 45,
    facet: 40,
    resource: 35,
    recipe: 35,
    relation: 30,
    text: 15,
    weak: 5,
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^\w\s>+-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenizeSearchQuery(query) {
    const normalized = normalizeSearchText(query);
    if (!normalized) return [];
    return normalized.split(/\s+/).filter(Boolean);
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

  function pushSignal(bucket, value, meta) {
    if (!bucket || !Array.isArray(bucket.signals)) return;
    const clean = meaningful(value);
    if (!clean) return;
    const normalized = normalizeSearchText(clean);
    if (!normalized) return;
    const key = (meta && meta.group ? meta.group + ":" : "") + normalized;
    if (bucket._seen && bucket._seen.has(key)) return;
    if (!bucket._seen) bucket._seen = new Set();
    bucket._seen.add(key);
    bucket.signals.push({
      raw: clean,
      normalized: normalized,
      group: meta && meta.group ? meta.group : "",
      label: meta && meta.label ? meta.label : clean,
    });
  }

  function parsePostMeta(content) {
    if (typeof BoundLoreUnresolvedTargets !== "undefined" && BoundLoreUnresolvedTargets.parsePostMeta) {
      return BoundLoreUnresolvedTargets.parsePostMeta(content);
    }
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
    if (typeof BoundLoreUnresolvedTargets !== "undefined" && BoundLoreUnresolvedTargets.isContributionPost) {
      return BoundLoreUnresolvedTargets.isContributionPost(post, meta);
    }
    if (meta && meta.contribution && typeof meta.contribution === "object") return true;
    if (post && /^contribution-/i.test(String(post.slug || ""))) return true;
    if (post && /^Contribution:/i.test(String(post.title || ""))) return true;
    return false;
  }

  function getRelationLabel(type) {
    if (typeof BoundLoreRelationsRegistry !== "undefined" && BoundLoreRelationsRegistry.getRelationDefinition) {
      const def = BoundLoreRelationsRegistry.getRelationDefinition(type);
      if (def && def.label) return def.label;
    }
    return String(type || "").replace(/_/g, " ");
  }

  function collectTitleSignals(post, meta) {
    const bucket = { signals: [], _seen: new Set() };
    pushSignal(bucket, post && post.title, { group: "title", label: "Title" });
    pushSignal(bucket, post && post.slug, { group: "title", label: "Slug" });
    if (meta && meta.entity_profile && meta.entity_profile.canonical_title) {
      pushSignal(bucket, meta.entity_profile.canonical_title, { group: "title", label: "Canonical title" });
    }
    return bucket.signals;
  }

  function collectAliasSearchSignals(post, meta) {
    const bucket = { signals: [], _seen: new Set() };
    const profile = meta && meta.entity_profile && typeof meta.entity_profile === "object"
      ? meta.entity_profile
      : {};
    const aliases = []
      .concat(Array.isArray(profile.slug_aliases) ? profile.slug_aliases : [])
      .concat(Array.isArray(profile.aliases) ? profile.aliases : [])
      .concat(Array.isArray(meta.aliases) ? meta.aliases : []);

    aliases.forEach(function(alias) {
      pushSignal(bucket, alias, { group: "aliases", label: "Alias" });
    });
    return bucket.signals;
  }

  function collectIdentitySignals(post, meta) {
    const bucket = { signals: [], _seen: new Set() };
    pushSignal(bucket, post && post.category, { group: "identity", label: "Category" });
    pushSignal(bucket, post && post.post_type, { group: "identity", label: "Post type" });

    if (typeof EntityCore !== "undefined") {
      if (EntityCore.getDisplayName) pushSignal(bucket, EntityCore.getDisplayName(meta, post), { group: "identity", label: "Display name" });
      if (EntityCore.resolveEntityDomain) pushSignal(bucket, EntityCore.resolveEntityDomain(meta, post), { group: "identity", label: "Domain" });
      if (EntityCore.resolveEntitySubtype) {
        const subtype = EntityCore.resolveEntitySubtype(meta, post);
        pushSignal(bucket, subtype, { group: "identity", label: "Subtype" });
        if (EntityCore.getEntitySubtypeDisplayLabel) {
          pushSignal(bucket, EntityCore.getEntitySubtypeDisplayLabel(subtype), { group: "identity", label: "Type label" });
        }
      }
      if (EntityCore.getEntityDomainDisplayLabel && meta && meta.entity_domain) {
        pushSignal(bucket, EntityCore.getEntityDomainDisplayLabel(meta.entity_domain), { group: "identity", label: "Domain label" });
      }
      if (EntityCore.isResourceEntry && EntityCore.isResourceEntry(meta, post)) {
        pushSignal(bucket, "resource", { group: "identity", label: "Resource" });
      }
      if (EntityCore.isStationTypeEntry && EntityCore.isStationTypeEntry(meta, post)) {
        pushSignal(bucket, "station type", { group: "identity", label: "Station Type" });
        pushSignal(bucket, "crafting station", { group: "identity", label: "Crafting Station" });
      }
    }

    if (meta && meta.entity_key) pushSignal(bucket, meta.entity_key, { group: "identity", label: "Entity key" });
    if (meta && meta.entity_domain) pushSignal(bucket, meta.entity_domain, { group: "identity", label: "Entity domain" });
    if (meta && meta.entity_subtype) pushSignal(bucket, meta.entity_subtype, { group: "identity", label: "Entity subtype" });

    return bucket.signals;
  }

  function collectFacetSearchSignals(post, meta) {
    const bucket = { signals: [], _seen: new Set() };
    if (typeof BoundLoreFacetRegistry === "undefined" || !BoundLoreFacetRegistry.collectFacetSignals) {
      return bucket.signals;
    }
    try {
      const facets = BoundLoreFacetRegistry.collectFacetSignals(meta, post) || [];
      facets.forEach(function(entry) {
        if (!entry) return;
        pushSignal(bucket, entry.value, { group: "facets", label: entry.label || entry.value });
        pushSignal(bucket, entry.groupKey + " " + entry.value, { group: "facets", label: (entry.groupLabel || entry.groupKey) + ": " + (entry.label || entry.value) });
        if (entry.groupKey === "taxonomy" && String(entry.value || "").includes(">")) {
          const parts = String(entry.value).split(">");
          parts.forEach(function(part) {
            pushSignal(bucket, part, { group: "facets", label: part });
          });
        }
      });
    } catch (err) {
      return bucket.signals;
    }
    return bucket.signals;
  }

  function collectResourceSearchSignals(post, meta) {
    const bucket = { signals: [], _seen: new Set() };
    if (typeof EntityCore === "undefined" || !EntityCore.isResourceEntry || !EntityCore.isResourceEntry(meta, post)) {
      return bucket.signals;
    }

    pushSignal(bucket, "resource", { group: "resource", label: "Resource" });
    const payload = meta && meta.discovery_payload && typeof meta.discovery_payload === "object"
      ? meta.discovery_payload
      : {};
    const resource = payload.resource && typeof payload.resource === "object" ? payload.resource : payload;

    pushSignal(bucket, resource.entity_name, { group: "resource", label: "Resource name" });
    pushSignal(bucket, resource.source_type, { group: "resource", label: "Source type" });
    pushSignal(bucket, resource.source_detail, { group: "resource", label: "Source detail" });
    pushSignal(bucket, resource.rarity, { group: "resource", label: "Rarity" });
    pushSignal(bucket, resource.processing_stage, { group: "resource", label: "Processing stage" });
    pushSignal(bucket, payload.source_type, { group: "resource", label: "Source type" });
    pushSignal(bucket, payload.source_detail, { group: "resource", label: "Source detail" });
    pushSignal(bucket, payload.entity_name, { group: "resource", label: "Entity name" });

    if (resource.source_type) {
      pushSignal(bucket, String(resource.source_type).replace(/_/g, " "), { group: "resource", label: "Source type label" });
    }

    return bucket.signals;
  }

  function collectRecipeSearchSignals(post, meta) {
    const bucket = { signals: [], _seen: new Set() };
    const payload = meta && meta.discovery_payload && typeof meta.discovery_payload === "object"
      ? meta.discovery_payload
      : {};
    const recipe = payload.recipe && typeof payload.recipe === "object" ? payload.recipe : null;
    if (!recipe) return bucket.signals;

    pushSignal(bucket, "recipe", { group: "recipe", label: "Recipe" });
    pushSignal(bucket, "crafting recipe", { group: "recipe", label: "Crafting recipe" });
    pushSignal(bucket, recipe.output_name || recipe.result_name || (post && post.title), { group: "recipe", label: "Output" });
    pushSignal(bucket, recipe.station || recipe.crafting_station, { group: "recipe", label: "Crafting station" });
    pushSignal(bucket, "crafting station", { group: "recipe", label: "Crafting station label" });
    pushSignal(bucket, recipe.notes, { group: "recipe", label: "Recipe notes" });
    pushSignal(bucket, recipe.unlock_condition, { group: "recipe", label: "Unlock condition" });

    const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
    ingredients.forEach(function(row) {
      if (!row) return;
      pushSignal(bucket, row.name || row.title || row.target_name, { group: "recipe", label: "Ingredient" });
      pushSignal(bucket, row.unit || (row.qualifiers && row.qualifiers.unit), { group: "recipe", label: "Unit" });
      const qty = row.quantity != null ? row.quantity : (row.qualifiers && row.qualifiers.quantity);
      if (qty != null) pushSignal(bucket, String(qty), { group: "recipe", label: "Quantity" });
      if (typeof BoundLoreRelationsRegistry !== "undefined" && BoundLoreRelationsRegistry.collectQualifierSearchSignals) {
        BoundLoreRelationsRegistry.collectQualifierSearchSignals("crafted_from", row).forEach(function(value) {
          pushSignal(bucket, value, { group: "recipe", label: "Ingredient detail" });
        });
      }
    });

    if (typeof BoundLoreRelationsRegistry !== "undefined" && BoundLoreRelationsRegistry.collectQualifierSearchSignals) {
      BoundLoreRelationsRegistry.collectQualifierSearchSignals("crafted_at", recipe).forEach(function(value) {
        pushSignal(bucket, value, { group: "recipe", label: "Craft detail" });
      });
    }

    return bucket.signals;
  }

  function collectRelationSearchSignals(post, meta) {
    const bucket = { signals: [], _seen: new Set() };
    const relations = Array.isArray(meta && meta.discovery_relations) ? meta.discovery_relations : [];
    relations.forEach(function(rel) {
      if (!rel) return;
      const type = String(rel.relation_type || rel.type || "").toLowerCase();
      if (typeof BoundLoreRelationsRegistry !== "undefined") {
        if (BoundLoreRelationsRegistry.isReservedRelation && BoundLoreRelationsRegistry.isReservedRelation(type)) {
          return;
        }
      }
      const label = getRelationLabel(type);
      pushSignal(bucket, label, { group: "relations", label: label });
      pushSignal(bucket, type.replace(/_/g, " "), { group: "relations", label: type });
      pushSignal(bucket, rel.title, { group: "relations", label: label + " target" });
      pushSignal(bucket, rel.target_name, { group: "relations", label: label + " target" });
      if (typeof BoundLoreRelationsRegistry !== "undefined" && BoundLoreRelationsRegistry.collectQualifierSearchSignals) {
        BoundLoreRelationsRegistry.collectQualifierSearchSignals(type, rel).forEach(function(value) {
          pushSignal(bucket, value, { group: "relations", label: label + " detail" });
        });
      }
    });

    if (typeof EntityCore !== "undefined" && EntityCore.isResourceEntry && EntityCore.isResourceEntry(meta, post)) {
      pushSignal(bucket, "used in", { group: "relations", label: "Used in" });
    }

    return bucket.signals;
  }

  function collectTextSignals(post) {
    const bucket = { signals: [], _seen: new Set() };
    pushSignal(bucket, post && post.excerpt, { group: "text", label: "Excerpt" });
    return bucket.signals;
  }

  function collectVersionSearchSignalsForPost(post, meta) {
    const bucket = { signals: [], _seen: new Set() };
    if (typeof BoundLoreVersioning === "undefined") return bucket.signals;

    const payload = meta && meta.discovery_payload && typeof meta.discovery_payload === "object"
      ? meta.discovery_payload
      : {};
    const recipe = payload.recipe && typeof payload.recipe === "object" ? payload.recipe : null;

    BoundLoreVersioning.collectVersionSearchSignals(recipe).forEach(function(value) {
      pushSignal(bucket, value, { group: "version", label: "Version" });
    });
    BoundLoreVersioning.collectVersionSearchSignals(meta).forEach(function(value) {
      pushSignal(bucket, value, { group: "version", label: "Version" });
    });

    const relations = Array.isArray(meta.discovery_relations) ? meta.discovery_relations : [];
    relations.forEach(function(rel) {
      BoundLoreVersioning.collectVersionSearchSignals(rel).forEach(function(value) {
        pushSignal(bucket, value, { group: "version", label: "Version" });
      });
    });

    if (typeof BoundLoreFacetRegistry !== "undefined") {
      const facets = BoundLoreFacetRegistry.collectFacetSignals(meta, post) || [];
      facets.forEach(function(entry) {
        BoundLoreVersioning.collectVersionSearchSignals(entry).forEach(function(value) {
          pushSignal(bucket, value, { group: "version", label: "Version" });
        });
      });
    }

    return bucket.signals;
  }

  function buildDisplayLabels(post, meta, signalGroups) {
    const labels = [];
    if (typeof EntityCore !== "undefined" && EntityCore.isResourceEntry && EntityCore.isResourceEntry(meta, post)) {
      labels.push("Resource");
    }
    if (typeof EntityCore !== "undefined" && EntityCore.isStationTypeEntry && EntityCore.isStationTypeEntry(meta, post)) {
      labels.push("Station Type");
    }
    if (meta && meta.entity_subtype && typeof EntityCore !== "undefined" && EntityCore.getEntitySubtypeDisplayLabel) {
      labels.push(EntityCore.getEntitySubtypeDisplayLabel(meta.entity_subtype));
    }
    (signalGroups.facets || []).slice(0, 3).forEach(function(entry) {
      if (entry && entry.label) labels.push(entry.label);
    });
    return labels.filter(function(label, index, arr) {
      return label && arr.indexOf(label) === index;
    });
  }

  function buildSearchDocument(post) {
    const safePost = post && typeof post === "object" ? post : {};
    const meta = parsePostMeta(safePost.content || "");
    const signals = {
      title: collectTitleSignals(safePost, meta),
      aliases: collectAliasSearchSignals(safePost, meta),
      identity: collectIdentitySignals(safePost, meta),
      facets: collectFacetSearchSignals(safePost, meta),
      resource: collectResourceSearchSignals(safePost, meta),
      recipe: collectRecipeSearchSignals(safePost, meta),
      relations: collectRelationSearchSignals(safePost, meta),
      version: collectVersionSearchSignalsForPost(safePost, meta),
      text: collectTextSignals(safePost),
    };

    return {
      kind: "post",
      post_id: safePost.id || null,
      slug: safePost.slug || "",
      title: safePost.title || "",
      category: safePost.category || "",
      post_type: safePost.post_type || "",
      entity_domain: meta.entity_domain || "",
      entity_subtype: meta.entity_subtype || "",
      status: safePost.status || "published",
      excerpt: safePost.excerpt || "",
      signals: signals,
      display_labels: buildDisplayLabels(safePost, meta, signals),
    };
  }

  function buildSearchDocuments(posts) {
    return (Array.isArray(posts) ? posts : [])
      .filter(function(post) {
        if (!post) return false;
        if (String(post.status || "").toLowerCase() !== "published") return false;
        if (post.deleted_at) return false;
        const meta = parsePostMeta(post.content || "");
        if (isContributionPost(post, meta)) return false;
        if (/^contribution-/i.test(String(post.slug || ""))) return false;
        if (/^Contribution:/i.test(String(post.title || ""))) return false;
        return true;
      })
      .map(buildSearchDocument);
  }

  function formatSuggestedType(record) {
    if (typeof BoundLoreUnresolvedTargets !== "undefined") {
      if (record.suggested_subtype === "station_type") return "SYSTEM / Station Type";
      if (record.suggested_subtype === "resource") return "OBJECT / Resource";
    }
    const domain = record.suggested_domain || "OBJECT";
    const subtype = record.suggested_subtype || "item";
    return domain + " / " + subtype;
  }

  function buildMissingEntryDocument(record) {
    const safe = record && typeof record === "object" ? record : {};
    const bucket = { signals: [], _seen: new Set() };
    pushSignal(bucket, safe.display_name, { group: "title", label: "Missing entry" });
    pushSignal(bucket, safe.suggested_reason, { group: "identity", label: "Reason" });
    pushSignal(bucket, safe.suggested_domain, { group: "identity", label: "Domain" });
    pushSignal(bucket, safe.suggested_subtype, { group: "identity", label: "Subtype" });
    pushSignal(bucket, formatSuggestedType(safe), { group: "identity", label: "Suggested type" });

    if (safe.suggested_subtype === "resource") {
      pushSignal(bucket, "resource", { group: "identity", label: "Resource" });
    }
    if (safe.suggested_subtype === "station_type") {
      pushSignal(bucket, "station type", { group: "identity", label: "Station Type" });
      pushSignal(bucket, "crafting station", { group: "identity", label: "Crafting Station" });
    }

    const contexts = Array.isArray(safe.contexts) ? safe.contexts : [];
    contexts.forEach(function(ctx) {
      pushSignal(bucket, ctx && ctx.source_title, { group: "relations", label: "Source" });
      pushSignal(bucket, ctx && ctx.label, { group: "relations", label: "Context" });
    });

    let startUrl = "";
    if (typeof BoundLoreUnresolvedTargets !== "undefined" && BoundLoreUnresolvedTargets.buildStartEntryUrl) {
      startUrl = BoundLoreUnresolvedTargets.buildStartEntryUrl(safe);
    }

    return {
      kind: "missing_entry",
      post_id: null,
      slug: "",
      title: safe.display_name || "",
      category: "",
      post_type: "",
      entity_domain: safe.suggested_domain || "",
      entity_subtype: safe.suggested_subtype || "",
      status: "unresolved",
      suggested_type: formatSuggestedType(safe),
      suggested_reason: safe.suggested_reason || "",
      start_url: startUrl,
      signals: {
        title: bucket.signals.filter(function(s) { return s.group === "title"; }),
        aliases: [],
        identity: bucket.signals.filter(function(s) { return s.group === "identity"; }),
        facets: [],
        resource: safe.suggested_subtype === "resource" ? bucket.signals.filter(function(s) { return s.group === "identity"; }) : [],
        recipe: [],
        relations: bucket.signals.filter(function(s) { return s.group === "relations"; }),
        text: [],
      },
      display_labels: ["Missing entry suggestion", formatSuggestedType(safe)],
    };
  }

  function collectUnresolvedSearchSignals(posts) {
    if (typeof BoundLoreUnresolvedTargets === "undefined" || !BoundLoreUnresolvedTargets.collectUnresolvedTargetsFromPosts) {
      return [];
    }
    try {
      return BoundLoreUnresolvedTargets.collectUnresolvedTargetsFromPosts(posts) || [];
    } catch (err) {
      return [];
    }
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function tokenMatchesSignal(token, signalNorm) {
    if (!token || !signalNorm) return false;
    if (signalNorm === token) return true;
    const parts = signalNorm.split(/[\s>]+/).filter(Boolean);
    if (parts.indexOf(token) >= 0) return true;
    const re = new RegExp("(^|[\\s>])" + escapeRegExp(token) + "($|[\\s>])");
    return re.test(signalNorm);
  }

  function signalMatchesQuery(signal, query, tokens) {
    const normalized = normalizeSearchText(query);
    const signalNorm = signal.normalized || normalizeSearchText(signal.raw);
    if (!signalNorm) return null;

    if (signalNorm === normalized) {
      return { strength: "exact", token: normalized };
    }
    if (normalized.length >= 3 && signalNorm.indexOf(normalized) >= 0) {
      return { strength: "contains", token: normalized };
    }

    for (let i = 0; i < tokens.length; i += 1) {
      const token = tokens[i];
      if (!token || GENERIC_TERMS.has(token)) continue;
      if (signalNorm === token) return { strength: "token_exact", token: token };
      if (token.length >= 3 && tokenMatchesSignal(token, signalNorm)) {
        return { strength: "token_contains", token: token };
      }
    }
    return null;
  }

  function weightForMatch(group, match, signal) {
    if (!match) return 0;
    const token = match.token || "";
    if (WEAK_TERMS.has(token) || WEAK_TERMS.has(signal.normalized)) {
      return WEIGHTS.weak;
    }
    if (GENERIC_TERMS.has(token) && match.strength !== "exact") {
      return WEIGHTS.weak;
    }

    if (group === "title") {
      if (match.strength === "exact") return WEIGHTS.title_exact;
      if (match.strength === "contains" && match.token === signal.normalized) return WEIGHTS.title_prefix;
      return match.strength === "token_exact" ? WEIGHTS.title_prefix - 10 : WEIGHTS.text;
    }
    if (group === "aliases") {
      return match.strength === "exact" || match.strength === "token_exact" ? WEIGHTS.alias_exact : WEIGHTS.identity;
    }
    if (group === "identity") return WEIGHTS.identity;
    if (group === "facets") return WEIGHTS.facet;
    if (group === "resource") return WEIGHTS.resource;
    if (group === "recipe") return WEIGHTS.recipe;
    if (group === "relations") return WEIGHTS.relation;
    if (group === "version") return WEIGHTS.weak;
    return WEIGHTS.text;
  }

  function scoreSearchDocument(query, document, options) {
    const opts = options || {};
    const normalizedQuery = normalizeSearchText(query);
    const tokens = tokenizeSearchQuery(query);
    if (!normalizedQuery || !document) {
      return { score: 0, details: [] };
    }

    let score = 0;
    const details = [];
    const groups = document.signals || {};

    Object.keys(groups).forEach(function(group) {
      (groups[group] || []).forEach(function(signal) {
        const match = signalMatchesQuery(signal, normalizedQuery, tokens);
        if (!match) return;
        const weight = weightForMatch(group, match, signal);
        if (weight <= 0) return;
        score += weight;
        details.push({
          group: group,
          signal: signal.raw,
          label: signal.label,
          weight: weight,
          token: match.token,
        });
      });
    });

    if (document.kind === "post" || document.kind === "missing_entry") {
      const titleNorm = normalizeSearchText(document.title);
      if (titleNorm === normalizedQuery) {
        score += WEIGHTS.title_exact;
        details.push({ group: "title", signal: document.title, label: "Title", weight: WEIGHTS.title_exact, token: normalizedQuery });
      } else if (normalizedQuery.length >= 2 && titleNorm.indexOf(normalizedQuery) === 0) {
        score += WEIGHTS.title_prefix;
        details.push({ group: "title", signal: document.title, label: "Title prefix", weight: WEIGHTS.title_prefix, token: normalizedQuery });
      }
    }

    if (opts.requireAllTokens && tokens.length > 1) {
      const matchedTokens = new Set(details.map(function(d) { return d.token; }).filter(Boolean));
      const required = tokens.filter(function(token) { return !GENERIC_TERMS.has(token); });
      const allMatched = required.every(function(token) {
        return matchedTokens.has(token) || normalizedQuery.indexOf(token) >= 0;
      });
      if (!allMatched) {
        score = Math.floor(score * 0.35);
      }
    }

    return { score: score, details: details };
  }

  function explainSearchMatch(query, document, scoreDetails) {
    const details = Array.isArray(scoreDetails) ? scoreDetails : [];
    if (!details.length) return "";
    const top = details.slice().sort(function(a, b) { return (b.weight || 0) - (a.weight || 0); })[0];
    if (!top) return "";

    if (document.kind === "missing_entry") {
      return "Missing entry suggestion";
    }
    if (top.group === "facets") return "Matched facet: " + top.signal;
    if (top.group === "resource") return "Matched resource: " + top.signal;
    if (top.group === "recipe") return "Matched recipe: " + top.signal;
    if (top.group === "relations") return "Matched relation: " + top.signal;
    if (top.group === "identity") return "Matched type: " + top.signal;
    if (top.group === "title") return "Matched title";
    return "Matched " + top.label;
  }

  function searchDocuments(query, documents, options) {
    const opts = Object.assign({ limit: 20 }, options || {});
    return (Array.isArray(documents) ? documents : [])
      .map(function(document) {
        const scored = scoreSearchDocument(query, document, opts);
        return {
          document: document,
          score: scored.score,
          details: scored.details,
          explanation: explainSearchMatch(query, document, scored.details),
        };
      })
      .filter(function(row) { return row.score > 0; })
      .sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        return String(a.document.title || "").localeCompare(String(b.document.title || ""));
      })
      .slice(0, opts.limit);
  }

  function findMissingEntrySuggestions(query, posts, options) {
    const opts = Object.assign({ limit: 5 }, options || {});
    const records = collectUnresolvedSearchSignals(posts);
    const documents = records.map(buildMissingEntryDocument);
    return searchDocuments(query, documents, opts);
  }

  return {
    normalizeSearchText: normalizeSearchText,
    tokenizeSearchQuery: tokenizeSearchQuery,
    collectTitleSignals: collectTitleSignals,
    collectIdentitySignals: collectIdentitySignals,
    collectFacetSearchSignals: collectFacetSearchSignals,
    collectResourceSearchSignals: collectResourceSearchSignals,
    collectRecipeSearchSignals: collectRecipeSearchSignals,
    collectRelationSearchSignals: collectRelationSearchSignals,
    collectVersionSearchSignalsForPost: collectVersionSearchSignalsForPost,
    collectAliasSearchSignals: collectAliasSearchSignals,
    collectUnresolvedSearchSignals: collectUnresolvedSearchSignals,
    buildSearchDocument: buildSearchDocument,
    buildSearchDocuments: buildSearchDocuments,
    buildMissingEntryDocument: buildMissingEntryDocument,
    scoreSearchDocument: scoreSearchDocument,
    searchDocuments: searchDocuments,
    explainSearchMatch: explainSearchMatch,
    findMissingEntrySuggestions: findMissingEntrySuggestions,
    escapeHtml: escapeHtml,
  };
})();
