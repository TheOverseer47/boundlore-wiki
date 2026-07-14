# P5-E.9G.1 — Production SSG Route Cutover Plan and Read-only Dry-Run Assessment

**Gate:** P5-E.9G.1 — Production SSG Route Cutover Plan / Dry-Run Assessment  
**Verdict:** **PASS** (plan and assessment only — no cutover applied)  
**Date:** 2026-07-14  
**HEAD vor Gate:** `8d1cf0e` — Decide S05 SEO closure

---

## 1. Executive Decision

| Item | Value |
|------|-------|
| **P5-E.9G.1** | **PASS** |
| **Final Decision** | **OPTION B — CONDITIONALLY_READY_FOR_ROUTE_CUTOVER_APPLY_GATE** |
| **Route Cutover Readiness** | Local SSG path evidence **complete**; production apply **blocked** until prerequisites below |
| **S-05 SEO/CSR** | **CLOSED_BY_REAL_CONTENT_EVIDENCE** (unchanged — this gate does not reopen S-05) |
| **Public Launch** | **NO-GO** (unchanged) |

**Kernaussage:** Die fünf kanonischen SSG-Routen `/wiki/post/<entity-slug>/` sind lokal statisch, SEO-vollständig, no-leak und CSR-frei nachgewiesen. Ein späterer produktiver Cutover ist **planbar**, aber **noch nicht freigegeben**, weil (a) produktives Hosting/Rewrite-Verhalten aus dem Repo **nicht beweisbar** ist, (b) interne Links überwiegend noch den Legacy-Query-Pfad erzeugen, und (c) fehlende kanonische Slugs lokal nur als generischer HTTP-404 erscheinen — nicht als `_ssg-not-found`.

---

## 2. Scope and Safety Boundaries

**In scope:** Read-only Inventar, lokaler HTTP-Dry-Run, Cutover-**Plan**, Risiko-Matrix, Rollback-**Plan**.

**Out of scope / not performed:**

- Kein produktiver Runtime-Switch
- Keine Änderung an `js/supabase-config.js`, `js/search.js`, HTML, Hosting-Config
- Kein DB-Zugriff, SQL, MCP, Supabase-Dashboard
- Kein Redirect/Rewrite-Apply, kein Deploy, kein Push, kein Launch
- Keine Public-Indexierung, kein Entfernen von `noindex`
- Keine Änderung an root `sitemap.xml` oder `robots.txt`

---

## 3. Git Baseline

| Check | Result |
|-------|--------|
| `git rev-parse HEAD` | `8d1cf0eca5be11de1e3accf98d9fd9af91e90991` |
| `git log -1 --oneline` | `8d1cf0e Decide S05 SEO closure` |
| Working tree | Clean except allowed untracked: `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json` |
| HEAD matches expected | **Yes** (`8d1cf0e`) |

**Runtime (read-only observation):** `js/supabase-config.js` lines 4–8 reference staging ref `jzzgoiwfbuwiiyvwgwri` — **unchanged in this gate**.

---

## 4. Current Route Inventory

### A. Canonical SSG path

| Item | Evidence |
|------|----------|
| Output location | `wiki/post/<entity-slug>/index.html` |
| Tracked slugs (git) | `ogre-mage`, `smought`, `staff-of-fire-2f316b0d`, `swamplands-94dadc07`, `swamplands-near-a-campfire-787bbd19`, plus `_ssg-not-found` |
| Generator | `scripts/build-real-entity-ssg.py` — reads `qa/fixtures/real-content-entity-ssg-export.json` |
| Export pipeline | Privileged read-only export (9F.6) → `scripts/export-real-content-entity-ssg.py` → sanitized JSON → build |
| Fixture quarantine | Old fixture dirs under `qa/fixtures/ssg-entity-pages/` — **not** in tracked `wiki/post/` entity set |

### B. Legacy CSR query path

| Item | Evidence |
|------|----------|
| Shell file | `wiki/post/index.html` |
| URL form | `/wiki/post/?slug=<slug>` (also `?id=` supported in JS) |
| Initial HTML title | `Post - BoundLore` (line 7) |
| Initial description | `Community post on BoundLore.` (line 6) |
| Loading shell | `#postLoading` → `Loading post...` (lines 51–52) |
| CSR scripts | `post-detail.js` (line 186), plus Supabase client CDN (line 13) |
| Canonical redirect in JS | `post-detail.js` lines 55–57 — updates **query param only**, not path-based URL |

### C. Hosting model (repo-derived)

