# P5-E.10A — S-07 Backup and Restore Evidence Readiness

## 1. Executive Result

**Verdict:** `MANUAL_READ_ONLY_BACKUP_METADATA_REQUIRED`

S-07 remains **OPEN**. Production identity is confirmed (`ohkoojpzmptdfyowdgog`). Structural baselines and official backup-scope rules are documented. **Managed backup status for Production could not be proven via available read-only APIs in this gate.** Organization plan metadata reports **`free`**, and official Supabase documentation states that automatic daily managed backups apply to Pro/Team/Enterprise — Free projects are expected to perform regular CLI dumps and off-site backups.

Additionally, official documentation states **Storage binary objects are not included** in database backups. No tracked Production backup/restore runbook or script exists. Untracked local dump artefacts exist for staging/legacy only (metadata-only; not opened) and do **not** constitute S-07 closure evidence.

**Backup creation / restore / project creation / push / deploy:** NOT AUTHORIZED / NONE in this gate.

## 2. Authorization and Read-only Boundary

Performed:

- Git read-only + new local review branch
- Tracked-file inventory and grep
- Supabase `list_projects` / `get_project` / `get_organization`
- Production SELECT-only catalog and aggregate counts
- Official Supabase documentation search/fetch
- Metadata-only stats on untracked `backups/` (counts, sizes, ages; **no file contents opened**)

Not performed:

- Backup create/download/open/parse
- Restore / PITR / branch DB / project create/delete
- Any DML/DDL/migration/policy change
- Storage mutation / Auth user mutation
- Env/secret access, Cloudflare/GitHub config change
- Push / merge / deploy / product activation

## 3. Git Baseline

| Item | Value |
|---|---|
| Preflight branch | `preview/p5-e9g9d-patch-mode-remote-verification` |
| Preflight HEAD | `7de4282` |
| Local ahead of remote preview | 1 (prior evidence commit only) |
| Review branch | `review/p5-e10a-backup-restore-readiness` |
| Review HEAD before this doc commit | `7de4282` |
| Staging used as Production | **no** |

## 4. Fable-5 S-07 Requirement

No dedicated Fable-5 Pre-Launch audit body for S-07 was found as a tracked file in this repository lineage. Reconstructable requirement from gate status matrices and subsequent P5 docs:

- S-07 Backup/Restore is a **hard open gate** before Product Activation / Public Launch
- Closure requires proven backup **and** proven isolated restore rehearsal (backup alone is insufficient)
- S-08 Monitoring/Alerts remains a separate open hard gate
- Third Fable-5 audit required after remediations

Existing related docs mention S-07 only as carry-forward OPEN (e.g. patch-mode readiness/preview evidence). No prior successful Production restore evidence document was found.

## 5. Production Project Identity

| Field | Value |
|---|---|
| Project Name | TheOverseer47's Project |
| Project Ref | `ohkoojpzmptdfyowdgog` |
| Region | `eu-central-1` |
| Status | `ACTIVE_HEALTHY` |
| Postgres | `17.6` (engine 17; platform version `17.6.1.141`) |
| Created | `2026-07-03T09:41:08Z` |
| Org (redacted detail) | plan=`free` (org slug omitted from public evidence beyond readiness need) |
| Staging project (not used as Prod) | `boundlore-staging` / `jzzgoiwfbuwiiyvwgwri` |

**Verdict:** Production identity confirmed. Staging not confused with Production.

## 6. Complete Recovery System Inventory

Systems in scope for BoundLore disaster recovery:

1. Supabase Postgres (schemas/data/RLS/functions)
2. Supabase Auth
3. Supabase Storage (metadata + binaries)
4. Cloudflare Pages (`lnf-boundlore`) + Pages Functions
5. GitHub repository `TheOverseer47/boundlore-wiki`
6. DNS / custom domain `boundlore.com`
7. Client publishable config (`js/supabase-config.js`)
8. External: Formspree contribute path (documented in prior patch-mode inventory); email/SMTP/auth providers as dashboard config

