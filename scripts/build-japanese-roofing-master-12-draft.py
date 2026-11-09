#!/usr/bin/env python3
"""Build Japanese Roofing Master 12 as an explicit Spanish-register adaptation."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-roofing"
SOURCE = CONTENT / "source-english-master-12.json"
AUTHOR = CONTENT / "author-master-12.json"
OUTPUT = CONTENT / "master-12-draft.json"
SOURCE_FILES = (
    "src/data/master-roofing-curriculum.ts",
    "public/lesson-content/es/master-roofing.json",
)


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    assert len(source) == 1 and source[0]["n"] == 12
    src = source[0]
    author = json.loads(AUTHOR.read_text())
    assert len(author["cards"]) == len(src["words"])
    assert len(author["reader"]) == len(src["readingEnglish"])
    assert len(author["forms"]) == len(src["verbs"])
    assert set(author["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
    lesson = {
        "n": 12, "stableId": "master-roofing:12:ja-en", "reviewed": False,
        "titleEnglish": src["titleEnglish"],
        "sourceEnglishObjective": src["objectiveEnglishSource"],
        "sourceEnglishSpeaking": src["speakingEnglishSource"],
        "title": author["title"], "objective": author["objective"], "focus": author["focus"],
        "cards": [{"ja": pair["ja"], "en": pair["en"], "kind": anchor["kind"],
                   "sourceEnglish": anchor["en"]}
                  for anchor, pair in zip(src["words"], author["cards"])],
        "reader": [{"ja": pair["ja"], "en": pair["en"], "sourceEnglish": anchor}
                   for anchor, pair in zip(src["readingEnglish"], author["reader"])],
        "forms": [{"base": form["base"], "exampleJa": form["exampleJa"],
                   "exampleEn": form["exampleEn"], "sourceEnglish": anchor}
                  for anchor, form in zip(src["verbs"], author["forms"])],
        "speaking": {**author["speaking"], "sourceEnglish": src["speakingEnglishSource"]},
        "modes": author["modes"],
    }
    out = {
        "schema": 1, "moduleId": "master-roofing", "stage": "master",
        "target": "Japanese", "native": "English", "state": "authored-draft-language-adapted",
        "reviewed": False, "registered": False, "audio": "none",
        "languageAdaptation": {
            "sourceConcept": "Spanish usted/tú forms and titles",
            "japaneseConcept": "plain, polite and honorific register by listener",
            "sourceEnglishFieldsAreProvenanceOnly": True,
        },
        "englishSourceSubsetSHA256": hashlib.sha256(raw).hexdigest(),
        "sourceFileSHA256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest()
                             for p in SOURCE_FILES},
        "lessons": [lesson],
        "reviewGates": {key: False for key in (
            "independentJapaneseReview", "qualifiedRoofingReview", "sixModeRuntime",
            "dictionarySenses", "offlineVerified", "recordedAudioListening",
            "phoneAndNativeAcceptance")},
    }
    return json.dumps(out, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "Japanese Roofing Master 12 draft is stale"
        print("Japanese Roofing Master 12 language adaptation and false gates pass")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
