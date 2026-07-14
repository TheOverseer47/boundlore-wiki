# P5-E.9D SEO / CSR Closure Plan

**Gate:** P5-E.9D — SEO / CSR Closure Plan (Planung/Abnahme only)  
**Datum:** 2026-07-14  
**HEAD (Start):** `a9a63f7` — Add local error reporter stub  
**Verdict:** **PASS** (Planungs-Gate) — S-05 bleibt **OPEN_BLOCKING** bis Umsetzung + Verifikation

---

## Executive Verdict

BoundLore ist eine **statische CSR-Wiki-App** ohne Prerender/SSR/SSG. Für Crawler bedeutet das:

- **Homepage** (`/`) und **Community** haben vollständige statische Meta-/OG-/JSON-LD-Signale.
- **Kategorie-Hubs** liefern statisches Hero/H1, aber **Listeninhalte werden per JS nachgeladen**.
- **Entity-/Post-Detailseiten** (`/wiki/post/?slug=…`) sind **reine CSR-Shells** — initial nur „Loading post…“, generischer Title/Meta, **keine** Canonical/OG/JSON-LD-Aktualisierung.
- **`robots.txt`** — **STATIC_HARDENED** (P5-E.9D.1): Disallow für Admin/Auth/QA/Create/Edit/Search; `Allow: /` für öffentliche Hubs erhalten.
- **`sitemap.xml`** — **STATIC_SITEMAP_HUBS_UPDATED** (P5-E.9D.2): **14 statische Hub-/Legal-/News-URLs** — keine Post-/Entity-Detail-URLs.
- **QA-Fixtures** haben `noindex` im HTML **und** `/qa/` ist in `robots.txt` disallow (9D.1).

**P5-E.9D.1** (robots/noindex Static Hardening) — **PASS** — `robots.txt` + HTML noindex + QA-Fixture 33/33.

**P5-E.9D.2** (Static Hub Metadata Cleanup) — **PASS** — Hub canonical/description/OG/Twitter + Sitemap-Hubs + QA-Fixture **100/100**.

**P5-E.9D.3** (Entity Prerender/SSG Decision) — **PASS** — Architekturentscheidung dokumentiert; **keine** Umsetzung.

**Kernentscheidung:** Entity-Detail-URLs sind **NO-GO für Public SEO**, solange sie CSR-Shells bleiben. Public Launch erfordert Prerender/SSG/SSR **oder** bewusstes Ausschließen aus Index/Sitemap bis P5-E.9D.3+.

**S-06 Search Recall** bleibt **separater OPEN_BLOCKING Gate** — P5-E.9E.3 DB-Strategie **DOCUMENTED**; Runtime über 9E.3A–9E.5.

---

## Working Tree / No-Apply-Bestätigung

| Prüfung | Ergebnis |
|---------|----------|
| HEAD (Start) | `a9a63f7` |
| SQL / DB / Storage | **Nein** |
| Push / Deploy / Launch / Production | **Nein** |
| Search Console / SEO-Provider | **Nein** |
| robots/sitemap geändert | **Nein** (nur Plan) |
| Prerender/SSR implementiert | **Nein** |
| `.env*` geändert | **Nein** |
| Secrets in diesem Dokument | **Nein** |

---

## Current Status

| Dimension | Status |
|-----------|--------|
| **P5-E.9D** | **PASS** (Plan only) |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **S-06 Search Recall** | **OPEN_BLOCKING** (P5-E.9E.3 DOCUMENTED; Runtime OPEN) |
| **Sitemap** | **STATIC_SITEMAP_HUBS_UPDATED** (9D.2) — 14 statische URLs; keine Entity-URLs |
| **Static Hub Metadata** | **STATIC_HUB_METADATA_HARDENED** (9D.2) — 100/100 Fixture |
| **robots / noindex** | **STATIC_HARDENED** (9D.1) — CSR Entity-Details weiter OPEN |
| **Structured Data** | **PARTIAL** — nur `/` (WebSite + Organization) |
| **Production Closure** | **NOT CLOSED** |
| **Product-Activation-Ready** | **FAIL** |
| **Public-Launch-Ready** | **NO-GO** |

