// QA-only SEO static hardening harness (P5-E.9D.1).
// Local fetch + DOMParser only. No Supabase. No Search Console.

(function() {
  var DISALLOW_PATHS = [
    "/wiki/admin/",
    "/public/admin/",
    "/qa/",
    "/wiki/create-post/",
    "/wiki/edit-post/",
    "/wiki/search/",
    "/wiki/login/",
    "/wiki/register/",
    "/wiki/account/"
  ];

  var NOINDEX_PAGES = [
    { path: "/wiki/admin/", label: "admin" },
    { path: "/public/admin/", label: "public admin" },
    { path: "/wiki/create-post/", label: "create-post" },
    { path: "/wiki/edit-post/", label: "edit-post" },
    { path: "/wiki/search/", label: "search" },
    { path: "/wiki/login/", label: "login" },
    { path: "/wiki/register/", label: "register" },
    { path: "/wiki/account/", label: "account" }
  ];

  var INDEXABLE_PAGES = [
    { path: "/", label: "homepage" },
    { path: "/wiki/browse/", label: "browse hub" },
    { path: "/wiki/privacy/", label: "privacy" },
    { path: "/wiki/imprint/", label: "imprint" }
  ];

  function escapeText(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function record(label, pass, detail) {
    return { label: label, pass: !!pass, detail: detail || "" };
  }

  async function fetchText(path) {
    var res = await fetch(path, { cache: "no-store" });
    if (!res.ok) throw new Error(path + " HTTP " + res.status);
    return res.text();
  }

  function parseRobotsMeta(html) {
    var doc = new DOMParser().parseFromString(html, "text/html");
    var metas = doc.querySelectorAll('meta[name="robots"]');
    return Array.prototype.map.call(metas, function(el) {
      return String(el.getAttribute("content") || "").toLowerCase();
    });
  }

  function hasNoindex(contentList) {
    return contentList.some(function(c) { return c.indexOf("noindex") !== -1; });
  }

  function isNotNoindex(contentList) {
    if (!contentList.length) return true;
    return contentList.every(function(c) {
      return c.indexOf("noindex") === -1;
    });
  }

  async function runFixtureTests() {
    var results = [];

    var robotsText = await fetchText("/robots.txt");
    DISALLOW_PATHS.forEach(function(path) {
      var needle = "Disallow: " + path;
      results.push(record(
        "robots.txt disallows " + path,
        robotsText.indexOf(needle) !== -1,
        robotsText.indexOf(needle) !== -1 ? "found" : "missing"
      ));
    });

    results.push(record(
      "robots.txt retains Sitemap entry",
      /Sitemap:\s*https:\/\/boundlore\.com\/sitemap\.xml/i.test(robotsText),
      robotsText.match(/Sitemap:.*/i) ? robotsText.match(/Sitemap:.*/i)[0].trim() : "missing"
    ));

    results.push(record(
      "robots.txt still allows public content (Allow: /)",
      robotsText.indexOf("Allow: /") !== -1,
      "Allow: / present"
    ));

    for (var i = 0; i < NOINDEX_PAGES.length; i += 1) {
      var page = NOINDEX_PAGES[i];
      var html = await fetchText(page.path);
      var robotsMeta = parseRobotsMeta(html);
      results.push(record(
        page.label + " has noindex meta",
        hasNoindex(robotsMeta),
        robotsMeta.join(" | ") || "none"
      ));
      results.push(record(
        page.label + " has single robots meta tag",
        robotsMeta.length === 1,
        "count=" + robotsMeta.length
      ));
    }

    var qaHtml = await fetchText("/qa/p5-sanitization-security-fixtures.html");
    var qaRobots = parseRobotsMeta(qaHtml);
    results.push(record(
      "QA fixture page has noindex",
      hasNoindex(qaRobots),
      qaRobots.join(" | ") || "none"
    ));

    for (var j = 0; j < INDEXABLE_PAGES.length; j += 1) {
      var indexPage = INDEXABLE_PAGES[j];
      var indexHtml = await fetchText(indexPage.path);
      var indexRobots = parseRobotsMeta(indexHtml);
      results.push(record(
        indexPage.label + " is not noindex",
        isNotNoindex(indexRobots),
        indexRobots.length ? indexRobots.join(" | ") : "no robots meta (ok)"
      ));
    }

    var postHtml = await fetchText("/wiki/post/");
    var postRobots = parseRobotsMeta(postHtml);
    results.push(record(
      "post detail shell not forced noindex (deferred to 9D.3)",
      !hasNoindex(postRobots),
      postRobots.length ? postRobots.join(" | ") : "no robots meta"
    ));

    renderResults(results);
  }

  function renderResults(results) {
    var root = document.getElementById("fixtureRoot");
    var summary = document.getElementById("fixtureSummary");
    if (!root || !summary) return;

    var passCount = results.filter(function(r) { return r.pass; }).length;
    var allPass = passCount === results.length;

    summary.className = "qa-guard-summary " + (allPass ? "pass" : "fail");
    summary.innerHTML =
      "<strong>Result: <span class=\"" + (allPass ? "qa-guard-status-pass" : "qa-guard-status-fail") + "\">" +
      (allPass ? "PASS" : "FAIL") + "</span></strong> — " +
      passCount + "/" + results.length + " checks passed.";

    var html = "<table class=\"bl-qa-guard-table\" style=\"width:100%;border-collapse:collapse;\">" +
      "<thead><tr><th style=\"text-align:left;padding:8px;\">#</th>" +
      "<th style=\"text-align:left;padding:8px;\">Check</th>" +
      "<th style=\"text-align:left;padding:8px;\">Result</th>" +
      "<th style=\"text-align:left;padding:8px;\">Detail</th></tr></thead><tbody>";

    results.forEach(function(row, idx) {
      html += "<tr>" +
        "<td style=\"padding:8px;border-top:1px solid #2a3544;\">" + (idx + 1) + "</td>" +
        "<td style=\"padding:8px;border-top:1px solid #2a3544;\">" + escapeText(row.label) + "</td>" +
        "<td class=\"" + (row.pass ? "pass-cell" : "fail-cell") + "\" style=\"padding:8px;border-top:1px solid #2a3544;\">" +
        (row.pass ? "PASS" : "FAIL") + "</td>" +
        "<td style=\"padding:8px;border-top:1px solid #2a3544;font-size:0.85rem;color:#b8c5d4;\">" +
        escapeText(row.detail) + "</td></tr>";
    });

    html += "</tbody></table>";
    root.innerHTML = html;
  }

  runFixtureTests().catch(function(err) {
    var summary = document.getElementById("fixtureSummary");
    if (summary) {
      summary.className = "qa-guard-summary fail";
      summary.textContent = "Fixture runner failed: " + String(err && err.message ? err.message : err);
    }
  });
})();
