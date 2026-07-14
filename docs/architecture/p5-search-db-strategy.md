# P5-E.9E.3 — Search DB Strategy

**Gate:** P5-E.9E.3 — Search DB Strategy (planning/analysis only). **PASS**.

**HEAD vor Gate:** `1e0e769` — Harden client search recall

**Arbeitsmodus:** Nur lokales Repo. Kein SQL Apply. Kein SQL ausführen. Kein DB-Read/Write. Keine Supabase-Verbindung. Kein Storage-Apply. Kein Push. Kein Deploy. Kein Launch. Keine Search-Console-Aktion. Keine `.env`-Änderungen. Keine Migration-Datei erstellt.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.3** | **PASS** (Strategie dokumentiert) |
| **P5-E.9E.3A** | **PASS** |
| **P5-E.9E.3B** | **PASS** |
| **SQL Draft Status** | **DRAFT_ONLY_REVIEWED** |
| **DB Search Strategy** | **DOCUMENTED** |
| **Search Client Recall** | **CLIENT_RECALL_HARDENED** (P5-E.9E.2) |
| **Search Implementation** | **PARTIAL** — Client gehärtet; DB-Index fehlt |
| **Search DB/FTS UI Integration** | **RPC_CLIENT_INTEGRATED** (9E.4F) |
| **Search DB/FTS Evidence** | **PARTIAL_EMPTY_CORPUS** |
| **S-06 Search Recall** | **OPEN_BLOCKING** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** (separater Blocker) |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |
| **Production Closure** | **NOT CLOSED** |

**Kernaussage:** BoundLore sollte für MVP und Full Launch eine **dedizierte, normalisierte Public-Search-Schicht** einführen — bevorzugt **`search_documents` + RPC `bl_search_public_content`**, mit **Postgres FTS (`tsvector`)** und optional **`pg_trgm`** (bereits im Schema für Observations vorhanden). Die clientseitige `BoundLoreSearchRecall`-Utility (9E.2) bleibt als **Ergänzung, Synonym-Fallback und Fixture-Baseline**; die DB liefert die **vollständigere Trefferbasis**, bessere Skalierung und **fail-closed RLS/Release-Gate-Kontrolle**. **Kein SQL in diesem Gate.** Apply erst über explizite Folge-Gates mit Backup und Staging-Freigabe.

**Empfohlener nächster Gate:** Staging Corpus Populate oder **P5-E.9E.4A** (STOPP)

---

**Empfohlener nächster Gate:** **P5-E.9E.4L** — Staging Marker Deindex Fix

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
| Search DB/FTS Evidence | **PASS** (12 search_documents) |
| Search DB/FTS Runtime Evidence | **PASS** |
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
| Populate | **POPULATE_EMPTY_CORPUS** |
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
| Report | `p5-posts-rls-policy-dependency-fix-report.md` |
| Posts RLS Fix | **APPLIED_STAGING_PASS** |
| 42501 profiles/posts | **Behoben** |
| Search Runtime Evidence | **PARTIAL** (0 published posts) |
| P5-E.9E.4D | **PASS** |

---

## P5-E.9E.4C — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Draft | `p5-staging-search-read-path-fix-draft.md` |
| Root Cause | RLS `posts` SELECT-Policies mit `profiles` Invoker-Subquery |
| Client Select Pruning für Search | **Nicht nötig** — bereits ohne `profiles` |
| DB-Fix erforderlich | **Ja** — Option F (RLS Policy Refactor) |
| P5-E.9E.4C | **PASS** |

---

## P5-E.9E.4 Re-run — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Report | `p5-staging-search-verification-report.md` (Re-run Abschnitt) |
| Query Matrix | 14 Queries ausgeführt |
| Staging Runtime | `STAGING_REF_VERIFIED` |
| Recall-Treffer | 0/11 — `42501 profiles` blockiert Corpus |
| Search Runtime Evidence | **PARTIAL** |
| P5-E.9E.4 Re-run | **PASS** |

---

## P5-E.9E.4B — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Report | `docs/architecture/p5-staging-runtime-config-report.md` |
| Staging Runtime Config | **STAGING_RUNTIME_CONFIG_PASS** |
| Fixture | 21/21 PASS |
| P5-E.9E.4 Re-run | **READY** |
| Search Runtime Evidence | **FAIL_UNTIL_RERUN** |
| P5-E.9E.4B | **PASS** |

