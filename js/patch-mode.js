// ============================================
// Wiki Patch / Maintenance Mode guard
// ============================================

window.WikiPatchMode = (function() {
  const BYPASS_ROLES = ["admin"];
  const EXEMPT_PATH_PREFIXES = [
    "/wiki/admin/",
    "/wiki/login/",
    "/wiki/reset-password/",
  ];
  const BLOCKED_SUBMIT_PREFIXES = [
    "/wiki/create-post/",
    "/wiki/edit-post/",
    "/wiki/submit-tutorial/",
  ];

  let cachedState = null;
  let cachedAccess = null;
  let cacheTs = 0;
  const CACHE_MS = 15000;

  function normalizePath(path) {
    const raw = String(path || window.location.pathname || "/");
    if (raw.length > 1 && raw.endsWith("/")) return raw;
    return raw.endsWith("/") ? raw : raw + (raw === "/" ? "" : "");
  }

  function isExemptPath(path) {
    const p = String(path || window.location.pathname || "");
    return EXEMPT_PATH_PREFIXES.some(function(prefix) {
      return p.indexOf(prefix) === 0;
    });
  }

  function isSubmissionPath(path) {
    const p = String(path || window.location.pathname || "");
    return BLOCKED_SUBMIT_PREFIXES.some(function(prefix) {
      return p.indexOf(prefix) === 0;
    });
  }

  async function getViewerAccess(force) {
    if (!force && cachedAccess && (Date.now() - cacheTs) < CACHE_MS) return cachedAccess;
    let access = { loggedIn: false, role: "guest", bypass: false, userId: null };
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData && sessionData.session;
      if (!session) {
        cachedAccess = access;
        cacheTs = Date.now();
        return access;
      }
      access.loggedIn = true;
      access.userId = session.user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .maybeSingle();
      access.role = profile && profile.role ? profile.role : "user";
      access.bypass = BYPASS_ROLES.includes(access.role);
    } catch (err) {
      console.warn("Patch mode access check failed:", err);
    }
    cachedAccess = access;
    cacheTs = Date.now();
    return access;
  }

  async function fetchState(force) {
    if (!force && cachedState && (Date.now() - cacheTs) < CACHE_MS) return cachedState;
    const fallback = {
      enabled: false,
      public_message: "",
      reason: "",
      expected_until: null,
      available: false,
    };
    try {
      const { data, error } = await supabase
        .from("wiki_patch_mode")
        .select("enabled, public_message, reason, expected_until, updated_at")
        .eq("id", 1)
        .maybeSingle();
      if (error || !data) {
        cachedState = fallback;
        cacheTs = Date.now();
        return fallback;
      }
      cachedState = {
        enabled: !!data.enabled,
        public_message: data.public_message || "",
        reason: data.reason || "",
        expected_until: data.expected_until || null,
        updated_at: data.updated_at || null,
        available: true,
      };
    } catch (err) {
      console.warn("Patch mode state fetch failed:", err);
      cachedState = fallback;
    }
    cacheTs = Date.now();
    return cachedState;
  }

  function formatExpectedUntil(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString();
    } catch (e) {
      return "";
    }
  }

  function renderMaintenancePage(state) {
    document.documentElement.classList.add("bl-patch-mode-active");
    document.body.classList.add("bl-patch-mode-active");
    document.body.classList.remove("bl-patch-check-pending");

    const custom = String(state.public_message || "").trim();
    const until = formatExpectedUntil(state.expected_until);
    const message = custom || "The wiki is currently being updated. Please check back later.";

    const shell = document.createElement("div");
    shell.className = "bl-patch-screen";
    shell.innerHTML =
      '<div class="bl-patch-card">' +
      '<p class="bl-patch-kicker">BoundLore Wiki</p>' +
      '<h1 class="bl-patch-title">Wiki Update In Progress</h1>' +
      '<p class="bl-patch-message">' + escapeHtml(message) + "</p>" +
      (until ? '<p class="bl-patch-meta">Expected back: ' + escapeHtml(until) + "</p>" : "") +
      '<p class="bl-patch-foot">Thank you for your patience.</p>' +
      '<div class="bl-patch-actions">' +
      '<a class="bl-patch-link" href="/">Return Home</a>' +
      '<a class="bl-patch-link" href="/wiki/login/">Login</a>' +
      "</div></div>";

    const children = Array.from(document.body.children);
    children.forEach(function(node) {
      if (node.tagName === "SCRIPT") return;
      node.setAttribute("data-bl-patch-hidden", "1");
      node.style.display = "none";
    });
    document.body.appendChild(shell);
    document.title = "Wiki Update – BoundLore";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  async function enforce(options) {
    const opts = options || {};
    const path = window.location.pathname || "/";
    const state = await fetchState();
    const access = await getViewerAccess();

    const result = {
      enabled: !!state.enabled,
      blocked: false,
      bypass: !!access.bypass,
      available: !!state.available,
      state: state,
      access: access,
    };

    window.__boundlorePatchMode = result;

    if (!state.enabled) {
      document.body.classList.remove("bl-patch-check-pending");
      return result;
    }

    if (access.bypass) {
      document.body.classList.remove("bl-patch-check-pending");
      document.body.classList.add("bl-patch-bypass");
      return result;
    }

    if (isExemptPath(path)) {
      document.body.classList.remove("bl-patch-check-pending");
      return result;
    }

    if (opts.blockSubmissionsOnly && !isSubmissionPath(path)) {
      document.body.classList.remove("bl-patch-check-pending");
      return result;
    }

    result.blocked = true;
    renderMaintenancePage(state);
    return result;
  }

  async function assertCanSubmit() {
    const state = await fetchState(true);
    const access = await getViewerAccess(true);
    if (!state.enabled) return { ok: true };
    if (access.bypass) return { ok: true };
    return {
      ok: false,
      message: "The wiki is currently being updated. Submissions are temporarily disabled.",
    };
  }

  async function updatePatchMode(patch, adminId) {
    const payload = {
      enabled: !!patch.enabled,
      public_message: patch.public_message ? String(patch.public_message).slice(0, 500) : null,
      reason: patch.reason ? String(patch.reason).slice(0, 240) : null,
      expected_until: patch.expected_until || null,
      updated_at: new Date().toISOString(),
      updated_by: adminId || null,
    };
    const { data, error } = await supabase
      .from("wiki_patch_mode")
      .update(payload)
      .eq("id", 1)
      .select("enabled, public_message, reason, expected_until, updated_at")
      .single();
    if (error) throw error;
    cachedState = null;
    cachedAccess = null;
    return data;
  }

  function injectPendingClass() {
    if (document.body && !isExemptPath(window.location.pathname)) {
      document.body.classList.add("bl-patch-check-pending");
    }
  }

  if (document.body) injectPendingClass();
  else document.addEventListener("DOMContentLoaded", injectPendingClass, { once: true });

  document.addEventListener("DOMContentLoaded", function() {
    enforce().catch(function(err) {
      console.warn("Patch mode enforcement failed:", err);
      document.body.classList.remove("bl-patch-check-pending");
    });
  }, { once: true });

  return {
    BYPASS_ROLES: BYPASS_ROLES,
    isExemptPath: isExemptPath,
    fetchState: fetchState,
    getViewerAccess: getViewerAccess,
    enforce: enforce,
    assertCanSubmit: assertCanSubmit,
    updatePatchMode: updatePatchMode,
    formatExpectedUntil: formatExpectedUntil,
  };
})();
