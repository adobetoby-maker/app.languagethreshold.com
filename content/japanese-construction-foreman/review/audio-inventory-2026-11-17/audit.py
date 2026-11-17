#!/usr/bin/env python3
"""Read-only inventory of Foreman source drafts and optional private audio evidence."""

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
SOURCE_DIR = ROOT / "content/japanese-construction-foreman"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_files():
    files = [SOURCE_DIR / "foundation-draft.json"]
    files.extend(sorted(SOURCE_DIR.glob("core-translation*-draft.json")))
    files.extend(sorted(SOURCE_DIR.glob("master-translation*-draft.json")))
    return files


def inventory(manifest=None, signal=None):
    counts = Counter()
    text_positions = []
    seen_lessons = set()
    sources = {}
    for path in source_files():
        data = json.loads(path.read_text())
        stage = data["stage"]
        assert data["target"] == "Japanese" and data["native"] == "English"
        assert data["reviewed"] is False
        sources[str(path.relative_to(ROOT))] = sha(path)
        for lesson in data["lessons"]:
            lesson_key = f"{stage}:{lesson['n']}"
            assert lesson_key not in seen_lessons, lesson_key
            seen_lessons.add(lesson_key)
            counts[f"{stage}Lessons"] += 1
            for field in ("terms", "reading", "dialogue"):
                for value in lesson.get(field, []):
                    face = value.get("ja") if isinstance(value, dict) else value.partition("|")[0]
                    if face:
                        text_positions.append((stage, field, face))
                        counts[f"{stage}{field.title()}Positions"] += 1
                    else:
                        counts["nullPositions"] += 1

    unique = {face for _, _, face in text_positions}
    assert (counts["foundationLessons"], counts["coreLessons"], counts["masterLessons"]) == (10, 30, 20)
    result = {
        "schema": 1,
        "pair": "Japanese:English",
        "locale": "ja-JP",
        "state": "source-only-draft-audio-planning",
        "reviewed": False,
        "registered": False,
        "listeningReviewed": False,
        "learnerRegistered": False,
        "scoringRegistered": False,
        "offlineRegistered": False,
        "progressRegistered": False,
        "v4Registered": False,
        "sourceFileSHA256": sources,
        "counts": {
            **dict(sorted(counts.items())),
            "positions": len(text_positions),
            "uniqueExactTexts": len(unique),
            "potentialTwoVoiceDistinctClips": len(unique) * 2,
            "potentialPositionSpecificListeningDecisions": len(text_positions) * 2,
            "unicodeCharactersPerVoice": sum(map(len, unique)),
            "unicodeCharactersTwoVoiceRequests": 2 * sum(map(len, unique)),
        },
    }
    if manifest:
        raw = json.loads(manifest.read_text())
        assert raw["pairKey"] == "Japanese:English" and raw["locale"] == "ja-JP"
        old = set(raw["clips"])
        clip_count = sum(len(voices) for voices in raw["clips"].values())
        reviewed_clips = sum(
            clip.get("listeningReviewed") is True
            for voices in raw["clips"].values()
            for clip in voices.values()
        )
        assert clip_count == 2 * len(old)
        assert raw["registered"] is False
        result["privateComparison"] = {
            "manifestSHA256": sha(manifest),
            "legacyDistinctTexts": len(old),
            "legacyTwoVoiceClips": clip_count,
            "legacyListeningReviewedClips": reviewed_clips,
            "legacyPendingListeningClips": clip_count - reviewed_clips,
            "exactTextTechnicalCandidateStrings": len(unique & old),
            "newDraftStringsWithoutLegacyTextMatch": len(unique - old),
            "legacyStringsOutsideMainDraftScope": len(old - unique),
        }
        if signal:
            screen = json.loads(signal.read_text())
            assert screen["manifestSHA256"] == sha(manifest)
            assert screen["decodedFiles"] == clip_count
            assert screen["registered"] is False
            result["privateComparison"].update({
                "signalScreenSHA256": sha(signal),
                "signalScreenDecodedFiles": screen["decodedFiles"],
                "signalFlaggedFiles": screen["flaggedFiles"],
            })
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--legacy-manifest", type=Path)
    parser.add_argument("--signal-screen", type=Path)
    args = parser.parse_args()
    if args.signal_screen and not args.legacy_manifest:
        parser.error("--signal-screen requires --legacy-manifest")
    report = inventory(args.legacy_manifest, args.signal_screen)
    if args.check:
        expected = json.loads((HERE / "inventory.json").read_text())
        public = {k: v for k, v in report.items() if k != "privateComparison"}
        saved = {k: v for k, v in expected.items() if k != "privateComparison"}
        assert public == saved, "main source draft drift; recount before planning audio"
        if args.legacy_manifest:
            assert report["privateComparison"] == expected["privateComparison"], "private evidence drift"
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
