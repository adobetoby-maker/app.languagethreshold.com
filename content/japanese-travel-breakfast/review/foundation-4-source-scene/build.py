"""Render the inert, source-pinned Japanese Breakfast Foundation 4 packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
CURRICULUM = ROOT / "src/data/core60/es/foundation-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/foundation-travel-breakfast.json"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/foundation-1-10-draft.json"
PRIOR = ROOT / "content/japanese-travel-breakfast/review/foundation-4-9/source-correction-proposals.json"
OUT = HERE / "source-setting-candidate.json"
GATES = {name: False for name in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled", "audioRegistered",
    "listeningReviewed", "offlineRegistered", "progressWritesEnabled", "released",
    "runtimeImported", "ownerRouteEnabled",
)}

CARDS = [
    "オレンジジュース", "トースト", "バター", "ジャム", "果物", "お茶", "ナプキン",
    "スプーン", "フォーク", "生搾りのオレンジジュースはありますか。", "トーストはありますか。",
    "ナプキンが必要なのですが、いただけますか。", "砂糖なしのお茶をお願いします。",
    "レジで支払う必要がありますか。", "とてもおなかがすいています。",
]
SPEAKERS = ["Narrator", "Emma", "Luis", "Emma", "Luis", "Emma", "Emma", "Luis"]
CARD_GLOSSES = [
    "orange juice", "toast", "butter", "jam", "fruit", "tea (type unspecified)",
    "napkin", "spoon", "fork", "Do you have freshly squeezed orange juice?",
    "Is toast available?", "I need a napkin; could I have one?",
    "Tea without sugar, please.", "Is it necessary to pay at the register?",
    "I am feeling very hungry.",
]
READER_GLOSSES = [
    "At a café in Oaxaca, Emma tells staff member Luis, 'I am very hungry.'",
    "Is freshly squeezed orange juice available?",
    "Yes, we have it. There is also fresh fruit with breakfast.",
    "Is there toast?", "Yes, toast comes with butter and jam.",
    "Tea without sugar and a spoon, please.",
    "I also need a fork and napkin. Could I have them?",
    "Certainly. After the meal, payment at the register is requested in polite service language.",
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    src = json.loads(CURRICULUM.read_text())["lessons"][3]
    passage = json.loads(READER.read_text())["lessons"]["4"]["passage"]
    archive = json.loads(DRAFT.read_text())
    old = archive["lessons"][3]
    prior = json.loads(PRIOR.read_text())
    proposal = next(p for p in prior["proposals"] if p["lessonKey"] == "foundation:4")
    stable = "foundation-travel-breakfast:4:ja-en"
    assert src["n"] == old["n"] == 4 and old["stableId"] == stable
    assert old["sourceEnglishObjective"] == src["objective"]
    assert archive["reviewed"] is False and archive["registered"] is False
    assert len(src["words"]) == len(CARDS) == 15
    assert len(passage["target"]) == len(passage["native"]) == len(SPEAKERS) == 8
    assert [r["sourceEnglish"] for r in proposal["proposedSourceSettingReader"]] == passage["native"]
    revision = stable + ":source-scene-v2"
    cards = [
        {"id": f"{revision}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "targetJapaneseDraft": target, "literalJapaneseGlossEn": CARD_GLOSSES[i - 1],
         "kind": row["kind"],
         "sourceEnglishIsJapaneseGloss": False, "sourceSpanishNoteInternal": row.get("note")}
        for i, (row, target) in enumerate(zip(src["words"], CARDS), 1)
    ]
    lines = [
        {"id": f"{revision}:reader:{i:02d}", "candidatePosition": i,
         "speaker": speaker, "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": prior_row["ja"],
         "literalJapaneseGlossEn": READER_GLOSSES[i - 1],
         "sourceEnglishIsJapaneseGloss": False}
        for i, (es, en, speaker, prior_row) in enumerate(zip(
            passage["target"], passage["native"], SPEAKERS,
            proposal["proposedSourceSettingReader"]), 1)
    ]
    # Keep the exact source scene; improve service wording without changing its events.
    lines[7]["targetJapaneseDraft"] = "はい。お会計はお食事のあとにレジでお願いします。"
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "foundation", "lessonKey": "foundation:4", "stableLessonId": stable,
        "candidateRevision": revision, "reviewed": False,
        "source": {"curriculumPath": str(CURRICULUM.relative_to(ROOT)),
                   "curriculumSha256": sha(CURRICULUM),
                   "readerPath": str(READER.relative_to(ROOT)), "readerSha256": sha(READER),
                   "objectiveEnglish": src["objective"],
                   "titleSpanish": src["title"], "focusSpanish": src["focus"],
                   "speakingEnglish": src["speaking"],
                   "readerTitleSpanish": passage["title"],
                   "readerVerbExamples": [v["example"] for v in json.loads(READER.read_text())["lessons"]["4"]["verbs"]]},
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "priorProposal": {"path": str(PRIOR.relative_to(ROOT)), "sha256": sha(PRIOR),
                          "status": "retained as a narrower source-setting proposal; F9 is unchanged"},
        "status": "source-only Japanese-language full-scene candidate; unapproved",
        "sourceCards": cards, "sourceSettingReader": lines,
        "speakingGoalCandidate": "Say you are hungry, ask whether fresh-squeezed orange juice is available, and say you need a fork and napkin in the Oaxaca café scene.",
        "japaneseSpecificFocusCandidate": "Express need with 必要, ask availability with ありますか, and make polite breakfast requests; Spanish tener/hay/querer are separate source concepts, not a one-to-one Japanese grammar target.",
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)],
        "priorProposalDisposition": "The earlier v1 Reader and three additional card IDs remain in their inert proposal. Reader 1–7 text is identical to v1; Reader 8 and some card text differ. V2 IDs are all distinct. No v1 ID is reused, mapped or retired in shipped progress. Any candidate audio reuse must satisfy exact text, voice, placement ID and separate listening review.",
        "savedPositionPolicy": "Archived rows have no stable row IDs and no shipped saved positions are known. Candidate IDs are revision-scoped; a future insertion or reorder must use a new revision, never reuse a position ID with changed meaning. Do not map old positions or v1 proposal IDs to new IDs or scoring targets without reviewed migration or tombstones.",
        "modeStatus": "Archived six-mode descriptions are labels, not authored prompt/answer pairs; no answer is registered.",
        "audioNote": "New exact-text cards and Reader turns need audio scope, technical verification and distinct per-clip listening decisions. Older Foundation 4 recordings and the earlier proposal audio are not transferred to this revision.",
        "gates": GATES,
        "reviewQuestions": [
            "Qualified Japanese, Oaxaca locale and restaurant review is open. The Spanish source is reviewed:false and is a parity baseline, not qualified approval.",
            "Source natural orange juice is glossed freshly squeezed. Confirm 生搾り and the affirmative availability answer before setting a learner target.",
            "Confirm whether source tea means a generic tea or a specific type; お茶 may imply green tea in Japanese. Its English gloss is a functional meaning, not a claim of Japanese tea-type neutrality.",
            "Review restaurant context for isolated ナプキン, which could be ambiguous outside a meal; do not set an unreviewed dictionary sense.",
            "The source's fruit with breakfast may mean included or available; decide whether Reader 3 needs つきます rather than あります.",
            "The source's tener/hay/querer and verb examples are pinned separately. Japanese polite requests do not teach a one-to-one have/want morphology contrast; select a Japanese-specific objective and forms before learner use.",
            "Reader 1's narrator quotes Emma; voice and punctuation must be decided before recording.",
            "Review card 12's polite request, card 14's payment obligation wording, and Reader 7's need/request register together with the objective.",
            "Reconcile cards, Reader, dictionary, speaking, six authored modes and saved-item identity before any learner or V4 registration.",
        ],
    }


def main():
    rendered = json.dumps(render(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        assert OUT.read_text() == rendered, "Foundation 4 packet is stale"
        print("PASS Japanese Breakfast Foundation 4 source-scene build and closed gates")
    else:
        OUT.write_text(rendered)


if __name__ == "__main__":
    main()
