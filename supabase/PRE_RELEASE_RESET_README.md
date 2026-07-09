# Pre-Release Test Data Reset — Operator Guide

This document describes the **launch-window** procedure for removing development/test wiki content. It does **not** authorize running the destructive reset during normal development or QA.

## Never skip

1. **Backup** — Take a Supabase snapshot or full DB backup before any destructive step.
2. **Patch Mode** — Enable via Admin Dashboard → Patch Mode before the reset window.
3. **Dry-run first** — Run `supabase/pre_release_reset_dry_run.sql` in the SQL Editor. Review every result tab:
   - Test post counts and sample slugs (manual sight-check)
   - Non-test posts that would remain
   - Related rows (comments, reactions, notifications, observations, entities, relations)
   - Contribution posts
   - Preserved structure (profiles, acks, patch mode)
   - Storage object count (`discovery-uploads` bucket)
4. **Explicit operator approval** — Real reset only after a human reviews dry-run output and says go.

## Dry-run (safe anytime)

File: `supabase/pre_release_reset_dry_run.sql`

- 100% read-only — no `DELETE`, `UPDATE`, `INSERT`, `TRUNCATE`, `ALTER`, or `DROP`
- No confirmation token required
- Uses BLMETA `content_origin: "test"` detection (same logic as reset script)

## Optional generalprobe (destructive, rolled back)

In a single SQL Editor session:

```sql
BEGIN;
SET boundlore.reset_confirmed = 'BOUNDLORE_PRE_RELEASE_RESET';
-- paste entire contents of supabase/pre_release_test_data_reset.sql
-- inspect NOTICE output and run spot-check SELECTs
ROLLBACK;
```

## Real reset (launch window only)

File: `supabase/pre_release_test_data_reset.sql`

**Same SQL Editor batch** (session variable does not persist across separate runs):

```sql
SET boundlore.reset_confirmed = 'BOUNDLORE_PRE_RELEASE_RESET';
-- paste entire contents of supabase/pre_release_test_data_reset.sql
```

### What the reset does

| Action | Detail |
|--------|--------|
| Removes test posts | BLMETA `content_origin: "test"` |
| Soft-delete mode | Sets `deleted_at` + `status = 'archived'` when column exists |
| Cleans related rows | comments, post_reactions, notifications (by target_url), wiki_observations |
| Preserves | profiles, admin roles, user_submission_acks, RLS, schema, patch mode config |

### Not automatic (manual follow-up)

- **Storage** — `discovery-uploads` objects are counted in dry-run but **not** deleted by reset. Review and clean separately if needed.
- **wiki_entity_relations / wiki_entities** — Dry-run reports counts; reset **skips** relation/entity cleanup until launch-window review. Enable targeted deletes only after verifying dry-run output.
- **Hard-delete** — Not enabled. Soft-deleted slugs remain in DB; public visitors should see "Post not found". Verify sample QA slugs are unreachable before launch.

## Post-reset acceptance check

- [ ] Items list empty (or only intentional seed content)
- [ ] Creatures list empty
- [ ] Biomes list empty or intentionally seeded
- [ ] Locations list empty
- [ ] QA slugs not publicly reachable (e.g. `qa-staff-of-fire-*`, `qa-ogre-mage-*`, `swamplands-*`)
- [ ] No active contribution posts (`contribution-*` slugs)
- [ ] No orphaned wiki_entity_relations pointing at removed test entities (re-run dry-run or spot queries)
- [ ] Admin login works
- [ ] Create / Discovery submit works
- [ ] RLS + tutorial ack gate works for new posts
- [ ] Patch Mode can be enabled/disabled
- [ ] Unknown slug shows "Post not found"

## Fresh-start smoke test (after reset)

Create minimal live content, then remove before launch:

| Step | Content |
|------|---------|
| Creature | Smoke Test Wisp |
| Biome | Testing Grounds |
| Drop | Smoke Test Orb |
| Flow | Discovery Submit → Admin Approve |
| Flow | Contribution Add Behavior → Approve & Merge |
| Verify | Entity, biome, item, relations — no duplicates |

Remove smoke data before production launch.

## Deployment readiness checklist

- [ ] `git status` clean (no accidental untracked QA snapshots)
- [ ] `qa/e2e-baseline-bmeta.snapshot.json` not committed unless intentional
- [ ] Supabase Advisor clean
- [ ] Patch Mode default **inactive** in production
- [ ] No localhost-only assumptions in production paths
- [ ] No hardcoded QA slugs in active admin UI code
- [ ] Cache bust `?v=` params updated for changed JS/HTML
- [ ] No exposed test repairs (Swamp repair removed from admin)
- [ ] Danger Zone contains only production-relevant tools (BLMETA repair, contribution duplicate repair)
- [ ] No Glass-only workarounds required for normal browsing

## Related files

| File | Purpose |
|------|---------|
| `supabase/pre_release_reset_dry_run.sql` | Read-only counts and samples |
| `supabase/pre_release_test_data_reset.sql` | Destructive reset (guarded) |
| `supabase/repair_swamp_test_data.sql` | **PRE-RELEASE / TEST-ONLY** — not exposed in admin UI |
| `js/test-data.js` | Sets `content_origin: "test"` on localhost only |
