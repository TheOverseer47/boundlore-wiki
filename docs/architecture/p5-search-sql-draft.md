# P5-E.9E.3A — Search SQL Draft

**Gate:** P5-E.9E.3A — Search SQL Draft (DRAFT ONLY — nicht ausführbar). **PASS**.

**HEAD vor Gate:** `af5f6d4` — Document search DB strategy

**Arbeitsmodus:** Nur lokales Repo. SQL-Draft in Dokumentation erlaubt. Kein SQL Apply. Kein SQL ausführen. Kein DB-Read/Write. Keine Supabase-Verbindung. Keine Migration in `supabase/migrations/`. Keine ausführbare `.sql`-Datei.

---

## Draft Safety Notice

> **DRAFT ONLY — DO NOT APPLY.**
>
> This document is an architectural SQL draft, not a migration.
> It must not be executed against Staging, Production, Legacy, or any Supabase project.
> It is not placed in `supabase/migrations/` and is not deployable.
> **P5-E.9E.3B** static review is required before any SQL file may be prepared.
> A fresh backup and explicit apply approval are required before any future Staging apply.

**Deutsch:** Dieses Dokument ist ein **architektonischer SQL-Entwurf**, keine Migration und **nicht ausführbar**. Kein Apply auf Staging, Production, Legacy oder beliebige Supabase-Projekte. Liegt ausschließlich unter `docs/architecture/`. Vor jeder echten SQL-Datei ist **P5-E.9E.3B** Pflicht. Vor Staging-Apply: **frisches Backup + explizite Freigabe**.

---

## Executive Verdict

| Dimension | Verdict |
|-----------|---------|
| **P5-E.9E.3A** | **PASS** (DRAFT erstellt) |
| **P5-E.9E.3B** | **PASS** (Static Review) |
| **SQL Draft Status** | **DRAFT_ONLY_REVIEWED** |
| **DB Search Strategy** | **DOCUMENTED** (9E.3) |
| **Search Client Recall** | **CLIENT_RECALL_HARDENED** (9E.2) |
| **Search Runtime Evidence** | **OPEN** |
| **S-06 Search Recall** | **OPEN_BLOCKING** |
| **S-05 SEO/CSR** | **OPEN_BLOCKING** |
| **Product Activation** | **FAIL** |
| **Public Launch** | **NO-GO** |
| **Production Closure** | **NOT CLOSED** |

**Kernaussage:** Konkreter SQL-Entwurf für `search_documents`, gewichteten `search_vector`, RLS-Grundmodell und RPC `bl_search_public_content` — **ausschließlich als DRAFT** in diesem Dokument. **P5-E.9E.3B Static Review PASS** — Draft reviewfähig, **nicht apply-ready**. `SECURITY DEFINER` am Public-RPC: **REVIEW_REQUIRED** → vor Apply auf **SECURITY INVOKER** umstellen. Nächster Schritt: **P5-E.9E.4** (nach Nutzerfreigabe).

---

## HEAD / Working Tree / No-Apply-Bestätigung

| Check | Status |
|-------|--------|
| HEAD vor Gate | `af5f6d4` |
| SQL ausführen / SQL Apply | **Nein** |
| Migration in `supabase/migrations/` | **Nein** (Ordner existiert nicht) |
| Ausführbare `.sql`-Datei für Search | **Nein** |
| DB-Read / DB-Write / Supabase-Verbindung | **Nein** |
| Storage / Push / Deploy / Launch | **Nein** |
| `.env` geöffnet / geändert | **Nein** |
| Dumps / Backups geöffnet | **Nein** |

---

## Nutzerfreigabe-Zitat

> „Ja, ich gebe P5-E.9E.3A frei — Search SQL Draft, nur nicht-ausführbarer DRAFT ONLY SQL-Entwurf, kein SQL Apply, kein SQL ausführen, kein DB-Zugriff, keine Supabase-Verbindung, kein Push, kein Deploy, kein Launch, kein Production, kein Legacy.“

---

## Assumptions / Unknowns

