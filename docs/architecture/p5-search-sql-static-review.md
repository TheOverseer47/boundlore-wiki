# P5-E.9E.3B — Search SQL Static Review

**Gate:** P5-E.9E.3B — Search SQL Static Review (read-only, kein Apply). **PASS**.

**HEAD vor Gate:** `1fa4379` — Draft search SQL architecture

**Arbeitsmodus:** Nur lokales Repo. Reines Review-Gate. Kein SQL Apply. Kein SQL ausführen. Kein DB-Read/Write. Keine Supabase-Verbindung. Keine Migration. Keine `.sql`-Datei erzeugt.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.3B** | **PASS** (Review vollständig) |
| **SQL Draft Status** | **DRAFT_ONLY_REVIEWED** |
| **SECURITY DEFINER** | **REVIEW_REQUIRED** — vor Apply auf **SECURITY INVOKER** umstellen (empfohlen) |
| **Apply-Readiness** | **NICHT APPLY-READY** — BLOCKING_BEFORE_APPLY Findings offen |
| **Search Runtime Evidence** | **OPEN** |
| **S-06 Search Recall** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Der SQL-Draft in `p5-search-sql-draft.md` ist **grundsätzlich reviewfähig** und adressiert RLS, Public-Filter, fail-closed RPC und No-Leak-Output korrekt im Ansatz. **Vor Staging-Apply (9E.4A) sind jedoch BLOCKING_BEFORE_APPLY Änderungen nötig**, insbesondere: **`SECURITY DEFINER` am Public-RPC vermeiden** (INVOKER + RLS bevorzugen), **direkten Table-SELECT für Client-Rollen verhindern**, **RPC-Filter mit Client-Parität vervollständigen** (`Contribution:`-Titel, `exclude_public`-Tag), **Populate-Pfad strikt trennen**. P5-E.9E.4 (read-only Staging Verification) ist **nach Nutzerfreigabe** vorbereitbar; **9E.4A bleibt STOPP**.

---

## HEAD / Working Tree / No-Apply-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `1fa4379` |
| SQL ausführen / SQL Apply | **Nein** |
| Migration in `supabase/migrations/` | **Nein** (Ordner existiert nicht) |
| Ausführbare Search-`.sql`-Datei | **Nein** |
| DB-Read / DB-Write / Supabase-Verbindung | **Nein** |
| Storage / Push / Deploy / Launch | **Nein** |
| `.env` geöffnet / geändert | **Nein** |
| Dumps / Backups geöffnet | **Nein** |

---

## Reviewed Sources

| Quelle | Zweck |
|--------|-------|
| `docs/architecture/p5-search-sql-draft.md` | Primärer Review-Gegenstand |
| `docs/architecture/p5-search-db-strategy.md` | Strategie-Abgleich |
| `docs/architecture/p5-search-recall-plan.md` | Client-Flow / Gaps |
| `supabase/core_schema_foundation.sql` | `posts`, `wiki_entity_aliases`, RLS, `bl_extract_blmeta_json` |
| `supabase/release_gate_lock.sql` | `bl_is_release_unlocked()`, Release-Gate |
| `js/search-recall-utils.js` | Parität `isPublicSearchable`, Synonyme, Gewichte |
| `js/search.js` | Produktiver Datenpfad |
| `qa/fixtures/p5-search-recall-corpus.json` | Negative-Test-Baseline |

---

## Draft Safety Review

| Check | Ergebnis | Severity |
|-------|----------|----------|
| Draft nur unter `docs/architecture/p5-search-sql-draft.md` | **PASS** | — |
| Nicht in `supabase/migrations/` | **PASS** | — |
| Markierung `DRAFT ONLY — DO NOT APPLY` | **PASS** | — |
| Keine `.sql`-Migration erstellt | **PASS** | — |
| Kein SQL ausgeführt | **PASS** | — |
| Keine Supabase-/DB-Verbindung | **PASS** | — |
| Keine destruktiven Statements (`drop`, `truncate`, `delete`, Daten-`insert`) | **PASS** | — |

**Draft Safety Review: PASS**

---

## Object Review

