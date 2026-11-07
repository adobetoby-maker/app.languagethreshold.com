#!/usr/bin/env python3
"""Validate private Japanese Breakfast Foundation drafts against pinned English anchors."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DRAFT = ROOT / "content/japanese-travel-breakfast/foundation-1-6-draft.json"
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
    assert len(data["lessons"]) == 6
    for n, (lesson, original) in enumerate(zip(data["lessons"], source["lessons"][:6]), 1):
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
    print("Japanese Breakfast F1–6 draft: source hashes, stable IDs, pairs, Reader, speaking, six modes PASS")


if __name__ == "__main__":
    main()
