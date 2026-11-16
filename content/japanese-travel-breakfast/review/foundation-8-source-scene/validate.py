"""Independently validate Foundation 8 source order, IDs and closed gates."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate():
    p = json.loads((HERE / "source-setting-candidate.json").read_text())
    curriculum_path = ROOT / p["source"]["curriculumPath"]
    reader_path = ROOT / p["source"]["readerPath"]
    draft_path = ROOT / p["archivedDraft"]["path"]
    prior_path = ROOT / p["priorPeanutProposal"]["path"]
    assert digest(curriculum_path) == p["source"]["curriculumSha256"]
    assert digest(reader_path) == p["source"]["readerSha256"]
    assert digest(draft_path) == p["archivedDraft"]["sha256"]
    assert digest(prior_path) == p["priorPeanutProposal"]["sha256"]
    source = json.loads(curriculum_path.read_text())["lessons"][7]
    reader = json.loads(reader_path.read_text())["lessons"]["8"]["passage"]
    archived = json.loads(draft_path.read_text())["lessons"][7]
    assert p["pairKey"] == "Japanese:English"
    assert p["lessonKey"] == "foundation:8"
    assert p["reviewed"] is False
    assert p["stableLessonId"] == archived["stableId"] == "foundation-travel-breakfast:8:ja-en"
    assert p["source"]["objectiveEnglish"] == source["objective"] == archived["sourceEnglishObjective"]
    assert p["source"]["readerTitleSpanish"] == reader["title"]
    assert len(p["sourceCards"]) == len(source["words"]) == 17
    assert len(p["sourceSettingReader"]) == len(reader["native"]) == len(reader["target"]) == 9
    card_ids = set()
    for n, (card, word) in enumerate(zip(p["sourceCards"], source["words"]), 1):
        assert card["candidatePosition"] == n
        assert card["sourceSpanish"] == word["es"]
        assert card["sourceEnglish"] == word["en"]
        assert card["kind"] == word["kind"]
        assert card["sourceNote"] == word.get("note")
        assert card["targetJapaneseDraft"]
        assert card["id"].startswith("foundation-travel-breakfast:8:ja-en:card:source-scene-v1:")
        assert card["candidateCardRevision"] == "foundation-travel-breakfast:8:ja-en:card:source-scene-v1"
        assert card["id"] not in card_ids
        card_ids.add(card["id"])
    reader_ids = set()
    for n, (turn, es, en) in enumerate(zip(p["sourceSettingReader"], reader["target"], reader["native"]), 1):
        assert turn["candidatePosition"] == n
        assert turn["sourceSpanish"] == es
        assert turn["sourceEnglish"] == en
        assert turn["targetJapaneseDraft"] and turn["literalJapaneseGlossEn"]
        assert turn["sourceEnglishIsJapaneseGloss"] is False
        assert turn["id"].startswith("foundation-travel-breakfast:8:ja-en:reader:source-scene-v1:")
        assert turn["candidateReaderRevision"] == "foundation-travel-breakfast:8:ja-en:reader:source-scene-v1"
        assert turn["id"] not in reader_ids
        reader_ids.add(turn["id"])
    assert [x["speaker"] for x in p["sourceSettingReader"]] == [
        "Narrator", "Luis", "Emma", "Emma", "Tom", "Luis", "Luis", "Luis", "Emma"
    ]
    assert "トムは乳製品を食べません" in p["sourceSettingReader"][3]["targetJapaneseDraft"]
    assert "ピーナッツ" in p["sourceSettingReader"][4]["targetJapaneseDraft"]
    assert "ラクトースフリー" in p["sourceSettingReader"][8]["targetJapaneseDraft"]
    assert len(p["oldCardPositionPlan"]) == len(archived["cards"]) == p["archivedDraft"]["cardCount"]
    assert len(p["oldReaderPositionPlan"]) == len(archived["reader"]) == p["archivedDraft"]["readerCount"]
    for key, old_rows in (("oldCardPositionPlan", archived["cards"]), ("oldReaderPositionPlan", archived["reader"])):
        for n, (plan, row) in enumerate(zip(p[key], old_rows), 1):
            assert plan["old"] == n and plan["candidate"] is None
            assert plan["oldEnglish"] == row["en"]
            assert "no saved-item migration" in plan["disposition"]
    assert "no shipped saved positions" in p["savedPositionPolicy"].lower()
    assert all(value is False for value in p["gates"].values())
    assert len(p["gates"]) >= 10
    print("PASS Japanese Breakfast Foundation 8: 17 source cards, 9 Reader turns, distinct revision IDs, retired old positions, closed gates")


if __name__ == "__main__":
    validate()
