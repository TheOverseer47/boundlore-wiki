-- =============================================================================
-- P5-E.9G.8C — Observation RPC release-lock closure (production hardening)
-- =============================================================================
-- Scope: CREATE OR REPLACE public.bl_register_observation only.
-- Preconditions:
--   - release_gate_lock.sql applied (bl_assert_can_create_user_content, bl_is_admin_actor)
--   - user_submission_acks table present (tutorial-ack gate)
-- Postconditions:
--   - Auth, tutorial-ack, and release-lock assert before any write
-- Idempotent: CREATE OR REPLACE FUNCTION + controlled GRANT
-- No product data mutation. No new tables.
-- =============================================================================

begin;

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
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
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
  -- 1) Auth / user context
  if v_user_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  -- 2) Tutorial acknowledgement (mirrors posts_insert_requires_tutorial_ack)
  if not public.bl_is_admin_actor(v_user_id)
     and not exists (
       select 1
       from public.user_submission_acks usa
       where usa.user_id = v_user_id
     ) then
    raise exception 'Tutorial acknowledgement required before registering observation'
      using errcode = '42501';
  end if;

  -- 3) Release-lock / contribution assert (fail-closed via applied helpers)
  perform public.bl_assert_can_create_user_content('bl_register_observation');

  -- 4) Input validation
  if length(btrim(coalesce(p_entity_name, ''))) < 2 then
    raise exception 'Entity name is required';
  end if;

  v_entity_type := public.bl_map_category_to_entity_type(p_category_slug, p_subcategory_slug);
  v_canonical_key := public.bl_build_canonical_key(v_entity_type, p_entity_name, p_world_name, p_region_name);
  v_post_slug := public.bl_slugify_text(coalesce(nullif(p_title, ''), p_entity_name))
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

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

  -- 5) Productive writes (only after all gates above)
  insert into public.wiki_observations (
    author_id, category_slug, subcategory_slug, entity_name,
    world_name, region_name, payload, status, match_summary
  ) values (
    v_user_id, p_category_slug, p_subcategory_slug, p_entity_name,
    p_world_name, p_region_name, coalesce(p_payload, '{}'::jsonb), 'submitted', v_match_summary
  )
  returning id into v_observation_id;

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

comment on function public.bl_register_observation(text, text, text, text, text, jsonb, text, text, text, jsonb) is
  'P5-E.9G.8C: Discovery observation RPC with auth, tutorial-ack, and release-lock assert before writes.';

grant execute on function public.bl_register_observation(text, text, text, text, text, jsonb, text, text, text, jsonb)
  to authenticated;

commit;
