# P5-E.9E.4H — Search Production Content Migration Plan

**Gate:** P5-E.9E.4H — Search Production Content Migration Plan. **PASS** (Plan-only).

**HEAD vor Gate:** `1c73430` — Verify staging RPC search corpus

**Arbeitsmodus:** Nur lokales Repo. Planung/Dokumentation/QA-Matrix. Kein SQL/DB-Read/DB-Write/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4H** | **PASS** |
| **P5-E.9E.4I** | **PASS** — Staging Persistent Canonical Corpus Seed |
| **Search technisch bewiesen** | **Ja** (4G + 4I persistent) |
| **Persistenter Corpus** | **PERSISTENT_CANONICAL_SEED_PASS** (12 Canonicals) |
| **Empfohlener nächster Gate** | **P5-E.9E.4 Re-run** oder Production Content Migration |
| **S-06 Search Recall** | **OPEN_BLOCKING** (Staging Recall PASS; Production offen) |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** RPC-first Search + DB/FTS + Rebuild sind technisch verifiziert (P5-E.9E.4G). Staging ist nach Cleanup wieder leer. S-06 kann erst geschlossen werden, wenn **persistenter published Canonical-Content** (10–20 Einträge) mit Backup, Rebuild und RPC-Query-Matrix verifiziert ist. **Nicht direkt Production.** Empfohlener erster Write-Gate: **P5-E.9E.4I** auf Staging only.

---

## HEAD / Working Tree / No-Write-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `1c73430` |
| SQL ausgeführt | **Nein** |
| DB-Read / DB-Write | **Nein** |
| Supabase-Verbindung | **Nein** |
| Staging/Production Write | **Nein** |
| Migration / Schema-Änderung | **Nein** |
| Push / Deploy / Launch | **Nein** |
| `.env`-Änderung | **Nein** |

---

## Current Evidence Summary

| Evidence | Status | Quelle |
|----------|--------|--------|
| Search DB/FTS Apply | **APPLIED_STAGING_PASS** | P5-E.9E.4A |
| Client RPC Integration | **RPC_CLIENT_INTEGRATED** | P5-E.9E.4F |
| RPC Corpus Verification | **RPC_CORPUS_VERIFIED_CLEANED** | P5-E.9E.4G |
| Search DB/FTS Runtime Evidence | **PASS** (persistenter Corpus) | P5-E.9E.4I |
| Search DB/FTS Evidence (aktuell) | **PASS** (12 search_documents) | P5-E.9E.4I |
| Persistent Canonical Corpus | **PERSISTENT_CANONICAL_SEED_PASS** | P5-E.9E.4I |
| Query-Matrix Core | **PASS** | monster→Ember Salamander, artifact→Volcanic Heat Charm, basalt→Cinder Basalt Flats, resource→Molten Ember Shard, guide/guild→Ember Wardens Field Guide |
| Safety / No-Leak | **PASS** | Kein 42501, kein BLMETA, kein PII |
| Staging nach 4I Seed | **12 published posts**, **12 search_documents** | P5-E.9E.4I |
| S-06 Closure | **Nicht möglich** | Production-Pfad + Launch-Kriterien offen |

**Fazit:** Technischer Pfad `posts` → `bl_rebuild_search_documents()` → `bl_search_public_content` → RPC-first Client ist bewiesen. **Persistenter Staging-Corpus (4I):** 12 Canonicals, Query-Matrix 21/21 PASS. Production-Migration bleibt separater Gate.

---

## Content Source Decision Needed

Vor P5-E.9E.4I muss die Content-Quelle explizit festgelegt werden:

| Quelle | Beschreibung | Für 4I geeignet? |
|--------|--------------|------------------|
| **Kuratiertes Staging-Seed-Set** | 10–20 manuell definierte Canonicals (Wiki-Einträge) | **Ja (empfohlen)** |
| Wiki-Markdown im Repo | Statische Wiki-Seiten als Vorlage | **Ja** — als Quelle für Seed-Texte |
| Production-Export | Kopie echter Production-Posts | **Nein** — separater Gate, nicht 4I |
| Temporärer 4G-Corpus | Wiederverwendung ohne Persistenz | **Nein** — kein Closure-Basis |
| Admin-UI manuell | Live-Eingabe über UI | **Nein** — nicht für ersten Seed-Gate |

