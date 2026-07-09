# Discovery Form Wireframes

Annotated Markdown wireframes for P0/P1 flows. Not visual mockups — field-level specifications for implementation.

---

## 1. Resource Quick-Add

**Flow:** Discovery → Quick-Add (Stage 0) → optional 3-step wizard → submit for review.

```
┌─────────────────────────────────────────────────────────┐
│  Report a Resource                              [×]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Resource name *                                        │
│  ┌─────────────────────────────────────────────────┐   │
│  │ e.g. Ember Shard                                 │   │
│  └─────────────────────────────────────────────────┘   │
│  ⚠ Duplicate check runs on blur against alias pool     │
│                                                         │
│  How do you obtain it? *                                │
│  ( ) Mining / gathering                                 │
│  ( ) Creature drop                                      │
│  ( ) Plant / harvest                                    │
│  ( ) Found in world                                     │
│  ( ) Other                                              │
│                                                         │
│  Where? (optional but encouraged)                       │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Search biomes / regions…  [Swamp ▾]             │   │
│  └─────────────────────────────────────────────────┘   │
│  ( ) Unknown location                                   │
│                                                         │
│  Screenshot (optional)                                  │
│  [ Upload image ]                                       │
│                                                         │
│  Quick note (optional, 1 line)                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │ e.g. Found while mining volcanic rocks         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ── Duplicate suggestion (conditional) ──               │
│  │ Did you mean "Ember Shard" (existing)?          │   │
│  │ [ Link to existing ]  [ Continue as new ]      │   │
│  ────────────────────────────────────────────────         │
│                                                         │
│              [ Cancel ]    [ Submit Discovery ]         │
└─────────────────────────────────────────────────────────┘
```

### Wizard (optional, skippable — "Add more details?")

| Step | Fields |
|------|--------|
| 1 | Harvest tool required (text, optional) |
| 2 | Rarity (dropdown: unknown default) |
| 3 | Processing chain note (free text, optional) |

### Behavior notes

- Sets `entity_domain: OBJECT`, `entity_subtype: resource`
- Sets `evidence_tier: reported` (or `observed` if screenshot attached)
- Auto-creates biome stub via `harvested_from` if location given
- Synonym warning uses normalized name comparison + alias pool
- Never blocks submit on duplicate warning — user chooses

---

## 2. Add Recipe Intent (on Item Page)

**Flow:** Item detail → Contribution → "Add Recipe" → preview → submit → review queue.

```
┌─────────────────────────────────────────────────────────┐
│  Add Recipe to: QA Staff of Fire                [×]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ℹ Recipes are reviewed before publishing.              │
│  ℹ Existing recipes are never overwritten.              │
│                                                         │
│  Crafting station *                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Search stations…  [Forge ▾]  [+ Create stub]    │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Ingredients *                                          │
│  ┌──────────────────┬──────────┬──────────────────┐  │
│  │ Item             │ Quantity │                  │  │
│  ├──────────────────┼──────────┼──────────────────┤  │
│  │ Ember Shard  [▾] │    3     │  [×]             │  │
│  │ Wood         [▾] │    1     │  [×]             │  │
│  └──────────────────┴──────────┴──────────────────┘  │
│  [ + Add ingredient row ]                               │
│  Item picker supports stub creation for unknown items   │
│                                                         │
│  Unlock condition (optional)                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │ e.g. Requires Smithing level 5                  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Screenshot (recommended)                               │
│  [ Upload image ]                                       │
│                                                         │
│  How did you verify? (optional)                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ Crafted successfully in-game on 2026-07-09     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ── Preview ──                                          │
│  Staff of Fire requires:                                │
│    • 3× Ember Shard                                     │
│    • 1× Wood                                            │
│    at Forge                                             │
│  ────────────────────────────────────────────────       │
│                                                         │
│              [ Cancel ]    [ Submit for Review ]        │
└─────────────────────────────────────────────────────────┘
```

### Behavior notes

- Creates `crafted_from` relations (one per ingredient row) + `crafted_at` relation
- Auto-derives `ingredient_of` inverse on ingredient pages after approval
- **Always review** — `merge_behavior: review_required`
- Conflicting recipe coexists as separate `reported` facts
- No standalone recipe post created
- Preview mandatory before submit (reuse existing contribution preview pattern)

---

## 3. Boss Wizard Branch (Creature Discovery)

**Flow:** Creature discovery → subtype question → boss branch activates additional fields.

```
┌─────────────────────────────────────────────────────────┐
│  Report a Creature — Step 2 of 3                [×]     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Creature type *                                        │
│  ( ) Normal creature                                    │
│  (●) Boss                                               │
│  ( ) Elite / mini-boss                                  │
│  ( ) Mount / rideable (→ separate branch, P1)           │
│                                                         │
│  ── Boss fields (shown when Boss selected) ──           │
│                                                         │
│  Arena / location *                                     │
│  ┌─────────────────────────────────────────────────┐   │
│  │ e.g. Sunken Temple  [+ Create stub]             │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Guaranteed drops (optional, item picker)               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ [+ Add guaranteed drop]                         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Screenshot * (required for boss claims)                │
│  [ Upload image ]                                       │
│  ⚠ Boss reports require screenshot evidence             │
│                                                         │
│  Phases / mechanics (optional, free text)               │
│  ┌─────────────────────────────────────────────────┐   │
│  │ e.g. Enrages at 50% HP, summons adds           │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  Tactics (optional — can add later via contribution)    │
│  ┌─────────────────────────────────────────────────┐   │
│  │                                                 │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│         [ ← Back ]    [ Skip ]    [ Next → ]            │
└─────────────────────────────────────────────────────────┘
```

### Behavior notes

- Sets `entity_subtype: boss` (not separate category)
- Sets `evidence_tier: observed` minimum if screenshot provided
- Blocks submit without screenshot when boss/elite selected
- Auto-creates location stub via `located_in` relation
- Guaranteed drops create `drops` relations with `rate: guaranteed` property
- Tactics deferred to contribution intent (keeps wizard short)
- Definition text shown: "Boss = unique named enemy with arena, not just a large monster"
