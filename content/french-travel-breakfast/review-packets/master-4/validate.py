#!/usr/bin/env python3
"""Independently validate the inert Master 4 source-review packet."""

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def read(relative):
    path = ROOT / relative
    return json.loads(path.read_text()), hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    course, course_sha = read("src/data/core60/es/master-travel-breakfast.json")
    reader, reader_sha = read("public/lesson-content/es/master-travel-breakfast.json")
    archive, archive_sha = read("content/review-archive/french-japanese-2026-11-15/french-breakfast/master-4-6-draft.json")
    packet_path = HERE / "master-4.json"
    packet = json.loads(packet_path.read_text())
    manifest = json.loads((HERE / "manifest.json").read_text())
    source_lesson = course["lessons"][3]
    source_reader = reader["lessons"]["4"]["passage"]
    archive_lesson = archive["lessons"][0]
    assert packet["schema"] == "lt.inert-source-review.v1"
    assert packet["lessonKey"] == "master:4" and packet["stage"] == "master"
    assert packet["pair"] == {"target": "French", "support": "English"}
    assert source_lesson["n"] == archive_lesson["n"] == 4
    assert packet["source"]["courseSha256"] == manifest["sourceCourseSha256"] == course_sha
    assert packet["source"]["readerSha256"] == manifest["sourceReaderSha256"] == reader_sha
    assert packet["priorDraft"]["sha256"] == manifest["priorDraftSha256"] == archive_sha
    assert len(packet["cards"]) == len(source_lesson["words"]) == 23
    assert len(packet["reader"]) == len(source_reader["target"]) == len(source_reader["native"]) == 18
    assert len(archive_lesson["sourceWordsEnglish"]) == 23
    assert len(archive_lesson["sourcePassageEnglish"]) == 18
    assert archive_lesson["sourceWordsEnglish"][20]["en"] != source_lesson["words"][20]["en"]
    assert archive_lesson["sourcePassageEnglish"][10] != source_reader["native"][10]
    assert archive_lesson["sourcePassageEnglish"][15] != source_reader["native"][15]
    ids = []
    for n, (row, original) in enumerate(zip(packet["cards"], source_lesson["words"]), 1):
        assert row["sourceSpanish"] == original["es"]
        assert row["supportEnglish"] == original["en"]
        assert row["kind"] == original["kind"]
        assert row["id"] == f"master:4:source-20261117:word:{n}"
        assert row["priorUnregisteredId"] == f"master:4:word:{n}"
        assert isinstance(row["targetFrenchDraft"], str) and row["targetFrenchDraft"].strip()
        ids.append(row["id"])
    for n, (row, spanish, english) in enumerate(zip(packet["reader"], source_reader["target"], source_reader["native"]), 1):
        assert row["sourceSpanish"] == spanish and row["supportEnglish"] == english
        assert row["id"] == f"master:4:source-20261117:line:{n}"
        assert row["priorUnregisteredId"] == f"master:4:line:{n}"
        assert isinstance(row["targetFrenchDraft"], str) and row["targetFrenchDraft"].strip()
        ids.append(row["id"])
    assert len(ids) == len(set(ids)) == 41
    assert packet["progressIdentity"]["stableLessonKey"] == "master:4"
    assert packet["progressIdentity"]["candidateRowsRevisionScoped"] is True
    for field in ("modeInputIdsDraft", "authoredModeActivities", "formsDraft", "speakingDraft", "dictionarySensesDraft"):
        assert packet[field] is None
    assert packet["gates"] and all(value is False for value in packet["gates"].values())
    assert manifest["gates"] == packet["gates"]
    assert manifest["packetSha256"] == hashlib.sha256(packet_path.read_bytes()).hexdigest()
    assert manifest["candidateTextSha256"] == hashlib.sha256((HERE / "candidate-text.json").read_bytes()).hexdigest()
    text = " ".join(row["targetFrenchDraft"] for row in packet["reader"])
    for required in ("Elif", "Renzo", "Miraflores", "3 mars", "septembre", "sésame", "traces", "auto-injecteur", "ambulance"):
        assert required in text, required
    for old_substitution in ("montréal", "chocolat chaud", "aucun contact croisé", "sauter le buffet"):
        assert old_substitution not in text.lower(), old_substitution
    assert "Après avoir lu l'étiquette, je te dirai ce que tu peux manger." == packet["cards"][20]["targetFrenchDraft"]
    assert "le chef de cuisine peut préparer des œufs brouillés" in packet["reader"][15]["targetFrenchDraft"]
    assert "peut contenir des traces de sésame" in packet["reader"][13]["targetFrenchDraft"].lower()
    assert "les graines sur le pain de mie sont du sésame" in packet["reader"][12]["targetFrenchDraft"]
    print("PASS French Breakfast Master 4: 23 exact source cards, 18 Reader turns, 41 unique revision IDs, all gates closed")


if __name__ == "__main__":
    main()
