#!/usr/bin/env python3
"""Build private, exact-source Japanese Breakfast Master 13–20 activities."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-travel-breakfast"
MODES = ("see", "recall", "hear", "type", "say", "write")
SOURCES = {"13-15": (13, 14, 15), "16-18": (16, 17, 18), "19-20": (19, 20)}

# Each prompt points to an authored card or Reader turn. The model text comes
# straight from that pair, so the builder cannot silently revise clinical terms.
PLAN = {
    13: {
        "see": ("Find when the friend ate the breakfast cake.", "reader", 2),
        "recall": ("Without looking, name hives in Japanese.", "cards", 16),
        "hear": ("Listen for the hives, lip swelling, and breathing difficulty.", "reader", 5),
        "type": ("Type when the speaker called local emergency services.", "reader", 6),
        "say": ("Tell the duty manager what happened when responders arrived.", "reader", 8),
        "write": ("Write what the kitchen said about almond flour.", "reader", 11),
    },
    14: {
        "see": ("Find the mismatch between the gluten-free sign and the ingredient list.", "reader", 1),
        "recall": ("Without looking, name celiac disease in Japanese.", "cards", 15),
        "hear": ("Listen for what the guest nearly ate and why they checked first.", "reader", 2),
        "type": ("Type the request to check the preparation area and shared utensils.", "reader", 6),
        "say": ("Suggest how the baker can recheck a product and tray before placing a sign.", "reader", 8),
        "write": ("Write what the guest will do if the bread cannot be verified.", "reader", 10),
    },
    15: {
        "see": ("Find the instruction that points guests to the emergency exit.", "reader", 2),
        "recall": ("Without looking, name evacuation in Japanese.", "cards", 7),
        "hear": ("Listen for the instruction about the elevator and stairs.", "reader", 3),
        "type": ("Type the question about the meeting point.", "reader", 6),
        "say": ("Tell staff that someone needs help moving.", "reader", 4),
        "write": ("Write your room number and location at the meeting point.", "reader", 10),
    },
    16: {
        "see": ("Find the correction to the incident time in the second section.", "reader", 2),
        "recall": ("Without looking, name an allergic reaction in Japanese.", "cards", 15),
        "hear": ("Listen for what the witness could not confirm from observation.", "reader", 6),
        "type": ("Type the offer to show the message-time record.", "reader", 4),
        "say": ("Ask to read the corrected statement once more.", "reader", 8),
        "write": ("Write the request for a copy if the witness signs.", "reader", 10),
    },
    17: {
        "see": ("Find which health details Lucía permits and which she excludes.", "reader", 2),
        "recall": ("Without looking, name the emergency department in Japanese.", "cards", 15),
        "hear": ("Listen for the decision about attaching medical documents.", "reader", 3),
        "type": ("Type the email subject line about the breakfast incident.", "reader", 4),
        "say": ("Ask the hotel for a written reply and check the recipient and attachments.", "reader", 9),
        "write": ("Write how the sender will summarize the verified timeline.", "reader", 6),
    },
    18: {
        "see": ("Find why the group expects to arrive later than planned.", "reader", 1),
        "recall": ("Without looking, name a change in group size in Japanese.", "cards", 4),
        "hear": ("Listen for what the host will check before replying.", "reader", 3),
        "type": ("Type the expected arrival time and key-pickup question.", "reader", 4),
        "say": ("Ask the host about tomorrow's breakfast hours and a later time.", "reader", 9),
        "write": ("Write when the guest will call back after losing signal.", "reader", 6),
    },
    19: {
        "see": ("Find what the guests liked most about breakfast.", "reader", 2),
        "recall": ("Without looking, name cross-contact in Japanese.", "cards", 10),
        "hear": ("Listen for the family member's celiac disease and the requested food information.", "reader", 4),
        "type": ("Type the explanation about the shared butter container.", "reader", 5),
        "say": ("Explain what food information would help before a future visit.", "reader", 7),
        "write": ("Write what the guests will check before considering a return.", "reader", 9),
    },
    20: {
        "see": ("Find what is sold out and what information the staff cannot find.", "reader", 4),
        "recall": ("Without looking, name peanuts in Japanese.", "cards", 8),
        "hear": ("Listen for the question about the relative's peanut allergy.", "reader", 3),
        "type": ("Type the request about the substitute dish's ingredients and preparation.", "reader", 5),
        "say": ("Tell the next lodging host that the group will arrive late.", "reader", 9),
        "write": ("Write the factual checkout report about the missing information.", "reader", 10),
    },
}


def build(section, numbers):
    source_path = CONTENT / f"master-{section}-draft.json"
    raw = source_path.read_bytes()
    source = json.loads(raw)
    assert source["target"] == "Japanese" and source["native"] == "English"
    assert source["reviewed"] is False and source["registered"] is False
    lessons = {lesson["n"]: lesson for lesson in source["lessons"]}
    assert set(lessons) == set(numbers)
    result = {
        "schema": 1,
        "state": "private-authored-activity-draft",
        "pairKey": "Japanese:English",
        "source": str(source_path.relative_to(ROOT)),
        "sourceSha256": hashlib.sha256(raw).hexdigest(),
        "reviewed": False,
        "registered": False,
        "audioListeningReviewed": False,
        "activities": [],
    }
    for n in numbers:
        mode_plan = PLAN[n]
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
    assert len(result["activities"]) == len(numbers) * 6
    assert len({item["id"] for item in result["activities"]}) == len(numbers) * 6
    return json.dumps(result, ensure_ascii=False, indent=2) + "\n"


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for section, numbers in SOURCES.items():
        output = CONTENT / f"private-mode-activities-master-{section}.json"
        expected = build(section, numbers)
        if args.check:
            assert output.read_text() == expected, f"private Master {section} activities are stale"
        else:
            output.write_text(expected)
    print("48 private Japanese Master 13–20 activities: exact source pairs and release gates verified")


if __name__ == "__main__":
    main()
