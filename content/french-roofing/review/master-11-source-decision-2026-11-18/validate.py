#!/usr/bin/env python3
"""Independently validate French Roofing Master 11 source, IDs and closed gates."""
import hashlib
import json
import subprocess
from pathlib import Path

N = 11
ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
p = json.loads((HERE / "packet.json").read_text())
assert p["kind"] == "inert-source-decision"
assert p["pair"] == {"target": "English", "native": "French"}
assert p["stageId"] == p["sourceHeaderModuleId"] == "master-roofing"
assert p["proposedLessonId"] == f"master-roofing:{N}"
pair_id = f"master-roofing:{N}:fr-en"
assert p["proposedPairId"] == pair_id
assert p["identityStatus"].startswith("proposal-only")
for name, digest in p["sourceFileSha256"].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name

code = f"""import {{MASTER_ROOFING_LESSONS}} from './src/data/master-roofing-curriculum.ts'; console.log(JSON.stringify(MASTER_ROOFING_LESSONS[{N - 1}]));"""
lesson = json.loads(subprocess.check_output(
    ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
    cwd=ROOT, text=True,
))
source = json.loads((ROOT / "public/lesson-content/es/master-roofing.json").read_text())["lessons"][str(N)]
passage, verbs = source["passage"], source["verbs"]
archive_name = "content/review-archive/french-japanese-2026-11-15/french-roofing/master-10-12-draft.json"
archived = next(row for row in json.loads((ROOT / archive_name).read_text())["lessons"] if row["n"] == N)
assert lesson["n"] == archived["n"] == N
assert p["sourceTitleEnglish"] == lesson["title"] == archived["titleEnglish"]
assert p["sourceObjectiveEnglish"] == lesson["objective"]
assert p["sourceFocusEnglish"] == lesson["grammar"]["focus"]
assert p["sourceGrammarExamples"] == lesson["grammar"]["examples"]
assert p["sourceSpeakingEnglish"] == lesson["steps"][2]["instruction"]
assert p["sourceReaderTitleSpanish"] == passage["title"]
assert len(p["cards"]) == len(lesson["words"]) == len(archived["words"]) == 22
assert len(p["reader"]) == len(passage["target"]) == len(passage["native"]) == len(archived["reading"]["target"]) == 16
for i, (row, word, old) in enumerate(zip(p["cards"], lesson["words"], archived["words"], strict=True), 1):
    assert row["id"] == f"{pair_id}:card:{i}"
    assert row["legacySourceRef"] == f"master-roofing:{N}:words:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"], row["sourceNoteSpanish"]) == (
        word["es"], word["en"], word["kind"], word.get("note"))
    assert row["archivedFrenchEvidence"] == old["fr"] and row["sourceEnglish"] == old["en"]
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old["fr"])
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
for i, (row, es, en, old) in enumerate(zip(
    p["reader"], passage["target"], passage["native"], archived["reading"]["target"], strict=True,
), 1):
    assert row["id"] == f"{pair_id}:reader:{i}"
    assert row["legacySourceRef"] == f"master-roofing:{N}:passage:{i}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["archivedFrenchEvidence"]) == (es, en, old)
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old)
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
assert sum(row["safetyOrMeaningHold"] for row in p["cards"]) == 10
assert sum(row["safetyOrMeaningHold"] for row in p["reader"]) == 12
ordered = [[row["sourceSpanish"], row["sourceEnglish"]] for row in p["cards"] + p["reader"]]
assert hashlib.sha256(json.dumps(ordered, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest() == p["orderedSourceRowsSha256"]
assert len({row["id"] for row in p["cards"] + p["reader"]}) == 38
all_ids = {row["id"] for row in p["cards"] + p["reader"]}
assert all(set(question["affectedIds"]) <= all_ids for question in p["sourceDecisionQuestions"])
assert p["sourceVerbExamples"] == [{
    "spanishInfinitive": v["infinitive"], "englishMeaning": v["native"],
    "sourceSpanish": v["example"]["target"], "sourceEnglish": v["example"]["native"],
} for v in verbs]
assert p["archivedDraft"]["verbExamples"] == archived["verbs"]
assert p["archivedDraft"]["reviewGapsEnglish"] == archived.get("reviewGapsEnglish", [])
assert p["selectedDecision"] is p["audioScope"] is None
assert p["gates"] and all(value is False for value in p["gates"].values())
print("PASS French Roofing Master 11: 22 cards, 16 Reader turns, 22 held faces, source/IDs/gates")
