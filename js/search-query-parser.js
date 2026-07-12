// ============================================
// BoundLore Structured Search Query Parser
// P1-E.1 — client-side query hints for search ranking.
// No DB, no search index, no embeddings. See docs/architecture/search-architecture.md
// ============================================

window.BoundLoreSearchQueryParser = (function() {
  const GENERIC_TERMS = new Set([
    "item", "items", "entry", "entries", "wiki", "post", "posts", "the", "a", "an", "in", "at", "for",
  ]);

  const FACET_KEYWORD_HINTS = [
    { pattern: /\bresources?\b/i, group: "entity_subtype", value: "resource" },
    { pattern: /\bmineable\b/i, group: "acquisition_method", value: "mining" },
    { pattern: /\bmining\b/i, group: "acquisition_method", value: "mining" },
    { pattern: /\braw\b/i, group: "processing_stage", value: "raw" },
    { pattern: /\bunknown rarity\b/i, group: "rarity", value: "unknown" },
    { pattern: /\bmounts?\b/i, group: "role", value: "mount" },
    { pattern: /\brideable\b/i, group: "capability", value: "rideable" },
    { pattern: /\bflying\b/i, group: "capability", value: "flyable" },
    { pattern: /\bflyable\b/i, group: "capability", value: "flyable" },
  ];

  const MISSING_ENTRY_TERMS = ["wood", "forge"];

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function normalizeSearchQuery(query) {
    return String(query || "")
      .toLowerCase()
      .replace(/[^\w\s>+-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokenizeSearchQuery(query) {
    const normalized = normalizeSearchQuery(query);
    if (!normalized) return [];
    return normalized.split(/\s+/).filter(Boolean);
  }

  function slugToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_");
  }

  function normalizeFacetHint(group, value) {
    if (typeof BoundLoreFacetBrowse !== "undefined" && BoundLoreFacetBrowse.normalizeFacetFilter) {
      const normalized = BoundLoreFacetBrowse.normalizeFacetFilter({ group: group, value: value });
      if (normalized) return normalized;
    }
    if (typeof BoundLoreFacetRegistry !== "undefined" && BoundLoreFacetRegistry.normalizeFacetValue) {
      const g = group === "entity_subtype" || group === "entity_domain"
        ? group
        : (BoundLoreFacetRegistry.normalizeFacetGroupKey(group) || group);
      if (g === "entity_domain") return { group: g, value: String(value).trim().toUpperCase() };
      if (g === "entity_subtype") return { group: g, value: slugToken(value) };
      const v = BoundLoreFacetRegistry.normalizeFacetValue(g, value);
      if (v) return { group: g, value: v };
    }
    return { group: slugToken(group), value: slugToken(value) };
  }

  function addHint(bucket, group, value, source) {
    if (!group || value == null || value === "") return;
    const normalized = normalizeFacetHint(group, value);
    if (!normalized || !normalized.group || !normalized.value) return;
    const key = normalized.group + ":" + normalized.value;
    if (bucket._seen.has(key)) return;
    bucket._seen.add(key);
    bucket.list.push({
      group: normalized.group,
      value: normalized.value,
      source: source || "keyword",
    });
  }

  function createHintBucket() {
    return { list: [], _seen: new Set() };
  }

  function mergeHintBuckets() {
    const out = createHintBucket();
    for (let i = 0; i < arguments.length; i += 1) {
      const bucket = arguments[i];
      if (!bucket || !bucket.list) continue;
      bucket.list.forEach(function(hint) {
        addHint(out, hint.group, hint.value, hint.source);
      });
    }
    return out.list;
  }

  function stripPattern(text, pattern) {
    return String(text || "").replace(pattern, " ").replace(/\s+/g, " ").trim();
  }

  function extractUsageIntent(query) {
    const raw = String(query || "").trim();
    if (!raw) return null;
    const patterns = [
      { re: /\bitems?\s+using\s+(.+)$/i, kind: "usage", field: "target" },
      { re: /\busing\s+(.+)$/i, kind: "usage", field: "target" },
      { re: /\bused\s+in\s+(.+)$/i, kind: "usage", field: "target" },
    ];
    for (let i = 0; i < patterns.length; i += 1) {
      const match = raw.match(patterns[i].re);
      if (!match || !match[1]) continue;
      return {
        kind: patterns[i].kind,
        target: match[1].trim(),
        relation_type: "crafted_from",
        source: "pattern",
      };
    }
    return null;
  }

  function extractCraftingIntent(query) {
    const raw = String(query || "").trim();
    if (!raw) return null;
    const patterns = [
      { re: /\bcrafted\s+at\s+(.+)$/i, field: "station" },
      { re: /\bcrafting\s+station\s+(.+)$/i, field: "station" },
    ];
    for (let i = 0; i < patterns.length; i += 1) {
      const match = raw.match(patterns[i].re);
      if (!match || !match[1]) continue;
      return {
        kind: "crafting",
        station: match[1].trim(),
        relation_type: "crafted_at",
        source: "pattern",
      };
    }
    return null;
  }

  function extractRelationIntentHints(query) {
    const raw = String(query || "").trim();
    const hints = [];
    if (!raw) return hints;

    const dropsMatch = raw.match(/\bdrops?\s+(.+)$/i);
    if (dropsMatch && dropsMatch[1]) {
      hints.push({ kind: "relation", relation_type: "drops", target: dropsMatch[1].trim(), source: "pattern" });
    }

    const droppedByMatch = raw.match(/\bdropped\s+by\s+(.+)$/i);
    if (droppedByMatch && droppedByMatch[1]) {
      hints.push({ kind: "relation", relation_type: "dropped_by", target: droppedByMatch[1].trim(), source: "pattern" });
    }

    const inLocationMatch = raw.match(/\bresources?\s+in\s+(.+)$/i);
    if (inLocationMatch && inLocationMatch[1]) {
      hints.push({ kind: "relation", relation_type: "found_in", target: inLocationMatch[1].trim(), source: "pattern" });
    }

    return hints;
  }

  function extractFacetHints(query) {
    const raw = String(query || "");
    const bucket = createHintBucket();
    FACET_KEYWORD_HINTS.forEach(function(entry) {
      if (entry.pattern.test(raw)) {
        addHint(bucket, entry.group, entry.value, "keyword");
      }
    });
    return bucket.list;
  }

  function extractEntityTypeHints(query) {
    const bucket = createHintBucket();
    const raw = String(query || "");
    if (/\bresources?\b/i.test(raw)) addHint(bucket, "entity_subtype", "resource", "entity_type");
    if (/\bitems?\b/i.test(raw) && !/\bresource/i.test(raw)) addHint(bucket, "entity_subtype", "item", "entity_type");
    if (/\bcreatures?\b/i.test(raw)) addHint(bucket, "entity_subtype", "creature", "entity_type");
    if (/\bnpcs?\b/i.test(raw)) addHint(bucket, "entity_subtype", "npc", "entity_type");
    if (/\bquests?\b/i.test(raw)) addHint(bucket, "entity_subtype", "quest", "entity_type");
    if (/\bevents?\b/i.test(raw) && !/\bcommunity events?\b/i.test(raw)) {
      addHint(bucket, "entity_subtype", "event", "entity_type");
    }
    return bucket.list;
  }

  function extractAcquisitionIntent(query) {
    const raw = String(query || "");
    if (/\b(mining|mineable)\b/i.test(raw)) {
      return { kind: "acquisition", method: "mining", source: "keyword" };
    }
    return null;
  }

  function extractMissingEntryIntent(query) {
    const tokens = tokenizeSearchQuery(query);
    const hits = tokens.filter(function(token) {
      return MISSING_ENTRY_TERMS.indexOf(token) >= 0;
    });
    if (!hits.length) return null;
    return {
      kind: "missing_entry",
      terms: hits.slice(),
      source: "keyword",
    };
  }

  function computeResidualText(raw, parsedParts) {
    let text = String(raw || "");
    const stripPatterns = [
      /\bitems?\s+using\s+/gi,
      /\busing\s+/gi,
      /\bused\s+in\s+/gi,
      /\bcrafted\s+at\s+/gi,
      /\bcrafting\s+station\s+/gi,
      /\bdrops?\s+/gi,
      /\bdropped\s+by\s+/gi,
      /\bresources?\s+in\s+/gi,
      /\bunknown rarity\b/gi,
      /\bmineable\b/gi,
    ];
    stripPatterns.forEach(function(re) {
      text = text.replace(re, " ");
    });
    return normalizeSearchQuery(text);
  }

  function parseSearchQuery(query) {
    const raw = String(query || "").trim();
    const normalized = normalizeSearchQuery(raw);
    const usageIntent = extractUsageIntent(raw);
    const craftingIntent = extractCraftingIntent(raw);
    const relationHints = extractRelationIntentHints(raw);
    const facetHints = extractFacetHints(raw);
    const entityTypeHints = extractEntityTypeHints(raw);
    const acquisitionIntent = extractAcquisitionIntent(raw);
    const missingEntryIntent = extractMissingEntryIntent(raw);
    const allFacetHints = mergeHintBuckets(
      { list: facetHints, _seen: new Set(facetHints.map(function(h) { return h.group + ":" + h.value; })) },
      { list: entityTypeHints, _seen: new Set(entityTypeHints.map(function(h) { return h.group + ":" + h.value; })) }
    );

    const residual = computeResidualText(raw, {
      usageIntent: usageIntent,
      craftingIntent: craftingIntent,
    });

    return {
      raw: raw,
      normalized: normalized,
      tokens: tokenizeSearchQuery(raw),
      residual: residual,
      free_text: residual || normalized,
      facet_hints: allFacetHints.length ? allFacetHints : facetHints.concat(entityTypeHints),
      relation_hints: relationHints,
      entity_type_hints: entityTypeHints,
      usage_intent: usageIntent,
      crafting_intent: craftingIntent,
      acquisition_intent: acquisitionIntent,
      missing_entry_intent: missingEntryIntent,
    };
  }

  function getQueryIntentSummary(parsed) {
    if (!parsed || typeof parsed !== "object") return "";
    const parts = [];

    (parsed.facet_hints || []).forEach(function(hint) {
      if (typeof BoundLoreFacetRegistry !== "undefined") {
        const gl = BoundLoreFacetRegistry.formatFacetGroupLabel(hint.group);
        const vl = BoundLoreFacetRegistry.formatFacetValueLabel(hint.group, hint.value);
        if (gl && vl) {
          parts.push(gl + ": " + vl);
          return;
        }
      }
      if (hint.group === "entity_subtype") parts.push("Subtype: " + hint.value);
      else parts.push(hint.group.replace(/_/g, " ") + ": " + hint.value);
    });

    if (parsed.usage_intent && parsed.usage_intent.target) {
      parts.push("Usage: " + parsed.usage_intent.target);
    }
    if (parsed.crafting_intent && parsed.crafting_intent.station) {
      parts.push("Crafting at: " + parsed.crafting_intent.station);
    }
    (parsed.relation_hints || []).forEach(function(hint) {
      if (hint.relation_type && hint.target) {
        parts.push(hint.relation_type.replace(/_/g, " ") + ": " + hint.target);
      }
    });
    if (parsed.missing_entry_intent && parsed.missing_entry_intent.terms.length) {
      parts.push("Missing entry: " + parsed.missing_entry_intent.terms.join(", "));
    }

    const unique = parts.filter(function(part, index, arr) {
      return part && arr.indexOf(part) === index;
    });
    return unique.join(" + ");
  }

  function getSearchParserDebugInfo(query) {
    const parsed = parseSearchQuery(query);
    return {
      parsed: parsed,
      summary: getQueryIntentSummary(parsed),
      token_count: parsed.tokens.length,
      facet_hint_count: (parsed.facet_hints || []).length,
      relation_hint_count: (parsed.relation_hints || []).length,
    };
  }

  function signalMatchesHint(signal, hintValue) {
    if (!signal || !hintValue) return false;
    const normHint = normalizeSearchQuery(hintValue);
    const signalNorm = signal.normalized || normalizeSearchQuery(signal.raw);
    if (!normHint || !signalNorm) return false;
    if (signalNorm === normHint) return true;
    if (signalNorm.indexOf(normHint) >= 0) return true;
    if (normHint.indexOf(signalNorm) >= 0) return true;
    return normHint.split(/\s+/).every(function(token) {
      return token.length >= 2 && signalNorm.indexOf(token) >= 0;
    });
  }

  function documentHasFacetHint(document, hint) {
    if (!document || !hint) return false;
    if (hint.group === "entity_subtype" && slugToken(document.entity_subtype) === hint.value) return true;
    if (hint.group === "entity_domain" && String(document.entity_domain || "").toUpperCase() === hint.value) return true;
    const facets = (document.signals && document.signals.facets) || [];
    return facets.some(function(signal) {
      return signalMatchesHint(signal, hint.value) ||
        normalizeSearchQuery(signal.raw).indexOf(hint.value) >= 0;
    });
  }

  function applyParsedQueryToSignals(parsed, signalsOrPost) {
    const result = { boost: 0, details: [] };
    if (!parsed || !signalsOrPost) return result;

    const document = signalsOrPost.document || signalsOrPost;
    if (!document || typeof document !== "object") return result;

    const signals = document.signals || signalsOrPost.signals || {};
    const addDetail = function(kind, weight, signal, hint) {
      result.boost += weight;
      result.details.push({ kind: kind, weight: weight, signal: signal || "", hint: hint || null });
    };

    (parsed.facet_hints || []).forEach(function(hint) {
      if (documentHasFacetHint(document, hint)) {
        addDetail("facet_hint", 5, hint.group + ":" + hint.value, hint);
      }
    });

    if (parsed.usage_intent && parsed.usage_intent.target) {
      const target = parsed.usage_intent.target;
      (signals.recipe || []).concat(signals.relations || []).forEach(function(signal) {
        if (signalMatchesHint(signal, target)) {
          addDetail("usage_intent", 8, signal.raw, parsed.usage_intent);
        }
      });
    }

    if (parsed.crafting_intent && parsed.crafting_intent.station) {
      const station = parsed.crafting_intent.station;
      (signals.recipe || []).concat(signals.relations || []).forEach(function(signal) {
        if (signalMatchesHint(signal, station)) {
          addDetail("crafting_intent", 7, signal.raw, parsed.crafting_intent);
        }
      });
    }

    (parsed.relation_hints || []).forEach(function(hint) {
      (signals.relations || []).forEach(function(signal) {
        if (signalMatchesHint(signal, hint.target)) {
          addDetail("relation_hint", 6, signal.raw, hint);
        }
      });
    });

    if (parsed.missing_entry_intent && document.kind === "missing_entry") {
      const titleNorm = normalizeSearchQuery(document.title);
      parsed.missing_entry_intent.terms.forEach(function(term) {
        if (titleNorm === term || titleNorm.indexOf(term) >= 0) {
          addDetail("missing_entry_intent", 4, document.title, term);
        }
      });
    }

    if (parsed.free_text && document.kind === "post") {
      const residualTokens = tokenizeSearchQuery(parsed.free_text).filter(function(t) {
        return !GENERIC_TERMS.has(t);
      });
      if (residualTokens.length) {
        const titleNorm = normalizeSearchQuery(document.title);
        const allMatched = residualTokens.every(function(token) {
          return titleNorm.indexOf(token) >= 0;
        });
        if (allMatched && residualTokens.length >= 2) {
          addDetail("residual_match", 3, document.title, parsed.free_text);
        }
      }
    }

    return result;
  }

  return {
    normalizeSearchQuery: normalizeSearchQuery,
    tokenizeSearchQuery: tokenizeSearchQuery,
    parseSearchQuery: parseSearchQuery,
    extractFacetHints: extractFacetHints,
    extractRelationIntentHints: extractRelationIntentHints,
    extractEntityTypeHints: extractEntityTypeHints,
    extractUsageIntent: extractUsageIntent,
    extractCraftingIntent: extractCraftingIntent,
    extractAcquisitionIntent: extractAcquisitionIntent,
    extractMissingEntryIntent: extractMissingEntryIntent,
    getQueryIntentSummary: getQueryIntentSummary,
    getSearchParserDebugInfo: getSearchParserDebugInfo,
    applyParsedQueryToSignals: applyParsedQueryToSignals,
    escapeHtml: escapeHtml,
  };
})();
