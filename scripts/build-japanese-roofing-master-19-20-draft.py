#!/usr/bin/env python3
"""Build private Japanese Roofing Master 19–20 from pinned English pairs."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-roofing"
SOURCE = CONTENT / "source-english-master-19-20.json"
AUTHOR = CONTENT / "author-master-19-20.json"
GOALS = CONTENT / "author-master-speaking-goals-ja-en.json"
OUTPUT = CONTENT / "master-19-20-draft.json"
SOURCE_FILES = (
    "src/data/master-roofing-curriculum.ts",
    "public/lesson-content/es/master-roofing.json",
)


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)["lessons"]
    author = json.loads(AUTHOR.read_text())
    assert [lesson["n"] for lesson in source] == [19, 20]
    out = {
        "schema": 1, "moduleId": "master-roofing", "stage": "master", "target": "Japanese", "native": "English",
        "state": "authored-draft-partial", "reviewed": False, "registered": False, "audio": "none",
        "englishSourceSubsetSHA256": hashlib.sha256(raw).hexdigest(),
        "sourceFileSHA256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in SOURCE_FILES},
        "lessons": [],
        "reviewGates": {key: False for key in (
            "independentJapaneseReview", "qualifiedRoofingReview", "sixModeRuntime", "dictionarySenses",
            "offlineVerified", "recordedAudioListening", "phoneAndNativeAcceptance")},
    }
    for src in source:
        n = src["n"]
        a = author[str(n)]
        assert len(a["words"]) == len(src["words"])
        assert len(a["reader"]) == len(src["readingEnglish"])
        assert len(a["verbs"]) == len(src["verbs"])
        assert set(a["modes"]) == {"see", "recall", "hear", "type", "say", "write"}
        out["lessons"].append({
            "n": n, "stableId": f"master-roofing:{n}:ja-en", "reviewed": False,
            "titleEnglish": src["titleEnglish"], "sourceEnglishObjective": src["objectiveEnglishSource"],
            "sourceEnglishSpeaking": src["speakingEnglishSource"],
            "title": a["title"], "objective": a["objective"], "focus": a["focus"],
            "cards": [{"ja": ja, "en": word["en"], "kind": word["kind"]}
                      for word, ja in zip(src["words"], a["words"])],
            "reader": [{"ja": ja, "en": en} for en, ja in zip(src["readingEnglish"], a["reader"])],
            "forms": [{"base": base, "exampleJa": example, **verb}
                      for verb, (base, example) in zip(src["verbs"], a["verbs"])],
            "speaking": {"role": "roofing crew member", "opening": a["speaking"],
                         "goal": json.loads(GOALS.read_text())[str(n)]},
            "modes": a["modes"],
        })
    return json.dumps(out, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "Japanese Roofing Master 19–20 draft is stale"
        print("Japanese Roofing Master 19–20 private source pairs and draft gates pass")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