**Empfehlung:** Kuratiertes **Staging Persistent Canonical Seed** aus dokumentierten Wiki-Canonicals (Titel, Slug, Excerpt, Body, Kategorie) — kein Import aus Production in 4I.

---

## Public-Safe Data Contract

### Erlaubte Mindestfelder (`posts`)

| Feld | Anforderung |
|------|-------------|
| `title` | Pflicht; kein `Contribution:`-Präfix |
| `slug` | Pflicht; kein `qa-`, `test-`, `fixture-`, `contribution-` |
| `content` | Pflicht; plain/safe HTML oder Text; Marker für Seed optional |
| `excerpt` | Empfohlen; public-safe Snippet |
| `category` | Pflicht für `post_type=wiki`; NULL für `guide` |
| `post_type` | `wiki` oder `guide` (CHECK-konform) |
| `status` | **`published`** |
| `deleted_at` | **NULL** |
| `author_id` | **NULL** (Staging Seed ohne Profile) |
| `tags` | Optional; **kein** `exclude_public` |

### Optional (public-safe)

- `entity_domain`, `entity_subtype` (via BLMETA nur intern beim Populate — nicht in RPC-Output)
- Public-safe relations/facets in Body-Text (nicht als rohes BLMETA)

### Ausgeschlossen (niemals in Search-Output / Index-Leak)

| Kategorie | Beispiele |
|-----------|-----------|
| Raw BLMETA | `<!--BLMETA ...-->` in RPC/UI |
| Index-Rohfelder | `search_text`, `search_vector` |
| PII | E-Mail, Profile-Namen, User-IDs in UI |
| Admin | `admin_locked`, Review-Notizen |
| Nicht-public | draft, pending, deleted, QA/test/fixture |
| Blockierte Titel | `Contribution:` |
| Blockierte Tags | `exclude_public` |

### RPC-Output (whitelisted)

Nur: `title`, `canonical_slug`, `canonical_url`, `excerpt`, `category`, `score`, `entity_domain`, `entity_subtype`, `source_type`, `matched_fields` (Metadatum, kein Vektor-Leak).

---

## Minimal Published Corpus Requirements

### Mindestabdeckung (Suchintentionen)

| Intention | Beispiel-Query | Erwarteter Top-Treffer-Typ |
|-----------|----------------|---------------------------|
| Creature | monster, creature, beast, salamander | Creature-Canonical |
| Item/Artifact | artifact, charm, item | Item-Canonical |
| Biome/Region | basalt, volcanic, biome, region | Biome-Canonical |
| Resource | resource, mining, shard | Resource-Canonical |
| Guide/Guild | guide, guild, field guide | Guide-Canonical |
| No-hit | zzzxxy-no-hit | 0 Treffer, Empty-State |
| Unsafe | HTML/Script-Query | 0 Treffer, fail-closed |
| Long | ≥150 Zeichen | Gekürzt/abgelehnt, kein Crash |

### Closure-Schwelle (S-06)

| Anforderung | Minimum |
|-------------|---------|
| Persistente published Canonicals | **10–20** |
| Suchintentionen mit Top-Treffer | **≥5** |
| Temporärer Cleanup-Corpus als Basis | **Verboten** |
| RPC-first Query-Matrix | **Vollständig PASS** |
| Rebuild `search_documents` | **>0 Zeilen** |
| Kein Production-Write für Closure | **Empfohlen** — Staging zuerst |

---

## Migration Options Matrix

