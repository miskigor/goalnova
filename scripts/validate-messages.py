#!/usr/bin/env python3
"""
Validate PitchRusch messages/*.json:
  UTF-8 (no BOM), strict duplicate-key rejection, JSON parse, nav.adminPanel in en + hr.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def _no_dup_pairs(pairs: list[tuple[str, object]]) -> dict[str, object]:
    out: dict[str, object] = {}
    for k, v in pairs:
        if k in out:
            raise ValueError(f"duplicate key {k!r}")
        out[k] = v
    return out


def load_json(path: Path) -> dict[str, object]:
    raw = path.read_text(encoding="utf-8")
    if raw.startswith("\ufeff"):
        raise ValueError("UTF-8 BOM is not allowed (remove BOM)")
    data = json.loads(raw, object_pairs_hook=_no_dup_pairs)
    if not isinstance(data, dict):
        raise ValueError("root must be a JSON object")
    return data


def main() -> int:
    root = Path(__file__).resolve().parent.parent / "messages"
    if not root.is_dir():
        print("messages/ not found", file=sys.stderr)
        return 1

    failed = False
    for p in sorted(root.glob("*.json")):
        try:
            load_json(p)
            print("OK", p.name)
        except Exception as e:
            print(f"FAIL {p.name}: {e}", file=sys.stderr)
            failed = True

    if failed:
        return 1

    en = load_json(root / "en.json")
    hr = load_json(root / "hr.json")
    for label, data in [("en.json", en), ("hr.json", hr)]:
        nav = data.get("nav")
        if not isinstance(nav, dict):
            print(f"FAIL {label}: missing or invalid nav object", file=sys.stderr)
            return 1
        ap = nav.get("adminPanel")
        if ap != "Admin":
            print(
                f"FAIL {label}: nav.adminPanel must be 'Admin', got {ap!r}",
                file=sys.stderr,
            )
            return 1

        upload_ns = data.get("upload")
        if not isinstance(upload_ns, dict):
            print(f"FAIL {label}: missing or invalid upload object", file=sys.stderr)
            return 1
        for req in (
            "uploadWizardStep1Status",
            "uploadWizardStep2Status",
            "uploadChooseVideo",
            "uploadMaxSize",
            "uploadNoFileSelected",
            "uploadTitle",
            "uploadSubtitle",
            "uploadContinue",
            "uploadBack",
            "uploadPublishVideo",
            "uploadStatusProcessingMerge",
            "fileTooLargeSimple",
        ):
            if req not in upload_ns or not isinstance(upload_ns[req], str):
                print(
                    f"FAIL {label}: upload.{req} must be a non-empty string key",
                    file=sys.stderr,
                )
                return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
