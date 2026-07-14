# P5-E.9E — Search Recall Plan

**Gate:** P5-E.9E — Search Recall Plan (planning/analysis only). **PASS**.

**HEAD vor Gate:** `fde0532` — Implement fixture-based entity SSG generator

**Arbeitsmodus:** Nur lokales Repo. Kein SQL Apply. Kein DB-Write. Kein Storage-Apply. Kein Push. Kein Deploy. Kein Launch. Keine Supabase-Verbindung. Keine Search-Console-Aktion. Keine `.env`-Änderungen.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E** | **PASS** (Plan erstellt) |
| **P5-E.9E.3** | **PASS** |
| **DB Search Strategy** | **DOCUMENTED** |
| **P5-E.9E.2** | **PASS** |
| **Search Client Recall** | **CLIENT_RECALL_HARDENED** (92/92 Hardening-Fixture) |
| **P5-E.9E.1** | **PASS** |
| **Local Search Recall Fixture** | **LOCAL_RECALL_FIXTURE_PASS** (98/98) |
| **S-06 Search Recall** | **CLOSED** (Staging **STAGING_CLOSED** via 4M; Final **CLOSED_SEARCH_EVIDENCE** via 5J) |
| **S-06 Final Status** | **CLOSED_SEARCH_EVIDENCE** |
| **Legacy Search Runtime Readiness** | **READY_FOR_SEPARATE_PRODUCTIVE_CUTOVER_GATE** |
| **Search Implementation** | **PARTIAL** — produktive `js/search.js` unverändert |
| **Search Runtime Evidence** | **OPEN** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** (separater Blocker) |
| **Entity SSG** | **PARTIAL** — fixture-only (`FIXTURE_GENERATOR_PASS`); nicht in Search-Corpus |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |
| **Production Closure** | **NOT CLOSED** |

**Kernaussage:** BoundLore hat eine **funktionale, aber unvollständige** client-seitige Sucharchitektur (`search-signals` + `search-query-parser`). Wichtige Inhalte können **trotz vorhandener Entities** 0 Treffer liefern, weil (a) kein Synonym-/Taxonomie-Mapping existiert (`monster` ≠ `creature`), (b) der **Body nicht indexiert** wird, (c) die DB-Abfrage nur `published` Posts mit `limit(500)` lädt und (d) **kein serverseitiger Full-Text-Index** existiert. Der bekannte Smoke-Gap `/wiki/search/?q=monster` → 0 Treffer ist **architektonisch erklärbar** und bleibt bis Implementierung + Verifikation offen.

**Empfohlener nächster Gate:** **P5-E.9E.1** — Local Search Recall Fixture (kein DB).

---

## HEAD / Working Tree / No-Apply-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `fde0532` |
| SQL Apply | **Nein** |
| DB-Write / Supabase-Verbindung | **Nein** |
| Storage Apply | **Nein** |
| Push / Deploy / Launch | **Nein** |
| Search Console / SEO Provider | **Nein** |
| Search-Implementierung in diesem Gate | **Nein** — nur Plan |
| `.env`-Änderungen | **Nein** |

---

## Warum Inhalte aktuell nicht zuverlässig gefunden werden

1. **Kein Synonym-/Taxonomie-Wörterbuch:** Allgemeine Begriffe wie `monster`, `beast`, `mob` werden nicht auf `entity_subtype: creature` gemappt. Parser-Hints erkennen `monster spawn`, nicht isoliertes `monster`.
2. **Body nicht durchsuchbar:** `collectTextSignals()` indexiert nur `excerpt`, nicht `content`/Body oder sanitized HTML. Begriffe, die nur im Fließtext stehen, fehlen im Recall.
3. **Zweistufige Architektur mit schmaler DB-Vorfilterung:** Supabase lädt bis zu 500 `published` Posts; Legacy-Fallback nutzt `ilike` nur auf `title` + `excerpt`. Strukturierte Suche baut Signale client-seitig aus BLMETA — aber nur aus dem geladenen Corpus.
4. **Kein Full-Text-Index / kein Ranking auf DB-Ebene:** Kein `tsvector`, kein `pg_trgm`, keine Embeddings. Alles client-seitig nach Fetch.
5. **Keine Singular/Plural-/Typo-Normalisierung:** Nur `toLowerCase()` + Token-Split. `salamanders` findet `salamander` nur bei Teilstring-Match in Signalen.
6. **SSG-Fixture-Seiten außerhalb des Corpus:** `wiki/post/qa-ssg-*-prototype/` sind statisch, nicht in `posts`-Tabelle, daher für Live-Search unsichtbar.
7. **CSR-only Result Links:** Treffer verlinken auf `/wiki/post/?slug=` (CSR-Shell), nicht auf statische SSG-URLs — separates S-05-Thema, aber UX/SEO-Risiko bei Crawl/Preview.

---

## Current Search Surface Inventory

