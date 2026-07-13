// QA-only Entity SSG prototype harness (P5-E.9D.3B / P5-E.9D.3C).
// Local fetch + DOMParser only. No Supabase. No Search Console.

(function() {
  var PROTOTYPES = [
    {
      path: "/wiki/post/qa-ssg-creature-prototype/",
      slug: "qa-ssg-creature-prototype",
      title: "Ember Salamander",
      label: "creature"
    },
    {
      path: "/wiki/post/qa-ssg-item-prototype/",
      slug: "qa-ssg-item-prototype",
      title: "Volcanic Heat Charm",
      label: "item"
    },
    {
      path: "/wiki/post/qa-ssg-biome-prototype/",
      slug: "qa-ssg-biome-prototype",
      title: "Cinder Basalt Flats",
      label: "biome"
    }
  ];

  var SITEMAP_EXCLUDE = [
    "qa-ssg-creature-prototype",
    "qa-ssg-item-prototype",
    "qa-ssg-biome-prototype"
  ];

  var FORBIDDEN_PROVIDER = [
    "supabase",
    "@sentry",
    "googletagmanager",
    "google-analytics",
    "plausible.io",
    "hotjar"
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

  function parseJsonLdBlocks(html) {
    var blocks = [];
    var re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    var m;
    while ((m = re.exec(html)) !== null) {
      try {
        blocks.push(JSON.parse(m[1]));
      } catch (e) {
        blocks.push(null);
      }
    }
    return blocks;
  }

  function hasSchemaType(blocks, typeName) {
    return blocks.some(function(b) {
      if (!b) return false;
      if (b["@type"] === typeName) return true;
      if (Array.isArray(b["@graph"])) {
        return b["@graph"].some(function(n) { return n && n["@type"] === typeName; });
      }
      return false;
    });
  }

  async function checkPrototype(proto, html) {
    var results = [];
    var doc = parseDoc(html);
    var titleEl = doc.querySelector("title");
    var titleText = titleEl ? titleEl.textContent.trim() : "";
    var desc = doc.querySelector('meta[name="description"]');
    var canonical = doc.querySelector('link[rel="canonical"]');
    var robots = doc.querySelector('meta[name="robots"]');
    var ogTitle = doc.querySelector('meta[property="og:title"]');
    var ogDesc = doc.querySelector('meta[property="og:description"]');
    var ogUrl = doc.querySelector('meta[property="og:url"]');
    var twTitle = doc.querySelector('meta[name="twitter:title"]');
    var twDesc = doc.querySelector('meta[name="twitter:description"]');
    var h1s = doc.querySelectorAll("h1");
    var excerpt = doc.querySelector(".bl-ssg-excerpt");
    var body = doc.querySelector(".bl-ssg-body");
    var hydrate = doc.querySelector("[data-bl-ssg-hydrate]");
    var errScript = Array.prototype.some.call(doc.querySelectorAll("script[src]"), function(s) {
      return String(s.getAttribute("src") || "").indexOf("error-reporter") !== -1;
    });
    var jsonBlocks = parseJsonLdBlocks(html);
    var expectedCanonical = "https://boundlore.com/wiki/post/" + proto.slug + "/";
    var lowerHtml = html.toLowerCase();

    results.push(record(proto.label + " fetch OK", true, "200"));
    results.push(record(proto.label + " title entity-specific", titleText.indexOf(proto.title) !== -1 && titleText.indexOf("Post - BoundLore") === -1, titleText));
    results.push(record(proto.label + " description present", !!(desc && desc.getAttribute("content")), desc ? desc.getAttribute("content").slice(0, 60) : "missing"));
    results.push(record(proto.label + " description entity-specific", desc && desc.getAttribute("content").indexOf("QA SSG") !== -1, "ok"));
    results.push(record(proto.label + " canonical matches slug", canonical && canonical.getAttribute("href") === expectedCanonical, canonical ? canonical.getAttribute("href") : "missing"));
    results.push(record(proto.label + " robots index follow", robots && /index/i.test(robots.getAttribute("content") || "") && !/noindex/i.test(robots.getAttribute("content") || ""), robots ? robots.getAttribute("content") : "missing"));
    results.push(record(proto.label + " og:title present", !!ogTitle, ogTitle ? "ok" : "missing"));
    results.push(record(proto.label + " og:description present", !!ogDesc, "ok"));
    results.push(record(proto.label + " og:url present", ogUrl && ogUrl.getAttribute("content") === expectedCanonical, ogUrl ? ogUrl.getAttribute("content") : "missing"));
    results.push(record(proto.label + " twitter:title present", !!twTitle, "ok"));
    results.push(record(proto.label + " twitter:description present", !!twDesc, "ok"));
    results.push(record(proto.label + " exactly one H1", h1s.length === 1, "count=" + h1s.length));
    results.push(record(proto.label + " H1 matches entity title", h1s.length === 1 && h1s[0].textContent.trim() === proto.title, h1s[0] ? h1s[0].textContent.trim() : "missing"));
    results.push(record(proto.label + " excerpt visible", !!(excerpt && excerpt.textContent.trim()), "ok"));
    results.push(record(proto.label + " body visible", !!(body && body.textContent.trim().length > 40), "len=" + (body ? body.textContent.trim().length : 0)));
    results.push(record(proto.label + " no primary Loading post", !/>\s*Loading post\.\.\.\s*</i.test(html) && lowerHtml.indexOf("<p>loading post...</p>") === -1, "ok"));
    results.push(record(proto.label + " no visible BLMETA", lowerHtml.indexOf("<!--blmeta") === -1 && lowerHtml.indexOf("blmeta ") === -1, "ok"));
    results.push(record(proto.label + " JSON-LD parseable", jsonBlocks.length >= 2 && jsonBlocks.every(function(b) { return b !== null; }), "blocks=" + jsonBlocks.length));
    results.push(record(proto.label + " JSON-LD CreativeWork", hasSchemaType(jsonBlocks, "CreativeWork"), "ok"));
    results.push(record(proto.label + " JSON-LD BreadcrumbList", hasSchemaType(jsonBlocks, "BreadcrumbList"), "ok"));
    results.push(record(proto.label + " hydration hook", !!(hydrate && hydrate.getAttribute("data-bl-ssg-hydrate") === "1"), "ok"));
    results.push(record(proto.label + " error-reporter script", errScript, "ok"));
    results.push(record(proto.label + " no noindex", !(robots && /noindex/i.test(robots.getAttribute("content") || "")), "ok"));
    results.push(record(proto.label + " no supabase script", !Array.prototype.some.call(doc.querySelectorAll("script[src]"), function(s) {
      return String(s.getAttribute("src") || "").toLowerCase().indexOf("supabase") !== -1;
    }), "ok"));
    results.push(record(proto.label + " no external provider scripts", !Array.prototype.some.call(doc.querySelectorAll("script[src]"), function(s) {
      var src = String(s.getAttribute("src") || "").toLowerCase();
      return FORBIDDEN_PROVIDER.some(function(p) { return src.indexOf(p) !== -1; });
    }), "ok"));

    results.push(record(proto.label + " generator marker", html.indexOf("build-entity-ssg-fixtures.mjs") !== -1, "ok"));
    results.push(record(proto.label + " data-bl-ssg-source", html.indexOf('data-bl-ssg-source="fixture-generator"') !== -1, "ok"));

    return results;
  }

  async function runFixtureTests() {
    var results = [];

    var fixtureJson = await fetchText("/qa/fixtures/p5-entity-ssg-fixtures.json");
    var fixtureData = JSON.parse(fixtureJson);
    results.push(record("fixture JSON exists", fixtureData && Array.isArray(fixtureData.entities), "entities=" + (fixtureData.entities ? fixtureData.entities.length : 0)));
    results.push(record("fixture has 3 entities", fixtureData.entities && fixtureData.entities.length === 3, "ok"));
    results.push(record("all fixtures published", fixtureData.entities.every(function(e) { return e.status === "published"; }), "ok"));
    results.push(record("all fixtures prototype_fixture origin", fixtureData.entities.every(function(e) { return e.content_origin === "prototype_fixture"; }), "ok"));

    try {
      var genRes = await fetch("/scripts/build-entity-ssg-fixtures.mjs", { cache: "no-store" });
      results.push(record("generator script exists", genRes.ok, "HTTP " + genRes.status));
    } catch (genErr) {
      results.push(record("generator script exists", false, String(genErr && genErr.message ? genErr.message : genErr)));
    }

    fixtureData.entities.forEach(function(ent) {
      var expectedPath = "/wiki/post/" + ent.canonical_slug + "/";
      results.push(record("fixture slug has output path " + ent.canonical_slug, PROTOTYPES.some(function(p) { return p.slug === ent.canonical_slug; }), expectedPath));
    });

    for (var i = 0; i < PROTOTYPES.length; i += 1) {
      var proto = PROTOTYPES[i];
      var html = await fetchText(proto.path);
      var pageResults = await checkPrototype(proto, html);
      results = results.concat(pageResults);
    }

    var sitemap = await fetchText("/sitemap.xml");
    SITEMAP_EXCLUDE.forEach(function(slug) {
      results.push(record("sitemap excludes " + slug, sitemap.indexOf("/wiki/post/" + slug + "/") === -1, "absent"));
    });

    var robotsTxt = await fetchText("/robots.txt");
    results.push(record("robots.txt present", robotsTxt.length > 0, "ok"));

    var csrPost = await fetchText("/wiki/post/");
    results.push(record("CSR post shell remains", csrPost.indexOf("Loading post") !== -1, "S-05 OPEN"));
    results.push(record("CSR post not SEO-closed", csrPost.indexOf("Post - BoundLore") !== -1, "generic title"));

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
