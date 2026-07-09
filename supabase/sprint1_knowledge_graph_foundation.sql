-- sprint1_knowledge_graph_foundation.sql
--
-- Sprint 1 additive foundation for canonical knowledge graph governance.
-- Non-destructive only: no drops, no rewrites of existing data.
--
-- Adds:
--   - wiki_schema_versions (extended with entity_type)
--   - wiki_relation_types (controlled relation vocabulary)
--   - wiki_sync_logs
--   - wiki_entity_history (with revision prep + snapshot prep + review/approval refs)
--   - wiki_entity_merge_history (future duplicate merge workflows)
--   - submission status extension on posts via additive column + registry table
--   - deterministic canonical identity + soft-deprecate status models + override auditing

begin;

-- =====================================================
-- Schema version registry (domain-specific)
-- =====================================================
create table if not exists public.wiki_schema_versions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  schema_key text not null,
  version_major integer not null,
  version_minor integer not null default 0,
  version_patch integer not null default 0,
  status text not null default 'active' check (status in ('draft', 'active', 'deprecated')),
  json_schema jsonb not null,
  migration_notes text,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz,
  unique (entity_type, schema_key, version_major, version_minor, version_patch)
);

create index if not exists idx_wiki_schema_versions_lookup
  on public.wiki_schema_versions(entity_type, schema_key, status);

-- =====================================================
-- Relation type registry (core KG semantics)
-- =====================================================
create table if not exists public.wiki_relation_types (
  id uuid primary key default gen_random_uuid(),
  relation_code text not null unique,
  label text not null,
  description text,
  inverse_relation_code text,
  is_symmetric boolean not null default false,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id) on delete set null
);

create index if not exists idx_wiki_relation_types_active
  on public.wiki_relation_types(is_active);

insert into public.wiki_relation_types (relation_code, label, description)
values
  ('RELATED_TO', 'Related To', 'Generic relation fallback when no stronger semantic type is available.'),
  ('FOUND_IN', 'Found In', 'Entity appears in a location/biome/zone.'),
  ('DROPS', 'Drops', 'Entity drops another entity/item.'),
  ('REQUIRES', 'Requires', 'Entity/event requires another prerequisite entity.'),
  ('UNLOCKS', 'Unlocks', 'Entity/event unlocks another entity/state.'),
  ('CRAFTED_FROM', 'Crafted From', 'Crafted item requires ingredient/resource.'),
  ('CRAFTED_AT', 'Crafted At', 'Crafted item is made at a station.'),
  ('INGREDIENT_OF', 'Ingredient Of', 'Resource/ingredient is used in another crafted item.'),
  ('PART_OF', 'Part Of', 'Entity is part of a larger entity/group/system.'),
  ('VARIANT_OF', 'Variant Of', 'Entity is a variant of another base entity.'),
  ('CHANGED_BY_PATCH', 'Changed By Patch', 'Behavior/entity changed by a patch/version.')
on conflict (relation_code) do nothing;

-- Extend existing relations table without breaking current text relation_type usage.
alter table public.wiki_entity_relations
  add column if not exists relation_type_id uuid references public.wiki_relation_types(id) on delete set null,
  add column if not exists relation_status text not null default 'active' check (relation_status in ('active', 'deprecated')),
  add column if not exists relation_status_reason text,
  add column if not exists relation_status_updated_at timestamptz,
  add column if not exists relation_status_updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified boolean not null default false,
  add column if not exists verified_by uuid references public.profiles(id) on delete set null,
  add column if not exists verified_at timestamptz,
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_wiki_entity_relations_relation_type_id
  on public.wiki_entity_relations(relation_type_id);

create index if not exists idx_wiki_entity_relations_status
  on public.wiki_entity_relations(relation_status);

-- Extend evidence model to soft lifecycle; avoid hard deletes.
alter table public.wiki_discovery_evidence
  add column if not exists evidence_status text not null default 'active' check (evidence_status in ('active', 'deprecated', 'invalid')),
  add column if not exists evidence_status_reason text,
  add column if not exists evidence_status_updated_at timestamptz,
  add column if not exists evidence_status_updated_by uuid references public.profiles(id) on delete set null;

create index if not exists idx_wiki_discovery_evidence_status
  on public.wiki_discovery_evidence(evidence_status);

-- Deterministic canonical identity for entity upserts.
alter table public.wiki_entities
  add column if not exists canonical_key text;

update public.wiki_entities
set canonical_key = lower(trim(both '-' from regexp_replace(
  coalesce(entity_type, 'entity') || '-' || coalesce(slug, ''),
  '[^a-z0-9]+', '-', 'g'
)))
where canonical_key is null;

create unique index if not exists uq_wiki_entities_canonical_key
  on public.wiki_entities(canonical_key);

