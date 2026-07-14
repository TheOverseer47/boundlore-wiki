# P5-E.9F.6 — Real-Content Entity SSG Export Report

**Gate:** P5-E.9F.6 — Real-Content Entity SSG Apply / Export  
**Verdict:** **PASS**  
**Date:** 2026-07-14  
**HEAD before gate:** `19e3663` — Inventory real entity SEO source

---

## Executive Verdict

Privileged read-only export from legacy project `ohkoojpzmptdfyowdgog` completed. Five public-safe real-content entity SSG pages generated locally with BLMETA strip, metadata/canonical/OG/Twitter/JSON-LD, prelaunch `noindex,follow`, fixture quarantine, and QA sitemap artifact. No DB writes, no runtime switch, no push/deploy/launch. **S-05 remains open** until P5-E.9F.7 evidence and P5-E.9F.8 final decision.

---

## HEAD / Working Tree

| Item | Value |
|------|-------|
| HEAD before gate | `19e3663` |
| Runtime config | **STAGING** (`jzzgoiwfbuwiiyvwgwri`) — unchanged |
| `js/supabase-config.js` diff | none |
| `js/search.js` diff | none |
| Untracked (allowed) | `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json` |
| Raw export (gitignored) | `qa/fixtures/.real-content-export-raw.json`, `qa/fixtures/real-content-export/` |

---

## Nutzerfreigabe / Scope

User approval received for P5-E.9F.6: privileged read-only export from `ohkoojpzmptdfyowdgog`, hybrid source `wiki_entities + posts`, local static HTML only, no launch/runtime switch/push/deploy.

**Out of scope (confirmed not done):** DB writes, DDL/DML, search rebuild, production closure, S-05 final closure, public launch GO.

---

## Target Verification

| Check | Result |
|-------|--------|
| Target ref | `ohkoojpzmptdfyowdgog` — **verified** |
| Not staging ref | `jzzgoiwfbuwiiyvwgwri` — **not used for export** |
| `.env` opened/changed | **no** |
| Secrets committed | **no** |
| boundlore.com live test | **no** |
| Deploy / Launch | **no** |

---

## Read-only / No-Write Confirmation

- Supabase MCP `execute_sql` used with **SELECT-only** hybrid join query against `ohkoojpzmptdfyowdgog`.
- No DDL, DML, RPC rebuild, or staging/production writes.
- Generator and QA scripts operate on local files only (no DB connection at build time).

---

## Source Decision Baseline

**HYBRID_WIKI_ENTITIES_PLUS_POSTS** (from P5-E.9F.5):

- Primary: `wiki_entities` (canonical slug, name, type)
- Content join: `posts` via `source_post_id` with slug-prefix fallback
- Canonical URLs use **entity slug**, not post slug

---

## Export Query Summary

Read-only CTE join with dedupe by entity slug:

- Filter: `wiki_entities.status = 'active'`, published posts, no QA/test/fixture slug patterns, exclude `Contribution:` titles
- Join: `source_post_id` primary; fallback `p.slug = e.slug OR p.slug LIKE e.slug || '-%' OR e.slug LIKE '%' || p.slug`
- Match rank dedupe: `ROW_NUMBER() OVER (PARTITION BY e.slug ORDER BY match_rank, updated_at DESC)`
- **Result:** 5 export-ready entities (matches 9F.5 estimate)

---

## Sanitization Rules

Implemented in `scripts/bl_ssg_sanitize.py`:

- BLMETA comment blocks removed entirely
- `search_text`, `search_vector`, Supabase storage URLs stripped
- Discovery attachment sections removed
- `<img>`, script/style/iframe/form/object/embed removed
- Event handlers and `javascript:` URLs removed
- Inline styles removed; allowed tags whitelist
- `/wiki/post/?slug=` links rewritten to `/wiki/post/<slug>/`
- UUID/email/QA marker fail-closed checks on sanitized output

---

## BLMETA Strip Evidence

| Entity | Raw BLMETA present | Sanitized export | Generated HTML |
|--------|-------------------|------------------|----------------|
| ogre-mage | yes | stripped | no BLMETA |
| smought | yes (+ attachments) | stripped | no BLMETA |
| staff-of-fire-2f316b0d | yes | stripped | no BLMETA |
| swamplands-94dadc07 | yes (QA refs in BLMETA only) | stripped | no BLMETA |
| swamplands-near-a-campfire-787bbd19 | yes | stripped | no BLMETA |

QA grep on `wiki/post/` and sitemap: **no BLMETA, no UUIDs, no emails, no secrets**.

---

## Generated Real-Content Entity Pages

| Entity slug | Title | Type | Path |
|-------------|-------|------|------|
| `ogre-mage` | Ogre Mage | creature | `wiki/post/ogre-mage/index.html` |
| `smought` | Smought | creature | `wiki/post/smought/index.html` |
| `staff-of-fire-2f316b0d` | Staff of Fire | item | `wiki/post/staff-of-fire-2f316b0d/index.html` |
| `swamplands-94dadc07` | Swamplands | location | `wiki/post/swamplands-94dadc07/index.html` |
| `swamplands-near-a-campfire-787bbd19` | Swamplands near a Campfire | location | `wiki/post/swamplands-near-a-campfire-787bbd19/index.html` |

**Count:** 5 real-content entity pages.

Sanitized input JSON: `qa/fixtures/real-content-entity-ssg-export.json`

---

## Fixture Page Quarantine / Removal

Nine fixture/prototype pages moved from `wiki/post/` to `qa/fixtures/ssg-entity-pages/`:

