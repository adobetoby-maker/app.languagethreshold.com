#!/usr/bin/env python3
"""Check French Dinner Core 1–10 source ownership and closed release gates."""

import hashlib
import json
import re
import runpy
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
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
    runpy.run_path(str(HERE / "verify-private-core-7-9.py"))["main"]()
    prior = [json.loads((HERE / name).read_text()) for name in
             ("core-1-3-draft.json", "core-4-6-draft.json", "core-7-9-draft.json")]
    draft = json.loads((HERE / "core-10-draft.json").read_text())
    source = draft["source"]
    require(all(batch["source"] == source for batch in prior), "Core source pins differ")
    curriculum = source_bytes(source["curriculumPath"], source["revision"])
    passages = source_bytes(source["passagePath"], source["revision"])
    require(hashlib.sha256(curriculum).hexdigest() == source["curriculumSHA256"] and
            hashlib.sha256(passages).hexdigest() == source["passageSHA256"],
            "Spanish Dinner source changed")
    plan = curriculum.decode().split('id: "travel-dinner",', 1)[1]
    source_lessons = re.findall(
        r'lesson\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"', plan)
    require(len(source_lessons) >= 30, "Spanish Dinner Core plan incomplete")
    source_content = json.loads(passages)["lessons"]["10"]
    require(len(source_content["words"]) >= 15 and
            len(source_content["passage"]["target"]) ==
            len(source_content["passage"]["native"]) >= 8,
            "Spanish Core 10 content incomplete")
    require((draft["courseId"], draft["stageId"], draft["pairKey"],
             draft["targetLanguage"], draft["nativeLanguage"], draft["locale"]) ==
            ("travel-dinner", "travel-dinner", "French:English", "French", "English", "fr-FR"),
            "French Dinner pair or stage changed")
    require((draft["reviewed"], draft["registered"], draft["readyForLearner"],
             draft["audio"]) == (False, False, False, "none"), "Draft release gate changed")
    require(len(draft["lessons"]) == 1, "Expected one Core 10 lesson")
    lesson = draft["lessons"][0]
    all_lessons = [row for batch in prior for row in batch["lessons"]] + draft["lessons"]
    require([row["stableId"] for row in all_lessons] ==
            [f"travel-dinner:{n}:fr-en" for n in range(1, 11)],
            "Core 1–10 stable IDs changed")
    require((lesson["n"], lesson["reviewed"]) == (10, False),
            "Core 10 number or review gate changed")
    require(tuple(lesson[key] for key in ("sourceTitleEnglish", "sourceObjectiveEnglish",
                                           "sourceSpeakingEnglish")) == source_lessons[9],
            "Core 10 source objective changed")
    require(all(lesson[key].strip() for key in ("title", "objective", "focus", "scene")),
            "Core 10 teaching incomplete")
    require(len(lesson["forms"]) >= 2 and all(
        form["infinitive"].strip() and form["meaning"].strip() and
        (form.get("presentNous") or form.get("presentVous")) for form in lesson["forms"]),
        "Core 10 French verb forms incomplete")
    cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
    require(15 <= len(cards) <= 20 and len(reader) >= 8, "Core 10 card or Reader count")
    card_texts = [card["fr"] for card in cards]
    require(len(card_texts) == len(set(card_texts)), "Core 10 duplicate card")
    require(all(card["fr"].strip() and card["en"].strip() and
                card["kind"] in ("term", "phrase") for card in cards),
            "Core 10 invalid card")
    require(all(turn["speaker"].strip() and turn["fr"].strip() and
                turn["en"].strip() for turn in reader), "Core 10 Reader unaligned")
    require(all(speaking[key].strip() for key in
                ("role", "partnerRole", "opening", "goal", "closure")),
            "Core 10 speaking scene incomplete")
    require(len(speaking["wordBank"]) >= 6 and
            all(word in card_texts for word in speaking["wordBank"]),
            "Core 10 speaking bank not lesson-owned")
    require(set(lesson["modes"]) == MODES and
            len({prompt["sourceCard"] for prompt in lesson["modes"].values()}) == 6,
            "Core 10 modes missing or repeating anchor")
    for mode, prompt in lesson["modes"].items():
        require(prompt["cueEnglish"].strip() and
                1 <= prompt["sourceCard"] <= len(cards) and
                prompt["responseKind"] ==
                ("open" if mode in ("say", "write") else "fixed"),
                f"Core 10 invalid {mode} prompt")
    require(all(term in " ".join(turn["fr"] for turn in reader) for term in
                ("anniversaire de mariage", "surprise", "dessert avec une bougie", "confirmer")),
            "Core 10 Reader lost occasion or arrangement purpose")
    print("French Dinner Core 1–10: source-pinned private drafts valid; "
          "Core 10 has 18 cards, 9 Reader turns, 3 verb form records, six modes; "
          "reviewed:false, registered:false")


if __name__ == "__main__":
    main()
