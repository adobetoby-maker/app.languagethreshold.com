#!/usr/bin/env python3
"""Build private lesson-level listening sheets for French pronunciation audio."""

import argparse
import html
import json
from collections import defaultdict
from pathlib import Path
from runpy import run_path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "content/french-pronunciation/private-audio-scope-fr-en.json"
DEFAULT_AUDIO = Path("/Users/drive/lt-audio/french-pronunciation/private-f1-c6-2026-11-10")
VERIFY = run_path(str(Path(__file__).with_name("verify-french-pronunciation-private-audio.py")))["verify"]


def document(title, body):
    return (
        '<!doctype html><html lang="en"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1">'
        f"<title>{html.escape(title)}</title>"
        "<style>body{font:18px system-ui,sans-serif;line-height:1.5;max-width:850px;"
        "margin:2rem auto;padding:0 1rem;background:#f8f7f3;color:#172331}"
        "h1{font-size:1.7rem}h2{font-size:1.2rem}section{border:1px solid #aeb8c2;"
        "border-radius:12px;padding:1rem;margin:1rem 0;background:white}"
        "audio{display:block;width:100%;margin:.3rem 0 1rem}a{color:#164a79}"
        "p{margin:.45rem 0}</style>"
        f"<main><h1>{html.escape(title)}</h1>{body}</main></html>\n"
    )


def build(audio_root):
    evidence = VERIFY(audio_root)
    inventory = json.loads(INVENTORY.read_text())
    manifest = json.loads((audio_root / "manifest.json").read_text())
    by_lesson = defaultdict(list)
    for row in inventory["texts"]:
        for occurrence in row["occurrences"]:
            lesson_id = occurrence["lessonId"]
            if row["sha256"] not in by_lesson[lesson_id]:
                by_lesson[lesson_id].append(row["sha256"])
    items = []
    for stage in ("foundation", "core"):
        for lesson_id in inventory["stageLessons"][stage]:
            number = int(lesson_id.split(":")[1])
            title = f"French pronunciation {stage.title()} {number} listening review"
            body = ["<p>Private recordings. Listen to both voices for exact wording and natural pronunciation. These clips are not approved for learner playback.</p>"]
            for index, key in enumerate(by_lesson[lesson_id], 1):
                voices = manifest["clips"][key]
                text = voices["female"]["spokenText"]
                parts = [f"<section><h2>{index}. {html.escape(text)}</h2>"]
                for gender in ("female", "male"):
                    clip = voices[gender]
                    name = clip["name"]
                    assert Path(name).name == name and clip["spokenText"] == text
                    parts.append(f"<p>{gender.title()} · {html.escape(clip['voice'])} · {clip['durationSeconds']} s</p>")
                    parts.append(f'<audio controls preload="none" src="{html.escape(name, quote=True)}"></audio>')
                parts.append("</section>")
                body.append("".join(parts))
            filename = f"listening-review-{stage}-{number}.html"
            path = audio_root / filename
            path.write_text(document(title, "".join(body)), encoding="utf-8")
            path.chmod(0o600)
            items.append(f'<li><a href="{html.escape(filename)}">{stage.title()} {number}</a> — {len(by_lesson[lesson_id])} texts</li>')
    title = "French pronunciation private listening review"
    index_path = audio_root / "listening-review-index.html"
    index_path.write_text(document(title,
        f"<p>{evidence['lessons']} draft lessons, {evidence['uniqueExactTexts']} unique texts, {evidence['verifiedClips']} technically verified clips. Listening review is open; no playback is published.</p>"
        "<ol>" + "".join(items) + "</ol>"), encoding="utf-8")
    index_path.chmod(0o600)
    return {"index": str(index_path), "lessonSheets": len(items), "verifiedClips": evidence["verifiedClips"], "listeningReviewed": False}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio-root", type=Path, default=DEFAULT_AUDIO)
    args = parser.parse_args()
    print(json.dumps(build(args.audio_root), ensure_ascii=False))


if __name__ == "__main__":
    main()