---

## SEO Surface Inventory

### Crawl-/Index-Infrastruktur

| Asset | Pfad | Stand | Bewertung |
|-------|------|-------|-----------|
| robots.txt | `/robots.txt` | Disallow Admin/Auth/QA/Create/Edit/Search + Allow:/ | **STATIC_HARDENED** (9D.1) |
| sitemap.xml | `/sitemap.xml` | 9 statische URLs | **PARTIAL** |
| 404 | `/404.html` | Statisch, kein noindex | **Lücke** |
| Legacy CMS | `/public/admin/` | Decap CMS Shell | **Risiko** — kein noindex |

### Seiten mit vollständiger statischer SEO (Referenz)

| Seite | Canonical | OG | Twitter | JSON-LD | robots |
|-------|-----------|----|---------|---------|--------|
| `/` | Ja | Ja | Ja | WebSite + Organization | index |
| `/wiki/community/` | Ja | Ja | Ja | Nein | index |

### Seiten mit partiellem statischen SEO

| Seite | Title | description | H1 | Canonical | OG | Listen-CSR |
|-------|-------|-------------|----|-----------|----|----|
| `/wiki/browse/` | Ja | Ja | Ja | Nein | Nein | Ja (facet-browse.js) |
| `/wiki/search/` | Ja | Ja | Ja | Nein | Nein | Ja (search.js) |
| `/wiki/guides/` | Ja | Ja | Ja | Nein | Nein | Ja |
| `/wiki/news/` | Ja | Ja | Ja | Nein | Nein | Teilweise statisch |
| `/wiki/classes/` | Ja | Ja | Ja | Nein | Nein | Ja |
| `/wiki/support/` | Ja | Ja | Ja | Nein | Nein | Formular |
| Kategorie-Hubs (creatures, items, biomes, locations, resources, …) | Ja | **Meist fehlend** | Ja | Nein | Nein | Ja (render-posts.js) |

### Reine CSR-Shells (kritisch)

| Seite | Initial HTML | Client-Title | Client-Meta | Risiko |
|-------|--------------|--------------|-------------|--------|
| `/wiki/post/?slug=…` | „Loading post…“, generischer Title | `document.title` in post-detail.js | **Keine** Canonical/OG/Description | **KRITISCH** |
| Kategorie-Listen | Hero statisch, Karten per JS | Nein | Nein | **MITTEL** |

### JS ohne SEO-Hooks

| Datei | SEO-Relevanz | Stand |
|-------|--------------|-------|
| `js/post-detail.js` | Title clientseitig (Z. 260) | Kein Meta/Canonical/OG/JSON-LD |
| `js/render-posts.js` | Hub-Listen | Kein SEO |
| `js/search.js` | Suchergebnisse | Kein SEO |
| `js/facet-browse.js` | Browse-Facetten | Kein SEO |
| structured-data*.js | — | **Nicht vorhanden** |

---

## Indexing Policy Matrix

