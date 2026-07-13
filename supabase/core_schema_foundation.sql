-- core_schema_foundation.sql
--
-- P5-STAGING.5C curated core schema extracted from legacy schema-only dump.
-- Source: backups/legacy-schema-only/legacy-public-schema-only-20260713-192641.sql
-- Legacy ref: ohkoojpzmptdfyowdgog (read-only export; not applied in 5C)
--
-- Idempotent foundation for empty staging public schema.
-- No row data. No top-level INSERT/COPY. P5 security patches remain separate files.
--
-- Excluded functions: bl_register_observation (phase_a_observations_foundation.sql),
-- rpc_sync_discovery_submission (sprint1_sync_rpc.sql), release_gate (release_gate_lock.sql).

begin;

create extension if not exists pgcrypto with schema extensions;

--
-- TOC entry 110 (class 2615 OID 2200)
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- TOC entry 4385 (class 0 OID 0)
-- Dependencies: 110
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- TOC entry 521 (class 1255 OID 18523)
-- Name: bl_build_canonical_key(text, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.bl_build_canonical_key(p_entity_type text, p_entity_name text, p_world_name text DEFAULT NULL::text, p_region_name text DEFAULT NULL::text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
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


--
-- TOC entry 522 (class 1255 OID 18524)
-- Name: bl_compute_sync_idempotency_key(uuid, text, timestamp with time zone, text, text, integer, integer, integer, jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.bl_compute_sync_idempotency_key(p_source_post_id uuid, p_operation_type text, p_source_post_updated_at timestamp with time zone, p_entity_type text, p_schema_key text, p_version_major integer, p_version_minor integer, p_version_patch integer, p_payload jsonb, p_override jsonb) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select encode(extensions.digest(convert_to(
    coalesce(p_source_post_id::text, '') || '|' ||
    coalesce(p_operation_type, '') || '|' ||
    coalesce(p_source_post_updated_at::text, '') || '|' ||
    coalesce(p_entity_type, '') || '|' ||
    coalesce(p_schema_key, '') || '|' ||
    coalesce(p_version_major::text, '') || '.' || coalesce(p_version_minor::text, '') || '.' || coalesce(p_version_patch::text, '') || '|' ||
    coalesce(p_payload::text, '{}') || '|' ||
    coalesce(p_override::text, 'null'),
    'utf8'
  ), 'sha256'), 'hex');
$$;


--
-- TOC entry 519 (class 1255 OID 18521)
-- Name: bl_extract_blmeta_json(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.bl_extract_blmeta_json(p_html text) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
declare
  v_json_text text;
begin
  if p_html is null then
    return '{}'::jsonb;
  end if;

  select (regexp_match(p_html, '(?is)<!--BLMETA\\s+(.*?)\\s*-->'))[1]
    into v_json_text;

  if v_json_text is null then
    return '{}'::jsonb;
  end if;

  begin
    return v_json_text::jsonb;
  exception when others then
    return '{}'::jsonb;
  end;
end;
$$;


--
-- TOC entry 558 (class 1255 OID 18768)
-- Name: bl_map_category_to_entity_type(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.bl_map_category_to_entity_type(p_category_slug text, p_subcategory_slug text DEFAULT NULL::text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
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


--
-- TOC entry 559 (class 1255 OID 18769)
-- Name: bl_match_entities(text, text, text, text, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.bl_match_entities(p_query text, p_entity_type text DEFAULT NULL::text, p_category_slug text DEFAULT NULL::text, p_world_name text DEFAULT NULL::text, p_region_name text DEFAULT NULL::text, p_limit integer DEFAULT 8) RETURNS TABLE(entity_id uuid, canonical_name text, slug text, entity_type text, category_slug text, canonical_key text, match_type text, match_score numeric, observation_count bigint)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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


--
-- TOC entry 524 (class 1255 OID 18541)
-- Name: bl_normalize_discovery_relation_code(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.bl_normalize_discovery_relation_code(p_relation_type text, p_relation_group text DEFAULT NULL::text) RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select case lower(replace(replace(coalesce(p_relation_type, ''), '-', '_'), ' ', '_'))
    when 'related_creature' then 'RELATED_TO'
    when 'related_discovery' then 'RELATED_TO'
    when 'related_to' then 'RELATED_TO'
    when 'located_in' then 'FOUND_IN'
    when 'found_in' then 'FOUND_IN'
    when 'observed_in' then 'FOUND_IN'
    when 'observed_at' then 'FOUND_IN'
    when 'found_near' then 'FOUND_IN'
    when 'encounter_context' then 'FOUND_IN'
    when 'location_hint' then 'FOUND_IN'
    when 'area' then 'FOUND_IN'
    when 'biome' then 'FOUND_IN'
    when 'drops' then 'DROPS'
    when 'dropped_by' then 'DROPS'
    when 'drop' then 'DROPS'
    when 'loot' then 'DROPS'
    when 'part_of' then 'PART_OF'
    when 'contains' then 'PART_OF'
    when 'requires' then 'REQUIRES'
    when 'unlocks' then 'UNLOCKS'
    when 'variant_of' then 'VARIANT_OF'
    when 'changed_by_patch' then 'CHANGED_BY_PATCH'
    when '' then case lower(coalesce(p_relation_group, ''))
      when 'creatures' then 'RELATED_TO'
      when 'items' then 'DROPS'
      when 'locations' then 'FOUND_IN'
      when 'biomes' then 'FOUND_IN'
      else 'RELATED_TO'
    end
    else coalesce(
      (
        select rt.relation_code
        from public.wiki_relation_types rt
        where rt.relation_code = upper(replace(replace(coalesce(p_relation_type, ''), '-', '_'), ' ', '_'))
          and rt.is_active = true
        limit 1
      ),
      'RELATED_TO'
    )
  end;
$$;


--
-- TOC entry 557 (class 1255 OID 18767)
-- Name: bl_normalize_search_text(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.bl_normalize_search_text(p_input text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select trim(both from lower(regexp_replace(coalesce(p_input, ''), '[^a-z0-9\s-]', '', 'g')));
$$;


--
-- TOC entry 520 (class 1255 OID 18522)
-- Name: bl_slugify_text(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.bl_slugify_text(p_input text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select case
    when p_input is null or btrim(p_input) = '' then 'entity'
    else trim(both '-' from regexp_replace(lower(p_input), '[^a-z0-9]+', '-', 'g'))
  end;
$$;


--
-- TOC entry 517 (class 1255 OID 18110)
-- Name: delete_own_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.delete_own_account() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
    AS $_$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Remove user-owned rows from optional feature tables first to avoid FK conflicts.
  if to_regclass('public.notifications') is not null then
    execute 'delete from public.notifications where user_id = $1' using v_uid;
  end if;

  if to_regclass('public.admin_actions') is not null then
    execute 'delete from public.admin_actions where admin_id = $1' using v_uid;
  end if;

  if to_regclass('public.comments') is not null then
    execute 'delete from public.comments where user_id = $1' using v_uid;
  end if;

  if to_regclass('public.post_reactions') is not null then
    execute 'delete from public.post_reactions where user_id = $1' using v_uid;
  end if;

  if to_regclass('public.reports') is not null then
    execute 'delete from public.reports where reporter_id = $1' using v_uid;
  end if;

  if to_regclass('public.posts') is not null then
    execute 'delete from public.posts where author_id = $1' using v_uid;
  end if;

  -- Delete the auth user record last; linked profile rows should cascade if FK is configured.
  delete from auth.users where id = v_uid;
end;
$_$;


--
-- TOC entry 515 (class 1255 OID 17967)
-- Name: generate_post_slug_excerpt(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.generate_post_slug_excerpt() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  if new.slug is null or new.slug = '' then
    new.slug := lower(
      regexp_replace(
        regexp_replace(new.title, '[^a-zA-Z0-9\s-]', '', 'g'),
        '\s+', '-', 'g'
      )
    ) || '-' || substr(gen_random_uuid()::text, 1, 8);
  end if;

  if new.excerpt is null or new.excerpt = '' then
    new.excerpt := left(regexp_replace(new.content, '<[^>]*>', '', 'g'), 160);
  end if;

  return new;
end;
$$;


--
-- TOC entry 511 (class 1255 OID 17714)
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, username, email_verified)
  values (new.id, new.raw_user_meta_data->>'username', false);
  return new;
end;
$$;


--
-- TOC entry 513 (class 1255 OID 17914)
-- Name: is_admin(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;


--
-- TOC entry 516 (class 1255 OID 18014)
-- Name: is_banned_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.is_banned_user() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select is_banned from profiles where id = auth.uid()), false)
$$;


--
-- TOC entry 514 (class 1255 OID 17953)
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- TOC entry 518 (class 1255 OID 18255)
-- Name: set_wiki_entity_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_wiki_entity_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- TOC entry 556 (class 1255 OID 18764)
-- Name: set_wiki_observation_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.set_wiki_observation_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


--
-- TOC entry 512 (class 1255 OID 17754)
-- Name: sync_email_verified(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE OR REPLACE FUNCTION public.sync_email_verified() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles
    set email_verified = true
    where id = new.id;
  end if;
  return new;
end;
$$;




--
-- TOC entry 383 (class 1259 OID 18088)
-- Name: admin_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.admin_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action_type text NOT NULL,
    target_type text,
    target_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 377 (class 1259 OID 17636)
-- Name: comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid,
    author_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 376 (class 1259 OID 17617)
-- Name: posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid,
    title text NOT NULL,
    content text NOT NULL,
    category text,
    has_media boolean DEFAULT false,
    status text DEFAULT 'pending'::text,
    fire_count integer DEFAULT 0,
    down_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    is_discovery boolean DEFAULT false NOT NULL,
    post_type text DEFAULT 'wiki'::text NOT NULL,
    guide_subcategory text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    slug text NOT NULL,
    excerpt text,
    admin_locked boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    deleted_by uuid,
    submission_status text,
    submission_review_note text,
    submission_status_updated_at timestamp with time zone,
    submission_status_updated_by uuid,
    canonical_entity_id uuid,
    is_entity_view boolean DEFAULT false NOT NULL,
    CONSTRAINT posts_category_check CHECK ((((post_type = 'guide'::text) AND (category IS NULL)) OR ((post_type = ANY (ARRAY['wiki'::text, 'discovery'::text])) AND (category = ANY (ARRAY['creatures'::text, 'biomes'::text, 'items'::text, 'guilds'::text, 'building'::text, 'dungeons'::text, 'locations'::text, 'lore'::text, 'crafting'::text]))))),
    CONSTRAINT posts_guide_subcategory_check CHECK (((guide_subcategory IS NULL) OR (guide_subcategory = ANY (ARRAY['survival'::text, 'exploration'::text, 'combat'::text, 'building'::text, 'taming'::text, 'farming'::text, 'crafting-guide'::text, 'lore-story'::text, 'multiplayer-guilds'::text, 'beginner'::text, 'advanced'::text])))),
    CONSTRAINT posts_post_type_check CHECK ((post_type = ANY (ARRAY['wiki'::text, 'guide'::text, 'discovery'::text]))),
    CONSTRAINT posts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'published'::text])))
);


--

--
-- TOC entry 382 (class 1259 OID 18067)
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    type text DEFAULT 'system'::text NOT NULL,
    title text NOT NULL,
    message text,
    target_url text,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 380 (class 1259 OID 17922)
-- Name: post_reactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.post_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT post_reactions_reaction_check CHECK ((reaction = ANY (ARRAY['up'::text, 'down'::text])))
);


--
-- TOC entry 375 (class 1259 OID 17599)
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    username text NOT NULL,
    email_verified boolean DEFAULT false,
    role text DEFAULT 'user'::text,
    created_at timestamp with time zone DEFAULT now(),
    avatar_url text,
    is_banned boolean DEFAULT false NOT NULL,
    banned_at timestamp with time zone,
    timeout_until timestamp with time zone,
    last_known_ip inet,
    deleted_at timestamp with time zone,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['user'::text, 'admin'::text])))
);


--
-- TOC entry 378 (class 1259 OID 17655)
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid,
    user_id uuid,
    rating_type text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ratings_rating_type_check CHECK ((rating_type = ANY (ARRAY['fire'::text, 'down'::text])))
);


--
-- TOC entry 379 (class 1259 OID 17677)
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid,
    reporter_id uuid,
    reason text NOT NULL,
    status text DEFAULT 'open'::text,
    created_at timestamp with time zone DEFAULT now(),
    target_type text DEFAULT 'post'::text,
    target_id uuid,
    category text DEFAULT 'general'::text,
    description text,
    screenshot_url text,
    CONSTRAINT reports_status_check CHECK ((status = ANY (ARRAY['open'::text, 'resolved'::text]))),
    CONSTRAINT reports_target_type_check CHECK ((target_type = ANY (ARRAY['post'::text, 'user'::text])))
);


