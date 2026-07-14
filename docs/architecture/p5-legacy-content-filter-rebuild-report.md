# P5-E.9E.5G — Legacy Content Filter + Rebuild Report

**Gate:** P5-E.9E.5G — Legacy Content Filter + Rebuild. **PASS**.

**HEAD vor Gate:** `a8b90fc` — Apply legacy search database objects

**Arbeitsmodus:** Legacy-Write nur für Content-Filter/Rebuild auf `ohkoojpzmptdfyowdgog`. Kein Content-Row-Write, kein Runtime-Switch, kein Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.5G** | **PASS** |
| **Legacy Content Filter/Rebuild** | **REBUILD_PASS** |
| **Legacy Search Index State** | **POPULATED** (6 rows) |
| **Legacy Search RPC Smoke** | **PASS** |
| **Legacy Profile/RLS Security (5E)** | **INTACT** |
| **Legacy Search DB/FTS (5F)** | **INTACT** |
| **S-06 Final Status** | **OPEN_BLOCKING** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Nach frischem 5G-Prewrite-Backup und intakter 5E/5F-Basis wurde `bl_rebuild_search_documents()` auf Legacy ausgeführt. Der Index enthält **6 public-safe Canonical-Kandidaten**. Deleted/Pending/Draft/Contribution/QA/test/fixture-Inhalte sind ausgeschlossen. RPC-Smoke **PASS**. Kein Content-Row-Write. Kein Runtime-Switch.

---

## HEAD / Working Tree

| Prüfung | Ergebnis |
|---------|----------|
| HEAD vor Gate | `a8b90fc` |
| Runtime Config | Unverändert — Staging `jzzgoiwfbuwiiyvwgwri` |
| `.env` geändert | **Nein** |
| Backup committed | **Nein** |
| Filter-DDL geändert | **Nein** (bestehender Filter ausreichend) |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.5G frei — Legacy Content Cleanup + Rebuild auf `ohkoojpzmptdfyowdgog` nach Search-DDL-Apply, nur Legacy-Write für Content-Filter/Rebuild, kein Runtime-Switch, kein Staging-Write, kein Push, kein Deploy, kein Launch.“

---

## Target Verification

| Feld | Wert |
|------|------|
| **Target Project Ref** | `ohkoojpzmptdfyowdgog` — **verifiziert** (MCP `get_project`) |
| **Projektname** | TheOverseer47's Project |
| **Staging Ref** | **Nicht verwendet** (Write) |
| **Runtime Config** | Staging `jzzgoiwfbuwiiyvwgwri` — unverändert |
| **Production / boundlore.com** | **Nicht verwendet** |
| **Connection Strings / Keys in diesem Dokument** | **Nein** |

---

## Backup Baseline

### 5D Baseline

| Check | Ergebnis |
|-------|----------|
| Pfad | `backups/legacy/p5-e9e5d-legacy-prewrite-20260714-152031.dump` |
| SHA256 | `3B5A5E6B59463505A42E812596BED4B41603CC0F189A18D99A5B0E1B0C852F7B` |
| Gitignored | **Ja** |

### 5F Baseline

| Check | Ergebnis |
|-------|----------|
| Pfad | `backups/legacy/p5-e9e5f-search-ddl-prewrite-20260714-154126.dump` |
| SHA256 | `70ACDE6722B89D8F5F05C6D3B430F3DC309CA8F86EEDE865B2A5202C6FD2EE13` |
| Gitignored | **Ja** |

---

## Fresh 5G Backup Evidence

| Item | Wert |
|------|------|
| Methode | `pg_dump` Custom Format via Session-Pooler |
| Pfad | `backups/legacy/p5-e9e5g-content-rebuild-prewrite-20260714-154908.dump` |
| Größe | **451,890 bytes** |
| SHA256 | `CD0F19681B35DEE1ECD325DD9F7EA882A48306540D8B70F44877F06BA695BA42` |
| TOC Entries | **715** |
| Gitignored | **Ja** |
| Restore | **Nein** |
| Committed | **Nein** |

