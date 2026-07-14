# P5-E.9F.5 — Real-Content Entity SEO Source Inventory Report

**Gate:** P5-E.9F.5 — Real-Content Entity SEO Source Decision / Read-only Inventory. **PASS**.

**HEAD vor Gate:** `4fb3b3e` — Assess S05 SEO closure

**Arbeitsmodus:** Read-only Inventory gegen Legacy `ohkoojpzmptdfyowdgog`. Kein SQL Apply, kein Write, kein Runtime-Switch, kein Push/Deploy/Launch, kein Content Export.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9F.5** | **PASS** |
| **Real-Content Entity Source Inventory** | **COMPLETE** |
| **Recommended Source Decision** | **Option C — Hybrid** |
| **Primary Entity SEO Source** | **`wiki_entities`** (canonical slug/name/type) |
| **Content Join Source** | **`posts`** via `source_post_id` (excerpt/body) |
| **Relations Source** | **`wiki_entity_relations`** (optional enrichment) |
| **Export-Ready Entity Count (estimate)** | **~5** (nach Filter + Dedupe) |
| **Entity SEO Technical Evidence** | **CLOSED_TECHNICAL_FIXTURE** (unverändert) |
| **S-05 SEO/CSR** | **PARTIAL_TECHNICAL_EVIDENCE** |
| **S-05 Fable-5 Launch Blocker** | **OPEN_BLOCKING_REAL_CONTENT_RUNTIME** |
| **S-06 Search Recall** | **CLOSED** |
| **Final Runtime Config** | **STAGING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Legacy `wiki_entities` ist die **richtige kanonische Quelle** für Real-Content Entity SEO (Slug, Name, Type vorhanden). **Body/Description** müssen aus verlinkten **`posts`** kommen (`source_post_id`). **`posts` allein** ist ungeeignet als primäre Entity-Quelle (Slug-Mismatch, `is_entity_view=0`). Nach QA-/Dedupe-Filtern sind **~5 export-fähige Entities** mit published Post verfügbar. **Kein S-05 Closure**, **kein Export** in 9F.5.

---

## HEAD / Working Tree

| Check | Status |
|-------|--------|
| HEAD vor Gate | `4fb3b3e` |
| `js/supabase-config.js` | **Kein Diff** — Staging (`jzzgoiwfbuwiiyvwgwri`) |
| `js/search.js` | **Kein Diff** |
| Working Tree | Sauber außer untracked `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json` |

---

## Nutzerfreigabe / Scope

> „Ja, ich gebe P5-E.9F.5 frei — Real-Content Entity SEO Source Decision / Read-only Inventory, read-only nur mit Freigabe, kein produktiver Runtime-Switch, kein Staging-Write, kein Push, kein Deploy, kein Launch.“

**Scope:** Read-only Metadata-/Count-Inventory + Source Decision. **Out of Scope:** SSG Export, Writes, S-05 Closure, Launch.

---

## Target Verification

| Feld | Wert |
|------|------|
| **Ziel-Project-Ref** | `ohkoojpzmptdfyowdgog` |
| **Project Name** | TheOverseer47's Project |
| **Region** | `eu-central-1` |
| **Status** | `ACTIVE_HEALTHY` |
| **Postgres** | 17.6.1.141 |
| **Staging Ref** | `jzzgoiwfbuwiiyvwgwri` — **nicht verwendet** |
| **Client Runtime** | `jzzgoiwfbuwiiyvwgwri` — **unverändert** |
| **Verbindungsweg** | Supabase MCP `execute_sql` mit explizitem `project_id` |
| **`.env.legacy` geöffnet** | **Nein** |
| **boundlore.com getestet** | **Nein** |

---

## Read-only Guardrails

| Guard | Status |
|-------|--------|
| Query-Kategorien | Nur `SELECT`, `information_schema`, `pg_policies`, Aggregates |
| `BEGIN READ ONLY` | **Getestet** — `transaction_read_only = on` |
| DDL / DML / Apply / Rebuild | **Nein** |
| Row-Dumps mit PII/Body | **Nein** — nur Slug/Title/Type-Listen |
| Secrets in Report | **Nein** |

---

## Fable-5 S-05 Context

P5-E.9F.4 entschied **Option B**: Fixture SSG/SEO technisch geschlossen (`CLOSED_TECHNICAL_FIXTURE`), aber S-05 bleibt **OPEN_BLOCKING_REAL_CONTENT_RUNTIME** bis Real-Content exportiert und Runtime-Pfad bewiesen ist. 9F.5 liefert die **Source Decision** für P5-E.9F.6 (Real-Content SSG Apply/Export).

