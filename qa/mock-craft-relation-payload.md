# Mock CRAFT Relation Payload (P0-B)

Read-only reference for future `intent=add_recipe` merge testing.  
**Do not submit to DB.** Use in console/admin dry-run only.

Target: **QA Staff of Fire** (`qa-staff-of-fire-2b742628`)

---

## Example contribution payload

```json
{
  "contribution_intent": "add_recipe",
  "discovery_payload": {
    "recipe": {
      "ingredients": [
        {
          "name": "Ember Shard",
          "quantity": 3,
          "unit": "piece",
          "target_entity_key": "items:ember-shard"
        },
        {
          "name": "Wood",
          "quantity": 1,
          "unit": "piece"
        }
      ],
      "station": "Forge",
      "output_quantity": 1,
      "unlock_condition": "Unknown",
      "evidence_tier": "reported",
      "confidence": "single_observation"
    }
  },
  "discovery_relations": [
    {
      "relation_type": "crafted_from",
      "group": "items",
      "title": "Ember Shard",
      "quantity": 3,
      "unit": "piece",
      "confidence": 72,
      "evidence_tier": "reported"
    },
    {
      "relation_type": "crafted_from",
      "group": "items",
      "title": "Wood",
      "quantity": 1,
      "unit": "piece",
      "confidence": 72,
      "evidence_tier": "reported"
    },
    {
      "relation_type": "crafted_at",
      "group": "crafting",
      "title": "Forge",
      "confidence": 72,
      "evidence_tier": "reported",
      "output_quantity": 1,
      "unlock_condition": "Unknown"
    }
  ]
}
```

---

## Expected derived relations (from `recipe` block)

When `discovery_relations` is omitted, `getContributionInfo()` / `resolveContributionRelations()` should derive the same three relations via `buildCraftRelationsFromRecipe()`.

| Relation | Target | Properties |
|----------|--------|------------|
| `crafted_from` | Ember Shard | quantity 3, unit piece |
| `crafted_from` | Wood | quantity 1, unit piece |
| `crafted_at` | Forge | output_quantity 1, unlock_condition Unknown |

`ingredient_of` is **not** auto-persisted on ingredient pages in P0-B (inverse/derived only).

---

## Expected merge / preview behavior

| Scenario | Preview | Merge result |
|----------|---------|--------------|
| New ingredient (Ember Shard ×3) | `relationsNew`: "Crafted from Ember Shard x3 piece" | ADD relation row |
| Same ingredient + same quantity | `relationsConfirm` | `report_count++`, source appended |
| Same ingredient, different quantity (e.g. ×5) | `relationsConflict` | `contribution_conflicts` entry, `needs_review` — **no silent overwrite** |
| Same station (Forge) twice | `relationsConfirm` | CONFIRM, no duplicate station row |
| Different station (Forge vs Anvil) | `willConflict` field `recipe_station` | Conflict logged, existing station kept |
| Different ingredient list | `willConflict` field `recipe_ingredients` | Conflict logged |

---

## Console checks (after page load with registry)

```javascript
const R = window.BoundLoreRelationsRegistry;
const K = window.BoundLoreKnowledgeRelations;

R.isKnownRelationType('crafted_from'); // true
R.normalizeRelationType('crafted_from'); // 'crafted_from'
R.getRelationDefinition('crafted_at'); // definition object
R.getRelationsByFamily('CRAFT').map(d => d.key); // includes crafted_from, crafted_at, ingredient_of, unlocks

const recipe = { ingredients: [{ name: 'Ember Shard', quantity: 3 }], station: 'Forge' };
K.buildCraftRelationsFromRecipe(recipe); // 2 relations
```

---

## Duplicate detection (future `add_recipe`)

`compareRecipeContributionDuplicates()` matches pending contributions when:

- Same target post
- Same intent `add_recipe`
- Same station (normalized)
- Same ingredient fingerprint (`name:qty:unit` sorted)
