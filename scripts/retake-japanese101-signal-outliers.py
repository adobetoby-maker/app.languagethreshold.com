#!/usr/bin/env python3
"""Make private, source-pinned retakes of Japanese 101 signal outliers."""

import argparse
import base64
import hashlib
import html
import json
import os
import subprocess
import urllib.request
from pathlib import Path
from runpy import run_path

HERE = Path(__file__).resolve().parent
GEN = run_path(str(HERE / "generate-japanese-hd-audio.py"))
AUDIT = run_path(str(HERE / "audit-japanese101-audio-signal.py"))
ROOT = Path("/Users/drive/lt-audio/japanese-101")


def manifest_set_sha(root):
    digest = hashlib.sha256()
    for stage, count, first in AUDIT["SCOPES"]:
        for number in range(1, count + 1):
            folder = root / (first if number == 1 and first else f"{stage}-{number}")
            path = folder / "manifest.json"
            digest.update(str(path.relative_to(root)).encode() + b"\0" + path.read_bytes())
    return digest.hexdigest()


def selected_flags(root, report, limit):
    if report.get("course") != "Japanese 101" or report.get("manifestSetSHA256") != manifest_set_sha(root):
        raise ValueError("Signal report is stale or belongs to another course")
    inventory, source_sha = GEN["collect"]()
    selected = []
    for flag in sorted(report["flags"], key=lambda item: item["signal"]["peak"]):
        path = Path(flag["path"]).resolve()
        if not path.is_relative_to(root) or path.parent.parent != root:
            raise ValueError("Flagged MP3 is outside the Japanese 101 lesson batches")
        folder = path.parent
        manifest = json.loads((folder / "manifest.json").read_text())
        scope = manifest["scope"]
        if manifest.get("sourceSHA256") != source_sha or manifest.get("listeningReviewed") is not False:
            raise ValueError("Source or listening state changed")
        if GEN["normalized"](flag["text"]) not in GEN["lesson_keys"](scope["module"], scope["lesson"]):
            raise ValueError("Flagged text is absent from the source lesson")
        matches = [(text, gender, clip) for text, voices in manifest["clips"].items()
                   for gender, clip in voices.items() if clip["name"] == path.name]
        if len(matches) != 1:
            raise ValueError("Flagged MP3 does not identify one manifest clip")
        text, gender, clip = matches[0]
        if (text != flag["text"] or clip["voice"] != flag["voice"] or
                clip["spokenText"] != inventory[text] or clip["listeningReviewed"] is not False or
                hashlib.sha256(path.read_bytes()).hexdigest() != clip["sha256"]):
            raise ValueError("Flagged clip, source text, or original hash changed")
        selected.append((flag, gender, clip))
        if len(selected) == limit:
            break
    return selected


