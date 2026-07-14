# P5-E.9E.5E — Legacy Profile/RLS Security Hardening Report

**Gate:** P5-E.9E.5E — Legacy Profile/RLS Security Hardening. **PASS**.

**HEAD vor Gate:** `774b13f` — Document legacy backup evidence

**Arbeitsmodus:** Legacy-Write nur für Policy/Grant-Härtung auf `ohkoojpzmptdfyowdgog`. Kein Search Apply, kein Content Write, kein Runtime-Switch, kein Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.5E** | **PASS** |
| **Legacy Profile/RLS Security** | **HARDENED_LEGACY_PASS** |
| **Public Profile Leak** | **CLOSED** (5B-Finding behoben) |
| **Posts RLS Dependency (SELECT-Pfad)** | **CLOSED** (analog Staging 4D) |
| **Legacy Search DB/FTS** | **APPLIED_LEGACY_PASS** (5F) |
| **S-06 Final Status** | **OPEN_BLOCKING** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Nach verifizierter 5D-Backup-Baseline wurden auf Legacy `ohkoojpzmptdfyowdgog` die kritischen Profile-Leak- und Posts-SELECT-RLS-Dependency-Risiken aus 5B geschlossen — **ohne** Datenzeilen-Änderungen, **ohne** Search-Objekte, **ohne** Runtime-Switch.

---

## HEAD / Working Tree

| Prüfung | Ergebnis |
|---------|----------|
| HEAD vor Gate | `774b13f` |
| Runtime Config | Unverändert — `js/supabase-config.js` → `jzzgoiwfbuwiiyvwgwri` |
| `.env` geändert | **Nein** |
| Backup committed | **Nein** |
| Repo-Migration-Datei | **Nein** (Apply via Supabase MCP Migration only) |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.5E frei — Legacy Profile/RLS Security Hardening auf `ohkoojpzmptdfyowdgog` nach frischem Backup, nur Legacy-Write für Policy/Grant-Fix, kein Search Apply, kein Staging-Write, kein Runtime-Switch, kein Push, kein Deploy, kein Launch.“

---

## Target Verification

| Feld | Wert |
|------|------|
| **Target Project Ref** | `ohkoojpzmptdfyowdgog` — **verifiziert** |
| **Projektname** | TheOverseer47's Project |
| **Region** | eu-central-1 |
| **Staging Ref `jzzgoiwfbuwiiyvwgwri`** | **Nicht verwendet** |
| **Production / boundlore.com** | **Nicht verwendet** |
| **Connection Strings / Keys in diesem Dokument** | **Nein** |

---

## Backup Baseline

| Check | Ergebnis |
|-------|----------|
| Pfad | `backups/legacy/p5-e9e5d-legacy-prewrite-20260714-152031.dump` |
| Größe | **433,643 bytes** |
| SHA256 | `3B5A5E6B59463505A42E812596BED4B41603CC0F189A18D99A5B0E1B0C852F7B` |
| Gitignored | **Ja** |
| Restore ausgeführt | **Nein** |
| Backup committed | **Nein** |

---

## Before Findings

| Finding (5B) | Vor Apply | Risiko |
|--------------|-----------|--------|
| `profiles_select_all` | **Vorhanden** — `USING (true)` | **Kritisch** — All-Profile-Leak |
| `anon SELECT` auf `profiles` | **Ja** | **Kritisch** — kombiniert mit permissiver Policy |
| `public SELECT` auf `profiles` | Via PUBLIC role grant | **Kritisch** |
| `posts_select_approved` | Admin-Zweig mit Invoker-`profiles`-Subquery | **Hoch** — 42501-Risiko |
| `Admins can view all posts` | Invoker-`profiles`-Subquery, `{public}` | **Hoch** |
| RLS `profiles` / `posts` | **Aktiv** | — |
| `is_admin()` | **Vorhanden**, SECURITY DEFINER | Fix-Basis vorhanden |
| Search MVP | **Absent** | Erwartet — nicht in 5E |

### Grants vor Apply (relevant)

| Tabelle | `anon` SELECT | `authenticated` SELECT |
|---------|---------------|------------------------|
| `profiles` | **Ja** | **Ja** |
| `posts` | **Ja** | **Ja** |

---

## Applied Changes

**Migration:** `p5_e9e5e_legacy_profile_rls_security_hardening` (Supabase MCP, Legacy only)

### 1. Profile-Leak schließen

- `DROP POLICY profiles_select_all ON public.profiles`
- `REVOKE SELECT ON TABLE public.profiles FROM anon`
- `REVOKE SELECT ON TABLE public.profiles FROM PUBLIC`

### 2. Posts SELECT RLS Dependency (analog P5-E.9E.4D)

- `posts_select_approved` — Admin-Zweig: `public.is_admin()` statt Invoker-Subquery auf `profiles`
- `Admins can view all posts` — `TO authenticated` + `public.is_admin()`

### Nicht angewendet

- Kein `GRANT SELECT ON profiles TO anon/public`
- Kein Search DDL (`search_documents`, FTS, Rebuild)
- Keine Daten-INSERT/UPDATE/DELETE
- Keine UPDATE/DELETE-Policy-Änderungen auf `posts` (außerhalb SELECT-Scope)
- Kein Staging-Write
- Kein Runtime-Switch

---

## After Verification

