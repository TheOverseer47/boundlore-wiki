# P5-STAGING.1 Dedicated Supabase Staging Environment Plan

**Gate:** P5-STAGING.1 — Dedicated Supabase Staging Provisioning Gate  
**Date:** 2026-07-13  
**HEAD at gate start:** `7ba6ab1` — Document staged DB release gate test blockers  
**Type:** Docs + config example only — **no SQL**, **no project creation**, **no data changes**

---

## 1. Purpose

P5-E.5 (Staged DB Application & Negative RLS/RPC Tests) was **correctly blocked** because an **isolated staging environment could not be proven**. See `docs/architecture/p5-staged-db-application-report.md`.

| Principle | Status |
|-----------|--------|
| Why blocked | Only one Supabase project; localhost uses same remote URL as committed config |
| Why staging is mandatory | P5 SQL apply + negative RLS/RPC/storage tests must not touch production-linked or sole live QA database |
| No production apply | `ohkoojpzmptdfyowdgog` must **not** receive P5-E.5 SQL |
| This gate | Prepare documentation and local config **template** only |

---

## 2. Current Blocker

### Current Supabase wiring (read-only audit)

| Item | Value | Notes |
|------|-------|-------|
| Project ref | `ohkoojpzmptdfyowdgog` | Only project in linked Supabase account (P5-E.5 audit) |
| API URL | `https://ohkoojpzmptdfyowdgog.supabase.co` | Hardcoded in `js/supabase-config.js` |
| DB host | `db.ohkoojpzmptdfyowdgog.supabase.co` | Derived from project ref |
| Project name | TheOverseer47's Project | Not named staging |
| Isolated staging proven | **NO** | Same backend used for localhost QA wiki |
| P5-E.5 apply allowed | **NO** | Hard stop |

### Infrastructure gaps

| Gap | Status |
|-----|--------|
| Only one Supabase project | `[x]` confirmed |
| Localhost uses same remote URL | `[x]` — `js/supabase-config.js` |
| `.env.staging` | **Not present** |
| `.env.staging.example` | Created in P5-STAGING.1 |
| `supabase/config.toml` | **Not present** |
| Supabase CLI | **Not installed** (P5-E.5 audit) |
| Dev branches | **Not verified** — `list_branches` failed |
| Staging documentation with separate ref | **Missing** until this gate |

### Forbidden target for P5-E.5

```
Project ref:  ohkoojpzmptdfyowdgog
API URL:      https://ohkoojpzmptdfyowdgog.supabase.co
DB host:      db.ohkoojpzmptdfyowdgog.supabase.co
```

**Do not apply P5 SQL to this project.**

---

## 3. Required Staging Properties

A dedicated staging environment must satisfy **all** of the following before P5-E.5 re-entry:

| # | Property | Requirement |
|---|----------|-------------|
| 1 | Own Supabase project ref | Different from `ohkoojpzmptdfyowdgog` |
| 2 | Own API URL | Different hostname |
| 3 | Own DB host | Different `db.<ref>.supabase.co` |
| 4 | No production data confusion | Documented naming; operator confirms isolation |
| 5 | Separate anon/publishable key | Staging-only; never committed to repo |
| 6 | `service_role` never in client | Enforced in config rules |
| 7 | Staging clearly named | e.g. `boundlore-staging` in Supabase dashboard |
| 8 | Disposable / restorable | Staging may be reset; backup before P5-E.5 |
| 9 | Backup/dump possible before apply | CLI or approved dump path tested in P5-STAGING.2 |

---

## 4. Manual Supabase Setup Checklist

**Operator performs manually** — not automated in P5-STAGING.1.

- [ ] Create new Supabase project (suggested name: `boundlore-staging`)
- [ ] Note **project ref** (must NOT be `ohkoojpzmptdfyowdgog`)
- [ ] Note **API URL** (must NOT be `https://ohkoojpzmptdfyowdgog.supabase.co`)
- [ ] Note **anon / publishable key** (store locally only)
- [ ] Note **DB host** (`db.<staging-ref>.supabase.co`)
- [ ] Store **DB password** securely **outside repo** (password manager / vault)
- [ ] Confirm project ref is **NOT** `ohkoojpzmptdfyowdgog`
- [ ] Confirm URL is **NOT** `https://ohkoojpzmptdfyowdgog.supabase.co`
- [ ] Confirm **no production data** is used or cloned without explicit isolated-staging approval
- [ ] Confirm **backup/dump** is possible on staging before P5-E.5
- [ ] Confirm **Supabase CLI** or equivalent dump procedure is available (install if missing)
- [ ] Copy `.env.staging.example` → `.env.staging` locally and fill values (never commit)
- [ ] Set `SUPABASE_STAGING_CONFIRM_ISOLATED=true` only after all checks above pass

