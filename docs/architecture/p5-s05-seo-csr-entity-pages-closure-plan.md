# P5-E.9F.1 — S-05 SEO/CSR Entity Pages Closure Plan / Revalidation

**Gate:** P5-E.9F.1 — S-05 SEO/CSR Entity Pages Closure Plan / Revalidation. **PASS**.

**HEAD vor Gate:** `a2cf8b1` — Close S06 search evidence

**Arbeitsmodus:** Nur lokales Repo. Planung/Dokumentation/QA-Matrix. Read-only/Plan-only. Kein SQL/DB-Read/DB-Write/Supabase/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9F.1** | **PASS** (Plan/Revalidation only) |
| **S-05 SEO/CSR** | **PARTIAL_TECHNICAL_EVIDENCE** |
| **S-05 Fable-5 Launch Blocker** | **OPEN_BLOCKING_REAL_CONTENT_RUNTIME** |
| **Entity SEO Technical Evidence** | **CLOSED_TECHNICAL_FIXTURE** |
| **S-06 Search Recall** | **CLOSED** |
| **S-06 Final Status** | **CLOSED_SEARCH_EVIDENCE** |
| **Final Runtime Config Status** | **STAGING** (`jzzgoiwfbuwiiyvwgwri`) |
| **Production Closure** | **NOT CLOSED** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Frühere 9D-Gates haben **robots/noindex**, **Hub-Metadata/Sitemap**, **SSG-Architekturentscheidung**, **3 Fixture-Prototyp-Seiten** und einen **Fixture-SSG-Generator** geliefert. Der **produktive Entity-Detail-Pfad** (`/wiki/post/?slug=…`) bleibt jedoch eine **CSR-Shell** ohne crawl-fähiges initiales HTML für echte Inhalte. **S-05 wird in 9F.1 nicht geschlossen.** Nächster sicherer Schritt: **P5-E.9F.2** — lokale technische SSG/SEO-Implementierung auf Fixture-Basis.

---

## HEAD / Working Tree / No-Access-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `a2cf8b1` |
| SQL ausgeführt / SQL Apply | **Nein** |
| DB-Read / DB-Write | **Nein** |
| Supabase-Verbindung | **Nein** |
| Runtime-Switch / produktiver Cutover | **Nein** |
| Push / Deploy / Launch | **Nein** |
| `.env`-Änderung / Secrets geöffnet | **Nein** |
| Final `js/supabase-config.js` | **Staging** — kein Diff |
| `js/search.js` | Unverändert |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9F.1 frei — S-05 SEO/CSR Entity Pages Closure Plan auf Basis des geschlossenen S-06 Search Evidence, read-only/plan-only, kein produktiver Runtime-Switch, kein Staging-Write, kein Push, kein Deploy, kein Launch.“

---

## Current S-05 Status

| Item | Status |
|------|--------|
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| S-06 Search Recall | **CLOSED** — nicht mehr der primäre Blocker |
| S-06 Final Status | **CLOSED_SEARCH_EVIDENCE** |
| Final Runtime Config | **STAGING** |
| Legacy Search Runtime Readiness | **READY_FOR_SEPARATE_PRODUCTIVE_CUTOVER_GATE** — nicht produktiv aktiv |
| Entity Detail SEO | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |
| Product Activation | **FAIL** |
| Production Closure | **NOT CLOSED** |

**Warum S-05 offen bleibt:** Technische Fixture-Prototypen beweisen SSG-Struktur, aber nicht den finalen Entity-SEO-/Content-/Runtime-Pfad für published Entities. CSR-Shell bleibt der Default für Live-Nutzer und Crawler ohne JS.

---

## Prior SEO/CSR Evidence Summary

