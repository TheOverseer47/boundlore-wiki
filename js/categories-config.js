// categories-config.js — SINGLE SOURCE OF TRUTH for all post categories on BoundLore.
const BOUNDLORE_CATEGORIES = [
  {
    slug: 'creatures',
    label: 'Creatures',
    icon: '\u{1F409}',
    description: 'Beasts, monsters, mounts, and wildlife of the world.',
    nav: 'primary',
    subcategories: [
      { slug: 'mounts', label: 'Mounts', icon: '\u{1F40E}' },
      { slug: 'monsters', label: 'Monsters', icon: '\u{1F479}' },
      { slug: 'races', label: 'Races', icon: '\u{1F9DD}' },
      { slug: 'npcs', label: 'NPCs', icon: '\u{1F91D}' },
    ],
  },
  {
    slug: 'classes',
    label: 'Classes',
    icon: '\u2694\u{FE0F}',
    description: 'Professions, builds, quests, and talent paths.',
    nav: 'primary',
    subcategories: [
      { slug: 'berufe', label: 'Professions', icon: '\u{1F6E0}\u{FE0F}' },
      { slug: 'building', label: 'Building', icon: '\u{1F3D7}\u{FE0F}' },
      { slug: 'quests', label: 'Quests', icon: '\u{1F5FA}\u{FE0F}' },
      { slug: 'talents', label: 'Talents', icon: '\u{2728}' },
    ],
  },
  {
    slug: 'items',
    label: 'Items',
    icon: '\u{2694}\u{FE0F}',
    description: 'Weapons, armor, tools, and artifacts.',
    nav: 'primary',
    subcategories: [
      { slug: 'weapons', label: 'Weapons', icon: '\u{2694}\u{FE0F}' },
      { slug: 'armor', label: 'Armor', icon: '\u{1F6E1}\u{FE0F}' },
      { slug: 'items', label: 'Items', icon: '\u{1F9F0}' },
    ],
  },
  { slug: 'guides', label: 'Guides', icon: '\u{1F4D6}', description: 'Tips, tutorials, and survival strategies.', nav: 'primary' },
  { slug: 'guilds', label: 'Guilds', icon: '\u{1F3F0}', description: 'Player factions and communities.', nav: 'primary' },
  { slug: 'community', label: 'Community', icon: '\u{1F310}', description: 'Social hubs, links, and community resources.', nav: 'primary' },
  { slug: 'news', label: 'News', icon: '\u{1F4F0}', description: 'Latest updates and announcements.', nav: 'primary' },
  {
    slug: 'biomes',
    label: 'Biomes',
    icon: '\u{1F30D}',
    description: 'Landscapes, climates, and regions.',
    nav: 'more',
    subcategories: [
      { slug: 'aquatic', label: 'Aquatic', icon: '\u{1F30A}' },
      { slug: 'deserts', label: 'Deserts', icon: '\u{1F3DC}\u{FE0F}' },
      { slug: 'forests', label: 'Forests', icon: '\u{1F332}' },
      { slug: 'frozen', label: 'Frozen', icon: '\u{2744}\u{FE0F}' },
      { slug: 'grasslands', label: 'Grasslands', icon: '\u{1F33F}' },
      { slug: 'rocky-mountainous', label: 'Rocky & Mountainous', icon: '\u{26F0}\u{FE0F}' },
      { slug: 'swamp', label: 'Swamp', icon: '\u{1F43A}' },
    ],
  },
  { slug: 'dungeons', label: 'Dungeons', icon: '\u{1F3F0}', description: 'Instances, ruins, and dangerous encounters.', nav: 'more' },
  { slug: 'locations', label: 'Locations', icon: '\u{1F5FA}\u{FE0F}', description: 'Notable landmarks and points of interest.', nav: 'more' },
  { slug: 'lore', label: 'Lore', icon: '\u{1F4DC}', description: 'Mythology, history, and world background.', nav: 'more' },
  { slug: 'crafting', label: 'Crafting', icon: '\u{1F528}', description: 'Recipes, materials, and item creation.', nav: 'more' },
];

const BOUNDLORE_PRIMARY_NAV = [
  { slug: '', label: 'Home', href: '/' },
  { slug: 'creatures', label: 'Creatures', href: '/wiki/creatures/' },
  { slug: 'classes', label: 'Classes', href: '/wiki/classes/' },
  { slug: 'items', label: 'Items', href: '/wiki/items/' },
  { slug: 'guides', label: 'Guides', href: '/wiki/guides/' },
  { slug: 'guilds', label: 'Guilds', href: '/wiki/guilds/' },
  { slug: 'community', label: 'Community', href: '/wiki/community/' },
  { slug: 'news', label: 'News', href: '/wiki/news/' },
  { slug: 'browse', label: 'More', href: '/wiki/browse/' },
  { slug: 'support', label: 'Support', href: '/wiki/support/' },
];

const BOUNDLORE_MORE_NAV = BOUNDLORE_CATEGORIES.filter(function(cat) {
  return cat.nav === 'more';
});

const DISCOVERY_TAG = {
  slug: 'discovery',
  label: 'Discovery',
  icon: '\u{2728}',
  description: 'Newly found, unverified, or rare finds shared by the community.'
};

const BOUNDLORE_DISCOVERY_FLAG_QUERY = 'enableStructuredDiscovery';
const BOUNDLORE_DISCOVERY_FLAG_STORAGE = 'bl.enableStructuredDiscovery';
const BOUNDLORE_CATEGORY_EXTENSION_STORAGE = 'bl.dynamicCategoryExtensions';
let BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS = {};
let BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS_LOADED = false;

