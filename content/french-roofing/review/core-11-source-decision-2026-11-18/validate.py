#!/usr/bin/env python3
"""Independent current-source and closed-gate checks for French Roofing Core 11."""
from __future__ import annotations

import hashlib
import json
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
packet = json.loads((HERE / "packet.json").read_text())
assert packet["schema"] == "french-roofing-core11-source-decision-v1"
assert packet["pair"] == {"target": "English", "native": "French"}
assert packet["stageId"] == "core-roofing" and packet["sourceHeaderModuleId"] == "roofing"
assert packet["proposedLessonId"] == "core-roofing:11"
assert packet["identityStatus"].startswith("proposal-only")
for name, digest in packet["sourceFileSha256"].items():
    assert hashlib.sha256((ROOT / name).read_bytes()).hexdigest() == digest, name

code = """const [c,p]=await Promise.all([import('./src/data/roofing-curriculum.ts'),import('./src/data/roofing-lesson-passages.ts')]);console.log(JSON.stringify({lesson:c.ROOFING_LESSONS[10],passage:p.ROOFING_LESSON_PASSAGES[11]}));"""
source = json.loads(subprocess.check_output(
    ["node", "--experimental-strip-types", "--input-type=module", "-e", code],
    cwd=ROOT, text=True,
))
lesson, passage = source["lesson"], source["passage"]
archive_name = "content/review-archive/french-japanese-2026-11-15/french-roofing/core-10-12-draft.json"
archived = next(row for row in json.loads((ROOT / archive_name).read_text())["lessons"] if row["n"] == 11)
assert lesson["n"] == 11
assert packet["sourceTitleEnglish"] == lesson["title"]
assert packet["sourceObjectiveEnglish"] == lesson["objective"]
assert packet["sourceSpeakingEnglish"] == lesson["steps"][2]["instruction"]
assert packet["sourceReaderTitleSpanish"] == passage["title"]
assert len(packet["cards"]) == len(lesson["words"]) == len(archived["words"]) == 13
assert len(packet["reader"]) == len(passage["es"]) == len(passage["en"]) == 9
assert len(packet["sourceVerbExamples"]) == len(json.loads((ROOT / "public/lesson-content/es/roofing.json").read_text())["lessons"]["11"]["verbs"]) == 5
pair_id = "core-roofing:11:fr-en"
for n, (row, word, old) in enumerate(zip(packet["cards"], lesson["words"], archived["words"], strict=True), 1):
    assert row["id"] == f"{pair_id}:card:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"], row["kind"]) == (word["es"], word["en"], word["kind"])
    assert row["archivedFrenchEvidence"] == old["fr"]
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old["fr"])
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
for n, (row, old) in enumerate(zip(packet["reader"], archived["reading"]["target"], strict=True), 1):
    assert row["id"] == f"{pair_id}:reader:{n}"
    assert (row["sourceSpanish"], row["sourceEnglish"]) == (passage["es"][n - 1], passage["en"][n - 1])
    assert row["archivedFrenchEvidence"] == old
    assert row["conditionalFrench"] == (None if row["safetyOrMeaningHold"] else old)
    assert row["selectedFrench"] is row["audioScript"] is None and row["reviewed"] is False
assert sum(row["safetyOrMeaningHold"] for row in packet["cards"]) == 6
assert sum(row["safetyOrMeaningHold"] for row in packet["reader"]) == 5
ordered = [[row["sourceSpanish"], row["sourceEnglish"]] for row in packet["cards"] + packet["reader"]]
assert hashlib.sha256(json.dumps(ordered, ensure_ascii=False, separators=(",", ":")).encode()).hexdigest() == packet["orderedSourceRowsSha256"]
all_ids = {row["id"] for row in packet["cards"] + packet["reader"]}
assert all(set(question["affectedIds"]) <= all_ids for question in packet["sourceDecisionQuestions"])
assert packet["archivedDraft"]["status"].startswith("separate unapproved")
assert packet["selectedDecision"] is packet["audioScope"] is None
assert all(value is False for value in packet["gates"].values())
print("PASS French Roofing Core 11: 13 exact cards, nine Reader turns, 11 held faces, proposed IDs and closed gates")

# Repaired provenance is section-owned; it is not an approved runtime identity map.
for group, segment in (("cards", "words"), ("reader", "passage")):
    for n, row in enumerate(packet[group], 1):
        assert row["legacySourceRef"] == f"roofing:11:{segment}:{n}"
        assert row["legacySourceRefHistory"][0]["reference"] == f"roofing:7:{segment}:{n}"
core7 = json.loads((HERE.parent / "core-7-source-decision-2026-11-18/packet.json").read_text())
core7_refs = {row["legacySourceRef"] for group in ("cards", "reader") for row in core7[group]}
assert not {row["legacySourceRef"] for group in ("cards", "reader") for row in packet[group]} & core7_refs
crosswalk = json.loads((HERE / "legacy-reference-crosswalk-2026-11-25.json").read_text())
assert crosswalk["repairedPacketSha256"] == hashlib.sha256((HERE / "packet.json").read_bytes()).hexdigest()
assert len(crosswalk["rows"]) == 22
assert crosswalk["savedItemMappingApproved"] is crosswalk["progressImportApproved"] is crosswalk["registered"] is crosswalk["reviewed"] is False
assert packet["legacySourceReferenceRepair"]["savedItemMappingApproved"] is False
assert packet["legacySourceReferenceRepair"]["progressImportApproved"] is False
print("PASS Core11 section-11 refs: 22 unique, zero Core7 collisions; history retained, progress mapping unapproved")
