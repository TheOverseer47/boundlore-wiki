# P5-E.9G.9D — Patch-Mode Preview Remote Verification

## 1. Executive Result

**Verdict:** `PASS_S09_REMOTE_PREVIEW_CONFIRMED`  
**S-09 decision:** `S09_CLOSED`  
**Candidate commit (remote preview):** `3c3a52b`  
**Unique Preview URL:** `https://3f355c5a.lnf-boundlore.pages.dev`  
**Push count:** exactly one (preview branch only)  
**Evidence commit pushed:** NO  
**Production deploy / main push / merge:** NONE  
**Supabase mutation:** NONE  

## 2. Authorization Boundary

This gate performed:

- one normal push of `preview/p5-e9g9d-patch-mode-remote-verification` at `3c3a52b`
- read-only GitHub check-run / deployment identity lookup
- HTTP GET/HEAD against the unique Pages preview URL
- local browser smoke against the preview (no credentials, no intentional mutations)
- temporary outside-repo harness using remote preview artifacts + stubbed patch-config cases
- local static/runtime QA against the candidate tree
- local evidence documentation + local evidence commit only

Not performed: force push, second push, PR/merge to main, manual Cloudflare redeploy, custom domain changes, SQL/migrations, storage writes, auth login, product activation, indexing submission, application-code edits.

## 3. Git Baseline

| Item | Value |
|---|---|
| Preflight branch | `review/p5-e9g9c-r2-account-scope-reverification` |
| Preflight HEAD | `3c3a52b` |
| Preview branch | `preview/p5-e9g9d-patch-mode-remote-verification` |
| MAIN_SHA_BEFORE | `15e1241deadbbd0fadfce48e2fdc44ce847a7c21` |
| Remote | `origin` → `https://github.com/TheOverseer47/boundlore-wiki.git` |
| Tracked dirty files at start | none (known untracked artefacts only) |

## 4. Candidate Integrity

`effe505..3c3a52b` contains only:

- `docs/architecture/p5-patch-mode-account-scope-reverification.md`

No application code after remediation.

`941552c..3c3a52b` forbidden-path diffs empty for:

- `supabase/`
- `functions/`
- `package.json`
- `js/supabase-config.js`
- `sitemap.xml` / `robots.txt`

**Verdict:** candidate scope clean for preview push.

## 5. Preview Branch

- Local name check: absent before create
- Remote name check: absent before create
- Created from HEAD `3c3a52b`
- No alternate name used

## 6. Push Evidence

```
git push -u origin preview/p5-e9g9d-patch-mode-remote-verification
```

Post-push:

- `refs/heads/preview/p5-e9g9d-patch-mode-remote-verification` → `3c3a52b907430dd9397b66c830f530c157dac7bb`
- `refs/heads/main` → `15e1241deadbbd0fadfce48e2fdc44ce847a7c21` (unchanged)

No `--force`, no second push, no PR created by this gate.

## 7. Main Branch Before and After

| Moment | SHA |
|---|---|
| Before push | `15e1241deadbbd0fadfce48e2fdc44ce847a7c21` |
| After remote verification | `15e1241deadbbd0fadfce48e2fdc44ce847a7c21` |

## 8. Cloudflare Project Identity

Observed from GitHub Cloudflare Pages check-run (read-only):

- Pages project path: `pages/view/lnf-boundlore/...`
- Public URL suffix: `.lnf-boundlore.pages.dev`
- Gate brief named project `Inf-boundlore`; live deployment identity resolves to **`lnf-boundlore`** (same family / known suffix). Documented as observed.

Incidental separate check: `Workers Builds: boundlore-wiki` concluded **failure** for the same commit. That is not the Pages preview deployment and did not change `origin/main`. Production `https://boundlore.com/js/patch-mode.js` remains absent (404 HTML shell).

## 9. Deployment Identity

| Field | Value |
|---|---|
| Check name | Cloudflare Pages |
| External / Deployment ID | `3f355c5a-51c5-4d8f-a7ad-106a43baed02` |
| Unique deployment host prefix | `3f355c5a` |
| Status | completed / success (`Deployed successfully`) |
| Started/Completed (UTC) | `2026-07-16T01:36:40Z` |
| Branch (Git) | `preview/p5-e9g9d-patch-mode-remote-verification` |
| Branch alias URL (truncated by CF) | `https://preview-p5-e9g9d-patch-mode.lnf-boundlore.pages.dev` |

Evidence prefers the unique URL below, not only the alias.

## 10. Deployment Commit

