# P5-E.9D.3 — Entity Prerender / SSG Decision

**Gate:** P5-E.9D.3 — Entity Prerender/SSG Decision (Planung/Architektur only)  
**Datum:** 2026-07-14  
**HEAD (Start):** `87d95cf` — Improve static hub metadata and sitemap  
**Verdict:** **PASS** (Entscheidungs-Gate) — S-05 bleibt **OPEN_BLOCKING** bis Umsetzung + Verifikation

---

## Executive Verdict

BoundLore ist eine **statische CSR-Wiki-App** auf einfachem Static Hosting. Entity-/Post-Detailseiten (`/wiki/post/?slug=…`) laden Inhalt **ausschließlich per Supabase-Client** nach dem ersten Paint. Crawler sehen initial eine **Thin-Content-Shell** (generischer Title, generische Description, „Loading post…“, doppeltes H1) — **nicht** den veröffentlichten Wiki-Eintrag.

**Empfohlene Richtung:**

| Phase | Strategie |
|-------|-----------|
| **Locked/read-only Pre-Launch** | **Option B+** — Hubs indexierbar (9D.2 ✓); Entity-URLs **bewusst aus Sitemap ausgeschlossen**; CSR bleibt für Nutzer; **kein** SEO-closed für Entity-Details; Public Launch **NO-GO** |
| **Full Community Launch** | **Option F (Hybrid)** — Build-time **SSG** für published canonical entries; CSR hydratisiert Interaktion (Reactions, Comments, Auth); Sitemap + JSON-LD erst nach SSG |

**Primäre technische Wahl für Full Launch:** **Option C — Build-time SSG** (nicht Prerender-Service, nicht SSR/Edge als MVP).

**URL-/Canonical-Empfehlung:** Zielpfad **`/wiki/post/<canonical_slug>/`** als statische HTML-Datei; Legacy-Query **`/wiki/post/?slug=`** bleibt als CSR-Fallback mit Client-Redirect auf Canonical (bereits teilweise in `post-detail.js`).

**Keine Umsetzung in diesem Gate.** Kein SQL, kein DB-Zugriff, kein Deploy, kein Push, keine Search Console.

---

## HEAD / Working Tree / No-Apply-Bestätigung

| Item | Status |
|------|--------|
| HEAD vor Gate | `87d95cf` |
| Working Tree | Sauber außer untracked `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json` |
| SQL Apply | **Nein** |
| DB-Write | **Nein** |
| Storage-Apply | **Nein** |
| Push / Deploy / Launch | **Nein** |
| Search Console / SEO-Provider | **Nein** |
| `.env`-Änderungen | **Nein** |
| Secrets geöffnet/committed | **Nein** |

---

## Current Status

| Dimension | Status |
|-----------|--------|
| Entity Detail SEO | **OPEN_BLOCKING** |
| Current Route | `/wiki/post/?slug=…` (alternativ `?id=…`) |
| Current Detail Rendering | **CSR** — Supabase-Fetch in `post-detail.js` |
| Static Shell Meta | Generisch: `Post - BoundLore`, `Community post on BoundLore.` |
| Runtime Meta Update | Nur `document.title` nach Fetch; **kein** canonical/OG/JSON-LD |
| Sitemap Entity URLs | **Excluded** (14 statische Hubs only — 9D.2) |
| robots.txt `/wiki/post/` | **Nicht** disallow — crawlbar, aber Thin Content |
| Static Hub Metadata | **STATIC_HUB_METADATA_HARDENED** (9D.2) |
| Sitemap (Hubs) | **STATIC_SITEMAP_HUBS_UPDATED** |
| Structured Data (Entities) | **Fehlt** — nur Homepage WebSite/Organization |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| Production Closure | **NOT CLOSED** |

---

## Current CSR Problem Statement

### Was Crawler initial sehen (`wiki/post/index.html`)

```html
<title>Post - BoundLore</title>
<meta name="description" content="Community post on BoundLore." />
<!-- kein canonical, kein og:*, kein twitter:*, kein JSON-LD -->
<h1>BoundLore Post</h1>          <!-- generisches Hero-H1 -->
<p>Loading post...</p>            <!-- kein Entity-Body -->
<h1 id="postTitle">Loading...</h1> <!-- zweites H1 nach Render-Vorbereitung -->
```

