"""Verify private two-voice Japanese 101 audio coverage for one full stage."""

import argparse
import json
from pathlib import Path
from runpy import run_path

BATCH = run_path(str(Path(__file__).with_name("verify-japanese-hd-batch.py")))
ROOT = BATCH["ROOT"]
normalized = BATCH["normalized"]
verify = BATCH["verify"]

STAGES = {
    "foundation-japanese-basics": (10, "foundation"),
    "japanese-basics": (30, "core"),
    "master-japanese-basics": (20, "master"),
}


def verify_stage(module, output_root, first_folder=None):
    if module not in STAGES:
        raise ValueError("Unsupported Japanese 101 stage")
    count, prefix = STAGES[module]
    source = json.loads((ROOT / "public/lesson-content/ja" / f"{module}.json").read_text(encoding="utf-8"))
    if source.get("language") != "Japanese" or source.get("nativeLanguage") != "English":
        raise ValueError("Wrong source language pair")
    if len(source["lessons"]) != count:
        raise ValueError("Wrong stage lesson count")
    expected = set()
    covered = set()
    clips = 0
    bytes_total = 0
    for number in range(1, count + 1):
        lesson = source["lessons"][str(number)]
        values = [*lesson["passage"]["target"], *(word["es"] for word in lesson["words"])]
        expected.update(normalized(value) for value in values)
        folder_name = first_folder if number == 1 and first_folder else f"{prefix}-{number}"
        folder = output_root / folder_name
        report = verify(module, number, folder)
        manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
        covered.update(manifest["clips"])
        clips += report["clips"]
        bytes_total += report["bytes"]
    if expected != covered:
        raise ValueError(f"Stage source coverage mismatch: {len(expected - covered)} missing, {len(covered - expected)} extra")
    return {
        "module": module,
        "lessons": count,
        "uniqueTexts": len(expected),
        "distinctTextVoicePairs": len(expected) * 2,
        "perLessonClips": clips,
        "duplicatePairsAcrossLessonFolders": clips - len(expected) * 2,
        "bytes": bytes_total,
        "listeningReviewed": False,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--module", required=True)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--first-folder", help="Optional nonstandard folder for stage lesson 1")
    args = parser.parse_args()
    print(json.dumps(verify_stage(args.module, args.output_root, args.first_folder), ensure_ascii=False))
