#!/usr/bin/env python3
"""Pin every authored Japanese Foreman card, Reader, form and speaking text."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
OUTPUT = ROOT / "docs/japanese-program/foreman-full-audio-inventory-2026-11-09.json"
PATTERNS = {
    "foundation": ("foundation-runtime-draft-ja-en.json", 10),
    "core": ("core-runtime-pilot-*-ja-en.json", 30),
    "master": ("master-runtime-pilot-*-ja-en.json", 20),
}
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}
FORMS = CONTENT / "private-form-practice-ja-en.json"
SPEAKING = CONTENT / "private-speaking-missions-ja-en.json"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def inventory():
    strings = defaultdict(lambda: {"surfaces": set(), "lessonIds": set()})
    placements = defaultdict(int)
    sources = {}
    lessons = {}

    def source(path):
        raw = path.read_bytes()
        sources[path.relative_to(ROOT).as_posix()] = digest(raw)
        return json.loads(raw)

    def add(text, surface, lesson_id):
        if not isinstance(text, str) or not text.strip() or text != text.strip():
            raise ValueError(f"Invalid exact Japanese audio text: {surface} {lesson_id}")
        strings[text]["surfaces"].add(surface)
        strings[text]["lessonIds"].add(lesson_id)
        placements[surface] += 1

    for stage, (pattern, expected) in PATTERNS.items():
        stage_numbers = set()
        paths = sorted(CONTENT.glob(pattern))
        if not paths:
            raise ValueError(f"Missing {stage} source files")
        for path in paths:
            data = source(path)
            if (data.get("target"), data.get("native"), data.get("reviewed")) != ("Japanese", "English", False):
                raise ValueError(f"Wrong pair or review gate: {path}")
            for lesson in data["lessons"]:
                number = lesson["n"]
                lesson_id = lesson["id"]
                if number in stage_numbers or lesson.get("reviewed") is not False or not lesson_id.endswith(f":lesson:{number}"):
                    raise ValueError(f"Wrong lesson identity or review gate: {stage} {number}")
                stage_numbers.add(number)
                lessons[(stage, number)] = lesson_id
                for card in lesson["words"]:
                    if not card.get("en"):
                        raise ValueError(f"Unpaired card: {lesson_id}")
                    add(card["es"], "card", lesson_id)
                for line in lesson["reader"]["sentences"]:
                    if not line.get("native"):
                        raise ValueError(f"Unpaired Reader line: {lesson_id}")
                    add(line["target"], "reader", lesson_id)
        if stage_numbers != set(range(1, expected + 1)):
            raise ValueError(f"Incomplete {stage} numbering: {sorted(stage_numbers)}")

    forms = source(FORMS)
    speaking = source(SPEAKING)
    for sidecar in (forms, speaking):
        if (sidecar.get("pairKey"), sidecar.get("reviewed"), sidecar.get("registered")) != (
                "Japanese:English", False, False):
            raise ValueError("Sidecar pair or review gate changed")
    if len(forms["lessons"]) != 60 or len(speaking["missions"]) != 60:
        raise ValueError("Form or speaking sidecar is incomplete")
    form_keys = set()
    for row in forms["lessons"]:
        key = (row["stage"], row["lesson"])
        lesson_id = lessons.get(key)
        if key in form_keys or lesson_id != row["sourceLessonId"] or row.get("reviewed") is not False:
            raise ValueError(f"Form source identity changed: {key}")
        form_keys.add(key)
        for form in row["forms"]:
            if not form.get("english") or form.get("reviewed") is not False:
                raise ValueError(f"Unpaired or reviewed form: {key}")
            add(form["target"], "form", lesson_id)
    mission_keys = set()
    for mission in speaking["missions"]:
        key = (mission["stage"], mission["lesson"])
        lesson_id = lessons.get(key)
        if key in mission_keys or lesson_id != mission["sourceLessonId"]:
            raise ValueError(f"Speaking source identity changed: {key}")
        mission_keys.add(key)
        add(mission["openingLineJapanese"], "speakingOpening", lesson_id)
        if mission.get("sourceSpeakingJapanese"):
            add(mission["sourceSpeakingJapanese"], "speakingSource", lesson_id)
    if form_keys != set(lessons) or mission_keys != set(lessons):
        raise ValueError("Form or speaking lesson coverage is incomplete")

    canonical = {text: {"spokenText": text, "surfaces": sorted(value["surfaces"]),
                        "lessonIds": sorted(value["lessonIds"])}
                 for text, value in sorted(strings.items())}
    canonical_bytes = json.dumps(canonical, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode()
    per_voice = sum(len(text) for text in canonical)
    return {
        "schema": 1, "scope": "private-japanese-foreman-60-draft-lessons",
        "pairKey": "Japanese:English", "target": "Japanese", "native": "English",
        "locale": "ja-JP", "voices": VOICES,
        "stages": {stage: expected for stage, (_, expected) in PATTERNS.items()},
        "sourceFileSHA256": dict(sorted(sources.items())),
        "sourcePlacements": dict(sorted(placements.items())),
        "uniqueDisplayTexts": len(canonical), "requiredTwoVoiceClips": len(canonical) * 2,
        "spokenCharactersPerVoice": per_voice, "spokenCharactersAllVoices": per_voice * 2,
        "stringsSHA256": digest(canonical_bytes), "strings": canonical,
        "recordingsGenerated": False, "listeningReviewed": False, "registered": False,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = json.dumps(inventory(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if OUTPUT.read_text() != encoded:
            raise ValueError("Japanese Foreman full audio inventory is stale")
    else:
        OUTPUT.write_text(encoded)
    print(f"Japanese Foreman full audio inventory: {inventory()['uniqueDisplayTexts']} texts")