### Was zur Laufzeit passiert (`js/post-detail.js`)

1. `DOMContentLoaded` → `init()` liest `slug` oder `id` aus Query-String.
2. **Supabase** `posts`-Select mit `profiles` — blockiert ohne Netzwerk/Auth-Kontext.
3. Alias-Auflösung über `EntityCore.postMatchesSlugAlias` + `entity_profile.canonical_slug` / `slug_aliases` (aus `<!--BLMETA …-->` im `content`).
4. Bei Alias-Mismatch: `history.replaceState` auf canonical slug (Query-Param bleibt).
5. `renderPost()` setzt `document.title`, Breadcrumb, Body — **nach** Fetch.
6. **Keine** Aktualisierung von `<meta name="description">`, `<link rel="canonical">`, OG/Twitter, JSON-LD.

### Warum das SEO-kritisch ist

| Risiko | Auswirkung |
|--------|------------|
| Thin-Content-Indexierung | Google indexiert „Loading post…“ / generischen Title |
| Fehlende Canonicals | Duplicate Content bei Alias-Slugs (`slug` vs. `canonical_slug`) |
| Kein initialer Body | Snippets/OG-Preview leer oder generisch |
| Doppeltes H1 | Semantische Schwäche; Hero-H1 „BoundLore Post“ irrelevant |
| Interne Links zeigen auf CSR-URLs | 30+ Stellen in JS generieren `/wiki/post/?slug=` — crawlbar aber inhaltsleer |
| Sitemap ohne Entities | Korrekt (9D.2), aber Launch-Blocker bleibt: Wiki-Kern nicht auffindbar |

### Vorhandene Bausteine (nutzbar für SSG)

| Baustein | Pfad | Relevanz |
|----------|------|----------|
| Canonical-Slug-Logik | `js/entity-core.js` — `canonical_slug`, `slug_aliases`, `buildCanonicalPostSlug` | Generator kann gleiche Regeln spiegeln |
| Alias-Matching | `EntityCore.postMatchesSlugAlias` | Redirect-Map für Build |
| Wiki-Layout-Renderer | `js/wiki-entry-layout.js` | Struktur für Entity-Pages (Kategorien items/creatures/…) |
| BLMETA-Parsing | `post-detail.js`, `knowledge-relations.js` | Metadaten-Quelle im `content`-Feld |
| Statisches Artikel-Referenzmuster | `wiki/news/wiki-launch/index.html` | Vollständige Meta + H1 + Body statisch |
| Hub-Listen-CSR | `js/render-posts.js`, `js/facet-browse.js` | Bleiben CSR; verlinken auf Detail-URLs |
| Build-Skripte (historisch) | `build_dynamic_content.ps1`, `build_guides_page.ps1` | Kein Entity-SSG; zeigt PowerShell-Generator-Muster |
| `package.json` / `scripts/` | **Fehlt** | SSG-Pipeline muss neu designed werden |

**Kein** `structured-data*.js` — JSON-LD für Entities existiert nicht.

---

## Option Comparison Matrix