--
-- TOC entry 399 (class 1259 OID 18815)
-- Name: user_submission_acks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.user_submission_acks (
    user_id uuid NOT NULL,
    tutorial_version text DEFAULT 'v1'::text NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 388 (class 1259 OID 18235)
-- Name: wiki_category_extensions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_category_extensions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_slug text NOT NULL,
    subcategory_slug text NOT NULL,
    display_label text NOT NULL,
    status text DEFAULT 'approved'::text NOT NULL,
    source_post_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wiki_category_extensions_status_check CHECK ((status = ANY (ARRAY['approved'::text, 'pending'::text, 'rejected'::text])))
);


--
-- TOC entry 387 (class 1259 OID 18212)
-- Name: wiki_discovery_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_discovery_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_post_id uuid NOT NULL,
    entity_id uuid,
    evidence_kind text NOT NULL,
    label text,
    url text,
    file_type text,
    supports_fields text[] DEFAULT '{}'::text[] NOT NULL,
    note text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    evidence_status text DEFAULT 'active'::text NOT NULL,
    evidence_status_reason text,
    evidence_status_updated_at timestamp with time zone,
    evidence_status_updated_by uuid,
    CONSTRAINT wiki_discovery_evidence_evidence_status_check CHECK ((evidence_status = ANY (ARRAY['active'::text, 'deprecated'::text, 'invalid'::text])))
);


--
-- TOC entry 384 (class 1259 OID 18129)
-- Name: wiki_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_entities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    canonical_name text NOT NULL,
    slug text NOT NULL,
    category_slug text,
    subcategory_slug text,
    status text DEFAULT 'active'::text NOT NULL,
    source_post_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    canonical_key text,
    CONSTRAINT wiki_entities_status_check CHECK ((status = ANY (ARRAY['active'::text, 'draft'::text, 'archived'::text])))
);


--
-- TOC entry 385 (class 1259 OID 18158)
-- Name: wiki_entity_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_entity_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    alias_name text NOT NULL,
    normalized_alias text NOT NULL,
    source_post_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 397 (class 1259 OID 18721)
-- Name: wiki_entity_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_entity_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    claim_key text NOT NULL,
    claim_value jsonb NOT NULL,
    confidence integer DEFAULT 50 NOT NULL,
    supporting_observation_count integer DEFAULT 1 NOT NULL,
    claim_status text DEFAULT 'active'::text NOT NULL,
    claim_status_reason text,
    first_observation_id uuid,
    verified boolean DEFAULT false NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wiki_entity_claims_claim_status_check CHECK ((claim_status = ANY (ARRAY['active'::text, 'conflicted'::text, 'deprecated'::text, 'superseded'::text]))),
    CONSTRAINT wiki_entity_claims_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100)))
);


--
-- TOC entry 393 (class 1259 OID 18416)
-- Name: wiki_entity_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_entity_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    revision_number integer NOT NULL,
    source_post_id uuid,
    sync_log_id uuid,
    schema_version_id uuid,
    event_type text NOT NULL,
    field_name text,
    old_value jsonb,
    new_value jsonb,
    reason text,
    confidence_before integer,
    confidence_after integer,
    change_set jsonb,
    snapshot_data jsonb,
    review_id uuid,
    approval_id uuid,
    changed_by uuid,
    changed_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wiki_entity_history_confidence_after_check CHECK (((confidence_after >= 0) AND (confidence_after <= 100))),
    CONSTRAINT wiki_entity_history_confidence_before_check CHECK (((confidence_before >= 0) AND (confidence_before <= 100))),
    CONSTRAINT wiki_entity_history_event_type_check CHECK ((event_type = ANY (ARRAY['created'::text, 'field_changed'::text, 'relation_added'::text, 'relation_removed'::text, 'evidence_added'::text, 'evidence_removed'::text, 'status_changed'::text, 'schema_migrated'::text, 'merged'::text, 'split'::text])))
);


