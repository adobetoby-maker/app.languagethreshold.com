#!/usr/bin/env python3
"""Build private Japanese Travel Breakfast Master 13–15 with pinned English provenance."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("master_builder", ROOT / "scripts/build-japanese-travel-master-4-6.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.PREVIOUS = ROOT / "content/japanese-travel-breakfast/master-10-12-draft.json"
builder.OUTPUT = ROOT / "content/japanese-travel-breakfast/master-13-15-draft.json"
builder.AUTHORED = [
    {
        "n": 13,
        "title": "Give the hotel a factual incident timeline",
        "objective": "Report what a friend ate, observed symptom changes, when local emergency help was called, and what responders did, separating known times from estimates.",
        "focus": "～ごろ gives an approximate time; その後 and すぐに sequence events; 見ました・聞きました distinguish observed facts from what someone reported. The English source's 112 is a regional emergency number, not a universal Japanese number. Do not diagnose or state that a food caused the reaction without clinical confirmation; follow the person's own emergency plan and local emergency services.",
        "scene": "After emergency responders have taken a guest for care, a witness gives a hotel manager a careful chronology for an incident report.",
        "cards": builder.cards([
            ("事故報告書", "incident report"), ("時系列", "timeline"), ("当直の責任者", "duty manager"),
            ("症状", "symptoms"), ("発疹", "rash"), ("息苦しさ", "difficulty breathing"),
            ("救急隊", "emergency responders"), ("救急車", "ambulance"), ("通報", "emergency call"),
            ("何時ごろ", "about what time"), ("その後", "after that"), ("見ました", "I saw"),
            ("聞きました", "I heard"), ("正確な時刻は分かりません", "I do not know the exact time"),
        ]),
        "reader": builder.pair_lines([
            ("Manager", "事故報告書のために、見たことを時系列で教えてください。", "For the incident report, please tell me what you saw in order."),
            ("Witness", "八時十分ごろ、友人が朝食のケーキを一切れ食べました。", "At about 8:10, my friend ate a slice of breakfast cake."),
            ("Witness", "数分後、のどがかゆいと言っていました。", "A few minutes later, she said her throat was itchy."),
            ("Manager", "それは本人から聞いたことですね。ほかに見たことはありますか。", "That is what she told you. What else did you observe?"),
            ("Witness", "その後、発疹が見え、息苦しいと話しました。", "After that, I saw a rash, and she said she had difficulty breathing."),
            ("Witness", "すぐに現地の救急サービスに通報しました。正確な時刻は記録を確認します。", "I called local emergency services right away. I will check the record for the exact time."),
            ("Manager", "救急隊が来た後はどうなりましたか。", "What happened after the responders arrived?"),
            ("Witness", "救急隊が対応し、その後、友人は救急車で病院へ運ばれました。", "The responders took over, and then my friend was taken to hospital by ambulance."),
            ("Witness", "原因は私には判断できません。食べた物の情報は確認してお渡しします。", "I cannot determine the cause. I will verify and provide information about what she ate."),
            ("Manager", "ありがとうございます。不確かな時刻は推測せず、確認できた情報だけ記録します。", "Thank you. We will not guess uncertain times and will record only verified information."),
        ]),
        "speaking": {
            "role": "Witness giving an incident timeline", "partnerRole": "Hotel duty manager",
            "opening": "確認できたことと、時刻があいまいなことを分けて説明します。",
            "goal": "Give observed events in order, distinguish reported symptoms from observations, identify the emergency call, and mark estimated times honestly.",
            "closure": "Do not diagnose the cause or replace emergency responders' instructions; use the person's own plan and local emergency service procedures.",
            "wordBank": ["時系列", "何時ごろ", "その後", "症状", "通報", "正確な時刻"],
        },
        "modes": {
            "see": "Read a factual incident chronology with aligned English.",
            "recall": "Recall event order and which times are estimates.",
            "hear": "Hear time markers and observed-versus-reported phrasing.",
            "type": "Type a cautious approximate-time sentence with kana support.",
            "say": "Report facts without diagnosing a cause.",
            "write": "Write a concise incident timeline with uncertainty labels.",
        },
    },
    {
        "n": 14,
        "title": "Report a mislabeled bread near miss",
        "objective": "Describe a mislabeled bread tray without blame, stop an unverified selection, and agree to check labels and preparation controls before future service.",
        "focus": "もう少しで～ところでした reports a near miss; ～かもしれません marks uncertainty; ～を確認しましょう proposes a process check. A new sign or color code alone does not verify gluten-free preparation or prevent cross-contact. Do not promise a bread is suitable for celiac disease from a tray label alone.",
        "scene": "At a bakery café, a friend notices a gluten-free sign beside bread whose ingredient label lists wheat and raises the discrepancy with staff.",
        "cards": builder.cards([
            ("グルテンフリー表示", "gluten-free sign"), ("小麦粉", "wheat flour"),
            ("原材料表示", "ingredient label"), ("トレー", "tray"), ("取り違え", "mix-up"),
            ("ヒヤリハット", "near miss"), ("調理場所", "preparation area"),
            ("共用の器具", "shared utensils"), ("混入", "cross-contact"),
            ("再確認", "recheck"), ("食べないで待つ", "wait without eating"),
            ("もう少しで", "almost"), ("～かもしれません", "might be"),
            ("確認できません", "cannot verify"),
        ]),
        "reader": builder.pair_lines([
            ("Friend", "待ってください。このトレーにはグルテンフリーの表示がありますが、原材料に小麦粉と書いてあります。", "Please wait. This tray has a gluten-free sign, but the ingredient list says wheat flour."),
            ("Guest", "食べる前に気づいてよかったです。まだ何も食べていません。", "I am glad we noticed before eating. I have not eaten anything yet."),
            ("Baker", "表示を確認します。トレーを移したときに取り違えたかもしれません。", "I will check the sign. We may have mixed up the trays when moving them."),
            ("Friend", "責めたいわけではありません。今はそのパンを選ばずに待ちます。", "I am not trying to blame anyone. For now, we will not choose that bread."),
            ("Baker", "表示と原材料を照合して、ほかのトレーも確認します。", "I will compare the signs with ingredients and check the other trays too."),
            ("Guest", "調理場所や共用の器具についても確認できますか。", "Could you also check the preparation area and shared utensils?"),
            ("Baker", "はい。分からない点は分からないとお伝えします。", "Yes. I will say clearly when something cannot be verified."),
            ("Friend", "次からは表示を置く前に、製品とトレーを再確認するのはどうですか。", "For next time, how about rechecking the product and tray before placing a sign?"),
            ("Baker", "手順を見直します。ただ、表示だけで適切だとは言いません。", "We will review the process. We will not claim suitability based only on a sign."),
            ("Guest", "確認できない場合は、今日は食べないことにします。", "If it cannot be verified, I will not eat it today."),
        ]),
        "speaking": {
            "role": "Friend reporting a bakery near miss", "partnerRole": "Baker and guest with celiac disease",
            "opening": "すみません。表示と原材料が違うようです。食べる前に確認できますか。",
            "goal": "State the observable discrepancy, stop the unverified order, ask about ingredients and cross-contact, and suggest a process review without assigning blame.",
            "closure": "Do not certify any bakery item as gluten-free from a sign or color code alone.",
            "wordBank": ["グルテンフリー表示", "小麦粉", "原材料", "取り違え", "混入", "再確認"],
        },
        "modes": {
            "see": "Read a calm near-miss dialogue with aligned English.",
            "recall": "Recall the discrepancy and checks still needed.",
            "hear": "Hear uncertainty and process-improvement phrasing.",
            "type": "Type a request to check the ingredient label with kana help.",
            "say": "Discuss the near miss without promising safety.",
            "write": "Write a factual near-miss note and two checks for staff.",
        },
    },
    {
        "n": 15,
        "title": "Relay hotel evacuation directions",
        "objective": "Follow hotel staff's evacuation instructions, pass brief clear directions to other guests, and report the group's location from the designated outside meeting place.",
        "focus": "こちらへ and 階段を使ってください relay short directions; ～たら reports the next action. Follow posted routes and staff/emergency responder instructions, keep elevators unused during a fire evacuation, and do not call an alarm false or re-enter until responders authorize it. Accessibility assistance follows staff procedure rather than improvisation.",
        "scene": "During a hotel breakfast alarm, guests follow an evacuation guide to a designated outside assembly point and account for companions.",
        "cards": builder.cards([
            ("火災警報", "fire alarm"), ("煙", "smoke"), ("非常口", "emergency exit"),
            ("階段", "stairs"), ("エレベーター", "elevator"), ("集合場所", "meeting point"),
            ("避難", "evacuation"), ("係員", "staff member"), ("消防隊", "fire responders"),
            ("客室番号", "room number"), ("確認する", "to confirm"),
            ("こちらへ", "this way"), ("外に出ました", "we are outside"),
            ("戻らないでください", "please do not return"),
        ]),
        "reader": builder.pair_lines([
            ("Staff", "火災警報が鳴っています。案内に従って避難してください。", "The fire alarm is sounding. Please follow the evacuation directions."),
            ("Guest", "皆さん、係員の案内を聞いてください。非常口はこちらです。", "Everyone, please listen to staff. The emergency exit is this way."),
            ("Staff", "エレベーターは使わず、案内された階段へ進んでください。", "Do not use the elevator; proceed to the stairs staff indicate."),
            ("Guest", "歩くのに手助けが必要な方がいます。係員に伝えます。", "Someone needs help moving. I will tell staff."),
            ("Staff", "分かりました。避難計画に沿って対応します。", "Understood. We will follow the evacuation plan."),
            ("Guest", "集合場所はどこですか。", "Where is the meeting point?"),
            ("Staff", "建物の外の指定された場所です。こちらへ進んでください。", "It is the designated area outside the building. Please proceed this way."),
            ("Guest", "外に出ました。同行者二人も一緒です。", "We are outside. My two companions are with me."),
            ("Reception", "客室番号と現在地を教えてください。消防隊の確認が済むまで戻らないでください。", "Please tell me your room number and current location. Do not return until fire responders clear it."),
            ("Guest", "五〇四号室です。指定の集合場所で待っています。", "I am in room 504. We are waiting at the designated meeting point."),
        ]),
        "speaking": {
            "role": "Hotel guest relaying evacuation directions", "partnerRole": "Hotel staff and other guests",
            "opening": "警報が鳴っています。係員の案内に従いましょう。",
            "goal": "Relay staff's short directions, report a guest needing help to staff, and state the group's location after reaching the designated outside point.",
            "closure": "Do not re-enter or declare an all-clear; wait for emergency responders and staff to authorize it.",
            "wordBank": ["火災警報", "非常口", "階段", "集合場所", "係員", "戻らない"],
        },
        "modes": {
            "see": "Read a clear evacuation exchange with aligned English.",
            "recall": "Recall staff directions and the outside meeting point.",
            "hear": "Hear short imperative directions in context.",
            "type": "Type a concise location report with kana support.",
            "say": "Relay directions and report the group's location.",
            "write": "Write a short factual outside status message.",
        },
    },
]

if __name__ == "__main__":
    builder.main()
    data = json.loads(builder.OUTPUT.read_text())
    data["reviewGates"] = [
        "Qualified Japanese language, register and pedagogy review",
        "Qualified medical and food-allergy incident review for Master 13",
        "Qualified celiac disease and bakery cross-contact review for Master 14",
        "Qualified hotel fire-evacuation and accessibility review for Master 15",
        "Recorded Japanese audio plus phone/offline/native checks",
    ]
    builder.OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
