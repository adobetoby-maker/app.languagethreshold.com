#!/usr/bin/env python3
"""Check source fidelity, stable IDs and closed gates through French Dinner Core 19."""

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


def main():
    runpy.run_path(str(HERE / "verify-private-core-1-18.py"))["main"]()
    previous = [json.loads((HERE / name).read_text()) for name in (
        "core-1-3-draft.json", "core-4-6-draft.json", "core-7-9-draft.json",
        "core-10-draft.json", "core-11-12-draft.json", "core-13-draft.json", "core-14-draft.json", "core-15-draft.json", "core-16-draft.json", "core-17-draft.json", "core-18-draft.json")]
    draft = json.loads((HERE / "core-19-draft.json").read_text())
    source = previous[0]["source"]
    require(draft["source"] == source, "Core 19 source pin changed")
    for path, expected_hash in ((source["curriculumPath"], source["curriculumSHA256"]),
                                (source["passagePath"], source["passageSHA256"])):
        file = ROOT / path
        raw = file.read_bytes() if file.exists() else subprocess.check_output(
            ["git", "show", f"{source['revision']}:{path}"], cwd=ROOT)
        require(hashlib.sha256(raw).hexdigest() == expected_hash,
                f"Core 19 pinned source changed: {path}")
    require((draft["courseId"], draft["stageId"], draft["pairKey"], draft["locale"],
             draft["reviewed"], draft["registered"], draft["readyForLearner"],
             draft["audio"]) == ("travel-dinner", "travel-dinner", "French:English",
                                 "fr-FR", False, False, False, "none"),
            "Core 19 pair or release gate changed")
    require(len(draft["lessons"]) == 1, "Expected one Core 19 lesson")
    lesson = draft["lessons"][0]
    ids = [x["stableId"] for batch in previous for x in batch["lessons"]] + [lesson["stableId"]]
    require(ids == [f"travel-dinner:{n}:fr-en" for n in range(1, 20)],
            "Core 1–19 stage-local IDs changed")
    curriculum = (ROOT / source["curriculumPath"]).read_text()
    plan = curriculum.split('id: "travel-dinner",', 1)[1]
    source_lessons = re.findall(r'lesson\(\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"', plan)
    require(tuple(lesson[k] for k in ("sourceTitleEnglish", "sourceObjectiveEnglish",
                                     "sourceSpeakingEnglish")) == source_lessons[18],
            "Core 19 objective changed")
    original = json.loads((ROOT / source["passagePath"]).read_text())["lessons"]["19"]
    require(len(original["words"]) >= 15 and len(original["passage"]["target"]) ==
            len(original["passage"]["native"]) >= 7, "Spanish Core 19 source incomplete")
    require((lesson["n"], lesson["reviewed"]) == (19, False), "Core 19 gate changed")
    require(all(lesson[k].strip() for k in ("title", "objective", "focus", "scene")),
            "Core 19 teaching incomplete")
    require(len(lesson["forms"]) >= 2 and all(f.get("infinitive") and f.get("meaning") and
            any(k.startswith("present") or k.startswith("past") for k in f)
            for f in lesson["forms"]), "Core 19 French forms incomplete")
    cards, reader, speaking = lesson["cards"], lesson["reader"], lesson["speaking"]
    require(18 <= len(cards) <= 24 and 8 <= len(reader) <= 12,
            "Core 19 card/Reader count changed")
    card_texts = [c["fr"] for c in cards]
    require(len(set(card_texts)) == len(card_texts) and all(c.get("fr") and c.get("en") and
            c.get("kind") in ("term", "phrase") for c in cards), "Core 19 cards invalid")
    require(all(t.get("speaker") and t.get("fr") and t.get("en") for t in reader),
            "Core 19 Reader unaligned")
    require([t["en"] for t in reader] == original["passage"]["native"],
            "Core 19 Reader English diverged from pinned source")
    require(all(speaking.get(k) for k in ("role", "partnerRole", "opening", "goal", "closure"))
            and len(speaking["wordBank"]) >= 6 and
            all(w in card_texts for w in speaking["wordBank"]),
            "Core 19 speaking bank invalid")
    require(set(lesson["modes"]) == MODES and
            len({m["sourceCard"] for m in lesson["modes"].values()}) == 6,
            "Core 19 mode anchors missing or repeated")
    for name, prompt in lesson["modes"].items():
        require(prompt.get("cueEnglish") and 1 <= prompt["sourceCard"] <= len(cards) and
                prompt.get("responseKind") == ("open" if name in ("say", "write") else "fixed"),
                f"Core 19 invalid {name} prompt")
    french = " ".join(t["fr"] for t in reader)
    require(all(phrase in french for phrase in (
        "réservation de 20 h", "entrée sans marches", "rampe d’accès",
        "déambulateur", "n’entend pas bien", "table au calme",
        "loin des haut-parleurs", "toilettes", "bon éclairage")),
        "Core 19 lost accessible-seating source purpose")
    print("French Dinner Core 1–19 source-pinned draft valid; Core 19 has "
          f"{len(cards)} cards, {len(reader)} Reader turns, six modes; "
          "reviewed:false, registered:false")


if __name__ == "__main__":
    main()
