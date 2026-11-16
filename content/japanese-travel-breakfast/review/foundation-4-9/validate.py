"""Independently check source anchors, draft identity and closed review gates."""

import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CURRICULUM = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/foundation-travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json"
PACKET = HERE / "source-correction-proposals.json"


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate():
    packet = json.loads(PACKET.read_text())
    curriculum_file = json.loads(CURRICULUM.read_text())
    reader_file = json.loads(READER.read_text())
    curriculum = curriculum_file["lessons"]
    reader = reader_file["lessons"]
    draft_file = json.loads(DRAFT.read_text())
    draft = draft_file["lessons"]
    assert packet["sourceCurriculumSha256"] == digest(CURRICULUM)
    assert packet["sourceReaderSha256"] == digest(READER)
    assert packet["archivedDraftSha256"] == digest(DRAFT)
    assert draft_file["reviewed"] is False and draft_file["registered"] is False
    assert curriculum_file["reviewed"] is False and reader_file["reviewed"] is False
    assert packet["pairKey"] == "Japanese:English" and packet["track"] == "travel-breakfast"
    assert packet["gates"] and all(value is False for value in packet["gates"].values())
    assert [x["lessonKey"] for x in packet["proposals"]] == ["foundation:4", "foundation:9"]
    ids = set()
    for n, p in ((4, packet["proposals"][0]), (9, packet["proposals"][1])):
        old = draft[n - 1]
        source = reader[str(n)]["passage"]["native"]
        assert p["stableLessonId"] == old["stableId"] == f"foundation-travel-breakfast:{n}:ja-en"
        assert p["sourceObjective"] == curriculum[n - 1]["objective"] == old["sourceEnglishObjective"]
        assert p["sourceReaderTitle"] == reader[str(n)]["passage"]["title"]
        assert p["sourceSetting"] == "Oaxaca, Mexico"
        assert p["candidateReaderRevision"] == f"foundation-travel-breakfast:{n}:ja-en:reader:source-scene-v1"
        assert p["savedPositionPolicy"] and p["learnerContextCandidate"] and p["archivedFieldReconciliation"]
        assert p["sceneFraming"]
        assert p["sourceAnchors"] == [{"position": i, "english": en} for i, en in enumerate(source, 1)]
        assert len(p["proposedSourceSettingReader"]) == len(source)
        assert len(p["oldReaderPositionPlan"]) == len(old["reader"])
        assert p["readerPositionIndexBase"] == 1
        assert "no progress migration" in p["identityNote"]
        assert p["audioNote"] and p["modeStatus"]
        for i, row in enumerate(p["proposedSourceSettingReader"], 1):
            assert row["candidatePosition"] == i and row["sourceEnglish"] == source[i - 1]
            assert row["candidateReaderRevision"] == p["candidateReaderRevision"]
            assert row["ja"] and row["speaker"] and row["literalJapaneseGlossEn"]
            assert row["id"].startswith(f"foundation-travel-breakfast:{n}:ja-en:reader:source-scene-v1:")
            assert row["sourceEnglishIsJapaneseGloss"] is False
            assert row["id"] not in ids
            ids.add(row["id"])
        for i, row in enumerate(p["oldReaderPositionPlan"], 1):
            assert row["old"] == i and row["candidate"] is None
            assert row["oldEnglish"] == old["reader"][i - 1]["en"]
        for card in p["newCardCandidates"]:
            assert card["id"].startswith(f"foundation-travel-breakfast:{n}:ja-en:card:source-scene-v1:")
            assert card["id"] not in ids and card["ja"] and card["literalJapaneseGlossEn"]
            ids.add(card["id"])
    f4, f9 = packet["proposals"]
    assert curriculum[3]["words"][9]["note"] == "Natural means freshly squeezed, not from a carton."
    assert draft[3]["reader"][5]["en"] == "No, it is not freshly squeezed."
    assert "生搾り" in f4["proposedSourceSettingReader"][1]["ja"]
    assert f4["proposedSourceSettingReader"][2]["ja"].startswith("はい")
    assert source == reader["9"]["passage"]["native"]
    assert draft[8]["reader"][7]["en"] == "Then I will pay by card."
    assert "二百ペソ" in f9["proposedSourceSettingReader"][7]["ja"]
    assert "現金" in f9["proposedSourceSettingReader"][7]["ja"]
    assert "チップ" in f9["proposedSourceSettingReader"][8]["ja"]
    assert reader["4"]["passage"]["native"][2] == "Luis: Yes, and there is also fresh fruit with breakfast."
    assert reader["9"]["passage"]["native"][7] == "Anna: In cash, here are 200 pesos."
    marker = "reader:source-scene-v1"
    for root in (ROOT / "src", ROOT / "public"):
        for path in root.rglob("*"):
            if path.is_file() and path.suffix in {".ts", ".tsx", ".js", ".mjs", ".json"}:
                assert marker not in path.read_text(errors="ignore"), f"candidate imported by runtime: {path}"
    assert len(ids) == 8 + 9 + 3 + 7
    assert all(packet["unresolved"])
    print("PASS F4/F9 exact source positions, stable IDs, archive identity and closed gates")


if __name__ == "__main__":
    validate()
