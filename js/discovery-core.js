// discovery-core.js
// Phase A client API for entity matching and observation registration.
// Requires: supabase-config.js, categories-config.js (optional, for entity type mapping)

const DiscoveryCore = (function() {
  "use strict";

  function mapCategoryToEntityType(categorySlug, subcategorySlug) {
    if (typeof mapDiscoveryCategoryToEntityType === "function") {
      return mapDiscoveryCategoryToEntityType(categorySlug, subcategorySlug);
    }
    const cat = String(categorySlug || "").toLowerCase();
    const sub = String(subcategorySlug || "").toLowerCase();
    if (cat === "creatures") {
      if (sub === "mounts") return "mount";
      if (sub === "monsters") return "monster";
      if (sub === "races") return "race";
      if (sub === "npcs") return "npc";
      return "creature";
    }
    if (cat === "items") return "item";
    if (cat === "locations") return "location";
    if (cat === "biomes") return "biome";
    return "entity";
  }

  async function matchEntities(query, options) {
    const opts = options || {};
    if (!query || String(query).trim().length < 2) return [];

    const { data, error } = await supabase.rpc("bl_match_entities", {
      p_query: String(query).trim(),
      p_entity_type: opts.entityType || mapCategoryToEntityType(opts.categorySlug, opts.subcategorySlug) || null,
      p_category_slug: opts.categorySlug || null,
      p_world_name: opts.worldName || null,
      p_region_name: opts.regionName || null,
      p_limit: opts.limit || 8,
    });

    if (error) {
      console.error("bl_match_entities failed:", error);
      return [];
    }
    return data || [];
  }

  async function registerObservation(input) {
    const payload = input || {};
    const { data, error } = await supabase.rpc("bl_register_observation", {
      p_category_slug: payload.categorySlug,
      p_subcategory_slug: payload.subcategorySlug || null,
      p_entity_name: payload.entityName,
      p_world_name: payload.worldName || null,
      p_region_name: payload.regionName || null,
      p_payload: payload.payload || {},
      p_title: payload.title || null,
      p_content_html: payload.contentHtml || null,
      p_excerpt: payload.excerpt || null,
      p_related_entities: payload.relatedEntities || [],
    });

    if (error) throw error;
    return data;
  }

  function buildRelatedEntity(name, role, entityType, options) {
    const opts = options || {};
    return {
      name: name,
      role: role || "related",
      entity_type: entityType || "entity",
      entity_id: opts.entityId || null,
      canonical_key: opts.canonicalKey || null,
      match_type: opts.matchType || "new",
      match_score: opts.matchScore || 0,
    };
  }

  function isKnowledgeGraphDiscoveryEnabled() {
    const host = String(window.location.hostname || "").toLowerCase();
    if (host === "localhost" || host === "127.0.0.1") return true;

    const params = new URLSearchParams(window.location.search);
    if (params.get("knowledgeGraph") === "1") return true;
    if (params.get("knowledgeGraph") === "0") return false;
    if (params.get("discoveryV2") === "1") return true;
    if (params.get("discoveryV2") === "0") return false;
    try {
      return localStorage.getItem("boundlore_knowledge_graph_discovery") === "1"
        || localStorage.getItem("boundlore_discovery_v2") === "1";
    } catch (e) {
      return false;
    }
  }

  return {
    matchEntities,
    registerObservation,
    buildRelatedEntity,
    mapCategoryToEntityType,
    isKnowledgeGraphDiscoveryEnabled,
    isDiscoveryV2Enabled: isKnowledgeGraphDiscoveryEnabled,
  };
})();

window.DiscoveryCore = DiscoveryCore;
