# P5-E.9E.4G — Staging RPC Corpus Verification Report

**Gate:** P5-E.9E.4G — Staging RPC Corpus Verification. **PASS**.

**HEAD vor Gate:** `aa4f47a` — Integrate search RPC client

**Arbeitsmodus:** Nur Staging `jzzgoiwfbuwiiyvwgwri`. Kontrollierte Corpus-Writes + Rebuild + Cleanup. Kein Production/Legacy/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4G** | **PASS** |
| **RPC Corpus Verification** | **RPC_CORPUS_VERIFIED_CLEANED** |
| **Search DB/FTS Runtime Evidence** | **PASS** |
| **Search DB/FTS Evidence** | **PARTIAL_EMPTY_CORPUS** (nach Cleanup) |
| **Search Runtime Evidence (Client)** | **PASS** |
| **S-06 Search Recall** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Frischer Backup vor Write. 5 kontrollierte published Posts eingefügt, `bl_rebuild_search_documents()` → **5 Zeilen**. RPC-first Query-Matrix über lokale UI **PASS** (monster→Ember Salamander, artifact→Volcanic Heat Charm, etc.). Client-Fix: `mapRpcResult` verwirft `matched_fields`-Metadatum `search_vector` nicht mehr fälschlich. Cleanup + Rebuild verifiziert (0 Slugs, 0 Marker, 0 Search-Docs). Safety/No-Leak **PASS**.

---

## HEAD / Working Tree / Apply-Scope-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `aa4f47a` |
| Staging Ref | `jzzgoiwfbuwiiyvwgwri` |
| Schema/Policy/Grant-Änderung | **Nein** |
| Migration / FTS-DDL | **Nein** |
| Push / Deploy / Launch | **Nein** |
| `.env`-Änderung | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.4G frei — Staging RPC Corpus Verification nach frischem Backup, kontrollierte published Search-Testposts auf Staging `jzzgoiwfbuwiiyvwgwri`, Rebuild von `search_documents`, Query-Matrix über RPC-first Client, Cleanup dokumentieren, kein Production, kein Legacy, kein Push, kein Deploy, kein Launch.“

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
| Pfad | `backups/staging/p5-e9e4g-rpc-corpus-prewrite-20260714-135553.dump` |
| Größe | **401,466 bytes** |
| SHA256 | `0E7287F1F5692045EFE52E84A532C9AF571C47584FED051E2E777F332EEE89AD` |
| TOC Entries | **744** |
| Gitignored | `[x]` |

---

## Before Inventory

| Item | Wert |
|------|------|
| Published posts | **0** |
| `search_documents` | **0** |
| Marker `P5E9E4G_STAGING_RPC_CORPUS` | **0** |
| Ziel-Slugs vorhanden | **0** |
| `bl_rebuild_search_documents` | **Vorhanden** |
| `bl_search_public_content` | **Vorhanden** |
| `anon` SELECT `profiles` | **false** |
| `anon` SELECT `search_documents` | **false** |

---

## Corpus Records

| Slug | Titel | Kategorie | Abdeckung |
|------|-------|-----------|-----------|
| `staging-rpc-ember-salamander-p5e9e4g` | Ember Salamander | creatures | monster, creature, beast, salamander |
| `staging-rpc-volcanic-heat-charm-p5e9e4g` | Volcanic Heat Charm | items | artifact, charm, item, tool, volcanic |
| `staging-rpc-cinder-basalt-flats-p5e9e4g` | Cinder Basalt Flats | biomes | basalt, volcanic, biome, region, zone |
| `staging-rpc-molten-ember-shard-p5e9e4g` | Molten Ember Shard | items | resource, mining, shard, ember |
| `staging-rpc-ember-wardens-guide-p5e9e4g` | Ember Wardens Field Guide | guide | guide, guild, wardens, field guide |

**Marker:** `P5E9E4G_STAGING_RPC_CORPUS` (in `content`)

---

## Insert Verification

| Check | Ergebnis |
|-------|----------|
| Posts eingefügt | **5/5** |
| `status = published` | **5/5** |
| Marker vorhanden | **5/5** |
| Keine Slug-Konflikte ohne Marker | **PASS** |

---

## Rebuild Verification

