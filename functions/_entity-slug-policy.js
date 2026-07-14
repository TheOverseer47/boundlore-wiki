// P5-E.9G.3 — Shared slug policy for Pages Functions (parity: js/entity-routes.js)
export const ENTITY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeEntitySlug(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.indexOf("/") >= 0 || trimmed.indexOf("\\") >= 0) return null;
  if (trimmed === "." || trimmed === "..") return null;
  if (trimmed.indexOf("?") >= 0 || trimmed.indexOf("#") >= 0) return null;
  if (/[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  if (/^\s*[a-z][a-z0-9+.-]*:/i.test(trimmed)) return null;
  if (trimmed !== trimmed.toLowerCase()) return null;
  return trimmed;
}

export function isValidEntitySlug(value) {
  const norm = normalizeEntitySlug(value);
  return norm !== null && ENTITY_SLUG_RE.test(norm);
}

export function buildCanonicalEntityPath(slug) {
  const norm = normalizeEntitySlug(slug);
  if (!norm || !ENTITY_SLUG_RE.test(norm)) return null;
  return "/wiki/post/" + encodeURIComponent(norm) + "/";
}