## 7. Database Inventory

Non-system schemas present: `auth`, `extensions`, `graphql`, `graphql_public`, `public`, `realtime`, `storage`, `supabase_migrations`, `vault`.

Tables (by schema): auth 23, public 27, realtime 3, storage 8, supabase_migrations 1, vault 1.

Views: extensions 2, public 1, vault 1.

Functions (selected schemas): public 65, storage 17, auth 4, realtime 15, extensions 55, vault 5, graphql_public 1.

Triggers (non-system): 15.

Policies: public 93, storage 9.

Installed extensions: `pg_stat_statements`, `pg_trgm`, `pgcrypto`, `plpgsql`, `supabase_vault`, `uuid-ossp`.

Public SECURITY DEFINER functions: 18.

Public sequences: 0.

All listed public base tables have RLS enabled (27/27 sampled via catalog).

`public.release_gate.contribution_locked = true` (aggregate/status only).

Auth→profile triggers present on `auth.users`: `on_auth_user_created`, `on_auth_user_confirmed`. Profile role self-promotion trigger present.

## 8. Auth Inventory

- Auth schema tables present (count above)
- User/profile aggregate: auth.users=5, profiles=5 (counts only; no identities exported)
- Provider/SMTP/redirect: dashboard-only; not read as values in this gate
- Sessions/tokens after restore: expect invalidation / re-login per typical Auth restore behavior (**INCLUDED_BUT_REQUIRES_VERIFICATION** for hashes; sessions not relied upon)

## 9. Storage Inventory

Buckets (ids only):

| Bucket | Public | Size limit noted | MIME limits |
|---|---|---|---|
| avatars | true | none in catalog | no |
| discovery-uploads | true | 20971520 | yes |
| report-screenshots | true | none in catalog | no |

Object counts (aggregate): `discovery-uploads` = 20; other buckets returned no object rows (count 0 / absent from group-by).

Storage policies: 9.

## 10. Edge Function Inventory

Supabase Edge Functions deployed via MCP list: **none** (`functions: []`).

Cloudflare Pages Functions in Git (not Supabase Edge):

- `functions/wiki/post.js`
- `functions/wiki/post/index.js`
- `functions/_entity-slug-policy.js`

Classification: **FULLY_REPRODUCIBLE_FROM_GIT** for Pages Function source. Runtime binding/routes are Cloudflare dashboard/Git integration dependent.

## 11. GitHub Recovery Inventory

- Runtime HTML/CSS/JS largely in repository
- Cloudflare Pages Functions in repository
- **Tracked `supabase/migrations/*` count: 0** — schema history not recoverable from Git migrations alone
- No `package.json` / `wrangler.toml` / `_headers` / `_redirects` tracked at repo root in this lineage
- QA scripts and architecture docs present
- Default branch Production tip (remote): `15e1241…` on `main` (read-only observed earlier in program)
- Preview branch exists remotely at `3c3a52b` (application tip for patch-mode)

Gap: DB schema + RLS + RPC primarily live in Production DB / dumps, not in tracked migrations.

## 12. Cloudflare Recovery Inventory

- Project: `lnf-boundlore` (`.lnf-boundlore.pages.dev`)
- Production custom domain: `boundlore.com`
- Production branch: `main`
- Build/output/env: largely **dashboard-only** (not fully encoded in tracked repo files)
- Pages Functions: in Git
- Rollback: prior Pages deployments exist in Cloudflare (read-only historically via GitHub checks); not exercised here
- Preview noindex via platform headers (prior P5-E.9G.9D evidence)

## 13. External Dependency Inventory

| Dependency | Evidence | Recovery note |
|---|---|---|
| DNS / `boundlore.com` | Production domain | Dashboard/DNS provider; not in DB backup |
| Formspree | Prior architecture note (`js/main.js` contribute) | External service; separate from Supabase backup |
| Supabase Auth email/SMTP | Dashboard | NOT in DB backup as provider secrets |
| OAuth providers (if any) | Dashboard | Separate secret/config restore |
| IndexNow / search submission | Not inventoried as active Production mutation in this gate | Must stay off during restore tests |
| Monitoring/alerts | S-08 still OPEN | Separate hard gate |

