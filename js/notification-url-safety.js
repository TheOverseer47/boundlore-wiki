// Central notification target_url safety policy (P5-B.1 / S+-02).
// No DOM writes, no fetches, no exceptions thrown.
(function() {
  var NOTIFICATION_URL_SAFETY_VERSION = "p5-b1";

  var UNSAFE_SCHEME_RE = /^\s*(javascript|data|vbscript|file|blob|ftp)\s*:/i;
  var ABSOLUTE_HTTP_RE = /^\s*https?:\/\//i;
  var RELATIVE_INTERNAL_RE = /^\s*\//;
  var PROTOCOL_RELATIVE_RE = /^\s*\/\//;
  var BACKSLASH_OBFUSCATION_RE = /^\s*\/\\/;
  var CONTROL_CHAR_RE = /[\u0000-\u001f\u007f]/;
  var PERCENT_ENCODING_RE = /%[0-9a-f]{2}/i;

  function toStringValue(value) {
    if (value == null) return "";
    return String(value);
  }

  function stripControlChars(value) {
    return value.replace(/[\u0000-\u001f\u007f]/g, "");
  }

  function collapseSchemeWhitespace(value) {
    return value.replace(/[\s\u0000-\u001f\u007f]+/g, "");
  }

  function tryDecodePercentEncoding(value) {
    if (!PERCENT_ENCODING_RE.test(value)) return value;
    try {
      return decodeURIComponent(value);
    } catch (err) {
      return value;
    }
  }

  function detectDangerousScheme(value) {
    var trimmed = value.trim();
    if (!trimmed) return false;

    var candidates = [trimmed, stripControlChars(trimmed), collapseSchemeWhitespace(trimmed)];
    var seen = {};
    for (var i = 0; i < candidates.length; i++) {
      var candidate = candidates[i];
      if (!candidate || seen[candidate]) continue;
      seen[candidate] = true;
      if (UNSAFE_SCHEME_RE.test(candidate)) return true;

      var decoded = tryDecodePercentEncoding(candidate);
      if (decoded !== candidate) {
        if (UNSAFE_SCHEME_RE.test(decoded)) return true;
        if (UNSAFE_SCHEME_RE.test(stripControlChars(decoded))) return true;
        if (UNSAFE_SCHEME_RE.test(collapseSchemeWhitespace(decoded))) return true;
      }
    }
    return false;
  }

  function hasBackslashObfuscation(value) {
    if (/^\s*https?:\\+/i.test(value)) return true;
    if (BACKSLASH_OBFUSCATION_RE.test(value)) return true;
    return false;
  }

  function normalizeNotificationTargetUrl(value, options) {
    options = options || {};
    var raw = toStringValue(value).trim();
    if (!raw) return "";

    var normalized = stripControlChars(raw).trim();
    if (options.allowAbsoluteHttp === false) {
      if (ABSOLUTE_HTTP_RE.test(normalized)) return "";
    }
    return normalized;
  }

  function classifyNotificationTargetUrl(value) {
    var raw = toStringValue(value);
    if (!raw.trim()) {
      return { kind: "empty", safe: true, reason: "empty" };
    }

    if (CONTROL_CHAR_RE.test(raw)) {
      return { kind: "unsafe", safe: false, reason: "control_characters" };
    }

    if (detectDangerousScheme(raw)) {
      return { kind: "unsafe", safe: false, reason: "unsafe_scheme" };
    }

    if (PROTOCOL_RELATIVE_RE.test(raw)) {
      return { kind: "unsafe", safe: false, reason: "protocol_relative" };
    }

    if (hasBackslashObfuscation(raw)) {
      return { kind: "unsafe", safe: false, reason: "backslash_obfuscation" };
    }

    var normalized = normalizeNotificationTargetUrl(raw);
    if (!normalized) {
      return { kind: "empty", safe: true, reason: "empty_after_normalize" };
    }

    if (RELATIVE_INTERNAL_RE.test(normalized) && !PROTOCOL_RELATIVE_RE.test(normalized) && !BACKSLASH_OBFUSCATION_RE.test(normalized)) {
      return { kind: "relative", safe: true, reason: "relative_internal" };
    }

    if (ABSOLUTE_HTTP_RE.test(normalized)) {
      return { kind: normalized.trim().toLowerCase().indexOf("https://") === 0 ? "https" : "http", safe: true, reason: "absolute_http" };
    }

    return { kind: "unsafe", safe: false, reason: "unsupported_format" };
  }

  function isSafeNotificationTargetUrl(value, options) {
    options = options || {};
    var classification = classifyNotificationTargetUrl(value);
    if (!classification.safe) return false;
    if (classification.kind === "http" || classification.kind === "https") {
      if (options.allowAbsoluteHttp === false) return false;
    }
    return true;
  }

  function sanitizeNotificationTargetUrl(value, options) {
    options = options || {};
    var fallback = options.fallback == null ? "#" : String(options.fallback);
    if (isSafeNotificationTargetUrl(value, options)) {
      var normalized = normalizeNotificationTargetUrl(value, options);
      return normalized || fallback;
    }
    return fallback;
  }

  function shouldAllowUnsafeNotificationUrl() {
    return false;
  }

  function getNotificationUrlSafetyDiagnostics() {
    return {
      version: NOTIFICATION_URL_SAFETY_VERSION,
      allowUnsafe: shouldAllowUnsafeNotificationUrl(),
      allowedSchemes: ["relative", "http", "https"],
      blockedSchemes: ["javascript", "data", "vbscript", "file", "blob", "ftp"],
      blockedPatterns: ["protocol_relative", "backslash_obfuscation", "control_characters"],
    };
  }

  window.BoundLoreNotificationUrlSafety = {
    NOTIFICATION_URL_SAFETY_VERSION: NOTIFICATION_URL_SAFETY_VERSION,
    normalizeNotificationTargetUrl: normalizeNotificationTargetUrl,
    isSafeNotificationTargetUrl: isSafeNotificationTargetUrl,
    sanitizeNotificationTargetUrl: sanitizeNotificationTargetUrl,
    classifyNotificationTargetUrl: classifyNotificationTargetUrl,
    shouldAllowUnsafeNotificationUrl: shouldAllowUnsafeNotificationUrl,
    getNotificationUrlSafetyDiagnostics: getNotificationUrlSafetyDiagnostics,
  };
})();
