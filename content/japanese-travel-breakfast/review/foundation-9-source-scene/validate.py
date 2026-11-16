"""Independent source, identity, audio-scope and false-gate checks for F9."""

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
    p = load(HERE / "source-setting-candidate.json")
    assert p["pairKey"] == "Japanese:English" and p["lessonKey"] == "foundation:9"
    assert p["reviewed"] is False and all(v is False for v in p["gates"].values())
    assert len(p["gates"]) >= 12
    source_meta, old_meta, proposal_meta = p["source"], p["archivedDraft"], p["priorProposal"]
    for meta, key, path_key in (
        (source_meta, "curriculumSha256", "curriculumPath"),
        (source_meta, "readerSha256", "readerPath"),
        (old_meta, "sha256", "path"),
        (proposal_meta, "sha256", "path"),
    ):
        assert digest(ROOT / meta[path_key]) == meta[key]
    c = load(ROOT / source_meta["curriculumPath"])["lessons"][8]
    r = load(ROOT / source_meta["readerPath"])["lessons"]["9"]["passage"]
    old = load(ROOT / old_meta["path"])["lessons"][8]
    prior = next(x for x in load(ROOT / proposal_meta["path"])["proposals"] if x["lessonKey"] == "foundation:9")
    prefix = "foundation-travel-breakfast:9:ja-en"
    assert p["stableLessonId"] == old["stableId"] == prior["stableLessonId"] == prefix
    assert source_meta["objectiveEnglish"] == c["objective"] == old["sourceEnglishObjective"]
    assert source_meta["focusEnglish"] == c["focus"]
    assert source_meta["speakingEnglish"] == c["speaking"]
    assert source_meta["readerTitleSpanish"] == r["title"]
    cards, turns = p["sourceCards"], p["sourceSettingReader"]
    assert len(cards) == len(c["words"]) == 14
    assert len(turns) == len(r["target"]) == len(r["native"]) == 9
    ids = set()
    for i, (card, word) in enumerate(zip(cards, c["words"]), 1):
        assert card["candidatePosition"] == i
        assert (card["sourceSpanish"], card["sourceEnglish"], card["kind"], card["sourceNote"]) == (
            word["es"], word["en"], word["kind"], word.get("note"))
        assert card["id"] == f"{prefix}:card:source-scene-v2:{i:02d}"
        assert card["candidateCardRevision"] == f"{prefix}:card:source-scene-v2"
        assert card["targetJapaneseDraft"] and card["literalJapaneseGlossEn"]
        assert card["sourceEnglishIsJapaneseGloss"] is False
        assert card["id"] not in ids
        ids.add(card["id"])
    for i, (turn, es, en) in enumerate(zip(turns, r["target"], r["native"]), 1):
        assert turn["candidatePosition"] == i
        assert (turn["sourceSpanish"], turn["sourceEnglish"]) == (es, en)
        assert turn["id"] == f"{prefix}:reader:source-scene-v2:{i:02d}"
        assert turn["candidateReaderRevision"] == f"{prefix}:reader:source-scene-v2"
        assert turn["targetJapaneseDraft"] and turn["literalJapaneseGlossEn"]
        assert turn["sourceEnglishIsJapaneseGloss"] is False
        assert turn["id"] not in ids
        ids.add(turn["id"])
    for key, old_rows in (("oldCardPositionPlan", old["cards"]),
                          ("oldReaderPositionPlan", old["reader"])):
        plan = p[key]
        assert len(plan) == len(old_rows)
        for i, (item, row) in enumerate(zip(plan, old_rows), 1):
            assert item["old"] == i and item["candidate"] is None
            assert item["oldEnglish"] == row["en"]
            assert "no saved-item migration" in item["disposition"]
    assert "No automatic position migration" in p["savedPositionPolicy"]
    joined = " ".join(t["targetJapaneseDraft"] for t in turns)
    for token in ("アンナ", "オアハカ", "ルイス", "氷", "ストロー", "塩", "クリーム", "カード", "現金", "二百ペソ", "チップ"):
        assert token in joined
    assert "カードで払います" not in joined and "レジで" not in joined
    prior_audio = load(ROOT / "content/japanese-travel-breakfast/review/foundation-4-9/audio-candidates-2026-11-16/scope.json")
    assert prior_audio["sourceSha256"] == proposal_meta["sha256"]
    assert prior_audio["listeningReviewed"] is False and prior_audio["registered"] is False
    old_texts = {x["text"] for x in prior_audio["texts"] if x["lessonKey"] == "foundation:9"}
    old_audio_placement_ids = {x["placementId"] for x in prior_audio["texts"] if x["lessonKey"] == "foundation:9"}
    placements = [x["targetJapaneseDraft"] for x in cards + turns]
    assert len(placements) == 23 and len(set(placements)) == 23
    assert not (ids & old_audio_placement_ids), "v2 IDs must not silently claim v1 audio placements"
    exact = sum(text in old_texts for text in placements)
    assert exact == 12, f"prior audio exact-text overlap changed: {exact}"
    assert "unregistered" in p["audioNote"] or "registered or approved" in p["audioNote"]
    print("PASS Japanese Breakfast F9: 14 source-order cards, nine Reader turns, v2 IDs, 12/23 exact prior-audio text overlaps, all gates closed")


if __name__ == "__main__":
    validate()
