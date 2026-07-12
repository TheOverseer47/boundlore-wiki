# Versioning Model

**Version 2.0 — binding architecture**

BoundLore must preserve knowledge across game patches without overwriting history. Modeled after Wikidata statement ranks (preferred / normal / deprecated) and Minecraft Wiki history sections.

**Related:** [graph-relations-spec.md](./graph-relations-spec.md) · [CONTENT_ARCHITECTURE.md](./CONTENT_ARCHITECTURE.md)

---

## Principles

1. **Current value and historical value coexist** — never silent overwrite
2. **Identity is stable** — renames become aliases; merges rewrite backlinks
3. **Pre-release:** `game_version` is nullable everywhere until Light No Fire ships
4. **Display:** Fließtext and primary widgets show **current** value; Version History widget shows chronology (P2 UI)

---

## Versioned Data Types

| Data | Versioned? | Notes |
|------|------------|-------|
| Facts (rarity, stats, prices) | Yes | Statement with validity interval |
| Relations (drops, spawns, vendors) | Yes | Same relation type, different qualifiers per version |
| Recipes | Yes | Embedded recipe blocks are versioned statements |
| Vendor inventories | Yes | Snapshot per version |
| Loot tables | Yes | |
| Spawn conditions | Yes | |
| Stats / skills | Yes | |
| Quests / events | Yes | |
| Entity identity / aliases | No (identity log separate) | |
| Lore prose | Post revision history sufficient | |

---

## Statement Shape (proposed)

Each versioned fact or relation may carry:

```json
{
  "value": { "...": "..." },
  "game_version": null,
  "valid_from": null,
  "valid_until": null,
  "superseded_by": null,
  "rank": "preferred",
  "evidence_tier": "reported",
  "source_post_id": "..."
}
```

| Field | Meaning |
|-------|---------|
| `game_version` | Introduced/changed/removed in patch X (nullable pre-release) |
| `valid_from` | Start of validity (ISO date or version string) |
| `valid_until` | End of validity; null = still current |
| `superseded_by` | Pointer to replacement statement ID |
| `rank` | `preferred` (default display), `normal` (coexisting), `deprecated` (wrong/outdated) |

---

## Relation Qualifiers (version-related)

See [graph-relations-spec.md](./graph-relations-spec.md) for full qualifier list. Version-specific:

- `game_version`
- `valid_from`
- `valid_until`

---

## Change Types

| Event | Behavior |
|-------|----------|
| **Introduced in version** | New statement with `valid_from` = version |
| **Changed in version** | Old statement → `valid_until` + rank `deprecated`; new statement `preferred` |
| **Removed in version** | Statement → `valid_until` + rank `deprecated`; UI shows "Removed in X" |
| **Uncertain patch boundary** | Both statements `normal` rank with evidence notes until resolved |
| **Renamed entity** | Alias on entity; no statement version needed |
| **Merged entities** | Backlink reconciliation; loser → `merged_alias` |
| **Split entity** | New entities; old relations archived with `deprecated` rank |

---

## Recipe Versioning Example

QA Staff of Fire recipe changes Ember Shard ×3 → ×4 in patch `1.2.0`:

1. Existing recipe statement: `valid_until: 1.2.0`, rank `deprecated`
2. New recipe statement: `valid_from: 1.2.0`, rank `preferred`
3. Detail page Crafting Recipe widget shows ×4 (current)
4. Version History widget (P2) shows both with patch labels

**P0 today:** Single recipe block — acceptable pre-release. Schema fields added P0.5; merge behavior P2.

---

## Regional / Platform Differences (reserved)

Qualifier fields (P2):

- `platform` — PC, console, etc.
- `region` — geographic server region if applicable
- `world_seed` — only if game architecture requires per-seed facts

Do not populate pre-release.

---

## Display Rules

| Surface | Shows |
|---------|-------|
| Primary widget (Recipe, Drops, etc.) | `preferred` rank, current validity only |
| Evidence section | All ranks with badges |
| Version History widget (P2) | Chronological deprecated + preferred |
| Search ranking | Current preferred > normal > deprecated (deprecated hidden unless toggle) |

---

## Contribution Path (P1)

Intent: **Add Version Change**

- User reports "changed since patch X"
- Creates new statement; marks prior superseded pending review
- Moderator confirms patch boundary

---

## P0.5 Scope

- **P0.5-F (done):** `js/versioning-model.js` helpers; nullable `game_version`, `valid_from`, `valid_until`, `superseded_by` tolerated on facts, relations, recipes, facets; sanitize/merge preserve version metadata when present; optional badges only when data exists
- **P2-D.1 (done):** Version history & live-service validity baseline — `readVersionSignals`, validity/outdated gates, history summary; UI only when real version fields present; no data backfill, no Patch Mode workflow
- **P2-D.2 (done):** Acceptance sweep — P2-D foundation block accepted locally; no version data created; no Unknown-Version badges on QA entries
- Add nullable version fields to BLMETA schema documentation and example JSON (docs)
- No merge-engine rank/deprecation behavior change yet
- No Version History widget unless real version data exists

**P2:** Full UX, historical search toggle, patch diff views.

---

## Acceptance References

`qa/e2e-content-matrix.md`: T-VERSION-01, T-CRAFT-03.
