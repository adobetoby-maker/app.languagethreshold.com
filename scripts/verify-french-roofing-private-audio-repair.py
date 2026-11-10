#!/usr/bin/env python3
"""Verify exact, private French Roofing audio repairs without approving playback."""

import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
from runpy import run_path


ROOT = Path(__file__).resolve().parents[1]
AUDIO = Path('/Users/drive/lt-audio/french-roofing')
ORIGINAL = AUDIO / 'full-course-2026-11-09'
REPAIRED = AUDIO / 'full-course-repaired-2026-11-10'
EVIDENCE = ROOT / 'content/french-roofing/private-audio-repair-evidence-2026-11-10.json'
COMPARISON = REPAIRED / 'repair-comparison-2026-11-10.html'
VERIFY = run_path(str(ROOT / 'scripts/verify-french-roofing-private-hd-audio.py'))['verify']
SIGNAL = run_path(str(ROOT / 'scripts/audit-french-roofing-private-audio-signal.py'))['signal']


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def signal_flags(metrics):
    flags = []
    if metrics['peak'] < 0.02 or metrics['rms'] < 0.004:
        flags.append('very-quiet')
    if metrics['activeSeconds'] < 0.08:
        flags.append('little-active-signal')
    if metrics['clippedFraction'] > 0.001:
        flags.append('possible-clipping')
    if metrics['leadingSilenceSeconds'] > 1 or metrics['trailingSilenceSeconds'] > 1:
        flags.append('long-edge-silence')
    return flags


class AudioLinks(HTMLParser):
    def __init__(self):
        super().__init__()
        self.sources = []

    def handle_starttag(self, tag, attrs):
        if tag == 'audio':
            self.sources.extend(value for name, value in attrs if name == 'src')


def build():
    original_bytes = (ORIGINAL / 'manifest.json').read_bytes()
    repaired_bytes = (REPAIRED / 'manifest.json').read_bytes()
    original = json.loads(original_bytes)
    repaired = json.loads(repaired_bytes)
    provenance = json.loads((REPAIRED / 'repair-provenance.json').read_text())
    old_signal = json.loads((ORIGINAL / 'signal-screen-2026-11-09.json').read_text())
    new_signal_bytes = (REPAIRED / 'signal-screen-2026-11-09.json').read_bytes()
    new_signal = json.loads(new_signal_bytes)
    assert original['pairKey'] == repaired['pairKey'] == 'French:English'
    assert original['locale'] == repaired['locale'] == 'fr-FR'
    assert original['voices'] == repaired['voices']
    for key in ('sourceInventorySha256', 'exactTextSha256', 'sourceFixtureSha256'):
        assert original[key] == repaired[key]
    for value in (original, repaired, provenance):
        assert value['textReviewed'] is value['listeningReviewed'] is value['registered'] is False
    assert old_signal['manifestSha256'] == provenance['sourceManifestSHA256'] == sha(original_bytes)
    assert old_signal['filesDecoded'] == 2762 and old_signal['flaggedFiles'] == 11
    assert new_signal['manifestSha256'] == provenance['repairedManifestSHA256'] == sha(repaired_bytes)
    assert new_signal['filesDecoded'] == 2762 and new_signal['flaggedFiles'] == 0
    assert new_signal['flags'] == [] and new_signal['listeningReviewed'] is False
    assert new_signal['registered'] is False
    assert set(original['clips']) == set(repaired['clips'])

    old_flag_keys = {(row['textSha256'], row['gender']) for row in old_signal['flags']}
    repairs = {(row['textSha256'], row['gender']): row for row in provenance['changes']}
    assert len(old_flag_keys) == len(repairs) == 11 and old_flag_keys == set(repairs)
    changed = set()
    for key, old_row in original['clips'].items():
        new_row = repaired['clips'][key]
        assert old_row['text'] == new_row['text']
        assert old_row['occurrences'] == new_row['occurrences']
        assert set(old_row['voices']) == set(new_row['voices']) == {'female', 'male'}
        for gender, old_clip in old_row['voices'].items():
            new_clip = new_row['voices'][gender]
            pair = (key, gender)
            path = REPAIRED / new_clip['name']
            assert sha(path.read_bytes()) == new_clip['sha256']
            if pair not in repairs:
                assert old_clip == new_clip
                continue
            changed.add(pair)
            repair = repairs[pair]
            for field in ('name', 'text', 'voice', 'locale', 'listeningReviewed'):
                assert old_clip[field] == new_clip[field]
            assert old_clip['sha256'] == repair['sourceSHA256']
            assert new_clip['sha256'] == repair['candidateSHA256']
            assert sha((ORIGINAL / old_clip['name']).read_bytes()) == old_clip['sha256']
            assert new_clip['repair']['sourceSHA256'] == old_clip['sha256']
            metrics = SIGNAL(path)
            assert metrics == repair['signalAfter'] and signal_flags(metrics) == []
            if repair['kind'] == 'trim-edge-silence':
                before = new_clip['repair']['signalBefore']
                assert metrics['activeSeconds'] >= before['activeSeconds'] - 0.03
    assert changed == old_flag_keys

    coverage = VERIFY(False, REPAIRED)
    assert coverage['sourceTexts'] == 1381 and coverage['verifiedClips'] == 2762
    assert coverage['completeLessons'] == 60 and coverage['listeningReviewed'] is False
    assert coverage['registered'] is False
    manifest_names = {clip['name'] for row in repaired['clips'].values()
                      for clip in row['voices'].values()}
    links = set()
    sheets = sorted(REPAIRED.glob('*listening-review-2026-11-09.html'))
    for sheet in sheets:
        parser = AudioLinks()
        parser.feed(sheet.read_text())
        for name in parser.sources:
            assert '/' not in name and name in manifest_names and (REPAIRED / name).is_file()
            links.add(name)
    assert len(sheets) == 64 and links == manifest_names
    return {'schema': 1, 'course': 'French Roofing', 'pairKey': 'French:English',
            'state': 'private-repaired-audio-unreviewed',
            'sourceManifestSHA256': sha(original_bytes),
            'repairedManifestSHA256': sha(repaired_bytes),
            'repairedSignalReportSHA256': sha(new_signal_bytes),
            'sourceFlaggedClips': 11, 'repairedClips': len(changed),
            'repairedSignalFlags': 0, 'verifiedClips': 2762,
            'verifiedLessons': 60, 'listeningSheets': len(sheets),
            'linkedFiles': len(links), 'textReviewed': False,
            'listeningReviewed': False, 'registered': False,
            'webPublished': False, 'nativeBundled': False,
            'repairs': provenance['changes']}


