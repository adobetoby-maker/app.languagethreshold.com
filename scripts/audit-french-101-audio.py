#!/usr/bin/env python3
"""Read-only French 101 recording scope; never invokes synthesis or publishes audio."""

import argparse
import hashlib
import json
import re
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/french-basics"
OUTPUT = BASE / "private-audio-inventory.json"
SOURCES = {
    "foundation": ("foundation-*-draft.json", "private-runtime-foundation-1-10.json", "stageFile"),
    "core": ("core-*-draft.json", "private-runtime-core-1-30.json", "coreCurriculum"),
    "master": ("master-*-redesign-draft.json", "private-runtime-master-1-6.json", "masterStageFragment"),
}
# Source-backed *internal* pack budget and observed Spanish pack size, not a French codec claim.
WATCH_BUDGET = 4 * 1024 * 1024
WATCH_REFERENCE_BYTES = 3_976_357
WATCH_REFERENCE_CLIPS = 860


def digest(data):
    return hashlib.sha256(data).hexdigest()


def exact(text):
    if not isinstance(text, str):
        raise TypeError(text)
    return " ".join(unicodedata.normalize("NFC", text).split())


def extract(lesson, *, fixture):
    """Yield only target display/explicit audio fields, never English prompts."""
    for i, word in enumerate(lesson.get("words", [])):
        target = word.get("es" if fixture else "fr")
        if target:
            yield (f"words[{i}]", target)
    for i, card in enumerate(lesson.get("cards", [])):
        if card.get("target"):
            yield (f"cards[{i}]", card["target"])
    reader = lesson.get("reader") if fixture else lesson.get("reading")
    if reader:
        for i, target in enumerate(reader.get("target", [])):
            yield (f"reader.target[{i}]", target)
        for i, sentence in enumerate(reader.get("sentences", [])):
            if sentence.get("target"):
                yield (f"reader.sentences[{i}]", sentence["target"])
    for i, line in enumerate(lesson.get("dialogue", [])):
        target = line.split("|", 1)[0] if isinstance(line, str) else line.get("target")
        if target:
            yield (f"dialogue[{i}]", target)
    for i, check in enumerate(lesson.get("checks", [])):
        if check.get("audioText"):
            yield (f"checks[{i}].audioText", check["audioText"])
    speaking = lesson.get("speaking")
    if isinstance(speaking, dict) and speaking.get("opening"):
        yield ("speaking.opening", speaking["opening"])


