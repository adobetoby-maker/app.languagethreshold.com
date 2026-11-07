#!/usr/bin/env python3
"""Apply bounded source-fidelity corrections to private Japanese Breakfast drafts.

Run after the source builders; sourceEnglish hashes, lesson IDs and review flags stay fixed.
The operation is idempotent so the private draft can be rebuilt deterministically.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "content/japanese-travel-breakfast"

PATCHES = {
    "core-1-30-draft.json": {
        2: {
            "focus": "ブレンド and アメリカン are café menu labels; 牛乳 is milk and オーツミルク is oat milk. ～にできますか asks whether a drink can be changed to another option.",
            "closure": "Repeat the drink and milk option the barista confirmed.",
        },
        3: {
            "focus": "今朝焼いたもの asks what was baked this morning; 甘い and 塩味のある distinguish sweet and savory; 中身 asks about a pastry's filling. Use the item names shown on the café's menu.",
            "closure": "Confirm the pastry name and filling with staff.",
        },
        6: {
            "focus": "アレルギーがあります states an allergy; 肉を食べません and 乳製品を避けています describe dietary choices. 原材料 asks about ingredients, and 調理器具 asks about shared utensils. ～を確認していただけますか is a polite request to staff.",
            "closure": "Repeat the ingredient and utensil information that staff actually provided.",
        },
        15: {
            "focus": "This review combines entering, ordering, stating a dairy restriction, correcting a drink, small talk and payment. ～を注文しました identifies the original order; ～ではなく corrects the item received.",
            "closure": "Confirm the corrected order and final bill with staff.",
        },
        18: {
            "focus": "共用 means shared. 同じトングを使いますか asks about tongs; トースター and ミルクピッチャー name other equipment; 混入 means cross-contact. Use these terms to ask staff how the pastry and drink are handled.",
            "closure": "State which item the traveler chooses after staff answers the handling questions.",
        },
        24: {
            "focus": "助けてください and 救急車を呼んでください are urgent requests. 隣の席の人が倒れました reports what happened; 店の住所は何ですか asks for the exact location; 呼吸がよく分かりません expresses uncertainty about breathing.",
            "closure": "Give the location and observed details to the emergency operator.",
            "cards": [("救急隊員", "paramedics"), ("呼吸がよく分かりません", "I do not know if the person is breathing well")],
        },
        25: {
            "focus": "火傷（やけど） means a burn; 皮膚 means skin. 冷たい水をいただけますか asks for cold water, ナプキンをもう少しいただけますか asks for more napkins, and 救急箱はありますか asks for a first-aid kit. ～がかかりました reports where the hot coffee spilled.",
            "objective": "Report a hot-coffee burn on the arm, ask for cold water, napkins and a first-aid kit, and respond to the staff's apology and offer.",
            "goal": "Name the burn and affected skin, request cold water, napkins and a first-aid kit, then accept or decline the apology and offer.",
            "closure": "Close by answering the manager's offer politely.",
            "cards": [("火傷（やけど）", "burn"), ("皮膚", "skin"), ("冷たい水", "cold water"), ("ナプキン", "napkins")],
            "readerReplace": {
                0: ("熱いコーヒーが腕にかかって、火傷をしました。", "Hot coffee spilled on my arm and I got a burn."),
                2: ("冷たい水をいただけますか。", "Could you bring me cold water, please?"),
                3: ("はい、冷たい水をお持ちします。", "Yes, I will bring cold water."),
                6: ("皮膚が赤くなっていますね。救急箱をお持ちしました。", "Your skin is red. I brought the first-aid kit."),
                7: ("ナプキンをもう少しいただけますか。", "Could you pass me more napkins, please?"),
            },
            "readerAppend": [
                ("Staff", "お詫びに、朝食代はいただきません。", "As an apology, we will not charge you for breakfast."),
                ("Guest", "ありがとうございます。お気持ちを受け取ります。", "Thank you. I accept your offer."),
            ],
        },
        27: {
            "focus": "朝食の時間より早く出ます explains an early departure. 持ち帰りの朝食 asks for a packed breakfast. アレルギーがあります states an allergy; ～を避ける必要があります specifies the ingredient to avoid. 何時に受け取れますか asks for the pickup time.",
            "closure": "Confirm the pickup place, time, contents and price with the front desk.",
        },
        30: {
            "focus": "This capstone combines ベビーチェア, ナッツのアレルギー, 明細 and ありがとうございました. Use ～をお願いします for a request, ～があります for a condition, and ～を確認したいです for a bill question.",
            "closure": "Confirm the seating, food order and bill before saying goodbye.",
        },
    },
    "master-1-3-draft.json": {
        2: {
            "focus": "小さいほう・大きいほう compare bread sizes; ～なら introduces a condition; ～によって違います marks variation. 具 and 原材料 distinguish topping from ingredients, and ～を確認できますか asks staff for details.",
            "closure": "Restate the bread size, topping and ingredient question.",
        },
        3: {
            "focus": "先にあいさつして and ～てください sequence polite coaching. 持ち手 means handle, 飲み口 means rim, and 湯気 means steam; 熱いので～ gives a reason for handling a hot cup carefully.",
            "closure": "Let the teenager place the order and repeat the hot-cup handling words.",
            "cards": [("飲み口", "rim"), ("湯気", "steam"), ("ぬるい", "lukewarm")],
        },
    },
    "master-4-6-draft.json": {
        4: {
            "focus": "食べる前に and 確認した後で sequence checks; ～かどうか asks whether the chart is current. ごまアレルギー, 微量, アレルギー反応 and アドレナリン自己注射器 name the source's clinical concepts directly.",
            "goal": "Ask the chart date and supplier, request the current label, and explain the companion's sesame allergy and auto-injector information.",
            "closure": "Summarize which labels and preparation details staff confirmed and which remain unresolved.",
            "cards": [("アレルギー反応", "allergic reaction"), ("アドレナリン自己注射器", "epinephrine auto-injector"), ("微量", "trace amount")],
            "readerAppend": [("Companion", "アドレナリン自己注射器がかばんにあることも確認しました。", "I also checked that my epinephrine auto-injector is in my bag.")],
        },
        6: {
            "focus": "～より and ～のほうが compare drink options; ～が届くまで sets a temporary period. ヴィーガン and 乳糖を避けています describe two different dietary needs, while 乳糖を含まない牛乳 is still dairy milk.",
            "closure": "Confirm each person's chosen drink and the expected delivery time with staff.",
        },
    },
    "master-7-9-draft.json": {
        8: {
            "focus": "お気持ちはありがたいですが acknowledges kindness before declining; 取り除かないでください is a direct negative request. 木の実アレルギー and アナフィラキシー name the source's clinical terms; 表面 and 生地 distinguish the visible topping from the pastry itself.",
            "goal": "Thank the server, decline scraping almonds off the pastry, explain the friend's tree-nut allergy and past anaphylaxis, and ask about another item.",
            "closure": "End by restating the friend's decision about the offered food.",
            "cards": [("アナフィラキシー", "anaphylaxis"), ("抗ヒスタミン薬", "antihistamine"), ("アドレナリン自己注射器", "epinephrine auto-injector")],
            "readerReplace": {
                3: ("ありがとうございます。でも、アーモンドを取り除かないでください。", "Thank you, but please don't scrape off the almonds."),
            },
            "readerAppend": [
                ("Friend", "以前、木の実でアナフィラキシーを起こしたことがあります。", "I have had anaphylaxis from tree nuts before."),
                ("Friend", "医師の指示で、抗ヒスタミン薬とアドレナリン自己注射器を持っています。", "I carry an antihistamine and an epinephrine auto-injector as my doctor instructed."),
            ],
        },
    },
    "master-10-12-draft.json": {
        10: {
            "focus": "～と言っていました reports a person's position; 一方で contrasts two positions; ～なら introduces a compromise. 高山病 is altitude sickness, コカ茶 is coca tea, and ～と話しました reports the host's statement.",
            "goal": "Report each friend's position fairly, ask the host about market and pickup times, relay the host's statement about coca tea, and negotiate a breakfast plan.",
            "closure": "Summarize the agreed meeting and breakfast plan back to the group.",
            "cards": [("高山病", "altitude sickness"), ("コカ茶", "coca tea")],
            "readerAppend": [("Mediator", "宿の方は、高山病にコカ茶が役立ったと言う旅行者が多いと話しました。", "The host said many travelers reported that coca tea helped with altitude sickness.")],
        },
    },
    "master-13-15-draft.json": {
        13: {
            "focus": "～ごろ gives an approximate time; 数分後 and すぐに sequence events. のどのかゆみ, じんましん, 唇の腫れ, 呼吸困難 and めまい state the symptoms in the English source; アレルギー反応 names the reported event.",
            "goal": "Give the timeline of the breakfast, named symptoms, emergency call, responder arrival and ambulance transfer, marking approximate times clearly.",
            "closure": "Repeat the timeline slowly if the duty manager asks.",
            "cards": [("のどのかゆみ", "itchy throat"), ("じんましん", "hives"), ("唇の腫れ", "lip swelling"), ("呼吸困難", "difficulty breathing"), ("めまい", "dizziness"), ("アレルギー反応", "allergic reaction")],
            "readerReplace": {
                4: ("その後、腕にじんましんが出て、唇が腫れ、息苦しいと話しました。", "After that, she had hives on her arms, her lips swelled, and she said she had difficulty breathing."),
                7: ("救急隊が来たときはめまいが強く、その後、救急車で病院へ運ばれました。", "She was very dizzy when responders arrived, then was taken to hospital by ambulance."),
            },
            "readerAppend": [("Witness", "厨房の説明では、ケーキにアーモンド粉が入っていたそうです。", "According to the kitchen, the cake contained almond flour.")],
        },
        14: {
            "focus": "セリアック病 means celiac disease; 小麦粉 means wheat flour; グルテンフリー表示 names the gluten-free sign. もう少しで～ところでした reports a near miss, and ～かもしれません marks uncertainty about how the trays were mixed up.",
            "goal": "Name the guest's celiac disease, identify the wheat-flour label and misplaced gluten-free sign, then discuss two prevention steps with the baker.",
            "closure": "Restate the agreed label-and-tray checking steps.",
            "cards": [("セリアック病", "celiac disease")],
            "readerReplace": {
                1: ("セリアック病があり、もう少しで食べるところでした。先に原材料を見てよかったです。", "I have celiac disease and almost ate it. I am glad I read the ingredients first."),
            },
        },
    },
    "master-16-18-draft.json": {
        16: {
            "focus": "私が見た範囲では limits a statement to firsthand observation; ～と聞きました marks information received from another person. アレルギー反応 and アレルゲン記録 are the clinical and inspection terms in the source; 署名する前に修正してください requests a correction.",
            "closure": "Read the corrected statement and ask for a copy if signing.",
            "cards": [("アレルギー反応", "allergic reaction"), ("アレルゲン記録", "allergen record")],
        },
        17: {
            "focus": "まず・次に・一方で・最後に structure a formal summary. 本人の同意 and 健康情報 name consent and health information; 救急外来 is the emergency department. Ask the affected friend which details they agree to include before sending the revised message.",
            "closure": "Read the revised email and attachment list to the friend before sending.",
            "cards": [("救急外来", "emergency department"), ("アレルギー反応", "allergic reaction")],
        },
    },
    "master-19-20-draft.json": {
        19: {
            "focus": "全体として and 一方で balance praise and concern; 次回は～を確認できれば frames a condition for returning. セリアック病, グルテンフリー and 混入 name the source's clinical and food-handling concepts directly.",
            "closure": "Summarize the breakfast feedback and conditions for a future booking.",
        },
        20: {
            "focus": "まず・次に・最後に organize the capstone; ～なら asks about a substitute; 確認できないので注文しません explains a refusal. ピーナッツアレルギー, 原材料 and 調理方法 carry the source's specific food vocabulary.",
            "closure": "Summarize the group's order, the delayed arrival message and the checkout feedback.",
        },
    },
}


def apply_file(name, lessons):
    path = DIR / name
    data = json.loads(path.read_text())
    assert data["target"] == "Japanese" and data["native"] == "English"
    assert data["reviewed"] is False and data["registered"] is False and data["audio"] == "none"
    for lesson in data["lessons"]:
        patch = lessons.get(lesson["n"])
        if patch is None:
            continue
        stable_id = lesson["stableId"]
        source = lesson.get("sourceEnglish")
        for key in ("focus", "objective"):
            if key in patch:
                lesson[key] = patch[key]
        for key in ("goal", "closure"):
            if key in patch:
                lesson["speaking"][key] = patch[key]
        for ja, en in patch.get("cards", []):
            if not any(card["ja"] == ja and card["en"] == en for card in lesson["cards"]):
                lesson["cards"].append({"ja": ja, "en": en, "kind": "term"})
        for index, (ja, en) in patch.get("readerReplace", {}).items():
            lesson["reader"][index]["ja"] = ja
            lesson["reader"][index]["en"] = en
        for speaker, ja, en in patch.get("readerAppend", []):
            if not any(row["ja"] == ja and row["en"] == en for row in lesson["reader"]):
                lesson["reader"].append({"speaker": speaker, "ja": ja, "en": en})
        assert lesson["stableId"] == stable_id and lesson.get("sourceEnglish") == source
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


if __name__ == "__main__":
    for name, lessons in PATCHES.items():
        apply_file(name, lessons)
    print("Applied bounded Japanese Breakfast clinical-term corrections; source anchors and release gates unchanged")
