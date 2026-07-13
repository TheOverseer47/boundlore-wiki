// BoundLore local error reporter stub (P5-E.9C.2).
// Provider-neutral, in-memory only. No network, no Supabase, no localStorage.
(function() {
  var REPORTER_VERSION = "p5-e9c2";
  var MAX_BUFFER = 50;
  var MAX_MESSAGE_LEN = 500;
  var MAX_STACK_LEN = 300;
  var MAX_CONTEXT_STR_LEN = 120;

  var enabled = true;
  var buffer = [];
  var eventSeq = 0;
  var handlersRegistered = false;
  var previousOnError = null;
  var previousOnUnhandledRejection = null;

  var CONTEXT_ALLOWLIST = {
    feature: true,
    gate_code: true,
    error_class: true,
    route: true,
    status_code: true,
    blocked: true,
    deferred: true,
    reason_code: true,
    count: true,
    source_type: true,
    had_dangerous_tags: true,
    stripped: true,
    context: true
  };

  var EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  var JWT_RE = /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;
  var BEARER_RE = /\bBearer\s+[A-Za-z0-9._~+/=-]{8,}\b/gi;
  var API_KEY_RE = /\b(?:api[_-]?key|supabase[_-]?key|service[_-]?role|anon[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{8,}/gi;
  var GENERIC_TOKEN_RE = /\b(?:token|password|secret|dsn)\s*[:=]\s*['"]?[A-Za-z0-9._~+/=-]{12,}/gi;
  var HTML_TAG_RE = /<[^>]+>/g;

  function safeRun(fn, fallback) {
    try {
      return fn();
    } catch (err) {
      return fallback;
    }
  }

  function getPathname() {
    return safeRun(function() {
      return window.location && window.location.pathname ? String(window.location.pathname) : "";
    }, "");
  }

  function redactEmails(value) {
    return String(value == null ? "" : value).replace(EMAIL_RE, "[redacted-email]");
  }

  function redactTokens(value) {
    var out = String(value == null ? "" : value);
    out = out.replace(JWT_RE, "[redacted-token]");
    out = out.replace(BEARER_RE, "[redacted-token]");
    out = out.replace(API_KEY_RE, "[redacted-token]");
    out = out.replace(GENERIC_TOKEN_RE, "[redacted-token]");
    return out;
  }

  function stripQueryString(value) {
    var raw = String(value == null ? "" : value);
    var q = raw.indexOf("?");
    if (q === -1) return raw;
    return raw.slice(0, q) + "?[redacted-query]";
  }

  function stripHtml(value) {
    return String(value == null ? "" : value).replace(HTML_TAG_RE, "");
  }

  function truncateString(value, maxLen) {
    var raw = String(value == null ? "" : value);
    if (raw.length <= maxLen) return raw;
    return raw.slice(0, maxLen) + "…";
  }

  function sanitizeMessage(value) {
    var out = stripHtml(redactTokens(redactEmails(String(value == null ? "" : value))));
    return truncateString(out, MAX_MESSAGE_LEN);
  }

  function sanitizeSource(value) {
    if (!value) return null;
    return truncateString(stripQueryString(redactTokens(redactEmails(String(value)))), MAX_CONTEXT_STR_LEN);
  }

  function summarizeStack(error) {
    if (!error || !error.stack) return null;
    var lines = String(error.stack).split("\n").slice(0, 3);
    return truncateString(redactTokens(redactEmails(lines.join(" | "))), MAX_STACK_LEN);
  }

  function sanitizeContextValue(key, value) {
    if (value == null) return value;
    if (typeof value === "boolean" || typeof value === "number") return value;
    if (typeof value === "string") {
      if (key === "route") return truncateString(stripQueryString(value), MAX_CONTEXT_STR_LEN);
      return truncateString(sanitizeMessage(value), MAX_CONTEXT_STR_LEN);
    }
    return null;
  }

  function sanitizeContext(context) {
    var input = context && typeof context === "object" ? context : {};
    var out = {};
    Object.keys(input).forEach(function(key) {
      if (!CONTEXT_ALLOWLIST[key]) return;
      var val = sanitizeContextValue(key, input[key]);
      if (val !== null && val !== undefined) out[key] = val;
    });
    return out;
  }

  function nextEventId() {
    eventSeq += 1;
    return "bl-err-" + eventSeq;
  }

  function buildEvent(fields) {
    return {
      id: nextEventId(),
      timestamp: new Date().toISOString(),
      level: fields.level || "error",
      category: fields.category || "manual",
      code: fields.code || "E-00",
      message: sanitizeMessage(fields.message || "Unknown error"),
      path: getPathname(),
      source: sanitizeSource(fields.source),
      line: fields.line != null ? fields.line : null,
      column: fields.column != null ? fields.column : null,
      stack_summary: fields.stack_summary != null ? fields.stack_summary : null,
      context: sanitizeContext(fields.context),
      provider_sent: false
    };
  }

  function pushEvent(event) {
    if (!enabled || !event) return null;
    safeRun(function() {
      buffer.push(event);
      while (buffer.length > MAX_BUFFER) buffer.shift();
    });
    return event;
  }

  function mirrorToConsole(level, message) {
    safeRun(function() {
      var fn = level === "warning" ? console.warn : console.error;
      if (typeof fn === "function") fn.call(console, "[BoundLoreErrorReporter]", message);
    });
  }

  function captureError(error, context) {
    return safeRun(function() {
      var err = error;
      var msg = "Unknown error";
      var stackSummary = null;
      var source = null;
      if (err && typeof err === "object") {
        msg = err.message || String(err);
        stackSummary = summarizeStack(err);
        source = err.fileName || err.sourceURL || null;
      } else if (err != null) {
        msg = String(err);
      }
      var event = buildEvent({
        level: "error",
        category: "manual",
        code: (context && context.error_class) || "E-01",
        message: msg,
        source: source,
        stack_summary: stackSummary,
        context: context
      });
      pushEvent(event);
      mirrorToConsole("error", event.message);
      return event;
    }, null);
  }

  function captureMessage(message, context) {
    return safeRun(function() {
      var event = buildEvent({
        level: (context && context.level) || "info",
        category: (context && context.category) || "manual",
        code: (context && context.code) || "E-00",
        message: message,
        context: context
      });
      pushEvent(event);
      return event;
    }, null);
  }

  function captureSecurityEvent(code, context) {
    return safeRun(function() {
      var event = buildEvent({
        level: "security",
        category: "sanitizer",
        code: code || "E-07",
        message: "Security event: " + String(code || "E-07"),
        context: context
      });
      pushEvent(event);
      return event;
    }, null);
  }

  function captureReleaseGateEvent(code, context) {
    return safeRun(function() {
      var event = buildEvent({
        level: "warning",
        category: "release_gate",
        code: code || "E-03",
        message: "Release gate event: " + String(code || "E-03"),
        context: context
      });
      pushEvent(event);
      return event;
    }, null);
  }

  function captureRuntimeFromEvent(ev) {
    var msg = ev && ev.message ? ev.message : (ev && ev.error && ev.error.message ? ev.error.message : "Runtime error");
    var event = buildEvent({
      level: "error",
      category: "runtime",
      code: "E-01",
      message: msg,
      source: ev && (ev.filename || ev.source) ? (ev.filename || ev.source) : null,
      line: ev && ev.lineno != null ? ev.lineno : null,
      column: ev && ev.colno != null ? ev.colno : null,
      stack_summary: ev && ev.error ? summarizeStack(ev.error) : null,
      context: {}
    });
    pushEvent(event);
    mirrorToConsole("error", event.message);
    return event;
  }

  function capturePromiseFromEvent(ev) {
    var reason = ev && ev.reason ? ev.reason : "Unhandled promise rejection";
    var msg = reason && reason.message ? reason.message : String(reason);
    var event = buildEvent({
      level: "error",
      category: "promise",
      code: "E-02",
      message: msg,
      stack_summary: reason && reason.stack ? summarizeStack(reason) : null,
      context: {}
    });
    pushEvent(event);
    mirrorToConsole("error", event.message);
    return event;
  }

  function handleGlobalError(ev) {
    safeRun(function() {
      captureRuntimeFromEvent(ev);
    });
    if (typeof previousOnError === "function") {
      safeRun(function() {
        return previousOnError.call(
          window,
          ev.message,
          ev.filename,
          ev.lineno,
          ev.colno,
          ev.error
        );
      });
    }
  }

  function handleGlobalRejection(ev) {
    safeRun(function() {
      capturePromiseFromEvent(ev);
    });
    if (typeof previousOnUnhandledRejection === "function") {
      safeRun(function() {
        return previousOnUnhandledRejection.call(window, ev);
      });
    }
  }

  function registerGlobalHandlers() {
    if (handlersRegistered || window.__blErrorReporterHandlersRegistered) {
      handlersRegistered = true;
      return;
    }
    handlersRegistered = true;
    window.__blErrorReporterHandlersRegistered = true;

    previousOnError = window.onerror;
    previousOnUnhandledRejection = window.onunhandledrejection;

    window.addEventListener("error", handleGlobalError, true);
    window.addEventListener("unhandledrejection", handleGlobalRejection);
  }

  function getBufferedEvents() {
    return buffer.map(function(ev) {
      return Object.assign({}, ev, { context: Object.assign({}, ev.context) });
    });
  }

  function clearBufferedEvents() {
    buffer = [];
  }

  function setEnabled(value) {
    enabled = value !== false;
  }

  function isEnabled() {
    return enabled === true;
  }

  function getDiagnostics() {
    return {
      version: REPORTER_VERSION,
      enabled: enabled,
      bufferSize: buffer.length,
      maxBuffer: MAX_BUFFER,
      handlersRegistered: handlersRegistered || !!window.__blErrorReporterHandlersRegistered,
      providerSent: false
    };
  }

  window.BoundLoreErrorReporter = {
    REPORTER_VERSION: REPORTER_VERSION,
    captureError: captureError,
    captureMessage: captureMessage,
    captureSecurityEvent: captureSecurityEvent,
    captureReleaseGateEvent: captureReleaseGateEvent,
    getBufferedEvents: getBufferedEvents,
    clearBufferedEvents: clearBufferedEvents,
    setEnabled: setEnabled,
    isEnabled: isEnabled,
    getDiagnostics: getDiagnostics,
    _test: {
      sanitizeMessage: sanitizeMessage,
      sanitizeContext: sanitizeContext,
      redactEmails: redactEmails,
      redactTokens: redactTokens,
      stripQueryString: stripQueryString,
      MAX_BUFFER: MAX_BUFFER
    }
  };

  registerGlobalHandlers();
})();
