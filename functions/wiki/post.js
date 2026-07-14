// P5-E.9G.3 — Cloudflare Pages Function: legacy /wiki/post/?slug= handler only.
// Scope: /wiki/post and /wiki/post/ — passes through all other assets via context.next().
import {
  buildCanonicalEntityPath,
  isValidEntitySlug,
} from "../_entity-slug-policy.js";

const NO_STORE = { "Cache-Control": "no-store" };
const ROBOTS_NOINDEX = { "X-Robots-Tag": "noindex" };
const ROBOTS_NOINDEX_NOFOLLOW = { "X-Robots-Tag": "noindex, nofollow" };
const POST_404_ASSET = "/wiki/post/404.html";
const ALLOWED_METHODS = new Set(["GET", "HEAD"]);

function mergeHeaders(base, extra) {
  const headers = new Headers(base || {});
  Object.entries(extra || {}).forEach(function(entry) {
    headers.set(entry[0], entry[1]);
  });
  return headers;
}

function methodNotAllowed() {
  return new Response(null, {
    status: 405,
    headers: mergeHeaders(NO_STORE, { Allow: "GET, HEAD" }),
  });
}

function redirect307(targetUrl) {
  return new Response(null, {
    status: 307,
    headers: {
      Location: targetUrl,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}

async function loadNotFoundBody(context, method) {
  const assets = context.env && context.env.ASSETS;
  if (!assets || typeof assets.fetch !== "function") {
    return { ok: false, body: null };
  }
  try {
    const assetResp = await assets.fetch(new URL(POST_404_ASSET, context.request.url).toString(), {
      method: "GET",
    });
    if (!assetResp.ok) {
      return { ok: false, body: null };
    }
    const body = method === "HEAD" ? null : await assetResp.text();
    return { ok: true, body: body || "" };
  } catch (_err) {
    return { ok: false, body: null };
  }
}

async function notFoundResponse(context, method, statusCode) {
  const code = statusCode === 400 ? 400 : 404;
  const loaded = await loadNotFoundBody(context, method);
  if (!loaded.ok) {
    return new Response(null, {
      status: 503,
      headers: mergeHeaders(NO_STORE, ROBOTS_NOINDEX_NOFOLLOW),
    });
  }
  return new Response(loaded.body, {
    status: code,
    headers: mergeHeaders(NO_STORE, mergeHeaders(ROBOTS_NOINDEX_NOFOLLOW, {
      "Content-Type": "text/html; charset=utf-8",
    })),
  });
}

function isLegacyPostBasePath(pathname) {
  const pathNorm = String(pathname || "")
    .replace(/\/index\.html$/i, "")
    .replace(/\/+$/, "") || "/";
  return pathNorm === "/wiki/post";
}

async function canonicalAssetExists(context, canonicalPath) {
  const assets = context.env && context.env.ASSETS;
  if (!assets || typeof assets.fetch !== "function") {
    return null;
  }
  const assetPath = canonicalPath.replace(/\/+$/, "") + "/index.html";
  try {
    const probe = await assets.fetch(new URL(assetPath, context.request.url).toString(), {
      method: "HEAD",
    });
    return probe.ok;
  } catch (_err) {
    return null;
  }
}

export async function onRequest(context) {
  const request = context.request;
  const method = request.method;

  if (!ALLOWED_METHODS.has(method)) {
    return methodNotAllowed();
  }

  const url = new URL(request.url);
  if (!isLegacyPostBasePath(url.pathname)) {
    return context.next();
  }

  const slugValues = url.searchParams.getAll("slug");
  const paramKeys = Array.from(url.searchParams.keys());

  if (paramKeys.length === 0) {
    return context.next();
  }

  if (paramKeys.length !== 1 || paramKeys[0] !== "slug" || slugValues.length !== 1) {
    return notFoundResponse(context, method, 404);
  }

  const rawSlug = slugValues[0];
  if (!isValidEntitySlug(rawSlug)) {
    return notFoundResponse(context, method, 400);
  }

  const canonicalPath = buildCanonicalEntityPath(rawSlug);
  if (!canonicalPath) {
    return notFoundResponse(context, method, 400);
  }

  const exists = await canonicalAssetExists(context, canonicalPath);
  if (exists === null) {
    return new Response(null, {
      status: 503,
      headers: mergeHeaders(NO_STORE, ROBOTS_NOINDEX_NOFOLLOW),
    });
  }
  if (!exists) {
    return notFoundResponse(context, method, 404);
  }

  const targetUrl = new URL(canonicalPath, request.url).toString();
  return redirect307(targetUrl);
}