| Route/Pattern | Soll indexiert? | Aktueller Stand | Risiko | Benötigte Änderung | Gate |
|---------------|-----------------|-----------------|--------|-------------------|------|
| `/` | **Ja** | index + canonical + OG + JSON-LD | Niedrig | Beibehalten; lastmod in Sitemap | 9D.2 |
| `/wiki/browse/` | **Ja** (Hub) | indexierbar (kein noindex), kein canonical | Mittel | canonical + meta + ggf. noindex bis Meta-Cleanup | 9D.2 |
| `/wiki/search/` | **Nein** | indexierbar (robots fehlt) | Hoch | `noindex` + robots disallow optional | 9D.1 |
| `/wiki/post/?slug=…` | **Ja** (wenn published) — **aber nur mit Prerender** | CSR-Shell, generischer Title | **KRITISCH** | Prerender/SSG **oder** noindex bis 9D.3 | 9D.3 → 9D.5 |
| `/wiki/creatures/` | **Ja** | Hub statisch, Liste CSR | Mittel | canonical + description + Sitemap | 9D.2 |
| `/wiki/items/` | **Ja** | Wie creatures | Mittel | canonical + description + Sitemap | 9D.2 |
| `/wiki/biomes/` | **Ja** | Wie creatures | Mittel | canonical + description + Sitemap | 9D.2 |
| `/wiki/locations/` | **Ja** | Wie creatures | Mittel | canonical + description + Sitemap | 9D.2 |
| `/wiki/resources/` | **Ja** | Wie creatures | Mittel | canonical + description + Sitemap | 9D.2 |
| `/wiki/classes/` | **Ja** | description vorhanden | Mittel | canonical + Sitemap | 9D.2 |
| `/wiki/guides/` | **Ja** | description vorhanden | Mittel | canonical + Sitemap | 9D.2 |
| `/wiki/guilds/` | **Ja** | In Sitemap | Niedrig | canonical + description | 9D.2 |
| `/wiki/community/` | **Ja** | Vollständig | Niedrig | In Sitemap aufnehmen | 9D.2 |
| `/wiki/news/` | **Ja** | description vorhanden | Mittel | canonical + Sitemap | 9D.2 |
| `/wiki/news/*/` | **Ja** (Artikel) | Statische HTML-Artikel | Niedrig | canonical + Article JSON-LD | 9D.2 |
| `/wiki/privacy/` | **Ja** (Legal) | description + H1 | Niedrig | canonical + Sitemap | 9D.2 |
| `/wiki/imprint/` | **Ja** (Legal) | description + H1 | Niedrig | canonical + Sitemap | 9D.2 |
| `/wiki/support/` | **Optional** (Utility) | In Sitemap, indexierbar | Niedrig | Entscheidung: index ja/nein; canonical | 9D.2 |
| `/wiki/create-post/` | **Nein** | Kein noindex | Hoch | `noindex,nofollow` + disallow | 9D.1 |
| `/wiki/edit-post/` | **Nein** | Kein noindex | Hoch | `noindex,nofollow` + disallow | 9D.1 |
| `/wiki/admin/` | **Nein** | Kein noindex | **KRITISCH** | `noindex,nofollow` + disallow | 9D.1 |
| `/wiki/admin/seed-local/` | **Nein** | Kein noindex | Hoch | `noindex` + disallow | 9D.1 |
| `/wiki/login/` | **Nein** | Kein noindex | Hoch | `noindex,nofollow` | 9D.1 |
| `/wiki/register/` | **Nein** | Kein noindex | Hoch | `noindex,nofollow` | 9D.1 |
| `/wiki/account/` | **Nein** | Kein noindex | Hoch | `noindex,nofollow` | 9D.1 |
| `/wiki/reset-password/` | **Nein** | Kein noindex | Hoch | `noindex,nofollow` | 9D.1 |
| `/wiki/submit-tutorial/` | **Nein** (Utility) | Kein noindex | Mittel | `noindex` oder index als Help | 9D.1 |
| `/qa/*` | **Nein** | HTML noindex, robots erlaubt | Mittel | robots.txt `Disallow: /qa/` | 9D.1 |
| `/public/admin/` | **Nein** | Legacy Decap, kein noindex | Hoch | disallow + noindex | 9D.1 |
| `/404.html` | **Nein** | Kein noindex | Mittel | `noindex` | 9D.1 |
| Pending/Draft/Preview | **Nein** | Nicht öffentlich routbar | — | Server/RLS + noindex falls exponiert | 9D.3 |

---

## CSR Shell Risk Matrix

