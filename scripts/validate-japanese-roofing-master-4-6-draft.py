#!/usr/bin/env python3
"""Validate Japanese Roofing Master 4–6 against live English source anchors."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-roofing/source-english-master-4-6.json"
DRAFT = ROOT / "content/japanese-roofing/master-4-6-draft.json"

js = """
import { MASTER_ROOFING_LESSONS } from './src/data/master-roofing-curriculum.ts';
import fs from 'node:fs';
const lessons = JSON.parse(fs.readFileSync('public/lesson-content/es/master-roofing.json')).lessons;
console.log(JSON.stringify(MASTER_ROOFING_LESSONS.slice(3,6).map(l => ({
  n:l.n, titleEnglish:l.title, objectiveEnglishSource:l.objective,
  speakingEnglishSource:l.steps.find(s => s.tab === 'speak').instruction,
  words:l.words.map(w => ({en:w.en,kind:w.kind})),
  readingEnglish:lessons[String(l.n)].passage.native,
  verbs:lessons[String(l.n)].verbs.map(v => ({meaningEnglish:v.native,
    exampleEnglish:v.example.native,sourceInfinitiveSpanish:v.infinitive}))
}))));
"""

def main():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    draft = json.loads(DRAFT.read_text())
    current = json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", js], cwd=ROOT, text=True
    ))
    assert source == current, "English source anchors changed"
    assert (draft["moduleId"], draft["stage"], draft["target"], draft["native"]) == (
        "master-roofing", "master", "Japanese", "English")
    assert draft["state"] == "authored-draft-partial"
    assert draft["reviewed"] is False and draft["registered"] is False and draft["audio"] == "none"
    assert not any(draft["reviewGates"].values())
    assert draft["englishSourceSubsetSHA256"] == hashlib.sha256(raw).hexdigest()
    for path, sha in draft["sourceFileSHA256"].items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == sha, path
    assert [x["n"] for x in draft["lessons"]] == [4, 5, 6]
    for lesson, anchor in zip(draft["lessons"], source):
        n = anchor["n"]
        assert lesson["stableId"] == f"master-roofing:{n}:ja-en"
        assert lesson["reviewed"] is False
        assert lesson["titleEnglish"] == anchor["titleEnglish"]
        assert lesson["sourceEnglishObjective"] == anchor["objectiveEnglishSource"]
        assert lesson["sourceEnglishSpeaking"] == anchor["speakingEnglishSource"]
        assert [(w["en"], w["kind"]) for w in lesson["cards"]] == [
            (w["en"], w["kind"]) for w in anchor["words"]]
        assert [line["en"] for line in lesson["reader"]] == anchor["readingEnglish"]
        assert [tuple(v[k] for k in ("meaningEnglish", "exampleEnglish", "sourceInfinitiveSpanish"))
                for v in lesson["forms"]] == [
            tuple(v[k] for k in ("meaningEnglish", "exampleEnglish", "sourceInfinitiveSpanish"))
            for v in anchor["verbs"]]
        assert len(lesson["reader"]) >= 7 and len(lesson["cards"]) >= 10
        assert all(w["ja"].strip() for w in lesson["cards"])
        assert all(line["ja"].strip() for line in lesson["reader"])
        assert all(v["base"].strip() and v["exampleJa"].strip() for v in lesson["forms"])
        assert set(lesson["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
        assert all(lesson["modes"].values())
    print("Japanese Roofing Master 4–6: source hashes, exact English pairs, IDs and false gates pass")

if __name__ == "__main__":
    main()
