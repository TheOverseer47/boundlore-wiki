// ============================================
// FILE: js/search.js
// Fixes: Search function not working
// Searches title + excerpt across all published posts
// ============================================

let searchDebounceTimer = null;
const faqSearchIndex = [
  { title: "Why was my account banned?", url: "/wiki/support/#faq-banned" },
  { title: "Why is my post not showing up?", url: "/wiki/support/#faq-post-missing" },
  { title: "How do I reset my password?", url: "/wiki/support/#faq-password" },
  { title: "How do I report a user or a post?", url: "/wiki/support/#faq-report-user" },
  { title: "Support", url: "/wiki/support" }
];

function initSearch() {
  const input = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  if (!input || !resultsBox) return;

  input.addEventListener("input", () => {
    clearTimeout(searchDebounceTimer);
    const query = input.value.trim();

    if (query.length < 2) {
      resultsBox.innerHTML = "";
      resultsBox.style.display = "none";
      return;
    }

    searchDebounceTimer = setTimeout(() => runSearch(query, resultsBox), 300);
  });

  document.addEventListener("click", (e) => {
    if (!resultsBox.contains(e.target) && e.target !== input) {
      resultsBox.style.display = "none";
    }
  });
}

async function runSearch(query, resultsBox) {
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, title, category, post_type, slug, excerpt")
      .eq("status", "approved")
      .or(`title.ilike.%${query}%,excerpt.ilike.%${query}%`)
      .limit(8);

    if (error) throw error;

    if (!data || data.length === 0) {
      const faqResults = faqSearchIndex.filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
      if (faqResults.length > 0) {
        resultsBox.innerHTML = faqResults
          .map(item => `<a href="${item.url}" class="search-result-item"><span class="search-result-title">${escapeHtml(item.title)}</span><span class="search-result-cat">Support</span></a>`)
          .join("");
        resultsBox.style.display = "block";
        return;
      }

      resultsBox.innerHTML = `<div class="search-empty">No results found for "${escapeHtml(query)}"</div>`;
      resultsBox.style.display = "block";
      return;
    }

    const faqResults = faqSearchIndex.filter(item => item.title.toLowerCase().includes(query.toLowerCase()));
    const faqHtml = faqResults
      .map(item => `<a href="${item.url}" class="search-result-item"><span class="search-result-title">${escapeHtml(item.title)}</span><span class="search-result-cat">Support</span></a>`)
      .join("");

    resultsBox.innerHTML = faqHtml + data
      .map((post) => {
        const path = buildPostPath(post);
        return `<a href="${path}" class="search-result-item">
          <span class="search-result-title">${escapeHtml(post.title)}</span>
          <span class="search-result-cat">${escapeHtml(post.post_type === "guide" ? "Guide" : post.category)}</span>
        </a>`;
      })
      .join("");

    resultsBox.style.display = "block";
  } catch (err) {
    console.error("Search failed:", err);
    resultsBox.innerHTML = `<div class="search-empty">Search unavailable, please try again.</div>`;
    resultsBox.style.display = "block";
  }
}

function buildPostPath(post) {
  return `/wiki/post/?slug=${post.slug}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", initSearch);
