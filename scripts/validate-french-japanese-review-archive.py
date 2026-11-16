#!/usr/bin/env python3
"""Verify inert French/Japanese lesson snapshots copied from private branches."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ARCHIVE = ROOT / "content" / "review-archive" / "french-japanese-2026-11-15"


def main() -> None:
    manifest = json.loads((ARCHIVE / "manifest.json").read_text())
    assert manifest["reviewed"] is False
    assert manifest["learnerRegistered"] is False
    assert manifest["audioRegistered"] is False
    assert manifest["progressEnabled"] is False
    assert manifest["scoringEnabled"] is False
    seen = set()
    for item in manifest["files"]:
        name = item["path"]
        assert name not in seen and not name.startswith("/") and ".." not in Path(name).parts
        seen.add(name)
        path = ARCHIVE / name
        data = path.read_bytes()
        assert hashlib.sha256(data).hexdigest() == item["sha256"], name
        json.loads(data)
    actual = {str(path.relative_to(ARCHIVE)) for path in ARCHIVE.rglob("*.json")}
    assert actual == seen | {"manifest.json"}, sorted(actual ^ (seen | {"manifest.json"}))
    print(f"PASS: {len(seen)} inert source snapshots; hashes and JSON valid")


if __name__ == "__main__":
    main()
