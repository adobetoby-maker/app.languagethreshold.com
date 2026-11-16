"""Build the inert Japanese Breakfast Core 11 source-scene review packet."""

import hashlib
import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[3]
SOURCE = ROOT / "public/lesson-content/es/travel-breakfast.json"
OBJECTIVES = ROOT / "src/data/travel-zone.ts"
DRAFT = ROOT / "content/review-archive/french-japanese-2026-11-15/japanese-breakfast/core-1-30-draft.json"
OUT = HERE / "source-setting-candidate.json"
PINNED_HASHES = {
    SOURCE: "8c00629a79532821ac7b554a4e0f828b25372500303b3dc70f9568c5aabb34cc",
    OBJECTIVES: "8ca7cacc58a272d5e2c9d55b06e265ec8f6b5102d412bc0382d448942e455fe8",
    DRAFT: "7a6ed4b3869c3599119ae74ea911f6c881bf87294342a060378a5a3f19de6112",
}

STABLE = "travel-breakfast:11:ja-en"
REVISION = STABLE + ":source-scene-v1"
GATES = {key: False for key in (
    "reviewed", "registered", "learnerVisible", "scoringEnabled",
    "audioRegistered", "listeningReviewed", "offlineRegistered",
    "progressWritesEnabled", "released", "runtimeImported",
    "ownerRouteEnabled", "v4Imported",
)}