---

## P5-E.9E.4 — Umsetzungsnachweis (BLOCKED)

| Item | Ergebnis |
|------|----------|
| Verification Report | `docs/architecture/p5-staging-search-verification-report.md` |
| Staging Ref dokumentiert | `jzzgoiwfbuwiiyvwgwri` — MCP URL bestätigt |
| Staging Ref in Client-Runtime | **NEIN** — `js/supabase-config.js` → Legacy `ohkoojpzmptdfyowdgog` |
| Wiki Query Matrix | **NICHT AUSGEFÜHRT** (STOPP) |
| Lokale Fixtures | **92/92 + 98/98 PASS** |
| Search Runtime Evidence | **FAIL** |
| P5-E.9E.4 | **BLOCKED** |
| Nächster Gate | **P5-E.9E.4 Re-run** |

---

## P5-E.9E.3B — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| Static Review Document | `docs/architecture/p5-search-sql-static-review.md` |
| SQL Draft Status | **DRAFT_ONLY_REVIEWED** |
| SECURITY DEFINER (Public-RPC) | **REVIEW_REQUIRED** → INVOKER empfohlen |
| Apply-Ready | **Nein** — BLOCKING_BEFORE_APPLY Findings offen |
| SQL ausgeführt | **Nein** |
| DB/Supabase-Zugriff | **Nein** |
| Migration erstellt | **Nein** |
| P5-E.9E.3B | **PASS** |
| Nächster Gate | **P5-E.9E.4** (Nutzerfreigabe) |

---

## P5-E.9E.3A — Umsetzungsnachweis (PASS)

| Item | Ergebnis |
|------|----------|
| SQL Draft Document | `docs/architecture/p5-search-sql-draft.md` |
| Markierung | **DRAFT ONLY — DO NOT APPLY** |
| Nicht in `supabase/migrations/` | Bestätigt (Ordner existiert nicht) |
| Enthält | `search_documents`, `search_vector`, RLS, `bl_search_public_content` |
| SQL ausgeführt | **Nein** |
| SQL Draft Status | **DRAFT_ONLY_REVIEWED** |
| Nächster Gate | **P5-E.9E.4** Staging Verification |

---

*Dokumentversion: P5-E.9E PASS + … + P5-E.9E.4D PASS. Search Runtime Evidence PARTIAL. Kein DB-Write.*

---

## HEAD / Working Tree / No-Apply-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `1e0e769` |
| SQL ausführen / SQL Apply | **Nein** |
| DB-Read / DB-Write / Supabase-Verbindung | **Nein** |
| Migration-Datei erstellt | **Nein** |
| Storage Apply | **Nein** |
| Push / Deploy / Launch | **Nein** |
| Search Console / SEO Provider | **Nein** |
| `.env` geöffnet / geändert | **Nein** |
| Dumps / Backups geöffnet | **Nein** |

---

## Current Status

| Item | Status |
|------|--------|
| Client Recall (9E.2) | **CLIENT_RECALL_HARDENED** — `js/search-recall-utils.js`, 92/92 Fixture |
| Local Recall Fixture (9E.1) | **LOCAL_RECALL_FIXTURE_PASS** — 98/98 |
| Produktive Datenladung | `js/search.js` → `supabase.from("posts").select(...).limit(500)` |
| Produktives Ranking | Client: `BoundLoreSearchRecall` + `BoundLoreSearchSignals` |
| DB FTS / `search_documents` | **Nicht vorhanden** |
| Runtime Evidence | **OPEN** — `/wiki/search/?q=monster` ohne lokale DB-Daten → 0 Live-Treffer erwartbar |
| S-06 | **OPEN_BLOCKING** bis Staging/Production-Verifikation |

---

## Current Search Limitations

Aus `p5-search-recall-plan.md`, `search-architecture.md`, `js/search.js` und Schema-Review (`supabase/core_schema_foundation.sql`):