const BOUNDLORE_GUIDE_SUBCATEGORIES = [
  { slug: 'survival', label: 'Survival' },
  { slug: 'exploration', label: 'Exploration' },
  { slug: 'combat', label: 'Combat' },
  { slug: 'building', label: 'Building' },
  { slug: 'taming', label: 'Taming' },
  { slug: 'farming', label: 'Farming' },
  { slug: 'crafting-guide', label: 'Crafting' },
  { slug: 'lore-story', label: 'Lore & Story' },
  { slug: 'multiplayer-guilds', label: 'Multiplayer & Guilds' },
  { slug: 'beginner', label: 'Beginner Tips' },
  { slug: 'advanced', label: 'Advanced Strategies' },
  { slug: 'berufe', label: 'Professions' },
  { slug: 'quests', label: 'Quests' },
  { slug: 'talents', label: 'Talents' }
];

const BOUNDLORE_DISCOVERY_RELATION_GROUPS = {
  items: { label: 'Used Items', relationType: 'uses_item' },
  creatures: { label: 'Related Creatures', relationType: 'related_creature' },
  locations: { label: 'Related Locations/Biomes', relationType: 'found_in' },
  guides: { label: 'Related Guides', relationType: 'reference_guide' },
};

const BOUNDLORE_DISCOVERY_SCHEMA_DEFAULT = {
  fields: [
    { key: 'discovery_type', label: 'Discovery type', type: 'select', required: true, options: ['creature', 'item', 'mechanic', 'quest', 'location', 'npc', 'event', 'bug', 'exploit', 'secret', 'lore', 'resource', 'system'] },
    { key: 'entity_name', label: 'Name of the discovered entity (Item/NPC/Location/etc.)', type: 'text', required: true, max: 120, placeholder: 'e.g. Ashfang Stag, Ancient Watcher NPC, Whispering Mine' },
    { key: 'alt_names', label: 'Alternative names / aliases (optional)', type: 'text', required: false, max: 240, placeholder: 'Comma-separated aliases or community names' },
    { key: 'world_name', label: 'World', type: 'text', required: false, max: 80, placeholder: 'Optional — procedural world' },
    { key: 'region_name', label: 'Region / zone', type: 'text', required: true, max: 120, placeholder: 'e.g. Northern Marsh' },
    { key: 'found_in', label: 'Where found', type: 'text', required: true, max: 120, placeholder: 'e.g. Frostpine Valley, near broken tower' },
    { key: 'coordinates', label: 'Coordinates (optional)', type: 'text', required: false, max: 80, placeholder: 'e.g. X:234.55 Y:89.12 Z:-44.21' },
    { key: 'trigger_conditions', label: 'Trigger / conditions (optional)', type: 'textarea', required: false, max: 600, placeholder: 'Time, weather, event state, faction, or quest phase conditions.' },
    { key: 'requirements', label: 'Requirements / prerequisites (optional)', type: 'textarea', required: false, max: 700, placeholder: 'Required level, class, quest, item, reputation, group size, etc.' },
    { key: 'how_to_reproduce', label: 'How to reproduce', type: 'textarea', required: true, max: 1200, placeholder: 'Step-by-step: what you did, in what order, and under which conditions.' },
    { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600, placeholder: 'What happened exactly?' },
    { key: 'loot_or_rewards', label: 'Loot / rewards observed (optional)', type: 'textarea', required: false, max: 700, placeholder: 'Drops, rewards, resources, currency, recipes, or "Not observed".' },
    { key: 'drop_conditions', label: 'Drop conditions (optional)', type: 'textarea', required: false, max: 500, placeholder: 'Killed, tamed, harvested, opened chest, quest turn-in, difficulty, party size, etc.' },
    { key: 'expected_result', label: 'Expected result (or expected behavior)', type: 'textarea', required: true, max: 600, placeholder: 'What should happen instead?' },
    { key: 'confidence_level', label: 'Confidence level', type: 'select', required: true, options: ['1-rumor', '2-single-observation', '3-reproduced-once', '4-reproduced-multiple-times', '5-confirmed-by-multiple-players', '6-officially-confirmed'] },
    { key: 'impact_area', label: 'Impact area', type: 'select', required: true, options: ['cosmetic', 'gameplay', 'combat', 'taming', 'mounts', 'crafting', 'economy', 'progression', 'exploration', 'lore', 'questing', 'exploit', 'performance'] },
    { key: 'rarity', label: 'Rarity (optional)', type: 'select', required: false, options: ['common', 'uncommon', 'rare', 'very-rare', 'epic', 'legendary', 'unique', 'unknown'] },
    { key: 'automation_tags', label: 'Automation tags (optional)', type: 'text', required: false, max: 240, placeholder: 'e.g. #hidden,#boss,#secret_area' },
    { key: 'first_seen_version', label: 'First seen game version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.0' },
    { key: 'last_confirmed_version', label: 'Last confirmed version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.3' },
    { key: 'notes', label: 'Notes (optional)', type: 'textarea', required: false, max: 500 },
  ],
  relations: ['items', 'creatures', 'locations', 'guides'],
  media: {
    maxFiles: 8,
    maxFileSizeMb: 8,
    minImages: 0,
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.zip', '.txt'],
  },
};

