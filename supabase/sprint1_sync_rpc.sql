-- sprint1_sync_rpc.sql
--
-- Transactional approve/resync RPC with:
-- - log lifecycle outside domain subtransaction
-- - deterministic canonical entity identity
-- - soft-deprecate relations/evidence (no hard delete)
-- - payload override audit
--
-- Requires sprint1_knowledge_graph_foundation.sql to be applied first.

begin;

create extension if not exists pgcrypto;

-- -----------------------------------------------------
-- Helpers
-- -----------------------------------------------------
create or replace function public.bl_extract_blmeta_json(p_html text)
returns jsonb
language plpgsql
immutable
as $$
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

create or replace function public.bl_slugify_text(p_input text)
returns text
language sql
immutable
as $$
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
returns text
language sql
immutable
as $$
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

create or replace function public.bl_compute_sync_idempotency_key(
  p_source_post_id uuid,
  p_operation_type text,
  p_source_post_updated_at timestamptz,
  p_entity_type text,
  p_schema_key text,
  p_version_major integer,
  p_version_minor integer,
  p_version_patch integer,
  p_payload jsonb,
  p_override jsonb
)
returns text
language sql
immutable
as $$
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

create or replace function public.bl_normalize_discovery_relation_code(
  p_relation_type text,
  p_relation_group text default null
)
returns text
language sql
stable
as $$
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

