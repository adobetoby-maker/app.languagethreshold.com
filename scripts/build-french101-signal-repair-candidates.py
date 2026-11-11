#!/usr/bin/env python3
"""Index exact private French 101 signal-repair options without installing audio."""

import argparse
import hashlib
import html
import json
import os
import subprocess
from collections import Counter, defaultdict
from pathlib import Path
from runpy import run_path

SIGNAL = run_path(str(Path(__file__).with_name("audit-french101-audio-signal.py")))
SCOPES = SIGNAL["SCOPES"]
decode = SIGNAL["decode"]


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def duration(path):
    return round(float(subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)], text=True).strip()), 3)


def signal_pass(signal):
    return (signal["peak"] >= 0.02 and signal["rms"] >= 0.004
            and signal["activeSeconds"] >= 0.08 and signal["clippedFraction"] <= 0.001
            and signal["leadingSilenceSeconds"] <= 1 and signal["trailingSilenceSeconds"] <= 1)


def course_records(root):
    digest = hashlib.sha256()
    records = []
    for stage, count, first in SCOPES:
        for n in range(1, count + 1):
            folder = root / (first if n == 1 and first else f"{stage}-{n}")
            manifest_path = folder / "manifest.json"
            raw = manifest_path.read_bytes()
            digest.update(str(manifest_path.relative_to(root)).encode() + b"\0" + raw)
            manifest = json.loads(raw)
            if (manifest["pairKey"] != "French:English" or manifest["locale"] != "fr-FR"
                    or manifest["listeningReviewed"] is not False or manifest["registered"] is not False):
                raise ValueError(f"Wrong pair, locale, or gate: {manifest_path}")
            for row in manifest["clips"].values():
                for voice in row["voices"].values():
                    path = folder / voice["name"]
                    if (voice["spokenText"] != row["spokenText"] or voice["locale"] != "fr-FR"
                            or voice["listeningReviewed"] is not False):
                        raise ValueError(f"Changed text, locale, or review gate: {path}")
                    records.append({
                        "stage": stage, "lesson": n, "path": str(path),
                        "displayText": row["displayText"], "spokenText": row["spokenText"],
                        "voice": voice["voice"], "locale": voice["locale"],
                        "sha256": voice["sha256"], "bytes": voice["bytes"],
                        "durationSeconds": voice["durationSeconds"],
                    })
    return records, digest.hexdigest()


def verify_audio(row):
    path = Path(row["path"])
    if (not path.is_file() or path.stat().st_size != row["bytes"]
            or sha256(path) != row["sha256"]
            or abs(duration(path) - row["durationSeconds"]) > 0.02):
        raise ValueError(f"MP3 bytes, hash, or duration changed: {path}")


def retake_records(root, path, course_by_path):
    data = json.loads(path.read_text())
    if (data["pairKey"] != "French:English" or data["locale"] != "fr-FR"
            or data["listeningReviewed"] is not False or data["registered"] is not False):
        raise ValueError("Retake manifest pair or review gate changed")
    result = {}
    for candidate in data["candidates"]:
        source_path = candidate["sourcePath"]
        original = course_by_path.get(source_path)
        if not original or candidate["originalSHA256"] != original["sha256"]:
            raise ValueError(f"Retake source changed: {source_path}")
        if (candidate["spokenText"] != original["spokenText"]
                or candidate["voice"] != original["voice"]
                or candidate["listeningReviewed"] is not False):
            raise ValueError(f"Retake text, voice, or review changed: {source_path}")
        row = {
            "path": str(path.parent / candidate["name"]), "sha256": candidate["sha256"],
            "bytes": candidate["bytes"], "durationSeconds": candidate["durationSeconds"],
            "spokenText": candidate["spokenText"], "voice": candidate["voice"],
            "locale": "fr-FR",
        }
        verify_audio(row)
        signal = decode(Path(row["path"]))
        if signal != candidate["signal"]:
            raise ValueError(f"Retake signal metadata changed: {row['path']}")
        row["signal"] = signal
        identity = (original["sha256"], original["spokenText"], original["voice"], original["locale"])
        if identity in result:
            raise ValueError(f"Duplicate retake source: {source_path}")
        result[identity] = row
    return result