| Oberfläche | Pfad / Trigger | Implementierung | Datenquelle |
|------------|----------------|-----------------|-------------|
| **Navbar Global Search** | `#searchInput` / `#searchResults` auf den meisten Wiki-Seiten | `js/search.js` → `initSearch()` | Supabase `posts` + client ranking |
| **Search Results Page** | `/wiki/search/?q=` oder `?query=` | `js/search.js` → `initSearchPage()` | Supabase `posts` + structured ranking |
| **Category Hub Search** | `/wiki/creatures/?q=`, `/wiki/items/?q=`, … | `js/render-posts.js` → `matchesCategorySearchRP()` | Supabase category fetch + client filter |
| **Facet Browse Filters** | `/wiki/resources/?acquisition_method=…`, `/wiki/browse/?facet=…` | `js/facet-browse.js` | Client filter auf geladene Posts |
| **FAQ Support Index** | Statisch in `search.js` | `faqSearchIndex` | Hardcoded Support-Links |
| **Missing Entry Suggestions** | Global + Search Page | `search-signals.js` → `findMissingEntrySuggestions()` | Abgeleitet aus Recipe-Unresolved (Wood, Forge) |
| **Static Hub Names** | `/wiki/creatures/`, `/wiki/browse/`, … | HTML only | **Nicht** in Search-Corpus |
| **SSG Fixture Entities** | `wiki/post/qa-ssg-*-prototype/` | Statisch generiert | **Nicht** in Search-Corpus |

**Verwandte Architektur-Docs:** `docs/architecture/search-architecture.md`, `docs/architecture/search-filter-matrix.md`

---

## Current Query Flow

```
User Query
    │
    ├─ Navbar (#searchInput)     debounce 300ms, min 2 chars
    └─ Search Page (?q=)         debounce 250ms, min 1 char
              │
              ▼
    hasStructuredSearch()?
    (BoundLoreSearchSignals loaded)
              │
     ┌────────┴────────┐
     │ JA              │ NEIN (Legacy)
     ▼                 ▼
fetchStructuredSearchCorpus()   runLegacySearch()
  supabase.from("posts")          supabase ilike title/excerpt
  .select(id,title,category,      limit 8
   post_type,slug,excerpt,
   content,status,deleted_at)
  .eq("status","published")
  .is("deleted_at",null)
  .limit(500)
  cache 120s
              │
              ▼
buildSearchDocuments(posts)
  parse BLMETA from content
  collect signals (title, aliases,
  facets, relations, recipe, …)
              │
              ▼
BoundLoreSearchQueryParser.parseSearchQuery()
  facet/usage/relation hints (boost only)
              │
              ▼
searchDocuments(query, documents)
  score > 0 → ranked results
  limit 8–24 (context-dependent)
              │
              ▼
findMissingEntrySuggestions()
  Wood/Forge unresolved targets
              │
              ▼
render results (escapeHtml on titles/hints)
  link → /wiki/post/?slug=<slug>
```

### Statische Flow-Details

| Aspekt | Verhalten |
|--------|-----------|
| **Supabase direkt** | Ja — `fetchStructuredSearchCorpus()` und Legacy `runLegacySearch()` |
| **Query-Parameter** | `q` oder `query` auf Search Page; `q` auf Category Hubs |
| **Debounce** | Navbar 300ms; Search Page 250ms |
| **Pagination** | Nein — feste Limits (8 navbar, 24 search page, 500 corpus fetch) |
| **Release-Gate** | Kein direkter Search-Blocker in `release-gate-client.js`; Filter über `status=published` + Contribution-Exclude |
| **Error-Handling** | `catch` → „Search unavailable, please try again." |
| **XSS-Schutz** | `escapeHtml()` auf Query in Empty-State + Result-Titel/Hints; keine rohe HTML-Snippets |
| **Contribution-Filter** | `contribution-*` Slugs und `Contribution:` Titel ausgeschlossen |
| **BLMETA sichtbar** | Nein — nur intern geparst für Signale |

---

## Searchable Fields Matrix

