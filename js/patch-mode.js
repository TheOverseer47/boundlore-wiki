// ============================================
// BoundLore Patch / Maintenance Mode (S-09)
// Fail-closed UX/ops layer. Server release_gate remains authoritative.
// ============================================

window.WikiPatchMode = (function() {
  var FETCH_TIMEOUT_MS = 5000;
  var STATE_PENDING = "pending";
  var STATE_ALLOWED = "allowed";
  var STATE_BLOCKED = "blocked";
  var STATE_ERROR = "error";

  var MSG_ACTIVE =
    "This action is temporarily unavailable due to maintenance.";
  var MSG_UNAVAILABLE =
    "This action cannot be used right now for safety reasons.";
  var MSG_LOADING =
    "Please wait while availability is checked.";

  var modeState = STATE_PENDING;
  var initPromise = null;
  var configRow = null;
  var lastCode = "PATCH_MODE_LOADING";
  var boundForms = [];

  function makeError(code, message) {
    var err = new Error(message || MSG_UNAVAILABLE);
    err.code = code;
    return err;
  }

  function getUserMessage(err) {
    var code = err && err.code ? String(err.code) : lastCode;
    if (code === "PATCH_MODE_ACTIVE") return MSG_ACTIVE;
    if (code === "PATCH_MODE_LOADING") return MSG_LOADING;
    return MSG_UNAVAILABLE;
  }

  function getState() {
    return {
      state: modeState,
      ready: modeState !== STATE_PENDING,
      allowed: modeState === STATE_ALLOWED,
      code: lastCode,
      enabled:
        configRow && typeof configRow.enabled === "boolean"
          ? configRow.enabled
          : null,
      public_message:
        configRow && configRow.public_message
          ? String(configRow.public_message)
          : "",
    };
  }

  function isReady() {
    return modeState !== STATE_PENDING;
  }

  function isSubmissionAllowed() {
    return modeState === STATE_ALLOWED;
  }

  function emitChange() {
    try {
      window.__boundlorePatchMode = getState();
    } catch (ignore) {}
    try {
      document.dispatchEvent(
        new CustomEvent("bl-patch-mode-change", { detail: getState() })
      );
    } catch (ignore) {}
  }

  function setState(next, code, row) {
    modeState = next;
    lastCode = code || lastCode;
    if (row !== undefined) configRow = row;
    refreshBoundForms();
    emitChange();
  }

  function getClient() {
    try {
      if (typeof supabase !== "undefined" && supabase && typeof supabase.from === "function") {
        return supabase;
      }
    } catch (err) {}
    return null;
  }

  function withTimeout(promise, ms) {
    var settled = false;
    return new Promise(function(resolve, reject) {
      var timer = setTimeout(function() {
        if (settled) return;
        settled = true;
        reject(makeError("PATCH_MODE_UNAVAILABLE", MSG_UNAVAILABLE));
      }, ms);
      Promise.resolve(promise).then(
        function(value) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(value);
        },
        function(err) {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        }
      );
    });
  }

  function normalizeConfigResult(result) {
    if (!result || typeof result !== "object") {
      throw makeError("PATCH_MODE_UNAVAILABLE", MSG_UNAVAILABLE);
    }
    if (result.error) {
      throw makeError("PATCH_MODE_UNAVAILABLE", MSG_UNAVAILABLE);
    }
    var data = result.data;
    var rows = Array.isArray(data) ? data : data ? [data] : [];
    if (rows.length === 0) {
      throw makeError("PATCH_MODE_UNAVAILABLE", MSG_UNAVAILABLE);
    }
    if (rows.length !== 1) {
      throw makeError("PATCH_MODE_UNAVAILABLE", MSG_UNAVAILABLE);
    }
    var row = rows[0];
    if (!row || typeof row !== "object") {
      throw makeError("PATCH_MODE_UNAVAILABLE", MSG_UNAVAILABLE);
    }
    if (!Object.prototype.hasOwnProperty.call(row, "enabled")) {
      throw makeError("PATCH_MODE_UNAVAILABLE", MSG_UNAVAILABLE);
    }
    if (row.enabled === true) {
      return { state: STATE_BLOCKED, code: "PATCH_MODE_ACTIVE", row: row };
    }
    if (row.enabled === false) {
      return { state: STATE_ALLOWED, code: null, row: row };
    }
    throw makeError("PATCH_MODE_UNAVAILABLE", MSG_UNAVAILABLE);
  }

  async function loadConfiguration() {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setState(STATE_ERROR, "PATCH_MODE_UNAVAILABLE", null);
      return getState();
    }

    var client = getClient();
    if (!client) {
      setState(STATE_ERROR, "PATCH_MODE_UNAVAILABLE", null);
      return getState();
    }

    try {
      var query = client
        .from("wiki_patch_mode")
        .select("id, enabled, public_message, expected_until")
        .eq("id", 1);
      var result = await withTimeout(query, FETCH_TIMEOUT_MS);
      var normalized = normalizeConfigResult(result);
      setState(normalized.state, normalized.code || (normalized.state === STATE_ALLOWED ? null : "PATCH_MODE_ACTIVE"), normalized.row);
    } catch (err) {
      setState(STATE_ERROR, "PATCH_MODE_UNAVAILABLE", null);
    }
    return getState();
  }

  function initialize() {
    if (initPromise) return initPromise;
    setState(STATE_PENDING, "PATCH_MODE_LOADING", null);
    initPromise = loadConfiguration().then(
      function(state) {
        return state;
      },
      function() {
        setState(STATE_ERROR, "PATCH_MODE_UNAVAILABLE", null);
        return getState();
      }
    );
    return initPromise;
  }

  async function resolveAdminBypass() {
    var client = getClient();
    if (!client || !client.auth || typeof client.auth.getSession !== "function") {
      return false;
    }
    try {
      var sessionResult = await withTimeout(client.auth.getSession(), FETCH_TIMEOUT_MS);
      var session = sessionResult && sessionResult.data && sessionResult.data.session;
      if (!session || !session.user || !session.user.id) return false;
      var profileResult = await withTimeout(
        client
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .maybeSingle(),
        FETCH_TIMEOUT_MS
      );
      if (!profileResult || profileResult.error || !profileResult.data) return false;
      return profileResult.data.role === "admin";
    } catch (err) {
      return false;
    }
  }

  async function assertCanSubmit() {
    await initialize();
    if (modeState === STATE_ALLOWED) return { ok: true, state: getState() };
    if (modeState === STATE_PENDING) {
      throw makeError("PATCH_MODE_LOADING", MSG_LOADING);
    }
    if (modeState === STATE_BLOCKED) {
      var bypass = await resolveAdminBypass();
      if (bypass) return { ok: true, state: getState(), bypass: true };
      var custom = configRow && configRow.public_message
        ? String(configRow.public_message).trim()
        : "";
      throw makeError("PATCH_MODE_ACTIVE", custom || MSG_ACTIVE);
    }
    throw makeError("PATCH_MODE_UNAVAILABLE", MSG_UNAVAILABLE);
  }

  function setControlsDisabled(root, patchLocked, reason) {
    if (!root) return;
    var nodes = root.querySelectorAll(
      "button[type='submit'], input[type='submit'], button[data-bl-patch-control='1'], input[data-bl-patch-control='1']"
    );
    Array.prototype.forEach.call(nodes, function(el) {
      if (patchLocked) {
        el.setAttribute("data-bl-patch-locked", "1");
        el.disabled = true;
        el.setAttribute("aria-disabled", "true");
        if (reason) el.title = reason;
      } else if (el.getAttribute("data-bl-patch-locked") === "1") {
        el.removeAttribute("data-bl-patch-locked");
        el.disabled = false;
        el.removeAttribute("aria-disabled");
        el.removeAttribute("title");
      }
    });
  }

  function ensureStatusNode(host) {
    if (!host) return null;
    var existing = host.querySelector("[data-bl-patch-status='1']");
    if (existing) return existing;
    var el = document.createElement("div");
    el.className = "bl-patch-mode-status form-error";
    el.setAttribute("data-bl-patch-status", "1");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.style.display = "none";
    if (host.firstChild) host.insertBefore(el, host.firstChild);
    else host.appendChild(el);
    return el;
  }

  function updateStatusNode(host, state) {
    var el = ensureStatusNode(host);
    if (!el) return;
    if (state.state === STATE_ALLOWED) {
      el.style.display = "none";
      el.textContent = "";
      return;
    }
    var message = MSG_UNAVAILABLE;
    if (state.state === STATE_PENDING) message = MSG_LOADING;
    if (state.state === STATE_BLOCKED) {
      message =
        state.public_message && String(state.public_message).trim()
          ? String(state.public_message).trim()
          : MSG_ACTIVE;
    }
    el.textContent = message;
    el.style.display = "block";
  }

  function refreshBoundForms() {
    var state = getState();
    boundForms.forEach(function(entry) {
      var allowed = state.state === STATE_ALLOWED;
      setControlsDisabled(entry.root, !allowed, getUserMessage({ code: state.code }));
      updateStatusNode(entry.root, state);
    });
  }

  function bindForm(formOrSelector, options) {
    var opts = options || {};
    var root =
      typeof formOrSelector === "string"
        ? document.querySelector(formOrSelector)
        : formOrSelector;
    if (!root) return null;

    var entry = { root: root, options: opts };
    boundForms.push(entry);

    setControlsDisabled(root, true, MSG_LOADING);
    updateStatusNode(root, getState());

    if (opts.captureSubmit !== false) {
      root.addEventListener(
        "submit",
        function(event) {
          if (modeState === STATE_ALLOWED) return;
          event.preventDefault();
          event.stopPropagation();
          updateStatusNode(root, getState());
        },
        true
      );
    }

    initialize();
    return entry;
  }

  function bindControls(selectorList, host) {
    var root = host || document;
    var list = Array.isArray(selectorList) ? selectorList : [selectorList];
    list.forEach(function(sel) {
      var nodes = root.querySelectorAll(sel);
      Array.prototype.forEach.call(nodes, function(el) {
        el.setAttribute("data-bl-patch-control", "1");
      });
    });
    return bindForm(host || document.body, { captureSubmit: false });
  }

  // Auto-start pending state; callers must still initialize/bind.
  setState(STATE_PENDING, "PATCH_MODE_LOADING", null);

  return {
    STATE_PENDING: STATE_PENDING,
    STATE_ALLOWED: STATE_ALLOWED,
    STATE_BLOCKED: STATE_BLOCKED,
    STATE_ERROR: STATE_ERROR,
    FETCH_TIMEOUT_MS: FETCH_TIMEOUT_MS,
    initialize: initialize,
    getState: getState,
    isReady: isReady,
    isSubmissionAllowed: isSubmissionAllowed,
    assertCanSubmit: assertCanSubmit,
    bindForm: bindForm,
    bindControls: bindControls,
    getUserMessage: getUserMessage,
  };
})();
