#!/usr/bin/env python3
"""Verify consecutive Japanese Dinner Core 1–3 private drafts and source identity."""

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
    runpy.run_path(str(HERE / "verify-private-core-1.py"))["main"]()
    first = json.loads((HERE / "core-1-draft.json").read_text())
    draft = json.loads((HERE / "core-2-3-draft.json").read_text())
    require(first["source"] == draft["source"], "Core batches use different source pins")
    source = draft["source"]
    plan_raw = (ROOT / source["planPath"]).read_bytes()
    content_raw = (ROOT / source["contentPath"]).read_bytes()
    require(hashlib.sha256(plan_raw).hexdigest() == source["planSHA256"] and
            hashlib.sha256(content_raw).hexdigest() == source["contentSHA256"],
            "Spanish Dinner source changed")
    plan = plan_raw.decode()
    start = plan.index('id: "travel-dinner"')
    source_lessons = re.findall(
        r'lesson\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"',
        plan[start:], re.DOTALL,
    )
    require(len(source_lessons) >= 30, "Spanish Core plan has fewer than 30 lessons")
    content = json.loads(content_raw)
    require((content["module"], content["language"], content["nativeLanguage"],
             content["reviewed"]) == ("travel-dinner", "Spanish", "English", False),
            "Spanish Core source identity changed")
    require((draft["courseId"], draft["stageId"], draft["pairKey"], draft["locale"]) ==
            ("travel-dinner", "travel-dinner", "Japanese:English", "ja-JP"),
            "Japanese pair or Core stage changed")
    require((draft["reviewed"], draft["registered"], draft["readyForLearner"],
             draft["audio"]) == (False, False, False, "none"), "Release gate changed")
    require(len(draft["lessons"]) == 2, "Expected two new Core lessons")
    lessons = first["lessons"] + draft["lessons"]
    require([lesson["stableId"] for lesson in lessons] ==
            [f"travel-dinner:{n}:ja-en" for n in range(1, 4)],
            "Core 1–3 IDs or order changed")
    for n, lesson in enumerate(draft["lessons"], 2):
        require((lesson["n"], lesson["stableId"], lesson["reviewed"]) ==
                (n, f"travel-dinner:{n}:ja-en", False),
                f"Core {n} identity or review changed")
        require(tuple(lesson[key] for key in ("sourceTitleEnglish", "sourceObjectiveEnglish",
                                                   "sourceSpeakingEnglish")) == source_lessons[n-1],
                f"Core {n} source objective changed")
        source_content = content["lessons"][str(n)]
        require(len(source_content["words"]) >= 15 and
                len(source_content["passage"]["target"]) ==
                len(source_content["passage"]["native"]) >= 8,
                f"Spanish Core {n} content source incomplete")
        require(all(lesson[key].strip() for key in ("title", "objective", "focus", "scene")),
                f"Core {n} teaching incomplete")
        require(len(lesson["forms"]) >= 2 and
                all(form["base"].strip() and form["polite"].strip() and
                    form["meaning"].strip() for form in lesson["forms"]),
                f"Core {n} Japanese form contrasts incomplete")
        cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
        require(15 <= len(cards) <= 24 and len(reader) >= 9,
                f"Core {n} card or Reader coverage too small")
        card_texts = []
        for card in cards:
            require(card["ja"].strip() and card["en"].strip() and
                    card["kind"] in ("term", "phrase"), f"Core {n} invalid card")
            if KANJI.search(card["ja"]):
                require(card.get("readingKana", "").strip(),
                        f"Core {n} kanji card lacks kana support: {card['ja']}")
            card_texts.append(card["ja"])
        require(len(card_texts) == len(set(card_texts)), f"Core {n} duplicate card")
        require(all(turn["speaker"].strip() and turn["ja"].strip() and turn["en"].strip()
                    for turn in reader), f"Core {n} unaligned Reader")
        require(all(speaking[key].strip() for key in
                    ("role", "partnerRole", "opening", "goal", "closure")),
                f"Core {n} incomplete speaking scene")
        require(len(speaking["wordBank"]) >= 6 and
                all(word in card_texts for word in speaking["wordBank"]),
                f"Core {n} speaking bank is not owned by its cards")
        require(set(lesson["modes"]) == MODES and
                len({prompt["sourceCard"] for prompt in lesson["modes"].values()}) == 6,
                f"Core {n} modes missing or repeating a card anchor")
        for mode, prompt in lesson["modes"].items():
            require(prompt["cueEnglish"].strip() and
                    1 <= prompt["sourceCard"] <= len(cards) and
                    prompt["responseKind"] ==
                    ("open" if mode in ("say", "write") else "fixed"),
                    f"Core {n} invalid {mode} prompt")
    print(f"Japanese Dinner Core 1–3: {len(lessons)} private lessons, "
          f"{sum(len(lesson['cards']) for lesson in lessons)} cards, "
          f"{sum(len(lesson['reader']) for lesson in lessons)} Reader turns, "
          "18 authored mode prompts; reviewed:false, registered:false")


if __name__ == "__main__":
    main()
