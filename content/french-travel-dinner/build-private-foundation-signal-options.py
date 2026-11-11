#!/usr/bin/env python3
"""Make private level comparisons for five quiet French Dinner Foundation clips."""

import argparse
import hashlib
import html
import json
import math
import os
import runpy
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DIR = Path(__file__).resolve().parent
AUDIO_ROOT = Path("/Users/drive/lt-audio/french-travel-dinner")
SOURCE = AUDIO_ROOT / "foundation"
OUTPUT = AUDIO_ROOT / "foundation-signal-options-2026-11-11"
TARGET_PEAK = 0.4
decode = runpy.run_path(str(ROOT / "scripts/audit-japanese101-audio-signal.py"))["decode"]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def issues(signal):
    flags = []
    if signal["peak"] < 0.02 or signal["rms"] < 0.004:
        flags.append("very-quiet")
    if signal["activeSeconds"] < 0.08:
        flags.append("little-active-signal")
    if signal["clippedFraction"] > 0.001:
        flags.append("possible-clipping")
    if signal["leadingSilenceSeconds"] > 1 or signal["trailingSilenceSeconds"] > 1:
        flags.append("long-edge-silence")
    return flags


def build(write):
    scope_bytes = (DIR / "private-foundation-audio-scope.json").read_bytes()
    scope = json.loads(scope_bytes)
    if scope != runpy.run_path(str(DIR / "build-private-foundation-audio-scope.py"))["build"]():
        raise ValueError("Audio scope changed")
    manifest_bytes = (SOURCE / "manifest.json").read_bytes()
    manifest = json.loads(manifest_bytes)
    report_bytes = (SOURCE / "technical-review.json").read_bytes()
    report = json.loads(report_bytes)
    if (manifest["scopeSHA256"], manifest["pairKey"], manifest["locale"],
        manifest["listeningReviewed"], manifest["registered"],
        report["manifestSHA256"], report["scopeSHA256"],
        report["listeningReviewed"], report["registered"]) != (
        sha(scope_bytes), "French:English", "fr-FR", False, False,
        sha(manifest_bytes), sha(scope_bytes), False, False):
        raise ValueError("Audio source, identity, or review gate changed")
    if len(report["flags"]) != report["signalFlaggedClips"] or len(report["flags"]) != 5:
        raise ValueError("Flagged scope changed; inspect before making comparisons")
    by_text = {row["textSHA256"]: row for row in scope["texts"]}
    rows = []
    if write:
        OUTPUT.mkdir(parents=True, exist_ok=True)
    for flag in report["flags"]:
        key, voice = flag["textSHA256"], flag["voice"]
        scope_row = by_text[key]
        gender = next(gender for gender, name in manifest["voices"].items() if name == voice)
        clip = manifest["clips"][key]["voices"][gender]
        original = SOURCE / clip["name"]
        if (sha(original.read_bytes()), clip["voice"], clip["spokenText"],
            clip["listeningReviewed"]) != (clip["sha256"], voice,
                                           scope_row["spokenText"], False):
            raise ValueError("Original clip changed")
        signal = decode(original)
        if signal != flag["signal"] or issues(signal) != flag["issues"] or signal["peak"] <= 0:
            raise ValueError("Original decoded signal changed")
        gain_db = round(20 * math.log10(TARGET_PEAK / signal["peak"]), 3)
        name = f"fr-dinner-level-{key[:20]}-{gender}.mp3"
        candidate = OUTPUT / name
        if write and not candidate.exists():
            part = OUTPUT / (name + ".part")
            subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y",
                            "-i", str(original), "-af", f"volume={gain_db:.3f}dB",
                            "-codec:a", "libmp3lame", "-q:a", "2", "-f", "mp3", str(part)],
                           check=True)
            part.replace(candidate)
        candidate_bytes = candidate.read_bytes()
        candidate_signal = decode(candidate)
        if not 0.1 < candidate_signal["peak"] < 0.9:
            raise ValueError("Adjusted candidate peak outside inspection range")
        rows.append({
            "spokenText": scope_row["spokenText"], "textSHA256": key,
            "voice": voice, "originalPath": str(original), "originalSHA256": clip["sha256"],
            "originalSignal": signal, "name": name,
            "gainDb": gain_db, "sha256": sha(candidate_bytes), "bytes": len(candidate_bytes),
            "signal": candidate_signal, "signalIssues": issues(candidate_signal),
            "listeningReviewed": False, "replacementApplied": False,
        })
    return {
        "schema": 1, "pairKey": "French:English", "locale": "fr-FR",
        "sourceScopeSHA256": sha(scope_bytes), "sourceManifestSHA256": sha(manifest_bytes),
        "sourceTechnicalReviewSHA256": sha(report_bytes),
        "targetPeak": TARGET_PEAK, "candidates": rows,
        "listeningReviewed": False, "registered": False,
    }


def review_page(rows):
    sections = []
    for row in rows:
        original = os.path.relpath(row["originalPath"], OUTPUT)
        sections.append(
            f'<section><h2 lang="fr">{html.escape(row["spokenText"])}</h2>'
            f'<p>{html.escape(row["voice"])} · original peak {row["originalSignal"]["peak"]}'
            f' · candidate peak {row["signal"]["peak"]}</p>'
            f'<h3>Original</h3><audio controls preload="none" src="{html.escape(original, quote=True)}"></audio>'
            f'<h3>Level comparison, not selected</h3><audio controls preload="none" '
            f'src="{html.escape(row["name"], quote=True)}"></audio>'
            f'<p>Adjusted signal: {html.escape(", ".join(row["signalIssues"]) or "screen passed")}</p></section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>French Dinner signal comparisons</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:16px 0}'
            'audio{width:100%}</style><h1>French Dinner · quiet-clip comparisons</h1>'
            '<p>Private unreviewed options. Gain may amplify noise; a numeric pass does not approve '
            'pronunciation or learner playback.</p>' + "".join(sections) + "</html>\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    if not OUTPUT.is_relative_to(AUDIO_ROOT) or OUTPUT == SOURCE:
        raise ValueError("Candidates must stay separate from original audio")
    result = build(args.write)
    encoded = json.dumps(result, ensure_ascii=False, indent=2) + "\n"
    page = review_page(result["candidates"])
    if args.write:
        (OUTPUT / "manifest.json").write_text(encoded)
        (OUTPUT / "review.html").write_text(page)
    elif (OUTPUT / "manifest.json").read_text() != encoded or (OUTPUT / "review.html").read_text() != page:
        raise SystemExit("Private comparison manifest or sheet is stale")
    print(json.dumps({"candidates": len(result["candidates"]),
                      "signalPassing": sum(not row["signalIssues"] for row in result["candidates"]),
                      "listeningReviewed": False}))


if __name__ == "__main__":
    main()
