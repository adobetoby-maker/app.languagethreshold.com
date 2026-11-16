"""Independently check source parity, saved-item identity and closed gates."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def load(path):
    return json.loads(path.read_text())


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate():
    packet = load(HERE / "source-setting-candidates.json")
    assert packet["pairKey"] == "Japanese:English" and packet["reviewed"] is False
    assert len(packet["lessons"]) == 3
    assert all(value is False for value in packet["gates"].values())
    for expected, lesson in zip((6, 7, 10), packet["lessons"]):
        source_meta, archive_meta = lesson["source"], lesson["archivedDraft"]
        cp = ROOT / source_meta["curriculumPath"]
        rp = ROOT / source_meta["readerPath"]
        ap = ROOT / archive_meta["path"]
        assert digest(cp) == source_meta["curriculumSha256"]
        assert digest(rp) == source_meta["readerSha256"]
        assert digest(ap) == archive_meta["sha256"]
        source = load(cp)["lessons"][expected - 1]
        passage = load(rp)["lessons"][str(expected)]["passage"]
        archive = load(ap)["lessons"][expected - 1]
        prefix = f"foundation-travel-breakfast:{expected}:ja-en"
        assert lesson["stableLessonId"] == archive["stableId"] == prefix
        assert lesson["lessonKey"] == f"foundation:{expected}"
        assert source_meta["objectiveEnglish"] == source["objective"] == archive["sourceEnglishObjective"]
        assert source_meta["readerTitleSpanish"] == passage["title"]
        assert source_meta["focusEnglish"] == source["focus"]
        assert source_meta["speakingEnglish"] == source["speaking"]
        assert lesson["reviewed"] is False and len(lesson["gates"]) >= 12
        assert all(value is False for value in lesson["gates"].values())
        cards, turns = lesson["sourceCards"], lesson["sourceSettingReader"]
        assert len(cards) == len(source["words"])
        assert len(turns) == len(passage["native"]) == len(passage["target"]) == 9
        ids = set()
        for position, (card, word) in enumerate(zip(cards, source["words"]), 1):
            assert card["candidatePosition"] == position
            assert (card["sourceSpanish"], card["sourceEnglish"], card["kind"], card["sourceNote"]) == (
                word["es"], word["en"], word["kind"], word.get("note"))
            assert card["targetJapaneseDraft"]
            assert card["id"] == f"{prefix}:card:source-scene-v1:{position:02d}"
            assert card["id"] not in ids
            ids.add(card["id"])
        for position, (turn, es, en) in enumerate(zip(turns, passage["target"], passage["native"]), 1):
            assert turn["candidatePosition"] == position
            assert (turn["sourceSpanish"], turn["sourceEnglish"]) == (es, en)
            assert turn["targetJapaneseDraft"] and turn["sourceEnglishIsJapaneseGloss"] is False
            assert turn["id"] == f"{prefix}:reader:source-scene-v1:{position:02d}"
            assert turn["id"] not in ids
            ids.add(turn["id"])
        for key, old in (("oldCardPositionPlan", archive["cards"]),
                         ("oldReaderPositionPlan", archive["reader"])):
            plans = lesson[key]
            assert len(plans) == len(old)
            for position, (item, row) in enumerate(zip(plans, old), 1):
                assert item["old"] == position and item["candidate"] is None
                assert item["oldEnglish"] == row["en"]
                assert "no saved-item migration" in item["disposition"]
        assert "No automatic position migration" in lesson["savedPositionPolicy"]
        assert "not authored prompt/answer pairs" in lesson["modeStatus"]
        whole = " ".join(t["targetJapaneseDraft"] for t in turns)
        if expected == 6:
            for token in ("エマ", "ルシア", "オアハカ", "プエブラ", "8時", "ベーコン"):
                assert token in whole
            assert len(cards) == 16
        if expected == 7:
            for token in ("エマ", "トム", "ローサ", "カフェ・デ・オジャ", "11時", "コンチャ", "右側"):
                assert token in whole
            assert "朝食込み" in whole
            assert "千円" not in whole and "あんパン" not in whole
            assert len(cards) == 16
        if expected == 10:
            for token in ("カフェ・ルナ", "9時", "英語とスペイン語", "鶏肉", "トルティーヤ", "ベジタリアン"):
                assert token in whole
            assert "スペイン語" in cards[11]["targetJapaneseDraft"]
            assert "日本語" not in cards[11]["targetJapaneseDraft"]
            assert "季節限定" not in whole
            assert len(cards) == 15
    print("PASS Japanese Breakfast F6/F7/F10: 47 exact-source cards, 27 Reader turns, revision IDs, closed gates")


if __name__ == "__main__":
    validate()
