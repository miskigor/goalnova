#!/usr/bin/env python3
"""Merge scripts/i18n-benefits/{locale}.json into messages/{locale}.json under `benefits`."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MESSAGES = ROOT / "messages"
PATCH = Path(__file__).resolve().parent / "i18n-benefits"
LOCALES = ["en", "hr", "bs", "sr", "de", "es", "fr", "it", "pt", "nl", "tr", "ar"]


def main() -> int:
    for loc in LOCALES:
        p = PATCH / f"{loc}.json"
        if not p.is_file():
            print(f"Missing patch {p}", file=sys.stderr)
            return 1
        benefits = json.loads(p.read_text(encoding="utf-8"))
        target = MESSAGES / f"{loc}.json"
        data = json.loads(target.read_text(encoding="utf-8"))
        data["benefits"] = benefits
        meta = data.get("metadata")
        if isinstance(meta, dict) and "benefitsTitle" in meta:
            del meta["benefitsTitle"]
        target.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("patched", target.name)
    return 0


if __name__ == "__main__":
    sys.exit(main())
