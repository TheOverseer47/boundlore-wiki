// ============================================
// BoundLore Versioning Model — P0.5-F baseline
// Null-safe version metadata helpers for facts,
// relations, recipes, and facets. No DB schema,
// no history UI, no fake game versions.
// ============================================

window.BoundLoreVersioning = (function() {
  const UNKNOWN_VALUES = new Set(["unknown", "unclear", "n/a", "na", "none", "not specified", "pre-release"]);

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function meaningful(value) {
    const clean = String(value == null ? "" : value).trim();
    if (!clean) return "";
    if (UNKNOWN_VALUES.has(clean.toLowerCase())) return "";
    return clean;
  }

  function normalizeGameVersion(value) {
    const clean = meaningful(value);
    if (!clean) return null;
    return clean.slice(0, 40);
  }

  function normalizeValidityRange(input) {
    const src = input && typeof input === "object" ? input : {};
    const validFrom = meaningful(src.valid_from);
    const validUntil = meaningful(src.valid_until);
    if (!validFrom && !validUntil) return null;
    return {
      valid_from: validFrom || null,
      valid_until: validUntil || null,
    };
  }

  function normalizeVersionMetadata(input) {
    const src = input && typeof input === "object" ? input : {};
    const gameVersion = normalizeGameVersion(src.game_version);
    const validFrom = meaningful(src.valid_from);
    const validUntil = meaningful(src.valid_until);
    const supersededBy = meaningful(src.superseded_by);
    const supersedes = meaningful(src.supersedes);
    const changeNote = meaningful(src.change_note);
    const versionConfidence = meaningful(src.version_confidence) || "unknown";

    const hasMeaningful = !!(gameVersion || validFrom || validUntil || supersededBy || supersedes || changeNote);
    if (!hasMeaningful) return null;

    return {
      game_version: gameVersion,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      superseded_by: supersededBy || null,
      supersedes: supersedes || null,
      change_note: changeNote,
      version_confidence: versionConfidence,
    };
  }

  function normalizeVersionedStatement(input) {
    if (!input || typeof input !== "object") return null;
    const version = extractVersionMetadata(input);
    const out = Object.assign({}, input);
    if (version) out.version = version;
    else delete out.version;
    return out;
  }

  function extractVersionMetadata(statement) {
    if (!statement || typeof statement !== "object") return null;

    if (statement.version && typeof statement.version === "object") {
      const normalized = normalizeVersionMetadata(statement.version);
      if (normalized) return normalized;
    }

    const fromQualifiers = statement.qualifiers && typeof statement.qualifiers === "object"
      ? normalizeVersionMetadata(statement.qualifiers)
      : null;
    if (fromQualifiers) return fromQualifiers;

    return normalizeVersionMetadata({
      game_version: statement.game_version,
      valid_from: statement.valid_from,
      valid_until: statement.valid_until,
      superseded_by: statement.superseded_by,
      supersedes: statement.supersedes,
      change_note: statement.change_note,
      version_confidence: statement.version_confidence,
    });
  }

  function attachVersionMetadata(statement, metadata) {
    const base = statement && typeof statement === "object" ? Object.assign({}, statement) : {};
    const version = normalizeVersionMetadata(metadata);
    if (version) base.version = version;
    return base;
  }

  function normalizeQualifiers(input) {
    if (!input || typeof input !== "object") return null;
    const out = Object.assign({}, input);
    const versionFields = ["game_version", "valid_from", "valid_until", "superseded_by", "supersedes", "change_note", "version_confidence"];
    const versionSource = {};
    versionFields.forEach(function(key) {
      if (out[key] != null && String(out[key]).trim()) versionSource[key] = out[key];
    });
    const version = normalizeVersionMetadata(versionSource);
    versionFields.forEach(function(key) {
      if (version && version[key] != null) out[key] = version[key];
      else if (out[key] == null || !meaningful(out[key])) delete out[key];
    });
    return Object.keys(out).length ? out : null;
  }

  function preserveVersionFieldsOnRecord(record, source) {
    const out = record && typeof record === "object" ? Object.assign({}, record) : {};
    const src = source && typeof source === "object" ? source : null;
    if (!src) return out;

    const version = extractVersionMetadata(src);
    if (version) out.version = version;

    if (src.qualifiers && typeof src.qualifiers === "object") {
      const qualifiers = normalizeQualifiers(src.qualifiers);
      if (qualifiers) out.qualifiers = qualifiers;
    }

    return out;
  }

  function isSupersededStatement(statement) {
    const version = extractVersionMetadata(statement);
    return !!(version && version.superseded_by);
  }

  function isHistoricalStatement(statement, options) {
    void options;
    const version = extractVersionMetadata(statement);
    if (!version) return false;
    if (version.superseded_by) return true;
    if (version.valid_until) return true;
    return false;
  }

  function isCurrentStatement(statement, options) {
    if (!statement) return true;
    if (isSupersededStatement(statement)) return false;
    if (isHistoricalStatement(statement, options)) return false;
    return true;
  }

  function compareVersionedStatements(a, b) {
    const va = extractVersionMetadata(a);
    const vb = extractVersionMetadata(b);
    const currentA = isCurrentStatement(a);
    const currentB = isCurrentStatement(b);
    if (currentA !== currentB) return currentA ? -1 : 1;

    const fromA = va && va.valid_from ? va.valid_from : "";
    const fromB = vb && vb.valid_from ? vb.valid_from : "";
    if (fromA !== fromB) return fromA > fromB ? -1 : 1;

    const patchA = va && va.game_version ? va.game_version : "";
    const patchB = vb && vb.game_version ? vb.game_version : "";
    if (patchA !== patchB) return patchA > patchB ? -1 : 1;

    return 0;
  }

  function formatGameVersionLabel(value) {
    const clean = normalizeGameVersion(value);
    if (!clean) return "";
    if (/^patch\s/i.test(clean)) return clean;
    return "Patch " + clean;
  }

  function formatValidityLabel(metadata) {
    const version = normalizeVersionMetadata(metadata);
    if (!version) return "";
    if (version.valid_from && version.valid_until) {
      return "Valid " + version.valid_from + " – " + version.valid_until;
    }
    if (version.valid_from) return "Since " + version.valid_from;
    if (version.valid_until) return "Valid until " + version.valid_until;
    return "";
  }

  function buildVersionBadgeEntries(metadata, options) {
    const opts = options || {};
    const version = normalizeVersionMetadata(metadata);
    if (!version) return [];

    const entries = [];
    if (isSupersededStatement({ version: version })) {
      entries.push({ key: "superseded", label: "Superseded" });
    } else if (isHistoricalStatement({ version: version }, opts)) {
      entries.push({ key: "historical", label: "Historical" });
    }

    const patchLabel = formatGameVersionLabel(version.game_version);
    if (patchLabel && version.valid_from) {
      entries.push({ key: "since", label: "Since " + (version.valid_from || patchLabel) });
    } else if (patchLabel) {
      entries.push({ key: "since_patch", label: "Since " + patchLabel });
    } else if (version.valid_from) {
      entries.push({ key: "since", label: "Since " + version.valid_from });
    }

    if (version.valid_until && !isSupersededStatement({ version: version })) {
      entries.push({ key: "valid_until", label: "Valid until " + version.valid_until });
    }

    if (version.change_note && opts.includeChangeNote) {
      entries.push({ key: "change_note", label: version.change_note });
    }

    return entries;
  }

  function renderVersionBadge(metadata, options) {
    const entries = buildVersionBadgeEntries(metadata, options);
    if (!entries.length) return "";
    const entry = entries[0];
    return '<span class="bl-version-badge bl-version-badge--' + escapeHtml(entry.key) + '" title="' +
      escapeHtml(entry.label) + '">' + escapeHtml(entry.label) + "</span>";
  }

  function renderVersionBadgeGroup(metadata, options) {
    const entries = buildVersionBadgeEntries(metadata, options);
    if (!entries.length) return "";
    const parts = entries.map(function(entry) {
      return '<span class="bl-version-badge bl-version-badge--' + escapeHtml(entry.key) + '" title="' +
        escapeHtml(entry.label) + '">' + escapeHtml(entry.label) + "</span>";
    });
    const cls = "bl-version-badges" + (options && options.groupClassName ? " " + options.groupClassName : "");
    return '<div class="' + escapeHtml(cls) + '">' + parts.join("") + "</div>";
  }

  function collectVersionSearchSignals(source) {
    const version = extractVersionMetadata(source);
    if (!version) return [];
    const signals = [];
    if (version.game_version) signals.push(version.game_version, formatGameVersionLabel(version.game_version));
    if (version.valid_from) signals.push(version.valid_from);
    if (version.valid_until) signals.push(version.valid_until);
    if (version.change_note) signals.push(version.change_note);
    if (version.superseded_by) signals.push("superseded", version.superseded_by);
    if (isHistoricalStatement({ version: version })) signals.push("historical");
    return signals.filter(function(value, index, arr) {
      return value && arr.indexOf(value) === index;
    });
  }

  return {
    normalizeGameVersion: normalizeGameVersion,
    normalizeValidityRange: normalizeValidityRange,
    normalizeVersionMetadata: normalizeVersionMetadata,
    normalizeVersionedStatement: normalizeVersionedStatement,
    normalizeQualifiers: normalizeQualifiers,
    attachVersionMetadata: attachVersionMetadata,
    extractVersionMetadata: extractVersionMetadata,
    preserveVersionFieldsOnRecord: preserveVersionFieldsOnRecord,
    isCurrentStatement: isCurrentStatement,
    isHistoricalStatement: isHistoricalStatement,
    isSupersededStatement: isSupersededStatement,
    compareVersionedStatements: compareVersionedStatements,
    formatGameVersionLabel: formatGameVersionLabel,
    formatValidityLabel: formatValidityLabel,
    renderVersionBadge: renderVersionBadge,
    renderVersionBadgeGroup: renderVersionBadgeGroup,
    collectVersionSearchSignals: collectVersionSearchSignals,
    escapeHtml: escapeHtml,
  };
})();
