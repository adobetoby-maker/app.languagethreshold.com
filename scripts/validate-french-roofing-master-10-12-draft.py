#!/usr/bin/env python3
"""Validate private French Roofing Master 10–12 against its exact English source."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
DRAFT = CONTENT / "master-10-12-draft.json"
SOURCE = CONTENT / "source-english-master-10-12.json"


def main() -> None:
    draft = json.loads(DRAFT.read_text())
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    assert (draft["moduleId"], draft["stage"], draft["target"], draft["native"]) == ("roofing", "master", "French", "English")
    assert draft["state"] == "translation-draft" and draft["reviewed"] is False
    assert draft["englishSourceSubsetSHA256"] == hashlib.sha256(source_bytes).hexdigest()
    for path, expected in draft["sourceFileSHA256"].items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == expected, path

    js = """
import { MASTER_ROOFING_LESSONS } from './src/data/master-roofing-curriculum.ts';
import fs from 'node:fs';
const content = JSON.parse(fs.readFileSync('public/lesson-content/es/master-roofing.json')).lessons;
console.log(JSON.stringify(MASTER_ROOFING_LESSONS.slice(9,12).map(l => ({
  n:l.n,titleEnglish:l.title,objectiveEnglishSource:l.objective,
  focusEnglishSource:l.grammar?.focus,lessonType:l.lessonType,block:l.block,
  speakingEnglishSource:l.steps.find(s=>s.tab==='speak').instruction,
  words:l.words.map(w=>({en:w.en,kind:w.kind})),
  grammarExamplesEnglish:l.grammar?.examples?.map(x=>x.en),
  readingEnglish:content[String(l.n)].passage.native,
  verbs:content[String(l.n)].verbs.map(v=>({meaningEnglish:v.native,
    exampleEnglish:v.example.native,sourceInfinitiveSpanish:v.infinitive}))
}))));
"""
    current = json.loads(subprocess.check_output(["node", "--input-type=module", "-e", js], cwd=ROOT, text=True))
    assert source == current, "English source subset differs from current course"
    assert [x["n"] for x in draft["lessons"]] == [10, 11, 12]
    for lesson, original in zip(draft["lessons"], source):
        assert lesson["reviewed"] is False
        for field in ("n", "titleEnglish", "objectiveEnglishSource", "focusEnglishSource", "lessonType", "block", "speakingEnglishSource", "grammarExamplesEnglish"):
            assert lesson[field] == original[field], field
        assert [(w["en"], w["kind"]) for w in lesson["words"]] == [(w["en"], w["kind"]) for w in original["words"]]
        assert lesson["reading"]["native"] == original["readingEnglish"]
        assert len(lesson["reading"]["target"]) == len(original["readingEnglish"])
        if lesson["n"] in (10, 11, 12):
            assert len(lesson["reading"]["nativeDisplay"]) == len(original["readingEnglish"])
        if lesson["n"] == 11:
            assert "local emergency services" in lesson["reading"]["nativeDisplay"][11]
            assert "Heatstroke" in lesson["reading"]["nativeDisplay"][11]
            assert "Le coup de chaleur" in lesson["reading"]["target"][11]
            assert "le coup de chaleur signifie heatstroke" in lesson["teachingNotesFrench"]
            assert "site plan" in lesson["words"][15]["enDisplay"]
        assert [(v["meaningEnglish"], v["exampleEnglish"], v["sourceInfinitiveSpanish"]) for v in lesson["verbs"]] == [
            (v["meaningEnglish"], v["exampleEnglish"], v["sourceInfinitiveSpanish"]) for v in original["verbs"]
        ]
        assert all(w["fr"].strip() for w in lesson["words"])
        assert all(line.strip() for line in lesson["reading"]["target"])
        assert all(v["infinitiveFrench"].strip() and v["exampleFrench"].strip() for v in lesson["verbs"])
        assert all(lesson[k].strip() for k in ("titleFrench", "objectiveFrench", "grammarFocusFrench", "speakingFrenchInstruction", "speakingFrenchOpening", "teachingNotesFrench"))
        assert set(lesson["practiceModesFrench"]) == {"see", "recall", "hear", "type", "say", "write"}
        assert all(prompt.strip() for prompt in lesson["practiceModesFrench"].values())
        assert any("Qualified" in note for note in lesson["reviewGapsEnglish"])
    assert "plan de sécurité" in draft["lessons"][0]["teachingNotesFrench"]
    assert "protocole d’urgence" in draft["lessons"][1]["teachingNotesFrench"]
    assert "tu et vous" in draft["lessons"][2]["teachingNotesFrench"]
    print("French Roofing Master 10–12: source hashes, exact English pairs, stage IDs and draft gates pass")


if __name__ == "__main__":
    main()
