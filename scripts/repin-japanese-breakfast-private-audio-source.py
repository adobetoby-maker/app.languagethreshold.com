#!/usr/bin/env python3
"""Re-pin private MP3 provenance after a text-identical source metadata edit.

Requires the saved prior inventory. Refuses any card/Reader text or occurrence
change. Audio bytes and listening/release flags are never changed.
"""

import argparse
import hashlib
import json
from pathlib import Path
from runpy import run_path

GEN = run_path(str(Path(__file__).with_name("generate-japanese-breakfast-private-hd-audio.py")))
OUTPUT = GEN["OUTPUT"]
sha = GEN["sha"]
source = GEN["source"]


def repin(previous, apply=False):
    old_raw = previous.read_bytes()
    old = json.loads(old_raw)
    new, new_sha = source()
    for key in ("texts", "counts", "exactTextSha256", "pairKey", "locale", "voices",
                "includedFields", "excludedFields", "reviewed", "registered", "listeningReviewed"):
        if old[key] != new[key]:
            raise ValueError(f"Audio source content or identity changed: {key}")
    manifest_path = OUTPUT / "manifest.json"
    original = manifest_path.read_bytes()
    manifest = json.loads(original)
    if (manifest.get("sourceInventorySha256"), manifest.get("sourceSha256"),
        manifest.get("exactTextSha256"), manifest.get("textReviewed"),
        manifest.get("listeningReviewed"), manifest.get("registered")) != (
        sha(old_raw), old["sourceSha256"], old["exactTextSha256"], False, False, False):
        raise ValueError("Private manifest does not match prior pinned source")
    rows = {row["sha256"]: row for row in new["texts"]}
    if set(manifest["clips"]) != set(rows):
        raise ValueError("Manifest text coverage changed")
    clips = 0
    for key, recorded in manifest["clips"].items():
        row = rows[key]
        if recorded["text"] != row["text"] or recorded["occurrences"] != row["occurrences"]:
            raise ValueError(f"Manifest text or occurrence changed: {key}")
        if set(recorded["voices"]) != {"female", "male"}:
            raise ValueError(f"Manifest voice coverage changed: {key}")
        for clip in recorded["voices"].values():
            path = OUTPUT / clip["name"]
            data = path.read_bytes()
            if (clip["text"], clip["sha256"], clip["bytes"], clip["listeningReviewed"]) != (
                    row["text"], sha(data), len(data), False):
                raise ValueError(f"Clip bytes or review state changed: {path.name}")
            clips += 1
    if clips != 2360:
        raise ValueError("Incomplete full-course audio")
    report = {"oldInventorySha256": sha(old_raw), "newInventorySha256": new_sha,
              "exactTextSha256": new["exactTextSha256"], "unchangedClips": clips,
              "applied": apply}
    if apply:
        manifest["sourceInventorySha256"] = new_sha
        manifest["sourceSha256"] = new["sourceSha256"]
        temporary = manifest_path.with_suffix(".json.part")
        temporary.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(manifest_path)
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--previous-inventory", type=Path, required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    print(json.dumps(repin(args.previous_inventory, args.apply), ensure_ascii=False))
