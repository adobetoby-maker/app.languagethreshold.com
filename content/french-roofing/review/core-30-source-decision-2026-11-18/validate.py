#!/usr/bin/env python3
"""Independent current-source and closed-gate checks for French Roofing Core 30."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "packet.json").read_text())
assert packet["schema"] == "french-roofing-core30-source-decision-v1"
assert packet["pair"] == {"target": "English", "native": "French"}
assert packet["stageId"] == "core-roofing" and packet["sourceHeaderModuleId"] == "roofing"
assert packet["proposedLessonId"] == "core-roofing:30"
assert packet["identityStatus"].startswith("proposal-only")
for name, digest in packet["sourceFileSha256"].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name

code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[29],passage:p.ROOFING_LESSON_PASSAGES[30]}));"""
source = json.loads(subprocess.check_output(
    ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
    cwd=ROOT, text=True,
))
lesson, passage = source["lesson"], source["passage"]
archive_name = "content/review-archive/french-japanese-2026-11-15/french-roofing/core-28-30-draft.json"
archived = next(row for row in json.loads((ROOT / archive_name).read_text())["lessons"] if row["n"] == 30)
assert lesson["n"] == 30
assert packet["sourceTitleEnglish"] == lesson["title"]
assert packet["sourceObjectiveEnglish"] == lesson["objective"]
assert "Spanish" in packet["sourceObjectiveEnglish"]
assert "English target" in packet["curriculumAdaptationNote"]
assert packet["sourceSpeakingEnglish"] == lesson["steps"][2]["instruction"]
assert packet["sourceReaderTitleSpanish"] == passage["title"]
assert len(packet["cards"]) == len(lesson["words"]) == len(archived["words"]) == 16
assert len(packet["reader"]) == len(passage["es"]) == len(passage["en"]) == 9
assert len(packet["sourceVerbExamples"]) == len(json.loads((ROOT / "public/lesson-content/es/roofing.json").read_text())["lessons"]["30"]["verbs"]) == 5
for row, verb in zip(packet["sourceVerbExamples"], json.loads((ROOT / "public/lesson-content/es/roofing.json").read_text())["lessons"]["30"]["verbs"], strict=True):
    assert row == {"spanishInfinitive": verb["infinitive"], "englishMeaning": verb["native"], "sourceSpanish": verb["example"]["target"], "sourceEnglish": verb["example"]["native"]}
pair_id = "core-roofing:30:fr-en"
assert packet["proposedPairId"] == pair_id
for n, (row, word, old) in enumerate(zip(packet["cards"], lesson["words"], archived["words"], strict=True), 1):
    assert row["id"] == f"{pair_id}:card:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (word["es"], word["en"], word["kind"])
    assert row["archivedFrenchEvidence"] == old["fr"]
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old["fr"])
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
for n, (row, old_en, old_fr) in enumerate(zip(packet["reader"], archived["reading"]["native"], archived["reading"]["target"], strict=True), 1):
    assert row["id"] == f"{pair_id}:reader:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (passage["es"][n - 1], passage["en"][n - 1])
    assert row["archivedEnglishEvidence"] == old_en
    assert row["archivedFrenchEvidence"] == old_fr
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old_fr)
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
assert [n for n, row in enumerate(packet["reader"], 1) if row["sourceEnglish"] != row["archivedEnglishEvidence"]] == [7]
assert [n for n, row in enumerate(packet["cards"], 1) if row["safetyOrMeaningHold"]] == [2, 3, 5, 7, 8, 9, 10, 12, 13, 14, 15]
assert [n for n, row in enumerate(packet["reader"], 1) if row["safetyOrMeaningHold"]] == [3, 4, 5, 6, 7, 8, 9]
ordered = [[row["sourceSpanish"], row["sourceEnglish"]] for row in packet["cards"] + packet["reader"]]
assert hashlib.sha256(json.dumps(ordered, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest() == packet["orderedSourceRowsSha256"]
all_ids = {row["id"] for row in packet["cards"] + packet["reader"]}
assert all(set(question["affectedIds"]) <= all_ids for question in packet["sourceDecisionQuestions"])
assert packet["archivedDraft"]["status"].startswith("separate unapproved")
assert packet["selectedDecision"] is packet["audioScope"] is None
assert all(value is False for value in packet["gates"].values())
print("PASS French Roofing Core 30: 16 exact cards, nine Reader turns, 18 held faces, proposed IDs and closed gates")
