#!/usr/bin/env python3
"""Read-only exact-text audio scope for French Breakfast source packets.

No speech service, credential, audio file, or learner runtime is touched.
Private legacy evidence is optional and never copied into the repository.
"""

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path


PACKETS = Path(__file__).resolve().parents[1]
EXPECTED = {"foundation": 10, "core": 30, "master": 20}
TEXT_KEYS = ("targetFrenchDraft", "targetFrench", "french", "fr")
HISTORICAL_USD_PER_MILLION_CHARACTERS = 30.0


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def packet_path(stage: str, number: int) -> Path:
    if stage == "foundation":
        return PACKETS / f"foundation-{number}/owner-review-packet.json"
    if stage == "master":
        return PACKETS / f"master-{number}/master-{number}.json"
    if number in (1, 3, 7):
        return PACKETS / f"core-{number}/private-packet.json"
    if number <= 14:
        return PACKETS / f"core-{number}/candidate.json"
    if number <= 17:
        group = "core-15-17"
    elif number <= 20:
        group = "core-18-20"
    elif number <= 23:
        group = "core-21-23"
    elif number <= 26:
        group = "core-24-26"
    elif number == 27:
        group = "core-27"
    elif number <= 29:
        group = "core-28-29"
    else:
        group = "core-30"
    return PACKETS / group / f"core-{number}.json"


def row_text(row: dict) -> str | None:
    keys = [key for key in TEXT_KEYS if key in row]
    if len(keys) != 1:
        raise ValueError(f"expected one French text field on row {row.get('id')}: {keys}")
    value = row[keys[0]]
    if value is not None and (not isinstance(value, str) or not value):
        raise ValueError(f"invalid French text on row {row.get('id')}")
    return value


def load_packets() -> tuple[list[dict], dict[str, str]]:
    lessons = []
    hashes = {}
    for stage, count in EXPECTED.items():
        for number in range(1, count + 1):
            path = packet_path(stage, number)
            doc = json.loads(path.read_text(encoding="utf-8"))
            if doc.get("reviewed") is True:
                raise ValueError(f"reviewed flag opened: {stage}:{number}")
            gates = doc.get("gates", {})
            for key, value in gates.items():
                if key != "requiresQualifiedReview" and value is True:
                    raise ValueError(f"release gate {key} opened: {stage}:{number}")
            for key in ("registered", "audioRegistered", "listeningReviewed", "learnerVisible"):
                if doc.get(key) is True:
                    raise ValueError(f"release flag {key} opened: {stage}:{number}")
            cards = doc.get("cards", doc.get("words"))
            reader = doc.get("reader")
            if isinstance(reader, dict):
                reader = reader.get("turns")
            if not isinstance(cards, list) or not isinstance(reader, list):
                raise ValueError(f"missing cards/Reader: {stage}:{number}")
            rows = cards + reader
            ids = [row.get("id") for row in rows]
            if any(not isinstance(row_id, str) or not row_id for row_id in ids):
                raise ValueError(f"missing row ID: {stage}:{number}")
            if len(ids) != len(set(ids)):
                raise ValueError(f"duplicate row ID: {stage}:{number}")
            lessons.append({
                "lessonKey": f"{stage}:{number}",
                "stage": stage,
                "cards": cards,
                "reader": reader,
            })
            hashes[str(path.relative_to(PACKETS))] = sha256(path)
    return lessons, hashes


