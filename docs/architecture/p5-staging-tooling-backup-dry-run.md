# P5-STAGING.3 Tooling & Backup Dry Run

**Gate:** P5-STAGING.3 — Tooling & Backup Dry Run  
**Date:** 2026-07-13  
**HEAD at gate start:** `2347d08` — Document staging environment proof  
**Type:** Read-only connection test + local `pg_dump` — **no SQL apply**, **no DB mutation**, **no push/deploy/launch**

---

## 1. Scope

| Allowed | Forbidden |
|---------|-----------|
| `psql` / `pg_dump` version check | SQL apply / migration |
| Read-only `SELECT` metadata query | INSERT/UPDATE/DELETE/ALTER/DROP/CREATE |
| Full staging `pg_dump` to local gitignored path | RPC calls, posts, notifications, queue/admin |
| `.env.staging` local read (masked in docs) | `service_role` |
| Docs + QA matrix updates | Committing `.env.staging` or dump files |

**Not in scope:** P5-E.5 re-run, testuser creation, negative RLS/RPC tests, app code changes.

---

## 2. Repo State

| Item | Value |
|------|-------|
| HEAD at gate start | `2347d08` |
| Working tree at start | Clean except untracked `qa/e2e-baseline-bmeta.snapshot.json` |
| `.env.staging` | Local; gitignored; not staged |
| `backups/` | Created locally; added to `.gitignore` in this gate |

---

## 3. Tooling

| Tool | Version | Path | In PATH |
|------|---------|------|---------|
| `psql` | PostgreSQL **18.4** | `C:\Program Files\PostgreSQL\18\bin\psql.exe` | **No** |
| `pg_dump` | PostgreSQL **18.4** | `C:\Program Files\PostgreSQL\18\bin\pg_dump.exe` | **No** |

**Note:** Tools are functional via full path. `where.exe psql` / `where.exe pg_dump` return nothing until PATH is updated.

**Tooling verdict:** **PASS** (functional via full path); **PARTIAL** convenience (not in PATH).

---

## 4. Staging Environment Validation

Validated locally from `.env.staging` (values masked in this document):

| Field | Value | Check |
|-------|-------|-------|
| Project ref | `jzzgoiwfbuwiiyvwgwri` | `[x]` |
| API URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` | `[x]` |
| DB host | `db.jzzgoiwfbuwiiyvwgwri.supabase.co` | `[x]` |
| `CONFIRM_ISOLATED` | `true` | `[x]` |
| Legacy ref `ohkoojpzmptdfyowdgog` in any value | **Absent** | `[x]` |
| Anon key | `sb_publishable_***` (set; not `sb_secret_`) | `[x]` |
| DB URL | Set; contains staging ref; no legacy ref | `[x]` — not printed |
| `.env.staging` gitignored | `[x]` |
| `service_role` / `sb_secret` client key | **Not used** | `[x]` |

**Supabase project metadata (MCP read-only):** `boundlore-staging`, region `eu-central-1`, status `ACTIVE_HEALTHY`.

---

## 5. Read-only Connection Test

### Direct host attempt (from `.env.staging` DB URL)

| Attempt | Result |
|---------|--------|
| `db.jzzgoiwfbuwiiyvwgwri.supabase.co` | **FAIL** — DNS resolves **AAAA (IPv6) only**; direct TCP from this environment: network unreachable |

### Pooler session-mode fallback (staging-only, IPv4)

| Parameter | Value |
|-----------|-------|
| Host | `aws-0-eu-central-1.pooler.supabase.com` |
| Port | `5432` (session mode) |
| User | `postgres.jzzgoiwfbuwiiyvwgwri` |
| Target | Staging ref only — **not** `ohkoojpzmptdfyowdgog` |

**Query (read-only):** `select current_database(), current_user, inet_server_addr();`

| Result | Value |
|--------|-------|
| `current_database()` | `postgres` |
| `current_user` | `postgres` |
| `inet_server_addr()` | Staging backend (IPv6; via pooler) |

**Connection test verdict:** **PASS** via approved staging pooler path. Direct-host path **FAIL** on this network (IPv6-only DNS); documented for operator awareness. **No mutation.**

---

## 6. Backup/Dump Dry Run

| Item | Value |
|------|-------|
| Dump created | **Yes** |
| Type | **Full dump** (not schema-only fallback) |
| Method | `pg_dump` via session pooler (same staging credentials) |
| Local path | `backups/staging/p5-staging3-preapply-20260713-183547.sql` |
| File size | **183,946 bytes** (~180 KiB) |
| Production / legacy ref | **Not used** |
| Gitignored | `[x]` — `backups/` in `.gitignore` |
| Staged / committed | `[x]` — neither |
| Contents in docs | **Not included** (may contain auth schema metadata) |

**Backup verdict:** **PASS**

**Operator note for P5-E.5:** Prefer session pooler (`aws-0-eu-central-1.pooler.supabase.com:5432`, user `postgres.jzzgoiwfbuwiiyvwgwri`) when direct `db.<ref>.supabase.co` is IPv6-only and unreachable. Update local runbook; `.env.staging` direct URL unchanged.

---

## 7. Optional Fixtures

| Check | Result |
|-------|--------|
| Local server | `http://localhost:8080` — already running; not restarted |
| HTTP smoke (5 fixture pages) | **200** for all five URLs |
| Fixture pass counts (browser JS) | **NOT RUN** — no browser execution; no writes/RPC |

Fixture pages reached:

- `qa/p5-notification-security-fixtures.html`
- `qa/p5-observation-rpc-security-fixtures.html`
- `qa/p5-sanitization-security-fixtures.html`
- `qa/p5-release-lock-db-security-fixtures.html`
- `qa/p5-release-lock-ui-fixtures.html`

---

## 8. Verdict

| Dimension | Verdict | Notes |
|-----------|---------|-------|
| **Tooling Readiness** | **PASS** | `psql`/`pg_dump` 18.4 via full path; PATH not set (minor) |
| **Backup Readiness** | **PASS** | Full pre-apply dump created and gitignored |
| **P5-E.5 Re-run Readiness** | **PARTIAL** | Tooling + backup ready; testusers + explicit user approval still required |
| **P5-STAGING.3 overall** | **PASS** | With documented direct-host IPv6 caveat |
| Product-Activation-Ready | **FAIL** | Unchanged |
| Public-Launch-Ready | **NO-GO** | Unchanged |

### P5-E.5 status

**Not unblocked for execution.** Prerequisites now satisfied:

- `[x]` Isolated staging identity (P5-STAGING.2)
- `[x]` `psql` / `pg_dump` available
- `[x]` Backup/dump procedure tested on staging

Still required:

- `[ ]` Staging test users (`p5_e5_*` or approved creation path)
- `[ ]` User **explicit P5-E.5 re-run approval**
- `[ ]` SQL apply runbook (pooler vs direct host documented)

**Next:** Create staging test users → obtain explicit P5-E.5 approval → P5-E.5 re-run on staging only.

**Not in scope:** Push, deploy, launch.

---

## Related Documents

| Document | Role |
|----------|------|
| `p5-staging-environment-plan.md` | Staging setup + re-entry criteria |
| `p5-staging-environment-proof.md` | P5-STAGING.2 identity proof |
| `p5-staged-db-application-report.md` | P5-E.5 blocked report |

---

*Document version: P5-STAGING.3. Read-only connection + local dump only. No SQL apply. No secrets committed.*