| Feld / Signal | Aktuell durchsucht? | Quelle | Risiko | Empfehlung |
|---------------|---------------------|--------|--------|------------|
| `title` | **Ja** (hoch gewichtet) | `posts.title` | Niedrig | Behalten; exact/prefix boost |
| `slug` | **Ja** (als Title-Signal) | `posts.slug` | Niedrig | Behalten |
| `canonical_slug` | **Teilweise** | BLMETA `entity_profile` | Mittel | Explizit als Alias-Signal indexieren |
| `excerpt` | **Ja** (niedrig gewichtet) | `posts.excerpt` | Niedrig | Behalten |
| `body` / `content` | **Nein** (nur Category-Hub-Filter strippt HTML) | `posts.content` | **Hoch** | Sanitized Body-Tokens in Pre-Launch; FTS in Full Launch |
| `body_html_sanitized` | **Nein** | — | **Hoch** | Build-Time/Index-Feld für Full Launch |
| `tags` | **Teilweise** | Facets/BLMETA | Mittel | Explizites Tag-Signal |
| `category` | **Ja** | `posts.category` | Niedrig | Synonym-Mapping (`Creatures` ↔ `creature`) |
| `entity_domain` | **Ja** | BLMETA | Niedrig | Behalten |
| `entity_subtype` | **Ja** | BLMETA + Parser-Hints | **Hoch** bei generischen Begriffen | Synonym-Wörterbuch (`monster`→`creature`) |
| `facets` | **Ja** | `FacetRegistry` | Niedrig | Behalten |
| `aliases` | **Ja** | BLMETA `entity_profile` | Mittel | Erweitern; QA-Aliase prüfen |
| `relations_summary` | **Ja** (einzelne Relations) | `discovery_relations` | Mittel | Aggregiertes relations_summary Signal |
| `content_origin` | **Nein** (Filter only) | BLMETA | Niedrig | Exclude `prototype_fixture`/QA in Public |
| `evidence_tier` | **Ranking only** | `EvidenceRank` | Niedrig | Nicht als Primär-Recall; Boost only |
| `BLMETA` (roh) | **Intern ja, sichtbar nein** | `posts.content` comment | Niedrig wenn Policy eingehalten | Nie roh rendern |
| `comments` | **Nein** | — | Niedrig | Full Launch optional |
| `news` / `guides` | **Ja** wenn `post_type` | `posts.post_type` | Niedrig | Hub-Filter ergänzen |
| Static hub names | **Nein** | HTML | Mittel | Optional: statischer Hub-Index |
| SSG fixture records | **Nein** | Statische HTML | Niedrig (QA only) | Bewusst excluded bis echte Datenquelle |

---

## Recall Risk Matrix

| Risiko | Beispiel | Schwere | Ursache | Minimal-Fix | Full-Fix |
|--------|----------|---------|---------|-------------|----------|
| Generischer Taxonomie-Begriff 0 Treffer | `monster` → 0 trotz QA Ogre Mage | **Kritisch** | Kein Synonym `monster`→`creature`; kein Subtype-Label-Match | Client-Synonym-Map + Subtype-Labels in Identity-Signals | DB FTS + Synonym-Dictionary + Facet-Index |
| Body-only Begriff unsichtbar | Begriff nur in Post-Body, nicht in Excerpt | **Hoch** | `collectTextSignals()` nur Excerpt | Sanitized Body-Token-Extraktion (limitiert) | `tsvector` auf sanitized body |
| Singular/Plural | `salamander` vs `salamanders` | Mittel | Keine Lemmatisierung | Einfache Plural-Stem-Regeln (`-s`, `-es`) | Morphologie / FTS |
| Kategoriebegriff vs Entity | `creature` findet Kategorie nicht als Hub | Mittel | Hub-Seiten nicht indexiert | Browse-Fallback in Empty-State | Hub-Index + Domain-Tabs |
| Alias nicht indexiert | Offizieller Name vs Community-Alias | Mittel | Aliase nur wenn in BLMETA | Alias-Ingestion prüfen | Alias-Tabelle + Redirect-Index |
| Tippfehler | `oger` statt `ogre` | Mittel | Kein Fuzzy-Match | Kein Minimal-Fix (zu riskant ohne Tests) | `pg_trgm` / Trigram-Index |
| Zusammengesetzte Begriffe | `fire resource` | Mittel | Token-AND in Category-Search | Multi-Token-Scoring beibehalten | Phrase-Index |
| DE/EN Begriff | `Kreatur` vs `creature` | Mittel | Nur EN-Hints im Parser | Kleines DE→EN Synonym-Set | i18n Synonym-Dictionary |
| Hidden BLMETA | Recall über interne Felder | Niedrig | BLMETA geparst, nicht gerendert | Policy: nur erlaubte Felder | Index-Build-Time Sanitization |
| CSR-only Result URLs | Treffer → CSR Shell | Mittel (S-05) | `buildPostPath()` → `?slug=` | Link-Strategie dokumentieren | SSG-URL wenn statische Seite existiert |
| Release-lock Filtering | Pending/Draft in Results | Niedrig | `status=published` Filter | QA/Draft-Exclude explizit | RLS + Index-View nur published |
| Client-Zu streng | `requireAllTokens` Penalty | Mittel | Score * 0.35 wenn nicht alle Tokens | Review Token-Policy | Server-Ranking |
| Supabase `ilike` schmal | Legacy nur title+excerpt | **Hoch** (Fallback) | Kein strukturierter Fallback | Structured path immer laden | DB-seitige Suche |
| Fehlende FTS-Indexes | Skalierung >500 Posts | **Hoch** (Scale) | `limit(500)` hard cap | Dokumentieren; Monitoring | `search_documents` Materialized View |
| Kein Ranking/Snippet | Nur Titel + Kategorie-Label | Mittel | Keine Highlight-Strategie | Kurze `explanation` beibehalten | Snippet + Highlight |
| QA/Fixture in Public Results | `qa-ssg-*` in Live-Suche | Niedrig | Nicht in DB | `content_origin` Exclude | Published-Policy + Index-Filter |

