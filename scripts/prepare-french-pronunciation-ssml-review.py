#!/usr/bin/env python3
"""Verify four private SSML retakes and compare two isolated gain candidates."""

import argparse
import hashlib
import html
import importlib.util
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path("/Users/drive/lt-audio/french-pronunciation")
SSML = AUDIO / "ssml-quiet-retakes-2026-11-10"
OUTPUT = AUDIO / "ssml-level-candidates-2026-11-10"
SOURCE = ROOT / "docs/french-program/fr-001-private-quiet-retakes.json"
TARGETS = (("prix", "female"), ("quai", "female"),
           ("temps", "male"), ("tu", "male"))
GAIN = {("prix", "female"): 6, ("temps", "male"): 12}


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def signal(path):
    spec = importlib.util.spec_from_file_location(
        "french_signal", ROOT / "scripts/audit-french-pronunciation-private-audio-signal.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.signal(path)


def verify(path, expected_sha, expected_bytes, expected_signal):
    raw = path.read_bytes()
    if sha(raw) != expected_sha or len(raw) != expected_bytes or signal(path) != expected_signal:
        raise ValueError(f"File hash, bytes, or signal changed: {path}")


def render_sheet(ssml, levels):
    blocks = []
    for text, gender in TARGETS:
        key = sha((text + "\n" + gender).encode())
        row = ssml["clips"][key]
        sources = []
        for dirname in ("quiet-retakes-2026-11-10", "quiet-retakes-2-2026-11-10"):
            prior_path = AUDIO / dirname / "manifest.json"
            prior = json.loads(prior_path.read_text())
            if key in prior["clips"]:
                clip = prior["clips"][key]
                candidate = AUDIO / dirname / clip["name"]
                if sha(candidate.read_bytes()) != clip["sha256"]:
                    raise ValueError(f"Prior retake changed: {candidate}")
                sources.append((dirname, clip["name"]))
        sources.append((SSML.name, row["name"]))
        if key in levels:
            sources.append((OUTPUT.name, levels[key]["name"]))
        links = "".join(
            f'<p>{html.escape(dirname)}: <audio controls preload="none" '
            f'src="../{html.escape(dirname)}/{html.escape(name)}"></audio></p>'
            for dirname, name in sources)
        blocks.append(f'<section><h2 lang="fr">{html.escape(text)}</h2>'
                      f'<p>{html.escape(row["voice"])} · listen to each take and record a decision separately.</p>'
                      f'{links}</section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>French pronunciation SSML comparisons</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:20px 0}'
            'audio{display:block;width:100%}</style>'
            '<h1>Four French pronunciation retakes</h1>'
            '<p>Private listening candidates only. No clip is selected or registered.</p>'
            + "".join(blocks) + '</html>\n')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    source = json.loads(SOURCE.read_text())
    if sorted((x["text"], x["gender"]) for x in source["stillQuietPairs"]) != sorted(TARGETS):
        raise ValueError("The four-word source scope changed")
    ssml_path = SSML / "manifest.json"
    ssml = json.loads(ssml_path.read_text())
    if (ssml["pairKey"], ssml["locale"], ssml["sourceQuietRetakeSummarySha256"],
        ssml["listeningReviewed"], ssml["registered"], len(ssml["clips"])) != (
        "French:English", "fr-FR", sha(SOURCE.read_bytes()), False, False, 4):
        raise ValueError("SSML source or private state changed")
    for text, gender in TARGETS:
        key = sha((text + "\n" + gender).encode())
        row = ssml["clips"][key]
        path = SSML / row["name"]
        if row["text"] != text or row["gender"] != gender or row["listeningReviewed"] is not False:
            raise ValueError(f"Wrong SSML text or voice: {text}/{gender}")
        verify(path, row["sha256"], row["bytes"], row["signal"])
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest_path = OUTPUT / "manifest.json"
    if manifest_path.exists() and not args.check:
        raise ValueError("Private level candidates already exist; use --check")
    if not args.check:
        rows = {}
        for (text, gender), gain in GAIN.items():
            key = sha((text + "\n" + gender).encode())
            source_row = ssml["clips"][key]
            name = f"fr-pronunciation-ssml-level-{key[:24]}-{gender}.mp3"
            path = OUTPUT / name
            if not path.exists():
                subprocess.run(["ffmpeg", "-nostdin", "-loglevel", "error", "-i",
                                str(SSML / source_row["name"]), "-af", f"volume={gain}dB",
                                "-codec:a", "libmp3lame", "-q:a", "2", str(path)], check=True)
            raw = path.read_bytes()
            rows[key] = {"name": name, "text": text, "gender": gender,
                         "sourceSha256": source_row["sha256"], "gainDb": gain,
                         "sha256": sha(raw), "bytes": len(raw), "signal": signal(path),
                         "listeningReviewed": False}
        manifest = {"schema": 1, "pairKey": "French:English", "locale": "fr-FR",
                    "sourceSsmlManifestSha256": sha(ssml_path.read_bytes()),
                    "listeningReviewed": False, "registered": False, "clips": rows}
        part = manifest_path.with_suffix(".json.part")
        part.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
        part.replace(manifest_path)
    manifest = json.loads(manifest_path.read_text())
    if (manifest["pairKey"], manifest["sourceSsmlManifestSha256"],
        manifest["listeningReviewed"], manifest["registered"], len(manifest["clips"])) != (
        "French:English", sha(ssml_path.read_bytes()), False, False, 2):
        raise ValueError("Level candidate source or private state changed")
    for key, row in manifest["clips"].items():
        if row["sourceSha256"] != ssml["clips"][key]["sha256"] or row["listeningReviewed"] is not False:
            raise ValueError("Level candidate identity changed")
        verify(OUTPUT / row["name"], row["sha256"], row["bytes"], row["signal"])
    sheet = render_sheet(ssml, manifest["clips"])
    sheet_path = OUTPUT / "review.html"
    if args.check:
        if sheet_path.read_text() != sheet:
            raise ValueError("Private listening sheet changed")
    else:
        sheet_path.write_text(sheet)
    print(json.dumps({"ssmlClips": 4, "levelCandidates": 2,
                      "sheet": str(sheet_path), "listeningReviewed": False}))


if __name__ == "__main__":
    main()
