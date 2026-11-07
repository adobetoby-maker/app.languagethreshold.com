#!/usr/bin/env python3
"""Build private Japanese Travel Breakfast Master 10–12 with pinned English provenance."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("master_builder", ROOT / "scripts/build-japanese-travel-master-4-6.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.PREVIOUS = ROOT / "content/japanese-travel-breakfast/master-7-9-draft.json"
builder.OUTPUT = ROOT / "content/japanese-travel-breakfast/master-10-12-draft.json"
builder.AUTHORED = [
    {
        "n": 10,
        "title": "Mediate a group breakfast plan before pickup",
        "objective": "Report two friends' preferences fairly, verify the market's opening and pickup time, then agree on a breakfast plan without rushing anyone who feels unwell.",
        "focus": "～と言っていました reports another person's position without treating it as a fact; 一方で contrasts views; ～なら offers a conditional compromise. The English source's coca-tea altitude claim is excluded: food and drinks are not presented as treatment for altitude symptoms. Do not promise a rushed market trip is safe or feasible.",
        "scene": "At a mountain lodge, two friends disagree about visiting a morning market before a scheduled shuttle pickup.",
        "cards": builder.cards([
            ("集合時刻", "pickup time"), ("朝市", "morning market"), ("開店時刻", "opening time"),
            ("宿", "lodging"), ("意見", "opinion"), ("折衷案", "compromise"),
            ("体調", "physical condition"), ("荷物", "luggage"), ("送迎車", "shuttle vehicle"),
            ("確認する", "to verify"), ("～と言っていました", "said that ..."),
            ("一方で", "on the other hand"), ("～なら", "if ..."), ("無理をしない", "not to push oneself"),
        ]),
        "reader": builder.pair_lines([
            ("Mediator", "美咲さんは朝市で朝食を食べたいと言っていました。", "Misaki said she wanted to eat breakfast at the morning market."),
            ("Mediator", "一方で、ルカさんは送迎車に遅れるのを心配しています。", "On the other hand, Luca is worried about missing the shuttle."),
            ("Luca", "集合時刻は七時だと思います。まず予約の連絡を確認しましょう。", "I think pickup is at seven. Let's check the booking message first."),
            ("Host", "連絡には、宿の前に七時集合と書いてあります。", "The message says to meet outside the lodge at seven."),
            ("Mediator", "朝市の開店時刻と、宿からの距離も確認できますか。", "Could we check the market opening time and distance from the lodge too?"),
            ("Host", "六時に開きますが、混み具合は分かりません。", "It opens at six, but I do not know how crowded it will be."),
            ("Misaki", "体調がよくない人がいたら、無理をしないほうがいいですね。", "If someone feels unwell, we should not push them."),
            ("Mediator", "では、先に荷物を用意して、全員の体調を聞きましょう。", "Then let's prepare our bags first and ask how everyone feels."),
            ("Mediator", "時間と体調に余裕があるなら朝市へ、なければ宿で食べるのはどうですか。", "If we have enough time and everyone feels well, how about the market; otherwise, we can eat at the lodge?"),
            ("Luca", "その条件なら賛成です。出発前にもう一度時刻を確認しましょう。", "I agree on those conditions. Let's check the time again before leaving."),
        ]),
        "speaking": {
            "role": "Friend mediating a breakfast plan", "partnerRole": "Two travelers and a lodging host",
            "opening": "お二人の意見を整理しましょう。まず集合時刻を確認します。",
            "goal": "Report each person's view fairly, ask staff for opening and pickup facts, and propose a conditional plan that respects time and health.",
            "closure": "Do not recommend a drink as treatment for altitude symptoms or pressure an unwell traveler to rush; seek appropriate local help if needed.",
            "wordBank": ["集合時刻", "朝市", "意見", "確認", "体調", "折衷案"],
        },
        "modes": {
            "see": "Read a mediated group decision with aligned English.",
            "recall": "Recall each friend's view and verified schedule facts.",
            "hear": "Hear reported speech and contrasting positions.",
            "type": "Type a conditional compromise with kana support.",
            "say": "Mediate the group without promising a rushed trip.",
            "write": "Write a balanced summary and conditional plan.",
        },
    },
    {
        "n": 11,
        "title": "Keep a tired group organized at dawn",
        "objective": "Encourage a sleepy group, divide preparation tasks, and agree on a realistic departure plan while breakfast is delayed.",
        "focus": "～を担当します assigns a task; ～までに prepares by a deadline; 無理をせず gives a humane limit. The English source's promise to reach the trail before sunrise is not repeated: confirm actual route, weather, daylight and the group's condition instead.",
        "scene": "At a hiking lodge, bread is still baking and the group shares tasks while the cook confirms when breakfast will be ready.",
        "cards": builder.cards([
            ("水筒", "thermos"), ("朝食", "breakfast"), ("持ち帰りの昼食", "packed lunch"),
            ("上着", "jacket"), ("ヘッドライト", "headlamp"), ("登山口", "trailhead"),
            ("出発予定", "planned departure"), ("天気予報", "weather forecast"),
            ("体調", "physical condition"), ("担当する", "to take charge of"),
            ("あと何分", "how many more minutes"), ("～までに", "by ..."),
            ("無理をせず", "without pushing too hard"), ("準備しましょう", "let's get ready"),
        ]),
        "reader": builder.pair_lines([
            ("Cook", "パンはまだ焼いています。あと十五分ほどかかる予定です。", "The bread is still baking. It is expected to take about fifteen more minutes."),
            ("Organizer", "ありがとうございます。正確な時間が分かったら教えてください。", "Thank you. Please tell us when you know the exact time."),
            ("Friend", "眠くて、出発の準備がまだ終わっていません。", "I am sleepy, and I have not finished getting ready to leave."),
            ("Organizer", "無理をせず、一つずつ準備しましょう。私は水筒を担当します。", "Let's get ready one thing at a time without pushing too hard. I will take care of the thermos."),
            ("Organizer", "美咲さんは持ち帰りの昼食を確認してくれますか。", "Misaki, could you check the packed lunches?"),
            ("Misaki", "はい。人数と中身を確認しておきます。", "Yes. I will check the count and contents."),
            ("Organizer", "出発前に上着とヘッドライトも確認しましょう。", "Let's check our jackets and headlamps before leaving too."),
            ("Friend", "天気予報と登山口までの道も見ておきます。", "I will also check the weather forecast and route to the trailhead."),
            ("Cook", "パンが焼けました。熱いので、受け取るときは気をつけてください。", "The bread is ready. It is hot, so please take care when receiving it."),
            ("Organizer", "全員の体調と準備を確認してから、出発時刻を決めましょう。", "Let's decide when to leave after checking everyone's condition and readiness."),
        ]),
        "speaking": {
            "role": "Group organizer at a hiking lodge", "partnerRole": "Cook and tired companions",
            "opening": "パンはあと何分ぐらいかかりますか。待つ間に準備を分担しましょう。",
            "goal": "Ask for an updated breakfast time, assign two preparation tasks, encourage the group, and confirm readiness before departure.",
            "closure": "Do not promise arrival before sunrise or ignore weather, route or a companion's condition.",
            "wordBank": ["あと何分", "担当します", "水筒", "昼食", "上着", "体調"],
        },
        "modes": {
            "see": "Read a realistic dawn-preparation scene with aligned English.",
            "recall": "Recall the delay and assigned tasks.",
            "hear": "Hear task commitments and timing language.",
            "type": "Type a task assignment with kana support.",
            "say": "Coordinate the group while checking readiness.",
            "write": "Write a short task list and departure condition.",
        },
    },
    {
        "n": 12,
        "title": "Coach polite and casual requests at a guesthouse",
        "objective": "Explain how to begin politely with an unfamiliar host or guest, listen for the form of address they prefer, and model a more casual request with a familiar peer.",
        "focus": "～ていただけますか and です・ます are polite requests; ～てくれる？ is casual with a familiar peer. Japanese formality depends on relationship, setting and the other person's cues; it is not a fixed age rule. The Spanish usted/tú distinction stays as source provenance, not a literal Japanese grammar equivalence.",
        "scene": "A traveler coaches a friend through breakfast requests to a guesthouse host, a new guest and a familiar travel companion.",
        "cards": builder.cards([
            ("宿の方", "guesthouse host"), ("宿泊客", "guest"), ("同行者", "travel companion"),
            ("丁寧な言い方", "polite way of speaking"), ("くだけた言い方", "casual way of speaking"),
            ("関係", "relationship"), ("呼び方", "form of address"), ("コーヒーポット", "coffee pot"),
            ("砂糖", "sugar"), ("～ていただけますか", "could you please ...?"),
            ("～てくれる？", "could you ...? (casual)"), ("失礼します", "excuse me"),
            ("ご希望", "preference"), ("確認する", "to check"),
        ]),
        "reader": builder.pair_lines([
            ("Coach", "初めて会う宿の方には、まず丁寧に話しましょう。", "When meeting the guesthouse host for the first time, let's begin politely."),
            ("Friend", "どんなふうに頼めばいいですか。", "How should I ask?"),
            ("Coach", "『コーヒーをもう少しいただけますか』と言えます。", "You can say, 'Could I please have a little more coffee?'"),
            ("Friend", "すみません。コーヒーをもう少しいただけますか。", "Excuse me. Could I please have a little more coffee?"),
            ("Host", "もちろんです。私のことは名前で呼んでください。", "Of course. Please call me by my name."),
            ("Coach", "呼び方は相手の希望に合わせましょう。丁寧さも場面を見て調整します。", "Let's follow the person's preference for how to address them. We can adjust formality to the situation too."),
            ("Friend", "初めて会う宿泊客にはどう話しますか。", "How should I speak to a guest I have just met?"),
            ("Coach", "まずは『砂糖を取っていただけますか』と丁寧に聞けます。", "You could begin by politely asking, 'Could you pass the sugar?'"),
            ("Friend", "いつもの同行者には、くだけて話してもいいですか。", "Can I speak more casually with my usual travel companion?"),
            ("Coach", "お互いにそう話しているなら、『砂糖を取ってくれる？』でも自然です。", "If you already speak that way with each other, 'Could you pass the sugar?' in casual form is natural too."),
        ]),
        "speaking": {
            "role": "Traveler coaching a friend", "partnerRole": "Guesthouse host, unfamiliar guest and familiar companion",
            "opening": "初めて会う人には、まず丁寧にお願いしましょう。",
            "goal": "Model polite requests to the host and new guest, then a casual request to a familiar companion while checking preferred forms of address.",
            "closure": "Do not infer a person's preferred address from age alone; follow their cues and the setting.",
            "wordBank": ["丁寧", "くだけた", "～ていただけますか", "～てくれる？", "呼び方", "確認"],
        },
        "modes": {
            "see": "Read three register choices with aligned English support.",
            "recall": "Recall which requests suit unfamiliar and familiar relationships.",
            "hear": "Hear polite and casual request endings.",
            "type": "Type one polite request with kana support.",
            "say": "Coach a friend through context-sensitive address.",
            "write": "Write paired polite and casual requests for the same item.",
        },
    },
]

if __name__ == "__main__":
    builder.main()
    data = json.loads(builder.OUTPUT.read_text())
    data["reviewGates"] = [
        "Qualified Japanese language, register and pedagogy review",
        "Qualified travel, altitude-health and transport-timing review for Master 10",
        "Qualified hiking, food-handling and hot-bread safety review for Master 11",
        "Qualified Japanese social-register and guesthouse-cultural review for Master 12",
        "Recorded Japanese audio plus phone/offline/native checks",
    ]
    builder.OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