## 14. Managed Backup Status

| Item | Finding |
|---|---|
| Metadata API via MCP | **Unavailable** (no backup-list tool; no Management API token used) |
| Org plan (API) | **`free`** |
| Official managed daily backups | Documented for **Pro/Team/Enterprise only** |
| Free-tier guidance | Regular CLI `db dump` + off-site backups recommended |
| PITR | Paid add-on; requires paid plan + compute constraints |
| Restore-to-new-project | Paid plan + physical backups required |
| Last successful backup time/size/status | **UNPROVEN in this gate** |

**Verdict:** Managed Production backup status is **not proven**. Strong indication Free plan lacks automatic daily managed backups, pending Dashboard confirmation.

## 15. Backup Type and Retention

Expected if on Free (per docs): **no automatic daily managed backups**; operator-managed dumps only.

Expected if upgraded to Pro: daily physical backups, **7-day** retention (Team 14 / Enterprise up to 30). PITR optional paid add-on (RPO down to ~2 minutes worst case per docs).

Actual Production type/retention: **UNKNOWN until Dashboard/API confirmation**.

## 16. Last Successful Backup

**UNKNOWN** — requires manual read-only Dashboard or Management API listing.

## 17. Backup Scope

Classification uses official Supabase docs + project facts:

| Component | Classification |
|---|---|
| PostgreSQL schemas/data (incl. public) | INCLUDED_IN_MANAGED_DB_BACKUP *(when managed backups exist)* / SEPARATE_BACKUP_REQUIRED on Free via dump |
| Auth schema / hashed credentials | INCLUDED_IN_MANAGED_DB_BACKUP *(when present)*; sessions not relied on |
| Storage `storage.objects` metadata | INCLUDED_IN_MANAGED_DB_BACKUP |
| Storage binary objects | **NOT_INCLUDED** (official) → **SEPARATE_BACKUP_REQUIRED** |
| Edge Functions (Supabase) | N/A (none deployed) |
| Cloudflare Pages Functions | NOT_INCLUDED → Git |
| Function/project secrets & API keys | NOT_INCLUDED → SEPARATE_BACKUP_REQUIRED (names only in runbooks) |
| Auth provider / SMTP settings | NOT_INCLUDED |
| Cloudflare / DNS / custom domain | NOT_INCLUDED |
| GitHub source | SEPARATE (Git remote + optional offline mirror later) |
| Vault secret **values** | UNKNOWN/NOT for evidence export; existence of vault extension only |
| Logs | NOT_INCLUDED |

## 18. Components Not Included in Database Backup

Confirmed by official docs and/or inventory:

- Storage file binaries
- Dashboard Auth/SMTP/provider settings and secrets
- API keys / service role
- Cloudflare configuration & DNS
- GitHub itself
- Edge Function secrets (N/A currently)
- Project deletion destroys managed backups permanently (docs caution)

## 19. Production Structural Baseline

See §7. Snapshot timestamp: this gate’s SELECT session (2026-07-16 program day). Use for later restore comparison.

## 20. Aggregate Data Baseline

| Metric | Count |
|---|---:|
| auth.users | 5 |
| profiles | 5 |
| posts | 26 |
| comments | 1 |
| post_reactions | 3 |
| reports | 0 |
| wiki_entities | 14 |
| wiki_observations | 2 |
| search_documents | 6 |
| discovery-uploads objects | 20 |
| release_gate contribution_locked | true |

No PII/content rows exported.

## 21. Storage Metadata versus Binary Objects

Official: DB backup restores metadata only; deleted/missing binaries are not resurrected by DB restore alone.

