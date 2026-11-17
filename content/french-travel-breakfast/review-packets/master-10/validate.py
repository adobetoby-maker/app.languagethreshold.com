#!/usr/bin/env python3
"""Independent source, identity, gate and scope checks for Master 10."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
COURSE = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/master-10-12-draft.json"
PRIOR = ROOT / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def lesson_sha(course, passage):
    raw = json.dumps({"course": course, "passage": passage}, ensure_ascii=False, sort_keys=True)
    return hashlib.sha256(raw.encode()).hexdigest()


course = json.loads(COURSE.read_text())["lessons"][9]
passage = json.loads(READER.read_text())["lessons"]["10"]["passage"]
prior = next(x for x in json.loads(PRIOR.read_text())["lessons"] if x["stage"] == "master" and x["n"] == 10)
packet_path = HERE / "master-10.json"
packet = json.loads(packet_path.read_text())
manifest = json.loads((HERE / "manifest.json").read_text())
candidate = json.loads((HERE / "candidate-text.json").read_text())
assert packet["schema"] == "lt.inert-source-review.v1"
assert packet["lessonKey"] == "master:10"
assert packet["pair"] == {"target": "French", "support": "English"}
assert packet["source"]["courseSha256"] == manifest["sourceCourseSha256"] == sha(COURSE)
assert packet["source"]["readerSha256"] == manifest["sourceReaderSha256"] == sha(READER)
assert packet["source"]["lessonSha256"] == lesson_sha(course, passage)
assert packet["priorDraft"]["archiveSha256"] == manifest["archiveSha256"] == sha(ARCHIVE)
assert packet["priorDraft"]["runtimeSha256"] == manifest["priorRuntimeSha256"] == sha(PRIOR)
assert manifest["candidateSha256"] == sha(HERE / "candidate-text.json")
assert manifest["packetSha256"] == sha(packet_path)
assert packet["source"]["titleEnglish"] == course["title"]
assert packet["source"]["objectiveEnglish"] == course["objective"]
assert packet["source"]["speakingEnglish"] == course["speaking"]
assert packet["source"]["sourceGrammar"] == course["grammar"]
assert packet["source"]["passageTitleSpanish"] == passage["title"]
assert len(packet["cards"]) == len(course["words"]) == len(candidate["cardsFrench"]) == len(prior["words"]) == 23
assert len(packet["reader"]) == len(passage["target"]) == len(passage["native"]) == len(candidate["readerFrench"]) == len(prior["reader"]) == 17

revision = lesson_sha(course, passage)[:12]
ids = []
for i, (row, source, french, old) in enumerate(zip(packet["cards"], course["words"], candidate["cardsFrench"], prior["words"]), 1):
    assert row["id"] == f"master:10:source-{revision}:word:{i}"
    assert row["legacyDraftId"] == old["id"] == f"master:10:word:{i}"
    assert row["sourceSpanish"] == source["es"]
    assert row["supportEnglish"] == source["en"]
    assert row["targetFrenchDraft"] == french and french.strip()
    assert row["kind"] == source["kind"]
    ids.append(row["id"])
for i, (row, es, en, french, old) in enumerate(zip(packet["reader"], passage["target"], passage["native"], candidate["readerFrench"], prior["reader"]), 1):
    assert row["id"] == f"master:10:source-{revision}:line:{i}"
    assert row["legacyDraftId"] == old["id"] == f"master:10:line:{i}"
    assert row["sourceSpanish"] == es and row["supportEnglish"] == en
    assert row["targetFrenchDraft"] == french and french.strip()
    ids.append(row["id"])
assert len(ids) == len(set(ids)) == 40

assert [x["mode"] for x in packet["modeActivitiesDraft"]] == ["See", "Recall", "Hear", "Type", "Say", "Write"]
by_id = {x["id"]: x for x in packet["cards"] + packet["reader"]}
for mode in packet["modeActivitiesDraft"]:
    row = by_id[mode["sourceRef"]]
    assert mode["targetFrenchDraft"] == row["targetFrenchDraft"]
    assert mode["supportEnglish"] == row["supportEnglish"]
    assert mode["recordedAudio"] is False and mode["readyForLearner"] is False
assert len(packet["formsDraft"]) == 5
assert packet["speakingDraft"]["openingFrench"]

text = json.dumps(packet["cards"] + packet["reader"], ensure_ascii=False)
for required in ("Cusco", "Ana", "Lars", "Wilber", "San Pedro", "mal des montagnes", "maté de coca", "six heures", "sept heures", "6 h 45", "dix minutes", "bouillon de poule", "pan chuta", "quinoa"):
    assert required in text, required
assert "Chamonix" not in text and "boulangerie voisine" not in text
assert "Wilber a aussi dit" in packet["reader"][12]["targetFrenchDraft"]
assert "mal des montagnes" in packet["reader"][5]["targetFrenchDraft"]
assert "le marché ouvrait à six heures" in packet["reader"][10]["targetFrenchDraft"]
assert "sept heures" in packet["reader"][8]["targetFrenchDraft"]
assert packet["dictionarySensesReviewed"] is False
assert packet["aiAssistance"]["actualModelUsage"] == {}
assert packet["aiAssistance"]["qualifiedApproval"] is False
assert all(value is False for value in packet["gates"].values())
assert all(manifest[key] is False for key in ("reviewed", "registered", "audioRegistered"))
scope = packet["audioScope"]
assert scope["selectedFrenchStrings"] == 40 and scope["potentialClipDecisions"] == 80
assert scope["submittedCharacters"] == sum(len(x["targetFrenchDraft"]) for x in packet["cards"] + packet["reader"])
assert scope["estimatedGrossUsd"] == round(scope["submittedCharacters"] * 30 / 1_000_000, 6)
assert not list(HERE.glob("*.mp3")) and not list(HERE.glob("*.wav"))
print(f"PASS: Master 10 current source, 23 cards, 17 Reader, 40 revision IDs, six inert mode cues, closed gates, {scope['submittedCharacters']} audio-estimate characters")
