#!/usr/bin/env python3
"""Fail closed if Core 30 source/conflict evidence or runtime gates drift."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "core-30.json").read_text())
manifest = json.loads((HERE / "manifest.json").read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


source_path = ROOT / packet["source"]["path"]
prior_path = ROOT / packet["priorDraft"]["path"]
assert sha(source_path) == packet["source"]["sha256"] == manifest["sourceSha256"]
assert sha(prior_path) == packet["priorDraft"]["sha256"] == manifest["priorDraftSha256"]
assert sha(ROOT / "docs/french-program/breakfast-roofing-private-source-triage-2026-11-14.md") == manifest["triageSha256"]
assert sha(HERE / "core-30.json") == manifest["packetSha256"]
source = json.loads(source_path.read_text())["lessons"]["30"]
prior = next(x for x in json.loads(prior_path.read_text())["lessons"] if x["stage"] == "core" and x["n"] == 30)
assert packet["lessonKey"] == "core:30"
assert len(packet["cards"]) == len(source["words"]) == 17
assert len(packet["reader"]) == len(source["passage"]["native"]) == 9
for n, (row, src) in enumerate(zip(packet["cards"], source["words"]), 1):
    assert row["id"] == f"core:30:word:{n}"
    assert row["sourceSpanish"] == src["es"] and row["supportEnglish"] == src["en"]
    assert row["targetFrenchDraft"] and row["kind"] == src["kind"]
for n, (row, es, en) in enumerate(zip(packet["reader"], source["passage"]["target"], source["passage"]["native"]), 1):
    assert row["id"] == f"core:30:line:{n}"
    assert row["sourceSpanish"] == es and row["supportEnglish"] == en
    assert (row["targetFrenchDraft"] is None) == (n == 4)
conflict = packet["unresolvedConflict"]
assert conflict["id"] == "core:30:line:4"
assert conflict["currentSourceSpanish"] == source["passage"]["target"][3]
assert conflict["currentSupportEnglish"] == source["passage"]["native"][3]
assert conflict["archivedSupportEnglish"] == prior["reader"][3]["supportEnglish"]
assert conflict["archivedTargetFrench"] == prior["reader"][3]["targetFrench"]
assert conflict["archivedSupportEnglish"] != conflict["currentSupportEnglish"]
assert conflict["unmergedAlternativeSource"]["supportEnglish"] == conflict["archivedSupportEnglish"]
assert conflict["unmergedAlternativeSource"]["commit"] == "919ee4af0e79cc4bf44f61f880e4a5eb6916c9c1"
assert conflict["selectedFrenchAnswer"] is None and conflict["selectedWritePrompt"] is None and conflict["selectedWriteTarget"] is None
assert conflict["progressIdentity"]["reuseDecision"] == "blocked"
assert packet["speakingDraft"] is None and packet["authoredModeActivities"] is None
for mode in ("see", "recall", "hear", "type", "say", "write"):
    assert packet["modeInputIdsDraft"][mode] == [f"core:30:word:{n}" for n in range(1, 18)]
assert packet["gates"] == manifest["gates"] and all(v is False for v in packet["gates"].values())
print("Core30 pinned source/ID/conflict/closed-gate validator PASS")
