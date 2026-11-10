#!/usr/bin/env python3
"""Validate Master 12's source provenance and separate Japanese register pairs."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-roofing/source-english-master-12.json"
DRAFT = ROOT / "content/japanese-roofing/master-12-draft.json"

JS = """
import { MASTER_ROOFING_LESSONS } from './src/data/master-roofing-curriculum.ts';
import fs from 'node:fs';
const lessons = JSON.parse(fs.readFileSync('public/lesson-content/es/master-roofing.json')).lessons;
const l = MASTER_ROOFING_LESSONS[11];
console.log(JSON.stringify([{n:l.n,titleEnglish:l.title,
  objectiveEnglishSource:l.objective,
  speakingEnglishSource:l.steps.find(s => s.tab === 'speak').instruction,
  words:l.words.map(w => ({en:w.en,kind:w.kind})),
  readingEnglish:lessons['12'].passage.native,
  verbs:lessons['12'].verbs.map(v => ({meaningEnglish:v.native,
    exampleEnglish:v.example.native,sourceInfinitiveSpanish:v.infinitive}))}]));
"""


def main():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    current = json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", JS], cwd=ROOT, text=True))
    assert source == current, "Master 12 source anchors changed"
    draft = json.loads(DRAFT.read_text())
    assert (draft["moduleId"], draft["stage"], draft["target"], draft["native"]) == (
        "master-roofing", "master", "Japanese", "English")
    assert draft["state"] == "authored-draft-language-adapted"
    assert draft["reviewed"] is False and draft["registered"] is False and draft["audio"] == "none"
    assert not any(draft["reviewGates"].values())
    assert draft["languageAdaptation"]["sourceEnglishFieldsAreProvenanceOnly"] is True
    assert draft["englishSourceSubsetSHA256"] == hashlib.sha256(raw).hexdigest()
    for path, sha in draft["sourceFileSHA256"].items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == sha, path
    src, lesson = source[0], draft["lessons"][0]
    assert len(draft["lessons"]) == 1 and src["n"] == lesson["n"] == 12
    assert lesson["stableId"] == "master-roofing:12:ja-en" and lesson["reviewed"] is False
    assert lesson["sourceEnglishObjective"] == src["objectiveEnglishSource"]
    assert lesson["sourceEnglishSpeaking"] == src["speakingEnglishSource"]
    assert "sourceEnglish" not in lesson["speaking"]
    assert lesson["speaking"]["goalEn"].strip()
    assert [(c["sourceEnglish"], c["kind"]) for c in lesson["cards"]] == [
        (w["en"], w["kind"]) for w in src["words"]]
    assert [line["sourceEnglish"] for line in lesson["reader"]] == src["readingEnglish"]
    assert [form["sourceEnglish"] for form in lesson["forms"]] == src["verbs"]
    assert len(lesson["cards"]) == 22 and len(lesson["reader"]) == 16
    assert len(lesson["forms"]) == 5
    assert all(c["ja"].strip() and c["en"].strip() for c in lesson["cards"])
    assert all(line["ja"].strip() and line["en"].strip() for line in lesson["reader"])
    assert all(f["base"].strip() and f["exampleJa"].strip() and f["exampleEn"].strip()
               for f in lesson["forms"])
    assert set(lesson["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
    assert all(lesson["modes"].values())
    learner_text = json.dumps({
        "title": lesson["title"], "objective": lesson["objective"], "focus": lesson["focus"],
        "cards": [(c["ja"], c["en"]) for c in lesson["cards"]],
        "reader": [(line["ja"], line["en"]) for line in lesson["reader"]],
        "forms": [(f["base"], f["exampleJa"], f["exampleEn"]) for f in lesson["forms"]],
        "speaking": {k: v for k, v in lesson["speaking"].items() if k != "sourceEnglish"},
        "modes": lesson["modes"],
    }, ensure_ascii=False).lower()
    assert not any(term in learner_text for term in ("usted", "tú", "doña", "quisiera"))
    print("Japanese Roofing Master 12: source provenance, Japanese pairs, IDs and false gates pass")


if __name__ == "__main__":
    main()
