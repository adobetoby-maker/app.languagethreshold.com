#!/usr/bin/env python3
"""Build inert, source-pinned Japanese Foreman Foundation 9 review evidence."""
import hashlib
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE_COMMIT = "9e5b118fd9c00daf94c5589bbd05d4fa9e396690"
CURRICULUM = "src/data/core60/es/foundation-construction-foreman.json"
READER = "public/lesson-content/es/foundation-construction-foreman.json"
OLD_DRAFT = "content/japanese-construction-foreman/foundation-draft.json"
REVISION = "foundation-construction-foreman:9:ja-en:source-decision-v1"

# Conditional proposals only: no learner answer or recording script is selected.
CARD_JAPANESE = [
    "お願いします", "すみません、通ります", "パレット", "梁", None, "ロープ",
    "大ハンマー", "ごみ箱", "救急箱", None,
    "すみません、はしごを持ってきていただけますか。",
    "パレットをここに置いてください。", "少しお待ちください。",
    "ヘルメットをかぶってください。", None, None,
]
READER_JAPANESE = [
    "ルイスはヒューストンの建設現場の職長です。",
    "ルイス：「ペドロ、パレットを持ってきていただけますか。」",
    "ペドロ：「すみません、パレットを持って通ります。」",
    "ルイス：「パレットをここに置いてください。」",
    None,
    "ペドロ：「はい、梁をロープで縛ります。」",
    None,
    "ルイス：「ごみ箱をドアのそばに置いてください。」",
    "ルイス：「救急箱を持ってきて、照明をつけてください。」",
]


def pinned(path):
    data = subprocess.check_output(["git", "show", f"{SOURCE_COMMIT}:{path}"], cwd=ROOT)
    return json.loads(data), hashlib.sha256(data).hexdigest()


curriculum, curriculum_hash = pinned(CURRICULUM)
reader_file, reader_hash = pinned(READER)
old_file, old_hash = pinned(OLD_DRAFT)
lesson = curriculum["lessons"][8]
reader = reader_file["lessons"]["9"]["passage"]
old = old_file["lessons"][8]
assert lesson["n"] == old["n"] == 9
assert len(lesson["words"]) == len(CARD_JAPANESE) == 16
assert len(reader["target"]) == len(reader["native"]) == len(READER_JAPANESE) == 9

packet = {
    "schema": 1,
    "track": "construction-foreman",
    "stage": "foundation",
    "pairKey": "Japanese:English",
    "lessonKey": "foundation:9",
    "stableLessonId": "foundation-construction-foreman:9:ja-en",
    "candidateRevision": REVISION,
    "sourceCommit": SOURCE_COMMIT,
    "source": {
        "curriculumPath": CURRICULUM, "curriculumSha256": curriculum_hash,
        "readerPath": READER, "readerSha256": reader_hash,
        "japaneseDraftPath": OLD_DRAFT, "japaneseDraftSha256": old_hash,
        "objectiveEnglish": lesson["objective"], "focusSpanish": lesson["focus"],
        "speakingEnglish": lesson["speaking"], "readerTitleSpanish": reader["title"],
    },
    "archivedDraft": {
        "title": old["title"], "scene": old["scene"],
        "termCount": len(old["terms"]), "readerCount": len(old["dialogue"]),
        "materialDrift": ["Old Japanese Foundation 9 asks Sato to repeat a noisy storage-room meeting instruction. Current source is Luis and Pedro's Houston jobsite requests for a pallet, beam help, sledgehammer, tarp, trash can, first aid kit and light."],
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
        "Set Japanese register for Pedro and Luis. Spanish puede and usted commands are polite, while workplace role and Japanese request forms need qualified review.",
        "Resolve tarp and light standalone senses before selecting cards 5 and 10; the Reader's turn-on-light context supports a conditional illumination proposal but not a universal card headword.",
        "Resolve help with the beam without inventing lifting/carrying work, and resolve call the supervisor as telephone versus summon before selecting cards 15 and 16 or Reader 5.",
        "Confirm pallet, beam, sledgehammer, hard hat, first aid kit and tarp terms with qualified Japanese/construction/dictionary reviewers; Reader 7 remains unset for tarp terminology.",
        "Preserve Houston, Luis, Pedro, pallet, beam, rope, sledgehammer, tarp, trash can, first aid kit and light in source order; do not substitute the archived meeting scene or transfer its saved positions or audio.",
        "Author six exact prompt/target modes, forms, speaking, dictionary and saved-item semantics only after qualified text selection; verify exact text before synthesis and make separate technical and human listening decisions per clip.",
    ],
    "gates": {"ownerPage": False, "learnerRegistered": False, "scoring": False,
              "audioRegistered": False, "listeningReviewed": False, "offline": False,
              "progress": False, "v4Imported": False},
}
output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
destination = HERE / "decision.json"
if "--check" in sys.argv:
    assert destination.read_text() == output, "decision.json is stale"
    print("PASS Japanese Foreman Foundation 9 packet build --check")
else:
    destination.write_text(output)
    print("wrote", destination)