def audit():
    source_hashes = {}
    seen = defaultdict(lambda: {"sources": [], "scope": set()})
    lesson_counts = {}
    for stage, (pattern, fixture_name, fixture_key) in SOURCES.items():
        drafts = {}
        for path in sorted(BASE.glob(pattern)):
            raw = path.read_bytes()
            rel = path.relative_to(ROOT).as_posix()
            source_hashes[rel] = digest(raw)
            data = json.loads(raw)
            assert data["moduleId"] == "french-basics" and data["target"] == "French"
            assert data["native"] == "English" and data["reviewed"] is False
            for lesson in data["lessons"]:
                assert lesson["n"] not in drafts, (stage, lesson["n"])
                drafts[lesson["n"]] = (rel, lesson)
        expected = {"foundation": 10, "core": 30, "master": 20}[stage]
        assert set(drafts) == set(range(1, expected + 1)), stage
        lesson_counts[stage] = len(drafts)

        fixture_path = BASE / fixture_name
        raw = fixture_path.read_bytes()
        fixture_rel = fixture_path.relative_to(ROOT).as_posix()
        source_hashes[fixture_rel] = digest(raw)
        fixture_data = json.loads(raw)
        assert fixture_data["privatePilot"] is True and fixture_data["registered"] is False
        assert fixture_data["reviewed"] is False
        runtime = fixture_data[fixture_key]["lessons"]
        support = {x["n"]: x for x in fixture_data["support"]}
        runtime_by_n = {x["n"]: x for x in runtime}
        fixture_limit = {"foundation": 10, "core": 30, "master": 6}[stage]
        assert set(runtime_by_n) == set(support) == set(range(1, fixture_limit + 1))

        for number, (rel, lesson) in sorted(drafts.items()):
            for field, raw_text in extract(lesson, fixture=False):
                text = exact(raw_text)
                assert text and "|" not in text
                record = seen[text]
                record["scope"].add("authored-draft")
                record["sources"].append({"path": rel, "stage": stage,
                                           "lesson": number, "field": field})
            if number <= fixture_limit:
                for location, part in (("runtime", runtime_by_n[number]), ("support", support[number])):
                    for field, raw_text in extract(part, fixture=True):
                        text = exact(raw_text)
                        assert text and "|" not in text
                        record = seen[text]
                        record["scope"].add("private-fixture")
                        record["sources"].append({"path": fixture_rel, "stage": stage,
                                                   "lesson": number, "field": f"{location}.{field}"})
            else:
                # Master 7–20 lacks a private runtime fixture. Its authored draft
                # is useful for planning, but must not be called runtime-ready.
                for _, raw_text in extract(lesson, fixture=False):
                    seen[exact(raw_text)]["scope"].add("master-draft-no-fixture")

    entries = []
    for text in sorted(seen, key=lambda s: (s.casefold(), s)):
        record = seen[text]
        scopes = sorted(record["scope"])
        entries.append({"textSha256": digest(text.encode("utf-8")), "displayText": text,
                        "characters": len(text), "scope": scopes,
                        "speakerLabelNeedsReview": bool(re.match(r"^[^:]{1,32}\s*:\s+", text)),
                        "sources": sorted(record["sources"], key=lambda s: (s["path"], s["stage"], s["lesson"], s["field"]))})
    candidate = [e for e in entries if "private-fixture" in e["scope"] or "master-draft-no-fixture" in e["scope"]]
    fixture_only = [e for e in entries if "private-fixture" in e["scope"]]
    draft_only = [e for e in entries if e not in candidate]
    chars = sum(e["characters"] for e in candidate)
    avg_bytes = WATCH_REFERENCE_BYTES / WATCH_REFERENCE_CLIPS
    scenarios = {}
    for locales in (("fr-FR",), ("fr-FR", "fr-CA")):
        voice_count = 2 * len(locales)
        name = "+".join(locales)
        scenarios[name] = {"proposedLocales": list(locales), "voicesPerLocale": 2,
                           "voiceIdentityVerified": False, "requiredClips": len(candidate) * voice_count,
                           "spokenCharacters": chars * voice_count,
                           "illustrativeBytesAtExistingWatchPackAverage": round(len(candidate) * voice_count * avg_bytes)}
    return {"schema": 1, "moduleId": "french-basics", "targetLanguage": "French",
            "nativeLanguage": "English", "scope": "Read-only/private synthesis planning; not a release",
            "registered": False, "reviewed": False, "recordingsGenerated": False,
            "listeningReviewed": False, "sourceSha256": dict(sorted(source_hashes.items())),
            "lessonCounts": lesson_counts,
            "counts": {"allUniqueDisplayTexts": len(entries), "candidateUniqueTexts": len(candidate),
                       "privateFixtureUniqueTexts": len(fixture_only),
                       "authoredOnlyOutsideCandidate": len(draft_only),
                       "candidateSpokenCharactersPerVoice": chars,
                       "candidateSpeakerLabelsNeedingScriptReview": sum(e["speakerLabelNeedsReview"] for e in candidate)},
            "voiceScenarios": scenarios,
            "watchEstimate": {"internalResourceBudgetBytes": WATCH_BUDGET,
                              "referencePackBytes": WATCH_REFERENCE_BYTES,
                              "referencePackClips": WATCH_REFERENCE_CLIPS,
                              "referenceBytesPerClipRounded": round(avg_bytes),
                              "illustrativeMaxClipsAtReferenceAverage": int(WATCH_BUDGET // avg_bytes),
                              "note": "Spanish WatchAudioLite observed pack average only; French durations/codec/manifest overhead unknown. Build bounded pack after recordings exist."},
            "blockers": ["Independent French text and curriculum review after latest edits",
                         "Qualified human review of pronunciation, register and meanings",
                         "Determine fr-FR and optional fr-CA voice identities and licensing/provider support",
                         "Resolve role labels and spoken-script punctuation before synthesis",
                         "Validate exact text/locale/voice, duration, hashes and listening quality per clip",
                         "Runtime, offline, iPhone and Watch playback/size acceptance"],
            "entries": entries}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = (json.dumps(audit(), ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if args.check:
        assert OUTPUT.read_bytes() == encoded, f"stale {OUTPUT}"
        print(f"French 101 audio inventory current: {digest(encoded)}")
    else:
        OUTPUT.write_bytes(encoded)
        print(f"Wrote {OUTPUT.relative_to(ROOT)}: {digest(encoded)}")


if __name__ == "__main__":
    main()
