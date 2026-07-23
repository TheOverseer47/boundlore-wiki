// P5-E.10B-S08-A3 — shared privacy helpers for client-error capture (Pages Functions).
// Keep redaction markers and limits aligned with js/error-reporter.js.

export const SCHEMA_VERSION = 1;
export const RELEASE_FALLBACK = "s08-a3-v1";
export const MAX_BODY_BYTES = 4096;
export const MAX_MESSAGE = 300;
export const MAX_ERROR_NAME = 80;
export const MAX_PATH = 300;
export const MAX_RELEASE = 100;
export const MAX_LINE_COL = 1000000;

export const EVENT_TYPES = Object.freeze({
  ERROR: "error",
  UNHANDLED_REJECTION: "unhandledrejection",
});

export const ALLOWED_FIELDS = Object.freeze([
  "schemaVersion",
  "eventType",
  "errorName",
  "sanitizedMessage",
  "routePath",
  "scriptPath",
  "line",
  "column",
  "release",
  "occurredAt",
  "sourceCategory",
]);

const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const BEARER_RE = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const JWT_RE = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const AGE_SECRET_RE = /\bAGE-SECRET-KEY-[A-Z0-9]+\b/gi;
const LONG_KEY_RE = /\b(?:sb_publishable_|sb_secret_|eyJ)[A-Za-z0-9_\-.]{20,}\b/g;
const API_KEYISH_RE = /\b(?:api[_-]?key|apikey|service_role|access_token|refresh_token|token|secret|password|passwd|session)\s*[:=]\s*["']?[^\s"'&]{8,}/gi;
const AUTH_HEADER_RE = /\bAuthorization\s*[:=]\s*["']?[^"'&\s]+/gi;
const COOKIE_ASSIGN_RE = /\b(?:Cookie|Set-Cookie)\s*[:=]\s*[^;\n]+/gi;
const QUERY_OR_HASH_RE = /[?#][^\s]*/g;
const URL_WITH_CREDS_RE = /[a-z][a-z0-9+.-]*:\/\/[^/\s]*:[^/\s]*@[^/\s]+/gi;

export function clampString(value, max) {
  const text = value == null ? "" : String(value);
  if (text.length <= max) return text;
  return text.slice(0, max);
}

export function redactText(input) {
  let text = input == null ? "" : String(input);
  // Apply repeatedly so nested leftovers cannot survive a single pass.
  for (let i = 0; i < 3; i += 1) {
    const before = text;
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

export function sanitizeRoutePath(pathname) {
  let path = pathname == null ? "" : String(pathname);
  path = path.split("?")[0].split("#")[0];
  path = path.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
  if (!path.startsWith("/")) {
    path = "/" + path.replace(/^\/+/, "");
  }
  path = path.replace(/\/{2,}/g, "/");
  return clampString(redactText(path), MAX_PATH);
}

export function sanitizeScriptPath(raw) {
  if (raw == null || raw === "") return "";
  let value = String(raw).trim();
  if (!value) return "";
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      const url = new URL(value);
      if (typeof location !== "undefined" && location.origin && url.origin !== location.origin) {
        return "external-script";
      }
      value = url.pathname || "";
    }
  } catch (_err) {
    return "external-script";
  }
  value = value.split("?")[0].split("#")[0];
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
  if (!value.startsWith("/")) {
    // Relative same-origin paths are accepted as pathnames.
    value = "/" + value.replace(/^(\.\/)+/, "");
  }
  return clampString(redactText(value), MAX_PATH);
}

export function sanitizeScriptPathForOrigin(raw, requestOrigin) {
  if (raw == null || raw === "") return "";
  let value = String(raw).trim();
  if (!value) return "";
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      const url = new URL(value);
      if (requestOrigin && url.origin !== requestOrigin) {
        return "external-script";
      }
      value = url.pathname || "";
    }
  } catch (_err) {
    return "external-script";
  }
  value = value.split("?")[0].split("#")[0];
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i, "");
  if (!value.startsWith("/")) {
    value = "/" + value.replace(/^(\.\/)+/, "");
  }
  return clampString(redactText(value), MAX_PATH);
}

function isNonNegativeInt(value, max) {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (value < 0 || value > max) return false;
  return Number.isInteger(value);
}

export function isValidIsoTimestamp(value) {
  if (typeof value !== "string" || !value) return false;
  if (value.length > 40) return false;
  const ms = Date.parse(value);
  return Number.isFinite(ms);
}

export function buildSafeEvent(raw, requestOrigin) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "not_object" };
  }

  const out = {};
  for (const key of ALLOWED_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    out[key] = raw[key];
  }

  // Reject if any unknown own enumerable key was present.
  for (const key of Object.keys(raw)) {
    if (ALLOWED_FIELDS.indexOf(key) === -1) {
      return { ok: false, reason: "unknown_field" };
    }
  }

  if (out.schemaVersion !== SCHEMA_VERSION) {
    return { ok: false, reason: "schema" };
  }
  if (out.eventType !== EVENT_TYPES.ERROR && out.eventType !== EVENT_TYPES.UNHANDLED_REJECTION) {
    return { ok: false, reason: "eventType" };
  }

  out.errorName = clampString(redactText(out.errorName == null ? "Error" : out.errorName), MAX_ERROR_NAME);
  out.sanitizedMessage = clampString(
    redactText(out.sanitizedMessage == null ? "" : out.sanitizedMessage),
    MAX_MESSAGE
  );
  out.routePath = sanitizeRoutePath(out.routePath == null ? "/" : out.routePath);
  out.scriptPath = sanitizeScriptPathForOrigin(out.scriptPath == null ? "" : out.scriptPath, requestOrigin);
  out.release = clampString(redactText(out.release == null ? RELEASE_FALLBACK : out.release), MAX_RELEASE);

  if (!isNonNegativeInt(out.line, MAX_LINE_COL)) out.line = 0;
  if (!isNonNegativeInt(out.column, MAX_LINE_COL)) out.column = 0;
  if (!isValidIsoTimestamp(out.occurredAt)) {
    return { ok: false, reason: "occurredAt" };
  }

  if (Object.prototype.hasOwnProperty.call(out, "sourceCategory")) {
    const cat = clampString(redactText(out.sourceCategory), 40);
    if (cat !== "frontend") {
      // Only allow the known privacy-safe category; otherwise drop.
      delete out.sourceCategory;
    } else {
      out.sourceCategory = cat;
    }
  }

  return { ok: true, event: out };
}

export function toLogRecord(event) {
  return {
    source: "boundlore-client-error",
    schemaVersion: event.schemaVersion,
    eventType: event.eventType,
    errorName: event.errorName,
    message: event.sanitizedMessage,
    routePath: event.routePath,
    scriptPath: event.scriptPath,
    line: event.line,
    column: event.column,
    release: event.release,
    occurredAt: event.occurredAt,
  };
}
