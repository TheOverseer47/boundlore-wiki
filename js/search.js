// ============================================
// FILE: js/search.js
// Global search — RPC-first via bl_search_public_content (P5-E.9E.4F).
// Local recall-utils remain for QA fixtures only; runtime uses RPC, not posts.
// ============================================

let searchDebounceTimer = null;

const SEARCH_RPC_NAME = "bl_search_public_content";
const SEARCH_RPC_QUERY_MAX_LEN = 120;

const SEARCH_RPC_BLOCKED_RESULT_FIELDS = new Set([
  "search_text",
  "search_vector",
  "content",
  "body",
  "body_text",
  "email",
  "user_email",
  "profile",
  "profile_id",
  "author_email",
  "blmeta",
  "blmeta_signals",
]);

const SEARCH_RPC_ALLOWED_RESULT_FIELDS = new Set([
  "title",
  "canonical_slug",
  "canonical_url",
  "excerpt",
  "category",
  "entity_domain",
  "entity_subtype",
  "score",
  "source_type",
  "matched_fields",
]);

const faqSearchIndex = [
  { title: "Why was my account banned?", url: "/wiki/support/#faq-banned" },
  { title: "Why is my post not showing up?", url: "/wiki/support/#faq-post-missing" },
  { title: "How do I reset my password?", url: "/wiki/support/#faq-password" },
  { title: "How do I report a user or a post?", url: "/wiki/support/#faq-report-user" },
  { title: "Support", url: "/wiki/support" }
];

function hasStructuredSearch() {
  return typeof window.BoundLoreSearchSignals !== "undefined";
}

function hasRecallUtils() {
  return typeof window.BoundLoreSearchRecall !== "undefined";
}

function escapeHtml(str) {
  if (hasRecallUtils() && BoundLoreSearchRecall.escapeHtml) {
    return BoundLoreSearchRecall.escapeHtml(str);
  }
  if (typeof BoundLoreSearchSignals !== "undefined" && BoundLoreSearchSignals.escapeHtml) {
    return BoundLoreSearchSignals.escapeHtml(str);
  }
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function isRpcAvailable() {
  return (
    window.BOUNDLORE_SUPABASE_CONFIG_STATUS === "STAGING_REF_VERIFIED" &&
    typeof supabase !== "undefined" &&
    supabase &&
    typeof supabase.rpc === "function"
  );
}

function normalizeRpcQuery(query) {
  let raw = String(query || "").trim();
  if (hasRecallUtils() && BoundLoreSearchRecall.isUnsafeQuery(raw)) {
    return "";
  }
  if (raw.length > SEARCH_RPC_QUERY_MAX_LEN) {
    raw = raw.slice(0, SEARCH_RPC_QUERY_MAX_LEN);
  }
  return raw;
}

function containsLeakMarkers(value) {
  const text = String(value || "");
  if (!text) return false;
  if (/<!--\s*BLMETA/i.test(text)) return true;
  if (/\bBLMETA\b/i.test(text)) return true;
  if (/search_text|search_vector/i.test(text)) return true;
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return true;
  return false;
}

function mapRpcResult(row) {
  if (!row || typeof row !== "object") return null;

  const keys = Object.keys(row);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (SEARCH_RPC_BLOCKED_RESULT_FIELDS.has(key) && row[key] != null && row[key] !== "") {
      return null;
    }
    if (!SEARCH_RPC_ALLOWED_RESULT_FIELDS.has(key) && key !== "id") {
      return null;
    }
  }

  const slug = String(row.canonical_slug || "").trim();
  const title = String(row.title || "Untitled").trim();
  const excerpt = String(row.excerpt || "").slice(0, 200);
  let url = String(row.canonical_url || "").trim();
  if (!url && slug) url = "/wiki/post/" + slug + "/";
  if (!url) url = "/wiki/post/";

  if (containsLeakMarkers(title) || containsLeakMarkers(excerpt)) return null;
  if (/^Contribution:/i.test(title)) return null;
  if (/^(qa-|test-|fixture-|contribution-)/i.test(slug)) return null;

  const leakProbe = Object.assign({}, row);
  delete leakProbe.matched_fields;
  delete leakProbe.id;
  delete leakProbe.score;
  if (containsLeakMarkers(JSON.stringify(leakProbe))) return null;

  return {
    document: {
      kind: "post",
      slug: slug,
      title: title,
      category: row.category || "",
      post_type: row.source_type || "",
      entity_domain: row.entity_domain || "",
      entity_subtype: row.entity_subtype || "",
      excerpt: excerpt,
      url: url,
    },
    score: typeof row.score === "number" ? row.score : Number(row.score) || 0,
    explanation: excerpt ? escapeHtml(excerpt).slice(0, 140) : "",
  };
}