| Gate | Ergebnis | Artefakt / Referenz |
|------|----------|---------------------|
| **P5-E.9D** | **PASS** — SEO/CSR Closure Plan | `p5-seo-csr-closure-plan.md` |
| **P5-E.9D.1** | **PASS** — robots/noindex Static Hardening | `robots.txt`; QA 33/33 — `p5-seo-static-hardening-fixtures.*` |
| **P5-E.9D.2** | **PASS** — Static Hub Metadata + Sitemap Hubs | `sitemap.xml` (14 URLs); QA 100/100 — `p5-seo-hub-metadata-fixtures.*` |
| **P5-E.9D.3** | **PASS** — Entity Prerender/SSG Decision | `p5-entity-prerender-ssg-decision.md` — Hybrid Build-time SSG |
| **P5-E.9D.3A** | **PASS** — Entity SSG Prototype Plan | `p5-entity-ssg-prototype-plan.md` |
| **P5-E.9D.3B** | **PASS** — Static Entity HTML Prototype | 3 Seiten unter `wiki/post/qa-ssg-*-prototype/`; QA 84/84 — `p5-entity-ssg-prototype-fixtures.*` |
| **P5-E.9D.3C** | **PASS** — Fixture SSG Generator | `scripts/build-entity-ssg-fixtures.mjs`; Node QA PASS — `p5-entity-ssg-generator-check.mjs` |
| **P5-E.9D.3D** | **OFFEN** — Entity Sitemap Integration | Nicht durchgeführt |
| **P5-E.9D.5** | **STOPP** — SEO Runtime Verification | Erfordert Deploy-Freigabe |

**Evidence-GAP (keine separaten Report-Dateien):**

| Erwarteter Report | Status | Tatsächliche Evidence |
|-------------------|--------|----------------------|
| `p5-static-entity-prototype-pages-report.md` | **GAP — Datei fehlt** | `current-code-gap-notes.md` §146; `p5-entity-ssg-prototype-plan.md`; `qa/p5-entity-ssg-prototype-fixtures.*` |
| `p5-fixture-entity-ssg-generator-report.md` | **GAP — Datei fehlt** | `current-code-gap-notes.md` §147; `scripts/build-entity-ssg-fixtures.mjs`; `qa/p5-entity-ssg-generator-check.mjs` |

**Was 9D bewiesen hat vs. was fehlt:**

| Bewiesen | Fehlt |
|----------|-------|
| robots/noindex für Admin/Auth/QA/Search | Entity-URLs in Sitemap |
| 14 statische Hub-/Legal-URLs in Sitemap | Real-content SSG für Legacy/Production Entities |
| Hybrid-SSG-Architekturentscheidung | Hydration-Layer (`post-detail-hydrate.js`) |
| 3 Fixture-Prototyp-Seiten mit vollständiger Head-Meta | CSR-Shell-Ersatz für published Slugs |
| Deterministischer Fixture-Generator | Legacy `posts` Export → Generator Pipeline |
| JSON-LD CreativeWork + BreadcrumbList auf Prototypen | Runtime SEO Verification (9D.5) |
| Public-safe Filter im Generator-Contract | 404/noindex-Härtung |

---

## Current Runtime / Search Boundary

| Dimension | Status |
|-----------|--------|
| Active Runtime | **STAGING** (`jzzgoiwfbuwiiyvwgwri`) |
| Legacy Target | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** — nicht produktiv aktiv |
| S-06 Search Recall | **CLOSED_SEARCH_EVIDENCE** — getrennt von S-05 |
| Search Index (Legacy) | 6 public-safe docs — Search-Closure, **nicht** Entity-SEO-Closure |
| SSG Prototype Pages | Fixture-only — **nicht** im Search-Corpus |
| CSR Default Route | `/wiki/post/?slug=…` — `post-detail.js` Supabase-Fetch |

**Leitplanke:** Search-Closure (S-06) beweist RPC-first Recall/Safety. Entity-SEO (S-05) erfordert statisches/prerenderbares HTML pro relevantem Entity — unabhängiger Closure-Pfad.

---

## S-05 Closure Criteria

S-05 darf erst **CLOSED** werden, wenn **alle** Kriterien erfüllt sind:

| # | Kriterium | Aktuell |
|---|-----------|---------|
| 1 | Entity Detail Pages ohne rein clientseitige CSR-Abhängigkeit crawlbar | **Nein** — CSR-Shell default |
| 2 | Jede relevante public Entity hat statisches/prerenderbares HTML | **Nein** — nur 3 Fixture-Prototypen |
| 3 | Title, description, canonical, OG/Twitter vorhanden | **Ja** — Fixture-Prototypen; **Nein** — Live CSR-Route |
| 4 | Sitemap enthält public Entity URLs | **Nein** — bewusst ausgeschlossen (9D.2/3D offen) |
| 5 | robots/noindex korrekt für Prelaunch vs. Launch getrennt | **Teilweise** — Hubs/Admin OK; Entity-CSR nicht noindex |
| 6 | Keine Draft/Pending/Deleted/QA/Test/Fixture in SEO-Ausgabe | **Ja** — Generator-Filter; **unbewiesen** für Real-Content |
| 7 | Kein BLMETA/PII/private IDs im HTML/Metadata/Sitemap | **Ja** — Prototyp-QA; Real-Content unbewiesen |
| 8 | 404/empty/fail-closed sauber | **Teilweise** — `/404.html` ohne noindex |
| 9 | Local/static verification PASS | **Teilweise** — Fixture 84/84 + Generator PASS; kein Full-Matrix Re-run |
| 10 | Production/Launch-Kontext separat | **Ja** — S-05 Closure ≠ Launch |

