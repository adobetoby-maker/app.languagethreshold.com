#!/usr/bin/env python3
"""Verify five bounded Japanese 101 retakes and create a private comparison sheet."""

import argparse
import hashlib
import html
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path('/Users/drive/lt-audio/japanese-101')
OUTPUT = AUDIO / 'flagged-retakes-2026-11-10'
PLAN_PATH = ROOT / 'docs/japanese-program/private-audio-repair-plan-2026-11-10.json'
REPORT = ROOT / 'docs/japanese-program/private-audio-repair-evidence-2026-11-10.json'
SHEET = OUTPUT / 'listening-review.html'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def signal(path):
    source = ROOT / 'scripts/audit-japanese101-audio-signal.py'
    spec = importlib.util.spec_from_file_location('ja101_signal', source)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.decode(path)


def clean(metrics):
    return (metrics['peak'] >= .02 and metrics['rms'] >= .004 and
            metrics['activeSeconds'] >= .08 and metrics['clippedFraction'] <= .001 and
            metrics['leadingSilenceSeconds'] <= 1 and metrics['trailingSilenceSeconds'] <= 1)


def build():
    plan_bytes = PLAN_PATH.read_bytes()
    plan = json.loads(plan_bytes)
    manifest_bytes = (OUTPUT / 'manifest.json').read_bytes()
    manifest = json.loads(manifest_bytes)
    assert manifest['pairKey'] == plan['pairKey'] == 'Japanese:English'
    assert manifest['locale'] == 'ja-JP' and manifest['sourceRepairPlanSha256'] == sha(plan_bytes)
    assert manifest['listeningReviewed'] is manifest['registered'] is False
    expected = [row for row in plan['repairs'] if row['nextStep'] == 'bounded-private-retake']
    assert len(expected) == 5 and len(manifest['clips']) == 5
    rows = []
    for original in expected:
        text = original['original']['spokenText']
        voice = original['voice']
        key = sha((text + '\n' + voice).encode())
        clip = manifest['clips'][key]
        assert clip['spokenText'] == text and clip['voice'] == voice and clip['locale'] == 'ja-JP'
        assert clip['sourceLesson'] == original['original']['lesson']
        assert clip['listeningReviewed'] is False
        path = OUTPUT / clip['name']
        data = path.read_bytes()
        assert sha(data) == clip['sha256'] and len(data) == clip['bytes'] and len(data) > 500
        metrics = signal(path)
        assert metrics['durationSeconds'] == clip['durationSeconds'] and clean(metrics)
        rows.append({'text': original['text'], 'voice': voice, 'original': original['original'],
                     'retake': {'file': clip['name'], 'sha256': clip['sha256'],
                                'bytes': clip['bytes'], 'durationSeconds': clip['durationSeconds'],
                                'signal': metrics}})
    assert {p.name for p in OUTPUT.glob('*.mp3')} == {row['retake']['file'] for row in rows}
    return {
        'schema': 1, 'pairKey': 'Japanese:English', 'state': 'private-unreviewed-retakes',
        'sourceRepairPlanSha256': sha(plan_bytes), 'retakeManifestSha256': sha(manifest_bytes),
        'retakeClipsVerified': len(rows), 'signalCleanRetakes': len(rows),
        'sameTextVoiceAlternativesAwaitingListening': plan['withSameTextVoiceAlternative'],
        'listeningReviewed': False, 'registered': False, 'rows': rows,
    }


def sheet(report, plan):
    row_by_identity = {(row['text'], row['voice']): row for row in report['rows']}
    parts = ["<!doctype html><html lang='en'><meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>",
             '<title>Japanese 101 flagged audio comparison</title>',
             '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:1rem}section{border:1px solid #aaa;border-radius:10px;padding:1rem;margin:1rem 0}audio{display:block;width:100%;max-width:500px;margin:.4rem 0}</style>',
             '<h1>Japanese 101 flagged audio comparison</h1><p>Private candidates only. A clean signal is not listening approval. Compare each original with its exact-text, same-voice alternative or retake; no selection here changes playback.</p>']
    for index, item in enumerate(plan['repairs'], 1):
        parts.append(f'<section><h2>{index}. <span lang="ja">{html.escape(item["text"])}</span> · {html.escape(item["voice"])}</h2>')
        original = item['original']
        source = (AUDIO / original['file']).as_uri()
        parts.append(f'<p>Original · {html.escape(original["lesson"])}</p><audio controls preload="none" src="{html.escape(source, quote=True)}"></audio>')
        candidates = item['sameTextVoiceUnflaggedAlternatives']
        retake = row_by_identity.get((item['text'], item['voice']))
        if retake:
            path = OUTPUT / retake['retake']['file']
            parts.append(f'<p>New private retake · SHA-256 {retake["retake"]["sha256"]}</p><audio controls preload="none" src="{html.escape(path.as_uri(), quote=True)}"></audio>')
        for candidate in candidates:
            path = AUDIO / candidate['file']
            parts.append(f'<p>Same-text, same-voice course take · {html.escape(candidate["lesson"])} · SHA-256 {candidate["sha256"]}</p><audio controls preload="none" src="{html.escape(path.as_uri(), quote=True)}"></audio>')
        parts.append('<p>Listening decision: __________ &nbsp; Notes: __________</p></section>')
    parts.append('</html>')
    return '\n'.join(parts) + '\n'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build()
    encoded = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    plan = json.loads(PLAN_PATH.read_text())
    page = sheet(report, plan)
    if args.check:
        assert REPORT.read_text() == encoded and SHEET.read_text() == page
    else:
        REPORT.write_text(encoded)
        SHEET.write_text(page)
    print(json.dumps({'retakeClipsVerified': report['retakeClipsVerified'],
                      'signalCleanRetakes': report['signalCleanRetakes'],
                      'reviewRows': len(plan['repairs']), 'listeningReviewed': False}))


if __name__ == '__main__':
    main()
