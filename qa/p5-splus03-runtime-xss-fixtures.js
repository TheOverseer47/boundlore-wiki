// QA-only S+-03 runtime XSS mocked evidence (P5-E.9A.1).
// Replicates product-near render pipelines without Supabase, DB, or stored posts.

(function() {
  window.__boundloreXssRuntimeHit = false;

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // post-detail.js helpers are not exported; replicate documented pipeline.
  function stripPostMetaLikePD(html) {
    return String(html || "").replace(/<!--BLMETA\s+[\s\S]*?-->/gi, "").trim();
  }

  function sanitizePostHtmlLikePD(value) {
    var cs = window.BoundLoreContentSafety;
    if (!cs || typeof cs.sanitizeRichTextHtml !== "function") return "";
    return cs.sanitizeRichTextHtml(value);
  }

  function sanitizeContentUrlLikePD(value, options) {
    var cs = window.BoundLoreContentSafety;
    if (!cs || typeof cs.sanitizeContentUrl !== "function") return "";
    return cs.sanitizeContentUrl(value, options || {});
  }

  function renderPostBodyLikePD(rawHtml) {
    var clean = sanitizePostHtmlLikePD(stripPostMetaLikePD(rawHtml));
    var host = document.createElement("div");
    host.innerHTML = clean || "";
    return { clean: clean, host: host };
  }

  function escapeHtmlLikeSearch(str) {
    var div = document.createElement("div");
    div.textContent = str == null ? "" : String(str);
    return div.innerHTML;
  }

  function escapeHtmlLikeRP(str) {
    return escapeHtmlLikeSearch(str);
  }

  function renderCardExcerptLikeRP(contentHtml) {
    var plainText = String(contentHtml || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim().slice(0, 200);
    return escapeHtmlLikeRP(plainText);
  }

  function sanitizeNotificationHrefLike(value) {
    var safety = window.BoundLoreNotificationUrlSafety;
    if (!safety || typeof safety.sanitizeNotificationTargetUrl !== "function") return "#";
    return safety.sanitizeNotificationTargetUrl(value, { fallback: "#" });
  }

  function containsForbiddenText(value, patterns) {
    var lower = String(value || "").toLowerCase();
    for (var i = 0; i < patterns.length; i++) {
      if (lower.indexOf(String(patterns[i]).toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function domHasUnsafePatterns(root) {
    if (!root) return true;
    if (root.querySelector("script")) return true;
    var nodes = root.querySelectorAll("*");
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      var attrs = el.attributes;
      if (!attrs) continue;
      for (var j = 0; j < attrs.length; j++) {
        var attr = attrs[j];
        if (/^on/i.test(attr.name)) return true;
        if ((attr.name === "href" || attr.name === "src") && /javascript:/i.test(attr.value)) return true;
        if ((attr.name === "href" || attr.name === "src") && /^data:/i.test(attr.value)) return true;
      }
    }
    return false;
  }

  function mountProbeHtml(html) {
    var probe = document.getElementById("runtimeRenderProbe");
    if (!probe) return null;
    probe.hidden = false;
    probe.textContent = "";
    var host = document.createElement("div");
    host.innerHTML = html || "";
    probe.appendChild(host);
    return host;
  }

  function clearProbe() {
    var probe = document.getElementById("runtimeRenderProbe");
    if (!probe) return;
    probe.textContent = "";
    probe.hidden = true;
  }

  function runChecks() {
    try { delete window.supabase; } catch (e) { window.supabase = undefined; }
    window.__boundloreXssRuntimeHit = false;

    var CS = window.BoundLoreContentSafety;
    var NS = window.BoundLoreNotificationUrlSafety;
    var checks = [];
    var id = 0;

    function add(label, pass, detail, category) {
      id += 1;
      checks.push({ id: id, label: label, pass: !!pass, detail: detail || "", category: category || "core" });
    }

    add("BoundLoreContentSafety loaded", !!CS, CS ? CS.CONTENT_SAFETY_VERSION : "missing", "core");
    add("BoundLoreNotificationUrlSafety loaded", !!NS, NS ? NS.NOTIFICATION_URL_SAFETY_VERSION : "missing", "core");
    add("renderAvatar helper loaded", typeof renderAvatar === "function", typeof renderAvatar, "core");
    add("no supabase client", typeof window.supabase === "undefined", "undefined", "meta");

    var unsafeBodies = [
      { label: "script tag removed", input: "<script>window.__boundloreXssRuntimeHit=true</script><p>x</p>", forbidden: ["<script", "__boundloreXssRuntimeHit"] },
      { label: "img onerror removed", input: '<p>z</p><img src=x onerror="window.__boundloreXssRuntimeHit=true">', forbidden: ["onerror", "__boundloreXssRuntimeHit"] },
      { label: "svg onload removed", input: '<svg onload="window.__boundloreXssRuntimeHit=true">x</svg>', forbidden: ["<svg", "onload"] },
      { label: "button onclick removed", input: '<button onclick="window.__boundloreXssRuntimeHit=true">x</button>', forbidden: ["onclick", "<button"] },
      { label: "javascript href blocked in body", input: '<a href="javascript:window.__boundloreXssRuntimeHit=true">x</a>', forbidden: ["javascript:"] },
      { label: "data img src blocked", input: '<img src="data:image/svg+xml,<svg onload=alert(1)>">', forbidden: ["data:"] },
    ];

    unsafeBodies.forEach(function(testCase) {
      window.__boundloreXssRuntimeHit = false;
      var rendered = renderPostBodyLikePD(testCase.input);
      var pass = !containsForbiddenText(rendered.clean, testCase.forbidden)
        && !domHasUnsafePatterns(rendered.host)
        && window.__boundloreXssRuntimeHit === false;
      add("post body: " + testCase.label, pass, rendered.clean.slice(0, 120), "post-body");
    });

    var safeBody = '<p><strong>Bold</strong> <em>Em</em></p><ul><li>One</li></ul><a href="https://example.com">link</a>';
    window.__boundloreXssRuntimeHit = false;
    var safeRendered = renderPostBodyLikePD(safeBody);
    add("post body: safe formatting preserved", safeRendered.clean.indexOf("<strong>") !== -1 && safeRendered.clean.indexOf("<ul>") !== -1,
      safeRendered.clean.slice(0, 120), "post-body");

    var blmetaPayload = '<!--BLMETA {"source_url":"javascript:alert(1)","note":"<script>bad</script>"} -->' +
      '<p>Visible</p><img src=x onerror="window.__boundloreXssRuntimeHit=true">';
    window.__boundloreXssRuntimeHit = false;
    var blmetaRendered = renderPostBodyLikePD(blmetaPayload);
    var blmetaPass = blmetaRendered.clean.indexOf("BLMETA") === -1
      && blmetaRendered.clean.indexOf("Visible") !== -1
      && !domHasUnsafePatterns(blmetaRendered.host)
      && window.__boundloreXssRuntimeHit === false;
    add("BLMETA stripped and body sanitized", blmetaPass, blmetaRendered.clean, "blmeta");

    var metaSource = sanitizeContentUrlLikePD("javascript:window.__boundloreXssRuntimeHit=true", { allowRelative: false });
    add("source_url javascript blocked", !metaSource || metaSource.indexOf("javascript:") === -1, metaSource || "(empty)", "url");

    var safeSource = sanitizeContentUrlLikePD("https://example.com/source", { allowRelative: false });
    add("source_url https allowed", safeSource.indexOf("https://example.com") !== -1, safeSource, "url");

    var avatarBad = renderAvatar({ username: "Test", avatar_url: "javascript:alert(1)" }, "bl-avatar-sm");
    add("avatar javascript src blocked", avatarBad.indexOf("javascript:") === -1 && avatarBad.indexOf("<img") === -1,
      avatarBad.slice(0, 80), "url");

    var avatarGood = renderAvatar({ username: "Test", avatar_url: "https://example.com/a.png" }, "bl-avatar-sm");
    add("avatar https src allowed", avatarGood.indexOf("https://example.com/a.png") !== -1, avatarGood.slice(0, 100), "url");

    var notifyBad = sanitizeNotificationHrefLike("javascript:window.__boundloreXssRuntimeHit=true");
    add("notification javascript blocked", notifyBad === "#" || notifyBad.indexOf("javascript:") === -1, notifyBad, "url");

    var notifyGood = sanitizeNotificationHrefLike("/wiki/post/?slug=qa-test");
    add("notification relative allowed", notifyGood.indexOf("/wiki/post/") !== -1, notifyGood, "url");

    var notifyData = sanitizeNotificationHrefLike("data:text/html,<script>alert(1)</script>");
    add("notification data blocked", notifyData === "#" || notifyData.indexOf("data:") === -1, notifyData, "url");

    var xssQuery = '<img src=x onerror=window.__boundloreXssRuntimeHit=true>';
    var escapedQuery = escapeHtmlLikeSearch(xssQuery);
    var searchHtml = '<div class="search-empty">No results found for "' + escapedQuery + '"</div>';
    var searchHost = mountProbeHtml(searchHtml);
    var searchPass = escapedQuery.indexOf("<img") === -1
      && !domHasUnsafePatterns(searchHost)
      && window.__boundloreXssRuntimeHit === false;
    add("search reflected output escaped", searchPass, escapedQuery.slice(0, 80), "search");
    clearProbe();

    var cardExcerpt = renderCardExcerptLikeRP('<p>Hello</p><script>alert(1)</script><img onerror=alert(1) src=x>');
    var cardHost = mountProbeHtml('<p class="bl-guide-card-summary">' + cardExcerpt + '</p>');
    var cardPass = cardExcerpt.indexOf("<script") === -1
      && cardExcerpt.indexOf("onerror") === -1
      && cardExcerpt.indexOf("Hello") !== -1
      && !domHasUnsafePatterns(cardHost);
    add("card excerpt tag-strip + escape", cardPass, cardExcerpt.slice(0, 80), "card");
    clearProbe();

    window.__boundloreXssRuntimeHit = false;
    var finalBody = renderPostBodyLikePD('<iframe src="https://evil.example"></iframe><p end</p>');
    add("post body: iframe removed", !containsForbiddenText(finalBody.clean, ["<iframe"]), finalBody.clean, "post-body");

    add("XSS runtime flag remains false", window.__boundloreXssRuntimeHit === false, String(window.__boundloreXssRuntimeHit), "meta");
    add("no DB writes in fixture", true, "mock only", "meta");
    add("no storage calls in fixture", true, "mock only", "meta");

    var passCount = checks.filter(function(c) { return c.pass; }).length;
    var failCount = checks.length - passCount;

    return {
      ok: failCount === 0,
      allPass: failCount === 0,
      passCount: passCount,
      failCount: failCount,
      results: checks,
      xssRuntimeFlag: window.__boundloreXssRuntimeHit,
      xssRuntimeSafe: window.__boundloreXssRuntimeHit === false,
    };
  }

  function renderResults(report) {
    var summary = document.getElementById("fixtureSummary");
    var root = document.getElementById("fixtureRoot");
    if (!root) return;

    if (report.error) {
      summary.className = "qa-guard-summary fail";
      summary.innerHTML = '<p class="qa-guard-status-fail">FAIL — ' + escapeText(report.error) + "</p>";
      window.__P5Splus03RuntimeXssFixtures = { ok: false, allPass: false, failCount: 1, results: [] };
      return;
    }

    summary.className = "qa-guard-summary " + (report.ok ? "pass" : "fail");
    summary.innerHTML =
      '<p class="' + (report.ok ? "qa-guard-status-pass" : "qa-guard-status-fail") + '">' +
      (report.ok ? "PASS" : "FAIL") + " — " + report.passCount + "/" + report.results.length +
      " checks passed. Local/mocked S+-03 runtime evidence. Staging stored payloads still required for full closure.</p>" +
      '<p>__boundloreXssRuntimeHit: ' + escapeText(String(report.xssRuntimeFlag)) +
      (report.xssRuntimeSafe ? " (safe)" : " (UNSAFE)") + "</p>";

    var rows = report.results.map(function(item) {
      return "<tr><td>" + item.id + "</td><td>" + escapeText(item.label) + "</td><td class=\"" +
        (item.pass ? "pass-cell" : "fail-cell") + "\">" + (item.pass ? "PASS" : "FAIL") + "</td><td>" +
        escapeText(item.detail) + "</td><td>" + escapeText(item.category) + "</td></tr>";
    }).join("");

    root.innerHTML =
      '<table class="bl-qa-guard-table" style="width:100%;border-collapse:collapse;font-size:0.88rem;">' +
      "<thead><tr><th>#</th><th>Check</th><th>Status</th><th>Detail</th><th>Category</th></tr></thead><tbody>" +
      rows + "</tbody></table>";

    window.__P5Splus03RuntimeXssFixtures = report;
  }

  try {
    renderResults(runChecks());
  } catch (err) {
    renderResults({ error: err && err.message ? err.message : String(err) });
  }
})();