1. **Fetch-Limit 500:** Client lädt maximal 500 `published` Posts; kein serverseitiges Query-Matching über den gesamten Korpus.
2. **Kein DB-FTS:** Kein `tsvector`, kein dedizierter Search-Index auf `posts` (nur `pg_trgm` auf `wiki_observations.entity_name`).
3. **BLMETA-Parsing clientseitig:** Signale werden im Browser aus `posts.content` extrahiert — teuer, inkonsistent bei großen Datenmengen, abhängig von vollständigem Content-Fetch.
4. **Alias-Quellen fragmentiert:** Aliases in BLMETA (`entity_profile`) und separat in `wiki_entity_aliases` — Client nutzt primär BLMETA; DB-Alias-Tabelle nicht in Search-Pipeline integriert.
5. **Synonyme nur clientseitig:** `BoundLoreSearchRecall.SYNONYM_MAP` — wirkt nur auf bereits geladene Records; Navbar-Legacy-Pfad (`ilike` title/excerpt) ohne volles Corpus profitiert nicht.
6. **RLS auf `posts`:** Anon/authenticated sehen `published` + `deleted_at IS NULL`; Autoren sehen eigene `pending`. Search muss **keine pending/draft** Leaks über Views/RPC erzeugen.
7. **Release-Gate:** `release_gate.contribution_locked` blockiert Writes; Search-RPC darf Reads nicht als Write-Bypass nutzen und muss bei Lock weiterhin nur Public Published liefern.
8. **Keine Kommentare/Reports/Notifications** in MVP-Search — Tabellen existieren (`comments`, `reports`, `notifications`, `admin_actions`).
9. **SSG-Statik außerhalb `posts`:** Fixture-SSG-Seiten nicht suchbar — separates SEO/Index-Thema (S-05).
10. **Performance:** Vollständiger Content-Fetch für 500 Posts + Client-Parsing skaliert schlecht; Body-Snippets riskieren HTML-Leak ohne Sanitization.

---

## Candidate DB Search Architectures

| Option | Recall-Wirkung | Ranking-Kontrolle | RLS-Kompatibilität | Release-Gate-Kompatibilität | Aufwand | Risiko | MVP-Eignung | Full-Launch-Eignung | Empfehlung |
|--------|----------------|-------------------|--------------------|-----------------------------|---------|--------|-------------|----------------------|------------|
| **A. Status quo: Client + Supabase Read** | Mittel (mit 9E.2 besser lokal) | Hoch (Client) | Gut (nutzt `posts` RLS) | Gut (nur Reads) | **Niedrig** (fertig) | Niedrig | Übergang | **Nein** (Skalierung) | Behalten als Fallback bis DB live |
| **B. Postgres FTS direkt auf `posts`** | Hoch | Mittel | Mittel (View-Leak-Risiko) | Mittel | Mittel | Mittel–Hoch | Ja (minimal) | Mittel | Akzeptabel als Phase 0, nicht Zielbild |
| **C. Dedizierte Tabelle `search_documents`** | **Sehr hoch** | **Hoch** | **Hoch** (eigene RLS) | **Hoch** | Mittel–Hoch | Mittel | **Ja (empfohlen)** | **Ja** | **MVP-Ziel** |
| **D. Materialized View `search_documents_mv`** | Hoch | Hoch | Mittel (MV + RLS komplex) | Mittel | Mittel | Mittel–Hoch | Ja (read-only MVP) | Ja | Alternative wenn Sync vermieden werden soll |
| **E. RPC `bl_search_public_content`** | **Sehr hoch** | **Hoch** | **Sehr hoch** (SECURITY DEFINER kontrolliert) | **Sehr hoch** | Mittel–Hoch | Mittel | **Ja (empfohlen)** | **Ja** | **MVP-Ziel (API-Schicht)** |
| **F. Externer Search Provider** | Sehr hoch | Hoch | Niedrig (Sync/RLS) | Niedrig | Hoch | Hoch | **Nein** | Optional später | **Nicht MVP** |

### Kurzbewertung je Option

**A — Status quo:** Ausreichend für Entwicklung und Fixture-Gates; nicht final für Public Launch wegen Limit, Latenz und fehlender serverseitiger Recall-Basis.

**B — FTS auf `posts`:** Schnellster DB-Einstieg (`to_tsvector(title || excerpt || sanitized_body)`). Nachteil: enge Kopplung an `posts`-Schema, BLMETA-Extraktion in Generated Column oder Trigger nötig, schwerer zu versionieren als dedizierte Search-Schicht.

**C — `search_documents`:** Normalisierte Suchdokumente pro published canonical entity/post. Ermöglicht gewichtete Felder, `is_public`-Flag, Refresh-Jobs, unabhängige Index-Pflege. **Empfohlene Kernstruktur.**