- `ember-salamander`, `volcanic-heat-charm`, `cinder-basalt-flats`, `ashwind-harbor`, `ironroot-shard`, `explorers-league-hall`
- `qa-ssg-biome-prototype`, `qa-ssg-item-prototype`, `qa-ssg-creature-prototype`

**No fixture slugs remain** in production-like `wiki/post/`.

---

## Metadata / Canonical / OG / Twitter Evidence

Each page includes:

- `<title>`, `<meta name="description">`
- `<link rel="canonical">` → `https://boundlore.com/wiki/post/<entity-slug>/`
- `og:title`, `og:description`, `og:url`, `og:image`
- `twitter:title`, `twitter:description`, `twitter:image`
- `meta name="robots" content="noindex, follow"` (prelaunch boundary)
- Visible `<h1>` and static body in `.bl-ssg-body`
- JSON-LD: `CreativeWork` + `BreadcrumbList` (public-safe, no IDs)

Canonical uses **entity slug** (not post slug suffix).

---

## Sitemap Evidence

- **Artifact:** `qa/real-content-entity-sitemap.fixture.xml`
- Contains all 5 real entity URLs, alphabetically sorted
- **No fixture URLs** included
- **Root `sitemap.xml` unchanged** — no launch/indexing implication

---

## Not-found / Fail-closed Evidence

- `wiki/post/_ssg-not-found/index.html` updated (`noindex,nofollow`)
- Missing entity route `/wiki/post/does-not-exist-entity/` → **404** locally (fail-closed)
- No internal IDs or debug details in not-found page

---

## Local QA Check Results

`py -3 qa/p5-real-content-entity-ssg-check.py` → **PASS** (15 assertions)

---

## Local HTTP / Crawl Evidence

Local server: `py -3 -m http.server 8098`

| URL | Status |
|-----|--------|
| `/wiki/post/ogre-mage/` | 200 |
| `/wiki/post/smought/` | 200 |
| `/wiki/post/staff-of-fire-2f316b0d/` | 200 |
| `/wiki/post/swamplands-94dadc07/` | 200 |
| `/wiki/post/swamplands-near-a-campfire-787bbd19/` | 200 |
| `/wiki/post/_ssg-not-found/` | 200 |
| `/qa/real-content-entity-sitemap.fixture.xml` | 200 |
| `/wiki/post/does-not-exist-entity/` | 404 |

Static SEO core present without CSR dependency for primary content.

---

## No-Leak Deep Check

Static grep on generated HTML and sitemap:

- No BLMETA, search_text, search_vector, service_role, secrets
- No emails, UUIDs, Supabase URLs in final HTML
- No fixture/QA/test markers in final HTML
- No script injection, event handlers, or `javascript:` URLs

---

## CSR Dependency Assessment

- SEO core (title, description, H1, body) is **fully static** in generated HTML
- Hydration slot is optional placeholder only; not required for crawlable core
- Live CSR path `/wiki/post/?slug=` remains a **runtime blocker** for S-05 final closure

---

## Root Sitemap Decision

**Decision:** Do **not** modify root `sitemap.xml`.

Real entity URLs documented only in `qa/real-content-entity-sitemap.fixture.xml` until launch-readiness gates explicitly approve production sitemap inclusion.

---

## Fable-5 Impact

| Item | Impact |
|------|--------|
| Real-content static SEO evidence | **Added** — 5 entity pages |
| S-05 Fable-5 Launch Blocker | **Still OPEN** — runtime/cutover not done |
| Product Activation | **Still FAIL** |
| Public Launch | **Still NO-GO** |

---

## Why S-05 Is Still Not Closed

P5-E.9F.6 delivers **local static export evidence** only. S-05 final closure requires:

1. **P5-E.9F.7** — Real-Content Entity SEO Evidence Re-run (crawl/static checks on exported pages in evidence workflow)
2. **P5-E.9F.8** — S-05 Final Closure Dossier (if evidence sufficient)
3. Productive runtime cutover / CSR path alignment — **not in scope for 9F.6**

Entity SEO Technical Evidence remains **CLOSED_TECHNICAL_FIXTURE** for fixture path; real-content path evidence is **partial** until 9F.7/9F.8.

---

## Required Future Gates

| Gate | Scope |
|------|-------|
| **P5-E.9F.7** | Real-Content Entity SEO Evidence Re-run |
| **P5-E.9F.8** | S-05 Final Closure Dossier (conditional) |
| Production Closure / Runtime Cutover | Separate gates |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9F.6 | **PASS** |
| Real-Content Entity SSG Export | **PASS** — 5 pages |
| Real-Content Entity Source Decision | **HYBRID_WIKI_ENTITIES_PLUS_POSTS** |
| Entity SEO Technical Evidence | **CLOSED_TECHNICAL_FIXTURE** |
| S-05 SEO/CSR | **PARTIAL_TECHNICAL_EVIDENCE** |
| S-05 Fable-5 Launch Blocker | **OPEN_BLOCKING_REAL_CONTENT_RUNTIME** |
| S-06 Search Recall | **CLOSED_SEARCH_EVIDENCE** |
| Final Runtime Config | **STAGING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** **P5-E.9F.7** — Real-Content Entity SEO Evidence Re-run

**Manuelle Nutzerfreigabe nötig:** **Ja**

> „Ja, ich gebe P5-E.9F.7 frei — Real-Content Entity SEO Evidence Re-run, crawl/static checks auf exportierte echte Entity-Seiten, kein Launch, kein produktiver Runtime-Switch, kein Push, kein Deploy.“

---

*Dokumentversion: P5-E.9F.6 PASS. No push/deploy/launch. S-05 open until 9F.7/9F.8.*
