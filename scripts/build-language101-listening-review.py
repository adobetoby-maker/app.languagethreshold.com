#!/usr/bin/env python3
"""Build private 101 listening worksheets and verify exported review receipts.

Neither command changes a source manifest, review flag, audio file or website asset.
"""
import argparse
import hashlib
import html
import json
from pathlib import Path

STAGES = (("foundation", 10), ("core", 30), ("master", 20))
COURSES = (("french-101", "fr-FR", "French 101"), ("japanese-101", "ja-JP", "Japanese 101"))


def h(value):
    return html.escape(str(value), quote=True)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


STYLE = """<style>
body{font:16px system-ui,sans-serif;max-width:1050px;margin:auto;padding:20px;background:#0b2033;color:#f8f6f0}
a{color:#f3c869}section{border:1px solid #456;border-radius:10px;padding:16px;margin:16px 0}
audio{width:100%}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px}
.voice{background:#173047;padding:12px;border-radius:8px}select,input,button{font:inherit;padding:8px}
small{color:#bdd;overflow-wrap:anywhere}.note{background:#233747;padding:14px;border-left:4px solid #e5ba61}
</style>"""


def page(course, title, stage, number, source, manifest):
    manifest_sha = sha(source)
    out = [f'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{h(title)} {h(stage)} {number} audio review</title>', STYLE,
           f'<p><a href="index.html">← {h(title)} index</a></p><h1>{h(title)} · {h(stage.title())} {number}</h1>',
           '<p class="note">Private listening worksheet. Select a decision for every clip and export it. A worksheet alone does not change learner playback, course review, or release status.</p>',
           f'<p>Manifest SHA-256: <code>{manifest_sha}</code></p><label>Reviewer <input id="reviewer"></label>']
    clips = manifest['clips']
    for i, (display, entry) in enumerate(clips.items(), 1):
        display = entry.get('displayText', display)
        voices = entry.get('voices', entry)
        out.append(f'<section><h2>{i}. <span lang="{h(manifest["locale"])}">{h(display)}</span></h2><div class="grid">')
        for gender in ('female', 'male'):
            clip = voices[gender]
            spoken = clip.get('spokenText', display)
            relative = Path('..') / source.parent.name / clip['name']
            out.append(f'<div class="voice"><strong>{h(gender.title())}</strong><audio controls preload="none" src="{h(relative.as_posix())}"></audio>'
                       f'<p><small>Spoken: {h(spoken)}<br>{h(clip["voice"])} · {h(clip["durationSeconds"])}s<br>SHA-256: {h(clip["sha256"])}</small></p>'
                       f'<select data-display="{h(display)}" data-spoken="{h(spoken)}" data-voice="{gender}" data-sha="{h(clip["sha256"])}">'
                       '<option value="unreviewed">Unreviewed</option><option value="accept">Accept</option><option value="retake">Retake</option></select></div>')
        out.append('</div></section>')
    out.append(f'''<button id="export">Export review decisions</button><script>
document.getElementById("export").onclick=()=>{{
 const results=[...document.querySelectorAll("select[data-display]")].map(s=>({{displayText:s.dataset.display,spokenText:s.dataset.spoken,voice:s.dataset.voice,sha256:s.dataset.sha,status:s.value}}));
 const record={{course:{json.dumps(course)},stage:{json.dumps(stage)},lesson:{number},manifestSHA256:{json.dumps(manifest_sha)},reviewer:document.getElementById("reviewer").value,exportedAt:new Date().toISOString(),results}};
 const blob=new Blob([JSON.stringify(record,null,2)],{{type:"application/json"}}),a=document.createElement("a");
 a.href=URL.createObjectURL(blob);a.download={json.dumps(f'{course}-{stage}-{number}-review.json')};a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}};</script></html>''')
    return '\n'.join(out)


def select_manifest(course_dir, stage, number):
    source = course_dir / f'{stage}-{number}-complete' / 'manifest.json'
    if not source.exists():
        source = course_dir / f'{stage}-{number}' / 'manifest.json'
    if not source.exists():
        raise FileNotFoundError(f'Missing {stage} {number} manifest under {course_dir}')
    return source


def expected_clips(source, manifest):
    """Return exact worksheet rows, checking recorded file identity as we go."""
    rows = {}
    for display, entry in manifest['clips'].items():
        display = entry.get('displayText', display)
        voices = entry.get('voices', entry)
        for gender in ('female', 'male'):
            clip = voices[gender]
            spoken = clip.get('spokenText', display)
            if Path(clip['name']).name != clip['name'] or clip['name'] in ('.', '..'):
                raise ValueError(f'Unsafe clip name: {clip["name"]}')
            file = source.parent / clip['name']
            if not file.is_file() or file.stat().st_size != clip['bytes'] or sha(file) != clip['sha256']:
                raise ValueError(f'Audio identity mismatch: {file}')
            if clip['locale'] != manifest['locale'] or clip['voice'] != f'{manifest["locale"]}-Chirp3-HD-{"Aoede" if gender == "female" else "Charon"}':
                raise ValueError(f'Voice identity mismatch: {file}')
            if not isinstance(clip['durationSeconds'], (int, float)) or not 0.1 < clip['durationSeconds'] < 120:
                raise ValueError(f'Duration metadata mismatch: {file}')
            key = (display, spoken, gender, clip['sha256'])
            if key in rows:
                raise ValueError(f'Duplicate clip: {key}')
            rows[key] = clip
    return rows


