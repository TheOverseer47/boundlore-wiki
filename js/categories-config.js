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
    { key: 'found_in', label: 'Where found', type: 'text', required: true, max: 120 },
    { key: 'how_to_reproduce', label: 'How to reproduce', type: 'textarea', required: true, max: 1200 },
    { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600 },
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
      { key: 'found_in', label: 'Where found', type: 'text', required: true, max: 120 },
      { key: 'spawn_conditions', label: 'Spawn conditions', type: 'textarea', required: true, max: 500 },
      { key: 'taming_method', label: 'How to tame', type: 'textarea', required: true, max: 500 },
      { key: 'mountable', label: 'Can be mounted?', type: 'select', required: true, options: ['yes', 'no', 'unknown'] },
      { key: 'health_points', label: 'Health (if known)', type: 'number', required: false, min: 0 },
      { key: 'how_to_reproduce', label: 'Reproduction steps', type: 'textarea', required: true, max: 1200 },
      { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600 },
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
      { key: 'found_in', label: 'Where found', type: 'text', required: true, max: 120 },
      { key: 'rarity', label: 'Rarity', type: 'text', required: false, max: 60 },
      { key: 'item_effect', label: 'Effect / use', type: 'textarea', required: true, max: 600 },
      { key: 'how_to_reproduce', label: 'How to obtain', type: 'textarea', required: true, max: 1200 },
      { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600 },
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
      { key: 'found_in', label: 'Region/area', type: 'text', required: true, max: 120 },
      { key: 'coordinates', label: 'Coordinates (if available)', type: 'text', required: false, max: 80 },
      { key: 'requirements', label: 'Requirements', type: 'textarea', required: false, max: 500 },
      { key: 'how_to_reproduce', label: 'How to reach', type: 'textarea', required: true, max: 1200 },
      { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600 },
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
      { key: 'found_in', label: 'Biome region', type: 'text', required: true, max: 120 },
      { key: 'climate', label: 'Climate', type: 'text', required: false, max: 80 },
      { key: 'how_to_reproduce', label: 'How to find', type: 'textarea', required: true, max: 1200 },
      { key: 'observed_result', label: 'Observed result', type: 'textarea', required: true, max: 600 },
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
      return window.localStorage.getItem(BOUNDLORE_DISCOVERY_FLAG_STORAGE) === '1';
    } catch (err) {
      return false;
    }
  } catch (err) {
    return false;
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

function getDiscoverySchemaForCategory(categorySlug) {
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