**D — Materialized View:** Ableitung aus `posts` + `wiki_entity_aliases` ohne separaten Write-Path. Vorteil: keine Drift durch vergessene Sync-Calls. Nachteil: `REFRESH MATERIALIZED VIEW` Timing, Concurrent Refresh, RLS auf MV in Postgres eingeschränkt — oft über RPC statt direkter MV-SELECT.

**E — RPC:** Zentrale fail-closed API; kann Release-Gate, Status-Filter, Synonym-Expansion (statisches Dictionary), gewichtetes Ranking und sanitized Snippets kapseln. Passt zu bestehendem Muster (`bl_register_observation`, `bl_set_release_gate_locked`). **Empfohlen als einziger Public-Search-Einstieg.**

**F — Externer Provider:** Datenschutz (Community-Inhalte, keine PII), Kosten, Vendor Lock-in, Sync-Latenz. Erst nach Full Launch und expliziter Privacy-Freigabe.

---

## Recommended MVP DB Search Architecture

**Zielbild MVP (locked MVP / Pre-Launch):**

```
published posts (+ wiki_entity_aliases)
        │
        ▼
  Index Builder (Trigger / scheduled job / admin refresh)
        │
        ▼
  search_documents (normalized, is_public=true only)
        │
        ▼
  bl_search_public_content(query, filters, limit)
        │
        ▼
  js/search.js (optional client re-rank via BoundLoreSearchRecall)
```

### MVP-Komponenten

| Komponente | Rolle |
|------------|-------|
| **`search_documents`** | Kanonische Public-Search-Zeile pro suchbarem published Post/Entity-View |
| **`search_vector`** | `tsvector` aus gewichteten Feldern (title A, aliases A, slug A, facets B, excerpt B, search_text C) |
| **`bl_search_public_content`** | Einziger Public-RPC; `SECURITY DEFINER` mit `search_path = public`; fail-closed |
| **Client `BoundLoreSearchRecall`** | Leichte Synonym-/Snippet-Härtung; Fallback wenn RPC fehlt oder degraded |
| **Kein Kommentar-/Report-Index** | MVP explizit ausgeschlossen |

### MVP-Refresh-Strategie

1. **On-publish / on-approve:** Trigger oder Hook nach Status `pending` → `published` aktualisiert `search_documents`.
2. **On-delete/archive:** Zeile entfernen oder `is_public = false`.
3. **Batch rebuild:** Admin-only RPC `bl_rebuild_search_documents()` für Staging/Recovery (nicht im MVP-UI).
4. **Kein Realtime-Sync** im MVP — akzeptable Staleness bis Full Launch.

### Warum nicht nur FTS auf `posts`?

- `posts.content` enthält rohes HTML + BLMETA-Kommentar — nicht such- oder snippet-tauglich ohne Extraktion.
- `wiki_entity_aliases` liegt relational — Join/Union in View komplexer als materialisierte Search-Zeile.
- Ranking-Gewichte (title > alias > body) sind in dedizierter Tabelle einfacher als ad-hoc FTS-Ranking auf heterogenem `posts`.

---

## Recommended Full Launch Search Architecture

Aufbauend auf MVP:

| Erweiterung | Zweck |
|-------------|-------|
| **`search_synonyms`** Tabelle | Moderator-kuratierte Synonyme (`monster` → `creature`), versioniert |
| **`pg_trgm` auf `search_text`** | Fuzzy/Typo-Toleranz (Extension bereits in `core_schema_foundation.sql`) |
| **Inbound-Relation-Index** | „items using Ember Shard“ — derived `relations_summary` + inverse labels |
| **Evidence-/Completeness-Boost** | `evidence_tier`, `completeness` als D-Gewicht (Ranking-Multiplikator, kein Hard-Filter) |
| **Compound-Intent im RPC** | Serverseitige Parser-Hints (Facet, usage, relation) analog `search-query-parser.js` |
| **Rate-Limit / Abuse** | RPC-Throttle + `BoundLoreErrorReporter` Security-Events (ohne rohe Query zu loggen) |
| **SSG-URL-Feld** | `canonical_url` bevorzugt `/wiki/post/<slug>/` wenn SSG existiert (S-05 Abhängigkeit) |
| **Concurrent MV Refresh** | Falls MV gewählt: `REFRESH MATERIALIZED VIEW CONCURRENTLY` + Monitoring |
| **Optional externer Provider** | Nur nach Privacy-Review — nicht Default |

---

## Search Document Data Contract

