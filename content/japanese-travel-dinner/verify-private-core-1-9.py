#!/usr/bin/env python3
"""Verify Japanese Dinner Core 1–9 source identity and private lesson gates."""

import hashlib
import json
import re
import runpy
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MODES = {"see", "recall", "hear", "type", "say", "write"}
KANJI = re.compile(r"[\u3400-\u9fff]")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    runpy.run_path(str(HERE / "verify-private-core-1-6.py"))["main"]()
    earlier = [json.loads((HERE / name).read_text()) for name in
               ("core-1-draft.json", "core-2-3-draft.json",
                "core-4-draft.json", "core-5-6-draft.json")]
    draft = json.loads((HERE / "core-7-9-draft.json").read_text())
    source = draft["source"]
    require(all(batch["source"] == source for batch in earlier), "Core source pins differ")
    plan_raw = (ROOT / source["planPath"]).read_bytes()
    content_raw = (ROOT / source["contentPath"]).read_bytes()
    require(hashlib.sha256(plan_raw).hexdigest() == source["planSHA256"] and
            hashlib.sha256(content_raw).hexdigest() == source["contentSHA256"],
            "Spanish Dinner source changed")
    plan = plan_raw.decode()
    source_lessons = re.findall(
        r'lesson\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"',
        plan[plan.index('id: "travel-dinner"'):], re.DOTALL)
    require(len(source_lessons) >= 30, "Spanish Dinner Core plan incomplete")
    source_content = json.loads(content_raw)
    require((draft["courseId"], draft["stageId"], draft["pairKey"],
             draft["targetLanguage"], draft["nativeLanguage"], draft["locale"]) ==
            ("travel-dinner", "travel-dinner", "Japanese:English",
             "Japanese", "English", "ja-JP"), "Japanese Core pair changed")
    require((draft["reviewed"], draft["registered"], draft["readyForLearner"],
             draft["audio"]) == (False, False, False, "none"), "Release gate changed")
    require(len(draft["lessons"]) == 3, "Expected Core 7–9")
    all_lessons = [row for batch in earlier for row in batch["lessons"]] + draft["lessons"]
    require([row["stableId"] for row in all_lessons] ==
            [f"travel-dinner:{n}:ja-en" for n in range(1, 10)],
            "Core 1–9 IDs changed")
    for n, lesson in enumerate(draft["lessons"], 7):
        require((lesson["n"], lesson["reviewed"]) == (n, False),
                f"Core {n} identity or review gate changed")
        require(tuple(lesson[key] for key in ("sourceTitleEnglish", "sourceObjectiveEnglish",
                                               "sourceSpeakingEnglish")) == source_lessons[n - 1],
                f"Core {n} source objective changed")
        original = source_content["lessons"][str(n)]
        require(len(original["words"]) >= 15 and
                len(original["passage"]["target"]) ==
                len(original["passage"]["native"]) >= 7,
                f"Spanish Core {n} source incomplete")
        require(all(lesson[key].strip() for key in ("title", "objective", "focus", "scene")),
                f"Core {n} teaching incomplete")
        require(len(lesson["forms"]) >= 2 and all(
            form["base"].strip() and form["polite"].strip() and
            form["meaning"].strip() for form in lesson["forms"]),
            f"Core {n} form contrasts incomplete")
        cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
        require(15 <= len(cards) <= 24 and len(reader) >= 9,
                f"Core {n} card or Reader count")
        card_texts = [card["ja"] for card in cards]
        require(len(card_texts) == len(set(card_texts)), f"Core {n} duplicate card")
        for card in cards:
            require(card["ja"].strip() and card["en"].strip() and
                    card["kind"] in ("term", "phrase"), f"Core {n} invalid card")
            if KANJI.search(card["ja"]):
                require(card.get("readingKana", "").strip(),
                        f"Core {n} kanji card lacks kana: {card['ja']}")
        require(all(turn["speaker"].strip() and turn["ja"].strip() and
                    turn["en"].strip() for turn in reader),
                f"Core {n} Reader unaligned")
        require(all(speaking[key].strip() for key in
                    ("role", "partnerRole", "opening", "goal", "closure")) and
                len(speaking["wordBank"]) >= 6 and
                all(word in card_texts for word in speaking["wordBank"]),
                f"Core {n} speaking not lesson-owned")
        require(set(lesson["modes"]) == MODES and
                len({prompt["sourceCard"] for prompt in lesson["modes"].values()}) == 6,
                f"Core {n} modes missing or repeating anchor")
        for mode, prompt in lesson["modes"].items():
            require(prompt["cueEnglish"].strip() and
                    1 <= prompt["sourceCard"] <= len(cards) and
                    prompt["responseKind"] ==
                    ("open" if mode in ("say", "write") else "fixed"),
                    f"Core {n} invalid {mode} prompt")
    seven, eight, nine = draft["lessons"]
    require(all(term in " ".join(row["ja"] for row in seven["reader"]) for term in
                ("塩焼き", "小骨", "一キロ当たり", "重さ", "合計")),
            "Core 7 Reader lost fish, bones, weight, or total")
    allergy_cards = {card["ja"]: card["en"] for card in eight["cards"]}
    require(all(allergy_cards.get(term) == meaning for term, meaning in {
        "食物アレルギー": "food allergy", "落花生": "peanuts (ingredient-label term)",
        "交差接触": "allergen cross-contact", "フライヤー": "fryer"}.items()),
        "Core 8 clinical or preparation vocabulary changed")
    require(all(term in " ".join(row["ja"] for row in eight["reader"]) for term in
                ("ピーナッツアレルギー", "落花生", "交差接触", "ピーナッツが混入する可能性",
                 "同じフライヤー", "鶏の唐揚げは頼みません", "ソースなしの鶏肉のグリル")),
            "Core 8 Reader lost allergy, cross-contact, fryer, or alternative")
    require(all(term in eight["speaking"]["goal"] for term in
                ("peanut allergy", "cross-contact", "shared fryer")),
            "Core 8 speaking lost direct allergy or cross-contact purpose")
    require(all(term in " ".join(row["ja"] for row in nine["reader"]) for term in
                ("前菜", "もう少しゆっくり出して", "次の料理は後で",
                 "次の料理まで少し時間", "料理の間", "少し早めに", "デザート")),
            "Core 9 Reader lost pace, pause, or resume task")
    print("Japanese Dinner Core 1–9: source-pinned private drafts valid; "
          "Core 7–9 have 54 cards, 34 Reader turns, six form contrasts, "
          "six modes each; reviewed:false, registered:false")


if __name__ == "__main__":
    main()
