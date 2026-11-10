#!/usr/bin/env python3
"""Keep Spanish source prompts out of Japanese Roofing speaking goals."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-roofing"
GOALS = json.loads((CONTENT / "author-master-speaking-goals-ja-en.json").read_text())
PARTS = ("1-3", "4-6", "7-9", "10-11", "12", "13-15", "16-18", "19-20")


def main():
    assert set(GOALS) == {str(n) for n in range(1, 21) if n != 12}
    seen = set()
    for part in PARTS:
        draft = json.loads((CONTENT / f"master-{part}-draft.json").read_text())
        assert draft["reviewed"] is False and draft["registered"] is False
        for lesson in draft["lessons"]:
            n = lesson["n"]
            assert n not in seen and lesson["reviewed"] is False
            seen.add(n)
            assert lesson["sourceEnglishSpeaking"].strip()
            speaking = lesson["speaking"]
            assert "sourceEnglish" not in speaking, n
            assert speaking["opening"].strip(), n
            goal = speaking.get("goal", speaking.get("goalEn", ""))
            assert goal.strip(), n
            if n != 12:
                assert goal == GOALS[str(n)], n
            else:
                author = json.loads((CONTENT / "author-master-12.json").read_text())
                assert goal == author["speaking"]["goalEn"], n
            assert not any(phrase in goal.lower() for phrase in (
                "primero", "luego", "porque", "tú/usted", "clávalo", "si + present"
            )), n
    assert seen == set(range(1, 21))
    print("Japanese Roofing Master: 20 authored speaking goals; Spanish prompts provenance-only")


if __name__ == "__main__":
    main()
