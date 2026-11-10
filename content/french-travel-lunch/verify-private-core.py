#!/usr/bin/env python3
"""Check private French Lunch Core lessons against pinned source purposes."""

import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DRAFTS = (
    ROOT / "content/french-travel-lunch/core-1-5-draft.json",
    ROOT / "content/french-travel-lunch/core-6-10-draft.json",
    ROOT / "content/french-travel-lunch/core-11-15-draft.json",
    ROOT / "content/french-travel-lunch/core-16-20-draft.json",
)
MODES = ("see", "recall", "hear", "type", "say", "write")


def require(condition, message):
    if not condition:
        raise ValueError(message)


def core_purposes(source_bytes):
    text = source_bytes.decode("utf-8")
    start = text.index('id: "travel-lunch"')
    end = text.index('id: "travel-dinner"', start)
    specs = re.findall(r'lesson\(\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*\)',
                       text[start:end])
    require(len(specs) == 30, "Spanish Lunch Core source shape changed")
    return specs


def validate(draft, source_bytes, expected_numbers):
    require((draft.get("schema"), draft.get("courseId"), draft.get("stageId"),
             draft.get("targetLanguage"), draft.get("nativeLanguage"),
             draft.get("pairKey"), draft.get("locale"), draft.get("state"),
             draft.get("reviewed"), draft.get("registered"),
             draft.get("readyForLearner"), draft.get("audio")) ==
            (1, "travel-lunch", "core-travel-lunch", "French", "English",
             "French:English", "fr-FR", "partial-authored-draft", False,
             False, False, "none"), "Wrong pair, stage, or release gate")
    require(draft["source"]["path"] == "src/data/travel-zone.ts" and
            draft["source"]["sha256"] == hashlib.sha256(source_bytes).hexdigest(),
            "Spanish Core source hash changed")
    purposes = core_purposes(source_bytes)
    lessons = draft["lessons"]
    require([lesson["n"] for lesson in lessons] == list(expected_numbers),
            "Wrong private Core lesson sequence")
    ids = set()
    total_cards = total_reader = total_modes = 0
    for lesson in lessons:
        n = lesson["n"]
        require(lesson["stableId"] == f"core-travel-lunch:{n}:fr-en" and
                lesson["stableId"] not in ids and lesson["reviewed"] is False,
                f"Core {n}: identity or review changed")
        ids.add(lesson["stableId"])
        require((lesson["sourceTitleEnglish"], lesson["sourceObjectiveEnglish"],
                 lesson["sourceSpeakingEnglish"]) == purposes[n-1],
                f"Core {n}: source learning purpose changed")
        require(all(isinstance(lesson[key], str) and lesson[key].strip()
                    for key in ("title", "objective", "focus", "scene")),
                f"Core {n}: missing teaching field")
        cards, reader, speaking, modes = (lesson["cards"], lesson["reader"],
                                          lesson["speaking"], lesson["modes"])
        require(len(cards) >= 12 and len(reader) >= 8 and set(modes) == set(MODES),
                f"Core {n}: cards, Reader, or modes incomplete")
        require(all(card["kind"] in ("term", "phrase") and card["fr"].strip() and
                    card["en"].strip() for card in cards), f"Core {n}: incomplete card")
        card_text = {card["fr"] for card in cards}
        require(len(card_text) == len(cards), f"Core {n}: duplicate card text")
        require(all(line["speaker"].strip() and line["fr"].strip() and
                    line["en"].strip() for line in reader),
                f"Core {n}: incomplete aligned Reader")
        require(all(speaking[key].strip() for key in
                    ("role", "partnerRole", "opening", "goal", "closure")) and
                len(speaking["wordBank"]) >= 6 and
                set(speaking["wordBank"]).issubset(card_text),
                f"Core {n}: speaking bank not owned by lesson")
        cues = set()
        for mode in MODES:
            activity = modes[mode]
            ref = activity["sourceCard"]
            require(type(ref) is int and 1 <= ref <= len(cards) and
                    activity["cueEnglish"].strip() and
                    activity["responseKind"] ==
                    ("open" if mode in ("say", "write") else "fixed"),
                    f"Core {n}: invalid {mode} activity")
            require(activity["cueEnglish"] not in cues,
                    f"Core {n}: repeated activity cue")
            cues.add(activity["cueEnglish"])
        total_cards += len(cards)
        total_reader += len(reader)
        total_modes += len(modes)
    return {"lessons": len(lessons), "cards": total_cards,
            "readerTurns": total_reader, "modeActivities": total_modes,
            "reviewed": False, "registered": False}


if __name__ == "__main__":
    drafts = [json.loads(path.read_text()) for path in DRAFTS]
    source_bytes = (ROOT / drafts[0]["source"]["path"]).read_bytes()
    results = [validate(draft, source_bytes, range(1 + 5 * index, 6 + 5 * index))
               for index, draft in enumerate(drafts)]
    all_lessons = [lesson for draft in drafts for lesson in draft["lessons"]]
    require([lesson["n"] for lesson in all_lessons] == list(range(1, 21)),
            "Core lessons are not contiguous")
    require(len({lesson["stableId"] for lesson in all_lessons}) == 20,
            "Core lesson IDs overlap")
    print(json.dumps({"lessons": 20, "cards": sum(result["cards"] for result in results),
                      "readerTurns": sum(result["readerTurns"] for result in results),
                      "modeActivities": sum(result["modeActivities"] for result in results),
                      "reviewed": False, "registered": False}))
