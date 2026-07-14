#!/usr/bin/env python3
"""P5-E.9G.2 — Static search recall regression (Python fallback when Node unavailable)."""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def fail(msg: str) -> None:
    print(f"[p5-search-recall-static-check] FAIL: {msg}", file=sys.stderr)
    raise SystemExit(1)


def ok(msg: str) -> None:
    print(f"[p5-search-recall-static-check] PASS: {msg}")


def main() -> None:
    utils = (ROOT / "js" / "search-recall-utils.js").read_text(encoding="utf-8")
    search = (ROOT / "js" / "search.js").read_text(encoding="utf-8")
    corpus = json.loads((ROOT / "qa" / "fixtures" / "p5-search-recall-corpus.json").read_text(encoding="utf-8"))
    queries = json.loads((ROOT / "qa" / "fixtures" / "p5-search-recall-queries.json").read_text(encoding="utf-8"))

    if corpus.get("schema") != "SearchRecallCorpus":
        fail("corpus schema invalid")
    ok("corpus schema valid")

    if not isinstance(queries.get("expect_hits"), list) or not queries["expect_hits"]:
        fail("expect_hits fixture empty")
    ok(f"queries fixture loaded ({len(queries['expect_hits'])} expect_hits)")

    if "getCanonicalResultUrl" not in utils:
        fail("getCanonicalResultUrl missing")
    if 'return "/wiki/post/" + slug + "/"' not in utils and "buildCanonicalEntityPath" not in utils:
        fail("canonical path builder missing in recall utils")
    ok("search-recall-utils canonical URL helpers present")

    if "CSR_FALLBACK_PREFIX" not in utils or "/wiki/post/?slug=" not in utils:
        fail("CSR fallback compatibility constant missing")
    ok("CSR fallback compatibility preserved")

    if "buildPostPath" not in search:
        fail("buildPostPath missing in search.js")
    if "/wiki/post/" not in search or "encodeURIComponent" not in search:
        fail("search.js path-based URL generation missing")
    if re.search(r'["\']/wiki/post/\?slug=', search):
        fail("search.js regressed to query-param result URLs")
    ok("search.js uses path-based post URLs")

    public_records = [r for r in corpus.get("records", []) if r.get("status") == "published"]
    if not public_records:
        fail("no published records in corpus")
    for rec in public_records[:5]:
        slug = rec.get("canonical_slug") or rec.get("slug")
        url = rec.get("url") or ""
        if slug and url and not url.startswith(f"/wiki/post/{slug}/"):
            fail(f"corpus record url not canonical: {slug} -> {url}")
    ok("corpus published records use canonical path URLs")

    print("[p5-search-recall-static-check] All checks passed")


if __name__ == "__main__":
    main()
