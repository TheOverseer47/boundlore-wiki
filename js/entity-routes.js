// ============================================
// BoundLore Entity Routes — P5-E.9G.2
// Central canonical entity URL builders. No network. No Supabase.
// ============================================

window.BoundLoreEntityRoutes = (function() {
  var ENTITY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  var CANONICAL_PREFIX = "/wiki/post/";
  var LEGACY_QUERY_PREFIX = "/wiki/post/?slug=";

  function normalizeEntitySlug(value) {
    if (typeof value !== "string") return null;
    var trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.indexOf("/") >= 0 || trimmed.indexOf("\\") >= 0) return null;
    if (trimmed === "." || trimmed === "..") return null;
    if (trimmed.indexOf("?") >= 0 || trimmed.indexOf("#") >= 0) return null;
    if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;
    if (/^\s*[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
    if (trimmed !== trimmed.toLowerCase()) return null;
    return trimmed;
  }

  function isValidEntitySlug(value) {
    var norm = normalizeEntitySlug(value);
    return norm !== null && ENTITY_SLUG_RE.test(norm);
  }

  function buildCanonicalEntityPath(slug) {
    var norm = normalizeEntitySlug(slug);
    if (!norm || !ENTITY_SLUG_RE.test(norm)) return null;
    return CANONICAL_PREFIX + encodeURIComponent(norm) + "/";
  }

  function buildLegacyEntityPath(slug) {
    var norm = normalizeEntitySlug(slug);
    if (!norm || !ENTITY_SLUG_RE.test(norm)) return null;
    return LEGACY_QUERY_PREFIX + encodeURIComponent(norm);
  }

  function extractLegacySlugFromLocation(location) {
    try {
      var loc = location;
      if (!loc && typeof window !== "undefined") loc = window.location;
      if (!loc) return null;
      var url = typeof loc === "string" ? new URL(loc, "https://boundlore.invalid") : loc;
      var pathNorm = String(url.pathname || "")
        .replace(/\/index\.html$/i, "")
        .replace(/\/+$/, "");
      if (pathNorm !== "/wiki/post") return null;
      var values = url.searchParams.getAll("slug");
      if (values.length !== 1) return null;
      return normalizeEntitySlug(values[0]);
    } catch (e) {
      return null;
    }
  }

  function appendQuery(path, query) {
    if (!query) return path;
    if (typeof query === "string") {
      var raw = query.replace(/^\?+/, "").trim();
      return raw ? path + "?" + raw : path;
    }
    if (typeof query === "object") {
      var params = new URLSearchParams();
      Object.keys(query).forEach(function(key) {
        if (query[key] != null && query[key] !== "") {
          params.set(key, String(query[key]));
        }
      });
      var qs = params.toString();
      return qs ? path + "?" + qs : path;
    }
    return path;
  }

  function buildEntityPostHref(options) {
    options = options || {};
    var path = buildCanonicalEntityPath(options.slug);
    if (path) return appendQuery(path, options.query || null);
    if (options.id != null && options.id !== "") {
      return appendQuery(CANONICAL_PREFIX + "?id=" + encodeURIComponent(String(options.id)), options.query || null);
    }
    return CANONICAL_PREFIX;
  }

  return {
    ENTITY_SLUG_RE: ENTITY_SLUG_RE,
    normalizeEntitySlug: normalizeEntitySlug,
    isValidEntitySlug: isValidEntitySlug,
    buildCanonicalEntityPath: buildCanonicalEntityPath,
    buildLegacyEntityPath: buildLegacyEntityPath,
    extractLegacySlugFromLocation: extractLegacySlugFromLocation,
    buildEntityPostHref: buildEntityPostHref,
  };
})();
