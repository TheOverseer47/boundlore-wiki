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
    classes: document.getElementById("statClasses"),
  };

  if (!el.creatures && !el.biomes && !el.items && !el.guides && !el.classes) return;

  try {
    const { data, error } = await supabase
      .from("homepage_stats")
      .select("*")
      .single();

    const viewCounts = {
      creatures: data.creatures_count || 0,
      biomes: data.biomes_count || 0,
      items: data.items_count || 0,
      guides: data.guides_count || 0,
      classes: data.classes_count || 0,
    };

    const fallbackCounts = await loadHomepageStatsFallback();
    if (error || !data || shouldPreferFallback(viewCounts, fallbackCounts)) {
      updateCounters(el, fallbackCounts);
      return;
    }

    updateCounters(el, viewCounts);
  } catch (err) {
    console.warn("homepage_stats view failed, switching to direct count fallback:", err);
    const fallback = await loadHomepageStatsFallback();
    updateCounters(el, fallback);
  }
}

async function loadHomepageStatsFallback() {
  const [creatures, biomes, items, guides, classes] = await Promise.all([
    countPublishedByCategory("creatures"),
    countPublishedByCategory("biomes"),
    countPublishedByCategory("items"),
    countGuidesPublished(),
    countPublishedByCategory("classes"),
  ]);

  return {
    creatures,
    biomes,
    items,
    guides,
    classes,
  };
}

async function countPublishedByCategory(category) {
  const { count, error } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("category", category)
    .in("status", ["published", "approved"])
    .is("deleted_at", null);

  if (error) {
    console.error("Homepage counter fallback failed for category", category, error);
    return 0;
  }
  return count || 0;
}

async function countGuidesPublished() {
  const [guideType, legacyGuideCategory] = await Promise.all([
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("post_type", "guide")
      .in("status", ["published", "approved"])
      .is("deleted_at", null),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("category", "guides")
      .in("status", ["published", "approved"])
      .is("deleted_at", null),
  ]);

  const guideTypeCount = guideType.error ? 0 : (guideType.count || 0);
  const legacyCount = legacyGuideCategory.error ? 0 : (legacyGuideCategory.count || 0);

  if (guideType.error) {
    console.error("Homepage counter guide count failed for post_type=guide", guideType.error);
  }
  if (legacyGuideCategory.error) {
    console.error("Homepage counter guide count failed for category=guides", legacyGuideCategory.error);
  }

  return guideTypeCount + legacyCount;
}

function shouldPreferFallback(viewValues, fallbackValues) {
  const viewTotal = sumCounters(viewValues);
  const fallbackTotal = sumCounters(fallbackValues);
  return fallbackTotal > 0 && (viewTotal === 0 || fallbackTotal > viewTotal);
}

function sumCounters(values) {
  return (values.creatures || 0) + (values.biomes || 0) + (values.items || 0) + (values.guides || 0) + (values.classes || 0);
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
  animateCount(elements.classes, values.classes || 0);
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
