#!/usr/bin/env python3
"""Validate current source anchors and every closed gate in the Core 30 decision."""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
subprocess.run([sys.executable, str(HERE / "build.py"), "--check"], check=True)
record = json.loads((HERE / "decision.json").read_text(encoding="utf-8"))
packet = json.loads((ROOT / record["existingPacket"]["path"]).read_text(encoding="utf-8"))
source = json.loads((ROOT / record["source"]["path"]).read_text(encoding="utf-8"))["lessons"]["30"]
conflict = packet["unresolvedConflict"]

assert record["lessonKey"] == packet["lessonKey"] == "core:30"
assert record["pair"] == packet["pair"] == {"target": "French", "support": "English"}
assert record["sourceRevisionSelection"] is None
assert record["selectedFrenchAnswer"] is None
assert record["selectedWritePrompt"] is None and record["selectedWriteTarget"] is None
assert packet["reader"][3]["id"] == record["alignedDependencies"]["heldReaderId"]
assert packet["reader"][3]["targetFrenchDraft"] is None
assert record["alignedDependencies"]["dependentCardIds"] == conflict["progressIdentity"]["dependentCardIds"]
assert all(mode in packet["modeInputIdsDraft"] for mode in record["alignedDependencies"]["modeInputIdsAreOnlyLists"])
for field in ("authoredModePromptTargets", "writeActivityId", "writePrompt", "writeTarget", "speakingActivity", "revisionScopedRowIds"):
    assert record["alignedDependencies"][field] is None
assert len(record["conditionalBranchesNotSelected"]) == 2
current, alternative = record["conditionalBranchesNotSelected"]
assert current["sourceSpanish"] == source["passage"]["target"][3] == conflict["currentSourceSpanish"]
assert current["supportEnglish"] == source["passage"]["native"][3] == conflict["currentSupportEnglish"]
assert alternative["sourceRevision"] == conflict["unmergedAlternativeSource"]["commit"]
assert alternative["sourceFileSha256"] == conflict["unmergedAlternativeSource"]["sha256"]
assert alternative["sourceSpanish"] == conflict["unmergedAlternativeSource"]["sourceSpanish"]
assert alternative["supportEnglish"] == conflict["unmergedAlternativeSource"]["supportEnglish"]
assert alternative["frenchCandidateNotSelected"] == conflict["archivedTargetFrench"]
assert current["frenchCandidateNotSelected"] and alternative["frenchCandidateNotSelected"]
assert current["frenchCandidateNotSelected"] != alternative["frenchCandidateNotSelected"]
assert record["gates"] == packet["gates"] and all(value is False for value in record["gates"].values())
assert len(record["qualifiedReviewQuestionsInternal"]) >= 5
print("PASS French Breakfast Core 30 source branches, IDs, null answers and closed gates")
