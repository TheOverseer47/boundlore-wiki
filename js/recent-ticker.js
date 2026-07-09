async function loadRecentTicker() {
  const track = document.getElementById("recentTickerTrack");
  if (!track || typeof supabase === "undefined") return;

  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, category, post_type, guide_subcategory, created_at, status")
    .in("status", ["published", "approved"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error || !data || data.length === 0) {
    track.innerHTML =
      '<a class="recent-card placeholder" href="/wiki/create-post/">' +
      '<span class="recent-tag">Recently Added</span>' +
      '<h4>No recent approved posts yet</h4>' +
      '<p>Be the first to contribute a post to populate this section.</p>' +
      "</a>";
    return;
  }

  const itemsHtml = data.map(function(post) {
    const label = typeof getPostCategoryLabel === "function"
      ? getPostCategoryLabel(post)
      : (post.category || "Post");
    const href = post.slug
      ? ("/wiki/post/?slug=" + encodeURIComponent(post.slug))
      : ("/wiki/post/?id=" + encodeURIComponent(post.id));

    return '<a class="recent-card" href="' + href + '">' +
      '<span class="recent-tag">' + escapeHtmlRT(label) + '</span>' +
      '<h4>' + escapeHtmlRT(post.title || "Untitled") + '</h4>' +
      '<div class="recent-meta"><span>' + escapeHtmlRT(post.status === "approved" ? "Approved" : "Published") + '</span><span>' + new Date(post.created_at).toLocaleDateString() + '</span></div>' +
      "</a>";
  }).join("");

  track.innerHTML = itemsHtml;
}

function escapeHtmlRT(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", loadRecentTicker);
