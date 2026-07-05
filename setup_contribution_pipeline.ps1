# ============================================
# BoundLore - Guide Contribution Pipeline Setup
# Run from project ROOT in PowerShell (VS Code Terminal)
# ============================================

Write-Host "Creating js/categories-config.js..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "js" | Out-Null

@'
// categories-config.js
// SINGLE SOURCE OF TRUTH for all post categories on BoundLore.
const BOUNDLORE_CATEGORIES = [
  { slug: "creatures", label: "Creatures", icon: "\ud83d\udc09", description: "Beasts, monsters, and wildlife of the world." },
  { slug: "biomes", label: "Biomes", icon: "\ud83c\udf0d", description: "Landscapes, climates, and regions." },
  { slug: "items", label: "Items", icon: "\u2694\ufe0f", description: "Weapons, tools, and artifacts." },
  { slug: "guides", label: "Guides", icon: "\ud83d\udcd6", description: "Tips, tutorials, and survival strategies." },
  { slug: "guilds", label: "Guilds", icon: "\ud83d\udee1\ufe0f", description: "Player factions and communities." },
  { slug: "building", label: "Building", icon: "\ud83c\udfd7\ufe0f", description: "Structures, bases, and construction tips." },
  { slug: "dungeons", label: "Dungeons", icon: "\ud83d\udddd\ufe0f", description: "Instances, ruins, and dangerous encounters." },
  { slug: "locations", label: "Locations", icon: "\ud83d\udccd", description: "Notable landmarks and points of interest." },
  { slug: "lore", label: "Lore", icon: "\ud83d\udcdc", description: "Mythology, history, and world background." },
  { slug: "crafting", label: "Crafting", icon: "\ud83d\udd28", description: "Recipes, materials, and item creation." }
];

const DISCOVERY_TAG = {
  slug: "discovery",
  label: "Discovery",
  icon: "\u2728",
  description: "Newly found, unverified, or rare finds shared by the community."
};

function getCategoryBySlug(slug) {
  return BOUNDLORE_CATEGORIES.find(function(c) { return c.slug === slug; }) || null;
}

function populateCategorySelect(selectElement, includeAllOption) {
  selectElement.innerHTML = "";
  if (includeAllOption) {
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "All Categories";
    selectElement.appendChild(allOpt);
  }
  BOUNDLORE_CATEGORIES.forEach(function(cat) {
    const opt = document.createElement("option");
    opt.value = cat.slug;
    opt.textContent = cat.icon + " " + cat.label;
    selectElement.appendChild(opt);
  });
}
'@ | Set-Content -Path "js/categories-config.js" -Encoding UTF8

Write-Host "Creating wiki/create-post/index.html..." -ForegroundColor Cyan
New-Item -ItemType Directory -Force -Path "wiki/create-post" | Out-Null

@'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Submit a new guide, creature, or discovery to BoundLore." />
<title>Create Post - BoundLore</title>
<link rel="icon" type="image/jpeg" href="/public/images/icon.jpg" />
<link rel="stylesheet" href="/css/style.css" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
<link href="https://cdn.quilljs.com/1.3.6/quill.snow.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
</head>
<body>
<nav class="navbar" id="navbar">
  <div class="nav-container">
    <a href="/" class="nav-logo">
      <img src="/public/images/icon.jpg" alt="BoundLore" class="nav-icon" />
      <span class="logo-text">Bound<span class="accent">Lore</span></span>
    </a>
    <ul class="nav-links" id="navLinks">
      <li><a href="/">Home</a></li>
      <li><a href="/wiki/creatures/">Creatures</a></li>
      <li><a href="/wiki/biomes/">Biomes</a></li>
      <li><a href="/wiki/items/">Items</a></li>
      <li><a href="/wiki/guides/">Guides</a></li>
      <li><a href="/wiki/guilds/">Guilds</a></li>
      <li><a href="/wiki/community/">Community</a></li>
      <li><a href="/wiki/news/">News</a></li>
    </ul>
    <div class="nav-right">
      <span id="authArea"></span>
      <button class="hamburger" id="hamburger"><span></span><span></span><span></span></button>
    </div>
  </div>
</nav>

<div class="wiki-hero">
  <p class="breadcrumb"><a href="/">Home</a> &rsaquo; Create Post</p>
  <h1>Share Your Knowledge</h1>
  <p>Contribute a guide, creature entry, or new discovery to the BoundLore wiki</p>
</div>

