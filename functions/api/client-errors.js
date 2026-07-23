// P5-E.10B-S08-A3 — same-origin client error intake (privacy-safe, no storage).
import {
  MAX_BODY_BYTES,
  buildSafeEvent,
  toLogRecord,
} from "../_client-error-privacy.js";

const NO_STORE = { "Cache-Control": "no-store" };

function jsonReject(status, headers) {
  return new Response(null, {
    status,
    headers: Object.assign({ "Cache-Control": "no-store" }, headers || {}),
  });
}

function requestOrigin(request) {
  try {
    return new URL(request.url).origin;
  } catch (_err) {
    return "";
  }
}

function originAllowed(request) {
  const expected = requestOrigin(request);
  if (!expected) return false;
  const origin = request.headers.get("Origin");
  if (origin) {
    return origin === expected;
  }
  // Same-origin fetch may omit Origin in some browsers for non-CORS same-origin POST.
  // Require Sec-Fetch-Site=same-origin when Origin is absent.
  const site = request.headers.get("Sec-Fetch-Site");
  return site === "same-origin";
}

function secFetchSiteAllowed(request) {
  const site = request.headers.get("Sec-Fetch-Site");
  if (site == null || site === "") return true;
  return site === "same-origin";
}

export async function onRequest(context) {
  const request = context.request;
  const method = String(request.method || "").toUpperCase();

  if (method !== "POST") {
    return jsonReject(405, { Allow: "POST" });
  }

  const contentType = String(request.headers.get("Content-Type") || "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return jsonReject(415);
  }

  if (!originAllowed(request) || !secFetchSiteAllowed(request)) {
    return jsonReject(403);
  }

  const declaredLength = request.headers.get("Content-Length");
  if (declaredLength != null && declaredLength !== "") {
    const n = Number(declaredLength);
    if (!Number.isFinite(n) || n < 0 || n > MAX_BODY_BYTES) {
      return jsonReject(413);
    }
  }

  let bodyText;
  try {
    bodyText = await request.text();
  } catch (_err) {
    return jsonReject(400);
  }

  if (typeof bodyText !== "string") {
    return jsonReject(400);
  }
  // UTF-8 byte length approximation via TextEncoder when available.
  let byteLength = bodyText.length;
  try {
    byteLength = new TextEncoder().encode(bodyText).length;
  } catch (_err) {
    byteLength = bodyText.length;
  }
  if (byteLength > MAX_BODY_BYTES) {
    return jsonReject(413);
  }

  let parsed;
  try {
    parsed = JSON.parse(bodyText);
  } catch (_err) {
    return jsonReject(400);
  }

  const built = buildSafeEvent(parsed, requestOrigin(request));
  if (!built.ok) {
    return jsonReject(400);
  }

  // Structured log only — never raw request/headers/body.
  console.log(JSON.stringify(toLogRecord(built.event)));

  return new Response(null, {
    status: 204,
    headers: NO_STORE,
  });
}
