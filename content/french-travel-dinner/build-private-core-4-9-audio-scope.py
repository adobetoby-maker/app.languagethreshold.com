#!/usr/bin/env python3
"""Pin exact French Dinner Core 4–9 speech text; never synthesize."""

import argparse
import hashlib
import json
import runpy
from collections import defaultdict
from pathlib import Path


DIR = Path(__file__).resolve().parent
FILES = ("core-4-6-draft.json", "core-7-9-draft.json")
OUTPUT = DIR / "private-core-4-9-audio-scope.json"
VOICES = ("fr-FR-Chirp3-HD-Aoede", "fr-FR-Chirp3-HD-Charon")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build():
    for name in ("verify-private-core-4-6.py", "verify-private-core-7-9.py"):
        runpy.run_path(str(DIR / name))["main"]()
    placements = defaultdict(list)
    sources = {}
    ids = []
    for name in FILES:
        raw = (DIR / name).read_bytes()
        draft = json.loads(raw)
        sources[name] = sha(raw)
        if (draft["courseId"], draft["stageId"], draft["pairKey"], draft["locale"],
            draft["reviewed"], draft["registered"], draft["readyForLearner"], draft["audio"]) != (
                "travel-dinner", "travel-dinner", "French:English", "fr-FR",
                False, False, False, "none"):
            raise ValueError(f"{name}: wrong pair or release gate")
        for lesson in draft["lessons"]:
            lid = lesson["stableId"]
            ids.append(lid)
            if lesson["reviewed"] is not False:
                raise ValueError(f"{lid}: review gate changed")
            for index, card in enumerate(lesson["cards"], 1):
                placements[card["fr"]].append({"lessonId": lid, "surface": "card", "index": index})
            for index, turn in enumerate(lesson["reader"], 1):
                placements[turn["fr"]].append({"lessonId": lid, "surface": "reader", "index": index})
            for surface in ("opening", "closure"):
                placements[lesson["speaking"][surface]].append(
                    {"lessonId": lid, "surface": f"speaking-{surface}"})
    expected = [f"travel-dinner:{n}:fr-en" for n in range(4, 10)]
    if ids != expected:
        raise ValueError("Core audio lesson IDs or order changed")
    texts = [{"spokenText": text, "textSHA256": sha(text.encode("utf-8")),
              "placements": placements[text]} for text in sorted(placements)]
    if len({row["textSHA256"] for row in texts}) != len(texts):
        raise ValueError("Duplicate hash for distinct text")
    return {"schema": 1, "courseId": "travel-dinner", "stageId": "travel-dinner",
            "pairKey": "French:English", "locale": "fr-FR",
            "scope": "Core 4–9 cards, Reader turns, and fixed speaking lines",
            "voices": list(VOICES), "sourceSHA256": sources,
            "lessonIds": expected, "placements": sum(map(len, placements.values())),
            "uniqueTexts": len(texts), "proposedClips": len(texts) * len(VOICES),
            "submittedCharacters": sum(len(row["spokenText"]) for row in texts) * len(VOICES),
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
        raise SystemExit("Private Core 4–9 audio scope is stale; inspect source before regenerating")
    print(f"French Dinner Core 4–9 audio: {result['uniqueTexts']} texts, "
          f"{result['proposedClips']} proposed clips, "
          f"{result['submittedCharacters']} submitted characters; unregistered")


if __name__ == "__main__":
    main()
