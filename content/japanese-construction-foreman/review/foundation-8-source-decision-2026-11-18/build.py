#!/usr/bin/env python3
"""Build inert source-pinned Japanese Foreman Foundation 8 review evidence."""
import hashlib
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE_COMMIT = "d976ba21962d9306c594e5ce6084019ec6627158"
CURRICULUM = "src/data/core60/es/foundation-construction-foreman.json"
READER = "public/lesson-content/es/foundation-construction-foreman.json"
OLD_DRAFT = "content/japanese-construction-foreman/foundation-draft.json"
REVISION = "foundation-construction-foreman:8:ja-en:source-decision-v1"

# Conditional translation proposals only. Selected answers and audio remain null.
CARD_JAPANESE = [
    None, None, None, "まだ…ない", "もっと", None, "別の", "危険", "納品", None,
    "足場には誰もいません。", "保護メガネなしでは決して作業しません。",
    "納品はまだ届いていません。", "別のはしごが必要です。", None,
    "不足しているものは何もありません。",
]
READER_JAPANESE = [
    "現場監督のルイスは7時にアナと現場を確認します。",
    "ルイス：「納品はまだ届いていません。」",
    "ルイス：「ブロックがなければ、今日は誰も壁の作業をしません。」",
    "アナ：「別のはしごが必要です。」",
    None,
    "ルイス：「開いたままの掘削溝は作業班にとって危険です。」",
    None,
    "アナ：「保護メガネなしで作業することは決してありません。」",
    "ルイス：「箱には全員分の保護メガネがあり、足りないものはありません。」",
]

def pinned(path):
    data = subprocess.check_output(["git", "show", f"{SOURCE_COMMIT}:{path}"], cwd=ROOT)
    return json.loads(data), hashlib.sha256(data).hexdigest()

curriculum, curriculum_hash = pinned(CURRICULUM)
reader_file, reader_hash = pinned(READER)
old_file, old_hash = pinned(OLD_DRAFT)
lesson = curriculum["lessons"][7]
reader = reader_file["lessons"]["8"]["passage"]
old = old_file["lessons"][7]
assert lesson["n"] == old["n"] == 8
assert len(lesson["words"]) == len(CARD_JAPANESE) == 16
assert len(reader["target"]) == len(reader["native"]) == len(READER_JAPANESE) == 9
packet = {
    "schema": 1,
    "track": "construction-foreman",
    "stage": "foundation",
    "pairKey": "Japanese:English",
    "lessonKey": "foundation:8",
    "stableLessonId": "foundation-construction-foreman:8:ja-en",
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
        "materialDrift": ["Old Japanese Foundation 8 asks about tomorrow's meeting time and place with Tanaka and Sato; current source is Luis and Ana's missing delivery, ladder, water mix, open trench and safety-glasses workday."],
    },
    "reviewed": False,
    "cards": [
        {"id": f"{REVISION}:card:{i:02d}", "position": i,
         "sourceSpanish": w["es"], "sourceEnglish": w["en"], "kind": w["kind"],
         "sourceNoteInternal": w.get("note"), "japaneseDraft": jp,
         "selectedJapanese": None, "decisionOpen": jp is None}
        for i, (w, jp) in enumerate(zip(lesson["words"], CARD_JAPANESE), 1)
    ],
    "reader": [
        {"id": f"{REVISION}:reader:{i:02d}", "position": i,
         "sourceSpanish": es, "sourceEnglish": en, "japaneseDraft": jp,
         "selectedJapanese": None, "decisionOpen": jp is None}
        for i, (es, en, jp) in enumerate(zip(reader["target"], reader["native"], READER_JAPANESE), 1)
    ],
    "decisionsNeeded": [
        "Resolve isolated never, nobody, nothing, less and caution-tape Japanese senses before selecting cards 1–3, 6 and 10; source Spanish no/nunca/nadie/nada grammar does not transfer word for word.",
        "Resolve 'mix needs less water' without suggesting an unverified mix ratio or procedure; leave card 15 and Reader 5 Japanese unset pending qualified construction/source review.",
        "Confirm open trench and caution tape terminology and scope with qualified Japanese and construction reviewers. Reader 7 is unset, and Reader 6 is conditional; do not convert a scene claim into worksite instructions.",
        "Preserve Luis, Ana, 7 o'clock, undelivered blocks, wall, another ladder, open trench, safety glasses and box in source order; archived tomorrow-meeting scene is a separate lesson.",
        "Map Spanish negative patterns to natural Japanese negation and distinguish not yet from never as a curriculum choice; author exact six modes, forms, speaking, dictionary and saved-item semantics.",
        "Verify qualified exact text before audio synthesis and make separate technical and listening decisions for every clip.",
    ],
    "gates": {"ownerPage": False, "learnerRegistered": False, "scoring": False,
              "audioRegistered": False, "listeningReviewed": False, "offline": False,
              "progress": False, "v4Imported": False},
}
output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
destination = HERE / "decision.json"
if "--check" in sys.argv:
    assert destination.read_text() == output, "decision.json is stale"
    print("PASS Japanese Foreman Foundation 8 packet build --check")
else:
    destination.write_text(output)
    print("wrote", destination)
