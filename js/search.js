// ============================================
// FILE: js/search.js
// Global search + structured signal ranking (P0.5-E)
// Falls back to title/excerpt ilike when search-signals unavailable.
// ============================================

let searchDebounceTimer = null;
let structuredSearchCache = { posts: null, documents: null, at: 0 };
const STRUCTURED_SEARCH_CACHE_MS = 120000;

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

function escapeHtml(str) {
  if (typeof BoundLoreSearchSignals !== "undefined" && BoundLoreSearchSignals.escapeHtml) {
    return BoundLoreSearchSignals.escapeHtml(str);
  }
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function buildPostPath(postOrDoc) {
  const slug = postOrDoc && (postOrDoc.slug || (postOrDoc.document && postOrDoc.document.slug));
  if (slug) return "/wiki/post/?slug=" + encodeURIComponent(slug);
  return "/wiki/post/";
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

async function fetchStructuredSearchCorpus() {
  if (
    structuredSearchCache.posts &&
    structuredSearchCache.documents &&
    Date.now() - structuredSearchCache.at < STRUCTURED_SEARCH_CACHE_MS
  ) {
    return structuredSearchCache;
  }

  const { data, error } = await supabase
    .from("posts")
    .select("id, title, category, post_type, slug, excerpt, content, status, deleted_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .limit(500);

  if (error) throw error;

  const posts = Array.isArray(data) ? data : [];
  const documents = BoundLoreSearchSignals.buildSearchDocuments(posts);
  structuredSearchCache = { posts: posts, documents: documents, at: Date.now() };
  return structuredSearchCache;
}

function renderStructuredPostResult(row, options) {
  const opts = options || {};
  const doc = row.document || {};
  const path = buildPostPath(doc);
  const categoryLabel = getPostCategoryLabelSafe(doc);
  const hint = opts.showHints && row.explanation
    ? '<span class="search-result-hint">' + escapeHtml(row.explanation) + "</span>"
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

async function runStructuredSearch(query, options) {
  const opts = Object.assign({
    postLimit: 12,
    missingLimit: 4,
    showHints: true,
    showStartLink: true,
  }, options || {});

  const corpus = await fetchStructuredSearchCorpus();
  const postResults = BoundLoreSearchSignals.searchDocuments(query, corpus.documents, {
    limit: opts.postLimit,
  });
  const missingResults = BoundLoreSearchSignals.findMissingEntrySuggestions(query, corpus.posts, {
    limit: opts.missingLimit,
  });

  return { postResults: postResults, missingResults: missingResults, corpus: corpus };
}

async function runLegacySearch(query) {
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, category, post_type, slug, excerpt")
    .eq("status", "published")
    .is("deleted_at", null)
    .or("title.ilike.%" + query + "%,excerpt.ilike.%" + query + "%")
    .limit(8);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
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
  const opts = Object.assign({ postLimit: 8, missingLimit: 2, showHints: false, showStartLink: true }, options || {});

  try {
    if (hasStructuredSearch()) {
      const structured = await runStructuredSearch(query, opts);
      const hasPosts = structured.postResults.length > 0;
      const hasMissing = structured.missingResults.length > 0;
      const faqResults = filterFaqResults(query);

      if (!hasPosts && !hasMissing && faqResults.length === 0) {
        resultsBox.innerHTML = '<div class="search-empty">No results found for "' + escapeHtml(query) + '"</div>';
        resultsBox.style.display = "block";
        return;
      }

      resultsBox.innerHTML = renderSearchResultsHtml(query, structured.postResults, structured.missingResults, opts);
      resultsBox.style.display = "block";
      return;
    }

    const data = await runLegacySearch(query);
    if (!data.length) {
      const faqResults = filterFaqResults(query);
      if (faqResults.length > 0) {
        resultsBox.innerHTML = renderFaqResults(faqResults);
        resultsBox.style.display = "block";
        return;
      }
      resultsBox.innerHTML = '<div class="search-empty">No results found for "' + escapeHtml(query) + '"</div>';
      resultsBox.style.display = "block";
      return;
    }

    const faqHtml = renderFaqResults(filterFaqResults(query));
    resultsBox.innerHTML = faqHtml + data
      .filter(function(post) {
        if (/^contribution-/i.test(String(post.slug || ""))) return false;
        if (/^Contribution:/i.test(String(post.title || ""))) return false;
        return true;
      })
      .map(function(post) {
        const path = buildPostPath(post);
        const categoryLabel = getPostCategoryLabelSafe(post);
        return '<a href="' + path + '" class="search-result-item">' +
          '<span class="search-result-title">' + escapeHtml(post.title) + "</span>" +
          '<span class="search-result-cat">' + escapeHtml(categoryLabel) + "</span></a>";
      })
      .join("");
    resultsBox.style.display = "block";
  } catch (err) {
    console.error("Search failed:", err);
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
      runSearch(query, resultsBox, { postLimit: 8, missingLimit: 2, showHints: false, showStartLink: true });
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
      return;
    }

    pageResults.innerHTML = '<p class="search-page-loading">Searching...</p>';
    if (pageSummary) pageSummary.textContent = 'Results for "' + query + '"';

    if (!hasStructuredSearch()) {
      pageResults.innerHTML = '<p class="search-page-empty">Structured search is unavailable on this page.</p>';
      return;
    }

    try {
      const structured = await runStructuredSearch(query, {
        postLimit: 24,
        missingLimit: 6,
        showHints: true,
        showStartLink: true,
      });

      const hasPosts = structured.postResults.length > 0;
      const hasMissing = structured.missingResults.length > 0;
      if (!hasPosts && !hasMissing) {
        pageResults.innerHTML = '<p class="search-page-empty">No results found for "' + escapeHtml(query) + '"</p>';
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
  runSearch: runSearch,
  runStructuredSearch: runStructuredSearch,
  fetchStructuredSearchCorpus: fetchStructuredSearchCorpus,
  renderMissingEntrySuggestion: renderMissingEntrySuggestion,
  renderStructuredPostResult: renderStructuredPostResult,
};
