# P5-E.9D.3A — Entity SSG Prototype Plan

**Gate:** P5-E.9D.3A — Entity SSG Prototype Plan (Planung/Architektur only)  
**Datum:** 2026-07-14  
**HEAD (Start):** `be3c37e` — Document entity prerender SSG decision  
**Verdict:** **PASS** (Planungs-Gate) — S-05 bleibt **OPEN_BLOCKING** bis Prototyp + Generator + Sitemap + Runtime-Verifikation

**Vorgänger:** `p5-entity-prerender-ssg-decision.md` (9D.3 PASS — Hybrid SSG empfohlen)

---

## Executive Verdict

Dieser Plan konkretisiert den **engsten sinnvollen Build-time-SSG-Prototyp** für published Entity-/Post-Detailseiten — **ohne DB-Zugriff**, **ohne Generator-Implementierung**, **ohne statische Entity-Dateien** in diesem Gate.

**Kernentscheidungen:**

| Thema | Entscheidung |
|-------|--------------|
| Prototyp-Daten | Lokale **Fixture JSON** (2–3 Beispiel-Entities) in **P5-E.9D.3B** |
| Output-Pfad | `wiki/post/<canonical_slug>/index.html` |
| CSR-Fallback | `wiki/post/?slug=<canonical_slug>` bleibt unverändert |
| Template-Referenz | `wiki/news/wiki-launch/index.html` (statische Meta) + `wiki-entry-layout.js` (Body-Struktur) |
| Sanitization | Build-Time via gleiche Regeln wie `BoundLoreContentSafety` — **kein** unsanitized HTML |
| JSON-LD MVP | `CreativeWork` + `BreadcrumbList`; `Article` für Guides/News |
| Sitemap | Entity-URLs **weiter ausgeschlossen** bis **P5-E.9D.3D** |
| Datenquelle später | Fixture → lokaler Generator → kontrollierter Staging-Export (separate Freigabe) |

**Keine Umsetzung in diesem Gate.**

---

## HEAD / Working Tree / No-Apply-Bestätigung

| Item | Status |
|------|--------|
| HEAD vor Gate | `be3c37e` |
| Working Tree | Sauber außer untracked `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json` |
| SQL Apply | **Nein** |
| DB-Write / DB-Read | **Nein** |
| DB-Export / Dump | **Nein** |
| Generator-Implementierung | **Nein** |
| Statische Entity-HTML | **Nein** |
| Storage-Apply | **Nein** |
| Push / Deploy / Launch | **Nein** |
| Search Console | **Nein** |
| `.env`-Änderungen | **Nein** |
| Secrets geöffnet/committed | **Nein** |

---

## Current Status

| Dimension | Status |
|-----------|--------|
| Entity SSG | **NOT IMPLEMENTED** |
| Prototype Plan | **CREATED** (dieses Dokument) |
| Entity Detail SEO | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Static Hub Metadata | **STATIC_HUB_METADATA_HARDENED** (9D.2) |
| Sitemap (Hubs) | **STATIC_SITEMAP_HUBS_UPDATED** (9D.2) |
| Entity Sitemap URLs | **EXCLUDED** |
| Structured Data (Entities) | **PARTIAL** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| Production Closure | **NOT CLOSED** |

---

## Prototype Scope

### In Scope (P5-E.9D.3B — nächstes Gate)

| Item | Detail |
|------|--------|
| Datenquelle | Lokale Fixture JSON — **kein DB** |
| Beispiel-Entities | **3 Stück:** Creature, Item, Biome |
| Output (manuell oder Mini-Template) | `wiki/post/<canonical_slug>/index.html` je Fixture |
| CSR-Fallback | `wiki/post/?slug=` unverändert |
| Sichtbar im initialen HTML | Title, Description, Excerpt, Body-Auszug, ein H1, Canonical, OG/Twitter, JSON-LD |
| Hydration-Hook | `data-bl-ssg-hydrate="1"` + `data-bl-canonical-slug` für späteres JS |
| QA | Statische DOM-Checks in Fixture (9D.3B) |

