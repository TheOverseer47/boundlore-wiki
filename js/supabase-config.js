const SUPABASE_URL = "https://ohkoojpzmptdfyowdgog.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Po4dUZEiDNDVuskKQhcKtQ_pvczMfhJ";

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(function loadWikiPatchModeGuard() {
  if (document.querySelector('script[data-bl-patch-mode="1"]')) return;
  var script = document.createElement("script");
  script.src = "/js/patch-mode.js?v=1";
  script.defer = true;
  script.setAttribute("data-bl-patch-mode", "1");
  document.head.appendChild(script);
})();