| Thema | Annahme (Draft) | Unbekannt / Review in 9E.3B |
|-------|-----------------|------------------------------|
| `posts`-Spalten | `id`, `title`, `content`, `slug`, `excerpt`, `category`, `post_type`, `status`, `deleted_at`, `is_entity_view`, `canonical_entity_id`, `updated_at`, `created_at` — aus `core_schema_foundation.sql` | Ob Staging alle Spalten identisch hat |
| `canonical_slug` | **Nicht** als Spalte vorhanden → Draft nutzt `posts.slug` als `canonical_slug` | Ob später separates canonical-Feld geplant |
| `status = 'published'` | CHECK erlaubt nur `pending` \| `published`; Search nur `published` | Ob `submission_status` zusätzlich filtern muss |
| `deleted_at` | Existiert auf `posts`; Soft-Delete | Ob archivierte Posts anderes Feld nutzen |
| `content_origin` | **Nicht** auf `posts` — aus BLMETA via `bl_extract_blmeta_json(content)` | Exakte JSON-Pfade in Produktionsdaten |
| Body-Felder | Nur `posts.content` (HTML + BLMETA-Kommentar); **kein** `body`, `body_html`, `body_html_sanitized` | Serverseitige HTML-Strip-Funktion noch zu definieren |
| `excerpt` | Existiert; auto via Trigger `generate_post_slug_excerpt` | — |
| Aliases | `wiki_entity_aliases` (authenticated read) + BLMETA `entity_profile.aliases` / `slug_aliases` | Denormalisierung in Index-Builder Pflicht für Anon |
| `pg_trgm` | `create extension if not exists pg_trgm` in `core_schema_foundation.sql` | Ob auf Staging aktiv nach Apply |
| `unaccent` | **Nicht** im Schema → Draft **vermeidet** `unaccent`; Client-Normalisierung bleibt | Ob Extension später gewünscht |
| RPC-Owner | Vermutlich `postgres` / Supabase owner — **nicht final** | Owner-Capability wie Storage-Gate (42501-Risiko) |
| Release-Gate | `bl_is_release_unlocked()` existiert in `release_gate_lock.sql` | Search-RPC read-only — Gate nur für Populate-Job relevant |
| RLS neue Objekte | Eigene Policies auf `search_documents`; RPC `SECURITY DEFINER` | **9E.3B:** INVOKER bevorzugt; DEFINER nur für Populate |
| `SECURITY DEFINER` | Draft skizziert mit `set search_path = public` — **REVIEW_REQUIRED** | **9E.3B:** Public-RPC → **SECURITY INVOKER** empfohlen |

---

## Proposed Objects

| Objekt | Zweck | MVP |
|--------|-------|-----|
| `public.search_documents` | Normalisierte Public-Search-Zeilen | **Ja** |
| `public.search_synonyms` | Kuratiertes Synonym-Wörterbuch (optional) | Nein (statisches Dict im RPC für MVP) |
| `public.bl_normalize_search_query(text)` | Query-Normalisierung (Länge, Trim, unsafe chars) | **Ja** |
| `public.bl_build_search_vector(...)` | Gewichteter `tsvector`-Builder (intern) | **Ja** |
| `public.bl_search_public_content(text, jsonb)` | Einziger Public-Search-RPC | **Ja** |
| `idx_search_documents_vector` | GIN auf `search_vector` | **Ja** |
| `idx_search_documents_public_slug` | Partial btree `is_public`, `canonical_slug` | **Ja** |
| `idx_search_documents_source` | btree `(source_type, source_id)` | **Ja** |
| RLS auf `search_documents` | Public read `is_public = true`; keine anon/auth writes | **Ja** |

**Nicht im Draft:** Trigger auf `posts`, Populate-Jobs, `bl_rebuild_search_documents` — separat gatepflichtig (nach 9E.4A).

---

## DRAFT ONLY SQL — DO NOT APPLY

> **Warnung:** Alle folgenden Blöcke sind Entwürfe. Nicht ausführen. Nicht in Migrations kopieren ohne 9E.3B + Freigabe.

### Block 1 — Extensions (Referenz)

```sql
-- DRAFT ONLY — DO NOT APPLY
-- Extensions already present in core_schema_foundation.sql; verify on target DB before apply.
-- create extension if not exists pg_trgm with schema public;
-- unaccent: NOT used in this draft (avoid undeclared dependency).
```

### Block 2 — Table `search_documents`