| Artifact | Present |
|----------|---------|
| `netlify.toml` | **No** |
| `vercel.json` | **No** |
| `_redirects` / `_headers` | **No** |
| `.github/workflows` | **No** |
| Root `404.html` | **Yes** — generic site 404, not entity-specific |
| Entity fail-closed page | `wiki/post/_ssg-not-found/index.html` — **only if route resolves** |

**Inference (marked UNKNOWN for production):** Repo suggests **static file hosting** (Python `http.server` used in 9F.7/9G.1). Whether production serves directory indexes for `/wiki/post/<slug>/` **cannot be proven from repo alone** — **external hosting verification required**.

---

## 5. SSG Build and Artifact Flow

```
[9F.6 read-only DB export — not in 9G.1]
    → qa/fixtures/real-content-entity-ssg-export.json
    → scripts/build-real-entity-ssg.py
    → wiki/post/<slug>/index.html (×5)
    → wiki/post/_ssg-not-found/index.html
    → qa/real-content-entity-sitemap.fixture.xml
```

**Future deploy requirements (plan only):**

1. Run export + sanitizer QA (fail-closed on leak).
2. Run `build-real-entity-ssg.py` — deterministic, quarantines fixture slugs from `wiki/post/`.
3. Deploy **entire** `wiki/post/<slug>/` tree atomically (replace stale dirs).
4. Block deploy if QA scripts fail.
5. Do **not** merge real entity URLs into root `sitemap.xml` until Launch Indexing Gate.

---

## 6. Legacy CSR Query-Path Assessment

**Local dry-run:** `GET /wiki/post/?slug=ogre-mage` → **HTTP 200**

| Check | Result |
|-------|--------|
| Title | `Post - BoundLore` (generic) |
| Thin shell | **Yes** — `Loading post...`, no `bl-ssg-body` |
| OG/Twitter/JSON-LD | **Absent** in initial HTML |
| Redirect to SSG path | **No** (no server redirect; JS may hydrate after Supabase — not evaluated in 9G.1) |
| `noindex` in shell | **No** in initial HTML |

**Conclusion:** Legacy path remains a **thin CSR shell** for crawlers. Must not be primary SEO/canonical route after cutover.

---

## 7. Internal Link Inventory

**Path-based URLs (canonical SSG form):**

| Source | Pattern | Notes |
|--------|---------|-------|
| `js/search.js` | `/wiki/post/` + slug + `/` | lines 116–117, 208, 220–221 |
| `js/search-recall-utils.js` | Mixed — includes path-based helpers |
| SSG HTML body (sanitized) | `/wiki/post/<slug>/` | Related-entry links after 9F.6 sanitizer |
| `qa/real-content-entity-sitemap.fixture.xml` | `https://boundlore.com/wiki/post/<slug>/` | Evidence artifact only |

**Query-parameter URLs (`/wiki/post/?slug=`):**

| File | Approx. occurrences |
|------|---------------------|
| `js/render-posts.js` | 6 |
| `js/wiki-entry-layout.js` | 6 |
| `js/create-post.js` | 5 |
| `js/post-detail.js` | 4 |
| `js/community-hub.js` | 2 |
| `js/edit-post.js` | 2 |
| `js/unresolved-targets.js` | 2 |
| `js/knowledge-relations.js` | 1 |
| `js/my-posts.js` | 1 |
| `js/recent-ticker.js` | 1 |
| `js/discovery-home.js` | 1 |
| `js/resource-quick-add.js` | 1 |
| `js/admin-seed-local.js` | 1 |
| `js/support.js` | 1 (placeholder) |

**No links were changed in 9G.1.** Apply gate must migrate these generators to `/wiki/post/<canonical-entity-slug>/` with entity-slug validation (not raw post slug where they differ).

---

## 8. Hosting and Rewrite Capability Assessment

| Capability | Local (`py -3 -m http.server`) | Production |
|------------|----------------------------------|------------|
| Directory index `/wiki/post/<slug>/` → `index.html` | **Works** (200) | **UNKNOWN** |
| Missing slug directory | **404** generic server error | **UNKNOWN** — may need rewrite to `_ssg-not-found` |
| Case sensitivity | Windows FS: `/wiki/post/Ogre-Mage/` → **200** (case-insensitive) | Linux hosting likely **404** for wrong case — enforce lowercase |
| Query path without redirect | Serves CSR shell **200** | Same risk without server rules |
| Clean URL rewrites | **None in repo** | **Must be configured externally** |

**Stop condition:** Do not apply cutover until hosting provider confirms directory-index behavior and redirect mechanism.

---

## 9. Local HTTP Dry-Run Evidence

**Server:** `http://127.0.0.1:8098` (existing local static server; same method as 9F.7)

### Five canonical SSG routes

