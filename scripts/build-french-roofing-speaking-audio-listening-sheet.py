#!/usr/bin/env python3
"""Build a private listening worksheet for five French Roofing speaking openings."""
import argparse
import html
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
INVENTORY = ROOT / 'content/french-roofing/private-speaking-audio-pilot-fr-en.json'
DEFAULT_OUTPUT = Path('/Users/drive/lt-audio/french-roofing/speaking-openings-f2-4-f6-7')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    subprocess.run(['python3', str(ROOT / 'scripts/verify-french-roofing-speaking-audio-pilot.py'), '--output', str(args.output)], capture_output=True, text=True, check=True)
    inventory = json.loads(INVENTORY.read_text())
    manifest = json.loads((args.output / 'manifest.json').read_text())
    sections = []
    for i, row in enumerate(inventory['texts'], 1):
        clips = manifest['clips'][row['sha256']]
        players = ''.join(f'<div><strong>{html.escape(gender.title())}</strong> · {html.escape(clip["voice"])}<br><audio controls preload="none" src="{html.escape(clip["name"])}"></audio></div>' for gender, clip in clips.items())
        sections.append(f'<section><h2>{i}. {html.escape(row["lessonKey"])}</h2><p lang="fr">{html.escape(row["text"])}</p>{players}<label><input type="checkbox"> Both voices match the French text and sound natural</label><p>Retake/pronunciation note: <input type="text" aria-label="Note for opening {i}"></p></section>')
    page = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>French Roofing speaking-opening pilot listening review</title><style>body{font:17px system-ui,sans-serif;max-width:850px;margin:2rem auto;padding:0 1rem;line-height:1.5}section{border:1px solid #aaa;border-radius:12px;padding:1rem;margin:1.5rem 0}audio{width:min(100%,420px)}input[type=text]{width:min(100%,600px);font:inherit}h2{font-size:1.2rem}</style><h1>French Roofing speaking-opening audio pilot</h1><p>Five exact draft openings, two fr-FR voices each. These clips remain unreviewed and are not enabled in the app. Checkbox marks stay in this worksheet only; they do not change the manifest.</p>' + ''.join(sections) + '</html>'
    path = args.output / 'listening-review.html'
    if args.check:
        if not path.is_file() or path.read_text() != page:
            raise SystemExit('Private listening sheet is missing or stale')
    else:
        path.write_text(page)
    print(path)


if __name__ == '__main__':
    main()