GitHub check summary Latest commit: `3c3a52b`  
Remote preview branch SHA: `3c3a52b`  
**Identity proven.**

## 11. Preview URL

**Unique:** `https://3f355c5a.lnf-boundlore.pages.dev`  
Suffix matches `.lnf-boundlore.pages.dev`  
Not `boundlore.com`.

## 12. Production Isolation

| Check | Result |
|---|---|
| pages.dev unique URL | yes |
| Redirect home → boundlore.com | no (200, no Location) |
| Custom domain assigned to this preview | none observed |
| Production branch | remains `main` |
| origin/main changed | no |
| Production serves new `patch-mode.js` | no (404 shell) |
| Supabase mutation this gate | none |
| release_gate toggle | none |

`?slug=` → canonical entity redirect stays on the same preview host (`307` to `.../wiki/post/ogre-mage/`).

**Verdict:** isolated.

## 13. Noindex Evidence

| Route | X-Robots-Tag | Meta robots | Preview canonical | Verdict |
|---|---|---|---|---|
| `/` | `noindex` | `index, follow, ...` (static home meta) | none with pages.dev | effective noindex via header; meta conflict residual |
| `/wiki/create-post/` | `noindex` | none | none | PASS |
| `/wiki/account/` | `noindex` | none | none | PASS |
| `/wiki/post/ogre-mage/` | `noindex` | `noindex, follow` | none | PASS |
| `/wiki/support/` | `noindex` | none | none | PASS |
| `/wiki/login/` | `noindex` | none | none | PASS |
| `/wiki/browse/` | `noindex` | none | none | PASS |
| missing route | (empty header) | `noindex, nofollow` | none | PASS via meta |
| `/robots.txt` | `noindex` | n/a | n/a | PASS |
| `/sitemap.xml` | `noindex` | n/a | n/a | PASS; zero `pages.dev` URLs |

Residual limitation: root HTML still ships production-oriented `index,follow` meta while Cloudflare preview injects `X-Robots-Tag: noindex`. Crawlers that honor the more restrictive header remain noindex; this gate records the meta conflict without changing config.

## 14. Remote HTTP Matrix

| Route | Status | Redirect | Location | Noindex | Verdict |
|---|---:|---|---|---:|---|
| `/` | 200 | no | — | header | PASS |
| `/wiki/browse/` | 200 | no | — | header | PASS |
| `/wiki/creatures/` | 200 | no | — | header | PASS |
| `/wiki/post/ogre-mage/` | 200 | no | — | header | PASS |
| `/wiki/post/?slug=ogre-mage` | 307 | yes | same-preview canonical | header | PASS |
| `/wiki/create-post/` | 200 | no | — | header | PASS |
| `/wiki/edit-post/` | 200 | no | — | header | PASS |
| `/wiki/post/` | 200 | no | — | header | PASS |
| `/wiki/guilds/` | 200 | no | — | header | PASS |
| `/wiki/submit-tutorial/` | 200 | no | — | header | PASS |
| `/wiki/account/` | 200 | no | — | header | PASS |
| `/wiki/support/` | 200 | no | — | header | PASS |
| `/wiki/admin/` | 200 | no | — | header | PASS |
| `/wiki/login/` | 200 | no | — | header | PASS |
| `/wiki/reset-password/` | 200 | no | — | header | PASS |
| `/robots.txt` | 200 | no | — | header | PASS |
| `/sitemap.xml` | 200 | no | — | header | PASS |
| `/js/patch-mode.js` | 200 | no | — | header | PASS |
| `/css/style.css` | 200 | no | — | header | PASS |
| missing / unknown entity | 404 | no | — | meta | PASS |

No 5xx observed on sampled routes. No unexpected production-domain redirects.

## 15. Remote Runtime Artifact Hashes

Binary compare (`Accept-Encoding: identity`) of commit `3c3a52b` vs unique preview:

