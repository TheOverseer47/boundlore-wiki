-- phase_a_observations_foundation.sql
--
-- Phase A: Observation layer — separates user input from canonical knowledge.
-- Requires: discovery_entity_backbone.sql, sprint1_knowledge_graph_foundation.sql
-- Recommended: sprint1_sync_rpc.sql (provides bl_slugify_text, bl_build_canonical_key)
-- Run manually in Supabase SQL Editor.
--
-- Adds:
--   wiki_observations
--   wiki_observation_entities
--   wiki_entity_claims
--   posts.canonical_entity_id, posts.is_entity_view
--   bl_match_entities()
--   bl_register_observation() — P5-C.1: tutorial-ack gate + P5-E release-lock hook (file only)

begin;

create extension if not exists pg_trgm;

-- -----------------------------------------------------
-- Observation source enum via check constraint
-- -----------------------------------------------------
create table if not exists public.wiki_observations (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  source_post_id uuid references public.posts(id) on delete set null,
  category_slug text not null,
  subcategory_slug text,
  entity_name text not null,
  world_name text,
  region_name text,
  payload jsonb not null default '{}'::jsonb,
  observation_source text not null default 'user'
    check (observation_source in ('user', 'datamine', 'admin', 'migration')),
  status text not null default 'submitted'
    check (status in ('draft', 'submitted', 'validating', 'approved', 'indexed', 'verified', 'needs_revision', 'rejected', 'superseded')),
  match_summary jsonb not null default '{}'::jsonb,
  review_note text,
  patch_version text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_wiki_observations_author on public.wiki_observations(author_id);
create index if not exists idx_wiki_observations_status on public.wiki_observations(status);
create index if not exists idx_wiki_observations_category on public.wiki_observations(category_slug, subcategory_slug);
create index if not exists idx_wiki_observations_source_post on public.wiki_observations(source_post_id);
create index if not exists idx_wiki_observations_payload_gin on public.wiki_observations using gin(payload);
create index if not exists idx_wiki_observations_entity_name_trgm on public.wiki_observations using gin(entity_name gin_trgm_ops);

-- Links between an observation and the entities it touches (primary + related).
create table if not exists public.wiki_observation_entities (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.wiki_observations(id) on delete cascade,
  entity_id uuid references public.wiki_entities(id) on delete set null,
  role text not null default 'primary'
    check (role in ('primary', 'related', 'loot', 'location', 'guide')),
  proposed_canonical_key text,
  proposed_entity_type text,
  proposed_name text,
  match_type text not null default 'new'
    check (match_type in ('exact', 'alias', 'fuzzy', 'new', 'admin_override')),
  match_score numeric(5,2) not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists uq_wiki_observation_entities_role_key
  on public.wiki_observation_entities(
    observation_id,
    role,
    coalesce(proposed_canonical_key, proposed_name, '')
  );

create index if not exists idx_wiki_observation_entities_obs on public.wiki_observation_entities(observation_id);
create index if not exists idx_wiki_observation_entities_entity on public.wiki_observation_entities(entity_id);

-- Aggregated facts derived from one or more observations.
create table if not exists public.wiki_entity_claims (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.wiki_entities(id) on delete cascade,
  claim_key text not null,
  claim_value jsonb not null,
  confidence integer not null default 50 check (confidence >= 0 and confidence <= 100),
  supporting_observation_count integer not null default 1,
  claim_status text not null default 'active'
    check (claim_status in ('active', 'conflicted', 'deprecated', 'superseded')),
  claim_status_reason text,
  first_observation_id uuid references public.wiki_observations(id) on delete set null,
  verified boolean not null default false,
  verified_by uuid references public.profiles(id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_id, claim_key)
);

create index if not exists idx_wiki_entity_claims_entity on public.wiki_entity_claims(entity_id);
create index if not exists idx_wiki_entity_claims_status on public.wiki_entity_claims(claim_status);

-- Posts: link generated views to canonical entities.
alter table public.posts
  add column if not exists canonical_entity_id uuid references public.wiki_entities(id) on delete set null,
  add column if not exists is_entity_view boolean not null default false;

create index if not exists idx_posts_canonical_entity on public.posts(canonical_entity_id)
  where canonical_entity_id is not null;

create unique index if not exists uq_posts_canonical_entity_view
  on public.posts(canonical_entity_id)
  where is_entity_view = true and deleted_at is null and status = 'published';

-- Updated_at trigger for observations.
create or replace function public.set_wiki_observation_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wiki_observations_updated_at on public.wiki_observations;
create trigger trg_wiki_observations_updated_at
before update on public.wiki_observations
for each row execute function public.set_wiki_observation_updated_at();

drop trigger if exists trg_wiki_entity_claims_updated_at on public.wiki_entity_claims;
create trigger trg_wiki_entity_claims_updated_at
before update on public.wiki_entity_claims
for each row execute function public.set_wiki_observation_updated_at();

-- -----------------------------------------------------
-- Helpers (idempotent; mirrors sprint1_sync_rpc.sql)
-- -----------------------------------------------------
create or replace function public.bl_slugify_text(p_input text)
returns text language sql immutable as $$
  select case
    when p_input is null or btrim(p_input) = '' then 'entity'
    else trim(both '-' from regexp_replace(lower(p_input), '[^a-z0-9]+', '-', 'g'))
  end;
$$;

create or replace function public.bl_build_canonical_key(
  p_entity_type text,
  p_entity_name text,
  p_world_name text default null,
  p_region_name text default null
)
returns text language sql immutable as $$
  select trim(both '-' from regexp_replace(
    lower(
      coalesce(nullif(btrim(p_entity_type), ''), 'entity') || '|' ||
      coalesce(nullif(btrim(p_entity_name), ''), 'unnamed') || '|' ||
      coalesce(nullif(btrim(p_world_name), ''), '_') || '|' ||
      coalesce(nullif(btrim(p_region_name), ''), '_')
    ),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

create or replace function public.bl_normalize_search_text(p_input text)
returns text
language sql immutable as $$
  select trim(both from lower(regexp_replace(coalesce(p_input, ''), '[^a-z0-9\s-]', '', 'g')));
$$;

create or replace function public.bl_map_category_to_entity_type(
  p_category_slug text,
  p_subcategory_slug text default null
)
returns text
language sql immutable as $$
  select coalesce(
    case lower(coalesce(p_category_slug, ''))
      when 'creatures' then case lower(coalesce(p_subcategory_slug, ''))
        when 'mounts' then 'mount'
        when 'monsters' then 'monster'
        when 'races' then 'race'
        when 'npcs' then 'npc'
        else 'creature'
      end
      when 'items' then 'item'
      when 'locations' then 'location'
      when 'biomes' then 'biome'
      when 'dungeons' then 'dungeon'
      when 'classes' then 'class'
      when 'crafting' then 'recipe'
      when 'lore' then 'lore'
      when 'guides' then 'guide'
      else 'entity'
    end,
    'entity'
  );
$$;

-- -----------------------------------------------------
-- Entity matching RPC (live search for wizard autocomplete)
-- -----------------------------------------------------
create or replace function public.bl_match_entities(
  p_query text,
  p_entity_type text default null,
  p_category_slug text default null,
  p_world_name text default null,
  p_region_name text default null,
  p_limit integer default 8
)
returns table (
  entity_id uuid,
  canonical_name text,
  slug text,
  entity_type text,
  category_slug text,
  canonical_key text,
  match_type text,
  match_score numeric,
  observation_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_query text := public.bl_normalize_search_text(p_query);
  v_limit integer := greatest(1, least(coalesce(p_limit, 8), 20));
  v_entity_type text := nullif(lower(btrim(coalesce(p_entity_type, ''))), '');
  v_canonical_key text;
  v_exact_count integer := 0;
begin
  if length(v_query) < 2 then
    return;
  end if;

  if p_entity_type is not null and length(btrim(coalesce(p_query, ''))) >= 2 then
    v_canonical_key := public.bl_build_canonical_key(
      coalesce(v_entity_type, public.bl_map_category_to_entity_type(p_category_slug)),
      p_query,
      p_world_name,
      p_region_name
    );

    select count(*) into v_exact_count
    from public.wiki_entities e
    where e.canonical_key = v_canonical_key
      and e.status in ('active', 'draft');

    if v_exact_count > 0 then
      return query
      select
        e.id,
        e.canonical_name,
        e.slug,
        e.entity_type,
        e.category_slug,
        e.canonical_key,
        'exact'::text,
        100::numeric,
        coalesce(obs.cnt, 0)
      from public.wiki_entities e
      left join lateral (
        select count(*) as cnt
        from public.wiki_observation_entities oe
        join public.wiki_observations o on o.id = oe.observation_id
        where oe.entity_id = e.id and o.status not in ('rejected', 'superseded')
      ) obs on true
      where e.canonical_key = v_canonical_key
        and e.status in ('active', 'draft')
      limit 1;
      return;
    end if;
  end if;

  return query
  select
    matched.entity_id,
    matched.canonical_name,
    matched.slug,
    matched.entity_type,
    matched.category_slug,
    matched.canonical_key,
    matched.match_type,
    matched.match_score,
    matched.observation_count
  from (
    -- Alias match
    select
      e.id as entity_id,
      e.canonical_name,
      e.slug,
      e.entity_type,
      e.category_slug,
      e.canonical_key,
      'alias'::text as match_type,
      92::numeric as match_score,
      coalesce(obs.cnt, 0) as observation_count
    from public.wiki_entity_aliases a
    join public.wiki_entities e on e.id = a.entity_id
    left join lateral (
      select count(*) as cnt
      from public.wiki_observation_entities oe
      join public.wiki_observations o on o.id = oe.observation_id
      where oe.entity_id = e.id and o.status not in ('rejected', 'superseded')
    ) obs on true
    where a.normalized_alias = v_query
      and e.status in ('active', 'draft')
      and (v_entity_type is null or e.entity_type = v_entity_type)
      and (p_category_slug is null or e.category_slug = p_category_slug)

    union all

    -- Name prefix / contains match
    select
      e.id as entity_id,
      e.canonical_name,
      e.slug,
      e.entity_type,
      e.category_slug,
      e.canonical_key,
      case when public.bl_normalize_search_text(e.canonical_name) = v_query then 'exact' else 'fuzzy' end as match_type,
      (similarity(public.bl_normalize_search_text(e.canonical_name), v_query) * 100)::numeric as match_score,
      coalesce(obs.cnt, 0) as observation_count
    from public.wiki_entities e
    left join lateral (
      select count(*) as cnt
      from public.wiki_observation_entities oe
      join public.wiki_observations o on o.id = oe.observation_id
      where oe.entity_id = e.id and o.status not in ('rejected', 'superseded')
    ) obs on true
    where e.status in ('active', 'draft')
      and (v_entity_type is null or e.entity_type = v_entity_type)
      and (p_category_slug is null or e.category_slug = p_category_slug)
      and (
        public.bl_normalize_search_text(e.canonical_name) = v_query
        or public.bl_normalize_search_text(e.canonical_name) like v_query || '%'
        or public.bl_normalize_search_text(e.canonical_name) like '%' || v_query || '%'
        or similarity(public.bl_normalize_search_text(e.canonical_name), v_query) > 0.35
      )
  ) matched
  order by matched.match_score desc, matched.observation_count desc, matched.canonical_name asc
  limit v_limit;
end;
$$;

-- -----------------------------------------------------
-- Register observation + pending discovery post
-- SECURITY DEFINER retained: cross-table writes (wiki_observations, posts) require
-- elevated privileges; invoker would still hit restrictive posts RLS inconsistently.
-- P5-C.1 gates: auth.uid(), user_submission_acks (or admin), P5-E release_lock hook.
-- -----------------------------------------------------
create or replace function public.bl_register_observation(
  p_category_slug text,
  p_subcategory_slug text,
  p_entity_name text,
  p_world_name text,
  p_region_name text,
  p_payload jsonb,
  p_title text default null,
  p_content_html text default null,
  p_excerpt text default null,
  p_related_entities jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_is_admin boolean := false;
  v_entity_type text;
  v_canonical_key text;
  v_observation_id uuid;
  v_post_id uuid;
  v_post_slug text;
  v_match record;
  v_match_summary jsonb := '[]'::jsonb;
  v_primary_entity_id uuid;
  v_rel jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required to register observation'
      using errcode = '42501';
  end if;

  select exists (
    select 1 from public.profiles
    where id = v_user_id and role = 'admin'
  ) into v_is_admin;

  -- P5-C.1 (S+-04): Tutorial acknowledgement gate — mirrors posts_insert_requires_tutorial_ack.
  -- SECURITY DEFINER must not bypass this server-side ack requirement.
  if not v_is_admin and not exists (
    select 1
    from public.user_submission_acks usa
    where usa.user_id = v_user_id
  ) then
    raise exception 'Tutorial acknowledgement required before registering observation'
      using errcode = '42501';
  end if;

  -- P5-E RELEASE GATE HOOK:
  -- Before production application, this RPC must also check the server-side
  -- release_gate/contribution lock. Missing/locked config must block writes.
  -- Do not allow this SECURITY DEFINER RPC to bypass the release lock.

  if length(btrim(coalesce(p_entity_name, ''))) < 2 then
    raise exception 'Entity name is required';
  end if;

  v_entity_type := public.bl_map_category_to_entity_type(p_category_slug, p_subcategory_slug);
  v_canonical_key := public.bl_build_canonical_key(v_entity_type, p_entity_name, p_world_name, p_region_name);
  v_post_slug := public.bl_slugify_text(coalesce(nullif(p_title, ''), p_entity_name)) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  -- Build match summary for primary entity.
  select * into v_match
  from public.bl_match_entities(p_entity_name, v_entity_type, p_category_slug, p_world_name, p_region_name, 1)
  order by match_score desc
  limit 1;

  if v_match.entity_id is not null and v_match.match_score >= 85 then
    v_primary_entity_id := v_match.entity_id;
    v_match_summary := v_match_summary || jsonb_build_array(jsonb_build_object(
      'role', 'primary',
      'entity_id', v_match.entity_id,
      'canonical_name', v_match.canonical_name,
      'match_type', v_match.match_type,
      'match_score', v_match.match_score
    ));
  else
    v_match_summary := v_match_summary || jsonb_build_array(jsonb_build_object(
      'role', 'primary',
      'entity_id', null,
      'proposed_canonical_key', v_canonical_key,
      'proposed_name', p_entity_name,
      'match_type', 'new',
      'match_score', 0
    ));
  end if;

  insert into public.wiki_observations (
    author_id, category_slug, subcategory_slug, entity_name,
    world_name, region_name, payload, status, match_summary
  ) values (
    v_user_id, p_category_slug, p_subcategory_slug, p_entity_name,
    p_world_name, p_region_name, coalesce(p_payload, '{}'::jsonb), 'submitted', v_match_summary
  )
  returning id into v_observation_id;

  -- Primary entity link.
  insert into public.wiki_observation_entities (
    observation_id, entity_id, role,
    proposed_canonical_key, proposed_entity_type, proposed_name,
    match_type, match_score
  ) values (
    v_observation_id, v_primary_entity_id, 'primary',
    v_canonical_key, v_entity_type, p_entity_name,
    case when v_primary_entity_id is not null then coalesce(v_match.match_type, 'exact') else 'new' end,
    coalesce(v_match.match_score, 0)
  );

  -- Related entities from payload (loot, locations, etc.).
  for v_rel in select value from jsonb_array_elements(coalesce(p_related_entities, '[]'::jsonb))
  loop
    insert into public.wiki_observation_entities (
      observation_id, entity_id, role,
      proposed_canonical_key, proposed_entity_type, proposed_name,
      match_type, match_score
    ) values (
      v_observation_id,
      nullif(v_rel ->> 'entity_id', '')::uuid,
      coalesce(nullif(v_rel ->> 'role', ''), 'related'),
      nullif(v_rel ->> 'canonical_key', ''),
      coalesce(nullif(v_rel ->> 'entity_type', ''), 'entity'),
      nullif(v_rel ->> 'name', ''),
      coalesce(nullif(v_rel ->> 'match_type', ''), 'new'),
      coalesce(nullif(v_rel ->> 'match_score', '')::numeric, 0)
    );
  end loop;

  -- Pending discovery post (existing moderation flow).
  insert into public.posts (
    author_id, slug, title, content, excerpt,
    status, post_type, category, guide_subcategory,
    is_discovery, submission_status
  ) values (
    v_user_id,
    v_post_slug,
    coalesce(nullif(p_title, ''), p_entity_name),
    coalesce(p_content_html, '<p>Discovery pending review.</p>'),
    coalesce(nullif(p_excerpt, ''), left(p_entity_name, 200)),
    'pending',
    'discovery',
    p_category_slug,
    null,
    true,
    'submitted'
  )
  returning id into v_post_id;

  update public.wiki_observations
  set source_post_id = v_post_id
  where id = v_observation_id;

  return jsonb_build_object(
    'observation_id', v_observation_id,
    'post_id', v_post_id,
    'post_slug', v_post_slug,
    'primary_entity_id', v_primary_entity_id,
    'primary_match_type', case when v_primary_entity_id is not null then v_match.match_type else 'new' end,
    'match_summary', v_match_summary,
    'is_new_entity', v_primary_entity_id is null
  );
end;
$$;

-- -----------------------------------------------------
-- RLS
-- -----------------------------------------------------
alter table public.wiki_observations enable row level security;
alter table public.wiki_observation_entities enable row level security;
alter table public.wiki_entity_claims enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'wiki_observations_select_own_or_admin') then
    create policy wiki_observations_select_own_or_admin on public.wiki_observations for select using (
      author_id = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'wiki_observations_insert_own') then
    create policy wiki_observations_insert_own on public.wiki_observations for insert with check (author_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where policyname = 'wiki_observation_entities_select_own_or_admin') then
    create policy wiki_observation_entities_select_own_or_admin on public.wiki_observation_entities for select using (
      exists (
        select 1 from public.wiki_observations o
        where o.id = observation_id
          and (o.author_id = auth.uid() or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'))
      )
    );
  end if;

  if not exists (select 1 from pg_policies where policyname = 'wiki_entity_claims_select_authenticated') then
    create policy wiki_entity_claims_select_authenticated on public.wiki_entity_claims for select using (auth.role() = 'authenticated');
  end if;

  if not exists (select 1 from pg_policies where policyname = 'wiki_entity_claims_write_admin') then
    create policy wiki_entity_claims_write_admin on public.wiki_entity_claims for all using (
      exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
    );
  end if;
end;
$$;

grant execute on function public.bl_match_entities(text, text, text, text, text, integer) to authenticated;

-- P5-C.1: GRANT to authenticated is safe only because bl_register_observation enforces
-- auth.uid() + tutorial-ack (or admin) before any write. P5-E release_gate enforcement
-- must be added before DB application / production use.
grant execute on function public.bl_register_observation(text, text, text, text, text, jsonb, text, text, text, jsonb) to authenticated;

commit;
