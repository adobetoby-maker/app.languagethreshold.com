#!/usr/bin/env python3
"""Independently check current source rows, IDs and all closed gates."""

import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
p = json.loads((HERE / "packet.json").read_text())
assert p["kind"] == "inert-source-review" and p["lessonId"] == "roofing:7:ja-en"
assert p["stageId"] == "roofing" and p["pair"] == {"target": "Japanese", "native": "English"}
assert len(p["cards"]) == 15 and len(p["reader"]) == 9 and len(p["sourceVerbExamples"]) == 5
for name, pin in p["source"].items():
    assert hashlib.sha256((ROOT / pin["path"]).read_bytes()).hexdigest() == pin["sha256"], name

JS = r"""
import {build} from 'esbuild';
async function data(path) {
  const b = await build({entryPoints:[path],bundle:true,platform:'node',format:'esm',write:false});
  return import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'));
}
const c=(await data('src/data/roofing-curriculum.ts')).ROOFING_LESSONS[6];
const w=(await data('src/data/roofing-lesson-words.ts')).ROOFING_LESSON_WORDS[7];
const r=(await data('src/data/roofing-lesson-passages.ts')).ROOFING_LESSON_PASSAGES[7];
process.stdout.write(JSON.stringify({title:c.title,objective:c.objective,speaking:c.steps[2].instruction,words:w,reader:r}));
"""
source = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
assert p["sourceEnglishTitle"] == source["title"]
assert p["sourceEnglishObjective"] == source["objective"]
assert p["sourceEnglishSpeaking"] == source["speaking"]
for n, (row, word) in enumerate(zip(p["cards"], source["words"], strict=True), 1):
    assert row["id"] == f"roofing:7:ja-en:card:{n}"
    assert row["sourceSpanish"] == word["es"] and row["sourceEnglish"] == word["en"]
    assert row["kind"] == word["kind"] and row["sourceNoteSpanish"] == word.get("note")
    assert row["selectedJapanese"] is None and row["audioScript"] is None and row["reviewed"] is False
    if row["reviewNote"]:
        assert row["candidateJapanese"] is None
for n, (row, es, en) in enumerate(zip(p["reader"], source["reader"]["es"], source["reader"]["en"], strict=True), 1):
    assert row["id"] == f"roofing:7:ja-en:line:{n}"
    assert row["sourceSpanish"] == es and row["sourceEnglish"] == en
    assert row["selectedJapanese"] is None and row["audioScript"] is None and row["reviewed"] is False
    if row["reviewNote"]:
        assert row["candidateJapanese"] is None
assert p["orderedSourceRowsSha256"] == hashlib.sha256(json.dumps([[row["sourceSpanish"], row["sourceEnglish"]] for row in p["cards"] + p["reader"]], ensure_ascii=False, separators=(",", ":")).encode()).hexdigest()
verbs = json.loads((ROOT / "public/lesson-content/es/roofing.json").read_text())["lessons"]["7"]["verbs"]
for row, v in zip(p["sourceVerbExamples"], verbs, strict=True):
    assert row["spanishInfinitive"] == v["infinitive"] and row["englishMeaning"] == v["native"]
    assert row["sourceSpanish"] == v["example"]["target"] and row["sourceEnglish"] == v["example"]["native"]
    assert row["sourceNote"] == v.get("note")
assert p["audioScript"] is None
assert p["reviewed"] is False and p["registered"] is False and p["audioRegistered"] is False
assert p["reviewGates"] and all(v is False for v in p["reviewGates"].values())
assert set(p["archivedModeLabels"]) == {"see", "recall", "hear", "type", "say", "write"}
assert all(x["authoredPromptTargetPair"] is False and x["readyForLearner"] is False
           for x in p["archivedModeLabels"].values())
print("PASS Japanese Roofing Core 7: 15 cards, 9 Reader lines, current source, IDs and closed gates")
