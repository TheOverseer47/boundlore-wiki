async function loadCommunityHub() {
  await Promise.all([loadCommunityDiscoveries(), loadCommunityGuides(), initCommunityRedditForm()]);
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
    card.href = BoundLoreEntityRoutes.buildEntityPostHref({ slug: post.slug });

    const label = typeof getPostCategoryLabel === "function"
      ? getPostCategoryLabel(post)
      : (post.category || "Discovery");
    const meta = parsePostMetaCH(post.content || "");
    const subcategory = post.guide_subcategory || (meta && meta.subcategory) || "";
    const text = stripHtmlCH(post.content).slice(0, 160);

    card.innerHTML =
      '<span class="recent-tag">Discovery &middot; ' + escapeHtmlCH(label) + (subcategory ? ' <span style="opacity:0.8;">(' + escapeHtmlCH(subcategory) + ')</span>' : '') + '</span>' +
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
    .in("status", ["published", "approved"])
    .eq("post_type", "guide")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error || !data || data.length === 0) {
    container.innerHTML = '<li style="color:var(--text-muted);">No guides published yet.</li>';
    return;
  }

  container.innerHTML = "";
  data.forEach(function(post) {
    const li = document.createElement("li");
    const href = BoundLoreEntityRoutes.buildEntityPostHref({ slug: post.slug });
    const meta = parsePostMetaCH(post.content || "");
    const subcategory = post.guide_subcategory || (meta && meta.subcategory) || "";
    const label = subcategory && typeof getGuideSubcategoryLabel === "function"
      ? getGuideSubcategoryLabel(subcategory)
      : subcategory;
    const kind = label ? ('<span style="color:var(--text-muted);font-size:0.82rem;"> (' + escapeHtmlCH(label) + ')</span>') : '';
    li.innerHTML = '<a href="' + href + '">' + escapeHtmlCH(post.title) + '</a>' + kind;
    container.appendChild(li);
  });
}

async function initCommunityRedditForm() {
  const gateBox = document.getElementById("redditGateBox");
  const formBox = document.getElementById("redditFormBox");
  const btn = document.getElementById("btnSubmitReddit");

  if (!gateBox || !formBox || !btn) return;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData || !sessionData.session) {
    gateBox.innerHTML = 'Please <a href="/wiki/login/">log in</a> to submit a Reddit thread.';
    return;
  }

  gateBox.style.display = "none";
  formBox.style.display = "block";
  btn.addEventListener("click", submitCommunityReddit);
}

async function submitCommunityReddit() {
  const urlEl = document.getElementById("redditUrl");
  const titleEl = document.getElementById("redditTitle");
  const descEl = document.getElementById("redditDescription");
  const btn = document.getElementById("btnSubmitReddit");

  if (!urlEl || !descEl || !btn) return;

  const url = (urlEl.value || "").trim();
  const title = (titleEl && titleEl.value ? titleEl.value : "").trim();
  const description = (descEl.value || "").trim();

  setCommunityRedditStatus("", "");

  if (!isValidRedditUrl(url)) {
    setCommunityRedditStatus("Please enter a valid Reddit URL.", "error");
    return;
  }
  if (!description) {
    setCommunityRedditStatus("Please add context for your submission.", "error");
    return;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData || !sessionData.session) {
    setCommunityRedditStatus("Please log in again and retry.", "error");
    return;
  }

  btn.disabled = true;
  btn.textContent = "Submitting...";

  const reason = "Community Reddit submission" +
    (title ? (" - " + title) : "") +
    " - URL: " + url +
    " - " + description;

  const { error } = await supabase.from("reports").insert({
    reporter_id: sessionData.session.user.id,
    category: "general",
    target_type: null,
    description: "Community Reddit review request",
    reason: reason,
    screenshot_url: null,
  });

  btn.disabled = false;
  btn.textContent = "Submit for Review";

  if (error) {
    setCommunityRedditStatus("Submission failed: " + error.message, "error");
    return;
  }

  urlEl.value = "";
  if (titleEl) titleEl.value = "";
  descEl.value = "";
  setCommunityRedditStatus("Submitted for review. Thanks for contributing.", "success");
}

function setCommunityRedditStatus(message, kind) {
  const status = document.getElementById("redditStatus");
  if (!status) return;
  status.classList.remove("error", "success");

  if (!message) {
    status.style.display = "none";
    status.textContent = "";
    return;
  }

  status.textContent = message;
  status.style.display = "block";
  if (kind) status.classList.add(kind);
}

function isValidRedditUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return (host === "reddit.com" || host === "www.reddit.com" || host.endsWith(".reddit.com")) && /^https?:$/.test(parsed.protocol);
  } catch (err) {
    return false;
  }
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

function parsePostMetaCH(html) {
  const match = String(html || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
  if (!match) return {};
  try {
    const parsed = JSON.parse(match[1]);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    return {};
  }
}

document.addEventListener("DOMContentLoaded", loadCommunityHub);
