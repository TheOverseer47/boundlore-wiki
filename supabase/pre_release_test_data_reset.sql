-- =============================================================================
-- BoundLore Pre-Release Test Data Reset — DESTRUCTIVE
-- =============================================================================
--
-- ⚠️  DO NOT RUN during development or QA.
-- ⚠️  Run ONLY in the launch/reset window, after explicit operator approval.
--
-- Prerequisites (all required):
--   1. Database backup / snapshot taken
--   2. Dry-run executed and reviewed:
--        supabase/pre_release_reset_dry_run.sql
--   3. Wiki Patch Mode ENABLED (admin dashboard)
--   4. Confirmation token set in the SAME SQL Editor session/batch as this file
--
-- Usage (single SQL Editor batch — SET and script must share one session):
--   SET boundlore.reset_confirmed = 'BOUNDLORE_PRE_RELEASE_RESET';
--   -- paste entire contents of this file below the SET line
--
-- Optional generalprobe (same session, before real commit):
--   BEGIN;
--   SET boundlore.reset_confirmed = 'BOUNDLORE_PRE_RELEASE_RESET';
--   -- paste this file
--   -- inspect counts / notices
--   ROLLBACK;
--
-- REMOVES (when confirmed):
--   - Posts marked as test data (BLMETA content_origin = "test")
--   - Related comments, reactions, notifications tied to those posts
--   - Wiki observation rows linked to test posts (if tables exist)
--
-- PRESERVES (never touched):
--   - RLS policies, SQL functions/RPCs, schema tables
--   - profiles, admin roles, user_submission_acks structure + rows
--   - taxonomy/config, wiki_patch_mode, site settings, source code
--
-- DELETE MODE (current):
--   Soft-delete/archive when posts.deleted_at exists:
--     sets deleted_at = now(), status = 'archived'
--   Hard DELETE only when deleted_at column is missing.
--
-- Soft-delete risk:
--   Rows remain in DB; slugs/aliases may still resolve for admins.
--   Public visitors should see "Post not found" (post-detail.js checks deleted_at).
--   Before launch, verify dry-run sample slugs are not publicly reachable.
--   Hard-delete is NOT enabled here — requires separate explicit approval later.
--
-- NOT handled automatically (manual review / separate scripts):
--   - storage.objects in bucket 'discovery-uploads' (see dry-run storage count)
--   - wiki_entity_relations / wiki_entities orphan cleanup (disabled below — review dry-run counts)
--   - user_submission_acks rows (preserved; tutorial state remains)
--
-- See: supabase/PRE_RELEASE_RESET_README.md
-- =============================================================================

DO $$
BEGIN
  IF current_setting('boundlore.reset_confirmed', true) IS DISTINCT FROM 'BOUNDLORE_PRE_RELEASE_RESET' THEN
    RAISE NOTICE 'Pre-release reset NOT executed. Set boundlore.reset_confirmed first.';
    RAISE NOTICE 'In the SAME SQL Editor batch run:';
    RAISE NOTICE '  SET boundlore.reset_confirmed = ''BOUNDLORE_PRE_RELEASE_RESET'';';
    RAISE NOTICE 'Then paste this entire file below that line.';
    RETURN;
  END IF;
END $$;

