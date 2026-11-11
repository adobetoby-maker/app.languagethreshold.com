#!/usr/bin/env python3
"""Build a private hash-pinned review sheet for new French Lunch passage audio."""
import hashlib
import html
import json
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/french-travel-lunch'
PRIVATE = Path('/Users/drive/lt-audio/french-travel-lunch/content-passages')
def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BUILD = load(CONTENT / 'build-private-content-audio-delta.py', 'french_lunch_passage_delta_review')
AUDIO = load(ROOT / 'scripts/generate-french-lunch-hd-audio.py', 'french_lunch_audio_review')
TRIM_SHA256 = {
    'fr-lunch-passage-6f2f47822453952f5577-male-edge-trim-candidate.mp3':
        'fa8a3de581072af45f4175505a5e1d2ed3ab9076a6309a8a2a9d1a1a26760d8f',
}


def require(value, message):
    if not value:
        raise ValueError(message)


def main():
    delta = BUILD.build()
    require(json.loads(BUILD.OUTPUT.read_text()) == delta, 'Pinned content/audio delta changed')
    manifest = json.loads((PRIVATE / 'manifest.json').read_text())
    require(manifest['deltaSha256'] == hashlib.sha256(BUILD.OUTPUT.read_bytes()).hexdigest(),
            'Manifest source hash changed')
    require(manifest['listeningReviewed'] is False and manifest['registered'] is False,
            'Review gate changed')
    require(set(manifest['clips']) == {row['textSha256'] for row in delta['texts']},
            'Audio set is incomplete or has extra text')
    rows = []
    for index, row in enumerate(delta['texts'], 1):
        record = manifest['clips'][row['textSha256']]
        require(record['text'] == row['text'], 'Audio text differs')
        players = []
        for gender, voice in manifest['voices'].items():
            clip = record['voices'][gender]
            path = PRIVATE / clip['name']
            data = path.read_bytes()
            require(clip['voice'] == voice and clip['text'] == row['text'] and
                    clip['sha256'] == hashlib.sha256(data).hexdigest() and
                    clip['bytes'] == len(data) and
                    clip['durationSeconds'] == AUDIO.duration(path) and
                    clip['listeningReviewed'] is False,
                    'Clip metadata, bytes or review state changed')
            players.append(f'<label>{html.escape(gender.title())} · {html.escape(voice)}<audio controls preload="none" src="{html.escape(clip["name"])}"></audio></label>')
            trim_name = Path(clip['name']).stem + '-edge-trim-candidate.mp3'
            if trim_name in TRIM_SHA256:
                trim = PRIVATE / trim_name
                require(hashlib.sha256(trim.read_bytes()).hexdigest() == TRIM_SHA256[trim_name],
                        'Edge-trim candidate changed')
                players.append(f'<label>{html.escape(gender.title())} · private edge-trim candidate<audio controls preload="none" src="{html.escape(trim_name)}"></audio></label>')
        rows.append(f'<section><h2>{index}. {html.escape(", ".join(row["lessonIds"]))}</h2>'
                    f'<p lang="fr">{html.escape(row["text"])}</p>'
                    + ''.join(players) + '</section>')
    page = ('<!doctype html><html lang="en"><meta charset="utf-8"><title>French Lunch passage review</title>'
            '<style>body{font:17px system-ui;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.5}'
            'section{border-top:1px solid #aaa;padding:1rem 0}audio{display:block;width:100%;margin:.4rem 0 1rem}'
            'label{display:block}p[lang=fr]{font-size:1.2rem}</style>'
            '<h1>French Lunch passage listening review</h1>'
            '<p>87 exact new lines, two voices each. Private candidate; no listening approval recorded. '
            'Compare pronunciation, wording, silence and clipping. This sheet does not change any release gate.</p>'
            f'<p>Delta SHA-256: {manifest["deltaSha256"]}</p>' + ''.join(rows) + '</html>')
    output = PRIVATE / 'listening-review.html'
    output.write_text(page)
    print(json.dumps({'texts': len(rows), 'clips': len(rows) * 2, 'worksheet': str(output)}))


if __name__ == '__main__':
    main()
