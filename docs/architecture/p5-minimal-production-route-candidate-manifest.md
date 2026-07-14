# P5-E.9G.7A — Minimal Production Route Candidate Manifest

**Gate:** P5-E.9G.7A — Minimal Production Route Candidate Build (Local Only)  
**Date:** 2026-07-15  
**Branch:** `candidate/p5-e9g7-minimal-production-route`  
**Final Decision:** **READY_FOR_MINIMAL_CANDIDATE_PREVIEW_AUTHORIZATION_GATE**

---

## 1. Executive Result

| Item | Value |
|------|-------|
| **P5-E.9G.7A** | **PASS** |
| **Construction** | Selective restore from `45098f2` + minimal link-migration hunks on `origin/main` |
| **Runtime** | Production baseline **preserved** (`ohkoojpzmptdfyowdgog`) |
| **Delta size** | **1 commit**, ~50 production files (vs 223 commits / 337 files full candidate) |
| **Push** | **NOT AUTHORIZED** |

---

## 2. Production Baseline

| Item | Value | Evidence |
|------|-------|----------|
| **origin/main** | `15e1241` | LOCAL GIT EVIDENCE |
| **Production runtime ref** | `ohkoojpzmptdfyowdgog` | LOCAL GIT EVIDENCE |

---

## 3. Routing Source Commit

| Item | Value |
|------|-------|
| **Source** | `45098f2` — Fix Cloudflare legacy redirect header |
| **Method** | `git restore --source 45098f2 -- <path>` for new routing files only |
| **Not used** | Full tree checkout, cherry-pick, merge |

---

## 4. Candidate Construction Method

1. `git switch -c candidate/p5-e9g7-minimal-production-route origin/main`
2. Restore routing-only **new** files from `45098f2`
3. Apply **minimal hunks** to existing JS/HTML for canonical URL migration
4. **Exclude** `js/supabase-config.js`, `supabase/`, robots/sitemap changes, feature expansion
5. Local QA + single commit

---

## 5. Included Runtime Files

| File | Classification | Reason |
|------|----------------|--------|
| `functions/_entity-slug-policy.js` | REQUIRED_ROUTING | Slug policy parity |
| `functions/wiki/post.js` | REQUIRED_ROUTING | Legacy redirect (45098f2 proven) |
| `functions/wiki/post/index.js` | REQUIRED_ROUTING | Trailing-slash handler re-export |
| `js/entity-routes.js` | REQUIRED_ROUTING | Central canonical URL builder |

**Runtime config:** `js/supabase-config.js` — **UNCHANGED** (proof: empty diff vs `origin/main`)

---

## 6. Included Static SSG Files

| File | Classification |
|------|----------------|
| `wiki/post/ogre-mage/index.html` | REQUIRED_STATIC_SSG |
| `wiki/post/smought/index.html` | REQUIRED_STATIC_SSG |
| `wiki/post/staff-of-fire-2f316b0d/index.html` | REQUIRED_STATIC_SSG |
| `wiki/post/swamplands-94dadc07/index.html` | REQUIRED_STATIC_SSG |
| `wiki/post/swamplands-near-a-campfire-787bbd19/index.html` | REQUIRED_STATIC_SSG |
| `wiki/post/404.html` | REQUIRED_ROUTING |
| `wiki/post/_ssg-not-found/index.html` | REQUIRED_ROUTING |
| `404.html` | REQUIRED_ROUTING |
| `scripts/build-real-entity-ssg.py` | REQUIRED_QA |
| `qa/fixtures/real-content-entity-ssg-export.json` | REQUIRED_QA |

---

## 7. Included Link-Migration Files

Minimal path-only hunks (no feature logic):

| File | Change |
|------|--------|
| `js/render-posts.js` | 3× `buildEntityPostHref` |
| `js/search.js` | `buildPostPath` canonical |
| `js/post-detail.js` | Related entries + notifications target_url |
| `js/community-hub.js` | 2× href (restored routing-only file) |
| `js/my-posts.js` | 1× view link |
| `js/recent-ticker.js` | href only |
| `js/discovery-home.js` | href only |
| `js/create-post.js` | 2× navigational URL only |
| `js/edit-post.js` | 2× navigational URL only |
| `js/admin-seed-local.js` | 1× seed result link |
| `wiki/admin/index.html` | `buildEntityPostHref` + script include |
| 18× public wiki HTML | `entity-routes.js` script before consumers |

---

## 8. Included QA Files

| File | Purpose |
|------|---------|
| `qa/local-ssg-route-preview.py` | Local routing harness |
| `qa/p5-cloudflare-pages-function-check.py` | Function mock + Location headers |
| `qa/p5-cloudflare-pages-routing-static-check.py` | Static Cloudflare checks |
| `qa/p5-entity-routes-check.py` | Slug policy |
| `qa/p5-entity-link-migration-check.py` | Link migration scan |
| `qa/p5-search-recall-static-check.py` | Search URL regression |
| `qa/p5-real-content-entity-ssg-check.py` | S-05 SSG evidence |
| `qa/p5-real-content-entity-seo-evidence-rerun-check.py` | S-05 SEO rerun |
| `qa/fixtures/p5-search-recall-corpus.json` | Search static fixture |
| `qa/fixtures/p5-search-recall-queries.json` | Search static fixture |
| `qa/real-content-entity-sitemap.fixture.xml` | S-05 sitemap evidence |
| `js/search-recall-utils.js` | QA static dependency (not loaded in production HTML) |

---

## 9. Explicitly Excluded Files and Systems

