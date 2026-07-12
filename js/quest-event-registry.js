// ============================================
// BoundLore Quest / Event Registry
// P2-B.1 — objectives, rewards, occurrences, NPC services.
// Structured fields only — no posts, no UI, no DB.
//
// Quest = KNOWLEDGE/quest substructures
// Event = EVENT/event + occurrence substructures
// NPC services = BEING/npc roles/fields
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreQuestEventRegistry = (function() {
  const QUEST_OBJECTIVE_TYPES = [
    "kill", "collect", "gather", "craft", "discover", "talk_to", "deliver",
    "escort", "interact", "use_item", "reach_location", "defend", "complete_event", "unknown",
  ];

  const QUEST_REWARD_TYPES = [
    "item", "resource", "currency", "experience", "reputation", "unlock", "title",
    "recipe", "knowledge", "access", "mount", "cosmetic", "unknown",
  ];

  const EVENT_TYPES = [
    "world", "seasonal", "community", "boss_spawn", "invasion", "weather",
    "time_limited", "patch", "narrative", "unknown",
  ];

  const EVENT_OCCURRENCE_STATES = [
    "scheduled", "active", "completed", "expired", "historical", "cancelled", "unknown",
  ];

  const NPC_SERVICE_TYPES = [
    "quest_giver", "vendor", "trainer", "crafter", "repair", "banker",
    "storage", "faction_rep", "lore_source", "unknown",
  ];

  const QUEST_OBJECTIVE_ALIASES = {
    kill: "kill", slay: "kill", defeat: "kill", eliminate: "kill",
    collect: "collect", pickup: "collect", retrieve: "collect",
    gather: "gather", harvest: "gather", mine: "gather",
    craft: "craft", create: "craft", forge: "craft",
    discover: "discover", find: "discover", explore: "discover",
    talk_to: "talk_to", talk: "talk_to", speak: "talk_to", chat: "talk_to",
    deliver: "deliver", bring: "deliver", hand_in: "deliver",
    escort: "escort", protect: "escort", guard: "escort",
    interact: "interact", use: "interact", activate: "interact",
    use_item: "use_item", consume: "use_item",
    reach_location: "reach_location", visit: "reach_location", go_to: "reach_location",
    defend: "defend", hold: "defend",
    complete_event: "complete_event", attend_event: "complete_event",
  };

  const QUEST_REWARD_ALIASES = {
    item: "item", gear: "item", equipment: "item",
    resource: "resource", material: "resource",
    currency: "currency", gold: "currency", coins: "currency",
    experience: "experience", xp: "experience", exp: "experience",
    reputation: "reputation", rep: "reputation", faction: "reputation",
    unlock: "unlock", access: "access",
    title: "title", recipe: "recipe", knowledge: "knowledge", lore: "knowledge",
    mount: "mount", cosmetic: "cosmetic", skin: "cosmetic",
  };

  const EVENT_TYPE_ALIASES = {
    world: "world", world_event: "world",
    seasonal: "seasonal", season: "seasonal", holiday: "seasonal",
    community: "community", community_event: "community",
    boss_spawn: "boss_spawn", boss: "boss_spawn", boss_event: "boss_spawn",
    invasion: "invasion", raid: "invasion",
    weather: "weather", storm: "weather",
    time_limited: "time_limited", limited: "time_limited",
    patch: "patch", update: "patch",
    narrative: "narrative", story: "narrative", lore_event: "narrative",
  };

  const EVENT_OCCURRENCE_STATE_ALIASES = {
    scheduled: "scheduled", upcoming: "scheduled", pending: "scheduled",
    active: "active", live: "active", running: "active",
    completed: "completed", done: "completed", finished: "completed",
    expired: "expired", ended: "expired",
    historical: "historical", past: "historical", archived: "historical",
    cancelled: "cancelled", canceled: "cancelled",
  };

  const NPC_SERVICE_ALIASES = {
    quest_giver: "quest_giver", giver: "quest_giver", questgiver: "quest_giver",
    vendor: "vendor", merchant: "vendor", shop: "vendor", seller: "vendor",
    trainer: "trainer", teach: "trainer", instructor: "trainer",
    crafter: "crafter", smith: "crafter", artisan: "crafter",
    repair: "repair", fix: "repair", mender: "repair",
    banker: "banker", bank: "banker",
    storage: "storage", stash: "storage", warehouse: "storage",
    faction_rep: "faction_rep", faction: "faction_rep", reputation_vendor: "faction_rep",
    lore_source: "lore_source", scholar: "lore_source", historian: "lore_source",
  };

  const P2_B_RESERVED_RELATIONS = ["reward_of", "occurs_during", "sold_by"];

  const RENDER_SECTIONS_ENABLED = false;

  function meaningful(value) {
    const clean = String(value || "").trim();
    if (!clean) return "";
    const lower = clean.toLowerCase();
    if (["unclear", "unknown", "not observed", "not sure", "n/a", "na", "none", "no"].includes(lower)) {
      return "";
    }
    return clean;
  }

  function slugKey(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, function(c) { return c.toUpperCase(); })
      .trim();
  }

  function normalizeKind(value, allowed, aliases) {
    const slug = slugKey(value);
    if (!slug) return "unknown";
    if (allowed.indexOf(slug) >= 0) return slug;
    if (aliases[slug]) return aliases[slug];
    return "unknown";
  }

  function normalizeQuestObjectiveType(value) {
    return normalizeKind(value, QUEST_OBJECTIVE_TYPES, QUEST_OBJECTIVE_ALIASES);
  }

  function normalizeQuestRewardType(value) {
    return normalizeKind(value, QUEST_REWARD_TYPES, QUEST_REWARD_ALIASES);
  }

  function normalizeEventType(value) {
    return normalizeKind(value, EVENT_TYPES, EVENT_TYPE_ALIASES);
  }

  function normalizeEventOccurrenceState(value) {
    return normalizeKind(value, EVENT_OCCURRENCE_STATES, EVENT_OCCURRENCE_STATE_ALIASES);
  }

  function normalizeNpcServiceType(value) {
    return normalizeKind(value, NPC_SERVICE_TYPES, NPC_SERVICE_ALIASES);
  }

  function isDisplayableKind(kind) {
    return !!kind && kind !== "unknown";
  }

  function readField(source, field) {
    if (!source || !field) return undefined;
    if (Object.prototype.hasOwnProperty.call(source, field)) return source[field];
    const meta = source.meta && typeof source.meta === "object" ? source.meta : null;
    if (meta && Object.prototype.hasOwnProperty.call(meta, field)) return meta[field];
    const payload = source.discovery_payload && typeof source.discovery_payload === "object"
      ? source.discovery_payload
      : (meta && meta.discovery_payload) || null;
    if (payload && Object.prototype.hasOwnProperty.call(payload, field)) return payload[field];
    return undefined;
  }

  function toArray(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.slice();
    if (typeof value === "object") return [value];
    const single = meaningful(value);
    return single ? [single] : [];
  }

  function normalizeQuestObjective(record) {
    const source = record && typeof record === "object" ? record : {};
    const type = normalizeQuestObjectiveType(source.type || source.objective_type || source.kind);
    const target = meaningful(source.target || source.target_name || source.name || source.title);
    const quantityRaw = source.quantity != null ? source.quantity : source.count;
    const quantity = quantityRaw != null && !isNaN(Number(quantityRaw)) ? Number(quantityRaw) : null;
    const out = {
      type: type,
      target: target || null,
      quantity: quantity,
      notes: meaningful(source.notes || source.description) || null,
      displayable: isDisplayableKind(type) && !!target,
    };
    if (source.ref) out.ref = meaningful(source.ref) || null;
    if (source.location) out.location = meaningful(source.location) || null;
    return out;
  }

  function normalizeQuestReward(record) {
    const source = record && typeof record === "object" ? record : {};
    const type = normalizeQuestRewardType(source.type || source.reward_type || source.kind);
    const target = meaningful(source.target || source.target_name || source.name || source.title || source.item);
    const quantityRaw = source.quantity != null ? source.quantity : source.count;
    const quantity = quantityRaw != null && !isNaN(Number(quantityRaw)) ? Number(quantityRaw) : null;
    const out = {
      type: type,
      target: target || null,
      quantity: quantity,
      notes: meaningful(source.notes || source.description) || null,
      displayable: isDisplayableKind(type),
    };
    if (source.ref) out.ref = meaningful(source.ref) || null;
    return out;
  }

  function normalizeEventOccurrence(record) {
    const source = record && typeof record === "object" ? record : {};
    const state = normalizeEventOccurrenceState(source.state || source.status || source.occurrence_state);
    const out = {
      state: state,
      starts_at: meaningful(source.starts_at || source.start_at || source.start) || null,
      ends_at: meaningful(source.ends_at || source.end_at || source.end) || null,
      recurrence: meaningful(source.recurrence || source.schedule) || null,
      location: meaningful(source.location || source.location_ref) || null,
      notes: meaningful(source.notes || source.description) || null,
      displayable: isDisplayableKind(state),
    };
    if (source.parent_event_ref) out.parent_event_ref = meaningful(source.parent_event_ref) || null;
    return out;
  }

  function normalizeNpcService(record) {
    const source = record && typeof record === "object" ? record : {};
    const type = normalizeNpcServiceType(source.type || source.service_type || source.role || source.kind);
    const inventory = toArray(source.inventory || source.vendor_inventory || source.items)
      .map(function(entry) {
        if (entry == null) return null;
        if (typeof entry === "object") {
          return {
            target: meaningful(entry.target || entry.name || entry.title) || null,
            quantity: entry.quantity != null ? entry.quantity : null,
          };
        }
        return meaningful(entry) || null;
      })
      .filter(Boolean);
    const out = {
      type: type,
      inventory: inventory,
      trainer_for: meaningful(source.trainer_for || source.profession) || null,
      notes: meaningful(source.notes || source.description) || null,
      displayable: isDisplayableKind(type),
    };
    if (source.ref) out.ref = meaningful(source.ref) || null;
    return out;
  }

  function resolveDomainSubtype(source) {
    let domain = String(readField(source, "entity_domain") || "").trim().toUpperCase();
    let subtype = slugKey(readField(source, "entity_subtype"));
    if ((!domain || !subtype) && typeof EntityCore !== "undefined") {
      const meta = source.meta && typeof source.meta === "object" ? source.meta : source;
      const post = source.post && typeof source.post === "object" ? source.post : null;
      if (!domain && EntityCore.resolveEntityDomain) domain = String(EntityCore.resolveEntityDomain(meta, post)).toUpperCase();
      if (!subtype && EntityCore.resolveEntitySubtype) subtype = slugKey(EntityCore.resolveEntitySubtype(meta, post));
    }
    return { domain: domain, subtype: subtype };
  }

  function isQuestModel(record) {
    const parts = resolveDomainSubtype(record || {});
    if (parts.domain === "KNOWLEDGE" && (parts.subtype === "quest" || parts.subtype === "quest_chain")) return true;
    if (typeof BoundLoreContentModelRegistry !== "undefined" && BoundLoreContentModelRegistry.isP2ModelActive) {
      return BoundLoreContentModelRegistry.isP2ModelActive("KNOWLEDGE", "quest");
    }
    return false;
  }

  function isEventModel(record) {
    const parts = resolveDomainSubtype(record || {});
    if (parts.domain === "EVENT" && (parts.subtype === "event" || parts.subtype === "occurrence" || parts.subtype === "community_event")) {
      return true;
    }
    return typeof BoundLoreContentModelRegistry !== "undefined"
      && BoundLoreContentModelRegistry.isP2ModelActive
      && BoundLoreContentModelRegistry.isP2ModelActive("EVENT", "event");
  }

  function isNpcModel(record) {
    const parts = resolveDomainSubtype(record || {});
    if (parts.domain === "BEING" && parts.subtype === "npc") return true;
    return typeof BoundLoreContentModelRegistry !== "undefined"
      && BoundLoreContentModelRegistry.isP2ModelActive
      && BoundLoreContentModelRegistry.isP2ModelActive("BEING", "npc");
  }

  function normalizeQuestModelRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    const objectives = toArray(readField(source, "objectives"))
      .map(normalizeQuestObjective)
      .filter(function(entry) { return entry && (entry.displayable || entry.type !== "unknown"); });
    const rewards = toArray(readField(source, "rewards"))
      .map(normalizeQuestReward)
      .filter(function(entry) { return entry && (entry.displayable || entry.type !== "unknown"); });
    const prerequisites = toArray(readField(source, "prerequisites"))
      .map(function(entry) {
        if (entry == null) return null;
        if (typeof entry === "object") return Object.assign({}, entry);
        return meaningful(entry) || null;
      })
      .filter(Boolean);
    return {
      entity_domain: "KNOWLEDGE",
      entity_subtype: "quest",
      quest_giver: meaningful(readField(source, "quest_giver")) || null,
      objectives: objectives,
      prerequisites: prerequisites,
      rewards: rewards,
      required_level: readField(source, "required_level") != null ? readField(source, "required_level") : null,
      faction_req: meaningful(readField(source, "faction_req")) || null,
      starts_from: meaningful(readField(source, "starts_from")) || null,
      ends_at: meaningful(readField(source, "ends_at")) || null,
      related_events: toArray(readField(source, "related_events")).map(meaningful).filter(Boolean),
    };
  }

  function normalizeEventModelRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    const occurrences = toArray(readField(source, "occurrences"))
      .map(normalizeEventOccurrence)
      .filter(function(entry) { return entry && (entry.displayable || entry.state !== "unknown"); });
    const rewards = toArray(readField(source, "rewards"))
      .map(normalizeQuestReward)
      .filter(function(entry) { return entry && (entry.displayable || entry.type !== "unknown"); });
    return {
      entity_domain: "EVENT",
      entity_subtype: "event",
      event_type: normalizeEventType(readField(source, "event_type") || readField(source, "type")),
      starts_at: meaningful(readField(source, "starts_at")) || null,
      ends_at: meaningful(readField(source, "ends_at")) || null,
      recurrence: meaningful(readField(source, "recurrence")) || null,
      location_refs: toArray(readField(source, "location_refs")).map(meaningful).filter(Boolean),
      participants: toArray(readField(source, "participants")).map(meaningful).filter(Boolean),
      occurrences: occurrences,
      rewards: rewards,
      related_quests: toArray(readField(source, "related_quests")).map(meaningful).filter(Boolean),
    };
  }

  function normalizeNpcModelRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    const services = toArray(readField(source, "services") || readField(source, "roles"))
      .map(normalizeNpcService)
      .filter(function(entry) { return entry && (entry.displayable || entry.type !== "unknown"); });
    if (!services.length) {
      const inferred = [];
      ["quest_giver", "vendor", "trainer"].forEach(function(key) {
        if (readField(source, key) || (readField(source, "roles") && String(readField(source, "roles")).includes(key))) {
          inferred.push(normalizeNpcService({ type: key }));
        }
      });
      if (readField(source, "vendor_inventory")) {
        inferred.push(normalizeNpcService({ type: "vendor", inventory: readField(source, "vendor_inventory") }));
      }
      if (readField(source, "trainer_for")) {
        inferred.push(normalizeNpcService({ type: "trainer", trainer_for: readField(source, "trainer_for") }));
      }
      services.push.apply(services, inferred);
    }
    return {
      entity_domain: "BEING",
      entity_subtype: "npc",
      faction: meaningful(readField(source, "faction")) || null,
      services: services,
      location_refs: toArray(readField(source, "location_refs")).map(meaningful).filter(Boolean),
      quest_refs: toArray(readField(source, "quest_refs")).map(meaningful).filter(Boolean),
      schedule: meaningful(readField(source, "schedule")) || null,
    };
  }

  function toSignal(entry, group, label) {
    if (!entry || !entry.displayable) return null;
    const raw = meaningful(entry.raw) || meaningful(entry.target) || meaningful(entry.type && titleCase(entry.type));
    if (!raw) return null;
    return {
      raw: raw,
      normalized: slugKey(raw).replace(/_/g, " "),
      kind: entry.kind || entry.type || entry.field || group,
      label: label || titleCase(entry.kind || entry.type || group),
      group: group,
      weight: 2,
      source: "quest_event_registry",
      displayable: true,
    };
  }

  function extractQuestObjectiveSignals(source) {
    const record = source && typeof source === "object" ? source : {};
    const objectives = toArray(readField(record, "objectives"));
    if (!objectives.length && record.objective) objectives.push(record.objective);
    return objectives.map(function(entry) {
      const norm = normalizeQuestObjective(entry);
      if (!norm.displayable) return null;
      return {
        kind: "objective",
        type: norm.type,
        target: norm.target,
        raw: (norm.type !== "unknown" ? norm.type.replace(/_/g, " ") + " " : "") + (norm.target || ""),
        label: getQuestObjectiveLabel(norm.type),
        displayable: norm.displayable,
      };
    }).filter(Boolean);
  }

  function extractQuestRewardSignals(source) {
    const record = source && typeof source === "object" ? source : {};
    const rewards = toArray(readField(record, "rewards"));
    return rewards.map(function(entry) {
      const norm = normalizeQuestReward(entry);
      if (!norm.displayable) return null;
      return {
        kind: "reward",
        type: norm.type,
        target: norm.target,
        raw: (norm.target || norm.type.replace(/_/g, " ")),
        label: getQuestRewardLabel(norm.type),
        displayable: norm.displayable,
      };
    }).filter(Boolean);
  }

  function extractEventOccurrenceSignals(source) {
    const record = source && typeof source === "object" ? source : {};
    const signals = [];
    const eventType = normalizeEventType(readField(record, "event_type") || readField(record, "type"));
    if (isDisplayableKind(eventType)) {
      signals.push({
        kind: "event_type",
        type: eventType,
        raw: eventType.replace(/_/g, " "),
        label: getEventTypeLabel(eventType),
        displayable: true,
      });
    }
    const schedule = meaningful(readField(record, "recurrence") || readField(record, "schedule"));
    if (schedule) {
      signals.push({ kind: "schedule", raw: schedule, label: "Schedule", displayable: true });
    }
    toArray(readField(record, "occurrences")).forEach(function(entry) {
      const norm = normalizeEventOccurrence(entry);
      if (!norm.displayable && !norm.starts_at) return;
      signals.push({
        kind: "occurrence",
        type: norm.state,
        raw: [norm.state !== "unknown" ? norm.state : "", norm.starts_at || ""].filter(Boolean).join(" "),
        label: getEventOccurrenceStateLabel(norm.state),
        displayable: norm.displayable || !!norm.starts_at,
      });
    });
    return signals;
  }

  function extractNpcServiceSignals(source) {
    const record = source && typeof source === "object" ? source : {};
    const norm = normalizeNpcModelRecord(record);
    return (norm.services || []).map(function(entry) {
      if (!entry.displayable) return null;
      return {
        kind: "npc_service",
        type: entry.type,
        raw: entry.type.replace(/_/g, " "),
        label: getNpcServiceLabel(entry.type),
        displayable: entry.displayable,
      };
    }).filter(Boolean);
  }

  function getQuestSearchSignals(source) {
    if (!isQuestModel(source) && !readField(source, "objectives") && !readField(source, "rewards")) {
      return [];
    }
    return extractQuestObjectiveSignals(source)
      .concat(extractQuestRewardSignals(source))
      .map(function(entry) { return toSignal(entry, "quest", entry.label); })
      .filter(Boolean);
  }

  function getEventSearchSignals(source) {
    if (!isEventModel(source) && !readField(source, "event_type") && !readField(source, "occurrences")) {
      return [];
    }
    return extractEventOccurrenceSignals(source)
      .map(function(entry) { return toSignal(entry, "event", entry.label); })
      .filter(Boolean);
  }

  function getNpcServiceSearchSignals(source) {
    if (!isNpcModel(source) && !readField(source, "services") && !readField(source, "vendor_inventory")) {
      return [];
    }
    return extractNpcServiceSignals(source)
      .map(function(entry) { return toSignal(entry, "npc_service", entry.label); })
      .filter(Boolean);
  }

  function getQuestObjectiveLabel(value) {
    const kind = normalizeQuestObjectiveType(value);
    if (kind === "unknown") return "Objective";
    return titleCase(kind);
  }

  function getQuestRewardLabel(value) {
    const kind = normalizeQuestRewardType(value);
    if (kind === "unknown") return "Reward";
    return titleCase(kind);
  }

  function getEventTypeLabel(value) {
    const kind = normalizeEventType(value);
    if (kind === "unknown") return "Event";
    return titleCase(kind);
  }

  function getEventOccurrenceStateLabel(value) {
    const kind = normalizeEventOccurrenceState(value);
    if (kind === "unknown") return "Occurrence";
    return titleCase(kind);
  }

  function getNpcServiceLabel(value) {
    const kind = normalizeNpcServiceType(value);
    if (kind === "unknown") return "Service";
    return titleCase(kind.replace(/_/g, " "));
  }

  function shouldRenderQuestSection(record, section) {
    if (!RENDER_SECTIONS_ENABLED) return false;
    if (!section || !isQuestModel(record)) return false;
    const norm = normalizeQuestModelRecord(record || {});
    const value = norm[section];
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) return false;
    return true;
  }

  function shouldRenderEventSection(record, section) {
    if (!RENDER_SECTIONS_ENABLED) return false;
    if (!section || !isEventModel(record)) return false;
    const norm = normalizeEventModelRecord(record || {});
    const value = norm[section];
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) return false;
    return true;
  }

  function shouldRenderNpcServiceSection(record, section) {
    if (!RENDER_SECTIONS_ENABLED) return false;
    if (!section || !isNpcModel(record)) return false;
    const norm = normalizeNpcModelRecord(record || {});
    const value = norm[section];
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) return false;
    return true;
  }

  function resolveQuestEventContext(record) {
    const source = record && typeof record === "object" ? record : {};
    const parts = resolveDomainSubtype(source);
    const out = {
      domain: parts.domain,
      subtype: parts.subtype,
      is_quest: isQuestModel(source),
      is_event: isEventModel(source),
      is_npc: isNpcModel(source),
      quest: null,
      event: null,
      npc: null,
      render_sections: RENDER_SECTIONS_ENABLED,
    };
    if (out.is_quest || readField(source, "objectives") || readField(source, "rewards")) {
      out.quest = normalizeQuestModelRecord(source);
    }
    if (out.is_event || readField(source, "event_type") || readField(source, "occurrences")) {
      out.event = normalizeEventModelRecord(source);
    }
    if (out.is_npc || readField(source, "services") || readField(source, "vendor_inventory")) {
      out.npc = normalizeNpcModelRecord(source);
    }
    return out;
  }

  return {
    QUEST_OBJECTIVE_TYPES: QUEST_OBJECTIVE_TYPES.slice(),
    QUEST_REWARD_TYPES: QUEST_REWARD_TYPES.slice(),
    EVENT_TYPES: EVENT_TYPES.slice(),
    EVENT_OCCURRENCE_STATES: EVENT_OCCURRENCE_STATES.slice(),
    NPC_SERVICE_TYPES: NPC_SERVICE_TYPES.slice(),
    P2_B_RESERVED_RELATIONS: P2_B_RESERVED_RELATIONS.slice(),
    normalizeQuestObjectiveType: normalizeQuestObjectiveType,
    normalizeQuestRewardType: normalizeQuestRewardType,
    normalizeEventType: normalizeEventType,
    normalizeEventOccurrenceState: normalizeEventOccurrenceState,
    normalizeNpcServiceType: normalizeNpcServiceType,
    normalizeQuestObjective: normalizeQuestObjective,
    normalizeQuestReward: normalizeQuestReward,
    normalizeEventOccurrence: normalizeEventOccurrence,
    normalizeNpcService: normalizeNpcService,
    normalizeQuestModelRecord: normalizeQuestModelRecord,
    normalizeEventModelRecord: normalizeEventModelRecord,
    normalizeNpcModelRecord: normalizeNpcModelRecord,
    extractQuestObjectiveSignals: extractQuestObjectiveSignals,
    extractQuestRewardSignals: extractQuestRewardSignals,
    extractEventOccurrenceSignals: extractEventOccurrenceSignals,
    extractNpcServiceSignals: extractNpcServiceSignals,
    getQuestSearchSignals: getQuestSearchSignals,
    getEventSearchSignals: getEventSearchSignals,
    getNpcServiceSearchSignals: getNpcServiceSearchSignals,
    getQuestObjectiveLabel: getQuestObjectiveLabel,
    getQuestRewardLabel: getQuestRewardLabel,
    getEventTypeLabel: getEventTypeLabel,
    getEventOccurrenceStateLabel: getEventOccurrenceStateLabel,
    getNpcServiceLabel: getNpcServiceLabel,
    shouldRenderQuestSection: shouldRenderQuestSection,
    shouldRenderEventSection: shouldRenderEventSection,
    shouldRenderNpcServiceSection: shouldRenderNpcServiceSection,
    isQuestModel: isQuestModel,
    isEventModel: isEventModel,
    isNpcModel: isNpcModel,
    resolveQuestEventContext: resolveQuestEventContext,
  };
})();
