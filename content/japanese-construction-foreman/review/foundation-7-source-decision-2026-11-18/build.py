#!/usr/bin/env python3
"""Build inert source-pinned Japanese Foreman Foundation 7 review evidence."""
import hashlib
import json
import pathlib
import subprocess
import sys

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE_COMMIT = "d02c719190abea77144d89af908d352fd011eacb"
CURRICULUM = "src/data/core60/es/foundation-construction-foreman.json"
READER = "public/lesson-content/es/foundation-construction-foreman.json"
OLD_DRAFT = "content/japanese-construction-foreman/foundation-draft.json"
REVISION = "foundation-construction-foreman:7:ja-en:source-decision-v1"

# Conditional translation proposals only. Selected answers and audio remain null.
CARD_JAPANESE = [
    "何？", "誰？", "どこ？", "いつ？", None, "いくつ？", "どう？", "なぜ？", None,
    None, "図面", "図面はどこにありますか。", "今日は誰がフォークリフトを運転しますか。",
    "検査員はいつ来ますか。", "板は何枚足りませんか。", "どのはしごを使いますか。", "何が必要ですか。",
]
READER_JAPANESE = [
    "現場でルイスはローサに尋ねます。「図面はどこにありますか。」",
    "ローサ：「トラックの中にあります。でも、どの図面が必要ですか。」",
    "ルイス：「台所の図面が必要です。それと、許可証は誰が持っていますか。」",
    "ローサ：「私が許可証を持っています。でも、なぜ必要なのですか。」",
    "ルイス：「今日は検査があります。でも、検査員はいつ来ますか。」",
    "ローサ：「事務所によると10時に来ます。でも、何を調べますか。」",
    "ルイス：「台所を調べます。でも、そこには作業員が何人いますか。」",
    "ローサ：「作業員は4人います。それと、検査員にはどのくらい時間が必要ですか。」",
    "ルイス：「だいたい1時間です。でも、台所は今どんな状態ですか。」",
]

def pinned(path):
    data = subprocess.check_output(["git", "show", f"{SOURCE_COMMIT}:{path}"], cwd=ROOT)
    return json.loads(data), hashlib.sha256(data).hexdigest()

curriculum, curriculum_hash = pinned(CURRICULUM)
reader_file, reader_hash = pinned(READER)
old_file, old_hash = pinned(OLD_DRAFT)
lesson = curriculum["lessons"][6]
reader = reader_file["lessons"]["7"]["passage"]
old = old_file["lessons"][6]
assert lesson["n"] == old["n"] == 7
assert len(lesson["words"]) == len(CARD_JAPANESE) == 17
assert len(reader["target"]) == len(reader["native"]) == len(READER_JAPANESE) == 9
packet = {
    "schema": 1,
    "track": "construction-foreman",
    "stage": "foundation",
    "pairKey": "Japanese:English",
    "lessonKey": "foundation:7",
    "stableLessonId": "foundation-construction-foreman:7:ja-en",
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
        "materialDrift": ["Old Japanese Foundation 7 names Sato and Kobayashi's saw and hammer in a storage-room yes/no exercise; current source asks Luis and Rosa site, blueprint, permit, inspection and worker-count questions."],
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
        "Resolve source cuánto amount-versus-duration and cuántos noun/classifier senses before selecting Japanese cards 5 and 6.",
        "Resolve cuál as stand-alone which versus qué before a noun; source card 16 asks which ladder with qué, so Japanese どの is only a contextual candidate.",
        "Identify what kind of site permit the source means before selecting card 10 and Reader 3–4 Japanese 許可証 terminology; do not invent a permit type or legal requirement.",
        "Confirm the site inspection/blueprint/truck/kitchen scene, characters, ten-o'clock visit, four-worker count and approximately one-hour duration with qualified Japanese and construction reviewers.",
        "Review polite register for Spanish usted, forklift operator wording and the source question-words objective as Japanese curriculum, not a Spanish-word translation exercise.",
        "Author exact six mode prompt/target pairs, forms, speaking, contextual dictionary and saved-item mapping; verify exact text before audio synthesis and distinct listening review.",
    ],
    "gates": {"ownerPage": False, "learnerRegistered": False, "scoring": False,
              "audioRegistered": False, "listeningReviewed": False, "offline": False,
              "progress": False, "v4Imported": False},
}
output = json.dumps(packet, ensure_ascii=False, indent=2) + "\n"
destination = HERE / "decision.json"
if "--check" in sys.argv:
    assert destination.read_text() == output, "decision.json is stale"
    print("PASS Japanese Foreman Foundation 7 packet build --check")
else:
    destination.write_text(output)
    print("wrote", destination)