| Objekt | Vorhanden | Bewertung | Anmerkung |
|--------|-----------|-----------|-----------|
| `search_documents` | Ja | **PASS** | Pflichtfelder `is_public`, `is_canonical`, `status`, `search_vector`, `canonical_slug`, `canonical_url` vorhanden |
| `search_synonyms` | Optional | **PASS** | Full Launch; MVP nutzt statisches Dict im RPC |
| `bl_normalize_search_query` | Ja | **PASS** | Längenlimit 120, unsafe-Chars |
| `bl_build_search_vector` | Ja | **NEEDS_REVIEW** | Parität mit Client-Gewichten grob OK; `simple` config |
| `bl_expand_search_terms` | Ja | **NEEDS_REVIEW** | Vereinfacht vs. Client-Synonym-Map (Singular/Plural) |
| `bl_search_public_content` | Ja | **NEEDS_REVIEW** | Siehe RPC Review |
| `bl_search_row_is_public` | Ja | **PASS** | Parität mit `isPublicSearchable` — nur Populate-Referenz |
| Index-Entwürfe | Ja | **PASS** | GIN `search_vector`, partial unique slug |
| RLS-Entwürfe | Ja | **NEEDS_REVIEW** | Siehe RLS Review |
| Kommentare/Reports/Notifications/Admin | Nicht indexiert | **PASS** | MVP korrekt ausgeschlossen |
| Echte Testdaten / Inserts | Keine | **PASS** | — |
| Rohe HTML/BLMETA als RPC-Output | Keine | **PASS** | `search_text` nicht im Output |

**Object Review: PASS mit NEEDS_REVIEW-Punkten (kein BLOCKING auf Objekt-Ebene allein)**

---

## RLS Review

| Check | Ergebnis | Severity |
|-------|----------|----------|
| RLS auf `search_documents` vorgesehen | **PASS** | — |
| Public read auf `is_public AND is_canonical AND status=published` | **PASS** | — |
| Keine INSERT/UPDATE/DELETE Policies für anon/auth | **PASS** | — |
| Doppelter Filter im RPC (WHERE + RLS) | **PASS** | Defense in depth — **nur wirksam bei INVOKER** |
| Direkter `supabase.from('search_documents')` Bypass-Risiko | **NEEDS_REVIEW** | Grants nicht final; TODO im Draft |
| `SECURITY DEFINER` umgeht RLS für Funktionsausführung | **BLOCKING_BEFORE_APPLY** | Owner liest alle Zeilen; RPC-WHERE allein schützt |
| Fail-closed bei Fehlern | **PASS** | Exception → leeres Resultset |

**RLS Review: NEEDS_REVIEW — BLOCKING_BEFORE_APPLY wegen DEFINER-Interaktion**

**Empfehlung:** Public-RPC auf **SECURITY INVOKER** umstellen; RLS-Policy wird dann auch im RPC-Kontext wirksam. Populate/Rebuild nur in **separater Admin-Funktion** mit DEFINER (eigenes Gate 9E.4A).

---

## RPC Review (`bl_search_public_content`)

| Anforderung | Draft | Ergebnis |
|-------------|-------|----------|
| Query-Länge begrenzt (120) | `bl_normalize_search_query` | **PASS** |
| Leere Query fail-safe | early `return` | **PASS** |
| Unsafe Query leakt nichts | normalizer → `''` | **PASS** |
| `is_public = true` | WHERE | **PASS** |
| `is_canonical = true` | WHERE | **PASS** |
| `status = 'published'` | WHERE + CHECK | **PASS** |
| QA/Test/Fixture-Slugs ausgeschlossen | `!~ ^(qa-|test-|fixture-|contribution-)` | **PASS** |
| `Contribution:`-Titel ausgeschlossen | — | **BLOCKING_BEFORE_APPLY** | Nur in `bl_search_row_is_public`, **nicht** im RPC-WHERE |
| `exclude_public`-Tag ausgeschlossen | — | **BLOCKING_BEFORE_APPLY** | Fehlt im RPC-WHERE |
| Draft/Pending-Inhalte | CHECK + Populate-Annahme | **NEEDS_REVIEW** | Tabelle erlaubt nur `published`; Populate-Fehler = Leak-Risiko bei DEFINER |
| Kein `search_text` im Output | — | **PASS** |
| Kein BLMETA im Output | — | **PASS** |
| Keine SQL-Fehlerdetails | `exception when others then return` | **PASS** |
| `search_path = public` | gesetzt | **PASS** |
| Output minimal/safe | excerpt max 200 | **PASS** |
| `plainto_tsquery` bei leerem Token-Array | nicht abgefangen | **NEEDS_REVIEW** | Kann Exception → fail-closed, aber hart testen |
| `search_filters` jsonb | nur `limit` validiert | **NEEDS_REVIEW** | Keine Injection in dynamisches SQL (gut); weitere Keys ignoriert |

