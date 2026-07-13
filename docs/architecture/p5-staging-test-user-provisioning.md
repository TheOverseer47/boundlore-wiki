# P5-STAGING.4 Staging Test User Provisioning

**Gate:** P5-STAGING.4 — Staging Test User Provisioning Documentation  
**Date:** 2026-07-13  
**HEAD at gate start:** `dcff65d` — Document staging tooling backup dry run  
**Type:** Documentation only — **no SQL**, **no DB migration**, **no further user creation**, **no push/deploy/launch**

---

## 1. Scope

| In scope | Out of scope |
|----------|--------------|
| Document manually created staging test users | SQL apply / migration |
| Record intended P5-E.5 usage per S+ finding | Additional user creation |
| Update staging gate docs | Test logins, RPC calls, data mutation |
| Confirm no secrets in repo | Production (`ohkoojpzmptdfyowdgog`) |
| | Push, deploy, launch |

**This gate documents operator work already completed in the Supabase Dashboard.** No agent or repo action created or modified users in this gate.

---

## 2. Environment

| Field | Value |
|-------|-------|
| Staging project name | `boundlore-staging` |
| Staging project ref | `jzzgoiwfbuwiiyvwgwri` |
| Staging API URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` |
| Staging DB host | `db.jzzgoiwfbuwiiyvwgwri.supabase.co` |
| Legacy / non-staging ref | `ohkoojpzmptdfyowdgog` — **forbidden for P5-E.5** |

**Explicit statement:** Test users were created **only** in project `boundlore-staging` (`jzzgoiwfbuwiiyvwgwri`). They were **not** created in the legacy project or in production.

---

## 3. Test Users

| User | Email | Purpose | Expected role | Created in staging | Auto-confirmed | Password stored outside repo |
|------|-------|---------|---------------|------------------|----------------|------------------------------|
| **User A** | `p5_e5_user_a@example.com` | Primary authenticated subject for negative RLS/RPC and lock tests | Normal authenticated user (anon + RLS, not admin/service) | `[x]` | `[x]` | `[x]` — operator vault; **not in repo** |
| **User B** | `p5_e5_user_b@example.com` | Second authenticated subject for cross-user scenarios (e.g. foreign notification target) | Normal authenticated user | `[x]` | `[x]` | `[x]` — operator vault; **not in repo** |

### Secret handling

| Rule | Status |
|------|--------|
| No passwords in this document or repo | `[x]` |
| No auth tokens documented | `[x]` |
| No API/anon/service keys documented | `[x]` |
| No `service_role` used for provisioning | `[x]` |
| No DB URL in documentation | `[x]` |

**Provisioning method:** Supabase Dashboard → Authentication → Users (manual operator action prior to this gate).

---

## 4. Intended Later Use in P5-E.5

When P5-E.5 re-run is **explicitly approved**, these users support staged negative tests only on `jzzgoiwfbuwiiyvwgwri`:

| Finding | Planned use | Users |
|---------|-------------|-------|
| **S+-02** | User A attempts forbidden notification insert targeting User B | A → B (cross-user) |
| **S+-04** | RPC without tutorial ack blocked | A or B (unacked state) |
| **S+-04** | RPC while release gate locked blocked | A or B (acked but locked) |
| **S+-01** | Direct posts insert blocked while `release_gate` locked | A (normal user write) |
| **S+-01** | Storage upload blocked while locked | A (if bucket/policy in scope) |
| **S+-03** | Runtime staging XSS test | Only if safely possible on staging |

### Post-test requirements

- Cleanup of any test artifacts created during P5-E.5 (notifications, posts, lock state resets per runbook).
- **No production** — all actions scoped to staging credentials and staging ref only.
- Stop immediately if any credential or URL points to `ohkoojpzmptdfyowdgog`.

---

## 5. Remaining Before P5-E.5 Re-run

| Prerequisite | Status |
|--------------|--------|
| Isolated staging identity (P5-STAGING.2) | `[x]` PASS |
| Tooling + backup dry run (P5-STAGING.3) | `[x]` PASS |
| Staging test users (P5-STAGING.4) | `[x]` PASS |
| Pre-apply dump available | `[x]` — `backups/staging/p5-staging3-preapply-*.sql` (gitignored) |
| SQL apply runbook (pooler path) | `[x]` — documented in P5-STAGING.3 |
| **Explicit user approval for P5-E.5 re-run** | `[ ]` **Required** |
| Final pre-apply check (no legacy ref in target) | `[ ]` — operator checklist at P5-E.5 start |

**Hard stop:** If any value, URL, or project ref resolves to `ohkoojpzmptdfyowdgog`, **do not proceed**.

---

## 6. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Test User Provisioning** | **PASS** |
| **P5-E.5 Re-run Readiness** | **BLOCKED** — base schema missing (re-run 2026-07-13) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

**P5-E.5 Re-run (2026-07-13) blocked** at schema check despite user approval. See re-run section in `p5-staged-db-application-report.md`. **Next:** P5-STAGING.5 base schema → P5-E.5 re-attempt.

**Not in scope:** Push, deploy, launch.

---

## 7. P5-E.5 Re-run Follow-up (BLOCKED)

**Gate:** P5-E.5 Re-run — **BLOCKED** at `release_gate_lock.sql`. Test users in `auth.users` only; **no `profiles` rows** for A/B.

**Report:** `docs/architecture/p5-staged-db-application-rerun-report.md`

**Next:** P5-E.5 Re-run with explicit approval. No push/deploy/launch.

---

## 9. P5-E.5B Follow-up (PASS — testuser profiles)

**Gate:** P5-E.5B — two staging `profiles` rows for A/B. **PASS**.

| Item | Status |
|------|--------|
| User A profile | `[x]` `p5_e5_user_a`, role `user` |
| User B profile | `[x]` `p5_e5_user_b`, role `user` |
| Admin role | `[x]` — none |
| P5-E.5 Re-run | **READY** — explicit approval |

**Report:** `docs/architecture/p5-staging-testuser-profiles-report.md`

---

## 8. P5-STAGING.5 Follow-up

Base schema provisioning plan created. Core blocker: no `posts`/`profiles` CREATE in repo. No SQL.

---

## Related Documents
|----------|------|
| `p5-staging-environment-plan.md` | Staging setup + re-entry criteria |
| `p5-staging-environment-proof.md` | P5-STAGING.2 identity proof |
| `p5-staging-tooling-backup-dry-run.md` | P5-STAGING.3 tooling & backup |
| `p5-staged-db-application-rerun-report.md` | P5-E.5 Re-run blocked report |
| `p5-staging-testuser-profiles-report.md` | P5-E.5B profiles report (PASS) |

---

*Document version: P5-STAGING.4 + P5-E.5B PASS. No secrets.*
