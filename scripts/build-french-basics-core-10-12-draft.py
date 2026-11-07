#!/usr/bin/env python3
"""Build a bounded French 101 Core draft from pinned English source meanings."""
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "content/french-basics"
CORE = "src/data/spanish-basics-core.json"
PRACTICE = "src/data/spanish-basics-practice.json"
core = json.loads((ROOT / CORE).read_text())["lessons"]
practice = json.loads((ROOT / PRACTICE).read_text())["spanish-basics"]
source = {
    "sourceRevision": "eba245a0608ff151cc26d0e1dda96445b15136ae",
    "target": "French", "native": "English",
    "sourcePaths": [CORE, PRACTICE],
    "sourceSha256": {p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in (CORE, PRACTICE)},
    "lessons": [],
}
for n in (10, 11, 12):
    lesson = core[n - 1]
    source["lessons"].append({"n": n, "title": lesson["title"], "objective": lesson["objective"], "focus": lesson["focus"], "words": lesson["words"], "speaking": lesson["speaking"], "reading": practice[str(n)]["reading"]})
source_path = OUT / "source-english-core-10-12.json"
source_path.write_text(json.dumps(source, ensure_ascii=False, indent=2) + "\n")

authored = {
    10: {
        "title": "Dire l’heure et organiser sa journée",
        "objective": "Dites l’heure avec il est, puis indiquez à quelle heure commencent et finissent les activités de la journée.",
        "foundationTie": "Builds on Core 7–9 destinations, questions and clock-time vocabulary.",
        "focus": "Il est + heure; à + heure for schedules; du matin / de l’après-midi",
        "grammar": {"explanation": "To tell time in French use il est, including il est une heure and il est huit heures. The hour noun changes number, but the verb stays singular: never say ils sont huit heures. For a scheduled event use à: Le cours commence à neuf heures. Ask À quelle heure ? for a precise time. Du matin and de l’après-midi disambiguate the part of the day.", "model": {"one": "Il est une heure.", "eight": "Il est huit heures du matin.", "schedule": "Le cours commence à neuf heures.", "question": "À quelle heure arrives-tu à la maison ?"}, "caution": "Unlike Spanish es la una / son las dos, French keeps il est for every clock hour."},
        "scene": "Deux camarades comparent leur emploi du temps avant la journée de cours.",
        "readingTitle": "Une journée de cours",
        "reading": ["Il est huit heures du matin.", "Le cours commence à neuf heures.", "Le déjeuner est à une heure.", "J’étudie à trois heures de l’après-midi.", "La bibliothèque ferme à six heures.", "À quelle heure arrives-tu à la maison ?"],
        "speaking": "Plan a class day with a classmate. Ask what time they arrive home, tell them it is eight in the morning, then say when class, lunch, study and the library closing happen. Confirm one time by repeating it. Use il est to tell time and à for scheduled events.",
        "frWords": ["cours / salle de classe", "est", "le", "la / l’", "une", "sont", "les", "trois", "Il est huit heures du matin.", "Le cours commence à neuf heures.", "Le déjeuner est à une heure.", "J’étudie à trois heures de l’après-midi.", "La bibliothèque ferme à six heures.", "À quelle heure arrives-tu à la maison ?"],
        "wordMeta": {0: {"note": "Cours is a class session; salle de classe is the classroom."}, 1: {"note": "Est is the third-person singular of être; the impersonal time expression is il est."}, 3: {"note": "La is a feminine article or object pronoun; l’ is used before a vowel."}, 5: {"note": "Sont means 'are' for plural subjects, but French clock time uses il est."}, 6: {"note": "Les is a plural article or object pronoun, regardless of noun gender."}},
        "checks": [
            {"type": "recall", "prompt": "Complete the clock time: Il ___ huit heures.", "answer": "est"},
            {"type": "write", "prompt": "Write in French: Class starts at nine.", "answer": "Le cours commence à neuf heures."},
            {"type": "listening", "audioText": "La bibliothèque ferme à six heures.", "locale": "fr-FR", "voiceStatus": "script-only; no recorded audio", "prompt": "Listen: what time does the library close?", "answer": "At six."},
            {"type": "comprehension", "prompt": "In Une journée de cours, when is lunch?", "answer": "At one."},
            {"type": "recall", "prompt": "Say 1:00 in French.", "answer": "Il est une heure."},
        ],
    },
    11: {
        "title": "Dire ce qu’on aime",
        "objective": "Exprimez vos goûts avec aimer au présent et distinguez j’aime, nous aimons, ils aiment et la négation.",
        "foundationTie": "Reuses familiar books, music and classmates while expanding present-tense verb forms from Core 1–6.",
        "focus": "Aimer + noun or infinitive; French subject agreement and ne…pas",
        "grammar": {"explanation": "French aimer uses the person who likes as its subject: j’aime, tu aimes, il/elle aime, nous aimons, vous aimez, ils/elles aiment. Unlike Spanish gustar, the number of liked things does not control the verb. Use aimer + definite article for a general interest (j’aime la musique) and aimer + infinitive for an activity (nous aimons étudier). Negation surrounds the conjugated verb: Luis n’aime pas le café.", "model": {"one": "J’aime la musique.", "many": "Ana aime les livres.", "we": "Nous aimons étudier ensemble.", "negative": "Luis n’aime pas le café."}, "caution": "J’aime les livres remains j’aime even though livres is plural. Avoid copying Spanish me gusta / me gustan agreement into French."},
        "scene": "Des amis comparent leurs livres et leur musique préférée après les cours.",
        "readingTitle": "Ce que nous aimons",
        "reading": ["J’aime la musique.", "Ana aime les livres.", "Nous aimons étudier ensemble.", "Luis n’aime pas le café.", "Tu aimes ces chansons ?", "Oui, j’aime écouter de la musique à la maison."],
        "speaking": "Talk with a classmate about books, music and coffee. Ask whether they like these songs, state what you like, mention Ana and Luis, and say what you like doing together. Change roles and use at least one negative sentence. Keep the subject agreement with the person who likes.",
        "frWords": ["me / moi-même", "te / toi-même", "le", "la / l’", "à / dans / sur", "les", "livres", "non / ne…pas", "J’aime la musique.", "Ana aime les livres.", "Nous aimons étudier ensemble.", "Luis n’aime pas le café.", "Tu aimes ces chansons ?", "Oui, j’aime écouter de la musique à la maison."],
        "wordMeta": {0: {"note": "Me is an object/reflexive pronoun; a French 'I like' sentence begins j’aime, not me aime."}, 1: {"note": "Te is an object/reflexive pronoun; 'you like' is tu aimes."}, 4: {"note": "Choose a preposition by location and meaning; these are not interchangeable translations."}, 7: {"note": "Non answers no; ne…pas negates a verb and contracts to n’ before a vowel."}},
        "checks": [
            {"type": "recall", "prompt": "Complete: Nous ___ étudier ensemble.", "answer": "aimons"},
            {"type": "write", "prompt": "Write in French: Luis does not like coffee.", "answer": "Luis n’aime pas le café."},
            {"type": "listening", "audioText": "Ana aime les livres.", "locale": "fr-FR", "voiceStatus": "script-only; no recorded audio", "prompt": "Listen: what does Ana like?", "answer": "Books."},
            {"type": "comprehension", "prompt": "In Ce que nous aimons, what do the friends like doing together?", "answer": "Studying together."},
            {"type": "recall", "prompt": "Complete: J’___ les livres.", "answer": "aime"},
        ],
    },
    12: {
        "title": "Vouloir et les projets du samedi",
        "objective": "Dites ce que vous voulez faire avec vouloir au présent, suivi d’un infinitif, et comparez je veux, nous voulons et ils veulent.",
        "foundationTie": "Builds on Core 7 plans with aller and Core 11 infinitive activities; keeps familiar family and study contexts.",
        "focus": "Vouloir present tense + infinitive; polite choice with je voudrais",
        "grammar": {"explanation": "French vouloir is irregular: je veux, tu veux, il/elle veut, nous voulons, vous voulez, ils/elles veulent. Place an infinitive after it to express an intended action: Je veux visiter ma famille. Nous voulons manger ensemble. French does not follow the Spanish e-to-ie stem-change rule; learn the French forms as a separate pattern. Je voudrais is a softer, more polite request, but this lesson practices the present tense.", "model": {"I": "Je veux visiter ma famille.", "Ana": "Ana veut se reposer à la maison.", "we": "Nous voulons manger ensemble.", "they": "Mes amis veulent aller au parc."}, "caution": "The subject controls the verb: nous voulons, not nous veulent. Before an action use vouloir + infinitive without de."},
        "scene": "Le vendredi soir, des amis décident comment passer leur samedi.",
        "readingTitle": "Des projets pour samedi",
        "reading": ["Je veux rendre visite à ma famille.", "Ana veut se reposer à la maison.", "Nous voulons manger ensemble.", "Luis veut acheter un livre.", "Mes amis veulent aller au parc.", "Tu veux étudier avant de sortir ?"],
        "speaking": "Plan Saturday with a friend. Say you want to visit family, report Ana’s and Luis’s plans, propose eating together, and ask if the friend wants to study before going out. Repeat the agreed plan. Use veux, veut, voulons and veulent with infinitives.",
        "frWords": ["livre", "un", "à / dans / sur", "amis", "mon / ma", "de", "un livre", "maison", "Je veux rendre visite à ma famille.", "Ana veut se reposer à la maison.", "Nous voulons manger ensemble.", "Luis veut acheter un livre.", "Mes amis veulent aller au parc.", "Tu veux étudier avant de sortir ?"],
        "wordMeta": {2: {"note": "The English source gloss is broad; choose à, dans or sur by context."}, 4: {"note": "Mon/ma agrees with the possessed noun, with mon also before some feminine vowel-initial nouns."}, 5: {"note": "De can mean of/from, but vouloir + infinitive does not take de."}},
        "checks": [
            {"type": "recall", "prompt": "Complete: Nous ___ manger ensemble.", "answer": "voulons"},
            {"type": "write", "prompt": "Write in French: Ana wants to rest at home.", "answer": "Ana veut se reposer à la maison."},
            {"type": "listening", "audioText": "Mes amis veulent aller au parc.", "locale": "fr-FR", "voiceStatus": "script-only; no recorded audio", "prompt": "Listen: where do the friends want to go?", "answer": "To the park."},
            {"type": "comprehension", "prompt": "In Des projets pour samedi, what does Luis want to buy?", "answer": "A book."},
            {"type": "recall", "prompt": "Complete: Mes amis ___ aller au parc.", "answer": "veulent"},
        ],
    },
}

