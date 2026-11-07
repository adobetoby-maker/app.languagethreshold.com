#!/usr/bin/env python3
"""Check private French Roofing Core 22–24 against the exact English source."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/french-roofing"
DRAFT = CONTENT / "core-22-24-draft.json"
SOURCE = CONTENT / "source-english-core-22-24.json"


def main() -> None:
    draft = json.loads(DRAFT.read_text())
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)["lessons"]
    assert (draft["moduleId"], draft["stage"], draft["target"], draft["native"]) == (
        "roofing", "core", "French", "English"
    )
    assert draft["state"] == "translation-draft" and draft["reviewed"] is False
    assert draft["englishSourceSubsetSHA256"] == hashlib.sha256(source_bytes).hexdigest()
    for path, expected in draft["sourceFileSHA256"].items():
        assert hashlib.sha256((ROOT / path).read_bytes()).hexdigest() == expected, path

    # Re-extract the English anchors from the TypeScript source, independently of the pinned JSON.
    js = """
import { ROOFING_LESSONS } from './src/data/roofing-curriculum.ts';
import { ROOFING_LESSON_PASSAGES } from './src/data/roofing-lesson-passages.ts';
import fs from 'node:fs';
const verbs = JSON.parse(fs.readFileSync('public/lesson-content/es/roofing.json')).lessons;
console.log(JSON.stringify(ROOFING_LESSONS.slice(21,24).map(l => ({
  n:l.n, titleEnglish:l.title, objectiveEnglishSource:l.objective,
  speakingEnglishSource:l.steps.find(s => s.tab === 'speak').instruction,
  words:l.words.map(w => ({en:w.en,kind:w.kind})),
  readingEnglish:ROOFING_LESSON_PASSAGES[l.n].en,
  verbs:verbs[String(l.n)].verbs.map(v => ({meaningEnglish:v.native,
    exampleEnglish:v.example.native,sourceInfinitiveSpanish:v.infinitive}))
}))));
"""
    current = json.loads(subprocess.check_output(
        ["node", "--input-type=module", "-e", js], cwd=ROOT, text=True
    ))
    assert source == current, "English source subset differs from current course"
    assert [x["n"] for x in draft["lessons"]] == [22, 23, 24]
    heat = draft["lessons"][2]
    assert "l’épuisement dû à la chaleur correspond à heat exhaustion" in heat["teachingNotesFrench"]
    assert "ne posez pas de diagnostic" not in heat["speakingFrenchInstruction"]
    for lesson, original in zip(draft["lessons"], source):
        assert lesson["reviewed"] is False
        for field in ("n", "titleEnglish", "objectiveEnglishSource", "speakingEnglishSource"):
            assert lesson[field] == original[field], field
        assert [(w["en"], w["kind"]) for w in lesson["words"]] == [
            (w["en"], w["kind"]) for w in original["words"]
        ]
        assert lesson["reading"]["native"] == original["readingEnglish"]
        assert len(lesson["reading"]["target"]) == len(original["readingEnglish"])
        assert [(v["meaningEnglish"], v["exampleEnglish"], v["sourceInfinitiveSpanish"])
                for v in lesson["verbs"]] == [
            (v["meaningEnglish"], v["exampleEnglish"], v["sourceInfinitiveSpanish"])
            for v in original["verbs"]
        ]
        assert all(w["fr"].strip() for w in lesson["words"])
        assert all(line.strip() for line in lesson["reading"]["target"])
        assert all(v["infinitiveFrench"].strip() and v["exampleFrench"].strip()
                   for v in lesson["verbs"])
        assert set(lesson["practiceModesFrench"]) == {"see", "recall", "hear", "type", "say", "write"}
        assert all(prompt.strip() for prompt in lesson["practiceModesFrench"].values())
        assert all(lesson[k].strip() for k in (
            "titleFrench", "objectiveFrench", "speakingFrenchInstruction",
            "speakingFrenchOpening", "grammarFocusFrench", "teachingNotesFrench"
        ))
    assert all("Qualified" in lesson["regionalNotesEnglish"][0] for lesson in draft["lessons"])
    assert "plan chaleur" in draft["lessons"][2]["speakingFrenchInstruction"]
    print("French Roofing Core 22–24: source hashes, exact English pairs, stable IDs and draft gates pass")


if __name__ == "__main__":
    main()
