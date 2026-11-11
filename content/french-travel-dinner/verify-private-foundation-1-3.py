#!/usr/bin/env python3
"""Verify source ownership and draft gates for French Dinner Foundation 1–3."""

import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DRAFT = Path(__file__).with_name("foundation-1-3-draft.json")
MODES = {"see", "recall", "hear", "type", "say", "write"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def main():
    draft = json.loads(DRAFT.read_text())
    source_path = ROOT / draft["source"]["path"]
    source_bytes = source_path.read_bytes()
    source = json.loads(source_bytes)
    require(hashlib.sha256(source_bytes).hexdigest() == draft["source"]["sha256"], "Spanish source changed")
    require(source["module"] == "foundation-travel-dinner" and source["reviewed"] is False,
            "Wrong Spanish source")
    require((draft["pairKey"], draft["locale"], draft["stageId"]) ==
            ("French:English", "fr-FR", "foundation-travel-dinner"), "Wrong French pair or stage")
    require(draft["reviewed"] is False and draft["registered"] is False and
            draft["readyForLearner"] is False and draft["audio"] == "none", "Draft release gate changed")
    require(len(draft["lessons"]) == 3, "Expected only the first three Foundation lessons")
    for n, (lesson, original) in enumerate(zip(draft["lessons"], source["lessons"]), 1):
        require(lesson["n"] == original["n"] == n and
                lesson["stableId"] == f"foundation-travel-dinner:{n}:fr-en", f"Lesson {n} identity changed")
        for field, source_field in (("sourceTitleEnglish", "title"),
                                    ("sourceObjectiveEnglish", "objective"),
                                    ("sourceSpeakingEnglish", "speaking")):
            require(lesson[field] == original[source_field], f"Lesson {n} source {field} changed")
        require(lesson["reviewed"] is False and lesson["objective"] and lesson["focus"] and
                lesson["scene"], f"Lesson {n} review or teaching fields changed")
        cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
        require(12 <= len(cards) <= 20 and len(reader) >= 8, f"Lesson {n} card or Reader count")
        card_texts = []
        for card in cards:
            require(card["fr"].strip() and card["en"].strip() and
                    card["kind"] in ("term", "phrase"), f"Lesson {n} invalid card")
            card_texts.append(card["fr"])
        require(len(card_texts) == len(set(card_texts)), f"Lesson {n} duplicate card")
        for turn in reader:
            require(turn["speaker"].strip() and turn["fr"].strip() and turn["en"].strip(),
                    f"Lesson {n} unaligned Reader turn")
        require(speaking["role"] and speaking["partnerRole"] and speaking["opening"] and
                speaking["goal"] and speaking["closure"], f"Lesson {n} incomplete speaking scene")
        require(len(speaking["wordBank"]) >= 6 and
                all(word in card_texts for word in speaking["wordBank"]),
                f"Lesson {n} speaking bank not owned by lesson cards")
        require(set(lesson["modes"]) == MODES, f"Lesson {n} missing authored mode")
        for mode, prompt in lesson["modes"].items():
            require(prompt["cueEnglish"].strip() and
                    1 <= prompt["sourceCard"] <= len(cards) and
                    prompt["responseKind"] == ("open" if mode in ("say", "write") else "fixed"),
                    f"Lesson {n} {mode} not anchored to a card")
    print("French Dinner Foundation 1–3: source-pinned private draft valid; reviewed:false, registered:false")


if __name__ == "__main__":
    main()