| Option | SEO-Wirkung | Aufwand | Risiko | Statisches Hosting? | DB beim Build? | Deploy nötig? | Canonical Slugs | JSON-LD | Empfehlung |
|--------|-------------|---------|--------|---------------------|----------------|---------------|-----------------|---------|------------|
| **A — Status quo CSR** | **Keine** — Thin Shells indexierbar | Minimal | Hoch (Thin Content, NO-GO Launch) | Ja | Nein | Nein | Runtime only | Nein | **Nicht akzeptabel** für Public Launch |
| **B — Nur Hubs indexieren** | Hubs OK; **Wiki-Kern unsichtbar** | Gering (bereits 9D.2) | Mittel — unvollständiges Wiki in SERPs | Ja | Nein | Nein | N/A für Entities | Nein | **Pre-Launch Zwischenstand** only |
| **C — Build-time SSG** | **Hoch** — voller HTML-Body + Meta | Mittel | Mittel — Build-Pipeline, Datenquelle | **Ja** (passt perfekt) | **Ja** (read-only Export/Fixture) | Ja (statische Files) | **Ja** | **Ja** | **Primär — Full Launch MVP** |
| **D — Prerender-Service** | Hoch (wenn Cache stimmt) | Mittel-Hoch | Hoch — Kosten, Cache, JS-Abhängigkeit | Teilweise | Ja (live oder Snapshot) | Ja + Service | Ja | Ja | **Nur Fallback** |
| **E — SSR/Edge Function** | Hoch | Hoch | Hoch — Architekturwechsel | Nein (Edge/Node) | Ja (live) | Ja + Backend | Ja | Ja | **Später**, nicht Minimal-MVP |
| **F — Hybrid (B+C)** | Hubs sofort; Entities nach Build | Mittel (gestaffelt) | Geringer als Big-Bang | **Ja** | Ja (Build only) | Gestaffelt | **Ja** | **Ja** | **Bevorzugt — Gesamtstrategie** |

### Detailbewertung

**A — Status quo:** Spart Aufwand, blockiert Public Launch dauerhaft. `robots.txt` disallowt `/wiki/post/` **nicht** — Crawler können Shells indexieren.

**B — Hubs only:** Entspricht aktuellem Stand nach 9D.2. Für read-only Pre-Launch akzeptabel, wenn Entity-URLs **nicht** in Sitemap und **keine** Search-Console-Einreichung vor Runtime-Verifikation.

**C — Build-time SSG:** Referenz im Repo: `wiki/news/wiki-launch/index.html`. Generator erzeugt pro `published` + `canonical_slug` eine `index.html` unter `/wiki/post/<slug>/`. Datenquelle: Staging-Export (separate Freigabe) oder lokale Fixture-JSON (9D.3B). Passt zu bestehendem Static Hosting ohne Backend.

**D — Prerender:** Headless-Browser-Snapshots nach Deploy — fragile bei Auth-Gates, Supabase-Latenz, JS-Fehlern; laufende Kosten; für BoundLore-Scale unnötig komplex.

**E — SSR/Edge:** Sinnvoll bei sehr dynamischem Katalog und häufigen Updates ohne Rebuild — widerspricht aktueller „reines Static HTML“-Architektur.

**F — Hybrid:** **Empfohlene Gesamtarchitektur** — Hubs statisch (done), Entities SSG, CSR-Shell bleibt als Fallback/Hydration für Kommentare/Reactions/Auth.

---

## Recommended Pre-Launch Strategy (locked/read-only)

| Regel | Maßnahme |
|-------|----------|
| Hubs | Bleiben indexierbar — **STATIC_HUB_METADATA_HARDENED** |
| Entity-Sitemap | **Keine** Entity-URLs bis statisches HTML pro Entity existiert |
| CSR-Detailseite | Bleibt **funktional** für Nutzer; **nicht** als SEO-closed werten |
| `noindex` auf `/wiki/post/` | **Optional** in 9D.3B/3C — aktuell **nicht** erzwungen (9D.1 deferred); bei Pre-Launch **empfohlen** als HTML-`noindex` auf CSR-Shell bis SSG existiert |
| Search Console | **STOPP** — keine Einreichung vor 9D.5 Runtime-Verifikation |
| Interne Links | Bestehende `/wiki/post/?slug=` Links **beibehalten** — kein Breaking Change |
| Public Launch | **NO-GO** — Wiki-Kernseiten nicht crawlerfähig |

**Akzeptanzkriterium Pre-Launch:** Hubs in SERPs vertretbar; Entity-Gap dokumentiert und aus Sitemap ausgeschlossen.

---

## Recommended Full Launch Strategy

### Zielarchitektur (Option F + C)

