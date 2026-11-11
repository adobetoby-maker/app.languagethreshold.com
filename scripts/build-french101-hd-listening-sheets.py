#!/usr/bin/env python3
"""Build private, source-verified French 101 listening worksheets."""

import argparse
import html
import json
from pathlib import Path
from runpy import run_path

CHECK = run_path(str(Path(__file__).with_name("verify-french101-hd-audio.py")))
SOURCES = CHECK["SOURCES"]
verify_lesson = CHECK["verify_lesson"]


def page(title, body):
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<title>{html.escape(title)}</title>'
        '<style>body{font:18px system-ui,sans-serif;line-height:1.5;max-width:850px;'
        'margin:2rem auto;padding:0 1rem;background:#f9f7f2;color:#1b2430}'
        'h1{font-size:1.7rem}h2{font-size:1.2rem}section{border:1px solid #b9c0c8;'
        'border-radius:12px;padding:1rem;margin:1rem 0;background:white}'
        'audio{display:block;width:100%;margin:.35rem 0 1rem}a{color:#164a79}'
        'p{margin:.4rem 0}</style>'
        f'<main><h1>{html.escape(title)}</h1>{body}</main></html>\n'
    )


def build(stage, output_root, first_folder=None):
    count, _, _ = SOURCES[stage]
    index_items = []
    total_clips = 0
    for number in range(1, count + 1):
        folder = output_root / (first_folder if number == 1 and first_folder else f"{stage}-{number}")
        report = verify_lesson(stage, number, folder)
        manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
        sections = ["<p>Private listening review. These recordings are not approved or available to learners.</p>"]
        for index, row in enumerate(manifest["clips"].values(), 1):
            part = [f'<section><h2>{index}. {html.escape(row["displayText"])}</h2>']
            if row["spokenText"] != row["displayText"]:
                part.append(f'<p>Spoken dialogue: {html.escape(row["spokenText"])}</p>')
            for gender in ("female", "male"):
                clip = row["voices"][gender]
                name = clip["name"]
                if Path(name).name != name:
                    raise ValueError("Unsafe clip filename")
                part.append(f'<p>{gender.title()} · {html.escape(clip["voice"])}</p>')
                part.append(f'<audio controls preload="none" src="{html.escape(name, quote=True)}"></audio>')
            sections.append("".join(part) + "</section>")
        title = f"French 101 {stage.title()} {number} listening review"
        sheet = folder / "listening-review-2026-11-09.html"
        sheet.write_text(page(title, "".join(sections)), encoding="utf-8")
        sheet.chmod(0o600)
        index_items.append(f'<li><a href="{html.escape(folder.name)}/{sheet.name}">Lesson {number}</a> — {report["texts"]} texts, {report["clips"]} clips</li>')
        total_clips += report["clips"]
    index = output_root / f"{stage}-listening-review-2026-11-09.html"
    index.write_text(page(f"French 101 {stage.title()} listening review",
                          "<p>All recordings on these sheets await listening approval.</p><ol>" + "".join(index_items) + "</ol>"),
                     encoding="utf-8")
    index.chmod(0o600)
    return {"stage": stage, "lessons": count, "perLessonClips": total_clips,
            "index": str(index), "listeningReviewed": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", required=True, choices=SOURCES)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--first-folder")
    args = parser.parse_args()
    print(json.dumps(build(args.stage, args.output_root, args.first_folder), ensure_ascii=False))
