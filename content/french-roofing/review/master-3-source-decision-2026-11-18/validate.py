#!/usr/bin/env python3
"""Independently check current source, identity and closed gates for Master 3."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

N = 3
ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
ARCHIVE = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-1-3-draft.json"
PAIR_ID = f"master-roofing:{N}:fr-en"
p = json.loads((HERE / "packet.json").read_text())
assert p["schema"] == "french-roofing-master3-source-decision-v1"
assert p["kind"] == "inert-source-decision"
assert p["pair"] == {"target": "English", "native": "French"}
assert p["stageId"] == p["sourceHeaderModuleId"] == "master-roofing"
assert p["proposedLessonId"] == f"master-roofing:{N}" and p["proposedPairId"] == PAIR_ID
assert p["identityStatus"].startswith("proposal-only")
for name, digest in p["sourceFileSha256"].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name

code = f"""import {{MASTER_ROOFING_LESSONS}} from './src/data/master-roofing-curriculum.ts'; console.log(JSON.stringify(MASTER_ROOFING_LESSONS[{N - 1}]));"""
lesson = json.loads(subprocess.check_output(
    ["node", "--experimental-strip-types", "--input-type=module", "-e", code], cwd=ROOT, text=True,
))
content = json.loads((ROOT / "public/lesson-content/es/master-roofing.json").read_text())["lessons"][str(N)]
passage = content["passage"]
archived = next(row for row in json.loads((ROOT / ARCHIVE).read_text())["lessons"] if row["n"] == N)
assert lesson["n"] == archived["n"] == N
assert p["sourceTitleEnglish"] == lesson["title"]
assert p["sourceObjectiveEnglish"] == lesson["objective"]
assert p["sourceFocusEnglish"] == lesson["grammar"]["focus"]
assert p["sourceGrammarExamples"] == lesson["grammar"]["examples"]
assert p["sourceLessonType"] == lesson["lessonType"] and p["sourceBlock"] == lesson["block"]
assert p["sourceSpeakingEnglish"] == lesson["steps"][2]["instruction"]
assert p["sourceReaderTitleSpanish"] == passage["title"]
assert len(p["cards"]) == len(lesson["words"]) == len(archived["words"]) == 20
assert len(p["reader"]) == len(passage["target"]) == len(passage["native"]) == 16
assert len(p["sourceVerbExamples"]) == len(content["verbs"]) == 5
for i, (row, word, old) in enumerate(zip(p["cards"], lesson["words"], archived["words"], strict=True), 1):
    assert row["id"] == f"{PAIR_ID}:card:{i}"
    assert row["legacySourceRef"] == f"master-roofing:{N}:words:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["sourceNoteSpanish"], row["kind"]) == (
        word["es"], word["en"], word.get("note"), word["kind"])
    assert row["archivedFrenchEvidence"] == old["fr"]
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old["fr"])
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
for i, (row, old) in enumerate(zip(p["reader"], archived["reading"]["target"], strict=True), 1):
    assert row["id"] == f"{PAIR_ID}:reader:{i}"
    assert row["legacySourceRef"] == f"master-roofing:{N}:passage:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (passage["target"][i - 1], passage["native"][i - 1])
    assert row["archivedFrenchEvidence"] == old
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old)
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
for row, verb in zip(p["sourceVerbExamples"], content["verbs"], strict=True):
    assert row == {"spanishInfinitive": verb["infinitive"], "englishMeaning": verb["native"],
                   "sourceSpanish": verb["example"]["target"], "sourceEnglish": verb["example"]["native"]}
assert sum(row["safetyOrMeaningHold"] for row in p["cards"]) == 13
assert sum(row["safetyOrMeaningHold"] for row in p["reader"]) == 13
ordered = [[row["sourceSpanish"], row["sourceEnglish"]] for row in p["cards"] + p["reader"]]
assert hashlib.sha256(json.dumps(ordered, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest() == p["orderedSourceRowsSha256"]
ids = {row["id"] for row in p["cards"] + p["reader"]}
assert len(ids) == 36
assert all(set(q["affectedIds"]) <= ids for q in p["sourceDecisionQuestions"])
assert p["archivedDraft"]["reviewGapsEnglish"] == archived.get("reviewGapsEnglish", [])
assert p["archivedDraft"]["status"].startswith("separate unapproved")
assert p["selectedDecision"] is p["audioScope"] is None
assert p["gates"] and all(value is False for value in p["gates"].values())
print("PASS French Roofing Master 3: 20 cards, 16 Reader turns, source/IDs/26 holds/closed gates")
