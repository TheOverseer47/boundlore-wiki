// QA-only SEO hub metadata harness (P5-E.9D.2).
// Local fetch + DOMParser only. No Supabase. No Search Console.

(function() {
  var HUB_PAGES = [
    { path: "/", label: "homepage" },
    { path: "/wiki/browse/", label: "browse" },
    { path: "/wiki/creatures/", label: "creatures" },
    { path: "/wiki/items/", label: "items" },
    { path: "/wiki/biomes/", label: "biomes" },
    { path: "/wiki/locations/", label: "locations" },
    { path: "/wiki/resources/", label: "resources" },
    { path: "/wiki/guides/", label: "guides" },
    { path: "/wiki/guilds/", label: "guilds" },
    { path: "/wiki/community/", label: "community" },
    { path: "/wiki/news/", label: "news" },
    { path: "/wiki/privacy/", label: "privacy" },
    { path: "/wiki/imprint/", label: "imprint" }
  ];

  var SITEMAP_REQUIRED = [
    "https://boundlore.com/",
    "https://boundlore.com/wiki/browse/",
    "https://boundlore.com/wiki/creatures/",
    "https://boundlore.com/wiki/items/",
    "https://boundlore.com/wiki/biomes/",
    "https://boundlore.com/wiki/locations/",
    "https://boundlore.com/wiki/resources/",
    "https://boundlore.com/wiki/news/",
    "https://boundlore.com/wiki/privacy/",
    "https://boundlore.com/wiki/imprint/",
    "https://boundlore.com/wiki/community/"
  ];

  var SITEMAP_FORBIDDEN = [
    "/wiki/admin/",
    "/public/admin/",
    "/qa/",
    "/wiki/create-post/",
    "/wiki/edit-post/",
    "/wiki/search/",
    "/wiki/login/",
    "/wiki/register/",
    "/wiki/account/",
    "/wiki/reset-password/"
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

  function parseDoc(html) {
    return new DOMParser().parseFromString(html, "text/html");
  }

  function getRobotsMeta(doc) {
    return Array.prototype.map.call(
      doc.querySelectorAll('meta[name="robots"]'),
      function(el) { return String(el.getAttribute("content") || "").toLowerCase(); }
    );
  }

  function isNotNoindex(robotsList) {
    if (!robotsList.length) return true;
    return robotsList.every(function(c) { return c.indexOf("noindex") === -1; });
  }

  async function runFixtureTests() {
    var results = [];

    for (var i = 0; i < HUB_PAGES.length; i += 1) {
      var hub = HUB_PAGES[i];
      var html = await fetchText(hub.path);
      var doc = parseDoc(html);
      var title = doc.querySelector("title");
      var desc = doc.querySelector('meta[name="description"]');
      var canonicals = doc.querySelectorAll('link[rel="canonical"]');
      var robots = getRobotsMeta(doc);
      var ogTitle = doc.querySelector('meta[property="og:title"]');
      var ogDesc = doc.querySelector('meta[property="og:description"]');
      var ogType = doc.querySelector('meta[property="og:type"]');
      var twCard = doc.querySelector('meta[name="twitter:card"]');
      var twTitle = doc.querySelector('meta[name="twitter:title"]');
      var twDesc = doc.querySelector('meta[name="twitter:description"]');

      results.push(record(
        hub.label + " has title",
        !!(title && title.textContent.trim()),
        title ? title.textContent.trim() : "missing"
      ));
      results.push(record(
        hub.label + " has description",
        !!(desc && desc.getAttribute("content")),
        desc ? desc.getAttribute("content").slice(0, 80) : "missing"
      ));
      results.push(record(
        hub.label + " is not noindex",
        isNotNoindex(robots),
        robots.join(" | ") || "no robots meta"
      ));
      results.push(record(
        hub.label + " has single canonical",
        canonicals.length <= 1,
        "count=" + canonicals.length
      ));
      if (hub.path !== "/") {
        results.push(record(
          hub.label + " has canonical link",
          canonicals.length === 1,
          canonicals[0] ? canonicals[0].getAttribute("href") : "missing"
        ));
        results.push(record(
          hub.label + " has OG/Twitter basics",
          !!(ogTitle && ogDesc && ogType && twCard && twTitle && twDesc),
          "og=" + !!ogTitle + " tw=" + !!twCard
        ));
      }
    }

    var homeHtml = await fetchText("/");
    results.push(record(
      "homepage JSON-LD present",
      homeHtml.indexOf('application/ld+json') !== -1 && homeHtml.indexOf('"WebSite"') !== -1,
      "WebSite schema"
    ));

    var postHtml = await fetchText("/wiki/post/");
    var postDoc = parseDoc(postHtml);
    var postRobots = getRobotsMeta(postDoc);
    results.push(record(
      "post detail CSR not marked SEO-closed",
      isNotNoindex(postRobots) && postHtml.indexOf("Loading") !== -1,
      "CSR shell; S-05 remains OPEN"
    ));

    var sitemapXml = await fetchText("/sitemap.xml");
    SITEMAP_REQUIRED.forEach(function(url) {
      results.push(record(
        "sitemap includes " + url.replace("https://boundlore.com", ""),
        sitemapXml.indexOf("<loc>" + url + "</loc>") !== -1,
        "present"
      ));
    });
    SITEMAP_FORBIDDEN.forEach(function(path) {
      results.push(record(
        "sitemap excludes " + path,
        sitemapXml.indexOf("<loc>https://boundlore.com" + path) === -1,
        "absent"
      ));
    });

    var robotsTxt = await fetchText("/robots.txt");
    results.push(record(
      "robots.txt retains Sitemap entry",
      /Sitemap:\s*https:\/\/boundlore\.com\/sitemap\.xml/i.test(robotsTxt),
      "ok"
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