| Option | Beschreibung | Write nötig? | Risiko | Empfehlung |
|--------|--------------|-------------|--------|------------|
| **A. Staging persistent canonical seed** | 10–20 kuratierte published Posts auf Staging, kein Cleanup | **Ja** (4I) | **Niedrig** | **Bevorzugt — erster Write-Gate** |
| **B. Production content migration** | Echte Production-Posts kopieren/migrieren | **Ja** | **Hoch** | **Separater Gate nach 4I PASS** |
| **C. Content import JSON/CSV** | Batch-Import aus kuratiertem Artefakt | **Ja** | Mittel | Optional für 4I, wenn Schema validiert |
| **D. Admin UI manuelle Veröffentlichung** | Live-Eingabe über Wiki-Admin | **Ja** | Mittel–Hoch | Nicht für ersten automatisierten Seed |
| **E. Reuse temporärer Corpus (4G)** | 4G-Posts ohne Cleanup behalten | **Ja** | **Hoch** | **Nein** — Marker/Slug-Design für Temp only |
| **F. Full SSG + Search pipeline** | Kombinierte Content-Pipeline mit Entity-SSG | **Ja** | **Hoch** | Langfristig; blockiert an S-05 |

**Empfohlene Reihenfolge:** **A (4I)** → RPC Rebuild + Query-Matrix → Review → **B (Production)** separat freigeben.

---

## Recommended First Write Gate

### P5-E.9E.4I — Staging Persistent Canonical Corpus Seed

| Aspekt | Scope |
|--------|-------|
| Ziel | Staging `jzzgoiwfbuwiiyvwgwri` only |
| Backup | Frischer `pg_dump` vor Seed (Pflicht) |
| Posts | 10–20 published Canonicals |
| Marker | `P5E9E4I_STAGING_PERSISTENT_CANONICAL` |
| Slugs | Dokumentierte Liste; kein `qa-/test-/fixture-` |
| Cleanup | **Kein Cleanup** — persistenter Staging-Corpus |
| Rebuild | `bl_rebuild_search_documents()` |
| Verification | RPC-first Query-Matrix (Core + Safety) |
| Production/Legacy | **Verboten** |
| Schema/Policy/Grant | **Keine Änderung** |

**Nutzerfreigabe erforderlich** — siehe Freigabeformulierung unten.

---

## Backup / Rollback / Cleanup Plan

### Vor Seed (4I)

| Schritt | Aktion |
|---------|--------|
| 1 | Staging-Ref verifizieren (`jzzgoiwfbuwiiyvwgwri`) |
| 2 | `pg_dump` Custom Format → `backups/staging/p5-e9e4i-seed-prewrite-<timestamp>.dump` |
| 3 | SHA256 + Größe dokumentieren |
| 4 | `pg_restore --list` prüfen |
| 5 | Backup gitignored — nicht committen |

### Rollback (nur bei separatem Rollback-Gate)

| Regel | Detail |
|-------|--------|
| Scope | Nur Slugs mit Marker `P5E9E4I_STAGING_PERSISTENT_CANONICAL` |
| Delete | `DELETE FROM posts WHERE slug IN (...) AND content LIKE '%P5E9E4I_%'` |
| Rebuild | `bl_rebuild_search_documents()` nach Delete |
| Verboten | Breites Delete, Truncate, Restore ohne Freigabe |
| Slug-Liste | Im 4I-Report dokumentieren |

### Cleanup vs. Persistenz

- **4G:** Temporär + Cleanup (verifiziert)
- **4I:** Persistenter Seed **ohne** Cleanup — Rollback nur explizit

---

## Search Rebuild Plan

### Nach Seed-Insert

```text
1. INSERT posts (10–20, published, Marker)
2. SELECT count(*) FROM posts WHERE status='published' AND marker present
3. SELECT bl_rebuild_search_documents()  → erwartet N > 0
4. SELECT count(*) FROM search_documents WHERE is_public = true
```

### RPC Verification (read-only)