Normative Felder für `search_documents` (Tabelle oder äquivalente View):

| Feld | Typ (konzeptionell) | Pflicht | Quelle | Hinweis |
|------|---------------------|---------|--------|---------|
| `id` | uuid | ja | gen | PK |
| `source_type` | text | ja | abgeleitet | `post`, `entity_view` |
| `source_id` | uuid | ja | `posts.id` | FK |
| `canonical_slug` | text | ja | `posts.slug` | unique pro public doc |
| `canonical_url` | text | ja | abgeleitet | `/wiki/post/<slug>/` bevorzugt |
| `title` | text | ja | `posts.title` | A-Gewicht |
| `excerpt` | text | nein | `posts.excerpt` | B-Gewicht; sanitized |
| `search_text` | text | ja | sanitized body + summaries | C-Gewicht; **kein HTML** |
| `aliases` | text[] | nein | BLMETA + `wiki_entity_aliases` | A-Gewicht |
| `category` | text | nein | `posts.category` | B-Gewicht |
| `entity_domain` | text | nein | BLMETA | B-Gewicht |
| `entity_subtype` | text | nein | BLMETA | B-Gewicht |
| `facets` | jsonb | nein | BLMETA `facets` | B-Gewicht; flattened für FTS |
| `tags` | text[] | nein | BLMETA | B-Gewicht |
| `relations_summary` | text[] | nein | abgeleitet | C-Gewicht |
| `status` | text | ja | immer `published` in Index | Filter |
| `published_at` | timestamptz | nein | `posts.created_at` / `updated_at` | Tie-breaker |
| `updated_at` | timestamptz | ja | `posts.updated_at` | Staleness / Tie-breaker |
| `rank_weight` | numeric | nein | completeness/evidence | D-Gewicht |
| `is_public` | boolean | ja | abgeleitet | `true` nur wenn alle Gates pass |
| `is_canonical` | boolean | nein | `posts.is_entity_view` | Canonical bevorzugen |
| `search_vector` | tsvector | ja (MVP) | generated | weighted FTS |
| `language` | text | nein | default `simple` | FTS config |
| `content_origin` | text | nein | BLMETA | **nur** für Exclude (`qa`, `test`) |
| `evidence_tier` | text | nein | BLMETA | D-Gewicht |
| `completeness` | text | nein | BLMETA | D-Gewicht |

### Exclude-Regeln (`is_public = false` oder nicht indexieren)

| Kriterium | Quelle | Abgestimmt mit Client (9E.2) |
|-----------|--------|------------------------------|
| `status != 'published'` | `posts.status` | ja |
| `deleted_at IS NOT NULL` | `posts` | ja |
| `content_origin` ~ qa/test/prototype_fixture | BLMETA | ja |
| Slug `^qa-`, `^test-`, `^fixture-` | `posts.slug` | ja |
| Slug `^contribution-` | `posts.slug` | ja |
| Title `^Contribution:` | `posts.title` | ja |
| Tag `exclude_public` | BLMETA tags | ja |
| `admin_locked` + nicht published | optional | prüfen in 9E.3A |
| Kommentare, Reports, Notifications, `admin_actions` | — | **MVP: nie indexieren** |

### BLMETA-Handling

- **Intern:** Parser extrahiert `entity_domain`, `entity_subtype`, `facets`, `tags`, `discovery_relations` → normalisierte Signale.
- **Niemals:** Roher `<!--BLMETA {...}-->` in RPC-Response, Snippets oder `search_text`.
- **Parität:** Index-Builder-Logik soll `BoundLoreSearchRecall.postToRecallRecord()` als Referenz nutzen (9E.3A Draft).

### PII / Privacy

- Keine `author_id`, E-Mails, `profiles`-Felder in Search-Output.
- Keine User-Namen in Snippets unless explizit im public title (selten).
- Keine `reports`, `screenshot_url`, interne Moderationsnotizen.

---

## Ranking / Weighting Strategy

Abgestimmt auf `BoundLoreSearchRecall.WEIGHTS` (9E.2):