```sql
-- DRAFT ONLY — DO NOT APPLY
-- Architectural draft for P5-E.9E.3A. Not a migration. Do not execute.

create table if not exists public.search_documents (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid,
  canonical_slug text not null,
  canonical_url text not null,
  title text not null,
  excerpt text,
  search_text text,
  aliases text[] not null default '{}'::text[],
  category text,
  entity_domain text,
  entity_subtype text,
  facets text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  relations_summary text,
  status text not null,
  content_origin text,
  evidence_tier text,
  completeness numeric,
  is_public boolean not null default false,
  is_canonical boolean not null default true,
  published_at timestamptz,
  updated_at timestamptz,
  search_vector tsvector,
  created_at timestamptz not null default now(),
  refreshed_at timestamptz not null default now(),

  constraint search_documents_source_type_check check (
    source_type in ('post', 'entity_view')
  ),
  constraint search_documents_status_check check (
    status in ('published')
  ),
  constraint search_documents_canonical_slug_check check (
    canonical_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  constraint search_documents_canonical_url_check check (
    canonical_url ~ '^/wiki/post/[a-z0-9]+(?:-[a-z0-9]+)*/$'
  )
);

comment on table public.search_documents is
  'DRAFT ONLY — normalized public search index rows. No raw HTML. No PII. Populate via separate gated job.';
comment on column public.search_documents.search_text is
  'Sanitized plain text only. BLMETA stripped. Never returned raw to clients.';
comment on column public.search_documents.is_public is
  'True only when all exclusion rules pass (published, not qa/test, not draft/pending).';
```

### Block 3 — Optional `search_synonyms` (Full Launch)

```sql
-- DRAFT ONLY — DO NOT APPLY

create table if not exists public.search_synonyms (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  expands_to text[] not null default '{}'::text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint search_synonyms_term_check check (
    term ~ '^[a-z0-9][a-z0-9_-]*$'
  )
);

comment on table public.search_synonyms is
  'DRAFT ONLY — Full Launch synonym dictionary. MVP uses static jsonb map inside RPC.';
```

### Block 4 — Indexes

```sql
-- DRAFT ONLY — DO NOT APPLY

create unique index if not exists idx_search_documents_canonical_slug_public
  on public.search_documents (canonical_slug)
  where is_public = true and is_canonical = true;

create index if not exists idx_search_documents_vector
  on public.search_documents using gin (search_vector);

create index if not exists idx_search_documents_public_updated
  on public.search_documents (updated_at desc)
  where is_public = true;

create index if not exists idx_search_documents_source
  on public.search_documents (source_type, source_id);

create index if not exists idx_search_documents_aliases_gin
  on public.search_documents using gin (aliases);

create index if not exists idx_search_documents_facets_gin
  on public.search_documents using gin (facets);
```

### Block 5 — Query normalizer (internal)

```sql
-- DRAFT ONLY — DO NOT APPLY

create or replace function public.bl_normalize_search_query(p_query text)
returns text
language plpgsql
immutable
as $$
declare
  v_norm text;
begin
  if p_query is null then
    return '';
  end if;

  v_norm := lower(trim(p_query));
  v_norm := regexp_replace(v_norm, '[^a-z0-9\s-]', ' ', 'g');
  v_norm := regexp_replace(v_norm, '\s+', ' ', 'g');
  v_norm := left(v_norm, 120);

  if v_norm ~ '[<>]' or v_norm ~ 'javascript:' then
    return '';
  end if;

  return v_norm;
end;
$$;

comment on function public.bl_normalize_search_query(text) is
  'DRAFT ONLY — fail-safe query normalizer. Returns empty for unsafe input.';
```

### Block 6 — Weighted `search_vector` builder (internal)

```sql
-- DRAFT ONLY — DO NOT APPLY
-- REVIEW REQUIRED: parity with BoundLoreSearchRecall.WEIGHTS (9E.2)

create or replace function public.bl_build_search_vector(
  p_title text,
  p_slug text,
  p_aliases text[],
  p_category text,
  p_entity_domain text,
  p_entity_subtype text,
  p_excerpt text,
  p_facets text[],
  p_tags text[],
  p_search_text text,
  p_relations_summary text
)
returns tsvector
language sql
immutable
as $$
  select
    setweight(to_tsvector('simple', coalesce(p_title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(p_slug, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(p_aliases, ' '), '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(p_category, '') || ' ' ||
      coalesce(p_entity_domain, '') || ' ' || coalesce(p_entity_subtype, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(p_excerpt, '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(array_to_string(p_facets, ' '), '') || ' ' ||
      coalesce(array_to_string(p_tags, ' '), '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(p_search_text, '')), 'C') ||
    setweight(to_tsvector('simple', coalesce(p_relations_summary, '')), 'C');
$$;

comment on function public.bl_build_search_vector is
  'DRAFT ONLY — weighted tsvector. A=title/slug/aliases, B=category/facets/excerpt, C=body/relations.';
```

