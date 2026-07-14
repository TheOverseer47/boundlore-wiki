# P5-E.9E.4I — Staging Persistent Canonical Corpus Seed Report

**Gate:** P5-E.9E.4I — Staging Persistent Canonical Corpus Seed. **PASS**.

**HEAD vor Gate:** `7aaf42a` — Plan search content migration

**Arbeitsmodus:** Nur Staging `jzzgoiwfbuwiiyvwgwri`. Persistenter Corpus ohne Cleanup. Kein Production/Legacy/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4I** | **PASS** |
| **Persistent Canonical Corpus** | **PERSISTENT_CANONICAL_SEED_PASS** |
| **Search DB/FTS Evidence** | **PASS** (12 persistente Docs) |
| **Search DB/FTS Runtime Evidence** | **STAGING_PASS** (4J Re-run) |
| **S-06 Search Recall** | **OPEN_BLOCKING** (Staging **STAGING_PASS**; Production offen) |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Frischer Backup vor Seed. 12 kontrollierte published Canonicals persistent eingefügt. `bl_rebuild_search_documents()` → **12 Zeilen**. RPC-first Query-Matrix **21/21 PASS** (Core + Safety). Marker nicht in UI sichtbar. **Kein Cleanup** — persistenter Staging-Corpus bleibt. Rollback-Plan dokumentiert.

---

## HEAD / Working Tree / Apply-Scope-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `7aaf42a` |
| Staging Ref | `jzzgoiwfbuwiiyvwgwri` |
| Posts inserted | **12** (nur `posts`) |
| Cleanup | **Nein** — persistenter Corpus |
| Schema/Policy/Grant | **Keine Änderung** |
| Push / Deploy / Launch | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.4I frei — Staging Persistent Canonical Corpus Seed nach frischem Backup, 10–20 kontrollierte published Canonicals auf Staging `jzzgoiwfbuwiiyvwgwri`, Rebuild von `search_documents`, RPC-first Query-Matrix, persistenter Corpus ohne Cleanup, kein Production, kein Legacy, kein Push, kein Deploy, kein Launch.“

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
| Pfad | `backups/staging/p5-e9e4i-seed-prewrite-20260714-141253.dump` |
| Größe | **401,466 bytes** |
| SHA256 | `D5FFA4ACFCC59D1D3D31EEADB29EE19683DF369AD70EE2E7467F5909EC819729` |
| TOC Entries | **744** |
| Gitignored | `[x]` |

---

## Before Inventory

| Item | Wert |
|------|------|
| Published posts | **0** |
| `search_documents` | **0** |
| Marker `P5E9E4I_STAGING_PERSISTENT_CANONICAL` | **0** |
| Marker `P5E9E4G_STAGING_RPC_CORPUS` | **0** |
| Ziel-Slugs vorhanden | **0** |
| `bl_rebuild_search_documents` | **Vorhanden** |
| `bl_search_public_content` | **Vorhanden** |
| `anon` SELECT `profiles` | **false** |
| `anon` SELECT `search_documents` | **false** |

---

## Schema / Constraint Review

| Check | Ergebnis |
|-------|----------|
| `author_id` | **Nullable** — Seed ohne Profile |
| `title`, `content`, `slug` | **NOT NULL** — befüllt |
| `post_type` | `wiki` / `guide` (CHECK-konform) |
| `category` | Wiki: creatures/biomes/items/guilds/locations/lore; Guide: **NULL** |
| Marker-Feld | **Kein dediziertes Feld** — Marker in `content` (nicht in excerpt/UI-Snippet) |
| Rollback | Exakte **12 Slugs** + Marker |

---

## Seed Corpus Records

| Slug | Titel | Kategorie | Abdeckung |
|------|-------|-----------|-----------|
| `ember-salamander-p5e9e4i` | Ember Salamander | creatures | monster, creature, beast, salamander |
| `ashen-wolf-p5e9e4i` | Ashen Wolf | creatures | wolf, predator |
| `volcanic-heat-charm-p5e9e4i` | Volcanic Heat Charm | items | artifact, charm, volcanic |
| `moonlit-cartographer-compass-p5e9e4i` | Moonlit Cartographer Compass | items | compass, cartographer, tool |
| `cinder-basalt-flats-p5e9e4i` | Cinder Basalt Flats | biomes | basalt, volcanic biome |
| `silverfen-mire-p5e9e4i` | Silverfen Mire | biomes | swamp, mire |
| `molten-ember-shard-p5e9e4i` | Molten Ember Shard | items | resource, shard, mining |
| `skyglass-crystal-p5e9e4i` | Skyglass Crystal | items | crystal, skyglass |
| `ember-wardens-field-guide-p5e9e4i` | Ember Wardens Field Guide | guide | guide, wardens, field guide |
| `guild-of-quiet-cartographers-p5e9e4i` | Guild of Quiet Cartographers | guilds | guild, cartographers, faction |
| `ashen-forge-outpost-p5e9e4i` | Ashen Forge Outpost | locations | outpost, forge, location |
| `ritual-of-the-first-flame-p5e9e4i` | Ritual of the First Flame | lore | ritual, flame, lore |

**Marker:** `P5E9E4I_STAGING_PERSISTENT_CANONICAL` (in `content`, nicht in excerpt)

---

## Insert Verification

| Check | Ergebnis |
|-------|----------|
| Posts eingefügt | **12/12** |
| `status = published` | **12/12** |
| Marker vorhanden | **12/12** |
| Keine Slug-Konflikte ohne Marker | **PASS** |
| Keine Schema-/Grant-Änderung | **PASS** |

