// ============================================
// FILE: js/homepage-stats.js
// Fixes: Homepage counters not updating
// Uses the "homepage_stats" view created in Etappe 1 SQL migration
// ============================================

async function loadHomepageStats() {
  const el = {
    creatures: document.getElementById("statCreatures"),
    biomes: document.getElementById("statBiomes"),
    items: document.getElementById("statItems"),
    guides: document.getElementById("statGuides"),
  };

  if (!el.creatures && !el.biomes && !el.items && !el.guides) return;

  try {
    const { data, error } = await supabase
      .from("homepage_stats")
      .select("*")
      .single();

    if (error || !data) {
      throw error || new Error("homepage_stats returned no data");
    }

    updateCounters(el, {
      creatures: data.creatures_count || 0,
      biomes: data.biomes_count || 0,
      items: data.items_count || 0,
      guides: data.guides_count || 0,
    });
  } catch (err) {
    console.warn("homepage_stats view failed, switching to direct count fallback:", err);
    const fallback = await loadHomepageStatsFallback();
    updateCounters(el, fallback);
  }
}

async function loadHomepageStatsFallback() {
  const [creatures, biomes, items, guides] = await Promise.all([
    countPostsByFilter({ category: "creatures", status: "published" }),
    countPostsByFilter({ category: "biomes", status: "published" }),
    countPostsByFilter({ category: "items", status: "published" }),
    countPostsByFilter({ post_type: "guide", status: "published" }),
  ]);

  return {
    creatures,
    biomes,
    items,
    guides,
  };
}

async function countPostsByFilter(filter) {
  let query = supabase.from("posts").select("id", { count: "exact", head: true });
  Object.keys(filter).forEach(function(key) {
    query = query.eq(key, filter[key]);
  });
  const { count, error } = await query;
  if (error) {
    console.error("Homepage counter fallback failed for", filter, error);
    return 0;
  }
  return count || 0;
}

function updateCounters(elements, values) {
  animateCount(elements.creatures, values.creatures || 0);
  animateCount(elements.biomes, values.biomes || 0);
  animateCount(elements.items, values.items || 0);
  animateCount(elements.guides, values.guides || 0);
}

function animateCount(element, target) {
  if (!element) return;
  let current = 0;
  const duration = 800;
  const stepTime = 20;
  const steps = duration / stepTime;
  const increment = target / steps;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      element.textContent = target;
      clearInterval(timer);
    } else {
      element.textContent = Math.floor(current);
    }
  }, stepTime);
}

document.addEventListener("DOMContentLoaded", loadHomepageStats);
