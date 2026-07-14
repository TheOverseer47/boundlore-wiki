# P5-E.9G.2 — Local SSG Route Cutover Remediation Report

**Gate:** P5-E.9G.2 — Local SSG Route Cutover Remediation and Hosting Configuration Preparation  
**Verdict:** **PASS**  
**Final Decision:** **OPTION A — READY_FOR_PREVIEW_HOST_ROUTE_VALIDATION_GATE**  
**Date:** 2026-07-14  
**HEAD vor Gate:** `03fa07d` — Plan production SSG route cutover

---

## 1. Executive Result

| Item | Value |
|------|-------|
| **P5-E.9G.2** | **PASS** |
| **Local Route Remediation** | **COMPLETE** |
| **Preview Host Readiness** | **OPEN** — real host proof required |
| **Public Launch** | **NO-GO** (unchanged) |

**Kernaussage:** Öffentliche interne Entity-Links erzeugen kanonische Pfade `/wiki/post/<slug>/` über `js/entity-routes.js`. Legacy-Redirect- und fail-closed-404-Semantik sind lokal via `qa/local-ssg-route-preview.py` emuliert und getestet. Provider-neutrale Hosting-Spezifikation dokumentiert. Kein produktiver Apply.

---

## 2. Scope and Safety Boundaries

**Performed:** Central URL module, JS link migration, HTML script includes, local preview harness, QA checks, hosting spec, `_ssg-not-found` navigation links.

**Not performed:** DB/SQL/MCP, runtime switch, production redirect apply, deploy, push, indexation, root sitemap change, `js/supabase-config.js` change.

---

## 3. Git Baseline

| Check | Result |
|-------|--------|
| `git rev-parse HEAD` (preflight) | `03fa07dd19a918d9a61c8e0f4ab5d29bc04cd73f` |
| Working tree (preflight) | Clean except `.env.legacy.example`, `qa/e2e-baseline-bmeta.snapshot.json` |
| HEAD matches expected | **Yes** |

---

## 4. Link Inventory Before Remediation

| Classification | Count (approx.) | Examples |
|----------------|-----------------|----------|
| **A — Public internal entity links** | 40+ | `render-posts.js`, `wiki-entry-layout.js`, `post-detail.js`, … |
| **B — Admin/edit links** | unchanged | `/wiki/edit-post/?slug=` — not migrated |
| **C — API/data fields** | 0 changed | — |
| **D — Legacy compatibility** | preserved | `search-recall-utils.js` CSR fallback API |
| **E — Documentation** | unchanged | architecture docs |
| **F — Placeholder/example** | unchanged | `support.js` placeholder |

Full pre-gate inventory: `docs/architecture/p5-production-ssg-route-cutover-plan-dry-run-assessment.md` §7.

---

## 5. Central Entity URL Architecture

**Module:** `js/entity-routes.js` — `window.BoundLoreEntityRoutes`

