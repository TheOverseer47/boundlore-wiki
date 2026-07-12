// ============================================
// Wiki entry detail layout: hero, classification,
// relations, missing fields, contribution CTAs
// ============================================

window.WikiEntryLayout = (function() {
  const WIKI_LAYOUT_CATEGORIES = ["items", "creatures", "locations", "biomes", "classes", "dungeons", "lore", "crafting"];
  const STUB_MARKERS = ["knowledge node", "auto-created related entry", "prepared automatically from a discovery relation"];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatLabel(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
      .trim();
  }

  function meaningful(value) {
    if (typeof KnowledgeRelations !== "undefined") {
      return KnowledgeRelations.meaningfulValue(value);
    }
    const clean = String(value || "").trim();
    const lower = clean.toLowerCase();
    if (!clean || ["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) {
      return "";
    }
    return clean;
  }

  function isWikiLayoutPost(post) {
    if (!post || post.post_type === "guide") return false;
    if (!WIKI_LAYOUT_CATEGORIES.includes(String(post.category || "").toLowerCase())) return false;
    // Contribution submissions are additions to an existing entry, never
    // standalone entity pages.
    if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.isContributionPost
      && KnowledgeRelations.isContributionPost(post)) {
      return false;
    }
    if (post.post_type === "discovery") {
      // Discovery reports that represent a canonical entity render as entity pages.
      return representsCanonicalEntity(post);
    }
    return true;
  }

  function representsCanonicalEntity(post) {
    if (!post) return false;
    const category = String(post.category || "").toLowerCase();
    if (!["items", "creatures", "biomes", "locations", "crafting"].includes(category)) return false;
    if (typeof EntityCore === "undefined") return false;
    const meta = typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.safeParseMeta
      ? KnowledgeRelations.safeParseMeta(post.content || "")
      : {};
    const payload = meta.discovery_payload || {};
    if (typeof EntityCore !== "undefined" && EntityCore.isResourceEntry(meta, post)) return true;
    if (typeof EntityCore !== "undefined" && EntityCore.isStationTypeEntry(meta, post)) return true;
    const canonical = EntityCore.extractCanonicalIdentity(post.title, category, { payload: payload }).canonical_name;
    return !!canonical;
  }

  function isStubEntry(post, meta) {
    if (!meta) return false;
    if (meta.knowledge_entry && meta.knowledge_entry.auto_created) return true;
    if (meta.discovery_record_status === "stub") return true;
    if (meta.knowledge_entry && meta.knowledge_entry.status === "needs_details") return true;
    const content = String(post && post.content || "").toLowerCase();
    return STUB_MARKERS.some(function(marker) { return content.includes(marker); });
  }

  function isStubBoilerplateContent(html) {
    const text = String(html || "").toLowerCase();
    if (!text.trim()) return true;
    return STUB_MARKERS.some(function(marker) { return text.includes(marker); })
      && text.length < 1200;
  }

  function buildContributionUrl(post, options) {
    const opts = options || {};
    const params = new URLSearchParams();
    params.set("mode", "contribution");
    params.set("type", "discovery");
    params.set("entity_type", post.category || "items");
    params.set("category", post.category || "items");
    if (post.slug) params.set("contribute_to", post.slug);
    else if (post.id) params.set("contribute_to", post.id);
    if (opts.intent) params.set("intent", opts.intent);
    if (opts.field) params.set("missing_field", opts.field);
    if (opts.relationTarget) params.set("relation_target", opts.relationTarget);
    const entityName = typeof EntityCore !== "undefined"
      ? EntityCore.getDisplayName(opts.meta || {}, post)
      : (post.title || "");
    if (entityName) params.set("entity", entityName);
    if (opts.related) params.set("related", opts.related);
    const sourcePage = opts.sourcePage
      || (typeof window !== "undefined" && window.location
        ? window.location.pathname + window.location.search
        : (post.slug ? "/wiki/post/?slug=" + encodeURIComponent(post.slug) : ""));
    if (sourcePage) params.set("source_page", sourcePage);
    return "/wiki/create-post/?" + params.toString();
  }

  function classifyItem(title, payload, relations) {
    const name = String(title || "").trim();
    const lower = name.toLowerCase();
    const out = {
      item_type: fieldUnknown("Item Type"),
      subtype: fieldUnknown("Subtype"),
      rarity: fieldFromPayload(payload, "rarity", "Rarity"),
      effect: fieldFromPayload(payload, "item_effect", "Effect / Use"),
      stats: fieldUnknown("Damage / Stats"),
      how_obtain: fieldFromPayload(payload, "source_type", "How to Obtain", formatLabel),
      dropped_by: fieldUnknown("Dropped By"),
      found_in: fieldUnknown("Found In"),
      area: fieldUnknown("Associated Area"),
    };

    if (/\bstaff\b|\bwand\b|\brod\b|\bscepter\b/i.test(name)) {
      out.item_type = fieldInferred("Weapon", "Item Type");
      out.subtype = fieldNeedsConfirmation(buildSubtypeHints(name, ["Magic Weapon", "Staff"]), "Subtype");
    } else if (/\bsword\b|\baxe\b|\bmace\b|\bhammer\b|\bdagger\b|\bblade\b|\bspear\b/i.test(name)) {
      out.item_type = fieldInferred("Weapon", "Item Type");
      out.subtype = fieldNeedsConfirmation("Melee Weapon", "Subtype");
    } else if (/\bbow\b|\bcrossbow\b|\bsling\b/i.test(name)) {
      out.item_type = fieldInferred("Weapon", "Item Type");
      out.subtype = fieldNeedsConfirmation("Ranged Weapon", "Subtype");
    } else if (/\bpotion\b|\belixir\b|\btonic\b|\bfood\b|\bmeal\b|\bdrink\b/i.test(name)) {
      out.item_type = fieldInferred("Consumable", "Item Type");
    } else if (/\bore\b|\bingot\b|\bwood\b|\bstone\b|\bfiber\b|\bleather\b|\bcloth\b|\bhide\b/i.test(name)) {
      out.item_type = fieldInferred("Material", "Item Type");
      out.subtype = fieldNeedsConfirmation("Resource", "Subtype");
    } else if (/\bkey\b|\bmedallion\b|\bartifact\b|\brelic\b|\btoken\b/i.test(name)) {
      out.item_type = fieldNeedsConfirmation("Special Item", "Item Type");
    } else if (meaningful(payload && payload.discovery_type)) {
      out.item_type = fieldKnown(formatLabel(payload.discovery_type), "Item Type");
    }

    if (meaningful(payload && payload.dropped_by)) {
      out.dropped_by = fieldKnown(payload.dropped_by, "Dropped By");
    }
    if (meaningful(payload && payload.found_in)) {
      out.found_in = fieldKnown(payload.found_in, "Found In");
    }
    if (meaningful(payload && payload.region_name)) {
      out.area = fieldKnown(payload.region_name, "Associated Area");
    }

    applyRelationFields(out, relations, "items");
    return out;
  }

  function classifyCreature(title, payload, relations) {
    const out = {
      creature_type: fieldUnknown("Type"),
      habitat: fieldUnknown("Habitat / Biome"),
      observed_at: fieldUnknown("Observed At"),
      behavior: fieldUnknown("Behavior"),
      drops: fieldUnknown("Drops"),
      spawn: fieldUnknown("Spawn Conditions"),
      time_weather: fieldUnknown("Time / Weather"),
      confidence: fieldFromPayload(payload, "confidence_level", "Confidence", formatConfidence),
      rarity: fieldFromPayload(payload, "rarity", "Rarity"),
    };

    if (meaningful(payload && payload.discovery_type)) {
      out.creature_type = fieldKnown(formatLabel(payload.discovery_type), "Type");
    } else {
      out.creature_type = fieldInferred("Creature", "Type");
    }

    if (meaningful(payload && payload.biome_context)) {
      out.habitat = fieldKnown(formatLabel(payload.biome_context), "Habitat / Biome");
    } else if (meaningful(payload && payload.region_name)) {
      out.habitat = fieldKnown(payload.region_name, "Habitat / Biome");
    }

    if (meaningful(payload && payload.found_in)) {
      out.observed_at = fieldKnown(payload.found_in, "Observed At");
    }

    const time = meaningful(payload && payload.time_of_day);
    const weather = meaningful(payload && payload.weather_condition);
    if (time || weather) {
      out.time_weather = fieldKnown([time, weather].filter(Boolean).join(" · "), "Time / Weather");
    }

    if (meaningful(payload && payload.spawn_conditions)) {
      out.spawn = fieldKnown(payload.spawn_conditions, "Spawn Conditions");
    }

    if (meaningful(payload && payload.dropped_items)) {
      out.drops = fieldKnown(payload.dropped_items, "Drops");
    }

    applyRelationFields(out, relations, "creatures");
    return out;
  }

  function classifyLocation(title, payload, relations, category) {
    const isBiome = category === "biomes";
    const out = {
      place_type: fieldKnown(isBiome ? "Biome" : "Location", "Type"),
      parent: fieldUnknown("Part Of"),
      climate: fieldFromPayload(payload, "climate", "Climate", formatLabel),
    };
    if (meaningful(payload && payload.discovery_type)) {
      out.place_type = fieldKnown(formatLabel(payload.discovery_type), "Type");
    }
    if (meaningful(payload && payload.region_name)) {
      out.parent = fieldKnown(payload.region_name, "Part Of");
    } else if (meaningful(payload && payload.found_in) && meaningful(payload.entity_name) !== meaningful(title)) {
      out.parent = fieldKnown(payload.found_in, "Part Of");
    }
    applyRelationFields(out, relations, category);
    return out;
  }

  function buildSubtypeHints(name, baseParts) {
    const hints = (baseParts || []).slice();
    const lower = name.toLowerCase();
    if (/\bfire\b|\bflame\b|\bember\b/i.test(lower)) hints.push("Fire");
    if (/\bfrost\b|\bice\b|\bcold\b/i.test(lower)) hints.push("Frost");
    if (/\bstorm\b|\blightning\b|\bthunder\b/i.test(lower)) hints.push("Storm");
    if (/\bpoison\b|\btoxic\b/i.test(lower)) hints.push("Poison");
    return Array.from(new Set(hints)).join(" · ");
  }

  function applyRelationFields(fields, relations, viewerCategory) {
    const rels = Array.isArray(relations) ? relations : [];
    const cat = String(viewerCategory || "").toLowerCase();

    function firstRel(types) {
      return rels.find(function(rel) {
        const type = normalizeRelType(rel.relation_type);
        return types.includes(type);
      });
    }

    function allRels(types) {
      const seen = new Set();
      const out = [];
      rels.forEach(function(rel) {
        const type = normalizeRelType(rel.relation_type);
        if (!types.includes(type) || !rel.title) return;
        const key = String(rel.title).toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(rel);
      });
      return out;
    }

    if (cat === "items") {
      if (fields.dropped_by && fields.dropped_by.status === "unknown") {
        const rel = firstRel(["dropped_by"]);
        if (rel) fields.dropped_by = relationField(rel, "Dropped By");
      }
      if (fields.found_in && fields.found_in.status === "unknown") {
        const rel = firstRel(["found_in"]);
        if (rel) fields.found_in = relationField(rel, "Found In");
      }
      if (fields.area && fields.area.status === "unknown") {
        const rel = firstRel(["located_in", "part_of"]);
        if (rel) fields.area = relationField(rel, "Associated Area");
      }
    }

    if (cat === "creatures") {
      if (fields.observed_at && fields.observed_at.status === "unknown") {
        const rel = firstRel(["observed_in", "found_near", "found_in"]);
        if (rel) fields.observed_at = relationField(rel, "Observed At");
      }
      if (fields.habitat && fields.habitat.status === "unknown") {
        const rel = firstRel(["located_in", "part_of"]);
        if (rel) fields.habitat = relationField(rel, "Habitat / Biome");
      }
      if (fields.drops && fields.drops.status === "unknown") {
        const dropList = allRels(["drops"]);
        if (dropList.length) {
          fields.drops = {
            label: "Drops",
            status: "known",
            relations: dropList,
            value: dropList.map(function(r) { return r.title; }).join(", "),
          };
        }
      }
    }
  }

  function normalizeRelType(type) {
    if (typeof KnowledgeRelations !== "undefined") {
      return KnowledgeRelations.normalizeRelationType ? KnowledgeRelations.normalizeRelationType(type) : type;
    }
    return String(type || "").toLowerCase();
  }

  function relationField(rel, label) {
    return {
      label: label,
      status: rel.auto_inferred ? "needs_confirmation" : "known",
      value: rel.title,
      relation: rel,
    };
  }

  function fieldUnknown(label) {
    return { label: label, status: "unknown", value: "" };
  }

  function fieldKnown(value, label) {
    return { label: label, status: "known", value: value };
  }

  function fieldInferred(value, label) {
    return { label: label, status: "inferred", value: value };
  }

  function fieldNeedsConfirmation(value, label) {
    return { label: label, status: "needs_confirmation", value: value };
  }

  function fieldFromPayload(payload, key, label, formatter) {
    const raw = meaningful(payload && payload[key]);
    if (!raw) return fieldUnknown(label);
    return fieldKnown(formatter ? formatter(raw) : raw, label);
  }

  function formatConfidence(value) {
    if (typeof BoundLoreRelationsRegistry !== "undefined" && BoundLoreRelationsRegistry.formatConfidenceLabel) {
      const label = BoundLoreRelationsRegistry.formatConfidenceLabel(value);
      if (label) return label;
    }
    return String(value || "").replace(/^\d-/, "").replace(/-/g, " ").replace(/\b\w/g, function(c) { return c.toUpperCase(); }).trim();
  }

  function renderEvidenceBadgeGroupSafe(evidenceTier, confidence, options) {
    if (typeof BoundLoreRelationsRegistry === "undefined" || !BoundLoreRelationsRegistry.renderEvidenceBadgeGroup) {
      return "";
    }
    return BoundLoreRelationsRegistry.renderEvidenceBadgeGroup(evidenceTier, confidence, options || {});
  }

  function resolveEntryEvidenceSignals(meta, payload) {
    if (typeof BoundLoreRelationsRegistry !== "undefined" && BoundLoreRelationsRegistry.resolveEvidenceSignals) {
      const signals = BoundLoreRelationsRegistry.resolveEvidenceSignals({ meta: meta, payload: payload });
      if (typeof BoundLoreEvidenceRank !== "undefined" && BoundLoreEvidenceRank.normalizeEvidenceSignals) {
        signals._rankContext = BoundLoreEvidenceRank.normalizeEvidenceSignals({ meta: meta, payload: payload });
      }
      return signals;
    }
    const fallback = {
      evidenceTier: payload && payload.evidence_tier,
      confidence: payload && (payload.confidence_level || payload.confidence),
      tierLabel: null,
      confidenceLabel: null,
    };
    if (typeof BoundLoreEvidenceRank !== "undefined" && BoundLoreEvidenceRank.normalizeEvidenceSignals) {
      fallback._rankContext = BoundLoreEvidenceRank.normalizeEvidenceSignals({ meta: meta, payload: payload });
    }
    return fallback;
  }

  function renderStatementStateBadgesSafe(meta, payload, options) {
    if (typeof BoundLoreEvidenceRank === "undefined" || !BoundLoreEvidenceRank.renderStatementStateBadgeGroup) {
      return "";
    }
    return BoundLoreEvidenceRank.renderStatementStateBadgeGroup({ meta: meta, payload: payload }, options || {});
  }

  function renderEntryEvidenceBadges(meta, payload, options) {
    const signals = resolveEntryEvidenceSignals(meta, payload);
    let html = renderEvidenceBadgeGroupSafe(signals.evidenceTier, signals.confidence, options);
    const stateHtml = renderStatementStateBadgesSafe(meta, payload, options);
    if (stateHtml) html += stateHtml;
    return html;
  }

  function renderEntryFacetBadges(meta, post, options) {
    if (typeof BoundLoreFacetRegistry === "undefined" || !BoundLoreFacetRegistry.renderFacetSignalsFromMeta) {
      return "";
    }
    return BoundLoreFacetRegistry.renderFacetSignalsFromMeta(meta, post, options || { maxBadges: 4, groupClassName: "bl-facet-badges-hero" });
  }

  function enrichPayloadFromRelations(payload, relations, knowledgeEntry) {
    if (typeof EntityCore !== "undefined") {
      return EntityCore.enrichPayloadFromRelations(payload, relations, knowledgeEntry);
    }
    const out = Object.assign({}, payload || {});
    const rels = Array.isArray(relations) ? relations : [];
    rels.forEach(function(rel) {
      const type = normalizeRelType(rel.relation_type);
      if (type === "dropped_by" && !meaningful(out.dropped_by)) out.dropped_by = rel.title;
      if ((type === "found_in" || type === "observed_in") && !meaningful(out.found_in)) out.found_in = rel.title;
      if (type === "located_in" && !meaningful(out.region_name)) out.region_name = rel.title;
      if (type === "drops" && !meaningful(out.dropped_items)) out.dropped_items = rel.title;
    });
    if (knowledgeEntry && knowledgeEntry.source_post_title && !meaningful(out.notes)) {
      out._source_discovery_title = knowledgeEntry.source_post_title;
    }
    return out;
  }

  function collectMissingFields(post, meta, payload, relations, classification) {
    const missing = [];
    const cat = String(post.category || "").toLowerCase();
    const stub = isStubEntry(post, meta);

    function add(key, label, intent) {
      missing.push({ key: key, label: label, intent: intent || key });
    }

    function isFactKnown(key) {
      const f = classification && classification[key];
      if (!f) return false;
      if (typeof f.status !== "undefined") return f.status !== "unknown";
      return meaningful(f.value);
    }

    function shouldSkipMissingKey(key) {
      if (cat === "items") {
        if (key === "dropped_by" && isFactKnown("dropped_by")) return true;
        if ((key === "found_in" || key === "biome" || key === "region_name" || key === "biome_context") &&
          (isFactKnown("found_in") || isFactKnown("biome") || isFactKnown("area"))) return true;
        if ((key === "how_obtain" || key === "how_to_obtain" || key === "source_type") &&
          (isFactKnown("how_obtain") || isFactKnown("dropped_by"))) return true;
        if ((key === "stats" || key === "damage") && isFactKnown("stats")) return true;
        if ((key === "item_effect" || key === "effect") && isFactKnown("effect")) return true;
        if (key === "rarity" && isFactKnown("rarity")) return true;
      }
      if (cat === "creatures") {
        if (key === "dropped_items" && isFactKnown("drops")) return true;
        if ((key === "found_in" || key === "observed_at") && isFactKnown("observed_at")) return true;
        if ((key === "biome" || key === "region_name") && isFactKnown("biome")) return true;
        if ((key === "spawn_conditions" || key === "spawn") && isFactKnown("spawn")) return true;
        if (key === "behavior" && isFactKnown("behavior")) return true;
      }
      if ((cat === "biomes" || cat === "locations") && (key === "known_creature" || key === "known_item")) {
        const counts = countRelationBuckets(relations, cat);
        if (key === "known_creature" && counts.creatures > 0) return true;
        if (key === "known_item" && counts.items > 0) return true;
      }
      return false;
    }

    if (cat === "items") {
      const subtype = typeof EntityCore !== "undefined"
        ? EntityCore.resolveEntitySubtype(meta, { category: cat, title: post && post.title })
        : (meta && meta.entity_subtype) || "";
      if (subtype === "resource") {
        const resource = payload && payload.resource && typeof payload.resource === "object" ? payload.resource : payload;
        if (!meaningful(resource && (resource.source_type || payload.source_type))) {
          add("source_type", "Source Type", "add_info");
        }
        if (!meaningful(resource && (resource.biome || payload.region_name))) {
          add("region_name", "Biome / Region", "confirm_location");
        }
        return missing.slice(0, 4);
      }
      function isUnknown(key) {
        const f = classification[key];
        if (!f) return false;
        if (f.status) return f.status === "unknown";
        return f.status === "unknown" || (typeof f.status === "undefined" && !f.value);
      }
      if (isUnknown("effect") || (classification.effect && classification.effect.status === "unknown")) {
        add("item_effect", "Effect / Use", "add_effect");
      }
      if (isUnknown("stats")) add("stats", "Damage / Stats", "add_stats");
      if (isUnknown("rarity")) add("rarity", "Rarity", "add_info");
    } else if (cat === "creatures") {
      function isUnknownC(key) {
        const f = classification[key];
        return f && f.status === "unknown";
      }
      if (isUnknownC("drops")) add("dropped_items", "Loot / Drops", "report_drop");
      if (isUnknownC("observed_at")) add("found_in", "Observation Location", "confirm_location");
      if (isUnknownC("spawn")) add("spawn_conditions", "Spawn Conditions", "add_spawn");
      if (classification.behavior && classification.behavior.status === "unknown") {
        add("behavior", "Behavior", "add_behavior");
      }
    } else if (cat === "biomes" || cat === "locations") {
      const counts = countRelationBuckets(relations, cat);
      if (!counts.creatures) add("known_creature", "Known Creature", "add_known_creature");
      if (!counts.items) add("known_item", "Known Item", "add_known_item");
    }

    if (Array.isArray(meta && meta.knowledge_entry && meta.knowledge_entry.missing_fields)) {
      meta.knowledge_entry.missing_fields.forEach(function(key) {
        if (shouldSkipMissingKey(key)) return;
        if (!missing.some(function(item) { return item.key === key; })) {
          add(key, formatLabel(key), "add_info");
        }
      });
    }

    if (stub && !missing.length) {
      add("notes", "Additional Details", "add_info");
    }

    return missing.slice(0, 8);
  }

  // Remove legacy rendered discovery blocks so they don't reappear as raw
  // dumps under supplemental sections on entity pages.
  function stripLegacyDiscoveryHtml(cleanContent) {
    const text = String(cleanContent || "");
    if (!/bl-discovery-|Structured Findings|Related Entries|discovery-entry-head/i.test(text)) return text;
    const wrapper = document.createElement("div");
    wrapper.innerHTML = text;
    wrapper.querySelectorAll(
      "section.discovery-entry-head, .bl-discovery-hero, .bl-discovery-entry-head, " +
      ".bl-discovery-fact-grid, .bl-discovery-fact-card, .bl-discovery-links, .bl-discovery-media, " +
      ".bl-discovery-summary, .bl-discovery-kicker"
    ).forEach(function(node) {
      node.remove();
    });
    wrapper.querySelectorAll("h3").forEach(function(heading) {
      const title = String(heading.textContent || "").trim().toLowerCase();
      if (title !== "structured findings" && title !== "related entries") return;
      const list = heading.nextElementSibling && heading.nextElementSibling.tagName === "UL"
        ? heading.nextElementSibling
        : null;
      heading.remove();
      if (list) list.remove();
    });
    return wrapper.innerHTML.trim();
  }

  const SOURCE_DISCOVERY_SKIP_KEYS = {
    entity_name: true,
    discovery_type: true,
    region_name: true,
    found_in: true,
    biome_context: true,
    encounter_context: true,
    location_hint: true,
    exact_location: true,
    dropped_items: true,
    dropped_by: true,
    world_name: true,
    source_type: true,
    confidence_level: true,
    impact_area: true,
  };

  function buildSourceDiscoveryHtml(payload, meta, post, cleanContent) {
    const data = payload && typeof payload === "object" ? payload : {};
    const rows = [];
    const addRow = function(label, value) {
      const text = String(value || "").trim();
      if (!text) return;
      rows.push({ label: label, value: text });
    };

    addRow("Observed result", data.observed_result);
    addRow("Spawn conditions", data.spawn_conditions);
    addRow("How to reproduce", data.how_to_reproduce);
    addRow("Time of day", data.time_of_day);
    addRow("Weather", data.weather_condition);
    addRow("Group size", data.group_size);
    addRow("Combat outcome", data.combat_outcome);
    addRow("Taming method", data.taming_method);
    addRow("Alt names", data.alt_names);
    addRow("Coordinates", data.coordinates);
    addRow("Drop conditions", data.drop_conditions || data.loot_conditions);
    addRow("Drop rate note", data.drop_rate_observation);
    addRow("Reporter notes", data.additional_notes || data.notes);

    Object.keys(data).forEach(function(key) {
      if (SOURCE_DISCOVERY_SKIP_KEYS[key]) return;
      if (rows.some(function(row) { return row.label === formatLabel(key); })) return;
      const value = data[key];
      if (value == null || value === "") return;
      if (typeof value === "object") return;
      addRow(formatLabel(key), value);
    });

    const stripped = stripLegacyDiscoveryHtml(cleanContent || "");
    const strippedText = stripped.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
    if (strippedText && strippedText.length > 40 && !isStubBoilerplateContent(stripped)) {
      addRow("Original notes", strippedText.slice(0, 420) + (strippedText.length > 420 ? "…" : ""));
    }

    if (!rows.length) return "";

    let html = '<details class="bl-wiki-source-discovery"><summary>Original Report Details</summary>';
    html += '<dl class="bl-wiki-source-discovery-list">';
    rows.slice(0, 12).forEach(function(row) {
      html += '<div class="bl-wiki-source-discovery-row">';
      html += "<dt>" + escapeHtml(row.label) + "</dt>";
      html += "<dd>" + escapeHtml(row.value) + "</dd>";
      html += "</div>";
    });
    html += "</dl></details>";
    return html;
  }

  function extractHeroImage(cleanContent, meta) {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = cleanContent || "";
    const img = wrapper.querySelector("img[src]");
    if (img && img.getAttribute("src")) {
      return { url: img.getAttribute("src"), label: img.getAttribute("alt") || "Entry image" };
    }

    const evidence = Array.isArray(meta && meta.discovery_evidence) ? meta.discovery_evidence : [];
    const imageEvidence = evidence.find(function(item) {
      if (!item || !item.url) return false;
      const kind = String(item.kind || item.type || "").toLowerCase();
      const fileType = String(item.file_type || "").toLowerCase();
      return kind === "upload_image" || kind === "image" || fileType.indexOf("image/") === 0;
    });
    if (imageEvidence) {
      return { url: imageEvidence.url, label: imageEvidence.label || "Community evidence" };
    }

    return null;
  }

  function buildRelationGroups(relations, viewerCategory) {
    if (typeof KnowledgeRelations === "undefined") return [];
    const viewer = KnowledgeRelations.resolveViewerCategory({ category: viewerCategory }, {});
    return KnowledgeRelations.groupRelationsForDisplay(relations, viewer, {
      limit: KnowledgeRelations.isLargeNodeCategory(viewer) ? 6 : 12,
      context: "wiki_entry",
    });
  }

  function getContextualSectionTitle(sectionKey, viewerCategory) {
    const cat = String(viewerCategory || "").toLowerCase();
    const map = {
      drops: cat === "creatures" ? "Drops" : "Dropped Items",
      dropped_by: "Dropped By",
      found_in: cat === "items" ? "Found In" : "Found In",
      observed_in: "Observed At",
      located_in: cat === "creatures" ? "Area / Biome" : "Area / Biome",
      found_near: "Reported Near",
      requires: "Requires",
      related_discovery: "Related Discoveries",
      contains: "Contains",
      part_of: "Part Of",
      items: "Known Items",
      creatures: "Known Creatures",
      locations: "Related Locations",
      discoveries: "Recent Discoveries",
    };
    return map[sectionKey] || formatLabel(sectionKey);
  }

  function renderFieldValue(field, post) {
    if (!field) return "";
    if (field.relations && field.relations.length) {
      return field.relations.map(function(rel) {
        return renderRelationLink(rel);
      }).join(", ");
    }
    if (field.relation) {
      return renderRelationLink(field.relation);
    }
    if (field.status === "unknown") {
      return '<span class="bl-wiki-unknown">Unknown</span> <a class="bl-wiki-inline-cta" href="' +
        escapeHtml(buildContributionUrl(post, { field: field.label, intent: "add_info" })) +
        '">Add info</a>';
    }
    let html = '<span class="bl-wiki-value">' + escapeHtml(field.value) + "</span>";
    if (field.status === "inferred") {
      html += ' <span class="bl-wiki-tentative">Inferred</span>';
    } else if (field.status === "needs_confirmation") {
      html += ' <span class="bl-wiki-tentative">Needs confirmation</span>';
    }
    return html;
  }

  function renderRelationLink(rel) {
    const href = typeof KnowledgeRelations !== "undefined"
      ? KnowledgeRelations.buildRelationHref(rel)
      : (rel.slug ? "/wiki/post/?slug=" + encodeURIComponent(rel.slug) : "");
    const label = typeof EntityCore !== "undefined"
      ? EntityCore.getRelationDisplayName(rel)
      : (rel.canonical_target_name || rel.title || "Entry");
    const title = escapeHtml(label);
    if (href) {
      return '<a class="bl-wiki-rel-link" href="' + escapeHtml(href) + '">' + title + "</a>";
    }
    return '<span class="bl-wiki-rel-link">' + title + "</span>";
  }

  function renderRelationContext(rel) {
    const parts = [];
    const contextNote = typeof EntityCore !== "undefined"
      ? EntityCore.getRelationContextNote(rel)
      : "";
    if (contextNote) parts.push(contextNote);
    if (rel.source_post_title) {
      const sourceLabel = typeof EntityCore !== "undefined"
        ? EntityCore.getSourceContextLabel(rel.source_post_title)
        : rel.source_post_title;
      parts.push("via " + sourceLabel);
    } else if (rel.auto_inferred) parts.push("via discovery relation");
    if (rel.confidence) parts.push(Math.round(rel.confidence) + "% confidence");
    if (rel.report_count > 1) parts.push(rel.report_count + " reports");
    if (rel.source_date) {
      try { parts.push(new Date(rel.source_date).toLocaleDateString()); } catch (e) { /* ignore */ }
    }
    return parts.join(" · ");
  }

  function renderRelationGroupsHtml(groups, viewerCategory, post) {
    if (!groups || !groups.length) return "";
    let html = '<section class="bl-wiki-relations">';
    html += '<h3 class="bl-wiki-section-title">Related Entries</h3>';
    groups.forEach(function(section) {
      const title = getContextualSectionTitle(section.key, viewerCategory);
      const wrapTag = section.collapsible ? "details" : "div";
      const openAttr = section.collapsible && section.items.length <= 4 ? " open" : "";
      html += "<" + wrapTag + ' class="bl-wiki-rel-group"' + (section.collapsible ? openAttr : "") + ">";
      if (section.collapsible) {
        html += '<summary class="bl-wiki-rel-group-title">' + escapeHtml(title) +
          (section.total ? ' <span class="bl-wiki-rel-count">(' + section.total + ")</span>" : "") +
          "</summary>";
      } else {
        html += '<h4 class="bl-wiki-rel-group-title">' + escapeHtml(title) + "</h4>";
      }
      html += '<ul class="bl-wiki-rel-list">';
      section.items.forEach(function(rel) {
        const typeLabel = formatLabel(rel.target_entity_type || rel.group || "entry");
        const context = renderRelationContext(rel);
        const label = typeof KnowledgeRelations !== "undefined"
          ? KnowledgeRelations.getRelationLabel(rel.relation_type)
          : formatLabel(rel.relation_type);
        html += '<li class="bl-wiki-rel-item">';
        html += '<div class="bl-wiki-rel-item-head">';
        html += '<span class="bl-wiki-rel-item-label">' + escapeHtml(label) + "</span>";
        html += renderRelationLink(rel);
        html += '<span class="bl-wiki-rel-item-type">' + escapeHtml(typeLabel) + "</span>";
        html += "</div>";
        if (context) html += '<div class="bl-wiki-rel-item-context">' + escapeHtml(context) + "</div>";
        html += "</li>";
      });
      html += "</ul>";
      if (section.hasMore) {
        html += '<p class="bl-wiki-rel-more">Showing ' + section.items.length + " of " + section.total + " linked entries.</p>";
      }
      html += "</" + wrapTag + ">";
    });
    html += "</section>";
    return html;
  }

  function dedupeRelationsLocal(relations) {
    if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.dedupeRelationsForDisplay) {
      return KnowledgeRelations.dedupeRelationsForDisplay(relations);
    }
    return Array.isArray(relations) ? relations : [];
  }

  function filterRelationsByTypes(relations, types) {
    const wanted = types.map(function(t) { return normalizeRelType(t); });
    return dedupeRelationsLocal(relations).filter(function(rel) {
      return rel && rel.title && wanted.includes(normalizeRelType(rel.relation_type));
    });
  }

  function isBiomeRelation(rel) {
    if (!rel) return false;
    const cat = String(rel.category || rel.group || "").toLowerCase();
    const entityType = String(rel.target_entity_type || "").toLowerCase();
    if (cat === "biomes" || entityType === "biome") return true;
    if (typeof EntityCore !== "undefined" && EntityCore.isKnownBiomeName(rel.title)) return true;
    const title = String(rel.title || "");
    if (/near|campfire|dungeon|cave|vault|tower|shrine|landmark/i.test(title)) return false;
    return title.split(/\s+/).length <= 3;
  }

  function isLocationRelation(rel) {
    if (!rel) return false;
    const title = String(rel.title || "");
    if (typeof EntityCore !== "undefined" && (EntityCore.isKnownBiomeName(title) || EntityCore.isVagueLocationHint(title))) {
      return false;
    }
    const type = normalizeRelType(rel.relation_type);
    if (["found_in", "observed_in", "found_near"].includes(type)) return true;
    if (type === "located_in" || type === "part_of") {
      const cat = String(rel.category || rel.group || "").toLowerCase();
      const entityType = String(rel.target_entity_type || "").toLowerCase();
      if (cat === "locations" || entityType === "location") return true;
      return /near|campfire|landmark|dungeon|cave/i.test(title);
    }
    return false;
  }

  function collectEncounterContexts(meta, relations) {
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const hints = [];
    const seen = new Set();
    function addHint(value) {
      const clean = meaningful(value);
      const key = typeof EntityCore !== "undefined"
        ? EntityCore.normalizeTitleKey(clean)
        : String(clean || "").trim().toLowerCase();
      if (!clean || seen.has(key)) return;
      seen.add(key);
      hints.push(clean);
    }
    addHint(payload.location_hint);
    addHint(payload.encounter_context);
    addHint(payload.observation_context);
    (Array.isArray(relations) ? relations : []).forEach(function(rel) {
      if (!rel || !rel.title) return;
      if (typeof EntityCore !== "undefined" && EntityCore.isVagueLocationHint(rel.title)) {
        addHint(rel.title);
      }
    });
    return hints;
  }

  function filterBiomeRelations(relations) {
    return dedupeRelationsLocal(relations).filter(function(rel) {
      const type = normalizeRelType(rel.relation_type);
      return (type === "located_in" || type === "part_of") && isBiomeRelation(rel);
    });
  }

  function filterLocationRelations(relations) {
    return dedupeRelationsLocal(relations).filter(function(rel) {
      return isLocationRelation(rel);
    });
  }

  function resolveRelationBucket(rel) {
    if (typeof EntityCore !== "undefined" && EntityCore.resolveRelationCategory) {
      return EntityCore.resolveRelationCategory(rel);
    }
    const cat = String(rel.category || rel.group || "").toLowerCase();
    const targetType = String(rel.target_entity_type || "").toLowerCase();
    if (cat === "items" || targetType === "item") return "items";
    if (cat === "creatures" || targetType === "creature" || targetType === "monster") return "creatures";
    if (cat === "discoveries" || targetType === "discovery") return "discoveries";
    if (cat === "biomes" || targetType === "biome") return "biomes";
    if (cat === "locations" || targetType === "location") return "locations";
    return "";
  }

  function countRelationBuckets(relations, viewerCategory) {
    const viewer = String(viewerCategory || "biomes").toLowerCase();
    if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.countKnownEntitiesForViewer) {
      return KnowledgeRelations.countKnownEntitiesForViewer(relations, viewer);
    }
    const rels = dedupeRelationsLocal(relations);
    let creatures = 0;
    let items = 0;
    let discoveries = 0;
    const seenC = new Set();
    const seenI = new Set();
    const seenD = new Set();
    rels.forEach(function(rel) {
      const bucket = resolveRelationBucket(rel);
      const name = typeof EntityCore !== "undefined"
        ? EntityCore.getRelationDisplayName(rel)
        : (rel.display_name || rel.title || "");
      const key = String(name || rel.slug || rel.id || rel.title || "").trim().toLowerCase();
      if (bucket === "creatures") {
        if (!seenC.has(key)) { seenC.add(key); creatures += 1; }
      } else if (bucket === "items") {
        if (!seenI.has(key)) { seenI.add(key); items += 1; }
      } else if (bucket === "discoveries") {
        if (!seenD.has(key)) { seenD.add(key); discoveries += 1; }
      }
    });
    return { creatures: creatures, items: items, discoveries: discoveries };
  }

  function renderFactValue(fact, options) {
    const opts = Object.assign({ noCta: true, placeholder: "Not confirmed yet" }, options || {});
    if (!fact) {
      return '<span class="bl-wiki-empty">' + escapeHtml(opts.placeholder) + "</span>";
    }
    if (fact.relations && fact.relations.length) {
      return fact.relations.map(function(rel) {
        return renderRelationLink(rel);
      }).join(", ");
    }
    if (fact.relation_ref && fact.relation_ref.slug) {
      return '<a class="bl-wiki-rel-link" href="/wiki/post/?slug=' + encodeURIComponent(fact.relation_ref.slug) + '">' +
        escapeHtml(fact.value) + "</a>";
    }
    if (fact.relation_ref && fact.relation_ref.title) {
      return escapeHtml(fact.value);
    }
    if (fact.status === "unknown" || (!meaningful(fact.value) && !(fact.status === "explicit" && fact.value))) {
      return '<span class="bl-wiki-empty">' + escapeHtml(opts.placeholder) + "</span>";
    }
    let html = '<span class="bl-wiki-value">' + escapeHtml(fact.value) + "</span>";
    if (fact.status === "derived") {
      html += ' <span class="bl-wiki-tentative">Derived</span>';
    } else if (fact.status === "inferred") {
      html += ' <span class="bl-wiki-tentative">Inferred</span>';
    } else if (fact.status === "needs_confirmation") {
      html += ' <span class="bl-wiki-tentative">Needs confirmation</span>';
    }
    return html;
  }

  function buildHeroFacts(category, resolved, relations, stub) {
    const facts = [];
    const f = resolved && resolved.facts ? resolved.facts : {};

    function add(label, fact, skipUnknown) {
      if (!fact) return;
      if (skipUnknown && fact.status === "unknown") return;
      facts.push({ label: label, html: renderFactValue(fact) });
    }

    if (category === "items") {
      const isResource = f.item_type && f.item_type.value === "Resource";
      if (isResource) {
        add("Type", f.item_type, false);
        add("Source Type", f.source_type, false);
        add("Source Detail", f.source_detail, false);
        add("Rarity", f.rarity, false);
        add("Biome / Region", f.biome, true);
      } else {
        add("Item Type", f.item_type, true);
        add("Subtype", f.subtype, true);
        add("Rarity", f.rarity, true);
        if (f.how_obtain && f.how_obtain.status !== "unknown") {
          add("How to Obtain", f.how_obtain, false);
        } else {
          add("Dropped By", f.dropped_by, true);
        }
        add("Biome / Region", f.biome, true);
      }
    } else if (category === "creatures") {
      add("Type", f.creature_type, true);
      add("Biome / Region", f.biome, true);
      add("Observed At", f.observed_at, true);
      if (f.drops && f.drops.status !== "unknown") {
        const primaryDrop = Object.assign({}, f.drops);
        if (f.drops.relations && f.drops.relations.length > 1) {
          primaryDrop.value = f.drops.relations[0].title;
          primaryDrop.relations = [f.drops.relations[0]];
        } else if (f.drops.value && String(f.drops.value).includes(",")) {
          primaryDrop.value = String(f.drops.value).split(",")[0].trim();
        }
        facts.push({ label: "Known Drop", html: renderFactValue(primaryDrop) });
      }
      if (f.rarity && f.rarity.status !== "unknown") add("Rarity", f.rarity, false);
      else add("Confidence", f.confidence, true);
    } else if (category === "biomes" || category === "locations") {
      add("Type", f.place_type, false);
      add("Part Of", f.parent, true);
      const counts = countRelationBuckets(relations, category);
      facts.push({ label: "Known Creatures", html: '<span class="bl-wiki-value">' + counts.creatures + "</span>" });
      facts.push({ label: "Known Items", html: '<span class="bl-wiki-value">' + counts.items + "</span>" });
      if (counts.discoveries) {
        facts.push({ label: "Related Discoveries", html: '<span class="bl-wiki-value">' + counts.discoveries + "</span>" });
      }
    }

    if (stub) {
      facts.push({
        label: "Status",
        html: '<span class="bl-wiki-status-inline">Growing entry · needs more details</span>',
      });
    }
    return facts;
  }

  function buildRelationTitleIndex(relations) {
    const index = {};
    (Array.isArray(relations) ? relations : []).forEach(function(rel) {
      if (!rel || !rel.title) return;
      const key = String(rel.title).trim().toLowerCase();
      if (!key) return;
      if (!index[key] || rel.slug || rel.id) index[key] = rel;
    });
    return index;
  }

  function formatRecipeQuantity(quantity, unit) {
    const cleanUnit = meaningful(unit);
    if (quantity != null && Number.isFinite(Number(quantity))) {
      const qty = Number(quantity);
      return cleanUnit ? (qty + " " + cleanUnit) : String(qty);
    }
    return cleanUnit || "";
  }

  function recipeRowQuantity(row) {
    if (!row) return null;
    const raw = row.quantity != null ? row.quantity
      : (row.qualifiers && row.qualifiers.quantity != null ? row.qualifiers.quantity : null);
    return raw != null && Number.isFinite(Number(raw)) ? Number(raw) : null;
  }

  function recipeRowUnit(row) {
    if (!row) return null;
    if (row.unit) return row.unit;
    if (row.qualifiers && row.qualifiers.unit) return row.qualifiers.unit;
    return null;
  }

  function recipeStationName(recipe) {
    if (!recipe) return "";
    return meaningful(recipe.station || recipe.crafting_station
      || (recipe.qualifiers && recipe.qualifiers.station));
  }

  function renderUnresolvedRecipeTarget(name, relIndex, context) {
    const key = String(name || "").trim().toLowerCase();
    const rel = key ? relIndex[key] : null;
    const href = rel && typeof KnowledgeRelations !== "undefined"
      ? KnowledgeRelations.buildRelationHref(rel)
      : (rel && rel.slug ? "/wiki/post/?slug=" + encodeURIComponent(rel.slug) : "");
    if (href && rel) return renderRelationLink(rel);

    const kind = context && context.kind === "station" ? "station" : "ingredient";
    const suggestion = kind === "station" ? "Station Type" : "Resource";
    const linkLabel = kind === "station" ? "Add station entry" : "Add resource entry";
    const prefillUrl = typeof BoundLoreUnresolvedTargets !== "undefined" && BoundLoreUnresolvedTargets.buildRecipeTargetPrefillUrl
      ? BoundLoreUnresolvedTargets.buildRecipeTargetPrefillUrl(name, kind)
      : (kind === "station"
        ? "/wiki/create-post/?type=station_type&name=" + encodeURIComponent(name) + "&source=missing-entry"
        : "/wiki/create-post/?type=resource&name=" + encodeURIComponent(name) + "&source=missing-entry");

    let html = '<span class="bl-wiki-recipe-ingredient-name">' + escapeHtml(name) + "</span>";
    if (meaningful(name)) {
      html += ' <span class="bl-wiki-entry-needed" title="Suggested entry: ' + escapeHtml(suggestion) + '. Tracked as unresolved target.">Entry needed</span>';
      html += ' <a class="bl-wiki-entry-needed-link" href="' + escapeHtml(prefillUrl) + '" title="Open create form prefilled for ' + escapeHtml(suggestion) + '">' +
        escapeHtml(linkLabel) + "</a>";
    }
    return html;
  }

  function renderRecipeIngredientName(name, relIndex, context) {
    return renderUnresolvedRecipeTarget(name, relIndex, context || { kind: "ingredient" });
  }

  function resolveRecipeDisplay(meta, relations, post) {
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const recipe = payload.recipe && typeof payload.recipe === "object" ? payload.recipe : null;
    const relIndex = buildRelationTitleIndex(relations);
    const craftedFrom = filterRelationsByTypes(relations, ["crafted_from"]);
    const craftedAt = filterRelationsByTypes(relations, ["crafted_at"]);
    const displayName = typeof EntityCore !== "undefined"
      ? EntityCore.getDisplayName(meta, post)
      : (post && post.title ? post.title : "Item");

    if (recipe) {
      const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
      const station = recipeStationName(recipe);
      const notes = meaningful(recipe.notes);
      const unlock = meaningful(recipe.unlock_condition);
      const hasIngredients = ingredients.some(function(row) {
        return meaningful(row && (row.name || row.title || row.target_name));
      });
      if (!hasIngredients && !station && !notes) return null;

      const outputQty = recipe.output_quantity != null && Number.isFinite(Number(recipe.output_quantity))
        ? Number(recipe.output_quantity)
        : 1;

      return {
        outputName: displayName,
        outputQuantity: outputQty,
        ingredients: ingredients.map(function(row) {
          const name = meaningful(row && (row.name || row.title || row.target_name));
          if (!name) return null;
          return {
            name: name,
            quantity: recipeRowQuantity(row),
            unit: recipeRowUnit(row),
            nameHtml: renderRecipeIngredientName(name, relIndex, { kind: "ingredient" }),
          };
        }).filter(Boolean),
        station: station,
        stationHtml: station ? renderRecipeIngredientName(station, relIndex, { kind: "station" }) : "",
        notes: notes,
        unlockCondition: unlock,
        evidenceTier: meaningful(recipe.evidence_tier),
        confidence: meaningful(recipe.confidence),
        version: typeof BoundLoreVersioning !== "undefined"
          ? BoundLoreVersioning.extractVersionMetadata(recipe)
          : (recipe.version || null),
        source: recipe,
      };
    }

    if (!craftedFrom.length && !craftedAt.length) return null;

    const stationRel = craftedAt[0] || null;
    const stationName = stationRel ? meaningful(stationRel.title) : "";
    const outputQty = stationRel && stationRel.output_quantity != null && Number.isFinite(Number(stationRel.output_quantity))
      ? Number(stationRel.output_quantity)
      : 1;

    return {
      outputName: displayName,
      outputQuantity: outputQty,
      ingredients: craftedFrom.map(function(rel) {
        const name = meaningful(rel.title);
        if (!name) return null;
        return {
          name: name,
          quantity: recipeRowQuantity(rel),
          unit: recipeRowUnit(rel),
          nameHtml: renderRecipeIngredientName(name, relIndex, { kind: "ingredient" }),
        };
      }).filter(Boolean),
      station: stationName,
      stationHtml: stationName ? renderRecipeIngredientName(stationName, relIndex, { kind: "station" }) : "",
      notes: "",
      unlockCondition: stationRel && meaningful(stationRel.unlock_condition) ? stationRel.unlock_condition : "",
      evidenceTier: "",
      confidence: stationRel && meaningful(stationRel.confidence) ? String(stationRel.confidence) : "",
    };
  }

  function resolveRecipeUsages(relations) {
    const inbound = filterRelationsByTypes(relations, ["ingredient_of"]).filter(function(rel) {
      return rel.direction === "inbound" || rel.auto_inferred;
    });
    const seen = new Set();
    return inbound.map(function(rel) {
      const href = typeof KnowledgeRelations !== "undefined"
        ? KnowledgeRelations.buildRelationHref(rel)
        : (rel.slug ? "/wiki/post/?slug=" + encodeURIComponent(rel.slug) : "");
      return {
        title: typeof EntityCore !== "undefined"
          ? EntityCore.getRelationDisplayName(rel)
          : (rel.title || "Entry"),
        slug: rel.slug || null,
        href: href,
        quantity: rel.quantity != null ? rel.quantity : null,
        unit: rel.unit || null,
        station: meaningful(rel.crafting_station || rel.station) || null,
        context: "Crafting Recipe",
      };
    }).filter(function(row) {
      const key = (row.slug || row.title || "").toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function renderRecipeUsageCard(usage) {
    let html = '<div class="bl-wiki-usage-card">';
    html += '<div class="bl-wiki-usage-card-head">';
    if (usage.href) {
      html += '<a class="bl-wiki-rel-link" href="' + escapeHtml(usage.href) + '">' +
        escapeHtml(usage.title) + "</a>";
    } else {
      html += '<span class="bl-wiki-rel-link">' + escapeHtml(usage.title) + "</span>";
    }
    html += "</div>";
    html += '<div class="bl-wiki-usage-card-meta">';
    html += '<span class="bl-wiki-usage-context">Used for: ' + escapeHtml(usage.context || "Crafting Recipe") + "</span>";
    const qtyLabel = formatRecipeQuantity(usage.quantity, usage.unit);
    if (qtyLabel) {
      html += '<span class="bl-wiki-usage-qty">Quantity: ' + escapeHtml(qtyLabel) + "</span>";
    }
    if (usage.station) {
      html += '<span class="bl-wiki-usage-station">Station: ' + escapeHtml(usage.station) + "</span>";
    }
    html += "</div>";
    html += "</div>";
    return html;
  }

  function renderRecipeUsageSectionBody(items) {
    let html = '<div class="bl-wiki-usage-list">';
    items.forEach(function(usage) {
      html += renderRecipeUsageCard(usage);
    });
    html += "</div>";
    return html;
  }

  function renderRecipeEvidenceMeta(recipeDisplay) {
    let html = "";
    const badgeHtml = renderEvidenceBadgeGroupSafe(
      recipeDisplay.evidenceTier,
      recipeDisplay.confidence,
      { groupClassName: "bl-evidence-badges-recipe" }
    );
    if (badgeHtml) html += badgeHtml;
    if (typeof BoundLoreVersioning !== "undefined" && recipeDisplay && recipeDisplay.version) {
      const recipeSource = recipeDisplay.source || recipeDisplay;
      if (BoundLoreVersioning.shouldDisplayVersionBadge(recipeSource)) {
        const versionHtml = BoundLoreVersioning.renderVersionBadgeGroup(recipeDisplay.version, {
          groupClassName: "bl-version-badges-recipe",
        });
        if (versionHtml) html += versionHtml;
      }
    }
    if (typeof BoundLoreVersioning !== "undefined" && recipeDisplay) {
      const recipeSource = recipeDisplay.source || recipeDisplay;
      const historyHtml = BoundLoreVersioning.renderVersionHistoryGroup(recipeSource, {
        groupClassName: "bl-version-history-recipe",
      });
      if (historyHtml) html += historyHtml;
    }
    if (recipeDisplay && typeof BoundLoreEvidenceRank !== "undefined" && BoundLoreEvidenceRank.renderStatementStateBadgeGroup) {
      const stateHtml = BoundLoreEvidenceRank.renderStatementStateBadgeGroup(recipeDisplay.source || recipeDisplay, {
        groupClassName: "bl-state-badges-recipe",
      });
      if (stateHtml) html += stateHtml;
    }
    return html;
  }

  function renderRecipeSectionBody(recipeDisplay) {
    if (!recipeDisplay) return "";
    let html = '<dl class="bl-wiki-facts bl-wiki-recipe-facts">';

    if (recipeDisplay.outputName) {
      const qty = recipeDisplay.outputQuantity != null ? recipeDisplay.outputQuantity : 1;
      html += '<div class="bl-wiki-fact">';
      html += "<dt>Output</dt>";
      html += "<dd><span class=\"bl-wiki-value\">" + escapeHtml(recipeDisplay.outputName) +
        " ×" + escapeHtml(String(qty)) + "</span></dd>";
      html += "</div>";
    }

    if (recipeDisplay.ingredients && recipeDisplay.ingredients.length) {
      html += '<div class="bl-wiki-fact">';
      html += "<dt>Ingredients</dt>";
      html += "<dd><ul class=\"bl-wiki-recipe-ingredients\">";
      recipeDisplay.ingredients.forEach(function(row) {
        const qtyLabel = formatRecipeQuantity(row.quantity, row.unit);
        html += "<li>";
        html += row.nameHtml || escapeHtml(row.name);
        if (qtyLabel) html += ' <span class="bl-wiki-recipe-qty">×' + escapeHtml(qtyLabel) + "</span>";
        html += "</li>";
      });
      html += "</ul></dd></div>";
    }

    if (recipeDisplay.station) {
      html += '<div class="bl-wiki-fact">';
      html += "<dt>Crafting Station</dt>";
      html += "<dd>" + (recipeDisplay.stationHtml || escapeHtml(recipeDisplay.station)) + "</dd>";
      html += "</div>";
    }

    if (recipeDisplay.unlockCondition) {
      html += '<div class="bl-wiki-fact">';
      html += "<dt>Unlock Condition</dt>";
      html += "<dd><span class=\"bl-wiki-value\">" + escapeHtml(recipeDisplay.unlockCondition) + "</span></dd>";
      html += "</div>";
    }

    if (recipeDisplay.notes) {
      html += '<div class="bl-wiki-fact">';
      html += "<dt>Notes</dt>";
      html += "<dd><span class=\"bl-wiki-value\">" + escapeHtml(recipeDisplay.notes) + "</span></dd>";
      html += "</div>";
    }

    html += "</dl>";
    html += renderRecipeEvidenceMeta(recipeDisplay);
    return html;
  }

  function buildDetailSections(category, resolved, relations, missing, meta, post) {
    const sections = [];
    const f = resolved && resolved.facts ? resolved.facts : {};
    const usedKeys = new Set();

    function pushRelations(key, title, items, emptyLabel) {
      if (!items || !items.length) return;
      const seenKeys = new Set();
      const deduped = items.filter(function(rel) {
        const dedupeKey = typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.relationEntityDedupeKey
          ? KnowledgeRelations.relationEntityDedupeKey(rel)
          : (typeof EntityCore !== "undefined"
            ? EntityCore.getRelationDisplayName(rel)
            : (rel.display_name || rel.title || ""));
        const entityKey = String(dedupeKey || "").trim().toLowerCase();
        if (!entityKey || seenKeys.has(entityKey)) return false;
        seenKeys.add(entityKey);
        return true;
      });
      if (!deduped.length) return;
      usedKeys.add(key);
      sections.push({ key: key, title: title, type: "relations", items: deduped, emptyLabel: emptyLabel });
    }

    function pushFact(key, title, fact) {
      usedKeys.add(key);
      sections.push({ key: key, title: title, type: "fact", fact: fact });
    }

    if (category === "items") {
      pushRelations("dropped_by", "Dropped By", filterRelationsByTypes(relations, ["dropped_by"]));
      pushRelations("biomes", "Found in Biomes", filterBiomeRelations(relations));
      pushRelations("locations", "Found at Locations", filterLocationRelations(relations));
      pushFact("stats", "Stats", f.stats);
      pushFact("effect", "Effects / Use", f.effect);
      const recipeDisplay = resolveRecipeDisplay(meta, relations, post);
      if (recipeDisplay) {
        usedKeys.add("crafted_from");
        usedKeys.add("crafted_at");
        sections.push({
          key: "crafting_recipe",
          title: "Crafting Recipe",
          type: "recipe",
          recipe: recipeDisplay,
        });
      }
      const recipeUsages = resolveRecipeUsages(relations);
      if (recipeUsages.length) {
        usedKeys.add("ingredient_of");
        sections.push({
          key: "recipe_usage",
          title: "Used In",
          type: "recipe_usage",
          items: recipeUsages,
        });
      }
    } else if (category === "creatures") {
      pushRelations("drops", "Known Drops", filterRelationsByTypes(relations, ["drops"]));
      pushRelations("biomes", "Observed Biomes", filterBiomeRelations(relations));
      pushRelations("locations", "Observed Locations", filterLocationRelations(relations));
      if (f.behavior && f.behavior.status !== "unknown") pushFact("behavior", "Behavior", f.behavior);
      if (f.spawn && f.spawn.status !== "unknown") pushFact("spawn", "Spawn Conditions", f.spawn);
      if (f.time_weather && f.time_weather.status !== "unknown") pushFact("time_weather", "Time / Weather", f.time_weather);
    } else if (category === "biomes" || category === "locations") {
      const rels = dedupeRelationsLocal(relations);
      const creatures = rels.filter(function(rel) {
        return resolveRelationBucket(rel) === "creatures";
      });
      const items = rels.filter(function(rel) {
        return resolveRelationBucket(rel) === "items";
      });
      const locs = rels.filter(function(rel) {
        if (typeof EntityCore !== "undefined" && EntityCore.isVagueLocationHint(rel.title)) return false;
        return resolveRelationBucket(rel) === "locations";
      });
      const discoveries = rels.filter(function(rel) {
        return resolveRelationBucket(rel) === "discoveries";
      });
      const encounterContexts = collectEncounterContexts(meta || {}, rels);
      pushRelations("creatures", "Known Creatures", creatures);
      pushRelations("items", "Known Items", items);
      if (locs.length) pushRelations("related_locations", "Related Locations", locs);
      if (discoveries.length) pushRelations("discoveries", "Related Discoveries", discoveries);
      if (encounterContexts.length) {
        sections.push({
          key: "encounter_contexts",
          title: "Encounter Contexts",
          type: "text_list",
          items: encounterContexts,
        });
        usedKeys.add("encounter_contexts");
      }
    }

    if (missing && missing.length) {
      sections.push({ key: "missing", title: "Missing Information", type: "missing", items: missing });
    }

    return { sections: sections, usedKeys: usedKeys };
  }

  function renderRelationRow(rel, viewerCategory, sectionKey) {
    const typeLabel = formatLabel(rel.target_entity_type || rel.category || rel.group || "entry");
    const context = renderRelationContext(rel);
    const relLabel = typeof KnowledgeRelations !== "undefined"
      ? KnowledgeRelations.getRelationLabel(rel.relation_type, rel, viewerCategory || sectionKey)
      : formatLabel(rel.relation_type);
    let html = '<div class="bl-wiki-rel-card">';
    html += '<div class="bl-wiki-rel-card-head">';
    html += renderRelationLink(rel);
    html += '<span class="bl-wiki-rel-card-type">' + escapeHtml(typeLabel) + "</span>";
    html += "</div>";
    html += '<div class="bl-wiki-rel-card-meta">' + escapeHtml(relLabel) + "</div>";
    if (context) html += '<div class="bl-wiki-rel-card-context">' + escapeHtml(context) + "</div>";
    html += "</div>";
    return html;
  }

  function renderDetailSection(section, post, meta) {
    let html = '<section class="bl-wiki-detail-card" id="wiki-section-' + escapeHtml(section.key) + '">';
    html += '<h3 class="bl-wiki-detail-card-title">' + escapeHtml(section.title) + "</h3>";

    if (section.type === "relations") {
      html += '<div class="bl-wiki-rel-card-grid">';
      const viewerCategory = String(post.category || "").toLowerCase();
      section.items.forEach(function(rel) {
        html += renderRelationRow(rel, viewerCategory, section.key);
      });
      html += "</div>";
    } else if (section.type === "fact") {
      html += '<div class="bl-wiki-detail-card-body">' + renderFactValue(section.fact) + "</div>";
    } else if (section.type === "text_list") {
      html += '<ul class="bl-wiki-context-list">';
      section.items.forEach(function(item) {
        html += '<li class="bl-wiki-context-item">' + escapeHtml(item) + "</li>";
      });
      html += "</ul>";
    } else if (section.type === "recipe") {
      html += '<div class="bl-wiki-detail-card-body bl-wiki-recipe-body">' +
        renderRecipeSectionBody(section.recipe) + "</div>";
    } else if (section.type === "recipe_usage") {
      html += '<div class="bl-wiki-detail-card-body bl-wiki-usage-body">' +
        renderRecipeUsageSectionBody(section.items) + "</div>";
    } else if (section.type === "missing") {
      html += '<ul class="bl-wiki-missing-list bl-wiki-missing-list-compact">';
      section.items.forEach(function(item) {
        html += '<li class="bl-wiki-missing-item-compact">';
        html += "<span>" + escapeHtml(item.label) + "</span> ";
        html += '<a class="bl-wiki-cta-inline" href="' +
          escapeHtml(buildContributionUrl(post, {
            field: item.key,
            intent: item.intent,
            meta: meta,
          })) + '">Add</a>';
        html += "</li>";
      });
      html += "</ul>";
    }
    html += "</section>";
    return html;
  }

  function renderSupplementalRelationGroups(groups, viewerCategory, usedKeys) {
    if (!groups || !groups.length) return "";
    const skip = usedKeys || new Set();
    const heroOverlap = {
      dropped_by: true, drops: true, found_in: true, observed_in: true,
      located_in: true, found_near: true, part_of: true,
      creatures: true, items: true, locations: true, discoveries: true,
      related_discovery: true,
    };
    let html = "";
    groups.forEach(function(section) {
      if (skip.has(section.key) || heroOverlap[section.key]) return;
      if (!section.items || !section.items.length) return;
      html += '<section class="bl-wiki-detail-card">';
      html += '<h3 class="bl-wiki-detail-card-title">' + escapeHtml(getContextualSectionTitle(section.key, viewerCategory)) + "</h3>";
      html += '<div class="bl-wiki-rel-card-grid">';
      section.items.forEach(function(rel) {
        html += renderRelationRow(rel, viewerCategory, section.key);
      });
      html += "</div>";
      if (section.hasMore) {
        html += '<p class="bl-wiki-rel-more">Showing ' + section.items.length + " of " + section.total + " linked entries.</p>";
      }
      html += "</section>";
    });
    return html;
  }

  function renderSourcesSection(model, post) {
    const parts = [];
    if (model.sourceUrl && model.sourceTitle) {
      parts.push('<a class="bl-wiki-source-link" href="' + escapeHtml(model.sourceUrl) + '">' +
        escapeHtml(model.sourceTitle) + "</a>");
    }
    const evidence = Array.isArray(model.meta.discovery_evidence) ? model.meta.discovery_evidence : [];
    evidence.forEach(function(item) {
      if (!item || !item.url) return;
      const label = item.label || item.type || "Evidence";
      parts.push('<a class="bl-wiki-source-link" href="' + escapeHtml(item.url) + '" target="_blank" rel="noopener">' +
        escapeHtml(label) + "</a>");
    });
    if (!parts.length) return "";
    return '<section class="bl-wiki-detail-card bl-wiki-sources">' +
      '<h3 class="bl-wiki-detail-card-title">Sources / Evidence</h3>' +
      '<div class="bl-wiki-source-list">' + parts.join("") + "</div></section>";
  }

  function renderCoreFact(fact, post) {
    return renderFactValue(fact, { noCta: true });
  }

  function buildModel(post, meta, relations, cleanContent) {
    const category = String(post.category || "").toLowerCase();
    const enrichFn = typeof EntityCore !== "undefined"
      ? EntityCore.enrichPayloadFromRelations.bind(EntityCore)
      : enrichPayloadFromRelations;
    const payload = enrichFn(meta.discovery_payload || {}, relations, meta.knowledge_entry);
    meta.discovery_payload = payload;
    const stub = isStubEntry(post, meta);
    const heroImage = extractHeroImage(cleanContent, meta);
    const relationGroups = buildRelationGroups(relations, category);
    const facts = {};
    let missingSource = {};

    if (typeof EntityCore !== "undefined") {
      const resolved = EntityCore.resolveEntityFacts(post, meta, relations);
      if (resolved.identity && resolved.identity.canonical_name) {
        meta.entity_profile = Object.assign({}, meta.entity_profile || {}, EntityCore.buildEntityProfile(post, meta));
      }
      if (resolved.taxonomy) meta.entity_taxonomy = resolved.taxonomy;

      if (category === "items") {
        const isResource = resolved.facts.item_type && resolved.facts.item_type.value === "Resource";
        if (isResource) {
          facts.item_type = { label: "Type", _html: renderCoreFact(resolved.facts.item_type, post) };
          facts.source_type = { label: "Source Type", _html: renderCoreFact(resolved.facts.source_type, post) };
          facts.source_detail = { label: "Source Detail", _html: renderCoreFact(resolved.facts.source_detail, post) };
          facts.rarity = { label: "Rarity", _html: renderCoreFact(resolved.facts.rarity, post) };
          facts.biome = { label: "Biome / Region", _html: renderCoreFact(resolved.facts.biome, post) };
        } else {
          facts.item_type = { label: "Item Type", _html: renderCoreFact(resolved.facts.item_type, post) };
          facts.subtype = { label: "Subtype", _html: renderCoreFact(resolved.facts.subtype, post) };
          facts.rarity = { label: "Rarity", _html: renderCoreFact(resolved.facts.rarity, post) };
          facts.how_obtain = { label: "How to Obtain", _html: renderCoreFact(resolved.facts.how_obtain, post) };
          facts.dropped_by = { label: "Dropped By", _html: renderCoreFact(resolved.facts.dropped_by, post) };
          facts.biome = { label: "Biome / Region", _html: renderCoreFact(resolved.facts.biome, post) };
          if (resolved.facts.location && resolved.facts.location.status !== "unknown") {
            facts.location = { label: "Location Context", _html: renderCoreFact(resolved.facts.location, post) };
          }
          facts.effect = { label: "Effect / Use", _html: renderCoreFact(resolved.facts.effect, post) };
          facts.stats = { label: "Damage / Stats", _html: renderCoreFact(resolved.facts.stats, post) };
        }
        missingSource = resolved.facts;
      } else if (category === "creatures") {
        facts.creature_type = { label: "Type", _html: renderCoreFact(resolved.facts.creature_type, post) };
        facts.biome = { label: "Biome / Region", _html: renderCoreFact(resolved.facts.biome, post) };
        facts.observed_at = { label: "Observed At", _html: renderCoreFact(resolved.facts.observed_at, post) };
        facts.drops = { label: "Drops", _html: renderCoreFact(resolved.facts.drops, post) };
        facts.spawn = { label: "Spawn Conditions", _html: renderCoreFact(resolved.facts.spawn, post) };
        facts.time_weather = { label: "Time / Weather", _html: renderCoreFact(resolved.facts.time_weather, post) };
        facts.confidence = { label: "Confidence", _html: renderCoreFact(resolved.facts.confidence, post) };
        facts.rarity = { label: "Rarity", _html: renderCoreFact(resolved.facts.rarity, post) };
        missingSource = resolved.facts;
      } else if (category === "locations" || category === "biomes") {
        facts.place_type = { label: "Type", _html: renderCoreFact(resolved.facts.place_type, post) };
        facts.parent = { label: "Part Of", _html: renderCoreFact(resolved.facts.parent, post) };
        facts.climate = { label: "Climate", _html: renderCoreFact(resolved.facts.climate, post) };
        missingSource = resolved.facts;
      }
    } else {
      let classification = {};
      let factFields = [];
      if (category === "items") {
        classification = classifyItem(post.title, payload, relations);
        factFields = ["item_type", "subtype", "rarity", "effect", "stats", "how_obtain", "dropped_by", "found_in", "area"];
      } else if (category === "creatures") {
        classification = classifyCreature(post.title, payload, relations);
        factFields = ["creature_type", "habitat", "observed_at", "behavior", "drops", "spawn", "time_weather", "confidence", "rarity"];
      } else if (category === "locations" || category === "biomes") {
        classification = classifyLocation(post.title, payload, relations, category);
        factFields = ["place_type", "parent", "climate"];
      }
      factFields.forEach(function(key) {
        if (!classification[key]) return;
        const field = Object.assign({}, classification[key]);
        field._html = renderFieldValue(field, post);
        facts[key] = field;
      });
      missingSource = classification;
    }

    const missing = collectMissingFields(post, meta, payload, relations, missingSource);
    const sourceDiscovery = meta.knowledge_entry && (meta.knowledge_entry.source_post_slug || meta.knowledge_entry.source_post_id);
    const sourceUrl = sourceDiscovery
      ? (meta.knowledge_entry.source_post_slug
        ? "/wiki/post/?slug=" + encodeURIComponent(meta.knowledge_entry.source_post_slug)
        : "/wiki/post/?id=" + encodeURIComponent(meta.knowledge_entry.source_post_id))
      : "";

    let resolved = null;
    if (typeof EntityCore !== "undefined") {
      resolved = EntityCore.resolveEntityFacts(post, meta, relations);
    }
    let heroFacts = buildHeroFacts(category, resolved, relations, stub);
    if (category === "crafting" && typeof EntityCore !== "undefined" && EntityCore.isStationTypeEntry(meta, post)) {
      heroFacts = [
        { label: "Type", html: '<span class="bl-wiki-value">Station Type</span>' },
        { label: "Domain", html: '<span class="bl-wiki-value">System</span>' },
      ];
    }
    const detailBuilt = buildDetailSections(category, resolved, relations, missing, meta, post);
    const displayName = typeof EntityCore !== "undefined"
      ? EntityCore.getDisplayName(meta, post)
      : (post.title || "Untitled");
    let contentModelContext = null;
    if (typeof BoundLoreContentModelRegistry !== "undefined" && BoundLoreContentModelRegistry.resolveContentModelContext) {
      try {
        contentModelContext = BoundLoreContentModelRegistry.resolveContentModelContext({
          meta: meta,
          post: post,
          discovery_payload: payload,
        });
      } catch (err) {
        contentModelContext = null;
      }
    }
    let questEventContext = null;
    if (typeof BoundLoreQuestEventRegistry !== "undefined" && BoundLoreQuestEventRegistry.resolveQuestEventContext) {
      try {
        questEventContext = BoundLoreQuestEventRegistry.resolveQuestEventContext({
          meta: meta,
          post: post,
          discovery_payload: payload,
        });
      } catch (err) {
        questEventContext = null;
      }
    }
    let economyContext = null;
    if (typeof BoundLoreEconomyRegistry !== "undefined" && BoundLoreEconomyRegistry.resolveEconomyContext) {
      try {
        economyContext = BoundLoreEconomyRegistry.resolveEconomyContext({
          meta: meta,
          post: post,
          discovery_payload: payload,
        });
      } catch (err) {
        economyContext = null;
      }
    }
    let versionContext = null;
    if (typeof BoundLoreVersioning !== "undefined" && BoundLoreVersioning.resolveVersionContext) {
      try {
        versionContext = BoundLoreVersioning.resolveVersionContext({
          meta: meta,
          post: post,
          discovery_payload: payload,
        });
      } catch (err) {
        versionContext = null;
      }
    }
    let resourceNodeContext = null;
    if (typeof BoundLoreResourceNodeRegistry !== "undefined" && BoundLoreResourceNodeRegistry.resolveResourceNodeContext) {
      try {
        resourceNodeContext = BoundLoreResourceNodeRegistry.resolveResourceNodeContext({
          meta: meta,
          post: post,
          discovery_payload: payload,
        });
      } catch (err) {
        resourceNodeContext = null;
      }
    }
    let observationContext = null;
    if (typeof BoundLoreObservationContextRegistry !== "undefined" && BoundLoreObservationContextRegistry.resolveObservationContext) {
      try {
        observationContext = BoundLoreObservationContextRegistry.resolveObservationContext({
          meta: meta,
          post: post,
          discovery_payload: payload,
        });
      } catch (err) {
        observationContext = null;
      }
    }
    let creatureEncounterContext = null;
    if (typeof BoundLoreCreatureEncounterRegistry !== "undefined" && BoundLoreCreatureEncounterRegistry.resolveCreatureEncounterContext) {
      try {
        creatureEncounterContext = BoundLoreCreatureEncounterRegistry.resolveCreatureEncounterContext({
          meta: meta,
          post: post,
          discovery_payload: payload,
        });
      } catch (err) {
        creatureEncounterContext = null;
      }
    }
    let requirementUnlockContext = null;
    if (typeof BoundLoreRequirementUnlockRegistry !== "undefined" && BoundLoreRequirementUnlockRegistry.resolveRequirementUnlockContext) {
      try {
        requirementUnlockContext = BoundLoreRequirementUnlockRegistry.resolveRequirementUnlockContext({
          meta: meta,
          post: post,
          discovery_payload: payload,
        });
      } catch (err) {
        requirementUnlockContext = null;
      }
    }

    return {
      post: post,
      meta: meta,
      payload: payload,
      category: category,
      stub: stub,
      heroImage: heroImage,
      facts: facts,
      heroFacts: heroFacts,
      resolved: resolved,
      relations: relations,
      relationGroups: relationGroups,
      detailSections: detailBuilt.sections,
      usedRelationKeys: detailBuilt.usedKeys,
      missing: missing,
      sourceUrl: sourceUrl,
      sourceTitle: meta.knowledge_entry && meta.knowledge_entry.source_post_title,
      displayName: displayName,
      sourceDiscoveryHtml: (function() {
        if (!payload || !Object.keys(payload).length) return "";
        return buildSourceDiscoveryHtml(payload, meta, post, cleanContent);
      })(),
      contentModelContext: contentModelContext,
      questEventContext: questEventContext,
      economyContext: economyContext,
      versionContext: versionContext,
      resourceNodeContext: resourceNodeContext,
      observationContext: observationContext,
      creatureEncounterContext: creatureEncounterContext,
      requirementUnlockContext: requirementUnlockContext,
      supplementalHtml: "",
    };
  }

  function renderHeroFactsGrid(heroFacts) {
    if (!heroFacts || !heroFacts.length) return "";
    let html = '<dl class="bl-wiki-facts bl-wiki-hero-facts">';
    heroFacts.forEach(function(field) {
      html += '<div class="bl-wiki-fact">';
      html += "<dt>" + escapeHtml(field.label) + "</dt>";
      html += "<dd>" + (field.html || "") + "</dd>";
      html += "</div>";
    });
    html += "</dl>";
    return html;
  }

  function render(model) {
    if (!model) return "";
    const post = model.post;
    const itemSubtype = typeof EntityCore !== "undefined"
      ? EntityCore.resolveEntitySubtype(model.meta, post)
      : (model.meta && model.meta.entity_subtype) || "";
    const isResourceItem = String(model.category || "").toLowerCase() === "items" && itemSubtype === "resource";
    const isStationTypeItem = String(model.category || "").toLowerCase() === "crafting" && itemSubtype === "station_type";
    const categoryLabel = isResourceItem ? "Resource" : (isStationTypeItem ? "Station Type" : formatLabel(model.category));
    let html = '<article class="bl-wiki-entry">';

    html += '<section class="bl-wiki-hero">';
    html += '<div class="bl-wiki-hero-media">';
    if (model.heroImage) {
      html += '<figure class="bl-wiki-figure"><img src="' + escapeHtml(model.heroImage.url) + '" alt="' +
        escapeHtml(model.heroImage.label) + '" /><figcaption>' + escapeHtml(model.heroImage.label) + "</figcaption></figure>";
    } else {
      html += '<div class="bl-wiki-image-placeholder">';
      html += '<p class="bl-wiki-placeholder-title">No image submitted yet</p>';
      html += '<p class="bl-wiki-placeholder-copy">Screenshots and evidence help other players trust this entry.</p>';
      html += '<a class="bl-wiki-cta-quiet" href="' +
        escapeHtml(buildContributionUrl(post, { field: "image", intent: "add_image", meta: model.meta })) +
        '">Submit evidence</a>';
      html += "</div>";
    }
    html += "</div>";

    html += '<div class="bl-wiki-hero-copy">';
    html += '<p class="bl-wiki-kicker">' + escapeHtml(categoryLabel) + " Entry</p>";
    html += '<h2 class="bl-wiki-title">' + escapeHtml(model.displayName || "Untitled") + "</h2>";
    const itemSubtypeForEvidence = typeof EntityCore !== "undefined"
      ? EntityCore.resolveEntitySubtype(model.meta, { category: model.category, title: post && post.title })
      : (model.meta && model.meta.entity_subtype) || "";
    if (String(model.category || "").toLowerCase() === "items" && itemSubtypeForEvidence === "resource") {
      const evidenceBadges = renderEntryEvidenceBadges(model.meta, model.payload, { groupClassName: "bl-evidence-badges-hero" });
      if (evidenceBadges) html += evidenceBadges;
      const facetBadges = renderEntryFacetBadges(model.meta, post, { maxBadges: 4, groupClassName: "bl-facet-badges-hero" });
      if (facetBadges) html += facetBadges;
    }
    html += renderHeroFactsGrid(model.heroFacts);
    html += '<div class="bl-wiki-hero-actions">';
    html += '<a class="bl-wiki-primary-cta" href="' +
      escapeHtml(buildContributionUrl(post, { intent: "add_info", meta: model.meta })) +
      '">Add information</a>';
    if (String(model.category || "").toLowerCase() === "items" && itemSubtype !== "resource") {
      html += '<a class="bl-wiki-cta-quiet" href="' +
        escapeHtml(buildContributionUrl(post, { intent: "add_recipe", meta: model.meta })) +
        '">Add Recipe</a>';
    }
    html += "</div>";
    html += "</div>";
    html += "</section>";

    html += '<div class="bl-wiki-detail-grid">';
    (model.detailSections || []).forEach(function(section) {
      if (section.key === "missing") return;
      html += renderDetailSection(section, post, model.meta);
    });
    html += renderSourcesSection(model, post);
    html += renderSupplementalRelationGroups(model.relationGroups, model.category, model.usedRelationKeys);
    html += "</div>";

    const missingSection = (model.detailSections || []).find(function(s) { return s.key === "missing"; });
    if (missingSection) {
      html += renderDetailSection(missingSection, post, model.meta);
    }

    if (model.sourceDiscoveryHtml) {
      html += '<section class="bl-wiki-supplemental bl-wiki-supplemental-compact">' +
        model.sourceDiscoveryHtml + "</section>";
    }

    if (typeof BoundLoreContextSectionRenderer !== "undefined" &&
        BoundLoreContextSectionRenderer.shouldRenderAnyContext) {
      try {
        const contextEntry = {
          meta: model.meta,
          post: model.post,
          discovery_payload: model.payload,
        };
        const previewAdapter = typeof BoundLoreContextPreviewAdapter !== "undefined"
          ? BoundLoreContextPreviewAdapter
          : null;
        if (previewAdapter && previewAdapter.isPreviewActive && previewAdapter.isPreviewActive()) {
          const resolvedEntry = previewAdapter.resolvePreviewEntry(contextEntry);
          const diagnostics = previewAdapter.getPreviewDiagnostics(contextEntry);
          if (previewAdapter.shouldShowPreviewBanner && previewAdapter.shouldShowPreviewBanner()) {
            const bannerHtml = previewAdapter.renderPreviewBanner(
              previewAdapter.getActivePreviewMode(),
              diagnostics
            );
            if (bannerHtml) html += bannerHtml;
          }
          if (BoundLoreContextSectionRenderer.shouldRenderAnyContext(resolvedEntry)) {
            const contextHtml = BoundLoreContextSectionRenderer.renderContextSections(resolvedEntry, {
              mode: "read_only",
            });
            if (contextHtml) html += contextHtml;
          }
        } else if (BoundLoreContextSectionRenderer.shouldRenderAnyContext(contextEntry)) {
          const contextHtml = BoundLoreContextSectionRenderer.renderContextSections(contextEntry, {
            mode: "read_only",
          });
          if (contextHtml) html += contextHtml;
        }
      } catch (err) {
        /* P3 context renderer optional */
      }
    }

    html += "</article>";
    return html;
  }

  function contributionButton(post, label, intent) {
    return '<a class="btn-secondary bl-wiki-cta" href="' +
      escapeHtml(buildContributionUrl(post, { intent: intent })) + '">' + escapeHtml(label) + "</a>";
  }

  function renderFactsGrid(fields) {
    const entries = Object.keys(fields).map(function(key) { return fields[key]; })
      .filter(function(field) { return field && field.label; });
    if (!entries.length) return "";
    let html = '<dl class="bl-wiki-facts">';
    entries.forEach(function(field) {
      html += '<div class="bl-wiki-fact">';
      html += "<dt>" + escapeHtml(field.label) + "</dt>";
      html += "<dd>" + (field._html || "") + "</dd>";
      html += "</div>";
    });
    html += "</dl>";
    return html;
  }

  return {
    isWikiLayoutPost: isWikiLayoutPost,
    isStubEntry: isStubEntry,
    buildModel: buildModel,
    render: render,
    buildContributionUrl: buildContributionUrl,
    enrichPayloadFromRelations: enrichPayloadFromRelations,
    classifyItem: classifyItem,
    classifyCreature: classifyCreature,
    classifyLocation: classifyLocation,
  };
})();