function reportSearchRpcEvent(reasonCode, extra) {
  if (typeof window.BoundLoreErrorReporter === "undefined" || !BoundLoreErrorReporter.captureMessage) {
    return;
  }
  try {
    BoundLoreErrorReporter.captureMessage("search_rpc_event", Object.assign({
      feature: "search",
      gate_code: "P5-E.9E.4F",
      reason_code: reasonCode,
      rpc: SEARCH_RPC_NAME,
      redacted: true,
    }, extra || {}));
  } catch (reportErr) {
    // fail-closed: reporting must not break search
  }
}

async function callSearchRpc(query, options) {
  const opts = options || {};

  if (!isRpcAvailable()) {
    return { results: [], error: "rpc_unavailable", failClosed: true, usedRpc: false };
  }

  const normalized = normalizeRpcQuery(query);
  if (!normalized) {
    return { results: [], error: null, failClosed: false, usedRpc: true };
  }

  const limit = typeof opts.limit === "number"
    ? Math.min(Math.max(opts.limit, 1), 50)
    : 24;

  try {
    const { data, error } = await supabase.rpc(SEARCH_RPC_NAME, {
      search_query: normalized,
      search_filters: { limit: limit },
    });

    if (error) {
      reportSearchRpcEvent("rpc_error", { code: error.code || "unknown" });
      return { results: [], error: error, failClosed: true, usedRpc: true };
    }

    const mapped = (Array.isArray(data) ? data : [])
      .map(mapRpcResult)
      .filter(Boolean);

    return { results: mapped, error: null, failClosed: false, usedRpc: true };
  } catch (err) {
    reportSearchRpcEvent("rpc_exception", { reason: "exception" });
    return { results: [], error: err, failClosed: true, usedRpc: true };
  }
}

function buildPostPath(postOrDoc, row) {
  if (hasRecallUtils()) {
    try {
      let rec = row && row.recallRecord;
      const doc = postOrDoc && (postOrDoc.document || postOrDoc);
      if (!rec && doc && (doc.slug || doc.title || doc.url)) {
        if (doc.url) return doc.url;
        if (doc.slug) return "/wiki/post/" + encodeURIComponent(doc.slug) + "/";
      }
      if (rec && BoundLoreSearchRecall.isPublicSearchable(rec)) {
        return BoundLoreSearchRecall.getCanonicalResultUrl(rec);
      }
    } catch (e) {
      // fail-closed: fall back to safe CSR path
    }
  }
  const doc = postOrDoc && (postOrDoc.document || postOrDoc);
  if (doc && doc.url) return doc.url;
  const slug = postOrDoc && (postOrDoc.slug || (postOrDoc.document && postOrDoc.document.slug));
  if (slug) return "/wiki/post/" + encodeURIComponent(slug) + "/";
  return "/wiki/post/";
}

function renderEmptySearchHtml(query) {
  if (hasRecallUtils()) {
    try {
      return BoundLoreSearchRecall.renderEmptyStateHtml(query);
    } catch (e) {
      // fail-closed
    }
  }
  return '<div class="search-empty">No results found for "' + escapeHtml(query) + '"</div>';
}

function getPostCategoryLabelSafe(post) {
  if (typeof getPostCategoryLabel === "function") {
    return getPostCategoryLabel(post);
  }
  if (post.post_type === "guide") return "Guide";
  return post.category || "Post";
}

function filterFaqResults(query) {
  const q = String(query || "").toLowerCase();
  return faqSearchIndex.filter(function(item) {
    return item.title.toLowerCase().includes(q);
  });
}

function renderFaqResults(faqResults) {
  return faqResults
    .map(function(item) {
      return '<a href="' + item.url + '" class="search-result-item">' +
        '<span class="search-result-title">' + escapeHtml(item.title) + "</span>" +
        '<span class="search-result-cat">Support</span></a>';
    })
    .join("");
}

function renderStructuredPostResult(row, options) {
  const opts = options || {};
  const doc = row.document || {};
  const path = buildPostPath(doc, row);
  const categoryLabel = getPostCategoryLabelSafe(doc);
  const hint = opts.showHints && row.explanation
    ? '<span class="search-result-hint">' + row.explanation + "</span>"
    : "";

  return '<a href="' + path + '" class="search-result-item">' +
    '<span class="search-result-title">' + escapeHtml(doc.title || "Untitled") + "</span>" +
    '<span class="search-result-cat">' + escapeHtml(categoryLabel) + "</span>" +
    hint +
    "</a>";
}

