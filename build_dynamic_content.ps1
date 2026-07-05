# ============================================
# BoundLore - Dynamic Guides Page + My Posts + Admin Dashboard V2
# Run from project ROOT in PowerShell
# ============================================

Write-Host "Creating js/render-posts.js (shared rendering logic)..." -ForegroundColor Cyan

@'
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
'@ | Set-Content -Path "js/render-posts.js" -Encoding UTF8

Write-Host "Creating js/my-posts.js (for account page)..." -ForegroundColor Cyan

@'
// my-posts.js
// Renders the logged-in user's own posts (all statuses) on the account page.
// Usage: renderMyPosts(currentUserId);

async function renderMyPosts(userId) {
  const container = document.getElementById("myPostsList");
  const emptyMsg = document.getElementById("myPostsEmpty");
  if (!container) return;

  const { data: posts, error } = await supabaseClient
    .from("posts")
    .select("id, title, category, status, is_discovery, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  container.innerHTML = "";

  if (error || !posts || posts.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  posts.forEach(function(post) {
    const cat = typeof getCategoryBySlug === "function" ? getCategoryBySlug(post.category) : null;
    const catLabel = cat ? (cat.icon + " " + cat.label) : post.category;

    let statusBadge = "";
    if (post.status === "pending") {
      statusBadge = "<span style=\"background:#e0a83a;color:#111;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:600;\">Pending Review</span>";
    } else if (post.status === "published") {
      statusBadge = "<span style=\"background:#50c878;color:#111;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:600;\">Published</span>";
    }

    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.08);";
    row.innerHTML =
      "<div>" +
      "<p style=\"font-weight:600;margin:0;\">" + escapeHtmlMP(post.title) + "</p>" +
      "<p style=\"color:var(--text-muted);font-size:0.8rem;margin:2px 0 0;\">" + catLabel + " &middot; " + new Date(post.created_at).toLocaleDateString() + "</p>" +
      "</div>" +
      "<div style=\"display:flex;align-items:center;gap:10px;\">" + statusBadge +
      (post.status === "published" ? "<a href=\"/wiki/post/?id=" + post.id + "\" style=\"color:var(--accent);font-size:0.85rem;\">View &rarr;</a>" : "") +
      "</div>";
    container.appendChild(row);
  });
}

function escapeHtmlMP(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
'@ | Set-Content -Path "js/my-posts.js" -Encoding UTF8

Write-Host "Done." -ForegroundColor Green