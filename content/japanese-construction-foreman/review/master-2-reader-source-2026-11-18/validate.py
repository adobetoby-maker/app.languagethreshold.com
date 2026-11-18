#!/usr/bin/env python3
"""Verify Master 2 source, conditional fragments and closed release gates."""

import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
PACKET = Path(__file__).with_name("packet.json")


def repo_file(path):
    raw = subprocess.check_output(["git", "show", f"HEAD:{path}"], cwd=ROOT)
    return json.loads(raw), hashlib.sha256(raw).hexdigest()


def main():
    packet = json.loads(PACKET.read_text())
    assert packet["state"] == "source-only-reader-gap-review"
    assert packet["target"] == "Japanese" and packet["native"] == "English"
    assert packet["lesson"] == 2 and packet["moduleId"] == "master-construction-foreman-ja-en"
    assert all(value is False for value in packet["reviewGates"].values())
    source = packet["source"]
    reader, reader_hash = repo_file(source["readerPath"])
    curriculum, curriculum_hash = repo_file(source["curriculumPath"])
    draft, draft_hash = repo_file(source["translationDraftPath"])
    assert (reader_hash, curriculum_hash, draft_hash) == (
        source["readerSHA256"], source["curriculumSHA256"], source["translationDraftSHA256"]
    )
    assert draft["reviewed"] is False
    lesson = curriculum["lessons"][1]
    assert lesson["n"] == 2
    assert lesson["title"] == source["sourceLessonTitleEnglish"]
    assert lesson["objective"] == source["sourceObjectiveEnglish"]
    blocker = packet["openSourceTechnicalQuestion"]
    assert blocker["sourceWordIndexZeroBased"] == 16
    assert blocker["sourceEnglish"] == lesson["words"][16]["en"]
    assert blocker["sourceSpanish"] == lesson["words"][16]["es"]
    assert blocker["qualifiedConcreteDecision"] is None
    passage = reader["lessons"]["2"]["passage"]
    assert passage["title"] == source["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18
    terms = {term["en"]: term["ja"] for term in draft["lessons"][1]["terms"]}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:2:reader:line:{n}"
        assert row["id"] not in seen
        seen.add(row["id"])
        assert row["sourceSpanish"] == es and row["sourceEnglish"] == en
        speaker, separator, plain = en.partition(": ")
        assert row["speaker"] == (speaker if separator else None)
        candidate = terms.get(plain if separator else en)
        assert row["conditionalJapanesePhrase"] == candidate
        assert row["conditionalPhraseFromExactTermDraft"] is bool(candidate)
        assert row["selectedJapanese"] is None and row["qualifiedReview"] is False
        conditional += bool(candidate)
    assert conditional == 7
    print("PASS Master 2 Reader: 18 source turns, 7 conditional phrases, source question open, zero selected answers")


if __name__ == "__main__":
    main()
