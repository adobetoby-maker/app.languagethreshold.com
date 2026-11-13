#!/usr/bin/env python3
"""Rebuild the source-pinned Japanese Dinner Master 4 owner draft."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
MASTER = Path("src/data/core60/es/master-travel-dinner.json")
CONTENT = Path("public/lesson-content/es/master-travel-dinner.json")

CARD_JA = [
    "アレルゲン一覧表", "グルテン", "セリアック病の女性", "脚注", "共用のフライヤー",
    "フィデウア（麺のパエリア）", "衣", "小麦粉", "微量の混入", "記号", "凡例",
    "アスタリスク", "だし", "グルテンフリー", "セリアック病の人に適した",
    "選ぶ前に、下の注記を読まなきゃ。",
    "ここに、フィデウアにはグルテンが入っているって書いてあるよ。",
    "ほら、このアスタリスクは脚注を指しているよ。",
    "すみません、この表には共用のフライヤーの料理も含まれていますか。",
    "連れはセリアック病です。厨房に確認していただけますか。",
    "厨房に確認したところ、お米料理のだしにグルテンを含むものは入っていますか。",
    "厨房に聞いてから、何を頼むか決めます。",
    "決めるのはグレースだよ。私は書いてあることを読んで聞かせているだけだから。",
]

CARD_KANA = [
    "アレルゲンいちらんひょう", "グルテン", "セリアックびょうのじょせい", "きゃくちゅう",
    "きょうようのフライヤー", "フィデウア（めんのパエリア）", "ころも", "こむぎこ",
    "びりょうのこんにゅう", "きごう", "はんれい", "アスタリスク", "だし",
    "グルテンフリー", "セリアックびょうのひとにてきした",
    "えらぶまえに、したのちゅうきをよまなきゃ。",
    "ここに、フィデウアにはグルテンがはいっているってかいてあるよ。",
    "ほら、このアスタリスクはきゃくちゅうをさしているよ。",
    "すみません、このひょうにはきょうようのフライヤーのりょうりもふくまれていますか。",
    "つれはセリアックびょうです。ちゅうぼうにかくにんしていただけますか。",
    "ちゅうぼうにかくにんしたところ、おこめりょうりのだしにグルテンをふくむものははいっていますか。",
    "ちゅうぼうにきいてから、なにをたのむかきめます。",
    "きめるのはグレースだよ。わたしはかいてあることをよんできかせているだけだから。",
]

READER_JA = [
    "バレンシアのお米料理のレストランで、店員のアンパロさんが店のアレルゲン一覧表を持ってきます。",
    "友だちのグレースはセリアック病なので、私は何かを頼む前に表を声に出して読みます。",
    "グレースに言います。「選ぶ前に、下の注記を読まなきゃ。」",
    "凡例によると、麦の穂の記号は、その料理にグルテンが入っていることを示します。",
    "グレースに読み上げます。「ここに、フィデウアにはグルテンが入っているって書いてあるよ。」",
    "フィデウアは小麦粉の麺で作るので、グレースには選べない料理です。",
    "イカのフライにも麦の穂の記号があります。衣に小麦粉が入っているからです。",
    "フライドポテトはグルテンフリーと書いてありますが、横にアスタリスクがついています。",
    "グレースに言います。「ほら、このアスタリスクは脚注を指しているよ。」",
    "脚注には、この表は共用のフライヤーで調理する料理を対象にしておらず、その料理には微量のグルテンが混入している可能性があると書いてあります。",
    "アロス・ア・バンダにはセリアック病の人に適した料理という印がありますが、表にはだしについて何も書かれていません。",
    "私はグレースのために確認する項目を挙げます。共用のフライヤーと、お米料理のだしを厨房に確認しなければなりません。",
    "脚注を読んでから、アンパロさんに聞きます。「すみません、この表には共用のフライヤーの料理も含まれていますか。」",
    "続けて言います。「連れはセリアック病です。厨房に確認していただけますか。」",
    "さらに聞きます。「厨房に確認したところ、お米料理のだしにグルテンを含むものは入っていますか。」",
    "アンパロさんが厨房から戻って言います。「料理人によると、だしにグルテンは入っていません。ただ、ポテトはイカと同じフライヤーで揚げています。」",
    "グレースに言います。「決めるのはグレースだよ。私は書いてあることを読んで聞かせているだけだから。」",
    "グレースはフライドポテトを付けずに、アロス・ア・バンダを頼むことにします。",
]

FORMS = [
    {"base": "読む", "polite": "読みます", "meaning": "to read", "example": "注文する前に、脚注を読みます。", "question": "読みますか"},
    {"base": "頼む", "polite": "頼みます", "meaning": "to order, to ask for", "example": "グレースはアロス・ア・バンダを頼みます。", "question": "頼みますか"},
    {"base": "含む", "polite": "含みます", "meaning": "to contain (an ingredient)", "example": "このだしはグルテンを含みますか。", "question": "含みますか"},
    {"base": "確認する", "polite": "確認します", "meaning": "to confirm, to check", "example": "注文する前に、厨房に確認します。", "question": "確認しますか"},
    {"base": "決める", "polite": "決めます", "meaning": "to decide", "example": "何を頼むかはグレースが決めます。", "question": "決めますか"},
]


def digest(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def build():
    master = json.loads((ROOT / MASTER).read_text())["lessons"][3]
    passage = json.loads((ROOT / CONTENT).read_text())["lessons"]["4"]["passage"]["native"]
    assert len(master["words"]) == len(CARD_JA) == len(CARD_KANA) == 23
    assert len(passage) == len(READER_JA) == 18
    cards = [{"ja": ja, "en": word["en"], "kind": word["kind"], "readingKana": kana}
             for ja, kana, word in zip(CARD_JA, CARD_KANA, master["words"])]
    reader = [{"speaker": "Narrator", "ja": ja, "en": en} for ja, en in zip(READER_JA, passage)]
    modes = {}
    for name, index, response in (("see", 1, "fixed"), ("recall", 3, "fixed"),
                                   ("hear", 19, "fixed"), ("type", 20, "fixed"),
                                   ("say", 21, "open"), ("write", 23, "open")):
        modes[name] = {"cueEnglish": cards[index - 1]["en"], "sourceCard": index, "responseKind": response}
    lesson = {"n": 4, "stableId": "master-travel-dinner:4:ja-en",
              "sourceTitleEnglish": master["title"], "sourceObjectiveEnglish": master["objective"],
              "sourceSpeakingEnglish": master["speaking"], "title": master["title"],
              "objective": master["objective"],
              "focus": "友だちに順序を伝えるときは「～前に」と「～てから」を使う。例：注文する前に脚注を読む。読んでから厨房に聞く。必要な確認は「～なければならない」で表し、友だちにはくだけた「～なきゃ」も使える。店員には「～ていただけますか」と丁寧に頼む。",
              "scene": "At a Valencia rice restaurant, you read an allergen chart and its footnote aloud with your friend Grace, who has celiac disease. You ask server Amparo to check the shared fryer and the rice stock with the kitchen. Grace decides what to order after hearing the answers.",
              "forms": FORMS, "cards": cards, "reader": reader, "modes": modes,
              "speaking": {"role": "You, reading the Valencia rice restaurant's allergen chart aloud to Grace.",
                           "partnerRole": "Grace, your friend who has celiac disease and decides what to order.",
                           "opening": CARD_JA[15],
                           "objectives": ["Tell Grace that before choosing (～前に), you need to read the chart's wheat-ear symbol and footnote aloud.",
                                          "Explain that the fideuà and fried squid contain wheat or gluten.",
                                          "Explain the asterisk and shared-fryer note; list what needs checking with the kitchen using ～なきゃ or ～なければならない.",
                                          "Tell Grace that after reading the footnote (～てから), you will ask about the shared fryer and rice stock.",
                                          "Relay the kitchen's answer to Grace, and let her choose arroz a banda without fries."],
                           "closure": CARD_JA[22],
                           "wordBank": CARD_JA, "goal": master["objective"]},
              "reviewed": False}
    return {"schema": 1, "courseId": "travel-dinner", "stageId": "master-travel-dinner",
            "targetLanguage": "Japanese", "nativeLanguage": "English", "pairKey": "Japanese:English",
            "locale": "ja-JP", "state": "partial-authored-draft", "reviewed": False,
            "registered": False, "readyForLearner": False, "audio": "none",
            "source": {"masterPath": str(MASTER), "masterSHA256": digest(MASTER),
                       "contentPath": str(CONTENT), "contentSHA256": digest(CONTENT),
                       "revision": "70cd3dd900b84e5052abe7a8f9e3a397f3000e8e"},
            "lessons": [lesson]}


def main():
    output = HERE / "master-4-draft.json"
    expected = json.dumps(build(), ensure_ascii=False, indent=2) + "\n"
    output.write_text(expected)
    print("Japanese Dinner Master 4 source-pinned draft rebuilt")


if __name__ == "__main__":
    main()
