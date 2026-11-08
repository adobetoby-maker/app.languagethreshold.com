#!/usr/bin/env python3
"""Build a source-pinned, private review queue for the French Roofing draft."""

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "content/french-roofing"
FIXTURE = BASE / "private-runtime-candidate.json"
OUTPUT = BASE / "private-review-packet.md"
MODES = ("see", "recall", "hear", "type", "say", "write")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text())


def build():
    fixture = read(FIXTURE)
    fixture_hash = digest(FIXTURE)
    assert fixture["releaseGate"]["enabled"] is False
    assert len(fixture["lessons"]) == 60
    for source in fixture["sourceFiles"]:
        assert digest(ROOT / source["path"]) == source["sha256"], source["path"]

    batches = sorted(BASE.glob("private-mode-activities-*.json"))
    activities = []
    for path in batches:
        batch = read(path)
        assert batch["sourceSha256"] == fixture_hash, path
        assert batch["reviewed"] is False and batch["registered"] is False, path
        assert all(a["readyForLearner"] is False for a in batch["activities"]), path
        activities.extend(batch["activities"])
    counts = Counter((a["lessonKey"], a["mode"]) for a in activities)
    assert len(activities) == 360 and len({a["id"] for a in activities}) == 360
    assert all(counts[(lesson["draftLessonKey"], mode)] == 1 for lesson in fixture["lessons"] for mode in MODES)

    dictionary = read(BASE / "private-dictionary-inventory-fr-en.json")
    context = read(BASE / "private-dictionary-context-fr-en.json")
    article_context = read(BASE / "private-dictionary-article-context-fr-en.json")
    audio = read(BASE / "private-audio-scope-fr-en.json")
    assert dictionary["sourceSha256"] == fixture_hash
    assert context["runtimeSha256"] == fixture_hash
    assert article_context["runtimeSha256"] == fixture_hash
    assert audio["sourceFixtureSha256"] == fixture_hash
    assert dictionary["reviewed"] is False and audio["listeningReviewed"] is False
    assert dictionary["counts"]["distinctExactPairs"] == 898
    assert dictionary["counts"]["ambiguousHeadwords"] == 66

    lines = [
        "# French Roofing: private reviewer packet",
        "",
        "This packet is an internal work queue for the French→English Roofing Supervisor draft. It is not learner-facing content, a completed review, or release approval. Every lesson and activity remains `reviewed:false` and unregistered.",
        "",
        "## Pinned material and scope",
        "",
        f"- Runtime fixture: [`private-runtime-candidate.json`](private-runtime-candidate.json), SHA-256 `{fixture_hash}`. Its {len(fixture['sourceFiles'])} source-file hashes were checked during generation.",
        f"- {len(fixture['lessons'])} lessons: Foundation 10, Core 30, Master 20. {fixture['wordPlacements']} card placements, {fixture['distinctWordPairs']} distinct exact French–English pairs, {fixture['readerLines']} aligned Reader lines, and 60 speaking openings.",
        f"- {len(activities)} private activity drafts, one per See/Recall/Hear/Type/Say/Write mode per lesson, in {len(batches)} source-pinned files. These are review models, not working app modes.",
        f"- Dictionary: {dictionary['counts']['normalizedHeadwords']} normalized headwords; {dictionary['counts']['ambiguousHeadwords']} ambiguity flags ({dictionary['counts']['articleOnlyCandidates']} article-only candidates and {dictionary['counts']['otherMeaningVariations']} other meaning variations). [Non-article context](private-dictionary-context-fr-en.json) and [article-candidate context](private-dictionary-article-context-fr-en.json) cover all 66.",
        f"- Audio: {audio['counts']['uniqueExactTexts']} distinct fr-FR texts / {2 * audio['counts']['uniqueExactTexts']} proposed two-voice clips. No recordings or listening approval are present. [Exact text scope](private-audio-scope-fr-en.json).",
        "",
        "## Review assignments",
        "",
        "1. A qualified French reviewer checks every card pair, Reader alignment, activity model, grammar, pronunciation cue, register, and France/Québec wording against the exact English support and source context. Preserve direct clinical vocabulary; put factual questions in this internal packet, not learner text.",
        "2. A qualified roofing reviewer checks technical/product claims, especially [Core 19–21](core-19-21-internal-review.md), and the warranty, insurance, storm, repair, inspection, and capstone scenes. Correct the English source and French together when a factual claim is wrong.",
        "3. A dictionary reviewer resolves all 66 flagged headwords, recording whether forms are article variants, contextual glosses, or distinct senses; use the [nine non-article entries](private-dictionary-context-fr-en.json) and [57 article candidates](private-dictionary-article-context-fr-en.json). Do not change sense IDs or register links from this queue alone.",
        "4. After text approval, check the exact fr-FR audio inventory and both voices. Record text hash, voice, duration, file hash, and listening findings for each clip; retake failed clips. Synthesis alone does not approve playback.",
        "",
        "## Priority factual and language questions",
        "",
        "- Core 19: step-flashing sequence and product-specific wording.",
        "- Core 20: ridge-cap cutting and sealing instructions against the selected product.",
        "- Core 21: the English fall-protection claim needs qualified correction before release; see the linked internal review record.",
        "- Master scenes: warranty, insurance, storm response, inspection, repair, and capstone claims need product/jurisdiction review.",
        "- Across the course: confirm France/Québec roofing terms, register, and English support fidelity. Review clinical terms directly, without adding learner-facing medical caveats.",
        "",
        "## Lesson-by-lesson queue",
        "",
        "| Key | English objective | Cards | Reader lines | Six drafts | French review | Roofing review |",
        "| --- | --- | ---: | ---: | ---: | --- | --- |",
    ]
    for lesson in fixture["lessons"]:
        objective = lesson["objectiveEnglish"].replace("|", "\\|").replace("\n", " ")
        key = lesson["draftLessonKey"]
        lines.append(f"| `{key}` | {objective} | {len(lesson['words'])} | {len(lesson['reader'])} | 6 | pending | pending |")
    lines += [
        "",
        "## Findings record",
        "",
        "For each finding, record the lesson key and source ID, exact English and French text, proposed correction, reviewer name/qualification, date, and scoped recheck result. Keep the status pending until the corrected files and dependent hashes are rebuilt.",
        "",
        "| Lesson/source ID | Exact issue and correction | Reviewer/date | Recheck evidence | Status |",
        "| --- | --- | --- | --- | --- |",
        "| Core 21 / source claim | Qualified fall-protection source correction required | pending | pending | open |",
        "",
        "Release remains blocked on qualified language/trade review, corrected sources, actual runtime and offline integration, recorded/listened audio, browser/phone testing, and independent V4 iPhone/Watch acceptance. Do not turn on the fixture release gate from this packet.",
        "",
    ]
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    content = build()
    if args.check:
        assert OUTPUT.read_text() == content, "review packet is stale"
    else:
        OUTPUT.write_text(content)
    print(f"OK {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
