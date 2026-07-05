// categories-config.js
// SINGLE SOURCE OF TRUTH for all post categories on BoundLore.
const BOUNDLORE_CATEGORIES = [
  { slug: "creatures", label: "Creatures", icon: "\ud83d\udc09", description: "Beasts, monsters, and wildlife of the world." },
  { slug: "biomes", label: "Biomes", icon: "\ud83c\udf0d", description: "Landscapes, climates, and regions." },
  { slug: "items", label: "Items", icon: "\u2694\ufe0f", description: "Weapons, tools, and artifacts." },
  { slug: "guides", label: "Guides", icon: "\ud83d\udcd6", description: "Tips, tutorials, and survival strategies." },
  { slug: "guilds", label: "Guilds", icon: "\ud83d\udee1\ufe0f", description: "Player factions and communities." },
  { slug: "building", label: "Building", icon: "\ud83c\udfd7\ufe0f", description: "Structures, bases, and construction tips." },
  { slug: "dungeons", label: "Dungeons", icon: "\ud83d\udddd\ufe0f", description: "Instances, ruins, and dangerous encounters." },
  { slug: "locations", label: "Locations", icon: "\ud83d\udccd", description: "Notable landmarks and points of interest." },
  { slug: "lore", label: "Lore", icon: "\ud83d\udcdc", description: "Mythology, history, and world background." },
  { slug: "crafting", label: "Crafting", icon: "\ud83d\udd28", description: "Recipes, materials, and item creation." }
];

const DISCOVERY_TAG = {
  slug: "discovery",
  label: "Discovery",
  icon: "\u2728",
  description: "Newly found, unverified, or rare finds shared by the community."
};

function getCategoryBySlug(slug) {
  return BOUNDLORE_CATEGORIES.find(function(c) { return c.slug === slug; }) || null;
}

function populateCategorySelect(selectElement, includeAllOption) {
  selectElement.innerHTML = "";
  if (includeAllOption) {
    const allOpt = document.createElement("option");
    allOpt.value = "";
    allOpt.textContent = "All Categories";
    selectElement.appendChild(allOpt);
  }
  BOUNDLORE_CATEGORIES.forEach(function(cat) {
    const opt = document.createElement("option");
    opt.value = cat.slug;
    opt.textContent = cat.icon + " " + cat.label;
    selectElement.appendChild(opt);
  });
}