---

## Required Recall Test Corpus

Lokal testbarer Mindest-Korpus für **P5-E.9E.1** (Fixture, kein DB). Basierend auf bekannten QA-Entities und Architektur-Erwartungen.

### Muss-Treffer (erwartet PASS nach Hardening)

| Query | Erwarteter Treffer | Primäres Match-Feld | Ranking-Erwartung |
|-------|-------------------|---------------------|-------------------|
| `ember` | QA Ember Shard | title / resource name | exact title > excerpt |
| `ember shard` | QA Ember Shard | title | exact title |
| `mining` | QA Ember Shard (+ Mining-Filter) | facet `acquisition_method` | facet > body |
| `resource` | QA Ember Shard, Ressourcen-Hub-Einträge | entity_subtype | subtype hint > generic |
| `staff of fire` | QA Staff of Fire | title | exact title |
| `wood` | Missing Entry Suggestion (nicht Post) | unresolved target | missing_entry section |
| `forge` | Missing Entry Suggestion | unresolved target | missing_entry section |
| `ogre` | QA Ogre Mage | title | exact/prefix title |
| `creature` | QA Ogre Mage (+ Parser subtype hint) | entity_subtype | subtype > title token |
| `monster` | QA Ogre Mage (nach Synonym-Fix) | synonym→creature | **aktuell FAIL** — Ziel für 9E.2 |
| `salamander` | QA SSG Creature Prototype (nur wenn in DB; Fixture offline) | title | fixture-only offline |
| `swamp` | Swamplands biome | title / facet | title > relation |
| `red crystal` | QA Ember Shard (source_detail) | resource signal | resource > excerpt |

### Bewusst 0 Treffer

| Query | Grund |
|-------|-------|
| `quest-anything` | T3 reserved; Post not found |
| `contribution-` | Contribution-Slugs excluded |
| `qa-ssg-creature-prototype` | Fixture nicht in DB (bis echte Pipeline) |
| `asdfghjkl_notaword_zz` | Garbage query |
| `<script>alert(1)</script>` | XSS probe — escaped, 0 Treffer, kein Execution |

### Nicht sichtbar in Snippets

- Rohes `<!--BLMETA …-->`
- Draft/Pending/Admin-Inhalte
- `content_origin: prototype_fixture` in Public Live (Policy)
- Interne E-Mail/Tokens/PII

### Ranking-Hierarchie (Soll)

```
exact title > alias > canonical_slug
  > category / entity_domain / entity_subtype
    > excerpt
      > sanitized body tokens
        > relations / facets / evidence metadata
```

---

## Minimal locked/read-only Pre-Launch Search Plan

**Ziel:** Bessere Recall-Rate **ohne** DB-Migration, **ohne** SQL Apply, **ohne** Deploy.

| # | Maßnahme | Gate |
|---|----------|------|
| 1 | **Query-Normalizer** — lowercase, trim, einfache Plural-Regeln (`-s`, `-ies→y`) | P5-E.9E.1 Fixture |
| 2 | **Synonym-Map (client)** — `monster→creature`, `beast→creature`, `mob→creature`, `potion→consumable` (klein, reviewbar) | P5-E.9E.2 |
| 3 | **Subtype-Display-Labels** als Identity-Signals (`Creature`, `Resource`, `Biome`) | P5-E.9E.2 |
| 4 | **Excerpt + limitierte Body-Tokens** — sanitized strip, max N Tokens, keine HTML | P5-E.9E.2 |
| 5 | **Empty-State UX** — Kategorie-Vorschläge (`Try Creatures, Items, Resources`), Browse-Fallback-Links | P5-E.9E.2 |
| 6 | **Published-only Policy** — Exclude QA/Fixture/Prototype via `content_origin` oder Slug-Prefix | P5-E.9E.2 |
| 7 | **Snippet-Safety** — escapeHtml beibehalten; keine rohen HTML-Blöcke | P5-E.9E.1 Fixture |
| 8 | **Kein FTS-Migration** in Minimal-Gate | Policy |

**Akzeptanz Minimal:** Definierter Recall-Korpus PASS in lokaler Fixture; `monster` liefert ≥1 Creature-Treffer; XSS-Query sicher; keine BLMETA-Leaks.

---

## Full Launch Search Strategy

**Ziel:** Skalierbare, serverseitige Suche für Public Launch.