**Ergebnis:** **0/10 vollständig für Production-Entity-Pfad** — Fixture-Technik **3/10** als Prototyp-Evidence.

---

## Gap Analysis

| Bereich | Vorhanden | Fehlt | Status | Nächster Gate |
|---------|-----------|-------|--------|---------------|
| Entity route structure | `/wiki/post/?slug=` CSR + `/wiki/post/<slug>/` SSG-Pfad definiert | Path-based Links in JS-Generatoren | **PARTIAL** | 9F.2 |
| Static entity pages | 3 Fixture-Prototypen (`qa-ssg-*-prototype`) | Real published entities | **FIXTURE_ONLY** | 9F.2 → später Legacy Export |
| SSG generator | `build-entity-ssg-fixtures.mjs` deterministisch | Real-content Input; Hydration | **FIXTURE_ONLY** | 9F.2 |
| Real content vs fixture | Fixture JSON `p5-entity-ssg-fixtures.json` | Legacy `posts` read-only export | **GAP** | Separater Read-Gate nach 9F.2 |
| Metadata | Vollständig auf Prototypen | Auf CSR-Shell fehlend | **PARTIAL** | 9F.2 |
| Canonical URLs | Prototyp: `boundlore.com/wiki/post/<slug>/` | CSR-Query als Primary; Alias-Redirects | **PARTIAL** | 9F.2 |
| Sitemap | 14 Hub-URLs | Entity-URLs | **GAP** | 9F.2/9F.3 |
| robots/noindex | Admin/Auth/QA/Search hardened | Entity-CSR optional noindex; 404 noindex | **PARTIAL** | 9F.2 |
| Public-safe filtering | Generator-Contract + Search-Filter (S-06) | Real-content SEO filter unbewiesen | **PARTIAL** | 9F.3 → Real-Content Gate |
| Local static verification | 84/84 + Generator Node PASS | Full SEO matrix re-run | **PARTIAL** | 9F.3 |
| Legacy content compatibility | 6 indexed search slugs (S-06) | Entity SSG aus Legacy posts | **GAP** | Post-9F.2 Read/Export Gate |
| Runtime cutover dependency | S-06 CLOSED; Runtime STAGING | Productive Legacy Switch separat | **N/A für S-05** | P5-E.9H |
| Production launch dependency | — | Deploy + 9D.5 Runtime + Launch Gate | **BLOCKED** | P5-E.9J |

---

## Entity Page Strategy

| Regel | Detail |
|-------|--------|
| Keine rein clientseitige Entity-Detail-Ausgabe als S-05 Closure | CSR-Shell `/wiki/post/?slug=` allein **nicht akzeptabel** |
| Statische/prerenderbare Entity Pages bevorzugt | Hybrid SSG (9D.3) — Build-time HTML + optional Hydration |
| Zuerst fixture-/local-safe, dann real-content | 9F.2 Fixture-Härtung → später Legacy-Export-Revalidation |
| Keine private/QA/Draft Inhalte | Generator-Filter + Search-ähnliche Exclusion |
| Search-Closure getrennt | S-06 CLOSED — Entity-SEO unabhängig |
| Primary Output-Pfad | `wiki/post/<canonical_slug>/index.html` |
| CSR-Fallback bleibt | `/wiki/post/?slug=` für `?id=`, unbekannte Slugs, Auth-Views |

---

## Static Generation / SSG Strategy

