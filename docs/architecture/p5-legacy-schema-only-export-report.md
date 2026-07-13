# P5-STAGING.5B Legacy Schema-Only Export Report

**Gate:** P5-STAGING.5B — Legacy Schema-Only Export  
**Date:** 2026-07-13  
**HEAD at gate start:** `1f0e53e` — Document legacy schema-only export plan  
**User approval:** **YES** — legacy read-only, schema-only, no data, no staging apply  
**Verdict:** **BLOCKED** — `.env.legacy` not present locally  
**Export performed:** **NO**  
**pg_dump executed:** **NO**

---

## 1. Scope / Approval

| Item | Status |
|------|--------|
| User approval for P5-STAGING.5B | `[x]` |
| Legacy ref `ohkoojpzmptdfyowdgog` only | `[x]` intended |
| Staging `jzzgoiwfbuwiiyvwgwri` excluded | `[x]` enforced at validation |
| `--schema-only` + `--schema=public` | Planned — **not executed** |
| No data / no auth export | Required — N/A (no dump) |
| No SQL apply / no staging mutation | `[x]` |
| Push / Deploy / Launch | `[x]` — none |

**Hard stop at Step 3:** Local `.env.legacy` file not found. No legacy DB URL available for read-only export.

---

## 2. Environment

| Field | Value |
|-------|-------|
| Legacy project ref (intended) | `ohkoojpzmptdfyowdgog` |
| Staging ref (forbidden) | `jzzgoiwfbuwiiyvwgwri` — **not used** |
| `.env.legacy` local | **NOT FOUND** |
| `.env.legacy.example` | Created in this gate (empty template) |
| `.env.legacy` gitignored | `[x]` — added to `.gitignore` |
| Secrets in this report | **None** |

### Operator action required

Create locally (never commit):

```
C:\Users\Julius\Documents\GitHub\boundlore-wiki\.env.legacy
```

From template `.env.legacy.example`. Minimum:

- `SUPABASE_LEGACY_DB_URL=` — must target legacy `ohkoojpzmptdfyowdgog` or its session pooler; must **not** contain `jzzgoiwfbuwiiyvwgwri`
- `SUPABASE_LEGACY_CONFIRM_IS_LEGACY=true`

Then re-run **P5-STAGING.5B** with explicit approval.

---

## 3. Export Command Properties (planned, NOT RUN)

| Property | Planned value |
|----------|---------------|
| Tool | `pg_dump` PostgreSQL 18.4 |
| `--schema-only` | **Required** |
| `--schema=public` | **Required** |
| `--no-owner` | Yes |
| `--no-privileges` | Yes |
| Full / data dump | **Forbidden** |
| Output dir | `backups/legacy-schema-only/` (gitignored) |

---

## 4. Output

| Item | Value |
|------|-------|
| Dump created | **NO** |
| Path | N/A |
| File size | N/A |
| Gitignored | `backups/` — `[x]` in `.gitignore` |
| Staged | `[x]` — nothing from `backups/` |

---

## 5. No-Data Verification

| Check | Result |
|-------|--------|
| `INSERT INTO` | **N/A** — no dump |
| `COPY public.` | **N/A** |
| `COPY auth.` | **N/A** |
| `auth.users` data | **N/A** |
| QA content strings | **N/A** |
| No-data verdict | **N/A** |

---

## 6. Required Object Signal

| Object | `CREATE TABLE` in dump |
|--------|------------------------|
| `public.posts` | **N/A** |
| `public.profiles` | **N/A** |
| `public.post_reactions` | **N/A** |
| `public.notifications` | **N/A** |
| `public.user_submission_acks` | **N/A** |
| `public.wiki_entities` | **N/A** |

---

## 7. Verdict

| Dimension | Verdict |
|-----------|---------|
| **Legacy Schema-Only Export (5B)** | **BLOCKED** |
| **Ready for P5-STAGING.5C** | **NO** |
| **P5-E.5 Re-run** | **BLOCKED** (unchanged) |
| Product-Activation-Ready | **FAIL** |
| Public-Launch-Ready | **NO-GO** |

### Summary

P5-STAGING.5B stopped before `pg_dump` because `.env.legacy` is missing. No DB access attempted. No legacy or staging mutation. Added `.env.legacy` to `.gitignore` and `.env.legacy.example` template for operator setup.

**Next:** Operator creates `.env.legacy` locally → re-run P5-STAGING.5B → on PASS proceed to **P5-STAGING.5C** Curated Core Schema Extraction.

**Not in scope:** Push, deploy, launch, SQL apply, dump commit.

---

## Related Documents

| Document | Role |
|----------|------|
| `p5-legacy-schema-only-export-plan.md` | P5-STAGING.5A plan |
| `p5-staging-base-schema-provisioning-plan.md` | Phase 0 context |

---

*Document version: P5-STAGING.5B BLOCKED. No export. No DB access. No secrets.*