```
Build-Pipeline (Freigabe-gated)
    ↓
Read-only Datenquelle (Staging Export / approved JSON snapshot)
    ↓
Filter: status=published, deleted_at IS NULL, canonical_slug gesetzt
    ↓
Pro Entity: wiki/post/<canonical_slug>/index.html
    - <title>{Entity} – BoundLore</title>
    - <meta name="description"> aus excerpt/summary/BLMETA
    - <link rel="canonical" href="https://boundlore.com/wiki/post/{canonical_slug}/">
    - og:title, og:description, og:type=article, og:url
    - twitter:card, twitter:title, twitter:description
    - JSON-LD: Article oder CreativeWork + BreadcrumbList
    - genau ein H1 (Entity-Titel)
    - sichtbarer Body-Auszug (sanitized HTML oder Text-Auszug)
    ↓
CSR post-detail.js hydratisiert (Reactions, Comments, Auth)
    — initialer HTML-Body darf von JS erweitert, nicht ersetzt werden
```

### Pro Entity — Pflichtfelder (Full Launch)

| Feld | Quelle |
|------|--------|
| Title | `post.title` oder `entity_profile.canonical_title` |
| Description | `post.excerpt` oder generierter Summary aus Body (max ~160 Zeichen) |
| Canonical | `https://boundlore.com/wiki/post/{canonical_slug}/` |
| H1 | Entity-Titel (einmalig; Hero-H1 „BoundLore Post“ entfernen/degradieren) |
| Body-Auszug | Sanitized excerpt im initialen HTML |
| JSON-LD | `Article` für Guides/News-Posts; `CreativeWork`/`Thing` für Wiki-Entities |
| BreadcrumbList | Home → Category Hub → Entity |

### Draft / Pending / Test / QA

| Status | Sitemap | robots |
|--------|---------|--------|
| draft, pending, rejected | **Nie** | `noindex,nofollow` falls URL erreichbar |
| published + canonical | **Ja** (nach SSG) | `index,follow` |
| Alias-Slug-Anfragen | **Nicht** in Sitemap | Redirect/Canonical auf Zielslug |
| `contribution-*` Slugs | **Nie** | `noindex` |
| QA-Fixtures | **Nie** | bereits `noindex` + robots disallow |

### Alias-Strategie

- **Sitemap:** nur `canonical_slug`-Pfade.
- **Alias-URLs** (`slug_aliases`, Legacy-`post.slug`): statische `meta refresh` / JS-Redirect-Seiten oder Server-Redirect-Map — **keine** duplicate Sitemap-Einträge.
- **Client:** bestehendes `replaceState` in `post-detail.js` beibehalten; SSG-Seiten setzen serverseitig canonical auf Zielslug.

### CSR nach SSG

- `wiki/post/index.html` (Query-Shell) bleibt für `?id=`, unbekannte Slugs, Auth-only Views.
- Published canonical Slugs: bevorzugt statische `/wiki/post/<slug>/` ausliefern.
- JS darf Kommentare/Reactions nachladen — **nicht** als alleiniger Content-Träger.

---

## URL / Canonical Strategy

### Aktueller Zustand

| Aspekt | Ist |
|--------|-----|
| Primäre Route | `/wiki/post/?slug=<slug>` |
| Alternative | `/wiki/post/?id=<uuid>` |
| Link-Generierung | 30+ JS-Stellen: `"/wiki/post/?slug=" + encodeURIComponent(slug)` |
| Canonical-Slug-Quelle | `entity_profile.canonical_slug` in BLMETA; Fallback `post.slug` |
| Client-Canonicalisierung | `history.replaceState` auf canonical slug (Query bleibt) |

### Bewertete Zielvarianten

| Variante | SEO-Klarheit | Bestehende Links | Static Hosting | Sitemap | Link-Bruch-Risiko | Empfehlung |
|----------|--------------|------------------|----------------|---------|-------------------|------------|
| `/wiki/post/?slug=<canonical_slug>` + Prerender | Mittel (Query-URLs) | **Kein Bruch** | **Schlecht** — eine HTML-Datei für alle Slugs | Schwierig | Gering | **Nicht** für SSG |
| `/wiki/post/<canonical_slug>/` | **Hoch** | Mittel — JS-Links zeigen noch auf Query | **Gut** — `index.html` pro Slug | **Gut** | Mittel — mit Redirect lösbar | **Primär (Full Launch)** |
| `/wiki/<category>/<canonical_slug>/` | **Sehr hoch** | Hoch — alle Link-Generatoren ändern | Gut | Gut | **Hoch** | **Phase 2** (optional) |
| `/wiki/entity/<canonical_slug>/` | Hoch | Hoch — neue Konvention | Gut | Gut | Hoch | **Abgelehnt** — redundant zu post |

