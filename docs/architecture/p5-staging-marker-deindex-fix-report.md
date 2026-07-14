# P5-E.9E.4L — Staging Marker Deindex Fix Report

**Gate:** P5-E.9E.4L — Staging Marker Deindex Fix. **PASS**.

**HEAD vor Gate:** `836cbb3` — Plan marker searchability mitigation

**Arbeitsmodus:** Nur Staging `jzzgoiwfbuwiiyvwgwri`. UPDATE 12 Posts + Rebuild. Kein Delete/Cleanup/Production/Legacy/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4L** | **PASS** |
| **MARKER_DEINDEX_STAGING_PASS** | **PASS** |
| **MARKER_SEARCHABLE_RISK** | **CLOSED_STAGING** (Marker-String deindexiert) |
| **Persistent Staging Search Re-run** | **PASS** (Core-Matrix stabil) |
| **Search DB/FTS Runtime Evidence** | **STAGING_PASS** |
| **S-06 Search Recall** | **OPEN_BLOCKING** (Production offen) |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Frischer Backup vor UPDATE. Marker `P5E9E4I_STAGING_PERSISTENT_CANONICAL` aus `content` der 12 Posts entfernt. Rebuild → **12 Zeilen**. Explizite Marker-Query **0 Treffer**. Core Query-Matrix **29/29 PASS** (24 Core + 5 Safety/Marker). Kein Delete/Cleanup. **Hinweis:** Query `P5E9E4I` (ohne Suffix) trifft weiterhin Slugs mit `-p5e9e4i` — **Slug-Suffix-Artefakt**, kein Marker-Leak in `content`/`search_text`.

---

## HEAD / Working Tree / Apply-Scope-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `836cbb3` |
| SQL Apply (UPDATE + Rebuild) | **Ja** — nur Staging, scoped |
| Inserts / Deletes / Cleanup | **Nein** |
| Schema/Policy/Grant | **Keine Änderung** |
| Push / Deploy / Launch | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.4L frei — Staging Marker Deindex Fix nach frischem Backup, UPDATE nur der 12 P5-E.9E.4I-Posts auf Staging `jzzgoiwfbuwiiyvwgwri`, Marker aus `content` entfernen, `bl_rebuild_search_documents()`, read-only RPC Re-run, kein Production, kein Legacy, kein Push, kein Deploy, kein Launch, kein Cleanup der 12 Posts.“

---

## Staging Target Verification

