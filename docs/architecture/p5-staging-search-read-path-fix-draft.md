# P5-E.9E.4C — Staging Search Read Path Fix Draft

**Gate:** P5-E.9E.4C — Staging Search Read Path Fix Draft (Analyse + nicht-ausführbarer Entwurf). **PASS**.

**HEAD vor Gate:** `9cfe95b` — Rerun staging search verification

**Arbeitsmodus:** Nur lokales Repo. Deutsch dokumentiert. Kein SQL Apply. Kein SQL ausführen. Kein DB-Read. Kein DB-Write. Keine Supabase-Verbindung. Keine Migration. Keine `.sql`-Datei erstellt.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.4C** | **PASS** (Draft vollständig) |
| **Read Path Fix Draft** | **DRAFT_ONLY** |
| **Root Cause (statisch)** | **CONFIRMED_STATIC** — RLS-Policy-Abhängigkeit auf `profiles`, nicht Client-Embedded-Select |
| **Code-only Fix für Search** | **NICHT AUSREICHEND** — `search.js` fordert bereits keine `profiles` an |
| **Empfohlener Minimal-Fix** | **RLS-Policy-Refactor** (`is_admin()` / rollenspezifische Policies) |
| **P5-E.9E.4D** | **PASS** — Fix angewendet |
| **Search Runtime Evidence** | **PARTIAL** (Read-Pfad offen; Corpus leer) |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |

**Kernaussage:** Der Staging-Search-Blocker `42501 permission denied for table profiles` entsteht **nicht** durch eingebettete `profiles`-Selects in `js/search.js`, sondern durch **PostgreSQL RLS-Policy-Auswertung** auf `public.posts`: mehrere SELECT-Policies enthalten **Invoker-Subqueries** auf `public.profiles`, während die Rolle `anon` **kein** `SELECT`-Grant auf `profiles` hat (`p5_policy_dependency_select_grants.sql` gewährt nur `authenticated`). Ein Client-Select-Pruning allein behebt Search **nicht**. Der bevorzugte nächste Gate ist **P5-E.9E.4D — Posts RLS Policy Dependency Fix** (DB-Apply mit separater Freigabe).

---

## HEAD / Working Tree / No-Apply-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `9cfe95b` |
| SQL ausführen / SQL Apply | **Nein** |
| DB-Read / DB-Write | **Nein** |
| Supabase-Verbindung | **Nein** |
| Migration / neue `.sql`-Datei | **Nein** |
| Storage / Push / Deploy / Launch | **Nein** |
| Production / Legacy / boundlore.com | **Nein** |
| `.env` geöffnet / geändert | **Nein** |
| Dumps / Backups geöffnet | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.4C frei — Staging Search Read Path Fix Draft, nur Analyse und nicht-ausführbarer Fix-Entwurf für den 42501 profiles/posts Read-Blocker, kein SQL Apply, kein SQL ausführen, kein DB-Write, kein Production, kein Legacy, kein Push, kein Deploy, kein Launch.“

---

## Incident Summary

| Beobachtung | Status |
|-------------|--------|
| Staging Runtime Ref | `jzzgoiwfbuwiiyvwgwri` — **STAGING_REF_VERIFIED** |
| Query-Matrix (P5-E.9E.4 Re-run) | Read-only ausgeführt — **PASS** |
| Runtime-Treffer | **0/14** — UI: „Search unavailable, please try again.“ |
| Fehler | HTTP 401, `42501`, `permission denied for table profiles` |
| Auslöser (Runtime) | `supabase.from('posts').select(...)` in `fetchStructuredSearchCorpus()` |
| BLMETA / Draft / QA / Test Leaks | **Keine** |
| Lokale Fixtures | **21/21 + 92/92 + 98/98 PASS** |
| Search Runtime Evidence | **PARTIAL** |

**Quelle:** `docs/architecture/p5-staging-search-verification-report.md` (Abschnitt P5-E.9E.4 Re-run).

---

## Static Root-Cause Analysis

### Klassifikation

| Hypothese | Klassifikation | Begründung |
|-----------|----------------|------------|
| Embedded `profiles` in `search.js` | **WIDERLEGT (CONFIRMED_STATIC)** | `fetchStructuredSearchCorpus()` und `runLegacySearch()` selektieren nur `posts`-Spalten — kein `profiles:author_id(...)` |
| RLS-Policy auf `posts` referenziert `profiles` | **CONFIRMED_STATIC** | `posts_select_approved`, `"Admins can view all posts"` enthalten `EXISTS (SELECT 1 FROM public.profiles ...)` |
| `anon` fehlt `SELECT` auf `profiles` | **LIKELY** (Schema + Grant-Draft) | `p5_policy_dependency_select_grants.sql`: nur `grant select ... to authenticated` |
| Invoker-Subquery schlägt fehl trotz anderer Policy | **LIKELY** | PostgreSQL wertet alle permissiven SELECT-Policies aus; Invoker-Subquery auf `profiles` ohne Table-Grant → `42501` |

