#!/usr/bin/env python3
"""Pin authored Master 1–20 Japanese form prompts to exact Breakfast Reader pairs."""

import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/japanese-travel-breakfast"
OUTPUT = BASE / "private-form-practice-master-1-20-ja-en.json"
FILES = [
    "master-1-3-draft.json", "master-4-6-draft.json", "master-7-9-draft.json",
    "master-10-12-draft.json", "master-13-15-draft.json",
    "master-16-18-draft.json", "master-19-20-draft.json",
]

# Select whole expressions that actually occur in each authored Reader scene.
# Additional selections keep precise source clinical terms in the practice set.
EXERCISES = {
    1: [(3, "first-step-mazu"), (8, "called-number-tara"), (10, "full-sequence-mazu-tsugi-saigo")],
    2: [(2, "smaller-hou"), (4, "small-large-contrast"), (7, "dairy-ingredient-request")],
    3: [(1, "greeting-te-kudasai"), (5, "price-te-kudasai"), (7, "hot-drink-node")],
    4: [(1, "sesame-allergy-before-eating"), (5, "whether-chart-current"),
        (8, "cross-contact-not-verified"), (11, "epinephrine-auto-injector")],
    5: [(3, "went-and-found-closed"), (5, "alternative-request"), (7, "charge-adjustment-request")],
    6: [(4, "vegan-soy-ingredient-request"), (6, "lactose-free-dairy-question"), (9, "once-checked-compare")],
    7: [(4, "paid-cash-past"), (5, "payment-remains"), (7, "extra-coffee-not-paid")],
    8: [(4, "do-not-remove-almonds"), (11, "tree-nut-anaphylaxis"),
        (12, "antihistamine-epinephrine-auto-injector")],
    9: [(4, "lukewarm-feedback"), (5, "temperature-suggestion"), (8, "menu-board-suggestion")],
    10: [(1, "reported-market-preference"), (2, "contrast-shuttle-concern"),
         (9, "conditional-compromise"), (11, "host-reported-altitude-sickness")],
    11: [(3, "not-finished-yet"), (4, "thermos-assignment"), (10, "after-checking-decision")],
    12: [(4, "polite-coffee-request"), (8, "polite-sugar-request"), (10, "casual-sugar-request")],
    13: [(2, "about-eight-ten"), (3, "few-minutes-later-throat-itch"),
         (5, "hives-swollen-lips-breathing"), (8, "dizziness-ambulance-sequence")],
    14: [(1, "gluten-free-sign-wheat-flour"), (2, "celiac-disease-near-miss"),
         (3, "possible-tray-mixup")],
    15: [(2, "emergency-exit-direction"), (3, "stairs-direction"), (7, "meeting-point-direction")],
    16: [(2, "time-correction"), (6, "firsthand-observation-limit"), (10, "copy-if-signing")],
    17: [(2, "consent-exclude-diagnosis-medication"), (5, "first-thanks"),
         (6, "next-timeline"), (9, "finally-written-reply")],
    18: [(1, "train-delay-reason"), (2, "group-size-change"), (4, "key-pickup-request")],
    19: [(2, "overall-positive-feedback"), (4, "celiac-disease-ingredients-preparation"),
         (7, "future-visit-condition")],
    20: [(1, "first-step-instruction"), (3, "peanut-allergy-information-request"),
         (5, "substitute-ingredient-request"), (7, "unverified-refusal"),
         (10, "finally-factual-report")],
}


def stable_id(lesson, turn, target, english):
    source = "\0".join(("master-travel-breakfast:ja-en", str(lesson), str(turn), target, english))
    return "form-ja-en-" + hashlib.sha256(source.encode()).hexdigest()[:16]


def build():
    source_hashes = {}
    source_lessons = {}
    for name in FILES:
        raw = (BASE / name).read_bytes()
        course = json.loads(raw)
        assert (course["moduleId"], course["stageId"], course["target"], course["native"],
                course["reviewed"], course["registered"]) == (
                    "travel-breakfast", "master-travel-breakfast", "Japanese", "English", False, False)
        source_hashes[name] = hashlib.sha256(raw).hexdigest()
        for lesson in course["lessons"]:
            n = lesson["n"]
            assert n not in source_lessons
            source_lessons[n] = lesson
    assert sorted(source_lessons) == list(range(1, 21))
    assert list(EXERCISES) == list(range(1, 21))

    lessons = []
    all_ids = set()
    for n, selected in EXERCISES.items():
        lesson = source_lessons[n]
        assert lesson["stableId"] == f"master-travel-breakfast:{n}:ja-en"
        prompts = []
        for turn, focus in selected:
            pair = lesson["reader"][turn - 1]
            target, english = pair["ja"], pair["en"]
            assert target and english and target == target.strip() and english == english.strip()
            prompt_id = stable_id(n, turn, target, english)
            assert prompt_id not in all_ids
            all_ids.add(prompt_id)
            prompts.append({
                "id": prompt_id, "sourceReaderTurn": turn, "focus": focus,
                "englishPrompt": english, "japaneseAnswer": target,
                "practice": ["recognize-meaning", "produce-target"], "reviewed": False,
            })
        assert len(prompts) >= 3
        lessons.append({
            "lesson": n, "stableLessonId": lesson["stableId"],
            "grammarFocus": lesson["focus"], "prompts": prompts, "reviewed": False,
        })
    return {
        "schema": 1, "state": "private-form-practice-draft", "registered": False,
        "reviewed": False, "pairKey": "Japanese:English",
        "courseId": "master-travel-breakfast:ja-en",
        "practiceModel": "contextual-japanese-form",
        "note": "Whole authored Japanese Reader expressions; no Spanish person or ending slots. Authoring inputs only, not live exercises.",
        "sourceHashes": source_hashes,
        "counts": {"lessons": len(lessons), "prompts": len(all_ids)},
        "lessons": lessons,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        assert OUTPUT.read_text() == rendered, "Japanese Breakfast Master form draft is stale"
    else:
        OUTPUT.write_text(rendered)
    print(f"Japanese Breakfast Master 1–20: {build()['counts']['prompts']} exact-pair form prompts verified")


if __name__ == "__main__":
    main()
