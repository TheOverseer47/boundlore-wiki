# Detail Page Matrix

Based on `wiki-entry-layout.js` section model. New page types reuse the same framework with section configuration.

| Page Type | Above the Fold | Core Sections (order) | Secondary Sections | Relation Widgets | Missing-Info CTA | Empty-State Behavior |
|---|---|---|---|---|---|---|
| Creature *(exists)* | Name, image, hostility badge, biome chips, evidence tier | Identity, Behavior, Combat (weak/resist), Drops, Spawn | Variants, lore mentions, observations log | Drops table, spawn map (P2) | Add Stats/Drop/Spawn | Hide empty sections |
| Boss | + difficulty hint, arena link | Identity, Arena, Phases/Tactics, guaranteed drops, weakness | Kill reports | like creature + located_in | Add Tactic | Hide empty |
| Item / Weapon / Armor / Tool | Name, image, rarity, subtype, slot | Identity, Stats, Effects, **Sources**, **Recipe**, Usage | Comparable items (P2) | Recipe widget, source widget | Add Recipe/Source | Hide empty |
| Resource | Name, image, source type | Sources (harvested_from), **Usage** (ingredient_of), Occurrence | — | Usage table | "What is it used for?" | Usage empty ⇒ prominent CTA |
| Biome *(exists)* | Name, climate badges, hero image | Overview, Creatures, Resources, Locations, Hazards | Weather notes | Inhabitant/resource lists | Report Sighting | exists |
| Place / Dungeon | Name, type badge, biome breadcrumb | Overview, contents (creatures/loot), access context | Layout notes | contains_loot, found_in⟵ | Add Loot Found | Hide empty |
| Settlement | Name, region | Overview, NPCs, Services | Faction (T3) | NPC list | Add NPC | Hide empty |
| NPC | Name, role badge, location | Identity, Role/Services, Dialogue notes | Quests (T3) | located_in, member_of | Add Dialogue Note | Hide empty |
| Station | Name, tier | Craftable items (crafted_at⟵) | Build cost | Recipe list | Add craftable item | CTA prominent if empty |
| Skill (T2) | Name, source | Effect, cost, granted_by | — | requires⟵ | Add source | Hide empty |
| Status Effect Registry | Name, icon | Definition (curated), inflicts⟵, weak/resistant | — | Two relation tables | none (curated) | Hide empty tables |
| Lore | Title, location | Transcript (verbatim), Mentioned entities, Interpretation (speculative badge) | — | mentions chips | Add Transcript | Hide interpretation if empty |
| Region | Name, map (P2) | Biomes, named places | — | located_in⟵ lists | — | Hide empty |

## Missing-Information Rules

| Rule | Detail |
|------|--------|
| Truly missing (show CTA) | Core-definition fields a player can contribute: creature without biome, item without source, resource without usage, boss without location, recipe without station |
| Unknown allowed (no CTA) | Spawn conditions, exact stats, rarity, weather deps, all T3 fields |
| Unconfirmed allowed | Facts with `reported` tier visible with badge |
| When to show CTAs | Max 3 per page, prioritized; only on published non-stub pages |
| When stub | Single "Help complete this stub" banner instead of per-field CTAs |
| When annoying | CTAs for T3 fields, repeated CTAs, datamining-only fields |

**Universal:** Evidence-tier badge on every page. Observations log always last, collapsed.
