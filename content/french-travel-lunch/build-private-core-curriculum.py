#!/usr/bin/env python3
"""Derive the exact French→English Lunch Core curriculum from reviewed-false drafts."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = [ROOT / f"content/french-travel-lunch/core-{start}-{start + 4}-draft.json"
           for start in range(1, 31, 5)]
DESTINATION = ROOT / "src/data/french-travel-lunch-core.json"


def build():
    lessons = []
    source_hashes = {}
    for source in SOURCES:
        raw = source.read_bytes()
        draft = json.loads(raw)
        if (draft["stageId"], draft["pairKey"], draft["reviewed"],
                draft["registered"], draft["readyForLearner"]) != (
                    "core-travel-lunch", "French:English", False, False, False):
            raise ValueError(f"Unexpected pair or release state: {source}")
        source_hashes[str(source.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
        for lesson in draft["lessons"]:
            n = lesson["n"]
            if lesson["stableId"] != f"core-travel-lunch:{n}:fr-en" or lesson["reviewed"] is not False:
                raise ValueError(f"Unexpected lesson identity or review state: {source}/{n}")
            lessons.append({
                "n": n,
                "stableId": lesson["stableId"],
                "title": lesson["title"],
                "objective": lesson["objective"],
                "focus": lesson["focus"],
                "scene": lesson["scene"],
                "words": [{"es": card["fr"], "en": card["en"], "kind": card["kind"],
                           **({"note": card["note"]} if "note" in card else {})}
                          for card in lesson["cards"]],
                "speaking": lesson["speaking"],
                "reader": lesson["reader"],
                "modes": lesson["modes"],
            })
    if [lesson["n"] for lesson in lessons] != list(range(1, 31)):
        raise ValueError("French Lunch Core must contain contiguous lessons 1–30")
    return {"version": 1, "module": "travel-lunch", "language": "French",
            "nativeLanguage": "English", "reviewed": False, "registered": False,
            "sourceHashes": source_hashes, "headline": "French Lunch Core 30",
            "threshold": "Order, discuss and resolve a full lunch in French with English support.",
            "lessons": lessons}


if __name__ == "__main__":
    generated = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--write" in sys.argv:
        DESTINATION.write_text(generated)
        print(f"Wrote {DESTINATION.relative_to(ROOT)}")
    elif DESTINATION.read_text() != generated:
        raise SystemExit("French Lunch Core curriculum is out of date; rerun with --write")
    else:
        print("French Lunch Core curriculum matches all six source drafts")
