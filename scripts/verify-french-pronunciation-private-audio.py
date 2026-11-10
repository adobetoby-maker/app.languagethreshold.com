#!/usr/bin/env python3
"""Independently verify the private French pronunciation HD recording batch."""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "content/french-pronunciation/private-audio-scope-fr-en.json"
DEFAULT_AUDIO = Path("/Users/drive/lt-audio/french-pronunciation/private-f1-c6-2026-11-10")
REPORT = ROOT / "docs/french-program/fr-001-private-audio-evidence.json"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    process = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return round(float(process.stdout.strip()), 3)


def verify(audio_root, inventory_path=INVENTORY):
    inventory = json.loads(inventory_path.read_text())
    manifest_path = audio_root / "manifest.json"
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    assert inventory["pairKey"] == manifest["pairKey"] == "French:English"
    assert inventory["locale"] == manifest["locale"] == "fr-FR"
    assert inventory["voices"] == manifest["voices"] == {
        "female": "fr-FR-Chirp3-HD-Aoede", "male": "fr-FR-Chirp3-HD-Charon"
    }
    assert manifest["sourceExactTextSha256"] == inventory["exactTextSha256"]
    assert inventory["counts"]["lessons"] == sum(len(ids) for ids in inventory["stageLessons"].values())
    assert inventory["counts"]["uniqueExactTexts"] == len(inventory["texts"])
    assert manifest["listeningReviewed"] is manifest["registered"] is False
    assert inventory["listeningReviewed"] is inventory["registered"] is False
    for source in inventory["sourceFiles"]:
        assert sha((ROOT / source["path"]).read_bytes()) == source["sha256"]
    expected = set()
    lengths = []
    sizes = []
    for row in inventory["texts"]:
        text = row["text"]
        key = sha(text.encode("utf-8"))
        assert key == row["sha256"]
        assert set(manifest["clips"][key]) == {"female", "male"}
        for gender, voice in inventory["voices"].items():
            clip = manifest["clips"][key][gender]
            name = f"fr-pronunciation-{key[:24]}-{gender}.mp3"
            assert clip["name"] == name and Path(name).name == name
            assert clip["spokenText"] == text and clip["voice"] == voice and clip["locale"] == "fr-FR"
            assert clip["listeningReviewed"] is False
            path = audio_root / name
            data = path.read_bytes()
            assert sha(data) == clip["sha256"] and len(data) == clip["bytes"] and len(data) > 500
            seconds = duration(path)
            assert seconds == clip["durationSeconds"] and 0.1 < seconds < 120
            expected.add(name)
            lengths.append(seconds)
            sizes.append(len(data))
    assert set(manifest["clips"]) == {row["sha256"] for row in inventory["texts"]}
    assert {path.name for path in audio_root.glob("*.mp3")} == expected
    assert len(expected) == inventory["counts"]["twoVoiceClips"]
    stages = inventory["stageLessons"]
    scope = "private Foundation 1–10 and Core 1–6 only" if "foundation" in stages else "private Core 7–10 only"
    return {
        "schema": 1,
        "moduleId": inventory["moduleId"],
        "pairKey": "French:English", "locale": "fr-FR",
        "scope": scope,
        "audioDirectory": str(audio_root),
        "sourceExactTextSha256": inventory["exactTextSha256"],
        "manifestSha256": sha(manifest_bytes),
        "quotaProject": manifest["quotaProject"],
        "lessons": inventory["counts"]["lessons"], "uniqueExactTexts": inventory["counts"]["uniqueExactTexts"], "verifiedClips": len(expected),
        "totalBytes": sum(sizes), "totalDurationSeconds": round(sum(lengths), 3),
        "minimumDurationSeconds": min(lengths), "maximumDurationSeconds": max(lengths),
        "textVoiceHashDurationVerified": True,
        "listeningReviewed": False, "registered": False, "webPublished": False, "nativeBundled": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inventory", type=Path, default=INVENTORY)
    parser.add_argument("--audio-root", type=Path, default=DEFAULT_AUDIO)
    parser.add_argument("--report", type=Path, default=REPORT)
    parser.add_argument("--write-report", action="store_true")
    parser.add_argument("--check-report", action="store_true")
    args = parser.parse_args()
    report = verify(args.audio_root, args.inventory)
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.write_report:
        args.report.write_text(encoded)
    if args.check_report:
        assert args.report.read_text() == encoded, "Private audio evidence is stale"
    print(json.dumps({"verifiedClips": report["verifiedClips"], "uniqueExactTexts": report["uniqueExactTexts"], "listeningReviewed": False}, ensure_ascii=False))


if __name__ == "__main__":
    main()
