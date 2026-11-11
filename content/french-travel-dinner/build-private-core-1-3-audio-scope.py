#!/usr/bin/env python3
"""Pin exact French Dinner Core 1–3 text for private HD synthesis."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path


DIR = Path(__file__).resolve().parent
SOURCE = DIR / "core-1-3-draft.json"
OUTPUT = DIR / "private-core-1-3-audio-scope.json"
VOICES = ("fr-FR-Chirp3-HD-Aoede", "fr-FR-Chirp3-HD-Charon")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    raw = SOURCE.read_bytes()
    draft = json.loads(raw)
    if (draft["pairKey"], draft["locale"], draft["reviewed"], draft["registered"],
            draft["readyForLearner"], draft["audio"]) != (
            "French:English", "fr-FR", False, False, False, "none"):
        raise ValueError("Core draft pair or release gate changed")
    expected = [f"travel-dinner:{n}:fr-en" for n in range(1, 4)]
    if [lesson["stableId"] for lesson in draft["lessons"]] != expected:
        raise ValueError("Core lesson identity changed")
    placements = defaultdict(list)
    for lesson in draft["lessons"]:
        lesson_id = lesson["stableId"]
        if lesson["reviewed"] is not False:
            raise ValueError(f"{lesson_id}: review gate changed")
        for index, card in enumerate(lesson["cards"], 1):
            placements[card["fr"]].append({"lessonId": lesson_id, "surface": "card", "index": index})
        for index, turn in enumerate(lesson["reader"], 1):
            placements[turn["fr"]].append({"lessonId": lesson_id, "surface": "reader", "index": index})
        for surface in ("opening", "closure"):
            placements[lesson["speaking"][surface]].append(
                {"lessonId": lesson_id, "surface": f"speaking-{surface}"})
    texts = [{"spokenText": text, "textSHA256": sha(text.encode("utf-8")),
              "placements": placements[text]} for text in sorted(placements)]
    return {"schema": 1, "courseId": "travel-dinner", "stageId": "travel-dinner",
            "pairKey": "French:English", "locale": "fr-FR",
            "scope": "Core 1–3 cards, Reader turns, and fixed speaking lines",
            "voices": list(VOICES), "sourceSHA256": {SOURCE.name: sha(raw)},
            "lessonIds": expected, "placements": sum(map(len, placements.values())),
            "uniqueTexts": len(texts), "proposedClips": len(texts) * len(VOICES),
            "submittedCharacters": sum(len(row["spokenText"]) for row in texts) * len(VOICES),
            "texts": texts, "recordingsBundled": False, "listeningReviewed": False,
            "registered": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    result = build()
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.write:
        OUTPUT.write_text(encoded)
    elif not OUTPUT.exists() or OUTPUT.read_text() != encoded:
        raise SystemExit("Private Core audio scope is stale; inspect source before regenerating")
    print(f"French Dinner Core 1–3 audio: {result['uniqueTexts']} texts, "
          f"{result['proposedClips']} proposed clips, "
          f"{result['submittedCharacters']} submitted characters; unregistered")


if __name__ == "__main__":
    main()