| Check | Ergebnis |
|-------|----------|
| `profiles_select_all` existiert | **Nein** (count = 0) |
| `anon SELECT` auf `profiles` | **Nein** (`has_table_privilege` = false) |
| `authenticated SELECT` auf `profiles` | **Ja** (RLS-gesteuert: own + admin) |
| All-Profile SELECT-Policy auf `profiles` | **Nein** — nur `Users can view own profile`, `Admins can view all profiles` |
| `posts` SELECT-Policies mit `profiles`-Subquery | **0** |
| `posts_select_approved` Admin-Zweig | **`is_admin()`** |
| `Admins can view all posts` | **`authenticated` + `is_admin()`** |
| RLS `profiles` aktiv | **Ja** |
| RLS `posts` aktiv | **Ja** |
| `search_documents` | **null** (nicht angelegt) |
| `release_gate` | **null** (unverändert absent) |
| Datenzeilen geändert | **Nein** (nur Policy/Grant) |
| Published posts count | **9** (unverändert — nur Metadaten-Count, keine Row-Dumps) |

### Privilege Smoke (SQL)

| Check | Ergebnis |
|-------|----------|
| `has_table_privilege('anon', 'public.profiles', 'SELECT')` | **false** |
| `has_table_privilege('anon', 'public.posts', 'SELECT')` | **true** (RLS filtert published) |

---

## Public Profile Leak Decision

**CLOSED.** Die Kombination aus permissiver `profiles_select_all`-Policy und `anon`/PUBLIC-SELECT auf `profiles` ist entfernt. Anon kann `profiles` nicht mehr per Table-Privilege lesen; verbleibende SELECT-Policies erlauben nur authenticated own-profile und admin via `is_admin()`.

---

## Posts RLS Dependency Decision

**CLOSED (SELECT-Pfad).** `posts_select_approved` und `Admins can view all posts` nutzen keine Invoker-`profiles`-Subquery mehr im public/anon SELECT-Pfad. Public published-post read bleibt über posts-eigene Bedingungen (`status = published`, `deleted_at IS NULL`) und parallele Policies erhalten.

---

## No Search Apply Confirmation

| Check | Ergebnis |
|-------|----------|
| `search_documents` | **Nicht angelegt** |
| `bl_search_public_content` | **Nicht angelegt** |
| `bl_rebuild_search_documents` | **Nicht angelegt** |
| FTS / Rebuild | **Nein** |

---

## No Runtime Switch Confirmation

| Check | Ergebnis |
|-------|----------|
| `js/supabase-config.js` | **Unverändert** — Staging `jzzgoiwfbuwiiyvwgwri` |
| Legacy in aktiver Runtime | **Nein** |
| Push / Deploy / Launch | **Nein** |

---

## Residual Risks

| Risiko | Status | Nächster Gate |
|--------|--------|---------------|
| Search MVP auf Legacy | **DDL applied (5F)**; Index **POPULATED (6)** via 5G | **P5-E.9E.5H** |
| UPDATE/DELETE-Policies auf `posts` mit Invoker-`profiles`-Subquery | **Offen** (außerhalb 5E SELECT-Scope) | Optional späteres Gate |
| `anon` hat weiterhin INSERT/UPDATE/DELETE Table-Grants auf `profiles` | **Residual** — RLS blockiert, aber Grants breit | Optional Grant-Härtung |
| Content QA/BLMETA | **Aus Index ausgeschlossen (5G)** | 5H Verification |
| Release Gate fehlt | **Offen** | Separates Apply-Gate |
| S-06 Final / Launch | **Offen** | 5G–5J + Launch |

---

## Required Future Gates

| Gate | Freigabe |
|------|----------|
| ~~**P5-E.9E.5F**~~ | Legacy Search DB/FTS Apply — **PASS** |
| ~~**P5-E.9E.5G**~~ | Content Cleanup + Rebuild — **PASS** |
| **P5-E.9E.5H–5J** | Verification / Dry Run / S-06 Final |
| **S-05, Launch** | Separat |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.5E | **PASS** |
| Legacy Profile/RLS Security | **HARDENED_LEGACY_PASS** |
| Public Profile Leak | **CLOSED** |
| Posts RLS Dependency (SELECT) | **CLOSED** |
| Legacy Search DB/FTS | **APPLIED_LEGACY_PASS** (5F); Index **POPULATED** (5G) |
| P5-E.9E.5G | **PASS** |
| P5-E.9E.5H | **PASS** |
| Final Target Decision | **LEGACY_CONDITIONAL_TARGET_CANDIDATE** |
| S-06 Staging Evidence | **STAGING_CLOSED** |
| S-06 Final Status | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** P5-E.9E.5I — Legacy Runtime Config Cutover Dry Run

---

## P5-E.9E.5G Follow-up (PASS — Legacy Content Filter + Rebuild)

**Gate:** P5-E.9E.5G. **PASS**.

| Item | Ergebnis |
|------|----------|
| 5E Profile/RLS Security | **INTACT** — `profiles_select_all` **0**, anon SELECT profiles **false**, Posts SELECT ohne `profiles`-Subquery |
| Rebuild | **6** Zeilen; keine Content-Row-Writes |
| RPC Smoke | **PASS** |
| Runtime-Switch | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5H** |

**Report:** `docs/architecture/p5-legacy-content-filter-rebuild-report.md`

---

---

## P5-E.9E.5H Follow-up (PASS — Legacy RPC-first Search Verification)

**Gate:** P5-E.9E.5H. **PASS**.

| Item | Ergebnis |
|------|----------|
| 5E Profile/RLS Security | **INTACT** |
| Core Query Matrix | **12/12 PASS** |
| Safety / Exclusion | **10/10 PASS** |
| RPC Output Contract | **PASS** |
| `search_documents` rows | **6** (unverändert) |
| Rebuild / Writes / Runtime-Switch | **Nein** |
| Empfohlener nächster Gate | **P5-E.9E.5I** |

**Report:** `docs/architecture/p5-legacy-rpc-first-search-verification-report.md`

---

*Dokumentversion: P5-E.9E.5E + 5G + 5H PASS. Keine Secrets. 5E Security INTACT.*
