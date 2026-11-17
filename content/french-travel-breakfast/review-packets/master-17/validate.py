#!/usr/bin/env python3
"""Independently validate the inert French Breakfast Master 17 packet."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-16-18-draft.json"
PRIOR = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lesson_sha(course, passage):
    raw = json.dumps({"course": course, "passage": passage}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


packet_path = HERE / "master-17.json"
packet = json.loads(packet_path.read_text())
manifest = json.loads((HERE / "manifest.json").read_text())
candidate = json.loads((HERE / "candidate-text.json").read_text())
course = json.loads(COURSE.read_text())["lessons"][16]
passage = json.loads(READER.read_text())["lessons"]["17"]["passage"]
prior = next(x for x in json.loads(PRIOR.read_text())["lessons"] if x["stage"] == "master" and x["n"] == 17)
archive = next(x for x in json.loads(ARCHIVE.read_text())["lessons"] if x["n"] == 17)

assert course["n"] == archive["n"] == 17
assert packet["schema"] == "lt.inert-source-review.v1"
assert packet["lessonKey"] == "master:17"
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
    assert row["id"] == f"master:17:source-{revision}:word:{i}"
    assert row["legacyDraftId"] == f"master:17:word:{i}"
    assert row["sourceSpanish"] == source["es"]
    assert row["supportEnglish"] == source["en"]
    assert row["targetFrenchDraft"] == draft and draft.strip()
    assert row["kind"] == source["kind"]
    if "note" in source:
        assert row["sourceNoteEnglish"] == source["note"]
    ids.append(row["id"])
for i, (row, es, en, draft) in enumerate(zip(reader, passage["target"], passage["native"], candidate["readerFrenchDrafts"]), 1):
    assert row["id"] == f"master:17:source-{revision}:line:{i}"
    assert row["legacyDraftId"] == f"master:17:line:{i}"
    assert row["sourceSpanish"] == es and row["supportEnglish"] == en
    assert row["targetFrenchDraft"] == draft and draft.strip()
    ids.append(row["id"])
assert len(ids) == len(set(ids)) == 42

assert "Valence" in reader[0]["targetFrenchDraft"] and "Inés Soler" in reader[0]["targetFrenchDraft"]
assert "13 octobre" in reader[1]["targetFrenchDraft"]
assert "urgences" in reader[3]["targetFrenchDraft"]
assert "diagnostic" in reader[4]["targetFrenchDraft"] and "médicaments" in reader[4]["targetFrenchDraft"]
assert "rapport médical" in reader[5]["targetFrenchDraft"]
assert "amande" in reader[6]["targetFrenchDraft"] and "urgences" in reader[6]["targetFrenchDraft"]
assert "amande" in reader[10]["targetFrenchDraft"] and "réaction allergique" in reader[10]["targetFrenchDraft"]
assert "carte des allergènes" in reader[11]["targetFrenchDraft"]
assert "15 jours" in reader[13]["targetFrenchDraft"]
assert "formulaire officiel de réclamation" in reader[14]["targetFrenchDraft"]
assert "rapport médical" in reader[16]["targetFrenchDraft"]
assert "Emma Clarke" in reader[17]["targetFrenchDraft"]
assert "Montréal" not in json.dumps(cards + reader, ensure_ascii=False)

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
print(f"PASS: French Breakfast Master 17 source, 24 cards, 18 Reader, 42 revision IDs, false gates, {scope['submittedCharacters']} audio characters")
