#!/usr/bin/env python3
"""Build private Japanese Travel Breakfast Master 7–9 from pinned English anchors."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("previous_master_builder", ROOT / "scripts/build-japanese-travel-master-4-6.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.PREVIOUS = ROOT / "content/japanese-travel-breakfast/master-4-6-draft.json"
builder.OUTPUT = ROOT / "content/japanese-travel-breakfast/master-7-9-draft.json"

builder.AUTHORED = [
    {
        "n": 7,
        "title": "Settle a group breakfast bill before departure",
        "objective": "Recount the group's orders and recorded payments, check the remaining balance with staff, and settle it before the shuttle departs.",
        "focus": "～を注文しました and ～が支払いました recount completed actions; まだ～が残っています tracks what remains. The English source's pesos, Nequi transfer and Colombian foods are provenance, not Japanese learner copy. Verify each charge and the shop's accepted payment method before paying.",
        "scene": "A group organizer checks a rural café's order ledger as an earlier shuttle departure approaches.",
        "cards": builder.cards([
            ("注文票", "order sheet"), ("未払い", "unpaid amount"), ("会計", "bill"),
            ("領収書", "receipt"), ("送迎車", "shuttle vehicle"), ("出発時刻", "departure time"),
            ("振り込み", "bank transfer"), ("現金", "cash"), ("支払い方法", "payment method"),
            ("数を確認する", "to check the count"), ("まだ残っています", "still remains"),
            ("注文しました", "ordered"), ("支払いました", "paid"), ("いくら残っていますか", "how much remains?"),
        ]),
        "reader": builder.pair_lines([
            ("Guide", "送迎車の出発が早まりました。あと十分です。", "The shuttle departure has moved up. We have ten minutes."),
            ("Organizer", "注文票と支払いを一緒に確認してもいいですか。", "May we check the order sheet and payments together?"),
            ("Cook", "はい。コーヒーを九杯と朝食を七人分記録しています。", "Yes. I recorded nine coffees and seven breakfasts."),
            ("Organizer", "四人はもう現金で支払いました。", "Four people have already paid in cash."),
            ("Cook", "ありがとうございます。まだ二人分の朝食代が残っています。", "Thank you. Payment for two breakfasts still remains."),
            ("Organizer", "追加の注文があったか、皆に確認します。", "I will ask everyone whether there were extra orders."),
            ("Friend", "私がコーヒーを一杯追加しました。まだ払っていません。", "I ordered one extra coffee. I have not paid for it yet."),
            ("Organizer", "合計と残額をもう一度教えていただけますか。", "Could you tell me the total and remaining balance again?"),
            ("Cook", "こちらが内訳です。お支払いは現金かカードです。", "Here is the itemized bill. You can pay with cash or card."),
            ("Organizer", "内訳を確認しました。カードで残りを支払い、領収書を受け取ります。", "I checked the itemization. I will pay the rest by card and take the receipt."),
        ]),
        "speaking": {
            "role": "Group breakfast organizer", "partnerRole": "Café staff member",
            "opening": "出発前に、注文票と未払いの金額を確認できますか。",
            "goal": "Recount ordered and paid items, ask for an itemized remaining balance, and confirm the accepted payment method before settling.",
            "closure": "Check the final receipt and avoid declaring a debt paid before staff confirms the payment.",
            "wordBank": ["注文票", "未払い", "残額", "支払いました", "会計", "領収書"],
        },
        "modes": {
            "see": "Read the itemized-bill dialogue with English support.",
            "recall": "Recall the ordered, paid and remaining counts.",
            "hear": "Hear past-tense order and payment statements.",
            "type": "Type a remaining-balance question with kana help.",
            "say": "Reconcile the group order with staff before departure.",
            "write": "Write an itemized payment summary and confirmation request.",
        },
    },
    {
        "n": 8,
        "title": "Decline removal of nuts from a prepared pastry",
        "objective": "Politely decline an offer to remove nuts from a prepared pastry for a friend with a tree-nut allergy, and ask about a verifiable alternative or choose nothing.",
        "focus": "お気持ちはありがたいですが acknowledges kindness before declining; 取り除くだけでは～ません explains that removing visible nuts does not resolve unknown cross-contact. Never call a packaged item or drink safe merely from a label or menu; the person with the allergy and qualified staff must verify current ingredients and preparation. Follow their own emergency plan if symptoms occur.",
        "scene": "At a bakery café, a server offers to remove almond pieces from a pastry; the guests decline and ask for current labeling and preparation information.",
        "cards": builder.cards([
            ("木の実", "tree nuts"), ("アーモンド", "almonds"), ("アレルギー", "allergy"),
            ("菓子パン", "sweet pastry"), ("取り除く", "to remove"), ("表面", "surface"),
            ("生地", "dough"), ("原材料表示", "ingredient label"), ("製造場所", "production area"),
            ("混入", "cross-contact"), ("確認できない", "cannot verify"),
            ("遠慮します", "I will decline"), ("お気持ちはありがたいですが", "I appreciate the offer, but"),
            ("何も食べません", "I will not eat anything"),
        ]),
        "reader": builder.pair_lines([
            ("Server", "この菓子パンはいかがですか。アーモンドが上にのっています。", "How about this pastry? It has almonds on top."),
            ("Guest", "友人は木の実にアレルギーがあります。", "My friend has a tree-nut allergy."),
            ("Server", "上のアーモンドを取り除きましょうか。", "Shall I remove the almonds on top?"),
            ("Guest", "お気持ちはありがたいですが、それは遠慮します。", "I appreciate the offer, but we will decline."),
            ("Guest", "見える分を取り除くだけでは、原材料や混入を確認できません。", "Removing the visible pieces does not verify the ingredients or possible cross-contact."),
            ("Friend", "原材料表示のある別の商品はありますか。", "Do you have another product with an ingredient label?"),
            ("Server", "こちらは包装されていますが、製造場所の情報も確認します。", "This one is packaged, but I will check the production information too."),
            ("Guest", "確認できない場合は、何も注文しません。", "If it cannot be verified, we will not order food."),
            ("Friend", "飲み物も調理方法を確認してから決めます。", "I will decide about a drink only after checking how it is prepared."),
            ("Server", "分かりました。確認できた情報だけをお伝えします。", "Understood. I will tell you only what we can verify."),
        ]),
        "speaking": {
            "role": "Friend declining a pastry", "partnerRole": "Bakery café server",
            "opening": "友人は木の実にアレルギーがあります。アーモンドを取り除くだけでは注文できません。",
            "goal": "Thank the server, decline removal of visible nuts, ask for current ingredient and preparation details, and choose no food if verification is unavailable.",
            "closure": "Do not diagnose, prescribe, or promise that another item is safe; follow the guest's existing emergency plan and local emergency services if needed.",
            "wordBank": ["木の実", "アレルギー", "取り除く", "原材料表示", "混入", "遠慮します"],
        },
        "modes": {
            "see": "Read a polite refusal scene with aligned English.",
            "recall": "Recall why visible nut removal is insufficient.",
            "hear": "Hear a warm acknowledgement followed by a clear refusal.",
            "type": "Type a refusal with kana support.",
            "say": "Decline the pastry and request verifiable information.",
            "write": "Write a concise request for current ingredient and preparation details.",
        },
    },
    {
        "n": 9,
        "title": "Give kind, specific feedback to a café owner",
        "objective": "Tell a café owner what worked, explain two observable problems with the coffee and menu, and offer two concrete suggestions without claiming technical certainty.",
        "focus": "少し～でした gives measured feedback; ～すると見やすいと思います and ～してはいかがですか make suggestions. Describe the served drink and readable prices rather than diagnosing the espresso machine or promising that a technical adjustment will fix the result.",
        "scene": "A regular customer gives a new café owner courteous feedback about a lukewarm drink and hard-to-read menu board.",
        "cards": builder.cards([
            ("感想", "feedback"), ("飲み物の温度", "drink temperature"), ("ぬるい", "lukewarm"),
            ("メニュー板", "menu board"), ("値段", "price"), ("文字", "lettering"),
            ("見やすい", "easy to read"), ("提案", "suggestion"), ("改善", "improvement"),
            ("よかった点", "what worked well"), ("少し～でした", "it was a little ..."),
            ("～してはいかがですか", "how about doing ...?"),
            ("～と思います", "I think that ..."), ("応援しています", "I am rooting for you"),
        ]),
        "reader": builder.pair_lines([
            ("Owner", "新しい店の感想を聞かせていただけますか。", "Could you tell me what you thought of the new café?"),
            ("Customer", "ケーキはおいしかったです。飲み物とメニューについて二つ提案があります。", "The cake was delicious. I have two suggestions about the drink and menu."),
            ("Owner", "ぜひ教えてください。", "Please tell me."),
            ("Customer", "今日のカフェオレは、私には少しぬるく感じました。", "Today's café au lait felt a little lukewarm to me."),
            ("Customer", "提供する前に温度を確認してはいかがですか。", "How about checking the temperature before serving it?"),
            ("Owner", "分かりました。店の手順を見直してみます。", "I see. I will review our shop procedure."),
            ("Customer", "それから、レジからはメニュー板の値段が読みにくかったです。", "Also, the menu-board prices were hard to read from the register."),
            ("Customer", "飲み物と甘い物を分けて、値段を大きく書くと見やすいと思います。", "I think separating drinks and sweets and writing prices larger would make it easier to read."),
            ("Owner", "具体的な提案をありがとうございます。", "Thank you for the specific suggestions."),
            ("Customer", "こちらこそ。新しいお店を応援しています。", "Thank you. I am rooting for your new café."),
        ]),
        "speaking": {
            "role": "Customer giving feedback", "partnerRole": "New café owner",
            "opening": "ケーキはおいしかったです。飲み物とメニューについて、少し感想をお伝えしてもいいですか。",
            "goal": "Praise one thing, identify two observable issues, and offer two respectful, concrete suggestions.",
            "closure": "Leave the owner room to choose how to respond; avoid asserting a technical cause you did not verify.",
            "wordBank": ["感想", "ぬるい", "メニュー板", "値段", "提案", "見やすい"],
        },
        "modes": {
            "see": "Read a specific feedback exchange with English support.",
            "recall": "Recall one positive observation and two suggestions.",
            "hear": "Hear measured feedback and suggestion phrasing.",
            "type": "Type one polite suggestion with kana support.",
            "say": "Give useful feedback without diagnosing equipment.",
            "write": "Write a short, kind feedback note with two recommendations.",
        },
    },
]

if __name__ == "__main__":
    builder.main()
    data = json.loads(builder.OUTPUT.read_text())
    data["reviewGates"] = [
        "Qualified Japanese language, register and pedagogy review",
        "Qualified billing and payment-method review for Master 7",
        "Qualified food-allergy, cross-contact and emergency-plan review for Master 8",
        "Qualified café-service and culturally appropriate feedback review for Master 9",
        "Recorded Japanese audio plus phone/offline/native checks",
    ]
    builder.OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
