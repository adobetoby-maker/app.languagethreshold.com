"""Independent exact-source and closed-gate check for Core 28–29 packets."""

from __future__ import annotations

import hashlib
import json
from pathlib import Path


HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
LESSON_TITLES = ROOT / "src/data/travel-zone.ts"
SOURCE_ENGLISH_TITLES = {28: "Talk with a regular over coffee", 29: "Settle who pays for the group"}
ARCHIVE = (
    ROOT
    / "content/review-archive/french-japanese-2026-11-15/french-breakfast/private-runtime-candidate.json"
)
OVERRIDES = HERE / "source-drift-overrides.json"


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate() -> None:
    source = json.loads(SOURCE.read_text())
    prior = json.loads(ARCHIVE.read_text())
    override_data = json.loads(OVERRIDES.read_text())
    overrides = override_data["overrides"]
    field_overrides = override_data["lessonFieldOverrides"]
    seen_overrides = set()
    seen_fields = set()
    manifest = json.loads((HERE / "manifest.json").read_text())
    assert manifest["sourceSha256"] == digest(SOURCE)
    assert manifest["lessonTitleSha256"] == digest(LESSON_TITLES)
    assert manifest["priorDraftSha256"] == digest(ARCHIVE)
    assert manifest["sourceDriftOverrideSha256"] == digest(OVERRIDES)
    assert [r["lessonKey"] for r in manifest["packets"]] == [
        "core:28", "core:29"
    ]
    for row in manifest["packets"]:
        path = HERE / row["path"]
        assert row["sha256"] == digest(path)
        packet = json.loads(path.read_text())
        n = int(row["lessonKey"].split(":")[1])
        original = source["lessons"][str(n)]
        earlier = next(row for row in prior["lessons"] if row["stage"] == "core" and row["n"] == n)
        assert packet["lessonKey"] == row["lessonKey"]
        assert packet["source"]["sha256"] == digest(SOURCE)
        assert packet["source"]["passageTitleSpanish"] == original["passage"]["title"]
        assert packet["source"]["lessonTitleEnglish"] == SOURCE_ENGLISH_TITLES[n]
        assert packet["source"]["lessonTitleSha256"] == digest(LESSON_TITLES)
        assert f'"{SOURCE_ENGLISH_TITLES[n]}"' in LESSON_TITLES.read_text()
        assert packet["titleEnglishDraft"] == SOURCE_ENGLISH_TITLES[n]
        assert packet["priorDraft"]["sha256"] == digest(ARCHIVE)
        assert packet["sourceDriftOverrideSha256"] == digest(OVERRIDES)
        assert len(packet["cards"]) == len(original["words"])
        assert len(packet["reader"]) == len(original["passage"]["native"])
        ids = set()
        for i, (card, old) in enumerate(zip(packet["cards"], original["words"]), 1):
            assert card["id"] == f"core:{n}:word:{i}"
            assert card["sourceSpanish"] == old["es"]
            assert card["supportEnglish"] == old["en"]
            assert card["kind"] == old["kind"]
            assert card["targetFrenchDraft"]
            earlier_card = earlier["words"][i - 1]
            override = overrides.get(card["id"])
            if override:
                assert earlier_card["supportEnglish"] == override["priorEnglish"]
                assert old["en"] == override["sourceEnglish"]
                assert card["targetFrenchDraft"] == override["targetFrenchDraft"]
                seen_overrides.add(card["id"])
            else:
                assert earlier_card["supportEnglish"] == old["en"]
                assert card["targetFrenchDraft"] == earlier_card["targetFrench"]
            ids.add(card["id"])
        assert len(ids) == len(packet["cards"])
        for i, line in enumerate(packet["reader"], 1):
            assert line["id"] == f"core:{n}:line:{i}"
            assert line["sourceSpanish"] == original["passage"]["target"][i - 1]
            assert line["supportEnglish"] == original["passage"]["native"][i - 1]
            assert line["targetFrenchDraft"]
            earlier_line = earlier["reader"][i - 1]
            override = overrides.get(line["id"])
            if override:
                assert earlier_line["supportEnglish"] == override["priorEnglish"]
                assert original["passage"]["native"][i - 1] == override["sourceEnglish"]
                assert line["targetFrenchDraft"] == override["targetFrenchDraft"]
                seen_overrides.add(line["id"])
            else:
                assert earlier_line["supportEnglish"] == line["supportEnglish"]
                assert line["targetFrenchDraft"] == earlier_line["targetFrench"]
        assert packet["overriddenDraftIds"] == sorted(
            item for item in seen_overrides if item.startswith(f"core:{n}:")
        )
        expected_fields = field_overrides.get(f"core:{n}", {})
        assert packet["overriddenLessonFields"] == sorted(expected_fields)
        for field, spec in expected_fields.items():
            if field in ("focusEnglishDraft", "titleEnglishDraft", "readerTitleFrenchDraft"):
                old_field = "focusEnglish" if field == "focusEnglishDraft" else ("titleEnglish" if field == "titleEnglishDraft" else "readerTitleFrench")
                assert earlier[old_field] == spec["prior"]
                assert packet[field] == spec["proposed"]
            elif field == "objectiveEnglishDraft":
                assert earlier["objectiveEnglish"] == spec["prior"]
                assert packet[field] == spec["proposed"]
            elif field == "focusFrenchDraft":
                assert earlier["focusFrench"] == spec["prior"]
                assert packet[field] == spec["proposed"]
            elif field == "speakingDraft.openingFrench":
                assert earlier["speaking"]["openingFrench"] == spec["prior"]
                assert packet["speakingDraft"]["openingFrench"] == spec["proposed"]
            elif field == "speakingDraft.instructionEnglish":
                assert earlier["speaking"]["instructionEnglish"] == spec["prior"]
                assert packet["speakingDraft"]["instructionEnglish"] == spec["proposed"]
            else:
                raise AssertionError(f"Unexpected lesson field override: {field}")
            seen_fields.add((f"core:{n}", field))
        if "focusEnglishDraft" not in expected_fields:
            assert packet["focusEnglishDraft"] == earlier["focusEnglish"]
        if "objectiveEnglishDraft" not in expected_fields:
            assert packet["objectiveEnglishDraft"] == earlier["objectiveEnglish"]
        if "focusFrenchDraft" not in expected_fields:
            assert packet["focusFrenchDraft"] == earlier["focusFrench"]
        if "speakingDraft.openingFrench" not in expected_fields:
            assert packet["speakingDraft"]["openingFrench"] == earlier["speaking"]["openingFrench"]
        if "speakingDraft.instructionEnglish" not in expected_fields:
            assert packet["speakingDraft"]["instructionEnglish"] == earlier["speaking"]["instructionEnglish"]
        assert packet["sourceSpanishVerbs"] == original["verbs"]
        assert all(value is False for value in packet["gates"].values())
        assert all(value is False for value in manifest["gates"].values())
        for items in packet["modeInputIdsDraft"].values():
            assert items and all(item in ids for item in items)
        reader_text = " ".join(line["targetFrenchDraft"] for line in packet["reader"])
        if n == 28:
            assert "don Ramón" in reader_text and "pan dulce" in reader_text
            assert "Madame Martin" not in reader_text and "brioche" not in reader_text
            assert "Racontez-m’en plus" in reader_text
        else:
            assert all(term in reader_text for term in ("Oaxaca", "Lucía", "Andrés", "espèces", "dix pour cent", "si le service est bon"))
            assert not any(term in reader_text for term in ("Lyon", "Camille", "Théo", "brioche"))
        print(
            f"PASS {row['lessonKey']}: {len(ids)} cards, "
            f"{len(packet['reader'])} Reader turns, closed gates"
        )
    assert seen_overrides == set(overrides)
    assert seen_fields == {
        (lesson, field) for lesson, fields in field_overrides.items() for field in fields
    }


if __name__ == "__main__":
    validate()
