#!/usr/bin/env python3
"""Build private level-adjusted candidates for quiet French 101 retakes."""

import argparse
import hashlib
import html
import json
import math
import os
import subprocess
from pathlib import Path
from runpy import run_path

SIGNAL = run_path(str(Path(__file__).with_name("audit-french101-audio-signal.py")))
decode = SIGNAL["decode"]
PRIVATE_ROOT = Path("/Users/drive/lt-audio/french-101").resolve()
TARGET_PEAK = 0.4


def sheet(output, rows):
    blocks = []
    for row in rows:
        original = os.path.relpath(row["originalPath"], output)
        retake = os.path.relpath(row["retakePath"], output)
        blocks.append(
            f'<section><h2 lang="fr">{html.escape(row["displayText"])}</h2>'
            f'<p>{html.escape(row["voice"])} · spoken <span lang="fr">{html.escape(row["spokenText"])}</span></p>'
            f'<h3>Original</h3><audio controls preload="none" src="{html.escape(original, quote=True)}"></audio>'
            f'<h3>Retake</h3><audio controls preload="none" src="{html.escape(retake, quote=True)}"></audio>'
            f'<h3>Level candidate</h3><audio controls preload="none" src="{html.escape(row["name"], quote=True)}"></audio>'
            f'<p>Peak {row["sourceSignal"]["peak"]} → {row["signal"]["peak"]}. '
            'Gain changes level only; listen for noise or artifacts before choosing.</p></section>'
        )
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>French 101 level comparison</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:20px 0}'
            'audio{width:100%}</style><h1>French 101 · Quiet-clip level comparison</h1>'
            '<p>Private candidates only. The original and retake manifests remain unchanged.</p>'
            + ''.join(blocks) + '</html>\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--retake-manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    output = args.output.expanduser().resolve()
    if not output.is_relative_to(PRIVATE_ROOT) or output == PRIVATE_ROOT:
        raise ValueError("Level candidates must stay in a separate private folder")
    retake_manifest = json.loads(args.retake_manifest.read_text())
    if (retake_manifest["pairKey"], retake_manifest["locale"], retake_manifest["listeningReviewed"],
            retake_manifest["registered"]) != ("French:English", "fr-FR", False, False):
        raise ValueError("Wrong retake pair or review state")
    output.mkdir(parents=True, exist_ok=True)
    rows = []
    for retake in retake_manifest["candidates"]:
        if retake["signal"]["peak"] >= 0.05:
            continue
        original_path = Path(retake["sourcePath"])
        retake_path = args.retake_manifest.parent / retake["name"]
        if (not original_path.is_relative_to(PRIVATE_ROOT) or
                hashlib.sha256(original_path.read_bytes()).hexdigest() != retake["originalSHA256"] or
                hashlib.sha256(retake_path.read_bytes()).hexdigest() != retake["sha256"]):
            raise ValueError("Original or retake bytes changed")
        original_signal = decode(original_path)
        retake_signal = decode(retake_path)
        source_path, source_signal = ((retake_path, retake_signal) if retake_signal["peak"] > original_signal["peak"]
                                      else (original_path, original_signal))
        if source_signal["peak"] <= 0:
            raise ValueError("Cannot level a silent file")
        gain_db = 20 * math.log10(TARGET_PEAK / source_signal["peak"])
        name = f"fr-101-level-{hashlib.sha256((str(source_path) + retake['sha256']).encode()).hexdigest()[:20]}.mp3"
        destination = output / name
        if not destination.exists():
            part = output / (name + ".part")
            subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-y", "-i", str(source_path),
                            "-af", f"volume={gain_db:.3f}dB", "-codec:a", "libmp3lame", "-q:a", "2",
                            "-f", "mp3", str(part)],
                           check=True)
            part.replace(destination)
        result = decode(destination)
        if not 0.1 < result["peak"] < 0.9:
            raise ValueError("Level candidate has invalid peak")
        rows.append({"name": name, "originalPath": str(original_path), "retakePath": str(retake_path),
                     "sourcePath": str(source_path), "displayText": retake["displayText"],
                     "spokenText": retake["spokenText"], "voice": retake["voice"], "gainDb": round(gain_db, 3),
                     "sourceSignal": source_signal, "signal": result,
                     "sha256": hashlib.sha256(destination.read_bytes()).hexdigest(),
                     "bytes": destination.stat().st_size, "listeningReviewed": False})
    manifest = {"schema": 1, "pairKey": "French:English", "locale": "fr-FR", "registered": False,
                "listeningReviewed": False, "sourceRetakeManifestSHA256": hashlib.sha256(args.retake_manifest.read_bytes()).hexdigest(),
                "targetPeak": TARGET_PEAK, "candidates": rows}
    (output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    (output / "review.html").write_text(sheet(output, rows))
    print(json.dumps({"candidateCount": len(rows), "review": str(output / "review.html")}))


if __name__ == "__main__":
    main()
