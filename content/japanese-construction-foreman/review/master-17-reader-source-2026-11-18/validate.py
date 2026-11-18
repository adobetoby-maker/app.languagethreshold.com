#!/usr/bin/env python3
"""Independently verify Master 17 Reader source order, IDs, hashes and closed gates."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = Path(__file__).with_name("packet.json")


def read_repo(path):
    raw = subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def main():
    packet = json.loads(PACKET.read_text())
    assert packet["state"] == "source-only-reader-gap-review"
    assert (packet["target"], packet["native"], packet["stage"]) == ("Japanese", "English", "master")
    assert packet["lesson"] == 17 and packet["moduleId"] == "master-construction-foreman-ja-en"
    assert packet["reviewed"] is False
    assert packet["registered"] is False and packet["audioRegistered"] is False
    assert packet["reviewGates"] and all(value is False for value in packet["reviewGates"].values())

    pinned = packet["source"]
    reader, reader_hash = read_repo(pinned["readerPath"])
    curriculum, curriculum_hash = read_repo(pinned["curriculumPath"])
    draft, draft_hash = read_repo(pinned["translationDraftPath"])
    assert (reader_hash, curriculum_hash, draft_hash) == (
        pinned["readerSHA256"], pinned["curriculumSHA256"], pinned["translationDraftSHA256"]
    )
    assert draft["reviewed"] is False
    lesson = curriculum["lessons"][16]
    translation = draft["lessons"][1]
    assert lesson["n"] == translation["n"] == 17
    assert (lesson["title"], lesson["objective"], lesson["speaking"]) == (
        pinned["sourceLessonTitleEnglish"], pinned["sourceObjectiveEnglish"],
        pinned["sourceSpeakingEnglish"],
    )
    passage = reader["lessons"]["17"]["passage"]
    assert passage["title"] == pinned["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18

    phrases = {item["en"]: item["ja"] for item in translation["terms"] if item["kind"] == "phrase"}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:17:reader:line:{n}"
        assert row["id"] not in seen
        seen.add(row["id"])
        assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
        speaker, separator, plain = en.partition(": ")
        assert row["speaker"] == (speaker if separator else None)
        candidate = phrases.get(plain if separator else en)
        assert row["conditionalJapanesePhrase"] == candidate
        assert row["conditionalPhraseFromExactTermDraft"] is bool(candidate)
        assert row["selectedJapanese"] is None and row["audioScript"] is None
        assert row["qualifiedReview"] is False
        conditional += bool(candidate)
    assert conditional == 8

    assert packet["historicalPrivateReader"] == {
        "lesson17OriginalReaderDraftPresent": False, "reuseDecision": None
    }
    assert not list((ROOT / "content/japanese-construction-foreman").glob("master-original-reader-17*"))
    assert len(packet["openDomainReview"]) == 4
    assert all(item["qualifiedDecision"] is None for item in packet["openDomainReview"])
    english = " ".join(passage["native"])
    for required in (
        "Raúl Medina", "dental clinic", "Elena Cruz", "scheduled for 7:00",
        "8 workers", "since 6:30", "called 3 times", "called in sick",
        "lack of staff, not the weather", "ordered for 7:30", "held the trucks",
        "4 hours of work", "each worker", "missing rebar in the north corner",
        "formwork", "notified by phone at 8:15", "written confirmation",
        "rescheduled for tomorrow", "dispatch office at 6:00", "forward it to the owner",
    ):
        assert required in english, required
    spanish = " ".join(passage["target"])
    for required in ("Cabe señalar que", "Sin embargo", "Por lo tanto", "Debido a"):
        assert required in spanish, required
    print("PASS Master 17 Reader: 18 source turns, 8 conditional fragments, zero selected answers")


if __name__ == "__main__":
    main()
