// my-posts.js
// Renders the logged-in user's own posts (all statuses) on the account page.
// Usage: renderMyPosts(currentUserId);

async function renderMyPosts(userId) {
  const container = document.getElementById("myPostsList");
  const emptyMsg = document.getElementById("myPostsEmpty");
  if (!container) return;

  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, slug, title, category, post_type, guide_subcategory, status, created_at")
    .eq("author_id", userId)
    .order("created_at", { ascending: false });

  container.innerHTML = "";

  if (error || !posts || posts.length === 0) {
    if (emptyMsg) emptyMsg.style.display = "block";
    return;
  }

  if (emptyMsg) emptyMsg.style.display = "none";

  posts.forEach(function(post) {
    const catLabel = getPostCategoryLabel(post);

    let statusBadge = "";
    if (post.status === "pending") {
      statusBadge = "<span style=\"background:#e0a83a;color:#111;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:600;\">Pending Review</span>";
    } else if (post.status === "published") {
      statusBadge = "<span style=\"background:#50c878;color:#111;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:600;\">Published</span>";
    } else if (post.status === "approved") {
      statusBadge = "<span style=\"background:#4b8bf5;color:#fff;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:600;\">Approved</span>";
    }

    const actions = [];
    if (post.status === "published") {
      const postUrl = BoundLoreEntityRoutes.buildEntityPostHref({ slug: post.slug });
      actions.push("<a href=\"" + postUrl + "\" style=\"color:var(--accent);font-size:0.85rem;\">View &rarr;</a>");
    }
      const editUrl = post.slug ? `/wiki/edit-post/?slug=${encodeURIComponent(post.slug)}` : `/wiki/edit-post/?id=${post.id}`;
      actions.push(`<a href="${editUrl}" class="link-btn">Edit</a>`);
      actions.push(`<button type="button" class="link-btn" data-action="delete-own" data-id="${post.id}" style="color:#ff7b7b;">Delete</button>`);

    const row = document.createElement("div");
    row.style.cssText = "display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;padding:14px 0;border-bottom:1px solid rgba(255,255,255,0.08);";
    row.innerHTML =
      "<div>" +
      "<p style=\"font-weight:600;margin:0;\">" + escapeHtmlMP(post.title) + "</p>" +
      "<p style=\"color:var(--text-muted);font-size:0.8rem;margin:2px 0 0;\">" + catLabel + " &middot; " + new Date(post.created_at).toLocaleDateString() + "</p>" +
      "</div>" +
      "<div style=\"display:flex;align-items:center;gap:10px;flex-wrap:wrap;\">" + statusBadge + actions.join("") + "</div>";
    container.appendChild(row);
  });

  container.querySelectorAll('[data-action="delete-own"]').forEach(function(btn) {
    btn.addEventListener("click", async function() {
      if (!confirm("Delete this post permanently?")) return;
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", this.dataset.id)
        .eq("author_id", userId);

      if (error) {
        alert("Could not delete post: " + error.message);
        return;
      }

      renderMyPosts(userId);
    });
  });
}

function escapeHtmlMP(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
