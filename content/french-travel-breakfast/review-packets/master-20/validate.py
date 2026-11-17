#!/usr/bin/env python3
"""Independently validate the inert French Breakfast Master 20 packet."""
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


packet_path = HERE / "master-20.json"
packet = json.loads(packet_path.read_text())
manifest = json.loads((HERE / "manifest.json").read_text())
candidate = json.loads((HERE / "candidate-text.json").read_text())
course = json.loads(COURSE.read_text())["lessons"][19]
passage = json.loads(READER.read_text())["lessons"]["20"]["passage"]
prior = next(x for x in json.loads(PRIOR.read_text())["lessons"] if x["stage"] == "master" and x["n"] == 20)
archive = next(x for x in json.loads(ARCHIVE.read_text())["lessons"] if x["n"] == 20)

assert course["n"] == archive["n"] == 20
assert packet["schema"] == "lt.inert-source-review.v1"
assert packet["lessonKey"] == "master:20"
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
assert len(cards) == len(course["words"]) == len(candidate["cardFrenchDrafts"]) == 23
assert len(reader) == len(passage["native"]) == len(passage["target"]) == len(candidate["readerFrenchDrafts"]) == 18
revision = lesson_sha(course, passage)[:12]
ids = []
for i, (row, source, draft) in enumerate(zip(cards, course["words"], candidate["cardFrenchDrafts"]), 1):
    assert row["id"] == f"master:20:source-{revision}:word:{i}"
    assert row["legacyDraftId"] == f"master:20:word:{i}"
    assert row["sourceSpanish"] == source["es"]
    assert row["supportEnglish"] == source["en"]
    assert row["targetFrenchDraft"] == draft and draft.strip()
    assert row["kind"] == source["kind"]
    if "note" in source:
        assert row["sourceNoteEnglish"] == source["note"]
    ids.append(row["id"])
for i, (row, es, en, draft) in enumerate(zip(reader, passage["target"], passage["native"], candidate["readerFrenchDrafts"]), 1):
    assert row["id"] == f"master:20:source-{revision}:line:{i}"
    assert row["legacyDraftId"] == f"master:20:line:{i}"
    assert row["sourceSpanish"] == es and row["supportEnglish"] == en
    assert row["targetFrenchDraft"] == draft and draft.strip()
    ids.append(row["id"])
assert len(ids) == len(set(ids)) == 41

assert "Puebla" in reader[0]["targetFrenchDraft"] and "Hotel Azulejo" in reader[0]["targetFrenchDraft"] and "Café Cholula" in reader[0]["targetFrenchDraft"]
assert "cinq membres" in reader[0]["targetFrenchDraft"] and "six" in reader[13]["targetFrenchDraft"]
assert "Emilio" in reader[1]["targetFrenchDraft"] and "champurrado" in reader[2]["targetFrenchDraft"] and "comal" in reader[2]["targetFrenchDraft"]
assert "Rosa" in reader[3]["targetFrenchDraft"] and "allergique aux cacahuètes" in reader[3]["targetFrenchDraft"]
assert "classeur des allergènes" in reader[3]["targetFrenchDraft"] and "personne ne le trouve" in reader[5]["targetFrenchDraft"]
assert "ne commandez rien" in reader[6]["targetFrenchDraft"]
assert "mole poblano" in reader[7]["targetFrenchDraft"] and "épuisé" in reader[7]["targetFrenchDraft"]
assert "pipián" in reader[9]["targetFrenchDraft"] and "ne sait pas" in reader[9]["targetFrenchDraft"]
assert "sans voir les ingrédients" in reader[10]["targetFrenchDraft"]
assert "pipián contient bien des cacahuètes" in reader[11]["targetFrenchDraft"] and "enfrijoladas n’en contiennent pas" in reader[11]["targetFrenchDraft"]
assert "n’avions pas attendu" in reader[12]["targetFrenchDraft"] and "aurait commandé" in reader[12]["targetFrenchDraft"]
assert "note concernant son allergie" in reader[13]["targetFrenchDraft"]
assert "molotes aux pommes de terre" in reader[14]["targetFrenchDraft"] and "cemitas" in reader[14]["targetFrenchDraft"]
assert "Lupita" in reader[15]["targetFrenchDraft"] and "vingt minutes" in reader[15]["targetFrenchDraft"]
assert "classeur des allergènes manquait" in reader[16]["targetFrenchDraft"] and "questionnaire de satisfaction" in reader[17]["targetFrenchDraft"]
assert "classeur des allergènes soit bien visible" in reader[17]["targetFrenchDraft"]
assert "sans danger" not in json.dumps(cards + reader, ensure_ascii=False)
assert "a mangé le pipián" not in json.dumps(cards + reader, ensure_ascii=False)

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
assert scope["selectedFrenchStrings"] == 41 and scope["potentialClipDecisions"] == 82
assert scope["submittedCharacters"] == sum(len(x["targetFrenchDraft"]) for x in cards + reader)
assert scope["estimatedGrossUsd"] == round(scope["submittedCharacters"] * 30 / 1_000_000, 6)
assert scope["estimatedGrossUsdBasis"].startswith("one-voice text baseline")
assert scope["twoVoiceSubmittedCharacters"] == 2 * scope["submittedCharacters"]
assert scope["twoVoiceEstimatedGrossUsd"] == round(2 * scope["submittedCharacters"] * 30 / 1_000_000, 6)
print(f"PASS: French Breakfast Master 20 source, 23 cards, 18 Reader, 41 revision IDs, false gates, {scope['submittedCharacters']} audio characters")
