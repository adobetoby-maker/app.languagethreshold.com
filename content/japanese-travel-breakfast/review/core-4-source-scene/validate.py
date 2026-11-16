"""Independent source, identity, and closed-gate checks for the Core 4 packet."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def load(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha_text(text):
    return hashlib.sha256(text.encode()).hexdigest()


def validate():
    packet = load(HERE / "source-setting-candidate.json")
    assert packet["pairKey"] == "Japanese:English" and packet["track"] == "travel-breakfast"
    assert packet["stage"] == "core" and packet["stageId"] == "travel-breakfast"
    assert packet["lessonKey"] == "core:4" and packet["lessonNumber"] == 4
    assert packet["reviewed"] is False
    assert len(packet["gates"]) >= 12 and all(value is False for value in packet["gates"].values())
    src, archived = packet["source"], packet["archivedDraft"]
    for meta, path_key, hash_key in (
        (src, "planPath", "planSha256"), (src, "readerPath", "readerSha256"),
        (archived, "path", "sha256"),
    ):
        assert sha(ROOT / meta[path_key]) == meta[hash_key]
    plan = (ROOT / src["planPath"]).read_text()
    for key in ("planTitleEnglish", "objectiveEnglish", "roleplayEnglish"):
        assert src[key] in plan
    reader_file = load(ROOT / src["readerPath"])
    assert reader_file["reviewed"] is False
    source = reader_file["lessons"]["4"]
    archive_file = load(ROOT / archived["path"])
    assert archive_file["reviewed"] is False and archive_file["registered"] is False
    old = archive_file["lessons"][3]
    stable = "travel-breakfast:4:ja-en"
    revision = stable + ":source-scene-v1"
    assert packet["stableLessonId"] == old["stableId"] == stable
    assert packet["candidateRevision"] == revision
    assert old["sourceEnglish"]["objective"] == src["objectiveEnglish"]
    assert old["sourceEnglish"]["roleplay"] == src["roleplayEnglish"]
    assert old["sourceEnglish"]["englishWordAnchors"] == [word["en"] for word in source["words"]]
    assert old["sourceEnglish"]["englishReading"] == source["passage"]["native"]
    assert source["passage"]["title"] == src["readerTitleSpanish"]
    assert src["sourceVerbs"] == source["verbs"]
    cards, turns = packet["sourceCards"], packet["sourceSettingReader"]
    assert len(cards) == len(source["words"]) == 18
    assert len(turns) == len(source["passage"]["target"]) == len(source["passage"]["native"]) == 9
    ids = set()
    for i, (card, word) in enumerate(zip(cards, source["words"]), 1):
        assert card["candidatePosition"] == i
        assert card["id"] == f"{revision}:card:{i:02d}"
        assert (card["sourceSpanish"], card["sourceEnglish"], card["kind"], card["sourceNoteInternal"]) == (
            word["es"], word["en"], word["kind"], word.get("note"))
        assert card["targetJapaneseDraft"] and card["literalJapaneseGlossEn"]
        assert card["sourceEnglishIsJapaneseGloss"] is False
        assert sha_text(card["targetJapaneseDraft"]) == card["candidateTextSha256"]
        assert card["id"] not in ids
        ids.add(card["id"])
    for i, (turn, es, en) in enumerate(zip(turns, source["passage"]["target"], source["passage"]["native"]), 1):
        assert turn["candidatePosition"] == i
        assert turn["id"] == f"{revision}:reader:{i:02d}"
        assert (turn["sourceSpanish"], turn["sourceEnglish"]) == (es, en)
        assert turn["speaker"] == "Narrator"
        assert turn["targetJapaneseDraft"] and turn["literalJapaneseGlossEn"]
        assert turn["sourceEnglishIsJapaneseGloss"] is False
        assert sha_text(turn["targetJapaneseDraft"]) == turn["candidateTextSha256"]
        assert turn["id"] not in ids
        ids.add(turn["id"])
    for key, rows in (("oldCardPositionPlan", old["cards"]), ("oldReaderPositionPlan", old["reader"])):
        plan_rows = packet[key]
        assert len(plan_rows) == len(rows)
        for i, (item, row) in enumerate(zip(plan_rows, rows), 1):
            assert item["old"] == i and item["candidate"] is None
            assert item["oldEnglish"] == row["en"]
            assert "no saved-item migration" in item["disposition"]
    assert "no shipped progress migration" in packet["savedPositionPolicy"]
    text = " ".join(row["targetJapaneseDraft"] for row in cards + turns)
    assert "朝食セット" not in text and "サム" not in text
    assert "別料金" not in text and "含まれています" in turns[8]["targetJapaneseDraft"]
    assert "卵二個" in cards[12]["targetJapaneseDraft"] and "卵二個" in turns[3]["targetJapaneseDraft"]
    assert "塩なし" in cards[11]["targetJapaneseDraft"] and "塩なし" in turns[6]["targetJapaneseDraft"]
    assert "言います" in turns[8]["targetJapaneseDraft"]
    assert len(ids) == 27
    print("PASS Core 4: 18 exact source cards, nine Reader turns, text-hashed revision IDs, false gates")


if __name__ == "__main__":
    validate()