### Out of Scope (dieses + 3B Gate)

| Item | Grund |
|------|-------|
| Generator-Skript | **P5-E.9D.3C** |
| Staging-Export / Supabase-Read | Separate Freigabe |
| Sitemap-Entity-URLs | **P5-E.9D.3D** |
| Search Console / Runtime SEO | **P5-E.9D.5 STOPP** |
| Kategoriepfade `/wiki/creatures/<slug>/` | Phase 2 |
| Vollständige Wiki-Layout-Parität | Prototyp zeigt SEO-Minimum; CSR ergänzt Relations/Comments |

### Beispiel-Fixture-Entities (3B)

| # | Kategorie | Beispiel-`canonical_slug` | Zweck |
|---|-----------|---------------------------|-------|
| 1 | `creatures` | `fire-frog` (Fixture) | Creature + evidence/completeness |
| 2 | `items` | `iron-sword` (Fixture) | Item + facets optional |
| 3 | `biomes` | `ember-wastes` (Fixture) | Biome + relations_summary |

Slug-Namen sind **reine Fixture-Bezeichner** — keine DB-Abfrage, keine echten Production-Entities.

---

## Required Entity Data Contract

Der spätere Generator (9D.3C) und der Prototyp (9D.3B) konsumieren **normalisierte JSON-Records** — nicht rohe `posts`-Rows mit BLMETA im Body.

### Top-Level Schema (`EntitySsgRecord`)

```json
{
  "canonical_slug": "fire-frog",
  "title": "Fire Frog",
  "category": "creatures",
  "entity_domain": "fauna",
  "entity_subtype": "creature",
  "excerpt": "A small amphibian found near volcanic vents in Light No Fire.",
  "body_html_sanitized": "<p>A small amphibian...</p>",
  "updated_at": "2026-07-01T12:00:00Z",
  "published_at": "2026-06-15T08:00:00Z",
  "content_origin": "community_discovery",
  "status": "published",
  "canonical_url": "https://boundlore.com/wiki/post/fire-frog/",
  "image_url": "https://boundlore.com/public/images/social-preview.png",
  "evidence_tier": "community_verified",
  "completeness": "partial",
  "relations_summary": ["biome:ember-wastes", "item:heat-resistance-potion"],
  "facets": { "habitat": "volcanic", "threat_level": "low" },
  "breadcrumbs": [
    { "name": "Home", "url": "https://boundlore.com/" },
    { "name": "Browse", "url": "https://boundlore.com/wiki/browse/" },
    { "name": "Creatures", "url": "https://boundlore.com/wiki/creatures/" },
    { "name": "Fire Frog", "url": "https://boundlore.com/wiki/post/fire-frog/" }
  ],
  "aliases": ["firefrog", "fire-frog-44"],
  "source_post_id": null
}
```

### Pflichtfelder

| Feld | Typ | Regel |
|------|-----|-------|
| `canonical_slug` | string | Eindeutig; URL-safe; nur Kleinbuchstaben/Ziffern/Bindestrich |
| `title` | string | Anzeige-H1; max 120 Zeichen empfohlen |
| `category` | string | `creatures`, `items`, `biomes`, `locations`, `resources`, `guides`, … |
| `entity_domain` | string | Aus BLMETA/`entity-core.js` abgeleitet |
| `entity_subtype` | string | z. B. `creature`, `resource`, `station_type` |
| `excerpt` | string | 120–300 Zeichen; Basis für meta description |
| `body_html_sanitized` | string | **Nur** allowlisted HTML; BLMETA entfernt |
| `updated_at` | ISO-8601 | Für `dateModified` / optional `lastmod` |
| `published_at` | ISO-8601 | Für `datePublished` |
| `content_origin` | string | z. B. `community_discovery`, `curated`, `guide` |
| `status` | string | **Nur** `published` im Export |
| `canonical_url` | string | Absolut; Pfad `/wiki/post/<canonical_slug>/` |
| `breadcrumbs` | array | Mindestens Home → Hub → Entity |

### Optionale Felder

