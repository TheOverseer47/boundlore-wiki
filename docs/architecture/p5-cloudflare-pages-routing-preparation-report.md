# P5-E.9G.3 — Cloudflare Pages Routing Preparation Report

**Gate:** P5-E.9G.3 — Cloudflare Pages Routing Preparation and No-Deploy Validation  
**Verdict:** **PASS**  
**Final Decision:** **OPTION B — CONDITIONALLY_READY_FOR_CLOUDFLARE_PREVIEW_DEPLOY_AUTHORIZATION_GATE**  
**Date:** 2026-07-14  
**HEAD vor Gate:** `c11b3af` — Prepare local SSG route cutover

---

## 1. Executive Result

| Item | Value |
|------|-------|
| **P5-E.9G.3** | **PASS** |
| **Cloudflare Route Preparation** | **COMPLETE (local)** |
| **Preview Deploy Authorization** | **NOT AUTHORIZED** |
| **Push** | **NOT AUTHORIZED** |

**Kernaussage:** Cloudflare Pages Function für Legacy `?slug=` vorbereitet, 404-Artefakte ergänzt, lokale QA PASS. Kein Push, kein Deploy. Node/Wrangler nicht verfügbar — Function via Python-Mock getestet, nicht in echter JS-Laufzeit. Build-Command/Functions-Kompatibilität **UNVERIFIED**.

---

## 2. Scope and Safety Boundaries

**Performed:** `functions/wiki/post.js`, slug policy module, `wiki/post/404.html`, root `404.html` hardening, build script extension, Python mock QA, read-only remote baseline (partial).

**Not performed:** push, deploy, Cloudflare/GitHub changes, wrangler, MCP, DB, runtime switch, indexation.

---

## 3. Git Baseline

| Check | Result |
|-------|--------|
| HEAD | `c11b3af82ed59175291c21d316a94d015acab04b` |
| Branch | `main` (local only — **no push**) |
| Remote | `origin https://github.com/TheOverseer47/boundlore-wiki.git` |
| Working tree (preflight) | Clean except allowed untracked files |

---

## 4. Proven Cloudflare Pages Topology

**Source:** USER-PROVIDED SCREENSHOT EVIDENCE

| Item | Value |
|------|-------|
| Provider | Cloudflare Pages |
| Live project | **Inf-boundlore** |
| Production domain | **boundlore.com** |
| Pages domain | **Inf-boundlore.pages.dev** |
| GitHub repo | TheOverseer47/boundlore-wiki |
| Production branch | **main** |
| Automatic deployments | **Enabled** |
| Build command | **empty** |
| Build output directory | **empty** |
| Root directory | **empty** |
| Deployment model | Static root = repository root |

---

## 5. Production-Deploy Risk from Main

**Classification:** PRODUCTION_DEPLOY_RISK

Any `git push origin main` triggers automatic production deploy to **boundlore.com** via project **Inf-boundlore**. This gate performed **zero** remote git or Cloudflare operations.

---

## 6. Cloudflare Static Route Model

| Route | Static artifact |
|-------|-----------------|
| `/wiki/post/<slug>/` | `wiki/post/<slug>/index.html` |
| `/wiki/post/` (no query) | `wiki/post/index.html` (CSR shell — unchanged) |
| Unknown under `/wiki/post/` | `wiki/post/404.html` (nested 404) |
| Unknown site-wide | `404.html` (root) |

**Evidence:** LOCAL TEST EVIDENCE — `qa/local-ssg-route-preview.py --test` PASS.

---

## 7. Why `_redirects` Cannot Solve the Legacy Query Route

**Source:** OFFICIAL CLOUDFLARE DOCUMENTATION (gate constraint) + USER-PROVIDED EVIDENCE

Cloudflare Pages `_redirects` does **not** match incoming query parameters. Therefore:

```
/wiki/post/?slug=ogre-mage
```

**cannot** be reliably redirected via `_redirects` rules such as:

```
/wiki/post/?slug=:slug  /wiki/post/:slug/  307   # DO NOT APPLY — INVALID ON CF PAGES
```

**No `_redirects` file was created** in this gate.

---

## 8. Pages Function Architecture

| File | Role |
|------|------|
| `functions/_entity-slug-policy.js` | Shared slug policy (parity with `js/entity-routes.js`) |
| `functions/wiki/post.js` | Legacy query handler + asset probe |
| `functions/wiki/post/index.js` | Re-export for `/wiki/post/` trailing-slash route |

**Scope:** `/wiki/post` and `/wiki/post/` only. All other requests: `context.next()`.

**No:** DB, Supabase, secrets, KV, D1, R2, external fetch (except `ASSETS.fetch`).

---

## 9. Function Request Matrix

