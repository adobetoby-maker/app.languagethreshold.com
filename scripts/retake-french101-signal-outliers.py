#!/usr/bin/env python3
"""Create bounded private retake candidates for French 101 signal outliers."""

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

GEN = run_path(str(Path(__file__).with_name("generate-french101-hd-audio.py")))
SIGNAL = run_path(str(Path(__file__).with_name("audit-french101-audio-signal.py")))
PRIVATE_ROOT = Path("/Users/drive/lt-audio/french-101")
VOICES = GEN["VOICES"]
lesson_source = GEN["lesson_source"]
duration = GEN["duration"]
decode = SIGNAL["decode"]


def manifest_set_sha(root):
    digest = hashlib.sha256()
    for stage, count, first in SIGNAL["SCOPES"]:
        for number in range(1, count + 1):
            folder = root / (first if number == 1 and first else f"{stage}-{number}")
            path = folder / "manifest.json"
            digest.update(str(path.relative_to(root)).encode() + b"\0" + path.read_bytes())
    return digest.hexdigest()


def selected_outliers(root, report, limit):
    if report.get("course") != "French 101" or report.get("manifestSetSHA256") != manifest_set_sha(root):
        raise ValueError("Stale or wrong-course signal report")
    out = []
    for flag in sorted(report["flags"], key=lambda item: item["signal"]["peak"]):
        if flag["signal"]["peak"] >= 0.0035:
            continue
        path = Path(flag["path"])
        if not path.is_relative_to(root) or path.parent.parent != root:
            raise ValueError("Out-of-root flagged path")
        folder = path.parent
        manifest = json.loads((folder / "manifest.json").read_text())
        match = [(row, gender, clip) for row in manifest["clips"].values()
                 for gender, clip in row["voices"].items() if clip["name"] == path.name]
        if len(match) != 1:
            raise ValueError("Flagged clip does not identify one source row")
        row, gender, clip = match[0]
        if (row["displayText"], row["spokenText"], clip["voice"], clip["listeningReviewed"]) != (
                flag["displayText"], flag["spokenText"], flag["voice"], False):
            raise ValueError("Flagged clip/source text or voice changed")
        if hashlib.sha256(path.read_bytes()).hexdigest() != clip["sha256"]:
            raise ValueError("Flagged source MP3 changed")
        stage = manifest["scope"]["stage"]
        number = manifest["scope"]["lesson"]
        expected, source_sha, _ = lesson_source(stage, number)
        if manifest["sourceFixtureSha256"] != source_sha or not any(
                entry["displayText"] == row["displayText"] and entry["spokenText"] == row["spokenText"]
                for entry in expected.values()):
            raise ValueError("Flagged lesson fixture changed")
        out.append((flag, gender, clip))
        if len(out) == limit:
            break
    return out


