#!/usr/bin/env python3
"""Pin exact Master 11 speech text, excluding earlier Dinner recordings."""

import argparse
import hashlib
import json
import runpy
import unicodedata
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "private-master-11-audio-scope.json"
VOICES = ["ja-JP-Chirp3-HD-Aoede", "ja-JP-Chirp3-HD-Charon"]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def spoken(text):
    return "".join(unicodedata.normalize("NFC", text).split())


def build():
    runpy.run_path(str(HERE / "verify-private-master-11.py"))["main"]()
    draft_bytes = (HERE / "master-11-draft.json").read_bytes()
    lesson = json.loads(draft_bytes)["lessons"][0]
    placements = defaultdict(list)
    for index, card in enumerate(lesson["cards"], 1):
        placements[card["ja"]].append({"lessonId": lesson["stableId"], "surface": "card", "index": index})
    for index, turn in enumerate(lesson["reader"], 1):
        placements[turn["ja"]].append({"lessonId": lesson["stableId"], "surface": "reader", "index": index})
    for surface in ("opening", "closure"):
        placements[lesson["speaking"][surface]].append(
            {"lessonId": lesson["stableId"], "surface": f"speaking-{surface}"})
    hear = lesson["modes"]["hear"]
    model = lesson["cards"][hear["sourceCard"] - 1]["ja"]
    placements[model].append({"lessonId": lesson["stableId"], "surface": "hear-mode-model"})
    prior_names = runpy.run_path(str(HERE / "build-private-core-30-audio-scope.py"))["PREVIOUS"] + (
        "private-core-30-audio-scope.json",)
    prior = [HERE / name for name in prior_names] + [HERE / "private-master-1-audio-scope.json", HERE / "private-master-2-audio-scope.json", HERE / "private-master-3-audio-scope.json", HERE / "private-master-4-audio-scope.json", HERE / "private-master-5-audio-scope.json", HERE / "private-master-6-audio-scope.json", HERE / "private-master-7-audio-scope.json", HERE / "private-master-8-audio-scope.json", HERE / "private-master-9-audio-scope.json", HERE / "private-master-10-audio-scope.json"]
    old_texts = set()
    prior_hashes = {}
    for path in prior:
        raw = path.read_bytes()
        scope = json.loads(raw)
        assert scope["pairKey"] == "Japanese:English" and scope["locale"] == "ja-JP"
        prior_hashes[path.name] = digest(raw)
        old_texts.update(row["spokenText"] for row in scope["texts"])
    texts = []
    for display in sorted(placements):
        speech = spoken(display)
        assert speech
        if speech in old_texts:
            continue
        texts.append({"displayText": display, "spokenText": speech,
                      "textSHA256": digest(speech.encode()), "placements": placements[display]})
    assert len({row["textSHA256"] for row in texts}) == len(texts)
    return {"schema": 1, "courseId": "travel-dinner", "stageId": "master-travel-dinner",
            "pairKey": "Japanese:English", "locale": "ja-JP", "voices": VOICES,
            "sourceSHA256": {"master-11-draft.json": digest(draft_bytes)},
            "previousScopeSHA256": prior_hashes,
            "lessonIds": [lesson["stableId"]],
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
        raise SystemExit("Private Master 11 audio scope is stale")
    print(f"Japanese Dinner Master 11: {result['uniqueTexts']} texts, "
          f"{result['proposedClips']} clips, "
          f"{result['submittedCharacters']} submitted characters; unregistered")


if __name__ == "__main__":
    main()
