#!/usr/bin/env python3
"""Independent structural and exact-source check for the inert Core 21 packet."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "packet.json").read_text())
assert packet["schema"] == "french-roofing-core21-source-safety-v1"
assert packet["stageId"] == "core-roofing" and packet["sourceHeaderModuleId"] == "roofing"
assert packet["proposedLessonId"] == "core-roofing:21"
assert packet["identityStatus"].startswith("proposal-only")
for name, digest in packet["sourceFileSha256"].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name

code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[20],passage:p.ROOFING_LESSON_PASSAGES[21]}));"""
source = json.loads(subprocess.check_output(["node", "--experimental-strip-types", "--input-type=module", "-e", code], cwd=ROOT, text=True))
lesson, passage = source["lesson"], source["passage"]
assert lesson["n"] == 21
assert packet["sourceTitleEnglish"] == lesson["title"]
assert packet["sourceObjectiveEnglish"] == lesson["objective"]
assert packet["sourceSpeakingEnglish"] == lesson["steps"][2]["instruction"]
assert packet["sourceReaderTitleSpanish"] == passage["title"]
assert len(packet["cards"]) == len(lesson["words"]) == 14
assert len(packet["reader"]) == len(passage["es"]) == len(passage["en"]) == 9
assert len(packet["sourceVerbExamples"]) == 5
pair_id = "core-roofing:21:fr-en"
for n, (row, word) in enumerate(zip(packet["cards"], lesson["words"], strict=True), 1):
    assert row["id"] == f"{pair_id}:card:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (word["es"], word["en"], word["kind"])
    assert row["candidateFrench"] is row["selectedFrench"] is row["audioScript"] is None
    assert row["reviewed"] is False
for n, row in enumerate(packet["reader"], 1):
    assert row["id"] == f"{pair_id}:reader:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (passage["es"][n - 1], passage["en"][n - 1])
    assert row["candidateFrench"] is row["selectedFrench"] is row["audioScript"] is None
    assert row["reviewed"] is False
assert all(value is False for value in packet["gates"].values())
assert packet["selectedDecision"] is packet["audioScope"] is None
all_ids = {row["id"] for row in packet["cards"] + packet["reader"]}
assert all(set(question["affectedIds"]) <= all_ids for question in packet["sourceDecisionQuestions"])
assert packet["archivedDraft"]["status"].startswith("separate unapproved")
print("PASS French Roofing Core 21: 14 source cards, nine Reader turns, stable proposed IDs and closed gates")
