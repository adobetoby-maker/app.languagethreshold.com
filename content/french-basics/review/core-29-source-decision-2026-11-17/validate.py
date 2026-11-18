#!/usr/bin/env python3
"""Read-only source and gate check for the inert Core 29 decision packet."""

import hashlib
import json
import pathlib
import subprocess

ROOT = pathlib.Path(__file__).resolve().parents[4]
PACKET = json.loads(pathlib.Path(__file__).with_name("decision.json").read_text())


def tracked_bytes(path: str) -> bytes:
    local = ROOT / path
    return local.read_bytes() if local.exists() else subprocess.check_output(
        ["git", "show", f"HEAD:{path}"], cwd=ROOT
    )


sources = {}
for path, expected in PACKET["sourceFileSHA256"].items():
    data = tracked_bytes(path)
    assert hashlib.sha256(data).hexdigest() == expected, f"source drift: {path}"
    sources[path] = json.loads(data)

core = sources["src/data/spanish-basics-core.json"]["lessons"][28]
practice = sources["src/data/spanish-basics-practice.json"]["spanish-basics"]["29"]
assert core["n"] == PACKET["lesson"] == 29
assert PACKET["stableLessonKey"] == "french-basics:29"
assert (core["title"], core["objective"], core["focus"]) == (
    PACKET["sourceTitleEnglish"], PACKET["sourceObjectiveEnglish"], PACKET["sourceFocusEnglish"]
)
assert practice["reading"]["title"] == PACKET["sourceReaderTitle"]
assert len(core["words"]) == len(PACKET["cards"]) == 14
assert len(practice["reading"]["target"]) == len(practice["reading"]["native"]) == len(PACKET["reader"]) == 6

for index, (source, row) in enumerate(zip(core["words"], PACKET["cards"]), 1):
    assert (row["position"], row["id"]) == (index, f"french-basics:29:card:{index}")
    assert (row["sourceSpanish"], row["sourceEnglish"], row["sourceKind"]) == (
        source["es"], source["en"], source["kind"]
    )
    assert row["selectedLearnerAnswer"] is None
for index, row in enumerate(PACKET["reader"], 1):
    assert (row["position"], row["id"]) == (index, f"french-basics:29:reader:{index}")
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (
        practice["reading"]["target"][index - 1],
        practice["reading"]["native"][index - 1],
    )
    assert row["selectedLearnerAnswer"] is None

assert [PACKET["cards"][i - 1]["conditionalFrenchCandidate"] for i in (2, 3)] == ["est", "est"]
assert PACKET["cards"][7]["conditionalFrenchCandidate"] == "par / à cause de"
assert PACKET["reader"][3]["sourceSpanish"] == "Gracias por tu ayuda."
assert PACKET["reader"][3]["conditionalFrenchCandidate"] == "Merci pour ton aide."
assert PACKET["reader"][4]["sourceSpanish"] == "Voy para la biblioteca."
assert {row["name"] for row in PACKET["modePreviews"]} == {"see", "recall", "hear", "type", "say", "write"}
for row in PACKET["modePreviews"]:
    assert row["id"] == f"french-basics:29:mode:{row['name']}"
    assert 1 <= row["sourceReaderTurn"] <= 6
    assert row["selectedLearnerAnswer"] is None
    assert row["readyForLearner"] is row["completedMode"] is row["recordedAudio"] is False
assert PACKET["issuesForQualifiedReview"] and all(value is False for value in PACKET["gates"].values())
print("PASS French 101 Core 29: exact source anchors, contextual contrasts, null answers and closed gates")