def review_sheet(output, candidates):
    sections = []
    for item in candidates:
        original = os.path.relpath(item["sourcePath"], output)
        sections.append(
            f'<section><h2 lang="ja">{html.escape(item["text"])}</h2>'
            f'<p>{html.escape(item["voice"])} · original peak {item["originalPeak"]}; '
            f'candidate peak {item["signal"]["peak"]}</p>'
            f'<h3>Original</h3><audio controls preload="none" src="{html.escape(original, quote=True)}"></audio>'
            f'<h3>Retake</h3><audio controls preload="none" src="{html.escape(item["name"], quote=True)}"></audio>'
            '</section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>Japanese 101 retake comparison</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:20px 0}'
            'audio{width:100%}</style><h1>Japanese 101 · Retake comparison</h1>'
            '<p>Private listening comparison. Neither version is approved or installed by this page.</p>'
            + ''.join(sections) + '</html>\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--signal-report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--source-path", action="append", default=[],
                        help="Retake only this exact lesson-relative flagged MP3; repeatable")
    parser.add_argument("--project")
    parser.add_argument("--generate", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        raise SystemExit("Limit must be 1–20 clips")
    if args.generate and not args.project:
        raise SystemExit("--project is required for paid synthesis")
    root = ROOT.resolve()
    output = args.output.expanduser().resolve()
    if not output.is_relative_to(root) or output == root or output.exists() and any(output.glob("*/manifest.json")):
        raise ValueError("Retakes need their own private output folder")
    report = json.loads(args.signal_report.read_text())
    selected = selected_flags(root, report, 20)
    if args.source_path:
        requested = set(args.source_path)
        selected = [item for item in selected
                    if str(Path(item[0]["path"]).relative_to(root)) in requested]
        if {str(Path(item[0]["path"]).relative_to(root)) for item in selected} != requested:
            raise ValueError("Requested source path is not a current flagged MP3")
    selected = selected[:args.limit]
    print(json.dumps({"plannedClips": len(selected),
                      "plannedCharacters": sum(len(clip["spokenText"]) for _, _, clip in selected),
                      "project": args.project if args.generate else None, "paidSynthesis": args.generate},
                     ensure_ascii=False), flush=True)
    if not args.generate:
        return
    os.umask(0o077)
    output.mkdir(parents=True, exist_ok=True)
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        "schema": 1, "pairKey": "Japanese:English", "locale": "ja-JP",
        "sourceManifestSetSHA256": report["manifestSetSHA256"],
        "listeningReviewed": False, "registered": False, "candidates": []}
    if (manifest["sourceManifestSetSHA256"] != report["manifestSetSHA256"] or
            manifest["listeningReviewed"] is not False or manifest["registered"] is not False):
        raise ValueError("Retake manifest state changed")
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                           capture_output=True, text=True, check=True).stdout.strip()
    for flag, gender, original in selected:
        identity = hashlib.sha256((flag["path"] + original["sha256"]).encode()).hexdigest()[:20]
        name = f"ja-101-retake-{identity}-{gender}.mp3"
        if any(item["name"] == name for item in manifest["candidates"]):
            continue
        voice = GEN["VOICES"][gender]
        payload = {"input": {"text": original["spokenText"]},
                   "voice": {"languageCode": "ja-JP", "name": voice},
                   "audioConfig": {"audioEncoding": "MP3"}}
        request = urllib.request.Request("https://texttospeech.googleapis.com/v1/text:synthesize",
            data=json.dumps(payload).encode(), headers={"Authorization": "Bearer " + token,
            "Content-Type": "application/json", "x-goog-user-project": args.project})
        data = base64.b64decode(json.load(urllib.request.urlopen(request, timeout=75))["audioContent"])
        if len(data) <= 500:
            raise ValueError("Empty retake MP3")
        temporary = output / (name + ".part")
        temporary.write_bytes(data)
        seconds = GEN["duration_seconds"](temporary)
        temporary.replace(output / name)
        candidate = {"name": name, "sourcePath": flag["path"], "text": flag["text"],
                     "spokenText": original["spokenText"], "voice": voice, "originalSHA256": original["sha256"],
                     "originalPeak": flag["signal"]["peak"], "sha256": hashlib.sha256(data).hexdigest(),
                     "bytes": len(data), "durationSeconds": seconds,
                     "signal": AUDIT["decode"](output / name), "listeningReviewed": False}
        manifest["candidates"].append(candidate)
        part = output / "manifest.json.part"
        part.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        part.replace(manifest_path)
    for item in manifest["candidates"]:
        path = output / item["name"]
        if (hashlib.sha256(path.read_bytes()).hexdigest() != item["sha256"] or
                GEN["duration_seconds"](path) != item["durationSeconds"]):
            raise ValueError("Retake candidate bytes or duration changed")
    (output / "review.html").write_text(review_sheet(output, manifest["candidates"]))
    print(json.dumps({"candidateCount": len(manifest["candidates"]), "manifest": str(manifest_path)}))


if __name__ == "__main__":
    main()
