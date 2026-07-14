# P5-E.9G.5 — Cloudflare Location Header Remediation Report

**Gate:** P5-E.9G.5  
**Verdict target:** `CLOUDFLARE_LOCATION_HEADER_REMEDIATION_PASS` (pending remote proof)  
**Branch:** `preview/p5-e9g5-ssg-routes-fix`  
**Base commit:** `a34b67c` — Prepare Cloudflare Pages route validation

---

## 1. Ausgangsfehler

P5-E.9G.4 remote proof on Cloudflare Preview (`f9eb6afb.lnf-boundlore.pages.dev`):

- `GET` / `HEAD` `/wiki/post/?slug=ogre-mage` → **HTTP 307**
- **`Location` header absent** in final response
- `X-Robots-Tag` absent on redirect response

Function executed (not CSR 200), but redirect was not HTTP-conform for clients.

---

## 2. P5-E.9G.4 Remote Evidence

| Check | Result |
|-------|--------|
| Legacy known slug | 307, no Location |
| SSG routes | 200 PASS |
| 404 semantics | PASS |
| Preview noindex | PASS |
| Runtime | STAGING |
| Pages Function recognition | PROVEN |

---

## 3. Ursache

`functions/wiki/post.js` called `redirect307(canonicalPath)` with a **relative path** (`/wiki/post/ogre-mage/`).

Cloudflare Pages Functions runtime emitted status 307 but **did not surface** the relative `Location` header to clients. The handler logic was correct; the response header form was not runtime-compatible.

---

## 4. Geänderte Handler-Dateien

| File | Change |
|------|--------|
| `functions/wiki/post.js` | Build absolute same-origin `Location` via `new URL(canonicalPath, request.url)`; explicit redirect headers |
| `functions/wiki/post/index.js` | Unchanged (re-exports shared handler) |
| `functions/_entity-slug-policy.js` | Unchanged |

No shared handler extraction — single source in `post.js` already shared via `index.js` re-export.

---

## 5. Neue Redirect-Erzeugung

```javascript
const targetUrl = new URL(canonicalPath, request.url).toString();
return redirect307(targetUrl);
```

`redirect307` now sets explicit headers:

- `Location`: absolute HTTPS same-origin URL
- `Cache-Control`: `no-store`
- `X-Robots-Tag`: `noindex`

---

## 6. Same-Origin-Sicherheitsmodell

- Scheme and host derived **only** from `context.request.url`
- Path derived **only** from validated slug policy (`buildCanonicalEntityPath`)
- No query string, fragment, or foreign origin
- No hardcoded `boundlore.com`, `lnf-boundlore.pages.dev`, or `inf-boundlore.pages.dev`
- Open-redirect inputs (scheme slugs, extra params, duplicate slug) never produce `Location`

---

## 7. Asset-Probe-Reihenfolge

Unchanged fail-closed ordering:

1. Validate slug and query shape
2. `await canonicalAssetExists(context, canonicalPath)` via `ASSETS.fetch` HEAD
3. Only on confirmed asset → 307 redirect
4. Missing asset → 404; probe failure → 503

---

## 8. GET-/HEAD-Semantik

Both methods share identical status and header decisions. HEAD returns null body on all response types.

---

## 9. Fehler-/404-Semantik

Preserved from P5-E.9G.3:

| Case | Status | Location |
|------|--------|----------|
| No slug param | `context.next()` | — |
| Unknown slug | 404 | none |
| Invalid slug | 400 | none |
| Extra params | 404 | none |
| Asset probe fail | 503 | none |
| POST/PUT/etc. | 405 | none |

---

## 10. Lokale Tests

Extended `qa/p5-cloudflare-pages-function-check.py` and `qa/p5-cloudflare-pages-routing-static-check.py` to assert:

- Absolute HTTPS `Location` on GET and HEAD
- Same-origin host parity
- Preview host example (`example-preview.lnf-boundlore.pages.dev`)
- No production host hardcoding
- Open-redirect protection
- Asset-probe-before-redirect ordering

Full regression suite executed in Phase 11.

---

## 11. Preview-Hostname-Korrektur

**Belegter Hostsuffix (P5-E.9G.4 deploy):** `*.lnf-boundlore.pages.dev`

Older docs referencing `*.inf-boundlore.pages.dev` are corrected where touched. Preview URL for P5-E.9G.5 must come from Cloudflare/GitHub deployment output — not constructed.

Cloudflare project display name: **Inf-boundlore**.

---

## 12. Remote-Revalidation-Plan

After single push to `preview/p5-e9g5-ssg-routes-fix`:

1. Confirm Preview deployment Success from GitHub check run
2. `GET` + `HEAD` `/wiki/post/?slug=ogre-mage` — require `Location`, `no-store`, `noindex`
3. Follow canonical target `/wiki/post/ogre-mage/` — 200 SSG
4. Negative matrix (unknown/invalid/extra params) — no Location
5. SSG/404/SEO/No-Leak regression
6. Runtime STAGING ref check on `/js/supabase-config.js`

---

## 13. Production-Isolation

- No push to `main`
- No production deploy
- No `boundlore.com` requests
- No Cloudflare/GitHub settings changes
- No runtime switch
- No Supabase/DB/MCP access

---

## 14. Dateien geändert

- `functions/wiki/post.js`
- `qa/p5-cloudflare-pages-function-check.py`
- `qa/p5-cloudflare-pages-routing-static-check.py`
- `docs/architecture/p5-cloudflare-location-header-remediation-report.md` (this file)
- `docs/architecture/p5-cloudflare-pages-routing-preparation-report.md` (hostname correction)

---

## 15. Befehle ausgeführt

Gate phases 1–23 per P5-E.9G.5 specification (preflight, branch, local QA, commit, single push, remote validation).

---

## 16. No-Access-/No-Deploy-Attestation

| Boundary | Status |
|----------|--------|
| Push to main | NOT PERFORMED |
| Production deploy | NOT AUTHORIZED |
| boundlore.com | NOT ACCESSED |
| Cloudflare API/settings | NOT ACCESSED |
| Wrangler deploy | NOT PERFORMED |
| DB/SQL/MCP/Supabase | NOT ACCESSED |
| Runtime switch | NOT PERFORMED |
| Public indexing | NOT AUTHORIZED |
