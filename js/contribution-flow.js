// ============================================
// Focused contribution masks for wiki entries
// ============================================

window.ContributionFlow = (function() {
  const CONFIDENCE_OPTIONS = [
    { value: "1-rumor", label: "Rumor / unverified" },
    { value: "2-single-observation", label: "Single observation" },
    { value: "3-repeated", label: "Repeated observations" },
    { value: "4-confirmed", label: "Confirmed / strong evidence" },
  ];

  const FIELD_DEFS = {
    damage: { key: "damage", label: "Damage", type: "text", placeholder: "e.g. 45 fire damage", max: 120 },
    scaling: { key: "scaling", label: "Scaling / Power", type: "text", placeholder: "e.g. scales with magic", max: 160 },
    durability: { key: "durability", label: "Durability", type: "text", placeholder: "Optional", max: 80 },
    stat_conditions: { key: "stat_conditions", label: "Conditions", type: "text", placeholder: "When / how stats apply", max: 200 },
    item_effect: { key: "item_effect", label: "Effect / Use", type: "textarea", placeholder: "What does it do in-game?", max: 800, required: true },
    how_tested: { key: "how_tested", label: "How tested", type: "textarea", placeholder: "How did you verify this?", max: 400 },
    image_caption: { key: "image_caption", label: "Caption", type: "text", placeholder: "What does the image show?", max: 200 },
    image_context: { key: "image_context", label: "Source / context", type: "text", placeholder: "Where / when was this captured?", max: 200 },
    dropped_by: { key: "dropped_by", label: "Dropped by", type: "text", placeholder: "Creature, boss, or NPC name", max: 120, required: true },
    found_in: { key: "found_in", label: "Location", type: "text", placeholder: "Specific place or landmark", max: 160 },
    region_name: { key: "region_name", label: "Biome / Region", type: "text", placeholder: "e.g. Swamp", max: 120 },
    behavior: { key: "behavior", label: "Behavior", type: "textarea", placeholder: "How does it act?", max: 800, required: true },
    behavior_conditions: { key: "behavior_conditions", label: "Conditions", type: "text", placeholder: "Combat, idle, group size, etc.", max: 200 },
    time_weather: { key: "time_weather", label: "Time / Weather", type: "text", placeholder: "Optional context", max: 120 },
    spawn_conditions: { key: "spawn_conditions", label: "Spawn conditions", type: "textarea", placeholder: "When and where does it spawn?", max: 600, required: true },
    entity_name: { key: "entity_name", label: "Entity name", type: "text", placeholder: "Name of creature or item", max: 120, required: true },
    relation_notes: { key: "relation_notes", label: "Relation context", type: "textarea", placeholder: "How is it connected to this entry?", max: 400 },
    notes: { key: "notes", label: "Details", type: "textarea", placeholder: "Add the information you want to contribute.", max: 1000, required: true },
    confidence_level: { key: "confidence_level", label: "Confidence", type: "select", options: CONFIDENCE_OPTIONS, required: true },
    evidence_notes: { key: "evidence_notes", label: "Evidence notes", type: "textarea", placeholder: "Screenshot, clip, or reproducible steps.", max: 500 },
  };

  const MASKS = {
    add_info: {
      label: "Add information",
      fields: ["notes", "confidence_level", "evidence_notes"],
    },
    add_stats: {
      label: "Add stats",
      fields: ["damage", "scaling", "durability", "stat_conditions", "confidence_level", "evidence_notes"],
    },
    add_effect: {
      label: "Add effect / use",
      fields: ["item_effect", "how_tested", "confidence_level", "evidence_notes"],
    },
    add_image: {
      label: "Add image / evidence",
      fields: ["image_caption", "image_context", "confidence_level", "evidence_notes"],
    },
    report_drop: {
      label: "Confirm drop source",
      fields: ["dropped_by", "relation_notes", "confidence_level", "evidence_notes"],
    },
    confirm_location: {
      label: "Confirm location",
      fields: ["found_in", "region_name", "relation_notes", "confidence_level", "evidence_notes"],
    },
    add_behavior: {
      label: "Add behavior",
      fields: ["behavior", "behavior_conditions", "time_weather", "confidence_level", "evidence_notes"],
    },
    add_spawn: {
      label: "Add spawn conditions",
      fields: ["spawn_conditions", "time_weather", "confidence_level", "evidence_notes"],
    },
    add_known_creature: {
      label: "Add known creature",
      fields: ["entity_name", "relation_notes", "confidence_level", "evidence_notes"],
    },
    add_known_item: {
      label: "Add known item",
      fields: ["entity_name", "relation_notes", "confidence_level", "evidence_notes"],
    },
  };

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

  function parseMetaFromHtml(html) {
    const match = String(html || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
    if (!match) return {};
    try { return JSON.parse(match[1]); } catch (e) { return {}; }
  }

  function resolveIntent(intent, field) {
    const raw = String(intent || "").toLowerCase();
    if (MASKS[raw]) return raw;
    const fieldKey = String(field || "").toLowerCase();
    const fieldMap = {
      stats: "add_stats",
      item_effect: "add_effect",
      image: "add_image",
      spawn_conditions: "add_spawn",
      behavior: "add_behavior",
      dropped_items: "report_drop",
      dropped_by: "report_drop",
      found_in: "confirm_location",
      rarity: "add_info",
      resources_or_rewards: "add_info",
      notes: "add_info",
    };
    return fieldMap[fieldKey] || "add_info";
  }

  function getMask(intent, field, entityType) {
    const key = resolveIntent(intent, field);
    if (key === "add_info" && entityType === "biomes") {
      if (field === "resources_or_rewards" || intent === "add_known_item") return MASKS.add_known_item;
      if (intent === "add_known_creature") return MASKS.add_known_creature;
    }
    return MASKS[key] || MASKS.add_info;
  }

  function parseRouteParams(search) {
    const params = new URLSearchParams(search || window.location.search);
    return {
      contributeTo: params.get("contribute_to") || params.get("entity_id") || "",
      entityType: (params.get("entity_type") || params.get("category") || "").toLowerCase(),
      entityName: params.get("entity") || "",
      intent: params.get("intent") || "",
      field: params.get("missing_field") || params.get("field") || "",
      relationTarget: params.get("relation_target") || "",
      sourcePage: params.get("source_page") || "",
      mode: params.get("mode") || (params.get("contribute_to") || params.get("intent") ? "contribution" : ""),
    };
  }

  async function loadTargetPost(client, contributeTo) {
    if (!client || !contributeTo) return null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(contributeTo);
    let query = client.from("posts").select("id, slug, title, category, post_type, content, status");
    query = isUuid ? query.eq("id", contributeTo) : query.eq("slug", contributeTo);
    const { data, error } = await query.maybeSingle();
    if (error || !data) return null;
    return data;
  }

  function buildKnownFactsSummary(targetPost, meta) {
    const payload = meta.discovery_payload && typeof meta.discovery_payload === "object" ? meta.discovery_payload : {};
    const lines = [];
    const name = typeof EntityCore !== "undefined"
      ? EntityCore.getDisplayName(meta, targetPost)
      : (payload.entity_name || targetPost.title);
    if (name) lines.push({ label: "Entry", value: name });
    if (payload.item_type || payload.discovery_type) {
      lines.push({ label: "Type", value: formatLabel(payload.item_type || payload.discovery_type) });
    }
    if (payload.dropped_by) lines.push({ label: "Dropped by", value: payload.dropped_by });
    if (payload.region_name) lines.push({ label: "Biome", value: payload.region_name });
    if (payload.found_in) lines.push({ label: "Location", value: payload.found_in });
    if (payload.item_effect) lines.push({ label: "Effect", value: payload.item_effect });
    if (payload.dropped_items) lines.push({ label: "Drops", value: payload.dropped_items });
    return lines.slice(0, 6);
  }

  function renderKnownFacts(lines) {
    if (!lines.length) return "";
    let html = '<dl class="bl-contrib-known">';
    lines.forEach(function(line) {
      html += "<div><dt>" + escapeHtml(line.label) + "</dt><dd>" + escapeHtml(line.value) + "</dd></div>";
    });
    html += "</dl>";
    return html;
  }

  function renderField(def, defaults) {
    const value = defaults && defaults[def.key] != null ? defaults[def.key] : "";
    let html = '<div class="form-group bl-contrib-field" data-field="' + escapeHtml(def.key) + '">';
    html += '<label for="contrib_' + escapeHtml(def.key) + '">' + escapeHtml(def.label);
    if (def.required) html += " *";
    html += "</label>";
    if (def.type === "textarea") {
      html += '<textarea id="contrib_' + escapeHtml(def.key) + '" class="form-input" maxlength="' +
        (def.max || 1000) + '" rows="4" placeholder="' + escapeHtml(def.placeholder || "") + '">' +
        escapeHtml(value) + "</textarea>";
    } else if (def.type === "select") {
      html += '<select id="contrib_' + escapeHtml(def.key) + '" class="form-input">';
      (def.options || []).forEach(function(opt) {
        const selected = String(value) === String(opt.value) ? " selected" : "";
        html += '<option value="' + escapeHtml(opt.value) + '"' + selected + ">" + escapeHtml(opt.label) + "</option>";
      });
      html += "</select>";
    } else {
      html += '<input type="text" id="contrib_' + escapeHtml(def.key) + '" class="form-input" maxlength="' +
        (def.max || 240) + '" value="' + escapeHtml(value) + '" placeholder="' + escapeHtml(def.placeholder || "") + '" />';
    }
    html += "</div>";
    return html;
  }

  function renderPanel(context) {
    const mask = getMask(context.intent, context.field, context.entityType);
    const defaults = {};
    if (context.relationTarget) {
      if (mask === MASKS.report_drop) defaults.dropped_by = context.relationTarget;
      if (mask === MASKS.confirm_location) defaults.found_in = context.relationTarget;
    }
    if (!defaults.confidence_level) defaults.confidence_level = "2-single-observation";

    let html = '<section class="bl-contrib-panel">';
    html += '<div class="bl-contrib-header">';
    html += "<h2>Contribute to " + escapeHtml(context.displayName) + "</h2>";
    html += "<p class=\"bl-contrib-subtitle\">You are adding <strong>" + escapeHtml(mask.label) +
      "</strong> to this wiki entry. Your submission will be reviewed before it updates the live page.</p>";
    html += "</div>";

    if (context.knownFacts && context.knownFacts.length) {
      html += '<div class="bl-contrib-known-wrap"><p class="bl-contrib-known-title">Already known</p>';
      html += renderKnownFacts(context.knownFacts);
      html += "</div>";
    }

    html += '<div id="contributionFields">';
    mask.fields.forEach(function(key) {
      const def = FIELD_DEFS[key];
      if (def) html += renderField(def, defaults);
    });
    html += "</div>";

    html += '<div class="form-group bl-contrib-evidence-upload">';
    html += '<label for="contribMedia">Upload evidence (optional)</label>';
    html += '<input type="file" id="contribMedia" accept="image/*,.pdf,.webp" multiple class="form-input" />';
    html += '<p class="field-hint">Screenshots and clips help admins verify your contribution faster.</p>';
    html += "</div>";

    html += '<div class="form-group">';
    html += '<label for="contribImageUrl">Image URL (optional)</label>';
    html += '<input type="url" id="contribImageUrl" class="form-input" placeholder="https://.../screenshot.jpg" />';
    html += "</div>";

    html += "</section>";
    return html;
  }

  function collectFormValues(mask) {
    const out = {};
    const errors = [];
    mask.fields.forEach(function(key) {
      const def = FIELD_DEFS[key];
      if (!def) return;
      const el = document.getElementById("contrib_" + key);
      const value = el ? String(el.value || "").trim() : "";
      if (def.required && !value) errors.push(def.label + " is required.");
      if (value) out[key] = value;
    });
    const imageUrl = (document.getElementById("contribImageUrl")?.value || "").trim();
    if (imageUrl) out.image_url = imageUrl;
    return { values: out, errors: errors };
  }

  function mapToDiscoveryPayload(intent, values, targetContext) {
    const payload = {
      entity_name: targetContext.displayName,
      contribution_intent: intent,
      confidence_level: values.confidence_level || "2-single-observation",
    };
    if (values.damage) payload.damage = values.damage;
    if (values.scaling) payload.scaling_power = values.scaling;
    if (values.durability) payload.durability = values.durability;
    if (values.stat_conditions) payload.stat_conditions = values.stat_conditions;
    if (values.item_effect) payload.item_effect = values.item_effect;
    if (values.how_tested) payload.how_tested = values.how_tested;
    if (values.dropped_by) payload.dropped_by = values.dropped_by;
    if (values.found_in) payload.found_in = values.found_in;
    if (values.region_name) payload.region_name = values.region_name;
    if (values.behavior) payload.behavior = values.behavior;
    if (values.behavior_conditions) payload.behavior_conditions = values.behavior_conditions;
    if (values.time_weather) payload.time_weather = values.time_weather;
    if (values.spawn_conditions) payload.spawn_conditions = values.spawn_conditions;
    if (values.entity_name && intent.indexOf("known") !== -1) payload.related_entity_name = values.entity_name;
    if (values.notes) payload.notes = values.notes;
    if (values.relation_notes) payload.relation_notes = values.relation_notes;
    if (values.evidence_notes) payload.evidence_notes = values.evidence_notes;
    if (values.image_caption) payload.image_caption = values.image_caption;
    if (values.image_context) payload.image_context = values.image_context;
    return payload;
  }

  function buildRelations(intent, values, targetContext) {
    const relations = [];
    const relBase = {
      source_post_slug: targetContext.targetSlug,
      source_post_id: targetContext.targetId,
      source_post_title: targetContext.displayName,
      auto_inferred: false,
      confidence: 80,
    };
    if (intent === "report_drop" && values.dropped_by) {
      relations.push(Object.assign({}, relBase, {
        relation_type: "dropped_by",
        title: values.dropped_by,
        group: "creatures",
        category: "creatures",
        target_entity_type: "creature",
      }));
    }
    if (intent === "confirm_location") {
      if (values.found_in) {
        relations.push(Object.assign({}, relBase, {
          relation_type: "found_in",
          title: values.found_in,
          group: "locations",
          category: "locations",
          target_entity_type: "location",
        }));
      }
      if (values.region_name) {
        relations.push(Object.assign({}, relBase, {
          relation_type: "located_in",
          title: values.region_name,
          group: "biomes",
          category: "biomes",
          target_entity_type: "biome",
        }));
      }
    }
    if (intent === "add_known_creature" && values.entity_name) {
      relations.push(Object.assign({}, relBase, {
        relation_type: "observed_in",
        title: values.entity_name,
        group: "creatures",
        category: "creatures",
        target_entity_type: "creature",
        direction: "inbound",
      }));
    }
    if (intent === "add_known_item" && values.entity_name) {
      relations.push(Object.assign({}, relBase, {
        relation_type: "drops",
        title: values.entity_name,
        group: "items",
        category: "items",
        target_entity_type: "item",
        direction: "inbound",
      }));
    }
    if (targetContext.relationTarget && intent === "report_drop" && !relations.length) {
      relations.push(Object.assign({}, relBase, {
        relation_type: "dropped_by",
        title: targetContext.relationTarget,
        group: "creatures",
        category: "creatures",
        target_entity_type: "creature",
      }));
    }
    return relations;
  }

  function buildContributionMeta(context, values, relations) {
    const entityKey = typeof EntityCore !== "undefined"
      ? EntityCore.buildEntityKey(context.entityType, context.displayName)
      : (context.entityType + "|" + String(context.displayName || "").toLowerCase());
    return {
      contribution: {
        target_post_id: context.targetId,
        target_post_slug: context.targetSlug,
        target_title: context.displayName,
        target_category: context.entityType,
        target_entity_type: context.entityType,
        entity_key: entityKey,
        intent: context.resolvedIntent,
        missing_field: context.field || null,
        relation_target: context.relationTarget || null,
        source_page: context.sourcePage || null,
        submitted_fields: values,
        confidence_level: values.confidence_level || "2-single-observation",
        status: "pending_review",
        created_from_existing_entry: true,
        submitted_at: new Date().toISOString(),
      },
      contribution_target: context.targetSlug || context.targetId,
      contribution_field: context.field || null,
      contribution_intent: context.resolvedIntent,
      discovery_payload: mapToDiscoveryPayload(context.resolvedIntent, values, context),
      discovery_relations: relations,
      discovery_relations_skipped: relations.length === 0,
      discovery_record_status: "contribution",
      discovery_submitted_at: new Date().toISOString(),
    };
  }

  function buildContributionTitle(context) {
    const mask = getMask(context.resolvedIntent, context.field, context.entityType);
    return "Contribution: " + context.displayName + " — " + mask.label;
  }

  function buildContributionContent(context, values) {
    const mask = getMask(context.resolvedIntent, context.field, context.entityType);
    let html = "<p><strong>Wiki contribution</strong> for <em>" + escapeHtml(context.displayName) + "</em>.</p>";
    html += "<p>Intent: " + escapeHtml(mask.label) + "</p><ul>";
    Object.keys(values).forEach(function(key) {
      if (key === "confidence_level") return;
      const def = FIELD_DEFS[key];
      const label = def ? def.label : formatLabel(key);
      html += "<li><strong>" + escapeHtml(label) + ":</strong> " + escapeHtml(values[key]) + "</li>";
    });
    html += "</ul>";
    if (values.evidence_notes) {
      html += "<p><strong>Evidence:</strong> " + escapeHtml(values.evidence_notes) + "</p>";
    }
    return html;
  }

  return {
    MASKS: MASKS,
    FIELD_DEFS: FIELD_DEFS,
    parseRouteParams: parseRouteParams,
    resolveIntent: resolveIntent,
    getMask: getMask,
    loadTargetPost: loadTargetPost,
    buildKnownFactsSummary: buildKnownFactsSummary,
    renderPanel: renderPanel,
    collectFormValues: collectFormValues,
    buildContributionMeta: buildContributionMeta,
    buildContributionTitle: buildContributionTitle,
    buildContributionContent: buildContributionContent,
    buildRelations: buildRelations,
  };
})();