---

## 5E/5F Integrity Check

| Check | Ergebnis |
|-------|----------|
| `profiles_select_all` | **0** |
| `anon SELECT profiles` | **false** |
| `public SELECT profiles` | **false** |
| Posts SELECT mit `profiles`-Subquery | **0** |
| RLS `profiles` | **active** |
| RLS `posts` | **active** |
| `search_documents` exists | **true** |
| RLS `search_documents` | **active** |
| `bl_search_public_content(text, jsonb)` | **present** |
| `bl_rebuild_search_documents()` | **present** |
| `anon SELECT search_documents` | **false** |
| `anon EXECUTE rebuild` | **false** |
| `anon EXECUTE RPC` | **true** |
| `search_documents` vor Rebuild | **0** |
| Published posts | **9** (unverändert) |

---

## Content Eligibility Inventory

| Metrik | Count |
|--------|-------|
| Total posts | 26 |
| Published (not deleted) | 9 |
| Pending status | 12 (überlappend mit deleted möglich) |
| Deleted (`deleted_at` set) | 16 |
| `Contribution:` titles | 13 |
| QA/test/fixture Slugs (`qa-`, `test-`, `fixture-`, `contribution-`) | 19 |
| Published QA Slugs | 3 |
| **Eligible Canonical candidates** | **6** |
| `content_origin` / `tags` auf `posts` | **N/A** — Spalten existieren nicht auf Legacy |

### Erwartete public-safe Kandidaten (Slugs)

| Slug | Title |
|------|-------|
| `near-a-campfire-787bbd19` | near a Campfire |
| `ogre-mage-9651e6` | Ogre Mage |
| `smought-835df97a` | Smought |
| `staff-of-fire-2f316b0d` | Staff of Fire |
| `swamplands-94dadc07` | Swamp |
| `why-boundlore-is-the-best-wiki-there-is-d16ea72a` | Why BoundLore is the best Wiki there is. |

---

## Filter Decision

**Entscheidung:** Bestehender Filter **ausreichend** — **keine Funktionsänderung**.

`bl_rebuild_search_documents()` nutzt `bl_search_row_is_public(status, deleted_at, slug, title, null, '{}'::text[])`:

- `status = 'published'`
- `deleted_at IS NULL`
- Slug nicht `qa-|test-|fixture-|contribution-`
- Titel nicht `Contribution:`
- `content_origin` / `exclude_public` Tags: Legacy-`posts` hat keine entsprechenden Spalten; `null`/`'{}'` korrekt

---

## Applied Filter Changes

**Keine.** Apply-Block `p5_e9e5g_legacy_content_filter_rebuild_guard` **nicht erforderlich**.

---

## Rebuild Execution

| Item | Wert |
|------|------|
| Befehl | `SELECT public.bl_rebuild_search_documents();` |
| Ergebnis | **6** Zeilen eingefügt |
| Manuelle `search_documents`-Writes | **Nein** |
| Content-Tabellen-Writes | **Nein** |

---

## Search Index Verification

| Check | Ergebnis |
|-------|----------|
| Row Count | **6** |
| Non-published | **0** |
| Contribution titles | **0** |
| QA/test/fixture slugs | **0** |
| BLMETA in index | **Nein** (nicht in RPC-Output) |
| Profile-PII | **Nein** |
| E-Mails | **Nein** |

### Indexierte Slugs/Titel

| Slug | Title |
|------|-------|
| `near-a-campfire-787bbd19` | near a Campfire |
| `ogre-mage-9651e6` | Ogre Mage |
| `smought-835df97a` | Smought |
| `staff-of-fire-2f316b0d` | Staff of Fire |
| `swamplands-94dadc07` | Swamp |
| `why-boundlore-is-the-best-wiki-there-is-d16ea72a` | Why BoundLore is the best Wiki there is. |

### Ausgeschlossene Klassen

