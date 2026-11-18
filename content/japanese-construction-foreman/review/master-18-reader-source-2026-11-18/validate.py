#!/usr/bin/env python3
"""Independently check the Master 18 Reader source packet and closed gates."""

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
    assert (packet["target"], packet["native"], packet["stage"], packet["lesson"]) == (
        "Japanese", "English", "master", 18
    )
    assert packet["moduleId"] == "master-construction-foreman-ja-en"
    assert packet["reviewed"] is False
    assert packet["registered"] is False and packet["audioRegistered"] is False
    assert packet["reviewGates"] and all(v is False for v in packet["reviewGates"].values())

    pinned = packet["source"]
    reader, reader_hash = read_repo(pinned["readerPath"])
    curriculum, curriculum_hash = read_repo(pinned["curriculumPath"])
    draft, draft_hash = read_repo(pinned["translationDraftPath"])
    assert (reader_hash, curriculum_hash, draft_hash) == (
        pinned["readerSHA256"], pinned["curriculumSHA256"], pinned["translationDraftSHA256"]
    )
    assert draft["reviewed"] is False
    lesson = curriculum["lessons"][17]
    translation = draft["lessons"][2]
    assert lesson["n"] == translation["n"] == 18
    assert (lesson["title"], lesson["objective"], lesson["speaking"]) == (
        pinned["sourceLessonTitleEnglish"], pinned["sourceObjectiveEnglish"],
        pinned["sourceSpeakingEnglish"],
    )
    passage = reader["lessons"]["18"]["passage"]
    assert passage["title"] == pinned["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18

    phrases = {t["en"]: t["ja"] for t in translation["terms"] if t["kind"] == "phrase"}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:18:reader:line:{n}"
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
    assert conditional == 7

    assert packet["historicalPrivateReader"] == {
        "lesson18OriginalReaderDraftPresent": False, "reuseDecision": None
    }
    assert not list((ROOT / "content/japanese-construction-foreman").glob("master-original-reader-18*"))
    assert len(packet["openDomainReview"]) == 4
    assert all(q["qualifiedDecision"] is None for q in packet["openDomainReview"])
    english = " ".join(passage["native"])
    for required in (
        "Lorena Ibarra", "permit office", "Rivera Construction", "inspector is sick",
        "insulation inspection", "digit by digit", "before 10:00", "confirmed time is still",
        "4471", "email confirmation", "crew group chat", "Óscar Fuentes",
        "voice mailbox", "loaded truck", "day after tomorrow", "after the inspection",
        "at 7:00",
    ):
        assert required in english, required
    print("PASS Master 18 Reader: 18 source turns, 7 conditional fragments, zero selected answers")


if __name__ == "__main__":
    main()