### Block 7 — Static synonym map (MVP, inside RPC)

```sql
-- DRAFT ONLY — DO NOT APPLY
-- MVP synonym dictionary as immutable helper (mirrors js/search-recall-utils.js)

create or replace function public.bl_expand_search_terms(p_tokens text[])
returns text[]
language sql
immutable
as $$
  -- DRAFT ONLY — simplified expansion; full parity with client map required in 9E.3B.
  select coalesce(array_agg(distinct t), '{}'::text[])
  from (
    select unnest(p_tokens) as t
    union
    select 'creature' where exists (select 1 from unnest(p_tokens) x where x in ('monster','monsters','beast','beasts','mob','mobs','creature','creatures'))
    union
    select 'item' where exists (select 1 from unnest(p_tokens) x where x in ('artifact','artifacts','tool','tools','item','items','trinket','trinkets'))
    union
    select 'biome' where exists (select 1 from unnest(p_tokens) x where x in ('region','regions','zone','zones','biome','biomes'))
    union
    select 'resource' where exists (select 1 from unnest(p_tokens) x where x in ('resource','resources'))
    union
    select 'guide' where exists (select 1 from unnest(p_tokens) x where x in ('guide','guides'))
    union
    select 'guild' where exists (select 1 from unnest(p_tokens) x where x in ('guild','guilds'))
  ) q;
$$;
```

### Block 8 — Public Search RPC

```sql
-- DRAFT ONLY — DO NOT APPLY
-- SECURITY DEFINER: REVIEW REQUIRED in P5-E.9E.3B (privilege escalation risk)

create or replace function public.bl_search_public_content(
  search_query text,
  search_filters jsonb default '{}'::jsonb
)
returns table (
  id uuid,
  source_type text,
  canonical_slug text,
  canonical_url text,
  title text,
  excerpt text,
  category text,
  entity_domain text,
  entity_subtype text,
  score numeric,
  matched_fields text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_norm text;
  v_tokens text[];
  v_expanded text[];
  v_tsquery tsquery;
  v_limit int := 24;
begin
  -- Fail-closed defaults
  v_norm := public.bl_normalize_search_query(search_query);
  if v_norm = '' or length(v_norm) < 1 then
    return;
  end if;

  if coalesce((search_filters->>'limit')::int, 24) between 1 and 50 then
    v_limit := (search_filters->>'limit')::int;
  end if;

  v_tokens := regexp_split_to_array(v_norm, '\s+');
  v_expanded := public.bl_expand_search_terms(v_tokens);
  v_tsquery := plainto_tsquery('simple', array_to_string(v_expanded, ' '));

  return query
  select
    sd.id,
    sd.source_type,
    sd.canonical_slug,
    sd.canonical_url,
    sd.title,
    left(coalesce(sd.excerpt, ''), 200) as excerpt,
    sd.category,
    sd.entity_domain,
    sd.entity_subtype,
    (
      ts_rank_cd(sd.search_vector, v_tsquery, 32)::numeric * 100
      + case when sd.title ilike '%' || v_norm || '%' then 20 else 0 end
      + case when sd.canonical_slug = v_norm then 15 else 0 end
      + case when v_norm = any(sd.aliases) then 10 else 0 end
    ) as score,
    array_remove(array[
      case when sd.title ilike '%' || v_norm || '%' then 'title' end,
      case when sd.canonical_slug ilike '%' || v_norm || '%' then 'slug' end,
      case when v_norm = any(sd.aliases) then 'alias' end,
      case when sd.search_vector @@ v_tsquery then 'search_vector' end
    ], null) as matched_fields
  from public.search_documents sd
  where sd.is_public = true
    and sd.is_canonical = true
    and sd.status = 'published'
    and sd.canonical_slug !~ '^(qa-|test-|fixture-|contribution-)'
    and coalesce(sd.content_origin, '') !~* '(qa|test|prototype_fixture|internal_test)'
    and sd.search_vector @@ v_tsquery
  order by score desc, sd.updated_at desc nulls last, sd.canonical_slug asc
  limit v_limit;

exception
  when others then
    -- Fail-closed: no SQL error details to client
    return;
end;
$$;

comment on function public.bl_search_public_content(text, jsonb) is
  'DRAFT ONLY — public search RPC. Returns no raw search_text, no BLMETA, no PII. Fail-closed on error.';

-- TODO (9E.3B): GRANT EXECUTE ON FUNCTION public.bl_search_public_content TO anon, authenticated;
-- TODO (9E.3B): REVOKE direct SELECT on search_documents from anon if bypass risk exists.
```