--
-- TOC entry 394 (class 1259 OID 18464)
-- Name: wiki_entity_merge_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_entity_merge_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    winner_entity_id uuid NOT NULL,
    loser_entity_id uuid NOT NULL,
    merge_reason text,
    merged_fields jsonb,
    winner_revision_after integer,
    source_post_id uuid,
    sync_log_id uuid,
    merged_by uuid,
    merged_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT chk_wiki_entity_merge_distinct CHECK ((winner_entity_id <> loser_entity_id))
);


--
-- TOC entry 386 (class 1259 OID 18180)
-- Name: wiki_entity_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_entity_relations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_entity_id uuid NOT NULL,
    target_entity_id uuid NOT NULL,
    relation_type text NOT NULL,
    source_post_id uuid,
    confidence integer DEFAULT 70 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    relation_type_id uuid,
    relation_status text DEFAULT 'active'::text NOT NULL,
    relation_status_reason text,
    relation_status_updated_at timestamp with time zone,
    relation_status_updated_by uuid,
    verified boolean DEFAULT false NOT NULL,
    verified_by uuid,
    verified_at timestamp with time zone,
    created_by uuid,
    CONSTRAINT wiki_entity_relations_confidence_check CHECK (((confidence >= 0) AND (confidence <= 100))),
    CONSTRAINT wiki_entity_relations_relation_status_check CHECK ((relation_status = ANY (ARRAY['active'::text, 'deprecated'::text])))
);


--
-- TOC entry 396 (class 1259 OID 18694)
-- Name: wiki_observation_entities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_observation_entities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    observation_id uuid NOT NULL,
    entity_id uuid,
    role text DEFAULT 'primary'::text NOT NULL,
    proposed_canonical_key text,
    proposed_entity_type text,
    proposed_name text,
    match_type text DEFAULT 'new'::text NOT NULL,
    match_score numeric(5,2) DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wiki_observation_entities_match_type_check CHECK ((match_type = ANY (ARRAY['exact'::text, 'alias'::text, 'fuzzy'::text, 'new'::text, 'admin_override'::text]))),
    CONSTRAINT wiki_observation_entities_role_check CHECK ((role = ANY (ARRAY['primary'::text, 'related'::text, 'loot'::text, 'location'::text, 'guide'::text])))
);


--
-- TOC entry 395 (class 1259 OID 18657)
-- Name: wiki_observations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_observations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    author_id uuid NOT NULL,
    source_post_id uuid,
    category_slug text NOT NULL,
    subcategory_slug text,
    entity_name text NOT NULL,
    world_name text,
    region_name text,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    observation_source text DEFAULT 'user'::text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    match_summary jsonb DEFAULT '{}'::jsonb NOT NULL,
    review_note text,
    patch_version text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    CONSTRAINT wiki_observations_observation_source_check CHECK ((observation_source = ANY (ARRAY['user'::text, 'datamine'::text, 'admin'::text, 'migration'::text]))),
    CONSTRAINT wiki_observations_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'validating'::text, 'approved'::text, 'indexed'::text, 'verified'::text, 'needs_revision'::text, 'rejected'::text, 'superseded'::text])))
);


--
-- TOC entry 398 (class 1259 OID 18783)
-- Name: wiki_patch_mode; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_patch_mode (
    id smallint DEFAULT 1 NOT NULL,
    enabled boolean DEFAULT false NOT NULL,
    public_message text,
    reason text,
    expected_until timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT wiki_patch_mode_id_check CHECK ((id = 1))
);


--
-- TOC entry 390 (class 1259 OID 18294)
-- Name: wiki_relation_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_relation_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    relation_code text NOT NULL,
    label text NOT NULL,
    description text,
    inverse_relation_code text,
    is_symmetric boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- TOC entry 389 (class 1259 OID 18273)
-- Name: wiki_schema_versions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_schema_versions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type text NOT NULL,
    schema_key text NOT NULL,
    version_major integer NOT NULL,
    version_minor integer DEFAULT 0 NOT NULL,
    version_patch integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    json_schema jsonb NOT NULL,
    migration_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    activated_at timestamp with time zone,
    CONSTRAINT wiki_schema_versions_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'deprecated'::text])))
);


--
-- TOC entry 391 (class 1259 OID 18348)
-- Name: wiki_submission_statuses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_submission_statuses (
    code text NOT NULL,
    label text NOT NULL,
    sort_order integer NOT NULL,
    is_terminal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- TOC entry 392 (class 1259 OID 18368)
-- Name: wiki_sync_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE IF NOT EXISTS public.wiki_sync_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_post_id uuid NOT NULL,
    entity_id uuid,
    operation_type text NOT NULL,
    sync_status text NOT NULL,
    input_schema_version_id uuid,
    target_schema_version_id uuid,
    source_post_updated_at timestamp with time zone,
    original_payload_hash text,
    override_payload_hash text,
    payload_override jsonb,
    payload_override_reason text,
    payload_override_actor uuid,
    source_payload_hash text,
    idempotency_key text NOT NULL,
    rows_entities_upserted integer DEFAULT 0 NOT NULL,
    rows_relations_upserted integer DEFAULT 0 NOT NULL,
    rows_evidence_upserted integer DEFAULT 0 NOT NULL,
    error_code text,
    error_message text,
    error_details jsonb,
    started_at timestamp with time zone,
    finished_at timestamp with time zone,
    governance_status_before text,
    governance_status_after text,
    triggered_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT wiki_sync_logs_operation_type_check CHECK ((operation_type = ANY (ARRAY['approve_sync'::text, 'resync'::text, 'manual_rebuild'::text, 'rollback'::text]))),
    CONSTRAINT wiki_sync_logs_sync_status_check CHECK ((sync_status = ANY (ARRAY['pending'::text, 'running'::text, 'success'::text, 'failed'::text, 'canceled'::text])))
);


--
-- TOC entry 3968 (class 2606 OID 18096)
-- Name: admin_actions admin_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


--
-- TOC entry 3951 (class 2606 OID 17644)
-- Name: comments comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


--
-- TOC entry 3966 (class 2606 OID 18077)
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- TOC entry 3959 (class 2606 OID 17931)
-- Name: post_reactions post_reactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (id);


--
-- TOC entry 3961 (class 2606 OID 17933)
-- Name: post_reactions post_reactions_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- TOC entry 3947 (class 2606 OID 17630)
-- Name: posts posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


--
-- TOC entry 3941 (class 2606 OID 17609)
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- TOC entry 3943 (class 2606 OID 17611)
-- Name: profiles profiles_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


--
-- TOC entry 3953 (class 2606 OID 17664)
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- TOC entry 3955 (class 2606 OID 17666)
-- Name: ratings ratings_post_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_post_id_user_id_key UNIQUE (post_id, user_id);


--
-- TOC entry 3957 (class 2606 OID 17687)
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- TOC entry 4056 (class 2606 OID 18823)
-- Name: user_submission_acks user_submission_acks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_submission_acks
    ADD CONSTRAINT user_submission_acks_pkey PRIMARY KEY (user_id);


--
-- TOC entry 4001 (class 2606 OID 18248)
-- Name: wiki_category_extensions wiki_category_extensions_category_slug_subcategory_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_category_extensions
    ADD CONSTRAINT wiki_category_extensions_category_slug_subcategory_slug_key UNIQUE (category_slug, subcategory_slug);


--
-- TOC entry 4003 (class 2606 OID 18246)
-- Name: wiki_category_extensions wiki_category_extensions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_category_extensions
    ADD CONSTRAINT wiki_category_extensions_pkey PRIMARY KEY (id);


--
-- TOC entry 3998 (class 2606 OID 18222)
-- Name: wiki_discovery_evidence wiki_discovery_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_discovery_evidence
    ADD CONSTRAINT wiki_discovery_evidence_pkey PRIMARY KEY (id);


--
-- TOC entry 3977 (class 2606 OID 18143)
-- Name: wiki_entities wiki_entities_entity_type_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entities
    ADD CONSTRAINT wiki_entities_entity_type_slug_key UNIQUE (entity_type, slug);


--
-- TOC entry 3979 (class 2606 OID 18141)
-- Name: wiki_entities wiki_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entities
    ADD CONSTRAINT wiki_entities_pkey PRIMARY KEY (id);


--
-- TOC entry 3982 (class 2606 OID 18168)
-- Name: wiki_entity_aliases wiki_entity_aliases_entity_id_normalized_alias_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_aliases
    ADD CONSTRAINT wiki_entity_aliases_entity_id_normalized_alias_key UNIQUE (entity_id, normalized_alias);


