#!/usr/bin/env python3
"""Independently verify Master 14 Reader source order, IDs, hashes and closed gates."""

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
    assert packet["lesson"] == 14 and packet["moduleId"] == "master-construction-foreman-ja-en"
    assert packet["reviewGates"] and all(value is False for value in packet["reviewGates"].values())

    pinned = packet["source"]
    reader, reader_hash = read_repo(pinned["readerPath"])
    curriculum, curriculum_hash = read_repo(pinned["curriculumPath"])
    draft, draft_hash = read_repo(pinned["translationDraftPath"])
    assert (reader_hash, curriculum_hash, draft_hash) == (
        pinned["readerSHA256"], pinned["curriculumSHA256"], pinned["translationDraftSHA256"]
    )
    assert draft["reviewed"] is False
    lesson = curriculum["lessons"][13]
    translation = draft["lessons"][1]
    assert lesson["n"] == translation["n"] == 14
    assert (lesson["title"], lesson["objective"]) == (
        pinned["sourceLessonTitleEnglish"], pinned["sourceObjectiveEnglish"]
    )
    passage = reader["lessons"]["14"]["passage"]
    assert passage["title"] == pinned["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18

    terms = {item["en"]: item["ja"] for item in translation["terms"]}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:14:reader:line:{n}"
        assert row["id"] not in seen
        seen.add(row["id"])
        assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
        speaker, separator, plain = en.partition(": ")
        assert row["speaker"] == (speaker if separator else None)
        candidate = terms.get(plain if separator else en)
        assert row["conditionalJapanesePhrase"] == candidate
        assert row["conditionalPhraseFromExactTermDraft"] is bool(candidate)
        assert row["selectedJapanese"] is None and row["audioScript"] is None
        assert row["qualifiedReview"] is False
        conditional += bool(candidate)
    assert conditional == 8

    assert packet["historicalPrivateReader"] == {
        "lesson14OriginalReaderDraftPresent": False, "reuseDecision": None
    }
    assert not (ROOT / "content/japanese-construction-foreman/master-original-reader-13-15-draft.json").exists()
    assert len(packet["openDomainReview"]) == 4
    assert all(item["qualifiedDecision"] is None for item in packet["openDomainReview"])
    english = " ".join(passage["native"])
    for required in (
        "bridge abutment", "rebar bundle", "wood blocking", "10 feet", "nobody was hurt",
        "Ramón Ortega", "Alma Guzmán", "Nicolás Herrera", "single choker sling",
        "center of gravity", "two choker slings", "lift plan", "tag line",
        "suspended load", "lessons learned", "tomorrow",
    ):
        assert required in english, required
    print("PASS Master 14 Reader: 18 source turns, 8 conditional fragments, zero selected answers")


if __name__ == "__main__":
    main()