- deleted (16)
- pending/draft (nicht published)
- `Contribution:` titles (13)
- QA/test/fixture/contribution- slugs (19 total; 3 published QA)
- exclude_public / content_origin (Spalten N/A auf Legacy)

---

## RPC Smoke Results

| Query | Hits | Top Slug | Fehler | Leaks |
|-------|------|----------|--------|-------|
| `ogre` | 1 | `ogre-mage-9651e6` | Nein | Nein |
| `campfire` | 1 | `near-a-campfire-787bbd19` | Nein | Nein |
| `swamp` | 1 | `swamplands-94dadc07` | Nein | Nein |
| `boundlore` | 1 | `why-boundlore-is-the-best-wiki-there-is-d16ea72a` | Nein | Nein |
| `staff fire` | 1 | `staff-of-fire-2f316b0d` | Nein | Nein |
| `smought` | 1 | `smought-835df97a` | Nein | Nein |
| `zzzxxy-no-hit` | 0 | — | Nein | Nein |
| `<script>alert(1)</script>` | 0 | — | Nein | Nein |
| 160+ char query | 0 | — | Nein | Nein |
| `Contribution` | 0 | — | Nein | Nein |
| `P5E9E4I` | 0 | — | Nein | Nein |
| `qa-test` | 0 | — | Nein | Nein |

RPC-Output-Felder: whitelisted (`id`, `source_type`, `canonical_slug`, `canonical_url`, `title`, `excerpt`, `category`, `entity_domain`, `entity_subtype`, `score`, `matched_fields`). Kein `search_text`, `search_vector`, BLMETA, Profile-PII.

---

## No Content Row Write Confirmation

| Check | Ergebnis |
|-------|----------|
| INSERT/UPDATE/DELETE auf `posts` | **Nein** |
| INSERT/UPDATE/DELETE auf `profiles` | **Nein** |
| INSERT/UPDATE/DELETE auf `wiki_entities` | **Nein** |
| Writes nur via Rebuild auf `search_documents` | **Ja** |
| Published posts count | **9** (unverändert) |

---

## No Runtime Switch Confirmation

| Check | Ergebnis |
|-------|----------|
| `js/supabase-config.js` | Staging `jzzgoiwfbuwiiyvwgwri` |
| Legacy ref forbidden | `ohkoojpzmptdfyowdgog` |
| Push / Deploy / Launch | **Nein** |

---

## Residual Content Risks

| Risiko | Status |
|--------|--------|
| Legacy Content-Basis dünn (6 Docs) | **Akzeptiert** — Recall-Matrix in 5H |
| Kein `seed-` Slug-Filter in `bl_search_row_is_public` | **Low** — keine published seed- Slugs |
| Keine `content_origin`/`tags` auf Legacy posts | **N/A** — Filter via Slug/Titel/Status ausreichend |
| S-06 Final Closure | **Offen** — erfordert 5H/5J |

---

## Required Future Gates

| Gate | Scope |
|------|-------|
| **P5-E.9E.5H** | Legacy RPC-first Search Verification |
| **P5-E.9E.5I** | Legacy Runtime Dry Run |
| **P5-E.9E.5J** | S-06 Final Closure |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.5G | **PASS** |
| Legacy Content Filter/Rebuild | **REBUILD_PASS** |
| Legacy Search Index State | **POPULATED** (6) |
| Legacy Search RPC Smoke | **PASS** |
| Legacy Profile/RLS Security | **INTACT** |
| Legacy Search DB/FTS | **INTACT** |
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** P5-E.9E.5H — Legacy RPC-first Search Verification

**Manuelle Nutzerfreigabe nötig:** **Ja**

> „Ja, ich gebe P5-E.9E.5H frei — Legacy RPC-first Search Verification auf `ohkoojpzmptdfyowdgog` nach Content Rebuild, read-only Verification, kein Runtime-Switch, kein Staging-Write, kein Push, kein Deploy, kein Launch.“

---

*Dokumentversion: P5-E.9E.5G PASS. Keine Secrets. Kein Content Row Write. Kein Runtime-Switch.*