| Schicht | Empfehlung |
|---------|------------|
| **Index** | Postgres `tsvector` auf gewichteten Feldern oder dedizierte `search_documents`-Materialized View |
| **Gewichtung A** | `title`, `canonical_slug`, `aliases` |
| **Gewichtung B** | `excerpt`, `category`, `entity_domain`, `entity_subtype`, `tags` |
| **Gewichtung C** | sanitized `body_text` |
| **Gewichtung D** | `relations_summary`, `facets`, `evidence_tier` (boost only) |
| **Ranking** | Server-seitig mit Explain; Client nur Rendering |
| **Highlighting** | `ts_headline` oder Client-Mark aus Server-Snippets |
| **Synonym-Dictionary** | Pflegbare Tabelle/JSON — DE/EN, Taxonomie, Alias |
| **Category Filters** | Domain-Tabs + Facet-Filter serverseitig |
| **Exclusions** | Draft, Pending, Admin, QA-Fixture, `noindex` |
| **Index Refresh** | On-publish Hook oder scheduled refresh; SSG-Build-Sync |
| **Analytics** | Nur mit Consent/Privacy-Konzept |
| **Abuse** | Rate-limit + Monitoring via `BoundLoreErrorReporter` |
| **SSG-Integration** | Result-URLs → canonical static URL wenn SSG-Seite existiert (S-05 Abhängigkeit) |

**STOPP:** Jede DB-Strategie nur über **P5-E.9E.3** (Plan) → Freigabe → Apply-Gate.

---

## QA Strategy

| Phase | Artefakt | DB |
|-------|----------|-----|
| **9E.1** | `qa/p5-search-recall-fixtures.*` + JSON Corpus | Nein |
| **9E.2** | JS-Hardening + Fixture PASS | Nein |
| **9E.3** | SQL/Architektur-Plan Review | Nein (Plan only) |
| **9E.4** | Staging Recall Smoke | Read-only bevorzugt |
| **9E.5** | Production Recall Smoke | STOPP — Production-Freigabe |

**Fixture-Checks (9E.1):** Normalisierung, Ranking-Reihenfolge, Snippet-Escape, BLMETA-Absence, 0-Result-Queries, `monster`-Recall-Ziel.

---

## Risks / Stop Conditions

| STOPP | Bedingung |
|-------|-----------|
| **9E.3 SQL** | Kein `CREATE INDEX` / Migration ohne explizite Freigabe |
| **9E.4 Staging** | Kein Staging-Zugriff ohne Backup + Freigabe |
| **9E.5 Production** | Kein Production-Search-Test ohne Closure-Freigabe |
| **Search Console** | Keine Index-Submission in diesem Track |
| **Scope-Creep** | Keine Embeddings/Vektorsuche ohne separaten Gate |
| **Data-Leak** | Keine Draft/BLMETA/QA in Public Snippets |

---

## Required Future Gates

### P5-E.9E.1 — Local Search Recall Fixture

| Item | Detail |
|------|--------|
| **Ziel** | Lokaler JSON-Corpus + Browser-Fixture für Normalisierung, Ranking, Snippets, XSS |
| **DB** | **Nein** |
| **Deploy** | **Nein** |
| **Status** | **PASS** — 98/98 Fixture, Node-Check PASS |

### P5-E.9E.2 — Search Client Recall Hardening

| Item | Detail |
|------|--------|
| **Ziel** | Synonym-Map, Body-Token-Limit, Empty-State UX, Published-Exclude |
| **DB-Write** | **Nein** |
| **Deploy** | **Nein** |
| **Voraussetzung** | 9E.1 PASS |

### P5-E.9E.3 — Search DB Strategy

| Item | Detail |
|------|--------|
| **Ziel** | FTS/`search_documents`-Architektur, SQL-Plan, Index-Refresh |
| **Apply** | **STOPP** — Plan only |
| **Voraussetzung** | 9E.2 PASS |

### P5-E.9E.4 — Staging Search Verification

| Item | Detail |
|------|--------|
| **Ziel** | Recall-Korpus gegen Staging-Daten |
| **Freigabe** | **STOPP** — Staging-Freigabe |
| **Voraussetzung** | 9E.2 oder 9E.3 PASS |

### P5-E.9E.5 — Production Search Verification

| Item | Detail |
|------|--------|
| **Ziel** | Recall-Korpus gegen Production |
| **Freigabe** | **STOPP** — Production-Freigabe |
| **Voraussetzung** | 9E.4 PASS + Deploy |

### S-06 Schließung

S-06 wird **CLOSED** erst nach: **9E.1** (Fixture) + **9E.2** (Client Hardening) + **9E.4** (Staging Verification) mindestens; Full Launch optional **9E.3** + **9E.5**.

**S-05 bleibt separater OPEN_BLOCKING Blocker** — nicht durch Search-Plan geschlossen.

---

## Verweise

