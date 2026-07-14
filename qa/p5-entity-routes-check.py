#!/usr/bin/env python3
"""P5-E.9G.2 — Validate entity-routes.js slug and path rules (Python mirror, no Node)."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ROUTES = ROOT / "js" / "entity-routes.js"

ENTITY_SLUG_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
CANONICAL_PREFIX = "/wiki/post/"

VALID = [
    "ogre-mage",
    "smought",
    "staff-of-fire-2f316b0d",
    "swamplands-94dadc07",
    "swamplands-near-a-campfire-787bbd19",
]

INVALID = [
    "",
    "   ",
    "../",
    ".",
    "..",
    "ogre/mage",
    "ogre\\mage",
    "/ogre-mage/",
    "OGRE-MAGE",
    "ogre_mage",
    "ogre mage",
    "?slug=ogre-mage",
    "javascript:alert(1)",
    "https://example.com",
    "..%2f..%2fcss",
]


def normalize_entity_slug(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if "/" in trimmed or "\\" in trimmed:
        return None
    if trimmed in (".", ".."):
        return None
    if "?" in trimmed or "#" in trimmed:
        return None
    if re.search(r"[\u0000-\u001f\u007f]", trimmed):
        return None
    if re.match(r"^\s*[a-z][a-z0-9+.-]*:", trimmed, re.I):
        return None
    if trimmed != trimmed.lower():
        return None
    return trimmed


def is_valid_entity_slug(value: object) -> bool:
    norm = normalize_entity_slug(value)
    return norm is not None and bool(ENTITY_SLUG_RE.fullmatch(norm))


def build_canonical_entity_path(slug: object) -> str | None:
    norm = normalize_entity_slug(slug)
    if not norm or not ENTITY_SLUG_RE.fullmatch(norm):
        return None
    from urllib.parse import quote

    return f"{CANONICAL_PREFIX}{quote(norm, safe='')}/"


def build_entity_post_href(slug: str, query: dict[str, str] | None = None) -> str:
    path = build_canonical_entity_path(slug)
    if not path:
        return CANONICAL_PREFIX
    if not query:
        return path
    from urllib.parse import urlencode

    return path + "?" + urlencode(query)


def main() -> None:
    if not ROUTES.is_file():
        raise SystemExit("Missing js/entity-routes.js")

    text = ROUTES.read_text(encoding="utf-8")
    required = [
        "normalizeEntitySlug",
        "isValidEntitySlug",
        "buildCanonicalEntityPath",
        "buildLegacyEntityPath",
        "buildEntityPostHref",
        "ENTITY_SLUG_RE",
    ]
    missing = [name for name in required if name not in text]
    if missing:
        raise SystemExit(f"entity-routes.js missing symbols: {missing}")

    failures = 0
    for slug in VALID:
        if not is_valid_entity_slug(slug):
            failures += 1
            print(f"[p5-entity-routes-check] FAIL valid slug rejected: {slug}", file=sys.stderr)
            continue
        path = build_canonical_entity_path(slug)
        expected = f"/wiki/post/{slug}/"
        if path != expected:
            failures += 1
            print(f"[p5-entity-routes-check] FAIL path for {slug}: {path}", file=sys.stderr)
        else:
            print(f"[p5-entity-routes-check] PASS valid slug {slug}")

    for slug in INVALID:
        if is_valid_entity_slug(slug) or build_canonical_entity_path(slug):
            failures += 1
            print(f"[p5-entity-routes-check] FAIL invalid slug accepted: {slug!r}", file=sys.stderr)
        else:
            print(f"[p5-entity-routes-check] PASS rejected invalid slug {slug!r}")

    href = build_entity_post_href("ogre-mage", {"merged": "contribution"})
    if href != "/wiki/post/ogre-mage/?merged=contribution":
        failures += 1
        print("[p5-entity-routes-check] FAIL query append on href", file=sys.stderr)
    else:
        print("[p5-entity-routes-check] PASS query append on href")

    if failures:
        raise SystemExit(1)
    print(f"[p5-entity-routes-check] PASS: all {len(VALID) + len(INVALID) + 1} checks")


if __name__ == "__main__":
    main()