-- =====================================================
-- Submission lifecycle extension (additive)
-- =====================================================
create table if not exists public.wiki_submission_statuses (
  code text primary key,
  label text not null,
  sort_order integer not null,
  is_terminal boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.wiki_submission_statuses (code, label, sort_order, is_terminal)
values
  ('draft', 'Draft', 10, false),
  ('submitted', 'Submitted', 20, false),
  ('validating', 'Validating', 30, false),
  ('approved', 'Approved', 40, false),
  ('indexed', 'Indexed', 50, false),
  ('verified', 'Verified', 60, true),
  ('needs_revision', 'Needs Revision', 70, false),
  ('rejected', 'Rejected', 80, true),
  ('superseded', 'Superseded', 90, true)
on conflict (code) do update
set label = excluded.label,
    sort_order = excluded.sort_order,
    is_terminal = excluded.is_terminal;

alter table public.posts
  add column if not exists submission_status text,
  add column if not exists submission_review_note text,
  add column if not exists submission_status_updated_at timestamptz,
  add column if not exists submission_status_updated_by uuid references public.profiles(id) on delete set null;

-- Add FK only after table exists; keep nullable to avoid destructive backfill.
do $$
begin
  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'posts'
      and constraint_name = 'posts_submission_status_fkey'
  ) then
    alter table public.posts
      add constraint posts_submission_status_fkey
      foreign key (submission_status) references public.wiki_submission_statuses(code);
  end if;
end $$;

create index if not exists idx_posts_submission_status
  on public.posts(submission_status);

