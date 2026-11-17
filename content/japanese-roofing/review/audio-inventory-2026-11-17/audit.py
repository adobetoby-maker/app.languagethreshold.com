#!/usr/bin/env python3
"""Recount inert Japanese Roofing archived draft audio, without playback or writes."""

import argparse
import hashlib
import json
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
HERE = Path(__file__).resolve().parent
ARCHIVE = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-roofing"
MODES = {"see", "recall", "hear", "type", "say", "write"}


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_refs(bundle):
    if "sourceFileSHA256" in bundle:
        return list(bundle["sourceFileSHA256"].items())
    source = bundle.get("source", {})
    pairs = (("curriculumPath", "curriculumSha256"), ("readerPath", "readerSha256"))
    return [(source[p], source[h]) for p, h in pairs if p in source and h in source]


def inventory(manifest=None, signal=None):
    counts = Counter()
    sources = {}
    texts = []
    lesson_ids = set()
    for path in sorted(ARCHIVE.glob("*-draft.json")):
        bundle = json.loads(path.read_text())
        assert bundle["target"] == "Japanese" and bundle["native"] == "English"
        assert bundle["reviewed"] is False and bundle["registered"] is False
        assert bundle["audio"] == "none"
        assert all(value is False for value in bundle["reviewGates"].values())
        sources[str(path.relative_to(ROOT))] = sha(path)
        for source_path, expected in source_refs(bundle):
            actual = hashlib.sha256(
                subprocess.check_output(["git", "show", f"HEAD:{source_path}"], cwd=ROOT)
            ).hexdigest()
            assert actual == expected, f"source drift: {source_path}"
            counts["matchedSourceReferences"] += 1
        stage = bundle.get("stage") or bundle["stageId"].split("-", 1)[0]
        for lesson in bundle["lessons"]:
            key = lesson["stableId"]
            assert key not in lesson_ids, key
            lesson_ids.add(key)
            assert lesson.get("reviewed", False) is False
            counts[f"{stage}Lessons"] += 1
            modes = lesson.get("modes", {})
            counts["missingModeCues"] += len(MODES - set(modes))
            counts["modeCuesWithoutPromptTarget"] += sum(
                not isinstance(value, dict) or not {"prompt", "target"} <= set(value)
                for value in modes.values()
            )
            for field in ("cards", "reader"):
                if field not in lesson:
                    counts[f"missing{field.title()}Fields"] += 1
                for row in lesson.get(field, []):
                    counts[f"{stage}{field.title()}Positions"] += 1
                    face = row.get("ja")
                    if face:
                        texts.append(face)
                    else:
                        counts["nullPositions"] += 1

    assert (counts["foundationLessons"], counts["coreLessons"], counts["masterLessons"]) == (10, 30, 20)
    unique = set(texts)
    result = {
        "schema": 1,
        "pair": "Japanese:English",
        "locale": "ja-JP",
        "state": "archived-source-only-draft-audio-planning",
        "reviewed": False,
        "registered": False,
        "listeningReviewed": False,
        "learnerRegistered": False,
        "scoringRegistered": False,
        "offlineRegistered": False,
        "progressRegistered": False,
        "v4Registered": False,
        "archiveFileSHA256": sources,
        "counts": {
            **dict(sorted(counts.items())),
            "nullPositions": counts["nullPositions"],
            "missingCardsFields": counts["missingCardsFields"],
            "missingReaderFields": counts["missingReaderFields"],
            "missingModeCues": counts["missingModeCues"],
            "selectedPositions": len(texts),
            "uniqueExactTexts": len(unique),
            "potentialTwoVoiceDistinctClips": len(unique) * 2,
            "potentialPositionSpecificListeningDecisions": len(texts) * 2,
            "unicodeCharactersPerVoice": sum(map(len, unique)),
            "unicodeCharactersTwoVoiceRequests": 2 * sum(map(len, unique)),
        },
    }
    if manifest:
        old = json.loads(manifest.read_text())
        assert old["pairKey"] == "Japanese:English" and old["locale"] == "ja-JP"
        assert old["registered"] is False
        old_texts = set(old["clips"])
        clips = [clip for voices in old["clips"].values() for clip in voices.values()]
        assert len(clips) == len(old_texts) * 2
        result["privateComparison"] = {
            "manifestSHA256": sha(manifest),
            "legacyDistinctTexts": len(old_texts),
            "legacyTwoVoiceClips": len(clips),
            "legacyListeningReviewedClips": sum(c.get("listeningReviewed") is True for c in clips),
            "legacyPendingListeningClips": sum(c.get("listeningReviewed") is not True for c in clips),
            "exactTextTechnicalCandidateStrings": len(unique & old_texts),
            "archiveStringsWithoutLegacyTextMatch": len(unique - old_texts),
            "legacyStringsOutsideArchiveScope": len(old_texts - unique),
        }
        if signal:
            screen = json.loads(signal.read_text())
            signal_manifest_hash = screen["manifestSHA256"]
            if signal_manifest_hash != sha(manifest):
                # The screen preceded a source-inventory metadata correction.
                # Transfer its signal counts only when the exact clip map agrees.
                candidates = [
                    path for path in manifest.parent.glob("manifest*.json")
                    if sha(path) == signal_manifest_hash
                ]
                assert len(candidates) == 1, "signal manifest revision unavailable"
                screened = json.loads(candidates[0].read_text())
                assert screened["clips"] == old["clips"], "screened clip map drift"
            assert screen["decodedFiles"] == len(clips)
            assert screen["registered"] is False
            result["privateComparison"].update({
                "signalScreenSHA256": sha(signal),
                "signalScreenManifestSHA256": signal_manifest_hash,
                "signalScreenClipMapMatchesCurrent": True,
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
        saved = json.loads((HERE / "inventory.json").read_text())
        public = {k: v for k, v in report.items() if k != "privateComparison"}
        expected = {k: v for k, v in saved.items() if k != "privateComparison"}
        assert public == expected, "archive or pinned source drift"
        if args.legacy_manifest:
            assert report["privateComparison"] == saved["privateComparison"], "private evidence drift"
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
