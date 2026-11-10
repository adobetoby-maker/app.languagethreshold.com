#!/usr/bin/env python3
"""Make private, source-verified French Roofing audio listening sheets."""

import html
import json
from pathlib import Path
from runpy import run_path

CHECK = run_path(str(Path(__file__).with_name("verify-french-roofing-private-hd-audio.py")))
OUTPUT = CHECK["OUTPUT"]
verify = CHECK["verify"]
source = CHECK["GENERATOR"]["source"]


def page(title, body):
    return ('<!doctype html><html lang="en"><meta charset="utf-8">'
            '<meta name="viewport" content="width=device-width, initial-scale=1">'
            f'<title>{html.escape(title)}</title>'
            '<style>body{font:18px system-ui,sans-serif;line-height:1.5;max-width:900px;'
            'margin:2rem auto;padding:0 1rem;background:#f8f7f2;color:#17212c}'
            'section{border:1px solid #bac3cc;border-radius:12px;padding:1rem;'
            'margin:1rem 0;background:white}h1{font-size:1.7rem}h2{font-size:1.2rem}'
            'audio{display:block;width:100%;margin:.35rem 0 1rem}a{color:#164a79}</style>'
            f'<main><h1>{html.escape(title)}</h1>{body}</main></html>\n')


def stage_of(lesson_id):
    stage, number = lesson_id.split(":")
    if stage not in ("foundation", "core", "master") or not number.isdigit():
        raise ValueError(f"Unknown lesson identity: {lesson_id}")
    return stage


def build():
    report = verify()
    inventory, _ = source()
    manifest = json.loads((OUTPUT / "manifest.json").read_text())
    groups = {"foundation": [], "core": [], "master": []}
    lessons = {}
    for row in inventory["texts"]:
        stages = {stage_of(occ["draftLessonKey"]) for occ in row["occurrences"]}
        for stage in stages:
            groups[stage].append(row)
        for lesson_id in {occ["draftLessonKey"] for occ in row["occurrences"]}:
            lessons.setdefault(lesson_id, {})[row["sha256"]] = row
    if {stage: len([key for key in lessons if stage_of(key) == stage]) for stage in groups} != {
            "foundation": 10, "core": 30, "master": 20}:
        raise ValueError("Listening sheet lesson coverage changed")
    index_links = []
    for stage, rows in groups.items():
        lesson_links = []
        selected = sorted((key for key in lessons if stage_of(key) == stage),
                          key=lambda key: int(key.split(":")[1]))
        for lesson_id in selected:
            number = int(lesson_id.split(":")[1])
            parts = ['<p>Private listening review. These recordings are not approved or available to learners.</p>']
            for item_number, row in enumerate(lessons[lesson_id].values(), 1):
                recorded = manifest["clips"][row["sha256"]]
                parts.append(f'<section><h2>{item_number}. {html.escape(row["text"])}</h2>')
                refs = [o["field"] for o in row["occurrences"] if o["draftLessonKey"] == lesson_id]
                parts.append(f'<p>{html.escape("; ".join(refs))}</p>')
                for gender in ("female", "male"):
                    clip = recorded["voices"][gender]
                    name = clip["name"]
                    if Path(name).name != name:
                        raise ValueError("Unsafe clip filename")
                    parts.append(f'<p>{gender.title()} · {html.escape(clip["voice"])}</p>')
                    parts.append(f'<audio controls preload="none" src="{html.escape(name, quote=True)}"></audio>')
                parts.append('</section>')
            filename = f"{stage}-{number}-listening-review-2026-11-09.html"
            sheet = OUTPUT / filename
            sheet.write_text(page(f"French Roofing {stage.title()} {number} listening review", "".join(parts)),
                             encoding="utf-8")
            sheet.chmod(0o600)
            lesson_links.append(f'<li><a href="{filename}">Lesson {number}</a> — '
                                f'{len(lessons[lesson_id])} exact strings</li>')
        filename = f"{stage}-listening-review-2026-11-09.html"
        sheet = OUTPUT / filename
        sheet.write_text(page(f"French Roofing {stage.title()} listening review",
                              '<p>All clips await qualified French listening review.</p><ol>'
                              + ''.join(lesson_links) + '</ol>'), encoding="utf-8")
        sheet.chmod(0o600)
        index_links.append(f'<li><a href="{filename}">{stage.title()}</a> — '
                           f'{len(selected)} lessons, {len(rows)} distinct stage strings</li>')
    index = OUTPUT / "listening-review-2026-11-09.html"
    index.write_text(page("French Roofing listening review",
                          '<p>All clips await qualified French listening review.</p><ul>'
                          + ''.join(index_links) + '</ul>'), encoding="utf-8")
    index.chmod(0o600)
    return {**report, "lessonSheets": len(lessons),
            "stageTextCounts": {k: len(v) for k, v in groups.items()},
            "listeningIndex": str(index)}


if __name__ == "__main__":
    print(json.dumps(build(), ensure_ascii=False))
