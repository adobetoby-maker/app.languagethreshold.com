#!/usr/bin/env python3
"""Pin private fr-FR recording text from authored pronunciation lessons."""

import argparse
import hashlib
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FILES = (
    "foundation-1-3-draft.json",
    "foundation-4-5-draft.json",
    "foundation-6-8-draft.json",
    "foundation-9-10-draft.json",
    "core-1-3-draft.json",
    "core-4-6-draft.json",
)
BASE = ROOT / "content/french-pronunciation"
OUTPUT = BASE / "private-audio-scope-fr-en.json"
SCOPES = {
    "foundation-core-1-6": (FILES, OUTPUT, {"foundation": list(range(1, 11)), "core": list(range(1, 7))}),
    "core-7-10": (("core-7-10-draft.json",), BASE / "private-audio-scope-core-7-10-fr-en.json", {"core": list(range(7, 11))}),
}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def build(scope="foundation-core-1-6"):
    files, _, expected_lessons = SCOPES[scope]
    occurrences = defaultdict(list)
    source_files = []
    stage_lessons = defaultdict(list)
    field_counts = defaultdict(int)
    seen_ids = set()

    def add(text, lesson, field):
        assert isinstance(text, str) and text and text == text.strip()
        occurrences[text].append({"lessonId": lesson["id"], "field": field})
        field_counts[field.split("[")[0]] += 1

    for filename in files:
        path = BASE / filename
        raw = path.read_bytes()
        draft = json.loads(raw)
        assert (draft["moduleId"], draft["targetLanguage"], draft["nativeLanguage"]) == (
            "french-sound-like-a-native", "French", "English"
        )
        assert draft["stage"] in ("foundation", "core")
        assert not any(draft[gate] for gate in ("reviewed", "runtimeRegistered", "audioPublished"))
        source_files.append({"path": f"content/french-pronunciation/{filename}", "sha256": sha(raw)})
        for lesson in draft["lessons"]:
            stage = draft["stage"]
            assert lesson["id"] == f"{stage}-french-sound-like-a-native:{lesson['n']}:fr-en"
            assert lesson["id"] not in seen_ids
            seen_ids.add(lesson["id"])
            stage_lessons[stage].append(lesson["id"])
            for index, word in enumerate(lesson["words"], 1):
                assert word["en"] and not word.get("es")
                add(word["fr"], lesson, f"cards[{index}].fr")
            for index, line in enumerate(lesson["reader"], 1):
                assert line["en"] and not line.get("es")
                add(line["fr"], lesson, f"reader[{index}].fr")
            for field in ("opening", "closure"):
                add(lesson["speaking"][field], lesson, f"speaking.{field}")

    assert {stage: [int(item.split(":")[1]) for item in ids] for stage, ids in stage_lessons.items()} == expected_lessons
    texts = sorted(occurrences)
    characters = sum(len(text) for text in texts)
    return {
        "schema": 1,
        "state": "private-audio-scope-unsynthesized",
        "moduleId": "french-sound-like-a-native",
        "pairKey": "French:English",
        "locale": "fr-FR",
        "voices": {"female": "fr-FR-Chirp3-HD-Aoede", "male": "fr-FR-Chirp3-HD-Charon"},
        "sourceFiles": source_files,
        "reviewed": False,
        "registered": False,
        "recordingsGenerated": False,
        "listeningReviewed": False,
        "includedFields": ["cards[].fr", "reader[].fr", "speaking.opening", "speaking.closure"],
        "excludedFields": ["English support", "English practice prompts", "unwritten conversation replies"],
        "stageLessons": dict(stage_lessons),
        "counts": {
            "lessons": len(seen_ids),
            "placementsByField": dict(sorted(field_counts.items())),
            "uniqueExactTexts": len(texts),
            "twoVoiceClips": len(texts) * 2,
            "unicodeCharactersPerVoice": characters,
            "projectedBillableCharactersTwoVoices": characters * 2,
        },
        "planningRate": {
            "usdPerMillionCharacters": 30,
            "source": "https://cloud.google.com/text-to-speech/pricing",
            "grossTwoVoiceEstimateUSD": round(characters * 2 * 30 / 1_000_000, 4),
            "note": "Planning estimate before retakes; actual billing and rate require a fresh check before synthesis.",
        },
        "exactTextSha256": sha("\n".join(texts).encode("utf-8")),
        "texts": [
            {"text": text, "sha256": sha(text.encode("utf-8")), "occurrences": occurrences[text]}
            for text in texts
        ],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--scope", choices=SCOPES, default="foundation-core-1-6")
    args = parser.parse_args()
    encoded = json.dumps(build(args.scope), ensure_ascii=False, indent=2) + "\n"
    output = SCOPES[args.scope][1]
    if args.check:
        assert output.read_text() == encoded, "French pronunciation audio scope is stale"
    else:
        output.write_text(encoded)
    print("French pronunciation private audio scope verified")


if __name__ == "__main__":
    main()
