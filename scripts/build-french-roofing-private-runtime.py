#!/usr/bin/env python3
"""Build an unregistered French→English Roofing inspection fixture."""

import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-roofing"
OUTPUT = SOURCE / "private-runtime-candidate.json"
STAGE_SIZES = {"foundation": 10, "core": 30, "master": 20}
MODES = ("see", "recall", "hear", "type", "say", "write")


def required(value, label):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Missing {label}")
    return value.strip()


def build():
    source_files = []
    lessons = []
    for stage, expected_count in STAGE_SIZES.items():
        stage_lessons = []
        for path in sorted(SOURCE.glob(f"{stage}-*-draft.json")):
            draft = json.loads(path.read_text())
            if (draft.get("moduleId"), draft.get("stage"), draft.get("target"), draft.get("native")) != (
                "roofing", stage, "French", "English"
            ):
                raise ValueError(f"Wrong module, stage or exact language pair: {path.name}")
            if draft.get("reviewed") is not False:
                raise ValueError(f"Source is not an unreviewed draft: {path.name}")
            source_files.append({
                "path": str(path.relative_to(ROOT)),
                "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            })
            for raw in draft["lessons"]:
                number = raw["n"]
                if raw.get("reviewed", False) is not False:
                    raise ValueError(f"Unexpected reviewed lesson: {stage}:{number}")
                lesson_key = f"{stage}:{number}"
                words = [
                    {
                        "id": f"{lesson_key}:word:{index}",
                        "targetFrench": required(word.get("fr"), f"{lesson_key} word {index} French"),
                        "supportEnglish": required(word.get("enDisplay") or word.get("en"), f"{lesson_key} word {index} English"),
                        "kind": word.get("kind", "term"),
                    }
                    for index, word in enumerate(raw["words"], 1)
                ]
                reading = raw["reading"]
                french = reading["target"]
                english = reading.get("nativeDisplay") or reading["native"]
                if not french or len(french) != len(english):
                    raise ValueError(f"Unaligned Reader: {lesson_key}")
                reader = [
                    {
                        "id": f"{lesson_key}:line:{index}",
                        "targetFrench": required(fr, f"{lesson_key} Reader line {index} French"),
                        "supportEnglish": required(en, f"{lesson_key} Reader line {index} English"),
                    }
                    for index, (fr, en) in enumerate(zip(french, english), 1)
                ]
                stage_lessons.append({
                    "draftLessonKey": lesson_key,
                    "stage": stage,
                    "n": number,
                    "titleEnglish": required(raw.get("titleEnglish"), f"{lesson_key} title"),
                    "objectiveEnglish": required(
                        raw.get("objectiveEnglishDisplay") or raw.get("objectiveEnglish") or raw.get("objectiveEnglishSource"),
                        f"{lesson_key} objective",
                    ),
                    "words": words,
                    "readerTitleFrench": required(reading.get("titleFrench"), f"{lesson_key} Reader title"),
                    "reader": reader,
                    "speakingOpeningFrench": required(raw.get("speakingFrenchOpening"), f"{lesson_key} speaking opening"),
                    "candidateModeInputs": {mode: [word["id"] for word in words] for mode in MODES},
                    "practicePromptsFrench": raw.get("practiceModesFrench") or {},
                    "reviewed": False,
                    "registered": False,
                })
        numbers = [lesson["n"] for lesson in stage_lessons]
        if sorted(numbers) != list(range(1, expected_count + 1)):
            raise ValueError(f"Missing or duplicate {stage} lesson numbers: {numbers}")
        lessons.extend(sorted(stage_lessons, key=lambda lesson: lesson["n"]))
    pairs = {
        (word["targetFrench"], word["supportEnglish"])
        for lesson in lessons for word in lesson["words"]
    }
    return {
        "schema": 1,
        "purpose": "private exact-pair runtime inspection; not learner-facing",
        "moduleId": "roofing",
        "targetLanguage": "French",
        "nativeLanguage": "English",
        "sourceFiles": sorted(source_files, key=lambda entry: entry["path"]),
        "stageCounts": STAGE_SIZES,
        "lessonCount": len(lessons),
        "wordPlacements": sum(len(lesson["words"]) for lesson in lessons),
        "distinctWordPairs": len(pairs),
        "readerLines": sum(len(lesson["reader"]) for lesson in lessons),
        "releaseGate": {
            "enabled": False,
            "catalogRegistered": False,
            "runtimeRegistered": False,
            "offlineRegistered": False,
            "audioReviewed": False,
            "humanReviewed": False,
        },
        "lessons": lessons,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true", help="Fail if the committed fixture is stale")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != rendered:
            raise SystemExit("French Roofing private runtime fixture is stale")
    else:
        OUTPUT.write_text(rendered)
    print("French Roofing private 10/30/20 exact-pair fixture passed")


if __name__ == "__main__":
    main()
