#!/usr/bin/env python3
"""Build private Japanese Breakfast Master 4–6 activity drafts."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/japanese-travel-breakfast/master-4-6-draft.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/private-mode-activities-master-4-6.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    4: {
        "see": ("Find when the host says the chart was updated and when the supplier changed.", "reader", 4),
        "recall": ("Without looking, name the epinephrine auto-injector in Japanese.", "cards", 16),
        "hear": ("Listen and identify the Japanese term for an allergic reaction.", "cards", 15),
        "type": ("Type the question asking when the allergen chart was last updated.", "reader", 3),
        "say": ("Tell the host your companion has a sesame allergy and ask to check the chart together.", "reader", 1),
        "write": ("Write that you checked where the epinephrine auto-injector is.", "reader", 11),
    },
    5: {
        "see": ("Find what the booking confirmation says about breakfast.", "reader", 1),
        "recall": ("Without looking, name a meal voucher in Japanese.", "cards", 8),
        "hear": ("Listen and identify the Japanese expression for a billing adjustment.", "cards", 9),
        "type": ("Type the request to discuss an alternative for today's breakfast.", "reader", 5),
        "say": ("Ask whether the breakfast charge could be adjusted if a voucher is not possible.", "reader", 7),
        "write": ("Write the staff response that the manager approved a voucher.", "reader", 10),
    },
    6: {
        "see": ("Find when the oat-milk delivery is expected.", "reader", 1),
        "recall": ("Without looking, name lactose-free dairy milk in Japanese.", "cards", 4),
        "hear": ("Listen and identify the Japanese word for ingredients.", "cards", 8),
        "type": ("Type the question asking whether soy and almond milk are available.", "reader", 2),
        "say": ("Say you are vegan and ask staff to check the soy drink's ingredients and preparation.", "reader", 4),
        "write": ("Write that you want to compare soy and almond milk after the check.", "reader", 9),
    },
}


def build():
    raw = SOURCE.read_bytes()
    source = json.loads(raw)
    assert source["target"] == "Japanese" and source["native"] == "English"
    assert source["reviewed"] is False and source["registered"] is False
    lessons = {lesson["n"]: lesson for lesson in source["lessons"]}
    result = {
        "schema": 1,
        "state": "private-authored-activity-draft",
        "pairKey": "Japanese:English",
        "source": str(SOURCE.relative_to(ROOT)),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "reviewed": False,
        "registered": False,
        "audioListeningReviewed": False,
        "activities": [],
    }
    for n, mode_plan in PLAN.items():
        assert tuple(mode_plan) == MODES
        lesson = lessons[n]
        lesson_id = lesson["stableId"]
        assert lesson_id == f"master-travel-breakfast:{n}:ja-en"
        for mode, (cue, field, ordinal) in mode_plan.items():
            item = lesson[field][ordinal - 1]
            assert item["ja"].strip() and item["en"].strip()
            result["activities"].append({
                "id": f"{lesson_id}:{mode}:pilot-1",
                "lessonId": lesson_id,
                "mode": mode,
                "cueEnglish": cue,
                "sourceRef": f"{lesson_id}:{field}:{ordinal}",
                "modelJapanese": item["ja"],
                "modelEnglish": item["en"],
                "responseKind": "open" if mode in ("say", "write") else "fixed",
                "recordedAudioRequired": mode == "hear",
                "readyForLearner": False,
            })
    assert len(result["activities"]) == 18
    assert len({item["id"] for item in result["activities"]}) == 18
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private Master activities are stale"
        print("18 private Japanese Master activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
