#!/usr/bin/env python3
"""Pin exact Master 17 speech not already present in private Dinner scopes."""

import argparse
import hashlib
import json
import runpy
from collections import defaultdict
from pathlib import Path


DIR = Path(__file__).resolve().parent
OUTPUT = DIR / "private-master-17-audio-scope.json"
SOURCE = DIR / "master-17-private-draft.json"
PRIOR = tuple(DIR / "previous-audio-scopes" / f"{name}.json" for name in
              ("foundation", "core-1-3", "core-4-9", "core-10-12")) + (
                  DIR / "private-owner-delta-audio-scope.json", DIR / "private-core-13-audio-scope.json", DIR / "private-core-14-audio-scope.json", DIR / "private-core-15-audio-scope.json", DIR / "private-core-16-audio-scope.json", DIR / "private-core-17-audio-scope.json", DIR / "private-core-18-audio-scope.json", DIR / "private-core-19-audio-scope.json", DIR / "private-core-20-audio-scope.json", DIR / "private-core-21-audio-scope.json",
    DIR / "private-core-22-audio-scope.json", DIR / "private-core-23-audio-scope.json", DIR / "private-core-24-audio-scope.json", DIR / "private-core-25-audio-scope.json", DIR / "private-core-26-audio-scope.json", DIR / "private-core-27-audio-scope.json", DIR / "private-core-28-audio-scope.json", DIR / "private-core-29-audio-scope.json", DIR / "private-core-30-audio-scope.json", DIR / "private-master-1-audio-scope.json", DIR / "private-master-2-audio-scope.json", DIR / "private-master-3-audio-scope.json", DIR / "private-master-4-audio-scope.json", DIR / "private-master-5-audio-scope.json", DIR / "private-master-6-audio-scope.json", DIR / "private-master-7-audio-scope.json", DIR / "private-master-8-audio-scope.json", DIR / "private-master-9-audio-scope.json", DIR / "private-master-10-audio-scope.json", DIR / "private-master-11-audio-scope.json", DIR / "private-master-12-audio-scope.json", DIR / "private-master-13-audio-scope.json", DIR / "private-master-14-audio-scope.json", DIR / "private-master-15-audio-scope.json", DIR / "private-master-16-audio-scope.json",)
VOICES = ("fr-FR-Chirp3-HD-Aoede", "fr-FR-Chirp3-HD-Charon")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    runpy.run_path(str(DIR / "verify-private-master-17.py"))
    raw = SOURCE.read_bytes()
    batch = json.loads(raw)
    lesson = batch["lessons"][0]
    previous = set()
    previous_hashes = {}
    for path in PRIOR:
        scope_raw = path.read_bytes()
        scope = json.loads(scope_raw)
        if (scope["pairKey"], scope["locale"], scope["registered"]) != (
                "French:English", "fr-FR", False):
            raise ValueError(f"Previous scope identity changed: {path.name}")
        previous_hashes[path.name] = sha(scope_raw)
        previous.update(row["spokenText"] for row in scope["texts"])
    placements = defaultdict(list)
    lid = lesson["stableId"]
    for index, card in enumerate(lesson["cards"], 1):
        placements[card["fr"]].append({"lessonId": lid, "surface": "card", "index": index})
    for index, turn in enumerate(lesson["reader"], 1):
        placements[turn["fr"]].append({"lessonId": lid, "surface": "reader", "index": index})
    for surface in ("opening", "closure"):
        placements[lesson["speaking"][surface]].append(
            {"lessonId": lid, "surface": f"speaking-{surface}"})
    texts = [{"spokenText": text, "textSHA256": sha(text.encode("utf-8")),
              "placements": placements[text]} for text in sorted(set(placements) - previous)]
    if not texts or len({r["textSHA256"] for r in texts}) != len(texts):
        raise ValueError("Master 17 audio scope empty or duplicated")
    return {"schema": 1, "courseId": "travel-dinner", "stageId": "master-travel-dinner",
            "pairKey": "French:English", "locale": "fr-FR", "voices": list(VOICES),
            "sourceSHA256": {SOURCE.name: sha(raw)},
            "previousScopeSHA256": previous_hashes,
            "lessonIds": [lid], "placements": sum(len(r["placements"]) for r in texts),
            "uniqueTexts": len(texts), "proposedClips": len(texts) * 2,
            "submittedCharacters": sum(len(r["spokenText"]) for r in texts) * 2,
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
        raise SystemExit("Master 17 audio scope stale; inspect source before regenerating")
    print(json.dumps({key: result[key] for key in
                      ("uniqueTexts", "proposedClips", "submittedCharacters")}))


if __name__ == "__main__":
    main()