| Slug | HTTP | Title | Desc | Canonical | OG/TW | JSON-LD | H1 | Static core | Leak | CSS/icon |
|------|------|-------|------|-----------|-------|---------|-----|-------------|------|----------|
| `ogre-mage` | 200 | Entity-specific | Yes | `/wiki/post/ogre-mage/` | Yes | Yes | 1 | Yes | No | 200/200 |
| `smought` | 200 | Entity-specific | Yes | `/wiki/post/smought/` | Yes | Yes | 1 | Yes | No | 200/200 |
| `staff-of-fire-2f316b0d` | 200 | Entity-specific | Yes | match | Yes | Yes | 1 | Yes | No | 200/200 |
| `swamplands-94dadc07` | 200 | Entity-specific | Yes | match | Yes | Yes | 1 | Yes | No | 200/200 |
| `swamplands-near-a-campfire-787bbd19` | 200 | Entity-specific | Yes | match | Yes | Yes | 1 | Yes | No | 200/200 |

**Asset resolution:** SSG pages use root-absolute `/public/images/`, `/js/` and relative `../../../css/style.css` — both resolve **200** locally.

### Additional routes

| Route | HTTP | Notes |
|-------|------|-------|
| `/wiki/post/?slug=ogre-mage` | 200 | Thin shell; generic title; **no redirect** |
| `/wiki/post/does-not-exist-99999/` | 404 | Generic server error page — **not** `_ssg-not-found` |
| `/wiki/post/_ssg-not-found/` | 200 | `noindex, nofollow` |
| `/wiki/post/Ogre-Mage/` | 200 | **Windows case-insensitivity** — canonical in HTML still lowercase |
| `/wiki/post//ogre-mage/` | 200 | Double slash tolerated locally |
| `/wiki/post//` | 200 | Falls through to CSR shell |
| `/wiki/post/ogre-mage/?utm=test` | 200 | Static core intact; query preserved |
| `/wiki/post/..%2F..%2Fcss%2Fstyle.css/` | 404 | Fail-closed |

---

## 10. Static SEO / CSR-Free / No-Leak Evidence

| Check | Result |
|-------|--------|
| `py -3 qa/p5-real-content-entity-ssg-check.py` | **PASS** (15 assertions) |
| `py -3 qa/p5-real-content-entity-seo-evidence-rerun-check.py` | **PASS** (10 assertions) |
| CSR-free core (5 SSG routes) | **PASS** — `bl-ssg-body` present, no `Loading post...` |
| No BLMETA / UUID / email / secrets | **PASS** (QA + dry-run grep) |
| No Supabase storage URLs in SSG HTML | **PASS** |

---

## 11. Invalid-Route and Fail-Closed Evidence

| Scenario | Local behavior | Apply-gate gap |
|----------|----------------|----------------|
| Unknown canonical slug dir | **404** generic | Should serve `_ssg-not-found` or branded 404 with `noindex,nofollow` |
| Legacy query unknown slug | CSR shell → JS not-found (runtime) | Needs server redirect or noindex on shell |
| Traversal attempt | **404** | Acceptable locally |
| Empty/double-slash post path | CSR shell **200** | Normalize or redirect at hosting layer |

---

## 12. Sitemap / Robots / noindex Status

| Item | Status |
|------|--------|
| Root `sitemap.xml` | **Unchanged** — no `/wiki/post/` entity URLs (verified: no matches) |
| `qa/real-content-entity-sitemap.fixture.xml` | **5** real entity URLs |
| Entity SSG pages | `meta name="robots" content="noindex, follow"` (e.g. `wiki/post/ogre-mage/index.html` line 8) |
| `_ssg-not-found` | `noindex, nofollow` |
| `robots.txt` | Unchanged; disallows admin/auth paths; points to root sitemap |
| Public indexing | **NOT AUTHORIZED** |

---

## 13. Recommended Production Route Architecture

**Primary production route:**

```
/wiki/post/<canonical-entity-slug>/
```

Static file: `wiki/post/<canonical-entity-slug>/index.html`

**Suitability for separate Apply Gate:** **Yes**, based on local evidence — subject to Option B prerequisites.

**CSR hydration slot** may remain for comments/reactions; SEO core must stay static (current generator contract).

---

## 14. Recommended Legacy Redirect Strategy

**Target:** `/wiki/post/?slug=<slug>` → `/wiki/post/<validated-entity-slug>/`