### Empfehlung

| Phase | Canonical-URL |
|-------|---------------|
| **Pre-Launch** | Keine Entity-Canonicals in Sitemap; CSR-Query-URLs unverändert |
| **Full Launch (SSG)** | `https://boundlore.com/wiki/post/<canonical_slug>/` |
| **Legacy-Kompatibilität** | `/wiki/post/?slug=<alias>` → Redirect auf path-based canonical (statische Redirect-HTML oder Client + später Server-Regeln) |
| **Kategoriepfade** | `/wiki/creatures/<slug>/` etc. — **nicht** im MVP; erst nach Link-Inventur und 301-Plan |

**Keine URL-Migration in diesem Gate.** Keine Redirects implementiert.

---

## Sitemap Strategy

| Phase | Inhalt |
|-------|--------|
| **Aktuell (9D.2)** | 14 statische Hubs/Legal/News — **STATIC_SITEMAP_HUBS_UPDATED** |
| **Pre-Launch** | Entity-URLs **ausgeschlossen** — korrekt |
| **Nach SSG (9D.3D)** | `sitemap.xml` erweitern um `https://boundlore.com/wiki/post/{canonical_slug}/` |
| **Filter** | Nur `published`, `deleted_at` null, canonical_slug, nicht `contribution-*` |
| **lastmod** | Aus `updated_at` / `published_at` wenn Build-Datenquelle verlässlich |
| **Alias-Slugs** | **Nie** duplicate `<loc>` |
| **Search Console** | Erst **9D.5** nach Staging/Deploy-Freigabe |

---

## Structured Data Strategy

| Seite | Aktuell | Ziel (Full Launch) |
|-------|---------|-------------------|
| `/` | WebSite + Organization JSON-LD | Beibehalten |
| Hubs | Kein JSON-LD | Optional `CollectionPage` — **PARTIAL**, nicht blocking |
| Entity-Details | **Fehlt** | `Article` (Guides/News) oder `CreativeWork`/`Thing` (Wiki-Entity) |
| BreadcrumbList | **Fehlt** | Home → Hub → Entity |
| SearchAction auf Homepage | Zeigt auf `/wiki/search/` (noindex) | Später prüfen — nicht 9D.3 Scope |

**Structured Data bleibt PARTIAL** bis 9D.3C/3D Umsetzung.

---

## Migration / Backward Compatibility

| Schritt | Gate | Risiko |
|---------|------|--------|
| Link-Inventur aller `/wiki/post/?slug=` Generatoren | 9D.3A | Niedrig |
| Statische Seiten unter `/wiki/post/<slug>/` | 9D.3C | Mittel — Build-Fehler |
| CSR-Shell behält Query-Routing | Parallel | Gering |
| Alias → Canonical Redirect-Map | 9D.3C | Mittel — falsche 301 |
| Hub-Karten (`render-posts.js`) auf path-based URLs umstellen | 9D.3C/3D | Mittel — inkonsistente Links wenn teilweise |
| `?id=` URLs | Bleiben CSR-only; **nicht** in Sitemap | Gering |
| Doppel-H1 auf CSR-Shell | 9D.3B Prototype | Gering |

**Rollback:** SSG-Ordner löschen; `sitemap.xml` auf Hub-only zurücksetzen (9D.2 Stand).

---

## Risks / Stop Conditions