| Feld | Verwendung |
|------|------------|
| `image_url` | OG/Twitter; Fallback: `/public/images/social-preview.png` |
| `evidence_tier` | Badge im Body; JSON-LD `additionalProperty` optional |
| `completeness` | Badge; kein Schema-Rating |
| `relations_summary` | Statische „Related“-Links im Prototyp |
| `facets` | Key-Value für Subtype-Badges |
| `aliases` | Redirect-Map; **nicht** in Sitemap |
| `source_post_id` | Traceability; **nicht** in öffentlichem HTML |

### Ausschlussregeln (Build-Filter)

| Regel | Aktion |
|-------|--------|
| `status !== "published"` | **Nicht** generieren |
| `deleted_at` gesetzt | **Nicht** generieren |
| `contribution-*` Slugs | **Nicht** generieren |
| Draft / pending / rejected | **Nicht** generieren |
| QA/Test-Fixture-Slugs (`qa-`, `test-`, `p5-`) | **Nicht** generieren |
| BLMETA im Output | **Strippen** — nur in Rohdaten intern |
| PII (E-Mail, UUID in Body) | **Strippen** |
| Admin-/Moderationsfelder | **Nicht** exportieren |
| Unsanitized HTML | **Blockieren** — Build FAIL |

### Mapping aus DB (später, 9D.3C + Freigabe)

| DB-Feld | Contract-Feld |
|---------|---------------|
| `posts.slug` / `entity_profile.canonical_slug` | `canonical_slug` |
| `posts.title` / `canonical_title` | `title` |
| `posts.category` | `category` |
| `posts.excerpt` | `excerpt` (oder generiert) |
| `posts.content` | → parse BLMETA → sanitize → `body_html_sanitized` |
| `posts.updated_at` | `updated_at` |
| `posts.created_at` / publish timestamp | `published_at` |
| `entity_profile.*` | `entity_domain`, `entity_subtype`, `aliases`, … |

---

## Template Requirements

### Referenz-Dateien im Repo

| Referenz | Nutzen |
|----------|--------|
| `wiki/news/wiki-launch/index.html` | Vollständige statische Head-Meta (canonical, OG, Twitter) |
| `wiki/creatures/index.html` | Hub-Link-Ziel, Nav-Struktur |
| `wiki/post/index.html` | CSR-Shell — **nicht** als SSG-Template kopieren (doppeltes H1) |
| `js/wiki-entry-layout.js` | Body-Sektionen, Evidence-Badges, Klassifikation |
| `js/content-safety.js` | Sanitization-Contract für Build |
| `js/entity-core.js` | `canonical_slug`, `slug_aliases`, Domain/Subtype |

### Head (statisch pro Entity)

```html
<title>{title} – BoundLore Wiki</title>
<meta name="description" content="{excerpt_trimmed_120_160}" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="{canonical_url}" />
<meta property="og:title" content="{title} – BoundLore Wiki" />
<meta property="og:description" content="{excerpt_trimmed}" />
<meta property="og:type" content="article" />
<meta property="og:url" content="{canonical_url}" />
<meta property="og:image" content="{image_url_or_fallback}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="{title} – BoundLore Wiki" />
<meta name="twitter:description" content="{excerpt_trimmed}" />
<meta name="twitter:image" content="{image_url_or_fallback}" />
<script type="application/ld+json">{ BreadcrumbList + CreativeWork }</script>
```

**Regeln:**
- `robots: index,follow` nur für `status=published` + canonical Output
- Kein zweites `<title>` oder duplicate canonical
- JSON-LD als ein Block oder zwei separate `<script>` — Parser-tauglich

### Body (statisch pro Entity)

| Element | Anforderung |
|---------|-------------|
| Nav | Gleiche Struktur wie Hubs (`wiki/creatures/index.html`) |
| Breadcrumb | Sichtbar: Home › Browse › {Category} › {Title} |
| **H1** | **Genau eines** — `{title}`; **kein** generisches „BoundLore Post“ |
| Badges | Category, `entity_domain`, `entity_subtype`, optional evidence/completeness |
| Excerpt | Sichtbarer `<p class="bl-ssg-excerpt">` |
| Body | `body_html_sanitized` — voll oder Preview (min. 200 Zeichen Text) |
| Related | Optional statische Links aus `relations_summary` |
| Hydration-Container | `<div id="blSsgHydrateRoot" data-bl-ssg-hydrate="1" data-bl-canonical-slug="{slug}">` |
| Noscript | Basisinhalt bleibt lesbar ohne JS |
| **Verboten** | „Loading post…“ als alleiniger sichtbarer Inhalt |

