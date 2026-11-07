#!/usr/bin/env python3
"""Build private Japanese Travel Breakfast Master 16–18 with pinned English provenance."""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("master_builder", ROOT / "scripts/build-japanese-travel-master-4-6.py")
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.PREVIOUS = ROOT / "content/japanese-travel-breakfast/master-13-15-draft.json"
builder.OUTPUT = ROOT / "content/japanese-travel-breakfast/master-16-18-draft.json"
builder.AUTHORED = [
    {
        "n": 16,
        "title": "Review a written statement with an inspector",
        "objective": "Answer formal questions about a breakfast incident, distinguish what you witnessed from what others reported, and request corrections before confirming a written statement.",
        "focus": "私が見た範囲では limits a claim to observation; ～と聞きました marks secondhand information; 署名する前に修正してください requests a correction before signing. The source's hotel allergen process and serving time are not assumed true of this scene; do not sign a statement with unresolved errors or assert an unverified cause.",
        "scene": "A witness reads a hotel incident statement line by line with an inspector and corrects a mistaken time.",
        "cards": builder.cards([
            ("衛生担当者", "health inspector"), ("報告書", "report"), ("供述書", "written statement"),
            ("誤記", "writing error"), ("記載", "written entry"), ("署名", "signature"),
            ("写し", "copy"), ("提供時刻", "serving time"), ("原材料記録", "ingredient record"),
            ("確認する", "to verify"), ("修正する", "to correct"),
            ("私が見た範囲では", "as far as I observed"), ("～と聞きました", "I heard that ..."),
            ("署名する前に", "before signing"),
        ]),
        "reader": builder.pair_lines([
            ("Inspector", "報告書の記載を、署名する前に一緒に確認しましょう。", "Let us check the report entries together before you sign."),
            ("Witness", "二つ目の欄の時刻に誤記があります。八時半ではなく、八時十分ごろです。", "There is an error in the time in the second section. It was about 8:10, not 8:30."),
            ("Inspector", "正確な時刻は記録で確認できますか。", "Can the exact time be checked against a record?"),
            ("Witness", "私のメッセージの時刻を確認できます。記録を見せます。", "I can check the time of my message. I will show the record."),
            ("Inspector", "朝食の原材料表示を見ましたか。", "Did you see the ingredient information for the breakfast item?"),
            ("Witness", "私が見た範囲では、表示の有無を確認できませんでした。", "As far as I observed, I could not confirm whether the information was displayed."),
            ("Inspector", "では、見ていないことを断定する記載は削除します。", "Then we will remove the entry that asserts something you did not see."),
            ("Witness", "ありがとうございます。修正後の文をもう一度読ませてください。", "Thank you. Please let me read the corrected wording once more."),
            ("Inspector", "こちらが修正版です。未確認の原因は書いていません。", "Here is the revised version. It does not state an unverified cause."),
            ("Witness", "確認しました。署名する場合は、写しもいただけますか。", "I have reviewed it. If I sign, could I have a copy too?"),
        ]),
        "speaking": {
            "role": "Witness reviewing an incident statement", "partnerRole": "Inspector",
            "opening": "署名する前に、記載された時刻と私が見たことを確認したいです。",
            "goal": "Answer formal questions, identify one time error, distinguish firsthand from secondhand information, and request a corrected copy before deciding whether to sign.",
            "closure": "Do not infer cause or validate the hotel's allergen process without evidence; leave an unresolved error unsigned.",
            "wordBank": ["報告書", "誤記", "八時十分ごろ", "私が見た範囲では", "修正", "写し"],
        },
        "modes": {
            "see": "Read a line-by-line statement review with English support.",
            "recall": "Recall which claims are observed and which require correction.",
            "hear": "Hear formal requests and uncertainty markers.",
            "type": "Type a polite correction request with kana support.",
            "say": "Review a report without confirming unobserved claims.",
            "write": "Write a concise correction note with an evidence source.",
        },
    },
    {
        "n": 17,
        "title": "Email a consent-limited incident summary",
        "objective": "Draft a clear hotel email about a breakfast incident, first asking the affected friend which health details they authorize sharing.",
        "focus": "まず・次に・一方で・最後に structure a formal summary; 本人の同意を確認する precedes disclosure of personal health information. The English source's diagnosis, medical report attachment and fixed 15-day response request are not treated as automatic; share only what the friend explicitly approves and verify the recipient/attachments before sending.",
        "scene": "A traveler reads a draft incident email aloud to the affected friend and revises it to match the friend's disclosure choices.",
        "cards": builder.cards([
            ("件名", "subject line"), ("宛先", "recipient"), ("添付ファイル", "attachment"),
            ("概要", "summary"), ("本人の同意", "the person's consent"),
            ("健康情報", "health information"), ("個人情報", "personal information"),
            ("書面での回答", "written reply"), ("問い合わせ", "inquiry"),
            ("まず", "first"), ("次に", "next"), ("一方で", "on the other hand"),
            ("最後に", "finally"), ("送信前に確認する", "check before sending"),
        ]),
        "reader": builder.pair_lines([
            ("Writer", "ホテルへのメールの下書きを読みます。健康情報はどこまで書いてもいいですか。", "I will read my draft email to the hotel. How much health information may I include?"),
            ("Friend", "救急隊が来たことは書いていいですが、診断や薬のことは書かないでください。", "You may say responders came, but please do not include a diagnosis or medication details."),
            ("Writer", "分かりました。医療書類も添付しません。", "Understood. I will not attach medical documents either."),
            ("Writer", "件名は『朝食時の出来事について』にします。", "I will use 'About the breakfast incident' as the subject."),
            ("Writer", "まず、対応してくれた係員へのお礼を書きます。", "First, I will thank the staff who responded."),
            ("Writer", "次に、私が確認した時系列を簡潔にまとめます。", "Next, I will briefly summarize the timeline I verified."),
            ("Writer", "一方で、食品の情報について確認したい点があります。", "On the other hand, there are questions I would like answered about the food information."),
            ("Friend", "その聞き方なら大丈夫です。私の病名は書かないでください。", "That wording is fine. Please do not include my diagnosis."),
            ("Writer", "最後に、書面での回答をお願いします。送信前に宛先と添付を確認します。", "Finally, I will ask for a written reply. Before sending, I will check the recipient and attachments."),
            ("Friend", "修正版をもう一度見せてください。確認してから送ってください。", "Please show me the revised version once more. Send it only after I check it."),
        ]),
        "speaking": {
            "role": "Traveler drafting a hotel email", "partnerRole": "Affected friend reviewing disclosure",
            "opening": "ホテルへのメールに、どの情報を書いてよいか先に確認したいです。",
            "goal": "Ask the friend which details may be shared, read a concise ordered draft, and revise the disclosure and attachments before sending.",
            "closure": "Do not send health details beyond the friend's explicit choice or imply a legal response deadline.",
            "wordBank": ["件名", "本人の同意", "健康情報", "まず", "次に", "書面での回答"],
        },
        "modes": {
            "see": "Read a consent-aware email drafting scene with aligned English.",
            "recall": "Recall which details the friend approved and excluded.",
            "hear": "Hear formal sequencing language in the draft.",
            "type": "Type a consent question with kana support.",
            "say": "Read and revise a draft with the affected friend.",
            "write": "Write a short email with only approved details and a reply request.",
        },
    },
    {
        "n": 18,
        "title": "Update a guesthouse host about a delayed arrival",
        "objective": "Text a guesthouse host about a train delay and larger group, then call to confirm arrival, room capacity, key pickup and breakfast timing.",
        "focus": "電車が遅れているため explains the reason; 三人から五人に変わりました reports a changed group size; ～していただけますか makes requests without assuming acceptance. The English source's Asturias connections, lockbox and 10:30 breakfast are provenance, not automatic Japanese lodging arrangements. Confirm each change with the host before telling the group it is settled.",
        "scene": "A traveler on a delayed train texts a guesthouse, then calls when signal returns to clarify a larger booking and next morning's breakfast.",
        "cards": builder.cards([
            ("遅延", "delay"), ("宿の方", "guesthouse host"), ("到着予定時刻", "expected arrival time"),
            ("人数変更", "change in group size"), ("追加の寝具", "extra bedding"),
            ("鍵の受け取り", "key pickup"), ("朝食時間", "breakfast time"),
            ("電波", "signal"), ("トンネル", "tunnel"), ("折り返す", "to call back"),
            ("確認する", "to confirm"), ("～のため", "because of"),
            ("三人から五人に", "from three to five people"),
            ("可能でしょうか", "would it be possible?"),
        ]),
        "reader": builder.pair_lines([
            ("Traveler", "電車が遅れているため、到着が予定より遅くなりそうです。", "Because the train is delayed, we are likely to arrive later than planned."),
            ("Traveler", "また、人数が三人から五人に変わりました。受け入れ可能か確認できますか。", "Also, our group has changed from three to five. Could you confirm whether that is possible?"),
            ("Host", "ご連絡ありがとうございます。部屋と寝具を確認して返信します。", "Thank you for letting me know. I will check the rooms and bedding and reply."),
            ("Traveler", "到着予定時刻は二十二時ごろです。鍵の受け取り方法も教えていただけますか。", "Our expected arrival is about ten in the evening. Could you tell us how to collect the keys?"),
            ("Host", "詳しく確認するため、お電話できますか。", "Could we speak by phone to confirm the details?"),
            ("Traveler", "今はトンネルで電波が切れそうです。出たら折り返します。", "We are in a tunnel and may lose signal. I will call back when we come out."),
            ("Traveler", "お電話ありがとうございます。五人の宿泊は可能でしょうか。", "Thank you for taking my call. Can you accommodate five guests?"),
            ("Host", "はい、五人分の寝具を用意できます。鍵の受け取りは到着前に説明します。", "Yes, we can prepare bedding for five. I will explain key pickup before you arrive."),
            ("Traveler", "明日の朝食時間を教えてください。少し遅い時間は可能でしょうか。", "Could you tell me tomorrow's breakfast hours? Is a slightly later time possible?"),
            ("Host", "朝食は八時から十時です。遅い時間については確認して連絡します。", "Breakfast is from eight to ten. I will check the later time and get back to you."),
        ]),
        "speaking": {
            "role": "Traveler updating a guesthouse booking", "partnerRole": "Guesthouse host",
            "opening": "電車が遅れているため、到着時刻と宿泊人数の変更についてご相談したいです。",
            "goal": "Report the delay and group-size change, ask for confirmation of room capacity and key pickup, then ask about breakfast hours.",
            "closure": "Tell companions only what the host has actually confirmed; do not assume a late breakfast, room change or lockbox access.",
            "wordBank": ["遅延", "到着予定時刻", "人数変更", "五人", "鍵の受け取り", "朝食時間"],
        },
        "modes": {
            "see": "Read a text-and-call booking update with aligned English.",
            "recall": "Recall which changes are confirmed and which remain pending.",
            "hear": "Hear delay explanations and polite requests.",
            "type": "Type a group-size update with kana support.",
            "say": "Call the host to confirm arrival, rooms and breakfast.",
            "write": "Write a concise text with delay, group size and requested confirmation.",
        },
    },
]

if __name__ == "__main__":
    builder.main()
    data = json.loads(builder.OUTPUT.read_text())
    data["reviewGates"] = [
        "Qualified Japanese language, register and pedagogy review",
        "Qualified incident documentation and food-allergy inspection review for Master 16",
        "Qualified privacy, consent and consumer-communications review for Master 17",
        "Qualified lodging, transport and regional breakfast service review for Master 18",
        "Recorded Japanese audio plus phone/offline/native checks",
    ]
    builder.OUTPUT.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")
