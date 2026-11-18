#!/usr/bin/env python3
"""Independently verify current Master 6 Reader source and closed gates."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = Path(__file__).with_name("packet.json")


def read_repo(path, revision="HEAD"):
    raw = subprocess.check_output(["git", "show", f"{revision}:{path}"], cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def main():
    packet = json.loads(PACKET.read_text())
    assert packet["state"] == "source-only-reader-gap-review"
    assert (packet["target"], packet["native"], packet["stage"]) == ("Japanese", "English", "master")
    assert packet["lesson"] == 6 and packet["moduleId"] == "master-construction-foreman-ja-en"
    assert packet["reviewGates"] and all(value is False for value in packet["reviewGates"].values())

    pinned = packet["source"]
    reader, reader_hash = read_repo(pinned["readerPath"])
    curriculum, curriculum_hash = read_repo(pinned["curriculumPath"])
    draft, draft_hash = read_repo(pinned["translationDraftPath"])
    assert (reader_hash, curriculum_hash, draft_hash) == (
        pinned["readerSHA256"], pinned["curriculumSHA256"], pinned["translationDraftSHA256"]
    )
    assert draft["reviewed"] is False
    lesson = curriculum["lessons"][5]
    assert lesson["n"] == draft["lessons"][2]["n"] == 6
    assert (lesson["title"], lesson["objective"]) == (
        pinned["sourceLessonTitleEnglish"], pinned["sourceObjectiveEnglish"]
    )
    passage = reader["lessons"]["6"]["passage"]
    assert passage["title"] == pinned["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18

    terms = {item["en"]: item["ja"] for item in draft["lessons"][2]["terms"]}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:6:reader:line:{n}"
        assert row["id"] not in seen
        seen.add(row["id"])
        assert (row["sourceSpanish"], row["sourceEnglish"]) == (es, en)
        speaker, separator, plain = en.partition(": ")
        assert row["speaker"] == (speaker if separator else None)
        candidate = terms.get(plain if separator else en)
        assert row["conditionalJapanesePhrase"] == candidate
        assert row["conditionalPhraseFromExactTermDraft"] is bool(candidate)
        assert row["selectedJapanese"] is None and row["qualifiedReview"] is False
        conditional += bool(candidate)
    assert conditional == 8

    old = packet["historicalPrivateReader"]
    archived, archive_hash = read_repo(old["path"], old["commitSHA"])
    assert archive_hash == old["sha256"]
    old_lesson = next(item for item in archived["lessons"] if item["n"] == 6)
    assert old_lesson["title"] == old["title"]
    assert old["rows"] == [
        {"japanese": item["target"], "english": item["native"]} for item in old_lesson["sentences"]
    ]
    assert len(old["rows"]) == 8 and old["reuseDecision"] is None
    assert len(packet["openDomainReview"]) == 3
    assert all(item["qualifiedDecision"] is None for item in packet["openDomainReview"])
    english = " ".join(passage["native"])
    for required in ("U-factor", "wind rating", "tempered glass", "rough opening", "flashing", "building envelope", "critical path", "written approval"):
        assert required in english, required
    print("PASS Master 6 Reader: 18 source turns, 8 conditional fragments, 8 divergent old turns, zero selected answers")


if __name__ == "__main__":
    main()
