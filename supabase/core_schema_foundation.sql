-- core_schema_foundation.sql
--
-- P5-STAGING.5C curated core schema + P5-STAGING.6A dependency reorder
--   + P5-STAGING.6B pg_trgm extension dependency fix.
-- Source: backups/legacy-schema-only/legacy-public-schema-only-20260713-192641.sql
-- Legacy ref: ohkoojpzmptdfyowdgog (read-only export; not applied in 5C)
--
-- Apply order within file: extensions -> tables -> PK/unique -> indexes -> FKs
--   -> functions -> triggers -> RLS enable -> policies
-- No row data. No top-level INSERT/COPY. P5 security patches remain separate files.
--
-- Excluded functions: bl_register_observation (phase_a_observations_foundation.sql),
-- rpc_sync_discovery_submission (sprint1_sync_rpc.sql), release_gate (release_gate_lock.sql).

begin;

create extension if not exists pgcrypto with schema extensions;

create extension if not exists pg_trgm with schema public;

-- === Tables ===

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


CREATE TABLE IF NOT EXISTS public.wiki_submission_statuses (
    code text NOT NULL,
    label text NOT NULL,
    sort_order integer NOT NULL,
    is_terminal boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


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


CREATE TABLE IF NOT EXISTS public.post_reactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid NOT NULL,
    user_id uuid NOT NULL,
    reaction text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT post_reactions_reaction_check CHECK ((reaction = ANY (ARRAY['up'::text, 'down'::text])))
);


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


CREATE TABLE IF NOT EXISTS public.comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid,
    author_id uuid,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE IF NOT EXISTS public.ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    post_id uuid,
    user_id uuid,
    rating_type text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ratings_rating_type_check CHECK ((rating_type = ANY (ARRAY['fire'::text, 'down'::text])))
);


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


CREATE TABLE IF NOT EXISTS public.admin_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    admin_id uuid NOT NULL,
    action_type text NOT NULL,
    target_type text,
    target_id text,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


CREATE TABLE IF NOT EXISTS public.user_submission_acks (
    user_id uuid NOT NULL,
    tutorial_version text DEFAULT 'v1'::text NOT NULL,
    accepted_at timestamp with time zone DEFAULT now() NOT NULL
);


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


CREATE TABLE IF NOT EXISTS public.wiki_entity_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_id uuid NOT NULL,
    alias_name text NOT NULL,
    normalized_alias text NOT NULL,
    source_post_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


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


-- === Primary / unique constraints ===

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_user_id_key UNIQUE (post_id, user_id);


ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_username_key UNIQUE (username);


ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_post_id_user_id_key UNIQUE (post_id, user_id);


ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.user_submission_acks
    ADD CONSTRAINT user_submission_acks_pkey PRIMARY KEY (user_id);


ALTER TABLE ONLY public.wiki_category_extensions
    ADD CONSTRAINT wiki_category_extensions_category_slug_subcategory_slug_key UNIQUE (category_slug, subcategory_slug);


ALTER TABLE ONLY public.wiki_category_extensions
    ADD CONSTRAINT wiki_category_extensions_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_discovery_evidence
    ADD CONSTRAINT wiki_discovery_evidence_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_entities
    ADD CONSTRAINT wiki_entities_entity_type_slug_key UNIQUE (entity_type, slug);


ALTER TABLE ONLY public.wiki_entities
    ADD CONSTRAINT wiki_entities_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_entity_aliases
    ADD CONSTRAINT wiki_entity_aliases_entity_id_normalized_alias_key UNIQUE (entity_id, normalized_alias);


ALTER TABLE ONLY public.wiki_entity_aliases
    ADD CONSTRAINT wiki_entity_aliases_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_entity_id_claim_key_key UNIQUE (entity_id, claim_key);


ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_entity_id_revision_number_key UNIQUE (entity_id, revision_number);


ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_source_entity_id_target_entity_id_rel_key UNIQUE (source_entity_id, target_entity_id, relation_type);


ALTER TABLE ONLY public.wiki_observation_entities
    ADD CONSTRAINT wiki_observation_entities_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_observations
    ADD CONSTRAINT wiki_observations_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_patch_mode
    ADD CONSTRAINT wiki_patch_mode_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_relation_types
    ADD CONSTRAINT wiki_relation_types_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_relation_types
    ADD CONSTRAINT wiki_relation_types_relation_code_key UNIQUE (relation_code);


