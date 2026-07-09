// Test data marking and pre-release helpers (no automatic deletion).

window.BoundLoreTestData = (function() {
  const ORIGIN_TEST = "test";
  const ORIGIN_LIVE = "live";
  const RESET_CONFIRM_TOKEN = "BOUNDLORE_PRE_RELEASE_RESET";

  function isPreReleaseEnvironment() {
    try {
      if (window.BOUNDLORE_FLAGS && window.BOUNDLORE_FLAGS.preRelease === true) return true;
      const host = String(window.location.hostname || "").toLowerCase();
      return host === "localhost" || host === "127.0.0.1";
    } catch (err) {
      return false;
    }
  }

  function shouldMarkAsTestData() {
    return isPreReleaseEnvironment();
  }

  function markMeta(meta) {
    const out = meta && typeof meta === "object" ? Object.assign({}, meta) : {};
    if (shouldMarkAsTestData()) {
      out.content_origin = ORIGIN_TEST;
    }
    return out;
  }

  function isTestMeta(meta) {
    return !!(meta && meta.content_origin === ORIGIN_TEST);
  }

  function isTestPostContent(html) {
    const meta = parseMetaFromHtml(html);
    return isTestMeta(meta);
  }

  function parseMetaFromHtml(html) {
    const match = String(html || "").match(/<!--BLMETA\s+([\s\S]*?)\s*-->/i);
    if (!match) return {};
    try {
      const parsed = JSON.parse(match[1]);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch (err) {
      return {};
    }
  }

  function getOriginLabel(meta) {
    return isTestMeta(meta) ? "Test data" : "Live data";
  }

  function getResetInstructions() {
    return {
      token: RESET_CONFIRM_TOKEN,
      sqlFile: "supabase/pre_release_test_data_reset.sql",
      summary: "Run manually in Supabase SQL editor before game release. Requires confirmation token inside the SQL file.",
    };
  }

  return {
    ORIGIN_TEST: ORIGIN_TEST,
    ORIGIN_LIVE: ORIGIN_LIVE,
    RESET_CONFIRM_TOKEN: RESET_CONFIRM_TOKEN,
    isPreReleaseEnvironment: isPreReleaseEnvironment,
    shouldMarkAsTestData: shouldMarkAsTestData,
    markMeta: markMeta,
    isTestMeta: isTestMeta,
    isTestPostContent: isTestPostContent,
    getOriginLabel: getOriginLabel,
    getResetInstructions: getResetInstructions,
  };
})();
