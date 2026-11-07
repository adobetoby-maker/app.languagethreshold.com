#!/usr/bin/env python3
"""Build private Japanese Travel Breakfast Master 19–20 with pinned English provenance."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("master_builder", ROOT / "scripts/build-japanese-travel-master-4-6.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.PREVIOUS = ROOT / "content/japanese-travel-breakfast/master-16-18-draft.json"
builder.OUTPUT = ROOT / "content/japanese-travel-breakfast/master-19-20-draft.json"
builder.AUTHORED = [
    {
        "n": 19,
        "title": "Give balanced breakfast feedback at checkout",
        "objective": "Review the family's breakfasts with the lodging manager, name strengths and concerns, and explain what verified options would matter for a future stay.",
        "focus": "全体として and 一方で balance praise and concern; 次回は～を確認できれば frames a condition without promising a booking. A gluten-free label or availability alone does not prove suitability for celiac disease; ask about current ingredients and cross-contact controls. An offer, rate or room is not assumed until confirmed by the lodging provider.",
        "scene": "At checkout, a family discusses breakfast quality and celiac-disease accommodation with a guesthouse manager.",
        "cards": builder.cards([
            ("宿泊", "stay"), ("チェックアウト", "checkout"), ("感想", "feedback"),
            ("よかった点", "strong point"), ("改善してほしい点", "area to improve"),
            ("季節の果物", "seasonal fruit"), ("品ぞろえ", "selection"),
            ("グルテンフリー表示", "gluten-free label"), ("共用の容器", "shared container"),
            ("混入", "cross-contact"), ("次回の予約", "future booking"),
            ("料金", "rate"), ("全体として", "overall"),
            ("確認できれば", "if we can verify"),
        ]),
        "reader": builder.pair_lines([
            ("Manager", "朝食とご滞在はいかがでしたか。", "How were the breakfasts and your stay?"),
            ("Guest", "全体として満足しました。特に季節の果物がよかったです。", "Overall, we were pleased. We especially liked the seasonal fruit."),
            ("Manager", "改善してほしい点はありますか。", "Is there anything you would like us to improve?"),
            ("Guest", "家族にセリアック病の者がいます。表示だけでなく、原材料と調理方法を確認したいです。", "Someone in our family has celiac disease. We need to check ingredients and preparation, not just a label."),
            ("Guest", "共用のバターの容器も、混入が心配で使えませんでした。", "We also could not use the shared butter container because of cross-contact concerns."),
            ("Manager", "ご意見を記録し、厨房の手順を確認します。", "I will record your feedback and check the kitchen's procedure."),
            ("Guest", "次回は、選べる食品の情報を事前に確認できれば助かります。", "For a future visit, it would help to check available food information in advance."),
            ("Manager", "予約前にお問い合わせください。確認できた内容をお伝えします。", "Please contact us before booking. We will tell you what we can verify."),
            ("Guest", "ありがとうございます。料金と部屋の条件も確認してから検討します。", "Thank you. We will consider it after checking the rate and room terms too."),
            ("Manager", "具体的な感想をありがとうございました。", "Thank you for the specific feedback."),
        ]),
        "speaking": {
            "role": "Guest giving checkout feedback", "partnerRole": "Lodging manager",
            "opening": "朝食は全体としてよかったです。よかった点と、次回確認したい点をお伝えしてもいいですか。",
            "goal": "Praise one concrete feature, explain a celiac cross-contact concern, ask how food information could be verified before a future booking, and check rate terms.",
            "closure": "Do not promise a return or declare food suitable from a label alone; confirm any offer and kitchen details separately.",
            "wordBank": ["全体として", "感想", "原材料", "調理方法", "混入", "次回"],
        },
        "modes": {
            "see": "Read balanced checkout feedback with aligned English.",
            "recall": "Recall praise, concern and future verification request.",
            "hear": "Hear balanced feedback and conditional language.",
            "type": "Type a polite future-information request with kana support.",
            "say": "Give the manager specific feedback without a safety guarantee.",
            "write": "Write a short review with strengths and verified follow-up questions.",
        },
    },
    {
        "n": 20,
        "title": "Lead a group through a difficult breakfast",
        "objective": "Coach a relative's order, seek allergen information for another relative, handle an unavailable dish, update the next host about a delay, and give measured checkout feedback in Japanese.",
        "focus": "まず・次に・最後に organize a multi-step response; ～なら asks about a substitute; 確認できないので注文しません declines an unverified food. A menu binder, ingredient list or verbal claim alone does not establish allergy safety without current preparation details. Do not replace the affected person's own allergy plan or decide for them.",
        "scene": "A family breakfast group handles a missing allergen binder, a sold-out dish and a delayed next appointment before checkout.",
        "cards": builder.cards([
            ("親戚", "relative"), ("注文", "order"), ("品切れ", "sold out"),
            ("代わりの料理", "substitute dish"), ("アレルゲン資料", "allergen information"),
            ("原材料", "ingredients"), ("調理方法", "preparation method"),
            ("ピーナッツ", "peanuts"), ("確認できない", "cannot verify"),
            ("到着が遅れる", "to arrive late"), ("宿の方", "lodging host"),
            ("会計", "checkout"), ("まず", "first"), ("最後に", "finally"),
        ]),
        "reader": builder.pair_lines([
            ("Leader", "まず、ゆっくりあいさつして、食べたい物を伝えてみて。", "First, greet the staff and say what you would like, without rushing."),
            ("Relative", "おはようございます。朝食のセットを一つお願いします。", "Good morning. One breakfast set, please."),
            ("Leader", "別の親戚にはピーナッツのアレルギーがあります。資料と調理方法を確認できますか。", "Another relative has a peanut allergy. Could we check the information and preparation method?"),
            ("Server", "資料が見つからず、最初に希望された料理も品切れです。", "We cannot find the information, and the dish you first wanted is sold out too."),
            ("Leader", "代わりの料理の原材料と調理方法を確認していただけますか。", "Could you check the substitute dish's ingredients and preparation?"),
            ("Server", "厨房に聞きましたが、混入の可能性までは確認できません。", "I asked the kitchen, but we cannot verify the cross-contact risk."),
            ("Leader", "分かりました。確認できないので、本人は今は注文を見送ります。", "Understood. Because it cannot be verified, the affected person will hold off on ordering for now."),
            ("Affected relative", "ありがとう。自分の予定と必要なことは私が決めます。", "Thank you. I will decide my own next steps and needs."),
            ("Leader", "次の宿の方に、到着が遅れると連絡します。", "I will tell the next lodging host that we will arrive late."),
            ("Leader", "最後に、資料が見つからなかったことを会計時に事実として伝えます。", "Finally, I will report at checkout that the information could not be found, as a matter of fact."),
        ]),
        "speaking": {
            "role": "Family breakfast organizer", "partnerRole": "Relative, server, next lodging host and manager",
            "opening": "まず注文を確認します。その後、アレルゲンの情報について質問したいです。",
            "goal": "Coach one relative, request current ingredients and preparation for another, decline unverified food, notify the next host of a delay, and give factual checkout feedback.",
            "closure": "Leave allergy and medical decisions to the affected person and their established plan; do not call an unverified substitute safe.",
            "wordBank": ["注文", "品切れ", "アレルゲン資料", "原材料", "確認できない", "遅れる"],
        },
        "modes": {
            "see": "Read a multi-step group capstone with aligned English.",
            "recall": "Recall the order, allergen check, delay and feedback sequence.",
            "hear": "Hear concise requests and a clear refusal.",
            "type": "Type a verified-information request with kana support.",
            "say": "Lead the four-role conversation without a safety promise.",
            "write": "Write a concise timeline and factual checkout message.",
        },
    },
]

if __name__ == "__main__":
    builder.main()
    data = json.loads(builder.OUTPUT.read_text())
    data["state"] = "authored-draft"
    data["reviewGates"] = [
        "Qualified Japanese language, register and pedagogy review",
        "Qualified celiac/bakery cross-contact and lodging consumer review for Master 19",
        "Qualified food-allergy, emergency-plan and regional service review for Master 20",
        "Recorded Japanese audio plus browser/phone/offline/native checks",
    ]
    builder.OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