--
-- TOC entry 3984 (class 2606 OID 18166)
-- Name: wiki_entity_aliases wiki_entity_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_aliases
    ADD CONSTRAINT wiki_entity_aliases_pkey PRIMARY KEY (id);


--
-- TOC entry 4050 (class 2606 OID 18738)
-- Name: wiki_entity_claims wiki_entity_claims_entity_id_claim_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_entity_id_claim_key_key UNIQUE (entity_id, claim_key);


--
-- TOC entry 4052 (class 2606 OID 18736)
-- Name: wiki_entity_claims wiki_entity_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_pkey PRIMARY KEY (id);


--
-- TOC entry 4027 (class 2606 OID 18429)
-- Name: wiki_entity_history wiki_entity_history_entity_id_revision_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_entity_id_revision_number_key UNIQUE (entity_id, revision_number);


--
-- TOC entry 4029 (class 2606 OID 18427)
-- Name: wiki_entity_history wiki_entity_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_pkey PRIMARY KEY (id);


--
-- TOC entry 4033 (class 2606 OID 18473)
-- Name: wiki_entity_merge_history wiki_entity_merge_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_pkey PRIMARY KEY (id);


--
-- TOC entry 3991 (class 2606 OID 18191)
-- Name: wiki_entity_relations wiki_entity_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_pkey PRIMARY KEY (id);


--
-- TOC entry 3993 (class 2606 OID 18193)
-- Name: wiki_entity_relations wiki_entity_relations_source_entity_id_target_entity_id_rel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_source_entity_id_target_entity_id_rel_key UNIQUE (source_entity_id, target_entity_id, relation_type);


--
-- TOC entry 4046 (class 2606 OID 18707)
-- Name: wiki_observation_entities wiki_observation_entities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_observation_entities
    ADD CONSTRAINT wiki_observation_entities_pkey PRIMARY KEY (id);


--
-- TOC entry 4041 (class 2606 OID 18672)
-- Name: wiki_observations wiki_observations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_observations
    ADD CONSTRAINT wiki_observations_pkey PRIMARY KEY (id);


--
-- TOC entry 4054 (class 2606 OID 18793)
-- Name: wiki_patch_mode wiki_patch_mode_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_patch_mode
    ADD CONSTRAINT wiki_patch_mode_pkey PRIMARY KEY (id);


--
-- TOC entry 4011 (class 2606 OID 18305)
-- Name: wiki_relation_types wiki_relation_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_relation_types
    ADD CONSTRAINT wiki_relation_types_pkey PRIMARY KEY (id);


--
-- TOC entry 4013 (class 2606 OID 18307)
-- Name: wiki_relation_types wiki_relation_types_relation_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_relation_types
    ADD CONSTRAINT wiki_relation_types_relation_code_key UNIQUE (relation_code);


--
-- TOC entry 4006 (class 2606 OID 18287)
-- Name: wiki_schema_versions wiki_schema_versions_entity_type_schema_key_version_major_v_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_schema_versions
    ADD CONSTRAINT wiki_schema_versions_entity_type_schema_key_version_major_v_key UNIQUE (entity_type, schema_key, version_major, version_minor, version_patch);


--
-- TOC entry 4008 (class 2606 OID 18285)
-- Name: wiki_schema_versions wiki_schema_versions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_schema_versions
    ADD CONSTRAINT wiki_schema_versions_pkey PRIMARY KEY (id);


--
-- TOC entry 4015 (class 2606 OID 18356)
-- Name: wiki_submission_statuses wiki_submission_statuses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_submission_statuses
    ADD CONSTRAINT wiki_submission_statuses_pkey PRIMARY KEY (code);


--
-- TOC entry 4019 (class 2606 OID 18383)
-- Name: wiki_sync_logs wiki_sync_logs_idempotency_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_idempotency_key_key UNIQUE (idempotency_key);


--
-- TOC entry 4021 (class 2606 OID 18381)
-- Name: wiki_sync_logs wiki_sync_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_pkey PRIMARY KEY (id);


--
-- TOC entry 3969 (class 1259 OID 18103)
-- Name: idx_admin_actions_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON public.admin_actions USING btree (admin_id, created_at DESC);


--
-- TOC entry 3970 (class 1259 OID 18102)
-- Name: idx_admin_actions_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions USING btree (created_at DESC);


--
-- TOC entry 3963 (class 1259 OID 18083)
-- Name: idx_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- TOC entry 3964 (class 1259 OID 18084)
-- Name: idx_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read);


--
-- TOC entry 3944 (class 1259 OID 18762)
-- Name: idx_posts_canonical_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_posts_canonical_entity ON public.posts USING btree (canonical_entity_id) WHERE (canonical_entity_id IS NOT NULL);


--
-- TOC entry 3945 (class 1259 OID 18367)
-- Name: idx_posts_submission_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_posts_submission_status ON public.posts USING btree (submission_status);


--
-- TOC entry 3999 (class 1259 OID 18254)
-- Name: idx_wiki_category_extensions_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_category_extensions_category ON public.wiki_category_extensions USING btree (category_slug, status);


--
-- TOC entry 3994 (class 1259 OID 18234)
-- Name: idx_wiki_discovery_evidence_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_discovery_evidence_entity ON public.wiki_discovery_evidence USING btree (entity_id);


--
-- TOC entry 3995 (class 1259 OID 18233)
-- Name: idx_wiki_discovery_evidence_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_discovery_evidence_post ON public.wiki_discovery_evidence USING btree (source_post_id);


--
-- TOC entry 3996 (class 1259 OID 18346)
-- Name: idx_wiki_discovery_evidence_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_discovery_evidence_status ON public.wiki_discovery_evidence USING btree (evidence_status);


--
-- TOC entry 3971 (class 1259 OID 18155)
-- Name: idx_wiki_entities_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entities_category ON public.wiki_entities USING btree (category_slug, subcategory_slug);


--
-- TOC entry 3972 (class 1259 OID 18157)
-- Name: idx_wiki_entities_metadata_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entities_metadata_gin ON public.wiki_entities USING gin (metadata);


--
-- TOC entry 3973 (class 1259 OID 18156)
-- Name: idx_wiki_entities_source_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entities_source_post ON public.wiki_entities USING btree (source_post_id);


--
-- TOC entry 3974 (class 1259 OID 18154)
-- Name: idx_wiki_entities_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entities_type ON public.wiki_entities USING btree (entity_type);


--
-- TOC entry 3980 (class 1259 OID 18179)
-- Name: idx_wiki_entity_aliases_norm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_aliases_norm ON public.wiki_entity_aliases USING btree (normalized_alias);


--
-- TOC entry 4047 (class 1259 OID 18754)
-- Name: idx_wiki_entity_claims_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_claims_entity ON public.wiki_entity_claims USING btree (entity_id);


--
-- TOC entry 4048 (class 1259 OID 18755)
-- Name: idx_wiki_entity_claims_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_claims_status ON public.wiki_entity_claims USING btree (claim_status);


--
-- TOC entry 4022 (class 1259 OID 18458)
-- Name: idx_wiki_entity_history_approval; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_history_approval ON public.wiki_entity_history USING btree (approval_id);


--
-- TOC entry 4023 (class 1259 OID 18455)
-- Name: idx_wiki_entity_history_entity_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_history_entity_time ON public.wiki_entity_history USING btree (entity_id, changed_at DESC);


--
-- TOC entry 4024 (class 1259 OID 18457)
-- Name: idx_wiki_entity_history_review; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_history_review ON public.wiki_entity_history USING btree (review_id);


--
-- TOC entry 4025 (class 1259 OID 18456)
-- Name: idx_wiki_entity_history_source_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_history_source_post ON public.wiki_entity_history USING btree (source_post_id);


--
-- TOC entry 4030 (class 1259 OID 18500)
-- Name: idx_wiki_entity_merge_loser; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_merge_loser ON public.wiki_entity_merge_history USING btree (loser_entity_id, merged_at DESC);


--
-- TOC entry 4031 (class 1259 OID 18499)
-- Name: idx_wiki_entity_merge_winner; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_merge_winner ON public.wiki_entity_merge_history USING btree (winner_entity_id, merged_at DESC);


--
-- TOC entry 3985 (class 1259 OID 18337)
-- Name: idx_wiki_entity_relations_relation_type_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_relation_type_id ON public.wiki_entity_relations USING btree (relation_type_id);


