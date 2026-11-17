#!/usr/bin/env python3
"""Read-only exact-text scope for the Japanese Breakfast review packets.

This script never reads credentials, calls a TTS provider, writes audio, or changes
lesson and release flags. Private legacy evidence is optional and stays outside
the repository.
"""

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path


REVIEW_ROOT = Path(__file__).resolve().parents[1]
EXPECTED = {"foundation": 10, "core": 30, "master": 20}
HISTORICAL_USD_PER_MILLION_CHARACTERS = 30.0


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_packets() -> tuple[list[dict], dict[str, str]]:
    lessons = {}
    files = {}
    for path in sorted(REVIEW_ROOT.glob("*/source-setting-candidate*.json")):
        document = json.loads(path.read_text(encoding="utf-8"))
        for lesson in document.get("lessons", [document]):
            stage = lesson.get("stage")
            key = lesson.get("lessonKey")
            if stage not in EXPECTED or not isinstance(key, str):
                raise ValueError(f"unrecognized lesson in {path}: {stage}/{key}")
            expected_prefix = f"{stage}:"
            if not key.startswith(expected_prefix):
                raise ValueError(f"stage/key mismatch in {path}: {stage}/{key}")
            number = int(key.removeprefix(expected_prefix))
            if not 1 <= number <= EXPECTED[stage]:
                raise ValueError(f"lesson number out of range: {stage}/{number}")
            if (stage, number) in lessons:
                raise ValueError(f"duplicate lesson: {stage}/{number}")
            if lesson.get("reviewed") is not False:
                raise ValueError(f"reviewed flag opened: {stage}/{number}")
            gates = lesson.get("gates", {})
            if any(value is not False for value in gates.values()):
                raise ValueError(f"release gate opened: {stage}/{number}")
            lessons[stage, number] = lesson
        files[str(path.relative_to(REVIEW_ROOT))] = sha256(path)

    expected_keys = {
        (stage, number)
        for stage, count in EXPECTED.items()
        for number in range(1, count + 1)
    }
    if set(lessons) != expected_keys:
        raise ValueError(f"missing lessons: {sorted(expected_keys - set(lessons))}")
    return [lessons[key] for key in sorted(lessons)], files


def current_scope(lessons: list[dict]) -> tuple[dict, list[str]]:
    stages = {}
    all_texts = []
    withheld = []
    lesson_breakdown = []
    for stage in EXPECTED:
        selected = []
        positions = 0
        for lesson in lessons:
            if lesson["stage"] != stage:
                continue
            lesson_selected = []
            lesson_positions = 0
            for group in ("sourceCards", "sourceSettingReader"):
                for row in lesson[group]:
                    positions += 1
                    lesson_positions += 1
                    text = row.get("targetJapaneseDraft")
                    if text is None:
                        withheld.append({
                            "lessonKey": lesson["lessonKey"],
                            "rowId": row.get("id"),
                            "sourceEnglish": row.get("sourceEnglish"),
                        })
                    elif isinstance(text, str) and text:
                        if row.get("learnerFaceEnabled") is True:
                            raise ValueError(f"learner face enabled: {row.get('id')}")
                        selected.append(text)
                        lesson_selected.append(text)
                    else:
                        raise ValueError(f"invalid target text: {row.get('id')}")
            lesson_breakdown.append({
                "lessonKey": lesson["lessonKey"],
                "positions": lesson_positions,
                "selectedPositions": len(lesson_selected),
                "withheldPositions": lesson_positions - len(lesson_selected),
                "distinctSelectedTexts": len(set(lesson_selected)),
                "oneVoiceDistinctCharacters": sum(map(len, set(lesson_selected))),
            })
        distinct = set(selected)
        stage_scope = {
            "lessons": EXPECTED[stage],
            "positions": positions,
            "selectedPositions": len(selected),
            "withheldPositions": positions - len(selected),
            "distinctSelectedTexts": len(distinct),
            "oneVoicePositionCharacters": sum(map(len, selected)),
            "oneVoiceDistinctCharacters": sum(map(len, distinct)),
        }
        stages[stage] = stage_scope
        all_texts.extend(selected)
    distinct_all = set(all_texts)
    one_voice_distinct = sum(map(len, distinct_all))
    scope = {
        "stages": stages,
        "lessons": lesson_breakdown,
        "totalPositions": len(all_texts) + len(withheld),
        "selectedPositions": len(all_texts),
        "withheldPositions": withheld,
        "distinctSelectedTexts": len(distinct_all),
        "twoVoicePositionDecisions": 2 * len(all_texts),
        "twoVoiceDistinctDecisions": 2 * len(distinct_all),
        "oneVoicePositionCharacters": sum(map(len, all_texts)),
        "oneVoiceDistinctCharacters": one_voice_distinct,
        "twoVoiceDistinctRequestCharacters": 2 * one_voice_distinct,
        "historicalTwoVoiceDistinctGrossUSD": round(
            2 * one_voice_distinct * HISTORICAL_USD_PER_MILLION_CHARACTERS / 1_000_000,
            5,
        ),
    }
    return scope, all_texts


