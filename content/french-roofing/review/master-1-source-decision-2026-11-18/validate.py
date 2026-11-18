#!/usr/bin/env python3
"""Independent current-source and closed-gate checks for French Roofing Master 1."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "packet.json").read_text())
assert packet["schema"] == "french-roofing-master1-source-decision-v1"
assert packet["pair"] == {"target": "English", "native": "French"}
assert packet["stageId"] == packet["sourceHeaderModuleId"] == "master-roofing"
assert packet["archivedHeaderModuleId"] == "roofing"
assert packet["proposedLessonId"] == "master-roofing:1"
assert packet["identityStatus"].startswith("proposal-only")
for name, digest in packet["sourceFileSha256"].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name

code = """const c=await import('./src/data/master-roofing-curriculum.ts');console.log(JSON.stringify(c.MASTER_ROOFING_LESSONS[0]));"""
lesson = json.loads(subprocess.check_output(
    ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
    cwd=ROOT, text=True,
))
content = json.loads((ROOT / "public/lesson-content/es/master-roofing.json").read_text())["lessons"]["1"]
passage = content["passage"]
archive_name = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-1-3-draft.json"
archived = next(row for row in json.loads((ROOT / archive_name).read_text())["lessons"] if row["n"] == 1)
assert lesson["n"] == 1
assert packet["sourceTitleEnglish"] == lesson["title"]
assert packet["sourceObjectiveEnglish"] == lesson["objective"]
assert packet["sourceSpeakingEnglish"] == lesson["steps"][2]["instruction"]
assert packet["sourceGrammarFocusEnglish"] == lesson["grammar"]["focus"]
assert packet["sourceGrammarExamples"] == lesson["grammar"]["examples"]
assert packet["sourceReaderTitleSpanish"] == passage["title"]
assert len(packet["cards"]) == len(lesson["words"]) == len(archived["words"]) == 21
assert len(packet["reader"]) == len(passage["target"]) == len(passage["native"]) == 17
assert len(packet["sourceVerbExamples"]) == len(content["verbs"]) == 5
for row, verb in zip(packet["sourceVerbExamples"], content["verbs"], strict=True):
    assert row == {"spanishInfinitive": verb["infinitive"], "englishMeaning": verb["native"], "sourceSpanish": verb["example"]["target"], "sourceEnglish": verb["example"]["native"]}
pair_id = "master-roofing:1:fr-en"
assert packet["proposedPairId"] == pair_id
for n, (row, word, old) in enumerate(zip(packet["cards"], lesson["words"], archived["words"], strict=True), 1):
    assert row["id"] == f"{pair_id}:card:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (word["es"], word["en"], word["kind"])
    assert row["archivedFrenchEvidence"] == old["fr"]
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old["fr"])
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
for n, (row, old) in enumerate(zip(packet["reader"], archived["reading"]["target"], strict=True), 1):
    assert row["id"] == f"{pair_id}:reader:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (passage["target"][n - 1], passage["native"][n - 1])
    assert row["archivedFrenchEvidence"] == old
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old)
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
assert sum(row["safetyOrMeaningHold"] for row in packet["cards"]) == 14
assert sum(row["safetyOrMeaningHold"] for row in packet["reader"]) == 14
ordered = [[row["sourceSpanish"], row["sourceEnglish"]] for row in packet["cards"] + packet["reader"]]
assert hashlib.sha256(json.dumps(ordered, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest() == packet["orderedSourceRowsSha256"]
all_ids = {row["id"] for row in packet["cards"] + packet["reader"]}
assert all(set(q["affectedIds"]) <= all_ids for q in packet["sourceDecisionQuestions"])
assert packet["archivedDraft"]["status"].startswith("separate unapproved")
assert packet["selectedDecision"] is packet["audioScope"] is None
assert all(value is False for value in packet["gates"].values())
print("PASS French Roofing Master 1: 21 exact cards, 17 Reader turns, five verbs, 28 held faces, proposed IDs and closed gates")