--
-- TOC entry 3986 (class 1259 OID 18209)
-- Name: idx_wiki_entity_relations_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_source ON public.wiki_entity_relations USING btree (source_entity_id);


--
-- TOC entry 3987 (class 1259 OID 18338)
-- Name: idx_wiki_entity_relations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_status ON public.wiki_entity_relations USING btree (relation_status);


--
-- TOC entry 3988 (class 1259 OID 18210)
-- Name: idx_wiki_entity_relations_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_target ON public.wiki_entity_relations USING btree (target_entity_id);


--
-- TOC entry 3989 (class 1259 OID 18211)
-- Name: idx_wiki_entity_relations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_type ON public.wiki_entity_relations USING btree (relation_type);


--
-- TOC entry 4042 (class 1259 OID 18720)
-- Name: idx_wiki_observation_entities_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_observation_entities_entity ON public.wiki_observation_entities USING btree (entity_id);


--
-- TOC entry 4043 (class 1259 OID 18719)
-- Name: idx_wiki_observation_entities_obs; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_observation_entities_obs ON public.wiki_observation_entities USING btree (observation_id);


--
-- TOC entry 4034 (class 1259 OID 18688)
-- Name: idx_wiki_observations_author; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_observations_author ON public.wiki_observations USING btree (author_id);


--
-- TOC entry 4035 (class 1259 OID 18690)
-- Name: idx_wiki_observations_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_observations_category ON public.wiki_observations USING btree (category_slug, subcategory_slug);


--
-- TOC entry 4036 (class 1259 OID 18693)
-- Name: idx_wiki_observations_entity_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_observations_entity_name_trgm ON public.wiki_observations USING gin (entity_name public.gin_trgm_ops);


--
-- TOC entry 4037 (class 1259 OID 18692)
-- Name: idx_wiki_observations_payload_gin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_observations_payload_gin ON public.wiki_observations USING gin (payload);


--
-- TOC entry 4038 (class 1259 OID 18691)
-- Name: idx_wiki_observations_source_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_observations_source_post ON public.wiki_observations USING btree (source_post_id);


--
-- TOC entry 4039 (class 1259 OID 18689)
-- Name: idx_wiki_observations_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_observations_status ON public.wiki_observations USING btree (status);


--
-- TOC entry 4009 (class 1259 OID 18313)
-- Name: idx_wiki_relation_types_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_relation_types_active ON public.wiki_relation_types USING btree (is_active);


--
-- TOC entry 4004 (class 1259 OID 18293)
-- Name: idx_wiki_schema_versions_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_schema_versions_lookup ON public.wiki_schema_versions USING btree (entity_type, schema_key, status);


--
-- TOC entry 4016 (class 1259 OID 18414)
-- Name: idx_wiki_sync_logs_post; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_sync_logs_post ON public.wiki_sync_logs USING btree (source_post_id, created_at DESC);


--
-- TOC entry 4017 (class 1259 OID 18415)
-- Name: idx_wiki_sync_logs_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX IF NOT EXISTS idx_wiki_sync_logs_status ON public.wiki_sync_logs USING btree (sync_status, created_at DESC);


--
-- TOC entry 3962 (class 1259 OID 18040)
-- Name: post_reactions_post_user_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS post_reactions_post_user_unique ON public.post_reactions USING btree (post_id, user_id);


--
-- TOC entry 3948 (class 1259 OID 17966)
-- Name: posts_slug_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique_idx ON public.posts USING btree (slug);


--
-- TOC entry 3949 (class 1259 OID 18763)
-- Name: uq_posts_canonical_entity_view; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_canonical_entity_view ON public.posts USING btree (canonical_entity_id) WHERE ((is_entity_view = true) AND (deleted_at IS NULL) AND (status = 'published'::text));


--
-- TOC entry 3975 (class 1259 OID 18347)
-- Name: uq_wiki_entities_canonical_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_wiki_entities_canonical_key ON public.wiki_entities USING btree (canonical_key);


--
-- TOC entry 4044 (class 1259 OID 18718)
-- Name: uq_wiki_observation_entities_role_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX IF NOT EXISTS uq_wiki_observation_entities_role_key ON public.wiki_observation_entities USING btree (observation_id, role, COALESCE(proposed_canonical_key, proposed_name, ''::text));


--
-- TOC entry 4117 (class 2620 OID 17968)
-- Name: posts trg_generate_post_slug_excerpt; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_generate_post_slug_excerpt ON public.posts;
CREATE TRIGGER trg_generate_post_slug_excerpt BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.generate_post_slug_excerpt();


--
-- TOC entry 4118 (class 2620 OID 17954)
-- Name: posts trg_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- TOC entry 4119 (class 2620 OID 18256)
-- Name: wiki_entities trg_wiki_entities_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_wiki_entities_updated_at ON public.wiki_entities;
CREATE TRIGGER trg_wiki_entities_updated_at BEFORE UPDATE ON public.wiki_entities FOR EACH ROW EXECUTE FUNCTION public.set_wiki_entity_updated_at();


--
-- TOC entry 4121 (class 2620 OID 18766)
-- Name: wiki_entity_claims trg_wiki_entity_claims_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_wiki_entity_claims_updated_at ON public.wiki_entity_claims;
CREATE TRIGGER trg_wiki_entity_claims_updated_at BEFORE UPDATE ON public.wiki_entity_claims FOR EACH ROW EXECUTE FUNCTION public.set_wiki_observation_updated_at();


--
-- TOC entry 4120 (class 2620 OID 18765)
-- Name: wiki_observations trg_wiki_observations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

DROP TRIGGER IF EXISTS trg_wiki_observations_updated_at ON public.wiki_observations;
CREATE TRIGGER trg_wiki_observations_updated_at BEFORE UPDATE ON public.wiki_observations FOR EACH ROW EXECUTE FUNCTION public.set_wiki_observation_updated_at();


--
-- TOC entry 4072 (class 2606 OID 18097)
-- Name: admin_actions admin_actions_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4063 (class 2606 OID 17650)
-- Name: comments comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4064 (class 2606 OID 17645)
-- Name: comments comments_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4071 (class 2606 OID 18078)
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4069 (class 2606 OID 17934)
-- Name: post_reactions post_reactions_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4070 (class 2606 OID 17939)
-- Name: post_reactions post_reactions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4058 (class 2606 OID 17631)
-- Name: posts posts_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4059 (class 2606 OID 18757)
-- Name: posts posts_canonical_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_canonical_entity_id_fkey FOREIGN KEY (canonical_entity_id) REFERENCES public.wiki_entities(id) ON DELETE SET NULL;


--
-- TOC entry 4060 (class 2606 OID 18062)
-- Name: posts posts_deleted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4061 (class 2606 OID 18362)
-- Name: posts posts_submission_status_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_submission_status_fkey FOREIGN KEY (submission_status) REFERENCES public.wiki_submission_statuses(code);