-- =====================================================
-- Sync execution logs
-- =====================================================
create table if not exists public.wiki_sync_logs (
  id uuid primary key default gen_random_uuid(),
  source_post_id uuid not null references public.posts(id) on delete cascade,
  entity_id uuid references public.wiki_entities(id) on delete set null,
  operation_type text not null check (operation_type in ('approve_sync', 'resync', 'manual_rebuild', 'rollback')),
  sync_status text not null check (sync_status in ('pending', 'running', 'success', 'failed', 'canceled')),
  input_schema_version_id uuid references public.wiki_schema_versions(id) on delete set null,
  target_schema_version_id uuid references public.wiki_schema_versions(id) on delete set null,
  source_post_updated_at timestamptz,
  original_payload_hash text,
  override_payload_hash text,
  payload_override jsonb,
  payload_override_reason text,
  payload_override_actor uuid references public.profiles(id) on delete set null,
  source_payload_hash text,
  idempotency_key text not null unique,
  rows_entities_upserted integer not null default 0,
  rows_relations_upserted integer not null default 0,
  rows_evidence_upserted integer not null default 0,
  error_code text,
  error_message text,
  error_details jsonb,
  started_at timestamptz,
  finished_at timestamptz,
  governance_status_before text,
  governance_status_after text,
  triggered_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_wiki_sync_logs_post
  on public.wiki_sync_logs(source_post_id, created_at desc);

create index if not exists idx_wiki_sync_logs_status
  on public.wiki_sync_logs(sync_status, created_at desc);

-- =====================================================
-- Entity history (revision-ready + snapshot-ready)
-- =====================================================
create table if not exists public.wiki_entity_history (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.wiki_entities(id) on delete cascade,
  revision_number integer not null,
  source_post_id uuid references public.posts(id) on delete set null,
  sync_log_id uuid references public.wiki_sync_logs(id) on delete set null,
  schema_version_id uuid references public.wiki_schema_versions(id) on delete set null,
  event_type text not null check (
    event_type in (
      'created',
      'field_changed',
      'relation_added',
      'relation_removed',
      'evidence_added',
      'evidence_removed',
      'status_changed',
      'schema_migrated',
      'merged',
      'split'
    )
  ),
  field_name text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  confidence_before integer check (confidence_before >= 0 and confidence_before <= 100),
  confidence_after integer check (confidence_after >= 0 and confidence_after <= 100),
  change_set jsonb,
  snapshot_data jsonb,
  review_id uuid,
  approval_id uuid,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamptz not null default now(),
  unique (entity_id, revision_number)
);

create index if not exists idx_wiki_entity_history_entity_time
  on public.wiki_entity_history(entity_id, changed_at desc);

create index if not exists idx_wiki_entity_history_source_post
  on public.wiki_entity_history(source_post_id);

create index if not exists idx_wiki_entity_history_review
  on public.wiki_entity_history(review_id);

create index if not exists idx_wiki_entity_history_approval
  on public.wiki_entity_history(approval_id);

-- Optional FK to admin_actions when that table exists in the environment.
do $$
begin
  if to_regclass('public.admin_actions') is not null
     and not exists (
       select 1
       from information_schema.table_constraints
       where constraint_schema = 'public'
         and table_name = 'wiki_entity_history'
         and constraint_name = 'wiki_entity_history_approval_id_fkey'
     ) then
    alter table public.wiki_entity_history
      add constraint wiki_entity_history_approval_id_fkey
      foreign key (approval_id) references public.admin_actions(id) on delete set null;
  end if;
end $$;

-- =====================================================
-- Merge history for future duplicate resolution workflows
-- =====================================================
create table if not exists public.wiki_entity_merge_history (
  id uuid primary key default gen_random_uuid(),
  winner_entity_id uuid not null references public.wiki_entities(id) on delete restrict,
  loser_entity_id uuid not null references public.wiki_entities(id) on delete restrict,
  merge_reason text,
  merged_fields jsonb,
  winner_revision_after integer,
  source_post_id uuid references public.posts(id) on delete set null,
  sync_log_id uuid references public.wiki_sync_logs(id) on delete set null,
  merged_by uuid references public.profiles(id) on delete set null,
  merged_at timestamptz not null default now(),
  constraint chk_wiki_entity_merge_distinct check (winner_entity_id <> loser_entity_id)
);

create index if not exists idx_wiki_entity_merge_winner
  on public.wiki_entity_merge_history(winner_entity_id, merged_at desc);

create index if not exists idx_wiki_entity_merge_loser
  on public.wiki_entity_merge_history(loser_entity_id, merged_at desc);

-- =====================================================
-- RLS + grants (aligned with current admin-write/auth-read model)
-- =====================================================
alter table public.wiki_schema_versions enable row level security;
alter table public.wiki_relation_types enable row level security;
alter table public.wiki_sync_logs enable row level security;
alter table public.wiki_entity_history enable row level security;
alter table public.wiki_entity_merge_history enable row level security;
alter table public.wiki_submission_statuses enable row level security;

do $$
begin
  -- wiki_schema_versions
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_schema_versions' and policyname = 'wiki_schema_versions_read_authenticated'
  ) then
    create policy wiki_schema_versions_read_authenticated
      on public.wiki_schema_versions
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_schema_versions' and policyname = 'wiki_schema_versions_write_admin'
  ) then
    create policy wiki_schema_versions_write_admin
      on public.wiki_schema_versions
      for all
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;

  -- wiki_relation_types
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_relation_types' and policyname = 'wiki_relation_types_read_authenticated'
  ) then
    create policy wiki_relation_types_read_authenticated
      on public.wiki_relation_types
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_relation_types' and policyname = 'wiki_relation_types_write_admin'
  ) then
    create policy wiki_relation_types_write_admin
      on public.wiki_relation_types
      for all
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;

  -- wiki_sync_logs
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_sync_logs' and policyname = 'wiki_sync_logs_read_authenticated'
  ) then
    create policy wiki_sync_logs_read_authenticated
      on public.wiki_sync_logs
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_sync_logs' and policyname = 'wiki_sync_logs_write_admin'
  ) then
    create policy wiki_sync_logs_write_admin
      on public.wiki_sync_logs
      for all
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;

  -- wiki_entity_history
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entity_history' and policyname = 'wiki_entity_history_read_authenticated'
  ) then
    create policy wiki_entity_history_read_authenticated
      on public.wiki_entity_history
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entity_history' and policyname = 'wiki_entity_history_write_admin'
  ) then
    create policy wiki_entity_history_write_admin
      on public.wiki_entity_history
      for all
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;

  -- wiki_entity_merge_history
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entity_merge_history' and policyname = 'wiki_entity_merge_history_read_authenticated'
  ) then
    create policy wiki_entity_merge_history_read_authenticated
      on public.wiki_entity_merge_history
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entity_merge_history' and policyname = 'wiki_entity_merge_history_write_admin'
  ) then
    create policy wiki_entity_merge_history_write_admin
      on public.wiki_entity_merge_history
      for all
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;

  -- wiki_submission_statuses
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_submission_statuses' and policyname = 'wiki_submission_statuses_read_authenticated'
  ) then
    create policy wiki_submission_statuses_read_authenticated
      on public.wiki_submission_statuses
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_submission_statuses' and policyname = 'wiki_submission_statuses_write_admin'
  ) then
    create policy wiki_submission_statuses_write_admin
      on public.wiki_submission_statuses
      for all
      using (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      )
      with check (
        exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
      );
  end if;
end $$;

grant select on public.wiki_schema_versions to authenticated;
grant select on public.wiki_relation_types to authenticated;
grant select on public.wiki_sync_logs to authenticated;
grant select on public.wiki_entity_history to authenticated;
grant select on public.wiki_entity_merge_history to authenticated;
grant select on public.wiki_submission_statuses to authenticated;

grant insert, update, delete on public.wiki_schema_versions to authenticated;
grant insert, update, delete on public.wiki_relation_types to authenticated;
grant insert, update, delete on public.wiki_sync_logs to authenticated;
grant insert, update, delete on public.wiki_entity_history to authenticated;
grant insert, update, delete on public.wiki_entity_merge_history to authenticated;
grant insert, update, delete on public.wiki_submission_statuses to authenticated;

commit;