- **Staging runtime** (`js/supabase-config.js` switch to `jzzgoiwfbuwiiyvwgwri`)
- **All `supabase/*.sql`** (22 files in full delta)
- **Contribution/activation expansion** (P1/P2 registries, release-gate-client, patch-mode, etc.)
- **Admin dashboard expansion** (1648-line delta excluded; only 2-line URL + script)
- **Search RPC / DB FTS** client integration (full `search.js` from 45098f2)
- **Homepage/media/SEO hub** unrelated changes
- **111 docs** from full delta
- **Raw DB exports** (`qa/fixtures/real-content-export/`)
- **223-commit full development stand**

---

## 10. Runtime Preservation Proof

```text
git diff origin/main -- js/supabase-config.js  → (empty)
git diff origin/main -- supabase/             → (empty)
```

Production ref `ohkoojpzmptdfyowdgog` remains active. Staging ref not enabled.

---

## 11. Supabase / SQL Exclusion Proof

No files under `supabase/` in candidate diff. Functions use `ASSETS` binding only — no Supabase fetch.

---

## 12. Product-Activation Exclusion Proof

| Path | Diff vs origin/main |
|------|---------------------|
| `js/patch-mode.js` | none |
| `js/release-gate-client.js` | none |
| `wiki/create-post/` (logic) | 2 URL lines + script tag only |
| `wiki/edit-post/` (logic) | 2 URL lines + script tag only |
| `wiki/admin/` | 2 lines + script tag only |

No new write/upload/moderation features introduced.

---

## 13. Local Routing Evidence

| Check | Result |
|-------|--------|
| `p5-cloudflare-pages-function-check.py` | PASS |
| `p5-cloudflare-pages-routing-static-check.py` | PASS |
| `local-ssg-route-preview.py --test` | PASS (18 routes) |
| `p5-entity-routes-check.py` | PASS |
| `p5-entity-link-migration-check.py` | PASS |

---

## 14. SSG / SEO / CSR-Free / No-Leak Evidence

| Check | Result |
|-------|--------|
| `p5-real-content-entity-ssg-check.py` | PASS |
| `p5-real-content-entity-seo-evidence-rerun-check.py` | PASS |
| 5 entity slug matrix | All PASS |
| Entity `noindex, follow` | Confirmed in SSG pages |

---

## 15. Remaining Legacy Uses

Allowed `?slug=` references:

- `js/entity-routes.js` — `LEGACY_QUERY_PREFIX` (central builder)
- `js/search-recall-utils.js` — `CSR_FALLBACK_PREFIX` (compatibility constant)
- `js/support.js` — placeholder example (allowlisted)
- `functions/wiki/post.js` — legacy handler input
- QA scripts and documentation

---

## 16. Candidate File Delta

Approximate counts vs `origin/main` (1 commit):

| Type | Count |
|------|------:|
| Added | ~20 |
| Modified | ~32 |
| **Total** | **~52** |

Categories: Functions (3), SSG (7), Link migration JS (11), HTML script includes (21), QA (12), 404 (1), generator (1).

---

## 17. Candidate Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Incomplete link migration | Low | `p5-entity-link-migration-check` PASS |
| Staging runtime leak | **None** | `supabase-config.js` unchanged |
| Product activation | Low | URL-only hunks in write UIs |
| Function redirect | Low | Byte-identical to 45098f2 proven code |
| Preview not yet run on candidate | Medium | Next gate P5-E.9G.7B |

---

## 18. Rollback Basis

| Item | Value |
|------|-------|
| **Pre-candidate** | `15e1241` |
| **Rollback** | Revert candidate commit or reset branch to `origin/main` |

---

## 19. Preview Revalidation Requirements

Before any production authorization:

1. Push `candidate/p5-e9g7-minimal-production-route` to new **non-main** preview branch (separate gate)
2. Confirm Cloudflare Preview deploy Success on **exact candidate commit**
3. Re-run P5-E.9G.5 redirect matrix (GET/HEAD Location, 404, 5 SSG)
4. Confirm `js/supabase-config.js` on preview shows **production ref** (not staging)
5. No boundlore.com requests

---

## 20. Final Decision

**READY_FOR_MINIMAL_CANDIDATE_PREVIEW_AUTHORIZATION_GATE**

Candidate is isolated, runtime-preserved, locally QA-passed, and substantially smaller than full HEAD.

---

## 21. Commands Executed

```text
git switch -c candidate/p5-e9g7-minimal-production-route origin/main
git restore --source 45098f2 -- <routing files>
# minimal StrReplace hunks on link-migration JS/HTML
py -3 qa/p5-cloudflare-pages-function-check.py
py -3 qa/p5-cloudflare-pages-routing-static-check.py
py -3 qa/p5-entity-routes-check.py
py -3 qa/p5-entity-link-migration-check.py
py -3 qa/local-ssg-route-preview.py --test
py -3 qa/p5-search-recall-static-check.py
py -3 qa/p5-real-content-entity-ssg-check.py
py -3 qa/p5-real-content-entity-seo-evidence-rerun-check.py
git commit -m "Build minimal production route candidate"
```

---

## 22. No-Push / No-Deploy / No-Access Attestation

| Boundary | Status |
|----------|--------|
| git push | NOT PERFORMED |
| Preview/Production deploy | NOT PERFORMED |
| boundlore.com | NOT ACCESSED |
| Supabase/DB/MCP | NOT ACCESSED |
| Runtime switch | NOT PERFORMED |

---

*Manifest version: P5-E.9G.7A PASS. Candidate ready for preview authorization gate.*
