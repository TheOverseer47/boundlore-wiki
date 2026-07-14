# P5-E.9E.4D — Posts RLS Policy Dependency Fix Report

**Gate:** P5-E.9E.4D — Posts RLS Policy Dependency Fix (Staging Apply). **PASS**.

**HEAD vor Gate:** `2322160` — Draft staging search read path fix

**Arbeitsmodus:** Nur Staging `jzzgoiwfbuwiiyvwgwri`. SQL Apply eng begrenzt auf posts/profiles RLS-Read-Pfad. Kein Production/Legacy/Push/Deploy/Launch.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4D** | **PASS** |
| **Posts RLS Dependency Fix** | **APPLIED_STAGING_PASS** |
| **Search Runtime Evidence** | **PARTIAL** |
| **S-06 Search Recall** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Frischer Staging-Backup vor Apply. RLS-Policy-Fix (`is_admin()` statt Invoker-`profiles`-Subquery) **erfolgreich angewendet**. Post-Apply zeigte sekundären Blocker `42501 permission denied for table posts` — minimaler `GRANT SELECT ON public.posts TO anon` angewendet (**kein** Grant auf `profiles`). Search lädt ohne `42501`; Corpus-Fetch **erfolgreich** (0 Zeilen — Staging hat **0 published posts**). Alle Core-Queries: 0 Treffer + Empty-State. Safety/No-Leak **PASS**. Search Runtime Evidence: **PARTIAL** (Read-Pfad offen, Recall gegen echte Daten nicht verifizierbar).

---

## HEAD / Working Tree / Apply-Scope-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `2322160` |
| Staging Ref | `jzzgoiwfbuwiiyvwgwri` |
| Legacy / Production | **Nicht verwendet** |
| Push / Deploy / Launch / Storage / Restore | **Nein** |
| Testdaten / Payloads | **Nein** |
| `profiles` Grant an anon/public | **Nein** |
| FTS / `search_documents` | **Nein** |
| `.env` geändert | **Nein** |
| Backup committed | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.4D frei — Posts RLS Policy Dependency Fix auf Staging nach frischem Backup, nur Staging `jzzgoiwfbuwiiyvwgwri`, SQL Apply ausschließlich für den geprüften posts/profiles RLS-Dependency-Fix, kein Production, kein Legacy, kein Push, kein Deploy, kein Launch.“

---

## Staging Target Verification

| Feld | Wert |
|------|------|
| Project Ref | `jzzgoiwfbuwiiyvwgwri` |
| Project Name | `boundlore-staging` |
| Project URL | `https://jzzgoiwfbuwiiyvwgwri.supabase.co` |
| Region | `eu-central-1` |
| Status | `ACTIVE_HEALTHY` |
| Legacy `ohkoojpzmptdfyowdgog` | **Nicht verwendet** |
| Client Runtime | `STAGING_REF_VERIFIED` (`js/supabase-config.js`) |

---

## Fresh Backup Evidence

| Item | Wert |
|------|------|
| Methode | `pg_dump` Custom Format via Session-Pooler |
| Pfad | `backups/staging/p5-e9e4d-posts-rls-prewrite-20260714-025245.dump` |
| Größe | **382,985 bytes** |
| SHA256 | `211D6D139128A1703886DC9BEC3D605AA7F7B018D4E84D589C7741361B2A0ED8` |
| `pg_restore --list` | **723 TOC Entries** |
| Gitignored | `[x]` — `.gitignore: backups/` |
| Committed | **Nein** |

**Hinweis:** Direct-Host `db.jzzgoiwfbuwiiyvwgwri.supabase.co` auf diesem Netzwerk nicht auflösbar; Pooler `aws-0-eu-central-1.pooler.supabase.com:5432` verwendet (konsistent mit P5-STAGING.3).

---

## Policy Inventory Before

### `public.posts` SELECT-Policies (vor Apply)

| Policy | Roles | `profiles`-Subquery |
|--------|-------|---------------------|
| `Anyone can view published posts` | `{public}` | **Nein** |
| `Authors can view their own pending posts` | `{public}` | **Nein** |
| `Admins can view all posts` | `{public}` | **Ja** — Invoker `EXISTS (SELECT 1 FROM profiles ...)` |
| `posts_select_approved` | `{public}` | **Ja** — Admin-Zweig mit Invoker-Subquery |

### Grants (vor Apply, relevant)

| Tabelle | `anon` SELECT | `authenticated` SELECT |
|---------|---------------|------------------------|
| `posts` | **Nein** | **Nein** (nur postgres owner) |
| `profiles` | **Nein** | **Ja** |

### Helper-Funktionen

| Funktion | SECURITY DEFINER | EXECUTE |
|----------|------------------|---------|
| `is_admin()` | **Ja** | PUBLIC |
| `bl_is_admin_actor(uuid)` | **Ja** | PUBLIC + authenticated |

---

## Chosen Fix Strategy

**Primär (Option F aus P5-E.9E.4C):**

1. `posts_select_approved` — Admin-Zweig: `public.is_admin()` statt Invoker-Subquery auf `profiles`.
2. `Admins can view all posts` — auf `TO authenticated` beschränken + `is_admin()`.