-- -----------------------------------------------------
-- Main RPC
-- -----------------------------------------------------
create or replace function public.rpc_sync_discovery_submission(
  p_source_post_id uuid,
  p_operation_type text default 'approve_sync',
  p_actor_id uuid default null,
  p_target_entity_type text default 'discovery',
  p_target_schema_key text default 'discovery.default',
  p_target_version_major integer default 1,
  p_target_version_minor integer default 0,
  p_target_version_patch integer default 0,
  p_payload_override jsonb default null,
  p_override_reason text default null,
  p_force_resync boolean default false,
  p_write_snapshot boolean default true,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := coalesce(p_actor_id, auth.uid());
  v_is_admin boolean := false;

  v_post public.posts%rowtype;
  v_post_meta jsonb := '{}'::jsonb;
  v_payload_original jsonb := '{}'::jsonb;
  v_payload_effective jsonb := '{}'::jsonb;

  v_original_payload_hash text;
  v_override_payload_hash text;

  v_schema_id uuid;

  v_sync_log_id uuid;
  v_idempotency_key text;

  v_existing_success_id uuid;
  v_existing_running_id uuid;
  v_existing_failed_id uuid;
  v_existing_failed_error_code text;
  v_existing_failed_error_message text;
  v_base_idempotency_key text;

  v_governance_before text;
  v_governance_after text;

  v_entity_id uuid;
  v_entity_name text;
  v_world_name text;
  v_region_name text;
  v_slug text;
  v_canonical_key text;
  v_entity_type text;
  v_effective_subcategory text;

  v_rel jsonb;
  v_rel_items jsonb;
  v_rel_code text;
  v_rel_type_id uuid;
  v_rel_target_title text;
  v_rel_target_slug text;
  v_rel_target_type text;
  v_rel_target_id uuid;
  v_rel_confidence integer;

  v_evidence jsonb;
  v_evidence_items jsonb;
  v_supports_fields text[];

  v_revision integer;

  v_rows_entities integer := 0;
  v_rows_relations integer := 0;
  v_rows_evidence integer := 0;
  v_rows_history integer := 0;

    v_relation_normalization_audit jsonb := '[]'::jsonb;

  v_err_state text;
  v_err_msg text;
  v_err_detail text;
begin
  -- -------------------------
  -- Actor validation
  -- -------------------------
  if v_actor_id is null then
    return jsonb_build_object(
      'success', false,
      'error', jsonb_build_object('code', 'AUTH_REQUIRED', 'message', 'Authenticated actor required')
    );
  end if;

  select exists(
    select 1 from public.profiles p
    where p.id = v_actor_id and p.role = 'admin'
  ) into v_is_admin;

  if not v_is_admin then
    return jsonb_build_object(
      'success', false,
      'error', jsonb_build_object('code', 'ADMIN_REQUIRED', 'message', 'Admin role required')
    );
  end if;

  if p_operation_type not in ('approve_sync', 'resync') then
    return jsonb_build_object(
      'success', false,
      'error', jsonb_build_object('code', 'INVALID_OPERATION', 'message', 'operation_type must be approve_sync or resync')
    );
  end if;

  -- -------------------------
  -- Load and validate source submission
  -- -------------------------
  select *
  into v_post
  from public.posts
  where id = p_source_post_id
  for update;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', jsonb_build_object('code', 'POST_NOT_FOUND', 'message', 'Source post not found')
    );
  end if;

  if v_post.deleted_at is not null then
    return jsonb_build_object(
      'success', false,
      'error', jsonb_build_object('code', 'POST_DELETED', 'message', 'Source post is deleted')
    );
  end if;

  v_governance_before := coalesce(v_post.submission_status, 'submitted');

  if p_operation_type = 'approve_sync' then
    if v_governance_before not in ('submitted', 'validating', 'needs_revision', 'approved') then
      return jsonb_build_object(
        'success', false,
        'error', jsonb_build_object('code', 'INVALID_STATUS_TRANSITION', 'message', 'approve_sync not allowed from current submission status')
      );
    end if;
  else
    if not p_force_resync and v_governance_before not in ('approved', 'indexed', 'verified') then
      return jsonb_build_object(
        'success', false,
        'error', jsonb_build_object('code', 'INVALID_RESYNC_STATE', 'message', 'resync requires approved/indexed/verified unless force_resync=true')
      );
    end if;
  end if;

  -- -------------------------
  -- Schema validation
  -- -------------------------
  select id
  into v_schema_id
  from public.wiki_schema_versions s
  where s.entity_type = p_target_entity_type
    and s.schema_key = p_target_schema_key
    and s.version_major = p_target_version_major
    and s.version_minor = p_target_version_minor
    and s.version_patch = p_target_version_patch
    and s.status = 'active'
  order by s.created_at desc
  limit 1;

  if v_schema_id is null then
    return jsonb_build_object(
      'success', false,
      'error', jsonb_build_object('code', 'SCHEMA_NOT_FOUND', 'message', 'Active target schema version not found')
    );
  end if;

  v_post_meta := public.bl_extract_blmeta_json(v_post.content);
  v_payload_original := coalesce(v_post_meta -> 'discovery_payload', '{}'::jsonb);
  v_payload_effective := coalesce(p_payload_override, v_payload_original, '{}'::jsonb);

  v_original_payload_hash := encode(extensions.digest(convert_to(coalesce(v_payload_original::text, '{}'), 'utf8'), 'sha256'), 'hex');
  v_override_payload_hash := case when p_payload_override is not null
    then encode(extensions.digest(convert_to(coalesce(p_payload_override::text, '{}'), 'utf8'), 'sha256'), 'hex')
    else null end;

  if p_idempotency_key is null or btrim(p_idempotency_key) = '' then
    v_idempotency_key := public.bl_compute_sync_idempotency_key(
      p_source_post_id,
      p_operation_type,
      v_post.updated_at,
      p_target_entity_type,
      p_target_schema_key,
      p_target_version_major,
      p_target_version_minor,
      p_target_version_patch,
      v_payload_effective,
      p_payload_override
    );
  else
    v_idempotency_key := btrim(p_idempotency_key);
  end if;

  v_base_idempotency_key := v_idempotency_key;

  -- Idempotency fast paths
  select l.id
  into v_existing_success_id
  from public.wiki_sync_logs l
  where l.idempotency_key = v_idempotency_key
    and l.sync_status = 'success'
  limit 1;

  if v_existing_success_id is not null then
    return jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'idempotency_key', v_idempotency_key,
      'sync_log_id', v_existing_success_id,
      'source_post_id', p_source_post_id
    );
  end if;

  select l.id
  into v_existing_running_id
  from public.wiki_sync_logs l
  where l.idempotency_key = v_idempotency_key
    and l.sync_status in ('pending', 'running')
  limit 1;

  if v_existing_running_id is not null then
    return jsonb_build_object(
      'success', false,
      'error', jsonb_build_object('code', 'SYNC_ALREADY_RUNNING', 'message', 'Same idempotency key is already pending/running'),
      'idempotency_key', v_idempotency_key,
      'sync_log_id', v_existing_running_id
    );
  end if;

  select l.id, l.error_code, l.error_message
  into v_existing_failed_id, v_existing_failed_error_code, v_existing_failed_error_message
  from public.wiki_sync_logs l
  where l.idempotency_key = v_base_idempotency_key
    and l.sync_status = 'failed'
  order by l.started_at desc nulls last
  limit 1;

  if v_existing_failed_id is not null then
    if not p_force_resync then
      return jsonb_build_object(
        'success', false,
        'error', jsonb_build_object(
          'code', 'PREVIOUS_SYNC_FAILED',
          'message', 'A previous sync attempt with the same idempotency key failed',
          'previous_error_code', v_existing_failed_error_code,
          'previous_error_message', v_existing_failed_error_message
        ),
        'idempotency_key', v_base_idempotency_key,
        'sync_log_id', v_existing_failed_id,
        'source_post_id', p_source_post_id
      );
    end if;

    v_idempotency_key := v_base_idempotency_key || ':retry:' || gen_random_uuid()::text;
  end if;

  -- -------------------------
  -- Create sync log outside domain subtransaction
  -- -------------------------
  insert into public.wiki_sync_logs (
    source_post_id,
    operation_type,
    sync_status,
    input_schema_version_id,
    target_schema_version_id,
    source_post_updated_at,
    original_payload_hash,
    override_payload_hash,
    payload_override,
    payload_override_reason,
    payload_override_actor,
    source_payload_hash,
    idempotency_key,
    governance_status_before,
    triggered_by,
    started_at
  ) values (
    p_source_post_id,
    p_operation_type,
    'pending',
    v_schema_id,
    v_schema_id,
    v_post.updated_at,
    v_original_payload_hash,
    v_override_payload_hash,
    p_payload_override,
    p_override_reason,
    case when p_payload_override is not null then v_actor_id else null end,
    v_original_payload_hash,
    v_idempotency_key,
    v_governance_before,
    v_actor_id,
    now()
  )
  returning id into v_sync_log_id;

  update public.wiki_sync_logs
  set sync_status = 'running'
  where id = v_sync_log_id;

  -- -------------------------
  -- Domain subtransaction
  -- -------------------------
  begin
    -- Core entity fields
    v_entity_name := coalesce(nullif(v_payload_effective ->> 'entity_name', ''), v_post.title, 'Unnamed Entity');
    v_world_name := nullif(v_payload_effective ->> 'world_name', '');
    v_region_name := nullif(v_payload_effective ->> 'region_name', '');
    v_effective_subcategory := lower(coalesce(v_post.guide_subcategory, nullif(v_post_meta ->> 'subcategory', '')));
    v_entity_type := coalesce(
      nullif(v_payload_effective ->> 'discovery_type', ''),
      case
        when v_post.category = 'creatures' then case v_effective_subcategory
          when 'mounts' then 'mount'
          when 'monsters' then 'monster'
          when 'races' then 'race'
          when 'npcs' then 'npc'
          else null
        end
        else null
      end,
      p_target_entity_type,
      'entity'
    );

    v_slug := public.bl_slugify_text(v_entity_name);
    v_canonical_key := public.bl_build_canonical_key(v_entity_type, v_entity_name, v_world_name, v_region_name);

    insert into public.wiki_entities (
      entity_type,
      canonical_name,
      canonical_key,
      slug,
      category_slug,
      subcategory_slug,
      source_post_id,
      metadata,
      created_by
    ) values (
      v_entity_type,
      v_entity_name,
      v_canonical_key,
      v_slug,
      v_post.category,
      coalesce(v_post.guide_subcategory, nullif(v_post_meta ->> 'subcategory', '')),
      v_post.id,
      jsonb_build_object(
        'payload', v_payload_effective,
        'schema_key', p_target_schema_key,
        'schema_version', jsonb_build_object(
          'major', p_target_version_major,
          'minor', p_target_version_minor,
          'patch', p_target_version_patch
        )
      ),
      v_actor_id
    )
    on conflict (canonical_key) do update
      set canonical_name = excluded.canonical_name,
          slug = excluded.slug,
          category_slug = excluded.category_slug,
          subcategory_slug = excluded.subcategory_slug,
          source_post_id = excluded.source_post_id,
          metadata = excluded.metadata,
          updated_at = now()
    returning id into v_entity_id;

    v_rows_entities := 1;

    -- Soft-deprecate previous relations from this post-source/entity
    update public.wiki_entity_relations
    set relation_status = 'deprecated',
        relation_status_reason = 'Superseded by sync ' || v_sync_log_id::text,
        relation_status_updated_at = now(),
        relation_status_updated_by = v_actor_id
    where source_entity_id = v_entity_id
      and source_post_id = v_post.id
      and relation_status = 'active';

    -- Upsert active relations from payload
    v_rel_items := coalesce(v_post_meta -> 'discovery_relations', '[]'::jsonb);
    for v_rel in
      select value from jsonb_array_elements(v_rel_items)
    loop
      v_rel_code := public.bl_normalize_discovery_relation_code(
        nullif(v_rel ->> 'relation_type', ''),
        nullif(v_rel ->> 'group', '')
      );

      if lower(coalesce(v_rel ->> 'relation_type', '')) = 'related_creature' then
        v_relation_normalization_audit := v_relation_normalization_audit || jsonb_build_array(jsonb_build_object(
          'original_relation_type', v_rel ->> 'relation_type',
          'normalized_relation_type', v_rel_code,
          'group', v_rel ->> 'group',
          'title', v_rel ->> 'title',
          'target_entity_type', v_rel ->> 'target_entity_type'
        ));
      end if;

      select id
      into v_rel_type_id
      from public.wiki_relation_types
      where relation_code = v_rel_code
        and is_active = true
      limit 1;

      if v_rel_type_id is null then
        raise exception 'Unknown relation type code: %', v_rel_code;
      end if;

      v_rel_target_title := coalesce(nullif(v_rel ->> 'title', ''), 'Unknown Target');
      v_rel_target_slug := coalesce(nullif(v_rel ->> 'slug', ''), public.bl_slugify_text(v_rel_target_title));
      v_rel_target_type := coalesce(
        nullif(v_rel ->> 'target_entity_type', ''),
        case lower(coalesce(v_rel ->> 'group', ''))
          when 'items' then 'item'
          when 'locations' then 'location'
          when 'creatures' then 'creature'
          when 'guides' then 'guide'
          else 'entity'
        end
      );

      insert into public.wiki_entities (
        entity_type,
        canonical_name,
        canonical_key,
        slug,
        category_slug,
        source_post_id,
        metadata,
        created_by
      ) values (
        v_rel_target_type,
        v_rel_target_title,
        public.bl_build_canonical_key(v_rel_target_type, v_rel_target_title, null, null),
        v_rel_target_slug,
        case lower(coalesce(v_rel ->> 'group', ''))
          when 'items' then 'items'
          when 'locations' then 'locations'
          when 'creatures' then 'creatures'
          when 'guides' then 'guides'
          else null
        end,
        v_post.id,
        jsonb_build_object('seeded_by_sync_log', v_sync_log_id),
        v_actor_id
      )
      on conflict (canonical_key) do update
        set canonical_name = excluded.canonical_name,
            slug = excluded.slug,
            updated_at = now()
      returning id into v_rel_target_id;

      v_rel_confidence := coalesce(nullif(v_rel ->> 'confidence', '')::integer, 70);
      if v_rel_confidence < 0 then v_rel_confidence := 0; end if;
      if v_rel_confidence > 100 then v_rel_confidence := 100; end if;

      insert into public.wiki_entity_relations (
        source_entity_id,
        target_entity_id,
        relation_type,
        relation_type_id,
        source_post_id,
        confidence,
        metadata,
        relation_status,
        relation_status_reason,
        relation_status_updated_at,
        relation_status_updated_by,
        created_by
      ) values (
        v_entity_id,
        v_rel_target_id,
        lower(v_rel_code),
        v_rel_type_id,
        v_post.id,
        v_rel_confidence,
        jsonb_build_object('raw_relation', v_rel),
        'active',
        null,
        now(),
        v_actor_id,
        v_actor_id
      )
      on conflict (source_entity_id, target_entity_id, relation_type) do update
        set relation_type_id = excluded.relation_type_id,
            confidence = excluded.confidence,
            metadata = excluded.metadata,
            relation_status = 'active',
            relation_status_reason = null,
            relation_status_updated_at = now(),
            relation_status_updated_by = v_actor_id;

      v_rows_relations := v_rows_relations + 1;
    end loop;

    -- Soft-deprecate previous evidence from this source post + entity
    update public.wiki_discovery_evidence
    set evidence_status = 'deprecated',
        evidence_status_reason = 'Superseded by sync ' || v_sync_log_id::text,
        evidence_status_updated_at = now(),
        evidence_status_updated_by = v_actor_id
    where source_post_id = v_post.id
      and entity_id = v_entity_id
      and evidence_status = 'active';

    -- Insert active evidence items from payload
    v_evidence_items := coalesce(v_post_meta -> 'discovery_evidence', '[]'::jsonb);
    for v_evidence in
      select value from jsonb_array_elements(v_evidence_items)
    loop
      select coalesce(array_agg(elem), '{}'::text[])
      into v_supports_fields
      from jsonb_array_elements_text(coalesce(v_evidence -> 'supports', '[]'::jsonb)) elem;

      insert into public.wiki_discovery_evidence (
        source_post_id,
        entity_id,
        evidence_kind,
        label,
        url,
        file_type,
        supports_fields,
        note,
        metadata,
        evidence_status,
        evidence_status_updated_at,
        evidence_status_updated_by
      ) values (
        v_post.id,
        v_entity_id,
        coalesce(nullif(v_evidence ->> 'kind', ''), 'link'),
        nullif(v_evidence ->> 'label', ''),
        nullif(v_evidence ->> 'url', ''),
        nullif(v_evidence ->> 'file_type', ''),
        v_supports_fields,
        nullif(v_evidence ->> 'note', ''),
        jsonb_build_object('raw_evidence', v_evidence),
        'active',
        now(),
        v_actor_id
      );

      v_rows_evidence := v_rows_evidence + 1;
    end loop;

    -- Optional category extension sync
    if v_post.category is not null and v_post.guide_subcategory is not null then
      insert into public.wiki_category_extensions (
        category_slug,
        subcategory_slug,
        display_label,
        status,
        source_post_id,
        metadata
      ) values (
        v_post.category,
        v_post.guide_subcategory,
        initcap(replace(v_post.guide_subcategory, '-', ' ')),
        'approved',
        v_post.id,
        jsonb_build_object('seeded_by_sync_log', v_sync_log_id)
      )
      on conflict (category_slug, subcategory_slug) do update
        set display_label = excluded.display_label,
            status = excluded.status,
            source_post_id = excluded.source_post_id,
            metadata = excluded.metadata;
    end if;

    -- History revision append
    select coalesce(max(h.revision_number), 0) + 1
    into v_revision
    from public.wiki_entity_history h
    where h.entity_id = v_entity_id;

    insert into public.wiki_entity_history (
      entity_id,
      revision_number,
      source_post_id,
      sync_log_id,
      schema_version_id,
      event_type,
      field_name,
      old_value,
      new_value,
      reason,
      change_set,
      snapshot_data,
      review_id,
      approval_id,
      changed_by,
      changed_at
    ) values (
      v_entity_id,
      v_revision,
      v_post.id,
      v_sync_log_id,
      v_schema_id,
      case when v_revision = 1 then 'created' else 'field_changed' end,
      'payload',
      null,
      v_payload_effective,
      coalesce(p_override_reason, 'sync from submission'),
      jsonb_build_object(
        'rows_relations_upserted', v_rows_relations,
        'rows_evidence_upserted', v_rows_evidence,
        'operation_type', p_operation_type,
        'relation_normalization', v_relation_normalization_audit,
        'relation_normalization_count', jsonb_array_length(v_relation_normalization_audit)
      ),
      case when p_write_snapshot then jsonb_build_object(
        'entity_name', v_entity_name,
        'entity_type', v_entity_type,
        'payload', v_payload_effective,
        'captured_at', now()
      ) else null end,
      case
        when coalesce(v_post_meta ->> 'review_id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then (v_post_meta ->> 'review_id')::uuid
        else null
      end,
      null,
      v_actor_id,
      now()
    );

    v_rows_history := 1;

    -- Strict separation: sync success does not mutate governance status on posts.
    v_governance_after := v_governance_before;

  exception
    when others then
      get stacked diagnostics
        v_err_state = returned_sqlstate,
        v_err_msg = message_text,
        v_err_detail = pg_exception_detail;

      -- Domain subtransaction rolled back automatically here.
      update public.wiki_sync_logs
      set sync_status = 'failed',
          error_code = v_err_state,
          error_message = v_err_msg,
          error_details = jsonb_build_object(
            'detail', v_err_detail,
            'operation_type', p_operation_type
          ),
          finished_at = now(),
          governance_status_after = v_governance_before
      where id = v_sync_log_id;

      return jsonb_build_object(
        'success', false,
        'operation_type', p_operation_type,
        'idempotency_key', v_idempotency_key,
        'sync_log_id', v_sync_log_id,
        'source_post_id', p_source_post_id,
        'error', jsonb_build_object(
          'code', v_err_state,
          'message', v_err_msg,
          'details', v_err_detail
        )
      );
  end;

  -- Finalize sync log outside domain block.
  update public.wiki_sync_logs
  set sync_status = 'success',
      entity_id = v_entity_id,
      rows_entities_upserted = v_rows_entities,
      rows_relations_upserted = v_rows_relations,
      rows_evidence_upserted = v_rows_evidence,
      governance_status_after = v_governance_after,
      finished_at = now()
  where id = v_sync_log_id;

  return jsonb_build_object(
    'success', true,
    'operation_type', p_operation_type,
    'idempotency_key', v_idempotency_key,
    'sync_log_id', v_sync_log_id,
    'source_post_id', p_source_post_id,
    'entity_id', v_entity_id,
    'submission_status_before', v_governance_before,
    'submission_status_after', v_governance_after,
    'counters', jsonb_build_object(
      'entities_upserted', v_rows_entities,
      'relations_upserted', v_rows_relations,
      'evidence_upserted', v_rows_evidence,
      'history_rows_written', v_rows_history
      ),
      'relation_normalization', jsonb_build_object(
        'count', jsonb_array_length(v_relation_normalization_audit),
        'items', v_relation_normalization_audit
    ),
    'schema', jsonb_build_object(
      'target_schema_version_id', v_schema_id
    )
  );
end;
$$;

grant execute on function public.rpc_sync_discovery_submission(
  uuid,
  text,
  uuid,
  text,
  text,
  integer,
  integer,
  integer,
  jsonb,
  text,
  boolean,
  boolean,
  text
) to authenticated;

commit;