| Tier | Felder | Referenz-Gewicht (Client) | DB-FTS-Äquivalent |
|------|--------|---------------------------|-------------------|
| **A** | `title`, `canonical_slug`, `aliases` | 100 / 65 / 70 | `setweight(..., 'A')` |
| **B** | `category`, `entity_domain`, `entity_subtype`, `excerpt`, `facets`, `tags` | 55 / 40 / 35 | `setweight(..., 'B')` |
| **C** | `search_text` (sanitized body), `relations_summary` | 25 / 20 | `setweight(..., 'C')` |
| **D** | interne BLMETA-Signale, `evidence_tier`, `completeness` | 15 | `setweight(..., 'D')` oder Multiplikator |

### Ranking-Regeln

1. **Exact title match** vor **title token** vor **alias** vor **slug** vor **category/domain** vor **excerpt/facets** vor **body** vor **relations** vor **D-Signale**.
2. **Alias** vor **body-only** (Fixture: `night-beast` vs. Fließtext-Erwähnung).
3. **Canonical / `is_entity_view`** vor Duplikat-/Contribution-Views.
4. **`published_at` / `updated_at`** als stabiler Tie-Breaker.
5. **Draft/Pending/QA** — harter Ausschluss, kein Score.
6. **Snippets:** DB liefert nur `excerpt` oder truncated `search_text` (max ~140 Zeichen), HTML-escaped oder plain text only; finale Darstellung clientseitig via `renderSafeSnippet`.

### Synonym-Integration im Ranking

- Synonym-Expansion erweitert **Query-Tokens**, nicht indexierte Titel.
- Treffer über Synonym (`monster` → `creature` in `entity_subtype`) erhalten **B/C-Gewicht**, nicht A — außer Alias-Feld enthält expliziten Synonym-Eintrag (selten).
- Entity-Aliases aus `wiki_entity_aliases` behalten **A-Gewicht**.

---

## Synonym / Alias Strategy

### Kurzfristig (bereits 9E.2)

- Client: `BoundLoreSearchRecall.SYNONYM_MAP` — `monster/beast/mob → creature`, `artifact/tool → item`, `region/zone → biome`, etc.
- Bleibt aktiv als Fallback und für UX-Härtung nach RPC-Response.

### Mittelfristig (DB MVP)

| Mechanismus | Beschreibung |
|-------------|--------------|
| **Alias-Felder** | `wiki_entity_aliases.normalized_alias` + BLMETA `entity_profile.aliases` → `search_documents.aliases` |
| **Statisches RPC-Dictionary** | Hardcoded `jsonb` Map in `bl_search_public_content` für MVP-Synonyme (gleiche Liste wie Client) |
| **`search_synonyms` Tabelle** | Full Launch: moderator-editable, versioned, ohne Deploy für neue Community-Begriffe |

### MVP-Minimum Synonyme (DB-Dictionary)

| User-Term | Expandiert zu (Suchfeld-Signal) |
|-----------|----------------------------------|
| `monster`, `monsters`, `beast`, `beasts`, `mob` | `creature` / `entity_subtype:creature` |
| `artifact`, `artifacts`, `tool`, `tools` | `item` / `trinket` |
| `region`, `regions`, `zone`, `zones` | `biome` |
| `guild`, `guilds` | `guild` (category/tag) |
| `guide`, `guides` | `guide` (`post_type`) |
| `resource`, `resources` | `resource` (`entity_subtype`) |

### Regeln

- Synonyme **erweitern Recall**, verändern **nicht** die sichtbare Query (UI zeigt escaped Original).
- **Aliases > generische Synonyme** im Ranking.
- Keine automatische Übersetzung oder LLM-Synonyme im MVP.

---

## Security / RLS / Release-Gate Constraints

### Public Search Policy

| Regel | Umsetzung |
|-------|-----------|
| Nur public published Inhalte | `is_public = true` AND `status = 'published'` in Index; RPC filtert erneut |
| Keine pending/draft für Anon | Nicht in `search_documents`; RPC ignoriert `posts` direkt |
| Release-Gate-Lock | Search ist Read-only — Lock blockiert keine Reads; RPC darf **keine** pending/contribution Daten exposen |
| Fail-closed RPC | Fehler → leere Resultate + generische Meldung; kein SQL-Detail an Client |
| RLS auf `search_documents` | `SELECT` nur wo `is_public = true`; `INSERT/UPDATE` nur via `SECURITY DEFINER` Builder |
| Kein SECURITY DEFINER ohne `search_path`** | Pattern aus `bl_register_observation` übernehmen |
| Anon + authenticated | Gleiche Public-Search-Ergebnisse; keine Autoren-Pending-Leaks via Search |
| Admin-Moderation | `admin_actions`, Reports, Notifications **nicht** suchbar |
| Audit | `release_gate_audit`-Pattern für `bl_rebuild_search_documents` / Schema-Apply |

