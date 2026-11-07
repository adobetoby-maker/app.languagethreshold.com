#!/usr/bin/env python3
"""Build private Japanese Master 4–6 drafts from pinned English source anchors."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CURRICULUM = ROOT / "src/data/core60/es/master-travel-breakfast.json"
READER = ROOT / "public/lesson-content/es/master-travel-breakfast.json"
OUTPUT = ROOT / "content/japanese-travel-breakfast/master-4-6-draft.json"
PREVIOUS = ROOT / "content/japanese-travel-breakfast/master-1-3-draft.json"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def pair_lines(rows):
    return [{"speaker": speaker, "ja": ja, "en": en} for speaker, ja, en in rows]


def cards(rows):
    return [{"ja": ja, "en": en, "kind": "term"} for ja, en in rows]


AUTHORED = [
    {
        "n": 4,
        "title": "Check an outdated breakfast allergen chart",
        "objective": "Read the hotel's allergen chart with staff, notice a supplier change, and request current ingredient and preparation details before anyone with a sesame allergy chooses food.",
        "focus": "食べる前に and 確認した後で sequence checks; ～かどうか asks whether information is current. A chart or verbal reassurance alone cannot establish allergy safety. Avoid claiming any item is safe until the guest and qualified staff verify current ingredients and cross-contact handling.",
        "scene": "At a hotel breakfast buffet, one guest helps a companion with a sesame allergy ask the host about an old chart and a new bread supplier.",
        "cards": cards([
            ("アレルゲン表示表", "allergen chart"), ("ごま", "sesame"), ("原材料", "ingredients"),
            ("仕入れ先", "supplier"), ("更新日", "last updated date"), ("表示ラベル", "product label"),
            ("仕様書", "product specification sheet"), ("調理器具", "cooking utensils"),
            ("混入", "cross-contact"), ("確認する", "to verify"), ("食べる前に", "before eating"),
            ("確認した後で", "after checking"), ("最新かどうか", "whether it is current"),
            ("注文を見送る", "to hold off on ordering"),
        ]),
        "reader": pair_lines([
            ("Guest", "同行者はごまにアレルギーがあります。食べる前に、表示を一緒に確認できますか。", "My companion has a sesame allergy. Can we check the information together before eating?"),
            ("Host", "こちらが朝食のアレルゲン表示表です。", "Here is the breakfast allergen chart."),
            ("Guest", "この表の更新日はいつですか。", "When was this chart last updated?"),
            ("Host", "三月の更新です。パンの仕入れ先は先月変わりました。", "It was updated in March. Our bread supplier changed last month."),
            ("Guest", "では、パンの情報が最新かどうか確認したいです。", "Then I would like to check whether the bread information is current."),
            ("Host", "今の表示ラベルと仕様書を厨房に確認します。調理器具についても聞きます。", "I will check the current label and specification with the kitchen. I will also ask about utensils."),
            ("Companion", "確認が済むまで、私は食べずに待ちます。", "I will wait without eating until the checks are complete."),
            ("Host", "厨房から回答をもらいましたが、混入の可能性を確認できません。", "The kitchen responded, but we cannot verify the cross-contact risk."),
            ("Guest", "分かりました。確認できない食品は選びません。", "Understood. We will not choose food that cannot be verified."),
            ("Companion", "ほかの選択肢について、担当者に相談しましょう。", "Let's ask the appropriate staff member about other options."),
        ]),
        "speaking": {
            "role": "Guest checking an allergen chart", "partnerRole": "Hotel breakfast host",
            "opening": "この表示表はいつ更新されましたか。",
            "goal": "Ask the date and supplier, request current labels and preparation details, and say that unverified food will not be chosen.",
            "closure": "Do not provide a safety guarantee, diagnose a reaction, or improvise treatment; follow the guest's existing emergency plan and local emergency procedures if needed.",
            "wordBank": ["アレルゲン表示表", "ごま", "更新日", "仕入れ先", "原材料", "確認する"],
        },
        "modes": {
            "see": "Read the chart-checking scene with aligned English support.",
            "recall": "Recall update date, supplier and preparation questions.",
            "hear": "Hear 食べる前に and ～かどうか in the dialogue.",
            "type": "Type a request to verify the latest label with kana support.",
            "say": "Ask the host to verify information without promising safety.",
            "write": "Write a short checklist of what to ask before ordering.",
        },
    },
    {
        "n": 5,
        "title": "Negotiate breakfast after a hotel closure",
        "objective": "Explain that breakfast was included in a booking, describe the closed dining room, and ask staff for an approved alternative or billing adjustment.",
        "focus": "予約には～が含まれていました states the booking term; 今朝行ったら～でした reports what was found; ～していただけますか makes a polite proposal. Present a voucher or adjustment as a request requiring hotel approval, never a guaranteed entitlement.",
        "scene": "A guest calmly discusses an unexpectedly closed hotel breakfast room with the front-desk clerk.",
        "cards": cards([
            ("予約確認書", "booking confirmation"), ("朝食付き", "breakfast included"),
            ("朝食会場", "breakfast room"), ("休業", "closure"), ("工事", "repairs"),
            ("お知らせ", "notice"), ("代案", "alternative"), ("食事券", "meal voucher"),
            ("料金の調整", "billing adjustment"), ("責任者", "manager"), ("確認する", "to check"),
            ("予約には朝食が含まれていました", "breakfast was included in the booking"),
            ("ご相談できますか", "may we discuss it?"), ("対応をお願いできますか", "could you help resolve this?"),
        ]),
        "reader": pair_lines([
            ("Guest", "予約確認書には朝食付きと書いてあります。", "My booking confirmation says breakfast is included."),
            ("Clerk", "はい。今朝は朝食会場が急な工事で休業しています。", "Yes. The breakfast room is closed this morning for urgent repairs."),
            ("Guest", "八時に行ったら閉まっていて、お知らせも見つかりませんでした。", "I went there at eight and found it closed, with no notice that I could find."),
            ("Clerk", "ご案内が遅れてしまい、申し訳ありません。", "I am sorry we were late to inform you."),
            ("Guest", "今日の朝食について、代案をご相談できますか。", "Could we discuss an alternative for today's breakfast?"),
            ("Clerk", "近くの店の食事券を出せるか、責任者に確認します。", "I will ask the manager whether we can offer a voucher for a nearby café."),
            ("Guest", "それが難しければ、朝食分の料金調整は可能ですか。", "If that is difficult, could the breakfast charge be adjusted?"),
            ("Clerk", "どちらの対応が可能か確認して、すぐにお伝えします。", "I will check which option is possible and let you know shortly."),
            ("Guest", "ありがとうございます。確認できるまでこちらで待ちます。", "Thank you. I will wait here until you can confirm."),
            ("Clerk", "責任者の承認が取れました。食事券をお渡しします。", "The manager approved a voucher. Here it is."),
        ]),
        "speaking": {
            "role": "Hotel guest proposing a remedy", "partnerRole": "Front-desk clerk",
            "opening": "予約確認書には朝食付きと書いてありますが、会場が閉まっています。",
            "goal": "State the confirmed booking term and the observed closure, then ask about an approved voucher or billing adjustment.",
            "closure": "Confirm the actual remedy and its terms with staff; do not promise compensation or a specific discount.",
            "wordBank": ["予約確認書", "朝食付き", "休業", "代案", "食事券", "料金の調整"],
        },
        "modes": {
            "see": "Read the hotel service-recovery dialogue with English support.",
            "recall": "Recall the booking, closure and two possible remedies.",
            "hear": "Hear polite request forms and the reported past event.",
            "type": "Type a polite alternative request with kana support.",
            "say": "Negotiate an option with the clerk without assuming approval.",
            "write": "Write a concise note stating the booking term and requested remedy.",
        },
    },
    {
        "n": 6,
        "title": "Plan substitutes when oat milk is unavailable",
        "objective": "Compare available drink options for two friends with different preferences, verify ingredients and preparation with staff, and agree on a temporary plan.",
        "focus": "～より and ～のほうが compare options; ～が届くまで sets a temporary period; ～か確認してください asks for verification. Vegan and lactose-avoiding needs are distinct; a plant-based label or lactose-free claim does not establish allergy safety or cross-contact controls.",
        "scene": "A group at a café learns that oat milk is out of stock and asks staff what can actually be prepared for each person.",
        "cards": cards([
            ("オーツミルク", "oat milk"), ("豆乳", "soy milk"), ("アーモンドミルク", "almond milk"),
            ("乳糖を含まない牛乳", "lactose-free dairy milk"), ("植物性の飲み物", "plant-based drink"),
            ("在庫切れ", "out of stock"), ("入荷", "delivery"), ("原材料", "ingredients"),
            ("調理方法", "preparation method"), ("代わり", "substitute"),
            ("～より", "than (comparison)"), ("～が届くまで", "until ... arrives"),
            ("選べますか", "can I choose?"), ("確認してください", "please verify"),
        ]),
        "reader": pair_lines([
            ("Server", "今日はオーツミルクが在庫切れです。入荷は午後の予定です。", "We are out of oat milk today. A delivery is expected this afternoon."),
            ("Guest", "豆乳とアーモンドミルクはありますか。", "Do you have soy milk and almond milk?"),
            ("Server", "両方ありますが、飲み物によって使える種類が違います。", "We have both, but the options vary by drink."),
            ("Hana", "私はヴィーガンです。豆乳の飲み物の原材料と調理方法を確認できますか。", "I am vegan. Could you check the ingredients and preparation of the soy drink?"),
            ("Server", "厨房に確認します。今は適していると断言できません。", "I will check with the kitchen. I cannot confirm suitability yet."),
            ("Dev", "私は乳糖を避けています。乳糖を含まない牛乳は選べますか。", "I avoid lactose. Is lactose-free dairy milk an option?"),
            ("Server", "あります。ただし、牛乳由来です。原材料も確認します。", "We have it, but it is dairy milk. I will check the ingredients too."),
            ("Guest", "確認が終わるまで、飲み物は決めずに待ちましょう。", "Let's wait to choose drinks until the checks are done."),
            ("Hana", "確認できたら、豆乳とアーモンドミルクを比べたいです。", "Once you have checked, I would like to compare soy and almond milk."),
            ("Dev", "入荷までの代わりが決まったら、今日はそれを注文します。", "If we find a substitute until the delivery, I will order that today."),
        ]),
        "speaking": {
            "role": "Friend coordinating a group order", "partnerRole": "Café server",
            "opening": "オーツミルクがない場合、ほかにどんな選択肢がありますか。",
            "goal": "Ask about two substitutes, compare them, distinguish vegan preference from lactose avoidance, and request ingredient/preparation checks before ordering.",
            "closure": "Choose only after staff confirms the relevant details; never claim an item is safe for an allergy.",
            "wordBank": ["在庫切れ", "豆乳", "アーモンドミルク", "乳糖を含まない牛乳", "原材料", "確認"],
        },
        "modes": {
            "see": "Read a substitute-planning scene with aligned English support.",
            "recall": "Recall the options and each person's stated need.",
            "hear": "Hear comparisons and arrival-time language.",
            "type": "Type an ingredient question with kana support.",
            "say": "Coordinate the order while keeping unverified choices open.",
            "write": "Write a provisional plan for each person pending verification.",
        },
    },
]


def main():
    curriculum_bytes = CURRICULUM.read_bytes()
    reader_bytes = READER.read_bytes()
    curriculum = json.loads(curriculum_bytes)["lessons"]
    reader = json.loads(reader_bytes)["lessons"]
    previous = json.loads(PREVIOUS.read_text())
    lessons = []
    for authored in AUTHORED:
        n = authored["n"]
        source = curriculum[n - 1]
        fields = {
            "n": n,
            "title": source["title"],
            "objective": source["objective"],
            "speaking": source["speaking"],
            "lessonType": source["lessonType"],
            "block": source["block"],
            "englishWordAnchors": [word["en"] for word in source["words"]],
            "englishGrammarExamples": [example["en"] for example in source["grammar"]["examples"]],
            "englishReading": reader[str(n)]["passage"]["native"],
        }
        fields["englishSourceSha256"] = sha(json.dumps(fields, ensure_ascii=False, separators=(",", ":")).encode())
        lessons.append({"n": n, "stableId": f"master-travel-breakfast:{n}:ja-en", "sourceEnglish": fields, **{k: v for k, v in authored.items() if k != "n"}})
    output = {k: v for k, v in previous.items() if k not in ("lessons", "reviewGates")}
    output["source"]["curriculumSha256"] = sha(curriculum_bytes)
    output["source"]["readerSha256"] = sha(reader_bytes)
    output["lessons"] = lessons
    output["reviewGates"] = [
        "Qualified Japanese language, register and pedagogy review",
        "Qualified food-allergy, cross-contact and emergency-plan review for Master 4",
        "Qualified consumer/hotel-terms review for Master 5",
        "Qualified vegan, lactose and café-preparation review for Master 6",
        "Recorded Japanese audio plus phone/offline/native checks",
    ]
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    print(f"Wrote {OUTPUT.relative_to(ROOT)} with {len(lessons)} private draft lessons")


if __name__ == "__main__":
    main()
