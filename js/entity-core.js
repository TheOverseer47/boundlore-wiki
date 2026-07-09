// ============================================
// Entity identity, fact resolution, taxonomy
// ============================================

window.EntityCore = (function() {
  const SKIP_VALUES = ["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"];
  const CONTEXT_SPLIT = /\s+(?:in|near|at|from|around|within)\s+/i;
  const ITEM_TYPES = ["weapon", "tool", "resource", "material", "consumable", "armor", "artifact", "quest_item", "unknown"];
  const BIOME_CANONICAL = {
    aquatic: "Aquatic",
    desert: "Desert",
    deserts: "Desert",
    forest: "Forest",
    forests: "Forest",
    frozen: "Frozen",
    grassland: "Grassland",
    grasslands: "Grassland",
    mountain: "Mountain",
    "rocky-mountainous": "Rocky & Mountainous",
    swamp: "Swamp",
    swampland: "Swamp",
    swamplands: "Swamp",
    swamps: "Swamp",
    cave: "Cave",
    ruins: "Ruins",
    settlement: "Settlement",
  };
  const BIOME_ALIASES = {
    swamplands: ["Swamplands", "Swampland", "Swamps"],
    swamp: ["Swamplands", "Swampland", "Swamps"],
    forest: ["Forests"],
    desert: ["Deserts"],
    grassland: ["Grasslands"],
  };
  const VAGUE_LOCATION_RE = /\b(?:near|close to|next to|by|around|beside)\b/i;
  const VAGUE_LOCATION_HINT_RE = /\b(?:campfire|camp|tree|river|hill|rock|bush|path|trail|field|clearing|pond|lake)\b/i;

  function meaningful(value) {
    const clean = String(value || "").trim();
    const lower = clean.toLowerCase();
    if (!clean || SKIP_VALUES.includes(lower)) return "";
    return clean;
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 120);
  }

  function normalizeTitleKey(title) {
    return String(title || "").trim().toLowerCase().replace(/\s+/g, " ");
  }

  function formatLabel(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
      .trim();
  }

  function normalizeRelationType(type) {
    if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.normalizeRelationType) {
      return KnowledgeRelations.normalizeRelationType(type);
    }
    return String(type || "related_discovery").toLowerCase();
  }

  function parseTitleContext(title) {
    const raw = meaningful(title);
    if (!raw) {
      return { canonical_name: "", context_title: "", context_location: "", biome_hint: "", location_hint: "" };
    }

    const parts = raw.split(CONTEXT_SPLIT);
    if (parts.length <= 1) {
      return {
        canonical_name: raw,
        context_title: "",
        context_location: "",
        biome_hint: "",
        location_hint: "",
      };
    }

    const canonical = parts[0].trim();
    let contextLocation = parts.slice(1).join(" ").trim();
    if (contextLocation && /^in\s+(?:near|at|around|by|close to|within)\b/i.test(contextLocation)) {
      contextLocation = contextLocation.replace(/^in\s+/i, "").trim();
    }
    const biomeHint = inferBiomeFromLocationLabel(contextLocation);
    return {
      canonical_name: canonical || raw,
      context_title: raw,
      context_location: contextLocation,
      biome_hint: biomeHint,
      location_hint: contextLocation,
    };
  }

  function normalizeBiomeKey(label) {
    const key = slugify(meaningful(label)).replace(/s$/i, function(m, offset, str) {
      const base = str.slice(0, -1);
      return BIOME_CANONICAL[base] ? base : m;
    });
    if (BIOME_CANONICAL[key]) return key;
    const compact = key.replace(/-/g, "");
    if (BIOME_CANONICAL[compact]) return compact;
    const words = meaningful(label).toLowerCase().split(/\s+/);
    if (words.length === 1 && BIOME_CANONICAL[words[0]]) return words[0];
    if (words.length === 1 && BIOME_CANONICAL[words[0].replace(/s$/, "")]) return words[0].replace(/s$/, "");
    return "";
  }

  function normalizeBiomeName(label) {
    const text = meaningful(label);
    if (!text) return "";
    if (text.includes("/")) {
      const parts = text.split("/").map(function(part) { return meaningful(part); }).filter(Boolean);
      for (let i = 0; i < parts.length; i += 1) {
        const key = normalizeBiomeKey(parts[i]);
        if (key) return BIOME_CANONICAL[key];
      }
    }
    const key = normalizeBiomeKey(text);
    if (key) return BIOME_CANONICAL[key];
    return "";
  }

  function isKnownBiomeName(label) {
    return !!normalizeBiomeName(label);
  }

  function getBiomeAliases(canonicalName) {
    const name = meaningful(canonicalName);
    if (!name) return [];
    const key = normalizeBiomeKey(name);
    const aliases = BIOME_ALIASES[key] || [];
    return aliases.filter(function(alias) {
      return normalizeTitleKey(alias) !== normalizeTitleKey(name);
    });
  }

  function isVagueLocationHint(label) {
    const text = meaningful(label);
    if (!text) return false;
    if (isKnownBiomeName(text)) return false;
    if (VAGUE_LOCATION_RE.test(text)) return true;
    if (text.split(/\s+/).length <= 4 && VAGUE_LOCATION_HINT_RE.test(text)) return true;
    return false;
  }

  function hasDefiniteLocationData(payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    return !!(meaningful(data.coordinates)
      || meaningful(data.landmark_name)
      || meaningful(data.location_id)
      || meaningful(data.map_marker));
  }

  function splitPlaceContext(text) {
    const raw = meaningful(text);
    if (!raw) {
      return { biome: "", location_hint: "", is_vague: false };
    }

    const biomeOnly = normalizeBiomeName(raw);
    if (biomeOnly && normalizeTitleKey(biomeOnly) === normalizeTitleKey(raw)) {
      return { biome: biomeOnly, location_hint: "", is_vague: false };
    }

    if (VAGUE_LOCATION_RE.test(raw)) {
      const nearIdx = raw.search(VAGUE_LOCATION_RE);
      const biomePart = raw.slice(0, nearIdx).trim().replace(/[/,]+$/g, "").trim();
      const hintPart = raw.slice(nearIdx).trim();
      const biome = normalizeBiomeName(biomePart) || "";
      return {
        biome: biome,
        location_hint: hintPart || raw,
        is_vague: true,
      };
    }

    const biome = normalizeBiomeName(raw);
    if (biome) return { biome: biome, location_hint: "", is_vague: false };
    if (isVagueLocationHint(raw)) {
      return { biome: "", location_hint: raw, is_vague: true };
    }
    return { biome: "", location_hint: raw, is_vague: false };
  }

  function inferBiomeFromLocationLabel(label) {
    const split = splitPlaceContext(label);
    return split.biome || "";
  }

  function classifyPlaceEntry(title, category, payload) {
    const data = payload && typeof payload === "object" ? payload : {};
    const cat = String(category || "").toLowerCase();
    const rawTitle = meaningful(data.entity_name) || meaningful(title);
    const split = splitPlaceContext(rawTitle);
    const regionBiome = normalizeBiomeName(data.region_name);
    const foundSplit = splitPlaceContext(data.found_in);
    const biomeName = regionBiome || split.biome || foundSplit.biome || "";
    const locationHint = meaningful(data.location_hint)
      || meaningful(data.encounter_context)
      || meaningful(data.observation_context)
      || (foundSplit.is_vague ? foundSplit.location_hint : "")
      || (split.is_vague ? split.location_hint : "");
    const hasCoords = hasDefiniteLocationData(data);
    let effectiveCategory = cat;
    let listVisibility = "normal";
    let canonicalName = rawTitle;

    if (biomeName && (isKnownBiomeName(rawTitle) || normalizeTitleKey(rawTitle) === normalizeTitleKey(biomeName))) {
      canonicalName = biomeName;
      effectiveCategory = "biomes";
      listVisibility = "biome";
    } else if (cat === "locations" && biomeName && !locationHint && !hasCoords) {
      canonicalName = biomeName;
      effectiveCategory = "biomes";
      listVisibility = "biome";
    } else if (cat === "locations" && (split.is_vague || foundSplit.is_vague || isVagueLocationHint(rawTitle)) && !hasCoords) {
      canonicalName = locationHint || rawTitle;
      effectiveCategory = "location_hint";
      listVisibility = "hint";
    } else if (cat === "locations" && biomeName) {
      canonicalName = rawTitle;
      listVisibility = hasCoords ? "location" : "candidate";
    }

    return {
      canonical_name: canonicalName,
      biome_name: biomeName,
      location_hint: locationHint,
      effective_category: effectiveCategory,
      list_visibility: listVisibility,
      is_vague: split.is_vague || foundSplit.is_vague || isVagueLocationHint(rawTitle),
      aliases: biomeName ? getBiomeAliases(biomeName) : [],
    };
  }

  function getEffectiveCategory(post, meta) {
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    return classifyPlaceEntry(post && post.title, post && post.category, payload).effective_category
      || String(post && post.category || "").toLowerCase();
  }

  function shouldExcludeFromLocationList(post, meta) {
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const info = classifyPlaceEntry(post && post.title, post && post.category, payload);
    return info.effective_category === "biomes"
      || info.effective_category === "location_hint"
      || info.list_visibility === "biome"
      || info.list_visibility === "hint";
  }

  function shouldIncludeInBiomeList(post, meta) {
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const info = classifyPlaceEntry(post && post.title, post && post.category, payload);
    return info.effective_category === "biomes" || info.list_visibility === "biome";
  }

  function entityNameMatches(label, canonicalName, entityKey, aliases) {
    const target = normalizeTitleKey(canonicalName);
    const text = normalizeTitleKey(label);
    if (!target || !text) return false;
    if (text === target) return true;
    if (normalizeBiomeName(label) && normalizeTitleKey(normalizeBiomeName(label)) === target) return true;
    const aliasList = Array.isArray(aliases) ? aliases : [];
    return aliasList.some(function(alias) {
      return normalizeTitleKey(alias) === text;
    });
  }

  function extractCanonicalIdentity(title, category, options) {
    const opts = options || {};
    const payload = opts.payload && typeof opts.payload === "object" ? opts.payload : {};
    const payloadName = meaningful(payload.entity_name);
    const payloadParsed = payloadName ? parseTitleContext(payloadName) : { canonical_name: "", context_location: "", location_hint: "" };
    const parsed = parseTitleContext(title);
    let canonical = payloadParsed.canonical_name || payloadName || parsed.canonical_name || meaningful(title);
    const cat = String(category || "").toLowerCase();

    if (payloadName && title && normalizeTitleKey(payloadName) !== normalizeTitleKey(title)) {
      const titleParsed = parseTitleContext(title);
      if (titleParsed.context_location && normalizeTitleKey(titleParsed.canonical_name) === normalizeTitleKey(payloadParsed.canonical_name || payloadName)) {
        canonical = payloadParsed.canonical_name || payloadName;
      }
    }

    if (!canonical) canonical = meaningful(title);

    return {
      canonical_name: canonical,
      display_name: canonical,
      context_title: parsed.context_title || payloadParsed.context_title || (title && normalizeTitleKey(title) !== normalizeTitleKey(canonical) ? title : ""),
      context_location: meaningful(payload.found_in) || parsed.context_location || payloadParsed.context_location || meaningful(payload.region_name) || "",
      biome_hint: meaningful(payload.region_name) || parsed.biome_hint || payloadParsed.biome_hint || inferBiomeFromLocationLabel(parsed.context_location || payloadParsed.context_location),
      location_hint: meaningful(payload.encounter_context) || meaningful(payload.location_hint) || parsed.location_hint || payloadParsed.location_hint || "",
      category: cat,
    };
  }

  function buildEntityKey(category, canonicalName) {
    const cat = String(category || "entry").toLowerCase();
    const slug = slugify(canonicalName);
    return cat + "|" + (slug || "entry");
  }

  function extractSlugSuffix(existingSlug) {
    const match = String(existingSlug || "").match(/-([0-9a-f]{4,8})$/i);
    return match ? match[1].toLowerCase() : "";
  }

  function buildCanonicalPostSlug(canonicalName, existingSlug) {
    const base = slugify(meaningful(canonicalName) || "entry");
    const suffix = extractSlugSuffix(existingSlug) || Math.random().toString(16).slice(2, 8);
    return base + "-" + suffix;
  }

  function slugLooksContextual(slug, canonicalName) {
    const rawSlug = String(slug || "").toLowerCase();
    const canonicalSlug = slugify(canonicalName || "");
    if (!rawSlug || !canonicalSlug) return false;
    if (rawSlug.indexOf(canonicalSlug) !== 0) return true;
    return /(?:^|-)(?:in|near|at|from|around|within)-/.test(rawSlug);
  }

  function applyCanonicalSlugMeta(post, meta) {
    const repairMeta = meta && typeof meta === "object" ? Object.assign({}, meta) : {};
    const payload = repairMeta.discovery_payload && typeof repairMeta.discovery_payload === "object"
      ? Object.assign({}, repairMeta.discovery_payload)
      : {};
    const identity = extractCanonicalIdentity(
      meaningful(payload.entity_name) || (post && post.title),
      post && post.category,
      { payload: payload }
    );
    const canonicalName = identity.canonical_name || meaningful(post && post.title) || "";
    if (!canonicalName) {
      return { meta: repairMeta, title: post && post.title, slug: post && post.slug, changed: false };
    }

    payload.entity_name = canonicalName;
    repairMeta.discovery_payload = payload;

    const canonicalSlug = buildCanonicalPostSlug(canonicalName, post && post.slug);
    const profile = buildEntityProfile(
      Object.assign({}, post || {}, { title: canonicalName }),
      repairMeta
    );
    profile.canonical_slug = canonicalSlug;
    profile.slug = canonicalSlug;

    const aliases = Array.isArray(profile.aliases) ? profile.aliases.slice() : [];
    const slugAliases = Array.isArray(repairMeta.entity_profile && repairMeta.entity_profile.slug_aliases)
      ? repairMeta.entity_profile.slug_aliases.slice()
      : [];
    const oldSlug = post && post.slug ? String(post.slug) : "";
    if (oldSlug && oldSlug !== canonicalSlug && slugAliases.indexOf(oldSlug) === -1) {
      slugAliases.push(oldSlug);
    }
    profile.slug_aliases = slugAliases.slice(0, 8);
    repairMeta.entity_profile = profile;

    const changed = (post && post.slug !== canonicalSlug) || (post && post.title !== canonicalName);
    return {
      meta: repairMeta,
      title: canonicalName,
      slug: canonicalSlug,
      previousSlug: oldSlug && oldSlug !== canonicalSlug ? oldSlug : null,
      changed: !!changed,
    };
  }

  function postMatchesSlugAlias(post, meta, slug) {
    const wanted = String(slug || "").toLowerCase();
    if (!wanted || !post) return false;
    if (String(post.slug || "").toLowerCase() === wanted) return true;
    const profile = meta && meta.entity_profile ? meta.entity_profile : {};
    if (String(profile.canonical_slug || "").toLowerCase() === wanted) return true;
    const aliases = Array.isArray(profile.slug_aliases) ? profile.slug_aliases : [];
    return aliases.some(function(alias) { return String(alias || "").toLowerCase() === wanted; });
  }

  function mapCategoryToEntityType(category) {
    const cat = String(category || "").toLowerCase();
    if (cat === "items") return "item";
    if (cat === "creatures") return "creature";
    if (cat === "biomes") return "biome";
    if (cat === "locations") return "location";
    if (cat === "classes") return "class";
    return cat || "entry";
  }

  function inferItemTaxonomy(canonicalName, payload) {
    const name = String(canonicalName || "").trim();
    const lower = name.toLowerCase();
    const out = {
      item_type: { value: "unknown", confidence: "unknown" },
      subtype: { values: [], confidence: "unknown" },
    };

    function setType(value, confidence) {
      out.item_type = { value: value, confidence: confidence || "inferred" };
    }

    function addSubtype(value, confidence) {
      if (!value) return;
      const key = String(value).toLowerCase();
      if (!out.subtype.values.some(function(v) { return String(v).toLowerCase() === key; })) {
        out.subtype.values.push(value);
      }
      if (confidence === "needs_confirmation") out.subtype.confidence = "needs_confirmation";
      else if (out.subtype.confidence === "unknown") out.subtype.confidence = confidence || "inferred";
    }

    if (/\bstaff\b|\bwand\b|\brod\b|\bscepter\b/i.test(name)) {
      setType("weapon", "inferred");
      addSubtype("staff", "needs_confirmation");
      addSubtype("magic_weapon", "needs_confirmation");
    } else if (/\bsword\b|\baxe\b|\bmace\b|\bhammer\b|\bdagger\b|\bblade\b|\bspear\b/i.test(name)) {
      setType("weapon", "inferred");
      addSubtype("melee_weapon", "needs_confirmation");
    } else if (/\bbow\b|\bcrossbow\b|\bsling\b/i.test(name)) {
      setType("weapon", "inferred");
      addSubtype("ranged_weapon", "needs_confirmation");
    } else if (/\bpotion\b|\belixir\b|\btonic\b|\bfood\b|\bmeal\b|\bdrink\b/i.test(name)) {
      setType("consumable", "inferred");
    } else if (/\bore\b|\bingot\b|\bwood\b|\bstone\b|\bfiber\b|\bleather\b|\bcloth\b|\bhide\b/i.test(name)) {
      setType("material", "inferred");
      addSubtype("resource", "needs_confirmation");
    } else if (/\bkey\b|\bmedallion\b|\bartifact\b|\brelic\b|\btoken\b/i.test(name)) {
      setType("artifact", "needs_confirmation");
    } else if (meaningful(payload && payload.discovery_type)) {
      setType(String(payload.discovery_type).toLowerCase(), "explicit");
    }

    if (/\bfire\b|\bflame\b|\bember\b/i.test(lower)) addSubtype("fire", "needs_confirmation");
    if (/\bfrost\b|\bice\b/i.test(lower)) addSubtype("frost", "needs_confirmation");
    if (/\bstorm\b|\blightning\b|\bthunder\b/i.test(lower)) addSubtype("storm", "needs_confirmation");
    if (/\bpoison\b|\btoxic\b/i.test(lower)) addSubtype("poison", "needs_confirmation");

    if (meaningful(payload && payload.discovery_type) && out.item_type.value === "unknown") {
      setType(String(payload.discovery_type).toLowerCase(), "explicit");
    }

    return out;
  }

  function mergeTaxonomy(existing, inferred) {
    const base = existing && typeof existing === "object" ? JSON.parse(JSON.stringify(existing)) : {};
    const next = inferred || {};
    if (!base.item_type || base.item_type.confidence === "unknown") {
      base.item_type = next.item_type || base.item_type || { value: "unknown", confidence: "unknown" };
    } else if (next.item_type && next.item_type.confidence === "explicit") {
      base.item_type = next.item_type;
    }
    base.subtype = base.subtype || { values: [], confidence: "unknown" };
    (next.subtype && next.subtype.values ? next.subtype.values : []).forEach(function(value) {
      if (!base.subtype.values.some(function(v) { return String(v).toLowerCase() === String(value).toLowerCase(); })) {
        base.subtype.values.push(value);
      }
    });
    if (next.subtype && next.subtype.confidence === "needs_confirmation") {
      base.subtype.confidence = "needs_confirmation";
    } else if (base.subtype.confidence === "unknown" && next.subtype) {
      base.subtype.confidence = next.subtype.confidence;
    }
    return base;
  }

  function factExplicit(value, source) {
    return { value: value, status: "explicit", source: source || "payload" };
  }

  function factDerived(value, source, derivedFrom) {
    return { value: value, status: "derived", source: source || "relation", derived_from: derivedFrom || null };
  }

  function factInferred(value, source) {
    return { value: value, status: "inferred", source: source || "name", confidence: "inferred" };
  }

  function factNeedsConfirmation(value, source) {
    return { value: value, status: "needs_confirmation", source: source || "name" };
  }

  function factUnknown() {
    return { value: "", status: "unknown", source: null };
  }

  function relationRef(rel) {
    if (!rel) return null;
    return {
      title: getRelationDisplayName(rel),
      id: rel.id || null,
      slug: rel.slug || null,
      entity_key: rel.target_entity_key || rel.entity_key || buildEntityKey(rel.category || rel.group, getRelationDisplayName(rel)),
      category: rel.category || null,
      relation_type: rel.relation_type || null,
      confidence: rel.confidence || null,
      auto_inferred: !!rel.auto_inferred,
    };
  }

  function pickRelations(relations, types) {
    const out = [];
    const seen = new Set();
    (Array.isArray(relations) ? relations : []).forEach(function(rel) {
      if (!rel || !rel.title) return;
      const type = normalizeRelationType(rel.relation_type);
      if (!types.includes(type)) return;
      const key = normalizeTitleKey(rel.title) + "|" + type;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(rel);
    });
    return out;
  }

  function firstRelation(relations, types) {
    const list = pickRelations(relations, types);
    return list.length ? list[0] : null;
  }

  function extractBiomeContext(relations, payload) {
    const biomeRel = pickRelations(relations, ["located_in", "part_of"]).find(function(rel) {
      return String(rel.target_entity_type || "").toLowerCase() === "biome"
        || String(rel.category || "").toLowerCase() === "biomes"
        || isKnownBiomeName(rel.title);
    });
    const locationRel = firstRelation(relations, ["found_in", "observed_in", "found_near"]);
    const rawLocation = meaningful(payload && payload.location_hint)
      || meaningful(payload && payload.encounter_context)
      || meaningful(payload && payload.observation_context)
      || meaningful(payload && payload.found_in)
      || (locationRel && locationRel.title)
      || "";
    const locationSplit = splitPlaceContext(rawLocation);
    const biome = normalizeBiomeName(payload && payload.region_name)
      || (biomeRel && normalizeBiomeName(biomeRel.canonical_target_name || biomeRel.title))
      || locationSplit.biome
      || normalizeBiomeName(payload && payload.biome_context ? formatLabel(payload.biome_context) : "");
    const locationHint = locationSplit.is_vague ? locationSplit.location_hint : "";
    const location = locationHint
      || (rawLocation && normalizeTitleKey(rawLocation) !== normalizeTitleKey(biome) ? rawLocation : "");
    return {
      biome: biome,
      location: location,
      location_hint: locationHint,
      biome_relation: biomeRel,
      location_relation: locationRel,
    };
  }

  function resolveItemFacts(post, meta, relations) {
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const identity = extractCanonicalIdentity(post && post.title, post && post.category, { payload: payload });
    const taxonomy = mergeTaxonomy(
      meta && meta.entity_taxonomy,
      inferItemTaxonomy(identity.canonical_name, payload)
    );
    const place = extractBiomeContext(relations, payload);
    const droppedRel = firstRelation(relations, ["dropped_by"]);
    const droppedByRaw = meaningful(payload.dropped_by) || (droppedRel && droppedRel.title) || "";
    const droppedBy = droppedRel && (droppedRel.canonical_target_name || extractCanonicalIdentity(droppedRel.title, "creatures").canonical_name)
      ? (droppedRel.canonical_target_name || extractCanonicalIdentity(droppedRel.title, "creatures").canonical_name)
      : extractCanonicalIdentity(droppedByRaw, "creatures").canonical_name || droppedByRaw;

    const facts = {
      item_type: taxonomy.item_type && taxonomy.item_type.value !== "unknown"
        ? (taxonomy.item_type.confidence === "needs_confirmation"
          ? factNeedsConfirmation(formatLabel(taxonomy.item_type.value), "taxonomy")
          : factInferred(formatLabel(taxonomy.item_type.value), "taxonomy"))
        : factUnknown(),
      subtype: taxonomy.subtype && taxonomy.subtype.values.length
        ? (taxonomy.subtype.confidence === "needs_confirmation"
          ? factNeedsConfirmation(taxonomy.subtype.values.map(formatLabel).join(" · "), "taxonomy")
          : factInferred(taxonomy.subtype.values.map(formatLabel).join(" · "), "taxonomy"))
        : factUnknown(),
      rarity: meaningful(payload.rarity) ? factExplicit(formatLabel(payload.rarity), "payload") : factUnknown(),
      dropped_by: droppedBy
        ? factDerived(droppedBy, droppedRel ? "relation" : "payload", null)
        : factUnknown(),
      how_obtain: factUnknown(),
      biome: place.biome ? factDerived(place.biome, place.biome_relation ? "relation" : "payload", null) : factUnknown(),
      location: place.location_hint
        ? factDerived(place.location_hint, "context", null)
        : (place.location && normalizeTitleKey(place.location) !== normalizeTitleKey(place.biome)
          ? factDerived(place.location, place.location_relation ? "relation" : "payload", null)
          : factUnknown()),
      effect: meaningful(payload.item_effect) ? factExplicit(payload.item_effect, "payload") : factUnknown(),
      stats: factUnknown(),
    };

    const statParts = [];
    if (meaningful(payload.damage)) statParts.push("Damage: " + payload.damage);
    if (meaningful(payload.scaling_power)) statParts.push("Scaling: " + payload.scaling_power);
    if (meaningful(payload.durability)) statParts.push("Durability: " + payload.durability);
    if (statParts.length) {
      let statValue = statParts.join(" · ");
      if (meaningful(payload.stat_conditions)) statValue += " (" + payload.stat_conditions + ")";
      facts.stats = factExplicit(statValue, "payload");
    }

    if (facts.dropped_by.status !== "unknown") {
      facts.how_obtain = factDerived("Dropped by " + facts.dropped_by.value, "derived", "dropped_by");
    } else if (meaningful(payload.source_type)) {
      facts.how_obtain = factExplicit(formatLabel(payload.source_type), "payload");
    }

    if (facts.dropped_by.relation_ref) facts.dropped_by.relation_ref = relationRef(droppedRel);
    if (facts.biome.relation_ref) facts.biome.relation_ref = relationRef(place.biome_relation);
    if (facts.location.relation_ref) facts.location.relation_ref = relationRef(place.location_relation);
    if (droppedRel) facts.dropped_by.relation_ref = relationRef(droppedRel);
    if (place.biome_relation) facts.biome.relation_ref = relationRef(place.biome_relation);
    if (place.location_relation) facts.location.relation_ref = relationRef(place.location_relation);

    return { identity: identity, taxonomy: taxonomy, facts: facts };
  }

  function resolveCreatureFacts(post, meta, relations) {
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const identity = extractCanonicalIdentity(post && post.title, post && post.category, { payload: payload });
    const place = extractBiomeContext(relations, payload);
    const dropRels = pickRelations(relations, ["drops"]);

    const facts = {
      creature_type: meaningful(payload.discovery_type)
        ? factExplicit(formatLabel(payload.discovery_type), "payload")
        : factInferred("Creature", "category"),
      biome: place.biome ? factDerived(place.biome, place.biome_relation ? "relation" : "payload", null) : factUnknown(),
      observed_at: factUnknown(),
      drops: factUnknown(),
      spawn: meaningful(payload.spawn_conditions) ? factExplicit(payload.spawn_conditions, "payload") : factUnknown(),
      behavior: factUnknown(),
      time_weather: factUnknown(),
      confidence: meaningful(payload.confidence_level) ? factExplicit(formatLabel(payload.confidence_level), "payload") : factUnknown(),
      rarity: meaningful(payload.rarity) ? factExplicit(formatLabel(payload.rarity), "payload") : factUnknown(),
    };

    const observedRel = firstRelation(relations, ["observed_in", "found_near", "found_in"]);
    const observed = meaningful(payload.location_hint)
      || meaningful(payload.encounter_context)
      || meaningful(payload.observation_context)
      || meaningful(payload.found_in)
      || (observedRel && observedRel.title)
      || identity.context_location;
    if (observed) {
      const observedSplit = splitPlaceContext(observed);
      if (observedSplit.is_vague || isVagueLocationHint(observed)) {
        facts.observed_at = factDerived(observedSplit.location_hint || observed, "context", null);
      } else {
        facts.observed_at = factDerived(observed, observedRel ? "relation" : "payload", null);
      }
    }

    if (meaningful(payload.dropped_items)) {
      facts.drops = factExplicit(payload.dropped_items, "payload");
    } else if (dropRels.length) {
      facts.drops = factDerived(dropRels.map(function(r) { return r.title; }).join(", "), "relation", null);
      facts.drops.relations = dropRels.map(relationRef);
    }

    if (meaningful(payload.behavior)) {
      let behaviorValue = payload.behavior;
      if (meaningful(payload.behavior_conditions)) behaviorValue += " (" + payload.behavior_conditions + ")";
      facts.behavior = factExplicit(behaviorValue, "payload");
    }

    const time = meaningful(payload.time_of_day);
    const weather = meaningful(payload.weather_condition);
    if (time || weather) facts.time_weather = factExplicit([time, weather].filter(Boolean).join(" · "), "payload");
    else if (meaningful(payload.time_weather)) facts.time_weather = factExplicit(payload.time_weather, "payload");

    return { identity: identity, taxonomy: null, facts: facts };
  }

  function resolveLocationFacts(post, meta, relations) {
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const placeInfo = classifyPlaceEntry(post && post.title, post && post.category, payload);
    const identity = extractCanonicalIdentity(post && post.title, post && post.category, { payload: payload });
    if (placeInfo.canonical_name) {
      identity.canonical_name = placeInfo.canonical_name;
      identity.display_name = placeInfo.canonical_name;
    }
    const effectiveCategory = placeInfo.effective_category === "location_hint"
      ? "locations"
      : (placeInfo.effective_category || String(post && post.category || "").toLowerCase());
    const isBiome = effectiveCategory === "biomes";
    const isHint = placeInfo.effective_category === "location_hint" || placeInfo.list_visibility === "hint";
    let parentName = placeInfo.biome_name
      || (meaningful(payload.region_name) ? (normalizeBiomeName(payload.region_name) || payload.region_name) : "");
    if (!parentName && post && post.slug) {
      // Legacy slugs like "swamplands-near-a-campfire" still carry the biome.
      const slugWords = String(post.slug).replace(/-[0-9a-f]{4,}$/i, "").replace(/-/g, " ");
      const slugSplit = splitPlaceContext(slugWords);
      if (slugSplit.biome) parentName = slugSplit.biome;
    }
    // A biome is never "part of" itself.
    if (parentName && normalizeTitleKey(parentName) === normalizeTitleKey(identity.canonical_name)) {
      parentName = "";
    }
    const facts = {
      place_type: factExplicit(isBiome ? "Biome" : (isHint ? "Encounter context" : "Location"), "category"),
      parent: parentName ? factExplicit(parentName, "biome") : factUnknown(),
      climate: meaningful(payload.climate) ? factExplicit(formatLabel(payload.climate), "payload") : factUnknown(),
    };
    if (isHint) {
      facts.location_hint = placeInfo.location_hint
        ? factDerived(placeInfo.location_hint, "context", null)
        : factUnknown();
      facts.needs_details = factExplicit("Coordinates or landmark data still missing", "classification");
    }
    return {
      identity: identity,
      taxonomy: null,
      facts: facts,
      place_info: placeInfo,
    };
  }

  function resolveEntityFacts(post, meta, relations) {
    const cat = String(post && post.category || "").toLowerCase();
    const effectiveCat = getEffectiveCategory(post, meta);
    const viewPost = effectiveCat && effectiveCat !== cat
      ? Object.assign({}, post, { category: effectiveCat })
      : post;
    if (effectiveCat === "items" || cat === "items") return resolveItemFacts(viewPost, meta, relations);
    if (effectiveCat === "creatures" || cat === "creatures") return resolveCreatureFacts(viewPost, meta, relations);
    if (effectiveCat === "biomes" || effectiveCat === "location_hint" || cat === "locations" || cat === "biomes") {
      return resolveLocationFacts(viewPost, meta, relations);
    }
    const identity = extractCanonicalIdentity(post && post.title, post && post.category, {
      payload: meta && meta.discovery_payload,
    });
    return { identity: identity, taxonomy: null, facts: {} };
  }

  function buildEntityProfile(post, meta, options) {
    const opts = options || {};
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const identity = extractCanonicalIdentity(post && post.title, post && post.category, { payload: payload });
    const canonical = identity.canonical_name || meaningful(post && post.title) || "Entry";
    const key = buildEntityKey(post && post.category, canonical);
    const taxonomy = mergeTaxonomy(
      meta && meta.entity_taxonomy,
      String(post && post.category || "").toLowerCase() === "items"
        ? inferItemTaxonomy(canonical, payload)
        : null
    );
    const status = meta && meta.knowledge_entry && meta.knowledge_entry.status
      ? meta.knowledge_entry.status
      : (meta && meta.knowledge_entry && meta.knowledge_entry.completeness === "stub" ? "needs_details" : "partial");

    return {
      entity_key: key,
      canonical_name: canonical,
      display_name: canonical,
      context_title: identity.context_title || "",
      context_location: identity.context_location || "",
      category: String(post && post.category || "").toLowerCase(),
      entity_type: mapCategoryToEntityType(post && post.category),
      slug: post && post.slug ? post.slug : null,
      canonical_slug: null,
      slug_aliases: [],
      post_id: post && post.id ? post.id : null,
      status: status,
      aliases: Array.isArray(meta && meta.entity_profile && meta.entity_profile.aliases)
        ? meta.entity_profile.aliases.slice(0, 8)
        : [],
      biome_primary: identity.biome_hint || meaningful(payload.region_name) || "",
      location_context: identity.location_hint || meaningful(payload.found_in) || "",
      source_post_id: meta && meta.knowledge_entry && meta.knowledge_entry.source_post_id || null,
      source_post_slug: meta && meta.knowledge_entry && meta.knowledge_entry.source_post_slug || null,
      source_post_title: meta && meta.knowledge_entry && meta.knowledge_entry.source_post_title || null,
      taxonomy: taxonomy,
    };
  }

  function resolveRelationCategory(rel) {
    const category = String(rel && (rel.category || rel.group) || "").toLowerCase();
    const entityType = String(rel && rel.target_entity_type || "").toLowerCase();
    const relType = normalizeRelationType(rel && rel.relation_type);

    if (entityType === "biome" || category === "biomes") return "biomes";
    if (entityType === "creature" || entityType === "monster" || entityType === "npc" || entityType === "boss" || category === "creatures") {
      return "creatures";
    }
    if (entityType === "item" || category === "items") return "items";
    if (entityType === "discovery" || category === "discoveries") return "discoveries";
    if (entityType === "location" || category === "locations") {
      if (rel && rel.title && isKnownBiomeName(rel.title)) return "biomes";
      if (rel && rel.title && isVagueLocationHint(rel.title)) return "location_hint";
      return "locations";
    }

    if (relType === "drops") return "items";
    if (relType === "dropped_by") return "creatures";

    const title = meaningful(rel && (rel.canonical_target_name || rel.title));
    if (title) {
      const itemTax = inferItemTaxonomy(title, {});
      if (itemTax.item_type && itemTax.item_type.value !== "unknown") return "items";
      if (/\b(staff|sword|bow|wand|rod|axe|armor|potion|ring|amulet|shield|helmet|boots|ore|ingot|material|weapon|tool|consumable)\b/i.test(title)) {
        return "items";
      }
      if (/\b(ogre|mage|dragon|wolf|spider|boss|beast|monster|creature|goblin|troll|demon|undead|npc|firefrog)\b/i.test(title)) {
        return "creatures";
      }
    }

    return category || "";
  }

  function getRelationDisplayName(rel) {
    if (!rel) return "Entry";
    if (meaningful(rel.display_name)) return rel.display_name;
    const category = resolveRelationCategory(rel);
    if (meaningful(rel.canonical_target_name)) {
      const biome = normalizeBiomeName(rel.canonical_target_name);
      if (biome && category === "biomes") return biome;
      return rel.canonical_target_name;
    }
    const biome = normalizeBiomeName(rel.title);
    if (biome && (category === "biomes" || rel.target_entity_type === "biome")) return biome;
    const identity = extractCanonicalIdentity(rel.title, category);
    return identity.canonical_name || meaningful(rel.title) || "Entry";
  }

  function getRelationContextNote(rel) {
    if (!rel) return "";
    if (meaningful(rel.context_note)) return rel.context_note;
    const display = getRelationDisplayName(rel);
    const raw = meaningful(rel.title);
    if (!raw || normalizeTitleKey(raw) === normalizeTitleKey(display)) return "";
    const parsed = parseTitleContext(raw);
    if (parsed.location_hint && isVagueLocationHint(parsed.location_hint)) {
      return parsed.location_hint;
    }
    if (parsed.context_location && normalizeTitleKey(parsed.context_location) !== normalizeTitleKey(display)) {
      return parsed.context_location;
    }
    return "";
  }

  function getSourceContextLabel(sourceTitle) {
    const raw = meaningful(sourceTitle);
    if (!raw) return "";
    const canonical = extractCanonicalIdentity(raw, "discoveries").canonical_name || raw;
    if (normalizeTitleKey(canonical) !== normalizeTitleKey(raw)) return canonical;
    return raw;
  }

  function enrichRelation(rel, sourcePost) {
    const built = Object.assign({}, rel || {});
    if (!built.title) return built;
    let category = resolveRelationCategory(built);
    if (isKnownBiomeName(built.title) && category === "locations") {
      built.category = "biomes";
      built.target_entity_type = "biome";
      category = "biomes";
    }
    built.canonical_target_name = extractCanonicalIdentity(built.title, category).canonical_name || built.title;
    const biome = normalizeBiomeName(built.canonical_target_name);
    if (biome && category === "biomes") built.canonical_target_name = biome;
    built.display_name = getRelationDisplayName(built);
    built.context_note = getRelationContextNote(built);
    built.target_entity_key = built.target_entity_key || buildEntityKey(category, built.canonical_target_name);
    if (built.id) built.target_post_id = built.id;
    if (built.slug) built.target_post_slug = built.slug;
    if (sourcePost && sourcePost.id) built.source_post_id = built.source_post_id || sourcePost.id;
    return built;
  }

  function enrichRelations(relations, sourcePost) {
    return (Array.isArray(relations) ? relations : []).map(function(rel) {
      return enrichRelation(rel, sourcePost);
    });
  }

  const ENTITY_DOMAINS = {
    PLACE: "PLACE",
    BEING: "BEING",
    OBJECT: "OBJECT",
    SYSTEM: "SYSTEM",
    KNOWLEDGE: "KNOWLEDGE",
    EVENT: "EVENT",
    COMMUNITY: "COMMUNITY",
    META: "META",
  };

  const T3_RESERVED_SLUG_PREFIXES = ["quest-", "class-", "talent-", "event-", "faction-"];

  function inferEntityDomainFromCategory(category) {
    const cat = String(category || "").toLowerCase();
    if (typeof BoundLoreRelationsRegistry !== "undefined" && BoundLoreRelationsRegistry.getDomainForCategory) {
      const fromRegistry = BoundLoreRelationsRegistry.getDomainForCategory(cat);
      if (fromRegistry) return fromRegistry;
    }
    const map = {
      biomes: ENTITY_DOMAINS.PLACE,
      locations: ENTITY_DOMAINS.PLACE,
      dungeons: ENTITY_DOMAINS.PLACE,
      creatures: ENTITY_DOMAINS.BEING,
      items: ENTITY_DOMAINS.OBJECT,
      crafting: ENTITY_DOMAINS.SYSTEM,
      classes: ENTITY_DOMAINS.SYSTEM,
      lore: ENTITY_DOMAINS.KNOWLEDGE,
      guides: ENTITY_DOMAINS.META,
      news: ENTITY_DOMAINS.META,
      guilds: ENTITY_DOMAINS.COMMUNITY,
      community: ENTITY_DOMAINS.COMMUNITY,
    };
    return map[cat] || "";
  }

  function inferEntitySubtypeFromCategoryAndPayload(category, payload, meta, post) {
    const cat = String(category || "").toLowerCase();
    const data = payload && typeof payload === "object" ? payload : {};
    const m = meta && typeof meta === "object" ? meta : {};
    if (m.entity_subtype) return String(m.entity_subtype).slice(0, 40);

    if (cat === "biomes") return "biome";

    if (cat === "creatures") {
      const dtype = String(data.discovery_type || "").toLowerCase();
      if (dtype === "boss" || m.place_role === "boss") return "boss";
      if (dtype === "elite") return "elite";
      if (dtype === "mount" || m.mount_rideable) return "mount";
      const sub = String(m.subcategory || "").toLowerCase();
      if (sub === "mounts") return "mount";
      if (sub === "npcs") return "npc";
      if (sub === "monsters" || dtype === "monster") return "creature";
      return "creature";
    }

    if (cat === "items") {
      const sub = String(m.subcategory || "").toLowerCase();
      if (sub === "weapons") return "weapon";
      if (sub === "armor") return "armor";
      const itemType = String(data.item_type || data.discovery_type || "").toLowerCase();
      if (itemType === "resource" || itemType === "material") return "resource";
      if (itemType === "tool") return "tool";
      if (itemType === "consumable") return "consumable";
      if (itemType === "building_part") return "building_part";
      if (itemType === "vehicle_boat" || itemType === "boat") return "vehicle_boat";
      return "item_generic";
    }

    if (cat === "locations" || cat === "dungeons") {
      const placeInfo = classifyPlaceEntry(post && post.title, category, data);
      if (placeInfo.effective_category === "location_hint") return "location_hint";
      if (placeInfo.effective_category === "biomes") return "biome";
      const placeType = String(data.discovery_type || data.place_type || m.place_role || "").toLowerCase();
      if (["dungeon", "ruin", "cave", "temple", "landmark", "settlement", "waterbody"].indexOf(placeType) >= 0) {
        return placeType;
      }
      if (cat === "dungeons") return "dungeon";
      return "landmark";
    }

    if (cat === "lore") return "lore_book";
    if (cat === "crafting") return "recipe";
    if (cat === "guilds") return "guild";
    if (cat === "guides") return "guide";
    if (cat === "news") return "news";
    if (cat === "community") return "community";
    return "";
  }

  function resolveEntityDomain(metaOrPost, maybePost) {
    let meta = null;
    let post = null;
    if (maybePost) {
      meta = metaOrPost && typeof metaOrPost === "object" ? metaOrPost : {};
      post = maybePost;
    } else if (metaOrPost && metaOrPost.category != null && metaOrPost.title != null && !metaOrPost.discovery_payload) {
      post = metaOrPost;
      meta = {};
    } else {
      meta = metaOrPost && typeof metaOrPost === "object" ? metaOrPost : {};
    }
    if (meta.entity_domain) return String(meta.entity_domain);
    const category = (post && post.category) || meta.category || "";
    return inferEntityDomainFromCategory(category) || "";
  }

  function resolveEntitySubtype(metaOrPost, maybePost) {
    let meta = null;
    let post = null;
    if (maybePost) {
      meta = metaOrPost && typeof metaOrPost === "object" ? metaOrPost : {};
      post = maybePost;
    } else if (metaOrPost && metaOrPost.category != null && metaOrPost.title != null && !metaOrPost.discovery_payload) {
      post = metaOrPost;
      meta = {};
    } else {
      meta = metaOrPost && typeof metaOrPost === "object" ? metaOrPost : {};
    }
    if (meta.entity_subtype) return String(meta.entity_subtype);
    const category = (post && post.category) || meta.category || "";
    const payload = meta.discovery_payload || {};
    return inferEntitySubtypeFromCategoryAndPayload(category, payload, meta, post) || "";
  }

  function normalizeEntityClassification(meta, post) {
    const out = Object.assign({}, meta || {});
    const p = post || {};
    const category = p.category || out.category || "";
    const payload = out.discovery_payload && typeof out.discovery_payload === "object"
      ? out.discovery_payload
      : {};

    if (!out.entity_domain) {
      const domain = inferEntityDomainFromCategory(category);
      if (domain) out.entity_domain = domain;
    }
    if (!out.entity_subtype) {
      const subtype = inferEntitySubtypeFromCategoryAndPayload(category, payload, out, p);
      if (subtype) out.entity_subtype = subtype;
    }
    return out;
  }

  function isReservedT3Slug(slug) {
    if (typeof BoundLoreRelationsRegistry !== "undefined" && BoundLoreRelationsRegistry.isReservedT3Slug) {
      return BoundLoreRelationsRegistry.isReservedT3Slug(slug);
    }
    const s = String(slug || "").trim().toLowerCase();
    return T3_RESERVED_SLUG_PREFIXES.some(function(prefix) {
      return s.indexOf(prefix) === 0;
    });
  }

  function normalizeEntityMeta(post, meta, options) {
    const opts = Object.assign({ repairTitle: false, repairPayload: true }, options || {});
    let out = Object.assign({}, meta || {});
    out = normalizeEntityClassification(out, post);
    const payload = out.discovery_payload && typeof out.discovery_payload === "object"
      ? Object.assign({}, out.discovery_payload)
      : {};

    const identity = extractCanonicalIdentity(post && post.title, post && post.category, { payload: payload });
    const placeInfo = classifyPlaceEntry(post && post.title, post && post.category, payload);
    const profile = buildEntityProfile(post, out);
    if (placeInfo.canonical_name) {
      profile.canonical_name = placeInfo.canonical_name;
      profile.display_name = placeInfo.canonical_name;
      profile.entity_key = buildEntityKey(placeInfo.effective_category === "biomes" ? "biomes" : profile.category, placeInfo.canonical_name);
    }
    if (placeInfo.biome_name) profile.biome_primary = placeInfo.biome_name;
    if (placeInfo.location_hint) profile.location_context = placeInfo.location_hint;
    if (placeInfo.aliases && placeInfo.aliases.length) {
      profile.aliases = Array.from(new Set((profile.aliases || []).concat(placeInfo.aliases))).slice(0, 8);
    }
    if (placeInfo.effective_category === "biomes") {
      profile.category = "biomes";
      profile.entity_type = "biome";
    }
    out.entity_profile = Object.assign({}, out.entity_profile || {}, profile);

    if (opts.repairPayload) {
      if (!meaningful(payload.entity_name) && profile.canonical_name) {
        payload.entity_name = profile.canonical_name;
      }
      if (placeInfo.biome_name) {
        payload.region_name = placeInfo.biome_name;
        if (!payload.biome_context) payload.biome_context = normalizeBiomeKey(placeInfo.biome_name) || "swamp";
      } else if (identity.biome_hint && !meaningful(payload.region_name)) {
        const normalizedBiome = normalizeBiomeName(identity.biome_hint);
        payload.region_name = normalizedBiome || identity.biome_hint;
      }
      if (placeInfo.location_hint) {
        payload.location_hint = placeInfo.location_hint;
        payload.encounter_context = placeInfo.location_hint;
        if (placeInfo.is_vague && !hasDefiniteLocationData(payload)) {
          if (isVagueLocationHint(payload.found_in)) delete payload.found_in;
        }
      } else if (identity.location_hint && !meaningful(payload.found_in)) {
        if (isVagueLocationHint(identity.location_hint)) {
          payload.location_hint = identity.location_hint;
          payload.encounter_context = identity.location_hint;
        } else {
          payload.found_in = identity.location_hint;
        }
      }
      if (payload.world_name && String(payload.world_name).toLowerCase() === "unknown") {
        delete payload.world_name;
      }
      out.discovery_payload = payload;
    }

    if (String(post && post.category || "").toLowerCase() === "items") {
      out.entity_taxonomy = mergeTaxonomy(out.entity_taxonomy, inferItemTaxonomy(profile.canonical_name, payload));
    }

    if (out.knowledge_entry && typeof out.knowledge_entry === "object") {
      out.knowledge_entry = Object.assign({}, out.knowledge_entry);
      if (!out.knowledge_entry.canonical_name) out.knowledge_entry.canonical_name = profile.canonical_name;
      if (!out.knowledge_entry.entity_key) out.knowledge_entry.entity_key = profile.entity_key;
    }

    if (Array.isArray(out.knowledge_graph && out.knowledge_graph.relations)) {
      out.knowledge_graph = {
        relations: enrichRelations(out.knowledge_graph.relations, post).map(function(rel) {
          return sanitizeRelationForStorage(rel);
        }),
      };
    }

    if (Array.isArray(out.discovery_relations)) {
      out.discovery_relations = enrichRelations(out.discovery_relations, post).map(sanitizeRelationForStorage);
    }

    const repair = {
      meta: out,
      canonical_name: profile.canonical_name,
      should_fix_title: false,
      suggested_title: profile.canonical_name,
      effective_category: placeInfo.effective_category,
      should_fix_category: placeInfo.effective_category
        && placeInfo.effective_category !== String(post && post.category || "").toLowerCase()
        && placeInfo.effective_category !== "location_hint",
    };

    if (opts.repairTitle && post && post.title && profile.canonical_name) {
      if (normalizeTitleKey(post.title) !== normalizeTitleKey(profile.canonical_name)
        && (out.knowledge_entry && out.knowledge_entry.auto_created || out.discovery_record_status === "stub")) {
        repair.should_fix_title = true;
      }
    }

    return repair;
  }

  function sanitizeRelationForStorage(rel) {
    const built = enrichRelation(rel);
    return {
      group: String(built.group || "").slice(0, 40),
      relation_type: String(built.relation_type || "related_discovery").slice(0, 40),
      title: String(built.title || "").slice(0, 140),
      canonical_target_name: String(built.canonical_target_name || built.title || "").slice(0, 140),
      target_entity_key: built.target_entity_key ? String(built.target_entity_key).slice(0, 160) : null,
      id: built.id || null,
      slug: built.slug ? String(built.slug).slice(0, 160) : null,
      category: built.category ? String(built.category).slice(0, 60) : null,
      post_type: built.post_type ? String(built.post_type).slice(0, 40) : null,
      target_entity_type: built.target_entity_type ? String(built.target_entity_type).slice(0, 40) : null,
      confidence: Number.isFinite(Number(built.confidence)) ? Math.max(0, Math.min(100, Number(built.confidence))) : null,
      auto_inferred: !!built.auto_inferred,
      resolved: !!built.resolved,
      source_post_id: built.source_post_id || null,
      source_post_slug: built.source_post_slug ? String(built.source_post_slug).slice(0, 160) : null,
      source_post_title: built.source_post_title ? String(built.source_post_title).slice(0, 140) : null,
      source_date: built.source_date ? String(built.source_date).slice(0, 40) : null,
      report_count: Number.isFinite(Number(built.report_count)) ? Math.max(1, Number(built.report_count)) : 1,
      direction: built.direction ? String(built.direction).slice(0, 20) : "outbound",
    };
  }

  function getCanonicalName(meta, post) {
    if (meta && meta.entity_profile && meaningful(meta.entity_profile.canonical_name)) {
      return meta.entity_profile.canonical_name;
    }
    if (meta && meta.knowledge_entry && meaningful(meta.knowledge_entry.canonical_name)) {
      return meta.knowledge_entry.canonical_name;
    }
    const payload = meta && meta.discovery_payload;
    return extractCanonicalIdentity(post && post.title, post && post.category, { payload: payload }).canonical_name
      || meaningful(post && post.title)
      || "";
  }

  function getDisplayName(meta, post) {
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const cat = String(post && post.category || "").toLowerCase();
    if (cat === "creatures" || cat === "items") {
      const identity = extractCanonicalIdentity(post && post.title, cat, { payload: payload });
      if (identity.canonical_name) return identity.canonical_name;
    }
    const placeInfo = classifyPlaceEntry(post && post.title, post && post.category, payload);
    if (placeInfo.canonical_name) return placeInfo.canonical_name;
    return getCanonicalName(meta, post) || meaningful(post && post.title) || "Entry";
  }

  function getEntityKey(meta, post) {
    if (meta && meta.entity_profile && meta.entity_profile.entity_key) return meta.entity_profile.entity_key;
    const canonical = getCanonicalName(meta, post);
    return buildEntityKey(post && post.category, canonical);
  }

  function getTaxonomy(meta) {
    if (meta && meta.entity_taxonomy) return meta.entity_taxonomy;
    if (meta && meta.entity_profile && meta.entity_profile.taxonomy) return meta.entity_profile.taxonomy;
    return null;
  }

  function titlesMatchEntity(row, canonicalName, entityKey) {
    if (!row) return false;
    const meta = typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.safeParseMeta
      ? KnowledgeRelations.safeParseMeta(row.content || "")
      : {};
    if (meta.entity_profile && meta.entity_profile.entity_key && entityKey && meta.entity_profile.entity_key === entityKey) {
      return true;
    }
    const rowCanonical = getCanonicalName(meta, row);
    if (normalizeTitleKey(rowCanonical || row.title) === normalizeTitleKey(canonicalName)) return true;
    const aliases = getBiomeAliases(canonicalName);
    return entityNameMatches(row.title, canonicalName, entityKey, aliases)
      || entityNameMatches(rowCanonical, canonicalName, entityKey, aliases);
  }

  function enrichPayloadFromRelations(payload, relations, knowledgeEntry) {
    const out = Object.assign({}, payload || {});
    const rels = Array.isArray(relations) ? relations : [];

    rels.forEach(function(rel) {
      const type = normalizeRelationType(rel.relation_type);
      const name = meaningful(rel.canonical_target_name) || meaningful(rel.title);
      if (!name) return;
      if (type === "dropped_by" && !meaningful(out.dropped_by)) out.dropped_by = name;
      if ((type === "found_in" || type === "observed_in") && !meaningful(out.found_in)) out.found_in = name;
      if (type === "located_in" && !meaningful(out.region_name)) out.region_name = name;
      if (type === "drops" && !meaningful(out.dropped_items)) out.dropped_items = name;
    });

    if (knowledgeEntry && knowledgeEntry.source_post_title) {
      out._source_discovery_title = knowledgeEntry.source_post_title;
    }
    return out;
  }

  return {
    ITEM_TYPES: ITEM_TYPES,
    meaningful: meaningful,
    slugify: slugify,
    buildCanonicalPostSlug: buildCanonicalPostSlug,
    applyCanonicalSlugMeta: applyCanonicalSlugMeta,
    postMatchesSlugAlias: postMatchesSlugAlias,
    slugLooksContextual: slugLooksContextual,
    normalizeTitleKey: normalizeTitleKey,
    parseTitleContext: parseTitleContext,
    extractCanonicalIdentity: extractCanonicalIdentity,
    buildEntityKey: buildEntityKey,
    buildEntityProfile: buildEntityProfile,
    inferItemTaxonomy: inferItemTaxonomy,
    mergeTaxonomy: mergeTaxonomy,
    getTaxonomy: getTaxonomy,
    resolveEntityFacts: resolveEntityFacts,
    resolveItemFacts: resolveItemFacts,
    resolveCreatureFacts: resolveCreatureFacts,
    normalizeEntityMeta: normalizeEntityMeta,
    enrichRelation: enrichRelation,
    enrichRelations: enrichRelations,
    sanitizeRelationForStorage: sanitizeRelationForStorage,
    getCanonicalName: getCanonicalName,
    getDisplayName: getDisplayName,
    getRelationDisplayName: getRelationDisplayName,
    getRelationContextNote: getRelationContextNote,
    getSourceContextLabel: getSourceContextLabel,
    resolveRelationCategory: resolveRelationCategory,
    getEntityKey: getEntityKey,
    titlesMatchEntity: titlesMatchEntity,
    enrichPayloadFromRelations: enrichPayloadFromRelations,
    extractBiomeContext: extractBiomeContext,
    inferBiomeFromLocationLabel: inferBiomeFromLocationLabel,
    normalizeBiomeName: normalizeBiomeName,
    normalizeBiomeKey: normalizeBiomeKey,
    isKnownBiomeName: isKnownBiomeName,
    isVagueLocationHint: isVagueLocationHint,
    splitPlaceContext: splitPlaceContext,
    classifyPlaceEntry: classifyPlaceEntry,
    getEffectiveCategory: getEffectiveCategory,
    ENTITY_DOMAINS: ENTITY_DOMAINS,
    T3_RESERVED_SLUG_PREFIXES: T3_RESERVED_SLUG_PREFIXES,
    inferEntityDomainFromCategory: inferEntityDomainFromCategory,
    inferEntitySubtypeFromCategoryAndPayload: inferEntitySubtypeFromCategoryAndPayload,
    resolveEntityDomain: resolveEntityDomain,
    resolveEntitySubtype: resolveEntitySubtype,
    normalizeEntityClassification: normalizeEntityClassification,
    isReservedT3Slug: isReservedT3Slug,
    shouldExcludeFromLocationList: shouldExcludeFromLocationList,
    shouldIncludeInBiomeList: shouldIncludeInBiomeList,
    getBiomeAliases: getBiomeAliases,
    entityNameMatches: entityNameMatches,
    hasDefiniteLocationData: hasDefiniteLocationData,
    BIOME_CANONICAL: BIOME_CANONICAL,
  };
})();