| # | Risiko / Stop Condition |
|---|-------------------------|
| 1 | Entity-URLs in Sitemap **ohne** statisches HTML |
| 2 | Search Console Einreichung vor 9D.5 |
| 3 | Build mit Production-Credentials ohne Freigabe |
| 4 | Draft/Pending in SSG-Output |
| 5 | Alias-Slugs als separate Sitemap-Einträge (Duplicate Content) |
| 6 | SSG-Body ohne Sanitization (XSS in statischem HTML) |
| 7 | `noindex` von Admin/Auth/Search (9D.1) versehentlich entfernen |
| 8 | Secrets in Build-Artefakten oder Export-JSON committen |
| 9 | Public Launch als SEO-closed markieren ohne 9D.5 Verifikation |

---

## Required Future Gates

### P5-E.9D.3A — Entity SSG Prototype Plan

| Item | Detail |
|------|--------|
| **Ziel** | Technische Skizze: Datenquelle, Template, Output-Pfade, Alias-Map |
| **Scope** | Dokument + Pseudocode; kein Generator-Code |
| **Verboten** | DB-Write, Deploy |
| **Freigabe** | Lokal |

### P5-E.9D.3B — Static Entity HTML Prototype

| Item | Detail |
|------|--------|
| **Ziel** | Eine lokale Beispielseite aus Fixture-Daten (kein DB) |
| **Scope** | z. B. `wiki/post/_fixture-example/` oder QA-Fixture-HTML |
| **Pflicht** | title, description, canonical, OG, JSON-LD, ein H1, Body-Auszug |
| **Verboten** | DB-Zugriff, Deploy |
| **Freigabe** | Lokal |

### P5-E.9D.3C — Entity SSG Generator Implementation

| Item | Detail |
|------|--------|
| **Ziel** | Lokaler Generator (PowerShell/Node) erzeugt N Entity-HTML-Dateien |
| **Datenquelle** | Separate Freigabe: Staging read-only Export oder approved JSON |
| **Scope** | `scripts/` oder `build_entity_ssg.ps1`; Template aus 9D.3B |
| **Verboten** | Deploy ohne Gate |
| **Freigabe** | **Ja** — vor DB-Export |

### P5-E.9D.3D — Entity Sitemap Integration

| Item | Detail |
|------|--------|
| **Ziel** | `sitemap.xml` um published canonical Entity-Pfade erweitern |
| **Voraussetzung** | 9D.3C PASS — statische Files existieren |
| **Verboten** | Search Console |
| **Freigabe** | Lokal; Deploy separat |

### P5-E.9D.4 — Dynamic Sitemap / lastmod (optional)

| Item | Detail |
|------|--------|
| **Ziel** | Generator aktualisiert Sitemap bei jedem Build |
| **Voraussetzung** | 9D.3C |
| **Hinweis** | Kann mit 9D.3D zusammengeführt werden |

### P5-E.9D.5 — SEO Runtime Verification (**STOPP**)

| Item | Detail |
|------|--------|
| **Ziel** | Rich-Results, Crawl-Smoke, OG-Preview, optional Search Console |
| **Voraussetzung** | 9D.3C + 9D.3D + **Staging/Deploy-Freigabe** |
| **Verboten** | Ohne explizite Production-Freigabe |

### S-05 Schließung

S-05 SEO/CSR wird **CLOSED** erst wenn:

1. Published Entity-Details crawlerfähiges initiales HTML liefern (9D.3C)
2. Sitemap Entity-URLs enthält (9D.3D)
3. Runtime-Verifikation PASS (9D.5)
4. Keine Thin-Content-Shells für published Entities indexierbar sind

---

## Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9D.3** | **PASS** |
| Entity Detail SEO | **OPEN_BLOCKING** |
| Sitemap Entity URLs | **Excluded** (korrekt bis SSG) |
| Static Hub Metadata | **STATIC_HUB_METADATA_HARDENED** |
| Sitemap (Hubs) | **STATIC_SITEMAP_HUBS_UPDATED** |
| Structured Data | **PARTIAL** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Empfohlener nächster Gate

**P5-E.9D.3A** — Entity SSG Prototype Plan (technische Skizze, kein DB)

Alternativ parallel: **P5-E.9E** — Search Recall Plan

---

*Dokumentversion: P5-E.9D.3 PASS. Keine Secrets. Keine Search-Console-Aktion. Keine Umsetzung.*