| Seite / Muster | Initial-HTML-Inhalt | Title/Meta | H1 | Canonical/OG/JSON-LD | SEO-Kritikalität | Risiko |
|----------------|---------------------|------------|----|-----------------------|------------------|--------|
| `/` | Vollständig | Statisch ✓ | Ja (Hero) | ✓ WebSite + Organization | Hoch (Brand) | **Niedrig** |
| `/wiki/post/?slug=…` | „Loading post…“ | Generisch → JS Title | **Doppelt** (Hero + postTitle) | **Fehlt** | **KRITISCH** | **KRITISCH** |
| Kategorie-Hubs | Hero + leere Liste | Title only (meist) | Ja | Fehlt | Hoch | **Mittel** |
| `/wiki/search/` | Shell + leere Results | Statisch | Ja | Fehlt | Niedrig (soll noindex) | **Mittel** (falsches Index) |
| `/wiki/browse/` | Hero + leere Facets | Statisch | Ja | Fehlt | Mittel | **Mittel** |
| `/wiki/news/wiki-launch/` | Vollständiger Artikel | Statisch | Ja | Fehlt | Mittel | **Niedrig** |
| `/wiki/admin/` | Admin-Shell | Statisch | Ja | Fehlt | Soll nicht indexiert | **Hoch** (Leak-Risiko) |
| Auth/Account | Form-Shell | Statisch | Ja | Fehlt | Soll nicht indexiert | **Hoch** |
| QA-Fixtures | Test-UI | noindex ✓ | Ja | Fehlt | Keine | **Niedrig** (robots-Lücke) |

### Post-Detail-Analyse (`wiki/post/index.html` + `post-detail.js`)

```
Initial HTML:
  <title>Post - BoundLore</title>
  <meta description="Community post on BoundLore.">
  <h1>BoundLore Post</h1>          ← statisch, generisch
  <h1 id="postTitle">Loading...</h1> ← wird per JS ersetzt
  #postBody: leer bis Supabase-Fetch

Nach JS-Load:
  document.title = "{Entity} - BoundLore"   ← nur Title, kein Meta/OG/Canonical
```

**Crawler ohne JS** sehen: generischen Title, leeren Body, keine Entity-Information.

---

## Sitemap / robots Gap Matrix

| Anforderung | Ist-Zustand | Soll (Pre-Launch) | Soll (Full Launch) | Gate |
|-------------|-------------|-------------------|-------------------|------|
| robots disallow `/qa/` | Fehlt | `Disallow: /qa/` | + `/wiki/admin/`, `/public/admin/` | 9D.1 |
| robots disallow Admin/Auth | Fehlt | Disallow oder noindex-only | Beides empfohlen | 9D.1 |
| Sitemap: Homepage | ✓ | ✓ | ✓ + lastmod | 9D.2/9D.4 |
| Sitemap: Kategorie-Hubs | Teilweise (6/15+) | Alle indexierbaren Hubs | + dynamische Entities | 9D.2/9D.4 |
| Sitemap: `/wiki/browse/`, `/wiki/classes/` | Fehlt | Hinzufügen | ✓ | 9D.2 |
| Sitemap: Legal (privacy, imprint) | Fehlt | Hinzufügen | ✓ | 9D.2 |
| Sitemap: Post/Entity-URLs | Fehlt | **Bewusst ausgeschlossen** bis Prerender | Published canonical slugs | 9D.3 → 9D.4 |
| Sitemap: Search/Admin/Auth/QA | Fehlt (gut) | Nicht aufnehmen | Nicht aufnehmen | 9D.1 |
| Sitemap: `/wiki/support/` | ✓ (diskutabel) | Optional behalten | Optional | 9D.2 |
| lastmod pro URL | Fehlt | Optional statisch | Dynamisch aus DB | 9D.4 |
| Keine QA-URLs in Sitemap | ✓ | ✓ | ✓ | — |

**Aktuelle sitemap.xml (9 URLs):** `/`, creatures, biomes, items, guides, guilds, community, news, support.