### Warum Search `profiles` braucht — obwohl der Client es nicht anfordert

`js/search.js` lädt den Corpus so:

```javascript
supabase.from("posts")
  .select("id, title, category, post_type, slug, excerpt, content, status, deleted_at")
  .eq("status", "published")
  .is("deleted_at", null)
  .limit(500);
```

**Kein** eingebetteter `profiles`-Join. Dennoch prüft PostgreSQL beim `posts`-SELECT die **RLS-Policies** der Tabelle. Relevante Policies (aus `core_schema_foundation.sql` / `archive_visibility_hardening.sql`):

| Policy | Rolle | `profiles`-Abhängigkeit |
|--------|-------|-------------------------|
| `"Anyone can view published posts"` | alle | **Nein** — nur `status` + `deleted_at` |
| `"Authors can view their own pending posts"` | alle | **Nein** — nur `auth.uid() = author_id` |
| `"Admins can view all posts"` | alle | **Ja** — `EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')` |
| `posts_select_approved` | alle | **Ja** — Admin-Zweig mit `EXISTS ... profiles` |

Für `anon` ist `auth.uid()` null; die Admin-Zweige sollten logisch `false` liefern. PostgreSQL führt die Subquery dennoch als **Invoker** aus. Ohne `SELECT`-Grant auf `profiles` für `anon` → **`42501`**, auch wenn `"Anyone can view published posts"` den Zugriff erlauben würde.

### Abgleich mit P5-E.7A.2

`p5_policy_dependency_select_grants.sql` adressierte dasselbe Muster für **`authenticated`** INSERT-Policies (`grant select on profiles to authenticated`). Der **anon Read-Pfad** für `posts` wurde nicht geschlossen — konsistent mit `p5-direct-posts-grant-rls-retest-report.md` („secondary profiles/acks SELECT grant gap“).

### Vorhandene SECURITY DEFINER Helfer (noch nicht in allen Policies genutzt)

| Funktion | Typ | Nutzung in `posts` SELECT-Policies |
|----------|-----|-------------------------------------|
| `public.is_admin()` | SECURITY DEFINER | **Nein** — nur in `profiles`-Policies |
| `public.bl_is_admin_actor(uuid)` | SECURITY DEFINER | **Nein** in `posts` SELECT — nur Release-Gate / restrictive Policies |

Diese Funktionen lesen `profiles` mit Owner-Rechten und würden **kein** `anon`-Grant auf `profiles` erfordern — wenn sie die Inline-Subqueries ersetzen oder Admin-Policies auf `TO authenticated` beschränken.

---

## Current Search Read Path

```
/wiki/search/ (anon, Staging jzzgoiwfbuwiiyvwgwri)
  → js/search.js initSearchPage()
    → runStructuredSearch()
      → fetchStructuredSearchCorpus()
        → supabase.from("posts").select(<posts-only columns>)
          → PostgreSQL RLS auf posts
            → Policy-Auswertung mit profiles-Subquery (Invoker)
              → 42501 permission denied for table profiles
        → catch → "Search unavailable, please try again."
```

**Fallback-Pfad** `runLegacySearch()` — gleiche Tabelle, gleiche RLS — würde identisch scheitern.

**Kein RPC**, **keine View**, **kein Trigger** im Search-Read-Pfad (Client-seitig).

---

## Profiles Dependency Analysis

### Search (`js/search.js`)

| Feld / Feature | `profiles` nötig? | Im Code |
|----------------|-------------------|---------|
| Titel, Kategorie, Slug, Excerpt | **Nein** | Direkt aus `posts` |
| Recall-Ranking / Snippets | **Nein** | `search-recall-utils.js` + `search-signals.js` |
| Autorname / Avatar in Ergebnissen | **Nein** | `renderStructuredPostResult()` rendert nur Titel + Kategorie |
| Canonical URL | **Nein** | Aus `slug` via `BoundLoreSearchRecall` |

**Fazit:** Search-Results brauchen **keine** Profil-Metadaten für locked/read-only MVP.

### Andere Client-Pfade (nicht Search-Blocker, aber verwandt)

