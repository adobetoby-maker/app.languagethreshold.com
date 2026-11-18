#!/usr/bin/env python3
"""Independently check the Master 19 Reader source packet and closed gates."""

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
        "Japanese", "English", "master", 19
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
    lesson = curriculum["lessons"][18]
    translation = draft["lessons"][0]
    assert lesson["n"] == translation["n"] == 19
    assert (lesson["title"], lesson["objective"], lesson["speaking"]) == (
        pinned["sourceLessonTitleEnglish"], pinned["sourceObjectiveEnglish"],
        pinned["sourceSpeakingEnglish"],
    )
    passage = reader["lessons"]["19"]["passage"]
    assert passage["title"] == pinned["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18

    phrases = {t["en"]: t["ja"] for t in translation["terms"] if t["kind"] == "phrase"}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:19:reader:line:{n}"
        assert row["id"] not in seen
        seen.add(row["id"])
        assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
        speaker, separator, plain = en.partition(": ")
        assert row["speaker"] == (speaker if separator and speaker == "Ramón" else None)
        assert row["embeddedSpeech"] == (plain if separator and speaker != "Ramón" else None)
        candidate = phrases.get(plain if separator else en)
        assert row["conditionalJapanesePhrase"] == candidate
        assert row["conditionalPhraseFromExactTermDraft"] is bool(candidate)
        assert row["selectedJapanese"] is None and row["audioScript"] is None
        assert row["qualifiedReview"] is False
        conditional += bool(candidate)
    assert conditional == 8

    assert packet["historicalPrivateReader"] == {
        "lesson19OriginalReaderDraftPresent": False, "reuseDecision": None
    }
    assert not list((ROOT / "content/japanese-construction-foreman").glob("master-original-reader-19*"))
    assert len(packet["openDomainReview"]) == 4
    assert all(q["qualifiedDecision"] is None for q in packet["openDomainReview"])
    english = " ".join(passage["native"])
    for required in (
        "Pequeños Pasos", "Claudia Benítez", "1 year", "as soon as you sign",
        "infants' room", "hairline cracks", "almost always", "at no cost",
        "unless the contract", "workmanship defect", "gets wider", "normal use",
        "misuse", "heavy book shelving", "drywall", "in-wall blocking",
        "wall anchors", "load capacity", "project engineer", "in writing",
        "Don't hang", "approval", "might not cover", "maintenance manual",
    ):
        assert required in english, required
    print("PASS Master 19 Reader: 18 source turns, 8 conditional fragments, zero selected answers")


if __name__ == "__main__":
    main()
