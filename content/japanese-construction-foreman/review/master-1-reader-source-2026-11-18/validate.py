#!/usr/bin/env python3
"""Verify Master 1 source anchors and that no draft Reader answer is selected."""

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
    assert packet["target"] == "Japanese" and packet["native"] == "English"
    assert packet["state"] == "source-only-reader-gap-review"
    assert packet["moduleId"] == "master-construction-foreman-ja-en"
    assert all(value is False for value in packet["reviewGates"].values())
    source = packet["source"]
    reader, reader_hash = repo_file(source["readerPath"])
    curriculum, curriculum_hash = repo_file(source["curriculumPath"])
    draft, draft_hash = repo_file(source["translationDraftPath"])
    assert reader_hash == source["readerSHA256"]
    assert curriculum_hash == source["curriculumSHA256"]
    assert draft_hash == source["translationDraftSHA256"]
    assert draft["reviewed"] is False
    lesson = curriculum["lessons"][0]
    assert lesson["n"] == 1
    assert lesson["title"] == source["sourceLessonTitleEnglish"]
    assert lesson["objective"] == source["sourceObjectiveEnglish"]
    passage = reader["lessons"]["1"]["passage"]
    assert passage["title"] == source["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18
    terms = {term["en"]: term["ja"] for term in draft["lessons"][0]["terms"]}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:1:reader:line:{n}"
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
    assert conditional == 8
    print("PASS Master 1 Reader: 18 exact source turns, 8 conditional phrases, zero selected answers")


if __name__ == "__main__":
    main()
