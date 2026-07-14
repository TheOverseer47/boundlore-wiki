# P5-E.9E.4J — Persistent Staging Search Re-run Report

**Gate:** P5-E.9E.4J — Persistent Staging Search Re-run. **PASS** (mit dokumentiertem **MARKER_SEARCHABLE_RISK**).

**HEAD vor Gate:** `fbb79ad` — Seed staging persistent search corpus

**Arbeitsmodus:** Nur Staging `jzzgoiwfbuwiiyvwgwri`. Read-only gegen persistenten Corpus aus P5-E.9E.4I. Kein SQL/DB-Write/Rebuild/Cleanup.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4J** | **PASS** |
| **Persistent Staging Search Re-run** | **PARTIAL** (MARKER_SEARCHABLE_RISK) |
| **Persistent Canonical Corpus** | **PERSISTENT_CANONICAL_SEED_PASS** (unverändert) |
| **Search DB/FTS Evidence** | **PASS** (12 persistente Docs) |
| **Search DB/FTS Runtime Evidence** | **STAGING_PASS** |
| **S-06 Search Recall** | **OPEN_BLOCKING** (Staging **STAGING_PASS**; Production offen) |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Read-only Re-run gegen persistenten Staging-Corpus. RPC-first Query-Matrix **27/27 PASS** (24 Core + 3 Safety). Fixtures **21/21 + 92/92 + 48/48 + 48/48 PASS**. Keine Writes/Rebuild/Cleanup. Marker `P5E9E4I` per RPC auffindbar (12 Treffer), aber **nicht in UI-Snippets sichtbar** → **MARKER_SEARCHABLE_RISK** dokumentiert.

---

## HEAD / Working Tree / No-Write-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `fbb79ad` |
| SQL ausgeführt | **Nein** |
| DB-Read / DB-Write | **Nein** |
| Inserts / Rebuild / Cleanup | **Nein** |
| Supabase-Writes | **Nein** |
| Schema/Policy/Grant | **Keine Änderung** |
| Push / Deploy / Launch | **Nein** |
| `.env`-Änderung | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.4J frei — Persistent Staging Search Re-run, read-only gegen den bestehenden persistenten Corpus auf Staging `jzzgoiwfbuwiiyvwgwri`, keine Inserts, kein Rebuild, kein Cleanup, kein SQL Apply, kein DB-Write, kein Production, kein Legacy, kein Push, kein Deploy, kein Launch.“

---

## Staging Runtime Verification

| Check | Ergebnis |
|-------|----------|
| Project Ref | `jzzgoiwfbuwiiyvwgwri` |
| Config Status | `STAGING_REF_VERIFIED` |
| URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` |
| Legacy `ohkoojpzmptdfyowdgog` | **Nicht aktiv** |
| Production / boundlore.com | **Nicht aktiv** |
| Secrets in Output | **Nein** |

**Quellen:** `js/supabase-config.js`, Staging Runtime Fixtures 21/21 PASS, Live-RPC auf `/wiki/search/`.

---

## Persistent Corpus Context

| Item | Wert |
|------|------|
| Quelle | P5-E.9E.4I Seed |
| Published Posts | **12** |
| `search_documents` | **12** |
| Marker | `P5E9E4I_STAGING_PERSISTENT_CANONICAL` (in `content`) |
| Corpus geändert in 4J | **Nein** |

---

## Fixture Results

| Fixture | Ergebnis |
|---------|----------|
| Staging Runtime Config | **21/21 PASS** |
| Client Hardening | **92/92 PASS** |
| Search Recall | **48/48 PASS** |
| RPC Integration | **48/48 PASS** |
| `/wiki/search/` | Lädt ohne Crash |

**Lokaler Server:** `http://localhost:8080`

---

## RPC-first Path Verification

| Check | Ergebnis |
|-------|----------|
| Primärpfad | `bl_search_public_content` via `BoundLoreSearch.runRpcSearch` |
| `.from('posts')` in `js/search.js` | **Nein** |
| Insert/Update/Delete/Upsert | **Nein** |
| Fail-closed bei unsafe Query | **Ja** |
| Whitelist Output-Felder | title, slug/url, excerpt, category/type, score |
| RPC bei allen Queries | `usedRpc: true` |

---

## Query Matrix

