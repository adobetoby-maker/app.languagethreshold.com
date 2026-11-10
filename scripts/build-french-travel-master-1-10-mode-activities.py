#!/usr/bin/env python3
"""Build source-pinned, private six-mode activities for French Breakfast Master 1–10."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "content/french-travel-breakfast/private-runtime-candidate.json"
OUTPUT = ROOT / "content/french-travel-breakfast/private-mode-activities-master-1-10.json"
MODES = ("see", "recall", "hear", "type", "say", "write")

PLAN = {
    1: {
        "see": ("Find when this Paris café asks the friends to pay.", "line:9"),
        "recall": ("Recall the French word for a receipt.", "word:1"),
        "hear": ("Listen for the question about whether the stool is reserved.", "word:16"),
        "type": ("Type the question asking when to pay at this café.", "word:17"),
        "say": ("Order an espresso and a croissant politely.", "word:19"),
        "write": ("Write Thiago's step-by-step summary of their café visit.", "line:17"),
    },
    2: {
        "see": ("Find which kind of loaf the baker says the house bread is today.", "line:6"),
        "recall": ("Recall the French word for a bread crust.", "word:13"),
        "hear": ("Listen for the question about ham and preparation when avoiding pork.", "word:19"),
        "type": ("Type the question comparing the house bread with a baguette.", "word:20"),
        "say": ("Order a small bread with jam.", "word:22"),
        "write": ("Write Camille's summary of the four bread-order choices.", "line:17"),
    },
    3: {
        "see": ("Find where the server places Sofie's hot chocolate.", "line:11"),
        "recall": ("Recall the French word for the rim of a mug.", "word:3"),
        "hear": ("Listen for Sofie's polite hot-chocolate request.", "word:22"),
        "type": ("Type the instruction to ask the price before paying.", "word:21"),
        "say": ("Ask the server to put the cup on the counter.", "word:17"),
        "write": ("Write how Sofie repeats her order at the end.", "line:18"),
    },
    4: {
        "see": ("Find why the printed allergen chart may be out of date.", "line:5"),
        "recall": ("Recall the French term for sesame.", "word:2"),
        "hear": ("Listen for the direct sesame-allergy statement.", "word:22"),
        "type": ("Type the request for the current supplier label.", "word:19"),
        "say": ("Ask how the bread is prepared and whether equipment is shared.", "word:20"),
        "write": ("Write what the staff cannot confirm about preparation and cross-contact.", "line:13"),
    },
    5: {
        "see": ("Find the reason the breakfast room is closed.", "line:7"),
        "recall": ("Recall the French word for a voucher.", "word:1"),
        "hear": ("Listen for Daniel's statement that breakfast was included.", "word:16"),
        "type": ("Type the request to check with management.", "word:21"),
        "say": ("Ask how the hotel would handle the bill if there is no alternative.", "word:22"),
        "write": ("Write what Maude does not promise before checking the terms.", "line:15"),
    },
    6: {
        "see": ("Find the three plant drinks the server lists.", "line:5"),
        "recall": ("Recall the French term for lactose-free milk.", "word:2"),
        "hear": ("Listen for Hannah's direct vegan ingredient and preparation question.", "word:18"),
        "type": ("Type the question about butter and dairy in the croissants.", "word:19"),
        "say": ("Ask when the oat-drink delivery is expected.", "word:16"),
        "write": ("Write what Hannah and Dev choose while preparation details remain unclear.", "line:16"),
    },
    7: {
        "see": ("Find how Emma and the worker recount the unpaid items.", "line:11"),
        "recall": ("Recall the French term for the outstanding balance.", "word:7"),
        "hear": ("Listen for the group's toast and coffee quantities.", "word:16"),
        "type": ("Type the request to confirm the remaining balance.", "word:21"),
        "say": ("Ask whether bank transfer is accepted or only cash.", "word:22"),
        "write": ("Write what Emma keeps after paying the confirmed balance.", "line:17"),
    },
    8: {
        "see": ("Find what the current label says about tree nuts and cross-contact.", "line:10"),
        "recall": ("Recall the French term for anaphylaxis.", "word:4"),
        "hear": ("Listen for the direct statement about a serious tree-nut allergy.", "word:18"),
        "type": ("Type the question about a packaged product with a current label.", "word:22"),
        "say": ("Ask the baker not to scrape the almonds off the pastry.", "word:16"),
        "write": ("Write Kenji's decision and Ana's response to symptoms.", "line:15"),
    },
    9: {
        "see": ("Find what Daniel cannot read on the menu board from the register.", "line:11"),
        "recall": ("Recall the French word for chalk.", "word:8"),
        "hear": ("Listen for Daniel's honest opinion about the coffee temperature.", "word:16"),
        "type": ("Type the suggestion to write prices in larger letters.", "word:20"),
        "say": ("Suggest warming the cups before serving.", "word:17"),
        "write": ("Write Daniel's closing wish for the new café.", "line:18"),
    },
    10: {
        "see": ("Find the confirmed driver pickup time in the message.", "line:9"),
        "recall": ("Recall the French term for altitude sickness.", "word:15"),
        "hear": ("Listen for Lars mentioning altitude sickness before the outing.", "line:6"),
        "type": ("Type the question asking to check the pickup time.", "word:18"),
        "say": ("Ask what breakfast plan would work for everyone.", "word:21"),
        "write": ("Write the agreed breakfast plan.", "word:23"),
    },
}


def build():
    source_bytes = SOURCE.read_bytes()
    source = json.loads(source_bytes)
    assert source["releaseGate"]["enabled"] is False
    lessons = {row["draftLessonKey"]: row for row in source["lessons"]}
    result = {
        "schema": 1,
        "purpose": "private authored activity pilot; not learner-facing",
        "sourceFixture": str(SOURCE.relative_to(ROOT)),
        "sourceSha256": hashlib.sha256(source_bytes).hexdigest(),
        "targetLanguage": "French",
        "nativeLanguage": "English",
        "reviewed": False,
        "registered": False,
        "audioListeningReviewed": False,
        "activities": [],
    }
    for number, plan in PLAN.items():
        assert tuple(plan) == MODES
        key = f"master:{number}"
        lesson = lessons[key]
        for mode, (cue, short_ref) in plan.items():
            kind, ordinal = short_ref.split(":")
            ref = f"{key}:{kind}:{ordinal}"
            collection = lesson["reader"] if kind == "line" else lesson["words"]
            matches = [item for item in collection if item["id"] == ref]
            assert len(matches) == 1, ref
            item = matches[0]
            result["activities"].append({
                "id": f"{key}:{mode}:pilot-1",
                "lessonKey": key,
                "mode": mode,
                "cueEnglish": cue,
                "sourceRef": ref,
                "modelFrench": item["targetFrench"],
                "modelEnglish": item["supportEnglish"],
                "responseKind": "open" if mode in ("say", "write") else "fixed",
                "recordedAudioRequired": mode == "hear",
                "readyForLearner": False,
            })
    assert len(result["activities"]) == 60
    assert len({x["id"] for x in result["activities"]}) == 60
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = build()
    if args.check:
        assert OUTPUT.read_text() == expected, "private mode activities are stale"
        print("60 private activities: exact source pairs and release gates verified")
    else:
        OUTPUT.write_text(expected)
        print(OUTPUT)
