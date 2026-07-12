// ============================================
// BoundLore Economy Registry
// P2-C.1 — vendor offers, prices, currencies, availability.
// Structured fields only — no shop UI, no posts, no DB.
//
// Vendor = NPC service / role context (BEING/npc)
// sold_by relation remains reserved — not productively activated.
// See docs/architecture/current-code-gap-notes.md
// ============================================

window.BoundLoreEconomyRegistry = (function() {
  const TRADE_OFFER_TYPES = [
    "sell", "buy", "barter", "service", "repair", "training", "unlock", "exchange", "unknown",
  ];

  const CURRENCY_TYPES = [
    "coin", "gold", "silver", "copper", "token", "reputation", "faction_currency",
    "event_currency", "resource", "item", "unknown",
  ];

  const PRICE_COMPONENT_TYPES = [
    "currency", "item", "resource", "reputation", "requirement", "unknown",
  ];

  const AVAILABILITY_STATES = [
    "available", "limited", "conditional", "rotating", "seasonal", "event_limited", "unavailable", "unknown",
  ];

  const STOCK_STATES = [
    "unlimited", "limited", "restocking", "unique", "sold_out", "unknown",
  ];

  const VENDOR_SERVICE_TYPES = [
    "vendor", "trainer", "repair", "crafter", "exchange", "banker", "storage", "faction_rep", "unknown",
  ];

  const P2_C_RESERVED_RELATIONS = ["sold_by", "reward_of", "occurs_during"];

  const RENDER_SECTIONS_ENABLED = false;

  const TRADE_OFFER_ALIASES = {
    sell: "sell", sale: "sell", sells: "sell", selling: "sell",
    buy: "buy", purchase: "buy", buys: "buy",
    barter: "barter", trade: "barter", exchange: "exchange", swap: "barter",
    service: "service", repair: "repair", fix: "repair", mending: "repair",
    training: "training", train: "training", unlock: "unlock",
  };

  const CURRENCY_ALIASES = {
    coin: "coin", coins: "coin", currency: "coin",
    gold: "gold", silver: "silver", copper: "copper",
    token: "token", tokens: "token",
    reputation: "reputation", rep: "reputation", faction_rep: "faction_currency",
    faction_currency: "faction_currency", faction: "faction_currency",
    event_currency: "event_currency", event_token: "event_currency",
    resource: "resource", item: "item",
  };

  const PRICE_COMPONENT_ALIASES = {
    currency: "currency", money: "currency", cost: "currency", price: "currency",
    item: "item", resource: "resource", material: "resource",
    reputation: "reputation", rep: "reputation",
    requirement: "requirement", req: "requirement", unlock: "requirement",
  };

  const AVAILABILITY_ALIASES = {
    available: "available", in_stock: "available", open: "available",
    limited: "limited", scarce: "limited",
    conditional: "conditional", locked: "conditional",
    rotating: "rotating", rotation: "rotating",
    seasonal: "seasonal", season: "seasonal",
    event_limited: "event_limited", event: "event_limited",
    unavailable: "unavailable", closed: "unavailable", out_of_stock: "unavailable",
  };

  const STOCK_ALIASES = {
    unlimited: "unlimited", infinite: "unlimited",
    limited: "limited", finite: "limited",
    restocking: "restocking", restock: "restocking",
    unique: "unique", one_of_a_kind: "unique",
    sold_out: "sold_out", depleted: "sold_out", empty: "sold_out",
  };

  const VENDOR_SERVICE_ALIASES = {
    vendor: "vendor", merchant: "vendor", shop: "vendor", seller: "vendor", trader: "vendor",
    trainer: "trainer", repair: "repair", crafter: "crafter", exchange: "exchange",
    banker: "banker", bank: "banker", storage: "storage", stash: "storage",
    faction_rep: "faction_rep", faction: "faction_rep",
  };

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

  function normalizeTradeOfferType(value) {
    return normalizeKind(value, TRADE_OFFER_TYPES, TRADE_OFFER_ALIASES);
  }

  function normalizeCurrencyType(value) {
    return normalizeKind(value, CURRENCY_TYPES, CURRENCY_ALIASES);
  }

  function normalizePriceComponentType(value) {
    return normalizeKind(value, PRICE_COMPONENT_TYPES, PRICE_COMPONENT_ALIASES);
  }

  function normalizeAvailabilityState(value) {
    return normalizeKind(value, AVAILABILITY_STATES, AVAILABILITY_ALIASES);
  }

  function normalizeStockState(value) {
    return normalizeKind(value, STOCK_STATES, STOCK_ALIASES);
  }

  function normalizeVendorServiceType(value) {
    return normalizeKind(value, VENDOR_SERVICE_TYPES, VENDOR_SERVICE_ALIASES);
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
    if (source.vendor_inventory && typeof source.vendor_inventory === "object" && Object.prototype.hasOwnProperty.call(source.vendor_inventory, field)) {
      return source.vendor_inventory[field];
    }
    if (source.economy_context && typeof source.economy_context === "object" && Object.prototype.hasOwnProperty.call(source.economy_context, field)) {
      return source.economy_context[field];
    }
    return undefined;
  }

  function toArray(value) {
    if (value == null) return [];
    if (Array.isArray(value)) return value.slice();
    if (typeof value === "object") return [value];
    const single = meaningful(value);
    return single ? [single] : [];
  }

  function normalizePriceComponent(record) {
    const source = record && typeof record === "object" ? record : {};
    const type = normalizePriceComponentType(source.type || source.component_type || source.kind || "currency");
    const currency = normalizeCurrencyType(source.currency || source.currency_type || type);
    const amountRaw = source.amount != null ? source.amount : (source.quantity != null ? source.quantity : source.cost);
    const amount = amountRaw != null && !isNaN(Number(amountRaw)) ? Number(amountRaw) : null;
    const target = meaningful(source.target || source.item || source.resource || source.name);
    const out = {
      type: type,
      currency: currency !== "unknown" ? currency : null,
      amount: amount,
      target: target || null,
      displayable: isDisplayableKind(type) && (amount != null || !!target),
    };
    if (source.reputation) out.reputation = meaningful(source.reputation) || null;
    if (source.requirement) out.requirement = meaningful(source.requirement) || null;
    return out;
  }

  function normalizeTradeOffer(record) {
    const source = record && typeof record === "object" ? record : {};
    const type = normalizeTradeOfferType(source.type || source.offer_type || source.kind || "sell");
    const item = meaningful(source.item || source.target || source.target_name || source.name || source.title);
    const priceRaw = source.price || source.cost || source.price_components || source.components;
    const price = toArray(priceRaw).map(normalizePriceComponent).filter(function(entry) {
      return entry && entry.displayable;
    });
    const availability = normalizeAvailabilityState(source.availability || source.availability_state);
    const stock = normalizeStockState(source.stock || source.stock_state);
    const out = {
      type: type,
      item: item || null,
      price: price,
      availability: availability,
      stock: stock,
      notes: meaningful(source.notes || source.description) || null,
      displayable: isDisplayableKind(type) && (!!item || price.length > 0),
    };
    if (source.faction_req) out.faction_req = meaningful(source.faction_req) || null;
    if (source.required_level != null) out.required_level = source.required_level;
    return out;
  }

  function normalizeVendorInventory(record) {
    const source = record && typeof record === "object" ? record : {};
    const offersRaw = readField(source, "offers") || readField(source, "items") || readField(source, "inventory");
    const offers = toArray(offersRaw).map(normalizeTradeOffer).filter(function(entry) {
      return entry && (entry.displayable || entry.type !== "unknown");
    });
    const serviceType = normalizeVendorServiceType(source.service_type || source.type || "vendor");
    const availability = normalizeAvailabilityState(source.availability || source.availability_state);
    return {
      service_type: serviceType,
      offers: offers,
      availability: availability,
      stock: normalizeStockState(source.stock || source.stock_state),
      currency_default: normalizeCurrencyType(source.currency_default || source.default_currency),
      notes: meaningful(source.notes) || null,
      displayable: offers.length > 0 || isDisplayableKind(serviceType),
    };
  }

  function normalizeVendorService(record) {
    const source = record && typeof record === "object" ? record : {};
    const type = normalizeVendorServiceType(source.type || source.service_type || "vendor");
    const inventory = normalizeVendorInventory(source.inventory || source.vendor_inventory || source);
    return {
      type: type,
      inventory: inventory,
      displayable: isDisplayableKind(type),
    };
  }

  function normalizeEconomyContext(record) {
    const source = record && typeof record === "object" ? record : {};
    const vendorInventory = normalizeVendorInventory(
      readField(source, "vendor_inventory") || readField(source, "inventory") || source
    );
    const offers = toArray(readField(source, "offers")).map(normalizeTradeOffer);
    if (!offers.length && vendorInventory.offers.length) {
      offers.push.apply(offers, vendorInventory.offers);
    }
    return {
      vendor_inventory: vendorInventory,
      offers: offers,
      availability: normalizeAvailabilityState(readField(source, "availability")),
      stock: normalizeStockState(readField(source, "stock")),
      currency_default: normalizeCurrencyType(readField(source, "currency_default") || readField(source, "currency")),
      price_components: toArray(readField(source, "price") || readField(source, "price_components")).map(normalizePriceComponent),
      faction_req: meaningful(readField(source, "faction_req")) || null,
      required_level: readField(source, "required_level") != null ? readField(source, "required_level") : null,
      reputation: meaningful(readField(source, "reputation")) || null,
    };
  }

  function toSignal(entry, group, label) {
    if (!entry || !entry.displayable) return null;
    const raw = meaningful(entry.raw) || meaningful(entry.item) || meaningful(entry.currency) ||
      (entry.amount != null ? String(entry.amount) : "") ||
      (entry.type && entry.type !== "unknown" ? titleCase(entry.type) : "");
    if (!raw) return null;
    return {
      raw: raw,
      normalized: slugKey(raw).replace(/_/g, " "),
      kind: entry.kind || entry.type || group,
      label: label || titleCase(group),
      group: group,
      weight: 2,
      source: "economy_registry",
      displayable: true,
    };
  }

  function extractPriceSignals(source) {
    const record = source && typeof source === "object" ? source : {};
    const prices = toArray(readField(record, "price") || readField(record, "price_components") || readField(record, "cost"));
    if (!prices.length && record.amount != null) {
      prices.push({ currency: readField(record, "currency") || "gold", amount: record.amount });
    }
    return prices.map(function(entry) {
      const norm = normalizePriceComponent(entry);
      if (!norm.displayable) return null;
      const rawParts = [];
      if (norm.amount != null) rawParts.push(String(norm.amount));
      if (norm.currency) rawParts.push(norm.currency);
      if (norm.target) rawParts.push(norm.target);
      return {
        kind: "price",
        type: norm.type,
        currency: norm.currency,
        amount: norm.amount,
        raw: rawParts.join(" ") || norm.type,
        label: getPriceComponentLabel(norm.type),
        displayable: norm.displayable,
      };
    }).filter(Boolean);
  }

  function extractTradeOfferSignals(source) {
    const record = source && typeof source === "object" ? source : {};
    const offers = toArray(readField(record, "offers") || readField(record, "trade_offers"));
    return offers.map(function(entry) {
      const norm = normalizeTradeOffer(entry);
      if (!norm.displayable) return null;
      const raw = [norm.type !== "unknown" ? norm.type : "", norm.item || ""].filter(Boolean).join(" ");
      return {
        kind: "trade_offer",
        type: norm.type,
        item: norm.item,
        raw: raw,
        label: getTradeOfferLabel(norm.type),
        displayable: norm.displayable,
      };
    }).filter(Boolean);
  }

  function extractVendorInventorySignals(source) {
    const record = source && typeof source === "object" ? source : {};
    const inventory = normalizeVendorInventory(readField(record, "vendor_inventory") || record);
    const signals = [];
    if (inventory.displayable && isDisplayableKind(inventory.service_type)) {
      signals.push({
        kind: "vendor_service",
        type: inventory.service_type,
        raw: inventory.service_type.replace(/_/g, " "),
        label: getVendorServiceLabel(inventory.service_type),
        displayable: true,
      });
    }
    inventory.offers.forEach(function(offer) {
      if (!offer.displayable) return;
      signals.push({
        kind: "trade_offer",
        type: offer.type,
        item: offer.item,
        raw: [offer.type, offer.item].filter(Boolean).join(" "),
        label: getTradeOfferLabel(offer.type),
        displayable: offer.displayable,
      });
    });
    return signals;
  }

  function extractAvailabilitySignals(source) {
    const record = source && typeof source === "object" ? source : {};
    const availability = normalizeAvailabilityState(readField(record, "availability") || readField(record, "availability_state"));
    const stock = normalizeStockState(readField(record, "stock") || readField(record, "stock_state"));
    const signals = [];
    if (isDisplayableKind(availability)) {
      signals.push({
        kind: "availability",
        type: availability,
        raw: availability.replace(/_/g, " "),
        label: getAvailabilityLabel(availability),
        displayable: true,
      });
    }
    if (isDisplayableKind(stock)) {
      signals.push({
        kind: "stock",
        type: stock,
        raw: stock.replace(/_/g, " "),
        label: getStockLabel(stock),
        displayable: true,
      });
    }
    return signals;
  }

  function extractEconomySearchSignals(source) {
    try {
      return extractPriceSignals(source)
        .concat(extractTradeOfferSignals(source))
        .concat(extractVendorInventorySignals(source))
        .concat(extractAvailabilitySignals(source))
        .map(function(entry) { return toSignal(entry, "economy", entry.label); })
        .filter(Boolean);
    } catch (err) {
      return [];
    }
  }

  function getTradeOfferLabel(value) {
    const kind = normalizeTradeOfferType(value);
    return kind === "unknown" ? "Trade Offer" : titleCase(kind);
  }

  function getCurrencyLabel(value) {
    const kind = normalizeCurrencyType(value);
    return kind === "unknown" ? "Currency" : titleCase(kind);
  }

  function getPriceComponentLabel(value) {
    const kind = normalizePriceComponentType(value);
    return kind === "unknown" ? "Price" : titleCase(kind);
  }

  function getAvailabilityLabel(value) {
    const kind = normalizeAvailabilityState(value);
    return kind === "unknown" ? "Availability" : titleCase(kind.replace(/_/g, " "));
  }

  function getStockLabel(value) {
    const kind = normalizeStockState(value);
    return kind === "unknown" ? "Stock" : titleCase(kind.replace(/_/g, " "));
  }

  function getVendorServiceLabel(value) {
    const kind = normalizeVendorServiceType(value);
    return kind === "unknown" ? "Vendor Service" : titleCase(kind.replace(/_/g, " "));
  }

  function shouldRenderTradeOfferSection(record, section) {
    if (!RENDER_SECTIONS_ENABLED) return false;
    if (!section) return false;
    const ctx = normalizeEconomyContext(record || {});
    const value = ctx[section];
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) return false;
    return true;
  }

  function shouldRenderVendorInventorySection(record, section) {
    if (!RENDER_SECTIONS_ENABLED) return false;
    if (!section) return false;
    const inv = normalizeVendorInventory(readField(record, "vendor_inventory") || record || {});
    const value = inv[section];
    if (value == null || value === "" || (Array.isArray(value) && !value.length)) return false;
    return true;
  }

  function isTradeOfferRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    return !!(readField(source, "offers") || readField(source, "trade_offers") ||
      (readField(source, "type") && readField(source, "item")));
  }

  function isVendorInventoryRecord(record) {
    const source = record && typeof record === "object" ? record : {};
    return !!(readField(source, "vendor_inventory") || readField(source, "inventory"));
  }

  function isEconomyContext(record) {
    const source = record && typeof record === "object" ? record : {};
    return isTradeOfferRecord(source) || isVendorInventoryRecord(source) ||
      !!readField(source, "price") || !!readField(source, "currency") ||
      !!readField(source, "economy_context");
  }

  function resolveEconomyContext(record) {
    const source = record && typeof record === "object" ? record : {};
    const normalized = normalizeEconomyContext(source);
    return {
      economy_context: normalized,
      is_economy: isEconomyContext(source),
      render_sections: RENDER_SECTIONS_ENABLED,
      signals: extractEconomySearchSignals(source),
      reserved_relations: P2_C_RESERVED_RELATIONS.slice(),
    };
  }

  return {
    TRADE_OFFER_TYPES: TRADE_OFFER_TYPES.slice(),
    CURRENCY_TYPES: CURRENCY_TYPES.slice(),
    PRICE_COMPONENT_TYPES: PRICE_COMPONENT_TYPES.slice(),
    AVAILABILITY_STATES: AVAILABILITY_STATES.slice(),
    STOCK_STATES: STOCK_STATES.slice(),
    VENDOR_SERVICE_TYPES: VENDOR_SERVICE_TYPES.slice(),
    P2_C_RESERVED_RELATIONS: P2_C_RESERVED_RELATIONS.slice(),
    normalizeTradeOfferType: normalizeTradeOfferType,
    normalizeCurrencyType: normalizeCurrencyType,
    normalizePriceComponentType: normalizePriceComponentType,
    normalizeAvailabilityState: normalizeAvailabilityState,
    normalizeStockState: normalizeStockState,
    normalizeVendorServiceType: normalizeVendorServiceType,
    normalizePriceComponent: normalizePriceComponent,
    normalizeTradeOffer: normalizeTradeOffer,
    normalizeVendorInventory: normalizeVendorInventory,
    normalizeVendorService: normalizeVendorService,
    normalizeEconomyContext: normalizeEconomyContext,
    extractPriceSignals: extractPriceSignals,
    extractTradeOfferSignals: extractTradeOfferSignals,
    extractVendorInventorySignals: extractVendorInventorySignals,
    extractAvailabilitySignals: extractAvailabilitySignals,
    extractEconomySearchSignals: extractEconomySearchSignals,
    getTradeOfferLabel: getTradeOfferLabel,
    getCurrencyLabel: getCurrencyLabel,
    getPriceComponentLabel: getPriceComponentLabel,
    getAvailabilityLabel: getAvailabilityLabel,
    getStockLabel: getStockLabel,
    getVendorServiceLabel: getVendorServiceLabel,
    shouldRenderTradeOfferSection: shouldRenderTradeOfferSection,
    shouldRenderVendorInventorySection: shouldRenderVendorInventorySection,
    isTradeOfferRecord: isTradeOfferRecord,
    isVendorInventoryRecord: isVendorInventoryRecord,
    isEconomyContext: isEconomyContext,
    resolveEconomyContext: resolveEconomyContext,
  };
})();
