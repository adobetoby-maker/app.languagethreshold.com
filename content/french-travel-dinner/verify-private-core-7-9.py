#!/usr/bin/env python3
"""Check French Dinner Core 7–9 source ownership and private release gates."""

import hashlib
import json
import re
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODES = {"see", "recall", "hear", "type", "say", "write"}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def source_bytes(path, revision):
    local = ROOT / path
    if local.exists():
        return local.read_bytes()
    return subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=ROOT)


def main():
    draft = json.loads(Path(__file__).with_name("core-7-9-draft.json").read_text())
    provenance = draft["source"]
    curriculum = source_bytes(provenance["curriculumPath"], provenance["revision"])
    passages = source_bytes(provenance["passagePath"], provenance["revision"])
    require(hashlib.sha256(curriculum).hexdigest() == provenance["curriculumSHA256"],
            "Core curriculum source changed")
    require(hashlib.sha256(passages).hexdigest() == provenance["passageSHA256"],
            "Spanish passage source changed")
    source = json.loads(passages)
    require(source["module"] == "travel-dinner" and source["reviewed"] is False,
            "Wrong Spanish Core source")
    dinner = curriculum.decode().split('id: "travel-dinner",', 1)[1]
    source_lessons = re.findall(r'lesson\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"', dinner)
    require(len(source_lessons) >= 30, "Could not find Dinner curriculum lessons")
    require((draft["courseId"], draft["stageId"], draft["pairKey"], draft["locale"]) ==
            ("travel-dinner", "travel-dinner", "French:English", "fr-FR"), "Wrong pair or stage")
    require(draft["reviewed"] is False and draft["registered"] is False and
            draft["readyForLearner"] is False and draft["audio"] == "none", "Draft release gate changed")
    require(len(draft["lessons"]) == 3, "Expected Core lessons 7–9")
    for n, lesson in enumerate(draft["lessons"], 7):
        require(lesson["n"] == n and lesson["stableId"] == f"travel-dinner:{n}:fr-en",
                f"Core {n} stable identity changed")
        require(tuple(lesson[key] for key in ("sourceTitleEnglish", "sourceObjectiveEnglish",
                                               "sourceSpeakingEnglish")) == source_lessons[n - 1],
                f"Core {n} source objective changed")
        require(str(n) in source["lessons"] and source["lessons"][str(n)]["words"] and
                source["lessons"][str(n)]["passage"], f"Core {n} Spanish source incomplete")
        require(lesson["reviewed"] is False and all(lesson[key].strip() for key in
                ("title", "objective", "focus", "scene")), f"Core {n} teaching gate changed")
        cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
        require(12 <= len(cards) <= 20 and len(reader) >= 8, f"Core {n} card or Reader count")
        card_texts = []
        for card in cards:
            require(card["fr"].strip() and card["en"].strip() and card["kind"] in
                    ("term", "phrase"), f"Core {n} invalid card")
            card_texts.append(card["fr"])
        require(len(card_texts) == len(set(card_texts)), f"Core {n} duplicate card")
        require(all(turn["speaker"].strip() and turn["fr"].strip() and turn["en"].strip()
                    for turn in reader), f"Core {n} unaligned Reader turn")
        require(all(speaking[key].strip() for key in ("role", "partnerRole", "opening", "goal",
                                                        "closure")), f"Core {n} incomplete speaking scene")
        require(len(speaking["wordBank"]) >= 6 and
                all(word in card_texts for word in speaking["wordBank"]),
                f"Core {n} speaking bank is not owned by cards")
        require(set(lesson["modes"]) == MODES, f"Core {n} missing authored mode")
        for mode, prompt in lesson["modes"].items():
            require(prompt["cueEnglish"].strip() and
                    1 <= prompt["sourceCard"] <= len(cards) and
                    prompt["responseKind"] == ("open" if mode in ("say", "write") else "fixed"),
                    f"Core {n} {mode} not anchored to a card")
        if n == 8:
            direct_terms = {
                "une allergie aux arachides": "a peanut allergy",
                "les arachides": "peanuts",
                "la contamination croisée": "cross-contact / cross-contamination",
                "la friteuse": "fryer",
            }
            meanings = {card["fr"]: card["en"] for card in cards}
            require(all(meanings.get(term) == meaning for term, meaning in direct_terms.items()),
                    "Core 8 allergy or cross-contact terminology changed")
            dialogue = " ".join(turn["fr"] for turn in reader)
            require(all(term in dialogue for term in
                        ("allergie aux arachides", "contamination croisée", "même friteuse",
                         "poulet grillé, sans sauce")),
                    "Core 8 Reader lost direct clinical or food-preparation language")
            require(all(term in speaking["goal"] for term in
                        ("peanut allergy", "cross-contact", "fryer")),
                    "Core 8 speaking goal lost allergy or cross-contact language")
    print("French Dinner Core 7–9: source-pinned private draft valid; reviewed:false, registered:false")


if __name__ == "__main__":
    main()