| Aspekt | Strategie |
|--------|-----------|
| Generator | Deterministisch — `scripts/build-entity-ssg-fixtures.mjs` als Basis |
| Input (9F.2) | Fixture JSON — **kein DB** |
| Output | `wiki/post/<canonical_slug>/index.html` |
| Verification | Node-Check + Browser-Fixture lokal |
| Real Legacy Entities | Eigener read-only Export-Gate **nach** 9F.2 technischer Closure |
| Fixture-only Closure | S-05 kann für **technische SEO-Struktur** geschlossen werden — **nicht** für finalen Production-Content ohne Real-Content Evidence |
| Deploy | **Nein** in 9F.1–9F.3 |
| Hydration | `data-bl-ssg-hydrate="1"` vorhanden; dediziertes `post-detail-hydrate.js` **fehlt** — 9F.2 Scope |

---

## Metadata / Sitemap / Robots Strategy

| Thema | Prelaunch / Evidence | Launch |
|-------|---------------------|--------|
| Prelaunch noindex | Admin/Auth/QA/Search: hardened (9D.1) | Unverändert |
| Entity CSR-Shell | Optional `noindex` bis SSG — **empfohlen**, nicht erzwungen | SSG ersetzt Thin-Content-Risiko |
| Sitemap | 14 Hubs only — **keine** Entity-URLs | Entity canonical URLs nach 9F.2/9F.3 |
| Fixture URLs in Sitemap | **Nein** — `qa-ssg-*` bleiben ausgeschlossen | — |
| Canonical (Evidence) | `https://boundlore.com/wiki/post/<slug>/` als dokumentierte Ziel-URL | Kein Live-Schalten ohne Launch-Gate |
| robots.txt | `Disallow: /wiki/search/` etc. — Entity-Pfad **nicht** disallow | Search Console erst nach 9D.5/9J |
| 404 | Kein noindex — **Lücke** | 9F.2 optional |

---

## Content Source Strategy

| Option | Beschreibung | Bewertung 9F.1 |
|--------|--------------|----------------|
| **A — Fixture/static entity set** | `qa/fixtures/p5-entity-ssg-fixtures.json` | **Bevorzugt für 9F.2** — technische S-05 Evidence |
| **B — Legacy `wiki_entities` read-only Inventory** | Später aus Legacy DB | Plan-only — eigener Read-Gate |
| **C — Legacy real entity export/import** | JSON-Export published posts | Nach 9F.2 technischer Closure |
| **D — Staging seed entities** | 12 Staging-Canonicals (4I) | **Nicht** finaler Production-Content |
| **E — Neuer curated canonical corpus** | Manuell kuratiert | Optional später |

**Empfohlene Reihenfolge:**

```
9F.2  Fixture Generator + HTML + Metadata + Sitemap (lokal)
  ↓
9F.3  Crawl/static checks + no-leak + robots/sitemap verification
  ↓
9F.4  S-05 Closure Dossier (nur wenn Evidence reicht)
  ↓
[Separater Gate] Legacy real-content export → Generator re-run
  ↓
[Separater Gate] Launch SEO / 9D.5 Runtime / Deploy
```

---

## QA / Fixture Strategy

| Artefakt | Zweck | Status |
|----------|-------|--------|
| `qa/p5-seo-static-hardening-fixtures.*` | robots/noindex | 33/33 PASS |
| `qa/p5-seo-hub-metadata-fixtures.*` | Hub metadata | 100/100 PASS |
| `qa/p5-entity-ssg-prototype-fixtures.*` | Entity prototype DOM | 84/84 PASS (9D.3B) |
| `qa/p5-entity-ssg-generator-check.mjs` | Generator output | PASS (9D.3C) |
| **Neu in 9F.2/9F.3** | Erweiterte SEO-Matrix (sitemap, robots, no-leak, 404) | **Geplant** |

---

## Required Implementation Gates

### P5-E.9F.2 — Entity SSG / SEO Technical Closure Implementation

| Item | Detail |
|------|--------|
| **Ziel** | Lokale Fixture-basierte SSG-Härtung: Generator, HTML, Metadata, Sitemap-Integration |
| **Scope** | Erweiterung Generator; optional `post-detail-hydrate.js`; Sitemap-Entity-URLs für **nicht-QA** Fixture-Set oder dediziertes Closure-Corpus |
| **Verboten** | DB-Zugriff, Deploy, Runtime-Switch |

### P5-E.9F.3 — Entity SEO Evidence Re-run

