#!/usr/bin/env python3
"""Build an inert source-pinned Foreman Foundation 6 decision packet."""

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
REVISION = "foundation-construction-foreman:6:ja-en:source-decision-v1"

# Text-only proposals; no learner answer or audio script is selected.
CARD_JAPANESE = [
    "ブロック",
    "壁",
    "石膏ボード",
    "バケツ",
    "砂",
    "砂利",
    "ねじ",
    "のこぎり",
    "水準器",
    "ごみ",
    "ホース",
    None,  # tú versus Japanese role/register needs a teaching decision
    None,  # usted/formal you has no settled Japanese task/register framing
    "私たちは4時に現場を清掃します。",
    "あの人たちはブロックを2階へ運び上げます。",
    "私は掃き掃除をし、あの人たちはごみを拾います。",
    "砂とセメントを混ぜます。",
]
READER_JAPANESE = [
    "カルロスは現場でアナと作業を分担します。",
    "カルロス：「私はのこぎりで石膏ボードを切ります。」",
    None,  # poner tornillos: put in versus drive/fasten screws needs trade wording
    "アナ：「私は水準器で壁を確認します。」",
    "カルロス：「ルイスとペドロはブロックを2階へ運び上げます。」",
    "カルロス：「砂と砂利をセメントと混ぜます。」",
    "カルロス：「私たちは4時に現場を清掃します。」",
    "カルロス：「私は掃き掃除をし、あの人たちはごみを拾います。」",
    "アナ：「私はホースでバケツを洗います。」",
]


def pinned(path):
    data = subprocess.check_output(["git", "show", f"{SOURCE_COMMIT}:{path}"], cwd=ROOT)
    return json.loads(data), hashlib.sha256(data).hexdigest()


curriculum, curriculum_hash = pinned(CURRICULUM)
reader_file, reader_hash = pinned(READER)
old_file, old_hash = pinned(OLD_DRAFT)
lesson = curriculum["lessons"][5]
reader = reader_file["lessons"]["6"]["passage"]
old = old_file["lessons"][5]
assert lesson["n"] == old["n"] == 6
assert len(lesson["words"]) == len(CARD_JAPANESE) == 17
assert len(reader["target"]) == len(reader["native"]) == len(READER_JAPANESE) == 9

packet = {
    "schema": 1,
    "track": "construction-foreman",
    "stage": "foundation",
    "pairKey": "Japanese:English",
    "lessonKey": "foundation:6",
    "stableLessonId": "foundation-construction-foreman:6:ja-en",
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
            "Older Japanese Foundation 6 teaches location particles with Sato and Tanaka; source Foundation 6 divides Carlos and Ana's cutting, carrying, mixing and cleanup tasks."
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
        "Choose a Japanese task and register contrast that preserves the source's tú versus usted focus without pretending Japanese has Spanish person endings; card 13 remains null.",
            "Resolve whether Reader 3 puts, drives or fastens screws into drywall before selecting Japanese construction wording.",
        "Review tablaroca/drywall, wall checking with a level, block carry to the second floor, mixing sand/gravel/cement and cleanup vocabulary with qualified Japanese and trade specialists.",
        "Keep the source's four-o'clock schedule and Carlos, Ana, Luis and Pedro roles exact; do not use the older Sato/Tanaka location scene or its audio.",
        "Author six actual mode prompt/target pairs, forms, speaking, contextual dictionary and saved-item mapping before learner use.",
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
    print("PASS Japanese Foreman Foundation 6 packet build --check")
else:
    destination.write_text(output)
    print("wrote", destination)
