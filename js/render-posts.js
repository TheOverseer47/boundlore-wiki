// render-posts.js
// Shared logic to fetch and render published posts for a given category on any category page.
// Usage on a category page: renderCategoryPosts("guides");

async function renderCategoryPosts(categorySlug) {
  const container = document.getElementById("categoryPostsList");
  const emptyMsg = document.getElementById("categoryPostsEmpty");
  if (!container) return;

  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("id, title, category, content, is_discovery, created_at, profiles(username)")
    .eq("category", categorySlug)
    .eq("status", "published")
    .order("created_at", { ascending: false });

  container.innerHTML = "";

  if (error || !posts || posts.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  posts.forEach(function(post) {
    const authorName = post.profiles ? post.profiles.username : "Unknown";
    const plainText = post.content.replace(/<[^>]*>/g, "").slice(0, 140);
    const discoveryBadge = post.is_discovery
      ? "<span style=\"background:linear-gradient(135deg,#ffd700,#ff8c00);color:#111;padding:2px 8px;border-radius:10px;font-size:0.7rem;font-weight:700;margin-left:6px;\">\u2728 Discovery</span>"
      : "";

    const card = document.createElement("div");
    card.className = "guide-card";
    card.style.cssText = "background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px;margin-bottom:16px;cursor:pointer;transition:border-color 0.2s;";
    card.innerHTML =
      "<h3 style=\"margin:0 0 6px;\">" + escapeHtmlRP(post.title) + discoveryBadge + "</h3>" +
      "<p style=\"color:var(--text-muted);font-size:0.8rem;margin-bottom:8px;\">By " + escapeHtmlRP(authorName) + " &middot; " + new Date(post.created_at).toLocaleDateString() + "</p>" +
      "<p style=\"color:var(--text-secondary);\">" + escapeHtmlRP(plainText) + "...</p>";

    card.addEventListener("click", function() {
      window.location.href = "/wiki/post/?id=" + post.id;
    });

    container.appendChild(card);
  });
}

function escapeHtmlRP(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
