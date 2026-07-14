#!/usr/bin/env python3
"""Write gitignored raw MCP export JSON for P5-E.9F.6 (stdin only)."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "qa" / "fixtures" / ".real-content-export-raw.json"


def main() -> None:
    data = json.load(sys.stdin)
    if not isinstance(data, list):
        raise SystemExit("Expected JSON array")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"[persist_9f6_mcp_export] Wrote {len(data)} rows to {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