| Bucket | Metadaten geschützt (DB) | Binärdaten geschützt (managed DB backup) | Separate Sicherung | Restore-Test nötig |
|---|---|---|---|---|
| avatars | yes (when DB backup exists) | **no** | **yes** | **yes** |
| discovery-uploads | yes | **no** | **yes** | **yes** |
| report-screenshots | yes | **no** | **yes** | **yes** |

Safe test approach later: checksum/sample **non-sensitive** fixtures or aggregate hash inventory without publishing private object paths.

## 22. Auth Recovery Assessment

- `auth.users` covered by DB backup/dump when that backup exists
- Password hashes: expected included in Auth schema dump/backup; **verify in rehearsal**, never print
- Profiles triggers: present; must re-verify post-restore
- Provider/SMTP: dashboard reconfiguration required
- Email isolation required for any restore target: disable custom SMTP / use sink / no production redirects
- External OAuth callbacks must not point at Production during rehearsal

## 23. Edge Function and Secret Recovery

| Function surface | Source in Git | Secrets | Reproducible |
|---|---|---|---|
| Cloudflare `wiki/post` Pages Function | yes | Cloudflare/env names only | FULLY_REPRODUCIBLE_FROM_GIT + dashboard bind |
| Supabase Edge Functions | none deployed | n/a | N/A |

Secret values must never be stored in docs/Git. Runbook should list **names** only and recovery from password manager / Dashboard.

## 24. Existing Backup Scripts

Tracked backup/restore scripts matching backup|restore|pg_dump|pg_restore: **none found**.

Implication: no reviewed, guarded, Production-safe restore automation in Git. Future scripts must include target guards, confirmations, checksums, and forbid Production restore by default.

## 25. Existing Backup Artifact Metadata

Untracked `backups/` directory (contents **not opened**):

| Meta | Value |
|---|---|
| Files | 43 |
| Total bytes | ~7.5 MiB |
| Top folders | staging (34), legacy (8), legacy-schema-only (1) |
| Extensions | `.sql` 27, `.dump` 11, `.txt` 4, `.json` 1 |
| Age range (mtime UTC) | 2026-07-13 → 2026-07-15 |
| Manifest / archive-list companions | present (counts only) |

Classification:

- **LOCATION_KNOWN (local untracked)** but **RESTORE_UNTESTED** for S-07 Production closure
- Appear oriented to **staging/legacy gate prewrites**, not a documented Production off-site retention program
- Encryption/checksum of dump bodies: **UNKNOWN** (not opened)
- Must not be committed to Git

## 26. Backup Security and Encryption

- Managed Supabase backups (when on paid plans): platform-managed storage; details not independently verified here
- Local untracked dumps: treat as **sensitive**; assume **UNENCRYPTED** until proven otherwise; keep out of Git
- Custom role passwords: docs note daily backups omit custom role passwords

## 27. RPO and RTO Assessment

| Item | Status |
|---|---|
| Existing formal RPO | **not found** in tracked docs |
| Existing formal RTO | **not found** |
| Technical Free-plan reality | RPO could be **unbounded** between operator dumps if no managed backups |
| Docs PITR worst-case RPO | ~2 minutes (if enabled on paid) |
| Daily Pro backup RPO | up to ~24h between backups |
| Recommended starting targets (pending user decision) | RPO ≤ 24h for content; RTO ≤ 4–8h for wiki read path |

**User decision required** for accepted RPO/RTO before claiming S-07 closed.

## 28. Incident Recovery Scenarios

| Szenario | Wiederherstellungsquelle | möglicher Datenverlust | erwartete Dauer | ungeklärte Abhängigkeit |
|---|---|---|---|---|
| Bad migration / SQL | prior dump / managed backup | since last good backup | hours | Free backup unproven |
| Accidental row delete | PITR or dump | up to RPO | hours | PITR not available on Free |
| Storage binary loss | separate object backup / re-upload | objects since last object backup | hours–days | **no object backup process** |
| Supabase project wipe | off-site dump + new project | if no off-site dump: catastrophic | days | migrations missing in Git |
| Cloudflare misconfig | prior deployment rollback / Git redeploy | low for static | minutes–hours | dashboard-only settings |
| GitHub loss | remotes/mirrors | code history | hours | no documented bare-mirror process |
| Secret loss | password manager / rotate | access outage | hours | secret inventory incomplete |
| Auth corruption | Auth schema restore + trigger verify | sessions invalid | hours | email side effects |