ALTER TABLE ONLY public.wiki_schema_versions
    ADD CONSTRAINT wiki_schema_versions_entity_type_schema_key_version_major_v_key UNIQUE (entity_type, schema_key, version_major, version_minor, version_patch);


ALTER TABLE ONLY public.wiki_schema_versions
    ADD CONSTRAINT wiki_schema_versions_pkey PRIMARY KEY (id);


ALTER TABLE ONLY public.wiki_submission_statuses
    ADD CONSTRAINT wiki_submission_statuses_pkey PRIMARY KEY (code);


ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_idempotency_key_key UNIQUE (idempotency_key);


ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_pkey PRIMARY KEY (id);


-- === Indexes ===

CREATE INDEX IF NOT EXISTS idx_admin_actions_admin ON public.admin_actions USING btree (admin_id, created_at DESC);


CREATE INDEX IF NOT EXISTS idx_admin_actions_created ON public.admin_actions USING btree (created_at DESC);


CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications USING btree (user_id, is_read);


CREATE INDEX IF NOT EXISTS idx_posts_canonical_entity ON public.posts USING btree (canonical_entity_id) WHERE (canonical_entity_id IS NOT NULL);


CREATE INDEX IF NOT EXISTS idx_posts_submission_status ON public.posts USING btree (submission_status);


CREATE INDEX IF NOT EXISTS idx_wiki_category_extensions_category ON public.wiki_category_extensions USING btree (category_slug, status);


CREATE INDEX IF NOT EXISTS idx_wiki_discovery_evidence_entity ON public.wiki_discovery_evidence USING btree (entity_id);


CREATE INDEX IF NOT EXISTS idx_wiki_discovery_evidence_post ON public.wiki_discovery_evidence USING btree (source_post_id);


CREATE INDEX IF NOT EXISTS idx_wiki_discovery_evidence_status ON public.wiki_discovery_evidence USING btree (evidence_status);


CREATE INDEX IF NOT EXISTS idx_wiki_entities_category ON public.wiki_entities USING btree (category_slug, subcategory_slug);


CREATE INDEX IF NOT EXISTS idx_wiki_entities_metadata_gin ON public.wiki_entities USING gin (metadata);


CREATE INDEX IF NOT EXISTS idx_wiki_entities_source_post ON public.wiki_entities USING btree (source_post_id);


CREATE INDEX IF NOT EXISTS idx_wiki_entities_type ON public.wiki_entities USING btree (entity_type);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_aliases_norm ON public.wiki_entity_aliases USING btree (normalized_alias);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_claims_entity ON public.wiki_entity_claims USING btree (entity_id);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_claims_status ON public.wiki_entity_claims USING btree (claim_status);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_history_approval ON public.wiki_entity_history USING btree (approval_id);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_history_entity_time ON public.wiki_entity_history USING btree (entity_id, changed_at DESC);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_history_review ON public.wiki_entity_history USING btree (review_id);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_history_source_post ON public.wiki_entity_history USING btree (source_post_id);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_merge_loser ON public.wiki_entity_merge_history USING btree (loser_entity_id, merged_at DESC);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_merge_winner ON public.wiki_entity_merge_history USING btree (winner_entity_id, merged_at DESC);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_relation_type_id ON public.wiki_entity_relations USING btree (relation_type_id);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_source ON public.wiki_entity_relations USING btree (source_entity_id);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_status ON public.wiki_entity_relations USING btree (relation_status);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_target ON public.wiki_entity_relations USING btree (target_entity_id);


CREATE INDEX IF NOT EXISTS idx_wiki_entity_relations_type ON public.wiki_entity_relations USING btree (relation_type);


CREATE INDEX IF NOT EXISTS idx_wiki_observation_entities_entity ON public.wiki_observation_entities USING btree (entity_id);


CREATE INDEX IF NOT EXISTS idx_wiki_observation_entities_obs ON public.wiki_observation_entities USING btree (observation_id);


CREATE INDEX IF NOT EXISTS idx_wiki_observations_author ON public.wiki_observations USING btree (author_id);


