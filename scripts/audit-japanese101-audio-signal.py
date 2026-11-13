#!/usr/bin/env python3
"""Screen private Japanese 101 MP3s for signal defects; never mark listening reviewed."""

import argparse
import array
import hashlib
import html
import json
import math
import subprocess
from pathlib import Path

SCOPES = (("foundation", 10, "foundation-1-complete"), ("core", 30, None), ("master", 20, None))
SAMPLE_RATE = 16000
SILENCE_THRESHOLD = 0.006


def analyze_pcm(data):
    samples = array.array("h")
    samples.frombytes(data)
    if not samples:
        return {"durationSeconds": 0, "peak": 0, "rms": 0, "activeSeconds": 0,
                "leadingSilenceSeconds": 0, "trailingSilenceSeconds": 0, "clippedFraction": 0}
    values = [abs(value) / 32768 for value in samples]
    active = [index for index, value in enumerate(values) if value >= SILENCE_THRESHOLD]
    return {
        "durationSeconds": round(len(samples) / SAMPLE_RATE, 3),
        "peak": round(max(values), 5),
        "rms": round(math.sqrt(sum(value * value for value in values) / len(values)), 5),
        "activeSeconds": round(len(active) / SAMPLE_RATE, 3),
        "leadingSilenceSeconds": round((active[0] if active else len(samples)) / SAMPLE_RATE, 3),
        "trailingSilenceSeconds": round((len(samples) - active[-1] - 1 if active else len(samples)) / SAMPLE_RATE, 3),
        "clippedFraction": round(sum(value >= 0.999 for value in values) / len(values), 6),
    }


def decode(path):
    result = subprocess.run(
        ["ffmpeg", "-nostdin", "-loglevel", "error", "-i", str(path), "-ac", "1", "-ar", str(SAMPLE_RATE),
         "-f", "s16le", "-acodec", "pcm_s16le", "-"], capture_output=True, check=True)
    return analyze_pcm(result.stdout)


def audit(root):
    seen = {}
    occurrences = 0
    flags = []
    manifest_digest = hashlib.sha256()
    for prefix, count, first_folder in SCOPES:
        for number in range(1, count + 1):
            folder = root / (first_folder if number == 1 and first_folder else f"{prefix}-{number}")
            manifest_path = folder / "manifest.json"
            manifest_bytes = manifest_path.read_bytes()
            manifest_digest.update(str(manifest_path.relative_to(root)).encode() + b"\0" + manifest_bytes)
            manifest = json.loads(manifest_bytes)
            for text, voices in manifest["clips"].items():
                for gender, clip in voices.items():
                    occurrences += 1
                    path = folder / clip["name"]
                    digest = clip["sha256"]
                    if digest not in seen:
                        result = decode(path)
                        issues = []
                        if result["peak"] < 0.02 or result["rms"] < 0.004:
                            issues.append("very-quiet")
                        if result["activeSeconds"] < 0.08:
                            issues.append("little-active-signal")
                        if result["clippedFraction"] > 0.001:
                            issues.append("possible-clipping")
                        if result["leadingSilenceSeconds"] > 1 or result["trailingSilenceSeconds"] > 1:
                            issues.append("long-edge-silence")
                        seen[digest] = result
                        if issues:
                            flags.append({"path": str(path), "voice": clip["voice"], "text": text,
                                          "issues": issues, "signal": result})
    return {"course": "Japanese 101", "scope": "private-audio-signal-screen",
            "manifestSetSHA256": manifest_digest.hexdigest(), "occurrences": occurrences,
            "uniqueFilesDecoded": len(seen), "flaggedFiles": len(flags), "flags": flags,
            "listeningReviewed": False, "registered": False}


def review_sheet(report, root):
    rows = []
    for flag in report["flags"]:
        path = Path(flag["path"])
        relative = path.relative_to(root).as_posix()
        signal = flag["signal"]
        rows.append(
            f'<section><h2 lang="ja">{html.escape(flag["text"])}</h2>'
            f'<p>{html.escape(flag["voice"])} · {html.escape(relative)}</p>'
            f'<audio controls preload="none" src="{html.escape(relative, quote=True)}"></audio>'
            f'<p>Flag: {html.escape(", ".join(flag["issues"]))}. '
            f'Peak {signal["peak"]}; RMS {signal["rms"]}; active {signal["activeSeconds"]} s.</p></section>'
        )
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>Japanese 101 signal review</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:20px 0}'
            'audio{width:100%}</style><h1>Japanese 101 · Signal review</h1>'
            '<p>Automated signal flags are listening priorities, not pronunciation judgments or approvals. '
            'The course recordings remain private and unregistered.</p>' + ''.join(rows) + '</html>\n')


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--review-sheet", type=Path)
    args = parser.parse_args()
    report = audit(args.audio_root)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    if args.review_sheet:
        args.review_sheet.parent.mkdir(parents=True, exist_ok=True)
        args.review_sheet.write_text(review_sheet(report, args.audio_root), encoding="utf-8")
    print(json.dumps({key: report[key] for key in ("occurrences", "uniqueFilesDecoded", "flaggedFiles")},
                     ensure_ascii=False))
