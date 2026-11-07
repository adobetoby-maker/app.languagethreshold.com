#!/usr/bin/env python3
"""Rebuild an unregistered French 101 dictionary inventory from authored drafts."""

import argparse
import hashlib
import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/french-basics"
OUTPUT = BASE / "private-dictionary-inventory.json"
STAGES = ("foundation", "core", "master")


def sha(data):
    return hashlib.sha256(data).hexdigest()


def key(text):
    text = unicodedata.normalize("NFC", text).casefold()
    return re.sub(r"\s+", " ", text.replace("’", "'")).strip()


def stable_id(prefix, *values):
    payload = "\x1f".join(key(value) for value in values).encode("utf-8")
    return f"fr101:{prefix}:{sha(payload)[:20]}"


def source_files(stage):
    if stage == "master":
        return sorted(BASE.glob("master-*-redesign-draft.json"))
    return sorted(BASE.glob(f"{stage}-*-draft.json"))


def build():
    source_hashes = {}
    lessons_by_stage = {stage: {} for stage in STAGES}
    for stage in STAGES:
        for path in source_files(stage):
            raw = path.read_bytes()
            relative = path.relative_to(ROOT).as_posix()
            data = json.loads(raw)
            assert data["target"] == "French" and data["native"] == "English"
            assert data["moduleId"] == "french-basics" and data["reviewed"] is False
            assert data["stage"] == stage
            source_hashes[relative] = sha(raw)
            for lesson in data["lessons"]:
                number = lesson["n"]
                assert number not in lessons_by_stage[stage], (stage, number)
                lessons_by_stage[stage][number] = (relative, lesson)
        expected = {"foundation": 10, "core": 30, "master": 20}[stage]
        assert set(lessons_by_stage[stage]) == set(range(1, expected + 1)), stage

    # Only apply exact, lesson-scoped card corrections. Other overlay fields are
    # teaching/Reader edits and must not silently change dictionary senses.
    overrides = defaultdict(list)
    for path in sorted(BASE.glob("*-language-support-overrides.json")):
        relative = path.relative_to(ROOT).as_posix()
        raw = path.read_bytes()
        source_hashes[relative] = sha(raw)
        stage = "core" if path.name.startswith("core-") else "master"
        for item in json.loads(raw).get("cardOverrides", []):
            overrides[(stage, item["lesson"])].append((relative, item))

    senses = {}
    applied_overrides = []
    unpaired_overrides = []
    for stage in STAGES:
        for number, (relative, lesson) in sorted(lessons_by_stage[stage].items()):
            for index, word in enumerate(lesson["words"]):
                target = unicodedata.normalize("NFC", word["fr"].strip())
                native = unicodedata.normalize("NFC", word["en"].strip())
                matched = []
                for overlay_path, correction in overrides[(stage, number)]:
                    old = correction["from"]
                    if key(old["target"]) == key(target) and key(old["native"]) == key(native):
                        matched.append((overlay_path, correction))
                assert len(matched) <= 1, (stage, number, index, matched)
                if matched:
                    overlay_path, correction = matched[0]
                    target = unicodedata.normalize("NFC", correction["to"]["target"].strip())
                    native = unicodedata.normalize("NFC", correction["to"]["native"].strip())
                    applied_overrides.append({"path": overlay_path, "stage": stage, "lesson": number,
                                              "wordIndex": index, "from": correction["from"], "to": correction["to"]})
                assert target and native
                sid = stable_id("sense", target, native)
                occurrence = {"stage": stage, "lesson": number,
                              "wordIndex": index, "draftPath": relative,
                              "kind": word["kind"]}
                if lesson.get("stableLessonKey"):
                    occurrence["stableLessonKey"] = lesson["stableLessonKey"]
                if matched:
                    occurrence["overlayPath"] = matched[0][0]
                if sid not in senses:
                    senses[sid] = {"senseId": sid, "headwordId": stable_id("head", target),
                                   "target": target, "native": native,
                                   "authoredMetadata": {}, "occurrences": [],
                                   "reviewed": False, "registered": False}
                sense = senses[sid]
                for field in ("gender", "article", "note"):
                    if word.get(field):
                        sense["authoredMetadata"].setdefault(field, [])
                        if word[field] not in sense["authoredMetadata"][field]:
                            sense["authoredMetadata"][field].append(word[field])
                sense["occurrences"].append(occurrence)

    for (stage, number), items in overrides.items():
        for overlay_path, correction in items:
            if not any(x["path"] == overlay_path and x["stage"] == stage and x["lesson"] == number
                       and x["from"] == correction["from"] for x in applied_overrides):
                unpaired_overrides.append({"path": overlay_path, "stage": stage,
                                           "lesson": number, "from": correction["from"],
                                           "to": correction["to"]})

    headword_senses = defaultdict(list)
    for sense in senses.values():
        headword_senses[sense["headwordId"]].append(sense)
    ambiguous = []
    for group in headword_senses.values():
        meanings = {key(s["native"]) for s in group}
        if len(meanings) > 1:
            ambiguous.append({"headwordId": group[0]["headwordId"],
                              "target": group[0]["target"],
                              "senseIds": sorted(s["senseId"] for s in group),
                              "nativeGlosses": sorted(s["native"] for s in group)})
    ambiguous_ids = {a["headwordId"] for a in ambiguous}
    for sense in senses.values():
        flags = []
        if sense["headwordId"] in ambiguous_ids:
            flags.append("multiple-English-glosses-needs-sense-review")
        if " / " in sense["target"] or " / " in sense["native"]:
            flags.append("slash-joined-form-or-gloss-needs-splitting-review")
        if not sense["authoredMetadata"].get("gender") and not sense["authoredMetadata"].get("article"):
            flags.append("gender-or-article-unrecorded-if-applicable")
        sense["reviewFlags"] = flags
        sense["partOfSpeech"] = None
        sense["inflection"] = None
        sense["regionalVariant"] = None
        sense["authoredMetadata"] = {k: sorted(v) for k, v in sorted(sense["authoredMetadata"].items())}

    return {"schema": 1, "moduleId": "french-basics", "target": "French", "native": "English",
            "scope": "Private draft inventory from authored lesson word rows; not a published dictionary",
            "reviewed": False, "registered": False, "audio": False,
            "idRule": "SHA-256 first 20 hex of NFC, casefolded, apostrophe-normalized target and English gloss; lesson order does not affect sense IDs",
            "sourceSha256": dict(sorted(source_hashes.items())),
            "counts": {"lessons": {s: len(lessons_by_stage[s]) for s in STAGES},
                       "wordRows": sum(len(s[1]["words"]) for d in lessons_by_stage.values() for s in d.values()),
                       "uniqueSensePairs": len(senses), "uniqueHeadwords": len(headword_senses),
                       "ambiguousHeadwords": len(ambiguous),
                       "appliedWordOverrides": len(applied_overrides),
                       "unpairedCardOverrides": len(unpaired_overrides),
                       "partOfSpeechUnrecorded": len(senses),
                       "inflectionUnrecorded": len(senses),
                       "regionalVariantUnassessed": len(senses)},
            "reviewNotes": ["A distinct English gloss gets its own provisional sense ID; no sense merger is asserted.",
                            "POS, inflection and France/Quebec variants are unassessed, not inferred.",
                            "Unpaired card overrides may refer to runtime-only supplemental cards or sentence cards."],
            "ambiguousHeadwords": sorted(ambiguous, key=lambda x: key(x["target"])),
            "unpairedCardOverrides": sorted(unpaired_overrides, key=lambda x: (x["stage"], x["lesson"], x["path"], key(x["from"]["target"]))),
            "senses": sorted(senses.values(), key=lambda x: (key(x["target"]), key(x["native"]), x["senseId"]))}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = (json.dumps(build(), ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if args.check:
        assert OUTPUT.read_bytes() == encoded, f"stale {OUTPUT}"
        print(f"French 101 dictionary inventory current: {sha(encoded)}")
    else:
        OUTPUT.write_bytes(encoded)
        print(f"Wrote {OUTPUT.relative_to(ROOT)}: {sha(encoded)}")


if __name__ == "__main__":
    main()
