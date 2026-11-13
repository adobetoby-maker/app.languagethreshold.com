#!/usr/bin/env python3
"""Check the exact source and closed gates of French Dinner Master 6."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MODES = {"see", "recall", "hear", "type", "say", "write"}


def main():
    batch = json.loads((HERE / "master-6-draft.json").read_text())
    source = batch["source"]
    for path_key, hash_key in (("curriculumPath", "curriculumSHA256"),
                               ("passagePath", "passageSHA256")):
        path = ROOT / source[path_key]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == source[hash_key]
    lesson = batch["lessons"][0]
    master = json.loads((ROOT / source["curriculumPath"]).read_text())["lessons"][5]
    passage = json.loads((ROOT / source["passagePath"]).read_text())["lessons"]["6"]["passage"]["native"]
    assert (batch["courseId"], batch["stageId"], batch["pairKey"], batch["locale"]) == (
        "travel-dinner", "master-travel-dinner", "French:English", "fr-FR")
    assert batch["reviewed"] is batch["registered"] is batch["readyForLearner"] is lesson["reviewed"] is False
    assert batch["audio"] == "none" and lesson["stableId"] == "master-travel-dinner:6:fr-en"
    assert (lesson["sourceTitleEnglish"], lesson["sourceObjectiveEnglish"],
            lesson["sourceSpeakingEnglish"]) == (master["title"], master["objective"], master["speaking"])
    assert [card["en"] for card in lesson["cards"]] == [word["en"] for word in master["words"]]
    assert [card["kind"] for card in lesson["cards"]] == [word["kind"] for word in master["words"]]
    assert [turn["en"] for turn in lesson["reader"]] == passage
    assert len(lesson["cards"]) == 24 and len(lesson["reader"]) == 18
    assert len({card["fr"] for card in lesson["cards"]}) == 24
    assert all(entry["fr"].strip() for entry in lesson["cards"] + lesson["reader"])
    assert len(lesson["forms"]) == 5 and all(form.get("infinitive") and form.get("example")
           and form.get("meaning") for form in lesson["forms"])
    assert set(lesson["modes"]) == MODES
    assert len({mode["sourceCard"] for mode in lesson["modes"].values()}) == 6
    for name, mode in lesson["modes"].items():
        assert lesson["cards"][mode["sourceCard"] - 1]["en"] == mode["cueEnglish"]
        assert mode["responseKind"] == ("open" if name in ("say", "write") else "fixed")
    assert lesson["speaking"]["opening"] and lesson["speaking"]["closure"]
    assert len(lesson["speaking"]["wordBank"]) >= 6
    assert set(lesson["speaking"]["wordBank"]) <= {card["fr"] for card in lesson["cards"]}
    french = " ".join(turn["fr"] for turn in lesson["reader"])
    assert all(word in french for word in ("Lima", "Renzo", "Alex", "Sam", "58 soles", "48 soles", "38 soles", "15 minutes"))
    assert "pota" in french and "pejerrey" in french and "noix de Saint-Jacques" in french
    assert "ceviche de sole" in lesson["cards"][23]["fr"]
    print("French Dinner Master 6: 24 exact source cards, 18 aligned Reader lines, six modes and closed gates PASS")


if __name__ == "__main__":
    main()