### Bestehende Schema-Anker (read-only Review)

- `posts`: Policies `Anyone can view published posts`, `posts_select_approved` — Autoren sehen eigene pending; **Search-RPC darf nicht `posts` direkt für Anon durchreichen**.
- `wiki_entity_aliases`: `wiki_entity_aliases_read_authenticated` — Aliases nur für authenticated; **Public Search muss Aliases bereits in `search_documents` denormalisiert haben**.
- `release_gate`: `bl_is_release_unlocked()` — false = locked; Search-Reads unberührt, aber Index-Builder bei neuen Publishes pausiert oder queue'd.
- `pg_trgm`: Bereits für Observations — Wiederverwendung für Search optional, nicht zwingend MVP.

### Abuse / Rate-Limit (Full Launch)

- RPC rate limit per IP/session (Supabase Edge oder Postgres extension später).
- Max query length (z. B. 120 Zeichen); `isUnsafeQuery`-Parität mit Client.
- Keine rohen Queries in Logs (PII/Injection).

---

## Privacy / PII Constraints

| Datenklasse | In Search-Index? | Begründung |
|-------------|------------------|------------|
| Post title, excerpt, public body | Ja (sanitized) | Public Wiki-Inhalt |
| BLMETA (extrahiert) | Ja (normalisiert) | Interne Signale only |
| BLMETA (roh) | **Nein** | Security + UX |
| `author_id`, Profile, E-Mail | **Nein** | PII |
| Kommentare | **Nein** (MVP) | Nicht moderations-/privacy-geprüft für Search |
| Reports / Screenshots | **Nein** | Moderation |
| Notifications | **Nein** | User-private |
| QA/Test/Fixture Slugs | **Nein** | Public Launch Qualität |

---

## Migration Risk Assessment

| Risiko | Schwere | Ursache | Gegenmaßnahme | Benötigte Evidence |
|--------|---------|---------|---------------|-------------------|
| RLS-Lücke via View/RPC | **Kritisch** | `SECURITY DEFINER` zu breit; direkter `posts`-SELECT | Dedizierte `search_documents`; RPC fail-closed; negative Tests | 9E.3B static + 9E.4 staging negative |
| Draft/Pending-Leak | **Kritisch** | Index-Builder ohne Status-Filter | `is_public` + doppelter RPC-Filter | Staging: pending slug nicht findbar |
| QA/Test-Daten-Leak | **Hoch** | `content_origin`/Slug-Regeln fehlen | Gleiche Exclude-Liste wie 9E.2 | Fixture-Parität + Staging QA posts |
| Unsanitized Body/Snippet | **Hoch** | HTML in `search_text`/Response | Strip HTML serverseitig; Client `renderSafeSnippet` | XSS fixture + staging snippet inspect |
| BLMETA roh sichtbar | **Hoch** | Fehlerhafte Extraktion | Strip `<!--BLMETA-->`; never return raw content | BLMETA absence checks (9E.1/9E.2) |
| Ranking-Regression | **Mittel** | FTS-Gewichte ≠ Client | Gewichts-Parität dokumentiert; Fixture-Korpus als Baseline | 9E.4 query matrix auf Staging |
| Performance bei Wachstum | **Mittel** | Full table scan; kein Index | `GIN(search_vector)`; `limit`; EXPLAIN auf Staging | Performance smoke 9E.4 |
| Stale Index | **Mittel** | Fehlender Refresh nach Publish | Trigger + rebuild RPC + monitoring | Publish→search latency test |
| Release-Gate Bypass | **Kritisch** | RPC schreibt oder exponiert pending | Read-only RPC; keine Write-Side-Effects | Negative RLS suite |
| Legacy/Production-Verwechslung | **Kritisch** | Falscher Supabase-Ref | Staging-only Apply; `CONFIRM_ISOLATED` | P5-STAGING.2 Proof vor Apply |
| Owner/Permission (42501) | **Hoch** | Nicht-owner CREATE INDEX/RPC | Dashboard SQL Editor / owner path wie Storage-Gate | 9E.4A pre-apply backup + owner check |
| `wiki_entity_aliases` auth-only | **Mittel** | Anon sieht keine Aliases live | Denormalize in `search_documents` at index time | Anon search finds alias-only hits |