CARDS = [
    "ミルク入りコーヒー",
    "カウンター",
    "バリスタ",
    "天気",
    "天気予報",
    "コート",
    "予定",
    "朝",
    "市の中心部",
    "注文",
    "眠気",
    "おはようございます。今朝はいかがですか。",
    "今日はとても寒いですね。",
    "まだ少し眠いです。",
    "雨が降らなければ、市の中心部を訪れるつもりです。",
    "すみません、もっとゆっくり、もう一度言っていただけますか。",
    "そちらこそ、良い一日をお過ごしください。",
]
CARD_GLOSSES = [
    "coffee with milk",
    "counter (service counter)",
    "barista (coffee maker/server)",
    "weather",
    "weather forecast",
    "coat (outer garment)",
    "plans (scheduled things)",
    "morning",
    "city center",
    "order (request for goods)",
    "sleepiness",
    "Good morning. How are you this morning? (polite)",
    "It is very cold today, isn't it?",
    "I am still a little sleepy.",
    "If it does not rain, I plan to visit the city center.",
    "Sorry, could you say it again more slowly?",
    "You too, please have a good day. (polite)",
]
READER_JA = [
    "早い時間に、私は小さなカフェにいて、カウンターでミルク入りコーヒーを待っています。",
    "女性のバリスタが私に笑顔を向け、「おはようございます。今朝はいかがですか」と言います。",
    "私は「とても元気です。ありがとうございます。でも、まだ少し眠いです」と答えます。",
    "彼女は、昨夜雨が降ったので今日は寒いと言い、私は自分の国では天気がとても違うと彼女に伝えます。",
    "近くにいる男性が「今日のご予定は何ですか」と尋ねます。",
    "私は、また雨が降らなければ市の中心部を訪れるつもりだと説明します。",
    "彼は、天気予報によると午後は涼しくなる見込みなので、コートを持っていくよう勧めます。",
    "注文した品ができると、バリスタが私に「どうぞ素敵な一日をお過ごしください」と言います。",
    "私は笑顔で答えます。「そちらこそ、良い一日をお過ごしください」",
]
READER_GLOSSES = [
    "It is early, and I am in a small cafe waiting for my milk-containing coffee at the counter.",
    "The female barista smiles at me and says: 'Good morning. How are you this morning?' (polite)",
    "I answer: “I am very well. Thank you. But I am still a little sleepy.”",
    "She says it is cold today because it rained last night, and I tell her the weather in my country is very different.",
    "A man near me asks: 'What are your plans for today?' (polite)",
    "I explain that I plan to visit the city center if it does not rain again.",
    "He recommends that I bring a coat, because according to the weather forecast the afternoon is expected to be cool.",
    "When the ordered item is ready, the barista tells me: “Please have a wonderful day.”",
    "I answer with a smile: 'You too, please have a good day.' (polite)",
]

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render():
    if any(sha(path) != expected for path, expected in PINNED_HASHES.items()):
        raise ValueError("pinned source drift")
    source_file = json.loads(SOURCE.read_text(encoding="utf-8"))
    source = source_file["lessons"]["11"]
    archived = json.loads(DRAFT.read_text(encoding="utf-8"))
    old = archived["lessons"][10]
    assert old["n"] == 11 and old["stableId"] == STABLE
    assert old["sourceEnglish"]["englishWordAnchors"] == [w["en"] for w in source["words"]]
    assert old["sourceEnglish"]["englishReading"] == source["passage"]["native"]
    assert archived["reviewed"] is False and archived["registered"] is False
    assert len(source["words"]) == len(CARDS) == len(CARD_GLOSSES) == 17
    passage = source["passage"]
    assert len(passage["target"]) == len(passage["native"]) == len(READER_JA) == len(READER_GLOSSES) == 9
    objective = old["sourceEnglish"]
    objectives_text = OBJECTIVES.read_text(encoding="utf-8")
    title_at = objectives_text.index('"Make morning small talk"')
    objective_at = objectives_text.index('"' + objective["objective"] + '"')
    roleplay_at = objectives_text.index('"' + objective["roleplay"] + '"')
    if not (0 < objective_at - title_at < 250 and 0 < roleplay_at - objective_at < 500):
        raise ValueError("title, objective and roleplay pairing drift")
    cards = [
        {"id": f"{REVISION}:card:{i:02d}", "candidatePosition": i,
         "sourceSpanish": row["es"], "sourceEnglish": row["en"],
         "kind": row["kind"], "sourceNoteInternal": row.get("note"),
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False}
        for i, (row, ja, gloss) in enumerate(zip(source["words"], CARDS, CARD_GLOSSES), 1)
    ]
    reader = [
        {"id": f"{REVISION}:reader:{i:02d}", "candidatePosition": i,
         "speaker": "Narrator", "sourceSpanish": es, "sourceEnglish": en,
         "targetJapaneseDraft": ja, "literalJapaneseGlossEn": gloss,
         "sourceEnglishIsJapaneseGloss": False, "learnerFaceEnabled": False,
         "selectionStatus": "withheld for source editorial review" if ja is None else "unapproved draft candidate"}
        for i, (es, en, ja, gloss) in enumerate(zip(
            passage["target"], passage["native"], READER_JA, READER_GLOSSES), 1)
    ]
    draft_faces = [r for r in cards + reader if r["targetJapaneseDraft"]]
    overlaps = [
        {"oldPosition": oi, "candidatePosition": ni, "migrationAuthorized": False,
         "textOnly": True}
        for oi, old_row in enumerate(old["cards"], 1)
        for ni, new_row in enumerate(cards, 1)
        if old_row["ja"] == new_row["targetJapaneseDraft"]
    ]
    if any("id" in row for row in old["cards"] + old["reader"]):
        raise ValueError("archived row ID assumption changed")
    old_ids = {row["id"] for row in old["cards"] + old["reader"] if "id" in row}
    new_ids = {row["id"] for row in cards + reader}
    return {
        "schema": 1, "pairKey": "Japanese:English", "track": "travel-breakfast",
        "stage": "core", "lessonKey": "core:11", "stableLessonId": STABLE,
        "candidateRevision": REVISION, "status": "source-only Japanese candidate; unapproved",
        "reviewed": False,
        "source": {"contentPath": str(SOURCE.relative_to(ROOT)), "contentSha256": sha(SOURCE),
                   "objectivesPath": str(OBJECTIVES.relative_to(ROOT)), "objectivesSha256": sha(OBJECTIVES),
                   "sourceVersion": source_file["version"],
                   "sourceReviewed": source_file["reviewed"],
                   "sourceModelClaim": source_file.get("model"),
                   "titleEnglishInternal": "Make morning small talk",
                   "objectiveEnglishInternal": objective["objective"],
                   "objectiveEditorialHold": False,
                   "roleplayEnglishInternal": objective["roleplay"],
                   "readerTitleSpanish": passage["title"],
                   "readerVerbExamples": [v["example"] for v in source["verbs"]]},
        "archivedDraft": {"path": str(DRAFT.relative_to(ROOT)), "sha256": sha(DRAFT),
                          "scene": old["scene"], "cardCount": len(old["cards"]),
                          "readerCount": len(old["reader"])},
        "sourceCards": cards, "sourceSettingReader": reader,
        "japaneseSpecificFocusCandidate": "Exchange greetings and talk about cold weather, a conditional downtown visit, and a coat recommendation while waiting for coffee.",
        "speakingGoalInternal": objective["roleplay"],
        "sourceConflictInternal": "The archived Japanese scene changes a conditional downtown visit to a walk near the station and omits last-night rain, the coat/forecast recommendation, and a nearby male customer. The source Reader keeps the barista female, the nearby customer male, and the trip conditional on rain not returning. Do not infer a specific city or actual weather forecast beyond a cool afternoon.",
        "oldCardPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["cards"], 1)],
        "oldReaderPositionPlan": [
            {"old": i, "candidate": None, "oldEnglish": row["en"],
             "disposition": "retire from candidate only; retain archive; no saved-item migration"}
            for i, row in enumerate(old["reader"], 1)],
        "archivedExactCardOverlapInternal": overlaps,
        "audioScopeReadOnly": {
            "draftFacePlacements": len(draft_faces),
            "twoVoiceClipDecisionsIfTextApproved": 2 * len(draft_faces),
            "twoVoiceSubmittedCharactersIfTextApproved": 2 * sum(len(r["targetJapaneseDraft"]) for r in draft_faces),
            "grossEstimateUSDAt30PerMillionCharacters": round(
                30 * 2 * sum(len(r["targetJapaneseDraft"]) for r in draft_faces) / 1_000_000, 5),
            "archivedExactJapaneseCardTextOverlapsOnly": len(overlaps),
            "candidateIDsMatchingArchive": len(new_ids & old_ids),
            "synthesized": False, "listeningApproved": False, "registered": False,
        },
        "savedPositionPolicy": "Archived draft rows were not registered and have no explicit stable row IDs. New revision-scoped IDs do not authorize saved-item or audio placement migration. This revision's order is frozen; any insertion or reordering requires a new revision.",
        "reviewQuestionsInternal": [
            "Confirm whether ミルク入りコーヒー or カフェオレ best fits this café and source term.",
            "Review polite greeting 今朝はいかがですか for Spanish ¿cómo amaneció? without turning it into a sleep question.",
            "Review 天気 versus 気候 for climate/weather in Reader 4 while retaining the source English weather meaning.",
            "Review 市の中心部, 予報, 眠気 and the source's female barista/male nearby customer with qualified Japanese and dictionary reviewers.",
            "Check register and naturalness of the two distinct reciprocal farewells.",
            "Assess source card phrases for repeating slowly and cold-weather small talk which do not all appear literally in the Reader.",
        ],
        "missing": ["qualified Japanese/source/dictionary review", "six authored mode prompt/target pairs",
                    "source-aligned Japanese grammar/form examples", "contextual dictionary senses",
                    "speaking setup and card-only word bank", "authorized saved-item policy",
                    "exact-text audio and per-clip listening", "learner/offline/native acceptance"],
        "gates": GATES,
    }


if __name__ == "__main__":
    rendered = json.dumps(render(), ensure_ascii=False, indent=2) + "\n"
    if "--check" in sys.argv:
        if OUT.read_text(encoding="utf-8") != rendered:
            raise ValueError("stale generated packet")
    else:
        OUT.write_text(rendered, encoding="utf-8")
