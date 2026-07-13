// ============================================
// BoundLore Release Gate — client read/UX (P5-E.3)
// Fail-closed advisory layer; server RLS/RPC is enforcement.
// ============================================

window.BoundLoreReleaseGateClient = (function() {
  var RELEASE_GATE_CLIENT_VERSION = "p5-e8c";
  var CACHE_MS = 15000;
  var USER_LOCKED_COPY =
    "BoundLore is currently in pre-release read-only mode. Community submissions will open when the game release workflow is manually unlocked by an admin.";
  var ADMIN_LOCKED_COPY =
    "Release Gate: LOCKED. User-generated content submissions are blocked server-side. Unlock only when launch conditions are explicitly met.";
  var UNKNOWN_LOCKED_COPY =
    "Release Gate status unavailable. For safety, submissions are locked.";
  var STORAGE_UPLOADS_DEFERRED = true;
  var STORAGE_UPLOAD_UNAVAILABLE_COPY =
    "Uploads are temporarily unavailable before release. You can continue without attachments.";

  var cachedState = null;
  var cacheTs = 0;
  var lastReadError = null;

  function emitReleaseGateReport(code, ctx) {
    try {
      var rep = window.BoundLoreErrorReporter;
      if (rep && typeof rep.captureReleaseGateEvent === "function") {
        rep.captureReleaseGateEvent(code, ctx || {});
      }
    } catch (ignore) {}
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function shouldAllowClientBypass() {
    return false;
  }

  function getDefaultLockedState(reason, source) {
    return {
      locked: true,
      known: false,
      reason: reason || UNKNOWN_LOCKED_COPY,
      source: source || "missing_config",
      updated_at: null,
      updated_by: null,
      lock_version: null,
    };
  }

  function normalizeReleaseGateRow(row) {
    if (!row || typeof row !== "object") {
      return getDefaultLockedState(UNKNOWN_LOCKED_COPY, "invalid");
    }
    var contributionLocked = row.contribution_locked;
    if (contributionLocked !== false) {
      return {
        locked: true,
        known: true,
        reason: String(row.reason || "").trim() || USER_LOCKED_COPY,
        source: "db",
        updated_at: row.updated_at || null,
        updated_by: row.updated_by || null,
        lock_version: row.lock_version != null ? Number(row.lock_version) : null,
      };
    }
    return {
      locked: false,
      known: true,
      reason: String(row.reason || "").trim() || "Release gate unlocked.",
      source: "db",
      updated_at: row.updated_at || null,
      updated_by: row.updated_by || null,
      lock_version: row.lock_version != null ? Number(row.lock_version) : null,
    };
  }

  function isLockedState(state) {
    if (!state || typeof state !== "object") return true;
    if (state.locked !== false) return true;
    return false;
  }

  function getCachedReleaseGateState() {
    if (!cachedState) return null;
    if ((Date.now() - cacheTs) > CACHE_MS) return null;
    return Object.assign({}, cachedState);
  }

  function getSupabaseClient() {
    try {
      if (typeof supabase !== "undefined" && supabase && typeof supabase.from === "function") {
        return supabase;
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  function mapReadErrorToState(error) {
    var message = error && error.message ? String(error.message) : "";
    var lower = message.toLowerCase();
    if (
      lower.indexOf("release_gate") >= 0 ||
      lower.indexOf("does not exist") >= 0 ||
      lower.indexOf("schema cache") >= 0 ||
      lower.indexOf("relation") >= 0
    ) {
      return getDefaultLockedState(
        "Release gate unavailable; submissions are locked.",
        "missing_config"
      );
    }
    return getDefaultLockedState(UNKNOWN_LOCKED_COPY, "read_error");
  }

  async function readReleaseGateState(options) {
    var opts = options || {};
    var force = !!opts.force;

    if (!force) {
      var cached = getCachedReleaseGateState();
      if (cached) return cached;
    }

    var client = getSupabaseClient();
    if (!client) {
      cachedState = getDefaultLockedState(UNKNOWN_LOCKED_COPY, "no_client");
      cacheTs = Date.now();
      emitReleaseGateReport("E-03", { source_type: "no_client", blocked: true });
      return Object.assign({}, cachedState);
    }

    try {
      var result = await client
        .from("release_gate")
        .select("id, contribution_locked, reason, updated_at, updated_by, lock_version")
        .eq("id", 1)
        .maybeSingle();

      if (result.error) {
        lastReadError = result.error;
        cachedState = mapReadErrorToState(result.error);
        cacheTs = Date.now();
        emitReleaseGateReport("E-03", { source_type: "read_error", blocked: true });
        return Object.assign({}, cachedState);
      }

      if (!result.data) {
        cachedState = getDefaultLockedState(
          "Release gate unavailable; submissions are locked.",
          "missing_config"
        );
        cacheTs = Date.now();
        return Object.assign({}, cachedState);
      }

      cachedState = normalizeReleaseGateRow(result.data);
      lastReadError = null;
      cacheTs = Date.now();
      return Object.assign({}, cachedState);
    } catch (err) {
      lastReadError = err;
      cachedState = getDefaultLockedState(UNKNOWN_LOCKED_COPY, "read_error");
      cacheTs = Date.now();
      emitReleaseGateReport("E-03", { source_type: "read_error", blocked: true });
      return Object.assign({}, cachedState);
    }
  }

  function getLockedUserMessage(state) {
    if (!state || !state.known) return UNKNOWN_LOCKED_COPY;
    if (state.source === "read_error" || state.source === "no_client" || state.source === "missing_config") {
      return UNKNOWN_LOCKED_COPY;
    }
    return USER_LOCKED_COPY;
  }

  async function assertCanSubmitUserContent(context, options) {
    var ctx = String(context || "user_content");
    if (shouldAllowClientBypass()) {
      return { ok: true, context: ctx, state: null };
    }
    var state = await readReleaseGateState(options);
    if (!isLockedState(state)) {
      return { ok: true, context: ctx, state: state };
    }
    emitReleaseGateReport("E-03", { source_type: "contribution_locked", blocked: true, context: ctx });
    return {
      ok: false,
      blocked: true,
      context: ctx,
      message: getLockedUserMessage(state),
      state: state,
    };
  }

  function renderReleaseGateNotice(container, state, options) {
    var host = typeof container === "string" ? document.querySelector(container) : container;
    if (!host) return null;

    var opts = options || {};
    var locked = isLockedState(state);
    var message = locked ? getLockedUserMessage(state) : "";

    var existing = host.querySelector("[data-bl-release-gate-notice='1']");
    if (existing) existing.remove();

    if (!locked) return null;

    var notice = document.createElement("div");
    notice.className = "bl-release-gate-notice";
    notice.setAttribute("data-bl-release-gate-notice", "1");
    notice.setAttribute("role", "status");
    notice.style.cssText =
      "margin:0 0 16px;padding:12px 14px;border:1px solid rgba(201,124,45,0.45);" +
      "border-radius:8px;background:rgba(201,124,45,0.12);color:var(--text-main,#e8edf2);font-size:0.95rem;";
    notice.innerHTML =
      "<strong style=\"display:block;margin-bottom:6px;\">Pre-release read-only mode</strong>" +
      "<span>" + escapeHtml(message) + "</span>";

    if (opts.prepend && host.firstChild) {
      host.insertBefore(notice, host.firstChild);
    } else {
      host.appendChild(notice);
    }
    return notice;
  }

  function isSubmissionControl(el) {
    if (!el || !el.tagName) return false;
    var tag = el.tagName.toLowerCase();
    if (tag === "button" && (el.type === "submit" || el.getAttribute("type") === "submit")) return true;
    if (el.matches && el.matches("[data-bl-submit='1'], [data-bl-release-gate-control='1']")) return true;
    if (tag === "input") {
      var type = (el.getAttribute("type") || "").toLowerCase();
      if (type === "submit" || type === "file") return true;
    }
    return false;
  }

  function applyReleaseGateToForm(rootElement, state, options) {
    var root = typeof rootElement === "string" ? document.querySelector(rootElement) : rootElement;
    if (!root) return;
    var locked = isLockedState(state);
    var controls = root.querySelectorAll("button, input, textarea, select");
    controls.forEach(function(el) {
      if (!isSubmissionControl(el)) return;
      if (locked) {
        el.disabled = true;
        el.setAttribute("aria-disabled", "true");
        el.setAttribute("data-bl-release-gate-locked", "1");
        if (el.tagName.toLowerCase() === "button") {
          el.title = getLockedUserMessage(state);
        }
      } else {
        if (el.getAttribute("data-bl-release-gate-locked") === "1") {
          el.disabled = false;
        }
        el.removeAttribute("data-bl-release-gate-locked");
        el.removeAttribute("aria-disabled");
        if (el.tagName.toLowerCase() === "button") {
          el.removeAttribute("title");
        }
      }
    });
    if (locked) root.setAttribute("data-bl-release-gate-form-locked", "1");
    else root.removeAttribute("data-bl-release-gate-form-locked");
  }

  function applyReleaseGateToButtons(rootElement, state, options) {
    var root = typeof rootElement === "string" ? document.querySelector(rootElement) : rootElement;
    if (!root) return;
    var locked = isLockedState(state);
    var buttons = root.querySelectorAll("button, [role='button']");
    buttons.forEach(function(btn) {
      if (!isSubmissionControl(btn) && !btn.getAttribute("data-bl-release-gate-control")) return;
      if (locked) {
        btn.disabled = true;
        btn.setAttribute("aria-disabled", "true");
        btn.setAttribute("data-bl-release-gate-locked", "1");
      } else {
        if (btn.getAttribute("data-bl-release-gate-locked") === "1") {
          btn.disabled = false;
        }
        btn.removeAttribute("data-bl-release-gate-locked");
        btn.removeAttribute("aria-disabled");
      }
    });
  }

  function formatTimestamp(value) {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString();
    } catch (err) {
      return String(value);
    }
  }

  function buildReleaseGateStatusView(state, options) {
    var opts = options || {};
    var forAdmin = !!opts.forAdmin;
    var locked = isLockedState(state);
    var statusLabel = locked ? "LOCKED" : "UNLOCKED";
    var badgeColor = locked ? "#c97c2d" : "#2f7d57";
    if (!state || !state.known) {
      statusLabel = "UNKNOWN (locked)";
      badgeColor = "#8b0000";
    }

    var headline = forAdmin
      ? (locked ? ADMIN_LOCKED_COPY : "Release Gate: UNLOCKED. User submissions are allowed server-side when DB policies are applied.")
      : getLockedUserMessage(state);

    return (
      '<div class="bl-release-gate-status-view" data-bl-release-gate-status="1">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">' +
      '<div><p style="margin:0 0 8px;font-size:0.92rem;">' + escapeHtml(headline) + "</p>" +
      '<p style="margin:0;font-size:0.88rem;color:var(--text-muted);">Source: <code>' + escapeHtml(state && state.source ? state.source : "unknown") + "</code></p></div>" +
      '<span class="badge" style="background:' + badgeColor + ';color:#fff;">' + escapeHtml(statusLabel) + "</span></div>" +
      '<dl style="margin:12px 0 0;display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:0.88rem;">' +
      "<dt>Reason</dt><dd>" + escapeHtml(state && state.reason ? state.reason : "—") + "</dd>" +
      "<dt>Updated</dt><dd>" + escapeHtml(formatTimestamp(state && state.updated_at)) + "</dd>" +
      "<dt>Lock version</dt><dd>" + escapeHtml(state && state.lock_version != null ? String(state.lock_version) : "—") + "</dd>" +
      "</dl></div>"
    );
  }

  function validateAdminUnlockReason(reason) {
    var trimmed = String(reason || "").trim();
    if (!trimmed) {
      return { ok: false, message: "A reason is required before changing the release gate." };
    }
    if (trimmed.length < 8) {
      return { ok: false, message: "Reason must be at least 8 characters." };
    }
    return { ok: true, reason: trimmed };
  }

  function buildAdminUnlockControlsMarkup() {
    return (
      '<div id="releaseGateControls" data-bl-release-gate-admin-controls="1" style="margin-top:14px;display:grid;gap:10px;">' +
      '<label for="releaseGateReason">Reason (required)</label>' +
      '<textarea id="releaseGateReason" class="form-input" rows="2" maxlength="500" ' +
      'data-bl-release-gate-reason-required="1" placeholder="Document why the release gate is being changed."></textarea>' +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;">' +
      '<button id="btnUnlockReleaseGate" class="btn-small" type="button" style="background:#50c878;" ' +
      'data-bl-release-gate-action="unlock">Unlock Submissions</button>' +
      '<button id="btnRelockReleaseGate" class="btn-small" type="button" style="background:#c97c2d;" ' +
      'data-bl-release-gate-action="relock">Re-lock Submissions</button>' +
      "</div>" +
      '<p id="releaseGateMsg" style="margin:0;color:var(--text-muted);font-size:0.88rem;"></p>' +
      "<p style=\"margin:0;color:var(--text-muted);font-size:0.82rem;\">" +
      "Requires explicit confirm + reason. Does not change pending review items.</p>" +
      "</div>"
    );
  }

  function getReleaseGateDiagnostics() {
    return {
      version: RELEASE_GATE_CLIENT_VERSION,
      shouldAllowClientBypass: shouldAllowClientBypass(),
      storageUploadsDeferred: isStorageUploadsDeferred(),
      cacheAgeMs: cachedState ? Math.max(0, Date.now() - cacheTs) : null,
      cachedState: cachedState ? Object.assign({}, cachedState) : null,
      lastReadError: lastReadError && lastReadError.message ? String(lastReadError.message) : null,
    };
  }

  function isStorageUploadsDeferred() {
    return STORAGE_UPLOADS_DEFERRED === true;
  }

  function assertCanUploadStorage(context) {
    var ctx = String(context || "storage_upload");
    if (!isStorageUploadsDeferred()) {
      return { ok: true, context: ctx, deferred: false };
    }
    emitReleaseGateReport("E-08", { deferred: true, blocked: true, context: ctx });
    return {
      ok: false,
      blocked: true,
      context: ctx,
      deferred: true,
      message: STORAGE_UPLOAD_UNAVAILABLE_COPY,
    };
  }

  function renderStorageUploadUnavailableNotice(container, options) {
    if (!isStorageUploadsDeferred()) return null;
    var host = typeof container === "string" ? document.querySelector(container) : container;
    if (!host) return null;

    var opts = options || {};
    var existing = host.querySelector("[data-bl-storage-upload-notice='1']");
    if (existing) existing.remove();

    var notice = document.createElement("div");
    notice.className = "bl-storage-upload-notice";
    notice.setAttribute("data-bl-storage-upload-notice", "1");
    notice.setAttribute("role", "status");
    notice.style.cssText =
      "margin:0 0 16px;padding:12px 14px;border:1px solid rgba(90,120,150,0.45);" +
      "border-radius:8px;background:rgba(90,120,150,0.12);color:var(--text-main,#e8edf2);font-size:0.95rem;";
    notice.innerHTML =
      "<strong style=\"display:block;margin-bottom:6px;\">Attachments unavailable</strong>" +
      "<span>" + escapeHtml(STORAGE_UPLOAD_UNAVAILABLE_COPY) + "</span>";

    if (opts.prepend && host.firstChild) {
      host.insertBefore(notice, host.firstChild);
    } else {
      host.appendChild(notice);
    }
    return notice;
  }

  function applyStorageUploadDisablement(rootElement, options) {
    if (!isStorageUploadsDeferred()) return;
    var root = typeof rootElement === "string" ? document.querySelector(rootElement) : rootElement;
    if (!root) return;

    var fileInputs = root.querySelectorAll('input[type="file"]');
    fileInputs.forEach(function(el) {
      el.disabled = true;
      el.setAttribute("aria-disabled", "true");
      el.setAttribute("data-bl-storage-upload-deferred", "1");
      el.title = STORAGE_UPLOAD_UNAVAILABLE_COPY;
    });

    root.querySelectorAll(".bl-contrib-evidence-upload, [data-bl-storage-upload-zone='1']").forEach(function(zone) {
      zone.setAttribute("data-bl-storage-upload-unavailable", "1");
    });
  }

  return {
    RELEASE_GATE_CLIENT_VERSION: RELEASE_GATE_CLIENT_VERSION,
    USER_LOCKED_COPY: USER_LOCKED_COPY,
    ADMIN_LOCKED_COPY: ADMIN_LOCKED_COPY,
    UNKNOWN_LOCKED_COPY: UNKNOWN_LOCKED_COPY,
    STORAGE_UPLOAD_UNAVAILABLE_COPY: STORAGE_UPLOAD_UNAVAILABLE_COPY,
    shouldAllowClientBypass: shouldAllowClientBypass,
    getDefaultLockedState: getDefaultLockedState,
    normalizeReleaseGateRow: normalizeReleaseGateRow,
    isLockedState: isLockedState,
    getCachedReleaseGateState: getCachedReleaseGateState,
    readReleaseGateState: readReleaseGateState,
    assertCanSubmitUserContent: assertCanSubmitUserContent,
    renderReleaseGateNotice: renderReleaseGateNotice,
    applyReleaseGateToForm: applyReleaseGateToForm,
    applyReleaseGateToButtons: applyReleaseGateToButtons,
    buildReleaseGateStatusView: buildReleaseGateStatusView,
    validateAdminUnlockReason: validateAdminUnlockReason,
    buildAdminUnlockControlsMarkup: buildAdminUnlockControlsMarkup,
    getReleaseGateDiagnostics: getReleaseGateDiagnostics,
    isStorageUploadsDeferred: isStorageUploadsDeferred,
    assertCanUploadStorage: assertCanUploadStorage,
    renderStorageUploadUnavailableNotice: renderStorageUploadUnavailableNotice,
    applyStorageUploadDisablement: applyStorageUploadDisablement,
  };
})();
