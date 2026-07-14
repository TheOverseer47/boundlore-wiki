# P5 Production SSG Hosting Route Specification

**Gate:** P5-E.9G.2 — provider-neutral specification only  
**Status:** DOCUMENTATION — **NOT APPLIED** to any host  
**Date:** 2026-07-14

This document describes the **intended production routing semantics** for BoundLore entity SSG pages. It does **not** activate redirects, rewrites, or deploy rules. The target hosting provider remains **UNKNOWN** from repository evidence.

---

## 1. Directory Index Requirement

| Rule | Semantics |
|------|-----------|
| Canonical URL | `/wiki/post/<entity-slug>/` |
| Physical file | `wiki/post/<entity-slug>/index.html` |
| Requirement | Host must resolve trailing-slash directory URLs to `index.html` |
| Failure mode | If unsupported, explicit rewrite rule required: `/wiki/post/<slug>/` → `/wiki/post/<slug>/index.html` |

**Local preview evidence:** `qa/local-ssg-route-preview.py --test` PASS (2026-07-14).

---

## 2. Trailing-Slash Behavior

| Request | Expected Response |
|---------|-------------------|
| `/wiki/post/<known-slug>/` | **200** — static SSG HTML |
| `/wiki/post/<known-slug>` (no slash) | **307** (preview/staging) or **308/301** (production, after host proof) → `/wiki/post/<known-slug>/` |
| Cache (preview) | `Cache-Control: no-store` |
| Cache (production) | Apply only after successful preview-host validation |

---

## 3. Legacy Query Redirect

| Request | Expected Response |
|---------|-------------------|
| `/wiki/post/?slug=<known-slug>` | **307** (preview) → `/wiki/post/<known-slug>/` |
| Query parsing | Read **exactly one** `slug` parameter |
| Foreign query params | **Discard** — do not reflect into `Location` |
| Slug validation | Allowlist regex: `^[a-z0-9]+(?:-[a-z0-9]+)*$` |
| Existence check | Redirect **only** if slug exists in deployed SSG build manifest |

**Production permanent redirect (308/301):** Apply only in a separate Apply Gate after preview-host proof. Document cache/rollback risk before choosing 301 vs 308.

---

## 4. Allowlist / Build-Manifest Check

- Redirect targets must match slugs present in the deployed `wiki/post/<slug>/index.html` tree.
- Do **not** redirect based on syntactically valid slug alone.
- Build manifest source: output of `scripts/build-real-entity-ssg.py` + QA PASS.
- Remove stale slug directories on each deploy.

---

## 5. Unknown Slug → HTTP 404

| Scenario | Expected |
|----------|----------|
| `/wiki/post/?slug=<unknown>` | **404** |
| `/wiki/post/<unknown-slug>/` | **404** |
| Body | `_ssg-not-found/index.html` content (branded not-found) |
| Must not | Return CSR thin-shell **200**, generic entity success, or homepage redirect |

---

## 6. `_ssg-not-found` Error Body

- File: `wiki/post/_ssg-not-found/index.html`
- Robots: `noindex, nofollow`
- No entity canonical, no BLMETA, no UUID/email/secrets
- Safe navigation links: Home, Browse, Search
- HTTP **404** status is set by hosting layer — the HTML file alone does not imply status

---

## 7. Cache-Control (Preview / Staging)

| Route class | Header |
|-------------|--------|
| Preview redirects (307) | `Cache-Control: no-store` |
| Preview SSG pages | `Cache-Control: no-store` or short max-age |
| Fail-closed 404 | `Cache-Control: no-store` |

---

## 8. Production Permanent Redirect Cache

| Risk | Mitigation |
|------|------------|
| Wrong 301/308 cached permanently | Validate on preview/staging mirror first |
| CDN stale redirects | Purge `/wiki/post/*` after rule change |
| Rollback | Remove redirect rules before reverting static tree |

---

## 9. CDN Purge

After route cutover or rollback, purge:

- `/wiki/post/*`
- `/wiki/post/?slug=*` (if cached)
- Any prior CSR shell paths

---

## 10. Case Sensitivity

| Policy | Detail |
|--------|--------|
| Canonical slugs | **lowercase only** |
| `/wiki/post/Ogre-Mage/` | **404** or explicit lowercase redirect (choose one; no dual canonicals) |
| Do not | Silently normalize uppercase to lowercase without documented rule |

---

## 11. Query Parameter Discarding

- Legacy redirect strips all query parameters except none forwarded to canonical path.
- Contribution success params (`?merged=`, `?submitted=`) belong on **canonical path** URLs only, generated client-side after migration (9G.2).

---

## 12. Security — Open Redirect and Traversal

| Threat | Mitigation |
|--------|------------|
| Open redirect via `?slug=` | Strict slug regex + build allowlist |
| Path traversal (`../`, `%2e%2e`) | Reject — **404** |
| Scheme injection (`javascript:`) | Reject — **404** |
| Double-encoded traversal | Decode once; reject on `..` or `\` |
| Multiple `slug` params | Reject — **404** |

**Local evidence:** `qa/local-ssg-route-preview.py --test` traversal/invalid matrix PASS.

---

## 13. Atomic SSG Deploy

1. Run export (privileged gate) → sanitized JSON.
2. Run `scripts/build-real-entity-ssg.py`.
3. Run QA: `p5-real-content-entity-ssg-check.py`, no-leak checks.
4. Deploy `wiki/post/<slug>/` tree atomically (replace entire slug directories).
5. Block deploy on QA failure.

---

## 14. Stale Slug Directory Removal

- Compare deployed slug set to current build manifest.
- Delete directories for slugs no longer in manifest.
- Never leave orphan SSG pages from previous exports.

---

## 15. Rollback Order

1. Remove redirect/rewrite rules.
2. Revert internal link JS (if changed in apply gate).
3. Redeploy previous static artifact.
4. Purge CDN cache.
5. Roll back runtime config separately (if changed).
6. **Do not** enable root sitemap entity URLs or remove `noindex` during route rollback.

---

## 16. noindex Unchanged

Entity SSG pages retain `noindex, follow` until Launch Indexing Gate. This specification does not authorize indexability changes.

---

## 17. Root Sitemap Unchanged

Root `sitemap.xml` must not gain entity post URLs until Launch Indexing Gate. Entity evidence remains in `qa/real-content-entity-sitemap.fixture.xml`.

---

## 18. Runtime Cutover Separated

| Track | Scope |
|-------|-------|
| Route / SSG cutover | Static HTML, redirects, internal links |
| Supabase runtime | `js/supabase-config.js` staging → target ref |

These **must remain separate, reversible gates**. SSG SEO core does not require Supabase at render time.

---

## EXAMPLE ONLY — DO NOT APPLY

The following illustrate possible provider syntax. **Not active. Not verified against production host.**

### Netlify-style `_redirects` (EXAMPLE ONLY)

```text
/wiki/post/?slug=:slug  /wiki/post/:slug/  307!  slug=:slug
```

### nginx (EXAMPLE ONLY)

```nginx
location = /wiki/post/ {
  if ($arg_slug ~ "^[a-z0-9]+(-[a-z0-9]+)*$") {
    return 307 /wiki/post/$arg_slug/;
  }
  return 404;
}
```

### Cloudflare Workers (EXAMPLE ONLY)

Pseudo-logic: parse `slug` → validate regex → check manifest → 307 or 404.

---

*Specification version: P5-E.9G.2. Not applied. Production host UNKNOWN.*
