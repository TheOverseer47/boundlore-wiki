async function loadRecentTicker() {
  const track = document.getElementById("recentTickerTrack");
  if (!track || typeof supabase === "undefined") return;

  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, category, post_type, guide_subcategory, created_at, status")
    .in("status", ["published", "approved"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    track.innerHTML =
      '<a class="recent-ticker-item" href="/wiki/create-post/">' +
      '<span class="recent-tag">Live Feed</span>' +
      '<strong>No recent approved posts yet. Be the first to contribute.</strong>' +
      "</a>";
    return;
  }

  const itemsHtml = data.map(function(post) {
    const label = typeof getPostCategoryLabel === "function"
      ? getPostCategoryLabel(post)
      : (post.category || "Post");
    const statusLabel = post.status === "approved" ? "Approved" : "Published";
    const href = post.slug
      ? ("/wiki/post/?slug=" + encodeURIComponent(post.slug))
      : ("/wiki/post/?id=" + encodeURIComponent(post.id));

    return '<a class="recent-ticker-item" href="' + href + '">' +
      '<span class="recent-tag">' + escapeHtmlRT(label) + ' · ' + statusLabel + '</span>' +
      '<strong>' + escapeHtmlRT(post.title || "Untitled") + '</strong>' +
      '<span class="recent-ticker-date">' + new Date(post.created_at).toLocaleDateString() + '</span>' +
      "</a>";
  }).join("");

  // Duplicate once for seamless marquee loop.
  track.innerHTML = itemsHtml + itemsHtml;
}

function escapeHtmlRT(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", loadRecentTicker);