| Scenario | Expected | Python mock |
|----------|----------|-------------|
| GET `/wiki/post/` no query | `context.next()` | PASS |
| GET `?slug=ogre-mage` (known + asset exists) | **307** → `/wiki/post/ogre-mage/` | PASS |
| GET `?slug=does-not-exist-99999` | **404** | PASS |
| GET `?slug=OGRE-MAGE` | **400** | PASS |
| Extra query params | **404** | PASS |
| Double `slug` param | **404** | PASS |
| `javascript:alert(1)` slug | **400** | PASS |
| POST | **405** Allow GET, HEAD | PASS |
| HEAD known slug | **307** no body | PASS |
| Asset layer failure | **503** | PASS |

**Limitation:** Python model — **not** V8/Workers runtime (see §15).

---

## 10. Slug Validation and Redirect Security

- Regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$` — **parity verified** with `js/entity-routes.js`
- Redirect `Location`: path-only `/wiki/post/<slug>/`
- No `http://`, `https://`, `//`, query, fragment
- `Cache-Control: no-store`, `X-Robots-Tag: noindex` on redirect
- Redirect **only after** successful `ASSETS.fetch` HEAD on canonical `index.html`

---

## 11. Static Asset Existence Proof

Function probes:

```
/wiki/post/<slug>/index.html
```

via `context.env.ASSETS.fetch(..., { method: "HEAD" })`.

If probe fails or asset missing → **404** (not redirect). If ASSETS unavailable → **503**.

---

## 12. Root and Nested 404 Architecture

| File | Purpose |
|------|---------|
| `404.html` | Root SPA-fallback prevention; `noindex,nofollow` added |
| `wiki/post/404.html` | Nested entity 404 body for Function + Cloudflare nearest-404 |
| `wiki/post/_ssg-not-found/index.html` | SSG evidence artifact (unchanged semantics) |

All three: static HTML, no `Loading post...`, safe Home/Browse/Search links.

`scripts/build-real-entity-ssg.py` now generates `wiki/post/404.html` deterministically.

---

## 13. Cloudflare SPA-Fallback Risk

**Risk:** Without root `404.html`, unknown paths may fall through to homepage **200**.

**Mitigation:** Root `404.html` **exists** and now includes `meta robots noindex,nofollow`.

**Remote note:** Existing deployment baseline on `boundlore.com` unknown routes returned **404** (see §17).

---

## 14. Local Cloudflare-Compatible Validation

| Check | Result |
|-------|--------|
| `py -3 qa/p5-cloudflare-pages-function-check.py` | **PASS** (14 mock + static) |
| `py -3 qa/p5-cloudflare-pages-routing-static-check.py` | **PASS** |
| `py -3 qa/local-ssg-route-preview.py --test` | **PASS** |
| SSG/SEO/Search/Link regression | **PASS** |

---

## 15. Wrangler / Node Availability

| Tool | Status |
|------|--------|
| Node | **NOT AVAILABLE** |
| npm | **NOT AVAILABLE** |
| Wrangler | **NOT AVAILABLE** |
| `node --check functions/wiki/post.js` | **NOT RUN** |
| `wrangler pages dev` | **NOT RUN** |

**Consequence:** Function logic validated via **Python mock model** mirroring JS behavior. **Requires Preview Gate** with Node/Wrangler or Cloudflare Preview deploy for runtime proof.

---

## 16. SSG / SEO / Search / No-Leak Regression

All prior gates' checks **PASS** (2026-07-14):

- `p5-real-content-entity-ssg-check.py` — 15 PASS
- `p5-real-content-entity-seo-evidence-rerun-check.py` — 10 PASS
- `p5-entity-routes-check.py` — 21 PASS
- `p5-entity-link-migration-check.py` — PASS
- `p5-search-recall-static-check.py` — PASS

`js/supabase-config.js`, `sitemap.xml`, `robots.txt`, `supabase/` — **unchanged**.

---

## 17. Existing Deployment Read-only Baseline

**Classification:** EXISTING_DEPLOYMENT_BASELINE ONLY — **not** proof of this commit.

| Host | Route | Status | Notes |
|------|-------|--------|-------|
| `boundlore.com` | `/` | **200** | Server: cloudflare |
| `boundlore.com` | `/wiki/post/?slug=ogre-mage` | **200** | No redirect (old deploy — CSR shell) |
| `boundlore.com` | `/wiki/post/does-not-exist-99999/` | **404** | Cache-Control: no-store |
| `inf-boundlore.pages.dev` | `/` | **UNREACHABLE** from gate machine | Empty/c timeout response |

No `X-Robots-Tag` observed on sampled responses. Entity pages retain `noindex` meta locally.

---

## 18. Build-Command and Functions Compatibility Risk

| Setting | Current | Gate action |
|---------|---------|-------------|
| Build command | empty | **NOT CHANGED** |
| Build output | empty | **NOT CHANGED** |
| Root directory | empty | **NOT CHANGED** |

**Status:** `CLOUDFLARE_FUNCTION_BUILD_SUPPORT_UNVERIFIED`