| Function | Purpose |
|----------|---------|
| `normalizeEntitySlug(value)` | Strict string normalization; rejects traversal, schemes, case mismatch |
| `isValidEntitySlug(value)` | Allowlist `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| `buildCanonicalEntityPath(slug)` | → `/wiki/post/<slug>/` or `null` |
| `buildLegacyEntityPath(slug)` | → `/wiki/post/?slug=<slug>` (compatibility only) |
| `extractLegacySlugFromLocation(location)` | Parse legacy query path safely |
| `buildEntityPostHref({ slug, id, query })` | Primary href builder for migrations |

**QA:** `py -3 qa/p5-entity-routes-check.py` — **PASS** (21 checks, Python mirror)

---

## 6. Files Migrated

### JavaScript (public entity link generators)

| File | Change |
|------|--------|
| `js/render-posts.js` | 6× postUrl → `buildEntityPostHref` |
| `js/wiki-entry-layout.js` | 6× relation/source links |
| `js/post-detail.js` | 4× href + notification target_url |
| `js/create-post.js` | 5× redirects + relation links |
| `js/edit-post.js` | 2× redirect + relation links |
| `js/knowledge-relations.js` | 1× relation href |
| `js/unresolved-targets.js` | 2× link generators |
| `js/resource-quick-add.js` | 1× href |
| `js/discovery-home.js` | 1× card href |
| `js/recent-ticker.js` | 1× ticker href |
| `js/community-hub.js` | 2× card hrefs |
| `js/my-posts.js` | 1× postUrl |
| `js/admin-seed-local.js` | 1× result link |
| `js/search.js` | `buildPostPath` integrates entity routes |
| `js/search-recall-utils.js` | `getCanonicalResultUrl` uses entity routes when loaded |

### HTML (script includes)

`entity-routes.js` added before dependent scripts on: `index.html`, `wiki/post/index.html`, `wiki/admin/index.html`, `wiki/community/index.html`, `wiki/create-post/index.html`, `wiki/edit-post/index.html`, `wiki/account/index.html`, `wiki/admin/seed-local/index.html`, `wiki/search/index.html`, `wiki/browse/index.html`, and all category pages using `render-posts.js`.

### Admin inline

| File | Change |
|------|--------|
| `wiki/admin/index.html` | `buildPostUrl()` → `BoundLoreEntityRoutes.buildEntityPostHref` |

### Fail-closed artifact

| File | Change |
|------|--------|
| `wiki/post/_ssg-not-found/index.html` | Added Home + Search navigation links |

---

## 7. Remaining Legacy Query-Path Uses

| Location | Class | Reason |
|----------|-------|--------|
| `js/entity-routes.js` | D | `buildLegacyEntityPath`, `LEGACY_QUERY_PREFIX` |
| `js/search-recall-utils.js` | D | `CSR_FALLBACK_PREFIX`, `getCsrFallbackUrl`, empty-state note |
| `js/support.js` | F | Form placeholder example URL |
| `qa/*` fixtures | D/E | Test matrices, legacy route tests |
| `docs/architecture/*` | E | Gate documentation |
| `scripts/bl_ssg_sanitize.py` | D | Rewrites legacy hrefs in export sanitizer |
| `wiki/post/index.html` | B | CSR shell — unchanged; server redirect deferred |

**No unclassified public `?slug=` entity links in `js/`** — verified by `p5-entity-link-migration-check.py`.

---

## 8. Local Redirect Semantics

Emulated by `qa/local-ssg-route-preview.py`:

| Request | Response |
|---------|----------|
| `/wiki/post/?slug=<known>` | **307** → `/wiki/post/<known>/` |
| `/wiki/post/<known>` (no slash) | **307** → `/wiki/post/<known>/` |
| Cache | `Cache-Control: no-store` on redirects |

**Not implemented:** Client-only redirect on CSR shell (default skipped — preview harness sufficient).

---

## 9. Fail-Closed 404 Semantics

| Request | Response |
|---------|----------|
| `/wiki/post/?slug=<unknown>` | **404** + `_ssg-not-found` body |
| `/wiki/post/<unknown>/` | **404** + `_ssg-not-found` body |
| Invalid slug (`OGRE-MAGE`, traversal, `javascript:`, multi-param) | **404** |
| `/wiki/post/_ssg-not-found/` | **200** + `noindex,nofollow` (direct access) |

---

## 10. Local Preview Harness

**Tool:** `qa/local-ssg-route-preview.py`

| Mode | Command |
|------|---------|
| Self-test matrix | `py -3 qa/local-ssg-route-preview.py --test` |
| Interactive | `py -3 qa/local-ssg-route-preview.py --port 8099` |

- Binds **127.0.0.1** only
- No Supabase, no external network
- Ephemeral port in `--test` mode
- **Result:** **PASS** (18 routing checks, 2026-07-14)

---

## 11. Hosting-Neutral Rule Specification

**Document:** `docs/architecture/p5-production-ssg-hosting-route-spec.md`

Covers: directory index, trailing slash, legacy redirect, allowlist, 404 body, cache, CDN purge, case sensitivity, security, atomic deploy, rollback, noindex/sitemap separation, runtime separation.

**Production host:** **UNKNOWN** — no provider config files added.

---

## 12. Canonical Route Evidence

| Slug | HTTP | Static SEO | CSR-free | No-leak |
|------|------|------------|----------|---------|
| `ogre-mage` | 200 | PASS | PASS | PASS |
| `smought` | 200 | PASS | PASS | PASS |
| `staff-of-fire-2f316b0d` | 200 | PASS | PASS | PASS |
| `swamplands-94dadc07` | 200 | PASS | PASS | PASS |
| `swamplands-near-a-campfire-787bbd19` | 200 | PASS | PASS | PASS |

Source: `p5-real-content-entity-seo-evidence-rerun-check.py` + preview harness.

---

## 13. SEO / CSR-Free / No-Leak Regression

| Check | Result |
|-------|--------|
| `py -3 qa/p5-real-content-entity-ssg-check.py` | **PASS** (15) |
| `py -3 qa/p5-real-content-entity-seo-evidence-rerun-check.py` | **PASS** (10) |
| Entity pages `noindex, follow` | **Unchanged** |
| CSR shell `/wiki/post/?slug=` | **Unchanged** (separate production gate) |

---

## 14. Search Regression

| Check | Result |
|-------|--------|
| `py -3 qa/p5-search-recall-static-check.py` | **PASS** (Node unavailable — Python fallback) |
| `search.js` path-based result URLs | **Verified** — no `?slug=` regression |
| `search-recall-utils.js` canonical URLs | **Verified** |
| CSR fallback API | **Preserved** for compatibility |

---

## 15. Invalid-Slug and Traversal Matrix

| Probe | Preview Result |
|-------|----------------|
| `OGRE-MAGE` | 404 |
| `../`, `%2e%2e` | 404 |
| `javascript:alert(1)` | 404 |
| empty / multi slug param | 404 |
| path traversal | 404 |

---

## 16. Root Sitemap / Robots / noindex Status

| Item | Status |
|------|--------|
| `sitemap.xml` | **Unchanged** |
| `robots.txt` | **Unchanged** |
| Entity SSG `noindex, follow` | **Unchanged** |
| Public indexing | **NOT AUTHORIZED** |

---

## 17. Runtime Separation

| Track | Status |
|-------|--------|
| Route/SSG remediation (9G.2) | **COMPLETE** (local) |
| Supabase runtime cutover | **OPEN** — `js/supabase-config.js` still STAGING |

---

## 18. Rollback Plan

1. Revert commit containing 9G.2 changes.
2. Remove `entity-routes.js` script tags from HTML.
3. Redeploy prior static artifact if already applied (not applicable in 9G.2).
4. Do not touch root sitemap or `noindex` during route rollback.

---

## 19. Open Preview-Host Prerequisites

1. **Confirm production/preview host** supports directory-index routing for `/wiki/post/<slug>/`.
2. **Apply provider-neutral rules** from hosting spec on preview/staging mirror.
3. **Verify 307/404 semantics** on real host (not localhost).
4. **CDN/cache behavior** test for redirects and 404 bodies.
5. **Case sensitivity** on Linux host (Windows local tests are case-insensitive).
6. **Legacy CSR shell** remains until server-side redirect active on preview host.

---

## 20. Final Decision

**OPTION A — READY_FOR_PREVIEW_HOST_ROUTE_VALIDATION_GATE**

| Criterion | Status |
|-----------|--------|
| Internal link migration | **Complete** |
| Central slug/URL logic | **Secure and tested** |
| Local redirect emulation | **Proven** |
| Local fail-closed 404 | **Proven** |
| SSG/SEO/Search/No-leak | **PASS** |
| Real preview host proof | **OPEN** |

---

## 21. Commands Executed

```text
git status --short
git rev-parse HEAD
git log -1 --oneline
py -3 qa/p5-real-content-entity-ssg-check.py
py -3 qa/p5-real-content-entity-seo-evidence-rerun-check.py
py -3 qa/p5-entity-routes-check.py
py -3 qa/p5-entity-link-migration-check.py
py -3 qa/local-ssg-route-preview.py --test
py -3 qa/p5-search-recall-static-check.py
git diff --check
git diff --stat
git diff -- js/supabase-config.js
git diff -- sitemap.xml robots.txt
git diff -- supabase
```

**Note:** Node unavailable on gate machine — search regression via Python static check.

---

## 22. Files Changed

| File | Action |
|------|--------|
| `js/entity-routes.js` | Created |
| `js/render-posts.js` | Modified |
| `js/wiki-entry-layout.js` | Modified |
| `js/post-detail.js` | Modified |
| `js/create-post.js` | Modified |
| `js/edit-post.js` | Modified |
| `js/knowledge-relations.js` | Modified |
| `js/unresolved-targets.js` | Modified |
| `js/resource-quick-add.js` | Modified |
| `js/discovery-home.js` | Modified |
| `js/recent-ticker.js` | Modified |
| `js/community-hub.js` | Modified |
| `js/my-posts.js` | Modified |
| `js/admin-seed-local.js` | Modified |
| `js/search.js` | Modified |
| `js/search-recall-utils.js` | Modified |
| `wiki/post/_ssg-not-found/index.html` | Modified |
| `wiki/admin/index.html` | Modified |
| `index.html` + 15 wiki HTML pages | Modified (script include) |
| `qa/local-ssg-route-preview.py` | Created |
| `qa/p5-entity-routes-check.py` | Created |
| `qa/p5-entity-link-migration-check.py` | Created |
| `qa/p5-search-recall-static-check.py` | Created |
| `docs/architecture/p5-production-ssg-hosting-route-spec.md` | Created |
| `docs/architecture/p5-local-ssg-route-cutover-remediation-report.md` | Created |

**Unchanged:** `js/supabase-config.js`, `js/search.js` runtime config ref, `sitemap.xml`, `robots.txt`, `supabase/`, root entity `noindex`.

---

## 23. No-Access / No-Write Attestation

| Check | Status |
|-------|--------|
| DB / SQL / MCP / Supabase | **None** |
| Runtime switch | **None** |
| Production routing apply | **None** |
| Push / Deploy / Launch | **None** |
| Public indexing | **None** |
| Secrets committed | **None** |

---

*Dokumentversion: P5-E.9G.2 PASS. Option A. Preview host proof OPEN. Launch NO-GO.*
