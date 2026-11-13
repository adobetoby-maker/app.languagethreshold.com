#!/usr/bin/env python3
"""Check French Dinner Core 1–12 source identity and private lesson gates."""

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
    runpy.run_path(str(HERE / "verify-private-core-1-10.py"))["main"]()
    previous = [json.loads((HERE / name).read_text()) for name in
                ("core-1-3-draft.json", "core-4-6-draft.json",
                 "core-7-9-draft.json", "core-10-draft.json")]
    draft = json.loads((HERE / "core-11-12-draft.json").read_text())
    source = draft["source"]
    require(all(batch["source"] == source for batch in previous), "Core source pins differ")
    curriculum = source_bytes(source["curriculumPath"], source["revision"])
    passages = source_bytes(source["passagePath"], source["revision"])
    require(hashlib.sha256(curriculum).hexdigest() == source["curriculumSHA256"] and
            hashlib.sha256(passages).hexdigest() == source["passageSHA256"],
            "Spanish Dinner source changed")
    plan = curriculum.decode().split('id: "travel-dinner",', 1)[1]
    source_lessons = re.findall(
        r'lesson\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"', plan)
    require(len(source_lessons) >= 30, "Spanish Dinner Core plan incomplete")
    content = json.loads(passages)
    require((draft["courseId"], draft["stageId"], draft["pairKey"],
             draft["targetLanguage"], draft["nativeLanguage"], draft["locale"]) ==
            ("travel-dinner", "travel-dinner", "French:English", "French", "English", "fr-FR"),
            "French Dinner pair or stage changed")
    require((draft["reviewed"], draft["registered"], draft["readyForLearner"],
             draft["audio"]) == (False, False, False, "none"), "Draft release gate changed")
    require(len(draft["lessons"]) == 2, "Expected Core 11 and 12")
    all_lessons = [row for batch in previous for row in batch["lessons"]] + draft["lessons"]
    require([row["stableId"] for row in all_lessons] ==
            [f"travel-dinner:{n}:fr-en" for n in range(1, 13)],
            "Core 1–12 stage-local IDs changed")
    for n, lesson in enumerate(draft["lessons"], 11):
        require((lesson["n"], lesson["reviewed"]) == (n, False),
                f"Core {n} number or review gate changed")
        require(tuple(lesson[key] for key in ("sourceTitleEnglish", "sourceObjectiveEnglish",
                                               "sourceSpeakingEnglish")) == source_lessons[n - 1],
                f"Core {n} source objective changed")
        original = content["lessons"][str(n)]
        require(len(original["words"]) >= 15 and
                len(original["passage"]["target"]) ==
                len(original["passage"]["native"]) >= 8,
                f"Spanish Core {n} source incomplete")
        require(all(lesson[key].strip() for key in ("title", "objective", "focus", "scene")),
                f"Core {n} teaching incomplete")
        require(len(lesson["forms"]) >= 2 and all(
            form["infinitive"].strip() and form["meaning"].strip() and
            any(key.startswith("present") or key.startswith("past")
                for key in form) for form in lesson["forms"]),
            f"Core {n} French forms incomplete")
        cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
        require(15 <= len(cards) <= 20 and len(reader) >= 8,
                f"Core {n} card or Reader count")
        card_texts = [card["fr"] for card in cards]
        require(len(card_texts) == len(set(card_texts)) and all(
            card["fr"].strip() and card["en"].strip() and
            card["kind"] in ("term", "phrase") for card in cards),
            f"Core {n} cards invalid")
        require(all(turn["speaker"].strip() and turn["fr"].strip() and
                    turn["en"].strip() for turn in reader),
                f"Core {n} Reader unaligned")
        require(all(speaking[key].strip() for key in
                    ("role", "partnerRole", "opening", "goal", "closure")) and
                len(speaking["wordBank"]) >= 6 and
                all(word in card_texts for word in speaking["wordBank"]),
                f"Core {n} speaking not owned by lesson")
        require(set(lesson["modes"]) == MODES and
                len({prompt["sourceCard"] for prompt in lesson["modes"].values()}) == 6,
                f"Core {n} missing or repeated mode anchor")
        for mode, prompt in lesson["modes"].items():
            require(prompt["cueEnglish"].strip() and
                    1 <= prompt["sourceCard"] <= len(cards) and
                    prompt["responseKind"] ==
                    ("open" if mode in ("say", "write") else "fixed"),
                    f"Core {n} invalid {mode} prompt")
    eleven, twelve = draft["lessons"]
    require(all(term in " ".join(row["fr"] for row in eleven["reader"]) for term in
                ("cru à l'intérieur", "faire cuire davantage", "commandé du poisson",
                 "apporté de la viande", "remplacer")),
            "Core 11 Reader lost problem or replacement purpose")
    require(all(term in " ".join(row["fr"] for row in twelve["reader"]) for term in
                ("dessert à partager", "assiette de fromages", "café allongé",
                 "digestifs", "eau-de-vie")),
            "Core 12 Reader lost dessert, cheese, coffee, or digestif")
    print("French Dinner Core 1–12: source-pinned private drafts valid; "
          f"Core 11–12 have {sum(len(x['cards']) for x in draft['lessons'])} cards, "
          f"{sum(len(x['reader']) for x in draft['lessons'])} Reader turns, six modes each; "
          "reviewed:false, registered:false")


if __name__ == "__main__":
    main()