Cloudflare recommends `exit 0` for static projects with Functions when build command is empty. Whether **Inf-boundlore** recognizes `functions/` with current settings is **UNKNOWN** — requires separate Preview Gate or manual dashboard verification.

---

## 19. Non-Production Preview Safety Plan

**NOT AUTHORIZED in this gate.** Future preview must use:

1. Dedicated **non-main** branch (e.g. `preview/p5-e9g3-ssg-routes`)
2. **Never** push to `main`
3. Preview URL: `*.inf-boundlore.pages.dev` only
4. **No** custom domain mapping for preview branch
5. Verify `X-Robots-Tag: noindex` on preview
6. Entity `noindex` meta preserved
7. Runtime stays **STAGING**
8. No root sitemap activation

**DO NOT EXECUTE IN THIS GATE:** `git push origin main`, `wrangler pages deploy`.

---

## 20. Production Isolation Requirements

Before any preview push, manually confirm:

1. Production branch remains **main**
2. Preview branch ≠ main
3. Preview deployments enabled for preview branch only
4. No preview custom domain
5. **boundlore.com** → production only
6. Project = **Inf-boundlore** (not boundlore-wiki / Inf-wiki)
7. Push command excludes `main`
8. Rollback of preview does not affect production

---

## 21. Rollback Plan

1. Delete preview branch on remote (when authorized)
2. Revert commit locally if needed
3. Remove `functions/` directory in revert deploy
4. Root/nested 404 changes revert with commit
5. Do not touch indexation or runtime config during route rollback

---

## 22. Open Prerequisites

1. **JavaScript runtime test** — `node --check` + mock in V8 or Wrangler local dev
2. **Cloudflare Functions build support** — verify empty build command works with `functions/`
3. **Preview branch push authorization** — separate gate, non-main only
4. **Remote proof** on `*.inf-boundlore.pages.dev` after preview deploy
5. **Case sensitivity** on Linux Workers runtime
6. **CDN cache** behavior for 307/404 from Function

---

## 23. Final Decision

**OPTION B — CONDITIONALLY_READY_FOR_CLOUDFLARE_PREVIEW_DEPLOY_AUTHORIZATION_GATE**

| Criterion | Status |
|-----------|--------|
| Function fail-closed design | **PASS** (mock) |
| 404 artifacts | **PASS** |
| No invalid `_redirects` | **PASS** |
| No wrangler config | **PASS** |
| SSG/SEO regression | **PASS** |
| JS runtime execution | **OPEN** (Node unavailable) |
| CF Functions + empty build | **UNVERIFIED** |

---

## 24. Commands Executed

```text
git status --short
git rev-parse HEAD
git log -1 --oneline
git branch --show-current
git remote -v
node --version          # NOT AVAILABLE
npm --version           # NOT AVAILABLE
wrangler --version      # NOT AVAILABLE
py -3 qa/p5-cloudflare-pages-function-check.py
py -3 qa/p5-cloudflare-pages-routing-static-check.py
py -3 qa/p5-real-content-entity-ssg-check.py
py -3 qa/p5-real-content-entity-seo-evidence-rerun-check.py
py -3 qa/p5-entity-routes-check.py
py -3 qa/p5-entity-link-migration-check.py
py -3 qa/p5-search-recall-static-check.py
py -3 qa/local-ssg-route-preview.py --test
curl.exe -sI -X GET https://boundlore.com/
curl.exe -sI -X GET https://boundlore.com/wiki/post/?slug=ogre-mage
curl.exe -sI -X GET https://boundlore.com/wiki/post/does-not-exist-99999/
curl.exe -sI -X GET https://inf-boundlore.pages.dev/   # unreachable/empty
```

---

## 25. Files Changed

| File | Action |
|------|--------|
| `functions/_entity-slug-policy.js` | Created |
| `functions/wiki/post.js` | Created |
| `functions/wiki/post/index.js` | Created |
| `404.html` | Modified (noindex, nav links) |
| `wiki/post/404.html` | Created |
| `scripts/build-real-entity-ssg.py` | Modified (generates post 404) |
| `qa/p5-cloudflare-pages-function-check.py` | Created |
| `qa/p5-cloudflare-pages-routing-static-check.py` | Created |
| `docs/architecture/p5-cloudflare-pages-routing-preparation-report.md` | Created |

**Unchanged:** `js/supabase-config.js`, `js/search.js`, `sitemap.xml`, `robots.txt`, `supabase/`, no `_redirects`, no wrangler files.

---

## 26. No-Push / No-Deploy / No-Access Attestation

| Check | Status |
|-------|--------|
| git push | **None** |
| Preview/Production deploy | **None** |
| Cloudflare dashboard/API | **None** |
| GitHub settings | **None** |
| DB / MCP / Supabase | **None** |
| Runtime switch | **None** |
| Public indexing | **None** |
| Secrets committed | **None** |

---

*Dokumentversion: P5-E.9G.3 PASS. Option B. Preview deploy NOT AUTHORIZED.*