-- Test detection — must match supabase/pre_release_reset_dry_run.sql logic.
CREATE OR REPLACE FUNCTION bl_post_content_is_test(p_content text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    CASE
      WHEN (regexp_match(p_content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1] IS NOT NULL
           AND btrim((regexp_match(p_content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1]) ~ '^\{' THEN
        ((regexp_match(p_content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1]::jsonb ->> 'content_origin') = 'test'
      ELSE NULL
    END,
    COALESCE(p_content ~* '<!--BLMETA\s+[\s\S]*?"content_origin"\s*:\s*"test"', false)
  );
$$;

CREATE TEMP TABLE IF NOT EXISTS bl_reset_test_posts ON COMMIT DROP AS
SELECT id, slug
FROM posts
WHERE bl_post_content_is_test(content);

DO $$
BEGIN
  IF current_setting('boundlore.reset_confirmed', true) IS DISTINCT FROM 'BOUNDLORE_PRE_RELEASE_RESET' THEN
    RETURN;
  END IF;

  RAISE NOTICE 'Starting pre-release test data reset for % test posts...',
    (SELECT COUNT(*) FROM bl_reset_test_posts);

  -- Comments on test posts
  IF to_regclass('public.comments') IS NOT NULL THEN
    DELETE FROM public.comments
    WHERE post_id IN (SELECT id FROM bl_reset_test_posts);
    RAISE NOTICE 'Deleted comments on test posts.';
  END IF;

  -- Reactions / votes
  IF to_regclass('public.post_reactions') IS NOT NULL THEN
    DELETE FROM public.post_reactions
    WHERE post_id IN (SELECT id FROM bl_reset_test_posts);
    RAISE NOTICE 'Deleted post_reactions on test posts.';
  END IF;

  -- Notifications referencing test posts (target_url contains slug or post id)
  IF to_regclass('public.notifications') IS NOT NULL THEN
    DELETE FROM public.notifications n
    WHERE EXISTS (
      SELECT 1
      FROM bl_reset_test_posts tp
      WHERE n.target_url IS NOT NULL
        AND (
          n.target_url LIKE '%' || tp.slug || '%'
          OR n.target_url LIKE '%' || tp.id::text || '%'
        )
    );
    RAISE NOTICE 'Deleted notifications targeting test posts.';
  END IF;

  -- Observation backbone (if deployed)
  IF to_regclass('public.wiki_observations') IS NOT NULL THEN
    IF to_regclass('public.wiki_observation_entities') IS NOT NULL THEN
      DELETE FROM public.wiki_observation_entities
      WHERE observation_id IN (
        SELECT o.id FROM public.wiki_observations o
        WHERE o.source_post_id IN (SELECT id FROM bl_reset_test_posts)
      );
    END IF;
    DELETE FROM public.wiki_observations
    WHERE source_post_id IN (SELECT id FROM bl_reset_test_posts);
    RAISE NOTICE 'Deleted wiki_observations for test posts.';
  END IF;

  -- wiki_entity_relations / wiki_entities:
  -- DISABLED until launch-window review. Dry-run reports counts for:
  --   wiki_entity_relations_via_test_source_post
  --   wiki_entity_relations_via_test_entities
  --   wiki_entities_from_test_posts
  -- After reviewing dry-run output, enable a targeted delete here if needed.
  -- Do NOT delete blindly — relations may reference mixed live/test entities.
  IF to_regclass('public.wiki_entity_relations') IS NOT NULL THEN
    RAISE NOTICE 'wiki_entity_relations cleanup skipped (manual review required). See dry-run counts.';
  END IF;

  -- Archive test posts (soft delete when deleted_at column exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'deleted_at'
  ) THEN
    UPDATE public.posts
    SET deleted_at = COALESCE(deleted_at, NOW()),
        status = 'archived'
    WHERE id IN (SELECT id FROM bl_reset_test_posts)
      AND deleted_at IS NULL;
    RAISE NOTICE 'Archived % test posts (soft-delete).',
      (SELECT COUNT(*) FROM bl_reset_test_posts tp JOIN posts p ON p.id = tp.id WHERE p.deleted_at IS NOT NULL);
  ELSE
    DELETE FROM public.posts WHERE id IN (SELECT id FROM bl_reset_test_posts);
    RAISE NOTICE 'Hard-deleted test posts (no deleted_at column).';
  END IF;

  RAISE NOTICE 'Pre-release test data reset completed.';
  RAISE NOTICE 'Next: run post-reset acceptance checks (see PRE_RELEASE_RESET_README.md).';
END $$;
