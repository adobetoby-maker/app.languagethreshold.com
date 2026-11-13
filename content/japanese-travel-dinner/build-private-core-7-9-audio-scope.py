#!/usr/bin/env python3
"""Pin exact Japanese Dinner Core 7–9 speech text; never synthesize."""

import argparse
import hashlib
import json
import runpy
import unicodedata
from collections import defaultdict
from pathlib import Path


HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "private-core-7-9-audio-scope.json"
FILES = ("core-7-9-draft.json",)
VOICES = ("ja-JP-Chirp3-HD-Aoede", "ja-JP-Chirp3-HD-Charon")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def spoken(text):
    return "".join(unicodedata.normalize("NFC", text).split())


def build():
    runpy.run_path(str(HERE / "verify-private-core-1-9.py"))["main"]()
    sources = {}
    placements = defaultdict(list)
    ids = []
    for name in FILES:
        raw = (HERE / name).read_bytes()
        draft = json.loads(raw)
        sources[name] = sha(raw)
        if (draft["courseId"], draft["stageId"], draft["pairKey"], draft["locale"],
            draft["reviewed"], draft["registered"], draft["readyForLearner"], draft["audio"]) != (
                "travel-dinner", "travel-dinner", "Japanese:English", "ja-JP",
                False, False, False, "none"):
            raise ValueError(f"{name}: pair or release gate changed")
        for lesson in draft["lessons"]:
            lid = lesson["stableId"]
            ids.append(lid)
            if lesson["reviewed"] is not False:
                raise ValueError(f"{lid}: review gate changed")
            for index, card in enumerate(lesson["cards"], 1):
                placements[card["ja"]].append({"lessonId": lid, "surface": "card", "index": index})
            for index, turn in enumerate(lesson["reader"], 1):
                placements[turn["ja"]].append({"lessonId": lid, "surface": "reader", "index": index})
            for surface in ("opening", "closure"):
                placements[lesson["speaking"][surface]].append(
                    {"lessonId": lid, "surface": f"speaking-{surface}"})
            hear = lesson["modes"]["hear"]
            model = lesson["cards"][hear["sourceCard"] - 1]["ja"]
            placements[model].append({"lessonId": lid, "surface": "hear-mode-model"})
    expected = [f"travel-dinner:{n}:ja-en" for n in range(7, 10)]
    if ids != expected:
        raise ValueError("Core audio lesson IDs or order changed")
    texts = []
    for display in sorted(placements):
        speech = spoken(display)
        if not speech:
            raise ValueError("Empty spoken Japanese text")
        texts.append({"displayText": display, "spokenText": speech,
                      "textSHA256": sha(speech.encode("utf-8")),
                      "placements": placements[display]})
    if len({row["textSHA256"] for row in texts}) != len(texts):
        raise ValueError("Different display texts collapse to one speech text")
    return {"schema": 1, "courseId": "travel-dinner", "stageId": "travel-dinner",
            "pairKey": "Japanese:English", "locale": "ja-JP", "voices": list(VOICES),
            "sourceSHA256": sources, "lessonIds": expected,
            "placements": sum(len(row["placements"]) for row in texts),
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
        raise SystemExit("Private Core audio scope is stale; inspect source before regenerating")
    print(f"Japanese Dinner Core 7–9 audio: {result['uniqueTexts']} texts, "
          f"{result['proposedClips']} clips, "
          f"{result['submittedCharacters']} submitted characters; unregistered")


if __name__ == "__main__":
    main()
