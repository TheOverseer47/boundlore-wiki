// QA-only HTML sanitization harness (P5-D.1).
// No Supabase, no fetch/write, no admin/create/edit flows.

(function() {
  var SAFE_HTML_CASES = [
    { id: 1, label: "paragraph", input: "<p>Hello world</p>", expectContains: "Hello world" },
    { id: 2, label: "bold/em", input: "<strong>Bold</strong><em>Em</em>", expectContains: "Bold" },
    { id: 3, label: "unordered list", input: "<ul><li>One</li><li>Two</li></ul>", expectContains: "<ul>" },
    { id: 4, label: "ordered list", input: "<ol><li>One</li></ol>", expectContains: "<ol>" },
    { id: 5, label: "blockquote", input: "<blockquote>Quote</blockquote>", expectContains: "Quote" },
    { id: 6, label: "pre/code", input: "<pre><code>const x = 1;</code></pre>", expectContains: "const x = 1;" },
    { id: 7, label: "headings", input: "<h2>Heading</h2><h3>Sub</h3><h4>Small</h4>", expectContains: "<h2>" },
    { id: 8, label: "https link", input: '<a href="https://example.com">safe</a>', expectContains: "safe" },
    { id: 9, label: "internal link", input: '<a href="/wiki/post/?slug=qa-ogre-mage-1103f2">internal</a>', expectContains: "internal" },
    { id: 10, label: "image", input: '<img src="https://example.com/image.png" alt="x">', expectContains: "example.com/image.png" },
  ];

  var UNSAFE_HTML_CASES = [
    { id: 11, label: "script tag", input: "<script>alert(1)</script>", forbidden: ["<script", "alert(1)"] },
    { id: 12, label: "img onerror", input: "<img src=x onerror=alert(1)>", forbidden: ["onerror", "alert"] },
    { id: 13, label: "svg onload", input: "<svg onload=alert(1)>x</svg>", forbidden: ["<svg", "onload"] },
    { id: 14, label: "iframe", input: '<iframe src="https://evil.example"></iframe>', forbidden: ["<iframe"] },
    { id: 15, label: "object", input: '<object data="x"></object>', forbidden: ["<object"] },
    { id: 16, label: "embed", input: "<embed src=\"x\">", forbidden: ["<embed"] },
    { id: 17, label: "form input", input: "<form><input name=x></form>", forbidden: ["<form", "<input"] },
    { id: 18, label: "button onclick", input: "<button onclick=alert(1)>click</button>", forbidden: ["<button", "onclick"] },
    { id: 19, label: "p onclick", input: "<p onclick=alert(1)>click</p>", forbidden: ["onclick"] },
    { id: 20, label: "a onclick", input: '<a onclick=alert(1) href="/wiki/">x</a>', forbidden: ["onclick"] },
    { id: 21, label: "div style url", input: '<div style="background:url(javascript:alert(1))">x</div>', forbidden: ["style=", "javascript:"] },
    { id: 22, label: "math xlink", input: '<math><mi xlink:href="javascript:alert(1)">x</mi></math>', forbidden: ["<math", "xlink:href"] },
    { id: 23, label: "base href", input: '<base href="https://evil.example/">', forbidden: ["<base"] },
    { id: 24, label: "meta refresh", input: '<meta http-equiv="refresh" content="0;url=https://evil.example">', forbidden: ["<meta"] },
    { id: 25, label: "link stylesheet", input: '<link rel="stylesheet" href="https://evil.example/x.css">', forbidden: ["<link"] },
  ];

  var UNSAFE_URL_CASES = [
    { id: 26, label: "javascript href", input: '<a href="javascript:alert(1)">x</a>', forbidden: ["javascript:"] },
    { id: 27, label: "mixed-case javascript", input: '<a href="JaVaScRiPt:alert(1)">x</a>', forbidden: ["javascript:"] },
    { id: 28, label: "data href", input: '<a href="data:text/html,<script>alert(1)</script>">x</a>', forbidden: ["data:"] },
    { id: 29, label: "vbscript href", input: '<a href="vbscript:msgbox(1)">x</a>', forbidden: ["vbscript:"] },
    { id: 30, label: "file href", input: '<a href="file:///etc/passwd">x</a>', forbidden: ["file:"] },
    { id: 31, label: "blob href", input: '<a href="blob:https://evil.example/id">x</a>', forbidden: ["blob:"] },
    { id: 32, label: "ftp href", input: '<a href="ftp://evil.example/file">x</a>', forbidden: ["ftp:"] },
    { id: 33, label: "protocol-relative href", input: '<a href="//evil.example/path">x</a>', forbidden: ["//evil.example"] },
    { id: 34, label: "backslash href", input: '<a href="http:\\evil.example">x</a>', forbidden: ["evil.example"] },
    { id: 35, label: "newline javascript", input: '<a href="java\nscript:alert(1)">x</a>', forbidden: ["javascript:"] },
    { id: 36, label: "javascript img src", input: '<img src="javascript:alert(1)">', forbidden: ["javascript:"] },
    { id: 37, label: "svg data img src", input: '<img src="data:image/svg+xml,<svg onload=alert(1)>">', forbidden: ["data:"] },
  ];

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function containsForbidden(output, patterns) {
    var lower = String(output || "").toLowerCase();
    for (var i = 0; i < patterns.length; i++) {
      if (lower.indexOf(String(patterns[i]).toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function renderProbeHtml(rawHtml) {
    var CS = window.BoundLoreContentSafety;
    var probe = document.getElementById("renderProbe");
    if (!probe || !CS) return "";
    var sanitized = CS.sanitizeRichTextHtml(rawHtml);
    probe.textContent = "";
    var host = document.createElement("div");
    host.innerHTML = sanitized;
    probe.appendChild(host);
    return host.innerHTML;
  }

  function runFixtureTests() {
    var CS = window.BoundLoreContentSafety;
    if (!CS) {
      return { ok: false, error: "BoundLoreContentSafety missing", results: [] };
    }

    var results = [];

    SAFE_HTML_CASES.forEach(function(testCase) {
      var output = CS.sanitizeRichTextHtml(testCase.input);
      var pass = !!output && output.indexOf(testCase.expectContains) !== -1;
      results.push({
        id: testCase.id,
        label: testCase.label,
        category: "safe-html",
        pass: pass,
        detail: output,
      });
    });

    UNSAFE_HTML_CASES.forEach(function(testCase) {
      var output = CS.sanitizeRichTextHtml(testCase.input);
      var rendered = renderProbeHtml(testCase.input);
      var pass = !containsForbidden(output, testCase.forbidden) && !containsForbidden(rendered, testCase.forbidden);
      results.push({
        id: testCase.id,
        label: testCase.label,
        category: "unsafe-html",
        pass: pass,
        detail: output,
      });
    });

    UNSAFE_URL_CASES.forEach(function(testCase) {
      var output = CS.sanitizeRichTextHtml(testCase.input);
      var rendered = renderProbeHtml(testCase.input);
      var pass = !containsForbidden(output, testCase.forbidden) && !containsForbidden(rendered, testCase.forbidden);
      results.push({
        id: testCase.id,
        label: testCase.label,
        category: "unsafe-url",
        pass: pass,
        detail: output,
      });
    });

    var quillSample = "<p><strong>Bold</strong></p><ul><li>Item</li></ul><a href=\"https://example.com\">link</a>";
    var quillOut = CS.sanitizeRichTextHtml(quillSample);

    var metaChecks = [
      {
        id: 38,
        label: "shouldAllowUnsafeHtml false",
        category: "meta",
        pass: CS.shouldAllowUnsafeHtml() === false,
        detail: String(CS.shouldAllowUnsafeHtml()),
      },
      {
        id: 39,
        label: "shouldAllowUnsafeUrl false",
        category: "meta",
        pass: CS.shouldAllowUnsafeUrl() === false,
        detail: String(CS.shouldAllowUnsafeUrl()),
      },
      {
        id: 40,
        label: "no script tags remain",
        category: "meta",
        pass: CS.sanitizeRichTextHtml("<script>alert(1)</script>").indexOf("<script") === -1,
        detail: CS.sanitizeRichTextHtml("<script>alert(1)</script>"),
      },
      {
        id: 41,
        label: "no on* attributes remain",
        category: "meta",
        pass: CS.sanitizeRichTextHtml("<img src=x onerror=alert(1)>").indexOf("onerror") === -1,
        detail: CS.sanitizeRichTextHtml("<img src=x onerror=alert(1)>"),
      },
      {
        id: 42,
        label: "no javascript href/src remains",
        category: "meta",
        pass: CS.sanitizeRichTextHtml('<a href="javascript:alert(1)">x</a>').indexOf("javascript:") === -1,
        detail: CS.sanitizeRichTextHtml('<a href="javascript:alert(1)">x</a>'),
      },
      {
        id: 43,
        label: "no data href/src remains",
        category: "meta",
        pass: CS.sanitizeRichTextHtml('<img src="data:image/svg+xml,x">').indexOf("data:") === -1,
        detail: CS.sanitizeRichTextHtml('<img src="data:image/svg+xml,x">'),
      },
      {
        id: 44,
        label: "safe Quill basics remain",
        category: "meta",
        pass: quillOut.indexOf("<strong>") !== -1 && quillOut.indexOf("<ul>") !== -1,
        detail: quillOut,
      },
      {
        id: 45,
        label: "version p5-d1",
        category: "meta",
        pass: CS.CONTENT_SAFETY_VERSION === "p5-d1",
        detail: CS.CONTENT_SAFETY_VERSION,
      },
    ];

    metaChecks.forEach(function(check) {
      results.push(check);
    });

    return { ok: true, results: results };
  }

  function renderFixtureReport(payload) {
    var root = document.getElementById("fixtureRoot");
    var summary = document.getElementById("fixtureSummary");
    if (!root || !summary) return;

    if (!payload.ok) {
      summary.className = "qa-guard-summary fail";
      summary.innerHTML = '<span class="qa-guard-status-fail">FAIL</span> — ' + escapeText(payload.error || "unknown error");
      return;
    }

    var failCount = payload.results.filter(function(item) { return !item.pass; }).length;
    var allPass = failCount === 0;
    summary.className = "qa-guard-summary " + (allPass ? "pass" : "fail");
    summary.innerHTML = allPass
      ? '<span class="qa-guard-status-pass">PASS</span> — ' + payload.results.length + " checks, failCount 0"
      : '<span class="qa-guard-status-fail">FAIL</span> — failCount ' + failCount + " / " + payload.results.length;

    var html = '<table class="bl-qa-guard-table" style="width:100%;border-collapse:collapse;">';
    html += "<thead><tr><th>#</th><th>Check</th><th>Category</th><th>Status</th><th>Detail</th></tr></thead><tbody>";
    payload.results.forEach(function(item) {
      html += "<tr>";
      html += "<td>" + item.id + "</td>";
      html += "<td>" + escapeText(item.label) + "</td>";
      html += "<td>" + escapeText(item.category || "") + "</td>";
      html += '<td class="' + (item.pass ? "pass-cell" : "fail-cell") + '">' + (item.pass ? "PASS" : "FAIL") + "</td>";
      html += "<td><code>" + escapeText((item.detail || "").slice(0, 180)) + "</code></td>";
      html += "</tr>";
    });
    html += "</tbody></table>";
    root.innerHTML = html;
  }

  var payload = runFixtureTests();
  var failCount = payload.ok ? payload.results.filter(function(item) { return !item.pass; }).length : 1;
  var allPass = payload.ok && failCount === 0;

  window.__P5SanitizationSecurityFixtures = {
    version: "p5-d1",
    allPass: allPass,
    failCount: failCount,
    results: payload.results || [],
    run: runFixtureTests,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function() {
      renderFixtureReport(payload);
    });
  } else {
    renderFixtureReport(payload);
  }
})();