def verify_review(receipt_path, source, course, stage, number):
    """Check exact exported decisions; the JSON cannot authenticate its reviewer."""
    manifest = json.loads(source.read_text())
    receipt = json.loads(receipt_path.read_text())
    expected_locale = {item[0]: item[1] for item in COURSES}[course]
    if manifest.get('locale') != expected_locale:
        raise ValueError(f'Wrong course locale: {source}')
    if (receipt.get('course'), receipt.get('stage'), receipt.get('lesson'), receipt.get('manifestSHA256')) != (course, stage, number, sha(source)):
        raise ValueError(f'Receipt scope or manifest hash mismatch: {receipt_path}')
    if not isinstance(receipt.get('reviewer'), str) or not receipt['reviewer'].strip() or not receipt.get('exportedAt'):
        raise ValueError(f'Missing reviewer or export time: {receipt_path}')
    expected = expected_clips(source, manifest)
    actual = {}
    for row in receipt.get('results', []):
        key = (row.get('displayText'), row.get('spokenText'), row.get('voice'), row.get('sha256'))
        if key in actual:
            raise ValueError(f'Duplicate decision: {receipt_path}: {key}')
        if row.get('status') not in ('accept', 'retake', 'unreviewed'):
            raise ValueError(f'Invalid decision: {receipt_path}: {key}')
        actual[key] = row['status']
    if actual.keys() != expected.keys():
        raise ValueError(f'Missing, extra or changed clip decisions: {receipt_path}')
    return {'course': course, 'stage': stage, 'lesson': number, 'manifestSHA256': sha(source),
            'reviewer': receipt['reviewer'].strip(), 'exportedAt': receipt['exportedAt'],
            'clips': len(expected), 'accepted': sum(status == 'accept' for status in actual.values()),
            'retake': sum(status == 'retake' for status in actual.values()),
            'unreviewed': sum(status == 'unreviewed' for status in actual.values())}


def build(root):
    for course, locale, title in COURSES:
        course_dir = root / course
        output = course_dir / 'course-listening-review'
        output.mkdir(exist_ok=True)
        index = [f'<!doctype html><html lang="en"><meta charset="utf-8"><title>{h(title)} listening review</title>', STYLE,
                 f'<h1>{h(title)} · private 60-lesson listening review</h1>',
                 '<p class="note">These are draft recordings. Prior owner approval of selected pilots is recorded separately. The pages here do not mark any other clip approved.</p>']
        total = 0
        for stage, count in STAGES:
            index.append(f'<h2>{h(stage.title())}</h2><ul>')
            for number in range(1, count + 1):
                source = select_manifest(course_dir, stage, number)
                manifest = json.loads(source.read_text())
                if manifest.get('locale') != locale:
                    raise ValueError(f'Wrong locale: {source}')
                expected_clips(source, manifest)
                name = f'{stage}-{number}.html'
                (output / name).write_text(page(course, title, stage, number, source, manifest))
                n = len(manifest['clips']) * 2
                total += n
                index.append(f'<li><a href="{name}">{h(stage.title())} {number}</a> · {n} clips · manifest {sha(source)[:12]}</li>')
            index.append('</ul>')
        index.append(f'<p>{total} clips across 60 lesson worksheets.</p></html>')
        (output / 'index.html').write_text('\n'.join(index))
        print(course, total, output / 'index.html')


def verify(root, reviews):
    summaries = []
    missing = []
    for course, locale, _ in COURSES:
        for stage, count in STAGES:
            for number in range(1, count + 1):
                source = select_manifest(root / course, stage, number)
                receipt = reviews / f'{course}-{stage}-{number}-review.json'
                if not receipt.is_file():
                    missing.append(receipt.name)
                    continue
                summaries.append(verify_review(receipt, source, course, stage, number))
    report = {'reviewedLessons': len(summaries), 'requiredLessons': 120,
              'reviewedClips': sum(x['clips'] for x in summaries),
              'acceptedClips': sum(x['accepted'] for x in summaries),
              'retakeClips': sum(x['retake'] for x in summaries),
              'unreviewedClips': sum(x['unreviewed'] for x in summaries),
              'missingReceipts': missing, 'allExportedDecisionsAccepted': not missing and all(x['accepted'] == x['clips'] for x in summaries),
              'lessons': summaries}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if not report['allExportedDecisionsAccepted']:
        raise SystemExit(1)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('command', choices=('build', 'verify'))
    parser.add_argument('--audio-root', type=Path, required=True)
    parser.add_argument('--reviews', type=Path)
    args = parser.parse_args()
    if args.command == 'build':
        build(args.audio_root)
    else:
        if not args.reviews:
            parser.error('--reviews required for verify')
        verify(args.audio_root, args.reviews)


if __name__ == '__main__':
    main()
