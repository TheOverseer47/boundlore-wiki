async function loadHomepageDiscoveries() {
  const container = document.getElementById("homeDiscoveryGrid");
  if (!container) return;

  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, category, post_type, guide_subcategory, content, created_at")
    .eq("status", "published")
    .eq("is_discovery", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error || !data || data.length === 0) {
    return;
  }

  container.innerHTML = "";

  data.forEach(function(post) {
    const card = document.createElement("a");
    card.className = "recent-card";
    card.href = BoundLoreEntityRoutes.buildEntityPostHref({ slug: post.slug });

    const label = typeof getPostCategoryLabel === "function"
      ? getPostCategoryLabel(post)
      : (post.category || "Discovery");
    const text = (post.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);

    card.innerHTML =
      '<span class="recent-tag">Discovery &middot; ' + escapeHtmlDH(label) + '</span>' +
      '<h4>' + escapeHtmlDH(post.title) + '</h4>' +
      '<p>' + escapeHtmlDH(text) + (text.length >= 120 ? '...' : '') + '</p>';

    container.appendChild(card);
  });
}

function escapeHtmlDH(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", loadHomepageDiscoveries);