**Fehlende indexierbare Hubs:** browse, classes, locations, resources, lore, dungeons, crafting, privacy, imprint, news-Artikel.

---

## Metadata / Structured Data Requirements

### Minimal (statische Hubs — P5-E.9D.2)

| Feld | Pflicht | Beispiel |
|------|---------|----------|
| `<title>` | Ja | `{Category} – BoundLore` |
| `<meta name="description">` | Ja | Kategorie-spezifisch, 120–160 Zeichen |
| `<link rel="canonical">` | Ja | `https://boundlore.com/wiki/{category}/` |
| `<meta name="robots">` | Ja | `index,follow` oder `noindex` |
| `<h1>` | Ja | **Ein** H1 pro Seite |
| `og:title`, `og:description`, `og:url`, `og:type` | Empfohlen | website |
| `twitter:card` | Empfohlen | summary_large_image |

### Full Launch (Entity-Detail — P5-E.9D.3+)

| Feld | Quelle | Schema |
|------|--------|--------|
| Dynamic Title | Post-Title + Kategorie | — |
| Dynamic Description | Excerpt (erste 160 Zeichen, sanitized) | — |
| Canonical | `https://boundlore.com/wiki/post/?slug={canonical_slug}` | — |
| OG image | Post-Bild oder Fallback social-preview | og:image |
| JSON-LD WebSite | Global (bereits auf `/`) | SearchAction |
| JSON-LD Organization | Global | — |
| JSON-LD BreadcrumbList | Pro Detailseite | Home → Category → Entity |
| JSON-LD Article / CreativeWork | Pro published Post | headline, datePublished, author |
| noindex | pending/draft/non-canonical alias | robots |

---

## Minimal locked/read-only Pre-Launch SEO Plan

Für eine **öffentliche, aber locked/read-only** Site — **ohne** Entity-Detail-Indexierung:

| # | Maßnahme | Ziel | Gate |
|---|----------|------|------|
| 1 | **robots/noindex-Härtung** | Admin, Auth, Account, Create/Edit, Search, QA, public/admin → noindex + disallow | **P5-E.9D.1** |
| 2 | **Sitemap erweitern** | Statische indexierbare Hubs + Legal; **keine** `/wiki/post/` URLs | **P5-E.9D.2** |
| 3 | **Hub-Metadata** | canonical + description für alle Kategorie-Hubs + browse + classes | **P5-E.9D.2** |
| 4 | **H1 bereinigen** | Post-Detail: generisches Hero-H1 entfernen oder zu `<p>` degradieren | **P5-E.9D.2** |
| 5 | **Entity-Details** | **NO-GO** für Public SEO — `noindex` auf `/wiki/post/` **oder** aus Sitemap/Interne Links klar markieren | **P5-E.9D.1/9D.3** |
| 6 | **Legal erreichbar** | privacy + imprint in Sitemap + Footer-Links (bereits vorhanden) | 9D.2 |
| 7 | **404 noindex** | Soft-404 nicht indexieren | 9D.1 |
| 8 | **Keine Search-Console** | Erst nach Deploy-Freigabe (9D.5) | — |

**Explizite Entscheidung:** Solange `/wiki/post/?slug=…` CSR-Shells bleiben, dürfen sie **nicht** in Sitemap und **sollten** `noindex` tragen — sonst indexiert Google leere/generische Shells (Thin-Content-Risiko).

---

## Full Launch SEO Plan

