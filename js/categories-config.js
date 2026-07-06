// categories-config.js — SINGLE SOURCE OF TRUTH for all post categories on BoundLore.
const BOUNDLORE_CATEGORIES = [
  { slug: 'creatures',  label: 'Creatures',  icon: '\u{1F409}', description: 'Beasts, monsters, and wildlife of the world.' },
  { slug: 'biomes',     label: 'Biomes',     icon: '\u{1F30D}', description: 'Landscapes, climates, and regions.' },
  { slug: 'items',      label: 'Items',      icon: '\u{2694}\u{FE0F}', description: 'Weapons, tools, and artifacts.' },
  { slug: 'guides',     label: 'Guides',     icon: '\u{1F4D6}', description: 'Tips, tutorials, and survival strategies.' },
  { slug: 'guilds',     label: 'Guilds',     icon: '\u{1F3F0}', description: 'Player factions and communities.' },
  { slug: 'building',   label: 'Building',   icon: '\u{1F3D7}\u{FE0F}', description: 'Structures, bases, and construction tips.' },
  { slug: 'dungeons',   label: 'Dungeons',   icon: '\u{1F3F0}', description: 'Instances, ruins, and dangerous encounters.' },
  { slug: 'locations',  label: 'Locations',  icon: '\u{1F5FA}\u{FE0F}', description: 'Notable landmarks and points of interest.' },
  { slug: 'lore',       label: 'Lore',       icon: '\u{1F4DC}', description: 'Mythology, history, and world background.' },
  { slug: 'crafting',   label: 'Crafting',   icon: '\u{1F528}', description: 'Recipes, materials, and item creation.' }
];

const DISCOVERY_TAG = {
  slug: 'discovery',
  label: 'Discovery',
  icon: '\u{2728}',
  description: 'Newly found, unverified, or rare finds shared by the community.'
};

function getCategoryBySlug(slug) {
  return BOUNDLORE_CATEGORIES.find(function(c) { return c.slug === slug; }) || null;
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
