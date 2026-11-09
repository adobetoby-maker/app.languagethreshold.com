"""Build private, source-verified listening sheets for one Japanese 101 stage."""

import argparse
import html
import json
from pathlib import Path
from runpy import run_path

CHECK = run_path(str(Path(__file__).with_name("verify-japanese-hd-batch.py")))
verify = CHECK["verify"]

STAGES = {
    "foundation-japanese-basics": (10, "foundation"),
    "japanese-basics": (30, "core"),
    "master-japanese-basics": (20, "master"),
}


def page(title, body):
    return (
        "<!doctype html><html lang=\"en\"><meta charset=\"utf-8\">"
        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">"
        f"<title>{html.escape(title)}</title>"
        "<style>body{font:18px system-ui,sans-serif;line-height:1.5;max-width:850px;"
        "margin:2rem auto;padding:0 1rem;background:#f9f7f2;color:#1b2430}"
        "h1{font-size:1.7rem}h2{font-size:1.2rem}section{border:1px solid #b9c0c8;"
        "border-radius:12px;padding:1rem;margin:1rem 0;background:white}"
        "audio{display:block;width:100%;margin:.35rem 0 1rem}"
        "a{color:#164a79}p{margin:.4rem 0}</style>"
        f"<main><h1>{html.escape(title)}</h1>{body}</main></html>\n"
    )


def write_sheets(module, output_root, first_folder=None):
    if module not in STAGES:
        raise ValueError("Unsupported Japanese 101 stage")
    count, prefix = STAGES[module]
    index_items = []
    total_clips = 0
    for number in range(1, count + 1):
        folder = output_root / (first_folder if number == 1 and first_folder else f"{prefix}-{number}")
        report = verify(module, number, folder)
        manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
        sections = ["<p>Private listening review. These clips are not approved or available to learners.</p>"]
        for index, (key, voices) in enumerate(manifest["clips"].items(), 1):
            parts = [f"<section><h2>{index}. {html.escape(voices['female']['spokenText'])}</h2>"]
            for gender in ("female", "male"):
                clip = voices[gender]
                name = clip["name"]
                if Path(name).name != name:
                    raise ValueError("Unsafe clip filename")
                parts.append(f"<p>{gender.title()} · {html.escape(clip['voice'])}</p>")
                parts.append(f"<audio controls preload=\"none\" src=\"{html.escape(name, quote=True)}\"></audio>")
            parts.append("</section>")
            sections.append("".join(parts))
        title = f"Japanese 101 {prefix.title()} {number} listening review"
        worksheet = folder / "listening-review-2026-11-09.html"
        worksheet.write_text(page(title, "".join(sections)), encoding="utf-8")
        worksheet.chmod(0o600)
        index_items.append(f'<li><a href="{html.escape(folder.name)}/{worksheet.name}">Lesson {number}</a> — {report["texts"]} texts, {report["clips"]} clips</li>')
        total_clips += report["clips"]
    index = output_root / f"{prefix}-listening-review-2026-11-09.html"
    title = f"Japanese 101 {prefix.title()} listening review"
    index.write_text(page(title, "<p>All clips on these sheets await listening approval.</p><ol>" + "".join(index_items) + "</ol>"), encoding="utf-8")
    index.chmod(0o600)
    return {"module": module, "lessons": count, "perLessonClips": total_clips, "index": str(index), "listeningReviewed": False}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", required=True)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--first-folder")
    args = parser.parse_args()
    print(json.dumps(write_sheets(args.module, args.output_root, args.first_folder), ensure_ascii=False))
