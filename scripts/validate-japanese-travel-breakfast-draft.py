#!/usr/bin/env python3
"""Validate private Japanese Breakfast Foundation drafts against pinned English anchors."""
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "content/japanese-travel-breakfast/foundation-1-10-draft.json"
SOURCE = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
MODES = {"see", "recall", "hear", "type", "say", "write"}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def source_anchor(lesson):
    fields = {
        "n": lesson["n"],
        "title": lesson["title"],
        "objective": lesson["objective"],
        "speaking": lesson["speaking"],
        "englishWordAnchors": [w["en"] for w in lesson["words"]],
    }
    return digest(json.dumps(fields, ensure_ascii=False, separators=(",", ":")).encode())


def main():
    data = json.loads(DRAFT.read_text())
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    assert data["target"] == "Japanese" and data["native"] == "English"
    assert data["stageId"] == "foundation-travel-breakfast"
    assert data["reviewed"] is False and data["registered"] is False
    assert data["audio"] == "none"
    assert data["source"]["sha256"] == digest(source_bytes)
    assert len(data["lessons"]) == 10
    for n, (lesson, original) in enumerate(zip(data["lessons"], source["lessons"][:10]), 1):
        assert lesson["n"] == original["n"] == n
        assert lesson["stableId"] == f"foundation-travel-breakfast:{n}:ja-en"
        assert lesson["sourceObjectiveSha256"] == source_anchor(original)
        assert lesson["sourceEnglishObjective"] == original["objective"]
        assert len(lesson["cards"]) >= 10 and len(lesson["reader"]) >= 8
        assert set(lesson["modes"]) == MODES
        assert lesson["speaking"]["opening"] and lesson["speaking"]["wordBank"]
        for pair in [*lesson["cards"], *lesson["reader"]]:
            assert pair["ja"].strip() and pair["en"].strip()
            assert not any(x in pair["ja"] for x in ["café", "pesos", "ser", "estar"])
    print("Japanese Breakfast F1–10 draft: source hashes, stable IDs, pairs, Reader, speaking, six modes PASS")

    core = json.loads((ROOT / "content/japanese-travel-breakfast/core-1-30-draft.json").read_text())
    generated_bytes = subprocess.check_output(
        ["git", "show", "HEAD:public/lesson-content/es/travel-breakfast.json"], cwd=ROOT
    )
    generated = json.loads(generated_bytes)
    travel_bytes = (ROOT / "src/data/travel-zone.ts").read_bytes()
    assert core["target"] == "Japanese" and core["native"] == "English"
    assert core["stageId"] == "travel-breakfast"
    assert core["reviewed"] is False and core["registered"] is False
    assert core["audio"] == "none"
    assert core["source"]["readerSha256"] == digest(generated_bytes)
    assert core["source"]["curriculumSha256"] == digest(travel_bytes)
    assert len(core["lessons"]) == 30
    for n, lesson in enumerate(core["lessons"], 1):
        original = generated["lessons"][str(n)]
        source_fields = {
            "n": n,
            "englishWordAnchors": [w["en"] for w in original["words"]],
            "englishReading": original["passage"]["native"],
        }
        assert lesson["n"] == n
        assert lesson["stableId"] == f"travel-breakfast:{n}:ja-en"
        assert lesson["sourceEnglish"]["englishWordAnchors"] == source_fields["englishWordAnchors"]
        assert lesson["sourceEnglish"]["englishReading"] == source_fields["englishReading"]
        assert lesson["sourceEnglish"]["englishSourceSha256"] == digest(
            json.dumps(source_fields, ensure_ascii=False, separators=(",", ":")).encode()
        )
        assert lesson["sourceEnglish"]["objective"] in travel_bytes.decode()
        assert lesson["sourceEnglish"]["roleplay"] in travel_bytes.decode()
        assert len(lesson["cards"]) >= 12 and len(lesson["reader"]) >= 8
        assert set(lesson["modes"]) == MODES
        assert lesson["speaking"]["opening"] and lesson["speaking"]["wordBank"]
        for pair in [*lesson["cards"], *lesson["reader"]]:
            assert pair["ja"].strip() and pair["en"].strip()
            assert not any(x in pair["ja"] for x in ["café", "pesos", "ser", "estar"])
    print("Japanese Breakfast C1–30 draft: source hashes, stable IDs, English anchors, pairs, Reader, speaking, six modes PASS")

    master = json.loads((ROOT / "content/japanese-travel-breakfast/master-1-3-draft.json").read_text())
    master_source_bytes = (ROOT / "src/data/core60/es/master-travel-breakfast.json").read_bytes()
    master_source = json.loads(master_source_bytes)
    master_reader_bytes = subprocess.check_output(
        ["git", "show", "HEAD:public/lesson-content/es/master-travel-breakfast.json"], cwd=ROOT
    )
    master_reader = json.loads(master_reader_bytes)
    assert master["target"] == "Japanese" and master["native"] == "English"
    assert master["stageId"] == "master-travel-breakfast"
    assert master["reviewed"] is False and master["registered"] is False
    assert master["audio"] == "none"
    assert master["source"]["curriculumSha256"] == digest(master_source_bytes)
    assert master["source"]["readerSha256"] == digest(master_reader_bytes)
    assert len(master["lessons"]) == 3
    for n, lesson in enumerate(master["lessons"], 1):
        original = master_source["lessons"][n - 1]
        fields = {
            "n": n,
            "title": original["title"],
            "objective": original["objective"],
            "speaking": original["speaking"],
            "lessonType": original["lessonType"],
            "block": original["block"],
            "englishWordAnchors": [w["en"] for w in original["words"]],
            "englishGrammarExamples": [e["en"] for e in original["grammar"]["examples"]],
            "englishReading": master_reader["lessons"][str(n)]["passage"]["native"],
        }
        assert lesson["n"] == n
        assert lesson["stableId"] == f"master-travel-breakfast:{n}:ja-en"
        assert all(lesson["sourceEnglish"][key] == value for key, value in fields.items())
        assert lesson["sourceEnglish"]["englishSourceSha256"] == digest(
            json.dumps(fields, ensure_ascii=False, separators=(",", ":")).encode()
        )
        assert len(lesson["cards"]) >= 12 and len(lesson["reader"]) >= 8
        assert set(lesson["modes"]) == MODES
        assert lesson["speaking"]["opening"] and lesson["speaking"]["wordBank"]
        for pair in [*lesson["cards"], *lesson["reader"]]:
            assert pair["ja"].strip() and pair["en"].strip()
            assert not any(x in pair["ja"] for x in ["café", "pesos", "ser", "estar"])
    print("Japanese Breakfast M1–3 draft: source hashes, stable IDs, English anchors, pairs, Reader, speaking, six modes PASS")


if __name__ == "__main__":
    main()
