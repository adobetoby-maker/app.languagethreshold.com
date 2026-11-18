#!/usr/bin/env python3
"""Verify Master 3's current Reader, conditional fragments, and closed gates."""

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
    assert packet["lesson"] == 3 and packet["moduleId"] == "master-construction-foreman-ja-en"
    assert packet["reviewGates"] and all(value is False for value in packet["reviewGates"].values())

    source = packet["source"]
    reader, reader_hash = repo_file(source["readerPath"])
    curriculum, curriculum_hash = repo_file(source["curriculumPath"])
    draft, draft_hash = repo_file(source["translationDraftPath"])
    assert (reader_hash, curriculum_hash, draft_hash) == (
        source["readerSHA256"], source["curriculumSHA256"], source["translationDraftSHA256"]
    )
    assert draft["reviewed"] is False
    lesson = curriculum["lessons"][2]
    assert lesson["n"] == draft["lessons"][2]["n"] == 3
    assert (lesson["title"], lesson["objective"]) == (
        source["sourceLessonTitleEnglish"], source["sourceObjectiveEnglish"]
    )
    passage = reader["lessons"]["3"]["passage"]
    assert passage["title"] == source["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18

    terms = {term["en"]: term["ja"] for term in draft["lessons"][2]["terms"]}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:3:reader:line:{n}"
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
    assert conditional == 6

    old = packet["historicalPrivateReader"]
    assert len(old["rows"]) == 8 and old["reuseDecision"] is None
    assert len(old["commitSHA"]) == 40 and len(old["sha256"]) == 64
    assert all(row["japanese"] and row["english"] for row in old["rows"])
    assert len(packet["openDomainReview"]) == 3
    assert all(item["qualifiedDecision"] is None for item in packet["openDomainReview"])
    assert lesson["words"][14]["en"] == "the competent person"
    assert "March 2022" in passage["native"][16]
    print("PASS Master 3 Reader: 18 source turns, 6 conditional fragments, 8 divergent old turns, zero selected answers")


if __name__ == "__main__":
    main()
