-- discovery_entity_backbone.sql
--
-- Foundation for structured discovery/entity persistence beyond post metadata.
-- Run manually in Supabase SQL editor before enabling entity sync features.

begin;

create table if not exists public.wiki_entities (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  canonical_name text not null,
  slug text not null,
  category_slug text,
  subcategory_slug text,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  source_post_id uuid references public.posts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (entity_type, slug)
);

create index if not exists idx_wiki_entities_type on public.wiki_entities(entity_type);
create index if not exists idx_wiki_entities_category on public.wiki_entities(category_slug, subcategory_slug);
create index if not exists idx_wiki_entities_source_post on public.wiki_entities(source_post_id);
create index if not exists idx_wiki_entities_metadata_gin on public.wiki_entities using gin(metadata);

create table if not exists public.wiki_entity_aliases (
  id uuid primary key default gen_random_uuid(),
  entity_id uuid not null references public.wiki_entities(id) on delete cascade,
  alias_name text not null,
  normalized_alias text not null,
  source_post_id uuid references public.posts(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (entity_id, normalized_alias)
);

create index if not exists idx_wiki_entity_aliases_norm on public.wiki_entity_aliases(normalized_alias);

create table if not exists public.wiki_entity_relations (
  id uuid primary key default gen_random_uuid(),
  source_entity_id uuid not null references public.wiki_entities(id) on delete cascade,
  target_entity_id uuid not null references public.wiki_entities(id) on delete cascade,
  relation_type text not null,
  source_post_id uuid references public.posts(id) on delete set null,
  confidence integer not null default 70 check (confidence >= 0 and confidence <= 100),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (source_entity_id, target_entity_id, relation_type)
);

create index if not exists idx_wiki_entity_relations_source on public.wiki_entity_relations(source_entity_id);
create index if not exists idx_wiki_entity_relations_target on public.wiki_entity_relations(target_entity_id);
create index if not exists idx_wiki_entity_relations_type on public.wiki_entity_relations(relation_type);

create table if not exists public.wiki_discovery_evidence (
  id uuid primary key default gen_random_uuid(),
  source_post_id uuid not null references public.posts(id) on delete cascade,
  entity_id uuid references public.wiki_entities(id) on delete set null,
  evidence_kind text not null,
  label text,
  url text,
  file_type text,
  supports_fields text[] not null default '{}',
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_wiki_discovery_evidence_post on public.wiki_discovery_evidence(source_post_id);
create index if not exists idx_wiki_discovery_evidence_entity on public.wiki_discovery_evidence(entity_id);

create table if not exists public.wiki_category_extensions (
  id uuid primary key default gen_random_uuid(),
  category_slug text not null,
  subcategory_slug text not null,
  display_label text not null,
  status text not null default 'approved' check (status in ('approved', 'pending', 'rejected')),
  source_post_id uuid references public.posts(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (category_slug, subcategory_slug)
);

create index if not exists idx_wiki_category_extensions_category on public.wiki_category_extensions(category_slug, status);

create or replace function public.set_wiki_entity_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_wiki_entities_updated_at on public.wiki_entities;
create trigger trg_wiki_entities_updated_at
before update on public.wiki_entities
for each row
execute function public.set_wiki_entity_updated_at();

alter table public.wiki_entities enable row level security;
alter table public.wiki_entity_aliases enable row level security;
alter table public.wiki_entity_relations enable row level security;
alter table public.wiki_discovery_evidence enable row level security;
alter table public.wiki_category_extensions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entities' and policyname = 'wiki_entities_read_authenticated'
  ) then
    create policy wiki_entities_read_authenticated
      on public.wiki_entities
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entities' and policyname = 'wiki_entities_write_admin'
  ) then
    create policy wiki_entities_write_admin
      on public.wiki_entities
      for all
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entity_aliases' and policyname = 'wiki_entity_aliases_read_authenticated'
  ) then
    create policy wiki_entity_aliases_read_authenticated
      on public.wiki_entity_aliases
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entity_aliases' and policyname = 'wiki_entity_aliases_write_admin'
  ) then
    create policy wiki_entity_aliases_write_admin
      on public.wiki_entity_aliases
      for all
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entity_relations' and policyname = 'wiki_entity_relations_read_authenticated'
  ) then
    create policy wiki_entity_relations_read_authenticated
      on public.wiki_entity_relations
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_entity_relations' and policyname = 'wiki_entity_relations_write_admin'
  ) then
    create policy wiki_entity_relations_write_admin
      on public.wiki_entity_relations
      for all
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_discovery_evidence' and policyname = 'wiki_discovery_evidence_read_authenticated'
  ) then
    create policy wiki_discovery_evidence_read_authenticated
      on public.wiki_discovery_evidence
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_discovery_evidence' and policyname = 'wiki_discovery_evidence_write_admin'
  ) then
    create policy wiki_discovery_evidence_write_admin
      on public.wiki_discovery_evidence
      for all
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_category_extensions' and policyname = 'wiki_category_extensions_read_authenticated'
  ) then
    create policy wiki_category_extensions_read_authenticated
      on public.wiki_category_extensions
      for select
      using (auth.role() = 'authenticated');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'wiki_category_extensions' and policyname = 'wiki_category_extensions_write_admin'
  ) then
    create policy wiki_category_extensions_write_admin
      on public.wiki_category_extensions
      for all
      using (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from public.profiles p
          where p.id = auth.uid() and p.role = 'admin'
        )
      );
  end if;
end $$;

grant select on public.wiki_entities to authenticated;
grant select on public.wiki_entity_aliases to authenticated;
grant select on public.wiki_entity_relations to authenticated;
grant select on public.wiki_discovery_evidence to authenticated;
grant select on public.wiki_category_extensions to authenticated;

grant insert, update, delete on public.wiki_entities to authenticated;
grant insert, update, delete on public.wiki_entity_aliases to authenticated;
grant insert, update, delete on public.wiki_entity_relations to authenticated;
grant insert, update, delete on public.wiki_discovery_evidence to authenticated;
grant insert, update, delete on public.wiki_category_extensions to authenticated;

commit;