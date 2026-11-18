#!/usr/bin/env python3
"""Independently compare the packet with the current app curriculum and Reader."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
packet = json.loads((HERE / "packet.json").read_text())
assert packet["kind"] == "inert-source-decision"
assert packet["pair"] == {"target": "English", "native": "French"}
assert packet["stageId"] == "foundation-roofing"
assert packet["proposedLessonId"] == "foundation-roofing:1:fr-en"

for source in packet["source"].values():
    path = ROOT / source["path"]
    assert path.is_file() and hashlib.sha256(path.read_bytes()).hexdigest() == source["sha256"]

# esbuild executes the TypeScript curriculum rather than repeating build.py's regex parser.
js = """import esbuild from 'esbuild';
const built = await esbuild.build({entryPoints:['src/data/foundation-roofing-curriculum.ts'],bundle:true,platform:'node',format:'esm',write:false});
const mod = await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
console.log(JSON.stringify({lesson:mod.FOUNDATION_ROOFING_LESSONS[0],focus:mod.FOUNDATION_ROOFING_FOCUS[1]}));"""
actual = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], cwd=ROOT, text=True))
lesson = actual["lesson"]
source_reader = json.loads((ROOT / packet["source"]["reader"]["path"]).read_text())["lessons"]["1"]["passage"]
assert lesson["n"] == 1
assert packet["sourceTitleEnglish"] == lesson["title"]
assert packet["sourceObjectiveEnglish"] == lesson["objective"]
assert packet["sourceFocusEnglish"] == actual["focus"]
assert packet["sourceSpeakingEnglish"] == lesson["steps"][2]["instruction"]
assert len(packet["cards"]) == len(lesson["words"]) == 12
assert len(packet["reader"]) == len(source_reader["target"]) == len(source_reader["native"]) == 7

all_ids = set()
for index, (card, word) in enumerate(zip(packet["cards"], lesson["words"]), 1):
    assert card["sourcePosition"] == index
    assert card["sourceSpanish"] == word["es"] and card["sourceEnglish"] == word["en"]
    assert card["proposedId"] == f"foundation-roofing:1:fr-en:card:{index}"
    assert card["selectedFrench"] is None and card["audioScript"] is None and card["reviewed"] is False
    assert card["proposedId"] not in all_ids
    all_ids.add(card["proposedId"])
for index, (line, es, en) in enumerate(zip(packet["reader"], source_reader["target"], source_reader["native"]), 1):
    assert line["sourcePosition"] == index
    assert line["sourceSpanish"] == es and line["sourceEnglish"] == en
    assert line["proposedId"] == f"foundation-roofing:1:fr-en:line:{index}"
    assert line["selectedFrench"] is None and line["audioScript"] is None and line["reviewed"] is False
    assert line["proposedId"] not in all_ids
    all_ids.add(line["proposedId"])

assert packet["cards"][1]["candidateFrench"] is None
assert packet["reader"][3]["candidateFrench"] is None
assert packet["reader"][4]["candidateFrench"] is None
assert packet["reader"][4]["archivedEnglish"] != packet["reader"][4]["sourceEnglish"]
assert packet["progressIdentity"]["archivedDraftModuleId"] == "roofing"
assert packet["progressIdentity"]["sourceStageId"] == "foundation-roofing"
assert packet["progressIdentity"]["legacyProgressImportApproved"] is False
assert packet["progressIdentity"]["progressWriteEnabled"] is False
assert packet["progressIdentity"]["rowIdsAreProposedOnly"] is True
assert packet["archivedModeEvidence"]["sixAuthoredPromptTargetPairs"] is False
assert packet["archivedModeEvidence"]["learnerReady"] is False
assert packet["reviewGates"] and all(value is False for value in packet["reviewGates"].values())
assert packet["reviewed"] is False and packet["registered"] is False and packet["audioRegistered"] is False
print("PASS French Roofing Foundation 1: 12 current cards, seven Reader turns, proposed stable IDs, held conflicts and closed gates")
