# P5-E.9E.4K — Marker Searchability Mitigation Plan

**Gate:** P5-E.9E.4K — Marker Searchability Mitigation Plan. **PASS** (Plan-only).

**HEAD vor Gate:** `c7e8786` — Rerun persistent staging search

**Arbeitsmodus:** Nur lokales Repo. Planung/Dokumentation/QA-Matrix. Kein SQL/DB-Write/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4K** | **PASS** (Plan-only) |
| **MARKER_SEARCHABLE_RISK** | **CLOSED_STAGING** (P5-E.9E.4L) |
| **P5-E.9E.4L** | **PASS** — Staging Marker Deindex Fix |
| **Empfohlener Fix-Gate** | ~~P5-E.9E.4L~~ **PASS** |
| **Search DB/FTS Runtime Evidence** | **STAGING_PASS** (Recall OK; Index-Hygiene offen) |
| **S-06 Search Recall** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Der Seed-Marker `P5E9E4I_STAGING_PERSISTENT_CANONICAL` ist **nicht in UI-Snippets sichtbar**, aber **per RPC/FTS suchbar**, weil er in `posts.content` steht und in `search_documents.search_text` / `search_vector` landet. Das ist **kein PII-/Security-Leak**, aber ein **Product-/Index-Hygiene-Risiko**. **Kurzfristige Empfehlung:** Marker aus `content` entfernen (Option A) und Rollback über **exakte Slug-Liste + Repo-Manifest** führen. Keine Schemaänderung nur für Marker.

---

## HEAD / Working Tree / No-Write-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `c7e8786` |
| SQL ausgeführt / SQL Apply | **Nein** |
| DB-Read / DB-Write | **Nein** |
| Inserts / Updates / Deletes | **Nein** |
| Rebuild / Cleanup | **Nein** |
| Supabase-Verbindung | **Nein** |
| Staging/Production Write | **Nein** |
| Migration / Schema-Änderung | **Nein** |
| Push / Deploy / Launch | **Nein** |
| `.env`-Änderung | **Nein** |

---

## Current Marker Risk

| Aspekt | Status |
|--------|--------|
| Marker-Wert | `P5E9E4I_STAGING_PERSISTENT_CANONICAL` |
| Speicherort | `posts.content` (12 Seed-Posts, P5-E.9E.4I) |
| UI-Snippets (title/excerpt) | **Nicht sichtbar** — PASS |
| RPC/FTS-Suche nach `P5E9E4I` | **12 Treffer** — MARKER_SEARCHABLE_RISK |
| PII / BLMETA / `search_text` in UI | **Nein** — kein Security-Leak |
| Klassifikation | **Product-/Index-Hygiene-Risiko** |
| Persistent Staging Search Re-run | **PARTIAL** bis Marker deindexiert |

**Ursache:** `bl_rebuild_search_documents()` extrahiert Body-Text aus `posts.content` in `search_documents.search_text` und baut daraus `search_vector`. Marker im Body wird indexiert, obwohl er nicht gerendert wird.

---

## Impact Assessment

| Bereich | Impact | Schwere |
|---------|--------|---------|
| Endnutzer-UI | Kein sichtbarer Marker in Snippets | **Niedrig** |
| Public Search RPC | Marker als Suchbegriff auffindbar | **Mittel** (Hygiene) |
| Rollback / Audit | Slug-Liste + Marker heute dual identifizierbar | **Niedrig** |
| Production-Vorbild | Marker in Content wäre Anti-Pattern | **Hoch** (Policy) |
| S-06 Closure | Blockiert nicht direkt; Staging Recall weiter PASS | **Niedrig** |
| Search Evidence | Runtime **STAGING_PASS**; Re-run bleibt **PARTIAL** | **Mittel** |

**Fazit:** Kein Launch-Blocker allein, aber **kein akzeptierter Dauerzustand** für Production-Content oder vollständiges **PERSISTENT_STAGING_SEARCH_RERUN_PASS**.

---

## Mitigation Options Matrix

| Option | Beschreibung | DB-Write nötig? | Risiko | Empfehlung |
|--------|--------------|-----------------|--------|------------|
| **A. Marker aus `content` entfernen** | UPDATE der 12 Posts: Marker-Zeile aus Body löschen; Rollback nur über exakte Slug-Liste (`*-p5e9e4i`) + Repo-Manifest | **Ja** (4L) | **Niedrig** | **Bevorzugt — kurzfristig** |
| **B. Marker in nicht-indexiertes internes Feld** | z. B. dediziertes Metadatenfeld; heute **kein geeignetes Feld** in `posts` (kein JSONB, `submission_review_note` semantisch falsch + Index-Verhalten ungeklärt) | **Ja** (+ ggf. Schema) | **Mittel–Hoch** | **Nein** — ohne Schema nicht sauber |
| **C. Separate Seed-Registry-Tabelle** | `staging_seed_registry(slug, gate, marker, created_at)` für Audit/Rollback | **Ja** (+ Migration) | **Mittel** | **Später** — Overkill für 12 Staging-Posts |
| **D. FTS/Rebuild Marker-Ausschluss** | `bl_rebuild_search_documents` filtert Marker-Pattern aus `search_text` | **Ja** (+ DDL) | **Hoch** | **Nein** — Schema/DDL nur für Staging-Marker |
| **E. Marker belassen** | Als akzeptiertes Staging-only Risiko dokumentieren | **Nein** | **Mittel** (dauerhaft PARTIAL) | **Nein** — schließt Hygiene-Lücke nicht |

