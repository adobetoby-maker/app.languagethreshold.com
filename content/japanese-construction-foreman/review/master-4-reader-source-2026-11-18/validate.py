#!/usr/bin/env python3
"""Verify Master 4's current Reader, source-specific values, and closed gates."""

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
    assert packet["lesson"] == 4 and packet["moduleId"] == "master-construction-foreman-ja-en"
    assert packet["reviewGates"] and all(value is False for value in packet["reviewGates"].values())

    source = packet["source"]
    reader, reader_hash = repo_file(source["readerPath"])
    curriculum, curriculum_hash = repo_file(source["curriculumPath"])
    draft, draft_hash = repo_file(source["translationDraftPath"])
    assert (reader_hash, curriculum_hash, draft_hash) == (
        source["readerSHA256"], source["curriculumSHA256"], source["translationDraftSHA256"]
    )
    assert draft["reviewed"] is False
    lesson = curriculum["lessons"][3]
    assert lesson["n"] == draft["lessons"][0]["n"] == 4
    assert (lesson["title"], lesson["objective"]) == (
        source["sourceLessonTitleEnglish"], source["sourceObjectiveEnglish"]
    )
    passage = reader["lessons"]["4"]["passage"]
    assert passage["title"] == source["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18

    terms = {term["en"]: term["ja"] for term in draft["lessons"][0]["terms"]}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:4:reader:line:{n}"
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
    assert conditional == 7

    old = packet["historicalPrivateReader"]
    assert len(old["rows"]) == 8 and old["reuseDecision"] is None
    assert len(old["commitSHA"]) == 40 and len(old["sha256"]) == 64
    assert all(row["japanese"] and row["english"] for row in old["rows"])
    assert len(packet["openDomainReview"]) == 3
    assert all(item["qualifiedDecision"] is None for item in packet["openDomainReview"])
    assert "silica dust can damage the lungs" in passage["native"][4]
    assert "3 quarts per bag" in passage["native"][6]
    assert "50 and 90 degrees Fahrenheit" in passage["native"][13]
    assert "30 minutes" in passage["native"][15]
    assert "3 days" in passage["native"][17]
    print("PASS Master 4 Reader: 18 source turns, 7 conditional fragments, 8 divergent old turns, zero selected answers")


if __name__ == "__main__":
    main()
