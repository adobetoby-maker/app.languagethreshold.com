"""Verify Core 18 conflict evidence without selecting a learner answer."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate() -> None:
    record = json.loads((HERE / "decision.json").read_text())
    source_path = ROOT / record["sourcePath"]
    packet_path = ROOT / record["existingPacketPath"]
    assert digest(source_path) == record["sourceSha256"]
    assert digest(packet_path) == record["existingPacketSha256"]
    source = json.loads(source_path.read_text())["lessons"]["18"]
    packet = json.loads(packet_path.read_text())
    assert record["pair"] == "fr-en" and record["lessonKey"] == "core:18"
    assert packet["lessonKey"] == record["lessonKey"]
    assert len(packet["cards"]) == len(source["words"]) == 17
    assert len(packet["reader"]) == len(source["passage"]["native"]) == 8
    rows = {}
    for n, (card, old) in enumerate(zip(packet["cards"], source["words"]), 1):
        assert card["id"] == f"core:18:word:{n}"
        assert card["sourceSpanish"] == old["es"]
        assert card["supportEnglish"] == old["en"]
        rows[card["id"]] = card
    for n, line in enumerate(packet["reader"], 1):
        assert line["id"] == f"core:18:line:{n}"
        assert line["sourceSpanish"] == source["passage"]["target"][n - 1]
        assert line["supportEnglish"] == source["passage"]["native"][n - 1]
        rows[line["id"]] = line
    assert record["answerSelected"] is False
    assert record["status"] == "unselected-source-and-terminology-review"
    assert all(value is False for value in packet["gates"].values())
    assert all(value is False for value in record["releaseGates"].values())
    assert [c["id"] for c in record["conflicts"]] == [
        "severity-added-to-focus", "cross-contact-term", "nuts-scope"
    ]
    for conflict in record["conflicts"]:
        anchored = [rows[row_id] for row_id in conflict["anchorIds"]]
        assert len(anchored) == len(set(conflict["anchorIds"]))
        assert any(
            row["sourceSpanish"] == conflict["sourceSpanish"]
            and row["supportEnglish"] == conflict["supportEnglish"]
            for row in anchored
        )
        assert any(row["targetFrenchDraft"] == conflict["existingFrenchFace"] for row in anchored)
        assert len(conflict["alternativesNotSelected"]) == 2
        assert all(a["french"] and a["literalEnglishGloss"] and a["condition"]
                   for a in conflict["alternativesNotSelected"])
        assert conflict["reviewerDecision"]
    assert record["conflicts"][0]["existingFocusFrenchDraft"] == packet["focusFrenchDraft"]
    assert record["conflicts"][1]["readerSourceSpanish"] == rows["core:18:line:7"]["sourceSpanish"]
    assert record["conflicts"][1]["readerSupportEnglish"] == rows["core:18:line:7"]["supportEnglish"]
    assert record["conflicts"][2]["readerContextSpanish"] == rows["core:18:line:4"]["sourceSpanish"]
    assert record["conflicts"][2]["readerContextEnglish"] == rows["core:18:line:4"]["supportEnglish"]
    print("PASS French Breakfast Core 18 conflict evidence: exact source/IDs, alternatives unselected, gates closed")


if __name__ == "__main__":
    validate()