<div class="contribute-layout" id="gateBox" style="max-width:800px;margin:0 auto;padding:0 20px 60px;">
  <div class="form-box"><p style="text-align:center;">Checking login status...</p></div>
</div>

<div class="contribute-layout" id="loginRequiredBox" style="display:none;max-width:800px;margin:0 auto;padding:0 20px 60px;">
  <div class="form-box" style="text-align:center;">
    <h2>Login Required</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;">You need an account to submit content to BoundLore.</p>
    <a href="/wiki/login/" class="btn-contribute" style="display:inline-block;">Log In / Sign Up</a>
  </div>
</div>

<div id="createPostForm" style="display:none;max-width:800px;margin:0 auto;padding:0 20px 60px;">
  <form id="postForm" class="form-box">

    <label for="postTitle">Title</label>
    <input type="text" id="postTitle" required minlength="3" maxlength="200" placeholder="e.g. Where to find Frostback Wyrms" />

    <label for="postCategory" style="margin-top:16px;display:block;">Category</label>
    <select id="postCategory" required style="width:100%;padding:10px;border-radius:6px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.15);color:var(--text-primary);margin-bottom:16px;"></select>

    <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;cursor:pointer;">
      <input type="checkbox" id="postIsDiscovery" style="width:auto;" />
      <span>✨ Mark as a Discovery (new / unverified find)</span>
    </label>

    <label for="editor-container">Content</label>
    <div id="editor-container" style="background:#fff;color:#111;border-radius:6px;min-height:300px;margin-bottom:20px;"></div>

    <button type="submit" id="submitBtn" class="form-submit">Submit for Review</button>
    <p style="color:var(--text-muted);font-size:0.85rem;margin-top:10px;">Your post will be reviewed by a moderator before it appears publicly.</p>
  </form>
</div>

<footer class="footer"><div class="footer-bottom"><p>&copy; 2026 BoundLore Community &middot; <a href="/wiki/imprint/">Imprint</a> &middot; <a href="/wiki/privacy/">Privacy Policy</a></p></div></footer>

<script src="https://cdn.quilljs.com/1.3.6/quill.js"></script>
<script src="/js/supabase-config.js"></script>
<script src="/js/categories-config.js"></script>
<script src="/js/auth-nav.js"></script>
<script src="/js/main.js"></script>
<script>
let currentUser = null;
let quill = null;

async function initCreatePost() {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  currentUser = sessionData.session ? sessionData.session.user : null;

  document.getElementById("gateBox").style.display = "none";

  if (!currentUser) {
    document.getElementById("loginRequiredBox").style.display = "block";
    return;
  }

  document.getElementById("createPostForm").style.display = "block";

  const select = document.getElementById("postCategory");
  populateCategorySelect(select, false);

  quill = new Quill("#editor-container", {
    theme: "snow",
    modules: {
      toolbar: [
        [{ header: [2, 3, false] }],
        ["bold", "italic", "underline", "blockquote"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link", "image"],
        ["clean"]
      ]
    }
  });

  document.getElementById("postForm").addEventListener("submit", handleSubmit);
}

async function handleSubmit(e) {
  e.preventDefault();

  const title = document.getElementById("postTitle").value.trim();
  const category = document.getElementById("postCategory").value;
  const isDiscovery = document.getElementById("postIsDiscovery").checked;
  const content = quill.root.innerHTML;
  const plainText = quill.getText().trim();

  if (!title || !category || plainText.length < 20) {
    alert("Please add a title, category, and at least a short description (20+ characters).");
    return;
  }

  const btn = document.getElementById("submitBtn");
  btn.disabled = true;
  btn.textContent = "Submitting...";

  const { error } = await supabaseClient.from("posts").insert({
    title: title,
    category: category,
    content: content,
    is_discovery: isDiscovery,
    status: "pending",
    author_id: currentUser.id
  });

  if (error) {
    alert("Something went wrong: " + error.message);
    btn.disabled = false;
    btn.textContent = "Submit for Review";
    return;
  }

  alert("Thank you! Your post has been submitted and is awaiting review.");
  window.location.href = "/wiki/account/";
}

initCreatePost();
</script>
</body>
</html>
'@

Write-Host "All files created successfully." -ForegroundColor Green
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "1. Run the SQL migration in Supabase (provided separately)."
Write-Host "2. Update wiki/admin/index.html select() calls to include is_discovery (see chat)."
Write-Host "3. git add . ; git commit -m 'Add guide contribution pipeline with categories and discovery tag' ; git push"