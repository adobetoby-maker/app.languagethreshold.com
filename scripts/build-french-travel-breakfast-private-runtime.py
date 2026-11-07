#!/usr/bin/env python3
"""Build a source-pinned, deliberately unregistered French Travel Breakfast fixture.

This is an inspection artifact, not a public Core 60 file or a release gate bypass.
"""

import argparse
import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast"
OUTPUT = SOURCE / "private-runtime-candidate.json"
STAGE_SIZES = {"foundation": 10, "core": 30, "master": 20}
MODE_NAMES = ("see", "recall", "hear", "type", "say", "write")
REVIEW_REQUIRED = {
    "foundation": [8, 10],
    "core": [6, 18, 24, 25, 27, 30],
    "master": [4, 8, 13, 14, 15, 19, 20],
}


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def need(value, where):
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Missing text: {where}")
    return value.strip()


def build():
    lessons = []
    files = []
    source_revisions = set()
    for stage, expected in STAGE_SIZES.items():
        stage_lessons = []
        for path in sorted(SOURCE.glob(f"{stage}-*-draft.json")):
            draft = json.loads(path.read_text())
            if draft.get("stage") != stage:
                continue
            if (draft.get("moduleId"), draft.get("targetLanguage"), draft.get("nativeLanguage")) != (
                "travel-breakfast", "French", "English"
            ):
                raise ValueError(f"Wrong exact pair in {path.name}")
            if draft.get("reviewed") is not False:
                raise ValueError(f"Unexpected reviewed flag in {path.name}")
            source_revisions.add(draft["sourceRevision"])
            files.append({"path": str(path.relative_to(ROOT)), "sha256": digest(path)})
            for raw in draft["lessons"]:
                n = raw["n"]
                if raw.get("reviewed") is not False:
                    raise ValueError(f"Unexpected lesson review flag: {stage} {n}")
                words = []
                for index, word in enumerate(raw["words"], 1):
                    words.append({
                        "id": f"{stage}:{n}:word:{index}",
                        "targetFrench": need(word.get("fr"), f"{stage} {n} word {index} French"),
                        "supportEnglish": need(word.get("enFrenchCourse") or word.get("en"), f"{stage} {n} word {index} English"),
                        "sourceEnglish": need(word.get("en"), f"{stage} {n} source word {index}"),
                        "kind": word.get("kind", "term"),
                    })
                passage = raw["passage"]
                french = passage["french"]
                english = passage["english"]
                learner_english = passage.get("englishFrenchCourse") or english
                if not french or len(french) != len(english) or len(french) != len(learner_english):
                    raise ValueError(f"Unaligned Reader: {stage} {n}")
                reader = [
                    {
                        "id": f"{stage}:{n}:line:{index}",
                        "targetFrench": need(fr, f"{stage} {n} Reader French {index}"),
                        "supportEnglish": need(en, f"{stage} {n} Reader English {index}"),
                    }
                    for index, (fr, en) in enumerate(zip(french, learner_english), 1)
                ]
                stage_lessons.append({
                    "draftLessonKey": f"{stage}:{n}",
                    "stage": stage,
                    "n": n,
                    "titleEnglish": need(raw.get("titleFrenchCourseEnglish"), f"{stage} {n} title"),
                    "objectiveEnglish": need(raw.get("objectiveFrenchCourseEnglish"), f"{stage} {n} objective"),
                    "focusFrench": need(raw.get("focusFrench"), f"{stage} {n} focus French"),
                    "focusEnglish": need(raw.get("focusEnglish"), f"{stage} {n} focus English"),
                    "words": words,
                    "readerTitleFrench": need(passage.get("titleFrench"), f"{stage} {n} Reader title"),
                    "reader": reader,
                    "speaking": {
                        "openingFrench": need(raw.get("speakingFrench"), f"{stage} {n} speaking opening"),
                        "instructionEnglish": need(raw.get("speakingInstructionEnglish"), f"{stage} {n} speaking instruction"),
                    },
                    "candidateModeInputs": {mode: [word["id"] for word in words] for mode in MODE_NAMES},
                    "requiresQualifiedReview": n in REVIEW_REQUIRED[stage],
                    "reviewed": False,
                    "registered": False,
                })
        numbers = [lesson["n"] for lesson in stage_lessons]
        if sorted(numbers) != list(range(1, expected + 1)):
            raise ValueError(f"Missing/duplicate {stage} lesson numbers: {numbers}")
        lessons.extend(sorted(stage_lessons, key=lambda lesson: lesson["n"]))
    if len(source_revisions) != 1:
        raise ValueError(f"Mixed source revisions: {sorted(source_revisions)}")
    source_locale_terms = re.compile(r"\b(?:Oaxaca|Mexico|pesos?|Spanish|espagnol)\b", re.I)
    locale_carryover = []
    for lesson in lessons:
        learner_fields = {key: value for key, value in lesson.items() if key not in ("sourceFiles",)}
        learner_fields["words"] = [
            {key: value for key, value in word.items() if key != "sourceEnglish"}
            for word in lesson["words"]
        ]
        if source_locale_terms.search(json.dumps(learner_fields, ensure_ascii=False)):
            locale_carryover.append(lesson["draftLessonKey"])
    return {
        "schema": 1,
        "purpose": "private exact-pair runtime-readiness fixture; not learner-facing",
        "moduleId": "travel-breakfast",
        "targetLanguage": "French",
        "nativeLanguage": "English",
        "sourceRevision": source_revisions.pop(),
        "sourceFiles": sorted(files, key=lambda item: item["path"]),
        "stageCounts": STAGE_SIZES,
        "lessonCount": len(lessons),
        "wordPlacements": sum(len(lesson["words"]) for lesson in lessons),
        "readerLines": sum(len(lesson["reader"]) for lesson in lessons),
        "sourceLocaleCarryoverLessonKeys": locale_carryover,
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
    parser.add_argument("--check", action="store_true", help="Fail if the committed fixture differs")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not OUTPUT.exists() or OUTPUT.read_text() != rendered:
            raise SystemExit("Private runtime fixture is stale")
    else:
        OUTPUT.write_text(rendered)
    print("French Travel Breakfast private 10/30/20 exact-pair fixture passed")


if __name__ == "__main__":
    main()
