#!/usr/bin/env python3
"""Reuse exact unchanged private MP3s for a source-pinned clinical correction."""

import hashlib
import json
import shutil
from pathlib import Path
from runpy import run_path


ROOT = Path(__file__).resolve().parents[1]
OLD = Path('/Users/drive/lt-audio/french-travel-breakfast/full-course-2026-11-09')
NEW = Path('/Users/drive/lt-audio/french-travel-breakfast/clinical-fidelity-2026-11-09')
GENERATOR = run_path(str(ROOT / 'scripts/generate-french-travel-breakfast-private-hd-audio.py'))


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main():
    inventory, source_sha = GENERATOR['source']()
    old = json.loads((OLD / 'manifest.json').read_text())
    if (old['pairKey'], old['locale'], old['textReviewed'], old['listeningReviewed'], old['registered']) != (
        'French:English', 'fr-FR', False, False, False
    ) or len(old['clips']) != 1608:
        raise ValueError('Original private manifest identity or scope changed')
    rows = {row['sha256']: row for row in inventory['texts']}
    reusable = set(rows) & set(old['clips'])
    if len(reusable) != 1600 or len(set(rows) - reusable) != 8:
        raise ValueError('Unexpected clinical correction delta')
    NEW.mkdir(parents=True, exist_ok=True)
    manifest = {
        'schema': 1, 'state': 'private-unreviewed-full-course-recordings',
        'pairKey': 'French:English', 'locale': 'fr-FR', 'voices': GENERATOR['VOICES'],
        'sourceInventorySha256': source_sha,
        'exactTextSha256': inventory['exactTextSha256'],
        'sourceFixtureSha256': inventory['sourceFixtureSha256'],
        'textReviewed': False, 'listeningReviewed': False, 'registered': False,
        'clips': {},
    }
    existing = NEW / 'manifest.json'
    if existing.exists():
        prior = json.loads(existing.read_text())
        if any(prior.get(key) != value for key, value in manifest.items() if key != 'clips'):
            raise ValueError('Existing corrected manifest identity changed')
        # Keep any new clips synthesized by a previous bounded run.
        manifest['clips'] = prior['clips']
    reused_clips = 0
    for key in sorted(reusable):
        row = rows[key]
        old_record = old['clips'][key]
        if old_record.get('text') != row['text'] or set(old_record.get('voices', {})) != {'female', 'male'}:
            raise ValueError(f'Original record changed: {key}')
        record = {'text': row['text'], 'occurrences': row['occurrences'], 'voices': {}}
        for gender, voice in GENERATOR['VOICES'].items():
            clip = old_record['voices'][gender]
            name = f'fr-breakfast-{key[:20]}-{gender}.mp3'
            source = OLD / name
            data = source.read_bytes()
            if (clip.get('name'), clip.get('text'), clip.get('voice'), clip.get('locale'),
                clip.get('sha256'), clip.get('bytes'), clip.get('listeningReviewed')) != (
                name, row['text'], voice, 'fr-FR', sha(data), len(data), False
            ) or not 0.1 < clip.get('durationSeconds', 0) < 120:
                raise ValueError(f'Original MP3 mismatch: {name}')
            target = NEW / name
            if target.exists():
                if sha(target.read_bytes()) != clip['sha256']:
                    raise ValueError(f'Existing corrected MP3 differs: {name}')
            else:
                shutil.copy2(source, target)
            record['voices'][gender] = clip
            reused_clips += 1
        manifest['clips'][key] = record
    if set(manifest['clips']) - set(rows):
        raise ValueError('Corrected manifest contains an out-of-scope text')
    temporary = existing.with_suffix('.json.part')
    temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(existing)
    print(json.dumps({'reusedClips': reused_clips, 'newTexts': len(set(rows)-reusable),
                      'newClips': 2 * len(set(rows)-reusable), 'remainingClips': 3216 - sum(
                          len(record['voices']) for record in manifest['clips'].values()),
                      'nominalNewSynthesisUSD': round(2 * sum(len(rows[key]['text']) for key in set(rows)-reusable) * 0.00003, 4),
                      'output': str(NEW)}))


if __name__ == '__main__':
    main()
