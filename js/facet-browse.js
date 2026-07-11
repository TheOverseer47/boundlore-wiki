// ============================================
// BoundLore Facet Browse Filter Baseline
// P1-D.1 — client-side URL facet filters for browse/landing pages.
// No DB, no search index, no query parser. See docs/architecture/search-architecture.md
// ============================================

window.BoundLoreFacetBrowse = (function() {
  const DIRECT_PARAM_GROUPS = [
    "acquisition_method",
    "processing_stage",
    "rarity",
    "role",
    "capability",
    "taxonomy",
    "entity_subtype",
    "entity_domain",
  ];

  const CONTEXT_FILTERS = {
    resources: DIRECT_PARAM_GROUPS.slice(),
    browse: DIRECT_PARAM_GROUPS.slice(),
    items: ["entity_subtype", "entity_domain", "rarity", "role", "capability", "taxonomy", "acquisition_method", "processing_stage"],
    search: [],
  };

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function meaningful(value) {
    const clean = String(value == null ? "" : value).trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    if (["unclear", "unknown", "n/a", "na", "none"].indexOf(lower) >= 0 && lower !== "unknown") {
      return "";
    }
    return clean;
  }

  function slugToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^\w>._-]/g, "");
  }

  function normalizeFacetGroupKey(group) {
    if (typeof BoundLoreFacetRegistry !== "undefined" && BoundLoreFacetRegistry.normalizeFacetGroupKey) {
      const registryKey = BoundLoreFacetRegistry.normalizeFacetGroupKey(group);
      if (registryKey) return registryKey;
    }
    const token = slugToken(group);
    if (token === "entity_subtype" || token === "entity_domain") return token;
    return token;
  }

  function normalizeFacetValueForGroup(group, value) {
    if (value == null) return "";
    if (typeof value === "object") {
      if (value.value != null) return normalizeFacetValueForGroup(group, value.value);
      if (value.label != null) return normalizeFacetValueForGroup(group, value.label);
      return "";
    }
    const raw = meaningful(value);
    if (!raw) return "";
    if (group === "entity_domain") return raw.toUpperCase();
    if (group === "entity_subtype") return slugToken(raw);
    if (group === "taxonomy") {
      return raw.toLowerCase().replace(/\s*>\s*/g, ">").replace(/\s+/g, "_");
    }
    if (typeof BoundLoreFacetRegistry !== "undefined" && BoundLoreFacetRegistry.normalizeFacetValue) {
      const normalized = BoundLoreFacetRegistry.normalizeFacetValue(group, raw);
      if (normalized) return normalized;
    }
    return slugToken(raw);
  }

  function normalizeFacetFilter(filter) {
    if (!filter || typeof filter !== "object") return null;
    const group = normalizeFacetGroupKey(filter.group || filter.groupKey || filter.key);
    const value = normalizeFacetValueForGroup(group, filter.value);
    if (!group || !value) return null;
    return { group: group, value: value };
  }

  function normalizeFacetFilters(filters) {
    const out = [];
    const seen = new Set();
    (Array.isArray(filters) ? filters : []).forEach(function(filter) {
      const normalized = normalizeFacetFilter(filter);
      if (!normalized) return;
      const key = normalized.group + ":" + normalized.value;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(normalized);
    });
    return out;
  }

  function addParsedFilter(bucket, group, value) {
    const normalized = normalizeFacetFilter({ group: group, value: value });
    if (!normalized) return;
    bucket.push(normalized);
  }

  function parseFacetPair(raw, bucket) {
    const str = String(raw || "").trim();
    if (!str) return;
    const idx = str.indexOf(":");
    if (idx <= 0) return;
    addParsedFilter(bucket, str.slice(0, idx), str.slice(idx + 1));
  }

  function toSearchParams(searchParamsOrUrl) {
    if (searchParamsOrUrl instanceof URLSearchParams) return searchParamsOrUrl;
    if (typeof searchParamsOrUrl === "string") {
      const query = searchParamsOrUrl.indexOf("?") >= 0
        ? searchParamsOrUrl.split("?").slice(1).join("?")
        : (searchParamsOrUrl.charAt(0) === "?" ? searchParamsOrUrl.slice(1) : searchParamsOrUrl);
      return new URLSearchParams(query);
    }
    if (searchParamsOrUrl && typeof searchParamsOrUrl === "object") {
      const params = new URLSearchParams();
      Object.keys(searchParamsOrUrl).forEach(function(key) {
        const val = searchParamsOrUrl[key];
        if (val == null) return;
        if (Array.isArray(val)) val.forEach(function(item) { params.append(key, item); });
        else params.set(key, String(val));
      });
      return params;
    }
    try {
      return new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    } catch (err) {
      return new URLSearchParams();
    }
  }

  function parseFacetQuery(searchParamsOrUrl) {
    const params = toSearchParams(searchParamsOrUrl);
    const bucket = [];

    if (typeof params.getAll === "function") {
      params.getAll("facet").forEach(function(raw) {
        String(raw || "").split(",").forEach(function(part) {
          parseFacetPair(part, bucket);
        });
      });
    } else {
      const single = params.get("facet");
      if (single) parseFacetPair(single, bucket);
    }

    DIRECT_PARAM_GROUPS.forEach(function(group) {
      const raw = params.get(group);
      if (!raw) return;
      String(raw).split(",").forEach(function(part) {
        addParsedFilter(bucket, group, part);
      });
    });

    return normalizeFacetFilters(bucket);
  }

  function parseMetaFromSource(postOrMeta) {
    if (!postOrMeta || typeof postOrMeta !== "object") return {};
    if (postOrMeta.meta && typeof postOrMeta.meta === "object") return postOrMeta.meta;
    if (postOrMeta.content && typeof parsePostMetaRP === "function") {
      return parsePostMetaRP(postOrMeta.content);
    }
    if (postOrMeta.discovery_payload || postOrMeta.facets || postOrMeta.entity_domain) return postOrMeta;
    return {};
  }

  function resolvePostFromSource(postOrMeta) {
    if (!postOrMeta || typeof postOrMeta !== "object") return null;
    if (postOrMeta.post && typeof postOrMeta.post === "object") return postOrMeta.post;
    if (postOrMeta.content || postOrMeta.slug || postOrMeta.id) return postOrMeta;
    return null;
  }

  function addFacetValue(store, group, value) {
    const normalizedGroup = normalizeFacetGroupKey(group);
    const normalizedValue = normalizeFacetValueForGroup(normalizedGroup, value);
    if (!normalizedGroup || !normalizedValue) return;
    if (!store[normalizedGroup]) store[normalizedGroup] = [];
    if (store[normalizedGroup].indexOf(normalizedValue) < 0) {
      store[normalizedGroup].push(normalizedValue);
    }
  }

  function getPostFacetValues(postOrMeta) {
    const src = postOrMeta && typeof postOrMeta === "object" ? postOrMeta : {};
    const meta = parseMetaFromSource(src);
    const post = resolvePostFromSource(src);
    const values = {};

    if (typeof EntityCore !== "undefined") {
      const domain = EntityCore.resolveEntityDomain(meta, post);
      const subtype = EntityCore.resolveEntitySubtype(meta, post);
      if (domain) addFacetValue(values, "entity_domain", domain);
      if (subtype) addFacetValue(values, "entity_subtype", subtype);
    } else {
      if (meta.entity_domain) addFacetValue(values, "entity_domain", meta.entity_domain);
      if (meta.entity_subtype) addFacetValue(values, "entity_subtype", meta.entity_subtype);
    }

    if (typeof BoundLoreFacetRegistry !== "undefined" && BoundLoreFacetRegistry.collectFacetSignals) {
      try {
        BoundLoreFacetRegistry.collectFacetSignals(meta, post).forEach(function(entry) {
          if (entry && entry.groupKey && entry.value) {
            addFacetValue(values, entry.groupKey, entry.value);
          }
        });
      } catch (err) {
        /* defensive */
      }
    } else if (meta.facets && typeof meta.facets === "object") {
      Object.keys(meta.facets).forEach(function(groupKey) {
        const raw = meta.facets[groupKey];
        const list = Array.isArray(raw) ? raw : [raw];
        list.forEach(function(item) {
          addFacetValue(values, groupKey, item);
        });
      });
    }

    return values;
  }

  function taxonomyMatches(groupValues, filterValue) {
    if (!filterValue) return false;
    return groupValues.some(function(value) {
      if (value === filterValue) return true;
      if (value.indexOf(filterValue + ">") === 0) return true;
      if (filterValue.indexOf(value + ">") === 0) return true;
      return false;
    });
  }

  function postMatchesFacetFilters(postOrMeta, filters) {
    const normalized = normalizeFacetFilters(filters);
    if (!normalized.length) return true;
    const facetValues = getPostFacetValues(postOrMeta);
    return normalized.every(function(filter) {
      const groupValues = facetValues[filter.group] || [];
      if (!groupValues.length) return false;
      if (filter.group === "taxonomy") return taxonomyMatches(groupValues, filter.value);
      return groupValues.indexOf(filter.value) >= 0;
    });
  }

  function filterPostsByFacets(posts, filters) {
    const list = Array.isArray(posts) ? posts : [];
    const normalized = normalizeFacetFilters(filters);
    if (!normalized.length) return list.slice();
    return list.filter(function(post) {
      const meta = parseMetaFromSource(post);
      return postMatchesFacetFilters({ meta: meta, post: post }, normalized);
    });
  }

  function buildFacetUrl(baseUrl, filters) {
    const normalized = normalizeFacetFilters(filters);
    let url;
    try {
      url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : "http://localhost:8080");
    } catch (err) {
      return baseUrl || "/";
    }
    DIRECT_PARAM_GROUPS.forEach(function(group) {
      url.searchParams.delete(group);
    });
    url.searchParams.delete("facet");
    normalized.forEach(function(filter) {
      url.searchParams.append("facet", filter.group + ":" + filter.value);
    });
    return url.pathname + url.search + url.hash;
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function getFacetFilterLabel(group, value) {
    const normalizedGroup = normalizeFacetGroupKey(group);
    const normalizedValue = normalizeFacetValueForGroup(normalizedGroup, value);
    if (!normalizedGroup || !normalizedValue) return "";
    if (normalizedGroup === "entity_domain") return "Domain: " + normalizedValue;
    if (normalizedGroup === "entity_subtype") return "Subtype: " + titleCase(normalizedValue);
    if (typeof BoundLoreFacetRegistry !== "undefined") {
      const groupLabel = BoundLoreFacetRegistry.formatFacetGroupLabel(normalizedGroup);
      const valueLabel = BoundLoreFacetRegistry.formatFacetValueLabel(normalizedGroup, normalizedValue);
      if (groupLabel && valueLabel) return groupLabel + ": " + valueLabel;
    }
    return titleCase(normalizedGroup) + ": " + titleCase(normalizedValue);
  }

  function getActiveFacetFilterSummary(filters) {
    const normalized = normalizeFacetFilters(filters);
    if (!normalized.length) return "";
    return normalized.map(function(filter) {
      return getFacetFilterLabel(filter.group, filter.value);
    }).join(" · ");
  }

  function getSupportedFacetFilters(context) {
    const key = String(context || "browse").toLowerCase();
    const list = CONTEXT_FILTERS[key] || CONTEXT_FILTERS.browse;
    return list.slice();
  }

  function hasActiveFacetFilters(filters) {
    return normalizeFacetFilters(filters).length > 0;
  }

  function parseFacetQueryFromLocation() {
    try {
      return parseFacetQuery(typeof window !== "undefined" ? window.location.search : "");
    } catch (err) {
      return [];
    }
  }

  function renderActiveFacetSummaryHtml(filters, options) {
    if (!hasActiveFacetFilters(filters)) return "";
    const summary = getActiveFacetFilterSummary(filters);
    if (!summary) return "";
    const opts = options || {};
    const cls = "bl-facet-browse-summary" + (opts.className ? " " + opts.className : "");
    return '<p class="' + escapeHtml(cls) + '" style="font-size:0.85rem;color:var(--text-muted);margin:8px 0 0;">' +
      "Active facet filters: " + escapeHtml(summary) + "</p>";
  }

  return {
    DIRECT_PARAM_GROUPS: DIRECT_PARAM_GROUPS.slice(),
    parseFacetQuery: parseFacetQuery,
    parseFacetQueryFromLocation: parseFacetQueryFromLocation,
    normalizeFacetFilter: normalizeFacetFilter,
    normalizeFacetFilters: normalizeFacetFilters,
    getPostFacetValues: getPostFacetValues,
    postMatchesFacetFilters: postMatchesFacetFilters,
    filterPostsByFacets: filterPostsByFacets,
    buildFacetUrl: buildFacetUrl,
    getActiveFacetFilterSummary: getActiveFacetFilterSummary,
    getFacetFilterLabel: getFacetFilterLabel,
    getSupportedFacetFilters: getSupportedFacetFilters,
    hasActiveFacetFilters: hasActiveFacetFilters,
    renderActiveFacetSummaryHtml: renderActiveFacetSummaryHtml,
  };
})();
