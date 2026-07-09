# Pull Request Checklist — Content Architecture Changes

Use this checklist for every PR that touches discovery, relations, contributions, layouts, or browse pages.

## Relation & Entity Modeling

- [ ] Relation type comes from `js/relations-registry.js` (not ad-hoc string)
- [ ] Entity domain and subtype set in BLMETA where applicable
- [ ] Legacy relation types (`contains`, `observed_in`, `dropped_by`, etc.) still work if touched
- [ ] `related_to` used only as weak fallback with required note — not as default for new systems
- [ ] No new relation type added without registry entry + graph-relations-spec update

## Progressive Disclosure

- [ ] Quick-Add remains minimal (no new required fields players can't know on first sighting)
- [ ] Wizard steps are skippable
- [ ] Max 4 primary contribution buttons per page type
- [ ] Review-required intents (recipes, entity creation) never auto-publish

## Evidence & Provenance

- [ ] Evidence tier stored (`confirmed` / `observed` / `reported` / `speculative`)
- [ ] Evidence tier rendered on detail page OR explicitly deferred with issue link
- [ ] High-stakes claims (boss, mount, lore transcript) require evidence where specified
- [ ] Dynamic facts (prices, patch-dependent stats) never stored as `confirmed`

## UX & Empty States

- [ ] Empty sections hidden, not shown with "unknown" spam
- [ ] Missing-info CTAs ≤ 3 per page, only on published non-stub pages
- [ ] Stub pages use single "Help complete" banner
- [ ] New list/browse pages have empty state + CTA tested
- [ ] Unknown slug returns clean "Post not found"

## Code Quality

- [ ] Cache-bust `?v=` incremented for changed JS/HTML
- [ ] No hardcoded QA slugs in active admin/UI code
- [ ] No localhost-only assumptions in production paths
- [ ] No exposed test repair tools

## Regression

- [ ] Existing E2E flows not broken:
  - Creature discovery + approve
  - Item discovery + approve
  - Biome discovery + approve
  - Drop relation
  - Behavior contribution
  - Spawn contribution
  - Known item contribution
  - Conflict handling
  - Cancel / Reject / Restore / Duplicate
- [ ] Core URLs load without console errors:
  - `/wiki/admin/`
  - `/wiki/create-post/`
  - `/wiki/items/`, `/wiki/creatures/`, `/wiki/biomes/`, `/wiki/locations/`
- [ ] Danger zone tools still gated (preview + typed confirmation)

## Documentation

- [ ] Relevant matrix updated if behavior changed
- [ ] `current-code-gap-notes.md` updated if gap closed or new gap found
- [ ] E2E test case added/updated in `qa/e2e-content-matrix.md` if new flow

## Pre-Release Safety

- [ ] No accidental commit of `qa/e2e-baseline-bmeta.snapshot.json`
- [ ] No destructive SQL executed
- [ ] No data deletion in test environment without explicit approval
