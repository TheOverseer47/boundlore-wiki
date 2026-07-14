# P5-E.9E.4A — Staging Search DB/FTS Apply Report

**Gate:** P5-E.9E.4A — Staging Search DB/FTS Apply. **PASS** (PARTIAL_EMPTY_CORPUS).

**HEAD vor Gate:** `0e46c8c` — Add P5-E.9E.4E QA matrix section

**Arbeitsmodus:** Nur Staging `jzzgoiwfbuwiiyvwgwri`. Search DB/FTS MVP Apply. Kein Production/Legacy/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4A** | **PASS** |
| **Search DB/FTS Apply** | **APPLIED_STAGING_PASS** |
| **Search DB/FTS Evidence** | **PASS** (12 persistente Docs, P5-E.9E.4I) |
| **P5-E.9E.4I** | **PASS** — Persistent Canonical Corpus Seed |
| **Search Runtime Evidence (Client)** | **PASS** (aus P5-E.9E.4E) |
| **S-06 Search Recall** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Frischer Backup vor Apply. Final-SQL mit **P5-E.9E.3B-Fixes #2–#5** angewendet. **Design-Entscheidung:** Public-RPC bleibt **hardened SECURITY DEFINER** (9E.3B #1 INVOKER technisch nicht lösbar ohne `GRANT SELECT` auf `search_documents` → `search_text`-Leak via PostgREST). Objekte `search_documents`, `bl_search_public_content`, `bl_rebuild_search_documents` auf Staging erstellt. RLS aktiv. **Kein** `anon`/`authenticated` SELECT auf `search_documents` oder `profiles`. Populate: **0 Zeilen** (`POPULATE_EMPTY_CORPUS`). RPC Safety: PASS (empty/no-hit/unsafe/long). **UI nutzt RPC noch nicht** (`js/search.js` unverändert).

---

## HEAD / Working Tree / Apply-Scope

| Check | Status |
|-------|--------|
| HEAD vor Gate | `0e46c8c` |
| Staging Ref | `jzzgoiwfbuwiiyvwgwri` |
| Legacy / Production | **Nicht verwendet** |
| Corpus-Posts / Testdaten | **Nein** |
| `profiles` Grant anon/public | **Nein** |
| Push / Deploy / Launch | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.4A frei — Staging Search DB/FTS Apply nach frischem Backup, mit Draft-Fixes aus P5-E.9E.3B, nur Staging `jzzgoiwfbuwiiyvwgwri`, kein Production, kein Legacy, kein Push, kein Deploy, kein Launch.“

---

## Staging Target Verification