| Runtime File | Local SHA-256 | Remote | Verdict |
|---|---|---|---|
| `js/patch-mode.js` | `cd4a79a7cc3ecacab0372d2afffb1f13ca8c04e9816ff76aab010dda51e7d9e5` | identical | MATCH |
| `js/create-post.js` | `ef169a7d41546b275c0aa95b65ead5638b912aa41685bf66668d562fce71fbac` | identical | MATCH |
| `js/edit-post.js` | `a218869a340c7d388bf54435b0de0440d46090d7d004f44b7a343e5de00ccc06` | identical | MATCH |
| `js/post-detail.js` | `d4f058c05498304daeebffbfd4307bb6852bf5ad92df565a0313417fa05a7f87` | identical | MATCH |
| `js/guilds-apply.js` | `4346868128f45ca38be94e7d628ad6e17ca191b5ce6bcf95dfc1db960e575282` | identical | MATCH |
| `js/submit-tutorial.js` | `d5deab99b82561e79983dfb0f61ff463441f960deb0996b00e293c72603c5a78` | identical | MATCH |
| `js/my-posts.js` | `1effb83d2ba8a82e268118bf6c86a91e4641a3e14edcfd69664718117d4ff5a6` | identical | MATCH |
| `css/style.css` | `e32d73d49330d4675f802d64421f1c4298820e7e947d42f7e40a15becf2e053f` | identical | MATCH |
| `wiki/account/index.html` | `8e51fe45af90344f6e17a7b08deb9d2119e8efdf956ca90af1dd1d7bad4beaef` | identical | MATCH |
| `wiki/create-post/index.html` | `61e6abd32f421e8c6acd947b7dac1b6d1f37458f192f741949b58aa6900291d0` | identical | MATCH |
| `wiki/edit-post/index.html` | `4efb88470374989d81c39d2b67911229958e5b2157d0fa087c9b51dd411f1228` | identical | MATCH |
| `wiki/guilds/index.html` | `9641ef1fbf3b181439d19fd2e32c72653b15566e6176cb4d3a367fb4d5e172bb` | identical | MATCH |
| `wiki/post/index.html` | `c6d49693d30c563aabafd68cde189898dd7479ec209faf3101f2b8990034fd77` | identical | MATCH |
| `wiki/submit-tutorial/index.html` | `0542115eae6636494eb5862e74aeea717fdf120124a2db602b752f3c5fdd3911` | identical | MATCH |

## 16. Remote Script-Wiring

Observed remote script order (CDN supabase → `supabase-config.js` → `patch-mode.js?v=p5-e9g9b` → mutation module) on:

- account, create-post, edit-post, post, guilds, submit-tutorial

No patch-mode script on:

- support (reports), login, admin, reset-password, register

Account remote markers:

- `#logoutBtn2` with `type="button"`
- `#accountAvatarPatchHost`
- `bindControls(["#saveAvatarBtn", "#avatarUrlInput"], avatarPatchHost)`
- no active broad `#accountContent` bind

## 17. Patch-Mode Normal-State Evidence

Browser on unique preview `/wiki/create-post/` after init:

- `WikiPatchMode` present
- `getState()` → `state: "allowed"`, `ready: true`, `allowed: true`, `enabled: false`
- Submit control enabled after confirmed load
- Read-only navigation/search chrome available
- No intentional mutation performed

Note: `code` field may still show prior `PATCH_MODE_LOADING` token after allow (known cosmetic lastCode retention; does not enable writes incorrectly).

Live config read was a pure read path implied by client init; no login and no write RPCs were invoked by this gate.

## 18. Remote Fail-Closed Simulation

Outside-repo harness loaded remote `patch-mode.js` + remote HTML/JS and stubbed config outcomes.

| Scenario | User-Content | Expected | Writes | Verdict |
|---|---|---|---:|---|
| enabled=true | block | block | 0 | PASS |
| enabled=false | allow | allow | 0 | PASS |
| pending | block | block | 0 | PASS |
| missing row | block | block | 0 | PASS |
| multiple rows | block | block | 0 | PASS |
| NULL | block | block | 0 | PASS |
| invalid | block | block | 0 | PASS |
| network error | block | block | 0 | PASS |
| timeout | block | block | 0 | PASS |
| offline | block | block | 0 | PASS |
| Supabase missing | block | block | 0 | PASS |
| API missing | block | block | 0 | PASS |

## 19. Account Scope Remote Evidence

Account HTML fetched from preview (auth shell redirects live browser to login without credentials; structure verified from remote artifact + harness):

| State | Avatar/Profile | Logout | Recovery | Verdict |
|---|---|---|---|---|
| pending | blocked | available | available | PASS |
| enabled=true | blocked | available | available | PASS |
| enabled=false | available | available | available | PASS |
| error | blocked | available | available | PASS |
| offline | blocked | available | available | PASS |
| Supabase missing | blocked | available | available | PASS |
| API missing | blocked | available | available | PASS |

Logout: `type="button"`, outside host, no `assertCanSubmit`.  
Avatar: inside host + `assertCanSubmit`.  
No real auth/logout/upload executed.

## 20. Reports and Recovery Availability

