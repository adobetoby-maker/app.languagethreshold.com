#!/usr/bin/env python3
"""Build a private listening sheet for duplicate French pronunciation takes."""

import html
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "docs/french-program/fr-001-private-full-audio-coverage.json"
OUTPUT = Path("/Users/drive/lt-audio/french-pronunciation/overlap-listening-review-2026-11-10.html")


def main():
    report = json.loads(REPORT.read_text())
    rows = report["overlapCandidates"]
    assert len(rows) == report["overlappingExactTexts"] == 48
    assert report["canonicalPlaybackSelectionMade"] is False
    sections = []
    for index, row in enumerate(rows, 1):
        voices = []
        for voice in ("female", "male"):
            choices = []
            candidates = row["candidates"][voice]
            assert len(candidates) > 1
            for candidate in candidates:
                path = Path(candidate["file"])
                assert path.is_file(), path
                source = quote(path.relative_to(OUTPUT.parent).as_posix(), safe="/")
                label = html.escape(candidate["batch"])
                duration = candidate["durationSeconds"]
                digest = candidate["sha256"]
                choices.append(
                    f'<div class="take"><label><input type="radio" name="choice-{index}-{voice}" '
                    f'data-text={html.escape(json.dumps(row["text"], ensure_ascii=False), quote=True)} '
                    f'data-voice="{voice}" data-batch="{label}" data-sha256="{digest}">'
                    f'{label} · {duration:.3f} s · {digest[:12]}</label>'
                    f'<audio controls preload="none" src="{source}"></audio></div>'
                )
            voices.append(f'<div class="voice"><h3>{voice.title()}</h3>{"".join(choices)}</div>')
        sections.append(f'<section><h2>{index}. {html.escape(row["text"])}</h2>{"".join(voices)}</section>')

    page = f'''<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>French pronunciation cross-batch listening review</title>
<style>body{{font:17px system-ui,sans-serif;line-height:1.45;max-width:980px;margin:2rem auto;padding:0 1rem;background:#f8f7f3;color:#172331}}section{{background:white;border:1px solid #b3bbc3;border-radius:12px;padding:1rem;margin:1rem 0}}h1{{font-size:1.7rem}}h2{{font-size:1.2rem}}h3{{font-size:1rem}}.voice{{display:inline-block;vertical-align:top;width:min(100%,465px)}}.take{{margin:.7rem .5rem .9rem 0}}audio{{display:block;width:95%;margin:.3rem 0}}button{{font:inherit;padding:.5rem 1rem}}label{{cursor:pointer}}p{{max-width:80ch}}</style>
<main><h1>French pronunciation cross-batch listening review</h1>
<p>Private, unreviewed alternatives for {len(rows)} repeated exact phrases. Listen to every take and select one per voice only when its wording and pronunciation are acceptable. Leave a voice unselected when none qualifies. This sheet does not approve clips or change learner playback.</p>
<p><button id="export" type="button">Download selections</button> <span id="count">0 of {len(rows)*2} voice choices selected</span></p>
{''.join(sections)}</main>
<script>
const radios = [...document.querySelectorAll('input[type="radio"]')];
const update = () => document.getElementById('count').textContent = `${{radios.filter(r => r.checked).length}} of {len(rows)*2} voice choices selected`;
radios.forEach(r => r.addEventListener('change', update));
document.getElementById('export').addEventListener('click', () => {{
  const selections = radios.filter(r => r.checked).map(r => ({{text: JSON.parse(r.dataset.text), voice: r.dataset.voice, batch: r.dataset.batch, sha256: r.dataset.sha256}}));
  const payload = {{schema: 1, sourceReport: 'fr-001-private-full-audio-coverage.json', reviewStatus: 'selections-only-unapproved', expectedChoices: {len(rows)*2}, selections}};
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2) + '\\n'], {{type: 'application/json'}}));
  link.download = 'french-pronunciation-overlap-selections.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}});
</script></html>
'''
    OUTPUT.write_text(page)
    print(json.dumps({"sheet": str(OUTPUT), "phrases": len(rows), "voiceChoices": len(rows) * 2}))


if __name__ == "__main__":
    main()
