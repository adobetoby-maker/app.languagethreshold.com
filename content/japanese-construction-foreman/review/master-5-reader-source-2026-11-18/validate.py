#!/usr/bin/env python3
"""Verify Master 5's current Reader, exact source values and closed gates."""

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
    assert packet["lesson"] == 5 and packet["moduleId"] == "master-construction-foreman-ja-en"
    assert packet["reviewGates"] and all(value is False for value in packet["reviewGates"].values())

    source = packet["source"]
    reader, reader_hash = repo_file(source["readerPath"])
    curriculum, curriculum_hash = repo_file(source["curriculumPath"])
    draft, draft_hash = repo_file(source["translationDraftPath"])
    assert (reader_hash, curriculum_hash, draft_hash) == (
        source["readerSHA256"], source["curriculumSHA256"], source["translationDraftSHA256"]
    )
    assert draft["reviewed"] is False
    lesson = curriculum["lessons"][4]
    assert lesson["n"] == draft["lessons"][1]["n"] == 5
    assert (lesson["title"], lesson["objective"]) == (
        source["sourceLessonTitleEnglish"], source["sourceObjectiveEnglish"]
    )
    passage = reader["lessons"]["5"]["passage"]
    assert passage["title"] == source["sourceReaderTitleSpanish"]
    assert len(passage["target"]) == len(passage["native"]) == len(packet["rows"]) == 18

    terms = {term["en"]: term["ja"] for term in draft["lessons"][1]["terms"]}
    seen = set()
    conditional = 0
    for n, (row, es, en) in enumerate(zip(packet["rows"], passage["target"], passage["native"]), 1):
        assert row["id"] == f"master-construction-foreman-ja-en:lesson:5:reader:line:{n}"
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
    raw = subprocess.check_output(["git", "show", f"{old['commitSHA']}:{old['path']}"], cwd=ROOT)
    assert hashlib.sha256(raw).hexdigest() == old["sha256"]
    historical = next(x for x in json.loads(raw)["lessons"] if x["n"] == 5)
    assert historical["title"] == old["title"]
    assert old["rows"] == [
        {"japanese": x["target"], "english": x["native"]} for x in historical["sentences"]
    ]
    assert len(old["rows"]) == 8 and old["reuseDecision"] is None
    assert len(packet["openDomainReview"]) == 3
    assert all(item["qualifiedDecision"] is None for item in packet["openDomainReview"])
    assert "broken lid" in passage["native"][2]
    assert "bearing capacity" in passage["native"][8]
    assert "health department" in passage["native"][9]
    assert "compaction test" in passage["native"][11]
    assert "change order" in passage["native"][17]
    print("PASS Master 5 Reader: 18 source turns, 8 conditional fragments, 8 divergent old turns, zero selected answers")


if __name__ == "__main__":
    main()