def comparison_sheet(output, candidates):
    rows = []
    for candidate in candidates:
        original = os.path.relpath(candidate["sourcePath"], output)
        rows.append(
            f'<section><h2 lang="fr">{html.escape(candidate["displayText"])}</h2>'
            f'<p>Spoken: <span lang="fr">{html.escape(candidate["spokenText"])}</span> · '
            f'{html.escape(candidate["voice"])}</p>'
            f'<h3>Original</h3><audio controls preload="none" '
            f'src="{html.escape(original, quote=True)}"></audio>'
            f'<h3>Retake candidate</h3><audio controls preload="none" '
            f'src="{html.escape(candidate["name"], quote=True)}"></audio>'
            f'<p>Candidate peak {candidate["signal"]["peak"]}; '
            f'active signal {candidate["signal"]["activeSeconds"]} s.</p></section>'
        )
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>French 101 retake comparison</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:20px 0}'
            'audio{width:100%}</style><h1>French 101 · Retake comparison</h1>'
            '<p>Private listening comparison. Neither version is approved or installed by this page.</p>'
            + ''.join(rows) + '</html>\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--signal-report", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=6)
    parser.add_argument("--project")
    parser.add_argument("--generate", action="store_true")
    args = parser.parse_args()
    if not 1 <= args.limit <= 20:
        raise SystemExit("Limit must be 1–20 clips")
    if args.generate and not args.project:
        raise SystemExit("--project is required for paid synthesis")
    root = PRIVATE_ROOT.resolve()
    output = args.output.expanduser().resolve()
    if not output.is_relative_to(root) or output == root:
        raise ValueError("Retakes must stay in a separate French 101 private folder")
    report = json.loads(args.signal_report.read_text())
    selected = selected_outliers(root, report, args.limit)
    proposed = [{"source": item[0]["path"], "spokenText": item[0]["spokenText"],
                 "voice": item[0]["voice"], "originalPeak": item[0]["signal"]["peak"]}
                for item in selected]
    print(json.dumps({"plannedClips": len(proposed), "plannedCharacters": sum(len(row["spokenText"]) for row in proposed),
                      "project": args.project if args.generate else None, "paidSynthesis": args.generate,
                      "clips": proposed}, ensure_ascii=False), flush=True)
    if not args.generate:
        return
    os.umask(0o077)
    output.mkdir(parents=True, exist_ok=True)
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        "schema": 1, "pairKey": "French:English", "locale": "fr-FR",
        "sourceManifestSetSHA256": report["manifestSetSHA256"],
        "listeningReviewed": False, "registered": False, "candidates": []}
    if (manifest["sourceManifestSetSHA256"] != report["manifestSetSHA256"] or
            manifest["listeningReviewed"] is not False or manifest["registered"] is not False):
        raise ValueError("Retake manifest scope or review state changed")
    token = subprocess.run(["gcloud", "auth", "application-default", "print-access-token"],
                           capture_output=True, text=True, check=True).stdout.strip()
    for flag, gender, original in selected:
        identity = hashlib.sha256((flag["path"] + original["sha256"]).encode()).hexdigest()[:20]
        name = f"fr-101-retake-{identity}-{gender}.mp3"
        if any(candidate["name"] == name for candidate in manifest["candidates"]):
            continue
        payload = {"input": {"text": flag["spokenText"]},
                   "voice": {"languageCode": "fr-FR", "name": VOICES[gender]},
                   "audioConfig": {"audioEncoding": "MP3"}}
        request = urllib.request.Request("https://texttospeech.googleapis.com/v1/text:synthesize",
            data=json.dumps(payload).encode(), headers={"Authorization": "Bearer " + token,
            "Content-Type": "application/json", "x-goog-user-project": args.project})
        data = base64.b64decode(json.load(urllib.request.urlopen(request, timeout=75))["audioContent"])
        if len(data) <= 500:
            raise ValueError("Empty retake MP3")
        temporary = output / (name + ".part")
        temporary.write_bytes(data)
        seconds = duration(temporary)
        temporary.replace(output / name)
        candidate = {"name": name, "sourcePath": flag["path"], "displayText": flag["displayText"],
                     "spokenText": flag["spokenText"], "voice": VOICES[gender],
                     "originalSHA256": original["sha256"], "sha256": hashlib.sha256(data).hexdigest(),
                     "bytes": len(data), "durationSeconds": seconds, "signal": decode(output / name),
                     "listeningReviewed": False}
        manifest["candidates"].append(candidate)
        part = output / "manifest.json.part"
        part.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        part.replace(manifest_path)
    for candidate in manifest["candidates"]:
        path = output / candidate["name"]
        if hashlib.sha256(path.read_bytes()).hexdigest() != candidate["sha256"] or duration(path) != candidate["durationSeconds"]:
            raise ValueError("Retake candidate bytes or duration changed")
    (output / "review.html").write_text(comparison_sheet(output, manifest["candidates"]))
    print(json.dumps({"candidateCount": len(manifest["candidates"]), "manifest": str(manifest_path)}))


if __name__ == "__main__":
    main()
