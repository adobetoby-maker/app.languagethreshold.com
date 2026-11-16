"""Independent exact-source and closed-gate check for Core 18–20 packets."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
ARCHIVE = (
    ROOT
    / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate() -> None:
    source = json.loads(SOURCE.read_text())
    manifest = json.loads((HERE / "manifest.json").read_text())
    assert manifest["sourceSha256"] == digest(SOURCE)
    assert manifest["priorDraftSha256"] == digest(ARCHIVE)
    assert [r["lessonKey"] for r in manifest["packets"]] == [
        "core:18", "core:19", "core:20"
    ]
    for row in manifest["packets"]:
        path = HERE / row["path"]
        assert row["sha256"] == digest(path)
        packet = json.loads(path.read_text())
        n = int(row["lessonKey"].split(":")[1])
        original = source["lessons"][str(n)]
        assert packet["lessonKey"] == row["lessonKey"]
        assert packet["source"]["sha256"] == digest(SOURCE)
        assert packet["priorDraft"]["sha256"] == digest(ARCHIVE)
        assert len(packet["cards"]) == len(original["words"])
        assert len(packet["reader"]) == len(original["passage"]["native"])
        ids = set()
        for i, (card, old) in enumerate(zip(packet["cards"], original["words"]), 1):
            assert card["id"] == f"core:{n}:word:{i}"
            assert card["sourceSpanish"] == old["es"]
            assert card["supportEnglish"] == old["en"]
            assert card["kind"] == old["kind"]
            assert card["targetFrenchDraft"]
            ids.add(card["id"])
        assert len(ids) == len(packet["cards"])
        for i, line in enumerate(packet["reader"], 1):
            assert line["id"] == f"core:{n}:line:{i}"
            assert line["sourceSpanish"] == original["passage"]["target"][i - 1]
            assert line["supportEnglish"] == original["passage"]["native"][i - 1]
            assert line["targetFrenchDraft"]
        assert packet["sourceSpanishVerbs"] == original["verbs"]
        assert all(value is False for value in packet["gates"].values())
        assert all(value is False for value in manifest["gates"].values())
        for items in packet["modeInputIdsDraft"].values():
            assert items and all(item in ids for item in items)
        print(
            f"PASS {row['lessonKey']}: {len(ids)} cards, "
            f"{len(packet['reader'])} Reader turns, closed gates"
        )


if __name__ == "__main__":
    validate()
