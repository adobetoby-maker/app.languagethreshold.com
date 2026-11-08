#!/usr/bin/env python3
"""Pin authored Core 1–30 Japanese form prompts to exact Breakfast Reader pairs."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-form-practice-core-1-30-ja-en.json"

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
    11: [(1, "weather-agreement-desu-ne"), (5, "destination-question"), (6, "if-no-rain-nakereba")],
    12: [(1, "bill-request-onegai-shimasu"), (3, "separate-charge-question"), (7, "card-payment-haraemasu-ka")],
    13: [(3, "past-aroma-yokatta-desu"), (4, "texture-past-te-imashita"), (7, "pass-compliment-itadakemasu-ka")],
    14: [(1, "time-remaining-ato"), (4, "duration-question-kakarimasu-ka"), (6, "takeaway-order-onegai-shimasu")],
    15: [(3, "dairy-restriction-sakete-imasu"), (8, "milk-observation-nomimasen"), (10, "if-unverified-nakereba")],
    16: [(2, "stroller-space-availability"), (7, "smaller-portion-dekimasu-ka"), (9, "spicy-ingredient-question")],
    17: [(1, "step-free-entrance-availability"), (5, "wheelchair-space-availability"), (7, "route-show-itadakemasu-ka")],
    18: [(1, "nut-allergy-and-check"), (4, "shared-tongs-question"), (6, "toaster-milk-pitcher-shared-question")],
    19: [(3, "counter-table-price-contrast"), (5, "price-difference-why"), (7, "counter-seat-choice")],
    20: [(2, "tentative-charge-you-desu"), (4, "booking-confirmation-email"), (7, "corrected-bill-itadakemasu-ka")],
    21: [(4, "stroller-does-not-fit"), (6, "reservation-time-question"), (8, "decide-after-looking-te-mo-ii-desu-ka")],
    22: [(1, "pay-first-at-this-shop"), (3, "counter-order-question"), (8, "table-seat-permission")],
    23: [(1, "nearby-bakery-availability"), (3, "opening-time-question"), (8, "repeat-directions-onegai-shimasu")],
    24: [(1, "urgent-help-request"), (3, "person-fell-report"), (4, "ambulance-request")],
    25: [(1, "burn-report-yakedo"), (3, "cold-water-request"), (5, "first-aid-kit-question"),
         (7, "skin-red-report"), (8, "more-napkins-request")],
    26: [(1, "two-hour-work-permission"), (3, "if-busy-tara"), (6, "outlet-seat-availability")],
    27: [(1, "early-departure"), (6, "nut-allergy-and-ingredients"), (9, "pickup-time-and-place-question")],
    28: [(3, "lived-here-long-question"), (5, "neighborhood-preference-question"), (7, "tell-me-more-request")],
    29: [(1, "offer-to-pay-today"), (4, "let-me-pay-next-time"), (8, "tip-policy-question")],
    30: [(1, "high-chair-availability"), (6, "child-nut-allergy-and-preparation"),
         (12, "bill-check-two-coffees"), (13, "bill-correction")],
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
    assert list(EXERCISES) == list(range(1, 31))
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
        assert len(prompts) >= 3
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
    print("Japanese Breakfast Core 1–30: 93 exact-pair form prompts verified")


if __name__ == "__main__":
    main()
