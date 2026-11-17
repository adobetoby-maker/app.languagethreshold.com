#!/usr/bin/env python3
"""Check the inert Master 3 packet against current Spanish source bytes and false gates."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-1-3-draft.json"
PRIOR = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lesson_sha(course_row, passage_row):
    data = json.dumps({"course": course_row, "passage": passage_row}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(data.encode()).hexdigest()


packet_path = HERE / "master-3.json"
packet = json.loads(packet_path.read_text())
manifest = json.loads((HERE / "manifest.json").read_text())
course = json.loads(COURSE.read_text())["lessons"][2]
passage = json.loads(READER.read_text())["lessons"]["3"]["passage"]
assert packet["schema"] == "lt.inert-source-review.v1"
assert packet["lessonKey"] == "master:3"
assert packet["pair"] == {"target": "French", "support": "English"}
assert packet["source"]["courseSha256"] == manifest["sourceCourseSha256"] == sha(COURSE)
assert packet["source"]["readerSha256"] == manifest["sourceReaderSha256"] == sha(READER)
assert packet["source"]["lessonSha256"] == lesson_sha(course, passage)
assert packet["priorDraft"]["archiveSha256"] == manifest["archiveSha256"] == sha(ARCHIVE)
assert packet["priorDraft"]["runtimeSha256"] == manifest["priorRuntimeSha256"] == sha(PRIOR)
assert manifest["fableOutputSha256"] == sha(HERE / "fable-output.json")
assert manifest["packetSha256"] == sha(packet_path)
assert packet["source"]["titleEnglish"] == course["title"]
assert packet["source"]["objectiveEnglish"] == course["objective"]
assert packet["source"]["speakingEnglish"] == course["speaking"]
assert packet["source"]["sourceGrammar"] == course["grammar"]
assert packet["source"]["passageTitleSpanish"] == passage["title"]
assert len(packet["cards"]) == len(course["words"]) == 23
assert len(packet["reader"]) == len(passage["target"]) == len(passage["native"]) == 18
revision = lesson_sha(course, passage)[:12]
ids = []
for i, (card, row) in enumerate(zip(packet["cards"], course["words"]), 1):
    assert card["id"] == f"master:3:source-{revision}:word:{i}"
    assert card["legacyDraftId"] == f"master:3:word:{i}"
    assert card["sourceSpanish"] == row["es"]
    assert card["supportEnglish"] == row["en"]
    assert card["kind"] == row["kind"]
    assert card["targetFrenchDraft"] and card["targetFrenchDraft"].strip()
    ids.append(card["id"])
for i, (reader, es, en) in enumerate(zip(packet["reader"], passage["target"], passage["native"]), 1):
    assert reader["id"] == f"master:3:source-{revision}:line:{i}"
    assert reader["legacyDraftId"] == f"master:3:line:{i}"
    assert reader["sourceSpanish"] == es
    assert reader["supportEnglish"] == en
    assert reader["targetFrenchDraft"] and reader["targetFrenchDraft"].strip()
    ids.append(reader["id"])
assert len(ids) == len(set(ids)) == 41
assert packet["cards"][11]["targetFrenchDraft"].find("50 pesos") >= 0
assert "Oaxaca" in packet["reader"][0]["targetFrenchDraft"]
assert "doña Eustolia" in packet["reader"][4]["targetFrenchDraft"]
assert "pan de yema" in packet["reader"][16]["targetFrenchDraft"]
assert all(not value for value in packet["gates"].values())
assert all(not value for key, value in manifest.items() if key in ("reviewed", "registered", "audioRegistered"))
assert packet["speakingDraft"] is None and packet["authoredModeActivities"] is None
scope = packet["audioScope"]
assert scope["potentialClipDecisions"] == 82
assert scope["selectedFrenchStrings"] == 41
assert scope["submittedCharacters"] == sum(map(len, [x["targetFrenchDraft"] for x in packet["cards"] + packet["reader"]]))
assert scope["estimatedGrossUsd"] == round(scope["submittedCharacters"] * 30 / 1_000_000, 6)
print("PASS: Master 3 current source, 23 cards, 18 Reader turns, 41 unique revision IDs, false gates and read-only audio scope")