| Surface | Patch-bound remotely | Verdict |
|---|---|---|
| Support / reports | no | PASS |
| Login | no | PASS |
| Reset password | no | PASS |
| Register / email confirmation shell | no | PASS |
| Admin shell | no | PASS |
| Account logout/recovery controls | not patch-bound | PASS |

No real report/recovery/admin actions executed.

## 21. Enter and Double-Submit Evidence

Harness + remote JS inventory:

- Enter/assert on pending/blocked/error → 0 workflows
- Enter on allowed → 1 stub workflow
- Double-click model capped by in-flight guards present in create/edit/post-detail/guilds remote JS (`assertCanSubmit` + submitting/inFlight-style flags)
- submit-tutorial / my-posts rely on assert + UI disable path (no separate inflight token required for PASS given assert gate)

No real mutation payloads sent.

## 22. Browser Console Evidence

Create-post and support preview loads: no blocker console exceptions recorded in CDP probe; required patch-mode asset present on mutation pages; support correctly lacks WikiPatchMode.

Account live DOM path redirected to login without credentials (expected auth shell).

## 23. Network and No-Mutation Evidence

Harness recorder: GET-only for preview artifact fetches; mutation methods = 0.  
Browser smoke: no login credentials, no intentional POST/PUT/PATCH/DELETE by the gate.  
No service-role usage.  
Production write: none. Staging write: none.

## 24. Routing and Function Regression

- `?slug=` → same-preview canonical `307`
- SSG entity `/wiki/post/ogre-mage/` → 200
- Unknown entity → 404 with meta noindex,nofollow
- Local CF routing/function Python checks PASS against candidate tree

## 25. Search, SSG and SEO Regression

Local candidate checks PASS:

- search recall static
- entity SSG
- entity SEO evidence rerun
- entity routes / link migration

Remote: browse/creatures/items/entity pages 200 with preview noindex header; sitemap contains `boundlore.com` URLs only (no preview leak).

## 26. Complete S-09 Acceptance Matrix

All 32 remote-closure criteria from the gate brief assessed PASS for this preview, with residuals documented in §28 (homepage meta conflict; auth-shell account live DOM; cosmetic lastCode; incidental Workers build failure unrelated to Pages success).

## 27. S-09 Final Decision

**`S09_CLOSED`**

## 28. Remaining Limitations

- Root meta `index,follow` contradicts preview `X-Robots-Tag: noindex` (header remains effective; no config change in this gate)
- 404 responses may omit `X-Robots-Tag` but include meta `noindex,nofollow`
- Account interactive DOM requires auth; verified via remote HTML/JS harness without login
- Cosmetic `lastCode` retention after allow
- Cloudflare branch alias truncates long branch names; unique deployment URL used for evidence
- Separate Workers Builds check failed for the same push; Pages preview succeeded; main unchanged
- Carry-forward: comments UPDATE/DELETE under release lock; discovery storage UPDATE/DELETE under release lock; release_gate TRUNCATE/grant hygiene; legacy unwired `post-interactions.js`; A+/A open items; S-07/S-08 still OPEN

## 29. Rollback Basis

Delete or abandon remote branch `preview/p5-e9g9d-patch-mode-remote-verification` (and associated Pages preview).  
Do not merge to main.  
Candidate application tip remains `effe505` / documentation tip locally may include this evidence commit.

## 30. Commands Executed

Representative (non-secret):

- `git status/branch/rev-parse/log/remote/ls-remote`
- `git diff` candidate integrity checks
- `git switch -c preview/p5-e9g9d-patch-mode-remote-verification`
- `git push -u origin preview/p5-e9g9d-patch-mode-remote-verification` (exactly once)
- GitHub API check-runs read for commit `3c3a52b`
- `curl`/Python GET/HEAD against unique preview URL
- temporary TEMP harness scripts (outside repo)
- `python qa/p5-*.py` local regression suite
- browser navigate to preview create-post / support / account(login redirect)
- local `git add` + `git commit` of this evidence file only (not pushed)

## 31. Files Changed

This gate’s tracked change:

- `docs/architecture/p5-patch-mode-preview-remote-verification.md`

No application/HTML/CSS/JS/SQL/function/package changes in this gate.

## 32. Push / No-Merge / No-Production-Deploy Attestation

- Preview branch push: **exactly one**
- Evidence commit push: **NO**
- Merge to main: **NONE**
- Production deploy: **NONE**
- Custom domain / production branch change: **NONE**
- Supabase mutation: **NONE**
- Product activation / public launch: **FAIL / NO-GO** (unchanged)
