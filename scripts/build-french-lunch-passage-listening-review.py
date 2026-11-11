#!/usr/bin/env python3
"""Build private hash-pinned review sheets for new French Lunch content audio."""
import argparse
import hashlib
import html
import json
import importlib.util
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / 'content/french-travel-lunch'
PRIVATE_ROOT = Path('/Users/drive/lt-audio/french-travel-lunch')
def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BUILD = load(CONTENT / 'build-private-content-audio-delta.py', 'french_lunch_passage_delta_review')
SUPPLEMENT = load(CONTENT / 'build-private-lesson-content-audio-delta.py', 'french_lunch_supplement_delta_review')
AUDIO = load(ROOT / 'scripts/generate-french-lunch-hd-audio.py', 'french_lunch_audio_review')
TRIM_SHA256 = {
    'fr-lunch-passage-6f2f47822453952f5577-male-edge-trim-candidate.mp3':
        'fa8a3de581072af45f4175505a5e1d2ed3ab9076a6309a8a2a9d1a1a26760d8f',
}


def require(value, message):
    if not value:
        raise ValueError(message)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--scope', choices=('passages', 'supplement'), default='passages')
    args = parser.parse_args()
    build = BUILD if args.scope == 'passages' else SUPPLEMENT
    private = PRIVATE_ROOT / ('content-passages' if args.scope == 'passages' else 'content-supplement')
    delta = build.build()
    require(json.loads(build.OUTPUT.read_text()) == delta, 'Pinned content/audio delta changed')
    manifest = json.loads((private / 'manifest.json').read_text())
    require(manifest['deltaSha256'] == hashlib.sha256(build.OUTPUT.read_bytes()).hexdigest(),
            'Manifest source hash changed')
    require(manifest['listeningReviewed'] is False and manifest['registered'] is False,
            'Review gate changed')
    require(set(manifest['clips']) == {row['textSha256'] for row in delta['texts']},
            'Audio set is incomplete or has extra text')
    retakes = {}
    signal_flags = []
    if args.scope == 'supplement':
        signal = json.loads((private / 'signal-screen.json').read_text())
        require(signal['manifestSha256'] == hashlib.sha256((private / 'manifest.json').read_bytes()).hexdigest()
                and signal['listeningReviewed'] is False,
                'Signal screen identity or review gate changed')
        signal_flags = signal['flags']
        for report_name in ('retakes.json', 'retakes-plus3db.json', 'retakes-plus8db.json'):
            report_path = private / 'retake-candidates' / report_name
            if not report_path.exists():
                continue
            report = json.loads(report_path.read_text())
            require(report['manifestSha256'] == hashlib.sha256((private / 'manifest.json').read_bytes()).hexdigest()
                    and report['listeningReviewed'] is False and report['installed'] is False,
                    'Retake report identity or review gate changed')
            for candidate in report['candidates']:
                path = private / 'retake-candidates' / candidate['candidateName']
                require(hashlib.sha256(path.read_bytes()).hexdigest() == candidate['candidateSHA256']
                        and candidate['listeningReviewed'] is False and candidate['installed'] is False,
                        'Retake candidate changed')
                retakes.setdefault(candidate['sourceName'], []).append(candidate)
    rows = []
    for index, row in enumerate(delta['texts'], 1):
        record = manifest['clips'][row['textSha256']]
        require(record['text'] == row['text'], 'Audio text differs')
        players = []
        for gender, voice in manifest['voices'].items():
            clip = record['voices'][gender]
            path = private / clip['name']
            data = path.read_bytes()
            require(clip['voice'] == voice and clip['text'] == row['text'] and
                    clip['sha256'] == hashlib.sha256(data).hexdigest() and
                    clip['bytes'] == len(data) and
                    clip['durationSeconds'] == AUDIO.duration(path) and
                    clip['listeningReviewed'] is False,
                    'Clip metadata, bytes or review state changed')
            players.append(f'<label>{html.escape(gender.title())} · {html.escape(voice)}<audio controls preload="none" src="{html.escape(clip["name"])}"></audio></label>')
            for candidate in retakes.get(clip['name'], []):
                require(candidate['sourceSHA256'] == clip['sha256'] and
                        candidate['text'] == row['text'] and candidate['voice'] == voice,
                        'Retake source text or voice differs')
                label = 'slower retake, numeric signal clear' if candidate['signalImproved'] else 'slower retake, signal flag remains'
                players.append(f'<label>{html.escape(gender.title())} · {label}<audio controls preload="none" src="retake-candidates/{html.escape(candidate["candidateName"])}"></audio></label>')
            trim_name = Path(clip['name']).stem + '-edge-trim-candidate.mp3'
            if args.scope == 'passages' and trim_name in TRIM_SHA256:
                trim = private / trim_name
                require(hashlib.sha256(trim.read_bytes()).hexdigest() == TRIM_SHA256[trim_name],
                        'Edge-trim candidate changed')
                players.append(f'<label>{html.escape(gender.title())} · private edge-trim candidate<audio controls preload="none" src="{html.escape(trim_name)}"></audio></label>')
        rows.append(f'<section id="text-{row["textSha256"][:16]}"><h2>{index}. {html.escape(", ".join(row["lessonIds"]))}</h2>'
                    f'<p lang="fr">{html.escape(row["text"])}</p>'
                    + ''.join(players) + '</section>')
    title = 'French Lunch passage listening review' if args.scope == 'passages' else 'French Lunch words and verbs listening review'
    flag_index = ''
    if signal_flags:
        links = []
        for flag in signal_flags:
            key = hashlib.sha256(flag['text'].encode()).hexdigest()
            require(key in manifest['clips'] and any(clip['name'] == flag['name'] and
                    clip['voice'] == flag['voice'] for clip in manifest['clips'][key]['voices'].values()),
                    'Signal flag no longer matches a clip')
            clean = any(item['signalImproved'] for item in retakes.get(flag['name'], []))
            status = 'clean numeric candidate' if clean else 'direct listening priority'
            links.append(f'<li><a href="#text-{key[:16]}">{html.escape(flag["text"])} · {html.escape(flag["voice"].rsplit("-", 1)[-1])}</a> — {status}</li>')
        flag_index = f'<h2>Signal-review priorities ({len(links)})</h2><ol>' + ''.join(links) + '</ol>'
    page = ('<!doctype html><html lang="en"><meta charset="utf-8"><title>' + title + '</title>'
            '<style>body{font:17px system-ui;max-width:780px;margin:2rem auto;padding:0 1rem;line-height:1.5}'
            'section{border-top:1px solid #aaa;padding:1rem 0}audio{display:block;width:100%;margin:.4rem 0 1rem}'
            'label{display:block}p[lang=fr]{font-size:1.2rem}</style>'
            '<h1>' + title + '</h1>'
            f'<p>{len(rows)} exact new strings, two voices each. Private candidate; no listening approval recorded. '
            'Compare pronunciation, wording, silence and clipping. This sheet does not change any release gate.</p>'
            f'<p>Delta SHA-256: {manifest["deltaSha256"]}</p>' + flag_index + ''.join(rows) + '</html>')
    output = private / 'listening-review.html'
    output.write_text(page)
    print(json.dumps({'texts': len(rows), 'clips': len(rows) * 2, 'worksheet': str(output)}))


if __name__ == '__main__':
    main()