| Item | Detail |
|------|--------|
| **Ziel** | Lokale crawl/static checks; no-leak; noindex/robots/sitemap checks |
| **Verboten** | Search Console, Deploy |

### P5-E.9F.4 — S-05 Closure Dossier

| Item | Detail |
|------|--------|
| **Ziel** | S-05 CLOSED nur wenn 9F.2 + 9F.3 Evidence ausreicht |
| **Verboten** | Launch-Freigabe implizieren |

### Danach separat

| Gate | Scope |
|------|-------|
| **P5-E.9G** | Production Closure / Release Gate Legacy Assessment |
| **Restore Evidence** | Separates Gate |
| **P5-E.9H** | Productive Runtime Cutover Plan |
| **P5-E.9I** | Product Activation Gate |
| **P5-E.9J** | Launch Readiness Gate |
| **P5-E.9D.5** | SEO Runtime Verification — **STOPP** bis Deploy-Freigabe |

---

## Risks / Non-Goals

| Risiko / Non-Goal | Bewertung |
|-------------------|-----------|
| S-05 in 9F.1 schließen | **STOPP** — nicht erlaubt |
| Entity-URLs in Sitemap ohne statisches HTML | **STOPP** |
| Fixture-Prototypen als Production-Content werten | **Nicht akzeptabel** |
| S-06 wieder öffnen | **Nicht** — bleibt CLOSED_SEARCH_EVIDENCE |
| Product Activation PASS setzen | **Nicht** |
| DB-Zugriff für Content-Export in 9F.1 | **Nicht** |
| boundlore.com Live-Schalten | **Nicht** |
| Search-Closure mit Entity-SEO vermischen | **Getrennt halten** |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9F.1 | **PASS** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| S-06 Search Recall | **CLOSED** |
| S-06 Final Status | **CLOSED_SEARCH_EVIDENCE** |
| Final Runtime Config Status | **STAGING** |
| Entity SSG Technical Implementation | **FIXTURE_SSG_PASS** (9F.2) |
| Entity SEO Technical Evidence | **FIXTURE_SEO_EVIDENCE_PASS** (9F.3) |
| Local static verification | 9F.3 Re-run **12/12 PASS** + HTTP 6/6 | **FIXTURE_SEO_EVIDENCE_PASS** | — |
| Entity Sitemap (Fixture) | **FIXTURE_SITEMAP_PASS** — `qa/entity-ssg-sitemap.fixture.xml` |
| Production `sitemap.xml` Entity URLs | **EXCLUDED** (korrekt) |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** **P5-E.9F.6** — Real-Content Entity SSG Apply / Export

---

## P5-E.9F.5 Follow-up (PASS — Real-Content Entity SEO Source Inventory)

**Gate:** P5-E.9F.5. **PASS**. Source Decision: **Hybrid** (`wiki_entities` + `posts`).

**Report:** `docs/architecture/p5-real-content-entity-seo-source-inventory-report.md`

---

## P5-E.9F.4 Follow-up (PASS — S-05 Closure Dossier / Decision)

**Gate:** P5-E.9F.4. **PASS**.

| Item | Ergebnis |
|------|----------|
| S-05 Decision | **Option B** — PARTIAL_TECHNICAL_EVIDENCE |
| Entity SEO Technical Evidence | **CLOSED_TECHNICAL_FIXTURE** |
| S-05 Fable-5 Launch Blocker | **OPEN_BLOCKING_REAL_CONTENT_RUNTIME** |
| S-06 Search Recall | **CLOSED** (unverändert) |
| Public Launch | **NO-GO** |

**Report:** `docs/architecture/p5-s05-seo-csr-closure-dossier.md`

---

## P5-E.9F.3 Follow-up (PASS — Entity SEO Evidence Re-run)

**Gate:** P5-E.9F.3. **PASS**.

| Item | Ergebnis |
|------|----------|
| Entity SEO Evidence Re-run | **FIXTURE_SEO_EVIDENCE_PASS** |
| Static SEO Check | **12/12 PASS** |
| Local HTTP/Crawl | **6/6 PASS** |
| S-05 SEO/CSR | **PARTIAL_TECHNICAL_EVIDENCE** |
| S-05 Fable-5 Launch Blocker | **OPEN_BLOCKING_REAL_CONTENT_RUNTIME** |
| Entity SEO Technical Evidence | **CLOSED_TECHNICAL_FIXTURE** |