| Artefakt | Pfad |
|----------|------|
| Search Architecture | `docs/architecture/search-architecture.md` |
| Search Filter Matrix | `docs/architecture/search-filter-matrix.md` |
| Global Search JS | `js/search.js` |
| Search Signals | `js/search-signals.js` |
| Query Parser | `js/search-query-parser.js` |
| Category Search | `js/render-posts.js` |
| Facet Browse | `js/facet-browse.js` |
| Search Page | `wiki/search/index.html` |
| Known S-06 Gap (Live) | `/wiki/search/?q=monster` → 0 Treffer — Fixture-Referenz PASS |
| Recall Fixture | `qa/p5-search-recall-fixtures.html` — 98/98 PASS |

---

## P5-E.9E.1 — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Corpus | `qa/fixtures/p5-search-recall-corpus.json` — 11 Records |
| Query Matrix | `qa/fixtures/p5-search-recall-queries.json` |
| Browser Fixture | **98/98 PASS** |
| Node Check | `qa/p5-search-recall-check.mjs` PASS |
| Reference Search | QA-only; produktive `js/search.js` **unverändert** |
| `monster` → Creature | PASS in Referenzlogik |
| S-06 | **OPEN_BLOCKING** bis 9E.2 + Runtime |

**Empfohlener nächster Gate:** **P5-E.9E.3** — Search DB Strategy (Plan only)

---

## P5-E.9E.2 — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Utility | `js/search-recall-utils.js` — `window.BoundLoreSearchRecall` |
| Produktive Integration | `js/search.js` — Recall-Ranking, Canonical-URLs, Empty-State |
| HTML-Einbindung | `wiki/search/`, `index.html`, Browse + Hub-Seiten (`?v=p5-e9e2`) |
| Hardening Fixture | **92/92 PASS** — `qa/p5-search-client-hardening-fixtures.*` |
| Node Check | `qa/p5-search-client-hardening-check.mjs` PASS |
| Recall-Fixture Regression | **98/98 PASS** (9E.1 unverändert) |
| `monster` → Creature | PASS in produktiver Utility + Fixture |
| Search Client Status | **CLIENT_RECALL_HARDENED** |
| Search Runtime Evidence | **OPEN** (kein Staging/Production-Lauf) |
| S-06 | **OPEN_BLOCKING** bis 9E.4 Runtime |
| DB/FTS Strategy | Offen für **P5-E.9E.3** |

**Follow-up (nicht in 9E.2):** Hub-Filter in `render-posts.js` / `facet-browse.js` — Recall-Utility optional später; Navbar auf Seiten ohne `search-signals.js` nutzt weiterhin Legacy-`ilike` (Synonym-Recall nur mit vollem Corpus).

---

## P5-E.9E.3 — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Strategiedokument | `docs/architecture/p5-search-db-strategy.md` |
| Architektur-Vergleich | A–F (Client, FTS posts, search_documents, MV, RPC, extern) |
| MVP-Empfehlung | `search_documents` + `bl_search_public_content` + FTS |
| Full Launch | `search_synonyms`, trgm, evidence boost, rate-limit |
| Data Contract | Normalisierte Felder + Exclude-Regeln dokumentiert |
| Ranking/Synonym/RLS | Parität mit `BoundLoreSearchRecall` (9E.2) |
| Migration Risks | 12 Risiken mit Gegenmaßnahmen |
| Verification Plan | Fixture-Baseline + Staging/Production Gates |
| SQL ausgeführt | **Nein** |
| DB Search Strategy | **DOCUMENTED** |
| Search Runtime Evidence | **PARTIAL** (42501 profiles blockiert Corpus) |
| S-06 | **OPEN_BLOCKING** |

**Empfohlener nächster Gate:** Persistenter published Corpus + P5-E.9E.4 Re-run

---

**Empfohlener nächster Gate:** **P5-E.9F.1** — S-05 SEO/CSR Entity Pages Closure Plan

---

## P5-E.9E.5J — Umsetzungsnachweis (PASS — S-06 Final Search Closure Dossier)

| Item | Ergebnis |
|------|----------|
| Report | `p5-s06-final-search-closure-dossier.md` |
| HEAD vor Gate | `68c92b1` |
| Arbeitsmodus | Nur lokales Repo. Dossier/Dokumentation/QA-Matrix. Kein SQL/DB-Read/DB-Write |
| Staging Evidence (4M) | **STAGING_CLOSED** |
| Legacy Evidence (5D–5I) | **COMPLETE** — widerspruchsfrei |
| S-06 Search Recall | **CLOSED** |
| S-06 Final Status | **CLOSED_SEARCH_EVIDENCE** |
| Legacy Search Runtime Readiness | **READY_FOR_SEPARATE_PRODUCTIVE_CUTOVER_GATE** |
| Final Runtime Config | **STAGING** (`jzzgoiwfbuwiiyvwgwri`) |
| Produktiver Runtime-Switch / Push / Deploy / Launch | **Nein** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |
| P5-E.9E.5J | **PASS** |