| Query | Treffer | Top-Titel | Top-Slug | Erwartet |
|-------|---------|-----------|----------|----------|
| monster | 1 | Ember Salamander | ember-salamander-p5e9e4i | Ja |
| creature | 1 | Ember Salamander | ember-salamander-p5e9e4i | Ja |
| beast | 1 | Ember Salamander | ember-salamander-p5e9e4i | Ja |
| salamander | 1 | Ember Salamander | ember-salamander-p5e9e4i | Ja |
| wolf | 1 | Ashen Wolf | ashen-wolf-p5e9e4i | Ja |
| predator | 3 | Ashen Wolf | ashen-wolf-p5e9e4i | Ja |
| artifact | 1 | Volcanic Heat Charm | volcanic-heat-charm-p5e9e4i | Ja |
| charm | 1 | Volcanic Heat Charm | volcanic-heat-charm-p5e9e4i | Ja |
| compass | 1 | Moonlit Cartographer Compass | moonlit-cartographer-compass-p5e9e4i | Ja |
| cartographer | 1 | Moonlit Cartographer Compass | moonlit-cartographer-compass-p5e9e4i | Ja |
| basalt | 6 | Cinder Basalt Flats | cinder-basalt-flats-p5e9e4i | Ja |
| volcanic | 6 | Volcanic Heat Charm | volcanic-heat-charm-p5e9e4i | Ja |
| swamp | 1 | Silverfen Mire | silverfen-mire-p5e9e4i | Ja |
| mire | 2 | Silverfen Mire | silverfen-mire-p5e9e4i | Ja |
| resource | 2 | Molten Ember Shard | molten-ember-shard-p5e9e4i | Ja |
| shard | 1 | Molten Ember Shard | molten-ember-shard-p5e9e4i | Ja |
| crystal | 1 | Skyglass Crystal | skyglass-crystal-p5e9e4i | Ja |
| skyglass | 1 | Skyglass Crystal | skyglass-crystal-p5e9e4i | Ja |
| guide | 1 | Ember Wardens Field Guide | ember-wardens-field-guide-p5e9e4i | Ja |
| guild | 1 | Guild of Quiet Cartographers | guild-of-quiet-cartographers-p5e9e4i | Ja |
| outpost | 2 | Ashen Forge Outpost | ashen-forge-outpost-p5e9e4i | Ja |
| forge | 2 | Ashen Forge Outpost | ashen-forge-outpost-p5e9e4i | Ja |
| ritual | 1 | Ritual of the First Flame | ritual-of-the-first-flame-p5e9e4i | Ja |
| lore | 1 | Ritual of the First Flame | ritual-of-the-first-flame-p5e9e4i | Ja |
| zzzxxy-no-hit | 0 | — | — | Ja |
| unsafe HTML | 0 | — | — | Ja |
| 150×`z` | 0 | — | — | Ja |

**Gesamt:** 27/27 erwartete Treffer erfüllt. Kein Crash, kein `42501`.

---

## Safety / No-Leak Results

| Check | Ergebnis |
|-------|----------|
| Kein `42501` | **PASS** |
| Kein BLMETA in UI | **PASS** |
| Kein `search_text` / `search_vector` in UI | **PASS** |
| Marker nicht in UI-Snippets | **PASS** |
| Keine Profile-PII | **PASS** |
| Unsafe Query fail-closed | **PASS** |
| Kein Script ausgeführt | **PASS** |
| **MARKER_SEARCHABLE_RISK** | **OPEN** — Fix-Gate **P5-E.9E.4L** empfohlen |
| **P5-E.9E.4K** | **PASS** — Mitigation Plan |

---

## Evidence Decision

| Evidence | Entscheidung |
|----------|--------------|
| Search DB/FTS Runtime Evidence | **STAGING_PASS** — persistenter Corpus liefert stabile Recall-Treffer |
| Persistent Staging Search Re-run | **PARTIAL** — MARKER_SEARCHABLE_RISK (kein UI-Leak, aber RPC-indexiert) |
| S-06 Staging Evidence | **STAGING_PASS** — Recall auf Staging verifiziert |
| S-06 Final Closure | **OPEN_BLOCKING** — Production-Pfad fehlt |

---

## Limitations

1. **Read-only** — kein erneuter DB-Inventar-Lauf per SQL (Corpus-Kontext aus P5-E.9E.4I).
2. **MARKER_SEARCHABLE_RISK** — Mitigation Plan **P5-E.9E.4K PASS**; Fix-Gate **P5-E.9E.4L** empfohlen (Option A: Marker aus `content` entfernen).
3. **Staging-only** — kein Production-Recall-Nachweis.
4. **S-06 / S-05** unverändert **OPEN_BLOCKING**.

---

## Required Follow-up Gates

| Gate | Zweck |
|------|-------|
| **Marker-Feld-Migration** (optional) | Dediziertes internes Metadatenfeld statt Marker in `content` |
| **Production Content Migration** | Separater Gate mit eigener Freigabe |
| **S-06 Closure** | Nach Production-Pfad + SEO/CSR |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4J | **PASS** |
| Persistent Staging Search Re-run | **PARTIAL** (MARKER_SEARCHABLE_RISK) |
| Persistent Canonical Corpus | **PERSISTENT_CANONICAL_SEED_PASS** |
| Search DB/FTS Evidence | **PASS** |
| Search DB/FTS Runtime Evidence | **STAGING_PASS** |
| Search Runtime Evidence (Client) | **PASS** |
| S-06 Search Recall | **OPEN_BLOCKING** (Staging **STAGING_PASS**) |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

---

*Dokumentversion: P5-E.9E.4J PASS. Read-only Re-run. Keine Writes. Keine Secrets.*