### Block 9 — RLS enable + policies (draft)

```sql
-- DRAFT ONLY — DO NOT APPLY

alter table public.search_documents enable row level security;

drop policy if exists search_documents_public_read on public.search_documents;
create policy search_documents_public_read
  on public.search_documents
  for select
  using (
    is_public = true
    and is_canonical = true
    and status = 'published'
  );

-- No INSERT/UPDATE/DELETE policies for anon or authenticated.
-- Index population only via SECURITY DEFINER admin job (separate gate).

alter table public.search_synonyms enable row level security;

drop policy if exists search_synonyms_public_read on public.search_synonyms;
create policy search_synonyms_public_read
  on public.search_synonyms
  for select
  using (is_active = true);

-- TODO (9E.3B): Admin-only write policies for search_synonyms.
```

### Block 10 — Exclusion helper (for future populate job, not executed here)

```sql
-- DRAFT ONLY — DO NOT APPLY
-- Reference logic for index builder (populate gate separate from this draft).

create or replace function public.bl_search_row_is_public(
  p_status text,
  p_deleted_at timestamptz,
  p_slug text,
  p_title text,
  p_content_origin text,
  p_tags text[]
)
returns boolean
language sql
immutable
as $$
  select
    coalesce(p_status, '') = 'published'
    and p_deleted_at is null
    and coalesce(p_slug, '') !~ '^(qa-|test-|fixture-|contribution-)'
    and coalesce(p_title, '') !~* '^Contribution:'
    and coalesce(p_content_origin, '') !~* '(qa|test|prototype_fixture|internal_test)'
    and not (coalesce(p_tags, '{}'::text[]) @> array['exclude_public']::text[]);
$$;

comment on function public.bl_search_row_is_public is
  'DRAFT ONLY — mirrors BoundLoreSearchRecall.isPublicSearchable(). Used by future populate job only.';
```

---

## RLS / Security Model

### Warum `search_documents` keine privaten Daten enthalten darf

Die Tabelle ist eine **denormalisierte Public-Index-Schicht**. Jede Zeile mit `is_public = true` ist für Anon und Authenticated lesbar (direkt oder via RPC). Private, pending oder interne Inhalte dürfen **niemals** indexiert werden — ein Fehler im Populate-Job ist ein **Data-Leak**, nicht nur ein Ranking-Bug.

### Warum RLS trotzdem nötig ist

- Direkter `supabase.from('search_documents')`-Zugriff muss **nicht** mehr Daten liefern als der RPC.
- Defense in depth: selbst bei Client-Bypass nur `is_public = true` sichtbar.
- Schreibzugriffe für `anon`/`authenticated` **verboten** — nur kontrollierter Admin/Definer-Populate-Pfad (separates Gate).

### Rollenmodell (Draft)

| Rolle | `search_documents` SELECT | Writes | RPC `bl_search_public_content` |
|-------|---------------------------|--------|--------------------------------|
| `anon` | Nur via RLS `is_public` | **Nein** | EXECUTE (TODO Grant nach Review) |
| `authenticated` | Wie anon | **Nein** | EXECUTE |
| `service_role` | Voll (Populate only) | Nur gated Job | Nicht für Client |
| Admin | Über bestehende Admin-Pfade | Rebuild job only | Wie public |

### Release-Gate

- **Reads:** Search-RPC ist read-only; Release-Gate-Lock blockiert keine Public-Reads.
- **Index-Refresh:** Bei `contribution_locked = true` sollten **keine neuen** Index-Zeilen aus pending/contribution-Publishes entstehen — Populate-Job muss `bl_is_release_unlocked()` respektieren oder nur bereits published Canonicals reindexieren (9E.3B: Populate separates Gate 9E.4A).
- **Fail-closed:** Fehlende `release_gate`-Zeile = locked (bestehendes Verhalten).