const BOUNDLORE_DISCOVERY_SCHEMA_BY_CATEGORY = {
  creatures: {
    fields: [
      { key: 'discovery_type', label: 'Discovery type', type: 'select', required: true, options: ['wildlife', 'mount', 'monster', 'npc', 'boss', 'elite', 'rare-spawn', 'variant', 'tameable-creature', 'hostile-creature'] },
      { key: 'entity_name', label: 'Creature / NPC name', type: 'text', required: true, max: 120, placeholder: 'e.g. Emberhorn Elk, Watcher Warden NPC' },
      { key: 'alt_names', label: 'Alternative names / aliases (optional)', type: 'text', required: false, max: 240, placeholder: 'Comma-separated aliases or community names' },
      { key: 'world_name', label: 'World', type: 'text', required: false, max: 80, placeholder: 'Optional — procedural world' },
      { key: 'region_name', label: 'Region / zone', type: 'text', required: true, max: 120, placeholder: 'e.g. Northern Marsh' },
      { key: 'found_in', label: 'Where found', type: 'text', required: true, max: 120, placeholder: 'e.g. South ridge of Stormfen' },
      { key: 'coordinates', label: 'Coordinates (optional)', type: 'text', required: false, max: 80, placeholder: 'e.g. X:110.2 Y:42.8 Z:-17.5' },
      { key: 'time_of_day', label: 'Time of day', type: 'select', required: true, options: ['daytime', 'nighttime', 'dawn', 'dusk', 'any-time', 'unknown'] },
      { key: 'weather_condition', label: 'Weather condition', type: 'select', required: true, options: ['sunny-clear', 'rain', 'storm', 'snow', 'fog', 'windy', 'any-weather', 'unknown'] },
      { key: 'biome_context', label: 'Biome / environment', type: 'select', required: false, options: ['forest', 'grassland', 'desert', 'frozen', 'mountain', 'aquatic', 'swamp', 'cave', 'ruins', 'settlement', 'unknown'] },
      { key: 'spawn_conditions', label: 'Spawn conditions', type: 'textarea', required: true, max: 500, placeholder: 'Time/weather/biome/trigger requirements' },
      { key: 'taming_method', label: 'How to tame / verify behavior', type: 'textarea', required: true, max: 500, placeholder: 'Describe the observed method. If not tameable, explain how you verified that.' },
      { key: 'key_item_used', label: 'Key item used (optional)', type: 'text', required: false, max: 140, placeholder: 'e.g. Dragon Heart Medallion' },
      { key: 'mountable', label: 'Can be mounted?', type: 'select', required: true, options: ['yes', 'no', 'after-taming', 'only-temporarily', 'unknown'] },
      { key: 'health_points', label: 'Health (if known)', type: 'number', required: false, min: 0 },
      { key: 'combat_outcome', label: 'What happened after defeat?', type: 'select', required: true, options: ['dropped-loot', 'dropped-resource', 'dropped-currency', 'no-drop-observed', 'tamed-or-fled', 'despawned', 'quest-updated', 'spawned-another-event', 'unknown'] },
      { key: 'dropped_items', label: 'Dropped items / loot', type: 'textarea', required: false, max: 800, placeholder: 'Item names, quantities, rarity, and whether the drop was guaranteed or random.' },
      { key: 'drop_rate_observation', label: 'Drop rate observation', type: 'select', required: false, options: ['single-kill', '2-5-kills', '6-20-kills', '20-plus-kills', 'guaranteed-seeming', 'common-seeming', 'rare-seeming', 'very-rare-seeming', 'unknown'] },
      { key: 'loot_conditions', label: 'Loot conditions (optional)', type: 'textarea', required: false, max: 500, placeholder: 'Weapon used, difficulty, biome, time, party size, quest state, or special trigger.' },
      { key: 'group_size', label: 'Group size during observation', type: 'select', required: false, options: ['solo', 'duo', 'small-group-3-5', 'large-group-6-plus', 'unknown'] },
      { key: 'requirements', label: 'Requirements / prerequisites (optional)', type: 'textarea', required: false, max: 700, placeholder: 'Required level, class, quest, item, reputation, group size, etc.' },
      { key: 'how_to_reproduce', label: 'Reproduction steps', type: 'textarea', required: true, max: 1200, placeholder: 'Steps another player can repeat 1:1' },
      { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600, placeholder: 'What happened in your test run?' },
      { key: 'expected_result', label: 'Expected result', type: 'textarea', required: true, max: 600, placeholder: 'What should happen under normal behavior?' },
      { key: 'confidence_level', label: 'Confidence level', type: 'select', required: true, options: ['1-rumor', '2-single-observation', '3-reproduced-once', '4-reproduced-multiple-times', '5-confirmed-by-multiple-players', '6-officially-confirmed'] },
      { key: 'impact_area', label: 'Impact area', type: 'select', required: true, options: ['gameplay', 'combat', 'taming', 'mounts', 'progression', 'lore', 'exploit', 'economy', 'cosmetic', 'exploration'] },
      { key: 'rarity', label: 'Rarity (optional)', type: 'select', required: false, options: ['common', 'uncommon', 'rare', 'very-rare', 'epic', 'legendary', 'unique', 'unknown'] },
      { key: 'automation_tags', label: 'Automation tags (optional)', type: 'text', required: false, max: 240, placeholder: 'e.g. #rare_spawn,#mount,#night_only' },
      { key: 'first_seen_version', label: 'First seen game version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.0' },
      { key: 'last_confirmed_version', label: 'Last confirmed version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.3' },
    ],
    relations: ['items', 'locations', 'guides', 'creatures'],
    media: {
      maxFiles: 10,
      maxFileSizeMb: 10,
      minImages: 0,
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.zip', '.txt'],
    },
  },
  items: {
    fields: [
      { key: 'discovery_type', label: 'Discovery type', type: 'select', required: true, options: ['item', 'weapon', 'armor', 'tool', 'consumable', 'material', 'resource', 'quest-item', 'recipe', 'currency', 'cosmetic', 'artifact'] },
      { key: 'entity_name', label: 'Item name', type: 'text', required: true, max: 120, placeholder: 'e.g. Sunforged Compass' },
      { key: 'alt_names', label: 'Alternative names / aliases (optional)', type: 'text', required: false, max: 240, placeholder: 'Comma-separated aliases or community names' },
      { key: 'world_name', label: 'World', type: 'text', required: false, max: 80, placeholder: 'Optional — procedural world' },
      { key: 'region_name', label: 'Region / zone', type: 'text', required: true, max: 120, placeholder: 'e.g. Northern Marsh' },
      { key: 'found_in', label: 'Where found', type: 'text', required: true, max: 120, placeholder: 'e.g. Ancient Vault, floor 3 chest' },
      { key: 'coordinates', label: 'Coordinates (optional)', type: 'text', required: false, max: 80, placeholder: 'e.g. X:204.1 Y:64.7 Z:-10.2' },
      { key: 'rarity', label: 'Rarity', type: 'select', required: false, options: ['common', 'uncommon', 'rare', 'very-rare', 'epic', 'legendary', 'unique', 'unknown'] },
      { key: 'source_type', label: 'How was it obtained?', type: 'select', required: true, options: ['creature-drop', 'boss-drop', 'chest', 'quest-reward', 'crafting', 'vendor', 'gathering', 'resource-node', 'dungeon', 'event', 'fishing', 'trading', 'unknown'] },
      { key: 'dropped_by', label: 'Dropped by / rewarded from (optional)', type: 'text', required: false, max: 160, placeholder: 'Creature, chest, NPC, quest, dungeon, or resource node.' },
      { key: 'drop_rate_observation', label: 'Drop rate observation', type: 'select', required: false, options: ['single-source', '2-5-attempts', '6-20-attempts', '20-plus-attempts', 'guaranteed-seeming', 'common-seeming', 'rare-seeming', 'very-rare-seeming', 'unknown'] },
      { key: 'item_effect', label: 'Effect / use', type: 'textarea', required: true, max: 600, placeholder: 'What does the item do?' },
      { key: 'requirements', label: 'Requirements / prerequisites (optional)', type: 'textarea', required: false, max: 700, placeholder: 'Required level, class, quest, item, reputation, group size, etc.' },
      { key: 'how_to_reproduce', label: 'How to obtain', type: 'textarea', required: true, max: 1200, placeholder: 'Exact farming/crafting/loot steps' },
      { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600, placeholder: 'What was the actual drop/behavior?' },
      { key: 'expected_result', label: 'Expected result', type: 'textarea', required: true, max: 600, placeholder: 'What should have happened?' },
      { key: 'confidence_level', label: 'Confidence level', type: 'select', required: true, options: ['1-rumor', '2-single-observation', '3-reproduced-once', '4-reproduced-multiple-times', '5-confirmed-by-multiple-players', '6-officially-confirmed'] },
      { key: 'impact_area', label: 'Impact area', type: 'select', required: true, options: ['gameplay', 'combat', 'crafting', 'economy', 'progression', 'questing', 'exploit', 'lore', 'cosmetic'] },
      { key: 'automation_tags', label: 'Automation tags (optional)', type: 'text', required: false, max: 240, placeholder: 'e.g. #drop,#rare,#crafting' },
      { key: 'first_seen_version', label: 'First seen game version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.0' },
      { key: 'last_confirmed_version', label: 'Last confirmed version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.3' },
    ],
    relations: ['creatures', 'locations', 'guides', 'items'],
    media: {
      maxFiles: 8,
      maxFileSizeMb: 8,
      minImages: 0,
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.zip', '.txt'],
    },
  },
  locations: {
    fields: [
      { key: 'discovery_type', label: 'Discovery type', type: 'select', required: true, options: ['location', 'quest', 'secret', 'event', 'system'] },
      { key: 'entity_name', label: 'Location name', type: 'text', required: true, max: 120, placeholder: 'e.g. Sunken Gate Ruins' },
      { key: 'alt_names', label: 'Alternative names / aliases (optional)', type: 'text', required: false, max: 240, placeholder: 'Comma-separated aliases or community names' },
      { key: 'world_name', label: 'World', type: 'text', required: false, max: 80, placeholder: 'Optional — procedural world' },
      { key: 'found_in', label: 'Region/area', type: 'text', required: true, max: 120 },
      { key: 'coordinates', label: 'Coordinates (if available)', type: 'text', required: false, max: 80 },
      { key: 'trigger_conditions', label: 'Trigger / conditions (optional)', type: 'textarea', required: false, max: 600, placeholder: 'Time, weather, event state, faction, or quest phase conditions.' },
      { key: 'requirements', label: 'Requirements', type: 'textarea', required: false, max: 500 },
      { key: 'how_to_reproduce', label: 'How to reach', type: 'textarea', required: true, max: 1200, placeholder: 'Travel route and requirements, step-by-step' },
      { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600, placeholder: 'What did you find there?' },
      { key: 'expected_result', label: 'Expected result', type: 'textarea', required: true, max: 600, placeholder: 'What should normally be there?' },
      { key: 'confidence_level', label: 'Confidence level', type: 'select', required: true, options: ['1-rumor', '2-single-observation', '3-reproduced', '4-multi-confirmed', '5-officially-confirmed'] },
      { key: 'impact_area', label: 'Impact area', type: 'select', required: true, options: ['gameplay', 'progression', 'lore', 'exploit', 'economy', 'cosmetic'] },
      { key: 'automation_tags', label: 'Automation tags (optional)', type: 'text', required: false, max: 240, placeholder: 'e.g. #secret_area,#dungeon,#route' },
      { key: 'first_seen_version', label: 'First seen game version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.0' },
      { key: 'last_confirmed_version', label: 'Last confirmed version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.3' },
    ],
    relations: ['items', 'creatures', 'guides', 'locations'],
    media: {
      maxFiles: 8,
      maxFileSizeMb: 8,
      minImages: 0,
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.zip', '.txt'],
    },
  },
  biomes: {
    fields: [
      { key: 'discovery_type', label: 'Discovery type', type: 'select', required: true, options: ['biome', 'location', 'resource', 'event', 'system'] },
      { key: 'entity_name', label: 'Biome or zone name', type: 'text', required: true, max: 120, placeholder: 'e.g. Mistglass Basin' },
      { key: 'alt_names', label: 'Alternative names / aliases (optional)', type: 'text', required: false, max: 240, placeholder: 'Comma-separated aliases or community names' },
      { key: 'world_name', label: 'World', type: 'text', required: false, max: 80, placeholder: 'Optional — procedural world' },
      { key: 'found_in', label: 'Biome region', type: 'text', required: true, max: 120 },
      { key: 'climate', label: 'Climate', type: 'text', required: false, max: 80 },
      { key: 'trigger_conditions', label: 'Trigger / conditions (optional)', type: 'textarea', required: false, max: 600, placeholder: 'Time, weather, event state, faction, or quest phase conditions.' },
      { key: 'requirements', label: 'Requirements / prerequisites (optional)', type: 'textarea', required: false, max: 700, placeholder: 'Required level, class, quest, item, reputation, group size, etc.' },
      { key: 'how_to_reproduce', label: 'How to find', type: 'textarea', required: true, max: 1200, placeholder: 'Route + conditions + time/weather if relevant' },
      { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600, placeholder: 'What was observed in the biome?' },
      { key: 'resources_or_rewards', label: 'Resources / rewards found (optional)', type: 'textarea', required: false, max: 700, placeholder: 'Nodes, materials, rare spawns, chests, event rewards, or "Not observed".' },
      { key: 'expected_result', label: 'Expected result', type: 'textarea', required: true, max: 600, placeholder: 'What should be expected here?' },
      { key: 'confidence_level', label: 'Confidence level', type: 'select', required: true, options: ['1-rumor', '2-single-observation', '3-reproduced', '4-multi-confirmed', '5-officially-confirmed'] },
      { key: 'impact_area', label: 'Impact area', type: 'select', required: true, options: ['gameplay', 'progression', 'lore', 'exploit', 'economy', 'cosmetic'] },
      { key: 'automation_tags', label: 'Automation tags (optional)', type: 'text', required: false, max: 240, placeholder: 'e.g. #biome,#climate,#resource' },
      { key: 'first_seen_version', label: 'First seen game version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.0' },
      { key: 'last_confirmed_version', label: 'Last confirmed version (optional)', type: 'text', required: false, max: 40, placeholder: 'e.g. 1.4.3' },
    ],
    relations: ['items', 'creatures', 'guides', 'locations'],
    media: {
      maxFiles: 8,
      maxFileSizeMb: 8,
      minImages: 0,
      allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.zip', '.txt'],
    },
  },
};

