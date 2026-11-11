#!/usr/bin/env python3
"""Verify the source-pinned, unregistered Japanese Dinner Core 1 draft."""

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


def read_pinned(path, expected_hash):
    raw = (ROOT / path).read_bytes()
    require(hashlib.sha256(raw).hexdigest() == expected_hash, f"Source changed: {path}")
    return raw


def main():
    draft = json.loads((HERE / "core-1-draft.json").read_text())
    source = draft["source"]
    plan = read_pinned(source["planPath"], source["planSHA256"]).decode()
    content = json.loads(read_pinned(source["contentPath"], source["contentSHA256"]))
    require((content["module"], content["language"], content["nativeLanguage"],
             content["reviewed"]) == ("travel-dinner", "Spanish", "English", False),
            "Wrong Spanish source identity")
    original = content["lessons"]["1"]
    require(len(original["words"]) >= 15 and
            len(original["passage"]["target"]) == len(original["passage"]["native"]) >= 9,
            "Spanish Core 1 source incomplete")
    match = re.search(
        r'id: "travel-dinner".*?lessons:\s*\[\s*lesson\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"',
        plan, re.DOTALL,
    )
    require(match is not None, "Dinner Core plan not found")
    require((draft["courseId"], draft["stageId"], draft["pairKey"], draft["locale"]) ==
            ("travel-dinner", "travel-dinner", "Japanese:English", "ja-JP"),
            "Japanese pair or Core stage changed")
    require((draft["reviewed"], draft["registered"], draft["readyForLearner"],
             draft["audio"]) == (False, False, False, "none"), "Release gate changed")
    require(len(draft["lessons"]) == 1, "Expected one Core lesson")
    lesson = draft["lessons"][0]
    require((lesson["n"], lesson["stableId"], lesson["reviewed"]) ==
            (1, "travel-dinner:1:ja-en", False), "Core 1 identity or review changed")
    require(tuple(lesson[key] for key in ("sourceTitleEnglish", "sourceObjectiveEnglish",
                                               "sourceSpeakingEnglish")) == match.groups(),
            "Core 1 source objectives changed")
    require(all(lesson[key].strip() for key in ("title", "objective", "focus", "scene")),
            "Missing lesson teaching")
    require(len(lesson["forms"]) >= 2 and all(form["base"].strip() and
            form["polite"].strip() and form["meaning"].strip() for form in lesson["forms"]),
            "Missing Japanese form contrasts")
    cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
    require(15 <= len(cards) <= 24 and len(reader) >= 9, "Card or Reader coverage too small")
    card_texts = []
    for card in cards:
        require(card["ja"].strip() and card["en"].strip() and
                card["kind"] in ("term", "phrase"), "Invalid card")
        if KANJI.search(card["ja"]):
            require(card.get("readingKana", "").strip(),
                    f"Kanji card lacks kana support: {card['ja']}")
        card_texts.append(card["ja"])
    require(len(set(card_texts)) == len(card_texts), "Duplicate Japanese card")
    require(all(turn["speaker"].strip() and turn["ja"].strip() and turn["en"].strip()
                for turn in reader), "Unaligned Reader turn")
    require(all(speaking[key].strip() for key in
                ("role", "partnerRole", "opening", "goal", "closure")),
            "Incomplete speaking scene")
    require(len(speaking["wordBank"]) >= 6 and
            all(word in card_texts for word in speaking["wordBank"]),
            "Speaking bank must use this lesson's cards")
    require(set(lesson["modes"]) == MODES, "Missing mode")
    require(len({prompt["sourceCard"] for prompt in lesson["modes"].values()}) == 6,
            "Modes do not use six distinct card anchors")
    for mode, prompt in lesson["modes"].items():
        require(prompt["cueEnglish"].strip() and
                1 <= prompt["sourceCard"] <= len(cards) and
                prompt["responseKind"] == ("open" if mode in ("say", "write") else "fixed"),
                f"Invalid {mode} prompt")
    print(f"Japanese Dinner Core 1: {len(cards)} cards, {len(reader)} Reader turns, "
          "2 form contrasts, six authored modes; reviewed:false, registered:false")


if __name__ == "__main__":
    main()
