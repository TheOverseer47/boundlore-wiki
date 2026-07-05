# ============================================
# BoundLore - Guides Page (Dynamic)
# Run from project ROOT in PowerShell
# ============================================

Write-Host "Rebuilding wiki/guides/index.html with dynamic post list..." -ForegroundColor Cyan

@'
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="Community-written guides for Light No Fire on BoundLore." />
<title>Guides - BoundLore</title>
<link rel="icon" type="image/jpeg" href="/public/images/icon.jpg" />
<link rel="stylesheet" href="/css/style.css" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@300;400;600&display=swap" rel="stylesheet" />
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
  <p class="breadcrumb"><a href="/">Home</a> &rsaquo; Guides</p>
  <h1>📖 Guides</h1>
  <p>Community-written tips, tutorials and survival strategies for Light No Fire</p>
</div>

<div style="max-width:1000px;margin:0 auto;padding:40px 20px;">

  <div id="categoryPostsList"></div>
  <p id="categoryPostsEmpty" style="text-align:center;color:var(--text-muted);display:none;padding:40px 0;">
    No guides published yet. Be the first to contribute!
  </p>

  <div class="form-box" style="text-align:center;margin-top:40px;background:linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,140,0,0.05));">
    <h2>Write a Guide</h2>
    <p style="color:var(--text-muted);margin-bottom:20px;">Discovered something useful? Submit it and it will be reviewed and published here.</p>
    <a href="/wiki/create-post/" class="btn-contribute" style="display:inline-block;">✏ Submit a Guide</a>
  </div>

</div>

<footer class="footer"><div class="footer-bottom"><p>&copy; 2026 BoundLore Community &middot; <a href="/wiki/imprint/">Imprint</a> &middot; <a href="/wiki/privacy/">Privacy Policy</a></p></div></footer>

<script src="/js/supabase-config.js"></script>
<script src="/js/categories-config.js"></script>
<script src="/js/auth-nav.js"></script>
<script src="/js/render-posts.js"></script>
<script src="/js/main.js"></script>
<script>
renderCategoryPosts("guides");
</script>
</body>
</html>
'@ | Set-Content -Path "wiki/guides/index.html" -Encoding UTF8

Write-Host "Done." -ForegroundColor Green