### Failure Modes (fail-closed)

| Fehler | Verhalten |
|--------|-----------|
| Leere/unsafe Query | Leeres Resultset |
| RPC exception | Leeres Resultset, kein SQLSTATE an Client |
| Fehlender Index | Leeres Resultset |
| `search_vector` null | Zeile nicht treffend |
| Direkter Table-Scan | RLS filtert non-public |

### Owner-/Permission-Risiken (vor Apply)

- `42501 must be owner` — wie P5-E.8A Storage; Dashboard SQL Editor / Owner-Pfad erforderlich.
- `SECURITY DEFINER` ohne harte `search_path` — Schema-Injection-Risiko.
- Grant zu breit auf `search_documents` — Bypass von Exclusion-Logik.

### `SECURITY DEFINER` — Review-Pflicht

Draft nutzt Definer damit RPC konsistent Ergebnisse liefert unabhängig von direkten Table-Policies. **9E.3B Ergebnis:** **REVIEW_REQUIRED** — Public-RPC sollte auf **SECURITY INVOKER** umgestellt werden; RLS + doppelter WHERE-Filter reichen. DEFINER nur für separates Populate/Rebuild-RPC (Admin-only, Gate 9E.4A). `SET search_path` fixiert — **PASS**. Keine dynamischen SQL-Fragmente — **PASS**. Siehe `p5-search-sql-static-review.md`.

---

## RPC Contract

### Input

| Parameter | Typ | Default | Regeln |
|-----------|-----|---------|--------|
| `search_query` | `text` | — | Max 120 Zeichen nach Normalisierung; unsafe → leer |
| `search_filters` | `jsonb` | `'{}'` | Optional: `limit` (1–50), später `category`, `entity_subtype` |

### Output (keine sensitiven Felder)

| Spalte | Hinweis |
|--------|---------|
| `id` | `search_documents.id` |
| `source_type` | `post` \| `entity_view` |
| `canonical_slug` | slug-validiert |
| `canonical_url` | `/wiki/post/<slug>/` |
| `title` | plain text |
| `excerpt` | max 200 Zeichen, kein HTML |
| `category`, `entity_domain`, `entity_subtype` | plain text |
| `score` | `ts_rank_cd` + Bonus |
| `matched_fields` | `title`, `slug`, `alias`, `search_vector` |

**Nicht im Output:** `search_text`, rohes `content`, BLMETA, `source_id` (optional später), PII, `content_origin` (intern).

---

## Refresh / Sync Strategy

| Strategie | MVP | Full Launch | Draft-Status |
|-----------|-----|-------------|--------------|
| Manual refresh nach Publish | **Empfohlen** | Ja | Separates Gate (9E.4A) |
| Trigger auf `posts` | Nein | Optional | Nicht in diesem Draft |
| Scheduled refresh | Nein | Ja | Dokumentiert only |
| Materialized View | Alternative | Optional | Siehe 9E.3 Strategie |
| Build/Export-basiert | Staging MVP | Ja | Kleine kontrollierte Befüllung |

**MVP-Empfehlung dieses Drafts:**

- **Kein automatischer Write-Path** in 9E.3A.
- Erst **Staging-Apply** (9E.4A) mit Backup, dann **kontrollierte Populate** nur für published Canonicals.
- Populate-Logik nutzt `bl_extract_blmeta_json`, `wiki_entity_aliases` (server-side join), HTML-Strip — **Parität mit `postToRecallRecord()`**.
- **Nicht indexieren:** Kommentare, Reports, Notifications, Admin-Actions.

---

## Negative Test Requirements

Vor Apply/Closure (Staging 9E.4 / Production 9E.5):

| # | Test | Erwartung |
|---|------|-----------|
| 1 | `monster` | ≥1 Creature-Treffer |
| 2 | `beast` | Creature (Synonym) |
| 3 | `artifact` | Item |
| 4 | `basalt` | Biome |
| 5 | Body-only Begriff | Treffer ohne Title-Match |
| 6 | Alias-only Begriff | Treffer via `aliases` |
| 7 | Draft-Slug | 0 Treffer |
| 8 | Pending-Slug | 0 Treffer |
| 9 | `qa-*` / `test-*` / `fixture-*` | 0 Treffer |
| 10 | Admin/Report/Notification-Inhalt | 0 Treffer |
| 11 | BLMETA in Response | nicht sichtbar |
| 12 | `<script>` / unsafe Query | 0 Treffer; kein Leak |
| 13 | Leere Query | leeres Resultset |
| 14 | Query > 120 Zeichen | abgeschnitten / fail-safe |
| 15 | Anon RPC | nur public Ergebnisse |
| 16 | Authenticated direct INSERT auf `search_documents` | verweigert |
| 17 | Release-Gate locked | keine neuen pending-Leaks via Refresh |
| 18 | RPC SQL-Fehler | keine Details an Client |

