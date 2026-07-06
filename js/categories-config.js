// categories-config.js — SINGLE SOURCE OF TRUTH for all post categories on BoundLore.
const BOUNDLORE_CATEGORIES = [
  {
    slug: 'creatures',
    label: 'Creatures',
    icon: '\u{1F409}',
    description: 'Beasts, monsters, mounts, and wildlife of the world.',
    nav: 'primary',
    subcategories: [
      { slug: 'mounts', label: 'Mounts' },
      { slug: 'monsters', label: 'Monsters' },
      { slug: 'npcs', label: 'NPCs' },
    ],
  },
  {
    slug: 'classes',
    label: 'Classes',
    icon: '\u2694\u{FE0F}',
    description: 'Professions, builds, quests, and talent paths.',
    nav: 'primary',
    subcategories: [
      { slug: 'berufe', label: 'Berufe' },
      { slug: 'building', label: 'Building' },
      { slug: 'quests', label: 'Quests' },
      { slug: 'talents', label: 'Talents' },
    ],
  },
  {
    slug: 'items',
    label: 'Items',
    icon: '\u{2694}\u{FE0F}',
    description: 'Weapons, armor, tools, and artifacts.',
    nav: 'primary',
    subcategories: [
      { slug: 'weapons', label: 'Weapons' },
      { slug: 'armor', label: 'Armor' },
      { slug: 'items', label: 'Items' },
    ],
  },
  { slug: 'guides', label: 'Guides', icon: '\u{1F4D6}', description: 'Tips, tutorials, and survival strategies.', nav: 'primary' },
  { slug: 'guilds', label: 'Guilds', icon: '\u{1F3F0}', description: 'Player factions and communities.', nav: 'primary' },
  { slug: 'community', label: 'Community', icon: '\u{1F310}', description: 'Social hubs, links, and community resources.', nav: 'primary' },
  { slug: 'news', label: 'News', icon: '\u{1F4F0}', description: 'Latest updates and announcements.', nav: 'primary' },
  { slug: 'biomes', label: 'Biomes', icon: '\u{1F30D}', description: 'Landscapes, climates, and regions.', nav: 'more' },
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
  { slug: 'berufe', label: 'Berufe' },
  { slug: 'quests', label: 'Quests' },
  { slug: 'talents', label: 'Talents' }
];

function getGuideSubcategoryLabel(slug) {
  const found = BOUNDLORE_GUIDE_SUBCATEGORIES.find(function(c) { return c.slug === slug; });
  return found ? found.label : (slug || 'Guide');
}

function getCategorySubcategories(categorySlug) {
  const cat = getCategoryBySlug(categorySlug);
  return cat && Array.isArray(cat.subcategories) ? cat.subcategories : [];
}

function getCategorySubcategoryLabel(categorySlug, subcategorySlug) {
  const subcategories = getCategorySubcategories(categorySlug);
  const found = subcategories.find(function(c) { return c.slug === subcategorySlug; });
  if (found) return found.label;
  return subcategorySlug || '';
}

function getAnySubcategoryLabel(categorySlug, subcategorySlug) {
  const categoryLabel = getCategorySubcategoryLabel(categorySlug, subcategorySlug);
  if (categoryLabel) return categoryLabel;
  return getGuideSubcategoryLabel(subcategorySlug);
}

function requiresSubcategoryForCategory(categorySlug) {
  return ['creatures', 'classes', 'items'].includes(categorySlug);
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
