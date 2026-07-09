// discovery-wizard.js — Entity autocomplete + observation submit for the knowledge graph
// Requires: supabase-config.js, discovery-core.js, create-post.js (relation/field state)

const DiscoveryWizard = (function() {
  "use strict";

  let entityMatchDebounce = null;
  let primaryEntitySelection = null;

  function isActive() {
    return typeof DiscoveryCore !== "undefined" && DiscoveryCore.isKnowledgeGraphDiscoveryEnabled();
  }

  function showKnowledgeGraphBanner() {
    if (!isActive()) return;
    const form = document.getElementById("createPostForm");
    if (!form || document.getElementById("discoveryKnowledgeGraphBanner")) return;

    const banner = document.createElement("div");
    banner.id = "discoveryKnowledgeGraphBanner";
    banner.className = "bl-discovery-v2-banner";
    banner.innerHTML =
      "<strong>Knowledge graph discovery</strong> — Your report links related entries and helps avoid duplicates.";
    form.insertBefore(banner, form.firstChild);
  }

  function getDiscoveryContext() {
    const category = document.getElementById("discoveryCategory")?.value || "";
    const subcategory = document.getElementById("discoverySubcategory")?.value || "";
    const payload = typeof discoveryFieldState !== "undefined" ? discoveryFieldState : {};
    return {
      categorySlug: category,
      subcategorySlug: subcategory,
      entityName: String(payload.entity_name || "").trim(),
      worldName: String(payload.world_name || "").trim(),
      regionName: String(payload.region_name || payload.found_in || "").trim(),
    };
  }

  function attachEntityNameField(input) {
    if (!isActive() || !input) return;

    let dropdown = input.parentElement.querySelector(".bl-entity-match-dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.className = "bl-entity-match-dropdown";
      dropdown.style.display = "none";
      input.parentElement.appendChild(dropdown);

      const status = document.createElement("p");
      status.className = "field-hint bl-entity-match-status";
      status.id = "entityMatchStatus";
      input.parentElement.appendChild(status);
    }

    input.addEventListener("input", function() {
      primaryEntitySelection = null;
      clearTimeout(entityMatchDebounce);
      const ctx = getDiscoveryContext();
      const query = input.value.trim();
      if (query.length < 2) {
        dropdown.style.display = "none";
        updateMatchStatus(null);
        return;
      }
      entityMatchDebounce = setTimeout(function() {
        runEntitySearch(query, ctx, dropdown, input);
      }, 300);
    });

    input.addEventListener("blur", function() {
      setTimeout(function() { dropdown.style.display = "none"; }, 200);
    });
  }

  async function runEntitySearch(query, ctx, dropdown, input) {
    const matches = await DiscoveryCore.matchEntities(query, {
      categorySlug: ctx.categorySlug,
      subcategorySlug: ctx.subcategorySlug,
      worldName: ctx.worldName || null,
      regionName: ctx.regionName || null,
      limit: 6,
    });

    dropdown.innerHTML = "";

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "bl-entity-match-item bl-entity-match-new";
      empty.textContent = "New discovery — no existing entry found";
      empty.addEventListener("mousedown", function(e) {
        e.preventDefault();
        primaryEntitySelection = { isNew: true, name: query };
        updateMatchStatus(primaryEntitySelection);
        dropdown.style.display = "none";
      });
      dropdown.appendChild(empty);
      dropdown.style.display = "block";
      updateMatchStatus({ isNew: true, name: query });
      return;
    }

    matches.forEach(function(match) {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "bl-entity-match-item";
      const reports = match.observation_count ? " · " + match.observation_count + " reports" : "";
      item.textContent = match.canonical_name + " (" + Math.round(match.match_score) + "% match" + reports + ")";
      item.addEventListener("mousedown", function(e) {
        e.preventDefault();
        input.value = match.canonical_name;
        if (typeof discoveryFieldState !== "undefined") {
          discoveryFieldState.entity_name = match.canonical_name;
        }
        primaryEntitySelection = {
          isNew: false,
          entityId: match.entity_id,
          name: match.canonical_name,
          matchType: match.match_type,
          matchScore: match.match_score,
        };
        updateMatchStatus(primaryEntitySelection);
        dropdown.style.display = "none";
      });
      dropdown.appendChild(item);
    });

    const newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.className = "bl-entity-match-item bl-entity-match-new";
    newBtn.textContent = "None of these — create new entry";
    newBtn.addEventListener("mousedown", function(e) {
      e.preventDefault();
      primaryEntitySelection = { isNew: true, name: query };
      updateMatchStatus(primaryEntitySelection);
      dropdown.style.display = "none";
    });
    dropdown.appendChild(newBtn);
    dropdown.style.display = "block";
  }

  function updateMatchStatus(selection) {
    const el = document.getElementById("entityMatchStatus");
    if (!el) return;
    if (!selection) {
      el.textContent = "";
      return;
    }
    if (selection.isNew) {
      el.textContent = "Will create a new wiki entry for: " + selection.name;
      el.style.color = "#d8b65d";
    } else {
      el.textContent = "Links to existing entry: " + selection.name + " (no duplicate post)";
      el.style.color = "#7dcea0";
    }
  }

  function mapGroupToRole(groupKey, primaryCategory) {
    if (groupKey === "items" && primaryCategory === "creatures") return "loot";
    if (groupKey === "locations") return "location";
    return "related";
  }

  function mapGroupToEntityType(groupKey) {
    if (groupKey === "items") return "item";
    if (groupKey === "creatures") return "creature";
    if (groupKey === "locations") return "location";
    if (groupKey === "guides") return "guide";
    return "entity";
  }

  function buildRelatedEntities(relationState, primaryCategory) {
    const out = [];
    const state = relationState || {};
    Object.keys(state).forEach(function(groupKey) {
      const list = state[groupKey] || [];
      list.forEach(function(item) {
        out.push({
          name: item.title || "",
          role: mapGroupToRole(groupKey, primaryCategory),
          entity_type: mapGroupToEntityType(groupKey),
          entity_id: item.entity_id || item.id || null,
          match_type: item.entity_id || item.id ? "exact" : "new",
          match_score: item.entity_id || item.id ? 100 : 0,
        });
      });
    });
    return out;
  }

  async function submitDiscovery(options) {
    const opts = options || {};
    const ctx = getDiscoveryContext();

    if (!ctx.categorySlug) throw new Error("Please select a discovery category.");
    if (!ctx.entityName || ctx.entityName.length < 2) throw new Error("Please enter an entity name.");

    const result = await DiscoveryCore.registerObservation({
      categorySlug: ctx.categorySlug,
      subcategorySlug: ctx.subcategorySlug || null,
      entityName: ctx.entityName,
      worldName: ctx.worldName || null,
      regionName: ctx.regionName || null,
      payload: opts.payload || {},
      title: opts.title || ctx.entityName,
      contentHtml: opts.contentHtml || "",
      excerpt: opts.excerpt || ctx.entityName,
      relatedEntities: opts.relatedEntities || [],
    });

    return result;
  }

  document.addEventListener("DOMContentLoaded", showKnowledgeGraphBanner);

  return {
    isActive,
    attachEntityNameField,
    buildRelatedEntities,
    submitDiscovery,
    getDiscoveryContext,
  };
})();

window.DiscoveryWizard = DiscoveryWizard;
