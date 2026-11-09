#!/usr/bin/env python3
"""Verify the private Japanese Breakfast F2–3 clips and build a listening sheet."""
import argparse
import hashlib
import html
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "content/japanese-travel-breakfast/private-audio-pilot-foundation-2-3.json"
DEFAULT_AUDIO = Path("/Users/drive/lt-audio/japanese-travel-breakfast/foundation-2-3")
SHEET_NAME = "listening-review-2026-11-08.html"
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    output = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return round(float(output), 3)


def verify(audio_dir):
    inventory = json.loads(INVENTORY.read_text())
    manifest = json.loads((audio_dir / "manifest.json").read_text())
    assert inventory["pairKey"] == manifest["pairKey"] == "Japanese:English"
    assert inventory["locale"] == manifest["locale"] == "ja-JP"
    assert inventory["exactTextSha256"] == manifest["exactTextSha256"]
    assert inventory["reviewed"] is False and inventory["registered"] is False
    assert manifest["textReviewed"] is False and manifest["listeningReviewed"] is False
    assert manifest["voices"] == VOICES
    assert len(inventory["texts"]) == 5 and len(manifest["clips"]) == 5
    rows = []
    for entry in inventory["texts"]:
        text = entry["text"]
        key = entry["sha256"]
        assert sha(text.encode()) == key
        assert any(o["lessonId"] in ("foundation-travel-breakfast:2:ja-en",
                                      "foundation-travel-breakfast:3:ja-en") for o in entry["occurrences"])
        for gender, voice in VOICES.items():
            clip = manifest["clips"][key][gender]
            file = audio_dir / clip["name"]
            data = file.read_bytes()
            assert clip["text"] == text and clip["voice"] == voice and clip["locale"] == "ja-JP"
            assert clip["sha256"] == sha(data) and clip["bytes"] == len(data) and len(data) > 500
            assert clip["durationSeconds"] == duration(file) and clip["durationSeconds"] > 0.1
            assert clip["listeningReviewed"] is False
            rows.append((text, gender, clip["name"]))
    assert len(rows) == 10
    return rows


def sheet(rows):
    cells = []
    for text, gender, name in rows:
        cells.append("<tr><td>" + html.escape(text) + "</td><td>" + gender +
                     "</td><td><audio controls src=\"" + html.escape(name, quote=True) +
                     "\"></audio></td><td><input type=\"checkbox\"> accepted</td>" +
                     "<td><input placeholder=\"Retake or comment\"></td></tr>")
    return ("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\">"
            "<title>Japanese Breakfast F2–3 private listening review</title>"
            "<style>body{font:16px system-ui;max-width:1100px;margin:2rem auto}"
            "table{border-collapse:collapse;width:100%}td,th{padding:.5rem;border:1px solid #bbb}"
            "audio{width:210px}</style><h1>Japanese Breakfast Foundation 2–3</h1>"
            "<p>Private draft audio. Compare each recording with the exact Japanese text; note pronunciation, "
            "prosody, clipping, and retakes. This sheet does not update review flags or publish audio.</p>"
            "<table><tr><th>Exact text</th><th>Voice</th><th>Recording</th><th>Listen</th>"
            "<th>Notes</th></tr>" + "".join(cells) + "</table></html>\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    expected = sheet(verify(args.audio_dir))
    path = args.audio_dir / SHEET_NAME
    if args.check:
        assert path.read_text() == expected, "listening sheet is stale"
    else:
        path.write_text(expected)
    print("10 Japanese F2–3 MP3s verified; listening review remains open")