### JS (Hydration — ab 9D.3B/3C)

| Regel | Detail |
|-------|--------|
| ErrorReporter | `/js/error-reporter.js` früh im `<head>` |
| ContentSafety | `/js/content-safety.js` vor dynamischen Ergänzungen |
| CSR-Skripte | Subset von `post-detail.js`-Abhängigkeiten **oder** dediziertes `post-detail-hydrate.js` |
| Hydration-Modus | Wenn `data-bl-ssg-hydrate="1"`: Kommentare/Reactions/Auth nachladen; **kein** Überschreiben von `<title>`, canonical, OG, JSON-LD |
| Doppel-H1 | Wiki-Layout darf **kein** zweites H1 einfügen — Hero in CSR-Shell entfällt in SSG |
| Meta-Downgrade | JS darf statische Meta **nicht** auf generische Werte zurücksetzen |

---

## Output Path Strategy

### Primärer Output

```
wiki/post/<canonical_slug>/index.html
```

**Beispiele (Fixture 3B):**
- `wiki/post/fire-frog/index.html`
- `wiki/post/iron-sword/index.html`
- `wiki/post/ember-wastes/index.html`

### Regeln

| Regel | Detail |
|-------|--------|
| Nur canonical slug | Alias-Slugs erzeugen **keine** eigenen Ordner |
| Sitemap | Nur `canonical_url` — **9D.3D** |
| CSR-Fallback | `/wiki/post/?slug=<canonical_slug>` — bestehende Shell |
| Alias-Anfragen | Später: statische Redirect-HTML oder Client-Redirect auf canonical |
| `?id=` URLs | Bleiben CSR-only; **nicht** in Sitemap |
| Kategoriepfade | `/wiki/creatures/<slug>/` — **Phase 2**, nicht Prototyp |
| Asset-Pfade | Relative Pfade `../../../css/style.css` oder absolute `/css/...` — konsistent mit Hubs |

### Verzeichnis-Layout (Ziel)

```
wiki/post/
  index.html              # CSR-Shell (bestehend)
  fire-frog/
    index.html            # SSG (9D.3B Prototyp)
  iron-sword/
    index.html
  ember-wastes/
    index.html
```

**Keine URL-Migration in diesem Gate.**

---

## Canonical / Alias Strategy

| Szenario | Verhalten |
|----------|-----------|
| Canonical SSG-Seite | `<link rel="canonical" href="https://boundlore.com/wiki/post/{canonical_slug}/">` |
| Alias in Fixture/DB | `aliases[]` — Build erzeugt optional `wiki/post/{alias}/index.html` mit `<meta http-equiv="refresh">` oder 301-Map — **nicht** in Sitemap |
| CSR `?slug=alias` | Bestehendes `replaceState` in `post-detail.js` (Zeile 55–58) — auf canonical umleiten |
| Duplicate Content | Nur **ein** Sitemap-`<loc>` pro Entity |

---

## Metadata Strategy

| Feld | Quelle | Regel |
|------|--------|-------|
| `<title>` | `title` | `{title} – BoundLore Wiki` |
| `description` | `excerpt` | 120–160 Zeichen; bei Kürze aus Body-Text truncaten |
| `canonical` | `canonical_url` | Absolut; Pfad-basiert |
| `og:type` | Kategorie | `article` für Wiki-Entities |
| `og:image` | `image_url` | Fallback: `https://boundlore.com/public/images/social-preview.png` |
| `twitter:card` | — | `summary_large_image` |
| `robots` | `status` | `index,follow` nur published; sonst Build-Ausschluss |

---

## JSON-LD Strategy

