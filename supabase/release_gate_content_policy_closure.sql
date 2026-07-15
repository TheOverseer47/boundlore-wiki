-- =============================================================================
-- P5-E.9G.8C — Direct content INSERT release-lock closure
-- =============================================================================
-- Scope: restrictive INSERT policies on comments and wiki_observations only.
-- Preconditions: release_gate_lock.sql applied (bl_can_create_user_content)
-- Postconditions: new user content INSERT blocked when contribution_locked = true
-- Idempotent: DROP POLICY IF EXISTS for owned policy names only
--
-- UPDATE/DELETE intentionally unchanged:
--   - Users may edit/delete own comments during lock (not product-activation paths)
--   - No repo evidence requiring broader lock on edits/deletes
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- comments INSERT restrictive gate
-- ---------------------------------------------------------------------------

drop policy if exists comments_release_gate_insert_restrictive on public.comments;

create policy comments_release_gate_insert_restrictive
  on public.comments
  as restrictive
  for insert
  to authenticated
  with check (
    public.bl_can_create_user_content(auth.uid())
  );

comment on policy comments_release_gate_insert_restrictive on public.comments is
  'P5-E.9G.8C blocks new comments when contribution lock is active. Additive to comments_insert_auth.';

-- ---------------------------------------------------------------------------
-- wiki_observations INSERT restrictive gate
-- ---------------------------------------------------------------------------

drop policy if exists wiki_observations_release_gate_insert_restrictive on public.wiki_observations;

create policy wiki_observations_release_gate_insert_restrictive
  on public.wiki_observations
  as restrictive
  for insert
  to authenticated
  with check (
    public.bl_can_create_user_content(auth.uid())
  );

comment on policy wiki_observations_release_gate_insert_restrictive on public.wiki_observations is
  'P5-E.9G.8C blocks direct observation INSERT when contribution lock is active. RPC path gated separately.';

commit;
