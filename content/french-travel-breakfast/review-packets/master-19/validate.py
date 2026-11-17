#!/usr/bin/env python3
"""Independently validate the inert French Breakfast Master 19 packet."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-19-20-draft.json"
PRIOR = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lesson_sha(course, passage):
    raw = json.dumps({"course": course, "passage": passage}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


packet_path = HERE / "master-19.json"
packet = json.loads(packet_path.read_text())
manifest = json.loads((HERE / "manifest.json").read_text())
candidate = json.loads((HERE / "candidate-text.json").read_text())
course = json.loads(COURSE.read_text())["lessons"][18]
passage = json.loads(READER.read_text())["lessons"]["19"]["passage"]
prior = next(x for x in json.loads(PRIOR.read_text())["lessons"] if x["stage"] == "master" and x["n"] == 19)
archive = next(x for x in json.loads(ARCHIVE.read_text())["lessons"] if x["n"] == 19)

assert course["n"] == archive["n"] == 19
assert packet["schema"] == "lt.inert-source-review.v1"
assert packet["lessonKey"] == "master:19"
assert packet["pair"] == {"target": "French", "support": "English"}
assert packet["source"]["courseSha256"] == manifest["sourceCourseSha256"] == sha(COURSE)
assert packet["source"]["readerSha256"] == manifest["sourceReaderSha256"] == sha(READER)
assert packet["source"]["lessonSha256"] == lesson_sha(course, passage)
assert packet["source"]["titleEnglish"] == course["title"]
assert packet["source"]["objectiveEnglish"] == course["objective"]
assert packet["source"]["speakingEnglish"] == course["speaking"]
assert packet["source"]["sourceGrammar"] == course["grammar"]
assert packet["source"]["passageTitleSpanish"] == passage["title"]
assert packet["priorDraft"]["archiveSha256"] == manifest["archiveSha256"] == sha(ARCHIVE)
assert packet["priorDraft"]["runtimeSha256"] == manifest["priorRuntimeSha256"] == sha(PRIOR)
assert manifest["candidateSha256"] == sha(HERE / "candidate-text.json")
assert manifest["packetSha256"] == sha(packet_path)

cards, reader = packet["cards"], packet["reader"]
assert len(cards) == len(course["words"]) == len(candidate["cardFrenchDrafts"]) == 24
assert len(reader) == len(passage["native"]) == len(passage["target"]) == len(candidate["readerFrenchDrafts"]) == 18
revision = lesson_sha(course, passage)[:12]
ids = []
for i, (row, source, draft) in enumerate(zip(cards, course["words"], candidate["cardFrenchDrafts"]), 1):
    assert row["id"] == f"master:19:source-{revision}:word:{i}"
    assert row["legacyDraftId"] == f"master:19:word:{i}"
    assert row["sourceSpanish"] == source["es"]
    assert row["supportEnglish"] == source["en"]
    assert row["targetFrenchDraft"] == draft and draft.strip()
    assert row["kind"] == source["kind"]
    if "note" in source:
        assert row["sourceNoteEnglish"] == source["note"]
    ids.append(row["id"])
for i, (row, es, en, draft) in enumerate(zip(reader, passage["target"], passage["native"], candidate["readerFrenchDrafts"]), 1):
    assert row["id"] == f"master:19:source-{revision}:line:{i}"
    assert row["legacyDraftId"] == f"master:19:line:{i}"
    assert row["sourceSpanish"] == es and row["supportEnglish"] == en
    assert row["targetFrenchDraft"] == draft and draft.strip()
    ids.append(row["id"])
assert len(ids) == len(set(ids)) == 42

assert all(x in reader[0]["targetFrenchDraft"].lower() for x in ("dimanche", "10 heures", "7b", "pocitos"))
assert "Gonzalo" in reader[1]["targetFrenchDraft"] and "gérant" in reader[1]["targetFrenchDraft"]
assert "Sofía" in reader[4]["targetFrenchDraft"] and "granola maison" in reader[4]["targetFrenchDraft"]
assert "Tomás" in reader[6]["targetFrenchDraft"] and "maladie cœliaque" in reader[6]["targetFrenchDraft"]
assert "lundi" in reader[8]["targetFrenchDraft"] and "mercredi" in reader[8]["targetFrenchDraft"]
assert "pain sans gluten" in reader[9]["targetFrenchDraft"]
assert "pot partagé" in reader[10]["targetFrenchDraft"] and "contamination croisée" in reader[10]["targetFrenchDraft"]
assert "portions individuelles" in reader[11]["targetFrenchDraft"]
assert "15 %" in reader[13]["targetFrenchDraft"] and "cinq nuits" in reader[13]["targetFrenchDraft"]
assert "mars" in reader[14]["targetFrenchDraft"] and "tarif" in reader[14]["targetFrenchDraft"]
assert "7B" in reader[15]["targetFrenchDraft"]
assert "9 sur 10" in reader[16]["targetFrenchDraft"]
assert "bon avis" in reader[17]["targetFrenchDraft"]
assert "Québec" not in json.dumps(cards + reader, ensure_ascii=False)

assert packet["speakingDraft"] == candidate["speakingDraft"]
assert packet["formsDraft"] == candidate["formsDraft"] and len(packet["formsDraft"]) == 5
assert [x["mode"] for x in packet["modeActivitiesDraft"]] == ["See", "Recall", "Hear", "Type", "Say", "Write"]
for mode in packet["modeActivitiesDraft"]:
    n = candidate["modeSourceCards"][mode["mode"]]
    source_card = cards[n - 1]
    assert mode["cueEnglish"] == candidate["modeCuesEnglish"][mode["mode"]]
    assert mode["sourceRef"] == source_card["id"]
    assert mode["legacyDraftSourceRef"] == source_card["legacyDraftId"]
    assert mode["targetFrenchDraft"] == source_card["targetFrenchDraft"]
    assert mode["supportEnglish"] == source_card["supportEnglish"]
    assert mode["recordedAudio"] is False and mode["readyForLearner"] is False

assert packet["dictionarySensesReviewed"] is False
assert packet["aiAssistance"]["actualModelUsage"] == {}
assert packet["aiAssistance"]["qualifiedApproval"] is False
ai = json.loads((HERE / "ai-assistance-metadata.json").read_text())
assert ai["actualModelUsage"] == {} and ai["inputTokens"] == ai["outputTokens"] == 0
assert ai["authoredByClaude"] is False and ai["qualifiedApproval"] is False
assert all(value is False for value in packet["gates"].values())
assert all(manifest[k] is False for k in ("reviewed", "registered", "audioRegistered"))
assert not list(HERE.glob("*.mp3")) and not list(HERE.glob("*.wav"))
scope = packet["audioScope"]
assert scope["selectedFrenchStrings"] == 42 and scope["potentialClipDecisions"] == 84
assert scope["submittedCharacters"] == sum(len(x["targetFrenchDraft"]) for x in cards + reader)
assert scope["estimatedGrossUsd"] == round(scope["submittedCharacters"] * 30 / 1_000_000, 6)
assert scope["twoVoiceSubmittedCharacters"] == 2 * scope["submittedCharacters"]
assert scope["twoVoiceEstimatedGrossUsd"] == round(scope["twoVoiceSubmittedCharacters"] * 30 / 1_000_000, 6)
print(f"PASS: French Breakfast Master 19 source, 24 cards, 18 Reader, 42 revision IDs, false gates, {scope['submittedCharacters']} audio characters")
