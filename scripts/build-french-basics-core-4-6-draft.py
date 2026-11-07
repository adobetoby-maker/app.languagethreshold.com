#!/usr/bin/env python3
"""Build the bounded French 101 Core 4–6 draft from pinned English meanings."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/french-basics"
CORE_PATH = "src/data/spanish-basics-core.json"
PRACTICE_PATH = "src/data/spanish-basics-practice.json"
core = json.loads((ROOT / CORE_PATH).read_text())["lessons"]
practice = json.loads((ROOT / PRACTICE_PATH).read_text())["spanish-basics"]

source = {
    "sourceRevision": "343ebc22040cea589116bdbb45519248833a5abb",
    "target": "French", "native": "English",
    "sourcePaths": [CORE_PATH, PRACTICE_PATH],
    "sourceSha256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in (CORE_PATH, PRACTICE_PATH)},
    "lessons": []
}
for n in (4, 5, 6):
    lesson = core[n - 1]
    source["lessons"].append({
        "n": n, "title": lesson["title"], "objective": lesson["objective"],
        "focus": lesson["focus"], "words": lesson["words"],
        "speaking": lesson["speaking"], "reading": practice[str(n)]["reading"]
    })
source_path = OUT / "source-english-core-4-6.json"
source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n")

authored = {
  4: {
    "title": "Accord des adjectifs", "objective": "Accordez les adjectifs au genre et au nombre du nom : un sac rouge, des sacs rouges, une petite trousse, des petites trousses.",
    "foundationTie": "Reuses the articles, nouns and present-tense descriptions from Foundation, and the regular verbs introduced in Core 1–3.",
    "focus": "Gender and number agreement for common descriptive adjectives",
    "grammar": {"explanation": "In French, an adjective generally agrees with the noun it describes in gender and number. For many adjectives, add -e for feminine and -s for plural: petit, petite, petits, petites. Rouge already ends in -e, so masculine and feminine singular look alike; the plural is rouges. French adjectives often follow the noun (un sac rouge), though common adjectives such as petit usually precede it (un petit cahier). Spoken final -s is normally silent.", "model": {"masculine_singular": "un sac rouge", "feminine_singular": "une trousse rouge", "masculine_plural": "des sacs rouges", "feminine_plural": "des trousses rouges"}, "caution": "The article also changes with the noun: un sac, une trousse, des sacs. Not every adjective forms its feminine simply by adding -e."},
    "scene": "Dans une papeterie, une cliente demande un sac à dos rouge et compare plusieurs cahiers.",
    "dialogue": ["Bonjour, je cherche un sac à dos rouge.|Hello, I'm looking for a red backpack.", "Les sacs à dos rouges sont ici.|The red backpacks are here.", "Et ce petit cahier bleu ?|And this small blue notebook?", "Il est petit, mais les livres sont intéressants.|It is small, but the books are interesting.", "La vendeuse est gentille.|The sales assistant is kind.", "Je voudrais deux petits cahiers, s'il vous plaît.|I would like two small notebooks, please."],
    "speaking": "Role-play a stationery-shop visit. Ask the sales assistant for a red backpack and two small notebooks. Describe one item with a singular adjective and several items with plural adjectives. Ask where the red backpacks are, answer a related question, and confirm the choice. Use English only to explain a word if requested.",
    "frWords": ["sac à dos", "cahier", "est", "le", "la", "une", "un sac à dos", "ici", "Je cherche un sac à dos rouge.", "Les sacs à dos rouges sont ici.", "Le cahier bleu est petit.", "Les livres sont intéressants.", "La vendeuse est gentille.", "Je veux deux petits cahiers."],
    "wordMeta": {0: {"gender": "m"}, 1: {"gender": "m"}, 4: {"gender": "f"}, 6: {"gender": "m"}},
    "readingTitle": "À la papeterie",
    "reading": ["Je cherche un sac à dos rouge.", "Les sacs à dos rouges sont ici.", "Le cahier bleu est petit.", "Les livres sont intéressants.", "La vendeuse est gentille.", "Je veux deux petits cahiers."],
    "checks": [
      {"type":"recall","prompt":"Complete the French: Les sacs à dos ___ (rouge) sont ici.","answer":"rouges"},
      {"type":"write","prompt":"Write in French: I want two small notebooks.","answer":"Je veux deux petits cahiers."},
      {"type":"listening","audioText":"Les sacs à dos rouges sont ici.","locale":"fr-FR","voiceStatus":"script-only; no recorded audio","prompt":"Listen and answer in English: what color are the backpacks?","answer":"Red."},
      {"type":"comprehension","prompt":"In the reading À la papeterie, what two items does the customer want?","answer":"Two small notebooks."},
      {"type":"recall","prompt":"Which form agrees with cahiers: petit or petits?","answer":"petits"}
    ]
  },
  5: {
    "title": "Mon, ton et son", "objective": "Choisissez mon, ton ou son selon le genre et le nombre de l'objet possédé, et non selon le propriétaire : mon cahier, ma table, mes livres.",
    "foundationTie": "Reuses school and classroom nouns plus articles from Foundation; builds on Core 4's gender and number agreement.",
    "focus": "Possessive determiners mon/ma/mes, ton/ta/tes, son/sa/ses",
    "grammar": {"explanation": "A French possessive determiner agrees with the thing possessed. Say mon cahier but ma table, and mes livres in the plural. The owner may be male or female: son téléphone can mean his phone or her phone; context tells you whose it is. Before a feminine noun beginning with a vowel or mute h, use mon, ton or son for pronunciation: mon amie.", "model": {"first_singular": "mon cahier / ma table / mes livres", "second_singular": "ton cahier / ta table / tes crayons", "third_singular": "son téléphone / sa table / ses livres"}, "caution": "Son does not by itself reveal whether the owner is a man or a woman. A person's name or sentence context resolves that ambiguity."},
    "scene": "Après le cours, deux camarades cherchent leurs affaires; la professeure cherche aussi son téléphone.",
    "dialogue": ["Mon sac à dos est dans la salle de classe.|My backpack is in the classroom.", "Mes livres sont dans mon sac à dos.|My books are in my backpack.", "Où est ton cahier ?|Where is your notebook?", "Tes crayons sont ici, sur la table.|Your pencils are here, on the table.", "La professeure cherche son téléphone.|The teacher is looking for her phone.", "Le téléphone de la professeure est sur la table.|The teacher's phone is on the table."],
    "speaking": "Role-play finding things after class. Ask a classmate where their notebook is, tell them their pencils are here, and say where your backpack and books are. Explain that the teacher is looking for her phone and identify where it is. Use mon/ma/mes, ton/ta/tes and son/sa/ses in context.",
    "frWords": ["table", "sac à dos", "cahier", "cours / salle de classe", "est", "le", "la", "ici", "Mon sac à dos est dans la salle de classe.", "Mes livres sont dans mon sac à dos.", "Où est ton cahier ?", "Tes crayons sont ici.", "La professeure cherche son téléphone.", "Le téléphone de la professeure est sur la table."],
    "wordMeta": {0: {"gender": "f"}, 1: {"gender": "m"}, 2: {"gender": "m"}, 3: {"note":"Cours is the class session; salle de classe is the room."}, 12: {"note":"Son agrees with téléphone (masculine), not the teacher's gender."}},
    "readingTitle": "Après le cours",
    "reading": ["Mon sac à dos est dans la salle de classe.", "Mes livres sont dans mon sac à dos.", "Où est ton cahier ?", "Tes crayons sont ici.", "La professeure cherche son téléphone.", "Le téléphone de la professeure est sur la table."],
    "checks": [
      {"type":"recall","prompt":"Complete the French: ___ livres sont dans mon sac à dos. (my)","answer":"Mes"},
      {"type":"write","prompt":"Write in French: Where is your notebook?","answer":"Où est ton cahier ?"},
      {"type":"listening","audioText":"La professeure cherche son téléphone.","locale":"fr-FR","voiceStatus":"script-only; no recorded audio","prompt":"Listen and answer in English: what is the teacher looking for?","answer":"Her phone."},
      {"type":"comprehension","prompt":"In the reading Après le cours, where is the teacher's phone?","answer":"On the table."},
      {"type":"recall","prompt":"Why is it son téléphone even when the teacher is a woman?","answer":"Son agrees with the masculine noun téléphone, not with the owner's gender."}
    ]
  },
  6: {
    "title": "Avoir : possessions et besoins", "objective": "Utilisez avoir au présent pour exprimer ce que l'on possède et certains besoins : j'ai, tu as, il a, nous avons, ils ont ; j'ai faim, elle a soif.",
    "foundationTie": "Reuses classroom and food vocabulary from Foundation and possessives from Core 5; introduces an irregular present-tense verb.",
    "focus": "Present-tense avoir, possession, hunger and thirst",
    "grammar": {"explanation": "Avoir is irregular: j'ai, tu as, il/elle a, nous avons, vous avez, ils/elles ont. French uses avoir where English uses be for hunger and thirst: j'ai faim (I am hungry), elle a soif (she is thirsty). For possession, use j'ai un livre or nous avons de l'eau. Je shortens to j' before ai.", "model": {"je":"j'ai","tu":"tu as","il_elle":"il/elle a","nous":"nous avons","vous":"vous avez","ils_elles":"ils/elles ont"}, "caution":"Do not translate 'I am hungry' as je suis faim. Say j'ai faim. Avoir can also appear in other fixed expressions learned later."},
    "scene": "Après un cours, des amis vérifient ce qu'ils ont à manger et à boire avant le déjeuner.",
    "dialogue": ["J'ai faim après le cours.|I am hungry after class.", "Ana a soif.|Ana is thirsty.", "Nous avons de l'eau dans le sac à dos.|We have water in the backpack.", "Luis a deux sandwichs.|Luis has two sandwiches.", "Mes amis ont le temps de manger.|My friends have time to eat.", "Tu as un verre pour Ana ?|Do you have a glass for Ana?"],
    "speaking": "Role-play planning a snack after class. Say that you are hungry, ask whether your partner has water or a glass, and report what Ana, Luis and your friends have. Use j'ai, tu as, il/elle a, nous avons and ils/elles ont, then confirm what the group still needs.",
    "frWords": ["sac à dos", "cours / salle de classe", "la", "un", "dans / sur / à", "j'ai", "pour", "deux", "J'ai faim après le cours.", "Ana a soif.", "Nous avons de l'eau dans le sac à dos.", "Luis a deux sandwichs.", "Mes amis ont le temps de manger.", "Tu as un verre pour Ana ?"],
    "wordMeta": {0: {"gender":"m"}, 1: {"note":"Cours is a class session; salle de classe is the classroom."}, 4: {"note":"Choose the French preposition from the context; these are not interchangeable."}},
    "readingTitle": "Une pause après le cours",
    "reading": ["J'ai faim après le cours.", "Ana a soif.", "Nous avons de l'eau dans le sac à dos.", "Luis a deux sandwichs.", "Mes amis ont le temps de manger.", "Tu as un verre pour Ana ?"],
    "checks": [
      {"type":"recall","prompt":"Complete the French: Nous ___ de l'eau dans le sac à dos.","answer":"avons"},
      {"type":"write","prompt":"Write in French: I am hungry after class.","answer":"J'ai faim après le cours."},
      {"type":"listening","audioText":"Ana a soif.","locale":"fr-FR","voiceStatus":"script-only; no recorded audio","prompt":"Listen and answer in English: what does Ana need?","answer":"Something to drink; she is thirsty."},
      {"type":"comprehension","prompt":"In the reading Une pause après le cours, how many sandwiches does Luis have?","answer":"Two."},
      {"type":"recall","prompt":"Say 'my friends have' in French.","answer":"Mes amis ont"}
    ]
  }
}

draft = {
    "target":"French", "native":"English", "moduleId":"french-basics", "stage":"core",
    "reviewed":False, "state":"authored-draft",
    "source":{"path":"content/french-basics/source-english-core-4-6.json", "sourceSha256":hashlib.sha256(source_path.read_bytes()).hexdigest(), "sourcePaths":[CORE_PATH,PRACTICE_PATH], "sourceFileSha256":source["sourceSha256"], "use":"English objectives, word meanings, aligned reading meanings and progression; French grammar and examples authored separately"},
    "draftModel":"Codex authored; independent Fable/Opus and human review pending",
    "sourceNotes":["French possessives and avoir differ from the Spanish grammar focus; the English concept and reading meanings remain the anchor.", "Broad isolated English glosses, especially in/on/at, are contextual and need reviewer inspection."],
    "lessons":[]
}
for english in source["lessons"]:
    n = english["n"]
    author = authored[n]
    words = []
    for i, (fr, original) in enumerate(zip(author["frWords"], english["words"])):
        words.append({"order":i+1, "fr":fr, "en":original["en"], "kind":original["kind"], **author["wordMeta"].get(i,{})})
    draft["lessons"].append({
        "n":n,"title":author["title"],"sourceTitleEnglish":english["title"],"sourceObjectiveEnglish":english["objective"],"objective":author["objective"],
        "foundationTie":author["foundationTie"],"focus":author["focus"],"grammar":author["grammar"],"scene":author["scene"],"dialogue":author["dialogue"],"speaking":author["speaking"],"words":words,
        "reading":{"title":author["readingTitle"],"sourceTitleEnglish":english["reading"]["title"],"target":author["reading"],"native":english["reading"]["native"]},
        "checks":author["checks"],"locale":"fr-FR"
    })
draft_path = OUT / "core-4-6-draft.json"
draft_path.write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")
print(f"Wrote {source_path.relative_to(ROOT)} and {draft_path.relative_to(ROOT)}")
