#!/usr/bin/env python3
"""Check Japanese Dinner Foundation 1–3 source and private draft gates."""

import hashlib
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MODES = {"see", "recall", "hear", "type", "say", "write"}
KANJI = re.compile(r"[\u3400-\u9fff]")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    draft = json.loads((HERE / "foundation-1-3-draft.json").read_text())
    raw = (ROOT / draft["source"]["path"]).read_bytes()
    source = json.loads(raw)
    require(hashlib.sha256(raw).hexdigest() == draft["source"]["sha256"],
            "Spanish Foundation source changed")
    require((source["module"], source["reviewed"]) ==
            ("foundation-travel-dinner", False), "Wrong source module")
    require((draft["courseId"], draft["stageId"], draft["pairKey"], draft["locale"]) ==
            ("travel-dinner", "foundation-travel-dinner", "Japanese:English", "ja-JP"),
            "Wrong Japanese pair or stage")
    require((draft["reviewed"], draft["registered"], draft["readyForLearner"],
             draft["audio"]) == (False, False, False, "none"), "Release gate changed")
    require(len(draft["lessons"]) == 3, "Expected three Foundation lessons")
    for n, lesson in enumerate(draft["lessons"], 1):
        original = source["lessons"][n - 1]
        require(lesson["n"] == original["n"] == n and
                lesson["stableId"] == f"foundation-travel-dinner:{n}:ja-en",
                f"Lesson {n} identity changed")
        require(tuple(lesson[key] for key in ("sourceTitleEnglish", "sourceObjectiveEnglish",
                                               "sourceSpeakingEnglish")) ==
                tuple(original[key] for key in ("title", "objective", "speaking")),
                f"Lesson {n} source objective changed")
        require(lesson["reviewed"] is False and
                all(lesson[key].strip() for key in ("title", "objective", "focus", "scene")),
                f"Lesson {n} teaching gate changed")
        cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
        require(12 <= len(cards) <= 20 and len(reader) >= 8,
                f"Lesson {n} card or Reader count")
        card_texts = []
        for card in cards:
            require(card["ja"].strip() and card["en"].strip() and card["kind"] in
                    ("term", "phrase"), f"Lesson {n} invalid card")
            if n > 1 and KANJI.search(card["ja"]):
                require(card.get("readingKana", "").strip(),
                        f"Lesson {n} kanji card lacks reading support: {card['ja']}")
            card_texts.append(card["ja"])
        require(len(card_texts) == len(set(card_texts)), f"Lesson {n} duplicate card")
        require(all(turn["speaker"].strip() and turn["ja"].strip() and turn["en"].strip()
                    for turn in reader), f"Lesson {n} unaligned Reader")
        require(all(speaking[key].strip() for key in ("role", "partnerRole", "opening",
                                                        "goal", "closure")),
                f"Lesson {n} incomplete speaking scene")
        require(len(speaking["wordBank"]) >= 6 and
                all(word in card_texts for word in speaking["wordBank"]),
                f"Lesson {n} speaking bank is not owned by cards")
        require(set(lesson["modes"]) == MODES, f"Lesson {n} missing mode")
        for mode, prompt in lesson["modes"].items():
            require(prompt["cueEnglish"].strip() and
                    1 <= prompt["sourceCard"] <= len(cards) and
                    prompt["responseKind"] == ("open" if mode in ("say", "write") else "fixed"),
                    f"Lesson {n} {mode} prompt invalid")
    print("Japanese Dinner Foundation 1–3: source-pinned private draft valid; reviewed:false, registered:false")


if __name__ == "__main__":
    main()
