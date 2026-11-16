"""Independent source, identity and closed-gate check for inert correction proposals."""

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
    p = json.loads(PACKET.read_text())
    c = json.loads(CURRICULUM.read_text())["lessons"]
    r = json.loads(READER.read_text())["lessons"]
    d = json.loads(DRAFT.read_text())["lessons"]
    assert p["sourceCurriculumSha256"] == digest(CURRICULUM)
    assert p["sourceReaderSha256"] == digest(READER)
    assert p["archivedDraftSha256"] == digest(DRAFT)
    assert p["pairKey"] == "Japanese:English" and p["stage"] == "foundation"
    assert p["gates"] and all(value is False for value in p["gates"].values())
    assert [x["lessonKey"] for x in p["proposals"]] == ["foundation:2", "foundation:8"]
    f2, f8 = p["proposals"]
    ids = set()
    for n, row in ((2, f2), (8, f8)):
        assert row["stableLessonId"] == d[n - 1]["stableId"] == f"foundation-travel-breakfast:{n}:ja-en"
        assert row["sourceObjective"] == c[n - 1]["objective"] == d[n - 1]["sourceEnglishObjective"]
        for anchor in row.get("sourceReaderAnchors", [row.get("sourceReaderAnchor")]):
            if anchor:
                assert anchor["english"] == r[str(n)]["passage"]["native"][anchor["position"] - 1]
        new = row["newReaderCandidate"]
        assert new["id"] not in ids and new["id"].startswith(f"foundation-travel-breakfast:{n}:reader:")
        ids.add(new["id"])
        assert new["ja"] and new["en"] and row["identityNote"] and row["audioNote"]
    assert f2["existingCardAnchor"] == {"position": 11, **d[1]["cards"][10]}
    assert f2["readerPositionIndexBase"] == 1
    assert f2["readerAdditionBeforeOldPosition"] == 1
    assert f2["legacyReaderPositionPlan"] == [
        {"old": i, "candidate": i + 1} for i in range(1, 10)
    ]
    assert "八時半" in f2["newReaderCandidate"]["ja"]
    assert all("八時半" not in turn["ja"] for turn in d[1]["reader"])
    assert f8["readerAdditionAfterOldPosition"] == 4
    assert f8["readerPositionIndexBase"] == 1
    assert f8["existingReaderAnchors"] == [
        {"position": 4, **d[7]["reader"][3]},
        {"position": 5, **d[7]["reader"][4]},
    ]
    assert f8["newReaderCandidate"]["speaker"] == "Companion"
    assert "companion" in f8["sceneAddition"].lower()
    assert "ピーナッツアレルギー" in f8["newReaderCandidate"]["ja"]
    assert "ピーナッツ" in f8["existingReaderPosition5ReplacementCandidate"]["ja"]
    assert "調理場" in f8["existingReaderPosition5ReplacementCandidate"]["ja"]
    assert f8["existingReaderPosition5ReplacementCandidate"]["id"] not in ids
    assert f8["existingReaderPosition5ReplacementCandidate"]["speaker"] == "Staff"
    ids.add(f8["existingReaderPosition5ReplacementCandidate"]["id"])
    assert len(f8["legacyReaderPositionPlan"]) == len(d[7]["reader"])
    assert f8["legacyReaderPositionPlan"][4]["old"] == 5
    assert f8["legacyReaderPositionPlan"][4]["candidate"] is None
    assert all(row["candidate"] == (row["old"] if row["old"] < 5 else row["old"] + 1)
               for row in f8["legacyReaderPositionPlan"] if row["old"] != 5)
    assert all("アレルギー" not in turn["ja"] for turn in d[7]["reader"])
    for card in f8["newCardCandidates"]:
        assert card["id"] not in ids and card["id"].startswith("foundation-travel-breakfast:8:card:")
        assert card["ja"] and card["en"]
        ids.add(card["id"])
    assert len(ids) == 6
    assert p["unresolved"] and all(isinstance(x, str) and x for x in p["unresolved"])
    print("PASS source hashes, exact anchors, new IDs and closed gates for Foundation 2/8")


if __name__ == "__main__":
    validate()
