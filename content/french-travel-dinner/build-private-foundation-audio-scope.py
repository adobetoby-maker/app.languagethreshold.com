#!/usr/bin/env python3
"""Pin exact French Dinner Foundation 1–10 text before private HD synthesis."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path


DIR = Path(__file__).resolve().parent
FILES = ("foundation-1-3-draft.json", "foundation-4-6-draft.json",
         "foundation-7-10-draft.json")
OUTPUT = DIR / "private-foundation-audio-scope.json"
VOICES = ("fr-FR-Chirp3-HD-Aoede", "fr-FR-Chirp3-HD-Charon")


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build():
    sources = {}
    placements = defaultdict(list)
    ids = []
    for filename in FILES:
        raw = (DIR / filename).read_bytes()
        draft = json.loads(raw)
        sources[filename] = digest(raw)
        if (draft["pairKey"] != "French:English" or draft["locale"] != "fr-FR" or
                draft["reviewed"] is not False or draft["registered"] is not False or
                draft["readyForLearner"] is not False or draft["audio"] != "none"):
            raise ValueError(f"{filename}: pair or release gate changed")
        for lesson in draft["lessons"]:
            lesson_id = lesson["stableId"]
            ids.append(lesson_id)
            if lesson["reviewed"] is not False:
                raise ValueError(f"{lesson_id}: review gate changed")
            for index, card in enumerate(lesson["cards"], 1):
                placements[card["fr"]].append({"lessonId": lesson_id, "surface": "card", "index": index})
            for index, turn in enumerate(lesson["reader"], 1):
                placements[turn["fr"]].append({"lessonId": lesson_id, "surface": "reader", "index": index})
            for surface in ("opening", "closure"):
                placements[lesson["speaking"][surface]].append(
                    {"lessonId": lesson_id, "surface": f"speaking-{surface}"})
    expected = [f"foundation-travel-dinner:{n}:fr-en" for n in range(1, 11)]
    if ids != expected:
        raise ValueError("Foundation lesson identities are missing, repeated, or reordered")
    texts = [{"spokenText": text, "textSHA256": digest(text.encode("utf-8")),
              "placements": placements[text]} for text in sorted(placements)]
    return {"schema": 1, "courseId": "travel-dinner",
            "pairKey": "French:English", "locale": "fr-FR",
            "scope": "Foundation cards, Reader turns, and fixed speaking lines",
            "voices": list(VOICES), "sourceSHA256": sources,
            "lessonIds": expected, "placements": sum(map(len, placements.values())),
            "uniqueTexts": len(texts), "proposedClips": len(texts) * len(VOICES),
            "submittedCharacters": sum(len(row["spokenText"]) for row in texts) * len(VOICES),
            "texts": texts, "recordingsGenerated": False, "listeningReviewed": False,
            "registered": False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Regenerate private scope after source change")
    args = parser.parse_args()
    result = build()
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    if args.write:
        OUTPUT.write_text(encoded)
    elif not OUTPUT.exists() or OUTPUT.read_text() != encoded:
        raise SystemExit("Private audio scope is stale; inspect source before regenerating")
    print(f"French Dinner Foundation audio: {result['uniqueTexts']} texts, "
          f"{result['proposedClips']} proposed clips, "
          f"{result['submittedCharacters']} submitted characters; unregistered")


if __name__ == "__main__":
    main()