---

## 5. Staging Config Rules

| Rule | Detail |
|------|--------|
| No secrets in git | `.env.staging` is gitignored; only `.env.staging.example` committed |
| Local-only staging env | `.env.staging` lives on operator machine |
| Do not blindly repoint `js/supabase-config.js` | Production-like local dev may keep current URL until explicit staging test gate |
| Clear separation | **Local production-like** (current ref) vs **Staging test** (new ref) |
| No `service_role` in client | Never in HTML/JS/wiki; staging tests use anon + RLS as end users |
| No passwords in example file | `.env.staging.example` has empty placeholders only |
| Staging apply scripts | Future gates must read from `.env.staging`, never from `supabase-config.js` |

### Config layering (proposed, not implemented in P5-STAGING.1)

```
js/supabase-config.js          → current localhost / production-like (unchanged in this gate)
.env.staging (local, gitignored) → P5-E.5 / P5-STAGING.2 tooling only
.env.staging.example           → committed template
```

---

## 6. Proposed `.env.staging.example`

Committed template at repo root. **No real values.**

```env
SUPABASE_STAGING_PROJECT_REF=
SUPABASE_STAGING_URL=
SUPABASE_STAGING_ANON_KEY=
SUPABASE_STAGING_DB_HOST=
SUPABASE_STAGING_DB_URL=
SUPABASE_STAGING_CONFIRM_ISOLATED=false
```

| Field | Purpose |
|-------|---------|
| `SUPABASE_STAGING_PROJECT_REF` | Must differ from `ohkoojpzmptdfyowdgog` |
| `SUPABASE_STAGING_URL` | `https://<ref>.supabase.co` |
| `SUPABASE_STAGING_ANON_KEY` | Publishable/anon key only — **not** service_role |
| `SUPABASE_STAGING_DB_HOST` | `db.<ref>.supabase.co` |
| `SUPABASE_STAGING_DB_URL` | Postgres connection string — **local only**, never commit |
| `SUPABASE_STAGING_CONFIRM_ISOLATED` | Operator sets `true` only after manual checklist complete |

---

## 7. P5-E.5 Re-entry Criteria

P5-E.5 may **only** restart when **all** conditions are met:

| # | Criterion |
|---|-----------|
| 1 | Staging project ref known and **≠** `ohkoojpzmptdfyowdgog` |
| 2 | Staging URL known and **≠** `https://ohkoojpzmptdfyowdgog.supabase.co` |
| 3 | Staging DB host known and **≠** `db.ohkoojpzmptdfyowdgog.supabase.co` |
| 4 | Backup/dump procedure tested on staging (P5-STAGING.2) |
| 5 | No production data touched during staging setup |
| 6 | Staging test users available or safely creatable (`p5_e5_*` prefix) |
| 7 | SQL apply explicitly scoped to staging credentials only |
| 8 | User grants **new explicit P5-E.5 re-run approval** |
| 9 | P5-STAGING.2 Environment Proof & Dry Run **PASS** |

Until then: **P5-E.5 remains BLOCKED.**

---

## 8. Stop Conditions

Stop immediately (do not proceed to SQL apply) if:

| Condition | Action |
|-----------|--------|
| Project ref unclear | STOP — document in P5-STAGING.2 report |
| Only one Supabase project remains | STOP — cannot prove isolation |
| URL matches production/current ref | STOP |
| No dump/backup path | STOP |
| No staging test users and cannot create safely | STOP |
| Secrets would be committed | STOP — fix `.gitignore` / unstage |
| SQL apply would target `ohkoojpzmptdfyowdgog` | STOP — hard forbidden |
| `SUPABASE_STAGING_CONFIRM_ISOLATED` not `true` | STOP |

---

## 9. Next Steps

| Step | Gate | Owner |
|------|------|-------|
| 1 | **P5-STAGING.1** (this gate) | Plan + `.env.staging.example` — **complete** |
| 2 | User creates Supabase staging project manually | Operator |
| 3 | User fills `.env.staging` locally | Operator |
| 4 | **P5-STAGING.2** Environment Proof & Dry Run | **PASS** (identity) — see proof report |
| 5 | **P5-STAGING.3** Tooling & Backup Dry Run | **PASS** — see tooling/backup report |
| 6 | **P5-STAGING.4** Test user provisioning | **PASS** — see test user report |
| 7 | **P5-E.5 re-run** | **BLOCKED** — base schema missing (2026-07-13) |
| 8 | **P5-STAGING.5** | Base schema provisioning plan | **PARTIAL** |
| 9 | **P5-STAGING.5A** | Legacy schema-only export plan | **PASS** — Path A chosen |
| 10 | **P5-STAGING.5B** | Legacy export execution | Awaiting explicit approval |
| 11 | **P5-STAGING.6** | Base schema apply to staging | After 5B + 5C |
| 12 | **P5-E.5 re-run** | **BLOCKED** |

