-- =============================================================================
-- BoundLore Pre-Release Test Data Reset
-- =============================================================================
-- PURPOSE: Remove development/test content before the real game launch.
-- SAFETY: This script does NOTHING unless you explicitly set the confirmation
--         token below. It is NOT run automatically by the app.
--
-- REMOVES (when confirmed):
--   - Posts marked as test data (BLMETA content_origin = "test")
--   - Related comments, votes/reactions, notifications tied to those posts
--   - Wiki observation/entity rows linked to test posts (if tables exist)
--
-- PRESERVES:
--   - Category/config tables, schemas, admin accounts, SQL migrations
--   - Posts without test marking (content_origin != "test" or missing marker)
-- =============================================================================

-- STEP 1: Set this to the exact token to arm the reset (required).
-- Default leaves the script inert.
DO $$
BEGIN
  IF current_setting('boundlore.reset_confirmed', true) IS DISTINCT FROM 'BOUNDLORE_PRE_RELEASE_RESET' THEN
    RAISE NOTICE 'Pre-release reset NOT executed. Set boundlore.reset_confirmed first.';
    RAISE NOTICE 'Example: SET boundlore.reset_confirmed = ''BOUNDLORE_PRE_RELEASE_RESET'';';
    RETURN;
  END IF;
END $$;

-- Only continue when armed (run the SET command in the same SQL session before this file).

CREATE OR REPLACE FUNCTION bl_post_content_is_test(p_content text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    p_content ~* '<!--BLMETA\s+[^>]*"content_origin"\s*:\s*"test"',
    false
  );
$$;

-- Collect test post ids
CREATE TEMP TABLE IF NOT EXISTS bl_reset_test_posts ON COMMIT DROP AS
SELECT id
FROM posts
WHERE bl_post_content_is_test(content);

-- Optional: extend selection if a dedicated column exists later
-- OR content_origin column = 'test'

DO $$
BEGIN
  IF current_setting('boundlore.reset_confirmed', true) IS DISTINCT FROM 'BOUNDLORE_PRE_RELEASE_RESET' THEN
    RETURN;
  END IF;

  RAISE NOTICE 'Starting pre-release test data reset for % posts...', (SELECT COUNT(*) FROM bl_reset_test_posts);

  -- Comments on test posts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
    DELETE FROM comments WHERE post_id IN (SELECT id FROM bl_reset_test_posts);
  END IF;

  -- Reactions / votes
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'post_reactions') THEN
    DELETE FROM post_reactions WHERE post_id IN (SELECT id FROM bl_reset_test_posts);
  END IF;

  -- Notifications referencing test posts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    DELETE FROM notifications
    WHERE metadata::text LIKE '%' || (SELECT id::text FROM bl_reset_test_posts LIMIT 1) || '%'
      AND EXISTS (SELECT 1 FROM bl_reset_test_posts LIMIT 1);
  END IF;

  -- Observation backbone (if deployed)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_observations') THEN
    DELETE FROM wiki_observation_entities
    WHERE observation_id IN (
      SELECT id FROM wiki_observations WHERE source_post_id IN (SELECT id FROM bl_reset_test_posts)
    );
    DELETE FROM wiki_observations WHERE source_post_id IN (SELECT id FROM bl_reset_test_posts);
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wiki_entity_relations') THEN
  -- Relations where both ends are test stubs can be removed; conservative: skip unless both are test posts
    DELETE FROM wiki_entity_relations r
    USING bl_reset_test_posts a, bl_reset_test_posts b
    WHERE FALSE; -- enable manually after reviewing entity backbone mapping
  END IF;

  -- Archive/delete test posts (soft delete if deleted_at exists)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'deleted_at'
  ) THEN
    UPDATE posts
    SET deleted_at = NOW(), status = 'archived'
    WHERE id IN (SELECT id FROM bl_reset_test_posts);
  ELSE
    DELETE FROM posts WHERE id IN (SELECT id FROM bl_reset_test_posts);
  END IF;

  RAISE NOTICE 'Pre-release test data reset completed.';
END $$;

-- Usage (manual, one session):
-- SET boundlore.reset_confirmed = 'BOUNDLORE_PRE_RELEASE_RESET';
-- \i supabase/pre_release_test_data_reset.sql
