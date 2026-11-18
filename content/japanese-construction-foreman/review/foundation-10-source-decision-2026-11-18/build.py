#!/usr/bin/env python3
"""Rebuild inert, source-pinned Japanese Foreman Foundation 10 review evidence."""
import hashlib
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE_COMMIT = "cbccaa91eacdf040abf1b4a647f3df2eb68a8754"
CURRICULUM = "src/data/core60/es/foundation-construction-foreman.json"
READER = "public/lesson-content/es/foundation-construction-foreman.json"
OLD_DRAFT = "content/japanese-construction-foreman/foundation-draft.json"
REVISION = "foundation-construction-foreman:10:ja-en:source-decision-v1"

# These are isolated proposals for inspection, never selected answers or audio scripts.
# Nulls preserve source, trade, register, and curriculum choices for qualified review.
CARD_JAPANESE = [
    None, "建設", "安全", "電気", "品質", "緊急事態", "事故", "緊急の",
    None, None, "すみません、分かりません。",
    "もう少しゆっくり話していただけますか。", None, None, None, None,
]
READER_JAPANESE = [
    "トムはヒューストンの建設現場で職長をしています。",
    None,
    None,
    "トム：「もう少しゆっくり話していただけますか。」",
    None,
    None,
    None,
    None,
    "トムは言います。「緊急事態や事故のときは、911に電話してください。」",
]


def pinned(path):
    data = subprocess.check_output(["git", "show", f"{SOURCE_COMMIT}:{path}"], cwd=ROOT)
    return json.loads(data), hashlib.sha256(data).hexdigest()


curriculum, curriculum_hash = pinned(CURRICULUM)
reader_file, reader_hash = pinned(READER)
old_file, old_hash = pinned(OLD_DRAFT)
lesson = curriculum["lessons"][9]
reader = reader_file["lessons"]["10"]["passage"]
old = old_file["lessons"][9]
assert lesson["n"] == old["n"] == 10
assert len(lesson["words"]) == len(CARD_JAPANESE) == 16
assert len(reader["target"]) == len(reader["native"]) == len(READER_JAPANESE) == 9

packet = {
    "schema": 1,
    "track": "construction-foreman",
    "stage": "foundation",
    "pairKey": "Japanese:English",
    "lessonKey": "foundation:10",
    "stableLessonId": "foundation-construction-foreman:10:ja-en",
    "candidateRevision": REVISION,
    "sourceCommit": SOURCE_COMMIT,
    "source": {
        "curriculumPath": CURRICULUM, "curriculumSha256": curriculum_hash,
        "readerPath": READER, "readerSha256": reader_hash,
        "japaneseDraftPath": OLD_DRAFT, "japaneseDraftSha256": old_hash,
        "titleEnglish": lesson["title"],
        "objectiveEnglish": lesson["objective"], "focusSpanish": lesson["focus"],
        "speakingEnglish": lesson["speaking"], "readerTitleSpanish": reader["title"],
    },
    "archivedDraft": {
        "title": old["title"], "scene": old["scene"],
        "termCount": len(old["terms"]), "readerCount": len(old["dialogue"]),
        "materialDrift": [
            "Archived Japanese Foundation 10 reviews Sato and Tanaka's morning check-in, carpenter count, tools, and next-day meeting. Current Spanish source teaches cognates and help requests through Tom and Luis at a Houston construction site, inspection, electricity, concrete pouring, and 911. These scenes and saved positions are distinct."
        ],
    },
    "reviewed": False,
    "cards": [
        {"id": f"{REVISION}:card:{i:02d}", "position": i,
         "sourceSpanish": word["es"], "sourceEnglish": word["en"], "kind": word["kind"],
         "sourceNoteInternal": word.get("note"), "japaneseDraft": jp,
         "selectedJapanese": None, "decisionOpen": jp is None}
        for i, (word, jp) in enumerate(zip(lesson["words"], CARD_JAPANESE), 1)
    ],
    "reader": [
        {"id": f"{REVISION}:reader:{i:02d}", "position": i,
         "sourceSpanish": es, "sourceEnglish": en, "japaneseDraft": jp,
         "selectedJapanese": None, "decisionOpen": jp is None}
        for i, (es, en, jp) in enumerate(zip(reader["target"], reader["native"], READER_JAPANESE), 1)
    ],
    "decisionsNeeded": [
        "The objective teaches Spanish cognates ending in -ción, -dad, and -ente and survival phrases for Spanish. Choose a Japanese-specific objective and decide how to retain exact source coverage before selecting cards or Reader turns 2, 5, and 6.",
        "Choose contextual Japanese senses for inspection, client, and installation, including electrical installation and quality of installation; do not assert a single dictionary headword before qualified construction review.",
        "Keep source colar and its explanation, pouring concrete into the form, visible. Decide whether to show the Spanish term as quoted source language or teach a Japanese construction term; do not silently replace the source action.",
        "Resolve the source's Spanish-speaking phrases and its usted/ustedes register against Japanese workplace roles and audience before selecting card 13 or 15, or the Reader equivalents.",
        "Review the instruction to turn off electricity before selecting Reader 8. Preserve its safety meaning without inventing a procedure, authorization, or equipment state.",
        "The scene is in Houston and the source says 911. The US National 911 Program confirms 911 for emergency assistance; qualified locale and domain review still precedes any learner-facing recording.",
        "Map six exact authored mode prompt/target pairs, forms, speaking, dictionary and saved-item identities after qualified text selection. Verify exact text and each recording, then obtain a separate human listening decision for every clip.",
    ],
    "externalSourceNotesInternal": [
        {"claim": "911 is the US emergency assistance number", "url": "https://www.911.gov/calling-911/", "checkedAtUtc": "2026-11-18"}
    ],
    "gates": {"ownerPage": False, "learnerRegistered": False, "scoring": False,
              "audioRegistered": False, "listeningReviewed": False, "offline": False,
              "progress": False, "v4Imported": False},
}
output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
destination = HERE / "decision.json"
if "--check" in sys.argv:
    assert destination.read_text() == output, "decision.json is stale"
    print("PASS Japanese Foreman Foundation 10 packet build --check")
else:
    destination.write_text(output)
    print("wrote", destination)
