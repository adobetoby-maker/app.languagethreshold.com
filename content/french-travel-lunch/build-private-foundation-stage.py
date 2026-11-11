#!/usr/bin/env python3
"""Derive the French Lunch Foundation stage without changing source cards or audio text."""

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SOURCES = [ROOT / "content/french-travel-lunch/foundation-1-3-draft.json",
           ROOT / "content/french-travel-lunch/foundation-4-10-draft.json"]
DESTINATION = ROOT / "src/data/core60/fr/foundation-travel-lunch-fr.json"


def selected_words(lesson):
    cards = lesson["cards"]
    # Source lesson 2 marks counted-food noun groups as phrases, and lesson 7
    # marks single interrogatives as phrases. The bounded stage lists classify
    # these as terms; source cards and audio text remain unchanged.
    term_indices = {i for i, card in enumerate(cards, 1) if card["kind"] == "term"}
    if lesson["n"] == 2:
        term_indices.update((5, 6, 9, 10))
    if lesson["n"] == 7:
        term_indices.update((1, 2, 3, 4, 5, 6))
    mode_indices = {activity["sourceCard"] for activity in lesson["modes"].values()}
    chosen = set(mode_indices)
    for kind, minimum, maximum in (("term", 8, 12), ("phrase", 4, 6)):
        eligible = [i for i in range(1, len(cards) + 1)
                    if (i in term_indices) == (kind == "term")]
        already = len(chosen.intersection(eligible))
        if already > maximum:
            raise ValueError(f"Foundation {lesson['n']}: mode cards exceed {kind} limit")
        for i in eligible:
            if len(chosen.intersection(eligible)) >= minimum:
                break
            chosen.add(i)
        if len(chosen.intersection(eligible)) < minimum:
            raise ValueError(f"Foundation {lesson['n']}: insufficient {kind} source cards")
    words = []
    for i in sorted(chosen):
        card = cards[i - 1]
        words.append({"es": card["fr"], "en": card["en"],
                      "kind": "term" if i in term_indices else "phrase",
                      **({"note": card["note"]} if "note" in card else {})})
    return words, sorted(chosen)


def build():
    lessons = []
    hashes = {}
    for path in SOURCES:
        raw = path.read_bytes()
        draft = json.loads(raw)
        if (draft["stageId"], draft["pairKey"], draft["reviewed"],
                draft["registered"], draft["readyForLearner"]) != (
                    "foundation-travel-lunch", "French:English", False, False, False):
            raise ValueError(f"Unexpected pair or release state: {path}")
        hashes[str(path.relative_to(ROOT))] = hashlib.sha256(raw).hexdigest()
        for lesson in draft["lessons"]:
            n = lesson["n"]
            if lesson["stableId"] != f"foundation-travel-lunch:{n}:fr-en" or lesson["reviewed"] is not False:
                raise ValueError(f"Unexpected stable ID or review state: {path}/{n}")
            words, source_indices = selected_words(lesson)
            lessons.append({"n": n, "stableId": lesson["stableId"],
                            "title": lesson["title"], "objective": lesson["objective"],
                            "focus": lesson["focus"], "words": words,
                            "sourceCardIndices": source_indices,
                            "speaking": lesson["speaking"]["goal"],
                            "speakingScene": lesson["speaking"],
                            "reader": lesson["reader"], "modes": lesson["modes"]})
    if [lesson["n"] for lesson in lessons] != list(range(1, 11)):
        raise ValueError("Foundation lessons must be contiguous 1–10")
    return {"version": 1, "module": "foundation-travel-lunch-fr",
            "baseModule": "travel-lunch", "stage": "foundation",
            "language": "French", "nativeLanguage": "English",
            "headline": "French Lunch Foundation 10",
            "threshold": "Greet, ask, order and clarify a simple lunch in French with English support.",
            "reviewed": False, "registered": False, "sourceHashes": hashes,
            "lessons": lessons}


if __name__ == "__main__":
    rendered = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    if "--write" in sys.argv:
        DESTINATION.parent.mkdir(parents=True, exist_ok=True)
        DESTINATION.write_text(rendered)
        print(f"Wrote {DESTINATION.relative_to(ROOT)}")
    elif DESTINATION.read_text() != rendered:
        raise SystemExit("French Foundation stage is out of date; rerun with --write")
    else:
        print("French Foundation stage matches both pinned source drafts")