---

## Candidate Source Tables

| Tabelle | Exists | RLS | SEO-Relevanz |
|---------|--------|-----|--------------|
| `wiki_entities` | **Ja** | enabled | **Primär** — canonical slug, name, type, category |
| `posts` | **Ja** | enabled | **Sekundär** — excerpt, content, published state |
| `wiki_entity_relations` | **Ja** | enabled | **Optional** — relation enrichment |
| `wiki_entity_aliases` | **Ja** | enabled | Alias-Redirects (später) |
| `wiki_submission_statuses` | **Ja** | — | Lookup only |

### Relevante Spalten

**`wiki_entities`:** `slug`, `canonical_name`, `entity_type`, `category_slug`, `subcategory_slug`, `status`, `source_post_id`, `metadata` (jsonb), `updated_at`, `canonical_key`

**`posts`:** `slug`, `title`, `excerpt`, `content`, `category`, `post_type`, `status`, `deleted_at`, `is_entity_view`, `canonical_entity_id`, `updated_at`

**`wiki_entity_relations`:** `source_entity_id`, `target_entity_id`, `relation_type`, `relation_status`, `verified`, `metadata`

---

## `wiki_entities` Inventory

| Metrik | Count |
|--------|-------|
| Total | **14** |
| Status `active` | **14** |
| Mit Slug | **14** |
| Mit `canonical_name` | **14** |
| Mit `entity_type` | **14** |
| Mit `category_slug` | **14** |
| Ohne Slug/Name | **0** |
| Verdächtige Slugs (qa/test/fixture/seed) | **6** |
| Public-safe Rows (nach Slug-Filter) | **8** |
| **Unique public-safe Slugs** | **7** |
| Duplicate Slugs | **2** (`ogre-mage` ×2, `qa-sql-backbone-...` ×2) |
| `source_post_id` gesetzt | **13** |
| Metadata mit description/excerpt key | **0** (top-level) |
| Metadata keys (aggregiert) | `schema_version`, `payload`, `schema_key`, `seeded_by_sync_log`, … |

### Entity Types (aggregiert)

| entity_type | count |
|-------------|-------|
| creature | 4 |
| creatures | 3 |
| location | 2 |
| mount | 2 |
| monster | 1 |
| item | 1 |
| guide | 1 |

### Public-Safe Entity List (Slug + Name + Type)

| slug | canonical_name | entity_type | linked post state |
|------|----------------|-------------|-------------------|
| `greny-monkey` | Greny Monkey | creature | unpublished |
| `malorock` | Malorock | creature | no_post |
| `ogre-mage` | Ogre Mage | creatures | unpublished |
| `ogre-mage` | Ogre Mage | monster | **published** |
| `smought` | Smought | creature | **published** |
| `staff-of-fire-2f316b0d` | Staff of Fire | item | **published** |
| `swamplands-94dadc07` | Swamplands | location | **published** |
| `swamplands-near-a-campfire-787bbd19` | Swamplands near a Campfire | location | **published** |

**Export-fähig (published post + public slug):** **5** Entities (nach Dedupe `ogre-mage` → 1 wählen).

---

## `posts` Inventory für Entity-SEO

| Metrik | Count |
|--------|-------|
| Total | **26** |
| Published (nicht deleted) | **9** |
| SEO candidates (published, no QA slug, no Contribution) | **6** |
| `is_entity_view=true` | **0** |
| Mit Excerpt | **26** |
| Deleted | **16** |
| Non-published active | **1** |
| BLMETA in published content | **9/9** |
| E-Mail-Muster in published | **0** |

### Public-Safe Published Posts (Slug + Title + Type)

| slug | title | category | post_type |
|------|-------|----------|-----------|
| `near-a-campfire-787bbd19` | near a Campfire | locations | wiki |
| `ogre-mage-9651e6` | Ogre Mage | creatures | discovery |
| `smought-835df97a` | Smought | creatures | discovery |
| `staff-of-fire-2f316b0d` | Staff of Fire | items | wiki |
| `swamplands-94dadc07` | Swamp | biomes | wiki |
| `why-boundlore-is-the-best-wiki-there-is-d16ea72a` | Why BoundLore is the best Wiki there is. | null | guide |

**Wichtig:** **0 Slug-Matches** zwischen `wiki_entities.slug` und `posts.slug`. Entity-URLs müssen **`wiki_entities.slug`** nutzen, nicht Post-Slug.

**5G-Konsistenz:** 6 canonical search candidates = 6 SEO post candidates (bestätigt).

---

## `wiki_entity_relations` Inventory