**RPC Review: NEEDS_REVIEW — 2× BLOCKING_BEFORE_APPLY (Filter-Lücken)**

---

## SECURITY DEFINER Review

| Frage | Bewertung |
|-------|-----------|
| Ist `SECURITY DEFINER` notwendig für Public-Search-RPC? | **Nein (empfohlen)** — INVOKER + RLS + GRANT EXECUTE reicht |
| Risiken bei DEFINER | Owner bypasses RLS; alle `search_documents`-Zeilen im Funktionskontext lesbar; Escalation bei WHERE-Lücken |
| Alternative INVOKER | RPC respektiert RLS; doppelte Filter redundant aber sicherer |
| Falls DEFINER nur für Populate | Akzeptabel in **separater** `bl_rebuild_search_documents` (Admin-only, eigenes Gate) |
| `set search_path = public` | **PASS** im Draft |
| Dynamisches SQL | **PASS** — keines |
| Ungeprüfte Inputs in SQL-String | **PASS** — `v_norm` in ilike; normalized |

**SECURITY DEFINER Review: REVIEW_REQUIRED**

**Empfehlung (verbindlich vor Apply):**

1. `bl_search_public_content` → **`SECURITY INVOKER`**
2. Populate/Rebuild → separates DEFINER-RPC nur für Admin/service_role (Gate 9E.4A)
3. Harte Rollentests: anon, authenticated, service_role

---

## Grants / Ownership Review

| Check | Ergebnis | Severity |
|-------|----------|----------|
| Finale Grants im Draft | **Nein** — nur TODO | **PASS** (korrekt für Draft) |
| `GRANT EXECUTE` an anon/auth ausstehend | **NEEDS_REVIEW** | Vor Apply inventarisieren |
| `REVOKE SELECT` auf `search_documents` für Client | **BLOCKING_BEFORE_APPLY** | Draft-TODO; erzwingen RPC-only-Pfad |
| Owner-Fragen dokumentiert | **PASS** | 42501-Risiko analog P5-E.8A |
| Rollen-Inventar vor Apply | **NEEDS_REVIEW** | Pflicht für 9E.4A |

**Grants / Ownership Review: NEEDS_REVIEW — BLOCKING_BEFORE_APPLY für Client-SELECT-Strategie**

---

## Release-Gate Compatibility Review

| Check | Ergebnis |
|-------|----------|
| Search-RPC read-only | **PASS** |
| Release-Gate umgehbar durch Search-RPC? | **Nein** — nur Reads |
| Contributions/Drafts/Pending ausgeschlossen | **NEEDS_REVIEW** | RPC-Filter unvollständig; Populate muss `bl_is_release_unlocked()` respektieren |
| Admin-/Moderationsdaten ausgeschlossen | **PASS** | Nicht im Index-Scope |
| Populate/Refresh als Write-Path | **Separates Gate** (9E.4A) — **PASS** |
| Funktionsname im Draft-Text | **NEEDS_REVIEW** | Draft nennt `bl_is_release_gate_open()` — Schema hat `bl_is_release_unlocked()` |

**Release-Gate Compatibility: PASS für Read-RPC; NEEDS_REVIEW für Populate (später)**

---

## Leakage / Privacy Review

