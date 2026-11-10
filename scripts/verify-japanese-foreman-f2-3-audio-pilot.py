#!/usr/bin/env python3
"""Verify the private Japanese Foreman F2–3 clips and build a listening sheet."""
import argparse
import hashlib
import html
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "docs/japanese-program/foreman-private-audio-pilot-foundation-2-3.json"
DEFAULT_AUDIO = Path("/Users/drive/lt-audio/japanese-foreman/foundation-2-3")
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


def verify(audio_dir, inventory_path=INVENTORY):
    inventory = json.loads(inventory_path.read_text())
    manifest = json.loads((audio_dir / "manifest.json").read_text())
    assert inventory["pairKey"] == manifest["pairKey"] == "Japanese:English"
    assert inventory["locale"] == manifest["locale"] == "ja-JP"
    assert inventory["exactTextSha256"] == manifest["exactTextSha256"]
    assert inventory["reviewed"] is False and inventory["registered"] is False
    assert manifest["textReviewed"] is False
    accepted = manifest["listeningReviewed"]
    assert isinstance(accepted, bool)
    if accepted:
        review = manifest.get("listeningReview") or {}
        assert review.get("reviewer") == "owner"
        assert review.get("decision") == "accepted-all-pilot-clips"
    assert manifest["voices"] == VOICES
    assert len(inventory["texts"]) == 5 and len(manifest["clips"]) == 5
    lessons = inventory.get("draftLessonKeys", [inventory.get("draftLessonKey")])
    rows = []
    for entry in inventory["texts"]:
        text = entry["text"]
        key = entry["sha256"]
        assert sha(text.encode()) == key
        assert any(o["draftLessonKey"] in lessons for o in entry["occurrences"])
        for gender, voice in VOICES.items():
            clip = manifest["clips"][key][gender]
            file = audio_dir / clip["name"]
            data = file.read_bytes()
            assert clip["text"] == text and clip["voice"] == voice and clip["locale"] == "ja-JP"
            assert clip["sha256"] == sha(data) and clip["bytes"] == len(data) and len(data) > 500
            assert clip["durationSeconds"] == duration(file) and clip["durationSeconds"] > 0.1
            assert clip["listeningReviewed"] is accepted
            rows.append((text, gender, clip["name"]))
    assert len(rows) == 10
    return rows


def sheet(rows, label="Foundation 2–3"):
    title_label = "F2–3" if label == "Foundation 2–3" else label
    cells = []
    for text, gender, name in rows:
        cells.append("<tr><td>" + html.escape(text) + "</td><td>" + gender +
                     "</td><td><audio controls src=\"" + html.escape(name, quote=True) +
                     "\"></audio></td><td><input type=\"checkbox\"> accepted</td>" +
                     "<td><input placeholder=\"Retake or comment\"></td></tr>")
    return ("<!doctype html><html lang=\"en\"><meta charset=\"utf-8\">"
            "<title>Japanese Foreman " + html.escape(title_label) + " private listening review</title>"
            "<style>body{font:16px system-ui;max-width:1100px;margin:2rem auto}"
            "table{border-collapse:collapse;width:100%}td,th{padding:.5rem;border:1px solid #bbb}"
            "audio{width:210px}</style><h1>Japanese Foreman " + html.escape(label) + "</h1>"
            "<p>Private draft audio. Compare each recording with the exact Japanese text; note pronunciation, "
            "prosody, clipping, and retakes. This sheet does not update review flags or publish audio.</p>"
            "<table><tr><th>Exact text</th><th>Voice</th><th>Recording</th><th>Listen</th>"
            "<th>Notes</th></tr>" + "".join(cells) + "</table></html>\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-dir", type=Path, default=DEFAULT_AUDIO)
    parser.add_argument("--inventory", type=Path, default=INVENTORY)
    parser.add_argument("--label", default="Foundation 2–3")
    parser.add_argument("--sheet-name", default=SHEET_NAME)
    parser.add_argument("--verify-only", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    rows = verify(args.audio_dir, args.inventory)
    if args.verify_only:
        print(f"{len(rows)} Japanese {args.label} MP3s verified; private listening state retained")
        raise SystemExit(0)
    expected = sheet(rows, args.label)
    path = args.audio_dir / args.sheet_name
    if args.check:
        assert path.read_text() == expected, "listening sheet is stale"
    else:
        path.write_text(expected)
    print(f"10 Japanese {args.label} MP3s verified; private listening state retained")
