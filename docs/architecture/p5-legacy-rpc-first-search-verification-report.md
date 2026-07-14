# P5-E.9E.5H — Legacy RPC-first Search Verification Report

**Gate:** P5-E.9E.5H — Legacy RPC-first Search Verification. **PASS**.

**HEAD vor Gate:** `454d052` — Rebuild legacy search index

**Arbeitsmodus:** Read-only Verification auf `ohkoojpzmptdfyowdgog`. Kein Write, kein Rebuild, kein Runtime-Switch, kein Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.5H** | **PASS** |
| **Legacy RPC-first Search Verification** | **VERIFIED_PASS** |
| **Legacy Search Query Matrix** | **PASS** (12/12 core) |
| **Legacy Search Safety** | **PASS** (10/10 exclusion) |
| **Legacy Search Output Contract** | **PASS** |
| **Legacy Search Index State** | **POPULATED** (6 rows, unverändert) |
| **Legacy Profile/RLS Security** | **INTACT** |
| **S-06 Final Status** | **OPEN_BLOCKING** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Nach 5G-Rebuild verifiziert Legacy Search read-only über `bl_search_public_content(text, jsonb)` — Core-Recall, Safety/Exclusion, Output Contract und Filter-Argumente **PASS**. Keine Leaks. Keine Writes. Kein Runtime-Switch.

---

## HEAD / Working Tree

| Prüfung | Ergebnis |
|---------|----------|
| HEAD vor Gate | `454d052` |
| Runtime Config | Unverändert — Staging `jzzgoiwfbuwiiyvwgwri` |
| `.env` geändert | **Nein** |
| Rebuild in 5H | **Nein** |
| Writes in 5H | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.5H frei — Legacy RPC-first Search Verification auf `ohkoojpzmptdfyowdgog` nach Content Rebuild, read-only Verification, kein Runtime-Switch, kein Staging-Write, kein Push, kein Deploy, kein Launch.“

---

## Target Verification

| Feld | Wert |
|------|------|
| **Target Project Ref** | `ohkoojpzmptdfyowdgog` — **verifiziert** (MCP `get_project`) |
| **Staging Ref** | **Nicht als Verification-Ziel verwendet** |
| **Runtime Config** | Staging `jzzgoiwfbuwiiyvwgwri` — unverändert |
| **boundlore.com** | **Nicht verwendet** |

---

## Baseline Evidence

| Backup | Pfad | SHA256 (Kurz) | Gitignored |
|--------|------|---------------|------------|
| 5D | `backups/legacy/p5-e9e5d-legacy-prewrite-20260714-152031.dump` | `3B5A5E6B…852F7B` | Ja |
| 5F | `backups/legacy/p5-e9e5f-search-ddl-prewrite-20260714-154126.dump` | `70ACDE67…2EE13` | Ja |
| 5G | `backups/legacy/p5-e9e5g-content-rebuild-prewrite-20260714-154908.dump` | `CD0F1968…5BA42` | Ja |

Kein Restore. Keine Backups committed.

---

## Integrity Check 5E/5F/5G

| Check | Ergebnis |
|-------|----------|
| `profiles_select_all` | **0** |
| `anon/public SELECT profiles` | **false** |
| Posts SELECT mit `profiles`-Subquery | **0** |
| RLS profiles/posts/search_documents | **active** |
| `anon SELECT search_documents` | **false** |
| `bl_search_public_content` | **present** |
| `bl_rebuild_search_documents` | **present** |
| `anon EXECUTE rebuild` | **false** |
| `anon EXECUTE RPC` | **true** |
| `search_documents` rows | **6** |
| Published posts | **9** |
| Indexierte Slugs | **6/6** — entsprechen 5G |

---

## RPC-first Verification Method

| Methode | Verwendet |
|---------|-----------|
| `bl_search_public_content(search_query, search_filters)` | **Ja** — read-only via MCP `execute_sql` |
| `.from('posts')` als Search-Pfad | **Nein** |
| Direkter public SELECT auf `search_documents` | **Nein** |
| Runtime-Switch auf Legacy | **Nein** |
| UI/boundlore.com Test | **Nein** |

**Client-Kompatibilität (statisch):** `js/search.js` nutzt RPC-first (`SEARCH_RPC_NAME = "bl_search_public_content"`), kein `.from('posts')` Primärpfad, `mapRpcResult` whitelistet Felder und fail-closed bei Leaks.

---

## Query Matrix Results

### Core Queries

