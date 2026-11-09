#!/usr/bin/env python3
"""Inventory private Japanese Roofing speech strings without synthesizing audio."""

import argparse
import hashlib
import json
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-roofing"
OUTPUT = CONTENT / "audio-inventory.json"
VOICES = {
    "female": "ja-JP-Chirp3-HD-Aoede",
    "male": "ja-JP-Chirp3-HD-Charon",
}
STAGES = {"foundation": 10, "core": 30, "master": 20}


def display_key(value):
    return " ".join(unicodedata.normalize("NFC", value).strip().split())


def spoken_text(value):
    # These draft strings have no beginner segmentation spaces. Preserve spaces
    # inside English terms such as "architectural shingle" when sent to TTS.
    return display_key(value)


def inventory():
    files = []
    for stage in STAGES:
        files.extend(sorted(CONTENT.glob(f"{stage}-*-draft.json")))
    assert files, "No draft files found"
    lessons = defaultdict(dict)
    source_hashes = {}
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        stage = data.get("stage", data.get("stageId"))
        if stage == "foundation-roofing":
            stage = "foundation"
        assert stage in STAGES and path.name.startswith(f"{stage}-"), path
        assert (data["target"], data["native"]) == ("Japanese", "English"), path
        assert data["reviewed"] is False and data["registered"] is False and data["audio"] == "none", path
        assert not any(data["reviewGates"].values()), path
        source_hashes[path.relative_to(ROOT).as_posix()] = hashlib.sha256(path.read_bytes()).hexdigest()
        for lesson in data["lessons"]:
            n = lesson["n"]
            assert n not in lessons[stage], (stage, n)
            assert lesson["stableId"].endswith(f":{n}:ja-en"), (stage, n)
            lessons[stage][n] = lesson
    assert {stage: len(lessons[stage]) for stage in STAGES} == STAGES
    assert {stage: sorted(lessons[stage]) for stage in STAGES} == {
        stage: list(range(1, count + 1)) for stage, count in STAGES.items()
    }

    strings = defaultdict(lambda: {"spokenText": "", "surfaces": set(), "lessonIds": set()})
    counts = defaultdict(int)

    def add(text, surface, stable_id):
        assert isinstance(text, str) and text.strip(), (surface, stable_id)
        key = display_key(text)
        spoken = spoken_text(text)
        assert key and spoken
        entry = strings[key]
        if entry["spokenText"] and entry["spokenText"] != spoken:
            raise ValueError(f"Conflicting spoken text for {key!r}")
        entry["spokenText"] = spoken
        entry["surfaces"].add(surface)
        entry["lessonIds"].add(stable_id)
        counts[surface] += 1

    for stage in STAGES:
        for n in sorted(lessons[stage]):
            lesson = lessons[stage][n]
            stable_id = lesson["stableId"]
            for card in lesson["cards"]:
                add(card["ja"], "card", stable_id)
            for line in lesson["reader"]:
                add(line["ja"], "reader", stable_id)
            for form in lesson["forms"]:
                add(form["exampleJa"] if "exampleJa" in form else form["contextJa"], "form", stable_id)
            add(lesson["speaking"]["opening"], "speakingOpening", stable_id)

    canonical = {key: {
        "spokenText": value["spokenText"],
        "surfaces": sorted(value["surfaces"]),
        "lessonIds": sorted(value["lessonIds"]),
    } for key, value in sorted(strings.items())}
    canonical_bytes = json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    per_voice = sum(len(value["spokenText"]) for value in canonical.values())
    return {
        "schema": 1,
        "scope": "private-japanese-roofing-60-draft-lessons",
        "target": "Japanese",
        "native": "English",
        "locale": "ja-JP",
        "voices": VOICES,
        "stages": STAGES,
        "draftFileSHA256": source_hashes,
        "sourcePlacements": dict(sorted(counts.items())),
        "uniqueDisplayTexts": len(canonical),
        "requiredTwoVoiceClips": len(canonical) * len(VOICES),
        "spokenCharactersPerVoice": per_voice,
        "spokenCharactersAllVoices": per_voice * len(VOICES),
        "stringsSHA256": hashlib.sha256(canonical_bytes).hexdigest(),
        "strings": canonical,
        "recordingsGenerated": False,
        "listeningReviewed": False,
        "registered": False,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    result = json.dumps(inventory(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text(encoding="utf-8") == result, "Japanese Roofing audio inventory is stale"
        print("Japanese Roofing audio inventory matches all 60 private draft lessons")
    else:
        OUTPUT.write_text(result, encoding="utf-8")
        print(OUTPUT)