| Vektor | Ergebnis |
|--------|----------|
| Rohes BLMETA im Output | **PASS** — nicht exponiert |
| `search_text` im Output | **PASS** — nicht exponiert |
| Rohe HTML-Bodies | **PASS** — nur gekürztes `excerpt` |
| Kommentare/Reports/Notifications | **PASS** — nicht im MVP-Index |
| User-PII (author_id, E-Mail) | **PASS** — nicht in Schema/Draft |
| `content_origin` im Output | **PASS** — intern only |
| QA/Test/Fixture über RPC-Filter | **PASS** (Slug + origin regex) |
| SQL-Fehlerdetails an Client | **PASS** — fail-closed |
| Interne Felder via direktem SELECT | **NEEDS_REVIEW** | `search_text`, `content_origin` in Tabelle — RLS + kein Client-SELECT nötig |

**Leakage / Privacy Review: PASS mit NEEDS_REVIEW (Table-Exposure via Grants)**

---

## Negative Test Coverage Review

Der Draft definiert 18 Negative-/Recall-Tests. Abgleich mit Client-Fixtures (`p5-search-recall-corpus.json`, 92/92 Hardening):

| Test-Kategorie | Im Draft | Runtime (9E.4) |
|----------------|----------|----------------|
| monster/beast/artifact/basalt | Ja | Ausstehend |
| body-only / alias-only | Ja | Ausstehend |
| draft/pending exclusion | Ja | Ausstehend — RPC-Filter ergänzen |
| QA/Test/Fixture | Ja | Ausstehend |
| Admin/Reports/Notifications | Ja | Ausstehend |
| BLMETA / unsafe / empty / long query | Ja | Ausstehend |
| anon/auth RLS / no write | Ja | Ausstehend |
| Release-Gate / no SQL errors | Ja | Ausstehend |

**Negative Test Coverage Review: PASS** (Plan vollständig; Ausführung erst 9E.4)

---

## Migration / Apply Risk Review

| Risiko | Schwere | Status nach Review |
|--------|---------|-------------------|
| RLS-Lücke via DEFINER | Kritisch | **BLOCKING** — INVOKER empfohlen |
| Draft/Pending-Leak via Populate | Kritisch | **BLOCKING** — Populate-Gate + `bl_search_row_is_public` |
| Owner 42501 | Hoch | **NEEDS_REVIEW** — Dashboard/Owner-Pfad |
| Stale/leerer Index | Mittel | **NEEDS_REVIEW** — 9E.4A Populate |
| Legacy/Production-Verwechslung | Kritisch | **STOPP** — Staging-only 9E.4A |
| Kein Backup vor Apply | Kritisch | **STOPP** — Pflicht-Evidence |

**Migration / Apply Risk: NICHT APPLY-READY**

---

## Required Draft Changes

Vor einem echten SQL-Apply (9E.4A) **zwingend**:

| # | Änderung | Severity |
|---|----------|----------|
| 1 | `bl_search_public_content` von **SECURITY DEFINER** auf **SECURITY INVOKER** | **BLOCKING_BEFORE_APPLY** |
| 2 | RPC-WHERE ergänzen: `title !~* '^Contribution:'` | **BLOCKING_BEFORE_APPLY** |
| 3 | RPC-WHERE ergänzen: `NOT (tags @> ARRAY['exclude_public'])` | **BLOCKING_BEFORE_APPLY** |
| 4 | **Kein** `GRANT SELECT` auf `search_documents` an anon/authenticated; nur `GRANT EXECUTE` auf RPC | **BLOCKING_BEFORE_APPLY** |
| 5 | Populate/Rebuild als **separates** Admin-DEFINER-RPC (nicht Public-RPC) | **BLOCKING_BEFORE_APPLY** |
| 6 | `bl_expand_search_terms` — volle Parität mit `BoundLoreSearchRecall.SYNONYM_MAP` + Singular/Plural | **NEEDS_REVIEW** |
| 7 | Fail-safe für leeren `plainto_tsquery` (vor FTS-Aufruf prüfen) | **NEEDS_REVIEW** |
| 8 | Serverseitige HTML-Strip-Funktion für Populate (`bl_strip_html_to_text`) — noch nicht im Draft | **NEEDS_REVIEW** |
| 9 | Release-Gate-Funktionsname korrigieren: `bl_is_release_unlocked()` | **NEEDS_REVIEW** |
| 10 | Schema-Read-Only auf Staging vor Apply (Spalten `posts` verifizieren) | **BLOCKING_BEFORE_APPLY** |
| 11 | Keine Migration ohne frisches Staging-Backup | **BLOCKING_BEFORE_APPLY** |

