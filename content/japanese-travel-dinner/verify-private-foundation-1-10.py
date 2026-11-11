#!/usr/bin/env python3
"""Verify ten consecutive Japanese Dinner Foundation draft lessons."""

import json
import runpy
from pathlib import Path


HERE = Path(__file__).resolve().parent
FILES = ("foundation-1-3-draft.json", "foundation-4-6-draft.json",
         "foundation-7-10-draft.json")
VERIFIERS = ("verify-private-foundation-1-3.py", "verify-private-foundation-4-6.py",
             "verify-private-foundation-7-10.py")


def main():
    for name in VERIFIERS:
        runpy.run_path(str(HERE / name))["main"]()
    drafts = [json.loads((HERE / name).read_text()) for name in FILES]
    if not all(draft["source"] == drafts[0]["source"] for draft in drafts):
        raise ValueError("Foundation batches use different source pins")
    lessons = [lesson for draft in drafts for lesson in draft["lessons"]]
    expected = [f"foundation-travel-dinner:{n}:ja-en" for n in range(1, 11)]
    if [lesson["stableId"] for lesson in lessons] != expected:
        raise ValueError("Foundation batch boundary, order, or identity changed")
    print(f"Japanese Dinner Foundation 1–10: {len(lessons)} private lessons, "
          f"{sum(len(lesson['cards']) for lesson in lessons)} cards, "
          f"{sum(len(lesson['reader']) for lesson in lessons)} Reader turns, "
          f"{sum(len(lesson['modes']) for lesson in lessons)} authored mode prompts; unregistered")


if __name__ == "__main__":
    main()