def compare_legacy(
    manifest_path: Path, signal_path: Path | None, texts: list[str], lessons: list[dict]
) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if any(manifest.get(flag) is not False for flag in ("textReviewed", "listeningReviewed", "registered")):
        raise ValueError("legacy manifest review/registration gate changed")
    clips = manifest["clips"]
    legacy_texts = set()
    clip_count = 0
    for item in clips.values():
        legacy_texts.add(item["text"])
        voices = item["voices"]
        if set(voices) != {"female", "male"}:
            raise ValueError("legacy manifest lacks exactly two voices")
        if any(voice.get("listeningReviewed") is not False for voice in voices.values()):
            raise ValueError("legacy voice listening gate changed")
        clip_count += len(voices)
    exact_positions = [text for text in texts if text in legacy_texts]
    exact_distinct = set(exact_positions)
    missing_distinct = set(texts) - legacy_texts
    result = {
        "manifestSha256": sha256(manifest_path),
        "legacyDistinctTexts": len(legacy_texts),
        "legacyVoiceClips": clip_count,
        "legacyTextReviewed": False,
        "legacyListeningReviewed": False,
        "legacyRegistered": False,
        "selectedPositionsWithExactOldText": len(exact_positions),
        "distinctSelectedTextsWithExactOldText": len(exact_distinct),
        "distinctTextsWithoutOldExactText": len(missing_distinct),
        "twoVoiceCharactersForDistinctMissingTexts": 2 * sum(map(len, missing_distinct)),
        "historicalGrossUSDForDistinctMissingTexts": round(
            2 * sum(map(len, missing_distinct))
            * HISTORICAL_USD_PER_MILLION_CHARACTERS
            / 1_000_000,
            5,
        ),
        "lessonExactTextOverlap": [
            {
                "lessonKey": lesson["lessonKey"],
                "selectedPositionsWithOldExactText": sum(
                    row.get("targetJapaneseDraft") in legacy_texts
                    for group in ("sourceCards", "sourceSettingReader")
                    for row in lesson[group]
                    if row.get("targetJapaneseDraft") is not None
                ),
            }
            for lesson in lessons
        ],
    }
    if signal_path:
        screen = json.loads(signal_path.read_text(encoding="utf-8"))
        if screen.get("listeningReviewed") is not False or screen.get("registered") is not False:
            raise ValueError("legacy signal review/registration gate changed")
        if screen["filesDecoded"] != clip_count or screen["flaggedFiles"] != len(screen["flags"]):
            raise ValueError("legacy signal screen count mismatch")
        result["signalScreenSha256"] = sha256(signal_path)
        result["decodedFiles"] = screen["filesDecoded"]
        result["flaggedFiles"] = screen["flaggedFiles"]
        result["flaggedIssueCounts"] = dict(Counter(
            issue for flag in screen["flags"] for issue in flag.get("issues", [])
        ))
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--legacy-manifest", type=Path)
    parser.add_argument("--signal-screen", type=Path)
    args = parser.parse_args()
    if args.signal_screen and not args.legacy_manifest:
        parser.error("--signal-screen requires --legacy-manifest")
    lessons, files = load_packets()
    scope, texts = current_scope(lessons)
    output = {
        "schema": 1,
        "state": "read-only-unreviewed-source-inventory",
        "pairKey": "ja-en",
        "sourceFileSha256": files,
        "scope": scope,
        "releaseGates": {
            "textReviewed": False,
            "listeningReviewed": False,
            "registered": False,
            "learnerEnabled": False,
            "progressEnabled": False,
            "offlineEnabled": False,
            "v4Enabled": False,
        },
    }
    if args.legacy_manifest:
        output["legacyComparison"] = compare_legacy(
            args.legacy_manifest, args.signal_screen, texts, lessons
        )
    print(json.dumps(output, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
