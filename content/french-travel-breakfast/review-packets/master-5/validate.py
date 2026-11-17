#!/usr/bin/env python3
"""Read-only exact-source, identity and closed-gate check for Master 5."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
manifest = json.loads((HERE / "manifest.json").read_text())
packet = json.loads((HERE / "master-5.json").read_text())
source = packet["source"]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


curriculum_path = ROOT / source["curriculumPath"]
reader_path = ROOT / source["readerPath"]
prior_path = ROOT / packet["priorDraft"]["path"]
assert source["curriculumSha256"] == manifest["curriculumSha256"] == digest(curriculum_path)
assert source["readerSha256"] == manifest["readerSha256"] == digest(reader_path)
assert packet["priorDraft"]["sha256"] == manifest["priorDraftSha256"] == digest(prior_path)
assert manifest["candidateSha256"] == digest(HERE / "candidate-final.json")
assert manifest["packetSha256"] == digest(HERE / "master-5.json")

lesson = next(row for row in json.loads(curriculum_path.read_text())["lessons"] if row["n"] == 5)
passage = json.loads(reader_path.read_text())["lessons"]["5"]["passage"]
prior = next(row for row in json.loads(prior_path.read_text())["lessons"] if row["stage"] == "master" and row["n"] == 5)
assert packet["lessonKey"] == "master:5"
assert packet["pair"] == {"target": "French", "support": "English"}
assert source["titleEnglish"] == lesson["title"]
assert source["objectiveEnglish"] == lesson["objective"]
assert source["speakingEnglish"] == lesson["speaking"]
assert source["grammarFocusSpanish"] == lesson["grammar"]["focus"]
assert source["readerTitleSpanish"] == passage["title"]
assert len(packet["cards"]) == len(lesson["words"]) == len(prior["words"]) == 23
assert len(packet["reader"]) == len(passage["native"]) == len(passage["target"]) == len(prior["reader"]) == 18


def expected_id(kind, n, es, en):
    anchor = hashlib.sha256((es + "\u0000" + en).encode()).hexdigest()[:10]
    return f"master:5:{kind}:{n}:source-{anchor}"


seen = set()
for n, (row, source_row, old) in enumerate(zip(packet["cards"], lesson["words"], prior["words"]), 1):
    es, en = source_row["es"], source_row["en"]
    assert row["id"] == expected_id("word", n, es, en)
    assert row["priorUnregisteredId"] == old["id"] == f"master:5:word:{n}"
    assert row["sourceSpanish"] == es and row["supportEnglish"] == en
    assert row["kind"] == source_row["kind"]
    assert isinstance(row["targetFrenchDraft"], str) and row["targetFrenchDraft"].strip()
    assert row["id"] not in seen
    seen.add(row["id"])
for n, (row, es, en, old) in enumerate(zip(packet["reader"], passage["target"], passage["native"], prior["reader"]), 1):
    assert row["id"] == expected_id("line", n, es, en)
    assert row["priorUnregisteredId"] == old["id"] == f"master:5:line:{n}"
    assert row["sourceSpanish"] == es and row["supportEnglish"] == en
    assert isinstance(row["targetFrenchDraft"], str) and row["targetFrenchDraft"].strip()
    assert row["id"] not in seen
    seen.add(row["id"])

text = "\n".join(row["targetFrenchDraft"] for row in packet["cards"] + packet["reader"])
for token in ("Daniel", "Yesenia", "Cartagena", "terrasse", "huit heures", "fuite", "sept heures", "café d'à côté", "bon", "direction", "10 %"):
    assert token in text, token
for key, value in packet["gates"].items():
    assert key in manifest["gates"] and value is False and manifest["gates"][key] is False
assert packet["authoredModeActivities"] is None
assert packet["speakingDraft"] is None
assert packet["formTrainingDraft"] is None
assert packet["dictionarySensesReviewed"] is False
assert packet["progressIdentity"]["reuseDecision"].startswith("blocked")
audio = packet["audioScopeReadOnly"]
assert audio["candidateTextPositions"] == 41
assert audio["twoVoiceClipDecisions"] == 82
assert audio["submittedFrenchCharacters"] == 2 * sum(len(row["targetFrenchDraft"]) for row in packet["cards"] + packet["reader"])
assert audio["synthesized"] is False and audio["listeningReviewed"] is False
print("PASS: 23 source-order cards, 18 Reader turns, revision IDs, hashes, audio scope and all gates closed")
