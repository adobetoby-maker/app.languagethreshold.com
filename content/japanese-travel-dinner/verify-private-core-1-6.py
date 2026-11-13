#!/usr/bin/env python3
"""Verify Japanese Dinner Core 1–6 source identity and private lesson gates."""

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
    runpy.run_path(str(HERE / "verify-private-core-1-4.py"))["main"]()
    earlier = [json.loads((HERE / name).read_text()) for name in
               ("core-1-draft.json", "core-2-3-draft.json", "core-4-draft.json")]
    draft = json.loads((HERE / "core-5-6-draft.json").read_text())
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
    require(len(draft["lessons"]) == 2, "Expected Core 5 and 6")
    all_lessons = [row for batch in earlier for row in batch["lessons"]] + draft["lessons"]
    require([row["stableId"] for row in all_lessons] ==
            [f"travel-dinner:{n}:ja-en" for n in range(1, 7)],
            "Core 1–6 IDs changed")
    for n, lesson in enumerate(draft["lessons"], 5):
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
    five, six = draft["lessons"]
    require(all(term in " ".join(row["ja"] for row in five["reader"]) for term in
                ("山梨県産", "辛口", "果実味", "予算", "一本")),
            "Core 5 Reader lost local wine, taste, or budget")
    require(all(term in " ".join(row["ja"] for row in six["reader"]) for term in
                ("看板料理", "旬", "売り切れ", "この地域らしい料理")),
            "Core 6 Reader lost specialty, seasonal, or sold-out purpose")
    print("Japanese Dinner Core 1–6: source-pinned private drafts valid; "
          "Core 5–6 have 36 cards, 21 Reader turns, four form contrasts, "
          "six modes each; reviewed:false, registered:false")


if __name__ == "__main__":
    main()