---

## Required Pre-Apply Evidence

Vor **P5-E.9E.4A** Staging Apply müssen vorliegen:

| Evidence | Gate |
|----------|------|
| Frischer Staging-Backup-Nachweis (>0 bytes, gitignored) | 9E.4A STOPP |
| Finaler SQL-Draft nach BLOCKING-Fixes (INVOKER, Filter, Grants) | 9E.4A |
| Owner-/Role-Inventar (anon, authenticated, service_role, owner) | 9E.4A |
| Schema-Read-Only-Verifikation (`posts`, `wiki_entity_aliases`, extensions) | 9E.4 |
| RLS-Testplan (anon SELECT denied auf non-public; RPC-only) | 9E.4 |
| Negative-Test-Matrix (18 Tests aus Draft) | 9E.4 |
| Rollback-Plan (DROP objects / restore backup) | 9E.4A |
| Populate-Plan ohne private Daten (`bl_search_row_is_public`) | 9E.4A |
| Explizite Nutzer-Apply-Freigabe | 9E.4A STOPP |

---

## Gate Decision

| Entscheidung | Wert |
|--------------|------|
| **P5-E.9E.3B** | **PASS** |
| SQL Draft Status | **DRAFT_ONLY_REVIEWED** |
| Apply-Ready | **Nein** |
| SECURITY DEFINER (Public-RPC) | **REVIEW_REQUIRED** → vor Apply entfernen |
| P5-E.9E.4 vorbereitbar | **Ja** — nach expliziter Nutzerfreigabe, read-only bevorzugt |
| P5-E.9E.4A | **STOPP** — Backup + Apply-Freigabe + Draft-Fixes |

**Begründung:** Review vollständig; kein SQL/DB-Zugriff; Draft safety PASS; strukturell sound; BLOCKING Findings dokumentiert und lösbar ohne Runtime. S-06 bleibt OPEN_BLOCKING.

---

## Required Future Gates

| Gate | Status | Freigabe |
|------|--------|----------|
| ~~**P5-E.9E.3B**~~ | **PASS** | — |
| **P5-E.9E.4** — Staging Search Verification | **STOPP** | Explizite Nutzerfreigabe |
| **P5-E.9E.4A** — Staging Search Apply | **STOPP** | Backup + Draft-Fixes + Apply-Freigabe |
| **P5-E.9E.5** — Production Verification | **STOPP** | Nach 9E.4 PASS |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.3B | **PASS** |
| Search SQL Draft | **DRAFT_ONLY_REVIEWED** |
| Search SQL Static Review | **PASS** |
| SECURITY DEFINER (Public-RPC) | **REVIEW_REQUIRED** |
| Apply-Ready | **Nein** |
| Search Runtime Evidence | **OPEN** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** **P5-E.9E.4** — Staging Search Verification (read-only bevorzugt)

**Manuelle Nutzerfreigabe nötig:** **Ja** — vor P5-E.9E.4 und zwingend vor P5-E.9E.4A

**Freigabeformulierung (9E.4):**
> „Ja, ich gebe P5-E.9E.4 frei — Staging Search Verification, read-only bevorzugt, kein SQL Apply, kein Staging Write, kein Production, kein Legacy.“

**Freigabeformulierung (9E.4A — separat, später):**
> „Ja, ich gebe P5-E.9E.4A frei — Staging Search Apply nach Backup und Draft-Fixes (INVOKER, Filter, Grants), nur Staging, kein Production, kein Legacy.“

---

*Dokumentversion: P5-E.9E.3B PASS. Kein SQL ausgeführt. Keine Migration. Keine DB-Verbindung.*