## 29. Restore Target Options

| Option | Isolation | Cost Risk | Fidelity | Storage Support | Recommendation |
|---|---|---|---|---|---|
| Temporary new Supabase project | high | paid project + possibly paid source features | high for DB/Auth | binaries still separate | Preferred **after** paid backup capability OR CLI dump restore path |
| Supabase branch | medium | paid/branching features | medium | limited | Only if officially suitable; not assumed |
| Local Supabase/Postgres | high | low | medium | metadata yes; binaries via local fixture | Good for schema/RLS rehearsal on Free |
| Existing staging overwrite | **low isolation / high risk** | low | high | risky | **Do not use** unless explicitly disposable |

## 30. Recommended Isolated Restore Target

**Near-term (Free / unproven managed backups):** local Supabase CLI environment restored from an **authorized future** logical dump of Production (not created in this gate), with SMTP disabled and no Production URLs.

**After Pro + physical backups:** prefer official **Restore to a New Project** for DB/Auth fidelity, then separately verify Storage binaries; disable outbound extensions/webhooks on clone.

Do **not** restore into Production. Do **not** overwrite staging without explicit disposable confirmation.

## 31. Restore Rehearsal Design

Future rehearsal must prove: successful restore; schema/table/view/function/trigger/policy/index/extension parity vs §7/§19; RLS on; `contribution_locked=true`; aggregate count plausibility vs §20; Auth trigger integrity; Storage bucket+policy+selected binary checksums; app smoke on isolated base URL with noindex; measured RPO/RTO; cleanup of target and temp artefacts; no secrets/PII in evidence.

## 32. Database Verification Plan

Compare restored catalog counts and critical object names to §7; verify `release_gate`; verify SECURITY DEFINER count band; verify no fail-open grant surprises; no content dumps in evidence.

## 33. Storage Verification Plan

Bucket list/config/policies match; object counts; binary presence for agreed sample set via checksum without path publication; confirm public buckets do not unexpectedly expose private test objects.

## 34. Auth Verification Plan

User/profile counts; triggers fire on synthetic local user only if email fully sinked; no Production OAuth redirect; no real outbound mail.

## 35. Application Smoke Plan

Point isolated app or static host at restore target keys (temporary); exercise read routes (home/search/entity); confirm writes remain locked; Patch-Mode/release-lock safe; no Production domain.

## 36. No-Email / No-Webhook Isolation

Disable custom SMTP; clear hook URLs; disable `pg_net`/cron external calls if present on clone; use fake Site URL; noindex; no IndexNow.

## 37. Cleanup Plan

Delete temporary project or stop local stack; shred unencrypted dump copies; rotate any temporary keys; ensure no public preview of restore data remains.

## 38. S-07 Acceptance Criteria

As specified by the gate brief (30 items). Current readiness vs criteria:

- Identity: **met**
- Current backup proven: **not met**
- Retention/status: **not met**
- Scope understood: **largely met** (incl. Storage NOT_INCLUDED)
- Storage binary strategy: **defined as required, not implemented**
- Auth strategy: **outlined**
- Secret recovery: **names-only approach defined; inventory incomplete**
- Isolated restore success: **not executed**
- Measured RPO/RTO: **not met**
- Independent review: **pending later gate**

**Backup without restore rehearsal ≠ PASS.**

## 39. Required User Decisions

