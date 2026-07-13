// ============================================
// BoundLore Search Recall Utils — P5-E.9E.2
// Client-only recall: normalize, synonyms, scoring, snippets.
// No Supabase. No network. No DB.
// ============================================

window.BoundLoreSearchRecall = (function() {
  var SYNONYM_MAP = {
    monster: ["creature"],
    monsters: ["creature"],
    beast: ["creature"],
    beasts: ["creature"],
    mob: ["creature"],
    mobs: ["creature"],
    creature: ["creature"],
    creatures: ["creature"],
    artifact: ["item", "trinket"],
    artifacts: ["item", "trinket"],
    tool: ["item"],
    tools: ["item"],
    item: ["item"],
    items: ["item"],
    trinket: ["item"],
    trinkets: ["item"],
    region: ["biome"],
    regions: ["biome"],
    zone: ["biome"],
    zones: ["biome"],
    biome: ["biome"],
    biomes: ["biome"],
    resource: ["resource"],
    resources: ["resource"],
    guide: ["guide"],
    guides: ["guide"],
    guild: ["guild"],
    guilds: ["guild"],
  };

  var WEIGHTS = {
    title_exact: 100,
    title_token: 80,
    alias: 70,
    canonical_slug: 65,
    category_domain_subtype: 55,
    excerpt: 40,
    facets_tags: 35,
    body_text: 25,
    relations_summary: 20,
    blmeta_internal: 15,
  };

  var BLOCKED_STATUS = new Set(["draft", "pending", "private", "deleted", "archived"]);
  var BLOCKED_ORIGIN_RE = /(qa|test|prototype_fixture|internal_test)/i;
  var BLOCKED_SLUG_RE = /^(qa-|test-|fixture-)/i;
  var CSR_FALLBACK_PREFIX = "/wiki/post/?slug=";

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function stripDiacritics(value) {
    try {
      return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    } catch (e) {
      return String(value || "");
    }
  }

  function normalizeQuery(query) {
    return stripDiacritics(String(query || "").toLowerCase())
      .replace(/[^\w\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenize(value) {
    var norm = normalizeQuery(value);
    return norm ? norm.split(/\s+/).filter(Boolean) : [];
  }

  function singularizeToken(token) {
    if (!token || token.length < 4) return token;
    if (token.endsWith("ies") && token.length > 4) return token.slice(0, -3) + "y";
    if (token.endsWith("es") && token.length > 4) return token.slice(0, -2);
    if (token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
    return token;
  }

  function expandSynonyms(tokens) {
    var out = [];
    var seen = new Set();
    (tokens || []).forEach(function(token) {
      var base = singularizeToken(token);
      [token, base].forEach(function(t) {
        if (!t || seen.has(t)) return;
        seen.add(t);
        out.push(t);
        var syns = SYNONYM_MAP[t];
        if (syns) {
          syns.forEach(function(s) {
            if (!seen.has(s)) {
              seen.add(s);
              out.push(s);
            }
          });
        }
      });
    });
    return out;
  }

  function isUnsafeQuery(query) {
    var raw = String(query || "");
    if (/[<>]/.test(raw)) return true;
    if (/javascript:/i.test(raw)) return true;
    if (/\bon\w+\s*=/i.test(raw)) return true;
    return false;
  }

  function parsePostMetaLite(content) {
    var match = String(content || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
    if (!match) return {};
    try {
      var parsed = JSON.parse(match[1]);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (e) {
      return {};
    }
  }

  function stripHtmlToText(html) {
    return String(html || "")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function safeSlug(slug) {
    var s = String(slug || "").trim().toLowerCase();
    if (!s || s.includes("..") || s.includes("/") || s.includes("\\")) return "";
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)) return "";
    return s;
  }

  function isPublicSearchable(record) {
    if (!record || typeof record !== "object") return false;
    var title = String(record.title || "").trim();
    var slug = String(record.canonical_slug || record.slug || "").trim();
    if (!title && !slug) return false;

    var status = String(record.status || "published").toLowerCase();
    if (BLOCKED_STATUS.has(status)) return false;
    if (record.deleted_at) return false;

    var origin = String(record.content_origin || "").toLowerCase();
    if (origin && BLOCKED_ORIGIN_RE.test(origin)) return false;

    if (BLOCKED_SLUG_RE.test(slug)) return false;
    if (/^contribution-/i.test(slug)) return false;
    if (/^Contribution:/i.test(title)) return false;

    var tags = Array.isArray(record.tags) ? record.tags : [];
    if (tags.indexOf("exclude_public") >= 0) return false;

    return true;
  }

  function facetsToText(facets) {
    if (!facets || typeof facets !== "object") return "";
    return Object.keys(facets).map(function(k) {
      return k + " " + facets[k];
    }).join(" ");
  }

  function buildSearchSignals(record) {
    var rec = record || {};
    return {
      title: normalizeQuery(rec.title),
      slug: normalizeQuery(rec.canonical_slug || rec.slug),
      aliases: (rec.aliases || []).map(normalizeQuery),
      category: normalizeQuery(rec.category),
      domain: normalizeQuery(rec.entity_domain),
      subtype: normalizeQuery(rec.entity_subtype),
      post_type: normalizeQuery(rec.post_type),
      excerpt: normalizeQuery(rec.excerpt || rec.summary),
      body: normalizeQuery(rec.body_text || rec.body || stripHtmlToText(rec.content)),
      facets: normalizeQuery(facetsToText(rec.facets)),
      tags: normalizeQuery((rec.tags || []).join(" ")),
      relations: normalizeQuery((rec.relations_summary || []).join(" ")),
      blmeta: normalizeQuery((rec.blmeta_signals || []).join(" ")),
    };
  }

  function scoreRecord(record, queryTokens) {
    if (!isPublicSearchable(record)) return { score: 0, details: [] };

    var signals = buildSearchSignals(record);
    var details = [];
    var score = 0;
    var queryJoined = (queryTokens || []).join(" ");

    if (signals.title && queryJoined && signals.title === queryJoined) {
      score += WEIGHTS.title_exact;
      details.push({ kind: "title_exact", weight: WEIGHTS.title_exact });
    }

    (queryTokens || []).forEach(function(token) {
      if (!token) return;
      if (signals.title && (signals.title === token || signals.title.indexOf(token) === 0)) {
        score += WEIGHTS.title_token;
        details.push({ kind: "title_token", weight: WEIGHTS.title_token, token: token });
      }
      (signals.aliases || []).forEach(function(alias) {
        if (alias && (alias === token || alias.indexOf(token) >= 0)) {
          score += WEIGHTS.alias;
          details.push({ kind: "alias", weight: WEIGHTS.alias, token: token });
        }
      });
      if (signals.slug && (signals.slug === token || signals.slug.indexOf(token) >= 0)) {
        score += WEIGHTS.canonical_slug;
        details.push({ kind: "canonical_slug", weight: WEIGHTS.canonical_slug, token: token });
      }
      var catBlob = [signals.category, signals.domain, signals.subtype, signals.post_type].join(" ");
      if (catBlob.indexOf(token) >= 0) {
        score += WEIGHTS.category_domain_subtype;
        details.push({ kind: "category_domain_subtype", weight: WEIGHTS.category_domain_subtype, token: token });
      }
      if (signals.excerpt && signals.excerpt.indexOf(token) >= 0) {
        score += WEIGHTS.excerpt;
        details.push({ kind: "excerpt", weight: WEIGHTS.excerpt, token: token });
      }
      if ((signals.facets && signals.facets.indexOf(token) >= 0) || (signals.tags && signals.tags.indexOf(token) >= 0)) {
        score += WEIGHTS.facets_tags;
        details.push({ kind: "facets_tags", weight: WEIGHTS.facets_tags, token: token });
      }
      if (signals.body && signals.body.indexOf(token) >= 0) {
        score += WEIGHTS.body_text;
        details.push({ kind: "body_text", weight: WEIGHTS.body_text, token: token });
      }
      if (signals.relations && signals.relations.indexOf(token) >= 0) {
        score += WEIGHTS.relations_summary;
        details.push({ kind: "relations_summary", weight: WEIGHTS.relations_summary, token: token });
      }
      if (signals.blmeta && signals.blmeta.indexOf(token) >= 0) {
        score += WEIGHTS.blmeta_internal;
        details.push({ kind: "blmeta_internal", weight: WEIGHTS.blmeta_internal, token: token });
      }
    });

    return { score: score, details: details };
  }

  function searchRecords(records, query, options) {
    var opts = options || {};
    if (isUnsafeQuery(query)) return [];
    var rawTokens = tokenize(query);
    if (!rawTokens.length) return [];
    var queryTokens = expandSynonyms(rawTokens);
    var limit = typeof opts.limit === "number" ? opts.limit : 24;

    return (Array.isArray(records) ? records : [])
      .map(function(record) {
        var scored = scoreRecord(record, queryTokens);
        return {
          record: record,
          score: scored.score,
          details: scored.details,
          snippet: renderSafeSnippet(record, query),
        };
      })
      .filter(function(row) { return row.score > 0 && isPublicSearchable(row.record); })
      .sort(function(a, b) {
        if (b.score !== a.score) return b.score - a.score;
        var aSlug = String(a.record.canonical_slug || a.record.slug || "");
        var bSlug = String(b.record.canonical_slug || b.record.slug || "");
        if (aSlug !== bSlug) return aSlug.localeCompare(bSlug);
        return String(a.record.title || "").localeCompare(String(b.record.title || ""));
      })
      .slice(0, limit);
  }

  function renderSafeSnippet(record, query, options) {
    var rec = record || {};
    var excerpt = String(rec.excerpt || rec.summary || "").trim();
    if (!excerpt) {
      excerpt = String(rec.body_text || stripHtmlToText(rec.body || rec.content) || "").slice(0, 140);
    }
    var safe = escapeHtml(excerpt);
    if (safe.indexOf("<!--") >= 0 || /blmeta/i.test(safe)) return "";
    if (/<script/i.test(safe) || /\bon\w+\s*=/i.test(safe)) return "";
    return safe;
  }

  function getCanonicalResultUrl(record) {
    var rec = record || {};
    if (!isPublicSearchable(rec)) return "/wiki/post/";
    var slug = safeSlug(rec.canonical_slug || rec.slug);
    if (!slug) return "/wiki/post/";
    if (rec.url && String(rec.url).indexOf("/wiki/post/" + slug + "/") === 0) {
      return String(rec.url);
    }
    return "/wiki/post/" + slug + "/";
  }

  function getCsrFallbackUrl(record) {
    var slug = safeSlug((record && (record.slug || record.canonical_slug)) || "");
    if (!slug) return "/wiki/post/";
    return CSR_FALLBACK_PREFIX + encodeURIComponent(slug);
  }

  function getEmptyStateSuggestions(query) {
    return {
      message: 'No results found for "' + escapeHtml(query) + '"',
      suggestions: [
        { label: "Browse Creatures", url: "/wiki/creatures/" },
        { label: "Browse Items", url: "/wiki/items/" },
        { label: "Browse Resources", url: "/wiki/resources/" },
        { label: "Browse Hubs", url: "/wiki/browse/" },
        { label: "Search Page", url: "/wiki/search/" },
      ],
      csr_fallback_note: "CSR fallback remains available at " + CSR_FALLBACK_PREFIX + "<slug> when no static page exists.",
    };
  }

  function renderEmptyStateHtml(query) {
    var empty = getEmptyStateSuggestions(query);
    var html = '<div class="search-empty"><p>' + empty.message + "</p><ul class=\"search-empty-suggestions\">";
    (empty.suggestions || []).forEach(function(item) {
      html += '<li><a href="' + escapeHtml(item.url) + '">' + escapeHtml(item.label) + "</a></li>";
    });
    html += "</ul></div>";
    return html;
  }

  function postToRecallRecord(post) {
    var safePost = post && typeof post === "object" ? post : {};
    var meta = parsePostMetaLite(safePost.content);
    var profile = meta.entity_profile && typeof meta.entity_profile === "object" ? meta.entity_profile : {};
    var aliases = []
      .concat(Array.isArray(profile.aliases) ? profile.aliases : [])
      .concat(Array.isArray(profile.slug_aliases) ? profile.slug_aliases : [])
      .concat(Array.isArray(meta.aliases) ? meta.aliases : []);

    var relations = Array.isArray(meta.discovery_relations) ? meta.discovery_relations : [];
    var relationsSummary = relations.map(function(rel) {
      if (!rel) return "";
      return [rel.relation_type, rel.title, rel.target_name].filter(Boolean).join(" ");
    }).filter(Boolean);

    var blmetaSignals = [];
    if (meta.entity_subtype) blmetaSignals.push("entity_subtype:" + meta.entity_subtype);
    if (meta.entity_domain) blmetaSignals.push("entity_domain:" + meta.entity_domain);
    if (meta.content_origin) blmetaSignals.push("content_origin:" + meta.content_origin);

    var bodyText = stripHtmlToText(safePost.content);

    return {
      id: safePost.id || null,
      title: safePost.title || "",
      slug: safePost.slug || "",
      canonical_slug: safePost.slug || "",
      url: safePost.slug ? "/wiki/post/" + safePost.slug + "/" : "",
      status: safePost.status || "published",
      deleted_at: safePost.deleted_at || null,
      category: safePost.category || "",
      post_type: safePost.post_type || "",
      entity_domain: meta.entity_domain || "",
      entity_subtype: meta.entity_subtype || "",
      excerpt: safePost.excerpt || "",
      summary: safePost.excerpt || "",
      body_text: bodyText,
      body: bodyText,
      content: safePost.content || "",
      aliases: aliases,
      facets: meta.facets || (meta.discovery_payload && meta.discovery_payload.facets) || {},
      tags: Array.isArray(meta.tags) ? meta.tags : [],
      relations_summary: relationsSummary,
      content_origin: meta.content_origin || "",
      blmeta_signals: blmetaSignals,
    };
  }

  function recallRecordToSearchDocument(record) {
    var rec = record || {};
    return {
      kind: "post",
      slug: rec.canonical_slug || rec.slug || "",
      title: rec.title || "",
      category: rec.category || "",
      post_type: rec.post_type || "",
      entity_domain: rec.entity_domain || "",
      entity_subtype: rec.entity_subtype || "",
      excerpt: rec.excerpt || "",
      status: rec.status || "published",
    };
  }

  return {
    SYNONYM_MAP: SYNONYM_MAP,
    WEIGHTS: WEIGHTS,
    escapeHtml: escapeHtml,
    normalizeQuery: normalizeQuery,
    tokenize: tokenize,
    singularizeToken: singularizeToken,
    expandSynonyms: expandSynonyms,
    isUnsafeQuery: isUnsafeQuery,
    isPublicSearchable: isPublicSearchable,
    buildSearchSignals: buildSearchSignals,
    scoreRecord: scoreRecord,
    searchRecords: searchRecords,
    renderSafeSnippet: renderSafeSnippet,
    getCanonicalResultUrl: getCanonicalResultUrl,
    getCsrFallbackUrl: getCsrFallbackUrl,
    getEmptyStateSuggestions: getEmptyStateSuggestions,
    renderEmptyStateHtml: renderEmptyStateHtml,
    postToRecallRecord: postToRecallRecord,
    recallRecordToSearchDocument: recallRecordToSearchDocument,
    stripHtmlToText: stripHtmlToText,
  };
})();