| Query | Hits | Top Slug | Top Titel | Erwartet | Fehler | Leaks |
|-------|------|----------|-----------|----------|--------|-------|
| `ogre` | 1 | `ogre-mage-9651e6` | Ogre Mage | Ja | Nein | Nein |
| `mage` | 1 | `ogre-mage-9651e6` | Ogre Mage | Ja | Nein | Nein |
| `campfire` | 2 | `near-a-campfire-787bbd19` | near a Campfire | Ja | Nein | Nein |
| `near campfire` | 2 | `near-a-campfire-787bbd19` | near a Campfire | Ja | Nein | Nein |
| `swamp` | 2 | `swamplands-94dadc07` | Swamp | Ja | Nein | Nein |
| `swamplands` | 3 | `swamplands-94dadc07` | Swamp | Ja | Nein | Nein |
| `boundlore` | 1 | `why-boundlore-is-the-best-wiki-there-is-d16ea72a` | Why BoundLore is the best Wiki there is. | Ja | Nein | Nein |
| `best wiki` | 1 | `why-boundlore-is-the-best-wiki-there-is-d16ea72a` | Why BoundLore is the best Wiki there is. | Ja | Nein | Nein |
| `staff` | 2 | `staff-of-fire-2f316b0d` | Staff of Fire | Ja | Nein | Nein |
| `fire` | 3 | `staff-of-fire-2f316b0d` | Staff of Fire | Ja | Nein | Nein |
| `staff fire` | 2 | `staff-of-fire-2f316b0d` | Staff of Fire | Ja | Nein | Nein |
| `smought` | 1 | `smought-835df97a` | Smought | Ja | Nein | Nein |

**Core Matrix:** **12/12 PASS** — erwarteter Top-Treffer in allen Fällen korrekt.

---

## Expected Top Hit Verification

| Query-Gruppe | Erwarteter Slug | Top-Treffer | Status |
|--------------|-----------------|-------------|--------|
| `ogre` / `mage` | `ogre-mage-9651e6` | Ja | PASS |
| `campfire` / `near campfire` | `near-a-campfire-787bbd19` | Ja | PASS |
| `swamp` / `swamplands` | `swamplands-94dadc07` | Ja | PASS |
| `boundlore` / `best wiki` | `why-boundlore-is-the-best-wiki-there-is-d16ea72a` | Ja | PASS |
| `staff` / `fire` / `staff fire` | `staff-of-fire-2f316b0d` | Ja | PASS |
| `smought` | `smought-835df97a` | Ja | PASS |

Mehrfachtreffer bei breiten Queries (`fire`, `campfire`, `swamp`) sind erwartbar wegen Cross-Mentions in Excerpts — Ranking bleibt korrekt.

---

## Safety / Exclusion Results

| Query | Hits | Erwartet | RPC-Fehler | Leaks |
|-------|------|----------|------------|-------|
| `zzzxxy-no-hit` | 0 | 0 | Nein | Nein |
| unsafe HTML (`<script>…`) | 0 | 0 | Nein | Nein |
| 160+ char query | 0 | 0 | Nein | Nein |
| `Contribution` | 0 | 0 | Nein | Nein |
| `qa-test` | 0 | 0 | Nein | Nein |
| `fixture` | 0 | 0 | Nein | Nein |
| `seed` | 0 | 0 | Nein | Nein |
| `P5E9E4I` | 0 | 0 | Nein | Nein |
| `deleted` | 0 | 0 | Nein | Nein |
| `pending` | 0 | 0 | Nein | Nein |

**Safety Matrix:** **10/10 PASS**

---

## RPC Output Contract

**Whitelisted Felder (Funktionssignatur):**

`id`, `source_type`, `canonical_slug`, `canonical_url`, `title`, `excerpt`, `category`, `entity_domain`, `entity_subtype`, `score`, `matched_fields`

| Check | Ergebnis |
|-------|----------|
| `search_text` im Output | **Nein** |
| `search_vector` Wert im Output | **Nein** |
| BLMETA im Output | **Nein** |
| Profile-Daten / E-Mails | **Nein** |
| Private User-IDs | **Nein** |
| Admin/Moderator-Felder | **Nein** |

**Hinweis:** `matched_fields` kann den String `"search_vector"` als Match-Hinweis enthalten — das ist Metadaten über welches Index-Feld matchte, nicht der rohe Vektor-Inhalt. Akzeptabel.

**Sample `ogre` Row:** slug/title/excerpt public-safe; excerpt „Ogre Mage in Swamplands near a Campfire“ — kein Leak.

---

## Filter Argument Safety

| Test | Filter | Hits | Fehler |
|------|--------|------|--------|
| empty | `{}` | 1 | Nein |
| unknown key | `{"foo":"bar","limit":5}` | 1 | Nein |
| limit only | `{"limit":2}` | 1 | Nein |
| null json | `null` | 1 | Nein |
| category | `{"category":"creatures"}` | 1 | Nein |

Unbekannte Keys werden sicher ignoriert. Kein SQL-Fehler mit sensiblen Details.

---

## No Regression Checks

| Check | Vor 5H | Nach 5H |
|-------|--------|---------|
| Published posts | 9 | **9** |
| `search_documents` rows | 6 | **6** |
| Indexierte Slugs | 6 canonical | **6** (unverändert) |
| Policy/Grant-Änderung | — | **Nein** |
| Content Row Writes | — | **Nein** |
| Rebuild | — | **Nein** |

