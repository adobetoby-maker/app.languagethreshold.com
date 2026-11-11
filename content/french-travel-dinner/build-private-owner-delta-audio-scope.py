#!/usr/bin/env python3
"""Pin exact French Dinner owner-review speech missing from earlier private scopes."""

import argparse
import hashlib
import json
import runpy
from collections import defaultdict
from pathlib import Path


DIR = Path(__file__).resolve().parent
FILES = ("foundation-1-3-draft.json", "foundation-4-6-draft.json",
         "foundation-7-10-draft.json", "core-1-3-draft.json",
         "core-4-6-draft.json", "core-7-9-draft.json",
         "core-10-draft.json", "core-11-12-draft.json")
PRIOR = ("foundation.json", "core-1-3.json", "core-4-9.json", "core-10-12.json")
OUTPUT = DIR / "private-owner-delta-audio-scope.json"
VOICES = ("fr-FR-Chirp3-HD-Aoede", "fr-FR-Chirp3-HD-Charon")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    for name in ("verify-private-foundation-1-10.py", "verify-private-core-1-12.py"):
        runpy.run_path(str(DIR / name))["main"]()
    previous = set()
    previous_hashes = {}
    for name in PRIOR:
        raw = (DIR / "previous-audio-scopes" / name).read_bytes()
        previous_hashes[name] = sha(raw)
        scope = json.loads(raw)
        if (scope["pairKey"], scope["locale"], scope["registered"]) != (
                "French:English", "fr-FR", False):
            raise ValueError(f"Previous scope identity changed: {name}")
        previous.update(row["spokenText"] for row in scope["texts"])
    placements = defaultdict(list)
    sources = {}
    ids = []
    for name in FILES:
        raw = (DIR / name).read_bytes()
        draft = json.loads(raw)
        sources[name] = sha(raw)
        if (draft["courseId"], draft["pairKey"], draft["locale"],
            draft["reviewed"], draft["registered"], draft["readyForLearner"],
            draft["audio"]) != ("travel-dinner", "French:English", "fr-FR",
                                False, False, False, "none"):
            raise ValueError(f"Draft identity or gate changed: {name}")
        for lesson in draft["lessons"]:
            lid = lesson["stableId"]
            ids.append(lid)
            if lesson["reviewed"] is not False:
                raise ValueError(f"Review gate changed: {lid}")
            for index, card in enumerate(lesson["cards"], 1):
                placements[card["fr"]].append({"lessonId": lid, "surface": "card", "index": index})
            for index, turn in enumerate(lesson["reader"], 1):
                placements[turn["fr"]].append({"lessonId": lid, "surface": "reader", "index": index})
            for surface in ("opening", "closure"):
                placements[lesson["speaking"][surface]].append(
                    {"lessonId": lid, "surface": f"speaking-{surface}"})
    expected = ([f"foundation-travel-dinner:{n}:fr-en" for n in range(1, 11)]
                + [f"travel-dinner:{n}:fr-en" for n in range(1, 13)])
    if ids != expected:
        raise ValueError("Stage-local lesson IDs or order changed")
    texts = [{"spokenText": text, "textSHA256": sha(text.encode("utf-8")),
              "placements": placements[text]} for text in sorted(set(placements) - previous)]
    if len(texts) != 20:
        raise ValueError(f"Expected 20 exact owner-review delta texts, found {len(texts)}")
    if len({row["textSHA256"] for row in texts}) != len(texts):
        raise ValueError("Text hash collision")
    return {"schema": 1, "courseId": "travel-dinner", "stageId": "travel-dinner",
            "pairKey": "French:English", "locale": "fr-FR",
            "scope": "Owner-review Foundation 1–10/Core 1–12 card, Reader and fixed speaking delta",
            "voices": list(VOICES), "sourceSHA256": sources,
            "previousScopeSHA256": previous_hashes,
            "lessonIds": expected, "placements": sum(len(row["placements"]) for row in texts),
            "uniqueTexts": len(texts), "proposedClips": len(texts) * 2,
            "submittedCharacters": sum(len(row["spokenText"]) for row in texts) * 2,
            "texts": texts, "recordingsBundled": False,
            "listeningReviewed": False, "registered": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    result = build()
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.write:
        OUTPUT.write_text(encoded)
    elif not OUTPUT.exists() or OUTPUT.read_text() != encoded:
        raise SystemExit("Owner audio scope is stale; inspect source before regenerating")
    print(json.dumps({key: result[key] for key in (
        "uniqueTexts", "proposedClips", "submittedCharacters", "placements")}))


if __name__ == "__main__":
    main()