| Layer | Lösung | Zweck | Gate |
|-------|--------|-------|------|
| **Entity Rendering** | Prerender/SSG/SSR (Build-Time oder Edge) | Crawler sehen vollen Content | **P5-E.9D.3** |
| **Dynamic Meta** | Title/Description/Canonical/OG pro Entity | Rich Snippets | 9D.3 → 9D.5 |
| **JSON-LD** | BreadcrumbList + Article/CreativeWork | Wiki-Discovery | 9D.3 |
| **Dynamic Sitemap** | Generator mit published canonical slugs + lastmod | Vollständige Indexierung | **P5-E.9D.4** |
| **Alias-Canonical** | Non-canonical Slugs → 301/canonical redirect (client + server) | Duplicate-Content vermeiden | 9D.3 |
| **noindex-Regeln** | pending, draft, preview, non-canonical | Keine Moderations-Leaks | 9D.3 |
| **Search Console** | Nach Staging/Production Deploy | Index-Monitoring | **P5-E.9D.5** |
| **Interne Verlinkung** | Hub → Entity Links mit statischem `<a href>` | Crawl-Pfade | 9D.2+ |

### Architektur-Optionen (P5-E.9D.3 Entscheidung)

| Option | Aufwand | Crawler-Qualität | Empfehlung |
|--------|---------|------------------|------------|
| **A: Build-Time SSG** | Mittel | Hoch | **Primär** — passt zu statischem Hosting |
| **B: Edge Prerender** | Mittel-Hoch | Hoch | Alternative bei dynamischem Katalog |
| **C: CSR + noindex** | Niedrig | Keine Entity-SEO | Nur Pre-Launch-Übergang |
| **D: Full SSR** | Hoch | Höchste | Overkill für aktuelles Hosting |

---

## Stop Conditions

| # | Bedingung |
|---|-----------|
| 1 | Entity-URLs in Sitemap ohne Prerender/SSG |
| 2 | `robots.txt Allow: /` unverändert lassen während Admin/QA indexierbar |
| 3 | Search Console ohne Deploy-Freigabe (9D.5) |
| 4 | S-05 als CLOSED nur mit Plan-Doc (ohne Verifikation) |
| 5 | Production-SEO-Änderungen ohne Gate |
| 6 | boundlore.com Deploy in Planungs-Gates |

---

## Required Future Gates

### P5-E.9D.1 — robots/noindex Static Hardening

| Item | Detail |
|------|--------|
| **Ziel** | Nicht-indexierbare Pfade per robots.txt + HTML noindex absichern |
| **Scope** | `robots.txt`, Admin/Auth/Create/Edit/Search/QA/public-admin HTML |
| **Deploy** | **Nein** |
| **Freigabe** | Lokale Dateiänderungen |

### P5-E.9D.2 — Static Hub Metadata Cleanup

| Item | Detail |
|------|--------|
| **Ziel** | canonical, description, OG-Basis, ein H1, Sitemap-Hubs |
| **Scope** | Kategorie-HTML + `sitemap.xml` statische Erweiterung |
| **Deploy** | **Nein** |

### P5-E.9D.3 — Entity Detail Prerender/SSG Decision

| Item | Detail |
|------|--------|
| **Ziel** | Architekturentscheidung SSG vs. Edge Prerender vs. noindex-Übergang |
| **Deploy** | **Nein** |
| **Output** | Decision-Doc + Template-Spec |

### P5-E.9D.4 — Dynamic Sitemap Plan

| Item | Detail |
|------|--------|
| **Ziel** | Generator-Skizze für published slugs + lastmod |
| **Production-Zugriff** | **Nein** |
| **Deploy** | **Nein** |

### P5-E.9D.5 — SEO Runtime Verification

```
╔══════════════════════════════════════════════════════════════════╗
║  STOPP — P5-E.9D.5 ERST NACH DEPLOY-/STAGING-FREIGABE           ║
╚══════════════════════════════════════════════════════════════════╝
```

| Item | Detail |
|------|--------|
| **Ziel** | Rich-Results-Test, Crawl-Smoke, Search Console, OG-Preview |
| **Voraussetzungen** | 9D.1–9D.4 + Deploy-Freigabe |
| **Production** | Separate Freigabe |

---

## Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9D.1** | **PASS** |
| **P5-E.9D.2** | **PASS** |
| **P5-E.9D.3** | **PASS** |
| **P5-E.9D.3A** | **PASS** |
| **P5-E.9D.3B** | **PASS** |
| **P5-E.9D.3C** | **PASS** |
| Static Entity HTML Prototype | **PROTOTYPE_PASS** (84/84 Fixture) |
| Entity SSG Fixture Generator | **FIXTURE_GENERATOR_PASS** |
| Entity SSG Implementation | **PARTIAL** (fixture-only; kein Generator für echte Daten) |
| Entity SSG Prototype Plan | **CREATED** |
| Entity Prerender/SSG Decision | **DECISION DOCUMENTED** — Hybrid SSG empfohlen |
| robots/noindex Static Hardening | **STATIC_HARDENED** (33/33) |
| Static Hub Metadata | **STATIC_HUB_METADATA_HARDENED** (100/100) |
| robots / noindex | **STATIC_HARDENED** |
| S-05 SEO/CSR | **OPEN_BLOCKING** (CSR Entity-Details; keine Runtime-Verifikation) |
| S-06 Search Recall | **OPEN_BLOCKING** (P5-E.9E.2 CLIENT_RECALL_HARDENED; Runtime OPEN) |
| Sitemap | **STATIC_SITEMAP_HUBS_UPDATED** — Entity-URLs weiter ausgeschlossen |
| Structured Data | **PARTIAL** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Empfohlener nächster Gate

~~**P5-E.9D.3B** — Static Entity HTML Prototype~~ **PASS** — 3 QA prototype pages + Fixture 84/84

~~**P5-E.9D.3C** — Entity SSG Generator Implementation~~ **PASS** — `scripts/build-entity-ssg-fixtures.mjs` + QA

~~**P5-E.9E** — Search Recall Plan~~ **PASS** — `p5-search-recall-plan.md`

~~**P5-E.9E.1** — Local Search Recall Fixture~~ **PASS** — 98/98

~~**P5-E.9E.2** — Search Client Recall Hardening~~ **PASS** — 92/92 + `js/search-recall-utils.js`

~~**P5-E.9E.3** — Search DB Strategy~~ **PASS** — `p5-search-db-strategy.md`

~~**P5-E.9E.3A** — Search SQL Draft~~ **PASS** — DRAFT ONLY in `p5-search-sql-draft.md`

~~**P5-E.9E.3B** — Search SQL Static Review~~ **PASS** — `p5-search-sql-static-review.md`

~~**P5-E.9E.4** — Staging Search Verification~~ **BLOCKED** — Runtime → Legacy Ref

~~**P5-E.9E.4B** — Staging Runtime Config~~ **PASS** — `p5-staging-runtime-config-report.md`

~~**P5-E.9E.4 Re-run**~~ **PASS** — Search Runtime Evidence **PARTIAL**

~~**P5-E.9E.4C**~~ **PASS** — Read Path Fix Draft

~~**P5-E.9E.4E**~~ **PASS** — Search Runtime Evidence **PASS**

~~**P5-E.9E.4A**~~ **PASS** — Search DB/FTS **APPLIED_STAGING_PASS**; Evidence **PARTIAL_EMPTY_CORPUS**

~~**P5-E.9E.4H**~~ **PASS** — Content Migration Plan

~~**P5-E.9E.4I**~~ **PASS** — Staging Persistent Canonical Corpus Seed

~~**P5-E.9E.4J**~~ **PASS** — Persistent Staging Search Re-run (read-only)

~~**P5-E.9E.4K**~~ **PASS** — Marker Searchability Mitigation Plan

~~**P5-E.9E.4L**~~ **PASS** — Staging Marker Deindex Fix

~~**P5-E.9E.4M**~~ **PASS** — S-06 Staging Search Evidence Closure Dossier

**Empfohlener nächster Gate:** Production Content Migration

Alternativ parallel: **P5-E.9D.3D** Entity Sitemap Integration

---

*Dokumentversion: P5-E.9D … + P5-E.9E.4C PASS. Search Runtime Evidence PARTIAL/BLOCKED_UNTIL_FIX.*
