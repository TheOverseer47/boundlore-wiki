async function loadCommunityHub() {
  await Promise.all([loadCommunityDiscoveries(), loadCommunityGuides()]);
}

async function loadCommunityDiscoveries() {
  const container = document.getElementById("communityDiscoveryList");
  if (!container) return;

  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, category, post_type, guide_subcategory, content, created_at")
    .eq("status", "published")
    .eq("is_discovery", true)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error || !data || data.length === 0) {
    container.innerHTML = '<div class="recent-card placeholder"><span class="recent-tag">Discovery</span><h4>No published discoveries yet</h4><p>Be the first to submit a discovery with screenshots or files.</p></div>';
    return;
  }

  container.innerHTML = "";
  data.forEach(function(post) {
    const card = document.createElement("a");
    card.className = "recent-card";
    card.href = post.slug ? ("/wiki/post/?slug=" + encodeURIComponent(post.slug)) : "/wiki/post/";

    const label = typeof getPostCategoryLabel === "function"
      ? getPostCategoryLabel(post)
      : (post.category || "Discovery");
    const text = stripHtmlCH(post.content).slice(0, 160);

    card.innerHTML =
      '<span class="recent-tag">Discovery &middot; ' + escapeHtmlCH(label) + '</span>' +
      '<h4>' + escapeHtmlCH(post.title) + '</h4>' +
      '<p>' + escapeHtmlCH(text) + (text.length >= 160 ? '...' : '') + '</p>';

    container.appendChild(card);
  });
}

async function loadCommunityGuides() {
  const container = document.getElementById("communityGuideList");
  if (!container) return;

  const { data, error } = await supabase
    .from("posts")
    .select("id, slug, title, category, post_type, guide_subcategory, content, created_at")
    .eq("status", "published")
    .eq("category", "guides")
    .order("created_at", { ascending: false })
    .limit(4);

  if (error || !data || data.length === 0) {
    container.innerHTML = '<li style="color:var(--text-muted);">No guides published yet.</li>';
    return;
  }

  container.innerHTML = "";
  data.forEach(function(post) {
    const li = document.createElement("li");
    const href = post.slug ? ("/wiki/post/?slug=" + encodeURIComponent(post.slug)) : "/wiki/post/";
    const kind = post.guide_subcategory ? ('<span style="color:var(--text-muted);font-size:0.82rem;"> (' + escapeHtmlCH(post.guide_subcategory) + ')</span>') : '';
    li.innerHTML = '<a href="' + href + '">' + escapeHtmlCH(post.title) + '</a>' + kind;
    container.appendChild(li);
  });
}

function stripHtmlCH(html) {
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return (div.textContent || div.innerText || "").replace(/\s+/g, " ").trim();
}

function escapeHtmlCH(value) {
  const div = document.createElement("div");
  div.textContent = value == null ? "" : String(value);
  return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", loadCommunityHub);
