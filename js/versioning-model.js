// ============================================
// BoundLore Versioning Model — P0.5-F + P2-D.1 baseline
// Null-safe version metadata helpers for facts,
// relations, recipes, and facets. No DB schema,
// no history UI unless real version data exists.
// ============================================

window.BoundLoreVersioning = (function() {
  const UNKNOWN_VALUES = new Set(["unknown", "unclear", "n/a", "na", "none", "not specified", "pre-release"]);

  const VERSION_FIELD_KEYS = [
    "game_version", "valid_from", "valid_until", "superseded_by", "supersedes",
    "change_note", "version_confidence", "introduced_in", "changed_in", "removed_in",
  ];

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

  function normalizeVersionRange(input) {
    return normalizeValidityRange(input);
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
    const introducedIn = meaningful(src.introduced_in);
    const changedIn = meaningful(src.changed_in);
    const removedIn = meaningful(src.removed_in);

    const hasMeaningful = !!(
      gameVersion || validFrom || validUntil || supersededBy || supersedes ||
      changeNote || introducedIn || changedIn || removedIn
    );
    if (!hasMeaningful) return null;

    return {
      game_version: gameVersion,
      valid_from: validFrom || null,
      valid_until: validUntil || null,
      superseded_by: supersededBy || null,
      supersedes: supersedes || null,
      change_note: changeNote,
      version_confidence: versionConfidence,
      introduced_in: introducedIn || null,
      changed_in: changedIn || null,
      removed_in: removedIn || null,
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
      introduced_in: statement.introduced_in,
      changed_in: statement.changed_in,
      removed_in: statement.removed_in,
    });
  }

  function readVersionSignals(source) {
    if (!source || typeof source !== "object") return null;
    const version = extractVersionMetadata(source);
    if (version) return version;

    const direct = {};
    VERSION_FIELD_KEYS.forEach(function(key) {
      const val = meaningful(source[key]);
      if (val) direct[key] = val;
    });
    if (!Object.keys(direct).length) return null;
    return normalizeVersionMetadata(direct);
  }

  function hasVersionSignals(source) {
    return !!readVersionSignals(source);
  }

  function compareVersionStrings(a, b) {
    const ca = meaningful(a);
    const cb = meaningful(b);
    if (!ca || !cb) return 0;
    if (ca === cb) return 0;
    return ca > cb ? 1 : -1;
  }

  function getContextVersion(context) {
    const ctx = context && typeof context === "object" ? context : {};
    return normalizeGameVersion(ctx.game_version || ctx.current_version || ctx.patch_version);
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

  function isCurrentlyValid(source, context) {
    void context;
    return isCurrentStatement(source);
  }

  function isFutureValid(source, context) {
    const signals = readVersionSignals(source);
    if (!signals) return false;
    const ctxVersion = getContextVersion(context);
    if (!ctxVersion) return false;
    const from = meaningful(signals.valid_from);
    if (from && compareVersionStrings(from, ctxVersion) > 0) return true;
    const intro = meaningful(signals.introduced_in);
    if (intro && compareVersionStrings(intro, ctxVersion) > 0) return true;
    return false;
  }

  function isExpiredInVersion(source, context) {
    const signals = readVersionSignals(source);
    if (!signals) return false;
    if (isRemoved(source)) return true;
    const ctxVersion = getContextVersion(context);
    const until = meaningful(signals.valid_until);
    if (until) {
      if (!ctxVersion) return true;
      return compareVersionStrings(until, ctxVersion) <= 0;
    }
    const removedIn = meaningful(signals.removed_in);
    if (removedIn && ctxVersion) {
      return compareVersionStrings(removedIn, ctxVersion) <= 0;
    }
    if (removedIn && !ctxVersion) return true;
    return false;
  }

  function isSuperseded(source) {
    return isSupersededStatement(source);
  }

  function isRemoved(source) {
    const signals = readVersionSignals(source);
    return !!(signals && meaningful(signals.removed_in));
  }

  function isIntroducedIn(source) {
    const signals = readVersionSignals(source);
    return !!(signals && meaningful(signals.introduced_in));
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
    if (version.introduced_in) return "Introduced in " + version.introduced_in;
    if (version.changed_in) return "Changed in " + version.changed_in;
    if (version.removed_in) return "Removed in " + version.removed_in;
    return "";
  }

  function getVersionDisplayLabel(value) {
    return formatGameVersionLabel(value);
  }

  function getVersionValidityLabel(source, context) {
    void context;
    const signals = readVersionSignals(source);
    return formatValidityLabel(signals);
  }

  function getVersionStateBadges(source, context) {
    const signals = readVersionSignals(source);
    if (!signals) return [];
    return buildVersionBadgeEntries(signals, context);
  }

  function getVersionHistoryEntries(source) {
    if (!source || typeof source !== "object") return [];
    const history = Array.isArray(source.version_history) ? source.version_history : null;
    if (history && history.length) {
      return history.map(function(entry) {
        const signals = readVersionSignals(entry);
        if (!signals) return null;
        return {
          signals: signals,
          label: getVersionValidityLabel(entry) || getVersionDisplayLabel(signals.game_version) || "",
          badges: getVersionStateBadges(entry),
        };
      }).filter(Boolean);
    }
    const signals = readVersionSignals(source);
    if (!signals) return [];
    return [{
      signals: signals,
      label: getVersionValidityLabel(source) || getVersionDisplayLabel(signals.game_version) || "",
      badges: getVersionStateBadges(source),
    }];
  }

  function getVersionHistorySummary(source) {
    const entries = getVersionHistoryEntries(source);
    if (!entries.length) return "";
    if (entries.length === 1) {
      const parts = (entries[0].badges || []).map(function(b) { return b.label; }).filter(Boolean);
      return parts.join(" · ");
    }
    return entries.length + " version entries";
  }

  function shouldDisplayVersionBadge(source) {
    if (!hasVersionSignals(source)) return false;
    return getVersionStateBadges(source).length > 0;
  }

  function shouldDisplayVersionHistory(source) {
    if (!hasVersionSignals(source)) return false;
    const entries = getVersionHistoryEntries(source);
    if (entries.length > 1) return true;
    if (entries.length === 1) {
      const s = entries[0].signals || {};
      const lifecycleCount = [
        "game_version", "valid_from", "valid_until", "superseded_by",
        "introduced_in", "changed_in", "removed_in",
      ].filter(function(k) { return meaningful(s[k]); }).length;
      return lifecycleCount >= 2;
    }
    return false;
  }

  function shouldDisplayOutdatedBadge(source) {
    if (!shouldDisplayVersionBadge(source)) return false;
    return isSuperseded(source) || isHistoricalStatement(source);
  }

  function resolveVersionContext(input) {
    const src = input && typeof input === "object" ? input : {};
    const meta = src.meta && typeof src.meta === "object" ? src.meta : {};
    const payload = src.discovery_payload && typeof src.discovery_payload === "object"
      ? src.discovery_payload
      : (meta.discovery_payload && typeof meta.discovery_payload === "object" ? meta.discovery_payload : {});
    const recipe = payload.recipe && typeof payload.recipe === "object" ? payload.recipe : null;
    const targets = [recipe, payload, meta].filter(Boolean);
    let historySource = null;
    let signals = null;
    for (let i = 0; i < targets.length; i += 1) {
      const s = readVersionSignals(targets[i]);
      if (s) {
        signals = s;
        historySource = targets[i];
        break;
      }
    }
    const source = historySource || meta;
    return {
      hasVersion: hasVersionSignals(source),
      signals: signals,
      shouldDisplayBadge: shouldDisplayVersionBadge(source),
      shouldDisplayHistory: shouldDisplayVersionHistory(source),
      shouldDisplayOutdated: shouldDisplayOutdatedBadge(source),
      summary: getVersionHistorySummary(source),
      entries: getVersionHistoryEntries(source),
    };
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

    if (version.introduced_in) {
      entries.push({ key: "introduced_in", label: "Introduced in " + version.introduced_in });
    }
    if (version.changed_in) {
      entries.push({ key: "changed_in", label: "Changed in " + version.changed_in });
    }
    if (version.removed_in) {
      entries.push({ key: "removed_in", label: "Removed in " + version.removed_in });
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

  function renderVersionHistoryGroup(source, options) {
    if (!shouldDisplayVersionHistory(source)) return "";
    const entries = getVersionHistoryEntries(source);
    if (!entries.length) return "";
    const opts = options || {};
    let html = '<div class="bl-version-history' + (opts.groupClassName ? " " + escapeHtml(opts.groupClassName) : "") + '">';
    html += '<div class="bl-version-history-title">Version history</div>';
    html += '<ul class="bl-version-history-list">';
    entries.forEach(function(entry) {
      html += '<li class="bl-version-history-item">';
      if (entry.label) {
        html += '<span class="bl-version-history-label">' + escapeHtml(entry.label) + "</span>";
      }
      (entry.badges || []).forEach(function(badge) {
        html += '<span class="bl-version-badge bl-version-badge--' + escapeHtml(badge.key) + '">' +
          escapeHtml(badge.label) + "</span>";
      });
      html += "</li>";
    });
    html += "</ul></div>";
    return html;
  }

  function collectVersionSearchSignals(source) {
    const version = readVersionSignals(source);
    if (!version) return [];
    const signals = [];
    if (version.game_version) signals.push(version.game_version, formatGameVersionLabel(version.game_version));
    if (version.valid_from) signals.push(version.valid_from);
    if (version.valid_until) signals.push(version.valid_until);
    if (version.change_note) signals.push(version.change_note);
    if (version.introduced_in) signals.push("introduced in", version.introduced_in);
    if (version.changed_in) signals.push("changed in", version.changed_in);
    if (version.removed_in) signals.push("removed in", version.removed_in);
    if (version.superseded_by) signals.push("superseded", version.superseded_by);
    if (isHistoricalStatement({ version: version })) signals.push("historical");
    if (isSuperseded({ version: version })) signals.push("outdated");
    return signals.filter(function(value, index, arr) {
      return value && arr.indexOf(value) === index;
    });
  }

  return {
    normalizeGameVersion: normalizeGameVersion,
    normalizeValidityRange: normalizeValidityRange,
    normalizeVersionRange: normalizeVersionRange,
    normalizeVersionMetadata: normalizeVersionMetadata,
    normalizeVersionedStatement: normalizeVersionedStatement,
    normalizeQualifiers: normalizeQualifiers,
    attachVersionMetadata: attachVersionMetadata,
    extractVersionMetadata: extractVersionMetadata,
    readVersionSignals: readVersionSignals,
    hasVersionSignals: hasVersionSignals,
    preserveVersionFieldsOnRecord: preserveVersionFieldsOnRecord,
    isCurrentStatement: isCurrentStatement,
    isCurrentlyValid: isCurrentlyValid,
    isFutureValid: isFutureValid,
    isExpiredInVersion: isExpiredInVersion,
    isHistoricalStatement: isHistoricalStatement,
    isSupersededStatement: isSupersededStatement,
    isSuperseded: isSuperseded,
    isRemoved: isRemoved,
    isIntroducedIn: isIntroducedIn,
    compareVersionedStatements: compareVersionedStatements,
    formatGameVersionLabel: formatGameVersionLabel,
    formatValidityLabel: formatValidityLabel,
    getVersionDisplayLabel: getVersionDisplayLabel,
    getVersionValidityLabel: getVersionValidityLabel,
    getVersionStateBadges: getVersionStateBadges,
    getVersionHistoryEntries: getVersionHistoryEntries,
    getVersionHistorySummary: getVersionHistorySummary,
    shouldDisplayVersionBadge: shouldDisplayVersionBadge,
    shouldDisplayVersionHistory: shouldDisplayVersionHistory,
    shouldDisplayOutdatedBadge: shouldDisplayOutdatedBadge,
    resolveVersionContext: resolveVersionContext,
    renderVersionBadge: renderVersionBadge,
    renderVersionBadgeGroup: renderVersionBadgeGroup,
    renderVersionHistoryGroup: renderVersionHistoryGroup,
    collectVersionSearchSignals: collectVersionSearchSignals,
    escapeHtml: escapeHtml,
  };
})();
