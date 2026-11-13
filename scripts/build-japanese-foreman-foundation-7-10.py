#!/usr/bin/env python3
"""Build the private F7–10 Japanese Foreman draft from pinned English source."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content/japanese-construction-foreman"
source = json.loads((CONTENT / "foundation-source-4-10.json").read_text())

authored = {
    7: {
        "title": "現場で質問する",
        "objective": "現場の作業、予定、許可について、何・誰・どこ・いつ・いくつ・なぜを聞けます。",
        "focus": "何、誰、どこ、いつ、いくら、いくつ、どう、なぜ、どの。数えるものに合わせて何枚・何本を使います。",
        "japanese": ["何？", "誰？", "どこ？", "いつ？", "いくら？", "いくつ？", "どうやって？", "なぜ？", "どの？", "許可証", "図面", "図面はどこにありますか？", "今日は誰がフォークリフトを運転しますか？", "検査員はいつ来ますか？", "板はあと何枚足りませんか？", "どのはしごを使いますか？", "何が必要ですか？"],
        "readings": ["なに", "だれ", "どこ", "いつ", "いくら", "いくつ", "どうやって", "なぜ", "どの", "きょかしょう", "ずめん"],
        "reading": {
            "title": "Before the inspection",
            "target": ["図面はどこにありますか？", "図面は事務所にあります。", "許可証は誰が持っていますか？", "田中さんが持っています。", "検査員はいつ来ますか？", "午後二時に来ます。", "板はあと何枚足りませんか？", "あと三枚足りません。"],
            "native": ["Where are the blueprints?", "The blueprints are in the office.", "Who has the permit?", "Mr. Tanaka has it.", "When is the inspector coming?", "They are coming at 2 p.m.", "How many boards are we still short?", "We are still short three boards."],
        },
        "speaking": "作業員に図面の場所、許可証を持っている人、検査員が来る時間を聞いてください。足りない板の数も確かめてください。",
        "openingLine": "図面を探しています。どこにあるか分かりますか？",
        "partnerRole": "A coworker who knows where the blueprints are and answers questions about the permit and inspector's arrival time.",
        "checks": [
            ("____はどこにありますか？", "図面", "Where are the blueprints?", "図面 (ずめん) means blueprints; どこ asks where."),
            ("検査員は____来ますか？", "いつ", "When is the inspector coming?", "いつ asks when; the question needs no word-order reversal."),
            ("板はあと____足りませんか？", "何枚", "How many boards are we still short?", "何枚 (なんまい) counts flat boards; あと means still or remaining."),
        ],
    },
    8: {
        "title": "まだない・もう少し必要",
        "objective": "足りないもの、まだ届いていないもの、もっと必要なものや減らすものを伝えられます。",
        "focus": "いません・ありません、まだ〜ていません、決して〜ません、もっと、少なく、もう一つ。人と物で否定の動詞を分けます。",
        "japanese": ["一度も〜ない", "誰もいない", "何もない", "まだ〜ない", "もっと", "少なく", "もう一つ", "危険箇所", "納品", "警戒テープ", "足場には誰もいません。", "安全めがねなしでは、決して作業しません。", "納品はまだ届いていません。", "もう一本はしごが必要です。", "モルタルに入れる水を減らしてください。", "足りないものは何もありません。"],
        "readings": ["いちども〜ない", "だれもいない", "なにもない", "まだ〜ない", "もっと", "すくなく", "もうひとつ", "きけんかしょ", "のうひん", "けいかいテープ"],
        "reading": {
            "title": "Checking the delivery",
            "target": ["納品はまだ届いていません。", "足場には誰もいません。", "もう一本はしごが必要です。", "危険箇所には警戒テープを張ってください。", "安全めがねなしでは、決して作業しません。", "モルタルには水を少なく入れてください。", "足りないものは何もありません。"],
            "native": ["The delivery has not arrived yet.", "There is nobody on the scaffold.", "We need another ladder.", "Please put caution tape around the hazardous area.", "We never work without safety glasses.", "Add less water to the mortar.", "Nothing is missing."],
        },
        "speaking": "同僚に今日足りないものと、まだ届いていない納品を伝えてください。さらに必要な物と、水を減らす必要があることを伝えてください。",
        "openingLine": "納品はもう届きましたか？ほかに必要なものはありますか？",
        "partnerRole": "A coworker asking whether the delivery has arrived and what supplies are missing or needed in a different quantity.",
        "checks": [
            ("納品は____届いていません。", "まだ", "The delivery has not arrived yet.", "まだ〜ていません means an expected event has not happened yet."),
            ("足場には____いません。", "誰も", "There is nobody on the scaffold.", "誰も with a negative verb means nobody; いません refers to people."),
            ("もう____はしごが必要です。", "一本", "We need another ladder.", "一本 (いっぽん) can count one portable ladder; the appropriate counter may vary with ladder type."),
        ],
    },
    9: {
        "title": "丁寧に頼む・指示する",
        "objective": "作業員に丁寧に手伝いを頼み、現場で簡単な指示を出せます。",
        "focus": "〜てもらえますか for a polite request and 〜てください for a polite instruction; 危険な場面では短く明確に作業を止めます。",
        "japanese": ["お願いします", "すみません", "パレット", "梁", "養生シート", "ロープ", "大ハンマー", "ごみ箱", "救急箱", "照明", "はしごを持ってきてもらえますか？", "パレットをここに置いてください。", "少し待ってください。", "ヘルメットをかぶってください。", "梁を運ぶのを手伝ってもらえますか？", "作業を止めて、監督者に連絡してください。"],
        "readings": ["おねがいします", "すみません", "パレット", "はり", "ようじょうシート", "ロープ", "おおハンマー", "ごみばこ", "きゅうきゅうばこ", "しょうめい"],
        "reading": {
            "title": "A careful request before moving materials",
            "target": ["すみません、はしごを持ってきてもらえますか？", "はい、持ってきます。", "パレットをここに置いてください。", "梁を運ぶのを手伝ってもらえますか？", "もちろんです。先にロープを確認します。", "ヘルメットをかぶってください。", "危険です。作業を止めて、監督者に連絡してください。"],
            "native": ["Excuse me, can you bring the ladder?", "Yes, I will bring it.", "Put the pallet here, please.", "Can you help me carry the beam?", "Of course. I will check the rope first.", "Put on your hard hat.", "This is dangerous. Stop work and contact the supervisor."],
        },
        "speaking": "作業員にパレットを持ってきて梁を運ぶのを手伝うよう丁寧に頼んでください。そのあと、ヘルメット着用と危険時の作業中止を明確に指示してください。",
        "openingLine": "パレットはどこに置きますか？梁を運ぶ前に何を確認しますか？",
        "partnerRole": "A worker who asks where to put the pallet and how to help before moving a beam; they respond to clear safety instructions.",
        "checks": [
            ("パレットをここに____ください。", "置いて", "Put the pallet here, please.", "置いてください is a polite instruction using the て-form."),
            ("梁を運ぶのを____もらえますか？", "手伝って", "Can you help me carry the beam?", "〜てもらえますか asks politely for someone's help."),
            ("危険です。作業を止めて、監督者に____ください。", "連絡して", "This is dangerous. Stop work and contact the supervisor.", "連絡してください means please contact; the work-stop instruction comes first."),
        ],
    },
    10: {
        "title": "聞き返す・助けを求める",
        "objective": "分からないときに聞き返し、現場の言葉の意味を尋ね、緊急時に助けを呼べます。",
        "focus": "分かりません、ゆっくり話してください、〜はどういう意味ですか; Japanese does not form Spanish-style cognates, so learn useful kanji compounds and loanwords separately.",
        "japanese": ["検査", "建設", "安全", "電気", "品質", "緊急事態", "事故", "緊急の", "顧客", "設置", "すみません、分かりません。", "もう少しゆっくり話してもらえますか？", "日本語を少し話せます。", "『打設』はどういう意味ですか？", "緊急事態です。911に電話してください！", "設置作業を手伝ってください。"],
        "readings": ["けんさ", "けんせつ", "あんぜん", "でんき", "ひんしつ", "きんきゅうじたい", "じこ", "きんきゅうの", "こきゃく", "せっち"],
        "reading": {
            "title": "Ask when a jobsite word is unclear",
            "target": ["すみません、分かりません。", "もう少しゆっくり話してもらえますか？", "『打設』はどういう意味ですか？", "コンクリートを型枠に入れることです。", "日本語を少し話せます。", "設置作業を手伝ってください。", "事故です。緊急事態です。911に電話してください！"],
            "native": ["Sorry, I don't understand.", "Could you speak a little more slowly?", "What does 'dasetsu' mean?", "It means putting concrete into the formwork.", "I speak a little Japanese.", "Please help me with the installation.", "There is an accident. It is an emergency. Call 911!"],
        },
        "speaking": "同僚に日本語を少し話せることを伝え、ゆっくり話してもらうよう頼み、現場の言葉の意味を聞いてください。緊急時の911は米国現場の設定です。",
        "openingLine": "この作業の説明は分かりましたか？分からない言葉はありますか？",
        "partnerRole": "A coworker who explains a jobsite term, slows down when asked, and responds to a request for help.",
        "checks": [
            ("すみません、____。", "分かりません", "Sorry, I don't understand.", "分かりません states that you did not understand; it invites clarification."),
            ("『打設』は____意味ですか？", "どういう", "What does 'dasetsu' mean?", "どういう意味ですか asks the meaning of a word or expression."),
            ("事故です。緊急事態です。____に電話してください！", "911", "There is an accident. It is an emergency. Call 911!", "911 is the emergency number for the US jobsite setting of this lesson; it is not the Japanese emergency number."),
        ],
    },
}

lessons = []
for english in source["lessons"]:
    if english["n"] < 7:
        continue
    data = authored[english["n"]]
    assert len(data["japanese"]) == len(english["words"])
    assert len(data["readings"]) == len([w for w in english["words"] if w["kind"] == "term"])
    terms = iter(data["readings"])
    words = []
    for original, japanese in zip(english["words"], data["japanese"]):
        english_text = original["en"]
        if english["n"] == 10 and english_text == "I speak a little Spanish.":
            english_text = "I speak a little Japanese."
        if english["n"] == 10 and english_text == 'What does "colar" mean?':
            english_text = 'What does "dasetsu" mean?'
        word = {"en": english_text, "es": japanese, "kind": original["kind"]}
        if original["kind"] == "term":
            word["reading"] = next(terms)
        words.append(word)
    lesson = {
        "n": english["n"], "title": data["title"], "objective": data["objective"],
        "focus": data["focus"], "words": words, "reading": data["reading"],
        "speaking": data["speaking"], "openingLine": data["openingLine"],
        "partnerRole": data["partnerRole"],
        "checks": [{"prompt": p, "answer": a, "hint": h, "explanation": e} for p, a, h, e in data["checks"]],
        "sourceTitle": english["title"], "sourceObjective": english["objective"],
    }
    lessons.append(lesson)

output = {
    "target": "Japanese", "native": "English", "module": "foundation-construction-foreman",
    "stage": "foundation", "reviewed": False, "state": "private-pilot-draft",
    "sourceSha256": source["sourceSha256"], "lessons": lessons,
}
(CONTENT / "foundation-runtime-pilot-7-10.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