Fixture-Baseline: `qa/p5-search-recall-corpus.json` + `p5-search-client-hardening-fixtures.*` (92/92).

---

## Open Review Questions

1. **Finaler Datenursprung** für initiale Population — nur `posts` mit `is_entity_view` oder alle published?
2. **Tabelle vs. Materialized View** — bleibt Tabelle für MVP korrekt?
3. **Ist `SECURITY DEFINER` nötig** oder reicht INVOKER + RLS?
4. **Welche Rolle wird Owner** der Funktionen/Tabellen?
5. **Release-Gate im RPC** — nur Populate-Job oder auch Read-Guard?
6. **`pg_trgm` zusätzlich** zu FTS für Fuzzy — Staging-Performance?
7. **`unaccent`** — bewusst vermieden; reicht `simple` FTS config?
8. **Aliases aus `wiki_entity_aliases`** — wie ohne authenticated-only RLS-Leak denormalisieren?
9. **Audit** für Index-Refresh — `release_gate_audit`-Pattern übernehmen?
10. **Performance-Grenzen** — max Zeilen in `search_documents`, RPC timeout, `limit` cap 50?

---

## Required Future Gates

| Gate | Zweck | Apply |
|------|-------|-------|
| ~~**P5-E.9E.3B**~~ | Static Review dieses Drafts (RLS, DEFINER, Leakage, Grants) | **PASS** |
| **P5-E.9E.4** | Staging Search Verification (Runtime) | Read-only bevorzugt; **STOPP** — Nutzerfreigabe |
| ~~**P5-E.9E.4A**~~ | Staging Search Apply + Populate | **PASS** — `p5-search-db-fts-staging-apply-report.md` |
| **P5-E.9E.5** | Production Search Verification | **STOPP** |

**S-06** bleibt **OPEN_BLOCKING** bis mindestens 9E.3B + 9E.4 PASS.

---

## Status Matrix

| Item | Status |
|------|--------|
| P5-E.9E.3A | **PASS** |
| P5-E.9E.3B | **PASS** |
| Search SQL Draft | **DRAFT_ONLY_REVIEWED** |
| Search SQL Static Review | **PASS** |
| SECURITY DEFINER (Public-RPC) | **REVIEW_REQUIRED** |
| Search DB Strategy | **DOCUMENTED** |
| Search Client Recall | **CLIENT_RECALL_HARDENED** |
| Search Runtime Evidence | **OPEN** |
| S-06 Search Recall | **OPEN_BLOCKING** |
| S-05 SEO/CSR | **OPEN_BLOCKING** |
| Production Closure | **NOT CLOSED** |
| Product Activation | **FAIL** |
| Public Launch | **NO-GO** |

**Empfohlener nächster Gate:** **P5-E.9E.4** — Staging Search Verification (read-only bevorzugt; Nutzerfreigabe nötig)

---

## Verweise

| Artefakt | Pfad |
|----------|------|
| Static Review | `docs/architecture/p5-search-sql-static-review.md` |
| DB Strategy | `docs/architecture/p5-search-db-strategy.md` |
| Client Recall Utility | `js/search-recall-utils.js` |
| Posts Schema | `supabase/core_schema_foundation.sql` |
| BLMETA Extract | `bl_extract_blmeta_json()` |
| Release Gate | `supabase/release_gate_lock.sql` |
| Recall Corpus | `qa/fixtures/p5-search-recall-corpus.json` |

---

*Dokumentversion: P5-E.9E.3A PASS + P5-E.9E.3B PASS. DRAFT ONLY — DO NOT APPLY. SQL Draft Status: DRAFT_ONLY_REVIEWED. Keine Secrets. Kein SQL ausgeführt. Keine Migration erstellt. Kein DB-Zugriff.*
