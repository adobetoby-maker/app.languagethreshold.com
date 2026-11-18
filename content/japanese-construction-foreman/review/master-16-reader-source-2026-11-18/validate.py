#!/usr/bin/env python3
"""Independently verify Master 16 Reader source order, IDs, hashes and closed gates."""

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
    assert packet["lesson"] == 16 and packet["moduleId"] == "master-construction-foreman-ja-en"
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
    lesson = curriculum["lessons"][15]
    translation = draft["lessons"][0]
    assert lesson["n"] == translation["n"] == 16
    assert (lesson["title"], lesson["objective"], lesson["speaking"]) == (
        pinned["sourceLessonTitleEnglish"], pinned["sourceObjectiveEnglish"],
        pinned["sourceSpeakingEnglish"],
    )
    passage = reader["lessons"]["16"]["passage"]
    assert passage["title"] == pinned["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18

    phrases = {item["en"]: item["ja"] for item in translation["terms"] if item["kind"] == "phrase"}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:16:reader:line:{n}"
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
        "lesson16OriginalReaderDraftPresent": False, "reuseDecision": None
    }
    assert not list((ROOT / "content/japanese-construction-foreman").glob("master-original-reader-16*"))
    assert len(packet["openDomainReview"]) == 4
    assert all(item["qualifiedDecision"] is None for item in packet["openDomainReview"])
    english = " ".join(passage["native"])
    for required in (
        "Inés Carrillo", "Main Street", "north face", "access ladder", "scaffold erector",
        "designated competent person", "before every shift", "cross braces", "top rail",
        "midrail", "toe board", "log and on the tag", "training certificates",
        "section 3", "today's signature", "don't go up", "until the competent person",
        "corrective action", "email it",
    ):
        assert required in english, required
    print("PASS Master 16 Reader: 18 source turns, 8 conditional fragments, zero selected answers")


if __name__ == "__main__":
    main()