draft = {
    "target": "French", "native": "English", "moduleId": "french-basics", "stage": "core",
    "reviewed": False, "state": "authored-draft",
    "source": {"path": "content/french-basics/source-english-core-10-12.json", "sourceSha256": hashlib.sha256(source_path.read_bytes()).hexdigest(), "sourcePaths": [CORE, PRACTICE], "sourceFileSha256": source["sourceSha256"], "use": "Exact English objectives, word meanings, reading meanings and progression; French grammar and examples authored separately"},
    "draftModel": "Codex authored; independent Fable/Opus and human review pending",
    "sourceNotes": ["French clock time, aimer and vouloir require different grammar from the Spanish source.", "Broad source glosses have contextual notes; exact English meanings are retained for traceability."],
    "lessons": [],
}
for english in source["lessons"]:
    n = english["n"]
    author = authored[n]
    assert len(author["frWords"]) == len(english["words"]) == 14
    assert len(author["reading"]) == len(english["reading"]["native"]) == 6
    words = [{"order": i + 1, "fr": fr, "en": original["en"], "kind": original["kind"], **author["wordMeta"].get(i, {})} for i, (fr, original) in enumerate(zip(author["frWords"], english["words"]))]
    dialogue = [f"{fr}|{en}" for fr, en in zip(author["reading"], english["reading"]["native"])]
    draft["lessons"].append({"n": n, "title": author["title"], "sourceTitleEnglish": english["title"], "sourceObjectiveEnglish": english["objective"], "objective": author["objective"], "foundationTie": author["foundationTie"], "focus": author["focus"], "grammar": author["grammar"], "scene": author["scene"], "dialogue": dialogue, "speaking": author["speaking"], "words": words, "reading": {"title": author["readingTitle"], "sourceTitleEnglish": english["reading"]["title"], "target": author["reading"], "native": english["reading"]["native"]}, "checks": author["checks"], "locale": "fr-FR"})
(OUT / "core-10-12-draft.json").write_text(json.dumps(draft, ensure_ascii=False, indent=2) + "\n")
print(f"Wrote {source_path.relative_to(ROOT)} and content/french-basics/core-10-12-draft.json")