| Check | Ergebnis |
|-------|----------|
| `bl_rebuild_search_documents()` | **5 Zeilen** |
| Index enthält 5 Corpus-Slugs | **PASS** |
| Kein direkter anon SELECT auf `search_documents` | **PASS** |

---

## RPC-first Query Matrix

| Query | Treffer | Top-Titel | Top-Slug |
|-------|---------|-----------|----------|
| monster | 1 | Ember Salamander | staging-rpc-ember-salamander-p5e9e4g |
| creature | 1 | Ember Salamander | staging-rpc-ember-salamander-p5e9e4g |
| beast | 1 | Ember Salamander | staging-rpc-ember-salamander-p5e9e4g |
| salamander | 1 | Ember Salamander | staging-rpc-ember-salamander-p5e9e4g |
| artifact | 1 | Volcanic Heat Charm | staging-rpc-volcanic-heat-charm-p5e9e4g |
| charm | 1 | Volcanic Heat Charm | staging-rpc-volcanic-heat-charm-p5e9e4g |
| basalt | 1 | Cinder Basalt Flats | staging-rpc-cinder-basalt-flats-p5e9e4g |
| volcanic | 5 | Volcanic Heat Charm | staging-rpc-volcanic-heat-charm-p5e9e4g |
| resource | 1 | Molten Ember Shard | staging-rpc-molten-ember-shard-p5e9e4g |
| guide | 1 | Ember Wardens Field Guide | staging-rpc-ember-wardens-guide-p5e9e4g |
| guild | 1 | Ember Wardens Field Guide | staging-rpc-ember-wardens-guide-p5e9e4g |
| zzzxxy-no-hit | 0 | — | — |
| unsafe HTML | 0 | — | — |
| 150×`z` | 0 | — | — |

**Pfad:** RPC-first via `BoundLoreSearch.runRpcSearch` / `bl_search_public_content`. Kein `.from('posts')`.

---

## Safety / No-Leak Results

| Check | Ergebnis |
|-------|----------|
| Kein `42501` | **PASS** |
| Kein BLMETA sichtbar | **PASS** |
| Kein `search_text` / `search_vector` in UI | **PASS** |
| Keine Profile-PII | **PASS** |
| Unsafe Query fail-closed | **PASS** |
| Keine Schema/Policy/Grant-Änderung | **PASS** |

---

## Cleanup Verification

| Check | Ergebnis |
|-------|----------|
| 5 Posts gelöscht (Slug + Marker) | **PASS** |
| Rebuild nach Cleanup | **0 Zeilen** |
| Slugs verbleibend | **0** |
| Marker verbleibend | **0** |
| Search-Docs verbleibend | **0** |
| Published posts | **0** |

**Status:** **RPC_CORPUS_VERIFIED_CLEANED**

---

## Client Fix (4G)

`mapRpcResult` in `js/search.js`: Leak-Probe schließt `matched_fields`-Metadatum aus — RPC-Feldname `search_vector` in `matched_fields[]` ist kein Leak des Vektors selbst.

---

## Search DB/FTS Runtime Evidence Decision

| Phase | Evidence |
|-------|----------|
| Mit Corpus + Rebuild | **PASS** — RPC-first Client liefert erwartete Treffer |
| Nach Cleanup | **PARTIAL_EMPTY_CORPUS** — Staging wieder leer |

---

## Limitations

1. Corpus temporär — kein persistenter Production-Content.
2. S-06 bleibt **OPEN_BLOCKING** — Production-Pfad + persistenter Corpus fehlen.
3. `matched_fields`-Fix war für echte RPC-Responses nötig.

---

## Required Follow-up Gates

| Gate | Zweck |
|------|-------|
| **Production Content Migration** | Persistenter published Corpus |
| **P5-E.9E.4 Re-run (Production)** | Recall gegen echten Content |
| **S-06 Closure** | Erst nach Production-Pfad |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4G | **PASS** |
| RPC Corpus Verification | **RPC_CORPUS_VERIFIED_CLEANED** |
| Search DB/FTS Runtime Evidence | **PASS** (während Gate; Cleanup danach PARTIAL) |
| Search DB/FTS Evidence | **PARTIAL_EMPTY_CORPUS** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

*Dokumentversion: P5-E.9E.4G PASS. Keine Secrets.*
