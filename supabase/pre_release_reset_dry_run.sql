-- =============================================================================
-- BoundLore Pre-Release Reset — DRY RUN (read-only)
-- =============================================================================
-- Safe to run anytime in Supabase SQL Editor.
-- No DELETE/UPDATE/INSERT/TRUNCATE/ALTER/DROP.
-- No confirmation token required.
--
-- Uses the same test-data detection as pre_release_test_data_reset.sql:
--   BLMETA content_origin = "test"
--
-- Run this before any destructive reset. Review all result tabs.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Shared test-post detection (inline — must match reset script logic)
-- -----------------------------------------------------------------------------
WITH blmeta_extract AS (
  SELECT
    p.id,
    p.slug,
    p.title,
    p.category,
    p.status,
    p.post_type,
    p.deleted_at,
    p.created_at,
    p.content,
    (regexp_match(p.content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1] AS blmeta_raw
  FROM public.posts p
),
test_posts AS (
  SELECT e.*
  FROM blmeta_extract e
  WHERE COALESCE(
    CASE
      WHEN e.blmeta_raw IS NOT NULL AND btrim(e.blmeta_raw) ~ '^\{' THEN
        (e.blmeta_raw::jsonb ->> 'content_origin') = 'test'
      ELSE NULL
    END,
    e.content ~* '<!--BLMETA\s+[\s\S]*?"content_origin"\s*:\s*"test"'
  )
),
non_test_posts AS (
  SELECT p.*
  FROM public.posts p
  WHERE p.id NOT IN (SELECT id FROM test_posts)
),
contribution_posts AS (
  SELECT p.*
  FROM public.posts p
  WHERE p.slug ILIKE 'contribution-%'
     OR p.title ILIKE 'Contribution:%'
     OR COALESCE(
       CASE
         WHEN (regexp_match(p.content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1] IS NOT NULL
              AND btrim((regexp_match(p.content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1]) ~ '^\{' THEN
           (regexp_match(p.content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1]::jsonb ->> 'discovery_record_status'
         ELSE NULL
       END,
       ''
     ) = 'contribution'
)

-- -----------------------------------------------------------------------------
-- 1) Summary metrics
-- -----------------------------------------------------------------------------
SELECT * FROM (
  SELECT 1 AS sort_order, 'test_posts_total' AS metric, COUNT(*)::text AS value FROM test_posts
  UNION ALL SELECT 2, 'test_posts_active (deleted_at IS NULL)', COUNT(*)::text FROM test_posts WHERE deleted_at IS NULL
  UNION ALL SELECT 3, 'test_posts_archived (deleted_at IS NOT NULL)', COUNT(*)::text FROM test_posts WHERE deleted_at IS NOT NULL
  UNION ALL SELECT 4, 'non_test_posts_total', COUNT(*)::text FROM non_test_posts
  UNION ALL SELECT 5, 'contribution_posts_total', COUNT(*)::text FROM contribution_posts
  UNION ALL SELECT 6, 'contribution_active', COUNT(*)::text FROM contribution_posts WHERE deleted_at IS NULL
  UNION ALL SELECT 7, 'contribution_archived', COUNT(*)::text FROM contribution_posts WHERE deleted_at IS NOT NULL
  UNION ALL SELECT 8, 'profiles_total', COUNT(*)::text FROM public.profiles
  UNION ALL SELECT 9, 'admin_profiles', COUNT(*)::text FROM public.profiles WHERE role = 'admin'
  UNION ALL SELECT 10, 'user_submission_acks', (
    SELECT COUNT(*)::text FROM public.user_submission_acks
    WHERE to_regclass('public.user_submission_acks') IS NOT NULL
  )
  UNION ALL SELECT 11, 'wiki_patch_mode_rows', (
    SELECT COUNT(*)::text FROM public.wiki_patch_mode
    WHERE to_regclass('public.wiki_patch_mode') IS NOT NULL
  )
) summary
ORDER BY sort_order;

-- -----------------------------------------------------------------------------
-- 2) Test posts by category
-- -----------------------------------------------------------------------------
WITH blmeta_extract AS (
  SELECT p.id, p.slug, p.title, p.category, p.status, p.post_type, p.deleted_at, p.content,
    (regexp_match(p.content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1] AS blmeta_raw
  FROM public.posts p
),
test_posts AS (
  SELECT e.* FROM blmeta_extract e
  WHERE COALESCE(
    CASE WHEN e.blmeta_raw IS NOT NULL AND btrim(e.blmeta_raw) ~ '^\{' THEN
      (e.blmeta_raw::jsonb ->> 'content_origin') = 'test' ELSE NULL END,
    e.content ~* '<!--BLMETA\s+[\s\S]*?"content_origin"\s*:\s*"test"'
  )
)
SELECT category, COUNT(*) AS count,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS archived
FROM test_posts
GROUP BY category
ORDER BY count DESC, category;

-- -----------------------------------------------------------------------------
-- 3) Test posts by status / post_type
-- -----------------------------------------------------------------------------
WITH blmeta_extract AS (
  SELECT p.id, p.slug, p.title, p.category, p.status, p.post_type, p.deleted_at, p.content,
    (regexp_match(p.content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1] AS blmeta_raw
  FROM public.posts p
),
test_posts AS (
  SELECT e.* FROM blmeta_extract e
  WHERE COALESCE(
    CASE WHEN e.blmeta_raw IS NOT NULL AND btrim(e.blmeta_raw) ~ '^\{' THEN
      (e.blmeta_raw::jsonb ->> 'content_origin') = 'test' ELSE NULL END,
    e.content ~* '<!--BLMETA\s+[\s\S]*?"content_origin"\s*:\s*"test"'
  )
)
SELECT status, post_type,
  COUNT(*) AS count,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) AS active,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) AS archived
FROM test_posts
GROUP BY status, post_type
ORDER BY count DESC;

-- -----------------------------------------------------------------------------
-- 4) Sample test post slugs (first 50)
-- -----------------------------------------------------------------------------
WITH blmeta_extract AS (
  SELECT p.id, p.slug, p.title, p.category, p.status, p.deleted_at, p.created_at, p.content,
    (regexp_match(p.content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1] AS blmeta_raw
  FROM public.posts p
),
test_posts AS (
  SELECT e.* FROM blmeta_extract e
  WHERE COALESCE(
    CASE WHEN e.blmeta_raw IS NOT NULL AND btrim(e.blmeta_raw) ~ '^\{' THEN
      (e.blmeta_raw::jsonb ->> 'content_origin') = 'test' ELSE NULL END,
    e.content ~* '<!--BLMETA\s+[\s\S]*?"content_origin"\s*:\s*"test"'
  )
)
SELECT slug, title, category, status,
  CASE WHEN deleted_at IS NULL THEN 'active' ELSE 'archived' END AS archive_state
FROM test_posts
ORDER BY created_at DESC NULLS LAST, slug
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 5) Non-test posts that would remain (count + samples)
-- -----------------------------------------------------------------------------
WITH blmeta_extract AS (
  SELECT p.id, p.slug, p.title, p.category, p.status, p.deleted_at, p.content,
    (regexp_match(p.content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1] AS blmeta_raw
  FROM public.posts p
),
test_posts AS (
  SELECT e.id FROM blmeta_extract e
  WHERE COALESCE(
    CASE WHEN e.blmeta_raw IS NOT NULL AND btrim(e.blmeta_raw) ~ '^\{' THEN
      (e.blmeta_raw::jsonb ->> 'content_origin') = 'test' ELSE NULL END,
    e.content ~* '<!--BLMETA\s+[\s\S]*?"content_origin"\s*:\s*"test"'
  )
)
SELECT slug, title, category, status,
  CASE WHEN deleted_at IS NULL THEN 'active' ELSE 'archived' END AS archive_state
FROM public.posts p
WHERE p.id NOT IN (SELECT id FROM test_posts)
ORDER BY p.created_at DESC NULLS LAST
LIMIT 50;

-- -----------------------------------------------------------------------------
-- 6) Related rows tied to test posts
-- -----------------------------------------------------------------------------
WITH blmeta_extract AS (
  SELECT p.id, p.slug, p.content,
    (regexp_match(p.content, '<!--BLMETA\s+([\s\S]*?)\s*-->', 'i'))[1] AS blmeta_raw
  FROM public.posts p
),
test_posts AS (
  SELECT e.id, e.slug FROM blmeta_extract e
  WHERE COALESCE(
    CASE WHEN e.blmeta_raw IS NOT NULL AND btrim(e.blmeta_raw) ~ '^\{' THEN
      (e.blmeta_raw::jsonb ->> 'content_origin') = 'test' ELSE NULL END,
    e.content ~* '<!--BLMETA\s+[\s\S]*?"content_origin"\s*:\s*"test"'
  )
)
SELECT * FROM (
  SELECT 1 AS ord, 'comments_on_test_posts' AS metric,
    (SELECT COUNT(*)::text FROM public.comments c
     WHERE to_regclass('public.comments') IS NOT NULL
       AND c.post_id IN (SELECT id FROM test_posts))
  UNION ALL SELECT 2, 'post_reactions_on_test_posts',
    (SELECT COUNT(*)::text FROM public.post_reactions r
     WHERE to_regclass('public.post_reactions') IS NOT NULL
       AND r.post_id IN (SELECT id FROM test_posts))
  UNION ALL SELECT 3, 'notifications_targeting_test_posts',
    (SELECT COUNT(*)::text FROM public.notifications n
     WHERE to_regclass('public.notifications') IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM test_posts tp
         WHERE (n.target_url IS NOT NULL AND (
           n.target_url LIKE '%' || tp.slug || '%'
           OR n.target_url LIKE '%' || tp.id::text || '%'
         ))
       ))
  UNION ALL SELECT 4, 'wiki_observations_on_test_posts',
    (SELECT COUNT(*)::text FROM public.wiki_observations o
     WHERE to_regclass('public.wiki_observations') IS NOT NULL
       AND o.source_post_id IN (SELECT id FROM test_posts))
  UNION ALL SELECT 5, 'wiki_observation_entities_on_test_posts',
    (SELECT COUNT(*)::text FROM public.wiki_observation_entities oe
     WHERE to_regclass('public.wiki_observation_entities') IS NOT NULL
       AND oe.observation_id IN (
         SELECT o.id FROM public.wiki_observations o
         WHERE o.source_post_id IN (SELECT id FROM test_posts)
       ))
  UNION ALL SELECT 6, 'wiki_entities_from_test_posts',
    (SELECT COUNT(*)::text FROM public.wiki_entities e
     WHERE to_regclass('public.wiki_entities') IS NOT NULL
       AND e.source_post_id IN (SELECT id FROM test_posts))
  UNION ALL SELECT 7, 'wiki_entity_aliases_from_test_posts',
    (SELECT COUNT(*)::text FROM public.wiki_entity_aliases a
     WHERE to_regclass('public.wiki_entity_aliases') IS NOT NULL
       AND a.source_post_id IN (SELECT id FROM test_posts))
  UNION ALL SELECT 8, 'wiki_discovery_evidence_on_test_posts',
    (SELECT COUNT(*)::text FROM public.wiki_discovery_evidence ev
     WHERE to_regclass('public.wiki_discovery_evidence') IS NOT NULL
       AND ev.source_post_id IN (SELECT id FROM test_posts))
  UNION ALL SELECT 9, 'wiki_entity_relations_via_test_source_post',
    (SELECT COUNT(*)::text FROM public.wiki_entity_relations r
     WHERE to_regclass('public.wiki_entity_relations') IS NOT NULL
       AND r.source_post_id IN (SELECT id FROM test_posts))
  UNION ALL SELECT 10, 'wiki_entity_relations_via_test_entities',
    (SELECT COUNT(*)::text FROM public.wiki_entity_relations r
     WHERE to_regclass('public.wiki_entity_relations') IS NOT NULL
       AND (
         r.source_entity_id IN (
           SELECT e.id FROM public.wiki_entities e
           WHERE e.source_post_id IN (SELECT id FROM test_posts)
         )
         OR r.target_entity_id IN (
           SELECT e.id FROM public.wiki_entities e
           WHERE e.source_post_id IN (SELECT id FROM test_posts)
         )
       ))
) related
ORDER BY ord;

-- -----------------------------------------------------------------------------
-- 7) Contribution breakdown
-- -----------------------------------------------------------------------------
SELECT
  CASE WHEN deleted_at IS NULL THEN 'active' ELSE 'archived' END AS archive_state,
  status,
  COUNT(*) AS count
FROM public.posts p
WHERE p.slug ILIKE 'contribution-%'
   OR p.title ILIKE 'Contribution:%'
GROUP BY 1, 2
ORDER BY count DESC;

-- -----------------------------------------------------------------------------
-- 8) Storage (discovery-uploads bucket)
-- -----------------------------------------------------------------------------
-- If counts are non-zero, review objects manually before launch reset.
-- Paths are typically <user_id>/<filename> — post linkage is not always explicit.
SELECT
  CASE WHEN to_regclass('storage.objects') IS NULL THEN 'storage.objects not accessible'
       ELSE 'discovery-uploads objects' END AS note,
  CASE WHEN to_regclass('storage.objects') IS NULL THEN NULL
       ELSE (SELECT COUNT(*) FROM storage.objects WHERE bucket_id = 'discovery-uploads') END AS object_count;
