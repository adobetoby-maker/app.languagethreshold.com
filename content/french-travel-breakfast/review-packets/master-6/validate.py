#!/usr/bin/env python3
"""Independent current-source, identity, gate and audio-scope checks for Master 6."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-4-6-draft.json"
PRIOR = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lesson_sha(course_row, passage_row):
    raw = json.dumps({"course": course_row, "passage": passage_row}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


packet_path = HERE / "master-6.json"
packet = json.loads(packet_path.read_text())
manifest = json.loads((HERE / "manifest.json").read_text())
candidate = json.loads((HERE / "candidate-reconciled.json").read_text())
course = json.loads(COURSE.read_text())["lessons"][5]
passage = json.loads(READER.read_text())["lessons"]["6"]["passage"]

assert packet["schema"] == "lt.inert-source-review.v1"
assert packet["lessonKey"] == "master:6"
assert packet["pair"] == {"target": "French", "support": "English"}
assert packet["source"]["courseSha256"] == manifest["sourceCourseSha256"] == sha(COURSE)
assert packet["source"]["readerSha256"] == manifest["sourceReaderSha256"] == sha(READER)
assert packet["source"]["lessonSha256"] == lesson_sha(course, passage)
assert packet["priorDraft"]["archiveSha256"] == manifest["archiveSha256"] == sha(ARCHIVE)
assert packet["priorDraft"]["runtimeSha256"] == manifest["priorRuntimeSha256"] == sha(PRIOR)
assert manifest["candidateSha256"] == sha(HERE / "candidate-reconciled.json")
assert manifest["packetSha256"] == sha(packet_path)
assert packet["source"]["titleEnglish"] == course["title"]
assert packet["source"]["objectiveEnglish"] == course["objective"]
assert packet["source"]["speakingEnglish"] == course["speaking"]
assert packet["source"]["sourceGrammar"] == course["grammar"]
assert packet["source"]["passageTitleSpanish"] == passage["title"]
assert len(packet["cards"]) == len(course["words"]) == len(candidate["words"]) == 23
assert len(packet["reader"]) == len(passage["native"]) == len(passage["target"]) == len(candidate["reader"]) == 18

revision = lesson_sha(course, passage)[:12]
ids = []
for i, (card, source, draft) in enumerate(zip(packet["cards"], course["words"], candidate["words"]), 1):
    assert card["id"] == f"master:6:source-{revision}:word:{i}"
    assert card["legacyDraftId"] == draft["id"] == f"master:6:word:{i}"
    assert card["sourceSpanish"] == source["es"]
    assert card["supportEnglish"] == source["en"] == draft["en"]
    assert card["targetFrenchDraft"] == draft["fr"] and card["targetFrenchDraft"].strip()
    assert card["kind"] == source["kind"] == draft["kind"]
    ids.append(card["id"])
for i, (row, es, en, draft) in enumerate(zip(packet["reader"], passage["target"], passage["native"], candidate["reader"]), 1):
    assert row["id"] == f"master:6:source-{revision}:line:{i}"
    assert row["legacyDraftId"] == draft["id"] == f"master:6:line:{i}"
    assert row["sourceSpanish"] == es
    assert row["supportEnglish"] == en == draft["en"]
    assert row["targetFrenchDraft"] == draft["fr"] and row["targetFrenchDraft"].strip()
    ids.append(row["id"])
assert len(ids) == len(set(ids)) == 41

by_id = {row["id"]: row for row in packet["cards"] + packet["reader"]}
assert [x["mode"] for x in packet["modeActivitiesDraft"]] == ["See", "Recall", "Hear", "Type", "Say", "Write"]
for mode in packet["modeActivitiesDraft"]:
    row = by_id[mode["sourceRef"]]
    assert mode["targetFrenchDraft"] == row["targetFrenchDraft"]
    assert mode["supportEnglish"] == row["supportEnglish"]
    assert mode["legacyDraftSourceRef"] == row["legacyDraftId"]
    assert mode["recordedAudio"] is False and mode["readyForLearner"] is False
assert len(packet["formsDraft"]) == 5
assert packet["speakingDraft"]["openingFrench"]

assert "San Telmo" in packet["reader"][0]["targetFrenchDraft"]
assert "Hannah" in packet["reader"][8]["targetFrenchDraft"] and "végétalienne" in packet["reader"][8]["targetFrenchDraft"]
assert "selon le boulanger" in packet["reader"][13]["targetFrenchDraft"]
assert "graisse bovine" in packet["reader"][13]["targetFrenchDraft"]
assert "ni beurre ni lait" in packet["reader"][13]["targetFrenchDraft"]
assert "Dev" in packet["reader"][14]["targetFrenchDraft"] and "Hannah" in packet["reader"][14]["targetFrenchDraft"]
assert "salade de fruits" in packet["reader"][14]["targetFrenchDraft"]
assert "lágrima" in packet["reader"][11]["targetFrenchDraft"]
assert "sans danger" not in json.dumps(packet["cards"] + packet["reader"], ensure_ascii=False)

assert packet["dictionarySensesReviewed"] is False
assert packet["aiAssistance"]["qualifiedApproval"] is False
assert all(value is False for value in packet["gates"].values())
assert all(manifest[key] is False for key in ("reviewed", "registered", "audioRegistered"))
for name, expected in {"haiku-output": "claude-haiku-5-5", "haiku-repair-output": "claude-haiku-5-5", "opus-output": "claude-opus-5-5", "fable-output": "claude-fable-5-2"}.items():
    path = HERE / "historical-ai" / f"{name}.json"
    result = json.loads(path.read_text())
    assert result["is_error"] is False and expected in result["modelUsage"]
    assert packet["aiAssistance"]["historicalPrivateTeam"][name]["sha256"] == manifest["historicalAiSha256"][name] == sha(path)
assert not list(HERE.glob("*.mp3")) and not list(HERE.glob("*.wav"))

scope = packet["audioScope"]
assert scope["selectedFrenchStrings"] == 41 and scope["potentialClipDecisions"] == 82
assert scope["submittedCharacters"] == sum(map(len, [x["targetFrenchDraft"] for x in packet["cards"] + packet["reader"]]))
assert scope["estimatedGrossUsd"] == round(scope["submittedCharacters"] * 30 / 1_000_000, 6)
print(f"PASS: Master 6 current source, 23 cards, 18 Reader turns, 41 revision IDs, six unregistered mode candidates, false gates, {scope['submittedCharacters']} read-only audio characters")