**Empfohlener nächster Gate:** **P5-E.9F.1** — S-05 SEO/CSR Entity Pages Closure Plan

---

## P5-E.9E.5I — Umsetzungsnachweis (PASS — Legacy Runtime Config Cutover Dry Run)

| Item | Ergebnis |
|------|----------|
| Report | `p5-legacy-runtime-cutover-dry-run-report.md` |
| HEAD vor Gate | `bea85f3` |
| Fixture Matrix | **32/32 PASS** |
| Temporäre Patches revertiert | **Ja** |
| Cutover-Delta | Temporäre `isRpcAvailable()`-Erweiterung (revertiert) |
| Final Runtime Config | **STAGING** |
| Legacy RPC-first Search (5H) | **INTACT** |
| Rebuild / Writes / produktiver Runtime-Switch | **Nein** |
| S-06 Final Status | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |
| P5-E.9E.5I | **PASS** |

**Empfohlener nächster Gate:** **P5-E.9E.5J** — S-06 Final Closure Dossier

---

## P5-E.9E.5H — Umsetzungsnachweis (PASS — Legacy RPC-first Search Verification)

| Item | Ergebnis |
|------|----------|
| Report | `p5-legacy-rpc-first-search-verification-report.md` |
| Core Query Matrix | **12/12 PASS** |
| Safety / Exclusion | **10/10 PASS** |
| RPC Output Contract | **PASS** |
| Legacy RPC-first Search Verification | **VERIFIED_PASS** |
| `search_documents` rows | **6** (unverändert) |
| Rebuild / Writes / Runtime-Switch | **Nein** |
| S-06 Final Status | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |
| P5-E.9E.5H | **PASS** |

**Empfohlener nächster Gate:** **P5-E.9E.5I** — Legacy Runtime Config Cutover Dry Run

---

## P5-E.9E.5G — Umsetzungsnachweis (PASS — Legacy Content Filter + Rebuild)

| Item | Ergebnis |
|------|----------|
| Report | `p5-legacy-content-filter-rebuild-report.md` |
| Rebuild | **6** Zeilen |
| Legacy Search Index State | **POPULATED** |
| RPC Smoke | **PASS** |
| Content-Row-Writes | **Nein** |
| S-06 Final Status | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |
| P5-E.9E.5G | **PASS** |

**Empfohlener nächster Gate:** **P5-E.9E.5H** — Legacy RPC-first Search Verification

---

## P5-E.9E.5C — Umsetzungsnachweis (PASS — Final Target Decision)

| Item | Ergebnis |
|------|----------|
| Report | `p5-final-target-decision.md` |
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| P5-E.9E.5C | **PASS** |

---

## P5-E.9E.5B — Umsetzungsnachweis (PASS — Read-only Inventory)

| Item | Ergebnis |
|------|----------|
| Report | `p5-production-legacy-readonly-inventory-report.md` |
| Legacy Search-Objekte | **Fehlen** |
| Final Target Suitability | **NEEDS_MIGRATION_DECISION** |
| P5-E.9E.5B | **PASS** |

---

## P5-E.9E.5A — Umsetzungsnachweis (PASS — Cutover Plan)

| Item | Ergebnis |
|------|----------|
| Report | `p5-production-legacy-target-cutover-plan.md` |
| Production / Legacy Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| Search Promotion to Final Target | **PLANNED** (5E–5G) |
| P5-E.9E.5A | **PASS** |
| DB-Zugriff / SQL / Write | **Nein** |

**Empfohlener nächster Gate:** **P5-E.9E.5G** — Legacy Content Cleanup + Rebuild

---

## P5-E.9E.4M — Umsetzungsnachweis (PASS — S-06 Staging Dossier)

| Item | Ergebnis |
|------|----------|
| Report | `p5-s06-staging-search-evidence-closure-dossier.md` |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| P5-E.9E.4M | **PASS** |

---

## P5-E.9E.4L — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Report | `p5-staging-marker-deindex-fix-report.md` |
| MARKER_DEINDEX_STAGING_PASS | **PASS** |
| MARKER_SEARCHABLE_RISK | **CLOSED_STAGING** |
| P5-E.9E.4L | **PASS** |

---

## P5-E.9E.4K — Umsetzungsnachweis (PASS — Plan)

| Item | Ergebnis |
|------|----------|
| Report | `p5-marker-searchability-mitigation-plan.md` |
| MARKER_SEARCHABLE_RISK | **OPEN** |
| Empfohlener Fix-Gate | **P5-E.9E.4L** |
| P5-E.9E.4K | **PASS** |

---

## P5-E.9E.4J — Umsetzungsnachweis (PASS — Read-only Re-run)