1. Confirm Dashboard backup pages read-only (see §43 instructions).
2. Accept Free-plan implication: upgrade to Pro (and optional PITR) **or** commit to scheduled encrypted off-site dumps.
3. Choose accepted RPO/RTO.
4. Choose restore target class (local vs temporary paid project).
5. Confirm staging is **not** disposable for destructive restore.
6. Approve separate Storage binary backup approach (S3 sync / rclone / CLI storage copy) without committing objects to Git.
7. Decide whether cost of Pro + optional PITR + temporary clone project is authorized for later gates.

## 40. Proposed Gate Sequence

Adjusted for Free/unproven managed backups:

1. **P5-E.10A** (this) — readiness  
2. **User manual Dashboard confirmation** (blocking)  
3. **P5-E.10B — Backup Capability and Snapshot Evidence** — prove/create authorized backup capability (managed and/or encrypted off-site dump metadata), still no Production restore  
4. **P5-E.10C — Isolated Restore Target Preparation** — local or new disposable project; SMTP/webhook isolation  
5. **P5-E.10D — Controlled Database Restore Rehearsal**  
6. **P5-E.10E — Storage, Auth and Application Recovery Verification**  
7. **P5-E.10F — Independent S-07 Closure Audit**

If Dashboard proves Pro daily backups unexpectedly, 10B focuses on managed backup evidence + Storage gap plan; clone-to-new-project may become available.

## 41. Risks and Stop Conditions

- Free plan without off-site dumps → catastrophic loss risk
- Storage binaries unprotected by DB backup
- Schema not in Git migrations
- Untracked dumps may be unencrypted / untested
- Accidental restore-to-Production or staging wipe
- Email fan-out from Auth on clone
- Enabling paid add-ons without cost review
- Committing dumps/secrets to Git

Stop if: wrong project ref, any write attempted, dump contents appear in evidence, Production restore requested.

## 42. Final Readiness Decision

**`MANUAL_READ_ONLY_BACKUP_METADATA_REQUIRED`**

Supporting findings that will remain after Dashboard confirmation unless remediated:

- Org plan `free` ⇒ managed daily backups not expected
- Storage binaries **NOT_INCLUDED**
- No tracked backup/restore scripts
- No Git migrations for schema replay

## 43. Commands and Queries Executed

Representative:

- `git status/branch/rev-parse/log/remote` preflight
- `git switch -c review/p5-e10a-backup-restore-readiness`
- `git grep` backup/restore terms; `git ls-files` for scripts/migrations/functions
- Supabase MCP: `list_projects`, `get_project(ohkoojpzmptdfyowdgog)`, `get_organization`, `list_edge_functions`, `list_extensions`, `execute_sql` (SELECT aggregates only), `search_docs`
- Official docs fetch: Database Backups / clone-project materials
- Python metadata scan of `backups/` (no content reads)

### Manual read-only Dashboard checklist (user)

Open **only** these pages; **do not click Restore, Enable, Upgrade, or Save**:

1. `https://supabase.com/dashboard/project/ohkoojpzmptdfyowdgog/database/backups/scheduled`  
   Record: any backup rows? last status? timestamps? retention messaging? upgrade prompts?
2. `https://supabase.com/dashboard/project/ohkoojpzmptdfyowdgog/database/backups/pitr`  
   Record: PITR enabled or not (observe only).
3. `https://supabase.com/dashboard/project/ohkoojpzmptdfyowdgog/database/backups/restore-to-new-project`  
   Record: feature available or locked to paid?
4. Organization billing/plan page confirming Free vs Pro.
5. Optionally Storage buckets page for visual confirmation of the three bucket ids only.

Report those observed values back for P5-E.10B.

## 44. Files Changed

- `docs/architecture/p5-backup-restore-evidence-readiness.md` only

## 45. No-Backup / No-Restore / No-Write / No-Push Attestation

- Backup creation: **NONE / NOT AUTHORIZED**
- Dump download/open: **NONE**
- Restore / PITR / project create: **NONE**
- Supabase mutation: **NONE**
- Push / merge / deploy: **NONE**
- Product Activation: **FAIL**
- Public Launch: **NO-GO**
- Untracked env/backup artefacts: **untouched**
