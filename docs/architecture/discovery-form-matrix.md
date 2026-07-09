# Discovery Form Matrix

**Universal intake pattern:**

- **Stage 0 Quick-Add (~30s):** What (name) + Type (domain/subtype) + Where (biome/region/unknown) + optional screenshot + optional one-line observation.
- **Stage 1 Wizard:** Subtype-specific core fields, offered after Quick-Add, skippable.
- **Stage 2 Add-Info Contributions:** Everything else, field-specific.

| Content Area | Intake Pattern | Quick Fields | Wizard Steps | Advanced Fields | Evidence Needs | Auto-Created Related Entities | Risk Notes |
|---|---|---|---|---|---|---|---|
| Biome | Quick-Add | Name, climate facet | Terrain, hazards, typical resources | Weather behavior, day/night | none | Region stub if given | Biome vs. region confusion → wizard hint |
| Location / Landmark | Quick-Add + **archetype/instance question** | Name/description, biome, named or generic? | Type, features, loot seen? | Coordinates, layout | Screenshot recommended for named | Biome stub | **Duplicate flood** for procedural POIs |
| Dungeon / Ruin / Cave / Temple | Like landmark + subtype dropdown | + subtype | Enemies inside?, loot?, subjective difficulty | Boss present?, puzzles | Screenshot recommended | Biome, boss stub | Difficulty is subjective → `reported` tier |
| Creature | exists — keep | Name, biome, hostility | Appearance, behavior, drops | Spawn conditions, variants | Screenshot recommended | Biome, drop item stubs | solved via canonical_slug |
| Boss / Elite | Creature wizard + boss flag | + boss/elite/normal | Arena, phases (free text), guaranteed drops | Tactics, weakness | **Screenshot required** | Location stub (arena) | "Large monster = boss" misclassification |
| NPC | Quick-Add | Name, location (settlement/biome) | Role, dialogue notes | Faction (T3) | Screenshot recommended | Settlement stub | Unnamed NPCs → fact on settlement |
| Faction (T3) | **no form** — admin only | — | — | — | — | — | — |
| Settlement | Quick-Add | Name, region/biome | Size, NPCs, services | Faction | Screenshot recommended | Biome/region | Procedural villages → archetype/instance |
| Item (generic) | exists | Name, category, obtain method | Subtype, rarity, effect | Stats, requirements | none | Source creature/biome stub | solved |
| Weapon / Armor / Tool | Item wizard + subtype branch | + subtype, slot | Damage/defense, damage type | Scaling, durability | none | like item | Stat conflicts expected |
| Resource | Quick-Add, minimal | Name, source type (biome/creature/plant) | Harvest tool, occurrence | Processing chain | none | Source stub | **Name duplicates** → synonym search |
| Recipe | **relation-first** on item page — no standalone discovery | Ingredients (item picker), station | Quantity, skill req | Unlock condition | Screenshot recommended | Ingredient + station stubs | Wrong ingredients → review, never auto-merge |
| Crafting Station | Quick-Add | Name, where found/built | Craftable list (via relations later) | Tier | none | — | low |
| Building Part | Item subtype wizard | Name, material | Build cost, station | Snap behavior | none | Material stubs | low |
| Mount | Creature wizard + mount branch | + rideable/flyable? | Taming method, saddle item? | Speed, stamina | **Screenshot required** | Taming item stubs | Hype false reports |
| Boat / Travel | Item subtype | Name, type | Build cost, capacity | — | Screenshot recommended | Material stubs | low |
| Class / Role (T3) | no form before evidence | — | — | — | — | — | — |
| Skill / Ability (T2) | evidence-first mini-form | Name, effect, source | Cost, cooldown | Scaling | Screenshot required | Source stub | All `reported` until promotion |
| Talent Tree (T3) | no form | — | — | — | — | — | — |
| Status Effect / Damage Type | **no community discovery** — curated registry | — | — | — | — | — | Vocabulary wild growth prevented |
| Quest (T3) | no form; free text on NPC page allowed | — | — | — | — | — | — |
| Lore / Book | Quick-Add | Title, location, photo/transcript | Full transcript, mentioned names | Interpretation (separate, speculative) | **Photo or transcript required** | mentions stubs | Interpretation vs. text mixing |
| World Event (T3) | no form | — | — | — | — | — | — |
| Economy / Vendor (T3) | no form; price observations as facts (P2) | — | — | — | — | — | Prices dynamic → never confirmed |
| Map / Region | Admin-curated + community suggestions | Name | Contained biomes | — | — | — | — |
| Player Base (T3) | no form before launch | — | — | — | — | — | — |
| Weather / Time | no form — conditions on other wizards | — | — | — | — | — | — |
| Evidence / Screenshot | Part of all forms (discovery-uploads bucket) | Upload + source type | — | — | — | — | Storage growth → limits exist |
