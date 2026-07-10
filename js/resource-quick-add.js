// Resource Quick-Add form + synonym warning (P0-C)
window.ResourceQuickAdd = (function() {
  let active = false;
  let fieldState = {};
  let synonymMatches = [];
  let synonymAcknowledged = false;
  let synonymCheckTimer = null;

  const SOURCE_LABELS = typeof BOUNDLORE_RESOURCE_SOURCE_TYPE_LABELS === "object"
    ? BOUNDLORE_RESOURCE_SOURCE_TYPE_LABELS
    : {
      mining: "Mining / Ore / Deposit",
      plant: "Plant / Flora",
      "creature-drop": "Creature Drop",
      biome: "Biome / Environment",
      water: "Water / Ocean / River",
      loot: "Loot / Container",
      unknown: "Unknown",
    };

  function isActive() {
    return active;
  }

  function activate() {
    active = true;
    fieldState = {
      rarity: "unknown",
      confidence_level: "2-single-observation",
      gathering_tool: "",
    };
    synonymMatches = [];
    synonymAcknowledged = false;
  }

  function deactivate() {
    active = false;
    fieldState = {};
    synonymMatches = [];
    synonymAcknowledged = false;
  }

  function getSchema() {
    return typeof getResourceQuickAddSchema === "function"
      ? getResourceQuickAddSchema()
      : { fields: [], media: { minImages: 0 } };
  }

  function normalizeCompareName(value) {
    return String(value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "")
      .replace(/s$/, "");
  }

  function tokenizeName(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/[\s-]+/)
      .map(function(t) { return t.replace(/s$/, ""); })
      .filter(function(t) { return t.length >= 3; });
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const row = [];
    for (let i = 0; i <= b.length; i += 1) row[i] = i;
    for (let i = 1; i <= a.length; i += 1) {
      let prev = i - 1;
      row[0] = i;
      for (let j = 1; j <= b.length; j += 1) {
        const temp = row[j];
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost);
        prev = temp;
      }
    }
    return row[b.length];
  }

  function namesAreSimilar(a, b) {
    const na = normalizeCompareName(a);
    const nb = normalizeCompareName(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
    const tokensA = tokenizeName(a);
    const tokensB = tokenizeName(b);
    const shared = tokensA.filter(function(t) { return tokensB.indexOf(t) >= 0; });
    if (shared.length >= 2) return true;
    if (shared.length === 1 && tokensA.length <= 2 && tokensB.length <= 2) return true;
    if (na.length <= 24 && nb.length <= 24 && levenshtein(na, nb) <= 2) return true;
    return false;
  }

  function parseMetaFromContent(content) {
    if (typeof KnowledgeRelations !== "undefined" && KnowledgeRelations.parseRawMetaFromHtml) {
      return KnowledgeRelations.parseRawMetaFromHtml(content || "") || {};
    }
    const match = String(content || "").match(/<!--BLMETA\s*([\s\S]*?)\s*-->/);
    if (!match) return {};
    try { return JSON.parse(match[1]); } catch (err) { return {}; }
  }

  function resolveSubtype(meta) {
    if (!meta) return "";
    if (meta.entity_subtype) return meta.entity_subtype;
    const payload = meta.discovery_payload;
    if (payload && payload.discovery_type === "resource") return "resource";
    if (payload && payload.resource) return "resource";
    return "";
  }

  function buildCandidate(row) {
    const meta = parseMetaFromContent(row.content || "");
    const payload = meta.discovery_payload && typeof meta.discovery_payload === "object"
      ? meta.discovery_payload
      : {};
    const subtype = resolveSubtype(meta);
    const slug = row.slug || (meta.entity_profile && meta.entity_profile.slug) || null;
    return {
      id: row.id,
      title: row.title || payload.entity_name || "",
      slug: slug,
      category: row.category || "items",
      subtype: subtype || "item",
      href: slug ? "/wiki/post/?slug=" + encodeURIComponent(slug) : null,
      score: 0,
    };
  }

  function scoreCandidate(inputName, candidate) {
    let score = 0;
    const meta = candidate._meta;
    const payload = meta && meta.discovery_payload ? meta.discovery_payload : {};
    const names = [
      candidate.title,
      payload.entity_name,
      meta && meta.entity_profile && meta.entity_profile.canonical_name,
      meta && meta.entity_profile && meta.entity_profile.display_name,
    ].filter(Boolean);
    if (Array.isArray(meta && meta.entity_profile && meta.entity_profile.aliases)) {
      names.push.apply(names, meta.entity_profile.aliases);
    }
    if (Array.isArray(meta && meta.entity_profile && meta.entity_profile.slug_aliases)) {
      names.push.apply(names, meta.entity_profile.slug_aliases);
    }
    names.forEach(function(name) {
      if (namesAreSimilar(inputName, name)) score += 10;
    });
    if (candidate.subtype === "resource") score += 2;
    return score;
  }

  async function findSimilarResources(client, name) {
    const clean = String(name || "").trim();
    if (!client || clean.length < 3) return [];
    const { data, error } = await client
      .from("posts")
      .select("id, slug, title, category, content, status")
      .eq("category", "items")
      .is("deleted_at", null)
      .in("status", ["pending", "published", "approved"])
      .limit(60);
    if (error || !Array.isArray(data)) return [];

    const ranked = data.map(function(row) {
      const meta = parseMetaFromContent(row.content || "");
      const candidate = buildCandidate(row);
      candidate._meta = meta;
      candidate.score = scoreCandidate(clean, candidate);
      return candidate;
    }).filter(function(row) {
      return row.score >= 8;
    }).sort(function(a, b) {
      return b.score - a.score;
    }).slice(0, 5);

    return ranked.map(function(row) {
      delete row._meta;
      return row;
    });
  }

  function renderSynonymWarning(container) {
    if (!container) return;
    container.innerHTML = "";
    if (!synonymMatches.length) {
      container.style.display = "none";
      return;
    }
    container.style.display = "block";
    const box = document.createElement("div");
    box.className = "bl-resource-synonym-warning";
    box.style.cssText = "margin:12px 0;padding:12px 14px;border-radius:10px;border:1px solid rgba(224,168,58,0.45);background:rgba(224,168,58,0.12);";

    const title = document.createElement("p");
    title.style.margin = "0 0 8px";
    title.style.fontWeight = "600";
    title.textContent = "Possible existing resource found";
    box.appendChild(title);

    const list = document.createElement("ul");
    list.style.margin = "0 0 10px";
    list.style.paddingLeft = "18px";
    synonymMatches.forEach(function(match) {
      const li = document.createElement("li");
      li.style.marginBottom = "4px";
      const label = match.title + " (" + (match.subtype || "item") + ")";
      if (match.href) {
        const link = document.createElement("a");
        link.href = match.href;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = label;
        li.appendChild(link);
      } else {
        li.textContent = label;
      }
      list.appendChild(li);
    });
    box.appendChild(list);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.flexWrap = "wrap";
    actions.style.gap = "8px";

    if (synonymMatches[0] && synonymMatches[0].href) {
      const openBtn = document.createElement("a");
      openBtn.className = "btn-secondary";
      openBtn.href = synonymMatches[0].href;
      openBtn.target = "_blank";
      openBtn.rel = "noopener";
      openBtn.textContent = "Open existing entry";
      actions.appendChild(openBtn);
    }

    const continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.className = "btn-secondary";
    continueBtn.textContent = "Continue anyway";
    continueBtn.addEventListener("click", function() {
      synonymAcknowledged = true;
      container.style.display = "none";
    });
    actions.appendChild(continueBtn);

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "btn-secondary";
    editBtn.textContent = "Cancel and edit name";
    editBtn.addEventListener("click", function() {
      synonymAcknowledged = false;
      const nameInput = document.getElementById("resourceField_entity_name");
      if (nameInput) nameInput.focus();
    });
    actions.appendChild(editBtn);

    box.appendChild(actions);
    container.appendChild(box);
  }

  function scheduleSynonymCheck(client) {
    if (synonymCheckTimer) clearTimeout(synonymCheckTimer);
    synonymCheckTimer = setTimeout(async function() {
      const name = String(fieldState.entity_name || "").trim();
      synonymAcknowledged = false;
      if (!name || name.length < 3) {
        synonymMatches = [];
        renderSynonymWarning(document.getElementById("resourceSynonymWarning"));
        return;
      }
      synonymMatches = await findSimilarResources(client, name);
      renderSynonymWarning(document.getElementById("resourceSynonymWarning"));
    }, 320);
  }

  function humanizeOption(value) {
    return SOURCE_LABELS[value] || String(value || "").replace(/-/g, " ");
  }

  function renderPanel(wrap, client) {
    if (!wrap) return;
    const schema = getSchema();
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    wrap.innerHTML = "";
    wrap.style.display = "block";

    const head = document.createElement("div");
    head.innerHTML = '<p class="bl-discovery-kicker">Resource Quick-Add</p><h3 style="margin:0 0 6px;">Report a resource</h3>';
    wrap.appendChild(head);

    const intro = document.createElement("p");
    intro.className = "field-hint";
    intro.textContent = "Resources are tracked as items with subtype resource. Only Resource Name and Source Type are required.";
    wrap.appendChild(intro);

    const warnHost = document.createElement("div");
    warnHost.id = "resourceSynonymWarning";
    warnHost.style.display = "none";
    wrap.appendChild(warnHost);

    fields.forEach(function(field) {
      const group = document.createElement("div");
      group.className = "form-group";
      group.style.marginTop = "10px";

      const label = document.createElement("label");
      label.setAttribute("for", "resourceField_" + field.key);
      label.textContent = field.label + (field.required ? " *" : "");
      group.appendChild(label);

      let input;
      const current = fieldState[field.key] != null ? fieldState[field.key] : "";
      if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = 3;
        input.className = "form-input";
        input.maxLength = field.max || 500;
        input.placeholder = field.placeholder || "";
        input.value = current;
      } else if (field.type === "select") {
        input = document.createElement("select");
        input.className = "form-input";
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = field.required ? "Select..." : "Unknown";
        input.appendChild(empty);
        (field.options || []).forEach(function(opt) {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = humanizeOption(opt);
          input.appendChild(option);
        });
        input.value = current || (field.key === "rarity" ? "unknown" : "");
        if (field.key === "source_type" && !input.value) input.value = "";
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.className = "form-input";
        input.maxLength = field.max || 240;
        input.placeholder = field.placeholder || "";
        input.value = current;
      }

      input.id = "resourceField_" + field.key;
      input.addEventListener("input", function() {
        fieldState[field.key] = input.value;
        if (field.key === "entity_name") scheduleSynonymCheck(client);
      });
      input.addEventListener("blur", function() {
        if (field.key === "entity_name") scheduleSynonymCheck(client);
      });
      group.appendChild(input);

      if (field.type === "select" && field.key === "source_type") {
        const grid = document.createElement("div");
        grid.className = "bl-discovery-option-grid";
        grid.style.marginTop = "8px";
        (field.options || []).forEach(function(opt) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "bl-discovery-option-card" + (String(fieldState.source_type || "") === String(opt) ? " selected" : "");
          btn.textContent = humanizeOption(opt);
          btn.addEventListener("click", function() {
            fieldState.source_type = opt;
            input.value = opt;
            btn.parentElement.querySelectorAll(".bl-discovery-option-card").forEach(function(node) {
              node.classList.toggle("selected", node === btn);
            });
          });
          grid.appendChild(btn);
        });
        group.appendChild(grid);
      }

      if (field.placeholder) {
        const hint = document.createElement("p");
        hint.className = "field-hint";
        hint.textContent = field.placeholder;
        group.appendChild(hint);
      }

      wrap.appendChild(group);
    });

    if (!fieldState.rarity) fieldState.rarity = "unknown";
    if (!fieldState.confidence_level) fieldState.confidence_level = "2-single-observation";
    renderSynonymWarning(warnHost);
  }

  function collectPayload() {
    const schema = getSchema();
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    const payload = {
      discovery_type: "resource",
    };

    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i];
      const value = String(fieldState[field.key] == null ? "" : fieldState[field.key]).trim();
      if (field.required && !value) {
        return { error: "Please fill the required field: " + field.label };
      }
      if (value) payload[field.key] = value;
    }

    if (!payload.source_type) payload.source_type = "unknown";
    if (!payload.rarity) payload.rarity = "unknown";
    if (!payload.confidence_level) payload.confidence_level = "2-single-observation";
    if (!payload.gathering_tool) payload.gathering_tool = "Unknown";

    payload.resource = sanitizeResourceBlock(payload);
    payload.evidence_tier = payload.confidence_level === "4-confirmed" ? "confirmed" : "reported";

    return { payload: payload };
  }

  function sanitizeResourceBlock(payload) {
    const out = {
      source_type: payload.source_type || "unknown",
      rarity: payload.rarity || "unknown",
      evidence_tier: payload.evidence_tier || "reported",
      confidence: payload.confidence_level || "2-single-observation",
    };
    if (payload.source_detail) out.source_detail = String(payload.source_detail).slice(0, 240);
    if (payload.region_name) out.biome = String(payload.region_name).slice(0, 120);
    if (payload.gathering_tool) out.gathering_tool = String(payload.gathering_tool).slice(0, 80);
    if (payload.notes) out.notes = String(payload.notes).slice(0, 500);
    if (payload.source_entity_name) out.source_entity_name = String(payload.source_entity_name).slice(0, 120);
    return out;
  }

  function applyPrefill(opts) {
    const options = opts || {};
    if (options.name) {
      fieldState.entity_name = String(options.name).trim();
      const titleInput = document.getElementById("postTitle");
      if (titleInput) titleInput.value = fieldState.entity_name;
    }
    if (options.source === "missing-entry") {
      fieldState._missing_entry_source = true;
    }
  }

  function applyMetaDefaults(meta) {
    if (!meta || typeof meta !== "object") return meta;
    meta.discovery_form = "resource_quick";
    meta.entity_domain = "OBJECT";
    meta.entity_subtype = "resource";
    return meta;
  }

  async function checkSynonymBeforeSubmit(client) {
    const name = String(fieldState.entity_name || "").trim();
    if (!name) return { ok: true };
    if (synonymAcknowledged) return { ok: true };
    synonymMatches = await findSimilarResources(client, name);
    if (!synonymMatches.length) return { ok: true };
    renderSynonymWarning(document.getElementById("resourceSynonymWarning"));
    return {
      ok: false,
      message: "Possible existing resource found. Review the warning, open the existing entry, or choose Continue anyway.",
    };
  }

  function isGenericSourceDetail(text) {
    const clean = String(text || "").trim().toLowerCase();
    if (!clean) return true;
    if (clean.length < 4) return true;
    const generic = ["nodes", "node", "crystals", "crystal", "ore", "ores", "mushrooms", "plants", "rocks", "deposit", "deposits"];
    const words = clean.split(/\s+/);
    if (words.length <= 3 && generic.some(function(g) { return clean.indexOf(g) >= 0; })) return true;
    return false;
  }

  function shouldLinkHarvestedFromEntity(payload) {
    const sourceEntity = String(payload.source_entity_name || "").trim();
    if (!sourceEntity) return false;
    const sourceType = String(payload.source_type || "").toLowerCase();
    if (sourceType === "creature-drop") return true;
    if (sourceType === "plant" && sourceEntity.length >= 4 && !isGenericSourceDetail(sourceEntity)) return true;
    if (sourceType === "mining" && sourceEntity.length >= 5 && !isGenericSourceDetail(sourceEntity)) return true;
    return false;
  }

  return {
    isActive: isActive,
    activate: activate,
    deactivate: deactivate,
    renderPanel: renderPanel,
    collectPayload: collectPayload,
    applyMetaDefaults: applyMetaDefaults,
    checkSynonymBeforeSubmit: checkSynonymBeforeSubmit,
    findSimilarResources: findSimilarResources,
    namesAreSimilar: namesAreSimilar,
    normalizeCompareName: normalizeCompareName,
    sanitizeResourceBlock: sanitizeResourceBlock,
    shouldLinkHarvestedFromEntity: shouldLinkHarvestedFromEntity,
    isGenericSourceDetail: isGenericSourceDetail,
    applyPrefill: applyPrefill,
    getFieldState: function() { return Object.assign({}, fieldState); },
  };
})();
