#!/usr/bin/env python3
"""Pin authored Japanese form prompts to exact Breakfast Foundation Reader pairs."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/foundation-1-10-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-form-practice-foundation-1-10-ja-en.json"

# Reader turn and target-language contrast are selected by the author, not sampled
# from arbitrary lines or copied from Spanish person/endings tables.
EXERCISES = {
    1: [(1, "polite-morning-greeting"), (3, "topic-wa-and-polite-desu"), (5, "availability-question-arimasu-ka")],
    2: [(2, "cup-counter-ni-hai"), (3, "general-counter-mittsu"), (7, "price-confirmation-desu-ka")],
    3: [(1, "seat-availability-te-imasu-ka"), (5, "i-adjective-atsui"), (7, "i-adjective-amai-ka")],
    4: [(3, "item-availability-arimasu-ka"), (6, "negative-dewa-arimasen"), (7, "polite-request-kudasai")],
    5: [(2, "action-location-de"), (3, "permission-te-mo-ii-desu-ka"), (7, "payment-possibility-haraemasu-ka")],
    6: [(3, "polite-nonpast-question"), (4, "habit-itsumo-tabe-masu"), (6, "daily-habit-nomi-masu")],
    7: [(1, "price-question-ikura-desu-ka"), (4, "location-question-doko-desu-ka"), (8, "choice-question-dore-desu-ka")],
    8: [(2, "not-yet-mada-te-imasen"), (4, "negative-tabe-masen"), (7, "less-sugar-sukuname-de")],
    9: [(1, "soft-request-itadake-masu-ka"), (4, "bill-request-onegai-shimasu"), (8, "polite-intention-harai-masu")],
    10: [(2, "non-understanding-wakari-masen"), (3, "repeat-slowly-te-kudasai"), (5, "ingredient-question-nan-desu-ka")],
}


def make_id(lesson, turn, target, english):
    source = "\0".join(("foundation-travel-breakfast:ja-en", str(lesson), str(turn), target, english))
    return "form-ja-en-" + hashlib.sha256(source.encode()).hexdigest()[:16]


def build():
    raw = SOURCE.read_bytes()
    course = json.loads(raw)
    assert (course["moduleId"], course["stageId"], course["target"], course["native"],
            course["reviewed"], course["registered"]) == (
                "travel-breakfast", "foundation-travel-breakfast", "Japanese", "English", False, False)
    assert [lesson["n"] for lesson in course["lessons"]] == list(range(1, 11))
    lessons = []
    all_ids = set()
    assert list(EXERCISES) == list(range(1, 11))
    for n, selected in EXERCISES.items():
        lesson = course["lessons"][n - 1]
        prompts = []
        for turn, focus in selected:
            pair = lesson["reader"][turn - 1]
            target, english = pair["ja"], pair["en"]
            assert target and english and target == target.strip() and english == english.strip()
            prompt_id = make_id(n, turn, target, english)
            assert prompt_id not in all_ids
            all_ids.add(prompt_id)
            prompts.append({
                "id": prompt_id,
                "sourceReaderTurn": turn,
                "focus": focus,
                "englishPrompt": english,
                "japaneseAnswer": target,
                "practice": ["recognize-meaning", "produce-target"],
                "reviewed": False,
            })
        assert len(prompts) == 3
        lessons.append({
            "lesson": n,
            "stableLessonId": lesson["stableId"],
            "grammarFocus": lesson["focus"],
            "prompts": prompts,
            "reviewed": False,
        })
    return {
        "schema": 1,
        "state": "private-form-practice-draft",
        "registered": False,
        "reviewed": False,
        "pairKey": "Japanese:English",
        "courseId": "foundation-travel-breakfast:ja-en",
        "practiceModel": "contextual-japanese-form",
        "note": "Whole authored Japanese Reader expressions; no Spanish person or ending slots. Authoring inputs only, not live exercises.",
        "sourceFile": SOURCE.name,
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "counts": {"lessons": len(lessons), "prompts": len(all_ids)},
        "lessons": lessons,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "Japanese Breakfast form pilot is stale"
    else:
        OUTPUT.write_text(rendered)
    print("Japanese Breakfast Foundation 1–10: 30 exact-pair form prompts verified")


if __name__ == "__main__":
    main()