**Not in scope:** Push, deploy, launch, production clone, automatic project creation without explicit safe approval.

---

## Related Documents

| Document | Role |
|----------|------|
| `p5-legacy-schema-only-export-plan.md` | P5-STAGING.5A legacy export plan |
| `p5-staging-base-schema-provisioning-plan.md` | P5-STAGING.5 base schema plan |
| `p5-staging-test-user-provisioning.md` | P5-STAGING.4 test user provisioning |
| `p5-staging-tooling-backup-dry-run.md` | P5-STAGING.3 tooling & backup dry run |
| `p5-staging-environment-proof.md` | P5-STAGING.2 environment proof report |
| `p5-staged-db-application-report.md` | P5-E.5 blocked report |
| `p5-splus-remediation-plan.md` | P5 gate sequence |
| `p5-release-lock-plan.md` | S+-01 staging apply notes |
| `.env.staging.example` | Committed template |

---

---

## 10. P5-STAGING.2 Follow-up

**Gate:** P5-STAGING.2 — Environment Proof & Dry Run (2026-07-13, HEAD `8290920`)

| Result | Status |
|--------|--------|
| Staging ref `jzzgoiwfbuwiiyvwgwri` confirmed | `[x]` |
| Legacy ref `ohkoojpzmptdfyowdgog` not in `.env.staging` | `[x]` |
| `SUPABASE_STAGING_CONFIRM_ISOLATED=true` | `[x]` |
| `.env.staging` gitignored; not committed | `[x]` |
| Supabase CLI / psql | **psql/pg_dump 18.4** (full path; not in PATH) — P5-STAGING.3 |
| Backup/dump tested | `[x]` — P5-STAGING.3 full dump |
| P5-E.5 re-run | **PARTIAL** — testusers + explicit approval |

**Authoritative proof:** `docs/architecture/p5-staging-environment-proof.md`

---

## 11. P5-STAGING.3 Follow-up

**Gate:** P5-STAGING.3 — Tooling & Backup Dry Run (HEAD `2347d08`)

| Result | Status |
|--------|--------|
| Read-only connection (pooler) | `[x]` PASS |
| Full pre-apply dump | `[x]` — gitignored under `backups/staging/` |
| `backups/` in `.gitignore` | `[x]` |
| P5-E.5 re-run | **READY FOR USER APPROVAL** — P5-STAGING.4 |

**Authoritative report:** `docs/architecture/p5-staging-tooling-backup-dry-run.md`

---

## 12. P5-STAGING.4 Follow-up

**Gate:** P5-STAGING.4 — Staging Test User Provisioning (HEAD `dcff65d`)

| Result | Status |
|--------|--------|
| User A `p5_e5_user_a@example.com` | `[x]` — boundlore-staging only |
| User B `p5_e5_user_b@example.com` | `[x]` — boundlore-staging only |
| Passwords/keys in repo | `[x]` — none |
| `service_role` for provisioning | `[x]` — not used |
| P5-E.5 re-run | **BLOCKED** — base schema |

**Authoritative report:** `docs/architecture/p5-staging-test-user-provisioning.md`

---

## 13. P5-E.5 Re-run Follow-up

**Gate:** P5-E.5 Re-run (HEAD `b3c64e7`) — user approval YES; **BLOCKED** at schema check. No P5 SQL applied.

**Next:** P5-STAGING.5B with explicit approval. No push/deploy/launch.

---

## 15. P5-STAGING.5A Follow-up

**Gate:** P5-STAGING.5A — Legacy Schema-Only Export Plan (HEAD `e6ca97b`). User chose Path A. No export, no DB access.

**Report:** `docs/architecture/p5-legacy-schema-only-export-plan.md`

---

## 16. P5-E.5 Re-run Follow-up (BLOCKED)

**Gate:** P5-E.5 Re-run after 6 Re-run 3 PASS — **BLOCKED** at `release_gate_lock.sql` apply (`bl_is_admin_actor` ordering).

**Report:** `docs/architecture/p5-staged-db-application-rerun-report.md`

---

*Document version: P5-STAGING.1–6 Re-run 3 + P5-E.5 Re-run BLOCKED. No secrets.*
