// P5-E.9F.2 — Entity SSG SEO technical fixtures (local fetch + DOMParser only).

(function () {
  var FIXTURE_PATH = "/qa/fixtures/entity-ssg-fixtures.json";
  var SITEMAP_PATH = "/qa/entity-ssg-sitemap.fixture.xml";
  var NOT_FOUND_PATH = "/wiki/post/_ssg-not-found/";
  var SAMPLE_PATHS = [
    "/wiki/post/ember-salamander/",
    "/wiki/post/volcanic-heat-charm/",
    "/wiki/post/cinder-basalt-flats/",
    "/wiki/post/ashwind-harbor/",
    "/wiki/post/ironroot-shard/",
    "/wiki/post/explorers-league-hall/",
  ];

  var FORBIDDEN = [
    "BLMETA",
    "search_text",
    "search_vector",
    "service_role",
    "SUPABASE_SERVICE_ROLE",
    "Loading post",
    "qa-ssg",
    "prototype fixture",
    "test fixture",
    "p5-e9e",
  ];

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

  function metaContent(doc, selector) {
    var el = doc.querySelector(selector);
    return el ? String(el.getAttribute("content") || el.getAttribute("href") || "").trim() : "";
  }

  function runEntityChecks(slug, title, html, sitemapXml) {
    var results = [];
    var doc = parseDoc(html);
    var lower = html.toLowerCase();

    results.push(record(slug + " — page loads", html.length > 200, "bytes=" + html.length));
    results.push(record(slug + " — title present", !!doc.querySelector("title") && doc.title.indexOf(title) !== -1, doc.title));
    results.push(record(slug + " — description meta", metaContent(doc, 'meta[name="description"]') !== "", metaContent(doc, 'meta[name="description"]')));
    results.push(record(slug + " — canonical", metaContent(doc, 'link[rel="canonical"]') !== "", metaContent(doc, 'link[rel="canonical"]')));
    results.push(record(slug + " — og:title", metaContent(doc, 'meta[property="og:title"]') !== "", ""));
    results.push(record(slug + " — og:description", metaContent(doc, 'meta[property="og:description"]') !== "", ""));
    results.push(record(slug + " — og:url", metaContent(doc, 'meta[property="og:url"]') !== "", ""));
    results.push(record(slug + " — twitter:title", metaContent(doc, 'meta[name="twitter:title"]') !== "", ""));
    results.push(record(slug + " — twitter:description", metaContent(doc, 'meta[name="twitter:description"]') !== "", ""));
    results.push(record(slug + " — single h1", doc.querySelectorAll("h1").length === 1, String(doc.querySelectorAll("h1").length)));
    results.push(record(slug + " — static body content", (doc.querySelector(".bl-ssg-body") || {}).textContent.length > 40, ""));
    results.push(record(slug + " — prelaunch noindex", metaContent(doc, 'meta[name="robots"]') === "noindex, follow", metaContent(doc, 'meta[name="robots"]')));
    results.push(record(slug + " — in fixture sitemap", sitemapXml.indexOf("/wiki/post/" + slug + "/") !== -1, ""));

    FORBIDDEN.forEach(function (token) {
      results.push(record(slug + " — no leak " + token, lower.indexOf(String(token).toLowerCase()) === -1, token));
    });

    return results;
  }

  async function run() {
    var results = [];
    var fixtureJson = JSON.parse(await fetchText(FIXTURE_PATH));
    var entities = fixtureJson.entities || [];
    var sitemapXml = await fetchText(SITEMAP_PATH);

    results.push(record("Fixture corpus exists", entities.length >= 6, "count=" + entities.length));
    results.push(record("Fixture sitemap exists", sitemapXml.indexOf("<urlset") !== -1, SITEMAP_PATH));

    var slugs = {};
    entities.forEach(function (entity) {
      results.push(record("Slug unique " + entity.canonical_slug, !slugs[entity.canonical_slug], ""));
      slugs[entity.canonical_slug] = true;
      results.push(record("Slug SEO-safe " + entity.canonical_slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entity.canonical_slug), entity.canonical_slug));
    });

    for (var i = 0; i < SAMPLE_PATHS.length; i += 1) {
      var pagePath = SAMPLE_PATHS[i];
      var slug = pagePath.replace("/wiki/post/", "").replace(/\/$/, "");
      var entity = entities.find(function (e) {
        return e.canonical_slug === slug;
      });
      if (!entity) {
        results.push(record(pagePath + " — entity in corpus", false, "missing"));
        continue;
      }
      var html = await fetchText(pagePath);
      results = results.concat(runEntityChecks(slug, entity.title, html, sitemapXml));
    }

    var notFoundHtml = await fetchText(NOT_FOUND_PATH);
    var notFoundDoc = parseDoc(notFoundHtml);
    results.push(record("Not-found page loads", notFoundHtml.length > 100, ""));
    results.push(record("Not-found noindex,nofollow", metaContent(notFoundDoc, 'meta[name="robots"]') === "noindex, nofollow", metaContent(notFoundDoc, 'meta[name="robots"]')));

    var missingPath = "/wiki/post/this-slug-does-not-exist-9f2/";
    var missingRes = await fetch(missingPath, { cache: "no-store" });
    results.push(record("Missing entity not in generated set", missingRes.status === 404 || missingRes.status === 403, "status=" + missingRes.status));

    var pass = results.filter(function (r) {
      return r.pass;
    }).length;
    var fail = results.length - pass;

    return {
      results: results,
      pass: pass,
      fail: fail,
      total: results.length,
      ok: fail === 0,
    };
  }

  function renderSummary(root, summary) {
    var el = document.getElementById("fixtureSummary");
    el.className = "qa-guard-summary " + (summary.ok ? "pass" : "fail");
    el.innerHTML =
      "<strong>" +
      (summary.ok ? "PASS" : "FAIL") +
      "</strong> — " +
      summary.pass +
      "/" +
      summary.total +
      " checks passed";
  }

  function renderTable(root, results) {
    var html =
      '<table class="bl-qa-guard-table"><thead><tr><th>Check</th><th>Result</th><th>Detail</th></tr></thead><tbody>';
    results.forEach(function (r) {
      html +=
        "<tr><td>" +
        r.label +
        '</td><td class="' +
        (r.pass ? "pass-cell" : "fail-cell") +
        '">' +
        (r.pass ? "PASS" : "FAIL") +
        "</td><td>" +
        (r.detail || "") +
        "</td></tr>";
    });
    html += "</tbody></table>";
    root.innerHTML = html;
  }

  run()
    .then(function (summary) {
      renderSummary(document.getElementById("fixtureRoot"), summary);
      renderTable(document.getElementById("fixtureRoot"), summary.results);
      window.__p5EntitySsgSeoTechnicalResult = summary;
    })
    .catch(function (err) {
      var el = document.getElementById("fixtureSummary");
      el.className = "qa-guard-summary fail";
      el.textContent = "FAIL — " + err.message;
    });
})();
