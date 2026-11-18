#!/usr/bin/env python3
"""Build an inert, source-pinned Foreman Foundation 5 review worksheet."""

import hashlib
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE_COMMIT = "2e2b36bd6bdb0bcc67a6b7dcb5a128224f727bb2"
CURRICULUM = "src/data/core60/es/foundation-construction-foreman.json"
READER = "public/lesson-content/es/foundation-construction-foreman.json"
OLD_DRAFT = "content/japanese-construction-foreman/foundation-draft.json"
REVISION = "foundation-construction-foreman:5:ja-en:source-decision-v1"

# Conditional proposals only. Null means the source or trade sense must be decided first.
CARD_JAPANESE = [
    "資材置き場",
    "金物店",
    "仮設トイレ",
    "型枠",
    "掘削溝",
    "屋根",
    None,  # floor can refer to a slab, a level, or the finished floor
    None,  # the mix is glossed as mortar but is not specified in the Reader
    "シャベル",
    "フォークリフト",
    "金物店に行きます。",
    "明日、コンクリートを打設します。",
    "あの人たちは型枠を組みます。",
    None,  # mix/mixture material and process remain unresolved
    "私はフォークリフトを運転できます。資格を持っています。",
    "フアンは屋根に行きます。",
]
READER_JAPANESE = [
    "現場で、ローサはミゲルに言います。「金物店に行きます。」",
    "ミゲル：「シャベルを取りに資材置き場へ行きます。」",
    "ミゲル：「作業班は今日、掘削溝を掘ります。」",
    "ローサ：「明日、コンクリートを打設します。」",
    None,  # floor's intended construction element is unclear
    None,  # mix's intended material remains unclear
    "ミゲル：「私はフォークリフトを運転できます。資格を持っています。」",
    "ローサ：「フアンはハーネスを着けて屋根に行きます。」",
    "ローサ：「仮設トイレは資材置き場の隣です。」",
]


def pinned(path):
    data = subprocess.check_output(["git", "show", f"{SOURCE_COMMIT}:{path}"], cwd=ROOT)
    return json.loads(data), hashlib.sha256(data).hexdigest()


curriculum, curriculum_hash = pinned(CURRICULUM)
reader_file, reader_hash = pinned(READER)
old_file, old_hash = pinned(OLD_DRAFT)
lesson = curriculum["lessons"][4]
reader = reader_file["lessons"]["5"]["passage"]
old = old_file["lessons"][4]
assert lesson["n"] == old["n"] == 5
assert len(lesson["words"]) == len(CARD_JAPANESE) == 16
assert len(reader["target"]) == len(reader["native"]) == len(READER_JAPANESE) == 9

packet = {
    "schema": 1,
    "track": "construction-foreman",
    "stage": "foundation",
    "pairKey": "Japanese:English",
    "lessonKey": "foundation:5",
    "stableLessonId": "foundation-construction-foreman:5:ja-en",
    "candidateRevision": REVISION,
    "sourceCommit": SOURCE_COMMIT,
    "source": {
        "curriculumPath": CURRICULUM,
        "curriculumSha256": curriculum_hash,
        "readerPath": READER,
        "readerSha256": reader_hash,
        "japaneseDraftPath": OLD_DRAFT,
        "japaneseDraftSha256": old_hash,
        "objectiveEnglish": lesson["objective"],
        "focusSpanish": lesson["focus"],
        "speakingEnglish": lesson["speaking"],
        "readerTitleSpanish": reader["title"],
    },
    "archivedDraft": {
        "title": old["title"],
        "scene": old["scene"],
        "termCount": len(old["terms"]),
        "readerCount": len(old["dialogue"]),
        "materialDrift": [
            "Older Japanese Foundation 5 teaches finding people and tools with Sato and Kobayashi; the source teaches Rosa and Miguel's work plans, materials, and certified forklift use."
        ],
    },
    "reviewed": False,
    "cards": [
        {
            "id": f"{REVISION}:card:{i:02d}",
            "position": i,
            "sourceSpanish": word["es"],
            "sourceEnglish": word["en"],
            "kind": word["kind"],
            "sourceNoteInternal": word.get("note"),
            "japaneseDraft": japanese,
            "selectedJapanese": None,
            "decisionOpen": japanese is None,
        }
        for i, (word, japanese) in enumerate(zip(lesson["words"], CARD_JAPANESE), 1)
    ],
    "reader": [
        {
            "id": f"{REVISION}:reader:{i:02d}",
            "position": i,
            "sourceSpanish": spanish,
            "sourceEnglish": english,
            "japaneseDraft": japanese,
            "selectedJapanese": None,
            "decisionOpen": japanese is None,
        }
        for i, (spanish, english, japanese) in enumerate(
            zip(reader["target"], reader["native"], READER_JAPANESE), 1
        )
    ],
    "decisionsNeeded": [
        "Resolve whether source floor/piso means the slab, a storey, or the finished floor in cards 7 and Reader 5 before selecting a Japanese term.",
        "Resolve what mixture the source calls la mezcla in card 8, card 14 and Reader 6, despite card 8's parenthetical mortar gloss.",
        "Review Japanese construction terms for formwork, trench, concrete placement and forklift certification; preserve source attribution rather than asserting a universal site rule.",
        "Adapt ir/ir a, hacer and poder to natural Japanese plans, action and ability; do not copy Spanish conjugation teaching.",
        "Author six actual mode prompt/target pairs, forms, speaking, dictionary and saved-item mapping before learner use.",
    ],
    "gates": {
        "ownerPage": False,
        "learnerRegistered": False,
        "scoring": False,
        "audioRegistered": False,
        "listeningReviewed": False,
        "offline": False,
        "progress": False,
        "v4Imported": False,
    },
}

output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
destination = HERE / "decision.json"
if "--check" in sys.argv:
    assert destination.read_text() == output, "decision.json is stale"
    print("PASS Japanese Foreman Foundation 5 packet build --check")
else:
    destination.write_text(output)
    print("wrote", destination)