--
-- TOC entry 4062 (class 2606 OID 18357)
-- Name: posts posts_submission_status_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_submission_status_updated_by_fkey FOREIGN KEY (submission_status_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4057 (class 2606 OID 17612)
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4065 (class 2606 OID 17667)
-- Name: ratings ratings_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4066 (class 2606 OID 17672)
-- Name: ratings ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4067 (class 2606 OID 17688)
-- Name: reports reports_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4068 (class 2606 OID 17693)
-- Name: reports reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4116 (class 2606 OID 18824)
-- Name: user_submission_acks user_submission_acks_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_submission_acks
    ADD CONSTRAINT user_submission_acks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- TOC entry 4087 (class 2606 OID 18249)
-- Name: wiki_category_extensions wiki_category_extensions_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_category_extensions
    ADD CONSTRAINT wiki_category_extensions_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- TOC entry 4084 (class 2606 OID 18228)
-- Name: wiki_discovery_evidence wiki_discovery_evidence_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_discovery_evidence
    ADD CONSTRAINT wiki_discovery_evidence_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE SET NULL;


--
-- TOC entry 4085 (class 2606 OID 18341)
-- Name: wiki_discovery_evidence wiki_discovery_evidence_evidence_status_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_discovery_evidence
    ADD CONSTRAINT wiki_discovery_evidence_evidence_status_updated_by_fkey FOREIGN KEY (evidence_status_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4086 (class 2606 OID 18223)
-- Name: wiki_discovery_evidence wiki_discovery_evidence_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_discovery_evidence
    ADD CONSTRAINT wiki_discovery_evidence_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4073 (class 2606 OID 18149)
-- Name: wiki_entities wiki_entities_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entities
    ADD CONSTRAINT wiki_entities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4074 (class 2606 OID 18144)
-- Name: wiki_entities wiki_entities_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entities
    ADD CONSTRAINT wiki_entities_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- TOC entry 4075 (class 2606 OID 18169)
-- Name: wiki_entity_aliases wiki_entity_aliases_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_aliases
    ADD CONSTRAINT wiki_entity_aliases_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


--
-- TOC entry 4076 (class 2606 OID 18174)
-- Name: wiki_entity_aliases wiki_entity_aliases_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_aliases
    ADD CONSTRAINT wiki_entity_aliases_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- TOC entry 4112 (class 2606 OID 18739)
-- Name: wiki_entity_claims wiki_entity_claims_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


--
-- TOC entry 4113 (class 2606 OID 18744)
-- Name: wiki_entity_claims wiki_entity_claims_first_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_first_observation_id_fkey FOREIGN KEY (first_observation_id) REFERENCES public.wiki_observations(id) ON DELETE SET NULL;


--
-- TOC entry 4114 (class 2606 OID 18749)
-- Name: wiki_entity_claims wiki_entity_claims_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4096 (class 2606 OID 18459)
-- Name: wiki_entity_history wiki_entity_history_approval_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_approval_id_fkey FOREIGN KEY (approval_id) REFERENCES public.admin_actions(id) ON DELETE SET NULL;


--
-- TOC entry 4097 (class 2606 OID 18450)
-- Name: wiki_entity_history wiki_entity_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4098 (class 2606 OID 18430)
-- Name: wiki_entity_history wiki_entity_history_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


--
-- TOC entry 4099 (class 2606 OID 18445)
-- Name: wiki_entity_history wiki_entity_history_schema_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_schema_version_id_fkey FOREIGN KEY (schema_version_id) REFERENCES public.wiki_schema_versions(id) ON DELETE SET NULL;


--
-- TOC entry 4100 (class 2606 OID 18435)
-- Name: wiki_entity_history wiki_entity_history_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- TOC entry 4101 (class 2606 OID 18440)
-- Name: wiki_entity_history wiki_entity_history_sync_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_sync_log_id_fkey FOREIGN KEY (sync_log_id) REFERENCES public.wiki_sync_logs(id) ON DELETE SET NULL;


--
-- TOC entry 4102 (class 2606 OID 18479)
-- Name: wiki_entity_merge_history wiki_entity_merge_history_loser_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_loser_entity_id_fkey FOREIGN KEY (loser_entity_id) REFERENCES public.wiki_entities(id) ON DELETE RESTRICT;


--
-- TOC entry 4103 (class 2606 OID 18494)
-- Name: wiki_entity_merge_history wiki_entity_merge_history_merged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_merged_by_fkey FOREIGN KEY (merged_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4104 (class 2606 OID 18484)
-- Name: wiki_entity_merge_history wiki_entity_merge_history_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- TOC entry 4105 (class 2606 OID 18489)
-- Name: wiki_entity_merge_history wiki_entity_merge_history_sync_log_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_sync_log_id_fkey FOREIGN KEY (sync_log_id) REFERENCES public.wiki_sync_logs(id) ON DELETE SET NULL;


--
-- TOC entry 4106 (class 2606 OID 18474)
-- Name: wiki_entity_merge_history wiki_entity_merge_history_winner_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_winner_entity_id_fkey FOREIGN KEY (winner_entity_id) REFERENCES public.wiki_entities(id) ON DELETE RESTRICT;


--
-- TOC entry 4077 (class 2606 OID 18332)
-- Name: wiki_entity_relations wiki_entity_relations_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4078 (class 2606 OID 18322)
-- Name: wiki_entity_relations wiki_entity_relations_relation_status_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_relation_status_updated_by_fkey FOREIGN KEY (relation_status_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4079 (class 2606 OID 18316)
-- Name: wiki_entity_relations wiki_entity_relations_relation_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_relation_type_id_fkey FOREIGN KEY (relation_type_id) REFERENCES public.wiki_relation_types(id) ON DELETE SET NULL;


--
-- TOC entry 4080 (class 2606 OID 18194)
-- Name: wiki_entity_relations wiki_entity_relations_source_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_source_entity_id_fkey FOREIGN KEY (source_entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


--
-- TOC entry 4081 (class 2606 OID 18204)
-- Name: wiki_entity_relations wiki_entity_relations_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- TOC entry 4082 (class 2606 OID 18199)
-- Name: wiki_entity_relations wiki_entity_relations_target_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_target_entity_id_fkey FOREIGN KEY (target_entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


--
-- TOC entry 4083 (class 2606 OID 18327)
-- Name: wiki_entity_relations wiki_entity_relations_verified_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4110 (class 2606 OID 18713)
-- Name: wiki_observation_entities wiki_observation_entities_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_observation_entities
    ADD CONSTRAINT wiki_observation_entities_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE SET NULL;


--
-- TOC entry 4111 (class 2606 OID 18708)
-- Name: wiki_observation_entities wiki_observation_entities_observation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_observation_entities
    ADD CONSTRAINT wiki_observation_entities_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES public.wiki_observations(id) ON DELETE CASCADE;


--
-- TOC entry 4107 (class 2606 OID 18673)
-- Name: wiki_observations wiki_observations_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_observations
    ADD CONSTRAINT wiki_observations_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- TOC entry 4108 (class 2606 OID 18683)
-- Name: wiki_observations wiki_observations_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_observations
    ADD CONSTRAINT wiki_observations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4109 (class 2606 OID 18678)
-- Name: wiki_observations wiki_observations_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_observations
    ADD CONSTRAINT wiki_observations_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


--
-- TOC entry 4115 (class 2606 OID 18794)
-- Name: wiki_patch_mode wiki_patch_mode_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_patch_mode
    ADD CONSTRAINT wiki_patch_mode_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4089 (class 2606 OID 18308)
-- Name: wiki_relation_types wiki_relation_types_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_relation_types
    ADD CONSTRAINT wiki_relation_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4088 (class 2606 OID 18288)
-- Name: wiki_schema_versions wiki_schema_versions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_schema_versions
    ADD CONSTRAINT wiki_schema_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4090 (class 2606 OID 18389)
-- Name: wiki_sync_logs wiki_sync_logs_entity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE SET NULL;


--
-- TOC entry 4091 (class 2606 OID 18394)
-- Name: wiki_sync_logs wiki_sync_logs_input_schema_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_input_schema_version_id_fkey FOREIGN KEY (input_schema_version_id) REFERENCES public.wiki_schema_versions(id) ON DELETE SET NULL;


--
-- TOC entry 4092 (class 2606 OID 18404)
-- Name: wiki_sync_logs wiki_sync_logs_payload_override_actor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_payload_override_actor_fkey FOREIGN KEY (payload_override_actor) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4093 (class 2606 OID 18384)
-- Name: wiki_sync_logs wiki_sync_logs_source_post_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


--
-- TOC entry 4094 (class 2606 OID 18399)
-- Name: wiki_sync_logs wiki_sync_logs_target_schema_version_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_target_schema_version_id_fkey FOREIGN KEY (target_schema_version_id) REFERENCES public.wiki_schema_versions(id) ON DELETE SET NULL;


--
-- TOC entry 4095 (class 2606 OID 18409)
-- Name: wiki_sync_logs wiki_sync_logs_triggered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- TOC entry 4330 (class 3256 OID 17951)
-- Name: comments Admins can delete any comment; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
CREATE POLICY "Admins can delete any comment" ON public.comments FOR DELETE USING (public.is_admin());


--
-- TOC entry 4316 (class 3256 OID 17851)
-- Name: posts Admins can delete any post; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Admins can delete any post" ON public.posts FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- TOC entry 4315 (class 3256 OID 17850)
-- Name: posts Admins can update any post; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Admins can update any post" ON public.posts;
CREATE POLICY "Admins can update any post" ON public.posts FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- TOC entry 4323 (class 3256 OID 17917)
-- Name: profiles Admins can update any profile; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.is_admin());


--
-- TOC entry 4314 (class 3256 OID 17848)
-- Name: posts Admins can view all posts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Admins can view all posts" ON public.posts;
CREATE POLICY "Admins can view all posts" ON public.posts FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- TOC entry 4322 (class 3256 OID 17916)
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());


--
-- TOC entry 4311 (class 3256 OID 17839)
-- Name: comments Anyone can view comments; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);


--
-- TOC entry 4363 (class 3256 OID 18552)
-- Name: posts Anyone can view published posts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;
CREATE POLICY "Anyone can view published posts" ON public.posts FOR SELECT USING (((status = 'published'::text) AND (deleted_at IS NULL)));


--
-- TOC entry 4307 (class 3256 OID 17835)
-- Name: ratings Anyone can view ratings; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ratings;
CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT USING (true);


--
-- TOC entry 4324 (class 3256 OID 17944)
-- Name: post_reactions Anyone can view reactions; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Anyone can view reactions" ON public.post_reactions;
CREATE POLICY "Anyone can view reactions" ON public.post_reactions FOR SELECT USING (true);


--
-- TOC entry 4364 (class 3256 OID 18553)
-- Name: posts Authors can view their own pending posts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Authors can view their own pending posts" ON public.posts;
CREATE POLICY "Authors can view their own pending posts" ON public.posts FOR SELECT USING ((auth.uid() = author_id));


--
-- TOC entry 4334 (class 3256 OID 18027)
-- Name: reports Logged in users can insert a report; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Logged in users can insert a report" ON public.reports;
CREATE POLICY "Logged in users can insert a report" ON public.reports FOR INSERT WITH CHECK ((auth.uid() = reporter_id));


--
-- TOC entry 4308 (class 3256 OID 17836)
-- Name: ratings Logged in users can insert their own rating; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Logged in users can insert their own rating" ON public.ratings;
CREATE POLICY "Logged in users can insert their own rating" ON public.ratings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4313 (class 3256 OID 17844)
-- Name: reports Only admins can view reports; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Only admins can view reports" ON public.reports;
CREATE POLICY "Only admins can view reports" ON public.reports FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- TOC entry 4329 (class 3256 OID 17950)
-- Name: comments Users can delete own comments; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING ((auth.uid() = author_id));


--
-- TOC entry 4327 (class 3256 OID 17947)
-- Name: post_reactions Users can delete own reaction; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can delete own reaction" ON public.post_reactions;
CREATE POLICY "Users can delete own reaction" ON public.post_reactions FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 4312 (class 3256 OID 17841)
-- Name: comments Users can delete their own comment; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can delete their own comment" ON public.comments;
CREATE POLICY "Users can delete their own comment" ON public.comments FOR DELETE USING ((auth.uid() = author_id));


--
-- TOC entry 4310 (class 3256 OID 17838)
-- Name: ratings Users can delete their own rating; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can delete their own rating" ON public.ratings;
CREATE POLICY "Users can delete their own rating" ON public.ratings FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 4325 (class 3256 OID 17945)
-- Name: post_reactions Users can insert own reaction; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can insert own reaction" ON public.post_reactions;
CREATE POLICY "Users can insert own reaction" ON public.post_reactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4328 (class 3256 OID 17949)
-- Name: comments Users can update own comments; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING ((auth.uid() = author_id));


--
-- TOC entry 4365 (class 3256 OID 18554)
-- Name: posts Users can update own posts; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (((auth.uid() = author_id) AND (deleted_at IS NULL) AND (COALESCE(admin_locked, false) = false))) WITH CHECK (((auth.uid() = author_id) AND (deleted_at IS NULL) AND (COALESCE(admin_locked, false) = false)));


--
-- TOC entry 4326 (class 3256 OID 17946)
-- Name: post_reactions Users can update own reaction; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can update own reaction" ON public.post_reactions;
CREATE POLICY "Users can update own reaction" ON public.post_reactions FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 4309 (class 3256 OID 17837)
-- Name: ratings Users can update their own rating; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can update their own rating" ON public.ratings;
CREATE POLICY "Users can update their own rating" ON public.ratings FOR UPDATE USING ((auth.uid() = user_id));


--
-- TOC entry 4321 (class 3256 OID 17915)
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- TOC entry 4278 (class 0 OID 18088)
-- Dependencies: 383
-- Name: admin_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4343 (class 3256 OID 18105)
-- Name: admin_actions admin_actions_insert_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_actions_insert_admins ON public.admin_actions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4342 (class 3256 OID 18104)
-- Name: admin_actions admin_actions_select_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_actions_select_admins ON public.admin_actions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4273 (class 0 OID 17636)
-- Dependencies: 377
-- Name: comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4300 (class 3256 OID 17707)
-- Name: comments comments_delete_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_delete_own_or_admin ON public.comments FOR DELETE USING (((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


--
-- TOC entry 4333 (class 3256 OID 18016)
-- Name: comments comments_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_insert_auth ON public.comments FOR INSERT WITH CHECK (((auth.uid() = author_id) AND (NOT ( SELECT profiles.is_banned
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- TOC entry 4299 (class 3256 OID 17705)
-- Name: comments comments_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_select_all ON public.comments FOR SELECT USING (true);


--
-- TOC entry 4277 (class 0 OID 18067)
-- Dependencies: 382
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4341 (class 3256 OID 18087)
-- Name: notifications notifications_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_authenticated ON public.notifications FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4339 (class 3256 OID 18085)
-- Name: notifications notifications_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


--
-- TOC entry 4340 (class 3256 OID 18086)
-- Name: notifications notifications_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4276 (class 0 OID 17922)
-- Dependencies: 380
-- Name: post_reactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4338 (class 3256 OID 18060)
-- Name: post_reactions post_reactions_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_reactions_delete_own ON public.post_reactions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 4336 (class 3256 OID 18058)
-- Name: post_reactions post_reactions_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_reactions_insert_own ON public.post_reactions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4335 (class 3256 OID 18057)
-- Name: post_reactions post_reactions_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_reactions_select_all ON public.post_reactions FOR SELECT TO authenticated, anon USING (true);


--
-- TOC entry 4337 (class 3256 OID 18059)
-- Name: post_reactions post_reactions_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_reactions_update_own ON public.post_reactions FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4272 (class 0 OID 17617)
-- Dependencies: 376
-- Name: posts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4298 (class 3256 OID 17704)
-- Name: posts posts_delete_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_delete_own_or_admin ON public.posts FOR DELETE USING (((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


--
-- TOC entry 4378 (class 3256 OID 18832)
-- Name: posts posts_insert_requires_tutorial_ack; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_insert_requires_tutorial_ack ON public.posts AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_submission_acks a
  WHERE (a.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))));


--
-- TOC entry 4332 (class 3256 OID 18015)
-- Name: posts posts_insert_verified; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_insert_verified ON public.posts FOR INSERT WITH CHECK (((auth.uid() = author_id) AND (status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.email_verified = true)))) AND (NOT ( SELECT profiles.is_banned
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


--
-- TOC entry 4366 (class 3256 OID 18555)
-- Name: posts posts_select_approved; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_select_approved ON public.posts FOR SELECT USING ((((status = 'published'::text) AND (deleted_at IS NULL)) OR (author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


--
-- TOC entry 4367 (class 3256 OID 18556)
-- Name: posts posts_update_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_update_own_or_admin ON public.posts FOR UPDATE USING ((((author_id = auth.uid()) AND (deleted_at IS NULL) AND (COALESCE(admin_locked, false) = false)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))) WITH CHECK ((((author_id = auth.uid()) AND (deleted_at IS NULL) AND (COALESCE(admin_locked, false) = false)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


--
-- TOC entry 4271 (class 0 OID 17599)
-- Dependencies: 375
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4297 (class 3256 OID 17700)
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- TOC entry 4295 (class 3256 OID 17698)
-- Name: profiles profiles_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);


--
-- TOC entry 4317 (class 3256 OID 18012)
-- Name: profiles profiles_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE USING (public.is_admin());


--
-- TOC entry 4296 (class 3256 OID 17699)
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = id));


--
-- TOC entry 4274 (class 0 OID 17655)
-- Dependencies: 378
-- Name: ratings; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4303 (class 3256 OID 17710)
-- Name: ratings ratings_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ratings_delete_own ON public.ratings FOR DELETE USING ((auth.uid() = user_id));


--
-- TOC entry 4302 (class 3256 OID 17709)
-- Name: ratings ratings_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ratings_insert_auth ON public.ratings FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4301 (class 3256 OID 17708)
-- Name: ratings ratings_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ratings_select_all ON public.ratings FOR SELECT USING (true);


--
-- TOC entry 4275 (class 0 OID 17677)
-- Dependencies: 379
-- Name: reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4331 (class 3256 OID 18002)
-- Name: reports reports_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_delete_admin ON public.reports FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- TOC entry 4304 (class 3256 OID 17711)
-- Name: reports reports_insert_auth; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_insert_auth ON public.reports FOR INSERT WITH CHECK ((auth.uid() = reporter_id));


--
-- TOC entry 4305 (class 3256 OID 17712)
-- Name: reports reports_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_select_admin ON public.reports FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- TOC entry 4306 (class 3256 OID 17713)
-- Name: reports reports_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_update_admin ON public.reports FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- TOC entry 4294 (class 0 OID 18815)
-- Dependencies: 399
-- Name: user_submission_acks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_submission_acks ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4376 (class 3256 OID 18830)
-- Name: user_submission_acks user_submission_acks_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_submission_acks_insert_own ON public.user_submission_acks FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- TOC entry 4377 (class 3256 OID 18831)
-- Name: user_submission_acks user_submission_acks_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_submission_acks_select_admin ON public.user_submission_acks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- TOC entry 4375 (class 3256 OID 18829)
-- Name: user_submission_acks user_submission_acks_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_submission_acks_select_own ON public.user_submission_acks FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- TOC entry 4283 (class 0 OID 18235)
-- Dependencies: 388
-- Name: wiki_category_extensions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_category_extensions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4318 (class 3256 OID 18269)
-- Name: wiki_category_extensions wiki_category_extensions_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_category_extensions_read_authenticated ON public.wiki_category_extensions FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4319 (class 3256 OID 18270)
-- Name: wiki_category_extensions wiki_category_extensions_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_category_extensions_write_admin ON public.wiki_category_extensions USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4282 (class 0 OID 18212)
-- Dependencies: 387
-- Name: wiki_discovery_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_discovery_evidence ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4350 (class 3256 OID 18266)
-- Name: wiki_discovery_evidence wiki_discovery_evidence_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_discovery_evidence_read_authenticated ON public.wiki_discovery_evidence FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4351 (class 3256 OID 18267)
-- Name: wiki_discovery_evidence wiki_discovery_evidence_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_discovery_evidence_write_admin ON public.wiki_discovery_evidence USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4279 (class 0 OID 18129)
-- Dependencies: 384
-- Name: wiki_entities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_entities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4344 (class 3256 OID 18257)
-- Name: wiki_entities wiki_entities_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entities_read_authenticated ON public.wiki_entities FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4345 (class 3256 OID 18258)
-- Name: wiki_entities wiki_entities_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entities_write_admin ON public.wiki_entities USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4280 (class 0 OID 18158)
-- Dependencies: 385
-- Name: wiki_entity_aliases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_entity_aliases ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4346 (class 3256 OID 18260)
-- Name: wiki_entity_aliases wiki_entity_aliases_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_aliases_read_authenticated ON public.wiki_entity_aliases FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4347 (class 3256 OID 18261)
-- Name: wiki_entity_aliases wiki_entity_aliases_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_aliases_write_admin ON public.wiki_entity_aliases USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4292 (class 0 OID 18721)
-- Dependencies: 397
-- Name: wiki_entity_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_entity_claims ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4371 (class 3256 OID 18775)
-- Name: wiki_entity_claims wiki_entity_claims_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_claims_select_authenticated ON public.wiki_entity_claims FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4372 (class 3256 OID 18776)
-- Name: wiki_entity_claims wiki_entity_claims_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_claims_write_admin ON public.wiki_entity_claims USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- TOC entry 4288 (class 0 OID 18416)
-- Dependencies: 393
-- Name: wiki_entity_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_entity_history ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4320 (class 3256 OID 18510)
-- Name: wiki_entity_history wiki_entity_history_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_history_read_authenticated ON public.wiki_entity_history FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4358 (class 3256 OID 18511)
-- Name: wiki_entity_history wiki_entity_history_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_history_write_admin ON public.wiki_entity_history USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4289 (class 0 OID 18464)
-- Dependencies: 394
-- Name: wiki_entity_merge_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_entity_merge_history ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4359 (class 3256 OID 18513)
-- Name: wiki_entity_merge_history wiki_entity_merge_history_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_merge_history_read_authenticated ON public.wiki_entity_merge_history FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4360 (class 3256 OID 18514)
-- Name: wiki_entity_merge_history wiki_entity_merge_history_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_merge_history_write_admin ON public.wiki_entity_merge_history USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4281 (class 0 OID 18180)
-- Dependencies: 386
-- Name: wiki_entity_relations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_entity_relations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4348 (class 3256 OID 18263)
-- Name: wiki_entity_relations wiki_entity_relations_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_relations_read_authenticated ON public.wiki_entity_relations FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4349 (class 3256 OID 18264)
-- Name: wiki_entity_relations wiki_entity_relations_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_relations_write_admin ON public.wiki_entity_relations USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4291 (class 0 OID 18694)
-- Dependencies: 396
-- Name: wiki_observation_entities; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_observation_entities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4370 (class 3256 OID 18774)
-- Name: wiki_observation_entities wiki_observation_entities_select_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_observation_entities_select_own_or_admin ON public.wiki_observation_entities FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.wiki_observations o
  WHERE ((o.id = wiki_observation_entities.observation_id) AND ((o.author_id = auth.uid()) OR (EXISTS ( SELECT 1
           FROM public.profiles
          WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))))));


--
-- TOC entry 4290 (class 0 OID 18657)
-- Dependencies: 395
-- Name: wiki_observations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_observations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4369 (class 3256 OID 18773)
-- Name: wiki_observations wiki_observations_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_observations_insert_own ON public.wiki_observations FOR INSERT WITH CHECK ((author_id = auth.uid()));


--
-- TOC entry 4368 (class 3256 OID 18772)
-- Name: wiki_observations wiki_observations_select_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_observations_select_own_or_admin ON public.wiki_observations FOR SELECT USING (((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


--
-- TOC entry 4293 (class 0 OID 18783)
-- Dependencies: 398
-- Name: wiki_patch_mode; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_patch_mode ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4374 (class 3256 OID 18800)
-- Name: wiki_patch_mode wiki_patch_mode_admin_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_patch_mode_admin_update ON public.wiki_patch_mode FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4373 (class 3256 OID 18799)
-- Name: wiki_patch_mode wiki_patch_mode_select_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_patch_mode_select_all ON public.wiki_patch_mode FOR SELECT USING (true);


--
-- TOC entry 4285 (class 0 OID 18294)
-- Dependencies: 390
-- Name: wiki_relation_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_relation_types ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4354 (class 3256 OID 18504)
-- Name: wiki_relation_types wiki_relation_types_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_relation_types_read_authenticated ON public.wiki_relation_types FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4355 (class 3256 OID 18505)
-- Name: wiki_relation_types wiki_relation_types_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_relation_types_write_admin ON public.wiki_relation_types USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4284 (class 0 OID 18273)
-- Dependencies: 389
-- Name: wiki_schema_versions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_schema_versions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4352 (class 3256 OID 18501)
-- Name: wiki_schema_versions wiki_schema_versions_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_schema_versions_read_authenticated ON public.wiki_schema_versions FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4353 (class 3256 OID 18502)
-- Name: wiki_schema_versions wiki_schema_versions_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_schema_versions_write_admin ON public.wiki_schema_versions USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4286 (class 0 OID 18348)
-- Dependencies: 391
-- Name: wiki_submission_statuses; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_submission_statuses ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4361 (class 3256 OID 18516)
-- Name: wiki_submission_statuses wiki_submission_statuses_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_submission_statuses_read_authenticated ON public.wiki_submission_statuses FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4362 (class 3256 OID 18517)
-- Name: wiki_submission_statuses wiki_submission_statuses_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_submission_statuses_write_admin ON public.wiki_submission_statuses USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


--
-- TOC entry 4287 (class 0 OID 18368)
-- Dependencies: 392
-- Name: wiki_sync_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.wiki_sync_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4356 (class 3256 OID 18507)
-- Name: wiki_sync_logs wiki_sync_logs_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_sync_logs_read_authenticated ON public.wiki_sync_logs FOR SELECT USING ((auth.role() = 'authenticated'::text));


--
-- TOC entry 4357 (class 3256 OID 18508)
-- Name: wiki_sync_logs wiki_sync_logs_write_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_sync_logs_write_admin ON public.wiki_sync_logs USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));



--
--


commit;