---

## No Runtime Switch Confirmation

| Check | Ergebnis |
|-------|----------|
| `js/supabase-config.js` | Staging `jzzgoiwfbuwiiyvwgwri` |
| Legacy ref forbidden | `ohkoojpzmptdfyowdgog` |
| Push / Deploy / Launch | **Nein** |

---

## Residual Risks

| Risiko | Status |
|--------|--------|
| Dünne Content-Basis (6 Docs) | **Akzeptiert** — breite Queries liefern Mehrfachtreffer |
| Kein Browser-Runtime-Test gegen Legacy | **Akzeptiert** — RPC-first via SQL; Client statisch kompatibel |
| S-06 Final Closure | **Offen** — erfordert 5J |

---

## Required Future Gates

| Gate | Scope |
|------|-------|
| **P5-E.9E.5I** | Legacy Runtime Config Cutover Dry Run |
| **P5-E.9E.5J** | S-06 Final Closure |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.5H | **PASS** |
| Legacy RPC-first Search Verification | **VERIFIED_PASS** |
| Legacy Search Query Matrix | **PASS** |
| Legacy Search Safety | **PASS** |
| Legacy Search Output Contract | **PASS** |
| Legacy Search Index State | **POPULATED** (6) |
| Legacy Profile/RLS Security | **INTACT** |
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **CLOSED_SEARCH_EVIDENCE** |
| S-06 Search Recall | **CLOSED** |
| Legacy Search Runtime Readiness | **READY_FOR_SEPARATE_PRODUCTIVE_CUTOVER_GATE** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** P5-E.9F.1 — S-05 SEO/CSR Entity Pages Closure Plan

**Manuelle Nutzerfreigabe nötig:** **Ja**

> „Ja, ich gebe P5-E.9E.5I frei — Legacy Runtime Config Cutover Dry Run auf `ohkoojpzmptdfyowdgog`, read-only/plan-only Verification, kein produktiver Runtime-Switch, kein Staging-Write, kein Push, kein Deploy, kein Launch.“

---

---

## P5-E.9E.5I Follow-up (PASS — Legacy Runtime Config Cutover Dry Run)

**Gate:** P5-E.9E.5I. **PASS**.

| Item | Ergebnis |
|------|----------|
| HEAD vor Gate | `bea85f3` |
| Arbeitsmodus | Lokaler temporärer Dry-Run auf `ohkoojpzmptdfyowdgog`; Patches **revertiert** |
| Temporäre Patches | `js/supabase-config.js`, `js/search.js` — **kein Diff nach Revert** |
| Publishable Key | Via Supabase MCP — **nicht** `.env.legacy` |
| Cutover-Delta | Temporäre `isRpcAvailable()`-Erweiterung (revertiert) |
| Fixture Matrix | **32/32 PASS** |
| Wiki Search Smoke | `/wiki/search/?q=ogre` — **PASS** |
| Final Runtime Config | **STAGING** (`jzzgoiwfbuwiiyvwgwri`) |
| Legacy RPC-first Search (5H) | **INTACT** |
| `search_documents` rows | **6** (unverändert) |
| Rebuild / Writes / produktiver Runtime-Switch | **Nein** |
| S-06 Final Status | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| Empfohlener nächster Gate | **P5-E.9E.5J** |

**Report:** `docs/architecture/p5-legacy-runtime-cutover-dry-run-report.md`

**Fixtures:** `qa/p5-legacy-runtime-cutover-dry-run-fixtures.html`, `qa/p5-legacy-runtime-cutover-dry-run-fixtures.js`

---

## P5-E.9E.5J Follow-up (PASS — S-06 Final Search Closure Dossier)

**Gate:** P5-E.9E.5J. **PASS**.

| Item | Ergebnis |
|------|----------|
| HEAD vor Gate | `68c92b1` |
| Arbeitsmodus | Nur lokales Repo. Dossier/Dokumentation/QA-Matrix. Kein SQL/DB-Read/DB-Write |
| Staging Evidence (4M) | **STAGING_CLOSED** |
| Legacy Evidence (5D–5I) | **COMPLETE** — widerspruchsfrei |
| S-06 Search Recall | **CLOSED** |
| S-06 Final Status | **CLOSED_SEARCH_EVIDENCE** |
| Legacy Search Runtime Readiness | **READY_FOR_SEPARATE_PRODUCTIVE_CUTOVER_GATE** |
| Final Runtime Config | **STAGING** (`jzzgoiwfbuwiiyvwgwri`) |
| Produktiver Runtime-Switch / Push / Deploy / Launch | **Nein** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| Empfohlener nächster Gate | **P5-E.9F.1** |

**Report:** `docs/architecture/p5-s06-final-search-closure-dossier.md`

---

*Dokumentversion: P5-E.9E.5H + 5I + 5J PASS. Read-only. Keine Secrets. S-06 CLOSED_SEARCH_EVIDENCE.*
