// ============================================
// Knowledge graph: typed directional relations,
// visibility rules, stub enrichment, follow-ups
// ============================================

window.KnowledgeRelations = (function() {
  const LARGE_NODE_CATEGORIES = ["biomes", "locations"];
  const SECTION_LIMIT_DEFAULT = 8;

  const RELATION_TYPES = {
    observed_in: {
      label: "Observed at",
      inverse: null,
      group: "locations",
      showOnSource: ["creatures"],
      showOnTarget: [],
      targetProminence: "hidden",
    },
    located_in: {
      label: "Area / biome",
      inverse: "contains",
      group: "locations",
      showOnSource: ["creatures", "items"],
      showOnTarget: [],
      targetProminence: "hidden",
    },
    found_in: {
      label: "Found in",
      inverse: null,
      group: "locations",
      showOnSource: ["items"],
      showOnTarget: ["items"],
      targetProminence: "secondary",
    },
    found_near: {
      label: "Reported near",
      inverse: null,
      group: "locations",
      showOnSource: ["creatures", "items"],
      showOnTarget: [],
      targetProminence: "hidden",
    },
    part_of: {
      label: "Part of",
      inverse: "contains",
      group: "locations",
      showOnSource: ["locations"],
      showOnTarget: [],
      targetProminence: "secondary",
    },
    contains: {
      label: "Contains",
      inverse: "part_of",
      group: "locations",
      showOnSource: ["biomes", "locations"],
      showOnTarget: ["biomes", "locations"],
      targetProminence: "collapsed",
    },
    drops: {
      label: "Drops",
      inverse: "dropped_by",
      group: "items",
      showOnSource: ["creatures"],
      showOnTarget: ["creatures", "items"],
      targetProminence: "primary",
    },
    dropped_by: {
      label: "Dropped by",
      inverse: "drops",
      group: "creatures",
      showOnSource: ["items"],
      showOnTarget: ["items", "creatures"],
      targetProminence: "primary",
    },
    requires: {
      label: "Requires",
      inverse: null,
      group: "items",
      showOnSource: ["creatures"],
      showOnTarget: ["items"],
      targetProminence: "secondary",
    },
    related_discovery: {
      label: "Related discovery",
      inverse: null,
      group: "discoveries",
      showOnSource: ["creatures", "items", "locations", "biomes"],
      showOnTarget: ["creatures", "items", "locations", "biomes"],
      targetProminence: "primary",
    },
    evidence_for: {
      label: "Evidence for",
      inverse: null,
      group: "discoveries",
      showOnSource: ["discoveries"],
      showOnTarget: ["creatures", "items", "locations", "biomes"],
      targetProminence: "secondary",
    },
  };

  const BIOME_SELECT_VALUES = {
    forest: "Forest",
    grassland: "Grassland",
    desert: "Desert",
    frozen: "Frozen",
    mountain: "Mountain",
    aquatic: "Aquatic",
    swamp: "Swamp",
    cave: "Cave",
    ruins: "Ruins",
    settlement: "Settlement",
  };

  const SECTION_ORDER = {
    creatures: ["observed_in", "located_in", "found_in", "found_near", "drops", "dropped_by", "requires", "related_discovery", "evidence_for"],
    items: ["dropped_by", "found_in", "observed_in", "located_in", "related_discovery", "evidence_for"],
    biomes: ["contains", "creatures", "items", "locations", "discoveries"],
    locations: ["contains", "creatures", "items", "locations", "discoveries"],
    discoveries: ["observed_in", "located_in", "drops", "dropped_by", "found_in", "related_discovery", "evidence_for"],
    default: ["observed_in", "located_in", "found_in", "drops", "dropped_by", "related_discovery"],
  };

  function normalizeRelationType(type) {
    const raw = String(type || "related_discovery").toLowerCase().replace(/[\s-]+/g, "_");
    if (RELATION_TYPES[raw]) return raw;
    if (raw === "found_in" || raw === "location") return "found_in";
    if (raw === "loot" || raw === "drop") return "drops";
    if (raw === "source" || raw === "drop_source") return "dropped_by";
    if (raw === "area" || raw === "biome") return "located_in";
    if (raw === "seen_at" || raw === "spotted_in" || raw === "observed_at") return "observed_in";
    if (raw === "encounter_context" || raw === "location_hint") return "observed_in";
    if (raw === "related_to") return "related_discovery";
    return "related_discovery";
  }

  // Maps JS relation types to vocabulary stored in wiki_relation_types (via RPC upper()).
  function normalizeRelationTypeForDbSync(type, group) {
    const js = normalizeRelationType(type);
    const map = {
      located_in: "found_in",
      observed_in: "found_in",
      observed_at: "found_in",
      found_near: "found_in",
      encounter_context: "found_in",
      location_hint: "found_in",
      contains: "part_of",
      related_discovery: "related_to",
      dropped_by: "drops",
    };
    if (map[js]) return map[js];
    if (["found_in", "drops", "part_of", "requires", "unlocks", "variant_of", "related_to"].includes(js)) {
      return js;
    }
    const groupKey = String(group || "").toLowerCase();
    if (groupKey === "locations" || groupKey === "biomes") return "found_in";
    if (groupKey === "items") return "drops";
    if (groupKey === "creatures") return "related_to";
    return "related_to";
  }

  function getRelationLabel(type, rel, viewerCategory) {
    const key = normalizeRelationType(type);
    const viewer = String(viewerCategory || "").toLowerCase();
    if (viewer === "biomes" || viewer === "locations") {
      const entityCat = rel && typeof EntityCore !== "undefined" && EntityCore.resolveRelationCategory
        ? EntityCore.resolveRelationCategory(rel)
        : "";
      if (entityCat === "creatures") return "Known creature";
      if (entityCat === "items") return "Known item";
      if (entityCat === "discoveries") return "Related discovery";
      if (key === "observed_in" || key === "found_near") return "Observed in";
      if (key === "located_in" || key === "found_in" || key === "part_of") return "Found in biome";
    }
    return (RELATION_TYPES[key] && RELATION_TYPES[key].label) || formatLabel(key);
  }

  function formatLabel(value) {
    return String(value || "")
      .replace(/_/g, " ")
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); });
  }

  function meaningfulValue(value) {
    const clean = String(value || "").trim();
    const lower = clean.toLowerCase();
    if (!clean) return "";
    if (["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) return "";
    return clean;
  }

  function normalizeTitleKey(title) {
    return String(title || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function dedupeKeyForRelation(rel) {
    const type = normalizeRelationType(rel.relation_type);
    const group = String(rel.group || inferGroupFromRelation(type) || "").toLowerCase();
    const title = normalizeTitleKey(rel.title);
    const context = String(rel.target_entity_type || rel.category || "").toLowerCase();
    return group + "|" + type + "|" + title + "|" + context;
  }

  function inferGroupFromRelation(type) {
    const cfg = RELATION_TYPES[normalizeRelationType(type)];
    return cfg ? cfg.group : "discoveries";
  }

  function inferTargetEntityType(group, relationType) {
    const groupKey = String(group || "").toLowerCase();
    const type = normalizeRelationType(relationType);
    if (groupKey === "items" || type === "drops" || type === "requires") return "item";
    if (groupKey === "creatures" || type === "dropped_by") return "creature";
    if (groupKey === "guides") return "guide";
    if (groupKey === "discoveries") return "discovery";
    if (type === "located_in" || type === "contains" || type === "part_of") return "biome";
    return "location";
  }

  function mapGroupToCategory(groupKey, relation) {
    if (groupKey === "items") return "items";
    if (groupKey === "creatures") return "creatures";
    if (groupKey === "discoveries") return null;
    if (groupKey === "locations") {
      const targetType = String(relation && relation.target_entity_type || "").toLowerCase();
      if (targetType === "biome") return "biomes";
      const title = String(relation && relation.title || "").toLowerCase();
      if (title.includes("swamp") || title.includes("forest") || title.includes("desert") || title.includes("biome")) {
        return title.split(/\s+/).length <= 2 ? "biomes" : "locations";
      }
      return targetType === "location" ? "locations" : "locations";
    }
    return "";
  }

  function isLargeNodeCategory(category) {
    return LARGE_NODE_CATEGORIES.includes(String(category || "").toLowerCase());
  }

  function resolveViewerCategory(post, postMeta) {
    if (post && post.post_type === "discovery") return "discoveries";
    const cat = String((post && post.category) || "").toLowerCase();
    if (cat) return cat;
    const payload = postMeta && postMeta.discovery_payload;
    if (payload && payload.discovery_type) {
      const dt = String(payload.discovery_type).toLowerCase();
      if (dt.includes("item") || dt === "weapon" || dt === "armor") return "items";
      if (dt.includes("creature") || dt.includes("monster") || dt.includes("boss")) return "creatures";
      if (dt.includes("biome") || dt.includes("zone")) return "biomes";
      if (dt.includes("location") || dt.includes("landmark")) return "locations";
    }
    return "default";
  }

  function classifyBiomeTitle(title, biomeContext) {
    const biomeSelect = meaningfulValue(biomeContext);
    if (biomeSelect && BIOME_SELECT_VALUES[biomeSelect]) {
      return { title: BIOME_SELECT_VALUES[biomeSelect], target_entity_type: "biome", category: "biomes" };
    }
    const clean = meaningfulValue(title);
    if (!clean) return null;
    if (typeof EntityCore !== "undefined") {
      const canonical = EntityCore.normalizeBiomeName(clean);
      if (canonical) {
        return { title: canonical, target_entity_type: "biome", category: "biomes" };
      }
      if (EntityCore.isVagueLocationHint(clean)) return null;
    }
    const words = clean.split(/\s+/);
    if (words.length <= 2 && !/near|campfire|camp|dungeon|cave|vault|tower|shrine/i.test(clean)) {
      return { title: clean, target_entity_type: "biome", category: "biomes" };
    }
    return null;
  }

  function shouldCreateKnowledgeStub(relation) {
    if (!relation || !relation.title) return false;
    const category = relation.category || mapGroupToCategory(relation.group, relation);
    const title = String(relation.title || "").trim();
    if (typeof EntityCore !== "undefined") {
      if (category === "locations" && EntityCore.isVagueLocationHint(title)) return false;
      if (category === "locations" && EntityCore.isKnownBiomeName(title)) return false;
      const placeInfo = EntityCore.classifyPlaceEntry(title, category, {});
      if (placeInfo.effective_category === "biomes" && category === "locations") return false;
      if (placeInfo.effective_category === "location_hint") return false;
    }
    return true;
  }

  function relationTargetsEntity(rel, canonicalName, entityKey, aliases) {
    if (!rel || !rel.title) return false;
    const relCanonical = typeof EntityCore !== "undefined"
      ? (EntityCore.extractCanonicalIdentity(rel.title, rel.category).canonical_name || rel.title)
      : rel.title;
    if (typeof EntityCore !== "undefined" && EntityCore.entityNameMatches(rel.title, canonicalName, entityKey, aliases)) {
      return true;
    }
    if (typeof EntityCore !== "undefined" && EntityCore.entityNameMatches(relCanonical, canonicalName, entityKey, aliases)) {
      return true;
    }
    if (entityKey && rel.target_entity_key && rel.target_entity_key === entityKey) return true;
    return normalizeTitleKey(relCanonical) === normalizeTitleKey(canonicalName);
  }

  function buildInboundRelationFromSource(rel, sourcePost, targetPost) {
    const inverse = createInverseRelation(rel, sourcePost);
    if (inverse) {
      inverse.direction = "inbound";
      inverse.visibility = getTargetProminence(inverse.relation_type, targetPost.category);
      if (typeof EntityCore !== "undefined") {
        Object.assign(inverse, EntityCore.enrichRelation(inverse, sourcePost));
      }
      return inverse;
    }
    return buildRelation({
      group: sourcePost.category || rel.group,
      relation_type: rel.relation_type,
      title: (function() {
        if (typeof EntityCore !== "undefined") {
          const sourceMeta = parseMetaFromHtml(sourcePost.content || "");
          return EntityCore.getDisplayName(sourceMeta, sourcePost)
            || EntityCore.extractCanonicalIdentity(sourcePost.title, sourcePost.category).canonical_name
            || meaningfulValue(sourcePost.title);
        }
        return meaningfulValue(sourcePost.title) || meaningfulValue(rel.source_entity_name);
      })(),
      id: sourcePost.id || null,
      slug: sourcePost.slug || null,
      category: sourcePost.category || null,
      post_type: sourcePost.post_type || null,
      target_entity_type: inferTargetEntityType(sourcePost.category, rel.relation_type),
      confidence: rel.confidence || 70,
      auto_inferred: true,
      direction: "inbound",
      source_post_id: rel.source_post_id || sourcePost.id || null,
      source_post_slug: rel.source_post_slug || sourcePost.slug || null,
      source_post_title: rel.source_post_title || sourcePost.title || null,
      source_date: rel.source_date || sourcePost.created_at || null,
      visibility: getTargetProminence(rel.relation_type, targetPost.category),
    });
  }

  async function fetchInboundRelations(client, post, postMeta) {
    if (!client || !post) return [];
    const canonical = typeof EntityCore !== "undefined"
      ? EntityCore.getCanonicalName(postMeta, post)
      : (post.title || "");
    const entityKey = typeof EntityCore !== "undefined"
      ? EntityCore.getEntityKey(postMeta, post)
      : null;
    const aliases = typeof EntityCore !== "undefined" ? EntityCore.getBiomeAliases(canonical) : [];
    if (!canonical) return [];

    const { data, error } = await client
      .from("posts")
      .select("id, slug, title, category, post_type, content, created_at")
      .eq("status", "published")
      .is("deleted_at", null)
      .in("category", ["creatures", "items", "discoveries", "locations", "biomes"])
      .neq("id", post.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error || !Array.isArray(data)) return [];

    const inbound = [];
    const seen = new Set();

    function pushInbound(rel) {
      const built = buildRelation(rel);
      const key = dedupeKeyForRelation(built) + "|inbound";
      if (seen.has(key)) return;
      seen.add(key);
      inbound.push(built);
    }

    data.forEach(function(sourcePost) {
      const sourceMeta = parseMetaFromHtml(sourcePost.content || "");
      // Contribution posts describe the target itself; they must not act as
      // separate relation sources (that would duplicate the entity).
      if (isContributionPost(sourcePost, sourceMeta)) return;
      const sourceRels = collectEntityRelations(sourcePost, sourceMeta);
      let linkedToTarget = false;

      sourceRels.forEach(function(rel) {
        if (!relationTargetsEntity(rel, canonical, entityKey, aliases)) return;
        linkedToTarget = true;
        pushInbound(buildInboundRelationFromSource(rel, sourcePost, post));
      });

      if (linkedToTarget && (String(post.category || "").toLowerCase() === "biomes"
        || (typeof EntityCore !== "undefined" && EntityCore.getEffectiveCategory(post, postMeta) === "biomes"))) {
        sourceRels.forEach(function(rel) {
          const type = normalizeRelationType(rel.relation_type);
          if (type !== "drops") return;
          pushInbound(buildRelation({
            group: "items",
            relation_type: "related_discovery",
            title: rel.title,
            id: rel.id || null,
            slug: rel.slug || null,
            category: "items",
            post_type: rel.post_type || null,
            target_entity_type: "item",
            confidence: Math.max(60, Number(rel.confidence) || 70),
            auto_inferred: true,
            direction: "inbound",
            source_post_id: sourcePost.id,
            source_post_slug: sourcePost.slug,
            source_post_title: sourcePost.title,
            source_date: sourcePost.created_at,
            visibility: "primary",
          }));
        });
      }
    });

    return dedupeRelationsForDisplay(inbound);
  }

  function buildRelation(base) {
    const type = normalizeRelationType(base.relation_type);
    const group = String(base.group || inferGroupFromRelation(type) || "").toLowerCase();
    return Object.assign({
      group: group,
      relation_type: type,
      title: meaningfulValue(base.title) || "",
      id: base.id || null,
      slug: base.slug || null,
      category: base.category || mapGroupToCategory(group, base) || null,
      post_type: base.post_type || null,
      target_entity_type: base.target_entity_type || inferTargetEntityType(group, type),
      confidence: Number.isFinite(Number(base.confidence)) ? Number(base.confidence) : 70,
      auto_inferred: !!base.auto_inferred,
      resolved: !!base.resolved,
      visibility: base.visibility || null,
      source_post_id: base.source_post_id || null,
      source_post_slug: base.source_post_slug || null,
      source_post_title: base.source_post_title || null,
      source_date: base.source_date || null,
      report_count: Number(base.report_count) > 0 ? Number(base.report_count) : 1,
      direction: base.direction || "outbound",
    }, base || {});
  }

  function createInverseRelation(rel, sourcePost) {
    const type = normalizeRelationType(rel.relation_type);
    const cfg = RELATION_TYPES[type];
    if (!cfg || !cfg.inverse) return null;
    const inverseType = normalizeRelationType(cfg.inverse);
    const inverseGroup = inferGroupFromRelation(inverseType);
    let sourceTitle = meaningfulValue((sourcePost && sourcePost.title) || rel.source_entity_name);
    if (typeof EntityCore !== "undefined" && sourcePost) {
      const sourceMeta = parseMetaFromHtml(sourcePost.content || "");
      sourceTitle = EntityCore.getDisplayName(sourceMeta, sourcePost)
        || EntityCore.extractCanonicalIdentity(sourcePost.title, sourcePost.category).canonical_name
        || sourceTitle;
    }
    if (!sourceTitle) return null;

    // The inverse relation points back at the source entity, so its display
    // group/type must follow the source post's category (e.g. a creature's
    // located_in inverts to contains-a-creature, not contains-a-biome).
    const sourceCategory = (sourcePost && sourcePost.category) || rel.source_category || null;
    const sourceGroup = sourceCategory && ["creatures", "items", "locations", "biomes", "guides"].includes(String(sourceCategory).toLowerCase())
      ? String(sourceCategory).toLowerCase()
      : inverseGroup;

    return buildRelation({
      group: sourceGroup,
      relation_type: inverseType,
      title: sourceTitle,
      id: sourcePost && sourcePost.id ? sourcePost.id : rel.source_post_id || null,
      slug: sourcePost && sourcePost.slug ? sourcePost.slug : rel.source_post_slug || null,
      category: sourceCategory,
      post_type: sourcePost && sourcePost.post_type ? sourcePost.post_type : "discovery",
      target_entity_type: inferTargetEntityType(sourceGroup, inverseType),
      confidence: rel.confidence || 70,
      auto_inferred: true,
      visibility: getTargetProminence(inverseType, rel.category || rel.target_entity_type),
      source_post_id: rel.source_post_id || null,
      source_post_slug: rel.source_post_slug || null,
      source_post_title: rel.source_post_title || null,
      source_date: rel.source_date || null,
      direction: "inbound",
    });
  }

  function getTargetProminence(relationType, targetCategory) {
    const cfg = RELATION_TYPES[normalizeRelationType(relationType)];
    if (!cfg) return "primary";
    if (isLargeNodeCategory(targetCategory)) return cfg.targetProminence || "collapsed";
    return "primary";
  }

  function appendAutoRelations(relations, payload, sourceCategory, sourceContext) {
    const list = Array.isArray(relations) ? relations : [];
    const seen = new Set(list.map(dedupeKeyForRelation));
    const data = payload && typeof payload === "object" ? payload : {};
    const ctx = sourceContext || {};
    const sourceName = meaningfulValue(data.entity_name) || meaningfulValue(ctx.sourceTitle) || "";
    const sourcePostId = ctx.sourcePostId || null;
    const sourcePostSlug = ctx.sourcePostSlug || null;
    const sourceDate = ctx.sourceDate || new Date().toISOString();

    function add(group, relationType, title, opts) {
      const rel = buildRelation(Object.assign({
        group: group,
        relation_type: relationType,
        title: title,
        auto_inferred: true,
        source_entity_name: sourceName,
        source_post_id: sourcePostId,
        source_post_slug: sourcePostSlug,
        source_post_title: ctx.sourceTitle || sourceName,
        source_date: sourceDate,
        source_category: sourceCategory || null,
      }, opts || {}));
      if (!rel.title) return;
      const key = dedupeKeyForRelation(rel);
      if (seen.has(key)) return;
      seen.add(key);
      list.push(rel);
    }

    const foundIn = meaningfulValue(data.found_in);
    const region = meaningfulValue(data.region_name);
    const biomeContext = data.biome_context;
    const foundSplit = typeof EntityCore !== "undefined"
      ? EntityCore.splitPlaceContext(foundIn)
      : { biome: "", location_hint: foundIn, is_vague: false };
    const regionBiome = typeof EntityCore !== "undefined" ? EntityCore.normalizeBiomeName(region) : region;
    const biomeInfo = classifyBiomeTitle(regionBiome || foundSplit.biome || region || foundIn, biomeContext);
    const locationHint = meaningfulValue(data.location_hint)
      || meaningfulValue(data.encounter_context)
      || (foundSplit.is_vague ? foundSplit.location_hint : "");

    if (String(sourceCategory || "").toLowerCase() === "creatures") {
      if (!locationHint && foundIn && (!foundSplit.is_vague || (typeof EntityCore !== "undefined" && EntityCore.hasDefiniteLocationData(data)))) {
        add("locations", "observed_in", foundIn, {
          target_entity_type: "location",
          category: "locations",
          confidence: 90,
        });
      }
      const biomeTitle = regionBiome || (biomeInfo && biomeInfo.title) || foundSplit.biome || "";
      if (biomeTitle) {
        add("locations", "located_in", biomeTitle, {
          target_entity_type: "biome",
          category: "biomes",
          confidence: 86,
        });
      } else if (region && region !== foundIn && !locationHint) {
        const regionInfo = classifyBiomeTitle(region, biomeContext);
        if (regionInfo && regionInfo.title) {
          add("locations", "located_in", regionInfo.title, {
            target_entity_type: "biome",
            category: "biomes",
            confidence: 78,
          });
        }
      }
      extractListValues(data.dropped_items || data.loot_or_rewards).forEach(function(itemName) {
        add("items", "drops", itemName, {
          target_entity_type: "item",
          category: "items",
          confidence: 80,
        });
      });
    }

    if (String(sourceCategory || "").toLowerCase() === "items") {
      if (meaningfulValue(data.dropped_by)) {
        add("creatures", "dropped_by", data.dropped_by, {
          target_entity_type: "creature",
          category: "creatures",
          confidence: 88,
        });
      }
      const itemBiome = regionBiome || (biomeInfo && biomeInfo.title) || foundSplit.biome || "";
      if (itemBiome) {
        add("locations", "located_in", itemBiome, {
          target_entity_type: "biome",
          category: "biomes",
          confidence: 82,
        });
      }
      if (foundIn && !foundSplit.is_vague && normalizeTitleKey(foundIn) !== normalizeTitleKey(itemBiome)) {
        add("locations", "found_in", foundIn, {
          target_entity_type: "location",
          category: "locations",
          confidence: 86,
        });
      }
    }

    if (String(sourceCategory || "").toLowerCase() === "locations" || String(sourceCategory || "").toLowerCase() === "biomes") {
      if (foundIn && foundIn !== meaningfulValue(data.entity_name)) {
        add("locations", "part_of", foundIn, {
          target_entity_type: "location",
          category: "locations",
          confidence: 70,
        });
      }
      extractListValues(data.resources_or_rewards).forEach(function(itemName) {
        add("items", "related_discovery", itemName, {
          target_entity_type: "item",
          category: "items",
          confidence: 65,
        });
      });
    }

    if (meaningfulValue(data.key_item_used)) {
      add("items", "requires", data.key_item_used, {
        target_entity_type: "item",
        category: "items",
        confidence: 85,
      });
    }

    return list;
  }

  function extractListValues(value) {
    return String(value || "")
      .split(/[,;\n]+/)
      .map(function(item) { return item.trim().replace(/^\d+x?\s*/i, ""); })
      .filter(function(item) {
        const lower = item.toLowerCase();
        return item.length >= 3 && !["unknown", "unclear", "none", "not observed"].includes(lower);
      })
      .slice(0, 8);
  }

  function mergeRelations(existing, incoming) {
    const out = Array.isArray(existing) ? existing.slice() : [];
    const seen = new Set(out.map(dedupeKeyForRelation));
    (Array.isArray(incoming) ? incoming : []).forEach(function(rel) {
      const normalized = buildRelation(rel);
      if (!normalized.title) return;
      const key = dedupeKeyForRelation(normalized);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(normalized);
    });
    return out;
  }

  function shouldShowRelation(rel, viewerCategory, options) {
    const opts = options || {};
    const type = normalizeRelationType(rel.relation_type);
    const cfg = RELATION_TYPES[type];
    const viewer = String(viewerCategory || "default").toLowerCase();
    const prominence = rel.visibility || (cfg && cfg.targetProminence) || "primary";

    if (opts.context === "discovery_post") {
      if (prominence === "hidden") return false;
      if (rel.auto_inferred && type === "located_in" && viewer === "discoveries") return true;
      return true;
    }

    if (opts.context === "wiki_entry") {
      if (prominence === "hidden") return false;
      return true;
    }

    if (rel.direction === "inbound" && isLargeNodeCategory(viewer)) {
      if (type === "observed_in" || type === "found_near") return prominence !== "hidden";
      if (prominence === "hidden") return false;
      return true;
    }

    if (cfg && cfg.showOnSource && cfg.showOnSource.includes(viewer)) return true;
    if (cfg && cfg.showOnTarget && cfg.showOnTarget.includes(viewer) && rel.direction === "inbound") return true;

    if (viewer === "creatures" && (type === "observed_in" || type === "located_in" || type === "drops" || type === "requires" || type === "related_discovery")) return true;
    if (viewer === "items" && (type === "dropped_by" || type === "found_in" || type === "located_in" || type === "related_discovery")) return true;
    if (isLargeNodeCategory(viewer) && prominence !== "hidden") return true;

    return prominence === "primary";
  }

  function relationEntityDedupeKey(rel) {
    if (!rel) return "";
    const enriched = typeof EntityCore !== "undefined" ? EntityCore.enrichRelation(rel) : rel;
    if (enriched.target_entity_key) return String(enriched.target_entity_key).toLowerCase();
    if (enriched.target_post_id || enriched.id) {
      const cat = typeof EntityCore !== "undefined"
        ? EntityCore.resolveRelationCategory(enriched)
        : String(enriched.category || enriched.group || "entry").toLowerCase();
      return cat + "|post:" + String(enriched.target_post_id || enriched.id);
    }
    if (enriched.target_post_slug || enriched.slug) {
      const cat = typeof EntityCore !== "undefined"
        ? EntityCore.resolveRelationCategory(enriched)
        : String(enriched.category || enriched.group || "entry").toLowerCase();
      return cat + "|slug:" + String(enriched.target_post_slug || enriched.slug).toLowerCase();
    }
    const display = typeof EntityCore !== "undefined"
      ? EntityCore.getRelationDisplayName(enriched)
      : (enriched.canonical_target_name || enriched.display_name || enriched.title || "");
    const cat = typeof EntityCore !== "undefined"
      ? EntityCore.resolveRelationCategory(enriched)
      : String(enriched.category || enriched.group || "entry").toLowerCase();
    return cat + "|" + normalizeTitleKey(display);
  }

  function countKnownEntitiesForViewer(relations, viewerCategory) {
    const viewer = String(viewerCategory || "").toLowerCase();
    if (viewer !== "biomes" && viewer !== "locations") {
      return { creatures: 0, items: 0, discoveries: 0 };
    }

    const rels = dedupeRelationsForDisplay(relations);
    const seenCreatures = new Set();
    const seenItems = new Set();
    const seenDiscoveries = new Set();
    let creatures = 0;
    let items = 0;
    let discoveries = 0;

    rels.forEach(function(rel) {
      const bucket = typeof EntityCore !== "undefined"
        ? EntityCore.resolveRelationCategory(rel)
        : String(rel.category || rel.group || "").toLowerCase();
      if (bucket !== "creatures" && bucket !== "items" && bucket !== "discoveries") return;

      const key = relationEntityDedupeKey(rel);
      if (!key) return;

      if (bucket === "creatures" && !seenCreatures.has(key)) {
        seenCreatures.add(key);
        creatures += 1;
      } else if (bucket === "items" && !seenItems.has(key)) {
        seenItems.add(key);
        items += 1;
      } else if (bucket === "discoveries" && !seenDiscoveries.has(key)) {
        seenDiscoveries.add(key);
        discoveries += 1;
      }
    });

    return { creatures: creatures, items: items, discoveries: discoveries };
  }

  function groupRelationsForDisplay(relations, viewerCategory, options) {
    const opts = Object.assign({ limit: isLargeNodeCategory(viewerCategory) ? SECTION_LIMIT_DEFAULT : 24 }, options || {});
    const viewer = String(viewerCategory || "default").toLowerCase();
    const filtered = (Array.isArray(relations) ? relations : []).filter(function(rel) {
      return shouldShowRelation(rel, viewer, opts);
    });

    const buckets = {};
    filtered.forEach(function(rel) {
      const type = normalizeRelationType(rel.relation_type);
      let sectionKey = type;
      if (isLargeNodeCategory(viewer)) {
        const entityCat = typeof EntityCore !== "undefined" && EntityCore.resolveRelationCategory
          ? EntityCore.resolveRelationCategory(rel)
          : "";
        if (entityCat === "items") sectionKey = "items";
        else if (entityCat === "creatures") sectionKey = "creatures";
        else if (entityCat === "discoveries") sectionKey = "discoveries";
        else if (entityCat === "locations" || entityCat === "biomes") sectionKey = "locations";
        else if (type === "drops" || rel.group === "items" || rel.target_entity_type === "item") sectionKey = "items";
        else if (type === "dropped_by" || rel.group === "creatures" || rel.target_entity_type === "creature") sectionKey = "creatures";
        else if (rel.group === "discoveries" || rel.target_entity_type === "discovery") sectionKey = "discoveries";
        else if (rel.group === "locations" || rel.target_entity_type === "location" || rel.target_entity_type === "biome") sectionKey = "locations";
      }
      if (!buckets[sectionKey]) buckets[sectionKey] = [];
      buckets[sectionKey].push(rel);
    });

    const order = SECTION_ORDER[viewer] || SECTION_ORDER.default;
    const sections = [];
    const used = new Set();

    function pushSection(key, title, collapsible, limit) {
      if (!buckets[key] || !buckets[key].length || used.has(key)) return;
      used.add(key);
      const items = dedupeRelationsForDisplay(buckets[key]).slice().sort(function(a, b) {
        return (Number(b.confidence) || 0) - (Number(a.confidence) || 0);
      });
      const max = limit || opts.limit;
      sections.push({
        key: key,
        title: title || formatSectionTitle(key),
        items: items.slice(0, max),
        total: items.length,
        collapsible: !!collapsible,
        hasMore: items.length > max,
      });
    }

    if (isLargeNodeCategory(viewer)) {
      pushSection("creatures", "Known creatures & monsters", true, opts.limit);
      pushSection("items", "Known items", true, opts.limit);
      pushSection("locations", "Related locations", true, opts.limit);
      pushSection("discoveries", "Discoveries", true, opts.limit);
    } else {
      order.forEach(function(key) {
        if (!buckets[key] || !buckets[key].length) return;
        pushSection(key, getRelationLabel(key), false, opts.limit);
      });
    }

    Object.keys(buckets).forEach(function(key) {
      if (!used.has(key)) pushSection(key, formatSectionTitle(key), isLargeNodeCategory(viewer), opts.limit);
    });

    return sections;
  }

  function formatSectionTitle(key) {
    const map = {
      creatures: "Creatures & monsters",
      items: "Items & drops",
      locations: "Locations & areas",
      discoveries: "Related discoveries",
      observed_in: "Observed at",
      located_in: "Areas & biomes",
      found_in: "Found in",
      drops: "Drops & related items",
      dropped_by: "Dropped by",
      related_discovery: "Related discoveries",
    };
    return map[key] || formatLabel(key);
  }

  function buildRelationHref(rel) {
    if (!rel) return "";
    if (rel.slug) return "/wiki/post/?slug=" + encodeURIComponent(rel.slug);
    if (rel.id) return "/wiki/post/?id=" + encodeURIComponent(rel.id);
    return "";
  }

  function renderRelationMetaLine(rel) {
    const parts = [];
    parts.push(getRelationLabel(rel.relation_type));
    if (rel.confidence) parts.push("Confidence " + Math.round(rel.confidence) + "%");
    if (rel.source_post_title) parts.push("via " + rel.source_post_title);
    else if (rel.source_post_slug) parts.push("via discovery");
    if (rel.report_count > 1) parts.push(rel.report_count + " reports");
    if (rel.source_date) {
      try {
        parts.push(new Date(rel.source_date).toLocaleDateString());
      } catch (err) { /* ignore */ }
    }
    return parts.join(" Â· ");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderKnowledgeGraphHtml(sections, options) {
    const opts = options || {};
    if (!sections || !sections.length) return "";
    let html = '<div class="bl-kg-graph">';
    if (opts.stubBadge) {
      html += '<div class="bl-kg-stub-badge">' + escapeHtml(opts.stubBadge) + '</div>';
    }
    sections.forEach(function(section) {
      const wrapTag = section.collapsible ? "details" : "div";
      const openAttr = section.collapsible && section.items.length <= 4 ? " open" : "";
      html += "<" + wrapTag + ' class="bl-kg-section"' + (section.collapsible ? openAttr : "") + ">";
      if (section.collapsible) {
        html += '<summary class="bl-kg-section-title">' + escapeHtml(section.title) +
          (section.total ? ' <span class="bl-kg-count">(' + section.total + ")</span>" : "") +
          "</summary>";
      } else {
        html += '<h4 class="bl-kg-section-title">' + escapeHtml(section.title) + "</h4>";
      }
      html += '<ul class="bl-kg-list">';
      section.items.forEach(function(rel) {
        const href = buildRelationHref(rel);
        const typeLabel = formatLabel(rel.target_entity_type || rel.group || "entry");
        const meta = renderRelationMetaLine(rel);
        html += '<li class="bl-kg-row">';
        html += '<div class="bl-kg-row-main">';
        html += href
          ? '<a class="bl-kg-link" href="' + escapeHtml(href) + '">' + escapeHtml(
            typeof EntityCore !== "undefined" ? EntityCore.getRelationDisplayName(rel) : (rel.canonical_target_name || rel.title)
          ) + "</a>"
          : '<span class="bl-kg-link">' + escapeHtml(
            typeof EntityCore !== "undefined" ? EntityCore.getRelationDisplayName(rel) : (rel.canonical_target_name || rel.title)
          ) + "</span>";
        html += '<span class="bl-kg-type">' + escapeHtml(typeLabel) + "</span>";
        html += "</div>";
        if (meta) html += '<div class="bl-kg-meta">' + escapeHtml(meta) + "</div>";
        html += "</li>";
      });
      html += "</ul>";
      if (section.hasMore) {
        html += '<p class="bl-kg-more">Showing ' + section.items.length + " of " + section.total + " linked entries.</p>";
      }
      html += "</" + wrapTag + ">";
    });
    html += "</div>";
    return html;
  }

  function buildStubDiscoveryPayload(relation, sourceContext) {
    const ctx = sourceContext || {};
    const payload = ctx.payload && typeof ctx.payload === "object" ? Object.assign({}, ctx.payload) : {};
    const relType = normalizeRelationType(relation.relation_type);
    const category = relation.category || mapGroupToCategory(relation.group, relation);
    const title = meaningfulValue(relation.title);
    let canonical = title;
    if (typeof EntityCore !== "undefined") {
      canonical = EntityCore.extractCanonicalIdentity(title, category).canonical_name || title;
    }

    const out = {
      entity_name: canonical,
      discovery_type: inferDiscoveryTypeForCategory(category, relType),
      region_name: meaningfulValue(payload.region_name) || "",
      found_in: meaningfulValue(payload.found_in) || "",
      confidence_level: "2-single-observation",
      impact_area: "gameplay",
      notes: "Auto-created related entry (" + getRelationLabel(relType) + ").",
    };

    if (meaningfulValue(payload.world_name)) out.world_name = payload.world_name;

    if (typeof EntityCore !== "undefined") {
      const parsed = EntityCore.parseTitleContext(title);
      if (parsed.biome_hint && !out.region_name) out.region_name = parsed.biome_hint;
      if (parsed.location_hint && !out.found_in) out.found_in = parsed.location_hint;
    }

    if (category === "items") {
      out.source_type = relType === "drops" || relType === "dropped_by" ? "creature-drop" : "unknown";
      if (ctx.sourceTitle && (relType === "dropped_by" || relType === "drops")) {
        out.dropped_by = ctx.sourceTitle;
      }
      if (payload.found_in) out.found_in = payload.found_in;
      if (payload.region_name) out.region_name = payload.region_name;
    }

    if (category === "creatures") {
      out.time_of_day = payload.time_of_day || "unknown";
      out.weather_condition = payload.weather_condition || "unknown";
      out.mountable = payload.mountable || "unknown";
      out.combat_outcome = payload.combat_outcome || "unknown";
      if (payload.found_in) out.found_in = payload.found_in;
      if (payload.dropped_items && relType === "drops") out.dropped_items = title;
    }

    if (category === "biomes" || category === "locations") {
      out.found_in = meaningfulValue(payload.region_name) || meaningfulValue(payload.found_in) || title;
      if (payload.biome_context) out.biome_context = payload.biome_context;
      if (payload.climate) out.climate = payload.climate;
    }

    return out;
  }

  function inferDiscoveryTypeForCategory(category, relationType) {
    const cat = String(category || "").toLowerCase();
    if (cat === "items") return relationType === "drops" ? "weapon" : "item";
    if (cat === "creatures") return "monster";
    if (cat === "biomes") return "biome";
    if (cat === "locations") return "landmark";
    return "other";
  }

  function buildKnowledgeEntryMeta(relation, sourceContext) {
    const relType = normalizeRelationType(relation.relation_type);
    const missing = evaluateMissingFields(relation, sourceContext);
    return {
      status: missing.length ? "needs_details" : "partial",
      auto_created: true,
      completeness: missing.length ? "stub" : "partial",
      source_post_id: sourceContext.sourcePostId || null,
      source_post_slug: sourceContext.sourcePostSlug || null,
      source_post_title: sourceContext.sourceTitle || null,
      source_relation_type: relType,
      created_at: new Date().toISOString(),
      missing_fields: missing.slice(0, 12),
    };
  }

  function evaluateMissingFields(relation, sourceContext) {
    const category = relation.category || mapGroupToCategory(relation.group, relation);
    const questions = getFollowUpQuestions({
      title: relation.title,
      category: category,
      relation_type: relation.relation_type,
      payload: sourceContext && sourceContext.payload,
    });
    return questions.filter(function(q) { return q.priority === "high"; }).map(function(q) { return q.key; });
  }

  function buildStubPostContent(title, relation, sourceContext) {
    const relLabel = getRelationLabel(relation.relation_type);
    const sourceTitle = sourceContext && sourceContext.sourceTitle ? sourceContext.sourceTitle : "a discovery";
    const body = [
      '<section class="bl-kg-stub-head">',
      '<p class="bl-kg-stub-kicker">Knowledge Node</p>',
      "<h2>" + escapeHtml(title) + "</h2>",
      '<p class="bl-kg-stub-status">Status: <strong>Needs details</strong> Â· Linked from <em>' + escapeHtml(sourceTitle) + "</em></p>",
      "</section>",
      "<p>This entry was created automatically as <strong>" + escapeHtml(relLabel) + "</strong> while processing a community discovery.</p>",
      "<p>Core facts and source reference are stored in metadata. Admins can publish as a stub or enrich it later.</p>",
    ].join("");
    return body;
  }

  function buildSupplementalStubRelations(relation, sourceContext) {
    const ctx = sourceContext || {};
    const payload = ctx.payload && typeof ctx.payload === "object" ? ctx.payload : {};
    const category = String(relation.category || mapGroupToCategory(relation.group, relation) || "").toLowerCase();
    const extras = [];
    const foundIn = meaningfulValue(payload.found_in);
    const region = meaningfulValue(payload.region_name);

    if (category === "items") {
      if (foundIn) {
        extras.push(buildRelation({
          group: "locations",
          relation_type: "found_in",
          title: foundIn,
          target_entity_type: "location",
          category: "locations",
          auto_inferred: true,
          confidence: 84,
          direction: "inbound",
        }));
      }
      if (region && region.toLowerCase() !== String(foundIn || "").toLowerCase()) {
        extras.push(buildRelation({
          group: "locations",
          relation_type: "located_in",
          title: region,
          target_entity_type: region.split(/\s+/).length <= 3 ? "biome" : "location",
          category: region.split(/\s+/).length <= 3 ? "biomes" : "locations",
          auto_inferred: true,
          confidence: 78,
          direction: "inbound",
        }));
      }
    }

    return extras;
  }

  function buildStubPostMeta(relation, sourceContext) {
    const payload = buildStubDiscoveryPayload(relation, sourceContext);
    const knowledgeEntry = buildKnowledgeEntryMeta(relation, sourceContext);
    const inverseReady = createInverseRelation(relation, {
      id: sourceContext.sourcePostId,
      slug: sourceContext.sourcePostSlug,
      title: sourceContext.sourceTitle,
      category: sourceContext.sourceCategory,
      post_type: "discovery",
    });
    const graphRelations = mergeRelations(
      inverseReady ? [inverseReady] : [],
      buildSupplementalStubRelations(relation, sourceContext)
    );
    const meta = {
      discovery_payload: payload,
      knowledge_entry: knowledgeEntry,
      knowledge_graph: { relations: graphRelations },
      discovery_record_status: "stub",
    };
    if (typeof BoundLoreTestData !== "undefined" && BoundLoreTestData.shouldMarkAsTestData()) {
      meta.content_origin = BoundLoreTestData.ORIGIN_TEST;
    }
    if (typeof EntityCore !== "undefined") {
      const stubCategory = relation.category || mapGroupToCategory(relation.group, relation);
      const canonicalTitle = EntityCore.extractCanonicalIdentity(relation.title, stubCategory).canonical_name
        || meaningfulValue(relation.title);
      const pseudoPost = { title: canonicalTitle, category: stubCategory };
      meta.entity_profile = EntityCore.buildEntityProfile(pseudoPost, meta);
      meta.entity_taxonomy = meta.entity_profile.taxonomy || null;
      if (meta.knowledge_entry) {
        meta.knowledge_entry.canonical_name = meta.entity_profile.canonical_name;
        meta.knowledge_entry.entity_key = meta.entity_profile.entity_key;
      }
      if (meta.discovery_payload && !meaningfulValue(meta.discovery_payload.entity_name)) {
        meta.discovery_payload.entity_name = canonicalTitle;
      }
    }
    return meta;
  }

  function normalizeKnowledgeMeta(meta) {
    if (!meta || typeof meta !== "object") return null;
    const out = {};
    if (meta.knowledge_entry && typeof meta.knowledge_entry === "object") {
      out.knowledge_entry = {
        status: String(meta.knowledge_entry.status || "needs_details").slice(0, 40),
        auto_created: !!meta.knowledge_entry.auto_created,
        completeness: String(meta.knowledge_entry.completeness || "stub").slice(0, 40),
        source_post_id: meta.knowledge_entry.source_post_id || null,
        source_post_slug: meta.knowledge_entry.source_post_slug ? String(meta.knowledge_entry.source_post_slug).slice(0, 160) : null,
        source_post_title: meta.knowledge_entry.source_post_title ? String(meta.knowledge_entry.source_post_title).slice(0, 140) : null,
        source_relation_type: meta.knowledge_entry.source_relation_type ? String(meta.knowledge_entry.source_relation_type).slice(0, 40) : null,
        created_at: meta.knowledge_entry.created_at ? String(meta.knowledge_entry.created_at).slice(0, 40) : null,
        missing_fields: Array.isArray(meta.knowledge_entry.missing_fields)
          ? meta.knowledge_entry.missing_fields.slice(0, 12).map(function(v) { return String(v).slice(0, 60); })
          : [],
      };
    }
    if (meta.knowledge_graph && Array.isArray(meta.knowledge_graph.relations)) {
      out.knowledge_graph = {
        relations: meta.knowledge_graph.relations.slice(0, 60).map(function(rel) {
          return sanitizeRelationForMeta(rel);
        }).filter(function(rel) { return !!rel.title; }),
      };
    }
    return Object.keys(out).length ? out : null;
  }

  function sanitizeRelationForMeta(rel) {
    const built = buildRelation(rel);
    const category = built.category || built.group || "";
    let canonical = built.title;
    let entityKey = null;
    if (typeof EntityCore !== "undefined") {
      canonical = EntityCore.extractCanonicalIdentity(built.title, category).canonical_name || built.title;
      entityKey = EntityCore.buildEntityKey(category, canonical);
    }
    return {
      group: String(built.group || "").slice(0, 40),
      relation_type: String(built.relation_type || "related_discovery").slice(0, 40),
      title: String(built.title || "").slice(0, 140),
      canonical_target_name: String(canonical || "").slice(0, 140),
      target_entity_key: entityKey ? String(entityKey).slice(0, 160) : null,
      id: built.id || null,
      slug: built.slug ? String(built.slug).slice(0, 160) : null,
      category: built.category ? String(built.category).slice(0, 60) : null,
      post_type: built.post_type ? String(built.post_type).slice(0, 40) : null,
      target_entity_type: built.target_entity_type ? String(built.target_entity_type).slice(0, 40) : null,
      confidence: Number.isFinite(Number(built.confidence)) ? Math.max(0, Math.min(100, Number(built.confidence))) : null,
      auto_inferred: !!built.auto_inferred,
      resolved: !!built.resolved,
      visibility: built.visibility ? String(built.visibility).slice(0, 20) : null,
      source_post_id: built.source_post_id || null,
      source_post_slug: built.source_post_slug ? String(built.source_post_slug).slice(0, 160) : null,
      source_post_title: built.source_post_title ? String(built.source_post_title).slice(0, 140) : null,
      source_date: built.source_date ? String(built.source_date).slice(0, 40) : null,
      report_count: Number.isFinite(Number(built.report_count)) ? Math.max(1, Number(built.report_count)) : 1,
      direction: built.direction ? String(built.direction).slice(0, 20) : "outbound",
    };
  }

  function getFollowUpQuestions(entry) {
    const data = entry || {};
    const category = String(data.category || mapGroupToCategory(data.group, data) || "").toLowerCase();
    const payload = data.payload && typeof data.payload === "object" ? data.payload : {};
    const questions = [];

    function q(key, label, reason, priority, optional) {
      questions.push({ key: key, label: label, reason: reason, priority: priority || "medium", optional: !!optional });
    }

    if (category === "items") {
      if (!meaningfulValue(payload.source_type) && !meaningfulValue(payload.how_obtained)) {
        q("source_type", "How was it obtained?", "Helps classify whether this item is a drop, quest reward, or find.", "high");
      }
      if (!meaningfulValue(payload.dropped_by)) {
        q("dropped_by", "Dropped by which creature or source?", "Links this item to its drop source in the knowledge graph.", "high");
      }
      if (!meaningfulValue(payload.item_effect)) {
        q("item_effect", "What does it do?", "Players use this to understand item value.", "medium", true);
      }
      if (!meaningfulValue(payload.found_in)) {
        q("found_in", "Where was it found?", "Improves location links for this item.", "medium", true);
      }
      q("repeatable", "Is the drop repeatable?", "Useful for farming routes.", "low", true);
    } else if (category === "creatures") {
      if (!meaningfulValue(payload.found_in)) {
        q("found_in", "Where exactly was it observed?", "Pins this creature to a concrete location.", "high");
      }
      if (!meaningfulValue(payload.dropped_items)) {
        q("dropped_items", "What did it drop?", "Creates item links for loot tables.", "high");
      }
      if (!meaningfulValue(payload.spawn_conditions)) {
        q("spawn_conditions", "Spawn conditions?", "Time, weather, or trigger details help other players.", "medium", true);
      }
      if (!meaningfulValue(payload.time_of_day)) {
        q("time_of_day", "Time of day?", "Useful spawn context.", "low", true);
      }
      if (!meaningfulValue(payload.confidence_level)) {
        q("confidence_level", "How confident are you?", "Helps moderators prioritize verification.", "medium", true);
      }
    } else if (category === "biomes" || category === "locations") {
      if (!meaningfulValue(payload.region_name)) {
        q("region_name", "Region / zone?", "Places this area in the world map hierarchy.", "high");
      }
      if (!meaningfulValue(payload.resources_or_rewards)) {
        q("resources_or_rewards", "What can be found there?", "Builds the area's known loot/spawn list.", "medium", true);
      }
      if (!meaningfulValue(payload.coordinates)) {
        q("coordinates", "Coordinates or navigation hint?", "Optional but very helpful for explorers.", "low", true);
      }
    } else {
      q("notes", "Anything else worth recording?", "Optional context for moderators.", "low", true);
    }

    return questions
      .filter(function(item, index, arr) {
        return arr.findIndex(function(other) { return other.key === item.key; }) === index;
      })
      .slice(0, 5);
  }

  function collectFollowUpTargets(relations, sourceContext) {
    const targets = [];
    const seen = new Set();
    (Array.isArray(relations) ? relations : []).forEach(function(rel) {
      if (!rel || !rel.auto_inferred) return;
      const category = rel.category || mapGroupToCategory(rel.group, rel);
      const key = String(category || "") + "|" + normalizeTitleKey(rel.title);
      if (seen.has(key)) return;
      seen.add(key);
      const questions = getFollowUpQuestions({
        title: rel.title,
        category: category,
        group: rel.group,
        relation_type: rel.relation_type,
        payload: buildStubDiscoveryPayload(rel, sourceContext),
      });
      if (!questions.length) return;
      targets.push({
        title: rel.title,
        category: category,
        relation_type: rel.relation_type,
        id: rel.id || null,
        slug: rel.slug || null,
        questions: questions,
        reward_hook: {
          event: "knowledge_followup_answered",
          entity_key: key,
          points_candidate: questions.filter(function(q) { return !q.optional; }).length * 5,
        },
      });
    });
    return targets.slice(0, 4);
  }

  function applyFollowUpAnswersToPayload(payload, answers) {
    const out = Object.assign({}, payload || {});
    Object.keys(answers || {}).forEach(function(key) {
      const value = meaningfulValue(answers[key]);
      if (value) out[key] = value;
    });
    return out;
  }

  async function appendInboundRelationToPost(client, targetPostId, inboundRel) {
    if (!client || !targetPostId || !inboundRel || !inboundRel.title) return { ok: false };

    const { data: targetPost, error } = await client
      .from("posts")
      .select("id, content, category")
      .eq("id", targetPostId)
      .maybeSingle();
    if (error || !targetPost) return { ok: false, reason: "target_not_found" };

    const meta = parseMetaFromHtml(targetPost.content || "");
    const graph = meta.knowledge_graph && Array.isArray(meta.knowledge_graph.relations)
      ? meta.knowledge_graph.relations
      : [];
    const normalized = buildRelation(Object.assign({}, inboundRel, {
      direction: "inbound",
      visibility: getTargetProminence(inboundRel.relation_type, targetPost.category),
    }));
    const merged = mergeRelations(graph, [normalized]);
    meta.knowledge_graph = { relations: merged };

    if (!meta.knowledge_entry) {
      meta.knowledge_entry = {
        status: "partial",
        auto_created: false,
        completeness: "partial",
      };
    }

    const updatedContent = injectMetaIntoHtml(targetPost.content || "", meta);
    const { error: updateError } = await client
      .from("posts")
      .update({ content: updatedContent })
      .eq("id", targetPostId);
    return { ok: !updateError };
  }

  function parseMetaFromHtml(html) {
    let meta = {};
    const match = String(html || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && typeof parsed === "object") meta = parsed;
      } catch (err) { /* keep empty meta */ }
    }
    return reconstructDiscoveryMetaFromHtml(html, meta);
  }

  // LEGACY/TEST-DATA FALLBACK ONLY.
  // Older discovery posts stored their payload only as rendered
  // "Structured Findings" HTML, without discovery_payload in BLMETA.
  // New posts always persist structured data in BLMETA at create/edit time
  // (see create-post.js / edit-post.js) and must never rely on this parser.
  // Reconstruction runs ONLY when structured data is missing; structured
  // BLMETA always wins and the two sources are never mixed per field group,
  // so no duplicate relations can result.
  const DISCOVERY_LABEL_KEY_FALLBACKS = {
    "reproduction steps": "how_to_reproduce",
    "name of the discovered entity (item/npc/location/etc.)": "entity_name",
    "creature / npc name": "entity_name",
    "item name": "entity_name",
    "location name": "entity_name",
    "biome name": "entity_name",
    "dropped items / loot": "dropped_items",
    "loot / rewards observed (optional)": "loot_or_rewards",
    "where found": "found_in",
    "region / zone": "region_name",
    "world": "world_name",
    "biome / environment": "biome_context",
  };

  let discoveryLabelKeyMapCache = null;

  function buildDiscoveryLabelKeyMap() {
    if (discoveryLabelKeyMapCache) return discoveryLabelKeyMapCache;
    const map = {};
    function addFields(schema) {
      if (!schema || !Array.isArray(schema.fields)) return;
      schema.fields.forEach(function(field) {
        if (!field || !field.key || !field.label) return;
        map[normalizeTitleKey(field.label)] = field.key;
      });
    }
    if (typeof BOUNDLORE_DISCOVERY_SCHEMA_DEFAULT !== "undefined") {
      addFields(BOUNDLORE_DISCOVERY_SCHEMA_DEFAULT);
    }
    if (typeof BOUNDLORE_DISCOVERY_SCHEMA_BY_CATEGORY !== "undefined") {
      Object.keys(BOUNDLORE_DISCOVERY_SCHEMA_BY_CATEGORY).forEach(function(cat) {
        addFields(BOUNDLORE_DISCOVERY_SCHEMA_BY_CATEGORY[cat]);
      });
    }
    Object.keys(DISCOVERY_LABEL_KEY_FALLBACKS).forEach(function(label) {
      map[normalizeTitleKey(label)] = DISCOVERY_LABEL_KEY_FALLBACKS[label];
    });
    discoveryLabelKeyMapCache = map;
    return map;
  }

  function reconstructDiscoveryMetaFromHtml(html, meta) {
    const base = meta && typeof meta === "object" ? meta : {};
    const hasPayload = base.discovery_payload && typeof base.discovery_payload === "object"
      && Object.keys(base.discovery_payload).length > 0;
    const hasRelations = Array.isArray(base.discovery_relations) && base.discovery_relations.length > 0;
    if (hasPayload && hasRelations) return base;
    const text = String(html || "");
    if (!/Structured Findings|Related Entries/i.test(text)) return base;
    if (typeof document === "undefined") return base;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = text;
    const labelMap = buildDiscoveryLabelKeyMap();
    const payload = {};
    const relations = [];

    wrapper.querySelectorAll("h3").forEach(function(heading) {
      const title = normalizeTitleKey(heading.textContent || "");
      const list = heading.nextElementSibling && heading.nextElementSibling.tagName === "UL"
        ? heading.nextElementSibling
        : null;
      if (!list) return;

      if (title === "structured findings") {
        list.querySelectorAll("li").forEach(function(li) {
          const strong = li.querySelector("strong");
          if (!strong) return;
          const label = String(strong.textContent || "").replace(/:\s*$/, "").trim();
          const key = labelMap[normalizeTitleKey(label)];
          if (!key) return;
          const clone = li.cloneNode(true);
          const cloneStrong = clone.querySelector("strong");
          if (cloneStrong) cloneStrong.remove();
          const value = String(clone.textContent || "").replace(/^:?\s*/, "").trim();
          if (value && payload[key] === undefined) payload[key] = value;
        });
      } else if (title === "related entries") {
        list.querySelectorAll("li").forEach(function(li) {
          const strong = li.querySelector("strong");
          const link = li.querySelector("a");
          const relType = strong ? String(strong.textContent || "").replace(/:\s*$/, "").trim() : "";
          let relTitle = "";
          if (link) {
            relTitle = String(link.textContent || "").trim();
          } else {
            const clone = li.cloneNode(true);
            const cloneStrong = clone.querySelector("strong");
            if (cloneStrong) cloneStrong.remove();
            relTitle = String(clone.textContent || "").replace(/^:?\s*/, "").trim();
          }
          if (!relTitle) return;
          let slug = null;
          if (link) {
            const m = String(link.getAttribute("href") || "").match(/slug=([^&]+)/);
            if (m) slug = decodeURIComponent(m[1]);
          }
          relations.push(buildRelation({
            relation_type: relType || "related_discovery",
            title: relTitle,
            slug: slug,
            auto_inferred: false,
          }));
        });
      }
    });

    const out = Object.assign({}, base);
    if (!hasPayload && Object.keys(payload).length) {
      out.discovery_payload = payload;
      // Provenance marker: this meta was rebuilt from legacy HTML at runtime.
      // The admin repair tool uses it to persist the data back into BLMETA.
      out.discovery_meta_source = "html_reconstruction";
    }
    if (!hasRelations && relations.length) {
      out.discovery_relations = relations;
      out.discovery_meta_source = "html_reconstruction";
    }
    return out;
  }

  // Raw BLMETA parse without the legacy HTML fallback. Used to check what is
  // actually persisted in the database (e.g. by the admin repair tool).
  function parseRawMetaFromHtml(html) {
    const match = String(html || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
    if (!match) return {};
    try {
      const parsed = JSON.parse(match[1]);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function injectMetaIntoHtml(html, meta) {
    const cleaned = String(html || "").replace(/<!--BLMETA\s+[\s\S]*?-->/gi, "").trim();
    const json = JSON.stringify(meta).replace(/-->/g, "--\\>");
    return cleaned + "\n<!--BLMETA " + json + " -->";
  }

  function dedupeRelationsForDisplay(relations) {
    const out = [];
    const seen = new Set();
    (Array.isArray(relations) ? relations : []).forEach(function(rel) {
      const built = buildRelation(rel);
      if (!built.title) return;
      if (typeof EntityCore !== "undefined") {
        Object.assign(built, EntityCore.enrichRelation(built));
      }
      const key = dedupeKeyForRelation(built);
      if (seen.has(key)) return;
      seen.add(key);
      out.push(built);
    });
    return out;
  }

  function relationsFromDiscoveryPost(post, postMeta) {
    const payload = postMeta && postMeta.discovery_payload ? postMeta.discovery_payload : {};
    const base = Array.isArray(postMeta && postMeta.discovery_relations) ? postMeta.discovery_relations.slice() : [];
    const enriched = appendAutoRelations(base, payload, post && post.category, {
      sourcePostId: post && post.id,
      sourcePostSlug: post && post.slug,
      sourceTitle: meaningfulValue(payload.entity_name) || (post && post.title) || "",
      sourceCategory: post && post.category,
      payload: payload,
    });
    return dedupeRelationsForDisplay(enriched.map(function(rel) {
      return buildRelation(Object.assign({}, rel, {
        source_post_id: rel.source_post_id || (post && post.id) || null,
        source_post_slug: rel.source_post_slug || (post && post.slug) || null,
        source_post_title: rel.source_post_title || (post && post.title) || null,
        source_date: rel.source_date || (post && post.created_at) || null,
      }));
    }));
  }

  function collectEntityRelations(post, postMeta) {
    const graph = postMeta && postMeta.knowledge_graph && Array.isArray(postMeta.knowledge_graph.relations)
      ? postMeta.knowledge_graph.relations
      : [];
    const stored = postMeta && Array.isArray(postMeta.discovery_relations) ? postMeta.discovery_relations : [];
    const payload = postMeta && postMeta.discovery_payload ? postMeta.discovery_payload : {};
    const fromPayload = [];

    if (post && payload && Object.keys(payload).length) {
      const isDiscovery = post.post_type === "discovery";
      appendAutoRelations(fromPayload, payload, post.category, {
        sourcePostId: isDiscovery
          ? post.id
          : (postMeta.knowledge_entry && postMeta.knowledge_entry.source_post_id),
        sourcePostSlug: isDiscovery
          ? post.slug
          : (postMeta.knowledge_entry && postMeta.knowledge_entry.source_post_slug),
        sourceTitle: meaningfulValue(payload.entity_name) || (post && post.title),
        sourceCategory: post.category,
        payload: payload,
      });
    }

    return dedupeRelationsForDisplay(mergeRelations(mergeRelations(graph, stored), fromPayload).map(function(rel) {
      return buildRelation(rel);
    }));
  }

  function inferRelationsFromPayloadForApproval(payload, category) {
    const temp = [];
    appendAutoRelations(temp, payload, category, {});
    return temp;
  }

  function evaluateKnowledgeEntryApproval(post, meta) {
    const issues = [];
    const warnings = [];
    const knowledge = meta && meta.knowledge_entry;
    const payload = meta && meta.discovery_payload;
    if (!post || !post.title) issues.push("Missing entry title.");
    if (!meaningfulValue(payload && payload.entity_name) && !meaningfulValue(post.title)) {
      issues.push("Missing entity name.");
    }
    const hasSource = !!(knowledge && (knowledge.source_post_id || knowledge.source_post_slug));
    const graph = meta && meta.knowledge_graph && Array.isArray(meta.knowledge_graph.relations) ? meta.knowledge_graph.relations : [];
    if (!hasSource && !graph.length) {
      issues.push("Missing source discovery reference.");
    }
    if (knowledge && Array.isArray(knowledge.missing_fields) && knowledge.missing_fields.length) {
      warnings.push("Incomplete stub â€” optional fields: " + knowledge.missing_fields.join(", ") + ".");
    }
    return {
      ok: issues.length === 0,
      issues: issues,
      warnings: warnings,
      mode: "knowledge_stub",
      allowIncomplete: true,
    };
  }

  async function findExistingKnowledgePost(client, title, category) {
    if (!client || !title || !category) return null;
    const normalizedTitle = String(title).trim();
    let canonical = normalizedTitle;
    let entityKey = null;
    if (typeof EntityCore !== "undefined") {
      const identity = EntityCore.extractCanonicalIdentity(normalizedTitle, category);
      canonical = identity.canonical_name || normalizedTitle;
      entityKey = EntityCore.buildEntityKey(category, canonical);
    }
    const canonicalKey = normalizeTitleKey(canonical);
    if (!canonicalKey) return null;

    let query = client
      .from("posts")
      .select("id, slug, title, category, post_type, content")
      .eq("category", category)
      .limit(40);

    if (category === "guides") {
      query = client
        .from("posts")
        .select("id, slug, title, category, post_type, content")
        .eq("post_type", "guide")
        .limit(40);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) return null;
    let match = data.find(function(row) {
      if (typeof EntityCore !== "undefined" && EntityCore.titlesMatchEntity(row, canonical, entityKey)) {
        return true;
      }
      if (normalizeTitleKey(row.title) === canonicalKey) return true;
      if (typeof EntityCore !== "undefined") {
        const rowCanonical = EntityCore.extractCanonicalIdentity(row.title, category).canonical_name;
        return normalizeTitleKey(rowCanonical) === canonicalKey;
      }
      return false;
    }) || null;

    if (!match && category === "biomes") {
      const { data: locationRows } = await client
        .from("posts")
        .select("id, slug, title, category, post_type, content")
        .eq("category", "locations")
        .limit(60);
      if (Array.isArray(locationRows)) {
        match = locationRows.find(function(row) {
          const meta = parseMetaFromHtml(row.content || "");
          if (typeof EntityCore !== "undefined" && !EntityCore.shouldIncludeInBiomeList(row, meta)) {
            return false;
          }
          return typeof EntityCore !== "undefined" && EntityCore.titlesMatchEntity(row, canonical, entityKey);
        }) || null;
      }
    }

    return match;
  }

  function safeParseMeta(html) {
    return parseMetaFromHtml(html);
  }

  // ---------------------------------------------------------
  // Contribution handling (additions to existing wiki entries)
  // ---------------------------------------------------------

  function isContributionPost(post, meta) {
    const m = meta || (post ? parseMetaFromHtml(post.content || "") : {});
    if (m && m.contribution && typeof m.contribution === "object") return true;
    if (m && m.discovery_record_status === "contribution") return true;
    if (m && m.contribution_intent) return true;
    if (m && m.discovery_payload && m.discovery_payload.contribution_intent) return true;
    if (post && /^contribution-/i.test(String(post.slug || ""))) return true;
    if (post && /^Contribution:/i.test(String(post.title || ""))) return true;
    return false;
  }

  function getContributionInfo(post, meta) {
    const m = meta || (post ? parseMetaFromHtml(post.content || "") : {});
    const block = m.contribution && typeof m.contribution === "object" ? m.contribution : {};
    const payload = m.discovery_payload && typeof m.discovery_payload === "object" ? m.discovery_payload : {};
    return {
      target_post_id: block.target_post_id || null,
      target_post_slug: block.target_post_slug || m.contribution_target || null,
      target_title: block.target_title || meaningfulValue(payload.entity_name) || "",
      target_category: block.target_category || (post && post.category) || "",
      entity_key: block.entity_key || null,
      intent: block.intent || m.contribution_intent || payload.contribution_intent || "add_info",
      missing_field: block.missing_field || m.contribution_field || null,
      submitted_fields: block.submitted_fields && typeof block.submitted_fields === "object" ? block.submitted_fields : {},
      status: block.status || "pending_review",
      evidence: Array.isArray(m.discovery_evidence) ? m.discovery_evidence : [],
      relations: Array.isArray(m.discovery_relations) ? m.discovery_relations : [],
      payload: payload,
    };
  }

  async function resolveContributionTargetPost(client, post, meta) {
    if (!client) return null;
    const info = getContributionInfo(post, meta);
    const fields = "id, slug, title, category, post_type, content, status, deleted_at";

    if (info.target_post_id) {
      const { data } = await client.from("posts").select(fields).eq("id", info.target_post_id).maybeSingle();
      if (data && !data.deleted_at) return data;
    }
    if (info.target_post_slug) {
      const { data } = await client.from("posts").select(fields).eq("slug", info.target_post_slug).maybeSingle();
      if (data && !data.deleted_at) return data;
    }
    // Last resort: resolve by canonical entity name + category, never by loose title match.
    if (info.target_title && info.target_category) {
      const { data } = await client
        .from("posts")
        .select(fields)
        .eq("status", "published")
        .is("deleted_at", null)
        .eq("category", info.target_category)
        .limit(50);
      const wanted = normalizeTitleKey(info.target_title);
      const match = (data || []).find(function(row) {
        if (isContributionPost(row)) return false;
        if (typeof EntityCore !== "undefined") {
          return EntityCore.titlesMatchEntity(row, info.target_title, info.entity_key);
        }
        return normalizeTitleKey(row.title) === wanted;
      });
      if (match) return match;
    }
    return null;
  }

  // Fields that a contribution may fill on the target payload if still unknown.
  const CONTRIBUTION_MERGE_FIELDS = [
    "damage", "scaling_power", "durability", "stat_conditions",
    "item_effect", "how_tested", "dropped_by", "found_in", "region_name",
    "behavior", "behavior_conditions", "time_weather", "spawn_conditions",
  ];

  async function mergeContributionIntoTarget(client, contributionPost, options) {
    const opts = options || {};
    if (!client || !contributionPost) return { ok: false, reason: "Contribution post missing" };
    const meta = opts.meta || parseMetaFromHtml(contributionPost.content || "");
    if (!isContributionPost(contributionPost, meta)) {
      return { ok: false, reason: "Post is not a contribution" };
    }
    const info = getContributionInfo(contributionPost, meta);
    const targetPost = opts.targetPost || await resolveContributionTargetPost(client, contributionPost, meta);
    if (!targetPost) return { ok: false, reason: "Target entry not found for contribution" };

    const targetMeta = parseMetaFromHtml(targetPost.content || "");
    const log = Array.isArray(targetMeta.contribution_log) ? targetMeta.contribution_log : [];
    if (log.some(function(entry) { return entry && entry.contribution_post_id === contributionPost.id; })) {
      return { ok: true, target: targetPost, alreadyMerged: true, conflicts: [] };
    }

    if (!targetMeta.discovery_payload || typeof targetMeta.discovery_payload !== "object") {
      targetMeta.discovery_payload = {};
    }
    const targetPayload = targetMeta.discovery_payload;
    const conflicts = [];
    const mergedFields = [];

    const sourceValues = Object.assign({}, info.payload, info.submitted_fields);
    CONTRIBUTION_MERGE_FIELDS.forEach(function(key) {
      const value = meaningfulValue(sourceValues[key]);
      if (!value) return;
      const existing = meaningfulValue(targetPayload[key]);
      if (!existing) {
        targetPayload[key] = value;
        mergedFields.push(key);
      } else if (normalizeTitleKey(existing) !== normalizeTitleKey(value)) {
        conflicts.push({ field: key, existing: existing, submitted: value });
      }
    });
    const notes = meaningfulValue(sourceValues.notes);
    if (notes) {
      const existingNotes = meaningfulValue(targetPayload.notes);
      if (!existingNotes) {
        targetPayload.notes = notes;
        mergedFields.push("notes");
      } else if (existingNotes.indexOf(notes) === -1) {
        targetPayload.notes = existingNotes + "\n\nCommunity addition: " + notes;
        mergedFields.push("notes");
      }
    }

    // Evidence: always additive, never overwrite. First image automatically
    // becomes the hero image if the target has none.
    let evidenceAdded = 0;
    if (info.evidence.length) {
      const targetEvidence = Array.isArray(targetMeta.discovery_evidence) ? targetMeta.discovery_evidence : [];
      const knownUrls = new Set(targetEvidence.map(function(e) { return e && e.url; }).filter(Boolean));
      info.evidence.forEach(function(item) {
        if (!item || !item.url || knownUrls.has(item.url)) return;
        knownUrls.add(item.url);
        targetEvidence.push(Object.assign({}, item, {
          contributed_by: contributionPost.author_id || null,
          contribution_post_id: contributionPost.id,
          contributed_at: contributionPost.created_at || new Date().toISOString(),
        }));
        evidenceAdded += 1;
      });
      targetMeta.discovery_evidence = targetEvidence;
    }

    if (info.relations.length) {
      const existingRelations = Array.isArray(targetMeta.discovery_relations) ? targetMeta.discovery_relations : [];
      targetMeta.discovery_relations = mergeRelations(existingRelations, info.relations).map(sanitizeRelationForMeta);
    }

    log.push({
      contribution_post_id: contributionPost.id,
      contribution_post_slug: contributionPost.slug || null,
      intent: info.intent,
      merged_fields: mergedFields,
      evidence_added: evidenceAdded,
      conflicts: conflicts,
      merged_at: new Date().toISOString(),
      merged_by: opts.actorId || null,
    });
    targetMeta.contribution_log = log;

    const updatedContent = injectMetaIntoHtml(targetPost.content || "", targetMeta);
    const { error } = await client.from("posts").update({ content: updatedContent }).eq("id", targetPost.id);
    if (error) return { ok: false, reason: error.message || "Target update failed" };

    return {
      ok: true,
      target: targetPost,
      mergedFields: mergedFields,
      evidenceAdded: evidenceAdded,
      conflicts: conflicts,
    };
  }

  async function findPendingContributionDuplicate(client, params) {
    if (!client || !params) return null;
    const query = client
      .from("posts")
      .select("id, slug, title, content, created_at")
      .eq("status", "pending")
      .is("deleted_at", null)
      .eq("author_id", params.authorId)
      .order("created_at", { ascending: false })
      .limit(30);
    const { data } = await query;
    return (data || []).find(function(row) {
      const meta = parseMetaFromHtml(row.content || "");
      if (!isContributionPost(row, meta)) return false;
      const info = getContributionInfo(row, meta);
      const sameTarget = (params.targetPostId && info.target_post_id === params.targetPostId)
        || (params.targetPostSlug && info.target_post_slug === params.targetPostSlug);
      return sameTarget && info.intent === params.intent;
    }) || null;
  }

  // Canonical BLMETA serializer used by create-post and edit-post.
  // Must preserve every structured field the entity/relation pipeline needs.
  function serializePostMetaForStorage(meta) {
    if (!meta || typeof meta !== "object") return null;
    const out = {};

    function setStr(key, value, max) {
      if (value == null || value === "") return;
      out[key] = String(value).slice(0, max || 500);
    }

    setStr("update_phase", meta.update_phase, 32);
    setStr("patch_tag", meta.patch_tag, 40);
    setStr("source_url", meta.source_url, 500);
    setStr("subcategory", meta.subcategory, 60);
    setStr("discovery_form", meta.discovery_form, 16);
    setStr("content_origin", meta.content_origin, 16);
    setStr("discovery_record_id", meta.discovery_record_id, 64);
    setStr("discovery_record_status", meta.discovery_record_status, 40);
    setStr("discovery_submitted_at", meta.discovery_submitted_at, 40);
    setStr("contribution_intent", meta.contribution_intent, 40);
    setStr("contribution_target", meta.contribution_target, 160);
    setStr("contribution_field", meta.contribution_field, 60);
    setStr("place_role", meta.place_role, 40);
    setStr("discovery_meta_repaired_at", meta.discovery_meta_repaired_at, 40);

    if (meta.discovery_payload && typeof meta.discovery_payload === "object") {
      const payload = {};
      Object.keys(meta.discovery_payload).forEach(function(key) {
        const value = meta.discovery_payload[key];
        if (value == null || value === "") return;
        if (typeof value === "number") payload[String(key).slice(0, 60)] = value;
        else payload[String(key).slice(0, 60)] = String(value).slice(0, 1400);
      });
      if (Object.keys(payload).length) out.discovery_payload = payload;
    }

    if (Array.isArray(meta.discovery_relations)) {
      out.discovery_relations = meta.discovery_relations.slice(0, 40).map(function(rel) {
        return sanitizeRelationForMeta(rel);
      }).filter(function(rel) { return !!rel.title; });
    }

    if (typeof meta.discovery_relations_skipped === "boolean") {
      out.discovery_relations_skipped = meta.discovery_relations_skipped;
    }

    if (Array.isArray(meta.discovery_evidence)) {
      out.discovery_evidence = meta.discovery_evidence.slice(0, 20).map(function(item) {
        return {
          kind: String(item.kind || "evidence").slice(0, 40),
          label: String(item.label || "Evidence").slice(0, 140),
          url: item.url ? String(item.url).slice(0, 600) : "",
          file_type: item.file_type ? String(item.file_type).slice(0, 80) : null,
          supports: Array.isArray(item.supports) ? item.supports.slice(0, 12).map(function(k) { return String(k).slice(0, 60); }) : [],
          note: item.note ? String(item.note).slice(0, 400) : "",
        };
      }).filter(function(item) { return !!item.url || !!item.label; });
    }

    if (meta.entity_profile && typeof meta.entity_profile === "object") {
      const ep = meta.entity_profile;
      out.entity_profile = {
        entity_key: String(ep.entity_key || "").slice(0, 160),
        canonical_name: String(ep.canonical_name || "").slice(0, 140),
        display_name: String(ep.display_name || "").slice(0, 140),
        context_title: String(ep.context_title || "").slice(0, 200),
        context_location: String(ep.context_location || "").slice(0, 200),
        category: String(ep.category || "").slice(0, 60),
        entity_type: String(ep.entity_type || "").slice(0, 40),
      slug: ep.slug ? String(ep.slug).slice(0, 160) : null,
      canonical_slug: ep.canonical_slug ? String(ep.canonical_slug).slice(0, 160) : null,
      slug_aliases: Array.isArray(ep.slug_aliases) ? ep.slug_aliases.slice(0, 8).map(function(a) { return String(a).slice(0, 160); }) : [],
      post_id: ep.post_id || null,
        status: String(ep.status || "").slice(0, 40),
        biome_primary: String(ep.biome_primary || "").slice(0, 120),
        location_context: String(ep.location_context || "").slice(0, 200),
        source_post_id: ep.source_post_id || null,
        source_post_slug: ep.source_post_slug ? String(ep.source_post_slug).slice(0, 160) : null,
        source_post_title: ep.source_post_title ? String(ep.source_post_title).slice(0, 140) : null,
        aliases: Array.isArray(ep.aliases) ? ep.aliases.slice(0, 8).map(function(a) { return String(a).slice(0, 80); }) : [],
      };
      if (ep.taxonomy && typeof ep.taxonomy === "object") {
        out.entity_profile.taxonomy = ep.taxonomy;
      }
    }

    if (meta.entity_taxonomy && typeof meta.entity_taxonomy === "object") {
      out.entity_taxonomy = meta.entity_taxonomy;
    }

    if (meta.contribution && typeof meta.contribution === "object") {
      const c = meta.contribution;
      out.contribution = {
        target_post_id: c.target_post_id || null,
        target_post_slug: c.target_post_slug ? String(c.target_post_slug).slice(0, 160) : null,
        target_title: c.target_title ? String(c.target_title).slice(0, 140) : null,
        target_category: c.target_category ? String(c.target_category).slice(0, 60) : null,
        target_entity_type: c.target_entity_type ? String(c.target_entity_type).slice(0, 40) : null,
        entity_key: c.entity_key ? String(c.entity_key).slice(0, 160) : null,
        intent: c.intent ? String(c.intent).slice(0, 40) : null,
        missing_field: c.missing_field ? String(c.missing_field).slice(0, 60) : null,
        source_page: c.source_page ? String(c.source_page).slice(0, 300) : null,
        status: c.status ? String(c.status).slice(0, 40) : "pending_review",
        confidence_level: c.confidence_level ? String(c.confidence_level).slice(0, 40) : null,
        created_from_existing_entry: !!c.created_from_existing_entry,
        submitted_at: c.submitted_at ? String(c.submitted_at).slice(0, 40) : null,
        merged_at: c.merged_at ? String(c.merged_at).slice(0, 40) : null,
        submitted_fields: c.submitted_fields && typeof c.submitted_fields === "object" ? c.submitted_fields : {},
      };
    }

    if (Array.isArray(meta.contribution_log)) {
      out.contribution_log = meta.contribution_log.slice(0, 30);
    }

    const knowledgeMeta = normalizeKnowledgeMeta(meta);
    if (knowledgeMeta) {
      if (knowledgeMeta.knowledge_entry) out.knowledge_entry = knowledgeMeta.knowledge_entry;
      if (knowledgeMeta.knowledge_graph) out.knowledge_graph = knowledgeMeta.knowledge_graph;
    }

    if (Array.isArray(meta.guide_references)) {
      out.guide_references = meta.guide_references.slice(0, 12).map(function(ref) {
        return {
          id: ref.id || null,
          slug: ref.slug ? String(ref.slug).slice(0, 160) : null,
          title: String(ref.title || "").slice(0, 140),
          category: ref.category ? String(ref.category).slice(0, 60) : null,
          post_type: ref.post_type ? String(ref.post_type).slice(0, 40) : null,
        };
      }).filter(function(ref) { return !!ref.title; });
    }

    return Object.keys(out).length ? out : null;
  }

  // Persist structured BLMETA for legacy posts that only have rendered HTML.
  // Idempotent: skips posts that already have full structured data.
  async function repairStructuredMetaForPosts(client, options) {
    const opts = options || {};
    if (!client) return { ok: false, reason: "Client missing", inspected: 0, repaired: 0, skipped: 0 };

    let query = client
      .from("posts")
      .select("id, slug, title, category, post_type, content, status")
      .is("deleted_at", null)
      .order("created_at", { ascending: true })
      .limit(opts.limit || 200);

    if (Array.isArray(opts.slugs) && opts.slugs.length) {
      query = query.in("slug", opts.slugs);
    } else if (opts.status) {
      query = query.eq("status", opts.status);
    }

    const { data: posts, error } = await query;
    if (error) return { ok: false, reason: error.message, inspected: 0, repaired: 0, skipped: 0 };

    let inspected = 0;
    let repaired = 0;
    let skipped = 0;
    const notes = [];

    for (let i = 0; i < (posts || []).length; i += 1) {
      const post = posts[i];
      inspected += 1;
      const raw = parseRawMetaFromHtml(post.content || "");
      const hasPayload = raw.discovery_payload && typeof raw.discovery_payload === "object"
        && Object.keys(raw.discovery_payload).length > 0;
      const hasRelations = Array.isArray(raw.discovery_relations) && raw.discovery_relations.length > 0;
      const needsEntityProfile = hasPayload && !(raw.entity_profile && raw.entity_profile.entity_key);
      const needsRelationCanon = hasRelations && raw.discovery_relations.some(function(rel) {
        return rel && rel.title && (!rel.canonical_target_name || !rel.target_entity_key);
      });

      if (hasPayload && hasRelations && !needsEntityProfile && !needsRelationCanon) {
        skipped += 1;
        continue;
      }

      const full = parseMetaFromHtml(post.content || "");
      const canPayload = !hasPayload && full.discovery_payload && Object.keys(full.discovery_payload).length > 0;
      const canRelations = !hasRelations && Array.isArray(full.discovery_relations) && full.discovery_relations.length > 0;

      if (!canPayload && !canRelations && !needsEntityProfile && !needsRelationCanon) {
        skipped += 1;
        continue;
      }

      const repairMeta = Object.assign({}, raw);
      if (canPayload) repairMeta.discovery_payload = full.discovery_payload;
      if (canRelations) {
        repairMeta.discovery_relations = full.discovery_relations.map(function(rel) {
          return sanitizeRelationForMeta(rel);
        });
      } else if (needsRelationCanon) {
        repairMeta.discovery_relations = raw.discovery_relations.map(function(rel) {
          return sanitizeRelationForMeta(rel);
        });
      }

      if (typeof EntityCore !== "undefined") {
        const normalized = EntityCore.normalizeEntityMeta(post, repairMeta, { repairPayload: true });
        Object.assign(repairMeta, normalized.meta);
        if (needsEntityProfile || !repairMeta.entity_profile) {
          repairMeta.entity_profile = EntityCore.buildEntityProfile(post, repairMeta);
          if (repairMeta.entity_profile && repairMeta.entity_profile.taxonomy) {
            repairMeta.entity_taxonomy = repairMeta.entity_profile.taxonomy;
          }
        }
      }

      if (typeof BoundLoreTestData !== "undefined" && BoundLoreTestData.shouldMarkAsTestData()) {
        repairMeta.content_origin = BoundLoreTestData.ORIGIN_TEST;
      }
      repairMeta.discovery_meta_repaired_at = new Date().toISOString();
      delete repairMeta.discovery_meta_source;

      const serialized = serializePostMetaForStorage(repairMeta);
      if (!serialized) {
        skipped += 1;
        notes.push(post.slug + ": nothing to serialize");
        continue;
      }

      const content = injectMetaIntoHtml(post.content || "", serialized);
      const { error: updateError } = await client.from("posts").update({ content: content }).eq("id", post.id);
      if (updateError) {
        skipped += 1;
        notes.push(post.slug + ": " + updateError.message);
        continue;
      }
      repaired += 1;
    }

    return { ok: true, inspected: inspected, repaired: repaired, skipped: skipped, notes: notes };
  }

  // Normalize discovery BLMETA immediately before admin approval / RPC sync.
  function prepareDiscoveryMetaForApproval(post, meta) {
    const repairMeta = Object.assign({}, meta || {});
    const payload = Object.assign({}, repairMeta.discovery_payload || {});
    let canonicalTitle = String(post && post.title || "").trim();

    if (typeof EntityCore !== "undefined") {
      const normalized = EntityCore.normalizeEntityMeta(post, repairMeta, { repairPayload: true });
      Object.assign(repairMeta, normalized.meta);
      Object.assign(payload, repairMeta.discovery_payload || {});

      const identity = EntityCore.extractCanonicalIdentity(
        meaningfulValue(payload.entity_name) || post.title,
        post.category,
        { payload: payload }
      );
      if (identity.canonical_name) {
        payload.entity_name = identity.canonical_name;
        canonicalTitle = identity.canonical_name;
      }

      let hint = meaningfulValue(payload.encounter_context)
        || meaningfulValue(payload.location_hint)
        || identity.location_hint
        || "";
      if (hint && /^in\s+(?:near|at|around|by|close to)\b/i.test(hint)) {
        hint = hint.replace(/^in\s+/i, "").trim();
      }
      if (hint) {
        payload.encounter_context = hint;
        payload.location_hint = hint;
        if (EntityCore.isVagueLocationHint(hint)) {
          if (meaningfulValue(payload.found_in) && EntityCore.isVagueLocationHint(payload.found_in)) {
            delete payload.found_in;
          }
        }
      }

      repairMeta.entity_profile = EntityCore.buildEntityProfile(
        Object.assign({}, post, { title: canonicalTitle }),
        Object.assign({}, repairMeta, { discovery_payload: payload })
      );
      if (repairMeta.entity_profile && repairMeta.entity_profile.taxonomy) {
        repairMeta.entity_taxonomy = repairMeta.entity_profile.taxonomy;
      }
    }

    if (typeof EntityCore !== "undefined" && EntityCore.applyCanonicalSlugMeta) {
      const slugRepair = EntityCore.applyCanonicalSlugMeta(post, repairMeta);
      Object.assign(repairMeta, slugRepair.meta);
      canonicalTitle = slugRepair.title || canonicalTitle;
    }

    repairMeta.discovery_payload = payload;

    if (Array.isArray(repairMeta.discovery_relations)) {
      repairMeta.discovery_relations = repairMeta.discovery_relations.map(function(rel) {
        const sanitized = sanitizeRelationForMeta(rel);
        sanitized.relation_type = normalizeRelationTypeForDbSync(sanitized.relation_type, sanitized.group);
        if (!sanitized.category && sanitized.group) {
          sanitized.category = mapGroupToCategory(String(sanitized.group).toLowerCase(), sanitized);
        }
        return sanitized;
      });
    }

    const serialized = serializePostMetaForStorage(repairMeta);
    const slugUpdate = repairMeta.entity_profile && repairMeta.entity_profile.canonical_slug
      ? repairMeta.entity_profile.canonical_slug
      : null;
    return {
      meta: serialized || repairMeta,
      title: canonicalTitle,
      slug: slugUpdate,
      previousSlug: (post && post.slug && slugUpdate && post.slug !== slugUpdate) ? post.slug : null,
    };
  }

  async function repairCanonicalEntitySlugsForPosts(client, options) {
    const opts = options || {};
    if (!client || typeof EntityCore === "undefined" || !EntityCore.applyCanonicalSlugMeta) {
      return { ok: false, reason: "Helpers missing", inspected: 0, repaired: 0, skipped: 0 };
    }

    let query = client
      .from("posts")
      .select("id, slug, title, category, post_type, content, status")
      .is("deleted_at", null)
      .eq("status", "published")
      .order("created_at", { ascending: true })
      .limit(opts.limit || 200);

    if (Array.isArray(opts.slugs) && opts.slugs.length) {
      query = query.in("slug", opts.slugs);
    } else {
      query = query.in("category", ["creatures", "items", "biomes", "locations"]);
    }

    const { data: posts, error } = await query;
    if (error) return { ok: false, reason: error.message, inspected: 0, repaired: 0, skipped: 0 };

    let inspected = 0;
    let repaired = 0;
    let skipped = 0;
    const notes = [];

    for (let i = 0; i < (posts || []).length; i += 1) {
      const post = posts[i];
      inspected += 1;
      const raw = parseRawMetaFromHtml(post.content || "");
      const repair = EntityCore.applyCanonicalSlugMeta(post, raw);
      const needsSlug = repair.slug && post.slug !== repair.slug;
      const needsTitle = repair.title && post.title !== repair.title;
      if (!needsSlug && !needsTitle) {
        skipped += 1;
        continue;
      }
      if (repair.slug && !EntityCore.slugLooksContextual(post.slug, repair.title) && !needsTitle) {
        skipped += 1;
        continue;
      }

      const serialized = serializePostMetaForStorage(repair.meta);
      const content = injectMetaIntoHtml(post.content || "", serialized || repair.meta);
      const update = { content: content };
      if (repair.title) update.title = repair.title;
      if (repair.slug) update.slug = repair.slug;

      const { error: updateError } = await client.from("posts").update(update).eq("id", post.id);
      if (updateError) {
        skipped += 1;
        notes.push(post.slug + ": " + updateError.message);
        continue;
      }
      repaired += 1;
    }

    return { ok: true, inspected: inspected, repaired: repaired, skipped: skipped, notes: notes };
  }

  return {
    RELATION_TYPES: RELATION_TYPES,
    normalizeRelationType: normalizeRelationType,
    getRelationLabel: getRelationLabel,
    appendAutoRelations: appendAutoRelations,
    mergeRelations: mergeRelations,
    buildRelation: buildRelation,
    createInverseRelation: createInverseRelation,
    shouldShowRelation: shouldShowRelation,
    groupRelationsForDisplay: groupRelationsForDisplay,
    renderKnowledgeGraphHtml: renderKnowledgeGraphHtml,
    buildStubPostMeta: buildStubPostMeta,
    buildStubPostContent: buildStubPostContent,
    buildStubDiscoveryPayload: buildStubDiscoveryPayload,
    normalizeKnowledgeMeta: normalizeKnowledgeMeta,
    sanitizeRelationForMeta: sanitizeRelationForMeta,
    getFollowUpQuestions: getFollowUpQuestions,
    collectFollowUpTargets: collectFollowUpTargets,
    applyFollowUpAnswersToPayload: applyFollowUpAnswersToPayload,
    appendInboundRelationToPost: appendInboundRelationToPost,
    dedupeRelationsForDisplay: dedupeRelationsForDisplay,
    relationEntityDedupeKey: relationEntityDedupeKey,
    countKnownEntitiesForViewer: countKnownEntitiesForViewer,
    relationsFromDiscoveryPost: relationsFromDiscoveryPost,
    collectEntityRelations: collectEntityRelations,
    inferRelationsFromPayloadForApproval: inferRelationsFromPayloadForApproval,
    evaluateKnowledgeEntryApproval: evaluateKnowledgeEntryApproval,
    findExistingKnowledgePost: findExistingKnowledgePost,
    safeParseMeta: safeParseMeta,
    parseRawMetaFromHtml: parseRawMetaFromHtml,
    normalizeTitleKey: normalizeTitleKey,
    mapGroupToCategory: mapGroupToCategory,
    inferTargetEntityType: inferTargetEntityType,
    buildRelationHref: buildRelationHref,
    isLargeNodeCategory: isLargeNodeCategory,
    resolveViewerCategory: resolveViewerCategory,
    meaningfulValue: meaningfulValue,
    dedupeKeyForRelation: dedupeKeyForRelation,
    shouldCreateKnowledgeStub: shouldCreateKnowledgeStub,
    fetchInboundRelations: fetchInboundRelations,
    relationTargetsEntity: relationTargetsEntity,
    isContributionPost: isContributionPost,
    getContributionInfo: getContributionInfo,
    resolveContributionTargetPost: resolveContributionTargetPost,
    mergeContributionIntoTarget: mergeContributionIntoTarget,
    findPendingContributionDuplicate: findPendingContributionDuplicate,
    serializePostMetaForStorage: serializePostMetaForStorage,
    repairStructuredMetaForPosts: repairStructuredMetaForPosts,
    normalizeRelationTypeForDbSync: normalizeRelationTypeForDbSync,
    prepareDiscoveryMetaForApproval: prepareDiscoveryMetaForApproval,
    repairCanonicalEntitySlugsForPosts: repairCanonicalEntitySlugsForPosts,
  };
})();