| Query | Erwartung |
|-------|-----------|
| monster / creature | Creature-Treffer |
| artifact / charm | Item-Treffer |
| basalt / volcanic | Biome/Item-Treffer |
| resource / mining | Resource-Treffer |
| guide / guild | Guide-Treffer |
| zzzxxy-no-hit | 0 Treffer |
| unsafe HTML | 0 Treffer, fail-closed |
| 150+ Zeichen | Gekürzt, kein Crash |

### Sicherheits-Checks

- Kein `anon` SELECT auf `search_documents` oder `profiles`
- Kein `search_text` / `search_vector` / BLMETA in UI
- RPC-only Public-Pfad (`bl_search_public_content`)

---

## RPC-first Verification Plan

| Schritt | Methode |
|---------|---------|
| 1 | Lokaler Server (8081) + `STAGING_REF_VERIFIED` |
| 2 | `/wiki/search/?q=...` — UI-RPC, nicht `.from('posts')` |
| 3 | Fixtures: 21/21, 92/92, 98/98, 47/47 PASS |
| 4 | Query-Matrix dokumentieren (Treffer, Top-Slug, Safety) |
| 5 | Kein S-06 PASS ohne persistenter Corpus + dokumentierte Matrix |

---

## SEO / SSG Interaction

| Thema | Status |
|-------|--------|
| Search technisch unabhängig von Entity-SSG | **Ja** — RPC kann vor SSG funktionieren |
| S-05 SEO/CSR | **OPEN_BLOCKING** — Entity-URLs, Sitemap, Prerender |
| Persistenter Corpus allein | **Reicht nicht** für Public Launch |
| Public Launch | **NO-GO** — Search + SEO + Production Closure offen |
| Entity-SSG (P5-E.9D.3D+) | Parallel tracken; nicht Blocker für 4I |

**Fazit:** Search-Content-Migration und SEO/SSG sind **parallele Spuren**. 4I schließt Search-Recall-Pfad auf Staging; S-05 bleibt separat.

---

## Security / RLS / Privacy Considerations

| Check | Anforderung |
|-------|-------------|
| RLS `posts` | Nur published/non-deleted für anon (bestehend) |
| RLS `search_documents` | RPC-only; kein direkter anon SELECT |
| `profiles` Grant | **Kein** anon/public SELECT |
| Populate | Nur `bl_rebuild_search_documents()` (service_role) |
| Seed ohne Profile | `author_id` NULL |
| Marker | Eindeutig für Rollback; nicht `exclude_public` |
| PII | Keine E-Mails, keine User-Metadaten in Seed |

---

## Required Future Gates

| Gate | Zweck | Write? |
|------|-------|--------|
| **P5-E.9E.4I** | Staging Persistent Canonical Corpus Seed | **Ja** (Staging) |
| **P5-E.9E.4J** (optional) | Production Content Migration | **Ja** (Production) — separat |
| **P5-E.9E.4 Re-run** | Query-Matrix mit persistentem Corpus | Read-only bevorzugt |
| **S-06 Closure** | Nach 4I + ggf. Production-Pfad | — |
| **P5-E.9D.3D+** | Entity SSG / Sitemap | Separater SEO-Track |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4H | **PASS** |
| Search technisch bewiesen | **Ja** (4G) |
| Persistenter Corpus | **FEHLT** |
| Search DB/FTS Runtime Evidence | **PASS** (temporär); **PARTIAL_EMPTY** (aktuell) |
| S-06 Search Recall | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

## Nutzerfreigabe für P5-E.9E.4I (später)

> „Ja, ich gebe P5-E.9E.4I frei — Staging Persistent Canonical Corpus Seed nach frischem Backup, 10–20 kontrollierte published Canonicals auf Staging `jzzgoiwfbuwiiyvwgwri`, Rebuild von `search_documents`, RPC-first Query-Matrix, persistenter Corpus ohne Cleanup, kein Production, kein Legacy, kein Push, kein Deploy, kein Launch.“

---

*Dokumentversion: P5-E.9E.4H PASS. Plan-only. Kein SQL. Kein DB-Zugriff.*
