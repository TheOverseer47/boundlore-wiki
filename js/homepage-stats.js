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

    if (error) throw error;

    animateCount(el.creatures, data.creatures_count || 0);
    animateCount(el.biomes, data.biomes_count || 0);
    animateCount(el.items, data.items_count || 0);
    animateCount(el.guides, data.guides_count || 0);
  } catch (err) {
    console.error("Failed to load homepage stats:", err);
    [el.creatures, el.biomes, el.items, el.guides].forEach((e) => {
      if (e) e.textContent = "0";
    });
  }
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
