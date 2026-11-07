#!/usr/bin/env python3
"""Deterministic, non-recording V4 Watch starter-pack proposal for French 101."""

import argparse
import hashlib
import importlib.util
import json
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/french-basics"
INPUT = BASE / "private-audio-inventory.json"
OUTPUT = BASE / "private-watch-starter-plan.json"
WATCH_BUDGET = 4 * 1024 * 1024
SPANISH_PACK_BYTES = 3_976_357
SPANISH_PACK_CLIPS = 860
SPANISH_PACK_TEXTS = 430
MIN_UNCOMMITTED_MARGIN = 64 * 1024

# Explicit first-run selection; each value must be an exact fixture-backed
# French display string in the source-pinned audio audit. Order is priority.
FIRST_RUN = (
    ("foundation", 1, "bonjour"),
    ("foundation", 1, "je m’appelle"),
    ("foundation", 1, "Comment vous appelez-vous ?"),
    ("foundation", 1, "Ça va ?"),
    ("foundation", 1, "Ça va bien, merci."),
    ("foundation", 1, "merci"),
    ("foundation", 1, "au revoir"),
    ("core", 1, "aujourd'hui"),
    ("core", 1, "J'étudie le français le matin."),
    ("core", 1, "Nous parlons à la bibliothèque."),
    ("master", 1, "je vous présente"),
    ("master", 1, "pourriez-vous"),
)


def hash_bytes(value):
    return hashlib.sha256(value).hexdigest()


def v4_lookup_key(text):
    # Mirrors V4 scripts/build_watch_audio.py, but this script does not touch V4.
    return " ".join(unicodedata.normalize("NFC", text).strip().lower().split()).rstrip(".!?¿¡,;:")


def source_audit():
    path = ROOT / "scripts/audit-french-101-audio.py"
    spec = importlib.util.spec_from_file_location("french_audio_audit", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.audit()


def build():
    raw = INPUT.read_bytes()
    inventory = json.loads(raw)
    assert inventory == source_audit(), "Audio inventory is stale against authored drafts/fixtures"
    assert inventory["registered"] is False and inventory["reviewed"] is False
    assert inventory["recordingsGenerated"] is False
    by_text = {entry["displayText"]: entry for entry in inventory["entries"]}
    selected = []
    used_keys = set()
    for priority, (stage, lesson, text) in enumerate(FIRST_RUN, start=1):
        entry = by_text[text]
        assert not entry["speakerLabelNeedsReview"], text
        assert "private-fixture" in entry["scope"], text
        matching = [source for source in entry["sources"]
                    if source["stage"] == stage and source["lesson"] == lesson
                    and "private-runtime-" in source["path"]]
        assert matching, (stage, lesson, text)
        lookup = v4_lookup_key(text)
        assert lookup and lookup not in used_keys, f"Watch lookup collision: {text}"
        used_keys.add(lookup)
        selected.append({"priority": priority, "stage": stage, "lesson": lesson,
                         "displayText": text, "textSha256": entry["textSha256"],
                         "v4LookupKey": lookup,
                         "v4LookupKeyHasTrailingSpace": lookup.endswith(" "),
                         "sourceRefs": matching,
                         "recorded": False, "listeningReviewed": False})
    clip_count = len(selected) * 2
    estimated_extra = round(SPANISH_PACK_BYTES * clip_count / SPANISH_PACK_CLIPS)
    estimated_combined = SPANISH_PACK_BYTES + estimated_extra
    margin = WATCH_BUDGET - estimated_combined
    assert margin >= MIN_UNCOMMITTED_MARGIN, "Illustrative starter exceeds reserved Watch headroom"
    return {
        "schema": 1, "moduleId": "french-basics", "targetLanguage": "French",
        "nativeLanguage": "English", "scope": "Private V4 planning manifest; not a recording catalog",
        "sourceAudioInventorySha256": hash_bytes(raw),
        "registered": False, "reviewed": False, "recordingsGenerated": False,
        "watchIntegrated": False, "bundleId": "com.languagethreshold.core60v4.watchkitapp",
        "proposedLocale": "fr-FR", "proposedVoiceCount": 2,
        "voiceIdentitiesVerified": False, "requestedClipCount": clip_count,
        "selectedTextCount": len(selected),
        "lookupKeysWithTrailingSpace": sum(x["v4LookupKeyHasTrailingSpace"] for x in selected),
        "lookupContract": "V4 Python Watch pack builder and Swift RecordedAudioCatalog both preserve spaces preceding stripped terminal punctuation; their keys match for the selected texts. The trailing space is a shared quirk, not a builder/playback mismatch.",
        "nativeFrenchRecordedPlaybackIntegrated": False,
        "selected": selected,
        "sizePlan": {
            "internalWatchAudioBudgetBytes": WATCH_BUDGET,
            "existingSpanishStarterPackObservedBytes": SPANISH_PACK_BYTES,
            "existingSpanishStarterPackObservedClips": SPANISH_PACK_CLIPS,
            "existingSpanishStarterPackObservedTexts": SPANISH_PACK_TEXTS,
            "referenceAverageBytesPerClipRounded": round(SPANISH_PACK_BYTES / SPANISH_PACK_CLIPS),
            "illustrativeFrenchExtraBytes": estimated_extra,
            "illustrativeCombinedPackBytes": estimated_combined,
            "illustrativeRemainingHeadroomBytes": margin,
            "minimumUncommittedHeadroomBytes": MIN_UNCOMMITTED_MARGIN,
            "illustrativeFit": True,
            "actualFrenchBytesKnown": False,
            "actualCombinedPackVerified": False,
            "note": "Illustration from existing Spanish WatchAudioLite average only. Final French MP3 sizes and manifest overhead are unknown. Actual V4 builder and verify_watch_size.py must enforce 4 MiB after approved recordings exist."
        },
        "blockers": [
            "Qualified French text/pronunciation review and source corrections",
            "Verify provider, fr-FR voice identities and rights; do not infer from Spanish voices",
            "Integrate French recorded playback behind an exact target-language/locale gate; V4 LocalVoice currently routes recorded audio only for Spanish",
            "Record two exact fr-FR clips per selected text and validate locale/text/hash/duration/listening",
            "Inspect actual combined WatchAudioLite size; drop lower-priority texts or rebalance pack if over 4 MiB",
            "Run native playback, Watch size guard and owner's TestFlight device acceptance"
        ]
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    encoded = (json.dumps(build(), ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    if args.check:
        assert OUTPUT.read_bytes() == encoded, f"stale {OUTPUT}"
        print(f"French 101 Watch starter plan current: {hash_bytes(encoded)}")
    else:
        OUTPUT.write_bytes(encoded)
        print(f"Wrote {OUTPUT.relative_to(ROOT)}: {hash_bytes(encoded)}")


if __name__ == "__main__":
    main()