function renderMissingEntrySuggestion(row, options) {
  const opts = options || {};
  const doc = row.document || {};
  const startUrl = doc.start_url || "#";
  const hint = doc.suggested_reason || "Not a post yet";
  const typeLabel = doc.suggested_type || "Missing entry";

  return '<div class="search-result-item search-result-missing">' +
    '<div class="search-result-missing-head">' +
    '<span class="search-result-missing-badge">Missing entry suggestion</span>' +
    '<span class="search-result-missing-note">Not a post yet</span>' +
    "</div>" +
    '<div class="search-result-title">' + escapeHtml(doc.title || "Unknown") + "</div>" +
    '<div class="search-result-hint">' + escapeHtml(typeLabel) + " · " + escapeHtml(hint) + "</div>" +
    (opts.showStartLink && startUrl
      ? '<a class="search-result-start-link" href="' + escapeHtml(startUrl) + '">Start entry</a>'
      : "") +
    "</div>";
}

async function runRpcSearch(query, options) {
  const opts = Object.assign({ postLimit: 24, missingLimit: 0 }, options || {});
  const rpc = await callSearchRpc(query, { limit: opts.postLimit });
  return {
    postResults: rpc.results,
    missingResults: [],
    rpcMeta: {
      failClosed: rpc.failClosed,
      usedRpc: rpc.usedRpc,
      error: rpc.error || null,
    },
  };
}

async function runStructuredSearch(query, options) {
  const opts = Object.assign({
    postLimit: 12,
    missingLimit: 0,
    showHints: true,
    showStartLink: true,
  }, options || {});

  return runRpcSearch(query, opts);
}

async function runLegacySearch(query) {
  const rpc = await callSearchRpc(query, { limit: 8 });
  return rpc.results.map(function(row) {
    const doc = row.document || {};
    return {
      title: doc.title,
      slug: doc.slug,
      category: doc.category,
      post_type: doc.post_type,
      excerpt: doc.excerpt,
    };
  });
}

function renderSearchResultsHtml(query, postResults, missingResults, options) {
  const opts = options || {};
  const faqResults = filterFaqResults(query);
  let html = renderFaqResults(faqResults);

  (missingResults || []).forEach(function(row) {
    html += renderMissingEntrySuggestion(row, opts);
  });

  (postResults || []).forEach(function(row) {
    if (row.document && row.document.kind === "post") {
      html += renderStructuredPostResult(row, opts);
      return;
    }
    if (row.document && row.document.kind !== "missing_entry") {
      html += renderStructuredPostResult(row, opts);
    }
  });

  return html;
}

async function runSearch(query, resultsBox, options) {
  const opts = Object.assign({ postLimit: 8, missingLimit: 0, showHints: false, showStartLink: true }, options || {});

  try {
    const structured = await runStructuredSearch(query, opts);
    const hasPosts = structured.postResults.length > 0;
    const hasMissing = structured.missingResults.length > 0;
    const faqResults = filterFaqResults(query);

    if (!hasPosts && !hasMissing && faqResults.length === 0) {
      resultsBox.innerHTML = renderEmptySearchHtml(query);
      resultsBox.style.display = "block";
      return;
    }

    resultsBox.innerHTML = renderSearchResultsHtml(query, structured.postResults, structured.missingResults, opts);
    resultsBox.style.display = "block";
  } catch (err) {
    console.error("Search failed:", err);
    reportSearchRpcEvent("search_run_failed", { reason: "exception" });
    resultsBox.innerHTML = '<div class="search-empty">Search unavailable, please try again.</div>';
    resultsBox.style.display = "block";
  }
}

function initSearch() {
  const input = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  if (!input || !resultsBox) return;

  input.addEventListener("input", function() {
    clearTimeout(searchDebounceTimer);
    const query = input.value.trim();
    if (query.length < 2) {
      resultsBox.innerHTML = "";
      resultsBox.style.display = "none";
      return;
    }
    searchDebounceTimer = setTimeout(function() {
      runSearch(query, resultsBox, { postLimit: 8, missingLimit: 0, showHints: false, showStartLink: true });
    }, 300);
  });

  document.addEventListener("click", function(e) {
    if (!resultsBox.contains(e.target) && e.target !== input) {
      resultsBox.style.display = "none";
    }
  });
}