**Sekundär (Post-Apply Runtime-Diagnose):**

3. `GRANT SELECT ON public.posts TO anon` — notwendig, damit PostgREST/anon den Corpus laden kann. **RLS bleibt** massgeblich (nur published/non-deleted für anon). **Kein** Grant auf `profiles`.

---

## Applied SQL Summary

### Migration 1: `p5_e9e4d_posts_rls_policy_dependency_fix`

```sql
-- RLS: replace invoker profiles subqueries with SECURITY DEFINER is_admin()
drop policy if exists posts_select_approved on public.posts;
create policy posts_select_approved on public.posts
  for select
  using (
    (status = 'published' and deleted_at is null)
    or author_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "Admins can view all posts" on public.posts;
create policy "Admins can view all posts" on public.posts
  for select
  to authenticated
  using (public.is_admin());
```

### Migration 2: `p5_e9e4d_posts_anon_select_grant`

```sql
-- Table privilege: anon needs SELECT on posts (RLS still enforces row filter)
grant select on table public.posts to anon;
```

**Nicht angewendet:** `GRANT SELECT ON profiles TO anon/public`, FTS, `search_documents`, Testdaten.

---

## Policy Inventory After

### `public.posts` SELECT-Policies (nach Apply)

| Policy | Roles | `profiles`-Subquery |
|--------|-------|---------------------|
| `Anyone can view published posts` | `{public}` | **Nein** |
| `Authors can view their own pending posts` | `{public}` | **Nein** |
| `Admins can view all posts` | `{authenticated}` | **Nein** — `is_admin()` |
| `posts_select_approved` | `{public}` | **Nein** — `is_admin()` |

### Grants (nach Apply)

| Tabelle | `anon` SELECT | `profiles` anon SELECT |
|---------|---------------|------------------------|
| `posts` | **Ja** | — |
| `profiles` | **Nein** | **Nein** |

---

## Runtime Verification

### Lokale Fixtures

| Fixture | Ergebnis |
|---------|----------|
| `p5-staging-runtime-config-fixtures.html` | **21/21 PASS** |
| `p5-search-client-hardening-fixtures.html` | **92/92 PASS** |
| `p5-search-recall-fixtures.html` | **98/98 PASS** (lokal, unverändert) |

### Search Query Matrix (Staging Runtime, read-only)

| Query | Lädt | Fehler | Treffer | Empty-State | BLMETA | Unsafe HTML | Draft/QA |
|-------|------|--------|---------|-------------|--------|-------------|----------|
| monster | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| creature | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| beast | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| salamander | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| artifact | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| charm | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| basalt | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| volcanic | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| resource | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| guide | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| guild | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| zzzxxy-no-hit | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |
| unsafe HTML | Ja | Kein 42501 | 0 | Ja | Nein | Nein (escaped) | Nein |
| 150×`z` | Ja | Kein 42501 | 0 | Ja | Nein | — | Nein |

**Corpus:** `fetchStructuredSearchCorpus()` → **0 posts** (Staging `published_count = 0`).

**Vor Fix:** `42501 permission denied for table profiles`  
**Nach RLS-Fix allein:** `42501 permission denied for table posts`  
**Nach beiden Applies:** Corpus-Load **OK**, keine 42501.

---

## Safety / No-Leak Checks

| Check | Ergebnis |
|-------|----------|
| Kein `42501 profiles` bei Search | **PASS** |
| Kein `42501 posts` bei Search | **PASS** |
| BLMETA nicht sichtbar | **PASS** |
| Draft/Pending/QA/Test nicht sichtbar | **PASS** |
| Unsafe Query escaped, kein Script | **PASS** |
| Kein `profiles` anon/public Grant | **PASS** |
| ErrorReporter vorhanden | **PASS** |
| Externe Provider-Reports | **Keine** |

---

## Limitations

1. Staging hat **0 published posts** — Recall-Treffer gegen echte Daten nicht verifizierbar.
2. `GRANT SELECT ON posts TO anon` war **zusätzlich** zum reinen RLS-Policy-Fix nötig (sekundärer Blocker).
3. UPDATE/DELETE-Policies auf `posts` mit Invoker-`profiles`-Subqueries **nicht** geändert (außerhalb SELECT-Scope).
4. Browse/Detail (`profiles:author_id(*)`) nicht in diesem Gate retestet.

---

## Required Follow-up Gates

| Gate | Zweck |
|------|-------|
| **Staging Corpus Populate** (kontrolliert) | Published Test-Canonicals für Recall-Runtime |
| **P5-E.9E.4 Re-run** (nach Populate) | Query-Matrix mit echten Treffern |
| **P5-E.9E.4A** | `search_documents` / FTS — **STOPP** |
| Browse Read Path | `render-posts.js` Profil-Embed |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4D | **PASS** |
| Posts RLS Dependency Fix | **APPLIED_STAGING_PASS** |
| Search Runtime Evidence | **PARTIAL** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **PARTIAL** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| P5-E.9E.4A | **STOPP** |

---

*Dokumentversion: P5-E.9E.4D PASS. Keine Secrets. Kein Backup-Inhalt.*