def comparison(report):
    rows = []
    for row in report['repairs']:
        source_name = f"fr-roofing-{row['textSha256'][:20]}-{row['gender']}.mp3"
        rows.append('<section><h2 lang="fr">' + html.escape(row['text']) + '</h2><p>' +
                    html.escape(row['voice']) + ' · ' + html.escape(row['kind']) +
                    '</p><p>Original</p><audio controls preload="none" src="../full-course-2026-11-09/' +
                    html.escape(source_name, quote=True) + '"></audio><p>Repaired candidate</p>' +
                    '<audio controls preload="none" src="' + html.escape(source_name, quote=True) +
                    '"></audio></section>')
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>French Roofing repaired audio review</title>'
            '<style>body{font:17px system-ui;max-width:850px;margin:auto;padding:20px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:16px 0}'
            'audio{width:100%}</style><h1>French Roofing private repaired audio</h1>'
            '<p>Compare each exact-text original and candidate. No repaired clip is listening-approved or released.</p>' +
            ''.join(rows) + '</html>\n')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    report = build()
    evidence = json.dumps(report, ensure_ascii=False, indent=2) + '\n'
    sheet = comparison(report)
    parser = AudioLinks()
    parser.feed(sheet)
    assert len(parser.sources) == 2 * report['repairedClips']
    assert all((REPAIRED / name).is_file() for name in parser.sources)
    if args.check:
        assert EVIDENCE.read_text() == evidence
        assert COMPARISON.read_text() == sheet
    else:
        EVIDENCE.write_text(evidence)
        COMPARISON.write_text(sheet)
    print(json.dumps({key: report[key] for key in ('verifiedClips', 'verifiedLessons',
                                                 'repairedClips', 'repairedSignalFlags',
                                                 'listeningSheets', 'linkedFiles')}))
