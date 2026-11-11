#!/usr/bin/env python3
"""Verify Japanese Dinner Core 1–4 source identity, lesson ownership, and closed gates."""

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
    runpy.run_path(str(HERE / "verify-private-core-1-3.py"))["main"]()
    earlier = [json.loads((HERE / name).read_text()) for name in
               ("core-1-draft.json", "core-2-3-draft.json")]
    draft = json.loads((HERE / "core-4-draft.json").read_text())
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
    source_content = json.loads(content_raw)["lessons"]["4"]
    require(len(source_content["words"]) >= 15 and
            len(source_content["passage"]["target"]) ==
            len(source_content["passage"]["native"]) >= 8,
            "Spanish Core 4 content incomplete")
    require((draft["courseId"], draft["stageId"], draft["pairKey"],
             draft["targetLanguage"], draft["nativeLanguage"], draft["locale"]) ==
            ("travel-dinner", "travel-dinner", "Japanese:English",
             "Japanese", "English", "ja-JP"), "Japanese Core pair changed")
    require((draft["reviewed"], draft["registered"], draft["readyForLearner"],
             draft["audio"]) == (False, False, False, "none"), "Release gate changed")
    require(len(draft["lessons"]) == 1, "Expected one Core 4 lesson")
    lesson = draft["lessons"][0]
    all_lessons = earlier[0]["lessons"] + earlier[1]["lessons"] + draft["lessons"]
    require([row["stableId"] for row in all_lessons] ==
            [f"travel-dinner:{n}:ja-en" for n in range(1, 5)], "Core 1–4 IDs changed")
    require((lesson["n"], lesson["reviewed"]) == (4, False), "Core 4 review gate changed")
    require(tuple(lesson[key] for key in ("sourceTitleEnglish", "sourceObjectiveEnglish",
                                           "sourceSpeakingEnglish")) == source_lessons[3],
            "Core 4 source objective changed")
    require(all(lesson[key].strip() for key in ("title", "objective", "focus", "scene")),
            "Core 4 teaching incomplete")
    require(len(lesson["forms"]) >= 2 and all(
        form["base"].strip() and form["polite"].strip() and form["meaning"].strip()
        for form in lesson["forms"]), "Core 4 form contrasts incomplete")
    cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
    require(15 <= len(cards) <= 24 and len(reader) >= 9, "Core 4 card or Reader count")
    card_texts = [card["ja"] for card in cards]
    require(len(card_texts) == len(set(card_texts)), "Core 4 duplicate card")
    for card in cards:
        require(card["ja"].strip() and card["en"].strip() and
                card["kind"] in ("term", "phrase"), "Core 4 invalid card")
        if KANJI.search(card["ja"]):
            require(card.get("readingKana", "").strip(),
                    f"Core 4 kanji card lacks kana: {card['ja']}")
    require(all(turn["speaker"].strip() and turn["ja"].strip() and
                turn["en"].strip() for turn in reader), "Core 4 Reader unaligned")
    require(all(speaking[key].strip() for key in
                ("role", "partnerRole", "opening", "goal", "closure")),
            "Core 4 speaking scene incomplete")
    require(len(speaking["wordBank"]) >= 6 and
            all(word in card_texts for word in speaking["wordBank"]),
            "Core 4 speaking bank not lesson-owned")
    require(set(lesson["modes"]) == MODES and
            len({prompt["sourceCard"] for prompt in lesson["modes"].values()}) == 6,
            "Core 4 modes missing or repeating anchor")
    for mode, prompt in lesson["modes"].items():
        require(prompt["cueEnglish"].strip() and
                1 <= prompt["sourceCard"] <= len(cards) and
                prompt["responseKind"] ==
                ("open" if mode in ("say", "write") else "fixed"),
                f"Core 4 invalid {mode} prompt")
    print("Japanese Dinner Core 1–4: four private lessons; Core 4 has "
          f"{len(cards)} cards, {len(reader)} Reader turns, two form contrasts, "
          "six authored modes; reviewed:false, registered:false")


if __name__ == "__main__":
    main()