// Lean discovery schemas — dropdown-first forms for the knowledge graph.
const BOUNDLORE_DISCOVERY_SCHEMA_V2_DEFAULT = {
  fields: [
    { key: 'discovery_type', label: 'What did you find?', type: 'select', required: true, options: ['creature', 'item', 'location', 'npc', 'resource', 'event', 'secret', 'other'] },
    { key: 'entity_name', label: 'Name', type: 'text', required: true, max: 120, placeholder: 'In-game name' },
    { key: 'world_name', label: 'World', type: 'text', required: false, max: 80, placeholder: 'Optional — procedural world' },
    { key: 'region_name', label: 'Region / zone', type: 'text', required: true, max: 120, placeholder: 'e.g. Northern Marsh' },
    { key: 'found_in', label: 'Exact spot', type: 'text', required: true, max: 120, placeholder: 'Landmark, cave, POI near you' },
    { key: 'coordinates', label: 'Coordinates (optional)', type: 'text', required: false, max: 80, placeholder: 'X / Y / Z if shown in-game' },
    { key: 'rarity', label: 'Rarity', type: 'select', required: false, options: ['common', 'uncommon', 'rare', 'very-rare', 'epic', 'legendary', 'unique', 'unknown'] },
    { key: 'notes', label: 'Short note (optional)', type: 'text', required: false, max: 240, placeholder: 'One sentence if something unusual happened' },
  ],
  relations: ['items', 'creatures', 'locations'],
  media: { maxFiles: 6, maxFileSizeMb: 10, minImages: 1, allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
};

const BOUNDLORE_DISCOVERY_SCHEMA_V2_BY_CATEGORY = {
  creatures: {
    fields: [
      { key: 'discovery_type', label: 'Creature type', type: 'select', required: true, options: ['wildlife', 'mount', 'monster', 'npc', 'boss', 'elite', 'rare-spawn', 'tameable', 'hostile'] },
      { key: 'entity_name', label: 'Creature name', type: 'text', required: true, max: 120, placeholder: 'Name from scan / UI' },
      { key: 'world_name', label: 'World', type: 'text', required: false, max: 80, placeholder: 'Optional — procedural world' },
      { key: 'region_name', label: 'Region / zone', type: 'text', required: true, max: 120, placeholder: 'e.g. Stormfen Ridge' },
      { key: 'found_in', label: 'Exact location', type: 'text', required: true, max: 120, placeholder: 'Near which landmark or biome feature?' },
      { key: 'coordinates', label: 'Coordinates (optional)', type: 'text', required: false, max: 80 },
      { key: 'time_of_day', label: 'Time of day', type: 'select', required: true, options: ['daytime', 'nighttime', 'dawn', 'dusk', 'any-time', 'unknown'] },
      { key: 'weather_condition', label: 'Weather', type: 'select', required: true, options: ['clear', 'rain', 'storm', 'snow', 'fog', 'any-weather', 'unknown'] },
      { key: 'biome_context', label: 'Environment', type: 'select', required: false, options: ['forest', 'grassland', 'desert', 'frozen', 'mountain', 'aquatic', 'swamp', 'cave', 'ruins', 'settlement', 'unknown'] },
      { key: 'mountable', label: 'Mountable?', type: 'select', required: true, options: ['yes', 'no', 'after-taming', 'unknown'] },
      { key: 'combat_outcome', label: 'After defeat / interaction', type: 'select', required: true, options: ['dropped-loot', 'dropped-resource', 'no-drop', 'tamed', 'fled', 'quest-trigger', 'unknown'] },
      { key: 'dropped_items', label: 'Loot / drops (optional)', type: 'text', required: false, max: 240, placeholder: 'Item names, comma-separated' },
      { key: 'rarity', label: 'Rarity', type: 'select', required: false, options: ['common', 'uncommon', 'rare', 'very-rare', 'epic', 'legendary', 'unique', 'unknown'] },
    ],
    relations: ['items', 'locations', 'creatures'],
    media: { maxFiles: 8, maxFileSizeMb: 10, minImages: 1, allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
  },
  items: {
    fields: [
      { key: 'discovery_type', label: 'Item type', type: 'select', required: true, options: ['weapon', 'armor', 'tool', 'consumable', 'material', 'quest-item', 'recipe', 'artifact', 'cosmetic', 'other'] },
      { key: 'entity_name', label: 'Item name', type: 'text', required: true, max: 120, placeholder: 'Name from inventory / tooltip' },
      { key: 'world_name', label: 'World', type: 'text', required: false, max: 80 },
      { key: 'region_name', label: 'Region / zone', type: 'text', required: true, max: 120 },
      { key: 'found_in', label: 'Where found', type: 'text', required: true, max: 120, placeholder: 'Chest, vendor, dungeon, etc.' },
      { key: 'coordinates', label: 'Coordinates (optional)', type: 'text', required: false, max: 80 },
      { key: 'source_type', label: 'How obtained', type: 'select', required: true, options: ['creature-drop', 'boss-drop', 'chest', 'quest-reward', 'crafting', 'vendor', 'gathering', 'dungeon', 'event', 'unknown'] },
      { key: 'dropped_by', label: 'Source (optional)', type: 'text', required: false, max: 120, placeholder: 'Creature, NPC, or location name' },
      { key: 'rarity', label: 'Rarity', type: 'select', required: false, options: ['common', 'uncommon', 'rare', 'very-rare', 'epic', 'legendary', 'unique', 'unknown'] },
      { key: 'item_effect', label: 'What it does (optional)', type: 'text', required: false, max: 200, placeholder: 'Short — stats show in screenshot' },
    ],
    relations: ['creatures', 'locations', 'items'],
    media: { maxFiles: 6, maxFileSizeMb: 10, minImages: 1, allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
  },
  locations: {
    fields: [
      { key: 'discovery_type', label: 'Place type', type: 'select', required: true, options: ['landmark', 'dungeon', 'secret', 'quest-site', 'resource-node', 'settlement', 'other'] },
      { key: 'entity_name', label: 'Location name', type: 'text', required: true, max: 120 },
      { key: 'world_name', label: 'World', type: 'text', required: false, max: 80 },
      { key: 'found_in', label: 'Region / area', type: 'text', required: true, max: 120 },
      { key: 'coordinates', label: 'Coordinates (optional)', type: 'text', required: false, max: 80 },
      { key: 'access_notes', label: 'How to reach (optional)', type: 'text', required: false, max: 240, placeholder: 'Brief route or requirement' },
    ],
    relations: ['items', 'creatures', 'locations'],
    media: { maxFiles: 6, maxFileSizeMb: 10, minImages: 1, allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
  },
  biomes: {
    fields: [
      { key: 'discovery_type', label: 'Zone type', type: 'select', required: true, options: ['biome', 'subzone', 'resource-area', 'event-zone', 'other'] },
      { key: 'entity_name', label: 'Biome / zone name', type: 'text', required: true, max: 120 },
      { key: 'world_name', label: 'World', type: 'text', required: false, max: 80 },
      { key: 'found_in', label: 'Region', type: 'text', required: true, max: 120 },
      { key: 'coordinates', label: 'Coordinates (optional)', type: 'text', required: false, max: 80 },
      { key: 'climate', label: 'Climate', type: 'select', required: false, options: ['temperate', 'desert', 'frozen', 'tropical', 'swamp', 'mountain', 'aquatic', 'unknown'] },
      { key: 'resources_or_rewards', label: 'Notable finds (optional)', type: 'text', required: false, max: 240, placeholder: 'Resources, spawns — comma-separated' },
    ],
    relations: ['items', 'creatures', 'locations'],
    media: { maxFiles: 6, maxFileSizeMb: 10, minImages: 1, allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp', '.gif'] },
  },
};

const BOUNDLORE_DISCOVERY_SCHEMA_LEAN_DEFAULT = BOUNDLORE_DISCOVERY_SCHEMA_V2_DEFAULT;
const BOUNDLORE_DISCOVERY_SCHEMA_LEAN_BY_CATEGORY = BOUNDLORE_DISCOVERY_SCHEMA_V2_BY_CATEGORY;

const BOUNDLORE_DISCOVERY_STOPWORDS = [
  'the', 'and', 'for', 'with', 'from', 'into', 'this', 'that', 'your', 'their', 'over', 'under',
  'near', 'area', 'zone', 'place', 'spot', 'guide', 'entry', 'discovery'
];

const BOUNDLORE_DISCOVERY_SYNONYMS = {
  npc: 'npcs',
  nonplayer: 'npcs',
  nonplayercharacter: 'npcs',
  mount: 'mounts',
  monster: 'monsters',
  race: 'races',
  weapon: 'weapons',
  biome: 'biomes',
  location: 'locations',
  class: 'classes',
  creature: 'creatures',
  item: 'items',
};

function isStructuredDiscoveryEnabled() {
  try {
    const params = new URLSearchParams(window.location.search || '');
    const queryValue = params.get(BOUNDLORE_DISCOVERY_FLAG_QUERY);
    if (queryValue === '1') {
      try { window.localStorage.setItem(BOUNDLORE_DISCOVERY_FLAG_STORAGE, '1'); } catch (err) {}
      return true;
    }
    if (queryValue === '0') {
      try { window.localStorage.removeItem(BOUNDLORE_DISCOVERY_FLAG_STORAGE); } catch (err) {}
      return false;
    }
    if (window.BOUNDLORE_FLAGS && window.BOUNDLORE_FLAGS.structuredDiscovery === true) {
      return true;
    }
    try {
      const stored = window.localStorage.getItem(BOUNDLORE_DISCOVERY_FLAG_STORAGE);
      if (stored === '1') return true;
      // Launch default: structured discovery is on unless explicitly disabled via ?enableStructuredDiscovery=0.
      return true;
    } catch (err) {
      return true;
    }
  } catch (err) {
    return true;
  }
}

function canCategoryAcceptDiscovery(categorySlug) {
  const cat = getCategoryBySlug(categorySlug);
  if (!cat) return false;
  if (cat.allowDiscovery === false) return false;
  return !['guides', 'community', 'news'].includes(cat.slug);
}

function getDiscoveryCategoryOptions() {
  return BOUNDLORE_CATEGORIES.filter(function(cat) {
    return canCategoryAcceptDiscovery(cat.slug);
  });
}

function getDiscoveryRelationGroups() {
  return BOUNDLORE_DISCOVERY_RELATION_GROUPS;
}

function isDiscoveryLeanSchemaActive() {
  try {
    if (typeof DiscoveryCore !== 'undefined' && DiscoveryCore.isKnowledgeGraphDiscoveryEnabled()) return true;
  } catch (err) { /* ignore */ }
  return false;
}

function usesLeanDiscoveryForm(meta) {
  if (meta && meta.discovery_form === 'lean') return true;
  if (meta && meta.discovery_form === 'extended') return false;
  if (meta && meta.discovery_schema_version === 'v2') return true;
  const payload = meta && meta.discovery_payload;
  if (!payload || typeof payload !== 'object') return isDiscoveryLeanSchemaActive();
  return !payload.observed_result && !payload.expected_result && !payload.how_to_reproduce;
}

function shouldUseDiscoveryLeanSchema(meta) {
  return usesLeanDiscoveryForm(meta);
}

function getDiscoverySchemaForApproval(post, meta) {
  const categorySlug = post && post.category ? post.category : '';
  if (usesLeanDiscoveryForm(meta)) {
    return categorySlug
      ? (BOUNDLORE_DISCOVERY_SCHEMA_LEAN_BY_CATEGORY[categorySlug] || BOUNDLORE_DISCOVERY_SCHEMA_LEAN_DEFAULT)
      : BOUNDLORE_DISCOVERY_SCHEMA_LEAN_DEFAULT;
  }
  return getDiscoverySchemaForCategory(categorySlug, meta);
}

function getDiscoverySchemaForCategory(categorySlug, meta) {
  if (usesLeanDiscoveryForm(meta) || isDiscoveryLeanSchemaActive()) {
    if (!categorySlug) return BOUNDLORE_DISCOVERY_SCHEMA_LEAN_DEFAULT;
    return BOUNDLORE_DISCOVERY_SCHEMA_LEAN_BY_CATEGORY[categorySlug] || BOUNDLORE_DISCOVERY_SCHEMA_LEAN_DEFAULT;
  }
  if (!categorySlug) return BOUNDLORE_DISCOVERY_SCHEMA_DEFAULT;
  return BOUNDLORE_DISCOVERY_SCHEMA_BY_CATEGORY[categorySlug] || BOUNDLORE_DISCOVERY_SCHEMA_DEFAULT;
}

function getDiscoveryUploadRulesForCategory(categorySlug) {
  const schema = getDiscoverySchemaForCategory(categorySlug);
  const media = schema && schema.media ? schema.media : null;
  return media || BOUNDLORE_DISCOVERY_SCHEMA_DEFAULT.media;
}

function setDynamicCategoryExtensions(rows) {
  const grouped = {};
  (Array.isArray(rows) ? rows : []).forEach(function(row) {
    const category = String(row.category_slug || '').trim();
    const subcategory = String(row.subcategory_slug || '').trim();
    if (!category || !subcategory) return;
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push({
      slug: subcategory,
      label: row.display_label || humanizeDiscoveryLabel(subcategory),
      icon: row.icon || ''
    });
  });
  BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS = grouped;
  BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS_LOADED = true;
  try {
    window.sessionStorage.setItem(BOUNDLORE_CATEGORY_EXTENSION_STORAGE, JSON.stringify(grouped));
  } catch (err) {}
}

function hydrateDynamicCategoryExtensionsFromStorage() {
  if (BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS_LOADED) return;
  try {
    const raw = window.sessionStorage.getItem(BOUNDLORE_CATEGORY_EXTENSION_STORAGE);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS = parsed;
      BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS_LOADED = true;
    }
  } catch (err) {}
}

async function ensureCategoryExtensionsLoaded() {
  if (BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS_LOADED) return BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS;
  hydrateDynamicCategoryExtensionsFromStorage();
  if (BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS_LOADED) return BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS;
  if (!window.supabase || typeof window.supabase.from !== 'function') return BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS;

  try {
    const { data, error } = await window.supabase
      .from('wiki_category_extensions')
      .select('category_slug, subcategory_slug, display_label, metadata, status')
      .eq('status', 'approved');
    if (error || !Array.isArray(data)) return BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS;
    setDynamicCategoryExtensions(data.map(function(row) {
      return {
        category_slug: row.category_slug,
        subcategory_slug: row.subcategory_slug,
        display_label: row.display_label,
        icon: row.metadata && row.metadata.icon ? row.metadata.icon : ''
      };
    }));
  } catch (err) {}
  return BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS;
}

function normalizeDiscoveryLookupTerm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map(function(term) {
      return BOUNDLORE_DISCOVERY_SYNONYMS[term] || term;
    })
    .join(' ')
    .trim();
}

function tokenizeDiscoveryLookupTerms(value) {
  return normalizeDiscoveryLookupTerm(value)
    .split(/\s+/)
    .filter(function(term) {
      return term && term.length >= 3 && !BOUNDLORE_DISCOVERY_STOPWORDS.includes(term);
    });
}

function scoreDiscoveryLookupMatch(query, candidate) {
  const normalizedQuery = normalizeDiscoveryLookupTerm(query);
  const normalizedCandidate = normalizeDiscoveryLookupTerm(candidate);
  if (!normalizedQuery || !normalizedCandidate) return 0;
  if (normalizedQuery === normalizedCandidate) return 100;
  if (normalizedCandidate.startsWith(normalizedQuery)) return 70;
  if (normalizedCandidate.includes(normalizedQuery)) return 50;

  const queryTerms = tokenizeDiscoveryLookupTerms(normalizedQuery);
  const candidateTerms = new Set(tokenizeDiscoveryLookupTerms(normalizedCandidate));
  let score = 0;
  queryTerms.forEach(function(term) {
    if (candidateTerms.has(term)) score += 15;
  });
  return score;
}

function humanizeDiscoveryLabel(value) {
  return String(value || '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, function(char) { return char.toUpperCase(); })
    .trim();
}

function getGuideSubcategoryLabel(slug) {
  const found = BOUNDLORE_GUIDE_SUBCATEGORIES.find(function(c) { return c.slug === slug; });
  return found ? found.label : (slug || 'Guide');
}

function getCategorySubcategories(categorySlug) {
  const cat = getCategoryBySlug(categorySlug);
  const base = cat && Array.isArray(cat.subcategories) ? cat.subcategories.slice() : [];
  hydrateDynamicCategoryExtensionsFromStorage();
  const dynamic = Array.isArray(BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS[categorySlug])
    ? BOUNDLORE_DYNAMIC_CATEGORY_EXTENSIONS[categorySlug]
    : [];
  const seen = new Set();
  return base.concat(dynamic).filter(function(item) {
    const slug = item && item.slug ? item.slug : '';
    if (!slug || seen.has(slug)) return false;
    seen.add(slug);
    return true;
  });
}

function getCategorySubcategoryLabel(categorySlug, subcategorySlug) {
  const subcategories = getCategorySubcategories(categorySlug);
  const found = subcategories.find(function(c) { return c.slug === subcategorySlug; });
  if (found) return found.label;
  return subcategorySlug || '';
}

function getCategorySubcategoryIcon(categorySlug, subcategorySlug) {
  const subcategories = getCategorySubcategories(categorySlug);
  const found = subcategories.find(function(c) { return c.slug === subcategorySlug; });
  return found && found.icon ? found.icon : '';
}

function getAnySubcategoryLabel(categorySlug, subcategorySlug) {
  const categoryLabel = getCategorySubcategoryLabel(categorySlug, subcategorySlug);
  if (categoryLabel) return categoryLabel;
  return getGuideSubcategoryLabel(subcategorySlug);
}

function requiresSubcategoryForCategory(categorySlug) {
  return getCategorySubcategories(categorySlug).length > 0;
}

function getCategoryDisplayLabel(categorySlug) {
  if (!categorySlug) return 'Uncategorized';
  const cat = getCategoryBySlug(categorySlug);
  return cat ? cat.label : categorySlug;
}

function getGuideSubcategoryLabel(slug) {
  const found = BOUNDLORE_GUIDE_SUBCATEGORIES.find(function(c) { return c.slug === slug; });
  return found ? found.label : (slug || 'Guide');
}

function getPostCategoryLabel(post) {
  if (post.post_type === 'guide') {
    return getGuideSubcategoryLabel(post.guide_subcategory);
  }
  return getCategoryDisplayLabel(post.category);
}

function getCategoryBySlug(slug) {
  return BOUNDLORE_CATEGORIES.find(function(c) { return c.slug === slug; }) || null;
}

function populateSubcategorySelect(selectElement, categorySlug, includeAllOption) {
  if (!selectElement) return;
  const options = categorySlug === 'guides' ? BOUNDLORE_GUIDE_SUBCATEGORIES : getCategorySubcategories(categorySlug);
  selectElement.innerHTML = '';
  if (includeAllOption) {
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All Subcategories';
    selectElement.appendChild(allOpt);
  }
  options.forEach(function(optData) {
    const opt = document.createElement('option');
    opt.value = optData.slug;
    opt.textContent = optData.label;
    selectElement.appendChild(opt);
  });
}

function populateCategorySelect(selectElement, includeAllOption) {
  selectElement.innerHTML = '';
  if (includeAllOption) {
    const allOpt = document.createElement('option');
    allOpt.value = '';
    allOpt.textContent = 'All Categories';
    selectElement.appendChild(allOpt);
  }
  BOUNDLORE_CATEGORIES.forEach(function(cat) {
    const opt = document.createElement('option');
    opt.value = cat.slug;
    opt.textContent = cat.icon + ' ' + cat.label;
    selectElement.appendChild(opt);
  });
}

function getWikiMainCategorySlugs() {
  return BOUNDLORE_CATEGORIES
    .map(function(cat) { return cat.slug; })
    .filter(function(slug) {
      return slug !== 'guides' && slug !== 'guilds' && slug !== 'community' && slug !== 'news';
    });
}

if (typeof window !== 'undefined') {
  window.BOUNDLORE_CATEGORIES = BOUNDLORE_CATEGORIES;
  window.getWikiMainCategorySlugs = getWikiMainCategorySlugs;
}