| Item | Ergebnis |
|------|----------|
| Report | `p5-persistent-staging-search-rerun-report.md` |
| Persistent Staging Search Re-run | **PARTIAL** (MARKER_SEARCHABLE_RISK) |
| Query-Matrix | **27/27 PASS** |
| Search DB/FTS Runtime Evidence | **STAGING_PASS** |
| P5-E.9E.4J | **PASS** |

---

## P5-E.9E.4I — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Report | `p5-staging-persistent-canonical-corpus-seed-report.md` |
| Persistent Canonical Corpus | **PERSISTENT_CANONICAL_SEED_PASS** |
| Search DB/FTS Runtime Evidence | **PASS** |
| Query-Matrix | **21/21 PASS** |
| P5-E.9E.4I | **PASS** |

---

## P5-E.9E.4H — Umsetzungsnachweis (PASS — Plan)

| Item | Ergebnis |
|------|----------|
| Report | `p5-search-production-content-migration-plan.md` |
| P5-E.9E.4H | **PASS** |
| Empfohlener Write-Gate | **P5-E.9E.4I** |

---

## P5-E.9E.4G — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Report | `p5-staging-rpc-corpus-verification-report.md` |
| RPC Corpus Verification | **RPC_CORPUS_VERIFIED_CLEANED** |
| Search DB/FTS Runtime Evidence | **PASS** |
| P5-E.9E.4G | **PASS** |

---

## P5-E.9E.4F — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Report | `p5-search-client-rpc-integration-report.md` |
| Client RPC Integration | **RPC_CLIENT_INTEGRATED** |
| P5-E.9E.4F | **PASS** |

---

## P5-E.9E.4A — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Report | `p5-search-db-fts-staging-apply-report.md` |
| Search DB/FTS | **APPLIED_STAGING_PASS** |
| DB/FTS Evidence | **PARTIAL_EMPTY_CORPUS** |
| P5-E.9E.4A | **PASS** |

---

## P5-E.9E.4E — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Report | `p5-staging-search-corpus-populate-report.md` |
| Corpus Populate | **POPULATED_VERIFIED_CLEANED** |
| Search Runtime Evidence | **PASS** |
| P5-E.9E.4E | **PASS** |

---

## P5-E.9E.4D — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Apply Report | `p5-posts-rls-policy-dependency-fix-report.md` |
| Fix Status | **APPLIED_STAGING_PASS** |
| Search Runtime Evidence | **PARTIAL** |
| P5-E.9E.4D | **PASS** |

---

## P5-E.9E.4C — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Read Path Fix Draft | `p5-staging-search-read-path-fix-draft.md` |
| Root Cause | **CONFIRMED_STATIC** — RLS Policy Dependency |
| Code-only Fix | **Nicht ausreichend** |
| Search Runtime Evidence | **PARTIAL** / **BLOCKED_UNTIL_FIX** |
| P5-E.9E.4C | **PASS** |

---

## P5-E.9E.4 Re-run — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Query Matrix | 14 Queries — read-only |
| Staging Runtime | `STAGING_REF_VERIFIED` |
| Search Runtime Evidence | **PARTIAL** |
| P5-E.9E.4 Re-run | **PASS** |

---

## P5-E.9E.4B — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Report | `p5-staging-runtime-config-report.md` |
| Staging Runtime Config | **STAGING_RUNTIME_CONFIG_PASS** |
| Fixture | 21/21 PASS |
| P5-E.9E.4 Re-run | **READY** |
| P5-E.9E.4B | **PASS** |

---

## P5-E.9E.4 — Umsetzungsnachweis (BLOCKED)

| Item | Ergebnis |
|------|----------|
| Report | `docs/architecture/p5-staging-search-verification-report.md` |
| Staging Ref in Runtime | **NEIN** — `supabase-config.js` → Legacy |
| Lokale Fixtures | 92/92 + 98/98 PASS |
| Wiki Query Matrix | **SKIP** (STOPP) |
| Search Runtime Evidence | **FAIL** |
| P5-E.9E.4 | **BLOCKED** |

---

## P5-E.9E.3B — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Static Review | `docs/architecture/p5-search-sql-static-review.md` |
| SQL Draft Status | **DRAFT_ONLY_REVIEWED** |
| SECURITY DEFINER | **REVIEW_REQUIRED** — INVOKER empfohlen |
| SQL ausgeführt / DB-Zugriff | **Nein** |
| P5-E.9E.3B | **PASS** |
| Nächster Gate | **P5-E.9E.4** |

---

## P5-E.9E.3A — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| SQL Draft | `docs/architecture/p5-search-sql-draft.md` |
| DRAFT ONLY | Ja — nicht ausführbar |
| Migration | **Nein** |
| SQL Draft Status | **DRAFT_ONLY_REVIEWED** |
| P5-E.9E.3A | **PASS** |

---

*Dokumentversion: P5-E.9E PASS + … + P5-E.9E.4E PASS. Search Runtime Evidence PASS.*
