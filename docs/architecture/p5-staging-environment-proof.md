# P5-STAGING.2 Environment Proof & Dry Run

**Gate:** P5-STAGING.2 — Environment Proof & Dry Run  
**Date:** 2026-07-13  
**HEAD at gate start:** `8290920` — Document staging environment requirements  
**Type:** Local validation + docs only — **no SQL**, **no DB mutation**, **no backup/dump**, **no push/deploy/launch**

---

## 1. Scope

| Allowed | Forbidden |
|---------|-----------|
| Read `.env.staging` locally (gitignored) | SQL apply / migration |
| Structural validation of staging identity | DB dump / backup execution |
| Tool availability check (`supabase`, `psql`) | `supabase link`, `db push`, `migration up`, `db dump` |
| Dry-run plan documentation | `psql` login or queries |
| Docs + QA matrix updates | RPC calls, posts, notifications, queue/admin actions |
| | Unlock/re-lock, approve/reject/delete |
| | `service_role` usage |
| | Committing `.env.staging` or secrets |

**Not in scope:** P5-E.5 re-run, testuser creation, production changes.

---

## 2. Repo State

| Item | Value |
|------|-------|
| HEAD at gate start | `8290920` |
| Working tree | Clean except untracked `qa/e2e-baseline-bmeta.snapshot.json` |
| Staged files | None at gate start |
| `.env.staging` | Present locally; **gitignored**; **not staged** |
| `js/supabase-config.js` | Unchanged — still wired to non-staging ref `ohkoojpzmptdfyowdgog` |

---

## 3. Staging Identity

### Staging (confirmed via local `.env.staging`)

| Field | Value |
|-------|-------|
| Project ref | `jzzgoiwfbuwiiyvwgwri` |
| API URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` |
| DB host | `db.jzzgoiwfbuwiiyvwgwri.supabase.co` |
| `SUPABASE_STAGING_CONFIRM_ISOLATED` | `true` |

### Non-staging / legacy project (forbidden for P5-E.5 apply)

| Field | Value |
|-------|-------|
| Project ref | `ohkoojpzmptdfyowdgog` |
| API URL | `https://ohkoojpzmptdfyowdgog.supabase.co` |
| DB host | `db.ohkoojpzmptdfyowdgog.supabase.co` |
| Wired in | `js/supabase-config.js` (localhost/production-like QA) |

### Isolation comparison

| Check | Result |
|-------|--------|
| Staging ref ≠ legacy ref | `[x]` PASS |
| Staging URL ≠ legacy URL | `[x]` PASS |
| Staging DB host ≠ legacy DB host | `[x]` PASS |
| No `ohkoojpzmptdfyowdgog` in any `.env.staging` value | `[x]` PASS |
| `SUPABASE_STAGING_CONFIRM_ISOLATED=true` | `[x]` PASS |

**Environment identity proof: PASS** — staging ref/URL/host are unambiguously distinct from the legacy project.

---

## 4. Secret Handling

| Check | Result |
|-------|--------|
| `.env.staging` exists locally | `[x]` |
| `.env.staging` in `.gitignore` | `[x]` — rule `.env.staging` |
| `.env.staging` staged or committed | `[x]` — neither |
| `SUPABASE_STAGING_ANON_KEY` set | `[x]` — non-empty |
| Anon key prefix | `[x]` — `sb_publishable_` (publishable client key) |
| `sb_secret_` or `service_role` as client key | `[x]` — **not used** |
| `SUPABASE_STAGING_DB_URL` set | `[x]` — non-empty |
| DB URL contains staging ref `jzzgoiwfbuwiiyvwgwri` | `[x]` |
| DB URL contains legacy ref `ohkoojpzmptdfyowdgog` | `[x]` — **not present** |
| Full keys / passwords / DB URL in this doc or commit | `[x]` — **excluded** (masked only) |
| `.env.staging.example` | `[x]` — empty placeholders only; `CONFIRM_ISOLATED=false` |

**Masked evidence (no secrets):**

- Anon key: `sb_publishable_***` (length > 0; not `sb_secret_`)
- DB URL: `postgresql://postgres:***@db.jzzgoiwfbuwiiyvwgwri.supabase.co:5432/postgres` (password redacted; host confirms staging ref)

---

## 5. Tool Availability

Checked without DB access:

| Tool | Status | Implication for P5-E.5 |
|------|--------|------------------------|
| Supabase CLI (`supabase --version`) | **Not installed** — not in PATH | SQL apply via CLI not available until installed |
| `psql` (`psql --version`) | **Not installed** — not in PATH | Direct `psql` apply/dump not available until installed |

**No CLI commands executed** — no `link`, `push`, `migration up`, `db dump`, or `psql` connection.

**Tooling gap:** P5-E.5 re-run still requires an approved execution path: install Supabase CLI and/or `psql`, **or** document an explicit operator-approved Supabase Dashboard SQL workflow with backup first.

---

## 6. P5-E.5 Dry Run Plan (not executed)

### SQL files (apply order when P5-E.5 is approved)

| Order | File | Purpose |
|-------|------|---------|
| 1 | `supabase/admin_dashboard_notifications.sql` | Admin dashboard notifications baseline |
| 2 | `supabase/release_gate_lock.sql` | Release gate lock RLS/RPC |
| 3 | `supabase/phase_a_observations_foundation.sql` | Phase A observations foundation |

**Target:** staging ref `jzzgoiwfbuwiiyvwgwri` only — credentials from local `.env.staging`, never `js/supabase-config.js` production-like ref.

### Negative tests (after SQL apply)

| Test | S+ finding | Expected |
|------|------------|----------|
| Foreign notification insert blocked | S+-02 | Insert as non-owner fails under RLS |
| RPC without ack blocked | S+-04 | RPC denied without tutorial ack |
| RPC while locked blocked | S+-04 | RPC denied when release gate locked |
| Direct posts insert blocked while locked | S+-01 | Insert denied when locked |
| Storage upload blocked while locked | S+-01 | Upload denied when locked |
| Final `release_gate` locked `true` | S+-01 | Gate state verified |
| Runtime staging XSS test | S+-03 | Only if safely possible on staging |

### Prerequisites still required before P5-E.5

| Prerequisite | P5-STAGING.2 status |
|--------------|---------------------|
| Isolated staging identity | `[x]` PASS |
| Backup/dump procedure tested | `[ ]` — tools not installed; not executed |
| Staging test users (`p5_e5_*` or approved) | `[ ]` — not created in this gate |
| Approved SQL execution method | `[ ]` — CLI/psql missing; dashboard path not yet approved |
| User explicit P5-E.5 re-run approval | `[ ]` — not granted for this gate |
| No apply to `ohkoojpzmptdfyowdgog` | `[x]` — enforced |

### Stop conditions (unchanged)

Stop if: legacy ref in credentials, `CONFIRM_ISOLATED` not `true`, no backup path, no test users, secrets would be committed, or SQL would target `ohkoojpzmptdfyowdgog`.

---

## 7. Verdict

| Dimension | Verdict | Notes |
|-----------|---------|-------|
| **Environment Proof** | **PASS** | Staging ref/URL/DB host distinct; isolation confirmed; secrets handled safely |
| **Dry Run Readiness** | **PARTIAL** | Identity ready; CLI/psql absent; backup untested; testusers not created |
| **P5-E.5 Re-run** | **BLOCKED** | Identity proof satisfied; tooling + backup + testusers + explicit user approval still required |
| Product-Activation-Ready | **FAIL** | Unchanged |
| Public-Launch-Ready | **NO-GO** | Unchanged |

### Summary

P5-STAGING.2 proves that a **dedicated, isolated Supabase staging environment is configured locally** and is **not** the legacy `ohkoojpzmptdfyowdgog` project. No SQL was executed and no remote data was changed.

P5-E.5 remains **blocked** until:

1. Backup/dump tooling is available and tested on staging  
2. Staging test users exist or can be safely created  
3. SQL execution method is chosen and approved  
4. User grants **new explicit P5-E.5 re-run approval**

**Next:** Install Supabase CLI and/or `psql` (or approve dashboard SQL workflow) → test backup on staging → create test users → user approval → P5-E.5 re-run.

**Not in scope:** Push, deploy, launch.

---

## Related Documents

| Document | Role |
|----------|------|
| `p5-staging-environment-plan.md` | P5-STAGING.1 plan + re-entry criteria |
| `p5-staged-db-application-report.md` | P5-E.5 original blocked report |
| `p5-splus-remediation-plan.md` | Gate sequence |
| `.env.staging.example` | Committed template (no secrets) |

---

*Document version: P5-STAGING.2. Environment proof only. No SQL. No DB mutation. No secrets committed.*
