#!/usr/bin/env python3
"""Screen private Japanese Roofing clips for signal defects; never approve listening."""

import argparse
import array
import hashlib
import html
import json
import math
import subprocess
from pathlib import Path

DEFAULT_ROOT = Path("/Users/drive/lt-audio/japanese-roofing/full-course-2026-11-09")
INVENTORY = Path(__file__).resolve().parents[1] / "content/japanese-roofing/audio-inventory.json"
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}
SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 0.006


def signal(path):
    decoded = subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(path), "-ac", "1",
         "-ar", str(SAMPLE_RATE), "-f", "s16le", "-acodec", "pcm_s16le", "-"],
        capture_output=True, check=True,
    ).stdout
    samples = array.array("h")
    samples.frombytes(decoded)
    if not samples:
        raise ValueError(f"No decoded samples: {path}")
    absolute = [abs(sample) / 32768 for sample in samples]
    active = [index for index, value in enumerate(absolute) if value >= SILENCE_THRESHOLD]
    return {
        "durationSeconds": round(len(samples) / SAMPLE_RATE, 3),
        "peak": round(max(absolute), 5),
        "rms": round(math.sqrt(sum(value * value for value in absolute) / len(absolute)), 5),
        "activeSeconds": round(len(active) / SAMPLE_RATE, 3),
        "leadingSilenceSeconds": round((active[0] if active else len(samples)) / SAMPLE_RATE, 3),
        "trailingSilenceSeconds": round((len(samples) - active[-1] - 1 if active else len(samples)) / SAMPLE_RATE, 3),
        "clippedFraction": round(sum(value >= 0.999 for value in absolute) / len(absolute), 6),
    }


def review_sheet(report):
    rows = []
    for flag in report["flags"]:
        rows.append(
            f"<section><h2 lang='ja'>{html.escape(flag['text'])}</h2>"
            f"<p>{html.escape(flag['gender'])} · {html.escape(', '.join(flag['issues']))}</p>"
            f"<audio controls preload='none' src='{html.escape(flag['file'], quote=True)}'></audio>"
            f"<p>Peak {flag['signal']['peak']}; RMS {flag['signal']['rms']}; "
            f"leading silence {flag['signal']['leadingSilenceSeconds']} s.</p></section>"
        )
    return ("<!doctype html><html lang='en'><meta charset='utf-8'>"
            "<meta name='viewport' content='width=device-width,initial-scale=1'>"
            "<title>Japanese Roofing signal review</title>"
            "<style>body{font:16px system-ui,sans-serif;max-width:850px;margin:auto;padding:20px}"
            "section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:18px 0}"
            "audio{width:100%}</style><h1>Japanese Roofing · signal review</h1>"
            "<p>Automated flags identify listening priorities, not pronunciation judgments or approvals. "
            "The full-course recordings remain private and unregistered.</p>"
            + "".join(rows) + "</html>\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", type=Path, default=DEFAULT_ROOT)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()
    manifest_path = args.audio_root / "manifest.json"
    manifest_bytes = manifest_path.read_bytes()
    manifest = json.loads(manifest_bytes)
    inventory_bytes = INVENTORY.read_bytes()
    inventory = json.loads(inventory_bytes)
    if manifest["scope"] != "all" or manifest["listeningReviewed"] is not False or manifest["registered"] is not False:
        raise ValueError("Expected a private, unreviewed full-course manifest")
    if manifest["sourceInventorySHA256"] != hashlib.sha256(inventory_bytes).hexdigest():
        raise ValueError("Source inventory changed")
    if manifest["pairKey"] != "Japanese:English" or manifest["locale"] != "ja-JP" or manifest["voices"] != VOICES:
        raise ValueError("Language or voice identity changed")
    if set(manifest["clips"]) != set(inventory["strings"]):
        raise ValueError("Full-course text coverage is incomplete")
    flags = []
    decoded = 0
    for text, variants in manifest["clips"].items():
        if set(variants) != set(VOICES):
            raise ValueError(f"Missing voice for {text}")
        for gender, record in variants.items():
            if (record["voice"] != VOICES[gender] or record["locale"] != "ja-JP"
                    or record["spokenText"] != inventory["strings"][text]["spokenText"]
                    or record["listeningReviewed"] is not False):
                raise ValueError(f"Clip identity or review gate changed: {text} · {gender}")
            path = args.audio_root / record["name"]
            data = path.read_bytes()
            if len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]:
                raise ValueError(f"Changed clip: {path}")
            measurement = signal(path)
            decoded += 1
            issues = []
            if measurement["peak"] < 0.02 or measurement["rms"] < 0.004:
                issues.append("very-quiet")
            if measurement["activeSeconds"] < 0.08:
                issues.append("little-active-signal")
            if measurement["clippedFraction"] > 0.001:
                issues.append("possible-clipping")
            if measurement["leadingSilenceSeconds"] > 1 or measurement["trailingSilenceSeconds"] > 1:
                issues.append("long-edge-silence")
            if issues:
                flags.append({"text": text, "gender": gender, "file": record["name"],
                              "issues": issues, "signal": measurement})
    report = {"course": "Japanese Roofing", "manifestSHA256": hashlib.sha256(manifest_bytes).hexdigest(),
              "decodedFiles": decoded, "flaggedFiles": len(flags), "flags": flags,
              "listeningReviewed": False, "registered": False}
    output = args.report or args.audio_root / "signal-screen.json"
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    review = args.audio_root / "signal-review.html"
    review.write_text(review_sheet(report))
    print(json.dumps({"decodedFiles": decoded, "flaggedFiles": len(flags), "report": str(output),
                      "reviewSheet": str(review)}))


if __name__ == "__main__":
    main()
