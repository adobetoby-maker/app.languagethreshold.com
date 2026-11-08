#!/usr/bin/env python3
"""Pin authored Core 1–10 Japanese form prompts to exact Breakfast Reader pairs."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-form-practice-core-1-10-ja-en.json"

# Each turn and contrast is selected for the actual lesson focus. These are
# contextual Japanese expressions, not Spanish-style person conjugations.
EXERCISES = {
    1: [(3, "counter-order-location"), (5, "seat-availability-question"), (7, "polite-wait-intention")],
    2: [(1, "coffee-choice-question"), (5, "oat-milk-availability"), (9, "drink-here-nonpast")],
    3: [(2, "baked-this-morning-question"), (4, "filling-question"), (6, "savory-item-availability")],
    4: [(3, "choice-possibility-erabemasu-ka"), (6, "well-cooked-te-kudasai"), (8, "set-inclusion-fukumaremasu-ka")],
    5: [(4, "booking-confirmation-shimasu"), (6, "opening-hours-kara-made"), (8, "explanation-te-kudasai")],
    6: [(1, "nut-allergy-arimasu"), (2, "ingredient-check-itadakemasu-ka"), (7, "negative-order-shimasen")],
    7: [(1, "local-area-dewa"), (2, "this-shop-dewa"), (7, "ingredient-detail-itadakemasu-ka")],
    8: [(3, "recipient-watashi-ni-wa"), (4, "recipient-friend-ni-wa"), (5, "recipient-child-ni-wa")],
    9: [(2, "takeaway-change-dekimasu-ka"), (3, "not-yet-made-te-inai"), (6, "bag-request-te-kudasai")],
    10: [(1, "order-check-itadakemasu-ka"), (3, "ordered-item-no-wa-and-contrast"), (4, "missing-item-te-imasen")],
}


def stable_id(lesson, turn, target, english):
    source = "\0".join(("travel-breakfast:ja-en", str(lesson), str(turn), target, english))
    return "form-ja-en-" + hashlib.sha256(source.encode()).hexdigest()[:16]


def build():
    raw = SOURCE.read_bytes()
    course = json.loads(raw)
    assert (course["moduleId"], course["stageId"], course["target"], course["native"],
            course["reviewed"], course["registered"]) == (
                "travel-breakfast", "travel-breakfast", "Japanese", "English", False, False)
    assert [lesson["n"] for lesson in course["lessons"]] == list(range(1, 31))
    assert list(EXERCISES) == list(range(1, 11))
    lessons = []
    all_ids = set()
    for n, selected in EXERCISES.items():
        lesson = course["lessons"][n - 1]
        assert lesson["stableId"] == f"travel-breakfast:{n}:ja-en"
        prompts = []
        for turn, focus in selected:
            pair = lesson["reader"][turn - 1]
            target, english = pair["ja"], pair["en"]
            assert target and english and target == target.strip() and english == english.strip()
            prompt_id = stable_id(n, turn, target, english)
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
        "schema": 1, "state": "private-form-practice-draft", "registered": False,
        "reviewed": False, "pairKey": "Japanese:English", "courseId": "travel-breakfast:ja-en",
        "practiceModel": "contextual-japanese-form",
        "note": "Whole authored Japanese Reader expressions; no Spanish person or ending slots. Authoring inputs only, not live exercises.",
        "sourceFile": SOURCE.name, "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "counts": {"lessons": len(lessons), "prompts": len(all_ids)},
        "lessons": lessons,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "Japanese Breakfast Core form draft is stale"
    else:
        OUTPUT.write_text(rendered)
    print("Japanese Breakfast Core 1–10: 30 exact-pair form prompts verified")


if __name__ == "__main__":
    main()
