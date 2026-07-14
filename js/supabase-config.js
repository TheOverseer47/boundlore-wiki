// BoundLore Supabase client config — staging runtime for local verification (P5-E.9E.4B).
// Public publishable client key only. No service_role. No secrets from .env.

var BOUNDLORE_EXPECTED_PROJECT_REF = "jzzgoiwfbuwiiyvwgwri";
var BOUNDLORE_FORBIDDEN_PROJECT_REF = "ohkoojpzmptdfyowdgog";

var SUPABASE_URL = "https://jzzgoiwfbuwiiyvwgwri.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_dxDq-w-YAvQeTFrPpg4JZw_t43gA58G";

function boundLoreExtractProjectRef(url) {
  var match = String(url || "").match(/https:\/\/([a-z0-9]+)\.supabase\.co/i);
  return match ? match[1] : "";
}

window.BOUNDLORE_SUPABASE_PROJECT_REF = boundLoreExtractProjectRef(SUPABASE_URL);
window.BOUNDLORE_SUPABASE_CONFIG_STATUS = "UNKNOWN";
window.BOUNDLORE_SUPABASE_RUNTIME_MODE = "staging_verification";

if (window.BOUNDLORE_SUPABASE_PROJECT_REF === BOUNDLORE_FORBIDDEN_PROJECT_REF) {
  window.BOUNDLORE_SUPABASE_CONFIG_STATUS = "BLOCKED_LEGACY_REF";
  console.error("[BoundLore] Supabase config BLOCKED: legacy project ref is forbidden for local verification.");
} else if (window.BOUNDLORE_SUPABASE_PROJECT_REF === BOUNDLORE_EXPECTED_PROJECT_REF) {
  window.BOUNDLORE_SUPABASE_CONFIG_STATUS = "STAGING_REF_VERIFIED";
} else {
  window.BOUNDLORE_SUPABASE_CONFIG_STATUS = "BLOCKED_UNEXPECTED_REF";
  console.error("[BoundLore] Supabase config BLOCKED: unexpected Supabase project ref.");
}

if (
  window.BOUNDLORE_SUPABASE_CONFIG_STATUS === "STAGING_REF_VERIFIED" &&
  typeof window.supabase !== "undefined" &&
  window.supabase &&
  typeof window.supabase.createClient === "function"
) {
  window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else if (window.BOUNDLORE_SUPABASE_CONFIG_STATUS !== "STAGING_REF_VERIFIED") {
  window.supabase = null;
}

if (
  window.BOUNDLORE_SUPABASE_CONFIG_STATUS !== "STAGING_REF_VERIFIED" &&
  typeof console !== "undefined" &&
  console.warn
) {
  console.warn("[BoundLore] Supabase client not initialized — config status:", window.BOUNDLORE_SUPABASE_CONFIG_STATUS);
}

if (typeof window.BoundLoreErrorReporter !== "undefined" && window.BoundLoreErrorReporter.captureMessage) {
  try {
    window.BoundLoreErrorReporter.captureMessage("supabase_config_status", {
      feature: "supabase_config",
      gate_code: "P5-E.9E.4B",
      reason_code: window.BOUNDLORE_SUPABASE_CONFIG_STATUS,
      blocked: window.BOUNDLORE_SUPABASE_CONFIG_STATUS !== "STAGING_REF_VERIFIED"
    });
  } catch (configReportErr) {
    // fail-open: config must not break page load
  }
}

(function loadWikiPatchModeGuard() {
  if (document.querySelector('script[data-bl-patch-mode="1"]')) return;
  var script = document.createElement("script");
  script.src = "/js/patch-mode.js?v=1";
  script.defer = true;
  script.setAttribute("data-bl-patch-mode", "1");
  document.head.appendChild(script);
})();