| Parameter | Recommendation |
|-----------|----------------|
| HTTP status | **308 Permanent Redirect** (preferred for canonical migration) or **301** with cache caution |
| Slug validation | Allowlist: known public-safe entity slugs from export manifest; regex `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| Unknown slug | **404** or redirect to `_ssg-not-found` — **never** open redirect |
| Query params | Strip tracking params; do not reflect arbitrary params into `Location` |
| Implementation | **Server-side** (`_redirects`, nginx, CDN rules) — not client-only |
| Client fallback | Optional enhancement in `post-detail.js` — **not sufficient alone** |

**Not implemented in 9G.1.**

**Risks:** Early 301/308 caching of wrong targets; redirect loops if slug maps differ between post slug and entity slug.

**Rollback:** Remove redirect rules; legacy query path serves CSR shell again.

---

## 15. Runtime-Cutover Separation Decision

| Track | Scope | Recommendation |
|-------|-------|----------------|
| **A. Route / SSG cutover** | Deploy static HTML, redirects, internal links | **Separate Apply Gate** (P5-E.9G.2 or similar) |
| **B. Supabase runtime cutover** | `js/supabase-config.js` staging → legacy `ohkoojpzmptdfyowdgog` | **Separate Apply Gate** |

**Default: DECOUPLED** — repo shows no hard coupling requiring simultaneous switch. SSG pages are static and do not call Supabase for SEO core. CSR shell still uses staging Supabase today.

**Caution:** After route cutover, CSR hydration on SSG pages (if enabled later) must use correct runtime — test in staging before production runtime switch.

---

## 16. Future Apply File Map

**Likely changes in a future Apply Gate (not performed now):**

| File / area | Change type |
|-------------|-------------|
| Hosting config (new: `_redirects`, `netlify.toml`, etc.) | Add 308/301 rules, 404 mapping |
| `js/render-posts.js` | Query → path URLs |
| `js/wiki-entry-layout.js` | Query → path URLs |
| `js/create-post.js` | Post-create redirects → path URLs |
| `js/post-detail.js` | Path redirect when hit via legacy query; optional path canonicalization |
| `js/knowledge-relations.js` | Relation link URLs |
| `js/community-hub.js`, `js/discovery-home.js`, `js/my-posts.js`, `js/recent-ticker.js` | Card hrefs |
| `js/edit-post.js`, `js/unresolved-targets.js`, `js/resource-quick-add.js` | Link generators |
| `js/search-recall-utils.js` | Align with `search.js` path form |
| CI/deploy script (new or existing) | Run export → QA → build → deploy `wiki/post/` |

**Explicitly unchanged until Launch Gate:** `sitemap.xml`, entity `noindex`, `robots.txt` index policy.

---

## 17. Future Test Matrix

| Test | When |
|------|------|
| 5 canonical SSG routes HTTP 200 on **production** host | Apply + post-deploy |
| Legacy `?slug=` → 308 to path for known slugs | Apply |
| Unknown slug → 404 / `_ssg-not-found` | Apply |
| Internal links from search, browse, homepage → path URLs | Link migration gate |
| Case mismatch slug → 404 or lowercase redirect | Hosting verify |
| CSS/JS/assets 200 on nested routes | Production crawl |
| QA scripts PASS on build artifact | Pre-deploy gate |
| No-leak grep on deployed HTML | Pre-deploy gate |
| Rollback: remove redirects, restore prior deploy | Drill |
| CDN cache purge after redirect deploy | Apply |
| Do **not** remove `noindex` until Launch Indexing Gate | Launch |

---

## 18. Rollback Plan

1. **Remove** server redirect rules (`?slug=` → path).
2. **Revert** internal link JS changes (if applied).
3. **Redeploy** previous static artifact (without SSG entity dirs or with prior `wiki/post/` tree).
4. **Purge CDN** cache for `/wiki/post/*`.
5. **Runtime config** (`supabase-config.js`) — rollback separately if changed in another gate.
6. **Do not** enable root sitemap entity URLs or remove `noindex` during route rollback.
7. **Re-lock** maintenance/release gate if production was briefly opened.

**No rollback action performed in 9G.1.**

---

## 19. Risk and Stop-Condition Matrix

| Risk | Likelihood | Impact | Detection | Mitigation | Stop condition | Gate |
|------|------------|--------|-----------|------------|----------------|------|
| Hosting lacks directory index | Medium | High | Prod URL 404 | Verify host docs; add rewrite | SSG routes 404 in prod | Apply |
| Query path remains linked internally | High | Medium | Link crawl | Migrate JS generators | >0 production links to `?slug=` | Link Apply |
| Unknown slug returns 200 CSR shell | Medium | High | Crawl unknown slug | Server 404 + noindex shell | Unknown slug 200 with generic title | Apply |
| Relative assets break on nested routes | Low | Medium | Asset HTTP checks | Root-absolute assets (already mixed) | CSS/JS 404 | Apply |
| Stale SSG dirs in deploy | Medium | Medium | Slug manifest diff | Atomic deploy; delete orphans | Extra slugs in prod | Apply |
| Root sitemap before index gate | Low | High | sitemap diff | Separate Launch Gate | Entity URLs in prod sitemap early | Launch |
| Wrong canonical domain | Low | High | Canonical audit | boundlore.com candidate only until launch verify | Live domain test without approval | Launch |
| Premature noindex removal | Low | Critical | robots meta audit | Launch Gate only | index,follow before launch | Launch |
| SSG vs live DB drift | Medium | Medium | Export hash compare | Scheduled re-export | Content mismatch reports | Export |
| Route + runtime coupled deploy | Medium | High | Change review | Decouple gates | Single combined switch | Process |
| CDN caches old thin shell | Medium | High | Cache headers check | Purge on cutover | Stale `Loading post...` | Apply |
| Rollback + links mismatch | Medium | Medium | Link checker | Rollback links + routes together | 404 after rollback | Rollback drill |
| Search still emits query URLs | Low | Medium | Search QA | `search.js` already path-based — verify recall utils | Search results query URLs | Apply |
| Redirect loop alias/post slug | Low | High | Redirect test matrix | Entity slug allowlist | Loop detected | Apply |
| 301 cached too early | Medium | Medium | Staging redirect test | 308 or short-lived 302 first | Wrong permanent cache | Apply |

---

## 20. Remaining Production and Launch Gates

| Gate | Status |
|------|--------|
| P5-E.9G.2 (proposed) Route Cutover Apply | **NOT STARTED** — requires Option B prerequisites |
| Production hosting verification | **OPEN** |
| Internal link migration | **OPEN** |
| Legacy redirect implementation | **OPEN** |
| Supabase runtime cutover (staging → legacy) | **OPEN** — separate |
| Launch Indexing (noindex removal, root sitemap) | **OPEN** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| Fable-5 Final-Abnahme | **OPEN** |

---

## 21. Final Status Matrix

| Item | Status |
|------|--------|
| P5-E.9G.1 | **PASS** |
| Route Cutover Readiness | **CONDITIONALLY_READY_FOR_ROUTE_CUTOVER_APPLY_GATE** (Option B) |
| S-05 SEO/CSR | **CLOSED_BY_REAL_CONTENT_EVIDENCE** |
| S-05 Fable-5 Launch Blocker | **CLOSED_FOR_CODE_AND_CONTENT_EVIDENCE** |
| S-06 Search Recall | **CLOSED_SEARCH_EVIDENCE** |
| Final Runtime Config | **STAGING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

### Option B — Open Prerequisites (must close before Apply)

1. **Production hosting proof** — directory index + 404 semantics + case sensitivity on target host.
2. **Internal link migration plan executed** — eliminate primary `?slug=` generators in listed JS files.
3. **Server-side redirect spec validated** on staging mirror — 308 to path for allowlisted slugs only.
4. **Fail-closed mapping** — unknown entity paths serve `_ssg-not-found` or equivalent (not generic 200 CSR shell).

---

## 22. Commands Executed

```text
git status --short
git rev-parse HEAD
git log -1 --oneline
py -3 qa/p5-real-content-entity-ssg-check.py
py -3 qa/p5-real-content-entity-seo-evidence-rerun-check.py
py -3 C:\Users\Julius\AppData\Local\Temp\p5e9g1_dryrun.py
git diff --check
git diff --stat
git diff -- js/supabase-config.js js/search.js
git diff -- sitemap.xml robots.txt
git diff -- wiki/post/index.html
git diff -- supabase
```

**Local server:** `http://127.0.0.1:8098` (pre-existing / reused from 9F.7 methodology).

**Temporary file:** `C:\Users\Julius\AppData\Local\Temp\p5e9g1_dryrun.py` — outside repo; not committed.

---

## 23. Files Changed

| File | Action |
|------|--------|
| `docs/architecture/p5-production-ssg-route-cutover-plan-dry-run-assessment.md` | **Created** (this document) |

**No other repository files modified.**

---

## 24. No-Access / No-Write Attestation

| Check | Status |
|-------|--------|
| DB access | **None** |
| SQL / MCP / Supabase | **None** |
| Runtime switch | **None** |
| Routing apply | **None** |
| Push / Deploy / Launch | **None** |
| Public indexing | **None** |
| `.env` / secrets touched | **None** |
| Product files modified | **None** |

---

*Dokumentversion: P5-E.9G.1 PASS. Option B. No cutover applied. Launch NO-GO.*