| Feld | Wert |
|------|------|
| Project Ref | `jzzgoiwfbuwiiyvwgwri` |
| URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` |
| Status | `ACTIVE_HEALTHY` |
| P5-E.9E.4E Cleanup | **0 Marker**, **0 published posts** |

---

## Fresh Backup Evidence

| Item | Wert |
|------|------|
| Pfad | `backups/staging/p5-e9e4a-search-db-prewrite-20260714-031031.dump` |
| Größe | **385,093 bytes** |
| SHA256 | `8131D6C93B4D60B34346903A64601FEE0E510F22179667EFB811E591A02D058F` |
| Gitignored | `[x]` |

---

## Final SQL Review

| Check | Ergebnis |
|-------|----------|
| `search_documents` MVP-Schema | **Angewendet** |
| FTS `search_vector` + GIN | **Angewendet** |
| Public-RPC `bl_search_public_content` | **Angewendet** |
| Populate `bl_rebuild_search_documents` | **Angewendet** (admin/service_role only) |
| RLS auf `search_documents` | **Aktiv** |
| Keine destruktiven Drops/Truncates | **PASS** |

---

## P5-E.9E.3B Fix Compliance

| # | Fix | Status | Anmerkung |
|---|-----|--------|-----------|
| 1 | Public-RPC **SECURITY INVOKER** | **DESIGN_DECISION_DEFINER** | INVOKER erfordert Table-Grant → `search_text` leak; hardened DEFINER + REVOKE SELECT |
| 2 | `title !~* '^Contribution:'` im RPC-WHERE | **PASS** | |
| 3 | `exclude_public` Tag-Filter | **PASS** | |
| 4 | Kein `GRANT SELECT` auf `search_documents` für anon/auth | **PASS** | `anon_select=false` verifiziert |
| 5 | Populate getrennt, nicht public | **PASS** | EXECUTE nur `service_role` |
| 6 | Synonym-Parität | **PARTIAL** | MVP static expansion |
| 7 | `plainto_tsquery` fail-safe | **PASS** | empty/exception → return |
| 8 | HTML-Strip für Populate | **PASS** | `bl_strip_html_to_text` |
| 10 | Schema verifiziert | **PASS** | |
| 11 | Backup vor Apply | **PASS** | |

**Compliance:** **PASS mit dokumentierter DEFINER-Ausnahme (#1)**

---

## Schema Inventory Before

| Objekt | Vor Apply |
|--------|-----------|
| `search_documents` | **Nicht vorhanden** |
| `bl_search_public_content` | **Nicht vorhanden** |
| `bl_rebuild_search_documents` | **Nicht vorhanden** |
| `published posts` | **0** |
| P5-E.9E.4E Marker | **0** |

---

## Applied SQL Summary

**Migration 1:** `p5_e9e4a_search_documents_schema` — Tabelle + Indexe

**Migration 2:** `p5_e9e4a_search_functions_rpc` — Helpers, RPC, RLS, Grants

Angewendete Objekte:
- `public.search_documents`
- `public.bl_normalize_search_query`
- `public.bl_search_row_is_public`
- `public.bl_strip_html_to_text`
- `public.bl_build_search_vector`
- `public.bl_expand_search_terms`
- `public.bl_search_public_content` (SECURITY DEFINER, hardened WHERE)
- `public.bl_rebuild_search_documents` (SECURITY DEFINER, service_role only)
- RLS Policy `search_documents_public_read`
- `REVOKE ALL` auf `search_documents` für anon/authenticated
- `GRANT EXECUTE` auf `bl_search_public_content` für anon/authenticated

---

## Schema Inventory After

| Objekt | Nach Apply |
|--------|------------|
| `search_documents` | **Vorhanden**, RLS **true** |
| `bl_search_public_content` | **Vorhanden**, SECURITY DEFINER |
| `bl_rebuild_search_documents` | **Vorhanden**, SECURITY DEFINER |
| `anon` SELECT `search_documents` | **false** |
| `anon` SELECT `profiles` | **false** |
| `search_documents` Zeilen | **0** |

---

## Populate / Rebuild Result

| Item | Ergebnis |
|------|----------|
| `bl_rebuild_search_documents()` | **0 Zeilen** |
| Status | **POPULATE_EMPTY_CORPUS** |
| Grund | 0 published posts auf Staging (nach P5-E.9E.4E Cleanup) |
| Fehler | **Keiner** |

---

## RPC Verification

| Query | Ergebnis | Leak-Felder |
|-------|----------|-------------|
| `monster` | 0 Treffer (leerer Index) | Keine |
| `zzzxxy-no-hit` | 0 Treffer | Keine |
| `<img src=x onerror=alert(1)>` | 0 Treffer (normalisiert leer) | Keine |
| 200×`z` | 0 Treffer (gekürzt auf 120) | Keine |
| `''` (empty) | 0 Treffer (early return) | Keine |

**Output-Felder:** title, slug, url, excerpt, category, score — **kein** search_text, search_vector, BLMETA, PII.

---

## Safety / No-Leak Checks

| Check | Ergebnis |
|-------|----------|
| Kein `profiles` anon/public Grant | **PASS** |
| Kein direkter `search_documents` SELECT für anon | **PASS** |
| RPC fail-closed bei unsafe/empty/long | **PASS** |
| Contribution/exclude_public im RPC-WHERE | **PASS** |
| Populate nicht anon-ausführbar | **PASS** |

---

## Optional UI Smoke

| Check | Ergebnis |
|-------|----------|
| `js/search.js` nutzt RPC | **Ja** — RPC-first (9E.4F) |
| Client-RPC-Integration | **RPC_CLIENT_INTEGRATED** |
| Lokale Fixtures | PASS (21/21, 92/92, 98/98, 47/47 RPC) |

---

## Limitations

1. **PARTIAL_EMPTY_CORPUS** — kein Recall-Nachweis über DB-Index ohne published Daten.
2. **SECURITY DEFINER** am Public-RPC — begründet, nicht INVOKER (9E.3B #1).
3. **Client nicht integriert** — RPC existiert, UI nutzt ihn noch nicht.
4. **S-06** bleibt OPEN_BLOCKING (DB/FTS + Client-Integration + persistenter Corpus).

---

## Required Follow-up Gates

| Gate | Zweck |
|------|-------|
| **Client RPC Integration** | **RPC_CLIENT_INTEGRATED** (9E.4F) |
| **Populate mit echten published posts** | Production/Staging Content-Migration |
| **P5-E.9E.4 Re-run** | Nach Client-Integration + Corpus |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4A | **PASS** |
| Search DB/FTS Apply | **APPLIED_STAGING_PASS** |
| Search DB/FTS Evidence | **PASS** (12 persistente Docs, P5-E.9E.4I) |
| Search DB/FTS Runtime Evidence | **STAGING_PASS** (P5-E.9E.4J) |
| **P5-E.9E.4J** | **PASS** — Persistent Staging Search Re-run |
| **P5-E.9E.4I** | **PASS** — Persistent Canonical Corpus Seed |
| **P5-E.9E.4G** | **PASS** — RPC Corpus Verification |
| S-06 Search Recall | **OPEN_BLOCKING** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

## STAGING APPLIED RECORD — DO NOT REAPPLY

Siehe angewendete Migrationen `p5_e9e4a_search_documents_schema` und `p5_e9e4a_search_functions_rpc` auf Staging `jzzgoiwfbuwiiyvwgwri`. Vollständiges SQL im Apply-Log dieses Berichts dokumentiert.

---

*Dokumentversion: P5-E.9E.4A PASS. Keine Secrets.*