| Metrik | Count |
|--------|-------|
| Total | **6** |
| `relation_status=active` | **6** |
| Verified | **0** |
| Orphaned references | **0** |
| Distinct relation types | **3** |

| relation_type | count |
|---------------|-------|
| related_to | 3 |
| found_in | 2 |
| drops | 1 |

**SEO-Nutzung:** Optional für Relations-Summary / JSON-LD enrichment in 9F.6+. Nicht primär für Kern-SEO.

---

## SEO Field Readiness

| Feld / Kriterium | wiki_entities | posts (join) | Hybrid C |
|------------------|---------------|--------------|----------|
| Stabile URL/Slug | **Ja** | Slug differs | **Ja** (entity slug) |
| Title | **Ja** (`canonical_name`) | **Ja** (`title`) | **Ja** |
| Description/Excerpt | **Nein** (metadata) | **Ja** (`excerpt`) | **Ja** (from post) |
| Type | **Ja** (`entity_type`) | category/post_type | **Ja** (entity_type) |
| Body/Content | **Nein** | **Ja** (BLMETA) | **Ja** (sanitized post) |
| UpdatedAt | **Ja** | **Ja** | **Ja** |
| CanonicalPath | `/wiki/post/<entity.slug>/` | `/wiki/post/?slug=<post.slug>` | **Entity path** |
| Sitemap URL | Ableitbar | Ableitbar | **Ja** (entity slug) |
| 404/fail-closed | Dedupe + filter | status/deleted | **Ja** |
| No-Leak Filter | QA slug filter | BLMETA strip | **Pflicht** |
| noindex boundary | Prelaunch | Prelaunch | **Ja** (9F.2 pattern) |
| Generator ohne CSR | **Ja** (mit join) | Allein ungeeignet | **Ja** |

---

## Public-Safety / No-Leak Assessment

| Pattern | wiki_entities | posts (published) | Export-Regel |
|---------|---------------|-------------------|--------------|
| QA/test/fixture/seed slugs | **6/14** | **3/9** | Exclude regex |
| BLMETA | metadata payload | **9/9** content | Strip before HTML |
| search_text/search_vector | N/A | N/A | Exclude |
| E-Mail-Muster | 0 (aggregiert) | 0 | Exclude if found |
| Draft/pending/deleted | status=active only | Filter published | Enforce |
| Duplicate slugs | **2** slugs | unique | Dedupe rule |
| Contribution titles | N/A | excluded in 6-set | Exclude |
| Private IDs in docs | **Nein** | **Nein** | Never export UUIDs |

**Ergebnis:** Hybrid-Quelle **verwendbar mit Filter** — nicht ohne Cleanup/Sanitizer.

---

## Source Options Matrix

| Option | Quelle | Vorteile | Risiken | Empfehlung |
|--------|--------|----------|---------|------------|
| **A** | `wiki_entities` primär | Canonical slug/name/type; 14 rows; category_slug | Kein Body; kein Description; RLS auth-only; 6 QA rows; duplicate slugs | **Teil — Registry only** |
| **B** | `posts` primär | Excerpt/content vorhanden; 6 SEO candidates | Slug ≠ entity slug; `is_entity_view=0`; BLMETA; mixed post types | **Nein als Entity-Primary** |
| **C** | **Hybrid: entities + posts join** | Best of both; canonical URL from entity; content from post | Join complexity; dedupe; BLMETA strip; ~5 ready rows | **Ja — Recommended** |
| **D** | Fixture-SSG only | Bewiesen in 9F.2/9F.3 | Kein Real-Content | **Evidence only** |
| **E** | Kuratierter Corpus später | Volle Kontrolle | Extra Gate; Manual curation | Fallback if 9F.6 insufficient |

---

## Recommended Real-Content Source Decision

**Decision: Option C — Hybrid**

1. **Primary registry:** `wiki_entities` WHERE `status='active'` AND slug NOT matching QA/test/fixture/seed patterns.
2. **Content join:** `LEFT JOIN posts ON posts.id = wiki_entities.source_post_id` WHERE `posts.status='published' AND posts.deleted_at IS NULL`.
3. **Dedupe:** One row per `wiki_entities.slug` — prefer row with published post; tie-break by `entity_type` normalization or `updated_at`.
4. **Canonical URL:** `https://boundlore.com/wiki/post/<wiki_entities.slug>/` (not post slug).
5. **Title:** `wiki_entities.canonical_name`; fallback `posts.title`.
6. **Description:** `posts.excerpt` (sanitized, truncated); no raw metadata.payload in HTML.
7. **Body:** `posts.content` after BLMETA strip + HTML sanitization (existing `content-safety` contract).
8. **Category mapping:** `wiki_entities.category_slug` → browse path; map `entity_type` to fixture generator `entity_subtype`.
9. **Relations (optional):** Join `wiki_entity_relations` where `relation_status='active'` for relations_summary.
10. **Exclude:** QA slugs, unpublished posts, entities without content (unless curated stub policy), guides as entity pages (`post_type=guide` separate path).

