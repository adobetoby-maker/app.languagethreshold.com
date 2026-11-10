#!/usr/bin/env python3
"""Copy verified Foreman pilot bytes into the private full-course audio set."""

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INVENTORY = ROOT / "docs/japanese-program/foreman-full-audio-inventory-2026-11-09.json"
PILOTS = Path("/Users/drive/lt-audio/japanese-foreman")
OUTPUT = PILOTS / "full-course-2026-11-09"


def duration(path):
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
         "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return round(float(result.stdout.strip()), 3)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    subprocess.run([sys.executable, str(ROOT / "scripts/audit-japanese-foreman-full-audio.py"), "--check"],
                   capture_output=True, text=True, check=True)
    inventory_bytes = INVENTORY.read_bytes()
    inventory = json.loads(inventory_bytes)
    if args.output.exists():
        raise ValueError("Full-course output already exists; never overwrite imported or generated clips")
    selected = {}
    for folder in ("foundation-1", "foundation-2-3", "foundation-4-5"):
        pilot = PILOTS / folder
        manifest = json.loads((pilot / "manifest.json").read_text())
        if manifest["pairKey"] != "Japanese:English" or manifest["locale"] != "ja-JP" or manifest["voices"] != inventory["voices"]:
            raise ValueError(f"Pilot identity changed: {folder}")
        for text_hash, voices in manifest["clips"].items():
            if set(voices) != set(inventory["voices"]):
                raise ValueError(f"Pilot voice pair incomplete: {folder} {text_hash}")
            for gender, record in voices.items():
                text = record["text"]
                if text_hash != hashlib.sha256(text.encode()).hexdigest():
                    raise ValueError(f"Pilot text hash changed: {folder} {text}")
                if text not in inventory["strings"] or inventory["strings"][text]["spokenText"] != text:
                    continue  # A later authored source changed; the old recording is not eligible.
                if record["voice"] != inventory["voices"][gender] or record["locale"] != "ja-JP":
                    raise ValueError(f"Pilot voice changed: {folder} {text}")
                path = pilot / record["name"]
                data = path.read_bytes()
                if (len(data) != record["bytes"] or hashlib.sha256(data).hexdigest() != record["sha256"]
                        or duration(path) != record["durationSeconds"]):
                    raise ValueError(f"Pilot MP3 changed: {path}")
                key = (text, gender)
                candidate = (folder, path, record)
                if key in selected:
                    old = selected[key]
                    if bool(old[2]["listeningReviewed"]) and not bool(record["listeningReviewed"]):
                        continue
                    if bool(old[2]["listeningReviewed"]) == bool(record["listeningReviewed"]):
                        raise ValueError(f"Ambiguous duplicate pilot: {text} {gender}")
                selected[key] = candidate
    os.umask(0o077)
    args.output.mkdir(parents=True, mode=0o700)
    manifest = {
        "schema": 1, "pairKey": "Japanese:English", "locale": "ja-JP", "voices": inventory["voices"],
        "sourceInventorySHA256": hashlib.sha256(inventory_bytes).hexdigest(),
        "stringsSHA256": inventory["stringsSHA256"], "scope": "all",
        "listeningReviewed": False, "registered": False, "clips": {},
    }
    for (text, gender), (folder, source, record) in sorted(selected.items()):
        name = f"ja-foreman-{hashlib.sha256(text.encode()).hexdigest()[:20]}-{gender}.mp3"
        shutil.copyfile(source, args.output / name)
        manifest["clips"].setdefault(text, {})[gender] = {
            "name": name, "voice": record["voice"], "locale": "ja-JP", "spokenText": text,
            "bytes": record["bytes"], "durationSeconds": record["durationSeconds"],
            "sha256": record["sha256"], "listeningReviewed": record["listeningReviewed"],
            "originPilot": folder,
        }
    (args.output / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"importedClips": len(selected),
                      "previouslyListened": sum(bool(record["listeningReviewed"]) for _, _, record in selected.values()),
                      "sourceInventorySHA256": manifest["sourceInventorySHA256"],
                      "output": str(args.output)}))


if __name__ == "__main__":
    main()