---

## Verification Plan

### Baseline (bereits vorhanden)

| Artefakt | Rolle |
|----------|-------|
| `qa/fixtures/p5-search-recall-corpus.json` | Soll-Treffer |
| `qa/fixtures/p5-search-recall-queries.json` | Query-Matrix |
| `qa/p5-search-recall-fixtures.*` | 98/98 Referenz |
| `qa/p5-search-client-hardening-fixtures.*` | 92/92 produktive Utility |

### Vor jedem SQL-Apply (STOPP)

1. ~~**P5-E.9E.3A**~~ — SQL Draft erstellt, als **DRAFT / NOT FOR APPLY** markiert. **PASS**
2. ~~**P5-E.9E.3B**~~ — Static Review: RLS, `SECURITY DEFINER`, Leakage-Patterns. **PASS** — `p5-search-sql-static-review.md`
3. Frisches **Staging-Backup** (P5-E.9B Policy).
4. Explizite **User-Apply-Freigabe**.

### Staging Runtime (P5-E.9E.4)

| Test | Erwartung |
|------|-----------|
| `monster` | ≥1 Creature-Treffer |
| `creature` | Creature-Entities |
| `night-beast` | Alias-only Treffer |
| `xylophone-veil-moss` | Body-only (wenn im Korpus) |
| `mining` | Facet-only Resource |
| `<script>alert(1)</script>` | 0 Treffer; escaped empty state |
| Draft/Pending Slugs | 0 Treffer |
| QA/Test Slugs | 0 Treffer |
| BLMETA in Snippet | nicht sichtbar |
| Admin/Report/Comment | nicht in Ergebnissen |
| Performance | RPC < 500ms bei ≤1000 docs (Richtwert) |

### Production (P5-E.9E.5)

- Erst nach 9E.4 PASS + Deploy-Freigabe.
- Read-only Smoke bevorzugt.
- Kein Search-Console-Schritt in Search-Gates.

---

## Required Future Gates

| Gate | Ziel | SQL Apply | Freigabe |
|------|------|-----------|----------|
| **P5-E.9E.3A** — Search SQL Draft | Nicht angewendeter SQL-Draft (`DRAFT ONLY`); Tabelle + RPC + RLS Skizze | **Nein** | Plan only |
| **P5-E.9E.3B** — Search SQL Static Review | RLS/RPC/Leakage grep; Parität mit 9E.2 Contract | **Nein** | **PASS** — Review only |
| **P5-E.9E.4** — Staging Search Verification | Runtime Query Matrix | Read-only | **Re-run PASS** — Evidence **PARTIAL** |
| **P5-E.9E.4B** — Staging Runtime Config | `supabase-config.js` → Staging | **Nein** | **PASS** |
| **P5-E.9E.4A** — Staging Search Apply | SQL/RPC anwenden falls nötig | **Ja (Staging only)** | **STOPP** — Backup + explizite Apply-Freigabe |
| **P5-E.9E.5** — Production Search Verification | Production Smoke | Read-only bevorzugt | **STOPP** — Production-Freigabe |

### S-06 Schließung (unverändert)

S-06 wird **CLOSED** erst nach mindestens:

1. P5-E.9E.2 **CLIENT_RECALL_HARDENED** ✅
2. P5-E.9E.3 **DOCUMENTED** ✅
3. P5-E.9E.3A + **9E.3B** (Draft + Review)
4. P5-E.9E.4 Staging Runtime PASS
5. Optional Production 9E.5 vor Public Launch

---

## Verweise

| Artefakt | Pfad |
|----------|------|
| Search Recall Plan | `docs/architecture/p5-search-recall-plan.md` |
| Search Architecture | `docs/architecture/search-architecture.md` |
| Client Recall Utility | `js/search-recall-utils.js` |
| Produktive Search | `js/search.js` |
| Posts Schema | `supabase/core_schema_foundation.sql` |
| Release Gate | `supabase/release_gate_lock.sql` |
| Entity Aliases | `wiki_entity_aliases` in Schema |
| Recall Corpus | `qa/fixtures/p5-search-recall-corpus.json` |
| Query Matrix | `qa/fixtures/p5-search-recall-queries.json` |

---

*Dokumentversion: P5-E.9E.3 PASS. Keine Secrets. Kein SQL ausgeführt. Keine DB-Verbindung. Keine Migration erstellt.*
