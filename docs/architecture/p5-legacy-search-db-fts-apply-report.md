# P5-E.9E.5F — Legacy Search DB/FTS Apply Report

**Gate:** P5-E.9E.5F — Legacy Search DB/FTS Apply. **PASS** (EMPTY_INDEX_UNTIL_5G).

**HEAD vor Gate:** `5ca15d5` — Harden legacy profile RLS

**Arbeitsmodus:** Legacy-Write nur für Search DB/FTS DDL auf `ohkoojpzmptdfyowdgog`. Kein Rebuild, kein Content Write, kein Runtime-Switch, kein Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.5F** | **PASS** |
| **Legacy Search DB/FTS** | **APPLIED_LEGACY_PASS** |
| **Legacy Search RPC** | **PRESENT** — `bl_search_public_content(text, jsonb)` |
| **Legacy Search Index State** | **EMPTY** (0 rows — kein Rebuild in 5F) |
| **Legacy Profile/RLS Security (5E)** | **INTACT** |
| **S-06 Final Status** | **OPEN_BLOCKING** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Nach frischem 5F-Prewrite-Backup und intakter 5E-Härtung wurde das Staging-bewährte Search DB/FTS-MVP auf Legacy angewendet — **ohne** `bl_rebuild_search_documents()` auszuführen, **ohne** Content-Zeilen zu ändern, **ohne** Runtime-Switch. RPC-Smoke `monster` → **0 Treffer**, kein Fehler.

---

## HEAD / Working Tree

| Prüfung | Ergebnis |
|---------|----------|
| HEAD vor Gate | `5ca15d5` |
| Runtime Config | Unverändert — Staging `jzzgoiwfbuwiiyvwgwri` |
| `.env` geändert | **Nein** |
| Repo-Migration-Datei | **Nein** (Supabase MCP Migration only) |
| Backup committed | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.5F frei — Legacy Search DB/FTS Apply auf `ohkoojpzmptdfyowdgog` nach Backup und Security-Härtung, nur Legacy-Write für Search DDL/FTS, kein Content Cleanup, kein Rebuild, kein Staging-Write, kein Runtime-Switch, kein Push, kein Deploy, kein Launch.“

---

## Target Verification

| Feld | Wert |
|------|------|
| **Target Project Ref** | `ohkoojpzmptdfyowdgog` — **verifiziert** |
| **Projektname** | TheOverseer47's Project |
| **Staging Ref** | **Nicht verwendet** (Write) |
| **Production / boundlore.com** | **Nicht verwendet** |
| **Connection Strings / Keys in diesem Dokument** | **Nein** |

---

## Backup Baseline (5D)

| Check | Ergebnis |
|-------|----------|
| Pfad | `backups/legacy/p5-e9e5d-legacy-prewrite-20260714-152031.dump` |
| SHA256 | `3B5A5E6B59463505A42E812596BED4B41603CC0F189A18D99A5B0E1B0C852F7B` |
| Gitignored | **Ja** |

---

## Fresh 5F Backup Evidence

| Item | Wert |
|------|------|
| Methode | `pg_dump` Custom Format via Session-Pooler |
| Pfad | `backups/legacy/p5-e9e5f-search-ddl-prewrite-20260714-154126.dump` |
| Größe | **435,449 bytes** |
| SHA256 | `70ACDE6722B89D8F5F05C6D3B430F3DC309CA8F86EEDE865B2A5202C6FD2EE13` |
| TOC Entries | **705** |
| Gitignored | **Ja** |
| Restore | **Nein** |
| Committed | **Nein** |

---

## Before Findings

| Check | Vor Apply |
|-------|-----------|
| `search_documents` | **Absent** |
| `bl_search_public_content` | **Absent** |
| `bl_rebuild_search_documents` | **Absent** |
| Search-Indexes | **Absent** |
| `pg_trgm` | **Present** |
| `profiles_select_all` | **Absent** (5E) |
| `anon SELECT profiles` | **false** (5E) |
| Posts SELECT mit `profiles`-Subquery | **0** (5E) |
| Published posts | **9** |

---

## Applied Search DDL

**Apply-Block:** `p5_e9e5f_legacy_search_db_fts_apply` (2 Migrationen)

| Migration | Scope |
|-----------|-------|
| `p5_e9e5f_legacy_search_documents_schema` | Tabelle + Indexe |
| `p5_e9e5f_legacy_search_functions_rpc` | Helpers, RPC, RLS, Grants |

### Angewendete Objekte

- `public.search_documents` + GIN/trigram Indexe
- `public.bl_normalize_search_query`
- `public.bl_search_row_is_public` (Contribution/exclude_public/QA-Slug-Filter)
- `public.bl_strip_html_to_text`
- `public.bl_build_search_vector`
- `public.bl_expand_search_terms`
- `public.bl_search_public_content(text, jsonb)` — SECURITY DEFINER, hardened WHERE
- `public.bl_rebuild_search_documents()` — SECURITY DEFINER, **nicht ausgeführt**
- RLS `search_documents_public_read`
- `REVOKE ALL` auf `search_documents` für anon/authenticated
- `GRANT EXECUTE` RPC → anon/authenticated
- `GRANT EXECUTE` rebuild → service_role only