| Datei | `profiles`-Embed | Betrifft Search? |
|-------|------------------|------------------|
| `js/render-posts.js` | `profiles:author_id(*)` | **Nein** — Browse/Category |
| `js/post-detail.js` | `*, profiles:author_id(*)` | **Nein** — Post-Detail |
| `js/post-interactions.js` | `profiles:author_id(username)` | **Nein** — Kommentare |
| `js/homepage-stats.js` | `posts` count only | **Gleicher RLS-Blocker möglich** |

Browse/Detail können **ebenfalls** unter `42501` leiden — separat zu verifizieren nach Fix.

### Schema: `profiles` RLS

`core_schema_foundation.sql` enthält u. a.:

- `profiles_select_all` — `USING (true)` (permissiv, **hohes Leak-Risiko** wenn Table-Grant für `anon` gesetzt wird)
- `"Users can view own profile"` — `auth.uid() = id`
- `"Admins can view all profiles"` — `is_admin()`

**Direktes `grant select on profiles to anon` ist ausgeschlossen** — würde bei `profiles_select_all` PII exponieren.

---

## Fix Options Matrix

| Option | Beschreibung | DB-Write nötig? | Sicherheitsrisiko | Aufwand | Empfehlung |
|--------|--------------|-----------------|-------------------|---------|------------|
| **A. Client Select Pruning** | `profiles`-Embed aus Client-Selects entfernen | **Nein** | Niedrig | Gering | **Nicht für Search** — bereits pruned; optional für Browse/Detail |
| **B. Safe Public Profile View** | View/RPC mit nur `username`, `avatar_url` | **Ja** | Mittel (wenn eng) | Mittel | Später — Autor-Metadaten |
| **C. RLS `profiles` anon read erweitern** | `grant select on profiles to anon` | **Ja** | **Hoch** — `profiles_select_all` | Gering | **Nicht bevorzugt** |
| **D. Search RPC / `search_documents`** | Langfristiger DB-Search-Pfad (9E.4A) | **Ja** | Niedrig (wenn reviewed) | Hoch | Nach Draft-Fixes + Backup |
| **E. Denormalisierte Autor-Felder in `posts`** | `author_display_name` o. ä. | **Ja** + Populate | Mittel | Hoch | Full Launch / DB-Search-MVP |
| **F. RLS Policy Refactor (posts)** | Inline-`profiles`-Subqueries durch `is_admin()` / `bl_is_admin_actor()` ersetzen **oder** Admin-SELECT-Policies auf `TO authenticated` beschränken | **Ja** | **Niedrig** — gleiche Semantik, kein anon-Grant auf `profiles` | Mittel | **Bevorzugt — erster Fix** |

---

## Recommended Minimal Fix

### Primär: **P5-E.9E.4D — Posts RLS Policy Dependency Fix**

**Ziel:** Anon-`posts`-SELECT für `status = published` ohne `42501` auf `profiles`.

**Vorgehen (konzeptionell, DRAFT ONLY):**

1. Alle `posts` SELECT-Policies mit Inline `EXISTS (SELECT 1 FROM public.profiles ...)` identifizieren.
2. Admin-Zweige ersetzen durch `public.is_admin()` oder `public.bl_is_admin_actor(auth.uid())` (SECURITY DEFINER).
3. **Alternativ/zusätzlich:** Admin-only Policies (`"Admins can view all posts"`) auf `TO authenticated` scopen — `anon` wertet sie nicht aus.
4. Redundante Policies konsolidieren (`"Anyone can view published posts"` vs. `posts_select_approved` Published-Zweig).
5. **Kein** `grant select on profiles to anon`.
6. Staging-Backup + Owner-Inventar vor Apply (wie P5-E.7A / P5-E.8A).
7. Danach **P5-E.9E.4 Re-run** Query-Matrix.

### Sekundär (optional, Code-only): Browse/Detail Select Pruning

Nur wenn nach RLS-Fix Browse-Seiten weiterhin `profiles`-Embed nutzen und separat scheitern — **nicht** Voraussetzung für Search-Corpus.

### Nicht als erster Schritt

- P5-E.9E.4A (`search_documents` RPC Apply)
- Anon-Grant auf `profiles`
- Production/Legacy-Tests

---

## DRAFT ONLY SQL / Policy Notes

> **DRAFT ONLY — DO NOT APPLY.**
> No SQL in this section may be executed.
> No migration file has been created.

### Konzeptionelle Policy-Skizze (Option F)

