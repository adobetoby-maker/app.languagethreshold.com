#!/usr/bin/env python3
"""Derive a private French→English Roofing dictionary inventory from the pinned fixture."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
SOURCE = CONTENT / "private-runtime-candidate.json"
OUTPUT = CONTENT / "private-dictionary-candidate.json"
REVIEW_OUTPUT = CONTENT / "private-dictionary-review-queue.md"
EXPECTED_STAGES = {"foundation": 10, "core": 30, "master": 20}


def build():
    raw = SOURCE.read_bytes()
    candidate = json.loads(raw)
    if (
        candidate.get("moduleId") != "roofing"
        or candidate.get("targetLanguage") != "French"
        or candidate.get("nativeLanguage") != "English"
        or candidate.get("stageCounts") != EXPECTED_STAGES
        or candidate.get("lessonCount") != 60
        or candidate.get("releaseGate", {}).get("enabled") is not False
        or candidate["releaseGate"].get("runtimeRegistered") is not False
        or candidate["releaseGate"].get("humanReviewed") is not False
    ):
        raise ValueError("French Roofing fixture is not an exact-pair private draft")
    if len(candidate.get("sourceFiles", [])) != 20:
        raise ValueError("French Roofing fixture source inventory is incomplete")
    for source in candidate["sourceFiles"]:
        path = ROOT / source["path"]
        if not path.is_relative_to(CONTENT) or hashlib.sha256(path.read_bytes()).hexdigest() != source["sha256"]:
            raise ValueError(f"French Roofing source changed: {path}")

    entries = {}
    headwords = defaultdict(set)
    seen_lessons = set()
    seen_words = set()
    for lesson in candidate["lessons"]:
        stage, number = lesson["stage"], lesson["n"]
        lesson_key = f"{stage}:{number}"
        if (
            stage not in EXPECTED_STAGES
            or not isinstance(number, int)
            or number < 1
            or number > EXPECTED_STAGES[stage]
            or lesson["draftLessonKey"] != lesson_key
            or lesson_key in seen_lessons
            or lesson["reviewed"] is not False
            or lesson["registered"] is not False
        ):
            raise ValueError(f"Invalid private lesson identity: {lesson_key}")
        seen_lessons.add(lesson_key)
        for position, word in enumerate(lesson["words"], 1):
            word_id = f"{lesson_key}:word:{position}"
            target, native = word["targetFrench"], word["supportEnglish"]
            if (
                word["id"] != word_id
                or word_id in seen_words
                or not isinstance(target, str)
                or not isinstance(native, str)
                or not target.strip()
                or not native.strip()
                or target != target.strip()
                or native != native.strip()
            ):
                raise ValueError(f"Invalid exact-pair word: {word_id}")
            seen_words.add(word_id)
            pair = (target, native)
            if pair not in entries:
                pair_id = hashlib.sha256("\0".join(pair).encode("utf-8")).hexdigest()[:16]
                entries[pair] = {
                    "id": f"dict-fr-en-{pair_id}",
                    "targetFrench": target,
                    "supportEnglish": native,
                    "kindVariants": [],
                    "partOfSpeech": None,
                    "inflection": None,
                    "reviewed": False,
                    "registered": False,
                    "occurrences": [],
                }
            entry = entries[pair]
            kind = word["kind"]
            if kind not in entry["kindVariants"]:
                entry["kindVariants"].append(kind)
            entry["occurrences"].append({
                "stage": stage,
                "lesson": number,
                "draftLessonKey": lesson_key,
                "wordId": word_id,
                "lessonTitleEnglish": lesson["titleEnglish"],
                "readerTitleFrench": lesson["readerTitleFrench"],
            })
            headwords[target].add(native)

    if len(seen_lessons) != 60 or len(seen_words) != candidate["wordPlacements"]:
        raise ValueError("French Roofing dictionary inventory lost lessons or word placements")
    for stage, count in EXPECTED_STAGES.items():
        if any(f"{stage}:{number}" not in seen_lessons for number in range(1, count + 1)):
            raise ValueError(f"Missing {stage} lesson")
    for entry in entries.values():
        entry["kindVariants"].sort()
        entry["needsSenseReview"] = len(headwords[entry["targetFrench"]]) > 1
        entry["needsKindReview"] = len(entry["kindVariants"]) > 1

    ambiguous = sorted(target for target, glosses in headwords.items() if len(glosses) > 1)
    kind_conflicts = sorted(
        entry["id"] for entry in entries.values() if entry["needsKindReview"]
    )
    return {
        "schema": 1,
        "state": "private-dictionary-draft",
        "moduleId": "roofing",
        "targetLanguage": "French",
        "supportLanguage": "English",
        "pairKey": "French:English",
        "reviewed": False,
        "registered": False,
        "sourceFixtureSha256": hashlib.sha256(raw).hexdigest(),
        "sourceFiles": candidate["sourceFiles"],
        "counts": {
            "foundationLessons": 10,
            "coreLessons": 30,
            "masterLessons": 20,
            "wordPlacements": len(seen_words),
            "exactPairs": len(entries),
            "ambiguousHeadwords": len(ambiguous),
            "kindConflicts": len(kind_conflicts),
            "missingPartOfSpeech": len(entries),
            "missingInflection": len(entries),
        },
        "ambiguousHeadwords": ambiguous,
        "kindConflictEntryIds": kind_conflicts,
        "entries": sorted(entries.values(), key=lambda item: (item["targetFrench"], item["supportEnglish"])),
    }


def review_queue(inventory):
    by_target = defaultdict(list)
    for entry in inventory["entries"]:
        by_target[entry["targetFrench"]].append(entry)
    lines = [
        "# French Roofing private dictionary review queue",
        "",
        "Exact pair: French target / English support. This is an internal source-context queue, not learner-facing dictionary content or qualified French/trade approval.",
        "",
        f"The 60 draft lessons contain {inventory['counts']['wordPlacements']} card placements and {inventory['counts']['exactPairs']} exact pairs. "
        f"{inventory['counts']['ambiguousHeadwords']} French headwords have multiple English glosses; "
        f"{inventory['counts']['kindConflicts']} exact pairs have conflicting card kinds. "
        "Every entry still needs qualified part-of-speech, inflection and context review.",
        "",
        "Keep the authored French and English meanings until a reviewer checks the source context. Any correction must be made in the authored lesson and regenerated into this inventory. Clinical and trade words remain direct in the lesson; review notes stay here.",
        "",
        "| French headword | Exact English glosses | Draft lesson occurrences |",
        "| --- | --- | --- |",
    ]
    for target in inventory["ambiguousHeadwords"]:
        entries = by_target[target]
        glosses = "; ".join(sorted(entry["supportEnglish"] for entry in entries))
        lessons = sorted({
            f"{occurrence['stage'][0].upper()}{occurrence['lesson']}"
            for entry in entries for occurrence in entry["occurrences"]
        })
        escape = lambda value: value.replace("|", "\\|")
        lines.append(f"| {escape(target)} | {escape(glosses)} | {', '.join(lessons)} |")
    lines.extend([
        "",
        "The full exact-pair inventory records each source word ID, lesson title, Reader title and source SHA-256. No entries are registered, reviewed or used for audio synthesis.",
        "",
    ])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    inventory = build()
    rendered = json.dumps(inventory, ensure_ascii=False, indent=2) + "\n"
    queue = review_queue(inventory)
    if args.check:
        if OUTPUT.read_text() != rendered or REVIEW_OUTPUT.read_text() != queue:
            raise SystemExit("French Roofing private dictionary inventory is stale")
    else:
        OUTPUT.write_text(rendered)
        REVIEW_OUTPUT.write_text(queue)
    print("French Roofing private dictionary exact-pair inventory verified")


if __name__ == "__main__":
    main()
