/*!
 * P5-E.10B-S08-A3 — privacy-safe frontend error capture (client).
 * Same-origin POST to /api/client-errors only. No secrets. No PII.
 * Redaction rules mirrored in functions/_client-error-privacy.js.
 */
(function () {
  "use strict";

  if (typeof window === "undefined") return;
  if (window.__boundloreErrorCaptureInstalled) return;
  window.__boundloreErrorCaptureInstalled = true;

  var SCHEMA_VERSION = 1;
  var RELEASE = "s08-a3-v1";
  var ENDPOINT = "/api/client-errors";
  var MAX_EVENTS = 5;
  var MIN_INTERVAL_MS = 1500;
  var MAX_MESSAGE = 300;
  var MAX_ERROR_NAME = 80;
  var MAX_PATH = 300;
  var MAX_RELEASE = 100;

  var EVENT_ERROR = "error";
  var EVENT_REJECTION = "unhandledrejection";

  var sentCount = 0;
  var lastSentAt = 0;
  var seenKeys = Object.create(null);
  var reporting = false;

  var EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  var BEARER_RE = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
  var JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
  var AGE_SECRET_RE = /\bAGE-SECRET-KEY-[A-Z0-9]+\b/gi;
  var LONG_KEY_RE = /\b(?:sb_publishable_|sb_secret_|eyJ)[A-Za-z0-9_\-.]{20,}\b/g;
  var API_KEYISH_RE = /\b(?:api[_-]?key|apikey|service_role|access_token|refresh_token|token|secret|password|passwd|session)\s*[:=]\s*["']?[^\s"'&]{8,}/gi;
  var AUTH_HEADER_RE = /\bAuthorization\s*[:=]\s*["']?[^"'&\s]+/gi;
  var COOKIE_ASSIGN_RE = /\b(?:Cookie|Set-Cookie)\s*[:=]\s*[^;\n]+/gi;
  var QUERY_OR_HASH_RE = /[?#][^\s]*/g;
  var URL_WITH_CREDS_RE = /[a-z][a-z0-9+.-]*:\/\/[^/\s]*:[^/\s]*@[^/\s]+/gi;

  function clampString(value, max) {
    var text = value == null ? "" : String(value);
    if (text.length <= max) return text;
    return text.slice(0, max);
  }

  function redactText(input) {
    var text = input == null ? "" : String(input);
    var i;
    for (i = 0; i < 3; i += 1) {
      var before = text;
      text = text.replace(EMAIL_RE, "[EMAIL_REDACTED]");
      text = text.replace(BEARER_RE, "[TOKEN_REDACTED]");
      text = text.replace(JWT_RE, "[TOKEN_REDACTED]");
      text = text.replace(AGE_SECRET_RE, "[TOKEN_REDACTED]");
      text = text.replace(LONG_KEY_RE, "[TOKEN_REDACTED]");
      text = text.replace(API_KEYISH_RE, "[REDACTED]");
      text = text.replace(AUTH_HEADER_RE, "[REDACTED]");
      text = text.replace(COOKIE_ASSIGN_RE, "[REDACTED]");
      text = text.replace(URL_WITH_CREDS_RE, "[REDACTED]");
      text = text.replace(QUERY_OR_HASH_RE, "");
      if (text === before) break;
    }
    return text;
  }

  function routePathOnly() {
    var path = "/";
    try {
      path = String(location.pathname || "/");
    } catch (_err) {
      path = "/";
    }
    path = path.split("?")[0].split("#")[0];
    if (!path) path = "/";
    return clampString(redactText(path), MAX_PATH);
  }

  function scriptPathOnly(raw) {
    if (raw == null || raw === "") return "";
    var value = String(raw).trim();
    if (!value) return "";
    try {
      if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
        var url = new URL(value, location.href);
        if (url.origin !== location.origin) return "external-script";
        value = url.pathname || "";
      }
    } catch (_err) {
      return "external-script";
    }
    value = value.split("?")[0].split("#")[0];
    value = value.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
    if (value && value.charAt(0) !== "/") {
      value = "/" + value.replace(/^(\.\/)+/, "");
    }
    return clampString(redactText(value), MAX_PATH);
  }

  function deriveRejection(reason) {
    if (reason && typeof reason === "object" && typeof reason.name === "string") {
      return {
        errorName: clampString(redactText(reason.name || "Error"), MAX_ERROR_NAME),
        sanitizedMessage: clampString(
          redactText(typeof reason.message === "string" ? reason.message : "Unhandled rejection"),
          MAX_MESSAGE
        ),
      };
    }
    if (typeof reason === "string") {
      return {
        errorName: "NonErrorRejection",
        sanitizedMessage: clampString(redactText(reason), MAX_MESSAGE),
      };
    }
    var typeName = "NonErrorRejection";
    if (reason === null) typeName = "NullRejection";
    else if (typeof reason !== "undefined") typeName = "NonErrorRejection";
    return {
      errorName: typeName,
      sanitizedMessage: "Unhandled rejection",
    };
  }

  function dedupeKey(event) {
    return [
      event.eventType,
      event.errorName,
      event.sanitizedMessage,
      event.routePath,
      event.scriptPath,
      String(event.line || 0),
      String(event.column || 0),
    ].join("|");
  }

  function buildEvent(partial) {
    return {
      schemaVersion: SCHEMA_VERSION,
      eventType: partial.eventType,
      errorName: clampString(redactText(partial.errorName || "Error"), MAX_ERROR_NAME),
      sanitizedMessage: clampString(redactText(partial.sanitizedMessage || ""), MAX_MESSAGE),
      routePath: routePathOnly(),
      scriptPath: scriptPathOnly(partial.scriptPath || ""),
      line: typeof partial.line === "number" && partial.line >= 0 ? Math.floor(partial.line) : 0,
      column: typeof partial.column === "number" && partial.column >= 0 ? Math.floor(partial.column) : 0,
      release: clampString(RELEASE, MAX_RELEASE),
      occurredAt: new Date().toISOString(),
      sourceCategory: "frontend",
    };
  }

  function safeSend(event) {
    if (reporting) return;
    if (sentCount >= MAX_EVENTS) return;
    var now = Date.now();
    if (now - lastSentAt < MIN_INTERVAL_MS) return;
    var key = dedupeKey(event);
    if (seenKeys[key]) return;
    seenKeys[key] = 1;

    reporting = true;
    try {
      // Never touch cookies / storage / credentials.
      var body = JSON.stringify(event);
      if (body.length > 4096) {
        reporting = false;
        return;
      }
      sentCount += 1;
      lastSentAt = now;
      if (typeof fetch !== "function") {
        reporting = false;
        return;
      }
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
        credentials: "omit",
        referrerPolicy: "no-referrer",
        cache: "no-store",
        keepalive: true,
      }).catch(function () {
        /* swallow — never recurse */
      });
    } catch (_err) {
      /* never rethrow into capture */
    } finally {
      reporting = false;
    }
  }

  function onWindowError(event) {
    if (reporting) return;
    try {
      var err = event && event.error;
      var name = "Error";
      var message = "";
      if (err && typeof err === "object") {
        name = typeof err.name === "string" ? err.name : "Error";
        message = typeof err.message === "string" ? err.message : "";
      } else if (event && typeof event.message === "string") {
        message = event.message;
      }
      // Do not include stack.
      safeSend(
        buildEvent({
          eventType: EVENT_ERROR,
          errorName: name,
          sanitizedMessage: message,
          scriptPath: event && event.filename ? event.filename : "",
          line: event && typeof event.lineno === "number" ? event.lineno : 0,
          column: event && typeof event.colno === "number" ? event.colno : 0,
        })
      );
    } catch (_err) {
      /* swallow */
    }
  }

  function onUnhandledRejection(event) {
    if (reporting) return;
    try {
      var derived = deriveRejection(event && event.reason);
      safeSend(
        buildEvent({
          eventType: EVENT_REJECTION,
          errorName: derived.errorName,
          sanitizedMessage: derived.sanitizedMessage,
          scriptPath: "",
          line: 0,
          column: 0,
        })
      );
    } catch (_err) {
      /* swallow */
    }
  }

  window.addEventListener("error", onWindowError);
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  // Test/introspection hooks (no network).
  window.BoundLoreErrorCapture = {
    RELEASE: RELEASE,
    ENDPOINT: ENDPOINT,
    MAX_EVENTS: MAX_EVENTS,
    redactText: redactText,
    routePathOnly: routePathOnly,
    scriptPathOnly: scriptPathOnly,
    deriveRejection: deriveRejection,
    buildEvent: buildEvent,
    _safeSend: safeSend,
    _resetForTests: function () {
      sentCount = 0;
      lastSentAt = 0;
      seenKeys = Object.create(null);
      reporting = false;
    },
    _stats: function () {
      return { sentCount: sentCount, lastSentAt: lastSentAt };
    },
  };
})();
