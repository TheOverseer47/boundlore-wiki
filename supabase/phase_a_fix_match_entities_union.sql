-- Fix: invalid UNION/INTERSECT/EXCEPT ORDER BY clause in bl_match_entities
-- Run in Supabase SQL Editor if Phase A was already applied.

begin;

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

grant execute on function public.bl_match_entities(text, text, text, text, text, integer) to authenticated;

commit;
