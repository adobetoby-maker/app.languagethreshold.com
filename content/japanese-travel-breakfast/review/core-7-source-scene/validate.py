"""Independent source, revision identity, semantic, and closed-gate checks."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def load(path):
    return json.loads(path.read_text())


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sha_text(value):
    return hashlib.sha256(value.encode()).hexdigest()


def validate():
    p = load(HERE / "source-setting-candidate.json")
    t = load(HERE / "candidate-text.json")
    assert p["pairKey"] == "Japanese:English" and p["track"] == "travel-breakfast"
    assert p["stage"] == "core" and p["stageId"] == "travel-breakfast"
    assert p["lessonKey"] == "core:7" and p["lessonNumber"] == 7
    assert p["reviewed"] is False and len(p["gates"]) >= 12
    assert all(value is False for value in p["gates"].values())
    meta, archived = p["source"], p["archivedDraft"]
    for item, pathkey, hashkey in ((meta, "planPath", "planSha256"), (meta, "readerPath", "readerSha256"), (archived, "path", "sha256")):
        assert sha(ROOT / item[pathkey]) == item[hashkey]
    plan = (ROOT / meta["planPath"]).read_text()
    assert all(meta[k] in plan for k in ("planTitleEnglish", "objectiveEnglish", "roleplayEnglish"))
    source_file = load(ROOT / meta["readerPath"])
    archive_file = load(ROOT / archived["path"])
    assert source_file["reviewed"] is False and archive_file["reviewed"] is False
    assert archive_file["registered"] is False
    source, old = source_file["lessons"]["7"], archive_file["lessons"][6]
    stable = "travel-breakfast:7:ja-en"
    revision = stable + ":source-scene-v1"
    assert p["stableLessonId"] == old["stableId"] == stable
    assert p["candidateRevision"] == revision
    assert old["sourceEnglish"]["objective"] == meta["objectiveEnglish"]
    assert old["sourceEnglish"]["roleplay"] == meta["roleplayEnglish"]
    assert old["sourceEnglish"]["englishWordAnchors"] == [w["en"] for w in source["words"]]
    assert old["sourceEnglish"]["englishReading"] == source["passage"]["native"]
    assert meta["sourceVerbs"] == source["verbs"]
    assert meta["readerTitleSpanish"] == source["passage"]["title"]
    cards, turns = p["sourceCards"], p["sourceSettingReader"]
    assert len(cards) == len(source["words"]) == len(t["cardsJa"]) == 16
    assert len(turns) == len(source["passage"]["target"]) == len(source["passage"]["native"]) == len(t["readerJa"]) == 9
    ids = set()
    for i, (card, word, ja) in enumerate(zip(cards, source["words"], t["cardsJa"]), 1):
        assert card["id"] == f"{revision}:card:{i:02d}" and card["candidatePosition"] == i
        assert (card["sourceSpanish"], card["sourceEnglish"], card["kind"], card["sourceNoteInternal"]) == (word["es"], word["en"], word["kind"], word.get("note"))
        assert card["targetJapaneseDraft"] == ja and card["sourceEnglishIsJapaneseGloss"] is False
        assert sha_text(ja) == card["candidateTextSha256"]
        ids.add(card["id"])
    for i, (turn, es, en, ja) in enumerate(zip(turns, source["passage"]["target"], source["passage"]["native"], t["readerJa"]), 1):
        assert turn["id"] == f"{revision}:reader:{i:02d}" and turn["candidatePosition"] == i
        assert (turn["sourceSpanish"], turn["sourceEnglish"], turn["targetJapaneseDraft"]) == (es, en, ja)
        assert turn["sourceEnglishIsJapaneseGloss"] is False and sha_text(ja) == turn["candidateTextSha256"]
        ids.add(turn["id"])
    assert len(ids) == 25
    for key, rows in (("oldCardPositionPlan", old["cards"]), ("oldReaderPositionPlan", old["reader"])):
        assert len(p[key]) == len(rows)
        for i, (mapping, row) in enumerate(zip(p[key], rows), 1):
            assert mapping["old"] == i and mapping["candidate"] is None
            assert mapping["oldEnglish"] == row["en"] and "no saved-item migration" in mapping["disposition"]
    text = " ".join(t["cardsJa"] + t["readerJa"])
    assert "プエブラ" in text and "チラキレス" in text and "緑のサルサと豆" in text
    assert "シナモン" in t["readerJa"][6] and "シナモン" not in t["cardsJa"][6]
    assert "観光客" in t["cardsJa"][12] and "観光客" not in " ".join(t["readerJa"])
    assert "カウンターで支払" in t["readerJa"][8]
    assert "おにぎり" not in text and "みそ汁" not in text and "サム" not in text
    assert t["cardsJa"][10] in t["readerJa"][1]
    assert t["cardsJa"][11] in t["readerJa"][2]
    assert t["cardsJa"][14] in t["readerJa"][5]
    print("PASS Core 7: 16 exact source cards, nine Reader turns, 25 revision-scoped IDs, false gates")


if __name__ == "__main__":
    validate()
