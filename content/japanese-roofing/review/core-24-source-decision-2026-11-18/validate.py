#!/usr/bin/env python3
"""Independently check current source rows, IDs and all closed gates."""

import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
p = json.loads((HERE / "packet.json").read_text())
assert p["kind"] == "inert-source-review" and p["lessonId"] == "roofing:24:ja-en"
assert p["stageId"] == "roofing" and p["pair"] == {"target": "Japanese", "native": "English"}
assert len(p["cards"]) == 15 and len(p["reader"]) == 9
for name, pin in p["source"].items():
    assert hashlib.sha256((ROOT / pin["path"]).read_bytes()).hexdigest() == pin["sha256"], name

JS = r"""
import {build} from 'esbuild';
async function data(path) {
  const b = await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'));
}
const c=(await data('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[23];
const w=(await data('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[24];
const r=(await data('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[24];
process.stdout.write(JSON.stringify({title:c.title,objective:c.objective,speaking:c.steps[2].instruction,words:w,reader:r}));
"""
source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
assert p["sourceEnglishTitle"] == source["title"]
assert p["sourceEnglishObjective"] == source["objective"]
assert p["sourceEnglishSpeaking"] == source["speaking"]
for n, (row, word) in enumerate(zip(p["cards"], source["words"], strict=True), 1):
    assert row["id"] == f"roofing:24:ja-en:card:{n}"
    assert row["sourceSpanish"] == word["es"] and row["sourceEnglish"] == word["en"]
    assert row["kind"] == word["kind"] and row["sourceNoteSpanish"] == word.get("note")
    assert row["selectedJapanese"] is None and row["reviewed"] is False
    if row["reviewNote"]:
        assert row["candidateJapanese"] is None
for n, (row, es, en) in enumerate(zip(p["reader"], source["reader"]["es"], source["reader"]["en"], strict=True), 1):
    assert row["id"] == f"roofing:24:ja-en:line:{n}"
    assert row["sourceSpanish"] == es and row["sourceEnglish"] == en
    assert row["selectedJapanese"] is None and row["reviewed"] is False
    if row["reviewNote"]:
        assert row["candidateJapanese"] is None
archive = json.loads((ROOT / p["source"]["archivedDraft"]["path"]).read_text())["lessons"][0]
assert archive["n"] == 24 and archive["stableId"] == p["lessonId"]
assert len(archive["cards"]) == len(p["cards"]) and len(archive["reader"]) == len(p["reader"])
for row, old in zip(p["cards"], archive["cards"], strict=True):
    assert row["archivedEnglish"] == old["en"] and row["archivedJapanese"] == old["ja"]
for row, old in zip(p["reader"], archive["reader"], strict=True):
    assert row["archivedEnglish"] == old["en"] and row["archivedJapanese"] == old["ja"]
assert p["sourceVerbExamples"] is None
assert p["archivedForms"] == archive["forms"]
assert p["audioScript"] is None
assert p["reviewed"] is False and p["registered"] is False and p["audioRegistered"] is False
assert p["reviewGates"] and all(v is False for v in p["reviewGates"].values())
assert set(p["archivedModeLabels"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(x["authoredPromptTargetPair"] is False and x["readyForLearner"] is False
           for x in p["archivedModeLabels"].values())
print("PASS Japanese Roofing Core 24: 15 cards, 9 Reader lines, current source, IDs and closed gates")
