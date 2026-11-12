#!/usr/bin/env python3
"""Independently verify and signal-screen private Japanese Dinner Master 5 MP3s."""

import hashlib
import html
import json
import runpy
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DIR = Path(__file__).resolve().parent
SCOPE_PATH = DIR / "private-master-5-audio-scope.json"
AUDIO = Path("/Users/drive/lt-audio/japanese-travel-dinner/master-5")
MANIFEST_PATH = AUDIO / "manifest.json"
REPORT = AUDIO / "technical-review.json"
SHEET = AUDIO / "listening-review.html"
VOICES = {"female": "ja-JP-Chirp3-HD-Aoede", "male": "ja-JP-Chirp3-HD-Charon"}
decode = runpy.run_path(str(ROOT / "scripts/audit-japanese101-audio-signal.py"))["decode"]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return round(float(result.stdout.strip()), 3)


def flags(signal):
    issues = []
    if signal["peak"] < 0.02 or signal["rms"] < 0.004:
        issues.append("very-quiet")
    if signal["activeSeconds"] < 0.08:
        issues.append("little-active-signal")
    if signal["clippedFraction"] > 0.001:
        issues.append("possible-clipping")
    if signal["leadingSilenceSeconds"] > 1 or signal["trailingSilenceSeconds"] > 1:
        issues.append("long-edge-silence")
    return issues


def main():
    scope_bytes = SCOPE_PATH.read_bytes()
    scope = json.loads(scope_bytes)
    rebuilt = runpy.run_path(str(DIR / "build-private-master-5-audio-scope.py"))["build"]()
    if scope != rebuilt:
        raise ValueError("Audio scope differs from current Japanese Dinner source")
    manifest_bytes = MANIFEST_PATH.read_bytes()
    manifest = json.loads(manifest_bytes)
    if (manifest.get("courseId"), manifest.get("stageId"), manifest.get("pairKey"),
        manifest.get("locale"), manifest.get("scopeSHA256"), manifest.get("voices"),
        manifest.get("listeningReviewed"), manifest.get("registered")) != (
        "travel-dinner", "master-travel-dinner", "Japanese:English", "ja-JP",
        sha(scope_bytes), VOICES, False, False):
        raise ValueError("Manifest identity, scope, or review gate changed")
    if set(manifest["clips"]) != {row["textSHA256"] for row in scope["texts"]}:
        raise ValueError("Manifest text coverage differs from exact source scope")
    report_rows = []
    sheet_rows = []
    total_bytes = 0
    total_duration = 0
    for row in scope["texts"]:
        text, key = row["spokenText"], row["textSHA256"]
        entry = manifest["clips"][key]
        if entry["spokenText"] != text or entry["displayText"] != row["displayText"] or entry["placements"] != row["placements"]:
            raise ValueError("Clip text or source placements changed")
        if set(entry["voices"]) != set(VOICES):
            raise ValueError(f"Missing voice for {text}")
        for gender, voice in VOICES.items():
            clip = entry["voices"][gender]
            path = AUDIO / clip["name"]
            if (clip["voice"], clip["locale"], clip["spokenText"],
                clip["listeningReviewed"], clip["displayText"]) != (voice, "ja-JP", text, False, row["displayText"]):
                raise ValueError("Clip voice, locale, text, or listening gate changed")
            data = path.read_bytes()
            measured_duration = duration(path)
            if (len(data), sha(data), measured_duration) != (
                clip["bytes"], clip["sha256"], clip["durationSeconds"]):
                raise ValueError(f"Clip bytes, hash, or duration changed: {path.name}")
            signal = decode(path)
            issues = flags(signal)
            total_bytes += len(data)
            total_duration += measured_duration
            report_rows.append({"textSHA256": key, "voice": voice, "path": str(path),
                                "sha256": clip["sha256"], "signal": signal, "issues": issues})
            lessons = ", ".join(sorted({p["lessonId"] for p in row["placements"]}))
            sheet_rows.append(
                f'<section><h2 lang="ja">{html.escape(row["displayText"])}</h2>'
                f'<p>{html.escape(lessons)} · {html.escape(voice)}</p>'
                f'<audio controls preload="none" src="{html.escape(clip["name"], quote=True)}"></audio>'
                f'<p>Signal: {html.escape(", ".join(issues) if issues else "screen passed")}</p></section>')
    report = {"schema": 1, "courseId": "travel-dinner",
              "pairKey": "Japanese:English", "scopeSHA256": sha(scope_bytes),
              "manifestSHA256": sha(manifest_bytes), "quotaProject": manifest["quotaProject"],
              "texts": len(scope["texts"]), "clipsVerified": len(report_rows),
              "bytesVerified": total_bytes, "durationSeconds": round(total_duration, 3),
              "signalFlaggedClips": sum(bool(row["issues"]) for row in report_rows),
              "flags": [row for row in report_rows if row["issues"]],
              "listeningReviewed": False, "registered": False}
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    SHEET.write_text(
        '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
        'content="width=device-width,initial-scale=1"><title>Japanese Dinner Master 5 audio review</title>'
        '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
        'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:16px 0}'
        'audio{width:100%}</style><h1>Japanese Dinner Master 5 · private listening review</h1>'
        '<p>All clips are unreviewed and unregistered. Signal screening does not approve '
        'pronunciation or learner playback.</p>' + "".join(sheet_rows) + "</html>\n")
    print(json.dumps({key: report[key] for key in (
        "texts", "clipsVerified", "bytesVerified", "durationSeconds", "signalFlaggedClips")}))


if __name__ == "__main__":
    main()
