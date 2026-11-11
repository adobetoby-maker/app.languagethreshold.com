#!/usr/bin/env python3
"""Pin the Spanish 101 purpose map to the current French/Japanese 101 drafts.

This is a source crosswalk, not linguistic approval or release validation.
"""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path


STAGES = {
    "foundation": ("src/data/core60/es/foundation-spanish-basics.json", 10),
    "core": ("src/data/spanish-basics-core.json", 30),
    "master": ("src/data/core60/es/master-spanish-basics.json", 20),
}


def revision(root, reference="HEAD"):
    return subprocess.check_output(["git", "rev-parse", reference], cwd=root, text=True).strip()


def spanish_base_revision(root):
    return subprocess.check_output(["git", "merge-base", "HEAD", "origin/main"], cwd=root, text=True).strip()


def load(root, relative, sources, repository):
    path = root / relative
    data = path.read_bytes()
    sources.append({"repository": repository, "path": relative, "sha256": hashlib.sha256(data).hexdigest()})
    return json.loads(data)


def number_rows(rows, expected, label):
    if len(rows) != expected:
        raise ValueError(f"{label}: expected {expected} rows, got {len(rows)}")
    numbered = {}
    for position, row in enumerate(rows, 1):
        n = row.get("n", position)
        if n != position or n in numbered:
            raise ValueError(f"{label}: missing, duplicate, or reordered lesson {position}")
        numbered[n] = row
    return numbered


def french_rows(root, stage, expected, sources):
    folder = root / "content/french-basics"
    suffix = "-redesign-draft.json" if stage == "master" else "-draft.json"
    paths = sorted(folder.glob(f"{stage}-*{suffix}"))
    rows = {}
    for path in paths:
        relative = str(path.relative_to(root))
        document = load(root, relative, sources, "french")
        if document.get("reviewed") is not False or document.get("registered", False) is not False:
            raise ValueError(f"{relative}: expected private unreviewed draft")
        for row in document["lessons"]:
            n = row["n"]
            if n in rows:
                raise ValueError(f"{stage} {n}: duplicate French lesson")
            if stage == "master" and row.get("stableLessonKey") != f"master-french-basics:{n}":
                raise ValueError(f"{stage} {n}: French stable lesson identity changed")
            rows[n] = (row, relative)
    if sorted(rows) != list(range(1, expected + 1)):
        raise ValueError(f"{stage}: French draft numbering incomplete")
    return rows


def build(spanish_root, japanese_root, french_root):
    sources = []
    result = {
        "schema": "fr-ja-101-spanish-purpose-crosswalk-v1",
        "scope": "Source-level lesson mapping only; no linguistic, audio, runtime, native, or release approval",
        "revisions": {
            "spanish": spanish_base_revision(spanish_root),
            "japanese": revision(japanese_root),
            "french": revision(french_root),
        },
        "pairs": {"spanish": "Spanish:English", "japanese": "Japanese:English", "french": "French:English"},
        "reviewed": False,
        "sources": sources,
        "lessons": [],
    }
    for stage, (spanish_path, expected) in STAGES.items():
        spanish_document = load(spanish_root, spanish_path, sources, "spanish")
        japanese_path = f"content/japanese-basics/{stage}.json"
        japanese_document = load(japanese_root, japanese_path, sources, "japanese")
        if spanish_document["reviewed"] is not False or japanese_document["reviewed"] is not False:
            raise ValueError(f"{stage}: expected unreviewed source")
        spanish = number_rows(spanish_document["lessons"], expected, f"Spanish {stage}")
        japanese = number_rows(japanese_document["lessons"], expected, f"Japanese {stage}")
        french = french_rows(french_root, stage, expected, sources)
        for n in range(1, expected + 1):
            s, j = spanish[n], japanese[n]
            f, french_path = french[n]
            if stage != "master" and f.get("sourceObjectiveEnglish") != s["objective"]:
                raise ValueError(f"French {stage} {n}: Spanish objective provenance changed")
            result["lessons"].append({
                "stage": stage,
                "number": n,
                "spanish": {"title": s["title"], "objective": s["objective"], "focus": s["focus"], "source": spanish_path},
                "japanese": {"title": j["title"], "focus": j["focus"], "source": japanese_path},
                "french": {"title": f["title"], "objective": f["objective"], "focus": f["focus"], "source": french_path},
                "alignmentReview": "pending-qualified-review",
            })
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--spanish-root", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--japanese-root", type=Path, required=True)
    parser.add_argument("--french-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=Path("docs/language-101-spanish-french-japanese-crosswalk.json"))
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    output = json.dumps(build(args.spanish_root.resolve(), args.japanese_root.resolve(), args.french_root.resolve()), ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not args.output.exists() or args.output.read_text() != output:
            raise SystemExit("Crosswalk is stale; regenerate against pinned sources")
    else:
        args.output.write_text(output)
    print("French/Japanese 101 Spanish-purpose crosswalk: 60 source rows, reviewed:false")


if __name__ == "__main__":
    main()
