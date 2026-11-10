#!/usr/bin/env python3
"""Check the private French Lunch Foundation against pinned Spanish learning purposes."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFTS = (
    ROOT / "content/french-travel-lunch/foundation-1-3-draft.json",
    ROOT / "content/french-travel-lunch/foundation-4-10-draft.json",
)
MODES = {"see", "recall", "hear", "type", "say", "write"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate(draft, source, source_bytes, expected_numbers):
    require((draft.get("schema"), draft.get("courseId"), draft.get("stageId"),
             draft.get("targetLanguage"), draft.get("nativeLanguage"),
             draft.get("pairKey"), draft.get("locale"), draft.get("state"),
             draft.get("reviewed"), draft.get("registered"),
             draft.get("readyForLearner"), draft.get("audio")) ==
            (1, "travel-lunch", "foundation-travel-lunch", "French", "English",
             "French:English", "fr-FR", "partial-authored-draft", False,
             False, False, "none"), "Wrong pair, stage, or review gate")
    pin = draft["source"]
    require(pin["path"] == "src/data/core60/es/foundation-travel-lunch.json" and
            pin["sha256"] == hashlib.sha256(source_bytes).hexdigest(),
            "Spanish source hash changed")
    lessons = draft["lessons"]
    require([lesson["n"] for lesson in lessons] == list(expected_numbers),
            "Wrong private lesson sequence")
    seen_cards = set()
    seen_cues = set()
    for lesson in lessons:
        number = lesson["n"]
        original = source["lessons"][number - 1]
        prefix = f"foundation-travel-lunch:{number}:fr-en"
        require(lesson["stableId"] == prefix and lesson["reviewed"] is False,
                f"Lesson {number}: identity or review changed")
        require((lesson["sourceTitleEnglish"], lesson["sourceObjectiveEnglish"],
                 lesson["sourceSpeakingEnglish"]) ==
                (original["title"], original["objective"], original["speaking"]),
                f"Lesson {number}: source learning purpose changed")
        require(all(isinstance(lesson[key], str) and lesson[key].strip()
                    for key in ("title", "objective", "focus", "scene")),
                f"Lesson {number}: missing teaching field")
        cards, reader, speaking, modes = (lesson["cards"], lesson["reader"],
                                          lesson["speaking"], lesson["modes"])
        require(len(cards) >= 12 and len(reader) >= 8 and set(modes) == MODES,
                f"Lesson {number}: cards, Reader, or modes incomplete")
        card_text = set()
        for index, card in enumerate(cards, 1):
            card_id = f"{prefix}:card:{index}"
            require(card_id not in seen_cards and card["kind"] in ("term", "phrase") and
                    card["fr"].strip() and card["en"].strip() and
                    any(c in card["fr"] for c in "abcdefghijklmnopqrstuvwxyzàâçéèêëîïôùûüœ'"),
                    f"Lesson {number}: invalid card {index}")
            seen_cards.add(card_id)
            card_text.add(card["fr"])
        require(len(card_text) == len(cards), f"Lesson {number}: duplicate card text")
        require(all(line["fr"].strip() and line["en"].strip() and line["speaker"].strip()
                    for line in reader), f"Lesson {number}: incomplete aligned Reader")
        require(all(speaking[key].strip() for key in ("role", "partnerRole", "opening", "goal", "closure")) and
                len(speaking["wordBank"]) >= 6 and
                set(speaking["wordBank"]).issubset(card_text),
                f"Lesson {number}: speaking bank not from lesson cards")
        for mode, activity in modes.items():
            ref = activity["sourceCard"]
            require(isinstance(ref, int) and 1 <= ref <= len(cards) and
                    activity["cueEnglish"].strip() and
                    activity["responseKind"] == ("open" if mode in ("say", "write") else "fixed"),
                    f"Lesson {number}: invalid {mode} activity")
            cue = activity["cueEnglish"]
            require(cue not in seen_cues, f"Lesson {number}: duplicated prompt")
            seen_cues.add(cue)
    require(len(seen_cards) == sum(len(lesson["cards"]) for lesson in lessons) and
            len(seen_cues) == 6 * len(lessons), "Cross-lesson card or mode count changed")
    return {"lessons": len(lessons), "cards": len(seen_cards),
            "readerTurns": sum(len(lesson["reader"]) for lesson in lessons),
            "modeActivities": len(seen_cues), "reviewed": False, "registered": False}


if __name__ == "__main__":
    drafts = [json.loads(path.read_text()) for path in DRAFTS]
    source_path = ROOT / drafts[0]["source"]["path"]
    source_bytes = source_path.read_bytes()
    source = json.loads(source_bytes)
    first = validate(drafts[0], source, source_bytes, range(1, 4))
    second = validate(drafts[1], source, source_bytes, range(4, 11))
    all_lessons = drafts[0]["lessons"] + drafts[1]["lessons"]
    require([lesson["n"] for lesson in all_lessons] == list(range(1, 11)),
            "Foundation lessons are not contiguous")
    require(len({lesson["stableId"] for lesson in all_lessons}) == 10,
            "Foundation lesson IDs overlap")
    print(json.dumps({"lessons": 10, "cards": first["cards"] + second["cards"],
                      "readerTurns": first["readerTurns"] + second["readerTurns"],
                      "modeActivities": first["modeActivities"] + second["modeActivities"],
                      "reviewed": False, "registered": False}))