def build(root, audit_path, retakes_path):
    records, manifest_sha = course_records(root)
    report = json.loads(audit_path.read_text())
    if (report["course"] != "French 101" or report["manifestSetSHA256"] != manifest_sha
            or report["listeningReviewed"] is not False or report["registered"] is not False
            or report["flaggedFiles"] != len(report["flags"])):
        raise ValueError("Stale or wrong-course signal report")
    by_path = {row["path"]: row for row in records}
    by_sha = defaultdict(list)
    by_text_voice = defaultdict(list)
    for row in records:
        by_sha[row["sha256"]].append(row)
        by_text_voice[(row["spokenText"], row["voice"], row["locale"])].append(row)
    retakes = retake_records(root, retakes_path, by_path)
    flagged_sha = set()
    flags_by_sha = {}
    for flag in report["flags"]:
        original = by_path.get(flag["path"])
        if not original or (flag["spokenText"], flag["voice"]) != (original["spokenText"], original["voice"]):
            raise ValueError(f"Signal flag/source changed: {flag['path']}")
        verify_audio(original)
        if original["sha256"] in flagged_sha:
            raise ValueError(f"Duplicate signal flag: {flag['path']}")
        flagged_sha.add(original["sha256"])
        flags_by_sha[original["sha256"]] = flag
    candidates = []
    counts = Counter()
    cross_text_hashes = []
    for original_sha in sorted(flagged_sha):
        flag = flags_by_sha[original_sha]
        identities = defaultdict(list)
        for placement in by_sha[original_sha]:
            identities[(placement["spokenText"], placement["voice"], placement["locale"])].append(placement)
        if len(identities) > 1:
            cross_text_hashes.append({"sha256": original_sha, "textsAndVoices": [
                {"spokenText": key[0], "voice": key[1], "locale": key[2]}
                for key in sorted(identities)]})
        for key, placements in sorted(identities.items()):
            for placement in placements:
                verify_audio(placement)
            original = min(placements, key=lambda row: row["path"])
            retake = retakes.get((original_sha, *key))
            selected = None
            kind = "unresolved"
            if retake and signal_pass(retake["signal"]):
                selected, kind = retake, "signal-pass-retake"
            else:
                alternates = sorted(
                    (row for row in by_text_voice[key]
                     if row["sha256"] != original_sha and row["sha256"] not in flagged_sha),
                    key=lambda row: row["path"])
                for alternate in alternates:
                    verify_audio(alternate)
                    signal = decode(Path(alternate["path"]))
                    if signal_pass(signal):
                        selected = {**alternate, "signal": signal}
                        kind = "signal-pass-exact-text-alternate"
                        break
            candidates.append({
                "original": original, "originalSignal": flag["signal"],
                "affectedPlacements": [{"stage": row["stage"], "lesson": row["lesson"], "path": row["path"]}
                                       for row in placements],
                "candidateKind": kind, "candidate": selected,
                "priorRetake": retake if kind == "unresolved" else None,
                "listeningReviewed": False, "replacementApplied": False,
            })
            counts[kind] += 1
    return {
        "schema": "french101-private-signal-repair-options-v1",
        "pairKey": "French:English", "locale": "fr-FR",
        "courseManifestSetSHA256": manifest_sha,
        "signalReportSHA256": sha256(audit_path),
        "retakeManifestSHA256": sha256(retakes_path),
        "flaggedUniqueFiles": len(flagged_sha),
        "flaggedTextVoiceIdentities": len(candidates),
        "affectedPlacements": sum(len(row["affectedPlacements"]) for row in candidates),
        "crossTextHashCollisions": cross_text_hashes,
        "candidateCounts": dict(sorted(counts.items())),
        "listeningReviewed": False, "registered": False,
        "candidates": candidates,
    }


def sheet(index, output):
    rows = []
    for row in index["candidates"]:
        original = row["original"]
        selected = row["candidate"]
        source = html.escape(os.path.relpath(original["path"], output), quote=True)
        item = (f'<section><h2 lang="fr">{html.escape(original["displayText"])}</h2>'
                f'<p>Spoken: <span lang="fr">{html.escape(original["spokenText"])}</span> · '
                f'{html.escape(original["voice"])} · {html.escape(row["candidateKind"])}</p>'
                f'<p>{len(row["affectedPlacements"])} affected lesson placement(s)</p>'
                f'<h3>Original</h3><audio controls preload="none" src="{source}"></audio>')
        if selected:
            target = html.escape(os.path.relpath(selected["path"], output), quote=True)
            item += f'<h3>Signal-pass candidate</h3><audio controls preload="none" src="{target}"></audio>'
        elif row["priorRetake"]:
            target = html.escape(os.path.relpath(row["priorRetake"]["path"], output), quote=True)
            item += f'<h3>Retake still flagged</h3><audio controls preload="none" src="{target}"></audio>'
        rows.append(item + "</section>")
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" '
            'content="width=device-width,initial-scale=1"><title>French 101 signal repair options</title>'
            '<style>body{font:16px system-ui;max-width:850px;margin:auto;padding:24px}'
            'section{border:1px solid #aaa;border-radius:10px;padding:16px;margin:20px 0}'
            'audio{width:100%}</style><h1>French 101 · private signal repair options</h1>'
            '<p>Signal pass is not listening or pronunciation approval. Context can change a short word’s '
            'pronunciation. No candidate is installed or registered.</p>' + "".join(rows) + "</html>\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audio-root", type=Path, required=True)
    parser.add_argument("--signal-report", type=Path, required=True)
    parser.add_argument("--retake-manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    root = args.audio_root.resolve()
    output = args.output.resolve()
    if not output.is_relative_to(root) or output == root:
        raise ValueError("Repair report must stay in a separate private French 101 folder")
    index = build(root, args.signal_report.resolve(), args.retake_manifest.resolve())
    manifest = json.dumps(index, ensure_ascii=False, indent=2) + "\n"
    review = sheet(index, output)
    if args.check:
        if (output / "manifest.json").read_text() != manifest or (output / "review.html").read_text() != review:
            raise ValueError("Signal repair options are stale")
    else:
        output.mkdir(parents=True, exist_ok=True)
        (output / "manifest.json").write_text(manifest)
        (output / "review.html").write_text(review)
    print(json.dumps({key: index[key] for key in ("flaggedUniqueFiles", "flaggedTextVoiceIdentities", "affectedPlacements", "candidateCounts")},
                     ensure_ascii=False))


if __name__ == "__main__":
    main()
