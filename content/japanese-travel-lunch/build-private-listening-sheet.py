#!/usr/bin/env python3
"""Create a local listening sheet from the verified private Lunch pilot."""
import argparse
import html
import json
from pathlib import Path

COURSE = Path(__file__).resolve().parent
DEFAULT_OUTPUT = Path('/Users/drive/lt-audio/japanese-travel-lunch/foundation-1-pilot')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    manifest = json.loads((args.output / 'manifest.json').read_text())
    if manifest['listeningReviewed'] is not False or len(manifest['clips']) != 5:
        raise ValueError('Expected an unreviewed five-text pilot')
    rows = []
    for index, (key, clips) in enumerate(manifest['clips'].items(), 1):
        if set(clips) != {'female', 'male'}:
            raise ValueError(f'Incomplete voices for {key}')
        display = clips['female']['displayText']
        players = ''.join(f'<div><strong>{html.escape(gender.title())}</strong> · {html.escape(clip["voice"])}<br><audio controls preload="none" src="{html.escape(clip["name"])}"></audio></div>' for gender, clip in clips.items())
        rows.append(f'<section><h2>{index}. {html.escape(display)}</h2>{players}<label><input type="checkbox"> Both voices sound accurate and natural</label><p>Retake or pronunciation note: <input type="text" aria-label="Note for text {index}"></p></section>')
    page = '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Japanese Lunch F1 private listening review</title><style>body{font:17px system-ui,sans-serif;max-width:850px;margin:2rem auto;padding:0 1rem;line-height:1.5}section{border:1px solid #aaa;border-radius:12px;padding:1rem;margin:1.5rem 0}audio{width:min(100%,420px)}input[type=text]{width:min(100%,600px);font:inherit}h2{font-size:1.2rem}</style><h1>Japanese Lunch Foundation 1 audio pilot</h1><p>Listen to both voices for all five exact Japanese strings. These ten local clips are unreviewed and are not enabled in the app. The checkboxes are worksheet marks only; they do not change the manifest.</p>' + ''.join(rows) + '</html>'
    path = args.output / 'listening-review.html'
    path.write_text(page)
    print(path)


if __name__ == '__main__':
    main()
