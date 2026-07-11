// Station Type Quick-Add — P0.5-D safe create prefill (no auto-save)
window.StationTypeQuickAdd = (function() {
  let active = false;
  let fieldState = {};

  function isActive() {
    return active;
  }

  function activate() {
    active = true;
    fieldState = {
      confidence_level: "2-single-observation",
      notes: "",
    };
  }

  function deactivate() {
    active = false;
    fieldState = {};
  }

  function getSchema() {
    return {
      fields: [
        {
          key: "entity_name",
          label: "Station Name",
          type: "text",
          required: true,
          max: 120,
          placeholder: "e.g. Forge, Workbench, Alchemy Table",
        },
        {
          key: "notes",
          label: "Known use / observation notes",
          type: "textarea",
          required: false,
          max: 600,
          placeholder: "What is this station used for? Any observed crafting context.",
        },
        {
          key: "confidence_level",
          label: "Confidence",
          type: "select",
          required: false,
          options: ["2-single-observation", "3-corroborated", "4-confirmed"],
        },
      ],
    };
  }

  function humanizeOption(value) {
    const map = {
      "2-single-observation": "Single observation",
      "3-corroborated": "Corroborated",
      "4-confirmed": "Confirmed",
    };
    return map[value] || String(value || "").replace(/-/g, " ");
  }

  function syncTitleFromName(name) {
    const titleInput = document.getElementById("postTitle");
    if (titleInput && name) titleInput.value = name;
  }

  function applyPrefill(opts) {
    const options = opts || {};
    if (options.name) {
      fieldState.entity_name = String(options.name).trim();
      syncTitleFromName(fieldState.entity_name);
    }
    if (options.source === "missing-entry") {
      fieldState._missing_entry_source = true;
    }
  }

  function renderMissingEntryBanner(wrap) {
    if (!fieldState._missing_entry_source || !wrap) return;
    const banner = document.createElement("p");
    banner.className = "bl-missing-entry-prefill-banner";
    banner.textContent = "Starting a new station type entry from a missing-entry reference. Nothing is saved until you submit for review.";
    wrap.insertBefore(banner, wrap.firstChild ? wrap.firstChild.nextSibling : null);
  }

  function renderPanel(wrap) {
    if (!wrap) return;
    const schema = getSchema();
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    wrap.innerHTML = "";
    wrap.style.display = "block";

    const head = document.createElement("div");
    head.innerHTML = '<p class="bl-discovery-kicker">Station Type Quick-Add</p><h3 style="margin:0 0 6px;">Report a crafting station type</h3>';
    wrap.appendChild(head);

    const intro = document.createElement("p");
    intro.className = "field-hint";
    intro.textContent = "Generic crafting stations (e.g. Forge) are SYSTEM / station_type entries — not places or items. Only the station name is required.";
    wrap.appendChild(intro);

    renderMissingEntryBanner(wrap);

    fields.forEach(function(field) {
      const group = document.createElement("div");
      group.className = "form-group";
      group.style.marginTop = "10px";

      const label = document.createElement("label");
      label.setAttribute("for", "stationField_" + field.key);
      label.textContent = field.label + (field.required ? " *" : "");
      group.appendChild(label);

      let input;
      const current = fieldState[field.key] != null ? fieldState[field.key] : "";
      if (field.type === "textarea") {
        input = document.createElement("textarea");
        input.rows = 3;
        input.className = "form-input";
        input.maxLength = field.max || 600;
        input.placeholder = field.placeholder || "";
        input.value = current;
      } else if (field.type === "select") {
        input = document.createElement("select");
        input.className = "form-input";
        (field.options || []).forEach(function(opt) {
          const option = document.createElement("option");
          option.value = opt;
          option.textContent = humanizeOption(opt);
          if (String(current) === String(opt)) option.selected = true;
          input.appendChild(option);
        });
      } else {
        input = document.createElement("input");
        input.type = "text";
        input.className = "form-input";
        input.maxLength = field.max || 120;
        input.placeholder = field.placeholder || "";
        input.value = current;
      }

      input.id = "stationField_" + field.key;
      input.addEventListener("input", function() {
        fieldState[field.key] = input.value;
        if (field.key === "entity_name") syncTitleFromName(input.value);
      });
      group.appendChild(input);

      if (field.placeholder && field.type !== "textarea") {
        const hint = document.createElement("p");
        hint.className = "field-hint";
        hint.textContent = field.placeholder;
        group.appendChild(hint);
      }

      wrap.appendChild(group);
    });

    if (!fieldState.confidence_level) fieldState.confidence_level = "2-single-observation";
  }

  function collectPayload() {
    const schema = getSchema();
    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    const payload = {
      discovery_type: "station_type",
    };

    for (let i = 0; i < fields.length; i += 1) {
      const field = fields[i];
      const value = String(fieldState[field.key] == null ? "" : fieldState[field.key]).trim();
      if (field.required && !value) {
        return { error: "Please fill the required field: " + field.label };
      }
      if (value) payload[field.key] = value;
    }

    if (!payload.confidence_level) payload.confidence_level = "2-single-observation";
    payload.evidence_tier = payload.confidence_level === "4-confirmed" ? "confirmed" : "reported";
    payload.station_type = {
      notes: payload.notes || "",
      evidence_tier: payload.evidence_tier,
      confidence: payload.confidence_level,
    };

    return { payload: payload };
  }

  function applyMetaDefaults(meta) {
    if (!meta || typeof meta !== "object") return meta;
    meta.discovery_form = "station_type_quick";
    meta.entity_domain = "SYSTEM";
    meta.entity_subtype = "station_type";
    return meta;
  }

  return {
    isActive: isActive,
    activate: activate,
    deactivate: deactivate,
    renderPanel: renderPanel,
    collectPayload: collectPayload,
    applyMetaDefaults: applyMetaDefaults,
    applyPrefill: applyPrefill,
    getFieldState: function() { return Object.assign({}, fieldState); },
    getSchema: getSchema,
  };
})();

window.BoundLoreStationTypeQuickAdd = window.StationTypeQuickAdd;
