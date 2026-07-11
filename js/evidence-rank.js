// ============================================
// BoundLore Evidence Rank & Dispute Baseline
// P1-C.1 — null-safe readers for evidence tier, confidence,
// statement rank, dispute state, and statement status.
// No UI, no DB, no migration. See docs/architecture/moderation-conflict-matrix.md
// ============================================

window.BoundLoreEvidenceRank = (function() {
  const EVIDENCE_TIERS = ["speculative", "reported", "observed", "confirmed"];
  const CONFIDENCE_VALUES = ["unknown", "single_observation", "corroborated", "verified"];
  const STATEMENT_RANKS = ["preferred", "normal", "deprecated"];
  const DISPUTE_STATES = ["none", "disputed", "resolved", "rejected"];
  const STATEMENT_STATUSES = ["current", "historical", "superseded", "deprecated", "disputed"];

  const EVIDENCE_TIER_WEIGHTS = {
    speculative: 1,
    reported: 2,
    observed: 3,
    confirmed: 4,
  };

  const CONFIDENCE_WEIGHTS = {
    unknown: 0,
    single_observation: 1,
    corroborated: 2,
    verified: 3,
  };

  const STATEMENT_RANK_WEIGHTS = {
    preferred: 3,
    normal: 2,
    deprecated: 1,
  };

  const EVIDENCE_TIER_ALIASES = {
    confirm: "confirmed",
    confirmed_fact: "confirmed",
    observe: "observed",
    observation: "observed",
    report: "reported",
    community_report: "reported",
    rumor: "speculative",
    speculative_rumor: "speculative",
    unverified: "speculative",
  };

  const CONFIDENCE_ALIASES = {
    rumor: "unknown",
    repeated_observation: "corroborated",
    repeat_observation: "corroborated",
    multiple_observations: "corroborated",
    confirm: "verified",
    confirmed: "verified",
    single: "single_observation",
    one_observation: "single_observation",
  };

  const STATEMENT_RANK_ALIASES = {
    primary: "preferred",
    canonical: "preferred",
    default: "normal",
    standard: "normal",
    legacy: "deprecated",
    obsolete: "deprecated",
  };

  const DISPUTE_STATE_ALIASES = {
    open: "disputed",
    pending: "disputed",
    active: "disputed",
    closed: "resolved",
    accepted: "resolved",
    dismissed: "rejected",
    denied: "rejected",
  };

  const STATEMENT_STATUS_ALIASES = {
    active: "current",
    live: "current",
    past: "historical",
    outdated: "superseded",
    replaced: "superseded",
    obsolete: "deprecated",
    conflict: "disputed",
    under_review: "disputed",
    needs_review: "disputed",
  };

  function meaningful(value) {
    const clean = String(value == null ? "" : value).trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    if (["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"].indexOf(lower) >= 0) {
      return "";
    }
    return clean;
  }

  function normalizeToken(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/^\d+-/, "")
      .replace(/[\s-]+/g, "_");
  }

  function isNumericConfidence(value) {
    if (typeof value === "number" && Number.isFinite(value)) return true;
    if (typeof value !== "string") return false;
    const clean = value.trim();
    if (!clean) return false;
    if (!/^\d{1,3}$/.test(clean)) return false;
    const num = Number(clean);
    return Number.isFinite(num) && num >= 0 && num <= 100;
  }

  function resolveAlias(value, allowed, aliases) {
    const token = normalizeToken(value);
    if (!token) return null;
    if (allowed.indexOf(token) >= 0) return token;
    if (aliases && aliases[token]) return aliases[token];
    return null;
  }

  function normalizeEvidenceTier(value) {
    return resolveAlias(value, EVIDENCE_TIERS, EVIDENCE_TIER_ALIASES);
  }

  function normalizeConfidence(value) {
    if (isNumericConfidence(value)) return null;
    const token = normalizeToken(value);
    if (!token) return "unknown";
    const resolved = resolveAlias(token, CONFIDENCE_VALUES, CONFIDENCE_ALIASES);
    return resolved || "unknown";
  }

  function normalizeStatementRank(value) {
    const resolved = resolveAlias(value, STATEMENT_RANKS, STATEMENT_RANK_ALIASES);
    return resolved || "normal";
  }

  function normalizeDisputeState(value) {
    const token = normalizeToken(value);
    if (!token) return "none";
    const resolved = resolveAlias(token, DISPUTE_STATES, DISPUTE_STATE_ALIASES);
    return resolved || "none";
  }

  function normalizeStatementStatus(value) {
    const token = normalizeToken(value);
    if (!token) return null;
    const resolved = resolveAlias(token, STATEMENT_STATUSES, STATEMENT_STATUS_ALIASES);
    return resolved || null;
  }

  function pickFirstObject() {
    for (let i = 0; i < arguments.length; i += 1) {
      const candidate = arguments[i];
      if (candidate && typeof candidate === "object" && !Array.isArray(candidate)) return candidate;
    }
    return null;
  }

  function readPayloadLayer(source) {
    const src = source && typeof source === "object" ? source : {};
    return pickFirstObject(
      src.payload,
      src.parsed_payload,
      src.discovery_payload,
      src.meta && src.meta.discovery_payload,
      src.meta && src.meta.payload,
      src.meta
    ) || {};
  }

  function readMetaLayer(source) {
    const src = source && typeof source === "object" ? source : {};
    return pickFirstObject(src.meta, src) || {};
  }

  function readVersionHints(source) {
    if (typeof BoundLoreVersioning !== "undefined" && BoundLoreVersioning.extractVersionMetadata) {
      const version = BoundLoreVersioning.extractVersionMetadata(source);
      if (version && version.has_version_metadata) {
        return {
          version: version,
          superseded_by: version.superseded_by || null,
          statement_status: version.superseded_by ? "superseded" : null,
        };
      }
    }

    const payload = readPayloadLayer(source);
    const meta = readMetaLayer(source);
    const supersededBy = meaningful(payload.superseded_by || meta.superseded_by || source.superseded_by);
    return {
      version: null,
      superseded_by: supersededBy || null,
      statement_status: supersededBy ? "superseded" : null,
    };
  }

  function readRawEvidenceTier(source, payload, meta) {
    return meaningful(
      source.evidence_tier ||
      payload.evidence_tier ||
      meta.evidence_tier ||
      (payload.qualifiers && payload.qualifiers.evidence_tier) ||
      (meta.qualifiers && meta.qualifiers.evidence_tier)
    );
  }

  function readRawConfidence(source, payload, meta) {
    return (
      source.confidence_level ||
      source.confidence ||
      payload.confidence_level ||
      payload.confidence ||
      meta.confidence_level ||
      meta.confidence ||
      (payload.qualifiers && (payload.qualifiers.confidence_level || payload.qualifiers.confidence)) ||
      (meta.qualifiers && (meta.qualifiers.confidence_level || meta.qualifiers.confidence)) ||
      null
    );
  }

  function readEvidenceSignals(source) {
    const src = source && typeof source === "object" ? source : {};
    const payload = readPayloadLayer(src);
    const meta = readMetaLayer(src);
    const versionHints = readVersionHints(src);

    const rawTier = readRawEvidenceTier(src, payload, meta);
    const rawConfidence = readRawConfidence(src, payload, meta);
    const numericConfidence = isNumericConfidence(rawConfidence) ? Number(String(rawConfidence).trim()) : null;

    const explicitStatus = normalizeStatementStatus(
      src.statement_status ||
      payload.statement_status ||
      meta.statement_status ||
      src.status_label ||
      payload.status_label
    );

    return {
      evidence_tier: normalizeEvidenceTier(rawTier),
      confidence: normalizeConfidence(rawConfidence),
      statement_rank: normalizeStatementRank(
        src.statement_rank || payload.statement_rank || meta.statement_rank
      ),
      dispute_state: normalizeDisputeState(
        src.dispute_state || payload.dispute_state || meta.dispute_state || src.dispute_status
      ),
      statement_status: explicitStatus || versionHints.statement_status || null,
      numeric_confidence: numericConfidence,
      superseded_by: versionHints.superseded_by,
    };
  }

  function normalizeEvidenceSignals(source) {
    const signals = readEvidenceSignals(source);
    return {
      evidence_tier: signals.evidence_tier,
      confidence: signals.confidence || "unknown",
      statement_rank: signals.statement_rank || "normal",
      dispute_state: signals.dispute_state || "none",
      statement_status: signals.statement_status,
      numeric_confidence: signals.numeric_confidence,
      superseded_by: signals.superseded_by,
    };
  }

  function hasEvidenceSignals(source) {
    const signals = readEvidenceSignals(source);
    if (signals.evidence_tier) return true;
    if (signals.confidence && signals.confidence !== "unknown") return true;
    if (signals.statement_rank && signals.statement_rank !== "normal") return true;
    if (signals.dispute_state && signals.dispute_state !== "none") return true;
    if (signals.statement_status) return true;
    if (signals.numeric_confidence != null) return true;
    if (signals.superseded_by) return true;
    return false;
  }

  function isConfirmed(source) {
    return readEvidenceSignals(source).evidence_tier === "confirmed";
  }

  function isReported(source) {
    return readEvidenceSignals(source).evidence_tier === "reported";
  }

  function isSpeculative(source) {
    return readEvidenceSignals(source).evidence_tier === "speculative";
  }

  function isDisputed(source) {
    const signals = readEvidenceSignals(source);
    if (signals.dispute_state === "disputed") return true;
    return signals.statement_status === "disputed";
  }

  function isDeprecated(source) {
    const signals = readEvidenceSignals(source);
    if (signals.statement_rank === "deprecated") return true;
    return signals.statement_status === "deprecated";
  }

  function isPreferred(source) {
    return readEvidenceSignals(source).statement_rank === "preferred";
  }

  function getEvidenceWeight(source) {
    const signals = readEvidenceSignals(source);
    const tierWeight = signals.evidence_tier ? (EVIDENCE_TIER_WEIGHTS[signals.evidence_tier] || 0) : 0;
    const confidenceWeight = signals.confidence ? (CONFIDENCE_WEIGHTS[signals.confidence] || 0) : 0;
    return tierWeight * 10 + confidenceWeight;
  }

  function getRankWeight(source) {
    const rank = readEvidenceSignals(source).statement_rank || "normal";
    return STATEMENT_RANK_WEIGHTS[rank] || STATEMENT_RANK_WEIGHTS.normal;
  }

  function compareEvidenceRank(a, b) {
    const weightDiff = getEvidenceWeight(b) - getEvidenceWeight(a);
    if (weightDiff !== 0) return weightDiff;
    return getRankWeight(b) - getRankWeight(a);
  }

  function normalizeStatementState(statement) {
    const signals = normalizeEvidenceSignals(statement);
    const versionHints = readVersionHints(statement);
    const status = signals.statement_status || versionHints.statement_status || "current";
    return {
      evidence_tier: signals.evidence_tier,
      confidence: signals.confidence,
      statement_rank: signals.statement_rank,
      dispute_state: signals.dispute_state,
      statement_status: status,
      numeric_confidence: signals.numeric_confidence,
      superseded_by: versionHints.superseded_by || signals.superseded_by || null,
      is_disputed: isDisputed(statement),
      is_deprecated: isDeprecated(statement),
      is_preferred: isPreferred(statement),
    };
  }

  function getStatementDisplayState(statement) {
    const state = normalizeStatementState(statement);
    const labels = [];
    if (state.evidence_tier) labels.push({ kind: "evidence_tier", value: state.evidence_tier });
    if (state.confidence && state.confidence !== "unknown") {
      labels.push({ kind: "confidence", value: state.confidence });
    }
    if (state.statement_rank && state.statement_rank !== "normal") {
      labels.push({ kind: "statement_rank", value: state.statement_rank });
    }
    if (state.dispute_state && state.dispute_state !== "none") {
      labels.push({ kind: "dispute_state", value: state.dispute_state });
    }
    if (state.statement_status && state.statement_status !== "current") {
      labels.push({ kind: "statement_status", value: state.statement_status });
    }
    return {
      state: state,
      labels: labels,
      has_visible_labels: labels.length > 0,
    };
  }

  function getSearchRankAdjustment(meta, post) {
    if (!hasEvidenceSignals({ meta: meta, payload: meta })) return 0;
    const weight = getEvidenceWeight({ meta: meta, payload: meta });
    if (weight <= 0) return 0;
    return Math.min(2, Math.floor(weight / 20));
  }

  return {
    EVIDENCE_TIERS: EVIDENCE_TIERS.slice(),
    CONFIDENCE_VALUES: CONFIDENCE_VALUES.slice(),
    STATEMENT_RANKS: STATEMENT_RANKS.slice(),
    DISPUTE_STATES: DISPUTE_STATES.slice(),
    STATEMENT_STATUSES: STATEMENT_STATUSES.slice(),
    normalizeEvidenceTier: normalizeEvidenceTier,
    normalizeConfidence: normalizeConfidence,
    normalizeStatementRank: normalizeStatementRank,
    normalizeDisputeState: normalizeDisputeState,
    normalizeStatementStatus: normalizeStatementStatus,
    readEvidenceSignals: readEvidenceSignals,
    normalizeEvidenceSignals: normalizeEvidenceSignals,
    hasEvidenceSignals: hasEvidenceSignals,
    isConfirmed: isConfirmed,
    isReported: isReported,
    isSpeculative: isSpeculative,
    isDisputed: isDisputed,
    isDeprecated: isDeprecated,
    isPreferred: isPreferred,
    getEvidenceWeight: getEvidenceWeight,
    getRankWeight: getRankWeight,
    compareEvidenceRank: compareEvidenceRank,
    normalizeStatementState: normalizeStatementState,
    getStatementDisplayState: getStatementDisplayState,
    getSearchRankAdjustment: getSearchRankAdjustment,
  };
})();
