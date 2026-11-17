#!/usr/bin/env python3
"""Independently validate the inert Master 1 source-review packet."""

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
    archive, archive_sha = read("content/review-archive/french-japanese-2026-11-15/french-breakfast/master-1-3-draft.json")
    packet_path = HERE / "master-1.json"
    packet = json.loads(packet_path.read_text())
    manifest = json.loads((HERE / "manifest.json").read_text())
    source_lesson = course["lessons"][0]
    source_reader = reader["lessons"]["1"]["passage"]
    archive_lesson = archive["lessons"][0]
    assert packet["schema"] == "lt.inert-source-review.v1"
    assert packet["lessonKey"] == "master:1" and packet["stage"] == "master"
    assert packet["pair"] == {"target": "French", "support": "English"}
    assert source_lesson["n"] == archive_lesson["n"] == 1
    assert packet["source"]["courseSha256"] == manifest["sourceCourseSha256"] == course_sha
    assert packet["source"]["readerSha256"] == manifest["sourceReaderSha256"] == reader_sha
    assert packet["priorDraft"]["sha256"] == manifest["priorDraftSha256"] == archive_sha
    assert len(packet["cards"]) == len(source_lesson["words"]) == 22
    assert len(packet["reader"]) == len(source_reader["target"]) == len(source_reader["native"]) == 18
    assert [x["en"] for x in source_lesson["words"]] == [x["en"] for x in archive_lesson["sourceWordsEnglish"]]
    assert source_reader["native"] == archive_lesson["sourcePassageEnglish"]
    ids = []
    for n, (row, original) in enumerate(zip(packet["cards"], source_lesson["words"]), 1):
        assert row["sourceSpanish"] == original["es"]
        assert row["supportEnglish"] == original["en"]
        assert row["kind"] == original["kind"]
        assert row["id"] == f"master:1:source-20261116:word:{n}"
        assert row["priorUnregisteredId"] == f"master:1:word:{n}"
        assert isinstance(row["targetFrenchDraft"], str) and row["targetFrenchDraft"].strip()
        ids.append(row["id"])
    for n, (row, spanish, english) in enumerate(zip(packet["reader"], source_reader["target"], source_reader["native"]), 1):
        assert row["sourceSpanish"] == spanish and row["supportEnglish"] == english
        assert row["id"] == f"master:1:source-20261116:line:{n}"
        assert row["priorUnregisteredId"] == f"master:1:line:{n}"
        assert isinstance(row["targetFrenchDraft"], str) and row["targetFrenchDraft"].strip()
        ids.append(row["id"])
    assert len(ids) == len(set(ids)) == 40
    assert packet["progressIdentity"]["stableLessonKey"] == "master:1"
    assert packet["progressIdentity"]["candidateRowsRevisionScoped"] is True
    for field in ("modeInputIdsDraft", "authoredModeActivities", "formsDraft", "speakingDraft", "dictionarySensesDraft"):
        assert packet[field] is None
    assert packet["gates"] and all(value is False for value in packet["gates"].values())
    assert manifest["gates"] == packet["gates"]
    assert manifest["packetSha256"] == hashlib.sha256(packet_path.read_bytes()).hexdigest()
    assert manifest["candidateTextSha256"] == hashlib.sha256((HERE / "candidate-text.json").read_bytes()).hexdigest()
    text = " ".join(row["targetFrenchDraft"] for row in packet["reader"])
    for required in ("Thiago", "Emma", "Paco", "Lavapiés", "churros", "porras", "3 euros"):
        assert required in text, required
    for old_substitution in ("croissant", "pain au chocolat", "café parisien"):
        assert old_substitution not in text.lower(), old_substitution
    print("PASS French Breakfast Master 1: 22 exact source cards, 18 Reader turns, 40 unique revision IDs, all gates closed")


if __name__ == "__main__":
    main()