### MVP Default: `CreativeWork` + `BreadcrumbList`

**CreativeWork (Wiki-Entity):**

```json
{
  "@context": "https://schema.org",
  "@type": "CreativeWork",
  "name": "{title}",
  "description": "{excerpt}",
  "url": "{canonical_url}",
  "datePublished": "{published_at}",
  "dateModified": "{updated_at}",
  "image": "{image_url_or_fallback}",
  "keywords": "{category}, {entity_domain}, {entity_subtype}",
  "isPartOf": {
    "@type": "WebSite",
    "name": "BoundLore",
    "url": "https://boundlore.com/"
  }
}
```

**BreadcrumbList:**

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://boundlore.com/" },
    { "@type": "ListItem", "position": 2, "name": "Browse", "item": "https://boundlore.com/wiki/browse/" },
    { "@type": "ListItem", "position": 3, "name": "Creatures", "item": "https://boundlore.com/wiki/creatures/" },
    { "@type": "ListItem", "position": 4, "name": "{title}", "item": "{canonical_url}" }
  ]
}
```

### Varianten

| Kategorie | `@type` |
|-----------|---------|
| creatures, items, biomes, locations, resources | `CreativeWork` (MVP) |
| guides, news | `Article` |
| Später: spezifischer | `Thing` + `additionalType` — nicht im Prototyp |

### Verboten

- `AggregateRating` / Review ohne echte Daten
- `FAQPage` ohne FAQ-Inhalt
- JSON-LD für Draft/Pending/Test
- Personenbezogene `author`-Felder mit UUID/E-Mail im Prototyp

---

## Hydration / CSR Compatibility

### Problem

`wiki/post/index.html` lädt 30+ Skripte und `post-detail.js` rendert vollständiges Wiki-Layout **nach** Supabase-Fetch — inkl. doppeltem H1 und generischer Shell.

### Ziel-Architektur (Hybrid)

```
Statisches HTML (SSG)
  ├── Vollständige SEO-Signale (Head + H1 + Body)
  └── Hydration-Container (#blSsgHydrateRoot)
         ↓ (nach DOMContentLoaded, wenn data-bl-ssg-hydrate=1)
      post-detail-hydrate.js (neu, 9D.3C)
         ├── Kommentare, Reactions, Auth-UI
         ├── Related entries (live)
         └── KEIN overwrite von title/canonical/OG/JSON-LD/H1
```

### Kompatibilität mit bestehendem Code

| Modul | SSG-Seite | CSR-Fallback |
|-------|-----------|--------------|
| `post-detail.js` | **Nicht** voll laden — oder Guard am Anfang: `if (document.documentElement.dataset.blSsg) return hydrateOnly()` | Unverändert |
| `wiki-entry-layout.js` | Statisches HTML spiegelt Layout-Subset; JS ergänzt nur `#blSsgHydrateRoot` | Voll render |
| `entity-core.js` | Build-Time für Slug/Domain; Runtime für Alias-Match | Unverändert |
| `content-safety.js` | Build-Time Sanitizer + Runtime | Aktiv |
| `error-reporter.js` | Früh laden | Aktiv |

### Hydration-Hook (HTML-Attribut)

```html
<html lang="en" data-bl-ssg="1" data-bl-canonical-slug="fire-frog">
```

---

## Sitemap Integration Later (P5-E.9D.3D)

| Phase | Sitemap |
|-------|---------|
| Jetzt (9D.2/9D.3A) | 14 Hub-URLs — **keine** Entity-URLs |
| Nach 9D.3C | Generator schreibt `sitemap-entities.xml` oder erweitert `sitemap.xml` |
| Eintrag | `<loc>https://boundlore.com/wiki/post/{canonical_slug}/</loc>` |
| `lastmod` | Aus `updated_at` wenn verlässlich |
| Alias | **Nie** duplicate `<loc>` |
| Search Console | **STOPP** bis 9D.5 |

---

## Generator-Datenquelle — Bewertung

| Option | SEO | Aufwand | Risiko | DB? | Empfehlung |
|--------|-----|---------|--------|-----|------------|
| **A — Lokale Fixture JSON** | Prototyp only | Gering | Minimal | **Nein** | **P5-E.9D.3B** — erste Quelle |
| **B — Build-Time JSON Export (Staging)** | Hoch | Mittel | Mittel — Export-Freigabe | Read-only Export | **Nach 3C** — separate Freigabe |
| **C — Supabase Read beim Build** | Hoch | Mittel | **Hoch** — Credentials in CI | Ja | **STOPP** bis Freigabe |
| **D — Dump-basierte Extraktion** | Hoch | Hoch | **Hoch** — Dumps, PII | Ja | **Nicht bevorzugt** |

### Empfohlene Reihenfolge

```
9D.3B  Fixture JSON + manuelle/kleine Beispiel-HTML
   ↓
9D.3C  Generator liest Fixture JSON → N × index.html
   ↓
[Freigabe] Staging published-content Export (JSON, kein PII)
   ↓
9D.3C  Generator gegen Export
   ↓
9D.3D  Sitemap-Integration
   ↓
9D.5   Runtime-Verifikation (STOPP bis Deploy)
```

---

## QA Strategy (ab 9D.3B)

### Statische Checks (Fixture HTML/JS)

| # | Check |
|---|-------|
| 1 | Statische Entity-Prototyp-Seite existiert unter `wiki/post/<slug>/` |
| 2 | `<title>` entity-spezifisch (nicht „Post - BoundLore“) |
| 3 | `<meta name="description">` entity-spezifisch |
| 4 | `<link rel="canonical">` = `https://boundlore.com/wiki/post/<canonical_slug>/` |
| 5 | Kein `noindex` auf published Prototyp |
| 6 | Genau ein `<h1>` |
| 7 | Kein „Loading post…“ als primärer sichtbarer Inhalt |
| 8 | `application/ld+json` parsebar; enthält `BreadcrumbList` |
| 9 | `CreativeWork` oder `Article` vorhanden |
| 10 | BLMETA-Kommentar **nicht** im Body sichtbar |
| 11 | Sitemap enthält Entity **nicht** (bis 9D.3D) |
| 12 | Alias nicht doppelt in Sitemap (wenn Redirect-Seiten existieren) |
| 13 | XSS: kein `<script>`/`onerror` im statischen Body |
| 14 | CSR-Fallback `/wiki/post/?slug=` lädt weiterhin (200, kein Crash) |
| 15 | `data-bl-ssg-hydrate` Attribut vorhanden |

**Artefakt:** `qa/p5-entity-ssg-prototype-fixtures.html` + `.js` — **P5-E.9D.3B**, nicht 3A.

---

## Implementation Sequence

| Schritt | Gate | Deliverable |
|---------|------|-------------|
| 1 | **9D.3A** (dieses Gate) | Prototype Plan — **PASS** |
| 2 | **9D.3B** | `qa/fixtures/entity-ssg/*.json` + 3 × `wiki/post/<slug>/index.html` + QA-Fixture |
| 3 | **9D.3C** | `build_entity_ssg.ps1` oder `scripts/build-entity-ssg.mjs` — liest Fixture/Export |
| 4 | **9D.3D** | `sitemap.xml` erweitern; Generator-Sitemap-Task |
| 5 | **9D.5** | Rich-Results, Crawl-Smoke — **STOPP** bis Deploy |
| 6 | **9D.3C+** | Staging-Export-Integration — separate Freigabe |
| 7 | **9E** | Search Recall (S-06) — parallel möglich |

---

## Risks / Stop Conditions

| # | Risiko | Stop |
|---|--------|------|
| 1 | Entity in Sitemap ohne statisches HTML | Sofort stoppen |
| 2 | Unsanitized HTML im SSG-Output | Build FAIL |
| 3 | BLMETA sichtbar im Body | Build FAIL |
| 4 | Doppel-H1 in SSG-Template | QA FAIL |
| 5 | JS überschreibt statische Meta | Regression — Hydration-Guard erforderlich |
| 6 | Draft/Pending in Export | Filter FAIL |
| 7 | Secrets in Fixture/Export committed | Git-Stop |
| 8 | Dump-Dateien committed | Git-Stop |
| 9 | Search Console vor 9D.5 | Policy-Verstoß |
| 10 | Public Launch als SEO-closed ohne 9D.5 | Verdict FAIL |

---

## Required Future Gates

### P5-E.9D.3B — Static Entity HTML Prototype

| Item | Detail |
|------|--------|
| **Ziel** | 3 Fixture-Entities als statische HTML unter `wiki/post/<slug>/` |
| **Daten** | `qa/fixtures/entity-ssg/*.json` — kein DB |
| **QA** | `qa/p5-entity-ssg-prototype-fixtures.*` — min. 15 Checks |
| **Verboten** | Generator, DB, Deploy, Sitemap-Entity-URLs |

### P5-E.9D.3C — Entity SSG Generator Implementation

| Item | Detail |
|------|--------|
| **Ziel** | Generator: JSON → N × `wiki/post/<slug>/index.html` |
| **Input** | Zuerst Fixture JSON; später Staging-Export (Freigabe) |
| **Sanitization** | Build-Time — `content-safety`-kompatibel |
| **Verboten** | Deploy ohne Gate |

### P5-E.9D.3D — Entity Sitemap Integration

| Item | Detail |
|------|--------|
| **Ziel** | `sitemap.xml` um canonical published URLs erweitern |
| **Voraussetzung** | 9D.3C PASS |
| **Verboten** | Search Console |

### P5-E.9D.5 — SEO Runtime Verification (**STOPP**)

| Item | Detail |
|------|--------|
| **Ziel** | Crawl-Smoke, Rich-Results, OG-Preview |
| **Voraussetzung** | 9D.3C + 9D.3D + Deploy-Freigabe |

### P5-E.9E — Search Recall Plan

| Item | Detail |
|------|--------|
| **Ziel** | S-06 Search Recall — separater Blocker |

### S-05 Schließung

S-05 wird **CLOSED** erst nach: 9D.3B (Template proof) + 9D.3C (Generator) + 9D.3D (Sitemap) + 9D.5 (Runtime PASS).

### P5-E.9D.3C — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Generator | `scripts/build-entity-ssg-fixtures.mjs` |
| Input | `qa/fixtures/p5-entity-ssg-fixtures.json` |
| Output | 3 × `wiki/post/qa-ssg-*-prototype/index.html` |
| Node QA | `qa/p5-entity-ssg-generator-check.mjs` — PASS |
| Browser QA | `p5-entity-ssg-prototype-fixtures.*` — **95/95 PASS** |
| Marker | `data-bl-ssg-source="fixture-generator"` |
| Sitemap | Entity-URLs **excluded** |
| DB / Deploy | **Nein** |

---

## Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9D.3A** | **PASS** |
| **P5-E.9D.3B** | **PASS** |
| **P5-E.9D.3C** | **PASS** |
| Static Entity HTML Prototype | **PROTOTYPE_PASS** (84/84) |
| Entity SSG Fixture Generator | **FIXTURE_GENERATOR_PASS** |
| Entity SSG Implementation | **PARTIAL** (fixture-only; keine echte Datenquelle) |
| Entity Detail SEO | **OPEN_BLOCKING** |
| Sitemap Entity URLs | **EXCLUDED** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Empfohlener nächster Gate

~~**P5-E.9D.3B** — Static Entity HTML Prototype~~ **PASS** — 3 pages + `p5-entity-ssg-prototype-fixtures.*` (84/84)

~~**P5-E.9D.3C** — Entity SSG Generator Implementation~~ **PASS** — `scripts/build-entity-ssg-fixtures.mjs` + Fixture QA

**P5-E.9D.3D** — Entity Sitemap Integration (nach Freigabe)

Alternativ parallel: **P5-E.9E** — Search Recall Plan

---

*Dokumentversion: P5-E.9D.3A PASS + P5-E.9D.3B PASS + P5-E.9D.3C PASS. Keine Secrets. Kein DB-Zugriff. Keine Sitemap-Entity-URLs.*
