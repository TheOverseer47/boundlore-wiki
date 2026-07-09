# Search & Filter Matrix

| Page / Category | Default Sort | Filters | Facets | Relation Pivots | Empty-State Requirements |
|---|---|---|---|---|---|
| Creatures *(exists)* | Recency | Biome, hostility, subtype (boss/mount/wildlife) | size, evidence_tier | "lives in X", "drops Y" | "No creatures match" + filter reset |
| Items *(exists)* | Recency | Subtype (weapon/armor/tool/resource/consumable), rarity | slot, damage_type | "dropped by X", "craftable at Y", "ingredient for Z" | analog |
| Biomes *(exists)* | Name | climate_facet | region | "home of X" | exists |
| Locations | Name | Subtype (dungeon/ruin/…), biome | — | "contains loot X" | exists + CTA |
| Resources *(P0 new)* | Name | Source type (creature/plant/mining), biome | — | "ingredient for" reverse lookup | CTA "Report a resource" |
| Recipes browse *(P1, virtual via crafted_from)* | Target item name | Station, skill | — | Ingredient reverse ("what can I craft with X?") | "No known recipes yet" |
| NPCs *(P1)* | Name | Settlement, role | — | — | CTA |
| Lore *(P1)* | Discovery date | Topic, region | — | "mentions X" | CTA |
| Global search *(exists)* | Relevance | Domain tabs | evidence_tier | Synonym map via alias system | "No results" |

## Dangerous Filter Scenarios (avoid)

| Scenario | Why avoid | When OK |
|----------|-----------|---------|
| Filter by unconfirmed stats ("Damage > 50") | Implies false precision | P2 + high data density |
| Coordinate-based search | Misleading in procedural world | Never |
| Rarity filter while mostly `reported` | Misleading | Only with tier badges in results |
| Boss filter mixing elite + large creatures | Wrong taxonomy | Only curated subtype filter |
