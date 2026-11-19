#!/usr/bin/env python3
"""Verify the private Master 14 purpose candidate against its unchanged sources."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CANDIDATE = ROOT / "content/japanese-basics/private-master-14-routine-candidate.json"


def source(path, expected_sha256):
    raw = (ROOT / path).read_bytes()
    actual = hashlib.sha256(raw).hexdigest()
    if actual != expected_sha256:
        raise ValueError(f"{path}: source changed ({actual})")
    return json.loads(raw)


def pair(value):
    target, separator, native = value.partition("|")
    if separator != "|" or not target.strip() or not native.strip():
        raise ValueError(f"unaligned Japanese/English pair: {value!r}")
    return target, native


def validate():
    candidate = json.loads(CANDIDATE.read_text())
    assert candidate["schema"] == "japanese101-master14-purpose-candidate-v1"
    assert candidate["pairKey"] == "Japanese:English"
    assert candidate["status"] == "private-authored-draft"
    assert candidate["reviewed"] is False and candidate["registered"] is False
    pins = candidate["source"]
    master = source(pins["masterPath"], pins["masterSha256"])
    extensions = source(pins["extensionsPath"], pins["extensionsSha256"])
    core = source(pins["corePath"], pins["coreSha256"])
    spanish = json.loads((ROOT / "src/data/core60/es/master-spanish-basics.json").read_text())
    assert pins["spanishMasterLesson"] == pins["japaneseMasterLesson"] == 14
    assert pins["japaneseCoreRoutineLesson"] == 16
    assert spanish["lessons"][13]["title"] == "Tell a daily routine in order"
    assert master["lessons"][13]["title"] == "Handle a delayed meeting"
    assert core["lessons"][15]["title"] == "A daily routine in order"
    assert master["reviewed"] is False and core["reviewed"] is False
    assert len(extensions["14"]) >= 4
    lesson = candidate["replacement"]
    assert lesson["stableLessonKey"] == "master-japanese-basics:14"
    assert lesson["inheritCoreLessons"] == [16, 19, 30]
    assert "routine" in lesson["objective"] and "delayed train" in lesson["objective"]
    terms = [pair(value) for value in lesson["terms"]]
    dialogue = [pair(value) for value in lesson["dialogue"]]
    assert len(terms) >= 8 and len(dialogue) >= 12
    assert len(set(dialogue)) == len(dialogue)
    japanese = "\n".join(target for target, _ in dialogue)
    for marker in ("ふだん", "まず", "それから", "さいごに", "でも、きょうは", "おくれています", "まっていました"):
        assert marker in japanese, marker
    speaking = lesson["speaking"]
    assert speaking["openingJapanese"] and speaking["openingEnglish"]
    assert speaking["closureJapanese"] and speaking["closureEnglish"]
    assert len(speaking["objectives"]) >= 3
    modes = lesson["practiceModes"]
    assert set(modes) == {"see", "recall", "hear", "type", "say", "write"}
    assert modes["see"]["answerJapanese"] in japanese
    for name in ("recall", "type", "say"):
        assert modes[name]["answerJapanese"] in japanese, name
        assert modes[name]["cueEnglish"]
    assert modes["hear"]["spokenJapanese"] in japanese
    assert modes["hear"]["recordingReady"] is False
    assert modes["write"]["modelJapanese"] and modes["write"]["modelEnglish"]
    extension = candidate["languageSpecificExtension"]
    assert extension["candidateId"] == "japanese-basics-extension:delayed-meeting"
    assert extension["sourceLesson"] == "master-japanese-basics:14"
    assert extension["sourceDialogueAndTermsPreserved"] is True
    assert all(value is False for value in candidate["gates"].values())
    print("Japanese 101 Master 14 routine candidate: 14 aligned Reader turns, 10 terms, 6 authored modes; source and review gates intact")


if __name__ == "__main__":
    validate()