| Feld | Wert |
|------|------|
| Project Ref | `jzzgoiwfbuwiiyvwgwri` |
| Project Name | `boundlore-staging` |
| URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` |
| Status | `ACTIVE_HEALTHY` |
| Legacy / Production | **Nicht verwendet** |

---

## Fresh Backup Evidence

| Item | Wert |
|------|------|
| Pfad | `backups/staging/p5-e9e4l-deindex-prewrite-20260714-144851.dump` |
| Größe | **410.882 bytes** |
| SHA256 | `A32707BC7C3C159EFAC28E581CBEC3B0B5B870624A4AD8064D3A559B69563060` |
| TOC Entries | **753** |
| Gitignored | `[x]` |

---

## Before Inventory

| Item | Wert |
|------|------|
| Ziel-Posts vorhanden | **12/12** |
| `status = published` | **12/12** |
| `deleted_at IS NULL` | **12/12** |
| Marker in `content` | **12/12** |
| Marker außerhalb 12 Slugs | **0** |
| `search_documents` (-p5e9e4i) | **12** |
| RPC `P5E9E4I` (vor Fix) | **12 Treffer** |
| RPC `P5E9E4I_STAGING_PERSISTENT_CANONICAL` (vor Fix) | **0** (Vollstring nicht separat getestet; Marker in content) |
| `anon` SELECT `profiles` | **Nein** |
| `anon` SELECT `search_documents` | **Nein** |

---

## Update Scope

| Aspekt | Detail |
|--------|--------|
| Tabelle | `posts` only |
| Spalte | `content` only |
| Slugs | Exakte 12 `-p5e9e4i`-Liste |
| Aktion | `replace(content, 'P5E9E4I_STAGING_PERSISTENT_CANONICAL', '')` |
| WHERE | slug IN (12) AND content LIKE '%P5E9E4I_STAGING_PERSISTENT_CANONICAL%' |

---

## Update Verification

| Check | Ergebnis |
|-------|----------|
| 12 Posts existieren | **Ja** |
| Alle `published` | **Ja** |
| Marker in `content` | **0/12** (0 gesamt in DB) |
| Keine anderen Posts geändert | **Ja** |
| Kein Delete/Cleanup | **Ja** |
| Keine Schema-/Grant-Änderung | **Ja** |

---

## Rebuild Verification

| Check | Ergebnis |
|-------|----------|
| `bl_rebuild_search_documents()` | **12 Zeilen** |
| `search_documents` (-p5e9e4i) | **12** |
| Marker in `search_text` | **Nein** (Stichprobe 3/3) |
| RPC `P5E9E4I_STAGING_PERSISTENT_CANONICAL` | **0 Treffer** |
| RPC `monster` | **1 Treffer** (Ember Salamander) |

---

## RPC-first Re-run Matrix

| Query | Treffer | Top-Titel | Erwartet |
|-------|---------|-----------|----------|
| monster / creature / beast / salamander | 1 | Ember Salamander | Ja |
| wolf / predator | 1–3 | Ashen Wolf | Ja |
| artifact / charm | 1 | Volcanic Heat Charm | Ja |
| compass / cartographer | 1 | Moonlit Cartographer Compass | Ja |
| basalt / volcanic | 6 | Cinder Basalt Flats / Volcanic Heat Charm | Ja |
| swamp / mire | 1–2 | Silverfen Mire | Ja |
| resource / shard | 1–2 | Molten Ember Shard | Ja |
| crystal / skyglass | 1 | Skyglass Crystal | Ja |
| guide / guild | 1 | Ember Wardens / Guild of Quiet Cartographers | Ja |
| outpost / forge | 2 | Ashen Forge Outpost | Ja |
| ritual / lore | 1 | Ritual of the First Flame | Ja |
| **P5E9E4I_STAGING_PERSISTENT_CANONICAL** | **0** | — | Ja |
| P5E9E4I | 12 | Slug-Suffix `-p5e9e4i` | Slug-Artefakt¹ |
| zzzxxy-no-hit / unsafe / long | 0 | — | Ja |

¹ **Slug-Suffix-Artefakt:** Kurzquery `P5E9E4I` matcht Slug-Token `p5e9e4i`, nicht den entfernten Marker-String. Kein `content`/`search_text`-Leak.

**Core + Safety (exkl. Slug-Artefakt):** **28/28 PASS**. Gesamt inkl. Slug-Artefakt dokumentiert.

---

## Safety / No-Leak Results

| Check | Ergebnis |
|-------|----------|
| Kein `42501` | **PASS** |
| Kein BLMETA in UI | **PASS** |
| Kein `search_text` / `search_vector` in UI | **PASS** |
| Marker nicht in UI-Snippets | **PASS** |
| Expliziter Marker-String nicht suchbar | **PASS** |
| Keine Profile-PII | **PASS** |
| RPC-first aktiv | **PASS** |

---

## Persistent Corpus / No Cleanup Confirmation

| Entscheidung | Wert |
|--------------|------|
| 12 Posts bleiben | **Ja** |
| Delete / Cleanup | **Nein** |
| Persistenter Corpus | **PERSISTENT_CANONICAL_SEED_PASS** (unverändert) |

---

## Updated Rollback Plan

| Mechanismus | Detail |
|-------------|--------|
| **Primär** | Exakte 12-Slug-Liste (Suffix `-p5e9e4i`) |
| **Manifest** | `p5-staging-persistent-canonical-corpus-seed-report.md` |
| **Delete** | `DELETE FROM posts WHERE slug IN (...12 slugs...)` |
| **Rebuild** | `bl_rebuild_search_documents()` nach Delete |
| **Hinweis** | Marker nicht mehr in `content` — Rollback nur über Slugs |

---

## Marker Risk Decision

| Risiko | Status |
|--------|--------|
| Marker in indexiertem `content` | **CLOSED_STAGING** |
| Marker in `search_text` | **CLOSED_STAGING** |
| Query `P5E9E4I_STAGING_PERSISTENT_CANONICAL` | **0 Treffer — CLOSED** |
| Query `P5E9E4I` via Slug-Suffix | **Offen als Slug-Artefakt** — kein Marker-Leak; Production-Slugs ohne Gate-Suffix |

---

## Limitations

1. **Slug-Suffix `-p5e9e4i`** bleibt FTS-suchbar unter Kurzquery `P5E9E4I`.
2. **Staging-only** — kein Production-Pfad.
3. **S-06 / S-05** unverändert **OPEN_BLOCKING**.

---

## Required Follow-up Gates

| Gate | Zweck |
|------|-------|
| **Production Content Migration** | Separater Gate |
| **Slug-Rename (optional)** | Entfernung `-p5e9e4i`-Suffix nur mit eigener Freigabe |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4L | **PASS** |
| MARKER_DEINDEX_STAGING_PASS | **PASS** |
| MARKER_SEARCHABLE_RISK | **CLOSED_STAGING** |
| Persistent Staging Search Re-run | **PASS** |
| Persistent Canonical Corpus | **PERSISTENT_CANONICAL_SEED_PASS** |
| Search DB/FTS Runtime Evidence | **STAGING_PASS** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| Public Launch | **NO-GO** |

---

*Dokumentversion: P5-E.9E.4L PASS. Marker deindexiert. Keine Deletes. Keine Secrets.*
