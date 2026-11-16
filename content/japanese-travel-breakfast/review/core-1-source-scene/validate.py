"""Independent pinned-source, row-identity and false-gate checks for Core 1."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def load(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate():
    packet = load(HERE / "source-setting-candidate.json")
    assert packet["pairKey"] == "Japanese:English"
    assert packet["track"] == "travel-breakfast" and packet["stage"] == "core"
    assert packet["lessonKey"] == "core:1" and packet["reviewed"] is False
    assert len(packet["gates"]) >= 12 and all(value is False for value in packet["gates"].values())
    src, archived = packet["source"], packet["archivedDraft"]
    for meta, path_key, hash_key in (
        (src, "planPath", "planSha256"), (src, "readerPath", "readerSha256"),
        (archived, "path", "sha256"),
    ):
        assert sha(ROOT / meta[path_key]) == meta[hash_key]
    plan = (ROOT / src["planPath"]).read_text()
    assert src["objectiveEnglish"] in plan and src["roleplayEnglish"] in plan
    reader_file = load(ROOT / src["readerPath"])
    assert reader_file["reviewed"] is False
    source = reader_file["lessons"]["1"]
    old = load(ROOT / archived["path"])["lessons"][0]
    stable = "travel-breakfast:1:ja-en"
    assert packet["stableLessonId"] == old["stableId"] == stable
    assert old["sourceEnglish"]["objective"] == src["objectiveEnglish"]
    assert old["sourceEnglish"]["roleplay"] == src["roleplayEnglish"]
    assert source["passage"]["title"] == src["readerTitleSpanish"]
    assert src["sourceVerbExamples"] == [v["example"] for v in source["verbs"]]
    cards, turns = packet["sourceCards"], packet["sourceSettingReader"]
    assert len(cards) == len(source["words"]) == 15
    assert len(turns) == len(source["passage"]["target"]) == len(source["passage"]["native"]) == 9
    ids = set()
    for i, (card, word) in enumerate(zip(cards, source["words"]), 1):
        assert card["candidatePosition"] == i
        assert card["id"] == f"{stable}:card:source-scene-v1:{i:02d}"
        assert card["candidateCardRevision"] == f"{stable}:card:source-scene-v1"
        assert (card["sourceSpanish"], card["sourceEnglish"], card["kind"], card["sourceNoteInternal"]) == (
            word["es"], word["en"], word["kind"], word.get("note"))
        assert sha_text(card["targetJapaneseDraft"]) == card["candidateTextSha256"]
        assert card["literalJapaneseGlossEn"] and card["sourceEnglishIsJapaneseGloss"] is False
        assert card["id"] not in ids
        ids.add(card["id"])
    for i, (turn, es, en) in enumerate(zip(turns, source["passage"]["target"], source["passage"]["native"]), 1):
        assert turn["candidatePosition"] == i
        assert turn["id"] == f"{stable}:reader:source-scene-v1:{i:02d}"
        assert turn["candidateReaderRevision"] == f"{stable}:reader:source-scene-v1"
        assert (turn["sourceSpanish"], turn["sourceEnglish"]) == (es, en)
        assert turn["speaker"] == "Narrator"
        assert sha_text(turn["targetJapaneseDraft"]) == turn["candidateTextSha256"]
        assert turn["literalJapaneseGlossEn"] and turn["sourceEnglishIsJapaneseGloss"] is False
        assert turn["id"] not in ids
        ids.add(turn["id"])
    for key, rows in (("oldCardPositionPlan", old["cards"]), ("oldReaderPositionPlan", old["reader"])):
        pos = packet[key]
        assert len(pos) == len(rows)
        for i, (item, row) in enumerate(zip(pos, rows), 1):
            assert item["old"] == i and item["candidate"] is None
            assert item["oldEnglish"] == row["en"]
            assert "no saved-item migration" in item["disposition"]
    assert "no shipped progress migration" in packet["savedPositionPolicy"]
    assert len(ids) == 24 and "パン・ドゥルセ" in turns[8]["targetJapaneseDraft"]
    assert "サム" not in " ".join(turn["targetJapaneseDraft"] for turn in turns)
    print("PASS Core 1: 15 exact source cards, nine Reader turns, text-hashed revision IDs, false gates")


def sha_text(text):
    return hashlib.sha256(text.encode()).hexdigest()


if __name__ == "__main__":
    validate()
