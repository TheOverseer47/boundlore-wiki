# Entity–Relation Matrix

Canonical modeling for all BoundLore content types. Domains: PLACE, BEING, OBJECT, SYSTEM, KNOWLEDGE, EVENT, COMMUNITY, META.

| Entity Type | Domain | Own Page? | Stub-Safe? | Primary Relations | Required Identifiers | Slug Strategy | Alias Strategy | Search Facets | Duplication Risk | Misclassification Risk |
|---|---|---|---|---|---|---|---|---|---|---|
| biome | PLACE | yes | yes | located_in, ⟵found_in, ⟵spawns_at | canonical_name | `{name}` | climate synonyms | climate, region | low | medium (biome vs. region) |
| region | PLACE | yes | yes | located_in (→ world), contains biomes | canonical_name | `region-{name}` | — | — | low | medium |
| landmark / POI | PLACE | yes if named; generic → observation | yes | located_in | name + region | `{name}-{hash}` | description variants | biome, type | **high** (procedural) | high |
| location_hint | PLACE | **no** (observation context) | — | — | — | — | — | — | — | — |
| dungeon / ruin / cave / temple | PLACE | yes if named/recurring | yes | located_in, contains_loot, ⟵found_in | name/type + region | `{type}-{name}` | type synonyms | type, biome | high | medium |
| settlement | PLACE | yes | yes | located_in, ⟵member_of (NPCs) | name | `settlement-{name}` | — | region | medium | low |
| waterbody | PLACE | yes if named | yes | located_in | name | `{name}` | ocean/sea/lake | type | medium | medium |
| creature | BEING | yes | yes | found_in, spawns_at, drops, weak_to, variant_of | canonical_name | `{name}-{hash}` | trivial names, plural | biome, hostility, size | medium | low |
| boss / elite | BEING | yes | yes | + located_in (arena), guaranteed drops | canonical_name | `boss-{name}` | title variants | biome, difficulty | low | medium |
| npc | BEING | yes if named; unnamed → fact on settlement | yes | located_in, member_of | name + location | `npc-{name}` | — | settlement, role | medium | medium |
| mount | BEING | yes — **creature subtype**, not parallel entity | yes | + requires (taming), rideable fact | canonical_name | like creature | — | + rideable, flying | low | low |
| faction (T3) | COMMUNITY | namespace only | yes | ⟵member_of, hostile_to | name | `faction-{name}` | — | — | low | — |
| item_generic | OBJECT | yes | yes | drops⟵, crafted_from, found_in | canonical_name | `{name}-{hash}` | material/color variants | category, rarity | medium | medium |
| weapon / armor / tool | OBJECT | yes — item subtypes | yes | + inflicts, grants, requires | canonical_name | like item | — | slot, damage_type | medium | low |
| resource / material | OBJECT | yes | **yes** | harvested_from, ingredient_of | canonical_name | `{name}` (no hash) | raw/processed forms | biome, source_type | **high** | medium |
| consumable | OBJECT | yes (subtype) | yes | grants, crafted_from | canonical_name | like item | — | effect | medium | low |
| building_part | OBJECT | yes (subtype) | yes | crafted_from, requires | canonical_name | `build-{name}` | — | material | medium | low |
| boat / vehicle | OBJECT | yes (subtype) | yes | crafted_from, requires | canonical_name | like item | — | travel_type | low | low |
| recipe | SYSTEM | **no** — facts on target item | — | crafted_at, ingredient_of⟵ | target item | — | — | station | high if own pages | — |
| crafting_station | SYSTEM | yes | yes | ⟵crafted_at | canonical_name | `station-{name}` | — | tier | low | low |
| skill / ability | SYSTEM | yes (T2) | yes | granted_by⟵, requires⟵ | name | `skill-{name}` | — | class (T3) | medium | medium |
| status_effect / damage_type | SYSTEM | yes — curated registry | no | ⟵inflicts, ⟵weak_to | name | `effect-{name}` | — | — | low | low |
| class_archetype (T3) | SYSTEM | namespace only | yes | ⟵requires | name | `class-{name}` | — | — | — | — |
| talent_node (T3) | SYSTEM | no — facts on class/skill | — | — | — | — | — | — | — | — |
| lore_book / inscription | KNOWLEDGE | yes | yes | mentions, found_in | title + location | `lore-{title}` | — | topic | medium | low |
| quest (T3) | EVENT/SYSTEM | namespace only | yes | gives_quest⟵ | name | `quest-{name}` | — | — | — | — |
| world_event (T3) | EVENT | namespace only | yes | located_in | name | `event-{name}` | — | — | — | — |
| vendor / economy (T3) | SYSTEM | no — facts on NPC/settlement | — | — | — | — | — | — | — | — |
| player_base / guild | COMMUNITY | guild exists; base T3 | yes | located_in | name | `guild-{name}` | — | — | low | — |
| weather / time | — | **no** — conditions on relations | — | — | — | — | — | — | — | — |
| map / coordinates | — | **no** — observation property | — | — | — | — | — | — | — | — |
| achievement (T3) | META | namespace only | — | — | — | — | — | — | — | — |
| patch_note (T3) | EVENT | yes as news subtype | yes | affects (T3) | version | `patch-{version}` | — | — | low | — |