**Estimated export corpus:** **~5 entities** (matches 5G search index size).

**RLS-Hinweis:** `wiki_entities` SELECT requires **authenticated** role. 9F.6 Export muss **privileged read-only connection** (MCP/admin batch) nutzen — nicht anon client crawl from DB.

---

## Required Transform / Export Rules (für P5-E.9F.6)

| Regel | Wert |
|-------|------|
| Input query | `wiki_entities` + `posts` join + optional relations |
| Row filter | `status='active'`, slug safe, post published, not deleted |
| Excluded classes | qa/test/fixture/seed slugs, Contribution titles, draft/pending/deleted, guides (separate) |
| Required fields | slug, canonical_name, entity_type, category_slug, excerpt, sanitized body |
| Slug normalization | Use entity slug as-is; reject duplicates after dedupe |
| Title fallback | canonical_name → posts.title |
| Description fallback | posts.excerpt → truncated sanitized body |
| Body rules | Strip BLMETA; `BoundLoreContentSafety` sanitization; no search internals |
| Output path | `wiki/post/<slug>/index.html` |
| Sitemap | Separate fixture/production gate; prelaunch `noindex, follow` |
| robots | No launch indexing without Launch Gate |
| No PII | No author_id, user UUIDs, emails in HTML |
| Determinism | Sort by slug alphabetically |

---

## Gaps / Risks

| Gap/Risk | Schwere | Mitigation |
|----------|---------|------------|
| Nur ~5 export-ready entities | Mittel | Accept for MVP evidence; expand corpus later |
| Duplicate `ogre-mage` slug | Hoch | Dedupe rule in 9F.6 |
| 0 slug alignment entity↔post | Hoch | Always use entity slug for URL |
| BLMETA in all published posts | Mittel | Strip in generator |
| `wiki_entities` RLS auth-only | Mittel | Privileged read in export gate only |
| entity_type inconsistency (creature vs creatures) | Niedrig | Normalize in transform |
| Relations unverified (0/6) | Niedrig | Optional enrichment only |
| CSR live path unchanged | Hoch | Separate runtime gate after 9F.7 |
| S-05 not closed | — | Requires 9F.6–9F.8 |

---

## Required Future Gates

| Gate | Scope |
|------|-------|
| **P5-E.9F.6** | Real-Content Entity SSG Apply / Export (privileged read, no launch) |
| **P5-E.9F.7** | Real-Content Entity SEO Evidence Re-run |
| **P5-E.9F.8** | S-05 Final Closure Dossier (only if evidence sufficient) |

---

## Fable-5 Impact

| Item | Status |
|------|--------|
| S-05 nach 9F.5 | **OPEN_BLOCKING_REAL_CONTENT_RUNTIME** (unverändert) |
| 9F.5 reduziert Gap | **Ja** — Source Decision getroffen |
| S-06 | **CLOSED** (unverändert) |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| Fable-5 Final-Abnahme | **Nicht bereit** |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9F.5 | **PASS** |
| P5-E.9F.6 | **PASS** |
| Real-Content Entity SSG Export | **PASS** — 5 pages |
| Real-Content Entity Source Decision | **HYBRID_WIKI_ENTITIES_PLUS_POSTS** |
| Entity SEO Technical Evidence | **CLOSED_TECHNICAL_FIXTURE** |
| S-05 SEO/CSR | **PARTIAL_TECHNICAL_EVIDENCE** |
| S-05 Fable-5 Launch Blocker | **OPEN_BLOCKING_REAL_CONTENT_RUNTIME** |
| S-06 Search Recall | **CLOSED** |
| Final Runtime Config | **STAGING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** **Production Runtime Cutover** (separate)

---

## P5-E.9F.8 Follow-up (PASS — S-05 Final Closure Decision)

**Gate:** P5-E.9F.8. **PASS**. S-05 **CLOSED_BY_REAL_CONTENT_EVIDENCE** (Option A).

**Report:** `docs/architecture/p5-s05-final-closure-decision-dossier.md`

---

*Dokumentversion: P5-E.9F.6 + P5-E.9F.7 + P5-E.9F.8. S-05 CLOSED. Launch NO-GO.*
