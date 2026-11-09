"""Fail closed on private two-voice coverage for all Japanese 101 lessons."""

import argparse
import json
from pathlib import Path
from runpy import run_path

STAGE = run_path(str(Path(__file__).with_name("verify-japanese-hd-stage.py")))
ROOT = STAGE["ROOT"]
normalized = STAGE["normalized"]
verify_stage = STAGE["verify_stage"]

SCOPES = (
    ("foundation-japanese-basics", "foundation", 10, "foundation-1-complete"),
    ("japanese-basics", "core", 30, None),
    ("master-japanese-basics", "master", 20, None),
)


def verify_course(output_root):
    inventory = json.loads((ROOT / "docs/japanese-program/audio-inventory.json").read_text(encoding="utf-8"))
    expected = set()
    covered = set()
    stage_reports = []
    for module, prefix, count, first_folder in SCOPES:
        stage_reports.append(verify_stage(module, output_root, first_folder))
        source = json.loads((ROOT / "public/lesson-content/ja" / f"{module}.json").read_text(encoding="utf-8"))
        for number in range(1, count + 1):
            lesson = source["lessons"][str(number)]
            values = [*lesson["passage"]["target"], *(word["es"] for word in lesson["words"])]
            expected.update(normalized(value) for value in values)
            folder = output_root / (first_folder if number == 1 and first_folder else f"{prefix}-{number}")
            manifest = json.loads((folder / "manifest.json").read_text(encoding="utf-8"))
            if manifest.get("sourceSHA256") != inventory["normalizedTextSHA256"]:
                raise ValueError("Course source fingerprint mismatch")
            covered.update(manifest["clips"])
    if expected != covered or len(expected) != inventory["uniqueTexts"]:
        raise ValueError(f"Course coverage mismatch: {len(expected - covered)} missing, {len(covered - expected)} extra")
    return {
        "sourceSHA256": inventory["normalizedTextSHA256"],
        "lessons": 60,
        "uniqueTexts": len(expected),
        "distinctTextVoicePairs": len(expected) * 2,
        "perLessonClips": sum(report["perLessonClips"] for report in stage_reports),
        "stages": stage_reports,
        "listeningReviewed": False,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output-root", required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(verify_course(args.output_root), ensure_ascii=False))