CREATE INDEX IF NOT EXISTS idx_wiki_observations_category ON public.wiki_observations USING btree (category_slug, subcategory_slug);


CREATE INDEX IF NOT EXISTS idx_wiki_observations_entity_name_trgm ON public.wiki_observations USING gin (entity_name public.gin_trgm_ops);


CREATE INDEX IF NOT EXISTS idx_wiki_observations_payload_gin ON public.wiki_observations USING gin (payload);


CREATE INDEX IF NOT EXISTS idx_wiki_observations_source_post ON public.wiki_observations USING btree (source_post_id);


CREATE INDEX IF NOT EXISTS idx_wiki_observations_status ON public.wiki_observations USING btree (status);


CREATE INDEX IF NOT EXISTS idx_wiki_relation_types_active ON public.wiki_relation_types USING btree (is_active);


CREATE INDEX IF NOT EXISTS idx_wiki_schema_versions_lookup ON public.wiki_schema_versions USING btree (entity_type, schema_key, status);


CREATE INDEX IF NOT EXISTS idx_wiki_sync_logs_post ON public.wiki_sync_logs USING btree (source_post_id, created_at DESC);


CREATE INDEX IF NOT EXISTS idx_wiki_sync_logs_status ON public.wiki_sync_logs USING btree (sync_status, created_at DESC);


CREATE UNIQUE INDEX IF NOT EXISTS post_reactions_post_user_unique ON public.post_reactions USING btree (post_id, user_id);


CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique_idx ON public.posts USING btree (slug);


CREATE UNIQUE INDEX IF NOT EXISTS uq_posts_canonical_entity_view ON public.posts USING btree (canonical_entity_id) WHERE ((is_entity_view = true) AND (deleted_at IS NULL) AND (status = 'published'::text));


CREATE UNIQUE INDEX IF NOT EXISTS uq_wiki_entities_canonical_key ON public.wiki_entities USING btree (canonical_key);


CREATE UNIQUE INDEX IF NOT EXISTS uq_wiki_observation_entities_role_key ON public.wiki_observation_entities USING btree (observation_id, role, COALESCE(proposed_canonical_key, proposed_name, ''::text));


-- === Foreign keys ===