```sql
-- DRAFT ONLY — DO NOT APPLY — illustrative pseudocode

-- 1) Admin-Policy nur für authenticated (anon wertet nicht aus)
-- drop policy if exists "Admins can view all posts" on public.posts;
-- create policy "Admins can view all posts"
--   on public.posts for select to authenticated
--   using (public.is_admin());

-- 2) posts_select_approved: profiles-Subquery durch Definer-Helper ersetzen
-- drop policy if exists posts_select_approved on public.posts;
-- create policy posts_select_approved
--   on public.posts for select
--   using (
--     (status = 'published' and deleted_at is null)
--     or author_id = auth.uid()
--     or public.is_admin()
--   );

-- TODO: Owner-/Role-Review vor Apply (42501 owner risk analog Storage-Gate)
-- TODO: Negative Tests — anon darf keine privaten Profile lesen
-- TODO: Kein grant select on profiles to anon
```

### Verboten in diesem Gate

- Finale Grants ausführen
- Destructive SQL
- Migration anlegen
- Testdaten / Inserts

---

## Code-Only Fix Candidate

| Prüfpunkt | Ergebnis |
|-----------|----------|
| `search.js` bereits ohne `profiles` | **Ja** — kein weiteres Pruning nötig für Corpus |
| Code-only behebt `42501` | **Nein** — RLS blockiert auf DB-Ebene |
| Browse (`render-posts.js`) Pruning hilft Search | **Nein** |
| Browse Pruning als UX-Follow-up | Optional — Autor als „Community“ / Fallback |

**Entscheidung:** Code-only Fix **nicht ausreichend** für Search Read Path. Nächster Gate braucht **DB-RLS-Änderung** (mit Freigabe) oder read-only Staging-Schema-Diagnose zur Laufzeit-Bestätigung.

---

## Security / RLS Considerations

- `profiles` kann PII enthalten (`email`, `role`, Ban-Flags) — **nicht** pauschal für `anon` lesbar machen.
- `profiles_select_all USING (true)` macht jeden Table-Grant für `anon` kritisch.
- Public Search braucht nur **published** `posts`-Felder — kein Autor-PII.
- Suchergebnisse dürfen keine E-Mail, interne User-IDs, Tokens oder Admin-Metadaten zeigen.
- RLS-Fix darf **Release-Gate** nicht umgehen (`release_gate_lock.sql` restrictive Policies bleiben).
- Negative Tests nach Apply:
  - `anon` — published posts lesbar, keine privaten Profile
  - `anon` — pending/draft/archived nicht lesbar
  - `authenticated` non-admin — kein Schreiben bei locked gate
  - Admin — weiterhin volle Sicht über Definer-Helper

---

## Verification Plan

### Nach P5-E.9E.4D (RLS Policy Fix Apply)

| Check | Erwartung |
|-------|-----------|
| Staging Ref | `jzzgoiwfbuwiiyvwgwri` |
| `fetchStructuredSearchCorpus()` | **Kein** `42501` |
| Query-Matrix Re-run | `monster`, `creature`, `beast`, `artifact`, `basalt`, unsafe query |
| Treffer | ≥0 wenn Corpus vorhanden; 0 weiterhin OK wenn Staging dünn |
| Safety/No-Leak | PASS |
| Lokale Fixtures | 21/21 + 92/92 + 98/98 PASS |
| Search Runtime Evidence | **PASS** oder **PARTIAL** (nur bei dünnem Corpus) |

### Falls nur Diagnose ohne Apply (Alternative Gate)

- Read-only `information_schema` / Policy-Export auf Staging
- Bestätigung welche Policies live aktiv sind
- Kein Apply

### Vor DB-Apply (Pflicht)

- Frisches Staging-Backup
- Owner-/Role-Inventar
- Finaler SQL-Draft (separates Review-Gate)
- Explizite Nutzerfreigabe
- Rollback-Plan

---

## Required Future Gates

| Gate | Zweck | Apply? |
|------|-------|--------|
| **P5-E.9E.4D** | Posts RLS Policy Dependency Fix | **Ja** (Staging, mit Freigabe) |
| **P5-E.9E.4 Re-run** | Query-Matrix nach Fix | Read-only |
| **P5-E.9E.4A** | `search_documents` / FTS | **STOPP** — separat |
| Browse/Detail Read | `render-posts.js` Profil-Embed | Optional nach Search-Fix |

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.4C | **PASS** |
| Read Path Fix Draft | **DRAFT_ONLY** |
| Root Cause | **CONFIRMED_STATIC** (RLS Policy Dependency) |
| Code-only Fix ausreichend | **Nein** |
| Search Runtime Evidence | **PARTIAL** / **BLOCKED_UNTIL_FIX** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **PARTIAL** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |
| P5-E.9E.4A | **STOPP** |

---

*Dokumentversion: P5-E.9E.4C PASS. DRAFT ONLY. Kein SQL. Kein DB-Zugriff. Keine Secrets.*