**Empfohlene Reihenfolge:** **A (4L)** → Rebuild → read-only Re-run (4J-Style) → optional langfristig **C** für größere Migrations.

---

## Recommended Fix Gate

### P5-E.9E.4L — Staging Marker Deindex Fix

| Aspekt | Scope |
|--------|-------|
| Ziel | Staging `jzzgoiwfbuwiiyvwgwri` only |
| Backup | Frischer `pg_dump` vor Write (Pflicht) |
| Write-Scope | **Nur** 12 P5-E.9E.4I-Posts (`*-p5e9e4i` Slugs) |
| Aktion | Marker `P5E9E4I_STAGING_PERSISTENT_CANONICAL` aus `content` entfernen (Option A) |
| Rebuild | `bl_rebuild_search_documents()` |
| Verification | Read-only RPC-first Re-run; Query `P5E9E4I` → **0 Treffer** |
| Cleanup der 12 Posts | **Nein** — Corpus bleibt persistent |
| Production/Legacy | **Verboten** |
| Schema/Policy/Grant | **Keine Änderung** |
| Push/Deploy/Launch | **Verboten** |

**Nutzerfreigabe erforderlich** — siehe Freigabeformulierung unten.

---

## Rollback Implications

### Nach Option A (Marker entfernt)

| Mechanismus | Detail |
|-------------|--------|
| **Primär** | Exakte Slug-Liste (12 Einträge, Suffix `-p5e9e4i`) |
| **Sekundär** | Repo-Manifest in `docs/architecture/p5-staging-persistent-canonical-corpus-seed-report.md` |
| **Delete-Scope** | `DELETE FROM posts WHERE slug IN (...12 slugs...)` |
| **Rebuild** | `bl_rebuild_search_documents()` nach Delete |
| **Verboten** | Breites Delete, `content LIKE '%P5E9E4I%'` als einziger Identifier nach 4L |

### Slug-Liste (Rollback-Manifest)

1. `ember-salamander-p5e9e4i`
2. `ashen-wolf-p5e9e4i`
3. `volcanic-heat-charm-p5e9e4i`
4. `moonlit-cartographer-compass-p5e9e4i`
5. `cinder-basalt-flats-p5e9e4i`
6. `silverfen-mire-p5e9e4i`
7. `molten-ember-shard-p5e9e4i`
8. `skyglass-crystal-p5e9e4i`
9. `ember-wardens-field-guide-p5e9e4i`
10. `guild-of-quiet-cartographers-p5e9e4i`
11. `ashen-forge-outpost-p5e9e4i`
12. `ritual-of-the-first-flame-p5e9e4i`

---

## Verification Plan (für P5-E.9E.4L)

| Schritt | Erwartung |
|---------|-----------|
| Vor Write: Backup + Staging-Ref | `jzzgoiwfbuwiiyvwgwri` |
| Nach UPDATE: 12 Posts ohne Marker in `content` | Marker-Zeile entfernt |
| `bl_rebuild_search_documents()` | 12 Zeilen |
| RPC `P5E9E4I` | **0 Treffer** |
| Core Query-Matrix (monster, artifact, …) | Unverändert PASS |
| UI-Snippets | Kein Marker sichtbar |
| Safety (BLMETA, PII, search_text) | PASS |
| Kein Cleanup der Posts | 12 published bleiben |

---

## Production Content Guidance

| Regel | Detail |
|-------|--------|
| **Keine Audit-/Seed-Marker in indexierten Feldern** | `content`, `excerpt`, `title` dürfen keine Gate-Marker, BLMETA-Rohdaten oder interne IDs enthalten, die in FTS landen |
| **Rollback in Production** | Slug-Liste, Import-Manifest (JSON/CSV im Repo) oder separates internes Metadatenfeld — **nicht** Marker im Body |
| **Search-Output** | Nie Marker, BLMETA, `search_text`, `search_vector`, PII oder Admin-Notizen |
| **Staging-Seed-Pattern** | Suffix `-p5e9e4i` nur Staging; Production-Slugs ohne Gate-Suffix |
| **Rebuild-Pipeline** | Body-Extraktion muss public-safe sein; interne Kommentare/HTML-Kommentare vor Indexierung strippen |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4K | **PASS** (Plan-only) |
| MARKER_SEARCHABLE_RISK | **OPEN** |
| Persistent Staging Search Re-run | **PARTIAL** |
| Search DB/FTS Runtime Evidence | **STAGING_PASS** |
| Empfohlener Fix-Gate | **P5-E.9E.4L** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

## Nutzerfreigabe für P5-E.9E.4L (STOPP bis Freigabe)

> „Ja, ich gebe P5-E.9E.4L frei — Staging Marker Deindex Fix nach frischem Backup, UPDATE nur der 12 P5-E.9E.4I-Posts auf Staging `jzzgoiwfbuwiiyvwgwri`, Marker aus `content` entfernen, `bl_rebuild_search_documents()`, read-only RPC Re-run, kein Production, kein Legacy, kein Push, kein Deploy, kein Launch, kein Cleanup der 12 Posts.“

---

*Dokumentversion: P5-E.9E.4K PASS. Plan-only. Kein DB-Write. Keine Secrets.*
