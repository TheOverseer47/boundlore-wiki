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
    dropped_item: { key: "dropped_item", label: "Dropped item", type: "text", placeholder: "Item name that this creature drops", max: 120, required: true },
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
    report_drop_creature: {
      label: "Report drop",
      fields: ["dropped_item", "relation_notes", "confidence_level", "evidence_notes"],
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
    add_recipe: {
      label: "Add recipe",
      customForm: "recipe",
      fields: [],
    },
  };

  const RECIPE_UNIT_OPTIONS = [
    { value: "piece", label: "piece" },
    { value: "stack", label: "stack" },
    { value: "unit", label: "unit" },
  ];

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
      known_creature: "add_known_creature",
      known_item: "add_known_item",
      recipe: "add_recipe",
      rarity: "add_info",
      resources_or_rewards: "add_info",
      notes: "add_info",
    };
    return fieldMap[fieldKey] || "add_info";
  }

  function getMask(intent, field, entityType) {
    const key = resolveIntent(intent, field);
    const type = String(entityType || "").toLowerCase();
    // On creature pages "report_drop" means "this creature drops item X",
    // on item pages it means "this item is dropped by creature Y".
    if (key === "report_drop" && type === "creatures") return MASKS.report_drop_creature;
    if (key === "add_info" && (type === "biomes" || type === "locations")) {
      if (field === "resources_or_rewards" || intent === "add_known_item" || field === "known_item") return MASKS.add_known_item;
      if (intent === "add_known_creature" || field === "known_creature") return MASKS.add_known_creature;
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

  function confidenceLevelToRecipeConfidence(level) {
    const map = {
      "1-rumor": "rumor",
      "2-single-observation": "single_observation",
      "3-repeated": "repeated_observation",
      "4-confirmed": "confirmed",
    };
    return map[String(level || "")] || "single_observation";
  }

  function renderRecipeIngredientRow(index, defaults) {
    const row = defaults || {};
    const qty = row.quantity != null ? row.quantity : 1;
    const unit = row.unit || "piece";
    let html = '<div class="bl-recipe-ingredient-row" data-index="' + index + '" style="display:grid;grid-template-columns:1fr 90px 110px auto;gap:8px;align-items:end;margin-bottom:10px;">';
    html += '<div class="form-group" style="margin:0;"><label>Ingredient Name *</label>';
    html += '<input type="text" class="form-input bl-recipe-ing-name" maxlength="140" placeholder="e.g. Ember Shard" value="' +
      escapeHtml(row.name || "") + '" /></div>';
    html += '<div class="form-group" style="margin:0;"><label>Qty *</label>';
    html += '<input type="number" class="form-input bl-recipe-ing-qty" min="1" step="1" value="' + escapeHtml(String(qty)) + '" /></div>';
    html += '<div class="form-group" style="margin:0;"><label>Unit</label><select class="form-input bl-recipe-ing-unit">';
    RECIPE_UNIT_OPTIONS.forEach(function(opt) {
      const selected = unit === opt.value ? " selected" : "";
      html += '<option value="' + escapeHtml(opt.value) + '"' + selected + ">" + escapeHtml(opt.label) + "</option>";
    });
    html += "</select></div>";
    html += '<button type="button" class="btn-secondary bl-recipe-remove-row" style="margin-bottom:2px;">Remove</button>';
    html += "</div>";
    return html;
  }

  function renderRecipeForm(context) {
    let html = '<div id="recipeFormRoot">';
    html += '<p class="field-hint" style="margin:0 0 12px;">Report how <strong>' + escapeHtml(context.displayName) +
      "</strong> is crafted. Your recipe suggestion stays pending until an admin reviews it.</p>";
    html += '<div class="form-group"><label>Ingredients *</label>';
    html += '<div id="recipeIngredientsList">';
    html += renderRecipeIngredientRow(0);
    html += "</div>";
    html += '<button type="button" class="btn-secondary" id="recipeAddIngredientBtn" style="margin-top:4px;">Add another ingredient</button>';
    html += "</div>";
    html += '<div class="form-group"><label for="contrib_recipe_station">Crafting Station</label>';
    html += '<input type="text" id="contrib_recipe_station" class="form-input" maxlength="140" placeholder="e.g. Forge (Unknown if unsure)" /></div>';
    html += '<div class="form-group"><label for="contrib_recipe_output_qty">Output Quantity</label>';
    html += '<input type="number" id="contrib_recipe_output_qty" class="form-input" min="1" step="1" value="1" /></div>';
    html += '<div class="form-group"><label for="contrib_recipe_unlock">Unlock Condition</label>';
    html += '<input type="text" id="contrib_recipe_unlock" class="form-input" maxlength="240" placeholder="Unknown" value="Unknown" /></div>';
    html += '<div class="form-group"><label for="contrib_recipe_notes">Notes</label>';
    html += '<textarea id="contrib_recipe_notes" class="form-input" rows="3" maxlength="500" placeholder="Optional observation notes"></textarea></div>';
    html += renderField(FIELD_DEFS.confidence_level, { confidence_level: "2-single-observation" });
    html += renderField(FIELD_DEFS.evidence_notes, {});
    html += "</div>";
    return html;
  }

  function initRecipeFormHandlers(root) {
    const wrap = root || document.getElementById("contributionPanel");
    if (!wrap) return;
    const list = wrap.querySelector("#recipeIngredientsList");
    const addBtn = wrap.querySelector("#recipeAddIngredientBtn");
    if (!list || !addBtn) return;

    function refreshRemoveButtons() {
      const rows = list.querySelectorAll(".bl-recipe-ingredient-row");
      rows.forEach(function(row) {
        const btn = row.querySelector(".bl-recipe-remove-row");
        if (btn) btn.style.display = rows.length > 1 ? "inline-flex" : "none";
      });
    }

    addBtn.addEventListener("click", function() {
      const index = list.querySelectorAll(".bl-recipe-ingredient-row").length;
      list.insertAdjacentHTML("beforeend", renderRecipeIngredientRow(index));
      refreshRemoveButtons();
    });

    list.addEventListener("click", function(event) {
      const btn = event.target.closest(".bl-recipe-remove-row");
      if (!btn) return;
      const row = btn.closest(".bl-recipe-ingredient-row");
      if (!row || list.querySelectorAll(".bl-recipe-ingredient-row").length <= 1) return;
      row.remove();
      refreshRemoveButtons();
    });

    refreshRemoveButtons();
  }

  function collectRecipeFormValues() {
    const errors = [];
    const list = document.getElementById("recipeIngredientsList");
    const ingredients = [];
    if (list) {
      list.querySelectorAll(".bl-recipe-ingredient-row").forEach(function(row) {
        const name = (row.querySelector(".bl-recipe-ing-name")?.value || "").trim();
        const qtyRaw = row.querySelector(".bl-recipe-ing-qty")?.value;
        const qty = qtyRaw != null && qtyRaw !== "" ? Number(qtyRaw) : 1;
        const unit = (row.querySelector(".bl-recipe-ing-unit")?.value || "piece").trim();
        if (!name) return;
        if (!Number.isFinite(qty) || qty <= 0) {
          errors.push("Each ingredient needs a positive quantity.");
          return;
        }
        ingredients.push({ name: name, quantity: qty, unit: unit || "piece" });
      });
    }
    if (!ingredients.length) errors.push("At least one ingredient name is required.");

    const stationRaw = (document.getElementById("contrib_recipe_station")?.value || "").trim();
    const station = stationRaw || "Unknown";
    const outputRaw = document.getElementById("contrib_recipe_output_qty")?.value;
    const outputQty = outputRaw != null && outputRaw !== "" ? Number(outputRaw) : 1;
    if (!Number.isFinite(outputQty) || outputQty <= 0) errors.push("Output quantity must be a positive number.");

    const unlock = (document.getElementById("contrib_recipe_unlock")?.value || "").trim() || "Unknown";
    const notes = (document.getElementById("contrib_recipe_notes")?.value || "").trim();
    const confidenceLevel = (document.getElementById("contrib_confidence_level")?.value || "2-single-observation").trim();
    const evidenceNotes = (document.getElementById("contrib_evidence_notes")?.value || "").trim();
    const imageUrl = (document.getElementById("contribImageUrl")?.value || "").trim();

    const values = {
      ingredients: ingredients,
      station: station,
      output_quantity: outputQty,
      unlock_condition: unlock,
      notes: notes,
      confidence_level: confidenceLevel,
      evidence_notes: evidenceNotes,
    };
    if (imageUrl) values.image_url = imageUrl;
    return { values: values, errors: errors };
  }

  function buildRecipePayload(values, targetContext) {
    return {
      target_item: targetContext.displayName,
      target_slug: targetContext.targetSlug,
      ingredients: (values.ingredients || []).map(function(row) {
        return {
          name: row.name,
          quantity: row.quantity,
          unit: row.unit || "piece",
        };
      }),
      station: values.station || "Unknown",
      output_quantity: values.output_quantity != null ? values.output_quantity : 1,
      unlock_condition: values.unlock_condition || "Unknown",
      notes: values.notes || "",
      evidence_tier: "reported",
      confidence: confidenceLevelToRecipeConfidence(values.confidence_level),
    };
  }

  function renderPanel(context) {
    const mask = getMask(context.intent, context.field, context.entityType);
    if (mask.customForm === "recipe") {
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
      html += renderRecipeForm(context);
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
    if (mask.customForm === "recipe") return collectRecipeFormValues();
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
    if (intent === "add_recipe") {
      payload.intent = "add_recipe";
      payload.recipe = buildRecipePayload(values, targetContext);
      if (values.notes) payload.notes = values.notes;
      if (values.evidence_notes) payload.evidence_notes = values.evidence_notes;
      return payload;
    }
    if (values.damage) payload.damage = values.damage;
    if (values.scaling) payload.scaling_power = values.scaling;
    if (values.durability) payload.durability = values.durability;
    if (values.stat_conditions) payload.stat_conditions = values.stat_conditions;
    if (values.item_effect) payload.item_effect = values.item_effect;
    if (values.how_tested) payload.how_tested = values.how_tested;
    if (values.dropped_by) payload.dropped_by = values.dropped_by;
    if (values.dropped_item) payload.dropped_items = values.dropped_item;
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

  function confidenceLevelToScore(level) {
    const map = {
      "1-rumor": 40,
      "2-single-observation": 60,
      "3-repeated": 80,
      "4-confirmed": 95,
    };
    return map[String(level || "")] || 60;
  }

  function buildRelations(intent, values, targetContext) {
    const relations = [];
    const relBase = {
      source_post_slug: targetContext.targetSlug,
      source_post_id: targetContext.targetId,
      source_post_title: targetContext.displayName,
      auto_inferred: false,
      confidence: confidenceLevelToScore(values.confidence_level),
    };
    if (intent === "report_drop" && values.dropped_item) {
      relations.push(Object.assign({}, relBase, {
        relation_type: "drops",
        title: values.dropped_item,
        group: "items",
        category: "items",
        target_entity_type: "item",
      }));
    }
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
    // Known-entity relations are stored on the biome/location entry itself,
    // matching how approved discoveries link entities ("contains").
    if (intent === "add_known_creature" && values.entity_name) {
      relations.push(Object.assign({}, relBase, {
        relation_type: "contains",
        title: values.entity_name,
        group: "creatures",
        category: "creatures",
        target_entity_type: "creature",
      }));
    }
    if (intent === "add_known_item" && values.entity_name) {
      relations.push(Object.assign({}, relBase, {
        relation_type: "contains",
        title: values.entity_name,
        group: "items",
        category: "items",
        target_entity_type: "item",
      }));
    }
    if (intent === "add_recipe" && values.ingredients && values.ingredients.length) {
      const recipe = buildRecipePayload(values, targetContext);
      const craftRels = typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.buildCraftRelationsFromRecipe
        ? KnowledgeRelations.buildCraftRelationsFromRecipe(recipe)
        : [];
      craftRels.forEach(function(rel) {
        relations.push(Object.assign({}, relBase, rel, {
          auto_inferred: false,
          source_post_slug: targetContext.targetSlug,
          source_post_id: targetContext.targetId,
          source_post_title: targetContext.displayName,
        }));
      });
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
    const submittedFields = Object.assign({}, values);
    if (context.resolvedIntent === "add_recipe" && values.ingredients) {
      submittedFields.recipe_ingredients = values.ingredients.map(function(row) {
        return row.name + " x" + row.quantity + " " + (row.unit || "piece");
      }).join(", ");
      submittedFields.crafting_station = values.station || "Unknown";
      submittedFields.output_quantity = String(values.output_quantity != null ? values.output_quantity : 1);
      submittedFields.unlock_condition = values.unlock_condition || "Unknown";
    }
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
        submitted_fields: submittedFields,
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
    html += "<p>Intent: " + escapeHtml(mask.label) + "</p>";
    if (context.resolvedIntent === "add_recipe" && values.ingredients) {
      html += "<ul>";
      values.ingredients.forEach(function(row) {
        html += "<li><strong>Ingredient:</strong> " + escapeHtml(row.name) + " x" +
          escapeHtml(String(row.quantity)) + " " + escapeHtml(row.unit || "piece") + "</li>";
      });
      html += "<li><strong>Station:</strong> " + escapeHtml(values.station || "Unknown") + "</li>";
      html += "<li><strong>Output:</strong> " + escapeHtml(String(values.output_quantity != null ? values.output_quantity : 1)) + "</li>";
      html += "<li><strong>Unlock:</strong> " + escapeHtml(values.unlock_condition || "Unknown") + "</li>";
      if (values.notes) html += "<li><strong>Notes:</strong> " + escapeHtml(values.notes) + "</li>";
      html += "</ul>";
    } else {
      html += "<ul>";
      Object.keys(values).forEach(function(key) {
        if (key === "confidence_level" || key === "ingredients") return;
        const def = FIELD_DEFS[key];
        const label = def ? def.label : formatLabel(key);
        html += "<li><strong>" + escapeHtml(label) + ":</strong> " + escapeHtml(String(values[key])) + "</li>";
      });
      html += "</ul>";
    }
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
    initRecipeFormHandlers: initRecipeFormHandlers,
    collectFormValues: collectFormValues,
    buildContributionMeta: buildContributionMeta,
    buildContributionTitle: buildContributionTitle,
    buildContributionContent: buildContributionContent,
    buildRelations: buildRelations,
    buildRecipePayload: buildRecipePayload,
  };
})();