def current_scope(lessons: list[dict]) -> tuple[dict, list[tuple[str, str]]]:
    stages = {}
    all_rows = []
    withheld = []
    breakdown = []
    for stage, expected_count in EXPECTED.items():
        stage_rows = []
        stage_positions = 0
        for lesson in lessons:
            if lesson["stage"] != stage:
                continue
            selected = []
            positions = 0
            for row in lesson["cards"] + lesson["reader"]:
                positions += 1
                stage_positions += 1
                value = row_text(row)
                if value is None:
                    withheld.append({
                        "lessonKey": lesson["lessonKey"],
                        "rowId": row["id"],
                        "sourceEnglish": row.get("supportEnglish", row.get("english")),
                    })
                    continue
                if row.get("learnerFaceEnabled") is True:
                    raise ValueError(f"learner face enabled: {row['id']}")
                selected.append(value)
                stage_rows.append(value)
                all_rows.append((lesson["lessonKey"], value))
            breakdown.append({
                "lessonKey": lesson["lessonKey"],
                "positions": positions,
                "selectedPositions": len(selected),
                "withheldPositions": positions - len(selected),
                "distinctSelectedTexts": len(set(selected)),
                "oneVoiceDistinctCharacters": sum(map(len, set(selected))),
            })
        distinct = set(stage_rows)
        stages[stage] = {
            "lessons": expected_count,
            "positions": stage_positions,
            "selectedPositions": len(stage_rows),
            "withheldPositions": stage_positions - len(stage_rows),
            "distinctSelectedTexts": len(distinct),
            "oneVoicePositionCharacters": sum(map(len, stage_rows)),
            "oneVoiceDistinctCharacters": sum(map(len, distinct)),
        }
    texts = [text for _, text in all_rows]
    distinct = set(texts)
    one_voice = sum(map(len, distinct))
    return {
        "stages": stages,
        "lessons": breakdown,
        "totalPositions": len(texts) + len(withheld),
        "selectedPositions": len(texts),
        "withheldPositions": withheld,
        "distinctSelectedTexts": len(distinct),
        "twoVoicePositionDecisions": 2 * len(texts),
        "twoVoiceDistinctDecisions": 2 * len(distinct),
        "oneVoicePositionCharacters": sum(map(len, texts)),
        "oneVoiceDistinctCharacters": one_voice,
        "twoVoiceDistinctRequestCharacters": 2 * one_voice,
        "historicalTwoVoiceDistinctGrossUSD": round(
            2 * one_voice * HISTORICAL_USD_PER_MILLION_CHARACTERS / 1_000_000, 5
        ),
    }, all_rows


def compare_legacy(manifest_path: Path, signal_path: Path | None, rows: list[tuple[str, str]]) -> dict:
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    for flag in ("textReviewed", "listeningReviewed", "registered"):
        if manifest.get(flag) is not False:
            raise ValueError(f"legacy {flag} is no longer false")
    legacy_texts = set()
    clip_count = 0
    for clip in manifest["clips"].values():
        legacy_texts.add(clip["text"])
        voices = clip["voices"]
        if set(voices) != {"female", "male"}:
            raise ValueError("legacy clip lacks female/male voices")
        if any(voice.get("listeningReviewed") is not False for voice in voices.values()):
            raise ValueError("legacy listening flag opened")
        clip_count += len(voices)
    matching = [(lesson, text) for lesson, text in rows if text in legacy_texts]
    matching_distinct = {text for _, text in matching}
    missing = {text for _, text in rows} - legacy_texts
    result = {
        "manifestSha256": sha256(manifest_path),
        "legacyDistinctTexts": len(legacy_texts),
        "legacyVoiceClips": clip_count,
        "legacyTextReviewed": False,
        "legacyListeningReviewed": False,
        "legacyRegistered": False,
        "selectedPositionsWithExactOldText": len(matching),
        "distinctSelectedTextsWithExactOldText": len(matching_distinct),
        "distinctTextsWithoutOldExactText": len(missing),
        "twoVoiceCharactersForDistinctMissingTexts": 2 * sum(map(len, missing)),
        "historicalGrossUSDForDistinctMissingTexts": round(
            2 * sum(map(len, missing)) * HISTORICAL_USD_PER_MILLION_CHARACTERS / 1_000_000,
            5,
        ),
        "stageExactTextOverlap": dict(Counter(
            lesson.split(":", 1)[0] for lesson, _ in matching
        )),
        "lessonExactTextOverlap": [
            {
                "lessonKey": lesson["lessonKey"],
                "selectedPositionsWithOldExactText": sum(
                    row_text(row) in legacy_texts
                    for row in lesson["cards"] + lesson["reader"]
                    if row_text(row) is not None
                ),
            }
            for lesson in load_packets()[0]
        ],
    }
    if signal_path:
        screen = json.loads(signal_path.read_text(encoding="utf-8"))
        if screen.get("listeningReviewed") is not False or screen.get("registered") is not False:
            raise ValueError("legacy signal review/registration flag opened")
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
    parser.add_argument("--check", action="store_true", help="compare with committed inventory.json")
    args = parser.parse_args()
    if args.signal_screen and not args.legacy_manifest:
        parser.error("--signal-screen requires --legacy-manifest")
    lessons, hashes = load_packets()
    scope, rows = current_scope(lessons)
    report = {
        "schema": 1,
        "state": "read-only-unreviewed-source-inventory",
        "pairKey": "fr-en",
        "sourceFileSha256": hashes,
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
        report["legacyComparison"] = compare_legacy(args.legacy_manifest, args.signal_screen, rows)
    snapshot = Path(__file__).with_name("inventory.json")
    if args.check:
        saved = json.loads(snapshot.read_text(encoding="utf-8"))
        for key in report:
            if saved.get(key) != report[key]:
                raise SystemExit(f"FAIL audio inventory drift: {key}")
        print("PASS French Breakfast audio inventory: 60 packets, exact text, false gates")
    else:
        print(json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
