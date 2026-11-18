#!/usr/bin/env python3
"""Independently check current Spanish/English rows, stable IDs, and closed gates."""
import hashlib
import json
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
N = int(re.search(r"master-(\d+)-source-decision", HERE.name).group(1))
p = json.loads((HERE / "packet.json").read_text())
assert p["kind"] == "inert-source-review"
assert p["lessonId"] == f"master-roofing:{N}:ja-en"
assert p["stageId"] == "master-roofing"
assert p["pair"] == {"target": "Japanese", "native": "English"}
for pin in p["source"].values():
    assert hashlib.sha256((ROOT / pin["path"]).read_bytes()).hexdigest() == pin["sha256"]
JS = r"""
import {build} from 'esbuild';
const b=await build({entryPoints:['src/data/master-roofing-curriculum.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
process.stdout.write(JSON.stringify(m.MASTER_ROOFING_LESSONS[Number(process.argv[1])-1]));
"""
lesson = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS, str(N)], cwd=ROOT, text=True))
source = json.loads((ROOT / p["source"]["sourceContent"]["path"]).read_text())["lessons"][str(N)]
old = json.loads((ROOT / p["source"]["archivedDraft"]["path"]).read_text())["lessons"][N - 1]
assert lesson["n"] == old["n"] == N
assert p["sourceEnglishTitle"] == lesson["title"]
assert p["sourceEnglishObjective"] == lesson["objective"]
assert p["sourceEnglishSpeaking"] == lesson["steps"][2]["instruction"]
assert p["sourceSpanishReaderTitle"] == source["passage"]["title"]
assert p["sourceGrammarFocus"] == lesson["grammar"]["focus"]
assert p["sourceGrammarExamples"] == lesson["grammar"]["examples"]
assert p["sourceVerbExamples"] == source["verbs"]
for i, (row, word, draft) in enumerate(zip(p["cards"], lesson["words"], old["cards"], strict=True), 1):
    assert row["id"] == f"master-roofing:{N}:ja-en:card:{i}"
    assert row["sourceSpanish"] == word["es"] and row["sourceEnglish"] == word["en"]
    assert row["kind"] == word["kind"] and row["sourceNoteSpanish"] == word.get("note")
    assert row["archivedJapanese"] == draft["ja"] and row["archivedEnglish"] == draft["en"]
    assert row["selectedJapanese"] is None and row["reviewed"] is False
    if row["reviewNote"]:
        assert row["candidateJapanese"] is None
for i, (row, es, en, draft) in enumerate(zip(p["reader"], source["passage"]["target"], source["passage"]["native"], old["reader"], strict=True), 1):
    assert row["id"] == f"master-roofing:{N}:ja-en:line:{i}"
    assert row["sourceSpanish"] == es and row["sourceEnglish"] == en
    assert row["archivedJapanese"] == draft["ja"] and row["archivedEnglish"] == draft["en"]
    assert row["selectedJapanese"] is None and row["reviewed"] is False
    if row["reviewNote"]:
        assert row["candidateJapanese"] is None
assert p["archivedForms"] == old["forms"] and p["archivedSpeaking"] == old["speaking"]
assert p["audioScript"] is None
assert p["reviewed"] is False and p["registered"] is False and p["audioRegistered"] is False
assert p["reviewGates"] and all(v is False for v in p["reviewGates"].values())
assert set(p["archivedModeLabels"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(v["authoredPromptTargetPair"] is False and v["readyForLearner"] is False for v in p["archivedModeLabels"].values())
print(f"PASS Japanese Roofing Master {N}: {len(p['cards'])} cards, {len(p['reader'])} Reader lines, source/IDs/gates")