**Parität:** Staging MVP (P5-E.9E.4A) mit 3B-Fixes (#2–#5).

**Nicht angewendet:** Rebuild, Content-Write, Profile-Grant-Öffnung, Release Gate, Storage, Runtime-Switch.

---

## After Verification

| Check | Ergebnis |
|-------|----------|
| `search_documents` existiert | **Ja** |
| RLS aktiv | **Ja** |
| Indexe | **5** (pkey + 4 search indexes) |
| `bl_search_public_content(text, jsonb)` | **Ja**, SECURITY DEFINER |
| `bl_rebuild_search_documents()` | **Ja**, SECURITY DEFINER |
| `search_documents` Row Count | **0** |
| `anon SELECT search_documents` | **false** |
| `anon EXECUTE bl_search_public_content` | **true** |
| `anon EXECUTE bl_rebuild_search_documents` | **false** |
| `profiles_select_all` | **0** |
| `anon SELECT profiles` | **false** |
| Posts SELECT `profiles`-Subquery | **0** |
| Published posts | **9** (unverändert) |
| Datenzeilen geändert | **Nein** |

---

## Empty-Index RPC Smoke

| Query | Ergebnis |
|-------|----------|
| `bl_search_public_content('monster', '{}')` | **0 Treffer** |
| RPC-Fehler | **Keiner** |
| `search_text` / `search_vector` im Output | **Nein** (whitelisted Felder only) |
| BLMETA / PII | **Nein** |

---

## No Rebuild Confirmation

| Check | Ergebnis |
|-------|----------|
| `bl_rebuild_search_documents()` ausgeführt | **Nein** |
| INSERT in `search_documents` | **Nein** |
| DELETE in Content-Tabellen | **Nein** |

---

## No Content Write Confirmation

| Check | Ergebnis |
|-------|----------|
| INSERT/UPDATE/DELETE auf `posts` | **Nein** |
| INSERT/UPDATE/DELETE auf `profiles` | **Nein** |
| Content Cleanup | **Nein** |

---

## No Runtime Switch Confirmation

| Check | Ergebnis |
|-------|----------|
| `js/supabase-config.js` | **Unverändert** — Staging aktiv |
| Push / Deploy / Launch | **Nein** |

---

## Grants / RLS Decision

| Entscheidung | Begründung |
|--------------|------------|
| Kein anon/auth SELECT auf `search_documents` | Verhindert `search_text`-Leak via PostgREST |
| Public Search nur via RPC | Staging-bewährt (DEFINER + hardened WHERE) |
| Rebuild nur service_role | Populate in 5G separat freigabepflichtig |
| Profile-Grants unverändert | 5E-Härtung bleibt intakt |

---

## Residual Risks

| Risiko | Status | Nächster Gate |
|--------|--------|---------------|
| Leerer Search-Index | **Geschlossen (5G)** — 6 rows | **P5-E.9E.5H** Verification |
| QA/Contribution-Content auf Legacy | **Geschlossen (5G)** — aus Index ausgeschlossen | 5H Verification |
| Recall nicht verifiziert | **Offen** | 5H Verification |
| S-06 Final / Launch | **Offen** | 5H–5J |

---

## Required Future Gates

| Gate | Freigabe |
|------|----------|
| ~~**P5-E.9E.5G**~~ | Content Cleanup + Rebuild — **PASS** |
| **P5-E.9E.5H–5J** | Verification / Dry Run / S-06 Final |
| **S-05, Launch** | Separat |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.5F | **PASS** |
| Legacy Search DB/FTS | **APPLIED_LEGACY_PASS** |
| Legacy Search RPC | **PRESENT** |
| Legacy Search Index State | **POPULATED** (6 rows via 5G) |
| Legacy Profile/RLS Security | **INTACT** |
| P5-E.9E.5G | **PASS** |
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** P5-E.9E.5H — Legacy RPC-first Search Verification

---

## P5-E.9E.5G Follow-up (PASS — Legacy Content Filter + Rebuild)

**Gate:** P5-E.9E.5G. **PASS**.

| Item | Ergebnis |
|------|----------|
| HEAD vor Gate | `a8b90fc` |
| 5G Backup | 451,890 bytes; SHA256 `CD0F19681B35DEE1ECD325DD9F7EA882A48306540D8B70F44877F06BA695BA42`; TOC **715** |
| Filter DDL geändert | **Nein** (bestehender Filter ausreichend) |
| Rebuild | **6** Zeilen |
| Indexierte Slugs | 6 public-safe Canonicals (siehe Report) |
| RPC Smoke | **PASS** |
| Content-Row-Writes | **Nein** |
| 5E/5F Integrity | **INTACT** |
| Runtime-Switch | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5H** |

**Report:** `docs/architecture/p5-legacy-content-filter-rebuild-report.md`

---

*Dokumentversion: P5-E.9E.5F + 5G PASS. Keine Secrets. Kein Content Row Write. Kein Runtime-Switch.*