async function initSearchPage() {
  const pageInput = document.getElementById("searchPageInput");
  const pageResults = document.getElementById("searchPageResults");
  const pageSummary = document.getElementById("searchPageSummary");
  if (!pageInput || !pageResults) return;

  const params = new URLSearchParams(window.location.search);
  const initialQuery = (params.get("q") || params.get("query") || "").trim();
  if (initialQuery) pageInput.value = initialQuery;

  async function renderPageSearch() {
    const query = pageInput.value.trim();
    if (query.length < 1) {
      pageResults.innerHTML = '<p class="search-page-empty">Enter a search term to explore structured wiki signals.</p>';
      if (pageSummary) pageSummary.textContent = "";
      const intentElEmpty = document.getElementById("searchPageIntent");
      if (intentElEmpty) {
        intentElEmpty.textContent = "";
        intentElEmpty.style.display = "none";
      }
      return;
    }

    pageResults.innerHTML = '<p class="search-page-loading">Searching...</p>';
    if (pageSummary) pageSummary.textContent = 'Results for "' + escapeHtml(query) + '"';

    const intentEl = document.getElementById("searchPageIntent");
    if (intentEl) {
      if (typeof BoundLoreSearchQueryParser !== "undefined" && BoundLoreSearchQueryParser.getQueryIntentSummary) {
        const parsed = BoundLoreSearchQueryParser.parseSearchQuery(query);
        const intentSummary = BoundLoreSearchQueryParser.getQueryIntentSummary(parsed);
        intentEl.textContent = intentSummary ? ("Interpreted as: " + intentSummary) : "";
        intentEl.style.display = intentSummary ? "block" : "none";
      } else {
        intentEl.textContent = "";
        intentEl.style.display = "none";
      }
    }

    if (!isRpcAvailable()) {
      pageResults.innerHTML = '<p class="search-page-empty">Search is unavailable. Please try again later.</p>';
      return;
    }

    try {
      const structured = await runStructuredSearch(query, {
        postLimit: 24,
        missingLimit: 0,
        showHints: true,
        showStartLink: true,
      });

      const hasPosts = structured.postResults.length > 0;
      const hasMissing = structured.missingResults.length > 0;
      if (!hasPosts && !hasMissing) {
        pageResults.innerHTML = renderEmptySearchHtml(query);
        return;
      }

      let html = '<div class="search-page-results">';
      if (hasMissing) {
        html += '<section class="search-page-section"><h3>Missing Entry Suggestions</h3><div class="search-page-list">';
        structured.missingResults.forEach(function(row) {
          html += renderMissingEntrySuggestion(row, { showStartLink: true });
        });
        html += "</div></section>";
      }
      if (hasPosts) {
        html += '<section class="search-page-section"><h3>Published Entries</h3><div class="search-page-list">';
        structured.postResults.forEach(function(row) {
          html += renderStructuredPostResult(row, { showHints: true });
        });
        html += "</div></section>";
      }
      html += "</div>";
      pageResults.innerHTML = html;
    } catch (err) {
      console.error("Search page failed:", err);
      reportSearchRpcEvent("search_page_failed", { reason: "exception" });
      pageResults.innerHTML = '<p class="search-page-empty">Search unavailable, please try again.</p>';
    }
  }

  let pageDebounce = null;
  pageInput.addEventListener("input", function() {
    clearTimeout(pageDebounce);
    pageDebounce = setTimeout(renderPageSearch, 250);
  });

  pageInput.addEventListener("keydown", function(e) {
    if (e.key === "Enter") {
      clearTimeout(pageDebounce);
      renderPageSearch();
    }
  });

  await renderPageSearch();
}

document.addEventListener("DOMContentLoaded", function() {
  initSearch();
  initSearchPage();
});

window.BoundLoreSearch = {
  SEARCH_RPC_NAME: SEARCH_RPC_NAME,
  SEARCH_RPC_QUERY_MAX_LEN: SEARCH_RPC_QUERY_MAX_LEN,
  SEARCH_RPC_BLOCKED_RESULT_FIELDS: SEARCH_RPC_BLOCKED_RESULT_FIELDS,
  SEARCH_RPC_ALLOWED_RESULT_FIELDS: SEARCH_RPC_ALLOWED_RESULT_FIELDS,
  isRpcAvailable: isRpcAvailable,
  normalizeRpcQuery: normalizeRpcQuery,
  mapRpcResult: mapRpcResult,
  callSearchRpc: callSearchRpc,
  runRpcSearch: runRpcSearch,
  runSearch: runSearch,
  runStructuredSearch: runStructuredSearch,
  renderMissingEntrySuggestion: renderMissingEntrySuggestion,
  renderStructuredPostResult: renderStructuredPostResult,
};
