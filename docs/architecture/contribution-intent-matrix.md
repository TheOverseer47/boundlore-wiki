# Contribution Intent Matrix

Existing intents (Stats, Effect, Behavior, Spawn, Known Item, Conflict) remain. This matrix defines extensions.

**P1-B.1 (local):** `js/contribution-intent-registry.js` — typed intent metadata (active vs reserved), merge/review/evidence policies. Code-only; no new UI, no SQL, no migration. Production masks remain in `js/contribution-flow.js` (`MASKS`).

**P1-B.2 (local):** Payload/admin preview tolerance — `normalizeContributionRecord`, preview safety helpers; reserved/unknown intents block approve without crashing admin. `add_recipe` conflict preview unchanged.

| Content Area | Intent Label | Target Field / Relation | Merge Behavior | Conflict Risk | Preview? | Evidence? | Duplicate Blocking? |
|---|---|---|---|---|---|---|---|
| Creature | Add Stats *(exists)* | Facts: hp/damage | Field merge, conflict flow | high | yes | optional | yes |
| Creature | Add Behavior *(exists)* | behavior fact | append/merge | low | yes | no | yes |
| Creature | Add Spawn Info *(exists)* | spawns_at relation | add + condition merge | medium | yes | no | yes |
| Creature | Add Drop | drops relation | add; same item ⇒ report_count++ | medium | yes | optional | **yes** |
| Creature | Report Weakness/Resistance | weak_to / resistant_to | add; same type both ways ⇒ conflict | high | yes | recommended | yes |
| Creature | Mark as Rideable | rideable fact + taming | review required | medium | yes | **required** | yes |
| Boss | Add Tactic | tactics fact (list) | append | low | yes | no | no |
| Item | Add Stats *(exists)* | facts | conflict flow | high | yes | optional | yes |
| Item | Add Recipe | crafted_from relations | **always review** | high | yes | recommended | yes |
| Item | Add Source | drops⟵ / found_in / harvested_from | add | medium | yes | optional | yes |
| Resource | Add Usage | ingredient_of | add | low | yes | no | yes |
| Biome | Add Resource/Creature Sighting | found_in⟵ | add + report_count | low | yes | no | yes |
| Biome | Add Hazard | hazard fact | append | low | yes | no | no |
| Place | Add Loot Found | contains_loot | add | low | yes | optional | yes |
| Settlement | Add NPC | NPC stub + located_in | review (entity creation) | medium | yes | recommended | yes |
| NPC | Add Dialogue Note | dialogue fact (append log) | append | low | no | no | no |
| Lore | Add Transcript | transcript field | review (text integrity) | medium | yes | **required** | yes |
| Lore | Add Mentioned Entity | mentions relation | add | low | yes | no | yes |
| All | Report Incorrect Info | flag → moderation | no merge | — | no | optional | no |
| All | Suggest Rename/Merge Duplicate | admin queue | admin execution only | — | yes | no | — |
| Admin/Trusted | Promote to Confirmed | evidence_tier upgrade | admin only | — | yes | required | — |
| Admin | Taxonomy Promotion (T3→T2) | subtype activation | admin only | — | — | — | — |

**Button priority:** Max 4 primary intents visible per page type; remainder under "More ways to contribute".