ALTER TABLE ONLY public.admin_actions
    ADD CONSTRAINT admin_actions_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.comments
    ADD CONSTRAINT comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.post_reactions
    ADD CONSTRAINT post_reactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_canonical_entity_id_fkey FOREIGN KEY (canonical_entity_id) REFERENCES public.wiki_entities(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_submission_status_fkey FOREIGN KEY (submission_status) REFERENCES public.wiki_submission_statuses(code);


ALTER TABLE ONLY public.posts
    ADD CONSTRAINT posts_submission_status_updated_by_fkey FOREIGN KEY (submission_status_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_post_id_fkey FOREIGN KEY (post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.user_submission_acks
    ADD CONSTRAINT user_submission_acks_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_category_extensions
    ADD CONSTRAINT wiki_category_extensions_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_discovery_evidence
    ADD CONSTRAINT wiki_discovery_evidence_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_discovery_evidence
    ADD CONSTRAINT wiki_discovery_evidence_evidence_status_updated_by_fkey FOREIGN KEY (evidence_status_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_discovery_evidence
    ADD CONSTRAINT wiki_discovery_evidence_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_entities
    ADD CONSTRAINT wiki_entities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entities
    ADD CONSTRAINT wiki_entities_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_aliases
    ADD CONSTRAINT wiki_entity_aliases_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_entity_aliases
    ADD CONSTRAINT wiki_entity_aliases_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_first_observation_id_fkey FOREIGN KEY (first_observation_id) REFERENCES public.wiki_observations(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_claims
    ADD CONSTRAINT wiki_entity_claims_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_approval_id_fkey FOREIGN KEY (approval_id) REFERENCES public.admin_actions(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_schema_version_id_fkey FOREIGN KEY (schema_version_id) REFERENCES public.wiki_schema_versions(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_history
    ADD CONSTRAINT wiki_entity_history_sync_log_id_fkey FOREIGN KEY (sync_log_id) REFERENCES public.wiki_sync_logs(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_loser_entity_id_fkey FOREIGN KEY (loser_entity_id) REFERENCES public.wiki_entities(id) ON DELETE RESTRICT;


ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_merged_by_fkey FOREIGN KEY (merged_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_sync_log_id_fkey FOREIGN KEY (sync_log_id) REFERENCES public.wiki_sync_logs(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_merge_history
    ADD CONSTRAINT wiki_entity_merge_history_winner_entity_id_fkey FOREIGN KEY (winner_entity_id) REFERENCES public.wiki_entities(id) ON DELETE RESTRICT;


ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_relation_status_updated_by_fkey FOREIGN KEY (relation_status_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_relation_type_id_fkey FOREIGN KEY (relation_type_id) REFERENCES public.wiki_relation_types(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_source_entity_id_fkey FOREIGN KEY (source_entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_target_entity_id_fkey FOREIGN KEY (target_entity_id) REFERENCES public.wiki_entities(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_entity_relations
    ADD CONSTRAINT wiki_entity_relations_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_observation_entities
    ADD CONSTRAINT wiki_observation_entities_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_observation_entities
    ADD CONSTRAINT wiki_observation_entities_observation_id_fkey FOREIGN KEY (observation_id) REFERENCES public.wiki_observations(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_observations
    ADD CONSTRAINT wiki_observations_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_observations
    ADD CONSTRAINT wiki_observations_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_observations
    ADD CONSTRAINT wiki_observations_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_patch_mode
    ADD CONSTRAINT wiki_patch_mode_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_relation_types
    ADD CONSTRAINT wiki_relation_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_schema_versions
    ADD CONSTRAINT wiki_schema_versions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_entity_id_fkey FOREIGN KEY (entity_id) REFERENCES public.wiki_entities(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_input_schema_version_id_fkey FOREIGN KEY (input_schema_version_id) REFERENCES public.wiki_schema_versions(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_payload_override_actor_fkey FOREIGN KEY (payload_override_actor) REFERENCES public.profiles(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_source_post_id_fkey FOREIGN KEY (source_post_id) REFERENCES public.posts(id) ON DELETE CASCADE;


ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_target_schema_version_id_fkey FOREIGN KEY (target_schema_version_id) REFERENCES public.wiki_schema_versions(id) ON DELETE SET NULL;


ALTER TABLE ONLY public.wiki_sync_logs
    ADD CONSTRAINT wiki_sync_logs_triggered_by_fkey FOREIGN KEY (triggered_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


-- === Functions ===

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


CREATE OR REPLACE FUNCTION public.bl_normalize_search_text(p_input text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select trim(both from lower(regexp_replace(coalesce(p_input, ''), '[^a-z0-9\s-]', '', 'g')));
$$;


CREATE OR REPLACE FUNCTION public.bl_slugify_text(p_input text) RETURNS text
    LANGUAGE sql IMMUTABLE
    AS $$
  select case
    when p_input is null or btrim(p_input) = '' then 'entity'
    else trim(both '-' from regexp_replace(lower(p_input), '[^a-z0-9]+', '-', 'g'))
  end;
$$;


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


CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
begin
  insert into public.profiles (id, username, email_verified)
  values (new.id, new.raw_user_meta_data->>'username', false);
  return new;
end;
$$;


CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;


CREATE OR REPLACE FUNCTION public.is_banned_user() RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select coalesce((select is_banned from profiles where id = auth.uid()), false)
$$;


CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


CREATE OR REPLACE FUNCTION public.set_wiki_entity_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


CREATE OR REPLACE FUNCTION public.set_wiki_observation_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;


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


-- === Triggers ===

DROP TRIGGER IF EXISTS trg_generate_post_slug_excerpt ON public.posts;
CREATE TRIGGER trg_generate_post_slug_excerpt BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.generate_post_slug_excerpt();


DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at BEFORE UPDATE ON public.posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


DROP TRIGGER IF EXISTS trg_wiki_entities_updated_at ON public.wiki_entities;
CREATE TRIGGER trg_wiki_entities_updated_at BEFORE UPDATE ON public.wiki_entities FOR EACH ROW EXECUTE FUNCTION public.set_wiki_entity_updated_at();


DROP TRIGGER IF EXISTS trg_wiki_entity_claims_updated_at ON public.wiki_entity_claims;
CREATE TRIGGER trg_wiki_entity_claims_updated_at BEFORE UPDATE ON public.wiki_entity_claims FOR EACH ROW EXECUTE FUNCTION public.set_wiki_observation_updated_at();


DROP TRIGGER IF EXISTS trg_wiki_observations_updated_at ON public.wiki_observations;
CREATE TRIGGER trg_wiki_observations_updated_at BEFORE UPDATE ON public.wiki_observations FOR EACH ROW EXECUTE FUNCTION public.set_wiki_observation_updated_at();


-- === Row level security ===

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4343 (class 3256 OID 18105)
-- Name: admin_actions admin_actions_insert_admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_actions_insert_admins ON public.admin_actions FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4300 (class 3256 OID 17707)
-- Name: comments comments_delete_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY comments_delete_own_or_admin ON public.comments FOR DELETE USING (((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4341 (class 3256 OID 18087)
-- Name: notifications notifications_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY notifications_insert_authenticated ON public.notifications FOR INSERT WITH CHECK ((auth.role() = 'authenticated'::text));


ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4338 (class 3256 OID 18060)
-- Name: post_reactions post_reactions_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY post_reactions_delete_own ON public.post_reactions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4298 (class 3256 OID 17704)
-- Name: posts posts_delete_own_or_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY posts_delete_own_or_admin ON public.posts FOR DELETE USING (((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4297 (class 3256 OID 17700)
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4303 (class 3256 OID 17710)
-- Name: ratings ratings_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ratings_delete_own ON public.ratings FOR DELETE USING ((auth.uid() = user_id));


ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4331 (class 3256 OID 18002)
-- Name: reports reports_delete_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY reports_delete_admin ON public.reports FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


ALTER TABLE public.user_submission_acks ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4376 (class 3256 OID 18830)
-- Name: user_submission_acks user_submission_acks_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY user_submission_acks_insert_own ON public.user_submission_acks FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


ALTER TABLE public.wiki_category_extensions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4318 (class 3256 OID 18269)
-- Name: wiki_category_extensions wiki_category_extensions_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_category_extensions_read_authenticated ON public.wiki_category_extensions FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_discovery_evidence ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4350 (class 3256 OID 18266)
-- Name: wiki_discovery_evidence wiki_discovery_evidence_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_discovery_evidence_read_authenticated ON public.wiki_discovery_evidence FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_entities ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4344 (class 3256 OID 18257)
-- Name: wiki_entities wiki_entities_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entities_read_authenticated ON public.wiki_entities FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_entity_aliases ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4346 (class 3256 OID 18260)
-- Name: wiki_entity_aliases wiki_entity_aliases_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_aliases_read_authenticated ON public.wiki_entity_aliases FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_entity_claims ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4371 (class 3256 OID 18775)
-- Name: wiki_entity_claims wiki_entity_claims_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_claims_select_authenticated ON public.wiki_entity_claims FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_entity_history ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4320 (class 3256 OID 18510)
-- Name: wiki_entity_history wiki_entity_history_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_history_read_authenticated ON public.wiki_entity_history FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_entity_merge_history ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4359 (class 3256 OID 18513)
-- Name: wiki_entity_merge_history wiki_entity_merge_history_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_merge_history_read_authenticated ON public.wiki_entity_merge_history FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_entity_relations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4348 (class 3256 OID 18263)
-- Name: wiki_entity_relations wiki_entity_relations_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_entity_relations_read_authenticated ON public.wiki_entity_relations FOR SELECT USING ((auth.role() = 'authenticated'::text));


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


ALTER TABLE public.wiki_observations ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4369 (class 3256 OID 18773)
-- Name: wiki_observations wiki_observations_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_observations_insert_own ON public.wiki_observations FOR INSERT WITH CHECK ((author_id = auth.uid()));


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


ALTER TABLE public.wiki_relation_types ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4354 (class 3256 OID 18504)
-- Name: wiki_relation_types wiki_relation_types_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_relation_types_read_authenticated ON public.wiki_relation_types FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_schema_versions ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4352 (class 3256 OID 18501)
-- Name: wiki_schema_versions wiki_schema_versions_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_schema_versions_read_authenticated ON public.wiki_schema_versions FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_submission_statuses ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4361 (class 3256 OID 18516)
-- Name: wiki_submission_statuses wiki_submission_statuses_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_submission_statuses_read_authenticated ON public.wiki_submission_statuses FOR SELECT USING ((auth.role() = 'authenticated'::text));


ALTER TABLE public.wiki_sync_logs ENABLE ROW LEVEL SECURITY;

--
-- TOC entry 4356 (class 3256 OID 18507)
-- Name: wiki_sync_logs wiki_sync_logs_read_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY wiki_sync_logs_read_authenticated ON public.wiki_sync_logs FOR SELECT USING ((auth.role() = 'authenticated'::text));


-- === Policies ===

DROP POLICY IF EXISTS "Admins can delete any comment" ON public.comments;
CREATE POLICY "Admins can delete any comment" ON public.comments FOR DELETE USING (public.is_admin());


DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
CREATE POLICY "Admins can delete any post" ON public.posts FOR DELETE USING ((EXISTS ( SELECT 1


DROP POLICY IF EXISTS "Admins can update any post" ON public.posts;
CREATE POLICY "Admins can update any post" ON public.posts FOR UPDATE USING ((EXISTS ( SELECT 1


DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles FOR UPDATE USING (public.is_admin());


DROP POLICY IF EXISTS "Admins can view all posts" ON public.posts;
CREATE POLICY "Admins can view all posts" ON public.posts FOR SELECT USING ((EXISTS ( SELECT 1


DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());


DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);


DROP POLICY IF EXISTS "Anyone can view published posts" ON public.posts;
CREATE POLICY "Anyone can view published posts" ON public.posts FOR SELECT USING (((status = 'published'::text) AND (deleted_at IS NULL)));


DROP POLICY IF EXISTS "Anyone can view ratings" ON public.ratings;
CREATE POLICY "Anyone can view ratings" ON public.ratings FOR SELECT USING (true);


DROP POLICY IF EXISTS "Anyone can view reactions" ON public.post_reactions;
CREATE POLICY "Anyone can view reactions" ON public.post_reactions FOR SELECT USING (true);


DROP POLICY IF EXISTS "Authors can view their own pending posts" ON public.posts;
CREATE POLICY "Authors can view their own pending posts" ON public.posts FOR SELECT USING ((auth.uid() = author_id));


DROP POLICY IF EXISTS "Logged in users can insert a report" ON public.reports;
CREATE POLICY "Logged in users can insert a report" ON public.reports FOR INSERT WITH CHECK ((auth.uid() = reporter_id));


DROP POLICY IF EXISTS "Logged in users can insert their own rating" ON public.ratings;
CREATE POLICY "Logged in users can insert their own rating" ON public.ratings FOR INSERT WITH CHECK ((auth.uid() = user_id));


DROP POLICY IF EXISTS "Only admins can view reports" ON public.reports;
CREATE POLICY "Only admins can view reports" ON public.reports FOR SELECT USING ((EXISTS ( SELECT 1


DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments" ON public.comments FOR DELETE USING ((auth.uid() = author_id));


DROP POLICY IF EXISTS "Users can delete own reaction" ON public.post_reactions;
CREATE POLICY "Users can delete own reaction" ON public.post_reactions FOR DELETE USING ((auth.uid() = user_id));


DROP POLICY IF EXISTS "Users can delete their own comment" ON public.comments;
CREATE POLICY "Users can delete their own comment" ON public.comments FOR DELETE USING ((auth.uid() = author_id));


DROP POLICY IF EXISTS "Users can delete their own rating" ON public.ratings;
CREATE POLICY "Users can delete their own rating" ON public.ratings FOR DELETE USING ((auth.uid() = user_id));


DROP POLICY IF EXISTS "Users can insert own reaction" ON public.post_reactions;
CREATE POLICY "Users can insert own reaction" ON public.post_reactions FOR INSERT WITH CHECK ((auth.uid() = user_id));


DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING ((auth.uid() = author_id));


DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts" ON public.posts FOR UPDATE USING (((auth.uid() = author_id) AND (deleted_at IS NULL) AND (COALESCE(admin_locked, false) = false))) WITH CHECK (((auth.uid() = author_id) AND (deleted_at IS NULL) AND (COALESCE(admin_locked, false) = false)));


DROP POLICY IF EXISTS "Users can update own reaction" ON public.post_reactions;
CREATE POLICY "Users can update own reaction" ON public.post_reactions FOR UPDATE USING ((auth.uid() = user_id));


DROP POLICY IF EXISTS "Users can update their own rating" ON public.ratings;
CREATE POLICY "Users can update their own rating" ON public.ratings FOR UPDATE USING ((auth.uid() = user_id));


DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((auth.uid() = id));


CREATE POLICY admin_actions_select_admins ON public.admin_actions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY comments_insert_auth ON public.comments FOR INSERT WITH CHECK (((auth.uid() = author_id) AND (NOT ( SELECT profiles.is_banned
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


CREATE POLICY comments_select_all ON public.comments FOR SELECT USING (true);


CREATE POLICY notifications_select_own ON public.notifications FOR SELECT USING ((auth.uid() = user_id));


CREATE POLICY notifications_update_own ON public.notifications FOR UPDATE USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


CREATE POLICY post_reactions_insert_own ON public.post_reactions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


CREATE POLICY post_reactions_select_all ON public.post_reactions FOR SELECT TO authenticated, anon USING (true);


CREATE POLICY post_reactions_update_own ON public.post_reactions FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


CREATE POLICY posts_insert_requires_tutorial_ack ON public.posts AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (((EXISTS ( SELECT 1
   FROM public.user_submission_acks a
  WHERE (a.user_id = auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))));


CREATE POLICY posts_insert_verified ON public.posts FOR INSERT WITH CHECK (((auth.uid() = author_id) AND (status = 'pending'::text) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.email_verified = true)))) AND (NOT ( SELECT profiles.is_banned
   FROM public.profiles
  WHERE (profiles.id = auth.uid())))));


CREATE POLICY posts_select_approved ON public.posts FOR SELECT USING ((((status = 'published'::text) AND (deleted_at IS NULL)) OR (author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


CREATE POLICY posts_update_own_or_admin ON public.posts FOR UPDATE USING ((((author_id = auth.uid()) AND (deleted_at IS NULL) AND (COALESCE(admin_locked, false) = false)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))))) WITH CHECK ((((author_id = auth.uid()) AND (deleted_at IS NULL) AND (COALESCE(admin_locked, false) = false)) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


CREATE POLICY profiles_select_all ON public.profiles FOR SELECT USING (true);


CREATE POLICY profiles_update_admin ON public.profiles FOR UPDATE USING (public.is_admin());


CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = id));


CREATE POLICY ratings_insert_auth ON public.ratings FOR INSERT WITH CHECK ((auth.uid() = user_id));


CREATE POLICY ratings_select_all ON public.ratings FOR SELECT USING (true);


CREATE POLICY reports_insert_auth ON public.reports FOR INSERT WITH CHECK ((auth.uid() = reporter_id));


CREATE POLICY reports_select_admin ON public.reports FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


CREATE POLICY reports_update_admin ON public.reports FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


CREATE POLICY user_submission_acks_select_admin ON public.user_submission_acks FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


CREATE POLICY user_submission_acks_select_own ON public.user_submission_acks FOR SELECT TO authenticated USING ((auth.uid() = user_id));


CREATE POLICY wiki_category_extensions_write_admin ON public.wiki_category_extensions USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_discovery_evidence_write_admin ON public.wiki_discovery_evidence USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_entities_write_admin ON public.wiki_entities USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_entity_aliases_write_admin ON public.wiki_entity_aliases USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_entity_claims_write_admin ON public.wiki_entity_claims USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


CREATE POLICY wiki_entity_history_write_admin ON public.wiki_entity_history USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_entity_merge_history_write_admin ON public.wiki_entity_merge_history USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_entity_relations_write_admin ON public.wiki_entity_relations USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_observations_select_own_or_admin ON public.wiki_observations FOR SELECT USING (((author_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text))))));


CREATE POLICY wiki_patch_mode_select_all ON public.wiki_patch_mode FOR SELECT USING (true);


CREATE POLICY wiki_relation_types_write_admin ON public.wiki_relation_types USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_schema_versions_write_admin ON public.wiki_schema_versions USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_submission_statuses_write_admin ON public.wiki_submission_statuses USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


CREATE POLICY wiki_sync_logs_write_admin ON public.wiki_sync_logs USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::text)))));


-- === Other ===

   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


commit;