---

## Rebuild Verification

| Check | Ergebnis |
|-------|----------|
| `bl_rebuild_search_documents()` | **12 Zeilen** |
| `search_documents` mit `-p5e9e4i` Slugs | **12** |
| RPC `monster` | Ember Salamander |
| Kein anon SELECT auf `search_documents` | **PASS** |

---

## RPC-first Query Matrix

| Query | Treffer | Top-Titel | Erwartet | PASS |
|-------|---------|-----------|----------|------|
| monster | 1 | Ember Salamander | Ja | ✅ |
| creature | 1 | Ember Salamander | Ja | ✅ |
| beast | 1 | Ember Salamander | Ja | ✅ |
| salamander | 1 | Ember Salamander | Ja | ✅ |
| wolf | 1 | Ashen Wolf | Ja | ✅ |
| artifact | 1 | Volcanic Heat Charm | Ja | ✅ |
| charm | 1 | Volcanic Heat Charm | Ja | ✅ |
| compass | 1 | Moonlit Cartographer Compass | Ja | ✅ |
| basalt | 6 | Cinder Basalt Flats | Ja | ✅ |
| volcanic | 6 | Volcanic Heat Charm | Ja | ✅ |
| swamp | 1 | Silverfen Mire | Ja | ✅ |
| resource | 2 | Molten Ember Shard | Ja | ✅ |
| crystal | 1 | Skyglass Crystal | Ja | ✅ |
| guide | 1 | Ember Wardens Field Guide | Ja | ✅ |
| guild | 1 | Guild of Quiet Cartographers | Ja | ✅ |
| outpost | 2 | Ashen Forge Outpost | Ja | ✅ |
| ritual | 1 | Ritual of the First Flame | Ja | ✅ |
| lore | 1 | Ritual of the First Flame | Ja | ✅ |
| zzzxxy-no-hit | 0 | — | 0 Treffer | ✅ |
| unsafe HTML | 0 | — | fail-closed | ✅ |
| 150×`z` | 0 | — | fail-closed | ✅ |

**Pfad:** `BoundLoreSearch.runRpcSearch` / `bl_search_public_content`. Kein `.from('posts')`.

**Fixtures:** Staging Runtime 21/21, Hardening 92/92, Recall 98/98, RPC Integration 47/47 **PASS**.

---

## Safety / No-Leak Results

| Check | Ergebnis |
|-------|----------|
| Kein `42501` | **PASS** |
| Marker `P5E9E4I` nicht in UI | **PASS** |
| Kein BLMETA in Search-UI | **PASS** |
| Kein `search_text` / `search_vector` in UI | **PASS** |
| Keine Profile-PII | **PASS** |
| Unsafe Query fail-closed | **PASS** |
| RPC-first aktiv | **PASS** |

---

## Persistent Corpus / No Cleanup Decision

| Entscheidung | Wert |
|--------------|------|
| Cleanup am Gate-Ende | **Nein** |
| Persistenter Staging-Corpus | **Ja** — 12 published posts + 12 search_documents |
| Begründung | Seed-Gate laut Plan 4H/4I — Recall-Basis für weitere Verifikation |

---

## Rollback Plan (nur mit separater Freigabe)

| Item | Detail |
|------|--------|
| Scope | Nur 12 Slugs mit Marker `P5E9E4I_STAGING_PERSISTENT_CANONICAL` |
| Slugs | Siehe Seed Corpus Records |
| Delete | `DELETE FROM posts WHERE slug IN (...) AND content LIKE '%P5E9E4I_%'` |
| Rebuild | `bl_rebuild_search_documents()` nach Delete |
| Verboten | Breites Delete, Truncate, Restore ohne Restore-Gate |

---

## Search DB/FTS Runtime Evidence Decision

| Phase | Evidence |
|-------|----------|
| Nach Seed + Rebuild | **PASS** — 12 persistente Docs, Query-Matrix 21/21 |
| Search DB/FTS Evidence | **PASS** (persistenter Staging-Index) |

---

## Limitations

1. **Staging-only** — kein Production-Content.
2. **S-06** bleibt **OPEN_BLOCKING** — Production-Pfad + Launch-Kriterien offen.
3. **S-05 SEO/CSR** unverändert **OPEN_BLOCKING**.
4. Marker in `content` — Rollback über Slug+Marker, nicht separates Metadatenfeld.

---

## Required Follow-up Gates

| Gate | Zweck |
|------|-------|
| **P5-E.9E.4 Re-run** | Vollständige Search-Verifikation mit persistentem Corpus |
| **Production Content Migration** | Separater Gate mit eigener Freigabe |
| **S-06 Closure** | Nach Production-Pfad + SEO/CSR |
| **Rollback (optional)** | Nur mit expliziter Freigabe |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4I | **PASS** |
| Persistent Canonical Corpus | **PERSISTENT_CANONICAL_SEED_PASS** |
| Search DB/FTS Evidence | **PASS** |
| Search DB/FTS Runtime Evidence | **PASS** |
| Search Runtime Evidence (Client) | **PASS** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

**Follow-up P5-E.9E.4J:** Read-only Re-run **PASS** — Query-Matrix 27/27. **MARKER_SEARCHABLE_RISK** (Marker RPC-indexiert, nicht in UI). Report: `p5-persistent-staging-search-rerun-report.md`.

---

*Dokumentversion: P5-E.9E.4I PASS. Persistenter Corpus auf Staging. Kein Cleanup. Keine Secrets.*
